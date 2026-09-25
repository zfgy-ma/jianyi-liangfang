import { buildAxon } from '../core/axon';
import { useProjectStore } from '../store/useProjectStore';

export function AxonCanvas() {
  const project = useProjectStore((state) => state.history.present);
  const drawing = buildAxon(project);

  if (drawing.lines.length === 0) {
    return (
      <div className="canvas-wrap canvas-empty">
        <p className="hint">还没有墙体，先在平面上放线，这里就会出现体量线框。</p>
      </div>
    );
  }

  const pad = Math.max(drawing.maxX - drawing.minX, drawing.maxY - drawing.minY) * 0.08;
  const width = drawing.maxX - drawing.minX + pad * 2;
  const height = drawing.maxY - drawing.minY + pad * 2;
  const toX = (value: number) => value - drawing.minX + pad;
  const toY = (value: number) => drawing.maxY - value + pad;

  return (
    <div className="canvas-wrap">
      <svg
        className="elevation-canvas"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {drawing.lines.map((line, index) => (
          <line
            key={`${line.layer}-${index}`}
            className={line.layer === 'WALL' ? 'axon-wall' : 'axon-opening'}
            x1={toX(line.x1)}
            y1={toY(line.y1)}
            x2={toX(line.x2)}
            y2={toY(line.y2)}
          />
        ))}
      </svg>
      <div className="canvas-tools">
        <span className="scale-label">等轴测线框 · 不消隐</span>
      </div>
    </div>
  );
}
