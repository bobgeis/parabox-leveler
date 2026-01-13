/**
 * Patrick's Parabox Level Data Types
 * Coordinate system: (0,0) is lower-left, Y increases upward
 */

export type FloorType = 'Button' | 'PlayerButton' | 'FastTravel' | 'Info'

export interface Floor {
  type: 'Floor'
  x: number
  y: number
  floorType: FloorType
  infoText?: string
}

export interface Wall {
  type: 'Wall'
  x: number
  y: number
  player: number
  possessable: number
  playerorder: number
}

export interface Ref {
  type: 'Ref'
  x: number
  y: number
  id: number // ID of referenced block
  exitblock: number // 1 = exit reference, 0 = clone
  infexit: number
  infexitnum: number
  infenter: number
  infenternum: number
  infenterid: number
  player: number
  possessable: number
  playerorder: number
  fliph: number
  floatinspace: number
  specialeffect: number
}

export interface Block {
  type: 'Block'
  x: number
  y: number
  id: number
  width: number
  height: number
  hue: number
  sat: number
  val: number
  zoomfactor: number
  fillwithwalls: number
  player: number
  possessable: number
  playerorder: number
  fliph: number
  floatinspace: number
  specialeffect: number
  children: LevelObject[]
}

export type LevelObject = Block | Wall | Floor | Ref

export type DrawStyle = 'tui' | 'grid' | 'oldstyle'

export interface LevelHeader {
  version: number
  comment?: string
  shed?: boolean
  innerPush?: boolean
  drawStyle?: DrawStyle
  attemptOrder?: string
  customLevelMusic?: number
  customLevelPalette?: number
}

export interface Level {
  header: LevelHeader
  root: Block
}

// Helper to create a default empty block
export function createBlock(
  id: number,
  x: number,
  y: number,
  width: number = 5,
  height: number = 5,
  options: Partial<Block> = {},
): Block {
  return {
    type: 'Block',
    x,
    y,
    id,
    width,
    height,
    hue: 0.6,
    sat: 0.8,
    val: 1,
    zoomfactor: 1,
    fillwithwalls: 1,
    player: 0,
    possessable: 0,
    playerorder: 0,
    fliph: 0,
    floatinspace: 0,
    specialeffect: 0,
    children: [],
    ...options,
  }
}

// Helper to create a player block
export function createPlayerBlock(id: number, x: number, y: number): Block {
  return createBlock(id, x, y, 1, 1, {
    hue: 0.9,
    sat: 1,
    val: 0.7,
    player: 1,
    possessable: 1,
  })
}

// Helper to create a box (block with fillwithwalls=1, brownish yellow color)
export function createBox(id: number, x: number, y: number): Block {
  return createBlock(id, x, y, 3, 3, {
    hue: 0.12,
    sat: 0.7,
    val: 0.85,
    fillwithwalls: 1,
  })
}

// Helper to create a wall
export function createWall(x: number, y: number): Wall {
  return {
    type: 'Wall',
    x,
    y,
    player: 0,
    possessable: 0,
    playerorder: 0,
  }
}

// Helper to create a floor
export function createFloor(x: number, y: number, floorType: FloorType, infoText?: string): Floor {
  return {
    type: 'Floor',
    x,
    y,
    floorType,
    infoText,
  }
}

// Helper to create a reference
export function createRef(
  x: number,
  y: number,
  targetId: number,
  isExit: boolean = true,
): Ref {
  return {
    type: 'Ref',
    x,
    y,
    id: targetId,
    exitblock: isExit ? 1 : 0,
    infexit: 0,
    infexitnum: 0,
    infenter: 0,
    infenternum: 0,
    infenterid: -1,
    player: 0,
    possessable: 0,
    playerorder: 0,
    fliph: 0,
    floatinspace: 0,
    specialeffect: 0,
  }
}

// Create a default empty level
export function createDefaultLevel(): Level {
  const root = createBlock(0, -1, -1, 5, 5, { fillwithwalls: 0 })
  const player = createPlayerBlock(1, 1, 1)
  const goal = createFloor(3, 3, 'PlayerButton')
  root.children = [player, goal]

  return {
    header: {
      version: 4,
    },
    root,
  }
}

// Get the next available block ID in a level
export function getNextBlockId(level: Level): number {
  let maxId = 0

  function findMaxId(obj: LevelObject) {
    if (obj.type === 'Block') {
      maxId = Math.max(maxId, obj.id)
      obj.children.forEach(findMaxId)
    }
  }

  findMaxId(level.root)
  return maxId + 1
}

// Find a block by ID
export function findBlockById(level: Level, id: number): Block | null {
  function search(obj: LevelObject): Block | null {
    if (obj.type === 'Block') {
      if (obj.id === id) return obj
      for (const child of obj.children) {
        const found = search(child)
        if (found) return found
      }
    }
    return null
  }
  return search(level.root)
}
