import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "moni_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = {
  userId: string;
  tenantId: string;
  email: string;
};

/**
 * Throws a clear, loud error if AUTH_SECRET is missing instead of silently
 * signing/verifying with an empty key. Call this before touching the secret
 * anywhere it's used (createSession, getSession).
 */
export function requireAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET environment variable is required when DEPLOYMENT_MODE=multi_tenant"
    );
  }
  return secret;
}

function getSigningKey(): Uint8Array {
  return new TextEncoder().encode(requireAuthSecret());
}

/**
 * Signs a session JWT and sets it as an httpOnly cookie. Must be called from
 * a Server Action or Route Handler (anywhere Next allows mutating cookies).
 */
export async function createSession(payload: SessionPayload): Promise<void> {
  const key = getSigningKey();

  const token = await new SignJWT({
    sub: payload.userId,
    tenantId: payload.tenantId,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key);

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * Reads and verifies the session cookie. Only ever reads cookies (never
 * writes), so it's safe to call from Server Components, layouts, and
 * middleware — not just Server Actions. Never throws: any missing, invalid,
 * or expired token simply resolves to null.
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const key = getSigningKey();
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, key);
    const userId = typeof payload.sub === "string" ? payload.sub : null;
    const tenantId = typeof payload.tenantId === "string" ? payload.tenantId : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!userId || !tenantId || !email) return null;

    return { userId, tenantId, email };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

// bcrypt hashing/verification only ever runs in Node-runtime code paths
// (Server Actions in src/app/auth-actions.ts). bcryptjs's module internally
// does `import nodeCrypto from "crypto"`, a Node built-in that the Edge
// Runtime can't resolve — if it were a top-level import in this file it
// would break the middleware.ts bundle (middleware only needs getSession,
// which is pure `jose` and Edge-safe). Importing it dynamically, only
// inside these two Node-only functions, keeps it out of the Edge bundle.

export async function hashPassword(plain: string): Promise<string> {
  const bcrypt = (await import("bcryptjs")).default;
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const bcrypt = (await import("bcryptjs")).default;
  return bcrypt.compare(plain, hash);
}
