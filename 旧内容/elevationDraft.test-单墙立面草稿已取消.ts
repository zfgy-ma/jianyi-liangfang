import { describe, expect, it } from 'vitest';
import {
  detectRectangle,
  drawElevationStroke,
  type ElevationDraft,
} from './elevationDraft';
import type { Direction } from './types';

function drawPath(start: { x: number; y: number }, path: [Direction, number][]) {
  return path.reduce<ElevationDraft>(
    (draft, [direction, length]) => drawElevationStroke(draft, direction, length),
    { point: start, segments: [] },
  );
}

describe('立面草稿围成矩形', () => {
  it('向上、向右、向下、向左四笔回到起点，判定为矩形', () => {
    const draft = drawPath(
      { x: 800, y: 900 },
      [
        ['N', 1500],
        ['E', 1200],
        ['S', 1500],
        ['W', 1200],
      ],
    );
    expect(detectRectangle(draft.segments)).toEqual({
      left: 800,
      bottom: 900,
      width: 1200,
      height: 1500,
    });
  });

  it('没闭合或笔数不足时不认为是矩形', () => {
    const open = drawPath(
      { x: 0, y: 0 },
      [
        ['N', 1500],
        ['E', 1200],
        ['S', 1500],
      ],
    );
    expect(detectRectangle(open.segments)).toBeNull();

    const zigzag = drawPath(
      { x: 0, y: 0 },
      [
        ['N', 1500],
        ['E', 1200],
        ['S', 1500],
        ['E', 1200],
      ],
    );
    expect(detectRectangle(zigzag.segments)).toBeNull();
  });
});
