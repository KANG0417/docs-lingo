-- 기본 저장소 폴더 플래그 추가 (04-bookmark.sql 신규 설치에는 포함됨)
ALTER TABLE public.bookmark_folders
    ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS bookmark_folders_one_default_per_user_idx
    ON public.bookmark_folders (user_id)
    WHERE is_default = true;
