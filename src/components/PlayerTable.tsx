import { ROLE_ORDER } from '../lib/draft'
import { count, orDash } from '../lib/format'
import { championName, playerName, teamName, type Indexes } from '../lib/indexes'
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
}: {
  playerGames: PlayerGame[]
  index: Indexes
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
        <SideRows side="blue" rows={blue} index={index} />
        <SideRows side="red" rows={red} index={index} />
      </table>
    </div>
  )
}

function SideRows({
  side,
  rows,
  index,
}: {
  side: 'blue' | 'red'
  rows: PlayerGame[]
  index: Indexes
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
            <td className="text-fog-100 px-4 py-2">{playerName(index, row.player_key)}</td>
            <td className="text-fog-300 px-4 py-2">{championName(index, row.champion_key)}</td>
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
