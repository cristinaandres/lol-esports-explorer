import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  AliasRow,
  DraftSlot,
  Champion,
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

/*
 * The site has no backend: every view is answered from committed JSON.
 *
 * Three shapes, chosen by what a page actually renders.
 *
 *  - The eager set is fetched by the first page a reader opens. It is ~53 KB
 *    gzipped (measured, not guessed: `for f in eras events totals meta teams
 *    players champions patches; do gzip -9c public/data/$f.json | wc -c; done`)
 *    and holds what every page needs: eras, events, totals, the pin, and the name of
 *    every team, player, champion and patch for the search in the header. It deliberately holds no game: a game list belongs to an event, and
 *    an era with 1,325 games is read as 26 events.
 *  - The game level is the two artifacts a page that draws games needs -- every
 *    game, and the series they belong to -- fetched once by the pages that render
 *    a game table, a draft board or a series. An era page, the eras index, the
 *    glossary and the selection audit never ask for them; the events index does,
 *    because it derives each event's champion from the games and the series.
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
  teams: Team[]
  players: Player[]
  champions: Champion[]
  patches: Patch[]
}

/** The game-level artifacts, together: the games and the series they belong to. */
export type GameCorpus = {
  games: Game[]
  matches: Match[]
}

export type GameDetail = {
  sides: Side[]
  playerGames: PlayerGame[]
  bans: DraftSlot[]
  picks: DraftSlot[]
}

const base = import.meta.env.BASE_URL

/**
 * One artifact, revalidated rather than trusted.
 *
 * The bundle is content-hashed, so a deploy replaces it instantly; the artifacts keep
 * stable names and Pages serves them with `cache-control: max-age=600`. A reader who
 * visited before a deploy would therefore run the new code against ten-minute-old JSON —
 * which does not fail loudly, it mislabels: every champion files under "Unknown" when the
 * new code asks for a role the old rows do not carry.
 *
 * `no-cache` still stores the answer; it revalidates it against the ETag Pages already
 * sends, so an unchanged file costs one 304 instead of a re-download, and a changed one
 * arrives immediately. Versioned URLs (`?v=<build>`) would be the stricter fix and would
 * make the files immutable; they need the build id in the bundle first, which is more
 * machinery than eight small files justify.
 */
async function getJson<T>(name: string): Promise<T> {
  const response = await fetch(`${base}data/${name}`, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`data/${name}: HTTP ${response.status}`)
  return (await response.json()) as T
}

/**
 * A loader that fetches once, and only remembers an attempt that worked.
 *
 * Pages ask for an artifact every time they need it, so the first answer is kept
 * and handed out again; that is what stops a second page from downloading the
 * same 688 KB. A failure, though, describes the moment and not the file: a dropped
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
    getJson<Team[]>('teams.json'),
    getJson<Player[]>('players.json'),
    getJson<Champion[]>('champions.json'),
    getJson<Patch[]>('patches.json'),
  ]).then(([eras, events, totals, meta, teams, players, champions, patches]) => ({
    eras,
    events,
    totals: totals[0]!,
    meta,
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
 * Every game, on its own.
 *
 * A game list belongs to an event, a series or a career, never to an era: an era
 * with 1,325 games is read as 26 events. So this file is not in the eager set,
 * and the pages that ask for it are the pages that render games.
 */
const games = memoised<Game[]>(() => getJson<Game[]>('games.json'))

export function loadGames(): Promise<Game[]> {
  return games()
}

/** The series those games belong to. Read wherever a page names a series or a title. */
const matches = memoised<Match[]>(() => getJson<Match[]>('matches.json'))

export function loadMatches(): Promise<Match[]> {
  return matches()
}

/**
 * The two game-level artifacts, together.
 *
 * Composed rather than fetched directly, so a page that also calls `loadGames()`
 * on its own (a champion page counts games across the corpus) reuses the same
 * answer instead of asking twice.
 */
const gameCorpus = memoised<GameCorpus>(() =>
  Promise.all([loadGames(), loadMatches()]).then(([games, matches]) => ({ games, matches })),
)

export function loadGameCorpus(): Promise<GameCorpus> {
  return gameCorpus()
}

/**
 * The player rows, on their own.
 *
 * A player page needs 30,910 rows and nothing else; a game page needs them plus
 * the scoreboards and the draft. Loading the smaller set first means a career page
 * costs 688 KB gzip rather than 1,063, and the game page reuses the same promise
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

/**
 * The distinctions the source states, fetched by the pages that print one.
 *
 * 24 rows today -- a person's awards, not a corpus -- so it is small, but it is not
 * in the eager set: a reader on the era spine or an event table has not asked what
 * Faker was named, and the eager set is what every page pays for.
 */
const honourRows = memoised<HonourRow[]>(() => getJson<HonourRow[]>('honours.json'))

export function loadHonours(): Promise<HonourRow[]> {
  return honourRows()
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

/**
 * One attempt, plus the way to start another.
 *
 * The loaders are module-level functions, so a page cannot make one fail again by
 * re-rendering: the same stable function would hand back the same rejected attempt
 * (or, for a cached success, the same answer). `retry` is the state change the
 * effect listens for, and it puts the state back to loading before asking, so the
 * page shows its skeleton for the second attempt rather than the previous error.
 * The loader itself is what makes that attempt a fresh request: `memoised` forgets
 * a rejection as it passes through.
 */
export type AsyncState<T> = Async<T> & { retry: () => void }

export function useAsync<T>(load: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<Async<T>>({ status: 'loading', data: null, error: null })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => {
    setState({ status: 'loading', data: null, error: null })
    setAttempt((count) => count + 1)
  }, [])

  useEffect(() => {
    let live = true
    load().then(
      (data) => live && setState({ status: 'ready', data, error: null }),
      (error: Error) => live && setState({ status: 'failed', data: null, error }),
    )
    return () => {
      live = false
    }
  }, [load, attempt])

  // The same object between renders while the state is unchanged. `{ ...state }`
  // alone is a new identity on every render, so a caller's `useMemo(() => …, [hook])`
  // could never hit: the memos that derive a player's appearances over 30,910 rows,
  // or the corpus champions over 3,091 games, ran again on every keystroke of a
  // filter that changes neither.
  return useMemo(() => ({ ...state, retry }), [state, retry])
}

export function useDataset(): AsyncState<Dataset> {
  return useAsync(loadDataset)
}

export function useGames(): AsyncState<Game[]> {
  return useAsync(loadGames)
}

export function useGameCorpus(): AsyncState<GameCorpus> {
  return useAsync(loadGameCorpus)
}

export function useGameDetail(): AsyncState<GameDetail> {
  return useAsync(loadGameDetail)
}

export function usePlayerGames(): AsyncState<PlayerGame[]> {
  return useAsync(loadPlayerGames)
}

export function useBans(): AsyncState<DraftSlot[]> {
  return useAsync(loadBans)
}

export function useAliases(): AsyncState<AliasRow[]> {
  return useAsync(loadAliases)
}

export function useHonours(): AsyncState<HonourRow[]> {
  return useAsync(loadHonours)
}

export function useSelection(): AsyncState<SelectionCandidate[]> {
  return useAsync(loadSelection)
}
