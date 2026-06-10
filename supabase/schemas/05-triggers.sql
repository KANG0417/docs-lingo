-- =============================================================
-- 05. 트리거
-- 의존성: 02-profile.sql
-- =============================================================

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
