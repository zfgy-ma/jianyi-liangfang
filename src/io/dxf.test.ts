import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { addOpening } from '../core/opening';
import { createOriginPoint, createProject, drawWall } from '../core/project';
import type { Direction, OffsetSide, Project, Room } from '../core/types';
import { buildProjectDxf } from './dxfSheets';

function draw(
  project: Project,
  fromPointId: string,
  direction: Direction,
  length: number,
  offsetSide: OffsetSide,
) {
  const result = drawWall(project, { fromPointId, direction, length, offsetSide });
  return { project: result.project, pointId: result.endPointId, wallId: result.wallId };
}

/** 示例房：4000×3000 的矩形，四道外墙向外偏，一窗一门，一个房间 */
function sampleProject(): Project {
  const origin = createOriginPoint(createProject('示例户型'), 0, 0);
  const south = draw(origin.project, origin.pointId, 'E', 4000, 'right');
  const east = draw(south.project, south.pointId, 'N', 3000, 'right');
  const north = draw(east.project, east.pointId, 'W', 4000, 'right');
  const west = draw(north.project, north.pointId, 'S', 3000, 'right');

  const withWindow = addOpening(west.project, {
    wallId: south.wallId,
    kind: 'window',
    distance: 1200,
    width: 1500,
    height: 1500,
    sillHeight: 900,
  });
  if ('error' in withWindow) throw new Error(withWindow.error);

  const withDoor = addOpening(withWindow.project, {
    wallId: west.wallId,
    kind: 'door',
    distance: 600,
    width: 900,
    height: 2100,
    sillHeight: 0,
  });
  if ('error' in withDoor) throw new Error(withDoor.error);

  const room: Room = {
    id: 'R001',
    name: '主卧',
    note: '东墙预留衣柜',
    boundaryWallIds: [south.wallId, east.wallId, north.wallId, west.wallId],
  };
  return { ...withDoor.project, rooms: { R001: room } };
}

describe('DXF 导出', () => {
  it('生成平面图、四张立面与等轴测，并写出可被独立校验的文件', () => {
    const project = sampleProject();
    const result = buildProjectDxf(project);

    expect(result.sheets.map((sheet) => sheet.name)).toEqual([
      '平面图',
      '东立面',
      '南立面',
      '西立面',
      '北立面',
      '等轴测',
    ]);
    expect(result.dxf).toContain('AC1021');
    expect(result.dxf).toContain('$INSUNITS');
    // 每张图纸页一个 LAYOUT 对象，另外模型空间自身也要有一个
    expect((result.dxf.match(/AcDbLayout/g) ?? [])).toHaveLength(
      result.sheets.length + 1,
    );
    // 图纸字典里必须有 Model 页，否则 CAD 打开时会报模型空间缺失
    expect(result.dxf).toContain('3\nModel\n350');
    expect(result.dxf).toContain('主卧');
    expect(result.dxf.trimEnd().endsWith('EOF')).toBe(true);

    const outputDir = join(process.cwd(), '.validate');
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(outputDir, 'sample.dxf'), result.dxf, 'utf8');
  });
});
