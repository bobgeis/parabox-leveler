/**
 * Valtio state store for level editing with undo/redo support
 */

import { proxy, snapshot } from 'valtio'
import type { Level, LevelObject, Block } from '@/types/level'
import {
  createDefaultLevel,
  getNextBlockId,
  findBlockById,
  createBlock,
  createWall,
  createFloor,
  createRef,
} from '@/types/level'
import { parseLevel } from '@/lib/parser'
import { serializeLevel } from '@/lib/serializer'

export type Tool = 'select' | 'block' | 'wall' | 'floor' | 'ref'
export type FloorToolType = 'Button' | 'PlayerButton'

interface EditorState {
  // The level being edited
  level: Level

  // Currently selected object path (array of indices from root)
  selectedPath: number[] | null

  // Currently selected object (derived, but stored for convenience)
  selectedObject: LevelObject | null

  // Selected empty cell position (when no object is selected)
  selectedPosition: { x: number; y: number } | null

  // The block currently being edited (viewing its interior)
  editingBlockId: number

  // Current tool
  tool: Tool

  // Floor type for floor tool
  floorToolType: FloorToolType

  // Whether ref tool creates exit (true) or clone (false)
  refToolIsExit: boolean

  // Target block ID for ref tool
  refToolTargetId: number
}

// Create the state
const initialState: EditorState = {
  level: createDefaultLevel(),
  selectedPath: null,
  selectedObject: null,
  selectedPosition: null,
  editingBlockId: 0,
  tool: 'select',
  floorToolType: 'PlayerButton',
  refToolIsExit: true,
  refToolTargetId: 0,
}

// Main state proxy
export const state = proxy<EditorState>(initialState)

// Custom undo/redo history
interface HistoryState {
  undoStack: Level[]
  redoStack: Level[]
}

export const historyState = proxy<HistoryState>({
  undoStack: [],
  redoStack: [],
})

// Save current level state to undo stack (call before mutations)
function saveToHistory() {
  const levelSnapshot = JSON.parse(JSON.stringify(snapshot(state).level)) as Level
  historyState.undoStack.push(levelSnapshot)
  // Clear redo stack when new action is taken
  historyState.redoStack = []
  // Limit history size
  if (historyState.undoStack.length > 50) {
    historyState.undoStack.shift()
  }
}

// Get the block currently being edited
export function getEditingBlock(): Block {
  return findBlockById(state.level, state.editingBlockId) ?? state.level.root
}

