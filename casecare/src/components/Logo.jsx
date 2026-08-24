// CaseCare logo: gradient heart+cross mark with wordmark and subtitle.
export default function Logo({ subtitle = 'Smart Case-Taking System', showText = true, size = 'md' }) {
  const mark = size === 'lg' ? 44 : 34
  return (
    <div className="flex items-center gap-2.5">
      <svg width={mark} height={mark} viewBox="0 0 40 40" fill="none" className="shrink-0">
        <defs>
          <linearGradient id="ccHeart" x1="4" y1="6" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2dd4bf" />
            <stop offset="1" stopColor="#0d9488" />
          </linearGradient>
        </defs>
        <path
          d="M20 35S4 25.5 4 14.5A8 8 0 0 1 20 10a8 8 0 0 1 16 4.5C36 25.5 20 35 20 35z"
          fill="url(#ccHeart)"
        />
        <path d="M17.5 11h5v4.5H27v5h-4.5V25h-5v-4.5H13v-5h4.5z" fill="#fff" />
        <path
          d="M6 22h4l2-4 3 7 2.5-5 1.5 2h3"
          stroke="#fff"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>
      {showText && (
        <div className="leading-tight">
          <div className={`font-bold tracking-tight ${size === 'lg' ? 'text-2xl' : 'text-xl'}`}>
            <span className="text-navy-900">Case</span>
            <span className="text-primary-600">Care</span>
          </div>
          {subtitle && <div className="text-[10px] font-medium text-slate-400">{subtitle}</div>}
        </div>
      )}
    </div>
  )
}
