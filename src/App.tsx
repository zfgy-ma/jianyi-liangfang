import { useEffect } from 'react';
import { saveProject } from './io/storage';
import { useProjectStore } from './store/useProjectStore';
import { FileMenu } from './ui/FileMenu';
import { AxonCanvas } from './ui/AxonCanvas';
import { ElevationCanvas } from './ui/ElevationCanvas';
import { FacadeCanvas } from './ui/FacadeCanvas';
import { InputPanel } from './ui/InputPanel';
import { InspectorPanel } from './ui/InspectorPanel';
import { NumberPad } from './ui/NumberPad';
import { OpeningPanel } from './ui/OpeningPanel';
import { PlanCanvas } from './ui/PlanCanvas';
import { ProjectPanel } from './ui/ProjectPanel';
import { RoomPanel } from './ui/RoomPanel';
import { StatusBar } from './ui/StatusBar';
import { TabBar } from './ui/TabBar';
import { exportDxf } from './io/files';

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
        {tab === 'plan' ? <PlanCanvas /> : null}
        {tab === 'elevation' ? <ElevationCanvas /> : null}
        {tab === 'facade' ? <FacadeCanvas /> : null}
        {tab === 'axon' ? <AxonCanvas /> : null}
        <aside className="side-panel">
          {tab === 'plan' ? (
            <>
              <InputPanel />
              <ProjectPanel />
              <RoomPanel />
              <InspectorPanel />
            </>
          ) : tab === 'elevation' ? (
            <>
              <section className="panel">
                <header className="panel-header">
                  <span className="panel-title">数值键盘</span>
                </header>
                <NumberPad />
              </section>
              <OpeningPanel />
            </>
          ) : (
            <section className="panel">
              <header className="panel-header">
                <span className="panel-title">出图</span>
              </header>
              <p className="hint">
                导出后每张视图各占一个图纸空间页：A3 横放、带图框与标题栏、比例自动选档。
                辅助定位线不会进入图纸。
              </p>
              <button
                type="button"
                className="tool-button tool-button-strong"
                onClick={() => exportDxf(project)}
              >
                导出 CAD 图纸（.dxf）
              </button>
            </section>
          )}
        </aside>
      </main>
      <StatusBar />
    </div>
  );
}
