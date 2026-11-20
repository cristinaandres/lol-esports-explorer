# 05: Name the winner on the event page

**Blocked by:** None (can start immediately)
**Status:** ready

## What to build

The site can already say who won a competition — the titles derivation reproduces
eleven known results — but only from the winner's side. Opening Worlds 2024 does not
say T1 won it.

The event page states the champion, with the final's score, and says nothing where
the derivation cannot name one team. Silence is the correct answer for the twelve
events whose final is a regional relay; naming the top team there would be a lie the
rest of the site does not tell.

## Scope

- Reuse the titles module; no new artifact and no new rule.
- One line in the event header, linked to the winning team's page.

## Acceptance criteria

- [ ] Worlds 2024 names T1 with the final's score.
- [ ] A Rift Rivals event with several finals names nobody and does not imply the
      question is unanswered by mistake — it says why.
- [ ] A team with a page is linked; one without is text.
- [ ] The event page and the team page never disagree about a title.

## Validation

Unit test reusing the titles fixtures, plus a data test asserting the event page's
champion equals the team page's matching title for every derived title.
