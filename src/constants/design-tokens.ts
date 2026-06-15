/** 독스링고 디자인 토큰 — Figma·코드 공통 기준 */

export interface DocsLigoFontToken {
  displayName: string;
  fileName: string;
  cssVariable: string;
  classNames: readonly string[];
  usage: string;
  figmaFallback: string;
}

export interface DocsLigoColorToken {
  hex: string;
  usage: string;
}

export const DOCS_LINGO_FONTS = {
  title: {
    displayName: "Establish Retrosans",
    fileName: "establish Retrosans.ttf",
    cssVariable: "--font-doc-title",
    classNames: ["font-doc-title", "font-doc-aux"],
    usage: "페이지 타이틀, 보조 문구, 버튼, 캘린더 월/요일 라벨",
    figmaFallback: "Inter",
  },
  body: {
    displayName: "116watermelon",
    fileName: "116watermelon.ttf",
    cssVariable: "--font-doc-body",
    classNames: ["font-doc-body", "font-doc-nickname", "font-doc-popup"],
    usage: "본문 입력, 닉네임, 팝업·드롭다운 메뉴",
    figmaFallback: "Inter",
  },
  translation: {
    displayName: "Binggrae2",
    fileName: "Binggrae2.ttf",
    cssVariable: "--font-doc-translation",
    classNames: ["font-doc-translation"],
    usage: "번역 결과 본문, 메모 목록, 공식 문서 안내",
    figmaFallback: "Inter",
  },
  translationBold: {
    displayName: "Binggrae2 Bold",
    fileName: "Binggrae2-Bold.ttf",
    cssVariable: "--font-doc-translation-bold",
    classNames: ["font-doc-translation-bold"],
    usage: "번역 제목, 강조, 메모 항목 제목, 섹션 헤딩",
    figmaFallback: "Inter Bold",
  },
} as const satisfies Record<string, DocsLigoFontToken>;

export const DOCS_LINGO_COLORS = {
  space: {
    deep: { hex: "#070b22", usage: "우주 배경 베이스" },
    base: { hex: "#0a1030", usage: "네비·CTA·선택일·공식 문서 안내 배경" },
    hover: { hex: "#141c4a", usage: "버튼 hover, 선택일 hover" },
    gradientEnd: { hex: "#0b0f2e", usage: "배경 그라데이션 하단" },
    panelTint: { hex: "#1e1b4b", usage: "프로필 저장 버튼 그라데이션" },
  },
  indigo: {
    text: { hex: "#c7d2fe", usage: "네비 닉네임, 서브타이틀 (indigo-200 계열)" },
    textMuted: { hex: "#a5b4fc", usage: "별·글로우 포인트" },
    accent: { hex: "#6366f1", usage: "링크, 포커스 ring, 아바타 placeholder" },
    deep: { hex: "#312e81", usage: "오늘 날짜, 키워드 강조" },
    border: { hex: "#c7d2fe", usage: "히스토리 사이드바 테두리 (28% opacity)" },
  },
  memo: {
    paper: { hex: "#fffbeb", usage: "메모지 배경 (amber-50)" },
    tab: { hex: "#fef3c7", usage: "탭 트랙, 폴더 존 (amber-100)" },
    border: { hex: "#fde68a", usage: "메모 테두리, 점선 (amber-200)" },
    line: { hex: "rgba(120, 90, 20, 0.16)", usage: "메모 줄무늬" },
  },
  amber: {
    textStrong: { hex: "#451a03", usage: "메모 헤더 타이틀 (amber-950)" },
    text: { hex: "#92400e", usage: "메모 본문·메타 (amber-800)" },
    textSoft: { hex: "#78350f", usage: "플레이스홀더, 토요일" },
    highlight: { hex: "#fde68a", usage: "공식 문서 강조, 토요일(사이드바)" },
  },
  calendar: {
    sunday: { hex: "#991b1b", usage: "일요일·공휴일 (메인)" },
    sundaySidebar: { hex: "#ef4444", usage: "일요일·공휴일 (히스토리 사이드바)" },
    saturday: { hex: "#78350f", usage: "토요일 (메인)" },
    saturdaySidebar: { hex: "#fde68a", usage: "토요일 (히스토리 사이드바)" },
    caption: { hex: "#fef3c7", usage: "캘린더 월 라벨 (96% opacity)" },
    weekday: { hex: "#e2e8f0", usage: "요일 헤더 (78% opacity)" },
    glassBg: { hex: "rgba(255, 255, 255, 0.06)", usage: "캘린더 글래스 배경" },
    navText: { hex: "#fef3c7", usage: "‹ › 네비게이션" },
  },
  content: {
    body: { hex: "#18181b", usage: "번역 본문 (zinc-900)" },
    white: { hex: "#ffffff", usage: "히어로 타이틀, 버튼 텍스트 on navy" },
    buttonText: { hex: "#e0e7ff", usage: "navy 버튼 라벨 (indigo-100)" },
  },
  semantic: {
    error: { hex: "#dc2626", usage: "에러, 로그아웃" },
    errorSoft: { hex: "#991b1b", usage: "일요일 텍스트와 동일 계열" },
    success: { hex: "#059669", usage: "저장 성공 (emerald)" },
  },
  keyword: {
    chipBg: { hex: "#eef2ff", usage: "키워드 칩 배경 (indigo-50)" },
    chipText: { hex: "#312e81", usage: "키워드 칩 텍스트 (indigo-900)" },
  },
} as const satisfies Record<string, Record<string, DocsLigoColorToken>>;

