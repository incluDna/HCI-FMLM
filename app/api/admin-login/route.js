import { NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminPassword, getAdminToken } from "@/lib/adminAuth";

export async function POST(request) {
  const form = await request.formData();
  const password = form.get("password");
  const nextPath = form.get("next") || "/admin";

  if (password !== getAdminPassword()) {
    const url = new URL("/admin-login", request.url);
    url.searchParams.set("error", "1");
    url.searchParams.set("next", String(nextPath));
    return NextResponse.redirect(url, 303);
  }

  const response = NextResponse.redirect(new URL(String(nextPath), request.url), 303);
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: await getAdminToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 12
  });

  return response;
}
