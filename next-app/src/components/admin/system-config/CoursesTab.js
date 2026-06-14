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
    if (sortCourse.key !== column) {
      return <i className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
    }
    return sortCourse.direction === "asc" ? (
      <i className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></i>
    ) : (
      <i className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></i>
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
      message: `Apply ${showArchived ? "restoration" : "archival"} to the following ${selectedCount} degree programs?`,
      confirmLabel: showArchived ? "Restore Selected" : "Archive Selected",
      variant: showArchived ? "success" : "danger",
      buttonIcon: showArchived ? "ph-bold ph-arrow-counter-clockwise" : "ph-bold ph-archive",
      icon: showArchived ? "ph-duotone ph-arrow-counter-clockwise" : "ph-duotone ph-archive",
      selectedItems: selectedNames,
      onConfirm: () => executeBulkTaxonomyAction("Course", showArchived ? "restore" : "delete"),
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
    <div className="font-inter flex w-full flex-col gap-6 animate-fade-up px-[28px] pb-[28px]">
      <div className="mt-[20px]">
        <PageHeader
          icon="ph-books"
          showBorder={false}
          titleClassName="text-[15px]"
          title={
            <div className="flex items-center gap-2">
              Degree Programs
              {showArchived && (
                <Badge className="border-red-100 bg-red-50 text-[10px] font-semibold text-red-700 dark:border-white/10 dark:bg-red-950/30 dark:text-red-400">
                  Restore Mode
                </Badge>
              )}
            </div>
          }
          description="Manage academic programs and their corresponding identifiers."
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
                  ? "border-[#ad2f2f] text-[#ad2f2f] font-semibold"
                  : "border-transparent text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 font-normal"
              }`}
            >
              <span className="whitespace-nowrap tracking-wide">
                Active ({courses.filter((c) => c.status !== "Archived").length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowArchived(true)}
              className={`flex items-center justify-center text-[13px] pb-[10px] -mb-[17px] border-b-2 border-t-0 border-x-0 rounded-none cursor-pointer bg-transparent focus:outline-none transition-colors ${
                showArchived
                  ? "border-[#ad2f2f] text-[#ad2f2f] font-semibold"
                  : "border-transparent text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 font-normal"
              }`}
            >
              <span className="whitespace-nowrap tracking-wide">
                Archived ({courses.filter((c) => c.status === "Archived").length})
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
                placeholder="Search code or program name..."
                className="h-[36px] w-full rounded-[8px] border-[0.5px] border-black/15 bg-white pl-9 pr-20 text-[13px] font-normal placeholder:text-[#8E8E93] dark:border-white/15 dark:bg-card focus-visible:ring-0 focus-visible:border-black/30"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                {filteredCoursesFull.length > 0 ? `${filteredCoursesFull.length} results` : "0 results"}
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleExportCourses}
              className="h-10 px-3 font-semibold text-sm text-gray-600 hover:text-[#111] hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center gap-2 rounded-brand shadow-none border-0"
            >
              Export
            </Button>

            <Button
              onClick={() => setIsAddCourseOpen(true)}
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
          <div className="flex-none border-b border-gray-100 bg-white px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300 dark:border-white/10 dark:bg-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-500">Active filters:</span>
              {localSearch && (
                <div className="flex items-center gap-1 rounded-full border border-gray-300 bg-pup-maroon/10 px-2.5 py-1 text-[10px] font-semibold text-pup-maroon dark:text-primary dark:border-white/10 dark:text-primary">
                  Search: {localSearch}
                  <button
                    onClick={() => { setLocalSearch(""); setCourseSearch(""); setPageCourse(1); }}
                    className="ml-1 hover:text-pup-darkMaroon transition-colors"
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
                  setPageCourse(1)
                }}
                className="h-6 rounded-full border-2 border-dashed border-gray-300 px-3 text-[10px] font-semibold text-pup-maroon dark:text-primary transition-colors hover:border-pup-darkMaroon hover:bg-red-50 hover:text-pup-maroon dark:border-white/10 dark:text-primary dark:bg-red-950/30"
              >
                CLEAR ALL FILTERS
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
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortCourse.key === "code" ? "text-pup-maroon dark:text-red-500" : "text-gray-400 dark:text-zinc-500 hover:text-pup-maroon dark:hover:text-red-500"
                          )}
                        >
                          Code <SortIndicator column="code" />
                        </button>
                      </th>
                      <th className="p-4 px-6">
                        <button
                          onClick={() => onSort("name")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortCourse.key === "name" ? "text-pup-maroon dark:text-red-500" : "text-gray-400 dark:text-zinc-500 hover:text-pup-maroon dark:hover:text-red-500"
                          )}
                        >
                          Designation <SortIndicator column="name" />
                        </button>
                      </th>
                      <th className="w-40 p-4 px-6 text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">Status</th>
                      <th className="w-32 p-4 px-6 text-right text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                    {!showArchived && (
                      <tr
                        className={cn(
                          "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-200 hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                          (newCourseCode.trim() || newCourseName.trim()) && "bg-amber-50/50 dark:bg-amber-950/10"
                        )}
                      >
                        <td className="py-0 px-4 align-middle text-center">
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
                        <td className="py-0 px-6 align-middle">
                          <Input
                            placeholder="CODE (e.g. BSIT)"
                            value={newCourseCode}
                            onChange={(e) =>
                              setNewCourseCode(e.target.value.toUpperCase())
                            }
                            className={cn(
                              "h-9 w-40 rounded-brand border border-gray-300 bg-white text-xs font-semibold transition-all focus-visible:ring-pup-maroon",
                              newCourseCode.trim() || newCourseName.trim() ? "ring-1 ring-amber-100" : "focus-visible:border-gray-300 dark:border-white/10 dark:bg-card"
                            )}
                          />
                        </td>
                        <td className="py-0 px-6 align-middle">
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
                          {newCourseCode.trim() || newCourseName.trim() ? (
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
                            "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-200 hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                            c.status === "Archived" && "opacity-75",
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
                                toggleCourseSelected(c.id);
                              }}
                              disabled={isDisabled}
                            />
                          </td>
                          <td className="py-0 px-6 align-middle">
                            <span className="text-[13px] font-medium tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                              {c.code}
                            </span>
                          </td>
                          <td className="py-0 px-6 align-middle max-w-[400px]">
                            <div className="truncate text-[13px] font-medium tracking-[-0.01em] text-gray-900 dark:text-zinc-50" title={c.name}>
                              {c.name}
                            </div>
                          </td>
                          <td className="py-0 px-6 align-middle text-left">
                            {c.status === "Archived" ? (
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
                              className="inline-flex items-center justify-end gap-[12px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {!showArchived && (
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
                                  className="p-0 border-0 bg-transparent text-[#C7C7CC] dark:text-zinc-600 transition-colors hover:text-pup-maroon dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                                >
                                  <i className="ph-bold ph-pencil-simple text-[16px]"></i>
                                </button>
                              )}

                            {c.status === "Archived" ? (
                              <button
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
                                className="p-0 border-0 bg-transparent text-[#C7C7CC] dark:text-zinc-600 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                              >
                                <i className="ph-bold ph-arrow-counter-clockwise text-[16px]"></i>
                              </button>
                            ) : (
                              <button
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
                                className="p-0 border-0 bg-transparent text-[#C7C7CC] dark:text-zinc-600 transition-colors hover:text-red-600 dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                              >
                                <i className="ph-bold ph-archive text-[16px]"></i>
                              </button>
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
                                  <i className={showArchived && totalInView === 0 ? "ph-archive" : "ph-magnifying-glass"}></i>
                                </EmptyMedia>
                              </div>
                              <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                                {totalInView > 0 ? "No matches found" : (showArchived ? "No archive found" : "No activity found")}
                              </EmptyTitle>
                              <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
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
                                  className="mt-4 flex h-9 items-center gap-2 rounded-brand border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                                >
                                  <i className="ph-bold ph-arrow-counter-clockwise"></i>
                                  CLEAR SEARCH
                                </Button>
                              ) : (
                                !showArchived && (
                                  <Button
                                    onClick={() => setIsAddCourseOpen(true)}
                                    className="mt-4 flex h-10 items-center gap-2 rounded-brand btn-brand-red hover:from-red-700 hover:to-red-900 hover:shadow-md px-8 font-semibold tracking-widest text-white shadow-lg shadow-red-900/20 active:scale-95 transition-all dark:shadow-none"
                                  >
                                    <i className="ph-bold ph-plus text-lg"></i>
                                    ADD
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
          <div className="flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 dark:border-white/10 dark:bg-card">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-6 text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                <span>
                  Showing {filteredCourses.length} of {filteredCoursesFull.length}
                </span>
                <div className="flex items-center gap-3 border-l border-gray-200 pl-6 dark:border-white/10">
                  <span className="text-[12px] text-gray-400 dark:text-zinc-500">Rows:</span>
                  <select
                    className="h-8 w-16 cursor-pointer rounded-[6px] border border-gray-200 bg-white px-2 text-[12px] font-normal text-gray-700 focus:outline-none transition-all hover:bg-gray-50 dark:border-white/10 dark:bg-card dark:text-zinc-200 dark:hover:bg-white/10"
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <button
                disabled={pageCourse <= 1}
                onClick={() => setPageCourse((p) => Math.max(1, p - 1))}
                className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
              >
                Prev
              </button>

              <div className="flex h-8 min-w-[32px] items-center justify-center rounded-[6px] border border-gray-200/80 bg-white px-2.5 text-[12px] font-medium text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-100">
                {pageCourse}
              </div>

              <button
                disabled={pageCourse >= Math.ceil(filteredCoursesFull.length / itemsPerPage)}
                onClick={() => setPageCourse((p) => p + 1)}
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
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-pup-maroon shadow-sm dark:bg-red-950/30 dark:border-white/10">
                <i className="ph-duotone ph-pencil-line text-xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
                  New Degree Program
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm font-medium text-gray-600 dark:text-zinc-300">
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
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-700 dark:text-zinc-200">
                    Code <span className="text-pup-maroon dark:text-primary">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="BSIT"
                    className="h-11 rounded-brand border border-gray-300 bg-white text-sm font-semibold focus-visible:border-gray-300 focus-visible:ring-pup-maroon dark:bg-card dark:border-white/10"
                    value={newCourseCode}
                    onChange={(e) =>
                      setNewCourseCode(e.target.value.toUpperCase())
                    }
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-700 dark:text-zinc-200">
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
                  <label className="text-xs font-semibold tracking-wide text-gray-700 dark:text-zinc-200">
                    Initial Course Blocks
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewCourseBlocks([...newCourseBlocks, ""])}
                    className="h-7 rounded-md px-2 text-[10px] font-semibold text-pup-maroon dark:text-primary hover:bg-red-50 dark:text-primary dark:bg-red-950/30"
                  >
                    <i className="ph-bold ph-plus mr-1"></i> ADD BLOCK
                  </Button>
                </div>
                <div className="space-y-2">
                  {newCourseBlocks.map((block, idx) => (
                    <div key={idx} className="flex min-w-0 gap-2">
                      <Input
                        type="text"
                        placeholder={`Block ${idx + 1} Name`}
                        className="h-10 flex-1 min-w-0 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-gray-300 focus-visible:ring-pup-maroon dark:bg-card dark:border-white/10"
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
                variant="ghost"
                onClick={() => {
                  setIsAddCourseOpen(false)
                  setNewCourseCode("")
                  setNewCourseName("")
                  setNewCourseBlocks([""])
                }}
                className="h-11 rounded-brand px-6 text-sm font-semibold text-gray-500 hover:bg-transparent hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors"
              >Cancel</Button>
              <Button
                type="submit"
                className="flex h-11 items-center gap-2 rounded-brand btn-brand-red hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all px-6 font-semibold text-white shadow-sm dark:shadow-none"
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
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-pup-maroon shadow-sm dark:bg-red-950/30 dark:border-white/10">
                <i className="ph-duotone ph-pencil-line text-xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
                  Update Program Details
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm font-medium text-gray-600 dark:text-zinc-300">
                  Modify the designation or associated blocks for this program.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={updCourse}>
            <div className="max-h-[60vh] space-y-6 overflow-y-auto p-6">
              <div className="space-y-6">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-700 dark:text-zinc-200">
                    Code <span className="text-pup-maroon dark:text-primary">*</span>
                  </label>
                  <Input
                    type="text"
                    className="h-11 rounded-brand border border-gray-300 bg-white text-sm font-semibold focus-visible:border-gray-300 focus-visible:ring-pup-maroon dark:bg-card dark:border-white/10"
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
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-700 dark:text-zinc-200">
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
                  <label className="text-xs font-semibold tracking-wide text-gray-700 dark:text-zinc-200">
                    Manage Course Blocks
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setEditCourseBlocks([...editCourseBlocks, ""])
                    }
                    className="h-7 rounded-md px-2 text-[10px] font-semibold text-pup-maroon dark:text-primary hover:bg-red-50 dark:text-primary dark:bg-red-950/30"
                  >
                    <i className="ph-bold ph-plus mr-1"></i> ADD BLOCK
                  </Button>
                </div>
                <div className="space-y-2">
                  {editCourseBlocks.map((block, idx) => (
                    <div key={idx} className="flex min-w-0 gap-2">
                      <Input
                        type="text"
                        placeholder={`Block ${idx + 1} Name`}
                        className="h-10 flex-1 min-w-0 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-gray-300 focus-visible:ring-pup-maroon dark:bg-card dark:border-white/10"
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
                variant="ghost"
                onClick={() => {
                  setIsEditCourseOpen(false)
                  setEditCourse({ id: null, code: "", name: "" })
                  setEditCourseBlocks([""])
                }}
                className="h-11 rounded-brand px-6 text-sm font-semibold text-gray-500 hover:bg-transparent hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors"
              >Cancel</Button>
              <Button
                type="submit"
                className="flex h-11 items-center gap-2 rounded-brand btn-brand-red hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all px-6 font-semibold text-white shadow-sm dark:shadow-none"
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
