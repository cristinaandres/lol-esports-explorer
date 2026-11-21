{
  "id": "05e7bfeb",
  "title": "The test run borrows another worktree's tests",
  "tags": [
    "review",
    "bug",
    "test"
  ],
  "status": "done",
  "created_at": "2026-11-21T10:10:09.477Z"
}

Vitest's default include is `**/*.test.ts` relative to the repo root, and a linked worktree lives at `.worktrees/<branch>` inside that root. So `npm run test` in the main checkout also runs every worktree's copy of the suite — measured with one worktree present: 32 test files and 416 tests instead of 16 and 208, and every file in that worktree counts twice.

Two consequences, both real: a failing or in-progress test in a worktree fails `npm run check` on `dev`, and a green run while a worktree exists is not evidence about `dev` at all — it silently counts another branch's tests.

The worktree skill keeps linked trees inside the repo on purpose (project trust is keyed on the checkout root), so the fix belongs in the config rather than in where worktrees live: exclude `.worktrees/**` in the vitest config (`vite.config.ts`), and keep the exclusion honest with a comment saying why.

Check: with a worktree present, `npm test` reports 16 files / 208 tests; with none, the same; and a deliberately failing test inside a worktree does not fail the main checkout's run.

Vitest's default include is `**/*.test.ts` relative to the repo root, and a linked worktree lives at `.worktrees/<branch>` inside that root. So `npm run test` in the main checkout also ran every worktree's copy of the suite.

Fixed by appending `**/.worktrees/**` to `configDefaults.exclude` in `vite.config.ts`, so the defaults are kept rather than replaced.

Proved both directions, with one worktree present holding a deliberately failing test: under `dev`'s config the main checkout's run **failed** on `.worktrees/probe-failing/src/lib/probe.test.ts`; with the exclusion it is 16 files / 213 tests. The probe worktree and its branch were removed afterwards.
