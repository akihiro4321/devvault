import type { GitLabChangeRequest, GitLabDiff, GitLabDiscussion } from '../types/gitlab.js';
import type { ChangeRequestClient, ProjectRef } from '../types/review.js';

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

export class GitLabClient implements ChangeRequestClient {
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

  private assertProjectId(projectId: ProjectRef): number {
    if (typeof projectId !== 'number') {
      throw new Error('GitLab project id must be a number');
    }
    return projectId;
  }

  async listChangeRequests(projectId: ProjectRef, since?: string): Promise<GitLabChangeRequest[]> {
    const resolvedProjectId = this.assertProjectId(projectId);
    const params = new URLSearchParams({
      per_page: '100',
      scope: 'all',
      order_by: 'updated_at',
      sort: 'desc',
    });
    if (since) params.set('updated_after', since);
    const url = `${this.baseUrl}/api/v4/projects/${resolvedProjectId}/merge_requests?${params.toString()}`;
    return (await this.paginate<GitLabChangeRequest>(url)).map((changeRequest) => ({
      ...changeRequest,
      source_system: 'gitlab',
    }));
  }

  async listDiscussions(projectId: ProjectRef, changeRequestNumber: number): Promise<GitLabDiscussion[]> {
    const resolvedProjectId = this.assertProjectId(projectId);
    const url = `${this.baseUrl}/api/v4/projects/${resolvedProjectId}/merge_requests/${changeRequestNumber}/discussions?per_page=100`;
    return this.paginate<GitLabDiscussion>(url);
  }

  async listDiffs(projectId: ProjectRef, changeRequestNumber: number): Promise<GitLabDiff[]> {
    const resolvedProjectId = this.assertProjectId(projectId);
    const url = `${this.baseUrl}/api/v4/projects/${resolvedProjectId}/merge_requests/${changeRequestNumber}/diffs?per_page=100`;
    return this.paginate<GitLabDiff>(url);
  }
}
