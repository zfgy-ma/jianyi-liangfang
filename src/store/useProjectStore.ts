import { create } from 'zustand';
import {
  flipWallOffsetSide,
  removeWall,
  setWallKind,
  setWallThickness,
  updateWallLength,
} from '../core/edit';
import { commit, initHistory, redo, undo, type History } from '../core/history';
import { locatePointOnWall } from '../core/locate';
import { createOriginPoint, createProject, drawWall } from '../core/project';
import type { Direction, Project, WallKind } from '../core/types';

export type InputMode = 'wall' | 'helper' | 'select';
export type TabKey = 'plan' | 'elevation' | 'facade' | 'axon';
/** 开局选角只决定录入习惯，不影响坐标系原点 */
export type CornerKey = 'SE' | 'NE' | 'SW' | 'NW';

export interface ProjectState {
  history: History;
  activePointId: string | null;
  selectedWallId: string | null;
  mode: InputMode;
  direction: Direction | null;
  digits: string;
  tab: TabKey;
  startCorner: CornerKey;
  setTab: (tab: TabKey) => void;
  setMode: (mode: InputMode) => void;
  setStartCorner: (corner: CornerKey) => void;
  newProject: (name: string, corner: CornerKey) => void;
  replaceProject: (project: Project) => void;
  selectPoint: (pointId: string | null) => void;
  selectWall: (wallId: string | null) => void;
  pressDirection: (direction: Direction) => void;
  pressDigit: (digit: string) => void;
  pressBackspace: () => void;
  cancelInput: () => void;
  confirmDraw: () => void;
  locateOnWall: (wallId: string, distance: number) => void;
  editWallLength: (wallId: string, length: number) => void;
  flipOffset: (wallId: string) => void;
  changeWallKind: (wallId: string, kind: WallKind) => void;
  changeWallThickness: (wallId: string, thickness: number) => void;
  deleteWall: (wallId: string) => void;
  undo: () => void;
  redo: () => void;
}

/** 新工程开局：原点固定，起点角只影响录入提示 */
function freshProject(name: string) {
  const created = createOriginPoint(createProject(name), 0, 0);
  return { history: initHistory(created.project), activePointId: created.pointId };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...freshProject('未命名工程'),
  selectedWallId: null,
  mode: 'wall',
  direction: null,
  digits: '',
  tab: 'plan',
  startCorner: 'SE',

  setTab: (tab) => set({ tab }),
  setMode: (mode) => set({ mode, selectedWallId: null, direction: null, digits: '' }),
  setStartCorner: (corner) => set({ startCorner: corner }),
  newProject: (name, corner) => set({ ...freshProject(name), startCorner: corner }),
  replaceProject: (project) =>
    set({
      history: initHistory(project),
      activePointId: Object.keys(project.points)[0] ?? null,
      selectedWallId: null,
      direction: null,
      digits: '',
    }),

  selectPoint: (pointId) => set({ activePointId: pointId, direction: null, digits: '' }),
  selectWall: (wallId) => set({ selectedWallId: wallId }),

  pressDirection: (direction) => set({ direction }),
  pressDigit: (digit) => set({ digits: get().digits + digit }),
  pressBackspace: () => set({ digits: get().digits.slice(0, -1) }),
  cancelInput: () => set({ direction: null, digits: '' }),

  confirmDraw: () => {
    const state = get();
    const length = Number(state.digits);
    if (!state.direction || !state.activePointId || !Number.isFinite(length) || length <= 0) {
      return;
    }
    const result = drawWall(state.history.present, {
      fromPointId: state.activePointId,
      direction: state.direction,
      length,
      isHelper: state.mode === 'helper',
    });
    if (!result.wallId) return;
    set({
      history: commit(state.history, result.project),
      activePointId: result.endPointId,
      direction: null,
      digits: '',
    });
  },

  locateOnWall: (wallId, distance) => {
    const state = get();
    const located = locatePointOnWall(state.history.present, wallId, distance);
    if (!located) return;
    set({
      history: commit(state.history, located.project),
      activePointId: located.pointId,
      selectedWallId: wallId,
      direction: null,
      digits: '',
    });
  },

  editWallLength: (wallId, length) => {
    const state = get();
    const project = updateWallLength(state.history.present, wallId, length);
    set({ history: commit(state.history, project) });
  },

  flipOffset: (wallId) => {
    const state = get();
    const project = flipWallOffsetSide(state.history.present, wallId);
    set({ history: commit(state.history, project) });
  },

  changeWallKind: (wallId, kind) => {
    const state = get();
    const project = setWallKind(state.history.present, wallId, kind);
    set({ history: commit(state.history, project) });
  },

  changeWallThickness: (wallId, thickness) => {
    const state = get();
    const project = setWallThickness(state.history.present, wallId, thickness);
    set({ history: commit(state.history, project) });
  },

  deleteWall: (wallId) => {
    const state = get();
    const project = removeWall(state.history.present, wallId);
    const activePointId =
      state.activePointId && project.points[state.activePointId]
        ? state.activePointId
        : (Object.keys(project.points)[0] ?? null);
    set({
      history: commit(state.history, project),
      selectedWallId: null,
      activePointId,
    });
  },

  undo: () => set((state) => ({ history: undo(state.history) })),
  redo: () => set((state) => ({ history: redo(state.history) })),
}));
