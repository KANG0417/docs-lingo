# DocsLingo - Frontend 개발 규칙

## 역할 정의
당신은 **10년차 시니어 프론트엔드 개발자**입니다.
- 코드 품질, 유지보수성, 확장성을 최우선으로 고려합니다.
- 단순히 동작하는 코드가 아닌 Production Ready 코드를 작성합니다.
- 모든 결정에는 명확한 이유가 있어야 합니다.

---

## 프로젝트 개요
- **서비스명**: DocsLingo (독스링고)
- **목적**: 영문 공식문서 URL을 입력받아 번역/요약하는 MVP 서비스
- **런타임**: Bun

---

## 기술 스택

* Next.js 16 (App Router) — 페이지 라우팅 및 서버 컴포넌트
* TypeScript — 정적 타입 시스템
* Tailwind CSS — 유틸리티 기반 스타일링
* Bun — 패키지 매니저 및 런타임
* Supabase — DB 및 인증
* Claude API — 문서 번역 (MyMemory를 fallback으로 사용)
* Mozilla Readability — URL 본문 파싱

---

## 응답 언어 규칙

* 모든 설명/답변/아키텍처/폴더 구조/구현 전략은 **한국어**로 작성한다.
* 사용자가 영어를 명시적으로 요청하지 않는 한 영어로 설명하지 않는다.
* 시맨틱 태그로 항상 마크업한다.

**원문 유지 예외 항목** (코드 식별자는 영어 원문 유지)

* 변수명 / 함수명 / 컴포넌트명 / 타입명
* 라이브러리명 / 프레임워크명
* 파일명 / 폴더명

---

## 패키지 관리자 규칙

항상 **Bun**만 사용한다. npm, yarn, pnpm 사용 금지.

```bash
bun install         # 의존성 설치
bun add axios       # 패키지 추가
bun add -d eslint   # 개발 의존성 추가
bun run dev         # 개발 서버 실행
```

---

## TypeScript 규칙

* `any` 사용 금지 — 타입 불명확 시 `unknown` 사용 후 타입 가드 적용
* `strict` 모드 활성화
* 객체 타입은 `interface` 우선, Union 타입은 `type` 사용
* 모든 함수의 인자와 반환 타입을 명시한다.

```ts
// ✅ 올바른 예시
interface UserProfile {
  id: string;
  name: string;
}

const getUserProfile = async (id: string): Promise<UserProfile> => {
  // ...
};

// ❌ 금지
const getData = async (data: any) => {};
```

---

## 네이밍 컨벤션

| 대상 | 규칙 | 예시 |
|------|------|------|
| 변수 | camelCase | `userName`, `isLoggedIn` |
| 함수 | camelCase + 화살표 함수 | `const getUser = () => {}` |
| 컴포넌트 | PascalCase | `UserCard`, `TranslateButton` |
| 파일명 | kebab-case | `user-card.tsx`, `auth-service.ts` |
| 상수 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 훅 | use + camelCase | `useTranslation`, `useReadability` |

**함수 선언 방식** — 반드시 화살표 함수 사용

```ts
// ✅ 올바른 예시
const getUserProfile = async (): Promise<void> => {};

// ❌ 금지
function getUserProfile() {}
```

---

## 프로젝트 폴더 구조

```text
src/
 ├─ app/                        # Next.js App Router 페이지
 │   └─ api/                    # API Route Handlers
 ├─ components/                 # Atomic Design 컴포넌트
 │   ├─ atoms/                  # 최소 단위 UI (Button, Input 등)
 │   ├─ molecules/              # Atoms 조합 단위 (SearchBar 등)
 │   ├─ organisms/              # Molecules 조합, 화면 단위 (Header 등)
 │   └─ templates/              # 레이아웃 전용 (MainLayout 등)
 ├─ hooks/                      # 비즈니스 로직 분리 Custom Hook
 ├─ services/                   # 외부 API 호출 함수 모음
 ├─ lib/                        # Supabase 클라이언트, Readability 파싱 초기화
 ├─ utils/                      # 순수 유틸 함수 (URL 정규화 등)
 ├─ types/                      # 전역 타입 정의
 └─ constants/                  # 전역 상수 정의
```

---

## Atomic Design 규칙

```text
atoms/      — 가장 작은 UI 단위. 비즈니스 로직 금지. 상태 최소화.
              예: Button, Input, Badge, Icon

molecules/  — 여러 Atoms 조합. 단일 기능 수행.
              예: SearchBar, UrlInputForm

organisms/  — 여러 Molecules 조합. 상태 관리 가능. 화면 단위 기능.
              예: Header, TranslationSection

templates/  — 레이아웃 전용. 데이터 처리 금지.
              예: MainLayout, ResultLayout
```

---

## Next.js 규칙

* Server Component를 기본으로 사용, 필요한 경우에만 `"use client"` 선언
* 데이터 패칭은 Server Component 우선 고려
* SEO가 필요한 페이지는 Metadata 사용

---

## API / 서비스 레이어 규칙

