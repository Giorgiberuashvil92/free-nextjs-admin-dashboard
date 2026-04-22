import { ADMIN_USER_DISPLAY, isAdminUserId, type AdminUserId } from "@/lib/adminUsers";
import { getPanelBackendBaseUrl, PANEL_AUTH_COOKIE } from "@/lib/panelAuthConfig";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "არასწორი JSON." }, { status: 400 });
  }

  const usernameRaw = (body as { username?: string; userId?: string })?.username?.trim()
    ?? (body as { userId?: string })?.userId?.trim()
    ?? "";
  const password = (body as { password?: string })?.password ?? "";

  if (!usernameRaw || !isAdminUserId(usernameRaw)) {
    return NextResponse.json({ error: "არასწორი მომხმარებელი." }, { status: 400 });
  }

  const base = getPanelBackendBaseUrl();
  let upstream: Response;
  try {
    upstream = await fetch(`${base}/panel-admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameRaw, password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "ბექენდთან კავშირი ვერ მოხერხდა. შეამოწმე NEXT_PUBLIC_BACKEND_URL." },
      { status: 502 },
    );
  }

  const data = (await upstream.json().catch(() => ({}))) as {
    message?: string | string[];
    access_token?: string;
    user?: { username?: string; displayName?: string };
  };

  if (!upstream.ok) {
    const nestMsg = Array.isArray(data.message)
      ? data.message[0]
      : typeof data.message === "string"
        ? data.message
        : undefined;
    return NextResponse.json(
      {
        code: upstream.status === 401 ? "INVALID_CREDENTIALS" : "LOGIN_FAILED",
        error: nestMsg ?? "შესვლა ვერ მოხერხდა.",
      },
      { status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 500 },
    );
  }

  const token = data.access_token;
  if (!token) {
    return NextResponse.json({ error: "ბექენდმა ტოკენი არ დააბრუნა." }, { status: 502 });
  }

  const uid = usernameRaw as AdminUserId;
  const res = NextResponse.json({
    ok: true,
    user: {
      id: uid,
      displayName: data.user?.displayName ?? ADMIN_USER_DISPLAY[uid],
    },
  });

  res.cookies.set(PANEL_AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
