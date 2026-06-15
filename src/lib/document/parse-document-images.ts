import type { DocumentImage } from "@/types/document-image";

export const parseStoredDocumentImages = (value: unknown): DocumentImage[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const record = entry as Record<string, unknown>;
    const url = typeof record.url === "string" ? record.url.trim() : "";

    if (!url) {
      return [];
    }

    const parsedSectionIndex =
      typeof record.sectionIndex === "number"
        ? record.sectionIndex
        : Number.parseInt(String(record.sectionIndex ?? "0"), 10);

    return [
      {
        id: typeof record.id === "string" ? record.id : `img-${url}`,
        url,
        alt: typeof record.alt === "string" ? record.alt : "",
        caption: typeof record.caption === "string" ? record.caption : "",
        sectionIndex: Number.isFinite(parsedSectionIndex) ? parsedSectionIndex : 0,
        sectionHeading:
          typeof record.sectionHeading === "string" ? record.sectionHeading : null,
      },
    ];
  });
};
