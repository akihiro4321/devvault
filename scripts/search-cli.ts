import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { env } from '../src/config/env.js';
import { ask, search } from '../src/index.js';

function readFlag(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function sourceLabel(sourceSystem: string): string {
  return sourceSystem === 'github' ? 'PR' : 'MR';
}

async function runOneShot(query: string): Promise<void> {
  const results = await search({ query, topK: 20, rerankTopN: 5 });
  console.log('--- Search Results ---');
  for (const [i, item] of results.entries()) {
    console.log(
      `${i + 1}. [${sourceLabel(item.chunk.source_system)} !${item.chunk.change_request_number}] ${item.chunk.parent_title} @${item.chunk.author}`,
    );
    console.log(`   ${item.chunk.web_url}`);
  }
  console.log('\n--- Answer ---');
  console.log(await ask(query));
}

async function runInteractive(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (;;) {
      const q = (await rl.question('query> ')).trim();
      if (!q || q === 'exit' || q === 'quit') break;
      await runOneShot(q);
    }
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const sidecarPath = path.join(env.LANCEDB_PATH, '_chunks.json');
  if (!fs.existsSync(sidecarPath)) {
    throw new Error('Indexed data not found. Run ingest first (npm run ingest -- --project-id <id>).');
  }

  const query = readFlag('--query');
  if (query) {
    await runOneShot(query);
    return;
  }
  await runInteractive();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
