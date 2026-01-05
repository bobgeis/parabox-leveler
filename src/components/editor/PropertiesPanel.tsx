/**
 * Properties Panel - Edit properties of selected object
 */

import { useSnapshot } from 'valtio'
import { state, actions, getAllBlocks, findBlockById } from '@/store/levelStore'
import type { Level } from '@/types/level'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <div className="grid grid-cols-2 items-center gap-2">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="h-7 text-xs"
      />
    </div>
  )
}

function CheckboxInput({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4"
      />
      <Label className="text-xs">{label}</Label>
    </div>
  )
}

function BlockProperties() {
  const snap = useSnapshot(state)
  const obj = snap.selectedObject

  if (!obj || obj.type !== 'Block') return null

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Block {obj.id}</div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Position & Size</div>
        <NumberInput
          label="X"
          value={obj.x}
          onChange={(v) => actions.updateSelectedProperty('x', v)}
        />
        <NumberInput
          label="Y"
          value={obj.y}
          onChange={(v) => actions.updateSelectedProperty('y', v)}
        />
        <NumberInput
          label="Width"
          value={obj.width}
          onChange={(v) => actions.updateBlockSize(v, obj.height)}
          min={1}
        />
        <NumberInput
          label="Height"
          value={obj.height}
          onChange={(v) => actions.updateBlockSize(obj.width, v)}
          min={1}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Color (HSV)</div>
        <NumberInput
          label="Hue"
          value={obj.hue}
          onChange={(v) => actions.updateBlockColor(v, obj.sat, obj.val)}
          min={0}
          max={1}
          step={0.05}
        />
        <NumberInput
          label="Saturation"
          value={obj.sat}
          onChange={(v) => actions.updateBlockColor(obj.hue, v, obj.val)}
          min={0}
          max={1}
          step={0.05}
        />
        <NumberInput
          label="Value"
          value={obj.val}
          onChange={(v) => actions.updateBlockColor(obj.hue, obj.sat, v)}
          min={0}
          max={1}
          step={0.05}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Flags</div>
        <CheckboxInput
          label="Player"
          checked={obj.player === 1}
          onChange={(v) => actions.updateSelectedProperty('player', v ? 1 : 0)}
        />
        <CheckboxInput
          label="Possessable"
          checked={obj.possessable === 1}
          onChange={(v) => actions.updateSelectedProperty('possessable', v ? 1 : 0)}
        />
        <NumberInput
          label="Player Order"
          value={obj.playerorder}
          onChange={(v) => actions.updateSelectedProperty('playerorder', v)}
          min={0}
        />
        <NumberInput
          label="Zoom Factor"
          value={obj.zoomfactor}
          onChange={(v) => actions.updateSelectedProperty('zoomfactor', v)}
          min={0.1}
          step={0.1}
        />
        <CheckboxInput
          label="Flip Horizontal"
          checked={obj.fliph === 1}
          onChange={(v) => actions.updateSelectedProperty('fliph', v ? 1 : 0)}
        />
      </div>

      <Separator />

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => actions.enterBlock(obj.id)}
      >
        Enter Block
      </Button>
    </div>
  )
}

function WallProperties() {
  const snap = useSnapshot(state)
  const obj = snap.selectedObject

  if (!obj || obj.type !== 'Wall') return null

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Wall</div>

      <div className="space-y-2">
        <NumberInput
          label="X"
          value={obj.x}
          onChange={(v) => actions.updateSelectedProperty('x', v)}
        />
        <NumberInput
          label="Y"
          value={obj.y}
          onChange={(v) => actions.updateSelectedProperty('y', v)}
        />
      </div>
    </div>
  )
}

