"use client"

import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

function studentKey(s) {
  return String(s?.studentNo ?? s?.student_no ?? "")
}

export default function OCRPromptModal({
  open,
  onClose,
  ocrSuggestion,
  onConfirmStudent,
}) {
  const [selectedStudentNo, setSelectedStudentNo] = useState("")

  const nameMatches = Array.isArray(ocrSuggestion?.nameMatchesByName)
    ? ocrSuggestion.nameMatchesByName
    : []

  const defaultSelectedStudentNo =
    open && nameMatches.length > 0 ? studentKey(nameMatches[0]) : ""

  const resolvedSelectedStudentNo = nameMatches.some(
    (s) => studentKey(s) === selectedStudentNo
  )
    ? selectedStudentNo
    : defaultSelectedStudentNo

  if (!open) return null

  const detectedName =
    String(ocrSuggestion?.name || "").trim() || "(not detected)"
  const selected = nameMatches.find((s) => studentKey(s) === selectedStudentNo)

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSelectedStudentNo("")
          onClose()
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-hidden border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-lg">
        <DialogHeader className="border-b border-gray-100 bg-gray-50/50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-100 bg-amber-50 text-amber-600 shadow-sm">
              <i className="ph-duotone ph-scanner text-2xl"></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black tracking-tight text-gray-900">
                OCR Match Resolution Required
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-medium text-gray-600">
                The optical character recognition system detected multiple
                student records matching the scanned name. Please select the
                correct student number to ensure accurate document association.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          <div className="mb-4">
            <div className="mb-2 text-[11px] font-bold tracking-widest text-gray-500 uppercase">
              Detected Name from Document
            </div>
            <div className="rounded-brand border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-pup-maroon">
              {detectedName}
            </div>
          </div>

          <div className="mb-2 text-[11px] font-bold tracking-widest text-gray-500 uppercase">
            Select Correct Student Record
          </div>
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-brand border border-gray-200 p-2">
            {nameMatches.map((s) => {
              const id = studentKey(s)
              const checked = resolvedSelectedStudentNo === id
              return (
                <label
                  key={id}
                  className={`flex cursor-pointer items-start gap-3 rounded-brand border p-3 transition-colors ${
                    checked
                      ? "border-pup-maroon bg-red-50/60"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="ocr-student-pick"
                    className="mt-1"
                    checked={checked}
                    onChange={() => setSelectedStudentNo(id)}
                  />
                  <span className="flex-1">
                    <span className="font-mono text-sm font-bold text-gray-900">
                      {id}
                    </span>
                    <span className="block font-medium text-gray-700">
                      {s.name}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {s.courseCode || s.course_code} · Year{" "}
                      {s.yearLevel ?? s.year_level} · {s.section}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-brand border border-gray-300 px-5 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => selected && onConfirmStudent(selected)}
            disabled={!selected}
            className={`h-11 rounded-brand px-5 text-sm font-bold shadow-sm ${
              selected
                ? "bg-pup-maroon text-white hover:bg-red-900"
                : "cursor-not-allowed bg-gray-100 text-gray-400"
            }`}
          >
            Confirm Selection
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
