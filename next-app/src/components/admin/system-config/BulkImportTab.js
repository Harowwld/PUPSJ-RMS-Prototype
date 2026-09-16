"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import BulkImportSkeleton from "@/components/admin/skeletons/BulkImportSkeleton"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export default function BulkImportTab({
  loading = false,
  importStatus,
  importDropActive,
  setImportDropActive,
  handleCsvSelect,
  handleCopySample,
  resetImport,
  importFile,
  importRows,
  importSelected,
  setImportSelected,
  toggleImportRowSelected,
  toggleImportSelectAll,
  executeBulkImport,
  importResults,
  setActiveSubTab,
  onUpdateRow,
  onAddRow,
  onRefresh,
  courses = [],
}) {
  const [editingRowIndex, setEditingRowIndex] = useState(null)
  const [editData, setEditData] = useState({ category: "", name: "", code: "" })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchTerm("")
    setCurrentPage(1)
  }, [importFile])

  const [quickAdd, setQuickAdd] = useState({
    category: "DOCUMENT TYPE",
    name: "",
    code: "",
  })

  const handleRefreshClick = async () => {
    setIsRefreshing(true)
    if (onRefresh) {
      await onRefresh(true)
    }
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const handleQuickAdd = () => {
    if (!quickAdd.name) return
    if (onAddRow) {
      onAddRow(quickAdd)
      setQuickAdd({ category: "DOCUMENT TYPE", name: "", code: "" })
    }
  }

  const startEdit = (row) => {
    setEditingRowIndex(row.index)
    setEditData({ category: row.category, name: row.name, code: row.code || (row.category === "Section" ? (courses[0]?.code || "") : "") })
  }

  useEffect(() => {
    if (quickAdd.category === "Section" && !quickAdd.code && courses.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuickAdd(prev => ({ ...prev, code: courses[0].code }))
    }
  }, [courses, quickAdd.category, quickAdd.code])

  const cancelEdit = () => {
    setEditingRowIndex(null)
    setEditData({ category: "", name: "", code: "" })
  }

  const saveEdit = () => {
    if (onUpdateRow) {
      onUpdateRow(editingRowIndex, editData)
    }
    setEditingRowIndex(null)
  }
  if (loading) {
    return <BulkImportSkeleton />
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-6 font-inter animate-fade-up min-h-0 px-[28px] pb-[28px]">
      {importStatus === "idle" ? (
        <div className="flex flex-col flex-1 gap-6 w-full min-h-0 animate-fade-up">
          <div className="mt-[20px]">
            <PageHeader
              showBorder={false}
              icon="ph-file-arrow-up"
              titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
              descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
              title="Bulk Taxonomy Importer"
              description="Upload CSV files to batch-import and populate system taxonomies."
              className="p-0"
              actions={
                <button
                  type="button"
                  onClick={() => setShowInstructions(true)}
                  className="text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors bg-transparent border-0 p-0 cursor-pointer flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
                  title="Import Instructions"
                >
                  <i className="ph-bold ph-question text-[18px]"></i>
                </button>
              }
            />
          </div>
          
          <div className="flex flex-col flex-1 gap-6 w-full min-h-0">
            <div className="flex items-center gap-2 mt-4">
              <a
                href="data:text/csv;charset=utf-8,Category,Name,Code%0ADOCUMENT TYPE,Transcript of Records,%0ADOCUMENT TYPE,Diploma,%0ACourse,Bachelor of Science in IT,BSIT%0ACourse,Bachelor of Science in Accountancy,BSA%0ASection,Block 1,BSIT%0ASection,Section 1,BSA"
                download="PUP-IMPORT-TEMPLATE.csv"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95"
              >
                Download
              </a>
              <button
                type="button"
                onClick={handleCopySample}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95"
              >
                Copy
              </button>
            </div>

            {/* Consolidated Dropzone */}
            <div className="flex flex-col flex-1 items-center justify-center min-h-0 w-full">
              <div
                className={cn(
                  "group relative flex flex-1 h-full w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/15 bg-[#FAFAFA] dark:bg-zinc-900/50 p-10 text-center transition-all duration-150 ease-out min-h-[745px]",
                  importDropActive && "border-pup-maroon bg-red-50/50 dark:bg-red-950/20"
                )}
                onDragOver={(e) => {
                  e.preventDefault()
                  setImportDropActive(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  setImportDropActive(false)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  setImportDropActive(false)
                  handleCsvSelect(e)
                }}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvSelect}
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                />
                <div className="pointer-events-none flex flex-col items-center justify-center text-center w-full h-full">
                  <i className={cn("ti ti-upload text-[24px] transition-colors duration-fast", importDropActive ? "text-pup-maroon" : "text-gray-400 dark:text-zinc-500")}></i>
                  <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mt-3 m-0">
                    Drop CSV file here
                  </p>
                  <p className="text-xs font-normal text-gray-500 dark:text-zinc-400 mt-1 m-0">
                    or click to <span className="text-pup-maroon font-semibold cursor-pointer hover:underline">browse</span> local files (.csv)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : importStatus === "preview" ? (
      <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 min-h-[500px] flex-col gap-4 duration-normal">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center mt-[20px]">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={resetImport}
              className="flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
            >
              Back
            </Button>
            <div className="flex items-center gap-4">
              <div>
                <CardTitle className="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
                  Import Preview
                </CardTitle>
                <CardDescription className="mt-1.5 text-sm font-medium text-gray-500 transition-colors dark:text-zinc-400">
                  <span className="flex items-center gap-1.5 font-semibold text-red-600 dark:text-red-500">
                    {importFile?.name || "Records Data"}
                  </span>
                </CardDescription>
              </div>
            </div>
          </div>            <div className="flex items-center gap-4">
              <div className="relative group w-[220px]">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <i className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-xs"></i>
                </div>
                <Input
                  type="text"
                  placeholder="Search preview..."
                  className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 pl-8 pr-8 text-xs font-normal placeholder:text-gray-400 dark:placeholder:text-zinc-500 text-gray-900 dark:text-zinc-100 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute inset-y-0 right-3 flex items-center text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 border-0 bg-transparent p-0 cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3.5 text-[12px] text-[#111111] dark:text-zinc-300">
                <span className="border-r border-gray-200 pr-3.5 font-medium text-[#8E8E93] dark:border-zinc-700 dark:text-zinc-500">
                  Summary
                </span>
                <div className="flex items-center gap-3.5">
                  <span className="font-normal text-[#111111] dark:text-zinc-300">
                    {importRows.length} rows detected · <span className={importRows.filter((r) => r.error).length > 0 ? "text-red-600 dark:text-red-400 font-medium" : "text-[#8E8E93] dark:text-zinc-550"}>{importRows.filter((r) => r.error).length} invalid</span>
                  </span>
                  <div className="h-3.5 w-[1px] bg-gray-255 dark:bg-zinc-700"></div>
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>
                      {importRows.filter((r) => !r.error && importSelected[r.index]).length} Selected
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:bg-card dark:shadow-none dark:border-white/10">
                {(() => {
                  const q = searchTerm.toLowerCase().trim()
                  const filteredRows = importRows.filter((row) => {
                    if (!q) return true
                    return (
                      String(row.category || "").toLowerCase().includes(q) ||
                      String(row.name || "").toLowerCase().includes(q) ||
                      String(row.code || "").toLowerCase().includes(q) ||
                      String(row.error || "").toLowerCase().includes(q) ||
                      String(row.index).includes(q)
                    )
                  })
                  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1
                  const displayPage = Math.min(currentPage, totalPages)
                  const paginatedRows = filteredRows.slice((displayPage - 1) * itemsPerPage, displayPage * itemsPerPage)
                  return (
                    <>
                      <div className="flex-1 overflow-hidden overflow-auto bg-white dark:bg-card rounded-[inherit]">
                        <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
                    <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                      <th className="w-12 p-4 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:text-primary dark:border-white/10"
                          checked={
                            importRows.length > 0 &&
                            importRows.filter((r) => !r.error).every((r) => !!importSelected[r.index])
                          }
                          onChange={(e) => toggleImportSelectAll(e.target.checked)}
                        />
                      </th>
                      <th className="w-12 p-4 text-center font-medium text-[12px] tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">Row</th>
                      <th className="w-48 p-4 font-medium text-[12px] tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">Category</th>
                      <th className="p-4 min-w-[200px] font-medium text-[12px] tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">Name / Label</th>
                      <th className="w-48 p-4 font-medium text-[12px] tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">Identifier</th>
                      <th className="w-40 p-4 text-right font-medium text-[12px] tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  <tr className="bg-gray-50/50 transition-colors hover:bg-gray-50 dark:bg-card dark:hover:bg-white/5">
                    <td className="p-4 text-center">
                      <div className="flex h-5 w-5 mx-auto items-center justify-center rounded-full border-2 border-dashed border-gray-300 dark:border-white/10">
                        <i className="ph-bold ph-plus text-[10px] text-gray-400 dark:text-zinc-500"></i>
                      </div>
                    </td>
                    <td className="p-4 text-center text-[11px] text-gray-400 font-medium dark:text-zinc-500">
                      NEW
                    </td>
                    <td className="p-4">
                      <Select
                        className="h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-700 dark:text-zinc-200 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 cursor-pointer"
                        value={quickAdd.category}
                        onChange={(e) => {
                          const cat = e.target.value
                          setQuickAdd((prev) => ({
                            ...prev,
                            category: cat,
                            code: cat === "Section" ? (courses[0]?.code || "") : prev.code
                          }))
                        }}
                      >
                        <option value="DOCUMENT TYPE">Document Type</option>
                        <option value="Course">Course</option>
                        <option value="Section">Section</option>
                      </Select>
                    </td>
                    <td className="p-4">
                      <Input
                        className="h-9 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                        value={quickAdd.name}
                        onChange={(e) =>
                          setQuickAdd((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleQuickAdd()
                        }}
                        placeholder="Quick add name/label..."
                      />
                    </td>
                    <td className="p-4">
                      {quickAdd.category.toLowerCase() === "section" ? (
                        <Select
                          className="h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-700 dark:text-zinc-200 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 cursor-pointer"
                          value={quickAdd.code}
                          onChange={(e) =>
                            setQuickAdd((prev) => ({
                              ...prev,
                              code: e.target.value,
                            }))
                          }
                        >
                          <option value="">Select Program...</option>
                          {courses.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.code}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          className="h-9 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-xs focus-visible:ring-1 focus-visible:ring-pup-maroon"
                          value={quickAdd.code}
                          onChange={(e) =>
                            setQuickAdd((prev) => ({
                              ...prev,
                              code: e.target.value.toUpperCase(),
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleQuickAdd()
                          }}
                          placeholder="Code"
                        />
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        disabled={!quickAdd.name}
                        onClick={handleQuickAdd}
                        className="h-9 px-4 text-xs font-semibold rounded-xl btn-brand-orange text-white shadow-xs cursor-pointer active:scale-95 transition-all border-0"
                      >
                        Add
                      </Button>
                    </td>
                  </tr>
                  {paginatedRows.map((row) => {
                    const isEditing = editingRowIndex === row.index
                    return (
                      <tr
                        key={row.index}
                        className={cn(
                          "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none",
                          row.error && "bg-red-50/40 dark:bg-red-500/5 hover:bg-red-50/60 dark:hover:bg-red-500/10"
                        )}
                      >
                        <td className={`p-4 text-center ${row.error ? "border-l-4 border-l-red-500" : ""}`}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon disabled:cursor-not-allowed disabled:opacity-30 dark:text-primary dark:border-white/10"
                            checked={!!importSelected[row.index]}
                            onChange={() => toggleImportRowSelected(row.index)}
                            disabled={!!row.error || isEditing}
                          />
                        </td>
                        <td className="p-4 text-center text-[11px] text-gray-400 dark:text-zinc-500">
                          {row.index}
                        </td>
                        <td className="p-4">
                          {isEditing ? (
                            <Select
                              className="h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-700 dark:text-zinc-200 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                              value={editData.category}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  category: e.target.value,
                                }))
                              }
                            >
                              <option value="DOCUMENT TYPE">Document Type</option>
                              <option value="Course">Course</option>
                              <option value="Section">Section</option>
                            </Select>
                          ) : (
                            <div
                              className={cn(
                                "inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] whitespace-nowrap",
                                row.category.toLowerCase() === "documenttype"
                                  ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400"
                                  : row.category.toLowerCase() === "course"
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                              )}
                            >
                              {String(row.category || "").toLowerCase() === "documenttype" ? "Document Type" : (row.category || "MISSING")}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {isEditing ? (
                            <Input
                              className="h-9 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                              value={editData.name}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              placeholder="Name/Label"
                            />
                          ) : (
                            <div
                              className={`text-sm font-semibold truncate max-w-[400px] ${row.error && !row.name ? "text-red-400 italic" : "text-gray-900 dark:text-zinc-50"}`}
                              title={row.name}
                            >
                              {row.name || "(Required field missing)"}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {isEditing ? (
                            editData.category.toLowerCase() === "section" ? (
                              <Select
                                className="h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-700 dark:text-zinc-200 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 cursor-pointer"
                                value={editData.code}
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    code: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Select Program...</option>
                                {courses.map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.code}
                                  </option>
                                ))}
                              </Select>
                            ) : (
                              <Input
                                className="h-9 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-xs focus-visible:ring-1 focus-visible:ring-pup-maroon"
                                value={editData.code}
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    code: e.target.value.toUpperCase(),
                                  }))
                                }
                                placeholder="Code"
                              />
                            )
                          ) : (
                            <div className="text-xs text-gray-500 dark:text-zinc-400">
                              {row.code || "—"}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={saveEdit}
                                className="h-8 px-3 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95"
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={cancelEdit}
                                className="h-8 px-3 text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : row.error ? (
                            <div className="flex items-center justify-end gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex cursor-help items-center gap-1 rounded-full bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] whitespace-nowrap">
                                    <i className="ph-bold ph-warning-circle text-xs"></i>
                                    <span>{row.error}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-red-950 text-white border-red-900">
                                  <p className="text-[10px] font-semibold tracking-wider">
                                    Row Validation Failed: {row.error}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => startEdit(row)}
                                    className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors flex items-center justify-center border-0 bg-transparent cursor-pointer active:scale-95"
                                  >
                                    <i className="ph-bold ph-pencil-simple text-sm"></i>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Fix Entry</TooltipContent>
                              </Tooltip>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] whitespace-nowrap">
                                <i className="ph-bold ph-check-circle text-xs"></i>
                                <span>Validated</span>
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => startEdit(row)}
                                    className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors flex items-center justify-center border-0 bg-transparent cursor-pointer active:scale-95"
                                  >
                                    <i className="ph-bold ph-pencil-simple text-sm"></i>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Edit Entry</TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {importRows.length > 0 && (
              <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl mt-auto">
                <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-zinc-400 select-none">
                  <span>
                    Showing {paginatedRows.length} of {filteredRows.length.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>Rows:</span>
                    {[10, 20, 50, 100].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setItemsPerPage(size)
                          setCurrentPage(1)
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                          itemsPerPage === size
                            ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                            : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 select-none">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={displayPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                  >
                    Prev
                  </Button>

                  <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-zinc-800 flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                    {displayPage}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={displayPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
         </>
        )
      })()}
            <div className="flex items-center justify-between border-t border-gray-100 bg-transparent p-4 dark:border-white/10 dark:bg-transparent">
              <p className="max-w-md text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                Only valid and selected rows will be committed to the database. Invalid rows are
                automatically excluded. Duplicate records (matching name or code) will be ignored by
                the system.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetImport}
                  className="flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={executeBulkImport}
                  disabled={importRows.filter((r) => !r.error && importSelected[r.index]).length === 0}
                  className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs px-6 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs border-0"
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : importStatus === "importing" ? (
        <div className="animate-fade-up flex flex-1 min-h-[500px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm dark:bg-card dark:shadow-none dark:border-white/10">
          <div className="flex max-w-sm flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="h-20 w-20 animate-spin rounded-full border-4 border-gray-200 border-t-pup-maroon dark:border-white/10"></div>
              <i className="ph-duotone ph-database absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl text-pup-maroon dark:text-primary"></i>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-zinc-50">Adding Records</h3>
              <p className="mt-2 text-sm font-medium text-gray-500 dark:text-zinc-400">
                Writing validated entries to the system. Please do not close the window.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in zoom-in-95 flex flex-1 min-h-[500px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm duration-normal dark:bg-card dark:shadow-none dark:border-white/10">
          <div className="flex w-full max-w-md flex-col items-center gap-8 px-6 text-center">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                <i className="ph-bold ph-check text-[32px]"></i>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-zinc-50">Import Complete</h3>
              <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                The batch of records has been successfully merged into the{" "}
                <span className="font-semibold text-pup-maroon dark:text-primary">system</span>. All records are
                now active.
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 shadow-sm dark:border-white/10 dark:shadow-none dark:bg-zinc-700">
              <div className="space-y-1 bg-white p-5 dark:bg-card">
                <div className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-500">
                  Success
                </div>
                <div className="text-xl font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                  {importResults?.successCount || 0}
                </div>
              </div>
              <div className="space-y-1 border-l border-gray-100 bg-white p-5 dark:border-white/10 dark:bg-card">
                <div className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-500">
                  Skipped / Duplicates
                </div>
                <div className="text-xl font-semibold text-amber-600 tabular-nums dark:text-amber-400">
                  {importResults?.failCount || 0}
                </div>
              </div>
            </div>

            <div className="flex w-full max-w-[280px] flex-col gap-3">
              <Button
                onClick={resetImport}
                className="flex h-10 w-full items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer shadow-xs border-0"
              >
                Done
              </Button>
              <button
                onClick={() => setActiveSubTab("document-types")}
                className="text-[10px] font-semibold tracking-widest text-gray-400 transition-colors hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-500 cursor-pointer"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="w-[680px] max-w-[90vw] sm:max-w-[90vw] overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl dark:border-white/10 dark:bg-zinc-950 [&>button]:hidden relative flex flex-col max-h-[80vh]">
          {/* Close button */}
          <button
            onClick={() => setShowInstructions(false)}
            className="absolute right-8 top-8 text-gray-400 hover:text-gray-600 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors border-0 bg-transparent p-0 cursor-pointer"
          >
            <i className="ph-bold ph-x text-base"></i>
          </button>

          {/* Modal Header */}
          <div className="mb-6">
            <DialogTitle className="text-[18px] font-semibold tracking-[-0.01em] text-[#111] dark:text-zinc-50">
              Import Instructions
            </DialogTitle>
            <DialogDescription className="sr-only">
              Data categories and guidelines for importing bulk CSV files.
            </DialogDescription>
          </div>

          {/* Modal Content */}
          <div className="overflow-y-auto flex-1 pr-1">
            {/* Architecture */}
            <div className="mb-6">
              <div className="flex items-center gap-[6px] text-[11px] mb-3 mt-0">
                <span className="font-semibold tracking-[0.05em] text-[#8E8E93]">Architecture</span>
              </div>
              <div className="inline-flex gap-2">
                {["Category", "Name", "Code"].map((col) => (
                  <span
                    key={col}
                    className="bg-[#F2F2F7] rounded-full px-3 py-1 text-[12px] font-medium text-[#111] dark:bg-zinc-800 dark:text-zinc-200 border-0"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>

            {/* Data Mapping */}
            <div className="pt-6 mt-6 border-t-[0.5px] border-black/[0.08] dark:border-white/10 mb-6">
              <div className="flex items-center gap-[6px] text-[11px] mb-3">
                <span className="font-semibold tracking-[0.05em] text-[#8E8E93]">Data Mapping</span>
              </div>

              <div className="relative rounded-lg bg-[#F2F2F7] dark:bg-zinc-900 p-4 text-[12px] text-[#111] dark:text-zinc-100 leading-[1.6]">
                <button
                  onClick={handleCopySample}
                  className="absolute top-4 right-4 text-[#8E8E93] hover:text-[#111] transition-colors border-0 bg-transparent p-0 cursor-pointer flex items-center justify-center"
                  title="Copy Example"
                >
                  <i className="ph-bold ph-copy ti-copy text-[14px]"></i>
                </button>

                <div className="text-[11px] text-[#8E8E93] mb-3 normal-case font-sans">CSV Structure Example</div>
                
                <span className="font-semibold text-[#111] dark:text-zinc-50 border-b border-black/[0.08] dark:border-white/5 pb-0.5">Category,Name,Code</span>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-zinc-400">DocumentType,</span>
                    <span className="text-gray-800 dark:text-zinc-300 font-semibold">Transcript of Records,</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-zinc-400">Course,</span>
                    <span className="text-gray-800 dark:text-zinc-300 font-semibold">Bachelor of Science in IT,</span>
                    <span className="text-[#E5484D] font-semibold">BSIT</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-zinc-400">Section,</span>
                    <span className="text-gray-800 dark:text-zinc-300 font-semibold">Block 1,</span>
                    <span className="text-[#E5484D] font-semibold">BSIT</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Taxonomy Logic */}
            <div className="pt-6 mt-6 border-t-[0.5px] border-black/[0.08] dark:border-white/10">
              <div className="flex items-center gap-[6px] text-[11px] mb-3">
                <span className="font-semibold tracking-[0.05em] text-[#8E8E93]">Taxonomy Logic</span>
              </div>

              <div className="flex flex-col gap-4">
                {[
                  {
                    label: "Document type",
                    desc: "ID code optional. Only 'Name' required.",
                    icon: "ph-files",
                  },
                  {
                    label: "Course",
                    desc: "Short code required (e.g. BSIT, BSA).",
                    icon: "ph-books",
                  },
                  {
                    label: "Section",
                    desc: "'Code' must match a degree program.",
                    icon: "ph-list-numbers",
                  },
                ].map((rule) => (
                  <div
                    key={rule.label}
                    className="flex items-start gap-3"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center text-[#8E8E93] mt-[2px]">
                      <i className={`ph-bold ${rule.icon} text-[16px]`}></i>
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-[#111] dark:text-zinc-50 leading-tight">
                        {rule.label}
                      </div>
                      <div className="text-[12px] font-normal text-[#8E8E93] dark:text-zinc-400 mt-0.5 leading-normal">
                        {rule.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="h-10 px-5 text-xs font-semibold rounded-xl btn-brand-red text-white shadow-xs cursor-pointer active:scale-95 transition-all border-0"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}



