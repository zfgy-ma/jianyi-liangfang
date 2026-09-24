import { lengthBetween } from './geometry';
import type { Opening, Project, Wall } from './types';

export interface ElevationAxis {
  /** 墙面宽度（墙长），毫米 */
  length: number;
  /** 墙面高度，毫米 */
  height: number;
  /** 立面左端对应哪一个墙端点 */
  leftEndLabel: string;
  /** 观看方向说明 */
  viewFromLabel: string;
  /** 墙距起点的距离 → 立面横向坐标 */
  toAxisX: (distanceFromStart: number) => number;
  /** 立面横向坐标 → 墙距起点的距离 */
  toWallDistance: (axisX: number) => number;
}

/**
 * 单墙立面的水平轴。
 * 墙厚偏移方向指向室外，所以室内侧是偏移方向的反面；
 * 站在室内侧、面朝这面墙时，左手边固定放在立面左侧，保证现场对照不左右颠倒。
 */
export function elevationAxis(project: Project, wall: Wall): ElevationAxis | null {
  const start = project.points[wall.startPointId];
  const end = project.points[wall.endPointId];
  if (!start || !end) return null;
  const length = lengthBetween(start, end);
  const height = wall.height ?? project.wallHeight;
  // 偏移侧在左 → 室内侧在右 → 面朝墙时左手边是墙的起点
  const leftIsStart = wall.offsetSide === 'left';
  return {
    length,
    height,
    leftEndLabel: leftIsStart
      ? `${wall.startPointId}（起点）`
      : `${wall.endPointId}（终点）`,
    viewFromLabel: leftIsStart
      ? '站在墙的右侧（室内）面朝墙'
      : '站在墙的左侧（室内）面朝墙',
    toAxisX: (distanceFromStart) =>
      leftIsStart ? distanceFromStart : length - distanceFromStart,
    toWallDistance: (axisX) => (leftIsStart ? axisX : length - axisX),
  };
}

/** 取某面墙上的全部洞口，按距起点排序 */
export function openingsOfWall(project: Project, wallId: string): Opening[] {
  return Object.values(project.openings)
    .filter((opening) => opening.wallId === wallId)
    .sort((left, right) => left.distance - right.distance);
}
