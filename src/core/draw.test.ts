import { describe, expect, it } from 'vitest';
import { closureGap, divideDistance, lengthBetween } from './geometry';
import { createOriginPoint, createProject, drawWall } from './project';
import { addOpening } from './opening';
import { splitWallAt } from './split';
import type { Direction, Project } from './types';

/** 从一个有明确来源的原点开始，之后只给方向和长度 */
function begin() {
  const created = createOriginPoint(createProject('放线测试'), 0, 0);
  return { project: created.project, pointId: created.pointId };
}

function draw(
  project: Project,
  fromPointId: string,
  direction: Direction,
  length: number,
) {
  const result = drawWall(project, { fromPointId, direction, length });
  return { project: result.project, pointId: result.endPointId, wallId: result.wallId };
}

function wallLengths(project: Project): number[] {
  return Object.values(project.walls).map((wall) =>
    lengthBetween(project.points[wall.startPointId], project.points[wall.endPointId]),
  );
}

describe('按方向与长度落线', () => {
  it('向北 4000，坐标与长度都对得上', () => {
    const start = begin();
    const first = draw(start.project, start.pointId, 'N', 4000);
    const end = first.project.points[first.pointId];
    expect([end.x, end.y]).toEqual([0, 4000]);
    expect(lengthBetween(start.project.points[start.pointId], end)).toBe(4000);
  });

  it('绕一圈回到原点时复用同一个点，闭合差为零', () => {
    const start = begin();
    const a = draw(start.project, start.pointId, 'N', 3000);
    const b = draw(a.project, a.pointId, 'W', 4000);
    const c = draw(b.project, b.pointId, 'S', 3000);
    const d = draw(c.project, c.pointId, 'E', 4000);
    expect(d.pointId).toBe(start.pointId);
    expect(Object.keys(d.project.points)).toHaveLength(4);
    const gap = closureGap(d.project.points[d.pointId], d.project.points[start.pointId]);
    expect(gap.closed).toBe(true);
  });

  it('差 12mm 时只报差值，输入过的长度一个都不改', () => {
    const start = begin();
    const a = draw(start.project, start.pointId, 'N', 3000);
    const b = draw(a.project, a.pointId, 'W', 4000);
    const c = draw(b.project, b.pointId, 'S', 2988);
    const gap = closureGap(c.project.points[c.pointId], c.project.points[start.pointId]);
    expect(gap.dy).toBe(-12);
    expect(wallLengths(c.project)).toEqual([3000, 4000, 2988]);
  });

  it('长度为零或负数时不落线', () => {
    const start = begin();
    const result = drawWall(start.project, {
      fromPointId: start.pointId,
      direction: 'E',
      length: 0,
    });
    expect(result.wallId).toBe('');
    expect(Object.keys(result.project.walls)).toHaveLength(0);
  });
});

describe('沿已有墙按数值取点（会把原墙拆成两段）', () => {
  it('中点与等分距离按四舍五入取整', () => {
    expect(divideDistance(4000, 2)).toBe(2000);
    expect(divideDistance(4000, 3)).toBe(1333);
    expect(divideDistance(4001, 4)).toBe(1000);
  });

  it('距起点 1500mm 处取点：墙体断开，新端点可追溯', () => {
    const start = begin();
    const a = draw(start.project, start.pointId, 'E', 4000);
    const result = splitWallAt(a.project, a.wallId, 1500);
    if ('error' in result) throw new Error(result.error);
    expect(wallLengths(result.project)).toEqual([1500, 2500]);
    const point = result.project.points[result.pointId];
    expect([point.x, point.y]).toEqual([1500, 0]);
    expect(point.origin).toEqual({ kind: 'onWall', wallId: a.wallId, distance: 1500 });
  });

  it('洞口落在后半段时自动换算距离；压住洞口则报错不改数据', () => {
    const start = begin();
    const a = draw(start.project, start.pointId, 'E', 4000);
    const withWindow = addOpening(a.project, {
      wallId: a.wallId,
      kind: 'window',
      distance: 3000,
      width: 600,
      height: 1500,
      sillHeight: 900,
    });
    if ('error' in withWindow) throw new Error(withWindow.error);

    const split = splitWallAt(withWindow.project, a.wallId, 1500);
    if ('error' in split) throw new Error(split.error);
    const moved = Object.values(split.project.openings)[0];
    expect(moved.distance).toBe(1500);
    expect(moved.wallId).not.toBe(a.wallId);

    const blocked = splitWallAt(withWindow.project, a.wallId, 3200);
    expect(blocked).toHaveProperty('error');
    expect(splitWallAt(withWindow.project, a.wallId, 4001)).toHaveProperty('error');
  });
});
