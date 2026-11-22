import { useMemo } from 'react'
import { Link, useParams } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { Skeleton } from '../components/Skeleton'
import { CoverageRow } from '../components/Coverage'
import { SeriesList } from '../components/SeriesList'
import { PageHeader } from '../components/PageHeader'
import { Ratio } from '../components/Ratio'
import { Stat, StatRow } from '../components/Stat'
import { HoverNote } from '../components/HoverNote'
import { LoadFailure } from '../components/LoadFailure'
import { useDataset, useGameCorpus, useHonours } from '../lib/data'
import { eraCopy } from '../lib/eras'
import { count, duration, dayMonthYear } from '../lib/format'
import { buildIndexes, playerName, playerPath, teamName, teamPath } from '../lib/indexes'
import { groupGamesBySeries } from '../lib/series'
import { groupByPhase, phasePath } from '../lib/phases'
import { championships } from '../lib/titles'
import { distinctionsForEvent } from '../lib/honours'
import { teamsOfGames } from '../lib/team'

export default function EventDetail() {
  const { event: id } = useParams()
  const state = useDataset()
  const corpus = useGameCorpus()
  const honours = useHonours()

  const prepared = useMemo(() => {
    if (state.status !== 'ready' || corpus.status !== 'ready') return null
    const data = state.data
    const event = data.events.find((row) => row.event_id === id)
    if (!event) return { event: undefined } as const

    const allGames = corpus.data.games
    const allMatches = corpus.data.matches
    const games = allGames.filter((game) => game.event_key === event.event_key)
    const matches = new Map(
      allMatches.filter((match) => match.event_key === event.event_key).map((match) => [match.match_key, match]),
    )
    const grouped = groupGamesBySeries(games)
    return {
      event,
      games,
      matches,
      grouped,
      phases: groupByPhase(grouped.series, matches),
      champs: championships(allGames, allMatches),
      teams: teamsOfGames(games),
      index: buildIndexes(data),
    } as const
  }, [state, corpus, id])

  if (state.status === 'loading' || corpus.status === 'loading') return <Skeleton shape="page" />
  if (state.status === 'failed')
    return (
      <LoadFailure
        failures={[{ what: 'the dataset', error: state.error }]}
        onRetry={state.retry}
      />
    )
  if (corpus.status === 'failed')
    return (
      <LoadFailure failures={[{ what: 'the games', error: corpus.error }]} onRetry={corpus.retry} />
    )
  if (!prepared?.event) {
    return (
      <p className="text-fog-300">
        No event called <code>{id}</code>.{' '}
        <Link to="/eras" className="text-gold">
          Back to the eras
        </Link>
        .
      </p>
    )
  }

  const { event, matches, grouped, phases, index, teams } = prepared
  // The source's own awards for this event, in its words. Absent for the 35 events
  // that state none, which is a fact about the source and not a gap the site hides.
  const distinctions =
    honours.status === 'ready' ? distinctionsForEvent(honours.data, event.event_key, index.players) : []
  const champion = prepared.champs.get(event.event_key)
  const eraId = event.eras?.split(', ')[0] ?? ''
  // A crumb is a place. An event in no era has none, so it gets no crumb rather than
  // one labelled with a dash that is not a link.
  const eraCrumbs = eraId ? [{ label: eraCopy(eraId).title, to: `/eras/${eraId}` }] : []

  return (
    <>
      <Breadcrumbs
        items={[{ label: 'Eras', to: '/eras' }, ...eraCrumbs, { label: event.event_name }]}
      />

      <PageHeader
        eyebrow={`${event.competition === 'Unknown' ? 'competition not stated' : event.competition} · ${event.year}`}
        title={event.event_name}
        lead={undefined}
        aside={
          <div className="text-right">
            {champion ? (
              <p className="text-fog-300 mb-2 text-sm">
                won by{' '}
                {teamPath(index, champion.teamKey) ? (
                  <Link to={teamPath(index, champion.teamKey)!} className="text-gold hover:underline">
                    {teamName(index, champion.teamKey)}
                  </Link>
                ) : (
                  <span className="text-gold">{teamName(index, champion.teamKey)}</span>
                )}{' '}
                <span className="text-fog-600 font-mono text-xs">
                  {champion.wins} – {champion.losses} in the final
                </span>
              </p>
            ) : null}
            <p className="text-fog-600 font-mono text-xs leading-relaxed">
              {/* A game-less event has no span: say so rather than print a dash either side
                  of an arrow, which reads like a date the source lost. */}
              {event.first_date && event.last_date
                ? `${dayMonthYear(event.first_date)} → ${dayMonthYear(event.last_date)}`
                : 'no game played, so no span'}
              <br />
              {eraId
                ? `${eraCopy(eraId).title}${event.eras?.includes(',') ? ' (spans more than one era)' : ''}`
                : 'no era declared'}
            </p>
          </div>
        }
      />

      <StatRow>
        <Stat label="Games" value={count(event.games)} />
        <Stat label="Series" value={count(event.series)} />
        <Stat label="Teams" value={count(event.teams)} />
        <Stat label="Players" value={count(event.players)} />
        <Stat
          label="Avg length"
          value={<span className="text-lg">{duration(event.avg_duration_seconds)}</span>}
          hint={`${count(event.games_duration_stated)} of ${count(event.games)} games state a length`}
        />
        <Stat label="Blue side won" value={<Ratio part={event.blue_wins} total={event.games} />} />
      </StatRow>

      {event.coverage_games && event.coverage_games > 0 ? (
        <section className="mt-10">
          <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">
            What this event can be measured on
          </h2>
          <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
            Coverage is not uniform inside an era: an event can carry every game and still record no
            team statistics. These are this event&rsquo;s own counts, not its era&rsquo;s.
          </p>

          <dl className="divide-line border-line max-w-2xl divide-y border-y">
            <CoverageRow label="Draft" part={event.draft_complete ?? 0} total={event.coverage_games} />
            <CoverageRow
              label="Player statistics"
              part={event.player_complete ?? 0}
              total={event.coverage_games}
            />
            <CoverageRow
              label="Team statistics"
              part={event.team_complete ?? 0}
              total={event.coverage_games}
            />
          </dl>
        </section>
      ) : null}

      {distinctions.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Distinctions</h2>
          <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
            Who the source honoured at this event, and for what, in its own words — stated, where
            the winner above is derived from the bracket.{' '}
            <HoverNote
              variant="icon"
              label="what a distinction is, and how the list is ordered"
              note="A distinction is a statement about a player — MVP or an All-Pro place. MVP-named titles are listed before the other places."
            >
              i
            </HoverNote>{' '}
            <Link to="/glossary#distinction" className="text-fog-300 hover:text-gold">
              What a distinction is
            </Link>
            .
          </p>

          <ul className="divide-line border-line divide-y border-y">
            {distinctions.map((row) => {
              const playerLink = playerPath(index, row.player_key)
              const teamLink = teamPath(index, row.team_key)
              return (
                <li
                  key={`${row.player_key}-${row.title}`}
                  className="flex flex-wrap items-baseline justify-between gap-3 py-2.5"
                >
                  <span className="text-fog-100 text-sm">
                    {playerLink ? (
                      <Link to={playerLink} className="hover:text-gold">
                        {playerName(index, row.player_key)}
                      </Link>
                    ) : (
                      playerName(index, row.player_key)
                    )}
                    <span className="text-gold"> · {row.title}</span>
                  </span>
                  <span className="text-fog-600 font-mono text-xs">
                    {/* An award whose team the source does not state is still the player's:
                        the unknown team prints nothing rather than "Unknown". */}
                    {teamLink ? (
                      <Link to={teamLink} className="hover:text-gold">
                        {teamName(index, row.team_key)}
                      </Link>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {grouped.series.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Phases</h2>
          <p className="text-fog-500 mb-8 max-w-3xl text-sm leading-relaxed">
            The competition as it was played, phase by phase. A best-of-one is shown as the game it
            is: there is no series page to open for a single game.
          </p>

          <div className="space-y-10">
            {phases.map((phase) => (
              <div key={phase.tab}>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-fog-100 text-base font-semibold tracking-tight">
                    {phase.tab === 'Unknown phase' ? (
                      phase.tab
                    ) : (
                      <Link to={phasePath(event.event_id, phase.tab)} className="hover:text-gold">
                        {phase.tab}
                      </Link>
                    )}
                  </h3>
                  <span className="text-fog-600 text-xs">
                    {count(phase.series.length)} series ·{' '}
                    {count(phase.series.reduce((sum, entry) => sum + entry.games.length, 0))} games
                  </span>
                </div>
                <SeriesList series={phase.series} matches={matches} index={index} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {teams.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">Teams</h2>
          <p className="text-fog-500 mb-5 max-w-3xl text-sm leading-relaxed">
            Every team the event&rsquo;s games name, with the games it played. The games column adds
            up to twice the event&rsquo;s game count, because every game has two sides.
          </p>

          <ul className="divide-line border-line divide-y border-y">
            {teams.map((team) => (
              <li key={team.teamKey} className="flex items-baseline justify-between gap-3 py-2.5">
                <span className="text-fog-200 text-sm">
                  {teamPath(index, team.teamKey) ? (
                    <Link to={teamPath(index, team.teamKey)!} className="hover:text-gold">
                      {teamName(index, team.teamKey)}
                    </Link>
                  ) : (
                    teamName(index, team.teamKey)
                  )}
                </span>
                <span className="flex items-baseline gap-4 text-xs">
                  <span className="text-fog-600 tabular-nums">{count(team.games)} games</span>
                  <Ratio part={team.wins} total={team.games} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-fog-600 mt-12 border-line border-t pt-5 text-xs">
        <Link to="/selection" className="text-fog-500 hover:text-fog-100">
          Why these events, and not others →
        </Link>
      </p>

      {grouped.orphans.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-fog-100 mb-1 text-lg font-semibold tracking-tight">
            Games without a series
          </h2>
          <p className="text-fog-500 mb-5 text-sm leading-relaxed">
            {count(grouped.orphans.length)} games at this event are not attached to a series in the
            source. They are listed here rather than dropped: a played game that no bracket row
            covers is still a played game.
          </p>

          <ol className="divide-line border-line divide-y border-y">
            {grouped.orphans.map((game) => (
              <li key={game.game_key} className="grid gap-2 py-3 sm:grid-cols-[7rem_1fr_auto] sm:items-center sm:gap-4">
                <span className="text-fog-600 font-mono text-xs">{dayMonthYear(game.date_time_utc)}</span>
                <Link
                  to={`/games/${game.game_id}`}
                  className="text-fog-100 hover:text-gold font-medium"
                >
                  {teamName(index, game.blue_team_key)} vs {teamName(index, game.red_team_key)}
                </Link>
                <span className="text-fog-600 font-mono text-xs">{duration(game.duration_seconds)}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  )
}
