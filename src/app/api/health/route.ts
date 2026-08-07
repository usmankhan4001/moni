import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  if (!isDatabaseConfigured() || !db) {
    return NextResponse.json({ ok: false, reason: "database not configured" }, { status: 503 });
  }
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: "database unreachable" }, { status: 503 });
  }
}
