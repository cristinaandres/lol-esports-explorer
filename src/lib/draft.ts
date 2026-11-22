import type { DraftSlot, Game, PlayerGame } from './types'

/**
 * Reading a draft, and being honest about how much of it the source stated.
 *
 * The corpus has three cases and the page must not blur them:
 *
 *  - 'ordered'   the source recorded which pick happened when (2,450 games)
 *  - 'unordered' the champions are known but the order is not (641 games)
 *  - 'none'      the game had no pick-ban phase at all
 *
 * An unordered draft is never sorted into a plausible-looking order: the order of
 * the champions on screen would then be a claim the data does not support.
 */

export type DraftState = 'ordered' | 'unordered' | 'none'

/**
 * Which of the three cases this game is in.
 *
 * The presence of player rows decides whether a draft exists at all, not the
 * presence of slot rows: picks.json carries ordered picks only, so an unordered
 * draft with no recorded bans would have zero slots and would be misread as a
 * game played without a pick-ban phase. Every one of the 3,091 games in the
 * corpus has player rows, and the three 2020 Mid-Season Cup blind-pick games have
 * neither picks nor bans -- their champions are known from the player rows alone,
 * which is what makes them a draft recorded without bans.
 */
export function readDraftState(game: Game, playerRowCount: number): DraftState {
  if (playerRowCount === 0) return 'none'
  return game.draft_fidelity === 'ordered' ? 'ordered' : 'unordered'
}

/**
 * Sort by the slot, which is the position within the phase, falling back to the
 * order the source wrote the rows in.
 *
 * A null slot is not position zero. It means the source recorded the champion but
 * not when it was taken, which is every ban of the 641 unordered-draft games, so
 * comparing slots arithmetically would sort those bans first on a claim the data
 * does not make. Nulls are ordered explicitly, after every recorded slot and among
 * themselves by entry_index -- the order the source wrote them in. They agree for
 * every ordered draft in the corpus; the second key keeps the sort total.
 */
export function sortSlots(slots: DraftSlot[]): DraftSlot[] {
  return [...slots].sort((a, b) => {
    if (a.slot !== b.slot) {
      if (a.slot === null) return 1
      if (b.slot === null) return -1
      return a.slot - b.slot
    }
    return a.entry_index - b.entry_index
  })
}

/** True when the source says the draft was listed with the two sides swapped. */
export function sidesSwapped(game: Game): boolean {
  return game.draft_switched_sides === 1
}

/**
 * Which side of the draft table to read, to draw one side of the scoreboard.
 *
 * 250 games in the corpus state their draft with the two sides exchanged: the
 * slot rows labelled 'blue' belong to the team the scoreboard calls red. Reading
 * the flag is not cosmetic. Without it, 2,506 picks land on the wrong side, and
 * only 0 of them match a player row once it is read.
 */
export function slotSide(displaySide: 'blue' | 'red', swapped: boolean): 'blue' | 'red' {
  if (!swapped) return displaySide
  return displaySide === 'blue' ? 'red' : 'blue'
}

export function slotsFor(
  slots: DraftSlot[],
  gameKey: number,
  side: 'blue' | 'red',
  swapped = false,
): DraftSlot[] {
  const wanted = slotSide(side, swapped)
  return sortSlots(slots.filter((slot) => slot.game_key === gameKey && slot.side === wanted))
}

/**
 * Role order, used only to read an unordered draft's champion list stably.
 *
 * A role is recorded for every player row in the corpus (30,910 of 30,910), which
 * is why it is usable as a display order at all. It is an order for reading, not
 * a claim about the draft, and the board says so.
 */
export const ROLE_ORDER = ['Top', 'Jungle', 'Mid', 'Bot', 'Support'] as const

export function playersByRole(
  playerGames: PlayerGame[],
  gameKey: number,
  side: 'blue' | 'red',
): PlayerGame[] {
  const order = new Map<string, number>(ROLE_ORDER.map((role, index) => [role, index]))
  return playerGames
    .filter((row) => row.game_key === gameKey && row.side === side)
    .sort((a, b) => (order.get(a.role) ?? 99) - (order.get(b.role) ?? 99))
}
