import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { namesFor, normalise } from './aliases'
import { appearancesFor, careerFrom } from './career'
import { slotSide } from './draft'
import { winnerKey } from './game'
import { buildSearchIndex, search } from './search'
import type {
  AliasRow,
  Champion,
  DraftSlot,
  Era,
  EventRow,
  Game,
  HonourRow,
  Match,
  Meta,
  Patch,
  Player,
  PlayerGame,
  SelectionCandidate,
  Side,
  Team,
  Totals,
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
const honours = read<HonourRow[]>('honours.json')
const players = read<Player[]>('players.json')
const teams = read<Team[]>('teams.json')
const champions = read<Champion[]>('champions.json')
const sides = read<Side[]>('sides.json')
const patches = read<Patch[]>('patches.json')
const selection = read<SelectionCandidate[]>('selection.json')
const totals = read<Totals[]>('totals.json')
const meta = read<Meta>('meta.json')

/** The JSON kind a field can hold. `null` is handled separately, by the contract. */
type JsonKind = 'string' | 'number' | 'array' | 'object'

/** The fields whose declared type admits null. */
type NullableKeys<T> = { [K in keyof T]-?: null extends T[K] ? K : never }[keyof T]

/** Artifact name to the row type its file carries. */
type ArtifactRows = {
  'aliases.json': AliasRow
  'bans.json': DraftSlot
  'champions.json': Champion
  'eras.json': Era
  'events.json': EventRow
  'games.json': Game
  'honours.json': HonourRow
  'matches.json': Match
  'patches.json': Patch
  'picks.json': DraftSlot
  'player-games.json': PlayerGame
  'players.json': Player
  'selection.json': SelectionCandidate
  'sides.json': Side
  'teams.json': Team
  'totals.json': Totals
}

/**
 * What one artifact promises, field by field.
 *
 * `kinds` names every field of the row type and nothing else, so adding a field to
 * `types.ts` is a compile error here until it is given a kind; the table cannot
 * fall behind the types it checks. `nullable` is the whole of what the artifact
 * may state as null, and it cannot name a field the type says is always there. A
 * field absent from it must hold its kind on every row.
 */
type Contract<T> = {
  rows: readonly T[]
  kinds: Record<keyof T, JsonKind>
  nullable: readonly NullableKeys<T>[]
}

type RuntimeContract = {
  rows: readonly Record<string, unknown>[]
  kinds: Record<string, JsonKind>
  nullable: readonly string[]
}

/**
 * The artifact contract, one entry per published file.
 *
 * The nullable lists are the decisions this audit settled, not a description of
 * whatever the data happened to hold: an unordered draft has no slot, a source can
 * state no wiki page, and an era with no game has no span. Anything else -- a
 * placeholder id, a measure that should have been coalesced -- fails the test.
 */
const CONTRACT = {
  'aliases.json': {
    rows: aliases,
    kinds: {
      kind: 'string',
      alias_string: 'string',
      entity_id: 'string',
      entity_name: 'string',
      valid_from: 'string',
      valid_to: 'string',
      evidence: 'string',
    },
    nullable: ['valid_from', 'valid_to'],
  },
  'bans.json': {
    rows: bans,
    kinds: {
      game_key: 'number',
      side: 'string',
      entry_index: 'number',
      slot: 'number',
      champion_key: 'number',
    },
    // Every ban of the 641 unordered-draft games carries no slot. That is the absence
    // the type now admits; a ban of an ordered draft with no slot would still fail.
    nullable: ['slot'],
  },
  'champions.json': {
    rows: champions,
    kinds: {
      champion_key: 'number',
      champion_id: 'string',
      champion_name: 'string',
      riot_key: 'number',
      games: 'number',
      release_date: 'string',
    },
    // Two champions the wiki names have no row in the model's releases.
    nullable: ['release_date'],
  },
  'eras.json': {
    rows: eras,
    kinds: {
      era: 'string',
      from: 'string',
      cites: 'string',
      eligible_fields: 'number',
      eligible: 'array',
      first_date: 'string',
      last_date: 'string',
      games: 'number',
      series: 'number',
      events: 'number',
      teams: 'number',
      players: 'number',
      blue_wins: 'number',
      red_wins: 'number',
      games_draft_complete: 'number',
      games_player_complete: 'number',
      games_team_complete: 'number',
      games_duration_stated: 'number',
      avg_duration_seconds: 'number',
      patches: 'number',
    },
    // Two declared eras govern no game, so they have no span and nothing to average.
    nullable: ['first_date', 'last_date', 'avg_duration_seconds'],
  },
  'events.json': {
    rows: events,
    kinds: {
      event_key: 'number',
      event_id: 'string',
      event_name: 'string',
      league: 'string',
      competition: 'string',
      region: 'string',
      year: 'number',
      date_start: 'string',
      games: 'number',
      series: 'number',
      teams: 'number',
      players: 'number',
      first_date: 'string',
      last_date: 'string',
      blue_wins: 'number',
      games_duration_stated: 'number',
      avg_duration_seconds: 'number',
      eras: 'string',
      coverage_games: 'number',
      team_complete: 'number',
      draft_complete: 'number',
      player_complete: 'number',
    },
    // WCG 2011 states no league; the two game-less events have no span, no
    // average and no coverage. The counts are coalesced, not null.
    nullable: [
      'league',
      'first_date',
      'last_date',
      'avg_duration_seconds',
      'eras',
      'coverage_games',
      'team_complete',
      'draft_complete',
      'player_complete',
    ],
  },
  'games.json': {
    rows: games,
    kinds: {
      game_key: 'number',
      game_id: 'string',
      event_key: 'number',
      match_key: 'number',
      date_time_utc: 'string',
      era: 'string',
      patch_key: 'number',
      duration_seconds: 'number',
      blue_win: 'number',
      blue_team_key: 'number',
      red_team_key: 'number',
      draft_fidelity: 'string',
      draft_switched_sides: 'number',
      team_stats_coverage: 'string',
      draft_coverage: 'string',
      player_stats_coverage: 'string',
    },
    // match_key and patch_key use 0 for "none stated" and are never null.
    nullable: ['duration_seconds', 'draft_switched_sides'],
  },
  'honours.json': {
    rows: honours,
    kinds: {
      player_key: 'number',
      event_key: 'number',
      team_key: 'number',
      title: 'string',
      type: 'string',
      source_page: 'string',
      place: 'string',
      place_number: 'number',
    },
    // The dictionary says both are empty on every recorded row so far. They are the
    // only fields here the source may leave blank; a team key of 0 is a row, not a null.
    nullable: ['place', 'place_number'],
  },
  'matches.json': {
    rows: matches,
    kinds: {
      match_key: 'number',
      match_id: 'string',
      event_key: 'number',
      match_name: 'string',
      date_time_utc: 'string',
      best_of: 'number',
      tab: 'string',
      is_nullified: 'number',
      forfeit: 'number',
    },
    // No published series states no format; the only nulls are the model's unknown
    // member, which is not published.
    nullable: ['best_of', 'is_nullified', 'forfeit'],
  },
  'patches.json': {
    rows: patches,
    kinds: { patch_key: 'number', patch: 'string', patch_name: 'string' },
    nullable: [],
  },
  'picks.json': {
    rows: picks,
    kinds: {
      game_key: 'number',
      side: 'string',
      entry_index: 'number',
      slot: 'number',
      champion_key: 'number',
    },
    // Stricter than the type on purpose: the pipeline publishes ordered picks only,
    // so a pick with no slot is a defect rather than the absence bans admit.
    nullable: [],
  },
  'player-games.json': {
    rows: playerGames,
    kinds: {
      game_key: 'number',
      player_key: 'number',
      team_key: 'number',
      champion_key: 'number',
      side: 'string',
      role: 'string',
      kills: 'number',
      deaths: 'number',
      assists: 'number',
      cs: 'number',
      gold: 'number',
      damage: 'number',
      vision: 'number',
    },
    nullable: ['cs', 'gold', 'damage', 'vision'],
  },
  'players.json': {
    rows: players,
    kinds: {
      player_key: 'number',
      player_id: 'string',
      player_name: 'string',
      overview_page: 'string',
      games: 'number',
    },
    // 39 players have no wiki overview page; the model does not state one.
    nullable: ['overview_page'],
  },
  'selection.json': {
    rows: selection,
    kinds: {
      id: 'string',
      name: 'string',
      league: 'string',
      region: 'string',
      decision: 'string',
      rule: 'string',
      key: 'string',
    },
    nullable: ['key'],
  },
  'sides.json': {
    rows: sides,
    kinds: {
      game_key: 'number',
      side: 'string',
      team_key: 'number',
      is_winner: 'number',
      kills: 'number',
      gold: 'number',
      towers: 'number',
      inhibitors: 'number',
      barons: 'number',
      dragons: 'number',
      dragons_clouds: 'number',
      dragons_infernals: 'number',
      dragons_mountains: 'number',
      dragons_oceans: 'number',
      dragons_hextechs: 'number',
      dragons_chemtechs: 'number',
      dragons_elders: 'number',
      rift_heralds: 'number',
      void_grubs: 'number',
      atakhans: 'number',
    },
    // Every objective measure can be absent, and null means "not recorded".
    nullable: [
      'kills',
      'gold',
      'towers',
      'inhibitors',
      'barons',
      'dragons',
      'dragons_clouds',
      'dragons_infernals',
      'dragons_mountains',
      'dragons_oceans',
      'dragons_hextechs',
      'dragons_chemtechs',
      'dragons_elders',
      'rift_heralds',
      'void_grubs',
      'atakhans',
    ],
  },
  'teams.json': {
    rows: teams,
    kinds: {
      team_key: 'number',
      team_id: 'string',
      team_name: 'string',
      overview_page: 'string',
      region: 'string',
      games: 'number',
      short_name: 'string',
    },
    // Four zero-game teams state no wiki page and no region; most have no abbreviation.
    nullable: ['overview_page', 'region', 'short_name'],
  },
  'totals.json': {
    rows: totals,
    kinds: {
      games: 'number',
      series: 'number',
      events: 'number',
      teams: 'number',
      players: 'number',
      events_admitted: 'number',
      series_admitted: 'number',
      teams_registered: 'number',
      patches: 'number',
      first_date: 'string',
      last_date: 'string',
      blue_wins: 'number',
    },
    nullable: [],
  },
} satisfies { [File in keyof ArtifactRows]: Contract<ArtifactRows[File]> }

/** The checked table read through a string key, so the loop can iterate it. */
const contracts: Record<string, RuntimeContract> = CONTRACT

/**
 * The contract, enforced over every row of every artifact.
 *
 * A field that is null, missing or of another kind than `types.ts` declares is
 * either a bug in the view or a lie in the type, and this is where the difference
 * is found before a sort or a sum trusts it. The fields a reader may legitimately
 * see absent are listed once, in `nullable` above; everything else must be there.
 */
describe('artifact contract', () => {
  it('states every field as the type declares it, and nulls only where the type says', () => {
    const wrong: string[] = []

    for (const [file, contract] of Object.entries(contracts)) {
      const nullable = new Set(contract.nullable)
      expect(contract.rows.length, `${file} carries no row`).toBeGreaterThan(0)

      contract.rows.forEach((row, index) => {
        for (const [field, expected] of Object.entries(contract.kinds)) {
          const where = `${file}[${index}].${field}`
          const value = row[field]
          if (value === undefined) {
            wrong.push(`${where}: missing`)
            continue
          }
          if (value === null) {
            if (!nullable.has(field)) wrong.push(`${where}: null`)
            continue
          }
          const actual = Array.isArray(value) ? 'array' : typeof value
          if (actual !== expected) wrong.push(`${where}: ${actual}, type declares ${expected}`)
        }
        for (const field of Object.keys(row)) {
          if (!(field in contract.kinds)) wrong.push(`${file}[${index}].${field}: not declared by the type`)
        }
      })
    }

    expect(wrong).toEqual([])
  })

  it('publishes no unknown member, because nothing can resolve one', () => {
    // The model keeps a key-0 row in every dimension so an absent reference has
    // somewhere to point. Those sentinels still appear on the facts (42 games with
    // match_key 0, 279 with patch_key 0), but no artifact names an entity at key 0,
    // and every reader words the sentinel before it consults one of these files.
    // Publishing the row is what used to put null ids under string-typed columns.
    expect(matches.some((row) => row.match_key === 0)).toBe(false)
    expect(teams.some((row) => row.team_key === 0)).toBe(false)
    expect(players.some((row) => row.player_key === 0)).toBe(false)
    expect(champions.some((row) => row.champion_key === 0)).toBe(false)
    expect(patches.some((row) => row.patch_key === 0)).toBe(false)
  })
})

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

describe('games.json and sides.json', () => {
  /**
   * The witness for `winnerKey` that is not a restatement of it.
   *
   * `game.test.ts` compares the predicate against the expression it is written as,
   * which catches drift and not a predicate that is wrong in both places at once.
   * Here the two artifacts are walked together instead: `sides.json` publishes each
   * side's `is_winner`, a column the upstream model states per side and this
   * repository only copies, while `winnerKey` reads the game-level `blue_win`.
   *
   * The two arrive from opposite directions on a red win. `blue_win` is the blue
   * row's flag, so `winnerKey` reaching the red team means naming a team the
   * expression it is checked against never mentions -- the red row is the witness,
   * and a predicate that returned the losing team would agree with itself and
   * disagree with the corpus on all 3,091 games.
   */
  it('names the team whose side row says it won, on every game', () => {
    // One row per game per side, so "the side that says is_winner" must be one
    // side: two would make the witness ambiguous and none would make it silent.
    const winners = new Map<number, number>()
    const twoWinners = new Set<number>()
    for (const side of sides) {
      if (side.is_winner !== 1) continue
      if (winners.has(side.game_key)) twoWinners.add(side.game_key)
      winners.set(side.game_key, side.team_key)
    }
    expect([...twoWinners]).toEqual([])
    expect(winners.size).toBe(games.length)

    const wrong = games
      .filter((game) => winners.get(game.game_key) !== winnerKey(game))
      .map(
        (game) =>
          `${game.game_id}: winnerKey is ${winnerKey(game)}, sides.json says ${winners.get(game.game_key)}`,
      )
    expect(wrong).toEqual([])
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

describe('events.json', () => {
  /**
   * The type says these fields are numbers, so a null here is either a bug in the
   * view or a lie in the type. Two admitted events have no game — WCG 2011 and
   * World Cyber Games 2013 — and their counts were null until the view coalesced
   * them. Nothing rendered wrong, because `Ratio` prints an em dash past a zero
   * total, which is exactly the kind of harmlessness that hides a defect until a
   * sort or a sum trusts the type.
   */
  const counts = ['games', 'series', 'teams', 'players', 'blue_wins', 'games_duration_stated'] as const

  it('states a count for every event, including the ones with no game', () => {
    const gameLess = events.filter((event) => event.games === 0)
    expect(gameLess.length).toBe(2)
    for (const event of events) {
      for (const field of counts) {
        expect(typeof event[field], `${event.event_name}.${field}`).toBe('number')
      }
    }
  })

  it('never claims a blue-side win on a game the event does not have', () => {
    expect(events.filter((event) => event.blue_wins > event.games)).toEqual([])
    expect(events.reduce((sum, event) => sum + event.blue_wins, 0)).toBe(
      games.filter((game) => game.blue_win === 1).length,
    )
  })
})

describe('matches.json', () => {
  /**
   * Admitted is not played: 2,068 series were admitted upstream and 1,964 carry a
   * game. The product spec's D8 states both denominators, so both are pinned here.
   * The model's 2,069 rows include the key-0 sentinel, whose format is empty; no
   * artifact publishes it, which is why the artifact holds 2,068 rows.
   */
  it('carries the admitted series, and the one with no format is not among them', () => {
    expect(matches).toHaveLength(2_068)
    expect(matches.filter((match) => match.best_of === 1)).toHaveLength(1_455)
  })

  it('is best-of-one for 1,389 of the 1,964 played series', () => {
    const played = new Set(games.map((game) => game.match_key).filter((key) => key !== 0))
    expect(played.size).toBe(1_964)
    expect(
      matches.filter((match) => match.best_of === 1 && played.has(match.match_key)),
    ).toHaveLength(1_389)
  })
})

describe('champions.json', () => {
  it('carries the 171 champions the site can resolve', () => {
    // The model's champion dimension has 172 rows: 171 champions and the key-0
    // sentinel, which no artifact publishes. The release pin holds 173 names;
    // Akshan and Briar are pinned there but never played in this corpus, so the
    // champion index does not carry them.
    expect(champions).toHaveLength(171)
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

  it('carries every alias the model recorded, plus the team short names', () => {
    // 3,791 rows from the bridge and the 193 team short names the model states on the
    // team row (dim_team.short). The pin this replaced spelled one team twice and the
    // folded join carried both abbreviations; a column on the row carries one, so "PG"
    // is the one name that disappeared with it.
    expect(aliases).toHaveLength(3_984)
    const byKind = new Map<string, number>()
    for (const row of aliases) byKind.set(row.kind, (byKind.get(row.kind) ?? 0) + 1)
    expect(Object.fromEntries(byKind)).toEqual({ player: 2_872, team: 940, champion: 172 })
  })

  it('points every alias at an entity', () => {
    expect(aliases.filter((row) => !row.entity_id)).toEqual([])
  })

  /**
   * The partition ticket 01 records, measured on the bridge rather than on the
   * published artifact: 193 of the latter's rows are team short names with no
   * window, and leaving them in would make every remainder below describe the
   * wrong set. The folded counts are the module's, not a raw string comparison:
   * "Nunu &amp; Willump" is the entity's own name with an HTML entity in it, and
   * folding is what stops it being printed as a former name.
   */
  it('partitions the pinned bridge into its own names, renames and redirects', () => {
    const bridge = aliases.filter((row) => row.evidence !== 'shortname')
    expect(bridge).toHaveLength(3_791)

    const exact = bridge.filter((row) => row.alias_string === row.entity_name)
    expect(exact).toHaveLength(1_495)

    const own = bridge.filter(
      (row) => normalise(row.alias_string) === normalise(row.entity_name),
    )
    expect(own).toHaveLength(1_652)

    const dated = bridge.filter((row) => row.valid_from !== null || row.valid_to !== null)
    expect(dated).toHaveLength(1_816)
    expect(bridge.filter((row) => row.valid_from === null && row.valid_to === null)).toHaveLength(
      1_975,
    )

    const renames = bridge.filter(
      (row) => normalise(row.alias_string) !== normalise(row.entity_name) && row.valid_from !== null,
    )
    expect(renames).toHaveLength(326)
    expect(
      bridge.filter(
        (row) =>
          normalise(row.alias_string) !== normalise(row.entity_name) && row.valid_from === null,
      ),
    ).toHaveLength(1_813)
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

  it('resolves a team by the one abbreviation the model states', () => {
    // The wiki pin spelled this team twice ('Pain Gaming' -> PG, 'paiN Gaming' ->
    // PAIN) and the pipeline folded the names together. The model states one
    // abbreviation on the team's own row, so "PG" is the single search answer this
    // change moved, and "PAIN" is the one it kept.
    expect(
      search(aliasIndex, 'PAIN').filter((match) => match.kind === 'team')[0],
    ).toMatchObject({ id: 'tm-f642dbf0692c', name: 'paiN Gaming', matched: 'PAIN' })
    expect(search(aliasIndex, 'PG').filter((match) => match.kind === 'team')[0]?.name).not.toBe(
      'paiN Gaming',
    )
  })

  it('calls a short name an abbreviation, never a former name', () => {
    // 78 of the short names appear twice in the artifact -- once as a bridge
    // redirect and once as the short name -- and the redirect sorts first, so this
    // is where "formerly 100T" came from. The index merges the rows; the claim is
    // about every short name, so a later pin that duplicates one cannot bring the
    // label back.
    const wrong = teams
      .filter((team) => team.short_name !== null)
      .map((team) => {
        const match = search(aliasIndex, team.short_name!, 1_000).find(
          (result) => result.kind === 'team' && result.id === team.team_id,
        )
        if (!match || match.current || match.abbreviation) return null
        return `${team.short_name} -> ${match.name} formerly ${match.matched}`
      })
      .filter((row): row is string => row !== null)
    expect(wrong).toEqual([])
  })

  it('finds 100 Thieves, Rogue, Flash Wolves, NaJin Black Sword and Karmine Corp by abbreviation', () => {
    const expected: [string, string][] = [
      ['100t', '100 Thieves'],
      ['rge', 'Rogue'],
      ['fw', 'Flash Wolves'],
      ['njbs', 'NaJin Black Sword'],
      ['kc', 'Karmine Corp'],
    ]
    for (const [query, name] of expected) {
      expect(search(aliasIndex, query).filter((match) => match.kind === 'team')[0], query).toMatchObject(
        { name, current: false, abbreviation: true },
      )
    }
  })

  it('still labels a rename as a former name and keeps the old name findable', () => {
    // The other half of the invariant: merging rows must not turn every alias into
    // an abbreviation, and a team renamed long ago is still reachable by the name
    // it no longer uses.
    expect(search(aliasIndex, 'mad lions')[0]).toMatchObject({
      id: 'tm-d0d4a4d767cd',
      name: 'Movistar KOI',
      matched: 'MAD Lions',
      current: false,
      abbreviation: false,
    })
    expect(search(aliasIndex, 'Splyce')[0]).toMatchObject({
      id: 'tm-d0d4a4d767cd',
      name: 'Movistar KOI',
      abbreviation: false,
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

describe('honours.json', () => {
  it('states one row per player, event and title, in the fact\'s grain order', () => {
    // 24 distinctions over 19 players and 19 events on the v1.2.0 pin. The count is
    // a fact about the pin, so a bump may move it; what must not move is the grain
    // (no duplicate triple) or the order the build promises.
    expect(honours).toHaveLength(24)
    const triples = honours.map((row) => `${row.player_key}-${row.event_key}-${row.title}`)
    expect(new Set(triples).size).toBe(honours.length)

    const order = [...honours].sort(
      (a, b) =>
        a.event_key - b.event_key ||
        a.player_key - b.player_key ||
        a.title.localeCompare(b.title),
    )
    expect(honours).toEqual(order)
  })

  it('resolves every player, every event, and every team it names', () => {
    const playerKeys = new Set(players.map((row) => row.player_key))
    const eventKeys = new Set(events.map((row) => row.event_key))
    const teamKeys = new Set(teams.map((row) => row.team_key))

    expect(honours.filter((row) => !playerKeys.has(row.player_key))).toEqual([])
    expect(honours.filter((row) => !eventKeys.has(row.event_key))).toEqual([])
    // One row names no team (Kiin, Esports World Cup 2025): key 0 is the unknown
    // member, a stated absence, and the pages print nothing for it.
    expect(honours.filter((row) => row.team_key !== 0 && !teamKeys.has(row.team_key))).toEqual([])
    expect(honours.filter((row) => row.team_key === 0)).toHaveLength(1)
  })

  it('keeps the source\'s words and states one award type', () => {
    // Upstream keeps MVP, MSI MVP and Most Valuable Player as three strings on
    // purpose; normalising them here would be the site inventing a vocabulary.
    expect(new Set(honours.map((row) => row.title))).toEqual(
      new Set(['Finals MVP', 'All Pro Team', 'Most Valuable Player', 'MSI MVP', 'MVP', 'Tournament MVP']),
    )
    expect(new Set(honours.map((row) => row.type))).toEqual(new Set(['Season Award']))
  })

  it('has the shape the two pages read: a player with three, an event with six', () => {
    const faker = players.find((row) => row.player_name === 'Faker')!
    const mine = honours.filter((row) => row.player_key === faker.player_key)
    expect(mine).toHaveLength(3)
    expect(mine.map((row) => row.title).sort()).toEqual(
      ['Finals MVP', 'MVP', 'Most Valuable Player'].sort(),
    )

    const msi2016 = events.find((row) => row.event_name === 'MSI 2016')!
    const awards = honours.filter((row) => row.event_key === msi2016.event_key)
    expect(awards).toHaveLength(6)
    expect(awards.filter((row) => row.title === 'All Pro Team')).toHaveLength(5)
    expect(awards.filter((row) => row.title === 'MVP')).toHaveLength(1)
  })
})
