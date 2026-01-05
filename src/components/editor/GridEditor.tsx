/**
 * Grid Editor - Main visual editing area for placing objects
 */

import { useEffect } from 'react'
import { useSnapshot } from 'valtio'
import { state, actions, findBlockById } from '@/store/levelStore'
import type { Level, LevelObject } from '@/types/level'
import { cn } from '@/lib/utils'

// Convert HSV to CSS color
function hsvToColor(h: number, s: number, v: number, alpha: number = 1): string {
  const c = v * s
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
  const m = v - c

  let r = 0,
    g = 0,
    b = 0
  const hue = h * 6

  if (hue < 1) {
    r = c
    g = x
  } else if (hue < 2) {
    r = x
    g = c
  } else if (hue < 3) {
    g = c
    b = x
  } else if (hue < 4) {
    g = x
    b = c
  } else if (hue < 5) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  const toHex = (val: number) =>
    Math.round((val + m) * 255)
      .toString(16)
      .padStart(2, '0')

  if (alpha < 1) {
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

interface GridCellProps {
  x: number
  y: number
  objects: LevelObject[]
  isSelected: boolean
  onClick: () => void
  onDoubleClick: () => void
}

function GridCell({ x, y, objects, isSelected, onClick, onDoubleClick }: GridCellProps) {
  // Find what's at this cell
  const objectsAtCell = objects.filter((obj) => obj.x === x && obj.y === y)

  // Determine cell appearance
  let bgColor = 'bg-muted/30'
  let content: React.ReactNode = null
  let borderStyle = ''

  for (const obj of objectsAtCell) {
    if (obj.type === 'Wall') {
      bgColor = 'bg-slate-700'
    } else if (obj.type === 'Floor') {
      bgColor = obj.floorType === 'PlayerButton' ? 'bg-yellow-500/50' : 'bg-green-500/50'
      content = (
        <span className="text-[8px] font-bold text-center">
          {obj.floorType === 'PlayerButton' ? 'PB' : 'B'}
        </span>
      )
    } else if (obj.type === 'Block') {
      const color = hsvToColor(obj.hue, obj.sat, obj.val)
      const darkerColor = hsvToColor(obj.hue, obj.sat, obj.val * 0.6)
      borderStyle = `border-2 border-solid`

      // Render children inside the block as a mini preview
      const hasChildren = obj.children && obj.children.length > 0
      content = (
        <div
          className="absolute inset-0.5 rounded-sm flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: color }}
        >
          {hasChildren ? (
            <div
              className="absolute inset-1 grid"
              style={{
                gridTemplateColumns: `repeat(${obj.width}, 1fr)`,
                gridTemplateRows: `repeat(${obj.height}, 1fr)`,
                backgroundColor: darkerColor,
                borderRadius: '2px',
              }}
            >
              {/* Render mini children */}
              {Array.from({ length: obj.height }).map((_, row) =>
                Array.from({ length: obj.width }).map((_, col) => {
                  const cellY = obj.height - 1 - row // Flip Y
                  const cellX = col
                  const childrenAtCell = obj.children.filter(
                    (c) => c.x === cellX && c.y === cellY
                  )
                  let cellColor = 'transparent'
                  for (const child of childrenAtCell) {
                    if (child.type === 'Wall') {
                      cellColor = '#334155' // slate-700
                    } else if (child.type === 'Block') {
                      cellColor = hsvToColor(child.hue, child.sat, child.val)
                    } else if (child.type === 'Floor') {
                      cellColor = child.floorType === 'PlayerButton' ? '#eab30880' : '#22c55e80'
                    } else if (child.type === 'Ref') {
                      cellColor = '#3b82f680'
                    }
                  }
                  return (
                    <div
                      key={`${cellX}-${cellY}`}
                      style={{ backgroundColor: cellColor }}
                    />
                  )
                })
              )}
            </div>
          ) : (
            <span className="text-[10px] font-bold">
              {obj.player ? '👤' : obj.id}
            </span>
          )}
          {/* Always show ID/player indicator */}
          {hasChildren && (
            <span className="absolute bottom-0 right-0.5 text-[8px] font-bold text-white/80 drop-shadow">
              {obj.player ? '👤' : obj.id}
            </span>
          )}
        </div>
      )
    } else if (obj.type === 'Ref') {
      const alpha = obj.exitblock === 1 ? 0.8 : 0.4
      borderStyle = `border-2 border-dashed`
      content = (
        <div
          className={cn(
            'absolute inset-0.5 rounded-sm flex items-center justify-center text-[10px] font-bold border-2 border-dashed',
            obj.exitblock === 1 ? 'border-blue-500' : 'border-blue-300'
          )}
          style={{ opacity: alpha }}
        >
          →{obj.id}
        </div>
      )
    }
  }

  return (
    <div
      className={cn(
        'relative aspect-square border border-border/50 cursor-pointer transition-colors',
        bgColor,
        borderStyle,
        isSelected && 'ring-2 ring-primary ring-offset-1'
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {content}
      <span className="absolute bottom-0 right-0.5 text-[8px] text-muted-foreground/50">
        {x},{y}
      </span>
    </div>
  )
}

export function GridEditor() {
  const snap = useSnapshot(state)

  // Find editing block from snapshot (reactive)
  // Cast to Level to work with findBlockById, then cast children for iteration
  const editingBlock = findBlockById(snap.level as Level, snap.editingBlockId) ?? snap.level.root
  const children = editingBlock.children as readonly LevelObject[]

  const { width, height } = editingBlock

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const block = findBlockById(state.level, state.editingBlockId) ?? state.level.root
      const selectedPath = state.selectedPath
      const selectedObj = selectedPath && selectedPath.length > 0
        ? block.children[selectedPath[0]]
        : null

      // Get current position (from selected object or selected position)
      const selectedPos = state.selectedPosition
      const currentX = selectedObj?.x ?? selectedPos?.x ?? 0
      const currentY = selectedObj?.y ?? selectedPos?.y ?? 0

      // Helper to select object at position or empty position
      const selectAtPosition = (x: number, y: number) => {
        const idx = block.children.findIndex((obj) => obj.x === x && obj.y === y)
        if (idx >= 0) {
          actions.selectObject([idx])
        } else {
          actions.selectPosition(x, y)
        }
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault()
          if (selectedObj || selectedPos) {
            const newY = Math.min(currentY + 1, block.height - 1)
            selectAtPosition(currentX, newY)
          }
          break

        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault()
          if (selectedObj || selectedPos) {
            const newY = Math.max(currentY - 1, 0)
            selectAtPosition(currentX, newY)
          }
          break

        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault()
          if (selectedObj || selectedPos) {
            const newX = Math.max(currentX - 1, 0)
            selectAtPosition(newX, currentY)
          }
          break

        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault()
          if (selectedObj || selectedPos) {
            const newX = Math.min(currentX + 1, block.width - 1)
            selectAtPosition(newX, currentY)
          }
          break

        case 'Backspace':
        case 'Delete':
          e.preventDefault()
          if (selectedObj) {
            actions.deleteSelected()
          }
          break

        case 'Enter':
          e.preventDefault()
          if (selectedObj && selectedObj.type === 'Block') {
            actions.enterBlock(selectedObj.id)
          }
          break

        case 'Escape':
          e.preventDefault()
          if (state.editingBlockId !== 0) {
            actions.exitToParent()
          } else {
            actions.clearSelection()
          }
          break

        case 'z':
        case 'Z':
          e.preventDefault()
          if (e.shiftKey) {
            actions.redo()
          } else {
            actions.undo()
          }
          break

        // Quick place objects with number keys
        case '1':
          e.preventDefault()
          actions.placeObjectAtSelection('block')
          break
        case '2':
          e.preventDefault()
          actions.placeObjectAtSelection('wall')
          break
        case '3':
          e.preventDefault()
          actions.placeObjectAtSelection('floor')
          break
        case '4':
          e.preventDefault()
          actions.placeObjectAtSelection('ref')
          break

        // Clipboard operations
        case 'x':
        case 'X':
          e.preventDefault()
          actions.cutSelected()
          break
        case 'c':
        case 'C':
          e.preventDefault()
          actions.copySelected()
          break
        case 'v':
        case 'V':
          e.preventDefault()
          actions.paste()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle cell click - read state.tool directly to avoid stale closure
  const handleCellClick = (x: number, y: number) => {
    if (state.tool === 'select') {
      // Find object at this position and select it, or select empty position
      const block = findBlockById(state.level, state.editingBlockId) ?? state.level.root
      const idx = block.children.findIndex((obj) => obj.x === x && obj.y === y)
      if (idx >= 0) {
        actions.selectObject([idx])
      } else {
        // Select empty position instead of clearing
        actions.selectPosition(x, y)
      }
    } else {
      // Add object with current tool
      actions.addObject(x, y)
    }
  }

  // Handle double-click to enter block
  const handleCellDoubleClick = (x: number, y: number) => {
    const obj = children.find((o) => o.x === x && o.y === y && o.type === 'Block')
    if (obj && obj.type === 'Block') {
      actions.enterBlock(obj.id)
    }
  }

  // Check if cell at position is selected (object or empty position)
  const isCellSelected = (x: number, y: number) => {
    // Check if an object at this position is selected
    if (snap.selectedPath && snap.selectedPath.length > 0) {
      const idx = snap.selectedPath[0]
      const obj = children[idx]
      if (obj && obj.x === x && obj.y === y) return true
    }
    // Check if this empty position is selected
    if (snap.selectedPosition && snap.selectedPosition.x === x && snap.selectedPosition.y === y) {
      return true
    }
    return false
  }

  // Create grid cells (y reversed so y=0 is at bottom)
  const cells = []
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      cells.push(
        <GridCell
          key={`${x}-${y}`}
          x={x}
          y={y}
          objects={editingBlock.children as LevelObject[]}
          isSelected={isCellSelected(x, y)}
          onClick={() => handleCellClick(x, y)}
          onDoubleClick={() => handleCellDoubleClick(x, y)}
        />
      )
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-background">
      <div className="mb-2 text-sm text-muted-foreground">
        Editing: Block {editingBlock.id} ({width}×{height})
        {editingBlock.id !== 0 && (
          <button
            className="ml-2 text-primary underline"
            onClick={() => actions.exitToParent()}
          >
            ← Exit to parent
          </button>
        )}
      </div>
      <div
        className="grid border border-border rounded-md p-0.5"
        style={{
          gridTemplateColumns: `repeat(${width}, 56px)`,
          gridTemplateRows: `repeat(${height}, 56px)`,
        }}
      >
        {cells}
      </div>
    </div>
  )
}
