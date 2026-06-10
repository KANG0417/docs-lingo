export type SnsProviderId = "google" | "kakao" | "naver" | "github";

export interface SnsProvider {
  id: SnsProviderId;
  label: string;
  className: string;
}
