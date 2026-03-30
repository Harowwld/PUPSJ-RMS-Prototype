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
    (s) => studentKey(s) === manualSelectedStudentNo,
  )
    ? manualSelectedStudentNo
    : defaultSelectedStudentNo;

  if (!open) return null;

  const detectedName =
    String(ocrSuggestion?.name || "").trim() || "(not detected)";
  const selected = nameMatches.find((s) => studentKey(s) === selectedStudentNo);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg p-6 bg-white rounded-brand border-gray-300 shadow-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-pup-maroon">
            Same name, different student numbers
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-gray-700 font-medium">
            OCR matched multiple records for{" "}
            <span className="font-bold text-gray-900">{detectedName}</span>.
            Choose which student number this document belongs to. The form is
            already filled with the scanned name and document type.
          </DialogDescription>
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
                  className={`flex items-start gap-2 rounded-md border p-2 cursor-pointer text-xs ${
                    checked
                      ? "border-pup-maroon bg-red-50/60"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="ocr-student-pick"
                    className="mt-1"
                    checked={checked}
                    onChange={() => setManualSelectedStudentNo(id)}
                  />
                  <span className="flex-1">
                    <span className="font-mono font-bold text-gray-900">
                      {id}
                    </span>
                    <span className="block text-gray-700 font-medium">
                      {s.name}
                    </span>
                    <span className="block text-gray-500">
                      {s.courseCode || s.course_code} · Year{" "}
                      {s.yearLevel ?? s.year_level} · {s.section}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2">
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
            Use selected student
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-brand font-bold text-sm bg-white border border-gray-300 text-gray-700 hover:border-pup-maroon"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
