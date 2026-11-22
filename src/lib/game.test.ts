import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { winnerKey } from './game'
import type { Game, Team } from './types'

const read = <T,>(name: string): T =>
  JSON.parse(readFileSync(join(import.meta.dirname, '../../public/data', name), 'utf-8')) as T

const games = read<Game[]>('games.json')
const teams = read<Team[]>('teams.json')

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

describe('winnerKey', () => {
  it('names the blue team when the blue side won', () => {
    expect(winnerKey(game({ blue_win: 1 }))).toBe(10)
  })

  it('names the red team when the red side won', () => {
    // 0 is a red win, not a false. Reading this as "blue did not win, so no
    // winner" is the bug the predicate exists to prevent.
    expect(winnerKey(game({ blue_win: 0 }))).toBe(20)
  })

  it('reads only the flag and the two keys, so a partial row is enough', () => {
    expect(winnerKey({ blue_win: 0, blue_team_key: 7, red_team_key: 8 })).toBe(8)
  })
})

/**
 * The invariant over the committed corpus, because three surfaces derive their
 * answer from this one function: the title list (which team won a final), a
 * series page's tally and a game page's "X won" line. A wrong team there is a
 * wrong claim about a real match, and no fixture would catch it.
 */
describe('winnerKey over games.json', () => {
  it('returns the team the hand-written expression named, for every game', () => {
    const mismatched = games.filter(
      (row) => winnerKey(row) !== (row.blue_win === 1 ? row.blue_team_key : row.red_team_key),
    )
    expect(mismatched).toHaveLength(0)
  })

  it('always returns one of the two sides', () => {
    const outside = games.filter(
      (row) => winnerKey(row) !== row.blue_team_key && winnerKey(row) !== row.red_team_key,
    )
    expect(outside).toHaveLength(0)
  })

  it('returns the side the flag names, not the side the scoreboard favours', () => {
    const wrongSide = games.filter((row) =>
      row.blue_win === 1
        ? winnerKey(row) !== row.blue_team_key
        : winnerKey(row) !== row.red_team_key,
    )
    expect(wrongSide).toHaveLength(0)
  })

  /**
   * The assumptions the predicate leans on, checked rather than assumed: the flag
   * is 0 or 1 and never another value, both sides are known teams, and no game
   * fields the same team twice (which would make "the winning team" ambiguous).
   */
  it('carries a 0/1 flag on every game and two different known teams', () => {
    const known = new Set(teams.map((team) => team.team_key))

    expect(games.filter((row) => row.blue_win !== 0 && row.blue_win !== 1)).toEqual([])
    expect(games.filter((row) => !known.has(row.blue_team_key) || !known.has(row.red_team_key))).toEqual(
      [],
    )
    expect(games.filter((row) => row.blue_team_key === row.red_team_key)).toEqual([])
  })
})
