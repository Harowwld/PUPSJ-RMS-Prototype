"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import PageHeader from "@/components/shared/PageHeader"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"


export default function DocTypesTab({
  loading = false,
  docTypes,
  docSearch,
  setDocSearch,
  showArchived,
  setShowArchived,
  pageDoc,
  setPageDoc,
  itemsPerPage,
  setItemsPerPage,
  filteredDocTypes,
  filteredDocTypesFull,
  selectedDocTypes,
  toggleDocTypeSelected,
  toggleAllDocTypes,
  executeBulkTaxonomyAction,
  setConfirmPayload,
  setConfirmOpen,
  onSort,
  sortDoc,
  showToast,
  loadAll,
  handleExportDocTypes: handleExportProp,
}) {
  const [localSearch, setLocalSearch] = useState(docSearch)
  const [jumpPage, setJumpPage] = useState(String(pageDoc))

  const [isAddDocTypeOpen, setIsAddDocTypeOpen] = useState(false)
  const [newDocTypeName, setNewDocTypeName] = useState("")
  const [isEditDocTypeOpen, setIsEditDocTypeOpen] = useState(false)
  const [editDocType, setEditDocType] = useState({ id: null, name: "" })

  const [isQuickAddLoading, setIsQuickAddLoading] = useState(false)

  async function addDocType(e, nameOverride = null) {
    if (e) e.preventDefault()
    const name = nameOverride || newDocTypeName.trim()
    if (!name) return

    if (nameOverride) setIsQuickAddLoading(true)

    try {
      const res = await fetch("/api/doc-types?admin=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Add failed")

      if (!nameOverride) {
        setNewDocTypeName("")
        setIsAddDocTypeOpen(false)
      } else {
        setNewDocTypeName("")
      }

      showToast({ title: "Document Type Added", description: "The new document type has been successfully registered in the system." })
      if (loadAll) loadAll()
    } catch (err) {
      showToast({ title: "Registration Failed", description: err.message }, true)
    } finally {
      if (nameOverride) setIsQuickAddLoading(false)
    }
  }

  async function updDocType(e) {
    e.preventDefault()
    if (!editDocType.name.trim()) return
    try {
      const res = await fetch(`/api/doc-types?id=${editDocType.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editDocType.name.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed")
      setIsEditDocTypeOpen(false)
      showToast({ title: "Document Type Updated", description: "The changes to the document type have been successfully saved." })
      if (loadAll) loadAll()
    } catch (err) {
      showToast({ title: "Update Failed", description: err.message }, true)
    }
  }

  async function delDocType(id, name) {
    try {
      const res = await fetch(`/api/doc-types?id=${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Archive failed")
      setConfirmOpen(false)
      showToast({ title: "Document Type Archived", description: "The selected document type has been successfully moved to the archive." })
      if (loadAll) loadAll()
    } catch (err) {
      showToast({ title: "Archival Failed", description: err.message }, true)
    }
  }

  async function resDocType(id, name) {
    try {
      const res = await fetch(`/api/doc-types?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Active" }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Restore failed")
      setConfirmOpen(false)
      showToast({ title: "Document Type Restored", description: "The document type has been successfully restored from the archive." })
      if (loadAll) loadAll()
    } catch (err) {
      showToast({ title: "Restoration Failed", description: err.message }, true)
    }
  }


  useEffect(() => {
    setJumpPage(String(pageDoc))
  }, [pageDoc])

  useEffect(() => {
    const handler = setTimeout(() => {
      setDocSearch(localSearch)
    }, 300)
    return () => clearTimeout(handler)
  }, [localSearch, setDocSearch])

  useEffect(() => {
    if (docSearch === "") setLocalSearch("")
  }, [docSearch])

  const handleItemsPerPageChange = (e) => {
    const value = Number(e.target.value)
    setItemsPerPage(value)
    setPageDoc(1)
  }

  const handleJumpPage = (e) => {
    if (e.key === "Enter" || e.type === "blur") {
      const val = parseInt(jumpPage)
      const totalPages = Math.ceil(filteredDocTypesFull.length / itemsPerPage)
      if (!isNaN(val) && val >= 1 && val <= totalPages) {
        setPageDoc(val)
      } else {
        setJumpPage(String(pageDoc))
      }
    }
  }

  const SortIndicator = ({ column }) => {
    if (sortDoc.key !== column)
      return <i className="ph-bold ph-caret-up-down ml-1 opacity-30"></i>
    return sortDoc.direction === "asc" ? (
      <i className="ph-bold ph-caret-up ml-1 text-pup-maroon"></i>
    ) : (
      <i className="ph-bold ph-caret-down ml-1 text-pup-maroon"></i>
    )
  }

  const handleExportDocTypes = handleExportProp || (() => {
    const csvContent = [
      ["ID", "Name", "Status"],
      ...docTypes.map((dt) => [dt.id, dt.name, dt.status]),
    ]
      .map((e) => e.join(","))
      .join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute(
      "download",
      `document_types_${new Date().toISOString().split("T")[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    if (showToast) {
      showToast({
        title: "Export Success",
        description: "Document types taxonomy has been successfully exported to CSV.",
      })
    }
  })

  const selectedCount = Object.values(selectedDocTypes).filter(Boolean).length
  const selectedNames = filteredDocTypes
    .filter((dt) => selectedDocTypes[dt.id])
    .map((dt) => dt.name)

  const handleBulkAction = () => {
    setConfirmPayload({
      title: showArchived ? "Restore Selected Document Types" : "Archive Selected Document Types",
      message: `Apply ${showArchived ? "restoration" : "archival"} to the following ${selectedCount} document types?`,
      confirmLabel: showArchived ? "Restore Selected" : "Archive Selected",
      variant: showArchived ? "success" : "danger",
      buttonIcon: showArchived ? "ph-bold ph-arrow-counter-clockwise" : "ph-bold ph-archive",
      icon: showArchived ? "ph-duotone ph-arrow-counter-clockwise" : "ph-duotone ph-archive",
      selectedItems: selectedNames,
      onConfirm: () => executeBulkTaxonomyAction("DocumentType", showArchived ? "restore" : "delete"),
    })
    setConfirmOpen(true)
  }

  if (loading && docTypes.length === 0) {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-64 rounded-brand" />
            <Skeleton className="h-10 w-48 rounded-brand" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-brand" />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in font-inter flex h-full w-full flex-col">
      <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm">
        <PageHeader
          icon="ph-files"
          title={
            <div className="flex items-center gap-2">
              Document Types
              {showArchived && (
                <Badge className="border-red-100 bg-red-50 text-[10px] font-black text-red-700">
                  RESTORE MODE
                </Badge>
              )}
            </div>
          }
          description="Manage formal document categories and digitization requirements."
          searchPlaceholder="Filter document name..."
          searchLabel="Search Document Types"
          searchValue={localSearch}
          onSearchChange={setLocalSearch}
          filters={
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex h-full flex-col gap-1.5">
                <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                  Status View
                </label>
                <div className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-gray-100 p-1 shadow-sm">
                  <button
                    onClick={() => setShowArchived(false)}
                    className={`flex h-full items-center gap-2 rounded-md px-3 text-[10px] font-black tracking-widest uppercase transition-all ${
                      !showArchived
                        ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    ACTIVE
                  </button>
                  <button
                    onClick={() => setShowArchived(true)}
                    className={`flex h-full items-center gap-2 rounded-md px-3 text-[10px] font-black tracking-widest uppercase transition-all ${
                      showArchived
                        ? "bg-amber-600 text-white shadow-sm ring-1 ring-black/5"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    ARCHIVED
                  </button>
                </div>
              </div>
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleExportDocTypes}
                    className="flex h-10 w-10 items-center justify-center rounded-brand border border-gray-300 bg-white p-0 text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95"
                  >
                    <i className="ph-bold ph-file-csv text-base"></i>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Export to CSV</TooltipContent>
              </Tooltip>

              <Button
                onClick={() => setIsAddDocTypeOpen(true)}
                disabled={showArchived}
                className="flex h-10 items-center gap-2 rounded-brand bg-pup-maroon px-5 font-bold text-white shadow-sm transition-all hover:bg-red-900 active:scale-95 disabled:opacity-50"
              >
                <i className="ph-bold ph-plus"></i>
                <span className="hidden uppercase sm:inline">
                  Add Document Type
                </span>
              </Button>
            </div>
          }
        />

        {/* Active Filter Chips Row */}
        {(localSearch !== "" || showArchived) && (
          <div className="flex-none border-b border-gray-100 bg-white px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase">Active Filters:</span>
              {localSearch && (
                <div className="flex items-center gap-1 rounded-full border border-pup-maroon/20 bg-pup-maroon/10 px-2.5 py-1 text-[10px] font-bold text-pup-maroon uppercase">
                  Search: {localSearch}
                  <button
                    onClick={() => { setLocalSearch(""); setDocSearch(""); setPageDoc(1); }}
                    className="ml-1 hover:text-pup-darkMaroon transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
                  </button>
                </div>
              )}
              {showArchived && (
                <div className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600 uppercase">
                  Mode: Archived Records
                  <button
                    onClick={() => { setShowArchived(false); setPageDoc(1); }}
                    className="ml-1 hover:text-amber-800 transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
                  </button>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLocalSearch("")
                  setDocSearch("")
                  setShowArchived(false)
                  setPageDoc(1)
                }}
                className="h-6 rounded-full border border-dashed border-pup-maroon/30 px-3 text-[10px] font-black text-pup-maroon hover:bg-red-50 hover:text-pup-darkMaroon uppercase"
              >
                CLEAR ALL FILTERS
              </Button>
            </div>
          </div>
        )}

        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Archive Mode Overlay Pattern */}
          {showArchived && (
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-[0.03]">
              <i className="ph-fill ph-archive text-[320px]"></i>
            </div>
          )}

          <div className="relative z-10 overflow-x-auto rounded-b-brand border-x border-b border-gray-200 bg-white shadow-sm">
            {loading ? (
              <div className="space-y-4 p-8">
                <Skeleton className="h-8 w-full rounded-brand" />
                <Skeleton className="h-8 w-full rounded-brand" />
                <Skeleton className="h-8 w-full rounded-brand" />
                <Skeleton className="h-8 w-full rounded-brand" />
                <Skeleton className="h-8 w-full rounded-brand" />
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                  <tr className="text-left text-xs tracking-wider text-gray-600 uppercase">
                    <th className="w-16 p-3 px-6 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-pup-maroon accent-pup-maroon focus:ring-pup-maroon disabled:cursor-not-allowed disabled:opacity-20"
                        checked={
                          filteredDocTypes.length > 0 &&
                          filteredDocTypes.every(
                            (dt) => selectedDocTypes[dt.id]
                          )
                        }
                        onChange={(e) => toggleAllDocTypes(e.target.checked)}
                        disabled={filteredDocTypes.length === 0}
                      />
                    </th>
                    <th className="p-3 px-6 font-bold">
                      <button
                        onClick={() => onSort("name")}
                        className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                      >
                        Name / Label <SortIndicator column="name" />
                      </button>
                    </th>
                    <th className="w-40 p-3 px-6 font-bold text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="w-32 p-3 px-6 text-right font-bold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {!showArchived && (
                    <tr
                      className={`transition-all duration-300 ${newDocTypeName.trim() ? "bg-amber-50/50 hover:bg-amber-100/50" : "bg-gray-50/30 hover:bg-gray-50/50"}`}
                    >
                      <td className="p-3 px-6 text-center">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-dashed transition-colors ${newDocTypeName.trim() ? "border-amber-400" : "border-gray-300"}`}
                        >
                          <i
                            className={`ph-bold text-[10px] ${newDocTypeName.trim() ? "ph-pencil-simple animate-bounce text-amber-600" : "ph-plus text-gray-400"}`}
                          ></i>
                        </div>
                      </td>
                      <td className="p-3 px-6">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Quick add document type name..."
                            value={newDocTypeName}
                            onChange={(e) => setNewDocTypeName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                addDocType(null, newDocTypeName)
                              }
                            }}
                            className={`h-9 flex-1 rounded-brand border-gray-300 bg-white text-sm transition-all focus-visible:ring-pup-maroon ${newDocTypeName.trim() ? "border-amber-400 ring-2 ring-amber-100" : "focus-visible:border-pup-maroon"}`}
                          />
                          <Button
                            size="sm"
                            disabled={
                              !newDocTypeName.trim() || isQuickAddLoading
                            }
                            onClick={() => addDocType(null, newDocTypeName)}
                            className={`h-9 rounded-brand px-4 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 ${newDocTypeName.trim() ? "bg-amber-600 hover:bg-amber-700" : "bg-pup-maroon hover:bg-red-900"}`}
                          >
                            {isQuickAddLoading ? (
                              <i className="ph-bold ph-spinner animate-spin"></i>
                            ) : (
                              <>
                                <i
                                  className={`ph-bold mr-2 ${newDocTypeName.trim() ? "ph-check" : "ph-plus"}`}
                                ></i>
                                {newDocTypeName.trim() ? "SAVE" : "ADD"}
                              </>
                            )}
                          </Button>{" "}
                        </div>
                      </td>
                      <td className="p-3 px-6">
                        {newDocTypeName.trim() ? (
                          <Badge
                            variant="outline"
                            className="animate-pulse border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black tracking-wider text-amber-700 uppercase"
                          >
                            UNSAVED DRAFT
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-gray-200 bg-gray-100 px-2 py-0.5 text-[9px] font-bold tracking-wider text-gray-400 uppercase"
                          >
                            NEW RECORD
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 px-6 text-right"></td>
                    </tr>
                  )}
                  {filteredDocTypes.map((dt) => (
                    <tr
                      key={dt.id}
                      className={`group transition-colors hover:bg-gray-50 ${dt.status === "Archived" ? "opacity-75" : ""} ${selectedDocTypes[dt.id] ? (showArchived ? "bg-emerald-50/20" : "bg-red-50/20") : ""}`}
                    >
                      <td className="p-3 px-6 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-pup-maroon accent-pup-maroon focus:ring-pup-maroon disabled:cursor-not-allowed disabled:opacity-20"
                          checked={!!selectedDocTypes[dt.id]}
                          onChange={() => toggleDocTypeSelected(dt.id)}
                          disabled={
                            showArchived
                              ? dt.status !== "Archived"
                              : dt.status === "Archived"
                          }
                        />
                      </td>
                      <td className="p-3 px-6 font-bold text-gray-900">
                        {dt.name}
                      </td>
                      <td className="p-3 px-6">
                        {dt.status === "Archived" ? (
                          <Badge
                            variant="outline"
                            className="border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-bold tracking-wider text-red-700 uppercase"
                          >
                            ARCHIVED
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-green-200 bg-green-50 px-2 py-0.5 text-[9px] font-bold tracking-wider text-green-700 uppercase"
                          >
                            ACTIVE
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 px-6 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {!showArchived && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={dt.status === "Archived"}
                              onClick={() => {
                                setEditDocType({ id: dt.id, name: dt.name })
                                setIsEditDocTypeOpen(true)
                              }}
                              className="flex h-8 items-center gap-1.5 rounded-brand border-gray-300 bg-white px-3 text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-30"
                            >
                              <i className="ph-bold ph-pencil-simple text-xs"></i>
                              EDIT
                            </Button>
                          )}

                          {dt.status === "Archived" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setConfirmPayload({
                                  title: "Restore Document Type",
                                  message:
                                    "Restore this document type? It will be visible for new records again.",
                                  confirmLabel: "Restore",
                                  variant: "success",
                                  buttonIcon:
                                    "ph-bold ph-arrow-counter-clockwise",
                                  icon: "ph-duotone ph-arrow-counter-clockwise",
                                  selectedItems: [dt.name],
                                  onConfirm: () => resDocType(dt.id, dt.name),
                                })
                                setConfirmOpen(true)
                              }}
                              className="flex h-8 items-center gap-1.5 rounded-brand border-gray-300 bg-white px-3 text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95"
                            >
                              <i className="ph-bold ph-arrow-counter-clockwise text-xs"></i>
                              RESTORE
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setConfirmPayload({
                                  title: "Archive Document Type",
                                  message:
                                    "Archive this document type? This will hide it from new registrations but preserve history.",
                                  confirmLabel: "Archive",
                                  variant: "danger",
                                  buttonIcon: "ph-bold ph-archive",
                                  icon: "ph-duotone ph-archive",
                                  selectedItems: [dt.name],
                                  onConfirm: () => delDocType(dt.id, dt.name),
                                })
                                setConfirmOpen(true)
                              }}
                              className="flex h-8 items-center gap-1.5 rounded-brand border-gray-300 bg-white px-3 text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:scale-95"
                            >
                              <i className="ph-bold ph-archive text-xs"></i>
                              ARCHIVE
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredDocTypes.length === 0 && (
                    <tr className="border-0 hover:bg-transparent">
                      <td colSpan={4} className="border-0 p-0">
                        <Empty className="flex h-[400px] flex-col items-center justify-center border-0 text-center text-gray-500">
                          <EmptyHeader className="flex flex-col items-center gap-0">
                            <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                              <i className="ph-duotone ph-files text-3xl text-pup-maroon"></i>
                            </EmptyMedia>
                            <EmptyTitle className="text-lg font-bold text-gray-900">
                              No document types found
                            </EmptyTitle>
                            <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                              {docSearch
                                ? `No results matching "${docSearch}" in the current view.`
                                : showArchived
                                  ? "There are no archived document types yet."
                                  : "Add Document Type to structure the digital repository."}
                            </EmptyDescription>
                            {docSearch ||
                            docTypes.some((dt) =>
                              showArchived
                                ? dt.status === "Archived"
                                : dt.status !== "Archived"
                            ) ? (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setDocSearch("")
                                  setLocalSearch("")
                                }}
                                className="mt-4 flex h-9 items-center gap-2 rounded-brand border border-gray-300 bg-white px-4 text-xs font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95"
                              >
                                <i className="ph-bold ph-arrow-counter-clockwise"></i>
                                CLEAR SEARCH
                              </Button>
                            ) : (
                              !showArchived && (
                                <Button
                                  onClick={() => setIsAddDocTypeOpen(true)}
                                  className="mt-4 flex h-10 items-center gap-2 rounded-brand bg-pup-maroon px-8 font-black tracking-widest text-white shadow-lg shadow-red-900/20 transition-all hover:bg-red-900 active:scale-95"
                                >
                                  <i className="ph-bold ph-plus text-lg"></i>
                                  ADD DOCUMENT TYPE
                                </Button>
                              )
                            )}{" "}
                          </EmptyHeader>
                        </Empty>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 p-4 px-6">
          <div className="flex items-center gap-6">
            {filteredDocTypesFull.length > 0 && (
              <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                <span>
                  {(pageDoc - 1) * itemsPerPage + 1}-
                  {Math.min(
                    pageDoc * itemsPerPage,
                    filteredDocTypesFull.length
                  )}{" "}
                  of{" "}
                  <strong className="text-gray-900">
                    {filteredDocTypesFull.length.toLocaleString()}
                  </strong>{" "}
                  entries
                </span>

                <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    Rows:
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <select
                          className="h-7 w-16 cursor-pointer rounded-brand border border-gray-300 bg-white px-1 text-[10px] font-bold text-gray-700 focus:ring-1 focus:ring-pup-maroon focus:outline-none"
                          value={itemsPerPage}
                          onChange={handleItemsPerPageChange}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={200}>200</option>
                        </select>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="rounded-brand">
                        Items per page
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
          </div>

          {filteredDocTypesFull.length > 0 && (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pageDoc <= 1}
                onClick={() => setPageDoc((p) => p - 1)}
                className="h-8 rounded-brand border border-gray-300 bg-white px-3 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-30"
              >
                <i className="ph-bold ph-caret-left mr-1"></i> PREV
              </Button>
              <div className="flex h-8 min-w-[32px] items-center justify-center rounded-md border border-gray-200 bg-white px-2 text-[11px] font-bold text-gray-700 shadow-xs focus-within:border-pup-maroon focus-within:ring-1 focus-within:ring-pup-maroon">
                <input
                  type="text"
                  className="w-6 bg-transparent text-center focus:outline-none"
                  value={jumpPage}
                  onChange={(e) => setJumpPage(e.target.value)}
                  onKeyDown={handleJumpPage}
                  onBlur={handleJumpPage}
                />
                <span className="mx-0.5 text-gray-400">/</span>
                <span>
                  {Math.max(
                    1,
                    Math.ceil(filteredDocTypesFull.length / itemsPerPage)
                  )}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  pageDoc >=
                  Math.ceil(filteredDocTypesFull.length / itemsPerPage)
                }
                onClick={() => setPageDoc((p) => p + 1)}
                className="h-8 rounded-brand border border-gray-300 bg-white px-3 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-30"
              >
                NEXT <i className="ph-bold ph-caret-right ml-1"></i>
              </Button>
            </div>
          )}
        </div>
      </Card>

      <FloatingActionBar
        selectedCount={selectedCount}
        onCancel={() => toggleAllDocTypes(false)}
        onAction={handleBulkAction}
        actionLabel={showArchived ? "RESTORE SELECTED" : "ARCHIVE SELECTED"}
        actionIcon={showArchived ? "ph-arrow-counter-clockwise" : "ph-archive"}
        actionVariant={showArchived ? "success" : "danger"}
      />

      <Dialog
        open={isAddDocTypeOpen}
        onOpenChange={(open) => {
          setIsAddDocTypeOpen(open)
          if (!open) setNewDocTypeName("")
        }}
      >
        <DialogContent className="overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md">
          <DialogHeader className="border-b border-gray-100 bg-gray-50/50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg leading-tight font-black tracking-tight text-gray-900">
                  New Document Configuration
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm leading-relaxed font-medium text-gray-600">
                  Deploy a new formal document type to the digitization
                  framework.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={addDocType}>
            <div className="p-6">
              <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-700 uppercase">
                Document Name <span className="text-pup-maroon">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Honorable Dismissal"
                className="h-11 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-pup-maroon focus-visible:ring-pup-maroon"
                value={newDocTypeName}
                onChange={(e) => setNewDocTypeName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDocTypeOpen(false)
                  setNewDocTypeName("")
                }}
                className="h-11 rounded-brand border-gray-300 px-6 text-sm font-bold text-gray-600 uppercase shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon"
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                className="flex h-11 items-center gap-2 rounded-brand bg-pup-maroon px-6 font-bold text-white shadow-sm hover:bg-red-900"
              >
                <i className="ph-bold ph-check text-lg"></i>
                CREATE TYPE
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditDocTypeOpen}
        onOpenChange={(open) => {
          setIsEditDocTypeOpen(open)
          if (!open) setEditDocType({ id: null, name: "" })
        }}
      >
        <DialogContent className="overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md">
          <DialogHeader className="border-b border-gray-100 bg-gray-50/50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg leading-tight font-black tracking-tight text-gray-900">
                  Edit Document Type
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm leading-relaxed font-medium text-gray-600">
                  Update the document category label.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={updDocType}>
            <div className="p-6">
              <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-700 uppercase">
                Document Type Name <span className="text-pup-maroon">*</span>
              </label>
              <Input
                type="text"
                className="h-11 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-pup-maroon focus-visible:ring-pup-maroon"
                value={editDocType.name}
                onChange={(e) =>
                  setEditDocType((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDocTypeOpen(false)
                  setEditDocType({ id: null, name: "" })
                }}
                className="h-11 rounded-brand border-gray-300 px-6 text-sm font-bold text-gray-600 uppercase shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon"
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                className="flex h-11 items-center gap-2 rounded-brand bg-pup-maroon px-6 font-bold text-white shadow-sm hover:bg-red-900"
              >
                <i className="ph-bold ph-check text-lg"></i>
                SAVE CHANGES
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
