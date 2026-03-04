import { describe, expect, it } from 'vitest';
import { buildWhereClause } from '../src/retrieval/filter-builder.js';

describe('filter-builder', () => {
  it('builds where clause', () => {
    const sql = buildWhereClause({
      sourceTypes: ['mr_comment', 'mr_diff_note'],
      createdAfter: '2024-06-01',
      author: 'tanaka',
      filePathLike: 'Controller',
    });
    expect(sql).toContain("source_type IN ('mr_comment', 'mr_diff_note')");
    expect(sql).toContain("created_at > '2024-06-01'");
    expect(sql).toContain("author = 'tanaka'");
    expect(sql).toContain("file_path LIKE '%Controller%'");
  });
});
