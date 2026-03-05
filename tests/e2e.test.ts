import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chunkFromFetchedBundle } from '../src/ingestion/chunker.js';
import { Embedder } from '../src/ingestion/embedder.js';
import { LanceIndexer } from '../src/ingestion/indexer.js';
import { SearchEngine } from '../src/retrieval/search.js';
import { generateAnswer } from '../src/generation/answer-generator.js';
import type { FetchedMRBundle } from '../src/ingestion/fetcher.js';

const dbPath = path.resolve('./data/lancedb');

describe('e2e: ingest -> search -> ask', () => {
  beforeEach(async () => {
    process.env.EMBEDDING_MOCK = 'true';
    await fs.rm(dbPath, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(dbPath, { recursive: true, force: true });
  });

  it('runs full flow with fixture-like data', async () => {
    const bundle: FetchedMRBundle = {
      mr: {
        id: 1,
        iid: 101,
        project_id: 123,
        title: 'ログイン500エラー対応',
        description: '接続プール枯渇時のリトライを追加',
        state: 'merged',
        source_branch: 'fix/login-500',
        target_branch: 'main',
        author: { id: 1, username: 'tanaka' },
        labels: ['bug', 'backend'],
        created_at: '2024-10-01T00:00:00Z',
        merged_at: '2024-10-01T01:00:00Z',
        web_url: 'https://gitlab.example.com/group/proj/-/merge_requests/101',
      },
      discussions: [
        {
          id: 'd1',
          notes: [
            {
              id: 1,
              body: '500エラーはDB接続タイムアウトが原因でした',
              author: { id: 2, username: 'suzuki' },
              system: false,
              created_at: '2024-10-01T00:10:00Z',
            },
          ],
        },
      ],
      diffs: [
        {
          old_path: 'src/login.ts',
          new_path: 'src/login.ts',
          diff: '@@ -1,2 +1,8 @@\n+retry(3)',
          new_file: false,
          deleted_file: false,
        },
      ],
    };

    const chunks = chunkFromFetchedBundle(bundle);
    const embedder = new Embedder();
    const vectors = await embedder.embedBatch(chunks.map((c) => c.text));
    chunks.forEach((chunk, idx) => {
      chunk.vector = vectors[idx];
    });

    const indexer = new LanceIndexer();
    await indexer.createTable();
    await indexer.upsert(chunks);

    const engine = new SearchEngine({ embedder, indexer });
    const results = await engine.hybridSearch({ query: 'ログイン 500 エラー', topK: 10, rerankTopN: 3 });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chunk.source_iid).toBe(101);

    const answer = await generateAnswer(results, 'ログイン画面で500エラーの過去対応は?');
    expect(answer).toContain('MR !101');
  });
});
