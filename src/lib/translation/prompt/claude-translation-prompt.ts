import {
  DOCUMENT_TYPE_SLUGS,
  SUMMARY_PROCESSING_PIPELINE,
} from "@/constants/document-type-priority-rules";
import { CODE_EXAMPLE_PROMPT_RULES } from "@/lib/translation/prompt/code-example-prompt-rules";
import { getDocumentTypePriorityRule } from "@/lib/translation/normalize-document-type";
import type {
  DocumentType,
  ClaudeGlossaryTerm,
  PreservedCodeBlock,
} from "@/types/claude-document-translation";

/**
 * Claude 구조화 출력(output_config.format: json_schema)으로 강제하는 응답 형태.
 * 스키마 없이 프롬프트 지시만으로는 필드 누락·타입 불일치가 간헐적으로 발생해
 * 같은 문서를 다시 번역해도 결과 형태가 흔들리는 원인이 되므로, API 레벨에서
 * 형태를 고정한다. Claude structured outputs가 요구하는 표준 JSON Schema
 * 형식(소문자 type, 모든 object에 additionalProperties:false)을 따른다.
 */
export const CLAUDE_TRANSLATION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    documentType: { type: "string", enum: [...DOCUMENT_TYPE_SLUGS] },
    title: { type: "string" },
    purpose: { type: "string" },
    prerequisites: { type: "array", items: { type: "string" } },
    coreConcepts: { type: "array", items: { type: "string" } },
    workflow: { type: "array", items: { type: "string" } },
    apis: { type: "array", items: { type: "string" } },
    codeExamples: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
    versionNotes: { type: "array", items: { type: "string" } },
    unknowns: { type: "array", items: { type: "string" } },
    keyTerms: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          translation: { type: "string" },
          description: { type: "string" },
        },
        required: ["term", "translation", "description"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "documentType",
    "title",
    "purpose",
    "prerequisites",
    "coreConcepts",
    "workflow",
    "apis",
    "codeExamples",
    "warnings",
    "versionNotes",
    "unknowns",
    "keyTerms",
  ],
  additionalProperties: false,
} as const;

export const CLAUDE_TRANSLATION_SYSTEM_INSTRUCTION = [
  "당신은 프론트엔드 개발자를 위한 공식 기술 문서 핵심 요약 전문가입니다.",
  "먼저 문서 유형을 판별하고, 유형에 맞는 우선순위로 핵심만 추출합니다.",
  "전체 직역이 아니라 실무에 필요한 구조화된 요약만 작성합니다.",
  "원문에 없는 기능, 설정, 위험, 결론은 만들지 않습니다.",
  "코드, 함수명, 변수명, API 옵션명, 파일명, 경로명, 패키지명, CLI 플래그는 번역하지 않습니다.",
  "불명확한 내용은 unknowns에 기록하고 본문에 추측으로 쓰지 않습니다.",
  "반드시 요청한 JSON 스키마만 반환합니다.",
].join("\n");

const DOCUMENT_TYPE_CLASSIFICATION_RULES = [
  "문서 유형 분류 (반드시 아래 중 하나):",
  ...DOCUMENT_TYPE_SLUGS.map((slug) => `- ${slug}`),
  "",
  "유형별 우선순위:",
  "- concept_explanation: 정의, 필요성, 동작 원리, 유사 개념과의 차이",
  "- tutorial: 사전 조건, 구현 순서, 코드, 실행 결과",
  "- api_reference: API 역할, 매개변수, 반환값, 예외, 최소 예제",
  "- configuration_guide: 설정값, 기본값, 적용 범위, 변경 시 영향",
  "- migration_guide: 변경 전후 차이, 호환성, 수정해야 할 코드",
  "- troubleshooting: 증상, 원인, 확인 방법, 해결 순서",
  "- architecture: 구성 요소, 책임, 데이터 흐름, 의존 관계",
  "- other: 위에 해당하지 않을 때",
].join("\n");

const OUTPUT_RULES = [
  "출력 규칙:",
  "- JSON 밖의 텍스트는 금지합니다.",
  "- documentType은 위 8개 유형 중 하나로 판별합니다. 초기 힌트와 다르면 본문 근거로 재판별합니다.",
  "- title은 원문 제목의 의미를 살린 자연스러운 한국어 제목입니다.",
  "- purpose는 이 문서가 해결하는 문제를 한 문장으로 씁니다.",
  "- prerequisites는 사전 조건·필수 지식·환경 요구사항입니다. 없으면 빈 배열.",
  "- coreConcepts는 유형별 우선순위에 맞는 핵심 개념 3~6개입니다.",
  "- workflow는 문서 흐름·구현 순서·해결 순서 등 단계 3~6개입니다.",
  "- apis는 API/함수/옵션 단위 설명입니다. API Reference·설정 가이드에서 우선 채웁니다. 없으면 빈 배열.",
  "- codeExamples는 코드·설정·CLI 예제 설명입니다.",
  "- warnings는 실무 주의사항입니다.",
  "- versionNotes는 버전·호환·Breaking change 정보입니다. 없으면 빈 배열.",
  "- unknowns는 원문이 불명확하거나 누락된 부분입니다. 없으면 빈 배열.",
  "- keyTerms는 핵심 용어 4~8개 (term 원문, description 한국어, translation은 실무 표기).",
  "- 목록 항목은 완결된 한국어 문장으로 작성하고 핵심은 **...**로 강조합니다.",
  "",
  CODE_EXAMPLE_PROMPT_RULES,
].join("\n");

