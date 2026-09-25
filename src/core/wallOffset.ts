import { DIRECTION_VECTOR, directionOf } from './direction';
import { add, intersectLines } from './geometry';
import type { OffsetSide, Project, Vec2, Vec3, Wall } from './types';

/** 沿墙方向求左法线；北为正 Y，故东向的左侧是北 */
export function leftNormal(from: Vec2, to: Vec2): Vec2 {
  const direction = directionOf(from, to);
  if (!direction) return { x: 0, y: 0 };
  const vector = DIRECTION_VECTOR[direction];
  return { x: -vector.y, y: vector.x };
}

/** 墙厚偏移向量 */
export function offsetVector(
  from: Vec2,
  to: Vec2,
  side: OffsetSide,
  thickness: number,
): Vec2 {
  const normal = leftNormal(from, to);
  const sign = side === 'left' ? 1 : -1;
  return { x: normal.x * thickness * sign, y: normal.y * thickness * sign };
}

export interface WallBody {
  wallId: string;
  /** 墙面四边形：原始起终点 + 偏移起终点，转角处已延伸相交 */
  polygon: Vec2[];
}

function endpoints(project: Project, wall: Wall): { start: Vec3; end: Vec3 } | null {
  const start = project.points[wall.startPointId];
  const end = project.points[wall.endPointId];
  if (!start || !end) return null;
  return {
    start: { x: start.x, y: start.y, z: start.z },
    end: { x: end.x, y: end.y, z: end.z },
  };
}

function neighborWalls(project: Project, pointId: string, excludeWallId: string): Wall[] {
  return Object.values(project.walls).filter(
    (wall) =>
      !wall.isHelper &&
      wall.id !== excludeWallId &&
      (wall.startPointId === pointId || wall.endPointId === pointId),
  );
}

/** 偏移线在转角处与邻墙偏移线求交，形成完整的 L 形转角 */
function cornerPoint(
  project: Project,
  wall: Wall,
  ends: { start: Vec2; end: Vec2 },
  pointId: string,
  offset: Vec2,
): Vec2 {
  const ownStart = add(ends.start, offset);
  const ownEnd = add(ends.end, offset);
  for (const neighbor of neighborWalls(project, pointId, wall.id)) {
    const other = endpoints(project, neighbor);
    if (!other) continue;
    const otherOffset = offsetVector(
      other.start,
      other.end,
      neighbor.offsetSide,
      neighbor.thickness,
    );
    const hit = intersectLines(
      ownStart,
      ownEnd,
      add(other.start, otherOffset),
      add(other.end, otherOffset),
    );
    if (hit) return hit;
  }
  const anchor = pointId === wall.endPointId ? ends.end : ends.start;
  return add(anchor, offset);
}

/** 生成所有实体的墙体轮廓，辅助定位线不参与 */
export function buildWallBodies(project: Project): WallBody[] {
  const bodies: WallBody[] = [];
  for (const wall of Object.values(project.walls)) {
    if (wall.isHelper || wall.thickness <= 0) continue;
    const ends = endpoints(project, wall);
    if (!ends) continue;
    // 竖直方向的墙是立面线条，不参与墙厚与转角
    if (ends.start.z !== ends.end.z) continue;
    const offset = offsetVector(ends.start, ends.end, wall.offsetSide, wall.thickness);
    bodies.push({
      wallId: wall.id,
      polygon: [
        ends.start,
        ends.end,
        cornerPoint(project, wall, ends, wall.endPointId, offset),
        cornerPoint(project, wall, ends, wall.startPointId, offset),
      ],
    });
  }
  return bodies;
}
