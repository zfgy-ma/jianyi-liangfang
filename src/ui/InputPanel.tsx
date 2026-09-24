import { canRedo, canUndo } from '../core/history';
import { useProjectStore, type CornerKey } from '../store/useProjectStore';
import { DirectionPad } from './DirectionPad';
import { NumberPad } from './NumberPad';

const CORNER_HINT: Record<CornerKey, string> = {
  SE: '从东南角开局：通常先向北、再向西',
  NE: '从东北角开局：通常先向南、再向西',
  SW: '从西南角开局：通常先向北、再向东',
  NW: '从西北角开局：通常先向南、再向东',
};

export function InputPanel() {
  const history = useProjectStore((state) => state.history);
  const mode = useProjectStore((state) => state.mode);
  const setMode = useProjectStore((state) => state.setMode);
  const startCorner = useProjectStore((state) => state.startCorner);
  const pointCount = useProjectStore(
    (state) => Object.keys(state.history.present.points).length,
  );
  const activePoint = useProjectStore((state) =>
    state.activePointId ? state.history.present.points[state.activePointId] : null,
  );
  const undoAction = useProjectStore((state) => state.undo);
  const redoAction = useProjectStore((state) => state.redo);

  return (
    <section className="panel">
      <header className="panel-header">
        <span className="panel-title">录入</span>
        <div className="mode-switch" role="group" aria-label="绘制模式">
          <button
            type="button"
            className={mode === 'wall' ? 'mode-key mode-key-active' : 'mode-key'}
            onClick={() => setMode('wall')}
          >
            实线
          </button>
          <button
            type="button"
            className={mode === 'helper' ? 'mode-key mode-key-active' : 'mode-key'}
            onClick={() => setMode('helper')}
          >
            辅助线
          </button>
          <button
            type="button"
            className={mode === 'select' ? 'mode-key mode-key-active' : 'mode-key'}
            onClick={() => setMode('select')}
          >
            选择
          </button>
        </div>
      </header>

      <p className="hint">
        {activePoint
          ? `起点 ${activePoint.id}（${activePoint.x}, ${activePoint.y} mm）`
          : '点选图上任意端点作为起点'}
      </p>
      {pointCount <= 1 ? <p className="hint hint-quiet">{CORNER_HINT[startCorner]}</p> : null}

      <DirectionPad />
      <NumberPad />

      <div className="panel-footer">
        <button
          type="button"
          className="tool-button"
          disabled={!canUndo(history)}
          onClick={undoAction}
        >
          撤销
        </button>
        <button
          type="button"
          className="tool-button"
          disabled={!canRedo(history)}
          onClick={redoAction}
        >
          重做
        </button>
      </div>
    </section>
  );
}
