import { useEffect, useState } from 'react'

import type { Era, EventRow, Meta, Totals } from './types'

/**
 * The whole dataset is three small JSON files, fetched once and kept in memory.
 * A guard queries, no backend: every view filters a few thousand rows, which is
 * faster than a round trip and works on a static host.
 */
export type Dataset = { eras: Era[]; events: EventRow[]; totals: Totals; meta: Meta }

const base = import.meta.env.BASE_URL

async function getJson<T>(name: string): Promise<T> {
  const response = await fetch(`${base}data/${name}`)
  if (!response.ok) throw new Error(`data/${name}: HTTP ${response.status}`)
  return (await response.json()) as T
}

let pending: Promise<Dataset> | null = null

export function loadDataset(): Promise<Dataset> {
  pending ??= Promise.all([
    getJson<Era[]>('eras.json'),
    getJson<EventRow[]>('events.json'),
    getJson<Totals[]>('totals.json'),
    getJson<Meta>('meta.json'),
  ]).then(([eras, events, totals, meta]) => ({ eras, events, totals: totals[0]!, meta }))
  return pending
}

export type DatasetState =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: Dataset; error: null }
  | { status: 'failed'; data: null; error: Error }

export function useDataset(): DatasetState {
  const [state, setState] = useState<DatasetState>({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let live = true
    loadDataset().then(
      (data) => live && setState({ status: 'ready', data, error: null }),
      (error: Error) => live && setState({ status: 'failed', data: null, error }),
    )
    return () => {
      live = false
    }
  }, [])

  return state
}
