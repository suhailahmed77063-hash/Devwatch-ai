// Underline-style tab bar (used on Patient Profile, Reports & Prescription, History & Vitals).
export default function Tabs({ tabs, active, onChange, size = 'md', className = '' }) {
  const text = size === 'sm' ? 'text-[13px]' : 'text-sm'
  return (
    <div className={`flex items-center gap-1 overflow-x-auto border-b border-slate-200 scrollbar-none ${className}`}>
      {tabs.map((tab) => {
        const label = typeof tab === 'string' ? tab : tab.label
        const Icon = typeof tab === 'object' ? tab.icon : null
        const isActive = label === active
        return (
          <button
            key={label}
            onClick={() => onChange?.(label)}
            className={`relative flex items-center gap-1.5 whitespace-nowrap px-3.5 pb-3 pt-1 font-medium transition-colors ${text} ${
              isActive ? 'text-primary-700' : 'text-slate-500 hover:text-navy-700'
            }`}
          >
            {Icon && <Icon size={15} />}
            {label}
            {typeof tab === 'object' && tab.count != null && (
              <span className="ml-0.5 rounded-full bg-slate-100 px-1.5 text-2xs text-slate-500">
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute inset-x-1.5 -bottom-px h-0.5 rounded-full bg-primary-600" />
            )}
          </button>
        )
      })}
    </div>
  )
}
