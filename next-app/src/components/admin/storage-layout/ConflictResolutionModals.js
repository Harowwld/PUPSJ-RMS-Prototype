"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const ConflictResolutionModals = memo(({
  applyReportOpen,
  setApplyReportOpen,
  applyReportRows,
  templateConflictOpen,
  setTemplateConflictOpen,
  reassignmentMode,
  setReassignmentMode,
  templateMappingDraft,
  setTemplateMappingDraft,
  buildAutoMappings,
  templateConflictRows,
  templateTargetOptions,
  setDragSourceKey,
  dragSourceKey,
  openApplyPreview,
  applyPreviewOpen,
  setApplyPreviewOpen,
  applyPreviewRows,
  applyTemplateWithMappings
}) => {
  return (
    <>
      <Dialog open={applyReportOpen} onOpenChange={setApplyReportOpen}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-card dark:border-white/10">
          <DialogHeader className="p-6 border-b border-gray-100 bg-transparent dark:border-white/10 dark:bg-transparent">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl border border-blue-100/30 bg-blue-50 text-blue-600 shadow-sm flex items-center justify-center shrink-0 dark:bg-blue-950/30 dark:text-blue-400 dark:shadow-none">
                <i className="ph-duotone ph-seal-check text-xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
                  Template Apply Report
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 dark:text-zinc-300">
                  Per-drawer reassignment results from the latest template apply.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6">
            <div className="max-h-[50vh] overflow-hidden overflow-auto rounded-xl border border-gray-200 dark:border-white/10">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-transparent dark:border-white/10 dark:bg-transparent">
                  <tr className="text-left text-xs tracking-wider text-gray-600 dark:text-zinc-300 dark:border-white/10">
                    <th className="p-3 font-semibold">From</th>
                    <th className="p-3 font-semibold">To</th>
                    <th className="p-3 font-semibold">Moved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {applyReportRows.length === 0 ? (
                    <tr>
                      <td className="p-3 text-gray-600 dark:text-zinc-300" colSpan={3}>
                        No reassignment details were returned.
                      </td>
                    </tr>
                  ) : (
                    applyReportRows.map((r, idx) => (
                      <tr
                        key={`${idx}-${r?.from?.room}-${r?.from?.cabinet}-${r?.from?.drawer}`}
                      >
                        <td className="p-3 text-gray-900 dark:text-zinc-50">
                          Room {r?.from?.room} / Cabinet {r?.from?.cabinet} /
                          Drawer {r?.from?.drawer}
                        </td>
                        <td className="p-3 text-gray-900 dark:text-zinc-50">
                          Room {r?.to?.room} / Cabinet {r?.to?.cabinet} / Drawer{" "}
                          {r?.to?.drawer}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/30">
                            {Number(r?.moved || 0)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-2 bg-gray-50/50 dark:bg-zinc-900/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => setApplyReportOpen(false)}
              className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={templateConflictOpen}
        onOpenChange={setTemplateConflictOpen}
      >
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-card dark:border-white/10">
          <DialogHeader className="p-6 border-b border-gray-100 bg-transparent dark:border-white/10 dark:bg-transparent">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl border border-amber-100/30 bg-amber-50 text-amber-600 shadow-sm flex items-center justify-center shrink-0 dark:bg-amber-950/30 dark:text-amber-400 dark:shadow-none">
                <i className="ph-duotone ph-warning text-xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
                  Template Conflict Resolution
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 dark:text-zinc-300">
                  This template would remove drawers that still contain student records. Map them to new locations.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 dark:border-white/10 dark:bg-zinc-900/30">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Reassignment Mode
              </div>
              <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5 w-fit">
                <button
                  type="button"
                  onClick={() => setReassignmentMode("manual")}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none",
                    reassignmentMode === "manual"
                      ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  Manual (Drag & Drop)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReassignmentMode("auto")
                    setTemplateMappingDraft(buildAutoMappings())
                  }}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none",
                    reassignmentMode === "auto"
                      ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  Map
                </button>
              </div>
            </div>
            <div className="max-h-[45vh] overflow-hidden overflow-auto rounded-xl border border-gray-200 shadow-xs dark:border-white/10 dark:shadow-none">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/75 dark:border-white/10 dark:bg-zinc-900/40">
                  <tr className="text-left text-xs tracking-wider text-gray-600 dark:text-zinc-300 dark:border-white/10">
                    <th className="p-3 font-semibold">Current Drawer</th>
                    <th className="p-3 font-semibold">Records</th>
                    <th className="p-3 font-semibold">Move To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10 bg-white dark:bg-card">
                  {templateConflictRows.map((row) => (
                    <tr key={row.sourceKey}>
                      <td className="p-3 font-semibold text-gray-900 dark:text-zinc-50">
                        {row.sourceLabel}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950/30">
                          {row.count}
                        </span>
                      </td>
                      <td className="p-3">
                        <div
                          draggable={reassignmentMode === "manual"}
                          onDragStart={() => setDragSourceKey(row.sourceKey)}
                          className={cn(
                            "mb-2 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-all",
                            reassignmentMode === "manual"
                              ? "cursor-grab border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 shadow-xs hover:border-gray-300"
                              : "border-gray-200 bg-gray-100 text-gray-400 dark:border-white/10 dark:bg-card dark:text-zinc-500"
                          )}
                          title={
                            reassignmentMode === "manual"
                              ? "Drag this source to a target option below"
                              : "Switch to Manual mode to drag"
                          }
                        >
                          <i className="ph-bold ph-dots-six-vertical mr-1.5 opacity-40"></i>
                          Drag Source
                        </div>
                        <div className="grid max-h-32 grid-cols-1 gap-1.5 overflow-auto p-0.5">
                          {templateTargetOptions.map((opt) => {
                            const selected =
                              String(
                                templateMappingDraft[row.sourceKey] || ""
                              ) === opt.key
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() =>
                                  setTemplateMappingDraft((prev) => ({
                                    ...prev,
                                    [row.sourceKey]: opt.key,
                                  }))
                                }
                                onDragOver={(e) => {
                                  if (reassignmentMode !== "manual") return
                                  e.preventDefault()
                                }}
                                onDrop={(e) => {
                                  if (reassignmentMode !== "manual") return
                                  e.preventDefault()
                                  const src = String(dragSourceKey || "")
                                  if (!src) return
                                  setTemplateMappingDraft((prev) => ({
                                    ...prev,
                                    [src]: opt.key,
                                  }))
                                }}
                                className={cn(
                                  "rounded-lg border px-3 py-2 text-left text-[11px] transition-all cursor-pointer",
                                  selected
                                    ? "border-red-200 bg-red-50 font-semibold text-pup-maroon dark:border-red-900/40 dark:bg-red-950/30 dark:text-primary shadow-xs"
                                    : "border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 font-medium hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700"
                                )}
                              >
                                {opt.label}
                              </button>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-2 bg-gray-50/50 dark:bg-zinc-900/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTemplateConflictOpen(false)}
              className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={openApplyPreview}
              className="h-10 px-5 text-xs font-semibold rounded-xl btn-brand-red text-white shadow-xs active:scale-95 transition-all cursor-pointer border-0"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={applyPreviewOpen} onOpenChange={setApplyPreviewOpen}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-card dark:border-white/10">
          <DialogHeader className="p-6 border-b border-gray-100 bg-transparent dark:border-white/10 dark:bg-transparent">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl border border-blue-100/30 bg-blue-50 text-blue-600 shadow-sm flex items-center justify-center shrink-0 dark:bg-blue-950/30 dark:text-blue-400 dark:shadow-none">
                <i className="ph-duotone ph-list-checks text-xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
                  Confirm Reassignment
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 dark:text-zinc-300">
                  Review the exact drawer movements before applying template changes.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6">
            <div className="max-h-[50vh] overflow-hidden overflow-auto rounded-xl border border-gray-200 shadow-xs dark:border-white/10 dark:shadow-none">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/75 dark:border-white/10 dark:bg-zinc-900/40">
                  <tr className="text-left text-xs tracking-wider text-gray-600 dark:text-zinc-300 dark:border-white/10">
                    <th className="p-3 font-semibold">Before</th>
                    <th className="p-3 font-semibold">After</th>
                    <th className="p-3 font-semibold text-center">Records</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10 bg-white dark:bg-card">
                  {applyPreviewRows.map((r) => (
                    <tr key={r.fromKey}>
                      <td className="p-3 text-gray-700 font-medium dark:text-zinc-200">{r.fromLabel}</td>
                      <td className="p-3 text-gray-900 font-semibold dark:text-zinc-50">
                        <i className="ph-bold ph-arrow-right mr-2 text-gray-300 dark:text-zinc-600"></i>
                        {r.toLabel}
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950/30">
                          {r.count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-2 bg-gray-50/50 dark:bg-zinc-900/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => setApplyPreviewOpen(false)}
              className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={applyTemplateWithMappings}
              className="h-10 px-5 text-xs font-semibold rounded-xl btn-brand-red text-white shadow-xs active:scale-95 transition-all cursor-pointer border-0"
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

ConflictResolutionModals.displayName = "ConflictResolutionModals"

export default ConflictResolutionModals

