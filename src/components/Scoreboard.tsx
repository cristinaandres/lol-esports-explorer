import { duration, orDash } from '../lib/format'
import { Link } from 'react-router'

import { patchLabel, teamName, teamPath, type Indexes } from '../lib/indexes'
import type { Game, Side } from '../lib/types'

/**
 * The two sides of one game, facing each other.
 *
 * A scoreboard without the opponent is not a scoreboard, so the two sides are
 * always drawn together and the winner is labelled. Every measure can be absent
 * and renders as an em dash, never as a zero.
 */
export function Scoreboard({
  game,
  sides,
  index,
  eligible,
}: {
  game: Game
  sides: Side[]
  index: Indexes
  /** The fields that could exist in this era, from the upstream rule. */
  eligible: string[]
}) {
  const blue = sides.find((side) => side.side === 'blue')
  const red = sides.find((side) => side.side === 'red')
  if (!blue || !red) {
    return <p className="text-fog-600 text-sm">This game has no recorded sides.</p>
  }

  // A field the era did not have is not "missing": it did not exist. Rendering
  // "Voidgrubs —" on a 2020 game would suggest the source lost a number that no
  // game could have had, so those rows are dropped and named below instead.
  const all: { label: string; field: string; blue: string; red: string }[] = [
    { label: 'Kills', field: 'kills', blue: orDash(blue.kills), red: orDash(red.kills) },
    { label: 'Gold', field: 'gold', blue: orDash(blue.gold), red: orDash(red.gold) },
    { label: 'Towers', field: 'towers', blue: orDash(blue.towers), red: orDash(red.towers) },
    { label: 'Inhibitors', field: 'inhibitors', blue: orDash(blue.inhibitors), red: orDash(red.inhibitors) },
    { label: 'Barons', field: 'barons', blue: orDash(blue.barons), red: orDash(red.barons) },
    { label: 'Dragons', field: 'dragons', blue: orDash(blue.dragons), red: orDash(red.dragons) },
    { label: 'Rift heralds', field: 'riftHeralds', blue: orDash(blue.rift_heralds), red: orDash(red.rift_heralds) },
    { label: 'Voidgrubs', field: 'voidGrubs', blue: orDash(blue.void_grubs), red: orDash(red.void_grubs) },
    { label: 'Atakhans', field: 'atakhans', blue: orDash(blue.atakhans), red: orDash(red.atakhans) },
  ]
  const known = new Set(eligible)
  const rows = eligible.length === 0 ? all : all.filter((row) => known.has(row.field))
  const absent = eligible.length === 0 ? [] : all.filter((row) => !known.has(row.field))

  return (
    <section aria-label="Scoreboard" className="border-line overflow-hidden rounded-xl border">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-4 px-5 pt-5 pb-4">
        <SideHead side={blue} index={index} align="left" />
        <div className="text-fog-600 pb-1 font-mono text-xs">vs</div>
        <SideHead side={red} index={index} align="right" />
      </div>

      <dl className="divide-line border-line divide-y border-t">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[1fr_auto_1fr] items-center px-5 py-2">
            <dd className="text-fog-100 text-sm tabular-nums">{row.blue}</dd>
            <dt className="text-fog-600 w-32 text-center text-[11px] tracking-wider uppercase">
              {row.label}
            </dt>
            <dd className="text-fog-100 text-right text-sm tabular-nums">{row.red}</dd>
          </div>
        ))}
      </dl>

      {absent.length > 0 ? (
        <p className="border-line text-fog-600 border-t px-5 py-3 text-xs leading-relaxed">
          Not counted in this era: {absent.map((row) => row.label.toLowerCase()).join(', ')}. The
          objective did not exist yet, which is different from the source not recording it.
        </p>
      ) : null}

      <div className="border-line text-fog-600 flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-xs">
        <span>
          Duration <span className="text-fog-300 font-mono">{duration(game.duration_seconds)}</span>
        </span>
        <span>
          Patch <span className="text-fog-300 font-mono">{patchLabel(index, game.patch_key)}</span>
        </span>
        <span>
          Blue side won{' '}
          <span className="text-fog-300 font-mono">{game.blue_win === 1 ? 'yes' : 'no'}</span>
        </span>
      </div>
    </section>
  )
}

function SideHead({
  side,
  index,
  align,
}: {
  side: Side
  index: Indexes
  align: 'left' | 'right'
}) {
  const isWinner = side.is_winner === 1
  const dragons = dragonParts(side)

  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div
        className={`mb-1 font-mono text-[10px] tracking-[0.18em] uppercase ${
          side.side === 'blue' ? 'text-side-blue' : 'text-side-red'
        }`}
      >
        {side.side}
      </div>
      <div className="text-fog-100 text-lg font-semibold tracking-tight">
        {teamPath(index, side.team_key) ? (
          <Link to={teamPath(index, side.team_key)!} className="hover:text-gold">
            {teamName(index, side.team_key)}
          </Link>
        ) : (
          teamName(index, side.team_key)
        )}
      </div>
      {isWinner ? (
        <div className="text-gold mt-1 text-[11px] tracking-widest uppercase">winner</div>
      ) : (
        <div className="text-fog-600 mt-1 text-[11px]">—</div>
      )}
      {dragons.length > 0 ? (
        <div className="text-fog-600 mt-1 font-mono text-[10px]">{dragons.join(' · ')}</div>
      ) : null}
    </div>
  )
}

/** The elemental split, only when the source states any. */
function dragonParts(side: Side): string[] {
  const parts: string[] = []
  const push = (label: string, value: number | null) => {
    if (value !== null && value > 0) parts.push(`${value} ${label}`)
  }
  push('cloud', side.dragons_clouds)
  push('infernal', side.dragons_infernals)
  push('mountain', side.dragons_mountains)
  push('ocean', side.dragons_oceans)
  push('hextech', side.dragons_hextechs)
  push('chemtech', side.dragons_chemtechs)
  push('elder', side.dragons_elders)
  return parts
}
