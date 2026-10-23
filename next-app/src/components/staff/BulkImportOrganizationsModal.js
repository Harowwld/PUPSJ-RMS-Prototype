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
import { formatErrorMessage } from "@/lib/errorUtils";

export default function BulkImportOrganizationsModal({
  open,
  onOpenChange,
  storageLayout = null,
  onSuccess,
  showToast = () => {},
}) {
  const [csvFile, setCsvFile] = useState(null);
  const [csvRows, setCsvRows] = useState([]);
  const [csvSelected, setCsvSelected] = useState({});
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResults, setCsvResults] = useState([]);

  const [csvBulkRoom, setCsvBulkRoom] = useState("1");
  const [csvBulkCabinet, setCsvBulkCabinet] = useState("ACADEMIC ORGANIZATIONS");
  const [csvBulkDrawer, setCsvBulkDrawer] = useState("1");
  const [csvDropActive, setCsvDropActive] = useState(false);

  const [csvPage, setCsvPage] = useState(1);
  const [csvRowsPerPage] = useState(10);
  const [localCsvSearch, setLocalCsvSearch] = useState("");
  const [csvSearch, setCsvSearch] = useState("");

  const csvInputRef = useRef(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setCsvSearch(localCsvSearch);
      setCsvPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [localCsvSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
    if (!open) {
      setCsvFile(null);
      setCsvRows([]);
      setCsvSelected({});
      setCsvResults([]);
      setLocalCsvSearch("");
      setCsvSearch("");
      setCsvPage(1);
      setCsvBulkRoom("1");
      setCsvBulkCabinet("ACADEMIC ORGANIZATIONS");
      setCsvBulkDrawer("1");
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);

  const OSAS_CABINETS = ["ACADEMIC ORGANIZATIONS", "NON-ACADEMIC ORGANIZATIONS"];

  const isLocationValid = (room, cabinet, drawer) => {
    return Boolean(room && cabinet && drawer);
  };

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

        const rows = lines
          .slice(1)
          .filter((l) => l.trim())
          .map((l, i) => {
            const vals = parseCsvTokens(l);
            const row = {};
            headers.forEach((h, idx) => (row[h] = vals[idx]?.trim() || ""));
            const name = row.organization || row.name || row.organizationname || "";
            const acronym = (row.acronym || "").toUpperCase();
            const category = row.category || "Academic";
            const adviserName = row.adviser || row.advisername || "";
            const adviserEmail = row.email || row.adviseremail || "";
            const room = parseInt(row.room, 10) || 1;
            const defaultCab = category.toLowerCase().includes("non-academic")
              ? "NON-ACADEMIC ORGANIZATIONS"
              : "ACADEMIC ORGANIZATIONS";
            const cabinet = row.cabinet || defaultCab;
            const drawer = parseInt(row.drawer, 10) || 1;

            return {
              index: i + 1,
              organization: {
                name,
                acronym,
                category,
                adviserName,
                adviserEmail,
                room,
                cabinet,
                drawer,
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
            actionContext: "Parsing organization CSV upload",
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
          organization: {
            ...r.organization,
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
          organization: {
            ...r.organization,
            ...(csvBulkRoom ? { room: parseInt(csvBulkRoom, 10) } : {}),
            ...(csvBulkCabinet ? { cabinet: csvBulkCabinet } : {}),
            ...(csvBulkDrawer ? { drawer: parseInt(csvBulkDrawer, 10) } : {}),
          },
        };
      })
    );
    showToast({
      title: "Storage Location Applied",
      description: "Updated physical storage locations for all selected organizations.",
    });
  };

  const filteredCsvRows = useMemo(() => {
    if (!csvSearch) return csvRows;
    const q = csvSearch.toLowerCase();
    return csvRows.filter((r) => {
      return (
        String(r.organization?.acronym || "").toLowerCase().includes(q) ||
        String(r.organization?.name || "").toLowerCase().includes(q) ||
        String(r.organization?.category || "").toLowerCase().includes(q) ||
        String(r.organization?.adviserName || "").toLowerCase().includes(q)
      );
    });
  }, [csvRows, csvSearch]);

  const paginatedCsvRows = useMemo(() => {
    const startIndex = (csvPage - 1) * csvRowsPerPage;
    return filteredCsvRows.slice(startIndex, startIndex + csvRowsPerPage);
  }, [filteredCsvRows, csvPage, csvRowsPerPage]);

  const totalPages = Math.ceil(filteredCsvRows.length / csvRowsPerPage) || 1;

  const handleImportOrganizations = async () => {
    const targets = csvRows.filter((r) => csvSelected[r.index]);
    if (targets.length === 0) {
      showToast({ title: "No Rows Selected", description: "Select at least one organization to import." }, true);
      return;
    }

    setCsvLoading(true);
    try {
      const rs = await fetch("/api/osas/organizations/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: targets.map((t) => t.organization),
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
          description: `Successfully registered all ${res.length} student organizations.`,
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
            description: `${successCount} organizations registered, ${failCount} skipped.`,
          },
          "warning"
        );
        onSuccess?.();
      } else {
        showToast(
          {
            title: "No Records Added",
            description: `All ${failCount} selected entries failed validation.`,
          },
          "warning"
        );
      }
    } catch (err) {
      showToast(
        formatErrorMessage(err, {
          title: "Import Failed",
          actionContext: "Executing bulk organization import",
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
    (r) => !isLocationValid(r.organization?.room, r.organization?.cabinet, r.organization?.drawer)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[96vw] lg:max-w-[95vw] xl:max-w-[1440px] 2xl:max-w-[1560px] max-h-[92vh] h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white dark:bg-card border border-border shadow-2xl font-jakarta gap-0">
        {/* Header */}
        <DialogHeader className="bg-white p-6 pb-4 dark:bg-card border-b border-border text-left shrink-0 pr-12">
          <DialogTitle className="text-[17px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
            Bulk Import Student Organizations
          </DialogTitle>
          <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
            Upload a CSV spreadsheet to register multiple student organizations and assign physical archive cabinets at once.
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
                Choose an Organizations CSV file or drag & drop here
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-md">
                Spreadsheet must contain organization name, acronym, category (Academic / Non-Academic), adviser details, and physical storage location.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="button"
                  className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! shadow-xs cursor-pointer active:scale-95 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    csvInputRef.current?.click();
                  }}
                >
                  Browse Files
                </Button>
                <a
                  href="/sample_osas_organizations.csv"
                  download="sample_osas_organizations.csv"
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
                    "name",
                    "acronym",
                    "category",
                    "adviserName",
                    "adviserEmail",
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
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Top Toolbar */}
            <div className="p-4 px-6 border-b border-border bg-gray-50/40 dark:bg-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-pup-maroon dark:text-red-400 bg-pup-maroon/10 dark:bg-red-950/40 px-2.5 py-1 rounded-lg border border-pup-maroon/20">
                    {csvFile.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-zinc-400">
                    {csvRows.length} organizations loaded · {csvRows.filter((r) => r.error).length} errors
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
                    placeholder="Search loaded organizations..."
                    className="h-9 pl-8 pr-3 text-xs rounded-xl bg-white dark:bg-zinc-800 border-border"
                  />
                </div>

                <a
                  href="/sample_osas_organizations.csv"
                  download="sample_osas_organizations.csv"
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

            {/* Bulk Location Assigner */}
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
                    <option value="1">Room 1</option>
                    <option value="2">Room 2</option>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Cabinet:</span>
                  <Select
                    className="h-8.5 w-64 rounded-lg border border-border px-2.5 text-xs bg-white dark:bg-zinc-800"
                    value={csvBulkCabinet}
                    onChange={(e) => setCsvBulkCabinet(e.target.value)}
                  >
                    {OSAS_CABINETS.map((c) => (
                      <option key={c} value={c}>
                        {c}
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
                    {[1, 2, 3, 4].map((d) => (
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
                  disabled={selectedCount === 0}
                  className="h-8.5 px-3.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border-border text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer disabled:opacity-50"
                >
                  Apply
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-xs min-w-[1260px]">
                <thead className="sticky top-0 z-10 border-b border-border bg-white dark:bg-card">
                  <tr className="text-left text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                    <th className="w-12 p-3 text-center">
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
                    <th className="p-3 w-32 min-w-[110px] whitespace-nowrap">Acronym</th>
                    <th className="p-3 min-w-[220px] whitespace-nowrap">Organization Name</th>
                    <th className="p-3 w-36 min-w-[130px] whitespace-nowrap">Category</th>
                    <th className="p-3 w-48 min-w-[160px] whitespace-nowrap">Adviser</th>
                    <th className="p-3 pr-4 w-28 min-w-[95px] whitespace-nowrap">Room</th>
                    <th className="p-3 pr-6 w-64 min-w-[240px] whitespace-nowrap">Cabinet</th>
                    <th className="p-3 pl-2 pr-4 w-32 min-w-[110px] whitespace-nowrap">Drawer</th>
                    <th className="p-3 pr-5 text-right w-20 min-w-[70px] whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedCsvRows.map((r) => {
                    const room = r.organization?.room;
                    const cabinet = r.organization?.cabinet;
                    const drawer = r.organization?.drawer;
                    const isValid = isLocationValid(room, cabinet, drawer);
                    const isSelected = !!csvSelected?.[r.index];

                    return (
                      <tr
                        key={r.index}
                        className={cn(
                          "hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer",
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
                          {r.organization?.acronym || "N/A"}
                        </td>
                        <td className="p-3 align-middle font-medium text-gray-800 dark:text-zinc-200 truncate" title={formatTitleCase(r.organization?.name)}>
                          {formatTitleCase(r.organization?.name)}
                        </td>
                        <td className="p-3 align-middle">
                          <span className={cn(
                            "inline-flex w-fit items-center justify-center rounded-lg px-2 py-0.5 text-[11px] font-medium border",
                            (r.organization?.category || "Academic") === "Academic"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                              : "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                          )}>
                            {r.organization?.category || "Academic"}
                          </span>
                        </td>
                        <td className="p-3 align-middle text-gray-600 dark:text-zinc-400 truncate" title={r.organization?.adviserName || "N/A"}>
                          {r.organization?.adviserName || "N/A"}
                        </td>
                        <td className="p-3 pr-4 align-middle" onClick={(e) => e.stopPropagation()}>
                          <Select
                            className="h-7.5 w-20 rounded-md border border-border text-[11px] bg-white dark:bg-zinc-800 px-1.5"
                            value={String(room || "1")}
                            onChange={(e) =>
                              setCsvRowField(r.index, "room", parseInt(e.target.value, 10))
                            }
                          >
                            <option value="1">1</option>
                            <option value="2">2</option>
                          </Select>
                        </td>
                        <td className="p-3 pr-6 align-middle" onClick={(e) => e.stopPropagation()}>
                          <Select
                            className="h-7.5 w-56 rounded-md border border-border text-[11px] bg-white dark:bg-zinc-800 px-1.5"
                            value={String(cabinet || "ACADEMIC ORGANIZATIONS")}
                            onChange={(e) =>
                              setCsvRowField(r.index, "cabinet", e.target.value)
                            }
                          >
                            {OSAS_CABINETS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="p-3 pl-2 pr-4 align-middle" onClick={(e) => e.stopPropagation()}>
                          <Select
                            className="h-7.5 w-22 rounded-md border border-border text-[11px] bg-white dark:bg-zinc-800 px-1.5"
                            value={String(drawer || "1")}
                            onChange={(e) =>
                              setCsvRowField(r.index, "drawer", parseInt(e.target.value, 10))
                            }
                          >
                            {[1, 2, 3, 4].map((d) => (
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
                              title="Missing storage location"
                            />
                          ) : (
                            <HugeIcon
                              className="ph-bold ph-check-circle text-emerald-500 text-base inline-block"
                              title="Valid organization record"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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

        {/* Footer */}
        <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5 shrink-0">
          {hasInvalidSelected && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 mr-auto">
              <HugeIcon className="ph-bold ph-warning text-sm shrink-0" />
              <span>One or more selected rows have missing storage locations.</span>
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
            onClick={handleImportOrganizations}
            disabled={csvLoading || !csvFile || selectedCount === 0 || hasInvalidSelected}
            className="flex h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
          >
            {csvLoading ? (
              <span className="flex items-center gap-2">
                <HugeIcon className="ph-bold ph-spinner animate-spin text-sm" />
                <span>Importing...</span>
              </span>
            ) : (
              `Import ${selectedCount > 0 ? selectedCount : ""} Organizations`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
