"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export default function RoomMap2D({
  kind, // "cabinets" | "drawers"
  activeStudent,
  cabinets,
  roomDoor,
  selectedCabinetId,
  drawerSlots,
  onCabinetClick,
  onDrawerClick,
  onPreviewDocument,
}) {
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
    setExpandedDrawer(null)
  }, [selectedCabinetId])

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

  // Removed hover auto-shifting / teleporting feature as requested

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

  const positionClasses = {
    right: "top-4 right-4",
    left: "top-4 left-4",
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-brand border border-gray-300 dark:border-white/10 bg-[#f8fafc] dark:bg-zinc-800 shadow-inner dark:shadow-none transition-all duration-300"
    >
      {/* AutoCAD-inspired precision grid */}
      <div
        className="pointer-events-none absolute inset-0 text-slate-400/20 dark:text-zinc-600/30"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "2.5% 4%, 2.5% 4%",
        }}
      />

      {/* Wayfinder Path Trail */}
      {pathCoordinates.slice(0, drawnLength).map(([r, c], idx) => (
        <div
          key={`${r}-${c}-${idx}`}
          className="absolute z-10 flex items-center justify-center pointer-events-none"
          style={{
            left: `${c * 2.5}%`,
            top: `${r * 4}%`,
            width: "2.5%",
            height: "4%",
          }}
        >
          <div 
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors duration-300",
              activeStudent
                ? "bg-pup-maroon shadow-[0_0_10px_rgba(128,0,0,0.6)] dark:bg-red-400 dark:shadow-[0_0_10px_rgba(248,113,113,0.6)]"
                : "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)] dark:bg-cyan-400 dark:shadow-[0_0_10px_rgba(34,211,238,0.5)]"
            )}
            style={{ 
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
        <div className="relative flex h-full w-full items-center justify-center rounded-sm bg-pup-maroon shadow-md dark:bg-red-600 dark:shadow-none">
          <span className="text-[9px] font-black tracking-widest text-white whitespace-nowrap">
            Entrance
          </span>
        </div>
      </div>

      {cabinetRects.map((c) => {
        const hasActiveTarget = cabinetRects.some((cab) => cab.isTarget)
        const isSelected = kind === "drawers" && c.cab === selectedCabinetId
        const isTarget = Boolean(c.isTarget)
        const rect = getEffectiveRect(c)
        const isClickable = !hasActiveTarget || isTarget

        return (
          <div
            key={c.cab}
            className={cn(
              "absolute border-2 transition-all duration-300 rounded-sm shadow-xs overflow-hidden",
              isClickable ? "cursor-pointer" : "opacity-30 pointer-events-none select-none",
              isTarget
                ? "border-red-600 bg-red-100 shadow-[0_0_0_4px_rgba(220,38,38,0.2)] dark:border-red-500 dark:bg-red-950/40 dark:shadow-[0_0_0_4px_rgba(239,68,68,0.2)]"
                : isSelected
                  ? "z-10 border-cyan-500 bg-cyan-50 shadow-[0_0_0_4px_rgba(6,182,212,0.2)] dark:border-cyan-300 dark:bg-cyan-950/40"
                  : "border-gray-500 bg-gray-100 hover:bg-gray-200 dark:border-zinc-500 dark:bg-zinc-700 dark:hover:bg-zinc-600"
            )}
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
            }}
            onClick={() => {
              if (isClickable) {
                onCabinetClick?.(c.cab)
              }
            }}
          >
            {/* Precision Frame Overlay (Simulated Depth) */}
            <div className="absolute inset-0 border border-white/20 pointer-events-none rounded-[1px]" />
            <div className="absolute inset-[1px] border border-black/5 pointer-events-none rounded-[1px]" />

            {/* Cabinet Label always rendered cleanly inside */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 pointer-events-none select-none">
              <span className={cn(
                "text-[10px] font-black tracking-tighter",
                isTarget
                  ? "text-red-800 dark:text-red-400"
                  : isSelected
                    ? "text-cyan-800 dark:text-cyan-400"
                    : "text-gray-700 dark:text-zinc-300"
              )}>
                {c.cab}
              </span>
              <span className="text-[8px] font-bold text-gray-500 dark:text-zinc-400 mt-0.5">
                {c.occupiedCount} recs
              </span>
            </div>
          </div>
        )
      })}

      {/* Floating Drawer Details Overlay Panel inside the Preview container */}
      {kind === "drawers" && selectedCabinetId && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute z-30 w-64 rounded-xl border border-gray-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/95 animate-in fade-in duration-300",
            inspectorPos ? "transition-none" : "transition-all",
            !inspectorPos && (positionClasses[modalPosition] || "top-4 right-4")
          )}
          style={inspectorPos ? { left: `${inspectorPos.x}%`, top: `${inspectorPos.y}%` } : undefined}
        >
          <div 
            className="mb-3 flex items-center justify-between cursor-grab active:cursor-grabbing select-none touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="flex items-center gap-2 pointer-events-none">
              <i className="ph-fill ph-archive-box text-pup-maroon dark:text-primary text-base"></i>
              <h5 className="font-black text-xs text-gray-900 dark:text-zinc-50 tracking-tight">
                Cabinet {selectedCabinetId}
              </h5>
            </div>
            {/* Clean close/back button that toggles cabinet selection back to null */}
            {!activeStudent && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCabinetClick?.(null)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-zinc-200 transition-colors pointer-events-auto"
                title="Back to Cabinets"
              >
                <i className="ph-bold ph-x text-sm"></i>
              </button>
            )}
          </div>

          <div className="space-y-2">
            <span className="text-[9px] font-black tracking-widest text-gray-400 dark:text-zinc-500">
              Drawer slots
            </span>
            <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
              {drawerSlots?.map((d) => {
                const isDrawerTarget = d.isTarget
                const hasOccupants = d.count > 0
                const hasActiveDrawerTarget = drawerSlots?.some((slot) => slot.isTarget)
                const isClickable = !hasActiveDrawerTarget || isDrawerTarget

                return (
                  <div
                    key={d.drawer}
                    className={cn(
                      "flex flex-col gap-1 transition-all duration-300",
                      !isClickable && "opacity-30 pointer-events-none select-none"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-between rounded-lg border-2 p-2 cursor-pointer transition-all active:scale-[0.98]",
                        isDrawerTarget
                          ? "border-red-500 bg-red-50 hover:bg-red-100 text-red-900 dark:border-red-400 dark:bg-red-950/20 dark:text-red-300"
                          : hasOccupants
                            ? activeStudent
                              ? "border-pup-maroon bg-red-50 hover:bg-red-100 text-pup-maroon dark:border-red-400/60 dark:bg-red-950/20 dark:text-red-300"
                              : "border-cyan-500 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 dark:border-cyan-500 dark:bg-cyan-950/20 dark:text-cyan-300"
                            : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedDrawer(expandedDrawer === d.drawer ? null : d.drawer)
                        onDrawerClick?.(d.drawer)
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <i className={cn(
                          "ph-bold text-sm",
                          isDrawerTarget
                            ? "ph-map-pin"
                            : hasOccupants
                              ? "ph-folder-open"
                              : "ph-folder"
                        )}></i>
                        <span className="text-[11px] font-bold">
                          Drawer {d.drawer}
                        </span>
                      </div>
                      <span className="text-[9px] font-black tracking-wider">
                        {isDrawerTarget ? "Target" : hasOccupants ? `${d.count} recs` : "Empty"}
                      </span>
                    </div>

                    {expandedDrawer === d.drawer && hasOccupants && d.students && (
                      <div className={cn(
                        "ml-2 pl-3 border-l-2 border-dashed py-1.5 space-y-1.5 max-h-40 overflow-y-auto",
                        activeStudent ? "border-red-200 dark:border-red-950" : "border-cyan-300 dark:border-cyan-800"
                      )}>
                        {d.students.map((student) => {
                          const isTargetPerson = activeStudent && student.studentNo === activeStudent.studentNo;
                          return (
                            <div
                              key={student.studentNo}
                              className={cn(
                                "group/item flex flex-col gap-1 rounded-md p-1.5 text-[10px] bg-slate-100/50 dark:bg-zinc-800/50 transition-colors border",
                                isTargetPerson
                                  ? "border-red-500 bg-red-50/90 dark:bg-red-950/40 ring-1 ring-red-500/30"
                                  : activeStudent
                                    ? "border-transparent hover:bg-red-50/50 dark:hover:bg-red-950/20"
                                    : "border-transparent hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20"
                              )}
                            >
                              <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                                <div className="min-w-0 flex-1">
                                  <p className={cn(
                                    "font-bold text-gray-800 dark:text-zinc-200 truncate",
                                    isTargetPerson
                                      ? "text-red-700 dark:text-red-400 font-black"
                                      : activeStudent
                                        ? "group-hover/item:text-pup-maroon dark:group-hover/item:text-red-400"
                                        : "group-hover/item:text-cyan-600 dark:group-hover/item:text-cyan-400"
                                  )}>
                                    {student.name}
                                  </p>
                                  <p className={cn(
                                    "font-mono text-[9px]",
                                    isTargetPerson ? "text-red-500/80 dark:text-red-400/80" : "text-gray-400 dark:text-zinc-500"
                                  )}>
                                    {student.studentNo}
                                  </p>
                                </div>
                                {isTargetPerson && (
                                  <i className="ph-fill ph-target text-red-600 dark:text-red-400 text-sm shrink-0 animate-pulse" />
                                )}
                              </div>
                              {student.documents && student.documents.length > 0 ? (
                                <div className="mt-1 space-y-1">
                                  <div className="flex flex-col gap-1">
                                    {student.documents.map((doc) => (
                                      <div
                                        key={doc.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onPreviewDocument?.(doc.docType, student.name, student.studentNo, doc.id);
                                        }}
                                        className="flex items-center justify-between gap-1.5 p-1 rounded bg-white hover:bg-red-50 dark:bg-zinc-900/50 dark:hover:bg-red-950/30 border border-gray-200/50 dark:border-white/5 cursor-pointer transition-colors group/doc"
                                      >
                                        <div className="flex items-center gap-1 min-w-0">
                                          <i className="ph-bold ph-file-pdf text-[10px] text-red-500 group-hover/doc:scale-110 transition-transform"></i>
                                          <span className="truncate font-semibold text-[8px] text-gray-700 dark:text-zinc-300 group-hover/doc:text-pup-maroon dark:group-hover/doc:text-red-400" title={doc.filename}>
                                            {doc.docType}
                                          </span>
                                        </div>
                                        <span className={cn(
                                          "text-[6px] font-black px-1 rounded-full border shrink-0 scale-90 origin-right",
                                          doc.approvalStatus === "Approved"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900"
                                            : "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900"
                                        )}>
                                          {doc.approvalStatus}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[8px] font-medium text-gray-400 dark:text-zinc-500 italic mt-0.5 pl-1">
                                  No documents uploaded
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
