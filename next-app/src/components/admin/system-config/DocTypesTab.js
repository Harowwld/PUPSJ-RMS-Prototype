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
  TooltipProvider,
} from "@/components/ui/tooltip"
import PageHeader from "@/components/shared/PageHeader"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import { Card, CardContent } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"


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
  const [isExporting, setIsExporting] = useState(false)

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
    if (sortDoc.key !== column) {
      return <i className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
    }
    return sortDoc.direction === "asc" ? (
      <i className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></i>
    ) : (
      <i className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></i>
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

  const onExportClick = async () => {
    setIsExporting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 600))
      await handleExportDocTypes()
    } finally {
      setIsExporting(false)
    }
  }

  const totalInView = docTypes.filter((dt) => 
    showArchived ? dt.status === "Archived" : dt.status !== "Archived"
  ).length

  const selectedCount = Object.values(selectedDocTypes || {}).filter(Boolean).length
  const selectedNames = filteredDocTypes
    .filter((dt) => selectedDocTypes[dt.id])
    .map((dt) => dt.name)

  const handleBulkAction = () => {
    setConfirmPayload({
      title: showArchived ? "Restore Selected Types" : "Archive Selected Types",
      message: showArchived 
        ? "These document types will be visible for new records again."
        : "These document types will be hidden from new registrations but their history will be preserved.",
      confirmLabel: showArchived ? "Restore Selected" : "Archive Selected",
      variant: showArchived ? "success" : "danger",
      buttonIcon: showArchived ? "ph-bold ph-archive-restore" : "ph-bold ph-archive",
      icon: showArchived ? "ph-duotone ph-archive-restore" : "ph-duotone ph-archive",
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
            <Skeleton className="h-10 w-64 rounded-brand dark:bg-muted" />
            <Skeleton className="h-10 w-48 rounded-brand dark:bg-muted" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-brand dark:bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider delay={200}>
      <div className="font-inter flex w-full flex-col gap-6 animate-fade-up px-[28px] pb-[28px]">
        <div className="mt-[20px]">
          <PageHeader
            icon="ph-files"
            showBorder={false}
            titleClassName="text-[15px]"
            title={
              <div className="flex items-center gap-[6px]">
                Document Types
                {showArchived && (
                  <span className="text-[12px] font-normal text-emerald-600 dark:text-emerald-400">
                    · Restore Mode
                  </span>
                )}
              </div>
            }
            description="Manage formal document categories and digitization requirements."
            className="p-0"
          />
        </div>

        <div className="font-inter">
          <div className="flex select-none items-center justify-between gap-3 border-b-[0.5px] border-black/10 dark:border-white/10 pb-4">
            {/* Active / Archived Tabs */}
            <div className="flex items-center gap-[24px]">
              <button
                type="button"
                onClick={() => setShowArchived(false)}
                className={`flex items-center justify-center text-[13px] pb-[10px] -mb-[17px] border-b-2 border-t-0 border-x-0 rounded-none cursor-pointer bg-transparent focus:outline-none transition-colors ${
                  !showArchived
                    ? "border-black text-black dark:border-zinc-50 dark:text-zinc-50 font-semibold"
                    : "border-transparent text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 font-normal"
                }`}
              >
                <span className="whitespace-nowrap tracking-wide">
                  Active ({docTypes.filter((dt) => dt.status !== "Archived").length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowArchived(true)}
                className={`flex items-center justify-center text-[13px] pb-[10px] -mb-[17px] border-b-2 border-t-0 border-x-0 rounded-none cursor-pointer bg-transparent focus:outline-none transition-colors ${
                  showArchived
                    ? "border-black text-black dark:border-zinc-50 dark:text-zinc-50 font-semibold"
                    : "border-transparent text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 font-normal"
                }`}
              >
                <span className="whitespace-nowrap tracking-wide">
                  Archived ({docTypes.filter((dt) => dt.status === "Archived").length})
                </span>
              </button>
            </div>

            {/* Search Input, Matches Count, Export, Add */}
            <div className="flex flex-1 items-center justify-end gap-3 min-w-[300px] select-none">
              <div className="flex-1 max-w-md relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 text-sm"></i>
                </div>
                <Input
                  type="text"
                  placeholder="Filter document name..."
                  className="h-[36px] w-full rounded-[8px] border-[0.5px] border-black/15 bg-white pl-9 pr-20 text-[13px] font-normal placeholder:text-[#8E8E93] dark:border-white/15 dark:bg-card focus-visible:ring-0 focus-visible:border-black/30"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                  {filteredDocTypesFull.length > 0 ? `${filteredDocTypesFull.length} results` : "0 results"}
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onExportClick}
                disabled={isExporting}
                className="h-10 w-[68px] justify-center font-semibold text-sm text-gray-600 hover:text-[#111] hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center rounded-brand shadow-none border-0"
              >
                {isExporting ? (
                  <i className="ph-bold ph-spinner animate-spin text-[16px]"></i>
                ) : (
                  "Export"
                )}
              </Button>

              <Button
                onClick={() => setIsAddDocTypeOpen(true)}
                disabled={showArchived}
                className="flex h-[36px] items-center justify-center rounded-[8px] btn-brand-red text-white text-[13px] font-medium px-6 active:scale-95 disabled:opacity-50 transition-all dark:shadow-none"
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Main Table Container (No outer card background/shadow) */}
        <div key={showArchived} className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card w-full animate-fade-up">
          {/* Active Filter Chips Row */}
          {(localSearch !== "") && (
            <div className="flex-none border-b border-gray-100 bg-white px-6 py-3 animate-in fade-in slide-in-from-top-1 duration-normal dark:border-white/10 dark:bg-card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">Active filters:</span>
                {localSearch && (
                  <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                    Search: {localSearch}
                    <button
                      onClick={() => { setLocalSearch(""); setDocSearch(""); setPageDoc(1); }}
                      className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLocalSearch("")
                    setDocSearch("")
                    setPageDoc(1)
                  }}
                  className="h-auto text-[12px] font-medium text-gray-400 dark:text-zinc-500 border-0 bg-transparent hover:bg-transparent shadow-none p-0 hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          <div className="relative z-10 flex-1 overflow-x-auto overflow-y-auto select-none">
              {loading ? (
                <div className="space-y-4 p-8">
                  <Skeleton className="h-10 w-full rounded-lg dark:bg-muted" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg dark:bg-muted/50" />
                  ))}
                </div>
              ) : (
                 <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:bg-card dark:border-white/10">
                    <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                      <th className="w-12 p-4 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon disabled:cursor-not-allowed disabled:opacity-20 dark:text-primary dark:border-white/10"
                          checked={
                            filteredDocTypes.length > 0 &&
                            filteredDocTypes.every((dt) => selectedDocTypes[dt.id])
                          }
                          onChange={(e) => toggleAllDocTypes(e.target.checked)}
                          disabled={filteredDocTypes.length === 0}
                        />
                      </th>
                      <th className="p-4 px-6">
                        <button
                          onClick={() => onSort("name")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortDoc.key === "name" ? "text-pup-maroon dark:text-red-500" : "text-gray-400 dark:text-zinc-500 hover:text-pup-maroon dark:hover:text-red-500"
                          )}
                        >
                          Document Type <SortIndicator column="name" />
                        </button>
                      </th>
                      <th className="w-48 p-4 px-6 text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">Status</th>
                      <th className="w-32 p-4 px-6 text-right text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                    {!showArchived && (
                      <tr
                        className={cn(
                          "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                          newDocTypeName.trim() && "bg-amber-50/50 dark:bg-amber-950/10"
                        )}
                      >
                        <td className="py-0 px-4 align-middle text-center">
                          <div
                            className={cn(
                              "flex h-5 w-5 mx-auto items-center justify-center rounded-full border-2 border-dashed transition-colors",
                              newDocTypeName.trim() ? "border-orange-400 dark:border-orange-500/50" : "border-gray-300 dark:border-white/10"
                            )}
                          >
                            <i
                              className={cn(
                                "ph-bold text-[10px]",
                                newDocTypeName.trim() ? "ph-pencil-simple animate-bounce text-orange-600 dark:text-orange-400" : "ph-plus text-gray-400 dark:text-amber-400"
                              )}
                            ></i>
                          </div>
                        </td>
                        <td className="py-0 px-6 align-middle">
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
                              className={cn(
                                "h-9 flex-1 rounded-[8px] border-[0.5px] border-black/15 bg-white text-xs font-semibold focus-visible:ring-0 focus-visible:border-black/30",
                                newDocTypeName.trim() ? "ring-1 ring-amber-100" : "focus-visible:border-gray-300 dark:border-white/10 dark:bg-card"
                              )}
                            />
                            <Button
                              size="sm"
                              disabled={
                                !newDocTypeName.trim() || isQuickAddLoading
                              }
                              onClick={() => addDocType(null, newDocTypeName)}
                              title="Add Document Type"
                              className="h-9 w-9 p-0 flex items-center justify-center rounded-[8px] text-[14px] font-semibold text-white shadow-sm active:scale-95 disabled:opacity-50 transition-all dark:shadow-none btn-brand-orange shrink-0"
                            >
                              {isQuickAddLoading ? (
                                <i className="ph-bold ph-spinner animate-spin"></i>
                              ) : (
                                <i className="ph-bold ph-plus"></i>
                              )}
                            </Button>
                          </div>
                        </td>
                        <td className="py-0 px-6 align-middle">
                          {newDocTypeName.trim() ? (
                            <div className="inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400">
                              Draft
                            </div>
                          ) : (
                            <div className="inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] bg-gray-100 text-[#8E8E93] dark:bg-zinc-800 dark:text-zinc-500">
                              New
                            </div>
                          )}
                        </td>
                        <td className="py-0 px-6 text-right align-middle"></td>
                      </tr>
                    )}
                    {filteredDocTypes.map((dt) => {
                      const isDisabled = showArchived
                        ? dt.status !== "Archived"
                        : dt.status === "Archived";
                      const isSelected = !!selectedDocTypes[dt.id];
                      
                      return (
                        <tr
                          key={dt.id}
                          onClick={(e) => {
                            if (!isDisabled) toggleDocTypeSelected(dt.id, e);
                          }}
                          className={cn(
                            "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                            dt.status === "Archived" && "opacity-75",
                            isSelected && "bg-blue-50/60 dark:bg-blue-950/20",
                            isDisabled && "cursor-not-allowed"
                          )}
                        >
                          <td className="py-0 px-4 align-middle text-center">
                            <input
                              type="checkbox"
                              className={cn(
                                "h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:text-primary dark:border-white/10 transition-opacity",
                                isSelected ? "opacity-100" : "opacity-50 group-hover:opacity-80"
                              )}
                              checked={isSelected}
                              onClick={(e) => {
                                // Prevent click bubbling to tr
                                e.stopPropagation();
                              }}
                              onChange={(e) => {
                                // tr onClick handles it
                                e.stopPropagation();
                                toggleDocTypeSelected(dt.id);
                              }}
                              disabled={isDisabled}
                            />
                          </td>
                          <td className="py-0 px-6 align-middle">
                            <span className="text-[13px] font-medium tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                              {dt.name}
                            </span>
                          </td>
                          <td className="py-0 px-6 align-middle">
                            {dt.status === "Archived" ? (
                              <div className="inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400">
                                Archived
                              </div>
                            ) : (
                              <div className="inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] bg-green-100 text-green-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                                Active
                              </div>
                            )}
                          </td>
                          <td className="py-0 px-6 text-right align-middle">
                            <div 
                              className="inline-flex items-center justify-end gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {!showArchived && (
                                <button
                                  disabled={dt.status === "Archived"}
                                  onClick={() => {
                                    setEditDocType({ id: dt.id, name: dt.name })
                                    setIsEditDocTypeOpen(true)
                                  }}
                                  title="Edit Document Type"
                                  className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 border-0 bg-transparent text-[#C7C7CC] dark:text-zinc-600 transition-colors hover:text-amber-500 dark:hover:text-amber-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                                >
                                  <i className="ph-bold ph-pencil-simple text-[16px]"></i>
                                </button>
                              )}

                            {dt.status === "Archived" ? (
                              <button
                                onClick={() => {
                                  setConfirmPayload({
                                    title: "Restore Document Type",
                                    message:
                                      "This document type will be visible for new records again.",
                                    confirmLabel: "Restore",
                                    variant: "success",
                                    buttonIcon:
                                      "ph-bold ph-archive-restore",
                                    icon: "ph-duotone ph-archive-restore",
                                    selectedItems: [dt.name],
                                    onConfirm: () => resDocType(dt.id, dt.name),
                                  })
                                  setConfirmOpen(true)
                                }}
                                title="Restore Document Type"
                                className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 border-0 bg-transparent text-[#C7C7CC] dark:text-zinc-600 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                              >
                                <i className="ph-bold ph-archive-restore text-[16px]"></i>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setConfirmPayload({
                                    title: "Archive Document Type",
                                    message:
                                      "This document type will be hidden from new registrations but its history will be preserved.",
                                    confirmLabel: "Archive",
                                    variant: "danger",
                                    buttonIcon: "ph-bold ph-archive",
                                    icon: "ph-duotone ph-archive",
                                    selectedItems: [dt.name],
                                    onConfirm: () => delDocType(dt.id, dt.name),
                                  })
                                  setConfirmOpen(true)
                                }}
                                title="Archive Document Type"
                                className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 border-0 bg-transparent text-[#C7C7CC] dark:text-zinc-600 transition-colors hover:text-red-600 dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                              >
                                <i className="ph-bold ph-archive text-[16px]"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                    {filteredDocTypes.length === 0 && (
                      <tr className="border-0 hover:bg-transparent">
                        <td colSpan={4} className="border-0 p-0">
                          <Empty className="flex h-[450px] flex-col items-center justify-center border-0 bg-transparent text-center">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <div className="relative mb-6">
                                <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                                <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                                  <i className={showArchived && totalInView === 0 ? "ph-archive" : "ph-magnifying-glass"}></i>
                                </EmptyMedia>
                              </div>
                              <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                                {totalInView > 0 ? "No matches found" : (showArchived ? "No Archived Document Types Found" : "No Document Types Found")}
                              </EmptyTitle>
                              <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                                {totalInView > 0
                                  ? "Try adjusting your search filters to find what you're looking for."
                                  : showArchived
                                    ? "There are currently no archived document types in the system."
                                    : "Add Document Type to structure the digital repository."}
                              </EmptyDescription>
                              {totalInView > 0 ? (
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setDocSearch("")
                                    setLocalSearch("")
                                  }}
                                  className="mt-4 flex h-9 items-center gap-2 rounded-brand border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                                >
                                  <i className="ph-bold ph-archive-restore"></i>
                                  CLEAR SEARCH
                                </Button>
                              ) : (
                                !showArchived && (
                                  <Button
                                    onClick={() => setIsAddDocTypeOpen(true)}
                                    className="mt-4 flex h-10 items-center gap-2 rounded-brand btn-brand-red hover:from-red-700 hover:to-red-900 hover:shadow-md px-8 font-semibold tracking-widest text-white shadow-lg shadow-red-900/20 active:scale-95 transition-all dark:shadow-none"
                                  >
                                    <i className="ph-bold ph-plus text-lg"></i>
                                    ADD
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

        {filteredDocTypesFull.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 dark:border-white/10 dark:bg-card">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-6 text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                <span>
                  Showing {filteredDocTypes.length} of {filteredDocTypesFull.length}
                </span>
                <div className="flex items-center gap-1.5 border-l border-gray-200 pl-6 dark:border-white/10">
                  <span className="text-[12px] text-gray-400 dark:text-zinc-500">Rows:</span>
                  <div className="flex items-center gap-1">
                    {[10, 20, 50, 100].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleItemsPerPageChange({ target: { value: size } })}
                        className={`px-2 py-0.5 rounded-[4px] text-[12px] font-normal cursor-pointer transition-colors border-0 ${
                          itemsPerPage === size
                            ? "bg-gray-100 text-[#111111] font-medium dark:bg-white/10 dark:text-zinc-50"
                            : "bg-transparent text-gray-450 dark:text-zinc-550 hover:text-gray-700 dark:hover:text-zinc-300"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <button
                disabled={pageDoc <= 1}
                onClick={() => setPageDoc((p) => Math.max(1, p - 1))}
                className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
              >
                Prev
              </button>

              <div className="flex h-8 min-w-[32px] items-center justify-center rounded-[6px] border border-gray-200/80 bg-white px-2.5 text-[12px] font-medium text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-100">
                {pageDoc}
              </div>

              <button
                disabled={pageDoc >= Math.ceil(filteredDocTypesFull.length / itemsPerPage)}
                onClick={() => setPageDoc((p) => p + 1)}
                className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <FloatingActionBar
        selectedCount={selectedCount}
        selectionStatus="Selected Document Types"
        onCancel={() => toggleAllDocTypes(false)}
        onAction={handleBulkAction}
        actionLabel={showArchived ? "Restore" : "Archive"}
        actionIcon={showArchived ? "ph-archive-restore" : "ph-archive"}
        actionVariant={showArchived ? "success" : "danger"}
      />

      <Dialog
        open={isAddDocTypeOpen}
        onOpenChange={(open) => {
          setIsAddDocTypeOpen(open)
          if (!open) setNewDocTypeName("")
        }}
      >
        <DialogContent className="overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-card">
          <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                  New Document Type
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                  Deploy a new formal document type to the digitization framework.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={addDocType}>
            <div className="p-6 pb-4 flex flex-col gap-[16px]">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                  Document Name <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Honorable Dismissal"
                  className="h-[40px] rounded-[8px] border-[0.5px] border-gray-300 bg-white text-[13px] font-normal tracking-[-0.01em] text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:bg-card dark:border-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus-visible:border-zinc-600"
                  style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
                  value={newDocTypeName}
                  onChange={(e) => setNewDocTypeName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-card">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsAddDocTypeOpen(false)
                  setNewDocTypeName("")
                }}
                className="h-[36px] bg-transparent text-[13px] font-medium text-gray-500 hover:bg-transparent hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors border-0 shadow-none px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex h-[36px] items-center justify-center rounded-[8px] bg-[#007AFF] hover:bg-[#0066cc] text-[13px] font-medium text-white active:scale-95 disabled:opacity-50 transition-all px-4 dark:shadow-none border-0"
              >
                Create
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
        <DialogContent className="overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-card">
          <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                  Edit Document Type
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                  Update the document category label.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={updDocType}>
            <div className="p-6 pb-4">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                Document Type Name <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
              </label>
              <Input
                type="text"
                className="h-[36px] rounded-[8px] border-[0.5px] border-gray-300 bg-white text-[13px] font-normal tracking-[-0.01em] text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:bg-card dark:border-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus-visible:border-zinc-600"
                style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
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
            <div className="flex flex-row justify-end gap-2 bg-white p-6 dark:bg-card border-none">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsAddDocTypeOpen(false)
                  setIsEditDocTypeOpen(false)
                  setNewDocTypeName("")
                  setEditDocType({ id: null, name: "" })
                }}
                className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 bg-transparent hover:bg-transparent border-none shadow-none p-0 h-auto cursor-pointer focus:outline-none"
              >Cancel</Button>
              <Button
                type="submit"
                className="flex h-[36px] items-center justify-center rounded-[8px] btn-brand-red text-[13px] font-medium text-white shadow-none border-none py-0 px-4 cursor-pointer"
              >
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  )
}
