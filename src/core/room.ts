import { lengthBetween, polygonArea } from './geometry';
import type { Project, Room, Vec2, Wall } from './types';

function wallEnds(project: Project, wall: Wall): { start: Vec2; end: Vec2 } | null {
  const start = project.points[wall.startPointId];
  const end = project.points[wall.endPointId];
  if (!start || !end) return null;
  return { start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y } };
}

/**
 * 把手动圈定的墙按顺序拼成闭合多边形。
 * 相邻墙必须首尾相接，拼不上返回 null，绝不猜测。
 */
export function buildRoomPolygon(project: Project, room: Room): Vec2[] | null {
  const walls = room.boundaryWallIds
    .map((id) => project.walls[id])
    .filter((wall): wall is Wall => Boolean(wall));
  if (walls.length < 3) return null;

  const first = wallEnds(project, walls[0]);
  if (!first) return null;
  const polygon: Vec2[] = [
    { x: first.start.x, y: first.start.y },
    { x: first.end.x, y: first.end.y },
  ];
  let cursor = walls[0].endPointId;

  for (let index = 1; index < walls.length; index += 1) {
    const wall = walls[index];
    const ends = wallEnds(project, wall);
    if (!ends) return null;
    if (wall.startPointId === cursor) {
      polygon.push({ x: ends.end.x, y: ends.end.y });
      cursor = wall.endPointId;
    } else if (wall.endPointId === cursor) {
      polygon.push({ x: ends.start.x, y: ends.start.y });
      cursor = wall.startPointId;
    } else {
      return null;
    }
  }

  if (cursor !== walls[0].startPointId) return null;
  const last = polygon[polygon.length - 1];
  if (last.x === polygon[0].x && last.y === polygon[0].y) polygon.pop();
  return polygon.length >= 3 ? polygon : null;
}

/** 房间净面积，单位平方毫米；无法闭合时返回 null */
export function roomArea(project: Project, room: Room): number | null {
  const polygon = buildRoomPolygon(project, room);
  return polygon ? polygonArea(polygon) : null;
}

/** 墙面毛面积：墙长乘墙高 */
export function wallGrossArea(project: Project, wall: Wall): number {
  const ends = wallEnds(project, wall);
  if (!ends) return 0;
  const height = wall.height ?? project.wallHeight;
  return lengthBetween(ends.start, ends.end) * height;
}

/** 墙面净面积：毛面积减去本墙所有洞口 */
export function wallNetArea(project: Project, wall: Wall): number {
  const openings = Object.values(project.openings).filter(
    (opening) => opening.wallId === wall.id,
  );
  const deduct = openings.reduce(
    (sum, opening) => sum + opening.width * opening.height,
    0,
  );
  return Math.max(0, wallGrossArea(project, wall) - deduct);
}

/** 平方毫米转平方米 */
export function toSquareMeters(squareMillimeters: number): number {
  return squareMillimeters / 1_000_000;
}

/** 面积显示，保留两位小数 */
export function formatArea(squareMillimeters: number): string {
  return toSquareMeters(squareMillimeters).toFixed(2);
}
