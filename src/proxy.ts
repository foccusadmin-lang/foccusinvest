import { NextResponse } from "next/server";
import { auth } from "@/auth";

const ADMIN_PREFIX = "/restrito";
const PROTECTED_PREFIXES = ["/painel", "/onboarding", ADMIN_PREFIX];
const ONBOARDING_PATH = "/onboarding/cadastro";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith(ADMIN_PREFIX) && pathname !== ADMIN_PREFIX) {
    if (session.user.perfil !== "ADMIN") {
      return NextResponse.redirect(new URL("/painel", req.nextUrl));
    }
  }

  if (
    pathname.startsWith("/painel") &&
    session.user.statusCadastro === "INCOMPLETO" &&
    pathname !== ONBOARDING_PATH
  ) {
    return NextResponse.redirect(new URL(ONBOARDING_PATH, req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp)$).*)"],
};
