"use client";

import { useState } from "react";
import { toast } from "sonner";
import ConfirmModal from "@/components/shared/ConfirmModal";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/clientAuth";
import { isDemoAccount } from "@/lib/demoAccounts";
import { normalizeRole } from "@/lib/roleUtils";

export function canManageStaffPasswordReset(account, global = false) {
  const role = normalizeRole(account.role);
  return role === "Staff" || (global && role === "Admin");
}

export function staffPasswordResetBlockReason(account, email) {
  if (account.status !== "Active") return "Restore the account before sending a reset link.";
  if (isDemoAccount(email)) return "Reset emails are unavailable for demo accounts.";
  if (!email || email === "N/A") return "This account needs a registered email address.";
  return "";
}

export default function StaffPasswordResetAction({ account, email, global = false, dialogOnly = false, onClose }) {
  const [open, setOpen] = useState(dialogOnly);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!canManageStaffPasswordReset(account, global) || staffPasswordResetBlockReason(account, email)) return null;

  function changeOpen(value) {
    if (saving) return;
    setError("");
    setOpen(value);
    if (!value) onClose?.();
  }

  async function sendReset() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await authFetch(`/api/staff/${encodeURIComponent(account.id)}/password-reset`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Could not send the password reset email.");
      toast.success("Password Reset Email Sent");
      setOpen(false);
      onClose?.();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {!dialogOnly && (
        <Button type="button" variant="outline" size="sm" onClick={() => changeOpen(true)}>
          Send Password Reset
        </Button>
      )}
      {open && (
        <ConfirmModal
          open
          title="Send Password Reset"
          message={`Send a reset link to ${email}? The link expires in 15 minutes.`}
          note={error || undefined}
          confirmLabel="Send Password Reset"
          variant="brand"
          isLoading={saving}
          onOpenChange={changeOpen}
          onCancel={() => changeOpen(false)}
          onConfirm={sendReset}
        />
      )}
    </>
  );
}
