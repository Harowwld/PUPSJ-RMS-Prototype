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
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
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
  DialogFooter,
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
  const [isExporting, setIsExporting] = useState(false)

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
    if (sortSection.key !== column) {
      return <HugeIcon  className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></HugeIcon>
    }
    return sortSection.direction === "asc" ? (
      <HugeIcon  className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></HugeIcon>
    ) : (
      <HugeIcon  className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></HugeIcon>
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

  const onExportClick = async () => {
    setIsExporting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 600))
      await handleExportSections()
    } finally {
      setIsExporting(false)
    }
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
      confirmLabel: showArchived ? "Restore" : "Archive",
      variant: showArchived ? "success" : "warning",
      buttonIcon: showArchived ? "ph-bold ph-archive-restore" : "ph-bold ph-archive",
      icon: showArchived ? "ph-duotone ph-archive-restore" : "ph-duotone ph-archive",
      selectedItems: selectedNames,
      onConfirm: () => executeBulkTaxonomyAction("Section", showArchived ? "restore" : "delete"),
    })
    setConfirmOpen(true)
  }



  if (loading && sections.length === 0) {
    return (
      <div className="flex h-full w-full flex-col p-6">
        <TaxonomyTableSkeleton rowCount={6} showSubtext={true} />
      </div>
    )
  }

  return (
    <div className="font-jakarta flex w-full flex-col gap-6 animate-fade-up px-[28px] pb-[28px]">
      <div className="mt-[20px]">
        <PageHeader
          icon="ph-list-numbers"
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          title={
            <div className="flex items-center gap-[6px]">
              Course Blocks
              {showArchived && (
                <span className="text-[12px] font-normal text-emerald-600 dark:text-emerald-400">
                  · Restore Mode
                </span>
              )}
            </div>
          }
          description="Manage academic cohorts, sections, and organizational blocks."
          className="p-0"
        />
      </div>

      <div className="font-jakarta">
        <div className="flex select-none items-center justify-between gap-3 border-b border-gray-100 dark:border-white/10 pb-4">
          {/* Active / Archived Tabs */}
          <div className="flex items-center gap-6 select-none">
            <button
              type="button"
              onClick={() => {
                setShowArchived(false)
                setPageSection(1)
              }}
              className={cn(
                "relative pb-4 -mb-[17px] text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                !showArchived
                  ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Active ({sections.filter((s) => s.status !== "Archived").length})
            </button>
            <button
              type="button"
              onClick={() => {
                setShowArchived(true)
                setPageSection(1)
              }}
              className={cn(
                "relative pb-4 -mb-[17px] text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                showArchived
                  ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Archived ({sections.filter((s) => s.status === "Archived").length})
            </button>
          </div>

          {/* Search Input, Matches Count, Export, Add */}
          <div className="flex flex-1 items-center justify-end gap-3 min-w-[300px] select-none">
            {/* Program Filter Select dropdown */}
            <div className="w-[180px]">
              <Select
                className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-700 dark:text-zinc-200 shadow-none px-3 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 cursor-pointer"
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
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <HugeIcon  className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm"></HugeIcon>
              </div>
              <Input
                type="text"
                placeholder="Filter block name..."
                className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 pl-9 pr-24 text-xs font-normal placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 text-gray-900 dark:text-zinc-100"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              <div className="absolute inset-y-0 right-3 flex items-center gap-2">
                {localSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalSearch("")
                      setSectionSearch("")
                      setPageSection(1)
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none text-xs"
                    title="Clear search"
                  >
                    <HugeIcon  className="ph-bold ph-x" />
                  </button>
                )}
                <span className="text-[12px] font-normal text-gray-400 dark:text-zinc-500 pointer-events-none">
                  {filteredSectionsFull.length}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExportClick}
              disabled={isExporting}
              className="flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
            >
              {isExporting ? (
                <HugeIcon  className="ph-bold ph-spinner animate-spin text-sm"></HugeIcon>
              ) : (
                "Export"
              )}
            </Button>

            <Button
              onClick={() => setIsAddSectionOpen(true)}
              disabled={showArchived}
              className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs px-5 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs border-0"
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table Container (No outer card background/shadow) */}
      <div key={showArchived} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card w-full animate-fade-up">

        {/* Active Filter Chips Row */}
        {(localSearch !== "" || selectedCourseFilter) && (
          <div className="flex-none border-b border-gray-100 bg-white px-6 py-3 animate-in fade-in slide-in-from-top-1 duration-normal dark:border-white/10 dark:bg-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">Active filters:</span>
              {localSearch && (
                <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Search: {localSearch}
                  <button
                    onClick={() => { setLocalSearch(""); setSectionSearch(""); setPageSection(1); }}
                    className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                  >
                    ×
                  </button>
                </div>
              )}
              {selectedCourseFilter && (
                <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Program: {selectedCourseFilter}
                  <button
                    onClick={() => { setSelectedCourseFilter(""); setPageSection(1); }}
                    className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                  >
                    ×
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
                  setPageSection(1)
                }}
                className="h-auto text-[12px] font-medium text-gray-400 dark:text-zinc-500 border-0 bg-transparent hover:bg-transparent shadow-none p-0 hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

          <div className="relative z-10 flex-1 overflow-x-auto overflow-y-auto select-none">
              {loading ? (
                <TaxonomyTableSkeleton rowCount={6} showSubtext={true} />
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:bg-card dark:border-white/10">
                    <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                      <th className="w-12 p-4 text-center">
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
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortSection.key === "course_code" ? "text-pup-maroon dark:text-red-500" : "text-gray-400 dark:text-zinc-500 hover:text-pup-maroon dark:hover:text-red-500"
                          )}
                        >
                          Degree Program <SortIndicator column="course_code" />
                        </button>
                      </th>
                      <th className="p-4 px-6">
                        <button
                          onClick={() => onSort("name")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortSection.key === "name" ? "text-pup-maroon dark:text-red-500" : "text-gray-400 dark:text-zinc-500 hover:text-pup-maroon dark:hover:text-red-500"
                          )}
                        >
                          Block Name <SortIndicator column="name" />
                        </button>
                      </th>
                      <th className="w-40 p-4 px-6 text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">Status</th>
                      <th className="w-32 p-4 px-6 text-right text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                    {!showArchived && (
                      <tr className={cn(
                        "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                        (secCourseCode || newSectionName.trim()) && "bg-amber-50/50 dark:bg-amber-950/10"
                      )}>
                        <td className="py-0 px-4 align-middle text-center">
                          <div className={cn(
                            "flex h-5 w-5 mx-auto items-center justify-center rounded-full border-2 border-dashed transition-colors",
                            (secCourseCode || newSectionName.trim()) ? "border-orange-400 dark:border-orange-500/50" : "border-gray-300 dark:border-white/10"
                          )}>
                            <HugeIcon  className={cn(
                              "ph-bold text-[10px]",
                              (secCourseCode || newSectionName.trim()) ? "ph-pencil-simple text-orange-600 animate-bounce dark:text-orange-400" : "ph-plus text-gray-400 dark:text-zinc-500"
                            )}></HugeIcon>
                          </div>
                        </td>
                        <td className="py-0 px-6 align-middle">
                          <Select
                            className={cn(
                              "h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-700 dark:text-zinc-200 transition-all shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80",
                              secCourseCode ? "ring-1 ring-amber-100" : ""
                            )}
                            value={secCourseCode}
                            onChange={(e) => setSecCourseCode(e.target.value)}
                          >
                            <option value=""></option>
                            {courses.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.code}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="py-0 px-6 align-middle">
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
                                "h-9 flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-xs transition-all focus-visible:ring-pup-maroon",
                                (secCourseCode || newSectionName.trim()) ? "ring-2 ring-amber-100" : ""
                              )}
                            />
                            <Button
                              size="sm"
                              disabled={!secCourseCode || !newSectionName.trim() || isQuickAddLoading}
                              onClick={() => addSection(null, { courseCode: secCourseCode, name: newSectionName })}
                              title="Add Course Block"
                              className="h-9 w-9 p-0 flex items-center justify-center rounded-xl text-sm font-semibold text-white shadow-xs active:scale-95 disabled:opacity-50 transition-all btn-brand-orange shrink-0 cursor-pointer"
                            >
                            {isQuickAddLoading ? (
                              <HugeIcon  className="ph-bold ph-spinner animate-spin"></HugeIcon>
                            ) : (
                              <HugeIcon  className="ph-bold ph-plus"></HugeIcon>
                            )}
                            </Button>
                          </div>
                        </td>
                        <td className="py-0 px-6 align-middle">
                          {(secCourseCode || newSectionName.trim()) ? (
                            <div className="inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400">
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
                            "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                            sec.status === "Archived" && "opacity-75",
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
                                toggleSectionSelected(sec.id);
                              }}
                              disabled={isDisabled}
                            />
                          </td>
                          <td className="py-0 px-6 align-middle">
                            <span className="text-[13px] font-medium tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                              {sec.course_code || "—"}
                            </span>
                          </td>
                          <td className="py-0 px-6 align-middle max-w-[300px]">
                            <div className="truncate text-[13px] font-medium tracking-[-0.01em] text-gray-900 dark:text-zinc-50" title={sec.name}>
                              {sec.name}
                            </div>
                          </td>
                          <td className="py-0 px-6 align-middle text-left">
                            {sec.status === "Archived" ? (
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
                                      disabled={sec.status === "Archived"}
                                      onClick={() => {
                                        setEditSection({
                                          id: sec.id,
                                          name: sec.name,
                                          courseCode: sec.course_code || "",
                                        })
                                        setIsEditSectionOpen(true)
                                      }}
                                      className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors flex items-center justify-center border-0 bg-transparent cursor-pointer active:scale-95"
                                    >
                                      <HugeIcon  className="ph-bold ph-pencil-simple text-sm"></HugeIcon>
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
                                        confirmLabel: "Restore",
                                        variant: "success",
                                        buttonIcon: "ph-bold ph-archive-restore",
                                        icon: "ph-duotone ph-archive-restore",
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
                                    className="w-7 h-7 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-gray-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors flex items-center justify-center border-0 bg-transparent cursor-pointer active:scale-95"
                                  >
                                    <HugeIcon  className="ph-bold ph-archive-restore text-sm"></HugeIcon>
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
                                        confirmLabel: "Archive",
                                        variant: "warning",
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
                                    className="w-7 h-7 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 text-gray-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400 transition-colors flex items-center justify-center border-0 bg-transparent cursor-pointer active:scale-95"
                                  >
                                    <HugeIcon  className="ph-bold ph-archive text-sm"></HugeIcon>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Archive Course Block</TooltipContent>
                              </Tooltip>
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
                                    <HugeIcon  className={showArchived && totalInView === 0 ? "ph-archive" : "ph-magnifying-glass"}></HugeIcon>
                                  </EmptyMedia>
                                </div>
                                <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                                  {totalInView > 0 ? "No matches found" : (showArchived ? "No Archived Course Blocks Found" : "No Course Blocks Found")}
                                </EmptyTitle>
                                <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                                  {totalInView > 0
                                    ? "Try adjusting your search filters or course selection to find what you're looking for."
                                    : showArchived
                                      ? "There are currently no archived course blocks in the system."
                                      : "Add Course Block to organize students within degree programs."}
                                </EmptyDescription>
                                {totalInView > 0 ? (
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSectionSearch("")
                                      setLocalSearch("")
                                      setSelectedCourseFilter("")
                                    }}
                                    className="mt-4 h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                                  >
                                    Clear
                                  </Button>
                                ) : !showArchived && (
                                  <Button
                                    onClick={() => setIsAddSectionOpen(true)}
                                    className="mt-4 h-10 rounded-xl btn-brand-red px-5 text-xs font-semibold text-white shadow-xs active:scale-95 transition-all cursor-pointer border-0"
                                  >
                                    Add
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

        {filteredSectionsFull.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl mt-auto">
            <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-zinc-400 select-none">
              <span>
                Showing {filteredSections.length} of {filteredSectionsFull.length.toLocaleString()}
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
                disabled={pageSection <= 1}
                onClick={() => setPageSection((p) => Math.max(1, p - 1))}
                className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
              >
                Prev
              </Button>

              <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-zinc-800 flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                {pageSection}
              </div>

              <Button
                variant="ghost"
                size="sm"
                disabled={pageSection >= Math.ceil(filteredSectionsFull.length / itemsPerPage)}
                onClick={() => setPageSection((p) => p + 1)}
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
        selectionStatus="Selected Sections"
        onCancel={() => toggleAllSections(false)}
        onAction={handleBulkAction}
        actionLabel={showArchived ? "Restore" : "Archive"}
        actionIcon={showArchived ? "ph-archive-restore" : "ph-archive"}
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
          <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                  New Course Block
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                  Create a new organizational section for degree program management.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={addSection} className="w-full min-w-0 overflow-hidden">
            <div className="p-6 pb-4 flex flex-col gap-4">
              <div className="w-full min-w-0">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Degree Program <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                </label>
                <Select
                  className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 shadow-none min-w-0"
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
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Block Name <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Section 1"
                  className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs min-w-0"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddSectionOpen(false)
                  setNewSectionName("")
                  setSecCourseCode("")
                }}
                className="h-10 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
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
        open={isEditSectionOpen}
        onOpenChange={(open) => {
          setIsEditSectionOpen(open)
          if (!open) setEditSection({ id: null, name: "", courseCode: "" })
        }}
      >
        <DialogContent className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-card">
          <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                  Edit Course Block
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                  Update the block label or program association.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={updSection} className="w-full min-w-0 overflow-hidden">
            <div className="p-6 pb-4 space-y-4">
              <div className="w-full min-w-0">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Degree Program <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                </label>
                <Select
                  className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 shadow-none min-w-0"
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
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Block Name <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                </label>
                <Input
                  type="text"
                  className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs min-w-0"
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
            <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditSectionOpen(false)
                  setEditSection({ id: null, name: "", courseCode: "" })
                }}
                className="h-10 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
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
  )
}
