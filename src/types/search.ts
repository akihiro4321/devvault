import type { ProjectRef } from './review.js';
import type { DocumentChunk, SourceType } from './chunk.js';

export interface SearchFilters {
  sourceTypes?: SourceType[];
  createdAfter?: string;
  author?: string;
  filePathLike?: string;
  targetBranch?: string;
  projectId?: ProjectRef;
}

export interface SearchRequest {
  query: string;
  topK?: number;
  rerankTopN?: number;
  vectorWeight?: number;
  bm25Weight?: number;
  filters?: SearchFilters;
}

export interface RankedChunk {
  chunk: DocumentChunk;
  vectorRank?: number;
  bm25Rank?: number;
  score: number;
}
