/**
 * 界面结构测试：在真实 DOM 里渲染组件，确认手机端布局的关键元素没有丢。
 * @vitest-environment happy-dom
 */
import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { buildFacade } from '../core/facade';
import { buildWallBodies } from '../core/wallOffset';
import { createOriginPoint, createProject, drawWall } from '../core/project';
import type { Direction, OffsetSide, Project } from '../core/types';
import { useProjectStore } from '../store/useProjectStore';
import { App } from '../App';
import { Dock } from './Dock';
import { AxisGizmo } from './AxisGizmo';
import { FacadeCanvas } from './FacadeCanvas';
import { PlanCanvas } from './PlanCanvas';
import { PlanGrid } from './PlanGrid';
import { PlanShapes } from './PlanShapes';
import { ProjectPanel } from './ProjectPanel';
import { TabBar } from './TabBar';
import { fitViewport, toScreen } from './viewport';

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

/** 渲染并保留容器，便于模拟点击 */
function renderInteractive(element: ReactElement) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return {
    click: (selector: string) => {
      const node = container.querySelector(selector);
      if (!node) throw new Error(`找不到元素：${selector}`);
      act(() => {
        node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
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
    expect(html).toContain('区域');
    // 上、下两键在十字下方，只占高度
    expect(html).toContain('direction-vertical');
    // 锁定按钮已经移到画布右下角，不再占操作坞
    expect(html).not.toContain('平面已锁');
    // 视角按钮已删除，"工程"与顶部菜单重复，也不再出现在操作坞里
    expect(html).not.toContain('>视角<');
    expect(html).not.toContain('>工程<');
  });

  it('点“区域”把键盘区换成区域卡片，画布不被遮住', () => {
    useProjectStore.getState().setTab('plan');
    useProjectStore.getState().setDockPanel('input');
    const view = renderInteractive(<Dock />);
    view.click('button[data-panel="rooms"]');
    expect(useProjectStore.getState().dockPanel).toBe('rooms');
    view.unmount();
  });

  it('撤销与重做按钮真的在改数据', () => {
    useProjectStore.getState().newProject('撤销测试', 'SE');
    const store = useProjectStore.getState();
    store.pressDirection('N');
    store.pressDigit('3000');
    store.confirmDraw();
    expect(Object.keys(useProjectStore.getState().history.present.walls)).toHaveLength(1);

    useProjectStore.getState().setTab('plan');
    const view = renderInteractive(<Dock />);
    view.click('button[data-action="undo"]');
    expect(Object.keys(useProjectStore.getState().history.present.walls)).toHaveLength(0);
    view.click('button[data-action="redo"]');
    expect(Object.keys(useProjectStore.getState().history.present.walls)).toHaveLength(1);
    view.unmount();
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
    // 标准视图切换按钮就在适配视图旁边
    expect(html).toContain('切到东向');
    // 线条按方向分色：这个户型有东西向的墙
    expect(html).toContain('wall-line-ew');
    // 长度数字字号是算出来的内联值，会跟着缩放等比变化
    // 数字与线条同色，且字号是算出来的内联值，会跟着缩放等比变化
    expect(html).toMatch(/class="wall-length wall-length-ew"[^>]*font-size=/);
  });

  it('工程面板改成直接输入，三个“用键盘数值”按钮已删除', () => {
    const html = render(<ProjectPanel />);
    expect(html).toContain('统一层高');
    expect(html).toContain('外墙厚度');
    expect(html).toContain('prop-input');
    expect(html).not.toContain('用键盘数值设为层高');
    expect(html).not.toContain('用键盘数值设为外墙厚');
    expect(html).not.toContain('把外墙厚应用到所有外墙');
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

  it('方位指示器只画东、北、上三根彩色轴', () => {
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
    expect(html).toContain('北');
    expect(html).toContain('上');
    expect(html).not.toContain('南');
    expect(html).not.toContain('西');
    expect(html).not.toContain('下');
    // 线条本身也要带颜色，不能只有箭头有颜色
    expect(html).toContain('stroke="#c9453a"');
    expect(html).toContain('stroke="#3c8b4a"');
    expect(html).toContain('stroke="#2f6fd0"');
  });

  it('画布左上角标出当前看的是哪一面，而且三维场景始终在', () => {
    useProjectStore.getState().replaceProject(closedRoom());
    const plan = render(<PlanCanvas preset={{ yaw: 0, pitch: 90 }} showLock />);
    expect(plan).toContain('canvas-face-label');
    expect(plan).toContain('平面图');

    // 切到东向：标签跟着变，场景仍是可旋转的三维画布（不是静态二维图）
    const east = render(<PlanCanvas preset={{ yaw: 90, pitch: 0 }} />);
    expect(east).toContain('东向');
    expect(east).toContain('plan-canvas');
    expect(east).toContain('wall-solid-ew');
  });

  it('四张立面共用同一图幅，且墙高有标注', () => {
    useProjectStore.getState().replaceProject(closedRoom());
    const html = render(<FacadeCanvas />);
    // 旋转 90 度的竖向尺寸文字就是墙高标注
    expect(html).toContain('rotate(-90');
    const viewBoxes = [...html.matchAll(/viewBox="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(viewBoxes).toHaveLength(4);
    // 同样的长度在四张图上必须画成一样长，所以图幅只能有一个
    expect(new Set(viewBoxes).size).toBe(1);
  });

  it('三维与等轴测视图把墙挤出体量：有顶面与竖棱', () => {
    const project = closedRoom();
    const viewport = {
      centerX: 0,
      centerY: 0,
      scale: 0.05,
      width: 800,
      height: 600,
      yaw: 45,
      pitch: 35.264,
    };
    const html = render(
      <PlanShapes
        project={project}
        viewport={viewport}
        activePointId={null}
        selectedWallId={null}
        draftWallIds={[]}
        extrude
      />,
    );
    expect(html).toContain('wall-top');
    expect(html).toContain('wall-edge');
    expect(html).toContain('wall-solid-ew');
    // 竖直侧面必须画出来：少了它，转到平视立面时只剩几根竖棱，看着就是空的
    expect(html).toContain('wall-side');
    const sideCount = (html.match(/class="wall-side"/g) ?? []).length;
    expect(sideCount).toBeGreaterThanOrEqual(16);
  });

  it('转到平视立面时画面仍被墙体占满，不会缩成一小块', () => {
    const project = closedRoom();
    const width = 400;
    const height = 700;
    const viewport = fitViewport(project, width, height, 90, 0);
    const projected: { x: number; y: number }[] = [];
    for (const body of buildWallBodies(project)) {
      for (const corner of body.polygon) {
        for (const z of [0, project.wallHeight]) {
          projected.push(toScreen(viewport, { ...corner, z }));
        }
      }
    }
    const xs = projected.map((point) => point.x);
    const ys = projected.map((point) => point.y);
    const spanX = (Math.max(...xs) - Math.min(...xs)) / width;
    const spanY = (Math.max(...ys) - Math.min(...ys)) / height;
    // 至少一个方向撑到画布的六成以上，另一个也不能塌成一条线
    expect(Math.max(spanX, spanY)).toBeGreaterThan(0.6);
    expect(Math.min(spanX, spanY)).toBeGreaterThan(0.2);
  });

  it('上下方向的线条也有居中长度文字', () => {
    const origin = createOriginPoint(createProject('竖线测试'), 0, 0);
    const up = drawWall(origin.project, {
      fromPointId: origin.pointId,
      direction: 'U',
      length: 4200,
    });
    const html = render(
      <PlanShapes
        project={up.project}
        viewport={{
          centerX: 0,
          centerY: 0,
          scale: 0.05,
          width: 800,
          height: 600,
          yaw: 45,
          pitch: 35.264,
        }}
        activePointId={null}
        selectedWallId={null}
        draftWallIds={[]}
      />,
    );
    expect(html).toContain('wall-length-ud');
    expect(html).toContain('4200');
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
    expect(html).toContain('北');
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
