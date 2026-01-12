/**
 * Toolbar - Main toolbar with import/export and tool selection
 */

import { useSnapshot } from 'valtio'
import { state, actions, validateLevel, historyState } from '@/store/levelStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import {
  FilePlus,
  Upload,
  Download,
  Save,
  Undo2,
  Redo2,
  Settings,
  AlertTriangle,
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  Square,
  Hash,
  CircleDot,
  Link,
  Package,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getNum(obj: Record<string, unknown>, key: string, fallback: number = 0): number {
  const v = obj[key]
  return typeof v === 'number' ? v : fallback
}

function getStr(obj: Record<string, unknown>, key: string, fallback: string = ''): string {
  const v = obj[key]
  return typeof v === 'string' ? v : fallback
}

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

function ClipboardPreview({ obj }: { obj: unknown }) {
  const o = isRecord(obj) ? obj : null
  let bgColor: string | undefined
  let content: ReactNode = null
  let borderStyle = ''

  if (o) {
    if (o['type'] === 'Wall') {
      bgColor = '#334155'
      content = <span className="absolute inset-0 flex items-center justify-center text-[14px] font-bold text-slate-200">#</span>
    } else if (o['type'] === 'Floor') {
      const floorType = getStr(o, 'floorType')
      bgColor = floorType === 'PlayerButton' ? '#eab30880' : '#22c55e80'
      content = (
        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-center">
          {floorType === 'PlayerButton' ? 'PB' : 'B'}
        </span>
      )
    } else if (o['type'] === 'Block') {
      const hue = getNum(o, 'hue')
      const sat = getNum(o, 'sat')
      const val = getNum(o, 'val')
      const color = hsvToColor(hue, sat, val)
      const darkerColor = hsvToColor(hue, sat, val * 0.6)
      borderStyle = 'border-2 border-solid'
      bgColor = color

      const childrenValue = o['children']
      const children = Array.isArray(childrenValue) ? childrenValue : []
      const hasChildren = children.length > 0
      const w = getNum(o, 'width')
      const h = getNum(o, 'height')
      content = (
        <div className="absolute inset-0.5 rounded-sm flex items-center justify-center overflow-hidden" style={{ backgroundColor: color }}>
          {hasChildren ? (
            <div
              className="absolute inset-0.5 grid"
              style={{
                gridTemplateColumns: `repeat(${w}, 1fr)`,
                gridTemplateRows: `repeat(${h}, 1fr)`,
                backgroundColor: darkerColor,
                borderRadius: '2px',
              }}
            >
              {Array.from({ length: h }).map((_, row) =>
                Array.from({ length: w }).map((_, col) => {
                  const cellY = h - 1 - row
                  const cellX = col
                  const childrenAtCell = children.filter(
                    (c) => isRecord(c) && getNum(c, 'x') === cellX && getNum(c, 'y') === cellY
                  )
                  let cellColor = 'transparent'
                  for (const child of childrenAtCell) {
                    if (child['type'] === 'Wall') {
                      cellColor = '#334155'
                    } else if (child['type'] === 'Block') {
                      cellColor = hsvToColor(getNum(child, 'hue'), getNum(child, 'sat'), getNum(child, 'val'))
                    } else if (child['type'] === 'Floor') {
                      cellColor = getStr(child, 'floorType') === 'PlayerButton' ? '#eab30880' : '#22c55e80'
                    } else if (child['type'] === 'Ref') {
                      cellColor = '#3b82f680'
                    }
                  }
                  return <div key={`${cellX}-${cellY}`} style={{ backgroundColor: cellColor }} />
                })
              )}
            </div>
          ) : (
            <span className="text-[16px] font-bold">
              {getNum(o, 'player') ? '😶' : getNum(o, 'fillwithwalls') === 1 ? '✕' : getNum(o, 'id')}
            </span>
          )}
          {hasChildren && (
            <span className="absolute bottom-0 right-0.5 text-[7px] font-bold text-white/80 drop-shadow">
              {getNum(o, 'player') ? '😶' : getNum(o, 'id')}
            </span>
          )}
        </div>
      )
    } else if (o['type'] === 'Ref') {
      borderStyle = 'border-2 border-dashed'
      content = (
        <div
          className={cn(
            'absolute inset-0.5 rounded-sm flex items-center justify-center text-[8px] font-bold border-2 border-dashed',
            getNum(o, 'exitblock') === 1 ? 'border-blue-500' : 'border-blue-300'
          )}
          style={{ opacity: getNum(o, 'exitblock') === 1 ? 0.8 : 0.4 }}
        >
          →{getNum(o, 'id')}
        </div>
      )
    }
  }

  return (
    <div
      className={cn('relative aspect-square w-9 border border-border/50 rounded-sm bg-muted/30 overflow-hidden', borderStyle)}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
      title={o ? `Clipboard: ${String(o['type'])}` : 'Clipboard: Empty'}
    >
      {content}
      {!o && <span className="absolute inset-0 flex items-center justify-center text-[8px] text-muted-foreground">Empty</span>}
    </div>
  )
}

