"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function EditOdrsEmailDialog({ studentNo, email, onSaved }) {
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
      <DialogContent hideClose={saving}>
        <form onSubmit={save} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit ODRS Email</DialogTitle>
            <DialogDescription>Update the email used to verify checklist access for {studentNo}.</DialogDescription>
          </DialogHeader>
          <label className="grid gap-1 text-sm font-medium">
            Email for ODRS
            <Input type="email" placeholder="name@example.com" autoComplete="off" value={draft} maxLength={100} required disabled={saving}
              onChange={(event) => setDraft(event.target.value)} />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" size="sm" variant="outline" onClick={() => changeOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving || !draft.trim()}>{saving ? "Saving…" : "Save ODRS Email"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
