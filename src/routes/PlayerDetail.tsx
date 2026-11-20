import { useMemo } from 'react'
import { Link, useParams } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { PageHeader } from '../components/PageHeader'
import { Ratio } from '../components/Ratio'
import { Stat, StatRow } from '../components/Stat'
import { namesFor } from '../lib/aliases'
import { careerFor, type MeasureSummary } from '../lib/career'
import { useAliases, useDataset, usePlayerGames } from '../lib/data'
import { count, perGame } from '../lib/format'
import { buildIndexes, championName, teamName } from '../lib/indexes'

/**
 * One player's career.
 *
 * Three rules decide what is on this page:
 *
 *  - a share never appears without its denominator, so wins read "70% (286/410)";
 *  - an average never appears without the rows it was measured on, because damage
 *    is absent from half the corpus and dividing by games would invent a figure;
 *  - nothing implies an order the source did not state. The champion list is by
 *    games played, not by pick order.
 */
export default function PlayerDetail() {
  const { player: id } = useParams()
  const dataset = useDataset()
  const rows = usePlayerGames()
  const aliases = useAliases()

  const prepared = useMemo(() => {
    if (dataset.status !== 'ready') return null
    const player = dataset.data.players.find((row) => row.player_id === id)
    if (!player) return { player: undefined } as const

    return {
      player,
      career: rows.status === 'ready' ? careerFor(dataset.data.games, rows.data, player.player_key) : null,
      former:
        aliases.status === 'ready'
          ? namesFor(aliases.data, 'player', player.player_id).map((row) => ({
              name: row.alias_string,
              from: row.valid_from,
              to: row.valid_to,
            }))
          : [],
      index: buildIndexes(dataset.data),
    } as const
  }, [dataset, rows, aliases, id])

  if (dataset.status === 'loading') return <p className="text-fog-600">Loading…</p>
  if (dataset.status === 'failed')
    return <p className="text-side-red">Could not load the dataset: {dataset.error.message}</p>

  if (!prepared?.player) {
    return (
      <div className="py-12">
        <p className="text-fog-600 mb-3 font-mono text-xs tracking-widest uppercase">Not found</p>
        <h1 className="text-fog-100 text-2xl font-semibold tracking-tight">No player with that id.</h1>
        <p className="text-fog-300 mt-3 max-w-xl text-sm leading-relaxed">
          The id in the URL is the one the dataset uses, not a name. A player is reachable from any
          game they played.{' '}
          <Link to="/" className="text-gold">
            Back to the eras
          </Link>
          .
        </p>
      </div>
    )
  }

  const { player, career, former, index } = prepared
  const mainRole = career?.roles[0]?.role

  return (
    <>
      <Breadcrumbs items={[{ label: player.player_name }]} />

      <PageHeader
        eyebrow={mainRole ? `player · ${mainRole.toLowerCase()}` : 'player'}
        title={player.player_name}
        lead={
          former.length > 0 ? (
            <span className="text-fog-500 text-sm">
              Also known as{' '}
              {former.map((name, position) => (
                <span key={name.name}>
                  {position > 0 ? ', ' : ''}
                  <span className="text-fog-300">{name.name}</span>{' '}
                  <span className="font-mono text-xs">
                    ({name.from}
                    {name.to ? ` → ${name.to}` : ''})
                  </span>
                </span>
              ))}
            </span>
          ) : undefined
        }
        aside={
          career && career.games > 0 ? (
            <p className="text-fog-600 text-right font-mono text-xs leading-relaxed">
              {career.firstGame?.slice(0, 10)} → {career.lastGame?.slice(0, 10)}
              <br />
              {count(career.games)} games
            </p>
          ) : null
        }
      />

      {career === null ? (
        <div className="space-y-3">
          <div className="bg-ink-900 border-line h-24 animate-pulse rounded-xl border" />
          <div className="bg-ink-900 border-line h-48 animate-pulse rounded-xl border" />
        </div>
      ) : career.games === 0 ? (
        <p className="border-line bg-ink-900 text-fog-300 rounded-xl border p-6 text-sm">
          The dataset carries no game for this player. The record exists, the games do not — a fact
          about the corpus, not a missing page.
        </p>
      ) : (
        <>
          <StatRow>
            <Stat label="Games" value={count(career.games)} />
            <Stat label="Win share" value={<Ratio part={career.wins} total={career.games} />} />
            <Stat
              label="KDA"
              value={career.kda === null ? '—' : career.kda.toFixed(2)}
              hint="summed, then divided"
            />
            <Stat label="Kills / game" value={perGame(career.averages.kills)} />
            <Stat label="Deaths / game" value={perGame(career.averages.deaths)} />
            <Stat label="Assists / game" value={perGame(career.averages.assists)} />
          </StatRow>

          <p className="text-fog-600 mt-3 max-w-3xl text-xs leading-relaxed">
            KDA = (kills + assists) / max(1, deaths), summed over every game before dividing. The
            totals sit beside each average for the same reason they do below: one death in four
            games and one in forty are not the same measurement.
          </p>

          <section className="mt-12">
            <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Per game</h2>
            <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
              Each average is divided by the rows that state the measure, never by games. Damage is
              recorded on {count(career.measures.damage.measured)} of this player&rsquo;s{' '}
              {count(career.games)} games; the other{' '}
              {count(career.games - career.measures.damage.measured)} state nothing and are not
              counted as zero.
            </p>

            <div className="border-line overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="text-fog-600 border-line border-b text-left text-[11px] tracking-wider uppercase">
                    <th className="px-4 py-2.5 font-medium">Measure</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total</th>
                    <th className="px-4 py-2.5 text-right font-medium">Per game</th>
                    <th className="px-4 py-2.5 text-right font-medium">Games measured</th>
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  <MeasureRow
                    label="Kills"
                    games={career.games}
                    summary={{ sum: career.kills, measured: career.games, average: career.averages.kills }}
                  />
                  <MeasureRow
                    label="Deaths"
                    games={career.games}
                    summary={{ sum: career.deaths, measured: career.games, average: career.averages.deaths }}
                  />
                  <MeasureRow
                    label="Assists"
                    games={career.games}
                    summary={{ sum: career.assists, measured: career.games, average: career.averages.assists }}
                  />
                  <MeasureRow label="CS" games={career.games} summary={career.measures.cs} />
                  <MeasureRow label="Gold" games={career.games} summary={career.measures.gold} />
                  <MeasureRow label="Damage" games={career.games} summary={career.measures.damage} />
                  <MeasureRow label="Vision" games={career.games} summary={career.measures.vision} />
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Champions</h2>
            <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
              {count(career.champions.length)} champions over {count(career.games)} games, ordered by
              games played. The corpus does not record a pick order for every draft, so this list
              claims none.
            </p>

            <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {career.champions.map((champion) => (
                <li
                  key={champion.key}
                  className="border-line/60 flex items-baseline justify-between gap-3 border-b py-1.5"
                >
                  <span className="text-fog-300 truncate text-sm">
                    {championName(index, champion.key)}
                  </span>
                  <span className="shrink-0 text-xs">
                    <Ratio part={champion.wins} total={champion.games} />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12 grid gap-10 sm:grid-cols-2">
            <div>
              <h2 className="text-fog-100 mb-3 text-lg font-semibold tracking-tight">Teams</h2>
              <ul className="divide-line border-line divide-y border-y">
                {career.teams.map((team) => (
                  <li key={team.key} className="flex items-baseline justify-between gap-3 py-2.5">
                    <span className="text-fog-300 text-sm">{teamName(index, team.key)}</span>
                    <span className="flex items-baseline gap-3 text-xs">
                      <span className="text-fog-600 tabular-nums">{count(team.games)} games</span>
                      <Ratio part={team.wins} total={team.games} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-fog-100 mb-3 text-lg font-semibold tracking-tight">Roles</h2>
              <ul className="flex flex-wrap gap-2">
                {career.roles.map((role) => (
                  <li
                    key={role.role}
                    className="border-line text-fog-300 rounded-lg border px-3 py-1.5 text-sm"
                  >
                    {role.role}
                    <span className="text-fog-600 ml-2 font-mono text-xs">{count(role.games)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </>
  )
}

function MeasureRow({
  label,
  summary,
  games,
}: {
  label: string
  summary: MeasureSummary
  games: number
}) {
  return (
    <tr className="hover:bg-ink-850/50">
      <td className="text-fog-100 px-4 py-2">{label}</td>
      <td className="px-4 py-2 text-right tabular-nums">
        {summary.measured === 0 ? '—' : count(summary.sum)}
      </td>
      <td className="px-4 py-2 text-right tabular-nums">{perGame(summary.average)}</td>
      <td className="text-fog-600 px-4 py-2 text-right font-mono text-xs tabular-nums">
        {count(summary.measured)} / {count(games)}
      </td>
    </tr>
  )
}
