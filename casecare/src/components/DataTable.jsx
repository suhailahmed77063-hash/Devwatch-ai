// Generic responsive data table.
// columns: [{ key, header, render?(row), align?, className?, thClassName? }]
export default function DataTable({
  columns = [],
  rows = [],
  selectable = false,
  rowKey = (r, i) => i,
  onRowClick,
  footer,
  className = '',
}) {
  const alignCls = { right: 'text-right', center: 'text-center', left: 'text-left' }
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/60">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${alignCls[col.align] || 'text-left'} ${col.thClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {selectable && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-navy-700 ${alignCls[col.align] || 'text-left'} ${col.className || ''}`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-slate-100 px-4 py-3">{footer}</div>}
    </div>
  )
}
