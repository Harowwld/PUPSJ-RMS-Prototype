"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
  courses = [],
}) {
  const [editingRowIndex, setEditingRowIndex] = useState(null)
  const [editData, setEditData] = useState({ category: "", name: "", code: "" })

  const [quickAdd, setQuickAdd] = useState({
    category: "DocumentType",
    name: "",
    code: "",
  })

  const handleQuickAdd = () => {
    if (!quickAdd.name) return
    if (onAddRow) {
      onAddRow(quickAdd)
      setQuickAdd({ category: "DocumentType", name: "", code: "" })
    }
  }

  const startEdit = (row) => {
    setEditingRowIndex(row.index)
    setEditData({ category: row.category, name: row.name, code: row.code })
  }

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
      <div className="flex h-full w-full flex-col p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-[500px] w-full rounded-brand" />
          <Skeleton className="h-[500px] w-full rounded-brand" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col p-6 font-inter animate-fade-up">
      {importStatus === "idle" ? (
        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Protocol card - Redesigned as a structured sidebar */}
          <Card className="flex flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm lg:col-span-5 xl:col-span-4">
            <div className="flex items-center gap-4 border-b border-gray-100 bg-gray-50/50 px-6 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon shadow-sm">
                <i className="ph-duotone ph-book-open text-xl"></i>
              </div>
              <div>
                <h3 className="text-base leading-none font-black tracking-tight text-gray-900 uppercase">
                  Import Instructions
                </h3>
                <p className="mt-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                  Data Categories
                </p>
              </div>
            </div>
            
            <CardContent className="space-y-8 overflow-y-auto p-6 scrollbar-hide">
              {/* architecture header */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase">
                    1. Architecture
                  </div>
                  <div className="h-px flex-1 bg-gray-100 ml-4"></div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {["Category", "Name", "Code"].map((col) => (
                    <div
                      key={col}
                      className="group flex flex-col items-center gap-1 rounded-xl border border-gray-200 bg-gray-50/50 py-3 transition-all hover:border-pup-maroon/30 hover:bg-white"
                    >
                      <span className="text-[10px] font-black tracking-tighter text-gray-900 uppercase group-hover:text-pup-maroon">
                        {col}
                      </span>
                      <div className="h-1 w-4 rounded-full bg-gray-200 group-hover:bg-pup-maroon/30"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Mapping Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase">
                    2. Data Mapping
                  </div>
                  <div className="h-px flex-1 bg-gray-100 ml-4"></div>
                </div>
                
                <div className="group relative overflow-hidden rounded-xl border border-red-100 bg-red-50/30 p-5 font-mono text-[11px] leading-relaxed text-gray-700 shadow-xs">
                  <div className="absolute top-0 right-0 p-3 opacity-10 transition-opacity group-hover:opacity-30">
                    <i className="ph-bold ph-file-csv text-4xl text-pup-maroon" />
                  </div>
                  <div className="mb-3 flex items-center gap-2 text-[9px] font-black tracking-[0.15em] text-pup-maroon/60 uppercase">
                    <i className="ph-bold ph-code text-xs" /> CSV Structure Example
                  </div>
                  <span className="font-bold text-gray-900">Category,Name,Code</span>
                  <br />
                  <span className="text-gray-500">DocumentType,Transcript of Records,</span>
                  <br />
                  <span className="text-gray-500">Course,Bachelor of Science in IT,BSIT</span>
                  <br />
                  <span className="text-gray-500">Section,Block 1,BSIT</span>
                </div>
              </div>

              {/* Logic Rules Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase">
                    3. Taxonomy Logic
                  </div>
                  <div className="h-px flex-1 bg-gray-100 ml-4"></div>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    {
                      label: "DocumentType",
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
                      className="group flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-xs transition-all hover:border-red-200 hover:shadow-md"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-pup-maroon border border-red-100 shadow-xs transition-transform group-hover:scale-110">
                        <i className={`ph-bold ${rule.icon} text-base`}></i>
                      </div>
                      <div>
                        <div className="mb-0.5 text-[10px] font-black tracking-tight text-gray-900 uppercase">
                          {rule.label}
                        </div>
                        <div className="text-[11px] leading-tight font-medium text-gray-500">
                          {rule.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload card - Adjusted for the new grid layout */}
          <Card className="flex flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm lg:col-span-7 xl:col-span-8">
            <div className="flex items-center gap-4 border-b border-gray-100 bg-gray-50/50 px-6 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon shadow-sm">
                <i className="ph-duotone ph-cloud-arrow-up text-xl"></i>
              </div>
              <div>
                <h3 className="text-base leading-none font-black tracking-tight text-gray-900 uppercase">
                  Transmission
                </h3>
                <p className="mt-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                  Select or drop your structured data
                </p>
              </div>
            </div>
            
            <CardContent className="flex flex-1 flex-col p-6">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <a
                  href="data:text/csv;charset=utf-8,Category,Name,Code%0ADocumentType,Transcript of Records,%0ADocumentType,Diploma,%0ACourse,Bachelor of Science in IT,BSIT%0ACourse,Bachelor of Science in Accountancy,BSA%0ASection,Block 1,BSIT%0ASection,Section 1,BSA"
                  download="PUP-IMPORT-TEMPLATE.csv"
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-xs transition-all hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon active:scale-95"
                >
                  <i className="ph-bold ph-download-simple text-base"></i>
                  Download Template
                </a>
                <button
                  type="button"
                  onClick={handleCopySample}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-xs transition-all hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon active:scale-95"
                >
                  <i className="ph-bold ph-copy text-base"></i>
                  Copy Raw Sample
                </button>
              </div>
              <div
                className={`group relative flex min-h-[320px] flex-1 cursor-pointer flex-col items-center justify-center rounded-brand border-2 border-dashed p-12 text-center shadow-sm transition-all ${
                  importDropActive
                    ? "border-gray-300 bg-red-50 shadow-inner"
                    : "border-gray-400 bg-gray-50 hover:border-gray-300 hover:bg-red-50/50"
                }`}
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
                <Empty className="pointer-events-none flex flex-col items-center justify-center border-0 text-center text-gray-500">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <EmptyMedia className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-transform group-hover:scale-110">
                      <i className="ph-duotone ph-file-arrow-up text-4xl text-pup-maroon"></i>
                    </EmptyMedia>
                    <EmptyTitle className="text-xl font-bold tracking-tight text-gray-900 uppercase">
                      Drop CSV File here
                    </EmptyTitle>
                    <EmptyDescription className="mt-2 text-sm font-medium text-gray-600">
                      or click to browse local files (.csv)
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : importStatus === "preview" ? (
      <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col gap-4 duration-300">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={resetImport}
              className="h-9 shrink-0 rounded-brand border-gray-300 px-3 text-gray-600 transition-all hover:border-gray-300 hover:text-pup-maroon active:scale-95"
            >
              <i className="ph-bold ph-arrow-left mr-2"></i> BACK
            </Button>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon shadow-sm">
                <i className="ph-duotone ph-table text-2xl"></i>
              </div>
              <div>
                <h3 className="text-lg leading-none font-black tracking-tight text-gray-900">
                  Import Preview
                </h3>
                <div className="mt-1.5 text-xs leading-tight font-medium text-gray-500">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800">
                    <i className="ph-bold ph-file-csv text-sm text-pup-maroon" />
                    {importFile?.name || "Records Data"}
                  </div>
                </div>
              </div>
            </div>
          </div>            <div className="flex items-center gap-3">
              <div className="flex items-center gap-4 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
                <span className="border-r border-gray-100 pr-4 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                  Summary
                </span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-700">
                      {importRows.length} rows detected · {importRows.filter((r) => r.error).length} invalid rows
                    </span>
                  </div>
                  <div className="h-4 w-px bg-gray-200 mx-1"></div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-bold text-gray-700">
                      {importRows.filter((r) => !r.error && importSelected[r.index]).length} Selected
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm">
            <div className="flex-1 overflow-auto bg-white">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-20 border-b border-gray-200 bg-gray-50">
                  <tr className="text-left text-[11px] font-black tracking-wider text-gray-500 uppercase">
                    <th className="w-12 p-4 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-pup-maroon accent-pup-maroon focus:ring-pup-maroon"
                        checked={
                          importRows.length > 0 &&
                          importRows.filter((r) => !r.error).every((r) => !!importSelected[r.index])
                        }
                        onChange={(e) => toggleImportSelectAll(e.target.checked)}
                      />
                    </th>
                    <th className="w-12 p-4 text-center">Row</th>
                    <th className="w-48 p-4">Category</th>
                    <th className="p-4 min-w-[200px]">Name / Label</th>
                    <th className="w-48 p-4">Identifier</th>
                    <th className="w-40 p-4 text-right">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="bg-gray-50/30 transition-colors hover:bg-gray-50/50">
                    <td className="p-4 text-center">
                      <div className="flex h-5 w-5 mx-auto items-center justify-center rounded-full border-2 border-dashed border-gray-300">
                        <i className="ph-bold ph-plus text-[10px] text-gray-400"></i>
                      </div>
                    </td>
                    <td className="p-4 text-center font-mono text-[11px] text-gray-400 italic">
                      NEW
                    </td>
                    <td className="p-4">
                      <Select
                        className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-[10px] font-bold uppercase focus:border-gray-300 focus:ring-pup-maroon"
                        value={quickAdd.category}
                        onChange={(e) =>
                          setQuickAdd((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                      >
                        <option value="DocumentType">DocumentType</option>
                        <option value="Course">Course</option>
                        <option value="Section">Section</option>
                      </Select>
                    </td>
                    <td className="p-4">
                      <Input
                        className="h-8 rounded-md border-gray-300 text-xs font-bold focus-visible:border-gray-300 focus-visible:ring-pup-maroon"
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
                          className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-[10px] font-bold uppercase focus:border-gray-300 focus:ring-pup-maroon"
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
                          className="h-8 rounded-md border-gray-300 font-mono text-xs focus-visible:border-gray-300 focus-visible:ring-pup-maroon"
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
                        className="h-8 rounded-md bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all px-4 text-[10px] font-black text-white"
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
                        className={`transition-colors hover:bg-gray-50 ${row.error ? "bg-red-50" : ""}`}
                      >
                        <td className={`p-4 text-center ${row.error ? "border-l-4 border-l-red-500" : ""}`}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-pup-maroon accent-pup-maroon focus:ring-pup-maroon disabled:cursor-not-allowed disabled:opacity-30"
                            checked={!!importSelected[row.index]}
                            onChange={() => toggleImportRowSelected(row.index)}
                            disabled={!!row.error || isEditing}
                          />
                        </td>
                        <td className="p-4 text-center font-mono text-[11px] text-gray-400">
                          {row.index}
                        </td>
                        <td className="p-4">
                          {isEditing ? (
                            <Select
                              className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-[10px] font-bold uppercase focus:border-gray-300 focus:ring-pup-maroon"
                              value={editData.category}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  category: e.target.value,
                                }))
                              }
                            >
                              <option value="DocumentType">DocumentType</option>
                              <option value="Course">Course</option>
                              <option value="Section">Section</option>
                            </Select>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`border-0 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase ${
                                row.category.toLowerCase() === "documenttype"
                                  ? "bg-purple-100 text-purple-700"
                                  : row.category.toLowerCase() === "course"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {row.category || "MISSING"}
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          {isEditing ? (
                            <Input
                              className="h-8 rounded-md border-gray-300 text-xs font-bold focus-visible:border-gray-300 focus-visible:ring-pup-maroon"
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
                              className={`text-sm font-bold ${row.error && !row.name ? "text-red-400 italic" : "text-gray-900"}`}
                            >
                              {row.name || "(Required field missing)"}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {isEditing ? (
                            editData.category.toLowerCase() === "section" ? (
                              <Select
                                className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-[10px] font-bold uppercase focus:border-gray-300 focus:ring-pup-maroon"
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
                                className="h-8 rounded-md border-gray-300 font-mono text-xs focus-visible:border-gray-300 focus-visible:ring-pup-maroon"
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
                            <div className="font-mono text-xs text-gray-500">
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
                                <i className="ph-bold ph-check mr-1"></i> SAVE
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEdit}
                                className="h-8 rounded-md px-2 text-[10px] font-black text-gray-400 hover:bg-gray-100"
                              >
                                <i className="ph-bold ph-x mr-1"></i> CANCEL
                              </Button>
                            </div>
                          ) : row.error ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex cursor-help items-center gap-1.5 text-red-600">
                                    <i className="ph-bold ph-warning-circle text-base"></i>
                                    <span className="text-[11px] font-black tracking-tight uppercase">
                                      {row.error}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-red-950 text-white border-red-900">
                                  <p className="text-[10px] font-bold uppercase tracking-wider">
                                    Row Validation Failed: {row.error}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(row)}
                                className="h-8 w-8 rounded-full p-0 text-pup-maroon hover:bg-red-50"
                                title="Fix Entry"
                              >
                                <i className="ph-bold ph-pencil-simple text-sm"></i>
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5 text-emerald-600">
                              <div className="flex items-center gap-1.5">
                                <i className="ph-bold ph-check-circle text-base"></i>
                                <span className="text-[11px] font-black tracking-tight uppercase">
                                  Validated
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(row)}
                                className="h-8 w-8 rounded-full p-0 text-gray-400 hover:bg-gray-100"
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
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 p-4">
              <p className="max-w-md text-[10px] font-medium text-gray-500">
                Only valid and selected rows will be committed to the database. Invalid rows are
                automatically excluded. Duplicate records (matching name or code) will be ignored by
                the system.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetImport}
                  className="h-9 px-4 text-xs font-bold text-gray-500 transition-colors hover:bg-red-50/30 hover:text-pup-maroon"
                >
                  <i className="ph-bold ph-trash-simple text-sm mr-2"></i>
                  CANCEL IMPORT
                </Button>
                <Button
                  onClick={executeBulkImport}
                  disabled={importRows.filter((r) => !r.error && importSelected[r.index]).length === 0}
                  className="h-10 rounded-brand bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md px-8 font-black tracking-widest text-white uppercase shadow-lg shadow-red-900/20 active:scale-95 transition-all"
                >
                  <i className="ph-bold ph-cloud-arrow-up mr-2 text-lg"></i>
                  Confirm & Import {importRows.filter((r) => !r.error && importSelected[r.index]).length} Records
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : importStatus === "importing" ? (
        <div className="animate-fade-in flex flex-1 flex-col items-center justify-center rounded-brand border border-gray-300 bg-white shadow-sm">
          <div className="flex max-w-sm flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="h-20 w-20 animate-spin rounded-full border-4 border-gray-300/10 border-t-pup-maroon"></div>
              <i className="ph-duotone ph-database absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl text-pup-maroon"></i>
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">Adding Records</h3>
              <p className="mt-2 text-sm font-medium text-gray-500">
                Writing validated entries to the system. Please do not close the window.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in zoom-in-95 flex flex-1 flex-col items-center justify-center rounded-brand border border-gray-300 bg-white shadow-sm duration-300">
          <div className="flex w-full max-w-md flex-col items-center gap-8 px-6 text-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-red-50 text-pup-maroon shadow-xl">
                <i className="ph-fill ph-database text-5xl"></i>
              </div>
              <div className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white shadow-sm">
                <i className="ph-bold ph-check text-xs"></i>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight text-gray-900">Import Complete</h3>
              <p className="text-sm leading-relaxed font-medium text-gray-500">
                The batch of records has been successfully merged into the{" "}
                <span className="font-bold text-pup-maroon">system</span>. All records are
                now active.
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 shadow-sm">
              <div className="space-y-1 bg-white p-5">
                <div className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                  Added Successfully
                </div>
                <div className="text-3xl font-black text-emerald-600 tabular-nums">
                  {importResults?.successCount || 0}
                </div>
              </div>
              <div className="space-y-1 border-l border-gray-100 bg-white p-5">
                <div className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                  Skipped / Duplicates
                </div>
                <div className="text-3xl font-black text-amber-600 tabular-nums">
                  {importResults?.failCount || 0}
                </div>
              </div>
            </div>

            <div className="flex w-full max-w-[280px] flex-col gap-3">
              <Button
                onClick={resetImport}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-brand bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md font-black tracking-widest text-white uppercase shadow-md active:scale-95 transition-all"
              >
                <i className="ph-bold ph-arrow-left text-base"></i>
                Return to Imports
              </Button>
              <button
                onClick={() => setActiveSubTab("document-types")}
                className="text-[10px] font-black tracking-widest text-gray-400 uppercase transition-colors hover:text-pup-maroon"
              >
                Verify Taxonomy Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
