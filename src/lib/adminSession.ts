import { isAdminUserId, type AdminUserId } from "./adminUsers";

const COOKIE_NAME = "carappx_admin_session";

export { COOKIE_NAME };

const encoder = new TextEncoder();

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecodeToBytes(s: string): Uint8Array {
  const pad = (4 - (s.length % 4)) % 4;
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function timingSafeEqualUtf8(a: string, b: string): boolean {
  return timingSafeEqualBytes(encoder.encode(a), encoder.encode(b));
}

async function hmacSha256Base64Url(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64UrlEncodeBytes(new Uint8Array(sig));
}

export async function createAdminSessionToken(
  userId: AdminUserId,
  secret: string,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const payload = JSON.stringify({ sub: userId, exp });
  const payloadPart = base64UrlEncodeBytes(encoder.encode(payload));
  const sig = await hmacSha256Base64Url(payloadPart, secret);
  return `${payloadPart}.${sig}`;
}

export async function verifyAdminSessionToken(
  token: string,
  secret: string,
): Promise<AdminUserId | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadPart, sig] = parts;
  if (!payloadPart || !sig) return null;
  const expectedSig = await hmacSha256Base64Url(payloadPart, secret);
  if (!timingSafeEqualUtf8(sig, expectedSig)) return null;
  let payload: { sub?: string; exp?: number };
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecodeToBytes(payloadPart))) as {
      sub?: string;
      exp?: number;
    };
  } catch {
    return null;
  }
  if (!payload.sub || typeof payload.exp !== "number") return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  const sub = payload.sub;
  if (!isAdminUserId(sub)) return null;
  return sub;
}
