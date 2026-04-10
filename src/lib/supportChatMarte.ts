/** Marte-თან იგივე SUPPORT_CHAT_AGENT_KEY — ჩაფიქსირებულია admin-ში; .env არ არის სავალდებო. */
const SUPPORT_CHAT_AGENT_KEY_EMBEDDED =
  "93895d70df800502145289553cd971ddc078d96ff4c71824a40a500d0ede4e01";

/** Marte API ბაზა (სერვერული როუტებისთვის) */
export function getMarteBackendBaseUrl(): string {
  const u =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.LOCAL_BACKEND_URL ||
    "https://marte-backend-production.up.railway.app";
  return u.replace(/\/$/, "");
}

function normalizeAgentKey(raw: string): string {
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/**
 * სერვერული API როუტებისთვის — ყოველთვის აბრუნებს key-ს.
 * ოფციონალური override: `SUPPORT_CHAT_AGENT_KEY` .env / Vercel-ში.
 */
export function getSupportChatAgentKey(): string {
  const fromEnv = process.env.SUPPORT_CHAT_AGENT_KEY;
  if (fromEnv?.trim()) {
    const n = normalizeAgentKey(fromEnv);
    if (n) return n;
  }
  return SUPPORT_CHAT_AGENT_KEY_EMBEDDED;
}
