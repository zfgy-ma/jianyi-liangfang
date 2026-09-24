import { formatArea, roomArea, wallNetArea } from '../core/room';
import type { Project } from '../core/types';
import { downloadText } from './files';

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** 面积清单：房间名、净面积、墙面净面积合计、备注 */
export function buildAreaCsv(project: Project): string {
  const header = ['房间名', '净面积(㎡)', '墙面净面积合计(㎡)', '备注'];
  const rows = Object.values(project.rooms).map((room) => {
    const area = roomArea(project, room);
    const boundary = new Set(room.boundaryWallIds);
    const net = Object.values(project.walls)
      .filter((wall) => boundary.has(wall.id))
      .reduce((sum, wall) => sum + wallNetArea(project, wall), 0);
    return [
      room.name,
      area === null ? '未闭合' : formatArea(area),
      formatArea(net),
      room.note,
    ];
  });
  return [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
}

/** 导出 CSV，带 BOM 以便 Excel 正确识别中文 */
export function exportAreaCsv(project: Project): void {
  downloadText(
    `${project.name}-面积清单.csv`,
    `\ufeff${buildAreaCsv(project)}`,
    'text/csv;charset=utf-8',
  );
}
