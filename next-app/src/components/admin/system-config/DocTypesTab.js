"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import TaxonomyTableSkeleton from "@/components/admin/skeletons/TaxonomyTableSkeleton"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import PageHeader from "@/components/shared/PageHeader"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import ActiveFilterChips from "@/components/shared/ActiveFilterChips"
import { Card, CardContent } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

function SortIndicator({ sortState, column }) {
  if (sortState?.key !== column) {
    return <HugeIcon className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
  }
  return sortState.direction === "asc" ? (
    <HugeIcon className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400" />
  ) : (
    <HugeIcon className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400" />
  )
}

export default function DocTypesTab({
  loading = false,
  docTypes,
  docSearch,
  setDocSearch,
  docPurposeFilter = "all",
  setDocPurposeFilter,
  showArchived,
  setShowArchived,
  pageDoc,
  setPageDoc,
  itemsPerPage,
  setItemsPerPage,
  filteredDocTypes,
  filteredDocTypesFull,
  selectedDocTypes,
  setSelectedDocTypes,
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
  const [newDocTypeIsRequestable, setNewDocTypeIsRequestable] = useState(false)
  const [newDocTypeIsCompliance, setNewDocTypeIsCompliance] = useState(true)
  const [newDocTypeCategory, setNewDocTypeCategory] = useState("General Requirements")

  const [isEditDocTypeOpen, setIsEditDocTypeOpen] = useState(false)
  const [editDocType, setEditDocType] = useState({
    id: null,
    name: "",
    isRequestable: false,
    isCompliance: false,
    complianceCategory: "General Requirements",
  })
  const [isExporting, setIsExporting] = useState(false)

  const [isQuickAddLoading, setIsQuickAddLoading] = useState(false)

  async function addDocType(e, nameOverride = null) {
    if (e) e.preventDefault()
    const name = nameOverride || newDocTypeName.trim()
    if (!name) return

    if (nameOverride) setIsQuickAddLoading(true)

    try {
      const isReq = nameOverride ? (docPurposeFilter === "requestable") : newDocTypeIsRequestable
      const isComp = nameOverride ? (docPurposeFilter !== "requestable") : newDocTypeIsCompliance
      const cat = nameOverride ? "General Requirements" : newDocTypeCategory

      const res = await fetch("/api/doc-types?admin=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          isRequestable: isReq,
          isCompliance: isComp,
          complianceCategory: cat,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Add failed")

      if (!nameOverride) {
        setNewDocTypeName("")
        setNewDocTypeIsRequestable(false)
        setNewDocTypeIsCompliance(true)
        setNewDocTypeCategory("General Requirements")
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
        body: JSON.stringify({
          name: editDocType.name.trim(),
          isRequestable: editDocType.isRequestable,
          isCompliance: editDocType.isCompliance,
          complianceCategory: editDocType.complianceCategory,
        }),
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
      if (setSelectedDocTypes) {
        setSelectedDocTypes((prev) => {
          if (!prev || !prev[id]) return prev
          const next = { ...prev }
          delete next[id]
          return next
        })
      }
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
      if (setSelectedDocTypes) {
        setSelectedDocTypes((prev) => {
          if (!prev || !prev[id]) return prev
          const next = { ...prev }
          delete next[id]
          return next
        })
      }
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


  const handleExportDocTypes = handleExportProp || (() => {
    const q = (cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`
    const csvContent = [
      ["ID", "Name", "Status"],
      ...docTypes.map((dt) => [dt?.id ?? "", dt?.name || "", dt?.status || "Active"]),
    ]
      .map((row) => row.map(q).join(","))
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
      confirmLabel: showArchived ? "Restore" : "Archive",
      variant: showArchived ? "success" : "warning",
      buttonIcon: showArchived ? "ph-bold ph-archive-restore" : "ph-bold ph-archive",
      icon: showArchived ? "ph-duotone ph-archive-restore" : "ph-duotone ph-archive",
      selectedItems: selectedNames,
      onConfirm: () => executeBulkTaxonomyAction("DocumentType", showArchived ? "restore" : "delete"),
    })
    setConfirmOpen(true)
  }

  return (
    <TooltipProvider delay={200}>
      <div className="font-jakarta flex w-full flex-1 flex-col animate-fade-up min-h-0">
        <PageHeader
          icon="ph-files"
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          title={
            <div className="flex items-center gap-[6px]">
              Document Types
              
            </div>
          }
          description="Manage formal document categories and digitization requirements."
          className="p-6"
        />

        {/* Navigation Toolbar */}
        <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* Active / Archived Tabs & Purpose Segmented Filter */}
          <div className="flex flex-wrap items-center gap-4 shrink-0 select-none">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowArchived(false)
                  setPageDoc(1)
                }}
                className={cn(
                  "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                  !showArchived
                    ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                    : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                )}
              >
                Active ({docTypes.filter((dt) => dt.status !== "Archived").length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowArchived(true)
                  setPageDoc(1)
                }}
                className={cn(
                  "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                  showArchived
                    ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                    : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                )}
              >
                Archived ({docTypes.filter((dt) => dt.status === "Archived").length})
              </button>
            </div>

            {/* Segmented Control for Purpose */}
            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5">
              <button
                type="button"
                onClick={() => {
                  setDocPurposeFilter?.("all")
                  setPageDoc(1)
                }}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  docPurposeFilter === "all"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  setDocPurposeFilter?.("requestable")
                  setPageDoc(1)
                }}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  docPurposeFilter === "requestable"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                Requestable ({docTypes.filter((dt) => dt.is_requestable && (showArchived ? dt.status === "Archived" : dt.status !== "Archived")).length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setDocPurposeFilter?.("compliance")
                  setPageDoc(1)
                }}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  docPurposeFilter === "compliance"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                Compliance ({docTypes.filter((dt) => dt.is_compliance && (showArchived ? dt.status === "Archived" : dt.status !== "Archived")).length})
              </button>
            </div>
          </div>

          {/* Search Input, Matches Count, Export, Add */}
          <div className="flex flex-1 items-center justify-end gap-3 min-w-[300px] select-none">
            <div className="flex-1 max-w-md relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <HugeIcon className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm" />
              </div>
              <Input
                type="text"
                placeholder="Filter document name..."
                className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 pl-9 pr-24 text-xs font-normal placeholder:text-gray-400 dark:placeholder:text-zinc-500 text-gray-900 dark:text-zinc-100 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              <div className="absolute inset-y-0 right-3 flex items-center gap-2">
                {localSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalSearch("")
                      setDocSearch("")
                      setPageDoc(1)
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none text-xs"
                    title="Clear search"
                  >
                    <HugeIcon className="ph-bold ph-x" />
                  </button>
                )}
                <span className="text-[12px] font-normal text-gray-400 dark:text-zinc-500 pointer-events-none">
                  {filteredDocTypesFull.length}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onExportClick}
              disabled={isExporting}
              className="flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
            >
              {isExporting ? (
                <HugeIcon className="ph-bold ph-spinner animate-spin text-[16px]" />
              ) : (
                "Export"
              )}
            </Button>

            <Button
              onClick={() => setIsAddDocTypeOpen(true)}
              disabled={showArchived}
              className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs px-5 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs border-0"
            >
              Add
            </Button>
          </div>
        </div>

        {/* Active Filter Chips */}
        <ActiveFilterChips
          searchQuery={localSearch}
          onClearSearch={() => {
            setLocalSearch("")
            setDocSearch("")
            setPageDoc(1)
          }}
          onClearAll={() => {
            setLocalSearch("")
            setDocSearch("")
            setPageDoc(1)
          }}
          className="border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card px-6 py-2.5"
        />

        {/* Main Table Container (Seamless inside single card) */}
        <div className={cn("w-full flex flex-col flex-1 min-h-0 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card", filteredDocTypes.length === 0 && "rounded-b-2xl overflow-hidden")}>
          <div className="w-full overflow-x-auto flex-1 select-none">
            {loading && docTypes.length === 0 ? (
              <TaxonomyTableSkeleton rowCount={6} embedded={true} showSubtext={false} showPagination={false} />
            ) : (
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card">
                    <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                      <th className="w-12 p-4 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon disabled:cursor-not-allowed disabled:opacity-20 dark:text-primary dark:border-white/10"
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
                          Document Type <SortIndicator sortState={sortDoc} column="name" />
                        </button>
                      </th>
                      <th className="w-52 p-4 px-6 text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">Purpose / Scope</th>
                      <th className="w-36 p-4 px-6 text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">Status</th>
                      <th className="w-32 p-4 px-6 text-right text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {!showArchived && (
                      <tr
                        className={cn(
                          "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                          newDocTypeName.trim() && "bg-amber-50/50 dark:bg-amber-950/10"
                        )}
                      >
                        <td className="py-0 px-4 align-middle text-center"></td>
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
                                "h-9 flex-1 rounded-xl border-[0.5px] border-black/15 bg-white text-xs font-semibold focus-visible:ring-0 focus-visible:border-black/30",
                                newDocTypeName.trim() ? "ring-1 ring-emerald-200 border-emerald-300 dark:ring-emerald-500/30 dark:border-emerald-500/50" : "focus-visible:border-gray-300 dark:border-white/10 dark:bg-card"
                              )}
                            />
                            <Button
                              size="sm"
                              disabled={
                                !newDocTypeName.trim() || isQuickAddLoading
                              }
                              onClick={() => addDocType(null, newDocTypeName)}
                              title="Add Document Type"
                              className="h-9 w-9 p-0 flex items-center justify-center rounded-xl text-[14px] font-semibold text-emerald-600 dark:text-emerald-400 shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 disabled:opacity-50 transition-all dark:shadow-none bg-white dark:bg-zinc-900 border-[1.5px] border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-500/40 dark:hover:border-emerald-400 dark:hover:bg-emerald-950/40 shrink-0"
                            >
                              {isQuickAddLoading ? (
                                <HugeIcon  className="ph-bold ph-spinner animate-spin"></HugeIcon>
                              ) : (
                                <HugeIcon  className="ph-bold ph-plus" strokeWidth={2.5}></HugeIcon>
                              )}
                            </Button>
                          </div>
                        </td>
                        <td className="py-0 px-6 align-middle">
                          <span className="text-xs text-gray-400 italic">Quick auto-classification</span>
                        </td>
                        <td className="py-0 px-6 align-middle">
                          {newDocTypeName.trim() ? (
                            <div className="inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                              Draft
                            </div>
                          ) : (
                            <div className="inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] bg-gray-100 text-[#8E8E93] dark:bg-zinc-800 dark:text-zinc-500">
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
                                "h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:text-primary dark:border-white/10 transition-opacity",
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
                            <div className="flex flex-col py-1">
                              <span className="text-[13px] font-medium tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                                {dt.name}
                              </span>
                              <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                                {dt.compliance_category || "General Requirements"}
                              </span>
                            </div>
                          </td>
                          <td className="py-0 px-6 align-middle">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {dt.is_requestable && (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40">
                                  <HugeIcon className="ph-bold ph-hand-pointing text-[10px]" />
                                  Requestable
                                </span>
                              )}
                              {dt.is_compliance && (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40">
                                  <HugeIcon className="ph-bold ph-clipboard-text text-[10px]" />
                                  Compliance
                                </span>
                              )}
                              {!dt.is_requestable && !dt.is_compliance && (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">
                                  General
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-0 px-6 align-middle">
                            {dt.status === "Archived" ? (
                              <div className="inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400">
                                Archived
                              </div>
                            ) : (
                              <div className="inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] bg-green-100 text-green-800 dark:bg-emerald-950/40 dark:text-emerald-400">
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
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      disabled={dt.status === "Archived"}
                                      onClick={() => {
                                        setEditDocType({
                                          id: dt.id,
                                          name: dt.name,
                                          isRequestable: Boolean(dt.is_requestable),
                                          isCompliance: Boolean(dt.is_compliance),
                                          complianceCategory: dt.compliance_category || "General Requirements",
                                        })
                                        setIsEditDocTypeOpen(true)
                                      }}
                                      aria-label="Edit Document Type"
                                      className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors flex items-center justify-center border-0 bg-transparent cursor-pointer active:scale-95"
                                    >
                                      <HugeIcon  className="ph-bold ph-pencil-simple text-[16px]"></HugeIcon>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Edit</TooltipContent>
                                </Tooltip>
                              )}

                            {dt.status === "Archived" ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
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
                                    aria-label="Restore Document Type"
                                    className="w-7 h-7 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 text-gray-500 hover:text-green-600 dark:text-zinc-400 dark:hover:text-green-400 transition-colors flex items-center justify-center border-0 bg-transparent cursor-pointer active:scale-95"
                                  >
                                    <HugeIcon  className="ph-bold ph-archive-restore text-[16px]"></HugeIcon>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Restore</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => {
                                      setConfirmPayload({
                                        title: "Archive Document Type",
                                        message:
                                          "This document type will be hidden from new registrations but its history will be preserved.",
                                        confirmLabel: "Archive",
                                        variant: "warning",
                                        buttonIcon: "ph-bold ph-archive",
                                        icon: "ph-duotone ph-archive",
                                        selectedItems: [dt.name],
                                        onConfirm: () => delDocType(dt.id, dt.name),
                                      })
                                      setConfirmOpen(true)
                                    }}
                                    aria-label="Archive Document Type"
                                    className="w-7 h-7 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 text-gray-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400 transition-colors flex items-center justify-center border-0 bg-transparent cursor-pointer active:scale-95"
                                  >
                                    <HugeIcon  className="ph-bold ph-archive text-[16px]"></HugeIcon>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Archive</TooltipContent>
                              </Tooltip>
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
                                  <HugeIcon  className={showArchived && totalInView === 0 ? "ph-archive" : "ph-magnifying-glass"}></HugeIcon>
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
                                  title="Reset Filters"
                                  className="mt-6 flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                                >
                                  Reset
                                </Button>
                              ) : (
                                !showArchived && (
                                  <Button
                                    onClick={() => setIsAddDocTypeOpen(true)}
                                    className="mt-4 h-10 rounded-xl btn-brand-red px-5 text-xs font-semibold text-white shadow-xs active:scale-95 transition-all cursor-pointer border-0"
                                  >
                                    Add
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
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card p-4 px-6 rounded-b-2xl mt-auto select-none">
            <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-zinc-400 select-none">
              <span>
                Showing {filteredDocTypes.length} of {filteredDocTypesFull.length.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <span>Rows:</span>
                {[10, 20, 50, 100].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleItemsPerPageChange({ target: { value: size } })}
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
                disabled={pageDoc <= 1}
                onClick={() => setPageDoc((p) => Math.max(1, p - 1))}
                className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
              >
                Prev
              </Button>

              <div className="h-8 w-8 rounded-xl border border-gray-200 dark:border-white/10 flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                {pageDoc}
              </div>

              <Button
                variant="ghost"
                size="sm"
                disabled={pageDoc >= Math.ceil(filteredDocTypesFull.length / itemsPerPage)}
                onClick={() => setPageDoc((p) => p + 1)}
                className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
              >
                Next
              </Button>
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
        <DialogContent className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-card">
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
                  placeholder="e.g. Health Information Sheet"
                  className="h-10 rounded-xl border border-gray-200 bg-white text-[13px] font-normal tracking-[-0.01em] text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:bg-card dark:border-white/10 dark:text-zinc-50"
                  value={newDocTypeName}
                  onChange={(e) => setNewDocTypeName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                  Compliance / Record Category
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Certificates & Clearances, Academic Records"
                  className="h-10 rounded-xl border border-gray-200 bg-white text-[13px] font-normal tracking-[-0.01em] text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:bg-card dark:border-white/10 dark:text-zinc-50"
                  value={newDocTypeCategory}
                  onChange={(e) => setNewDocTypeCategory(e.target.value)}
                />
              </div>

              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 p-3.5 space-y-3 bg-gray-50/50 dark:bg-zinc-800/30">
                <label className="flex items-center justify-between cursor-pointer gap-2 select-none">
                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Enrollment Compliance Requirement</p>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400">Expected submission in student 201 folder & compliance metrics</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newDocTypeIsCompliance}
                    onChange={(e) => setNewDocTypeIsCompliance(e.target.checked)}
                    className="h-4 w-4 rounded text-pup-maroon accent-pup-maroon cursor-pointer"
                  />
                </label>

                <div className="border-t border-gray-100 dark:border-white/5 pt-2.5">
                  <label className="flex items-center justify-between cursor-pointer gap-2 select-none">
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Available for Online Request (ODRS)</p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400">Allow students & alumni to request official copies</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={newDocTypeIsRequestable}
                      onChange={(e) => setNewDocTypeIsRequestable(e.target.checked)}
                      className="h-4 w-4 rounded text-pup-maroon accent-pup-maroon cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDocTypeOpen(false)
                  setNewDocTypeName("")
                  setNewDocTypeIsRequestable(false)
                  setNewDocTypeIsCompliance(true)
                  setNewDocTypeCategory("General Requirements")
                }}
                className="flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl! text-xs font-semibold text-white btn-brand-red active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
              >
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditDocTypeOpen}
        onOpenChange={(open) => {
          setIsEditDocTypeOpen(open)
          if (!open) setEditDocType({ id: null, name: "", isRequestable: false, isCompliance: false, complianceCategory: "General Requirements" })
        }}
      >
        <DialogContent className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-card">
          <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                  Edit Document Type
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                  Update the document category and purpose settings.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={updDocType}>
            <div className="p-6 pb-4 flex flex-col gap-[16px]">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                  Document Type Name <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                </label>
                <Input
                  type="text"
                  className="h-10 rounded-xl border border-gray-200 bg-white text-[13px] font-normal tracking-[-0.01em] text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:bg-card dark:border-white/10 dark:text-zinc-50"
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

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                  Compliance / Record Category
                </label>
                <Input
                  type="text"
                  className="h-10 rounded-xl border border-gray-200 bg-white text-[13px] font-normal tracking-[-0.01em] text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:bg-card dark:border-white/10 dark:text-zinc-50"
                  value={editDocType.complianceCategory || ""}
                  onChange={(e) =>
                    setEditDocType((prev) => ({
                      ...prev,
                      complianceCategory: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 p-3.5 space-y-3 bg-gray-50/50 dark:bg-zinc-800/30">
                <label className="flex items-center justify-between cursor-pointer gap-2 select-none">
                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Enrollment Compliance Requirement</p>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400">Expected submission in student 201 folder & compliance metrics</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={editDocType.isCompliance}
                    onChange={(e) =>
                      setEditDocType((prev) => ({
                        ...prev,
                        isCompliance: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded text-pup-maroon accent-pup-maroon cursor-pointer"
                  />
                </label>

                <div className="border-t border-gray-100 dark:border-white/5 pt-2.5">
                  <label className="flex items-center justify-between cursor-pointer gap-2 select-none">
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Available for Online Request (ODRS)</p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400">Allow students & alumni to request official copies</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={editDocType.isRequestable}
                      onChange={(e) =>
                        setEditDocType((prev) => ({
                          ...prev,
                          isRequestable: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded text-pup-maroon accent-pup-maroon cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDocTypeOpen(false)
                  setIsEditDocTypeOpen(false)
                  setNewDocTypeName("")
                  setEditDocType({ id: null, name: "", isRequestable: false, isCompliance: false, complianceCategory: "General Requirements" })
                }}
                className="flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl! text-xs font-semibold text-white btn-brand-red active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  )
}
