# 독스링고 (docs-ligo)

**독스 링고**는 영문 기술 문서를 한국어로 번역해 주는 서비스입니다.  
사실 번역만 놓고 보면 브라우저 번역으로도 충분합니다.  
그런데 공식 문서를 그렇게 읽다 보면 어디가 중요한지 모른 채 긴 글을 처음부터 읽다가 중간에 포기하게 되는 경우가 많습니다.  
그래서 독스링고는 문서를 통째로 옮기는 대신 **실무에서 자주 쓰이는 내용 위주로 추려서 번역**하고, **같이 보면 좋은 핵심 키워드를 함께 정리**해 줍니다.  
번역문을 읽으면서 자연스럽게 "**이 문서에서 뭘 가져가면 되는지**"까지 잡히는 것이 목표입니다.  

사용법은 간단합니다.  
문서 URL을 넣거나 텍스트를 붙여 넣으면 원문 구조를 유지한 번역과 키워드 요약이 나옵니다.  
더 공부하고 싶은 문서는 북마크에 모아 두고, 최근에 본 문서는 히스토리에서 다시 열 수 있습니다.

---

## 프로젝트 로드맵

| 단계 | 내용 | 기간 | 상태 |
|------|------|------|------|
| 1단계 | MVP 개발 | 2026.06.10 ~ | 진행 중 |
| 2단계 | 예외 처리 · 정책 보완 | 미정 | 예정 |
| 3단계 | 추가 기능 개발 | 미정 | 예정 |

### 1단계 — MVP 개발 (진행 중)

서비스의 뼈대를 만드는 단계입니다. "번역 + 키워드 + 학습 흐름"이라는 핵심 경험이 한 바퀴 돌아가는 것이 목표입니다.

- [x] URL / 텍스트 기반 문서 번역
- [x] Gemini API 번역 + MyMemory 폴백
- [x] 키워드 하이라이트 (코드블록 · 밑줄 · 섹션 라벨)
- [x] 번역 히스토리 (KST 기준, 같은 날 동일 문서는 update)
- [x] SNS 로그인 (Google / Kakao / Naver)
- [x] 프로필 (닉네임 · 이미지)
- [x] 북마크 폴더 · 북마크 기본 구조

### 2단계 — 예외 처리 · 정책 보완

기능이 "동작하는 것"과 "운영할 수 있는 것"은 다르다고 생각합니다. MVP가 돌아간 뒤에는 실제 사용 과정에서 생기는 엣지 케이스를 다듬습니다.

- [ ] 공식 문서가 아닌 사이트 예외 처리 (도메인 화이트리스트, 안내 메시지)
- [ ] URL 정규화 — `#` 해시, trailing slash 등을 정리해 같은 페이지를 하나로 인식
- [ ] 닉네임 변경 쿨다운(최소 3일) · 중복 방지
- [ ] API 비용 절감 정책 고도화 (번역 캐시, 빈 본문 시 호출 차단 등)

### 3단계 — 추가 기능 개발

학습 도구로서의 정체성을 강화하는 단계입니다.

- [ ] 북마크 메모 작성 · 수정 (나만의 학습 노트)
- [ ] 키워드 · 북마크 기반 복습 대시보드
- [ ] 허용/차단 도메인 관리 기능
- [ ] 번역 품질 · 캐시 전략 고도화

---

## 일반 번역과 무엇이 다른가요

| | 일반 번역 | 독스링고 |
|---|-----------|----------|
| 번역 범위 | 전체 텍스트를 통째로 | 중요 문단 · 섹션 위주로 정제 후 번역 |
| 결과물 | 번역문만 | 번역문 + 핵심 키워드 + 본문 하이라이트 |
| 읽은 후 | 읽고 끝 | 히스토리 · 북마크로 학습 흐름이 이어짐 |
| 용어 처리 | 모든 문장이 같은 무게 | API명 · 프레임워크 용어 · 설정 파일 등 현업 핵심 용어를 강조 |

