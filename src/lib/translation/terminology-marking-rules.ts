export const TERMINOLOGY_MARKING_RULES = `용어 표기 규칙 — 번역문에서 기술 용어는 아래 4가지로 구분합니다.
**같은 종류의 용어는 반드시 같은 방식으로 표기**하세요. 한 문서 안에서 백틱과 밑줄을 섞지 마세요.

1. 인라인 코드(백틱): **공백 없는** 단일 토큰 식별자
   - 언어·프레임워크·도구 이름: \`React\`, \`Next.js\`, \`TypeScript\`, \`HTML\`, \`CSS\`, \`webpack\`
   - 코드·설정·CLI에 그대로 입력하는 것: \`useRouter\`, \`next.config.js\`, \`npm run dev\`
   - **두 단어 이상 개념어에는 백틱을 쓰지 마세요** (예: \`App Router\` ❌)

2. 밑줄 <u></u>: **공백 있는** 2단어 이상 영어 기술 개념어
   - 예: <u>App Router</u>, <u>Pages Router</u>, <u>Server Component</u>, <u>Static Rendering</u>
   - **나란히 비교·대조되는 용어는 반드시 모두 <u>로 통일**하세요.
     - ✅ <u>App Router</u>와 <u>Pages Router</u>
     - ❌ <u>App Router</u>와 \`Pages Router\` (혼용 금지)
   - 원문 영어 표기를 유지한 채 밑줄만 적용합니다.

3. 일반 한국어로 번역: 한국어 개발 문서에서 통용되는 표현
   - 예: bundler → 번들러, compiler → 컴파일러, framework → 프레임워크, deploy → 배포
   - 백틱·밑줄 없이 일반 텍스트로 씁니다.

4. 자연스러운 문장 번역: 목차·메뉴·**섹션 제목(큰 타이틀)**·일반 명사
   - 예: Guides → 가이드, Getting Started → 시작하기, App Router and Pages Router → 앱 라우터와 페이지 라우터
   - **섹션 제목은 항상 한국어**로만 쓰고, 백틱·밑줄·코드블럭 표기를 **절대 하지 않습니다** (예: Next.js란? ✅ / \`Next.js\`란? ❌)

판단 순서 (위에서부터 적용):
1. 섹션 제목·목차·메뉴명인가? → 4번 (한국어 번역만)
2. 공백이 **없고** 코드·파일·CLI·단일 고유명사인가? → 1번 (백틱)
3. 공백이 **있고** 영어 기술 개념 이름인가? → 2번 (밑줄)
4. 한국어로 쓰는 게 자연스러운 일반 기술어인가? → 3번 (번역)
5. 원문에 이미 백틱이 있으면 유지하되, 위 규칙과 충돌하면 규칙을 우선합니다.

일관성 체크 (출력 전 필수):
- <u>App Router</u> / <u>Pages Router</u>, <u>Server Component</u> / <u>Client Component</u>처럼 **같은 패턴 용어는 표기 방식이 동일**해야 합니다.
- 공백 있는 용어가 백틱(\`...\`)으로 남아 있으면 <u>...</u>로 고치세요.
- 공백 없는 단일 식별자가 <u>...</u>로 남아 있으면 \`...\`로 고치세요.

번역 예시:
원문: "Next.js supports App Router and Pages Router. It uses React Components and webpack."
번역: "\`Next.js\`는 <u>App Router</u>와 <u>Pages Router</u>를 지원합니다. <u>React Component</u>와 \`webpack\`을 사용합니다."`;
