"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { FOLDER_COLORS } from "@/lib/constants"

export default function RoomMap2D({
  kind, // "cabinets" | "drawers"
  activeStudent,
  activeStudentColor = "yellow",
  cabinets,
  roomDoor,
  selectedCabinetId,
  drawerSlots,
  onCabinetClick,
  onDrawerClick,
  onPreviewDocument,
  onUnfocusStudent,
}) {
  const theme = FOLDER_COLORS[activeStudentColor] || FOLDER_COLORS["yellow"]
  const trailColor = activeStudent ? theme.frontStart : "#06b6d4"
  const cabinetRects = cabinets || []
  const containerRef = useRef(null)
  const [modalPosition, setModalPosition] = useState("right")
  const [inspectorPos, setInspectorPos] = useState(null)
  const [pathCoordinates, setPathCoordinates] = useState([])
  const [drawnLength, setDrawnLength] = useState(0)

  const lastChangeTimeRef = useRef(0)
  const dragStartRef = useRef(null)

  const [expandedDrawer, setExpandedDrawer] = useState(null)

  useEffect(() => {
    setInspectorPos(null)
    if (activeStudent && String(activeStudent.cabinet) === String(selectedCabinetId)) {
      setExpandedDrawer(activeStudent.drawer)
    } else {
      setExpandedDrawer(null)
    }
  }, [selectedCabinetId, activeStudent])

  // Sequential Drawing Effect
  useEffect(() => {
    setDrawnLength(0)
    if (pathCoordinates.length === 0) return

    const interval = setInterval(() => {
      setDrawnLength((prev) => {
        if (prev >= pathCoordinates.length) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 25) // Speed of drawing

    return () => clearInterval(interval)
  }, [pathCoordinates])

  // Wayfinder path generation logic
  useEffect(() => {
    if (!selectedCabinetId || kind !== "drawers") {
      setPathCoordinates([])
      return
    }

    const selectedCab = cabinetRects.find((c) => c.cab === selectedCabinetId)
    if (!selectedCab) {
      setPathCoordinates([])
      return
    }

    // Grid configuration (matches CSS background-size: 2.5% 4%)
    const cols = 40 // 100 / 2.5
    const rows = 25 // 100 / 4
    const dx = 1 / cols
    const dy = 1 / rows

    // 1. Calculate boundaries of selected cabinet
    const selRect = getEffectiveRect(selectedCab)
    const selStartC = Math.max(0, Math.min(cols - 1, Math.floor(selRect.x / dx)))
    const selEndC = Math.max(0, Math.min(cols - 1, Math.floor((selRect.x + selRect.w - 0.0001) / dx)))
    const selStartR = Math.max(0, Math.min(rows - 1, Math.floor(selRect.y / dy)))
    const selEndR = Math.max(0, Math.min(rows - 1, Math.floor((selRect.y + selRect.h - 0.0001) / dy)))

    const grid = Array.from({ length: rows }, () => Array(cols).fill(0))

    // 2. Define valid targets: Cells ADJACENT to the center of the four sides
    const centerC = Math.floor((selStartC + selEndC) / 2)
    const centerR = Math.floor((selStartR + selEndR) / 2)
    
    const potentialTargets = [
      [selStartR - 1, centerC], // Top Neighbor
      [selEndR + 1, centerC],   // Bottom Neighbor
      [centerR, selStartC - 1], // Left Neighbor
      [centerR, selEndC + 1],   // Right Neighbor
    ]

    const targetNodes = new Set()
    potentialTargets.forEach(([tr, tc]) => {
      if (tr >= 0 && tr < rows && tc >= 0 && tc < cols) {
        targetNodes.add(`${tr},${tc}`)
      }
    })

    // 3. Mark obstacles (Unselected Cabinets) with +2 grid buffer
    cabinetRects.forEach((c) => {
      const isSelected = c.cab === selectedCabinetId
      const rect = getEffectiveRect(c)
      
      let startC = Math.floor(rect.x / dx)
      let endC = Math.floor((rect.x + rect.w - 0.0001) / dx)
      let startR = Math.floor(rect.y / dy)
      let endR = Math.floor((rect.y + rect.h - 0.0001) / dy)

      if (!isSelected) {
        // Expanded hitbox (+2 units)
        startC -= 2
        endC += 2
        startR -= 2
        endR += 2
      }

      for (let r = startR; r <= endR; r++) {
        for (let colIdx = startC; colIdx <= endC; colIdx++) {
          if (r >= 0 && r < rows && colIdx >= 0 && colIdx < cols) {
            // Unselected cabinets (and buffer) are obstacles (1)
            if (!isSelected) grid[r][colIdx] = 1 
          }
        }
      }
    })

    // Special Case: The stand-in-front nodes MUST be walkable, even if they overlap a buffer
    targetNodes.forEach(nodeStr => {
      const [tr, tc] = nodeStr.split(',').map(Number)
      grid[tr][tc] = 0
    })

    // 4. Define Start Node (Top of Entrance Door) with mandatory 2-grid vertical stem
    const door = roomDoor || { x: 0.05, y: 0.96, w: 0.1, h: 0.04 }
    const entryC = Math.max(0, Math.min(cols - 1, Math.floor((door.x + door.w / 2) / dx)))
    const entryR = Math.max(0, Math.min(rows - 1, Math.floor(door.y / dy)))
    
    // We force a 2-grid vertical line starting FROM the edge
    const stemPoints = [
      [entryR, entryC],
      [Math.max(0, entryR - 1), entryC]
    ]

    const pathStartR = Math.max(0, entryR - 2)
    const pathStartC = entryC

    // Ensure entire stem path is walkable
    grid[entryR][entryC] = 0
    grid[Math.max(0, entryR - 1)][entryC] = 0
    grid[pathStartR][pathStartC] = 0

    // 5. 8-Directional Dijkstra Algorithm: Direct Diagonals + Straight Finish
    // dirs: Up, Down, Left, Right, then Diagonals (UL, UR, DL, DR)
    const dirs = [
      [-1, 0], [1, 0], [0, -1], [0, 1], 
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ] 

    const queue = [{ r: pathStartR, c: pathStartC, dir: 0, cost: 0 }] // Initial dir: 0 (Up)
    const visited = Array.from({ length: rows }, () => Array(cols).fill(Infinity))
    const parent = {}
    visited[pathStartR][pathStartC] = 0

    let foundTarget = null

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost)
      const curr = queue.shift()

      if (targetNodes.has(`${curr.r},${curr.c}`)) {
        foundTarget = [curr.r, curr.c]
        break
      }

      for (let i = 0; i < dirs.length; i++) {
        const [dr, dc] = dirs[i]
        const nextR = curr.r + dr
        const nextC = curr.c + dc

        if (nextR >= 0 && nextR < rows && nextC >= 0 && nextC < cols) {
          if (grid[nextR][nextC] === 0) {
            const isDiagonal = i >= 4
            const isTurn = curr.dir !== null && curr.dir !== i
            
            const dist = isDiagonal ? 1.414 : 1
            const penalty = isTurn ? 0.1 : 0
            const newCost = curr.cost + dist + penalty

            if (newCost < visited[nextR][nextC]) {
              visited[nextR][nextC] = newCost
              parent[`${nextR},${nextC}`] = [curr.r, curr.c]
              queue.push({ r: nextR, c: nextC, dir: i, cost: newCost })
            }
          }
        }
      }
    }

    // 6. Reconstruct path (Combining Stem + Calculated Path)
    const reconstructedPath = []
    if (foundTarget) {
      let curr = foundTarget
      while (curr) {
        reconstructedPath.push(curr)
        const p = parent[`${curr[0]},${curr[1]}`]
        if (!p) break
        curr = p
      }
      reconstructedPath.reverse()
    }

    // Combine manual stem with path
    const finalPath = foundTarget ? [...stemPoints, ...reconstructedPath] : []
    setPathCoordinates(finalPath)
  }, [selectedCabinetId, cabinetRects, roomDoor, kind])

  // Dynamically position modal opposite of the clicked cabinet on selection
  useEffect(() => {
    if (!selectedCabinetId) return
    const selectedCab = cabinetRects.find((c) => c.cab === selectedCabinetId)
    if (selectedCab) {
      const rect = getEffectiveRect(selectedCab)
      setModalPosition(rect.x < 0.5 ? "right" : "left")
      lastChangeTimeRef.current = Date.now() // Reset cooldown on select
    }
  }, [selectedCabinetId, cabinetRects])

  const handlePointerDown = (e) => {
    e.preventDefault()
    const target = e.currentTarget.parentElement
    if (!target || !containerRef.current) return
    
    const rect = target.getBoundingClientRect()
    const parentRect = containerRef.current.getBoundingClientRect()
    
    const startX = ((rect.left - parentRect.left) / parentRect.width) * 100
    const startY = ((rect.top - parentRect.top) / parentRect.height) * 100

    dragStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      posLeft: startX,
      posTop: startY,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e) => {
    if (!dragStartRef.current || dragStartRef.current.pointerId !== e.pointerId) return
    e.preventDefault()
    
    if (!containerRef.current) return
    const parentRect = containerRef.current.getBoundingClientRect()
    const dx = ((e.clientX - dragStartRef.current.startX) / parentRect.width) * 100
    const dy = ((e.clientY - dragStartRef.current.startY) / parentRect.height) * 100

    let newLeft = dragStartRef.current.posLeft + dx
    let newTop = dragStartRef.current.posTop + dy

    // Clamp within parent boundaries
    newLeft = Math.max(0, Math.min(75, newLeft))
    newTop = Math.max(0, Math.min(80, newTop))

    setInspectorPos({ x: newLeft, y: newTop })
  }

  const handlePointerUp = (e) => {
    if (dragStartRef.current && dragStartRef.current.pointerId === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {}
      dragStartRef.current = null
    }
  }

  const getEffectiveRect = (c) => {
    const rot = Number(c?.rotation) === 90 ? 90 : 0
    if (rot !== 90) return c.rect
    return { ...c.rect, w: c.rect.h, h: c.rect.w }
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-brand border border-gray-300 dark:border-white/10 bg-[#f8fafc] dark:bg-zinc-600/30 shadow-inner dark:shadow-none transition-all duration-300"
    >
      {/* AutoCAD-inspired precision grid */}
      <div
        className="pointer-events-none absolute inset-0 text-slate-400/20 dark:text-[#292929]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "2.5% 4%, 2.5% 4%",
        }}
      />

      {/* Wayfinder Path Trail - Blue */}
      {pathCoordinates.slice(0, drawnLength).map(([r, c], idx) => (
        <div
          key={`${r}-${c}-${idx}`}
          className="absolute z-10 flex items-center justify-center pointer-events-none"
          style={{
            left: `${c * 2.5 + 1.25}%`,
            top: `${r * 4 + 2}%`,
            transform: "translate(-50%, -50%)",
            width: "2.5%",
            height: "4%",
          }}
        >
          <div 
            className="w-2.5 h-2.5 rounded-sm transition-colors duration-300"
            style={{ 
              backgroundColor: trailColor,
              animation: `wayfinder-wave 2s infinite ease-in-out`,
              animationDelay: `${idx * 50}ms` 
            }}
          />
        </div>
      ))}

      {/* Orientation marker (Entrance Door Block) exactly styled like CabinetCanvas */}
      <div
        className="absolute z-20"
        style={{
          left: `${(roomDoor?.x ?? 0.05) * 100}%`,
          top: `${(roomDoor?.y ?? 0.96) * 100}%`,
          width: `${(roomDoor?.w ?? 0.1) * 100}%`,
          height: `${(roomDoor?.h ?? 0.04) * 100}%`,
        }}
      >
        <div className="relative flex h-full w-full items-center justify-center rounded-sm bg-pup-maroon shadow-md transition-all duration-300 dark:bg-[#b94642] dark:shadow-none">
          <span className={cn(
            "text-[9px] font-semibold tracking-widest text-white whitespace-nowrap transition-transform duration-300 flex items-center gap-1",
            roomDoor?.rotation === 0 && "rotate-0",
            roomDoor?.rotation === 180 && "rotate-0", 
            roomDoor?.rotation === 90 && "-rotate-90", 
            roomDoor?.rotation === 270 && "rotate-90"  
          )}>
            <i className="ph-fill ph-door text-xs" />
            ENTRANCE
          </span>
        </div>
      </div>

      {cabinetRects.map((c) => {
        const hasActiveTarget = cabinetRects.some((cab) => cab.isTarget)
        const isSelected = kind === "drawers" && c.cab === selectedCabinetId
        const isTarget = Boolean(c.isTarget)
        const rect = getEffectiveRect(c)
        const isClickable = !hasActiveTarget || isTarget
        const drawerCount = (c.drawerIds || []).length || 4

        return (
          <div
            key={c.cab}
            className={cn(
              "absolute border-2 transition-all duration-300 rounded-md shadow-xs group/cab",
              isClickable ? "cursor-pointer" : "opacity-30 pointer-events-none select-none",
              isTarget
                ? "z-10 bg-gray-100 dark:bg-[#949494]"
                : isSelected
                  ? "z-10 border-cyan-500 bg-cyan-50 dark:border-cyan-300 dark:bg-cyan-950/40"
                  : "border-gray-300 bg-gray-100 hover:bg-gray-200 dark:border-zinc-600 dark:bg-[#949494] dark:hover:bg-zinc-300"
            )}
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `calc(${rect.w * 100}% + 1px)`,
              height: `calc(${rect.h * 100}% + 1px)`,
              ...(isTarget ? { borderColor: theme.frontStart } : {})
            }}
            onClick={() => {
              if (isClickable) {
                onCabinetClick?.(c.cab)
              }
            }}
          >
            {/* Physical Drawer Divisions & Handle Notches (Skeuomorphic-lite) */}
            <div className="absolute inset-0 flex flex-col pointer-events-none overflow-hidden rounded-[4px]">
              {Array.from({ length: drawerCount }).map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex-1 flex items-center justify-center border-b last:border-b-0 border-gray-300/40 dark:border-zinc-700/40",
                    isSelected && "border-cyan-300/30 dark:border-cyan-700/30"
                  )}
                  style={isTarget ? {
                    borderBottomColor: `${theme.frontStart}30`,
                  } : undefined}
                >
                  {/* Skeuomorphic Pull Handle */}
                  <div
                    className={cn(
                      "w-7 h-1.5 rounded-sm bg-gray-300 dark:bg-[#737373] border border-black/10 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(0,0,0,0.15)]",
                      isSelected && "bg-cyan-400 dark:bg-cyan-800 border-cyan-500/20"
                    )}
                    style={isTarget ? {
                      backgroundColor: theme.frontStart,
                      borderColor: theme.frontEnd,
                    } : undefined}
                  />
                </div>
              ))}
            </div>

            {/* Floating Cabinet ID Badge Overlay (Positioned outside depending on constraints and overlaps) */}
            {(() => {
              const otherCabinets = cabinetRects.filter((other) => other.cab !== c.cab)
              
              // Approximate normalized dimensions of the badge
              const wl = 0.075
              const hl = 0.035

              // Check if candidate placement rect overlaps canvas bounds or any other cabinet
              const isInvalid = (xl, yl, wl, hl) => {
                if (xl < 0.002 || yl < 0.002 || xl + wl > 0.998 || yl + hl > 0.998) {
                  return true
                }
                for (const other of otherCabinets) {
                  const otherEff = getEffectiveRect(other)
                  const ox = other.rect.x
                  const oy = other.rect.y
                  const ow = otherEff.w
                  const oh = otherEff.h
                  
                  const pad = 0.001
                  if (xl < ox + ow - pad && xl + wl > ox + pad && yl < oy + oh - pad && yl + hl > oy + pad) {
                    return true
                  }
                }
                return false
              }

              const candidates = ["top", "bottom", "right", "left"]
              let placement = "top"
              let found = false

              for (const cand of candidates) {
                let xl = rect.x + rect.w / 2 - wl / 2
                let yl = rect.y - hl
                
                if (cand === "bottom") {
                  xl = rect.x + rect.w / 2 - wl / 2
                  yl = rect.y + rect.h
                } else if (cand === "left") {
                  xl = rect.x - wl
                  yl = rect.y + rect.h / 2 - hl / 2
                } else if (cand === "right") {
                  xl = rect.x + rect.w
                  yl = rect.y + rect.h / 2 - hl / 2
                }
                
                if (!isInvalid(xl, yl, wl, hl)) {
                  placement = cand
                  found = true
                  break
                }
              }

              if (!found) {
                placement = "center"
              }

              const placementClasses = {
                top: "absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5 z-30",
                bottom: "absolute top-full left-1/2 -translate-x-1/2 mt-0.5 z-30",
                left: "absolute right-full top-1/2 -translate-y-1/2 mr-0.5 z-30",
                right: "absolute left-full top-1/2 -translate-y-1/2 ml-0.5 z-30",
                center: "absolute inset-0 flex items-center justify-center z-30"
              }

              return (
                <div className={cn(placementClasses[placement], "pointer-events-none select-none")}>
                  <div className={cn(
                    "inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] whitespace-nowrap shadow-xs border font-sans",
                    isTarget
                      ? "text-white"
                      : isSelected
                        ? "bg-[#ECFEFF] text-[#0891B2] border-[#CFFAFE] dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-900/30"
                        : "bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30"
                  )}
                  style={isTarget ? {
                    backgroundColor: theme.frontStart,
                    borderColor: theme.frontEnd,
                  } : undefined}
                  >
                    {c.cab}
                  </div>
                </div>
              )
            })()}

          </div>
        )
      })}
    </div>
  )
}