한 줄로 정리하면, **영문 문서를 한국어로 바꿔 주면서 지금 당장 업무와 학습에 필요한 것만 골라 공부할 수 있게 해 주는 도구**입니다.

---

## 어떻게 동작하나요

독스링고의 번역은 단순히 텍스트를 AI에 넘기는 방식이 아니라, 여러 단계의 파이프라인을 거칩니다.

```
URL
 → HTML fetch
 → Mozilla Readability 본문 추출
 → 섹션 제목(h1/h2) 인식
 → 문단 분리
 → 중요도 필터 (AI 입력 길이 제한)
 → Gemini 번역 + 키워드 추출
 → 저장 (KST 기준 일일 중복 시 update)
```

본문 추출 단계에서 내비게이션, 광고, 푸터 같은 노이즈를 걸러내고, 중요도 필터로 핵심 문단만 AI에 전달합니다. 덕분에 번역 품질이 안정적이고 API 비용도 절약됩니다.

결과는 두 가지로 제공됩니다.

1. **번역문** — 문단과 섹션 구조를 원문 그대로 유지한 한국어 본문. 핵심 용어는 코드블록과 밑줄로 강조되어 읽으면서 바로 눈에 들어옵니다.
2. **키워드 요약** — `App Router`, `package.json`처럼 현업에서 자주 쓰이는 개념만 골라 짧은 설명과 함께 정리합니다. 목차나 메뉴에 쓰이는 일반 단어(API Reference, Overview 등)는 키워드에서 제외합니다.

---

## 주요 기능

### 문서 번역 + 핵심 키워드 추출

URL을 입력하면 본문을 추출해 번역하고, 텍스트를 붙여 넣으면 그대로 번역합니다. 링크가 걸린 섹션 제목(`h1`/`h2`)을 기준으로 문단을 구분하기 때문에 원문의 흐름이 깨지지 않습니다. 번역과 동시에 현업 핵심 키워드가 자동으로 추출되고, 본문 안에서도 백틱과 밑줄로 강조됩니다.

### 번역 히스토리

로그인하면 내가 번역한 문서들이 앨범 형태로 쌓입니다. 최근에 본 문서를 빠르게 다시 열 수 있고, 같은 날(KST 기준) 같은 문서를 다시 번역하면 새 기록을 만들지 않고 기존 기록을 갱신합니다.

### 북마크 — 학습 큐레이션

히스토리가 "지나온 길"이라면 북마크는 "다시 돌아올 곳"입니다. 더 깊게 공부하고 싶은 문서를 폴더별로 의도적으로 모아 둘 수 있습니다. 메모 작성 기능은 다음 단계에서 추가할 예정입니다.

### 인증 · 프로필

Google, Kakao, Naver 소셜 로그인을 지원합니다. 닉네임과 프로필 이미지를 변경할 수 있고, 이미지는 미리보기 후 "변경사항 저장"을 눌렀을 때 반영됩니다.

---

## 사용 기술

| 구분 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS 4 |
| Package Manager | Bun |
| Auth | NextAuth v5, Supabase Adapter |
| Database / Storage | Supabase (PostgreSQL, Storage) |
| 문서 추출 | Mozilla Readability, linkedom |
| AI | Google Gemini API |
| 폴백 번역 | MyMemory API |

---

## DB 아키텍처 (Supabase)

로컬 SQL 정의는 `supabase/schemas/` 폴더에 01~07번으로 역할별로 분리되어 있으며, Supabase 대시보드에 보이는 스키마와 동일한 구조입니다.

스키마는 세 영역으로 나뉩니다.

| 스키마 | 역할 |
|--------|------|
| `next_auth` | NextAuth 세션 · OAuth 계정 (Auth.js Adapter) |
| `public` | 프로필, 문서, 번역, 북마크 등 앱 데이터 |
| `storage` | 프로필 이미지 파일 (`profile-images` 버킷) |

### ER 다이어그램

