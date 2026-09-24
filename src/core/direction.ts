import type { Direction, Vec2 } from './types';

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
