import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Logo from './Logo'
import PatientAvatar from './PatientAvatar'
import { navItems, currentDoctor } from '../data/navigation'
import { useAuth, roleLabel } from '../lib/auth'

function NavRow({ item }) {
  const location = useLocation()
  const hasChildren = !!item.children
  const childActive = hasChildren && item.children.some((c) => location.pathname === c.to)
  const [open, setOpen] = useState(childActive || location.pathname.startsWith('/cases'))

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            childActive ? 'text-primary-700' : 'text-navy-600 hover:bg-slate-100'
          }`}
        >
          <item.icon size={19} className={childActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'} />
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
        </button>
        {open && (
          <div className="mt-1 space-y-1 pl-11">
            {item.children.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-100 hover:text-navy-700'
                  }`
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-primary-50 text-primary-700' : 'text-navy-600 hover:bg-slate-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon size={19} className={isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'} />
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-2xs font-semibold text-white">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ open = false, onClose }) {
  const { user } = useAuth()
  const name = user?.name || currentDoctor.name
  const subtitle = user?.specialty || roleLabel(user?.role) || currentDoctor.role
  const avatar = user?.avatar || currentDoctor.avatar
  return (
    <>
      {/* Mobile backdrop */}
      {open && <div className="fixed inset-0 z-40 bg-navy-900/40 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:z-30 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center border-b border-slate-100 px-5">
          <Logo />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavRow key={item.label} item={item} />
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <button className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-left transition-colors hover:bg-slate-100">
            <PatientAvatar name={name} src={avatar} size="sm" ring />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-navy-800">{name}</p>
              <p className="truncate text-2xs text-slate-500">{subtitle}</p>
            </div>
            <ChevronDown size={15} className="text-slate-400" />
          </button>
        </div>
      </aside>
    </>
  )
}
