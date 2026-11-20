import { describe, expect, it } from 'vitest'

import { groupByPhase, phasePath, phaseSlug } from './phases'
import type { SeriesSummary } from './series'
import type { Match } from './types'

function series(matchKey: number, firstDate: string): SeriesSummary {
  return { matchKey, games: [], teamKeys: [1, 2], wins: new Map(), firstDate }
}

function match(matchKey: number, tab: string): [number, Match] {
  return [
    matchKey,
    {
      match_key: matchKey,
      match_id: `mt-${matchKey}`,
      event_key: 1,
      match_name: `Event — ${tab}`,
      date_time_utc: '2025-01-01T00:00:00Z',
      best_of: 5,
      tab,
      is_nullified: 0,
      forfeit: 0,
    },
  ]
}

describe('phaseSlug', () => {
  it('encodes the spaces and punctuation a tab carries', () => {
    expect(phaseSlug('Play-In Day 2')).toBe('Play-In%20Day%202')
    expect(phaseSlug("Loser's Round 2 (2)")).toBe("Loser's%20Round%202%20(2)")
  })

  it('builds a path that decodes back to the same tab', () => {
    const path = phasePath('evt-1', 'Group B')
    const segment = path.split('/').pop()!
    expect(decodeURIComponent(segment)).toBe('Group B')
  })
})

describe('groupByPhase', () => {
  const matches = new Map([
    match(1, 'Day 1'),
    match(2, 'Day 1'),
    match(3, 'Finals'),
    match(4, 'Semifinals'),
  ])

  it('groups series under the phase the source states', () => {
    const groups = groupByPhase(
      [series(1, '2025-03-10T00:00:00Z'), series(3, '2025-03-16T00:00:00Z'), series(2, '2025-03-10T00:00:00Z')],
      matches,
    )

    expect(groups.map((group) => group.tab)).toEqual(['Day 1', 'Finals'])
    expect(groups[0]?.series.map((entry) => entry.matchKey)).toEqual([1, 2])
  })

  it('orders the phases by when they were played, not alphabetically', () => {
    const groups = groupByPhase(
      [
        series(3, '2025-03-16T00:00:00Z'),
        series(4, '2025-03-15T00:00:00Z'),
        series(1, '2025-03-10T00:00:00Z'),
      ],
      matches,
    )

    expect(groups.map((group) => group.tab)).toEqual(['Day 1', 'Semifinals', 'Finals'])
  })

  it('keeps a series whose phase is unknown rather than dropping it', () => {
    const groups = groupByPhase([series(99, '2025-01-01T00:00:00Z')], matches)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.tab).toBe('Unknown phase')
  })

  it('returns nothing for an event with no series', () => {
    expect(groupByPhase([], matches)).toEqual([])
  })
})
