export type ProjectRef = number | string;

export interface ReviewUser {
  id: number;
  username: string;
  name?: string;
}

export interface DiffPosition {
  new_path?: string;
  old_path?: string;
  new_line?: number;
  old_line?: number;
}

export interface ReviewNote {
  id: number;
  body: string;
  author: ReviewUser;
  type?: string | null;
  position?: DiffPosition | null;
  system: boolean;
  resolved?: boolean;
  created_at: string;
}

export interface ReviewDiscussion {
  id: string;
  notes: ReviewNote[];
}

export interface ReviewDiff {
  old_path: string;
  new_path: string;
  diff: string;
  new_file: boolean;
  deleted_file: boolean;
}

export interface ReviewRequest {
  id: number;
  iid: number;
  project_id: ProjectRef;
  source_system: 'gitlab' | 'github';
  title: string;
  description: string;
  state: 'opened' | 'merged' | 'closed' | string;
  source_branch: string;
  target_branch: string;
  author: ReviewUser;
  labels: string[];
  created_at: string;
  updated_at?: string;
  merged_at?: string | null;
  web_url: string;
  draft?: boolean;
}

export interface FetchedReviewBundle {
  mr: ReviewRequest;
  discussions: ReviewDiscussion[];
  diffs: ReviewDiff[];
}

export interface ReviewClient {
  listMergeRequests(projectId: ProjectRef, since?: string): Promise<ReviewRequest[]>;
  listDiscussions(projectId: ProjectRef, mrIid: number): Promise<ReviewDiscussion[]>;
  listDiffs(projectId: ProjectRef, mrIid: number): Promise<ReviewDiff[]>;
}
