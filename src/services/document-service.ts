import type { DocumentContent } from "@/types/document";

export const readDocumentFromUrl = async (
  url: string,
): Promise<DocumentContent> => {
  const response = await fetch("/api/documents/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const { message } = (await response.json()) as { message: string };
    throw new Error(message);
  }

  return (await response.json()) as DocumentContent;
};
