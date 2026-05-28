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
import { cn } from "@/lib/utils"
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
  handleExportSections: handleExportProp,
}) {
  const [localSearch, setLocalSearch] = useState(sectionSearch)
  const [jumpPage, setJumpPage] = useState(String(pageSection))

  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false)
  const [newSectionName, setNewSectionName] = useState("")
  const [secCourseCode, setSecCourseCode] = useState("")
  const [isEditSectionOpen, setIsEditSectionOpen] = useState(false)
  const [editSection, setEditSection] = useState({ id: null, name: "", courseCode: "" })

  const [isQuickAddLoading, setIsQuickAddLoading] = useState(false)

  async function addSection(e, overrideData = null) {
    if (e) e.preventDefault()
    const name = overrideData ? overrideData.name : newSectionName.trim()
    const courseCode = overrideData ? overrideData.courseCode : secCourseCode.trim()
    if (!name || !courseCode) return

    if (overrideData) setIsQuickAddLoading(true)

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
      
      if (!overrideData) {
        setNewSectionName("")
        setSecCourseCode("")
        setIsAddSectionOpen(false)
      } else {
        setNewSectionName("")
      }

      showToast({ title: "Course Block Created", description: "The new course block has been successfully registered in the system." })
      if (loadAll) loadAll()
    } catch (err) {
      showToast({ title: "Registration Failed", description: err.message }, true)
    } finally {
      if (overrideData) setIsQuickAddLoading(false)
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
      showToast({ title: "Update Failed", description: err.message }, true)
    }
  }

  async function delSection(id, name, courseCode) {
    try {
      const res = await fetch(`/api/sections?id=${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Archive failed")
      setConfirmOpen(false)
      showToast({ title: "Course Block Archived", description: "The selected course block has been successfully moved to the archive." })
      if (loadAll) loadAll()
    } catch (err) {
      showToast({ title: "Archival Failed", description: err.message }, true)
    }
  }

  async function resSection(id, name, courseCode) {
    try {
      const res = await fetch(`/api/sections?id=${id}&restore=true`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Restore failed")
      setConfirmOpen(false)
      showToast({ title: "Course Block Restored", description: "The course block has been successfully restored from the archive." })
      if (loadAll) loadAll()
    } catch (err) {
      showToast({ title: "Restoration Failed", description: err.message }, true)
    }
  }


  useEffect(() => {
    setJumpPage(String(pageSection))
  }, [pageSection])

  useEffect(() => {
    const handler = setTimeout(() => {
      setSectionSearch(localSearch)
    }, 300)
    return () => clearTimeout(handler)
  }, [localSearch, setSectionSearch])

  useEffect(() => {
    if (sectionSearch === "") setLocalSearch("")
  }, [sectionSearch])

  const handleItemsPerPageChange = (e) => {
    const value = Number(e.target.value)
    setItemsPerPage(value)
    setPageSection(1)
  }

  const handleJumpPage = (e) => {
    if (e.key === "Enter" || e.type === "blur") {
      const val = parseInt(jumpPage)
      const totalPages = Math.ceil(filteredSectionsFull.length / itemsPerPage)
      if (!isNaN(val) && val >= 1 && val <= totalPages) {
        setPageSection(val)
      } else {
        setJumpPage(String(pageSection))
      }
    }
  }

  const SortIndicator = ({ column }) => {
    if (sortSection.key !== column)
      return <i className="ph-bold ph-caret-up-down ml-1 opacity-40 text-[10px]"></i>
    return sortSection.direction === "asc" ? (
      <i className="ph-bold ph-caret-up ml-1 text-pup-maroon dark:text-primary text-[10px] dark:text-primary"></i>
    ) : (
      <i className="ph-bold ph-caret-down ml-1 text-pup-maroon dark:text-primary text-[10px] dark:text-primary"></i>
    )
  }

  const handleExportSections = handleExportProp || (() => {
    const csvContent = [
      ["Course", "Block Name", "Status"],
      ...sections.map((s) => [s.course_code, s.name, s.status]),
    ]
      .map((e) => e.join(","))
      .join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `course_blocks_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    if (showToast) {
      showToast({
        title: "Export Success",
        description: "Course blocks configuration has been successfully exported to CSV.",
      })
    }
  })

  const selectedCount = Object.values(selectedSections).filter(Boolean).length
  const selectedNames = filteredSections
    .filter((s) => selectedSections[s.id])
    .map((s) => `${s.course_code ? s.course_code + ' - ' : ''}${s.name}`)

  const handleBulkAction = () => {
    setConfirmPayload({
      title: showArchived ? "Restore Selected Blocks" : "Archive Selected Blocks",
      message: `Apply ${showArchived ? "restoration" : "archival"} to the following ${selectedCount} section blocks?`,
      confirmLabel: showArchived ? "Restore Selected" : "Archive Selected",
      variant: showArchived ? "success" : "danger",
      buttonIcon: showArchived ? "ph-bold ph-arrow-counter-clockwise" : "ph-bold ph-archive",
      icon: showArchived ? "ph-duotone ph-arrow-counter-clockwise" : "ph-duotone ph-archive",
      selectedItems: selectedNames,
      onConfirm: () => executeBulkTaxonomyAction("Section", showArchived ? "restore" : "delete"),
    })
    setConfirmOpen(true)
  }

  const programFilter = (
    <div className="flex w-full flex-col gap-1.5 sm:w-64">
      <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
        Filter by Program
      </label>
      <Select
        className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 shadow-sm focus:border-gray-300 focus:ring-pup-maroon dark:bg-card dark:text-zinc-200 dark:shadow-none dark:focus:border-zinc-700 dark:border-white/10"
        value={selectedCourseFilter}
        onChange={(e) => setSelectedCourseFilter(e.target.value)}
      >
        <option value="">All</option>
        {courses.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} - {c.name}
          </option>
        ))}
      </Select>
    </div>
  )

  if (loading && sections.length === 0) {
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
      <Card className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-list-numbers"
          title={
            <div className="flex items-center gap-2">
              Course Blocks
              {showArchived && (
                <Badge className="border-red-100 bg-red-50 text-[10px] font-black text-red-700 dark:border-white/10 dark:bg-red-950/30 dark:text-red-400">
                  RESTORE MODE
                </Badge>
              )}
            </div>
          }
          description="Manage academic cohorts, sections, and organizational blocks."
          searchPlaceholder="Filter block name..."
          searchLabel="Search Course Blocks"
          searchValue={localSearch}
          onSearchChange={setLocalSearch}
          filters={
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {programFilter}
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
                onClick={handleExportSections}
                className="flex h-10 w-32 items-center justify-center gap-1.5 rounded-brand border border-gray-300 bg-white text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:border-white/10"
              >
                <i className="ph-bold ph-file-csv text-base"></i>
                EXPORT
              </Button>
              <Button
                onClick={() => setIsAddSectionOpen(true)}
                disabled={showArchived}
                className="flex h-10 items-center gap-2 rounded-brand btn-brand-red hover:from-red-700 hover:to-red-900 hover:shadow-md px-5 font-bold text-white shadow-sm active:scale-95 disabled:opacity-50 transition-all dark:shadow-none"
              >
                <i className="ph-bold ph-plus"></i>
                <span className="hidden sm:inline uppercase text-[10px] font-black tracking-widest">Add Course Block</span>
              </Button>
            </div>
          }
        />

        {/* Active Filter Chips Row */}
        {(localSearch !== "" || showArchived || selectedCourseFilter) && (
          <div className="flex-none border-b border-gray-100 bg-white px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300 dark:border-white/10 dark:bg-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase dark:text-zinc-500">Active Filters:</span>
              {localSearch && (
                <div className="flex items-center gap-1 rounded-full border border-gray-300 bg-pup-maroon/10 px-2.5 py-1 text-[10px] font-bold text-pup-maroon dark:text-primary uppercase dark:border-white/10 dark:text-primary">
                  Search: {localSearch}
                  <button
                    onClick={() => { setLocalSearch(""); setSectionSearch(""); setPageSection(1); }}
                    className="ml-1 hover:text-pup-darkMaroon transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
                  </button>
                </div>
              )}
              {selectedCourseFilter && (
                <div className="flex items-center gap-1 rounded-full border border-blue-100/30 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 uppercase dark:bg-blue-950/30 dark:text-blue-400">
                  Program: {selectedCourseFilter}
                  <button
                    onClick={() => { setSelectedCourseFilter(""); setPageSection(1); }}
                    className="ml-1 hover:text-blue-800 transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
                  </button>
                </div>
              )}
              {showArchived && (
                <div className="flex items-center gap-1 rounded-full border border-amber-100/30 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600 uppercase dark:bg-amber-950/30 dark:text-amber-400">
                  Mode: Archived Records
                  <button
                    onClick={() => { setShowArchived(false); setPageSection(1); }}
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
                  setSectionSearch("")
                  setSelectedCourseFilter("")
                  setShowArchived(false)
                  setPageSection(1)
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

            <div className="relative z-10 flex-1 overflow-x-auto overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm select-none dark:border-white/10 dark:bg-card">
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
                            filteredSections.length > 0 &&
                            filteredSections.every((s) => selectedSections[s.id])
                          }
                          onChange={(e) => toggleAllSections(e.target.checked)}
                          disabled={filteredSections.length === 0}
                        />
                      </th>
                      <th className="w-56 p-4 px-6">
                        <button
                          onClick={() => onSort("course_code")}
                          className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none"
                        >
                          DEGREE PROGRAM <SortIndicator column="course_code" />
                        </button>
                      </th>
                      <th className="p-4 px-6">
                        <button
                          onClick={() => onSort("name")}
                          className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none"
                        >
                          BLOCK NAME <SortIndicator column="name" />
                        </button>
                      </th>
                      <th className="w-40 p-4 px-6">STATUS</th>
                      <th className="w-32 p-4 px-6 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                    {!showArchived && (
                      <tr className={cn(
                        "transition-all duration-300",
                        (secCourseCode || newSectionName.trim()) 
                          ? "bg-amber-50/50 dark:bg-amber-950/10" 
                          : "bg-gray-50/30 hover:bg-gray-50 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"
                      )}>
                        <td className="p-4 text-center">
                          <div className={cn(
                            "flex h-5 w-5 mx-auto items-center justify-center rounded-full border-2 border-dashed transition-colors",
                            (secCourseCode || newSectionName.trim()) ? "border-orange-400 dark:border-orange-500/50" : "border-gray-300 dark:border-white/10"
                          )}>
                            <i className={cn(
                              "ph-bold text-[10px]",
                              (secCourseCode || newSectionName.trim()) ? "ph-pencil-simple text-orange-600 animate-bounce dark:text-orange-400" : "ph-plus text-gray-400 dark:text-zinc-500"
                            )}></i>
                          </div>
                        </td>
                        <td className="p-4 px-6">
                          <Select
                            className={cn(
                              "h-9 w-full rounded-brand border border-gray-300 bg-white px-3 text-[10px] font-black uppercase text-gray-700 transition-all focus:border-gray-300 focus:ring-pup-maroon",
                              secCourseCode ? "ring-1 ring-amber-100" : "dark:border-white/10 dark:bg-card dark:text-zinc-200 dark:focus:border-zinc-700"
                            )}
                            value={secCourseCode}
                            onChange={(e) => setSecCourseCode(e.target.value)}
                          >
                            <option value="">Select Program...</option>
                            {courses.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.code}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="p-4 px-6">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Quick add block name (e.g. Block 1)..."
                              value={newSectionName}
                              onChange={(e) => setNewSectionName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                   e.preventDefault();
                                   addSection(null, { courseCode: secCourseCode, name: newSectionName });
                                }
                              }}
                              className={cn(
                                "h-9 flex-1 rounded-brand border border-gray-300 bg-white text-sm transition-all focus-visible:ring-pup-maroon",
                                (secCourseCode || newSectionName.trim()) ? "ring-2 ring-amber-100" : "focus-visible:border-gray-300 dark:border-white/10 dark:bg-card"
                              )}
                            />
                            <Button
                              size="sm"
                              disabled={!secCourseCode || !newSectionName.trim() || isQuickAddLoading}
                              onClick={() => addSection(null, { courseCode: secCourseCode, name: newSectionName })}
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
                          {(secCourseCode || newSectionName.trim()) ? (
                            <Badge
                              variant="outline"
                              className="border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-black tracking-wider text-amber-700 uppercase animate-pulse dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-500/50"
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
                    {filteredSections.map((sec) => {
                      const isDisabled = showArchived
                        ? sec.status !== "Archived"
                        : sec.status === "Archived";
                      const isSelected = !!selectedSections[sec.id];
                      
                      return (
                        <tr
                          key={sec.id}
                          onClick={(e) => {
                            if (!isDisabled) toggleSectionSelected(sec.id, e);
                          }}
                          className={cn(
                            "group transition-all duration-200 hover:bg-gray-50/80 dark:bg-card dark:hover:bg-white/5 select-none cursor-pointer",
                            sec.status === "Archived" && "opacity-75",
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
                                toggleSectionSelected(sec.id);
                              }}
                              disabled={isDisabled}
                            />
                          </td>
                          <td className="p-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs font-black text-gray-500 shadow-xs dark:bg-white/5 dark:text-zinc-500 group-hover:bg-white dark:group-hover:bg-zinc-800 group-hover:text-pup-maroon dark:group-hover:text-primary group-hover:shadow-sm transition-all uppercase">
                                {sec.course_code?.substring(0, 2) || "U"}
                              </div>
                              <span className="text-xs font-black tracking-tight text-gray-900 dark:text-zinc-50">
                                {sec.course_code || "—"}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 px-6 font-medium text-gray-700 dark:text-zinc-200 text-xs">
                            {sec.name}
                          </td>
                          <td className="p-4 px-6">
                            {sec.status === "Archived" ? (
                              <Badge
                                variant="outline"
                                className="border-red-200 bg-red-50 px-2.5 py-1 text-[9px] font-bold tracking-wider text-red-700 uppercase dark:border-red-500/20 dark:bg-red-500/10 dark:text-primary"
                              >
                                ARCHIVED
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-green-200 bg-green-50 px-2.5 py-1 text-[9px] font-bold tracking-wider text-green-700 uppercase dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
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
                                  disabled={sec.status === "Archived"}
                                  onClick={() => {
                                    setEditSection({
                                      id: sec.id,
                                      name: sec.name,
                                      courseCode: sec.course_code || "",
                                    })
                                    setIsEditSectionOpen(true)
                                  }}
                                  className="h-9 w-9 rounded-xl border-gray-200 bg-white p-0 text-gray-400 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-pup-maroon dark:hover:text-red-500 dark:bg-white/5 dark:border-white/10 dark:text-zinc-500 dark:hover:text-primary dark:hover:bg-zinc-800"
                                >
                                  <i className="ph-bold ph-pencil-simple text-base"></i>
                                </Button>
                              )}

                            {sec.status === "Archived" ? (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  setConfirmPayload({
                                    title: "Restore Course Block",
                                    message: `Restore this course block? It will be associated with ${sec.course_code || "its original program"} again.`,
                                    confirmLabel: "Restore",
                                    variant: "success",
                                    buttonIcon: "ph-bold ph-arrow-counter-clockwise",
                                    icon: "ph-duotone ph-arrow-counter-clockwise",
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
                                className="h-9 w-9 rounded-xl border-gray-200 bg-white p-0 text-emerald-600 shadow-sm transition-all hover:border-emerald-600 hover:bg-emerald-50 dark:bg-white/5 dark:border-white/10 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                              >
                                <i className="ph-bold ph-arrow-counter-clockwise text-base"></i>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  setConfirmPayload({
                                    title: "Archive Course Block",
                                    message: "Archive this course block? This will prevent new records from being assigned to this block.",
                                    confirmLabel: "Archive",
                                    variant: "danger",
                                    buttonIcon: "ph-bold ph-archive",
                                    icon: "ph-duotone ph-archive",
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
                                className="h-9 w-9 rounded-xl border-gray-200 bg-white p-0 text-red-400 shadow-sm transition-all hover:border-red-600 hover:bg-red-50 dark:bg-white/5 dark:border-white/10 dark:text-red-400/90 dark:hover:bg-red-400/10"
                              >
                                <i className="ph-bold ph-archive text-base"></i>
                              </Button>
                            )}
                          </div>
                          </td>
                        </tr>
                      )})}
                      {filteredSections.length === 0 && (
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
                                  No course blocks found
                                </EmptyTitle>
                                <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                                  {sectionSearch
                                    ? `No results matching "${sectionSearch}" for ${selectedCourseFilter || "all"}.`
                                    : showArchived
                                      ? "There are no archived course blocks yet."
                                      : "Add Course Block to organize students within degree programs."}
                                </EmptyDescription>
                                {sectionSearch || sections.some(sec => showArchived ? sec.status === 'Archived' : sec.status !== 'Archived') ? (
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSectionSearch("")
                                      setLocalSearch("")
                                    }}
                                    className="mt-4 flex h-9 items-center gap-2 rounded-brand border border-gray-300 bg-white px-4 text-xs font-bold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                                  >
                                    <i className="ph-bold ph-arrow-counter-clockwise"></i>
                                    CLEAR SEARCH
                                  </Button>
                                ) : !showArchived && (
                                  <Button
                                    onClick={() => setIsAddSectionOpen(true)}
                                    className="mt-4 flex h-10 items-center gap-2 rounded-brand btn-brand-red hover:from-red-700 hover:to-red-900 hover:shadow-md px-8 font-black tracking-widest text-white shadow-lg shadow-red-900/20 active:scale-95 transition-all dark:shadow-none"
                                  >
                                    <i className="ph-bold ph-plus text-lg"></i>
                                    ADD COURSE BLOCK
                                  </Button>
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

        {filteredSectionsFull.length > 0 && (
          <div className="-mx-6 mt-0 -mb-6 flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 rounded-b-2xl dark:border-white/10 dark:bg-card">
            <div className="flex items-center gap-8 select-none cursor-default">
              <div className="flex items-center gap-6 text-[11px] font-black text-gray-400 uppercase tracking-widest dark:text-zinc-500">
                <span>
                  Showing <strong className="text-gray-900 dark:text-zinc-50">{filteredSections.length}</strong> out of{" "}
                  <strong className="text-gray-900 dark:text-zinc-50">{filteredSectionsFull.length}</strong>{" "}
                  {showArchived ? "Archived" : "Active"} Blocks
                </span>

                {filteredSectionsFull.length > 10 && (
                  <div className="flex items-center gap-3 border-l border-gray-200 pl-6 dark:border-white/10">
                    <span className="text-[10px] opacity-60">Rows:</span>
                    <Select
                      className="h-8 w-16 cursor-pointer rounded-brand border border-gray-300 bg-white px-2 text-[10px] font-black text-gray-700 focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all hover:bg-gray-50 dark:bg-card dark:text-zinc-200 dark:hover:bg-white/10 dark:border-white/10"
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

            {Math.ceil(filteredSectionsFull.length / itemsPerPage) > 1 && (
              <div className="flex shrink-0 items-center gap-2 select-none">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageSection <= 1}
                  onClick={() => setPageSection((p) => p - 1)}
                  className="h-10 rounded-xl border-gray-200 bg-white px-5 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-all hover:border-pup-maroon hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                >
                  <i className="ph-bold ph-caret-left mr-2 text-base"></i> PREV
                </Button>
                
                <div className="flex h-10 min-w-[48px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-[11px] font-black text-gray-900 shadow-inner ring-1 ring-black/[0.02] dark:border-white/10 dark:bg-white/5 dark:text-zinc-50 dark:shadow-none">
                  {pageSection}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageSection >= Math.ceil(filteredSectionsFull.length / itemsPerPage)}
                  onClick={() => setPageSection((p) => p + 1)}
                  className="h-10 rounded-xl border-gray-200 bg-white px-5 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-all hover:border-pup-maroon hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
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
        selectionStatus="Selected Sections"
        onCancel={() => toggleAllSections(false)}
        onAction={handleBulkAction}
        actionLabel={showArchived ? "RESTORE SELECTED" : "ARCHIVE SELECTED"}
        actionIcon={showArchived ? "ph-arrow-counter-clockwise" : "ph-archive"}
        actionVariant={showArchived ? "success" : "danger"}
      />

      <Dialog
        open={isAddSectionOpen}
        onOpenChange={(open) => {
          setIsAddSectionOpen(open)
          if (!open) {
            setNewSectionName("")
            setSecCourseCode("")
          }
        }}
      >
        <DialogContent className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-card">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-pup-maroon dark:text-primary shadow-sm dark:bg-red-950/30 dark:text-primary dark:shadow-none">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg leading-tight font-black tracking-tight text-gray-900 dark:text-zinc-50">
                  New Course Block
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm leading-relaxed font-medium text-gray-600 dark:text-zinc-300">
                  Create a new organizational section for degree program
                  management.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={addSection}>
            <div className="p-6 space-y-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-700 uppercase dark:text-zinc-200">
                  Degree Program <span className="text-pup-maroon dark:text-primary">*</span>
                </label>
                <Select
                  className="h-11 w-full rounded-brand border border-gray-300 bg-white px-3 text-sm font-bold text-gray-700 shadow-sm focus:border-gray-300 focus:ring-pup-maroon dark:bg-card dark:text-zinc-200 dark:shadow-none dark:focus:border-zinc-700 dark:border-white/10"
                  value={secCourseCode}
                  onChange={(e) => setSecCourseCode(e.target.value)}
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
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-700 uppercase dark:text-zinc-200">
                  Block Name <span className="text-pup-maroon dark:text-primary">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Section 1"
                  className="h-11 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-gray-300 focus-visible:ring-pup-maroon dark:bg-card dark:border-white/10"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-card">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddSectionOpen(false)
                  setNewSectionName("")
                  setSecCourseCode("")
                }}
                className="h-11 rounded-brand border border-gray-300 px-6 text-sm font-bold text-gray-600 uppercase hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-sm transition-colors dark:text-zinc-300 dark:hover:border-zinc-700 dark:bg-red-950/30 dark:border-white/10"
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                className="flex h-11 items-center gap-2 rounded-brand btn-brand-red hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all px-6 font-black text-white shadow-sm dark:shadow-none"
              >
                <i className="ph-bold ph-check text-lg"></i>
                CREATE BLOCK
              </Button>
            </div>
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
        <DialogContent className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-card">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-pup-maroon dark:text-primary shadow-sm dark:bg-red-950/30 dark:text-primary dark:shadow-none">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg leading-tight font-black tracking-tight text-gray-900 dark:text-zinc-50">
                  Edit Course Block
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm leading-relaxed font-medium text-gray-600 dark:text-zinc-300">
                  Update the block label or program association.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={updSection}>
            <div className="p-6 space-y-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-700 uppercase dark:text-zinc-200">
                  Degree Program <span className="text-pup-maroon dark:text-primary">*</span>
                </label>
                <Select
                  className="h-11 w-full rounded-brand border border-gray-300 bg-white px-3 text-sm font-bold text-gray-700 shadow-sm focus:border-gray-300 focus:ring-pup-maroon dark:bg-card dark:text-zinc-200 dark:shadow-none dark:focus:border-zinc-700 dark:border-white/10"
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
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-700 uppercase dark:text-zinc-200">
                  Block Name <span className="text-pup-maroon dark:text-primary">*</span>
                </label>
                <Input
                  type="text"
                  className="h-11 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-gray-300 focus-visible:ring-pup-maroon dark:bg-card dark:border-white/10"
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
            <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-card">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditSectionOpen(false)
                  setEditSection({ id: null, name: "", courseCode: "" })
                }}
                className="h-11 rounded-brand border border-gray-300 px-6 text-sm font-bold text-gray-600 uppercase hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-sm transition-colors dark:text-zinc-300 dark:hover:border-zinc-700 dark:bg-red-950/30 dark:border-white/10"
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
