import { useEffect } from 'react';
import { saveProject } from './io/storage';
import { useProjectStore } from './store/useProjectStore';
import { FileMenu } from './ui/FileMenu';
import { Dock } from './ui/Dock';
import { FacadeCanvas } from './ui/FacadeCanvas';
import { InspectorPanel } from './ui/InspectorPanel';
import { OpeningPanel } from './ui/OpeningPanel';
import { PlanCanvas } from './ui/PlanCanvas';
import { ProjectPanel } from './ui/ProjectPanel';
import { RoomPanel } from './ui/RoomPanel';
import { Sheet } from './ui/Sheet';
import { StatusBar } from './ui/StatusBar';
import { TabBar } from './ui/TabBar';
import { useIsDesktop } from './ui/useIsDesktop';
import { ISO_VIEW, PLAN_VIEW, THREE_VIEW } from './ui/viewport';

export function App() {
  const project = useProjectStore((state) => state.history.present);
  const tab = useProjectStore((state) => state.tab);
  const planLocked = useProjectStore((state) => state.planLocked);
  const isDesktop = useIsDesktop();

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
          <span className="brand-title">简易量房</span>
          <span className="brand-project">{project.name}</span>
        </div>
        <TabBar />
        <FileMenu />
      </header>
      <main className="app-main">
        {tab === 'plan' ? (
          <PlanCanvas preset={PLAN_VIEW} lockRotation={planLocked} />
        ) : null}
        {tab === 'three' ? <PlanCanvas preset={THREE_VIEW} snapYaw /> : null}
        {tab === 'iso' ? <PlanCanvas preset={ISO_VIEW} /> : null}
        {tab === 'facade' ? <FacadeCanvas /> : null}
        {isDesktop ? (
          <aside className="side-column">
            <Dock variant="desktop" />
            <ProjectPanel />
            <RoomPanel />
            <InspectorPanel />
            <OpeningPanel />
          </aside>
        ) : (
          <Sheet />
        )}
      </main>
      <StatusBar />
      {isDesktop ? null : <Dock />}
    </div>
  );
}
