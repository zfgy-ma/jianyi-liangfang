import { useProjectStore, type TabKey } from '../store/useProjectStore';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'plan', label: '平面图' },
  { key: 'elevation', label: '单墙立面' },
  { key: 'facade', label: '四向立面' },
  { key: 'axon', label: '等轴测' },
];

export function TabBar() {
  const tab = useProjectStore((state) => state.tab);
  const setTab = useProjectStore((state) => state.setTab);

  return (
    <nav className="tab-bar" aria-label="视图切换">
      {TABS.map((item) => (
        <button
          key={item.key}
          type="button"
          className={tab === item.key ? 'tab-key tab-key-active' : 'tab-key'}
          onClick={() => setTab(item.key)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
