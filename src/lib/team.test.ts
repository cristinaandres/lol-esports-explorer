import { describe, expect, it } from 'vitest'

import { rosterFrom, teamAppearancesFor, teamSummaryFrom, type TeamAppearance } from './team'
import type { Game, PlayerGame } from './types'

function game(overrides: Partial<Game> = {}): Game {
  return {
    game_key: 1,
    game_id: 'gm-1',
    event_key: 1,
    match_key: 1,
    date_time_utc: '2020-01-01T00:00:00Z',
    era: 'elemental-drakes',
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

function row(overrides: Partial<PlayerGame> = {}): PlayerGame {
  return {
    game_key: 1,
    player_key: 1,
    team_key: 10,
    champion_key: 100,
    side: 'blue',
    role: 'Top',
    kills: 0,
    deaths: 0,
    assists: 0,
    cs: 0,
    gold: 0,
    damage: 0,
    vision: 0,
    ...overrides,
  }
}

const competitions = new Map([
  [1, 'Worlds'],
  [2, 'MSI'],
])

describe('teamAppearancesFor', () => {
  it('keeps only the games the team played, on either side', () => {
    const games = [
      game({ game_key: 1, blue_team_key: 10, red_team_key: 20 }),
      game({ game_key: 2, blue_team_key: 30, red_team_key: 10, date_time_utc: '2020-02-01T00:00:00Z' }),
      game({ game_key: 3, blue_team_key: 30, red_team_key: 40 }),
    ]

    const appearances = teamAppearancesFor(games, competitions, 10)
    expect(appearances).toHaveLength(2)
    expect(appearances.map((appearance) => appearance.side)).toEqual(['blue', 'red'])
  })

  it('reads a win from the side the team was on', () => {
    const games = [
      game({ game_key: 1, blue_win: 1, blue_team_key: 10, red_team_key: 20 }),
      game({
        game_key: 2,
        blue_win: 0,
        blue_team_key: 20,
        red_team_key: 10,
        date_time_utc: '2020-02-01T00:00:00Z',
      }),
    ]

    const appearances = teamAppearancesFor(games, competitions, 10)
    expect(appearances.every((appearance) => appearance.won)).toBe(true)
  })

  it('orders by date, so the first and last game mean something', () => {
    const appearances = teamAppearancesFor(
      [
        game({ game_key: 2, date_time_utc: '2020-05-01T00:00:00Z' }),
        game({ game_key: 1, date_time_utc: '2020-01-01T00:00:00Z' }),
      ],
      competitions,
      10,
    )
    expect(appearances.map((appearance) => appearance.game.game_key)).toEqual([1, 2])
  })

  it('names an event the map does not know rather than dropping the game', () => {
    const appearances = teamAppearancesFor([game({ event_key: 99 })], competitions, 10)
    expect(appearances[0]?.competition).toBe('Unknown')
  })
})

describe('teamSummaryFrom', () => {
  const appearances: TeamAppearance[] = [
    { game: game({ game_key: 1, event_key: 1 }), side: 'blue', won: true, competition: 'Worlds' },
    { game: game({ game_key: 2, event_key: 1 }), side: 'red', won: false, competition: 'Worlds' },
    { game: game({ game_key: 3, event_key: 2 }), side: 'red', won: true, competition: 'MSI' },
  ]

  it('counts games and wins', () => {
    const summary = teamSummaryFrom(appearances)
    expect(summary.games).toBe(3)
    expect(summary.wins).toBe(2)
  })

  it('splits by side, because side advantage belongs to the era', () => {
    const summary = teamSummaryFrom(appearances)
    expect(summary.blue).toEqual({ games: 1, wins: 1 })
    expect(summary.red).toEqual({ games: 2, wins: 1 })
  })

  it('groups the events it played, most games first', () => {
    const summary = teamSummaryFrom(appearances)
    expect(summary.events).toEqual([
      { eventKey: 1, games: 2, wins: 1 },
      { eventKey: 2, games: 1, wins: 1 },
    ])
  })

  it('is empty for a team with no game', () => {
    const summary = teamSummaryFrom([])
    expect(summary.games).toBe(0)
    expect(summary.firstGame).toBeNull()
    expect(summary.events).toEqual([])
  })
})

describe('rosterFrom', () => {
  const appearances = teamAppearancesFor(
    [
      game({ game_key: 1, blue_team_key: 10, red_team_key: 20 }),
      game({ game_key: 2, blue_team_key: 20, red_team_key: 10, date_time_utc: '2020-03-01T00:00:00Z' }),
    ],
    competitions,
    10,
  )

  it('counts only rows of this team', () => {
    const roster = rosterFrom(
      [
        row({ game_key: 1, player_key: 7, team_key: 10 }),
        // An opponent in the same game: not this team's roster.
        row({ game_key: 1, player_key: 8, team_key: 20, side: 'red' }),
      ],
      appearances,
    )

    expect(roster.map((entry) => entry.playerKey)).toEqual([7])
  })

  it('records the first and last game of each player', () => {
    const roster = rosterFrom(
      [
        row({ game_key: 1, player_key: 7, team_key: 10, side: 'blue' }),
        row({ game_key: 2, player_key: 7, team_key: 10, side: 'red' }),
      ],
      appearances,
    )

    expect(roster[0]).toMatchObject({
      playerKey: 7,
      games: 2,
      first: '2020-01-01T00:00:00Z',
      last: '2020-03-01T00:00:00Z',
    })
  })

  it('handles a player who leaves and comes back, counting every appearance', () => {
    const three = teamAppearancesFor(
      [
        game({ game_key: 1 }),
        game({ game_key: 2, date_time_utc: '2020-02-01T00:00:00Z' }),
        game({ game_key: 3, date_time_utc: '2020-03-01T00:00:00Z' }),
      ],
      competitions,
      10,
    )
    const roster = rosterFrom(
      [
        row({ game_key: 1, player_key: 7 }),
        row({ game_key: 3, player_key: 7 }),
      ],
      three,
    )

    expect(roster[0]).toMatchObject({ games: 2 })
    expect(roster[0]!.first).toBe('2020-01-01T00:00:00Z')
    expect(roster[0]!.last).toBe('2020-03-01T00:00:00Z')
  })

  it('ignores rows for games outside the filtered set', () => {
    const roster = rosterFrom([row({ game_key: 99, player_key: 7 })], appearances)
    expect(roster).toEqual([])
  })
})
