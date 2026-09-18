"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { memo } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"
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
      {/* 1. Template Conflict Resolution Modal */}
      <Dialog
        open={templateConflictOpen}
        onOpenChange={setTemplateConflictOpen}
      >
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-card dark:border-white/10 gap-0">
          <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none text-left">
            <DialogTitle className="text-[17px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
              Template Conflict Resolution
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400 leading-relaxed">
              The selected room template removes drawers that currently store student documents. Reassign these records to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-5">
            {/* Reassignment Mode Control Panel */}
            <div className="rounded-xl border border-gray-200/80 bg-gray-50/60 p-4 dark:border-white/10 dark:bg-zinc-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                  Reassignment Strategy
                </div>
                <div className="text-[12px] text-gray-500 dark:text-zinc-400 mt-0.5">
                  {reassignmentMode === "auto"
                    ? "Automatically maps displaced drawers to available drawers in the selected template."
                    : "Manually choose destination drawers from dropdowns or drag-and-drop targets."}
                </div>
              </div>
              <div className="flex items-center gap-1 bg-gray-200/60 dark:bg-zinc-800/80 p-1 rounded-xl border border-gray-200/60 dark:border-white/5 shrink-0">
                <button
                  type="button"
                  onClick={() => setReassignmentMode("manual")}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none active:scale-95",
                    reassignmentMode === "manual"
                      ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  Manual
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReassignmentMode("auto")
                    setTemplateMappingDraft(buildAutoMappings())
                  }}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none active:scale-95",
                    reassignmentMode === "auto"
                      ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  Auto Map
                </button>
              </div>
            </div>

            {/* Conflict Resolution Mapping Table */}
            <div className="max-h-[46vh] overflow-auto rounded-xl border border-gray-200/80 dark:border-white/10 shadow-xs bg-white dark:bg-card">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-200/80 bg-gray-50/90 dark:border-white/10 dark:bg-zinc-900/60 backdrop-blur-xs">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                    <th className="py-3 px-4 w-[28%] font-semibold">Displaced Drawer</th>
                    <th className="py-3 px-4 w-[18%] font-semibold">Affected Records</th>
                    <th className="py-3 px-4 w-[54%] font-semibold">Target Destination</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-card">
                  {templateConflictRows.map((row) => (
                    <tr key={row.sourceKey} className="hover:bg-gray-50/40 dark:hover:bg-white/2 transition-colors">
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300 shrink-0">
                            <HugeIcon  className="ph-bold ph-archive text-sm" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                              {row.sourceLabel}
                            </div>
                            <div className="text-[11px] text-gray-400 dark:text-zinc-500">
                              Current Location
                            </div>
                          </div>
                        </div>

                        {reassignmentMode === "manual" && (
                          <div
                            draggable
                            onDragStart={() => setDragSourceKey(row.sourceKey)}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:border-white/10 dark:bg-zinc-800/80 dark:text-zinc-300 cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-zinc-700/60 transition-all select-none shadow-2xs"
                            title="Drag to any destination option on the right"
                          >
                            <HugeIcon  className="ph-bold ph-dots-six-vertical text-gray-400 dark:text-zinc-500" />
                            <span>Drag Handle</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
                          
                          {row.count} {row.count === 1 ? "record" : "records"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 align-top space-y-2">
                        {/* Unified Select Dropdown */}
                        <Select
                          value={templateMappingDraft[row.sourceKey] || ""}
                          onChange={(e) =>
                            setTemplateMappingDraft((prev) => ({
                              ...prev,
                              [row.sourceKey]: e.target.value,
                            }))
                          }
                          placeholder="Select target drawer..."
                          className="h-9 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-medium text-gray-900 dark:text-zinc-100 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80"
                          menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                          optionClassName="rounded-lg text-xs font-normal py-1.5 px-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800"
                        >
                          <option value="" disabled>Select destination drawer...</option>
                          {templateTargetOptions.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>

                        {/* Interactive Drag & Drop Target Chips */}
                        <div className="grid max-h-28 grid-cols-1 sm:grid-cols-2 gap-1.5 overflow-auto p-0.5">
                          {templateTargetOptions.map((opt) => {
                            const selected =
                              String(templateMappingDraft[row.sourceKey] || "") === opt.key
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
                                  "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs transition-all cursor-pointer select-none",
                                  selected
                                    ? "border-pup-maroon bg-red-50/80 font-semibold text-pup-maroon dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 shadow-2xs ring-1 ring-pup-maroon/20"
                                    : "border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-300 font-normal hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700/60"
                                )}
                              >
                                <span className="truncate">{opt.label}</span>
                                {selected && (
                                  <HugeIcon  className="ph-bold ph-check text-xs text-pup-maroon dark:text-red-400 ml-1.5 shrink-0" />
                                )}
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

          <DialogFooter className="p-6 pt-4 bg-white dark:bg-card border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-2.5">
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
              className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white shadow-xs active:scale-95 transition-all cursor-pointer border-0"
            >
              Continue to Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Confirm Reassignment Preview Modal */}
      <Dialog open={applyPreviewOpen} onOpenChange={setApplyPreviewOpen}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-card dark:border-white/10 gap-0">
          <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none text-left">
            <DialogTitle className="text-[17px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
              Confirm Reassignment
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400 leading-relaxed">
              Review the drawer migrations before applying the new room layout template.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6">
            <div className="max-h-[50vh] overflow-auto rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-card shadow-xs">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-200/80 bg-gray-50/90 dark:border-white/10 dark:bg-zinc-900/60 backdrop-blur-xs">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                    <th className="py-3 px-4 font-semibold">Original Location</th>
                    <th className="py-3 px-4 font-semibold">New Destination</th>
                    <th className="py-3 px-4 font-semibold text-center">Records Moved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-card">
                  {applyPreviewRows.map((r) => (
                    <tr key={r.fromKey} className="hover:bg-gray-50/40 dark:hover:bg-white/2 transition-colors">
                      <td className="py-3 px-4 text-xs font-medium text-gray-700 dark:text-zinc-300">
                        {r.fromLabel}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-gray-900 dark:text-zinc-100">
                        <div className="flex items-center gap-2">
                          <HugeIcon  className="ph-bold ph-arrow-right text-gray-400 dark:text-zinc-600 text-xs shrink-0" />
                          <span>{r.toLabel}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
                          
                          {r.count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 bg-white dark:bg-card border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-2.5">
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
              className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white shadow-xs active:scale-95 transition-all cursor-pointer border-0"
            >
              Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Template Apply Results Report Modal */}
      <Dialog open={applyReportOpen} onOpenChange={setApplyReportOpen}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-card dark:border-white/10 gap-0">
          <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none text-left">
            <DialogTitle className="text-[17px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
              Template Apply Report
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400 leading-relaxed">
              Per-drawer reassignment results from the latest template application.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6">
            <div className="max-h-[50vh] overflow-auto rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-card shadow-xs">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-200/80 bg-gray-50/90 dark:border-white/10 dark:bg-zinc-900/60 backdrop-blur-xs">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                    <th className="py-3 px-4 font-semibold">From Location</th>
                    <th className="py-3 px-4 font-semibold">To Destination</th>
                    <th className="py-3 px-4 font-semibold text-center">Records Migrated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-card">
                  {applyReportRows.length === 0 ? (
                    <tr>
                      <td className="py-6 px-4 text-center text-xs text-gray-500 dark:text-zinc-400" colSpan={3}>
                        No reassignment details were returned.
                      </td>
                    </tr>
                  ) : (
                    applyReportRows.map((r, idx) => (
                      <tr
                        key={`${idx}-${r?.from?.room}-${r?.from?.cabinet}-${r?.from?.drawer}`}
                        className="hover:bg-gray-50/40 dark:hover:bg-white/2 transition-colors"
                      >
                        <td className="py-3 px-4 text-xs font-medium text-gray-700 dark:text-zinc-300">
                          Room {r?.from?.room} · Cabinet {r?.from?.cabinet} · Drawer {r?.from?.drawer}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-gray-900 dark:text-zinc-100">
                          <div className="flex items-center gap-2">
                            <HugeIcon  className="ph-bold ph-arrow-right text-gray-400 dark:text-zinc-600 text-xs shrink-0" />
                            <span>Room {r?.to?.room} · Cabinet {r?.to?.cabinet} · Drawer {r?.to?.drawer}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                            
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

          <DialogFooter className="p-6 pt-4 bg-white dark:bg-card border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setApplyReportOpen(false)}
              className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})

ConflictResolutionModals.displayName = "ConflictResolutionModals"

export default ConflictResolutionModals
