/*
 * Human copy for each era declared upstream.
 *
 * The spine in data/upstream/game-eras.json names eras by slug and cites the
 * patch that created each boundary; what a reader needs on top of that is a
 * title and one sentence on what changed in the game. That copy lives here, in
 * the presentation layer, because it is editorial and not data.
 *
 * src/lib/metrics.test.ts fails when an era exists upstream without an entry
 * here, so adding an era upstream cannot silently ship a blank card.
 */

export type EraCopy = {
  title: string
  /** What the era changed in the game, in one sentence. */
  whatChanged: string
  /**
   * A declared era can govern no game at all: the game changed during a window
   * in which no international event was played. Those eras are real, and the
   * site shows them as a gap in the spine instead of dropping them.
   */
  empty?: string
}

export const ERA_COPY: Record<string, EraCopy> = {
  'pre-herald': {
    title: 'Before the Rift Herald',
    whatChanged:
      'No Rift Herald, no elemental dragons. The sources also record almost none of the detail, so this era reads as a record of who played, not as a measurement of how.',
  },
  herald: {
    title: 'The Rift Herald',
    whatChanged:
      'Patch 5.22 puts the Rift Herald in the Baron pit and changes how the top side of the map is played.',
    empty: 'No international event was played in this window.',
  },
  'elemental-drakes': {
    title: 'Elemental dragons',
    whatChanged:
      'Patch 6.1 makes dragons elemental: Cloud, Infernal, Mountain and Ocean. It is the largest slice of the corpus and the first one with complete drafts.',
  },
  'hextech-chemtech': {
    title: 'Chemtech joins the drakes',
    whatChanged:
      'Patch 11.23 adds the Chemtech Drake, so five elemental types can appear.',
    empty: 'No international event was played in this window.',
  },
  'chemtech-withdrawn': {
    title: 'Chemtech withdrawn',
    whatChanged:
      'Riot disables the Chemtech Drake on 25 January 2022 and the map is played without it for the rest of the competitive year.',
  },
  'chemtech-restored': {
    title: 'Chemtech restored',
    whatChanged:
      'Patch 12.22 brings the reworked Chemtech Drake back, this time with a terrain effect on the map.',
  },
  voidgrubs: {
    title: 'Voidgrubs',
    whatChanged:
      'Patch 14.1 adds Voidgrubs to the top-side jungle, and the corpus starts counting them as an objective.',
  },
  atakhan: {
    title: 'Atakhan',
    whatChanged:
      'Patch 25.S1.1 adds Atakhan to the epic monsters. This is the era the current season is still being played in.',
  },
}

/** Falls back to a de-slugged label so an unmapped era still renders legibly. */
export function eraCopy(id: string): EraCopy {
  return (
    ERA_COPY[id] ?? {
      title: id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      whatChanged: 'No description has been written for this era yet.',
    }
  )
}
