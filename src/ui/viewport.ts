import type { MoveDirection, PointLike, Project, Vec2 } from '../core/types';
import { effectiveWallHeight } from '../core/facade';
import { buildWallBodies } from '../core/wallOffset';
import type { ViewDirection } from '../core/facade';

/**
 * 视图：正交投影相机 + 屏幕映射。
 * pitch = 90 是正俯视（平面图），pitch = 0 是平视（立面），中间就是三维视角。
 */
export interface Viewport {
  /** 视图平面上的中心，单位毫米 */
  centerX: number;
  centerY: number;
  /** 像素 / 毫米 */
  scale: number;
  width: number;
  height: number;
  /** 方位角，度 */
  yaw: number;
  /** 俯仰角，度 */
  pitch: number;
}

export const PLAN_VIEW = { yaw: 0, pitch: 90 };
/** 三维视图：默认 45 度俯视的转角视角，水平方向锁死，只能调俯仰 */
export const THREE_VIEW = { yaw: 45, pitch: 45 };
/** 等轴测：方位 45°、俯仰 35.264°，标准轴测角度 */
export const ISO_VIEW = { yaw: 45, pitch: 35.264 };

export type StandardViewKey = 'plan' | 'east' | 'south' | 'west' | 'north';

/**
 * 五个标准正视图：平面图（北朝上）与四个方向的立面。
 * 立面视角按"观察者站在那一侧往里看"取方位角，左右关系与现场一致。
 */
export const STANDARD_VIEWS: Record<
  StandardViewKey,
  { yaw: number; pitch: number; label: string }
> = {
  plan: { yaw: 0, pitch: 90, label: '平面图' },
  east: { yaw: 90, pitch: 0, label: '东向' },
  south: { yaw: 0, pitch: 0, label: '南向' },
  west: { yaw: 270, pitch: 0, label: '西向' },
  north: { yaw: 180, pitch: 0, label: '北向' },
};

/** 立面视角需要先选好一条线，不能凭空切过去 */
export function isElevationView(key: StandardViewKey): boolean {
  return key !== 'plan';
}

/** 标准视图 ←→ 观察方位 */
export const VIEW_DIRECTION_OF: Record<StandardViewKey, ViewDirection> = {
  plan: 'S',
  east: 'E',
  south: 'S',
  west: 'W',
  north: 'N',
};

export const STANDARD_VIEW_OF_DIRECTION: Record<ViewDirection, StandardViewKey> = {
  E: 'east',
  S: 'south',
  W: 'west',
  N: 'north',
};

/** 找出离当前视角最近的标准正视图，平面图一律回正到北朝上 */
export function nearestStandardView(yaw: number, pitch: number): StandardViewKey {
  if (Math.abs(90 - pitch) <= 45) return 'plan';
  const normalized = ((yaw % 360) + 360) % 360;
  const order: StandardViewKey[] = ['south', 'east', 'north', 'west'];
  return order[Math.round(normalized / 90) % 4];
}

/** 循环切换：平面图 → 东 → 南 → 西 → 北 → 平面图 */
export function nextStandardView(current: StandardViewKey): StandardViewKey {
  const order: StandardViewKey[] = ['plan', 'east', 'south', 'west', 'north'];
  return order[(order.indexOf(current) + 1) % order.length];
}

/**
 * 当前视角下可以落笔的方向：平面视角只能走东西南北，
 * 立面视角只能在该立面平面内走，另一个水平方向变灰不可点。
 */
export function enabledDirections(camera: {
  yaw: number;
  pitch: number;
}): MoveDirection[] {
  if (camera.pitch > 45) return ['N', 'E', 'S', 'W'];
  const normalized = ((camera.yaw % 180) + 180) % 180;
  const lookingEastWest = Math.abs(normalized - 90) < 45;
  return lookingEastWest ? ['N', 'S', 'U', 'D'] : ['E', 'W', 'U', 'D'];
}

/** 世界坐标 → 视图平面坐标（毫米） */
export function projectPoint(viewport: Viewport, point: PointLike): Vec2 {
  const yaw = (viewport.yaw * Math.PI) / 180;
  const pitch = (viewport.pitch * Math.PI) / 180;
  const z = point.z ?? 0;
  const along = point.x * Math.cos(yaw) + point.y * Math.sin(yaw);
  const depth = -point.x * Math.sin(yaw) + point.y * Math.cos(yaw);
  return {
    x: along,
    y: -depth * Math.sin(pitch) - z * Math.cos(pitch),
  };
}

