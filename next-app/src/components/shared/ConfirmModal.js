"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
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
      icon: "ph-duotone ph-warning-circle",
      iconWrap: "bg-red-50 border-red-100 text-red-600 shadow-sm",
      title: "text-gray-900",
      description: "text-gray-600",
      confirmVariant: "destructive",
    },
    warning: {
      icon: "ph-duotone ph-warning",
      iconWrap: "bg-amber-50 border-amber-100 text-amber-600 shadow-sm",
      title: "text-gray-900",
      description: "text-gray-600",
      confirmVariant: "secondary",
    },
    default: {
      icon: "ph-duotone ph-info",
      iconWrap: "bg-blue-50 border-blue-100 text-blue-600 shadow-sm",
      title: "text-gray-900",
      description: "text-gray-600",
      confirmVariant: "default",
    },
  };

  const v = variantClasses[variant] || variantClasses.default;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
        <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full border flex items-center justify-center shrink-0 ${v.iconWrap}`}>
              <i className={`${v.icon} text-2xl`}></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className={`text-lg font-black tracking-tight leading-tight ${v.title}`}>
                {title}
              </DialogTitle>
              <DialogDescription className={`text-sm font-medium mt-1.5 leading-relaxed ${v.description}`}>
                {message}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-11 px-6 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={v.confirmVariant}
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "h-11 px-6 text-sm font-bold shadow-sm rounded-brand",
              v.confirmVariant === "default" && "bg-pup-maroon hover:bg-red-900 text-white",
              v.confirmVariant === "destructive" && "bg-red-600 hover:bg-red-700 text-white"
            )}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
