import type { RankedChunk } from '../types/search.js';

export function buildPrompt(chunks: RankedChunk[], question: string): string {
  const lines = chunks.map((item, idx) => {
    const c = item.chunk;
    return [
      `[chunk ${idx + 1}]`,
      `source_type=${c.source_type}`,
      `MR=!${c.source_iid}`,
      `author=@${c.author}`,
      `created_at=${c.created_at}`,
      `url=${c.web_url}`,
      `text=${c.text}`,
    ].join(' ');
  });

  return [
    'あなたは開発チームのナレッジベースアシスタントです。',
    '検索結果のみに基づいて回答し、必ず出典MR/コメントを明記してください。',
    '',
    '## 検索結果',
    ...lines,
    '',
    '## 質問',
    question,
  ].join('\n');
}
