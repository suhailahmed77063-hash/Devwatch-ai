import { Ico } from '../utils/icons'

const tones = {
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  sky: 'bg-sky-50 text-sky-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  teal: 'bg-primary-50 text-primary-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
}

// Small vital-sign tile: icon + label, big value + unit, optional note.
export default function VitalCard({ label, value, unit, note, icon, tone = 'teal' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tones[tone] || tones.teal}`}>
          <Ico name={icon} size={15} />
        </span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-lg font-bold leading-none text-navy-900">
        {value} {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
      </p>
      {note && <p className="mt-1 text-2xs text-slate-400">{note}</p>}
    </div>
  )
}
