import { useEffect, useState } from 'react'

import type {
  AliasRow,
  DraftSlot,
  Champion,
  Era,
  EventRow,
  Game,
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

/*
 * The site has no backend: every view is answered from committed JSON.
 *
 * Two load shapes, on purpose.
 *
 *  - The eager set is fetched by the first page a reader opens. It is ~120 KB
 *    gzipped and holds everything a list needs: eras, events, games, and the
 *    name of every team, player, champion and patch.
 *  - The lazy set is fetched in pieces, each once per session, by the pages that
 *    read it: the 30,910 player rows for any career, the bans for a champion, and
 *    the scoreboards plus the ordered picks only for a game. A visitor who reads
 *    an era never pays for any of it, and a champion page never pays for the
 *    draft board it does not render.
 *
 * "Kept for the session" is a promise about a successful load, not about a
 * failed one. A rejection is forgotten as it passes through, so the next page
 * that needs the artifact asks the server again instead of replaying the error
 * for as long as the tab is open. See `memoised`.
 */

export type Dataset = {
  eras: Era[]
  events: EventRow[]
  totals: Totals
  meta: Meta
  games: Game[]
  matches: Match[]
  teams: Team[]
  players: Player[]
  champions: Champion[]
  patches: Patch[]
}

export type GameDetail = {
  sides: Side[]
  playerGames: PlayerGame[]
  bans: DraftSlot[]
  picks: DraftSlot[]
}

const base = import.meta.env.BASE_URL

async function getJson<T>(name: string): Promise<T> {
  const response = await fetch(`${base}data/${name}`)
  if (!response.ok) throw new Error(`data/${name}: HTTP ${response.status}`)
  return (await response.json()) as T
}

/**
 * A loader that fetches once, and only remembers an attempt that worked.
 *
 * Pages ask for an artifact every time they need it, so the first answer is kept
 * and handed out again; that is what stops three pages from downloading the same
 * 620 KB. A failure, though, describes the moment and not the file: a dropped
 * connection, a flaky deploy or a network that is briefly down must not become
 * permanent for the document. Clearing the slot before rethrowing means the next
 * caller starts a fresh request, while a success stays cached for the session.
 */
function memoised<T>(load: () => Promise<T>): () => Promise<T> {
  let kept: Promise<T> | null = null

  return () => {
    kept ??= load().catch((error: unknown) => {
      kept = null
      throw error
    })
    return kept
  }
}

const eager = memoised<Dataset>(() =>
  Promise.all([
    getJson<Era[]>('eras.json'),
    getJson<EventRow[]>('events.json'),
    getJson<Totals[]>('totals.json'),
    getJson<Meta>('meta.json'),
    getJson<Game[]>('games.json'),
    getJson<Match[]>('matches.json'),
    getJson<Team[]>('teams.json'),
    getJson<Player[]>('players.json'),
    getJson<Champion[]>('champions.json'),
    getJson<Patch[]>('patches.json'),
  ]).then(([eras, events, totals, meta, games, matches, teams, players, champions, patches]) => ({
    eras,
    events,
    totals: totals[0]!,
    meta,
    games,
    matches,
    teams,
    players,
    champions,
    patches,
  })),
)

export function loadDataset(): Promise<Dataset> {
  return eager()
}

/**
 * The player rows, on their own.
 *
 * A player page needs 30,910 rows and nothing else; a game page needs them plus
 * the scoreboards and the draft. Loading the smaller set first means a career page
 * costs 620 KB gzip rather than 950, and the game page reuses the same promise
 * instead of fetching the file twice.
 */
const playerRows = memoised<PlayerGame[]>(() => getJson<PlayerGame[]>('player-games.json'))

export function loadPlayerGames(): Promise<PlayerGame[]> {
  return playerRows()
}

/** The two scoreboards per game, read only by the game page. */
const sideRows = memoised<Side[]>(() => getJson<Side[]>('sides.json'))

export function loadSides(): Promise<Side[]> {
  return sideRows()
}

/**
 * Every ban in the corpus, ordered drafts or not.
 *
 * A champion page counts bans to know how often the champion was denied, and
 * reads no pick: the ordered draft board belongs to the game page.
 */
const banRows = memoised<DraftSlot[]>(() => getJson<DraftSlot[]>('bans.json'))

export function loadBans(): Promise<DraftSlot[]> {
  return banRows()
}

/** The ordered picks, which only a game page's draft board reads. */
const pickRows = memoised<DraftSlot[]>(() => getJson<DraftSlot[]>('picks.json'))

export function loadPicks(): Promise<DraftSlot[]> {
  return pickRows()
}

/** The candidate events the rule considered, fetched only by the selection page. */
const selectionRows = memoised<SelectionCandidate[]>(() =>
  getJson<SelectionCandidate[]>('selection.json'),
)

export function loadSelection(): Promise<SelectionCandidate[]> {
  return selectionRows()
}

/** The alias bridge, fetched by entity pages and by search, never by a list. */
const aliasRows = memoised<AliasRow[]>(() => getJson<AliasRow[]>('aliases.json'))

export function loadAliases(): Promise<AliasRow[]> {
  return aliasRows()
}

/**
 * The scoreboards, the player rows and the draft of one game, together.
 *
 * Composed from the per-artifact loaders rather than fetched directly, so a
 * reader who arrives from a career or a champion page reuses the rows it already
 * paid for instead of asking a second time. Composing is also what keeps a retry
 * honest: each piece owns its own slot and forgets its own failure, so a game
 * page that failed while the scoreboards were unreachable asks again for every
 * piece rather than one.
 */
const detail = memoised<GameDetail>(() =>
  Promise.all([loadSides(), loadPlayerGames(), loadBans(), loadPicks()]).then(
    ([sides, playerGames, bans, picks]) => ({ sides, playerGames, bans, picks }),
  ),
)

export function loadGameDetail(): Promise<GameDetail> {
  return detail()
}

export type Async<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: T; error: null }
  | { status: 'failed'; data: null; error: Error }

export function useAsync<T>(load: () => Promise<T>): Async<T> {
  const [state, setState] = useState<Async<T>>({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let live = true
    load().then(
      (data) => live && setState({ status: 'ready', data, error: null }),
      (error: Error) => live && setState({ status: 'failed', data: null, error }),
    )
    return () => {
      live = false
    }
  }, [load])

  return state
}

export function useDataset(): Async<Dataset> {
  return useAsync(loadDataset)
}

export function useGameDetail(): Async<GameDetail> {
  return useAsync(loadGameDetail)
}

export function usePlayerGames(): Async<PlayerGame[]> {
  return useAsync(loadPlayerGames)
}

export function useBans(): Async<DraftSlot[]> {
  return useAsync(loadBans)
}

export function useAliases(): Async<AliasRow[]> {
  return useAsync(loadAliases)
}

export function useSelection(): Async<SelectionCandidate[]> {
  return useAsync(loadSelection)
}
