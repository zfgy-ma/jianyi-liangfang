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
    const direction2 = directionOf(start, end);
    if (!direction2) continue;
    const height = wall.height ?? project.wallHeight;
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

  return { direction, label, totalWidth, maxHeight, walls, openings };
}
