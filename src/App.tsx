import { useEffect, useRef, useState } from 'react';
import { listProjects, saveProject } from './io/storage';
import { useProjectStore } from './store/useProjectStore';
import { FileMenu } from './ui/FileMenu';
import { Dock } from './ui/Dock';
import { FacadeCanvas } from './ui/FacadeCanvas';
import { InspectorPanel } from './ui/InspectorPanel';
import { OpeningPanel } from './ui/OpeningPanel';
import { PlanCanvas } from './ui/PlanCanvas';
import { ProjectPanel } from './ui/ProjectPanel';
import { RoomPanel } from './ui/RoomPanel';
import { StatusBar } from './ui/StatusBar';
import { TabBar } from './ui/TabBar';
import { useIsDesktop } from './ui/useIsDesktop';
import { useKeyboardInput } from './ui/useKeyboardInput';
import { ISO_VIEW, PLAN_VIEW, THREE_VIEW } from './ui/viewport';

export function App() {
  const project = useProjectStore((state) => state.history.present);
  const tab = useProjectStore((state) => state.tab);
  const planLocked = useProjectStore((state) => state.planLocked);
  const isDesktop = useIsDesktop();
  useKeyboardInput(isDesktop);
  const replaceProject = useProjectStore((state) => state.replaceProject);
  const [sideWidth, setSideWidth] = useState(380);
  const draggingSplitter = useRef(false);
  const restoredRef = useRef(false);

  // 打开网页时自动载入最近编辑的工程；只有当前还是空白工程才会覆盖
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    void (async () => {
      try {
        const projects = await listProjects();
        const latest = projects[0];
        if (!latest) return;
        const current = useProjectStore.getState().history.present;
        if (Object.keys(current.walls).length > 0) return;
        replaceProject(latest);
      } catch {
        // 本地存储不可用时保持空白工程，不影响画图
      }
    })();
  }, [replaceProject]);

  // 桌面端左右分栏：拖动中间的分隔条自由调整右侧宽度
  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!draggingSplitter.current) return;
      const next = window.innerWidth - event.clientX;
      setSideWidth(Math.min(760, Math.max(260, next)));
    };
    const handleUp = () => {
      draggingSplitter.current = false;
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, []);

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
          <PlanCanvas preset={PLAN_VIEW} lockRotation={planLocked} showLock />
        ) : null}
        {tab === 'three' ? <PlanCanvas preset={THREE_VIEW} /> : null}
        {tab === 'iso' ? <PlanCanvas preset={ISO_VIEW} /> : null}
        {tab === 'facade' ? <FacadeCanvas /> : null}
        {isDesktop ? (
          <>
            <div
              className="splitter"
              role="separator"
              aria-label="调整右侧面板宽度"
              onPointerDown={() => {
                draggingSplitter.current = true;
              }}
            />
            <aside className="side-column" style={{ width: sideWidth }}>
              <Dock variant="desktop" />
              <ProjectPanel />
              <RoomPanel />
              <InspectorPanel />
              <OpeningPanel />
            </aside>
          </>
        ) : null}
      </main>
      <StatusBar />
      {isDesktop ? null : <Dock />}
    </div>
  );
}
