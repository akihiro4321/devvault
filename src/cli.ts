#!/usr/bin/env node

import { ask, ingest } from './index.js';

async function main(): Promise<void> {
  const [cmd, ...args] = process.argv.slice(2);

  if (cmd === 'ingest') {
    const projectId = Number(args[0]);
    if (!projectId) throw new Error('Usage: gitlab-mr-kb ingest <projectId>');
    await ingest({ projectId });
    console.log('ingest completed');
    return;
  }

  if (cmd === 'ask') {
    const question = args.join(' ').trim();
    if (!question) throw new Error('Usage: gitlab-mr-kb ask <question>');
    const answer = await ask(question);
    console.log(answer);
    return;
  }

  console.log('Usage: gitlab-mr-kb <ingest|ask> ...');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
