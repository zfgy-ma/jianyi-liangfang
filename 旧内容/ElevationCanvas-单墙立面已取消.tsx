import { elevationAxis, openingsOfWall } from '../core/elevation';
import { useProjectStore } from '../store/useProjectStore';

export function ElevationCanvas() {
  const project = useProjectStore((state) => state.history.present);
  const selectedWallId = useProjectStore((state) => state.selectedWallId);
  const draft = useProjectStore((state) => state.elevationDraft);
  const wall = selectedWallId ? project.walls[selectedWallId] : null;

  if (!wall) {
    return (
      <div className="canvas-wrap canvas-empty">
        <p className="hint">先回到平面图，点选一面墙，这里就显示它的立面。</p>
      </div>
    );
  }

  const axis = elevationAxis(project, wall);
  if (!axis) {
    return (
      <div className="canvas-wrap canvas-empty">
        <p className="hint">这段墙的端点数据不完整，无法生成立面。</p>
      </div>
    );
  }

  const openings = openingsOfWall(project, wall.id);
  const pad = Math.max(axis.length, axis.height) * 0.12;
  const floorY = axis.height;
  const labelSize = Math.max(axis.height, axis.length) * 0.03;

  return (
    <div className="canvas-wrap">
      <svg
        className="elevation-canvas"
        viewBox={`${-pad} ${-pad} ${axis.length + pad * 2} ${axis.height + pad * 2}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <rect
          className="elevation-wall"
          x={0}
          y={0}
          width={axis.length}
          height={axis.height}
        />

        {openings.map((opening) => {
          const x = axis.toAxisX(opening.distance);
          const width = opening.width;
          const y = axis.height - opening.sillHeight - opening.height;
          return (
            <g key={opening.id}>
              <rect
                className={
                  opening.kind === 'window' ? 'elevation-opening' : 'elevation-door'
                }
                x={x}
                y={y}
                width={width}
                height={opening.height}
              />
              <text
                className="elevation-label"
                x={x + width / 2}
                y={axis.height + labelSize * 1.6}
                fontSize={labelSize}
                textAnchor="middle"
              >
                {`${opening.id} ${opening.width}×${opening.height} 离地${opening.sillHeight}`}
              </text>
            </g>
          );
        })}

        <line
          className="elevation-floor"
          x1={-pad * 0.5}
          y1={floorY}
          x2={axis.length + pad * 0.5}
          y2={floorY}
        />
        {draft.segments.map((segment, index) => (
          <line
            key={`draft-${index}`}
            className="elevation-draft-line"
            x1={segment.x1}
            y1={axis.height - segment.y1}
            x2={segment.x2}
            y2={axis.height - segment.y2}
          />
        ))}
        <circle
          className="elevation-draft-point"
          cx={draft.point.x}
          cy={axis.height - draft.point.y}
          r={labelSize * 0.6}
        />
        <text
          className="elevation-label"
          x={axis.length / 2}
          y={axis.height + labelSize * 3.4}
          fontSize={labelSize}
          textAnchor="middle"
        >
          {`墙长 ${axis.length}mm · 墙高 ${axis.height}mm · 左端 ${axis.leftEndLabel}`}
        </text>
      </svg>
      <div className="canvas-tools">
        <span className="scale-label">{axis.viewFromLabel}</span>
      </div>
    </div>
  );
}
