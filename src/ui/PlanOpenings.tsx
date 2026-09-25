import { DIRECTION_VECTOR, directionOf } from '../core/direction';
import type { Opening, PointLike, Project, Vec2, Vec3, Wall } from '../core/types';
import { leftNormal } from '../core/wallOffset';
import { toScreen, type Viewport } from './viewport';

interface PlanOpeningsProps {
  project: Project;
  viewport: Viewport;
  selectedWallId: string | null;
  draftIds: Set<string>;
  conflictIds: Set<string>;
}

/** 沿墙推进一段距离后的世界坐标，保留原始高度 */
function along(start: PointLike, direction: Vec2, distance: number): Vec3 {
  return {
    x: start.x + direction.x * distance,
    y: start.y + direction.y * distance,
    z: start.z ?? 0,
  };
}

function offsetPoint(point: Vec3, normal: Vec2, distance: number): Vec3 {
  return {
    x: point.x + normal.x * distance,
    y: point.y + normal.y * distance,
    z: point.z,
  };
}

/** 门扇的开启弧线，用折线近似，避免受坐标翻转影响 */
function swingPoints(center: Vec2, from: Vec2, to: Vec2): Vec2[] {
  const startAngle = Math.atan2(from.y - center.y, from.x - center.x);
  const endAngle = Math.atan2(to.y - center.y, to.x - center.x);
  let delta = endAngle - startAngle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const radius = Math.hypot(from.x - center.x, from.y - center.y);
  const points: Vec2[] = [];
  for (let step = 0; step <= 12; step += 1) {
    const angle = startAngle + (delta * step) / 12;
    points.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  }
  return points;
}

export function PlanOpenings({
  project,
  viewport,
  selectedWallId,
  draftIds,
  conflictIds,
}: PlanOpeningsProps) {
  const sp = (point: Vec2) => toScreen(viewport, point);

  return (
    <g>
      {Object.values(project.walls).map((wall: Wall) => {
        const start = project.points[wall.startPointId];
        const end = project.points[wall.endPointId];
        if (!start || !end) return null;
        const direction = directionOf(start, end);
        if (!direction) {
          // 竖直方向的墙：投影后就是一段线，没有墙厚与门窗符号
          const from = sp(start);
          const to = sp(end);
          const verticalClass = [
            'wall-line',
            wall.isHelper ? 'wall-line-helper' : '',
            conflictIds.has(wall.id) ? 'wall-line-conflict' : '',
            selectedWallId === wall.id ? 'wall-line-selected' : '',
            draftIds.has(wall.id) ? 'wall-line-drafted' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <g key={wall.id}>
              <line
                className={verticalClass}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
              />
              <line
                className="wall-hit-line"
                data-wall-id={wall.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
              />
            </g>
          );
        }
        const unit = DIRECTION_VECTOR[direction];
        const normalSign = wall.offsetSide === 'left' ? 1 : -1;
        const baseNormal = leftNormal(start, end);
        const normal = { x: baseNormal.x * normalSign, y: baseNormal.y * normalSign };
        const depth = wall.thickness > 0 ? wall.thickness : 120;
        const wallLength = Math.hypot(end.x - start.x, end.y - start.y);

        const openings: Opening[] = Object.values(project.openings)
          .filter((opening) => opening.wallId === wall.id)
          .sort((left, right) => left.distance - right.distance);

        const segments: { from: number; to: number }[] = [];
        let cursor = 0;
        for (const opening of openings) {
          if (opening.distance > cursor) segments.push({ from: cursor, to: opening.distance });
          cursor = Math.max(cursor, opening.distance + opening.width);
        }
        if (cursor < wallLength) segments.push({ from: cursor, to: wallLength });

        const className = [
          'wall-line',
          wall.isHelper ? 'wall-line-helper' : '',
          conflictIds.has(wall.id) ? 'wall-line-conflict' : '',
          selectedWallId === wall.id ? 'wall-line-selected' : '',
          draftIds.has(wall.id) ? 'wall-line-drafted' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <g key={wall.id}>
            <rect
              className="wall-hit"
              x={Math.min(sp(start).x, sp(end).x) - 8}
              y={Math.min(sp(start).y, sp(end).y) - 8}
              width={Math.abs(sp(end).x - sp(start).x) + 16}
              height={Math.abs(sp(end).y - sp(start).y) + 16}
              data-wall-id={wall.id}
            />
            {segments.map((segment) => (
              <line
                key={`${wall.id}-${segment.from}`}
                className={className}
                x1={sp(along(start, unit, segment.from)).x}
                y1={sp(along(start, unit, segment.from)).y}
                x2={sp(along(start, unit, segment.to)).x}
                y2={sp(along(start, unit, segment.to)).y}
              />
            ))}
            {openings.map((opening) => {
              const left = along(start, unit, opening.distance);
              const right = along(start, unit, opening.distance + opening.width);
              if (opening.kind === 'window') {
                const outerLeft = offsetPoint(left, normal, depth);
                const outerRight = offsetPoint(right, normal, depth);
                const midLeft = offsetPoint(left, normal, depth / 2);
                const midRight = offsetPoint(right, normal, depth / 2);
                return (
                  <g key={opening.id} className="opening-window">
                    <line x1={sp(left).x} y1={sp(left).y} x2={sp(outerLeft).x} y2={sp(outerLeft).y} />
                    <line x1={sp(right).x} y1={sp(right).y} x2={sp(outerRight).x} y2={sp(outerRight).y} />
                    <line x1={sp(midLeft).x} y1={sp(midLeft).y} x2={sp(midRight).x} y2={sp(midRight).y} />
                  </g>
                );
              }
              const leafEnd = offsetPoint(left, normal, opening.width);
              const arc = swingPoints(left, leafEnd, right);
              return (
                <g key={opening.id} className="opening-door">
                  <line x1={sp(left).x} y1={sp(left).y} x2={sp(leafEnd).x} y2={sp(leafEnd).y} />
                  <polyline points={arc.map((point) => `${sp(point).x},${sp(point).y}`).join(' ')} />
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}
