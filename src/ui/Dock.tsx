import { canRedo, canUndo } from '../core/history';
import { useProjectStore, type InputMode, type SheetKey } from '../store/useProjectStore';
import { DirectionPad } from './DirectionPad';
import { NumberPad } from './NumberPad';

const MODES: { key: InputMode; label: string }[] = [
  { key: 'wall', label: '实线' },
  { key: 'helper', label: '辅助线' },
  { key: 'select', label: '选择' },
];

const SHEETS: { key: SheetKey; label: string }[] = [
  { key: 'project', label: '工程' },
  { key: 'rooms', label: '区域' },
  { key: 'wall', label: '墙体' },
  { key: 'opening', label: '洞口' },
];

/** 底部常驻操作坞：模式、撤销、面板入口、方向指盘与数字键盘都在一屏内 */
export function Dock() {
  const tab = useProjectStore((state) => state.tab);
  const mode = useProjectStore((state) => state.mode);
  const setMode = useProjectStore((state) => state.setMode);
  const history = useProjectStore((state) => state.history);
  const undoAction = useProjectStore((state) => state.undo);
  const redoAction = useProjectStore((state) => state.redo);
  const setActiveSheet = useProjectStore((state) => state.setActiveSheet);

  if (tab !== 'plan') return null;

  return (
    <div className="dock">
      <div className="dock-row">
        {MODES.map((item) => (
          <button
            key={item.key}
            type="button"
            className={mode === item.key ? 'mode-key mode-key-active' : 'mode-key'}
            onClick={() => setMode(item.key)}
          >
            {item.label}
          </button>
        ))}
        <span className="dock-gap" />
        <button
          type="button"
          className="mode-key"
          disabled={!canUndo(history)}
          onClick={undoAction}
        >
          撤销
        </button>
        <button
          type="button"
          className="mode-key"
          disabled={!canRedo(history)}
          onClick={redoAction}
        >
          重做
        </button>
        <span className="dock-gap" />
        {SHEETS.map((item) => (
          <button
            key={item.key}
            type="button"
            className="mode-key"
            onClick={() => setActiveSheet(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="dock-pads">
        <DirectionPad />
        <NumberPad />
      </div>
    </div>
  );
}
