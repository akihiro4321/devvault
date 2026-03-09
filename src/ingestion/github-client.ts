import type {
  ProjectRef,
  ReviewClient,
  ReviewDiff,
  ReviewDiscussion,
  ReviewNote,
  ReviewRequest,
  ReviewUser,
} from '../types/review.js';

export interface GitHubClientOptions {
  baseUrl: string;
  token: string;
  owner: string;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  merged_at: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  draft?: boolean;
  labels: Array<{ name: string }>;
  user: {
    id: number;
    login: string;
    name?: string;
  };
  head: {
    ref: string;
  };
  base: {
    ref: string;
  };
}

interface GitHubIssueComment {
  id: number;
  body: string | null;
  created_at: string;
  user: {
    id: number;
    login: string;
  } | null;
}

interface GitHubReviewComment extends GitHubIssueComment {
  path: string;
  line: number | null;
  original_line: number | null;
  diff_hunk?: string;
  pull_request_review_id?: number | null;
  in_reply_to_id?: number | null;
}

interface GitHubFile {
  filename: string;
  previous_filename?: string;
  patch?: string;
  status: string;
}

function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(',')) {
    const trimmed = part.trim();
    if (trimmed.includes('rel="next"')) {
      const match = trimmed.match(/<([^>]+)>/);
      return match?.[1] ?? null;
    }
  }
  return null;
}

function mapUser(user: { id: number; login: string; name?: string } | null): ReviewUser {
  return {
    id: user?.id ?? 0,
    username: user?.login ?? 'unknown',
    name: user?.name,
  };
}

function mapPullRequest(projectId: ProjectRef, pr: GitHubPullRequest): ReviewRequest {
  return {
    id: pr.id,
    iid: pr.number,
    project_id: projectId,
    source_system: 'github',
    title: pr.title,
    description: pr.body ?? '',
    state: pr.merged_at ? 'merged' : pr.state === 'open' ? 'opened' : 'closed',
    source_branch: pr.head.ref,
    target_branch: pr.base.ref,
    author: mapUser(pr.user),
    labels: pr.labels.map((label) => label.name),
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    merged_at: pr.merged_at,
    web_url: pr.html_url,
    draft: pr.draft,
  };
}

function mapIssueComment(comment: GitHubIssueComment): ReviewNote {
  return {
    id: comment.id,
    body: comment.body ?? '',
    author: mapUser(comment.user),
    system: false,
    created_at: comment.created_at,
  };
}

function mapReviewComment(comment: GitHubReviewComment): ReviewNote {
  return {
    id: comment.id,
    body: comment.body ?? comment.diff_hunk ?? '',
    author: mapUser(comment.user),
    type: 'DiffNote',
    position: {
      new_path: comment.path,
      new_line: comment.line ?? undefined,
      old_line: comment.original_line ?? undefined,
    },
    system: false,
    created_at: comment.created_at,
  };
}

function mapFile(file: GitHubFile): ReviewDiff {
  return {
    old_path: file.previous_filename ?? file.filename,
    new_path: file.filename,
    diff: file.patch ?? '',
    new_file: file.status === 'added',
    deleted_file: file.status === 'removed',
  };
}

export class GitHubClient implements ReviewClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly owner: string;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GitHubClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token = options.token;
    this.owner = options.owner;
    this.maxRetries = options.maxRetries ?? 3;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private repoName(projectId: ProjectRef): string {
    if (typeof projectId !== 'string' || !projectId.trim()) {
      throw new Error('GitHub project id must be a repository name string');
    }
    return projectId;
  }

  private async request(url: string, attempt = 0): Promise<Response> {
    const response = await this.fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'devvault',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if ((response.status === 403 || response.status === 429) && attempt < this.maxRetries) {
      const retryAfter = Number(response.headers.get('Retry-After') ?? '1');
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return this.request(url, attempt + 1);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub request failed ${response.status}: ${body}`);
    }

    return response;
  }

  private async paginate<T>(url: string): Promise<T[]> {
    const items: T[] = [];
    let nextUrl: string | null = url;

    while (nextUrl) {
      const response = await this.request(nextUrl);
      const pageData = (await response.json()) as T[];
      items.push(...pageData);
      nextUrl = parseNextLink(response.headers.get('Link'));
    }

    return items;
  }

  async listMergeRequests(projectId: ProjectRef, since?: string): Promise<ReviewRequest[]> {
    const repo = this.repoName(projectId);
    const params = new URLSearchParams({
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: '100',
    });
    const url = `${this.baseUrl}/repos/${this.owner}/${repo}/pulls?${params.toString()}`;
    const pulls = await this.paginate<GitHubPullRequest>(url);

    return pulls
      .map((pr) => mapPullRequest(projectId, pr))
      .filter((pr) => !since || (pr.updated_at ?? pr.created_at) >= since);
  }

  async listDiscussions(projectId: ProjectRef, mrIid: number): Promise<ReviewDiscussion[]> {
    const repo = this.repoName(projectId);
    const [issueComments, reviewComments] = await Promise.all([
      this.paginate<GitHubIssueComment>(
        `${this.baseUrl}/repos/${this.owner}/${repo}/issues/${mrIid}/comments?per_page=100`,
      ),
      this.paginate<GitHubReviewComment>(
        `${this.baseUrl}/repos/${this.owner}/${repo}/pulls/${mrIid}/comments?per_page=100`,
      ),
    ]);

    return [
      ...issueComments.map((comment) => ({
        id: `issue-${comment.id}`,
        notes: [mapIssueComment(comment)],
      })),
      ...reviewComments.map((comment) => ({
        id: `review-${comment.pull_request_review_id ?? comment.id}`,
        notes: [mapReviewComment(comment)],
      })),
    ];
  }

  async listDiffs(projectId: ProjectRef, mrIid: number): Promise<ReviewDiff[]> {
    const repo = this.repoName(projectId);
    const files = await this.paginate<GitHubFile>(
      `${this.baseUrl}/repos/${this.owner}/${repo}/pulls/${mrIid}/files?per_page=100`,
    );

    return files
      .filter((file) => Boolean(file.patch))
      .map((file) => mapFile(file));
  }
}
