import { Toolbar } from '@/components/editor/Toolbar'
import { TreeExplorer } from '@/components/editor/TreeExplorer'
import { GridEditor } from '@/components/editor/GridEditor'
import { PropertiesPanel } from '@/components/editor/PropertiesPanel'

function App() {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        <TreeExplorer />
        <GridEditor />
        <PropertiesPanel />
      </div>
    </div>
  )
}

export default App
