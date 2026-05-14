"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ROOM_TEMPLATES, getDefaultDoor } from "@/lib/storageLayoutDefaults"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"

import PageHeader from "@/components/shared/PageHeader"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import ConfirmModal from "@/components/shared/ConfirmModal"

function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

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
  const [applyPreviewOpen, setApplyPreviewOpen] = useState(false)
  const [applyPreviewRows, setApplyPreviewRows] = useState([])
  const [applyReportOpen, setApplyReportOpen] = useState(false)
  const [applyReportRows, setApplyReportRows] = useState([])

  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const MIN_SIZE = 0.02
  const SNAP_STEP = 0.02 // 2% grid

  const snapValue = (val) => {
    if (!snapToGrid) return val
    return Math.round(val / SNAP_STEP) * SNAP_STEP
  }

  const getEffectiveSize = (item) => {
    const baseW = Number(item?.rect?.w ?? item?.w) || 0
    const baseH = Number(item?.rect?.h ?? item?.h) || 0
    const rot = Number(item?.rotation) === 90 ? 90 : 0
    return rot === 90 ? { w: baseH, h: baseW } : { w: baseW, h: baseH }
  }

  const checkCollisions = (targetId, nextRect, nextRotation, currentRoom) => {
    if (!currentRoom?.cabinets) return false

    // Canonicalize the target's bounding box
    const rot = Number(nextRotation) === 90 ? 90 : 0
    const effW = rot === 90 ? nextRect.h : nextRect.w
    const effH = rot === 90 ? nextRect.w : nextRect.h

    const tL = nextRect.x
    const tR = nextRect.x + effW
    const tT = nextRect.y
    const tB = nextRect.y + effH

    for (const other of currentRoom.cabinets) {
      if (other.id === targetId) continue

      const otherEff = getEffectiveSize(other)
      const oL = other.rect.x
      const oR = other.rect.x + otherEff.w
      const oT = other.rect.y
      const oB = other.rect.y + otherEff.h

      // Intersection check (with small tolerance)
      const buffer = 0.001
      const intersects = !(
        tR <= oL + buffer ||
        tL >= oR - buffer ||
        tB <= oT + buffer ||
        tT >= oB - buffer
      )

      if (intersects) return true
    }
    return false
  }

  const clampToRoom = (item) => {
    const x = Number(item?.rect?.x ?? item?.x) || 0
    const y = Number(item?.rect?.y ?? item?.y) || 0
    const { w, h } = getEffectiveSize(item)
    const cx = clamp(x, 0, Math.max(0, 1 - w))
    const cy = clamp(y, 0, Math.max(0, 1 - h))
    if (item.rect) {
      return {
        ...item,
        rect: { ...item.rect, x: cx, y: cy },
      }
    }
    return { ...item, x: cx, y: cy }
  }

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

  // BFS Pathfinding implementation
  const calculatePath = (room, targetCabId) => {
    if (!room || !targetCabId || targetCabId === "DOOR") return null
    const targetCab = room.cabinets.find((c) => c.id === targetCabId)
    if (!targetCab) return null

    const door = room.door || getDefaultDoor()
    const GRID_SIZE = 50
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0))

    // Mark obstacles (cabinets)
    room.cabinets.forEach((cab) => {
      const eff = getEffectiveSize(cab)
      const sx = Math.max(0, Math.floor(cab.rect.x * GRID_SIZE))
      const sy = Math.max(0, Math.floor(cab.rect.y * GRID_SIZE))
      const ex = Math.min(GRID_SIZE - 1, Math.ceil((cab.rect.x + eff.w) * GRID_SIZE))
      const ey = Math.min(GRID_SIZE - 1, Math.ceil((cab.rect.y + eff.h) * GRID_SIZE))
      for (let y = sy; y <= ey; y++) {
        for (let x = sx; x <= ex; x++) {
          grid[y][x] = 1
        }
      }
    })

    const doorEff = getEffectiveSize(door)
    const startX = clamp(Math.floor((door.x + doorEff.w / 2) * GRID_SIZE), 0, GRID_SIZE - 1)
    const startY = clamp(Math.floor((door.y + doorEff.h / 2) * GRID_SIZE), 0, GRID_SIZE - 1)
    
    const cabEff = getEffectiveSize(targetCab)
    const endX = clamp(Math.floor((targetCab.rect.x + cabEff.w / 2) * GRID_SIZE), 0, GRID_SIZE - 1)
    const endY = clamp(Math.floor((targetCab.rect.y + cabEff.h / 2) * GRID_SIZE), 0, GRID_SIZE - 1)

    // BFS for simplest path
    const queue = [[startX, startY, []]]
    const visited = new Set([`${startX},${startY}`])
    
    // Clear start/end grid cells to ensure path can start/end
    grid[startY][startX] = 0
    grid[endY][endX] = 0

    while (queue.length > 0) {
      const [x, y, path] = queue.shift()
      if (Math.abs(x - endX) <= 1 && Math.abs(y - endY) <= 1) {
        return [...path, [x, y], [endX, endY]]
      }

      const neighbors = [
        [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1],
        [x + 1, y + 1], [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1]
      ]

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && grid[ny][nx] === 0) {
          const key = `${nx},${ny}`
          if (!visited.has(key)) {
            visited.add(key)
            queue.push([nx, ny, [...path, [x, y]]])
          }
        }
      }
    }
    return null
  }

  useEffect(() => {
    if (simulationMode && selectedCabinet && !selectedCabinet.isDoor) {
      const path = calculatePath(activeRoom, selectedCabinet.id)
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
        if (activeRoom.cabinets.some((c) => c.id === id)) {
          validIds.add(id)
        }
      }
      if (validIds.size !== selectedCabinetIds.size) {
        setSelectedCabinetIds(validIds)
      }
    }
  }, [activeRoom, selectedCabinetIds.size])

  function updateCabinet(roomId, cabinetId, updater) {
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
  }

  function updateRoom(roomId, updater) {
    setLayout((prev) => {
      if (!prev) return prev
      const rooms = prev.rooms.map((r) => (r.id === roomId ? updater(r) : r))
      rooms.sort((a, b) => a.id - b.id)
      return { ...prev, rooms }
    })
  }

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
      title: "Layout Reset",
      description:
        "Room cleared. Save to apply. Blocked if students still reference this room.",
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
        id: c.id,
        rect: { ...c.rect },
        rotation: Number(c.rotation) === 90 ? 90 : 0,
        drawerIds: [...(c.drawerIds || [1])],
      })),
      door: r.door || getDefaultDoor(),
    }))
    setSelectedCabinetIds(new Set())
    showToast?.({
      title: "Template Applied",
      description: `"${tpl.name}" has been loaded into the active room.`,
    })
  }

  function buildTemplateLayoutPreview(baseLayout, roomId, templateId) {
    const tpl = ROOM_TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) return baseLayout
    return {
      ...baseLayout,
      rooms: (baseLayout.rooms || []).map((r) =>
        r.id !== roomId
          ? r
          : {
              ...r,
              cabinets: (tpl.cabinets || []).map((c) => ({
                id: c.id,
                rect: { ...c.rect },
                rotation: Number(c.rotation) === 90 ? 90 : 0,
                drawerIds: [...(c.drawerIds || [1])],
              })),
              door: r.door || getDefaultDoor(),
            }
      ),
    }
  }

  function buildAutoMappings() {
    const usedTargets = new Set()
    const next = {}
    const sortedTargets = [...templateTargetOptions]
    for (const row of templateConflictRows) {
      const parsed = String(row.sourceKey || "").split("|")
      const sourceCab = String(parsed[1] || "").trim()
      const sourceDrawer = String(parsed[2] || "").trim()
      const preferred = sortedTargets.find(
        (t) =>
          !usedTargets.has(t.key) &&
          t.key.endsWith(`|${sourceCab}|${sourceDrawer}`)
      )
      const fallback =
        preferred ||
        sortedTargets.find((t) => !usedTargets.has(t.key)) ||
        sortedTargets[0]
      next[row.sourceKey] = fallback?.key || ""
      if (fallback?.key) usedTargets.add(fallback.key)
    }
    return next
  }

  function openApplyPreview() {
    if (!reassignmentMode) {
      showToast?.(
        {
          title: "Choose Reassignment Mode",
          description: "Select Manual or Auto before continuing.",
        },
        true
      )
      return
    }
    if (reassignmentMode === "auto") {
      const next = buildAutoMappings()
      setTemplateMappingDraft(next)
    }
    const draft =
      reassignmentMode === "auto" ? buildAutoMappings() : templateMappingDraft
    const hasMissing = templateConflictRows.some(
      (r) => !String(draft[r.sourceKey] || "").trim()
    )
    if (hasMissing) {
      showToast?.(
        {
          title: "Incomplete Mapping",
          description: "Assign a target drawer for all in-use source drawers.",
        },
        true
      )
      return
    }
    const rows = templateConflictRows.map((r) => {
      const toKey = String(draft[r.sourceKey] || "")
      const toLabel =
        templateTargetOptions.find((t) => t.key === toKey)?.label || toKey
      return {
        fromKey: r.sourceKey,
        fromLabel: r.sourceLabel,
        count: r.count,
        toKey,
        toLabel,
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
    const nextLayout = buildTemplateLayoutPreview(
      layout,
      templateApplyPayload.roomId,
      templateApplyPayload.templateId
    )
    const reassignments = applyPreviewRows.map((r) => ({
      fromKey: r.fromKey,
      toKey: r.toKey,
    }))
    setSaving(true)
    try {
      const previousLayoutSnapshot = JSON.parse(JSON.stringify(layout))
      const res = await fetch("/api/storage-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layout: nextLayout,
          reassignments,
          skipUsageCheck: true,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Template apply failed")
      }
      setLayout(json.data)
      setTemplateConflictOpen(false)
      setApplyPreviewOpen(false)
      setTemplateApplyPayload(null)
      setReassignmentMode("")
      setDragSourceKey("")
      const breakdown = Array.isArray(json?.movedBreakdown)
        ? json.movedBreakdown
        : []
      setApplyReportRows(breakdown)
      setApplyReportOpen(true)
      showToast?.({
        title: "Template Applied",
        description: `Template applied with reassignment. ${Number(json?.movedCount || 0)} student record(s) moved.`,
      })
    } catch (err) {
      showToast?.(
        {
          title: "Apply Failed",
          description:
            err?.message || "Unable to apply template with reassignment.",
        },
        true
      )
    } finally {
      setSaving(false)
    }
  }

  function addCabinet() {
    if (!activeRoom) return
    const baseId = `CAB-${(activeRoom.cabinets?.length || 0) + 1}`
    let id = baseId
    const existing = new Set(activeRoom.cabinets.map((c) => c.id))
    let n = 1
    while (existing.has(id)) {
      n += 1
      id = `CAB-${n}`
    }
    const cab = {
      id,
      rect: { x: 0.05, y: 0.05, w: 0.08, h: 0.12 },
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
  }

  function removeSelectedCabinet() {
    if (!activeRoom || selectedCabinetIds.size === 0) return
    updateRoom(activeRoom.id, (r) => ({
      ...r,
      cabinets: r.cabinets.filter((c) => !selectedCabinetIds.has(c.id)),
    }))
    setSelectedCabinetIds(new Set())
  }

  function bulkDeleteCabinets() {
    removeSelectedCabinet()
    setBulkConfirmOpen(false)
  }

  const [isColliding, setIsColliding] = useState(false)
  const [collidingIds, setCollidingIds] = useState(new Set())

  // Helper to find all pairs of colliding cabinets in a room
  const getAllCollisions = (room) => {
    if (!room?.cabinets) return new Set()
    const colliding = new Set()
    const cabs = room.cabinets
    const buffer = 0.001

    for (let i = 0; i < cabs.length; i++) {
      const a = cabs[i]
      const aEff = getCabinetEffectiveSize(a)
      const aRect = {
        l: a.rect.x,
        r: a.rect.x + aEff.w,
        t: a.rect.y,
        b: a.rect.y + aEff.h,
      }

      for (let j = i + 1; j < cabs.length; j++) {
        const b = cabs[j]
        const bEff = getCabinetEffectiveSize(b)
        const bRect = {
          l: b.rect.x,
          r: b.rect.x + bEff.w,
          t: b.rect.y,
          b: b.rect.y + bEff.h,
        }

        const intersects = !(
          aRect.r <= bRect.l + buffer ||
          aRect.l >= bRect.r - buffer ||
          aRect.b <= bRect.t + buffer ||
          aRect.t >= bRect.b - buffer
        )

        if (intersects) {
          colliding.add(a.id)
          colliding.add(b.id)
        }
      }
    }
    return colliding
  }

  // Update collision state whenever the active room's cabinets change
  useEffect(() => {
    if (activeRoom) {
      const collisions = getAllCollisions(activeRoom)
      setCollidingIds(collisions)
      setIsColliding(collisions.size > 0)
    } else {
      setCollidingIds(new Set())
      setIsColliding(false)
    }
  }, [activeRoom])

  function duplicateSelectedCabinet() {
    if (!activeRoom || !selectedCabinet) return
    const baseId = `CAB-${(activeRoom.cabinets?.length || 0) + 1}`
    let id = baseId
    const existingIds = new Set(activeRoom.cabinets.map((c) => c.id))
    let n = 1
    while (existingIds.has(id)) {
      n += 1
      id = `CAB-${n}`
    }

    // Just offset slightly, even if it collides (user can move it later)
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
  }

  function rotateSelectedCabinet() {
    if (!activeRoom || !selectedCabinet) return
    updateCabinet(activeRoom.id, selectedCabinet.id, (c) => {
      const nextRotation = Number(c.rotation) === 90 ? 0 : 90
      return clampCabinetToRoom({ ...c, rotation: nextRotation })
    })
  }

  function addDrawerToSelected() {
    if (!activeRoom || !selectedCabinet) return
    updateCabinet(activeRoom.id, selectedCabinet.id, (c) => {
      const ids = Array.isArray(c.drawerIds) ? c.drawerIds : []
      const max = Math.max(0, ...ids.map((d) => (Number.isFinite(d) ? d : 0)))
      return { ...c, drawerIds: [...ids, max + 1] }
    })
  }

  function removeDrawerFromSelected() {
    if (!activeRoom || !selectedCabinet) return
    updateCabinet(activeRoom.id, selectedCabinet.id, (c) => {
      const ids = Array.isArray(c.drawerIds) ? c.drawerIds : []
      if (ids.length <= 1) return c
      return { ...c, drawerIds: ids.slice(0, -1) }
    })
  }

  function updateSelectedRectFromNormalized(newRect) {
    if (!activeRoom || !selectedCabinet) return
    updateCabinet(activeRoom.id, selectedCabinet.id, (c) => {
      const { w, h } = getCabinetEffectiveSize(c)
      const x = clamp(newRect.x, 0, Math.max(0, 1 - w))
      const y = clamp(newRect.y, 0, Math.max(0, 1 - h))
      return { ...c, rect: { ...c.rect, x, y } }
    })
  }

  function updateSelectedSizeNormalized(nextW, nextH) {
    if (!activeRoom || !selectedCabinet) return
    updateCabinet(activeRoom.id, selectedCabinet.id, (c) => {
      const rot = Number(c.rotation) === 90 ? 90 : 0
      const x = Number(c.rect?.x) || 0
      const y = Number(c.rect?.y) || 0
      const requestedW = clamp(Number(nextW), MIN_SIZE, 1)
      const requestedH = clamp(Number(nextH), MIN_SIZE, 1)
      const effW = rot === 90 ? requestedH : requestedW
      const effH = rot === 90 ? requestedW : requestedH
      const maxEffW = Math.max(MIN_SIZE, 1 - x)
      const maxEffH = Math.max(MIN_SIZE, 1 - y)
      const finalEffW = clamp(effW, MIN_SIZE, maxEffW)
      const finalEffH = clamp(effH, MIN_SIZE, maxEffH)
      const finalW = rot === 90 ? finalEffH : finalEffW
      const finalH = rot === 90 ? finalEffW : finalEffH
      return {
        ...c,
        rect: { ...c.rect, w: finalW, h: finalH },
      }
    })
  }

  function updateSelectedSizeFromPointer(relX, relY) {
    if (!activeRoom || !selectedCabinet) return
    const rot = Number(selectedCabinet.rotation) === 90 ? 90 : 0
    const x = Number(selectedCabinet.rect?.x) || 0
    const y = Number(selectedCabinet.rect?.y) || 0

    const maxW = Math.max(MIN_SIZE, 1 - x)
    const maxH = Math.max(MIN_SIZE, 1 - y)
    const effW = clamp(relX - x, MIN_SIZE, maxW)
    const effH = clamp(relY - y, MIN_SIZE, maxH)

    // rect stores canonical (unrotated) dimensions.
    const nextBaseW = rot === 90 ? effH : effW
    const nextBaseH = rot === 90 ? effW : effH

    updateCabinet(activeRoom.id, selectedCabinet.id, (c) => ({
      ...c,
      rect: {
        ...c.rect,
        w: clamp(nextBaseW, MIN_SIZE, 1),
        h: clamp(nextBaseH, MIN_SIZE, 1),
      },
    }))
  }

  function handleCanvasPointerMove(e) {
    const d = dragRef.current
    if (!d) return
    if (d.pointerId !== e.pointerId) return
    if (!canvasRef.current) return

    // Use requestAnimationFrame to smooth out visual updates and prevent React bottlenecking
    if (d.af) cancelAnimationFrame(d.af)
    d.af = requestAnimationFrame(() => {
      const box = canvasRef.current.getBoundingClientRect()
      const relX = (e.clientX - box.left) / Math.max(1, box.width)
      const relY = (e.clientY - box.top) / Math.max(1, box.height)

      if (d.mode === "resize") {
        if (!activeRoom || !selectedCabinet) return
        const rot = Number(selectedCabinet.rotation) === 90 ? 90 : 0
        const x = Number(selectedCabinet.rect?.x) || 0
        const y = Number(selectedCabinet.rect?.y) || 0

        const maxW = Math.max(MIN_SIZE, 1 - x)
        const maxH = Math.max(MIN_SIZE, 1 - y)
        const effW = clamp(snapValue(relX - x), MIN_SIZE, maxW)
        const effH = clamp(snapValue(relY - y), MIN_SIZE, maxH)

        const nextBaseW = rot === 90 ? effH : effW
        const nextBaseH = rot === 90 ? effW : effH

        const nextRect = { ...selectedCabinet.rect, w: nextBaseW, h: nextBaseH }

        updateCabinet(activeRoom.id, selectedCabinet.id, (c) => ({
          ...c,
          rect: nextRect,
        }))
        return
      }

      if (d.mode === "door") {
        if (!activeRoom) return
        const nextX = snapValue(clamp(relX, 0, 1))
        const nextY = snapValue(clamp(relY, 0, 1))
        updateRoom(activeRoom.id, (r) => ({
          ...r,
          door: { x: nextX, y: nextY },
        }))
        return
      }

      // Default: Move Cabinet
      if (selectedCabinetIds.size === 0) return
      
      const deltaX = relX - d.startX
      const deltaY = relY - d.startY

      updateRoom(activeRoom.id, (r) => {
        const nextCabinets = r.cabinets.map((c) => {
          const init = d.initialPositions.find((p) => p.id === c.id)
          if (!init) return c

          const newX = snapValue(init.x + deltaX)
          const newY = snapValue(init.y + deltaY)

          const clampedX = clamp(newX, 0, 1 - init.eff.w)
          const clampedY = clamp(newY, 0, 1 - init.eff.h)

          return {
            ...c,
            rect: { ...c.rect, x: clampedX, y: clampedY },
          }
        })
        return { ...r, cabinets: nextCabinets }
      })
    })
  }

  function handleCanvasPointerUp(e) {
    const d = dragRef.current
    if (!d) return
    if (d.pointerId !== e.pointerId) return
    dragRef.current = null
  }

  async function saveLayout() {
    if (!layout) return
    if (isColliding) {
      showToast?.(
        {
          title: "Cannot Save Layout",
          description: "One or more cabinets are overlapping. Please resolve all collisions before saving.",
        },
        true
      )
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/storage-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layout),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Save failed")
      setLayout(json.data)
      showToast?.({
        title: "Layout Saved",
        description: "All room and cabinet changes have been applied.",
      })
    } catch (err) {
      showToast?.(
        {
          title: "Save Failed",
          description: err?.message || "Unable to save storage layout.",
        },
        true
      )
    } finally {
      setSaving(false)
    }
  }

  const toPct = (val) => Math.round(val * 100)
  const fromPct = (val) => clamp(val / 100, 0, 1)

  if (loading) {
    return (
      <div className="animate-fade-in h-full w-full">
        <div className="border-b border-gray-200 bg-gray-50 p-5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-3 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </div>
            <Skeleton
              className="w-full rounded-brand"
              style={{ aspectRatio: "16 / 10" }}
            />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-[420px] w-full rounded-brand" />
          </div>
        </div>
      </div>
    )
  }

  if (!layout) {
    return (
      <Empty className="flex h-[400px] items-center justify-center border-0 font-semibold text-gray-500">
        <EmptyHeader className="flex flex-col items-center gap-0">
          <EmptyMedia className="mb-4">
            <i className="ph-duotone ph-layout text-3xl text-pup-maroon" />
          </EmptyMedia>
          <EmptyTitle className="text-lg font-bold">
            No storage layout available
          </EmptyTitle>
          <EmptyDescription className="text-sm font-medium">
            The system storage configuration could not be retrieved.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="animate-fade-in flex h-full w-full flex-col gap-4">
      <Dialog open={applyReportOpen} onOpenChange={setApplyReportOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Apply Report</DialogTitle>
            <DialogDescription>
              Per-drawer reassignment results from the latest template apply.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-auto rounded-brand border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                <tr className="text-left text-xs tracking-wider text-gray-600 uppercase">
                  <th className="p-3 font-bold">From</th>
                  <th className="p-3 font-bold">To</th>
                  <th className="p-3 font-bold">Moved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applyReportRows.length === 0 ? (
                  <tr>
                    <td className="p-3 text-gray-600" colSpan={3}>
                      No reassignment details were returned.
                    </td>
                  </tr>
                ) : (
                  applyReportRows.map((r, idx) => (
                    <tr
                      key={`${idx}-${r?.from?.room}-${r?.from?.cabinet}-${r?.from?.drawer}`}
                    >
                      <td className="p-3 text-gray-900">
                        Room {r?.from?.room} / Cabinet {r?.from?.cabinet} /
                        Drawer {r?.from?.drawer}
                      </td>
                      <td className="p-3 text-gray-900">
                        Room {r?.to?.room} / Cabinet {r?.to?.cabinet} / Drawer{" "}
                        {r?.to?.drawer}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">
                          {Number(r?.moved || 0)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setApplyReportOpen(false)}
              className="h-10 rounded-brand border-gray-300 px-4 font-bold shadow-sm hover:border-pup-maroon hover:bg-red-50/30"
            >
              CLOSE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={templateConflictOpen}
        onOpenChange={setTemplateConflictOpen}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Conflict Resolution</DialogTitle>
            <DialogDescription>
              This template would remove drawers that still contain student
              records. Choose reassignment mode first, then map drawers.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-brand border border-gray-200 bg-gray-50/60 p-3">
            <div className="mb-2 text-xs font-bold text-gray-600 uppercase">
              Reassignment Mode
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={reassignmentMode === "manual" ? "default" : "outline"}
                onClick={() => setReassignmentMode("manual")}
              >
                MANUAL (DRAG & DROP)
              </Button>
              <Button
                type="button"
                variant={reassignmentMode === "auto" ? "default" : "outline"}
                onClick={() => {
                  setReassignmentMode("auto")
                  setTemplateMappingDraft(buildAutoMappings())
                }}
              >
                AUTO MAP
              </Button>
            </div>
          </div>
          <div className="max-h-[55vh] overflow-auto rounded-brand border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                <tr className="text-left text-xs tracking-wider text-gray-600 uppercase">
                  <th className="p-3 font-bold">Current Drawer</th>
                  <th className="p-3 font-bold">Records</th>
                  <th className="p-3 font-bold">Move To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templateConflictRows.map((row) => (
                  <tr key={row.sourceKey}>
                    <td className="p-3 font-medium text-gray-900">
                      {row.sourceLabel}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900">
                        {row.count}
                      </span>
                    </td>
                    <td className="p-3">
                      <div
                        draggable={reassignmentMode === "manual"}
                        onDragStart={() => setDragSourceKey(row.sourceKey)}
                        className={`mb-2 rounded border px-2 py-1 text-xs font-bold ${
                          reassignmentMode === "manual"
                            ? "cursor-grab border-gray-300 bg-white"
                            : "border-gray-200 bg-gray-100 text-gray-500"
                        }`}
                        title={
                          reassignmentMode === "manual"
                            ? "Drag this source to a target option below"
                            : "Switch to Manual mode to drag"
                        }
                      >
                        Drag source
                      </div>
                      <div className="grid max-h-32 grid-cols-1 gap-1 overflow-auto">
                        {templateTargetOptions.map((opt) => {
                          const selected =
                            String(
                              templateMappingDraft[row.sourceKey] || ""
                            ) === opt.key
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() =>
                                setTemplateMappingDraft((prev) => ({
                                  ...prev,
                                  [row.sourceKey]: opt.key,
                                }))
                              }
                              onDragOver={(e) => {
                                if (reassignmentMode !== "manual") return
                                e.preventDefault()
                              }}
                              onDrop={(e) => {
                                if (reassignmentMode !== "manual") return
                                e.preventDefault()
                                const src = String(dragSourceKey || "")
                                if (!src) return
                                setTemplateMappingDraft((prev) => ({
                                  ...prev,
                                  [src]: opt.key,
                                }))
                              }}
                              className={`rounded border px-2 py-1 text-left text-xs ${
                                selected
                                  ? "border-pup-maroon bg-red-50 font-bold text-pup-maroon"
                                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTemplateConflictOpen(false)}
              className="h-10 rounded-brand border-gray-300 px-4 font-bold shadow-sm hover:border-pup-maroon hover:bg-red-50/30"
            >
              CANCEL
            </Button>
            <Button type="button" onClick={openApplyPreview}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={applyPreviewOpen} onOpenChange={setApplyPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Reassignment (Before → After)</DialogTitle>
            <DialogDescription>
              Review the exact drawer movements before applying template
              changes.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-auto rounded-brand border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                <tr className="text-left text-xs tracking-wider text-gray-600 uppercase">
                  <th className="p-3 font-bold">Before</th>
                  <th className="p-3 font-bold">After</th>
                  <th className="p-3 font-bold">Records</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applyPreviewRows.map((r) => (
                  <tr key={r.fromKey}>
                    <td className="p-3 text-gray-900">{r.fromLabel}</td>
                    <td className="p-3 text-gray-900">{r.toLabel}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900">
                        {r.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setApplyPreviewOpen(false)}
              className="h-10 rounded-brand border-gray-300 px-4 font-bold shadow-sm hover:border-pup-maroon hover:bg-red-50/30"
            >
              BACK
            </Button>
            <Button type="button" onClick={applyTemplateWithMappings}>
              APPLY TEMPLATE + REASSIGN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <select
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
                  </select>
                  <ButtonGroup className="h-10 shadow-sm">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={addRoom}
                          className="h-10 w-10 text-pup-maroon hover:bg-red-50"
                        >
                          <i className="ph-bold ph-plus" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Add New Room</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setDeleteRoomConfirmOpen(true)}
                          className="h-10 w-10 text-gray-600 hover:bg-gray-100 hover:text-red-600"
                          disabled={!activeRoom || activeRoomStudentCount > 0}
                        >
                          <i className="ph-bold ph-trash" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Delete Active Room
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
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
                          <i className="ph-bold ph-arrow-counter-clockwise" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Clear Room Layout
                      </TooltipContent>
                    </Tooltip>
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
                    className="h-10 rounded-brand border-gray-300 px-4 font-bold shadow-sm hover:border-pup-maroon hover:bg-red-50/30"
                    disabled={!activeRoom}
                  >
                    <i className="ph-bold ph-plus-square mr-2 text-pup-maroon" />{" "}
                    ADD CABINET
                  </Button>

                  <ButtonGroup className="h-10 shadow-sm">
                    <select
                      className="h-full cursor-pointer rounded-none border border-gray-300 bg-white px-3 text-sm font-bold text-gray-700 focus:outline-none"
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      disabled={!activeRoom}
                      data-slot="select"
                    >
                      {ROOM_TEMPLATES.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTemplateApplyConfirmOpen(true)}
                      className="h-full bg-gray-50 px-4 text-xs font-black tracking-wider uppercase transition-colors hover:bg-pup-maroon hover:text-white"
                      disabled={!activeRoom}
                    >
                      APPLY
                    </Button>
                  </ButtonGroup>

                  <div className="flex h-10 items-center gap-2 rounded-brand border border-gray-300 bg-white px-3 shadow-sm">
                    <i
                      className={`ph-bold ph-grid-four ${snapToGrid ? "text-pup-maroon" : "text-gray-400"}`}
                    />
                    <span className="text-[10px] font-black tracking-widest text-gray-500 uppercase">
                      Snap
                    </span>
                    <button
                      type="button"
                      onClick={() => setSnapToGrid(!snapToGrid)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${snapToGrid ? "bg-pup-maroon" : "bg-gray-200"}`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${snapToGrid ? "translate-x-5" : "translate-x-1"}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
          actions={
            <Button
              onClick={saveLayout}
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-brand bg-pup-maroon px-8 font-black tracking-widest text-white uppercase shadow-lg transition-all hover:bg-red-900"
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
              <div
                ref={canvasRef}
                className="relative w-full overflow-hidden border border-gray-300 bg-[#f8fafc] shadow-inner"
                style={{ aspectRatio: "16 / 10" }}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
                onPointerDown={(e) => {
                  // Deselect if clicking the background
                  if (e.target === e.currentTarget) {
                    setSelectedCabinetIds(new Set())
                  }
                }}
              >
                {/* AutoCAD-inspired precision grid */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(148, 163, 184, 0.1) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(148, 163, 184, 0.1) 1px, transparent 1px),
                      linear-gradient(to right, rgba(148, 163, 184, 0.3) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(148, 163, 184, 0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: "2% 2%, 2% 2%, 10% 10%, 10% 10%",
                  }}
                />

                {/* Orientation marker (Door Symbol) */}
                <div
                  className="group absolute z-2 cursor-move"
                  style={{
                    left: `${(activeRoom?.door?.x ?? getDefaultDoor().x) * 100}%`,
                    top: `${(activeRoom?.door?.y ?? getDefaultDoor().y) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    dragRef.current = {
                      pointerId: e.pointerId,
                      mode: "door",
                    }
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId)
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <div className="relative flex h-12 w-12 items-center justify-center">
                    {/* Sharper architectural door swing */}
                    <div className="absolute bottom-0 left-0 h-full w-[3px] bg-pup-maroon" />
                    <div className="absolute bottom-0 left-0 h-[3px] w-full bg-slate-400 group-hover:bg-slate-600" />
                    <div className="absolute inset-0 rounded-tr-full border-t-2 border-r-2 border-pup-maroon/30 group-hover:border-pup-maroon/60" />

                    <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] font-black tracking-widest whitespace-nowrap text-white uppercase opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      ENTRANCE
                    </div>
                  </div>
                </div>

                {/* Precision Stats Overlay */}
                <div className="pointer-events-none absolute bottom-3 right-3 z-50 flex flex-col items-end gap-1">
                  {selectedCabinet && (
                    <div className="animate-in fade-in slide-in-from-right-2 flex flex-col items-end gap-1 rounded bg-slate-900/80 p-2 font-mono text-[10px] text-white backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <span className="opacity-60 uppercase">Pos:</span>
                        <span>
                          {toPct(selectedCabinet.rect.x)}%,{" "}
                          {toPct(selectedCabinet.rect.y)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="opacity-60 uppercase">Dim:</span>
                        <span>
                          {toPct(selectedCabinet.rect.w)}% x{" "}
                          {toPct(selectedCabinet.rect.h)}%
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="rounded bg-slate-800/40 px-2 py-1 font-mono text-[9px] text-slate-200">
                    GRID: {toPct(SNAP_STEP)}%
                  </div>
                </div>

                {activeRoom?.cabinets?.map((cab) => {
                  const isSelected = selectedCabinetIds.has(cab.id)
                  const isConflict = collidingIds.has(cab.id)
                  const rot = Number(cab.rotation) === 90 ? 90 : 0
                  const eff = getCabinetEffectiveSize(cab)

                  return (
                    <div
                      key={cab.id}
                      className={`absolute border-2 transition-all duration-75 ${
                        isSelected
                          ? "z-10 border-cyan-500 bg-cyan-50/20 shadow-[0_0_0_4px_rgba(6,182,212,0.2)]"
                          : isConflict
                            ? "z-10 border-red-600 bg-red-50/50 shadow-[0_0_0_4px_rgba(220,38,38,0.2)]"
                            : "border-slate-800 bg-white"
                      }`}
                      style={{
                        left: `${cab.rect.x * 100}%`,
                        top: `${cab.rect.y * 100}%`,
                        width: `${eff.w * 100}%`,
                        height: `${eff.h * 100}%`,
                        userSelect: "none",
                      }}
                      onPointerDown={(e) => {
                        if (!canvasRef.current) return
                        e.preventDefault()
                        e.stopPropagation()

                        const isMulti = e.ctrlKey || e.metaKey
                        let next = new Set(selectedCabinetIds)
                        if (isMulti) {
                          if (next.has(cab.id)) next.delete(cab.id)
                          else next.add(cab.id)
                        } else {
                          if (!next.has(cab.id)) {
                            next = new Set([cab.id])
                          }
                        }
                        setSelectedCabinetIds(next)

                        const box = canvasRef.current.getBoundingClientRect()
                        const relX =
                          (e.clientX - box.left) / Math.max(1, box.width)
                        const relY =
                          (e.clientY - box.top) / Math.max(1, box.height)

                        dragRef.current = {
                          pointerId: e.pointerId,
                          mode: "move",
                          startX: relX,
                          startY: relY,
                          initialPositions: activeRoom.cabinets
                            .filter((c) => next.has(c.id))
                            .map((c) => ({
                              id: c.id,
                              x: c.rect.x,
                              y: c.rect.y,
                              eff: getCabinetEffectiveSize(c),
                            })),
                        }

                        try {
                          e.currentTarget.setPointerCapture(e.pointerId)
                        } catch {
                          // ignore
                        }
                      }}
                      title={`Cabinet ${cab.id}`}
                    >
                      {isSelected && selectedCabinetIds.size === 1 && (
                        <div
                          className="animate-scale-in absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-xl">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-gray-700 hover:bg-gray-100 hover:text-pup-maroon"
                                  onClick={rotateSelectedCabinet}
                                >
                                  <i className="ph-bold ph-arrow-clockwise text-sm" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Rotate</TooltipContent>
                            </Tooltip>

                            <div className="h-4 w-px bg-gray-200" />

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-gray-700 hover:bg-gray-100 hover:text-pup-maroon"
                                  onClick={duplicateSelectedCabinet}
                                >
                                  <i className="ph-bold ph-copy text-sm" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Duplicate
                              </TooltipContent>
                            </Tooltip>

                            <div className="h-4 w-px bg-gray-200" />

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-gray-700 hover:bg-gray-100 hover:text-red-600"
                                  onClick={() => setBulkConfirmOpen(true)}
                                >
                                  <i className="ph-bold ph-trash text-sm" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      )}
                      {eff.w >= 0.12 && eff.h >= 0.14 ? (
                        <>
                          <div className="absolute top-2 left-2 text-[10px] font-extrabold text-gray-600">
                            CAB-{cab.id}
                          </div>
                          <div className="absolute top-2 right-2 text-[10px] font-extrabold text-gray-500">
                            {rot === 90 ? "V" : "H"}
                          </div>
                          <div className="absolute right-2 bottom-2 left-2 text-[10px] font-bold text-gray-500">
                            {cab.drawerIds.length} drawers
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-700">
                          CAB-{cab.id}
                        </div>
                      )}
                      {isSelected ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="absolute -right-1.5 -bottom-1.5 flex h-5 w-5 cursor-se-resize items-center justify-center rounded-sm border border-pup-maroon bg-white leading-none text-pup-maroon shadow"
                              onPointerDown={(e) => {
                                if (!canvasRef.current) return
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedCabinetIds(new Set([cab.id]))
                                dragRef.current = {
                                  pointerId: e.pointerId,
                                  mode: "resize",
                                }
                                try {
                                  e.currentTarget.setPointerCapture(e.pointerId)
                                } catch {
                                  // ignore
                                }
                              }}
                            >
                              <i className="ph-bold ph-corners-out text-[11px]" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            Resize Cabinet
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="lg:col-span-1">
              <Card className="overflow-hidden rounded-brand border border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon shadow-sm">
                      <i className="ph-duotone ph-archive text-2xl"></i>
                    </div>
                    <div>
                      <CardTitle className="text-xl leading-none font-black tracking-tight text-gray-900">
                        Cabinet Details
                      </CardTitle>
                      <CardDescription className="mt-1.5 text-sm font-medium text-gray-500">
                        {selectedCabinetIds.size > 1
                          ? `${selectedCabinetIds.size} cabinets selected`
                          : selectedCabinet
                            ? `CAB-${selectedCabinet.id}`
                            : "Select a cabinet on the map"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  {selectedCabinetIds.size > 1 ? (
                    <div className="flex h-[320px] flex-col items-center justify-center text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-pup-maroon shadow-sm">
                        <i className="ph-duotone ph-stack text-3xl"></i>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Multiple Selection
                      </h3>
                      <p className="mt-1 max-w-[220px] text-sm font-medium text-gray-600">
                        You can drag the group on the canvas or use the bulk
                        actions below.
                      </p>
                    </div>
                  ) : !selectedCabinet ? (
                    <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                          <i className="ph-duotone ph-mouse-left-click text-3xl text-pup-maroon"></i>
                        </EmptyMedia>
                        <EmptyTitle className="text-lg font-bold text-gray-900">
                          No cabinet selected
                        </EmptyTitle>
                        <EmptyDescription className="mt-1 max-w-[200px] text-sm font-medium text-gray-600">
                          Select a cabinet on the map to edit its properties.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={rotateSelectedCabinet}
                          className="h-10 rounded-brand border-gray-300 px-4 font-bold shadow-sm hover:border-pup-maroon hover:bg-red-50/30"
                        >
                          <i className="ph-bold ph-arrow-clockwise mr-2 text-pup-maroon" />
                          ROTATE
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={duplicateSelectedCabinet}
                          className="h-10 rounded-brand border-gray-300 px-4 font-bold shadow-sm hover:border-pup-maroon hover:bg-red-50/30"
                        >
                          <i className="ph-bold ph-copy mr-2 text-pup-maroon" />
                          DUPLICATE
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setBulkConfirmOpen(true)}
                          className="h-10 rounded-brand border-gray-300 px-4 font-bold shadow-sm hover:border-pup-maroon hover:bg-red-50/30 lg:col-span-2"
                        >
                          <i className="ph-bold ph-trash mr-2 text-pup-maroon" />
                          REMOVE CABINET
                        </Button>
                      </div>

                      <div>
                        <div className="mb-2 text-xs font-bold tracking-wide text-gray-700 uppercase">
                          Drawer count
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-lg transition-all hover:bg-white hover:shadow-sm"
                            onClick={removeDrawerFromSelected}
                            disabled={
                              (selectedCabinet.drawerIds || []).length <= 1
                            }
                          >
                            <i className="ph-bold ph-minus" />
                          </Button>

                          <div className="flex-1 text-center">
                            <span className="text-lg font-black text-gray-900">
                              {(selectedCabinet.drawerIds || []).length}
                            </span>
                            <span className="ml-2 text-xs font-bold tracking-tight text-gray-500 uppercase">
                              Drawers
                            </span>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-lg transition-all hover:bg-white hover:shadow-sm"
                            onClick={addDrawerToSelected}
                          >
                            <i className="ph-bold ph-plus" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-bold tracking-wide text-gray-700 uppercase">
                            X Position (%)
                          </label>
                          <Input
                            type="number"
                            step="1"
                            value={toPct(selectedCabinet.rect.x)}
                            onChange={(e) => {
                              if (e.target.value === "") return
                              const val = Number(e.target.value)
                              if (!Number.isFinite(val)) return
                              updateSelectedRectFromNormalized({
                                ...selectedCabinet.rect,
                                x: fromPct(val),
                              })
                            }}
                            className="h-10 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold tracking-wide text-gray-700 uppercase">
                            Y Position (%)
                          </label>
                          <Input
                            type="number"
                            step="1"
                            value={toPct(selectedCabinet.rect.y)}
                            onChange={(e) => {
                              if (e.target.value === "") return
                              const val = Number(e.target.value)
                              if (!Number.isFinite(val)) return
                              updateSelectedRectFromNormalized({
                                ...selectedCabinet.rect,
                                y: fromPct(val),
                              })
                            }}
                            className="h-10 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-bold tracking-wide text-gray-700 uppercase">
                            Width (%)
                          </label>
                          <Input
                            type="number"
                            step="1"
                            value={toPct(selectedCabinet.rect.w)}
                            onChange={(e) => {
                              if (e.target.value === "") return
                              const val = Number(e.target.value)
                              if (!Number.isFinite(val)) return
                              updateSelectedSizeNormalized(
                                fromPct(val),
                                selectedCabinet.rect.h
                              )
                            }}
                            className="h-10 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold tracking-wide text-gray-700 uppercase">
                            Height (%)
                          </label>
                          <Input
                            type="number"
                            step="1"
                            value={toPct(selectedCabinet.rect.h)}
                            onChange={(e) => {
                              if (e.target.value === "") return
                              const val = Number(e.target.value)
                              if (!Number.isFinite(val)) return
                              updateSelectedSizeNormalized(
                                selectedCabinet.rect.w,
                                fromPct(val)
                              )
                            }}
                            className="h-10 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none"
                          />
                        </div>
                      </div>

                      <div className="text-xs leading-relaxed font-medium text-gray-500">
                        Tip: drag cabinets on the canvas. Drawer count controls
                        available drawer slots for this cabinet.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
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
        selectionLabel="Cabinets Selected"
        selectionStatus="Bulk Layout Actions"
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
