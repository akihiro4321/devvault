import { env } from './config/env.js';
import { chunkFromFetchedBundle } from './ingestion/chunker.js';
import { Embedder } from './ingestion/embedder.js';
import { fetchMRBundles } from './ingestion/fetcher.js';
import { GitLabClient } from './ingestion/gitlab-client.js';
import { LanceIndexer } from './ingestion/indexer.js';
import { SearchEngine } from './retrieval/search.js';
import type { SearchRequest } from './types/search.js';
import { generateAnswer } from './generation/answer-generator.js';

export interface IngestOptions {
  projectId: number;
  since?: string;
}

export async function ingest(options: IngestOptions): Promise<number> {
  if (!env.GITLAB_TOKEN) throw new Error('GITLAB_TOKEN is required for ingest');

  const client = new GitLabClient({
    baseUrl: env.GITLAB_URL,
    token: env.GITLAB_TOKEN,
  });

  const bundles = await fetchMRBundles(client, {
    projectId: options.projectId,
    since: options.since,
  });

  const chunks = bundles.flatMap((bundle) => chunkFromFetchedBundle(bundle));
  const embedder = new Embedder();
  // chunk.text はプレフィックスなしの検索用本文。embedding時のみ embedder 内で "passage: " を付与する。
  const vectors = await embedder.embedBatch(chunks.map((c) => c.text), false);

  chunks.forEach((chunk, idx) => {
    chunk.vector = vectors[idx];
  });

  const indexer = new LanceIndexer();
  await indexer.createTable();
  await indexer.upsert(chunks);
  return chunks.length;
}

export async function search(request: SearchRequest): Promise<Awaited<ReturnType<SearchEngine['hybridSearch']>>>{
  const engine = new SearchEngine();
  return engine.hybridSearch(request);
}

export async function ask(question: string): Promise<string> {
  const chunks = await search({ query: question, topK: 20, rerankTopN: 5 });
  return generateAnswer(chunks, question);
}
