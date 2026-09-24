import { directionOf, step } from './direction';
import { lengthBetween } from './geometry';
import type { PlanPoint, Project, Vec2, WallKind } from './types';

/** 沿链条平移下游所有点，锚点保持不动 */
function translateDownstream(
  project: Project,
  startPointId: string,
  excludeWallId: string,
  anchorPointId: string,
  delta: Vec2,
): Record<string, PlanPoint> {
  const points: Record<string, PlanPoint> = { ...project.points };
  const visited = new Set<string>([anchorPointId]);
  const queue: string[] = [startPointId];
  while (queue.length > 0) {
    const currentId = queue.shift() as string;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    const current = points[currentId];
    if (!current) continue;
    points[currentId] = { ...current, x: current.x + delta.x, y: current.y + delta.y };
    for (const wall of Object.values(project.walls)) {
      if (wall.id === excludeWallId) continue;
      if (wall.startPointId === currentId) queue.push(wall.endPointId);
      else if (wall.endPointId === currentId) queue.push(wall.startPointId);
    }
  }
  return points;
}

/**
 * 修改墙长：终点移动到新位置，后续墙体与点整体跟随平移。
 * 由此产生的不闭合交给闭合检查提示，这里绝不自动配平。
 */
export function updateWallLength(
  project: Project,
  wallId: string,
  newLength: number,
): Project {
  const wall = project.walls[wallId];
  if (!wall || newLength <= 0) return project;
  const start = project.points[wall.startPointId];
  const end = project.points[wall.endPointId];
  if (!start || !end) return project;
  const direction = directionOf(start, end);
  if (!direction) return project;
  const current = lengthBetween(start, end);
  if (current === newLength) return project;

  const target = step({ x: start.x, y: start.y }, direction, newLength);
  const delta = { x: target.x - end.x, y: target.y - end.y };
  const points = translateDownstream(
    project,
    wall.endPointId,
    wall.id,
    wall.startPointId,
    delta,
  );
  points[wall.endPointId] = {
    ...points[wall.endPointId],
    x: target.x,
    y: target.y,
    origin: {
      kind: 'step',
      fromPointId: wall.startPointId,
      direction,
      length: newLength,
    },
  };
  return { ...project, points, updatedAt: new Date().toISOString() };
}

export function flipWallOffsetSide(project: Project, wallId: string): Project {
  const wall = project.walls[wallId];
  if (!wall) return project;
  const offsetSide = wall.offsetSide === 'left' ? 'right' : 'left';
  return {
    ...project,
    walls: { ...project.walls, [wallId]: { ...wall, offsetSide } },
    updatedAt: new Date().toISOString(),
  };
}

export function setWallKind(project: Project, wallId: string, kind: WallKind): Project {
  const wall = project.walls[wallId];
  if (!wall) return project;
  const thickness =
    kind === 'outer' ? project.outerThickness : project.innerThickness;
  return {
    ...project,
    walls: { ...project.walls, [wallId]: { ...wall, kind, thickness } },
    updatedAt: new Date().toISOString(),
  };
}

export function setWallThickness(
  project: Project,
  wallId: string,
  thickness: number,
): Project {
  const wall = project.walls[wallId];
  if (!wall || thickness < 0) return project;
  return {
    ...project,
    walls: { ...project.walls, [wallId]: { ...wall, thickness } },
    updatedAt: new Date().toISOString(),
  };
}

/** 删除一段墙，同时清理它的洞口、区域引用与孤立端点 */
export function removeWall(project: Project, wallId: string): Project {
  const wall = project.walls[wallId];
  if (!wall) return project;
  const walls = { ...project.walls };
  delete walls[wallId];
  const openings = Object.fromEntries(
    Object.entries(project.openings).filter(([, opening]) => opening.wallId !== wallId),
  );
  const rooms = Object.fromEntries(
    Object.entries(project.rooms).map(([id, room]) => [
      id,
      { ...room, boundaryWallIds: room.boundaryWallIds.filter((id2) => id2 !== wallId) },
    ]),
  );
  const stillUsed = new Set<string>();
  for (const item of Object.values(walls)) {
    stillUsed.add(item.startPointId);
    stillUsed.add(item.endPointId);
  }
  const points = Object.fromEntries(
    Object.entries(project.points).filter(([id]) => stillUsed.has(id)),
  );
  return { ...project, walls, openings, rooms, points, updatedAt: new Date().toISOString() };
}
