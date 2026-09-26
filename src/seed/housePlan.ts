import { addOpening } from '../core/opening';
import { createOriginPoint, createProject, drawWall } from '../core/project';
import type { Project } from '../core/types';

/**
 * 手绘图上读到的关键尺寸（毫米）。
 * 平面：西块 3550×5400，东块 7200×2602，两块共用南墙组成 L 形。
 * 立面：西块高 3400（A/C 面），东块高 2602（D 面）。
 * A 面南墙从左到右依次是：留白 1040 + 门洞 2640 + 中垛 640 + 窗洞 3080 + 右端余量 3350。
 */
export const HOUSE_PLAN_SIZES = {
  westWidth: 3550,
  westDepth: 5400,
  eastWidth: 7200,
  eastDepth: 2602,
  westHeight: 3400,
  eastHeight: 2602,
  /** 凹口墙：西块北端比东块高出的一段 */
  notchDepth: 5400 - 2602,
  doorWidth: 2640,
  doorHeight: 2580,
  windowWidth: 3080,
  windowHeight: 2440,
  windowSill: 380,
  pierWidth: 640,
  leftMargin: 10750 - 3350 - 3080 - 640 - 2640,
  rightMargin: 3350,
  /** C 面的拱窗按矩形窗处理：宽 2070、高 2440、离地 260 */
  archWidth: 2070,
  archHeight: 2440,
  archSill: 260,
  archLeftMargin: 550,
} as const;

export const HOUSE_PLAN_NAME = '手绘图 · 客厅 L 形';

/** 依次落下六段外墙；闭合后把每段墙高改成图上标注的高度 */
export function createHousePlan(): Project {
  const sizes = HOUSE_PLAN_SIZES;
  const totalWidth = sizes.westWidth + sizes.eastWidth;

  let project = createProject(HOUSE_PLAN_NAME);
  const origin = createOriginPoint(project, 0, 0);
  project = origin.project;

  // 从西南角起逆时针走一圈，墙厚默认偏移到外侧
  const south = drawWall(project, {
    fromPointId: origin.pointId,
    direction: 'E',
    length: totalWidth,
  });
  const east = drawWall(south.project, {
    fromPointId: south.endPointId,
    direction: 'N',
    length: sizes.eastDepth,
  });
  const northEast = drawWall(east.project, {
    fromPointId: east.endPointId,
    direction: 'W',
    length: sizes.eastWidth,
  });
  const notch = drawWall(northEast.project, {
    fromPointId: northEast.endPointId,
    direction: 'N',
    length: sizes.notchDepth,
  });
  const northWest = drawWall(notch.project, {
    fromPointId: notch.endPointId,
    direction: 'W',
    length: sizes.westWidth,
  });
  const west = drawWall(northWest.project, {
    fromPointId: northWest.endPointId,
    direction: 'S',
    length: sizes.westDepth,
  });
  project = west.project;

  // 墙高照图：南墙和西块 3400，东块 2602
  const heights: Record<string, number> = {
    [south.wallId]: sizes.westHeight,
    [notch.wallId]: sizes.westHeight,
    [northWest.wallId]: sizes.westHeight,
    [west.wallId]: sizes.westHeight,
    [east.wallId]: sizes.eastHeight,
    [northEast.wallId]: sizes.eastHeight,
  };
  project = {
    ...project,
    walls: Object.fromEntries(
      Object.entries(project.walls).map(([id, wall]) => [
        id,
        { ...wall, height: heights[id] ?? wall.height },
      ]),
    ),
  };

  // A 面南墙：左留白、2640 门洞、640 中垛、3080 窗洞、3350 右端余量
  const door = addOpening(project, {
    wallId: south.wallId,
    kind: 'door',
    distance: sizes.leftMargin,
    width: sizes.doorWidth,
    height: sizes.doorHeight,
    sillHeight: 0,
  });
  if (!('error' in door)) project = door.project;
  const bigWindow = addOpening(project, {
    wallId: south.wallId,
    kind: 'window',
    distance: sizes.leftMargin + sizes.doorWidth + sizes.pierWidth,
    width: sizes.windowWidth,
    height: sizes.windowHeight,
    sillHeight: sizes.windowSill,
  });
  if (!('error' in bigWindow)) project = bigWindow.project;

  // C 面的拱窗按矩形窗处理，挂在西墙上
  const archWindow = addOpening(project, {
    wallId: west.wallId,
    kind: 'window',
    distance: sizes.archLeftMargin,
    width: sizes.archWidth,
    height: sizes.archHeight,
    sillHeight: sizes.archSill,
  });
  if (!('error' in archWindow)) project = archWindow.project;

  // 六段外墙围成的客厅区域，载入后可以直接量面积
  project = {
    ...project,
    rooms: {
      R001: {
        id: 'R001',
        name: '客厅',
        note: '手绘图 L 形主体',
        boundaryWallIds: [
          south.wallId,
          east.wallId,
          northEast.wallId,
          notch.wallId,
          northWest.wallId,
          west.wallId,
        ],
      },
    },
  };

  return project;
}
