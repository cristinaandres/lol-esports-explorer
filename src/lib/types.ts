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
  /** Games whose duration the source states; the n the average is over. */
  games_duration_stated: number
  avg_duration_seconds: number | null
  patches: number
}

/** One row of public/data/events.json: an admitted event and what it contains. */
export type EventRow = {
  event_key: number
  event_id: string
  event_name: string
  /**
   * The source's raw league string, kept for provenance.
   *
   * Null when the model states none (WCG 2011); `competition` already coalesces
   * that to 'Unknown'. An absent string is not an empty one: the event has no
   * league, it was not admitted under a blank.
   */
  league: string | null
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
  /** Games whose duration the source states; the n the average is over. */
  games_duration_stated: number
  avg_duration_seconds: number | null
  eras: string | null
  /** Coverage as the dataset measured it, null for an event with no game. */
  coverage_games: number | null
  team_complete: number | null
  draft_complete: number | null
  player_complete: number | null
}

/** One candidate event the inclusion rule considered, and what it decided. */
export type SelectionCandidate = {
  id: string
  name: string
  league: string
  region: string
  /** 'included' or 'rejected'. */
  decision: string
  /** The rule key that produced the decision. */
  rule: string
  key: string | null
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

/**
 * One row of public/data/matches.json: one series.
 *
 * The model's unknown member (`match_key` 0, the target of a game that belongs to
 * no series) is not published here: no series route resolves it, and every reader
 * words key 0 as "series not stated" before it consults this file. Games keep the
 * sentinel -- `Game.match_key` 0 still means "no series" -- so the artifact would
 * only add a row of nulls under three names the type says are strings.
 */
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
  /**
   * The position of the pick or ban within its phase, or null when the source
   * recorded no order.
   *
   * 3,821 bans -- every ban of the 641 unordered-draft games -- carry no slot: an
   * unordered draft states which champions were banned, not when. That is an
   * absence, not slot 0, which would sort a ban before every recorded one. Every
   * row of picks.json carries a slot, because the pipeline publishes ordered picks
   * only (`is_ordered = 1`), and a test holds that.
   */
  slot: number | null
  champion_key: number
}

export type Team = {
  team_key: number
  team_id: string
  team_name: string
  /** The wiki page the record comes from; null when it states none (4 teams). */
  overview_page: string | null
  /** Null when the model states no region (the same 4 teams). */
  region: string | null
  /** Games the team appears in, for the index. Zero when the corpus carries none. */
  games: number
  /** The abbreviation the game client shows, pinned from the wiki. Not a former name. */
  short_name: string | null
}

export type Player = {
  player_key: number
  player_id: string
  player_name: string
  /** The wiki page the record comes from; null for 39 players the model has none for. */
  overview_page: string | null
  games: number
}

export type Champion = {
  champion_key: number
  champion_id: string
  champion_name: string
  riot_key: number
  games: number
  /** The date the champion went live. Pinned from the wiki: the model has no such column. */
  release_date: string | null
}

export type Patch = {
  patch_key: number
  /**
   * The patch as the source states it, as text ('10.19', '25.05'). A label, not a
   * quantity: 25.05 and 25.5 are different patches, so a leading zero is kept. The
   * model declares it TEXT and the pipeline now reads it as such; it was arriving
   * as a number because CSV sniffing typed the column DOUBLE.
   */
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
