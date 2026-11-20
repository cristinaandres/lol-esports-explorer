import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { PageSkeleton } from '../components/PageSkeleton'
import { PageHeader } from '../components/PageHeader'
import { useDataset } from '../lib/data'
import { count } from '../lib/format'

/**
 * The index for one kind of entity.
 *
 * Three routes share this page because they answer the same question — *which of
 * these are worth opening* — and answer it the same way: every entity with the
 * number of games it appears in, grouped so a list of 1,140 names stays navigable.
 *
 * The breadcrumb on an entity page starts here rather than at the eras: a player
 * does not live inside an era, and saying so in the trail was the bug that asked
 * for this page.
 */

type Kind = 'player' | 'team' | 'champion'

type Entry = { id: string; name: string; meta: string; games: number }

const COPY: Record<Kind, { title: string; blurb: string; groupLabel: string }> = {
  player: {
    title: 'Players',
    blurb: 'Every player the corpus carries a game for.',
    groupLabel: 'by initial',
  },
  team: {
    title: 'Teams',
    blurb: 'Every team that appears in a game, grouped by region.',
    groupLabel: 'by region',
  },
  champion: {
    title: 'Champions',
    blurb: 'Every champion the corpus carries a draft for.',
    groupLabel: 'by initial',
  },
}

export default function EntityIndex({ kind }: { kind: Kind }) {
  const state = useDataset()
  const [query, setQuery] = useState('')

  const entries = useMemo<Entry[]>(() => {
    if (state.status !== 'ready') return []
    const data = state.data
    if (kind === 'player') {
      return data.players
        .filter((row) => row.player_id && row.games > 0)
        .map((row) => ({ id: row.player_id, name: row.player_name, meta: '', games: row.games }))
    }
    if (kind === 'team') {
      return data.teams
        .filter((row) => row.team_id && row.games > 0)
        .map((row) => ({
          id: row.team_id,
          name: row.team_name,
          meta: row.region || 'Unknown region',
          games: row.games,
        }))
    }
    return data.champions
      .filter((row) => row.champion_id && row.games > 0)
      .map((row) => ({ id: row.champion_id, name: row.champion_name, meta: '', games: row.games }))
  }, [state, kind])

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const visible = needle
      ? entries.filter((entry) => entry.name.toLowerCase().includes(needle))
      : entries

    const grouped = new Map<string, Entry[]>()
    for (const entry of visible) {
      const key =
        kind === 'team'
          ? entry.meta
          : /^[a-z]/i.test(entry.name)
            ? entry.name[0]!.toUpperCase()
            : '#'
      const bucket = grouped.get(key)
      if (bucket) bucket.push(entry)
      else grouped.set(key, [entry])
    }

    return [...grouped.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, items]) => ({
        label,
        items: items.sort((a, b) => b.games - a.games || a.name.localeCompare(b.name)),
      }))
  }, [entries, query, kind])

  const total = entries.length
  const shown = groups.reduce((sum, group) => sum + group.items.length, 0)
  const copy = COPY[kind]

  if (state.status === 'loading') return <PageSkeleton />
  if (state.status === 'failed')
    return <p className="text-side-red">Could not load the dataset: {state.error.message}</p>

  return (
    <>
      <Breadcrumbs items={[{ label: copy.title }]} />
      <PageHeader
        eyebrow={`Index · ${copy.groupLabel}`}
        title={copy.title}
        lead={`${count(total)} in the corpus. Each one carries the number of games it appears in, and the list is ordered by that number inside each group.`}
        aside={
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Filter ${kind}s`}
            aria-label={`Filter ${kind}s by name`}
            className="border-line bg-ink-900 text-fog-100 placeholder:text-fog-600 focus-visible:outline-gold w-56 rounded-lg border px-3 py-2 text-sm"
          />
        }
      />

      {shown === 0 ? (
        <p className="text-fog-500 text-sm">
          No {kind} matches “{query}”. <span className="text-fog-600">{count(total)} in the corpus.</span>
        </p>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="text-fog-600 border-line mb-3 flex items-baseline justify-between border-b pb-1.5 text-[11px] tracking-[0.14em] uppercase">
                <span>{group.label}</span>
                <span className="text-fog-600">{count(group.items.length)}</span>
              </h2>
              <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((entry) => (
                  <li
                    key={entry.id}
                    className="border-line/60 flex items-baseline justify-between gap-3 border-b py-1.5"
                  >
                    <Link
                      to={`/${kind}s/${entry.id}`}
                      className="text-fog-300 hover:text-gold truncate text-sm no-underline"
                    >
                      {entry.name}
                    </Link>
                    <span className="text-fog-600 flex shrink-0 items-baseline gap-2 text-xs tabular-nums">
                      {entry.meta && kind === 'team' ? null : null}
                      {count(entry.games)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
