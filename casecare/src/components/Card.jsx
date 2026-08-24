// Generic white rounded card, with optional header (title + action) and padding control.
export default function Card({
  children,
  title,
  action,
  className = '',
  bodyClassName = '',
  padding = true,
  as: Tag = 'div',
}) {
  return (
    <Tag className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          {typeof title === 'string' ? (
            <h3 className="text-[15px] font-semibold text-navy-900">{title}</h3>
          ) : (
            title
          )}
          {action}
        </div>
      )}
      <div className={`${padding ? (title || action ? 'px-5 pb-5' : 'p-5') : ''} ${bodyClassName}`}>
        {children}
      </div>
    </Tag>
  )
}
