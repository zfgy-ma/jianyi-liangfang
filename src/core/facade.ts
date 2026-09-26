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
  /** 墙底标高，通常为 0 */
  bottom: number;
  height: number;
}

/** 竖直方向线条（用户用"上/下"画的线）在立面上的投影 */
export interface FacadeVertical {
  wallId: string;
  x: number;
  bottom: number;
  top: number;
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
  /** 并集轮廓，用来填充建筑体量 */
  walls: FacadeWallRect[];
  /** 每面墙各自的投影矩形，用来画内部可见分隔线 */
  faces: FacadeWallRect[];
  /** 竖直方向线条的投影 */
  verticals: FacadeVertical[];
  openings: FacadeOpeningRect[];
}

/**
 * 墙高只有一个来源：这面墙自己的设定，没有就用工程统一层高。
 * 参考实现（furnishup/blueprint3d, src/model/wall.ts）：
 * 墙 = 起点 + 终点 + 显式墙厚 + 显式墙高，高度不从别的线条去猜。
 */
export function effectiveWallHeight(project: Project, wall: Wall): number {
  return wall.height ?? project.wallHeight;
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

    let bottom = Number.POSITIVE_INFINITY;
    let top = Number.NEGATIVE_INFINITY;
    let wallId = '';
    for (const rect of rects) {
      const covers =
        rect.left <= left + 1e-6 && rect.left + rect.width >= right - 1e-6;
      if (!covers) continue;
      bottom = Math.min(bottom, rect.bottom);
      if (rect.bottom + rect.height > top) {
        top = rect.bottom + rect.height;
        wallId = rect.wallId;
      }
    }
    if (!Number.isFinite(bottom) || !Number.isFinite(top) || top - bottom <= 0) {
      continue;
    }

    const last = strips[strips.length - 1];
    if (
      last &&
      Math.abs(last.bottom - bottom) < 1 &&
      Math.abs(last.bottom + last.height - top) < 1 &&
      Math.abs(last.left + last.width - left) < 1
    ) {
      last.width = right - last.left;
    } else {
      strips.push({ wallId, left, width: right - left, bottom, height: top - bottom });
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
    return {
      direction,
      label,
      totalWidth: 0,
      maxHeight: 0,
      walls: [],
      faces: [],
      verticals: [],
      openings: [],
    };
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
  const faces: FacadeWallRect[] = [];
  const verticals: FacadeVertical[] = [];
  const openings: FacadeOpeningRect[] = [];
  let maxHeight = 0;

  for (const wall of Object.values(project.walls)) {
    if (wall.isHelper) continue;
    const start = project.points[wall.startPointId];
    const end = project.points[wall.endPointId];
    if (!start || !end) continue;
    // 竖直方向的墙：在立面上就是一段竖线
    if (start.z !== end.z) {
      verticals.push({
        wallId: wall.id,
        x: horizontal(start),
        bottom: Math.min(start.z, end.z),
        top: Math.max(start.z, end.z),
      });
      maxHeight = Math.max(maxHeight, start.z, end.z);
      continue;
    }
    // 平面墙：只画朝向观察者的那一侧
    const normal = outwardNormal(project, wall);
    if (!normal || normal.x * view.x + normal.y * view.y <= 0) continue;
    const direction2 = directionOf(start, end);
    if (!direction2) continue;
    const height = effectiveWallHeight(project, wall);
    const bottom = start.z;
    maxHeight = Math.max(maxHeight, bottom + height);
    const startX = horizontal(start);
    const endX = horizontal(end);
    const rect: FacadeWallRect = {
      wallId: wall.id,
      left: Math.min(startX, endX),
      width: Math.abs(endX - startX),
      bottom,
      height,
    };
    walls.push(rect);
    faces.push(rect);

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
    faces,
    verticals,
    openings,
  };
}

/** 这面墙朝向哪个方向：观察者要站在这一侧才能看到它的正面 */
export function facingDirection(project: Project, wall: Wall): ViewDirection {
  const normal = outwardNormal(project, wall);
  if (!normal) return 'S';
  if (Math.abs(normal.x) >= Math.abs(normal.y)) {
    return normal.x >= 0 ? 'E' : 'W';
  }
  return normal.y >= 0 ? 'N' : 'S';
}

/**
 * 与这面墙共线、且首尾相连的整条墙链。
 * 选中的可能只是被拆开的一小段，切立面时必须把整条都算进去。
 */
export function connectedRun(project: Project, wallId: string): string[] {
  const wall = project.walls[wallId];
  if (!wall) return [];
  const head = project.points[wall.startPointId];
  const tail = project.points[wall.endPointId];
  if (!head || !tail) return [wallId];
  if (head.z !== tail.z) return [wallId];

  const horizontal = head.y === tail.y;
  const lineValue = horizontal ? head.y : head.x;
  const onSameLine = Object.values(project.walls).filter((item) => {
    if (item.isHelper) return false;
    const from = project.points[item.startPointId];
    const to = project.points[item.endPointId];
    if (!from || !to || from.z !== to.z) return false;
    return horizontal
      ? from.y === lineValue && to.y === lineValue
      : from.x === lineValue && to.x === lineValue;
  });

  const run = new Set<string>([wallId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const item of onSameLine) {
      if (run.has(item.id)) continue;
      const touches = [...run].some((id) => {
        const other = project.walls[id];
        if (!other) return false;
        return (
          other.startPointId === item.startPointId ||
          other.startPointId === item.endPointId ||
          other.endPointId === item.startPointId ||
          other.endPointId === item.endPointId
        );
      });
      if (touches) {
        run.add(item.id);
        grew = true;
      }
    }
  }
  return [...run];
}
