import { fetchHtmlDocument } from "@/lib/document-pipeline/fetch-html";
import { extractDocumentImages } from "@/lib/document/extract-document-images";
import { mergeDocumentImageCaptions } from "@/lib/translation/merge-document-images";
import type { DocumentImage } from "@/types/document-image";

export const rehydrateDocumentImagesFromUrl = async (
  url: string,
): Promise<DocumentImage[]> => {
  const fetchedDocument = await fetchHtmlDocument(url);
  const extractedImages = extractDocumentImages(
    fetchedDocument.html,
    fetchedDocument.url,
  );

  return mergeDocumentImageCaptions(extractedImages);
};