/** 视图平面坐标 → 屏幕像素 */
export function toScreen(viewport: Viewport, point: PointLike): Vec2 {
  const view = projectPoint(viewport, point);
  return {
    x: viewport.width / 2 + (view.x - viewport.centerX) * viewport.scale,
    y: viewport.height / 2 + (view.y - viewport.centerY) * viewport.scale,
  };
}

/** 屏幕像素 → 视图平面坐标，用于以指针为锚点缩放 */
export function screenToView(viewport: Viewport, screen: Vec2): Vec2 {
  return {
    x: viewport.centerX + (screen.x - viewport.width / 2) / viewport.scale,
    y: viewport.centerY + (screen.y - viewport.height / 2) / viewport.scale,
  };
}

/** 视图平面坐标 → 地平面（z=0）上的世界坐标，用于铺网格 */
export function viewToGround(viewport: Viewport, view: Vec2): Vec2 {
  const yaw = (viewport.yaw * Math.PI) / 180;
  const pitch = (viewport.pitch * Math.PI) / 180;
  const sinPitch = Math.sin(pitch);
  const depth = Math.abs(sinPitch) < 1e-6 ? 0 : -view.y / sinPitch;
  return {
    x: view.x * Math.cos(yaw) - depth * Math.sin(yaw),
    y: view.x * Math.sin(yaw) + depth * Math.cos(yaw),
  };
}

/** 把整个工程放进画面中央 */
export function fitViewport(
  project: Project,
  width: number,
  height: number,
  yaw: number,
  pitch: number,
): Viewport {
  const base: Viewport = {
    centerX: 0,
    centerY: 0,
    scale: 0.05,
    width,
    height,
    yaw,
    pitch,
  };
  const points = Object.values(project.points);
  if (points.length === 0) return base;

  // 取景必须把墙顶也算进去：只算平面点的话，转到平视时纵向范围接近 0，
  // 挤出的墙体就会跑出画面，看着又小又空。
  const samples: PointLike[] = points.map((point) => ({
    x: point.x,
    y: point.y,
    z: point.z,
  }));
  for (const body of buildWallBodies(project)) {
    const wall = project.walls[body.wallId];
    if (!wall) continue;
    const top = effectiveWallHeight(project, wall);
    for (const corner of body.polygon) {
      samples.push({ x: corner.x, y: corner.y, z: top });
    }
  }

  const projected = samples.map((point) => projectPoint(base, point));
  const xs = projected.map((point) => point.x);
  const ys = projected.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1000);
  const spanY = Math.max(maxY - minY, 1000);
  const scale = Math.max(
    0.004,
    Math.min((width * 0.72) / spanX, (height * 0.72) / spanY, 1),
  );
  return {
    ...base,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    scale,
  };
}

/** 把一张立面图放进画面中央（二维立面不经过相机） */
export function fitElevationViewport(
  width: number,
  height: number,
  contentWidth: number,
  contentHeight: number,
  yaw = 0,
  pitch = 0,
): Viewport {
  const spanX = Math.max(contentWidth, 1000);
  const spanY = Math.max(contentHeight, 1000);
  return {
    centerX: spanX / 2,
    centerY: spanY / 2,
    scale: Math.max(
      0.005,
      Math.min((width * 0.78) / spanX, (height * 0.72) / spanY, 1),
    ),
    width,
    height,
    yaw,
    pitch,
  };
}

/** 视角吸附：接近常见视角时自动对齐，方便快速回到标准方向 */
export function snapView(
  yaw: number,
  pitch: number,
): { yaw: number; pitch: number } {
  let nextYaw = yaw;
  for (const angle of [0, 90, 180, 270, -90, -180]) {
    if (Math.abs(yaw - angle) <= 6) nextYaw = angle;
  }
  let nextPitch = pitch;
  for (const angle of [90, 35, 0]) {
    if (Math.abs(pitch - angle) <= 8) nextPitch = angle;
  }
  return { yaw: nextYaw, pitch: Math.max(0, Math.min(90, nextPitch)) };
}

/** 把方位角吸附到东西南北四个正方向 */
export function snapYawToCardinal(yaw: number): number {
  // 加 0 是为了把 -0 归一成 0
  return Math.round(yaw / 90) * 90 + 0;
}
