import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { PlanShapes } from './PlanShapes';
import { PlanGrid } from './PlanGrid';
import { fitViewport, toWorld, type Viewport } from './viewport';

const MIN_SCALE = 0.002;
const MAX_SCALE = 2;

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function PlanCanvas() {
  const project = useProjectStore((state) => state.history.present);
  const activePointId = useProjectStore((state) => state.activePointId);
  const selectedWallId = useProjectStore((state) => state.selectedWallId);
  const selectPoint = useProjectStore((state) => state.selectPoint);
  const selectWall = useProjectStore((state) => state.selectWall);
  const roomPicking = useProjectStore((state) => state.roomPicking);
  const roomDraft = useProjectStore((state) => state.roomDraft);
  const toggleRoomWall = useProjectStore((state) => state.toggleRoomWall);

  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);
  /** 记录按下时命中的图元，抬起时若没有拖动就当作点选 */
  const pendingTap = useRef<{
    pointId: string | null;
    wallId: string | null;
    x: number;
    y: number;
  } | null>(null);
  const [size, setSize] = useState({ width: 900, height: 620 });
  const [viewport, setViewport] = useState<Viewport>({
    centerX: 0,
    centerY: 0,
    scale: 0.05,
    width: 900,
    height: 620,
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
    setViewport(fitViewport(project, size.width, size.height));
  }, [project, size.width, size.height]);

  useEffect(() => {
    fit();
  }, [size.width, size.height]);

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
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
    const tap = pendingTap.current;
    const moved = tap ? Math.hypot(event.clientX - tap.x, event.clientY - tap.y) : 0;
    // 拖动过就不算点选，避免平移画布时误选
    if (tap && moved <= 8 && pointers.current.size === 1) {
      if (tap.pointId) {
        selectPoint(tap.pointId);
      } else if (tap.wallId) {
        if (roomPicking) toggleRoomWall(tap.wallId);
        else selectWall(tap.wallId);
      } else {
        selectWall(null);
      }
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
      const world = toWorld(current, anchor);
      const scale = clampScale(current.scale * (event.deltaY < 0 ? 1.12 : 0.89));
      return {
        ...current,
        scale,
        centerX: world.x - (anchor.x - current.width / 2) / scale,
        centerY: world.y + (anchor.y - current.height / 2) / scale,
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
      </div>
    </div>
  );
}
