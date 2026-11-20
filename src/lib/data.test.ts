import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { namesFor, resolve } from './aliases'
import { slotSide } from './draft'
import type { AliasRow, DraftSlot, EventRow, Game, Match, PlayerGame } from './types'

/**
 * Invariants over the committed artifacts, not over a fixture.
 *
 * Every assertion here is a claim the site makes to a reader. A fixture test
 * proves the code reads data correctly; these prove the data is what the pages
 * assume it is, and they run against the same bytes the browser downloads.
 */

const read = <T,>(name: string): T =>
  JSON.parse(readFileSync(join(import.meta.dirname, '../../public/data', name), 'utf-8')) as T

const games = read<Game[]>('games.json')
const events = read<EventRow[]>('events.json')
const matches = read<Match[]>('matches.json')
const playerGames = read<PlayerGame[]>('player-games.json')
const picks = read<DraftSlot[]>('picks.json')
const bans = read<DraftSlot[]>('bans.json')
const aliases = read<AliasRow[]>('aliases.json')

describe('games.json', () => {
  it('carries every game exactly once', () => {
    expect(games).toHaveLength(3_091)
    expect(new Set(games.map((game) => game.game_key)).size).toBe(3_091)
  })

  it('points every game at an event the site can render', () => {
    const known = new Set(events.map((event) => event.event_key))
    expect(games.filter((game) => !known.has(game.event_key))).toEqual([])
  })

  it('points every game at a series, or at none', () => {
    const known = new Set(matches.map((match) => match.match_key))
    const missing = games.filter((game) => game.match_key !== 0 && !known.has(game.match_key))
    expect(missing).toEqual([])
  })

  it('keeps the 42 series-less games rather than dropping them', () => {
    expect(games.filter((game) => game.match_key === 0)).toHaveLength(42)
  })

  it('states two sides for every game', () => {
    expect(games.filter((game) => !game.blue_team_key || !game.red_team_key)).toEqual([])
  })

  it('declares 641 drafts with no recorded pick order', () => {
    expect(games.filter((game) => game.draft_fidelity === 'unordered')).toHaveLength(641)
  })

  it('keeps dates in the ISO form the site parses', () => {
    const malformed = games.filter((game) => !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(game.date_time_utc))
    expect(malformed).toEqual([])
  })
})

describe('draft artifacts', () => {
  it('puts every ordered pick in the corpus in picks.json', () => {
    const ordered = games.filter((game) => game.draft_fidelity === 'ordered')
    expect(ordered).toHaveLength(2_450)
    expect(new Set(picks.map((slot) => slot.game_key)).size).toBe(2_450)
    expect(picks).toHaveLength(24_500)
  })

  it('never carries a pick for a draft whose order was not recorded', () => {
    const byKey = new Map(games.map((game) => [game.game_key, game]))
    const stray = picks.filter((slot) => byKey.get(slot.game_key)?.draft_fidelity !== 'ordered')
    expect(stray).toEqual([])
  })

  /**
   * The invariant that matters, and the one that caught a real bug.
   *
   * 250 games state their draft with the two sides exchanged, flagged by
   * draft_switched_sides. Read without the flag, 2,506 picks point at the wrong
   * side; read with it, every pick names a champion one of that side's players
   * actually played. There is no tolerance in this test on purpose.
   */
  it('gives every pick to the side that actually played the champion', () => {
    const byKey = new Map(games.map((game) => [game.game_key, game]))
    const played = new Set(
      playerGames.map((row) => `${row.game_key}|${row.side}|${row.champion_key}`),
    )

    const wrong = picks.filter((slot) => {
      const game = byKey.get(slot.game_key)
      if (!game) return true
      const side = slotSide(slot.side, game.draft_switched_sides === 1)
      return !played.has(`${slot.game_key}|${side}|${slot.champion_key}`)
    })

    expect(wrong).toHaveLength(0)
  })

  it('never bans a champion the same side picked', () => {
    const byKey = new Map(games.map((game) => [game.game_key, game]))
    const picked = new Set(
      picks.map((slot) => {
        const side = slotSide(slot.side, byKey.get(slot.game_key)?.draft_switched_sides === 1)
        return `${slot.game_key}|${side}|${slot.champion_key}`
      }),
    )

    const colliding = bans.filter((slot) => {
      const side = slotSide(slot.side, byKey.get(slot.game_key)?.draft_switched_sides === 1)
      return picked.has(`${slot.game_key}|${side}|${slot.champion_key}`)
    })

    expect(colliding).toHaveLength(0)
  })

  it('records bans for 3,088 of the 3,091 games', () => {
    expect(new Set(bans.map((slot) => slot.game_key)).size).toBe(3_088)
  })
})

describe('aliases.json', () => {
  it('carries every alias the model recorded', () => {
    expect(aliases).toHaveLength(3_791)
    const byKind = new Map<string, number>()
    for (const row of aliases) byKind.set(row.kind, (byKind.get(row.kind) ?? 0) + 1)
    expect(Object.fromEntries(byKind)).toEqual({ player: 2_872, team: 747, champion: 172 })
  })

  it('points every alias at an entity', () => {
    expect(aliases.filter((row) => !row.entity_id)).toEqual([])
  })

  /**
   * The case the review named, against the real bridge rather than a fixture:
   * four spellings of one organisation, and a fifth team that only rhymes.
   */
  it('resolves every name Movistar KOI played under to one team', () => {
    for (const name of ['MAD Lions', 'MAD Lions KOI', 'Mad Lions', 'MKOI', 'Movistar KOI']) {
      const matches = resolve(aliases, name).filter((match) => match.kind === 'team')
      expect(matches.map((match) => match.entityId), name).toEqual(['tm-d0d4a4d767cd'])
      expect(matches[0]?.entityName, name).toBe('Movistar KOI')
    }
  })

  it('keeps MAD Team a different organisation', () => {
    const matches = resolve(aliases, 'MAD Team').filter((match) => match.kind === 'team')
    expect(matches.map((match) => match.entityId)).toEqual(['tm-017ed54b4572'])
    expect(matches[0]?.entityName).toBe('MAD Team')
  })

  it('lists the dated names it played under, and no redirects', () => {
    expect(namesFor(aliases, 'team', 'tm-d0d4a4d767cd').map((row) => row.alias_string)).toEqual([
      'Splyce',
      'MAD Lions',
      'MAD Lions KOI',
    ])
  })

  it('really does contain names two entities share', () => {
    // Not a defect: short handles collide. It is why resolve returns a list.
    const matches = resolve(aliases, 'APA').filter((match) => match.kind === 'player')
    expect(matches.length).toBeGreaterThan(1)
  })
})

describe('player-games.json', () => {
  it('carries one row per player per game', () => {
    expect(playerGames).toHaveLength(30_910)
  })

  it('gives every player row a role and a champion', () => {
    const incomplete = playerGames.filter((row) => !row.role || !row.champion_key)
    expect(incomplete).toEqual([])
  })

  it('keeps an absent measure absent rather than zero', () => {
    // 15,040 of 30,910 rows carry no damage figure. The site renders those as an
    // em dash; a zero would be a measurement nobody made.
    expect(playerGames.filter((row) => row.damage === null)).toHaveLength(15_040)
  })
})
