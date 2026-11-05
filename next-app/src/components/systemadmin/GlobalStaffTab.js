"use client"
import useViewPreference from "@/hooks/useViewPreference"
import DashboardSearch from "@/components/systemadmin/DashboardSearch"
import { Table } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";
import SheetPagination from "@/components/shared/SheetPagination";
import CreateAnotherToggle from "@/components/shared/CreateAnotherToggle"
import useCreateAnother from "@/hooks/useCreateAnother"


import useUrlPage from "@/hooks/useUrlPage"
import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import GlobalStaffSkeleton from "@/components/systemadmin/skeletons/GlobalStaffSkeleton"
import PersonnelActionsMenu from "@/components/systemadmin/PersonnelActionsMenu"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import PageHeader from "@/components/shared/PageHeader"
import ProfileAvatar from "@/components/shared/ProfileAvatar"
import { RefreshButton } from "@/components/shared/RefreshButton"
import ConfirmModal from "@/components/shared/ConfirmModal"
import CopyButton from "@/components/shared/CopyButton"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import { Select } from "@/components/ui/select"
import { FilterPopover, SortPopover, GroupPopover, ColumnsPopover } from "@/components/systemadmin/OfficeTableControls"
import ActiveFilterChips from "@/components/shared/ActiveFilterChips"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { cn, formatTitleCase } from "@/lib/utils"
import { formatPHDateTime } from "@/lib/timeFormat"
import { getCachedData, setCachedData, invalidateDataCache } from "@/lib/dataCache"
import { isSystemAdminRole, getOfficeRoleLabel, getOfficePrefix, registerOffices } from "@/lib/roleUtils"
import useTableScroll from "@/hooks/useTableScroll"
import TableScrollControls from "@/components/shared/TableScrollControls"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import { Archive01Icon as EmptyArchive01Icon, Search01Icon as EmptySearch01Icon, UserGroupIcon as EmptyUserGroupIcon, ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, Building01Icon, Cancel01Icon, Clock01Icon, Copy01Icon, Loading01Icon, Search01Icon, Archive01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <ArrowUpDownIcon size="1em" className="ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></ArrowUpDownIcon>
  }
  return sortOrder === "ASC" ? (
    <ArrowUp01Icon size="1em" className="ml-1 text-[12px] text-gray-400"></ArrowUp01Icon>
  ) : (
    <ArrowDown01Icon size="1em" className="ml-1 text-[12px] text-gray-400"></ArrowDown01Icon>
  )
}

const getStaffCleanName = (staff) => {
  const f = staff?.fname && !staff.fname.startsWith("enc:v1:") ? staff.fname.trim() : ""
  const l = staff?.lname && !staff.lname.startsWith("enc:v1:") ? staff.lname.trim() : ""
  const full = `${f} ${l}`.trim()
  if (full) return formatTitleCase(full)
  return staff?.id ? `Staff (${staff.id})` : "Staff Member"
}

const getStaffCleanEmail = (staff) => {
  if (staff?.email && !staff.email.startsWith("enc:v1:")) return staff.email
  return "N/A"
}

