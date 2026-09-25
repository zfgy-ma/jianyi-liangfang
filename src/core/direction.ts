import type { Direction, MoveDirection, Vec2, Vec3 } from './types';

export const DIRECTION_LABEL: Record<Direction, string> = {
  E: '东',
  S: '南',
  W: '西',
  N: '北',
};

/** 内部坐标北为正 Y，东为正 X；渲染时再翻转 Y */
export const DIRECTION_VECTOR: Record<Direction, Vec2> = {
  E: { x: 1, y: 0 },
  W: { x: -1, y: 0 },
  N: { x: 0, y: 1 },
  S: { x: 0, y: -1 },
};

export const ALL_DIRECTIONS: Direction[] = ['N', 'E', 'S', 'W'];

export const MOVE_DIRECTIONS: MoveDirection[] = ['N', 'E', 'S', 'W', 'U', 'D'];

export const MOVE_LABEL: Record<MoveDirection, string> = {
  E: '东',
  S: '南',
  W: '西',
  N: '北',
  U: '上',
  D: '下',
};

/** 由两点推出方向，非正交时返回 null */
export function directionOf(from: Vec2, to: Vec2): Direction | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return null;
  if (dy === 0) return dx > 0 ? 'E' : 'W';
  if (dx === 0) return dy > 0 ? 'N' : 'S';
  return null;
}

/** 按方向与长度推算出新坐标 */
export function step(from: Vec2, direction: Direction, length: number): Vec2 {
  const vector = DIRECTION_VECTOR[direction];
  return { x: from.x + vector.x * length, y: from.y + vector.y * length };
}

/** 空间落笔：上、下改变高度，其余四向在平面内移动 */
export function step3(from: Vec3, direction: MoveDirection, length: number): Vec3 {
  if (direction === 'U') return { x: from.x, y: from.y, z: from.z + length };
  if (direction === 'D') return { x: from.x, y: from.y, z: from.z - length };
  const vector = DIRECTION_VECTOR[direction];
  return {
    x: from.x + vector.x * length,
    y: from.y + vector.y * length,
    z: from.z,
  };
}

/** 由两点推出落笔方向，非正交或零长度时返回 null */
export function direction3Of(from: Vec3, to: Vec3): MoveDirection | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  if (dx === 0 && dy === 0 && dz === 0) return null;
  if (dx === 0 && dy === 0) return dz > 0 ? 'U' : 'D';
  if (dz !== 0) return null;
  return directionOf(from, to);
}
