import { ADMIN_USER_DISPLAY } from "@/lib/adminUsers";
import { COOKIE_NAME, verifyAdminSessionToken } from "@/lib/adminSession";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const secret = process.env.ADMIN_AUTH_SECRET?.trim();
  if (!secret || secret.length < 24) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const userId = await verifyAdminSessionToken(token, secret);
  if (!userId) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: { id: userId, displayName: ADMIN_USER_DISPLAY[userId] },
  });
}
