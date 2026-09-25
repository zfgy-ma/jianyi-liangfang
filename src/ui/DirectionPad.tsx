import type { MoveDirection } from '../core/types';
import { useProjectStore } from '../store/useProjectStore';

const DIRECTION_TEXT: Record<MoveDirection, string> = {
  N: '北',
  E: '东',
  S: '南',
  W: '西',
  U: '上',
  D: '下',
};

/** 平面四向走十字，竖直的上、下单独占一列 */
const KEY_ORDER: MoveDirection[] = ['N', 'W', 'E', 'S', 'U', 'D'];

/** 自绘方向指盘：北在上、东在右，与坐标系一致 */
export function DirectionPad() {
  const direction = useProjectStore((state) => state.direction);
  const pressDirection = useProjectStore((state) => state.pressDirection);
  const mode = useProjectStore((state) => state.mode);
  const disabled = mode === 'select';

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
          {DIRECTION_TEXT[key]}
        </button>
      ))}
      <span className="direction-center" aria-hidden="true" />
    </div>
  );
}
