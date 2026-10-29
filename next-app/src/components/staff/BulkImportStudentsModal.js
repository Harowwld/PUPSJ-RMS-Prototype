"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { Select } from "@/components/ui/select";
import { cn, formatTitleCase } from "@/lib/utils";
import { canonicalizeCabinetId } from "@/lib/storageLayoutUtils";
import { formatErrorMessage } from "@/lib/errorUtils";
import useTableScroll from "@/hooks/useTableScroll";
import TableScrollControls from "@/components/shared/TableScrollControls";

export default function BulkImportStudentsModal({
  open,
  onOpenChange,
  storageLayout = null,
  courses = [],
  sections = [],
  onSuccess,
  showToast = () => {},
}) {
  const [csvFile, setCsvFile] = useState(null);
  const [csvRows, setCsvRows] = useState([]);
  const [csvSelected, setCsvSelected] = useState({});
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResults, setCsvResults] = useState([]);
  const [csvError, setCsvError] = useState("");

  const [csvBulkRoom, setCsvBulkRoom] = useState("");
  const [csvBulkCabinet, setCsvBulkCabinet] = useState("");
  const [csvBulkDrawer, setCsvBulkDrawer] = useState("");
  const [csvDropActive, setCsvDropActive] = useState(false);

  const [csvPage, setCsvPage] = useState(1);
  const [csvRowsPerPage] = useState(10);
  const [localCsvSearch, setLocalCsvSearch] = useState("");
  const [csvSearch, setCsvSearch] = useState("");

  const csvInputRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setCsvSearch(localCsvSearch);
      setCsvPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [localCsvSearch]);

  // Reset modal state on open/close
  useEffect(() => {
    const timer = setTimeout(() => {
    if (!open) {
      setCsvFile(null);
      setCsvRows([]);
      setCsvSelected({});
      setCsvResults([]);
      setCsvError("");
      setLocalCsvSearch("");
      setCsvSearch("");
      setCsvPage(1);
      setCsvBulkRoom("");
      setCsvBulkCabinet("");
      setCsvBulkDrawer("");
      if (csvInputRef.current) csvInputRef.current.value = "";
    } else {
      // Default bulk location to first available room/cabinet/drawer
      const firstRoom = storageLayout?.rooms?.[0];
      if (firstRoom) {
        setCsvBulkRoom(String(firstRoom.id));
        const firstCab = firstRoom.cabinets?.[0];
        if (firstCab) {
          setCsvBulkCabinet(canonicalizeCabinetId(firstCab.id));
          const firstDrawer = firstCab.drawerIds?.[0] || 1;
          setCsvBulkDrawer(String(firstDrawer));
        }
      }
    }
    }, 0);
    return () => clearTimeout(timer);
  }, [open, storageLayout]);

  // Helper functions for storage layout validation
  const roomOptions = useMemo(() => {
    return storageLayout?.rooms?.map((r) => r.id) || [];
  }, [storageLayout]);

  const coerceRoomId = (v) => {
    if (typeof v === "number") return v;
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : null;
  };

  const getRoomDef = (roomIdRaw) => {
    const roomId = coerceRoomId(roomIdRaw);
    if (roomId == null) return null;
    return storageLayout?.rooms?.find((r) => r.id === roomId) || null;
  };

  const getCabinetsForRoom = (roomIdRaw) => getRoomDef(roomIdRaw)?.cabinets || [];

  const getDrawerIdsFor = (roomIdRaw, cabinetIdRaw) => {
    const roomDef = getRoomDef(roomIdRaw);
    const cabId = canonicalizeCabinetId(cabinetIdRaw);
    if (!roomDef || !cabId) return [];
    const cab = roomDef.cabinets.find((c) => canonicalizeCabinetId(c.id) === cabId);
    return cab?.drawerIds || [];
  };

  const isLocationValid = (roomIdRaw, cabIdRaw, drawerRaw) => {
    const roomId = coerceRoomId(roomIdRaw);
    const cabId = canonicalizeCabinetId(cabIdRaw);
    const drawerId = parseInt(String(drawerRaw || ""), 10);
    if (roomId == null || !cabId || !Number.isFinite(drawerId)) return false;

    const roomDef = storageLayout?.rooms?.find((r) => r.id === roomId);
    if (!roomDef) return false;

    const cabDef = roomDef.cabinets?.find((c) => canonicalizeCabinetId(c.id) === cabId);
    if (!cabDef) return false;

    return cabDef.drawerIds?.includes(drawerId);
  };

  const mergeSelectedCabinetId = (roomIdRaw, cabIdRaw) => {
    const cabId = canonicalizeCabinetId(cabIdRaw);
    const ids = getCabinetsForRoom(roomIdRaw).map((c) => canonicalizeCabinetId(c.id));
    if (ids.length === 0) {
      const allCabs = Array.from(
        new Set(
          storageLayout?.rooms?.flatMap((r) =>
            r.cabinets.map((c) => canonicalizeCabinetId(c.id))
          ) || []
        )
      );
      if (cabId && !allCabs.includes(cabId)) return [cabId, ...allCabs];
      return allCabs;
    }
    if (cabId && !ids.includes(cabId)) return [cabId, ...ids];
    return ids;
  };

  const mergeSelectedDrawerId = (roomIdRaw, cabIdRaw, drawerRaw) => {
    const ids = getDrawerIdsFor(roomIdRaw, cabIdRaw);
    const selected = parseInt(String(drawerRaw || ""), 10);
    if (ids.length === 0) {
      const allDrawers = Array.from(
        new Set(
          storageLayout?.rooms?.flatMap((r) =>
            r.cabinets.flatMap((c) => c.drawerIds || [])
          ) || []
        )
      );
      if (allDrawers.length === 0) return [1, 2, 3, 4];
      allDrawers.sort((a, b) => a - b);
      if (Number.isFinite(selected) && !allDrawers.includes(selected)) return [selected, ...allDrawers];
      return allDrawers;
    }
    if (Number.isFinite(selected) && !ids.includes(selected)) return [selected, ...ids];
    return ids;
  };

  // Parse CSV helper
  const parseCsvTokens = (line) => {
    const fields = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const handleCsvFileSelect = (f) => {
    if (!f) {
      setCsvFile(null);
      setCsvRows([]);
      setCsvResults([]);
      setCsvSelected({});
      if (csvInputRef.current) csvInputRef.current.value = "";
      return;
    }

    setCsvFile(f);
    setCsvResults([]);
    setCsvLoading(true);

    const r = new FileReader();
    r.onerror = () => {
      setCsvLoading(false);
      showToast({ title: "File Read Error", description: "Failed to read the selected CSV file." }, true);
    };

    r.onload = (e) => {
      try {
        const text = e.target.result;
        if (!text || !text.trim()) {
          throw new Error("The uploaded CSV file is empty.");
        }
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          throw new Error("CSV file must contain a header row and at least one record row.");
        }

        const headers = parseCsvTokens(lines[0]).map((h) =>
          h.toLowerCase().replace(/[\s_-]+/g, "")
        );

        const defaultRoomId = storageLayout?.rooms?.[0]?.id || 1;
        const defaultCabId = storageLayout?.rooms?.[0]?.cabinets?.[0]?.id || "A";
        const defaultDrawerId = storageLayout?.rooms?.[0]?.cabinets?.[0]?.drawerIds?.[0] || 1;

        const rows = lines
          .slice(1)
          .filter((l) => l.trim())
          .map((l, i) => {
            const vals = parseCsvTokens(l);
            const row = {};
            headers.forEach((h, idx) => (row[h] = vals[idx]?.trim() || ""));
            const studentNo = row.studentno || row.student_no || "";
            let rawYear = parseInt(row.academicyear || row.yearlevel || row.year, 10);
            if (!Number.isInteger(rawYear) || (rawYear >= 1 && rawYear <= 5)) {
              const prefixMatch = studentNo.match(/^(\d{4})/);
              if (prefixMatch && Number(prefixMatch[1]) >= 2000 && Number(prefixMatch[1]) <= 2100) {
                rawYear = Number(prefixMatch[1]);
              } else {
                rawYear = new Date().getFullYear();
              }
            }

            return {
              index: i + 1,
              student: {
                studentNo,
                name: row.name || "",
                courseCode: (row.coursecode || row.course || "").toUpperCase(),
                yearLevel: rawYear,
                section: row.section || "",
                room: parseInt(row.room) || defaultRoomId,
                cabinet: row.cabinet || defaultCabId,
                drawer: parseInt(row.drawer) || defaultDrawerId,
              },
              error: "",
            };
          });

        setCsvRows(rows);
        const defaultSelection = {};
        rows.forEach((row) => {
          defaultSelection[row.index] = true;
        });
        setCsvSelected(defaultSelection);
      } catch (err) {
        showToast(
          formatErrorMessage(err, {
            title: "CSV Parsing Failed",
            actionContext: "Parsing student CSV upload",
          }),
          true
        );
      } finally {
        setCsvLoading(false);
      }
    };
    r.readAsText(f);
  };

  const setCsvRowField = (index, field, value) => {
    setCsvRows((prev) =>
      prev.map((r) => {
        if (r.index !== index) return r;
        return {
          ...r,
          student: {
            ...r.student,
            [field]: value,
          },
        };
      })
    );
  };

  const toggleCsvRowSelected = (index) => {
    setCsvSelected((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const applyCsvBulkLocation = () => {
    setCsvRows((prev) =>
      prev.map((r) => {
        if (!csvSelected[r.index]) return r;
        return {
          ...r,
          student: {
            ...r.student,
            ...(csvBulkRoom ? { room: parseInt(csvBulkRoom, 10) } : {}),
            ...(csvBulkCabinet ? { cabinet: csvBulkCabinet } : {}),
            ...(csvBulkDrawer ? { drawer: parseInt(csvBulkDrawer, 10) } : {}),
          },
        };
      })
    );
    showToast({
      title: "Storage Location Applied",
      description: "Updated physical storage locations for all selected rows.",
    });
  };

  const filteredCsvRows = useMemo(() => {
    if (!csvSearch) return csvRows;
    const q = csvSearch.toLowerCase();
    return csvRows.filter((r) => {
      return (
        String(r.student?.studentNo || "").toLowerCase().includes(q) ||
        String(r.student?.name || "").toLowerCase().includes(q) ||
        String(r.student?.courseCode || "").toLowerCase().includes(q)
      );
    });
  }, [csvRows, csvSearch]);

  const paginatedCsvRows = useMemo(() => {
    const startIndex = (csvPage - 1) * csvRowsPerPage;
    return filteredCsvRows.slice(startIndex, startIndex + csvRowsPerPage);
  }, [filteredCsvRows, csvPage, csvRowsPerPage]);

  const totalPages = Math.ceil(filteredCsvRows.length / csvRowsPerPage) || 1;

  const {
    tableContainerRef,
    canScrollLeft,
    canScrollRight,
    isScrolledX,
    scrollTable,
    resetScroll,
  } = useTableScroll([filteredCsvRows?.length, csvPage]);

  useEffect(() => {
    resetScroll();
  }, [csvPage, csvSearch, resetScroll]);

  const handleImportStudents = async () => {
    const targets = csvRows.filter((r) => csvSelected[r.index]);
    if (targets.length === 0) {
      showToast({ title: "No Rows Selected", description: "Select at least one row from the CSV to import." }, true);
      return;
    }

    setCsvLoading(true);
    try {
      const rs = await fetch("/api/students/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: targets.map((t) => t.student),
        }),
      });
      const json = await rs.json().catch(() => null);
      if (!rs.ok || !json?.ok || !Array.isArray(json?.data)) {
        throw new Error(json?.error || "Batch import failed");
      }

      const res = json.data;
      setCsvResults(res);

      const byIndex = new Map(res.map((item, idx) => [targets[idx]?.index, item]));
      const nextRows = csvRows.map((row) => {
        const result = byIndex.get(row.index);
        if (!result) return row;
        return {
          ...row,
          error: result.ok ? "" : String(result.error || "Import failed"),
        };
      });
      setCsvRows(nextRows);

      const successCount = res.filter((r) => r.ok).length;
      const failCount = res.length - successCount;

      if (successCount === res.length) {
        showToast({
          title: "Import Successful",
          description: `Successfully added all ${res.length} student records.`,
        });
        setCsvFile(null);
        setCsvRows([]);
        setCsvResults([]);
        setCsvSelected({});
        if (csvInputRef.current) csvInputRef.current.value = "";
        onSuccess?.();
        onOpenChange(false);
      } else if (successCount > 0) {
        showToast(
          {
            title: "Partial Import",
            description: `${successCount} records added, ${failCount} skipped (duplicates or invalid).`,
          },
          "warning"
        );
        onSuccess?.();
      } else {
        showToast(
          {
            title: "No Records Added",
            description: `All ${failCount} selected entries failed validation or already exist.`,
          },
          "warning"
        );
      }
    } catch (err) {
      showToast(
        formatErrorMessage(err, {
          title: "Import Failed",
          actionContext: "Executing bulk student import",
        }),
        true
      );
    } finally {
      setCsvLoading(false);
    }
  };

  const selectedCount = Object.values(csvSelected).filter(Boolean).length;
  const selectedIndices = Object.keys(csvSelected).filter((k) => csvSelected[k]);
  const selectedRows = csvRows.filter((r) => selectedIndices.includes(String(r.index)));
  const hasInvalidSelected = selectedRows.some(
    (r) => !isLocationValid(r.student?.room, r.student?.cabinet, r.student?.drawer)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[96vw] lg:max-w-[95vw] xl:max-w-[1440px] 2xl:max-w-[1560px] max-h-[92vh] h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white dark:bg-card border border-border shadow-2xl font-jakarta gap-0">
        {/* Header */}
        <DialogHeader className="bg-white p-6 pb-4 dark:bg-card border-b border-border text-left shrink-0 pr-12">
          <DialogTitle className="text-[17px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
            Bulk Import Students
          </DialogTitle>
          <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
            Upload a CSV spreadsheet to validate and import multiple student master records and physical archive assignments at once.
          </DialogDescription>
        </DialogHeader>

        {/* Hidden File Input */}
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCsvFileSelect(file);
          }}
        />

        {/* Content Body */}
        {!csvFile ? (
          /* Empty / Upload Dropzone State */
          <div className="flex-1 min-h-0 p-6 flex flex-col items-center justify-center overflow-y-auto">
            <div
              className={cn(
                "w-full max-w-3xl border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
                csvDropActive
                  ? "border-pup-maroon bg-pup-maroon/5 dark:border-red-400 dark:bg-red-950/10"
                  : "border-border dark:border-border bg-gray-50/50 hover:bg-gray-50 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/50"
              )}
              onClick={() => csvInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setCsvDropActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setCsvDropActive(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setCsvDropActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleCsvFileSelect(file);
              }}
            >
              <div className="w-16 h-16 rounded-2xl bg-pup-maroon/10 dark:bg-red-950/40 border border-pup-maroon/20 flex items-center justify-center text-pup-maroon dark:text-red-400 mb-4">
                <HugeIcon className="ph-bold ph-cloud-arrow-up text-3xl" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
                Choose a CSV file or drag & drop here
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-md">
                Spreadsheet must contain student numbers, names, program codes, academic years, sections, and storage locations.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="button"
                  className="h-10 px-5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    csvInputRef.current?.click();
                  }}
                >
                  Browse Files
                </Button>
                <a
                  href="/sample_registrar_students.csv"
                  download="sample_registrar_students.csv"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center justify-center px-4 h-10 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 border border-border dark:border-border text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  Download Sample CSV
                </a>
              </div>

              <div className="mt-8 pt-6 border-t border-border/80 w-full text-left">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Expected Column Headers:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "studentNo",
                    "name",
                    "courseCode",
                    "academicYear",
                    "section",
                    "room",
                    "cabinet",
                    "drawer",
                  ].map((header) => (
                    <span
                      key={header}
                      className="font-mono text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-border text-gray-700 dark:text-zinc-300 shadow-2xs"
                    >
                      {header}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Staging & Preview Mode */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Top Preview Bar & Controls */}
            <div className="p-4 px-6 border-b border-border bg-gray-50/40 dark:bg-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-pup-maroon dark:text-red-400 bg-pup-maroon/10 dark:bg-red-950/40 px-2.5 py-1 rounded-lg border border-pup-maroon/20">
                    {csvFile.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-zinc-400">
                    {csvRows.length} rows loaded · {csvRows.filter((r) => r.error).length} errors
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-56 sm:w-64">
                  <HugeIcon className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <Input
                    type="text"
                    value={localCsvSearch}
                    onChange={(e) => setLocalCsvSearch(e.target.value)}
                    placeholder="Search loaded students..."
                    className="h-9 pl-8 pr-3 text-xs rounded-xl bg-white dark:bg-zinc-800 border-border"
                  />
                </div>

                <a
                  href="/sample_registrar_students.csv"
                  download="sample_registrar_students.csv"
                  className="inline-flex items-center justify-center h-9 px-3 text-xs font-semibold rounded-xl border border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Template CSV
                </a>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCsvFileSelect(null)}
                  className="h-9 px-3 text-xs font-semibold rounded-xl border border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer"
                >
                  Clear File
                </Button>
              </div>
            </div>

            {/* Bulk Location Assignment Sub-bar */}
            <div className="px-6 py-3 bg-gray-50/70 dark:bg-zinc-900/40 border-b border-border flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-zinc-300">
                <HugeIcon className="ph-bold ph-archive text-pup-maroon dark:text-red-400 text-sm" />
                <span>Bulk Assign Location to Selected ({selectedCount}):</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Room:</span>
                  <Select
                    className="h-8.5 w-24 rounded-lg border border-border px-2 text-xs bg-white dark:bg-zinc-800"
                    value={csvBulkRoom}
                    onChange={(e) => setCsvBulkRoom(e.target.value)}
                  >
                    <option value="">Select...</option>
                    {roomOptions.map((rm) => (
                      <option key={rm} value={rm}>
                        Room {rm}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Cabinet:</span>
                  <Select
                    className="h-8.5 w-32 rounded-lg border border-border px-2.5 text-xs bg-white dark:bg-zinc-800"
                    value={csvBulkCabinet}
                    onChange={(e) => setCsvBulkCabinet(e.target.value)}
                  >
                    <option value="">Select...</option>
                    {mergeSelectedCabinetId(csvBulkRoom, csvBulkCabinet).map((c) => (
                      <option key={c} value={c}>
                        Cabinet {c}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Drawer:</span>
                  <Select
                    className="h-8.5 w-28 rounded-lg border border-border px-2.5 text-xs bg-white dark:bg-zinc-800"
                    value={csvBulkDrawer}
                    onChange={(e) => setCsvBulkDrawer(e.target.value)}
                  >
                    <option value="">Select...</option>
                    {mergeSelectedDrawerId(csvBulkRoom, csvBulkCabinet, csvBulkDrawer).map((d) => (
                      <option key={d} value={d}>
                        Drawer {d}
                      </option>
                    ))}
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyCsvBulkLocation}
                  disabled={selectedCount === 0 || (!csvBulkRoom && !csvBulkCabinet && !csvBulkDrawer)}
                  className="h-8.5 px-3.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border-border text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer disabled:opacity-50 ml-1 shadow-2xs"
                >
                  Apply
                </Button>

                <TableScrollControls
                  canScrollLeft={canScrollLeft}
                  canScrollRight={canScrollRight}
                  onScrollLeft={() => scrollTable("left")}
                  onScrollRight={() => scrollTable("right")}
                />
              </div>
            </div>

            {/* Interactive Staging Table */}
            <div
              ref={tableContainerRef}
              className="flex-1 min-h-0 w-full overflow-x-auto show-scrollbar pb-2 motion-safe:animate-in motion-safe:fade-in-50 duration-200 ease-out select-none border-t border-border dark:border-border"
            >
              <table className="w-full text-xs border-collapse min-w-[1160px]">
                <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
                    <th className="w-12 min-w-[48px] p-3 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-pup-maroon accent-pup-maroon cursor-pointer"
                        checked={
                          filteredCsvRows.length > 0 &&
                          filteredCsvRows.every((r) => csvSelected[r.index])
                        }
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const next = { ...csvSelected };
                          filteredCsvRows.forEach((r) => {
                            next[r.index] = checked;
                          });
                          setCsvSelected(next);
                        }}
                      />
                    </th>
                    <th className="p-3 w-44 min-w-[150px] whitespace-nowrap">Student No.</th>
                    <th className="p-3 min-w-[220px] whitespace-nowrap">Full Name</th>
                    <th className="p-3 w-32 min-w-[110px] whitespace-nowrap">Course</th>
                    <th className="p-3 w-20 min-w-[70px] whitespace-nowrap text-center">Year</th>
                    <th className="p-3 w-24 min-w-[80px] whitespace-nowrap text-center">Section</th>
                    <th className="p-3 pr-4 w-32 min-w-[110px] whitespace-nowrap">Room</th>
                    <th className="p-3 pr-6 w-40 min-w-[150px] whitespace-nowrap">Cabinet</th>
                    <th className="p-3 pl-2 pr-4 w-36 min-w-[120px] whitespace-nowrap">Drawer</th>
                    <th className="p-3 pr-5 text-right w-20 min-w-[70px] whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  {paginatedCsvRows.map((r) => {
                    const room = r.student?.room;
                    const cabinet = r.student?.cabinet;
                    const drawer = r.student?.drawer;
                    const isValid = isLocationValid(room, cabinet, drawer);
                    const isSelected = !!csvSelected?.[r.index];

                    return (
                      <tr
                        key={r.index}
                        className={cn(
                          "hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 border-b border-border dark:border-border last:border-b-0 transition-colors cursor-pointer select-none",
                          isSelected && "bg-blue-50/40 dark:bg-blue-950/20"
                        )}
                        onClick={() => toggleCsvRowSelected(r.index)}
                      >
                        <td className="w-12 p-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCsvRowSelected(r.index)}
                            className="h-4 w-4 rounded border-border text-pup-maroon accent-pup-maroon cursor-pointer"
                          />
                        </td>
                        <td className="p-3 align-middle font-mono font-semibold text-gray-900 dark:text-zinc-100">
                          {r.student.studentNo}
                        </td>
                        <td className="p-3 align-middle font-medium text-gray-800 dark:text-zinc-200 truncate" title={formatTitleCase(r.student.name)}>
                          {formatTitleCase(r.student.name)}
                        </td>
                        <td className="p-3 align-middle">
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                            {r.student.courseCode}
                          </span>
                        </td>
                        <td className="p-3 align-middle text-center text-gray-600 dark:text-zinc-400">
                          {r.student.yearLevel}
                        </td>
                        <td className="p-3 align-middle text-center text-gray-600 dark:text-zinc-400">
                          {r.student.section}
                        </td>
                        <td className="p-3 pr-4 align-middle" onClick={(e) => e.stopPropagation()}>
                          <Select
                            className="h-7.5 w-24 rounded-md border border-border text-[11px] bg-white dark:bg-zinc-800 px-1.5"
                            value={String(room || "")}
                            onChange={(e) =>
                              setCsvRowField(r.index, "room", parseInt(e.target.value, 10))
                            }
                          >
                            {roomOptions.map((rm) => (
                              <option key={rm} value={rm}>
                                Room {rm}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="p-3 pr-6 align-middle" onClick={(e) => e.stopPropagation()}>
                          <Select
                            className="h-7.5 w-30 rounded-md border border-border text-[11px] bg-white dark:bg-zinc-800 px-1.5"
                            value={String(cabinet || "")}
                            onChange={(e) =>
                              setCsvRowField(r.index, "cabinet", e.target.value)
                            }
                          >
                            {mergeSelectedCabinetId(r.student?.room, r.student?.cabinet).map((c) => (
                              <option key={c} value={c}>
                                Cab {c}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="p-3 pl-2 pr-4 align-middle" onClick={(e) => e.stopPropagation()}>
                          <Select
                            className="h-7.5 w-24 rounded-md border border-border text-[11px] bg-white dark:bg-zinc-800 px-1.5"
                            value={String(drawer || "")}
                            onChange={(e) =>
                              setCsvRowField(r.index, "drawer", parseInt(e.target.value, 10))
                            }
                          >
                            {mergeSelectedDrawerId(
                              r.student?.room,
                              r.student?.cabinet,
                              r.student?.drawer
                            ).map((d) => (
                              <option key={d} value={d}>
                                Drw {d}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="p-3 pr-5 text-right align-middle">
                          {r.error ? (
                            <HugeIcon
                              className="ph-bold ph-x-circle text-red-500 text-base inline-block"
                              title={`Error: ${r.error}`}
                            />
                          ) : !isValid ? (
                            <HugeIcon
                              className="ph-bold ph-warning-circle text-amber-500 text-base inline-block"
                              title="Invalid storage location. Please update room, cabinet, or drawer."
                            />
                          ) : (
                            <HugeIcon
                              className="ph-bold ph-check-circle text-emerald-500 text-base inline-block"
                              title="Valid storage location"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-2.5 border-t border-border flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400 shrink-0 bg-white dark:bg-card">
                <span>
                  Showing {(csvPage - 1) * csvRowsPerPage + 1} to{" "}
                  {Math.min(csvPage * csvRowsPerPage, filteredCsvRows.length)} of{" "}
                  {filteredCsvRows.length} entries
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={csvPage <= 1}
                    onClick={() => setCsvPage((p) => p - 1)}
                    className="h-7 px-2.5 text-xs rounded-lg border-border"
                  >
                    Prev
                  </Button>
                  <span className="px-2 font-medium">
                    {csvPage} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={csvPage >= totalPages}
                    onClick={() => setCsvPage((p) => p + 1)}
                    className="h-7 px-2.5 text-xs rounded-lg border-border"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5 shrink-0">
          {hasInvalidSelected && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 mr-auto">
              <HugeIcon className="ph-bold ph-warning text-sm shrink-0" />
              <span>One or more selected rows have invalid storage locations.</span>
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={csvLoading}
            className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleImportStudents}
            disabled={csvLoading || !csvFile || selectedCount === 0 || hasInvalidSelected}
            className="flex h-10 px-5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
          >
            {csvLoading ? (
              <span className="flex items-center gap-2">
                <HugeIcon className="ph-bold ph-spinner animate-spin text-sm" />
                <span>Importing...</span>
              </span>
            ) : (
              `Import ${selectedCount > 0 ? selectedCount : ""} Students`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
