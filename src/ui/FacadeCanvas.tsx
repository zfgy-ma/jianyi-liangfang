import {
  buildFacade,
  visibleFacadeFaces,
  type FacadeView,
  type ViewDirection,
} from '../core/facade';
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
  const empty = view.faces.length === 0;

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

        {/* 每面外墙从远到近绘制：近处实心墙面遮住后面的线，转角棱线保留 */}
        {view.faces.map((face) => (
          <g key={face.wallId}>
            <rect
              className="elevation-wall"
              x={face.left}
              y={view.maxHeight - (face.bottom + face.height)}
              width={face.width}
              height={face.height}
            />
            {view.openings
              .filter((opening) => opening.wallId === face.wallId)
              .map((opening) => (
                <g key={opening.id}>
                  <rect
                    className={
                      opening.kind === 'window' ? 'elevation-opening' : 'elevation-door'
                    }
                    x={opening.left}
                    y={view.maxHeight - (opening.bottom + opening.height)}
                    width={opening.width}
                    height={opening.height}
                  />
                  {/* 洞口尺寸直接标在洞口里，方便和手绘图逐项核对 */}
                  <text
                    className="facade-opening-label"
                    x={opening.left + opening.width / 2}
                    y={view.maxHeight - opening.bottom - opening.height / 2}
                    fontSize={labelSize * 0.45}
                    textAnchor="middle"
                  >
                    {opening.width}×{opening.height}
                  </text>
                  <text
                    className="facade-opening-label"
                    x={opening.left + opening.width / 2}
                    y={view.maxHeight - opening.bottom + labelSize * 0.55}
                    fontSize={labelSize * 0.38}
                    textAnchor="middle"
                  >
                    离地 {opening.bottom}
                  </text>
                </g>
              ))}
          </g>
        ))}
        {/* 尺寸只标真正看得见的那段墙，A 面会标 7200 而不是并集后的总宽 */}
        {visibleFacadeFaces(view.faces).map((face) => (
          <g key={`dimension-${face.wallId}`}>
            <line
              className="facade-dimension"
              x1={face.left}
              y1={dimensionY - labelSize * 0.35}
              x2={face.left}
              y2={dimensionY + labelSize * 0.35}
            />
            <line
              className="facade-dimension"
              x1={face.left + face.width}
              y1={dimensionY - labelSize * 0.35}
              x2={face.left + face.width}
              y2={dimensionY + labelSize * 0.35}
            />
            <line
              className="facade-dimension"
              x1={face.left}
              y1={dimensionY}
              x2={face.left + face.width / 2 - labelSize * 1.3}
              y2={dimensionY}
            />
            <line
              className="facade-dimension"
              x1={face.left + face.width / 2 + labelSize * 1.3}
              y1={dimensionY}
              x2={face.left + face.width}
              y2={dimensionY}
            />
            <text
              className="facade-length"
              x={face.left + face.width / 2}
              y={dimensionY + labelSize * 0.38}
              fontSize={labelSize}
              textAnchor="middle"
            >
              {face.width}
            </text>
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