```mermaid
erDiagram
    next_auth_users ||--o{ next_auth_sessions : has
    next_auth_users ||--o{ next_auth_accounts : has
    next_auth_users ||--|| profiles : "1:1"

    profiles ||--o{ profile_histories : logs
    profiles ||--o| user_ai_settings : optional
    profiles ||--o{ translations : owns
    profiles ||--o{ bookmark_folders : owns
    profiles ||--o{ bookmarks : owns

    documents ||--o{ translations : has
    documents ||--o{ bookmarks : referenced

    bookmark_folders ||--o{ bookmarks : contains

    next_auth_users {
        uuid id PK
        text name
        text email
        text image
    }

    profiles {
        uuid id PK,FK
        text nickname
        text image
        timestamptz created_at
        timestamptz updated_at
    }

    profile_histories {
        uuid id PK
        uuid user_id FK
        text field
        text old_value
        text new_value
        timestamptz created_at
    }

    documents {
        uuid id PK
        text url UK
        text title
        timestamptz created_at
    }

    translations {
        uuid id PK
        uuid user_id FK
        uuid document_id FK
        text content
        text original_content
        jsonb summary_terms
        text source_lang
        text target_lang
        timestamptz created_at
    }

    bookmark_folders {
        uuid id PK
        uuid user_id FK
        text name
        timestamptz created_at
    }

    bookmarks {
        uuid id PK
        uuid user_id FK
        uuid document_id FK
        uuid folder_id FK
        timestamptz created_at
    }
```

### 테이블 구성

**`next_auth` (01-auth.sql)** — Auth.js가 사용하는 영역입니다. `users`(SNS 로그인 사용자), `sessions`(세션 토큰), `accounts`(OAuth provider 연동), `verification_tokens`(이메일 인증)로 구성됩니다.

> 설치 후 **Project Settings → Data API → Exposed schemas**에 `next_auth`를 추가해야 합니다.

**`public` (02~04)** — 앱의 실제 데이터가 쌓이는 영역입니다.

| 테이블 | 설명 |
|--------|------|
| `profiles` | 앱 프로필 (닉네임 · 이미지), `users.id`와 1:1 |
| `profile_histories` | 닉네임 · 이미지 변경 이력 (트리거가 자동 기록) |
| `user_ai_settings` | 사용자별 Gemini API 키 (UI는 제거, DB만 유지) |
| `documents` | 번역 대상 문서 (`url` UNIQUE) |
| `translations` | 사용자별 번역 결과 · 원문 · 키워드(JSON) |
| `bookmark_folders` | 북마크 폴더 |
| `bookmarks` | 문서 북마크 (user + document UNIQUE) |

**트리거 (05-triggers.sql)** — 사용자가 가입하면 `profiles`가 자동 생성되고(`on_auth_user_created`), 프로필이 수정되면 변경 이력이 자동으로 기록됩니다(`on_profile_updated`).

**Storage (06-storage.sql)** — `profile-images` 버킷에 프로필 아바타를 저장합니다. (public, 5MB, jpg/png/webp/gif)

**RLS 정책 (07-rls-grants.sql)** — 데이터 접근 권한을 DB 레벨에서 통제합니다.

- `profiles`: 누구나 조회 가능, 수정은 본인만
- `translations` / `bookmarks` / `bookmark_folders`: 본인 데이터만 CRUD
- `documents`: 전체 조회 가능, 인증 사용자만 insert
- 서버 API Route는 `service_role`로 RLS를 우회해 저장을 처리

### SQL 실행 순서

```
01-auth.sql → 02-profile.sql → 03-translation.sql → 04-bookmark.sql
→ 05-triggers.sql → 06-storage.sql → 07-rls-grants.sql
```

---

## 프론트엔드 아키텍처

컴포넌트는 Atomic Design 패턴으로 구성했습니다.

