import type { MoveDirection } from '../core/types';
import { useProjectStore } from '../store/useProjectStore';
import { enabledDirections } from './viewport';

const DIRECTION_TEXT: Record<MoveDirection, string> = {
  N: '北',
  E: '东',
  S: '南',
  W: '西',
  U: '上',
  D: '下',
};

/** 平面四向走十字，竖直的上、下放在十字下方，只占高度 */
const CROSS_KEYS: MoveDirection[] = ['N', 'W', 'E', 'S'];
const VERTICAL_KEYS: MoveDirection[] = ['U', 'D'];

/** 自绘方向指盘：北在上、东在右，与坐标系一致 */
export function DirectionPad() {
  const direction = useProjectStore((state) => state.direction);
  const pressDirection = useProjectStore((state) => state.pressDirection);
  const mode = useProjectStore((state) => state.mode);
  const camera = useProjectStore((state) => state.camera);
  const disabled = mode === 'select';
  // 当前视角平面外的方向置灰，避免画出这个视角里根本不存在的方向
  const allowed = enabledDirections(camera);

  const renderKey = (key: MoveDirection) => (
    <button
      key={key}
      type="button"
      disabled={disabled || !allowed.includes(key)}
      aria-pressed={direction === key}
      data-direction={key}
      className={direction === key ? 'dir-key dir-key-active' : 'dir-key'}
      onClick={() => pressDirection(key)}
    >
      {DIRECTION_TEXT[key]}
    </button>
  );

  return (
    <div className="direction-pad" role="group" aria-label="方向指盘">
      <div className="direction-cross">
        {CROSS_KEYS.map(renderKey)}
        <span className="direction-center" aria-hidden="true" />
      </div>
      <div className="direction-vertical">{VERTICAL_KEYS.map(renderKey)}</div>
    </div>
  );
}
