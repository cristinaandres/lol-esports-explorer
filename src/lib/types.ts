/** One row of public/data/eras.json: a declared era joined to its measured facts. */
export type Era = {
  era: string
  /** First UTC date the era governs, from the upstream rule. */
  from: string
  /** The patch and source the boundary is cited from. */
  cites: string
  eligible_fields: number
  /** Field names that could hold a value in this era, as the upstream rule spells them. */
  eligible: string[]
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

/** How much of a record the source carries, per group. */
export type Coverage = 'complete' | 'partial' | 'unavailable'

/**
 * One row of public/data/games.json.
 *
 * Every measure here can be null, and null means "the source did not record it",
 * which is not zero. The site renders that as an em dash.
 */
export type Game = {
  game_key: number
  game_id: string
  event_key: number
  /** 0 when the game is not attached to a series (42 games in the corpus). */
  match_key: number
  date_time_utc: string
  era: string
  /** 0 when the source states no patch. */
  patch_key: number
  duration_seconds: number | null
  /** 1 when the blue side won, 0 otherwise. */
  blue_win: number
  blue_team_key: number
  red_team_key: number
  draft_fidelity: 'ordered' | 'unordered'
  /** 1 when the source stated the draft with the sides swapped; null when unordered. */
  draft_switched_sides: number | null
  team_stats_coverage: Coverage
  draft_coverage: Coverage
  player_stats_coverage: Coverage
}

/** One row of public/data/matches.json: one series. */
export type Match = {
  /** Build-local. Never put this in a URL. */
  match_key: number
  /** The durable identifier, and what the series route uses. */
  match_id: string
  event_key: number
  match_name: string
  date_time_utc: string
  /** 1, 3 or 5. Null when the source stated no format (one series in the corpus). */
  best_of: number | null
  tab: string
  is_nullified: number | null
  forfeit: number | null
}

/** One row of public/data/sides.json: the scoreboard for one side of one game. */
export type Side = {
  game_key: number
  side: 'blue' | 'red'
  team_key: number
  is_winner: number
  kills: number | null
  gold: number | null
  towers: number | null
  inhibitors: number | null
  barons: number | null
  dragons: number | null
  dragons_clouds: number | null
  dragons_infernals: number | null
  dragons_mountains: number | null
  dragons_oceans: number | null
  dragons_hextechs: number | null
  dragons_chemtechs: number | null
  dragons_elders: number | null
  rift_heralds: number | null
  void_grubs: number | null
  atakhans: number | null
}

/** One row of public/data/player-games.json. */
export type PlayerGame = {
  game_key: number
  player_key: number
  team_key: number
  champion_key: number
  side: 'blue' | 'red'
  role: string
  kills: number
  deaths: number
  assists: number
  cs: number | null
  gold: number | null
  damage: number | null
  vision: number | null
}

/** One row of public/data/bans.json or picks.json: a draft slot. */
export type DraftSlot = {
  game_key: number
  side: 'blue' | 'red'
  entry_index: number
  slot: number
  champion_key: number
}

export type Team = {
  team_key: number
  team_id: string
  team_name: string
  overview_page: string
  region: string
}

export type Player = {
  player_key: number
  player_id: string
  player_name: string
  overview_page: string
}

export type Champion = {
  champion_key: number
  champion_id: string
  champion_name: string
  riot_key: number
}

export type Patch = {
  patch_key: number
  patch: string
  patch_name: string
}

/** The three kinds of entity the alias bridge covers. */
export type AliasKind = 'player' | 'team' | 'champion'

/**
 * One row of public/data/aliases.json: a name an entity has been known by.
 *
 * `valid_from` is the difference between a rename and a redirect. A stated window
 * means the name was in use in that period and may be shown to a reader; a row
 * with no window is a wiki redirect, which is worth matching but not printing.
 */
export type AliasRow = {
  kind: AliasKind
  alias_string: string
  entity_id: string
  entity_name: string
  valid_from: string | null
  valid_to: string | null
  evidence: string
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
