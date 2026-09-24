import { lengthBetween, pointOnWall } from './geometry';
import { nextId } from './project';
import type { PlanPoint, Project, Vec2 } from './types';

/** 沿墙取点的常用快捷比例 */
export type LocateShortcut = 'middle' | 'third' | 'quarter';

export function shortcutDistance(length: number, shortcut: LocateShortcut): number {
  if (shortcut === 'middle') return Math.round(length / 2);
  if (shortcut === 'third') return Math.round(length / 3);
  return Math.round(length / 4);
}

function collectWallEnds(project: Project, wallId: string) {
  const wall = project.walls[wallId];
  if (!wall) return null;
  const start = project.points[wall.startPointId];
  const end = project.points[wall.endPointId];
  if (!start || !end) return null;
  return {
    wall,
    start: { x: start.x, y: start.y } as Vec2,
    end: { x: end.x, y: end.y } as Vec2,
    length: lengthBetween(start, end),
  };
}

/**
 * 沿已有墙按数值取点，得到的点带来源记录，可继续作为新线的起点。
 * 距离与两端点重合时直接复用已有点，避免重复点。
 */
export function locatePointOnWall(
  project: Project,
  wallId: string,
  distance: number,
): { project: Project; pointId: string } | null {
  const info = collectWallEnds(project, wallId);
  if (!info) return null;
  if (distance < 0 || distance > info.length) return null;
  const target = pointOnWall(info.start, info.end, distance);
  if (!target) return null;

  for (const point of Object.values(project.points)) {
    if (point.x === target.x && point.y === target.y) {
      return { project, pointId: point.id };
    }
  }

  const id = nextId(project.points, 'P');
  const point: PlanPoint = {
    id,
    x: target.x,
    y: target.y,
    origin: { kind: 'onWall', wallId, distance },
  };
  return {
    project: { ...project, points: { ...project.points, [id]: point } },
    pointId: id,
  };
}
