import { describe, expect, it } from 'vitest'

import {
  appearancesFor,
  byRole,
  careerFrom,
  MIN_GAMES_FOR_RATE,
  rankByWinRate,
  recentForm,
  RECENT_FORM,
} from './career'
import type { Appearance } from './career'
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
    ...overrides,
  }
}

describe('rankByWinRate', () => {
  const stat = (key: number, games: number, wins: number) => ({ key, games, wins })

  it('puts a winning record above a losing one', () => {
    const ranked = rankByWinRate([stat(1, 10, 4), stat(2, 10, 7)])
    expect(ranked.map((row) => row.key)).toEqual([2, 1])
  })

  it('breaks a tie on games, so the bigger sample comes first', () => {
    const ranked = rankByWinRate([stat(1, 2, 2), stat(2, 40, 40)])
    expect(ranked.map((row) => row.key)).toEqual([2, 1])
  })

  it('orders by the percentage it prints, then by games', () => {
    // 5/6 is 83.3% and 34/41 is 82.9%. Both read "83%", and the bigger sample wins.
    const ranked = rankByWinRate([stat(1, 6, 5), stat(2, 41, 34)])
    expect(ranked.map((row) => row.key)).toEqual([2, 1])
    expect(Math.round((5 / 6) * 100)).toBe(Math.round((34 / 41) * 100))
  })

  it('breaks a full tie on the key, so the order never depends on insertion', () => {
    const ranked = rankByWinRate([stat(9, 5, 3), stat(3, 5, 3)])
    expect(ranked.map((row) => row.key)).toEqual([3, 9])
  })

  /**
   * Why the caller splits at this threshold before ranking: honouring the same
   * ordering without it would put a single lucky game above a career.
   */
  it('would rank one win above 34 wins in 41, which is why the threshold exists', () => {
    const ranked = rankByWinRate([stat(1, 41, 34), stat(2, 1, 1)])
    expect(ranked[0]?.key).toBe(2)
    expect(MIN_GAMES_FOR_RATE).toBeGreaterThan(1)
    expect(2).toBeLessThan(MIN_GAMES_FOR_RATE)
  })
})

