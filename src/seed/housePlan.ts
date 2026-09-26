import { addOpening } from '../core/opening';
import { createOriginPoint, createProject, drawWall } from '../core/project';
import type { Project } from '../core/types';

/**
 * 手绘图上读到的关键尺寸（毫米）。
 * 平面：西块 3550×5400，东块 7200×2602，两块共用南墙组成 L 形。
 * 面与墙的对应按用户 CAD 平面图：A=南墙东段、B=西墙、C=东块北墙、D=东墙。
 * A 面（南墙东段 7200）：570 留白 + 2640 洞口 + 640 中垛 + 3350 右段 = 7200，
 * 其中右段 3350 里含 3080 窗。C 面（东块北墙 7200）拱窗按矩形窗、距西端 550。
 * A、C 面总高都标 3400，所以墙高统一 3400。
 * B 面（4700×3500，空墙）与 D 面（4700 宽，含 2370 宽洞口、两侧垛 260/740、
 * 洞口上梁 260、洞高 3000）按用户 CAD 平面图分别在西墙、东墙上，
 * 但立面读数和现有墙长（西墙 5400、东墙 2602）还对不上，
 * 用户已确认要建，等确认 4700 的来源后落位。
 */
export const HOUSE_PLAN_SIZES = {
  westWidth: 3550,
  westDepth: 5400,
  eastWidth: 7200,
  eastDepth: 2602,
  wallHeight: 3400,
  /** 凹口墙：西块北端比东块高出的一段 */
  notchDepth: 5400 - 2602,
  /** 南墙拆两段：西段 3550 + 东段 7200（东段就是 A 面） */
  southWestWidth: 3550,
  southEastWidth: 7200,
  /** A 面（南墙东段）从左到右：570 + 2640 + 640 + 3350 = 7200 */
  aLeftMargin: 570,
  aFirstWidth: 2640,
  aFirstSill: 140,
  aPierWidth: 640,
  aRightSection: 3350,
  aSecondWidth: 3080,
  aSecondSill: 710,
  /** 两处洞口距墙起点（西端）的距离：570 那端是东端，需要换算 */
  aFirstDistance: 7200 - 570 - 2640,
  aSecondDistance: 7200 - (570 + 2640 + 640) - 3080,
  /** 两处洞口都高 2440：2640 洞头顶 2580，3080 窗头顶 3150 */
  openingHeight: 2440,
  /** C 面（东块北墙）拱窗按矩形窗：距西端 550、宽 2070、高 2440、离地 260 */
  archWidth: 2070,
  archHeight: 2440,
  archSill: 260,
  archLeftMargin: 550,
  /** 北墙起点在东端，距西端 550 就是距起点 7200-550-2070 */
  archDistanceFromEast: 7200 - 550 - 2070,
} as const;

export const HOUSE_PLAN_NAME = '手绘图 · 客厅 L 形';

/**
 * B 面、D 面的位置已按用户 CAD 平面图确定（B=西墙、D=东墙），
 * 但立面读数（4700 宽、3500 高）和现有墙长（西墙 5400、东墙 2602）不符，
 * 先把图纸读数固化，等确认 4700 的来源后直接落位。
 */
export const PENDING_FACADE_SIZES = {
  b: { width: 4700, height: 3500 },
  d: {
    width: 4700,
    openingWidth: 2370,
    openingHeight: 3000,
    leftPier: 260,
    rightPier: 740,
    headerHeight: 260,
  },
} as const;

/** 依次落下六段外墙；闭合后把每段墙高改成图上标注的高度 */
export function createHousePlan(): Project {
  const sizes = HOUSE_PLAN_SIZES;

  let project = createProject(HOUSE_PLAN_NAME);
  const origin = createOriginPoint(project, 0, 0);
  project = origin.project;

  // 从西南角起逆时针走一圈，墙厚默认偏移到外侧
  // 南墙按图纸拆两段：西段 3550 + 东段 7200（A 面）
  const southWest = drawWall(project, {
    fromPointId: origin.pointId,
    direction: 'E',
    length: sizes.southWestWidth,
  });
  const southEast = drawWall(southWest.project, {
    fromPointId: southWest.endPointId,
    direction: 'E',
    length: sizes.southEastWidth,
  });
  const east = drawWall(southEast.project, {
    fromPointId: southEast.endPointId,
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

  // 墙高照立面图：四面统一 3400
  project = {
    ...project,
    walls: Object.fromEntries(
      Object.entries(project.walls).map(([id, wall]) => [
        id,
        { ...wall, height: sizes.wallHeight },
      ]),
    ),
  };

  // A 面（南墙东段 7200）：570 留白、2640 洞口、640 中垛、3350 右段含 3080 窗
  const firstOpening = addOpening(project, {
    wallId: southEast.wallId,
    kind: 'window',
    distance: sizes.aFirstDistance,
    width: sizes.aFirstWidth,
    height: sizes.openingHeight,
    sillHeight: sizes.aFirstSill,
  });
  if (!('error' in firstOpening)) project = firstOpening.project;
  const secondOpening = addOpening(project, {
    wallId: southEast.wallId,
    kind: 'window',
    distance: sizes.aSecondDistance,
    width: sizes.aSecondWidth,
    height: sizes.openingHeight,
    sillHeight: sizes.aSecondSill,
  });
  if (!('error' in secondOpening)) project = secondOpening.project;

  // C 面（东块北墙 7200）：拱窗按矩形窗，距西端 550
  const archWindow = addOpening(project, {
    wallId: northEast.wallId,
    kind: 'window',
    distance: sizes.archDistanceFromEast,
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
          southWest.wallId,
          southEast.wallId,
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
