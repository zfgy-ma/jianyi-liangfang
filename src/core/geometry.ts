import { directionOf, step } from './direction';
import type { Vec2 } from './types';

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** 两点距离，四舍五入到整数毫米 */
export function lengthBetween(a: Vec2, b: Vec2): number {
  return Math.round(Math.hypot(b.x - a.x, b.y - a.y));
}

/** 在墙上按距起点的距离取点，越界返回 null */
export function pointOnWall(start: Vec2, end: Vec2, distance: number): Vec2 | null {
  const total = lengthBetween(start, end);
  if (distance < 0 || distance > total) return null;
  const direction = directionOf(start, end);
  if (!direction) return null;
  return step(start, direction, distance);
}

/** 等分距离：parts = 2 取中点，3 取三等分点，4 取四等分点 */
export function divideDistance(length: number, parts: number): number {
  if (parts <= 1) return length;
  return Math.round(length / parts);
}

/** 多边形有向面积，逆时针为正；单位平方毫米 */
export function polygonSignedArea(points: Vec2[]): number {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return sum / 2;
}

/** 多边形面积，单位平方毫米 */
export function polygonArea(points: Vec2[]): number {
  return Math.abs(polygonSignedArea(points));
}

/** 闭合差值：只报告差多少，不自动修正 */
export function closureGap(start: Vec2, end: Vec2) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return {
    dx,
    dy,
    distance: Math.round(Math.hypot(dx, dy)),
    closed: dx === 0 && dy === 0,
  };
}

/** 两条直线求交点，平行时返回 null；正交墙体的转角就靠它延伸相交 */
export function intersectLines(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): Vec2 | null {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  const denominator = d1x * d2y - d1y * d2x;
  if (denominator === 0) return null;
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / denominator;
  return { x: a1.x + d1x * t, y: a1.y + d1y * t };
}
