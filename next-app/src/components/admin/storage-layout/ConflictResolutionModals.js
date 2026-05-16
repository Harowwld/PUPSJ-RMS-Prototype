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
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-blue-100 bg-blue-50 text-blue-600 shadow-sm flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-seal-check text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight">
                  Template Apply Report
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 leading-relaxed">
                  Per-drawer reassignment results from the latest template apply.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6">
            <div className="max-h-[50vh] overflow-auto rounded-brand border border-gray-200">
                <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                    <tr className="text-left text-xs tracking-wider text-gray-600 uppercase">
                    <th className="p-3 font-bold">From</th>
                    <th className="p-3 font-bold">To</th>
                    <th className="p-3 font-bold">Moved</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {applyReportRows.length === 0 ? (
                    <tr>
                        <td className="p-3 text-gray-600" colSpan={3}>
                        No reassignment details were returned.
                        </td>
                    </tr>
                    ) : (
                    applyReportRows.map((r, idx) => (
                        <tr
                        key={`${idx}-${r?.from?.room}-${r?.from?.cabinet}-${r?.from?.drawer}`}
                        >
                        <td className="p-3 text-gray-900">
                            Room {r?.from?.room} / Cabinet {r?.from?.cabinet} /
                            Drawer {r?.from?.drawer}
                        </td>
                        <td className="p-3 text-gray-900">
                            Room {r?.to?.room} / Cabinet {r?.to?.cabinet} / Drawer{" "}
                            {r?.to?.drawer}
                        </td>
                        <td className="p-3">
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">
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
          <div className="flex shrink-0 justify-end gap-4 border-t border-gray-100 bg-white p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setApplyReportOpen(false)}
              className="h-11 border-gray-300 px-6 text-sm font-bold tracking-wide text-gray-600 uppercase hover:bg-gray-50 rounded-brand"
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
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-amber-100 bg-amber-50 text-amber-600 shadow-sm flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-warning text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight">
                  Template Conflict Resolution
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 leading-relaxed">
                  This template would remove drawers that still contain student records. Map them to new locations.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="rounded-brand border border-gray-200 bg-gray-50/60 p-3">
                <div className="mb-2 text-[10px] font-black tracking-widest text-gray-500 uppercase">
                Reassignment Mode
                </div>
                <div className="flex gap-2">
                <Button
                    type="button"
                    variant={reassignmentMode === "manual" ? "default" : "outline"}
                    onClick={() => setReassignmentMode("manual")}
                    className="h-9 px-4 text-xs font-bold rounded-brand"
                >
                    Manual (Drag & Drop)
                </Button>
                <Button
                    type="button"
                    variant={reassignmentMode === "auto" ? "default" : "outline"}
                    onClick={() => {
                        setReassignmentMode("auto")
                        setTemplateMappingDraft(buildAutoMappings())
                    }}
                    className="h-9 px-4 text-xs font-bold rounded-brand"
                >
                    Auto Map
                </Button>
                </div>
            </div>
            <div className="max-h-[45vh] overflow-auto rounded-brand border border-gray-200 shadow-inner">
                <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                    <tr className="text-left text-xs tracking-wider text-gray-600 uppercase">
                    <th className="p-3 font-bold">Current Drawer</th>
                    <th className="p-3 font-bold">Records</th>
                    <th className="p-3 font-bold">Move To</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {templateConflictRows.map((row) => (
                    <tr key={row.sourceKey}>
                        <td className="p-3 font-bold text-gray-900">
                        {row.sourceLabel}
                        </td>
                        <td className="p-3">
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900">
                            {row.count}
                        </span>
                        </td>
                        <td className="p-3">
                        <div
                            draggable={reassignmentMode === "manual"}
                            onDragStart={() => setDragSourceKey(row.sourceKey)}
                            className={`mb-2 rounded-brand border px-2.5 py-2 text-xs font-black transition-all ${
                            reassignmentMode === "manual"
                                ? "cursor-grab border-gray-300 bg-white hover:border-pup-maroon/40 shadow-sm"
                                : "border-gray-200 bg-gray-100 text-gray-400"
                            }`}
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
                                className={`rounded-brand border px-3 py-2 text-left text-[11px] transition-all ${
                                    selected
                                    ? "border-pup-maroon bg-red-50 font-black text-pup-maroon shadow-sm"
                                    : "border-gray-200 bg-white text-gray-600 font-medium hover:border-gray-300 hover:bg-gray-50"
                                }`}
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
          <div className="flex shrink-0 justify-end gap-4 border-t border-gray-100 bg-white p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTemplateConflictOpen(false)}
              className="h-11 border-gray-300 px-6 text-sm font-bold tracking-wide text-gray-600 uppercase hover:bg-gray-50 rounded-brand"
            >
              Cancel
            </Button>
            <Button 
                type="button" 
                onClick={openApplyPreview}
                className="h-11 bg-pup-maroon px-8 text-sm font-bold tracking-wide text-white uppercase hover:bg-red-900 shadow-sm rounded-brand"
            >
              Continue Reassignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={applyPreviewOpen} onOpenChange={setApplyPreviewOpen}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-blue-100 bg-blue-50 text-blue-600 shadow-sm flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-list-checks text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight">
                  Confirm Reassignment
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 leading-relaxed">
                  Review the exact drawer movements before applying template changes.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6">
            <div className="max-h-[50vh] overflow-auto rounded-brand border border-gray-200 shadow-inner">
                <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                    <tr className="text-left text-xs tracking-wider text-gray-600 uppercase">
                    <th className="p-3 font-bold">Before</th>
                    <th className="p-3 font-bold">After</th>
                    <th className="p-3 font-bold text-center">Records</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {applyPreviewRows.map((r) => (
                    <tr key={r.fromKey}>
                        <td className="p-3 text-gray-700 font-medium">{r.fromLabel}</td>
                        <td className="p-3 text-gray-900 font-bold">
                            <i className="ph-bold ph-arrow-right mr-2 text-gray-300"></i>
                            {r.toLabel}
                        </td>
                        <td className="p-3 text-center">
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-900">
                            {r.count}
                        </span>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          </div>
          <div className="flex shrink-0 justify-end gap-4 border-t border-gray-100 bg-white p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setApplyPreviewOpen(false)}
              className="h-11 border-gray-300 px-6 text-sm font-bold tracking-wide text-gray-600 uppercase hover:bg-gray-50 rounded-brand"
            >
              Back
            </Button>
            <Button 
                type="button" 
                onClick={applyTemplateWithMappings}
                className="h-11 bg-pup-maroon px-8 text-sm font-bold tracking-wide text-white uppercase hover:bg-red-900 shadow-sm rounded-brand flex items-center gap-2"
            >
              <i className="ph-bold ph-check text-lg"></i>
              Apply Template + Reassign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

ConflictResolutionModals.displayName = "ConflictResolutionModals"

export default ConflictResolutionModals
