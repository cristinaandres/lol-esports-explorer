import { Link } from 'react-router'

import { DataTable, type Column } from './DataTable'
import { playersByRole } from '../lib/draft'
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
 *
 * Ten columns do not fit a phone, so the table stacks below `sm`: the player
 * becomes the row's heading and the rest become labelled pairs.
 */
export function PlayerTable({
  playerGames,
  gameKey,
  index,
  gameId,
}: {
  playerGames: PlayerGame[]
  /** The game the rows belong to, so reading a side cannot pick up another game's rows. */
  gameKey: number
  index: Indexes
  /** The game page's id, so a name links back with the game it came from. */
  gameId?: string
}) {
  const blue = playersByRole(playerGames, gameKey, 'blue')
  const red = playersByRole(playerGames, gameKey, 'red')

  if (blue.length === 0 && red.length === 0) {
    return (
      <p className="text-fog-600 text-sm">
        No player rows are recorded for this game. Its player-statistics coverage is unavailable.
      </p>
    )
  }

  const columns: Column<PlayerGame>[] = [
    {
      key: 'player',
      label: 'Player',
      primary: true,
      render: (row) => (
        <span className="flex flex-wrap items-baseline gap-2">
          {playerHref(index, row.player_key, gameId) ? (
            <Link to={playerHref(index, row.player_key, gameId)!} className="hover:text-gold">
              {playerName(index, row.player_key)}
            </Link>
          ) : (
            playerName(index, row.player_key)
          )}
          <span className="text-fog-600 text-[10px] tracking-wider uppercase">{row.role}</span>
        </span>
      ),
    },
    {
      key: 'champion',
      label: 'Champion',
      render: (row) =>
        championPath(index, row.champion_key) ? (
          <Link to={championPath(index, row.champion_key)!} className="hover:text-gold">
            {championName(index, row.champion_key)}
          </Link>
        ) : (
          championName(index, row.champion_key)
        ),
    },
    { key: 'k', label: 'K', align: 'right', render: (row) => count(row.kills) },
    { key: 'd', label: 'D', align: 'right', render: (row) => count(row.deaths) },
    { key: 'a', label: 'A', align: 'right', render: (row) => count(row.assists) },
    { key: 'cs', label: 'CS', align: 'right', render: (row) => orDash(row.cs) },
    { key: 'gold', label: 'Gold', align: 'right', render: (row) => orDash(row.gold) },
    { key: 'damage', label: 'Dmg', align: 'right', render: (row) => orDash(row.damage) },
    { key: 'vision', label: 'Vision', align: 'right', render: (row) => orDash(row.vision) },
  ]

  return (
    <div className="space-y-6">
      {[
        { side: 'blue' as const, rows: blue },
        { side: 'red' as const, rows: red },
      ]
        .filter((group) => group.rows.length > 0)
        .map((group) => (
          <div key={group.side}>
            <h3
              className={`mb-2 text-[11px] font-medium tracking-wider uppercase ${
                group.side === 'blue' ? 'text-side-blue' : 'text-side-red'
              }`}
            >
              {group.side} · {teamName(index, group.rows[0]!.team_key)}
            </h3>
            <DataTable
              columns={columns}
              rows={group.rows}
              rowKey={(row) => row.player_key}
              minWidth="40rem"
            />
          </div>
        ))}
    </div>
  )
}

/** The player's route, carrying the game it was reached from. */
function playerHref(index: Indexes, playerKey: number, gameId?: string): string | null {
  const path = playerPath(index, playerKey)
  if (!path) return null
  return gameId ? `${path}?from=${fromParam(gameId)}` : path
}
