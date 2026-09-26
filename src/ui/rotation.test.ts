import { describe, expect, it } from 'vitest';
import { rotateCamera } from './rotation';

describe('视角旋转方向', () => {
  it('往右拖：画面跟着手往右转', () => {
    expect(rotateCamera({ yaw: 0, pitch: 45 }, 10, 0).yaw).toBeCloseTo(-4);
    expect(rotateCamera({ yaw: 0, pitch: 45 }, -10, 0).yaw).toBeCloseTo(4);
  });

  it('往下拖：抬高视线看屋顶；往上拖压低', () => {
    expect(rotateCamera({ yaw: 0, pitch: 45 }, 0, 10).pitch).toBeCloseTo(49);
    expect(rotateCamera({ yaw: 0, pitch: 45 }, 0, -10).pitch).toBeCloseTo(41);
  });

  it('俯仰角夹在 0 到 90 度之间', () => {
    expect(rotateCamera({ yaw: 0, pitch: 2 }, 0, -100).pitch).toBe(0);
    expect(rotateCamera({ yaw: 0, pitch: 88 }, 0, 100).pitch).toBe(90);
  });

  it('锁住水平方向时只改俯仰', () => {
    const result = rotateCamera({ yaw: 45, pitch: 30 }, 50, 10, { lockYaw: true });
    expect(result.yaw).toBe(45);
    expect(result.pitch).toBeCloseTo(34);
  });
});
