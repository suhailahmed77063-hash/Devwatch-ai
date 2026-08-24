import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

// Chevron-separated breadcrumb trail. items: [{ label, to? }]; last item is current.
export default function Breadcrumbs({ items = [], className = '' }) {
  return (
    <nav className={`flex flex-wrap items-center gap-1.5 text-[13px] ${className}`}>
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <span key={item.label} className="flex items-center gap-1.5">
            {item.to && !last ? (
              <Link to={item.to} className="text-slate-500 hover:text-primary-600">
                {item.label}
              </Link>
            ) : (
              <span className={last ? 'font-medium text-primary-600' : 'text-slate-500'}>
                {item.label}
              </span>
            )}
            {!last && <ChevronRight size={14} className="text-slate-300" />}
          </span>
        )
      })}
    </nav>
  )
}
