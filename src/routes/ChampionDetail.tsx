import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { Skeleton } from '../components/Skeleton'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { Ratio } from '../components/Ratio'
import { Stat, StatRow } from '../components/Stat'
import { namesFor } from '../lib/aliases'
import { championPlayers, championRecord, championRoleStats, presenceOf, roleKda } from '../lib/champion'
import { useAliases, useBans, useDataset, usePlayerGames } from '../lib/data'
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
  const playerRows = usePlayerGames()
  const banRows = useBans()
  const aliases = useAliases()
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = parseFilter(searchParams)

  const prepared = useMemo(() => {
    if (dataset.status !== 'ready') return null
    const champion = dataset.data.champions.find((row) => row.champion_id === id)
    if (!champion) return { champion: undefined } as const

    const index = buildIndexes(dataset.data)
    const scoped = dataset.data.games.map((game) => ({
      game,
      competition: index.competitions.get(game.event_key) ?? 'Unknown',
    }))

    return {
      champion,
      scoped,
      index,
      former:
        aliases.status === 'ready'
          ? namesFor(aliases.data, 'champion', champion.champion_id).map((row) => ({
              name: row.alias_string,
              from: row.valid_from,
              to: row.valid_to,
            }))
          : [],
    } as const
  }, [dataset, aliases, id])

  const applyFilters = (next: typeof filter) => {
    setSearchParams(new URLSearchParams(filterSearch(next)), { replace: true })
  }

  if (dataset.status === 'loading') return <Skeleton shape="page" />
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
  // A champion page counts bans and reads picks nowhere, so it asks for the player
  // rows and the bans and leaves the scoreboards and the ordered draft on the game
  // page, where they are actually rendered.
  const draft =
    playerRows.status === 'ready' && banRows.status === 'ready'
      ? { playerGames: playerRows.data, bans: banRows.data }
      : null
  const record = draft
    ? championRecord(
        visibleGames,
        draft.playerGames,
        draft.bans,
        champion.champion_key,
        champion.release_date,
      )
    : null
  const players = draft
    ? championPlayers(visibleGames, draft.playerGames, champion.champion_key)
    : []
  const roleStats = draft
    ? championRoleStats(visibleGames, draft.playerGames, champion.champion_key)
    : []
  const reason = emptyReason(scoped, filter)
  const index = prepared.index

  return (
    <>
      <Breadcrumbs items={[{ label: 'Champions', to: '/champions' }, { label: champion.champion_name }]} />

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
          <p className="text-fog-600 text-right font-mono text-xs leading-relaxed">
            released {champion.release_date ? dayMonthYear(champion.release_date) : 'unknown'}
            {record && record.firstPicked ? (
              <>
                <br />
                first picked {dayMonthYear(record.firstPicked)}
              </>
            ) : null}
          </p>
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
        <Skeleton shape="table" tableHeight="h-56" />
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
            <Stat
              label="Released"
              value={<span className="text-lg">{champion.release_date ? dayMonthYear(champion.release_date) : '—'}</span>}
              hint={champion.release_date ? `${champion.release_date.slice(0, 4)} · source: Leaguepedia` : undefined}
            />
            <Stat label="Games since release" value={count(record.games)} />
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
          </StatRow>

          <p className="text-fog-600 mt-3 max-w-3xl text-xs leading-relaxed">
            <Link to="/glossary#presence" className="text-fog-300 hover:text-gold">
              Presence
            </Link>{' '}
            counts only the games played <em>after</em> the champion was released
            {champion.release_date ? ` (${dayMonthYear(champion.release_date)})` : ''}, denominator
            included. A champion cannot be picked before it exists, so counting those games would
            report a presence rate it was never eligible for. The eras below are the ones in which
            it could be played at all.
          </p>

          <section className="mt-12">
            <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">By era</h2>
            <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
              Each era is measured against the games played in it since the champion was released,
              so an era that ended before it existed carries no count at all rather than a row of
              zeroes.
            </p>

            <DataTable
              minWidth="34rem"
              rowKey={(era) => era.era}
              rows={record.eras}
              columns={[
                {
                  key: 'era',
                  label: 'Era',
                  primary: true,
                  render: (era) => (
                    <Link to={`/eras/${era.era}`} className="hover:text-gold">
                      {eraCopy(era.era).title}
                    </Link>
                  ),
                },
                { key: 'games', label: 'Games', align: 'right', render: (era) => count(era.games) },
                {
                  key: 'picked',
                  label: 'Picked',
                  align: 'right',
                  render: (era) => (presenceOf(era) === 0 ? '—' : count(era.picked)),
                },
                {
                  key: 'banned',
                  label: 'Banned',
                  align: 'right',
                  render: (era) => (presenceOf(era) === 0 ? '—' : count(era.banned)),
                },
                {
                  key: 'presence',
                  label: 'Presence',
                  align: 'right',
                  render: (era) => <Ratio part={presenceOf(era)} total={era.games} empty="not present" />,
                },
                {
                  key: 'won',
                  label: 'Won',
                  align: 'right',
                  render: (era) => <Ratio part={era.won} total={era.picked} empty="—" />,
                },
              ]}
            />
          </section>

          {roleStats.length > 0 ? (
            <section className="mt-12 grid gap-10 lg:grid-cols-2">
              <div>
                <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">By role</h2>
                <p className="text-fog-500 mb-4 text-sm leading-relaxed">
                  Where it is played, and how it does there. A champion picked in two roles is two
                  answers to where it fits, with two records.
                </p>

                <DataTable
                  minWidth="26rem"
                  rowKey={(entry) => entry.role}
                  rows={roleStats}
                  columns={[
                    { key: 'role', label: 'Role', primary: true, render: (entry) => entry.role },
                    { key: 'picks', label: 'Picks', align: 'right', render: (entry) => count(entry.picks) },
                    {
                      key: 'share',
                      label: 'Share',
                      align: 'right',
                      render: (entry) => (
                        <Ratio part={entry.picks} total={record?.picked ?? entry.picks} />
                      ),
                    },
                    {
                      key: 'win',
                      label: 'Win rate',
                      align: 'right',
                      render: (entry) => <Ratio part={entry.wins} total={entry.picks} />,
                    },
                    {
                      key: 'kda',
                      label: 'KDA',
                      align: 'right',
                      render: (entry) => roleKda(entry).toFixed(2),
                    },
                  ]}
                />
              </div>

              <div>
                <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Picked most</h2>
                <p className="text-fog-500 mb-4 text-sm leading-relaxed">
                  Players who picked it, with the games they are measured on.
                </p>
                <ul className="divide-line border-line divide-y border-y">
                  {players.slice(0, 8).map((entry) => (
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
