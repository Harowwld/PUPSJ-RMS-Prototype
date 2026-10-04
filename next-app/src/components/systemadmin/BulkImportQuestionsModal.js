"use client";

import React, { useState, useMemo, useRef } from "react";
import HugeIcon from "@/components/shared/HugeIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Normalizes question text for deduplication comparison.
 */
function normalizeForComparison(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sanitizes question line:
 * - strips bullets (•, -, *, >, →, –, —, etc.)
 * - strips numbering (1., 2), [3], etc.)
 * - normalizes curly/smart quotes
 * - trims whitespace
 */
function sanitizeQuestionLine(raw) {
  if (!raw) return "";

  let cleaned = String(raw).trim();

  // Strip leading list numbers: "1.", "1)", "(1)", "[1]", "1 -"
  cleaned = cleaned.replace(/^(\d+[\.\)\-:]|\([0-9]+\)|\[[0-9]+\])\s*/, "");

  // Strip leading bullets / symbols: •, -, *, >, →, –, —
  cleaned = cleaned.replace(/^[\s\u2022\u25E6\u25AA\u25CF•\-\*\>→–—]+\s*/, "");

  // Normalize quotes
  cleaned = cleaned
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

  return cleaned.trim();
}

/**
 * Parses CSV or text file content into structured question rows.
 */
function parseFileQuestions(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  let startIndex = 0;
  const firstLineNorm = lines[0].toLowerCase().replace(/[^a-z]/g, "");
  // Skip header row if present
  if (firstLineNorm.startsWith("question") || firstLineNorm.includes("challenge")) {
    startIndex = 1;
  }

  const results = [];
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const rowValues = [];
    let cur = "";
    let insideQuote = false;

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === "," && !insideQuote) {
        rowValues.push(cur.trim());
        cur = "";
      } else {
        cur += char;
      }
    }
    rowValues.push(cur.trim());

    let questionText = rowValues[0] || "";
    if (questionText.startsWith('"') && questionText.endsWith('"')) {
      questionText = questionText.slice(1, -1).trim();
    }

    let isRequired = false;
    if (rowValues[1]) {
      const reqVal = rowValues[1].toLowerCase().replace(/[^a-z0-9]/g, "");
      if (reqVal === "true" || reqVal === "1" || reqVal === "yes" || reqVal === "required") {
        isRequired = true;
      }
    }

    const cleaned = sanitizeQuestionLine(questionText);
    if (cleaned) {
      results.push({
        id: Math.random().toString(36).slice(2, 9),
        text: cleaned,
        is_required: isRequired,
      });
    }
  }

  return results;
}

const createNewRow = () => ({
  id: Math.random().toString(36).slice(2, 9),
  text: "",
  is_required: false,
});

