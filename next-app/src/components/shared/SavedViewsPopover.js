"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown01Icon, Bookmark02Icon, Delete02Icon, Tick01Icon } from "hugeicons-react";
import { useAuthUser } from "@/components/shared/AuthGuard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { BADGE_BASE } from "@/lib/badgeStyles";
import { cn } from "@/lib/utils";
import {
  SAVED_VIEW_CATEGORIES,
  classifySavedWorkViewState,
  deleteSavedWorkView,
  readSavedWorkViews,
  saveWorkView,
  savedWorkViewsKey,
  subscribeSavedWorkViews,
} from "@/lib/viewPreferences";

const CATEGORY_LABELS = Object.fromEntries(SAVED_VIEW_CATEGORIES.map((c) => [c.id, c.label]));

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Toolbar popover for saving, switching, and deleting named work views
 * (filters, sorting, grouping, visible columns, and layout) on a queue page.
 */
export default function SavedViewsPopover({
  page,
  currentState,
  onApplyState,
  placeholder = "e.g. Awaiting Payment",
  align = "end",
  user: userProp,
}) {
  const authUser = useAuthUser();
  const user = userProp === undefined ? authUser : userProp;
  const storageKey = savedWorkViewsKey(user, page);

  const [open, setOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return undefined;
    const bump = () => setRefreshTick((t) => t + 1);
    const unsubscribe = subscribeSavedWorkViews(storageKey, bump);
    const onStorage = (event) => {
      if (event.key === storageKey || event.key === null) bump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, [storageKey]);

  const views = useMemo(() => {
    if (typeof window === "undefined" || !window.localStorage || !storageKey) return [];
    return readSavedWorkViews(user, page, window.localStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, storageKey, refreshTick]);

  const currentSignature = useMemo(() => stableStringify(currentState || {}), [currentState]);
  const activeView = useMemo(
    () => views.find((v) => stableStringify(v.state) === currentSignature) || null,
    [views, currentSignature]
  );

  if (!storageKey) return null;

  const handleSave = (event) => {
    event.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed || typeof window === "undefined" || !window.localStorage) return;
    const { savedView, updated } = saveWorkView(
      user,
      page,
      { name: trimmed, state: currentState || {} },
      window.localStorage
    );
    if (!savedView) return;
    setNameInput("");
    setRefreshTick((t) => t + 1);
    toast.success(updated ? "Work view updated" : "Work view saved", {
      description: updated
        ? `Updated "${savedView.name}" with the current filters, columns, and layout.`
        : `Saved "${savedView.name}" for quick access from this toolbar.`,
    });
  };

  const handleApply = (view) => {
    onApplyState?.(view.state, view);
    setOpen(false);
    toast.success("Work view applied", {
      description: `Switched to "${view.name}".`,
    });
  };

  const handleDelete = (event, view) => {
    event.stopPropagation();
    if (typeof window === "undefined" || !window.localStorage) return;
    deleteSavedWorkView(user, page, view.id, window.localStorage);
    setRefreshTick((t) => t + 1);
    toast.success("Work view removed", {
      description: `Deleted "${view.name}".`,
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Saved work views"
          className={cn(
            "h-9 shrink-0 gap-2 rounded-xl px-3 text-xs font-medium shadow-none",
            activeView ? "max-w-[190px]" : ""
          )}
        >
          <Bookmark02Icon size={14} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-zinc-400" />
          <span className="truncate">{activeView ? activeView.name : "Views"}</span>
          {!activeView && views.length > 0 && (
            <span className={cn(BADGE_BASE, "bg-pup-maroon text-white dark:bg-red-500")}>{views.length}</span>
          )}
          <ArrowDown01Icon size={13} aria-hidden="true" className="shrink-0 text-gray-400 dark:text-zinc-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="max-h-[calc(100dvh-2rem)] w-[min(21rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl p-0"
      >
        <PopoverHeader className="px-4 py-2.5 border-b border-border/60">
          <PopoverTitle className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400">
            Saved work views
          </PopoverTitle>
          {views.length > 0 && (
            <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500 tabular-nums">
              {views.length}/25
            </span>
          )}
        </PopoverHeader>

        <div className="max-h-[min(36vh,15rem)] space-y-1 overflow-y-auto p-2">
          {views.length === 0 ? (
            <EmptyState
              variant="compact"
              icon={Bookmark02Icon}
              title="No saved views yet"
              description="Save your current filters, sorting, grouping, columns, and layout as a named view."
              className="py-5"
            />
          ) : (
            views.map((view) => {
              const isSelected = activeView?.id === view.id;
              const categoryText = classifySavedWorkViewState(view.state)
                .map((id) => CATEGORY_LABELS[id] || id)
                .join(" · ");
              return (
                <div
                  key={view.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-xl p-1 transition-colors",
                    isSelected
                      ? "bg-gray-100 dark:bg-zinc-800"
                      : "hover:bg-gray-50 dark:hover:bg-zinc-800/70"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleApply(view)}
                    aria-pressed={isSelected}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon cursor-pointer"
                  >
                    <Bookmark02Icon
                      size={14}
                      aria-hidden="true"
                      className={cn(
                        "shrink-0",
                        isSelected ? "text-pup-maroon dark:text-red-400" : "text-gray-400 dark:text-zinc-500"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-gray-900 dark:text-zinc-100">
                        {view.name}
                      </div>
                      {categoryText && (
                        <div className="truncate text-[10.5px] text-gray-500 dark:text-zinc-400">
                          {categoryText}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Tick01Icon
                        size={14}
                        aria-hidden="true"
                        className="shrink-0 text-pup-maroon dark:text-red-400"
                      />
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => handleDelete(e, view)}
                    aria-label={`Delete ${view.name}`}
                    title={`Delete ${view.name}`}
                    className="shrink-0 text-gray-400 opacity-70 hover:bg-red-50 hover:text-red-600 hover:opacity-100 focus-visible:opacity-100 dark:text-zinc-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Delete02Icon size={13} aria-hidden="true" />
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSave} className="border-t border-border/60 p-2.5 flex items-center gap-2">
          <Input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder={placeholder}
            aria-label="Work view name"
            maxLength={60}
            className="h-9 flex-1 text-xs"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!nameInput.trim()}
            className="shrink-0 px-3"
          >
            Save
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
