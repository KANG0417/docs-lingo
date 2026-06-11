export interface UserProfile {
  id: string;
  nickname: string;
  image: string | null;
  withdrawalScheduledAt: string | null;
}

export interface WithdrawalStatus {
  scheduledAt: string | null;
}

export interface UpdateUserProfilePayload {
  nickname: string;
  image: string | null;
}
