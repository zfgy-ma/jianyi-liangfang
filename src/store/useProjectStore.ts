import { create } from 'zustand';
import {
  applyOuterThickness,
  flipWallOffsetSide,
  removeWall,
  setWallKind,
  setWallHeight as applyWallHeight,
  setWallThickness,
  updateWallLength,
} from '../core/edit';
import { commit, initHistory, redo, undo, type History } from '../core/history';
import { elevationAxis } from '../core/elevation';
import {
  detectRectangle,
  drawElevationStroke,
  type ElevationDraft,
} from '../core/elevationDraft';
import { addOpening, removeOpening, updateOpening } from '../core/opening';
import { createOriginPoint, createProject, drawWall, nextId } from '../core/project';
import { buildRoomPolygon } from '../core/room';
import { splitWallAt } from '../core/split';
import type { Direction, OpeningKind, Project, WallKind } from '../core/types';

export type InputMode = 'wall' | 'helper' | 'select';
export type TabKey = 'plan' | 'elevation' | 'facade' | 'axon';
/** 底部浮层面板：手机上用完即收，避免页面越滚越长 */
export type SheetKey = 'none' | 'project' | 'rooms' | 'wall' | 'opening';
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
  activeSheet: SheetKey;
  startCorner: CornerKey;
  /** 圈定区域时按顺序收集的墙 id */
  roomDraft: string[];
  roomMessage: string;
  roomPicking: boolean;
  openingMessage: string;
  /** 一次性操作提示，显示在底部状态栏 */
  toolMessage: string;
  /** 立面上手画草稿：用方向＋长度落笔，最后四笔围成矩形即可标记成洞口 */
  elevationDraft: ElevationDraft;
  setTab: (tab: TabKey) => void;
  setActiveSheet: (sheet: SheetKey) => void;
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
  updateProjectMeta: (patch: {
    name?: string;
    wallHeight?: number;
    outerThickness?: number;
  }) => void;
  changeWallHeight: (wallId: string, height: number | undefined) => void;
  applyOuterThicknessToAll: () => void;
  markElevationDraft: (kind: OpeningKind) => void;
  clearElevationDraft: () => void;
}

/** 新工程开局：原点固定，起点角只影响录入提示 */
function freshProject(name: string) {
  const created = createOriginPoint(createProject(name), 0, 0);
  return { history: initHistory(created.project), activePointId: created.pointId };
}

/**
 * 撤销、重做或删除之后，落笔点可能指向已经不存在的点。
 * 这里把它收拢到仍然存在的点上，否则后续录入会静默失效。
 */
function resolveActivePoint(project: Project, currentId: string | null): string | null {
  if (currentId && project.points[currentId]) return currentId;
  const ids = Object.keys(project.points);
  return ids.length > 0 ? ids[ids.length - 1] : null;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...freshProject('未命名工程'),
  selectedWallId: null,
  mode: 'wall',
  direction: null,
  digits: '',
  tab: 'plan',
  activeSheet: 'none',
  startCorner: 'SE',
  roomDraft: [],
  roomMessage: '',
  roomPicking: false,
  openingMessage: '',
  toolMessage: '',
  elevationDraft: { point: { x: 0, y: 0 }, segments: [] },

  setTab: (tab) => set({ tab }),
  setActiveSheet: (sheet) => set({ activeSheet: sheet }),
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
  selectWall: (wallId) =>
    set({
      selectedWallId: wallId,
      elevationDraft: { point: { x: 0, y: 0 }, segments: [] },
    }),

  pressDirection: (direction) => set({ direction }),
  pressDigit: (digit) => set({ digits: get().digits + digit }),
  pressBackspace: () => set({ digits: get().digits.slice(0, -1) }),
  cancelInput: () => set({ direction: null, digits: '' }),

  confirmDraw: () => {
    const state = get();
    const length = Number(state.digits);
    if (!state.direction || !Number.isFinite(length) || length <= 0) {
      return;
    }
    // 立面页：方向与长度画的是墙面上的草稿线，不是平面墙
    if (state.tab === 'elevation') {
      if (!state.selectedWallId) {
        set({ toolMessage: '先在平面图上点选一面墙，再在立面上落笔' });
        return;
      }
      set({
        elevationDraft: drawElevationStroke(
          state.elevationDraft,
          state.direction,
          length,
        ),
        direction: null,
        digits: '',
      });
      return;
    }
    const activePointId = resolveActivePoint(state.history.present, state.activePointId);
    if (!activePointId) {
      set({ toolMessage: '当前工程还没有起点，先在“工程”里新建或点选一个端点' });
      return;
    }
    const result = drawWall(state.history.present, {
      fromPointId: activePointId,
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
    const result = splitWallAt(state.history.present, wallId, distance);
    if ('error' in result) {
      set({ toolMessage: result.error });
      return;
    }
    set({
      history: commit(state.history, result.project),
      activePointId: result.pointId,
      selectedWallId: wallId,
      direction: null,
      digits: '',
      toolMessage: `${wallId} 已在 ${distance}mm 处断开，新端点 ${result.pointId} 已设为起点`,
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

  undo: () =>
    set((state) => {
      const history = undo(state.history);
      return {
        history,
        activePointId: resolveActivePoint(history.present, state.activePointId),
        direction: null,
        digits: '',
        toolMessage: '已撤销一步，可以继续接着画',
      };
    }),
  redo: () =>
    set((state) => {
      const history = redo(state.history);
      return {
        history,
        activePointId: resolveActivePoint(history.present, state.activePointId),
        direction: null,
        digits: '',
        toolMessage: '已重做一步',
      };
    }),

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

  updateProjectMeta: (patch) => {
    const state = get();
    const project = {
      ...state.history.present,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    set({ history: commit(state.history, project) });
  },

  changeWallHeight: (wallId, height) => {
    const state = get();
    const project = applyWallHeight(state.history.present, wallId, height);
    set({ history: commit(state.history, project) });
  },

  applyOuterThicknessToAll: () => {
    const state = get();
    const project = applyOuterThickness(state.history.present);
    set({
      history: commit(state.history, project),
      toolMessage: `所有外墙厚度已统一为 ${project.outerThickness}mm`,
    });
  },

  clearElevationDraft: () =>
    set({ elevationDraft: { point: { x: 0, y: 0 }, segments: [] } }),

  markElevationDraft: (kind) => {
    const state = get();
    const wallId = state.selectedWallId;
    const wall = wallId ? state.history.present.walls[wallId] : null;
    if (!wallId || !wall) {
      set({ openingMessage: '先在平面图上点选一面墙' });
      return;
    }
    const rect = detectRectangle(state.elevationDraft.segments);
    if (!rect) {
      set({ openingMessage: '最后四笔没有围成闭合矩形，无法标记成洞口' });
      return;
    }
    const axis = elevationAxis(state.history.present, wall);
    if (!axis) {
      set({ openingMessage: '这面墙的端点数据不完整' });
      return;
    }
    const result = addOpening(state.history.present, {
      wallId,
      kind,
      distance: axis.toWallDistance(rect.left),
      width: rect.width,
      height: rect.height,
      sillHeight: rect.bottom,
    });
    if ('error' in result) {
      set({ openingMessage: result.error });
      return;
    }
    set({
      history: commit(state.history, result.project),
      elevationDraft: { point: { x: 0, y: 0 }, segments: [] },
      openingMessage: `已把画出的矩形标记为${kind === 'window' ? '窗' : '门'}：${result.openingId}`,
    });
  },
}));
