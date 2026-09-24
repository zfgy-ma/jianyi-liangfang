import { describe, expect, it } from 'vitest';
import { closureGap, lengthBetween } from './geometry';
import { locatePointOnWall } from './locate';
import { createOriginPoint, createProject, drawWall } from './project';
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

describe('沿已有墙按数值取点', () => {
  it('距起点 1500mm 处取到精确点，并记录来源', () => {
    const start = begin();
    const a = draw(start.project, start.pointId, 'E', 4000);
    const located = locatePointOnWall(a.project, a.wallId, 1500);
    expect(located).not.toBeNull();
    const point = located!.project.points[located!.pointId];
    expect([point.x, point.y]).toEqual([1500, 0]);
    expect(point.origin).toEqual({ kind: 'onWall', wallId: a.wallId, distance: 1500 });
  });

  it('取到同一位置时复用已有点，越界则返回空', () => {
    const start = begin();
    const a = draw(start.project, start.pointId, 'E', 4000);
    const first = locatePointOnWall(a.project, a.wallId, 1500)!;
    const second = locatePointOnWall(first.project, a.wallId, 1500)!;
    expect(second.pointId).toBe(first.pointId);
    expect(locatePointOnWall(a.project, a.wallId, 4001)).toBeNull();
  });
});
