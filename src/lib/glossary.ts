/**
 * The glossary, as data.
 *
 * Entries carry a stable id because the rest of the site links to them: a term that
 * only exists as a paragraph on one page is a term nobody can look up from the page
 * they are reading it on.
 */
export type GlossaryEntry = { id: string; term: string; body: string }

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: 'era',
    term: 'Era',
    body: 'A declared rule, cited to a patch, defining which statistics could exist when a game was played. A field that did not exist in an era is not counted against a game in it, which is why a 2013 game with no Voidgrubs is not "partial" for it.',
  },
  {
    id: 'coverage',
    term: 'Complete / partial / unavailable',
    body: 'Coverage of a record, per group (team statistics, draft, player statistics). Complete means every field eligible in that era has a value; partial means some do not; unavailable means the source carries none. Partial is a fact about the source, not an error, so it is displayed and never filtered away.',
  },
  {
    id: 'presence',
    term: 'Presence',
    body: 'Pick plus ban over the games played in scope, counted only from the champion\'s release date: a champion cannot be picked before it exists, so those games are excluded from the denominator rather than counted as absences. A game where both sides played the champion counts once.',
  },
  {
    id: 'sample-size',
    term: 'Sample size (n)',
    body: 'The denominator a share was measured on. Every percentage on this site is rendered as "62% (8/13)". A head-to-head between two teams is often fewer than five games; a share over eight games is a hint, not a prediction.',
  },
  {
    id: 'win-rate',
    term: 'Win rate',
    body: 'Wins over games, named the way a League reader names it. The denominator is always printed beside it, because a rate over three games and a rate over three hundred are not the same statement.',
  },
  {
    id: 'kda',
    term: 'KDA',
    body: 'Kills plus assists, divided by deaths, summed over every game before dividing, with the denominator floored at one so a deathless career does not divide by zero. It is shown with its formula and its game count, never in a leaderboard that hides how few games it came from.',
  },
  {
    id: 'blue-side',
    term: 'Blue side won',
    body: 'Games where the team on the blue side won, out of all games. It measures the side advantage of the map in a period, not the strength of any team.',
  },
  {
    id: 'series',
    term: 'Series',
    body: 'One match, best-of-one included. Two thirds of the corpus is best-of-one, so a series view that assumed several games would be wrong most of the time.',
  },
  {
    id: 'game',
    term: 'Game',
    body: 'One played game: two sides, one winner, one draft. The unit everything else is counted in.',
  },
  {
    id: 'title',
    term: 'Title',
    body: 'An event won: the final is the single series named Finals, and the title goes to the team that won more games in it. Events whose final cannot be named as one series award nothing rather than guessing a team.',
  },
]
