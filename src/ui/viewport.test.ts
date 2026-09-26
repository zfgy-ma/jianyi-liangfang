import { describe, expect, it } from 'vitest';
import {
  nearestStandardView,
  nextStandardView,
  snapView,
  snapYawToCardinal,
  STANDARD_VIEWS,
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
    expect(nearestStandardView(95, 8)).toBe('ew');
    expect(nearestStandardView(355, 5)).toBe('ns');
    // 平面图固定北朝上
    expect(STANDARD_VIEWS.plan).toEqual({ yaw: 0, pitch: 90, label: '平面图' });
  });

  it('标准视图按钮按平面图 → 东西向 → 南北向循环', () => {
    expect(nextStandardView('plan')).toBe('ew');
    expect(nextStandardView('ew')).toBe('ns');
    expect(nextStandardView('ns')).toBe('plan');
  });
});
