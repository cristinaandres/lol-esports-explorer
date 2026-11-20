import { useEffect, useState } from 'react'

import type {
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
 *  - The lazy set is fetched the first time somebody opens a game, and kept for
 *    the session. It is ~950 KB gzipped: the scoreboards, 30,910 player rows and
 *    every draft slot. A visitor who only reads an era never pays for it.
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

let eager: Promise<Dataset> | null = null

export function loadDataset(): Promise<Dataset> {
  eager ??= Promise.all([
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
  }))
  return eager
}

let detail: Promise<GameDetail> | null = null

export function loadGameDetail(): Promise<GameDetail> {
  detail ??= Promise.all([
    getJson<Side[]>('sides.json'),
    getJson<PlayerGame[]>('player-games.json'),
    getJson<DraftSlot[]>('bans.json'),
    getJson<DraftSlot[]>('picks.json'),
  ]).then(([sides, playerGames, bans, picks]) => ({ sides, playerGames, bans, picks }))
  return detail
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
