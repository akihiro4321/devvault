export interface GitLabUser {
  id: number;
  username: string;
  name?: string;
}

export interface MergeRequest {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string;
  state: 'opened' | 'merged' | 'closed' | string;
  source_branch: string;
  target_branch: string;
  author: GitLabUser;
  labels: string[];
  created_at: string;
  updated_at?: string;
  merged_at?: string | null;
  web_url: string;
  draft?: boolean;
}

export interface DiffPosition {
  new_path?: string;
  old_path?: string;
  new_line?: number;
  old_line?: number;
}

export interface Note {
  id: number;
  body: string;
  author: GitLabUser;
  type?: string | null;
  position?: DiffPosition | null;
  system: boolean;
  resolved?: boolean;
  created_at: string;
}

export interface Discussion {
  id: string;
  notes: Note[];
}

export interface MRDiff {
  old_path: string;
  new_path: string;
  diff: string;
  new_file: boolean;
  deleted_file: boolean;
}
