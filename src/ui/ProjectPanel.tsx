import { useProjectStore } from '../store/useProjectStore';

export function ProjectPanel() {
  const project = useProjectStore((state) => state.history.present);
  const digits = useProjectStore((state) => state.digits);
  const updateProjectMeta = useProjectStore((state) => state.updateProjectMeta);
  const applyOuterThicknessToAll = useProjectStore(
    (state) => state.applyOuterThicknessToAll,
  );

  const pending = Number(digits);
  const hasPending = digits !== '' && Number.isFinite(pending) && pending > 0;

  return (
    <section className="panel">
      <header className="panel-header">
        <span className="panel-title">工程设置</span>
      </header>

      <label className="prop-row prop-row-inline">
        <span className="prop-label">工程名</span>
        <input
          className="room-name"
          value={project.name}
          onChange={(event) => updateProjectMeta({ name: event.target.value })}
        />
      </label>

      <dl className="prop-list">
        <div className="prop-row">
          <dt>统一层高</dt>
          <dd>{project.wallHeight} mm</dd>
        </div>
        <div className="prop-row">
          <dt>外墙厚度</dt>
          <dd>{project.outerThickness} mm</dd>
        </div>
      </dl>

      <div className="prop-actions">
        <button
          type="button"
          className="tool-button"
          disabled={!hasPending}
          onClick={() => updateProjectMeta({ wallHeight: pending })}
        >
          用键盘数值设为层高
        </button>
        <button
          type="button"
          className="tool-button"
          disabled={!hasPending}
          onClick={() => updateProjectMeta({ outerThickness: pending })}
        >
          用键盘数值设为外墙厚
        </button>
        <button
          type="button"
          className="tool-button"
          onClick={applyOuterThicknessToAll}
        >
          把外墙厚应用到所有外墙
        </button>
      </div>

      <p className="hint hint-quiet">
        层高决定立面高度；单面墙可以在墙体属性里单独覆盖。
      </p>
    </section>
  );
}
