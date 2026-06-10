--
-- 독스링고 전체 스키마
-- Supabase Dashboard > SQL Editor에서 전체 실행하세요. (여러 번 실행해도 안전)
-- 실행 후 Project Settings > Data API > Exposed schemas에 next_auth 추가 필요
--
-- 주의: 이전 버전에서 posts 테이블을 만들었다면 아래 주석을 해제하고 함께 실행하세요.
-- DROP TABLE IF EXISTS public.bookmarks;
-- DROP TABLE IF EXISTS public.posts;

-- =============================================================
-- 1. next_auth 스키마 (Auth.js 어댑터용 - SNS 로그인 정보 저장)
-- =============================================================

CREATE SCHEMA IF NOT EXISTS next_auth;

GRANT USAGE ON SCHEMA next_auth TO service_role;
GRANT ALL ON SCHEMA next_auth TO postgres;
-- RLS 정책에서 next_auth.uid() 함수를 호출할 수 있도록 스키마 사용 권한만 부여
-- (테이블 권한은 부여하지 않으므로 로그인 데이터는 접근 불가)
GRANT USAGE ON SCHEMA next_auth TO anon, authenticated;

CREATE TABLE IF NOT EXISTS next_auth.users
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text,
    email text,
    "emailVerified" timestamp with time zone,
    image text,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT email_unique UNIQUE (email)
);

GRANT ALL ON TABLE next_auth.users TO postgres;
GRANT ALL ON TABLE next_auth.users TO service_role;

-- RLS 정책에서 로그인한 사용자의 id를 가져오는 함수
CREATE OR REPLACE FUNCTION next_auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    SET search_path = ''
    AS $$
  select
    coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
$$;

CREATE TABLE IF NOT EXISTS next_auth.sessions
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    expires timestamp with time zone NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" uuid,
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessionToken_unique UNIQUE ("sessionToken"),
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES next_auth.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

GRANT ALL ON TABLE next_auth.sessions TO postgres;
GRANT ALL ON TABLE next_auth.sessions TO service_role;

CREATE TABLE IF NOT EXISTS next_auth.accounts
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at bigint,
    token_type text,
    scope text,
    id_token text,
    session_state text,
    oauth_token_secret text,
    oauth_token text,
    "userId" uuid,
    CONSTRAINT accounts_pkey PRIMARY KEY (id),
    CONSTRAINT provider_unique UNIQUE (provider, "providerAccountId"),
    CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES next_auth.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

GRANT ALL ON TABLE next_auth.accounts TO postgres;
GRANT ALL ON TABLE next_auth.accounts TO service_role;

CREATE TABLE IF NOT EXISTS next_auth.verification_tokens
(
    identifier text,
    token text,
    expires timestamp with time zone NOT NULL,
    CONSTRAINT verification_tokens_pkey PRIMARY KEY (token),
    CONSTRAINT token_unique UNIQUE (token),
    CONSTRAINT token_identifier_unique UNIQUE (token, identifier)
);

GRANT ALL ON TABLE next_auth.verification_tokens TO postgres;
GRANT ALL ON TABLE next_auth.verification_tokens TO service_role;

-- =============================================================
-- 2. public 스키마 (앱 데이터)
-- =============================================================

--
-- profiles: 앱 사용자 (닉네임/이미지 수정 가능)
--
CREATE TABLE IF NOT EXISTS public.profiles
(
    id uuid NOT NULL,
    nickname text NOT NULL,
    image text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id)
        REFERENCES next_auth.users (id)
        ON DELETE CASCADE
);

--
-- user_ai_settings: 사용자별 AI API 키/모델 설정
--
CREATE TABLE IF NOT EXISTS public.user_ai_settings
(
    user_id uuid NOT NULL,
    provider text NOT NULL DEFAULT 'gemini',
    api_key text,
    model text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_ai_settings_pkey PRIMARY KEY (user_id),
    CONSTRAINT user_ai_settings_provider_check CHECK (provider IN ('gemini')),
    CONSTRAINT "user_ai_settings_user_id_fkey" FOREIGN KEY (user_id)
        REFERENCES public.profiles (id)
        ON DELETE CASCADE
);

ALTER TABLE public.user_ai_settings
    ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'gemini';

ALTER TABLE public.user_ai_settings
    ADD COLUMN IF NOT EXISTS api_key text;

ALTER TABLE public.user_ai_settings
    ADD COLUMN IF NOT EXISTS model text;

