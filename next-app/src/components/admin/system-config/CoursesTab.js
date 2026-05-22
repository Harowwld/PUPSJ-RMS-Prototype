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
      return <i className="ph-bold ph-caret-up-down ml-1 opacity-30"></i>
    return sortCourse.direction === "asc" ? (
      <i className="ph-bold ph-caret-up ml-1 text-pup-maroon"></i>
    ) : (
      <i className="ph-bold ph-caret-down ml-1 text-pup-maroon"></i>
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
          icon="ph-books"
          title={
            <div className="flex items-center gap-2">
              Degree Programs
              {showArchived && (
                <Badge className="border-red-100 bg-red-50 text-[10px] font-black text-red-700">
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
                    onClick={handleExportCourses}
                    className="flex h-10 w-10 items-center justify-center rounded-brand border border-gray-300 bg-white p-0 text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95"
                  >
                    <i className="ph-bold ph-file-csv text-base"></i>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Export to CSV</TooltipContent>
              </Tooltip>

              <Button
                onClick={() => setIsAddCourseOpen(true)}
                disabled={showArchived}
                className="flex h-10 items-center gap-2 rounded-brand bg-linear-to-b from-red-800 to-pup-maroon border border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md px-5 font-bold text-white shadow-sm active:scale-95 disabled:opacity-50 transition-all"
              >
                <i className="ph-bold ph-plus"></i>
                <span className="hidden uppercase sm:inline">
                  Add Degree Program
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
                <div className="flex items-center gap-1 rounded-full border border-pup-maroon/20 bg-linear-to-br from-white to-pup-maroon/10 px-2.5 py-1 text-[10px] font-bold text-pup-maroon uppercase">
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
                <div className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600 uppercase">
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
                          filteredCourses.length > 0 &&
                          filteredCourses.every((c) => selectedCourses[c.id])
                        }
                        onChange={(e) => toggleAllCourses(e.target.checked)}
                        disabled={filteredCourses.length === 0}
                      />
                    </th>
                    <th className="w-48 p-3 px-6 font-bold">
                      <button
                        onClick={() => onSort("code")}
                        className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                      >
                        Code <SortIndicator column="code" />
                      </button>
                    </th>
                    <th className="p-3 px-6 font-bold">
                      <button
                        onClick={() => onSort("name")}
                        className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                      >
                        Designation <SortIndicator column="name" />
                      </button>
                    </th>
                    <th className="w-40 p-3 px-6 text-left font-bold text-gray-600 uppercase">
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
                      className={`transition-all duration-300 ${newCourseCode.trim() || newCourseName.trim() ? "bg-amber-50/50 hover:bg-amber-100/50" : "bg-gray-50/30 hover:bg-gray-50/50"}`}
                    >
                      <td className="p-3 px-6 text-center">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-dashed transition-colors ${newCourseCode.trim() || newCourseName.trim() ? "border-amber-400" : "border-gray-300"}`}
                        >
                          <i
                            className={`ph-bold text-[10px] ${newCourseCode.trim() || newCourseName.trim() ? "ph-pencil-simple animate-bounce text-amber-600" : "ph-plus text-gray-400"}`}
                          ></i>
                        </div>
                      </td>
                      <td className="p-3 px-6">
                        <Input
                          placeholder="CODE (e.g. BSIT)"
                          value={newCourseCode}
                          onChange={(e) =>
                            setNewCourseCode(e.target.value.toUpperCase())
                          }
                          className={`h-9 w-40 rounded-brand border-gray-300 bg-white text-xs font-black transition-all focus-visible:ring-pup-maroon ${newCourseCode.trim() || newCourseName.trim() ? "border-amber-400 ring-1 ring-amber-100" : "focus-visible:border-pup-maroon"}`}
                        />
                      </td>
                      <td className="p-3 px-6">
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
                            className={`h-9 flex-1 rounded-brand border-gray-300 bg-white text-sm transition-all focus-visible:ring-pup-maroon ${newCourseCode.trim() || newCourseName.trim() ? "border-amber-400 ring-2 ring-amber-100" : "focus-visible:border-pup-maroon"}`}
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
                            className={`h-9 rounded-brand px-4 text-xs font-bold text-white shadow-sm active:scale-95 disabled:opacity-50 ${newCourseCode.trim() || newCourseName.trim() ? "bg-amber-600 hover:bg-amber-700" : "bg-linear-to-b from-red-800 to-pup-maroon border border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md "} transition-all`}
                          >
                            {isQuickAddLoading ? (
                              <i className="ph-bold ph-spinner animate-spin"></i>
                            ) : (
                              <>
                                <i
                                  className={`ph-bold mr-2 ${newCourseCode.trim() || newCourseName.trim() ? "ph-check" : "ph-plus"}`}
                                ></i>
                                {newCourseCode.trim() || newCourseName.trim()
                                  ? "SAVE"
                                  : "ADD"}
                              </>
                            )}
                          </Button>{" "}
                        </div>
                      </td>
                      <td className="p-3 px-6">
                        {newCourseCode.trim() || newCourseName.trim() ? (
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
                  {filteredCourses.map((c) => (
                    <tr
                      key={c.id}
                      className={`group transition-colors hover:bg-gray-50 ${c.status === "Archived" ? "opacity-75" : ""} ${selectedCourses[c.id] ? (showArchived ? "bg-emerald-50/20" : "bg-red-50/20") : ""}`}
                    >
                      <td className="p-3 px-6 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-pup-maroon accent-pup-maroon focus:ring-pup-maroon disabled:cursor-not-allowed disabled:opacity-20"
                          checked={!!selectedCourses[c.id]}
                          onChange={() => toggleCourseSelected(c.id)}
                          disabled={
                            showArchived
                              ? c.status !== "Archived"
                              : c.status === "Archived"
                          }
                        />
                      </td>
                      <td className="p-3 px-6 font-black tracking-tight text-gray-900">
                        {c.code}
                      </td>
                      <td className="p-3 px-6 font-medium text-gray-700">
                        {c.name}
                      </td>
                      <td className="p-3 px-6 text-left">
                        {c.status === "Archived" ? (
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
                              className="flex h-8 items-center gap-1.5 rounded-brand border-gray-300 bg-white px-3 text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-30"
                            >
                              <i className="ph-bold ph-pencil-simple text-xs"></i>
                              EDIT
                            </Button>
                          )}

                          {c.status === "Archived" ? (
                            <Button
                              variant="outline"
                              size="sm"
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
                  {filteredCourses.length === 0 && (
                    <tr className="border-0 hover:bg-transparent">
                      <td colSpan={5} className="border-0 p-0">
                        <Empty className="flex h-[400px] flex-col items-center justify-center border-0 text-center text-gray-500">
                          <EmptyHeader className="flex flex-col items-center gap-0">
                            <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                              <i className="ph-duotone ph-books text-3xl text-pup-maroon"></i>
                            </EmptyMedia>
                            <EmptyTitle className="text-lg font-bold text-gray-900">
                              No degree programs found
                            </EmptyTitle>
                            <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
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
                                className="mt-4 flex h-9 items-center gap-2 rounded-brand border border-gray-300 bg-white px-4 text-xs font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95"
                              >
                                <i className="ph-bold ph-arrow-counter-clockwise"></i>
                                CLEAR SEARCH
                              </Button>
                            ) : (
                              !showArchived && (
                                <Button
                                  onClick={() => setIsAddCourseOpen(true)}
                                  className="mt-4 flex h-10 items-center gap-2 rounded-brand bg-linear-to-b from-red-800 to-pup-maroon border border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md px-8 font-black tracking-widest text-white shadow-lg shadow-red-900/20 active:scale-95 transition-all"
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

        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 p-4 px-6">
          <div className="flex items-center gap-6">
            {filteredCoursesFull.length > 0 && (
              <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                <span>
                  {(pageCourse - 1) * itemsPerPage + 1}-
                  {Math.min(
                    pageCourse * itemsPerPage,
                    filteredCoursesFull.length
                  )}{" "}
                  of{" "}
                  <strong className="text-gray-900">
                    {filteredCoursesFull.length.toLocaleString()}
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

          {filteredCoursesFull.length > 0 && (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pageCourse <= 1}
                onClick={() => setPageCourse((p) => p - 1)}
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
                    Math.ceil(filteredCoursesFull.length / itemsPerPage)
                  )}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  pageCourse >=
                  Math.ceil(filteredCoursesFull.length / itemsPerPage)
                }
                onClick={() => setPageCourse((p) => p + 1)}
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
        <DialogContent className="overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md">
          <DialogHeader className="border-b border-gray-100 bg-gray-50/50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg leading-tight font-black tracking-tight text-gray-900">
                  New Degree Program
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm leading-relaxed font-medium text-gray-600">
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
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-700 uppercase">
                    Code <span className="text-pup-maroon">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="BSIT"
                    className="h-11 rounded-brand border border-gray-300 bg-white text-sm font-black focus-visible:border-pup-maroon focus-visible:ring-pup-maroon"
                    value={newCourseCode}
                    onChange={(e) =>
                      setNewCourseCode(e.target.value.toUpperCase())
                    }
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-700 uppercase">
                    Program Designation{" "}
                    <span className="text-pup-maroon">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Bachelor of Science in Information Technology"
                    className="h-11 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-pup-maroon focus-visible:ring-pup-maroon"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold tracking-wide text-gray-700 uppercase">
                    Initial Course Blocks
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewCourseBlocks([...newCourseBlocks, ""])}
                    className="h-7 rounded-md px-2 text-[10px] font-black text-pup-maroon hover:bg-red-50"
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
                        className="h-10 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-pup-maroon focus-visible:ring-pup-maroon"
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
                          className="h-10 w-10 shrink-0 text-gray-400 hover:text-red-600"
                        >
                          <i className="ph-bold ph-trash"></i>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddCourseOpen(false)
                  setNewCourseCode("")
                  setNewCourseName("")
                  setNewCourseBlocks([""])
                }}
                className="h-11 rounded-brand border-gray-300 px-6 text-sm font-bold text-gray-600 uppercase shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon"
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                className="flex h-11 items-center gap-2 rounded-brand bg-linear-to-b from-red-800 to-pup-maroon border border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all px-6 font-bold text-white shadow-sm"
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
        <DialogContent className="overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md">
          <DialogHeader className="border-b border-gray-100 bg-gray-50/50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg leading-tight font-black tracking-tight text-gray-900">
                  Update Program Details
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm leading-relaxed font-medium text-gray-600">
                  Modify the designation or associated blocks for this program.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={updCourse}>
            <div className="max-h-[60vh] space-y-6 overflow-y-auto p-6">
              <div className="space-y-6">
                <div>
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-700 uppercase">
                    Code <span className="text-pup-maroon">*</span>
                  </label>
                  <Input
                    type="text"
                    className="h-11 rounded-brand border border-gray-300 bg-white text-sm font-black focus-visible:border-pup-maroon focus-visible:ring-pup-maroon"
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
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-700 uppercase">
                    Program Designation{" "}
                    <span className="text-pup-maroon">*</span>
                  </label>
                  <Input
                    type="text"
                    className="h-11 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-pup-maroon focus-visible:ring-pup-maroon"
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
                  <label className="text-xs font-bold tracking-wide text-gray-700 uppercase">
                    Manage Course Blocks
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setEditCourseBlocks([...editCourseBlocks, ""])
                    }
                    className="h-7 rounded-md px-2 text-[10px] font-black text-pup-maroon hover:bg-red-50"
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
                        className="h-10 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-pup-maroon focus-visible:ring-pup-maroon"
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
                          className="h-10 w-10 shrink-0 text-gray-400 hover:text-red-600"
                        >
                          <i className="ph-bold ph-archive"></i>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditCourseOpen(false)
                  setEditCourse({ id: null, code: "", name: "" })
                  setEditCourseBlocks([""])
                }}
                className="h-11 rounded-brand border-gray-300 px-6 text-sm font-bold text-gray-600 uppercase shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon"
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                className="flex h-11 items-center gap-2 rounded-brand bg-linear-to-b from-red-800 to-pup-maroon border border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all px-6 font-bold text-white shadow-sm"
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
