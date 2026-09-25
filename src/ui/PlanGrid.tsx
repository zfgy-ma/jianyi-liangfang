import type { ReactElement } from 'react';
import type { Viewport } from './viewport';

/** 网格基准间距：100mm 一格 */
const GRID_STEP = 100;
/** 屏幕上小于这个像素间距就不画细格，否则会糊成一片 */
const MIN_PIXEL_GAP = 5;
const MAX_LINES = 400;

export function PlanGrid({ viewport }: { viewport: Viewport }) {
  const halfWidth = viewport.width / 2 / viewport.scale;
  const halfHeight = viewport.height / 2 / viewport.scale;
  const left = viewport.centerX - halfWidth;
  const right = viewport.centerX + halfWidth;
  const bottom = viewport.centerY - halfHeight;
  const top = viewport.centerY + halfHeight;

  const showMinor = GRID_STEP * viewport.scale >= MIN_PIXEL_GAP;
  const step = showMinor ? GRID_STEP : GRID_STEP * 10;
  const majorEvery = GRID_STEP * 10;
  const lines: ReactElement[] = [];

  const toScreenX = (x: number) => viewport.width / 2 + (x - viewport.centerX) * viewport.scale;
  const toScreenY = (y: number) => viewport.height / 2 - (y - viewport.centerY) * viewport.scale;

  let count = 0;
  for (let x = Math.floor(left / step) * step; x <= right && count < MAX_LINES; x += step) {
    const screenX = toScreenX(x);
    lines.push(
      <line
        key={`v-${x}`}
        className={Math.abs(x) % majorEvery === 0 ? 'grid-line grid-line-major' : 'grid-line'}
        x1={screenX}
        y1={0}
        x2={screenX}
        y2={viewport.height}
      />,
    );
    count += 1;
  }

  count = 0;
  for (let y = Math.floor(bottom / step) * step; y <= top && count < MAX_LINES; y += step) {
    const screenY = toScreenY(y);
    lines.push(
      <line
        key={`h-${y}`}
        className={Math.abs(y) % majorEvery === 0 ? 'grid-line grid-line-major' : 'grid-line'}
        x1={0}
        y1={screenY}
        x2={viewport.width}
        y2={screenY}
      />,
    );
    count += 1;
  }

  return <g className="plan-grid">{lines}</g>;
}
