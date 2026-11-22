import type { Game } from './types'

/**
 * Reading one game's result.
 *
 * A game is two sides and one flag. The flag is the source of truth for who won:
 * the facts carry no running score, so the winner cannot be read off a
 * scoreboard, and the side a team was on is not the same question as whether it
 * won.
 */

/** The fields a game's result is read from, so a partial row can be passed in. */
export type GameResult = Pick<Game, 'blue_win' | 'blue_team_key' | 'red_team_key'>

/**
 * The team that won a game.
 *
 * `blue_win` is 1 for a blue-side win and 0 for a red-side win, so the winner is
 * whichever side the flag names. This returns a team key, not a side: the title
 * list, a series tally and a game page all need the team, and a boolean would
 * make every caller turn it back into a key.
 *
 * Nothing here relies on the two sides being different teams, but the corpus
 * never fields the same team on both sides (asserted over all 3,091 rows in
 * `game.test.ts`), so the answer is one team rather than a choice between two.
 */
export function winnerKey(game: GameResult): number {
  return game.blue_win === 1 ? game.blue_team_key : game.red_team_key
}
