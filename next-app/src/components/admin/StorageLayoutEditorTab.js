"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Card,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import StorageLayoutSkeleton from "@/components/admin/skeletons/StorageLayoutSkeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ROOM_TEMPLATES, getDefaultDoor } from "@/lib/storageLayoutDefaults"

import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import ConfirmModal from "@/components/shared/ConfirmModal"
import PromptModal from "@/components/shared/PromptModal"

// Modular Sub-components
import CabinetCanvas from "./storage-layout/CabinetCanvas"
import CabinetSidebar from "./storage-layout/CabinetSidebar"
import ConflictResolutionModals from "./storage-layout/ConflictResolutionModals"
import { Select } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Utilities
import {
  clamp,
  getCabinetEffectiveSize,
  clampToRoom,
  snapValue,
  calculatePath,
  canonicalizeCabinetId,
} from "@/lib/storageLayoutUtils"

export default function StorageLayoutEditorTab({ showToast, isDirty, setIsDirty, error = null, className }) {
  // 1. BASE STATE
  const [layout, setLayout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [studentRoomUsage, setStudentRoomUsage] = useState(new Map())
  const [studentDrawerUsage, setStudentDrawerUsage] = useState(new Map())

  const [activeRoomId, setActiveRoomId] = useState(null)
  const [selectedCabinetIds, setSelectedCabinetIds] = useState(new Set())
  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [saveCountdown, setSaveCountdown] = useState(0)
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)

  const [renameRoomOpen, setRenameRoomOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")
  const [renameCabinetOpen, setRenameCabinetOpen] = useState(false)
  const [cabinetToRename, setCabinetToRename] = useState(null)
  const [newCabinetName, setNewCabinetName] = useState("")
  const [pendingLocationReassignments, setPendingLocationReassignments] = useState([])
  const [deleteRoomConfirmOpen, setDeleteRoomConfirmOpen] = useState(false)
  const [resetRoomConfirmOpen, setResetRoomConfirmOpen] = useState(false)
  const [templateApplyConfirmOpen, setTemplateApplyConfirmOpen] = useState(false)
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState("")
  const [deleteTemplateConfirmOpen, setDeleteTemplateConfirmOpen] = useState(false)
  const [restoreTemplatesConfirmOpen, setRestoreTemplatesConfirmOpen] = useState(false)

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
  const [historyIndex, setHistoryIndex] = useState(0)
  const [clipboard, setClipboard] = useState(null)
  const [carouselIndex, setCarouselIndex] = useState(0)

  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const preDragLayoutRef = useRef(null)

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

  const commitLayout = useCallback((nextLayout, label) => {
    if (!nextLayout) return
    const cloned = JSON.parse(JSON.stringify(nextLayout))
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1)
      const newState = {
        id: Math.random().toString(36).substring(7),
        label,
        layout: cloned
      }
      const updated = [...sliced, newState]
      if (updated.length > 30) {
        const diff = updated.length - 30
        setHistoryIndex(30 - 1)
        return updated.slice(diff)
      }
      setHistoryIndex(updated.length - 1)
      return updated
    })
    setLayout(cloned)
    setIsDirty?.(true)
  }, [historyIndex, setIsDirty])

  // Alias for canvas PointerDown cache triggers to avoid editing canvas files
  const pushHistory = useCallback((currentLayout) => {
    if (!currentLayout) return
    preDragLayoutRef.current = JSON.parse(JSON.stringify(currentLayout))
  }, [])

  // 3. DERIVED STATE
  const activeRoom = useMemo(() => {
    if (!layout || activeRoomId == null) return null
    return layout.rooms.find((r) => String(r.id) === String(activeRoomId)) || null
  }, [layout, activeRoomId])

  const selectedCabinet = useMemo(() => {
    if (!activeRoom || selectedCabinetIds.size === 0) return null
    const arr = Array.from(selectedCabinetIds)
    const activeId = arr[carouselIndex] || arr[0]
    if (activeId === "DOOR") {
      return {
        id: "DOOR",
        isDoor: true,
        rect: {
          x: activeRoom.door?.x ?? 0,
          y: activeRoom.door?.y ?? 0,
          w: activeRoom.door?.w ?? 0.125,
          h: activeRoom.door?.h ?? 0.04,
        },
        rotation: activeRoom.door?.rotation ?? 0,
      }
    }
    return activeRoom.cabinets.find((c) => String(c.id) === String(activeId)) || null
  }, [activeRoom, selectedCabinetIds, carouselIndex])

  // 4. HIGH-LEVEL CALLBACKS (Undo, Redo, Copy, Paste, Add/Remove)
  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    const prevIndex = historyIndex - 1
    const prevState = history[prevIndex]
    if (prevState) {
      setHistoryIndex(prevIndex)
      setLayout(JSON.parse(JSON.stringify(prevState.layout)))
      setIsDirty?.(true)
    }
  }, [history, historyIndex, setIsDirty])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const nextIndex = historyIndex + 1
    const nextState = history[nextIndex]
    if (nextState) {
      setHistoryIndex(nextIndex)
      setLayout(JSON.parse(JSON.stringify(nextState.layout)))
      setIsDirty?.(true)
    }
  }, [history, historyIndex, setIsDirty])

  const revertToHistoryState = useCallback((index) => {
    const targetState = history[index]
    if (targetState) {
      setHistoryIndex(index)
      setLayout(JSON.parse(JSON.stringify(targetState.layout)))
      setIsDirty?.(true)
    }
  }, [history, setIsDirty])


  const copyCabinets = useCallback(() => {
    if (!activeRoom || selectedCabinetIds.size === 0) return
    const cabs = activeRoom.cabinets.filter(c => selectedCabinetIds.has(c.id))
    setClipboard(JSON.parse(JSON.stringify(cabs)))
  }, [activeRoom, selectedCabinetIds])

  const pasteCabinets = useCallback(() => {
    if (!activeRoom || !clipboard) return

    const existingIds = new Set(activeRoom.cabinets.map(c => c.id))
    const getNextId = (currentSet) => {
      let counter = 2020
      while (true) {
        const id = String(counter)
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

    const updatedCabinets = [...activeRoom.cabinets, ...newCabinets].sort((a, b) =>
      String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
    )

    const nextRooms = layout.rooms.map((r) =>
      String(r.id) === String(activeRoom.id) ? { ...r, cabinets: updatedCabinets } : r
    )
    const nextLayout = { ...layout, rooms: nextRooms }

    commitLayout(nextLayout, "Paste Cabinets")
    setSelectedCabinetIds(new Set(newCabinets.map(c => c.id)))
  }, [activeRoom, clipboard, layout, commitLayout])

  const addCabinet = useCallback(() => {
    if (!activeRoom) return
    const existing = new Set(activeRoom.cabinets.map((c) => c.id))
    let id = ""
    let counter = 2020
    while (true) {
      id = String(counter)
      if (!existing.has(id)) break
      counter++
    }
    const cab = {
      id,
      rect: { x: 0.1, y: 0.1, w: 0.075, h: 0.12 }, 
      rotation: 0,
      drawerIds: [1, 2, 3, 4],
    }

    const updatedCabinets = [...activeRoom.cabinets, cab].sort((a, b) =>
      String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
    )

    const nextRooms = layout.rooms.map((r) =>
      String(r.id) === String(activeRoom.id) ? { ...r, cabinets: updatedCabinets } : r
    )
    const nextLayout = { ...layout, rooms: nextRooms }

    commitLayout(nextLayout, "Add Cabinet")
    setSelectedCabinetIds(new Set([id]))
  }, [activeRoom, layout, commitLayout])

  const removeSelectedCabinet = useCallback(() => {
    if (!activeRoom || selectedCabinetIds.size === 0) return

    const cabinetsToRemove = activeRoom.cabinets.filter((c) => selectedCabinetIds.has(c.id))
    const occupiedCabinets = cabinetsToRemove.filter((cab) => {
      return Array.from(studentDrawerUsage.keys()).some((key) => {
        const [rId, cId] = key.split("|")
        return Number(rId) === Number(activeRoom.id) && cId === cab.id && (studentDrawerUsage.get(key) || 0) > 0
      })
    })

    if (occupiedCabinets.length > 0) {
      const names = occupiedCabinets.map((c) => c.id).join(", ")
      showToast?.({
        title: "Cannot Remove Cabinet",
        description: `Cabinet${occupiedCabinets.length > 1 ? "s" : ""} ${names} contain${occupiedCabinets.length === 1 ? "s" : ""} active student documents.`,
      }, true)
      return
    }
    
    const idsToRemove = Array.from(selectedCabinetIds)
    const updatedCabinets = activeRoom.cabinets.filter((c) => !idsToRemove.includes(c.id))

    const nextRooms = layout.rooms.map((r) =>
      String(r.id) === String(activeRoom.id) ? { ...r, cabinets: updatedCabinets } : r
    )
    const nextLayout = { ...layout, rooms: nextRooms }

    commitLayout(nextLayout, selectedCabinetIds.size > 1 ? "Delete Cabinets" : "Delete Cabinet")
    setSelectedCabinetIds(new Set())
  }, [activeRoom, selectedCabinetIds, layout, commitLayout, studentDrawerUsage, showToast])

  const duplicateSelectedCabinet = useCallback(() => {
    if (!activeRoom || !selectedCabinet) return
    const existingIds = new Set(activeRoom.cabinets.map((c) => c.id))
    let id = ""
    let counter = 2020
    while (true) {
      id = String(counter)
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
    const updatedCabinets = [...activeRoom.cabinets, newCab].sort((a, b) =>
      String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
    )

    const nextRooms = layout.rooms.map((r) =>
      String(r.id) === String(activeRoom.id) ? { ...r, cabinets: updatedCabinets } : r
    )
    const nextLayout = { ...layout, rooms: nextRooms }

    commitLayout(nextLayout, "Duplicate Cabinet")
    setSelectedCabinetIds(new Set([id]))
  }, [activeRoom, selectedCabinet, layout, commitLayout])

  const addDrawerToSelected = useCallback(() => {
    if (!activeRoom || !selectedCabinet || selectedCabinet.isDoor) return
    const ids = selectedCabinet.drawerIds || []
    const nextId = (Math.max(0, ...ids.map(Number)) || 0) + 1
    
    const nextCabinet = {
      ...selectedCabinet,
      drawerIds: [...ids, nextId]
    }
    const updatedCabinets = activeRoom.cabinets.map((c) =>
      String(c.id) === String(selectedCabinet.id) ? nextCabinet : c
    )
    const nextRooms = layout.rooms.map((r) =>
      String(r.id) === String(activeRoom.id) ? { ...r, cabinets: updatedCabinets } : r
    )
    const nextLayout = { ...layout, rooms: nextRooms }
    
    commitLayout(nextLayout, "Add Drawer")
  }, [activeRoom, selectedCabinet, layout, commitLayout])

  const removeDrawerFromSelected = useCallback(() => {
    if (!activeRoom || !selectedCabinet || selectedCabinet.isDoor) return
    const ids = selectedCabinet.drawerIds || []
    if (ids.length <= 1) return

    const nextCabinet = {
      ...selectedCabinet,
      drawerIds: ids.slice(0, -1)
    }
    const updatedCabinets = activeRoom.cabinets.map((c) =>
      String(c.id) === String(selectedCabinet.id) ? nextCabinet : c
    )
    const nextRooms = layout.rooms.map((r) =>
      String(r.id) === String(activeRoom.id) ? { ...r, cabinets: updatedCabinets } : r
    )
    const nextLayout = { ...layout, rooms: nextRooms }
    
    commitLayout(nextLayout, "Remove Drawer")
  }, [activeRoom, selectedCabinet, layout, commitLayout])

  const handleRenameRoom = useCallback(() => {
    if (!activeRoom || !newRoomName.trim()) return
    const trimmed = newRoomName.trim()
    const nextRooms = layout.rooms.map((r) =>
      String(r.id) === String(activeRoom.id) ? { ...r, name: trimmed } : r
    )
    const nextLayout = { ...layout, rooms: nextRooms }
    commitLayout(nextLayout, `Rename Room to "${trimmed}"`)
    setRenameRoomOpen(false)
    showToast?.({ title: "Room Renamed", description: `Room ${activeRoom.id} is now named "${trimmed}".` })
  }, [activeRoom, newRoomName, layout, commitLayout, showToast])

  const openRenameCabinet = useCallback((cab = null) => {
    const target = cab || selectedCabinet
    if (!target || target.isDoor) return
    setCabinetToRename(target)
    setNewCabinetName(String(target.id || ""))
    setRenameCabinetOpen(true)
  }, [selectedCabinet])

  const handleRenameCabinet = useCallback(() => {
    const target = cabinetToRename || selectedCabinet
    if (!activeRoom || !target || target.isDoor) return
    const trimmed = String(newCabinetName || "").trim()
    if (!trimmed) {
      showToast?.({ title: "Invalid Name", description: "Cabinet identifier cannot be empty." }, true)
      return
    }

    const oldId = String(target.id)
    if (trimmed === oldId) {
      setRenameCabinetOpen(false)
      setCabinetToRename(null)
      return
    }

    // Check for collision within the active room
    const exists = activeRoom.cabinets.some(
      (c) => String(c.id).toLowerCase() === trimmed.toLowerCase() && String(c.id) !== oldId
    )
    if (exists) {
      showToast?.({
        title: "Duplicate Cabinet Identifier",
        description: `A cabinet with identifier "${trimmed}" already exists in ${activeRoom.name || `Room ${activeRoom.id}`}.`,
      }, true)
      return
    }

    // Update cabinet ID in layout
    const updatedCabinets = activeRoom.cabinets.map((c) =>
      String(c.id) === oldId ? { ...c, id: trimmed } : c
    )
    const nextRooms = layout.rooms.map((r) =>
      String(r.id) === String(activeRoom.id) ? { ...r, cabinets: updatedCabinets } : r
    )
    const nextLayout = { ...layout, rooms: nextRooms }

    // Update studentDrawerUsage in local state
    setStudentDrawerUsage((prev) => {
      const nextMap = new Map(prev)
      for (const [key, count] of prev.entries()) {
        const [rId, cId, dId] = key.split("|")
        if (Number(rId) === Number(activeRoom.id) && String(cId) === oldId) {
          nextMap.delete(key)
          nextMap.set(`${rId}|${trimmed}|${dId}`, count)
        }
      }
      return nextMap
    })

    // Track reassignments for persistence so student records in DB get updated on save
    const drawerIds = target.drawerIds || [1, 2, 3, 4]
    setPendingLocationReassignments((prev) => {
      const list = [...prev]
      for (const dId of drawerIds) {
        const fromKey = `${activeRoom.id}|${oldId}|${dId}`
        const toKey = `${activeRoom.id}|${trimmed}|${dId}`
        const existingIdx = list.findIndex((item) => item.toKey === fromKey)
        if (existingIdx >= 0) {
          list[existingIdx] = { ...list[existingIdx], toKey }
        } else {
          list.push({ fromKey, toKey })
        }
      }
      return list
    })

    commitLayout(nextLayout, `Rename Cabinet to "${trimmed}"`)
    setSelectedCabinetIds(new Set([trimmed]))
    setRenameCabinetOpen(false)
    setCabinetToRename(null)
    setNewCabinetName("")
    showToast?.({
      title: "Cabinet Renamed",
      description: `Cabinet ${oldId} is now renamed to "${trimmed}".`,
    })
  }, [cabinetToRename, selectedCabinet, activeRoom, newCabinetName, layout, commitLayout, showToast])

  const updateSelectedRectFromNormalized = useCallback((nextRect) => {
    if (!activeRoom || !selectedCabinet) return
    
    const targetCabinet = selectedCabinet.isDoor 
      ? null 
      : activeRoom.cabinets.find(c => String(c.id) === String(selectedCabinet.id))
      
    if (selectedCabinet.isDoor) {
      const updatedDoor = {
        ...activeRoom.door,
        x: nextRect.x,
        y: nextRect.y
      }
      const nextRooms = layout.rooms.map(r => 
        String(r.id) === String(activeRoom.id) ? { ...r, door: updatedDoor } : r
      )
      const nextLayout = { ...layout, rooms: nextRooms }
      commitLayout(nextLayout, "Move Entrance")
    } else if (targetCabinet) {
      const updatedCabinet = clampToRoom({ ...targetCabinet, rect: nextRect })
      const updatedCabinets = activeRoom.cabinets.map(c => 
        String(c.id) === String(selectedCabinet.id) ? updatedCabinet : c
      )
      const nextRooms = layout.rooms.map(r => 
        String(r.id) === String(activeRoom.id) ? { ...r, cabinets: updatedCabinets } : r
      )
      const nextLayout = { ...layout, rooms: nextRooms }
      commitLayout(nextLayout, "Move Cabinet")
    }
  }, [activeRoom, selectedCabinet, layout, commitLayout])

  const updateSelectedSizeNormalized = useCallback((nw, nh) => {
    if (!activeRoom || !selectedCabinet || selectedCabinet.isDoor) return
    const w = clamp(nw, MIN_SIZE, MAX_SIZE)
    const h = w * CABINET_ASPECT_RATIO 
    const targetCabinet = activeRoom.cabinets.find(c => String(c.id) === String(selectedCabinet.id))
    if (targetCabinet) {
      const updatedCabinet = clampToRoom({ ...targetCabinet, rect: { ...targetCabinet.rect, w, h } })
      const updatedCabinets = activeRoom.cabinets.map(c => 
        String(c.id) === String(selectedCabinet.id) ? updatedCabinet : c
      )
      const nextRooms = layout.rooms.map(r => 
        String(r.id) === String(activeRoom.id) ? { ...r, cabinets: updatedCabinets } : r
      )
      const nextLayout = { ...layout, rooms: nextRooms }
      commitLayout(nextLayout, "Resize Cabinet")
    }
  }, [activeRoom, selectedCabinet, layout, commitLayout, CABINET_ASPECT_RATIO, MIN_SIZE, MAX_SIZE])

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
      let finalW = 0.125
      let finalH = 0.04

      if (minDist === distTop) {
        finalY = 0
        finalRot = 0
        finalW = 0.125
        finalH = 0.04
        finalX = clamp(rawX, 0, 1 - 0.125)
      } else if (minDist === distBottom) {
        finalY = 1 - 0.04
        finalRot = 180
        finalW = 0.125
        finalH = 0.04
        finalX = clamp(rawX, 0, 1 - 0.125)
      } else if (minDist === distLeft) {
        finalX = 0
        finalRot = 270
        finalW = 0.025
        finalH = 0.20
        finalY = clamp(rawY, 0, 1 - 0.20)
      } else if (minDist === distRight) {
        finalX = 1 - 0.025
        finalRot = 90
        finalW = 0.025
        finalH = 0.20
        finalY = clamp(rawY, 0, 1 - 0.20)
      }

      if (
        activeRoom.door?.x !== finalX ||
        activeRoom.door?.y !== finalY ||
        activeRoom.door?.w !== finalW ||
        activeRoom.door?.h !== finalH ||
        activeRoom.door?.rotation !== finalRot
      ) {
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
      }
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
        const currentCab = activeRoom.cabinets.find(c => c.id === pos.id)
        if (currentCab && (currentCab.rect.x !== nextX || currentCab.rect.y !== nextY)) {
          updateCabinet(activeRoom.id, pos.id, (c) =>
            clampToRoom({ ...c, rect: { ...c.rect, x: nextX, y: nextY } })
          )
        }
      })
    } else if (mode === "resize" && selectedCabinet) {
      const dw = relX - selectedCabinet.rect.x
      const nw = snapValue(clamp(dw, MIN_SIZE, MAX_SIZE), snapToGrid, 'x')
      const nh = nw * CABINET_ASPECT_RATIO 
      if (selectedCabinet.rect.w !== nw || selectedCabinet.rect.h !== nh) {
        updateCabinet(activeRoom.id, selectedCabinet.id, (c) =>
          clampToRoom({ ...c, rect: { ...c.rect, w: nw, h: nh } })
        )
      }
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

    if (mode === "move" || mode === "resize" || mode === "door") {
      const prevStr = preDragLayoutRef.current ? JSON.stringify(preDragLayoutRef.current) : ""
      const currentStr = layout ? JSON.stringify(layout) : ""
      if (prevStr && currentStr && prevStr !== currentStr) {
        let label = "Move Cabinet"
        if (mode === "resize") label = "Resize Cabinet"
        if (mode === "door") label = "Move Entrance"
        
        const cloned = JSON.parse(currentStr)
        setHistory((prev) => {
          const sliced = prev.slice(0, historyIndex + 1)
          const newState = {
            id: Math.random().toString(36).substring(7),
            label,
            layout: cloned
          }
          const updated = [...sliced, newState]
          if (updated.length > 30) {
            const diff = updated.length - 30
            setHistoryIndex(30 - 1)
            return updated.slice(diff)
          }
          setHistoryIndex(updated.length - 1)
          return updated
        })
        setIsDirty?.(true)
      }
    }

    dragRef.current = null
    setSelectionBox(null)
    try {
      e.target.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }, [selectionBox, activeRoom, layout, historyIndex, setIsDirty])

  // 6. LIFE CYCLE / EFFECTS
  useEffect(() => {
    let intervalTimer
    let startTimer
    if (saveConfirmOpen) {
      startTimer = setTimeout(() => {
        setSaveCountdown(3)
        intervalTimer = setInterval(() => {
          setSaveCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(intervalTimer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }, 0)
    } else {
      startTimer = setTimeout(() => {
        setSaveCountdown(0)
      }, 0)
    }
    return () => {
      clearTimeout(startTimer)
      clearInterval(intervalTimer)
    }
  }, [saveConfirmOpen])

  useEffect(() => {
    const timer = setTimeout(() => {
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
      setCarouselIndex(0)
    }, 0)
    return () => clearTimeout(timer)
  }, [activeRoom, selectedCabinetIds])

  const [simulationMode, setSimulationMode] = useState(false)

  const activePath = useMemo(() => {
    if (simulationMode && selectedCabinet && !selectedCabinet.isDoor) {
      return calculatePath(activeRoom, selectedCabinet.id, getDefaultDoor)
    }
    return null
  }, [simulationMode, selectedCabinet, activeRoom])

  const fetchStudentUsage = useCallback(async () => {
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
  }, [])

  const handleRefresh = useCallback(async (isManual = true) => {
    setLoading(true)
    try {
      const [layoutRes, templatesRes] = await Promise.all([
        fetch("/api/storage-layout", { cache: "no-store" }),
        fetch("/api/storage-layout/templates", { cache: "no-store" }),
        fetchStudentUsage(),
      ])
      
      const json = await layoutRes.json()
      const templatesJson = await templatesRes.json()

      if (!layoutRes.ok || !json?.ok)
        throw new Error(json?.error || "Failed to load layout")

      setLayout(json.data)
      setHistory([{
        id: Math.random().toString(36).substring(7),
        label: "Initial State",
        layout: JSON.parse(JSON.stringify(json.data))
      }])
      setHistoryIndex(0)
      setSelectedCabinetIds(new Set())
      setPendingLocationReassignments([])
      setIsDirty?.(false)

      const rooms = Array.isArray(json.data?.rooms) ? json.data.rooms : []
      if (rooms.length > 0) {
        setActiveRoomId(prev => {
          if (prev && rooms.some(r => r.id === prev)) return prev
          return rooms[0].id
        })
      } else {
        setActiveRoomId(null)
      }

      if (templatesRes.ok && templatesJson?.ok) {
        setTemplates(templatesJson.data)
        if (templatesJson.data.length > 0) {
          setSelectedTemplateId(prev => {
            if (prev && templatesJson.data.some(t => t.id === prev)) return prev
            return templatesJson.data[0].id
          })
        }
      }

      if (isManual) {
        showToast?.({
          title: "Storage Layout Refreshed",
          description: "Archive rooms and templates reloaded."
        })
      }
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
  }, [showToast, setIsDirty, fetchStudentUsage])

  useEffect(() => {
    const timer = setTimeout(() => {
      handleRefresh(false)
    }, 0)
    return () => clearTimeout(timer)
  }, [handleRefresh])

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
      const payload = {
        ...layout,
        version: layout.version || 2,
      }
      if (pendingLocationReassignments.length > 0) {
        payload.reassignments = pendingLocationReassignments
        payload.skipUsageCheck = true
      }
      const res = await fetch("/api/storage-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Save failed")
      
      if (json.data) {
        setLayout(json.data)
      }
      setPendingLocationReassignments([])
      setIsDirty?.(false)
      setSaveConfirmOpen(false)
      showToast?.({
        title: "Layout Saved",
        description: json.movedCount
          ? `Archive room mapping updated. ${json.movedCount} student record(s) relocated.`
          : "Archive room mapping updated.",
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
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      } else if (ctrl && key === "y") {
        e.preventDefault()
        redo()
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
    redo,
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

  const isSingleCabinet = selectedCabinetIds.size === 1
  const deleteCabinetTitle = isSingleCabinet
    ? (selectedCabinet?.isDoor ? "Delete Entrance Door" : `Delete Cabinet ${selectedCabinet?.id || ""}`)
    : "Delete Selected Cabinets"

  const deleteCabinetMessage = isSingleCabinet
    ? (selectedCabinet?.isDoor
        ? "Are you sure you want to remove this entrance door indicator? You can add it back anytime."
        : `Are you sure you want to delete Cabinet ${selectedCabinet?.id || ""}? This will remove the cabinet and its drawer layout from this room.`)
    : `Are you sure you want to delete the ${selectedCabinetIds.size} selected cabinets? This will permanently remove them and their drawer layouts from this room.`

  const deleteCabinetConfirmLabel = "Delete"

  const deleteCabinetItems = useMemo(() => {
    if (selectedCabinetIds.size === 0) return []
    return Array.from(selectedCabinetIds).map((id) => {
      if (id === "DOOR") return "Entrance Door"
      const cab = activeRoom?.cabinets?.find((c) => String(c.id) === String(id))
      const count = (cab?.drawerIds || []).length
      return `Cabinet ${id}${count > 0 ? ` (${count} ${count === 1 ? "drawer" : "drawers"})` : ""}`
    })
  }, [selectedCabinetIds, activeRoom])

  async function saveCurrentAsTemplate(name) {
    if (!activeRoom || !name) return
    setSaving(true)
    const newTpl = {
      id: "custom-" + Math.random().toString(36).substring(2, 9),
      name: name,
      cabinets: JSON.parse(JSON.stringify(activeRoom.cabinets || [])),
      door: activeRoom.door ? JSON.parse(JSON.stringify(activeRoom.door)) : null
    }
    const nextTemplates = [...templates, newTpl]
    try {
      const res = await fetch("/api/storage-layout/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextTemplates),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to save template")
      setTemplates(nextTemplates)
      setSelectedTemplateId(newTpl.id)
      setSaveTemplateOpen(false)
      setNewTemplateName("")
      showToast?.({ title: "Template Saved", description: `Saved "${name}".` })
    } catch (err) {
      showToast?.({ title: "Save Failed", description: err.message }, true)
    } finally {
      setSaving(false)
    }
  }

  async function deleteSelectedTemplate() {
    if (!selectedTemplateId) return
    setSaving(true)
    const nextTemplates = templates.filter(t => t.id !== selectedTemplateId)
    try {
      const res = await fetch("/api/storage-layout/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextTemplates),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to delete template")
      setTemplates(nextTemplates)
      setSelectedTemplateId(nextTemplates[0]?.id || "")
      setDeleteTemplateConfirmOpen(false)
      showToast?.({ title: "Template Deleted", description: "The template was removed." })
    } catch (err) {
      showToast?.({ title: "Delete Failed", description: err.message }, true)
    } finally {
      setSaving(false)
    }
  }

  async function restoreDefaultTemplates() {
    setSaving(true)
    try {
      const res = await fetch("/api/storage-layout/templates", {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to restore defaults")
      setTemplates(json.data || [])
      if (json.data?.length > 0) setSelectedTemplateId(json.data[0].id)
      setRestoreTemplatesConfirmOpen(false)
      showToast?.({ title: "Defaults Restored", description: "Templates reverted to factory settings." })
    } catch (err) {
      showToast?.({ title: "Restore Failed", description: err.message }, true)
    } finally {
      setSaving(false)
    }
  }

  function addRoom() {
    if (!layout) return
    const max = Math.max(0, ...(layout.rooms || []).map((r) => Number(r.id) || 0))
    const nextId = max + 1
    const next = {
      id: nextId,
      name: `Room ${nextId}`,
      cabinets: [],
      door: getDefaultDoor(),
    }
    setLayout((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        rooms: [...prev.rooms, next].sort((a, b) => a.id - b.id),
      }
    })
    setSelectedCabinetIds(new Set())
    setActiveRoomId(nextId)
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
    const tpl = templates.find((t) => t.id === selectedTemplateId)
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
    return <StorageLayoutSkeleton />
  }

  if (!layout) return null

  const renderToolbar = () => (
    <div className="flex h-[56px] min-h-[56px] items-center justify-between px-6 border-b border-border dark:border-border bg-gray-50/50 dark:bg-muted/10 select-none overflow-x-auto gap-4 scrollbar-none">
      {/* Left side: History Group + Room Management Group */}
      <div className="flex items-center gap-3 flex-none">
        {/* Group 1: History (Undo / Redo) */}
        <div className="flex items-center h-9 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 shadow-xs p-0.5">
          <button
            type="button"
            onClick={undo}
            disabled={historyIndex <= 0}
            className="h-full w-8 flex items-center justify-center rounded-lg text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer active:scale-95"
            title="Undo (Ctrl+Z)"
          >
            <HugeIcon className="ph-bold ph-arrow-u-up-left text-[14px]" />
          </button>
          <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />
          <button
            type="button"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="h-full w-8 flex items-center justify-center rounded-lg text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer active:scale-95"
            title="Redo (Ctrl+Y)"
          >
            <HugeIcon className="ph-bold ph-arrow-u-up-right text-[14px]" />
          </button>
        </div>

        {/* Group 2: Room Switcher & Management Capsule */}
        <div className="flex items-center gap-1.5">
          {/* Room Selector */}
          <div className="flex items-center h-9 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 shadow-xs">
            <div className="flex items-center pl-3 pr-1 text-gray-400 dark:text-zinc-500">
              <HugeIcon className="ph-bold ph-door text-[14px]" />
            </div>
            <Select
              className="h-full min-w-[130px] w-fit cursor-pointer rounded-none! border-0 bg-transparent pl-1 pr-3 text-sm font-semibold text-gray-800 dark:text-zinc-200 shadow-none hover:bg-transparent focus:ring-0! focus:border-0!"
              value={String(activeRoomId ?? "")}
              disabled={!layout?.rooms?.length}
              onChange={(e) => setActiveRoomId(Number(e.target.value))}
            >
              {layout.rooms.map((r) => (
                <option key={`room-opt-${r.id}`} value={String(r.id)}>{r.name || `Room ${r.id}`}</option>
              ))}
            </Select>
          </div>

          {/* Room CRUD Actions */}
          <div className="flex items-center h-9 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 shadow-xs p-0.5">
            <button
              type="button"
              onClick={addRoom}
              className="h-full w-8 flex items-center justify-center rounded-lg text-gray-600 dark:text-zinc-300 hover:bg-gray-100 hover:text-emerald-600 dark:hover:bg-zinc-700/60 dark:hover:text-emerald-400 transition-colors cursor-pointer active:scale-95"
              title="Add Room"
            >
              <HugeIcon className="ph-bold ph-plus text-[14px]" />
            </button>
            <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />
            <button
              type="button"
              onClick={() => {
                setNewRoomName(activeRoom?.name || `Room ${activeRoom?.id || ""}`)
                setRenameRoomOpen(true)
              }}
              disabled={!activeRoom}
              className="h-full w-8 flex items-center justify-center rounded-lg text-gray-600 dark:text-zinc-300 hover:bg-gray-100 hover:text-pup-maroon dark:hover:bg-zinc-700/60 dark:hover:text-red-400 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer active:scale-95"
              title="Rename Room"
            >
              <HugeIcon className="ph-bold ph-pencil-simple text-[14px]" />
            </button>
            <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />
            <button
              type="button"
              onClick={() => setDeleteRoomConfirmOpen(true)}
              disabled={!activeRoom || activeRoomStudentCount > 0}
              className="h-full w-8 flex items-center justify-center rounded-lg text-gray-600 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer active:scale-95"
              title={activeRoomStudentCount > 0 ? "Cannot delete room with active student records" : "Delete Room"}
            >
              <HugeIcon className="ph-bold ph-trash text-[14px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Center: Canvas View Controls (Grid & Snap) */}
      <div className="hidden lg:flex items-center gap-2 flex-none">
        <button
          type="button"
          onClick={() => setShowGrid(!showGrid)}
          className={cn(
            "h-9 px-3 flex items-center gap-1.5 rounded-xl border text-xs transition-all cursor-pointer active:scale-95 shadow-xs",
            showGrid
              ? "bg-gray-100 border-border dark:bg-zinc-700 dark:border-border text-gray-900 dark:text-white font-semibold"
              : "bg-white border-border dark:bg-zinc-800 dark:border-border text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-700 font-medium"
          )}
          title={showGrid ? "Hide Grid Lines (G)" : "Show Grid Lines (G)"}
        >
          <HugeIcon className="ph-bold ph-grid-four text-[14px]" />
          <span>Grid</span>
        </button>
        
        <button
          type="button"
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={cn(
            "h-9 px-3 flex items-center gap-1.5 rounded-xl border text-xs transition-all cursor-pointer active:scale-95 shadow-xs",
            snapToGrid
              ? "bg-gray-100 border-border dark:bg-zinc-700 dark:border-border text-gray-900 dark:text-white font-semibold"
              : "bg-white border-border dark:bg-zinc-800 dark:border-border text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-700 font-medium"
          )}
          title={snapToGrid ? "Disable Snap to Grid (S)" : "Enable Snap to Grid (S)"}
        >
          <HugeIcon className="ph-bold ph-magnet text-[14px]" />
          <span>Snap</span>
        </button>
      </div>

      {/* Right side: Cabinet Insertion + Unified Template Suite */}
      <div className="flex items-center gap-2.5 flex-none">
        {/* Group 4: Cabinet Insertion */}
        <Button
          type="button"
          variant="outline"
          onClick={addCabinet}
          disabled={!activeRoom}
          className="h-9 px-3.5 text-sm font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center"
          title="Add a new cabinet to the room"
        >
          Add
        </Button>

        {/* Group 5: Unified Template Suite Capsule */}
        <div className="flex items-center h-9 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 shadow-xs divide-x divide-border dark:divide-border">
          <div className="flex items-center pl-3 pr-1 text-gray-400 dark:text-zinc-500 rounded-l-xl">
            <HugeIcon className="ph-bold ph-squares-four text-[14px]" />
          </div>
          <Select
            className="h-full w-auto min-w-[120px] cursor-pointer rounded-none! border-0 bg-transparent pl-1 pr-3 gap-1 text-sm font-medium text-gray-700 dark:text-zinc-200 shadow-none hover:bg-black/[0.02]! focus:ring-0! focus:border-0! focus:outline-none!"
            menuClassName="bg-white! border border-border! rounded-xl! shadow-xl! dark:border-border dark:bg-card min-w-[200px] w-max z-50"
            optionClassName="text-sm! font-normal! text-gray-900! h-9! px-3! bg-transparent! hover:bg-gray-50! dark:text-zinc-200 dark:hover:bg-white/5 rounded-none!"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            disabled={!activeRoom || templates.length === 0}
          >
            {templates.map((tpl) => <option key={`tpl-opt-${tpl.id}`} value={tpl.id}>{tpl.name}</option>)}
          </Select>

          <button
            type="button"
            onClick={() => setTemplateApplyConfirmOpen(true)}
            disabled={!activeRoom || !selectedTemplateId}
            className="h-full px-3 text-sm font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer flex items-center justify-center border-0 bg-transparent active:scale-95 shadow-none"
            title="Apply selected template to current room"
          >
            Apply
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="h-full px-2.5 flex items-center justify-center text-gray-900 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer border-0 bg-transparent focus:outline-none active:scale-95 rounded-r-xl"
              title="Template Options"
            >
              <HugeIcon className="ph-bold ph-dots-three-vertical text-[15px]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl border border-border bg-white shadow-xl dark:bg-zinc-900 dark:border-border p-1 z-50">
              <DropdownMenuItem onClick={() => setSaveTemplateOpen(true)} className="cursor-pointer text-sm font-medium py-2 rounded-lg" disabled={!activeRoom || activeRoom.cabinets?.length === 0}>
                <HugeIcon className="ph-bold ph-floppy-disk mr-2 text-sm text-gray-600 dark:text-zinc-300" /> Save as Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteTemplateConfirmOpen(true)} className="cursor-pointer text-sm font-medium py-2 rounded-lg text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400" disabled={!selectedTemplateId}>
                <HugeIcon className="ph-bold ph-trash mr-2 text-sm" /> Delete Template
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-gray-100 dark:bg-white/10" />
              <DropdownMenuItem onClick={() => setRestoreTemplatesConfirmOpen(true)} className="cursor-pointer text-sm font-medium py-2 rounded-lg text-amber-600 focus:text-amber-600 dark:text-amber-400 dark:focus:text-amber-400">
                <HugeIcon className="ph-bold ph-arrow-counter-clockwise mr-2 text-sm" /> Restore Defaults
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )

  const renderEditorContent = () => (
    <div className="flex w-full flex-col bg-white select-none dark:bg-card">
      <PageHeader
        icon="ph-layout"
        title="Storage Layout Editor"
        description="Organize how cabinets are placed and arranged in your storage rooms."
        showBorder={false}
        titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
        descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
        actions={
          <div className="flex items-center gap-2">
            <RefreshButton
              onRefresh={() => handleRefresh(true)}
              isLoading={loading}
              title="Refresh Storage Layout"
            />
            <Button
              onClick={saveLayout}
              disabled={saving || hasAnyCollisions}
              className="flex h-10 px-5 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-sm active:scale-95 disabled:opacity-30 disabled:grayscale transition-all dark:shadow-none cursor-pointer border-0 shadow-xs"
            >
              {saving ? (
                <HugeIcon className="ph-bold ph-spinner animate-spin text-sm" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        }
      />
      <div className="border-b border-border dark:border-border w-full" />

      {renderToolbar()}

      <div className="relative">
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CabinetCanvas 
              canvasRef={canvasRef} activeRoom={activeRoom} selectedCabinetIds={selectedCabinetIds} selectedCabinet={selectedCabinet} collidingIds={collidingIds} activePath={activePath} simulationMode={simulationMode} snapToGrid={snapToGrid} showGrid={showGrid} handleCanvasPointerMove={handleCanvasPointerMove} handleCanvasPointerUp={handleCanvasPointerUp} setSelectedCabinetIds={setSelectedCabinetIds} onOpenRenameCabinet={openRenameCabinet} duplicateSelectedCabinet={duplicateSelectedCabinet} setBulkConfirmOpen={setBulkConfirmOpen} dragRef={dragRef} updateSelectedRectFromNormalized={updateSelectedRectFromNormalized} updateSelectedSizeNormalized={updateSelectedSizeNormalized} selectionBox={selectionBox} pushHistory={pushHistory} layout={layout} isModalOpen={false}
            />
          </div>
          <div className="lg:col-span-1 select-none">
            <CabinetSidebar 
              activeRoom={activeRoom}
              carouselIndex={carouselIndex}
              setCarouselIndex={setCarouselIndex}
              selectedCabinetIds={selectedCabinetIds} selectedCabinet={selectedCabinet} onOpenRenameCabinet={openRenameCabinet} duplicateSelectedCabinet={duplicateSelectedCabinet} setBulkConfirmOpen={setBulkConfirmOpen} removeDrawerFromSelected={removeDrawerFromSelected} addDrawerToSelected={addDrawerToSelected} updateSelectedRectFromNormalized={updateSelectedRectFromNormalized} updateSelectedSizeNormalized={updateSelectedSizeNormalized} history={history} historyIndex={historyIndex} revertToHistoryState={revertToHistoryState}
              studentDrawerUsage={studentDrawerUsage}
            />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="animate-fade-up font-jakarta flex w-full flex-col gap-6">
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

      <Card className="rounded-2xl border border-border bg-white shadow-sm p-0 gap-0 dark:border-border dark:bg-card dark:shadow-none w-full overflow-hidden">
        {renderEditorContent()}
      </Card>

      <FloatingActionBar selectedCount={selectedCabinetIds.size} onCancel={() => setSelectedCabinetIds(new Set())} actionLabel="Delete" actionIcon="ph-trash" onAction={() => setBulkConfirmOpen(true)} selectionStatus="Selected Cabinets" />

      <ConfirmModal
        open={bulkConfirmOpen}
        onCancel={() => setBulkConfirmOpen(false)}
        title={deleteCabinetTitle}
        message={deleteCabinetMessage}
        confirmLabel={deleteCabinetConfirmLabel}
        selectedItems={deleteCabinetItems}
        variant="danger"
        onConfirm={bulkDeleteCabinets}
        isDeleteModal={true}
      />
      <ConfirmModal
        open={deleteRoomConfirmOpen}
        onCancel={() => setDeleteRoomConfirmOpen(false)}
        title="Delete Storage Room"
        message={`Are you sure you want to delete ${activeRoom?.name || `Room ${activeRoom?.id}`}? This room and all cabinet configurations inside it will be permanently deleted.`}
        confirmLabel="Delete"
        selectedItems={activeRoom ? [`${activeRoom.name || `Room ${activeRoom.id}`} (${(activeRoom.cabinets || []).length} ${activeRoom.cabinets?.length === 1 ? "cabinet" : "cabinets"})`] : []}
        variant="danger"
        onConfirm={() => {
          removeActiveRoom()
          setDeleteRoomConfirmOpen(false)
        }}
        isDeleteModal={true}
      />
      <ConfirmModal
        open={resetRoomConfirmOpen}
        onCancel={() => setResetRoomConfirmOpen(false)}
        title="Reset Room Layout"
        message={`Are you sure you want to reset ${activeRoom?.name || `Room ${activeRoom?.id}`}? All placed cabinets will be cleared and the room layout will revert to an empty floorplan.`}
        confirmLabel="Reset"
        selectedItems={activeRoom ? [`${activeRoom.name || `Room ${activeRoom.id}`} (${(activeRoom.cabinets || []).length} ${activeRoom.cabinets?.length === 1 ? "cabinet" : "cabinets"})`] : []}
        variant="warning"
        onConfirm={() => {
          resetActiveRoomCabinets()
          setResetRoomConfirmOpen(false)
        }}
        isAppleStyled={true}
      />
      <ConfirmModal
        open={templateApplyConfirmOpen}
        onCancel={() => setTemplateApplyConfirmOpen(false)}
        title="Apply Room Template"
        message={`Are you sure you want to apply the "${templates.find(t => t.id === selectedTemplateId)?.name || 'selected'}" template? This will replace the current cabinet layout in ${activeRoom?.name || `Room ${activeRoom?.id}`}.`}
        confirmLabel="Apply"
        selectedItems={templates.find(t => t.id === selectedTemplateId) ? [templates.find(t => t.id === selectedTemplateId).name] : []}
        variant="warning"
        onConfirm={() => {
          applyTemplateToActiveRoom()
          setTemplateApplyConfirmOpen(false)
        }}
        isAppleStyled={true}
      />
      
      <PromptModal
        open={saveTemplateOpen}
        onCancel={() => {
          setSaveTemplateOpen(false)
          setNewTemplateName("")
        }}
        title="Save as Template"
        message="Enter a name for this new custom template."
        confirmLabel="Save"
        value={newTemplateName}
        onChange={setNewTemplateName}
        onConfirm={() => saveCurrentAsTemplate(newTemplateName)}
        isLoading={saving}
        buttonIcon="ph-floppy-disk"
        variant="brand"
      />

      <PromptModal
        open={renameRoomOpen}
        onCancel={() => {
          setRenameRoomOpen(false)
          setNewRoomName("")
        }}
        title="Rename Storage Room"
        message={`Enter a new display name for ${activeRoom?.name || `Room ${activeRoom?.id || ""}`}.`}
        confirmLabel="Save"
        value={newRoomName}
        onChange={setNewRoomName}
        onConfirm={handleRenameRoom}
        buttonIcon="ph-check"
        variant="brand"
      />

      <PromptModal
        open={renameCabinetOpen}
        onCancel={() => {
          setRenameCabinetOpen(false)
          setCabinetToRename(null)
          setNewCabinetName("")
        }}
        title="Rename Storage Cabinet"
        message={`Enter a new identifier or name for Cabinet ${cabinetToRename?.id || selectedCabinet?.id || ""}.`}
        confirmLabel="Save"
        value={newCabinetName}
        onChange={setNewCabinetName}
        onConfirm={handleRenameCabinet}
        buttonIcon="ph-check"
        variant="brand"
      />
      <ConfirmModal 
        open={deleteTemplateConfirmOpen} 
        onCancel={() => setDeleteTemplateConfirmOpen(false)} 
        title="Delete Custom Template" 
        message={`Are you sure you want to delete the "${templates.find(t => t.id === selectedTemplateId)?.name || 'selected'}" template? This custom layout template will be permanently removed.`} 
        confirmLabel="Delete" 
        selectedItems={templates.find(t => t.id === selectedTemplateId) ? [templates.find(t => t.id === selectedTemplateId).name] : []}
        variant="danger" 
        onConfirm={deleteSelectedTemplate} 
        isLoading={saving}
        isDeleteModal={true}
      />
      <ConfirmModal 
        open={restoreTemplatesConfirmOpen} 
        onCancel={() => setRestoreTemplatesConfirmOpen(false)} 
        title="Restore Default Templates" 
        message="This will delete all custom layout templates and restore the factory default room layouts. Are you sure you want to proceed?" 
        confirmLabel="Restore" 
        variant="success" 
        isRestoreModal={true}
        onConfirm={restoreDefaultTemplates} 
        isLoading={saving}
        isAppleStyled={true}
      />
    </div>
  )
}



