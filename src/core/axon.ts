import { DIRECTION_VECTOR, directionOf } from './direction';
import type { Project } from './types';
import { buildWallBodies } from './wallOffset';

export interface AxonLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  layer: 'WALL' | 'OPENING';
}

export interface AxonDrawing {
  lines: AxonLine[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface Point3 {
  x: number;
  y: number;
  z: number;
}

/** 等轴测投影：平面按角度展开，Z 轴竖直向上 */
export function isometric(point: Point3, angleDeg = 30): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: (point.x - point.y) * Math.cos(rad),
    y: (point.x + point.y) * Math.sin(rad) - point.z,
  };
}

/**
 * 轴测线框图：外墙体量 + 洞口轮廓，不做消隐。
 * 线条重合与内部轮廓同正常线框表现一致。
 */
export function buildAxon(project: Project, angleDeg = 30): AxonDrawing {
  const lines: AxonLine[] = [];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const push = (from: Point3, to: Point3, layer: AxonLine['layer']) => {
    const first = isometric(from, angleDeg);
    const second = isometric(to, angleDeg);
    lines.push({ x1: first.x, y1: first.y, x2: second.x, y2: second.y, layer });
    for (const point of [first, second]) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
  };

  for (const body of buildWallBodies(project)) {
    const wall = project.walls[body.wallId];
    if (!wall) continue;
    const height = wall.height ?? project.wallHeight;
    const plan = body.polygon;
    for (let index = 0; index < plan.length; index += 1) {
      const current = plan[index];
      const next = plan[(index + 1) % plan.length];
      push({ ...current, z: 0 }, { ...next, z: 0 }, 'WALL');
      push({ ...current, z: height }, { ...next, z: height }, 'WALL');
      push({ ...current, z: 0 }, { ...current, z: height }, 'WALL');
    }

    const start = project.points[wall.startPointId];
    const end = project.points[wall.endPointId];
    if (!start || !end) continue;
    const direction = directionOf(start, end);
    if (!direction) continue;
    const unit = DIRECTION_VECTOR[direction];
    for (const opening of Object.values(project.openings)) {
      if (opening.wallId !== wall.id) continue;
      const at = (distance: number, z: number): Point3 => ({
        x: start.x + unit.x * distance,
        y: start.y + unit.y * distance,
        z,
      });
      const lower = opening.sillHeight;
      const upper = opening.sillHeight + opening.height;
      const left = opening.distance;
      const right = opening.distance + opening.width;
      const corners = [
        at(left, lower),
        at(right, lower),
        at(right, upper),
        at(left, upper),
      ];
      for (let index = 0; index < corners.length; index += 1) {
        push(corners[index], corners[(index + 1) % corners.length], 'OPENING');
      }
    }
  }

  // 用户用上下方向手画的立面线条（含离地高度不为零的线段）也进轴测图
  for (const wall of Object.values(project.walls)) {
    const start = project.points[wall.startPointId];
    const end = project.points[wall.endPointId];
    if (!start || !end) continue;
    if (start.z === 0 && end.z === 0) continue;
    push(
      { x: start.x, y: start.y, z: start.z },
      { x: end.x, y: end.y, z: end.z },
      'WALL',
    );
  }

  if (lines.length === 0) {
    return { lines, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return { lines, minX, minY, maxX, maxY };
}
