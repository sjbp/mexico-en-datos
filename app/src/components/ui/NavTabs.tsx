'use client';

interface Tab {
  id: string;
  label: string;
}

interface NavTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export default function NavTabs({ tabs, activeTab, onTabChange }: NavTabsProps) {
  return (
    <div className="flex gap-[3px] px-[var(--pad-page)] mb-8 flex-wrap">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-[18px] py-2 text-[13px] font-medium border rounded-md whitespace-nowrap transition-all duration-150 ${
              isActive
                ? 'bg-[var(--accent)] text-black border-[var(--accent)] font-semibold'
                : 'bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:bg-white/[0.04] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
