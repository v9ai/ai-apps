import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/agent-\d+-(.+)$/);
  if (match) {
    const url = request.nextUrl.clone();
    url.pathname = `/${match[1]}`;
    return NextResponse.redirect(url, 301);
  }
}

export const config = {
  matcher: "/agent-:path*",
};
