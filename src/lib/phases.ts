import type { SeriesSummary } from './series'
import type { Match } from './types'

/**
 * A phase is the `tab` the source groups a competition's series under: "Day 3",
 * "Semifinals", "Play-In Day 2", "Loser's Round 2 (2)".
 *
 * It is the level an event is actually read at — nobody follows a tournament as
 * one flat list of 120 series — and the source states it for all 2,068 series, so
 * it needs no inference.
 */

export type PhaseGroup = {
  tab: string
  series: SeriesSummary[]
  /** Earliest series of the phase, for ordering. */
  firstDate: string
}

/** The phase as a URL segment. Tabs carry spaces, apostrophes and parentheses. */
export function phaseSlug(tab: string): string {
  return encodeURIComponent(tab)
}

export function phasePath(eventId: string, tab: string): string {
  return `/events/${eventId}/phases/${phaseSlug(tab)}`
}

/**
 * Series grouped by the phase they belong to, in the order the event was played.
 *
 * A series whose match the caller cannot resolve lands in an "Unknown phase"
 * group rather than disappearing from the event page.
 */
export function groupByPhase(
  series: SeriesSummary[],
  matches: Map<number, Match>,
): PhaseGroup[] {
  const groups = new Map<string, SeriesSummary[]>()

  for (const entry of series) {
    const tab = matches.get(entry.matchKey)?.tab || 'Unknown phase'
    const bucket = groups.get(tab)
    if (bucket) bucket.push(entry)
    else groups.set(tab, [entry])
  }

  return [...groups.entries()]
    .map(([tab, rows]) => {
      const sorted = [...rows].sort((a, b) => a.firstDate.localeCompare(b.firstDate))
      return { tab, series: sorted, firstDate: sorted[0]?.firstDate ?? '' }
    })
    .sort((a, b) => a.firstDate.localeCompare(b.firstDate) || a.tab.localeCompare(b.tab))
}
