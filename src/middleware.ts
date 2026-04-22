import { resolveAdminAuthSecret } from "@/lib/adminAuthSecret";
import { COOKIE_NAME, verifyAdminSessionToken } from "@/lib/adminSession";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/admin/signin") return true;
  if (pathname === "/signin" || pathname === "/signup") return true;
  if (pathname === "/error-404") return true;
  if (pathname.startsWith("/api/admin/auth/login")) return true;
  if (pathname.startsWith("/api/admin/auth/logout")) return true;
  if (pathname.startsWith("/api/admin/auth/me")) return true;
  return false;
}

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/i.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const secret = resolveAdminAuthSecret();
  if (!secret) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "ადმინის ავტორიზაცია არ არის კონფიგურირებული." },
        { status: 503 },
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/signin";
    url.searchParams.set("misconfigured", "1");
    return NextResponse.redirect(url);
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const userId = token ? await verifyAdminSessionToken(token, secret) : null;

  if (userId) {
    if (pathname === "/admin/signin") {
      const from = request.nextUrl.searchParams.get("from");
      if (from && from.startsWith("/") && !from.startsWith("//")) {
        return NextResponse.redirect(new URL(from, request.nextUrl.origin));
      }
      return NextResponse.redirect(new URL("/", request.nextUrl.origin));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "ავტორიზაცია საჭიროა." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/admin/signin";
  const from = `${pathname}${request.nextUrl.search}`;
  if (from && from !== "/admin/signin") {
    url.searchParams.set("from", from);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
