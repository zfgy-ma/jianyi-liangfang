import { describe, expect, it } from 'vitest';
import {
  buildFacade,
  buildSilhouette,
  connectedRun,
  effectiveWallHeight,
  facingDirection,
} from './facade';
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
  it('选中线条决定切到哪一面立面', () => {
    const origin = createOriginPoint(createProject('朝向测试'), 0, 0);
    const south = draw(origin.project, origin.pointId, 'E', 5000, 'right');
    // 东西向、墙厚朝南 → 观察者站在南侧看
    expect(facingDirection(south.project, south.project.walls[south.wallId])).toBe('S');
  });

  it('被拆开的一小段也能还原成整条连通的墙', () => {
    const origin = createOriginPoint(createProject('连通测试'), 0, 0);
    const first = draw(origin.project, origin.pointId, 'E', 3000);
    const second = draw(first.project, first.pointId, 'E', 3000);
    const split = splitWallAt(second.project, first.wallId, 1500);
    if ('error' in split) throw new Error(split.error);
    const run = connectedRun(split.project, first.wallId);
    expect(run.length).toBe(3);
  });

  it('高度不同的两段墙求并集后，转角处留下台阶而不是被抹平', () => {
    const strips = buildSilhouette([
      { wallId: 'a', left: 0, width: 5000, bottom: 0, height: 2800 },
      { wallId: 'b', left: 3000, width: 5000, bottom: 0, height: 1800 },
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

  it('墙高只认自己的设定或工程层高，不被旁边画的竖线带偏', () => {
    const { project, wallId } = squareWithInnerWall();
    const up = drawWall(project, {
      fromPointId: project.walls[wallId].startPointId,
      direction: 'U',
      length: 16000,
    });
    expect(up.wallId).not.toBe('');
    // 关键回归：墙上贴着一根 16 米的竖线，也不该把墙高算成 16 米
    expect(effectiveWallHeight(up.project, up.project.walls[wallId])).toBe(
      up.project.wallHeight,
    );
    // 单独给这面墙设高度时才生效
    const taller = {
      ...up.project,
      walls: {
        ...up.project.walls,
        [wallId]: { ...up.project.walls[wallId], height: 3200 },
      },
    };
    expect(effectiveWallHeight(taller, taller.walls[wallId])).toBe(3200);
  });
});
