import readline from 'node:readline/promises';
import { ask, search } from '../src/index.js';

function readFlag(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function runOneShot(query: string): Promise<void> {
  const results = await search({ query, topK: 20, rerankTopN: 5 });
  console.log('--- Search Results ---');
  for (const [i, item] of results.entries()) {
    console.log(`${i + 1}. [MR !${item.chunk.source_iid}] ${item.chunk.parent_title} @${item.chunk.author}`);
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
