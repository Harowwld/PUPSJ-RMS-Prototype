"use client"
import { BADGE_BASE } from "@/lib/badgeStyles";
import { Table } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";


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
import { cn } from "@/lib/utils"
import { BADGE_PALETTES } from "@/lib/badgeStyles"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import PageHeader from "@/components/shared/PageHeader"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import ActiveFilterChips from "@/components/shared/ActiveFilterChips"
import { Select } from "@/components/ui/select"
import { formatErrorMessage } from "@/lib/errorUtils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import useTableScroll from "@/hooks/useTableScroll"
import TableScrollControls from "@/components/shared/TableScrollControls"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import { Archive01Icon as EmptyArchive01Icon, Search01Icon as EmptySearch01Icon , Archive02Icon, ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, PencilEdit01Icon, Search01Icon, Archive01Icon} from "hugeicons-react";
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

export default function SectionsTab({
  loading = false,
  courses,
  sections,
  sectionSearch,
  setSectionSearch,
  selectedCourseFilter,
  setSelectedCourseFilter,
  showArchived,
  setShowArchived,
  pageSection,
  setPageSection,
  itemsPerPage,
  setItemsPerPage,
  filteredSections,
  filteredSectionsFull,
  selectedSections,
  toggleSectionSelected,
  toggleAllSections,
  executeBulkTaxonomyAction,
  setSelectedSections,
  setConfirmPayload,
  setConfirmOpen,
  onSort,
  sortSection,
  showToast,
  loadAll,
}) {
  const [localSearch, setLocalSearch] = useState(sectionSearch)

  const {
    tableContainerRef,
    canScrollLeft,
    canScrollRight,
    isScrolled,
    isScrolledX,
    scrollLeft,
    scrollRight,
    resetScroll,
  } = useTableScroll([filteredSections?.length]);

  useEffect(() => {
    resetScroll();
  }, [pageSection, localSearch, showArchived, selectedCourseFilter, sortSection, resetScroll]);

  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false)
  const { attachForm, ...repeat } = useCreateAnother(isAddSectionOpen)
  const [newSectionName, setNewSectionName] = useState("")
  const [secCourseCode, setSecCourseCode] = useState("")
  const [isEditSectionOpen, setIsEditSectionOpen] = useState(false)
  const [editSection, setEditSection] = useState({ id: null, name: "", courseCode: "" })

  async function addSection(e) {
    if (e) e.preventDefault()
    const name = newSectionName.trim()
    const courseCode = secCourseCode.trim()
    if (!name || !courseCode) return
    if (!repeat.beginSave()) return

    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          courseCode: courseCode || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Add failed")
      
      repeat.complete(() => {
        setNewSectionName("")
        if (!repeat.createAnother) setSecCourseCode("")
      }, () => setIsAddSectionOpen(false))

      showToast({ title: "Course Block Created", description: "The new course block has been successfully registered in the system." })
      Promise.resolve().then(() => loadAll?.()).catch(() => {
        showToast({ title: "Refresh Failed", description: "Block created. Refresh the list to see the new entry." }, true)
      })
    } catch (err) {
      showToast(formatErrorMessage(err, "Registration Failed"), true)
    } finally {
      repeat.endSave()
    }
  }

  async function updSection(e) {
    e.preventDefault()
    if (!editSection.name.trim()) return
    try {
      const res = await fetch(`/api/sections?id=${editSection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editSection.name.trim(),
          courseCode: editSection.courseCode.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed")
      setIsEditSectionOpen(false)
      showToast({ title: "Course Block Updated", description: "The changes to the course block have been successfully saved." })
      if (loadAll) loadAll()
    } catch (err) {
      showToast(formatErrorMessage(err, "Update Failed"), true)
    }
  }

  async function delSection(id) {
    try {
      const res = await fetch(`/api/sections?id=${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Archive failed")
      setConfirmOpen(false)
      if (setSelectedSections) {
        setSelectedSections((prev) => {
          if (!prev || !prev[id]) return prev
          const next = { ...prev }
          delete next[id]
          return next
        })
      }
      showToast({ title: "Course Block Archived", description: "The selected course block has been successfully moved to the archive." })
      if (loadAll) loadAll()
    } catch (err) {
      showToast(formatErrorMessage(err, "Archival Failed"), true)
    }
  }

  async function resSection(id) {
    try {
      const res = await fetch(`/api/sections?id=${id}&restore=true`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Restore failed")
      setConfirmOpen(false)
      if (setSelectedSections) {
        setSelectedSections((prev) => {
          if (!prev || !prev[id]) return prev
          const next = { ...prev }
          delete next[id]
          return next
        })
      }
      showToast({ title: "Course Block Restored", description: "The course block has been successfully restored from the archive." })
      if (loadAll) loadAll()
    } catch (err) {
      showToast(formatErrorMessage(err, "Restoration Failed"), true)
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      setSectionSearch(localSearch)
    }, 300)
    return () => clearTimeout(handler)
  }, [localSearch, setSectionSearch])

  useEffect(() => {
    if (sectionSearch !== "") return
    const handler = setTimeout(() => setLocalSearch(""), 0)
    return () => clearTimeout(handler)
  }, [sectionSearch])

  const handleItemsPerPageChange = (e) => {
    const value = Number(e.target.value)
    setItemsPerPage(value)
    setPageSection(1)
  }





  const selectedCount = Object.values(selectedSections).filter(Boolean).length
  const selectedNames = filteredSections
    .filter((s) => selectedSections[s.id])
    .map((s) => `${s.course_code ? s.course_code + ' - ' : ''}${s.name}`)

  const totalInView = sections.filter((s) => 
    showArchived ? s.status === "Archived" : s.status !== "Archived"
  ).length

  const handleBulkAction = () => {
    setConfirmPayload({
      title: showArchived ? "Restore Selected Blocks" : "Archive Selected Blocks",
      message: showArchived 
        ? "These course blocks will be visible for new records again."
        : "These course blocks will be hidden from new registrations but their history will be preserved.",
      confirmLabel: showArchived ? "Restore Blocks" : "Archive Blocks",
      variant: showArchived ? "success" : "warning",
      buttonIcon: showArchived ? " Archive02Icon" : " Archive01Icon",
      icon: showArchived ? " Archive02Icon" : " Archive01Icon",
      selectedItems: selectedNames,
      onConfirm: () => executeBulkTaxonomyAction("Section", showArchived ? "restore" : "delete"),
    })
    setConfirmOpen(true)
  }



  return (
    <TooltipProvider delay={200}>
      <div className="font-jakarta flex flex-[1_0_auto] w-full flex-col animate-fade-up">
        <PageHeader
          icon="ListViewIcon"
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          title={
            <div className="flex items-center gap-[6px]">
              Course Blocks
              
            </div>
          }
          description="Manage academic cohorts, sections, and organizational blocks."
          actions={
            <Button
              onClick={() => setIsAddSectionOpen(true)}
              disabled={showArchived}
              className="h-9 shrink-0 px-4"
            >
              Add Block
            </Button>
          }
          className="p-6"
        />

        {/* Navigation Toolbar */}
        <DataViewToolbar label="Section search and filters" className="border-t border-border dark:border-border p-5 gap-4 bg-white dark:bg-card">
          {/* Active / Archived Segmented Tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100/80 dark:bg-zinc-800/60 rounded-xl border border-border/60 shrink-0 select-none">
            <button
              type="button"
              onClick={() => {
                setShowArchived(false)
                setPageSection(1)
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
                className={cn("font-sans tabular-nums text-[10px] px-1.5 py-0.5 rounded-full font-bold", !showArchived
                    ? BADGE_PALETTES.emerald
                    : "bg-gray-200/70 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400", BADGE_BASE)}
              >
                {sections.filter((s) => s.status !== "Archived").length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowArchived(true)
                setPageSection(1)
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
                className={cn("font-sans tabular-nums text-[10px] px-1.5 py-0.5 rounded-full font-bold", showArchived
                    ? BADGE_PALETTES.amber
                    : "bg-gray-200/70 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400", BADGE_BASE)}
              >
                {sections.filter((s) => s.status === "Archived").length}
              </span>
            </button>
          </div>

          {/* Search Input, Matches Count, Export, Add */}
          <div className="flex flex-1 items-center justify-end gap-3 min-w-[300px] select-none">
            {/* Program Filter Select dropdown */}
            <div className="w-[180px]">
              <Select
                className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs font-normal text-gray-700 dark:text-zinc-200 shadow-none px-3 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 cursor-pointer"
                value={selectedCourseFilter}
                onChange={(e) => {
                  setSelectedCourseFilter(e.target.value)
                  setPageSection(1)
                }}
              >
                <option value="">All Programs</option>
                {courses.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex-1 max-w-md relative group">
              <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
                <Search01Icon size="1em" className="text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm" />
              </div>
              <Input
                type="text"
                placeholder="Filter block name..."
                className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-9 pr-24 text-xs font-normal placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 text-gray-900 dark:text-zinc-100"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              <div className="pointer-events-none absolute inset-y-0 right-3 z-10 flex items-center text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                {filteredSectionsFull.length}
              </div>
            </div>

            <TableScrollControls scrollContainerRef={tableContainerRef}
              canScrollLeft={canScrollLeft}
              canScrollRight={canScrollRight}
              isScrolled={isScrolled}
              onScrollLeft={scrollLeft}
              onScrollRight={scrollRight}
              onResetScroll={resetScroll}
            />
          </div>
        </DataViewToolbar>

        {/* Active Filter Chips */}
        <ActiveFilterChips
          searchQuery={localSearch}
          onClearSearch={() => {
            setLocalSearch("")
            setSectionSearch("")
            setPageSection(1)
          }}
          extraChips={selectedCourseFilter ? [
            {
              label: `Program: ${selectedCourseFilter}`,
              onClear: () => {
                setSelectedCourseFilter("")
                setPageSection(1)
              }
            }
          ] : []}
          onClearAll={() => {
            setLocalSearch("")
            setSectionSearch("")
            setSelectedCourseFilter("")
            setPageSection(1)
          }}
          className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
        />

        {/* Main Table Container (Seamless inside single card) */}
        <div className={cn("w-full flex flex-[1_0_auto] flex-col border-t border-border dark:border-border bg-white dark:bg-card", filteredSections.length === 0 && "rounded-b-2xl overflow-hidden")}>
          {loading && sections.length === 0 ? (
            <div className="w-full flex-[1_0_auto] overflow-x-auto select-none">
              <TaxonomyTableSkeleton rowCount={6} embedded={true} showSubtext={true} showPagination={false} columns={["selection", "category", "identifier", "status", "actions"]} />
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>{showArchived && totalInView === 0 ? <EmptyArchive01Icon size="1em" /> : <EmptySearch01Icon size="1em" />}</EmptyMedia>
                  <EmptyTitle>
                    {totalInView > 0 ? "No matches found" : (showArchived ? "No Archived Course Blocks Found" : "No Course Blocks Found")}
                  </EmptyTitle>
                  <EmptyDescription>
                    {totalInView > 0
                      ? "Try adjusting your search filters or course selection to find what you're looking for."
                      : showArchived
                        ? "There are currently no archived course blocks in the system."
                        : "Add Course Block to organize students within degree programs."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  {totalInView > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSectionSearch("")
                        setLocalSearch("")
                        setSelectedCourseFilter("")
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
                        onClick={() => setIsAddSectionOpen(true)}
                        className="flex h-9 px-4 cursor-pointer"
                      >
                        Add Block
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
              <Table columns={["selection", "category", "identifier", "status", "actions"]} className="min-w-[950px]">
                <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      <th className="w-12 p-4 text-center sticky left-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs">
                        <input
                          type="checkbox"
                          className="h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon disabled:cursor-not-allowed disabled:opacity-20 dark:text-primary dark:border-border"
                          checked={
                            filteredSections.length > 0 &&
                            filteredSections.every((s) => selectedSections[s.id])
                          }
                          onChange={(e) => toggleAllSections(e.target.checked)}
                          disabled={filteredSections.length === 0}
                        />
                      </th>
                      <th className={cn(
                        "w-[24%] p-4 sticky left-12 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs transition-shadow duration-200",
                        isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                      )}>
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => onSort("course_code")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                              sortSection.key === "course_code" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            Degree Program <SortIndicator sortState={sortSection} column="course_code" />
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
                      <th className="w-[48%] p-4">
                        <button
                          onClick={() => onSort("name")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortSection.key === "name" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Block Name <SortIndicator sortState={sortSection} column="name" />
                        </button>
                      </th>
                      <th className="w-[14%] p-4 text-xs font-semibold text-gray-500 dark:text-zinc-400">Status</th>
                      <th className="w-28 p-4 pr-6 text-right text-xs font-semibold text-gray-500 dark:text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent divide-y divide-border dark:divide-border bg-white dark:bg-card">
                    {filteredSections.map((sec) => {
                      const isDisabled = showArchived
                        ? sec.status !== "Archived"
                        : sec.status === "Archived";
                      const isSelected = !!selectedSections[sec.id];
                      
                      return (
                        <tr
                          key={sec.id}
                          selected={isSelected}
                          onClick={(e) => {
                            if (!isDisabled) toggleSectionSelected(sec.id, e);
                          }}
                          className={cn(
                            "group border-b-[0.5px] border-border dark:border-border last:border-b-0 transition-all duration-fast hover:bg-gray-50/70 dark:bg-card dark:hover:bg-zinc-800/40 select-none cursor-pointer",
                            sec.status === "Archived" && "opacity-75",
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
                                toggleSectionSelected(sec.id);
                              }}
                              disabled={isDisabled}
                            />
                          </td>
                          <td className={cn(
                            "p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70 sticky left-12 z-10 transition-all duration-200",
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950"
                              : "bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/40",
                            isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)] border-r border-border/70"
                          )}>
                            <span className={cn("font-sans tabular-nums text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 whitespace-nowrap", BADGE_BASE)}>
                              {sec.course_code || "N/A"}
                            </span>
                          </td>
                          <td className="p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
                            <div className="truncate text-xs font-semibold text-gray-900 dark:text-zinc-100" title={sec.name}>
                              {sec.name}
                            </div>
                          </td>
                          <td className="p-4 align-middle text-left whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            {sec.status === "Archived" ? (
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
                              className="inline-flex items-center justify-end gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {!showArchived && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      disabled={sec.status === "Archived"}
                                      onClick={() => {
                                        setEditSection({
                                          id: sec.id,
                                          name: sec.name,
                                          courseCode: sec.course_code || "",
                                        })
                                        setIsEditSectionOpen(true)
                                      }}
                                      className="table-action-button rounded-lg active:scale-95 cursor-pointer"
                                    >
                                      <PencilEdit01Icon size="1em"  className="text-sm"></PencilEdit01Icon>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Edit Course Block</TooltipContent>
                                </Tooltip>
                              )}

                            {sec.status === "Archived" ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => {
                                      setConfirmPayload({
                                        title: "Restore Course Block",
                                        message:
                                          "This course block will be visible for new records again.",
                                        confirmLabel: "Restore Block",
                                        variant: "success",
                                        buttonIcon: " Archive02Icon",
                                        icon: " Archive02Icon",
                                        selectedItems: [sec.name],
                                        onConfirm: () =>
                                          resSection(
                                            sec.id,
                                            sec.name,
                                            sec.course_code
                                          ),
                                      })
                                      setConfirmOpen(true)
                                    }}
                                    className="table-action-button rounded-lg text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 active:scale-95 cursor-pointer"
                                  >
                                    <Archive02Icon size="1em"  className="text-sm"></Archive02Icon>
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
                                        title: "Archive Course Block",
                                        message:
                                          "This course block will be hidden from new registrations but its history will be preserved.",
                                        confirmLabel: "Archive Block",
                                        variant: "warning",
                                        buttonIcon: " Archive01Icon",
                                        icon: " Archive01Icon",
                                        selectedItems: [sec.name],
                                        onConfirm: () =>
                                          delSection(
                                            sec.id,
                                            sec.name,
                                            sec.course_code
                                          ),
                                      })
                                      setConfirmOpen(true)
                                    }}
                                    className="table-action-button rounded-lg text-amber-600 hover:text-amber-700 dark:text-amber-400 active:scale-95 cursor-pointer"
                                  >
                                    <Archive01Icon size="1em"  className="text-sm"></Archive01Icon>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Archive Course Block</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
              </Table>
              </div>
            )}

        {filteredSectionsFull.length > 0 && (
          <TablePagination label="Sections pages" page={pageSection} pageSize={itemsPerPage} totalCount={filteredSectionsFull.length} displayedCount={filteredSections.length} onPageChange={setPageSection} onPageSizeChange={(size) => handleItemsPerPageChange({ target: { value: size } })} />
        )}
      </div>

      <FloatingActionBar
        selectedCount={selectedCount}
        selectionStatus="Selected Sections"
        onCancel={() => toggleAllSections(false)}
        onAction={handleBulkAction}
        actionLabel={showArchived ? "Restore Blocks" : "Archive Blocks"}
        actionIcon={showArchived ? "Archive02Icon" : "Archive01Icon"}
        actionVariant={showArchived ? "success" : "danger"}
      />

      <Dialog
        open={isAddSectionOpen}
        onOpenChange={(open) => {
          if (repeat.saving) return
          setIsAddSectionOpen(open)
          if (!open) {
            setNewSectionName("")
            setSecCourseCode("")
          }
        }}
      >
        <DialogContent className="overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-xl dark:border-border dark:bg-card">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle>
                  New Course Block
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Create a new organizational section for degree program management.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form ref={attachForm} onSubmit={addSection} className="w-full min-w-0 overflow-hidden">
            <div className="p-6 pb-4 flex flex-col gap-4">
              <div className="w-full min-w-0">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                  Degree Program
                </label>
                <Select
                  className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 shadow-none min-w-0"
                  value={secCourseCode}
                  onChange={(e) => setSecCourseCode(e.target.value)}
                  required
                >
                  <option value="" className="text-gray-400">Select a program...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                  Block Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Section 1"
                  className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs min-w-0"
                  value={newSectionName}
                  data-create-another-focus
                  onChange={(e) => setNewSectionName(e.target.value)}
                  required
                />
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
                  setIsAddSectionOpen(false)
                  setNewSectionName("")
                  setSecCourseCode("")
                }}
                className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={repeat.saving}
                className="h-9 px-4 cursor-pointer border-0"
              >
                {repeat.saving ? "Adding Section…" : "Add Section"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditSectionOpen}
        onOpenChange={(open) => {
          setIsEditSectionOpen(open)
          if (!open) setEditSection({ id: null, name: "", courseCode: "" })
        }}
      >
        <DialogContent className="overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-xl dark:border-border dark:bg-card">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle>
                  Edit Course Block
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Update the block label or program association.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={updSection} className="w-full min-w-0 overflow-hidden">
            <div className="p-6 pb-4 space-y-4">
              <div className="w-full min-w-0">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                  Degree Program
                </label>
                <Select
                  className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 shadow-none min-w-0"
                  value={editSection.courseCode}
                  onChange={(e) =>
                    setEditSection((prev) => ({
                      ...prev,
                      courseCode: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select a program...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-0">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                  Block Name
                </label>
                <Input
                  type="text"
                  className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs min-w-0"
                  value={editSection.name}
                  onChange={(e) =>
                    setEditSection((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
            <DialogFooter className="p-6 pt-0 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditSectionOpen(false)
                  setEditSection({ id: null, name: "", courseCode: "" })
                }}
                className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 px-4 cursor-pointer border-0"
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
