import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { PageHeader } from '../components/PageHeader'
import { Ratio } from '../components/Ratio'
import { Stat, StatRow } from '../components/Stat'
import { namesFor } from '../lib/aliases'
import { championRecord, championUsers, presenceOf } from '../lib/champion'
import { useAliases, useDataset, useGameDetail } from '../lib/data'
import { eraCopy } from '../lib/eras'
import { CareerFilters } from '../components/CareerFilters'
import { applyFilter, emptyReason, filterSearch, NO_FILTER, optionsFor, parseFilter, recoverFilter } from '../lib/filters'
import { count, dayMonthYear } from '../lib/format'
import { buildIndexes, playerName, playerPath } from '../lib/indexes'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = parseFilter(searchParams)

  const prepared = useMemo(() => {
    if (dataset.status !== 'ready') return null
    const champion = dataset.data.champions.find((row) => row.champion_id === id)
    if (!champion) return { champion: undefined } as const

    const competitions = new Map(
      dataset.data.events.map((event) => [event.event_key, event.competition]),
    )
    const scoped = dataset.data.games.map((game) => ({
      game,
      competition: competitions.get(game.event_key) ?? 'Unknown',
    }))

    return {
      champion,
      scoped,
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

  const applyFilters = (next: typeof filter) => {
    setSearchParams(new URLSearchParams(filterSearch(next)), { replace: true })
  }

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

  const { champion, former, scoped } = prepared
  const visibleGames = applyFilter(scoped, filter).map((entry) => entry.game)
  const record =
    detail.status === 'ready'
      ? championRecord(visibleGames, detail.data.playerGames, detail.data.bans, champion.champion_key)
      : null
  const users =
    detail.status === 'ready'
      ? championUsers(visibleGames, detail.data.playerGames, champion.champion_key)
      : null
  const reason = emptyReason(scoped, filter)
  const index = buildIndexes(dataset.data)

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

      <CareerFilters
        filter={filter}
        options={optionsFor(scoped)}
        eraLabel={null}
        onChange={applyFilters}
        onClear={() => applyFilters(NO_FILTER)}
      />

      {record === null ? (
        <div className="space-y-3">
          <div className="bg-ink-900 border-line h-24 animate-pulse rounded-xl border" />
          <div className="bg-ink-900 border-line h-56 animate-pulse rounded-xl border" />
        </div>
      ) : record.picked === 0 && record.banned === 0 && visibleGames.length !== scoped.length ? (
        <div className="border-line bg-ink-900 rounded-xl border p-6">
          <h2 className="text-fog-100 text-base font-semibold">
            {reason === 'year'
              ? `No draft with ${champion.champion_name} at ${filter.competition} in ${filter.year}.`
              : `No draft with ${champion.champion_name} in ${filter.competition}.`}
          </h2>
          <p className="text-fog-300 mt-2 max-w-xl text-sm leading-relaxed">
            The champion is in the corpus, just not in this selection. The filter is what emptied
            this view.
          </p>
          <button
            type="button"
            onClick={() => applyFilters(recoverFilter(scoped, filter))}
            className="border-line hover:border-line-bright text-gold mt-4 rounded-lg border px-3 py-1.5 text-sm"
          >
            Show every game
          </button>
        </div>
      ) : record.picked === 0 && record.banned === 0 ? (
        <p className="border-line bg-ink-900 text-fog-300 rounded-xl border p-6 text-sm">
          This champion appears in no draft the corpus carries: never picked, never banned,
          {record.firstPicked ? '' : ' and no game states it.'}
        </p>
      ) : (
        <>
          <StatRow>
            <Stat label="Games in scope" value={count(record.games)} />
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

          {users && users.roles.length > 0 ? (
            <section className="mt-12 grid gap-10 sm:grid-cols-2">
              <div>
                <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Roles</h2>
                <p className="text-fog-500 mb-4 text-sm leading-relaxed">
                  Where it is played. A champion played in two roles is two answers to where it
                  fits, not one.
                </p>
                <ul className="flex flex-wrap gap-2">
                  {users.roles.map((role) => (
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

              <div>
                <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Picked most</h2>
                <p className="text-fog-500 mb-4 text-sm leading-relaxed">
                  Players who picked it, with the games they are measured on.
                </p>
                <ul className="divide-line border-line divide-y border-y">
                  {users.players.slice(0, 8).map((entry) => (
                    <li key={entry.key} className="flex items-baseline justify-between gap-3 py-2">
                      <span className="text-fog-300 text-sm">
                        {playerPath(index, entry.key) ? (
                          <Link to={playerPath(index, entry.key)!} className="hover:text-gold">
                            {playerName(index, entry.key)}
                          </Link>
                        ) : (
                          playerName(index, entry.key)
                        )}
                      </span>
                      <span className="flex items-baseline gap-3 text-xs">
                        <span className="text-fog-600 tabular-nums">{count(entry.games)} games</span>
                        <Ratio part={entry.wins} total={entry.games} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

        </>
      )}
    </>
  )
}
