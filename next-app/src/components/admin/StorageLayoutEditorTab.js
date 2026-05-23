"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Card,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ROOM_TEMPLATES, getDefaultDoor } from "@/lib/storageLayoutDefaults"

import PageHeader from "@/components/shared/PageHeader"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import ConfirmModal from "@/components/shared/ConfirmModal"

// Modular Sub-components
import CabinetCanvas from "./storage-layout/CabinetCanvas"
import CabinetSidebar from "./storage-layout/CabinetSidebar"
import ConflictResolutionModals from "./storage-layout/ConflictResolutionModals"
import { Select } from "@/components/ui/select"

// Utilities
import {
  clamp,
  getCabinetEffectiveSize,
  clampToRoom,
  snapValue,
  calculatePath,
} from "@/lib/storageLayoutUtils"

export default function StorageLayoutEditorTab({ showToast, error = null }) {
  const [layout, setLayout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [studentRoomUsage, setStudentRoomUsage] = useState(new Map())
  const [studentDrawerUsage, setStudentDrawerUsage] = useState(new Map())

  const [activeRoomId, setActiveRoomId] = useState(null)
  const [selectedCabinetIds, setSelectedCabinetIds] = useState(new Set())
  const [selectedTemplateId, setSelectedTemplateId] = useState("grid-4x2")
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [deleteRoomConfirmOpen, setDeleteRoomConfirmOpen] = useState(false)
  const [resetRoomConfirmOpen, setResetRoomConfirmOpen] = useState(false)
  const [templateApplyConfirmOpen, setTemplateApplyConfirmOpen] = useState(false)

  const [templateConflictOpen, setTemplateConflictOpen] = useState(false)
  const [templateConflictRows, setTemplateConflictRows] = useState([])
  const [templateMappingDraft, setTemplateMappingDraft] = useState({})
  const [templateTargetOptions, setTemplateTargetOptions] = useState([])
  const [templateApplyPayload, setTemplateApplyPayload] = useState(null)
  const [reassignmentMode, setReassignmentMode] = useState("")
  const [dragSourceKey, setDragSourceKey] = useState("")
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [applyPreviewOpen, setApplyPreviewOpen] = useState(false)
  const [applyPreviewRows, setApplyPreviewRows] = useState([])
  const [applyReportOpen, setApplyReportOpen] = useState(false)
  const [applyReportRows, setApplyReportRows] = useState([])

  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const MIN_SIZE = 0.02

  const activeRoom = useMemo(() => {
    if (!layout || activeRoomId == null) return null
    return layout.rooms.find((r) => r.id === activeRoomId) || null
  }, [layout, activeRoomId])

  const selectedCabinet = useMemo(() => {
    if (!activeRoom || selectedCabinetIds.size !== 1) return null
    const [id] = selectedCabinetIds
    if (id === "DOOR") {
      return {
        id: "DOOR",
        isDoor: true,
        rect: {
          x: activeRoom.door?.x ?? 0,
          y: activeRoom.door?.y ?? 0,
          w: activeRoom.door?.w ?? 0.08,
          h: activeRoom.door?.h ?? 0.03,
        },
        rotation: activeRoom.door?.rotation ?? 0,
      }
    }
    return activeRoom.cabinets.find((c) => c.id === id) || null
  }, [activeRoom, selectedCabinetIds])

  const [activePath, setActivePath] = useState(null)
  const [simulationMode, setSimulationMode] = useState(false)

  useEffect(() => {
    if (simulationMode && selectedCabinet && !selectedCabinet.isDoor) {
      const path = calculatePath(activeRoom, selectedCabinet.id, getDefaultDoor)
      setActivePath(path)
    } else {
      setActivePath(null)
    }
  }, [simulationMode, selectedCabinet, activeRoom])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/storage-layout", { cache: "no-store" })
        const json = await res.json()
        if (!res.ok || !json?.ok)
          throw new Error(json?.error || "Failed to load layout")
        setLayout(json.data)
        const firstRoom = Array.isArray(json.data?.rooms)
          ? json.data.rooms[0]?.id
          : null
        setActiveRoomId(firstRoom)
      } catch (err) {
        showToast?.(
          {
            title: "Load Failed",
            description: err?.message || "Unable to load storage layout.",
          },
          true
        )
      } finally {
        setLoading(false)
      }
    })()
  }, [showToast])

  useEffect(() => {
    ;(async () => {
      try {
        const limit = 200
        let offset = 0
        const map = new Map()
        const drawerMap = new Map()
        while (true) {
          const qs = new URLSearchParams()
          qs.set("limit", String(limit))
          qs.set("offset", String(offset))
          const res = await fetch(`/api/students?${qs}`, { cache: "no-store" })
          const json = await res.json().catch(() => null)
          if (!res.ok || !json?.ok) break
          const rows = Array.isArray(json.data) ? json.data : []
          for (const s of rows) {
            const roomId = Number(s?.room)
            if (!Number.isFinite(roomId)) continue
            map.set(roomId, (map.get(roomId) || 0) + 1)
            const cabId = String(s?.cabinet || "").trim()
            const drawerId = Number(s?.drawer)
            if (cabId && Number.isFinite(drawerId)) {
              const key = `${roomId}|${cabId}|${drawerId}`
              drawerMap.set(key, (drawerMap.get(key) || 0) + 1)
            }
          }
          if (rows.length < limit) break
          offset += limit
          if (offset > 20000) break
        }
        setStudentRoomUsage(map)
        setStudentDrawerUsage(drawerMap)
      } catch {
        // silent; server-side save validation still protects integrity
      }
    })()
  }, [])

  const activeRoomStudentCount = useMemo(() => {
    if (!activeRoom) return 0
    return Number(studentRoomUsage.get(Number(activeRoom.id)) || 0)
  }, [activeRoom, studentRoomUsage])

  useEffect(() => {
    if (!activeRoom) {
      if (selectedCabinetIds.size > 0) {
        setSelectedCabinetIds(new Set())
      }
    } else {
      const validIds = new Set()
      for (const id of selectedCabinetIds) {
        if (activeRoom.cabinets.some((c) => c.id === id) || id === "DOOR") {
          validIds.add(id)
        }
      }
      if (validIds.size !== selectedCabinetIds.size) {
        setSelectedCabinetIds(validIds)
      }
    }
  }, [activeRoom, selectedCabinetIds.size])

  const updateRoom = useCallback((roomId, updater) => {
    setLayout((prev) => {
      if (!prev) return prev
      const rooms = prev.rooms.map((r) => (r.id === roomId ? updater(r) : r))
      rooms.sort((a, b) => a.id - b.id)
      return { ...prev, rooms }
    })
  }, [])

  const updateCabinet = useCallback((roomId, cabinetId, updater) => {
    if (cabinetId === "DOOR") {
      updateRoom(roomId, (r) => ({
        ...r,
        door: updater(r.door),
      }))
      return
    }
    setLayout((prev) => {
      if (!prev) return prev
      const rooms = prev.rooms.map((r) => {
        if (r.id !== roomId) return r
        const cabinets = r.cabinets.map((c) => {
          if (c.id !== cabinetId) return c
          return updater(c)
        })
        return { ...r, cabinets }
      })
      return { ...prev, rooms }
    })
  }, [updateRoom])

  function getNextRoomId(rooms) {
    const max = Math.max(0, ...(rooms || []).map((r) => Number(r.id) || 0))
    return max + 1
  }

  function addRoom() {
    let createdRoomId = null
    setLayout((prev) => {
      if (!prev) return prev
      const nextId = getNextRoomId(prev.rooms)
      createdRoomId = nextId
      const next = {
        id: nextId,
        name: `Room ${nextId}`,
        cabinets: [],
        door: getDefaultDoor(),
      }
      return {
        ...prev,
        rooms: [...prev.rooms, next].sort((a, b) => a.id - b.id),
      }
    })
    setSelectedCabinetIds(new Set())
    if (createdRoomId != null) {
      setActiveRoomId(createdRoomId)
    }
  }

  function removeActiveRoom() {
    if (!layout || !activeRoom) return
    if (activeRoomStudentCount > 0) {
      showToast?.(
        {
          title: "Cannot Remove Room",
          description: `Room ${activeRoom.id} has ${activeRoomStudentCount} student record(s) still assigned.`,
        },
        true
      )
      return
    }
    if (activeRoom.cabinets?.length) {
      showToast?.(
        {
          title: "Cannot Remove Room",
          description: "Remove all cabinets first before deleting a room.",
        },
        true
      )
      return
    }
    setLayout((prev) => {
      if (!prev) return prev
      const rooms = prev.rooms.filter((r) => r.id !== activeRoom.id)
      return { ...prev, rooms }
    })
    const fallback =
      layout.rooms.find((r) => r.id !== activeRoom.id)?.id || null
    setActiveRoomId(fallback)
    setSelectedCabinetIds(new Set())
  }

  function resetActiveRoomCabinets() {
    if (!layout || !activeRoom) return
    if (activeRoomStudentCount > 0) {
      showToast?.(
        {
          title: "Cannot Reset Room",
          description: `Room ${activeRoom.id} has ${activeRoomStudentCount} student record(s) still assigned.`,
        },
        true
      )
      return
    }
    if (!activeRoom.cabinets?.length) {
      showToast?.({
        title: "Nothing to Reset",
        description: "This room has no cabinet layout to clear.",
      })
      return
    }
    updateRoom(activeRoom.id, (r) => ({
      ...r,
      cabinets: [],
    }))
    setSelectedCabinetIds(new Set())
    showToast?.({
      title: "Room Layout Cleared",
      description: "All cabinets removed. Please click 'Save Layout' to finalize the changes.",
    })
  }

  function applyTemplateToActiveRoom() {
    if (!activeRoom) return
    const tpl = ROOM_TEMPLATES.find((t) => t.id === selectedTemplateId)
    if (!tpl) return
    const targetLocKeys = new Set()
    const targetOpts = []
    for (const c of tpl.cabinets || []) {
      for (const d of c.drawerIds || []) {
        const key = `${activeRoom.id}|${c.id}|${Number(d)}`
        targetLocKeys.add(key)
        targetOpts.push({
          key,
          label: `Room ${activeRoom.id} / Cabinet ${c.id} / Drawer ${Number(d)}`,
        })
      }
    }
    const conflicts = []
    for (const c of activeRoom.cabinets || []) {
      for (const d of c.drawerIds || []) {
        const sourceKey = `${activeRoom.id}|${c.id}|${Number(d)}`
        const usedCount = Number(studentDrawerUsage.get(sourceKey) || 0)
        if (usedCount <= 0) continue
        if (targetLocKeys.has(sourceKey)) continue
        conflicts.push({
          sourceKey,
          sourceLabel: `Room ${activeRoom.id} / Cabinet ${c.id} / Drawer ${Number(d)}`,
          count: usedCount,
        })
      }
    }
    if (conflicts.length > 0) {
      const nextDraft = {}
      for (const c of conflicts) {
        nextDraft[c.sourceKey] = ""
      }
      setTemplateConflictRows(conflicts)
      setTemplateTargetOptions(targetOpts)
      setTemplateMappingDraft(nextDraft)
      setTemplateApplyPayload({
        roomId: activeRoom.id,
        templateId: tpl.id,
      })
      setReassignmentMode("")
      setDragSourceKey("")
      setTemplateConflictOpen(true)
      return
    }
    updateRoom(activeRoom.id, (r) => ({
      ...r,
      cabinets: (tpl.cabinets || []).map((c) => ({
        ...c,
        rect: { ...c.rect },
      })),
      door: tpl.door ? { ...tpl.door } : r.door,
    }))
    setSelectedCabinetIds(new Set())
    showToast?.({
      title: "Template Applied",
      description: `Layout for Room ${activeRoom.id} updated successfully.`,
    })
  }

  function buildAutoMappings() {
    const nextDraft = {}
    const targets = [...templateTargetOptions]
    for (const row of templateConflictRows) {
      if (targets.length > 0) {
        const t = targets.shift()
        nextDraft[row.sourceKey] = t.key
      } else {
        nextDraft[row.sourceKey] = ""
      }
    }
    return nextDraft
  }

  function openApplyPreview() {
    const hasMissing = templateConflictRows.some(
      (r) => !templateMappingDraft[r.sourceKey]
    )
    if (hasMissing) {
      showToast?.(
        {
          title: "Incomplete Mapping",
          description: "Please assign a target drawer for all conflicts.",
        },
        true
      )
      return
    }
    const rows = templateConflictRows.map((r) => {
      const targetKey = templateMappingDraft[r.sourceKey]
      const targetOpt = templateTargetOptions.find((o) => o.key === targetKey)
      return {
        fromKey: r.sourceKey,
        fromLabel: r.sourceLabel,
        toKey: targetKey,
        toLabel: targetOpt?.label || "Unknown",
        count: r.count,
      }
    })
    setApplyPreviewRows(rows)
    setApplyPreviewOpen(true)
  }

  async function applyTemplateWithMappings() {
    if (
      !layout ||
      !templateApplyPayload?.roomId ||
      !templateApplyPayload?.templateId
    ) {
      showToast?.(
        {
          title: "Apply Failed",
          description:
            "Missing template apply context. Try applying the template again.",
        },
        true
      )
      return
    }

    const tpl = ROOM_TEMPLATES.find((t) => t.id === templateApplyPayload.templateId)
    if (!tpl) return

    // Build the proposed layout for the active room
    const nextRooms = layout.rooms.map((r) => {
      if (r.id !== templateApplyPayload.roomId) return r
      return {
        ...r,
        cabinets: (tpl.cabinets || []).map((c) => ({
          ...c,
          rect: { ...c.rect },
        })),
        door: tpl.door ? { ...tpl.door } : r.door,
      }
    })
    const nextLayout = { ...layout, rooms: nextRooms }

    const reassignments = applyPreviewRows.map((r) => ({
      fromKey: r.fromKey,
      toKey: r.toKey,
    }))

    setSaving(true)
    try {
      const res = await fetch("/api/storage-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layout: nextLayout,
          reassignments,
          skipUsageCheck: true,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Apply failed")

      setLayout(json.data)
      setTemplateConflictOpen(false)
      setApplyPreviewOpen(false)
      setApplyReportRows(json.movedBreakdown || [])
      setApplyReportOpen(true)
      showToast?.({
        title: "Template Applied",
        description: `Template applied with reassignment. ${json.movedCount || 0} student record(s) moved.`,
      })
    } catch (err) {
      showToast?.(
        { title: "Apply Failed", description: err.message },
        true
      )
    } finally {
      setSaving(false)
    }
  }

  const addCabinet = useCallback(() => {
    if (!activeRoom) return
    const baseId = `CAB-${(activeRoom.cabinets?.length || 0) + 1}`
    let id = baseId
    const existing = new Set(activeRoom.cabinets.map((c) => c.id))
    let counter = 1
    while (existing.has(id)) {
      id = `${baseId}-${counter++}`
    }
    const cab = {
      id,
      rect: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 },
      rotation: 0,
      drawerIds: [1, 2, 3, 4],
    }
    updateRoom(activeRoom.id, (r) => ({
      ...r,
      cabinets: [...r.cabinets, cab].sort((a, b) =>
        String(a.id).localeCompare(String(b.id))
      ),
    }))
    setSelectedCabinetIds(new Set([id]))
  }, [activeRoom, updateRoom])

  const removeSelectedCabinet = useCallback(() => {
    if (!activeRoom || selectedCabinetIds.size === 0) return
    updateRoom(activeRoom.id, (r) => ({
      ...r,
      cabinets: r.cabinets.filter((c) => !selectedCabinetIds.has(c.id)),
    }))
    setSelectedCabinetIds(new Set())
  }, [activeRoom, selectedCabinetIds, updateRoom])

  function bulkDeleteCabinets() {
    removeSelectedCabinet()
    setBulkConfirmOpen(false)
  }

  // Helper to find all pairs of colliding cabinets in a room
  const findCollisions = (room) => {
    if (!room?.cabinets) return new Set()
    const collisions = new Set()
    const cabs = room.cabinets
    for (let i = 0; i < cabs.length; i++) {
      for (let j = i + 1; j < cabs.length; j++) {
        const a = cabs[i]
        const b = cabs[j]
        const aEff = getCabinetEffectiveSize(a)
        const tL = a.rect.x
        const tR = a.rect.x + aEff.w
        const tT = a.rect.y
        const tB = a.rect.y + aEff.h

        const bEff = getCabinetEffectiveSize(b)
        const oL = b.rect.x
        const oR = b.rect.x + bEff.w
        const oT = b.rect.y
        const oB = b.rect.y + bEff.h

        const buffer = 0.001
        const intersects = !(
          tR <= oL + buffer ||
          tL >= oR - buffer ||
          tB <= oT + buffer ||
          tT >= oB - buffer
        )
        if (intersects) {
          collisions.add(a.id)
          collisions.add(b.id)
        }
      }
    }
    return collisions
  }

  const collidingIds = useMemo(() => {
    return findCollisions(activeRoom)
  }, [activeRoom])

  const duplicateSelectedCabinet = useCallback(() => {
    if (!activeRoom || !selectedCabinet) return
    const baseId = `CAB-${(activeRoom.cabinets?.length || 0) + 1}`
    let id = baseId
    const existingIds = new Set(activeRoom.cabinets.map((c) => c.id))
    let counter = 1
    while (existingIds.has(id)) {
      id = `${baseId}-${counter++}`
    }
    const eff = getCabinetEffectiveSize(selectedCabinet)
    const foundX = clamp(selectedCabinet.rect.x + 0.05, 0, 1 - eff.w)
    const foundY = clamp(selectedCabinet.rect.y + 0.05, 0, 1 - eff.h)
    const newCab = {
      ...selectedCabinet,
      id,
      rect: { ...selectedCabinet.rect, x: foundX, y: foundY },
    }
    updateRoom(activeRoom.id, (r) => ({
      ...r,
      cabinets: [...r.cabinets, newCab].sort((a, b) =>
        String(a.id).localeCompare(String(b.id))
      ),
    }))
    setSelectedCabinetIds(new Set([id]))
  }, [activeRoom, selectedCabinet, updateRoom])

  const rotateSelectedCabinet = useCallback(() => {
    if (!activeRoom || !selectedCabinet) return
    const nextRot = Number(selectedCabinet.rotation) === 90 ? 0 : 90
    updateCabinet(activeRoom.id, selectedCabinet.id, (c) =>
      clampToRoom({ ...c, rotation: nextRot })
    )
  }, [activeRoom, selectedCabinet, updateCabinet])

  const addDrawerToSelected = useCallback(() => {
    if (!activeRoom || !selectedCabinet || selectedCabinet.isDoor) return
    const ids = selectedCabinet.drawerIds || []
    const nextId = (Math.max(0, ...ids.map(Number)) || 0) + 1
    updateCabinet(activeRoom.id, selectedCabinet.id, (c) => ({
      ...c,
      drawerIds: [...(c.drawerIds || []), nextId],
    }))
  }, [activeRoom, selectedCabinet, updateCabinet])

  const removeDrawerFromSelected = useCallback(() => {
    if (!activeRoom || !selectedCabinet || selectedCabinet.isDoor) return
    const ids = selectedCabinet.drawerIds || []
    if (ids.length <= 1) return
    updateCabinet(activeRoom.id, selectedCabinet.id, (c) => ({
      ...c,
      drawerIds: (c.drawerIds || []).slice(0, -1),
    }))
  }, [activeRoom, selectedCabinet, updateCabinet])

  const updateSelectedRectFromNormalized = useCallback((nextRect) => {
    if (!activeRoom || !selectedCabinet) return
    updateCabinet(activeRoom.id, selectedCabinet.id, (c) =>
      clampToRoom({ ...c, rect: nextRect })
    )
  }, [activeRoom, selectedCabinet, updateCabinet])

  const updateSelectedSizeNormalized = useCallback((nw, nh) => {
    if (!activeRoom || !selectedCabinet) return
    const w = Math.max(MIN_SIZE, nw)
    const h = Math.max(MIN_SIZE, nh)
    updateCabinet(activeRoom.id, selectedCabinet.id, (c) =>
      clampToRoom({ ...c, rect: { ...c.rect, w, h } })
    )
  }, [activeRoom, selectedCabinet, updateCabinet])

  const handleCanvasPointerMove = useCallback((e) => {
    if (!dragRef.current || !activeRoom || !canvasRef.current) return
    const box = canvasRef.current.getBoundingClientRect()
    const relX = (e.clientX - box.left) / Math.max(1, box.width)
    const relY = (e.clientY - box.top) / Math.max(1, box.height)

    const { mode, startX, startY, initialPositions } = dragRef.current

    if (mode === "door") {
      const dx = snapValue(relX, snapToGrid)
      const dy = snapValue(relY, snapToGrid)
      updateRoom(activeRoom.id, (r) => ({
        ...r,
        door: {
          ...r.door,
          x: clamp(dx, 0, 1),
          y: clamp(dy, 0, 1),
        },
      }))
    } else if (mode === "move") {
      const dx = relX - startX
      const dy = relY - startY
      initialPositions.forEach((pos) => {
        const nextX = snapValue(pos.x + dx, snapToGrid)
        const nextY = snapValue(pos.y + dy, snapToGrid)
        updateCabinet(activeRoom.id, pos.id, (c) =>
          clampToRoom({ ...c, rect: { ...c.rect, x: nextX, y: nextY } })
        )
      })
    } else if (mode === "resize" && selectedCabinet) {
      const dw = relX - selectedCabinet.rect.x
      const dh = relY - selectedCabinet.rect.y
      const nw = snapValue(Math.max(MIN_SIZE, dw), snapToGrid)
      const nh = snapValue(Math.max(MIN_SIZE, dh), snapToGrid)
      updateCabinet(activeRoom.id, selectedCabinet.id, (c) =>
        clampToRoom({ ...c, rect: { ...c.rect, w: nw, h: nh } })
      )
    }
  }, [activeRoom, selectedCabinet, snapToGrid, updateCabinet, updateRoom])

  const handleCanvasPointerUp = useCallback((e) => {
    if (!dragRef.current) return
    dragRef.current = null
    try {
      e.target.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }, [])

  async function saveLayout() {
    if (!layout) return
    setSaving(true)
    try {
      const res = await fetch("/api/storage-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layout),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Save failed")
      showToast?.({
        title: "Layout Saved",
        description: "Your archive room mapping was successfully updated.",
      })
    } catch (err) {
      showToast?.(
        { title: "Save Failed", description: err.message },
        true
      )
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input/select
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.tagName === "SELECT" ||
        e.target.isContentEditable
      ) {
        return
      }

      const key = e.key.toLowerCase()
      if (key === "s") {
        setSnapToGrid((prev) => !prev)
      } else if (key === "g") {
        setShowGrid((prev) => !prev)
      } else if (key === "r") {
        if (selectedCabinetIds.size > 0) {
          rotateSelectedCabinet()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedCabinetIds, rotateSelectedCabinet])

  if (loading && !layout) {
    return (
      <div className="flex flex-1 flex-col gap-8 p-10 animate-pulse">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          <Skeleton className="lg:col-span-2 h-[600px] rounded-2xl" />
          <Skeleton className="lg:col-span-1 h-[600px] rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!layout) return null

  return (
    <div className="animate-fade-in flex h-full w-full flex-col gap-4">
      <ConflictResolutionModals 
        applyReportOpen={applyReportOpen}
        setApplyReportOpen={setApplyReportOpen}
        applyReportRows={applyReportRows}
        templateConflictOpen={templateConflictOpen}
        setTemplateConflictOpen={setTemplateConflictOpen}
        reassignmentMode={reassignmentMode}
        setReassignmentMode={setReassignmentMode}
        templateMappingDraft={templateMappingDraft}
        setTemplateMappingDraft={setTemplateMappingDraft}
        buildAutoMappings={buildAutoMappings}
        templateConflictRows={templateConflictRows}
        templateTargetOptions={templateTargetOptions}
        setDragSourceKey={setDragSourceKey}
        dragSourceKey={dragSourceKey}
        openApplyPreview={openApplyPreview}
        applyPreviewOpen={applyPreviewOpen}
        setApplyPreviewOpen={setApplyPreviewOpen}
        applyPreviewRows={applyPreviewRows}
        applyTemplateWithMappings={applyTemplateWithMappings}
      />

      <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm">
        <PageHeader
          icon="ph-layout"
          title="Storage Layout Editor"
          description="Design spatial distributions and organize cabinet placement for institutional efficiency."
          filters={
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1">
                <label className="ml-1 text-[10px] font-black tracking-widest text-gray-500 uppercase">
                  Active Room
                </label>
                <div className="flex items-center gap-2">
                  <Select
                    className="h-10 min-w-[200px] cursor-pointer rounded-brand border border-gray-300 bg-white pr-8 pl-3 text-sm font-bold text-gray-800 shadow-sm focus:ring-2 focus:ring-pup-maroon focus:outline-none"
                    value={String(activeRoomId ?? "")}
                    onChange={(e) => {
                      const nextId = Number(e.target.value)
                      setActiveRoomId(Number.isFinite(nextId) ? nextId : null)
                    }}
                  >
                    {layout.rooms.map((r) => (
                      <option key={r.id} value={String(r.id)}>
                        {r.name || `Room ${r.id}`}
                      </option>
                    ))}
                  </Select>
                  <ButtonGroup className="h-10 shadow-sm">
                    <div data-slot="button">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={addRoom}
                            className="h-10 w-10 text-pup-maroon hover:bg-red-50"
                          >
                            <div role="button" tabIndex={0}>
                              <i className="ph-bold ph-plus" />
                            </div>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Add New Room</TooltipContent>
                      </Tooltip>
                    </div>

                    <div data-slot="button">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setDeleteRoomConfirmOpen(true)}
                            className="h-10 w-10 text-gray-600 hover:bg-gray-100 hover:text-red-600"
                            disabled={!activeRoom || activeRoomStudentCount > 0}
                          >
                            <div role="button" tabIndex={0}>
                              <i className="ph-bold ph-trash" />
                            </div>
                          </Button>                      </TooltipTrigger>
                        <TooltipContent side="bottom">
                          Delete Active Room
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div data-slot="button">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setResetRoomConfirmOpen(true)}
                            className="h-10 w-10 text-gray-600 hover:bg-gray-100 hover:text-amber-600"
                            disabled={
                              !activeRoom ||
                              !(activeRoom.cabinets?.length > 0) ||
                              activeRoomStudentCount > 0
                            }
                          >
                            <div role="button" tabIndex={0}>
                              <i className="ph-bold ph-arrow-counter-clockwise" />
                            </div>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          Clear Room Layout
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </ButtonGroup>
                </div>
              </div>

              <div className="h-10 w-px self-end bg-gray-200" />

              <div className="flex flex-col gap-1">
                <label className="ml-1 text-[10px] font-black tracking-widest text-gray-500 uppercase">
                  Editor Tools
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCabinet}
                    className="h-10 rounded-brand border-gray-300 px-4 font-bold shadow-sm hover:border-gray-300 hover:bg-red-50/30"
                    disabled={!activeRoom}
                  >
                    <i className="ph-bold ph-plus-square mr-2 text-pup-maroon" />{" "}
                    ADD CABINET
                  </Button>

                  <div className="flex h-10 items-center overflow-hidden rounded-brand border border-gray-300 shadow-sm">
                    <Select
                      className="h-full cursor-pointer border-r border-gray-300 bg-white px-3 text-sm font-bold text-gray-700 focus:outline-none"
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      disabled={!activeRoom}
                    >
                      {ROOM_TEMPLATES.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setTemplateApplyConfirmOpen(true)}
                      className="h-full rounded-none bg-gray-50 px-4 text-xs font-black tracking-wider uppercase transition-colors hover:bg-pup-maroon hover:text-white"
                      disabled={!activeRoom}
                    >
                      APPLY
                    </Button>
                  </div>

                  <div className="flex h-10 items-center gap-2 rounded-brand border border-gray-300 bg-white px-3 shadow-sm">
                    <i
                      className={`ph-bold ph-grid-four ${showGrid ? "text-pup-maroon" : "text-gray-400"}`}
                    />
                    <span className="text-[10px] font-black tracking-widest text-gray-500 uppercase">
                      Grid
                    </span>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setShowGrid(!showGrid)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${showGrid ? "bg-pup-maroon" : "bg-gray-200"}`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showGrid ? "translate-x-5" : "translate-x-1"}`}
                      />
                    </div>
                  </div>

                  <div className="flex h-10 items-center gap-2 rounded-brand border border-gray-300 bg-white px-3 shadow-sm">
                    <i
                      className={`ph-bold ph-magnet-straight ${snapToGrid ? "text-pup-maroon" : "text-gray-400"}`}
                    />
                    <span className="text-[10px] font-black tracking-widest text-gray-500 uppercase">
                      Snap
                    </span>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSnapToGrid(!snapToGrid)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${snapToGrid ? "bg-pup-maroon" : "bg-gray-200"}`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${snapToGrid ? "translate-x-5" : "translate-x-1"}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
          actions={
            <Button
              onClick={saveLayout}
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-brand bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md px-8 font-black tracking-widest text-white uppercase shadow-lg transition-all"
            >
              <i
                className={`ph-bold ${saving ? "ph-spinner animate-spin" : "ph-floppy-disk"} text-lg`}
              />
              {saving ? "SAVING..." : "SAVE LAYOUT"}
            </Button>
          }
        />

        <div className="relative min-h-0 flex-1 overflow-auto bg-white">
          <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CabinetCanvas 
                canvasRef={canvasRef}
                activeRoom={activeRoom}
                selectedCabinetIds={selectedCabinetIds}
                selectedCabinet={selectedCabinet}
                collidingIds={collidingIds}
                activePath={activePath}
                simulationMode={simulationMode}
                snapToGrid={snapToGrid}
                showGrid={showGrid}
                handleCanvasPointerMove={handleCanvasPointerMove}
                handleCanvasPointerUp={handleCanvasPointerUp}
                setSelectedCabinetIds={setSelectedCabinetIds}
                rotateSelectedCabinet={rotateSelectedCabinet}
                duplicateSelectedCabinet={duplicateSelectedCabinet}
                setBulkConfirmOpen={setBulkConfirmOpen}
                dragRef={dragRef}
                updateSelectedRectFromNormalized={updateSelectedRectFromNormalized}
                updateSelectedSizeNormalized={updateSelectedSizeNormalized}
              />
            </div>

            <div className="lg:col-span-1">
              <CabinetSidebar 
                selectedCabinetIds={selectedCabinetIds}
                selectedCabinet={selectedCabinet}
                rotateSelectedCabinet={rotateSelectedCabinet}
                duplicateSelectedCabinet={duplicateSelectedCabinet}
                setBulkConfirmOpen={setBulkConfirmOpen}
                removeDrawerFromSelected={removeDrawerFromSelected}
                addDrawerToSelected={addDrawerToSelected}
                updateSelectedRectFromNormalized={updateSelectedRectFromNormalized}
                updateSelectedSizeNormalized={updateSelectedSizeNormalized}
              />
            </div>
          </div>
        </div>
      </Card>

      <FloatingActionBar
        selectedCount={selectedCabinetIds.size}
        onCancel={() => setSelectedCabinetIds(new Set())}
        actionLabel="DELETE SELECTED"
        actionIcon="ph-trash"
        onAction={() => setBulkConfirmOpen(true)}
        selectionStatus="Selected Cabinets"
      />

      <ConfirmModal
        open={bulkConfirmOpen}
        onCancel={() => setBulkConfirmOpen(false)}
        title={selectedCabinetIds.size > 1 ? "Delete Multiple Cabinets" : "Delete Cabinet"}
        message={selectedCabinetIds.size > 1 
          ? `Permanently delete these ${selectedCabinetIds.size} cabinets? This will remove them from the room layout and cannot be undone.`
          : `Permanently delete this cabinet? This will remove it from the room layout and cannot be undone.`
        }
        note="Changes are staged locally. You must click 'Save Layout' to finalize deletion."
        confirmLabel="DELETE PERMANENTLY"
        variant="danger"
        icon="ph-duotone ph-trash"
        buttonIcon="ph-bold ph-trash"
        onConfirm={bulkDeleteCabinets}
      />

      <ConfirmModal
        open={deleteRoomConfirmOpen}
        onCancel={() => setDeleteRoomConfirmOpen(false)}
        title="Delete Archive Room"
        message={`Permanently remove Room ${activeRoom?.id}? All layout data for this room will be wiped.`}
        note="Changes are staged locally. You must click 'Save Layout' to finalize deletion."
        confirmLabel="DELETE ROOM"
        variant="danger"
        icon="ph-duotone ph-trash"
        buttonIcon="ph-bold ph-trash"
        onConfirm={() => {
          removeActiveRoom()
          setDeleteRoomConfirmOpen(false)
        }}
      />

      <ConfirmModal
        open={resetRoomConfirmOpen}
        onCancel={() => setResetRoomConfirmOpen(false)}
        title="Clear Room Layout"
        message={`Remove all cabinets from Room ${activeRoom?.id}?`}
        note="Changes are staged locally. You must click 'Save Layout' to finalize deletion."
        confirmLabel="CLEAR LAYOUT"
        variant="warning"
        onConfirm={() => {
          resetActiveRoomCabinets()
          setResetRoomConfirmOpen(false)
        }}
      />

      <ConfirmModal
        open={templateApplyConfirmOpen}
        onCancel={() => setTemplateApplyConfirmOpen(false)}
        title="Apply Room Template"
        message={`Overwrite the current layout of Room ${activeRoom?.id} with the selected template?`}
        note="Changes are staged locally. You must click 'Save Layout' to finalize."
        confirmLabel="APPLY TEMPLATE"
        variant="warning"
        onConfirm={() => {
          applyTemplateToActiveRoom()
          setTemplateApplyConfirmOpen(false)
        }}
      />
    </div>
  )
}
