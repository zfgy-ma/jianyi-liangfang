import { directionOf, step } from './direction';
import { lengthBetween } from './geometry';
import { findPointIdAt, nextId } from './project';
import type { PlanPoint, Project } from './types';

export interface SplitResult {
  project: Project;
  pointId: string;
}

/** 在墙上插入真实端点并拆成两段，失败时返回中文原因 */
export function splitWallAt(
  project: Project,
  wallId: string,
  distance: number,
): SplitResult | { error: string } {
  const wall = project.walls[wallId];
  if (!wall) return { error: '找不到这段墙' };
  const start = project.points[wall.startPointId];
  const end = project.points[wall.endPointId];
  if (!start || !end) return { error: '墙体端点数据不完整' };

  const length = lengthBetween(start, end);
  if (distance <= 0 || distance >= length) {
    return { error: `取点距离要落在 0 到 ${length} 之间，两端点可直接选用` };
  }

  const openings = Object.values(project.openings).filter(
    (opening) => opening.wallId === wallId,
  );
  const straddling = openings.find(
    (opening) => opening.distance < distance && opening.distance + opening.width > distance,
  );
  if (straddling) {
    return { error: `洞口 ${straddling.id} 正好压在这个位置，请先调整洞口` };
  }

  const direction = directionOf(start, end);
  if (!direction) return { error: '这段墙已经不是正交方向，请先修正' };
  const target = step(start, direction, distance);

  const points: Record<string, PlanPoint> = { ...project.points };
  const existingId = findPointIdAt(project, target);
  const pointId = existingId ?? nextId(points, 'P');
  if (!existingId) {
    points[pointId] = {
      id: pointId,
      x: target.x,
      y: target.y,
      origin: { kind: 'onWall', wallId, distance },
    };
  }

  const newWallId = nextId(project.walls, 'W');
  const walls = {
    ...project.walls,
    // 原墙保留前半段，后墙接上后半段，两端共用同一个真实端点
    [wallId]: { ...wall, endPointId: pointId },
    [newWallId]: { ...wall, id: newWallId, startPointId: pointId },
  };

  const nextOpenings = { ...project.openings };
  for (const opening of openings) {
    if (opening.distance >= distance) {
      nextOpenings[opening.id] = {
        ...opening,
        wallId: newWallId,
        distance: opening.distance - distance,
      };
    }
  }

  const rooms = Object.fromEntries(
    Object.entries(project.rooms).map(([id, room]) => [
      id,
      {
        ...room,
        boundaryWallIds: room.boundaryWallIds.flatMap((item) =>
          item === wallId ? [wallId, newWallId] : [item],
        ),
      },
    ]),
  );

  return {
    project: {
      ...project,
      points,
      walls,
      openings: nextOpenings,
      rooms,
      updatedAt: new Date().toISOString(),
    },
    pointId,
  };
}
