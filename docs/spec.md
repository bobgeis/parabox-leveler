# parabox-leveler Specification

## Overview

parabox-leveler is a tool for creating levels for the steam version of Patrick's Parabox.

Patrick's Parabox is a puzzle game developed by Patrick Traynor. It is played on a 2D grid where the user views the player character from above and manipulates blocks to solve puzzles. The blocks can be pushed in four directions and sometimes entered. There are complexities and the enterable blocks can be sublevels, or references to the enclosing space creating "paradoxical" effects.

The parabox-leveler tool should show a web-UI to allow a user to create and edit Parabox levels and then emit the level in the appropriate format (either copied to clipboard or downloaded as a text file).

The file format is described in the document docs/file-format-notes.md and there are example levels in docs/simple-examples/ with screenshots showing what the corresponding level looks like when loaded in the game.

---

## Tech Stack

- **React** with **Vite** and **TypeScript** (required)
- **TailwindCSS** for styling
- **shadcn/ui** for UI components
- Color picker library (implementation choice)

---

## Coordinate System

- Origin `(0, 0)` is the **lower-left corner**
- In a 5×5 block, `(4, 4)` is the upper-right corner
- Y increases upward, X increases rightward

---

## Core Features

### Level Creation & Editing

1. **Default Level**: New levels start as an empty 5×5 root block
2. **Resizable Blocks**: Users can resize any block's internal dimensions
3. **Object Placement**: Users can place the following objects on the grid:
   - **Block** - a container that can hold other objects
   - **Wall** - solid obstacle
   - **Floor** - buttons (Button, PlayerButton)
   - **Ref** - reference to another block (exit or clone)

### Block Properties

- Position (x, y), Size (width, height)
- Color (hue, sat, val)
- Player flag, Possessable flag
- Player Order, Zoom Factor
- **Flip Horizontal** (fliph) - mirrors the block horizontally

### Ref Properties

- Position (x, y)
- Target Block ID
- Exit Reference flag (exitblock)
- **Infinite Exit** (infexit, infexitnum) - for recursive exit references
- **Infinite Enter** (infenter, infenternum, infenterid) - for recursive enter references

### Block IDs

- Block IDs are **auto-assigned** sequentially (root=0, then 1, 2, 3...)
- IDs must be **visible** to users (e.g., displayed on blocks and in the tree explorer)
- Users need to see IDs because Ref objects require manually selecting which block ID to reference

### Import/Export

- **Import**: Users can paste level text to load an existing level
- **Export**: Copy to clipboard or download as `.txt` file

### Nested Block Editing

- Users can **enter** a child block to edit its interior in a focused view
- Users can select child blocks while editing the parent
- A **tree explorer panel** lists all objects in the level hierarchy for navigation

### Block Preview

- Blocks with children display a **mini preview** of their contents in the grid editor
- The preview shows a scaled-down grid with Walls, Blocks, Floors, and Refs rendered inside
- Empty blocks display just their ID or player indicator
- Blocks with children show the ID/player indicator in the bottom-right corner

### References (Ref)

- **Exit Reference** (`exitblock=1`): The "real" instance of a block in its parent
- **Clone Reference** (`exitblock=0`): A copy/portal to the block (displayed lighter in-game)
- The UI should clearly indicate which type is being set
- Users can toggle a reference between exit and clone

### Undo/Redo

- Full undo/redo support for all editing operations

### Keyboard Controls

| Key | Action |
|-----|--------|
| Arrow keys / WASD | Move selection to adjacent cell (object or empty) |
| Alt + Arrow keys / WASD | Move selected object along with selection |
| Backspace / Delete | Delete selected object |
| Enter | Enter selected block (if selection is a Block) |
| Escape | Exit to parent block (if not in root), or clear selection |
| Z | Undo |
| Shift+Z | Redo |
| 1 | Place Block at selected position |
| 2 | Place Wall at selected position |
| 3 | Place Floor at selected position |
| 4 | Place Ref at selected position |
| X | Cut selected object to clipboard |
| C | Copy selected object to clipboard |
| V | Paste clipboard at selected position |

### Empty Cell Selection

- Users can select empty cells by clicking or using arrow keys
- When an empty cell is selected, the Properties Panel shows buttons to create objects (Block, Wall, Floor, Ref)
- This provides a quick way to add objects without switching tools
- Origin (0,0) is selected by default on load

### Clipboard

- X cuts the selected object to clipboard (deletes it)
- C copies the selected object to clipboard (keeps original)
- V pastes the clipboard at the selected position
- When pasting a Block, if the Block ID already exists in the level, a new ID is automatically assigned
- This also applies recursively to any nested Blocks inside the pasted Block

### Validation

- Level validation checks for orphaned Refs (Refs pointing to non-existent Blocks)
- If a Block is deleted while Refs still reference it, validation will fail with a warning

---

## Header Options

- `version 4` - **mandatory**, always included
- `shed` - optional flag, user can enable/disable
- `inner_push` - optional flag, user can enable/disable
- `custom_level_music` - optional, default -1 (no music)
- `custom_level_palette` - optional, default -1 (no palette)
- `attempt_order` - optional, user can configure

### Deferred (not in MVP)

- `draw_style` options (tui, grid, oldstyle) - affects rendering style
- `infexit` / `infenter` properties on Refs - infinite recursion effects

---

## Validation

The editor should warn users about potential issues:

- **At least one player block** must exist (Block with `player=1`)
- **At least one PlayerButton** must exist (Floor with type `PlayerButton`)
- All Buttons should be reachable (optional/nice-to-have)

---

## Object Properties

### Block
| Property | Description |
|----------|-------------|
| x, y | Position in parent |
| id | Unique block ID |
| width, height | Internal dimensions |
| hue, sat, val | Color (HSV, 0-1 range) |
| zoomfactor | Camera zoom (1 = normal) |
| fillwithwalls | If 1, becomes 1×1 with wall inside |
| player | If 1, this is a player |
| possessable | If 1, player can possess this |
| playerorder | Order for multi-player levels |
| fliph | Horizontal flip |
| floatinspace | Block has no parent (deferred) |
| specialeffect | Magic number for special cases |

### Ref
| Property | Description |
|----------|-------------|
| x, y | Position in parent |
| id | ID of referenced block |
| exitblock | 1 = exit reference, 0 = clone |
| player, possessable, playerorder | Same as Block |
| fliph, floatinspace, specialeffect | Same as Block |
| infexit, infexitnum | Deferred |
| infenter, infenternum, infenterid | Deferred |

### Wall
| Property | Description |
|----------|-------------|
| x, y | Position in parent |
| player, possessable, playerorder | Usually 0 |

### Floor
| Property | Description |
|----------|-------------|
| x, y | Position in parent |
| type | `Button` or `PlayerButton` |

---

## UI Layout (Suggested)

```
┌─────────────────────────────────────────────────────────────┐
│  Toolbar: [New] [Import] [Export] [Undo] [Redo] [Settings]  │
├─────────────┬───────────────────────────┬───────────────────┤
│ Tree        │                           │ Properties        │
│ Explorer    │      Grid Editor          │ Panel             │
│             │                           │                   │
│ - Root      │   (visual editing area)   │ (selected object  │
│   - Block1  │                           │  properties)      │
│   - Wall    │                           │                   │
│   - ...     │                           │                   │
├─────────────┴───────────────────────────┴───────────────────┤
│  Tool Palette: [Select] [Block] [Wall] [Floor] [Ref]        │
└─────────────────────────────────────────────────────────────┘
```

---

## File Format Reference

See `docs/file-format-notes.md` for complete format specification.
See `docs/simple-examples/` for example levels with screenshots.

