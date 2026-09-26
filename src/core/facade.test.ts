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

  it('墙厚方向标反也不漏立面：投影只认几何，不认偏移侧', () => {
    const origin = createOriginPoint(createProject('偏移测试'), 0, 0);
    const south = draw(origin.project, origin.pointId, 'E', 4700, 'left');
    const east = draw(south.project, south.pointId, 'N', 3500, 'left');
    const north = draw(east.project, east.pointId, 'W', 4700, 'right');
    const { project } = draw(north.project, north.pointId, 'S', 3500, 'right');

    const eastView = buildFacade(project, 'E');
    const westView = buildFacade(project, 'W');
    const northView = buildFacade(project, 'N');
    const southView = buildFacade(project, 'S');
    // 偏移侧朝内时，旧实现会把整面墙从立面上滤掉；新实现前后墙都在投影里
    expect(eastView.faces).toHaveLength(2);
    expect(eastView.faces[1].width).toBe(3500);
    expect(westView.faces).toHaveLength(2);
    expect(westView.faces[1].width).toBe(3500);
    expect(northView.faces).toHaveLength(2);
    expect(northView.faces[1].width).toBe(4700);
    expect(southView.faces).toHaveLength(2);
    expect(southView.faces[1].width).toBe(4700);
  });

  it('L 形错位外墙保留两条投影：远墙先画、近墙后画，转角不丢', () => {
    const origin = createOriginPoint(createProject('L 形'), 0, 0);
    const south = draw(origin.project, origin.pointId, 'E', 10750);
    const east = draw(south.project, south.pointId, 'N', 2602);
    const far = draw(east.project, east.pointId, 'W', 7200);
    const step = draw(far.project, far.pointId, 'N', 2798);
    const near = draw(step.project, step.pointId, 'W', 3550);
    const { project } = draw(near.project, near.pointId, 'S', 5400);

    // 给西段北墙单独加高，轮廓在转角处应留下台阶
    const taller = {
      ...project,
      walls: {
        ...project.walls,
        [near.wallId]: { ...project.walls[near.wallId], height: 3400 },
      },
    };
    const northView = buildFacade(taller, 'N');
    // 南墙（最远）、东段北墙、西段北墙（最近）都在投影里
    expect(northView.faces).toHaveLength(3);
    const nearest = northView.faces[northView.faces.length - 1];
    // 站在北侧时东在左手边，所以西段北墙落在立面右侧
    expect(nearest.left).toBe(7200);
    expect(nearest.width).toBe(3550);
    expect(nearest.depth).toBe(0);
    expect(northView.walls.map((wall) => [wall.left, wall.width, wall.height])).toEqual([
      [0, 7200, 2800],
      [7200, 3550, 3400],
    ]);
  });

  it('隐形定位线不参与立面包围盒，图纸不会被撑小', () => {
    const origin = createOriginPoint(createProject('隐形线测试'), 0, 0);
    const south = draw(origin.project, origin.pointId, 'E', 4700);
    const east = draw(south.project, south.pointId, 'N', 3500);
    const north = draw(east.project, east.pointId, 'W', 4700);
    const west = draw(north.project, north.pointId, 'S', 3500);
    const helper = drawWall(west.project, {
      fromPointId: west.pointId,
      direction: 'W',
      length: 1000,
      isHelper: true,
    });
    const view = buildFacade(helper.project, 'N');
    expect(view.totalWidth).toBe(4700);
    expect(view.faces).toHaveLength(2);
  });
});
