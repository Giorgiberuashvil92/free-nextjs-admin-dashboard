/** Marte API ბაზა (სერვერული როუტებისთვის) */
export function getMarteBackendBaseUrl(): string {
  const u =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.LOCAL_BACKEND_URL ||
    "https://marte-backend-production.up.railway.app";
  return u.replace(/\/$/, "");
}

/** სერვერული როუტებისთვის: თუ null — env არ არის დაყენებული */
export function getSupportChatAgentKeyOrNull(): string | null {
  const raw = process.env.SUPPORT_CHAT_AGENT_KEY;
  if (!raw?.trim()) return null;
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s || null;
}

/** UI/API ტექსტი — როცა key აკლია */
export const SUPPORT_CHAT_AGENT_KEY_MISSING_MESSAGE =
  "SUPPORT_CHAT_AGENT_KEY არ არის ჩასმული. ლოკალურად: free-nextjs-admin-dashboard/.env.local ფაილში ჩაწერე იგივე მნიშვნელობა, რაც marte-backend/.env-ში SUPPORT_CHAT_AGENT_KEY. პროდაქშენში: Vercel → Project → Settings → Environment Variables. შაბლონი: .env.example";