ALTER TABLE public.user_ai_settings
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

--
-- profile_histories: 닉네임/이미지 변경 히스토리 (트리거로 자동 기록)
--
CREATE TABLE IF NOT EXISTS public.profile_histories
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    field text NOT NULL,
    old_value text,
    new_value text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT profile_histories_pkey PRIMARY KEY (id),
    CONSTRAINT profile_histories_field_check CHECK (field IN ('nickname', 'image')),
    CONSTRAINT "profile_histories_user_id_fkey" FOREIGN KEY (user_id)
        REFERENCES public.profiles (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS profile_histories_user_id_idx ON public.profile_histories (user_id);

--
-- documents: 번역 대상 원본 문서
-- URL 기준으로 중복 없이 1건만 존재 (같은 곳을 다시 번역해도 문서는 늘어나지 않음)
--
CREATE TABLE IF NOT EXISTS public.documents
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    url text NOT NULL,
    title text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT documents_pkey PRIMARY KEY (id),
    CONSTRAINT documents_url_unique UNIQUE (url)
);

--
-- translations: 번역 히스토리
-- 번역할 때마다 번역 결과를 기록 (같은 문서를 재번역하면 새 히스토리가 쌓임)
--
CREATE TABLE IF NOT EXISTS public.translations
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    document_id uuid NOT NULL,
    content text NOT NULL,
    original_content text,
    summary_terms jsonb NOT NULL DEFAULT '[]'::jsonb,
    source_lang text,
    target_lang text NOT NULL DEFAULT 'ko',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT translations_pkey PRIMARY KEY (id),
    CONSTRAINT "translations_user_id_fkey" FOREIGN KEY (user_id)
        REFERENCES public.profiles (id)
        ON DELETE CASCADE,
    CONSTRAINT "translations_document_id_fkey" FOREIGN KEY (document_id)
        REFERENCES public.documents (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS translations_user_id_created_at_idx
    ON public.translations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS translations_document_id_idx
    ON public.translations (document_id);

ALTER TABLE public.translations
    ADD COLUMN IF NOT EXISTS original_content text;

ALTER TABLE public.translations
    ADD COLUMN IF NOT EXISTS summary_terms jsonb NOT NULL DEFAULT '[]'::jsonb;

--
-- bookmark_folders: 북마크 분류 폴더 (같은 유저 내에서 폴더명 중복 불가)
--
CREATE TABLE IF NOT EXISTS public.bookmark_folders
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT bookmark_folders_pkey PRIMARY KEY (id),
    CONSTRAINT bookmark_folders_user_name_unique UNIQUE (user_id, name),
    CONSTRAINT "bookmark_folders_user_id_fkey" FOREIGN KEY (user_id)
        REFERENCES public.profiles (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS bookmark_folders_user_id_idx ON public.bookmark_folders (user_id);

--
-- bookmarks: 북마크 (같은 문서는 유저당 1번만 저장, 폴더로 분류)
-- folder_id가 NULL이면 기본(미분류) 상태, 폴더 삭제 시 북마크는 미분류로 이동
--
CREATE TABLE IF NOT EXISTS public.bookmarks
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    document_id uuid NOT NULL,
    folder_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT bookmarks_pkey PRIMARY KEY (id),
    CONSTRAINT bookmarks_user_document_unique UNIQUE (user_id, document_id),
    CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY (user_id)
        REFERENCES public.profiles (id)
        ON DELETE CASCADE,
    CONSTRAINT "bookmarks_document_id_fkey" FOREIGN KEY (document_id)
        REFERENCES public.documents (id)
        ON DELETE CASCADE,
    CONSTRAINT "bookmarks_folder_id_fkey" FOREIGN KEY (folder_id)
        REFERENCES public.bookmark_folders (id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON public.bookmarks (user_id);
CREATE INDEX IF NOT EXISTS bookmarks_folder_id_idx ON public.bookmarks (folder_id);

-- =============================================================
-- 3. 트리거
-- =============================================================

--
-- SNS 로그인으로 next_auth.users에 사용자가 생성되면 profiles를 자동 생성
--
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, nickname, image)
    VALUES (NEW.id, COALESCE(NEW.name, '사용자'), NEW.image)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON next_auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON next_auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

--
-- 닉네임/이미지 수정 시 변경 전후 값을 profile_histories에 자동 기록
--
CREATE OR REPLACE FUNCTION public.handle_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.nickname IS DISTINCT FROM OLD.nickname THEN
        INSERT INTO public.profile_histories (user_id, field, old_value, new_value)
        VALUES (OLD.id, 'nickname', OLD.nickname, NEW.nickname);
    END IF;

    IF NEW.image IS DISTINCT FROM OLD.image THEN
        INSERT INTO public.profile_histories (user_id, field, old_value, new_value)
        VALUES (OLD.id, 'image', OLD.image, NEW.image);
    END IF;

    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_profile_update();

-- =============================================================
-- 4. Storage (프로필 이미지)
-- =============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-images',
    'profile-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;
CREATE POLICY "Profile images are publicly accessible"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'profile-images');

-- =============================================================
-- 5. RLS (Row Level Security)
-- =============================================================

--
-- 테이블 권한 (RLS 이전에 역할별 기본 권한을 최소한으로 부여)
--
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE (nickname, image) ON public.profiles TO authenticated;
GRANT SELECT ON public.profile_histories TO authenticated;
GRANT SELECT ON public.documents TO anon, authenticated;
GRANT INSERT ON public.documents TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.translations TO authenticated;
GRANT SELECT, INSERT, UPDATE (name), DELETE ON public.bookmark_folders TO authenticated;
GRANT SELECT, INSERT, UPDATE (folder_id), DELETE ON public.bookmarks TO authenticated;

--
-- RLS 활성화
--
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmark_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;

-- profiles: 누구나 조회 가능, 본인만 수정 가능
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING ((SELECT next_auth.uid()) = id)
    WITH CHECK ((SELECT next_auth.uid()) = id);

-- profile_histories: 본인 것만 조회 가능 (기록은 트리거가 담당)
DROP POLICY IF EXISTS "Users can view own profile histories" ON public.profile_histories;
CREATE POLICY "Users can view own profile histories" ON public.profile_histories
    FOR SELECT
    TO authenticated
    USING ((SELECT next_auth.uid()) = user_id);

-- documents: 누구나 조회 가능, 로그인 유저는 등록 가능 (URL 중복은 제약조건이 차단)
DROP POLICY IF EXISTS "Documents are viewable by everyone" ON public.documents;
CREATE POLICY "Documents are viewable by everyone" ON public.documents
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.documents;
CREATE POLICY "Authenticated users can insert documents" ON public.documents
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- translations: 본인 번역 히스토리만 조회/추가/삭제 가능
DROP POLICY IF EXISTS "Users can view own translations" ON public.translations;
CREATE POLICY "Users can view own translations" ON public.translations
    FOR SELECT
    TO authenticated
    USING ((SELECT next_auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own translations" ON public.translations;
CREATE POLICY "Users can insert own translations" ON public.translations
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT next_auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own translations" ON public.translations;
CREATE POLICY "Users can delete own translations" ON public.translations
    FOR DELETE
    TO authenticated
    USING ((SELECT next_auth.uid()) = user_id);

-- bookmark_folders: 본인 폴더만 조회/생성/이름변경/삭제 가능
DROP POLICY IF EXISTS "Users can view own bookmark folders" ON public.bookmark_folders;
CREATE POLICY "Users can view own bookmark folders" ON public.bookmark_folders
    FOR SELECT
    TO authenticated
    USING ((SELECT next_auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own bookmark folders" ON public.bookmark_folders;
CREATE POLICY "Users can insert own bookmark folders" ON public.bookmark_folders
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT next_auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own bookmark folders" ON public.bookmark_folders;
CREATE POLICY "Users can update own bookmark folders" ON public.bookmark_folders
    FOR UPDATE
    TO authenticated
    USING ((SELECT next_auth.uid()) = user_id)
    WITH CHECK ((SELECT next_auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own bookmark folders" ON public.bookmark_folders;
CREATE POLICY "Users can delete own bookmark folders" ON public.bookmark_folders
    FOR DELETE
    TO authenticated
    USING ((SELECT next_auth.uid()) = user_id);

-- bookmarks: 본인 북마크만 조회/추가/폴더이동/삭제 가능
DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks
    FOR SELECT
    TO authenticated
    USING ((SELECT next_auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can insert own bookmarks" ON public.bookmarks
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT next_auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can update own bookmarks" ON public.bookmarks
    FOR UPDATE
    TO authenticated
    USING ((SELECT next_auth.uid()) = user_id)
    WITH CHECK ((SELECT next_auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks
    FOR DELETE
    TO authenticated
    USING ((SELECT next_auth.uid()) = user_id);
