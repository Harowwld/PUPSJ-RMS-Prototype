import { NextResponse } from "next/server";
import { requireAuth, createAuthErrorResponse, getPrincipalOfficeId } from "@/lib/authHelpers";
import { query } from "@/lib/postgres";
import { getOrganizationsForStudentEmail } from "@/lib/organizationsRepo";
import { officeQueueEvents, workflowEvents } from "@/lib/workflowNotificationEvents";

async function notificationProfile(user) {
  if (user.principalType !== "staff") {
    if (!user.accountId) return null;
    const organizations = user.clientType === "Student" && user.portalSetupComplete !== false
      ? await getOrganizationsForStudentEmail(user.email) : [];
    const events = Object.entries(workflowEvents).filter(([key]) =>
      key.startsWith("request_") ||
      (key.startsWith("osas_") && organizations.length > 0) ||
      (key.startsWith("checklist_") && user.clientType === "Student" && user.portalSetupComplete !== false),
    );
    return { type: "portal", id: String(user.accountId), events };
  }
  const officeId = getPrincipalOfficeId(user);
  const officeEvents = officeQueueEvents[officeId];
  if (!officeEvents) return { type: "staff", id: String(user.id), events: [] };
  const modules = await query("SELECT module_id FROM office_modules WHERE office_id = $1 AND enabled", [officeId]);
  const defaultModule = officeId === "registrar" ? "document_requests" : "osas_monitoring";
  const events = Object.entries(officeEvents).filter(([, event]) =>
    modules.some((module) => module.module_id === (event.moduleId || defaultModule)),
  );
  return { type: "staff", id: String(user.id), events };
}

export async function GET(req) {
  const access = await requireAuth(req);
  const profile = access.user && await notificationProfile(access.user);
  if (!profile) return createAuthErrorResponse(access.error || "Authentication required");
  const stored = await query(
    "SELECT event_key, channel, enabled FROM workflow_notification_preferences WHERE principal_type = $1 AND principal_id = $2",
    [profile.type, profile.id],
  );
  return NextResponse.json({ ok: true, data: formatPreferences(profile.events, stored) });
}

function formatPreferences(events, stored = []) {
  return events.map(([key, event]) => ({
    key,
    label: event.label,
    channels: Object.fromEntries(event.channels.map((channel) => [
      channel,
      stored.find((row) => row.event_key === key && row.channel === channel)?.enabled
        ?? (channel === "in_app" || key === "request_ready"),
    ])),
  }));
}

export async function DELETE(req) {
  const access = await requireAuth(req);
  const profile = access.user && await notificationProfile(access.user);
  if (!profile) return createAuthErrorResponse(access.error || "Authentication required");
  await query(
    "DELETE FROM workflow_notification_preferences WHERE principal_type = $1 AND principal_id = $2",
    [profile.type, profile.id],
  );
  return NextResponse.json({ ok: true, data: formatPreferences(profile.events) });
}

export async function PATCH(req) {
  const access = await requireAuth(req);
  const profile = access.user && await notificationProfile(access.user);
  if (!profile) return createAuthErrorResponse(access.error || "Authentication required");
  const body = await req.json().catch(() => null);
  const event = profile.events.find(([key]) => key === body?.key)?.[1];
  if (!event?.channels.includes(body.channel) || typeof body.enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "Choose a supported notification setting." }, { status: 400 });
  }
  await query(
    `INSERT INTO workflow_notification_preferences (principal_type, principal_id, event_key, channel, enabled)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (principal_type, principal_id, event_key, channel) DO UPDATE SET enabled = EXCLUDED.enabled`,
    [profile.type, profile.id, body.key, body.channel, body.enabled],
  );
  return NextResponse.json({ ok: true });
}
