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
  const [jumpPage, setJumpPage] = useState(String(pageCourse))

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

  async function delCourse(id, code) {
    try {
      const res = await fetch(`/api/courses?id=${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Archive failed")
      setConfirmOpen(false)
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

  async function resCourse(id, code) {
    try {
      const res = await fetch(`/api/courses?id=${id}&restore=true`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Restore failed")
      setConfirmOpen(false)
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
    setJumpPage(String(pageCourse))
  }, [pageCourse])

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

  const handleJumpPage = (e) => {
    if (e.key === "Enter" || e.type === "blur") {
      const val = parseInt(jumpPage)
      const totalPages = Math.ceil(filteredCoursesFull.length / itemsPerPage)
      if (!isNaN(val) && val >= 1 && val <= totalPages) {
        setPageCourse(val)
      } else {
        setJumpPage(String(pageCourse))
      }
    }
  }

  const SortIndicator = ({ column }) => {
    if (sortCourse.key !== column)
      return <i className="ph-bold ph-caret-up-down ml-1 opacity-40 text-[10px]"></i>
    return sortCourse.direction === "asc" ? (
      <i className="ph-bold ph-caret-up ml-1 text-pup-maroon dark:text-primary text-[10px] dark:text-primary"></i>
    ) : (
      <i className="ph-bold ph-caret-down ml-1 text-pup-maroon dark:text-primary text-[10px] dark:text-primary"></i>
    )
  }

  const handleExportCourses =
    handleExportProp ||
    (() => {
      const csvContent = [
        ["Code", "Designation", "Status"],
        ...courses.map((c) => [c.code, c.name, c.status]),
      ]
        .map((e) => e.join(","))
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

  const selectedCount = Object.values(selectedCourses).filter(Boolean).length
  const selectedNames = filteredCourses
    .filter((c) => selectedCourses[c.id])
    .map((c) => `${c.code} - ${c.name}`)

  const handleBulkAction = () => {
    setConfirmPayload({
      title: showArchived
        ? "Restore Selected Programs"
        : "Archive Selected Programs",
      message: `Apply ${showArchived ? "restoration" : "archival"} to the following ${selectedCount} degree programs?`,
      confirmLabel: showArchived ? "Restore Selected" : "Archive Selected",
      variant: showArchived ? "success" : "danger",
      buttonIcon: showArchived
        ? "ph-bold ph-arrow-counter-clockwise"
        : "ph-bold ph-archive",
      icon: showArchived
        ? "ph-duotone ph-arrow-counter-clockwise"
        : "ph-duotone ph-archive",
      selectedItems: selectedNames,
      onConfirm: () =>
        executeBulkTaxonomyAction(
          "Course",
          showArchived ? "restore" : "delete"
        ),
    })
    setConfirmOpen(true)
  }

  if (loading && courses.length === 0) {
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
    <div className="animate-fade-up font-inter flex h-full w-full flex-col">
      <Card className="flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-books"
          title={
            <div className="flex items-center gap-2">
              Degree Programs
              {showArchived && (
                <Badge className="border-red-100 bg-red-50 text-[10px] font-black text-red-700 dark:border-white/10 dark:bg-red-950/30 dark:text-red-400">
                  RESTORE MODE
                </Badge>
              )}
            </div>
          }
          description="Manage academic programs and their corresponding identifiers."
          searchPlaceholder="Search code or program name..."
          searchLabel="Search Degree Programs"
          searchValue={localSearch}
          onSearchChange={setLocalSearch}
          filters={
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex h-full flex-col gap-1.5">
                <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
                  Status View
                </label>
                <div className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-gray-100 p-1 shadow-sm dark:border-white/10 dark:shadow-none dark:bg-muted">
                  <button
                    onClick={() => setShowArchived(false)}
                    className={`flex h-full items-center gap-2 rounded-md px-3 text-[10px] font-black tracking-widest uppercase transition-all ${ 
                      !showArchived 
                        ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5 dark:bg-card dark:text-primary" 
                        : "text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-200" 
                    }`}
                  >
                    ACTIVE
                  </button>
                  <button
                    onClick={() => setShowArchived(true)}
                    className={`flex h-full items-center gap-2 rounded-md px-3 text-[10px] font-black tracking-widest uppercase transition-all ${ 
                      showArchived 
                        ? "bg-amber-600 text-white shadow-sm ring-1 ring-black/5 dark:bg-card dark:text-amber-400" 
                        : "text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-200" 
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCourses}
                className="flex h-10 w-32 items-center justify-center gap-1.5 rounded-brand border border-gray-300 bg-white text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:border-white/10"
              >
                <i className="ph-bold ph-file-csv text-base"></i>
                EXPORT
              </Button>

              <Button
                onClick={() => setIsAddCourseOpen(true)}
                disabled={showArchived}
                className="flex h-10 items-center gap-2 rounded-brand btn-brand-red hover:from-red-700 hover:to-red-900 hover:shadow-md px-5 font-bold text-white shadow-sm active:scale-95 disabled:opacity-50 transition-all dark:shadow-none"
              >
                <i className="ph-bold ph-plus"></i>
                <span className="hidden uppercase sm:inline text-[10px] font-black tracking-widest">
                  Add Degree Program
                </span>
              </Button>
            </div>
          }
        />

        {/* Active Filter Chips Row */}
        {(localSearch !== "" || showArchived) && (
          <div className="flex-none border-b border-gray-100 bg-white px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300 dark:border-white/10 dark:bg-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase dark:text-zinc-500">Active Filters:</span>
              {localSearch && (
                <div className="flex items-center gap-1 rounded-full border border-gray-300 bg-pup-maroon/10 px-2.5 py-1 text-[10px] font-bold text-pup-maroon dark:text-primary uppercase dark:border-white/10 dark:text-primary">
                  Search: {localSearch}
                  <button
                    onClick={() => { setLocalSearch(""); setCourseSearch(""); setPageCourse(1); }}
                    className="ml-1 hover:text-pup-darkMaroon transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
                  </button>
                </div>
              )}
              {showArchived && (
                <div className="flex items-center gap-1 rounded-full border border-amber-100/30 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600 uppercase dark:bg-amber-950/30 dark:text-amber-400">
                  Mode: Archived Records
                  <button
                    onClick={() => { setShowArchived(false); setPageCourse(1); }}
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
                  setCourseSearch("")
                  setShowArchived(false)
                  setPageCourse(1)
                }}
                className="h-6 rounded-full border-2 border-dashed border-gray-300 px-3 text-[10px] font-black text-pup-maroon dark:text-primary transition-colors hover:border-pup-darkMaroon hover:bg-red-50 hover:text-pup-maroon uppercase dark:border-white/10 dark:text-primary dark:bg-red-950/30"
              >
                CLEAR ALL FILTERS
              </Button>
            </div>
          </div>
        )}

        <CardContent className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-card p-6">
          <div key={showArchived} className="relative flex flex-1 flex-col overflow-hidden animate-fade-up">
            {/* Archive Mode Overlay Pattern */}
            {showArchived && (
              <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-[0.03]">
                <i className="ph-fill ph-archive text-[320px]"></i>
              </div>
            )}

            <div className="relative z-10 flex-1 overflow-hidden overflow-x-auto overflow-y-auto rounded-brand border border-gray-200 bg-white shadow-sm select-none dark:border-white/10 dark:bg-card">
              {loading ? (
                <div className="space-y-4 p-8">
                  <Skeleton className="h-10 w-full rounded-lg dark:bg-muted" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg dark:bg-muted/50" />
                  ))}
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 backdrop-blur-sm dark:border-white/10 dark:bg-muted">
                    <tr className="text-left text-[10px] font-black tracking-widest text-gray-600 uppercase dark:text-zinc-300">
                      <th className="w-16 p-4 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon disabled:cursor-not-allowed disabled:opacity-20 dark:text-primary dark:border-white/10"
                          checked={
                            filteredCourses.length > 0 &&
                            filteredCourses.every((c) => selectedCourses[c.id])
                          }
                          onChange={(e) => toggleAllCourses(e.target.checked)}
                          disabled={filteredCourses.length === 0}
                        />
                      </th>
                      <th className="w-48 p-4 px-6">
                        <button
                          onClick={() => onSort("code")}
                          className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none"
                        >
                          CODE <SortIndicator column="code" />
                        </button>
                      </th>
                      <th className="p-4 px-6">
                        <button
                          onClick={() => onSort("name")}
                          className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none"
                        >
                          DESIGNATION <SortIndicator column="name" />
                        </button>
                      </th>
                      <th className="w-40 p-4 px-6">
                        STATUS
                      </th>
                      <th className="w-32 p-4 px-6 text-right">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                    {!showArchived && (
                      <tr
                        className={cn(
                          "transition-all duration-300",
                          newCourseCode.trim() || newCourseName.trim() ? "bg-amber-50/50 dark:bg-amber-950/10" : "bg-gray-50/30 hover:bg-gray-50 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"
                        )}
                      >
                        <td className="p-4 text-center">
                          <div
                            className={cn(
                              "flex h-5 w-5 mx-auto items-center justify-center rounded-full border-2 border-dashed transition-colors",
                              newCourseCode.trim() || newCourseName.trim() ? "border-orange-400 dark:border-orange-500/50" : "border-gray-300 dark:border-white/10"
                            )}
                          >
                            <i
                              className={cn(
                                "ph-bold text-[10px]",
                                newCourseCode.trim() || newCourseName.trim() ? "ph-pencil-simple animate-bounce text-orange-600 dark:text-orange-400" : "ph-plus text-gray-400 dark:text-amber-400"
                              )}
                            ></i>
                          </div>
                        </td>
                        <td className="p-4 px-6">
                          <Input
                            placeholder="CODE (e.g. BSIT)"
                            value={newCourseCode}
                            onChange={(e) =>
                              setNewCourseCode(e.target.value.toUpperCase())
                            }
                            className={cn(
                              "h-9 w-40 rounded-brand border border-gray-300 bg-white text-xs font-black transition-all focus-visible:ring-pup-maroon",
                              newCourseCode.trim() || newCourseName.trim() ? "ring-1 ring-amber-100" : "focus-visible:border-gray-300 dark:border-white/10 dark:bg-card"
                            )}
                          />
                        </td>
                        <td className="p-4 px-6">
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
                                "h-9 flex-1 rounded-brand border border-gray-300 bg-white text-sm transition-all focus-visible:ring-pup-maroon",
                                newCourseCode.trim() || newCourseName.trim() ? "ring-2 ring-amber-100" : "focus-visible:border-gray-300 dark:border-white/10 dark:bg-card"
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
                              className="h-9 rounded-brand px-4 text-[10px] font-black tracking-widest text-white shadow-sm active:scale-95 disabled:opacity-50 transition-all dark:shadow-none uppercase btn-brand-red"
                            >
                              {isQuickAddLoading ? (
                                <i className="ph-bold ph-spinner animate-spin"></i>
                              ) : (
                                <>
                                  <i className="ph-bold ph-plus mr-2"></i>
                                  ADD
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                        <td className="p-4 px-6">
                          {newCourseCode.trim() || newCourseName.trim() ? (
                            <Badge
                              variant="outline"
                              className="animate-pulse border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-black tracking-wider text-amber-700 uppercase dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-500/50"
                            >
                              UNSAVED DRAFT
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-gray-200 bg-gray-100 px-2.5 py-1 text-[9px] font-bold tracking-wider text-gray-400 uppercase dark:border-white/10 dark:text-zinc-500 dark:bg-muted"
                            >
                              NEW RECORD
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 px-6 text-right"></td>
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
                            "group transition-all duration-200 hover:bg-gray-50/80 dark:bg-card dark:hover:bg-white/5 select-none cursor-pointer",
                            c.status === "Archived" && "opacity-75",
                            isSelected && "bg-amber-50 dark:bg-amber-950/40",
                            isDisabled && "cursor-not-allowed"
                          )}
                        >
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon disabled:cursor-not-allowed disabled:opacity-20 dark:text-primary dark:border-white/10"
                              checked={isSelected}
                              onChange={(e) => {
                                // tr onClick handles it
                                e.stopPropagation();
                                toggleCourseSelected(c.id);
                              }}
                              disabled={isDisabled}
                            />
                          </td>
                          <td className="p-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-brand bg-gray-100 text-xs font-black text-gray-500 shadow-xs dark:bg-white/5 dark:text-zinc-500 group-hover:bg-white dark:group-hover:bg-zinc-800 group-hover:text-pup-maroon dark:group-hover:text-primary group-hover:shadow-sm transition-all uppercase">
                                {c.code.substring(0, 2)}
                              </div>
                              <span className="text-xs font-black tracking-tight text-gray-900 dark:text-zinc-50">
                                {c.code}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 px-6 font-medium text-gray-700 dark:text-zinc-200 text-xs">
                            {c.name}
                          </td>
                          <td className="p-4 px-6 text-left">
                            {c.status === "Archived" ? (
                              <Badge
                                variant="outline"
                                className="border-red-200 bg-red-50 px-2.5 py-1 text-[9px] font-black tracking-wider text-red-700 uppercase dark:border-red-500/20 dark:bg-red-500/10 dark:text-primary"
                              >
                                ARCHIVED
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-green-200 bg-green-50 px-2.5 py-1 text-[9px] font-black tracking-wider text-green-700 uppercase dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                              >
                                ACTIVE
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 px-6 text-right">
                            <div 
                              className="inline-flex items-center justify-end gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {!showArchived && (
                                <Button
                                  variant="outline"
                                  size="icon"
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
                                  className="h-9 w-9 rounded-brand border-gray-200 bg-white p-0 text-gray-400 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-pup-maroon dark:hover:text-red-500 dark:bg-white/5 dark:border-white/10 dark:text-zinc-500 dark:hover:text-primary dark:hover:bg-zinc-800"
                                >
                                  <i className="ph-bold ph-pencil-simple text-base"></i>
                                </Button>
                              )}

                            {c.status === "Archived" ? (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  setConfirmPayload({
                                    title: "Restore Degree Program",
                                    message:
                                      "Restore this degree program? This will allow new registrations for this program.",
                                    confirmLabel: "Restore",
                                    variant: "success",
                                    buttonIcon:
                                      "ph-bold ph-arrow-counter-clockwise",
                                    icon: "ph-duotone ph-arrow-counter-clockwise",
                                    selectedItems: [`${c.code} - ${c.name}`],
                                    onConfirm: () => resCourse(c.id, c.code),
                                  })
                                  setConfirmOpen(true)
                                }}
                                className="h-9 w-9 rounded-brand border-gray-200 bg-white p-0 text-emerald-600 shadow-sm transition-all hover:border-emerald-600 hover:bg-emerald-50 dark:bg-white/5 dark:border-white/10 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                              >
                                <i className="ph-bold ph-arrow-counter-clockwise text-base"></i>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  setConfirmPayload({
                                    title: "Archive Degree Program",
                                    message:
                                      "Archive this degree program? Existing records will remain, but no new registrations can use this program.",
                                    confirmLabel: "Archive",
                                    variant: "danger",
                                    buttonIcon: "ph-bold ph-archive",
                                    icon: "ph-duotone ph-archive",
                                    selectedItems: [`${c.code} - ${c.name}`],
                                    onConfirm: () => delCourse(c.id, c.code),
                                  })
                                  setConfirmOpen(true)
                                }}
                                className="h-9 w-9 rounded-brand border-gray-200 bg-white p-0 text-red-400 shadow-sm transition-all hover:border-red-600 hover:bg-red-50 dark:bg-white/5 dark:border-white/10 dark:text-red-400/90 dark:hover:bg-red-400/10"
                              >
                                <i className="ph-bold ph-archive text-base"></i>
                              </Button>
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
                                <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                                  <i className="ph-duotone ph-magnifying-glass text-5xl text-gray-300 dark:text-zinc-600"></i>
                                </EmptyMedia>
                              </div>
                              <EmptyTitle className="text-xl font-black text-gray-900 dark:text-zinc-50">
                                No degree programs found
                              </EmptyTitle>
                              <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                                {courseSearch
                                  ? `No results matching "${courseSearch}" in the current view.`
                                  : showArchived
                                    ? "There are no archived degree programs yet."
                                    : "Add Degree Program to start building your organizational hierarchy."}
                              </EmptyDescription>
                              {courseSearch ||
                              courses.some((c) =>
                                showArchived
                                  ? c.status === "Archived"
                                  : c.status !== "Archived"
                              ) ? (
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setCourseSearch("")
                                    setLocalSearch("")
                                  }}
                                  className="mt-4 flex h-9 items-center gap-2 rounded-brand border border-gray-300 bg-white px-4 text-xs font-bold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                                >
                                  <i className="ph-bold ph-arrow-counter-clockwise"></i>
                                  CLEAR SEARCH
                                </Button>
                              ) : (
                                !showArchived && (
                                  <Button
                                    onClick={() => setIsAddCourseOpen(true)}
                                    className="mt-4 flex h-10 items-center gap-2 rounded-brand btn-brand-red hover:from-red-700 hover:to-red-900 hover:shadow-md px-8 font-black tracking-widest text-white shadow-lg shadow-red-900/20 active:scale-95 transition-all dark:shadow-none"
                                  >
                                    <i className="ph-bold ph-plus text-lg"></i>
                                    ADD DEGREE PROGRAM
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
          </div>
        </CardContent>

        {filteredCoursesFull.length > 0 && (
          <div className="-mx-6 mt-0 -mb-6 flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 rounded-b-[2rem] dark:border-white/10 dark:bg-card">
            <div className="flex items-center gap-8 select-none cursor-default">
              <div className="flex items-center gap-6 text-[11px] font-black text-gray-400 uppercase tracking-widest dark:text-zinc-500">
                <span>
                  Showing <strong className="text-gray-900 dark:text-zinc-50">{filteredCourses.length}</strong> out of{" "}
                  <strong className="text-gray-900 dark:text-zinc-50">{filteredCoursesFull.length}</strong>{" "}
                  {showArchived ? "Archived" : "Active"} Programs
                </span>

                {filteredCoursesFull.length > 10 && (
                  <div className="flex items-center gap-3 border-l border-gray-200 pl-6 dark:border-white/10">
                    <span className="text-[10px] opacity-60">Rows:</span>
                    <Select
                      className="h-8 w-16 cursor-pointer rounded-brand border border-gray-300 bg-white px-2 text-[10px] font-bold text-gray-700 focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all hover:bg-gray-50 dark:bg-card dark:text-zinc-200 dark:hover:bg-white/10 dark:border-white/10"
                      value={itemsPerPage}
                      onChange={handleItemsPerPageChange}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {Math.ceil(filteredCoursesFull.length / itemsPerPage) > 1 && (
              <div className="flex shrink-0 items-center gap-2 select-none">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageCourse <= 1}
                  onClick={() => setPageCourse((p) => p - 1)}
                  className="h-10 rounded-brand border-gray-200 bg-white px-5 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-20 dark:border-white/10 dark:bg-card dark:text-zinc-400 dark:shadow-none"
                >
                  <i className="ph-bold ph-caret-left mr-2 text-base"></i> PREV
                </Button>
                
                <div className="flex h-10 min-w-[48px] items-center justify-center rounded-brand border border-gray-200 bg-gray-50 px-3 text-[11px] font-black text-gray-900 shadow-inner ring-1 ring-black/[0.02] dark:border-white/10 dark:bg-white/5 dark:text-zinc-50 dark:shadow-none">
                  {pageCourse}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageCourse >= Math.ceil(filteredCoursesFull.length / itemsPerPage)}
                  onClick={() => setPageCourse((p) => p + 1)}
                  className="h-10 rounded-brand border-gray-200 bg-white px-5 text-[10px] font-black tracking-widest text-gray-500 uppercase shadow-sm transition-all hover:border-pup-maroon hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-20 dark:border-white/10 dark:bg-card dark:text-zinc-400 dark:shadow-none"
                >
                  NEXT <i className="ph-bold ph-caret-right ml-2 text-base"></i>
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <FloatingActionBar
        selectedCount={selectedCount}
        selectionStatus="Selected Courses"
        onCancel={() => toggleAllCourses(false)}
        onAction={handleBulkAction}
        actionLabel={showArchived ? "RESTORE SELECTED" : "ARCHIVE SELECTED"}
        actionIcon={showArchived ? "ph-arrow-counter-clockwise" : "ph-archive"}
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
        <DialogContent className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-card">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-pup-maroon dark:text-primary shadow-sm dark:bg-red-950/30 dark:text-primary dark:shadow-none">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg leading-tight font-black tracking-tight text-gray-900 dark:text-zinc-50">
                  New Degree Program
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm leading-relaxed font-medium text-gray-600 dark:text-zinc-300">
                  Register a new academic track and its initial organizational
                  blocks.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={addCourse}>
            <div className="max-h-[60vh] space-y-6 overflow-y-auto p-6">
              <div className="space-y-6">
                <div>
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-700 uppercase dark:text-zinc-200">
                    Code <span className="text-pup-maroon dark:text-primary">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="BSIT"
                    className="h-11 rounded-brand border border-gray-300 bg-white text-sm font-black focus-visible:border-gray-300 focus-visible:ring-pup-maroon dark:bg-card dark:border-white/10"
                    value={newCourseCode}
                    onChange={(e) =>
                      setNewCourseCode(e.target.value.toUpperCase())
                    }
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-700 uppercase dark:text-zinc-200">
                    Program Designation{" "}
                    <span className="text-pup-maroon dark:text-primary">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Bachelor of Science in Information Technology"
                    className="h-11 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-gray-300 focus-visible:ring-pup-maroon dark:bg-card dark:border-white/10"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold tracking-wide text-gray-700 uppercase dark:text-zinc-200">
                    Initial Course Blocks
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewCourseBlocks([...newCourseBlocks, ""])}
                    className="h-7 rounded-md px-2 text-[10px] font-black text-pup-maroon dark:text-primary hover:bg-red-50 dark:text-primary dark:bg-red-950/30"
                  >
                    <i className="ph-bold ph-plus mr-1"></i> ADD BLOCK
                  </Button>
                </div>
                <div className="space-y-2">
                  {newCourseBlocks.map((block, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        type="text"
                        placeholder={`Block ${idx + 1} Name`}
                        className="h-10 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-gray-300 focus-visible:ring-pup-maroon dark:bg-card dark:border-white/10"
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
                          className="h-10 w-10 shrink-0 text-gray-400 hover:text-red-600 dark:text-zinc-500"
                        >
                          <i className="ph-bold ph-trash"></i>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-card">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddCourseOpen(false)
                  setNewCourseCode("")
                  setNewCourseName("")
                  setNewCourseBlocks([""])
                }}
                className="h-11 rounded-brand border border-gray-300 px-6 text-sm font-bold text-gray-600 uppercase shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:bg-red-950/30 dark:border-white/10"
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                className="flex h-11 items-center gap-2 rounded-brand btn-brand-red hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all px-6 font-black text-white shadow-sm dark:shadow-none"
              >
                <i className="ph-bold ph-check text-lg"></i>
                CREATE PROGRAM
              </Button>
            </div>
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
        <DialogContent className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-card">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-pup-maroon dark:text-primary shadow-sm dark:bg-red-950/30 dark:text-primary dark:shadow-none">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg leading-tight font-black tracking-tight text-gray-900 dark:text-zinc-50">
                  Update Program Details
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm leading-relaxed font-medium text-gray-600 dark:text-zinc-300">
                  Modify the designation or associated blocks for this program.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={updCourse}>
            <div className="max-h-[60vh] space-y-6 overflow-y-auto p-6">
              <div className="space-y-6">
                <div>
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-700 uppercase dark:text-zinc-200">
                    Code <span className="text-pup-maroon dark:text-primary">*</span>
                  </label>
                  <Input
                    type="text"
                    className="h-11 rounded-brand border border-gray-300 bg-white text-sm font-black focus-visible:border-gray-300 focus-visible:ring-pup-maroon dark:bg-card dark:border-white/10"
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
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-700 uppercase dark:text-zinc-200">
                    Program Designation{" "}
                    <span className="text-pup-maroon dark:text-primary">*</span>
                  </label>
                  <Input
                    type="text"
                    className="h-11 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-gray-300 focus-visible:ring-pup-maroon dark:bg-card dark:border-white/10"
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
                  <label className="text-xs font-bold tracking-wide text-gray-700 uppercase dark:text-zinc-200">
                    Manage Course Blocks
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setEditCourseBlocks([...editCourseBlocks, ""])
                    }
                    className="h-7 rounded-md px-2 text-[10px] font-black text-pup-maroon dark:text-primary hover:bg-red-50 dark:text-primary dark:bg-red-950/30"
                  >
                    <i className="ph-bold ph-plus mr-1"></i> ADD BLOCK
                  </Button>
                </div>
                <div className="space-y-2">
                  {editCourseBlocks.map((block, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        type="text"
                        placeholder={`Block ${idx + 1} Name`}
                        className="h-10 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-gray-300 focus-visible:ring-pup-maroon dark:bg-card dark:border-white/10"
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
                          className="h-10 w-10 shrink-0 text-gray-400 hover:text-red-600 dark:text-zinc-500"
                        >
                          <i className="ph-bold ph-archive"></i>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-card">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditCourseOpen(false)
                  setEditCourse({ id: null, code: "", name: "" })
                  setEditCourseBlocks([""])
                }}
                className="h-11 rounded-brand border border-gray-300 px-6 text-sm font-bold text-gray-600 uppercase shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:bg-red-950/30 dark:border-white/10"
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                className="flex h-11 items-center gap-2 rounded-brand btn-brand-red hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all px-6 font-black text-white shadow-sm dark:shadow-none"
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
