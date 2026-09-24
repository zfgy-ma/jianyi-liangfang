import { lengthBetween } from './geometry';
import { nextId } from './project';
import type { Opening, OpeningKind, Project } from './types';

export interface OpeningInput {
  wallId: string;
  kind: OpeningKind;
  /** 洞口起始边距墙起点端的距离 */
  distance: number;
  width: number;
  height: number;
  sillHeight: number;
}

/** 校验洞口是否落在墙面范围内，返回中文原因或 null */
export function validateOpening(project: Project, input: OpeningInput): string | null {
  const wall = project.walls[input.wallId];
  if (!wall) return '找不到这段墙';
  const start = project.points[wall.startPointId];
  const end = project.points[wall.endPointId];
  if (!start || !end) return '墙体端点缺失';
  const wallLength = lengthBetween(start, end);
  const wallHeight = wall.height ?? project.wallHeight;
  if (input.width <= 0 || input.height <= 0) return '宽和高必须大于零';
  if (input.distance < 0) return '距墙端的距离不能是负数';
  if (input.distance + input.width > wallLength) {
    return `洞口的右边缘超出了墙的另一端（墙长 ${wallLength}mm）`;
  }
  if (input.sillHeight < 0) return '离地高度不能是负数';
  if (input.sillHeight + input.height > wallHeight) {
    return `洞口顶部超过了墙面高度（墙高 ${wallHeight}mm）`;
  }
  return null;
}

export function addOpening(
  project: Project,
  input: OpeningInput,
): { project: Project; openingId: string } | { error: string } {
  const error = validateOpening(project, input);
  if (error) return { error };
  const openingId = nextId(project.openings, 'O');
  const opening: Opening = { id: openingId, ...input };
  return {
    project: {
      ...project,
      openings: { ...project.openings, [openingId]: opening },
      updatedAt: new Date().toISOString(),
    },
    openingId,
  };
}

export function updateOpening(
  project: Project,
  openingId: string,
  patch: Partial<OpeningInput>,
): { project: Project } | { error: string } {
  const opening = project.openings[openingId];
  if (!opening) return { error: '找不到这个洞口' };
  const merged: OpeningInput = { ...opening, ...patch };
  const error = validateOpening(project, merged);
  if (error) return { error };
  return {
    project: {
      ...project,
      openings: { ...project.openings, [openingId]: { ...opening, ...merged } },
      updatedAt: new Date().toISOString(),
    },
  };
}

export function removeOpening(project: Project, openingId: string): Project {
  if (!project.openings[openingId]) return project;
  const openings = { ...project.openings };
  delete openings[openingId];
  return { ...project, openings, updatedAt: new Date().toISOString() };
}
