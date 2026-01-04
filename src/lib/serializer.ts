/**
 * Serializer for Patrick's Parabox level file format
 */

import type { Level, Block, Wall, Floor, Ref, LevelObject } from '@/types/level'

// Serialize a Block to its line format
function serializeBlock(block: Block): string {
  return [
    'Block',
    block.x,
    block.y,
    block.id,
    block.width,
    block.height,
    block.hue,
    block.sat,
    block.val,
    block.zoomfactor,
    block.fillwithwalls,
    block.player,
    block.possessable,
    block.playerorder,
    block.fliph,
    block.floatinspace,
    block.specialeffect,
  ].join(' ')
}

// Serialize a Wall to its line format
function serializeWall(wall: Wall): string {
  return [
    'Wall',
    wall.x,
    wall.y,
    wall.player,
    wall.possessable,
    wall.playerorder,
  ].join(' ')
}

// Serialize a Floor to its line format
function serializeFloor(floor: Floor): string {
  return ['Floor', floor.x, floor.y, floor.floorType].join(' ')
}

// Serialize a Ref to its line format
function serializeRef(ref: Ref): string {
  return [
    'Ref',
    ref.x,
    ref.y,
    ref.id,
    ref.exitblock,
    ref.infexit,
    ref.infexitnum,
    ref.infenter,
    ref.infenternum,
    ref.infenterid,
    ref.player,
    ref.possessable,
    ref.playerorder,
    ref.fliph,
    ref.floatinspace,
    ref.specialeffect,
  ].join(' ')
}

// Serialize any level object
function serializeObject(obj: LevelObject): string {
  switch (obj.type) {
    case 'Block':
      return serializeBlock(obj)
    case 'Wall':
      return serializeWall(obj)
    case 'Floor':
      return serializeFloor(obj)
    case 'Ref':
      return serializeRef(obj)
  }
}

// Recursively serialize objects with proper indentation
function serializeObjectTree(obj: LevelObject, depth: number): string[] {
  const indent = '\t'.repeat(depth)
  const lines: string[] = []

  lines.push(indent + serializeObject(obj))

  if (obj.type === 'Block') {
    for (const child of obj.children) {
      lines.push(...serializeObjectTree(child, depth + 1))
    }
  }

  return lines
}

// Main serializer function
export function serializeLevel(level: Level): string {
  const lines: string[] = []

  // Header
  lines.push(`version ${level.header.version}`)

  if (level.header.comment) {
    lines.push(`(${level.header.comment})`)
  }

  if (level.header.shed) {
    lines.push('shed')
  }

  if (level.header.innerPush) {
    lines.push('inner_push')
  }

  if (level.header.attemptOrder) {
    lines.push(`attempt_order ${level.header.attemptOrder}`)
  }

  if (level.header.customLevelMusic !== undefined) {
    lines.push(`custom_level_music ${level.header.customLevelMusic}`)
  }

  if (level.header.customLevelPalette !== undefined) {
    lines.push(`custom_level_palette ${level.header.customLevelPalette}`)
  }

  // Separator
  lines.push('#')

  // Objects
  lines.push(...serializeObjectTree(level.root, 0))

  return lines.join('\n')
}
