/** httpOnly ქუქია — JWT (ბექენდის `panel-admin/login` პასუხი). */
export const PANEL_AUTH_COOKIE = "carappx_panel_token";

export function getPanelBackendBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (u) {
    return u.replace(/\/+$/, "");
  }
  return "https://marte-backend-production.up.railway.app";
}
