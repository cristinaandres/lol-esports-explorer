import { Breadcrumbs } from '../components/Breadcrumbs'
import { PageHeader } from '../components/PageHeader'
import { useDataset } from '../lib/data'
import { eraCopy } from '../lib/eras'

/**
 * The definitions page. It is not decoration: this site's claim is that a number
 * means what it says, so every term it uses is written down, including the ones
 * that are deliberately absent.
 */

const terms = [
  {
    term: 'Era',
    body: `A declared rule, cited to a patch, defining which statistics could exist when a game was played. A field that did not exist in an era is not counted against a game in it, which is why a 2013 game with no Voidgrubs is not "partial" for it.`,
  },
  {
    term: 'Complete / partial / unavailable',
    body: `Coverage of a record, per group (team statistics, draft, player statistics). Complete means every field eligible in that era has a value; partial means some do not; unavailable means the source carries none. Partial is a fact about the source, not an error, so it is displayed and never filtered away.`,
  },
  {
    term: 'Sample size (n)',
    body: `The denominator a share was measured on. Every percentage on this site is rendered as "62% (8/13)". A head-to-head between two teams is often fewer than five games; a share over eight games is a hint, not a prediction.`,
  },
  {
    term: 'Blue side won',
    body: `Games where the team on the blue side won, out of all games. It measures the side advantage of the map in a period, not the strength of any team.`,
  },
  {
    term: 'Series',
    body: `One match, best-of-one included. Two thirds of the corpus is best-of-one, so a series view that assumed several games would be wrong most of the time.`,
  },
  {
    term: 'Game',
    body: `One played game: two sides, one winner, one draft. The unit everything else is counted in.`,
  },
]

export default function Glossary() {
  const { data } = useDataset()
  const gaps = data?.eras.filter((era) => era.games === 0) ?? []

  return (
    <>
      <Breadcrumbs items={[{ label: 'Glossary' }]} />
      <PageHeader
        eyebrow="Definitions"
        title="What the numbers mean"
        lead="Every term the site uses, including the ones it refuses to use. If a metric is not listed here, it is not on the site."
      />

      <dl className="divide-line border-line max-w-3xl divide-y border-y">
        {terms.map((entry) => (
          <div key={entry.term} className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr] sm:gap-6">
            <dt className="text-fog-100 font-semibold">{entry.term}</dt>
            <dd className="text-fog-300 text-sm leading-relaxed">{entry.body}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-12 max-w-3xl">
        <h2 className="text-fog-100 mb-2 text-lg font-semibold tracking-tight">
          Declared eras with no game
        </h2>
        <p className="text-fog-300 text-sm leading-relaxed">
          The era spine is declared upstream, cited to a patch, and not inferred from the games.
          Two boundaries therefore govern no game at all: the game changed during a window in which
          no international event was played. They are not shown in the navigation, because a card
          that opens onto nothing is not a navigable level — but they stay in the data, so the chain
          of boundaries and its citations stays complete.
        </p>
        {gaps.length > 0 ? (
          <ul className="divide-line border-line mt-5 divide-y border-y">
            {gaps.map((era) => (
              <li key={era.era} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <span className="text-fog-100 text-sm font-semibold">{eraCopy(era.era).title}</span>
                <span className="text-fog-600 font-mono text-xs">declared from {era.from}</span>
                <span className="text-fog-500 w-full text-xs">{eraCopy(era.era).empty}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mt-12 max-w-3xl">
        <h2 className="text-fog-100 mb-2 text-lg font-semibold tracking-tight">
          What this site does not do
        </h2>
        <p className="text-fog-300 text-sm leading-relaxed">
          It does not predict a winner. A model trained on this corpus would be trained on a few
          hundred games per era, most of them between teams that never met again, and its output
          would look more certain than the evidence behind it. What it does instead is put the
          record in front of you with its sample size attached, so the judgement stays yours.
        </p>
      </section>
    </>
  )
}
