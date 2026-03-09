#!/usr/bin/env node

import { ask, ingest } from './index.js';

function readFlag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function readPositional(args: string[]): string | undefined {
  for (let i = 0; i < args.length; i += 1) {
    if (args[i].startsWith('--')) {
      i += 1;
      continue;
    }
    return args[i];
  }
  return undefined;
}

async function main(): Promise<void> {
  const [cmd, ...args] = process.argv.slice(2);

  if (cmd === 'ingest') {
    const provider = (readFlag(args, '--provider') as 'gitlab' | 'github' | undefined) ?? 'gitlab';
    const projectArg = readPositional(args);
    const projectId = provider === 'github' ? projectArg : Number(projectArg);

    if (!projectId) throw new Error('Usage: devvault ingest <projectId>');
    await ingest({ projectId, provider });
    console.log('ingest completed');
    return;
  }

  if (cmd === 'ask') {
    const question = args.join(' ').trim();
    if (!question) throw new Error('Usage: devvault ask <question>');
    const answer = await ask(question);
    console.log(answer);
    return;
  }

  console.log('Usage: devvault <ingest|ask> ...');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
