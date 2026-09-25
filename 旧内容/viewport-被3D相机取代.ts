import type { Project, Vec2 } from '../core/types';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Viewport {
  centerX: number;
  centerY: number;
  scale: number;
  width: number;
  height: number;
}

export function projectBounds(project: Project): Bounds | null {
  const points = Object.values(project.points);
  if (points.length === 0) return null;
  return points.reduce<Bounds>(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: points[0].x,
      minY: points[0].y,
      maxX: points[0].x,
      maxY: points[0].y,
    },
  );
}

/** 自动适配：把整个户型放进画布中央 */
export function fitViewport(project: Project, width: number, height: number): Viewport {
  const bounds = projectBounds(project);
  if (!bounds) {
    return { centerX: 0, centerY: 0, scale: 0.05, width, height };
  }
  const worldWidth = Math.max(bounds.maxX - bounds.minX, 1000);
  const worldHeight = Math.max(bounds.maxY - bounds.minY, 1000);
  const scale = Math.min((width * 0.7) / worldWidth, (height * 0.7) / worldHeight);
  return {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerY: (bounds.minY + bounds.maxY) / 2,
    scale: Math.max(0.005, Math.min(scale, 1)),
    width,
    height,
  };
}

/** 世界坐标（毫米，北为正 Y）转屏幕坐标（Y 向下） */
export function toScreen(viewport: Viewport, position: Vec2): Vec2 {
  return {
    x: viewport.width / 2 + (position.x - viewport.centerX) * viewport.scale,
    y: viewport.height / 2 - (position.y - viewport.centerY) * viewport.scale,
  };
}

/** 屏幕坐标转世界坐标，用于以指针为锚点缩放 */
export function toWorld(viewport: Viewport, position: Vec2): Vec2 {
  return {
    x: viewport.centerX + (position.x - viewport.width / 2) / viewport.scale,
    y: viewport.centerY - (position.y - viewport.height / 2) / viewport.scale,
  };
}
