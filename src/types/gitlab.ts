import type {
  DiffPosition,
  ReviewDiff,
  ReviewDiscussion,
  ReviewNote,
  ReviewRequest,
  ReviewUser,
} from './review.js';

export type GitLabUser = ReviewUser;
export type MergeRequest = ReviewRequest;
export type Note = ReviewNote;
export type Discussion = ReviewDiscussion;
export type MRDiff = ReviewDiff;
export type { DiffPosition };
