import type { ChangeRequestClient, FetchedChangeRequestBundle, ProjectRef } from '../types/review.js';

export interface FetchChangeRequestOptions {
  projectId: ProjectRef;
  since?: string;
  concurrency?: number;
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: Array<R | undefined> = new Array(items.length);
  let cursor = 0;

  async function consume(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => consume()));
  return results.filter((v): v is R => v !== undefined);
}

export async function fetchChangeRequestBundles(
  client: ChangeRequestClient,
  options: FetchChangeRequestOptions,
): Promise<FetchedChangeRequestBundle[]> {
  const changeRequests = await client.listChangeRequests(options.projectId, options.since);
  const concurrency = options.concurrency ?? 5;

  return runWithConcurrency(changeRequests, concurrency, async (changeRequest) => {
    const [discussions, diffs] = await Promise.all([
      client.listDiscussions(options.projectId, changeRequest.iid),
      client.listDiffs(options.projectId, changeRequest.iid),
    ]);

    return { changeRequest, discussions, diffs };
  });
}
