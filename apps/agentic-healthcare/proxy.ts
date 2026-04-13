import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "better-auth.session_token";
const SECURE_COOKIE_NAME = `__Secure-${COOKIE_NAME}`;

export function proxy(request: NextRequest) {
  const sessionCookie =
    request.cookies.get(SECURE_COOKIE_NAME)?.value ??
    request.cookies.get(COOKIE_NAME)?.value ??
    null;

  if (
    !sessionCookie &&
    request.nextUrl.pathname !== "/" &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/how-it-works") &&
    !request.nextUrl.pathname.startsWith("/api/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
