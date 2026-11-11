"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function LinkOdrsPortalAccountDialog({ studentNo, studentName, onClose }) {
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const linked = account?.studentNo === studentNo;

  async function submit(event) {
    event.preventDefault();
    if (busy || linked || (account && !confirmed)) return;

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/students/${encodeURIComponent(studentNo)}/portal-account`, {
        method: account ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, accountId: account?.id, identityConfirmed: confirmed }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Unable to link the portal account.");
      setAccount(payload.data);
      if (account) toast.success("Portal Account Linked");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent hideClose>
        <DialogHeader>
          <DialogTitle>Link ODRS Portal Account</DialogTitle>
          <DialogDescription>Link an existing current-student account to {studentName} ({studentNo}).</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-1.5 text-sm font-medium">
            <span>Portal email address</span>
            <Input type="email" autoComplete="off" required maxLength={254} value={email} disabled={busy || linked}
              onChange={(event) => {
                setEmail(event.target.value);
                setAccount(null);
                setConfirmed(false);
                setError("");
              }} />
          </label>
          {account && (
            <div className="space-y-3 rounded-xl border border-border p-3 text-sm">
              <div>
                <p className="font-semibold">{account.name || "Portal account"}</p>
                <p className="break-all text-muted-foreground">{account.email}</p>
              </div>
              {linked ? (
                <p role="status">This account is linked to student record {studentNo}.</p>
              ) : (
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} />
                  <span>I verified that this portal account belongs to the student named in this record.</span>
                </label>
              )}
            </div>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{linked ? "Done" : "Cancel"}</Button>
            {!linked && <Button type="submit" disabled={busy || (Boolean(account) && !confirmed)}>
              {account ? "Link Portal Account" : "Find Portal Account"}
            </Button>}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
