"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import TaxonomyTableSkeleton from "@/components/admin/skeletons/TaxonomyTableSkeleton"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
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
import TableScrollControls from "@/components/shared/TableScrollControls"
import useTableScroll from "@/hooks/useTableScroll"
import { formatErrorMessage } from "@/lib/errorUtils"
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
}) {
  const [localSearch, setLocalSearch] = useState(docSearch)

  const {
    containerRef: tableContainerRef,
    isScrolledX,
    scrollLeft,
    scrollRight,
    resetScroll,
  } = useTableScroll([filteredDocTypes?.length]);

  useEffect(() => {
    resetScroll();
  }, [pageDoc, localSearch, showArchived, docPurposeFilter, sortDoc, resetScroll]);

  const [isAddDocTypeOpen, setIsAddDocTypeOpen] = useState(false)
  const [newDocTypeName, setNewDocTypeName] = useState("")
  const [newDocTypeIsRequestable, setNewDocTypeIsRequestable] = useState(false)
  const [newDocTypeIsCompliance, setNewDocTypeIsCompliance] = useState(true)

  const [isEditDocTypeOpen, setIsEditDocTypeOpen] = useState(false)
  const [editDocType, setEditDocType] = useState({
    id: null,
    name: "",
    isRequestable: false,
    isCompliance: false,
  })

  async function addDocType(e) {
    if (e) e.preventDefault()
    const name = newDocTypeName.trim()
    if (!name) return

    try {
      const res = await fetch("/api/doc-types?admin=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          isRequestable: newDocTypeIsRequestable,
          isCompliance: newDocTypeIsCompliance,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Add failed")

      setNewDocTypeName("")
      setNewDocTypeIsRequestable(false)
      setNewDocTypeIsCompliance(true)
      setIsAddDocTypeOpen(false)

      showToast({ title: "Document Type Added", description: "The new document type has been successfully registered in the system." })
      if (loadAll) loadAll()
    } catch (err) {
      showToast(formatErrorMessage(err, "Registration Failed"), true)
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
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed")
      setIsEditDocTypeOpen(false)
      showToast({ title: "Document Type Updated", description: "The changes to the document type have been successfully saved." })
      if (loadAll) loadAll()
    } catch (err) {
      showToast(formatErrorMessage(err, "Update Failed"), true)
    }
  }

  async function delDocType(id) {
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
      showToast(formatErrorMessage(err, "Archival Failed"), true)
    }
  }

  async function resDocType(id) {
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
      showToast(formatErrorMessage(err, "Restoration Failed"), true)
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      setDocSearch(localSearch)
    }, 300)
    return () => clearTimeout(handler)
  }, [localSearch, setDocSearch])

  useEffect(() => {
    if (docSearch !== "") return
    const handler = setTimeout(() => setLocalSearch(""), 0)
    return () => clearTimeout(handler)
  }, [docSearch])

  const handleItemsPerPageChange = (e) => {
    const value = Number(e.target.value)
    setItemsPerPage(value)
    setPageDoc(1)
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
      confirmLabel: showArchived ? "Restore Types" : "Archive Types",
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
      <div className="font-jakarta flex flex-[1_0_auto] w-full flex-col animate-fade-up">
        <PageHeader
          icon="ph-files"
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          title={
            <div className="flex items-center gap-[6px]">
              Document Types
              
            </div>
          }
          description="Manage formal document categories and digitization requirements."
          className="p-6"
          actions={
            <Button
              onClick={() => setIsAddDocTypeOpen(true)}
              disabled={showArchived}
              className="flex h-10 items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold text-xs px-5 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs border-0"
            >
              Add Document Type
            </Button>
          }
        />

        {/* Navigation Toolbar */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* Active / Archived Tabs & Purpose Segmented Filter */}
          <div className="flex flex-wrap items-center gap-4 shrink-0 select-none">
            <div className="flex items-center gap-1 p-1 bg-gray-100/80 dark:bg-zinc-800/60 rounded-xl border border-border/60 shrink-0 select-none">
              <button
                type="button"
                onClick={() => {
                  setShowArchived(false)
                  setPageDoc(1)
                }}
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border-0",
                  !showArchived
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white bg-transparent"
                )}
              >
                <span>Active</span>
                <span
                  className={cn(
                    "font-mono text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                    !showArchived
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40"
                      : "bg-gray-200/70 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"
                  )}
                >
                  {docTypes.filter((dt) => dt.status !== "Archived").length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowArchived(true)
                  setPageDoc(1)
                }}
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border-0",
                  showArchived
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white bg-transparent"
                )}
              >
                <span>Archived</span>
                <span
                  className={cn(
                    "font-mono text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                    showArchived
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40"
                      : "bg-gray-200/70 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"
                  )}
                >
                  {docTypes.filter((dt) => dt.status === "Archived").length}
                </span>
              </button>
            </div>

            {/* Segmented Control for Purpose */}
            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-border/60 dark:border-border">
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
                Requestable ({docTypes.filter((dt) => dt.is_requestable && !dt.is_compliance && (showArchived ? dt.status === "Archived" : dt.status !== "Archived")).length})
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
                className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-9 pr-24 text-xs font-normal placeholder:text-gray-400 dark:placeholder:text-zinc-500 text-gray-900 dark:text-zinc-100 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                {filteredDocTypesFull.length}
              </div>
            </div>

            <TableScrollControls
              onScrollLeft={scrollLeft}
              onScrollRight={scrollRight}
              onResetScroll={resetScroll}
              isScrolled={isScrolledX}
            />
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
          className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
        />

        {/* Main Table Container (Seamless inside single card) */}
        <div className={cn("w-full flex flex-[1_0_auto] flex-col border-t border-border dark:border-border bg-white dark:bg-card", filteredDocTypes.length === 0 && "rounded-b-2xl overflow-hidden")}>
          {loading && docTypes.length === 0 ? (
            <div className="w-full flex-[1_0_auto] overflow-x-auto select-none">
              <TaxonomyTableSkeleton rowCount={6} embedded={true} showSubtext={false} showPagination={false} />
            </div>
          ) : filteredDocTypes.length === 0 ? (
            <div className="py-16 rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
              <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                    <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                      <HugeIcon className={cn("text-3xl text-gray-400 dark:text-zinc-500", showArchived && totalInView === 0 ? "ph-archive" : "ph-magnifying-glass")} />
                    </EmptyMedia>
                  </div>
                  <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                    {totalInView > 0 ? "No matches found" : (showArchived ? "No Archived Document Types Found" : "No Document Types Found")}
                  </EmptyTitle>
                  <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300 mt-1">
                    {totalInView > 0
                      ? "Try adjusting your search filters to find what you're looking for."
                      : showArchived
                        ? "There are currently no archived document types in the system."
                        : "Add Document Type to structure the digital repository."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  {totalInView > 0 ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDocSearch("")
                        setLocalSearch("")
                      }}
                      title="Reset Filters"
                      className="mt-6 flex h-10 items-center justify-center gap-2 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                    >
                      Reset Filters
                    </Button>
                  ) : (
                    !showArchived && (
                      <Button
                        onClick={() => setIsAddDocTypeOpen(true)}
                        className="mt-6 flex h-10 px-5 text-xs font-semibold rounded-xl bg-pup-maroon hover:bg-pup-darkMaroon text-white dark:bg-red-600 dark:hover:bg-red-500 dark:text-white shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        Add Document Type
                      </Button>
                    )
                  )}
                </EmptyContent>
              </Empty>
            </div>
          ) : (
            <div
              ref={tableContainerRef}
              className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 select-none"
            >
              <table className="w-full text-sm border-separate border-spacing-0 min-w-[950px]">
                <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      <th className="w-12 p-4 text-center sticky left-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs">
                        <input
                          type="checkbox"
                          className="h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon disabled:cursor-not-allowed disabled:opacity-20 dark:text-primary dark:border-border"
                          checked={
                            filteredDocTypes.length > 0 &&
                            filteredDocTypes.every((dt) => selectedDocTypes[dt.id])
                          }
                          onChange={(e) => toggleAllDocTypes(e.target.checked)}
                          disabled={filteredDocTypes.length === 0}
                        />
                      </th>
                      <th className={cn(
                        "w-[44%] p-4 sticky left-12 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs transition-shadow duration-200",
                        isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                      )}>
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => onSort("name")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                              sortDoc.key === "name" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            Document Type <SortIndicator sortState={sortDoc} column="name" />
                          </button>
                          {isScrolledX && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                resetScroll();
                              }}
                              title="Reset scroll to start"
                              aria-label="Reset scroll to start"
                              className="p-1 rounded-md hover:bg-gray-200/60 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors cursor-pointer ml-auto mr-1"
                            >
                              <HugeIcon className="ph-bold ph-arrow-line-left text-xs" />
                            </button>
                          )}
                        </div>
                      </th>
                      <th className="w-[28%] p-4 text-xs font-semibold text-gray-500 dark:text-zinc-400">Purpose / Scope</th>
                      <th className="w-[14%] p-4 text-xs font-semibold text-gray-500 dark:text-zinc-400">Status</th>
                      <th className="w-28 p-4 pr-6 text-right text-xs font-semibold text-gray-500 dark:text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
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
                            "group hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors select-none cursor-pointer",
                            dt.status === "Archived" && "opacity-75",
                            isSelected && "bg-blue-50/60 dark:bg-blue-950/20",
                            isDisabled && "cursor-not-allowed"
                          )}
                        >
                          <td className={cn(
                            "w-12 p-4 align-middle text-center border-r border-border/70 dark:border-border/70 sticky left-0 z-10 transition-colors",
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950"
                              : "bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/40"
                          )}>
                            <input
                              type="checkbox"
                              className={cn(
                                "h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:text-primary dark:border-border transition-opacity",
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
                          <td className={cn(
                            "p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70 sticky left-12 z-10 transition-all duration-200",
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950"
                              : "bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/40",
                            isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)] border-r border-border/70"
                          )}>
                            <span className="truncate block text-xs font-semibold text-gray-900 dark:text-zinc-100" title={dt.name}>
                              {dt.name}
                            </span>
                          </td>
                          <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
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
                          <td className="p-4 align-middle text-left whitespace-nowrap border-r border-border/70 dark:border-border/70">
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
                          <td className="p-4 pr-6 text-right align-middle whitespace-nowrap">
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
                                        confirmLabel: "Restore Document Type",
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
                      )})}
                  </tbody>
                </table>
              </div>
            )}
        {filteredDocTypesFull.length > 0 && (
          <div className="flex items-center justify-between border-t border-border dark:border-border bg-white dark:bg-card p-4 px-6 rounded-b-2xl mt-auto select-none">
            <div className="flex items-center gap-6 text-xs text-gray-900 dark:text-zinc-300 select-none">
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
                className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
              >
                Prev
              </Button>

              <div className="h-8 w-8 rounded-xl border border-border dark:border-border flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                {pageDoc}
              </div>

              <Button
                variant="ghost"
                size="sm"
                disabled={pageDoc >= Math.ceil(filteredDocTypesFull.length / itemsPerPage)}
                onClick={() => setPageDoc((p) => p + 1)}
                className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
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
        actionLabel={showArchived ? "Restore Types" : "Archive Types"}
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
        <DialogContent className="overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-md dark:border-border dark:bg-card">
          <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                  New Document Type
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] font-normal text-gray-900 dark:text-zinc-300">
                  Deploy a new formal document type to the digitization framework.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={addDocType}>
            <div className="p-6 pb-4 flex flex-col gap-[16px]">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-900 dark:text-zinc-300">
                  Document Name <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Health Information Sheet"
                  className="h-10 rounded-xl border border-border bg-white text-[13px] font-normal tracking-[-0.01em] text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:bg-card dark:border-border dark:text-zinc-50"
                  value={newDocTypeName}
                  onChange={(e) => setNewDocTypeName(e.target.value)}
                  required
                />
              </div>

              <div className="rounded-xl border border-border/80 dark:border-border p-3.5 space-y-3 bg-gray-50/50 dark:bg-zinc-800/30">
                <label className="flex items-center justify-between cursor-pointer gap-2 select-none">
                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Enrollment Compliance Requirement</p>
                    <p className="text-[11px] text-gray-900 dark:text-zinc-300">Expected submission in student 201 folder & compliance metrics</p>
                  </div>
                  <input
                    type="radio"
                    name="newDocTypePurpose"
                    checked={newDocTypeIsCompliance}
                    onChange={() => {
                      setNewDocTypeIsCompliance(true);
                      setNewDocTypeIsRequestable(false);
                    }}
                    className="h-4 w-4 text-pup-maroon accent-pup-maroon cursor-pointer"
                  />
                </label>

                <div className="border-t border-border dark:border-border pt-2.5">
                  <label className="flex items-center justify-between cursor-pointer gap-2 select-none">
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Available for Online Request (ODRS)</p>
                      <p className="text-[11px] text-gray-900 dark:text-zinc-300">Allow students & alumni to request official copies</p>
                    </div>
                    <input
                      type="radio"
                      name="newDocTypePurpose"
                      checked={newDocTypeIsRequestable}
                      onChange={() => {
                        setNewDocTypeIsCompliance(false);
                        setNewDocTypeIsRequestable(true);
                      }}
                      className="h-4 w-4 text-pup-maroon accent-pup-maroon cursor-pointer"
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
                }}
                className="flex h-10 items-center justify-center rounded-xl! border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs border-0"
              >
                Create Document Type
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditDocTypeOpen}
        onOpenChange={(open) => {
          setIsEditDocTypeOpen(open)
          if (!open) setEditDocType({ id: null, name: "", isRequestable: false, isCompliance: false })
        }}
      >
        <DialogContent className="overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-md dark:border-border dark:bg-card">
          <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                  Edit Document Type
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] font-normal text-gray-900 dark:text-zinc-300">
                  Update the document purpose settings.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={updDocType}>
            <div className="p-6 pb-4 flex flex-col gap-[16px]">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-900 dark:text-zinc-300">
                  Document Type Name <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                </label>
                <Input
                  type="text"
                  className="h-10 rounded-xl border border-border bg-white text-[13px] font-normal tracking-[-0.01em] text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:bg-card dark:border-border dark:text-zinc-50"
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

              <div className="rounded-xl border border-border/80 dark:border-border p-3.5 space-y-3 bg-gray-50/50 dark:bg-zinc-800/30">
                <label className="flex items-center justify-between cursor-pointer gap-2 select-none">
                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Enrollment Compliance Requirement</p>
                    <p className="text-[11px] text-gray-900 dark:text-zinc-300">Expected submission in student 201 folder & compliance metrics</p>
                  </div>
                  <input
                    type="radio"
                    name="editDocTypePurpose"
                    checked={editDocType.isCompliance && !editDocType.isRequestable}
                    onChange={() =>
                      setEditDocType((prev) => ({
                        ...prev,
                        isCompliance: true,
                        isRequestable: false,
                      }))
                    }
                    className="h-4 w-4 text-pup-maroon accent-pup-maroon cursor-pointer"
                  />
                </label>

                <div className="border-t border-border dark:border-border pt-2.5">
                  <label className="flex items-center justify-between cursor-pointer gap-2 select-none">
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Available for Online Request (ODRS)</p>
                      <p className="text-[11px] text-gray-900 dark:text-zinc-300">Allow students & alumni to request official copies</p>
                    </div>
                    <input
                      type="radio"
                      name="editDocTypePurpose"
                      checked={editDocType.isRequestable && !editDocType.isCompliance}
                      onChange={() =>
                        setEditDocType((prev) => ({
                          ...prev,
                          isCompliance: false,
                          isRequestable: true,
                        }))
                      }
                      className="h-4 w-4 text-pup-maroon accent-pup-maroon cursor-pointer"
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
                  setEditDocType({ id: null, name: "", isRequestable: false, isCompliance: false })
                }}
                className="flex h-10 items-center justify-center rounded-xl! border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs border-0"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  )
}
