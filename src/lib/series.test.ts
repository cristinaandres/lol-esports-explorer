import { describe, expect, it } from 'vitest'

import { groupGamesBySeries } from './series'
import type { Game } from './types'

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

describe('groupGamesBySeries', () => {
  it('keeps a best-of-one as a series of one game', () => {
    const groups = groupGamesBySeries([
      game({ game_key: 1, match_key: 100 }),
      game({ game_key: 2, match_key: 101, date_time_utc: '2020-01-02T00:00:00Z' }),
    ])

    expect(groups.series).toHaveLength(2)
    expect(groups.series[0]?.games).toHaveLength(1)
    expect(groups.orphans).toHaveLength(0)
  })

  it('groups a best-of-five into one series, ordered by date', () => {
    const rows = [3, 1, 5, 2, 4].map((position) =>
      game({
        game_key: position,
        match_key: 200,
        date_time_utc: `2020-01-0${position}T00:00:00Z`,
      }),
    )

    const groups = groupGamesBySeries(rows)

    expect(groups.series).toHaveLength(1)
    expect(groups.series[0]?.games.map((row) => row.game_key)).toEqual([1, 2, 3, 4, 5])
  })

  it('separates the games that carry no series instead of dropping them', () => {
    const groups = groupGamesBySeries([
      game({ game_key: 1, match_key: 0 }),
      game({ game_key: 2, match_key: 300 }),
      game({ game_key: 3, match_key: 0, date_time_utc: '2020-02-01T00:00:00Z' }),
    ])

    expect(groups.series).toHaveLength(1)
    expect(groups.orphans.map((row) => row.game_key)).toEqual([1, 3])
  })

  it('counts wins per team rather than per side', () => {
    // The two teams swap sides between games, which happens whenever a series
    // alternates sides. Team 10 must end with the wins it earned on both sides.
    const groups = groupGamesBySeries([
      game({ game_key: 1, match_key: 400, blue_win: 1, blue_team_key: 10, red_team_key: 20 }),
      game({ game_key: 2, match_key: 400, blue_win: 1, blue_team_key: 20, red_team_key: 10 }),
      game({ game_key: 3, match_key: 400, blue_win: 0, blue_team_key: 20, red_team_key: 10 }),
    ])

    const series = groups.series[0]!
    expect(series.wins.get(10)).toBe(2)
    expect(series.wins.get(20)).toBe(1)
  })

  it('orders series by their first game', () => {
    const groups = groupGamesBySeries([
      game({ game_key: 1, match_key: 500, date_time_utc: '2020-03-02T00:00:00Z' }),
      game({ game_key: 2, match_key: 501, date_time_utc: '2020-03-01T00:00:00Z' }),
    ])

    expect(groups.series.map((row) => row.matchKey)).toEqual([501, 500])
  })
})
