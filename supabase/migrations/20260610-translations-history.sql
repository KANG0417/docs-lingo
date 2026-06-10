-- =============================================================
-- 마이그레이션: 번역 히스토리 컬럼 추가 (변경분만)
-- 기존 DB에 이미 schema가 있다면 이 파일만 실행하세요.
-- =============================================================

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

CREATE INDEX IF NOT EXISTS translations_user_id_created_at_idx
    ON public.translations (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS translations_document_id_idx
    ON public.translations (document_id);

NOTIFY pgrst, 'reload schema';
