import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { loadAliases, useDataset } from '../lib/data'
import { buildSearchIndex, resultPath, search, type SearchResult } from '../lib/search'
import type { AliasRow } from '../lib/types'

/**
 * Search by any name an entity has ever had.
 *
 * The alias bridge is 63 KB and is fetched only after the reader touches the box:
 * a page they are reading should not pay for a search they never start. The index
 * is built once and kept.
 *
 * Keyboard: arrows move, Enter opens, Escape closes. The result count is announced
 * through a live region, because a list that appears silently is a list a screen
 * reader never mentions.
 */
export function SearchBox({ fullWidth = false }: { fullWidth?: boolean }) {
  const dataset = useDataset()
  const navigate = useNavigate()

  const [armed, setArmed] = useState(false)
  const [aliases, setAliases] = useState<AliasRow[] | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const wrapper = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!armed || aliases) return
    let live = true
    loadAliases().then((rows) => live && setAliases(rows))
    return () => {
      live = false
    }
  }, [armed, aliases])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const index = useMemo(() => {
    if (dataset.status !== 'ready') return []
    return buildSearchIndex(dataset.data.players, dataset.data.teams, dataset.data.champions, aliases ?? [])
  }, [dataset, aliases])

  const results = useMemo(() => search(index, query), [index, query])

  const go = (result: SearchResult) => {
    // The query is kept, not cleared: coming back to the page you searched from
    // must still show what you typed, which is also what makes the result list one
    // focus away instead of one retype away.
    setOpen(false)
    navigate(resultPath(result))
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!open || results.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => (current + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => (current - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const chosen = results[active]
      if (chosen) go(chosen)
    }
  }

  // The groups follow the ranking, not a fixed order: an exact team short name must
  // not sit below a player whose handle merely contains the same letters.
  const grouped = [...new Set(results.map((result) => result.kind))]

  return (
    <div ref={wrapper} className={fullWidth ? 'relative w-full' : 'relative'}>
      <input
        ref={input}
        type="search"
        value={query}
        placeholder="Search"
        aria-label="Search a player, team or champion by any name"
        aria-expanded={open}
        aria-controls={listId}
        role="combobox"
        onFocus={() => {
          setArmed(true)
          if (query.length > 0) setOpen(true)
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
        className={`border-line bg-ink-900 text-fog-100 placeholder:text-fog-600 focus-visible:outline-gold rounded-lg border px-2.5 py-1.5 text-xs transition-[width] ${
          fullWidth ? 'w-full' : 'w-48 focus:w-64'
        }`}
      />

      <span role="status" aria-live="polite" className="sr-only">
        {open && query.length > 0
          ? `${results.length} ${results.length === 1 ? 'result' : 'results'}`
          : ''}
      </span>

      {open && query.length > 0 ? (
        <div
          id={listId}
          role="listbox"
          className="border-line bg-ink-900 absolute top-full right-0 z-40 mt-2 max-h-80 w-80 max-w-[calc(100vw-2.5rem)] overflow-y-auto rounded-xl border p-1.5 shadow-2xl"
        >
          {results.length === 0 ? (
            <p className="text-fog-500 px-2.5 py-2 text-xs">
              {aliases === null ? 'Loading names…' : `No player, team or champion matches “${query}”.`}
            </p>
          ) : (
            grouped.map((kind) => {
              const ofKind = results.filter((result) => result.kind === kind)
              if (ofKind.length === 0) return null
              return (
                <div key={kind} className="mb-1 last:mb-0">
                  <p className="text-fog-600 px-2.5 pt-1.5 pb-1 text-[10px] tracking-wider uppercase">
                    {kind}s · {ofKind.length}
                  </p>
                  {ofKind.map((result) => {
                    const position = results.indexOf(result)
                    return (
                      <button
                        key={result.id}
                        type="button"
                        role="option"
                        aria-selected={position === active}
                        onMouseEnter={() => setActive(position)}
                        onClick={() => go(result)}
                        className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-sm ${
                          position === active ? 'bg-ink-850 text-gold' : 'text-fog-200'
                        }`}
                      >
                        {result.name}
                        {!result.current ? (
                          <span className="text-fog-600 ml-2 text-[11px]">
                            formerly {result.matched}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}
