"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const channelLabels = { in_app: "In-app", email: "Email" };

export default function WorkflowNotificationSettings({ canManagePickup }) {
  const [events, setEvents] = useState(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickup, setPickup] = useState(null);
  const [savedPickup, setSavedPickup] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    fetch("/api/auth/notification-preferences", options)
      .then((res) => res.json())
      .then((result) => result.ok ? setEvents(result.data) : setFailed(true))
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    if (canManagePickup) {
      fetch("/api/registrar/pickup-instructions", options)
        .then((res) => res.json())
        .then((result) => {
          if (result.ok) {
            setPickup(result.data.instructions);
            setSavedPickup(result.data.instructions);
          }
        })
        .catch(() => {});
    }
    return () => controller.abort();
  }, [canManagePickup]);

  async function save(url, method, body) {
    setSaving(true);
    try {
      const response = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || "Try again.");
      return result;
    } catch (error) {
      toast.error("Could not save changes", { description: error.message });
      return null;
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Notifications</h3>
          <p className="mt-1 text-sm text-muted-foreground">Choose which workflow updates you receive. Account security messages are managed separately.</p>
        </div>
        {!!events?.length && (
          <Button variant="outline" size="sm" className="ml-auto" disabled={saving} onClick={async () => {
            const result = await save("/api/auth/notification-preferences", "DELETE");
            if (result) {
              setEvents(result.data);
              toast.success("Notification preferences reset to defaults");
            }
          }}>Reset All Preferences</Button>
        )}
      </div>
      {pickup !== null && (
        <div className="space-y-3 rounded-2xl border p-4">
          <label htmlFor="default-pickup" className="text-sm font-semibold">Default pickup instructions</label>
          <p className="text-sm text-muted-foreground">Registrar staff can adjust these instructions before marking a request ready.</p>
          <Textarea id="default-pickup" value={pickup} maxLength={2000} placeholder="Enter the pickup location, office hours, and what to bring" onChange={(e) => setPickup(e.target.value)} />
          <div className="flex justify-end">
            <Button size="sm" disabled={saving || pickup.trim() === savedPickup} onClick={async () => {
              const result = await save("/api/registrar/pickup-instructions", "PUT", { instructions: pickup });
              if (result) {
                setPickup(result.data.instructions);
                setSavedPickup(result.data.instructions);
                toast.success("Pickup instructions saved");
              }
            }}>Save Pickup Instructions</Button>
          </div>
        </div>
      )}
      {failed ? <p role="alert" className="text-sm">Could not load notification preferences. Try reopening settings.</p>
        : events === null ? <p role="status" className="text-sm text-muted-foreground">Loading preferences…</p>
        : events.length === 0 ? <p className="text-sm text-muted-foreground">Your account has no workflow alerts to configure.</p>
        : ["request_", "osas_", "checklist_", "queue_"].map((prefix) => {
          const group = events.filter(({ key }) => key.startsWith(prefix));
          if (!group.length) return null;
          return (
            <div key={prefix} className="rounded-2xl border">
              <h4 className="px-4 py-3 text-sm font-semibold">{prefix === "request_" ? "Document Requests" : prefix === "osas_" ? "OSAS Submissions" : prefix === "checklist_" ? "Document Checklist" : "Office Queue"}</h4>
              {group.map(({ key, label, channels }) => (
                <div key={key} className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                  <span className="text-sm">{label}</span>
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(channels).map(([channel, enabled]) => (
                      <label key={channel} className="flex items-center gap-2 text-xs text-muted-foreground">
                        {channelLabels[channel]}
                        <Switch size="sm" variant="emerald" aria-label={`${label}, ${channelLabels[channel]}`} checked={enabled} disabled={saving} onCheckedChange={async (value) => {
                          const result = await save("/api/auth/notification-preferences", "PATCH", { key, channel, enabled: value });
                          if (result) setEvents((current) => current.map((item) => item.key === key
                            ? { ...item, channels: { ...item.channels, [channel]: value } } : item));
                        }} />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
    </section>
  );
}
