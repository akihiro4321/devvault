import type { Discussion, MRDiff, MergeRequest } from '../types/gitlab.js';

export interface GitLabClientOptions {
  baseUrl: string;
  token: string;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
}

function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('rel="next"')) {
      const match = trimmed.match(/<([^>]+)>/);
      return match?.[1] ?? null;
    }
  }
  return null;
}

export class GitLabClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GitLabClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token = options.token;
    this.maxRetries = options.maxRetries ?? 3;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async request<T>(url: string, attempt = 0): Promise<Response> {
    const response = await this.fetchImpl(url, {
      headers: {
        'PRIVATE-TOKEN': this.token,
        Accept: 'application/json',
      },
    });

    if (response.status === 429 && attempt < this.maxRetries) {
      const retryAfter = Number(response.headers.get('Retry-After') ?? '1');
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return this.request<T>(url, attempt + 1);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitLab request failed ${response.status}: ${body}`);
    }

    return response;
  }

  private async paginate<T>(url: string): Promise<T[]> {
    const items: T[] = [];
    let nextUrl: string | null = url;

    while (nextUrl) {
      const response = await this.request<T[]>(nextUrl);
      const pageData = (await response.json()) as T[];
      items.push(...pageData);
      nextUrl = parseNextLink(response.headers.get('Link'));
    }

    return items;
  }

  async listMergeRequests(projectId: number, since?: string): Promise<MergeRequest[]> {
    const params = new URLSearchParams({
      per_page: '100',
      scope: 'all',
      order_by: 'updated_at',
      sort: 'desc',
    });
    if (since) params.set('updated_after', since);
    const url = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests?${params.toString()}`;
    return this.paginate<MergeRequest>(url);
  }

  async listDiscussions(projectId: number, mrIid: number): Promise<Discussion[]> {
    const url = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/discussions?per_page=100`;
    return this.paginate<Discussion>(url);
  }

  async listDiffs(projectId: number, mrIid: number): Promise<MRDiff[]> {
    const url = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/diffs?per_page=100`;
    return this.paginate<MRDiff>(url);
  }
}
