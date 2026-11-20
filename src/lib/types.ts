/** One row of public/data/eras.json: a declared era joined to its measured facts. */
export type Era = {
  era: string
  /** First UTC date the era governs, from the upstream rule. */
  from: string
  /** The patch and source the boundary is cited from. */
  cites: string
  eligible_fields: number
  first_date: string | null
  last_date: string | null
  games: number
  series: number
  events: number
  teams: number
  players: number
  blue_wins: number
  red_wins: number
  games_draft_complete: number
  games_player_complete: number
  games_team_complete: number
  avg_duration_seconds: number | null
  patches: number
}

/** One row of public/data/events.json: an admitted event and what it contains. */
export type EventRow = {
  event_key: number
  event_id: string
  event_name: string
  /** The source's raw league string, kept for provenance. */
  league: string
  /** The canonical competition: 'Worlds', 'MSI', 'IEM', 'Rift Rivals', ... */
  competition: string
  region: string
  year: number
  date_start: string
  games: number
  series: number
  teams: number
  players: number
  first_date: string | null
  last_date: string | null
  blue_wins: number
  avg_duration_seconds: number | null
  eras: string | null
}

/** public/data/totals.json: one row, the whole corpus. The hero strip reads it. */
export type Totals = {
  games: number
  series: number
  events: number
  teams: number
  players: number
  events_admitted: number
  series_admitted: number
  teams_registered: number
  patches: number
  first_date: string
  last_date: string
  blue_wins: number
}

/** public/data/meta.json: the pin from a number on the site back to its payload. */
export type Meta = {
  source: {
    repository: string
    tag: string
    commit: string
    manifestSha256: string
    note?: string
  }
  modelFiles: Record<string, string>
  upstreamFiles: Record<string, string>
  artifacts: Record<string, string>
}
