import { describe, expect, it } from 'vitest';
import { elevationAxis, openingsOfWall } from './elevation';
import { addOpening, removeOpening, validateOpening } from './opening';
import { createOriginPoint, createProject, drawWall } from './project';
import type { OffsetSide } from './types';

function fixture(offsetSide: OffsetSide) {
  const origin = createOriginPoint(createProject('洞口测试'), 0, 0);
  const south = drawWall(origin.project, {
    fromPointId: origin.pointId,
    direction: 'E',
    length: 4000,
    offsetSide,
  });
  return {
    project: south.project,
    wallId: south.wallId,
    wall: south.project.walls[south.wallId],
  };
}

describe('单墙立面的水平轴', () => {
  it('墙厚朝北偏移时，人站南侧朝北看，左手边是西，正是墙的起点', () => {
    // 南墙起点在西、终点在东，方向为东；左法线朝北，所以偏移侧在左＝墙厚朝北。
    const data = fixture('left');
    const axis = elevationAxis(data.project, data.wall);
    expect(axis?.length).toBe(4000);
    expect(axis?.toAxisX(1200)).toBe(1200);
    expect(axis?.toWallDistance(1200)).toBe(1200);
    expect(axis?.viewFromLabel).toContain('右侧');
  });

  it('墙厚朝南偏移时，人站北侧朝南看，左手边是东，即墙的终点', () => {
    // 偏移侧在右＝墙厚朝南，室内在墙北侧，左右对调。
    const data = fixture('right');
    const axis = elevationAxis(data.project, data.wall);
    expect(axis?.toAxisX(1200)).toBe(2800);
    expect(axis?.toWallDistance(2800)).toBe(1200);
    expect(axis?.viewFromLabel).toContain('左侧');
  });
});

describe('洞口校验与增删', () => {
  it('超出墙长或墙高时给出中文原因', () => {
    const data = fixture('right');
    const tooWide = validateOpening(data.project, {
      wallId: data.wallId,
      kind: 'window',
      distance: 3500,
      width: 1500,
      height: 1500,
      sillHeight: 900,
    });
    const tooTall = validateOpening(data.project, {
      wallId: data.wallId,
      kind: 'window',
      distance: 0,
      width: 1500,
      height: 2500,
      sillHeight: 900,
    });
    expect(tooWide).toContain('超出了墙的另一端');
    expect(tooTall).toContain('超过了墙面高度');
  });

  it('合法洞口能写入，按距起点排序，并可以删除', () => {
    const data = fixture('right');
    const far = addOpening(data.project, {
      wallId: data.wallId,
      kind: 'window',
      distance: 2000,
      width: 1200,
      height: 1500,
      sillHeight: 900,
    });
    if ('error' in far) throw new Error(far.error);
    const near = addOpening(far.project, {
      wallId: data.wallId,
      kind: 'door',
      distance: 200,
      width: 900,
      height: 2100,
      sillHeight: 0,
    });
    if ('error' in near) throw new Error(near.error);
    expect(openingsOfWall(near.project, data.wallId).map((item) => item.kind)).toEqual([
      'door',
      'window',
    ]);
    const cleaned = removeOpening(near.project, far.openingId);
    expect(Object.keys(cleaned.openings)).toHaveLength(1);
  });
});
