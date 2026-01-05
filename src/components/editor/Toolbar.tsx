/**
 * Toolbar - Main toolbar with import/export and tool selection
 */

import { useSnapshot } from 'valtio'
import { state, actions, validateLevel, historyState } from '@/store/levelStore'
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
  Settings,
  AlertTriangle,
  Copy,
  Scissors,
  Clipboard,
  Square,
  Hash,
  CircleDot,
  Link,
} from 'lucide-react'
import { useState } from 'react'

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
              onClick={() => actions.placeObjectAtSelection('block')}
            >
              <Square className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Block (3)</TooltipContent>
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
          <TooltipContent>Ref (4)</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="flex-1" />

      {/* Settings */}
      <SettingsDialog />
    </div>
  )
}
