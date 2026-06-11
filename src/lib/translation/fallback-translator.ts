import { normalizeFallbackError } from "@/lib/translation/translation-errors";

const MYMEMORY_CHUNK_SIZE = 450;
const MYMEMORY_API_URL = "https://api.mymemory.translated.net/get";

interface MyMemoryResponse {
  responseData?: {
    translatedText?: string;
  };
  responseStatus?: number;
  responseDetails?: string;
}

const splitIntoChunks = (text: string, chunkSize: number): string[] => {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = "";

  sentences.forEach((sentence) => {
    const nextChunk = `${currentChunk} ${sentence}`.trim();
    if (nextChunk.length <= chunkSize) {
      currentChunk = nextChunk;
      return;
    }

    if (currentChunk) chunks.push(currentChunk);
    currentChunk = sentence.length <= chunkSize ? sentence : "";
    if (sentence.length > chunkSize) {
      let startIndex = 0;
      while (startIndex < sentence.length) {
        chunks.push(sentence.slice(startIndex, startIndex + chunkSize));
        startIndex += chunkSize;
      }
    }
  });

  if (currentChunk) chunks.push(currentChunk);
  return chunks.length > 0 ? chunks : [text];
};

const isQuotaWarningText = (translatedText: string): boolean => {
  const loweredText = translatedText.toLowerCase();
  return (
    loweredText.includes("mymemory warning") ||
    loweredText.includes("used all available free translations")
  );
};

const translateChunk = async (chunk: string): Promise<string> => {
  const params = new URLSearchParams({ q: chunk, langpair: "en|ko" });

  let response: Response;

  try {
    response = await fetch(`${MYMEMORY_API_URL}?${params.toString()}`);
  } catch (error) {
    throw normalizeFallbackError(error);
  }

  let data: MyMemoryResponse;

  try {
    data = (await response.json()) as MyMemoryResponse;
  } catch (error) {
    throw normalizeFallbackError(
      new Error("대체 번역 API 응답을 해석하지 못했습니다."),
      response.status,
    );
  }

  if (!response.ok) {
    throw normalizeFallbackError(
      new Error(data.responseDetails ?? "대체 번역 API 호출에 실패했습니다."),
      response.status,
    );
  }

  const translatedText = data.responseData?.translatedText?.trim();
  if (!translatedText) {
    throw normalizeFallbackError(
      new Error("대체 번역 결과를 받지 못했습니다."),
      response.status,
    );
  }

  if (isQuotaWarningText(translatedText)) {
    throw normalizeFallbackError(
      new Error(translatedText),
      response.status,
    );
  }

  return translatedText;
};

export const translateWithFallbackApi = async (
  content: string,
): Promise<string> => {
  const chunks = splitIntoChunks(content, MYMEMORY_CHUNK_SIZE);
  const translatedChunks: string[] = [];

  try {
    for (const chunk of chunks) {
      translatedChunks.push(await translateChunk(chunk));
    }
  } catch (error) {
    if (error instanceof Error && error.name === "TranslationError") {
      throw error;
    }

    throw normalizeFallbackError(error);
  }

  return translatedChunks.join(" ").replace(/\s{2,}/g, " ").trim();
};
