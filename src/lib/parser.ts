/**
 * Parser for Patrick's Parabox level file format
 */

import type {
  Level,
  LevelHeader,
  Block,
  Wall,
  Floor,
  Ref,
  LevelObject,
  FloorType,
} from '@/types/level'

// Remove comments (text in parentheses) from a line
function stripComments(line: string): string {
  // Comments are parenthesized segments that are either:
  // - the entire line (handled elsewhere for header comment lines), or
  // - preceded by whitespace (e.g. "... (comment)")
  // Parentheses that are part of a token (e.g. Info text "_ (" not present) must be preserved.
  return line.replace(/(^|\s)\([^)]*\)/g, '$1').trim()
}

// Count leading tabs to determine nesting level
function countTabs(line: string): number {
  let count = 0
  for (const char of line) {
    if (char === '\t') count++
    else break
  }
  return count
}

// Parse a Block line
function parseBlock(parts: string[]): Block {
  return {
    type: 'Block',
    x: parseFloat(parts[1]),
    y: parseFloat(parts[2]),
    id: parseInt(parts[3]),
    width: parseInt(parts[4]),
    height: parseInt(parts[5]),
    hue: parseFloat(parts[6]),
    sat: parseFloat(parts[7]),
    val: parseFloat(parts[8]),
    zoomfactor: parseFloat(parts[9]),
    fillwithwalls: parseInt(parts[10]),
    player: parseInt(parts[11]),
    possessable: parseInt(parts[12]),
    playerorder: parseInt(parts[13]),
    fliph: parseInt(parts[14]),
    floatinspace: parseInt(parts[15]),
    specialeffect: parseInt(parts[16]) || 0,
    children: [],
  }
}

// Parse a Wall line
function parseWall(parts: string[]): Wall {
  return {
    type: 'Wall',
    x: parseFloat(parts[1]),
    y: parseFloat(parts[2]),
    player: parseInt(parts[3]),
    possessable: parseInt(parts[4]),
    playerorder: parseInt(parts[5]),
  }
}

// Parse a Floor line
function parseFloor(parts: string[]): Floor {
  const floorType = parts[3] as FloorType
  let infoText: string | undefined
  if (floorType === 'Info' && parts.length > 4) {
    const encoded = parts.slice(4).join(' ')
    infoText = encoded.replace(/\\n/g, '\n').replace(/_/g, ' ')
  }
  return {
    type: 'Floor',
    x: parseFloat(parts[1]),
    y: parseFloat(parts[2]),
    floorType,
    infoText,
  }
}

// Parse a Ref line
function parseRef(parts: string[]): Ref {
  return {
    type: 'Ref',
    x: parseFloat(parts[1]),
    y: parseFloat(parts[2]),
    id: parseInt(parts[3]),
    exitblock: parseInt(parts[4]),
    infexit: parseInt(parts[5]),
    infexitnum: parseInt(parts[6]),
    infenter: parseInt(parts[7]),
    infenternum: parseInt(parts[8]),
    infenterid: parseInt(parts[9]),
    player: parseInt(parts[10]),
    possessable: parseInt(parts[11]),
    playerorder: parseInt(parts[12]),
    fliph: parseInt(parts[13]),
    floatinspace: parseInt(parts[14]),
    specialeffect: parseInt(parts[15]) || 0,
  }
}

// Parse the header section
function parseHeader(lines: string[]): LevelHeader {
  const header: LevelHeader = { version: 4 }

  for (const line of lines) {
    const stripped = stripComments(line)
    if (!stripped) {
      // Check if the original line is just a comment (for level name)
      const commentMatch = line.match(/^\(([^)]*)\)$/)
      if (commentMatch) {
        header.comment = commentMatch[1]
      }
      continue
    }

    const parts = stripped.split(/\s+/)
    const key = parts[0].toLowerCase()

    switch (key) {
      case 'version':
        header.version = parseInt(parts[1])
        break
      case 'shed':
        header.shed = true
        break
      case 'inner_push':
        header.innerPush = true
        break
      case 'attempt_order':
        header.attemptOrder = parts[1]
        break
      case 'custom_level_music':
        header.customLevelMusic = parseInt(parts[1])
        break
      case 'custom_level_palette':
        header.customLevelPalette = parseInt(parts[1])
        break
    }
  }

  return header
}

// Main parser function
export function parseLevel(text: string): Level {
  const lines = text.split('\n')

  // Find the # separator
  const separatorIndex = lines.findIndex((line) => stripComments(line) === '#')
  if (separatorIndex === -1) {
    throw new Error('Invalid level format: missing # separator')
  }

  // Parse header
  const headerLines = lines.slice(0, separatorIndex)
  const header = parseHeader(headerLines)

  // Parse objects
  const objectLines = lines.slice(separatorIndex + 1)

  // Stack to track parent blocks at each nesting level
  const stack: Block[] = []
  let root: Block | null = null

  for (const line of objectLines) {
    const stripped = stripComments(line)
    if (!stripped) continue

    const depth = countTabs(line)
    const parts = stripped.split(/\s+/)
    const objectType = parts[0]

    let obj: LevelObject

    switch (objectType) {
      case 'Block':
        obj = parseBlock(parts)
        break
      case 'Wall':
        obj = parseWall(parts)
        break
      case 'Floor':
        obj = parseFloor(parts)
        break
      case 'Ref':
        obj = parseRef(parts)
        break
      default:
        console.warn(`Unknown object type: ${objectType}`)
        continue
    }

    if (depth === 0) {
      // Root level object (should be the root Block)
      if (obj.type === 'Block') {
        root = obj
        stack.length = 0
        stack.push(obj)
      }
    } else {
      // Adjust stack to correct depth
      while (stack.length > depth) {
        stack.pop()
      }

      const parent = stack[stack.length - 1]
      if (parent) {
        parent.children.push(obj)
        if (obj.type === 'Block') {
          stack.push(obj)
        }
      }
    }
  }

  if (!root) {
    throw new Error('Invalid level format: no root block found')
  }

  return { header, root }
}
