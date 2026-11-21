import { Ratio } from './Ratio'

/**
 * One row of a coverage list: what can be measured, and on how many games.
 *
 * Shared by the era and event pages so both state coverage the same way. The
 * share renders through Ratio, which always prints its denominator — a coverage
 * figure without the games it was measured on is not a figure this site shows.
 */
export function CoverageRow({ label, part, total }: { label: string; part: number; total: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-fog-300 text-sm">{label}</dt>
      <dd>
        <Ratio part={part} total={total} />
      </dd>
    </div>
  )
}
