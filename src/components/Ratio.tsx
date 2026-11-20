import { count, percent } from '../lib/format'

/**
 * A share, always with the sample it was measured on.
 *
 * This component exists so the rule cannot be forgotten: no percentage on this
 * site renders without its denominator. '62% (8/13)' is a claim a reader can
 * weigh; '62%' is a claim they have to trust. With a handful of games per
 * head-to-head, the difference decides whether the tool is honest.
 */
export function Ratio({
  part,
  total,
  label,
  empty = '—',
}: {
  part: number
  total: number
  label?: string
  empty?: string
}) {
  const measured = total > 0

  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={measured ? 'text-fog-100 font-semibold' : 'text-fog-600'}>{measured ? percent(part, total) : empty}</span>
      <span className="text-fog-600 font-mono text-xs">
        {measured ? `(${count(part)}/${count(total)})` : null}
      </span>
      {label ? <span className="text-fog-500 text-xs">{label}</span> : null}
    </span>
  )
}
