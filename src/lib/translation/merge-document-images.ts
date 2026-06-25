import type { DocumentImage } from "@/types/document-image";

interface ClaudeImageDescription {
  imageId: string;
  description: string;
}

export const mergeDocumentImageCaptions = (
  images: DocumentImage[],
  descriptions: ClaudeImageDescription[] = [],
): DocumentImage[] => {
  const descriptionMap = new Map<string, string>();

  descriptions.forEach((item) => {
    const description = item.description.trim();

    if (item.imageId && description) {
      descriptionMap.set(item.imageId, description);
    }
  });

  return images.map((image) => {
    const generatedCaption = descriptionMap.get(image.id);
    const fallbackCaption = image.caption.trim() || image.alt.trim();

    return {
      ...image,
      caption: generatedCaption ?? fallbackCaption,
    };
  });
};

export const groupDocumentImagesBySectionIndex = (
  images: DocumentImage[],
): Map<number, DocumentImage[]> => {
  const grouped = new Map<number, DocumentImage[]>();

  images.forEach((image) => {
    const sectionImages = grouped.get(image.sectionIndex) ?? [];
    sectionImages.push(image);
    grouped.set(image.sectionIndex, sectionImages);
  });

  return grouped;
};
