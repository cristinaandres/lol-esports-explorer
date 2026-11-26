import type {
  AnswerRecord,
  Interval,
  QuestionArtifact,
  SeriesPoint,
  Window,
} from './answer'

/**
 * Hand-written records for the contract's four families and every verdict.
 *
 * They are fixtures, not data: the numbers are the pin's where the dossier measured
 * them (Azir 148/232, Senna 8.44 in 21 games, Teemo 4 in 3,091), so a reader of a
 * failing test can tell whether the formatter or the fixture moved.
 */

const PIN = 'f919082ad4ab90fa8c7e8a88d2bd55528bdc9739f0393cf02dcfb3a4e991a67d'

function wilson(low: number, high: number): Interval {
  return { level: 0.95, low, high, method: 'wilson' }
}

function bootstrap(low: number, high: number): Interval {
  return { level: 0.95, low, high, method: 'bootstrap-percentile' }
}

function simulation(low: number, high: number): Interval {
  return { level: 0.9, low, high, method: 'simulation-percentile' }
}

function window(overrides: Partial<Window> & Pick<Window, 'key' | 'label'>): Window {
  return {
    season: null,
    date_from: '2011-06-18',
    date_to: '2026-11-14',
    cut_date: '2026-11-14',
    patches: 'all patches',
    games: 3091,
    events: 52,
    records: { best: null, worst: null },
    ...overrides,
  }
}

function record(overrides: Partial<AnswerRecord> & Pick<AnswerRecord, 'verdict' | 'headline' | 'evidence'>): AnswerRecord {
  return { end: 'best', ...overrides }
}

export const PRESENCE_CANDIDATES = [
  { name: 'Azir', path: '/champions/ch-1', metric: 0.638, part: 148, n: 232, interval: wilson(0.574, 0.697), lower_bound: 0.574, upper_bound: 0.697 },
  { name: 'Poppy', path: '/champions/ch-2', metric: 0.578, part: 134, n: 232, interval: wilson(0.514, 0.639), lower_bound: 0.514, upper_bound: 0.639 },
  { name: 'Taliyah', path: '/champions/ch-3', metric: 0.522, part: 121, n: 232, interval: wilson(0.459, 0.584), lower_bound: 0.459, upper_bound: 0.584 },
  { name: 'Varus', path: '/champions/ch-4', metric: 0.517, part: 120, n: 232, interval: wilson(0.454, 0.580), lower_bound: 0.454, upper_bound: 0.580 },
  { name: 'Vi', path: '/champions/ch-5', metric: 0.513, part: 119, n: 232, interval: wilson(0.450, 0.576), lower_bound: 0.450, upper_bound: 0.576 },
]

export const presence: QuestionArtifact = {
  id: 'champion-presence',
  class: 'champions',
  family: 'top-1',
  question: 'Which champion was present in the most games?',
  thresholds: { min_n: 20, top_k: 5, top_max: 20, resamples: 10000, seed: 20261126 },
  source: { view: 'cb_game_presence', artifact: 'almanac-champion-presence.json', sha256: PIN },
  limits: [
    'Only teams that qualified for an international event appear in the corpus.',
    'A presence is a pick or a ban, not a probability.',
    'The window is one season, on its patches: not a statement about the next one.',
  ],
  windows: [
    window({ key: 'all', label: 'All games' }),
    window({
      key: 'season:2025',
      label: 'Season 2025',
      season: 2025,
      date_from: '2025-03-10',
      date_to: '2025-11-09',
      cut_date: '2025-11-09',
      patches: ['25.05', '25.13', '25.2'],
      games: 232,
      events: 4,
      records: {
        best: record({
          verdict: 'answered',
          headline: {
            text: '64% (95% CI: 57–70%, n=232)',
            value: 0.638,
            unit: 'share',
            n: 232,
            interval: wilson(0.574, 0.697),
          },
          evidence: {
            metric: 'presence',
            value: 0.638,
            part: 148,
            n: 232,
            denominator: 232,
            grain: 'game',
            role: null,
          },
          candidates: PRESENCE_CANDIDATES,
          top: 5,
        }),
        worst: null,
      },
    }),
  ],
  series: [
    { bucket: 'season', label: '2025', value: 0.638, part: 148, n: 232, denominator: 232, interval: wilson(0.574, 0.697) },
  ],
}

