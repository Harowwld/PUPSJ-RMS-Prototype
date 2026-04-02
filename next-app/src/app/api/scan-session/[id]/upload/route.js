import { NextResponse } from "next/server";
import { addIncomingPdfToSession, listIncomingForSession } from "../../../../../lib/scanSessionRepo.js";
import { broadcastToPairSession } from "../../../../../pages/api/socket";

export const runtime = "nodejs";

export async function POST(req, ctx) {
  const params = await ctx.params;
  const id = parseInt(String(params?.id || ""), 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, error: "Invalid form data" }, { status: 400 });
  }
  const token = String(form.get("token") || "").trim();
  const clientRef = String(form.get("clientRef") || "").trim();
  const file = form.get("file");

  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
  }
  if (!file || typeof file === "string") {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }
  if (String(file.type || "") !== "application/pdf") {
    return NextResponse.json({ ok: false, error: "Only PDF files are allowed" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const session = await addIncomingPdfToSession({
    sessionId: id,
    token,
    clientRef,
    filename: file.name || "scan.pdf",
    buffer: buf,
  });
  if (!session?.id) {
    return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 401 });
  }
  const incoming = await listIncomingForSession(id, { limit: 25 });
  broadcastToPairSession(id, "incomingUpdated", { session, incoming });
  return NextResponse.json({ ok: true, data: { session, incoming } });
}