describe('career aggregation', () => {
  /**
   * The path the player page takes: its games in, then the summary over them.
   * Composed here rather than behind an export of its own, so the tests exercise
   * the two functions the page actually calls.
   */
  const careerOf = (games: Game[], rows: PlayerGame[], playerKey: number) =>
    careerFrom(appearancesFor(games, rows, playerKey))

  it('adds up a career and divides once, at the end', () => {
    const career = careerOf(
      [game({ game_key: 1 }), game({ game_key: 2, date_time_utc: '2020-01-02T00:00:00Z' })],
      [
        row({ game_key: 1, kills: 10, deaths: 2, assists: 5 }),
        row({ game_key: 2, kills: 4, deaths: 3, assists: 6 }),
      ],
      7,
    )

    expect(career.games).toBe(2)
    expect(career.kills).toBe(14)
    expect(career.deaths).toBe(5)
    expect(career.assists).toBe(11)
    // (14 + 11) / 5, not the mean of the two per-game KDAs.
    expect(career.kda).toBe(5)
  })

  it('does not divide by zero deaths', () => {
    const career = careerOf([game()], [row({ kills: 5, deaths: 0, assists: 7 })], 7)
    expect(career.kda).toBe(12)
  })

  it('counts a win from the side the player was on, not from the blue side', () => {
    const career = careerOf(
      [
        game({ game_key: 1, blue_win: 1 }),
        game({ game_key: 2, blue_win: 0, date_time_utc: '2020-01-02T00:00:00Z' }),
      ],
      [
        row({ game_key: 1, side: 'blue' }),
        row({ game_key: 2, side: 'red' }),
      ],
      7,
    )

    expect(career.wins).toBe(2)
    expect(career.losses).toBe(0)
  })

  it('renders a single-game career without dividing by nothing', () => {
    const career = careerOf(
      [game()],
      [row({ kills: 3, deaths: 1, assists: 4, cs: 200, gold: 12000, damage: 9000, vision: 20 })],
      7,
    )

    expect(career.games).toBe(1)
    expect(career.averages.kills).toBe(3)
    expect(career.measures.damage.average).toBe(9000)
    expect(career.champions).toEqual([{ key: 100, role: 'Mid', games: 1, wins: 1 }])
  })

  it('returns an empty career for a player with no games', () => {
    const career = careerOf([game()], [row()], 999)

    expect(career.games).toBe(0)
    expect(career.kda).toBeNull()
    expect(career.averages.kills).toBeNull()
    expect(career.measures.damage).toEqual({ sum: 0, measured: 0, average: null, firstMeasured: null })
    expect(career.champions).toEqual([])
    expect(career.firstGame).toBeNull()
  })

  /**
   * The rule that matters most on this page. 15,910 of the 30,910 player rows
   * carry no damage figure, so an average over "games" would divide by rows that
   * never stated one.
   */
  it('averages a measure over the rows that state it, not over games', () => {
    const career = careerOf(
      [game({ game_key: 1 }), game({ game_key: 2, date_time_utc: '2020-01-02T00:00:00Z' })],
      [row({ game_key: 1, damage: 10000 }), row({ game_key: 2, damage: null })],
      7,
    )

    expect(career.games).toBe(2)
    expect(career.measures.damage).toEqual({
      sum: 10000,
      measured: 1,
      average: 10000,
      firstMeasured: '2020-01-01T00:00:00Z',
    })
  })

  it('keeps the request for the player being asked about', () => {
    const career = careerOf([game()], [row({ player_key: 7 }), row({ player_key: 8, kills: 99 })], 7)
    expect(career.kills).toBe(0)
  })

  it('orders champions by games played', () => {
    const career = careerOf(
      [
        game({ game_key: 1 }),
        game({ game_key: 2, date_time_utc: '2020-01-02T00:00:00Z' }),
        game({ game_key: 3, date_time_utc: '2020-01-03T00:00:00Z' }),
      ],
      [
        row({ game_key: 1, champion_key: 5, team_key: 10 }),
        row({ game_key: 2, champion_key: 5, team_key: 20 }),
        row({ game_key: 3, champion_key: 6, team_key: 20 }),
      ],
      7,
    )

    expect(career.champions.map((champion) => champion.key)).toEqual([5, 6])
    expect(career.teams.map((team) => team.key)).toEqual([20, 10])
  })

  /**
   * A champion played in two roles is two jobs, not one. 58 player-champion pairs
   * in the corpus are like this: Perkz's Kai'Sa, Bwipo's Ornn.
   */
  it('keeps a champion played in two roles as two entries', () => {
    const career = careerOf(
      [game({ game_key: 1 }), game({ game_key: 2, date_time_utc: '2020-01-02T00:00:00Z' })],
      [
        row({ game_key: 1, champion_key: 5, role: 'Mid' }),
        row({ game_key: 2, champion_key: 5, role: 'Bot' }),
      ],
      7,
    )

    expect(career.champions).toHaveLength(2)
    expect(career.champions.map((champion) => champion.role).sort()).toEqual(['Bot', 'Mid'])
    expect(career.champions.every((champion) => champion.games === 1)).toBe(true)
  })

  it('lists the eras the player appears in, oldest first', () => {
    const career = careerOf(
      [
        game({ game_key: 1, era: 'atakhan', date_time_utc: '2025-03-10T00:00:00Z' }),
        game({ game_key: 2, era: 'pre-herald', date_time_utc: '2013-09-15T00:00:00Z' }),
        game({ game_key: 3, era: 'atakhan', date_time_utc: '2026-01-01T00:00:00Z' }),
      ],
      [row({ game_key: 1 }), row({ game_key: 2 }), row({ game_key: 3 })],
      7,
    )

    expect(career.eras).toEqual(['pre-herald', 'atakhan'])
    expect(career.firstGame).toBe('2013-09-15T00:00:00Z')
    expect(career.lastGame).toBe('2026-01-01T00:00:00Z')
  })

  it('records when a measure starts being stated', () => {
    const career = careerOf(
      [
        game({ game_key: 1, date_time_utc: '2020-01-01T00:00:00Z' }),
        game({ game_key: 2, date_time_utc: '2021-01-01T00:00:00Z' }),
      ],
      [row({ game_key: 1, damage: null }), row({ game_key: 2, damage: 9000 })],
      7,
    )

    expect(career.measures.damage.firstMeasured).toBe('2021-01-01T00:00:00Z')
  })

  it('ignores a row whose game is not in the corpus', () => {
    const career = careerOf([game({ game_key: 1 })], [row({ game_key: 99 })], 7)
    expect(career.games).toBe(0)
  })
})

describe('recentForm', () => {
  const appearances: Appearance[] = Array.from({ length: 15 }, (_, i) => ({
    competition: 'Worlds',
    game: {
      game_key: i + 1,
      game_id: `gm-${i + 1}`,
      event_key: 1,
      match_key: 1,
      date_time_utc: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
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
    },
    row: {
      game_key: i + 1,
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
  }))

  it('returns the last games, newest first', () => {
    const form = recentForm(appearances)
    expect(form).toHaveLength(RECENT_FORM)
    expect(form[0]?.game.game_key).toBe(15)
    expect(form[form.length - 1]?.game.game_key).toBe(6)
  })

  it('returns everything when the career is shorter than the window', () => {
    expect(recentForm(appearances.slice(0, 3))).toHaveLength(3)
  })

  it('returns nothing for an empty selection', () => {
    expect(recentForm([])).toEqual([])
  })
})

describe('byRole', () => {
  function appearance(role: string, won: boolean): Appearance {
    return {
      competition: 'Worlds',
      game: {
        game_key: 1,
        game_id: 'gm-1',
        event_key: 1,
        match_key: 1,
        date_time_utc: '2024-01-01T00:00:00Z',
        era: 'voidgrubs',
        patch_key: 1,
        duration_seconds: 1800,
        blue_win: won ? 1 : 0,
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
        role,
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

  it('splits by role, most games first', () => {
    const splits = byRole([appearance('Mid', true), appearance('Mid', false), appearance('Bot', true)])
    expect(splits.map((split) => split.role)).toEqual(['Mid', 'Bot'])
    expect(splits[0]?.career.games).toBe(2)
    expect(splits[1]?.career.wins).toBe(1)
  })

  it('adds up to the whole career', () => {
    const rows = [appearance('Mid', true), appearance('Bot', false), appearance('Bot', true)]
    const total = byRole(rows).reduce((sum, split) => sum + split.career.games, 0)
    expect(total).toBe(rows.length)
  })

  it('returns nothing for an empty selection', () => {
    expect(byRole([])).toEqual([])
  })
})
