import { describe, expect, it } from 'vitest';
import { buildFacade } from '../core/facade';
import { addOpening } from '../core/opening';
import { createOriginPoint, createProject, drawWall } from '../core/project';
import { formatArea, roomArea } from '../core/room';
import { splitWallAt } from '../core/split';
import type { Direction, OffsetSide, Project, Room } from '../core/types';
import { buildAreaCsv } from './csv';
import { buildProjectDxf } from './dxfSheets';

function draw(
  project: Project,
  fromPointId: string,
  direction: Direction,
  length: number,
  offsetSide: OffsetSide = 'right',
  isHelper = false,
) {
  const result = drawWall(project, {
    fromPointId,
    direction,
    length,
    offsetSide,
    isHelper,
  });
  return { project: result.project, pointId: result.endPointId, wallId: result.wallId };
}

/** 一套两室户型：6000×4000 外墙，中间一道内墙，共用一个 T 形端点 */
function twoRoomProject() {
  const origin = createOriginPoint(createProject('两室户型'), 0, 0);
  const south = draw(origin.project, origin.pointId, 'E', 6000);
  const east = draw(south.project, south.pointId, 'N', 4000);
  const north = draw(east.project, east.pointId, 'W', 6000);
  const west = draw(north.project, north.pointId, 'S', 4000);

  // 先在南北两道外墙上各取一个真实端点，外墙随之各拆成两段
  const southSplit = splitWallAt(west.project, south.wallId, 3000);
  if ('error' in southSplit) throw new Error(southSplit.error);
  const northSplit = splitWallAt(southSplit.project, north.wallId, 3000);
  if ('error' in northSplit) throw new Error(northSplit.error);

  const inner = drawWall(northSplit.project, {
    fromPointId: southSplit.pointId,
    direction: 'N',
    length: 4000,
    kind: 'inner',
  });
  if (!inner.wallId) throw new Error('内墙没有画出来');

  const southRight = Object.values(inner.project.walls).find(
    (wall) => wall.id !== south.wallId && wall.kind === 'outer' && wall.startPointId === southSplit.pointId,
  );
  const northLeft = Object.values(inner.project.walls).find(
    (wall) =>
      wall.id !== north.wallId &&
      wall.kind === 'outer' &&
      wall.startPointId === northSplit.pointId,
  );
  if (!southRight || !northLeft) throw new Error('外墙拆分结果不完整');

  const master: Room = {
    id: 'R001',
    name: '主卧',
    note: '东墙放衣柜',
    boundaryWallIds: [southRight.id, east.wallId, northSplit.project.walls[north.wallId].id, inner.wallId],
  };
  // 东侧房间的北边是北墙的前半段（从北墙拆出来的那一段）
  const bedroom: Room = {
    id: 'R002',
    name: '次卧',
    note: '',
    boundaryWallIds: [south.wallId, inner.wallId, northLeft.id, west.wallId],
  };
  return { project: { ...inner.project, rooms: { R001: master, R002: bedroom } }, master, bedroom };
}

describe('两室户型整条链路', () => {
  it('两个房间都能圈定并算出净面积，清单里各占一行', () => {
    const { project, master, bedroom } = twoRoomProject();
    expect(formatArea(roomArea(project, master) as number)).toBe('12.00');
    expect(formatArea(roomArea(project, bedroom) as number)).toBe('12.00');
    const csv = buildAreaCsv(project);
    expect(csv).toContain('主卧,12.00');
    expect(csv).toContain('次卧,12.00');
  });

  it('立面只取朝外的外墙，内墙不会混进立面', () => {
    const { project } = twoRoomProject();
    const east = buildFacade(project, 'E');
    expect(east.walls).toHaveLength(1);
    expect(east.maxHeight).toBe(2800);

    const eastWallId = east.walls[0].wallId;
    const withWindow = addOpening(project, {
      wallId: eastWallId,
      kind: 'window',
      distance: 1200,
      width: 1500,
      height: 1500,
      sillHeight: 900,
    });
    if ('error' in withWindow) throw new Error(withWindow.error);
    expect(buildFacade(withWindow.project, 'E').openings).toHaveLength(1);

    const dxf = buildProjectDxf(withWindow.project).dxf;
    expect(dxf).toContain('主卧');
    expect(dxf).toContain('次卧');
  });
});
