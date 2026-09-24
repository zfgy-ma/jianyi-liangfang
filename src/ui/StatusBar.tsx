import { describeClosureGap, findWallConflicts } from '../core/validate';
import { useProjectStore } from '../store/useProjectStore';

export function StatusBar() {
  const project = useProjectStore((state) => state.history.present);
  const activePointId = useProjectStore((state) => state.activePointId);
  const toolMessage = useProjectStore((state) => state.toolMessage);

  const origin =
    Object.values(project.points).find((point) => point.origin.kind === 'origin') ?? null;
  const activePoint = activePointId ? project.points[activePointId] : null;
  const conflicts = findWallConflicts(project);
  const walls = Object.values(project.walls);
  const helperCount = walls.filter((wall) => wall.isHelper).length;

  let closureText = '尚未开始放线';
  if (origin && activePoint) {
    closureText =
      origin.id === activePoint.id
        ? '已回到起点，闭合无误'
        : describeClosureGap(origin, activePoint);
  }

  return (
    <footer className="status-bar">
      <span className="status-item">闭合检查：{closureText}</span>
      {toolMessage ? <span className="status-item status-note">{toolMessage}</span> : null}
      {conflicts.length > 0 ? (
        <span className="status-item status-warn">
          有 {conflicts.length} 段墙已不正交，需要修正
        </span>
      ) : null}
      <span className="status-item status-quiet">
        墙 {walls.length - helperCount} 段 · 辅助线 {helperCount} 段 · 端点{' '}
        {Object.keys(project.points).length} 个
      </span>
    </footer>
  );
}
