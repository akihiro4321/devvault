import { describe, expect, it } from 'vitest';
import { addE5Prefix, chunkDiff, chunkDiffNote, chunkMRComment, chunkMRDescription } from '../src/ingestion/chunker.js';
import type { MergeRequest, MRDiff, Note } from '../src/types/gitlab.js';

const baseMR: MergeRequest = {
  id: 1,
  iid: 42,
  project_id: 123,
  title: 'ログイン500エラー修正',
  description: '# 背景\nログイン時に500\n\n# 対応\nDB接続再試行',
  state: 'merged',
  source_branch: 'fix/login-500',
  target_branch: 'main',
  author: { id: 1, username: 'tanaka' },
  labels: ['bug'],
  created_at: '2024-12-01T10:00:00Z',
  merged_at: '2024-12-02T10:00:00Z',
  web_url: 'https://gitlab.example.com/group/proj/-/merge_requests/42',
};

describe('chunker', () => {
  it('adds E5 prefix', () => {
    expect(addE5Prefix('abc', true).startsWith('query: ')).toBe(true);
    expect(addE5Prefix('abc', false).startsWith('passage: ')).toBe(true);
  });

  it('chunks MR description by headings', () => {
    const chunks = chunkMRDescription(baseMR);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].source_type).toBe('mr_description');
  });

  it('chunks comment with context', () => {
    const thread: Note[] = [
      { id: 1, body: '最初のコメント', author: { id: 1, username: 'a' }, system: false, created_at: '2024-12-01T10:00:00Z' },
      { id: 2, body: '本体コメント', author: { id: 2, username: 'b' }, system: false, created_at: '2024-12-01T10:01:00Z' },
      { id: 3, body: '返信', author: { id: 3, username: 'c' }, system: false, created_at: '2024-12-01T10:02:00Z' },
    ];
    const chunks = chunkMRComment(thread[1], baseMR, thread);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].discussion_context).toContain('a: 最初のコメント');
  });

  it('excludes system notes', () => {
    const note: Note = {
      id: 10,
      body: 'assigned to',
      author: { id: 1, username: 'sys' },
      system: true,
      created_at: '2024-12-01T10:00:00Z',
    };
    expect(chunkMRComment(note, baseMR, [note])).toHaveLength(0);
  });

  it('chunks diff note with file path', () => {
    const note: Note = {
      id: 11,
      body: 'nullチェックが必要',
      author: { id: 1, username: 'reviewer' },
      system: false,
      created_at: '2024-12-01T10:00:00Z',
      position: { new_path: 'src/login.ts', new_line: 12 },
      type: 'DiffNote',
    };
    const chunks = chunkDiffNote(note, baseMR);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].file_path).toBe('src/login.ts');
  });

  it('summarizes very large diff', () => {
    const huge = Array.from({ length: 1100 }, (_, i) => `+line ${i}`).join('\n');
    const diff: MRDiff = {
      old_path: 'a.ts',
      new_path: 'a.ts',
      diff: huge,
      new_file: false,
      deleted_file: false,
    };
    const chunks = chunkDiff(diff, baseMR);
    expect(chunks[0].text).toContain('Large diff summary');
  });
});
