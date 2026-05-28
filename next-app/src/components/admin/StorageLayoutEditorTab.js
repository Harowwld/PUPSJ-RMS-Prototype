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
  TooltipProvider,
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
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"

// Utilities
import {
  clamp,
  getCabinetEffectiveSize,
  clampToRoom,
  snapValue,
  calculatePath,
} from "@/lib/storageLayoutUtils"

export default function StorageLayoutEditorTab({ showToast, isDirty, setIsDirty, error = null }) {
  // 1. BASE STATE
  const [layout, setLayout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [studentRoomUsage, setStudentRoomUsage] = useState(new Map())
  const [studentDrawerUsage, setStudentDrawerUsage] = useState(new Map())

  const [activeRoomId, setActiveRoomId] = useState(null)
  const [selectedCabinetIds, setSelectedCabinetIds] = useState(new Set())
  const [selectedTemplateId, setSelectedTemplateId] = useState("grid-4x2")
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [saveCountdown, setSaveCountdown] = useState(0)
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

  const [selectionBox, setSelectionBox] = useState(null)
  const [history, setHistory] = useState([])
  const [clipboard, setClipboard] = useState(null)

  const canvasRef = useRef(null)
  const dragRef = useRef(null)

  const MIN_SIZE = 0.05 // 2 grid units (2 * 0.025)
  const MAX_SIZE = 0.1  // 4 grid units (4 * 0.025)
  const CABINET_ASPECT_RATIO = 1.6 // Match SNAP_STEP_Y / SNAP_STEP_X (0.04 / 0.025) to align with 2x2 to 4x4 grid limits

  // 2. CORE UTILITY FUNCTIONS (Updaters)
  const updateRoom = useCallback((roomId, updater) => {
    setLayout((prev) => {
      if (!prev) return prev
      const rooms = prev.rooms.map((r) => 
        String(r.id) === String(roomId) ? { ...updater(r), id: r.id } : r
      )
      return { ...prev, rooms }
    })
    setIsDirty?.(true)
  }, [setIsDirty])

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
        if (String(r.id) !== String(roomId)) return r
        const cabinets = r.cabinets.map((c) => {
          if (String(c.id) !== String(cabinetId)) return c
          return updater(c)
        })
        return { ...r, cabinets }
      })
      return { ...prev, rooms }
    })
    setIsDirty?.(true)
  }, [updateRoom, setIsDirty])

  const pushHistory = useCallback((currentLayout) => {
    if (!currentLayout) return
    setHistory((prev) => {
      // Don't push if it's the same as the last state
      const last = prev[prev.length - 1]
      if (last && JSON.stringify(last) === JSON.stringify(currentLayout)) return prev
      return [...prev.slice(-19), JSON.parse(JSON.stringify(currentLayout))]
    })
  }, [])

  // 3. DERIVED STATE
  const activeRoom = useMemo(() => {
    if (!layout || activeRoomId == null) return null
    return layout.rooms.find((r) => String(r.id) === String(activeRoomId)) || null
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
          w: activeRoom.door?.w ?? 0.1,
          h: activeRoom.door?.h ?? 0.04,
        },
        rotation: activeRoom.door?.rotation ?? 0,
      }
    }
    return activeRoom.cabinets.find((c) => String(c.id) === String(id)) || null
  }, [activeRoom, selectedCabinetIds])

  // 4. HIGH-LEVEL CALLBACKS (Undo, Copy, Paste, Add/Remove)
  const undo = useCallback(() => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setLayout(prev)
    setIsDirty?.(true)
  }, [history, setIsDirty])

  const copyCabinets = useCallback(() => {
    if (!activeRoom || selectedCabinetIds.size === 0) return
    const cabs = activeRoom.cabinets.filter(c => selectedCabinetIds.has(c.id))
    setClipboard(JSON.parse(JSON.stringify(cabs)))
  }, [activeRoom, selectedCabinetIds])

  const pasteCabinets = useCallback(() => {
    if (!activeRoom || !clipboard) return
    pushHistory(layout)

    const existingIds = new Set(activeRoom.cabinets.map(c => c.id))
    const getNextId = (currentSet) => {
      let counter = 0
      while (true) {
        const id = String.fromCharCode(65 + (counter % 26)) + (counter >= 26 ? Math.floor(counter / 26) : "")
        if (!currentSet.has(id)) return id
        counter++
      }
    }

    const newCabinets = clipboard.map(c => {
      const id = getNextId(existingIds)
      existingIds.add(id)
      return {
        ...c,
        id,
        rect: {
          ...c.rect,
          x: snapValue(c.rect.x + 0.05, true, 'x'),
          y: snapValue(c.rect.y + 0.05, true, 'y')
        }
      }
    })

    updateRoom(activeRoom.id, (r) => ({
      ...r,
      cabinets: [...r.cabinets, ...newCabinets].sort((a, b) =>
        String(a.id).localeCompare(String(b.id))
      ),
    }))

    setSelectedCabinetIds(new Set(newCabinets.map(c => c.id)))
  }, [activeRoom, clipboard, layout, pushHistory, updateRoom])

  const addCabinet = useCallback(() => {
    if (!activeRoom) return
    pushHistory(layout)
    const existing = new Set(activeRoom.cabinets.map((c) => c.id))
    let id = ""
    let counter = 0
    while (true) {
      id = String.fromCharCode(65 + (counter % 26)) + (counter >= 26 ? Math.floor(counter / 26) : "")
      if (!existing.has(id)) break
      counter++
    }
    const cab = {
      id,
      rect: { x: 0.1, y: 0.1, w: 0.075, h: 0.12 }, 
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
  }, [activeRoom, layout, pushHistory, updateRoom])

  const removeSelectedCabinet = useCallback(() => {
    if (!activeRoom || selectedCabinetIds.size === 0) return
    pushHistory(layout)
    
    const idsToRemove = Array.from(selectedCabinetIds)
    
    updateRoom(activeRoom.id, (room) => ({
      ...room,
      cabinets: room.cabinets.filter((c) => !idsToRemove.includes(c.id)),
    }))
    
    setSelectedCabinetIds(new Set())
  }, [activeRoom, selectedCabinetIds, layout, pushHistory, updateRoom])

  const duplicateSelectedCabinet = useCallback(() => {
    if (!activeRoom || !selectedCabinet) return
    pushHistory(layout)
    const existingIds = new Set(activeRoom.cabinets.map((c) => c.id))
    let id = ""
    let counter = 0
    while (true) {
      id = String.fromCharCode(65 + (counter % 26)) + (counter >= 26 ? Math.floor(counter / 26) : "")
      if (!existingIds.has(id)) break
      counter++
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
  }, [activeRoom, selectedCabinet, layout, pushHistory, updateRoom])

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
    const w = clamp(nw, MIN_SIZE, MAX_SIZE)
    const h = w * CABINET_ASPECT_RATIO 
    updateCabinet(activeRoom.id, selectedCabinet.id, (c) =>
      clampToRoom({ ...c, rect: { ...c.rect, w, h } })
    )
  }, [activeRoom, selectedCabinet, updateCabinet, CABINET_ASPECT_RATIO, MIN_SIZE, MAX_SIZE])

  // 5. EVENT HANDLERS
  const handleCanvasPointerMove = useCallback((e) => {
    if (!dragRef.current || !activeRoom) return
    const container = e.currentTarget
    if (!container) return

    const box = container.getBoundingClientRect()
    const relX = (e.clientX - box.left) / Math.max(1, box.width)
    const relY = (e.clientY - box.top) / Math.max(1, box.height)

    const { mode, startX, startY, initialPositions } = dragRef.current

    if (mode === "door") {
      const dx = relX - startX
      const dy = relY - startY
      const rawX = snapValue(initialPositions[0].x + dx, snapToGrid, 'x')
      const rawY = snapValue(initialPositions[0].y + dy, snapToGrid, 'y')

      // Perimeter logic: Check which edge the cursor is closest to
      const distTop = relY
      const distBottom = 1 - relY
      const distLeft = relX
      const distRight = 1 - relX

      const minDist = Math.min(distTop, distBottom, distLeft, distRight)

      let finalX = rawX
      let finalY = rawY
      let finalRot = 0
      let finalW = 0.1
      let finalH = 0.04

      if (minDist === distTop) {
        finalY = 0
        finalRot = 0
        finalW = 0.1
        finalH = 0.04
        finalX = clamp(rawX, 0, 1 - 0.1)
      } else if (minDist === distBottom) {
        finalY = 1 - 0.04
        finalRot = 180
        finalW = 0.1
        finalH = 0.04
        finalX = clamp(rawX, 0, 1 - 0.1)
      } else if (minDist === distLeft) {
        finalX = 0
        finalRot = 270
        finalW = 0.025
        finalH = 0.16
        finalY = clamp(rawY, 0, 1 - 0.16)
      } else if (minDist === distRight) {
        finalX = 1 - 0.025
        finalRot = 90
        finalW = 0.025
        finalH = 0.16
        finalY = clamp(rawY, 0, 1 - 0.16)
      }

      updateRoom(activeRoom.id, (r) => ({
        ...r,
        door: {
          ...r.door,
          x: finalX,
          y: finalY,
          w: finalW,
          h: finalH,
          rotation: finalRot
        }
      }))
    } else if (mode === "marquee") {
      setSelectionBox({
        x1: startX,
        y1: startY,
        x2: relX,
        y2: relY,
      })
    } else if (mode === "move") {
      const dx = relX - startX
      const dy = relY - startY
      initialPositions.forEach((pos) => {
        const nextX = snapValue(pos.x + dx, snapToGrid, 'x')
        const nextY = snapValue(pos.y + dy, snapToGrid, 'y')
        updateCabinet(activeRoom.id, pos.id, (c) =>
          clampToRoom({ ...c, rect: { ...c.rect, x: nextX, y: nextY } })
        )
      })
    } else if (mode === "resize" && selectedCabinet) {
      const dw = relX - selectedCabinet.rect.x
      const nw = snapValue(clamp(dw, MIN_SIZE, MAX_SIZE), snapToGrid, 'x')
      const nh = nw * CABINET_ASPECT_RATIO 
      updateCabinet(activeRoom.id, selectedCabinet.id, (c) =>
        clampToRoom({ ...c, rect: { ...c.rect, w: nw, h: nh } })
      )
    }
  }, [activeRoom, selectedCabinet, snapToGrid, updateCabinet, updateRoom, CABINET_ASPECT_RATIO, MIN_SIZE, MAX_SIZE])

  const handleCanvasPointerUp = useCallback((e) => {
    if (!dragRef.current) return
    
    const { mode } = dragRef.current

    if (mode === "marquee" && selectionBox && activeRoom) {
      const x1 = Math.min(selectionBox.x1, selectionBox.x2)
      const x2 = Math.max(selectionBox.x1, selectionBox.x2)
      const y1 = Math.min(selectionBox.y1, selectionBox.y2)
      const y2 = Math.max(selectionBox.y1, selectionBox.y2)

      const newlySelected = new Set()
      activeRoom.cabinets.forEach((cab) => {
        const eff = getCabinetEffectiveSize(cab)
        const cx1 = cab.rect.x
        const cx2 = cab.rect.x + eff.w
        const cy1 = cab.rect.y
        const cy2 = cab.rect.y + eff.h

        const intersects = !(cx2 < x1 || cx1 > x2 || cy2 < y1 || cy1 > y2)
        if (intersects) newlySelected.add(cab.id)
      })
      setSelectedCabinetIds(newlySelected)
    }

    dragRef.current = null
    setSelectionBox(null)
    try {
      e.target.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }, [selectionBox, activeRoom])

  // 6. LIFE CYCLE / EFFECTS
  useEffect(() => {
    let timer
    if (saveConfirmOpen) {
      setSaveCountdown(3)
      timer = setInterval(() => {
        setSaveCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      setSaveCountdown(0)
    }
    return () => clearInterval(timer)
  }, [saveConfirmOpen])

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
        // silent
      }
    })()
  }, [])

  const activeRoomStudentCount = useMemo(() => {
    if (!activeRoom) return 0
    return Number(studentRoomUsage.get(Number(activeRoom.id)) || 0)
  }, [activeRoom, studentRoomUsage])

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

        const buffer = 0.00001
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

  const hasAnyCollisions = useMemo(() => {
    if (!layout?.rooms) return false
    return layout.rooms.some((r) => findCollisions(r).size > 0)
  }, [layout])

  async function saveLayout() {
    if (!layout || hasAnyCollisions) return
    setSaving(true)
    try {
      const res = await fetch("/api/storage-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layout),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Save failed")
      
      setIsDirty?.(false)
      setSaveConfirmOpen(false)
      showToast?.({
        title: "Layout Saved",
        description: "Your archive room mapping was successfully updated.",
      })
    } catch (err) {
      showToast?.({ title: "Save Failed", description: err.message }, true)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.tagName === "SELECT" ||
        e.target.isContentEditable
      ) {
        return
      }

      const key = e.key.toLowerCase()
      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && key === "z") {
        e.preventDefault()
        undo()
      } else if (ctrl && key === "c") {
        e.preventDefault()
        copyCabinets()
      } else if (ctrl && key === "v") {
        e.preventDefault()
        pasteCabinets()
      } else if (key === "backspace" || key === "delete") {
        if (selectedCabinetIds.size > 0) {
          e.preventDefault()
          pushHistory(layout)
          removeSelectedCabinet()
        }
      } else if (key === "s") {
        setSnapToGrid((prev) => !prev)
      } else if (key === "g") {
        setShowGrid((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    selectedCabinetIds,
    undo,
    copyCabinets,
    pasteCabinets,
    layout,
    pushHistory,
    removeSelectedCabinet
  ])

  // Template / Bulk logic
  function bulkDeleteCabinets() {
    removeSelectedCabinet()
    setBulkConfirmOpen(false)
  }

  function addRoom() {
    let createdRoomId = null
    setLayout((prev) => {
      if (!prev) return prev
      const max = Math.max(0, ...(prev.rooms || []).map((r) => Number(r.id) || 0))
      const nextId = max + 1
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
      showToast?.({ title: "Cannot Remove", description: `Room ${activeRoom.id} is occupied.` }, true)
      return
    }
    if (activeRoom.cabinets?.length) {
      showToast?.({ title: "Cannot Remove", description: "Clear room first." }, true)
      return
    }
    setLayout((prev) => {
      if (!prev) return prev
      const rooms = prev.rooms.filter((r) => r.id !== activeRoom.id)
      return { ...prev, rooms }
    })
    setIsDirty?.(true)
    const fallback = layout.rooms.find((r) => r.id !== activeRoom.id)?.id || null
    setActiveRoomId(fallback)
    setSelectedCabinetIds(new Set())
  }

  function resetActiveRoomCabinets() {
    if (!layout || !activeRoom) return
    if (activeRoomStudentCount > 0) {
      showToast?.({ title: "Cannot Reset", description: `Room ${activeRoom.id} is occupied.` }, true)
      return
    }
    updateRoom(activeRoom.id, (r) => ({ ...r, cabinets: [] }))
    setSelectedCabinetIds(new Set())
  }

  function applyTemplateToActiveRoom() {
    if (!activeRoom) return
    const tpl = ROOM_TEMPLATES.find((t) => t.id === selectedTemplateId)
    if (!tpl) return
    pushHistory(layout)
    const targetLocKeys = new Set()
    const targetOpts = []
    for (const c of tpl.cabinets || []) {
      for (const d of c.drawerIds || []) {
        const key = `${activeRoom.id}|${c.id}|${Number(d)}`
        targetLocKeys.add(key)
        targetOpts.push({ key, label: `Room ${activeRoom.id} / Cab ${c.id} / Dr ${d}` })
      }
    }
    const conflicts = []
    for (const c of activeRoom.cabinets || []) {
      for (const d of c.drawerIds || []) {
        const sourceKey = `${activeRoom.id}|${c.id}|${Number(d)}`
        const usedCount = Number(studentDrawerUsage.get(sourceKey) || 0)
        if (usedCount <= 0 || targetLocKeys.has(sourceKey)) continue
        conflicts.push({ sourceKey, sourceLabel: `Room ${activeRoom.id} / Cab ${c.id} / Dr ${d}`, count: usedCount })
      }
    }
    if (conflicts.length > 0) {
      const nextDraft = {}
      for (const c of conflicts) nextDraft[c.sourceKey] = ""
      setTemplateConflictRows(conflicts)
      setTemplateTargetOptions(targetOpts)
      setTemplateMappingDraft(nextDraft)
      setTemplateApplyPayload({ roomId: activeRoom.id, templateId: tpl.id })
      setTemplateConflictOpen(true)
      return
    }
    updateRoom(activeRoom.id, (r) => ({
      ...r,
      cabinets: (tpl.cabinets || []).map((c) => ({ ...c })),
      door: tpl.door ? { ...tpl.door } : r.door,
    }))
    setSelectedCabinetIds(new Set())
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
    const hasMissing = templateConflictRows.some(r => !templateMappingDraft[r.sourceKey])
    if (hasMissing) {
      showToast?.({ title: "Incomplete Mapping", description: "Assign all conflicts." }, true)
      return
    }
    const rows = templateConflictRows.map(r => {
      const targetKey = templateMappingDraft[r.sourceKey]
      const targetOpt = templateTargetOptions.find(o => o.key === targetKey)
      return { fromKey: r.sourceKey, fromLabel: r.sourceLabel, toKey: targetKey, toLabel: targetOpt?.label || "Unknown", count: r.count }
    })
    setApplyPreviewRows(rows)
    setApplyPreviewOpen(true)
  }

  async function applyTemplateWithMappings() {
    if (!layout || !templateApplyPayload) return
    const tpl = ROOM_TEMPLATES.find(t => t.id === templateApplyPayload.templateId)
    if (!tpl) return

    const nextRooms = layout.rooms.map(r => {
      if (r.id !== templateApplyPayload.roomId) return r
      return { ...r, cabinets: (tpl.cabinets || []).map(c => ({ ...c })), door: tpl.door ? { ...tpl.door } : r.door }
    })
    const nextLayout = { ...layout, rooms: nextRooms }
    const reassignments = applyPreviewRows.map(r => ({ fromKey: r.fromKey, toKey: r.toKey }))

    setSaving(true)
    try {
      const res = await fetch("/api/storage-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: nextLayout, reassignments, skipUsageCheck: true }),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Apply failed")
      setLayout(json.data)
      setTemplateConflictOpen(false)
      setApplyPreviewOpen(false)
      setApplyReportRows(json.movedBreakdown || [])
      setApplyReportOpen(true)
    } catch (err) {
      showToast?.({ title: "Apply Failed", description: err.message }, true)
    } finally {
      setSaving(false)
    }
  }

  if (loading && !layout) {
    return (
      <div className="flex flex-1 flex-col gap-8 p-10 animate-pulse">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64 rounded-xl dark:bg-muted" />
          <Skeleton className="h-10 w-40 rounded-xl dark:bg-muted" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          <Skeleton className="lg:col-span-2 h-[600px] rounded-2xl dark:bg-muted" />
          <Skeleton className="lg:col-span-1 h-[600px] rounded-2xl dark:bg-muted" />
        </div>
      </div>
    )
  }

  if (!layout) return null

  const renderToolbar = () => (
    <div className={cn(
      "flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-muted/30 backdrop-blur-md select-none",
      "p-6 px-8"
    )}>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <label className="ml-1 text-[9px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">Current Room</label>
            <div className="flex items-center gap-2">
              <div className="relative group">
                <i className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 transition-all duration-300", activeRoomId ? "ph-fill ph-door-open text-pup-maroon dark:text-primary" : "ph-bold ph-door-open text-gray-400 dark:text-zinc-500", "group-focus-within:text-pup-maroon dark:text-primary")} />
                <Select
                  className="h-10 min-w-[200px] cursor-pointer rounded-xl border border-gray-200 bg-white pl-10 pr-10 text-sm font-bold text-gray-800 shadow-xs transition-all focus:border-gray-300 focus:ring-2 focus:ring-pup-maroon/20 dark:border-white/10 dark:bg-card dark:text-zinc-100 dark:focus:border-zinc-700"
                  value={String(activeRoomId ?? "")}
                  disabled={!layout?.rooms?.length}
                  onChange={(e) => setActiveRoomId(Number(e.target.value))}
                >
                  {layout.rooms.map((r) => (
                    <option key={`room-opt-${r.id}`} value={String(r.id)}>{r.name || `Room ${r.id}`}</option>
                  ))}
                </Select>
              </div>
              <div className="flex h-10 items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-xs dark:border-white/10 dark:bg-card">
                <Button type="button" variant="ghost" size="icon" onClick={addRoom} className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30"><i className="ph-bold ph-plus-circle text-lg" /></Button>
                <Separator orientation="vertical" className="h-4 mx-0.5 bg-gray-100 dark:bg-muted" />
                <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteRoomConfirmOpen(true)} className="h-8 w-8 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:bg-red-950/30 dark:text-zinc-500" disabled={!activeRoom || activeRoomStudentCount > 0}><i className="ph-bold ph-trash text-lg" /></Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="ml-1 text-[9px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">Add Tools</label>
          <Button type="button" variant="outline" onClick={addCabinet} className="h-10 rounded-xl border border-gray-200 bg-white px-5 font-black text-[10px] tracking-widest text-gray-600 shadow-xs hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 dark:border-white/10 dark:bg-card dark:text-zinc-300" disabled={!activeRoom}><i className="ph-bold ph-plus-square mr-2 text-base" />NEW CABINET</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex flex-col gap-1 w-48">
          <label className="ml-1 text-[9px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">Templates</label>
          <div className="flex flex-col gap-1.5">
            <Select
              menuClassName="min-w-max"
              className="h-9 w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 shadow-xs transition-all focus:border-gray-300 focus:ring-2 focus:ring-pup-maroon/20 dark:border-white/10 dark:bg-card dark:text-zinc-100 dark:focus:border-zinc-700"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              disabled={!activeRoom}
            >
              {ROOM_TEMPLATES.map((tpl) => <option key={`tpl-opt-${tpl.id}`} value={tpl.id}>{tpl.name}</option>)}
            </Select>
            <Button 
              type="button" 
              onClick={() => setTemplateApplyConfirmOpen(true)} 
              className="h-8 w-full rounded-xl btn-brand-red text-[9px] font-black tracking-widest uppercase text-white shadow-sm active:scale-95 transition-all dark:shadow-none" 
              disabled={!activeRoom}
            >
              USE TEMPLATE
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="ml-1 text-[9px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">View Settings</label>
          <div className="flex h-10 items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 shadow-xs dark:border-white/10 dark:bg-card">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase dark:text-zinc-400">Grid</span>
              <div role="button" tabIndex={0} onClick={() => setShowGrid(!showGrid)} className={cn("relative inline-flex h-4 w-8 items-center rounded-full transition-all duration-300", showGrid ? "bg-pup-maroon dark:bg-red-500/20 dark:ring-1 dark:ring-red-500/30" : "bg-gray-200 dark:bg-zinc-800")}>
                <span className={cn("inline-block h-2.5 w-2.5 transform rounded-full transition-all duration-300 shadow-xs", showGrid ? "translate-x-4.5 bg-white dark:bg-red-400" : "translate-x-1 bg-white dark:bg-zinc-500")} />
              </div>
            </div>
            <Separator orientation="vertical" className="h-3.5 bg-gray-100 dark:bg-muted" />
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase dark:text-zinc-400">Snap</span>
              <div role="button" tabIndex={0} onClick={() => setSnapToGrid(!snapToGrid)} className={cn("relative inline-flex h-4 w-8 items-center rounded-full transition-all duration-300", snapToGrid ? "bg-pup-maroon dark:bg-red-500/20 dark:ring-1 dark:ring-red-500/30" : "bg-gray-200 dark:bg-zinc-800")}>
                <span className={cn("inline-block h-2.5 w-2.5 transform rounded-full transition-all duration-300 shadow-xs", snapToGrid ? "translate-x-4.5 bg-white dark:bg-red-400" : "translate-x-1 bg-white dark:bg-zinc-500")} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderEditorContent = () => (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white select-none dark:bg-card">
      <PageHeader
        icon="ph-layout"
        title="Storage Layout Editor"
        description="Organize how cabinets are placed and arranged in your storage rooms."
        actions={
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-block">
                    <Button
                      onClick={saveLayout}
                      disabled={saving || hasAnyCollisions}
                      className="flex h-11 items-center gap-2 btn-brand-red active:scale-95 disabled:opacity-30 disabled:grayscale transition-all dark:shadow-none"
                    >
                      <i className={`ph-bold ${saving ? "ph-spinner animate-spin" : "ph-floppy-disk"} text-lg`} />
                      {saving ? "SAVING..." : "SAVE"}
                    </Button>
                  </div>
                </TooltipTrigger>
                {hasAnyCollisions && (
                  <TooltipContent side="bottom" className="max-w-xs rounded-xl border-red-200 bg-red-50 p-3 text-[10px] font-bold text-red-700 shadow-xl dark:bg-red-950/30 dark:shadow-none">
                    <div className="flex items-center gap-2">
                       <i className="ph-fill ph-warning-circle text-sm" />
                       CANNOT SAVE: RESOLVE OVERLAPS
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        }
      />

      {renderToolbar()}

      <div className="relative min-h-0 flex-1 overflow-auto">
        <div className="grid grid-cols-1 gap-6 h-full p-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CabinetCanvas 
              canvasRef={canvasRef} activeRoom={activeRoom} selectedCabinetIds={selectedCabinetIds} selectedCabinet={selectedCabinet} collidingIds={collidingIds} activePath={activePath} simulationMode={simulationMode} snapToGrid={snapToGrid} showGrid={showGrid} handleCanvasPointerMove={handleCanvasPointerMove} handleCanvasPointerUp={handleCanvasPointerUp} setSelectedCabinetIds={setSelectedCabinetIds} duplicateSelectedCabinet={duplicateSelectedCabinet} setBulkConfirmOpen={setBulkConfirmOpen} dragRef={dragRef} updateSelectedRectFromNormalized={updateSelectedRectFromNormalized} updateSelectedSizeNormalized={updateSelectedSizeNormalized} selectionBox={selectionBox} pushHistory={pushHistory} layout={layout} isModalOpen={false}
            />
          </div>
          <div className="lg:col-span-1 select-none">
            <CabinetSidebar 
              selectedCabinetIds={selectedCabinetIds} selectedCabinet={selectedCabinet} duplicateSelectedCabinet={duplicateSelectedCabinet} setBulkConfirmOpen={setBulkConfirmOpen} removeDrawerFromSelected={removeDrawerFromSelected} addDrawerToSelected={addDrawerToSelected} updateSelectedRectFromNormalized={updateSelectedRectFromNormalized} updateSelectedSizeNormalized={updateSelectedSizeNormalized}
            />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="animate-fade-up font-inter flex h-full w-full flex-col gap-4">
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

      <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm p-0 gap-0 dark:border-white/10 dark:bg-card dark:shadow-none">
        {renderEditorContent()}
      </Card>

      <FloatingActionBar selectedCount={selectedCabinetIds.size} onCancel={() => setSelectedCabinetIds(new Set())} actionLabel="DELETE SELECTED" actionIcon="ph-trash" onAction={() => setBulkConfirmOpen(true)} selectionStatus="Selected Cabinets" />

      <ConfirmModal open={bulkConfirmOpen} onCancel={() => setBulkConfirmOpen(false)} title="Delete" message="Delete selected cabinets?" confirmLabel="DELETE" variant="danger" onConfirm={bulkDeleteCabinets} />
      <ConfirmModal open={deleteRoomConfirmOpen} onCancel={() => setDeleteRoomConfirmOpen(false)} title="Delete Room" message="Delete this room?" confirmLabel="DELETE" variant="danger" onConfirm={() => { removeActiveRoom(); setDeleteRoomConfirmOpen(false); }} />
      <ConfirmModal open={resetRoomConfirmOpen} onCancel={() => setResetRoomConfirmOpen(false)} title="Reset Room" message="Clear layout?" confirmLabel="RESET" variant="warning" onConfirm={() => { resetActiveRoomCabinets(); setResetRoomConfirmOpen(false); }} />
      <ConfirmModal open={templateApplyConfirmOpen} onCancel={() => setTemplateApplyConfirmOpen(false)} title="Use Template" message="Apply template?" confirmLabel="USE" variant="warning" onConfirm={() => { applyTemplateToActiveRoom(); setTemplateApplyConfirmOpen(false); }} />
    </div>
  )
}