const formatPreservedCodeBlocks = (
  blocks: PreservedCodeBlock[],
): string => {
  if (blocks.length === 0) {
    return "(없음)";
  }

  return blocks
    .map((block) => {
      const metaLines = [
        `- id: ${block.id}`,
        block.label ? `  label: ${block.label}` : null,
        block.sectionHeading ? `  section: ${block.sectionHeading}` : null,
        `  language: ${block.language}`,
        "  code:",
        ...block.code.split("\n").map((line) => `    ${line}`),
      ].filter((line): line is string => line !== null);

      return metaLines.join("\n");
    })
    .join("\n\n");
};

const formatGlossary = (glossary: ClaudeGlossaryTerm[]): string => {
  if (glossary.length === 0) {
    return "(없음)";
  }

  return glossary
    .map((item) => `- ${item.term}${item.note ? `: ${item.note}` : ""}`)
    .join("\n");
};

export const buildClaudeTranslationUserPrompt = ({
  documentType,
  sourceTitle,
  sourceUrl,
  extractedText,
  preservedCodeBlocks,
  glossary,
}: {
  documentType: DocumentType;
  sourceTitle: string;
  sourceUrl: string | null;
  extractedText: string;
  preservedCodeBlocks: PreservedCodeBlock[];
  glossary: ClaudeGlossaryTerm[];
}): string => {
  const hasCodeBlocks = preservedCodeBlocks.length > 0;
  const priorityRule = getDocumentTypePriorityRule(documentType);

  return [
    "다음 기술 문서를 한국어 개발자용 핵심 요약으로 정리하세요.",
    "",
    "처리 절차 (내부적으로 이 순서를 따르세요):",
    SUMMARY_PROCESSING_PIPELINE,
    "",
    DOCUMENT_TYPE_CLASSIFICATION_RULES,
    "",
    `초기 문서 유형 힌트: ${documentType}`,
    `힌트 유형 우선순위: ${priorityRule}`,
    "",
    `sourceTitle: ${sourceTitle}`,
    `sourceUrl: ${sourceUrl ?? "(직접 입력)"}`,
    "",
    "extractedText:",
    "<document>",
    extractedText,
    "</document>",
    "",
    "preservedCodeBlocks:",
    formatPreservedCodeBlocks(preservedCodeBlocks),
    "",
    "glossaryCandidates:",
    formatGlossary(glossary),
    "",
    hasCodeBlocks
      ? "중요: preservedCodeBlocks가 있습니다. codeExamples에서 각 블록의 파일/명령/설정/옵션을 빠짐없이 설명하세요."
      : "preservedCodeBlocks가 없으면 codeExamples는 빈 배열로 둡니다.",
    "",
    "마지막 단계: 원문과 대조해 누락된 핵심이 있으면 해당 배열에 보완하고, 추측한 내용은 제거해 unknowns에 기록하세요.",
    "",
    OUTPUT_RULES,
    "",
    "다음 JSON 스키마로만 응답하세요.",
    "{",
    `  "documentType": "${DOCUMENT_TYPE_SLUGS.join(" | ")}",`,
    '  "title": "문서 제목의 한국어 핵심 제목",',
    '  "purpose": "이 문서가 해결하는 문제",',
    '  "prerequisites": ["사전 조건 1"],',
    '  "coreConcepts": ["핵심 개념 1"],',
    '  "workflow": ["문서 흐름 또는 구현 순서 1"],',
    '  "apis": ["API 또는 설정 항목 설명 1"],',
    '  "codeExamples": ["[app/page.tsx] ..."],',
    '  "warnings": ["주의사항 1"],',
    '  "versionNotes": ["버전·호환 정보"],',
    '  "unknowns": ["원문이 불명확한 부분"],',
    '  "keyTerms": [',
    "    {",
    '      "term": "App Router",',
    '      "translation": "App Router",',
    '      "description": "용어 설명"',
    "    }",
    "  ]",
    "}",
  ].join("\n");
};
