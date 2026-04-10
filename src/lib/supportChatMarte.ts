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
  const raw = '93895d70df800502145289553cd971ddc078d96ff4c71824a40a500d0ede4e01';
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
