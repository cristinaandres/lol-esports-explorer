import { describe, expect, it } from 'vitest'

import { playersByRole, readDraftState, sidesSwapped, slotSide, slotsFor, sortSlots } from './draft'
import type { DraftSlot, Game, PlayerGame } from './types'

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

function slot(overrides: Partial<DraftSlot> = {}): DraftSlot {
  return { game_key: 1, side: 'blue', entry_index: 1, slot: 1, champion_key: 100, ...overrides }
}

function playerGame(overrides: Partial<PlayerGame> = {}): PlayerGame {
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

describe('readDraftState', () => {
  it('reads an ordered draft as ordered', () => {
    expect(readDraftState(game(), 10)).toBe('ordered')
  })

  it('reads an unordered draft as unordered', () => {
    expect(readDraftState(game({ draft_fidelity: 'unordered' }), 10)).toBe('unordered')
  })

  it('calls it no draft only when there is no player row', () => {
    expect(readDraftState(game(), 0)).toBe('none')
  })

  /**
   * Regression. The 2020 Mid-Season Cup played the first game of each best-of-five
   * in blind pick: the picks are recorded and the bans are not. Counting slot rows
   * to decide the state classified those three games as "no draft", because the
   * picks artifact carries ordered picks only.
   */
  it('does not confuse a draft with no bans for a game without a draft', () => {
    const blindPick = game({ draft_fidelity: 'unordered' })
    expect(readDraftState(blindPick, 10)).toBe('unordered')
  })
})

describe('slotSide', () => {
  it('reads the other side when the source stated a swapped draft', () => {
    expect(slotSide('blue', true)).toBe('red')
    expect(slotSide('red', true)).toBe('blue')
  })

  it('reads the same side when it did not', () => {
    expect(slotSide('blue', false)).toBe('blue')
  })
})

describe('slotsFor', () => {
  const slots = [
    slot({ side: 'blue', slot: 1, champion_key: 1 }),
    slot({ side: 'red', slot: 1, champion_key: 2 }),
    slot({ side: 'red', slot: 2, champion_key: 3 }),
  ]

  it('returns one side, ordered by slot', () => {
    expect(slotsFor(slots, 1, 'red').map((row) => row.champion_key)).toEqual([2, 3])
  })

  it('corrects a swapped draft, which is not a cosmetic flag', () => {
    // 250 games state their draft with the sides exchanged.
    expect(slotsFor(slots, 1, 'blue', true).map((row) => row.champion_key)).toEqual([2, 3])
  })

  it('ignores other games', () => {
    expect(slotsFor(slots, 2, 'blue')).toEqual([])
  })
})

describe('sortSlots', () => {
  it('orders by slot, then by the order the source wrote the rows', () => {
    const rows = [
      slot({ slot: 2, entry_index: 1, champion_key: 20 }),
      slot({ slot: 1, entry_index: 2, champion_key: 10 }),
      slot({ slot: 1, entry_index: 1, champion_key: 11 }),
    ]
    expect(sortSlots(rows).map((row) => row.champion_key)).toEqual([11, 10, 20])
  })
})

describe('sidesSwapped', () => {
  it('is true only for the flag the model sets', () => {
    expect(sidesSwapped(game({ draft_switched_sides: 1 }))).toBe(true)
    expect(sidesSwapped(game({ draft_switched_sides: 0 }))).toBe(false)
    expect(sidesSwapped(game({ draft_switched_sides: null }))).toBe(false)
  })
})

describe('playersByRole', () => {
  it('orders roles the way a draft is read, and keeps unknown roles last', () => {
    const rows = [
      playerGame({ role: 'Support', player_key: 5 }),
      playerGame({ role: 'Mid', player_key: 3 }),
      playerGame({ role: 'Top', player_key: 1 }),
      playerGame({ role: 'Coach', player_key: 9 }),
      playerGame({ role: 'Jungle', player_key: 2 }),
      playerGame({ role: 'Bot', player_key: 4 }),
    ]
    expect(playersByRole(rows, 1, 'blue').map((row) => row.player_key)).toEqual([1, 2, 3, 4, 5, 9])
  })

  it('does not invent order for an unordered draft beyond the role', () => {
    // Two players with the same role keep the order they arrived in.
    const rows = [
      playerGame({ role: 'Top', player_key: 7 }),
      playerGame({ role: 'Top', player_key: 8 }),
    ]
    expect(playersByRole(rows, 1, 'blue').map((row) => row.player_key)).toEqual([7, 8])
  })
})
