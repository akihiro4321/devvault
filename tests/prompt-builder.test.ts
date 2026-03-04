import { describe, expect, it } from 'vitest';
import { buildPrompt } from '../src/generation/prompt-builder.js';

describe('prompt-builder', () => {
  it('renders search chunks and question', () => {
    const prompt = buildPrompt(
      [
        {
          chunk: {
            id: '1',
            text: 'passage: text',
            source_type: 'mr_comment',
            source_system: 'gitlab',
            project_id: 1,
            project_key: 'gitlab-1',
            source_iid: 342,
            source_id: 's1',
            author: 'tanaka',
            labels: 'bug',
            target_branch: 'main',
            created_at: '2024-12-01T00:00:00Z',
            web_url: 'https://example/mr/342',
            parent_title: 'タイトル',
            chunk_index: 0,
            total_chunks: 1,
          },
          score: 0.1,
        },
      ],
      'ログインの500エラーは？',
    );

    expect(prompt).toContain('MR=!342');
    expect(prompt).toContain('## 質問');
  });
});
