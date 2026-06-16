import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

const PUBLIC_API = /^\/api\/auth\//;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");
  const isDashboard = pathname.startsWith("/dashboard");

  if (!isApiRoute && !isDashboard) return NextResponse.next();
  if (isApiRoute && PUBLIC_API.test(pathname)) return NextResponse.next();

  const token = getTokenFromRequest(req);

  if (!token) {
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await verifyToken(token);
    return NextResponse.next();
  } catch {
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set("token", "", { maxAge: 0, path: "/" });
    return res;
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
