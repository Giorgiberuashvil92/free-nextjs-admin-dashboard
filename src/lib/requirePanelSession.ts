import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PANEL_AUTH_COOKIE } from "./panelAuthConfig";
import { verifyPanelSessionWithBackend } from "./verifyPanelSession";

/** API route handlers-ისთვის — ქუქიით JWT-ის ბექენდზე შემოწმება. */
export async function requirePanelSession(
  request: NextRequest,
): Promise<NextResponse | null> {
  const token = request.cookies.get(PANEL_AUTH_COOKIE)?.value;
  const ok = await verifyPanelSessionWithBackend(token);
  if (!ok) {
    return NextResponse.json({ error: "ავტორიზაცია საჭიროა." }, { status: 401 });
  }
  return null;
}
