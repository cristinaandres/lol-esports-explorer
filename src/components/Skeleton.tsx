/**
 * What a page shows while its data arrives.
 *
 * A skeleton rather than the word "Loading", because the word tells a reader
 * nothing and then everything moves when the data lands. The blocks reserve roughly
 * the height of what is coming, so the page settles instead of jumping.
 *
 * There is one component because there is one idea, but four shapes because the
 * pages genuinely differ. Each shape is the layout of a page that exists, not a
 * knob per route:
 *
 *  - `page`  a whole route before the dataset arrives: breadcrumb, title, lead,
 *            six figures, then one block per section below the fold.
 *  - `cards` the home page: a title, a lead, and the grid of era cards.
 *  - `table` a block inside a page that has already rendered: the summary strip
 *            above a table, then the table's reserved height. The caller names
 *            that height because the player and champion tables are not the same
 *            size; a shared default would have made one of them jump. It is one
 *            of the utilities below rather than any string, so a page cannot ask
 *            for a height Tailwind never generated and render nothing.
 *  - `stack` the cards inside a page that has already rendered its headings and
 *            prose: the game page's scoreboard and draft board while their detail
 *            arrives, and the team page's current roster and list of everyone who
 *            played. One card per section, or two stacked with the page's own
 *            gap, so the caller passes the heights it reserves, as literal
 *            utilities for the same reason as the table's. A stack of one is how
 *            a single list reserves its room.
 *
 * It is announced as busy rather than read as content, and the label is the only
 * text: nothing here is a claim about the data.
 */
/** The table heights in use, kept as literal utilities so Tailwind keeps both. */
type TableHeight = 'h-48' | 'h-56'

/** The card heights a stack reserves, again as literal utilities. */
type StackHeight = 'h-24' | 'h-32' | 'h-40' | 'h-56'

export type SkeletonProps =
  | { shape: 'page'; blocks?: number }
  | { shape: 'cards'; cards?: number }
  | { shape: 'table'; tableHeight: TableHeight }
  | { shape: 'stack'; heights: readonly StackHeight[] }

export function Skeleton(props: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading"
      className="animate-pulse"
    >
      {props.shape === 'page' ? (
        <Page blocks={props.blocks} />
      ) : props.shape === 'cards' ? (
        <Cards cards={props.cards} />
      ) : props.shape === 'table' ? (
        <Table tableHeight={props.tableHeight} />
      ) : (
        <Stack heights={props.heights} />
      )}
    </div>
  )
}

function Page({ blocks = 2 }: { blocks?: number }) {
  return (
    <>
      <div className="bg-ink-800 h-3 w-24 rounded" />
      <div className="bg-ink-800 mt-4 h-10 w-2/3 rounded" />
      <div className="bg-ink-800/60 mt-4 h-4 w-1/2 rounded" />

      <div className="border-line mt-10 grid grid-cols-2 gap-6 border-y py-6 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index}>
            <div className="bg-ink-800/60 h-2.5 w-16 rounded" />
            <div className="bg-ink-800 mt-3 h-6 w-20 rounded" />
          </div>
        ))}
      </div>

      <div className="mt-10 space-y-3">
        {Array.from({ length: blocks }, (_, index) => (
          <div key={index} className="bg-ink-900 border-line h-40 rounded-xl border" />
        ))}
      </div>
    </>
  )
}

function Cards({ cards = 6 }: { cards?: number }) {
  return (
    <>
      <div className="bg-ink-800 h-10 w-2/3 rounded" />
      <div className="bg-ink-800/60 mt-4 h-4 w-1/2 rounded" />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <div key={index} className="bg-ink-900 border-line h-44 rounded-xl border" />
        ))}
      </div>
    </>
  )
}

function Table({ tableHeight }: { tableHeight: TableHeight }) {
  return (
    <div className="space-y-3">
      <div className="bg-ink-900 border-line h-24 rounded-xl border" />
      <div className={`bg-ink-900 border-line ${tableHeight} rounded-xl border`} />
    </div>
  )
}

function Stack({ heights }: { heights: readonly StackHeight[] }) {
  return (
    <div className="space-y-3">
      {heights.map((height, index) => (
        <div key={index} className={`bg-ink-900 border-line ${height} rounded-xl border`} />
      ))}
    </div>
  )
}
