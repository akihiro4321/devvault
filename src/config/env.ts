import dotenv from 'dotenv';
import { z } from 'zod';
import { DEFAULT_EMBEDDING_MODEL } from './constants.js';

dotenv.config();

const envSchema = z.object({
  SCM_PROVIDER: z.enum(['gitlab', 'github']).default('gitlab'),
  GITLAB_URL: z.string().url().default('https://gitlab.example.com'),
  GITLAB_TOKEN: z.string().min(1).optional(),
  GITLAB_PROJECT_IDS: z.string().default(''),
  GITHUB_URL: z.string().url().default('https://api.github.com'),
  GITHUB_TOKEN: z.string().min(1).optional(),
  GITHUB_OWNER: z.string().default(''),
  LANCEDB_PATH: z.string().default('./data/lancedb'),
  EMBEDDING_MODEL: z.string().default(DEFAULT_EMBEDDING_MODEL),
  ANSWER_MODE: z.enum(['extractive', 'llm']).default('extractive'),
  LLM_PROVIDER: z.enum(['gemini', 'claude']).default('gemini'),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('gemini-2.0-flash'),
  INGEST_BATCH_SIZE: z.coerce.number().int().positive().default(50),
  INGEST_SINCE: z.string().default('2024-01-01'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

export function parseProjectIds(value: string): number[] {
  return value
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}
