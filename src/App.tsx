import { useEffect } from 'react';
import { saveProject } from './io/storage';
import { useProjectStore } from './store/useProjectStore';
import { FileMenu } from './ui/FileMenu';
import { InputPanel } from './ui/InputPanel';
import { InspectorPanel } from './ui/InspectorPanel';
import { PlanCanvas } from './ui/PlanCanvas';
import { StatusBar } from './ui/StatusBar';

export function App() {
  const project = useProjectStore((state) => state.history.present);

  // 本地自动保存：改动停下来 400 毫秒后写入浏览器数据库
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void saveProject(project);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [project]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-title">简易量房工具</span>
          <span className="brand-project">{project.name}</span>
        </div>
        <FileMenu />
      </header>
      <main className="app-main">
        <PlanCanvas />
        <aside className="side-panel">
          <InputPanel />
          <InspectorPanel />
        </aside>
      </main>
      <StatusBar />
    </div>
  );
}
