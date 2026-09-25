import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { PlanShapes } from './PlanShapes';
import { PlanGrid } from './PlanGrid';
import { AxisGizmo } from './AxisGizmo';
import { resolveTap, type PendingTap } from './tap';
import {
  fitViewport,
  screenToView,
  snapYawToCardinal,
  snapView,
  type Viewport,
} from './viewport';

const MIN_SCALE = 0.002;
const MAX_SCALE = 2;

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

  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);
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

  useEffect(() => {
    // 切换视图或画布尺寸变化时按预设重新取景；工程内容变化不动视角
    setViewport(fitViewport(project, size.width, size.height, preset.yaw, preset.pitch));
  }, [size.width, size.height, preset.yaw, preset.pitch]);

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
    }
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, next);

    if (rotating.current) {
      const yawStep = (next.x - previous.x) * 0.4;
      const pitchStep = (next.y - previous.y) * 0.4;
      setViewport((current) => ({
        ...current,
        yaw: current.yaw + yawStep,
        pitch: Math.max(0, Math.min(90, current.pitch - pitchStep)),
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
      setViewport((current) => ({ ...current, scale: clampScale(current.scale * factor) }));
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
    if (pointers.current.size < 2) pinchDistance.current = null;
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

  const scaleLabel =
    viewport.scale >= 1 ? '1:1' : `1:${Math.round(1 / viewport.scale)}`;

  return (
    <div className="canvas-wrap" ref={containerRef}>
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
        />
      </svg>
      <div className="canvas-tools">
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
            onClick={togglePlanLock}
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
    </div>
  );
}
