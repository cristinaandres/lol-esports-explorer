import type { Appearance } from './career'

/**
 * The game a reader arrived from.
 *
 * `?from=game:<id>` is a hint, not a parent: a player page is a valid destination
 * on its own, and the parameter only adds a block and a way back. That is why a
 * stale or unknown id degrades to the plain career view instead of erroring — the
 * reader still gets the page they asked for.
 *
 * The id is the natural one, `game_id`, because the surrogate key is build-local
 * and a shared link carrying it would point at a different game after a rebuild.
 */

const PREFIX = 'game:'

/** The game id in a query string, or null. Accepts the prefix or a bare id. */
export function parseFrom(search: URLSearchParams): string | null {
  const raw = search.get('from')
  if (!raw) return null
  const id = raw.startsWith(PREFIX) ? raw.slice(PREFIX.length) : raw
  return id.length > 0 ? id : null
}

/**
 * The appearance for the game the reader came from.
 *
 * Resolved against the player's own appearances, so a game they did not play
 * cannot produce a context block: the parameter says where the reader came from,
 * and this is the check that the story is true.
 */
export function contextFor(appearances: Appearance[], gameId: string | null): Appearance | null {
  if (!gameId) return null
  return appearances.find((appearance) => appearance.game.game_id === gameId) ?? null
}

/** How the context is written into a link. */
export function fromParam(gameId: string): string {
  return `${PREFIX}${gameId}`
}