export const championKda: QuestionArtifact = {
  id: 'champion-kda',
  class: 'champions',
  family: 'top-1',
  question: 'Which champion had the best KDA, and the worst?',
  thresholds: { min_n: 20, top_k: 5, top_max: 20, resamples: 10000, seed: 20261126 },
  source: { view: 'cb_champion_games', artifact: 'almanac-champion-kda.json', sha256: PIN },
  limits: [
    'Only teams that qualified for an international event appear in the corpus.',
    'KDA is a ratio of counts, not a share; the interval is a bootstrap.',
  ],
  windows: [
    window({
      key: 'season:2025',
      label: 'Season 2025',
      season: 2025,
      date_from: '2025-03-10',
      date_to: '2025-11-09',
      cut_date: '2025-11-09',
      patches: ['25.05', '25.13', '25.2'],
      games: 232,
      events: 4,
      records: {
        best: record({
          verdict: 'answered',
          headline: {
            text: '8.44 (95% CI: 5.25–14.95, n=21)',
            value: 8.44,
            unit: 'kda',
            n: 21,
            interval: bootstrap(5.25, 14.95),
          },
          evidence: {
            metric: 'KDA',
            value: 8.44,
            part: null,
            n: 21,
            denominator: null,
            grain: 'champion-game',
            role: null,
          },
          candidates: [
            { name: 'Senna', path: '/champions/ch-6', metric: 8.44, part: 79, n: 21, interval: bootstrap(5.25, 14.95), lower_bound: 5.25, upper_bound: 14.95 },
          ],
          top: 5,
        }),
        worst: null,
      },
    }),
  ],
  series: [],
}

export const teemo: QuestionArtifact = {
  id: 'teemo-picked',
  class: 'champions',
  family: 'yes-no',
  question: 'Will Teemo be picked?',
  thresholds: { min_n: 20, top_k: 5, top_max: 20, resamples: 10000, seed: 20261126 },
  source: { view: 'cb_season_presence', artifact: 'almanac-teemo-picked.json', sha256: PIN },
  limits: [
    'Only teams that qualified for an international event appear in the corpus.',
    'The denominator is games, not player rows: a pick happens in a game.',
  ],
  windows: [
    window({
      key: 'all',
      label: 'All games',
      records: {
        best: record({
          verdict: 'insufficient_data',
          headline: {
            text: 'Insufficient data: Teemo was picked in 4 of 3,091 games.',
            value: null,
            unit: 'share',
            n: 3091,
            interval: null,
          },
          evidence: {
            metric: 'presence',
            value: null,
            part: 4,
            n: 3091,
            denominator: 3091,
            grain: 'game',
            role: null,
          },
          census: [{ name: 'Teemo', count: 4, n: 3091 }],
          limits: ['Below n ≥ 20 the counts stay, the estimate does not.'],
        }),
        worst: null,
      },
    }),
  ],
  series: [],
}

export const uniqueChampions: QuestionArtifact = {
  id: 'unique-champions',
  class: 'champions',
  family: 'count',
  question: 'How many distinct champions will a season hold?',
  thresholds: { min_n: 20, top_k: 5, top_max: 20, resamples: 10000, seed: 20261126 },
  source: { view: 'cb_champion_picks', artifact: 'almanac-unique-champions.json', sha256: PIN },
  limits: [
    'A simulation is a distribution, not a forecast: it draws from this window’s observed pick sets.',
    'Only teams that qualified for an international event appear in the corpus.',
  ],
  windows: [
    window({
      key: 'season:2025',
      label: 'Season 2025',
      season: 2025,
      date_from: '2025-03-10',
      date_to: '2025-11-09',
      cut_date: '2025-11-09',
      patches: ['25.05', '25.13', '25.2'],
      games: 232,
      events: 4,
      records: {
        best: record({
          verdict: 'answered',
          headline: {
            text: '61–79 (90% of 10,000 simulations)',
            value: 70,
            unit: 'count',
            n: 10000,
            interval: simulation(61, 79),
          },
          evidence: {
            metric: 'unique champions',
            value: 70,
            part: null,
            n: 10000,
            denominator: null,
            grain: 'game',
            role: null,
          },
          top: 5,
        }),
        worst: null,
      },
    }),
  ],
  series: [],
}

export const finalsMvp: QuestionArtifact = {
  id: 'finals-mvp-role',
  class: 'events',
  family: 'categorical',
  question: 'Which role wins Finals MVP?',
  thresholds: { min_n: 20, top_k: 5, top_max: 20, resamples: 10000, seed: 20261126 },
  source: { view: 'cb_awards', artifact: 'almanac-finals-mvp-role.json', sha256: PIN },
  limits: [
    'Only teams that qualified for an international event appear in the corpus.',
    'Eleven awards is a census, not an estimate: the counts are the answer.',
  ],
  windows: [
    window({
      key: 'all',
      label: 'All games',
      records: {
        best: record({
          verdict: 'insufficient_data',
          headline: {
            text: 'Insufficient data: 11 Finals MVP awards, Mid 5, Top 3, Bot 2, Support 1.',
            value: null,
            unit: 'count',
            n: 11,
            interval: null,
          },
          evidence: {
            metric: 'Finals MVP role',
            value: null,
            part: null,
            n: 11,
            denominator: 11,
            grain: 'award',
            role: null,
          },
          census: [
            { name: 'Mid', count: 5, n: 11 },
            { name: 'Top', count: 3, n: 11 },
            { name: 'Bot', count: 2, n: 11 },
            { name: 'Support', count: 1, n: 11 },
            { name: 'Jungle', count: 0, n: 11 },
          ],
        }),
        worst: null,
      },
    }),
  ],
  series: [],
}

