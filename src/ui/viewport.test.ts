import { describe, expect, it } from 'vitest';
import {
  enabledDirections,
  fitElevationViewport,
  nearestStandardView,
  nextStandardView,
  snapView,
  snapYawToCardinal,
  STANDARD_VIEWS,
  THREE_VIEW,
  toScreen,
  type Viewport,
} from './viewport';

const plan: Viewport = {
  centerX: 0,
  centerY: 0,
  scale: 0.1,
  width: 800,
  height: 600,
  yaw: 0,
  pitch: 90,
};

describe('三维投影', () => {
  it('正俯视就是平面图：北在上，高度不影响位置', () => {
    const point = toScreen(plan, { x: 1000, y: 2000, z: 500 });
    expect(point.x).toBeCloseTo(500);
    expect(point.y).toBeCloseTo(100);
  });

  it('平视时由高度决定屏幕纵向位置', () => {
    const front: Viewport = { ...plan, pitch: 0 };
    const point = toScreen(front, { x: 1000, y: 2000, z: 500 });
    expect(point.x).toBeCloseTo(500);
    expect(point.y).toBeCloseTo(250);
  });

  it('接近标准视角时自动吸附，偏离时不吸附', () => {
    expect(snapView(3, 87)).toEqual({ yaw: 0, pitch: 90 });
    expect(snapView(40, 60)).toEqual({ yaw: 40, pitch: 60 });
  });

  it('三维视图的水平方向锁在东西南北四个正方向', () => {
    expect(snapYawToCardinal(80)).toBe(90);
    expect(snapYawToCardinal(-4)).toBe(0);
    expect(snapYawToCardinal(184)).toBe(180);
  });

  it('回到最近的标准正视图：平面图一定北朝上', () => {
    expect(nearestStandardView(12, 78)).toBe('plan');
    expect(nearestStandardView(95, 8)).toBe('east');
    expect(nearestStandardView(355, 5)).toBe('south');
    // 平面图固定北朝上
    expect(STANDARD_VIEWS.plan).toEqual({ yaw: 0, pitch: 90, label: '平面图' });
  });

  it('标准视图按钮按平面图 → 东 → 南 → 西 → 北循环', () => {
    expect(nextStandardView('plan')).toBe('east');
    expect(nextStandardView('east')).toBe('south');
    expect(nextStandardView('south')).toBe('west');
    expect(nextStandardView('north')).toBe('plan');
  });

  it('三维视图默认以 45 度角查看', () => {
    expect(THREE_VIEW).toEqual({ yaw: 45, pitch: 45 });
  });

  it('方向键按当前视角置灰：平面没有上下，立面没有平面外方向', () => {
    // 平面视角：只能走东西南北
    expect(enabledDirections({ yaw: 0, pitch: 90 })).toEqual(['N', 'E', 'S', 'W']);
    // 东向/西向立面：平面外的东西方向置灰
    expect(enabledDirections({ yaw: 90, pitch: 0 })).toEqual(['N', 'S', 'U', 'D']);
    // 南向/北向立面：平面外的南北方向置灰
    expect(enabledDirections({ yaw: 0, pitch: 0 })).toEqual(['E', 'W', 'U', 'D']);
  });

  it('立面取景会把相机摆到对应方向，避免画的和提示的对不上', () => {
    const viewport = fitElevationViewport(800, 600, 10000, 8000, 180, 0);
    expect(viewport.yaw).toBe(180);
    expect(viewport.pitch).toBe(0);
    // 内容居中并按比例缩放
    expect(viewport.centerX).toBe(5000);
    expect(viewport.centerY).toBe(4000);
    expect(viewport.scale).toBeGreaterThan(0);
  });
});
