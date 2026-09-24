import { formatArea, roomArea } from '../core/room';
import { exportAreaCsv } from '../io/csv';
import { useProjectStore } from '../store/useProjectStore';

export function RoomPanel() {
  const project = useProjectStore((state) => state.history.present);
  const roomDraft = useProjectStore((state) => state.roomDraft);
  const roomMessage = useProjectStore((state) => state.roomMessage);
  const roomPicking = useProjectStore((state) => state.roomPicking);
  const setRoomPicking = useProjectStore((state) => state.setRoomPicking);
  const clearRoomDraft = useProjectStore((state) => state.clearRoomDraft);
  const finishRoom = useProjectStore((state) => state.finishRoom);
  const updateRoom = useProjectStore((state) => state.updateRoom);
  const deleteRoom = useProjectStore((state) => state.deleteRoom);

  const rooms = Object.values(project.rooms);

  return (
    <section className="panel">
      <header className="panel-header">
        <span className="panel-title">区域与面积</span>
        <span className="wall-tag">已选 {roomDraft.length} 段</span>
      </header>

      <p className="hint">
        {roomPicking
          ? '依次点选围住这个房间的墙，首尾能接上就行，顺序不限。'
          : '点“开始圈定”后，在图上依次点选围成房间的墙。'}
      </p>

      <div className="prop-actions">
        <button
          type="button"
          className={roomPicking ? 'tool-button tool-button-active' : 'tool-button'}
          onClick={() => setRoomPicking(!roomPicking)}
        >
          {roomPicking ? '退出圈定' : '开始圈定'}
        </button>
        <button
          type="button"
          className="tool-button"
          disabled={roomDraft.length < 3}
          onClick={finishRoom}
        >
          完成圈定并算面积
        </button>
        <button
          type="button"
          className="tool-button"
          disabled={roomDraft.length === 0}
          onClick={clearRoomDraft}
        >
          清空重选
        </button>
      </div>

      {roomMessage ? <p className="hint">{roomMessage}</p> : null}

      <div className="room-list">
        {rooms.length === 0 ? <p className="hint hint-quiet">还没有圈定区域</p> : null}
        {rooms.map((room) => {
          const area = roomArea(project, room);
          return (
            <div className="room-item" key={room.id}>
              <div className="room-item-head">
                <input
                  className="room-name"
                  value={room.name}
                  aria-label="房间名"
                  onChange={(event) => updateRoom(room.id, { name: event.target.value })}
                />
                <span className="room-area">
                  {area === null ? '未闭合' : `${formatArea(area)} ㎡`}
                </span>
              </div>
              <input
                className="room-note"
                value={room.note}
                placeholder="备注，例如：带飘窗、需贴砖到顶"
                aria-label="备注"
                onChange={(event) => updateRoom(room.id, { note: event.target.value })}
              />
              <button
                type="button"
                className="tool-button tool-button-danger"
                onClick={() => deleteRoom(room.id)}
              >
                删除这个区域（可撤销）
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="tool-button"
        disabled={rooms.length === 0}
        onClick={() => exportAreaCsv(project)}
      >
        导出面积清单（CSV）
      </button>
    </section>
  );
}