export default function GlobalStaffTab({ authUser, showToast }) {
  const router = useRouter()
  const [staff, setStaff] = useState([])
  const [offices, setOffices] = useState([])
  const [loading, setLoading] = useState(true)
  const [isManualLoading, setIsManualLoading] = useState(false)

  // Filters & Search
  const [search, setSearch] = useViewPreference("staff", "search", "")
  const [staffFilters, setStaffFilters] = useViewPreference("staff", "staffFilters", {
    role: [],
    office: [],
  })
  const [statusFilter, setStatusFilter] = useViewPreference("staff", "statusFilter", "Active")
  const [filterRules, setFilterRules] = useViewPreference("staff", "filterRules", [])

  // Sorting
  const [sortBy, setSortBy] = useViewPreference("staff", "sortBy", "name")
  const [sortOrder, setSortOrder] = useViewPreference("staff", "sortOrder", "ASC")

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"))
    } else {
      setSortBy(column)
      setSortOrder("ASC")
    }
  }

  // Pagination
  const [page, setPage] = useUrlPage()
  const [pageSize, setPageSize] = useViewPreference("staff", "pageSize", 20)

  // Multi-Selection State & Batch Actions
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [lastSelectedId, setLastSelectedId] = useState(null)
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false)
  const [bulkArchiveLoading, setBulkArchiveLoading] = useState(false)
  const [bulkRestoreOpen, setBulkRestoreOpen] = useState(false)
  const [bulkRestoreLoading, setBulkRestoreLoading] = useState(false)

  // Reset page and selection when search or filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      setSelectedIds(new Set())
      setLastSelectedId(null)
    }, 0)
    return () => clearTimeout(timer)
  }, [search, staffFilters, filterRules, statusFilter, setPage])

  // Detail Sheet & Dialogs
  const [inspectMember, setInspectMember] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const { attachForm, ...repeat } = useCreateAnother(formOpen)
  const [isEditing, setIsEditing] = useState(false)
  const [targetIsExistingSysAdmin, setTargetIsExistingSysAdmin] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState(null)

  const [form, setForm] = useState({
    id: "",
    office_id: "",
    fname: "",
    lname: "",
    role: "Staff",
    section: "",
    email: "",
    status: "Active"
  })

  const [submitLoading, setSubmitLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState(null)
  const [pwDialogOpen, setPwDialogOpen] = useState(false)
  const [nextIdPreview, setNextIdPreview] = useState("")

  const fnameRef = useRef(null)

  const suggestedEmail = useMemo(() => {
    if (isEditing) return ""
    if (!form.lname || !form.role) return ""
    const role = form.role.toLowerCase().replace(/[^a-z0-9]/g, "")
    const name = form.lname.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (!name) return ""
    return `${role}.${name}@pup.local`
  }, [isEditing, form.lname, form.role])

  // Auto-fill Email based on name and role when registering
  useEffect(() => {
    if (isEditing) return
    if (suggestedEmail && form.email !== suggestedEmail) {
      const timer = setTimeout(() => {
        setForm((f) => ({ ...f, email: suggestedEmail }))
      }, 0)
      return () => clearTimeout(timer)
    }
    if (!suggestedEmail && form.email !== "") {
      const timer = setTimeout(() => {
        setForm((f) => ({ ...f, email: "" }))
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isEditing, suggestedEmail, form.email])

  useEffect(() => {
    if (formOpen && !isEditing) {
      const timer = setTimeout(() => {
        fnameRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [formOpen, isEditing])

  // Fetch next available staff ID from the system
  useEffect(() => {
    let active = true
    if (formOpen && !isEditing) {
      const off = form.role === "SystemAdmin" ? "global" : (form.office_id || "")
      const r = form.role || "Staff"
      fetch(`/api/staff/next-id?officeId=${encodeURIComponent(off)}&role=${encodeURIComponent(r)}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((json) => {
          if (active && json.ok && json.nextId) {
            setNextIdPreview(json.nextId)
          }
        })
        .catch(() => { })
    }
    return () => {
      active = false
    }
  }, [formOpen, isEditing, form.office_id, form.role, repeat.savedCount])

  // Archive & Restore Confirmation Modals
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const fetchData = useCallback(async () => {
    // SWR Cache-first: instant render from cache if available
    const cachedStaff = getCachedData("systemadmin_staff")
    const cachedOffices = getCachedData("systemadmin_offices")
    if (Array.isArray(cachedStaff) && Array.isArray(cachedOffices)) {
      setStaff(cachedStaff)
      setOffices(cachedOffices)
      registerOffices(cachedOffices)
      setLoading(false)
    }

    try {
      const [resStaff, resOffices] = await Promise.all([
        fetch("/api/staff?limit=500"),
        fetch("/api/offices")
      ])
      const [jsonStaff, jsonOffices] = await Promise.all([
        resStaff.json(),
        resOffices.json()
      ])
      if (resStaff.ok && jsonStaff.ok && Array.isArray(jsonStaff.data)) {
        setStaff(jsonStaff.data)
        setCachedData("systemadmin_staff", jsonStaff.data, 60000)
      }
      if (resOffices.ok && jsonOffices.ok && Array.isArray(jsonOffices.data)) {
        setOffices(jsonOffices.data)
        registerOffices(jsonOffices.data)
        setCachedData("systemadmin_offices", jsonOffices.data, 120000)
      }
    } catch {
      if (!cachedStaff) {
        showToast("Failed to load directory data", true)
      }
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const handleManualRefresh = useCallback(async () => {
    setIsManualLoading(true)
    try {
      await fetchData()
    } finally {
      setIsManualLoading(false)
    }
  }, [fetchData])

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 0)
    return () => clearTimeout(timer)
  }, [fetchData])

  useEffect(() => {
    const handleSwitch = (e) => {
      if (e.detail?.officeId) {
        setStaffFilters((prev) => ({ ...prev, office: [e.detail.officeId] }))
      } else if (e.detail?.view === "staff") {
        setStaffFilters({ role: [], office: [] })
      }
    }
    window.addEventListener("switch-view", handleSwitch)
    return () => window.removeEventListener("switch-view", handleSwitch)
  }, [setStaffFilters])

  const handleOpenCreate = () => {
    setIsEditing(false)
    setTargetIsExistingSysAdmin(false)
    setSelectedStaffId(null)
    setForm({
      id: "",
      office_id: offices[0]?.id || "",
      fname: "",
      lname: "",
      role: "Staff",
      section: "Administration",
      email: "",
      status: "Active"
    })
    setFormOpen(true)
  }

  const handleOpenEdit = (member) => {
    if (member.status === "Inactive" || member.status === "Archived") {
      showToast("Archived accounts cannot be edited. Please restore the account first.", true)
      return
    }
    const isSysAdmin = member.role === "SystemAdmin" || member.role === "SuperAdmin"
    setIsEditing(true)
    setTargetIsExistingSysAdmin(isSysAdmin)
    setSelectedStaffId(member.id)
    setForm({
      id: member.id,
      office_id: member.office_id || "",
      fname: member.fname,
      lname: member.lname,
      role: isSysAdmin ? "SystemAdmin" : member.role,
      section: member.section || "",
      email: member.email,
      status: member.status
    })
    setFormOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Existing accounts cannot be changed or promoted to System Admin
    if (isEditing && !targetIsExistingSysAdmin && (form.role === "SystemAdmin" || !form.office_id)) {
      showToast("Existing accounts cannot be made a System Admin", true)
      return
    }

    // Non-SystemAdmin accounts must have an assigned office
    if (form.role !== "SystemAdmin" && !form.office_id) {
      showToast("Please select an assigned office/department", true)
      return
    }
    if (!repeat.beginSave()) return
    setSubmitLoading(true)

    try {
      const url = isEditing ? `/api/staff/${selectedStaffId}` : "/api/staff"
      const method = isEditing ? "PATCH" : "POST"

      const payload = {
        id: isEditing ? form.id.trim() : (form.id?.trim() || nextIdPreview || undefined),
        fname: form.fname.trim(),
        lname: form.lname.trim(),
        role: form.role,
        section: (form.section && form.section.trim()) || "Administration",
        email: (form.email || suggestedEmail).trim(),
        office_id: form.role === "SystemAdmin" ? null : (form.office_id || null),
        status: form.status
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (res.ok && json.ok) {
        showToast(isEditing
          ? "Personnel updated successfully"
          : json.credentialEmail?.sent
            ? "Personnel account created. Credentials were emailed to the new user."
            : "Personnel account created, but the credential email was not sent. Check SMTP settings.",
          !isEditing && !json.credentialEmail?.sent)
        if (!isEditing) {
          repeat.complete(() => {
            setNextIdPreview("")
            setForm((current) => ({ ...current, id: "", fname: "", lname: "", email: "", status: "Active" }))
          }, () => setFormOpen(false))
        } else {
          setFormOpen(false)
        }
        invalidateDataCache("systemadmin_staff")
        invalidateDataCache("systemadmin_offices_stats")
        Promise.resolve().then(() => fetchData()).catch(() => {
          showToast("Personnel saved. Refresh the directory to see the updated list.", true)
        })

        if (!isEditing && json.defaultPassword) {
          setTempPassword(json.defaultPassword)
          setPwDialogOpen(true)
        }
      } else {
        showToast(json.error || "Failed to save personnel profile", true)
      }
    } catch {
      showToast("Network error saving personnel", true)
    } finally {
      setSubmitLoading(false)
      repeat.endSave()
    }
  }

  const confirmArchivePersonnel = async () => {
    if (!archiveTarget) return
    setIsArchiving(true)
    try {
      const res = await fetch(`/api/staff/${archiveTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Inactive" })
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setSelectedIds((prev) => {
          if (!prev.has(archiveTarget.id)) return prev
          const next = new Set(prev)
          next.delete(archiveTarget.id)
          return next
        })
        showToast(`Personnel account for ${getStaffCleanName(archiveTarget)} has been archived.`)
        setArchiveTarget(null)
        invalidateDataCache("systemadmin_staff")
        invalidateDataCache("systemadmin_offices_stats")
        fetchData()
      } else {
        showToast(json.error || "Failed to archive personnel account", true)
      }
    } catch {
      showToast("Network error archiving personnel account", true)
    } finally {
      setIsArchiving(false)
    }
  }

  const confirmRestorePersonnel = async () => {
    if (!restoreTarget) return
    setIsRestoring(true)
    try {
      const res = await fetch(`/api/staff/${restoreTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Active" })
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setSelectedIds((prev) => {
          if (!prev.has(restoreTarget.id)) return prev
          const next = new Set(prev)
          next.delete(restoreTarget.id)
          return next
        })
        showToast(`Personnel account for ${getStaffCleanName(restoreTarget)} has been restored to Active.`)
        setRestoreTarget(null)
        invalidateDataCache("systemadmin_staff")
        invalidateDataCache("systemadmin_offices_stats")
        fetchData()
      } else {
        showToast(json.error || "Failed to restore personnel account", true)
      }
    } catch {
      showToast("Network error restoring personnel account", true)
    } finally {
      setIsRestoring(false)
    }
  }

  const staffFilterGroups = useMemo(() => {
    const roleOptions = [
      {
        value: "SystemAdmin",
        label: "System Admin",
        dotColor: "bg-purple-500",
        count: staff.filter((s) => isSystemAdminRole(s.role) && (statusFilter === "Active" ? s.status === "Active" : s.status !== "Active")).length,
      },
      {
        value: "Admin",
        label: "Administrator",
        dotColor: "bg-pup-maroon",
        count: staff.filter((s) => s.role === "Admin" && (statusFilter === "Active" ? s.status === "Active" : s.status !== "Active")).length,
      },
      {
        value: "Staff",
        label: "Regular Staff",
        dotColor: "bg-blue-500",
        count: staff.filter((s) => s.role === "Staff" && (statusFilter === "Active" ? s.status === "Active" : s.status !== "Active")).length,
      },
    ];

    const officeOptions = [
      {
        value: "global",
        label: "System Admin (Platform)",
        count: staff.filter((s) => !s.office_id && (statusFilter === "Active" ? s.status === "Active" : s.status !== "Active")).length,
      },
      ...(Array.isArray(offices) ? offices : []).map((o) => ({
        value: o.id,
        label: o.short_name || o.name,
        count: staff.filter((s) => s.office_id === o.id && (statusFilter === "Active" ? s.status === "Active" : s.status !== "Active")).length,
      })),
    ];

    return [
      {
        id: "role",
        label: "Personnel Role",
        options: roleOptions,
      },
      {
        id: "office",
        label: "Office Partition",
        options: officeOptions,
      },
    ];
  }, [staff, offices, statusFilter]);


  const filteredStaff = useMemo(() => {
    const selectedRoles = staffFilters.role || [];
    const selectedOffices = staffFilters.office || [];

    const list = staff.filter((member) => {
      const cleanName = getStaffCleanName(member).toLowerCase()
      const cleanEmail = getStaffCleanEmail(member).toLowerCase()
      // Search query filter
      const matchesSearch =
        !search ||
        cleanName.includes(search.toLowerCase()) ||
        cleanEmail.includes(search.toLowerCase()) ||
        member.id.toLowerCase().includes(search.toLowerCase())

      // Office filter
      const matchesOffice =
        selectedOffices.length === 0 ||
        selectedOffices.some((off) => {
          if (off === "global") return !member.office_id;
          return member.office_id === off;
        });

      // Role filter
      const matchesRole =
        selectedRoles.length === 0 ||
        selectedRoles.some((r) => {
          if (r === "SystemAdmin") return isSystemAdminRole(member.role);
          return member.role === r;
        });

      // Status filter
      const matchesStatus = statusFilter === "Active"
        ? member.status === "Active"
        : (member.status === "Inactive" || member.status === "Archived")

      const matchesRules = filterRules.every((rule) => {
        const actual = rule.fieldKey === "role" ? (isSystemAdminRole(member.role) ? "SystemAdmin" : member.role) : (member.office_id || "global")
        return rule.operator === "is_not" ? String(actual) !== String(rule.value) : String(actual) === String(rule.value)
      })
      return matchesSearch && matchesOffice && matchesRole && matchesStatus && matchesRules
    })

    list.sort((a, b) => {
      let valA = ""
      let valB = ""
      if (sortBy === "name") {
        valA = getStaffCleanName(a).toLowerCase()
        valB = getStaffCleanName(b).toLowerCase()
      } else if (sortBy === "email") {
        valA = getStaffCleanEmail(a).toLowerCase()
        valB = getStaffCleanEmail(b).toLowerCase()
      } else if (sortBy === "id") {
        valA = (a.id || "").toLowerCase()
        valB = (b.id || "").toLowerCase()
      } else if (sortBy === "office") {
        const offList = Array.isArray(offices) ? offices : []
        const offA = offList.find((o) => o.id === a.office_id)?.short_name || "Platform Level"
        const offB = offList.find((o) => o.id === b.office_id)?.short_name || "Platform Level"
        valA = offA.toLowerCase()
        valB = offB.toLowerCase()
      } else if (sortBy === "role") {
        valA = (a.role || "").toLowerCase()
        valB = (b.role || "").toLowerCase()
      } else if (sortBy === "section") {
        valA = (a.section || "").toLowerCase()
        valB = (b.section || "").toLowerCase()
      } else if (sortBy === "last_active" || sortBy === "created_at" || sortBy === "updated_at") {
        valA = a[sortBy] ? new Date(a[sortBy]).getTime() : 0
        valB = b[sortBy] ? new Date(b[sortBy]).getTime() : 0
      } else if (sortBy === "totp_enabled") {
        valA = Number(Boolean(a.totp_enabled))
        valB = Number(Boolean(b.totp_enabled))
      }

      if (valA < valB) return sortOrder === "ASC" ? -1 : 1
      if (valA > valB) return sortOrder === "ASC" ? 1 : -1
      return 0
    })

    return list
  }, [staff, search, staffFilters, statusFilter, sortBy, sortOrder, offices, filterRules])

  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedStaff = filteredStaff.slice(startIndex, endIndex)

  // Horizontal table scrolling hook
  const {
    tableContainerRef,
    canScrollLeft,
    canScrollRight,
    isScrolled,
    scrollLeft,
    scrollRight,
    resetScroll,
  } = useTableScroll([paginatedStaff?.length]);

  // Auto-reset scroll to start when page, pageSize, search, or filters change
  useEffect(() => {
    resetScroll();
  }, [page, pageSize, search, staffFilters, statusFilter, resetScroll]);

  // Clear selection when changing tabs, page, or filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedIds(new Set())
      setLastSelectedId(null)
    }, 0)
    return () => clearTimeout(timer)
  }, [statusFilter, page, pageSize, search, staffFilters, filterRules])

  // Prune stale selected IDs when filtered staff updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedIds((prev) => {
        if (prev.size === 0) return prev
        const validIds = new Set(filteredStaff.map((s) => s.id))
        let needsPruning = false
        for (const id of prev) {
          if (!validIds.has(id)) {
            needsPruning = true
            break
          }
        }
        if (!needsPruning) return prev
        const next = new Set()
        for (const id of prev) {
          if (validIds.has(id)) next.add(id)
        }
        return next
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [filteredStaff])

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(
        new Set(
          paginatedStaff
            .filter((s) => s.id !== authUser?.id)
            .map((s) => s.id)
        )
      )
    } else {
      setSelectedIds(new Set())
    }
    setLastSelectedId(null)
  }

  const toggleSelect = (id, event) => {
    const isSelected = selectedIds.has(id)

    if (event?.shiftKey && lastSelectedId) {
      if (isSelected) {
        if (selectedIds.size > 1) {
          setSelectedIds(new Set([id]))
          setLastSelectedId(id)
        } else {
          setSelectedIds(new Set())
          setLastSelectedId(null)
        }
        return
      }

      const currentIdx = paginatedStaff.findIndex((s) => s.id === id)
      const lastIdx = paginatedStaff.findIndex((s) => s.id === lastSelectedId)

      if (currentIdx !== -1 && lastIdx !== -1) {
        const start = Math.min(currentIdx, lastIdx)
        const end = Math.max(currentIdx, lastIdx)
        const idsInRange = paginatedStaff
          .slice(start, end + 1)
          .filter((s) => s.id !== authUser?.id)
          .map((s) => s.id)

        const next = new Set(selectedIds)
        idsInRange.forEach((rangeId) => next.add(rangeId))

        setSelectedIds(next)
        setLastSelectedId(id)
        return
      }
    }

    const next = new Set(selectedIds)
    if (isSelected) {
      next.delete(id)
      setLastSelectedId(null)
    } else {
      next.add(id)
      setLastSelectedId(id)
    }
    setSelectedIds(next)
  }

  const confirmBulkArchive = async () => {
    if (bulkArchiveLoading || selectedIds.size === 0) return
    setBulkArchiveLoading(true)
    try {
      let successCount = 0
      let failCount = 0
      const idsToArchive = Array.from(selectedIds)

      for (const id of idsToArchive) {
        if (id === authUser?.id) {
          failCount++
          continue
        }
        const res = await fetch(`/api/staff/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Inactive" })
        })
        const json = await res.json()
        if (res.ok && json.ok) {
          setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, status: "Inactive" } : s)))
          successCount++
        } else {
          failCount++
        }
      }

      showToast(`Archived ${successCount} personnel account(s)${failCount > 0 ? ` (${failCount} failed)` : ""}`)
      setBulkArchiveOpen(false)
      setSelectedIds(new Set())
      invalidateDataCache("systemadmin_staff")
      invalidateDataCache("systemadmin_offices_stats")
      fetchData()
    } catch {
      showToast("Network error archiving selected accounts", true)
    } finally {
      setBulkArchiveLoading(false)
    }
  }

  const confirmBulkRestore = async () => {
    if (bulkRestoreLoading || selectedIds.size === 0) return
    setBulkRestoreLoading(true)
    try {
      let successCount = 0
      let failCount = 0
      const idsToRestore = Array.from(selectedIds)

      for (const id of idsToRestore) {
        const res = await fetch(`/api/staff/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Active" })
        })
        const json = await res.json()
        if (res.ok && json.ok) {
          setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, status: "Active" } : s)))
          successCount++
        } else {
          failCount++
        }
      }

      showToast(`Restored ${successCount} personnel account(s)${failCount > 0 ? ` (${failCount} failed)` : ""}`)
      setBulkRestoreOpen(false)
      setSelectedIds(new Set())
      invalidateDataCache("systemadmin_staff")
      invalidateDataCache("systemadmin_offices_stats")
      fetchData()
    } catch {
      showToast("Network error restoring selected accounts", true)
    } finally {
      setBulkRestoreLoading(false)
    }
  }

  const handleCopyEmails = () => {
    const selectedMembers = staff.filter((m) => selectedIds.has(m.id))
    const emails = selectedMembers.map((m) => m.email).filter(Boolean)
    if (emails.length === 0) {
      showToast?.("No email addresses found for selected personnel", true)
      return
    }
    navigator.clipboard.writeText(emails.join("; "))
    showToast?.(`Copied ${emails.length} email address${emails.length === 1 ? "" : "es"} to clipboard`)
  }

  const handleCopyIds = () => {
    const selectedMembers = staff.filter((m) => selectedIds.has(m.id))
    const ids = selectedMembers.map((m) => m.id).filter(Boolean)
    if (ids.length === 0) {
      showToast?.("No IDs found for selected personnel", true)
      return
    }
    navigator.clipboard.writeText(ids.join(", "))
    showToast?.(`Copied ${ids.length} employee ID${ids.length === 1 ? "" : "s"} to clipboard`)
  }

  const stats = useMemo(() => {
    const total = staff.length
    const active = staff.filter((s) => s.status === "Active").length
    const inactive = staff.filter((s) => s.status !== "Active").length
    const admins = staff.filter(
      (s) => s.role === "Admin" || s.role === "SystemAdmin" || s.role === "SuperAdmin"
    ).length
    const assignedOffices = new Set(staff.map((s) => s.office_id).filter(Boolean)).size
    return {
      total,
      active,
      inactive,
      admins,
      assignedOffices,
    }
  }, [staff])

  const hasActiveFilters =
    search !== "" ||
    (staffFilters.role?.length > 0) ||
    (staffFilters.office?.length > 0) ||
    filterRules.length > 0

  const handleClearFilters = () => {
    setSearch("")
    setStaffFilters({ role: [], office: [] })
    setFilterRules([])
    setPage(1)
  }

  const [groupBy, setGroupBy] = useViewPreference("staff", "groupBy", "none")
  const [visibleColumns, setVisibleColumns] = useViewPreference("staff", "visibleColumns", ["name", "email", "office", "role"])
  const optionalColumns = [
    { key: "name", label: "Staff Name" },
    { key: "email", label: "Email" },
    { key: "office", label: "Office Partition" },
    { key: "role", label: "Privilege Level" },
    { key: "section", label: "Administrative Section" },
    { key: "last_active", label: "Last Sign-in" },
    { key: "totp_enabled", label: "Two-step Verification" },
    { key: "created_at", label: "Date Added" },
    { key: "updated_at", label: "Last Updated" },
  ]
  const filterFields = [
    { key: "role", label: "Role", icon: EmptyUserGroupIcon, options: [{ value: "SystemAdmin", label: "System Admin" }, { value: "Admin", label: "Administrator" }, { value: "Staff", label: "Regular Staff" }] },
    { key: "office", label: "Office", icon: Building01Icon, options: [{ value: "global", label: "Platform Level" }, ...offices.map((office) => ({ value: office.id, label: office.short_name || office.name }))] },
  ]
  const orderedVisibleColumns = optionalColumns.filter(({ key }) => visibleColumns.includes(key))
  const groupedStaff = (() => {
    if (groupBy === "none") return [[null, paginatedStaff]]
    const groups = new Map()
    for (const member of paginatedStaff) {
      const office = offices.find((item) => item.id === member.office_id)
      const label = groupBy === "office" ? (office?.short_name || office?.name || "Platform Level") : (isSystemAdminRole(member.role) ? "System Admin" : member.role === "Admin" ? "Administrator" : "Regular Staff")
      if (!groups.has(label)) groups.set(label, [])
      groups.get(label).push(member)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  })()

  const staffTableColumns = ["selection", "identifier", ...orderedVisibleColumns.map(({ key }) => {
    if (key === "name" || key === "email") return { kind: "text", maxWidth: 340 }
    if (key === "section") return { kind: "text", maxWidth: 240 }
    if (key === "last_active" || key === "created_at" || key === "updated_at") return { kind: "date" }
    if (key === "totp_enabled") return { kind: "status" }
    return { kind: "category" }
  }), "actions"]

  if (loading) return <GlobalStaffSkeleton columns={staffTableColumns} />

  return (
    <div className="animate-fade-up font-jakarta flex flex-[1_0_auto] flex-col w-full gap-6">
      <Card className="flex min-w-0 flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        <PageHeader
          icon="UserSearch01Icon"
          title={<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><span>Global Personnel Directory</span><span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400">{stats.total.toLocaleString()} personnel · {stats.assignedOffices.toLocaleString()} offices · {stats.admins.toLocaleString()} administrators</span></div>}
          description="Manage system access, office assignments, and authorization settings for all administrators and records staff."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex shrink-0 items-center gap-2">
              <RefreshButton onRefresh={handleManualRefresh} isLoading={isManualLoading} title="Refresh Staff Directory" className="h-9 w-9" />
              <Button onClick={handleOpenCreate} className="h-9 shrink-0 px-4">Register Personnel</Button>
            </div>
          }
        />

        <div role="group" aria-label="Personnel status" className="flex items-center px-6 py-2.5 border-b border-border/80 dark:border-white/10 bg-gray-50/40 dark:bg-zinc-900/30 overflow-x-auto scrollbar-none">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] select-none">
            {[["Active", "Active", stats.active], ["Inactive", "Archived", stats.inactive]].map(([value, label, count]) => {
              const isSelected = statusFilter === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setStatusFilter(value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full transition-all duration-150 whitespace-nowrap cursor-pointer active:scale-[0.98]",
                    isSelected
                      ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  <span>{label}</span>
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums min-w-4 text-center",
                    isSelected ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-zinc-100" : "bg-black/5 dark:bg-white/5 text-gray-400 dark:text-zinc-500"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <DataViewToolbar label="Personnel search, filters, sorting, grouping, and columns" className="gap-2 bg-gray-50/40 p-4 dark:bg-zinc-900/30 sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <DashboardSearch value={search} onChange={setSearch} count={filteredStaff.length} label="Search personnel" placeholder="Search name, ID or email..." />
            <TableScrollControls scrollContainerRef={tableContainerRef} canScrollLeft={canScrollLeft} canScrollRight={canScrollRight} isScrolled={isScrolled} onScrollLeft={scrollLeft} onScrollRight={scrollRight} onResetScroll={resetScroll} controlSize="md" />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <FilterPopover fields={filterFields} filters={filterRules} onFiltersChange={setFilterRules} entityLabel="personnel" />
            <SortPopover options={[{ key: "name", label: "Name" }, { key: "id", label: "Employee ID" }, { key: "email", label: "Email" }, { key: "office", label: "Office" }, { key: "role", label: "Role" }, { key: "section", label: "Section" }, { key: "last_active", label: "Last Sign-in" }, { key: "totp_enabled", label: "Two-step Verification" }, { key: "created_at", label: "Date Added" }, { key: "updated_at", label: "Last Updated" }]} sortBy={sortBy} onSortByChange={(value) => { setSortBy(value); setSortOrder("ASC") }} sortOrder={sortOrder} onSortOrderChange={setSortOrder} />
            <GroupPopover options={[{ key: "office", label: "Office", icon: Building01Icon }, { key: "role", label: "Role", icon: EmptyUserGroupIcon }, { key: "none", label: "No grouping" }]} groupBy={groupBy} onGroupByChange={setGroupBy} />
            <ColumnsPopover columns={optionalColumns} visibleColumns={visibleColumns} onVisibleColumnsChange={setVisibleColumns} />
          </div>
        </DataViewToolbar>

        {/* Active Filter Chips Row */}
        <ActiveFilterChips
          chips={filterRules.map((rule) => ({ id: rule.id, label: `${filterFields.find((field) => field.key === rule.fieldKey)?.label || rule.fieldKey} ${rule.operator === "is_not" ? "is not" : "is"} ${filterFields.find((field) => field.key === rule.fieldKey)?.options?.find((option) => String(option.value) === rule.value)?.label || rule.value}`, onRemove: () => setFilterRules((current) => current.filter((item) => item.id !== rule.id)) }))}
          groups={staffFilterGroups}
          selected={staffFilters}
          onRemove={(groupId, val) => {
            setStaffFilters((prev) => ({
              ...prev,
              [groupId]: (prev[groupId] || []).filter((v) => v !== val),
            }))
            setPage(1)
          }}
          searchQuery={search}
          onClearSearch={() => {
            setSearch("")
            setPage(1)
          }}
          onClearAll={() => {
            setSearch("")
            setStaffFilters({ role: [], office: [] })
            setFilterRules([])
            setPage(1)
          }}
          className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
        />

        {/* Content Section: Directory Table inside the single Card */}
        <div className="overflow-hidden rounded-b-2xl border-t border-border dark:border-border bg-white dark:bg-card flex flex-col flex-[1_0_auto]">
          {filteredStaff.length === 0 ? (
            <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>{hasActiveFilters ? <EmptySearch01Icon size="1em" /> : statusFilter === "Inactive" ? <EmptyArchive01Icon size="1em" /> : <EmptyUserGroupIcon size="1em" />}</EmptyMedia>
                  <EmptyTitle>
                    {hasActiveFilters
                      ? "No Results Found"
                      : (statusFilter === "Inactive" ? "No Archived Personnel Found" : "No Personnel Found")}
                  </EmptyTitle>
                  <EmptyDescription>
                    {hasActiveFilters
                      ? "We couldn't find any personnel matching your search criteria. Try adjusting your partition filters or keywords."
                      : (statusFilter === "Inactive"
                        ? "There are currently no archived or deactivated personnel accounts in the system."
                        : "There are currently no personnel accounts registered in the directory.")}
                  </EmptyDescription>
                </EmptyHeader>
                {(hasActiveFilters || statusFilter === "Active") && (
                  <EmptyContent>
                    {hasActiveFilters ? (
                      <Button
                        variant="outline"
                        onClick={handleClearFilters}
                        title="Reset Filters"
                        className="flex h-10 items-center justify-center gap-2 px-5"
                      >
                        Reset Filters
                      </Button>
                    ) : (
                      <Button
                        onClick={handleOpenCreate}
                        title="Register Personnel"
                        className="h-10 px-5 cursor-pointer"
                      >
                        Register Personnel
                      </Button>
                    )}
                  </EmptyContent>
                )}
              </Empty>
            </div>
          ) : (
            <>
              <div
                ref={tableContainerRef}
                className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar select-none"
              >
                <Table columns={staffTableColumns} className={visibleColumns.length >= 3 ? "min-w-[960px]" : "min-w-[560px]"}>
                  <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
                      <th
                        className="w-12 p-4 text-center align-middle"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border dark:border-border"
                          checked={
                            paginatedStaff.length > 0 &&
                            paginatedStaff
                              .filter((s) => s.id !== authUser?.id)
                              .every((s) => selectedIds.has(s.id))
                          }
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          disabled={
                            paginatedStaff.length === 0 ||
                            paginatedStaff.every((s) => s.id === authUser?.id)
                          }
                        />
                      </th>
                      <th className="p-4 w-[22%]">
                        <div className="flex items-center justify-between gap-1">
                          <button
                            onClick={() => handleSort("id")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                              sortBy === "id" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            Employee ID{" "}
                            <SortIndicator column="id" sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                        </div>
                      </th>
                      {visibleColumns.includes("name") && (
                        <th className="p-4 w-[28%]">
                          <button
                            onClick={() => handleSort("name")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                              sortBy === "name" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            Staff Name{" "}
                            <SortIndicator column="name" sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                        </th>
                      )}
                      {visibleColumns.includes("email") && (
                        <th className="p-4">
                          <button
                            onClick={() => handleSort("email")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                              sortBy === "email" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            Email <SortIndicator column="email" sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                        </th>
                      )}
                      {visibleColumns.includes("office") && (
                        <th className="p-4 w-[20%]">
                          <button
                            onClick={() => handleSort("office")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                              sortBy === "office" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            Office Partition{" "}
                            <SortIndicator column="office" sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                        </th>
                      )}
                      {visibleColumns.includes("role") && (
                        <th className="p-4 w-[20%]">
                          <button
                            onClick={() => handleSort("role")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                              sortBy === "role" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            Privilege Level{" "}
                            <SortIndicator column="role" sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                        </th>
                      )}
                      {[
                        ["section", "Administrative Section"],
                        ["last_active", "Last Sign-in"],
                        ["totp_enabled", "Two-step Verification"],
                        ["created_at", "Date Added"],
                        ["updated_at", "Last Updated"],
                      ].map(([key, label]) => visibleColumns.includes(key) && (
                        <th key={key} className="p-4">
                          <button type="button" onClick={() => handleSort(key)} className={cn(
                            "group inline-flex items-center text-xs font-semibold transition-colors",
                            sortBy === key ? "text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                          )}>
                            {label}<SortIndicator column={key} sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                        </th>
                      ))}
                      <th className="w-12 p-0 text-center"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-[#1c1c1e]">
                    {groupedStaff.map(([groupLabel, members]) => <Fragment key={groupLabel || "all"}>
                      {groupLabel && <tr><td colSpan={orderedVisibleColumns.length + 3} className="bg-gray-50/90 px-4 py-2 text-xs font-semibold text-gray-700 dark:bg-zinc-900/80 dark:text-zinc-200">{groupLabel} <span className="ml-2 font-sans tabular-nums font-normal text-gray-400 dark:text-zinc-500">{members.length}</span></td></tr>}
                      {members.map((member) => {
                        const office = (Array.isArray(offices) ? offices : []).find(o => o.id === member.office_id)
                        const isSelf = member.id === authUser?.id
                        const isSelected = selectedIds.has(member.id)

                        return (
                          <tr
                            key={member.id}
                            data-selected={isSelected}
                            onClick={(e) => !isSelf && toggleSelect(member.id, e)}
                            onDoubleClick={(e) => {
                              if (e.target.closest("button, input, a")) return
                              setInspectMember(member)
                            }}
                            className={cn(
                              "group border-b-[0.5px] border-border dark:border-border last:border-b-0 transition-colors hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 select-none cursor-pointer"
                            )}
                          >
                            <td
                              className="w-12 p-4 align-middle text-center border-r border-border/70 dark:border-border/70"
                            >
                              {!isSelf && (
                                <input
                                  type="checkbox"
                                  className={cn(
                                    "h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border dark:border-border transition-opacity",
                                    isSelected ? "opacity-100" : "opacity-50 group-hover:opacity-80"
                                  )}
                                  checked={isSelected}
                                  onChange={() => { }}
                                />
                              )}
                            </td>
                            <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                              <span className="font-sans tabular-nums text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200">
                                {member.id}
                              </span>
                            </td>
                            {visibleColumns.includes("name") && (
                              <td className="p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <ProfileAvatar
                                    staffId={member.id}
                                    name={getStaffCleanName(member)}
                                    initials={`${member.fname?.charAt(0) || ""}${member.lname?.charAt(0) || ""}`.toUpperCase() || "ST"}
                                    className="size-7 rounded-full border shadow-2xs shrink-0"
                                    fallbackClassName="text-[11px] font-bold"
                                  />
                                  <div className="flex flex-col min-w-0">
                                    <span className={cn("text-[13px] font-semibold text-gray-900 dark:text-zinc-100 truncate", isSelf && "font-bold")} title={`${getStaffCleanName(member)}${isSelf ? " (You)" : ""}`}>
                                      {getStaffCleanName(member)} {isSelf && "(You)"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            )}
                            {visibleColumns.includes("email") && (
                              <td className="p-4 align-middle"><div className="w-full min-w-0 truncate text-xs font-normal text-gray-700 dark:text-zinc-300" title={getStaffCleanEmail(member)}>{getStaffCleanEmail(member)}</div></td>
                            )}
                            {visibleColumns.includes("office") && (
                              <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                {office ? (
                                  <span
                                    className="systemadmin-office-badge inline-flex min-h-6 w-fit items-center justify-center rounded-full px-2.5 text-[11px] font-medium border-0 select-none"
                                    style={{ "--office-accent": office.accent_color || "#800000" }}
                                  >
                                    {office.short_name}
                                  </span>
                                ) : (
                                  <span className="inline-flex w-fit items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-950 select-none">
                                    Platform Level
                                  </span>
                                )}
                              </td>
                            )}
                            {visibleColumns.includes("role") && (
                              <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                <div
                                  className={cn(
                                    "inline-flex items-center w-fit justify-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide border",
                                    member.role === "SystemAdmin" || member.role === "SuperAdmin"
                                      ? "bg-gray-900 text-white border-gray-800 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-200"
                                      : member.role === "Admin"
                                        ? "bg-red-50 text-red-700 border-red-200/60 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40"
                                        : "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40"
                                  )}
                                >
                                  <span>{member.role === "SuperAdmin" || member.role === "SystemAdmin" ? "System Admin" : getOfficeRoleLabel(member.role, member, offices)}</span>
                                </div>
                              </td>
                            )}
                            {visibleColumns.includes("section") && (
                              <td className="p-4 align-middle">
                                <span className="block w-full min-w-0 truncate text-xs font-normal text-gray-700 dark:text-zinc-300" title={member.section || "No section assigned"}>
                                  {member.section || "No section assigned"}
                                </span>
                              </td>
                            )}
                            {visibleColumns.includes("last_active") && (
                              <td className="p-4 align-middle whitespace-nowrap text-xs font-normal tabular-nums text-gray-600 dark:text-zinc-300" title={member.last_active ? formatPHDateTime(member.last_active) : "Never logged in"}>
                                {member.last_active ? formatPHDateTime(member.last_active) : "Never logged in"}
                              </td>
                            )}
                            {visibleColumns.includes("totp_enabled") && (
                              <td className="p-4 align-middle text-center">
                                <span className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
                                  member.totp_enabled
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                    : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300"
                                )}>
                                  {member.totp_enabled ? "Enabled" : "Not enabled"}
                                </span>
                              </td>
                            )}
                            {visibleColumns.includes("created_at") && (
                              <td className="p-4 align-middle whitespace-nowrap text-xs font-normal tabular-nums text-gray-600 dark:text-zinc-300" title={member.created_at ? formatPHDateTime(member.created_at) : "Date unavailable"}>
                                {member.created_at ? formatPHDateTime(member.created_at) : "Date unavailable"}
                              </td>
                            )}
                            {visibleColumns.includes("updated_at") && (
                              <td className="p-4 align-middle whitespace-nowrap text-xs font-normal tabular-nums text-gray-600 dark:text-zinc-300">
                                {member.updated_at ? formatPHDateTime(member.updated_at) : "N/A"}
                              </td>
                            )}
                            <td className="w-12 p-0 align-middle text-center whitespace-nowrap">
                              <div className="flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
                                <PersonnelActionsMenu member={member} name={getStaffCleanName(member)} isSelf={isSelf}
                                  onViewProfile={setInspectMember} onEdit={handleOpenEdit}
                                  onSettings={() => window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "settings" } }))}
                                  onArchive={setArchiveTarget} onRestore={setRestoreTarget} />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>)}
                  </tbody>
                </Table>
              </div>

              {/* Pagination Footer */}
              <TablePagination label="Global personnel pages" page={page} pageSize={pageSize} totalCount={filteredStaff.length} displayedCount={paginatedStaff.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
            </>
          )}
        </div>
      </Card>

      {/* Register / Edit Form Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => { if (!submitLoading) setFormOpen(open) }}
      >
        <DialogContent className="sm:max-w-2xl w-full max-h-[92dvh] flex flex-col gap-0 rounded-2xl bg-white border border-border dark:bg-zinc-900 dark:border-border p-0 shadow-2xl overflow-hidden">
          <form ref={attachForm} onSubmit={handleSubmit} className="flex min-h-0 flex-col">
            <DialogHeader className="p-6 pb-0 text-left shrink-0">
              <DialogTitle>
                {isEditing ? "Edit Personnel Profile" : "Register Personnel Account"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Define the authorization scope, profile metadata, and security settings for the account.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 overflow-y-auto p-6 space-y-5">
              {/* Row 1: Editable Full Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    First Name *
                  </label>
                  <Input
                    ref={fnameRef}
                    value={form.fname}
                    onChange={(e) => setForm(prev => ({ ...prev, fname: e.target.value }))}
                    placeholder="Elias"
                    className="h-10 rounded-xl bg-white border border-border text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-border dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Last Name *
                  </label>
                  <Input
                    value={form.lname}
                    onChange={(e) => setForm(prev => ({ ...prev, lname: e.target.value }))}
                    placeholder="Austria"
                    className="h-10 rounded-xl bg-white border border-border text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-border dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Editable Office Scope & Privilege Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Assigned Office / Department {form.role !== "SystemAdmin" && "*"}
                  </label>
                  <Select
                    value={form.office_id}
                    onChange={(e) => {
                      const val = e.target.value
                      setForm(prev => ({
                        ...prev,
                        office_id: val,
                        ...(val === "" ? { role: "SystemAdmin" } : (prev.role === "SystemAdmin" ? { role: "Admin" } : {}))
                      }))
                    }}
                    className="h-10 rounded-xl bg-white border border-border text-xs font-normal focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 dark:bg-zinc-950 dark:border-border dark:text-white shadow-none cursor-pointer"
                    disabled={isEditing && targetIsExistingSysAdmin}
                    required={form.role !== "SystemAdmin"}
                  >
                    {(!isEditing || targetIsExistingSysAdmin) && (
                      <option value="">System Admin / Global (No Office Scope)</option>
                    )}
                    {(Array.isArray(offices) ? offices : []).map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Privilege Level *
                  </label>
                  <Select
                    value={form.role}
                    onChange={(e) => {
                      const val = e.target.value
                      setForm(prev => ({
                        ...prev,
                        role: val,
                        ...(val === "SystemAdmin" ? { office_id: "" } : (!prev.office_id ? { office_id: offices[0]?.id || "" } : {}))
                      }))
                    }}
                    className="h-10 rounded-xl bg-white border border-border text-xs font-normal focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 dark:bg-zinc-950 dark:border-border dark:text-white shadow-none cursor-pointer"
                    disabled={isEditing && targetIsExistingSysAdmin}
                    required
                  >
                    {(!isEditing || targetIsExistingSysAdmin) && (
                      <option value="SystemAdmin">System Admin</option>
                    )}
                    <option value="Admin">{form.office_id ? `${getOfficePrefix(form.office_id, offices)} Admin` : "Administrator"}</option>
                    <option value="Staff">{form.office_id ? `${getOfficePrefix(form.office_id, offices)} Staff` : "Staff"}</option>
                  </Select>
                </div>
              </div>

              {/* Row 3: System-Generated Identifiers (Grouped Read-Only Section) */}
              <div className="p-4 rounded-2xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                    System-Generated Credentials
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40">
                    {isEditing ? "Read-only" : "Auto-assigned"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Employee ID */}
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 dark:text-zinc-400 mb-1">
                      Employee ID
                    </label>
                    <div className="flex h-10 items-center justify-between rounded-xl border border-border bg-white/80 px-3.5 text-xs text-gray-700 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300 shadow-2xs select-none">
                      <span className="font-sans tabular-nums text-xs font-semibold tracking-wide truncate">
                        {isEditing ? form.id : (nextIdPreview || "PUP-[AUTO]")}
                      </span>
                    </div>
                  </div>

                  {/* Official Email Address */}
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 dark:text-zinc-400 mb-1">
                      Official Email Address
                    </label>
                    <div className="flex h-10 items-center justify-between rounded-xl border border-border bg-white/80 px-3.5 text-xs text-gray-700 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300 shadow-2xs select-none">
                      <span className="font-sans tabular-nums text-xs font-semibold tracking-wide truncate">
                        {isEditing ? form.email : (form.email || suggestedEmail || `${(form.role || "staff").toLowerCase()}.[lastname]@pup.local`)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mx-0 mb-0 p-6 pt-0 flex flex-wrap flex-row items-center justify-end gap-2.5 shrink-0">
              {!isEditing && <CreateAnotherToggle checked={repeat.createAnother} onCheckedChange={repeat.setCreateAnother} disabled={submitLoading} savedCount={repeat.savedCount} />}
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={submitLoading}
                className="h-10 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitLoading}
                className="h-10 px-5 cursor-pointer"
              >
                {submitLoading ? (
                  <span className="flex items-center gap-1.5">
                    <Loading01Icon size="1em" className="animate-spin text-sm" />
                    <span>Saving Changes...</span>
                  </span>
                ) : isEditing ? (
                  "Save Changes"
                ) : (
                  "Register Personnel"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Temporary Password Dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent finalFocus={formOpen ? fnameRef : undefined} className="max-w-md rounded-2xl bg-white border border-border dark:bg-zinc-900 dark:border-border p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 pb-0 text-left">
            <DialogTitle>
              Staff Credentials Generated
            </DialogTitle>
            <DialogDescription className="mt-1">
              Please share this temporary password securely with the user. They will be prompted to change it upon first login.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 pt-4">
            <div className="p-4 rounded-xl border border-dashed border-border dark:border-border bg-gray-50 dark:bg-zinc-950/20 text-center">
              <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Temporary Password</span>
              <div className="text-xl font-bold text-pup-maroon dark:text-red-400 mt-1 select-all tracking-wider">
                {tempPassword}
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 flex items-center justify-end gap-2.5">
            <CopyButton
              textToCopy={tempPassword}
              entityName="Password"
              className="h-10 px-4"
            />
            <Button
              onClick={() => setPwDialogOpen(false)}
              className="h-10 px-5 cursor-pointer"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Personnel Confirmation Modal */}
      <ConfirmModal
        open={!!archiveTarget}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={confirmArchivePersonnel}
        isLoading={isArchiving}
        title="Archive Personnel Account"
        message="This account will be restricted immediately but can be restored later."
        confirmLabel="Archive Personnel"
        cancelLabel="Cancel"
        variant="warning"
        icon=" Archive01Icon"
        buttonIcon=" Archive01Icon"
        selectedItems={[
          archiveTarget ? getStaffCleanName(archiveTarget) : "",
        ]}
        isPersonnelModal={true}
        isAppleStyled={true}
        isArchiveModal={true}
      />

      {/* Restore Personnel Confirmation Modal */}
      <ConfirmModal
        open={!!restoreTarget}
        onCancel={() => setRestoreTarget(null)}
        onConfirm={confirmRestorePersonnel}
        isLoading={isRestoring}
        title="Restore Personnel Account"
        message="This account will be reactivated and the personnel will be able to log in again."
        confirmLabel="Restore Personnel"
        cancelLabel="Cancel"
        variant="success"
        icon=" Archive02Icon"
        buttonIcon=" Archive02Icon"
        selectedItems={[
          restoreTarget ? getStaffCleanName(restoreTarget) : "",
        ]}
        isPersonnelModal={true}
        isAppleStyled={true}
        isRestoreModal={true}
      />

      {/* Batch Archive Confirmation Modal */}
      <ConfirmModal
        open={bulkArchiveOpen}
        onCancel={() => setBulkArchiveOpen(false)}
        onConfirm={confirmBulkArchive}
        isLoading={bulkArchiveLoading}
        title="Batch Archive Personnel"
        message={`${selectedIds.size} personnel profiles will be archived and their system access revoked immediately.`}
        confirmLabel="Archive Selected"
        cancelLabel="Cancel"
        variant="warning"
        icon=" Archive01Icon"
        buttonIcon=" Archive01Icon"
        selectedItems={Array.from(selectedIds).map((id) => {
          const s = staff.find((x) => x.id === id)
          return s ? `${s.fname} ${s.lname}` : id
        })}
        isPersonnelModal={true}
        isAppleStyled={true}
        isArchiveModal={true}
      />

      {/* Batch Restore Confirmation Modal */}
      <ConfirmModal
        open={bulkRestoreOpen}
        onCancel={() => setBulkRestoreOpen(false)}
        onConfirm={confirmBulkRestore}
        isLoading={bulkRestoreLoading}
        title="Batch Restore Personnel"
        message={`${selectedIds.size} personnel profiles will be reactivated and able to log in again.`}
        confirmLabel="Restore Selected"
        cancelLabel="Cancel"
        variant="success"
        icon=" Archive02Icon"
        buttonIcon=" Archive02Icon"
        selectedItems={Array.from(selectedIds).map((id) => {
          const s = staff.find((x) => x.id === id)
          return s ? `${s.fname} ${s.lname}` : id
        })}
        isPersonnelModal={true}
        isAppleStyled={true}
        isRestoreModal={true}
      />

      {/* Standardized Personnel Details Slide-Over Sheet */}
      <Sheet open={Boolean(inspectMember)} onOpenChange={(open) => !open && setInspectMember(null)}>
        <SheetContent
          side="right"
          size="default"
          showCloseButton={false}
          className="w-full sm:max-w-md md:max-w-lg flex flex-col h-full p-0 overflow-hidden"
        >
          {inspectMember && (() => {
            const office = (Array.isArray(offices) ? offices : []).find(o => o.id === inspectMember.office_id)
            const isSelf = inspectMember.id === authUser?.id
            const isSysAdmin = inspectMember.role === "SystemAdmin" || inspectMember.role === "SuperAdmin"
            const initials = `${inspectMember.fname?.charAt(0) || ""}${inspectMember.lname?.charAt(0) || ""}`.toUpperCase() || "ST"
            const currentMemberIndex = filteredStaff.findIndex(m => m.id === inspectMember.id)
            const hasPrevMember = currentMemberIndex > 0
            const hasNextMember = currentMemberIndex >= 0 && currentMemberIndex < filteredStaff.length - 1

            return (
              <>
                <SheetHeader className="shrink-0 p-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                    <div>
                      <SheetTitle>
                        Personnel Details
                      </SheetTitle>
                      <SheetDescription className="sr-only">
                        Detailed account profile, office partition, and system activity for {getStaffCleanName(inspectMember)}
                      </SheetDescription>
                    </div>

                    <div className="ml-auto flex items-center gap-3">
                      {filteredStaff.length > 1 && currentMemberIndex !== -1 && (
                        <SheetPagination
                          compact
                          label="Record navigation"
                          page={currentMemberIndex + 1}
                          totalPages={filteredStaff.length}
                          onPrevious={() => hasPrevMember && setInspectMember(filteredStaff[currentMemberIndex - 1])}
                          onNext={() => hasNextMember && setInspectMember(filteredStaff[currentMemberIndex + 1])}
                          previousDisabled={!hasPrevMember}
                          nextDisabled={!hasNextMember}
                          previousLabel="Previous Personnel"
                          nextLabel="Next Personnel"
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => setInspectMember(null)}
                        className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                        aria-label="Close Personnel Details"
                        title="Close"
                      >
                        <Cancel01Icon size="1em" className="text-sm" />
                      </button>
                    </div>
                  </div>
                </SheetHeader>

                {/* Edge-to-Edge Line-Attached Status Notice */}
                <div
                  className={cn(
                    "flex items-center gap-2.5 px-6 py-2.5 text-xs border-b transition-colors shrink-0",
                    inspectMember.status === "Active"
                      ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
                      : "border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200"
                  )}
                >
                  <AppIcon
                    className={cn(
                      " text-[15px] shrink-0",
                      inspectMember.status === "Active"
                        ? "Shield01Icon text-emerald-600 dark:text-emerald-400"
                        : "Alert01Icon text-amber-600 dark:text-amber-400"
                    )}
                  />
                  <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
                    <strong className="font-semibold">
                      {inspectMember.status === "Active"
                        ? "Active Personnel Account:"
                        : "Archived Personnel Account:"}
                    </strong>{" "}
                    {inspectMember.status === "Active"
                      ? "Operational access granted to university archives and department workstations."
                      : "Account access deactivated. Historical audit logs and archive records preserved."}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Identity Summary Strip (Unboxed) */}
                  <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/80 dark:border-border">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <ProfileAvatar
                        staffId={inspectMember.id}
                        name={getStaffCleanName(inspectMember)}
                        initials={initials}
                        className="size-12 rounded-full border shadow-2xs shrink-0"
                        fallbackClassName="text-base font-bold"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate block">
                            {getStaffCleanName(inspectMember)}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 font-sans tabular-nums truncate mt-0.5">
                          {inspectMember.id} • <span className="font-sans font-medium text-gray-600 dark:text-zinc-300">{inspectMember.section || "Administration"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {office ? (
                        <span
                          className="systemadmin-office-badge inline-flex min-h-6 items-center justify-center rounded-full px-2.5 text-xs font-medium border-0 select-none"
                          style={{ "--office-accent": office.accent_color || "#800000" }}
                        >
                          {office.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-950 select-none">
                          Platform Level
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Profile & Credentials Section (Unboxed) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                      <AppIcon className=" Contact01Icon text-pup-maroon dark:text-red-400 text-sm" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                        Identity & Access Metadata
                      </h4>
                    </div>
                    <div className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
                      <div className="py-2.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-500 dark:text-zinc-400">Employee ID</span>
                        <span className="font-sans tabular-nums font-semibold text-gray-900 dark:text-zinc-100 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800">
                          {inspectMember.id}
                        </span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between text-xs gap-3">
                        <span className="font-medium text-gray-500 dark:text-zinc-400 shrink-0">Official Email</span>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-sans tabular-nums text-gray-900 dark:text-zinc-100 truncate text-[11px]" title={inspectMember.email}>
                            {getStaffCleanEmail(inspectMember)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(getStaffCleanEmail(inspectMember))
                              showToast("Email address copied to clipboard")
                            }}
                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                            title="Copy Email"
                          >
                            <Copy01Icon size="1em" className="text-xs" />
                          </button>
                        </div>
                      </div>
                      <div className="py-2.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-500 dark:text-zinc-400">Authorization Role</span>
                        <span className="font-medium text-gray-900 dark:text-zinc-100">
                          {isSysAdmin ? "Platform System Administrator" : getOfficeRoleLabel(inspectMember.role, inspectMember, offices)}
                        </span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-500 dark:text-zinc-400">Administrative Section</span>
                        <span className="font-medium text-gray-900 dark:text-zinc-100">
                          {inspectMember.section || "General Administration"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timestamps & Lifecycle (Unboxed) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                      <Clock01Icon size="1em" className="text-pup-maroon dark:text-red-400 text-sm" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                        System Activity & Registration
                      </h4>
                    </div>
                    <div className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
                      <div className="py-2.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-500 dark:text-zinc-400">Registered On</span>
                        <span className="font-sans tabular-nums text-[11px] text-gray-700 dark:text-zinc-300">
                          {inspectMember.created_at ? formatPHDateTime(inspectMember.created_at) : "N/A"}
                        </span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-500 dark:text-zinc-400">Last Active Session</span>
                        <span className="font-sans tabular-nums text-[11px] text-gray-700 dark:text-zinc-300">
                          {inspectMember.last_active ? formatPHDateTime(inspectMember.last_active) : "Never logged in"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Audit Logs Jump */}
                  <div className="p-4 rounded-xl border border-dashed border-border dark:border-border bg-gray-50/40 dark:bg-zinc-900/20 flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Activity History</span>
                      <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                        Inspect recorded audit events logged by this personnel account.
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInspectMember(null)
                        window.dispatchEvent(
                          new CustomEvent("switch-view", {
                            detail: { view: "logs", search: inspectMember.id },
                          })
                        )
                      }}
                      className="h-8 px-3 shrink-0"
                    >
                      View History
                    </Button>
                  </div>
                </div>

                <SheetFooter className="p-4 px-6 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInspectMember(null)}
                    className="h-10 px-4"
                  >
                    Close
                  </Button>

                  {!isSelf && (
                    <div className="flex items-center gap-2">
                      {inspectMember.status === "Active" ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const m = inspectMember
                              setInspectMember(null)
                              setArchiveTarget(m)
                            }}
                            className="h-10 px-4"
                          >
                            Archive Personnel
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              const m = inspectMember
                              setInspectMember(null)
                              handleOpenEdit(m)
                            }}
                            className="h-10 px-4"
                          >
                            Edit Profile
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="success"
                          onClick={() => {
                            const m = inspectMember
                            setInspectMember(null)
                            setRestoreTarget(m)
                          }}
                          className="h-10 px-4"
                        >
                          Restore Personnel
                        </Button>
                      )}
                    </div>
                  )}
                </SheetFooter>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedIds.size}
        entityName="personnel"
        onCancel={() => setSelectedIds(new Set())}
        primaryAction={{
          label: statusFilter === "Active" ? "Archive Personnel" : "Restore Personnel",
          variant: statusFilter === "Active" ? "danger" : "success",
          onClick: () => {
            if (statusFilter === "Active") {
              setBulkArchiveOpen(true)
            } else {
              setBulkRestoreOpen(true)
            }
          },
        }}
        secondaryActions={[
          {
            label: "Copy Emails",
            onClick: handleCopyEmails,
          },
          {
            label: "Copy Employee IDs",
            onClick: handleCopyIds,
          },
        ]}
      />
    </div>
  )
}
