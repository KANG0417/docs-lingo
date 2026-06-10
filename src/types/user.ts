export interface UserProfile {
  id: string;
  nickname: string;
  image: string | null;
}

export interface UpdateUserProfilePayload {
  nickname: string;
  image: string | null;
}
