"use client";

import { useState } from "react";

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-brand border border-gray-200 shadow-xl overflow-hidden animate-scale-in">
        <div className="p-5 border-b border-gray-200 bg-gray-50/60">
          <h3 className="font-bold text-pup-maroon">Change Password</h3>
          <p className="text-xs text-gray-500 mt-1">
            {authUser?.mustChangePassword
              ? "First login detected. Please change your password to continue."
              : "Update your account password."}
          </p>
        </div>
        <form onSubmit={submitChangePassword} className="p-5 space-y-4">
          {pwError ? (
            <div className="text-sm text-red-600 font-semibold">{pwError}</div>
          ) : null}

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
              Current Password
            </label>
            <input
              type="password"
              className="form-input"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
              New Password
            </label>
            <input
              type="password"
              className="form-input"
              value={pwNext}
              onChange={(e) => setPwNext(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
              Confirm New Password
            </label>
            <input
              type="password"
              className="form-input"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            {!authUser?.mustChangePassword && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 rounded-brand text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={pwLoading}
              className="px-5 py-2.5 bg-pup-maroon text-white rounded-brand text-sm font-bold hover:bg-red-900 transition-colors shadow-sm disabled:opacity-60"
            >
              {pwLoading ? "Saving..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