function FloorProperties() {
  const snap = useSnapshot(state)
  const obj = snap.selectedObject

  if (!obj || obj.type !== 'Floor') return null

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Floor</div>

      <div className="space-y-2">
        <NumberInput
          label="X"
          value={obj.x}
          onChange={(v) => actions.updateSelectedProperty('x', v)}
        />
        <NumberInput
          label="Y"
          value={obj.y}
          onChange={(v) => actions.updateSelectedProperty('y', v)}
        />

        <div className="grid grid-cols-2 items-center gap-2">
          <Label className="text-xs">Type</Label>
          <Select
            value={obj.floorType}
            onValueChange={(v: string) => actions.updateSelectedProperty('floorType', v as 'Button' | 'PlayerButton')}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Button">Button</SelectItem>
              <SelectItem value="PlayerButton">PlayerButton</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

function RefProperties() {
  const snap = useSnapshot(state)
  const obj = snap.selectedObject
  const blocks = getAllBlocks()

  if (!obj || obj.type !== 'Ref') return null

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Reference</div>

      <div className="space-y-2">
        <NumberInput
          label="X"
          value={obj.x}
          onChange={(v) => actions.updateSelectedProperty('x', v)}
        />
        <NumberInput
          label="Y"
          value={obj.y}
          onChange={(v) => actions.updateSelectedProperty('y', v)}
        />

        <div className="grid grid-cols-2 items-center gap-2">
          <Label className="text-xs">Target Block</Label>
          <Select
            value={String(obj.id)}
            onValueChange={(v: string) => actions.updateSelectedProperty('id', parseInt(v))}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {blocks.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <CheckboxInput
          label="Exit Reference"
          checked={obj.exitblock === 1}
          onChange={(v) => actions.updateSelectedProperty('exitblock', v ? 1 : 0)}
        />

        <Separator className="my-2" />
        <div className="text-xs text-muted-foreground">Infinite Exit</div>

        <CheckboxInput
          label="Inf Exit"
          checked={obj.infexit === 1}
          onChange={(v) => actions.updateSelectedProperty('infexit', v ? 1 : 0)}
        />
        <NumberInput
          label="Inf Exit Num"
          value={obj.infexitnum}
          onChange={(v) => actions.updateSelectedProperty('infexitnum', v)}
        />

        <Separator className="my-2" />
        <div className="text-xs text-muted-foreground">Infinite Enter</div>

        <CheckboxInput
          label="Inf Enter"
          checked={obj.infenter === 1}
          onChange={(v) => actions.updateSelectedProperty('infenter', v ? 1 : 0)}
        />
        <NumberInput
          label="Inf Enter Num"
          value={obj.infenternum}
          onChange={(v) => actions.updateSelectedProperty('infenternum', v)}
        />
        <NumberInput
          label="Inf Enter ID"
          value={obj.infenterid}
          onChange={(v) => actions.updateSelectedProperty('infenterid', v)}
        />
      </div>
    </div>
  )
}

function EditingBlockProperties() {
  const snap = useSnapshot(state)
  // Get editing block from snapshot for reactivity
  const editingBlock = findBlockById(snap.level as Level, snap.editingBlockId) ?? snap.level.root

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Current Block: {editingBlock.id}</div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Position & Size</div>
        <NumberInput
          label="X"
          value={editingBlock.x}
          onChange={(v) => actions.updateEditingBlockProperty('x', v)}
        />
        <NumberInput
          label="Y"
          value={editingBlock.y}
          onChange={(v) => actions.updateEditingBlockProperty('y', v)}
        />
        <NumberInput
          label="Width"
          value={editingBlock.width}
          onChange={(v) => actions.updateEditingBlockSize(v, editingBlock.height)}
          min={1}
        />
        <NumberInput
          label="Height"
          value={editingBlock.height}
          onChange={(v) => actions.updateEditingBlockSize(editingBlock.width, v)}
          min={1}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Color (HSV)</div>
        <NumberInput
          label="Hue"
          value={editingBlock.hue}
          onChange={(v) => actions.updateEditingBlockColor(v, editingBlock.sat, editingBlock.val)}
          min={0}
          max={1}
          step={0.05}
        />
        <NumberInput
          label="Saturation"
          value={editingBlock.sat}
          onChange={(v) => actions.updateEditingBlockColor(editingBlock.hue, v, editingBlock.val)}
          min={0}
          max={1}
          step={0.05}
        />
        <NumberInput
          label="Value"
          value={editingBlock.val}
          onChange={(v) => actions.updateEditingBlockColor(editingBlock.hue, editingBlock.sat, v)}
          min={0}
          max={1}
          step={0.05}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Flags</div>
        <CheckboxInput
          label="Player"
          checked={editingBlock.player === 1}
          onChange={(v) => actions.updateEditingBlockProperty('player', v ? 1 : 0)}
        />
        <CheckboxInput
          label="Possessable"
          checked={editingBlock.possessable === 1}
          onChange={(v) => actions.updateEditingBlockProperty('possessable', v ? 1 : 0)}
        />
        <CheckboxInput
          label="Player Order"
          checked={editingBlock.playerorder === 1}
          onChange={(v) => actions.updateEditingBlockProperty('playerorder', v ? 1 : 0)}
        />
        <CheckboxInput
          label="Flip Horizontal"
          checked={editingBlock.fliph === 1}
          onChange={(v) => actions.updateEditingBlockProperty('fliph', v ? 1 : 0)}
        />
        <CheckboxInput
          label="Float in Space"
          checked={editingBlock.floatinspace === 1}
          onChange={(v) => actions.updateEditingBlockProperty('floatinspace', v ? 1 : 0)}
        />
        <CheckboxInput
          label="Special Effect"
          checked={editingBlock.specialeffect === 1}
          onChange={(v) => actions.updateEditingBlockProperty('specialeffect', v ? 1 : 0)}
        />
      </div>
    </div>
  )
}

