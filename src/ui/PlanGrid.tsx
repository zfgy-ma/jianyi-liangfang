import type { ReactElement } from 'react';
import { toScreen, viewToGround, type Viewport } from './viewport';

/** 网格基准间距：100mm 一格 */
const GRID_STEP = 100;
/** 屏幕上小于这个像素间距就不画细格，否则会糊成一片 */
const MIN_PIXEL_GAP = 5;
const MAX_LINES = 400;

export function PlanGrid({ viewport }: { viewport: Viewport }) {
  // 俯仰角太小时地平面几乎退化成一条线，网格没有意义
  if (viewport.pitch < 12) return null;

  const halfWidth = viewport.width / 2 / viewport.scale;
  const halfHeight = viewport.height / 2 / viewport.scale;
  const corners = [
    viewToGround(viewport, {
      x: viewport.centerX - halfWidth,
      y: viewport.centerY - halfHeight,
    }),
    viewToGround(viewport, {
      x: viewport.centerX + halfWidth,
      y: viewport.centerY - halfHeight,
    }),
    viewToGround(viewport, {
      x: viewport.centerX - halfWidth,
      y: viewport.centerY + halfHeight,
    }),
    viewToGround(viewport, {
      x: viewport.centerX + halfWidth,
      y: viewport.centerY + halfHeight,
    }),
  ];
  const left = Math.min(...corners.map((corner) => corner.x));
  const right = Math.max(...corners.map((corner) => corner.x));
  const bottom = Math.min(...corners.map((corner) => corner.y));
  const top = Math.max(...corners.map((corner) => corner.y));
  const showMinor = GRID_STEP * viewport.scale >= MIN_PIXEL_GAP;
  const step = showMinor ? GRID_STEP : GRID_STEP * 10;
  const majorEvery = GRID_STEP * 10;
  const lines: ReactElement[] = [];

  let count = 0;
  for (let x = Math.floor(left / step) * step; x <= right && count < MAX_LINES; x += step) {
    const from = toScreen(viewport, { x, y: bottom, z: 0 });
    const to = toScreen(viewport, { x, y: top, z: 0 });
    lines.push(
      <line
        key={`v-${x}`}
        className={Math.abs(x) % majorEvery === 0 ? 'grid-line grid-line-major' : 'grid-line'}
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
      />,
    );
    count += 1;
  }

  count = 0;
  for (let y = Math.floor(bottom / step) * step; y <= top && count < MAX_LINES; y += step) {
    const from = toScreen(viewport, { x: left, y, z: 0 });
    const to = toScreen(viewport, { x: right, y, z: 0 });
    lines.push(
      <line
        key={`h-${y}`}
        className={Math.abs(y) % majorEvery === 0 ? 'grid-line grid-line-major' : 'grid-line'}
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
      />,
    );
    count += 1;
  }

  return <g className="plan-grid">{lines}</g>;
}
