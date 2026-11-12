"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function MissingDocumentsInquiryDialog({ user, courses, onClose, onSubmitted }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const parent = user.client_type === "Parent";

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const id = form.get("identification");
    const authorization = form.get("authorization");
    form.delete("identification");
    form.delete("authorization");
    form.set("requestKind", "missing_documents");
    form.set("notes", "Please check which required documents are still missing from the Registrar record.");
    form.set("clientType", user.client_type);
    form.set("requesterName", [user.fname, user.lname].filter(Boolean).join(" "));
    form.append("files", id);
    form.append("file_types", "valid_id");
    if (parent) {
      form.append("files", authorization);
      form.append("file_types", "spa");
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/student/document-requests", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not submit your inquiry.");
      onSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto" hideClose={saving}>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Check for Missing Documents</DialogTitle>
            <DialogDescription>The Registrar will verify your identity or authorization and share the result in Document Requests.</DialogDescription>
          </DialogHeader>
          <label className="grid gap-1 text-sm font-medium">
            {parent ? "Student’s Student Number" : "Student Number (if known)"}
            <Input name="studentNo" defaultValue={parent ? "" : user.student_no || ""} required={parent} maxLength={31} />
          </label>
          {parent ? (
            <label className="grid gap-1 text-sm font-medium">
              Relationship to Student
              <Input name="requesterRelationship" defaultValue="" maxLength={100} required />
            </label>
          ) : (
            <label className="grid gap-1 text-sm font-medium">
              Academic Program (required if you omit your student number)
              <Select name="courseCode">
                <option value="">Choose a program</option>
                {courses.map(({ code, name }) => <option key={code} value={code}>{name || code}</option>)}
              </Select>
            </label>
          )}
          <label className="grid gap-1 text-sm font-medium">
            Government-issued ID
            <Input type="file" defaultValue="" name="identification" accept=".pdf,.png,.jpg,.jpeg" required />
          </label>
          {parent && (
            <label className="grid gap-1 text-sm font-medium">
              Authorization Letter or SPA
              <Input type="file" defaultValue="" name="authorization" accept=".pdf,.png,.jpg,.jpeg" required />
            </label>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Submitting…" : "Submit Inquiry"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
