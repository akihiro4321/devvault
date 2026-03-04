import type { DocumentChunk } from '../types/chunk.js';
import type { SearchFilters } from '../types/search.js';

export function buildWhereClause(filters?: SearchFilters): string {
  if (!filters) return '';
  const clauses: string[] = [];

  if (filters.sourceTypes?.length) {
    const values = filters.sourceTypes.map((t) => `'${t}'`).join(', ');
    clauses.push(`source_type IN (${values})`);
  }
  if (filters.createdAfter) clauses.push(`created_at > '${filters.createdAfter}'`);
  if (filters.author) clauses.push(`author = '${filters.author}'`);
  if (filters.filePathLike) clauses.push(`file_path LIKE '%${filters.filePathLike}%'`);
  if (filters.targetBranch) clauses.push(`target_branch = '${filters.targetBranch}'`);
  if (typeof filters.projectId === 'number') clauses.push(`project_id = ${filters.projectId}`);

  return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
}

export function applyFilters(chunks: DocumentChunk[], filters?: SearchFilters): DocumentChunk[] {
  if (!filters) return chunks;
  return chunks.filter((chunk) => {
    if (filters.sourceTypes?.length && !filters.sourceTypes.includes(chunk.source_type)) return false;
    if (filters.createdAfter && chunk.created_at <= filters.createdAfter) return false;
    if (filters.author && chunk.author !== filters.author) return false;
    if (filters.filePathLike && !(chunk.file_path ?? '').includes(filters.filePathLike)) return false;
    if (filters.targetBranch && chunk.target_branch !== filters.targetBranch) return false;
    if (typeof filters.projectId === 'number' && chunk.project_id !== filters.projectId) return false;
    return true;
  });
}
