import type { Dataset } from './data'
import type { Champion, EventRow, Patch, Player, Team } from './types'

/**
 * Key-to-row maps, built once per dataset.
 *
 * Every page resolves a foreign key to a name, and a linear scan per cell would
 * turn a 3,091-row table into 3,091 searches. The map is built once and reused;
 * an unknown key renders as "Unknown", never as an empty string, so a missing
 * reference is visible rather than silent.
 */
export type Indexes = {
  teams: Map<number, Team>
  players: Map<number, Player>
  champions: Map<number, Champion>
  patches: Map<number, Patch>
  events: Map<number, EventRow>
  /** The canonical competition of an event ('Worlds', 'MSI', ...), read once per dataset. */
  competitions: Map<number, string>
}

const UNKNOWN = 'Unknown'

export function buildIndexes(dataset: Dataset): Indexes {
  return {
    teams: new Map(dataset.teams.map((row) => [row.team_key, row])),
    players: new Map(dataset.players.map((row) => [row.player_key, row])),
    champions: new Map(dataset.champions.map((row) => [row.champion_key, row])),
    patches: new Map(dataset.patches.map((row) => [row.patch_key, row])),
    events: new Map(dataset.events.map((row) => [row.event_key, row])),
    competitions: new Map(dataset.events.map((row) => [row.event_key, row.competition])),
  }
}

export function teamName(index: Indexes, key: number): string {
  if (key === 0) return UNKNOWN
  return index.teams.get(key)?.team_name || UNKNOWN
}

export function playerName(index: Indexes, key: number): string {
  if (key === 0) return UNKNOWN
  return index.players.get(key)?.player_name || UNKNOWN
}

export function championName(index: Indexes, key: number): string {
  if (key === 0) return UNKNOWN
  return index.champions.get(key)?.champion_name || UNKNOWN
}

/**
 * The route for a player, or null when the key names nobody.
 *
 * The route uses the natural id, never the surrogate key: surrogate keys are
 * build-local and would break every shared link on the next rebuild.
 */
export function playerPath(index: Indexes, key: number): string | null {
  const player = index.players.get(key)
  return player ? `/players/${player.player_id}` : null
}

/** The route for a team, or null when the key names none. */
export function teamPath(index: Indexes, key: number): string | null {
  const team = index.teams.get(key)
  return team ? `/teams/${team.team_id}` : null
}

/** The route for a champion, or null when the key names none. */
export function championPath(index: Indexes, key: number): string | null {
  const champion = index.champions.get(key)
  return champion ? `/champions/${champion.champion_id}` : null
}

/** The patch string, or an em dash when the source stated none. */
export function patchLabel(index: Indexes, key: number): string {
  if (key === 0) return '—'
  return index.patches.get(key)?.patch || '—'
}