function SaveLoadDialog() {
  const snap = useSnapshot(state)
  const [open, setOpen] = useState(false)
  const [refresh, setRefresh] = useState(0)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    actions.setModalOpen(isOpen)
    if (isOpen) setRefresh((r) => r + 1)
  }

  const slots = Array.from({ length: 5 }, (_, i) => i + 1)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Save className="w-4 h-4 mr-1" />
          Save/Load
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Save / Load</DialogTitle>
          <DialogDescription>
            The editor autosaves automatically. Use slots to manually save and load.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <label htmlFor="levelTitle" className="text-sm w-14">Title:</label>
          <input
            id="levelTitle"
            type="text"
            className="flex-1 px-2 py-1 text-sm border rounded-md min-w-0"
            placeholder="Untitled"
            value={snap.level.header.comment ?? ''}
            onChange={(e) => actions.updateHeader({ comment: e.target.value || undefined })}
          />
        </div>

        <div className="space-y-2">
          {slots.map((slot) => {
            void refresh
            const info = actions.getSlotInfo(slot)
            const isEmpty = info === null
            const title = isEmpty ? 'Empty' : info.title ?? 'Untitled'
            const meta = isEmpty
              ? ''
              : `${info.objectCount} objects • ${new Date(info.savedAt).toLocaleString()}`

            return (
              <div
                key={slot}
                className="flex flex-col gap-1 border rounded-md px-2 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium w-16 shrink-0">Slot {slot}</div>
                  <div className="text-sm font-medium min-w-0 truncate">{title}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{meta}</div>
                  <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      actions.saveToSlot(slot)
                      setRefresh((r) => r + 1)
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isEmpty}
                    onClick={() => {
                      const ok = actions.loadFromSlot(slot)
                      if (ok) handleOpenChange(false)
                    }}
                  >
                    Load
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isEmpty}
                    onClick={() => {
                      actions.clearSlot(slot)
                      setRefresh((r) => r + 1)
                    }}
                  >
                    Clear
                  </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImportDialog() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleImport = () => {
    const result = actions.importLevel(text)
    if (result.success) {
      setOpen(false)
      setText('')
      setError(null)
    } else {
      setError(result.error || 'Failed to import level')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-1" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Level</DialogTitle>
          <DialogDescription>
            Paste your level text below. The format should match Patrick's Parabox custom level format.
          </DialogDescription>
        </DialogHeader>
        <textarea
          className="w-full h-64 p-2 border rounded-md font-mono text-xs bg-muted"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="version 4
#
Block -1 -1 0 5 5 0.6 0.8 1 1 0 0 0 0 0 0 0
..."
        />
        {error && (
          <div className="text-sm text-destructive flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ExportDialog() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [filename, setFilename] = useState('level')
  const levelText = actions.exportLevel()
  const warnings = validateLevel()

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    actions.setModalOpen(isOpen)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(levelText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([levelText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename || 'level'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Export Level</DialogTitle>
          <DialogDescription>
            Copy or download your level file.
          </DialogDescription>
        </DialogHeader>

        {warnings.length > 0 && (
          <div className="p-2 bg-yellow-500/10 border border-yellow-500/50 rounded-md">
            <div className="text-sm font-medium text-yellow-600 flex items-center gap-1 mb-1">
              <AlertTriangle className="w-4 h-4" />
              Validation Warnings
            </div>
            <ul className="text-xs text-yellow-600 list-disc pl-4">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <textarea
          className="w-full h-64 p-2 border rounded-md font-mono text-xs bg-muted overflow-x-auto whitespace-pre"
          value={levelText}
          readOnly
        />
        <div className="flex flex-col gap-3 mt-2">
          <Button variant="outline" onClick={handleCopy} className="w-full">
            <Copy className="w-4 h-4 mr-1" />
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
          <div className="flex items-center gap-2">
            <label htmlFor="filename" className="text-sm whitespace-nowrap">Filename:</label>
            <input
              id="filename"
              type="text"
              className="flex-1 px-2 py-1 text-sm border rounded-md min-w-0"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="level"
            />
            <span className="text-sm text-muted-foreground">.txt</span>
            <Button onClick={handleDownload} className="shrink-0">
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function HeaderDialog() {
  const snap = useSnapshot(state)
  const [open, setOpen] = useState(false)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    actions.setModalOpen(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-1" />
          Header
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Level Header</DialogTitle>
          <DialogDescription>
            Configure level header options.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <label htmlFor="headerTitle" className="text-sm w-24">Title:</label>
            <input
              id="headerTitle"
              type="text"
              className="flex-1 px-2 py-1 text-sm border rounded-md min-w-0"
              placeholder="Untitled"
              value={snap.level.header.comment ?? ''}
              onChange={(e) => actions.updateHeader({ comment: e.target.value || undefined })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="shed"
              checked={snap.level.header.shed || false}
              onChange={(e) => actions.updateHeader({ shed: e.target.checked ? true : undefined })}
            />
            <label htmlFor="shed" className="text-sm">Enable Shed behavior</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="innerPush"
              checked={snap.level.header.innerPush || false}
              onChange={(e) => actions.updateHeader({ innerPush: e.target.checked ? true : undefined })}
            />
            <label htmlFor="innerPush" className="text-sm">Enable Inner Push behavior</label>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="drawStyle" className="text-sm w-24">Draw Style:</label>
            <select
              id="drawStyle"
              className="flex-1 border rounded px-2 py-1 text-sm"
              value={snap.level.header.drawStyle || ''}
              onChange={(e) => actions.updateHeader({ drawStyle: (e.target.value as 'tui' | 'grid' | 'oldstyle') || undefined })}
            >
              <option value="">Default</option>
              <option value="tui">TUI</option>
              <option value="grid">Grid</option>
              <option value="oldstyle">Old Style</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => handleOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Toolbar() {
  const snap = useSnapshot(state)
  const historySnap = useSnapshot(historyState)

  // Reactive undo/redo state from history snapshot
  const canUndo = historySnap.undoStack.length > 0
  const canRedo = historySnap.redoStack.length > 0

  return (
    <div className="h-12 border-b border-border bg-card flex items-center px-2 gap-2">
      {/* File operations */}
      <Button variant="outline" size="sm" onClick={() => actions.newLevel()}>
        <FilePlus className="w-4 h-4 mr-1" />
        New
      </Button>

      <SaveLoadDialog />

      <ImportDialog />
      <ExportDialog />
      <HeaderDialog />

      <Separator orientation="vertical" className="h-6" />

      {/* Undo/Redo */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.undo()}
              disabled={!canUndo}
            >
              <Undo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Z)</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.redo()}
              disabled={!canRedo}
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Separator orientation="vertical" className="h-6" />

      {/* Cut/Copy/Paste */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.cutSelected()}
            >
              <Scissors className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cut (X)</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.copySelected()}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy (C)</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.paste()}
            >
              <Clipboard className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Paste (V)</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ClipboardPreview obj={snap.clipboard} />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (snap.selectedObject) {
                  actions.deleteSelected()
                } else if (snap.selectedPosition) {
                  actions.deleteAtPositionXY(snap.selectedPosition.x, snap.selectedPosition.y, true)
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete (Backspace)</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Separator orientation="vertical" className="h-6" />

      {/* Object creation */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.placeObjectAtSelection('wall')}
            >
              <Hash className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Wall (1)</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.placeObjectAtSelection('floor')}
            >
              <CircleDot className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Floor (2)</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.placeObjectAtSelection('box')}
            >
              <Package className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Box (3)</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.placeObjectAtSelection('block')}
            >
              <Square className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Block (4)</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.placeObjectAtSelection('ref')}
            >
              <Link className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ref (5)</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="flex-1" />
    </div>
  )
}
