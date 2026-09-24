import { describe, expect, it } from 'vitest';
import { createOriginPoint, createProject, drawWall } from '../core/project';
import type { Direction, Project, Room } from '../core/types';
import { buildAreaCsv } from './csv';

function draw(project: Project, fromPointId: string, direction: Direction, length: number) {
  const result = drawWall(project, { fromPointId, direction, length });
  return { project: result.project, pointId: result.endPointId, wallId: result.wallId };
}

describe('面积清单', () => {
  it('输出房间名、净面积、墙面净面积与备注', () => {
    const start = createOriginPoint(createProject('清单测试'), 0, 0);
    const a = draw(start.project, start.pointId, 'N', 3000);
    const b = draw(a.project, a.pointId, 'W', 4000);
    const c = draw(b.project, b.pointId, 'S', 3000);
    const d = draw(c.project, c.pointId, 'E', 4000);
    const room: Room = {
      id: 'R001',
      name: '主卧',
      note: '带飘窗',
      boundaryWallIds: [a.wallId, b.wallId, c.wallId, d.wallId],
    };
    const project: Project = { ...d.project, rooms: { R001: room } };
    const lines = buildAreaCsv(project).split('\r\n');
    expect(lines[0]).toBe('房间名,净面积(㎡),墙面净面积合计(㎡),备注');
    expect(lines[1].startsWith('主卧,12.00,')).toBe(true);
    expect(lines[1].endsWith(',带飘窗')).toBe(true);
  });
});
