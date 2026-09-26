import { projectPoint, type Viewport } from './viewport';

const SIZE = 116;
const RADIUS = 36;
/** 投影长度小于这个值说明这根轴正对着观察者，画出来只是个点，直接不画 */
const HIDDEN_LENGTH = 0.08;

/** 三根轴三个颜色：东红、南绿、上蓝 */
const AXES = [
  { key: 'E', label: '东', color: '#c9453a', x: 1, y: 0, z: 0 },
  { key: 'N', label: '北', color: '#3c8b4a', x: 0, y: 1, z: 0 },
  { key: 'U', label: '上', color: '#2f6fd0', x: 0, y: 0, z: 1 },
];

/**
 * 方位指示器：东西南北上下用同一套投影算出来，
 * 所以视角一转，指示器跟着转，指向永远是真实方向。
 */
export function AxisGizmo({ viewport }: { viewport: Viewport }) {
  const center = SIZE / 2;

  return (
    <svg
      className="axis-gizmo"
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-label="方位指示"
    >
      <circle className="axis-ring" cx={center} cy={center} r={RADIUS + 10} />
      {AXES.map((item) => {
        const projected = projectPoint(viewport, {
          x: item.x * 1000,
          y: item.y * 1000,
          z: item.z * 1000,
        });
        const length = Math.hypot(projected.x, projected.y);
        if (length < HIDDEN_LENGTH * 1000) return null;
        const dx = (projected.x / length) * RADIUS;
        const dy = (projected.y / length) * RADIUS;
        const tipX = center + dx;
        const tipY = center + dy;
        // 箭头：沿轴线方向的一个小三角，让轴看起来有立体感
        const angle = Math.atan2(dy, dx);
        const arrow = [
          `${tipX},${tipY}`,
          `${tipX - Math.cos(angle - 0.4) * 9},${tipY - Math.sin(angle - 0.4) * 9}`,
          `${tipX - Math.cos(angle + 0.4) * 9},${tipY - Math.sin(angle + 0.4) * 9}`,
        ].join(' ');
        return (
          <g key={item.key}>
            <line
              className="axis-arm"
              stroke={item.color}
              strokeWidth={2.5}
              x1={center}
              y1={center}
              x2={tipX}
              y2={tipY}
            />
            <polygon className="axis-arrow" points={arrow} fill={item.color} />
            <text
              className="axis-label"
              fill={item.color}
              x={center + dx * 1.3}
              y={center + dy * 1.3 + 9}
              textAnchor="middle"
            >
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
