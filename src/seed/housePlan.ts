import { addOpening } from '../core/opening';
import { createOriginPoint, createProject, drawWall } from '../core/project';
import type { Project } from '../core/types';

/**
 * 手绘图上读到的关键尺寸（毫米）。
 * 平面：西块 3550×5400，东块 7200×2602，两块共用南墙组成 L 形。
 * A 面是东块那面 7200 长的北墙：570 留白 + 2640 洞口 + 640 中垛 + 3350 右段 = 7200，
 * 其中右段 3350 里含 3080 窗。C 面是 5400 长的西墙，拱窗按矩形窗处理。
 * A、C 面总高都标 3400，所以四面墙高统一 3400。
 * B 面 4700×3500、D 面 4700×2602 是平面图上方标“X 不做”的楼梯电梯间外墙，
 * 高度 3500 也和客厅的 3400 差一档，因此不建进本模型。
 */
export const HOUSE_PLAN_SIZES = {
  westWidth: 3550,
  westDepth: 5400,
  eastWidth: 7200,
  eastDepth: 2602,
  wallHeight: 3400,
  /** 凹口墙：西块北端比东块高出的一段 */
  notchDepth: 5400 - 2602,
  /** A 面从左到右：570 + 2640 + 640 + 3350 = 7200 */
  aLeftMargin: 570,
  aFirstWidth: 2640,
  aFirstSill: 140,
  aPierWidth: 640,
  aRightSection: 3350,
  aSecondWidth: 3080,
  aSecondSill: 710,
  /** 两处洞口都高 2440：2640 洞头顶 2580，3080 窗头顶 3150 */
  openingHeight: 2440,
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

  // A 面（东块北墙 7200）：570 留白、2640 洞口、640 中垛、3350 右段含 3080 窗
  const firstOpening = addOpening(project, {
    wallId: northEast.wallId,
    kind: 'window',
    distance: sizes.aLeftMargin,
    width: sizes.aFirstWidth,
    height: sizes.openingHeight,
    sillHeight: sizes.aFirstSill,
  });
  if (!('error' in firstOpening)) project = firstOpening.project;
  const secondOpening = addOpening(project, {
    wallId: northEast.wallId,
    kind: 'window',
    distance: sizes.aLeftMargin + sizes.aFirstWidth + sizes.aPierWidth,
    width: sizes.aSecondWidth,
    height: sizes.openingHeight,
    sillHeight: sizes.aSecondSill,
  });
  if (!('error' in secondOpening)) project = secondOpening.project;

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
