import { describe, expect, it } from 'vitest';
import { buildFacade } from '../core/facade';
import { lengthBetween } from '../core/geometry';
import { roomArea, toSquareMeters } from '../core/room';
import type { Project } from '../core/types';
import { createHousePlan } from './housePlan';

function wallLengths(project: Project): number[] {
  return Object.values(project.walls)
    .map((wall) => {
      const start = project.points[wall.startPointId];
      const end = project.points[wall.endPointId];
      return start && end ? Math.round(lengthBetween(start, end)) : 0;
    })
    .sort((left, right) => left - right);
}

describe('手绘图种子模型', () => {
  const project = createHousePlan();

  it('平面尺寸与图纸一致：六段外墙首尾相接', () => {
    expect(wallLengths(project)).toEqual([2602, 2798, 3550, 5400, 7200, 10750]);
  });

  it('墙高统一 3400（A、C 面标注）', () => {
    const heights = Object.values(project.walls).map((wall) => wall.height);
    expect(heights).toHaveLength(6);
    expect(new Set(heights)).toEqual(new Set([3400]));
  });

  it('洞口三个：A 面 2640 + 3080，C 面拱窗改矩形 2070', () => {
    const openings = Object.values(project.openings);
    expect(openings).toHaveLength(3);
    // 拱窗不画弧：三个洞口都是矩形窗数据
    expect(openings.every((opening) => opening.kind === 'window')).toBe(true);
    expect(openings.map((opening) => opening.width).sort((a, b) => a - b)).toEqual([
      2070, 2640, 3080,
    ]);
    const first = openings.find((opening) => opening.width === 2640);
    const second = openings.find((opening) => opening.width === 3080);
    // A 面两洞在同一面墙：570 + 2640 + 640 + 3350 = 7200
    expect(first?.wallId).toBe(second?.wallId);
    expect(first?.sillHeight).toBe(140);
    expect(first?.height).toBe(2440);
    expect(second?.sillHeight).toBe(710);
    expect(second?.height).toBe(2440);
    // C 面拱窗改矩形：宽 2070、高 2440、离地 260
    const arch = openings.find((opening) => opening.width === 2070);
    expect(arch?.wallId).not.toBe(first?.wallId);
    expect(arch?.height).toBe(2440);
    expect(arch?.sillHeight).toBe(260);
  });

  it('客厅区域能直接量出 L 形面积', () => {
    const room = Object.values(project.rooms)[0];
    const area = roomArea(project, room);
    expect(area).not.toBeNull();
    const expected =
      3550 * 5400 + 7200 * 2602; // 西块 + 东块，单位平方毫米
    expect(area).toBe(expected);
    expect(toSquareMeters(area ?? 0)).toBeCloseTo(37.9, 1);
  });

  it('四向立面都出图，错位转角保留竖向棱线', () => {
    for (const direction of ['E', 'S', 'W', 'N'] as const) {
      const view = buildFacade(project, direction);
      expect(view.faces.length).toBeGreaterThan(0);
    }
    const north = buildFacade(project, 'N');
    // 南墙最远、东段北墙居中、西段北墙最近，转角靠最近墙的边界线保留
    expect(north.faces).toHaveLength(3);
    expect(north.walls).toHaveLength(1);
    expect(north.walls[0].height).toBe(3400);
    const nearest = north.faces[north.faces.length - 1];
    expect(nearest.width).toBe(3550);
    expect(nearest.depth).toBe(0);
    const east = buildFacade(project, 'E');
    expect(east.faces).toHaveLength(3);
  });

  it('按用户确认锁定方向：A 面 570 从东端、C 面拱窗在图纸左侧 550', () => {
    // A 面（北立面）：570 留白在东端，立面上应出现在左侧 570
    const north = buildFacade(project, 'N');
    const firstOpening = north.openings.find((opening) => opening.width === 2640);
    expect(firstOpening?.left).toBe(570);

    // C 面（西立面）：拱窗改矩形窗，从图纸左边 550 起
    const west = buildFacade(project, 'W');
    const archWindow = west.openings.find((opening) => opening.width === 2070);
    expect(archWindow?.left).toBe(550);
    expect(archWindow?.height).toBe(2440);
  });
});
