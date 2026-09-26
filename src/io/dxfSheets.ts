import { DIRECTION_VECTOR, directionOf } from '../core/direction';
import { buildFacade, type ViewDirection } from '../core/facade';
import { buildAxon } from '../core/axon';
import { buildRoomPolygon, formatArea, roomArea } from '../core/room';
import type { Project, Vec2 } from '../core/types';
import { buildWallBodies } from '../core/wallOffset';
import { buildDxf, type DxfEntity, type DxfSheetSpec } from './dxf';

const SHEET_WIDTH = 420;
const SHEET_HEIGHT = 297;
const MARGIN = 10;
const TITLE_BLOCK_HEIGHT = 34;
const SCALE_STEPS = [20, 25, 50, 100, 200, 500];

export const DXF_LAYERS = [
  { name: 'WALL', color: 7 },
  { name: 'OPENING', color: 3 },
  { name: 'ROOM', color: 2 },
  { name: 'FRAME', color: 8 },
  { name: 'TITLE', color: 7 },
  { name: 'AXON', color: 4 },
];

export interface SheetContext {
  scale: number;
  toPage: (point: Vec2) => Vec2;
}

/** 从最精细的比例开始选，选到能放进图框的那一档 */
export function pickScale(contentWidth: number, contentHeight: number): number {
  const maxWidth = SHEET_WIDTH - MARGIN * 2;
  const maxHeight = SHEET_HEIGHT - MARGIN * 2 - TITLE_BLOCK_HEIGHT;
  for (const scale of SCALE_STEPS) {
    if (contentWidth / scale <= maxWidth && contentHeight / scale <= maxHeight) {
      return scale;
    }
  }
  return 1000;
}

export function createContext(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  scale: number,
): SheetContext {
  const contentWidth = (bounds.maxX - bounds.minX) / scale;
  const contentHeight = (bounds.maxY - bounds.minY) / scale;
  const areaWidth = SHEET_WIDTH - MARGIN * 2;
  const areaHeight = SHEET_HEIGHT - MARGIN * 2 - TITLE_BLOCK_HEIGHT;
  const offsetX = MARGIN + Math.max(0, (areaWidth - contentWidth) / 2);
  const offsetY = MARGIN + Math.max(0, (areaHeight - contentHeight) / 2);
  return {
    scale,
    toPage: (point) => ({
      x: (point.x - bounds.minX) / scale + offsetX,
      y: (point.y - bounds.minY) / scale + offsetY,
    }),
  };
}

