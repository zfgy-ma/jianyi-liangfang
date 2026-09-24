import { step } from './direction';
import type { Direction, Vec2 } from './types';

export interface ElevationSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ElevationRect {
  left: number;
  bottom: number;
  width: number;
  height: number;
}

/** 立面草稿：一个当前落笔点 + 已经画出的线段 */
export interface ElevationDraft {
  point: Vec2;
  segments: ElevationSegment[];
}

/** 立面坐标系里：北＝向上、东＝向右，与平面方向保持一致 */
export function drawElevationStroke(
  draft: ElevationDraft,
  direction: Direction,
  length: number,
): ElevationDraft {
  const next = step(draft.point, direction, length);
  return {
    point: next,
    segments: [
      ...draft.segments,
      { x1: draft.point.x, y1: draft.point.y, x2: next.x, y2: next.y },
    ],
  };
}

/**
 * 判断最后四笔是否首尾相接、围成一个正交矩形。
 * 成立时返回矩形范围（左下角 + 宽高），供“标记为洞口”使用。
 */
export function detectRectangle(segments: ElevationSegment[]): ElevationRect | null {
  if (segments.length < 4) return null;
  const last = segments.slice(-4);

  for (let index = 1; index < last.length; index += 1) {
    if (last[index].x1 !== last[index - 1].x2 || last[index].y1 !== last[index - 1].y2) {
      return null;
    }
  }
  if (last[3].x2 !== last[0].x1 || last[3].y2 !== last[0].y1) return null;

  const horizontal = last.filter((segment) => segment.y1 === segment.y2).length;
  const vertical = last.filter((segment) => segment.x1 === segment.x2).length;
  if (horizontal !== 2 || vertical !== 2) return null;

  const xs = last.flatMap((segment) => [segment.x1, segment.x2]);
  const ys = last.flatMap((segment) => [segment.y1, segment.y2]);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const bottom = Math.min(...ys);
  const top = Math.max(...ys);
  if (right === left || top === bottom) return null;

  return { left, bottom, width: right - left, height: top - bottom };
}
