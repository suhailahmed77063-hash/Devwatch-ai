const tones = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  gray: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/10',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/10',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/10',
  purple: 'bg-violet-50 text-violet-700 ring-violet-600/10',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/10',
  teal: 'bg-primary-50 text-primary-700 ring-primary-600/10',
}

// Map common status strings to a tone
const statusToTone = {
  Active: 'green',
  Completed: 'green',
  Normal: 'green',
  Negative: 'sky',
  Present: 'gray',
  Inactive: 'gray',
  Absent: 'gray',
  'In Progress': 'blue',
  Scheduled: 'sky',
  Pending: 'amber',
  Moderate: 'amber',
  Abnormal: 'amber',
  Reduced: 'amber',
  Urgent: 'amber',
  Emergency: 'red',
  High: 'red',
}

export default function Badge({ children, tone, dot = false, className = '', size = 'sm' }) {
  const resolved = tone || statusToTone[children] || 'gray'
  const pad = size === 'xs' ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-1 text-xs'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${tones[resolved]} ${pad} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}
