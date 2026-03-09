import type { RankedChunk } from '../types/search.js';

function sourceLabel(sourceSystem: string): string {
  return sourceSystem === 'github' ? 'PR' : 'MR';
}

export function buildPrompt(chunks: RankedChunk[], question: string): string {
  const lines = chunks.map((item, idx) => {
    const c = item.chunk;
    return [
      `[chunk ${idx + 1}]`,
      `source_type=${c.source_type}`,
      `${sourceLabel(c.source_system)}=!${c.change_request_number}`,
      `author=@${c.author}`,
      `created_at=${c.created_at}`,
      `url=${c.web_url}`,
      `text=${c.text}`,
    ].join(' ');
  });

  return [
    'あなたは開発チームのナレッジベースアシスタントです。',
    '検索結果のみに基づいて回答し、必ず出典MR/PR/コメントを明記してください。',
    '',
    '## 検索結果',
    ...lines,
    '',
    '## 質問',
    question,
  ].join('\n');
}
