const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.join(__dirname, "..", "..");
const readSource = (relativePath) =>
  fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const constantsSource = readSource("src/constants/claude.ts");
const clientSource = readSource("src/lib/claude/claude-client.ts");
const promptSource = readSource("src/lib/translation/prompt/claude-translation-prompt.ts");
const translationServiceSource = readSource(
  "src/services/claude-translation-service.ts",
);
const processorSource = readSource("src/lib/translation/document-ai-processor.ts");
const mapSource = readSource("src/lib/translation/map-claude-translation-response.ts");
const typeSource = readSource("src/types/claude-document-translation.ts");

// 같은 문서를 여러 번 번역해도 결과 형태가 흔들리지 않으려면, Claude가 응답을
// 자유 형식으로 답하지 않도록(output_config.format/responseSchema) API 레벨에서
// 막아야 한다.
assert.ok(
  constantsSource.includes("CLAUDE_MAX_OUTPUT_TOKENS"),
  "constants expose CLAUDE_MAX_OUTPUT_TOKENS for the client to consume",
);

[
  "CLAUDE_MODEL",
  "max_tokens: options?.maxOutputTokens ?? CLAUDE_MAX_OUTPUT_TOKENS",
  "options?.responseSchema",
  'format: { type: "json_schema", schema: options.responseSchema }',
].forEach((requiredText) => {
  assert.ok(
    clientSource.includes(requiredText),
    `claude-client wires max_tokens/structured output into the request: ${requiredText}`,
  );
});

// 항상 스트리밍으로 호출해 긴 입력·출력에서도 HTTP 타임아웃을 피한다.
assert.ok(
  clientSource.includes("client.messages.stream(") &&
    clientSource.includes(".finalMessage()"),
  "claude-client uses streaming + finalMessage() to avoid request timeouts",
);

// 정상 응답이어도 드물게 잘린/깨진 JSON이 올 수 있다. 이 경우 곧바로
// legacy/MyMemory 단계로 떨어지면 품질이 크게 달라지므로, 같은 요청을 한 번
// 더 재시도해야 한다.
assert.match(
  clientSource,
  /requestClaudeJsonOnce[\s\S]*catch[\s\S]*SyntaxError[\s\S]*requestClaudeJsonOnce/,
  "generateClaudeJson retries the same request once on JSON parse failure before giving up",
);

// 타입이 분리된 SDK 예외(instanceof)로 분기해야 한다 — 메시지 문자열 매칭보다
// 안정적이다.
[
  "Anthropic.AuthenticationError",
  "Anthropic.PermissionDeniedError",
  "Anthropic.RateLimitError",
  "Anthropic.NotFoundError",
  "Anthropic.BadRequestError",
].forEach((errorClass) => {
  const errorsSource = readSource("src/lib/translation/translation-errors.ts");
  assert.ok(
    errorsSource.includes(`error instanceof ${errorClass}`),
    `normalizeClaudeError branches on typed Anthropic SDK exception: ${errorClass}`,
  );
});

// 구조화 응답의 형태를 표준 JSON Schema로 고정해 필드 누락·타입 불일치로
// 인한 결과 편차를 줄인다. Claude structured outputs는 소문자 type +
// 모든 object에 additionalProperties:false가 필요하다.
assert.ok(
  promptSource.includes("CLAUDE_TRANSLATION_RESPONSE_SCHEMA"),
  "claude-translation-prompt exports a response schema for structured output",
);

assert.ok(
  promptSource.includes('type: "object"') &&
    !promptSource.includes('type: "OBJECT"'),
  "response schema uses lowercase JSON Schema types, not Gemini-style uppercase",
);

assert.ok(
  (promptSource.match(/additionalProperties: false/g) ?? []).length >= 2,
  "response schema sets additionalProperties:false at every object level",
);

const documentTranslationFields = [
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
];

documentTranslationFields.forEach((field) => {
  assert.ok(
    new RegExp(`${field}[\\s:?]+`).test(typeSource),
    `ClaudeDocumentTranslationResponse type still declares field: ${field}`,
  );
  assert.ok(
    promptSource.includes(`${field}:`),
    `response schema declares matching property: ${field}`,
  );
});

["term", "translation", "description"].forEach((field) => {
  assert.ok(
    promptSource.includes(`${field}: { type: "string" }`),
    `keyTerms schema item declares field: ${field}`,
  );
});

assert.ok(
  translationServiceSource.includes(
    "responseSchema: CLAUDE_TRANSLATION_RESPONSE_SCHEMA",
  ),
  "translateDocumentWithClaude passes the response schema through to Claude",
);

// legacy(단일 프롬프트)/MyMemory(직역) 단계는 구조화 단계와 형식·품질이 크게
// 달라 같은 링크를 다시 번역했을 때 결과가 들쑤시는 주된 원인이 된다.
// 단계를 낮추기 전에 같은 구조화 프롬프트를 한 번 더 시도해야 한다.
const structuredClaudeCallCount = (
  processorSource.match(/await processWithStructuredClaude\(/g) ?? []
).length;

assert.ok(
  structuredClaudeCallCount >= 2,
  "processRefinedDocument retries processWithStructuredClaude before degrading to processWithLegacyClaude",
);

const structuredCallIndex = processorSource.indexOf(
  "await processWithStructuredClaude(",
);
const legacyCallIndex = processorSource.indexOf(
  "await processWithLegacyClaude(",
);

assert.ok(
  structuredCallIndex >= 0 &&
    legacyCallIndex > structuredCallIndex &&
    structuredClaudeCallCount >= 2,
  "structured retry happens before the legacy fallback tier is attempted",
);

// 요약 섹션 순서는 문서마다 동일하게 고정되어야 한다.
const SUMMARY_SECTION_ORDER = [
  "한 줄 요약",
  "사전 조건",
  "문서 구조",
  "핵심 요약",
  "API·설정 요약",
  "핵심 용어",
  "코드 예제 설명",
  "주의할 점",
  "버전 정보",
];

assert.ok(
  mapSource.includes("SUMMARY_SECTION_ORDER"),
  "map-claude-translation-response defines a fixed summary section order",
);

SUMMARY_SECTION_ORDER.forEach((sectionTitle) => {
  assert.ok(
    mapSource.includes(`"${sectionTitle}"`),
    `fixed summary section order includes: ${sectionTitle}`,
  );
});

[constantsSource, clientSource, promptSource, mapSource].forEach(
  (source, index) => {
    assert.doesNotMatch(
      source,
      /[�]|臾|媛|쒓|덉|뒿|땲/,
      `source ${index} must not contain mojibake text`,
    );

    assert.doesNotMatch(
      source,
      /\bgemini\b/i,
      `source ${index} must not reference the retired Gemini integration`,
    );
  },
);

console.log("summary-consistency tests passed");
