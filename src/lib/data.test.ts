import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { namesFor } from './aliases'
import { appearancesFor, careerFrom } from './career'
import { slotSide } from './draft'
import { buildSearchIndex, search } from './search'
import type {
  AliasRow,
  Champion,
  DraftSlot,
  Era,
  EventRow,
  Game,
  Match,
  Meta,
  Player,
  PlayerGame,
  Team,
} from './types'

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
const eras = read<Era[]>('eras.json')
const events = read<EventRow[]>('events.json')
const matches = read<Match[]>('matches.json')
const playerGames = read<PlayerGame[]>('player-games.json')
const picks = read<DraftSlot[]>('picks.json')
const bans = read<DraftSlot[]>('bans.json')
const aliases = read<AliasRow[]>('aliases.json')
const players = read<Player[]>('players.json')
const teams = read<Team[]>('teams.json')
const champions = read<Champion[]>('champions.json')
const meta = read<Meta>('meta.json')

describe('meta.json', () => {
  it('records the manifest that the pin states the hash of', () => {
    // The manifest is the upstream build's receipts. Its hash lived in source.json
    // and was compared against nothing while the file itself was not committed.
    expect(meta.upstreamFiles['manifest.json']).toBe(meta.source.manifestSha256)
    expect(meta.source.manifestSha256).toMatch(/^[0-9a-f]{64}$/)
  })

  it('records the pinned files that a *.csv glob missed', () => {
    // The document called the dictionary and the DDL pinned; the hash map covered
    // only the CSVs, so two pinned files were recorded nowhere. Presence is the
    // claim under test, not a particular digest: the pin moves, the rule does not.
    for (const name of ['data-dictionary.md', 'schema.sql']) {
      expect(meta.modelFiles[name], name).toMatch(/^[0-9a-f]{64}$/)
    }
  })
})

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

describe('eras.json', () => {
  /**
   * The average length on the era and event pages is the one figure said to be
   * measured over a row set the page did not state. It now prints its n; this pins
   * that n to the rows it claims, so widening the filter in the SQL fails here.
   */
  it('counts the games that state a duration, and only those', () => {
    const stated = eras.reduce((sum, era) => sum + era.games_duration_stated, 0)
    expect(stated).toBe(games.filter((game) => game.duration_seconds !== null).length)
    expect(stated).toBe(3_084)
  })

  it('never claims a duration on a game the era does not have', () => {
    expect(eras.filter((era) => era.games_duration_stated > era.games)).toEqual([])
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
  // The index the search box builds, so these assertions test the path a reader
  // actually uses rather than a second lookup that only the tests call.
  const aliasIndex = buildSearchIndex(players, teams, champions, aliases)

  it('carries every alias the model recorded, plus the pinned short names', () => {
    // 3,791 rows from the bridge and all 194 team short names pinned from the wiki.
    // The pin states one of them against a spelling the model does not use ('Pain
    // Gaming' for 'paiN Gaming'); the join folds names, so it is carried rather than
    // dropped, and the build fails instead of losing a row like it.
    expect(aliases).toHaveLength(3_985)
    const byKind = new Map<string, number>()
    for (const row of aliases) byKind.set(row.kind, (byKind.get(row.kind) ?? 0) + 1)
    expect(Object.fromEntries(byKind)).toEqual({ player: 2_872, team: 941, champion: 172 })
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
      const matches = search(aliasIndex, name).filter((match) => match.kind === 'team')
      expect(matches.map((match) => match.id), name).toEqual(['tm-d0d4a4d767cd'])
      expect(matches[0]?.name, name).toBe('Movistar KOI')
    }
  })

  it('keeps MAD Team a different organisation', () => {
    const matches = search(aliasIndex, 'MAD Team').filter((match) => match.kind === 'team')
    expect(matches.map((match) => match.id)).toEqual(['tm-017ed54b4572'])
    expect(matches[0]?.name).toBe('MAD Team')
  })

  it('resolves a team by the short name people use', () => {
    expect(search(aliasIndex, 'KC').filter((m) => m.kind === 'team')[0]).toMatchObject({
      name: 'Karmine Corp',
      matched: 'KC',
    })
    expect(search(aliasIndex, 'GEN').filter((m) => m.kind === 'team')[0]?.name).toBe('Gen.G')
    expect(search(aliasIndex, 'BLG').filter((m) => m.kind === 'team')[0]?.name).toBe(
      'Bilibili Gaming',
    )
  })

  it('resolves PG, pinned against a spelling the model does not use', () => {
    // The pin states 'Pain Gaming' -> PG; the model calls the team 'paiN Gaming'. The
    // pipeline joins those names folded, so the abbreviation resolves instead of
    // vanishing, and the team keeps the short name the model's own spelling states.
    expect(search(aliasIndex, 'PG').filter((match) => match.kind === 'team')[0]).toMatchObject({
      id: 'tm-f642dbf0692c',
      name: 'paiN Gaming',
      matched: 'PG',
    })
  })

  it('lists the dated names it played under, and no redirects', () => {
    expect(namesFor(aliases, 'team', 'tm-d0d4a4d767cd').map((row) => row.alias_string)).toEqual([
      'Splyce',
      'MAD Lions',
      'MAD Lions KOI',
    ])
  })

  it('does not print the current name of a champion, only the one it replaced', () => {
    const nunu = aliases.find((row) => row.entity_name === 'Nunu & Willump')
    expect(nunu).toBeDefined()
    expect(namesFor(aliases, 'champion', nunu!.entity_id).map((row) => row.alias_string)).toEqual([
      'Nunu',
    ])
  })

  it('really does contain names two entities share', () => {
    // Not a defect: short handles collide. It is why search returns one result per
    // entity and not one per name.
    const matches = search(aliasIndex, 'APA').filter((match) => match.kind === 'player')
    expect(matches.length).toBeGreaterThan(1)
  })
})

describe('career aggregation', () => {
  const faker = players.find((row) => row.player_name === 'Faker')!

  /**
   * The cross-check the phase 3 spec asks for: the browser's answer and the
   * pipeline's answer to the same question, against the same bytes.
   *
   * The SQL is:
   *   select count(*), round((sum(kills)+sum(assists))/nullif(sum(deaths),0), 2)
   *   from fact_player_game where player_key = 753
   */
  it('matches SQL for the most-modelled player in the corpus', () => {
    const career = careerFrom(appearancesFor(games, playerGames, faker.player_key))

    expect(career.games).toBe(410)
    expect(career.wins + career.losses).toBe(410)
    expect(Number(career.kda!.toFixed(2))).toBe(4.11)
    expect(career.kills).toBe(1_484)
    expect(career.deaths).toBe(947)
    expect(career.assists).toBe(2_407)
  })

  it('averages a measure over the rows that state it', () => {
    const career = careerFrom(appearancesFor(games, playerGames, faker.player_key))
    // 248 of Faker's 410 rows state damage; the rest would otherwise divide the
    // average down towards zero.
    expect(career.measures.damage.measured).toBe(248)
    expect(career.measures.damage.average).toBeCloseTo(career.measures.damage.sum / 248, 6)
  })

  it('gives a player who appears once a career of one game', () => {
    const counts = new Map<number, number>()
    for (const row of playerGames) counts.set(row.player_key, (counts.get(row.player_key) ?? 0) + 1)
    const [key] = [...counts.entries()].find(([, n]) => n === 1)!
    const career = careerFrom(appearancesFor(games, playerGames, key))

    expect(career.games).toBe(1)
    expect(career.kda).not.toBeNull()
    expect(career.wins + career.losses).toBe(1)
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
