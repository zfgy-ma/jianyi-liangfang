import { describe, expect, it } from 'vitest';
import { resolveTap, type PendingTap } from './tap';

const onPoint: PendingTap = { pointId: 'P001', wallId: null, x: 100, y: 100 };
const onWall: PendingTap = { pointId: null, wallId: 'W001', x: 100, y: 100 };
const onBlank: PendingTap = { pointId: null, wallId: null, x: 100, y: 100 };

describe('点选判定', () => {
  it('按在点上抬起，判定为选中该点', () => {
    expect(resolveTap(onPoint, { clientX: 102, clientY: 101 }, 1)).toEqual({
      kind: 'point',
      id: 'P001',
    });
  });

  it('按在墙上抬起，判定为选中该墙', () => {
    expect(resolveTap(onWall, { clientX: 100, clientY: 100 }, 1)).toEqual({
      kind: 'wall',
      id: 'W001',
    });
  });

  it('拖动超过 8 像素不算点选，避免平移画布时误选', () => {
    expect(resolveTap(onPoint, { clientX: 140, clientY: 100 }, 1)).toBeNull();
  });

  it('空白处轻点会清空选中', () => {
    expect(resolveTap(onBlank, { clientX: 100, clientY: 100 }, 1)).toEqual({
      kind: 'clear',
    });
  });

  it('双指操作与没有按下记录时不判定点选', () => {
    expect(resolveTap(onPoint, { clientX: 100, clientY: 100 }, 2)).toBeNull();
    expect(resolveTap(null, { clientX: 100, clientY: 100 }, 1)).toBeNull();
  });
});
