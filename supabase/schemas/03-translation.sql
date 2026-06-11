-- =============================================================
-- 03. 문서 / 번역 히스토리
-- documents, translations
-- 의존성: 02-profile.sql
-- =============================================================

CREATE TABLE IF NOT EXISTS public.documents
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    url text NOT NULL,
    title text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT documents_pkey PRIMARY KEY (id),
    CONSTRAINT documents_url_unique UNIQUE (url)
);

CREATE TABLE IF NOT EXISTS public.translations
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    document_id uuid NOT NULL,
    content text NOT NULL,
    original_content text,
    summary_terms jsonb NOT NULL DEFAULT '[]'::jsonb,
    document_images jsonb NOT NULL DEFAULT '[]'::jsonb,
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

-- 기존 DB 마이그레이션 (신규 설치 시에도 안전)
ALTER TABLE public.translations
    ADD COLUMN IF NOT EXISTS original_content text;

ALTER TABLE public.translations
    ADD COLUMN IF NOT EXISTS summary_terms jsonb;

UPDATE public.translations
SET summary_terms = '[]'::jsonb
WHERE summary_terms IS NULL;

ALTER TABLE public.translations
    ALTER COLUMN summary_terms SET DEFAULT '[]'::jsonb;

ALTER TABLE public.translations
    ALTER COLUMN summary_terms SET NOT NULL;

ALTER TABLE public.translations
    ADD COLUMN IF NOT EXISTS document_images jsonb;

UPDATE public.translations
SET document_images = '[]'::jsonb
WHERE document_images IS NULL;

ALTER TABLE public.translations
    ALTER COLUMN document_images SET DEFAULT '[]'::jsonb;

ALTER TABLE public.translations
    ALTER COLUMN document_images SET NOT NULL;

ALTER TABLE public.translations
    ADD COLUMN IF NOT EXISTS document_code_blocks jsonb;

UPDATE public.translations
SET document_code_blocks = '[]'::jsonb
WHERE document_code_blocks IS NULL;

ALTER TABLE public.translations
    ALTER COLUMN document_code_blocks SET DEFAULT '[]'::jsonb;

ALTER TABLE public.translations
    ALTER COLUMN document_code_blocks SET NOT NULL;
