"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!open) return;
    if (nameMatches.length > 0) {
      setSelectedStudentNo(studentKey(nameMatches[0]));
    } else {
      setSelectedStudentNo("");
    }
  }, [open, ocrSuggestion, nameMatches.length]);

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

        <div className="mt-4 rounded-brand border border-amber-200 bg-amber-50/80 p-3 space-y-2">
          <div className="text-xs font-bold text-amber-900">
            Select the correct record (student number is different for each):
          </div>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {nameMatches.map((s) => {
              const id = studentKey(s);
              const checked = selectedStudentNo === id;
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
                    className="mt-0.5"
                    checked={checked}
                    onChange={() => setSelectedStudentNo(id)}
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
            className={`w-full h-11 rounded-brand font-bold text-sm border ${
              selected
                ? "bg-pup-maroon text-white hover:bg-red-900"
                : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
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
