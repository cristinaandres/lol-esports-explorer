import type { Coverage } from '../lib/types'

/**
 * How much of a record the source carries, in words.
 *
 * The colour is decoration; the word is the message. A reader who cannot
 * distinguish the two shades still reads "partial", which is the point of showing
 * it at all.
 */
const COPY: Record<Coverage, string> = {
  complete: 'complete',
  partial: 'partial',
  unavailable: 'unavailable',
}

const TONE: Record<Coverage, string> = {
  complete: 'text-fog-300 border-line',
  partial: 'text-gold border-gold/40',
  unavailable: 'text-fog-600 border-line',
}

const EXPLAIN: Record<Coverage, string> = {
  complete: 'Every field eligible in this era has a value.',
  partial: 'The source recorded some of the eligible fields and answered null for others.',
  unavailable: 'The source carries no value for this group.',
}

export function CoverageBadge({ group, state }: { group: string; state: Coverage }) {
  return (
    <span
      className={`inline-flex items-baseline gap-1.5 rounded border px-2 py-0.5 text-[11px] ${TONE[state]}`}
      title={EXPLAIN[state]}
    >
      <span className="text-fog-600">{group}</span>
      <span>{COPY[state]}</span>
    </span>
  )
}
