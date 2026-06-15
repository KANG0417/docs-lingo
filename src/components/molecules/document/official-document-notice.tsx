import type { ReactElement } from "react";

interface OfficialDocumentNoticeProps {
  live?: "polite" | "off";
}

export const OfficialDocumentNotice = ({
  live = "off",
}: OfficialDocumentNoticeProps): ReactElement => {
  return (
    <div
      role="status"
      aria-live={live}
      className="official-document-notice font-doc-translation relative w-full overflow-hidden rounded-md border border-indigo-400/25 bg-[#0a1030] px-4 py-3 text-sm leading-relaxed text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
    >
      <p className="relative z-[1]">
        <span className="font-doc-translation-bold text-[#fde68a]">공식 문서만</span>{" "}
        번역됩니다.
      </p>
      <p className="relative z-[1] mt-1.5">
        <span className="font-doc-translation-bold text-[#fde68a]">
          블로그·커뮤니티·Q&A
        </span>{" "}
        사이트 URL은 지원하지 않습니다.
      </p>
      <p className="relative z-[1] mt-1.5">
        <span className="font-doc-translation-bold text-[#fde68a]">npm</span> 또는{" "}
        <span className="font-doc-translation-bold text-[#fde68a]">PyPI</span>에
        등록된 패키지의{" "}
        <span className="font-doc-translation-bold text-[#fde68a]">
          공식 홈페이지·문서 URL
        </span>
        을 입력해 주세요.
      </p>
    </div>
  );
};
