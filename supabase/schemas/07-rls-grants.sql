-- =============================================================
-- 07. 권한 / RLS
-- 의존성: 02~04 스키마 파일
-- =============================================================

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE (nickname, image) ON public.profiles TO authenticated;
GRANT SELECT ON public.profile_histories TO authenticated;
GRANT SELECT ON public.documents TO anon, authenticated;
GRANT INSERT ON public.documents TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.translations TO authenticated;
GRANT SELECT, INSERT, UPDATE (name, sort_order, is_default), DELETE ON public.bookmark_folders TO authenticated;
GRANT SELECT, INSERT, UPDATE (folder_id), DELETE ON public.bookmarks TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmark_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Users can view own profile histories" ON public.profile_histories;
CREATE POLICY "Users can view own profile histories" ON public.profile_histories
    FOR SELECT
    TO authenticated
    USING ((SELECT next_auth.uid()) = user_id);

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

NOTIFY pgrst, 'reload schema';
