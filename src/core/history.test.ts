import { describe, expect, it } from 'vitest';
import { commit, canRedo, canUndo, initHistory, redo, undo } from './history';
import { createProject, createOriginPoint } from './project';

describe('撤销与重做', () => {
  it('提交后可撤销，撤销后可重做，新操作会清空重做栈', () => {
    const first = createProject('撤销测试');
    const history = initHistory(first);
    expect(canUndo(history)).toBe(false);

    const second = createOriginPoint(first, 0, 0).project;
    const afterCommit = commit(history, second);
    expect(canUndo(afterCommit)).toBe(true);
    expect(canRedo(afterCommit)).toBe(false);

    const undone = undo(afterCommit);
    expect(undone.present).toBe(first);
    expect(canRedo(undone)).toBe(true);

    const redone = redo(undone);
    expect(redone.present).toBe(second);

    const third = createOriginPoint(second, 5000, 0).project;
    const branched = commit(undone, third);
    expect(canRedo(branched)).toBe(false);
  });

  it('内容没变化时不记录快照', () => {
    const project = createProject('空操作');
    const history = initHistory(project);
    expect(commit(history, project)).toBe(history);
  });
});
