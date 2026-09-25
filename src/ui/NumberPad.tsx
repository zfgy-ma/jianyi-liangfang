import { MOVE_LABEL } from '../core/direction';
import { useProjectStore } from '../store/useProjectStore';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** 自绘数字键盘，全程不使用系统键盘 */
export function NumberPad() {
  const digits = useProjectStore((state) => state.digits);
  const direction = useProjectStore((state) => state.direction);
  const activePointId = useProjectStore((state) => state.activePointId);
  const pressDigit = useProjectStore((state) => state.pressDigit);
  const pressBackspace = useProjectStore((state) => state.pressBackspace);
  const cancelInput = useProjectStore((state) => state.cancelInput);
  const confirmDraw = useProjectStore((state) => state.confirmDraw);

  const length = Number(digits);
  const ready = Boolean(direction) && Boolean(activePointId) && length > 0;

  return (
    <div className="number-pad">
      <div className="number-display">
        <span className="number-value">{digits === '' ? '0' : digits}</span>
        <span className="number-unit">mm</span>
      </div>
      <div className="number-keys">
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            className="num-key"
            onClick={() => pressDigit(digit)}
          >
            {digit}
          </button>
        ))}
        <button type="button" className="num-key num-key-clear" onClick={cancelInput}>
          清除
        </button>
        <button type="button" className="num-key" onClick={() => pressDigit('0')}>
          0
        </button>
        <button type="button" className="num-key" onClick={pressBackspace}>
          退格
        </button>
      </div>
      <button
        type="button"
        className="confirm-key"
        disabled={!ready}
        onClick={confirmDraw}
      >
        {direction ? `向${MOVE_LABEL[direction]}落线` : '请先选方向'}
      </button>
    </div>
  );
}
