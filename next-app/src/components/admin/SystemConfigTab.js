"use client"

import { useState, useEffect } from "react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Toggle } from "@/components/ui/toggle"
import { format } from "date-fns"
import ConfirmModal from "@/components/shared/ConfirmModal"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import DocTypesTab from "./system-config/DocTypesTab"
import CoursesTab from "./system-config/CoursesTab"
import SectionsTab from "./system-config/SectionsTab"
import BulkImportTab from "./system-config/BulkImportTab"
import SecurityQuestionsTab from "./system-config/SecurityQuestionsTab"

export default function SystemConfigTab({
  showToast,
  logAdminAction,
  onVerifyTOTP,
  error: errorProp = null,
}) {
  const [activeSubTab, setActiveSubTab] = useState("document-types")
  const [showArchived, setShowArchived] = useState(false)

  // Search States
  const [docSearch, setDocSearch] = useState("")
  const [courseSearch, setCourseSearch] = useState("")
  const [sectionSearch, setSectionSearch] = useState("")

  const [debouncedDocSearch, setDebouncedDocSearch] = useState("")
  const [debouncedCourseSearch, setDebouncedCourseSearch] = useState("")
  const [debouncedSectionSearch, setDebouncedSectionSearch] = useState("")

  // Debounce effects
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDocSearch(docSearch)
      setPageDoc(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [docSearch])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCourseSearch(courseSearch)
      setPageCourse(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [courseSearch])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSectionSearch(sectionSearch)
      setPageSection(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [sectionSearch])

  // Document Types State
  const [docTypes, setDocTypes] = useState([])
  // Courses State
  const [courses, setCourses] = useState([])

  // Sections State
  const [sections, setSections] = useState([])
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("")

  // Security Questions State
  const [securityQuestions, setSecurityQuestions] = useState([
    "",
    "",
    "",
    "",
    "",
  ])
  const [securitySaving, setSecuritySaving] = useState(false)

  // Table Selection States
  const [selectedDocTypes, setSelectedDocTypes] = useState({})
  const [selectedCourses, setSelectedCourses] = useState({})
  const [selectedSections, setSelectedSections] = useState({})
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Pagination States
  const [pageDoc, setPageDoc] = useState(1)
  const [pageCourse, setPageCourse] = useState(1)
  const [pageSection, setPageSection] = useState(1)

  // Sorting States
  const [sortDoc, setSortDoc] = useState({ key: "name", direction: "asc" })
  const [sortCourse, setSortCourse] = useState({
    key: "code",
    direction: "asc",
  })
  const [sortSection, setSortSection] = useState({
    key: "name",
    direction: "asc",
  })

  // Common State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [importing, setImporting] = useState(false)

  // Confirmation Modal
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPayload, setConfirmPayload] = useState({
    title: "",
    message: "",
    confirmLabel: "",
    variant: "danger",
    onConfirm: () => {},
  })

  useEffect(() => {
    // Reset selection states when view mode or sub-tab changes to avoid persisting 
    // batch actions between unrelated records or categories
    const docCount = Object.values(selectedDocTypes).filter(Boolean).length;
    const courseCount = Object.values(selectedCourses).filter(Boolean).length;
    const sectionCount = Object.values(selectedSections).filter(Boolean).length;

    if ((docCount > 0 || courseCount > 0 || sectionCount > 0) && showToast) {
       showToast({
         title: "Selections Reset",
         description: "Category selections cleared to prevent accidental batch actions.",
       });
    }

    setSelectedDocTypes({})
    setSelectedCourses({})
    setSelectedSections({})
    
    loadAll()
  }, [showArchived, activeSubTab])

  // --- Transform Helpers ---
  const applySortAndPagination = (data, sort, page, perPage) => {
    const sorted = [...data].sort((a, b) => {
      let valA = a[sort.key] || ""
      let valB = b[sort.key] || ""
      if (typeof valA === "string") valA = valA.toLowerCase()
      if (typeof valB === "string") valB = valB.toLowerCase()

      if (valA < valB) return sort.direction === "asc" ? -1 : 1
      if (valA > valB) return sort.direction === "asc" ? 1 : -1
      return 0
    })
    const start = (page - 1) * perPage
    return sorted.slice(start, start + perPage)
  }

  const handleSort = (tab, key) => {
    const setter =
      tab === "doc"
        ? setSortDoc
        : tab === "course"
          ? setSortCourse
          : setSortSection
          
    const defaultKey = tab === "doc" ? "name" : tab === "course" ? "code" : "name"

    setter((prev) => {
      if (prev.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" }
        // Cycle back to default sort (usually name or code)
        return { key: defaultKey, direction: "asc" }
      }
      return { key, direction: "asc" }
    })
    // Reset page
    if (tab === "doc") setPageDoc(1)
    if (tab === "course") setPageCourse(1)
    if (tab === "section") setPageSection(1)
  }

  // --- Derived Data ---
  const filteredDocTypesFull = docTypes.filter((dt) => {
    const matchesSearch = dt.name
      .toLowerCase()
      .includes(debouncedDocSearch.toLowerCase())
    const matchesStatus = showArchived
      ? dt.status === "Archived"
      : dt.status !== "Archived"
    return matchesSearch && matchesStatus
  })
  const filteredDocTypes = applySortAndPagination(
    filteredDocTypesFull,
    sortDoc,
    pageDoc,
    itemsPerPage
  )

  const filteredCoursesFull = courses.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(debouncedCourseSearch.toLowerCase()) ||
      c.name.toLowerCase().includes(debouncedCourseSearch.toLowerCase())
    const matchesStatus = showArchived
      ? c.status === "Archived"
      : c.status !== "Archived"
    return matchesSearch && matchesStatus
  })
  const filteredCourses = applySortAndPagination(
    filteredCoursesFull,
    sortCourse,
    pageCourse,
    itemsPerPage
  )

  const filteredSectionsFull = sections.filter((sec) => {
    const matchesProgram =
      selectedCourseFilter === "" || sec.course_code === selectedCourseFilter
    const matchesSearch = sec.name
      .toLowerCase()
      .includes(debouncedSectionSearch.toLowerCase())
    const matchesStatus = showArchived
      ? sec.status === "Archived"
      : sec.status !== "Archived"
    return matchesProgram && matchesSearch && matchesStatus
  })
  const filteredSections = applySortAndPagination(
    filteredSectionsFull,
    sortSection,
    pageSection,
    itemsPerPage
  )

  const SortIndicator = ({ currentSort, columnKey }) => {
    if (currentSort.key !== columnKey)
      return (
        <i className="ph-bold ph-caret-up-down ml-1 opacity-20 transition-opacity group-hover:opacity-100"></i>
      )
    return (
      <i
        className={`ph-bold ml-1 text-pup-maroon ${currentSort.direction === "asc" ? "ph-caret-up" : "ph-caret-down"}`}
      ></i>
    )
  }

  // Selection Handlers
  const toggleDocTypeSelected = (id) => {
    setSelectedDocTypes((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleAllDocTypes = (checked) => {
    if (!checked) {
      setSelectedDocTypes({})
    } else {
      const next = {}
      filteredDocTypes.forEach((dt) => {
        next[dt.id] = true
      })
      setSelectedDocTypes(next)
    }
  }

  const toggleCourseSelected = (id) => {
    setSelectedCourses((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleAllCourses = (checked) => {
    if (!checked) {
      setSelectedCourses({})
    } else {
      const next = {}
      filteredCourses.forEach((c) => {
        next[c.id] = true
      })
      setSelectedCourses(next)
    }
  }

  const toggleSectionSelected = (id) => {
    setSelectedSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleAllSections = (checked) => {
    if (!checked) {
      setSelectedSections({})
    } else {
      const next = {}
      filteredSections.forEach((s) => {
        next[s.id] = true
      })
      setSelectedSections(next)
    }
  }

  async function executeBulkTaxonomyAction(category, action) {
    let ids = []
    let label = ""
    const isRestore = action === "restore"

    if (category === "DocumentType") {
      ids = Object.keys(selectedDocTypes).filter((id) => selectedDocTypes[id])
      label = "Document Types"
    } else if (category === "Course") {
      ids = Object.keys(selectedCourses).filter((id) => selectedCourses[id])
      label = "Degree Programs"
    } else if (category === "Section") {
      ids = Object.keys(selectedSections).filter((id) => selectedSections[id])
      label = "Course Blocks"
    }

    if (ids.length === 0) return

    setLoading(true)
    try {
      await Promise.all(
        ids.map((id) => {
          if (category === "DocumentType") {
            if (isRestore) {
              return fetch(`/api/doc-types?id=${id}&silent=1`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Active" }),
              })
            }
            return fetch(`/api/doc-types?id=${id}&silent=1`, {
              method: "DELETE",
            })
          } else if (category === "Course") {
            if (isRestore) {
              return fetch(`/api/courses?id=${id}&restore=true&silent=1`, {
                method: "DELETE",
              })
            }
            return fetch(`/api/courses?id=${id}&silent=1`, { method: "DELETE" })
          } else if (category === "Section") {
            if (isRestore) {
              return fetch(`/api/sections?id=${id}&restore=true&silent=1`, {
                method: "DELETE",
              })
            }
            return fetch(`/api/sections?id=${id}&silent=1`, {
              method: "DELETE",
            })
          }
        })
      )

      logAdminAction({
        action: `${isRestore ? "Bulk Restore" : "Bulk Archive"} ${category}`,
        details: `${isRestore ? "restored" : "archived"} ${ids.length} ${label.toLowerCase()} in a single batch operation`,
        severity: isRestore ? "INFO" : "WARNING",
        entityType: "System",
      })

      // Clear selections
      if (category === "DocumentType") setSelectedDocTypes({})
      else if (category === "Course") setSelectedCourses({})
      else if (category === "Section") setSelectedSections({})

      showToast({
        title: "Batch Action Success",
        description: `Successfully ${isRestore ? "restored" : "archived"} ${ids.length} ${label.toLowerCase()}.`,
      })
      loadAll()
    } catch (err) {
      showToast({ title: "Batch Action Error", description: err.message }, true)
    } finally {
      setConfirmOpen(false)
      setLoading(false)
    }
  }

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const q = showArchived ? "includeArchived=true" : ""

      const [rDoc, rCourse, rSec, rSecQ] = await Promise.all([
        fetch(`/api/doc-types?admin=true${q ? "&" + q : ""}`),
        fetch(`/api/courses${q ? "?" + q : ""}`),
        fetch(`/api/sections${q ? "?" + q : ""}`),
        fetch("/api/system/security-questions"),
      ])

      const jDoc = await rDoc.json()
      const jCourse = await rCourse.json()
      const jSec = await rSec.json()
      const jSecQ = await rSecQ.json()

      if (!rDoc.ok || !jDoc.ok)
        throw new Error(jDoc.error || "Failed doc-types")
      if (!rCourse.ok || !jCourse.ok)
        throw new Error(jCourse.error || "Failed courses")
      if (!rSec.ok || !jSec.ok) throw new Error(jSec.error || "Failed sections")

      setDocTypes(jDoc.data)
      setCourses(jCourse.data)
      setSections(jSec.data)

      if (jSecQ.ok && Array.isArray(jSecQ.data)) {
        const qList = [...jSecQ.data, "", "", "", "", ""].slice(0, 5)
        setSecurityQuestions(qList)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }




  const handleSaveSecurityQuestions = async (e, totpToken = null) => {
    if (e) e.preventDefault()
    setSecuritySaving(true)
    const headers = { "Content-Type": "application/json" }
    if (totpToken) {
      headers["x-totp-token"] = totpToken
    }
    try {
      const filtered = securityQuestions.filter((q) => q.trim() !== "")
      if (filtered.length < 2) {
        showToast({
          title: "Validation Error",
          description: "At least two security questions are required.",
          variant: "destructive"
        })
        setSecuritySaving(false)
        return
      }

      const res = await fetch("/api/system/security-questions", {
        method: "PUT",
        headers,
        body: JSON.stringify({ questions: filtered }),
      })
      const json = await res.json()

      if (res.status === 403 && json?.requiresTOTP && onVerifyTOTP) {
        if (totpToken) {
          throw new Error(json.error || "Invalid verification code")
        }
        await onVerifyTOTP((token) => handleSaveSecurityQuestions(null, token))
        return
      }

      if (!res.ok || !json.ok)
        throw new Error(json.error || "Failed to save questions")
      showToast({
        title: "Security Configuration Updated",
        description: "The global security questions have been successfully saved to the system.",
      })
      loadAll()
    } catch (err) {
      if (totpToken) throw err
      showToast({ title: "Configuration Update Failed", description: err.message }, true)
    } finally {
      setSecuritySaving(false)
    }
  }

  // --- ACTIONS: Export Taxonomy ---
  const downloadCsv = (filename, content) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    const timestamp = format(new Date(), "yyyy-MM-dd-HHmm")
    const finalFilename = `PUP-TAXONOMY-${filename.toUpperCase().replace(".CSV", "").replace(/_/g, "-")}-${timestamp}.csv`
    
    link.setAttribute("href", url)
    link.setAttribute("download", finalFilename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return ""
    const str = String(val)
    if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
      return `"${str.replace(/"/g, "\"\"")}"`
    }
    return str
  }

  const handleExportDocTypes = () => {
    const headers = "Category,Name,Code\n"
    const csvContent = docTypes
      .map((dt) => `DocumentType,${escapeCsv(dt.name)},`)
      .join("\n")
    downloadCsv("document_types.csv", headers + csvContent)
    logAdminAction({
      action: "Export Taxonomy",
      details: `exported ${docTypes.length} document type configurations to CSV`,
      entityType: "System",
    })
    showToast({
      title: "Export Success",
      description: "Document types taxonomy has been successfully exported to CSV.",
    })
  }

  const handleExportCourses = () => {
    const headers = "Category,Name,Code\n"
    const csvContent = courses
      .map((c) => `Course,${escapeCsv(c.name)},${escapeCsv(c.code)}`)
      .join("\n")
    downloadCsv("degree_programs.csv", headers + csvContent)
    logAdminAction({
      action: "Export Taxonomy",
      details: `exported ${courses.length} degree program configurations to CSV`,
      entityType: "System",
    })
    showToast({
      title: "Export Success",
      description: "Degree programs configuration has been successfully exported to CSV.",
    })
  }

  const handleExportSections = () => {
    const headers = "Category,Name,Code\n"
    const csvContent = sections
      .map((s) => `Section,${escapeCsv(s.name)},${escapeCsv(s.course_code || "")}`)
      .join("\n")
    downloadCsv("course_blocks.csv", headers + csvContent)
    logAdminAction({
      action: "Export Taxonomy",
      details: `exported ${sections.length} course block configurations to CSV`,
      entityType: "System",
    })
    showToast({
      title: "Export Success",
      description: "Course blocks configuration has been successfully exported to CSV.",
    })
  }

  // --- ACTIONS: Bulk Import (Staged) ---
  const [importFile, setImportFile] = useState(null)
  const [importRows, setImportRows] = useState([]) // [{ category, name, code, error, index }]
  const [importSelected, setImportSelected] = useState({}) // { [index]: boolean }
  const [importStatus, setImportStatus] = useState("idle") // idle, preview, importing, complete
  const [importResults, setImportResults] = useState(null)
  const [importDropActive, setImportDropActive] = useState(false)

  async function handleCsvSelect(e) {
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0]
    if (!file) return
    setImportFile(file)
    setImportStatus("preview")
    setImportResults(null)

    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      if (lines.length < 2) {
        throw new Error("CSV must have a header row and at least one data row")
      }

      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().toLowerCase().replace(/\s+/g, ""))

      const requiredCols = ["category", "name"]
      const missingCols = requiredCols.filter((c) => !headers.includes(c))
      if (missingCols.length > 0) {
        throw new Error(`Missing required columns: ${missingCols.join(", ")}`)
      }

      const initialSelection = {}
      const parsed = lines.slice(1).map((line, idx) => {
        const vals = line.split(",")
        const row = {}
        headers.forEach((h, hIdx) => {
          row[h] = vals[hIdx]?.trim() || ""
        })

        const category = row.category || ""
        const name = row.name || ""
        const code = row.code || ""

        let error = ""
        if (!category) error = "Missing Category"
        else if (!name) error = "Missing Name"
        else if (
          !["documenttype", "course", "section"].includes(
            category.toLowerCase()
          )
        ) {
          error = "Invalid Category"
        } else if (category.toLowerCase() === "section") {
          // Deep Validation: Check if the program code exists
          const exists = courses.some(
            (c) => c.code.toLowerCase() === code.toLowerCase()
          )
          if (!exists) {
            error = "Program Not Found"
          }
        }

        const rowIndex = idx + 1
        if (!error) {
          initialSelection[rowIndex] = true
        }

        return { category, name, code, error, index: rowIndex }
      })

      setImportRows(parsed)
      setImportSelected(initialSelection)
    } catch (err) {
      showToast({ title: "Parsing Error", description: err.message }, true)
      setImportFile(null)
      setImportStatus("idle")
    } finally {
      e.target.value = ""
    }
  }

  const toggleImportRowSelected = (index) => {
    setImportSelected((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const toggleImportSelectAll = (checked) => {
    if (!checked) {
      setImportSelected({})
    } else {
      const next = {}
      importRows.forEach((r) => {
        if (!r.error) next[r.index] = true
      })
      setImportSelected(next)
    }
  }

  const handleUpdateImportRow = (index, newData) => {
    setImportRows((prev) => {
      const updated = prev.map((row) => {
        if (row.index === index) {
          const category = newData.category || ""
          const name = newData.name || ""
          const code = newData.code || ""

          let error = ""
          if (!category) error = "Missing Category"
          else if (!name) error = "Missing Name"
          else if (
            !["documenttype", "course", "section"].includes(
              category.toLowerCase()
            )
          ) {
            error = "Invalid Category"
          } else if (category.toLowerCase() === "section") {
            // Deep Validation: Check if the program code exists
            const exists = courses.some(
              (c) => c.code.toLowerCase() === code.toLowerCase()
            )
            if (!exists) {
              error = "Program Not Found"
            }
          }

          if (!error) {
            setImportSelected((prevSel) => ({ ...prevSel, [index]: true }))
          } else {
            setImportSelected((prevSel) => ({ ...prevSel, [index]: false }))
          }

          return { ...row, category, name, code, error }
        }
        return row
      })
      return updated
    })
  }

  const handleManualAddRow = (newData) => {
    const category = newData.category || ""
    const name = newData.name || ""
    const code = newData.code || ""

    let error = ""
    if (!category) error = "Missing Category"
    else if (!name) error = "Missing Name"
    else if (
      !["documenttype", "course", "section"].includes(
        category.toLowerCase()
      )
    ) {
      error = "Invalid Category"
    } else if (category.toLowerCase() === "section") {
      const exists = courses.some(
        (c) => c.code.toLowerCase() === code.toLowerCase()
      )
      if (!exists) {
        error = "Program Not Found"
      }
    }

    const nextIndex = importRows.length > 0 ? Math.max(...importRows.map((r) => r.index)) + 1 : 1
    const newRow = { category, name, code, error, index: nextIndex }

    setImportRows((prev) => [newRow, ...prev])
    if (!error) {
      setImportSelected((prev) => ({ ...prev, [nextIndex]: true }))
    }
  }

  async function executeBulkImport() {
    const validAndSelectedRows = importRows.filter(
      (r) => !r.error && importSelected[r.index]
    )
    if (validAndSelectedRows.length === 0) return

    setImportStatus("importing")
    try {
      const res = await fetch("/api/system/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validAndSelectedRows }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Import failed")

      const s = json.data?.successCount || 0
      const f = json.data?.failCount || 0

      setImportResults(json.data)
      setImportStatus("complete")
      if (s > 0 && f === 0) {
        showToast({
          title: "Import Successful",
          description: `Successfully added ${s} new records to the system.`,
        })
      } else if (s > 0 && f > 0) {
        showToast(
          {
            title: "Partial Import",
            description: `Added ${s} records, but ${f} duplicates were skipped.`,
          },
          "warning"
        )
      } else {
        showToast(
          {
            title: "No Records Added",
            description: `All ${f} selected entries already exist in the system repository.`,
          },
          "warning"
        )
      }

      loadAll()
    } catch (err) {
      showToast({ title: "Import Error", description: err.message }, true)
      setImportStatus("preview")
    }
  }

  function resetImport() {
    setImportFile(null)
    setImportRows([])
    setImportSelected({})
    setImportStatus("idle")
    setImportResults(null)
  }

  function handleCopySample() {
    const sample =
      "Category,Name,Code\nDocumentType,Transcript of Records,\nDocumentType,Diploma,\nCourse,Bachelor of Science in Information Technology,BSIT\nCourse,Bachelor of Science in Accountancy,BSA\nSection,Block 1,BSIT\nSection,Section 1,BSA"
    navigator.clipboard.writeText(sample)
    showToast({
      title: "Copied to Clipboard",
      description: "The CSV sample data has been successfully copied to your clipboard.",
    })
  }

  /* if (loading && !docTypes.length) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md rounded-brand" />
        <Skeleton className="h-[400px] w-full rounded-brand" />
      </div>
    )
  } */

  const activeError = errorProp || error

  if (activeError) {
    return (
      <div className="animate-fade-in font-inter flex w-full flex-col gap-4">
        <Card className="flex flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm">
          <CardContent className="flex flex-col p-6">
            <Empty className="flex h-[400px] flex-col items-center justify-center border-0 text-center text-gray-500">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                  <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900">
                  Could not load configuration
                </EmptyTitle>
                <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                  {activeError}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    )
  }

  const archivedToggle = (
    <div className="ml-auto inline-flex h-10 shrink-0 items-center rounded-lg border border-gray-200 bg-gray-100 p-1 shadow-sm">
      <button
        onClick={() => setShowArchived(false)}
        className={`flex h-full items-center gap-2 rounded-md px-3 text-[10px] font-black tracking-widest uppercase transition-all ${
          !showArchived
            ? "bg-pup-maroon text-white shadow-md ring-1 ring-black/5"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <i className="ph-bold ph-check-circle text-xs"></i>
        <span>Active Records</span>
      </button>
      <button
        onClick={() => setShowArchived(true)}
        className={`flex h-full items-center gap-2 rounded-md px-3 text-[10px] font-black tracking-widest uppercase transition-all ${
          showArchived
            ? "bg-amber-600 text-white shadow-md ring-1 ring-black/5"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <i className="ph-bold ph-archive text-xs"></i>
        <span>Archive Vault</span>
      </button>
    </div>
  )

  return (
    <TooltipProvider delayDuration={200}>
      <div className="animate-fade-in font-inter flex w-full flex-col gap-4">
        <Tabs
          defaultValue="document-types"
          value={activeSubTab}
          onValueChange={setActiveSubTab}
          orientation="horizontal"
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex shrink-0 flex-col items-center gap-4 sm:flex-row">
            <div className="inline-flex h-auto rounded-brand border border-gray-200/50 bg-gray-100/80 p-1 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setActiveSubTab("document-types")}
                className={`flex items-center gap-2.5 rounded-brand px-5 py-2 text-sm font-bold transition-all duration-200 active:scale-95 ${
                  activeSubTab === "document-types"
                    ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:bg-white/50 hover:text-gray-700"
                }`}
              >
                <i
                  className={`ph-bold ph-files ${activeSubTab === "document-types" ? "" : "text-gray-400"}`}
                ></i>
                <span>DOCUMENT TYPES</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("degree-programs")}
                className={`flex items-center gap-2.5 rounded-brand px-5 py-2 text-sm font-bold transition-all duration-200 active:scale-95 ${
                  activeSubTab === "degree-programs"
                    ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:bg-white/50 hover:text-gray-700"
                }`}
              >
                <i
                  className={`ph-bold ph-books ${activeSubTab === "degree-programs" ? "" : "text-gray-400"}`}
                ></i>
                <span>DEGREE PROGRAMS</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("course-blocks")}
                className={`flex items-center gap-2.5 rounded-brand px-5 py-2 text-sm font-bold transition-all duration-200 active:scale-95 ${
                  activeSubTab === "course-blocks"
                    ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:bg-white/50 hover:text-gray-700"
                }`}
              >
                <i
                  className={`ph-bold ph-list-numbers ${activeSubTab === "course-blocks" ? "" : "text-gray-400"}`}
                ></i>
                <span>COURSE BLOCKS</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("bulk-import")}
                className={`flex items-center gap-2.5 rounded-brand px-5 py-2 text-sm font-bold transition-all duration-200 active:scale-95 ${
                  activeSubTab === "bulk-import"
                    ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:bg-white/50 hover:text-gray-700"
                }`}
              >
                <i
                  className={`ph-bold ph-upload-simple ${activeSubTab === "bulk-import" ? "" : "text-gray-400"}`}
                ></i>
                <span>IMPORTS</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("security-questions")}
                className={`flex items-center gap-2.5 rounded-brand px-5 py-2 text-sm font-bold transition-all duration-200 active:scale-95 ${
                  activeSubTab === "security-questions"
                    ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:bg-white/50 hover:text-gray-700"
                }`}
              >
                <i
                  className={`ph-bold ph-lock-key ${activeSubTab === "security-questions" ? "" : "text-gray-400"}`}
                ></i>
                <span>SECURITY</span>
              </button>
            </div>
          </div>

          <Card className="relative mt-4 flex flex-col rounded-brand border border-gray-300 bg-white p-0 shadow-sm">
            <TabsContent
              value="document-types"
              className="m-0 flex flex-col border-0 focus-visible:ring-0"
            >
              <DocTypesTab
                loading={loading}
                docTypes={docTypes}
                docSearch={docSearch}
                setDocSearch={setDocSearch}
                showArchived={showArchived}
                setShowArchived={setShowArchived}
                pageDoc={pageDoc}
                setPageDoc={setPageDoc}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                filteredDocTypes={filteredDocTypes}
                filteredDocTypesFull={filteredDocTypesFull}
                selectedDocTypes={selectedDocTypes}
                toggleDocTypeSelected={toggleDocTypeSelected}
                toggleAllDocTypes={toggleAllDocTypes}
                executeBulkTaxonomyAction={executeBulkTaxonomyAction}
                setConfirmPayload={setConfirmPayload}
                setConfirmOpen={setConfirmOpen}
                onSort={(key, dir) => handleSort("doc", key, dir)}
                sortDoc={sortDoc}
                showToast={showToast}
                loadAll={loadAll}
                handleExportDocTypes={handleExportDocTypes}
              />
            </TabsContent>

            <TabsContent
              value="degree-programs"
              className="m-0 flex flex-col border-0 focus-visible:ring-0"
            >
              <CoursesTab
                loading={loading}
                courses={courses}
                sections={sections}
                courseSearch={courseSearch}
                setCourseSearch={setCourseSearch}
                showArchived={showArchived}
                setShowArchived={setShowArchived}
                pageCourse={pageCourse}
                setPageCourse={setPageCourse}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                filteredCourses={filteredCourses}
                filteredCoursesFull={filteredCoursesFull}
                selectedCourses={selectedCourses}
                toggleCourseSelected={toggleCourseSelected}
                toggleAllCourses={toggleAllCourses}
                executeBulkTaxonomyAction={executeBulkTaxonomyAction}
                setConfirmPayload={setConfirmPayload}
                setConfirmOpen={setConfirmOpen}
                onSort={(key, dir) => handleSort("course", key, dir)}
                sortCourse={sortCourse}
                showToast={showToast}
                loadAll={loadAll}
                handleExportCourses={handleExportCourses}
              />
            </TabsContent>

            <TabsContent
              value="course-blocks"
              className="m-0 flex flex-col border-0 focus-visible:ring-0"
            >
              <SectionsTab
                loading={loading}
                courses={courses}
                sections={sections}
                sectionSearch={sectionSearch}
                setSectionSearch={setSectionSearch}
                selectedCourseFilter={selectedCourseFilter}
                setSelectedCourseFilter={setSelectedCourseFilter}
                showArchived={showArchived}
                setShowArchived={setShowArchived}
                pageSection={pageSection}
                setPageSection={setPageSection}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                filteredSections={filteredSections}
                filteredSectionsFull={filteredSectionsFull}
                selectedSections={selectedSections}
                toggleSectionSelected={toggleSectionSelected}
                toggleAllSections={toggleAllSections}
                executeBulkTaxonomyAction={executeBulkTaxonomyAction}
                setSelectedSections={setSelectedSections}
                setConfirmPayload={setConfirmPayload}
                setConfirmOpen={setConfirmOpen}
                onSort={(key, dir) => handleSort("section", key, dir)}
                sortSection={sortSection}
                showToast={showToast}
                loadAll={loadAll}
                handleExportSections={handleExportSections}
              />
            </TabsContent>

            <TabsContent
              value="bulk-import"
              className="m-0 flex flex-col border-0 bg-gray-50/50 focus-visible:ring-0"
            >
              <BulkImportTab
                importStatus={importStatus}
                importDropActive={importDropActive}
                setImportDropActive={setImportDropActive}
                handleCsvSelect={handleCsvSelect}
                handleCopySample={handleCopySample}
                resetImport={resetImport}
                importFile={importFile}
                importRows={importRows}
                importSelected={importSelected}
                toggleImportRowSelected={toggleImportRowSelected}
                toggleImportSelectAll={toggleImportSelectAll}
                executeBulkImport={executeBulkImport}
                importResults={importResults}
                setActiveSubTab={setActiveSubTab}
                onUpdateRow={handleUpdateImportRow}
                onAddRow={handleManualAddRow}
                courses={courses}
              />
            </TabsContent>

            <TabsContent
              value="security-questions"
              className="m-0 flex flex-col border-0 focus-visible:ring-0"
            >
              <SecurityQuestionsTab
                loading={loading}
                securityQuestions={securityQuestions}
                setSecurityQuestions={setSecurityQuestions}
                securitySaving={securitySaving}
                handleSaveSecurityQuestions={handleSaveSecurityQuestions}
              />
            </TabsContent>
          </Card>
        </Tabs>

        {/* MODALS */}

        <ConfirmModal
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          title={confirmPayload.title}
          message={confirmPayload.message}
          confirmLabel={confirmPayload.confirmLabel}
          variant={confirmPayload.variant}
          icon={confirmPayload.icon}
          buttonIcon={confirmPayload.buttonIcon}
          selectedItems={confirmPayload.selectedItems}
          onConfirm={confirmPayload.onConfirm}
        />
      </div>
    </TooltipProvider>
  )
}
