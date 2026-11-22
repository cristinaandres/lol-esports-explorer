import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'

import { Breadcrumbs } from '../components/Breadcrumbs'
import { LoadFailure } from '../components/LoadFailure'
import { Skeleton } from '../components/Skeleton'
import { PageHeader } from '../components/PageHeader'
import { SelectField } from '../components/SelectField'
import { useDataset } from '../lib/data'
import { count } from '../lib/format'
import { groupIndexEntries, parseIndexSort, type IndexGroup } from '../lib/indexGroups'

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

type Entry = {
  id: string
  name: string
  meta: string
  games: number
  short?: string
  /** The entity's most-played role; null for teams, which have none. */
  role: string | null
}

// Only these two have a sort to offer: a team's grouping is its region, which is
// stated by the model and is the only way a reader looks for a club.
const SORTABLE: Record<Kind, boolean> = { player: true, team: false, champion: true }

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'role', label: 'Role' },
]

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
  // The sort and the filter are query parameters, like the career filters, so a grouped
  // index is a link a reader can send: `?sort=role&q=kaisa`. An unknown sort falls back
  // to name rather than an empty page.
  const [params, setParams] = useSearchParams()
  const sort = parseIndexSort(params.get('sort'))
  const sortable = SORTABLE[kind]
  const query = params.get('q') ?? ''

  const setQuery = (value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set('q', value)
    else next.delete('q')
    setParams(next, { replace: true })
  }

  const entries = useMemo<Entry[]>(() => {
    if (state.status !== 'ready') return []
    const data = state.data
    if (kind === 'player') {
      return data.players
        .filter((row) => row.player_id && row.games > 0)
        .map((row) => ({
          id: row.player_id,
          name: row.player_name,
          meta: '',
          games: row.games,
          role: row.primary_role,
        }))
    }
    if (kind === 'team') {
      return data.teams
        .filter((row) => row.team_id && row.games > 0)
        .map((row) => ({
          id: row.team_id,
          name: row.team_name,
          meta: row.region || 'Unknown region',
          games: row.games,
          short: row.short_name ?? undefined,
          role: null,
        }))
    }
    return data.champions
      .filter((row) => row.champion_id && row.games > 0)
      .map((row) => ({
        id: row.champion_id,
        name: row.champion_name,
        meta: '',
        games: row.games,
        role: row.primary_role,
      }))
  }, [state, kind])

  const groups = useMemo<IndexGroup<Entry>[]>(() => {
    const needle = query.trim().toLowerCase()
    // A team is looked up by its abbreviation as often as by its name: someone who
    // watches the client types KC, not Karmine Corp.
    const visible = needle
      ? entries.filter(
          (entry) =>
            entry.name.toLowerCase().includes(needle) ||
            (entry.short ?? '').toLowerCase().includes(needle),
        )
      : entries

    if (kind === 'team') {
      // A club has one region, and that is how a reader looks for it. The sort work
      // below is for the two indexes whose entities are played in roles.
      const grouped = new Map<string, Entry[]>()
      for (const entry of visible) {
        const bucket = grouped.get(entry.meta)
        if (bucket) bucket.push(entry)
        else grouped.set(entry.meta, [entry])
      }
      return [...grouped.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([label, items]) => ({
          label,
          items: items.sort((a, b) => b.games - a.games || a.name.localeCompare(b.name)),
        }))
    }

    return groupIndexEntries(visible, sort)
  }, [entries, query, kind, sort])

  const setSort = (value: string) => {
    const next = new URLSearchParams(params)
    if (value === 'name') next.delete('sort')
    else next.set('sort', value)
    setParams(next, { replace: true })
  }

  const total = entries.length
  const shown = groups.reduce((sum, group) => sum + group.items.length, 0)
  const copy = COPY[kind]

  if (state.status === 'loading') return <Skeleton shape="page" />
  if (state.status === 'failed')
    return (
      <LoadFailure
        failures={[{ what: 'the dataset', error: state.error }]}
        onRetry={state.retry}
      />
    )

  return (
    <>
      <Breadcrumbs items={[{ label: copy.title }]} />
      <PageHeader
        eyebrow={`Index · ${sortable && sort === 'role' ? 'by role' : copy.groupLabel}`}
        title={copy.title}
        lead={
          sortable && sort === 'role'
            ? `${count(total)} in the corpus, grouped by the role they were played in most. Each one carries the number of games it appears in, and the list is ordered by that number inside each group.`
            : `${count(total)} in the corpus. Each one carries the number of games it appears in, and the list is ordered by that number inside each group.`
        }
        aside={
          <div className="flex flex-wrap items-end gap-3">
            {sortable ? (
              <SelectField
                label="Sort by"
                value={sort}
                onChange={setSort}
                options={SORT_OPTIONS}
              />
            ) : null}
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Filter ${kind}s`}
              aria-label={`Filter ${kind}s by name`}
              className="border-line bg-ink-900 text-fog-100 placeholder:text-fog-600 focus-visible:outline-gold w-56 rounded-lg border px-3 py-1.5 text-sm"
            />
          </div>
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
                      className="text-fog-300 hover:text-gold flex min-w-0 items-baseline gap-2 truncate text-sm no-underline"
                    >
                      <span className="truncate">{entry.name}</span>
                      {entry.short ? (
                        <span className="text-fog-600 shrink-0 font-mono text-[10px]">
                          {entry.short}
                        </span>
                      ) : null}
                    </Link>
                    <span className="text-fog-600 flex shrink-0 items-baseline gap-2 text-xs tabular-nums">
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
