import { lengthBetween } from '../core/geometry';
import { useProjectStore } from '../store/useProjectStore';

export function InspectorPanel() {
  const project = useProjectStore((state) => state.history.present);
  const selectedWallId = useProjectStore((state) => state.selectedWallId);
  const digits = useProjectStore((state) => state.digits);
  const editWallLength = useProjectStore((state) => state.editWallLength);
  const flipOffset = useProjectStore((state) => state.flipOffset);
  const changeWallKind = useProjectStore((state) => state.changeWallKind);
  const changeWallThickness = useProjectStore((state) => state.changeWallThickness);
  const changeWallHeight = useProjectStore((state) => state.changeWallHeight);
  const deleteWall = useProjectStore((state) => state.deleteWall);
  const locateOnWall = useProjectStore((state) => state.locateOnWall);

  const wall = selectedWallId ? project.walls[selectedWallId] : null;
  if (!wall) {
    return (
      <section className="panel">
        <header className="panel-header">
          <span className="panel-title">墙体属性</span>
        </header>
        <p className="hint">点选一段墙，可以改长度、切换内外墙、翻转墙厚方向。</p>
      </section>
    );
  }

  const start = project.points[wall.startPointId];
  const end = project.points[wall.endPointId];
  const length = lengthBetween(start, end);
  const pending = Number(digits);
  const hasPending = digits !== '' && Number.isFinite(pending) && pending > 0;
  const sideText = wall.offsetSide === 'left' ? '左' : '右';

  return (
    <section className="panel">
      <header className="panel-header">
        <span className="panel-title">墙体属性</span>
        <span className="wall-tag">
          {wall.id}
          {wall.isHelper ? ' · 辅助线' : ''}
        </span>
      </header>

      <dl className="prop-list">
        <div className="prop-row">
          <dt>实测长度</dt>
          <dd>{length} mm</dd>
        </div>
        <div className="prop-row">
          <dt>墙厚</dt>
          <dd>{wall.thickness} mm</dd>
        </div>
        <div className="prop-row">
          <dt>墙高</dt>
          <dd>{wall.height ?? `${project.wallHeight}（随工程层高）`} mm</dd>
        </div>
        <div className="prop-row">
          <dt>墙厚偏移</dt>
          <dd>当前向{sideText}侧</dd>
        </div>
      </dl>

      <div className="prop-row prop-row-inline">
        <span className="prop-label">类型</span>
        <div className="mode-switch" role="group" aria-label="墙体类型">
          <button
            type="button"
            className={wall.kind === 'outer' ? 'mode-key mode-key-active' : 'mode-key'}
            onClick={() => changeWallKind(wall.id, 'outer')}
          >
            外墙
          </button>
          <button
            type="button"
            className={wall.kind === 'inner' ? 'mode-key mode-key-active' : 'mode-key'}
            onClick={() => changeWallKind(wall.id, 'inner')}
          >
            内墙
          </button>
        </div>
      </div>

      <button type="button" className="tool-button" onClick={() => flipOffset(wall.id)}>
        翻转墙厚方向（当前向{sideText}侧）
      </button>

      <p className="hint hint-quiet">在数字键盘上输入数值，就能执行下面三项操作。</p>

      <div className="prop-actions">
        <button
          type="button"
          className="tool-button"
          disabled={!hasPending}
          onClick={() => editWallLength(wall.id, pending)}
        >
          按新长度改（后续墙跟随平移）
        </button>
        <button
          type="button"
          className="tool-button"
          disabled={!hasPending}
          onClick={() => changeWallThickness(wall.id, pending)}
        >
          按实测值设墙厚
        </button>
        <button
          type="button"
          className="tool-button"
          disabled={!hasPending}
          onClick={() => changeWallHeight(wall.id, pending)}
        >
          用键盘数值设这面墙的墙高
        </button>
        {wall.height !== undefined ? (
          <button
            type="button"
            className="tool-button"
            onClick={() => changeWallHeight(wall.id, undefined)}
          >
            恢复随工程层高
          </button>
        ) : null}
        <button
          type="button"
          className="tool-button"
          disabled={!hasPending}
          onClick={() => locateOnWall(wall.id, pending)}
        >
          沿墙按此距离取点
        </button>
      </div>

      <button
        type="button"
        className="tool-button tool-button-danger"
        onClick={() => deleteWall(wall.id)}
      >
        删除这段墙（可撤销）
      </button>
    </section>
  );
}
