import { randomUUID } from 'node:crypto';
import { CHUNK_MAX_TOKENS, E5_PASSAGE_PREFIX, E5_QUERY_PREFIX } from '../config/constants.js';
import type { DocumentChunk } from '../types/chunk.js';
import type {
  ChangeRequest,
  ChangeRequestDiff,
  ChangeRequestDiscussion,
  ChangeRequestNote,
} from '../types/review.js';

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
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(text.length, start + maxTokens);

    while (end < text.length && approxTokenLength(text.slice(start, end)) < maxTokens) {
      const next = Math.min(text.length, end + 64);
      if (next === end) break;
      end = next;
    }

    while (end > start + 1 && approxTokenLength(text.slice(start, end)) > maxTokens) {
      end -= 1;
    }

    chunks.push(text.slice(start, end).trim());
    if (end <= start) break;
    start = end;
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

function baseChunk(changeRequest: ChangeRequest, overrides: Partial<DocumentChunk>): Omit<DocumentChunk, 'id'> {
  return {
    text: '',
    source_type: 'change_request_description',
    source_system: changeRequest.source_system,
    project_id: changeRequest.project_id,
    project_key: `${changeRequest.source_system}-${changeRequest.project_id}`,
    change_request_number: changeRequest.iid,
    source_id: `${changeRequest.source_system}-change-request-${changeRequest.project_id}-${changeRequest.iid}`,
    author: changeRequest.author.username,
    labels: changeRequest.labels.join(','),
    target_branch: changeRequest.target_branch,
    created_at: changeRequest.created_at,
    updated_at: changeRequest.updated_at ?? changeRequest.created_at,
    web_url: changeRequest.web_url,
    parent_title: changeRequest.title,
    chunk_index: 0,
    total_chunks: 1,
    ...overrides,
  };
}

export function chunkChangeRequestDescription(changeRequest: ChangeRequest): DocumentChunk[] {
  const rawSections = splitMarkdownSemantically(changeRequest.description || '');
  const sections = rawSections.flatMap((s) => splitByLength(s));

  return sections.map((section, idx) => ({
    id: randomUUID(),
    ...baseChunk(changeRequest, {
      source_type: 'change_request_description',
      source_id: `change-request-description-${changeRequest.project_id}-${changeRequest.iid}-${idx}`,
      text: `[${changeRequest.title}] ${section}`,
      chunk_index: idx,
      total_chunks: sections.length,
    }),
  }));
}

export function chunkChangeRequestComment(
  note: ChangeRequestNote,
  changeRequest: ChangeRequest,
  thread: ChangeRequestNote[],
): DocumentChunk[] {
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
    ...baseChunk(changeRequest, {
      source_type: 'change_request_comment',
      source_id: `change-request-comment-${note.id}-${bodyIdx}`,
      author: note.author.username,
      created_at: note.created_at,
      text: `[${changeRequest.title}] レビューコメント: ${body}`,
      discussion_context: context,
      chunk_index: bodyIdx,
      total_chunks: bodyChunks.length,
    }),
  }));
}

export function chunkDiffNote(note: ChangeRequestNote, changeRequest: ChangeRequest): DocumentChunk[] {
  if (note.system) return [];
  if (!note.body.trim() || isEmojiOnly(note.body)) return [];

  const filePath = note.position?.new_path ?? note.position?.old_path;
  const line = note.position?.new_line ?? note.position?.old_line;
  const prefix = filePath ? `[${filePath}${line ? `:${line}` : ''}]` : '[unknown]';

  const bodies = splitByLength(note.body);
  return bodies.map((body, idx) => ({
    id: randomUUID(),
    ...baseChunk(changeRequest, {
      source_type: 'change_request_diff_note',
      source_id: `change-request-diff-note-${note.id}-${idx}`,
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

export function chunkDiff(diff: ChangeRequestDiff, changeRequest: ChangeRequest): DocumentChunk[] {
  const lineCount = diff.diff.split('\n').length;
  const effectiveText = lineCount > 1000 ? summarizeLargeDiff(diff.diff) : diff.diff;
  const pieces = splitDiffByHunk(effectiveText);
  const filePath = diff.new_path || diff.old_path;

  return pieces.map((piece, idx) => ({
    id: randomUUID(),
    ...baseChunk(changeRequest, {
      source_type: 'change_request_diff',
      source_id: `change-request-diff-${changeRequest.project_id}-${changeRequest.iid}-${filePath}-${idx}`,
      file_path: filePath,
      text: `[${filePath}] コード変更: ${piece}`,
      chunk_index: idx,
      total_chunks: pieces.length,
    }),
  }));
}

export function chunkFromChangeRequestBundle(input: {
  changeRequest: ChangeRequest;
  discussions: ChangeRequestDiscussion[];
  diffs: ChangeRequestDiff[];
}): DocumentChunk[] {
  const out: DocumentChunk[] = [];

  out.push(...chunkChangeRequestDescription(input.changeRequest));

  for (const discussion of input.discussions) {
    for (const note of discussion.notes) {
      if ((note.type ?? '').toLowerCase().includes('diff') || note.position) {
        out.push(...chunkDiffNote(note, input.changeRequest));
      } else {
        out.push(...chunkChangeRequestComment(note, input.changeRequest, discussion.notes));
      }
    }
  }

  for (const diff of input.diffs) {
    out.push(...chunkDiff(diff, input.changeRequest));
  }

  return out;
}
