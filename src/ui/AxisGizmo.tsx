import { projectPoint, type Viewport } from './viewport';

const SIZE = 104;
const RADIUS = 32;

const DIRECTIONS = [
  { key: 'N', label: '北', x: 0, y: 1, z: 0 },
  { key: 'S', label: '南', x: 0, y: -1, z: 0 },
  { key: 'E', label: '东', x: 1, y: 0, z: 0 },
  { key: 'W', label: '西', x: -1, y: 0, z: 0 },
  { key: 'U', label: '上', x: 0, y: 0, z: 1 },
  { key: 'D', label: '下', x: 0, y: 0, z: -1 },
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
      {DIRECTIONS.map((item) => {
        const projected = projectPoint(viewport, {
          x: item.x * 1000,
          y: item.y * 1000,
          z: item.z * 1000,
        });
        const length = Math.hypot(projected.x, projected.y);
        // 正好指向观察者时没有方向可画，只在圆心点一下
        if (length < 1e-6) {
          return (
            <g key={item.key}>
              <circle className="axis-dot" cx={center} cy={center} r={3} />
              <text
                className="axis-label"
                x={center}
                y={center - 8}
                textAnchor="middle"
              >
                {item.label}
              </text>
            </g>
          );
        }
        const dx = (projected.x / length) * RADIUS;
        const dy = (projected.y / length) * RADIUS;
        return (
          <g key={item.key}>
            <line
              className="axis-arm"
              x1={center}
              y1={center}
              x2={center + dx}
              y2={center + dy}
            />
            <text
              className="axis-label"
              x={center + dx * 1.3}
              y={center + dy * 1.3 + 5}
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
