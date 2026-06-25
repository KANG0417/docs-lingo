export const AUTH_SIGNOUT_PATH = "/api/auth/signout";

export const AUTH_FORCE_SIGNOUT_PATH = "/api/auth/force-signout";

export const POST_LOGIN_REDIRECT = "/main";

/** JWT maxAge upper bound. The custom sessionExpiresAt controls the real logout time. */
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;
