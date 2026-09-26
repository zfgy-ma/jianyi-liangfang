import type { FacadeView } from '../core/facade';
import type { Viewport } from './viewport';

/**
 * 二维立面图：把三维建筑朝一个方向压平后的结果。
 * 直接按毫米坐标画，不经过三维相机，所以平视时不会塌成一条线。
 */
export function ElevationLayer({
  view,
  viewport,
}: {
  view: FacadeView;
  viewport: Viewport;
}) {
  const toScreen = (x: number, y: number) => ({
    x: viewport.width / 2 + (x - viewport.centerX) * viewport.scale,
    y: viewport.height / 2 - (y - viewport.centerY) * viewport.scale,
  });

  const fontWorld = Math.max(view.totalWidth, view.maxHeight, 1000) * 0.035;
  const fontPx = fontWorld * viewport.scale;
  const dimensionY = -fontWorld * 1.6;

  return (
    <g className="elevation-layer">
      {/* 建筑体量：并集轮廓 */}
      {view.walls.map((strip) => {
        const topLeft = toScreen(strip.left, strip.bottom + strip.height);
        const bottomRight = toScreen(strip.left + strip.width, strip.bottom);
        return (
          <rect
            key={`mass-${strip.wallId}-${strip.left}`}
            className="elevation-mass"
            fill="#f2f4f7"
            stroke="#1d232b"
            strokeWidth={2}
            x={topLeft.x}
            y={topLeft.y}
            width={bottomRight.x - topLeft.x}
            height={bottomRight.y - topLeft.y}
          />
        );
      })}

      {/* 每面墙自己的竖向分隔线，体现转角与分段 */}
      {view.faces.map((face) => {
        const leftBottom = toScreen(face.left, face.bottom);
        const leftTop = toScreen(face.left, face.bottom + face.height);
        const rightTop = toScreen(face.left + face.width, face.bottom + face.height);
        const rightBottom = toScreen(face.left + face.width, face.bottom);
        return (
          <g key={`face-${face.wallId}`} className="elevation-face">
            <line stroke="#1d232b" strokeWidth={1} x1={leftBottom.x} y1={leftBottom.y} x2={leftTop.x} y2={leftTop.y} />
            <line stroke="#1d232b" strokeWidth={1} x1={rightBottom.x} y1={rightBottom.y} x2={rightTop.x} y2={rightTop.y} />
            <line stroke="#1d232b" strokeWidth={1} x1={leftTop.x} y1={leftTop.y} x2={rightTop.x} y2={rightTop.y} />
          </g>
        );
      })}

      {view.verticals.map((line) => {
        const from = toScreen(line.x, line.bottom);
        const to = toScreen(line.x, line.top);
        return (
          <line
            key={`vertical-${line.wallId}`}
            className="elevation-vertical"
            stroke="#1f6feb"
            strokeWidth={1.5}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
          />
        );
      })}

      {view.openings.map((opening) => {
        const topLeft = toScreen(opening.left, opening.bottom + opening.height);
        const bottomRight = toScreen(opening.left + opening.width, opening.bottom);
        return (
          <rect
            key={opening.id}
            className={
              opening.kind === 'window' ? 'elevation-opening' : 'elevation-door'
            }
            x={topLeft.x}
            y={topLeft.y}
            width={bottomRight.x - topLeft.x}
            height={bottomRight.y - topLeft.y}
          />
        );
      })}

      {/* 地面线 */}
      <line
        className="elevation-ground"
        stroke="#1d232b"
        strokeWidth={2}
        x1={toScreen(-view.totalWidth * 0.05, 0).x}
        y1={toScreen(0, 0).y}
        x2={toScreen(view.totalWidth * 1.05, 0).x}
        y2={toScreen(0, 0).y}
      />

      {/* 墙高标注：左侧竖向尺寸线，数字旋转 90 度 */}
      {(() => {
        const dimensionX = toScreen(-fontWorld * 1.8, 0).x;
        const bottomY = toScreen(0, 0).y;
        const topY = toScreen(0, view.maxHeight).y;
        const middleY = (bottomY + topY) / 2;
        const gap = fontPx * 1.1;
        return (
          <g>
            <line
              className="elevation-dimension"
              stroke="#5b6673"
              strokeWidth={1}
              x1={dimensionX}
              y1={bottomY}
              x2={dimensionX}
              y2={middleY + gap}
            />
            <line
              className="elevation-dimension"
              stroke="#5b6673"
              strokeWidth={1}
              x1={dimensionX}
              y1={middleY - gap}
              x2={dimensionX}
              y2={topY}
            />
            <text
              className="elevation-label-text"
              fill="#1d232b"
              x={dimensionX}
              y={middleY}
              fontSize={fontPx}
              textAnchor="middle"
              transform={`rotate(-90 ${dimensionX} ${middleY})`}
            >
              {Math.round(view.maxHeight)}
            </text>
          </g>
        );
      })()}

      {/* 总宽标注：数字坐在断开的尺寸线中间 */}
      <line
        className="elevation-dimension"
        stroke="#5b6673"
        strokeWidth={1}
        x1={toScreen(0, dimensionY).x}
        y1={toScreen(0, dimensionY).y}
        x2={toScreen(view.totalWidth / 2, dimensionY).x}
        y2={toScreen(0, dimensionY).y}
      />
      <line
        className="elevation-dimension"
        stroke="#5b6673"
        strokeWidth={1}
        x1={toScreen(view.totalWidth / 2, dimensionY).x}
        y1={toScreen(0, dimensionY).y}
        x2={toScreen(view.totalWidth, dimensionY).x}
        y2={toScreen(0, dimensionY).y}
      />
      <text
        className="elevation-label-text"
        x={toScreen(view.totalWidth / 2, dimensionY).x}
        y={toScreen(0, dimensionY).y + fontPx * 0.35}
        fontSize={fontPx}
        textAnchor="middle"
      >
        {Math.round(view.totalWidth)}
      </text>
      <text
        className="elevation-title"
        x={toScreen(0, view.maxHeight).x}
        y={toScreen(0, view.maxHeight).y - fontPx * 1.2}
        fontSize={fontPx * 1.2}
        textAnchor="start"
      >
        {view.label} · 高 {Math.round(view.maxHeight)}
      </text>
    </g>
  );
}
