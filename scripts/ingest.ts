import { ingest } from '../src/index.js';
import { env } from '../src/config/env.js';
import { LanceIndexer } from '../src/ingestion/indexer.js';

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

  let resolvedSince = since;

  if (incremental) {
    const indexer = new LanceIndexer();
    const existing = await indexer.readAll();
    const latest = existing
      .filter((chunk) => chunk.project_id === projectId)
      .map((chunk) => chunk.updated_at ?? chunk.created_at)
      .sort()
      .at(-1);
    resolvedSince = latest ?? since ?? env.INGEST_SINCE;
  }

  const count = await ingest({
    projectId,
    since: resolvedSince,
  });

  console.log(`Indexed ${count} chunks`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
