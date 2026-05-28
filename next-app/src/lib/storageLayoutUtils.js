export function canonicalizeCabinetId(cabId) {
  return String(cabId || "")
    .trim()
    .toUpperCase()
    .replace(/^CAB[- ]/i, "");
}

export function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

export function getCabinetEffectiveSize(item) {
  const baseW = Number(item?.rect?.w ?? item?.w) || 0
  const baseH = Number(item?.rect?.h ?? item?.h) || 0
  const rot = Math.abs(Number(item?.rotation || 0)) % 180
  return rot === 90 ? { w: baseH, h: baseW } : { w: baseW, h: baseH }
}

export function checkCollisions(targetId, nextRect, nextRotation, currentRoom) {
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

    const otherEff = getCabinetEffectiveSize(other)
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

export function clampToRoom(item) {
  const x = Number(item?.rect?.x ?? item?.x) || 0
  const y = Number(item?.rect?.y ?? item?.y) || 0
  const { w, h } = getCabinetEffectiveSize(item)
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

export const SNAP_STEP_X = 0.025 // 2.5% (40 units wide)
export const SNAP_STEP_Y = 0.04  // 4% (25 units high) to make it square on 16:10

export function snapValue(val, snapToGrid, axis = 'x') {
  if (!snapToGrid) return val
  const step = axis === 'x' ? SNAP_STEP_X : SNAP_STEP_Y
  return Math.round(val / step) * step
}

export function toPct(val) {
  if (!Number.isFinite(val)) return 0
  return Math.round(val * 100)
}

export function fromPct(val) {
  return clamp(val / 100, 0, 1)
}

export function calculatePath(room, targetCabId, getDefaultDoor) {
  if (!room || !targetCabId || targetCabId === "DOOR") return null
  const targetCab = room.cabinets.find((c) => c.id === targetCabId)
  if (!targetCab) return null

  const door = room.door || getDefaultDoor()
  const GRID_SIZE_X = 40
  const GRID_SIZE_Y = 25
  const grid = Array.from({ length: GRID_SIZE_Y }, () => Array(GRID_SIZE_X).fill(0))

  // Mark obstacles (cabinets)
  const stepX = 1 / GRID_SIZE_X
  const stepY = 1 / GRID_SIZE_Y

  room.cabinets.forEach((cab) => {
    const eff = getCabinetEffectiveSize(cab)
    const left = cab.rect.x
    const right = cab.rect.x + eff.w
    const top = cab.rect.y
    const bottom = cab.rect.y + eff.h

    for (let y = 0; y < GRID_SIZE_Y; y++) {
      const cellTop = y * stepY
      const cellBottom = (y + 1) * stepY
      if (cellBottom <= top + 0.001 || cellTop >= bottom - 0.001) continue

      for (let x = 0; x < GRID_SIZE_X; x++) {
        const cellLeft = x * stepX
        const cellRight = (x + 1) * stepX
        if (cellRight <= left + 0.001 || cellLeft >= right - 0.001) continue

        grid[y][x] = 1
      }
    }
  })

  const doorEff = getCabinetEffectiveSize(door)
  const startX = clamp(Math.floor((door.x + doorEff.w / 2) * GRID_SIZE_X), 0, GRID_SIZE_X - 1)
  const startY = clamp(Math.floor((door.y + doorEff.h / 2) * GRID_SIZE_Y), 0, GRID_SIZE_Y - 1)
  
  const cabEff = getCabinetEffectiveSize(targetCab)
  const endX = clamp(Math.floor((targetCab.rect.x + cabEff.w / 2) * GRID_SIZE_X), 0, GRID_SIZE_X - 1)
  const endY = clamp(Math.floor((targetCab.rect.y + cabEff.h / 2) * GRID_SIZE_Y), 0, GRID_SIZE_Y - 1)

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
      [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
    ]

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < GRID_SIZE_X && ny >= 0 && ny < GRID_SIZE_Y && grid[ny][nx] === 0) {
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
