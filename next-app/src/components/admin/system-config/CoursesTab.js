"use client"
import { BADGE_BASE } from "@/lib/badgeStyles";
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
import { BADGE_PALETTES } from "@/lib/badgeStyles"
import { Archive01Icon as EmptyArchive01Icon, Search01Icon as EmptySearch01Icon , Archive02Icon, ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, Delete01Icon, PencilEdit01Icon, Archive01Icon} from "hugeicons-react";
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

export default function CoursesTab({
  loading = false,
  courses,
  sections,
  courseSearch,
  setCourseSearch,
  showArchived,
  setShowArchived,
  pageCourse,
  setPageCourse,
  itemsPerPage,
  setItemsPerPage,
  filteredCourses,
  filteredCoursesFull,
  selectedCourses,
  setSelectedCourses,
  toggleCourseSelected,
  toggleAllCourses,
  executeBulkTaxonomyAction,
  setConfirmPayload,
  setConfirmOpen,
  onSort,
  sortCourse,
  showToast,
  loadAll,
}) {
  const [localSearch, setLocalSearch] = useState(courseSearch)

  const {
    containerRef: tableContainerRef,
    isScrolledX,
    scrollLeft,
    scrollRight,
    resetScroll,
  } = useTableScroll([filteredCourses?.length]);

  useEffect(() => {
    resetScroll();
  }, [pageCourse, localSearch, showArchived, sortCourse, resetScroll]);

  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false)
  const { attachForm, ...repeat } = useCreateAnother(isAddCourseOpen)
  const [newCourseCode, setNewCourseCode] = useState("")
  const [newCourseName, setNewCourseName] = useState("")
  const [newCourseBlocks, setNewCourseBlocks] = useState([""])
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false)
  const [editCourse, setEditCourse] = useState({ id: null, code: "", name: "" })
  const [editCourseBlocks, setEditCourseBlocks] = useState([""])

  async function addCourse(e) {
    if (e) e.preventDefault()
    const code = newCourseCode.trim()
    const name = newCourseName.trim()
    if (!code || !name) return
    if (!repeat.beginSave()) return

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          blocks: newCourseBlocks.filter((b) => b.trim()),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Add failed")

      repeat.complete(() => {
        setNewCourseCode("")
        setNewCourseName("")
        setNewCourseBlocks([""])
      }, () => setIsAddCourseOpen(false))

      showToast({
        title: "Degree Program Added",
        description:
          "The new degree program has been successfully registered in the system.",
      })
      Promise.resolve().then(() => loadAll?.()).catch(() => {
        showToast({ title: "Refresh Failed", description: "Program created. Refresh the list to see the new entry." }, true)
      })
    } catch (err) {
      showToast(formatErrorMessage(err, "Registration Failed"), true)
    } finally {
      repeat.endSave()
    }
  }

  async function updCourse(e) {
    e.preventDefault()
    if (!editCourse.code.trim() || !editCourse.name.trim()) return
    try {
      const res = await fetch(`/api/courses?id=${editCourse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editCourse.code.trim(),
          name: editCourse.name.trim(),
          blocks: editCourseBlocks.filter((b) => b.trim()),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed")
      setIsEditCourseOpen(false)
      setEditCourseBlocks([""])
      showToast({
        title: "Degree Program Updated",
        description:
          "The changes to the degree program and its associated blocks have been successfully saved.",
      })
      if (loadAll) loadAll()
    } catch (err) {
      showToast(formatErrorMessage(err, "Update Failed"), true)
    }
  }

  async function delCourse(id) {
    try {
      const res = await fetch(`/api/courses?id=${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Archive failed")
      setConfirmOpen(false)
      if (setSelectedCourses) {
        setSelectedCourses((prev) => {
          if (!prev || !prev[id]) return prev
          const next = { ...prev }
          delete next[id]
          return next
        })
      }
      showToast({
        title: "Degree Program Archived",
        description:
          "The selected degree program has been successfully moved to the archive.",
      })
      if (loadAll) loadAll()
    } catch (err) {
      showToast(formatErrorMessage(err, "Archival Failed"), true)
    }
  }

  async function resCourse(id) {
    try {
      const res = await fetch(`/api/courses?id=${id}&restore=true`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Restore failed")
      setConfirmOpen(false)
      if (setSelectedCourses) {
        setSelectedCourses((prev) => {
          if (!prev || !prev[id]) return prev
          const next = { ...prev }
          delete next[id]
          return next
        })
      }
      showToast({
        title: "Degree Program Restored",
        description:
          "The degree program has been successfully restored from the archive.",
      })
      if (loadAll) loadAll()
    } catch (err) {
      showToast(formatErrorMessage(err, "Restoration Failed"), true)
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      setCourseSearch(localSearch)
    }, 300)
    return () => clearTimeout(handler)
  }, [localSearch, setCourseSearch])

  useEffect(() => {
    if (courseSearch !== "") return
    const handler = setTimeout(() => setLocalSearch(""), 0)
    return () => clearTimeout(handler)
  }, [courseSearch])

  const handleItemsPerPageChange = (e) => {
    const value = Number(e.target.value)
    setItemsPerPage(value)
    setPageCourse(1)
  }




  const totalInView = courses.filter((c) => 
    showArchived ? c.status === "Archived" : c.status !== "Archived"
  ).length

  const selectedCount = Object.values(selectedCourses || {}).filter(Boolean).length
  const selectedNames = filteredCourses
    .filter((c) => selectedCourses[c.id])
    .map((c) => `${c.code} - ${c.name}`)

  const handleBulkAction = () => {
    setConfirmPayload({
      title: showArchived ? "Restore Selected Programs" : "Archive Selected Programs",
      message: showArchived 
        ? "These degree programs will be visible for new records again."
        : "These degree programs will be hidden from new registrations but their history will be preserved.",
      confirmLabel: showArchived ? "Restore Programs" : "Archive Programs",
      variant: showArchived ? "success" : "danger",
      buttonIcon: showArchived ? " Archive02Icon" : " Archive01Icon",
      icon: showArchived ? " Archive02Icon" : " Archive01Icon",
      selectedItems: selectedNames,
      onConfirm: () => executeBulkTaxonomyAction("Course", showArchived ? "restore" : "delete"),
    })
    setConfirmOpen(true)
  }

  return (
    <TooltipProvider delay={200}>
      <div className="font-jakarta flex flex-[1_0_auto] w-full flex-col animate-fade-up">
        <PageHeader
          icon="LibraryIcon"
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          title={
            <div className="flex items-center gap-[6px]">
              Degree Programs
              
            </div>
          }
          description="Manage academic programs and their corresponding identifiers."
          actions={
            <Button
              onClick={() => setIsAddCourseOpen(true)}
              disabled={showArchived}
              className="h-9 shrink-0 px-4"
            >
              Add Program
            </Button>
          }
          className="p-6"
        />

        <DataViewToolbar
          label="Degree program tabs, search, and filters"
          className="justify-between gap-3 border-t border-border bg-white px-4 py-2.5 sm:px-6 dark:border-border dark:bg-card"
        >
          <SegmentedControl
            value={showArchived ? "archived" : "active"}
            onValueChange={(val) => {
              setShowArchived(val === "archived")
              setPageCourse(1)
            }}
            variant="capsule"
            className="inline-grid grid-flow-col auto-cols-fr shrink-0"
            items={[
              {
                value: "active",
                label: "Active",
                badge: courses.filter((c) => c.status !== "Archived").length,
              },
              {
                value: "archived",
                label: "Archived",
                badge: courses.filter((c) => c.status === "Archived").length,
              },
            ]}
          />
          <div className="ml-auto flex items-center gap-3 select-none">
            <DashboardSearch
              value={localSearch}
              onChange={setLocalSearch}
              onClear={() => {
                setLocalSearch("")
                setCourseSearch("")
                setPageCourse(1)
              }}
              count={filteredCoursesFull.length}
              placeholder="Search code or program name..."
              label="Search degree programs"
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
            setCourseSearch("")
            setPageCourse(1)
          }}
          onClearAll={() => {
            setLocalSearch("")
            setCourseSearch("")
            setPageCourse(1)
          }}
          className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
        />

        {/* Main Table Container (Seamless inside single card) */}
        <div className={cn("w-full flex flex-[1_0_auto] flex-col border-t border-border dark:border-border bg-white dark:bg-card", filteredCourses.length === 0 && "rounded-b-2xl overflow-hidden")}>
          {loading && courses.length === 0 ? (
            <div className="w-full flex-[1_0_auto] overflow-x-auto select-none">
              <TaxonomyTableSkeleton rowCount={6} embedded={true} showSubtext={true} showPagination={false} />
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>{showArchived && totalInView === 0 ? <EmptyArchive01Icon size="1em" /> : <EmptySearch01Icon size="1em" />}</EmptyMedia>
                  <EmptyTitle>
                    {totalInView > 0 ? "No matches found" : (showArchived ? "No Archived Programs Found" : "No Degree Programs Found")}
                  </EmptyTitle>
                  <EmptyDescription>
                    {totalInView > 0
                      ? "Try adjusting your search filters to find what you're looking for."
                      : showArchived
                        ? "There are currently no archived degree programs in the system."
                        : "Add Degree Program to start building your organizational hierarchy."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  {totalInView > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCourseSearch("")
                        setLocalSearch("")
                      }}
                      title="Reset Filters"
                      className="flex h-9 items-center justify-center rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                    >
                      Reset Filters
                    </Button>
                  ) : (
                    !showArchived && (
                      <Button
                        size="sm"
                        onClick={() => setIsAddCourseOpen(true)}
                        className="flex h-9 px-4 cursor-pointer"
                      >
                        Add Program
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
              <Table columns={["selection", { kind: "identifier", minWidth: 130, maxWidth: 180, growthWeight: 1 }, { kind: "text", minWidth: 320, maxWidth: 1000, growthWeight: 5 }, { kind: "status", minWidth: 130, maxWidth: 180, growthWeight: 1 }, "actions"]} className="min-w-[950px]">
                <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      <th className="w-12 p-4 text-center sticky left-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs">
                        <input
                          type="checkbox"
                          className="h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon disabled:cursor-not-allowed disabled:opacity-20 dark:text-primary dark:border-border"
                          checked={
                            filteredCourses.length > 0 &&
                            filteredCourses.every((c) => selectedCourses[c.id])
                          }
                          onChange={(e) => toggleAllCourses(e.target.checked)}
                          disabled={filteredCourses.length === 0}
                        />
                      </th>
                      <th className={cn(
                        "w-[18%] p-4 px-6 sticky left-12 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs transition-shadow duration-200",
                        isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                      )}>
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => onSort("code")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                              sortCourse.key === "code" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            Code <SortIndicator sortState={sortCourse} column="code" />
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
                      <th className="w-[56%] p-4">
                        <button
                          onClick={() => onSort("name")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortCourse.key === "name" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Designation <SortIndicator sortState={sortCourse} column="name" />
                        </button>
                      </th>
                      <th className="w-[14%] p-4 px-6 text-xs font-semibold text-gray-500 dark:text-zinc-400">Status</th>
                      <th className="w-28 p-4 pr-6 text-right text-xs font-semibold text-gray-500 dark:text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent divide-y divide-border dark:divide-border bg-white dark:bg-card">
                    {filteredCourses.map((c) => {
                      const isDisabled = showArchived
                        ? c.status !== "Archived"
                        : c.status === "Archived";
                      const isSelected = !!selectedCourses[c.id];
                      
                      return (
                        <tr
                          key={c.id}
                          selected={isSelected}
                          onClick={(e) => {
                            if (!isDisabled) toggleCourseSelected(c.id, e);
                          }}
                          className={cn(
                            "group border-b-[0.5px] border-border dark:border-border last:border-b-0 transition-all duration-fast hover:bg-gray-50/70 dark:bg-card dark:hover:bg-zinc-800/40 select-none cursor-pointer",
                            c.status === "Archived" && "opacity-75",
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
                                toggleCourseSelected(c.id);
                              }}
                              disabled={isDisabled}
                            />
                          </td>
                          <td className={cn(
                            "p-4 px-6 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70 sticky left-12 z-10 transition-all duration-200",
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950"
                              : "bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/40",
                            isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)] border-r border-border/70"
                          )}>
                            <span className={cn("font-sans tabular-nums text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 whitespace-nowrap", BADGE_BASE)}>
                              {c.code}
                            </span>
                          </td>
                          <td className="p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
                            <div className="truncate text-xs font-semibold text-gray-900 dark:text-zinc-100" title={c.name}>
                              {c.name}
                            </div>
                          </td>
                          <td className="p-4 px-6 align-middle text-left whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            {c.status === "Archived" ? (
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
                                item={c}
                                name={`${c.code} - ${c.name}`}
                                entityName="Degree Program"
                                isArchived={c.status === "Archived"}
                                onEdit={(item) => {
                                  setEditCourse({
                                    id: item.id,
                                    code: item.code,
                                    name: item.name,
                                  })
                                  const currentBlocks = sections
                                    .filter((s) => s.course_code === item.code)
                                    .map((s) => s.name)
                                  setEditCourseBlocks(
                                    currentBlocks.length > 0
                                      ? currentBlocks
                                      : [""]
                                  )
                                  setIsEditCourseOpen(true)
                                }}
                                onArchive={(item) => {
                                  setConfirmPayload({
                                    title: "Archive Degree Program",
                                    message:
                                      "This degree program will be hidden from new registrations but its history will be preserved.",
                                    confirmLabel: "Archive Program",
                                    variant: "danger",
                                    buttonIcon: " Archive01Icon",
                                    icon: " Archive01Icon",
                                    selectedItems: [`${item.code} - ${item.name}`],
                                    onConfirm: () => delCourse(item.id, item.code),
                                  })
                                  setConfirmOpen(true)
                                }}
                                onRestore={(item) => {
                                  setConfirmPayload({
                                    title: "Restore Degree Program",
                                    message:
                                      "This degree program will be visible for new records again.",
                                    confirmLabel: "Restore Program",
                                    variant: "success",
                                    buttonIcon: " Archive02Icon",
                                    icon: " Archive02Icon",
                                    selectedItems: [`${item.code} - ${item.name}`],
                                    onConfirm: () => resCourse(item.id, item.code),
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

        {filteredCoursesFull.length > 0 && (
          <TablePagination label="Courses pages" page={pageCourse} pageSize={itemsPerPage} totalCount={filteredCoursesFull.length} displayedCount={filteredCourses.length} onPageChange={setPageCourse} onPageSizeChange={(size) => handleItemsPerPageChange({ target: { value: size } })} />
        )}
      </div>

      <FloatingActionBar
        selectedCount={selectedCount}
        selectionStatus="Selected Courses"
        onCancel={() => toggleAllCourses(false)}
        onAction={handleBulkAction}
        actionLabel={showArchived ? "Restore Programs" : "Archive Programs"}
        actionIcon={showArchived ? "Archive02Icon" : "Archive01Icon"}
        actionVariant={showArchived ? "success" : "danger"}
      />

      <Dialog
        open={isAddCourseOpen}
        onOpenChange={(open) => {
          if (repeat.saving) return
          setIsAddCourseOpen(open)
          if (!open) {
            setNewCourseCode("")
            setNewCourseName("")
            setNewCourseBlocks([""])
          }
        }}
      >
        <DialogContent className="overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-xl dark:border-border dark:bg-card">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle>
                  New Degree Program
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Register a new academic track and its initial organizational blocks.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form ref={attachForm} onSubmit={addCourse}>
            <div className="max-h-[60vh] overflow-y-auto p-6 pb-4 flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                  Code
                </label>
                <Input
                  type="text"
                  placeholder="BSIT"
                  className="h-10 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs"
                  value={newCourseCode}
                  onChange={(e) =>
                    setNewCourseCode(e.target.value.toUpperCase())
                  }
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                  Designation
                </label>
                <Input
                  type="text"
                  placeholder="Bachelor of Science in Information Technology"
                  className="h-10 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                    Course Blocks <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">(optional)</span>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewCourseBlocks([...newCourseBlocks, ""])}
                    title="Add Course Block"
                    className="h-auto p-0 bg-transparent text-xs font-medium text-red-600 hover:bg-transparent shadow-none border-0 focus:outline-none cursor-pointer"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  {newCourseBlocks.map((block, idx) => (
                    <div key={idx} className="flex min-w-0 gap-2">
                      <Input
                        type="text"
                        placeholder={`Block ${idx + 1} Name`}
                        className="h-10 flex-1 min-w-0 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs"
                        value={block}
                        onChange={(e) => {
                          const updated = [...newCourseBlocks]
                          updated[idx] = e.target.value
                          setNewCourseBlocks(updated)
                        }}
                      />
                      {newCourseBlocks.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updated = newCourseBlocks.filter(
                              (_, i) => i !== idx
                            )
                            setNewCourseBlocks(updated)
                          }}
                          className="h-10 w-10 shrink-0 rounded-xl text-gray-400 hover:text-red-600 dark:text-zinc-500"
                        >
                          <Delete01Icon size="1em"  className="text-sm"></Delete01Icon>
                        </Button>
                      )}
                    </div>
                  ))}
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
                  setIsAddCourseOpen(false)
                  setNewCourseCode("")
                  setNewCourseName("")
                  setNewCourseBlocks([""])
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
                {repeat.saving ? "Creating Program…" : "Create Program"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditCourseOpen}
        onOpenChange={(open) => {
          setIsEditCourseOpen(open)
          if (!open) {
            setEditCourse({ id: null, code: "", name: "" })
            setEditCourseBlocks([""])
          }
        }}
      >
        <DialogContent className="overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-xl dark:border-border dark:bg-card">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle>
                  Update Program Details
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Modify the designation or associated blocks for this program.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={updCourse}>
            <div className="max-h-[60vh] space-y-4 overflow-y-auto p-6 pb-4">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                    Code
                  </label>
                  <Input
                    type="text"
                    className="h-10 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs"
                    value={editCourse.code}
                    onChange={(e) =>
                      setEditCourse((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                    Program Designation
                  </label>
                  <Input
                    type="text"
                    className="h-10 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs"
                    value={editCourse.name}
                    onChange={(e) =>
                      setEditCourse((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                    Manage Course Blocks <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">(optional)</span>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setEditCourseBlocks([...editCourseBlocks, ""])
                    }
                    title="Add Course Block"
                    className="h-auto p-0 bg-transparent text-xs font-medium text-red-600 hover:bg-transparent shadow-none border-0 focus:outline-none cursor-pointer"
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {editCourseBlocks.map((block, idx) => (
                    <div key={idx} className="flex min-w-0 gap-2">
                      <Input
                        type="text"
                        placeholder={`Block ${idx + 1} Name`}
                        className="h-10 flex-1 min-w-0 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs"
                        value={block}
                        onChange={(e) => {
                          const updated = [...editCourseBlocks]
                          updated[idx] = e.target.value
                          setEditCourseBlocks(updated)
                        }}
                      />
                      {editCourseBlocks.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updated = editCourseBlocks.filter(
                              (_, i) => i !== idx
                            )
                            setEditCourseBlocks(updated)
                          }}
                          className="h-10 w-10 shrink-0 rounded-xl text-gray-400 hover:text-red-600 dark:text-zinc-500"
                        >
                          <Archive01Icon size="1em"  className="text-sm"></Archive01Icon>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-0 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditCourseOpen(false)
                  setEditCourse({ id: null, code: "", name: "" })
                  setEditCourseBlocks([""])
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
