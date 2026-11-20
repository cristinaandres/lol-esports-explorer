# 11: Step back to the previous phase

**Blocked by:** None (can start immediately)
**Status:** done

## What to build

A phase page offers a way forward — "next phase: Finals" — and no way back, so the only
route to the phase you were just reading is the browser's back button or the event
page.

The page gets the previous phase beside the next one, and the first phase of an event
correctly offers nothing rather than an empty slot.

## Scope

- The phase page only; the ordering it already computes.
- The same treatment the era pages got for the same reason.

## Acceptance criteria

- [ ] Semifinals offers Groups Day 5 before it and Finals after it.
- [ ] The first phase offers no previous step and does not render an empty control.
- [ ] The last phase offers no next step.
- [ ] Both directions respect the event's playing order, not alphabetical order.

## Validation

A browser walk from the first phase to the last and back, asserting each step.

## Built

A phase now offers both directions, side by side. Verified on First Stand 2025: the
first phase has no previous and the last has no next, and the middle ones link both
ways in playing order.
