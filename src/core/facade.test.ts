import { describe, expect, it } from 'vitest';
import { buildFacade, buildSilhouette, effectiveWallHeight } from './facade';
import { createOriginPoint, createProject, drawWall } from './project';
import { splitWallAt } from './split';
import type { Direction, OffsetSide, Project } from './types';

function draw(
  project: Project,
  fromPointId: string,
  direction: Direction,
  length: number,
  offsetSide: OffsetSide = 'right',
) {
  const result = drawWall(project, { fromPointId, direction, length, offsetSide });
  return { project: result.project, pointId: result.endPointId, wallId: result.wallId };
}

/** 10000 见方的外墙，加一道南北向内墙，用来验证投影合并 */
function squareWithInnerWall() {
  const origin = createOriginPoint(createProject('立面测试'), 0, 0);
  const south = draw(origin.project, origin.pointId, 'E', 10000);
  const east = draw(south.project, south.pointId, 'N', 10000);
  const north = draw(east.project, east.pointId, 'W', 10000);
  const west = draw(north.project, north.pointId, 'S', 10000);

  const split = splitWallAt(west.project, north.wallId, 5000);
  if ('error' in split) throw new Error(split.error);
  // 内墙朝东，投到东立面上与外墙完全重叠
  const inner = drawWall(split.project, {
    fromPointId: split.pointId,
    direction: 'S',
    length: 10000,
    kind: 'outer',
    offsetSide: 'left',
  });
  return { project: inner.project, wallId: inner.wallId };
}

describe('四向立面', () => {
  it('高度不同的两段墙求并集后，转角处留下台阶而不是被抹平', () => {
    const strips = buildSilhouette([
      { wallId: 'a', left: 0, width: 5000, height: 2800 },
      { wallId: 'b', left: 3000, width: 5000, height: 1800 },
    ]);
    expect(strips.map((strip) => [strip.left, strip.width, strip.height])).toEqual([
      [0, 5000, 2800],
      [5000, 3000, 1800],
    ]);
  });

  it('东立面把重叠与相接的墙合并成一条，不再 5000+10000+5000 叠加', () => {
    const { project } = squareWithInnerWall();
    const east = buildFacade(project, 'E');
    expect(east.walls).toHaveLength(1);
    expect(east.walls[0].width).toBe(10000);
    expect(east.totalWidth).toBe(10000);
  });

  it('立面高度跟着实际画的竖线走，而不是固定层高', () => {
    const { project, wallId } = squareWithInnerWall();
    const up = drawWall(project, {
      fromPointId: project.walls[wallId].startPointId,
      direction: 'U',
      length: 4200,
    });
    expect(up.wallId).not.toBe('');
    expect(effectiveWallHeight(up.project, up.project.walls[wallId])).toBe(4200);
  });
});
