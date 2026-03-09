import { describe, expect, it } from 'vitest';
import { SearchEngine } from '../src/retrieval/search.js';
import type { DocumentChunk } from '../src/types/chunk.js';

const baseChunk = (id: string, text: string): DocumentChunk => ({
  id,
  text,
  source_type: 'change_request_comment',
  source_system: 'gitlab',
  project_id: 1,
  project_key: 'gitlab-1',
  change_request_number: 1,
  source_id: id,
  author: 'tanaka',
  labels: 'bug',
  target_branch: 'main',
  created_at: '2024-12-01T00:00:00Z',
  web_url: 'https://example.com/mr/1',
  parent_title: 'title',
  chunk_index: 0,
  total_chunks: 1,
  vector: new Array(384).fill(0),
});

describe('search', () => {
  it('ranks Japanese keyword match higher with BM25', async () => {
    const docs: DocumentChunk[] = [
      baseChunk('a', 'ログイン画面で500エラーが発生。DB接続タイムアウトを修正'),
      baseChunk('b', 'フロントの色調整と余白修正'),
    ];

    const embedder = { embed: async () => new Array(384).fill(0) };
    const indexer = { readAll: async () => docs };
    const engine = new SearchEngine({ embedder: embedder as any, indexer: indexer as any });

    const results = await engine.hybridSearch({
      query: 'ログイン 500 エラー',
      topK: 10,
      rerankTopN: 2,
      vectorWeight: 0,
      bm25Weight: 1,
    });

    expect(results[0].chunk.id).toBe('a');
  });
});
