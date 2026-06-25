import clsx from "clsx";
import type { ReactElement } from "react";
import { getDocumentTypeLabel } from "@/lib/document-pipeline/classify-document-type";
import type { DocumentType } from "@/types/claude-document-translation";

interface DocumentTypeBadgeProps {
  documentType: DocumentType;
  className?: string;
}

export const DocumentTypeBadge = ({
  documentType,
  className,
}: DocumentTypeBadgeProps): ReactElement => {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border border-amber-300 bg-amber-100/80 px-2.5 py-0.5 text-xs font-semibold text-amber-900",
        className,
      )}
    >
      {getDocumentTypeLabel(documentType)}
    </span>
  );
};
