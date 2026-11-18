"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bookmark02Icon, Delete02Icon, PencilEdit01Icon, Tick01Icon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { SETTINGS_DOT_CHECK, SETTINGS_STATUS_PILL_SM } from "@/lib/badgeStyles";
import {
  SAVED_VIEW_CATEGORIES,
  classifySavedWorkViewState,
  deleteSavedWorkView,
  getSavedViewPagesForUser,
  inspectSavedViewForPage,
  listAllSavedWorkViewsForUser,
  renameSavedWorkView,
  resetAllSavedViewsForUser,
  resetSavedViewForPage,
} from "@/lib/viewPreferences";

const CATEGORY_LABELS = Object.fromEntries(SAVED_VIEW_CATEGORIES.map((c) => [c.id, c.label]));

/**
 * Lets users inspect and reset a selected page's remembered filters, sorting,
 * grouping, visible columns, and layout preferences together, reset all
 * customized workspace views with confirmation, and manage named work views.
 */
export default function SavedViewsResetSetting({ authUser }) {
  const pages = useMemo(() => getSavedViewPagesForUser(authUser), [authUser]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [confirmResetAllOpen, setConfirmResetAllOpen] = useState(false);
  const [editingView, setEditingView] = useState(null); // { pageKey, id, name }

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleStorage = () => setRefreshTick((t) => t + 1);
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const pageStates = useMemo(() => {
    const map = new Map();
    if (typeof window === "undefined" || !window.localStorage) return map;
    for (const page of pages) {
      map.set(page.id, inspectSavedViewForPage(authUser, page, window.localStorage));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, pages, refreshTick]);

  const savedWorkViewGroups = useMemo(() => {
    if (typeof window === "undefined" || !window.localStorage) return [];
    return listAllSavedWorkViewsForUser(authUser, window.localStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, pages, refreshTick]);

  const customizedPages = useMemo(
    () => pages.filter((p) => (pageStates.get(p.id)?.keys?.length || 0) > 0),
    [pages, pageStates]
  );

  const activePageId = useMemo(() => {
    if (!pages.length) return "";
    if (selectedPageId && pages.some((p) => p.id === selectedPageId)) return selectedPageId;
    return (customizedPages[0] || pages[0]).id;
  }, [pages, customizedPages, selectedPageId]);

  const selectedPage = useMemo(
    () => pages.find((p) => p.id === activePageId) || pages[0] || null,
    [pages, activePageId]
  );

  if (!pages.length || !selectedPage) return null;

  const selectedState = pageStates.get(selectedPage.id) || { keys: [], categories: [] };
  const hasSaved = selectedState.keys.length > 0;
  const hasAnySaved = customizedPages.length > 0;
  const categorySummary = selectedState.categories.map((id) => CATEGORY_LABELS[id] || id).join(", ");
  const totalNamedViews = savedWorkViewGroups.reduce((acc, g) => acc + g.views.length, 0);

  const handleReset = () => {
    if (typeof window === "undefined" || !window.localStorage || !hasSaved) return;
    const { removedCount, categories } = resetSavedViewForPage(authUser, selectedPage, window.localStorage);
    setRefreshTick((t) => t + 1);
    if (removedCount > 0) {
      const resetLabels = categories.map((id) => CATEGORY_LABELS[id] || id).join(", ");
      toast.success("Saved view reset", {
        description: resetLabels
          ? `Restored default ${resetLabels.toLowerCase()} for ${selectedPage.label}.`
          : `Restored default view for ${selectedPage.label}.`,
      });
    }
  };

  const handleResetAll = () => {
    if (typeof window === "undefined" || !window.localStorage || !hasAnySaved) return;
    const { removedCount, pageCount } = resetAllSavedViewsForUser(authUser, window.localStorage);
    setConfirmResetAllOpen(false);
    setRefreshTick((t) => t + 1);
    if (removedCount > 0) {
      toast.success("All saved views reset", {
        description: `Restored default views across ${pageCount} ${pageCount === 1 ? "page" : "pages"}.`,
      });
    }
  };

  const handleRenameSubmit = (event) => {
    event.preventDefault();
    if (!editingView || typeof window === "undefined" || !window.localStorage) return;
    const result = renameSavedWorkView(
      authUser,
      editingView.pageKey,
      editingView.id,
      editingView.name,
      window.localStorage
    );
    if (result.duplicate) {
      toast.error("Duplicate view name", {
        description: "Another saved view on this page already uses that name.",
      });
      return;
    }
    if (result.renamed) {
      toast.success("Work view renamed", {
        description: `Renamed view to "${editingView.name.trim()}".`,
      });
    }
    setEditingView(null);
    setRefreshTick((t) => t + 1);
  };

  const handleDeleteWorkView = (pageKey, view) => {
    if (typeof window === "undefined" || !window.localStorage) return;
    deleteSavedWorkView(authUser, pageKey, view.id, window.localStorage);
    setRefreshTick((t) => t + 1);
    toast.success("Work view deleted", {
      description: `Removed "${view.name}".`,
    });
  };

  return (
    <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.08] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
            Saved views
          </h4>
          <p className="text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">
            Reset a selected page’s remembered filters, sorting, grouping, columns, and layout, or manage named work views.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasAnySaved}
          onClick={() => setConfirmResetAllOpen(true)}
          className="self-start sm:self-auto shrink-0 rounded-xl"
        >
          Reset All...
        </Button>
      </div>

      <div className="p-4 sm:p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-md">
          <div className="flex items-center gap-2 flex-wrap">
            <h5 className="text-[13.5px] font-semibold text-gray-900 dark:text-zinc-50">
              Page View State
            </h5>
            <span className={SETTINGS_STATUS_PILL_SM}>
              <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                {hasSaved && (
                  <span className={SETTINGS_DOT_CHECK}>
                    <Tick01Icon size={8} className="stroke-[3]" />
                  </span>
                )}
                <span>{hasSaved ? "Customized" : "Default"}</span>
              </span>
              <span className="h-3.5 w-px bg-black/[0.1] dark:bg-white/15 shrink-0" aria-hidden="true" />
              <span className="font-medium text-gray-500 dark:text-zinc-400">
                {hasSaved ? categorySummary : "No saved changes"}
              </span>
            </span>
          </div>
          <p className="text-xs font-normal text-gray-500 dark:text-zinc-400 leading-relaxed">
            Clear remembered filters, sorting, grouping, visible columns, and layout for the selected page.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
          <div className="w-full sm:w-56">
            <Select
              aria-label="Select page to reset"
              placeholder="Select page"
              value={selectedPage.id}
              onValueChange={setSelectedPageId}
              buttonClassName="h-10 text-[13px] font-medium"
            >
              {pages.map((page) => {
                const customized = (pageStates.get(page.id)?.keys?.length || 0) > 0;
                return (
                  <option key={page.id} value={page.id}>
                    {page.label}{customized ? " (Customized)" : ""}
                  </option>
                );
              })}
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!hasSaved}
            onClick={handleReset}
            className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs shrink-0"
          >
            Reset View
          </Button>
        </div>
      </div>

      {/* Named Work Views Manager */}
      <div className="p-4 sm:p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h5 className="text-[13.5px] font-semibold text-gray-900 dark:text-zinc-50">
              Named Work Views
            </h5>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Rename or remove views saved from page toolbars (e.g., Awaiting Payment, Needs Revision).
            </p>
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-zinc-400 tabular-nums shrink-0">
            {totalNamedViews} {totalNamedViews === 1 ? "view" : "views"}
          </span>
        </div>

        {savedWorkViewGroups.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={Bookmark02Icon}
            title="No named work views saved"
            description="Use the Views menu on a page toolbar to save one."
            className="py-5"
          />
        ) : (
          <div className="space-y-2.5">
            {savedWorkViewGroups.map(({ page, views }) => (
              <div
                key={page.id}
                className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50/70 dark:bg-zinc-900/40 p-3 space-y-2"
              >
                <div className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400">
                  {page.label}
                </div>
                <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                  {views.map((view) => {
                    const isEditing =
                      editingView?.id === view.id && editingView?.pageKey === view.pageKey;
                    const categoryText = classifySavedWorkViewState(view.state)
                      .map((id) => CATEGORY_LABELS[id] || id)
                      .join(" · ");
                    return (
                      <div
                        key={view.id}
                        className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                      >
                        {isEditing ? (
                          <form onSubmit={handleRenameSubmit} className="flex flex-1 items-center gap-2">
                            <Input
                              type="text"
                              value={editingView.name}
                              onChange={(e) =>
                                setEditingView((prev) => ({ ...prev, name: e.target.value }))
                              }
                              aria-label="Rename saved work view"
                              maxLength={60}
                              autoFocus
                              className="h-9 flex-1 text-xs"
                            />
                            <Button
                              type="submit"
                              size="sm"
                              disabled={!editingView.name.trim()}
                              className="px-3"
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingView(null)}
                              className="px-3"
                            >
                              Cancel
                            </Button>
                          </form>
                        ) : (
                          <>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Bookmark02Icon
                                size={14}
                                aria-hidden="true"
                                className="shrink-0 text-pup-maroon dark:text-red-400"
                              />
                              <div className="min-w-0">
                                <div className="truncate text-[13px] font-medium text-gray-900 dark:text-zinc-100">
                                  {view.name}
                                </div>
                                {categoryText && (
                                  <div className="truncate text-[11px] text-gray-500 dark:text-zinc-400">
                                    {categoryText}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() =>
                                  setEditingView({
                                    pageKey: view.pageKey,
                                    id: view.id,
                                    name: view.name,
                                  })
                                }
                                aria-label={`Rename ${view.name}`}
                              >
                                <PencilEdit01Icon size={13} aria-hidden="true" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => handleDeleteWorkView(view.pageKey, view)}
                                aria-label={`Delete ${view.name}`}
                                className="text-gray-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                              >
                                <Delete02Icon size={13} aria-hidden="true" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={confirmResetAllOpen} onOpenChange={setConfirmResetAllOpen}>
        <DialogContent className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-card gap-0">
          <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none text-left">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                  Reset all saved views?
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                  This will restore default filters, sorting, grouping, visible columns, and layout across{" "}
                  {customizedPages.length} customized {customizedPages.length === 1 ? "page" : "pages"} in your workspace.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            {customizedPages.length > 0 && (
              <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50/80 dark:bg-zinc-800/60 px-3.5 py-2.5">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 mb-1.5">
                  Affected pages
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {customizedPages.map((page) => (
                    <span
                      key={page.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] text-gray-700 dark:text-zinc-200"
                    >
                      {page.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmResetAllOpen(false)}
              className="h-10 px-4 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleResetAll}
              className="h-10 px-4"
            >
              Reset All Views
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
