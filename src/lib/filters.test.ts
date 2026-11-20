import { describe, expect, it } from 'vitest'

import type { Appearance } from './career'
import {
  applyFilter,
  emptyReason,
  filterSearch,
  NO_FILTER,
  optionsFor,
  parseFilter,
  recoverFilter,
  yearOf,
} from './filters'

function appearance(competition: string, date: string, era = 'atakhan'): Appearance {
  return {
    competition,
    game: {
      game_key: 1,
      game_id: 'gm-1',
      event_key: 1,
      match_key: 1,
      date_time_utc: date,
      era,
      patch_key: 1,
      duration_seconds: 1800,
      blue_win: 1,
      blue_team_key: 10,
      red_team_key: 20,
      draft_fidelity: 'ordered',
      draft_switched_sides: 0,
      team_stats_coverage: 'complete',
      draft_coverage: 'complete',
      player_stats_coverage: 'complete',
    },
    row: {
      game_key: 1,
      player_key: 7,
      team_key: 10,
      champion_key: 100,
      side: 'blue',
      role: 'Mid',
      kills: 0,
      deaths: 0,
      assists: 0,
      cs: 0,
      gold: 0,
      damage: 0,
      vision: 0,
    },
  }
}

const career = [
  appearance('Worlds', '2019-10-12T00:00:00Z'),
  appearance('Worlds', '2021-10-22T00:00:00Z'),
  appearance('Worlds', '2025-11-09T00:00:00Z'),
  appearance('MSI', '2024-05-10T00:00:00Z'),
]

describe('parseFilter', () => {
  it('reads both halves', () => {
    expect(parseFilter(new URLSearchParams('?competition=Worlds&year=2025'))).toEqual({
      competition: 'Worlds',
      year: 2025,
    })
  })

  it('reads nothing as no filter', () => {
    expect(parseFilter(new URLSearchParams(''))).toEqual(NO_FILTER)
  })

  it('drops a year that is not four digits rather than coercing it', () => {
    expect(parseFilter(new URLSearchParams('?year=last')).year).toBeNull()
    expect(parseFilter(new URLSearchParams('?year=25')).year).toBeNull()
    expect(parseFilter(new URLSearchParams('?year=20255')).year).toBeNull()
  })

  it('keeps a competition it does not recognise, so the empty state can explain it', () => {
    expect(parseFilter(new URLSearchParams('?competition=Nothing')).competition).toBe('Nothing')
  })
})

describe('filterSearch', () => {
  it('writes only what differs from the default', () => {
    expect(filterSearch(NO_FILTER)).toBe('')
    expect(filterSearch({ competition: 'Worlds', year: null })).toBe('?competition=Worlds')
    expect(filterSearch({ competition: null, year: 2025 })).toBe('?year=2025')
  })

  it('round-trips, so a shared link does not drift', () => {
    const filters = [
      NO_FILTER,
      { competition: 'Worlds', year: null },
      { competition: null, year: 2025 },
      { competition: 'Rift Rivals', year: 2017 },
    ]

    for (const filter of filters) {
      expect(parseFilter(new URLSearchParams(filterSearch(filter)))).toEqual(filter)
    }
  })

  it('encodes a competition with a space in it', () => {
    expect(filterSearch({ competition: 'Rift Rivals', year: null })).toBe('?competition=Rift+Rivals')
  })
})

describe('applyFilter', () => {
  it('narrows by competition', () => {
    expect(applyFilter(career, { competition: 'MSI', year: null })).toHaveLength(1)
  })

  it('narrows by year, read from the game and not from an event field', () => {
    expect(applyFilter(career, { competition: null, year: 2021 })).toHaveLength(1)
  })

  it('narrows by both', () => {
    expect(applyFilter(career, { competition: 'Worlds', year: 2025 })).toHaveLength(1)
    expect(applyFilter(career, { competition: 'MSI', year: 2025 })).toHaveLength(0)
  })

  it('returns the list untouched when there is no filter', () => {
    expect(applyFilter(career, NO_FILTER)).toBe(career)
  })

  it('reads the year without constructing a Date', () => {
    expect(yearOf('2019-10-12T00:00:00Z')).toBe(2019)
  })
})

describe('optionsFor', () => {
  it('offers the whole range, newest year first', () => {
    const options = optionsFor(career)
    expect(options.competitions).toEqual(['MSI', 'Worlds'])
    expect(options.years).toEqual([2025, 2024, 2021, 2019])
  })

  it('does not shrink the competitions when a year is chosen', () => {
    // The point: narrowing must not make the way back disappear.
    const narrowed = applyFilter(career, { competition: null, year: 2025 })
    expect(optionsFor(narrowed).competitions).toEqual(['Worlds'])
    expect(optionsFor(career).competitions).toEqual(['MSI', 'Worlds'])
  })
})

describe('emptyReason', () => {
  it('names the year when the competition alone still has games', () => {
    expect(emptyReason(career, { competition: 'Worlds', year: 2024 })).toBe('year')
  })

  it('names the competition when it alone leaves nothing', () => {
    expect(emptyReason(career, { competition: 'IEM', year: 2019 })).toBe('competition')
  })

  it('says nothing when the view has games or there is no filter', () => {
    expect(emptyReason(career, { competition: 'Worlds', year: 2025 })).toBeNull()
    expect(emptyReason(career, NO_FILTER)).toBeNull()
    expect(emptyReason([], { competition: 'Worlds', year: 2025 })).toBeNull()
  })
})

describe('recoverFilter', () => {
  it('drops the year when the year emptied the view', () => {
    const recovered = recoverFilter(career, { competition: 'Worlds', year: 2024 })
    expect(recovered).toEqual({ competition: 'Worlds', year: null })
    expect(applyFilter(career, recovered).length).toBeGreaterThan(0)
  })

  it('drops the competition and keeps the year, when the year still has games', () => {
    const recovered = recoverFilter(career, { competition: 'IEM', year: 2024 })
    expect(recovered).toEqual({ competition: null, year: 2024 })
    expect(applyFilter(career, recovered).length).toBeGreaterThan(0)
  })

  it('falls back to no filter when dropping one half is not enough', () => {
    // 2013 has no game at all in this fixture, so only clearing both helps.
    const recovered = recoverFilter(career, { competition: 'IEM', year: 2013 })
    expect(recovered).toEqual(NO_FILTER)
    expect(applyFilter(career, recovered).length).toBeGreaterThan(0)
  })

  it('always returns a filter that leaves games, for any empty combination', () => {
    const competitions = ['Worlds', 'MSI', 'IEM']
    const years = [2013, 2019, 2021, 2024, 2025]

    for (const competition of competitions) {
      for (const year of years) {
        const filter = { competition, year }
        if (applyFilter(career, filter).length > 0) continue
        expect(applyFilter(career, recoverFilter(career, filter)).length).toBeGreaterThan(0)
      }
    }
  })
})
