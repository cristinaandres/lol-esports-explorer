{
  "id": "acff378b",
  "title": "HoverNote: place the bubble on the wrapper, not only the trigger",
  "tags": [
    "review",
    "web"
  ],
  "status": "open",
  "created_at": "2026-11-22T19:07:33.222Z"
}

**Source:** adversarial review, finding 4 (real, code-read).

`src/components/HoverNote.tsx` measures the shift in `onPointerEnter`/`onFocus` on the trigger span. The bubble opens via `group-hover`, so a trigger that appears **under an already-stationary pointer** — the data landing after a skeleton, a filter re-render — is revealed with `shift` still 0 and can overflow the viewport in exactly the case the measured placement was written to fix. There is also no resize handling while open.

**Fix.** Put the placement on the wrapper's `onPointerEnter`/`onFocus` (capture) so it runs whenever the group becomes hovered, and re-place on window resize while open. Keep the three-candidate rule (left-anchored, flipped, clamped) as is — it is right.

**Verify.** Hover the KDA coverage note and the Distinctions note at 1440 and 390 px; confirm `x >= 0 && right <= innerWidth` in both. Simulate the reveal-under-pointer case by hovering the region before the data loads.
