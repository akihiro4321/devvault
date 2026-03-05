import { randomUUID } from 'node:crypto';
import { CHUNK_MAX_TOKENS, E5_PASSAGE_PREFIX, E5_QUERY_PREFIX } from '../config/constants.js';
import type { DocumentChunk } from '../types/chunk.js';
import type { Discussion, MRDiff, MergeRequest, Note } from '../types/gitlab.js';

export function addE5Prefix(text: string, isQuery: boolean): string {
  return `${isQuery ? E5_QUERY_PREFIX : E5_PASSAGE_PREFIX}${text}`;
}

function approxTokenLength(text: string): number {
  let cjk = 0;
  let ascii = 0;
  for (const ch of text) {
    if (ch.charCodeAt(0) > 0x2e7f) cjk += 1;
    else ascii += 1;
  }
  return cjk + Math.ceil(ascii / 4);
}

function splitByLength(text: string, maxTokens = CHUNK_MAX_TOKENS): string[] {
  if (approxTokenLength(text) <= maxTokens) return [text.trim()];
  const maxChars = maxTokens;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push(text.slice(i, i + maxChars).trim());
  }
  return chunks.filter(Boolean);
}

function splitMarkdownSemantically(text: string): string[] {
  const headingSplit = text
    .split(/\n(?=#{1,6}\s)/g)
    .map((part) => part.trim())
    .filter(Boolean);
  if (headingSplit.length > 1) return headingSplit;
  return text
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isEmojiOnly(text: string): boolean {
  const stripped = text.replace(/[\s\p{P}\p{S}]/gu, '');
  return stripped.length === 0;
}

function summarizeLargeDiff(diff: string): string {
  const lines = diff.split('\n');
  const added = lines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
  const removed = lines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length;
  return `Large diff summary: ${lines.length} lines, +${added} / -${removed}`;
}

function baseChunk(mr: MergeRequest, overrides: Partial<DocumentChunk>): Omit<DocumentChunk, 'id'> {
  return {
    text: '',
    source_type: 'mr_description',
    source_system: 'gitlab',
    project_id: mr.project_id,
    project_key: `gitlab-${mr.project_id}`,
    source_iid: mr.iid,
    source_id: `mr-${mr.project_id}-${mr.iid}`,
    author: mr.author.username,
    labels: mr.labels.join(','),
    target_branch: mr.target_branch,
    created_at: mr.created_at,
    web_url: mr.web_url,
    parent_title: mr.title,
    chunk_index: 0,
    total_chunks: 1,
    ...overrides,
  };
}

export function chunkMRDescription(mr: MergeRequest): DocumentChunk[] {
  const rawSections = splitMarkdownSemantically(mr.description || '');
  const sections = rawSections.flatMap((s) => splitByLength(s));

  return sections.map((section, idx) => ({
    id: randomUUID(),
    ...baseChunk(mr, {
      source_type: 'mr_description',
      source_id: `mr-description-${mr.project_id}-${mr.iid}-${idx}`,
      text: `[${mr.title}] ${section}`,
      chunk_index: idx,
      total_chunks: sections.length,
    }),
  }));
}

export function chunkMRComment(note: Note, mr: MergeRequest, thread: Note[]): DocumentChunk[] {
  if (note.system) return [];
  if (!note.body.trim() || isEmojiOnly(note.body)) return [];

  const idx = thread.findIndex((n) => n.id === note.id);
  const context = thread
    .slice(Math.max(0, idx - 1), Math.min(thread.length, idx + 2))
    .map((n) => `${n.author.username}: ${n.body}`)
    .join('\n');

  const bodyChunks = splitByLength(note.body);
  return bodyChunks.map((body, bodyIdx) => ({
    id: randomUUID(),
    ...baseChunk(mr, {
      source_type: 'mr_comment',
      source_id: `mr-comment-${note.id}-${bodyIdx}`,
      author: note.author.username,
      created_at: note.created_at,
      text: `[${mr.title}] レビューコメント: ${body}`,
      discussion_context: context,
      chunk_index: bodyIdx,
      total_chunks: bodyChunks.length,
    }),
  }));
}

export function chunkDiffNote(note: Note, mr: MergeRequest): DocumentChunk[] {
  if (note.system) return [];
  if (!note.body.trim() || isEmojiOnly(note.body)) return [];

  const filePath = note.position?.new_path ?? note.position?.old_path;
  const line = note.position?.new_line ?? note.position?.old_line;
  const prefix = filePath ? `[${filePath}${line ? `:${line}` : ''}]` : '[unknown]';

  const bodies = splitByLength(note.body);
  return bodies.map((body, idx) => ({
    id: randomUUID(),
    ...baseChunk(mr, {
      source_type: 'mr_diff_note',
      source_id: `mr-diff-note-${note.id}-${idx}`,
      author: note.author.username,
      created_at: note.created_at,
      file_path: filePath,
      text: `${prefix} レビュー指摘: ${body}`,
      chunk_index: idx,
      total_chunks: bodies.length,
    }),
  }));
}

function splitDiffByHunk(diffText: string): string[] {
  const hunks = diffText.split(/\n(?=@@)/g).map((h) => h.trim()).filter(Boolean);
  if (hunks.length <= 1) return splitByLength(diffText);
  return hunks.flatMap((h) => splitByLength(h));
}

export function chunkDiff(diff: MRDiff, mr: MergeRequest): DocumentChunk[] {
  const lineCount = diff.diff.split('\n').length;
  const effectiveText = lineCount > 1000 ? summarizeLargeDiff(diff.diff) : diff.diff;
  const pieces = splitDiffByHunk(effectiveText);
  const filePath = diff.new_path || diff.old_path;

  return pieces.map((piece, idx) => ({
    id: randomUUID(),
    ...baseChunk(mr, {
      source_type: 'mr_diff',
      source_id: `mr-diff-${mr.project_id}-${mr.iid}-${filePath}-${idx}`,
      file_path: filePath,
      text: `[${filePath}] コード変更: ${piece}`,
      chunk_index: idx,
      total_chunks: pieces.length,
    }),
  }));
}

export function chunkFromFetchedBundle(input: {
  mr: MergeRequest;
  discussions: Discussion[];
  diffs: MRDiff[];
}): DocumentChunk[] {
  const out: DocumentChunk[] = [];

  out.push(...chunkMRDescription(input.mr));

  for (const discussion of input.discussions) {
    for (const note of discussion.notes) {
      if ((note.type ?? '').toLowerCase().includes('diff') || note.position) {
        out.push(...chunkDiffNote(note, input.mr));
      } else {
        out.push(...chunkMRComment(note, input.mr, discussion.notes));
      }
    }
  }

  for (const diff of input.diffs) {
    out.push(...chunkDiff(diff, input.mr));
  }

  return out;
}
