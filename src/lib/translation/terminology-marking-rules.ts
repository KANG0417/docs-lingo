export const TERMINOLOGY_MARKING_RULES = `용어 표기 규칙 — 번역문에서 기술 용어는 아래 4가지로 구분합니다:

1. 인라인 코드(백틱): 한 단어로 된 기술/언어/도구의 고유 이름
   - 예: \`React\`, \`Next.js\`, \`TypeScript\`, \`HTML\`, \`CSS\`
   - 코드에 실제 입력되는 식별자도 포함 (단어 수 무관): \`useRouter\`, \`next.config.js\`, \`npm run dev\`

2. 밑줄 <u></u>: 두 단어 이상으로 이루어진 기술 개념어
   - 예: <u>React Component</u>, <u>App Router</u>, <u>Server Component</u>, <u>Static Rendering</u>
   - 원문 영어 표기를 유지한 채 밑줄 처리합니다

3. 일반 한국어로 번역: 한국어에서 이미 통용되는 기술 표현 (외래어 표기)
   - 예: bundler → 번들러, compiler → 컴파일러, framework → 프레임워크,
     library → 라이브러리, deploy → 배포
   - 백틱·밑줄 등 아무 표시도 하지 않습니다

4. 자연스러운 문장 번역: 목차·메뉴·일반 명사 (기술 개념이 아닌 것)
   - 예: Guides → 가이드, Getting Started → 시작하기, Overview → 개요,
     API Reference → API 레퍼런스
   - 아무 표시도 하지 않습니다

판단 기준:
- 코드에 그대로 타이핑하는 것인가? → 1번 (백틱)
- 고유한 기술 개념의 이름인가? 두 단어 이상인가? → 2번 (밑줄)
- 한국어 개발 문서에서 한글로 쓰는 게 자연스러운가? → 3번 (번역)
- 문서의 목차/섹션 제목인가? → 4번 (번역만)
- 원문에 이미 백틱이 있으면 유지하고, 위 규칙 외에 새로 추가하지 않습니다

번역 예시:
원문: "Next.js is a React framework. It uses React Components and configures bundlers like webpack automatically. See the Guides section."
번역: "\`Next.js\`는 \`React\` 프레임워크입니다. <u>React Component</u>를 사용하며, \`webpack\` 같은 번들러를 자동으로 구성합니다. 가이드 섹션을 참고하세요."`;
