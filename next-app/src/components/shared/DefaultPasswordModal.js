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

export default function DefaultPasswordModal({
  open,
  onClose,
  userName,
  password,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy errors
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
        <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
              <i className="ph-duotone ph-key text-2xl"></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight">
                Account Credentials Ready
              </DialogTitle>
              <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 leading-relaxed">
                The staff account has been created. Securely share these temporary credentials with the user.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-brand border border-gray-200">
            <div className="w-10 h-10 rounded-full bg-pup-maroon/10 flex items-center justify-center shrink-0">
              <i className="ph-bold ph-user text-pup-maroon text-lg"></i>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Account</p>
              <p className="text-sm font-bold text-gray-900 truncate">{userName}</p>
            </div>
          </div>

          {/* Password display - prominent style */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              Temporary Password
            </label>
            <div className="relative">
              <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-brand">
                <p className="font-mono text-xl font-black text-amber-900 tracking-wider text-center break-all">
                  {password}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-brand text-xs font-bold transition-all ${
                  copied
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-white text-pup-maroon border border-red-200 hover:bg-red-50 shadow-sm"
                }`}
              >
                <i className={`ph-bold ${copied ? "ph-check" : "ph-copy"} text-sm`}></i>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-xs font-medium text-amber-700">
              <i className="ph-bold ph-warning-circle mr-1"></i>
              User must change this password on first login.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 px-6 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
          >
            Close
          </Button>
          <Button
            onClick={onClose}
            className="h-11 px-6 bg-pup-maroon text-white hover:bg-red-900 shadow-sm font-bold flex items-center gap-2 rounded-brand"
          >
            <i className="ph-bold ph-check text-lg"></i>
            I&apos;ve Recorded This
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
