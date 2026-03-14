import { env } from '../config/env.js';
import type { RankedChunk } from '../types/search.js';
import { buildPrompt } from './prompt-builder.js';

function sourceLabel(sourceSystem: string): string {
  return sourceSystem === 'github' ? 'PR' : 'MR';
}

function buildExtractiveAnswer(chunks: RankedChunk[], question: string): string {
  if (chunks.length === 0) {
    return `回答モード: extractive\n質問: ${question}\n\n該当する過去事例は見つかりませんでした。`;
  }

  const citations = chunks
    .map((c) => `- ${sourceLabel(c.chunk.source_system)} !${c.chunk.change_request_number} @${c.chunk.author} ${c.chunk.web_url}`)
    .join('\n');

  return [
    '回答モード: extractive',
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
  if (env.ANSWER_MODE === 'extractive') {
    return buildExtractiveAnswer(chunks, question);
  }

  if (!env.LLM_API_KEY) {
    throw new Error('LLM_API_KEY is required when ANSWER_MODE=llm');
  }

  const prompt = buildPrompt(chunks, question);

  try {
    const { streamText } = await import('ai');
    const model =
      env.LLM_PROVIDER === 'gemini'
        ? await (async () => {
            const pkg = await import('@ai-sdk/google');
            const google = pkg.createGoogleGenerativeAI({ apiKey: env.LLM_API_KEY });
            return google(env.LLM_MODEL);
          })()
        : await (async () => {
            const pkg = await import('@ai-sdk/anthropic');
            const anthropic = pkg.createAnthropic({ apiKey: env.LLM_API_KEY });
            return anthropic(env.LLM_MODEL);
          })();

    const stream = await streamText({
      model,
      system: 'あなたは開発チームのナレッジベースアシスタントです。検索結果のみに基づいて回答し、必ず出典MR/PR/コメントを明記してください。',
      prompt,
    });

    if (typeof stream?.text === 'string') return stream.text;
    if (stream?.text && typeof stream.text.then === 'function') return await stream.text;
    if (stream?.textStream) {
      let out = '';
      for await (const part of stream.textStream) out += part;
      if (out.trim()) return out;
    }
    throw new Error('LLM returned empty response');
  } catch {
    throw new Error('Failed to generate answer in llm mode');
  }
}
