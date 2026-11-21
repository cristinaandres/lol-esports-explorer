import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { Skeleton } from '../components/Skeleton'
import { CareerFilters } from '../components/CareerFilters'
import { EmptyFilter } from '../components/EmptyFilter'
import { PageHeader } from '../components/PageHeader'
import { Ratio } from '../components/Ratio'
import { Stat, StatRow } from '../components/Stat'
import { namesFor } from '../lib/aliases'
import { useAliases, useDataset, usePlayerGames } from '../lib/data'
import {
  applyFilter,
  emptyReason,
  filterSearch,
  isEmptyFilter,
  NO_FILTER,
  optionsFor,
  parseFilter,
  recoverFilter,
} from '../lib/filters'
import { count, dayMonthYear } from '../lib/format'
import { buildIndexes, playerName, playerPath } from '../lib/indexes'
import { rosterFrom, rosterOfGame, teamAppearancesFor, teamSummaryFrom } from '../lib/team'
import { championships, groupTitlesByCompetition, titlesForTeam } from '../lib/titles'

/**
 * One team's record.
 *
 * Two things here are facts about the corpus rather than about the team, and the
 * page states both instead of hiding them: the roster is derived from who appeared
 * in the games, not from a contract table the model does not have, and the side
 * split is reported per view because side advantage belongs to the era.
 */
