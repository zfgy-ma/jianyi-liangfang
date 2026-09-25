import { useProjectStore, type SheetKey } from '../store/useProjectStore';
import { InspectorPanel } from './InspectorPanel';
import { OpeningPanel } from './OpeningPanel';
import { ProjectPanel } from './ProjectPanel';
import { RoomPanel } from './RoomPanel';

const TITLES: Record<Exclude<SheetKey, 'none'>, string> = {
  project: '工程设置',
  rooms: '区域与面积',
  wall: '墙体属性',
  opening: '门窗洞口',
};

/** 底部浮层：工程、区域、墙体、洞口四类设置都在这里，用完点“收起” */
export function Sheet() {
  const activeSheet = useProjectStore((state) => state.activeSheet);
  const setActiveSheet = useProjectStore((state) => state.setActiveSheet);

  if (activeSheet === 'none') return null;

  return (
    <div className="sheet" onClick={() => setActiveSheet('none')}>
      <div className="sheet-body" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-head">
          <span className="panel-title">{TITLES[activeSheet]}</span>
          <button
            type="button"
            className="tool-button"
            onClick={() => setActiveSheet('none')}
          >
            收起
          </button>
        </div>
        {activeSheet === 'project' ? <ProjectPanel /> : null}
        {activeSheet === 'rooms' ? <RoomPanel /> : null}
        {activeSheet === 'wall' ? <InspectorPanel /> : null}
        {activeSheet === 'opening' ? <OpeningPanel /> : null}
      </div>
    </div>
  );
}
