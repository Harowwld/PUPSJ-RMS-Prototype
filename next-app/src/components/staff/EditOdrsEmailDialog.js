"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function EditOdrsEmailDialog({ studentNo, email, onSaved }) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function changeOpen(next) {
    if (saving) return;
    if (next) {
      setDraft(email || "");
      setError("");
    }
    setOpen(next);
  }

  async function save(event) {
    event.preventDefault();
    if (saving || !draft.trim()) return;
    setSaving(true);
    setError("");
    const odrsEmail = draft.trim().toLowerCase();
    try {
      const response = await fetch("/api/registrar/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_odrs_email", studentNo, odrsEmail }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not save the ODRS email.");
      onSaved(odrsEmail);
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild><Button type="button" size="xs" variant="outline">Edit ODRS Email</Button></DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-md" hideClose={saving}>
        <form className="min-w-0 space-y-5 p-5 sm:p-6" onSubmit={save} aria-busy={saving}>
          <DialogHeader className="pr-8">
            <DialogTitle>Edit ODRS Email</DialogTitle>
            <DialogDescription>Update the email used to verify the student’s checklist access.</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-border bg-gray-50/90 px-4 dark:bg-white/[0.04]">
            <div className="space-y-2 py-4">
              <label htmlFor={fieldId} className="block text-xs font-semibold">Email for ODRS</label>
              <Input
                id={fieldId}
                className="h-12 text-base font-semibold"
                type="email"
                placeholder="name@example.com"
                autoComplete="off"
                spellCheck={false}
                value={draft}
                maxLength={100}
                required
                readOnly={saving}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${fieldId}-error` : undefined}
                onChange={(event) => { setDraft(event.target.value); setError(""); }}
              />
              {error && <p id={`${fieldId}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
            </div>
            <dl className="border-t border-border py-3.5">
              <dt className="text-xs font-semibold">Student Number</dt>
              <dd className="mt-1 text-sm tabular-nums text-gray-600 dark:text-zinc-300">{studentNo}</dd>
            </dl>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => changeOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !draft.trim()}>{saving ? "Saving ODRS Email…" : "Save ODRS Email"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
