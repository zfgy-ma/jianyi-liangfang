import { canRedo, canUndo } from '../core/history';
import {
  useProjectStore,
  type DockPanelKey,
  type InputMode,
} from '../store/useProjectStore';
import { DirectionPad } from './DirectionPad';
import { InspectorPanel } from './InspectorPanel';
import { NumberPad } from './NumberPad';
import { OpeningPanel } from './OpeningPanel';
import { RoomPanel } from './RoomPanel';

const MODES: { key: InputMode; label: string }[] = [
  { key: 'wall', label: '实线' },
  { key: 'helper', label: '辅助线' },
  { key: 'select', label: '选择' },
];

/** 面板入口：点一下把键盘区换成对应卡片，再点一下收回键盘 */
const PANELS: { key: Exclude<DockPanelKey, 'input'>; label: string }[] = [
  { key: 'rooms', label: '区域' },
  { key: 'wall', label: '墙体' },
  { key: 'opening', label: '洞口' },
];

/** 底部常驻操作坞：模式、撤销、面板入口、方向指盘与数字键盘都在一屏内 */
export function Dock({ variant = 'mobile' }: { variant?: 'mobile' | 'desktop' }) {
  const tab = useProjectStore((state) => state.tab);
  const mode = useProjectStore((state) => state.mode);
  const setMode = useProjectStore((state) => state.setMode);
  const history = useProjectStore((state) => state.history);
  const undoAction = useProjectStore((state) => state.undo);
  const redoAction = useProjectStore((state) => state.redo);
  const dockPanel = useProjectStore((state) => state.dockPanel);
  const setDockPanel = useProjectStore((state) => state.setDockPanel);

  // 三类可绘制视图都用这套操作坞，手机端在出图页收起
  if (variant === 'mobile' && tab === 'facade') return null;

  return (
    <div className={variant === 'desktop' ? 'dock dock-desktop' : 'dock'}>
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
          data-action="undo"
          onClick={undoAction}
        >
          撤销
        </button>
        <button
          type="button"
          className="mode-key"
          disabled={!canRedo(history)}
          data-action="redo"
          onClick={redoAction}
        >
          重做
        </button>
        {variant === 'mobile' ? (
          <>
            <span className="dock-gap" />
            {PANELS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={dockPanel === item.key ? 'mode-key mode-key-active' : 'mode-key'}
                data-panel={item.key}
                onClick={() =>
                  setDockPanel(dockPanel === item.key ? 'input' : item.key)
                }
              >
                {item.label}
              </button>
            ))}
          </>
        ) : null}
      </div>
      {variant === 'mobile' && dockPanel !== 'input' ? (
        <div className="dock-panel">
          {dockPanel === 'rooms' ? <RoomPanel /> : null}
          {dockPanel === 'wall' ? <InspectorPanel /> : null}
          {dockPanel === 'opening' ? <OpeningPanel /> : null}
        </div>
      ) : (
        <div className="dock-pads">
          <DirectionPad />
          <NumberPad />
        </div>
      )}
      {variant === 'desktop' ? (
        <p className="keyboard-hint">
          键盘：W 北 · A 西 · S 南 · D 东 · Q 上 · Z 下 · 数字直接输入 · 回车落线 ·
          退格删除 · Ctrl+Z 撤销
        </p>
      ) : null}
    </div>
  );
}
