import type { Discussion, MRDiff, MergeRequest } from '../types/gitlab.js';
import { GitLabClient } from './gitlab-client.js';

export interface FetchedMRBundle {
  mr: MergeRequest;
  discussions: Discussion[];
  diffs: MRDiff[];
}

export interface FetchMROptions {
  projectId: number;
  since?: string;
  concurrency?: number;
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  const queue = [...items];

  async function consume(): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      const result = await worker(item);
      results.push(result);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => consume()));
  return results;
}

export async function fetchMRBundles(
  client: GitLabClient,
  options: FetchMROptions,
): Promise<FetchedMRBundle[]> {
  const mrs = await client.listMergeRequests(options.projectId, options.since);
  const concurrency = options.concurrency ?? 5;

  return runWithConcurrency(mrs, concurrency, async (mr) => {
    const [discussions, diffs] = await Promise.all([
      client.listDiscussions(options.projectId, mr.iid),
      client.listDiffs(options.projectId, mr.iid),
    ]);

    return { mr, discussions, diffs };
  });
}
