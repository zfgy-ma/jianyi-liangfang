import { describe, expect, it } from 'vitest';
import { updateWallLength } from './edit';
import { lengthBetween } from './geometry';
import { createOriginPoint, createProject, drawWall } from './project';
import { buildRoomPolygon, roomArea, toSquareMeters } from './room';
import { findWallConflicts } from './validate';
import { buildWallBodies } from './wallOffset';
import type { Direction, Project, Room } from './types';

function draw(
  project: Project,
  fromPointId: string,
  direction: Direction,
  length: number,
) {
  const result = drawWall(project, { fromPointId, direction, length });
  return { project: result.project, pointId: result.endPointId, wallId: result.wallId };
}

function begin() {
  const created = createOriginPoint(createProject('模型测试'), 0, 0);
  return { project: created.project, pointId: created.pointId };
}

function wallLengths(project: Project): number[] {
  return Object.values(project.walls).map((wall) =>
    lengthBetween(project.points[wall.startPointId], project.points[wall.endPointId]),
  );
}

describe('改墙长后的连锁反应', () => {
  it('开放链条：起点不动，后面的墙整条跟着平移', () => {
    const start = begin();
    const a = draw(start.project, start.pointId, 'N', 3000);
    const b = draw(a.project, a.pointId, 'W', 4000);
    const c = draw(b.project, b.pointId, 'S', 3000);
    const updated = updateWallLength(c.project, a.wallId, 3500);
    expect(updated.points[start.pointId]).toMatchObject({ x: 0, y: 0 });
    expect(updated.points[a.pointId]).toMatchObject({ x: 0, y: 3500 });
    expect(updated.points[b.pointId]).toMatchObject({ x: -4000, y: 3500 });
    expect(updated.points[c.pointId]).toMatchObject({ x: -4000, y: 500 });
    expect(wallLengths(updated)).toEqual([3500, 4000, 3000]);
  });

  it('闭合环：不自动配平，改为标记出被牵连的冲突墙', () => {
    const start = begin();
    const a = draw(start.project, start.pointId, 'N', 3000);
    const b = draw(a.project, a.pointId, 'W', 4000);
    const c = draw(b.project, b.pointId, 'S', 3000);
    const d = draw(c.project, c.pointId, 'E', 4000);
    const updated = updateWallLength(d.project, a.wallId, 3500);
    const conflicts = findWallConflicts(updated);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({ wallId: d.wallId, reason: 'nonOrthogonal' });
    // 前三段仍是输入的数值；被牵连的回程墙实测变成 √(4000²+500²)=4031，
    // 正是「冲突墙」要呈现给用户的证据，系统不会替它改回 4000。
    expect(wallLengths(updated)).toEqual([3500, 4000, 3000, 4031]);
  });
});

describe('区域面积与墙厚', () => {
  it('手动圈定 4000×3000 的闭合区域，净面积 12 平方米', () => {
    const start = begin();
    const a = draw(start.project, start.pointId, 'N', 3000);
    const b = draw(a.project, a.pointId, 'W', 4000);
    const c = draw(b.project, b.pointId, 'S', 3000);
    const d = draw(c.project, c.pointId, 'E', 4000);
    const room: Room = {
      id: 'R001',
      name: '主卧',
      note: '北向采光',
      boundaryWallIds: [a.wallId, b.wallId, c.wallId, d.wallId],
    };
    const project: Project = { ...d.project, rooms: { R001: room } };
    expect(buildRoomPolygon(project, room)).toHaveLength(4);
    expect(roomArea(project, room)).toBe(12_000_000);
    expect(toSquareMeters(roomArea(project, room) as number)).toBe(12);
  });

  it('相邻两段外墙向外偏移后，在 L 形转角交于同一点', () => {
    const origin = createOriginPoint(createProject('转角测试'), 0, 0);
    const south = drawWall(origin.project, {
      fromPointId: origin.pointId,
      direction: 'E',
      length: 4000,
      offsetSide: 'right',
    });
    const east = drawWall(south.project, {
      fromPointId: south.endPointId,
      direction: 'N',
      length: 3000,
      offsetSide: 'right',
    });
    const bodies = buildWallBodies(east.project);
    const southBody = bodies.find((body) => body.wallId === south.wallId);
    const eastBody = bodies.find((body) => body.wallId === east.wallId);
    expect(southBody?.polygon[2]).toEqual({ x: 4240, y: -240 });
    expect(eastBody?.polygon[3]).toEqual({ x: 4240, y: -240 });
  });
});
