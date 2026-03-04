import type { RankedChunk } from '../types/search.js';

export interface RRFOptions {
  k?: number;
  vectorWeight?: number;
  bm25Weight?: number;
}

export function reciprocalRank(rank: number, k = 60): number {
  return 1 / (k + rank);
}

export function rerankWithRRF(items: RankedChunk[], options?: RRFOptions): RankedChunk[] {
  const k = options?.k ?? 60;
  const vectorWeight = options?.vectorWeight ?? 0.7;
  const bm25Weight = options?.bm25Weight ?? 0.3;

  return items
    .map((item) => {
      const vectorScore = item.vectorRank ? reciprocalRank(item.vectorRank, k) * vectorWeight : 0;
      const bm25Score = item.bm25Rank ? reciprocalRank(item.bm25Rank, k) * bm25Weight : 0;
      return {
        ...item,
        score: vectorScore + bm25Score,
      };
    })
    .sort((a, b) => b.score - a.score);
}
