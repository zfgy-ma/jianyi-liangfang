import { buildFacade, type FacadeView, type ViewDirection } from '../core/facade';
import { useProjectStore } from '../store/useProjectStore';

function FacadePreview({
  view,
  sheet,
}: {
  view: FacadeView;
  /** 四张图共用的图幅，保证同样的长度画出来一样长 */
  sheet: { width: number; height: number };
}) {
  const pad = Math.max(sheet.width, sheet.height) * 0.12;
  // 尺寸数字放大，放在尺寸线中间，线在数字处断开
  const labelSize = Math.max(sheet.width, sheet.height) * 0.04;
  const dimensionY = view.maxHeight + labelSize * 1.8;
  const empty = view.walls.length === 0;

  return (
    <figure className={empty ? 'facade-card facade-card-empty' : 'facade-card'}>
      <span className="facade-badge">{view.label.replace('立面', '')}</span>
      <svg
        viewBox={`${-pad} ${-pad} ${sheet.width + pad * 2} ${sheet.height + pad * 2}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {empty ? (
          <>
            <rect
              className="facade-empty-frame"
              x={0}
              y={0}
              width={Math.max(view.totalWidth, 1000)}
              height={Math.max(view.maxHeight, 1000)}
            />
            <text
              className="facade-empty-text"
              x={Math.max(view.totalWidth, 1000) / 2}
              y={Math.max(view.maxHeight, 1000) / 2}
              fontSize={Math.max(sheet.width, sheet.height) * 0.06}
              textAnchor="middle"
            >
              这一侧没有外墙
            </text>
          </>
        ) : null}

        {view.walls.map((wall) => (
          <g key={wall.wallId}>
            <rect
              className="elevation-wall"
              x={wall.left}
              y={view.maxHeight - (wall.bottom + wall.height)}
              width={wall.width}
              height={wall.height}
            />
            <line
              className="facade-dimension"
              x1={wall.left}
              y1={dimensionY - labelSize * 0.35}
              x2={wall.left}
              y2={dimensionY + labelSize * 0.35}
            />
            <line
              className="facade-dimension"
              x1={wall.left + wall.width}
              y1={dimensionY - labelSize * 0.35}
              x2={wall.left + wall.width}
              y2={dimensionY + labelSize * 0.35}
            />
            <line
              className="facade-dimension"
              x1={wall.left}
              y1={dimensionY}
              x2={wall.left + wall.width / 2 - labelSize * 1.3}
              y2={dimensionY}
            />
            <line
              className="facade-dimension"
              x1={wall.left + wall.width / 2 + labelSize * 1.3}
              y1={dimensionY}
              x2={wall.left + wall.width}
              y2={dimensionY}
            />
            <text
              className="facade-length"
              x={wall.left + wall.width / 2}
              y={dimensionY + labelSize * 0.38}
              fontSize={labelSize}
              textAnchor="middle"
            >
              {wall.width}
            </text>
          </g>
        ))}
        {/* 每面墙自己的竖向分隔线，体现转角与分段 */}
        {view.faces.map((face) => (
          <g key={`face-${face.wallId}`} className="facade-face-line">
            <line
              x1={face.left}
              y1={view.maxHeight - face.bottom}
              x2={face.left}
              y2={view.maxHeight - (face.bottom + face.height)}
            />
            <line
              x1={face.left + face.width}
              y1={view.maxHeight - face.bottom}
              x2={face.left + face.width}
              y2={view.maxHeight - (face.bottom + face.height)}
            />
          </g>
        ))}
        {/* 平面上用“上/下”画的竖线也要投影到立面里 */}
        {view.verticals.map((line) => (
          <line
            key={`vertical-${line.wallId}`}
            className="facade-vertical-line"
            x1={line.x}
            y1={view.maxHeight - line.bottom}
            x2={line.x}
            y2={view.maxHeight - line.top}
          />
        ))}
        {view.openings.map((opening) => (
          <rect
            key={opening.id}
            className={opening.kind === 'window' ? 'elevation-opening' : 'elevation-door'}
            x={opening.left}
            y={view.maxHeight - (opening.bottom + opening.height)}
            width={opening.width}
            height={opening.height}
          />
        ))}
        {/* 墙高标注：左侧竖向尺寸线，数字旋转 90 度坐在断口里 */}
        {!empty ? (
          <g>
            <line
              className="facade-dimension"
              x1={-labelSize * 1.2}
              y1={view.maxHeight}
              x2={-labelSize * 1.2}
              y2={view.maxHeight / 2 + labelSize}
            />
            <line
              className="facade-dimension"
              x1={-labelSize * 1.2}
              y1={view.maxHeight / 2 - labelSize}
              x2={-labelSize * 1.2}
              y2={0}
            />
            <text
              className="facade-length"
              x={-labelSize * 1.2}
              y={view.maxHeight / 2}
              fontSize={labelSize}
              textAnchor="middle"
              transform={`rotate(-90 ${-labelSize * 1.2} ${view.maxHeight / 2})`}
            >
              {Math.round(view.maxHeight)}
            </text>
          </g>
        ) : null}
      </svg>
      <figcaption>
        {empty
          ? `${view.label} · 暂无外墙`
          : `${view.label} · 总宽 ${view.totalWidth}mm · 墙高 ${view.maxHeight}mm`}
      </figcaption>
    </figure>
  );
}

export function FacadeCanvas() {
  const project = useProjectStore((state) => state.history.present);
  // 四个方向始终都出图，某一侧没有外墙也留一个空框
  const views = (['E', 'S', 'W', 'N'] as ViewDirection[])
    .map((direction) => buildFacade(project, direction));
  // 四张图共用同一图幅，同样的长度在四张图上画出来一样长
  const sheet = {
    width: Math.max(1000, ...views.map((view) => view.totalWidth)),
    height: Math.max(1000, ...views.map((view) => view.maxHeight)),
  };

  return (
    <div className="canvas-wrap facade-grid">
      {views.map((view) => (
        <FacadePreview key={view.direction} view={view} sheet={sheet} />
      ))}
    </div>
  );
}
