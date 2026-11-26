import type { ReactNode } from 'react'

/**
 * The frame every chart sits in: a title, the marks, the caption that states the
 * denominator, and the table the marks are a view of.
 *
 * The table is part of the frame rather than an optional sibling because a chart
 * without it would be the only place a number lives. The frame does not draw a chart
 * itself; it makes the pairing impossible to forget.
 */
export function ChartFrame({
  title,
  caption,
  table,
  children,
}: {
  title: string
  caption: string
  table: ReactNode
  children: ReactNode
}) {
  return (
    <figure className="mt-8">
      <figcaption className="text-fog-100 text-sm font-semibold tracking-tight">{title}</figcaption>
      <div className="mt-3 overflow-x-auto">{children}</div>
      <p className="text-fog-600 mt-2 max-w-3xl text-xs leading-relaxed">{caption}</p>
      <div className="mt-4">{table}</div>
    </figure>
  )
}
