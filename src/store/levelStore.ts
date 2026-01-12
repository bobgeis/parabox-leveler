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
  createBox,
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

  // Clipboard for cut/copy/paste
  clipboard: LevelObject | null

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
  // Modal open state (suspends keyboard shortcuts)
  modalOpen: boolean
}

// Create the state
const initialState: EditorState = {
  level: createDefaultLevel(),
  selectedPath: null,
  selectedObject: null,
  selectedPosition: { x: 0, y: 0 },  // Default to origin
  editingBlockId: 0,
  tool: 'select',
  floorToolType: 'Button',
  refToolIsExit: false,
  refToolTargetId: 0,
  clipboard: null,
  modalOpen: false,
}

// Main state proxy
export const state = proxy<EditorState>(initialState)

// Custom undo/redo history with selection state
interface HistoryEntry {
  level: Level
  editingBlockId: number
  selectedPath: number[] | null
  selectedPosition: { x: number; y: number } | null
}

interface HistoryState {
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]
}

export const historyState = proxy<HistoryState>({
  undoStack: [],
  redoStack: [],
})

// Save current level and selection state to undo stack (call before mutations)
function saveToHistory() {
  const entry: HistoryEntry = {
    level: JSON.parse(JSON.stringify(snapshot(state).level)) as Level,
    editingBlockId: state.editingBlockId,
    selectedPath: state.selectedPath ? [...state.selectedPath] : null,
    selectedPosition: state.selectedPosition ? { ...state.selectedPosition } : null,
  }
  historyState.undoStack.push(entry)
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
    const currentEntry: HistoryEntry = {
      level: JSON.parse(JSON.stringify(snapshot(state).level)) as Level,
      editingBlockId: state.editingBlockId,
      selectedPath: state.selectedPath ? [...state.selectedPath] : null,
      selectedPosition: state.selectedPosition ? { ...state.selectedPosition } : null,
    }
    historyState.redoStack.push(currentEntry)
    // Restore previous state
    const previousEntry = historyState.undoStack.pop()!
    state.level = previousEntry.level
    state.editingBlockId = previousEntry.editingBlockId
    state.selectedPath = previousEntry.selectedPath
    state.selectedPosition = previousEntry.selectedPosition
    // Update selectedObject based on restored path
    if (previousEntry.selectedPath && previousEntry.selectedPath.length > 0) {
      const block = findBlockById(state.level, state.editingBlockId) ?? state.level.root
      state.selectedObject = block.children[previousEntry.selectedPath[0]] ?? null
    } else {
      state.selectedObject = null
    }
  },

  redo: () => {
    if (historyState.redoStack.length === 0) return
    // Save current state to undo stack
    const currentEntry: HistoryEntry = {
      level: JSON.parse(JSON.stringify(snapshot(state).level)) as Level,
      editingBlockId: state.editingBlockId,
      selectedPath: state.selectedPath ? [...state.selectedPath] : null,
      selectedPosition: state.selectedPosition ? { ...state.selectedPosition } : null,
    }
    historyState.undoStack.push(currentEntry)
    // Restore next state
    const nextEntry = historyState.redoStack.pop()!
    state.level = nextEntry.level
    state.editingBlockId = nextEntry.editingBlockId
    state.selectedPath = nextEntry.selectedPath
    state.selectedPosition = nextEntry.selectedPosition
    // Update selectedObject based on restored path
    if (nextEntry.selectedPath && nextEntry.selectedPath.length > 0) {
      const block = findBlockById(state.level, state.editingBlockId) ?? state.level.root
      state.selectedObject = block.children[nextEntry.selectedPath[0]] ?? null
    } else {
      state.selectedObject = null
    }
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

  setModalOpen: (open: boolean) => {
    state.modalOpen = open
  },

  // Navigation
  enterBlock: (blockId: number) => {
    const block = findBlockById(state.level, blockId)
    if (block) {
      state.editingBlockId = blockId
      state.selectedPath = null
      state.selectedObject = null
      state.selectedPosition = { x: 0, y: 0 }  // Select origin when entering
    }
  },

  // Enter block from tree - show block properties, no internal selection
  enterBlockFromTree: (blockId: number) => {
    const block = findBlockById(state.level, blockId)
    if (block) {
      state.editingBlockId = blockId
      state.selectedPath = null
      state.selectedObject = block  // Select the block itself to show properties
      state.selectedPosition = null
    }
  },

  // Header property updates
  updateHeaderProperty: (key: string, value: unknown) => {
    (state.level.header as unknown as Record<string, unknown>)[key] = value
  },

  exitToParent: () => {
    if (state.editingBlockId === 0) return

    const exitingBlockId = state.editingBlockId

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
      // Select the block we just exited from
      const exitedBlockIndex = parent.children.findIndex(
        (child) => child.type === 'Block' && child.id === exitingBlockId
      )
      if (exitedBlockIndex >= 0) {
        state.selectedPath = [exitedBlockIndex]
        state.selectedObject = parent.children[exitedBlockIndex]
        state.selectedPosition = null
      } else {
        state.selectedPath = null
        state.selectedObject = null
        state.selectedPosition = { x: 0, y: 0 }
      }
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
  createObjectAtPosition: (type: 'box' | 'block' | 'wall' | 'floor' | 'ref') => {
    if (!state.selectedPosition) return

    saveToHistory()  // Save before mutation

    const { x, y } = state.selectedPosition
    const block = getEditingBlock()

    switch (type) {
      case 'box': {
        const id = getNextBlockId(state.level)
        const newBox = createBox(id, x, y)
        block.children.push(newBox)
        break
      }
      case 'block': {
        const id = getNextBlockId(state.level)
        const newBlock = createBlock(id, x, y, 3, 3, { fillwithwalls: 0 })
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
    if (!state.selectedPath || state.selectedPath.length === 0 || !state.selectedObject) return

    saveToHistory()  // Save before mutation

    // Save position before deleting
    const { x, y } = state.selectedObject

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

    // Keep selection on same square
    state.selectedPath = null
    state.selectedObject = null
    state.selectedPosition = { x, y }
  },

  moveSelected: (dx: number, dy: number) => {
    if (!state.selectedObject) return
    state.selectedObject.x += dx
    state.selectedObject.y += dy
  },

  moveSelectedWithHistory: (dx: number, dy: number) => {
    if (!state.selectedObject) return
    saveToHistory()
    state.selectedObject.x += dx
    state.selectedObject.y += dy
  },

  // Update object properties
  updateSelectedProperty: (key: string, value: unknown) => {
    if (!state.selectedObject) return
    ;(state.selectedObject as unknown as Record<string, unknown>)[key] = value
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
    ;(block as unknown as Record<string, unknown>)[key] = value
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

  // Clipboard operations
  copySelected: () => {
    if (!state.selectedObject) return
    // Deep clone the object
    state.clipboard = JSON.parse(JSON.stringify(state.selectedObject))
  },

  cutSelected: () => {
    if (!state.selectedObject || !state.selectedPath) return
    saveToHistory()

    // Save position before deleting
    const { x, y } = state.selectedObject

    // Deep clone before deleting
    state.clipboard = JSON.parse(JSON.stringify(state.selectedObject))
    // Delete the object
    const block = getEditingBlock()
    const path = state.selectedPath
    if (path.length === 1) {
      block.children.splice(path[0], 1)
    }

    // Keep selection on same square
    state.selectedPath = null
    state.selectedObject = null
    state.selectedPosition = { x, y }
  },

  paste: () => {
    if (!state.clipboard) return
    // Determine position to paste at
    let x: number, y: number
    if (state.selectedPosition) {
      x = state.selectedPosition.x
      y = state.selectedPosition.y
    } else if (state.selectedObject) {
      x = state.selectedObject.x
      y = state.selectedObject.y
    } else {
      return
    }

    const block = getEditingBlock()

    // Match drag-paste rules: don't paste into occupied cells (except Floor onto empty-floor)
    const existingAtPos = block.children.filter((obj) => obj.x === x && obj.y === y)
    const hasNonFloor = existingAtPos.some((obj) => obj.type !== 'Floor')
    const hasFloor = existingAtPos.some((obj) => obj.type === 'Floor')

    if (state.clipboard.type === 'Floor') {
      if (hasFloor) return
    } else {
      if (hasNonFloor) return
    }

    saveToHistory()

    // Deep clone the clipboard
    const pasted = JSON.parse(JSON.stringify(state.clipboard)) as LevelObject
    pasted.x = x
    pasted.y = y

    // If it's a Block, reassign IDs
    if (pasted.type === 'Block') {
      reassignBlockIds(pasted, state.level)
    }

    block.children.push(pasted)

    // Select the pasted object
    const idx = block.children.length - 1
    state.selectedPath = [idx]
    state.selectedObject = block.children[idx]
    state.selectedPosition = null
  },

  // Quick place object at selected position
  placeObjectAtSelection: (type: 'box' | 'block' | 'wall' | 'floor' | 'ref') => {
    // Get position from selection or selectedPosition
    let x: number, y: number
    if (state.selectedPosition) {
      x = state.selectedPosition.x
      y = state.selectedPosition.y
    } else if (state.selectedObject) {
      x = state.selectedObject.x
      y = state.selectedObject.y
    } else {
      return
    }

    const block = getEditingBlock()

    // Check for existing objects
    const existingAtPos = block.children.filter((obj) => obj.x === x && obj.y === y)
    const hasNonFloor = existingAtPos.some((obj) => obj.type !== 'Floor')
    const hasFloor = existingAtPos.some((obj) => obj.type === 'Floor')

    if (type === 'floor' && hasFloor) return
    if (type !== 'floor' && hasNonFloor) return

    saveToHistory()

    let newObj: LevelObject
    switch (type) {
      case 'box': {
        const id = getNextBlockId(state.level)
        newObj = createBox(id, x, y)
        break
      }
      case 'block': {
        const id = getNextBlockId(state.level)
        newObj = createBlock(id, x, y, 3, 3, { fillwithwalls: 0 })
        break
      }
      case 'wall':
        newObj = createWall(x, y)
        break
      case 'floor':
        newObj = createFloor(x, y, state.floorToolType)
        break
      case 'ref':
        newObj = createRef(x, y, state.refToolTargetId, state.refToolIsExit)
        break
    }

    block.children.push(newObj)

    // Select the new object
    const idx = block.children.length - 1
    state.selectedPath = [idx]
    state.selectedObject = block.children[idx]
    state.selectedPosition = null
  },

  // Place object at specific x,y position (for drag-to-create)
  placeObjectAtPositionXY: (x: number, y: number, type: 'box' | 'block' | 'wall' | 'floor' | 'ref', saveHistory: boolean = true) => {
    const block = getEditingBlock()

    // Check for existing objects
    const existingAtPos = block.children.filter((obj) => obj.x === x && obj.y === y)
    const hasNonFloor = existingAtPos.some((obj) => obj.type !== 'Floor')
    const hasFloor = existingAtPos.some((obj) => obj.type === 'Floor')

    if (type === 'floor' && hasFloor) return
    if (type !== 'floor' && hasNonFloor) return

    if (saveHistory) {
      saveToHistory()
    }

    let newObj: LevelObject
    switch (type) {
      case 'box': {
        const id = getNextBlockId(state.level)
        newObj = createBox(id, x, y)
        break
      }
      case 'block': {
        const id = getNextBlockId(state.level)
        newObj = createBlock(id, x, y, 3, 3, { fillwithwalls: 0 })
        break
      }
      case 'wall':
        newObj = createWall(x, y)
        break
      case 'floor':
        newObj = createFloor(x, y, state.floorToolType)
        break
      case 'ref':
        newObj = createRef(x, y, state.refToolTargetId, state.refToolIsExit)
        break
    }

    block.children.push(newObj)
  },

  // Delete object at specific x,y position (for drag-to-delete)
  deleteAtPositionXY: (x: number, y: number, saveHistory: boolean = true) => {
    const block = getEditingBlock()
    const idx = block.children.findIndex((obj) => obj.x === x && obj.y === y && obj.type !== 'Floor')
    if (idx < 0) return

    if (saveHistory) {
      saveToHistory()
    }

    block.children.splice(idx, 1)
  },

  // Paste clipboard at specific x,y position (for drag-to-paste)
  pasteAtPositionXY: (x: number, y: number, saveHistory: boolean = true) => {
    if (!state.clipboard) return

    const block = getEditingBlock()

    // Check for existing non-Floor objects
    const existingAtPos = block.children.filter((obj) => obj.x === x && obj.y === y)
    const hasNonFloor = existingAtPos.some((obj) => obj.type !== 'Floor')
    if (hasNonFloor && state.clipboard.type !== 'Floor') return

    if (saveHistory) {
      saveToHistory()
    }

    const pasted = JSON.parse(JSON.stringify(state.clipboard)) as LevelObject
    pasted.x = x
    pasted.y = y

    if (pasted.type === 'Block') {
      reassignBlockIds(pasted, state.level)
    }

    block.children.push(pasted)
  },
}

// Helper to reassign Block IDs to avoid conflicts
function reassignBlockIds(obj: LevelObject, level: Level) {
  if (obj.type !== 'Block') return

  // When pasting, all Blocks in the pasted subtree must get fresh unique IDs,
  // including nested Blocks. Additionally, any Ref inside the pasted subtree
  // that targets a remapped Block ID should be updated to the new ID.
  const idMap = new Map<number, number>()
  let nextId = getNextBlockId(level)

  function remapBlocks(block: LevelObject) {
    if (block.type !== 'Block') return
    const oldId = block.id
    const newId = nextId++
    idMap.set(oldId, newId)
    block.id = newId
    for (const child of block.children) {
      remapBlocks(child)
    }
  }

  function remapRefs(node: LevelObject) {
    if (node.type === 'Ref') {
      const mapped = idMap.get(node.id)
      if (mapped !== undefined) {
        node.id = mapped
      }
      return
    }
    if (node.type === 'Block') {
      for (const child of node.children) {
        remapRefs(child)
      }
    }
  }

  remapBlocks(obj)
  remapRefs(obj)
}

// Validation helpers
export function validateLevel(): string[] {
  const warnings: string[] = []
  const level = state.level

  // Check for at least one player
  let hasPlayer = false
  let hasPlayerButton = false

  // Collect all Block IDs and Ref targets
  const blockIds = new Set<number>()
  const refTargets: { target: number; location: string }[] = []

  function checkObjects(obj: LevelObject, path: string) {
    if (obj.type === 'Block') {
      blockIds.add(obj.id)
      if (obj.player === 1) hasPlayer = true
      // Check for Box (fillwithwalls=1) with children
      if (obj.fillwithwalls === 1 && obj.children.length > 0) {
        warnings.push(`${path}Block ${obj.id} is a Box (fillwithwalls=1) but has children`)
      }
      obj.children.forEach((child) => checkObjects(child, `${path}Block ${obj.id} > `))
    } else if (obj.type === 'Floor' && obj.floorType === 'PlayerButton') {
      hasPlayerButton = true
    } else if (obj.type === 'Ref') {
      refTargets.push({ target: obj.id, location: `${path}Ref at (${obj.x},${obj.y})` })
    }
  }

  checkObjects(level.root, '')

  if (!hasPlayer) {
    warnings.push('Level has no player block (a block with player=1)')
  }

  if (!hasPlayerButton) {
    warnings.push('Level has no PlayerButton (goal)')
  }

  // Check for orphaned Refs (pointing to non-existent Blocks)
  for (const ref of refTargets) {
    if (!blockIds.has(ref.target)) {
      warnings.push(`${ref.location} references non-existent Block ${ref.target}`)
    }
  }

  return warnings
}

// Get all blocks for ref target selection (excludes boxes/fillwithwalls=1)
export function getAllBlocks(): { id: number; label: string }[] {
  const blocks: { id: number; label: string }[] = []

  function collect(obj: LevelObject, path: string) {
    if (obj.type === 'Block') {
      // Only include blocks that are not boxes (fillwithwalls !== 1)
      if (obj.fillwithwalls !== 1) {
        blocks.push({
          id: obj.id,
          label: `${path}Block ${obj.id} (${obj.width}×${obj.height})`,
        })
      }
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