export default function TeamDetail() {
  const { team: id } = useParams()
  const dataset = useDataset()
  const rows = usePlayerGames()
  const aliases = useAliases()
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = parseFilter(searchParams)

  const prepared = useMemo(() => {
    if (dataset.status !== 'ready') return null
    const team = dataset.data.teams.find((row) => row.team_id === id)
    if (!team) return { team: undefined } as const

    const competitions = new Map(
      dataset.data.events.map((event) => [event.event_key, event.competition]),
    )

    return {
      team,
      ready: rows.status === 'ready',
      appearances: teamAppearancesFor(dataset.data.games, competitions, team.team_key),
      playerGames: rows.status === 'ready' ? rows.data : [],
      former:
        aliases.status === 'ready'
          ? namesFor(aliases.data, 'team', team.team_id).map((row) => ({
              name: row.alias_string,
              from: row.valid_from,
              to: row.valid_to,
            }))
          : [],
      events: new Map(dataset.data.events.map((event) => [event.event_key, event])),
      champs: championships(dataset.data.games, dataset.data.matches),
      index: buildIndexes(dataset.data),
    } as const
  }, [dataset, rows, aliases, id])

  const applyFilters = (next: typeof filter) => {
    setSearchParams(new URLSearchParams(filterSearch(next)), { replace: true })
  }

  if (dataset.status === 'loading') return <Skeleton shape="page" />
  if (dataset.status === 'failed')
    return <p className="text-side-red">Could not load the dataset: {dataset.error.message}</p>

  if (!prepared?.team) {
    return (
      <div className="py-12">
        <p className="text-fog-600 mb-3 font-mono text-xs tracking-widest uppercase">Not found</p>
        <h1 className="text-fog-100 text-2xl font-semibold tracking-tight">No team with that id.</h1>
        <p className="text-fog-300 mt-3 max-w-xl text-sm leading-relaxed">
          The id in the URL is the one the dataset uses, not a name. A team is reachable from any
          game it played.{' '}
          <Link to="/" className="text-gold">
            Back to the eras
          </Link>
          .
        </p>
      </div>
    )
  }

  const { team, index, events, playerGames } = prepared
  const titles = titlesForTeam(prepared.champs, team.team_key)
  const titleGroups = groupTitlesByCompetition(titles, (key) => events.get(key)?.competition)
  const all = prepared.appearances
  const visible = applyFilter(all, filter)
  const summary = teamSummaryFrom(visible)
  const roster = rosterFrom(playerGames, visible)
  const current = rosterOfGame(playerGames, visible[visible.length - 1])
  const options = optionsFor(all)
  const reason = emptyReason(all, filter)

  return (
    <>
      <Breadcrumbs items={[{ label: 'Teams', to: '/teams' }, { label: team.team_name }]} />

      <PageHeader
        eyebrow={team.region ? `team · ${team.region}` : 'team'}
        title={team.team_name}
        lead={
          prepared.former.length > 0 ? (
            <span className="text-fog-500 text-sm">
              Previously{' '}
              {prepared.former.map((name, position) => (
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
          summary.games > 0 ? (
            <p className="text-fog-600 text-right font-mono text-xs leading-relaxed">
              {summary.firstGame?.slice(0, 10)} → {summary.lastGame?.slice(0, 10)}
              <br />
              {count(summary.games)} games
            </p>
          ) : null
        }
      />

      <CareerFilters
        filter={filter}
        options={options}
        eraLabel={null}
        onChange={applyFilters}
        onClear={() => applyFilters(NO_FILTER)}
      />

      {summary.games === 0 && all.length > 0 ? (
        <EmptyFilter
          title={
            reason === 'year'
              ? `No games at ${filter.competition} in ${filter.year}.`
              : `No games in ${filter.competition}.`
          }
          body={
            reason === 'year'
              ? `${team.team_name} played at ${filter.competition}, just not in ${filter.year}. The year is what emptied this view.`
              : `${team.team_name} has no game in that competition. The competition is what emptied this view.`
          }
          action={reason === 'year' ? `Show every ${filter.competition} game` : 'Show every game'}
          onAction={() => applyFilters(recoverFilter(all, filter))}
        />
      ) : summary.games === 0 ? (
        <p className="border-line bg-ink-900 text-fog-300 rounded-xl border p-6 text-sm">
          The dataset carries no game for this team. The record exists, the games do not.
        </p>
      ) : (
        <>
          <StatRow>
            <Stat label="Events" value={count(summary.events.length)} />
            <Stat label="Games" value={count(summary.games)} />
            <Stat label="Win rate" value={<Ratio part={summary.wins} total={summary.games} />} />
            <Stat label="On blue" value={<Ratio part={summary.blue.wins} total={summary.blue.games} />} />
            <Stat label="On red" value={<Ratio part={summary.red.wins} total={summary.red.games} />} />
            <Stat label="Players used" value={count(roster.length)} />
          </StatRow>

          <p className="text-fog-600 mt-3 max-w-3xl text-xs leading-relaxed">
            <Link to="/glossary#blue-side" className="text-fog-300 hover:text-gold">
              Side preference
            </Link>{' '}
            is reported per view because it belongs to the era as much as to the team: the map favours a side differently from one season to the next.
          </p>

          <section className="mt-12">
            <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Titles</h2>
            <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
              Derived, not stored: an event&rsquo;s final is the single series named Finals, and the
              title goes to the team that won more games in it. Events whose final cannot be
              identified as one series — the Rift Rivals relays, where a region wins — award nothing
              here rather than guess a team.
            </p>

            {titleGroups.length === 0 ? (
              <p className="text-fog-600 text-sm">No title this team can be named for.</p>
            ) : (
              <div className="space-y-6">
                {titleGroups.map((group) => (
                  <div key={group.competition}>
                    <h3 className="text-fog-600 border-line mb-2 flex items-baseline justify-between border-b pb-1.5 text-[11px] tracking-[0.14em] uppercase">
                      <span>{group.competition}</span>
                      <span className="text-fog-500">
                        {group.titles.length} {group.titles.length === 1 ? 'title' : 'titles'}
                      </span>
                    </h3>
                    <ul className="divide-line divide-y">
                      {group.titles.map((title) => (
                        <li
                          key={title.eventKey}
                          className="flex flex-wrap items-baseline justify-between gap-3 py-2.5"
                        >
                          <span className="text-fog-100 text-sm">
                            {events.get(title.eventKey) ? (
                              <Link
                                to={`/events/${events.get(title.eventKey)!.event_id}`}
                                className="hover:text-gold"
                              >
                                {events.get(title.eventKey)!.event_name}
                              </Link>
                            ) : (
                              'Unknown event'
                            )}
                          </span>
                          <span className="text-fog-600 flex items-baseline gap-4 text-xs">
                            <span className="font-mono tabular-nums">
                              {title.wins} – {title.losses} in the final
                            </span>
                            <span className="font-mono">{dayMonthYear(title.date)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-12">
            <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Events</h2>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <p className="text-fog-500 text-sm leading-relaxed">
                {count(summary.events.length)} events in this selection.
              </p>
              {!isEmptyFilter(filter) ? (
                <span className="border-line bg-ink-850 text-fog-300 flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                  <span className="text-fog-600">filtered by</span>
                  {filter.competition ?? 'any competition'}
                  {filter.year !== null ? ` · ${filter.year}` : ''}
                  <button
                    type="button"
                    onClick={() => applyFilters({ ...filter, competition: null, year: null })}
                    className="text-fog-500 hover:text-gold"
                    aria-label="Clear the filter"
                  >
                    ✕
                  </button>
                </span>
              ) : null}
            </div>

            <div className="border-line overflow-x-auto rounded-xl border">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="text-fog-600 border-line border-b text-left text-[11px] tracking-wider uppercase">
                    <th className="px-2 py-2.5 font-medium sm:px-4">Event</th>
                    <th className="px-2 py-2.5 font-medium sm:px-4">Competition</th>
                    <th className="px-2 py-2.5 text-right font-medium sm:px-4">Games</th>
                    <th className="px-2 py-2.5 text-right font-medium sm:px-4">Won</th>
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {summary.events.map((entry) => {
                    const event = events.get(entry.eventKey)
                    return (
                      <tr key={entry.eventKey} className="hover:bg-ink-850/50">
                        <td className="text-fog-100 px-2 py-2 sm:px-4">
                          {event ? (
                            <Link to={`/events/${event.event_id}`} className="hover:text-gold">
                              {event.event_name}
                            </Link>
                          ) : (
                            'Unknown event'
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {event ? (
                            <span className="text-fog-500 flex items-center gap-1 text-xs">
                              <button
                                type="button"
                                onClick={() => applyFilters({ ...filter, competition: event.competition })}
                                className="hover:text-gold hover:underline"
                                title={`Show only this team's ${event.competition} games`}
                              >
                                {event.competition}
                              </button>
                              <span className="text-fog-600">·</span>
                              <button
                                type="button"
                                onClick={() => applyFilters({ ...filter, year: event.year })}
                                className="hover:text-gold hover:underline"
                                title={`Show only this team's ${event.year} games`}
                              >
                                {event.year}
                              </button>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums sm:px-4">{count(entry.games)}</td>
                        <td className="px-2 py-2 text-right sm:px-4">
                          <Ratio part={entry.wins} total={entry.games} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Current roster</h2>
            <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
              The players who appeared in the most recent game of this selection
              {visible.length > 0 ? ` (${dayMonthYear(visible[visible.length - 1]!.game.date_time_utc)})` : ''}
              . The corpus records who played, not who is signed, so the last game is the only
              evidence of who is on the team today.
            </p>

            {!prepared.ready ? (
              <div className="bg-ink-900 border-line h-24 animate-pulse rounded-xl border" />
            ) : current.length === 0 ? (
              <p className="text-fog-600 text-sm">No player rows for that game.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {current.map((entry) => (
                  <li key={entry.playerKey}>
                    <PlayerChip index={index} entry={entry} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">
              Everyone who played
            </h2>
            <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
              Derived from the player rows of every game in this selection. A player who joined and
              never played does not appear; one who left mid-season appears for the games they
              played.
            </p>

            {!prepared.ready ? (
              <div className="bg-ink-900 border-line h-32 animate-pulse rounded-xl border" />
            ) : roster.length === 0 ? (
              <p className="text-fog-600 text-sm">
                No player rows are recorded for these games. Their player-statistics coverage is
                unavailable.
              </p>
            ) : (
              <ul className="divide-line border-line divide-y border-y">
                {roster.map((entry) => (
                  <li
                    key={entry.playerKey}
                    className="flex flex-wrap items-baseline justify-between gap-3 py-2.5"
                  >
                    <span className="text-fog-200 text-sm">
                      {playerPath(index, entry.playerKey) ? (
                        <Link to={playerPath(index, entry.playerKey)!} className="hover:text-gold">
                          {playerName(index, entry.playerKey)}
                        </Link>
                      ) : (
                        playerName(index, entry.playerKey)
                      )}
                    </span>
                    <span className="text-fog-600 flex items-baseline gap-4 text-xs">
                      <span className="tabular-nums">{count(entry.games)} games</span>
                      <span className="font-mono">
                        {dayMonthYear(entry.first)} → {dayMonthYear(entry.last)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  )
}

/** One player in the current roster, as a link when the player has a page. */
function PlayerChip({
  index,
  entry,
}: {
  index: ReturnType<typeof buildIndexes>
  entry: { playerKey: number }
}) {
  const href = playerPath(index, entry.playerKey)
  const name = playerName(index, entry.playerKey)
  const chip = 'border-line bg-ink-850 text-fog-200 rounded-lg border px-3 py-1.5 text-sm'
  return href ? (
    <Link to={href} className={`${chip} hover:border-line-bright hover:text-gold block no-underline`}>
      {name}
    </Link>
  ) : (
    <span className={chip}>{name}</span>
  )
}
