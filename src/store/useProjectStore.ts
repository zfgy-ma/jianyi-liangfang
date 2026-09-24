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
import { addOpening, removeOpening, updateOpening } from '../core/opening';
import { createOriginPoint, createProject, drawWall, nextId } from '../core/project';
import { buildRoomPolygon } from '../core/room';
import type { Direction, OpeningKind, Project, WallKind } from '../core/types';

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
  /** 圈定区域时按顺序收集的墙 id */
  roomDraft: string[];
  roomMessage: string;
  roomPicking: boolean;
  openingMessage: string;
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
  toggleRoomWall: (wallId: string) => void;
  clearRoomDraft: () => void;
  finishRoom: () => void;
  setRoomPicking: (active: boolean) => void;
  updateRoom: (roomId: string, patch: { name?: string; note?: string }) => void;
  deleteRoom: (roomId: string) => void;
  addOpeningAt: (input: {
    wallId: string;
    kind: OpeningKind;
    distance: number;
    width: number;
    height: number;
    sillHeight: number;
  }) => void;
  changeOpening: (
    openingId: string,
    patch: Partial<{ distance: number; width: number; height: number; sillHeight: number }>,
  ) => void;
  deleteOpening: (openingId: string) => void;
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
  roomDraft: [],
  roomMessage: '',
  roomPicking: false,
  openingMessage: '',

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

  toggleRoomWall: (wallId) =>
    set((state) => ({
      roomDraft: state.roomDraft.includes(wallId)
        ? state.roomDraft.filter((id) => id !== wallId)
        : [...state.roomDraft, wallId],
      roomMessage: '',
    })),

  clearRoomDraft: () => set({ roomDraft: [], roomMessage: '' }),

  setRoomPicking: (active) =>
    set({ roomPicking: active, roomDraft: [], roomMessage: '' }),

  finishRoom: () => {
    const state = get();
    if (state.roomDraft.length < 3) {
      set({ roomMessage: '至少要点选三段墙才能围成区域' });
      return;
    }
    const draft = {
      id: 'R000',
      name: '待命名',
      note: '',
      boundaryWallIds: state.roomDraft,
    };
    if (!buildRoomPolygon(state.history.present, draft)) {
      set({ roomMessage: '这些墙首尾接不上，拼不成闭合区域，请按顺序重选' });
      return;
    }
    const roomId = nextId(state.history.present.rooms, 'R');
    const count = Object.keys(state.history.present.rooms).length + 1;
    const room = { ...draft, id: roomId, name: `房间${count}` };
    const project = {
      ...state.history.present,
      rooms: { ...state.history.present.rooms, [roomId]: room },
      updatedAt: new Date().toISOString(),
    };
    set({
      history: commit(state.history, project),
      roomDraft: [],
      roomPicking: false,
      roomMessage: `已生成 ${roomId}，面积可在下方查看`,
    });
  },

  updateRoom: (roomId, patch) => {
    const state = get();
    const room = state.history.present.rooms[roomId];
    if (!room) return;
    const project = {
      ...state.history.present,
      rooms: { ...state.history.present.rooms, [roomId]: { ...room, ...patch } },
      updatedAt: new Date().toISOString(),
    };
    set({ history: commit(state.history, project) });
  },

  deleteRoom: (roomId) => {
    const state = get();
    if (!state.history.present.rooms[roomId]) return;
    const rooms = { ...state.history.present.rooms };
    delete rooms[roomId];
    const project = { ...state.history.present, rooms, updatedAt: new Date().toISOString() };
    set({ history: commit(state.history, project), roomDraft: [], roomMessage: '区域已删除（可撤销）' });
  },

  addOpeningAt: (input) => {
    const state = get();
    const result = addOpening(state.history.present, input);
    if ('error' in result) {
      set({ openingMessage: result.error });
      return;
    }
    set({
      history: commit(state.history, result.project),
      openingMessage: `已添加 ${result.openingId}`,
    });
  },

  changeOpening: (openingId, patch) => {
    const state = get();
    const result = updateOpening(state.history.present, openingId, patch);
    if ('error' in result) {
      set({ openingMessage: result.error });
      return;
    }
    set({ history: commit(state.history, result.project), openingMessage: '' });
  },

  deleteOpening: (openingId) => {
    const state = get();
    const project = removeOpening(state.history.present, openingId);
    set({
      history: commit(state.history, project),
      openingMessage: '洞口已删除（可撤销）',
    });
  },
}));
