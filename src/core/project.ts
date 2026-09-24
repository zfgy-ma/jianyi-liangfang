import { step } from './direction';
import type {
  Direction,
  OffsetSide,
  PlanPoint,
  Project,
  Vec2,
  Wall,
  WallKind,
} from './types';

export const DEFAULT_WALL_HEIGHT = 2800;
export const DEFAULT_OUTER_THICKNESS = 240;
export const DEFAULT_INNER_THICKNESS = 100;

export function createProject(name = '未命名工程'): Project {
  const now = new Date().toISOString();
  return {
    id: 'PJ' + now.replace(/\D/g, '').slice(0, 14),
    name,
    wallHeight: DEFAULT_WALL_HEIGHT,
    outerThickness: DEFAULT_OUTER_THICKNESS,
    innerThickness: DEFAULT_INNER_THICKNESS,
    points: {},
    walls: {},
    openings: {},
    rooms: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function nextId(existing: Record<string, unknown>, prefix: string): string {
  let index = Object.keys(existing).length + 1;
  let id = prefix + String(index).padStart(3, '0');
  while (existing[id]) {
    index += 1;
    id = prefix + String(index).padStart(3, '0');
  }
  return id;
}

/** 查找落在指定坐标上的点，用于把新线接到已有端点上 */
export function findPointIdAt(project: Project, position: Vec2): string | null {
  for (const point of Object.values(project.points)) {
    if (point.x === position.x && point.y === position.y) return point.id;
  }
  return null;
}

export interface DrawWallInput {
  fromPointId: string;
  direction: Direction;
  length: number;
  isHelper?: boolean;
  kind?: WallKind;
  offsetSide?: OffsetSide;
}

export interface DrawResult {
  project: Project;
  /** 落线失败时为空字符串 */
  wallId: string;
  endPointId: string;
}

/**
 * 建立一个有明确来源的起始点。
 * 东南、东北、西南、西北只是原点的摆放位置与朝向习惯，不产生四个独立起点。
 */
export function createOriginPoint(
  project: Project,
  x: number,
  y: number,
): { project: Project; pointId: string } {
  const id = nextId(project.points, 'P');
  const point: PlanPoint = { id, x, y, origin: { kind: 'origin' } };
  return {
    project: { ...project, points: { ...project.points, [id]: point } },
    pointId: id,
  };
}

/**
 * 按方向与长度落一段线。
 * 终点若与已有端点重合则直接复用，形成闭合连接，不会产生重复点。
 */
export function drawWall(project: Project, input: DrawWallInput): DrawResult {
  const from = project.points[input.fromPointId];
  if (!from || input.length <= 0) {
    return { project, wallId: '', endPointId: input.fromPointId };
  }
  const target = step({ x: from.x, y: from.y }, input.direction, input.length);
  const kind: WallKind = input.kind ?? (input.isHelper ? 'inner' : 'outer');
  const thickness =
    kind === 'outer' ? project.outerThickness : project.innerThickness;

  const points: Record<string, PlanPoint> = { ...project.points };
  const existingId = findPointIdAt(project, target);
  const endPointId = existingId ?? nextId(points, 'P');
  if (!existingId) {
    points[endPointId] = {
      id: endPointId,
      x: target.x,
      y: target.y,
      origin: {
        kind: 'step',
        fromPointId: input.fromPointId,
        direction: input.direction,
        length: input.length,
      },
    };
  }

  const wallId = nextId(project.walls, 'W');
  const wall: Wall = {
    id: wallId,
    startPointId: input.fromPointId,
    endPointId,
    kind,
    offsetSide: input.offsetSide ?? 'right',
    thickness,
    isHelper: Boolean(input.isHelper),
  };

  return {
    project: {
      ...project,
      points,
      walls: { ...project.walls, [wallId]: wall },
      updatedAt: new Date().toISOString(),
    },
    wallId,
    endPointId,
  };
}
