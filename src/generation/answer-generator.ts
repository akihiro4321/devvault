import { env } from '../config/env.js';
import type { RankedChunk } from '../types/search.js';
import { buildPrompt } from './prompt-builder.js';

function fallbackAnswer(chunks: RankedChunk[], question: string): string {
  if (chunks.length === 0) {
    return `質問: ${question}\n\n該当する過去事例は見つかりませんでした。`;
  }

  const citations = chunks
    .map((c) => `- MR !${c.chunk.source_iid} @${c.chunk.author} ${c.chunk.web_url}`)
    .join('\n');

  return [
    `質問: ${question}`,
    '',
    '検索結果に基づく要約:',
    ...chunks.map((c, i) => `${i + 1}. ${c.chunk.text.slice(0, 120)}...`),
    '',
    '出典:',
    citations,
  ].join('\n');
}

export async function generateAnswer(chunks: RankedChunk[], question: string): Promise<string> {
  const prompt = buildPrompt(chunks, question);

  if (!env.LLM_API_KEY) return fallbackAnswer(chunks, question);

  try {
    const ai = await import('ai');

    // 実行環境のSDK差分を吸収するためanyで扱う
    const stream = await (ai as any).streamText({
      model: env.LLM_MODEL,
      prompt,
      apiKey: env.LLM_API_KEY,
      provider: env.LLM_PROVIDER,
    });

    if (typeof stream?.text === 'string') return stream.text;
    if (typeof stream?.toString === 'function') return stream.toString();
    return fallbackAnswer(chunks, question);
  } catch {
    return fallbackAnswer(chunks, question);
  }
}
