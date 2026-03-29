"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false,
  variant = "danger",
}) {
  if (!open) return null;

  const variantClasses = {
    danger: {
      bg: "bg-red-50/50",
      text: "text-red-700",
      icon: "ph-bold ph-warning-circle",
      iconBg: "bg-red-100",
      iconText: "text-red-600",
      btn: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      bg: "bg-amber-50/50",
      text: "text-amber-700",
      icon: "ph-bold ph-warning-circle",
      iconBg: "bg-amber-100",
      iconText: "text-amber-600",
      btn: "bg-amber-600 hover:bg-amber-700",
    },
  };

  const v = variantClasses[variant] || variantClasses.danger;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white sm:rounded-sm rounded-sm border-gray-200 shadow-xl">
        <DialogHeader className={`p-6 border-b border-gray-200 flex flex-row justify-between items-center space-y-0 ${v.bg}`}>
          <DialogTitle className={`font-bold text-lg flex items-center gap-2 ${v.text}`}>
            <i className={v.icon}></i> {title}
          </DialogTitle>
        </DialogHeader>
        <div className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className={`w-16 h-16 ${v.iconBg} ${v.iconText} rounded-full flex items-center justify-center mb-4`}>
              <i className={`${v.icon.replace('ph-bold', 'ph-fill')} text-3xl`}></i>
            </div>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              {message}
            </p>

            <div className="w-full flex gap-3 mt-2">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1 h-11 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {cancelLabel}
              </Button>
              <Button
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 h-11 text-sm font-bold text-white transition-all shadow-md hover:shadow-lg ${v.btn}`}
              >
                {isLoading ? "Processing..." : confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
