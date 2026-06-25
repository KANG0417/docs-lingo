import type { DocumentType } from "@/types/claude-document-translation";

export const DOCUMENT_TYPE_SLUGS = [
  "concept_explanation",
  "tutorial",
  "api_reference",
  "configuration_guide",
  "migration_guide",
  "troubleshooting",
  "architecture",
  "other",
] as const;

export type PrimaryDocumentType = (typeof DOCUMENT_TYPE_SLUGS)[number];

export const DOCUMENT_TYPE_PRIORITY_RULES: Record<
  PrimaryDocumentType,
  string
> = {
  concept_explanation:
    "정의, 필요성, 동작 원리, 유사 개념과의 차이를 우선합니다.",
  tutorial:
    "사전 조건, 구현 순서, 코드, 실행 결과를 우선합니다.",
  api_reference:
    "API 역할, 매개변수, 반환값, 예외, 최소 예제를 우선합니다.",
  configuration_guide:
    "설정값, 기본값, 적용 범위, 변경 시 영향을 우선합니다.",
  migration_guide:
    "변경 전후 차이, 호환성, 수정해야 할 코드를 우선합니다.",
  troubleshooting:
    "증상, 원인, 확인 방법, 해결 순서를 우선합니다.",
  architecture:
    "구성 요소, 책임, 데이터 흐름, 의존 관계를 우선합니다.",
  other:
    "문서 목적에 가장 가까운 실무 정보를 우선합니다.",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  concept_explanation: "개념 설명",
  tutorial: "튜토리얼",
  api_reference: "API Reference",
  configuration_guide: "설정 가이드",
  migration_guide: "마이그레이션 가이드",
  troubleshooting: "트러블슈팅",
  architecture: "아키텍처 설명",
  other: "기타",
  official_docs: "개념 설명",
  blog_article: "기타",
  release_note: "기타",
  unknown: "기타",
};

export const SUMMARY_PROCESSING_PIPELINE = [
  "원문 입력",
  "→ 불필요한 UI·메뉴·광고 제거",
  "→ 제목과 본문 구조 추출",
  "→ 문서 유형 판별",
  "→ 섹션별 핵심 정보 추출",
  "→ 전체 중요도 재평가",
  "→ 최종 구조로 재작성",
  "→ 원문과 대조하여 누락·추측 검사",
].join("\n");
