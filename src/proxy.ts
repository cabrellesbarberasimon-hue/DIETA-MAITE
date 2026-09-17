import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "dieta_maite_session";

async function getRole(request: NextRequest): Promise<"USUARIA" | "ADMIN" | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return (payload.role as "USUARIA" | "ADMIN") ?? null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = await getRole(request);

  const isAuthRoute = pathname === "/login";
  const isAdminRoute = pathname.startsWith("/admin");
  const isUsuariaRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/historial") ||
    pathname.startsWith("/peso");

  if (pathname === "/") {
    if (!role) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.redirect(new URL(role === "ADMIN" ? "/admin" : "/dashboard", request.url));
  }

  if (isAuthRoute) {
    if (role) {
      return NextResponse.redirect(new URL(role === "ADMIN" ? "/admin" : "/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isUsuariaRoute && role !== "USUARIA") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons).*)"],
};
