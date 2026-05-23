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
  disabled = false,
  variant = "danger",
  selectedItems = [],
  note,
  icon: customIcon,
  buttonIcon: customButtonIcon,
  confirmClassName,
}) {
  if (!open) return null;

  const variantClasses = {
    danger: {
      icon: "ph-duotone ph-warning-circle",
      iconWrap: "bg-red-50 border-red-100 text-red-600 shadow-sm",
      title: "text-gray-900",
      description: "text-gray-600",
      confirmVariant: "destructive",
      buttonIcon: "ph-bold ph-trash",
    },
    warning: {
      icon: "ph-duotone ph-warning",
      iconWrap: "bg-amber-50 border-amber-100 text-amber-600 shadow-sm",
      title: "text-gray-900",
      description: "text-gray-600",
      confirmVariant: "default",
      buttonIcon: "ph-bold ph-warning",
      confirmStyle: "bg-linear-to-b from-orange-700 to-orange-500 border-4 border-orange-900 hover:from-orange-600 hover:to-orange-800 text-white shadow-lg shadow-orange-900/20",
    },
    success: {
      icon: "ph-duotone ph-arrow-counter-clockwise",
      iconWrap: "bg-green-50 border-green-100 text-green-600 shadow-sm",
      title: "text-gray-900",
      description: "text-gray-600",
      confirmVariant: "default",
      buttonIcon: "ph-bold ph-check",
    },
    default: {
      icon: "ph-duotone ph-info",
      iconWrap: "bg-blue-50 border-blue-100 text-blue-600 shadow-sm",
      title: "text-gray-900",
      description: "text-gray-600",
      confirmVariant: "default",
      buttonIcon: "ph-bold ph-check",
    },
  };

  const v = variantClasses[variant] || variantClasses.default;
  const displayIcon = customIcon || v.icon;
  const displayButtonIcon = customButtonIcon || v.buttonIcon;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
        <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50 min-w-0">
          <div className="flex items-start gap-4 w-full">
            <div className={`w-12 h-12 rounded-full border flex items-center justify-center shrink-0 ${v.iconWrap}`}>
              <i className={`${displayIcon} text-2xl`}></i>
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className={`text-lg font-black tracking-tight leading-tight ${v.title} truncate`}>
                {title}
              </DialogTitle>
              <DialogDescription className={`text-sm font-medium mt-1.5 leading-relaxed ${v.description}`}>
                {message}
              </DialogDescription>
              {note && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <i className="ph-bold ph-info text-amber-600 shrink-0" />
                  <p className="text-[11px] font-bold text-amber-700 leading-tight">
                    {note}
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {selectedItems.length > 0 && (
          <div className="p-6 bg-white min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Selected Items ({selectedItems.length})
            </p>
            <div className="relative w-full">
              <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/50 p-2 space-y-1 custom-scrollbar pb-6 w-full">
                {selectedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-2 py-1.5 rounded bg-white border border-gray-100 shadow-sm overflow-hidden w-full"
                  >
                    <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${variant === "success" ? "bg-emerald-500" : (variant === "warning" ? "bg-amber-500" : "bg-red-500")}`} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[11px] font-bold text-gray-700">
                        {item}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedItems.length > 3 && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50/50 to-transparent pointer-events-none rounded-b-lg z-10" />
              )}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-11 rounded-brand border-gray-300 px-6 text-sm font-bold text-gray-600 uppercase hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon shadow-sm transition-colors"
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={v.confirmVariant}
            onClick={onConfirm}
            disabled={isLoading || disabled}
            className={cn(
              "h-11 px-6 text-sm font-bold shadow-sm rounded-brand gap-2 flex items-center transition-all active:scale-95",
              variant === "success" && "bg-green-600 hover:bg-green-700 text-white",
              variant === "warning" && (v.confirmStyle || "bg-amber-600 hover:bg-amber-700 text-white"),
              (v.confirmVariant === "default" && !["success", "warning"].includes(variant)) && "bg-linear-to-b from-red-800 to-pup-maroon border-[3px] border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md text-white",
              v.confirmVariant === "destructive" && "bg-linear-to-b from-red-600 to-red-800 border-[3px] border-red-900 hover:from-red-500 hover:to-red-700 hover:shadow-md text-white",
              confirmClassName
            )}
          >
            <i className={`${displayButtonIcon} text-lg`}></i>
            {isLoading ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
