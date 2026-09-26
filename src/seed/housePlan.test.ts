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

  it('墙高按立面图分开：西块 3400、东块 2602', () => {
    const heights = Object.values(project.walls).map((wall) => wall.height);
    expect(heights.filter((height) => height === 3400)).toHaveLength(4);
    expect(heights.filter((height) => height === 2602)).toHaveLength(2);
  });

  it('洞口三个：2640 门、3080 大窗、2070 矩形拱窗替代', () => {
    const openings = Object.values(project.openings);
    expect(openings).toHaveLength(3);
    const door = openings.find((opening) => opening.kind === 'door');
    expect(door?.width).toBe(2640);
    expect(door?.height).toBe(2580);
    expect(door?.sillHeight).toBe(0);
    const windows = openings.filter((opening) => opening.kind === 'window');
    expect(windows.map((opening) => opening.width).sort((a, b) => a - b)).toEqual([
      2070, 3080,
    ]);
    // 拱窗改矩形：仍是矩形洞口，离地 260、高 2440
    const arch = windows.find((opening) => opening.width === 2070);
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

  it('四向立面都出图，错位转角保留台阶', () => {
    for (const direction of ['E', 'S', 'W', 'N'] as const) {
      const view = buildFacade(project, direction);
      expect(view.faces.length).toBeGreaterThan(0);
    }
    const north = buildFacade(project, 'N');
    // 南墙最远、东段北墙居中、西段北墙最近
    expect(north.faces).toHaveLength(3);
    // 轮廓被最远的 3400 高南墙撑满；东段 2602 矮墙的顶线靠 faces 叠出转角
    expect(north.walls).toHaveLength(1);
    expect(north.walls[0].height).toBe(3400);
    const lowerFace = north.faces.find((face) => face.height === 2602);
    expect(lowerFace).toBeDefined();
    expect(lowerFace?.depth).toBeGreaterThan(0);
    const east = buildFacade(project, 'E');
    expect(east.faces).toHaveLength(3);
  });
});
