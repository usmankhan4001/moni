/**
 * Deployment-mode detection, deliberately kept in its own module with NO
 * database imports.
 *
 * middleware.ts runs in the Edge Runtime and needs this function. It used to
 * import it from src/lib/tenant.ts, which imports `@/db` at the top level,
 * which imports `pg` — and `pg` requires `node:util/types`, a Node built-in
 * the Edge Runtime cannot resolve. The result was an Edge bundle that failed
 * to evaluate at all:
 *
 *   Failed to load external module node:util/types:
 *   TypeError: Native module not found: node:util/types
 *
 * Because middleware runs ahead of every matched request, that turned into a
 * 500 on literally every route, which in turn failed the container
 * healthcheck, which made Traefik drop the container and serve its default
 * 404. Keep this file free of any transitive `pg`/`drizzle-orm` import, and
 * be careful adding imports to anything middleware.ts pulls in — the same
 * guard already applies to bcryptjs in src/lib/auth.ts.
 */

export type DeploymentMode = "single_user" | "multi_tenant";

const DEPLOYMENT_MODES: readonly string[] = ["single_user", "multi_tenant"];

/**
 * Reads DEPLOYMENT_MODE, tolerating the hyphenated spelling people naturally
 * type ("single-user") since the underscore form is easy to get wrong.
 *
 * This used to be a blind `as DeploymentMode` cast, which meant any typo
 * produced a mode string matching NEITHER branch of getTenantId() — so
 * "single-user" silently took the multi-tenant path and threw
 * "Not authenticated." on every data page of a no-auth deployment.
 *
 * An unrecognised value now fails CLOSED (multi_tenant) rather than defaulting
 * to single_user: guessing single_user would disable authentication outright
 * on a real multi-tenant install, which is far worse than an outage.
 */
export function getDeploymentMode(): DeploymentMode {
  const raw = process.env.DEPLOYMENT_MODE;
  if (!raw?.trim()) return "single_user";

  const normalized = raw.trim().toLowerCase().replace(/-/g, "_");
  if (DEPLOYMENT_MODES.includes(normalized)) return normalized as DeploymentMode;

  console.error(
    `Invalid DEPLOYMENT_MODE ${JSON.stringify(raw)} — expected one of ` +
      `${DEPLOYMENT_MODES.join(" | ")}. Failing closed to multi_tenant.`,
  );
  return "multi_tenant";
}
