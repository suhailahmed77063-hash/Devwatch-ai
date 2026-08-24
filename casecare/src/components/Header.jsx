import { useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, HelpCircle, ChevronDown, User, Settings, LogOut } from 'lucide-react'
import PatientAvatar from './PatientAvatar'
import Dropdown, { DropdownItem } from './Dropdown'
import { currentDoctor } from '../data/navigation'
import { useAuth, roleLabel } from '../lib/auth'

export default function Header({ onMenuClick, searchPlaceholder = 'Search patients by name, ID or phone...' }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const name = user?.name || currentDoctor.name
  const subtitle = user?.specialty || roleLabel(user?.role) || currentDoctor.role
  const avatar = user?.avatar || currentDoctor.avatar

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>
      <button
        onClick={onMenuClick}
        className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:block"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="relative mx-auto hidden w-full max-w-xl md:block">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-sm text-navy-800 placeholder:text-slate-400 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-500/15"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <Bell size={19} />
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            5
          </span>
        </button>
        <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <HelpCircle size={19} />
        </button>

        <Dropdown
          align="right"
          width="w-52"
          trigger={
            <button className="ml-1 flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-slate-100">
              <PatientAvatar name={name} src={avatar} size="sm" ring />
              <div className="hidden text-left leading-tight sm:block">
                <p className="text-[13px] font-semibold text-navy-800">{name}</p>
                <p className="text-2xs text-slate-500">{subtitle}</p>
              </div>
              <ChevronDown size={15} className="text-slate-400" />
            </button>
          }
        >
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-sm font-semibold text-navy-800">{name}</p>
            <p className="text-2xs text-slate-500">{subtitle}</p>
          </div>
          <div className="pt-1">
            <DropdownItem icon={User}>My Profile</DropdownItem>
            <DropdownItem icon={Settings}>Settings</DropdownItem>
            <DropdownItem icon={LogOut} danger onClick={handleLogout}>
              Logout
            </DropdownItem>
          </div>
        </Dropdown>
      </div>
    </header>
  )
}
