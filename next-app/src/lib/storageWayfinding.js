import { getCabinetEffectiveSize } from "./storageLayoutUtils.js"

const GRID_COLUMNS = 40
const GRID_ROWS = 25

export function getWayfindingCabinetRect(cabinet) {
  return { ...cabinet.rect, ...getCabinetEffectiveSize(cabinet) }
}

// Returns canvas coordinates as percentages, from the entrance to an aisle beside the target.
export function getStorageRoute(cabinetRects, selectedCab, roomDoor) {
  if (!selectedCab) return []
  // Grid configuration (matches CSS background-size: 2.5% 4%)
  const cols = GRID_COLUMNS
  const rows = GRID_ROWS
  const dx = 1 / cols
  const dy = 1 / rows

  // 1. Calculate boundaries of selected cabinet
  const selRect = getWayfindingCabinetRect(selectedCab)
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

  // Cabinet footprints are solid. The buffer favors clearance without closing narrow aisles.
  cabinetRects.forEach((cabinet) => {
    const rect = getWayfindingCabinetRect(cabinet)
    const startC = Math.floor(rect.x / dx)
    const endC = Math.floor((rect.x + rect.w - 0.0001) / dx)
    const startR = Math.floor(rect.y / dy)
    const endR = Math.floor((rect.y + rect.h - 0.0001) / dy)
    const buffer = cabinet === selectedCab ? 0 : 2

    for (let r = Math.max(0, startR - buffer); r <= Math.min(rows - 1, endR + buffer); r++) {
      for (let c = Math.max(0, startC - buffer); c <= Math.min(cols - 1, endC + buffer); c++) {
        const insideCabinet = r >= startR && r <= endR && c >= startC && c <= endC
        grid[r][c] = Math.max(grid[r][c], insideCabinet ? 2 : 1)
      }
    }
  })

  targetNodes.forEach((key) => {
    const [r, c] = key.split(",").map(Number)
    if (grid[r][c] === 2) targetNodes.delete(key)
    else grid[r][c] = 0
  })

  const { x = 0.05, y = 0.96, w = 0.1, h = 0.04, rotation } = roomDoor || {}
  // Older bottom-wall doors may still have rotation 0.
  const inward = Number(rotation) === 90 ? [0, -1]
    : Number(rotation) === 270 ? [0, 1]
    : y < 0.5 ? [1, 0] : [-1, 0]
  const [inwardR, inwardC] = inward
  const doorRow = y + (inwardR > 0 ? h : inwardR < 0 ? 0 : h / 2)
  const doorColumn = x + (inwardC > 0 ? w : inwardC < 0 ? 0 : w / 2)
  const pathStartR = Math.max(0, Math.min(rows - 1, Math.floor(doorRow / dy + inwardR * 0.5)))
  const pathStartC = Math.max(0, Math.min(cols - 1, Math.floor(doorColumn / dx + inwardC * 0.5)))
  if (grid[pathStartR][pathStartC] === 2 || targetNodes.size === 0) return []
  grid[pathStartR][pathStartC] = 0

  // 5. 8-Directional Dijkstra Algorithm: Direct Diagonals + Straight Finish
  // dirs: Up, Down, Left, Right, then Diagonals (UL, UR, DL, DR)
  const dirs = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1]
  ]

  const entryDirection = dirs.findIndex(([dr, dc]) => dr === inwardR && dc === inwardC)
  const queue = [{ r: pathStartR, c: pathStartC, dir: entryDirection, cost: 0 }]
  const visited = Array.from({ length: rows }, () => Array(cols).fill(Infinity))
  const parent = {}
  visited[pathStartR][pathStartC] = 0

  let foundTarget = null

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost)
    const curr = queue.shift()
    if (curr.cost > visited[curr.r][curr.c]) continue

    if (targetNodes.has(`${curr.r},${curr.c}`)) {
      foundTarget = [curr.r, curr.c]
      break
    }

    for (let i = 0; i < dirs.length; i++) {
      const [dr, dc] = dirs[i]
      const nextR = curr.r + dr
      const nextC = curr.c + dc

      if (nextR >= 0 && nextR < rows && nextC >= 0 && nextC < cols) {
        const isDiagonal = i >= 4
        const cutsCorner = isDiagonal && (grid[curr.r][nextC] === 2 || grid[nextR][curr.c] === 2)
        if (grid[nextR][nextC] !== 2 && !cutsCorner) {
          const isTurn = curr.dir !== null && curr.dir !== i

          const dist = isDiagonal ? 1.414 : 1
          const penalty = isTurn ? 0.1 : 0
          const clearancePenalty = grid[nextR][nextC] === 1 ? 0.3 : 0
          const newCost = curr.cost + dist + penalty + clearancePenalty

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

  if (!foundTarget) return []
  return [
    [doorColumn * 100, doorRow * 100],
    ...reconstructedPath.map(([r, c]) => [(c + 0.5) * dx * 100, (r + 0.5) * dy * 100]),
  ]
}
