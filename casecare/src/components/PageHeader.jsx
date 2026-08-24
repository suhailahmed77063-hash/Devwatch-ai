// Page title block: title (+ optional trailing icon) and subtitle on the left, actions on the right.
export default function PageHeader({ title, subtitle, icon: Icon, actions, className = '' }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
          {Icon && <Icon size={18} className="text-primary-500" />}
        </div>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  )
}
