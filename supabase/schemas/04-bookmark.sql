-- =============================================================
-- 04. 북마크
-- bookmark_folders, bookmarks
-- 의존성: 02-profile.sql, 03-translation.sql (documents)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.bookmark_folders
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT bookmark_folders_pkey PRIMARY KEY (id),
    CONSTRAINT bookmark_folders_user_name_unique UNIQUE (user_id, name),
    CONSTRAINT "bookmark_folders_user_id_fkey" FOREIGN KEY (user_id)
        REFERENCES public.profiles (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS bookmark_folders_user_id_idx
    ON public.bookmark_folders (user_id);

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

CREATE UNIQUE INDEX IF NOT EXISTS bookmark_folders_one_default_per_user_idx
    ON public.bookmark_folders (user_id)
    WHERE is_default = true;
