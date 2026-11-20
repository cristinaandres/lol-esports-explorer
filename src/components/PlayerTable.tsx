import { Link } from 'react-router'

import { ROLE_ORDER } from '../lib/draft'
import { count, orDash } from '../lib/format'
import { championName, championPath, playerName, playerPath, teamName, type Indexes } from '../lib/indexes'
import { fromParam } from '../lib/context'
import type { PlayerGame } from '../lib/types'

/**
 * The ten player rows of one game, split by side.
 *
 * Three of these columns are absent more often than not — damage on 15,040 of
 * 30,910 rows, vision on 11,300, gold on 1,750 — so every one of them renders
 * through orDash. A zero would be a measurement; an em dash is the truth.
 */
export function PlayerTable({
  playerGames,
  index,
  gameId,
}: {
  playerGames: PlayerGame[]
  index: Indexes
  /** The game page's id, so a name links back with the game it came from. */
  gameId?: string
}) {
  // Role order, because the source lists the rows in whatever order it likes and
  // the two sides must read the same way down the page.
  const order = new Map<string, number>(ROLE_ORDER.map((role, index) => [role, index]))
  const byRole = (side: 'blue' | 'red') =>
    playerGames
      .filter((row) => row.side === side)
      .sort((a, b) => (order.get(a.role) ?? 99) - (order.get(b.role) ?? 99))

  const blue = byRole('blue')
  const red = byRole('red')

  if (blue.length === 0 && red.length === 0) {
    return (
      <p className="text-fog-600 text-sm">
        No player rows are recorded for this game. Its player-statistics coverage is
        unavailable.
      </p>
    )
  }

  return (
    <div className="border-line overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[42rem] text-sm">
        <thead>
          <tr className="text-fog-600 border-line border-b text-left text-[11px] tracking-wider uppercase">
            <th className="px-4 py-2.5 font-medium">Role</th>
            <th className="px-4 py-2.5 font-medium">Player</th>
            <th className="px-4 py-2.5 font-medium">Champion</th>
            <th className="px-4 py-2.5 text-right font-medium">K</th>
            <th className="px-4 py-2.5 text-right font-medium">D</th>
            <th className="px-4 py-2.5 text-right font-medium">A</th>
            <th className="px-4 py-2.5 text-right font-medium">CS</th>
            <th className="px-4 py-2.5 text-right font-medium">Gold</th>
            <th className="px-4 py-2.5 text-right font-medium">Dmg</th>
            <th className="px-4 py-2.5 text-right font-medium">Vision</th>
          </tr>
        </thead>
        <SideRows side="blue" rows={blue} index={index} gameId={gameId} />
        <SideRows side="red" rows={red} index={index} gameId={gameId} />
      </table>
    </div>
  )
}

function SideRows({
  side,
  rows,
  index,
  gameId,
}: {
  side: 'blue' | 'red'
  rows: PlayerGame[]
  index: Indexes
  gameId?: string
}) {
  if (rows.length === 0) return null
  const team = rows[0]!.team_key

  return (
    <>
      <tbody>
        <tr className="bg-ink-850">
          <th
            colSpan={10}
            className={`px-4 py-2 text-left text-[11px] font-medium tracking-wider uppercase ${
              side === 'blue' ? 'text-side-blue' : 'text-side-red'
            }`}
          >
            {side} · {teamName(index, team)}
          </th>
        </tr>
      </tbody>
      <tbody className="divide-line divide-y">
        {rows.map((row) => (
          <tr key={row.player_key} className="hover:bg-ink-850/50">
            <td className="text-fog-600 px-4 py-2 text-xs tracking-wider uppercase">{row.role}</td>
            <td className="text-fog-100 px-4 py-2">
              {playerHref(index, row.player_key, gameId) ? (
                <Link to={playerHref(index, row.player_key, gameId)!} className="hover:text-gold">
                  {playerName(index, row.player_key)}
                </Link>
              ) : (
                playerName(index, row.player_key)
              )}
            </td>
            <td className="text-fog-300 px-4 py-2">
              {championPath(index, row.champion_key) ? (
                <Link to={championPath(index, row.champion_key)!} className="hover:text-gold">
                  {championName(index, row.champion_key)}
                </Link>
              ) : (
                championName(index, row.champion_key)
              )}
            </td>
            <td className="px-4 py-2 text-right tabular-nums">{count(row.kills)}</td>
            <td className="px-4 py-2 text-right tabular-nums">{count(row.deaths)}</td>
            <td className="px-4 py-2 text-right tabular-nums">{count(row.assists)}</td>
            <td className="px-4 py-2 text-right tabular-nums">{orDash(row.cs)}</td>
            <td className="px-4 py-2 text-right tabular-nums">{orDash(row.gold)}</td>
            <td className="px-4 py-2 text-right tabular-nums">{orDash(row.damage)}</td>
            <td className="px-4 py-2 text-right tabular-nums">{orDash(row.vision)}</td>
          </tr>
        ))}
      </tbody>
    </>
  )
}

/** The player's route, carrying the game it was reached from. */
function playerHref(index: Indexes, playerKey: number, gameId?: string): string | null {
  const path = playerPath(index, playerKey)
  if (!path) return null
  return gameId ? `${path}?from=${fromParam(gameId)}` : path
}
