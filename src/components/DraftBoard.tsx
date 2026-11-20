import { useMemo } from 'react'

import { playersByRole, readDraftState, sidesSwapped, slotsFor } from '../lib/draft'
import { Link } from 'react-router'

import { championName, championPath, type Indexes } from '../lib/indexes'
import type { DraftSlot, Game, PlayerGame } from '../lib/types'

/**
 * The draft, drawn only as far as the source recorded it.
 *
 * Three facts shape this component, all measured on the corpus:
 *
 *  - 2,450 drafts state an order, 641 do not. For the second group the champion
 *    list is drawn in role order and the board says so; it is not sorted into a
 *    plausible pick order the data cannot support.
 *  - bans range from 0 to 10 a game. Zero is not "no bans happened", it is "the
 *    wiki recorded none", so the column says so instead of showing an empty grid.
 *  - picks range from 8 to 10, because some games are missing player rows. The
 *    board never pads to five.
 */
export function DraftBoard({
  game,
  picks,
  bans,
  playerGames,
  index,
}: {
  game: Game
  picks: DraftSlot[]
  bans: DraftSlot[]
  playerGames: PlayerGame[]
  index: Indexes
}) {
  const gamePicks = useMemo(() => picks.filter((slot) => slot.game_key === game.game_key), [picks, game.game_key])
  const gameBans = useMemo(() => bans.filter((slot) => slot.game_key === game.game_key), [bans, game.game_key])
  const state = readDraftState(game, playerGames.length)

  if (state === 'none') {
    return (
      <section className="border-line bg-ink-900 rounded-xl border p-5">
        <h2 className="text-fog-100 text-sm font-semibold tracking-tight">Draft</h2>
        <p className="text-fog-300 mt-2 text-sm">
          This game has no recorded pick-ban phase. The source carries no draft slots for it, which
          is different from a draft whose bans were not recorded.
        </p>
      </section>
    )
  }

  const unordered = state === 'unordered'
  const swapped = sidesSwapped(game)

  return (
    <section className="border-line overflow-hidden rounded-xl border">
      <header className="border-line flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-3">
        <h2 className="text-fog-100 text-sm font-semibold tracking-tight">Draft</h2>
        <p className="text-fog-600 text-xs">
          {unordered
            ? 'Pick order not recorded — champions are shown in role order.'
            : 'Pick order recorded.'}
          {swapped
            ? ' The source listed this draft with the two sides exchanged; the columns below are corrected.'
            : ''}
        </p>
      </header>

      <div className="grid gap-6 p-5 sm:grid-cols-2">
        <SideDraft
          side="blue"
          label="Blue"
          game={game}
          picks={gamePicks}
          bans={gameBans}
          playerGames={playerGames}
          unordered={unordered}
          swapped={swapped}
          index={index}
        />
        <SideDraft
          side="red"
          label="Red"
          game={game}
          picks={gamePicks}
          bans={gameBans}
          playerGames={playerGames}
          unordered={unordered}
          swapped={swapped}
          index={index}
        />
      </div>
    </section>
  )
}

function SideDraft({
  side,
  label,
  game,
  picks,
  bans,
  playerGames,
  unordered,
  swapped,
  index,
}: {
  side: 'blue' | 'red'
  label: string
  game: Game
  picks: DraftSlot[]
  bans: DraftSlot[]
  playerGames: PlayerGame[]
  unordered: boolean
  swapped: boolean
  index: Indexes
}) {
  const sidePicks = useMemo(
    () => slotsFor(picks, game.game_key, side, swapped),
    [picks, game.game_key, side, swapped],
  )
  const sideBans = useMemo(
    () => slotsFor(bans, game.game_key, side, swapped),
    [bans, game.game_key, side, swapped],
  )
  const byRole = useMemo(
    () => playersByRole(playerGames, game.game_key, side),
    [playerGames, game.game_key, side],
  )

  return (
    <div>
      <h3
        className={`mb-3 font-mono text-[10px] tracking-[0.18em] uppercase ${
          side === 'blue' ? 'text-side-blue' : 'text-side-red'
        }`}
      >
        {label} side
      </h3>

      <ol className="flex flex-wrap gap-2">
        {unordered
          ? byRole.map((row) => (
              <li key={row.player_key} className="border-line bg-ink-850 rounded-lg border px-3 py-2">
                <div className="text-fog-100 text-sm">{championName(index, row.champion_key)}</div>
                <div className="text-fog-600 text-[10px] tracking-wider uppercase">{row.role}</div>
              </li>
            ))
          : sidePicks.map((slot) => (
              <li
                key={slot.entry_index}
                className="border-line bg-ink-850 flex items-baseline gap-1.5 rounded-lg border px-3 py-2"
              >
                <span className="text-fog-600 font-mono text-[10px]">{slot.slot}</span>
                <span className="text-fog-100 text-sm">
                  {championLink(index, slot.champion_key)}
                </span>
              </li>
            ))}
      </ol>

      <div className="border-line mt-4 border-t pt-3">
        <div className="text-fog-600 mb-2 text-[10px] tracking-wider uppercase">Bans</div>
        {sideBans.length === 0 ? (
          <p className="text-fog-500 text-xs">
            No bans recorded for this side. That is a gap in the source, not a game played without
            bans.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {sideBans.map((slot) => (
              <li
                key={slot.entry_index}
                className="border-line text-fog-500 rounded border border-dashed px-2 py-1 text-xs line-through decoration-fog-600"
              >
                {championLink(index, slot.champion_key)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** A champion name, linked when the champion has a page. */
function championLink(index: Indexes, key: number) {
  const href = championPath(index, key)
  const name = championName(index, key)
  return href ? (
    <Link to={href} className="hover:text-gold">
      {name}
    </Link>
  ) : (
    name
  )
}
