export interface DxfLineEntity {
  kind: 'line';
  layer: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DxfPolylineEntity {
  kind: 'polyline';
  layer: string;
  closed: boolean;
  points: { x: number; y: number }[];
}

export interface DxfTextEntity {
  kind: 'text';
  layer: string;
  x: number;
  y: number;
  height: number;
  value: string;
  rotation?: number;
}

export interface DxfArcEntity {
  kind: 'arc';
  layer: string;
  cx: number;
  cy: number;
  radius: number;
  startAngle: number;
  endAngle: number;
}

export type DxfEntity =
  | DxfLineEntity
  | DxfPolylineEntity
  | DxfTextEntity
  | DxfArcEntity;

/**
 * 把实体序列化成 DXF 片段。
 * 归属完全由 330 指向的块记录决定：实测表明额外写 67 或 410
 * 会让解析库把这些图元并到第一张纸空间，图纸页就空了。
 */
export function serializeEntity(
  entity: DxfEntity,
  handle: string,
  owner: string,
): string {
  if (entity.kind === 'line') {
    return [
      '0', 'LINE',
      '5', handle,
      '330', owner,
      '100', 'AcDbEntity',
      '8', entity.layer,
      '100', 'AcDbLine',
      '10', entity.x1, '20', entity.y1, '30', 0,
      '11', entity.x2, '21', entity.y2, '31', 0,
    ].join('\n');
  }

  if (entity.kind === 'polyline') {
    const points = entity.points.flatMap((point) => ['10', point.x, '20', point.y]);
    return [
      '0', 'LWPOLYLINE',
      '5', handle,
      '330', owner,
      '100', 'AcDbEntity',
      '8', entity.layer,
      '100', 'AcDbPolyline',
      '90', entity.points.length,
      '70', entity.closed ? 1 : 0,
      '43', 0,
      ...points,
    ].join('\n');
  }

  if (entity.kind === 'text') {
    return [
      '0', 'TEXT',
      '5', handle,
      '330', owner,
      '100', 'AcDbEntity',
      '8', entity.layer,
      '100', 'AcDbText',
      '10', entity.x, '20', entity.y, '30', 0,
      '40', entity.height,
      '1', entity.value,
      '7', 'STANDARD',
      '50', entity.rotation ?? 0,
    ].join('\n');
  }

  return [
    '0', 'ARC',
    '5', handle,
    '330', owner,
    '100', 'AcDbEntity',
    '8', entity.layer,
    '100', 'AcDbCircle',
    '10', entity.cx, '20', entity.cy, '30', 0,
    '40', entity.radius,
    '100', 'AcDbArc',
    '50', entity.startAngle,
    '51', entity.endAngle,
  ].join('\n');
}
