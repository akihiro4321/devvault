import { describe, expect, it, vi } from 'vitest';
import { GitHubClient } from '../src/ingestion/github-client.js';

function jsonResponse(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  });
}

describe('GitHubClient', () => {
  it('maps pull requests, comments, and files into review data', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes('/pulls?')) {
        return jsonResponse([
          {
            id: 10,
            number: 42,
            title: 'Fix login timeout',
            body: 'Add retry on DB timeout',
            state: 'closed',
            merged_at: '2025-01-02T00:00:00Z',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z',
            html_url: 'https://github.com/acme/web/pull/42',
            draft: false,
            labels: [{ name: 'bug' }],
            user: { id: 1, login: 'alice' },
            head: { ref: 'fix/login-timeout' },
            base: { ref: 'main' },
          },
        ]);
      }

      if (url.includes('/issues/42/comments')) {
        return jsonResponse([
          {
            id: 100,
            body: 'Customer impact confirmed',
            created_at: '2025-01-01T01:00:00Z',
            user: { id: 2, login: 'bob' },
          },
        ]);
      }

      if (url.includes('/pulls/42/comments')) {
        return jsonResponse([
          {
            id: 101,
            body: 'Guard null before retry',
            created_at: '2025-01-01T02:00:00Z',
            user: { id: 3, login: 'carol' },
            path: 'src/login.ts',
            line: 12,
            original_line: 12,
            pull_request_review_id: 88,
          },
        ]);
      }

      if (url.includes('/pulls/42/files')) {
        return jsonResponse([
          {
            filename: 'src/login.ts',
            patch: '@@ -1 +1,2 @@\n+retry()',
            status: 'modified',
          },
        ]);
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const client = new GitHubClient({
      baseUrl: 'https://api.github.com',
      token: 'ghp_test',
      owner: 'acme',
      fetchImpl,
    });

    const pulls = await client.listChangeRequests('web', '2025-01-01T00:00:00Z');
    const discussions = await client.listDiscussions('web', 42);
    const diffs = await client.listDiffs('web', 42);

    expect(pulls).toHaveLength(1);
    expect(pulls[0].source_system).toBe('github');
    expect(pulls[0].project_id).toBe('web');
    expect(pulls[0].iid).toBe(42);
    expect(discussions).toHaveLength(2);
    expect(discussions[1].notes[0].position?.new_path).toBe('src/login.ts');
    expect(diffs).toEqual([
      expect.objectContaining({
        new_path: 'src/login.ts',
        diff: expect.stringContaining('retry()'),
      }),
    ]);
  });
});