// Actions
export const actions = {
  // Undo/Redo
  undo: () => {
    if (historyState.undoStack.length === 0) return
    // Save current state to redo stack
    const currentLevel = JSON.parse(JSON.stringify(snapshot(state).level)) as Level
    historyState.redoStack.push(currentLevel)
    // Restore previous state
    const previousLevel = historyState.undoStack.pop()!
    state.level = previousLevel
    state.selectedPath = null
    state.selectedObject = null
    state.selectedPosition = null
  },

  redo: () => {
    if (historyState.redoStack.length === 0) return
    // Save current state to undo stack
    const currentLevel = JSON.parse(JSON.stringify(snapshot(state).level)) as Level
    historyState.undoStack.push(currentLevel)
    // Restore next state
    const nextLevel = historyState.redoStack.pop()!
    state.level = nextLevel
    state.selectedPath = null
    state.selectedObject = null
    state.selectedPosition = null
  },

  // Level management
  newLevel: () => {
    state.level = createDefaultLevel()
    state.selectedPath = null
    state.selectedObject = null
    state.editingBlockId = 0
  },

  importLevel: (text: string) => {
    try {
      const level = parseLevel(text)
      state.level = level
      state.selectedPath = null
      state.selectedObject = null
      state.editingBlockId = 0
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },

  exportLevel: (): string => {
    return serializeLevel(state.level)
  },

  // Tool selection
  setTool: (tool: Tool) => {
    state.tool = tool
  },

  setFloorToolType: (type: FloorToolType) => {
    state.floorToolType = type
  },

  setRefToolIsExit: (isExit: boolean) => {
    state.refToolIsExit = isExit
  },

  setRefToolTargetId: (id: number) => {
    state.refToolTargetId = id
  },

  // Navigation
  enterBlock: (blockId: number) => {
    const block = findBlockById(state.level, blockId)
    if (block) {
      state.editingBlockId = blockId
      state.selectedPath = null
      state.selectedObject = null
    }
  },

  exitToParent: () => {
    if (state.editingBlockId === 0) return

    // Find parent block
    function findParent(obj: LevelObject, targetId: number): Block | null {
      if (obj.type === 'Block') {
        for (const child of obj.children) {
          if (child.type === 'Block' && child.id === targetId) {
            return obj
          }
          const found = findParent(child, targetId)
          if (found) return found
        }
      }
      return null
    }

    const parent = findParent(state.level.root, state.editingBlockId)
    if (parent) {
      state.editingBlockId = parent.id
      state.selectedPath = null
      state.selectedObject = null
    }
  },

  // Selection
  selectObject: (path: number[] | null) => {
    state.selectedPath = path
    state.selectedPosition = null  // Clear empty position selection
    if (path === null) {
      state.selectedObject = null
      return
    }

    // Navigate to the object
    let current: LevelObject = getEditingBlock()
    for (const index of path) {
      if (current.type === 'Block' && current.children[index]) {
        current = current.children[index]
      } else {
        state.selectedObject = null
        return
      }
    }
    state.selectedObject = current
  },

  clearSelection: () => {
    state.selectedPath = null
    state.selectedObject = null
    state.selectedPosition = null
  },

  // Select an empty position (no object there)
  selectPosition: (x: number, y: number) => {
    state.selectedPath = null
    state.selectedObject = null
    state.selectedPosition = { x, y }
  },

  // Create object at selected position
  createObjectAtPosition: (type: 'block' | 'wall' | 'floor' | 'ref') => {
    if (!state.selectedPosition) return

    saveToHistory()  // Save before mutation

    const { x, y } = state.selectedPosition
    const block = getEditingBlock()

    switch (type) {
      case 'block': {
        const id = getNextBlockId(state.level)
        const newBlock = createBlock(id, x, y, 3, 3)
        block.children.push(newBlock)
        break
      }
      case 'wall': {
        const wall = createWall(x, y)
        block.children.push(wall)
        break
      }
      case 'floor': {
        const floor = createFloor(x, y, state.floorToolType)
        block.children.push(floor)
        break
      }
      case 'ref': {
        const ref = createRef(x, y, state.refToolTargetId, state.refToolIsExit)
        block.children.push(ref)
        break
      }
    }

    // Select the newly created object
    const idx = block.children.length - 1
    state.selectedPath = [idx]
    state.selectedObject = block.children[idx]
    state.selectedPosition = null
  },

  // Object manipulation
  addObject: (x: number, y: number) => {
    const block = getEditingBlock()
    const tool = state.tool

    // Check what's already at this position
    const existingAtPos = block.children.filter((obj) => obj.x === x && obj.y === y)

    // Floor can coexist with Block/Ref (block can start on a button)
    // But otherwise, don't allow multiple objects at same position
    const hasNonFloor = existingAtPos.some((obj) => obj.type !== 'Floor')
    const hasFloor = existingAtPos.some((obj) => obj.type === 'Floor')

    // If placing a floor and there's already a floor, don't allow
    if (tool === 'floor' && hasFloor) return

    // If placing non-floor and there's already a non-floor object, don't allow
    if (tool !== 'floor' && hasNonFloor) return

    saveToHistory()  // Save before mutation

    switch (tool) {
      case 'block': {
        const id = getNextBlockId(state.level)
        const newBlock = createBlock(id, x, y, 3, 3)
        block.children.push(newBlock)
        break
      }
      case 'wall': {
        const wall = createWall(x, y)
        block.children.push(wall)
        break
      }
      case 'floor': {
        const floor = createFloor(x, y, state.floorToolType)
        block.children.push(floor)
        break
      }
      case 'ref': {
        const ref = createRef(x, y, state.refToolTargetId, state.refToolIsExit)
        block.children.push(ref)
        break
      }
    }
  },

  deleteSelected: () => {
    if (!state.selectedPath || state.selectedPath.length === 0) return

    saveToHistory()  // Save before mutation

    const block = getEditingBlock()
    const path = state.selectedPath

    if (path.length === 1) {
      block.children.splice(path[0], 1)
    } else {
      // Navigate to parent and delete
      let parent: Block = block
      for (let i = 0; i < path.length - 1; i++) {
        const child = parent.children[path[i]]
        if (child.type === 'Block') {
          parent = child
        }
      }
      parent.children.splice(path[path.length - 1], 1)
    }

    state.selectedPath = null
    state.selectedObject = null
  },

  moveSelected: (dx: number, dy: number) => {
    if (!state.selectedObject) return
    state.selectedObject.x += dx
    state.selectedObject.y += dy
  },

  // Update object properties
  updateSelectedProperty: (key: string, value: unknown) => {
    if (!state.selectedObject) return
    ;(state.selectedObject as Record<string, unknown>)[key] = value
  },

  // Block-specific updates
  updateBlockSize: (width: number, height: number) => {
    if (state.selectedObject?.type === 'Block') {
      state.selectedObject.width = width
      state.selectedObject.height = height
    }
  },

  updateBlockColor: (hue: number, sat: number, val: number) => {
    if (state.selectedObject?.type === 'Block') {
      state.selectedObject.hue = hue
      state.selectedObject.sat = sat
      state.selectedObject.val = val
    }
  },

  // Update editing block size
  updateEditingBlockSize: (width: number, height: number) => {
    const block = getEditingBlock()
    block.width = width
    block.height = height
  },

  // Update editing block property
  updateEditingBlockProperty: (key: string, value: unknown) => {
    const block = getEditingBlock()
    ;(block as Record<string, unknown>)[key] = value
  },

  // Update editing block color
  updateEditingBlockColor: (hue: number, sat: number, val: number) => {
    const block = getEditingBlock()
    block.hue = hue
    block.sat = sat
    block.val = val
  },

  // Header updates
  updateHeader: (updates: Partial<Level['header']>) => {
    Object.assign(state.level.header, updates)
  },
}

// Validation helpers
export function validateLevel(): string[] {
  const warnings: string[] = []
  const level = state.level

  // Check for at least one player
  let hasPlayer = false
  let hasPlayerButton = false

  function checkObjects(obj: LevelObject) {
    if (obj.type === 'Block') {
      if (obj.player === 1) hasPlayer = true
      obj.children.forEach(checkObjects)
    } else if (obj.type === 'Floor' && obj.floorType === 'PlayerButton') {
      hasPlayerButton = true
    }
  }

  checkObjects(level.root)

  if (!hasPlayer) {
    warnings.push('Level has no player block (a block with player=1)')
  }

  if (!hasPlayerButton) {
    warnings.push('Level has no PlayerButton (goal)')
  }

  return warnings
}

// Get all blocks for ref target selection
export function getAllBlocks(): { id: number; label: string }[] {
  const blocks: { id: number; label: string }[] = []

  function collect(obj: LevelObject, path: string) {
    if (obj.type === 'Block') {
      blocks.push({
        id: obj.id,
        label: `${path}Block ${obj.id} (${obj.width}×${obj.height})`,
      })
      obj.children.forEach((child) => {
        if (child.type === 'Block') {
          collect(child, path + '  ')
        }
      })
    }
  }

  collect(state.level.root, '')
  return blocks
}

// Re-export for convenience
export { findBlockById } from '@/types/level'
