import { buildFacade, connectedRun, facingDirection } from '../core/facade';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { PlanShapes } from './PlanShapes';
import { PlanGrid } from './PlanGrid';
import { AxisGizmo } from './AxisGizmo';
import { resolveTap, type PendingTap } from './tap';
import { rotateCamera } from './rotation';
import {
  fitViewport,
  nearestStandardView,
  nextStandardView,
  isElevationView,
  STANDARD_VIEW_OF_DIRECTION,
  screenToView,
  STANDARD_VIEWS,
  snapYawToCardinal,
  snapView,
  type Viewport,
} from './viewport';

/** 缩放上下限：放大到 1mm 能占几十像素，缩到能看整栋房子 */
const MIN_SCALE = 0.0002;
const MAX_SCALE = 60;

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function PlanCanvas({
  preset,
  lockRotation = false,
  snapYaw = false,
  showLock = false,
}: {
  /** 进入这个视图时使用的初始视角 */
  preset: { yaw: number; pitch: number };
  /** 锁定视角：不能旋转，只能平移缩放 */
  lockRotation?: boolean;
  /** 水平方向锁在东西南北四个正方向 */
  snapYaw?: boolean;
  /** 在画布右下角显示平面锁定按钮 */
  showLock?: boolean;
}) {
  const project = useProjectStore((state) => state.history.present);
  const activePointId = useProjectStore((state) => state.activePointId);
  const selectedWallId = useProjectStore((state) => state.selectedWallId);
  const selectPoint = useProjectStore((state) => state.selectPoint);
  const selectWall = useProjectStore((state) => state.selectWall);
  const roomPicking = useProjectStore((state) => state.roomPicking);
  const roomDraft = useProjectStore((state) => state.roomDraft);
  const toggleRoomWall = useProjectStore((state) => state.toggleRoomWall);
  const rotateMode = useProjectStore((state) => state.rotateMode);
  const planLocked = useProjectStore((state) => state.planLocked);
  const togglePlanLock = useProjectStore((state) => state.togglePlanLock);
  const setCamera = useProjectStore((state) => state.setCamera);
  const setNotice = useProjectStore((state) => state.setNotice);
  const notice = useProjectStore((state) => state.notice);
  const elevationFromOutside = useProjectStore((state) => state.elevationFromOutside);
  const toggleElevationSide = useProjectStore((state) => state.toggleElevationSide);

  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);
  /** 双指中点，用来把双指拖动解释成旋转视角 */
  const pinchMid = useRef<{ x: number; y: number } | null>(null);
  /** 正在旋转视角：中键拖动，或手机上的旋转模式 */
  const rotating = useRef(false);
  /** 记录按下时命中的图元，抬起时若没有拖动就当作点选 */
  const pendingTap = useRef<PendingTap | null>(null);
  const [size, setSize] = useState({ width: 900, height: 620 });
  const [viewport, setViewport] = useState<Viewport>({
    centerX: 0,
    centerY: 0,
    scale: 0.05,
    width: 900,
    height: 620,
    yaw: preset.yaw,
    pitch: preset.pitch,
  });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fit = useCallback(() => {
    setViewport((current) =>
      fitViewport(project, size.width, size.height, current.yaw, current.pitch),
    );
  }, [project, size.width, size.height]);

  // 切换视图、画布尺寸变化、或换成另一个工程（例如刷新后自动载入）时按预设重新取景
  const fitKey = `${project.id}|${size.width}x${size.height}|${preset.yaw}x${preset.pitch}`;
  useEffect(() => {
    setViewport(fitViewport(project, size.width, size.height, preset.yaw, preset.pitch));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, selectedWallId]);

  // 相机同步到 store：方向键据此决定哪些键置灰不可点
  useEffect(() => {
    setCamera({ yaw: viewport.yaw, pitch: viewport.pitch });
  }, [viewport.yaw, viewport.pitch, setCamera]);

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    // 中键旋转；手机上用“视角”开关把单指拖动切成旋转
    if (
      !lockRotation &&
      (event.button === 1 || (rotateMode && event.pointerType !== 'mouse'))
    ) {
      rotating.current = true;
      event.preventDefault();
    }
    const target = event.target as Element;
    pendingTap.current = {
      pointId: target.getAttribute('data-point-id'),
      wallId: target.getAttribute('data-wall-id'),
      x: event.clientX,
      y: event.clientY,
    };
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      pinchDistance.current = Math.hypot(first.x - second.x, first.y - second.y);
      pinchMid.current = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      };
    }
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, next);

    if (rotating.current) {
      setViewport((current) => ({
        ...current,
        ...rotateCamera(current, next.x - previous.x, next.y - previous.y, {
        }),
      }));
      return;
    }

    if (pointers.current.size === 1) {
      setViewport((current) => ({
        ...current,
        centerX: current.centerX - (next.x - previous.x) / current.scale,
        centerY: current.centerY + (next.y - previous.y) / current.scale,
      }));
      return;
    }

    if (pointers.current.size === 2 && pinchDistance.current) {
      const [first, second] = [...pointers.current.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      const factor = distance / pinchDistance.current;
      pinchDistance.current = distance;
      const midX = (first.x + second.x) / 2;
      const midY = (first.y + second.y) / 2;
      const previousMid = pinchMid.current ?? { x: midX, y: midY };
      pinchMid.current = { x: midX, y: midY };
      setViewport((current) => {
        const scale = clampScale(current.scale * factor);
        // 锁定视角时双指只负责缩放；否则双指拖动顺带旋转
        if (lockRotation) return { ...current, scale };
        return {
          ...current,
          scale,
          ...rotateCamera(current, midX - previousMid.x, midY - previousMid.y, {
          }),
        };
      });
    }
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (rotating.current) {
      rotating.current = false;
      setViewport((current) => {
        const snapped = snapView(current.yaw, current.pitch);
        return {
          ...current,
          ...snapped,
          yaw: snapYaw ? snapYawToCardinal(snapped.yaw) : snapped.yaw,
        };
      });
      pendingTap.current = null;
      pointers.current.delete(event.pointerId);
      if (pointers.current.size < 2) pinchDistance.current = null;
      return;
    }
    const tapped = resolveTap(
      pendingTap.current,
      { clientX: event.clientX, clientY: event.clientY },
      pointers.current.size,
    );
    if (tapped?.kind === 'point') {
      selectPoint(tapped.id);
    } else if (tapped?.kind === 'wall') {
      if (roomPicking) toggleRoomWall(tapped.id);
      else selectWall(tapped.id);
    } else if (tapped?.kind === 'clear') {
      selectWall(null);
    }
    pendingTap.current = null;
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) {
      pinchDistance.current = null;
      pinchMid.current = null;
    }
  };

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    setViewport((current) => {
      const view = screenToView(current, anchor);
      const scale = clampScale(current.scale * (event.deltaY < 0 ? 1.12 : 0.89));
      return {
        ...current,
        scale,
        centerX: view.x - (anchor.x - current.width / 2) / scale,
        centerY: view.y - (anchor.y - current.height / 2) / scale,
      };
    });
  };

  const currentViewKey = nearestStandardView(viewport.yaw, viewport.pitch);

  /** 快捷视图按钮：平面图 → 东 → 南 → 西 → 北循环；只转相机，不需要选线 */
  const cycleStandardView = () => {
    const next = nextStandardView(currentViewKey);
    const target = STANDARD_VIEWS[next];
    setViewport(fitViewport(project, size.width, size.height, target.yaw, target.pitch));
    setNotice(`已切到${target.label}`);
  };

  /** 点锁定：先回到离当前最近的平面正视图，再锁住旋转 */
  const handleLockToggle = () => {
    const nextLocked = !planLocked;
    togglePlanLock();
    if (!nextLocked) return;
    const nearest = nearestStandardView(viewport.yaw, viewport.pitch);
    // 没选线就不能切到立面视角，退回平面图
    const key = isElevationView(nearest) && !selectedWallId ? 'plan' : nearest;
    const target = STANDARD_VIEWS[key];
    setViewport(fitViewport(project, size.width, size.height, target.yaw, target.pitch));
  };

  // 立面视角：不再用三维相机，而是把建筑朝该方向压平成二维立面图
  /** “立面”按钮：切到选中线条所在的那一面立面 */
  const goToWallElevation = () => {
    const wall = selectedWallId ? project.walls[selectedWallId] : null;
    if (!wall) {
      setNotice('请先点选一条线条，再点“立面”');
      return;
    }
    const direction = facingDirection(project, wall);
    const run = connectedRun(project, wall.id);
    const view = buildFacade(project, direction);
    const target = STANDARD_VIEWS[STANDARD_VIEW_OF_DIRECTION[direction]];
    // 从墙的正面看，默认站在室外
    if (!elevationFromOutside) toggleElevationSide();
    // 只把相机转到那一面，场景仍是三维的，中键随时可以继续转
    setViewport(fitViewport(project, size.width, size.height, target.yaw, target.pitch));
    setNotice(
      run.length > 1
        ? `已切到${view.label}，这条线所在的整面墙（共 ${run.length} 段）都算进来了`
        : `已切到${view.label}`,
    );
  };

  /** 立面视角从内看 / 从外看：把相机绕到墙的另一侧 */
  const flipElevationSide = () => {
    const next = !elevationFromOutside;
    toggleElevationSide();
    setViewport((current) =>
      fitViewport(project, size.width, size.height, current.yaw + 180, current.pitch),
    );
    setNotice(next ? '已切到从内往外看' : '已切到从外往里看');
  };

  const scaleLabel =
    viewport.scale >= 1 ? '1:1' : `1:${Math.round(1 / viewport.scale)}`;

  // 当前看的是哪一面：贴近标准视角就报名字，否则就是自由视角
  const standardView = STANDARD_VIEWS[currentViewKey];
  const yawGap = Math.min(
    Math.abs(viewport.yaw - standardView.yaw),
    360 - Math.abs(viewport.yaw - standardView.yaw),
  );
  const nearStandard =
    Math.abs(viewport.pitch - standardView.pitch) <= 8 && yawGap <= 8;
  const inElevation = isElevationView(currentViewKey);
  const faceLabel = nearStandard
    ? `${standardView.label}${inElevation ? (elevationFromOutside ? ' · 从外看' : ' · 从内看') : ''}`
    : '自由视角';

  return (
    <div className="canvas-wrap" ref={containerRef}>
      <div className="canvas-face-label" data-face={currentViewKey}>
        {faceLabel}
      </div>
      <svg
        className="plan-canvas"
        width={size.width}
        height={size.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <PlanGrid viewport={viewport} />
        <PlanShapes
          project={project}
          viewport={viewport}
          activePointId={activePointId}
          selectedWallId={selectedWallId}
          draftWallIds={roomDraft}
          extrude={viewport.pitch < 88}
        />
      </svg>
      <div className="canvas-tools">
        <button type="button" className="tool-button" onClick={cycleStandardView}>
          切到{STANDARD_VIEWS[nextStandardView(currentViewKey)].label}
        </button>
        <button type="button" className="tool-button" onClick={goToWallElevation}>
          立面
        </button>
        {inElevation ? (
          <button
            type="button"
            className="tool-button"
            title="点击切换到墙的另一侧"
            onClick={flipElevationSide}
          >
            视角：{elevationFromOutside ? '从外看' : '从内看'}
          </button>
        ) : null}
        <button type="button" className="tool-button" onClick={fit}>
          适配视图
        </button>
        <span className="scale-label">{scaleLabel}</span>
        {showLock ? (
          <button
            type="button"
            className={planLocked ? 'icon-button icon-button-active' : 'icon-button'}
            title={
              planLocked
                ? '平面视角已锁定，点一下解锁后可以旋转'
                : '平面视角可旋转，点一下锁定'
            }
            aria-label="锁定平面视角"
            aria-pressed={planLocked}
            data-lock-state={planLocked ? 'locked' : 'unlocked'}
            onClick={handleLockToggle}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="4" y="11" width="16" height="10" rx="2" />
              {planLocked ? (
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              ) : (
                <path d="M8 11V7a4 4 0 0 1 7.5-2" />
              )}
            </svg>
          </button>
        ) : null}
      </div>
      <div className="axis-overlay">
        <AxisGizmo viewport={viewport} />
      </div>
      {notice ? (
        <div className="canvas-notice" role="alert">
          <span>{notice}</span>
          <button type="button" className="tool-button" onClick={() => setNotice('')}>
            知道了
          </button>
        </div>
      ) : null}
    </div>
  );
}