export interface MainPageColorSlot {
  id: string;
  label: string;
  hex: string;
  tailwind?: string;
  usage: string;
}

export interface MainPageColorSection {
  title: string;
  slots: readonly MainPageColorSlot[];
}

/** `/main` 문서 읽기 화면 — 영역별 실제 사용 색상 */
export const DOCS_LINGO_MAIN_PAGE_COLORS = {
  pageBackground: {
    title: "페이지 배경",
    slots: [
      {
        id: "space-bg-base",
        label: "우주 배경",
        hex: "#070B22",
        usage: "DashboardTemplate · space-bg 베이스",
      },
      {
        id: "space-bg-gradient-mid",
        label: "배경 그라데이션 중간",
        hex: "#0A1030",
        usage: "space-bg linear-gradient 0%",
      },
      {
        id: "space-bg-gradient-end",
        label: "배경 그라데이션 하단",
        hex: "#0B0F2E",
        usage: "space-bg linear-gradient 100%",
      },
    ],
  },
  hero: {
    title: "히어로 헤더",
    slots: [
      {
        id: "hero-title",
        label: "메인 타이틀",
        hex: "#FFFFFF",
        tailwind: "text-white",
        usage: "「오늘은 어떤 문서를 읽을까요?」· font-doc-title",
      },
      {
        id: "hero-subtitle",
        label: "서브타이틀",
        hex: "#C7D2FE",
        tailwind: "text-indigo-200/70",
        usage: "안내 문구 · font-doc-aux",
      },
    ],
  },
  memoInputCard: {
    title: "메모 입력 카드",
    slots: [
      {
        id: "memo-tape",
        label: "상단 테이프",
        hex: "#C7D2FE",
        tailwind: "bg-indigo-200/40",
        usage: "메모 상단 테이프 · 40% opacity",
      },
      {
        id: "memo-paper",
        label: "메모지 배경",
        hex: "#FFFBEB",
        tailwind: "bg-amber-50",
        usage: "입력·결과 메모 카드 배경",
      },
      {
        id: "memo-border",
        label: "메모 테두리",
        hex: "#FDE68A",
        tailwind: "border-amber-200",
        usage: "메모 카드 외곽선",
      },
      {
        id: "memo-line",
        label: "줄무늬",
        hex: "#785A14",
        usage: "memo-lines · rgba(120,90,20,0.16)",
      },
      {
        id: "memo-shadow",
        label: "카드 그림자",
        hex: "#000000",
        usage: "shadow · rgba(0,0,0,0.45)",
      },
    ],
  },
  inputTabs: {
    title: "입력 탭",
    slots: [
      {
        id: "tab-track",
        label: "탭 트랙",
        hex: "#FEF3C7",
        tailwind: "bg-amber-100/80",
        usage: "URL/텍스트 탭 배경",
      },
      {
        id: "tab-active-bg",
        label: "선택 탭 배경",
        hex: "#0A1030",
        usage: "활성 탭 · border·ring 동일",
      },
      {
        id: "tab-active-text",
        label: "선택 탭 텍스트",
        hex: "#E0E7FF",
        tailwind: "text-indigo-100",
        usage: "활성 탭 라벨",
      },
      {
        id: "tab-inactive-text",
        label: "비선택 탭 텍스트",
        hex: "#92400E",
        tailwind: "text-amber-800/70",
        usage: "비활성 탭 라벨",
      },
    ],
  },
  formField: {
    title: "입력 필드",
    slots: [
      {
        id: "field-border",
        label: "점선 테두리",
        hex: "#0A1030",
        usage: "URL/텍스트 입력 border-dashed",
      },
      {
        id: "field-bg",
        label: "입력 배경",
        hex: "#FFFFFF",
        tailwind: "bg-white/80",
        usage: "입력 필드 · 80% opacity",
      },
      {
        id: "field-text",
        label: "입력 텍스트",
        hex: "#18181B",
        tailwind: "text-zinc-900",
        usage: "입력값 · font-doc-body",
      },
      {
        id: "field-placeholder",
        label: "플레이스홀더",
        hex: "#B45309",
        tailwind: "placeholder:text-amber-700/40",
        usage: "placeholder · 40% opacity",
      },
      {
        id: "field-focus-ring",
        label: "포커스 링",
        hex: "#C7D2FE",
        tailwind: "ring-indigo-200",
        usage: "focus ring",
      },
    ],
  },
  primaryButton: {
    title: "번역하기 버튼",
    slots: [
      {
        id: "btn-bg",
        label: "버튼 배경",
        hex: "#0A1030",
        usage: "primary CTA",
      },
      {
        id: "btn-hover",
        label: "버튼 hover",
        hex: "#141C4A",
        usage: "hover:bg",
      },
      {
        id: "btn-text",
        label: "버튼 텍스트",
        hex: "#E0E7FF",
        tailwind: "text-indigo-100",
        usage: "CTA 라벨",
      },
      {
        id: "btn-disabled",
        label: "버튼 disabled",
        hex: "#0A1030",
        usage: "disabled · 40% opacity",
      },
    ],
  },
  officialNotice: {
    title: "공식 문서 안내",
    slots: [
      {
        id: "notice-bg",
        label: "안내 배경",
        hex: "#0A1030",
        usage: "OfficialDocumentNotice",
      },
      {
        id: "notice-border",
        label: "안내 테두리",
        hex: "#818CF8",
        tailwind: "border-indigo-400/25",
        usage: "25% opacity",
      },
      {
        id: "notice-text",
        label: "본문",
        hex: "#FFFFFF",
        usage: "안내 문장",
      },
      {
        id: "notice-highlight",
        label: "강조",
        hex: "#FDE68A",
        usage: "공식 문서만 · npm · PyPI 등",
      },
    ],
  },
  historySidebar: {
    title: "번역 히스토리 사이드바",
    slots: [
      {
        id: "sidebar-panel-bg",
        label: "패널 배경",
        hex: "#0A1030",
        usage: "history-sidebar-panel · rgba(10,16,48,0.18)",
      },
      {
        id: "sidebar-border",
        label: "패널 테두리",
        hex: "#C7D2FE",
        usage: "indigo border · 28% opacity",
      },
      {
        id: "sidebar-title",
        label: "패널 타이틀",
        hex: "#FEF3C7",
        usage: "「번역 히스토리」· 96% opacity",
      },
      {
        id: "sidebar-label",
        label: "날짜 선택 라벨",
        hex: "#E2E8F0",
        usage: "font-doc-aux · 82% opacity",
      },
      {
        id: "sidebar-list-bg",
        label: "목록 배경",
        hex: "#FFFBEB",
        usage: "history-memo-list · amber 메모지",
      },
      {
        id: "sidebar-margin-line",
        label: "왼쪽 여백선",
        hex: "#EF4444",
        usage: "history-memo-margin · 28% opacity",
      },
      {
        id: "sidebar-tape-violet",
        label: "테이프 (좌)",
        hex: "#DDD6FE",
        tailwind: "bg-violet-200/40",
        usage: "사이드바 좌측 테이프",
      },
      {
        id: "sidebar-tape-indigo",
        label: "테이프 (우)",
        hex: "#C7D2FE",
        tailwind: "bg-indigo-200/40",
        usage: "사이드바 우측 테이프",
      },
    ],
  },
  translationResult: {
    title: "번역 결과 카드",
    slots: [
      {
        id: "result-tape-violet",
        label: "테이프 (좌)",
        hex: "#DDD6FE",
        tailwind: "bg-violet-200/40",
        usage: "결과 메모 좌측",
      },
      {
        id: "result-tape-indigo",
        label: "테이프 (우)",
        hex: "#C7D2FE",
        tailwind: "bg-indigo-200/40",
        usage: "결과 메모 우측",
      },
      {
        id: "result-section-border",
        label: "섹션 구분선",
        hex: "#FCD34D",
        tailwind: "border-amber-300",
        usage: "header·키워드 구분 dashed",
      },
      {
        id: "result-heading",
        label: "섹션 제목",
        hex: "#78350F",
        tailwind: "text-amber-900",
        usage: "핵심 키워드·번역 결과",
      },
      {
        id: "result-title",
        label: "문서 제목",
        hex: "#18181B",
        tailwind: "text-zinc-900",
        usage: "font-doc-translation-bold",
      },
    ],
  },
  semantic: {
    title: "상태 색",
    slots: [
      {
        id: "error-bg",
        label: "에러 배경",
        hex: "#FEF2F2",
        tailwind: "bg-red-50",
        usage: "일반 에러 alert",
      },
      {
        id: "error-text",
        label: "에러 텍스트",
        hex: "#DC2626",
        tailwind: "text-red-600",
        usage: "에러 메시지",
      },
      {
        id: "loading-bar",
        label: "로딩 바",
        hex: "#6366F1",
        tailwind: "text-indigo-600",
        usage: "LoadingBar",
      },
    ],
  },
} as const satisfies Record<string, MainPageColorSection>;

export const DOCS_LINGO_MAIN_PAGE_COLOR_SECTIONS = Object.values(
  DOCS_LINGO_MAIN_PAGE_COLORS,
);

export const DOCS_LINGO_FIGMA_FILE_KEY = "RRmFjmlMoB1b0qUQQudCRx";

export const DOCS_LINGO_FIGMA_FILE_URL =
  "https://www.figma.com/design/RRmFjmlMoB1b0qUQQudCRx/Docs-Lingo-UI";

/** Figma MCP `use_figma`에 붙여넣을 일괄 동기화 스크립트 */
export const DOCS_LINGO_FIGMA_SYNC_SCRIPT_PATH =
  "scripts/figma-sync-all.js";
