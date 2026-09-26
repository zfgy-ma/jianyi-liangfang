import { useEffect, useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';

export function ProjectPanel() {
  const project = useProjectStore((state) => state.history.present);
  const updateProjectMeta = useProjectStore((state) => state.updateProjectMeta);
  const [wallHeight, setWallHeight] = useState(String(project.wallHeight));
  const [outerThickness, setOuterThickness] = useState(
    String(project.outerThickness),
  );

  useEffect(() => {
    setWallHeight(String(project.wallHeight));
  }, [project.wallHeight]);

  useEffect(() => {
    setOuterThickness(String(project.outerThickness));
  }, [project.outerThickness]);

  const commitWallHeight = () => {
    const value = Number(wallHeight);
    if (Number.isFinite(value) && value > 0) {
      updateProjectMeta({ wallHeight: Math.round(value) });
    }
  };

  const commitOuterThickness = () => {
    const value = Number(outerThickness);
    if (Number.isFinite(value) && value > 0) {
      updateProjectMeta({ outerThickness: Math.round(value) });
    }
  };

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

      <label className="prop-row prop-row-inline">
        <span className="prop-label">统一层高</span>
        <input
          className="prop-input"
          type="number"
          inputMode="numeric"
          value={wallHeight}
          onChange={(event) => setWallHeight(event.target.value)}
          onBlur={commitWallHeight}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitWallHeight();
          }}
        />
      </label>

      <label className="prop-row prop-row-inline">
        <span className="prop-label">外墙厚度</span>
        <input
          className="prop-input"
          type="number"
          inputMode="numeric"
          value={outerThickness}
          onChange={(event) => setOuterThickness(event.target.value)}
          onBlur={commitOuterThickness}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitOuterThickness();
          }}
        />
      </label>

      <p className="hint hint-quiet">
        层高决定立面高度；外墙厚度影响新画的外墙，单面墙可在墙体属性里单独改。
      </p>
    </section>
  );
}
