"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PasswordChangeModal({
  open,
  authUser,
  onClose,
  onSuccess,
  onLogAction,
}) {
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  if (!open) return null;

  function clearPwForm() {
    setPwCurrent("");
    setPwNext("");
    setPwConfirm("");
    setPwError("");
  }

  function submitChangePassword(e) {
    e.preventDefault();
    if (pwLoading) return;
    if (!authUser?.id) {
      setPwError("Missing user session");
      return;
    }
    if (!pwCurrent || !pwNext || !pwConfirm) {
      setPwError("Please fill all fields");
      return;
    }
    if (pwNext !== pwConfirm) {
      setPwError("New password does not match");
      return;
    }
    if (pwNext.length < 6) {
      setPwError("Password must be at least 6 characters");
      return;
    }

    setPwError("");
    setPwLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: pwCurrent,
            newPassword: pwNext,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to change password");
        }

        if (onLogAction) await onLogAction("Changed account password");

        clearPwForm();
        onSuccess("Password updated successfully!");
        onClose();
      } catch (err) {
        setPwError(err?.message || "Failed to change password");
      } finally {
        setPwLoading(false);
      }
    })();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
        <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
              <i className="ph-duotone ph-pencil-line text-2xl"></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black tracking-tight text-gray-900">
                Update Password
              </DialogTitle>
              <DialogDescription className="text-sm font-medium mt-1 text-gray-600">
                {authUser?.mustChangePassword
                  ? "First login detected. Please change your password to continue."
                  : "Update your account password to maintain security."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submitChangePassword}>
          <div className="p-6 space-y-4">
            {pwError ? (
              <div className="text-sm text-red-600 font-semibold">{pwError}</div>
            ) : null}

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                Current Password
              </label>
              <Input
                type="password"
                className="bg-white shadow-sm h-11 rounded-brand"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                New Password
              </label>
              <Input
                type="password"
                className="bg-white shadow-sm h-11 rounded-brand"
                value={pwNext}
                onChange={(e) => setPwNext(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                Confirm New Password
              </label>
              <Input
                type="password"
                className="bg-white shadow-sm h-11 rounded-brand"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {!authUser?.mustChangePassword && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-11 px-5 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
                disabled={pwLoading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={pwLoading}
              className="h-11 px-5 bg-pup-maroon text-white font-bold hover:bg-red-900 shadow-sm rounded-brand"
            >
              {pwLoading ? "Saving..." : "Update Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
