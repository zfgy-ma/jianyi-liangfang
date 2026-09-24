import { useEffect } from 'react';
import { saveProject } from './io/storage';
import { useProjectStore } from './store/useProjectStore';
import { FileMenu } from './ui/FileMenu';
import { ElevationCanvas } from './ui/ElevationCanvas';
import { InputPanel } from './ui/InputPanel';
import { InspectorPanel } from './ui/InspectorPanel';
import { NumberPad } from './ui/NumberPad';
import { OpeningPanel } from './ui/OpeningPanel';
import { PlanCanvas } from './ui/PlanCanvas';
import { RoomPanel } from './ui/RoomPanel';
import { StatusBar } from './ui/StatusBar';
import { TabBar } from './ui/TabBar';

export function App() {
  const project = useProjectStore((state) => state.history.present);
  const tab = useProjectStore((state) => state.tab);

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
        <TabBar />
        <FileMenu />
      </header>
      <main className="app-main">
        {tab === 'plan' ? <PlanCanvas /> : <ElevationCanvas />}
        <aside className="side-panel">
          {tab === 'plan' ? (
            <>
              <InputPanel />
              <RoomPanel />
              <InspectorPanel />
            </>
          ) : (
            <>
              <section className="panel">
                <header className="panel-header">
                  <span className="panel-title">数值键盘</span>
                </header>
                <NumberPad />
              </section>
              <OpeningPanel />
            </>
          )}
        </aside>
      </main>
      <StatusBar />
    </div>
  );
}