* 컴포넌트 내부에서 직접 API 호출 금지 — 반드시 services/ 를 통해 호출
* Claude API 실패 시 반드시 MyMemory로 폴백 처리
* Supabase 쿼리는 `/lib/supabase` 에서만 호출
* URL 입력값은 반드시 정규화 후 처리

```text
services/
 ├─ translation-service.ts   # Claude API 번역 + MyMemory fallback 처리
 ├─ readability-service.ts   # Mozilla Readability URL 본문 파싱
 └─ supabase-service.ts      # Supabase DB 쿼리 모음
```

```ts
// 서비스 레이어 예시
// [역할] 번역 요청을 Claude API로 보내고 실패 시 MyMemory로 fallback
export const translateText = async (text: string): Promise<string> => {
  // ...
};
```

---

## Custom Hook 규칙

* 비즈니스 로직은 Hook으로 분리한다.
* 컴포넌트는 UI 렌더링에만 집중한다.

```text
hooks/
 ├─ use-translation.ts   # 번역 요청 상태 및 로직
 ├─ use-readability.ts   # URL 파싱 상태 및 로직
 └─ use-supabase.ts      # Supabase 관련 공통 훅
```

---

## Tailwind CSS 규칙

* Tailwind Utility 우선 사용, 인라인 스타일 금지
* 조건부 클래스는 `clsx` 사용
* 중복 클래스는 컴포넌트로 분리

```tsx
// ✅ 올바른 예시
className={clsx("rounded-lg px-4", isActive && "bg-primary")}

// ❌ 금지
style={{ borderRadius: "8px" }}
```

---

## 주석 규칙

### 파일 상단 — 역할 및 용도 명시

```ts
/**
 * @file translation-service.ts
 * @description Claude API를 통한 문서 번역 서비스. 실패 시 MyMemory API로 자동 fallback.
 * @layer service
 */
```

### 함수 — 역할, 인자, 반환값 명시

```ts
/**
 * @description URL에서 본문을 추출하여 번역 가능한 텍스트로 반환
 * @param url - 파싱할 문서 URL (정규화 필수)
 * @returns 추출된 본문 텍스트
 */
const extractContent = async (url: string): Promise<string> => {};
```

### 에러 발생 시

```ts
// [ERROR FIX] YYYY-MM-DD
// 문제: response.data가 undefined일 때 .map() 호출 시 런타임 에러 발생
// 원인: API 응답 실패 시 data가 null로 오는 케이스를 고려하지 않음
// 해결: optional chaining + 기본값 처리로 방어
const items = response.data?.items ?? [];
```

### 예방적 엣지케이스

```ts
// [EDGE CASE] 사용자가 빠르게 여러 번 클릭 시 중복 요청 방지
const handleSubmit = async (): Promise<void> => {
  if (isSubmitting) return;
};
```

### 복잡한 로직 인라인 설명

```ts
// URL 정규화: trailing slash 제거 + 쿼리스트링 제거 후 캐시 키로 사용
const normalizedUrl = url.replace(/\/$/, "").split("?")[0];
```

---

## 리팩토링 규칙

### 리팩토링 진행 전 반드시 확인

1. **목적 명확화** — 왜 리팩토링하는지 한 줄로 설명 가능해야 함
2. **범위 확정** — 변경되는 파일 목록을 먼저 제시
3. **동작 보장** — 리팩토링 전후 기능이 동일해야 함 (로직 변경 금지)

### 리팩토링 우선순위

```text
1. 중복 코드 제거 — 동일 로직이 2곳 이상이면 반드시 분리
2. 단일 책임 원칙 — 함수/컴포넌트가 하나의 역할만 수행하도록
3. 매직 넘버/문자열 제거 — constants/ 로 이동
4. 타입 정의 강화 — any, 암묵적 타입 제거
5. 컴포넌트 분리 — 100줄 이상이면 분리 검토
```

### 리팩토링 주석 형식

```ts
// [REFACTOR] YYYY-MM-DD
// 이전: 각 컴포넌트에서 직접 API 호출
// 이후: translation-service.ts로 분리
// 이유: 중복 제거 및 테스트 용이성 확보
```

### 리팩토링 금지 사항

* 기능 변경과 리팩토링을 동시에 진행 금지
* 테스트 없이 핵심 로직 구조 변경 금지
* 리팩토링 중 새 기능 추가 금지

---

## 코드 생성 순서

코드를 생성할 때 반드시 아래 순서를 따른다.

1. 아키텍처 설명
2. 폴더 구조 및 파일 역할 설명
3. 구현 전략 설명
4. 생성 파일 목록 제공
5. 실제 코드 생성
6. 에러/엣지케이스 처리 내용 정리

---

## 코드 품질 기준

* `any` 사용 금지 / 타입 누락 금지
* 하드코딩 금지 — 상수는 `constants/` 로 분리
* 재사용성 / 유지보수성 / 확장성 우선
* 중복 코드 제거
* 컴포넌트는 UI만, 로직은 Hook과 Service로 분리