function HeaderProperties() {
  const snap = useSnapshot(state)
  const header = snap.level.header

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Level Options</div>
      <div className="space-y-2">
        <CheckboxInput
          label="Shed"
          checked={header.shed === true}
          onChange={(v) => actions.updateHeaderProperty('shed', v ? true : undefined)}
        />
        <CheckboxInput
          label="Inner Push"
          checked={header.innerPush === true}
          onChange={(v) => actions.updateHeaderProperty('innerPush', v ? true : undefined)}
        />
      </div>
    </div>
  )
}

function EmptyPositionPanel() {
  const snap = useSnapshot(state)
  const pos = snap.selectedPosition

  if (!pos) return null

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Empty Cell ({pos.x}, {pos.y})</div>
      <div className="text-xs text-muted-foreground">Create an object:</div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => actions.createObjectAtPosition('wall')}
        >
          Wall (1)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => actions.createObjectAtPosition('floor')}
        >
          Floor (2)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => actions.createObjectAtPosition('block')}
        >
          Block (3)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => actions.createObjectAtPosition('ref')}
        >
          Ref (4)
        </Button>
      </div>
    </div>
  )
}

export function PropertiesPanel() {
  const snap = useSnapshot(state)

  return (
    <div className="w-56 border-l border-border flex flex-col bg-card">
      <div className="p-2 border-b border-border">
        <h2 className="text-sm font-semibold">Properties</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {snap.selectedObject ? (
            <>
              {snap.selectedObject.type === 'Block' && <BlockProperties />}
              {snap.selectedObject.type === 'Wall' && <WallProperties />}
              {snap.selectedObject.type === 'Floor' && <FloorProperties />}
              {snap.selectedObject.type === 'Ref' && <RefProperties />}

              <Separator />

              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => actions.deleteSelected()}
              >
                Delete
              </Button>
            </>
          ) : snap.selectedPosition ? (
            <EmptyPositionPanel />
          ) : (
            <EditingBlockProperties />
          )}

          {snap.editingBlockId === 0 && (
            <>
              <Separator />
              <HeaderProperties />
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
