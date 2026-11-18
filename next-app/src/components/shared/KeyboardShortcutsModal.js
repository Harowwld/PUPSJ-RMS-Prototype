"use client";

import { Button } from "@/components/ui/button";
import KeyboardShortcutKeys from "@/components/shared/KeyboardShortcutKeys";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KEYBOARD_SHORTCUT_GROUPS } from "@/lib/keyboardShortcuts";
import { cn } from "@/lib/utils";

/**
 * Renders the grouped keyboard shortcuts reference using Apple Inset Grouped styling.
 */
export function KeyboardShortcutList({ compact = false, className }) {
  return (
    <div className={cn("space-y-5", className)}>
      {KEYBOARD_SHORTCUT_GROUPS.map((group) => (
        <div key={group.id} className="space-y-2">
          <div>
            <h5 className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
              {group.title}
            </h5>
            {group.description && (
              <p className="text-[11.5px] text-gray-500 dark:text-zinc-400">
                {group.description}
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] divide-y divide-black/[0.06] dark:divide-white/[0.08] bg-white dark:bg-zinc-800 shadow-xs overflow-hidden">
            {group.shortcuts.map((shortcut) => (
              <div
                key={shortcut.id}
                className={cn(
                  "flex items-center justify-between gap-4",
                  compact ? "px-4 py-2.5" : "p-4 sm:px-5 sm:py-3.5"
                )}
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50">
                    {shortcut.label}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                    {shortcut.description}
                  </p>
                </div>
                <KeyboardShortcutKeys keys={shortcut.keys} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Modal dialog displaying all supported keyboard shortcuts, opened from the profile menu.
 */
export default function KeyboardShortcutsModal({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-xl dark:border-white/10 dark:bg-card gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none text-left shrink-0">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                Keyboard shortcuts
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                Quick reference for keyboard shortcuts supported across the workspace.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1">
          <KeyboardShortcutList compact />
        </div>

        <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
