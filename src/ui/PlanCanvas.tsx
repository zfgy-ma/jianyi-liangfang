import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { PlanShapes } from './PlanShapes';
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

  const handleBackground = () => {
    selectWall(null);
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
        onClick={handleBackground}
      >
        <PlanShapes
          project={project}
          viewport={viewport}
          activePointId={activePointId}
          selectedWallId={selectedWallId}
          onPickPoint={(pointId) => selectPoint(pointId)}
          onPickWall={(wallId) => {
            if (roomPicking) toggleRoomWall(wallId);
            else selectWall(wallId);
          }}
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
