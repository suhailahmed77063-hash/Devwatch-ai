import Badge from './Badge'
import { Ico } from '../utils/icons'

// Vertical case timeline grouped by day.
// groups: [{ day, items: [{ time, title, desc, by, icon }] }]
export default function Timeline({ groups = [] }) {
  const isSystem = (by) => by === 'System'
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.day}>
          <div className="mb-4 flex justify-center">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              {group.day}
            </span>
          </div>
          <div className="relative pl-1">
            <div className="absolute bottom-2 left-[18px] top-2 w-px bg-slate-200" />
            <div className="space-y-5">
              {group.items.map((item, i) => (
                <div key={i} className="relative flex gap-4">
                  <div className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 ring-4 ring-white">
                    <Ico name={item.icon} size={16} />
                  </div>
                  <div className="flex flex-1 items-start justify-between gap-3 pt-0.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-navy-900">{item.title}</p>
                      </div>
                      <p className="mt-0.5 text-[13px] text-slate-500">{item.desc}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-xs text-slate-400">{item.time}</span>
                      <Badge tone={isSystem(item.by) ? 'sky' : 'green'} size="xs">
                        {item.by}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
