import type { ProjectRef } from './review.js';

export type SourceType =
  | 'change_request_description'
  | 'change_request_comment'
  | 'change_request_diff_note'
  | 'change_request_diff';

export type SourceSystem = 'gitlab' | 'github' | 'jira' | 'backlog' | 'confluence';

export interface DocumentChunk {
  id: string;
  vector?: number[];
  text: string;
  source_type: SourceType;
  source_system: SourceSystem;
  project_id: ProjectRef;
  project_key: string;
  change_request_number: number;
  source_id: string;
  author: string;
  labels: string;
  target_branch: string;
  file_path?: string;
  created_at: string;
  updated_at?: string;
  web_url: string;
  parent_title: string;
  discussion_context?: string;
  chunk_index: number;
  total_chunks: number;
}