```
src/
├── app/                        # App Router (페이지 · API)
│   ├── page.tsx                # 랜딩 / 로그인
│   ├── main/                   # 문서 번역 메인
│   ├── profile/                # 개인정보 변경
│   ├── bookmarks/              # 북마크
│   └── api/                    # BFF API Route
│
├── components/
│   ├── atoms/                  # Button, Avatar, Icon, Logo ...
│   ├── molecules/              # LoginForm, KeywordSummary, ProfileAvatar ...
│   ├── organisms/              # Navbar, DocReader, ProfileSection, HistoryPanel ...
│   └── templates/              # MainTemplate, DashboardTemplate
│
├── hooks/                      # useDocumentReader, useProfile, useTranslationHistory
├── services/                   # translation-service, profile-service (서버)
│                               # translation-client-service (클라이언트 fetch)
├── lib/
│   ├── document-pipeline/      # fetch → Readability → split → filter
│   ├── document-ai-processor.ts
│   ├── gemini-client.ts
│   └── auth.ts
├── types/
└── constants/
```

### 페이지 ↔ 컴포넌트 매핑

| 페이지 | Template | 주요 Organism |
|--------|----------|---------------|
| `/` | `MainTemplate` | `LoginSection`, `BrandSection` |
| `/main` | `DashboardTemplate` | `DocReaderSection`, `TranslationHistoryPanel` |
| `/profile` | `DashboardTemplate` | `ProfileSection` |
| `/bookmarks` | `DashboardTemplate` | (북마크 UI) |

### 클라이언트 / 서버 분리 원칙

역할별로 책임을 명확히 나눠서, 컴포넌트가 Supabase나 Gemini를 직접 호출하는 일이 없도록 했습니다.

| 구분 | 위치 | 역할 |
|------|------|------|
| Server Component | `app/**/page.tsx` | 세션 · 프로필 조회, SEO Metadata |
| Client Component | `components/**` (`"use client"`) | 폼 · 번역 UI · 상태 |
| Hook | `hooks/` | fetch 조합, 로딩 · 에러 상태 |
| Client Service | `*-client-service.ts` | 브라우저 → API Route 호출 |
| Server Service | `services/` | DB · AI · Storage 직접 연동 |
| API Route | `app/api/` | 인증 검증 후 Service 호출 (BFF) |

---

## 요청 흐름 (Flow)

### 1. 문서 번역 (URL)

```mermaid
sequenceDiagram
    participant U as 사용자
    participant UI as DocReaderSection
    participant H as useDocumentReader
    participant API as POST /api/documents/translate
    participant TS as translation-service
    participant DP as document-pipeline
    participant AI as Gemini / MyMemory
    participant DB as Supabase

    U->>UI: URL 입력 · 번역 요청
    UI->>H: translate(url)
    H->>API: POST { url }
    API->>TS: translateDocumentFromUrl()
    TS->>DP: fetch HTML → Readability → 문단 분리
    DP-->>TS: refinedDocument
    TS->>AI: processRefinedDocument (Gemini JSON)
    AI-->>TS: translatedContent + summaryTerms
    TS->>DB: documents upsert + translations insert/update
    DB-->>TS: 저장 결과
    TS-->>API: DocumentTranslationResult
    API-->>H: JSON 응답
    H-->>UI: 결과 상태 반영
    UI-->>U: 번역문 · 키워드 표시
```

### 2. 프로필 저장

```mermaid
sequenceDiagram
    participant U as 사용자
    participant UI as ProfileSection
    participant H as useProfile
    participant IMG as POST /api/profile/image
    participant PR as PATCH /api/profile
    participant ST as Supabase Storage
    participant DB as profiles

    U->>UI: 이미지 선택 (미리보기만)
    U->>UI: 변경사항 저장 클릭
    opt 새 이미지 있음
        UI->>H: uploadProfileImage(file)
        H->>IMG: FormData
        IMG->>ST: profile-images 버킷 업로드
        ST-->>IMG: publicUrl
    end
    UI->>H: updateProfile({ nickname, image })
    H->>PR: PATCH JSON
    PR->>DB: profiles + next_auth.users 갱신
    DB-->>PR: profile
    PR-->>UI: 성공 메시지
```

### 3. 번역 히스토리 조회

```
useTranslationHistory
  → GET /api/translations/history
  → translation-service.getTranslationHistory()
  → Supabase translations JOIN documents
  → TranslationHistoryPanel (앨범 UI)
```

