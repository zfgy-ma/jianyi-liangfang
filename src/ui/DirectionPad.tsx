import type { Direction } from '../core/types';
import { useProjectStore } from '../store/useProjectStore';

const DIRECTION_TEXT: Record<Direction, string> = {
  N: '北',
  E: '东',
  S: '南',
  W: '西',
};

/** 立面上方向含义不同：向上、向右、向下、向左 */
const ELEVATION_TEXT: Record<Direction, string> = {
  N: '上',
  E: '右',
  S: '下',
  W: '左',
};

const KEY_ORDER: Direction[] = ['N', 'W', 'E', 'S'];

/** 自绘方向指盘：北在上、东在右，与坐标系一致 */
export function DirectionPad() {
  const direction = useProjectStore((state) => state.direction);
  const pressDirection = useProjectStore((state) => state.pressDirection);
  const mode = useProjectStore((state) => state.mode);
  const tab = useProjectStore((state) => state.tab);
  const disabled = mode === 'select';
  const labels = tab === 'elevation' ? ELEVATION_TEXT : DIRECTION_TEXT;

  return (
    <div className="direction-pad" role="group" aria-label="方向指盘">
      {KEY_ORDER.map((key) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          aria-pressed={direction === key}
          data-direction={key}
          className={direction === key ? 'dir-key dir-key-active' : 'dir-key'}
          onClick={() => pressDirection(key)}
        >
          {labels[key]}
        </button>
      ))}
      <span className="direction-center" aria-hidden="true" />
    </div>
  );
}
