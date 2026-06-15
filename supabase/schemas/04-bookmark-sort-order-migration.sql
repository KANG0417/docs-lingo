-- 기존 DB에 sort_order 컬럼 추가 (04-bookmark.sql 신규 설치에는 포함됨)
ALTER TABLE public.bookmark_folders
    ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
