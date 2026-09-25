/**
 * 界面结构测试：在真实 DOM 里渲染组件，确认手机端布局的关键元素没有丢。
 * @vitest-environment happy-dom
 */
import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { buildFacade } from '../core/facade';
import { createOriginPoint, createProject, drawWall } from '../core/project';
import type { Direction, OffsetSide, Project } from '../core/types';
import { useProjectStore } from '../store/useProjectStore';
import { App } from '../App';
import { Dock } from './Dock';
import { AxisGizmo } from './AxisGizmo';
import { FacadeCanvas } from './FacadeCanvas';
import { PlanCanvas } from './PlanCanvas';
import { PlanGrid } from './PlanGrid';
import { TabBar } from './TabBar';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

/** 模拟屏幕宽度，用来分别验证桌面端与手机端两套布局 */
function mockViewport(isDesktop: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: isDesktop,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/** 渲染到内存 DOM 并取回 HTML 结构 */
function render(element: ReactElement): string {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  const html = container.innerHTML;
  act(() => {
    root.unmount();
  });
  container.remove();
  return html;
}

function draw(
  project: Project,
  fromPointId: string,
  direction: Direction,
  length: number,
  offsetSide: OffsetSide = 'right',
) {
  const result = drawWall(project, { fromPointId, direction, length, offsetSide });
  return { project: result.project, pointId: result.endPointId };
}

/** 一圈外墙，用来验证四向立面 */
function closedRoom(): Project {
  const origin = createOriginPoint(createProject('界面测试'), 0, 0);
  const south = draw(origin.project, origin.pointId, 'E', 4000);
  const east = draw(south.project, south.pointId, 'N', 3000);
  const north = draw(east.project, east.pointId, 'W', 4000);
  const west = draw(north.project, north.pointId, 'S', 3000);
  return west.project;
}

describe('界面结构', () => {
  it('方向指盘含上下两键，立体墙有入口', () => {
    useProjectStore.getState().setTab('plan');
    const html = render(<Dock />);
    expect(html).toContain('data-direction="U"');
    expect(html).toContain('data-direction="D"');
    expect(html).toContain('视角');
    expect(html).toContain('区域');
    // 上、下两键在十字下方，只占高度
    expect(html).toContain('direction-vertical');
    // 锁定按钮已经移到画布右下角，不再占操作坞
    expect(html).not.toContain('平面已锁');
  });

  it('标签页是平面、三维、等轴测、四向立面', () => {
    const html = render(<TabBar />);
    expect(html).toContain('平面图');
    expect(html).toContain('三维');
    expect(html).toContain('等轴测');
    expect(html).toContain('四向立面');
    expect(html).not.toContain('单墙立面');
  });

  it('平面网格按 100mm 铺开，视角太平时不画网格', () => {
    const viewport = {
      centerX: 0,
      centerY: 0,
      scale: 0.05,
      width: 800,
      height: 600,
      yaw: 0,
      pitch: 90,
    };
    const html = render(<PlanGrid viewport={viewport} />);
    expect(html).toContain('grid-line');
    expect((html.match(/<line/g) ?? []).length).toBeGreaterThan(10);
    expect(render(<PlanGrid viewport={{ ...viewport, pitch: 0 }} />)).toBe('');
  });

  it('平面画布渲染出网格与可点选的墙体', () => {
    useProjectStore.getState().replaceProject(closedRoom());
    useProjectStore.getState().setTab('plan');
    const html = render(<PlanCanvas preset={{ yaw: 0, pitch: 90 }} showLock />);
    expect(html).toContain('plan-canvas');
    expect(html).toContain('plan-grid');
    expect(html).toContain('data-wall-id');
    expect(html).toContain('data-point-id');
    // 平面锁定按钮在画布右下角，是个图标按钮
    expect(html).toContain('data-lock-state="locked"');
  });

  it('四向立面永远四个框，某一侧没墙也留空框', () => {
    useProjectStore.getState().replaceProject(createProject('空工程'));
    const html = render(<FacadeCanvas />);
    expect((html.match(/facade-badge/g) ?? []).length).toBe(4);
    expect(html).toContain('facade-empty-frame');
    expect(html).toContain('这一侧没有外墙');
  });

  it('立面尺寸数字坐在断开的尺寸线中间', () => {
    useProjectStore.getState().replaceProject(closedRoom());
    const html = render(<FacadeCanvas />);
    expect(html).toContain('facade-dimension');
    expect(html).toContain('facade-length');
  });

  it('方位指示器只画东、南、上三根彩色轴', () => {
    const html = render(
      <AxisGizmo
        viewport={{
          centerX: 0,
          centerY: 0,
          scale: 1,
          width: 800,
          height: 600,
          yaw: 0,
          pitch: 45,
        }}
      />,
    );
    expect(html).toContain('东');
    expect(html).toContain('南');
    expect(html).toContain('上');
    expect(html).not.toContain('西');
    expect(html).not.toContain('北');
    expect(html).not.toContain('下');
  });

  it('平面视角下不显示上下指示', () => {
    const html = render(
      <AxisGizmo
        viewport={{
          centerX: 0,
          centerY: 0,
          scale: 1,
          width: 800,
          height: 600,
          yaw: 0,
          pitch: 90,
        }}
      />,
    );
    expect(html).toContain('东');
    expect(html).toContain('南');
    // 正俯视时“上”正对观察者，投影成一个点，直接不画
    expect(html).not.toContain('上');
  });

  it('平面锁定默认开启，可以切换', () => {
    expect(useProjectStore.getState().planLocked).toBe(true);
    useProjectStore.getState().togglePlanLock();
    expect(useProjectStore.getState().planLocked).toBe(false);
    useProjectStore.getState().togglePlanLock();
    expect(useProjectStore.getState().planLocked).toBe(true);
  });

  it('桌面端走右侧常驻面板，手机端走底部操作坞', () => {
    const original = window.matchMedia;
    try {
      mockViewport(true);
      const desktop = render(<App />);
      expect(desktop).toContain('side-column');
      expect(desktop).toContain('dock-desktop');
      expect(desktop).not.toContain('class="dock"');

      mockViewport(false);
      const mobile = render(<App />);
      expect(mobile).toContain('class="dock"');
      expect(mobile).not.toContain('side-column');
    } finally {
      window.matchMedia = original;
    }
  });

  it('四向立面卡片带方位标记与逐段长度', () => {
    useProjectStore.getState().replaceProject(closedRoom());
    expect(buildFacade(closedRoom(), 'E').walls).toHaveLength(1);
    expect(Object.keys(useProjectStore.getState().history.present.walls)).toHaveLength(4);
    const html = render(<FacadeCanvas />);
    expect(html).toContain('facade-badge');
    expect(html).toContain('facade-length');
    expect(html).toContain('东立面');
    expect(html).toContain('北立面');
    expect(html).toContain('总宽');
  });

  it('切到出图页时不渲染操作坞，操作坞不会占屏幕', () => {
    useProjectStore.getState().setTab('facade');
    expect(useProjectStore.getState().tab).toBe('facade');
    expect(render(<Dock />)).toBe('');
    useProjectStore.getState().setTab('plan');
  });
});
