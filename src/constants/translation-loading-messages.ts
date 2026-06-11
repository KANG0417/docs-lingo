export const URL_TRANSLATION_LOADING_MESSAGES = [
  "공식 문서를 해독하는 중입니다...",
  "영어 기술 용어를 한글로 바꾸는 중입니다...",
  "핵심 키워드를 캐내는 중입니다...",
  "백틱과 밑줄을 배치하는 중입니다...",
  "개발자 사전을 뒤지는 중입니다...",
  "AI에게 문서 숙제를 내주는 중입니다...",
  "죽은 링크는 피해 가는 중입니다...",
  "버그 없는 번역을 기도하는 중입니다...",
  "외계어 같은 API 문서를 번역하는 중입니다...",
  "문단 구조를 지키며 옮기는 중입니다...",
  "Server Component가 뭔지도 함께 고민하는 중입니다...",
  "webpack 설정은 건드리지 않는 중입니다...",
  "Stack Overflow를 열 필요 없게 만드는 중입니다...",
  "README를 실제로 읽게 만드는 중입니다...",
] as const;

export const TEXT_READING_LOADING_MESSAGES = [
  "붙여넣은 글을 해독하는 중입니다...",
  "텍스트를 정리하는 중입니다...",
  "문단을 나누는 중입니다...",
  "읽기 좋게 다듬는 중입니다...",
  "줄바꿈을 존중하는 중입니다...",
  "메모장 흔적을 지우는 중입니다...",
  "Ctrl+V의 결과를 처리하는 중입니다...",
  "긴 글도 차근차근 읽는 중입니다...",
] as const;

export const pickRandomLoadingMessage = (
  messages: readonly string[],
): string => {
  const index = Math.floor(Math.random() * messages.length);
  return messages[index] ?? messages[0] ?? "";
};
