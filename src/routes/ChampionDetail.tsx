import { useMemo } from 'react'
import { Link, useParams } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { PageHeader } from '../components/PageHeader'
import { Ratio } from '../components/Ratio'
import { Stat, StatRow } from '../components/Stat'
import { namesFor } from '../lib/aliases'
import { championRecord, presenceOf } from '../lib/champion'
import { useAliases, useDataset, useGameDetail } from '../lib/data'
import { eraCopy } from '../lib/eras'
import { count, dayMonthYear } from '../lib/format'

/**
 * One champion, era by era.
 *
 * Presence is measured against the games played in each era, so a champion
 * released mid-corpus shows nothing before its first game rather than a run of
 * zeroes. That is the same rule the scoreboard applies to objectives, and it is
 * what stops "not yet released" from reading as "never picked".
 */
export default function ChampionDetail() {
  const { champion: id } = useParams()
  const dataset = useDataset()
  const detail = useGameDetail()
  const aliases = useAliases()

  const prepared = useMemo(() => {
    if (dataset.status !== 'ready') return null
    const champion = dataset.data.champions.find((row) => row.champion_id === id)
    if (!champion) return { champion: undefined } as const

    const record =
      detail.status === 'ready'
        ? championRecord(
            dataset.data.games,
            detail.data.playerGames,
            detail.data.bans,
            champion.champion_key,
          )
        : null

    return {
      champion,
      record,
      former:
        aliases.status === 'ready'
          ? namesFor(aliases.data, 'champion', champion.champion_id).map((row) => ({
              name: row.alias_string,
              from: row.valid_from,
              to: row.valid_to,
            }))
          : [],
    } as const
  }, [dataset, detail, aliases, id])

  if (dataset.status === 'loading') return <p className="text-fog-600">Loading…</p>
  if (dataset.status === 'failed')
    return <p className="text-side-red">Could not load the dataset: {dataset.error.message}</p>

  if (!prepared?.champion) {
    return (
      <div className="py-12">
        <p className="text-fog-600 mb-3 font-mono text-xs tracking-widest uppercase">Not found</p>
        <h1 className="text-fog-100 text-2xl font-semibold tracking-tight">
          No champion with that id.
        </h1>
        <p className="text-fog-300 mt-3 max-w-xl text-sm leading-relaxed">
          The id in the URL is the one the dataset uses, not a name. A champion is reachable from any
          draft that contains it.{' '}
          <Link to="/" className="text-gold">
            Back to the eras
          </Link>
          .
        </p>
      </div>
    )
  }

  const { champion, record, former } = prepared

  return (
    <>
      <Breadcrumbs items={[{ label: champion.champion_name }]} />

      <PageHeader
        eyebrow="champion"
        title={champion.champion_name}
        lead={
          former.length > 0 ? (
            <span className="text-fog-500 text-sm">
              Previously{' '}
              {former.map((name) => (
                <span key={name.name} className="text-fog-300">
                  {name.name}{' '}
                </span>
              ))}
            </span>
          ) : undefined
        }
        aside={
          record && record.firstPicked ? (
            <p className="text-fog-600 text-right font-mono text-xs leading-relaxed">
              first picked {dayMonthYear(record.firstPicked)}
              <br />
              {count(record.picked)} games
            </p>
          ) : null
        }
      />

      {record === null ? (
        <div className="space-y-3">
          <div className="bg-ink-900 border-line h-24 animate-pulse rounded-xl border" />
          <div className="bg-ink-900 border-line h-56 animate-pulse rounded-xl border" />
        </div>
      ) : record.picked === 0 && record.banned === 0 ? (
        <p className="border-line bg-ink-900 text-fog-300 rounded-xl border p-6 text-sm">
          This champion appears in no draft the corpus carries: never picked, never banned,
          {record.firstPicked ? '' : ' and no game states it.'}
        </p>
      ) : (
        <>
          <StatRow>
            <Stat label="Games in corpus" value={count(record.games)} />
            <Stat label="Picked" value={<Ratio part={record.picked} total={record.games} />} />
            <Stat label="Banned" value={<Ratio part={record.banned} total={record.games} />} />
            <Stat
              label="Presence"
              value={<Ratio part={record.picked + record.banned} total={record.games} />}
            />
            <Stat
              label="Won when picked"
              value={<Ratio part={record.won} total={record.picked} />}
            />
            <Stat label="Eras" value={count(record.eras.filter((era) => presenceOf(era) > 0).length)} />
          </StatRow>

          <p className="text-fog-600 mt-3 max-w-3xl text-xs leading-relaxed">
            Presence is pick plus ban over the games of the era, so a champion banned in most of its
            games was respected rather than played. A champion that did not exist yet shows nothing
            in that era — that is not the same fact as never being picked.
          </p>

          <section className="mt-12">
            <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">By era</h2>
            <p className="text-fog-500 mb-5 text-sm leading-relaxed">
              Each era is measured against the games played in it.
            </p>

            <div className="border-line overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="text-fog-600 border-line border-b text-left text-[11px] tracking-wider uppercase">
                    <th className="px-4 py-2.5 font-medium">Era</th>
                    <th className="px-4 py-2.5 text-right font-medium">Games</th>
                    <th className="px-4 py-2.5 text-right font-medium">Picked</th>
                    <th className="px-4 py-2.5 text-right font-medium">Banned</th>
                    <th className="px-4 py-2.5 text-right font-medium">Presence</th>
                    <th className="px-4 py-2.5 text-right font-medium">Won</th>
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {record.eras.map((era) => (
                    <tr key={era.era} className="hover:bg-ink-850/50">
                      <td className="text-fog-100 px-4 py-2">
                        <Link to={`/eras/${era.era}`} className="hover:text-gold">
                          {eraCopy(era.era).title}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{count(era.games)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {presenceOf(era) === 0 ? '—' : count(era.picked)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {presenceOf(era) === 0 ? '—' : count(era.banned)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Ratio part={presenceOf(era)} total={era.games} empty="not present" />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Ratio part={era.won} total={era.picked} empty="—" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  )
}
