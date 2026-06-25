import type { DocumentCodeBlock } from "@/types/document-code-block";
import type { PreservedCodeBlock } from "@/types/claude-document-translation";

const formatBlockCodeForPrompt = (block: DocumentCodeBlock): string => {
  const variantsWithCode = block.variants.filter(
    (variant) => variant.code.trim().length > 0,
  );

  if (variantsWithCode.length === 0) {
    return block.variants[0]?.code.trim() ?? "";
  }

  const packageManagerVariants = variantsWithCode.filter(
    (variant) => variant.packageManager.trim().length > 0,
  );

  if (packageManagerVariants.length <= 1) {
    return variantsWithCode[0]?.code.trim() ?? "";
  }

  return packageManagerVariants
    .map((variant) => `${variant.packageManager}:\n${variant.code.trim()}`)
    .join("\n\n");
};

export const mergePreservedCodeBlocksForClaude = (
  structuredBlocks: PreservedCodeBlock[],
  documentBlocks: DocumentCodeBlock[],
): PreservedCodeBlock[] => {
  if (documentBlocks.length === 0) {
    return structuredBlocks;
  }

  return documentBlocks.flatMap((block) => {
    const code = formatBlockCodeForPrompt(block);

    if (!code) {
      return [];
    }

    const primaryVariant =
      block.variants.find((variant) => variant.code.trim()) ?? block.variants[0];

    return [
      {
        id: block.id,
        language: primaryVariant?.language ?? "text",
        code,
        label: block.label,
        sectionHeading: block.sectionHeading,
      },
    ];
  });
};
