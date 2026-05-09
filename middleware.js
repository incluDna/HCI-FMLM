import { NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminToken } from "@/lib/adminAuth";

export async function middleware(request) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const expected = await getAdminToken();

  if (token === expected) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin-login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"]
};
