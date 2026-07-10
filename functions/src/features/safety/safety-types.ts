export type ReportTargetType = "user" | "match" | "message";
export type ReportCategory =
  | "harassment"
  | "spam"
  | "threats"
  | "hate"
  | "sexual_content"
  | "other";
export type BlockReason = "safety" | "harassment" | "spam" | "other";

export interface ReportContentInput {
  reportToken: string;
  targetType: ReportTargetType;
  targetId: string;
  matchId?: string;
  category: ReportCategory;
  description?: string;
}

export interface ReportContentResponse {
  status: "reported";
  reportId: string;
}

export interface BlockUserInput {
  targetUserId: string;
  matchId?: string;
  reason?: BlockReason;
}

export interface BlockUserResponse {
  status: "blocked";
}

export interface UnmatchUserInput {
  matchId: string;
}

export interface UnmatchUserResponse {
  status: "unmatched";
}

export interface RequestAccountDeletionInput {
  reauthenticationToken?: string;
  confirmation: "DELETE_MY_ACCOUNT";
}

export interface RequestAccountDeletionResponse {
  status: "deletion_pending";
}

export interface ProcessAccountDeletionResponse {
  status: "processed";
  completedSteps: string[];
}

export interface SafetyStore {
  reportContent(
    uid: string,
    input: ReportContentInput,
    now: Date,
  ): Promise<ReportContentResponse>;
  blockUser(
    uid: string,
    input: BlockUserInput,
    now: Date,
  ): Promise<BlockUserResponse>;
  unmatchUser(
    uid: string,
    input: UnmatchUserInput,
    now: Date,
  ): Promise<UnmatchUserResponse>;
  requestAccountDeletion(
    uid: string,
    input: RequestAccountDeletionInput,
    now: Date,
  ): Promise<RequestAccountDeletionResponse>;
  processAccountDeletion(
    uid: string,
    now: Date,
  ): Promise<ProcessAccountDeletionResponse>;
}

export interface ReauthenticationVerifier {
  isRecentlyVerified(uid: string, token: string | undefined, now: Date): Promise<boolean>;
}

export interface SafetyDependencies {
  store: SafetyStore;
  reauthentication: ReauthenticationVerifier;
  now: () => Date;
}
