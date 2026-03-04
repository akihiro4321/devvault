import { EMBEDDING_DIMENSION } from '../config/constants.js';
import { env } from '../config/env.js';
import { addE5Prefix } from './chunker.js';

function hashToVector(text: string, dim = EMBEDDING_DIMENSION): number[] {
  const vector = new Array<number>(dim).fill(0);
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    vector[i % dim] += (code % 31) / 31;
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

export class Embedder {
  private extractor: unknown | null = null;
  private readonly mockMode: boolean;

  constructor() {
    // envは起動時に確定されるため、テストではprocess.envを優先して判定する
    this.mockMode = process.env.EMBEDDING_MOCK === 'true' || env.EMBEDDING_MOCK;
  }

  private async ensureExtractor(): Promise<unknown> {
    if (this.extractor) return this.extractor;
    const t = await import('@huggingface/transformers');
    this.extractor = await t.pipeline('feature-extraction', env.EMBEDDING_MODEL);
    return this.extractor;
  }

  async embed(text: string, isQuery = false): Promise<number[]> {
    const input = addE5Prefix(text, isQuery);

    if (this.mockMode) return hashToVector(input);

    try {
      const extractor = (await this.ensureExtractor()) as (
        input: string,
        options: Record<string, unknown>,
      ) => Promise<{ data: Float32Array | number[] }>;
      const output = await extractor(input, {
        pooling: 'mean',
        normalize: true,
      });
      const arr = Array.from(output.data);
      return arr.slice(0, EMBEDDING_DIMENSION);
    } catch {
      return hashToVector(input);
    }
  }

  async embedBatch(texts: string[], isQuery = false): Promise<number[][]> {
    const result: number[][] = [];
    for (let i = 0; i < texts.length; i += 16) {
      const batch = texts.slice(i, i + 16);
      const vectors = await Promise.all(batch.map((text) => this.embed(text, isQuery)));
      result.push(...vectors);
    }
    return result;
  }
}
