import type { ReactNode } from 'react'

/**
 * A table that survives a phone.
 *
 * Every table on the site sets a minimum width and scrolls sideways on a narrow
 * screen, which hides the right-hand columns behind a gesture nothing announces.
 * This renders the same data twice: a real table from `sm` up, and one stacked block
 * per row below it, where each value carries its own label.
 *
 * Both copies are in the DOM and only one is displayed, so a screen reader reads the
 * visible one and nothing is announced twice.
 */
export type Column<T> = {
  key: string
  label: string
  align?: 'left' | 'right'
  render: (row: T) => ReactNode
  /** Becomes the row's heading in the stacked layout. Exactly one column should set it. */
  primary?: boolean
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  minWidth = '36rem',
  activeKey = null,
  onRowHover,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  minWidth?: string
  /** The row a chart is highlighting, if any. */
  activeKey?: string | number | null
  /** Reports the row under the pointer, so a chart can highlight its mark. */
  onRowHover?: (key: string | number | null) => void
}) {
  const primary = columns.find((column) => column.primary) ?? columns[0]
  const rest = columns.filter((column) => column !== primary)

  return (
    <div className="border-line overflow-hidden rounded-xl border">
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm" style={{ minWidth }}>
          <thead>
            <tr className="text-fog-600 border-line border-b text-left text-[11px] tracking-wider uppercase">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-2.5 font-medium ${column.align === 'right' ? 'text-right' : ''}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {rows.map((row) => {
              const key = rowKey(row)
              return (
                <tr
                  key={key}
                  className={`hover:bg-ink-850/50 ${activeKey === key ? 'bg-ink-850' : ''}`}
                  onMouseEnter={() => onRowHover?.(key)}
                  onMouseLeave={() => onRowHover?.(null)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-2 ${column.align === 'right' ? 'text-right tabular-nums' : ''}`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-line divide-y sm:hidden">
        {rows.map((row) => {
          const key = rowKey(row)
          return (
            <li
              key={key}
              className={`px-4 py-3 ${activeKey === key ? 'bg-ink-850' : ''}`}
              onMouseEnter={() => onRowHover?.(key)}
              onMouseLeave={() => onRowHover?.(null)}
            >
              <div className="text-fog-100 text-sm font-medium">{primary?.render(row)}</div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                {rest.map((column) => (
                  <div key={column.key} className="flex items-baseline justify-between gap-2">
                    <dt className="text-fog-600 text-[10px] tracking-wider uppercase">{column.label}</dt>
                    <dd className="text-fog-300 text-xs tabular-nums">{column.render(row)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