### 4. 인증

```
SNS 로그인 버튼
  → NextAuth (/api/auth/[...nextauth])
  → Supabase Adapter (next_auth 스키마)
  → signIn 이벤트 → syncUserProfile()
  → 트리거 handle_new_user() → profiles 생성
```

---

## 시작하기

### 1. 의존성 설치

```bash
bun install
```

### 2. 환경 변수 (`.env.local`)

```env
# Auth
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_KAKAO_ID=
AUTH_KAKAO_SECRET=
AUTH_NAVER_ID=
AUTH_NAVER_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# AI
GEMINI_API_KEY=
```

### 3. Supabase 스키마

`supabase/schema.sql` 가이드에 따라 `schemas/01-auth.sql`부터 `07-rls-grants.sql`까지 순서대로 실행합니다. 프로필 이미지 업로드를 사용하려면 `06-storage.sql` 실행이 필요합니다.

### 4. 개발 서버

```bash
bun run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)에 접속합니다.

---

## 운영하며 고민 중인 것들

만들면서 마주친 문제들과, 2~3단계에서 풀어 가려는 방향을 기록해 둡니다.

### 공식 문서가 아닌 사이트는 어떻게 할까

블로그, 뉴스, 마케팅 페이지처럼 비공식 문서는 Readability 추출 품질이 낮거나 번역할 가치가 떨어질 수 있습니다. 우선 `nextjs.org`, `react.dev`, `developer.mozilla.org` 같은 허용 도메인 화이트리스트를 두고, 그 외 도메인은 번역 전에 안내 메시지를 보여 주는 방식으로 시작하려 합니다. 이후에는 관리자 설정이나 메타 정보 기반의 2차 판별도 검토할 예정입니다.

### 같은 페이지인데 URL이 다르게 저장되는 문제

`https://nextjs.org/docs`와 `https://nextjs.org/docs#how-to-use-the-docs`는 같은 페이지지만, 현재는 URL 문자열 전체로 비교하기 때문에 다른 문서로 저장될 수 있습니다. 저장과 중복 판별 전에 URL을 정규화해서 — 해시(`#...`) 제거, trailing slash와 `www.` 통일 — 같은 페이지는 하나로 인식하게 할 계획입니다. KST 하루 1건 정책도 정규화된 URL을 기준으로 동작하게 됩니다.

```ts
// 예시 정책
normalizeDocumentUrl("https://nextjs.org/docs#how-to-use-the-docs")
// → "https://nextjs.org/docs"
```

### 닉네임 변경 정책

닉네임을 자주 바꾸면 변경 이력과 중복 검사 부담이 커집니다. 최소 3일 간격이 지나야 변경할 수 있게 하고, `profile_histories`에 이력을 쌓으면서 중복 닉네임도 막을 계획입니다. 이후에는 부적절 닉네임 필터나 변경 횟수 제한까지 확장할 수 있습니다.

### API 비용을 어떻게 줄일까

지금도 몇 가지 장치가 들어가 있습니다. 문단 중요도 필터로 AI 입력 길이를 제한하고(`MAX_PARAGRAPHS_FOR_AI`, `MAX_AI_INPUT_LENGTH`), 같은 날 같은 문서는 insert 대신 update하고, Gemini가 실패했을 때만 MyMemory로 폴백합니다.

여기에 더해 동일 URL + 본문 해시 기준의 24시간 번역 캐시, Readability 실패나 빈 본문일 때 AI 호출 차단, 저비용 모델 우선 선택 정책 같은 것들을 검토하고 있습니다.

### 북마크 메모 수정

지금은 북마크에 남긴 메모를 나중에 수정하거나 지울 수 없습니다. `bookmarks` 테이블에 `memo` 컬럼을 추가하고, RLS로 본인만 수정·삭제할 수 있게 할 예정입니다. 북마크가 단순 저장이 아니라 "나만의 학습 노트"가 되는 것이 목표입니다.

---
