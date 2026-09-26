import { DIRECTION_VECTOR, directionOf } from './direction';
import type { OpeningKind, Project, Vec2, Wall } from './types';
import { leftNormal } from './wallOffset';

/** 观察者所在的方位 */
export type ViewDirection = 'E' | 'S' | 'W' | 'N';

export const VIEW_LABEL: Record<ViewDirection, string> = {
  E: '东立面',
  S: '南立面',
  W: '西立面',
  N: '北立面',
};

export interface FacadeWallRect {
  wallId: string;
  left: number;
  width: number;
  height: number;
}

export interface FacadeOpeningRect {
  id: string;
  wallId: string;
  kind: OpeningKind;
  left: number;
  width: number;
  bottom: number;
  height: number;
}

export interface FacadeView {
  direction: ViewDirection;
  label: string;
  totalWidth: number;
  maxHeight: number;
  walls: FacadeWallRect[];
  openings: FacadeOpeningRect[];
}

/**
 * 墙体实际高度：工程层高、单墙设定、以及与它的端点相连的竖直线上沿，
 * 三者取最大。这样在平面上用"上"画的墙高会如实反映到立面里。
 */
export function effectiveWallHeight(project: Project, wall: Wall): number {
  let height = Math.max(project.wallHeight, wall.height ?? 0);
  const ends = [wall.startPointId, wall.endPointId];
  for (const other of Object.values(project.walls)) {
    if (other.id === wall.id) continue;
    if (!ends.includes(other.startPointId) && !ends.includes(other.endPointId)) {
      continue;
    }
    const from = project.points[other.startPointId];
    const to = project.points[other.endPointId];
    if (!from || !to || from.z === to.z) continue;
    height = Math.max(height, from.z, to.z);
  }
  return height;
}

/**
 * 立面轮廓：把每面墙的投影矩形求并集。
 * 按所有端点把横向切成竖条、每条取最高，再把等高且相邻的条合并——
 * 这样宽度不会叠加，高度变化处会自然留下转角竖线，而不是被压成一个方块。
 */
export function buildSilhouette(rects: FacadeWallRect[]): FacadeWallRect[] {
  if (rects.length === 0) return [];
  const edges = Array.from(
    new Set(rects.flatMap((rect) => [rect.left, rect.left + rect.width])),
  ).sort((left, right) => left - right);

  const strips: FacadeWallRect[] = [];
  for (let index = 0; index < edges.length - 1; index += 1) {
    const left = edges[index];
    const right = edges[index + 1];
    if (right - left <= 0) continue;

    let height = 0;
    let wallId = '';
    for (const rect of rects) {
      const covers =
        rect.left <= left + 1e-6 && rect.left + rect.width >= right - 1e-6;
      if (covers && rect.height > height) {
        height = rect.height;
        wallId = rect.wallId;
      }
    }
    if (height <= 0) continue;

    const last = strips[strips.length - 1];
    if (
      last &&
      Math.abs(last.height - height) < 1 &&
      Math.abs(last.left + last.width - left) < 1
    ) {
      last.width = right - last.left;
    } else {
      strips.push({ wallId, left, width: right - left, height });
    }
  }
  return strips;
}

/** 墙体外侧法线：指向室外，也就是墙厚偏移的方向 */
export function outwardNormal(project: Project, wall: Wall): Vec2 | null {
  const start = project.points[wall.startPointId];
  const end = project.points[wall.endPointId];
  if (!start || !end) return null;
  const base = leftNormal(start, end);
  const sign = wall.offsetSide === 'left' ? 1 : -1;
  return { x: base.x * sign, y: base.y * sign };
}

const VIEW_VECTOR: Record<ViewDirection, Vec2> = {
  E: { x: 1, y: 0 },
  W: { x: -1, y: 0 },
  N: { x: 0, y: 1 },
  S: { x: 0, y: -1 },
};

/**
 * 生成立面投影：只取朝向观察者的外墙。
 * 横向轴按「观察者面向建筑时的左手边在立面左侧」排列，与单墙立面的规则一致。
 */
export function buildFacade(project: Project, direction: ViewDirection): FacadeView {
  const label = VIEW_LABEL[direction];
  const points = Object.values(project.points);
  if (points.length === 0) {
    return { direction, label, totalWidth: 0, maxHeight: 0, walls: [], openings: [] };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const horizontal = (position: Vec2): number => {
    if (direction === 'E') return position.y - minY;
    if (direction === 'W') return maxY - position.y;
    if (direction === 'S') return position.x - minX;
    return maxX - position.x;
  };

  const totalWidth =
    direction === 'E' || direction === 'W' ? maxY - minY : maxX - minX;
  const view = VIEW_VECTOR[direction];
  const walls: FacadeWallRect[] = [];
  const openings: FacadeOpeningRect[] = [];
  let maxHeight = 0;

  for (const wall of Object.values(project.walls)) {
    if (wall.isHelper || wall.thickness <= 0) continue;
    const normal = outwardNormal(project, wall);
    if (!normal) continue;
    if (normal.x * view.x + normal.y * view.y <= 0) continue;
    const start = project.points[wall.startPointId];
    const end = project.points[wall.endPointId];
    // 竖直方向的墙是立面线条，不参与平面立面投影
    if (start.z !== end.z) continue;
    const direction2 = directionOf(start, end);
    if (!direction2) continue;
    const height = effectiveWallHeight(project, wall);
    maxHeight = Math.max(maxHeight, height);
    const startX = horizontal(start);
    const endX = horizontal(end);
    walls.push({
      wallId: wall.id,
      left: Math.min(startX, endX),
      width: Math.abs(endX - startX),
      height,
    });

    const unit = DIRECTION_VECTOR[direction2];
    for (const opening of Object.values(project.openings)) {
      if (opening.wallId !== wall.id) continue;
      const atStart = {
        x: start.x + unit.x * opening.distance,
        y: start.y + unit.y * opening.distance,
      };
      const atEnd = {
        x: start.x + unit.x * (opening.distance + opening.width),
        y: start.y + unit.y * (opening.distance + opening.width),
      };
      const first = horizontal(atStart);
      const second = horizontal(atEnd);
      openings.push({
        id: opening.id,
        wallId: wall.id,
        kind: opening.kind,
        left: Math.min(first, second),
        width: Math.abs(second - first),
        bottom: opening.sillHeight,
        height: opening.height,
      });
    }
  }

  return {
    direction,
    label,
    totalWidth,
    maxHeight,
    walls: buildSilhouette(walls),
    openings,
  };
}
