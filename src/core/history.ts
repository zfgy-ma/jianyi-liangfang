import type { Project } from './types';

/** 撤销栈：保存每一步的工程快照，操作可回退 */
export interface History {
  past: Project[];
  present: Project;
  future: Project[];
}

export function initHistory(project: Project): History {
  return { past: [], present: project, future: [] };
}

/** 提交一次改动；内容未变化时不记录 */
export function commit(history: History, next: Project): History {
  if (next === history.present) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: [],
  };
}

export function canUndo(history: History): boolean {
  return history.past.length > 0;
}

export function canRedo(history: History): boolean {
  return history.future.length > 0;
}

export function undo(history: History): History {
  if (!canUndo(history)) return history;
  const past = history.past.slice(0, -1);
  const present = history.past[history.past.length - 1];
  return { past, present, future: [history.present, ...history.future] };
}

export function redo(history: History): History {
  if (!canRedo(history)) return history;
  const [present, ...future] = history.future;
  return { past: [...history.past, history.present], present, future };
}

/** 直接替换当前快照，用于撤回栈之后的整工程替换（如打开另一个工程） */
export function reset(project: Project): History {
  return initHistory(project);
}
