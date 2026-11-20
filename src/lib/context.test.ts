import { describe, expect, it } from 'vitest'

import type { Appearance } from './career'
import { contextFor, fromParam, parseFrom } from './context'

function appearance(gameId: string): Appearance {
  return {
    competition: 'Worlds',
    game: {
      game_key: 1,
      game_id: gameId,
      event_key: 1,
      match_key: 1,
      date_time_utc: '2025-11-09T00:00:00Z',
      era: 'atakhan',
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

describe('parseFrom', () => {
  it('reads the prefixed form the site writes', () => {
    expect(parseFrom(new URLSearchParams('?from=game:gm-123'))).toBe('gm-123')
  })

  it('reads a bare id, because people edit URLs', () => {
    expect(parseFrom(new URLSearchParams('?from=gm-123'))).toBe('gm-123')
  })

  it('reads nothing as no context', () => {
    expect(parseFrom(new URLSearchParams(''))).toBeNull()
    expect(parseFrom(new URLSearchParams('?from='))).toBeNull()
    expect(parseFrom(new URLSearchParams('?from=game:'))).toBeNull()
  })
})

describe('contextFor', () => {
  const appearances = [appearance('gm-1'), appearance('gm-2')]

  it('finds the game the reader came from', () => {
    expect(contextFor(appearances, 'gm-2')?.game.game_id).toBe('gm-2')
  })

  it('returns null for a game this player did not play', () => {
    // The parameter says where the reader came from; this is the check that the
    // story is true. A context block for somebody else's game would be a lie.
    expect(contextFor(appearances, 'gm-elsewhere')).toBeNull()
  })

  it('returns null when there is no context at all', () => {
    expect(contextFor(appearances, null)).toBeNull()
  })
})

describe('fromParam', () => {
  it('writes the form parseFrom reads, so a link round-trips', () => {
    const search = new URLSearchParams(`?from=${fromParam('gm-9')}`)
    expect(parseFrom(search)).toBe('gm-9')
  })
})
