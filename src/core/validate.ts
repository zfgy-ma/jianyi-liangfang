import { directionOf } from './direction';
import { closureGap, lengthBetween } from './geometry';
import type { Project, Vec2 } from './types';

export type WallConflictReason = 'nonOrthogonal' | 'zeroLength';

export interface WallConflict {
  wallId: string;
  reason: WallConflictReason;
}

/**
 * 找出被改尺寸牵连、已经不再正交或长度为零的墙。
 * 这些墙只做标记和提示，绝不自动改数字。
 */
export function findWallConflicts(project: Project): WallConflict[] {
  const conflicts: WallConflict[] = [];
  for (const wall of Object.values(project.walls)) {
    const start = project.points[wall.startPointId];
    const end = project.points[wall.endPointId];
    if (!start || !end) continue;
    if (lengthBetween(start, end) === 0) {
      conflicts.push({ wallId: wall.id, reason: 'zeroLength' });
      continue;
    }
    if (!directionOf(start, end)) {
      conflicts.push({ wallId: wall.id, reason: 'nonOrthogonal' });
    }
  }
  return conflicts;
}

/** 把闭合差值说成人话，例如“南北方向差 500mm” */
export function describeClosureGap(start: Vec2, end: Vec2): string {
  const gap = closureGap(start, end);
  if (gap.closed) return '已闭合，无差值';
  const parts: string[] = [];
  if (gap.dx !== 0) parts.push(`东西方向差 ${Math.abs(gap.dx)}mm`);
  if (gap.dy !== 0) parts.push(`南北方向差 ${Math.abs(gap.dy)}mm`);
  return parts.join('，');
}
