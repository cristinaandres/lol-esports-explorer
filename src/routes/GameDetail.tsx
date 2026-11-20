import { useMemo } from 'react'
import { Link, useParams } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { CoverageBadge } from '../components/CoverageBadge'
import { DraftBoard } from '../components/DraftBoard'
import { PageHeader } from '../components/PageHeader'
import { PlayerTable } from '../components/PlayerTable'
import { Scoreboard } from '../components/Scoreboard'
import { useDataset, useGameDetail, type Dataset } from '../lib/data'
import { eraCopy } from '../lib/eras'
import { dayMonthYear, duration } from '../lib/format'
import { buildIndexes, patchLabel, teamName } from '../lib/indexes'

/** The era's declared eligible fields, or an empty list when the era is unknown. */
function eraEligible(data: Dataset, eraId: string): string[] {
  return data.eras.find((row) => row.era === eraId)?.eligible ?? []
}

export default function GameDetail() {
  const { game: id } = useParams()
  const dataset = useDataset()
  const detail = useGameDetail()

  const prepared = useMemo(() => {
    if (dataset.status !== 'ready') return null
    const data = dataset.data
    const game = data.games.find((row) => row.game_id === id)
    if (!game) return { game: undefined } as const

    const event = data.events.find((row) => row.event_key === game.event_key)
    const match = data.matches.find((row) => row.match_key === game.match_key)
    const siblings =
      game.match_key === 0
        ? []
        : data.games
            .filter((row) => row.match_key === game.match_key)
            .sort((a, b) => a.date_time_utc.localeCompare(b.date_time_utc))

    return {
      game,
      event,
      match,
      siblings,
      position: siblings.findIndex((row) => row.game_key === game.game_key),
      index: buildIndexes(data),
    } as const
  }, [dataset, id])

  if (dataset.status === 'loading') return <p className="text-fog-600">Loading…</p>
  if (dataset.status === 'failed')
    return <p className="text-side-red">Could not load the dataset: {dataset.error.message}</p>

  if (!prepared?.game) {
    return (
      <p className="text-fog-300">
        No game called <code>{id}</code>.{' '}
        <Link to="/" className="text-gold">
          Back to the eras
        </Link>
        .
      </p>
    )
  }

  const { game, event, match, siblings, position, index } = prepared
  const eraId = game.era ?? ''
  const previous = position > 0 ? siblings[position - 1] : undefined
  const next = position >= 0 ? siblings[position + 1] : undefined

  const sides = detail.data?.sides.filter((row) => row.game_key === game.game_key) ?? []
  const playerGames = detail.data?.playerGames.filter((row) => row.game_key === game.game_key) ?? []

  return (
    <>
      <Breadcrumbs
        items={[
          { label: eraId ? eraCopy(eraId).title : '—', to: eraId ? `/eras/${eraId}` : undefined },
          {
            label: event?.event_name ?? 'Event',
            to: event ? `/events/${event.event_id}` : undefined,
          },
          ...(match && siblings.length > 1
            ? [{ label: match.match_name || 'Series', to: `/series/${match.match_id}` }]
            : []),
          { label: position >= 0 && siblings.length > 1 ? `Game ${position + 1}` : 'Game' },
        ]}
      />

      <PageHeader
        eyebrow={`${event?.competition ?? '—'} · ${dayMonthYear(game.date_time_utc)}`}
        title={
          <>
            {teamName(index, game.blue_team_key)}{' '}
            <span className="text-fog-600 font-normal">vs</span>{' '}
            {teamName(index, game.red_team_key)}
          </>
        }
        aside={
          <p className="text-fog-600 text-right font-mono text-xs leading-relaxed">
            {duration(game.duration_seconds)} · patch {patchLabel(index, game.patch_key)}
            <br />
            {eraCopy(eraId).title}
          </p>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <CoverageBadge group="team stats" state={game.team_stats_coverage} />
        <CoverageBadge group="draft" state={game.draft_coverage} />
        <CoverageBadge group="player stats" state={game.player_stats_coverage} />
      </div>

      {detail.status === 'ready' ? (
        <div className="space-y-8">
          <Scoreboard
            game={game}
            sides={sides}
            index={index}
            eligible={eraEligible(dataset.data, eraId)}
          />
          <DraftBoard
            game={game}
            picks={detail.data.picks}
            bans={detail.data.bans}
            playerGames={playerGames}
            index={index}
          />
          <section>
            <h2 className="text-fog-100 mb-3 text-lg font-semibold tracking-tight">Players</h2>
            <PlayerTable playerGames={playerGames} index={index} />
          </section>
        </div>
      ) : detail.status === 'failed' ? (
        <p className="text-side-red text-sm">
          Could not load the game detail: {detail.error.message}
        </p>
      ) : (
        <div className="space-y-3">
          <div className="bg-ink-900 border-line h-40 animate-pulse rounded-xl border" />
          <div className="bg-ink-900 border-line h-56 animate-pulse rounded-xl border" />
        </div>
      )}

      {previous || next ? (
        <nav className="border-line mt-12 flex items-center justify-between gap-4 border-t pt-6 text-sm">
          {previous ? (
            <Link to={`/games/${previous.game_id}`} className="text-fog-500 hover:text-fog-100">
              ← Game {position}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={`/games/${next.game_id}`} className="text-fog-500 hover:text-fog-100">
              Game {position + 2} →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  )
}
