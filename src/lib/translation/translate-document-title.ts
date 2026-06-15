const TITLE_PHRASE_MAP: Readonly<Record<string, string>> = {
  "getting started": "시작하기",
  "layouts and pages": "레이아웃과 페이지",
  "app router and pages router": "앱 라우터와 페이지 라우터",
  "what is next.js?": "Next.js란?",
  "what is next.js": "Next.js란?",
  "installation": "설치",
  "creating a page": "페이지 만들기",
  "creating layouts and pages": "레이아웃과 페이지 만들기",
  "server and client components": "서버·클라이언트 컴포넌트",
  "server and client composition patterns": "서버·클라이언트 구성 패턴",
  "data fetching": "데이터 페칭",
  "routing fundamentals": "라우팅 기초",
  "api reference": "API 레퍼런스",
  "guides": "가이드",
  "building your application": "애플리케이션 구축",
  "configuring": "설정",
  "deploying": "배포",
  "optimizing": "최적화",
  "layouts": "레이아웃",
  "pages": "페이지",
  "components": "컴포넌트",
  "metadata": "메타데이터",
  "internationalization": "국제화",
  "middleware": "미들웨어",
  "static assets": "정적 에셋",
  "error handling": "에러 처리",
  "lazy loading": "지연 로딩",
  "caching": "캐싱",
  "authentication": "인증",
  "streaming": "스트리밍",
  "partial prerendering": "부분 사전 렌더링",
  "upgrading": "업그레이드",
  "testing": "테스트",
  "environment variables": "환경 변수",
  "typescript": "TypeScript",
  "eslint": "ESLint",
  "fonts": "폰트",
  "css": "CSS",
  "images": "이미지",
  "videos": "동영상",
  "redirecting": "리다이렉트",
  "linking and navigating": "링크와 내비게이션",
  "project structure": "프로젝트 구조",
  "route handlers": "라우트 핸들러",
  "middleware matcher": "미들웨어 매처",
  "static generation": "정적 생성",
  "server-side rendering": "서버 사이드 렌더링",
  "client-side rendering": "클라이언트 사이드 렌더링",
};

const TITLE_WORD_MAP: Readonly<Record<string, string>> = {
  getting: "시작",
  started: "하기",
  layout: "레이아웃",
  layouts: "레이아웃",
  page: "페이지",
  pages: "페이지",
  router: "라우터",
  app: "앱",
  server: "서버",
  client: "클라이언트",
  component: "컴포넌트",
  components: "컴포넌트",
  creating: "만들기",
  building: "구축",
  configuring: "설정",
  deploying: "배포",
  optimizing: "최적화",
  routing: "라우팅",
  fundamentals: "기초",
  guide: "가이드",
  guides: "가이드",
  installation: "설치",
  metadata: "메타데이터",
  middleware: "미들웨어",
  authentication: "인증",
  caching: "캐싱",
  streaming: "스트리밍",
  testing: "테스트",
  fonts: "폰트",
  images: "이미지",
  linking: "링크",
  navigating: "내비게이션",
  structure: "구조",
  project: "프로젝트",
  data: "데이터",
  fetching: "페칭",
  your: "",
  application: "애플리케이션",
  the: "",
  a: "",
  an: "",
  and: "",
  or: "",
  of: "",
  for: "",
  with: "",
  to: "",
  in: "",
  on: "",
};

const HANGUL_PATTERN = /[가-힣]/;
const TITLE_PART_SEPARATOR_PATTERN = /\s*[:\|–—-]\s*/;

const normalizeTitleKey = (title: string): string => {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
};

const hasHangul = (text: string): boolean => {
  return HANGUL_PATTERN.test(text);
};

const joinWithKoreanAnd = (left: string, right: string): string => {
  const lastChar = left.at(-1);

  if (!lastChar) {
    return `${left} ${right}`;
  }

  if (hasHangul(lastChar)) {
    const syllableCode = lastChar.charCodeAt(0);
    const hasBatchim = (syllableCode - 0xac00) % 28 !== 0;

    return hasBatchim ? `${left}과 ${right}` : `${left}와 ${right}`;
  }

  return `${left} and ${right}`;
};

const translateWordsFallback = (segment: string): string | null => {
  const words = segment.trim().split(/\s+/);

  if (words.length === 0) {
    return null;
  }

  const translatedWords = words.map((word) => {
    const normalizedWord = word.toLowerCase().replace(/[^a-z0-9.+?]/g, "");

    if (!normalizedWord) {
      return word;
    }

    return TITLE_WORD_MAP[normalizedWord] ?? word;
  });

  const hasTranslation = translatedWords.some(
    (word, index) => word !== words[index],
  );

  if (!hasTranslation) {
    return null;
  }

  return translatedWords.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
};

const translateTitleSegment = (segment: string): string => {
  const trimmedSegment = segment.trim();

  if (!trimmedSegment || hasHangul(trimmedSegment)) {
    return trimmedSegment;
  }

  const phraseKey = normalizeTitleKey(trimmedSegment);
  const phraseMatch = TITLE_PHRASE_MAP[phraseKey];

  if (phraseMatch) {
    return phraseMatch;
  }

  const andPattern = /^(.+?)\s+and\s+(.+)$/i.exec(trimmedSegment);

  if (andPattern) {
    const leftSegment = translateTitleSegment(andPattern[1]);
    const rightSegment = translateTitleSegment(andPattern[2]);

    if (
      leftSegment !== andPattern[1].trim() ||
      rightSegment !== andPattern[2].trim()
    ) {
      return joinWithKoreanAnd(leftSegment, rightSegment);
    }
  }

  const wordFallback = translateWordsFallback(trimmedSegment);

  if (wordFallback) {
    return wordFallback;
  }

  return trimmedSegment;
};

export const translateDocumentTitle = (title: string): string => {
  const trimmedTitle = title.trim();

  if (!trimmedTitle || hasHangul(trimmedTitle)) {
    return trimmedTitle;
  }

  const fullPhraseKey = normalizeTitleKey(trimmedTitle);
  const fullPhraseMatch = TITLE_PHRASE_MAP[fullPhraseKey];

  if (fullPhraseMatch) {
    return fullPhraseMatch;
  }

  if (TITLE_PART_SEPARATOR_PATTERN.test(trimmedTitle)) {
    const parts = trimmedTitle.split(TITLE_PART_SEPARATOR_PATTERN);
    const translatedParts = parts.map(translateTitleSegment);
    const hasTranslatedPart = translatedParts.some(
      (part, index) => part !== parts[index]?.trim(),
    );

    if (hasTranslatedPart) {
      return translatedParts.join(": ");
    }
  }

  return translateTitleSegment(trimmedTitle);
};
