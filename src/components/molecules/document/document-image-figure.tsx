import type { ReactElement } from "react";
import type { DocumentImage } from "@/types/document-image";

interface DocumentImageFigureProps {
  image: DocumentImage;
}

export const DocumentImageFigure = ({
  image,
}: DocumentImageFigureProps): ReactElement => {
  return (
    <figure className="document-image-figure my-4 overflow-hidden rounded-md border border-dashed border-amber-300 bg-white/70">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.alt || image.caption || "문서 참고 이미지"}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="h-auto max-h-80 w-full object-contain bg-white p-2"
      />
      {image.caption && (
        <figcaption className="font-doc-aux border-t border-dashed border-amber-200 px-3 py-2 text-xs leading-relaxed text-amber-900/85">
          {image.caption}
        </figcaption>
      )}
    </figure>
  );
};
