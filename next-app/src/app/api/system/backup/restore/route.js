import { NextResponse } from "next/server";

export const runtime = "nodejs";

// SQLite archives cannot be restored into the PostgreSQL runtime. PostgreSQL
// restore support requires a validated pg_dump/pg_restore package and is kept
// explicit here instead of risking a partial or destructive import.
export async function POST() {
  return NextResponse.json({
    ok: false,
    error: "SQLite backup restore is unavailable. Create a PostgreSQL backup with pg_dump and restore it using the local database tooling.",
  }, { status: 501 });
}
