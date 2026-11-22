import { describe, expect, it } from 'vitest'

import {
  groupEvents,
  parseEventSort,
  parseSortOrder,
  type EventRowLike,
} from './eventGroups'

const event = (name: string, competition: string, year: number): EventRowLike => ({
  event_name: name,
  competition,
  year,
})

// Two competitions, three years, four events: the smallest fixture that can tell the
// two groupings apart.
const events = [
  event('Worlds 2024', 'Worlds', 2024),
  event('Worlds 2011', 'Worlds', 2011),
  event('MSI 2024', 'MSI', 2024),
  event('MSI 2023', 'MSI', 2023),
]

describe('parseEventSort and parseSortOrder', () => {
  it('read the two sorts and two directions, defaulting on anything else', () => {
    expect(parseEventSort('year')).toBe('year')
    expect(parseEventSort('competition')).toBe('competition')
    expect(parseEventSort(null)).toBe('competition')
    expect(parseEventSort('Year')).toBe('competition')

    expect(parseSortOrder('asc')).toBe('asc')
    expect(parseSortOrder('desc')).toBe('desc')
    expect(parseSortOrder(null)).toBe('desc')
    expect(parseSortOrder('newest')).toBe('desc')
  })
})

describe('groupEvents by competition', () => {
  it('groups largest first, then by name, with each group newest first', () => {
    const groups = groupEvents(events, 'competition', 'desc')
    expect(groups.map((group) => group.label)).toEqual(['MSI', 'Worlds'])
    // Two events each, so the name decides; inside, the newer event comes first.
    expect(groups[0]?.events.map((row) => row.event_name)).toEqual(['MSI 2024', 'MSI 2023'])
    expect(groups[1]?.events.map((row) => row.event_name)).toEqual(['Worlds 2024', 'Worlds 2011'])
  })

  it('ignores the direction: a competition’s groups are ordered by size', () => {
    const asc = groupEvents(events, 'competition', 'asc')
    const desc = groupEvents(events, 'competition', 'desc')
    expect(asc).toEqual(desc)
  })

  it('keeps every event exactly once', () => {
    const total = groupEvents(events, 'competition', 'desc').reduce(
      (sum, group) => sum + group.events.length,
      0,
    )
    expect(total).toBe(events.length)
  })
})

describe('groupEvents by year', () => {
  it('newest year first by default, oldest first when asked', () => {
    const desc = groupEvents(events, 'year', 'desc')
    expect(desc.map((group) => group.label)).toEqual(['2024', '2023', '2011'])
    const asc = groupEvents(events, 'year', 'asc')
    expect(asc.map((group) => group.label)).toEqual(['2011', '2023', '2024'])
    expect(asc.map((group) => group.label)).toEqual([...desc.map((group) => group.label)].reverse())
  })

  it('orders the events inside a year group by name, not by year', () => {
    const groups = groupEvents(events, 'year', 'desc')
    expect(groups[0]?.events.map((row) => row.event_name)).toEqual(['MSI 2024', 'Worlds 2024'])
  })

  it('keeps every event exactly once', () => {
    const total = groupEvents(events, 'year', 'asc').reduce(
      (sum, group) => sum + group.events.length,
      0,
    )
    expect(total).toBe(events.length)
  })
})
