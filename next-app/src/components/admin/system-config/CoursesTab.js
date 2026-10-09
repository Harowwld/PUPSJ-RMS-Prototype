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
  handleExportCourses: handleExportProp,
}) {
  const [localSearch, setLocalSearch] = useState(courseSearch)
  const [isExporting, setIsExporting] = useState(false)

  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false)
  const [newCourseCode, setNewCourseCode] = useState("")
  const [newCourseName, setNewCourseName] = useState("")
  const [newCourseBlocks, setNewCourseBlocks] = useState([""])
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false)
  const [editCourse, setEditCourse] = useState({ id: null, code: "", name: "" })
  const [editCourseBlocks, setEditCourseBlocks] = useState([""])

  const [isQuickAddLoading, setIsQuickAddLoading] = useState(false)

  async function addCourse(e, overrideData = null) {
    if (e) e.preventDefault()
    const code = overrideData ? overrideData.code : newCourseCode.trim()
    const name = overrideData ? overrideData.name : newCourseName.trim()
    if (!code || !name) return

    if (overrideData) setIsQuickAddLoading(true)

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          blocks: overrideData ? [] : newCourseBlocks.filter((b) => b.trim()),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Add failed")

      if (!overrideData) {
        setNewCourseCode("")
        setNewCourseName("")
        setNewCourseBlocks([""])
        setIsAddCourseOpen(false)
      } else {
        setNewCourseCode("")
        setNewCourseName("")
      }

      showToast({
        title: "Degree Program Added",
        description:
          "The new degree program has been successfully registered in the system.",
      })
      if (loadAll) loadAll()
    } catch (err) {
      showToast(
        { title: "Registration Failed", description: err.message },
        true
      )
    } finally {
      if (overrideData) setIsQuickAddLoading(false)
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
      showToast({ title: "Update Failed", description: err.message }, true)
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
      showToast({ title: "Archival Failed", description: err.message }, true)
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
      showToast({ title: "Restoration Failed", description: err.message }, true)
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      setCourseSearch(localSearch)
    }, 300)
    return () => clearTimeout(handler)
  }, [localSearch, setCourseSearch])

  useEffect(() => {
    if (courseSearch === "") setLocalSearch("")
  }, [courseSearch])

  const handleItemsPerPageChange = (e) => {
    const value = Number(e.target.value)
    setItemsPerPage(value)
    setPageCourse(1)
  }


  const handleExportCourses =
    handleExportProp ||
    (() => {
      const q = (cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`
      const csvContent = [
        ["Code", "Designation", "Status"],
        ...courses.map((c) => [c?.code || "", c?.name || "", c?.status || "Active"]),
      ]
        .map((row) => row.map(q).join(","))
        .join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.setAttribute(
        "download",
        `degree_programs_${new Date().toISOString().split("T")[0]}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      if (showToast) {
        showToast({
          title: "Export Success",
          description:
            "Degree programs configuration has been successfully exported to CSV.",
        })
      }
    })

  const onExportClick = async () => {
    setIsExporting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 600))
      await handleExportCourses()
    } finally {
      setIsExporting(false)
    }
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
      confirmLabel: showArchived ? "Restore" : "Archive",
      variant: showArchived ? "success" : "warning",
      buttonIcon: showArchived ? "ph-bold ph-archive-restore" : "ph-bold ph-archive",
      icon: showArchived ? "ph-duotone ph-archive-restore" : "ph-duotone ph-archive",
      selectedItems: selectedNames,
      onConfirm: () => executeBulkTaxonomyAction("Course", showArchived ? "restore" : "delete"),
    })
    setConfirmOpen(true)
  }

  return (
    <TooltipProvider delay={200}>
      <div className="font-jakarta flex w-full flex-col animate-fade-up">
        <PageHeader
          icon="ph-books"
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          title={
            <div className="flex items-center gap-[6px]">
              Degree Programs
              
            </div>
          }
          description="Manage academic programs and their corresponding identifiers."
          className="p-6"
        />

        {/* Navigation Toolbar */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* Active / Archived Tabs */}
          <div className="flex items-center gap-6 shrink-0 select-none">
            <button
              type="button"
              onClick={() => {
                setShowArchived(false)
                setPageCourse(1)
              }}
              className={cn(
                "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                !showArchived
                  ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Active ({courses.filter((c) => c.status !== "Archived").length})
            </button>
            <button
              type="button"
              onClick={() => {
                setShowArchived(true)
                setPageCourse(1)
              }}
              className={cn(
                "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                showArchived
                  ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Archived ({courses.filter((c) => c.status === "Archived").length})
            </button>
          </div>

          {/* Search Input, Matches Count, Export, Add */}
          <div className="flex flex-1 items-center justify-end gap-3 min-w-[300px] select-none">
            <div className="flex-1 max-w-md relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <HugeIcon className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm" />
              </div>
              <Input
                type="text"
                placeholder="Search code or program name..."
                className="h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-9 pr-24 text-xs font-normal placeholder:text-gray-400 dark:placeholder:text-zinc-500 text-gray-900 dark:text-zinc-100 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              <div className="absolute inset-y-0 right-3 flex items-center gap-2">
                {localSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalSearch("")
                      setCourseSearch("")
                      setPageCourse(1)
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none text-xs"
                    title="Clear search"
                  >
                    <HugeIcon className="ph-bold ph-x" />
                  </button>
                )}
                <span className="text-[12px] font-normal text-gray-400 dark:text-zinc-500 pointer-events-none">
                  {filteredCoursesFull.length}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onExportClick}
              disabled={isExporting}
              className="flex h-10 items-center justify-center rounded-xl! border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
            >
              {isExporting ? (
                <HugeIcon className="ph-bold ph-spinner animate-spin text-[16px]" />
              ) : (
                "Export"
              )}
            </Button>

            <Button
              onClick={() => setIsAddCourseOpen(true)}
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
        <div className={cn("w-full border-t border-border dark:border-border bg-white dark:bg-card", filteredCourses.length === 0 && "rounded-b-2xl overflow-hidden")}>
          <div className="w-full overflow-x-auto select-none">
            {loading && courses.length === 0 ? (
              <TaxonomyTableSkeleton rowCount={6} embedded={true} showSubtext={true} showPagination={false} />
            ) : (
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-border dark:border-border bg-white dark:bg-card">
                    <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                      <th className="w-12 p-4 text-center">
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
                      <th className="w-48 p-4">
                        <button
                          onClick={() => onSort("code")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortCourse.key === "code" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Code <SortIndicator sortState={sortCourse} column="code" />
                        </button>
                      </th>
                      <th className="p-4">
                        <button
                          onClick={() => onSort("name")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortCourse.key === "name" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Designation <SortIndicator sortState={sortCourse} column="name" />
                        </button>
                      </th>
                      <th className="w-36 p-4 text-[12px] font-medium tracking-[0.04em] text-gray-500 dark:text-zinc-400">Status</th>
                      <th className="w-32 p-4 text-right text-[12px] font-medium tracking-[0.04em] text-gray-500 dark:text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border">
                    {!showArchived && (
                      <tr
                        className={cn(
                          "group border-b-[0.5px] border-border dark:border-border last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                          (newCourseCode.trim() || newCourseName.trim()) && "bg-emerald-50/40 dark:bg-emerald-950/10"
                        )}
                      >
                        <td className="p-4 align-middle text-center"></td>
                        <td className="p-4 align-middle">
                          <Input
                            placeholder="CODE (e.g. BSIT)"
                            value={newCourseCode}
                            onChange={(e) =>
                              setNewCourseCode(e.target.value.toUpperCase())
                            }
                            className={cn(
                              "h-10 w-40 rounded-xl border border-border bg-white text-xs font-semibold transition-all focus-visible:ring-pup-maroon",
                              newCourseCode.trim() || newCourseName.trim() ? "ring-1 ring-emerald-200 border-emerald-300 dark:ring-emerald-500/30 dark:border-emerald-500/50" : "focus-visible:border-border dark:border-border dark:bg-card"
                            )}
                          />
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Full program designation..."
                              value={newCourseName}
                              onChange={(e) => setNewCourseName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  addCourse(null, {
                                    code: newCourseCode,
                                    name: newCourseName,
                                  })
                                }
                              }}
                              className={cn(
                                "h-10 flex-1 rounded-xl border border-border bg-white text-sm transition-all focus-visible:ring-pup-maroon",
                                newCourseCode.trim() || newCourseName.trim() ? "ring-1 ring-emerald-200 border-emerald-300 dark:ring-emerald-500/30 dark:border-emerald-500/50" : "focus-visible:border-border dark:border-border dark:bg-card"
                              )}
                            />
                            <Button
                              size="sm"
                              disabled={
                                !newCourseCode.trim() ||
                                !newCourseName.trim() ||
                                isQuickAddLoading
                              }
                              onClick={() =>
                                addCourse(null, {
                                  code: newCourseCode,
                                  name: newCourseName,
                                })
                              }
                              title="Add Degree Program"
                              className="h-10 w-10 p-0 flex items-center justify-center rounded-xl text-[14px] font-semibold text-emerald-600 dark:text-emerald-400 shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95 disabled:opacity-50 transition-all dark:shadow-none bg-white dark:bg-zinc-900 border-[1.5px] border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-500/40 dark:hover:border-emerald-400 dark:hover:bg-emerald-950/40 shrink-0"
                            >
                              {isQuickAddLoading ? (
                                <HugeIcon  className="ph-bold ph-spinner animate-spin"></HugeIcon>
                              ) : (
                                <HugeIcon  className="ph-bold ph-plus" strokeWidth={2.5}></HugeIcon>
                              )}
                            </Button>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          {newCourseCode.trim() || newCourseName.trim() ? (
                            <div className="inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                              Draft
                            </div>
                          ) : (
                            <div className="inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">
                              New
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right align-middle"></td>
                      </tr>
                    )}
                    {filteredCourses.map((c) => {
                      const isDisabled = showArchived
                        ? c.status !== "Archived"
                        : c.status === "Archived";
                      const isSelected = !!selectedCourses[c.id];
                      
                      return (
                        <tr
                          key={c.id}
                          onClick={(e) => {
                            if (!isDisabled) toggleCourseSelected(c.id, e);
                          }}
                          className={cn(
                            "group border-b-[0.5px] border-border dark:border-border last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                            c.status === "Archived" && "opacity-75",
                            isSelected && "bg-blue-50/60 dark:bg-blue-950/20",
                            isDisabled && "cursor-not-allowed"
                          )}
                        >
                          <td className="p-4 align-middle text-center">
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
                          <td className="p-4 align-middle">
                            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 whitespace-nowrap">
                              {c.code}
                            </span>
                          </td>
                          <td className="p-4 align-middle max-w-[400px]">
                            <div className="truncate text-xs font-semibold text-gray-900 dark:text-zinc-100" title={c.name}>
                              {c.name}
                            </div>
                          </td>
                          <td className="p-4 align-middle text-left">
                            {c.status === "Archived" ? (
                              <div className="inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400">
                                Archived
                              </div>
                            ) : (
                              <div className="inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] bg-green-100 text-green-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                                Active
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right align-middle">
                            <div 
                              className="inline-flex items-center justify-end gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                               {!showArchived && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      disabled={c.status === "Archived"}
                                      onClick={() => {
                                        setEditCourse({
                                          id: c.id,
                                          code: c.code,
                                          name: c.name,
                                        })
                                        const currentBlocks = sections
                                          .filter((s) => s.course_code === c.code)
                                          .map((s) => s.name)
                                        setEditCourseBlocks(
                                          currentBlocks.length > 0
                                            ? currentBlocks
                                            : [""]
                                        )
                                        setIsEditCourseOpen(true)
                                      }}
                                      aria-label="Edit Degree Program"
                                      className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors flex items-center justify-center border-0 bg-transparent cursor-pointer active:scale-95"
                                    >
                                      <HugeIcon  className="ph-bold ph-pencil-simple text-[16px]"></HugeIcon>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Edit</TooltipContent>
                                </Tooltip>
                              )}

                            {c.status === "Archived" ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => {
                                      setConfirmPayload({
                                        title: "Restore Degree Program",
                                        message:
                                          "This degree program will be visible for new records again.",
                                        confirmLabel: "Restore",
                                        variant: "success",
                                        buttonIcon:
                                          "ph-bold ph-archive-restore",
                                        icon: "ph-duotone ph-archive-restore",
                                        selectedItems: [`${c.code} - ${c.name}`],
                                        onConfirm: () => resCourse(c.id, c.code),
                                      })
                                      setConfirmOpen(true)
                                    }}
                                    aria-label="Restore Degree Program"
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
                                        title: "Archive Degree Program",
                                        message:
                                          "This degree program will be hidden from new registrations but its history will be preserved.",
                                        confirmLabel: "Archive",
                                        variant: "warning",
                                        buttonIcon: "ph-bold ph-archive",
                                        icon: "ph-duotone ph-archive",
                                        selectedItems: [`${c.code} - ${c.name}`],
                                        onConfirm: () => delCourse(c.id, c.code),
                                      })
                                      setConfirmOpen(true)
                                    }}
                                    aria-label="Archive Degree Program"
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
                    {filteredCourses.length === 0 && (
                      <tr className="border-0 hover:bg-transparent">
                        <td colSpan={5} className="border-0 p-0">
                          <Empty className="flex h-[450px] flex-col items-center justify-center border-0 bg-transparent text-center">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <div className="relative mb-6">
                                <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                                <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                                  <HugeIcon  className={showArchived && totalInView === 0 ? "ph-archive" : "ph-magnifying-glass"}></HugeIcon>
                                </EmptyMedia>
                              </div>
                              <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                                {totalInView > 0 ? "No matches found" : (showArchived ? "No Archived Programs Found" : "No Degree Programs Found")}
                              </EmptyTitle>
                              <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300">
                                {totalInView > 0
                                  ? "Try adjusting your search filters to find what you're looking for."
                                  : showArchived
                                    ? "There are currently no archived degree programs in the system."
                                    : "Add Degree Program to start building your organizational hierarchy."}
                              </EmptyDescription>
                              {totalInView > 0 ? (
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setCourseSearch("")
                                    setLocalSearch("")
                                  }}
                                  title="Reset Filters"
                                  className="mt-6 flex h-10 items-center justify-center rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                                >
                                  Reset
                                </Button>
                              ) : (
                                !showArchived && (
                                  <Button
                                    onClick={() => setIsAddCourseOpen(true)}
                                    className="mt-4 h-10 rounded-xl btn-brand-red px-5 text-xs font-semibold text-white shadow-xs active:scale-95 transition-all cursor-pointer border-0"
                                  >
                                    Add
                                  </Button>
                                )
                              )}
                            </EmptyHeader>
                          </Empty>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

        {filteredCoursesFull.length > 0 && (
          <div className="flex items-center justify-between border-t border-border dark:border-border bg-white dark:bg-card p-4 px-6 rounded-b-2xl mt-auto select-none">
            <div className="flex items-center gap-6 text-xs text-gray-900 dark:text-zinc-300 select-none">
              <span>
                Showing {filteredCourses.length} of {filteredCoursesFull.length.toLocaleString()}
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
                disabled={pageCourse <= 1}
                onClick={() => setPageCourse((p) => Math.max(1, p - 1))}
                className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
              >
                Prev
              </Button>

              <div className="h-8 w-8 rounded-xl border border-border dark:border-border flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                {pageCourse}
              </div>

              <Button
                variant="ghost"
                size="sm"
                disabled={pageCourse >= Math.ceil(filteredCoursesFull.length / itemsPerPage)}
                onClick={() => setPageCourse((p) => p + 1)}
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
        selectionStatus="Selected Courses"
        onCancel={() => toggleAllCourses(false)}
        onAction={handleBulkAction}
        actionLabel={showArchived ? "Restore" : "Archive"}
        actionIcon={showArchived ? "ph-archive-restore" : "ph-archive"}
        actionVariant={showArchived ? "success" : "danger"}
      />

      <Dialog
        open={isAddCourseOpen}
        onOpenChange={(open) => {
          setIsAddCourseOpen(open)
          if (!open) {
            setNewCourseCode("")
            setNewCourseName("")
            setNewCourseBlocks([""])
          }
        }}
      >
        <DialogContent className="overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-md dark:border-border dark:bg-card">
          <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                  New Degree Program
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] font-normal text-gray-900 dark:text-zinc-300">
                  Register a new academic track and its initial organizational blocks.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={addCourse}>
            <div className="max-h-[60vh] overflow-y-auto p-6 pb-4 flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                  Code <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
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
                  Designation <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
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
                    Course Blocks
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
                          <HugeIcon  className="ph-bold ph-trash text-sm"></HugeIcon>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddCourseOpen(false)
                  setNewCourseCode("")
                  setNewCourseName("")
                  setNewCourseBlocks([""])
                }}
                className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white shadow-xs cursor-pointer active:scale-95 transition-all border-0"
              >
                Create
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
        <DialogContent className="overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-md dark:border-border dark:bg-card">
          <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                  Update Program Details
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] font-normal text-gray-900 dark:text-zinc-300">
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
                    Code <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
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
                    Program Designation <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
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
                    Manage Course Blocks
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
                          <HugeIcon  className="ph-bold ph-archive text-sm"></HugeIcon>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditCourseOpen(false)
                  setEditCourse({ id: null, code: "", name: "" })
                  setEditCourseBlocks([""])
                }}
                className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white shadow-xs cursor-pointer active:scale-95 transition-all border-0"
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
