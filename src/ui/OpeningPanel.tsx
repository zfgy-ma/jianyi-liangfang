import { useEffect, useState } from 'react';
import { elevationAxis } from '../core/elevation';
import type { Opening, OpeningKind } from '../core/types';
import { useProjectStore } from '../store/useProjectStore';

const FIELDS = ['宽度', '高度', '离地高度', '距左端'] as const;
const PRESETS: Record<OpeningKind, number[]> = {
  window: [1500, 1500, 900, 0],
  door: [900, 2100, 0, 0],
};

export function OpeningPanel() {
  const project = useProjectStore((state) => state.history.present);
  const selectedWallId = useProjectStore((state) => state.selectedWallId);
  const digits = useProjectStore((state) => state.digits);
  const openingMessage = useProjectStore((state) => state.openingMessage);
  const addOpeningAt = useProjectStore((state) => state.addOpeningAt);
  const changeOpening = useProjectStore((state) => state.changeOpening);
  const deleteOpening = useProjectStore((state) => state.deleteOpening);

  const [kind, setKind] = useState<OpeningKind>('window');
  const [values, setValues] = useState<number[]>(PRESETS.window);
  const [step, setStep] = useState(0);
  /** 正在改哪个洞口；为空表示当前是新建模式 */
  const [editingId, setEditingId] = useState<string | null>(null);

  // 换到另一面墙就退出编辑，避免把旧洞口的尺寸保存到新墙上
  useEffect(() => {
    setEditingId(null);
    setStep(0);
  }, [selectedWallId]);

  const wall = selectedWallId ? project.walls[selectedWallId] : null;
  if (!wall) {
    return (
      <section className="panel">
        <header className="panel-header">
          <span className="panel-title">门窗洞口</span>
        </header>
        <p className="hint">先在图上点选一面墙，再录入这面墙上的门窗。</p>
      </section>
    );
  }

  const axis = elevationAxis(project, wall);
  const openings = Object.values(project.openings).filter(
    (opening) => opening.wallId === wall.id,
  );
  const editingOpening =
    editingId && project.openings[editingId]?.wallId === wall.id
      ? project.openings[editingId]
      : null;
  const pending = Number(digits);
  const canFill = digits !== '' && Number.isFinite(pending) && pending >= 0;

  const applyPreset = (nextKind: OpeningKind) => {
    setKind(nextKind);
    setValues(PRESETS[nextKind]);
    setStep(0);
  };

  const fillCurrentField = () => {
    if (!canFill) return;
    setValues((current) =>
      current.map((value, index) => (index === step ? pending : value)),
    );
    setStep((current) => Math.min(current + 1, FIELDS.length - 1));
  };

  /** 把已有洞口的值装回四个字段格，点保存就是改它，不再新增 */
  const startEdit = (opening: Opening) => {
    setKind(opening.kind);
    setValues([
      opening.width,
      opening.height,
      opening.sillHeight,
      axis ? axis.toAxisX(opening.distance) : opening.distance,
    ]);
    setEditingId(opening.id);
    setStep(0);
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <span className="panel-title">门窗洞口</span>
        <span className="wall-tag">{wall.id}</span>
      </header>

      <div className="mode-switch" role="group" aria-label="洞口类型">
        <button
          type="button"
          className={kind === 'window' ? 'mode-key mode-key-active' : 'mode-key'}
          onClick={() => applyPreset('window')}
        >
          窗
        </button>
        <button
          type="button"
          className={kind === 'door' ? 'mode-key mode-key-active' : 'mode-key'}
          onClick={() => applyPreset('door')}
        >
          门
        </button>
      </div>

      <div className="field-grid">
        {FIELDS.map((field, index) => (
          <button
            key={field}
            type="button"
            className={index === step ? 'field-box field-box-active' : 'field-box'}
            onClick={() => setStep(index)}
          >
            <span className="field-name">
              {field}
              {index === 3 && axis ? `（${axis.leftEndLabel}）` : ''}
            </span>
            <span className="field-value">{values[index]}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="tool-button"
        data-fill-field
        disabled={!canFill}
        onClick={fillCurrentField}
      >
        用键盘数值填入「{FIELDS[step]}」
      </button>

      <button
        type="button"
        className="confirm-key"
        data-confirm-opening
        onClick={() => {
          const patch = {
            width: values[0],
            height: values[1],
            sillHeight: values[2],
            distance: axis ? axis.toWallDistance(values[3]) : values[3],
          };
          if (editingOpening) {
            // 有正在编辑的洞口就改它，绝不重复新增
            changeOpening(editingOpening.id, patch);
            setEditingId(null);
            setStep(0);
            return;
          }
          addOpeningAt({ wallId: wall.id, kind, ...patch });
        }}
      >
        {editingOpening ? `保存 ${editingOpening.id} 的修改` : '添加这个洞口'}
      </button>

      {editingId ? (
        <button
          type="button"
          className="tool-button"
          onClick={() => {
            setEditingId(null);
            setStep(0);
          }}
        >
          取消编辑，回到新增
        </button>
      ) : null}

      {openingMessage ? <p className="hint">{openingMessage}</p> : null}

      <div className="room-list">
        {openings.length === 0 ? <p className="hint hint-quiet">这面墙上还没有洞口</p> : null}
        {openings.map((opening) => (
          <div className="room-item" key={opening.id}>
            <div className="room-item-head">
              <span>
                {opening.id} · {opening.kind === 'window' ? '窗' : '门'}
              </span>
              <span className="room-area">
                {opening.width}×{opening.height}
              </span>
            </div>
            <p className="hint hint-quiet">
              距左端 {axis ? axis.toAxisX(opening.distance) : opening.distance}mm · 离地{' '}
              {opening.sillHeight}mm
            </p>
            <div className="mode-switch">
              <button
                type="button"
                className="mode-key"
                data-edit-opening={opening.id}
                onClick={() => startEdit(opening)}
              >
                编辑尺寸
              </button>
              <button
                type="button"
                className="tool-button tool-button-danger"
                onClick={() => deleteOpening(opening.id)}
              >
                删除（可撤销）
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
