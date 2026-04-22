/** პროდაქშენში აუცილებელია ENV; development-ში — ცარიელი env-ისთვის ფოლბექი (მხოლოდ localhost). */
const MIN_LENGTH = 24;

const LOCAL_DEV_FALLBACK =
  "carappx_admin_local_dev_only_secret_do_not_use_in_prod";

/**
 * HMAC-ისთვის გამოსაყენებელი საიდუმლო.
 * - production / preview: მხოლოდ `ADMIN_AUTH_SECRET` (მინ. MIN_LENGTH).
 * - development: თუ env არაა ან მოკლეა — ფოლბექი, რომ `npm run dev` იმუშავოს კონფიგის გარეშეც.
 */
export function resolveAdminAuthSecret(): string | null {
  const fromEnv = process.env.ADMIN_AUTH_SECRET?.trim();
  if (fromEnv && fromEnv.length >= MIN_LENGTH) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === "development") {
    return LOCAL_DEV_FALLBACK;
  }
  return null;
}

export function adminAuthSecretMinLength(): number {
  return MIN_LENGTH;
}
