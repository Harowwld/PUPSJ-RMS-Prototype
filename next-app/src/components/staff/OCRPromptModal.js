"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function studentKey(s) {
  return String(s?.studentNo ?? s?.student_no ?? "");
}

export default function OCRPromptModal({
  open,
  onClose,
  ocrSuggestion,
  onConfirmStudent,
}) {
  const [selectedStudentNo, setSelectedStudentNo] = useState("");

  const nameMatches = Array.isArray(ocrSuggestion?.nameMatchesByName)
    ? ocrSuggestion.nameMatchesByName
    : [];

  const defaultSelectedStudentNo =
    open && nameMatches.length > 0 ? studentKey(nameMatches[0]) : "";

  const resolvedSelectedStudentNo = nameMatches.some(
    (s) => studentKey(s) === selectedStudentNo,
  )
    ? selectedStudentNo
    : defaultSelectedStudentNo;

  if (!open) return null;

  const detectedName =
    String(ocrSuggestion?.name || "").trim() || "(not detected)";
  const selected = nameMatches.find((s) => studentKey(s) === selectedStudentNo);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { setSelectedStudentNo(""); onClose(); }}}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl max-h-[90vh]">
        <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full border border-amber-100 bg-amber-50 text-amber-600 shadow-sm flex items-center justify-center shrink-0">
              <i className="ph-duotone ph-scanner text-2xl"></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black tracking-tight text-gray-900">
                OCR Match Resolution Required
              </DialogTitle>
              <DialogDescription className="text-sm font-medium mt-1 text-gray-600">
                The optical character recognition system detected multiple student records matching the scanned name. Please select the correct student number to ensure accurate document association.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          <div className="mb-4">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              Detected Name from Document
            </div>
            <div className="text-sm font-bold text-pup-maroon bg-red-50 border border-red-100 rounded-brand px-3 py-2">
              {detectedName}
            </div>
          </div>

          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
            Select Correct Student Record
          </div>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto rounded-brand border border-gray-200 p-2">
            {nameMatches.map((s) => {
              const id = studentKey(s);
              const checked = resolvedSelectedStudentNo === id;
              return (
                <label
                  key={id}
                  className={`flex items-start gap-3 rounded-brand border p-3 cursor-pointer transition-colors ${
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
                    <span className="font-mono font-bold text-gray-900 text-sm">{id}</span>
                    <span className="block text-gray-700 font-medium">{s.name}</span>
                    <span className="block text-gray-500 text-xs">
                      {s.courseCode || s.course_code} · Year {s.yearLevel ?? s.year_level} · {s.section}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 text-sm font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => selected && onConfirmStudent(selected)}
            disabled={!selected}
            className={`h-11 px-5 text-sm font-bold shadow-sm rounded-brand ${
              selected
                ? "bg-pup-maroon text-white hover:bg-red-900"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            Confirm Selection
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
