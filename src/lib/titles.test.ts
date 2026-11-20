import { describe, expect, it } from 'vitest'

import type { Appearance } from './career'
import { championships, groupTitlesByCompetition, isFinalName, titlesForPlayer, titlesForTeam } from './titles'
import type { Game, Match } from './types'

function match(overrides: Partial<Match> = {}): Match {
  return {
    match_key: 1,
    match_id: 'mt-1',
    event_key: 1,
    match_name: 'Worlds 2024 — Finals — 2024-11-02',
    date_time_utc: '2024-11-02T00:00:00Z',
    best_of: 5,
    tab: 'Finals',
    is_nullified: 0,
    forfeit: 0,
    ...overrides,
  }
}

function game(overrides: Partial<Game> = {}): Game {
  return {
    game_key: 1,
    game_id: 'gm-1',
    event_key: 1,
    match_key: 1,
    date_time_utc: '2024-11-02T00:00:00Z',
    era: 'voidgrubs',
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
    ...overrides,
  }
}

describe('isFinalName', () => {
  it('accepts the final and the grand final', () => {
    expect(isFinalName('Worlds 2024 — Finals — 2024-11-02')).toBe(true)
    expect(isFinalName('MSI 2024 — Grand Final — 2024-05-19')).toBe(true)
  })

  it('rejects the rounds that end in the same word', () => {
    expect(isFinalName('First Stand 2025 — Semifinals — 2025-03-15')).toBe(false)
    expect(isFinalName('First Stand 2025 — Quarterfinals — 2025-03-14')).toBe(false)
  })

  it('rejects a name that is not about a final at all', () => {
    expect(isFinalName('Worlds 2019 — Day 1 — 2019-10-02')).toBe(false)
  })
})

describe('championships', () => {
  it('awards the title to the team that won the final', () => {
    const games = [
      game({ game_key: 1, blue_win: 1 }),
      game({ game_key: 2, blue_win: 1 }),
      game({ game_key: 3, blue_win: 0 }),
    ]
    const champs = championships(games, [match()])

    expect(champs.get(1)).toMatchObject({ teamKey: 10, wins: 2, losses: 1 })
  })

  it('awards a relay whose final is a single decisive series', () => {
    // Rift Rivals 2017 NA-EU: one best-of-five, TSM 3-0. A relay is not
    // disqualifying; having no single final is.
    const finals = [match({ match_name: 'Rift Rivals 2017 NA-EU — Finals — 2017-07-08' })]
    const series = [
      game({ game_key: 1, blue_win: 1, blue_team_key: 10, red_team_key: 20 }),
      game({ game_key: 2, blue_win: 1, blue_team_key: 10, red_team_key: 20 }),
      game({ game_key: 3, blue_win: 0, blue_team_key: 20, red_team_key: 10 }),
    ]

    expect(championships(series, finals).get(1)).toMatchObject({ teamKey: 10, wins: 3, losses: 0 })
  })

  it('awards nothing when the event names more than one final', () => {
    // The Rift Rivals relays: a region wins, and no single team does.
    const matches = [match(), match({ match_key: 2, match_name: 'Rift Rivals 2018 NA-EU — Finals — 2018-07-07' })]
    expect(championships([game()], matches).size).toBe(0)
  })

  it('awards nothing when the event has no final', () => {
    expect(championships([game()], [match({ match_name: 'Worlds 2019 — Day 1 — 2019-10-02' })]).size).toBe(0)
  })

  it('awards nothing for a final with no game', () => {
    expect(championships([], [match()]).size).toBe(0)
  })

  it('awards nothing for a drawn final', () => {
    const games = [game({ game_key: 1, blue_win: 1 }), game({ game_key: 2, blue_win: 0 })]
    expect(championships(games, [match()]).size).toBe(0)
  })

  it('keeps the two events apart', () => {
    const matches = [
      match(),
      match({ match_key: 9, event_key: 2, match_name: 'MSI 2024 — Finals — 2024-05-19' }),
    ]
    const games = [
      game({ match_key: 1, blue_team_key: 10, red_team_key: 20, blue_win: 1 }),
      game({ game_key: 2, match_key: 9, event_key: 2, blue_team_key: 30, red_team_key: 40, blue_win: 0 }),
    ]
    const champs = championships(games, matches)
    expect(champs.get(1)?.teamKey).toBe(10)
    expect(champs.get(2)?.teamKey).toBe(40)
  })
})

describe('titlesForTeam', () => {
  it('returns the team titles, newest first', () => {
    const champs = championships(
      [
        game({ match_key: 1, blue_team_key: 10, red_team_key: 20, blue_win: 1 }),
        game({ game_key: 2, event_key: 2, match_key: 9, blue_team_key: 10, red_team_key: 30, blue_win: 1 }),
      ],
      [
        match({ date_time_utc: '2020-01-01T00:00:00Z' }),
        match({ match_key: 9, event_key: 2, date_time_utc: '2024-01-01T00:00:00Z' }),
      ],
    )

    expect(titlesForTeam(champs, 10).map((title) => title.eventKey)).toEqual([2, 1])
    expect(titlesForTeam(champs, 20)).toEqual([])
  })
})

describe('titlesForPlayer', () => {
  const champs = championships([game()], [match()])

  function appearance(eventKey: number, teamKey: number): Appearance {
    return {
      competition: 'Worlds',
      game: game({ event_key: eventKey }),
      row: {
        game_key: 1,
        player_key: 7,
        team_key: teamKey,
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

  it('counts a title when the player appeared for the winning team', () => {
    expect(titlesForPlayer(champs, [appearance(1, 10)])).toHaveLength(1)
  })

  it('does not count a title for the team that lost the final', () => {
    expect(titlesForPlayer(champs, [appearance(1, 20)])).toEqual([])
  })

  it('counts one title even when the player appeared many times in the event', () => {
    const titles = titlesForPlayer(champs, [appearance(1, 10), appearance(1, 10), appearance(1, 10)])
    expect(titles).toHaveLength(1)
  })
})

describe('groupTitlesByCompetition', () => {
  const competitions = new Map([
    [1, 'Worlds'],
    [2, 'Worlds'],
    [3, 'MSI'],
  ])
  const titles = [
    { eventKey: 1, teamKey: 10, wins: 3, losses: 0, date: '2023-11-19T00:00:00Z', finalName: 'f' },
    { eventKey: 2, teamKey: 10, wins: 3, losses: 2, date: '2024-11-02T00:00:00Z', finalName: 'f' },
    { eventKey: 3, teamKey: 10, wins: 3, losses: 1, date: '2016-05-15T00:00:00Z', finalName: 'f' },
  ]

  it('groups by competition', () => {
    const groups = groupTitlesByCompetition(titles, (key) => competitions.get(key))
    expect(groups.map((group) => group.competition)).toEqual(['Worlds', 'MSI'])
    expect(groups[0]?.titles).toHaveLength(2)
  })

  it('puts the competition with most titles first, then orders by name', () => {
    const groups = groupTitlesByCompetition(titles, (key) => competitions.get(key))
    expect(groups[0]?.competition).toBe('Worlds')
  })

  it('orders each group newest first', () => {
    const groups = groupTitlesByCompetition(titles, (key) => competitions.get(key))
    expect(groups[0]?.titles.map((title) => title.eventKey)).toEqual([2, 1])
  })

  it('keeps a title the caller cannot name instead of dropping it', () => {
    const groups = groupTitlesByCompetition(titles, () => undefined)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.competition).toBe('Unknown')
    expect(groups[0]?.titles).toHaveLength(3)
  })
})
