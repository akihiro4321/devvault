import { ingest } from '../src/index.js';

function readFlag(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main(): Promise<void> {
  const projectId = Number(readFlag('--project-id'));
  const since = readFlag('--since');
  const incremental = process.argv.includes('--incremental');

  if (!projectId) {
    throw new Error('--project-id is required');
  }

  const count = await ingest({
    projectId,
    since: incremental ? undefined : since,
  });

  console.log(`Indexed ${count} chunks`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
