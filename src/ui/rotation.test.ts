import { describe, expect, it } from 'vitest';
import { rotateCamera, rotationSpeed } from './rotation';

describe('视角旋转方向', () => {
  it('往右拖：画面跟着手往右转', () => {
    expect(rotateCamera({ yaw: 0, pitch: 45 }, 10, 0).yaw).toBeCloseTo(-4);
    expect(rotateCamera({ yaw: 0, pitch: 45 }, -10, 0).yaw).toBeCloseTo(4);
  });

  it('往上拖：抬高视线看屋顶；往下拖压低', () => {
    expect(rotateCamera({ yaw: 0, pitch: 45 }, 0, -10).pitch).toBeCloseTo(49);
    expect(rotateCamera({ yaw: 0, pitch: 45 }, 0, 10).pitch).toBeCloseTo(41);
  });

  it('俯仰角夹在 0 到 90 度之间', () => {
    // 最低留 5 度，避免平视时地平面塌成一条线
    expect(rotateCamera({ yaw: 0, pitch: 8 }, 0, 100).pitch).toBe(5);
    expect(rotateCamera({ yaw: 0, pitch: 88 }, 0, -100).pitch).toBe(90);
  });

  it('锁住水平方向时只改俯仰', () => {
    const result = rotateCamera({ yaw: 45, pitch: 30 }, 50, 10, { lockYaw: true });
    expect(result.yaw).toBe(45);
    expect(result.pitch).toBeCloseTo(26);
  });

  it('放大后转速变慢，缩小时不再加速', () => {
    // 基准缩放：0.4 度/像素
    expect(rotationSpeed(0.05)).toBeCloseTo(0.4);
    // 放大十倍：转速降到十分之一，避免一拖就飞出去
    expect(rotationSpeed(0.5)).toBeCloseTo(0.04);
    // 缩得比基准还远：保持基准速度，不反向加速
    expect(rotationSpeed(0.005)).toBeCloseTo(0.4);
  });
});
