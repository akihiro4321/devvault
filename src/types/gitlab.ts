import type {
  ChangeRequest,
  ChangeRequestDiff,
  ChangeRequestDiscussion,
  ChangeRequestNote,
  ChangeRequestUser,
  DiffPosition,
} from './review.js';

export type GitLabUser = ChangeRequestUser;
export type GitLabChangeRequest = ChangeRequest;
export type GitLabNote = ChangeRequestNote;
export type GitLabDiscussion = ChangeRequestDiscussion;
export type GitLabDiff = ChangeRequestDiff;
export type { DiffPosition };
