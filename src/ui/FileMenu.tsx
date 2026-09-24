import { useEffect, useState } from 'react';
import type { Project } from '../core/types';
import { exportProjectFile, projectFromJson } from '../io/files';
import { listProjects, loadProject } from '../io/storage';
import { useProjectStore, type CornerKey } from '../store/useProjectStore';

const CORNERS: { key: CornerKey; label: string }[] = [
  { key: 'SE', label: '东南角' },
  { key: 'NE', label: '东北角' },
  { key: 'SW', label: '西南角' },
  { key: 'NW', label: '西北角' },
];

export function FileMenu() {
  const project = useProjectStore((state) => state.history.present);
  const newProject = useProjectStore((state) => state.newProject);
  const replaceProject = useProjectStore((state) => state.replaceProject);
  const [open, setOpen] = useState(false);
  const [corner, setCorner] = useState<CornerKey>('SE');
  const [projects, setProjects] = useState<Project[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    void listProjects().then(setProjects);
  }, [open, project.updatedAt]);

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      replaceProject(projectFromJson(text));
      setMessage('工程已导入');
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '工程文件读取失败');
    }
  };

  const handleOpen = async (id: string) => {
    const loaded = await loadProject(id);
    if (!loaded) {
      setMessage('这条工程记录已经不存在');
      return;
    }
    replaceProject(loaded);
    setOpen(false);
  };

  return (
    <div className="file-menu">
      <button type="button" className="tool-button" onClick={() => setOpen(!open)}>
        工程
      </button>
      {open ? (
        <div className="file-popover">
          <div className="file-section">
            <span className="prop-label">新建工程</span>
            <div className="corner-keys">
              {CORNERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={corner === item.key ? 'mode-key mode-key-active' : 'mode-key'}
                  onClick={() => setCorner(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="tool-button"
              onClick={() => {
                newProject(`量房 ${new Date().toLocaleDateString('zh-CN')}`, corner);
                setOpen(false);
              }}
            >
              创建并开始放线
            </button>
          </div>

          <div className="file-section">
            <span className="prop-label">已保存的工程</span>
            {projects.length === 0 ? <p className="hint hint-quiet">还没有保存过工程</p> : null}
            <div className="project-list">
              {projects.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="project-item"
                  onClick={() => void handleOpen(item.id)}
                >
                  <span>{item.name}</span>
                  <span className="project-time">
                    {item.updatedAt.slice(0, 16).replace('T', ' ')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="file-section">
            <button
              type="button"
              className="tool-button"
              onClick={() => exportProjectFile(project)}
            >
              导出工程文件（.json）
            </button>
            <label className="tool-button file-input-label">
              导入工程文件
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) => void handleImport(event.target.files?.[0])}
              />
            </label>
          </div>

          {message ? <p className="hint">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
