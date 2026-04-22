import { ADMIN_USER_DISPLAY, isAdminUserId, type AdminUserId } from "@/lib/adminUsers";
import { getPanelBackendBaseUrl, PANEL_AUTH_COOKIE } from "@/lib/panelAuthConfig";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PANEL_AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const base = getPanelBackendBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${base}/panel-admin/session`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  if (!res.ok) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const data = (await res.json().catch(() => ({}))) as {
    user?: { username?: string; displayName?: string };
  };
  const u = data.user?.username?.trim();
  if (!u || !isAdminUserId(u)) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const id = u as AdminUserId;
  return NextResponse.json({
    user: {
      id,
      displayName: data.user?.displayName ?? ADMIN_USER_DISPLAY[id],
    },
  });
}
