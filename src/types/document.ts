export type DocInputMode = "url" | "text";

export interface DocumentContent {
  title: string;
  content: string;
  url: string | null;
}
