const accents = {
  emerald: 'bg-emerald-50 text-emerald-600',
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  rose: 'bg-rose-50 text-rose-600',
  teal: 'bg-primary-50 text-primary-600',
}

const footTones = {
  amber: 'text-amber-600',
  violet: 'text-violet-600',
  rose: 'text-rose-500',
  blue: 'text-blue-600',
}

// Dashboard statistic card.
export default function StatCard({ label, value, icon: Icon, trend, trendNote, foot, footTone, accent = 'teal' }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-navy-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accents[accent]}`}>
          {Icon && <Icon size={20} />}
        </div>
      </div>
      <div className="mt-3 text-xs">
        {trend ? (
          <span className="font-medium text-emerald-600">
            {trend} <span className="font-normal text-slate-400">{trendNote}</span>
          </span>
        ) : (
          <span className={`font-medium ${footTones[footTone] || 'text-slate-400'}`}>{foot}</span>
        )}
      </div>
    </div>
  )
}
