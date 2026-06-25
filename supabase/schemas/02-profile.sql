-- =============================================================
-- 02. 프로필
-- profiles, profile_histories, user_ai_settings
-- 의존성: 01-auth.sql
-- =============================================================

CREATE TABLE IF NOT EXISTS public.profiles
(
    id uuid NOT NULL,
    nickname text NOT NULL,
    image text,
    withdrawal_scheduled_at timestamp with time zone,
    session_version integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id)
        REFERENCES next_auth.users (id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.user_ai_settings
(
    user_id uuid NOT NULL,
    provider text NOT NULL DEFAULT 'claude',
    api_key text,
    model text DEFAULT 'auto',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_ai_settings_pkey PRIMARY KEY (user_id),
    CONSTRAINT user_ai_settings_provider_check CHECK (provider IN ('claude')),
    CONSTRAINT "user_ai_settings_user_id_fkey" FOREIGN KEY (user_id)
        REFERENCES public.profiles (id)
        ON DELETE CASCADE
);

-- Gemini -> Claude 전환: 기존 행의 provider 값을 갱신하고 제약을 다시 건다
UPDATE public.user_ai_settings
SET provider = 'claude'
WHERE provider = 'gemini';

ALTER TABLE public.user_ai_settings
    DROP CONSTRAINT IF EXISTS user_ai_settings_provider_check;

ALTER TABLE public.user_ai_settings
    ADD CONSTRAINT user_ai_settings_provider_check CHECK (provider IN ('claude'));

ALTER TABLE public.user_ai_settings
    ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'claude';

ALTER TABLE public.user_ai_settings
    ADD COLUMN IF NOT EXISTS api_key text;

ALTER TABLE public.user_ai_settings
    ADD COLUMN IF NOT EXISTS model text DEFAULT 'auto';

ALTER TABLE public.user_ai_settings
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;

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

CREATE INDEX IF NOT EXISTS profile_histories_user_id_idx
    ON public.profile_histories (user_id);

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS withdrawal_scheduled_at timestamp with time zone;
