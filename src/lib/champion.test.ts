import { describe, expect, it } from 'vitest'

import { championRecord, championUsers, presenceOf } from './champion'
import type { DraftSlot, Game, PlayerGame } from './types'

function game(overrides: Partial<Game> = {}): Game {
  return {
    game_key: 1,
    game_id: 'gm-1',
    event_key: 1,
    match_key: 1,
    date_time_utc: '2024-01-01T00:00:00Z',
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

function row(overrides: Partial<PlayerGame> = {}): PlayerGame {
  return {
    game_key: 1,
    player_key: 1,
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
    ...overrides,
  }
}

function ban(overrides: Partial<DraftSlot> = {}): DraftSlot {
  return { game_key: 1, side: 'blue', entry_index: 1, slot: 1, champion_key: 100, ...overrides }
}

describe('championRecord', () => {
  const games = [
    game({ game_key: 1, era: 'elemental-drakes', date_time_utc: '2019-01-01T00:00:00Z' }),
    game({ game_key: 2, era: 'voidgrubs', date_time_utc: '2024-01-01T00:00:00Z' }),
    game({ game_key: 3, era: 'voidgrubs', date_time_utc: '2024-02-01T00:00:00Z' }),
  ]

  it('measures presence against the games of the era, not against its own', () => {
    const record = championRecord(games, [row({ game_key: 2 })], [], 100)
    const voidgrubs = record.eras.find((era) => era.era === 'voidgrubs')!

    // Two games were played in the era; the champion appeared in one.
    expect(voidgrubs.games).toBe(2)
    expect(voidgrubs.picked).toBe(1)
    expect(presenceOf(voidgrubs)).toBe(1)
  })

  it('counts a ban without counting a pick', () => {
    const record = championRecord(games, [], [ban({ game_key: 3 })], 100)
    const voidgrubs = record.eras.find((era) => era.era === 'voidgrubs')!

    expect(voidgrubs.picked).toBe(0)
    expect(voidgrubs.banned).toBe(1)
  })

  it('counts a blind-pick game once, on both sides', () => {
    const record = championRecord(
      games,
      [row({ game_key: 2, side: 'blue' }), row({ game_key: 2, side: 'red', team_key: 20 })],
      [],
      100,
    )
    const voidgrubs = record.eras.find((era) => era.era === 'voidgrubs')!

    // One game, not two: the champion appears on both sides in blind pick, but the
    // game is still one game and only one side can have won it.
    expect(voidgrubs.picked).toBe(1)
    expect(voidgrubs.won).toBe(1)
  })

  it('counts a win only when the picking side won', () => {
    const record = championRecord(
      [game({ game_key: 1, blue_win: 0 })],
      [row({ game_key: 1, side: 'blue' })],
      [],
      100,
    )
    expect(record.won).toBe(0)
  })

  it('shows nothing before the champion existed rather than zero', () => {
    const record = championRecord([game({ game_key: 1, era: 'elemental-drakes', date_time_utc: '2019-01-01T00:00:00Z' })], [row({ game_key: 2 })], [], 100)
    const earlier = record.eras.find((era) => era.era === 'elemental-drakes')!

    expect(earlier.games).toBe(1)
    expect(earlier.picked).toBe(0)
    expect(record.firstPicked).toBeNull()
  })

  it('orders the eras by their first game', () => {
    const record = championRecord(games, [row({ game_key: 2 })], [], 100)
    expect(record.eras.map((era) => era.era)).toEqual(['elemental-drakes', 'voidgrubs'])
  })

  it('ignores rows for a champion nobody played', () => {
    const record = championRecord(games, [row({ game_key: 2, champion_key: 999 })], [], 100)
    expect(record.picked).toBe(0)
  })
})

describe('championUsers', () => {
  const games = [
    game({ game_key: 1, blue_win: 1 }),
    game({ game_key: 2, blue_win: 1, date_time_utc: '2024-02-01T00:00:00Z' }),
  ]

  it('splits roles, players and teams', () => {
    const users = championUsers(
      games,
      [
        row({ game_key: 1, player_key: 7, team_key: 10, role: 'Mid' }),
        row({ game_key: 2, player_key: 8, team_key: 10, role: 'Mid' }),
        row({ game_key: 1, player_key: 9, team_key: 20, role: 'Top', side: 'red' }),
      ],
      100,
    )

    expect(users.roles).toEqual([{ role: 'Mid', games: 2 }, { role: 'Top', games: 1 }])
    expect(users.players.map((entry) => entry.key)).toEqual([7, 8, 9])
    expect(users.teams[0]).toMatchObject({ key: 10, games: 2 })
  })

  it('counts a win only for the side that won', () => {
    const users = championUsers(
      games,
      [row({ game_key: 1, player_key: 7, team_key: 10, side: 'blue' })],
      100,
    )
    expect(users.players[0]).toEqual({ key: 7, games: 1, wins: 1 })
  })

  it('ignores rows outside the games in scope, which is how the filter narrows it', () => {
    const users = championUsers([], [row()], 100)
    expect(users.roles).toEqual([])
    expect(users.players).toEqual([])
  })
})
