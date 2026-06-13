"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
    return (
      <div className="flex h-full w-full flex-col">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-[500px] w-full rounded-brand dark:bg-muted" />
          <Skeleton className="h-[500px] w-full rounded-brand dark:bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-6 font-inter animate-fade-up">
      {importStatus === "idle" ? (
        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Protocol card - Redesigned as a structured sidebar */}
          {/* Upload card - Standardized to span full width */}
          <Card className="flex flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm lg:col-span-12 dark:bg-card dark:shadow-none dark:border-white/10 w-full">
            <PageHeader
              title="Import"
              description="Select or drop your structured data"
              actions={
                <div className="flex items-center gap-2 select-none">
                  <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">Instructions</span>
                  <button
                    type="button"
                    onClick={() => setShowInstructions(!showInstructions)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:ring-offset-2",
                      showInstructions ? "bg-pup-maroon" : "bg-gray-200 dark:bg-zinc-700"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                        showInstructions ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              }
            />
            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 bg-transparent p-4 dark:border-white/5 dark:bg-transparent">
              <a
                href="data:text/csv;charset=utf-8,Category,Name,Code%0ADOCUMENT TYPE,Transcript of Records,%0ADOCUMENT TYPE,Diploma,%0ACourse,Bachelor of Science in IT,BSIT%0ACourse,Bachelor of Science in Accountancy,BSA%0ASection,Block 1,BSIT%0ASection,Section 1,BSA"
                download="PUP-IMPORT-TEMPLATE.csv"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-[10px] font-black tracking-widest text-gray-600 shadow-xs transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 dark:bg-card dark:text-zinc-300 dark:hover:border-zinc-700 dark:border-white/10"
              >
                <i className="ph-bold ph-download-simple text-base"></i>
                Download Template
              </a>
              <button
                type="button"
                onClick={handleCopySample}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-[10px] font-black tracking-widest text-gray-600 shadow-xs transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 dark:bg-card dark:text-zinc-300 dark:hover:border-zinc-700 dark:border-white/10"
              >
                <i className="ph-bold ph-copy text-base"></i>
                Copy Raw Sample
              </button>
            </div>
          </Card>

          <Card className="flex flex-col flex-1 overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm lg:col-span-12 dark:bg-card dark:shadow-none dark:border-white/10 w-full">
            <CardContent className="flex flex-1 flex-col p-6 bg-white dark:bg-card/50 backdrop-blur-md">
              <div
                className={`group relative flex min-h-[320px] flex-1 cursor-pointer flex-col items-center justify-center rounded-brand border-2 border-dashed p-12 text-center shadow-sm transition-all ${ importDropActive ? "border-gray-300 bg-red-50 shadow-inner" : "border-gray-400 bg-gray-50 hover:border-gray-300 hover:bg-red-50" } dark:shadow-none dark:border-white/10 dark:bg-red-950/30 dark:hover:border-zinc-700`}
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
                <Empty className="pointer-events-none flex flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <EmptyMedia className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-gray-200 bg-white shadow-sm transition-transform group-hover:scale-110 dark:border-white/10 dark:bg-card dark:shadow-none">
                      <i className="ph-duotone ph-file-arrow-up text-4xl text-pup-maroon dark:text-primary"></i>
                    </EmptyMedia>
                    <EmptyTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-50">
                      Drop CSV File here
                    </EmptyTitle>
                    <EmptyDescription className="mt-2 text-sm font-medium text-gray-600 dark:text-zinc-300">
                      or click to browse local files (.csv)
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : importStatus === "preview" ? (
      <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 min-h-[500px] flex-col gap-4 duration-300">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={resetImport}
              className="h-9 shrink-0 rounded-brand border-gray-300 px-3 text-gray-600 transition-all hover:border-gray-300 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 dark:text-zinc-300 dark:hover:border-zinc-700 dark:border-white/10"
            >
              <i className="ph-bold ph-arrow-left mr-2"></i> BACK
            </Button>
            <div className="flex items-center gap-4">
              <div>
                <CardTitle className="text-xl leading-none font-black tracking-tight text-gray-900 dark:text-zinc-50">
                  Import Preview
                </CardTitle>
                <CardDescription className="mt-1.5 text-sm font-medium text-gray-500 transition-colors dark:text-zinc-400">
                  <span className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-zinc-100">
                    <i className="ph-bold ph-file-csv text-sm text-pup-maroon dark:text-primary" />
                    {importFile?.name || "Records Data"}
                  </span>
                </CardDescription>
              </div>
            </div>
          </div>            <div className="flex items-center gap-3">
              <div className="flex items-center gap-4 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                <span className="border-r border-gray-100 pr-4 text-[10px] font-black tracking-widest text-gray-400 dark:border-white/10 dark:text-zinc-300">
                  SUMMARY
                </span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-700 dark:text-zinc-200">
                      {importRows.length} rows detected · {importRows.filter((r) => r.error).length} invalid rows
                    </span>
                  </div>
                  <div className="h-4 w-px bg-gray-200 mx-1 dark:bg-zinc-700"></div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-bold text-gray-700 dark:text-zinc-200">
                      {importRows.filter((r) => !r.error && importSelected[r.index]).length} Selected
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm dark:bg-card dark:shadow-none dark:border-white/10">
            <div className="flex-1 overflow-hidden overflow-auto bg-white dark:bg-card rounded-[inherit]">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-20 border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-muted">
                  <tr className="text-left text-[11px] font-black tracking-wider text-gray-500 dark:text-zinc-400 dark:border-white/10">
                    <th className="w-12 p-4 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:text-primary dark:border-white/10"
                        checked={
                          importRows.length > 0 &&
                          importRows.filter((r) => !r.error).every((r) => !!importSelected[r.index])
                        }
                        onChange={(e) => toggleImportSelectAll(e.target.checked)}
                      />
                    </th>
                    <th className="w-12 p-4 text-center dark:text-zinc-300">Row</th>
                    <th className="w-48 p-4 dark:text-zinc-300">Category</th>
                    <th className="p-4 min-w-[200px] dark:text-zinc-300">Name / Label</th>
                    <th className="w-48 p-4 dark:text-zinc-300">Identifier</th>
                    <th className="w-40 p-4 text-right dark:text-zinc-300">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  <tr className="bg-gray-50 transition-colors hover:bg-gray-50 dark:bg-card dark:hover:bg-white/10">
                    <td className="p-4 text-center">
                      <div className="flex h-5 w-5 mx-auto items-center justify-center rounded-full border-2 border-dashed border-gray-300 dark:border-white/10">
                        <i className="ph-bold ph-plus text-[10px] text-gray-400 dark:text-zinc-500"></i>
                      </div>
                    </td>
                    <td className="p-4 text-center font-mono text-[11px] text-gray-400 italic dark:text-zinc-500">
                      NEW
                    </td>
                    <td className="p-4">
                      <Select
                        className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-[10px] font-bold focus:border-gray-300 focus:ring-pup-maroon dark:bg-card dark:focus:border-zinc-700 dark:border-white/10"
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
                        <option value="DOCUMENT TYPE">DOCUMENT TYPE</option>
                        <option value="Course">Course</option>
                        <option value="Section">Section</option>
                      </Select>
                    </td>
                    <td className="p-4">
                      <Input
                        className="h-8 rounded-md border-gray-300 text-xs font-bold focus-visible:border-gray-300 focus-visible:ring-pup-maroon dark:border-white/10"
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
                          className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-[10px] font-bold focus:border-gray-300 focus:ring-pup-maroon dark:bg-card dark:focus:border-zinc-700 dark:border-white/10"
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
                          className="h-8 rounded-md border-gray-300 font-mono text-xs focus-visible:border-gray-300 focus-visible:ring-pup-maroon dark:border-white/10"
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
                        className="h-8 rounded-md btn-brand-red hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all px-4 text-[10px] font-black text-white dark:shadow-none"
                      >
                        <i className="ph-bold ph-plus mr-1"></i> ADD ROW
                      </Button>
                    </td>
                  </tr>
                  {importRows.map((row) => {
                    const isEditing = editingRowIndex === row.index
                    return (
                      <tr
                        key={row.index}
                        className={`transition-colors hover:bg-gray-50 ${row.error ? "bg-red-50 dark:bg-red-500/10" : ""} dark:hover:bg-white/10 dark:bg-card`}
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
                        <td className="p-4 text-center font-mono text-[11px] text-gray-400 dark:text-zinc-500">
                          {row.index}
                        </td>
                        <td className="p-4">
                          {isEditing ? (
                            <Select
                              className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-[10px] font-bold focus:border-gray-300 focus:ring-pup-maroon dark:bg-card dark:focus:border-zinc-700 dark:border-white/10"
                              value={editData.category}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  category: e.target.value,
                                }))
                              }
                            >
                              <option value="DOCUMENT TYPE">DOCUMENT TYPE</option>
                              <option value="Course">Course</option>
                              <option value="Section">Section</option>
                            </Select>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`border-0 px-2 py-0.5 text-[9px] font-black tracking-widest ${ row.category.toLowerCase() === "documenttype" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : row.category.toLowerCase() === "course" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" }`}
                            >
                              {row.category || "MISSING"}
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          {isEditing ? (
                            <Input
                              className="h-8 rounded-md border-gray-300 text-xs font-bold focus-visible:border-gray-300 focus-visible:ring-pup-maroon dark:border-white/10"
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
                              className={`text-sm font-bold truncate max-w-[400px] ${row.error && !row.name ? "text-red-400 italic" : "text-gray-900 dark:text-zinc-50"}`}
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
                                className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-[10px] font-bold focus:border-gray-300 focus:ring-pup-maroon dark:bg-card dark:focus:border-zinc-700 dark:border-white/10"
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
                                className="h-8 rounded-md border-gray-300 font-mono text-xs focus-visible:border-gray-300 focus-visible:ring-pup-maroon dark:border-white/10"
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
                            <div className="font-mono text-xs text-gray-500 dark:text-zinc-400">
                              {row.code || "—"}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={saveEdit}
                                className="h-8 rounded-md bg-emerald-600 px-2 text-[10px] font-black text-white hover:bg-emerald-700"
                              >
                                <i className="ph-bold ph-check mr-1"></i>Save</Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEdit}
                                className="h-8 rounded-md px-2 text-[10px] font-bold text-gray-400 hover:text-gray-600 hover:bg-transparent dark:text-zinc-500 dark:hover:text-zinc-300"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : row.error ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex cursor-help items-center gap-1.5 text-red-600">
                                    <i className="ph-bold ph-warning-circle text-base"></i>
                                    <span className="text-[11px] font-black tracking-tight">
                                      {row.error}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-red-950 text-white border-red-900">
                                  <p className="text-[10px] font-bold tracking-wider">
                                    Row Validation Failed: {row.error}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(row)}
                                className="h-8 w-8 rounded-full p-0 text-pup-maroon dark:text-primary hover:bg-red-50 dark:text-primary dark:bg-red-950/30"
                                title="Fix Entry"
                              >
                                <i className="ph-bold ph-pencil-simple text-sm"></i>
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5 text-emerald-600 dark:text-emerald-400">
                              <div className="flex items-center gap-1.5">
                                <i className="ph-bold ph-check-circle text-base"></i>
                                <span className="text-[11px] font-black tracking-tight">
                                  Validated
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(row)}
                                className="h-8 w-8 rounded-full p-0 text-gray-400 hover:bg-gray-100 dark:bg-muted dark:hover:bg-white/10 dark:text-zinc-500"
                                title="Edit Entry"
                              >
                                <i className="ph-bold ph-pencil-simple text-sm"></i>
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 bg-transparent p-4 dark:border-white/10 dark:bg-transparent">
              <p className="max-w-md text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                Only valid and selected rows will be committed to the database. Invalid rows are
                automatically excluded. Duplicate records (matching name or code) will be ignored by
                the system.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetImport}
                  className="px-4 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors"
                >
                  CANCEL IMPORT
                </Button>
                <Button
                  onClick={executeBulkImport}
                  disabled={importRows.filter((r) => !r.error && importSelected[r.index]).length === 0}
                  className="h-10 rounded-brand btn-brand-red active:scale-95 transition-all dark:shadow-none"
                >
                  <i className="ph-bold ph-cloud-arrow-up mr-2 text-lg"></i>
                  Confirm & Import {importRows.filter((r) => !r.error && importSelected[r.index]).length} Records
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : importStatus === "importing" ? (
        <div className="animate-fade-up flex flex-1 min-h-[500px] flex-col items-center justify-center rounded-brand border border-gray-300 bg-white shadow-sm dark:bg-card dark:shadow-none dark:border-white/10">
          <div className="flex max-w-sm flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="h-20 w-20 animate-spin rounded-full border-4 border-gray-300 border-t-pup-maroon dark:border-white/10"></div>
              <i className="ph-duotone ph-database absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl text-pup-maroon dark:text-primary"></i>
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-zinc-50">Adding Records</h3>
              <p className="mt-2 text-sm font-medium text-gray-500 dark:text-zinc-400">
                Writing validated entries to the system. Please do not close the window.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in zoom-in-95 flex flex-1 min-h-[500px] flex-col items-center justify-center rounded-brand border border-gray-300 bg-white shadow-sm duration-300 dark:bg-card dark:shadow-none dark:border-white/10">
          <div className="flex w-full max-w-md flex-col items-center gap-8 px-6 text-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white bg-red-50 text-pup-maroon shadow-xl dark:bg-red-950/30 dark:border-white/10">
                <i className="ph-fill ph-database text-5xl"></i>
              </div>
              <div className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white shadow-sm dark:border-card">
                <i className="ph-bold ph-check text-xs"></i>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-zinc-50">Import Complete</h3>
              <p className="text-sm leading-relaxed font-medium text-gray-500 dark:text-zinc-400">
                The batch of records has been successfully merged into the{" "}
                <span className="font-bold text-pup-maroon dark:text-primary">system</span>. All records are
                now active.
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 shadow-sm dark:border-white/10 dark:shadow-none dark:bg-zinc-700">
              <div className="space-y-1 bg-white p-5 dark:bg-card">
                <div className="text-[10px] font-black tracking-widest text-gray-400 dark:text-zinc-500">
                  Added Successfully
                </div>
                <div className="text-3xl font-black text-emerald-600 tabular-nums dark:text-emerald-400">
                  {importResults?.successCount || 0}
                </div>
              </div>
              <div className="space-y-1 border-l border-gray-100 bg-white p-5 dark:border-white/10 dark:bg-card">
                <div className="text-[10px] font-black tracking-widest text-gray-400 dark:text-zinc-500">
                  Skipped / Duplicates
                </div>
                <div className="text-3xl font-black text-amber-600 tabular-nums dark:text-amber-400">
                  {importResults?.failCount || 0}
                </div>
              </div>
            </div>

            <div className="flex w-full max-w-[280px] flex-col gap-3">
              <Button
                onClick={resetImport}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-brand btn-brand-red active:scale-95 transition-all dark:shadow-none"
              >
                <i className="ph-bold ph-arrow-left text-base"></i>
                Return to Imports
              </Button>
              <button
                onClick={() => setActiveSubTab("document-types")}
                className="text-[10px] font-black tracking-widest text-gray-400 transition-colors hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-500"
              >
                Verify Taxonomy Records
              </button>
            </div>
          </div>
        </div>
      )}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-md overflow-hidden rounded-[2rem] border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">
            <DialogTitle className="text-xl leading-none font-black tracking-tight text-gray-900 dark:text-zinc-50">
              Import Instructions
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-sm font-medium text-gray-500 transition-colors dark:text-zinc-400">
              Data Categories
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8 overflow-y-auto p-6 scrollbar-hide max-h-[70vh]">
            {/* architecture header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black tracking-[0.2em] text-gray-400 dark:text-zinc-500">
                  1. Architecture
                </div>
                <div className="h-px flex-1 bg-gray-100 ml-4 dark:bg-zinc-800/50"></div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {["Category", "Name", "Code"].map((col) => (
                  <div
                    key={col}
                    className="group flex flex-col items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 py-3 transition-all hover:border-pup-maroon/30 hover:bg-white dark:border-white/5 dark:bg-zinc-800/30 dark:hover:bg-zinc-800/60 dark:hover:border-red-500/20"
                  >
                    <span className="text-[10px] font-black tracking-tighter text-gray-900 group-hover:text-pup-maroon dark:group-hover:text-primary dark:text-zinc-400">
                      {col}
                    </span>
                    <div className="h-1 w-4 rounded-full bg-gray-200 group-hover:bg-pup-maroon/30 dark:bg-zinc-700 dark:group-hover:bg-primary/30"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Mapping Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black tracking-[0.2em] text-gray-400 dark:text-zinc-500">
                  2. Data Mapping
                </div>
                <div className="h-px flex-1 bg-gray-100 ml-4 dark:bg-zinc-800/50"></div>
              </div>
              
              <div className="group relative overflow-hidden rounded-xl border border-red-100 bg-red-50 p-5 font-mono text-[11px] leading-relaxed text-gray-700 shadow-xs dark:bg-red-500/5 dark:border-red-500/20 dark:text-zinc-100">
                <div className="absolute top-0 right-0 p-3 opacity-10 transition-opacity group-hover:opacity-30">
                  <i className="ph-bold ph-file-csv text-4xl text-pup-maroon dark:text-primary" />
                </div>
                <div className="mb-3 flex items-center gap-2 text-[9px] font-black tracking-[0.15em] text-pup-maroon dark:text-primary">
                  <i className="ph-bold ph-code text-xs" /> CSV Structure Example
                </div>
                <span className="font-bold text-gray-900 dark:text-zinc-50 border-b border-red-200/50 dark:border-white/5 pb-0.5">Category,Name,Code</span>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-zinc-400">DocumentType,</span>
                    <span className="text-gray-800 dark:text-zinc-300 font-bold">Transcript of Records,</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-zinc-400">Course,</span>
                    <span className="text-gray-800 dark:text-zinc-300 font-bold">Bachelor of Science in IT,</span>
                    <span className="text-red-700 dark:text-primary font-black">BSIT</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-zinc-400">Section,</span>
                    <span className="text-gray-800 dark:text-zinc-300 font-bold">Block 1,</span>
                    <span className="text-red-700 dark:text-primary font-black">BSIT</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Logic Rules Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black tracking-[0.2em] text-gray-400 dark:text-zinc-500">
                  3. Taxonomy Logic
                </div>
                <div className="h-px flex-1 bg-gray-100 ml-4 dark:bg-zinc-800/50"></div>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    label: "DOCUMENT TYPE",
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
                    className="group flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-xs transition-all hover:border-red-200 hover:shadow-md dark:border-white/5 dark:bg-zinc-800/30 dark:shadow-none"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-pup-maroon dark:text-primary border border-red-100 shadow-xs transition-transform group-hover:scale-110 dark:bg-red-500/10 dark:text-primary dark:border-red-500/20">
                      <i className={`ph-bold ${rule.icon} text-base`}></i>
                    </div>
                    <div>
                      <div className="mb-0.5 text-[10px] font-black tracking-tight text-gray-900 dark:text-zinc-50">
                        {rule.label}
                      </div>
                      <div className="text-[11px] leading-tight font-medium text-gray-500 dark:text-zinc-400">
                        {rule.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}



