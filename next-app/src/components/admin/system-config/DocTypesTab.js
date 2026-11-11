"use client"
import { Table } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";
import { SegmentedControl } from "@/components/ui/tabs";
import TaxonomyActionsMenu from "./TaxonomyActionsMenu";


import CreateAnotherToggle from "@/components/shared/CreateAnotherToggle";
import useCreateAnother from "@/hooks/useCreateAnother";
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
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import DashboardSearch from "@/components/shared/DashboardSearch"
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
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles"
import { Archive01Icon as EmptyArchive01Icon, Search01Icon as EmptySearch01Icon , Archive02Icon, ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, ClipboardIcon, CursorPointer01Icon, PencilEdit01Icon, Archive01Icon} from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
function SortIndicator({ sortState, column }) {
  if (sortState?.key !== column) {
    return <ArrowUpDownIcon size="1em" className="ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
  }
  return sortState.direction === "asc" ? (
    <ArrowUp01Icon size="1em" className="ml-1 text-[12px] text-gray-400" />
  ) : (
    <ArrowDown01Icon size="1em" className="ml-1 text-[12px] text-gray-400" />
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
  const { attachForm, ...repeat } = useCreateAnother(isAddDocTypeOpen)
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
    if (!repeat.beginSave()) return

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

      repeat.complete(() => {
        setNewDocTypeName("")
        setNewDocTypeIsRequestable(false)
        setNewDocTypeIsCompliance(true)
      }, () => setIsAddDocTypeOpen(false))

      showToast({ title: "Document Type Added", description: "The new document type has been successfully registered in the system." })
      Promise.resolve().then(() => loadAll?.()).catch(() => {
        showToast({ title: "Refresh Failed", description: "Document type created. Refresh the list to see the new entry." }, true)
      })
    } catch (err) {
      showToast(formatErrorMessage(err, "Registration Failed"), true)
    } finally {
      repeat.endSave()
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
      variant: showArchived ? "success" : "danger",
      buttonIcon: showArchived ? " Archive02Icon" : " Archive01Icon",
      icon: showArchived ? " Archive02Icon" : " Archive01Icon",
      selectedItems: selectedNames,
      onConfirm: () => executeBulkTaxonomyAction("DocumentType", showArchived ? "restore" : "delete"),
    })
    setConfirmOpen(true)
  }

  return (
    <TooltipProvider delay={200}>
      <div className="font-jakarta flex flex-[1_0_auto] w-full flex-col animate-fade-up">
        <PageHeader
          icon="Files01Icon"
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
              className="h-9 shrink-0 px-4"
            >
              Add Document Type
            </Button>
          }
        />

        {/* Connected Segmented Tabs Row: Active vs Archived */}
        <div
          role="group"
          aria-label="Document types status filters"
          className="flex items-center justify-between px-6 py-2.5 border-t border-border dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none"
        >
          <SegmentedControl
            value={showArchived ? "archived" : "active"}
            onValueChange={(val) => {
              setShowArchived(val === "archived")
              setPageDoc(1)
            }}
            variant="capsule"
            className="inline-grid grid-flow-col auto-cols-fr shrink-0"
            items={[
              {
                value: "active",
                label: "Active",
                badge: docTypes.filter((dt) => dt.status !== "Archived").length,
              },
              {
                value: "archived",
                label: "Archived",
                badge: docTypes.filter((dt) => dt.status === "Archived").length,
              },
            ]}
          />
        </div>

        {/* Navigation Toolbar */}
        <DataViewToolbar label="Document type search and filters" className="border-t border-border dark:border-border p-5 gap-4 bg-white dark:bg-card">
          {/* Search Input, Matches Count, Export, Add */}
          <div className="flex flex-1 items-center justify-end gap-3 min-w-[300px] select-none">
            <DashboardSearch
              value={localSearch}
              onChange={setLocalSearch}
              onClear={() => {
                setLocalSearch("")
                setDocSearch("")
                setPageDoc(1)
              }}
              count={filteredDocTypesFull.length}
              placeholder="Filter document name..."
              label="Search document types"
            />

            <TableScrollControls scrollContainerRef={tableContainerRef}
              onScrollLeft={scrollLeft}
              onScrollRight={scrollRight}
              onResetScroll={resetScroll}
              isScrolled={isScrolledX}
            />
          </div>
        </DataViewToolbar>

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
              <TaxonomyTableSkeleton rowCount={6} embedded={true} showSubtext={false} showPagination={false} columns={["selection", "text", "text", "status", "actions"]} />
            </div>
          ) : filteredDocTypes.length === 0 ? (
            <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>{showArchived && totalInView === 0 ? <EmptyArchive01Icon size="1em" /> : <EmptySearch01Icon size="1em" />}</EmptyMedia>
                  <EmptyTitle>
                    {totalInView > 0 ? "No matches found" : (showArchived ? "No Archived Document Types Found" : "No Document Types Found")}
                  </EmptyTitle>
                  <EmptyDescription>
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
                      size="sm"
                      onClick={() => {
                        setDocSearch("")
                        setLocalSearch("")
                      }}
                      title="Reset Filters"
                      className="flex h-9 items-center justify-center gap-2 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                    >
                      Reset Filters
                    </Button>
                  ) : (
                    !showArchived && (
                      <Button
                        size="sm"
                        onClick={() => setIsAddDocTypeOpen(true)}
                        className="flex h-9 px-4 cursor-pointer"
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
              <Table columns={["selection", { kind: "text", minWidth: 280, maxWidth: 1000, growthWeight: 4 }, { kind: "text", minWidth: 180, maxWidth: 260, growthWeight: 1 }, { kind: "status", minWidth: 130, maxWidth: 180, growthWeight: 1 }, "actions"]} className="min-w-[950px]">
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
                        "w-[52%] p-4 sticky left-12 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs transition-shadow duration-200",
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
                              <AppIcon className=" ArrowLeft01Icon text-xs" />
                            </button>
                          )}
                        </div>
                      </th>
                      <th className="w-[22%] p-4 px-6 text-xs font-semibold text-gray-500 dark:text-zinc-400">Purpose / Scope</th>
                      <th className="w-[14%] p-4 px-6 text-xs font-semibold text-gray-500 dark:text-zinc-400">Status</th>
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
                          selected={isSelected}
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
                          <td className="p-4 px-6 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              {dt.is_requestable && (
                                <span className={cn(BADGE_PALETTES.blue, "gap-1", BADGE_BASE)}>
                                  <CursorPointer01Icon size="1em" className="text-[10px]" />
                                  Requestable
                                </span>
                              )}
                              {dt.is_compliance && (
                                <span className={cn(BADGE_PALETTES.purple, "gap-1", BADGE_BASE)}>
                                  <ClipboardIcon size="1em" className="text-[10px]" />
                                  Compliance
                                </span>
                              )}
                              {!dt.is_requestable && !dt.is_compliance && (
                                <span className={cn(BADGE_PALETTES.gray, "gap-1 font-medium", BADGE_BASE)}>
                                  General
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 px-6 align-middle text-left whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            {dt.status === "Archived" ? (
                              <div className={cn("inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400", BADGE_BASE)}>
                                Archived
                              </div>
                            ) : (
                              <div className={cn("inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] bg-green-100 text-green-800 dark:bg-emerald-950/40 dark:text-emerald-400", BADGE_BASE)}>
                                Active
                              </div>
                            )}
                          </td>
                          <td className="p-4 pr-6 text-right align-middle whitespace-nowrap">
                            <div 
                              className="inline-flex items-center justify-end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <TaxonomyActionsMenu
                                item={dt}
                                name={dt.name}
                                entityName="Document Type"
                                isArchived={dt.status === "Archived"}
                                onEdit={(item) => {
                                  setEditDocType({
                                    id: item.id,
                                    name: item.name,
                                    isRequestable: Boolean(item.is_requestable),
                                    isCompliance: Boolean(item.is_compliance),
                                  })
                                  setIsEditDocTypeOpen(true)
                                }}
                                onArchive={(item) => {
                                  setConfirmPayload({
                                    title: "Archive Document Type",
                                    message:
                                      "This document type will be hidden from new registrations but its history will be preserved.",
                                    confirmLabel: "Archive Document Type",
                                    variant: "danger",
                                    buttonIcon: " Archive01Icon",
                                    icon: " Archive01Icon",
                                    selectedItems: [item.name],
                                    onConfirm: () => delDocType(item.id, item.name),
                                  })
                                  setConfirmOpen(true)
                                }}
                                onRestore={(item) => {
                                  setConfirmPayload({
                                    title: "Restore Document Type",
                                    message:
                                      "This document type will be visible for new records again.",
                                    confirmLabel: "Restore Document Type",
                                    variant: "success",
                                    buttonIcon: " Archive02Icon",
                                    icon: " Archive02Icon",
                                    selectedItems: [item.name],
                                    onConfirm: () => resDocType(item.id, item.name),
                                  })
                                  setConfirmOpen(true)
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      )})}
                  </tbody>
              </Table>
              </div>
            )}
        {filteredDocTypesFull.length > 0 && (
          <TablePagination label="DocTypes pages" page={pageDoc} pageSize={itemsPerPage} totalCount={filteredDocTypesFull.length} displayedCount={filteredDocTypes.length} onPageChange={setPageDoc} onPageSizeChange={(size) => handleItemsPerPageChange({ target: { value: size } })} />
        )}
      </div>

      <FloatingActionBar
        selectedCount={selectedCount}
        selectionStatus="Selected Document Types"
        onCancel={() => toggleAllDocTypes(false)}
        onAction={handleBulkAction}
        actionLabel={showArchived ? "Restore Types" : "Archive Types"}
        actionIcon={showArchived ? "Archive02Icon" : "Archive01Icon"}
        actionVariant={showArchived ? "success" : "danger"}
      />

      <Dialog
        open={isAddDocTypeOpen}
        onOpenChange={(open) => {
          if (repeat.saving) return
          setIsAddDocTypeOpen(open)
          if (!open) setNewDocTypeName("")
        }}
      >
        <DialogContent className="overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-xl dark:border-border dark:bg-card">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle>
                  New Document Type
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Deploy a new formal document type to the digitization framework.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form ref={attachForm} onSubmit={addDocType}>
            <div className="p-6 pb-4 flex flex-col gap-[16px]">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-900 dark:text-zinc-300">
                  Document Name
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
                    className="h-4 w-4 shrink-0 cursor-pointer text-pup-maroon dark:text-primary transition-all"
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
                      className="h-4 w-4 shrink-0 cursor-pointer text-pup-maroon dark:text-primary transition-all"
                    />
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter className="mx-0 mb-0 p-6 pt-0 flex flex-wrap flex-row items-center justify-end gap-2.5">
              <CreateAnotherToggle checked={repeat.createAnother} onCheckedChange={repeat.setCreateAnother} disabled={repeat.saving} savedCount={repeat.savedCount} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={repeat.saving}
                onClick={() => {
                  setIsAddDocTypeOpen(false)
                  setNewDocTypeName("")
                  setNewDocTypeIsRequestable(false)
                  setNewDocTypeIsCompliance(true)
                }}
                className="flex h-9 items-center justify-center rounded-xl! border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={repeat.saving}
                className="h-9 px-4 disabled:opacity-50 cursor-pointer border-0"
              >
                {repeat.saving ? "Adding Document Type…" : "Add Document Type"}
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
        <DialogContent className="overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-xl dark:border-border dark:bg-card">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle>
                  Edit Document Type
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Update the document purpose settings.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={updDocType}>
            <div className="p-6 pb-4 flex flex-col gap-[16px]">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-900 dark:text-zinc-300">
                  Document Type Name
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
                    className="h-4 w-4 shrink-0 cursor-pointer text-pup-maroon dark:text-primary transition-all"
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
                      className="h-4 w-4 shrink-0 cursor-pointer text-pup-maroon dark:text-primary transition-all"
                    />
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-0 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddDocTypeOpen(false)
                  setIsEditDocTypeOpen(false)
                  setNewDocTypeName("")
                  setEditDocType({ id: null, name: "", isRequestable: false, isCompliance: false })
                }}
                className="flex h-9 items-center justify-center rounded-xl! border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 px-4 disabled:opacity-50 cursor-pointer border-0"
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