/** 图框与标题栏：A3 横放，比例写在标题栏里 */
export function frameEntities(
  sheetTitle: string,
  projectName: string,
  scale: number,
): DxfEntity[] {
  const frame = [
    { x: MARGIN, y: MARGIN },
    { x: SHEET_WIDTH - MARGIN, y: MARGIN },
    { x: SHEET_WIDTH - MARGIN, y: SHEET_HEIGHT - MARGIN },
    { x: MARGIN, y: SHEET_HEIGHT - MARGIN },
  ];
  const titleY = MARGIN;
  const titleX = SHEET_WIDTH - MARGIN - 120;
  const titleBox = [
    { x: titleX, y: titleY },
    { x: SHEET_WIDTH - MARGIN, y: titleY },
    { x: SHEET_WIDTH - MARGIN, y: titleY + TITLE_BLOCK_HEIGHT },
    { x: titleX, y: titleY + TITLE_BLOCK_HEIGHT },
  ];
  const today = new Date().toISOString().slice(0, 10);
  return [
    { kind: 'polyline', layer: 'FRAME', closed: true, points: frame },
    { kind: 'polyline', layer: 'FRAME', closed: true, points: titleBox },
    { kind: 'text', layer: 'TITLE', x: titleX + 4, y: titleY + 24, height: 5, value: sheetTitle },
    {
      kind: 'text',
      layer: 'TITLE',
      x: titleX + 4,
      y: titleY + 16,
      height: 3.5,
      value: `工程：${projectName}`,
    },
    {
      kind: 'text',
      layer: 'TITLE',
      x: titleX + 4,
      y: titleY + 9,
      height: 3.5,
      value: `比例 1:${scale}    单位 mm    日期 ${today}`,
    },
  ];
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function projectBounds(project: Project): Bounds {
  const points = Object.values(project.points);
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

/** 平面图页：墙体轮廓、内墙面线、洞口符号、房间名与面积 */
export function planSheet(project: Project, context: SheetContext): DxfEntity[] {
  const entities: DxfEntity[] = [];
  const page = context.toPage;

  for (const body of buildWallBodies(project)) {
    entities.push({
      kind: 'polyline',
      layer: 'WALL',
      closed: true,
      points: body.polygon.map(page),
    });
  }

  for (const wall of Object.values(project.walls)) {
    if (wall.isHelper) continue;
    const start = project.points[wall.startPointId];
    const end = project.points[wall.endPointId];
    if (!start || !end) continue;
    const from = page(start);
    const to = page(end);
    entities.push({ kind: 'line', layer: 'WALL', x1: from.x, y1: from.y, x2: to.x, y2: to.y });

    const direction = directionOf(start, end);
    if (!direction) continue;
    const unit = DIRECTION_VECTOR[direction];
    const normalSign = wall.offsetSide === 'left' ? 1 : -1;
    const baseNormal = { x: -unit.y, y: unit.x };
    const normal = { x: baseNormal.x * normalSign, y: baseNormal.y * normalSign };
    const depth = wall.thickness > 0 ? wall.thickness : 120;
    const at = (distance: number, offset: number): Vec2 => ({
      x: start.x + unit.x * distance + normal.x * offset,
      y: start.y + unit.y * distance + normal.y * offset,
    });

    for (const opening of Object.values(project.openings)) {
      if (opening.wallId !== wall.id) continue;
      const left = opening.distance;
      const right = opening.distance + opening.width;
      if (opening.kind === 'window') {
        for (const distance of [left, right]) {
          const a = page(at(distance, 0));
          const b = page(at(distance, depth));
          entities.push({ kind: 'line', layer: 'OPENING', x1: a.x, y1: a.y, x2: b.x, y2: b.y });
        }
        const a = page(at(left, depth / 2));
        const b = page(at(right, depth / 2));
        entities.push({ kind: 'line', layer: 'OPENING', x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      } else {
        const hinge = page(at(left, 0));
        const leaf = page(at(left, opening.width));
        entities.push({
          kind: 'line',
          layer: 'OPENING',
          x1: hinge.x,
          y1: hinge.y,
          x2: leaf.x,
          y2: leaf.y,
        });
        const startAngle = (Math.atan2(leaf.y - hinge.y, leaf.x - hinge.x) * 180) / Math.PI;
        const endPoint = page(at(right, 0));
        let endAngle = (Math.atan2(endPoint.y - hinge.y, endPoint.x - hinge.x) * 180) / Math.PI;
        if (endAngle < startAngle) endAngle += 360;
        entities.push({
          kind: 'arc',
          layer: 'OPENING',
          cx: hinge.x,
          cy: hinge.y,
          radius: opening.width / context.scale,
          startAngle,
          endAngle,
        });
      }
    }
  }

  for (const room of Object.values(project.rooms)) {
    const polygon = buildRoomPolygon(project, room);
    if (!polygon) continue;
    const center = polygon.reduce(
      (sum, point) => ({ x: sum.x + point.x / polygon.length, y: sum.y + point.y / polygon.length }),
      { x: 0, y: 0 },
    );
    const anchor = page(center);
    const area = roomArea(project, room);
    entities.push({
      kind: 'text',
      layer: 'ROOM',
      x: anchor.x,
      y: anchor.y,
      height: 4,
      value: room.name,
    });
    if (area !== null) {
      entities.push({
        kind: 'text',
        layer: 'ROOM',
        x: anchor.x,
        y: anchor.y - 5.5,
        height: 3.5,
        value: `${formatArea(area)}㎡`,
      });
    }
    if (room.note) {
      entities.push({
        kind: 'text',
        layer: 'ROOM',
        x: anchor.x,
        y: anchor.y - 10.5,
        height: 3,
        value: room.note,
      });
    }
  }

  return entities;
}

/** 某个方位的整栋立面页：外墙投影 + 该方向可见的洞口 */
export function facadeSheet(
  project: Project,
  direction: ViewDirection,
  context: SheetContext,
): DxfEntity[] {
  const view = buildFacade(project, direction);
  const entities: DxfEntity[] = [];
  const page = context.toPage;

  // 与屏幕一致：每面外墙从远到近输出，转角棱线不会漏
  for (const wall of view.faces) {
    entities.push({
      kind: 'polyline',
      layer: 'WALL',
      closed: true,
      points: [
        { x: wall.left, y: wall.bottom },
        { x: wall.left + wall.width, y: wall.bottom },
        { x: wall.left + wall.width, y: wall.bottom + wall.height },
        { x: wall.left, y: wall.bottom + wall.height },
      ].map(page),
    });
  }

  // 平面上用“上/下”画的竖线也投影进立面
  for (const line of view.verticals) {
    const from = page({ x: line.x, y: line.bottom });
    const to = page({ x: line.x, y: line.top });
    entities.push({
      kind: 'line',
      layer: 'WALL',
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
    });
  }

  for (const opening of view.openings) {
    entities.push({
      kind: 'polyline',
      layer: 'OPENING',
      closed: true,
      points: [
        { x: opening.left, y: opening.bottom },
        { x: opening.left + opening.width, y: opening.bottom },
        { x: opening.left + opening.width, y: opening.bottom + opening.height },
        { x: opening.left, y: opening.bottom + opening.height },
      ].map(page),
    });
    const anchor = page({
      x: opening.left + opening.width / 2,
      y: opening.bottom,
    });
    entities.push({
      kind: 'text',
      layer: 'OPENING',
      x: anchor.x,
      y: anchor.y,
      height: 3,
      value: `${opening.width}×${opening.height} 离地${opening.bottom}`,
    });
  }

  return entities;
}

/** 等轴测线框页 */
export function axonSheet(project: Project, context: SheetContext): DxfEntity[] {
  return buildAxon(project).lines.map((line) => {
    const from = context.toPage({ x: line.x1, y: line.y1 });
    const to = context.toPage({ x: line.x2, y: line.y2 });
    return {
      kind: 'line',
      layer: line.layer === 'WALL' ? 'AXON' : 'OPENING',
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
    };
  });
}

export interface ProjectDxfResult {
  dxf: string;
  sheets: { name: string; scale: number }[];
}

/** 一次导出：平面图 + 东西南北四张立面 + 一张等轴测 */
export function buildProjectDxf(project: Project): ProjectDxfResult {
  const sheets: DxfSheetSpec[] = [];
  const summary: { name: string; scale: number }[] = [];

  const bounds = projectBounds(project);
  const planScale = pickScale(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  sheets.push({
    name: '平面图',
    width: SHEET_WIDTH,
    height: SHEET_HEIGHT,
    entities: [
      ...frameEntities('平面图', project.name, planScale),
      ...planSheet(project, createContext(bounds, planScale)),
    ],
  });
  summary.push({ name: '平面图', scale: planScale });

  for (const direction of ['E', 'S', 'W', 'N'] as ViewDirection[]) {
    const view = buildFacade(project, direction);
    if (view.faces.length === 0) continue;
    const scale = pickScale(view.totalWidth, view.maxHeight);
    const frame = { minX: 0, minY: 0, maxX: view.totalWidth, maxY: view.maxHeight };
    sheets.push({
      name: view.label,
      width: SHEET_WIDTH,
      height: SHEET_HEIGHT,
      entities: [
        ...frameEntities(view.label, project.name, scale),
        ...facadeSheet(project, direction, createContext(frame, scale)),
      ],
    });
    summary.push({ name: view.label, scale });
  }

  const axon = buildAxon(project);
  if (axon.lines.length > 0) {
    const scale = pickScale(axon.maxX - axon.minX, axon.maxY - axon.minY);
    const frame = { minX: axon.minX, minY: axon.minY, maxX: axon.maxX, maxY: axon.maxY };
    sheets.push({
      name: '等轴测',
      width: SHEET_WIDTH,
      height: SHEET_HEIGHT,
      entities: [
        ...frameEntities('等轴测线框', project.name, scale),
        ...axonSheet(project, createContext(frame, scale)),
      ],
    });
    summary.push({ name: '等轴测', scale });
  }

  return { dxf: buildDxf({ layers: DXF_LAYERS, modelEntities: [], sheets }), sheets: summary };
}
