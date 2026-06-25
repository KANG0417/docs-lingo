import type { ReactElement } from "react";

interface TranslationWarningsProps {
  warnings: string[];
}

export const TranslationWarnings = ({
  warnings,
}: TranslationWarningsProps): ReactElement | null => {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <section
      className="mb-5 rounded-md border border-amber-300 bg-amber-50/80 p-4"
      aria-label="번역 주의사항"
    >
      <h3 className="font-doc-translation-bold mb-2 text-sm font-bold text-amber-900">
        번역 시 참고
      </h3>
      <ul className="translation-list text-sm text-amber-950">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </section>
  );
};
