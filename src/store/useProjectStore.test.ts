import { describe, expect, it } from 'vitest';
import { useProjectStore } from './useProjectStore';

/** 每个用例都从干净的新工程开始 */
function freshProject() {
  useProjectStore.getState().newProject('测试工程', 'SE');
  return useProjectStore.getState();
}

describe('撤销之后还能继续录入', () => {
  it('撤销掉一段墙后落笔点自动回收到已存在的点，接着画能成功', () => {
    const first = freshProject();
    const originId = first.activePointId as string;

    // 向北画 3000
    first.pressDirection('N');
    first.pressDigit('3000');
    first.confirmDraw();
    expect(Object.keys(useProjectStore.getState().history.present.walls)).toHaveLength(1);
    const endId = useProjectStore.getState().activePointId as string;

    // 撤销：墙与那个新端点一起消失
    useProjectStore.getState().undo();
    const afterUndo = useProjectStore.getState();
    expect(Object.keys(afterUndo.history.present.walls)).toHaveLength(0);
    expect(afterUndo.history.present.points[endId]).toBeUndefined();
    // 关键点：落笔点不能继续指向已经不存在的点，否则后续录入会静默失效
    expect(afterUndo.activePointId).toBe(originId);
    expect(afterUndo.digits).toBe('');
    expect(afterUndo.direction).toBeNull();

    // 接着向东画 4000，应该正常落线
    afterUndo.pressDirection('E');
    afterUndo.pressDigit('4000');
    afterUndo.confirmDraw();
    const afterRedraw = useProjectStore.getState();
    const walls = Object.values(afterRedraw.history.present.walls);
    expect(walls).toHaveLength(1);
    expect(walls[0].startPointId).toBe(originId);
  });

  it('撤销之后方向与数字缓冲都会清空，避免把上一段的输入带进来', () => {
    const state = freshProject();
    state.pressDirection('W');
    state.pressDigit('12');
    state.undo();
    const afterUndo = useProjectStore.getState();
    expect(afterUndo.direction).toBeNull();
    expect(afterUndo.digits).toBe('');
  });
});
