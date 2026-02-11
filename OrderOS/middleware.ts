import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/login", "/api/health", "/api/auth/login", "/api/auth/logout"]);
const COOKIE_NAME = "marmita_admin";

function isAuthed(req: NextRequest): boolean {
  const expected = process.env.APP_PASSWORD ?? "";
  if (!expected) {
    return false;
  }

  const current = req.cookies.get(COOKIE_NAME)?.value;
  return current === expected;
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }

  return pathname.startsWith("/_next") || pathname === "/favicon.ico";
}

export function middleware(req: NextRequest): NextResponse {
  try {
    const { pathname } = req.nextUrl;

    if (isPublicPath(pathname)) {
      return NextResponse.next();
    }

    if (isAuthed(req)) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error("middleware error", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
