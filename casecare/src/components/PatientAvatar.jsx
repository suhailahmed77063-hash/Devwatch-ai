const palette = [
  'bg-violet-100 text-violet-700',
  'bg-primary-100 text-primary-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-emerald-100 text-emerald-700',
]

function pickColor(seed = '') {
  let sum = 0
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i)
  return palette[sum % palette.length]
}

const sizes = {
  xs: 'h-7 w-7 text-2xs',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
  '2xl': 'h-28 w-28 text-3xl',
}

export default function PatientAvatar({ name = '', src, initials, size = 'md', className = '', ring = false }) {
  const auto =
    initials ||
    name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  const ringCls = ring ? 'ring-2 ring-white shadow-sm' : ''
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover ${ringCls} ${className}`}
      />
    )
  }
  return (
    <div
      className={`${sizes[size]} ${pickColor(name || auto)} ${ringCls} flex items-center justify-center rounded-full font-semibold ${className}`}
    >
      {auto}
    </div>
  )
}
