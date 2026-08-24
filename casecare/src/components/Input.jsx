// Labeled input. Supports left icon, optional right adornment, required marker and hint.
export default function Input({
  label,
  required,
  hint,
  icon: Icon,
  rightIcon: RightIcon,
  onRightIconClick,
  suffix,
  className = '',
  inputClassName = '',
  ...props
}) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-navy-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative flex items-stretch">
        {Icon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Icon size={16} />
          </span>
        )}
        <input
          className={`input-base ${Icon ? 'pl-9' : ''} ${RightIcon || suffix ? 'pr-10' : ''} ${inputClassName}`}
          {...props}
        />
        {suffix && (
          <span className="absolute inset-y-0 right-0 flex items-center rounded-r-lg border-l border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
            {suffix}
          </span>
        )}
        {RightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
          >
            <RightIcon size={16} />
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export function Textarea({ label, required, hint, maxLength, value = '', className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-navy-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        <textarea
          value={value}
          maxLength={maxLength}
          className="input-base min-h-[84px] resize-y"
          {...props}
        />
        {maxLength && (
          <span className="pointer-events-none absolute bottom-2 right-3 text-2xs text-slate-400">
            {String(value).length} / {maxLength}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
