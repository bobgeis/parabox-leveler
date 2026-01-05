/**
 * Toolbar - Main toolbar with import/export and tool selection
 */

import { useSnapshot } from 'valtio'
import { state, actions, validateLevel, getAllBlocks, historyState } from '@/store/levelStore'
import type { Tool } from '@/store/levelStore'
import { Button } from '@/components/ui/button'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
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
  Undo2,
  Redo2,
  MousePointer2,
  Square,
  Hash,
  CircleDot,
  Link,
  Settings,
  AlertTriangle,
  Copy,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'

function ToolButton({
  tool,
  currentTool,
  icon: Icon,
  label,
  onClick,
}: {
  tool: Tool
  currentTool: Tool
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={currentTool === tool ? 'default' : 'outline'}
            size="sm"
            onClick={onClick}
          >
            <Icon className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
  const levelText = actions.exportLevel()
  const warnings = validateLevel()

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
    a.download = 'level.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
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
          className="w-full h-64 p-2 border rounded-md font-mono text-xs bg-muted"
          value={levelText}
          readOnly
        />
        <DialogFooter>
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-1" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SettingsDialog() {
  const snap = useSnapshot(state)
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Level Settings</DialogTitle>
          <DialogDescription>
            Configure level header options.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="shed"
              checked={snap.level.header.shed || false}
              onChange={(e) => actions.updateHeader({ shed: e.target.checked })}
            />
            <label htmlFor="shed" className="text-sm">Enable Shed behavior</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="innerPush"
              checked={snap.level.header.innerPush || false}
              onChange={(e) => actions.updateHeader({ innerPush: e.target.checked })}
            />
            <label htmlFor="innerPush" className="text-sm">Enable Inner Push behavior</label>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="comment" className="text-sm w-24">Level Name:</label>
            <input
              type="text"
              id="comment"
              className="flex-1 border rounded px-2 py-1 text-sm"
              value={snap.level.header.comment || ''}
              onChange={(e) => actions.updateHeader({ comment: e.target.value })}
              placeholder="My Level"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Toolbar() {
  const snap = useSnapshot(state)
  const historySnap = useSnapshot(historyState)
  const blocks = getAllBlocks()

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

      <ImportDialog />
      <ExportDialog />

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

      {/* Tools */}
      <ToolButton
        tool="select"
        currentTool={snap.tool}
        icon={MousePointer2}
        label="Select"
        onClick={() => actions.setTool('select')}
      />

      <ToolButton
        tool="block"
        currentTool={snap.tool}
        icon={Square}
        label="Block"
        onClick={() => actions.setTool('block')}
      />

      <ToolButton
        tool="wall"
        currentTool={snap.tool}
        icon={Hash}
        label="Wall"
        onClick={() => actions.setTool('wall')}
      />

      {/* Floor with dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={snap.tool === 'floor' ? 'default' : 'outline'}
            size="sm"
            onClick={() => actions.setTool('floor')}
          >
            <CircleDot className="w-4 h-4" />
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Floor Type</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              actions.setFloorToolType('Button')
              actions.setTool('floor')
            }}
          >
            <CircleDot className="w-4 h-4 mr-2 text-green-500" />
            Button
            {snap.floorToolType === 'Button' && ' ✓'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              actions.setFloorToolType('PlayerButton')
              actions.setTool('floor')
            }}
          >
            <CircleDot className="w-4 h-4 mr-2 text-yellow-500" />
            PlayerButton
            {snap.floorToolType === 'PlayerButton' && ' ✓'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Ref with dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={snap.tool === 'ref' ? 'default' : 'outline'}
            size="sm"
            onClick={() => actions.setTool('ref')}
          >
            <Link className="w-4 h-4" />
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Reference Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              actions.setRefToolIsExit(true)
              actions.setTool('ref')
            }}
          >
            Exit Reference
            {snap.refToolIsExit && ' ✓'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              actions.setRefToolIsExit(false)
              actions.setTool('ref')
            }}
          >
            Clone Reference
            {!snap.refToolIsExit && ' ✓'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Target Block</DropdownMenuLabel>
          {blocks.map((b) => (
            <DropdownMenuItem
              key={b.id}
              onClick={() => {
                actions.setRefToolTargetId(b.id)
                actions.setTool('ref')
              }}
            >
              {b.label}
              {snap.refToolTargetId === b.id && ' ✓'}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      {/* Settings */}
      <SettingsDialog />
    </div>
  )
}
