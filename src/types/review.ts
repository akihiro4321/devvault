export type ProjectRef = number | string;

export interface ChangeRequestUser {
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

export interface ChangeRequestNote {
  id: number;
  body: string;
  author: ChangeRequestUser;
  type?: string | null;
  position?: DiffPosition | null;
  system: boolean;
  resolved?: boolean;
  created_at: string;
}

export interface ChangeRequestDiscussion {
  id: string;
  notes: ChangeRequestNote[];
}

export interface ChangeRequestDiff {
  old_path: string;
  new_path: string;
  diff: string;
  new_file: boolean;
  deleted_file: boolean;
}

export interface ChangeRequest {
  id: number;
  iid: number;
  project_id: ProjectRef;
  source_system: 'gitlab' | 'github';
  title: string;
  description: string;
  state: 'opened' | 'merged' | 'closed' | string;
  source_branch: string;
  target_branch: string;
  author: ChangeRequestUser;
  labels: string[];
  created_at: string;
  updated_at?: string;
  merged_at?: string | null;
  web_url: string;
  draft?: boolean;
}

export interface FetchedChangeRequestBundle {
  changeRequest: ChangeRequest;
  discussions: ChangeRequestDiscussion[];
  diffs: ChangeRequestDiff[];
}

export interface ChangeRequestClient {
  listChangeRequests(projectId: ProjectRef, since?: string): Promise<ChangeRequest[]>;
  listDiscussions(projectId: ProjectRef, changeRequestNumber: number): Promise<ChangeRequestDiscussion[]>;
  listDiffs(projectId: ProjectRef, changeRequestNumber: number): Promise<ChangeRequestDiff[]>;
}
