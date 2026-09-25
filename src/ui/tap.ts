/** 超过这个像素位移就算拖动，不算点选 */
export const TAP_SLOP = 8;

export interface PendingTap {
  pointId: string | null;
  wallId: string | null;
  x: number;
  y: number;
}

export type TapResult =
  | { kind: 'point'; id: string }
  | { kind: 'wall'; id: string }
  | { kind: 'clear' }
  | null;

/**
 * 判定一次抬起是不是"点选"。
 * 指针捕获会把 click 事件劫持到根节点，所以命中信息在按下时记下来，抬起时再判定。
 */
export function resolveTap(
  tap: PendingTap | null,
  release: { clientX: number; clientY: number },
  activePointers: number,
): TapResult {
  if (!tap || activePointers !== 1) return null;
  const moved = Math.hypot(release.clientX - tap.x, release.clientY - tap.y);
  if (moved > TAP_SLOP) return null;
  if (tap.pointId) return { kind: 'point', id: tap.pointId };
  if (tap.wallId) return { kind: 'wall', id: tap.wallId };
  return { kind: 'clear' };
}
