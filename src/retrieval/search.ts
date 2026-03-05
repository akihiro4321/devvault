import { DEFAULT_BM25_WEIGHT, DEFAULT_RERANK_TOP_N, DEFAULT_TOP_K, DEFAULT_VECTOR_WEIGHT } from '../config/constants.js';
import { Embedder } from '../ingestion/embedder.js';
import { LanceIndexer } from '../ingestion/indexer.js';
import type { DocumentChunk } from '../types/chunk.js';
import type { RankedChunk, SearchRequest } from '../types/search.js';
import { applyFilters } from './filter-builder.js';
import { rerankWithRRF } from './reranker.js';

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function tokenize(text: string): string[] {
  const base = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .filter(Boolean);
  const out = [...base];
  for (const token of base) {
    if (token.length < 2) continue;
    if (!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(token)) continue;
    for (let i = 0; i < token.length - 1; i += 1) {
      out.push(token.slice(i, i + 2));
    }
  }
  return out;
}

interface BM25Stats {
  df: Map<string, number>;
  avgDocLen: number;
  docCount: number;
}

function computeBM25Stats(tokenizedDocs: string[][]): BM25Stats {
  const df = new Map<string, number>();
  let totalLen = 0;
  for (const tokens of tokenizedDocs) {
    totalLen += tokens.length;
    const unique = new Set(tokens);
    for (const term of unique) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  return {
    df,
    avgDocLen: tokenizedDocs.length > 0 ? totalLen / tokenizedDocs.length : 0,
    docCount: tokenizedDocs.length,
  };
}

function scoreBM25(queryTokens: string[], docTokens: string[], stats: BM25Stats): number {
  if (queryTokens.length === 0 || docTokens.length === 0 || stats.docCount === 0) return 0;
  const tf = new Map<string, number>();
  for (const token of docTokens) tf.set(token, (tf.get(token) ?? 0) + 1);

  const k1 = 1.2;
  const b = 0.75;
  const docLen = docTokens.length;
  const avgDocLen = stats.avgDocLen || 1;
  let score = 0;

  for (const term of new Set(queryTokens)) {
    const freq = tf.get(term) ?? 0;
    if (freq === 0) continue;
    const n = stats.df.get(term) ?? 0;
    const idf = Math.log(1 + (stats.docCount - n + 0.5) / (n + 0.5));
    const denom = freq + k1 * (1 - b + b * (docLen / avgDocLen));
    score += idf * ((freq * (k1 + 1)) / denom);
  }

  return score;
}

export interface SearchEngineDeps {
  embedder?: Embedder;
  indexer?: LanceIndexer;
}

export class SearchEngine {
  private readonly embedder: Embedder;
  private readonly indexer: LanceIndexer;

  constructor(deps?: SearchEngineDeps) {
    this.embedder = deps?.embedder ?? new Embedder();
    this.indexer = deps?.indexer ?? new LanceIndexer();
  }

  async hybridSearch(request: SearchRequest): Promise<RankedChunk[]> {
    const topK = request.topK ?? DEFAULT_TOP_K;
    const rerankTopN = request.rerankTopN ?? DEFAULT_RERANK_TOP_N;
    const vectorWeight = request.vectorWeight ?? DEFAULT_VECTOR_WEIGHT;
    const bm25Weight = request.bm25Weight ?? DEFAULT_BM25_WEIGHT;

    const all = applyFilters(await this.indexer.readAll(), request.filters);
    const qv = await this.embedder.embed(request.query, true);
    const queryTokens = tokenize(request.query);
    const tokenized = new Map<string, string[]>();
    for (const chunk of all) tokenized.set(chunk.id, tokenize(chunk.text));
    const bm25Stats = computeBM25Stats(Array.from(tokenized.values()));

    const vectorRanked = [...all]
      .map((chunk) => ({ chunk, score: cosineSimilarity(qv, chunk.vector ?? []) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((item, idx) => ({ ...item, vectorRank: idx + 1 }));

    const bm25Ranked = [...all]
      .map((chunk) => ({
        chunk,
        score: scoreBM25(queryTokens, tokenized.get(chunk.id) ?? [], bm25Stats),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((item, idx) => ({ ...item, bm25Rank: idx + 1 }));

    const merged = new Map<string, RankedChunk>();

    for (const item of vectorRanked) {
      merged.set(item.chunk.id, {
        chunk: item.chunk,
        vectorRank: item.vectorRank,
        score: 0,
      });
    }

    for (const item of bm25Ranked) {
      const prev = merged.get(item.chunk.id);
      merged.set(item.chunk.id, {
        chunk: item.chunk,
        vectorRank: prev?.vectorRank,
        bm25Rank: item.bm25Rank,
        score: 0,
      });
    }

    return rerankWithRRF(Array.from(merged.values()), {
      vectorWeight,
      bm25Weight,
    }).slice(0, rerankTopN);
  }
}
