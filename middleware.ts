import { NextResponse, type NextRequest } from "next/server";
// Import from @/lib/deployment-mode, NOT @/lib/tenant. tenant.ts imports
// `@/db` -> `pg` -> `node:util/types`, which the Edge Runtime cannot resolve;
// pulling it in here breaks the entire Edge bundle and 500s every request.
import { getDeploymentMode } from "@/lib/deployment-mode";
import { getSession } from "@/lib/auth";

// This middleware is the UX-layer gate — a fast redirect before render so
// unauthenticated users land on /login instead of a blank/erroring page.
// It is NOT the real security boundary: the actual enforcement is
// getTenantId() in src/lib/tenant.ts throwing when there's no verified
// session, since every data-reading Server Action/Component calls it. Never
// treat this middleware as the only safety net.
const PUBLIC_PATHS = ["/login", "/signup", "/api/health"];

export async function middleware(req: NextRequest) {
  if (getDeploymentMode() !== "multi_tenant") return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p) || pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  const session = await getSession();
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|icon.svg|manifest.webmanifest|sw.js).*)",
  ],
};
