import {
  ADMIN_USER_DISPLAY,
  adminPasswordEnvKey,
  isAdminUserId,
  type AdminUserId,
} from "@/lib/adminUsers";
import { COOKIE_NAME, createAdminSessionToken } from "@/lib/adminSession";
import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

function safeComparePassword(input: string, expected: string | undefined): boolean {
  if (!expected) return false;
  try {
    const a = Buffer.from(input, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const secret = process.env.ADMIN_AUTH_SECRET?.trim();
  if (!secret || secret.length < 24) {
    return NextResponse.json(
      { error: "სერვერზე არ არის კონფიგურირებული ADMIN_AUTH_SECRET (მინ. 24 სიმბოლო)." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "არასწორი JSON." }, { status: 400 });
  }

  const userId = (body as { userId?: string })?.userId?.trim();
  const password = (body as { password?: string })?.password ?? "";

  if (!userId || !isAdminUserId(userId)) {
    return NextResponse.json({ error: "არასწორი მომხმარებელი." }, { status: 400 });
  }

  const envKey = adminPasswordEnvKey(userId as AdminUserId);
  const expected = process.env[envKey]?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: `სერვერზე არ არის დაყენებული ${envKey}.` },
      { status: 500 },
    );
  }

  if (!safeComparePassword(password, expected)) {
    return NextResponse.json({ error: "არასწორი პაროლი." }, { status: 401 });
  }

  const token = await createAdminSessionToken(userId as AdminUserId, secret);
  const res = NextResponse.json({
    ok: true,
    user: { id: userId, displayName: ADMIN_USER_DISPLAY[userId as AdminUserId] },
  });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
