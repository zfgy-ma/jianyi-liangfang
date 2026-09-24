/** 四个正交方向：东、南、西、北 */
export type Direction = 'E' | 'S' | 'W' | 'N';

/** 平面坐标，单位毫米，整数；内部约定北为正 Y，东为正 X */
export interface Vec2 {
  x: number;
  y: number;
}

/** 点必须有可追溯来源，禁止凭空出现 */
export type PointOrigin =
  | { kind: 'origin' }
  | { kind: 'step'; fromPointId: string; direction: Direction; length: number }
  | { kind: 'onWall'; wallId: string; distance: number };

export interface PlanPoint {
  id: string;
  x: number;
  y: number;
  origin: PointOrigin;
}

/** 外墙参与墙厚偏移，内墙不自动偏移 */
export type WallKind = 'outer' | 'inner';

/** 偏移侧，沿起点指向终点的方向判断左右 */
export type OffsetSide = 'left' | 'right';

export interface Wall {
  id: string;
  startPointId: string;
  endPointId: string;
  kind: WallKind;
  offsetSide: OffsetSide;
  thickness: number;
  /** 辅助定位线不参与墙体、面积与出图 */
  isHelper: boolean;
  /** 单独覆盖的墙高，缺省时使用工程层高 */
  height?: number;
}

export type OpeningKind = 'window' | 'door';

export interface Opening {
  id: string;
  wallId: string;
  kind: OpeningKind;
  /** 洞口起始边距墙起点端的距离 */
  distance: number;
  width: number;
  height: number;
  /** 离地高度，窗常用 900，门常用 0 */
  sillHeight: number;
}

export interface Room {
  id: string;
  name: string;
  note: string;
  /** 手动圈定的边界线顺序 */
  boundaryWallIds: string[];
}

export interface Project {
  id: string;
  name: string;
  wallHeight: number;
  outerThickness: number;
  innerThickness: number;
  points: Record<string, PlanPoint>;
  walls: Record<string, Wall>;
  openings: Record<string, Opening>;
  rooms: Record<string, Room>;
  createdAt: string;
  updatedAt: string;
}
