import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { Skeleton } from '../components/Skeleton'
import { LoadFailure } from '../components/LoadFailure'
import { CareerFilters } from '../components/CareerFilters'
import { DataTable } from '../components/DataTable'
import { EmptyFilter } from '../components/EmptyFilter'
import { HoverNote } from '../components/HoverNote'
import { PageHeader } from '../components/PageHeader'
import { Ratio } from '../components/Ratio'
import { Stat, StatRow } from '../components/Stat'
import { namesFor } from '../lib/aliases'
import {
  appearancesFor,
  byRole,
  careerFrom,
  eventsOf,
  RECENT_FORM,
  recentForm,
  MIN_GAMES_FOR_RATE,
  rankByWinRate,
  type Appearance,
  type ChampionStat,
  type MeasureSummary,
} from '../lib/career'
import { useAliases, useDataset, useGameCorpus, usePlayerGames } from '../lib/data'
import { contextFor, parseFrom } from '../lib/context'
import { eraCopy } from '../lib/eras'
import {
  applyFilter,
  emptyReason,
  filterSearch,
  NO_FILTER,
  optionsFor,
  parseFilter,
  recoverFilter,
} from '../lib/filters'
import { championships, groupTitlesByCompetition, titlesForPlayer } from '../lib/titles'
import {
  count,
  dayMonthYear,
  duration,
  measureWithUnit,
  monthYear,
  perGame,
  seriesLabel,
} from '../lib/format'
import { buildIndexes, championName, championPath, teamName, teamPath } from '../lib/indexes'
import type { EventRow, Match } from '../lib/types'

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
  const corpus = useGameCorpus()
  const rows = usePlayerGames()
  const aliases = useAliases()
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = parseFilter(searchParams)
  const from = parseFrom(searchParams)

  const prepared = useMemo(() => {
    if (dataset.status !== 'ready' || corpus.status !== 'ready') return null
    const allGames = corpus.data.games
    const player = dataset.data.players.find((row) => row.player_id === id)
    if (!player) return { player: undefined } as const

    const index = buildIndexes(dataset.data)
    const appearances =
      rows.status === 'ready'
        ? appearancesFor(allGames, rows.data, player.player_key, index.competitions)
        : []

    const hit = contextFor(appearances, from)
    const context = hit
      ? {
          appearance: hit,
          event: dataset.data.events.find((event) => event.event_key === hit.game.event_key),
          match: corpus.data.matches.find((match) => match.match_key === hit.game.match_key),
          ...(() => {
            const siblings =
              hit.game.match_key === 0
                ? []
                : allGames
                    .filter((game) => game.match_key === hit.game.match_key)
                    .sort((a, b) => a.date_time_utc.localeCompare(b.date_time_utc))
            const position = siblings.findIndex((game) => game.game_key === hit.game.game_key)
            return { position: position >= 0 ? position + 1 : null, seriesGames: siblings.length }
          })(),
        }
      : null

    return {
      player,
      ready: rows.status === 'ready',
      appearances,
      context,
      former:
        aliases.status === 'ready'
          ? namesFor(aliases.data, 'player', player.player_id).map((row) => ({
              name: row.alias_string,
              from: row.valid_from,
              to: row.valid_to,
            }))
          : [],
      index,
      champs: championships(allGames, corpus.data.matches),
    } as const
  }, [dataset, corpus, rows, aliases, id, from])

  const applyFilters = (next: typeof filter) => {
    const params = new URLSearchParams(filterSearch(next))
    // The context survives a filter change: the reader came from a game and is
    // narrowing the career around it, not leaving the game behind.
    if (from) params.set('from', `game:${from}`)
    setSearchParams(params, { replace: true })
  }

  const clearContext = () => {
    setSearchParams(new URLSearchParams(filterSearch(filter)), { replace: true })
  }

  if (dataset.status === 'loading' || corpus.status === 'loading') return <Skeleton shape="page" />
  if (dataset.status === 'failed')
    return <p className="text-side-red">Could not load the dataset: {dataset.error.message}</p>
  if (corpus.status === 'failed')
    return (
      <LoadFailure failures={[{ what: 'the games', error: corpus.error }]} onRetry={corpus.retry} />
    )

  if (!prepared?.player) {
    return (
      <div className="py-12">
        <p className="text-fog-600 mb-3 font-mono text-xs tracking-widest uppercase">Not found</p>
        <h1 className="text-fog-100 text-2xl font-semibold tracking-tight">No player with that id.</h1>
        <p className="text-fog-300 mt-3 max-w-xl text-sm leading-relaxed">
          The id in the URL is the one the dataset uses, not a name. A player is reachable from any
          game they played.{' '}
          <Link to="/eras" className="text-gold">
            Back to the eras
          </Link>
          .
        </p>
      </div>
    )
  }

  const { player, former, index } = prepared
  const all = prepared.appearances
  const titles = titlesForPlayer(prepared.champs, all)
  const eventStats = eventsOf(all)
  const titleGroups = groupTitlesByCompetition(titles, (key) => prepared.index.events.get(key)?.competition)
  const visible = applyFilter(all, filter)
  const form = recentForm(visible)
  const roleSplits = byRole(visible)
  const career = prepared.ready ? careerFrom(visible) : null
  const options = optionsFor(all)
  const reason = emptyReason(all, filter)
  const context = prepared.context
  const eraLabel =
    career && career.eras.length > 0
      ? career.eras.length === 1
        ? eraCopy(career.eras[0]!).title
        : 'mixed'
      : null

  const roleLabel = career
    ? career.roles.map((role) => role.role.toLowerCase()).join(', ')
    : null

  // Win rate first, but only among champions with enough games for a rate to mean
  // something. A single win is 100%, and ranking it above 34 wins in 41 games
  // would make the top of the list the least reliable part of it.
  const ranked = career
    ? rankByWinRate(career.champions.filter((champion) => champion.games >= MIN_GAMES_FOR_RATE))
    : []
  const unranked = career
    ? rankByWinRate(career.champions.filter((champion) => champion.games < MIN_GAMES_FOR_RATE))
    : []
  // A role is only worth printing when there is more than one: 68 of the 1,140
  // players in the corpus played in two roles, and for the other 1,072 the label
  // would be the same word on every row.
  const showRole = (career?.roles.length ?? 0) > 1

  return (
    <>
      <Breadcrumbs items={[{ label: 'Players', to: '/players' }, { label: player.player_name }]} />

      <PageHeader
        eyebrow={roleLabel ? `player · ${roleLabel}` : 'player'}
        title={player.player_name}
        lead={
          aliases.status === 'failed' ? (
            <LoadFailure
              inline
              failures={[{ what: 'former names', error: aliases.error }]}
              onRetry={aliases.retry}
            />
          ) : former.length > 0 ? (
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

      {context ? (
        <ContextCard context={context} onClear={clearContext} index={index} />
      ) : null}

      {prepared.ready ? (
        <CareerFilters
          filter={filter}
          options={options}
          eraLabel={eraLabel}
          onChange={applyFilters}
          onClear={() => applyFilters(NO_FILTER)}
        />
      ) : null}

      {rows.status === 'failed' ? (
        <LoadFailure
          failures={[{ what: "this player's games", error: rows.error }]}
          onRetry={rows.retry}
        />
      ) : career === null ? (
        <Skeleton shape="table" tableHeight="h-48" />
      ) : career.games === 0 && all.length > 0 ? (
        <EmptyFilter
          title={
            reason === 'year'
              ? `No games at ${filter.competition} in ${filter.year}.`
              : reason === 'competition'
                ? `No games in ${filter.competition}.`
                : 'No games match both filters.'
          }
          body={
            reason === 'year'
              ? `${player.player_name} played at ${filter.competition}, just not in ${filter.year}. The year is what emptied this view.`
              : `${player.player_name} has no game in that competition. The competition is what emptied this view.`
          }
          action={reason === 'year' ? `Show every ${filter.competition} game` : 'Show every game'}
          onAction={() => applyFilters(recoverFilter(all, filter))}
        />
      ) : career.games === 0 ? (
        <p className="border-line bg-ink-900 text-fog-300 rounded-xl border p-6 text-sm">
          The dataset carries no game for this player. The record exists, the games do not — a fact
          about the corpus, not a missing page.
        </p>
      ) : (
        <>
          <StatRow>
            <Stat label="Events" value={count(eventStats.length)} />
            <Stat label="Games" value={count(career.games)} />
            <Stat label="Win rate" value={<Ratio part={career.wins} total={career.games} />} />
            <Stat
              label="KDA"
              value={career.kda === null ? '—' : career.kda.toFixed(2)}
              hint="summed, then divided"
            />
            <Stat
              label="K / D / A per game"
              value={
                <span className="text-lg">
                  {perGame(career.averages.kills)} / {perGame(career.averages.deaths)} /{' '}
                  {perGame(career.averages.assists)}
                </span>
              }
            />
            <Stat label="Eras" value={count(career.eras.length)} />
          </StatRow>

          <p className="text-fog-600 mt-3 max-w-3xl text-xs leading-relaxed">
            <Link to="/glossary#kda" className="text-fog-300 hover:text-gold">
              KDA
            </Link>{' '}
            = (kills + assists) / max(1, deaths), summed over every game before dividing. The
            totals sit beside each average for the same reason they do below: one death in four
            games and one in forty are not the same measurement.
          </p>

          <section className="mt-12">
            <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Titles</h2>
            <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
              Events where this player&rsquo;s team won the final and they appeared in it. Derived
              from the final series, so an event whose final cannot be identified awards nothing.
            </p>

            {titleGroups.length === 0 ? (
              <p className="text-fog-600 text-sm">No title this player can be named for.</p>
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
                            {prepared.index.events.get(title.eventKey) ? (
                              <Link
                                to={`/events/${prepared.index.events.get(title.eventKey)!.event_id}`}
                                className="hover:text-gold"
                              >
                                {prepared.index.events.get(title.eventKey)!.event_name}
                              </Link>
                            ) : (
                              'Unknown event'
                            )}
                          </span>
                          <span className="text-fog-600 font-mono text-xs">{dayMonthYear(title.date)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-12">
            <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Recent form</h2>
            <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
              The last {RECENT_FORM} games in this selection, newest first. A career average says what
              a player is; this says how they are playing now, which is the question before an event.
            </p>

            <DataTable
              minWidth="36rem"
              rowKey={(entry) => entry.game.game_key}
              rows={form}
              columns={[
                {
                  key: 'date',
                  label: 'Date',
                  primary: true,
                  render: (entry) => (
                    <span className="font-mono text-xs">{dayMonthYear(entry.game.date_time_utc)}</span>
                  ),
                },
                { key: 'competition', label: 'Competition', render: (entry) => entry.competition },
                {
                  key: 'opponent',
                  label: 'Opponent',
                  render: (entry) =>
                    teamName(index, entry.row.side === 'blue' ? entry.game.red_team_key : entry.game.blue_team_key),
                },
                {
                  key: 'champion',
                  label: 'Champion',
                  render: (entry) =>
                    championPath(index, entry.row.champion_key) ? (
                      <Link to={championPath(index, entry.row.champion_key)!} className="hover:text-gold">
                        {championName(index, entry.row.champion_key)}
                      </Link>
                    ) : (
                      championName(index, entry.row.champion_key)
                    ),
                },
                {
                  key: 'result',
                  label: 'Result',
                  render: (entry) =>
                    (entry.row.side === 'blue' ? entry.game.blue_win === 1 : entry.game.blue_win === 0) ? (
                      <span className="text-gold">win</span>
                    ) : (
                      <span className="text-fog-500">loss</span>
                    ),
                },
                {
                  key: 'kda',
                  label: 'K / D / A',
                  align: 'right',
                  render: (entry) => `${entry.row.kills} / ${entry.row.deaths} / ${entry.row.assists}`,
                },
              ]}
            />
          </section>

          {roleSplits.length > 1 ? (
            <section className="mt-12">
              <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">By role</h2>
              <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
                {roleSplits.length} roles over {count(career.games)} games. Averaging them together
                would describe nobody, so each is measured on its own.
              </p>

              <div className="border-line overflow-x-auto rounded-xl border">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-fog-600 border-line border-b text-left text-[11px] tracking-wider uppercase">
                      <th className="px-2 py-2.5 font-medium sm:px-4">Role</th>
                      <th className="px-2 py-2.5 text-right font-medium sm:px-4">Games</th>
                      <th className="px-2 py-2.5 text-right font-medium sm:px-4">Win rate</th>
                      <th className="px-2 py-2.5 text-right font-medium sm:px-4">KDA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-line divide-y">
                    {roleSplits.map((split) => (
                      <tr key={split.role} className="hover:bg-ink-850/50">
                        <td className="text-fog-100 px-2 py-2 sm:px-4">{split.role}</td>
                        <td className="px-2 py-2 text-right tabular-nums sm:px-4">{count(split.career.games)}</td>
                        <td className="px-2 py-2 text-right sm:px-4">
                          <Ratio part={split.career.wins} total={split.career.games} />
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums sm:px-4">
                          {split.career.kda === null ? '—' : split.career.kda.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="mt-12">
            <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Per game</h2>
            <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
              Each average is divided by the rows that state the measure, never by games. Where that
              is fewer than the games played, the cell in the last column says how many; hover it for
              the reason.
            </p>

            <div className="border-line overflow-x-auto rounded-xl border">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="text-fog-600 border-line border-b text-left text-[11px] tracking-wider uppercase">
                    <th className="px-2 py-2.5 font-medium sm:px-4">Measure</th>
                    <th className="px-2 py-2.5 text-right font-medium sm:px-4">Total</th>
                    <th className="px-2 py-2.5 text-right font-medium sm:px-4">Per game</th>
                    <th className="px-2 py-2.5 text-right font-medium sm:px-4">Games measured</th>
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  <MeasureRow
                    label="Kills"
                    games={career.games}
                    summary={{ sum: career.kills, measured: career.games, average: career.averages.kills, firstMeasured: null }}
                  />
                  <MeasureRow
                    label="Deaths"
                    games={career.games}
                    summary={{ sum: career.deaths, measured: career.games, average: career.averages.deaths, firstMeasured: null }}
                  />
                  <MeasureRow
                    label="Assists"
                    games={career.games}
                    summary={{ sum: career.assists, measured: career.games, average: career.averages.assists, firstMeasured: null }}
                  />
                  <MeasureRow label="CS" games={career.games} summary={career.measures.cs} note={coverageNote(career.measures.cs, career.games)} />
                  <MeasureRow label="Gold" games={career.games} summary={career.measures.gold} note={coverageNote(career.measures.gold, career.games)} />
                  <MeasureRow label="Damage" games={career.games} summary={career.measures.damage} note={coverageNote(career.measures.damage, career.games)} />
                  <MeasureRow label="Vision" games={career.games} summary={career.measures.vision} note={coverageNote(career.measures.vision, career.games)} />
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Champions</h2>
            <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
              {count(career.champions.length)} champions over {count(career.games)} games, ranked by
              win rate and then by games played. A champion needs at least{' '}
              {MIN_GAMES_FOR_RATE} games to be ranked: one win in one game is 100%, and 100% of one
              game is not a rate. The ones below the threshold are listed separately rather than
              hidden.
              {showRole
                ? ' A champion played in more than one role appears once per role: they are different jobs, not a bigger sample.'
                : ''}
            </p>

            <ChampionList champions={ranked} index={index} showRole={showRole} />

            {unranked.length > 0 ? (
              <>
                <h3 className="text-fog-600 mt-8 mb-3 text-[11px] tracking-[0.14em] uppercase">
                  Fewer than {MIN_GAMES_FOR_RATE} games
                </h3>
                <ChampionList champions={unranked} index={index} showRole={showRole} muted />
              </>
            ) : null}
          </section>

          <section className="mt-12">
            <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Events</h2>
            <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
              {count(eventStats.length)} events, newest first, with the games played in each. A
              player&rsquo;s record is read event by event, not as one long run.
            </p>

            <div className="border-line overflow-x-auto rounded-xl border">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="text-fog-600 border-line border-b text-left text-[11px] tracking-wider uppercase">
                    <th className="px-2 py-2.5 font-medium sm:px-4">Event</th>
                    <th className="px-2 py-2.5 font-medium sm:px-4">Competition</th>
                    <th className="px-2 py-2.5 text-right font-medium sm:px-4">Games</th>
                    <th className="px-2 py-2.5 text-right font-medium sm:px-4">Win rate</th>
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {eventStats.map((entry) => {
                    const event = prepared.index.events.get(entry.eventKey)
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
                        <td className="text-fog-500 px-2 py-2 sm:px-4">
                          {event ? `${event.competition} · ${event.year}` : '—'}
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
            <h2 className="text-fog-100 mb-3 text-lg font-semibold tracking-tight">Teams</h2>
              <ul className="divide-line border-line divide-y border-y">
                {career.teams.map((team) => (
                  <li key={team.key} className="flex items-baseline justify-between gap-3 py-2.5">
                    <span className="text-fog-300 text-sm">
                      {teamPath(index, team.key) ? (
                        <Link to={teamPath(index, team.key)!} className="hover:text-gold">
                          {teamName(index, team.key)}
                        </Link>
                      ) : (
                        teamName(index, team.key)
                      )}
                    </span>
                    <span className="flex items-baseline gap-3 text-xs">
                      <span className="text-fog-600 tabular-nums">{count(team.games)} games</span>
                      <Ratio part={team.wins} total={team.games} />
                    </span>
                  </li>
                ))}
              </ul>
          </section>
        </>
      )}
    </>
  )
}

function ContextCard({
  context,
  onClear,
  index,
}: {
  context: {
    appearance: Appearance
    event: EventRow | undefined
    match: Match | undefined
    position: number | null
    seriesGames: number
  }
  onClear: () => void
  index: ReturnType<typeof buildIndexes>
}) {
  const { appearance, event, match, position, seriesGames } = context
  const { game, row } = appearance
  const won = row.side === 'blue' ? game.blue_win === 1 : game.blue_win === 0
  const series = seriesLabel(game.match_key, match?.match_name)

  return (
    <section className="border-line bg-ink-900/60 mb-6 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-fog-600 text-[10px] tracking-[0.14em] uppercase">You came from</p>
          <p className="text-fog-100 mt-1.5">
            {event ? (
              <Link to={`/events/${event.event_id}`} className="hover:text-gold">
                {event.event_name}
              </Link>
            ) : (
              'Event'
            )}
            <span className="text-fog-600 m-2">·</span>
            <Link to={`/games/${game.game_id}`} className="hover:text-gold">
              {series}
              {position !== null && seriesGames > 1 ? ` · Game ${position}` : ''}
            </Link>
          </p>
          <p className="text-fog-500 mt-1 text-xs">
            {dayMonthYear(game.date_time_utc)} · {row.side} side ·{' '}
            <span className={won ? 'text-gold' : 'text-fog-500'}>{won ? 'won' : 'lost'}</span>
            <span className="text-fog-600"> · {duration(game.duration_seconds)}</span>
          </p>
        </div>

        <div className="text-right">
          <p className="text-fog-100 text-sm">
            {championPath(index, row.champion_key) ? (
              <Link to={championPath(index, row.champion_key)!} className="hover:text-gold">
                {championName(index, row.champion_key)}
              </Link>
            ) : (
              championName(index, row.champion_key)
            )}
          </p>
          <p className="text-fog-500 mt-1 font-mono text-xs">
            {row.kills} / {row.deaths} / {row.assists}
            <span className="text-fog-600"> · {measureWithUnit(row.cs, 'CS')}</span>
            <span className="text-fog-600"> · {measureWithUnit(row.gold, 'gold')}</span>
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClear}
        className="text-fog-500 hover:text-gold mt-3 text-xs underline-offset-4 hover:underline"
      >
        Career view — drop this game →
      </button>
    </section>
  )
}

function ChampionList({
  champions,
  index,
  showRole,
  muted = false,
}: {
  champions: ChampionStat[]
  index: ReturnType<typeof buildIndexes>
  showRole: boolean
  muted?: boolean
}) {
  return (
    <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
      {champions.map((champion) => (
        <li
          key={`${champion.role}|${champion.key}`}
          className="border-line/60 flex items-baseline justify-between gap-3 border-b py-1.5"
        >
          <span className={`truncate text-sm ${muted ? 'text-fog-500' : 'text-fog-300'}`}>
            {championPath(index, champion.key) ? (
              <Link to={championPath(index, champion.key)!} className="hover:text-gold">
                {championName(index, champion.key)}
              </Link>
            ) : (
              championName(index, champion.key)
            )}
            {showRole ? (
              <span className="text-fog-600 ml-2 text-[10px] tracking-wider uppercase">
                {champion.role}
              </span>
            ) : null}
          </span>
          <span className="shrink-0 text-xs">
            <Ratio part={champion.wins} total={champion.games} />
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Why a measure is stated on fewer games than the player played.
 *
 * Damage is recorded on 0% of the corpus before 2020 and on 100% from 2021, so the
 * gap is the source's, not the player's. Saying so on the cell keeps the reason
 * next to the number instead of in a paragraph the reader has to connect to it.
 */
function coverageNote(summary: MeasureSummary, games: number): string | null {
  if (summary.measured >= games) return null
  const missing = games - summary.measured
  const from = summary.firstMeasured ? monthYear(summary.firstMeasured) : null

  return from
    ? `Recorded from ${from} onwards. The ${count(missing)} earlier games state nothing, and are not counted as zero.`
    : `Recorded on ${count(summary.measured)} of ${count(games)} games. The rest state nothing, and are not counted as zero.`
}

function MeasureRow({
  label,
  summary,
  games,
  note,
}: {
  label: string
  summary: MeasureSummary
  games: number
  note?: string | null
}) {
  const coverage = (
    <>
      {count(summary.measured)} / {count(games)}
    </>
  )

  return (
    <tr className="hover:bg-ink-850/50">
      <td className="text-fog-100 px-2 py-2 sm:px-4">{label}</td>
      <td className="px-2 py-2 text-right tabular-nums sm:px-4">
        {summary.measured === 0 ? '—' : count(summary.sum)}
      </td>
      <td className="px-2 py-2 text-right tabular-nums sm:px-4">{perGame(summary.average)}</td>
      <td className="text-fog-600 px-4 py-2 text-right font-mono text-xs tabular-nums">
        {note ? <HoverNote note={note}>{coverage}</HoverNote> : coverage}
      </td>
    </tr>
  )
}