export default function BulkImportQuestionsModal({
  open,
  onOpenChange,
  existingQuestions = [],
  onImport,
}) {
  const [fileInfo, setFileInfo] = useState(null); // { name, size }
  const [rows, setRows] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFileInfo(null);
    setRows([]);
    setIsDragActive(false);
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange?.(nextOpen);
  };

  // Set of existing question strings for duplication lookup
  const existingSet = useMemo(() => {
    const set = new Set();
    for (const q of existingQuestions) {
      const text = typeof q === "string" ? q : q?.question;
      const normalized = normalizeForComparison(text);
      if (normalized) set.add(normalized);
    }
    return set;
  }, [existingQuestions]);

  // Compute row-level validation
  const evaluatedRows = useMemo(() => {
    const normalizedCounts = new Map();
    for (const row of rows) {
      const trimmed = row.text.trim();
      if (trimmed) {
        const norm = normalizeForComparison(trimmed);
        normalizedCounts.set(norm, (normalizedCounts.get(norm) || 0) + 1);
      }
    }

    return rows.map((row) => {
      const trimmed = row.text.trim();
      if (!trimmed) {
        return {
          ...row,
          trimmed: "",
          status: "empty",
          message: "Question cannot be blank (min. 10 characters).",
        };
      }

      const norm = normalizeForComparison(trimmed);
      const uniqueCharCount = new Set(trimmed.toLowerCase().replace(/\s/g, "")).size;

      if (trimmed.length < 10) {
        return {
          ...row,
          trimmed,
          status: "short",
          message: `Must be at least 10 characters (${trimmed.length}/10).`,
        };
      }

      if (uniqueCharCount < 5) {
        return {
          ...row,
          trimmed,
          status: "simple",
          message: "Question is too simple or repetitive.",
        };
      }

      if (existingSet.has(norm)) {
        return {
          ...row,
          trimmed,
          status: "exists",
          message: "Question already exists in system.",
        };
      }

      if ((normalizedCounts.get(norm) || 0) > 1) {
        return {
          ...row,
          trimmed,
          status: "duplicate",
          message: "Duplicate question in this list.",
        };
      }

      return {
        ...row,
        trimmed,
        status: "valid",
        message: "Valid challenge question.",
      };
    });
  }, [rows, existingSet]);

  const validRows = evaluatedRows.filter((r) => r.status === "valid");
  const hasErrors = evaluatedRows.some((r) => r.status !== "valid");
  const canImport = validRows.length > 0 && !hasErrors;

  const handleFileProcess = async (file) => {
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseFileQuestions(text);

      setFileInfo({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
      });

      if (parsed.length > 0) {
        setRows(parsed);
      } else {
        setRows([createNewRow()]);
      }
    } catch (err) {
      console.error("[BulkImport Error]:", err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleRowChange = (index, value) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], text: value };
      return copy;
    });
  };

  const handleToggleRequired = (index) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], is_required: !copy[index].is_required };
      return copy;
    });
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, createNewRow()]);
  };

  const handleRemoveRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDownloadTemplate = () => {
    const templateContent = "question,required\nWhat was the name of your first elementary school?,false\nWhat was the make and model of your first vehicle?,false\nWhat city were your parents born in?,false\n";
    const blob = new Blob([templateContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "security_questions_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!canImport) return;

    const formatted = validRows.map((r) => ({
      id: Date.now() + Math.random(),
      question: r.trimmed,
      is_required: Boolean(r.is_required),
    }));

    onImport?.(formatted);
    resetState();
    onOpenChange?.(false);
  };

  const handleCancel = () => {
    resetState();
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-white border border-border shadow-2xl rounded-2xl dark:bg-card dark:border-border gap-0 font-jakarta">
        {/* Header - Strictly NO ICON */}
        <DialogHeader className="p-6 pb-0 bg-white dark:bg-card border-none min-w-0">
          <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
            Import Security Questions
          </DialogTitle>
          <DialogDescription className="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-1">
            {fileInfo
              ? "Review and double-check questions extracted from your file before importing."
              : "Select a CSV or text file from your device to double-check and import questions."}
          </DialogDescription>
        </DialogHeader>

        {/* Form Body */}
        <div className="p-6 space-y-4 min-w-0 bg-white dark:bg-card">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,text/plain,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {!fileInfo ? (
            /* File Drop / Select Area */
            <div className="space-y-3">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
                  isDragActive
                    ? "border-pup-maroon bg-pup-maroon/5 dark:bg-pup-maroon/10"
                    : "border-border hover:border-pup-maroon/60 dark:border-border dark:hover:border-pup-maroon/60 bg-gray-50/40 dark:bg-zinc-900/20"
                )}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                    Select a CSV or TXT file
                  </p>
                  <p className="text-[11px] text-gray-900 dark:text-zinc-300 max-w-xs">
                    Drag and drop file here, or click to choose from your device
                  </p>
                </div>

                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    Browse
                  </Button>
                </div>
              </div>

              {/* Template Download Option */}
              <div className="flex items-center justify-between px-1 text-[11px] text-gray-900 dark:text-zinc-300">
                <span>Accepted format: .csv with &apos;question&apos; header or .txt line-by-line</span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDownloadTemplate}
                  className="h-7 px-2 text-[11px] font-semibold text-pup-maroon hover:text-pup-darkMaroon dark:text-red-400 hover:bg-transparent underline cursor-pointer p-0 shadow-none border-0"
                >
                  Template
                </Button>
              </div>
            </div>
          ) : (
            /* Double-Check & Review Area */
            <div className="space-y-3">
              {/* File Info & Action Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 dark:bg-zinc-900/40 border border-border/60 dark:border-border">
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                      {fileInfo.name}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                      {fileInfo.size}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-900 dark:text-zinc-300 mt-0.5">
                    {validRows.length} valid of {rows.length} extracted question{rows.length > 1 ? "s" : ""}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 px-3 text-[11px] font-semibold rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
                >
                  Change
                </Button>
              </div>

              {/* Scrollable Structured Verification Rows */}
              <div className="max-h-[300px] overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                {evaluatedRows.map((row, index) => {
                  const isInvalid = row.status !== "empty" && row.status !== "valid";
                  const isValid = row.status === "valid";

                  return (
                    <div
                      key={row.id}
                      className="rounded-xl border border-border/80 dark:border-border bg-gray-50/30 dark:bg-zinc-900/40 p-3 space-y-2 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        {/* Index Badge */}
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold font-mono text-xs border border-border dark:border-border shadow-2xs shrink-0">
                          {index + 1}
                        </span>

                        {/* Editable Structured Question Input */}
                        <Input
                          type="text"
                          value={row.text}
                          onChange={(e) => handleRowChange(index, e.target.value)}
                          placeholder="Challenge question text..."
                          className={cn(
                            "h-9 w-full rounded-xl border bg-white dark:bg-zinc-800 text-xs text-gray-900 dark:text-zinc-100 px-3 placeholder:text-gray-400 dark:placeholder:text-zinc-500 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-2xs",
                            isInvalid
                              ? "border-amber-400 dark:border-amber-600 focus-visible:ring-amber-500"
                              : isValid
                              ? "border-emerald-300 dark:border-emerald-700 focus-visible:ring-emerald-500"
                              : "border-border dark:border-border"
                          )}
                        />

                        {/* Optional / Required Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleRequired(index)}
                          className={cn(
                            "px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer shrink-0 active:scale-95",
                            row.is_required
                              ? "text-pup-maroon dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900/50"
                              : "text-gray-900 dark:text-zinc-300 bg-white dark:bg-zinc-800 border-border dark:border-border hover:border-border"
                          )}
                        >
                          {row.is_required ? "Required" : "Optional"}
                        </button>

                        {/* Remove Action */}
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-all cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900/50 active:scale-95 shrink-0"
                          aria-label="Remove Question"
                        >
                          <HugeIcon className="ph-bold ph-trash text-sm" />
                        </button>
                      </div>

                      {/* Inline Validation Guidance */}
                      <div className="flex items-center justify-between px-1 text-[11px]">
                        <span
                          className={cn(
                            "flex items-center gap-1.5",
                            row.status === "empty" && "text-gray-400 dark:text-zinc-500",
                            isInvalid && "text-amber-600 dark:text-amber-400 font-medium",
                            isValid && "text-emerald-600 dark:text-emerald-400 font-medium"
                          )}
                        >
                          {isInvalid && <HugeIcon className="ph-bold ph-warning-circle text-xs" />}
                          {isValid && <HugeIcon className="ph-bold ph-check-circle text-xs" />}
                          {row.message}
                        </span>

                        {row.trimmed.length > 0 && (
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                            {row.trimmed.length} chars
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Row Button - Text-Only Action Word */}
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddRow}
                  className="w-full h-9 text-xs font-semibold rounded-xl border border-dashed border-border dark:border-border hover:border-pup-maroon/60 dark:hover:border-pup-maroon/60 bg-gray-50/40 hover:bg-pup-maroon/5 dark:bg-zinc-900/20 dark:hover:bg-pup-maroon/10 text-gray-700 dark:text-zinc-300 hover:text-pup-maroon dark:hover:text-pup-maroon shadow-none cursor-pointer active:scale-95 transition-all"
                >
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Only Action Word Buttons */}
        <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!canImport}
            className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-30 disabled:grayscale-[0.5] disabled:cursor-not-allowed border-0"
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
