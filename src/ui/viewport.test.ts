import { describe, expect, it } from 'vitest';
import { snapView, snapYawToCardinal, toScreen, type Viewport } from './viewport';

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
});
