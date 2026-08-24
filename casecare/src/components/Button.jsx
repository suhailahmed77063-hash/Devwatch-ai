import { Link } from 'react-router-dom'

const variants = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 shadow-sm border border-transparent',
  secondary:
    'bg-white text-navy-700 border border-slate-300 hover:bg-slate-50',
  ghost: 'bg-transparent text-navy-600 hover:bg-slate-100 border border-transparent',
  soft: 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-transparent',
  danger: 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50',
  dark: 'bg-navy-900 text-white hover:bg-navy-800 border border-transparent',
}

const sizes = {
  xs: 'text-xs px-2.5 py-1.5 gap-1.5 rounded-lg',
  sm: 'text-sm px-3 py-2 gap-1.5 rounded-lg',
  md: 'text-sm px-4 py-2.5 gap-2 rounded-lg',
  lg: 'text-[15px] px-5 py-3 gap-2 rounded-xl',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  to,
  className = '',
  ...props
}) {
  const cls = `inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`
  const inner = (
    <>
      {Icon && <Icon size={16} className="shrink-0" />}
      {children}
      {IconRight && <IconRight size={16} className="shrink-0" />}
    </>
  )
  if (to) {
    return (
      <Link to={to} className={cls} {...props}>
        {inner}
      </Link>
    )
  }
  return (
    <button className={cls} {...props}>
      {inner}
    </button>
  )
}
