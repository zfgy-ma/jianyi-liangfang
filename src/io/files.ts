import {
  DEFAULT_INNER_THICKNESS,
  DEFAULT_OUTER_THICKNESS,
  DEFAULT_WALL_HEIGHT,
} from '../core/project';
import type { Project } from '../core/types';
import { buildProjectDxf } from './dxfSheets';

/** 触发浏览器下载 */
export function downloadText(fileName: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function projectToJson(project: Project): string {
  return JSON.stringify(project, null, 2);
}

/** 读回工程文件；缺少必要字段时直接报错，不做静默修补 */
export function projectFromJson(text: string): Project {
  const data = JSON.parse(text) as Partial<Project>;
  if (!data.id || !data.points || !data.walls) {
    throw new Error('工程文件格式不正确，缺少必要字段');
  }
  const now = new Date().toISOString();
  return {
    id: data.id,
    name: data.name ?? '未命名工程',
    wallHeight: data.wallHeight ?? DEFAULT_WALL_HEIGHT,
    outerThickness: data.outerThickness ?? DEFAULT_OUTER_THICKNESS,
    innerThickness: data.innerThickness ?? DEFAULT_INNER_THICKNESS,
    points: data.points,
    walls: data.walls,
    openings: data.openings ?? {},
    rooms: data.rooms ?? {},
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };
}

export function exportProjectFile(project: Project): void {
  const date = new Date().toISOString().slice(0, 10);
  downloadText(`${project.name}-${date}.json`, projectToJson(project), 'application/json');
}

/** 导出 CAD 图纸：DXF，图纸空间分页 + A3 图框 */
export function exportDxf(project: Project): void {
  const { dxf } = buildProjectDxf(project);
  const date = new Date().toISOString().slice(0, 10);
  downloadText(`${project.name}-${date}.dxf`, dxf, 'application/dxf');
}
