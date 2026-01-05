/**
 * Tree Explorer - Hierarchical view of level objects
 */

import { useSnapshot } from 'valtio'
import { state, actions } from '@/store/levelStore'
import type { LevelObject, Block } from '@/types/level'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronDown, Square, Hash, CircleDot, Link } from 'lucide-react'
import { useState } from 'react'

interface TreeNodeProps {
  object: LevelObject
  path: number[]
  depth: number
}

function TreeNode({ object, path, depth }: TreeNodeProps) {
  const snap = useSnapshot(state)
  const [expanded, setExpanded] = useState(true)

  const isSelected =
    snap.selectedPath &&
    snap.selectedPath.length === path.length &&
    snap.selectedPath.every((v: number, i: number) => v === path[i])

  const hasChildren = object.type === 'Block' && object.children.length > 0

  const handleClick = () => {
    if (object.type === 'Block') {
      // Single click on block enters it and shows its properties
      actions.enterBlockFromTree(object.id)
    } else {
      // Single click on other objects selects them
      actions.selectObject(path)
    }
  }

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(!expanded)
  }

  // Get icon and label based on object type
  let icon: React.ReactNode
  let label: string

  switch (object.type) {
    case 'Block':
      icon = <Square className="w-3 h-3" style={{ color: `hsl(${object.hue * 360}, ${object.sat * 100}%, ${object.val * 50}%)` }} />
      label = `Block ${object.id}${object.player ? ' (Player)' : ''}`
      break
    case 'Wall':
      icon = <Hash className="w-3 h-3 text-slate-500" />
      label = `Wall (${object.x}, ${object.y})`
      break
    case 'Floor':
      icon = <CircleDot className={cn('w-3 h-3', object.floorType === 'PlayerButton' ? 'text-yellow-500' : 'text-green-500')} />
      label = `${object.floorType} (${object.x}, ${object.y})`
      break
    case 'Ref':
      icon = <Link className={cn('w-3 h-3', object.exitblock ? 'text-blue-500' : 'text-blue-300')} />
      label = `Ref →${object.id}${object.exitblock ? ' (exit)' : ' (clone)'} (${object.x}, ${object.y})`
      break
  }

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-1 py-0.5 cursor-pointer rounded hover:bg-accent',
          isSelected && 'bg-accent'
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button onClick={toggleExpand} className="p-0.5">
            {expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        {icon}
        <span className="text-xs truncate">{label}</span>
      </div>
      {hasChildren && expanded && (
        <div>
          {(object as Block).children.map((child, idx) => (
            <TreeNode
              key={idx}
              object={child}
              path={[...path, idx]}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function TreeExplorer() {
  const snap = useSnapshot(state)

  return (
    <div className="w-56 border-r border-border flex flex-col bg-card">
      <div className="p-2 border-b border-border">
        <h2 className="text-sm font-semibold">Level Explorer</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1">
          {/* Root block */}
          <div
            className={cn(
              'flex items-center gap-1 px-1 py-0.5 cursor-pointer rounded hover:bg-accent',
              snap.editingBlockId === 0 && 'font-semibold'
            )}
            onClick={() => actions.enterBlockFromTree(0)}
          >
            <Square className="w-3 h-3 text-blue-500" />
            <span className="text-xs">Root (Block 0)</span>
          </div>
          {/* Root's children */}
          {(snap.level.root.children as readonly LevelObject[]).map((child, idx) => (
            <TreeNode
              key={idx}
              object={child as LevelObject}
              path={[idx]}
              depth={1}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
