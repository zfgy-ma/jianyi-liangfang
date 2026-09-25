import { buildFacade, type FacadeView, type ViewDirection } from '../core/facade';
import { useProjectStore } from '../store/useProjectStore';

function FacadePreview({ view }: { view: FacadeView }) {
  const pad = Math.max(view.totalWidth, view.maxHeight) * 0.1;
  const labelSize = Math.max(view.totalWidth, view.maxHeight) * 0.035;
  return (
    <figure className="facade-card">
      <span className="facade-badge">{view.label.replace('立面', '')}</span>
      <svg
        viewBox={`${-pad} ${-pad} ${view.totalWidth + pad * 2} ${view.maxHeight + pad * 2}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {view.walls.map((wall) => (
          <g key={wall.wallId}>
            <rect
              className="elevation-wall"
              x={wall.left}
              y={view.maxHeight - wall.height}
              width={wall.width}
              height={wall.height}
            />
            <text
              className="facade-length"
              x={wall.left + wall.width / 2}
              y={view.maxHeight + labelSize * 1.7}
              fontSize={labelSize}
              textAnchor="middle"
            >
              {wall.width}
            </text>
          </g>
        ))}
        {view.openings.map((opening) => (
          <rect
            key={opening.id}
            className={opening.kind === 'window' ? 'elevation-opening' : 'elevation-door'}
            x={opening.left}
            y={view.maxHeight - opening.bottom - opening.height}
            width={opening.width}
            height={opening.height}
          />
        ))}
      </svg>
      <figcaption>
        {view.label} · 总宽 {view.totalWidth}mm · 墙高 {view.maxHeight}mm
      </figcaption>
    </figure>
  );
}

export function FacadeCanvas() {
  const project = useProjectStore((state) => state.history.present);
  const views = (['E', 'S', 'W', 'N'] as ViewDirection[])
    .map((direction) => buildFacade(project, direction))
    .filter((view) => view.walls.length > 0);

  if (views.length === 0) {
    return (
      <div className="canvas-wrap canvas-empty">
        <p className="hint">
          还没有朝外的墙体。先回到平面图标出外墙，并把墙厚方向设为室外侧。
        </p>
      </div>
    );
  }

  return (
    <div className="canvas-wrap facade-grid">
      {views.map((view) => (
        <FacadePreview key={view.direction} view={view} />
      ))}
    </div>
  );
}
