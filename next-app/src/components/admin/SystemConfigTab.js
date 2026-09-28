"use client"

import HugeIcon from "@/components/shared/HugeIcon";
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
import { generateExportFilename } from "@/lib/exportHelpers"
import ConfirmModal from "@/components/shared/ConfirmModal"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
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

import DocTypesTab from "./system-config/DocTypesTab"
import CoursesTab from "./system-config/CoursesTab"
import SectionsTab from "./system-config/SectionsTab"
import BulkImportTab from "./system-config/BulkImportTab"
import RecognitionTemplatesTab from "./system-config/RecognitionTemplatesTab"

export default function SystemConfigTab({
  showToast,
  logAdminAction,
  error: errorProp = null,
  authUser = null,
}) {
  const isOsas = (authUser?.office_id || "").toLowerCase() === "osas";
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

  // Table Selection States
  const [selectedDocTypes, setSelectedDocTypes] = useState({})
  const [selectedCourses, setSelectedCourses] = useState({})
  const [selectedSections, setSelectedSections] = useState({})
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Last Selected Trackers for Shift+Click
  const [lastSelectedDocId, setLastSelectedDocId] = useState(null)
  const [lastSelectedCourseId, setLastSelectedCourseId] = useState(null)
  const [lastSelectedSectionId, setLastSelectedSectionId] = useState(null)

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
    setPageDoc(1)
    setPageCourse(1)
    setPageSection(1)

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

  // Ensure current page does not exceed available pages when data changes
  useEffect(() => {
    const totalPages = Math.ceil(filteredDocTypesFull.length / itemsPerPage) || 1
    if (pageDoc > totalPages) setPageDoc(totalPages)
  }, [filteredDocTypesFull.length, itemsPerPage, pageDoc])

  useEffect(() => {
    const totalPages = Math.ceil(filteredCoursesFull.length / itemsPerPage) || 1
    if (pageCourse > totalPages) setPageCourse(totalPages)
  }, [filteredCoursesFull.length, itemsPerPage, pageCourse])

  useEffect(() => {
    const totalPages = Math.ceil(filteredSectionsFull.length / itemsPerPage) || 1
    if (pageSection > totalPages) setPageSection(totalPages)
  }, [filteredSectionsFull.length, itemsPerPage, pageSection])

  // Automatically prune stale selections when filtered datasets update
  useEffect(() => {
    setSelectedDocTypes((prev) => {
      const selectedKeys = Object.keys(prev).filter((k) => prev[k])
      if (selectedKeys.length === 0) return prev
      const validIds = new Set(filteredDocTypesFull.map((d) => String(d.id)))
      let needsPruning = false
      for (const id of selectedKeys) {
        if (!validIds.has(String(id))) {
          needsPruning = true
          break
        }
      }
      if (!needsPruning) return prev
      const next = {}
      for (const [k, v] of Object.entries(prev)) {
        if (v && validIds.has(String(k))) next[k] = true
      }
      return next
    })
  }, [filteredDocTypesFull])

  useEffect(() => {
    setSelectedCourses((prev) => {
      const selectedKeys = Object.keys(prev).filter((k) => prev[k])
      if (selectedKeys.length === 0) return prev
      const validIds = new Set(filteredCoursesFull.map((c) => String(c.id)))
      let needsPruning = false
      for (const id of selectedKeys) {
        if (!validIds.has(String(id))) {
          needsPruning = true
          break
        }
      }
      if (!needsPruning) return prev
      const next = {}
      for (const [k, v] of Object.entries(prev)) {
        if (v && validIds.has(String(k))) next[k] = true
      }
      return next
    })
  }, [filteredCoursesFull])

  useEffect(() => {
    setSelectedSections((prev) => {
      const selectedKeys = Object.keys(prev).filter((k) => prev[k])
      if (selectedKeys.length === 0) return prev
      const validIds = new Set(filteredSectionsFull.map((s) => String(s.id)))
      let needsPruning = false
      for (const id of selectedKeys) {
        if (!validIds.has(String(id))) {
          needsPruning = true
          break
        }
      }
      if (!needsPruning) return prev
      const next = {}
      for (const [k, v] of Object.entries(prev)) {
        if (v && validIds.has(String(k))) next[k] = true
      }
      return next
    })
  }, [filteredSectionsFull])

  const SortIndicator = ({ currentSort, columnKey }) => {
    if (currentSort.key !== columnKey)
      return (
        <HugeIcon  className="ph-bold ph-caret-up-down ml-1 opacity-20 transition-opacity group-hover:opacity-100"></HugeIcon>
      )
    return (
      <HugeIcon 
        className={`ph-bold ml-1 text-pup-maroon dark:text-primary ${currentSort.direction === "asc" ? "ph-caret-up" : "ph-caret-down"} dark:text-primary`}
      ></HugeIcon>
    )
  }

  // Selection Handlers
  const toggleDocTypeSelected = (id, event) => {
    const isSelected = !!selectedDocTypes[id]

    if (event?.shiftKey && lastSelectedDocId) {
      if (isSelected) {
        const selectedCount = Object.values(selectedDocTypes).filter(Boolean).length
        if (selectedCount > 1) {
          setSelectedDocTypes({ [id]: true })
          setLastSelectedDocId(id)
        } else {
          setSelectedDocTypes({})
          setLastSelectedDocId(null)
        }
        return
      }

      const currentIdx = filteredDocTypes.findIndex((dt) => dt.id === id)
      const lastIdx = filteredDocTypes.findIndex((dt) => dt.id === lastSelectedDocId)

      if (currentIdx !== -1 && lastIdx !== -1) {
        const start = Math.min(currentIdx, lastIdx)
        const end = Math.max(currentIdx, lastIdx)
        const itemsInRange = filteredDocTypes.slice(start, end + 1)

        setSelectedDocTypes((prev) => {
          const next = { ...prev }
          itemsInRange.forEach((item) => {
            next[item.id] = true
          })
          return next
        })
        setLastSelectedDocId(id)
        return
      }
    }

    setSelectedDocTypes((prev) => ({ ...prev, [id]: !prev[id] }))
    setLastSelectedDocId(id)
  }

  const toggleAllDocTypes = (checked) => {
    if (!checked) {
      setSelectedDocTypes({})
      setLastSelectedDocId(null)
    } else {
      const next = {}
      filteredDocTypes.forEach((dt) => {
        next[dt.id] = true
      })
      setSelectedDocTypes(next)
    }
  }

  const toggleCourseSelected = (id, event) => {
    const isSelected = !!selectedCourses[id]

    if (event?.shiftKey && lastSelectedCourseId) {
      if (isSelected) {
        const selectedCount = Object.values(selectedCourses).filter(Boolean).length
        if (selectedCount > 1) {
          setSelectedCourses({ [id]: true })
          setLastSelectedCourseId(id)
        } else {
          setSelectedCourses({})
          setLastSelectedCourseId(null)
        }
        return
      }

      const currentIdx = filteredCourses.findIndex((c) => c.id === id)
      const lastIdx = filteredCourses.findIndex((c) => c.id === lastSelectedCourseId)

      if (currentIdx !== -1 && lastIdx !== -1) {
        const start = Math.min(currentIdx, lastIdx)
        const end = Math.max(currentIdx, lastIdx)
        const itemsInRange = filteredCourses.slice(start, end + 1)

        setSelectedCourses((prev) => {
          const next = { ...prev }
          itemsInRange.forEach((item) => {
            next[item.id] = true
          })
          return next
        })
        setLastSelectedCourseId(id)
        return
      }
    }

    setSelectedCourses((prev) => ({ ...prev, [id]: !prev[id] }))
    setLastSelectedCourseId(id)
  }

  const toggleAllCourses = (checked) => {
    if (!checked) {
      setSelectedCourses({})
      setLastSelectedCourseId(null)
    } else {
      const next = {}
      filteredCourses.forEach((c) => {
        next[c.id] = true
      })
      setSelectedCourses(next)
    }
  }

  const toggleSectionSelected = (id, event) => {
    const isSelected = !!selectedSections[id]

    if (event?.shiftKey && lastSelectedSectionId) {
      if (isSelected) {
        const selectedCount = Object.values(selectedSections).filter(Boolean).length
        if (selectedCount > 1) {
          setSelectedSections({ [id]: true })
          setLastSelectedSectionId(id)
        } else {
          setSelectedSections({})
          setLastSelectedSectionId(null)
        }
        return
      }

      const currentIdx = filteredSections.findIndex((s) => s.id === id)
      const lastIdx = filteredSections.findIndex((s) => s.id === lastSelectedSectionId)

      if (currentIdx !== -1 && lastIdx !== -1) {
        const start = Math.min(currentIdx, lastIdx)
        const end = Math.max(currentIdx, lastIdx)
        const itemsInRange = filteredSections.slice(start, end + 1)

        setSelectedSections((prev) => {
          const next = { ...prev }
          itemsInRange.forEach((item) => {
            next[item.id] = true
          })
          return next
        })
        setLastSelectedSectionId(id)
        return
      }
    }

    setSelectedSections((prev) => ({ ...prev, [id]: !prev[id] }))
    setLastSelectedSectionId(id)
  }

  const toggleAllSections = (checked) => {
    if (!checked) {
      setSelectedSections({})
      setLastSelectedSectionId(null)
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
        ids.map(async (id) => {
          let res
          if (category === "DocumentType") {
            if (isRestore) {
              res = await fetch(`/api/doc-types?id=${id}&silent=1`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Active" }),
              })
            } else {
              res = await fetch(`/api/doc-types?id=${id}&silent=1`, {
                method: "DELETE",
              })
            }
          } else if (category === "Course") {
            if (isRestore) {
              res = await fetch(`/api/courses?id=${id}&restore=true&silent=1`, {
                method: "DELETE",
              })
            } else {
              res = await fetch(`/api/courses?id=${id}&silent=1`, { method: "DELETE" })
            }
          } else if (category === "Section") {
            if (isRestore) {
              res = await fetch(`/api/sections?id=${id}&restore=true&silent=1`, {
                method: "DELETE",
              })
            } else {
              res = await fetch(`/api/sections?id=${id}&silent=1`, {
                method: "DELETE",
              })
            }
          }
          if (res && !res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data?.error || `Failed to ${action} item`)
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

  async function loadAll(isManual = false) {
    if (isManual) setLoading(true)
    setError(null)
    try {
      const q = "includeArchived=true"

      const [rDoc, rCourse, rSec] = await Promise.all([
        fetch(`/api/doc-types?admin=true${q ? "&" + q : ""}`, { cache: "no-store" }),
        fetch(`/api/courses${q ? "?" + q : ""}`, { cache: "no-store" }),
        fetch(`/api/sections${q ? "?" + q : ""}`, { cache: "no-store" }),
        isManual ? new Promise((resolve) => setTimeout(resolve, 600)) : Promise.resolve(),
      ])

      const jDoc = await rDoc.json()
      const jCourse = await rCourse.json()
      const jSec = await rSec.json()

      if (!rDoc.ok || !jDoc.ok)
        throw new Error(jDoc.error || "Failed doc-types")
      if (!rCourse.ok || !jCourse.ok)
        throw new Error(jCourse.error || "Failed courses")
      if (!rSec.ok || !jSec.ok) throw new Error(jSec.error || "Failed sections")

      setDocTypes(jDoc.data)
      setCourses(jCourse.data)
      setSections(jSec.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }






  // --- ACTIONS: Export Taxonomy ---
  const downloadCsv = (entityLabel, content) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    const finalFilename = generateExportFilename("TAXONOMY", entityLabel, "csv")

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
    downloadCsv("DOCUMENT-TYPES", headers + csvContent)
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
    downloadCsv("DEGREE-PROGRAMS", headers + csvContent)
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
    downloadCsv("COURSE-BLOCKS", headers + csvContent)
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
          // Deep Validation: Check if the program code exists in DB or in the CSV itself
          const csvCourseCodes = new Set();
          lines.slice(1).forEach((l) => {
            const vals = l.split(",")
            const r = {}
            headers.forEach((h, hIdx) => {
              r[h] = vals[hIdx]?.trim() || ""
            })
            if (String(r.category || "").toLowerCase().trim() === "course" && r.code) {
              csvCourseCodes.add(String(r.code).trim().toLowerCase())
            }
          });

          const exists = courses.some(
            (c) => c.code.toLowerCase() === code.toLowerCase()
          ) || csvCourseCodes.has(code.toLowerCase())
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
            // Deep Validation: Check if the program code exists in DB or in current staged import rows
            const existsInImport = prev.some(
              (r) => r.index !== index && r.category.toLowerCase() === "course" && r.code.toLowerCase() === code.toLowerCase()
            )
            const exists = courses.some(
              (c) => c.code.toLowerCase() === code.toLowerCase()
            ) || existsInImport
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
      const existsInImport = importRows.some(
        (r) => r.category.toLowerCase() === "course" && r.code.toLowerCase() === code.toLowerCase()
      )
      const exists = courses.some(
        (c) => c.code.toLowerCase() === code.toLowerCase()
      ) || existsInImport
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
    const sample = isOsas
      ? "Category,Name,Code\nDocumentType,Event Proposal,\nDocumentType,Constitution & By-Laws (CBL),\nDocumentType,Activity Request,\nDocumentType,Financial Liquidation Report,\nCourse,Bachelor of Science in Information Technology,BSIT\nCourse,Bachelor of Science in Accountancy,BSA"
      : "Category,Name,Code\nDocumentType,Transcript of Records,\nDocumentType,Diploma,\nCourse,Bachelor of Science in Information Technology,BSIT\nCourse,Bachelor of Science in Accountancy,BSA\nSection,Block 1,BSIT\nSection,Section 1,BSA";
    navigator.clipboard.writeText(sample);
    showToast({
      title: "CSV sample copied to clipboard.",
    });
  }

  /* if (loading && !docTypes.length) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md rounded-xl dark:bg-muted" />
        <Skeleton className="h-[400px] w-full rounded-2xl dark:bg-muted" />
      </div>
    )
  } */

  const activeError = errorProp || error

  if (activeError) {
    return (
      <div className="animate-fade-up font-jakarta flex w-full flex-col gap-6">
        <Card className="flex flex-col overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-sm dark:bg-card dark:shadow-none dark:border-white/10">
          <CardContent className="flex flex-col p-6">
            <Empty className="flex h-[400px] flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                  <HugeIcon  className="ph-duotone ph-warning-circle text-xl text-pup-maroon dark:text-primary" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                  Could not load configuration
                </EmptyTitle>
                <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600 dark:text-zinc-300">
                  {activeError}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="animate-fade-up font-jakarta flex w-full flex-1 flex-col gap-4 min-h-0">
        <Tabs
          defaultValue="document-types"
          value={activeSubTab}
          onValueChange={setActiveSubTab}
          className="flex flex-col gap-4 w-full flex-1 min-h-0"
        >
          {/* Top Section Switcher Pill */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100/90 dark:bg-zinc-900/80 border border-gray-200/80 dark:border-white/10 w-fit select-none overflow-x-auto max-w-full scrollbar-hide">
            <button
              type="button"
              onClick={() => setActiveSubTab("document-types")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0",
                activeSubTab === "document-types"
                  ? "bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent"
              )}
            >
              <HugeIcon  className="ph-bold ph-files text-sm" />
              <span>Document Types</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("degree-programs")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0",
                activeSubTab === "degree-programs"
                  ? "bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent"
              )}
            >
              <HugeIcon  className="ph-bold ph-graduation-cap text-sm" />
              <span>Degree Programs</span>
            </button>

            {!isOsas && (
              <button
                type="button"
                onClick={() => setActiveSubTab("course-blocks")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0",
                  activeSubTab === "course-blocks"
                    ? "bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent"
                )}
              >
                <HugeIcon  className="ph-bold ph-users-three text-sm" />
                <span>Course Blocks</span>
              </button>
            )}



            <button
              type="button"
              onClick={() => setActiveSubTab("bulk-import")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0",
                activeSubTab === "bulk-import"
                  ? "bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent"
              )}
            >
              <HugeIcon  className="ph-bold ph-file-arrow-up text-sm" />
              <span>Imports</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("recognition-templates")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0",
                activeSubTab === "recognition-templates"
                  ? "bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent"
              )}
            >
              <HugeIcon  className="ph-bold ph-scan text-sm" />
              <span>OCR Configuration</span>
            </button>
          </div>

          <Card className="p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none w-full flex flex-col min-h-0">
            <div className="relative flex flex-1 flex-col p-0 w-full min-h-0">
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
                setSelectedDocTypes={setSelectedDocTypes}
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

            <TabsContent value="recognition-templates" className="m-0 flex flex-col border-0 focus-visible:ring-0">
              <RecognitionTemplatesTab showToast={showToast} />
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
                setSelectedCourses={setSelectedCourses}
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
              className="m-0 flex flex-1 flex-col border-0 focus-visible:ring-0 min-h-0"
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
                setImportSelected={setImportSelected}
                toggleImportRowSelected={toggleImportRowSelected}
                toggleImportSelectAll={toggleImportSelectAll}
                executeBulkImport={executeBulkImport}
                importResults={importResults}
                setActiveSubTab={setActiveSubTab}
                onUpdateRow={handleUpdateImportRow}
                onAddRow={handleManualAddRow}
                courses={courses}
                isOsas={isOsas}
                authUser={authUser}
              />
            </TabsContent>
          </div>
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
          isAppleStyled={true}
          isArchiveModal={confirmPayload.title?.toLowerCase().includes("archive") && !confirmPayload.title?.toLowerCase().includes("delete")}
          isRestoreModal={confirmPayload.title?.toLowerCase().includes("restore") && !confirmPayload.title?.toLowerCase().includes("system")}
        />
      </div>
    </TooltipProvider>
  )
}