export const regions: QuestionArtifact = {
  id: 'region-knockouts',
  class: 'events',
  family: 'categorical',
  question: 'How many regions reach knockouts?',
  thresholds: { min_n: 20, top_k: 5, top_max: 20, resamples: 10000, seed: 20261126 },
  source: { view: 'cb_region_verification', artifact: 'almanac-region-knockouts.json', sha256: PIN },
  limits: [
    'No number is printed while the two columns it needs do not exist.',
  ],
  windows: [
    window({
      key: 'all',
      label: 'All games',
      records: {
        best: record({
          verdict: 'not_verifiable',
          headline: {
            text: 'Not verifiable: the model has no stage column and no region era.',
            value: null,
            unit: null,
            n: 0,
            interval: null,
          },
          evidence: {
            metric: 'regions in knockouts',
            value: null,
            part: null,
            n: 0,
            denominator: null,
            grain: 'game',
            role: null,
          },
          verification: {
            query: 'select count(distinct tab) from dim_match where tab <> \'\';',
            result_today: '73 distinct tab labels; 19 region values including the null.',
            unblocked_by: 'A committed stage-order table per event and a declared region vocabulary with its eras.',
          },
        }),
        worst: null,
      },
    }),
  ],
  series: [],
}

export const championWinRate: QuestionArtifact = {
  id: 'champion-win-rate',
  class: 'champions',
  family: 'top-1',
  question: 'Which champion won the most, and the least?',
  thresholds: { min_n: 20, top_k: 5, top_max: 20, resamples: 10000, seed: 20261126 },
  source: { view: 'cb_champion_games', artifact: 'almanac-champion-win-rate.json', sha256: PIN },
  limits: [
    'Only teams that qualified for an international event appear in the corpus.',
    'A champion under 20 picks is a census, not an estimate.',
  ],
  windows: [
    window({
      key: 'all',
      label: 'All games',
      records: {
        best: record({
          verdict: 'answered',
          headline: {
            text: '72% (95% CI: 57–83%, n=43)',
            value: 0.721,
            unit: 'share',
            n: 43,
            interval: wilson(0.573, 0.833),
          },
          evidence: {
            metric: 'win rate',
            value: 0.721,
            part: 31,
            n: 43,
            denominator: 43,
            grain: 'game',
            role: null,
          },
          candidates: [
            { name: 'Varus', path: '/champions/ch-4', metric: 0.721, part: 31, n: 43, interval: wilson(0.573, 0.833), lower_bound: 0.573, upper_bound: 0.833 },
            { name: 'Ornn', path: '/champions/ch-7', metric: 0.667, part: 16, n: 24, interval: wilson(0.467, 0.821), lower_bound: 0.467, upper_bound: 0.821 },
          ],
          top: 5,
        }),
        worst: record({
          end: 'worst',
          verdict: 'answered',
          headline: {
            text: '33% (95% CI: 22–46%, n=61)',
            value: 0.328,
            unit: 'share',
            n: 61,
            interval: wilson(0.222, 0.456),
          },
          evidence: {
            metric: 'win rate',
            value: 0.328,
            part: 20,
            n: 61,
            denominator: 61,
            grain: 'game',
            role: null,
          },
          candidates: [
            { name: 'Malphite', path: '/champions/ch-8', metric: 0.328, part: 20, n: 61, interval: wilson(0.222, 0.456), lower_bound: 0.222, upper_bound: 0.456 },
            { name: 'Hwei', path: '/champions/ch-9', metric: 0.353, part: 12, n: 34, interval: wilson(0.218, 0.517), lower_bound: 0.218, upper_bound: 0.517 },
          ],
          top: 5,
        }),
      },
    }),
  ],
  series: [],
}

export const seriesPoints: SeriesPoint[] = [
  { bucket: 'season', label: '2024', value: 0.61, part: 127, n: 208, denominator: 208, interval: wilson(0.545, 0.676) },
  { bucket: 'season', label: '2025', value: 0.638, part: 148, n: 232, denominator: 232, interval: wilson(0.574, 0.697) },
]

export const fixtures = {
  presence,
  championKda,
  teemo,
  uniqueChampions,
  finalsMvp,
  regions,
  championWinRate,
} as const
