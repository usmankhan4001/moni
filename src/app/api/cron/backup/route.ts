import { NextRequest, NextResponse } from "next/server";
import { db, schema, isDatabaseConfigured } from "@/db";
import { getDeploymentMode, DEFAULT_TENANT_ID } from "@/lib/tenant";
import { triggerWorkspaceBackup } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured() || !db) {
    return NextResponse.json({ ok: false, message: "Database not configured" }, { status: 503 });
  }

  const mode = getDeploymentMode();
  let ran = 0;
  const errors: string[] = [];

  if (mode === "single_user") {
    const res = await triggerWorkspaceBackup(DEFAULT_TENANT_ID);
    if (res.ok) ran++;
    else errors.push(res.message);
  } else {
    const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);
    for (const t of tenants) {
      const res = await triggerWorkspaceBackup(t.id);
      if (res.ok) ran++;
      else errors.push(`${t.id}: ${res.message}`);
    }
  }

  return NextResponse.json({ ok: errors.length === 0, ran, errors });
}
