"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { normalizeChecklistStudentNo } from "@/lib/studentAffiliation";

export default function EditChecklistStudentNumberDialog({ user, onClose, onSaved }) {
  const fieldId = useId();
  const hasNumber = Boolean(user.checklist_student_no);
  const [number, setNumber] = useState(user.checklist_student_no || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    const studentNumber = normalizeChecklistStudentNo(number);
    if (!studentNumber) {
      setError("Enter a valid student number.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const csrf = document.cookie.match(/(?:^|;\s*)pup_csrf=([^;]+)/)?.[1];
      const response = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf && { "X-CSRF-Token": decodeURIComponent(csrf) }),
        },
        body: JSON.stringify({
          fname: user.fname,
          lname: user.lname,
          mname: user.mname,
          student_no: user.student_no,
          client_type: user.client_type,
          checklist_student_no: studentNumber,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Could not save your student number. Try again.");
      onSaved(studentNumber);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-md" hideClose={saving}>
        <form className="min-w-0 space-y-5 p-5 sm:p-6" onSubmit={submit} aria-busy={saving}>
          <DialogHeader className="pr-8">
            <DialogTitle>{hasNumber ? "Edit Student Number" : "Add Student Number"}</DialogTitle>
            <DialogDescription>Enter the student number printed on your school ID.</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-border bg-gray-50/90 px-4 dark:bg-white/[0.04]">
            <div className="space-y-2 py-4">
              <label htmlFor={fieldId} className="block text-xs font-semibold">Student Number</label>
              <Input
                id={fieldId}
                className="h-12 text-base font-semibold tracking-wide tabular-nums"
                value={number}
                onChange={(event) => { setNumber(event.target.value); setError(""); }}
                placeholder="2024-00123-SJ-0"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={31}
                required
                readOnly={saving}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${fieldId}-error` : undefined}
              />
              {error && <p id={`${fieldId}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
            </div>
            {user.email && (
              <dl className="border-t border-border py-3.5">
                <dt className="text-xs font-semibold">Verified Email</dt>
                <dd className="mt-1 text-sm text-gray-600 [overflow-wrap:anywhere] dark:text-zinc-300">{user.email}</dd>
              </dl>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving Student Number…" : "Save Student Number"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
