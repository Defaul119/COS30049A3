# Engineering work log — COS30049 Assignment 3

The running record behind the technical documentation and the report. Each entry says **what was
done, why, what was decided, what was measured, and what is still open**, so the report's architecture,
implementation and AI-integration sections can be written from it without archaeology.

How the work is organised: one lead (Claude Opus 5.5) plans, writes task specs, reviews and integrates;
Claude Sonnet 5.5 subagents at high effort ("cooks") build bounded work packages in separate parts of
the tree. Cooks do not commit; the lead reviews each package, runs its checks and commits it.
Task numbers (T01–T52) and scope IDs (M/S/C/W, E/V/G) are from `docs/plan/main.pdf`.

Entry format: `## YYYY-MM-DD — title`, then **Context / Decisions / Done / Evidence / Open**.

---

## 2026-11-11 — Kick-off: repository, toolchain, first delegation

**Context.** The plan (`docs/plan/main.pdf`, 69 pp.) and the team briefing (`../explainers/a3/a3.pdf`,
17 pp.) were read. On disk, `COS30049A3/` held only `docs/`. MS1 (walking skeleton) is due Sun 15 Nov.

**Decisions.**
- **D-W-01 Repository.** `git init` on `main`, local only. A private GitHub remote waits for the user's
  approval (D-A3-1: never public before marks are released). Commit identity: `Defaul119` with the
  GitHub noreply address.
- **D-W-02 Node runtime.** The Mac had no Node and no Homebrew/sudo. Node **v24.22.2 LTS** (darwin-arm64)
  was installed per-user into `~/.local/node`, with `~/.local/bin` symlinks; the tarball was checked
  against nodejs.org's `SHASUMS256.txt`. The prototype's lockfile accepts `^22.22.2 || ^24.15.0 || >=26`.
- **D-W-03 A2 source commit.** Vendoring uses A2 commit **`aa56a26`** (head of `from-scratch`, the commit
  the plan's timings were measured on). Its `v1.0` tag is still to be confirmed by the user (T02).
- **D-W-04 One settings file.** `backend/config/settings.json` (A2's file, byte-identical at `aa56a26`)
  is the single source of thresholds and wording for both tiers. The front end imports it rather than
  keeping a copy; later it reads the runtime values from E2 `/api/config` (T16).
- **D-W-05 Work split for wave 1** (disjoint trees, so the two cooks can run in parallel):

  | Cook | Model / effort | Tasks | Writes only in |
  |---|---|---|---|
  | backend-core | Sonnet 5.5, high | T03 vendor + env + smoke, T05 schemas + `openapi.json`, T06 config/E2, T07 app factory/E1, T08 errors, T09 validation + shared vectors | `backend/`, `tools/vendor_a2.py`, `shared/` |
  | frontend-port | Sonnet 5.5, high | T04 prototype builds and tests pass on A3's layout, Axios client; T16 shell | `frontend/` |

  Lead keeps: the API contract review (T05 sign-off), cross-tier consistency, commits, this log.

**Done.**
- Repository initialised; `.gitignore` (Node, Python, `backend/var/`, LaTeX build files).
- Prototype `asm1_demo/frontend` @ `8375cf0` copied to `frontend/` (without `node_modules`, `dist`).
  `npm ci` succeeded. **Baseline before any change:** `npm test` → 6 of 6 test files failed to load;
  `npm run build` → `TS2307: Cannot find module '../../../config/settings.json'` (the prototype expects
  the settings at its repo root).
- `TODO.md` (repository root): the task list built from both plans.

**Open.** A2 submitted commit and `v1.0` tag (user); private remote (user); tutor's answer on
generative AI (team); CR-07 and CR-08 votes (team).

## 2026-11-11 — Which Assignment 2 build A3 loads (T02)

**Context.** The plan needs the submitted A2 commit tagged so the back end can name the models it
loads. The repository had no `v1.0` tag. The submission folder was downloaded from the team drive
(`COS30049A2_submisison-…zip`, 881 MB: code zip, report `main_v2.pdf`, minutes, contribution form).

**Method.** The inner code zip (449 files) was compared with every A2 commit since 6 Nov by git blob
hash, with CRLF normalised (the zip was built on Windows). Python files were also compared by AST with
docstrings blanked, and `settings.json` with every `_`-prefixed comment key removed.

**Findings.**
- Best match: **`aa56a26`**, equal to its three parents from 7 Nov. 431 files are byte-identical.
- 14 files differ, all **wording only**: comments, docstrings, the `_` comment keys in
  `settings.json` (every value is identical), a status string in `glossary.jsonl` and `make_glossary.py`,
  and the README and model/data cards. No code path or number differs.
- 4 files in the zip are not in git: `SHA256SUMS.txt`, `models/heist_best.joblib` (not used, W-04) and
  **the Explorer Assistant's weights** `models/assistant/model.pt` (610 MB) and `tokenizer.json`. All
  three match the zip's own `SHA256SUMS.txt`.

**Decisions.**
- **D-W-06** A2 tag `v1.0` → `aa56a26` (annotated, local, with the findings in the message). A3
  vendors from `aa56a26`, which loads the same models and settings values as the submission.
- **D-W-07** The Assistant's weights are no longer missing: a verified copy is kept at
  `~/Desktop/COS30049/A2_submitted_artifacts/` (outside git; the 610 MB file is git-ignored in A2 too).
  S-05 can run with real weights rather than prepared answers only.
- **D-W-08** Remote: `github.com/Defaul119/COS30049A3`. It already existed (empty, created 10 Nov) but
  was **public**; it was switched to **private** before the first push (D-A3-1).

**Open.** Pushing A2's `v1.0` tag (local only for now).

## 2026-11-11 — Wave 1, front end: T04 and T16 reviewed and committed

**Delegated to** the frontend-port cook (Sonnet 5.5, high effort): 68 tool calls, ~13 min.
**Lead review:** re-ran `npm test` (9 files, **106 passed, 1 skipped**), `npm run typecheck` (clean)
and `npm run build` (clean; JS **366.6 kB, 120.1 kB gzip**; CSS 25.1 kB). Wording check: no banned
word in `frontend/src`. One comment corrected (the dev proxy answers 502, not 500). Commits `271642a`
(the work) and `a4727d0` (rename `screens/` → `views/`, `styles.css` → `styles/base.css`, to match
the plan's layout; flat `views/` for now, one folder per view when V4–V8 arrive).

**Root cause of the baseline failure.** One import: `src/lib/settings.ts` read
`../../../config/settings.json`. Every test loads `tests/setup.ts` → the mock → `settings.ts`, so all six
test files failed at load. Fixed by importing `backend/config/settings.json`; no copy, no alias
(Vite already allowed the repo root).

**Design notes for the technical document.**
- **One client, one error type.** A single Axios instance (D-A3-4) owns the base URL, the time limit
  (`web.requests.timeoutMs`, 10 s) and cancellation. A response interceptor turns every failure into an
  `ApiError`, so views switch on `error.body.status` and never see Axios. A reply without the service's
  JSON body (such as the dev proxy's empty 502 while Uvicorn is stopped) is treated as "no answer",
  not as a server error.
- **Cancellation by signal.** Every API method takes an `AbortSignal`. `useRequest` aborts on unmount
  or when its key changes, so a stale answer can never overwrite a newer one. The mock honours the
  same signal, so tests cover cancellation without a server.
- **Service status drives recovery.** A provider polls E1 every `healthPollSeconds` (15 s), and at once
  after any network, timeout or 503 failure. It reports checking, ready, starting or unreachable, each
  with a next action. When the service is back, views that failed for those reasons reload by
  themselves: recovery without a click, and without a query library.
- **Settings: the service first, the bundled file as the floor.** The shell reads E2 at start and
  after each recovery. Until then it uses the bundled `settings.json`, so limits and the limitation
  line are always present; only the snapshot details need the service.
- **Fault isolation.** The error boundary sits inside `<main>` and resets on navigation, so a crash in
  one view leaves the header, the navigation and the status indicator working.
- **Preferences** live in one versioned local-storage key (`explorer.preferences.v1`), with a session
  fallback when storage is blocked. The theme follows the system until the user chooses.

**Choices where the plan was silent** (accepted): default API mode `http` with a same-origin base URL;
a fourth status `checking` until the first E1 answer; placeholder pages for `#/models`, `#/watchlist`,
`#/about` so navigation never leads to "not found"; toasts only on a status change.

**Carried to the view work.** Offline banner; 429 countdown; per-call time limit (the Assistant's 90 s);
`useRequest` keeping the previous data while refreshing; the prototype banner and tools (T17).
**Contract handshake.** The front end's expected E1/E2/error shapes were sent to the backend cook;
any difference from the plan is resolved in the plan's favour.

## 2026-11-11 — Wave 1, back end: T03, T05–T09 reviewed and committed

**Delegated to** the backend-core cook (Sonnet 5.5, high effort): 80 tool calls, ~23 min.
**Lead review:** re-ran `pytest` (**135 passed**, warnings are errors) and `tools/vendor_a2.py --check`
(all hashes match). Started Uvicorn and called E1, E2, an unknown path (404 `not_found`) and a wrong
method (405 `invalid`): all as specified, request IDs on every body, no warnings in the log, "ready"
0.7 s after start. Checked the one surprising dependency, `httpx2`: it is the pydantic organisation's
package, and Starlette 1.10's own test client imports it and warns when it finds `httpx`.
Checked what would be committed: 89 files, the largest 17 MB (`txgpt_method.joblib`); the 610 MB weights
are git-ignored. Commit `5a690f1`.

**Lead change.** E1 said `assistant: "ready"` and E2 `capabilities.assistant: true` because the weights
file exists, but E12 does not exist yet, so the front end would offer a button that returns 404.
**D-W-09:** `EXPLORER_ASSISTANT` defaults to `off` until S-05 adds E12, then goes back to the plan's
`auto` (s05, environment table). Two tests updated to match.

**Measured.** Running example `1Bbcsfxj…3dz`: 377 transactions, 367 scored, 3 flagged on 3 days;
what-if 0.05 BTC out scores 5.98 (both as in the plan). Import 1.3–1.5 s, `Predictor.load()` 0.74 s,
about 2.3 s in total on a warm run; about 5 s cold.

**Design notes for the technical document.**
- **Copying with proof.** A2's runtime is copied from a commit (`git cat-file`), never from a working
  folder. The file list is found by running the entry points (`Predictor.load`, `score_address`,
  `score_what_if`, `txgpt_surprisal`) in a clean interpreter under an audit hook, so it cannot drift
  from what the code needs. `A2_VENDOR.json` stores each file's SHA-256, and a test recomputes them.
  `.gitattributes` marks the folders `-text` so Windows line-ending conversion cannot change a hash.
- **Models load once, in the background.** The Predictor loads in the lifespan on a worker thread and
  is shared read-only. While it loads, E1 answers 503 `unavailable`, which lets the front end tell
  "starting" from "down". A failed load is logged and E1 keeps answering 503.
- **One error body, one place.** `core/errors.py` alone chooses statuses and builds bodies. Services raise
  A2's `Unsupported` (404) or `InsufficientHistory` (422), or typed API errors. Validation becomes 400
  with per-field messages. No trace, path, library text or echoed input reaches a client; the real
  text is logged under the same request ID.
- **One address checker, two tiers.** `core/validation.py` ports the prototype's Base58Check, Bech32
  and Bech32m checker. `shared/address_vectors.json` (53 addresses, 9 transaction IDs: snapshot
  addresses, BIP 173/350 vectors, and hand-built cases where the checksum is valid but one rule fails)
  is read by pytest now and by Vitest later. The two checkers agree on every entry except the
  server-only 100-character limit.
- **Configuration in one place.** Every web limit is in `settings.json` → `web`, validated by Pydantic
  models that reject unknown or missing keys. E2 passes the block on unchanged, so the browser checks
  the same numbers the server enforces. Environment variables only choose what a machine may do (CORS
  origins, live lookup, Assistant, log level).
- **Contract first.** camelCase schemas for E1–E11 match A1's `types.ts` field for field (a test
  parses `types.ts` and compares names, optionality and nullability). `openapi.json` is exported with
  the contract-only schemas merged in, and a test keeps the committed copy current.

**Deviations accepted.** `httpx2` instead of `httpx` (see above); the exporter is
`python -m app.core.openapi` rather than `tools/export_openapi.py`; invalid JSON → 400 and a wrong
Content-Type → 415; E2 feature units (`BTC`, `count`, `hours`, `ratio`) are typed in
`system_service.py` because A2 records none.
**Carried forward.** OpenAPI still shows FastAPI's default 422 for parameterised routes (given to the
endpoints cook); the 413 body limit and ETags are not built yet; Mod-10's fail-fast start is not built.

## 2026-11-11 — Wave 2 started
- **charts** cook: T23 Plotly wrapper, T24 G1, T26 G3, against the mock (`frontend/` only).
- **backend-endpoints** cook: T10 store and cache, T11 E3–E5, T12 E6–E7, T13 parity and wording
  tests over the 28 addresses, the OpenAPI 400 fix, and timings (`backend/` only).

## 2026-11-11 — Wave 2, charts: T23, T24, T26 reviewed and committed

**Delegated to** the charts cook (Sonnet 5.5, high effort): 79 tool calls, ~19 min.
**Lead review:** re-ran `npm test` (12 files, **168 passed, 1 skipped**), typecheck and build (clean).
Bundle: main JS **374.4 kB / 123.8 kB gzip** (+3.8 kB gzip), Plotly a separate on-demand chunk of
**1,446 kB / 478 kB gzip**, CSS 23.4 kB. Checked the Plotly package's publisher (Plotly's own
maintainers) and publish date (4.1.2, 5 Oct 2026). Wording check clean. Commit `eeefa9c`.
**Process note.** The cook ran `git rm` on the removed chart files against its instructions and
reported the index as clean; three paths were still staged. It was harmless, because the same changes
were being committed, but cook reports are checked against `git status`, not taken at their word.

**Finding: two sources for the flag threshold (D-W-10).** The Explorer's flag line is the *tuned*
threshold saved with A2's baseline model (`Predictor.flag_abs_z()` → `methods["baseline"].threshold`
= **5.0**). `settings.json` → `baseline.flagAbsZ` (**3.5**) is A1's untuned default, used only as a
fallback when no model is loaded. The back end is right (E2 reports 5.0). The front end's bundled
fallback (`lib/settings.ts`) and the mock (`api/mock/mockApi.ts`) read 3.5. **Decision:** E2 (or a
response carrying the method) is the only source of thresholds in the browser. The bundled fallback
must not invent one, and the mock takes the tuned value from fixtures recorded from the real API.
Assigned to T17.

**Design notes for the technical document.**
- **One wrapper; a chart is a figure function.** Every chart goes through `PlotlyChart`. A chart
  supplies its words, its table and `figure(context)`, which returns Plotly data and layout for the
  current theme and size. The wrapper adds what the contract promises for all charts (theme, tool
  bar, exports, states, keyboard, resizing), so the contract is tested once and a new chart is one file.
- **Plotly is loaded on demand, and failure is a state.** Only `plotlyLoader.ts` imports Plotly, by
  dynamic `import()`, so it ships as a separate chunk that the first screen never fetches. A failed
  fetch is not cached, so "Try again" retries; if loading or drawing fails, the chart's table takes its
  place and the numbers stay reachable.
- **Theme from CSS tokens.** Plotly cannot read CSS, so `chartTheme.ts` reads the stylesheet's tokens
  after the theme attribute changes and passes them in. Light and dark share one definition, and a theme
  switch redraws in place, keeping the zoom (`uirevision`).
- **Accessibility rebuilt around Plotly.** The chart sits in a focusable group with the prototype's keys
  (arrows, Home, End, Enter). Each key calls `Plotly.Fx.hover`, so keyboard users see the same tooltip as
  mouse users, and a live region reads it out. Screen readers get the same data as a table. An unusual
  item is never shown by colour alone: it is orange, has a triangle, and says so.
- **The PNG is a deliberate copy.** Export draws an offscreen 1200×675 figure from the current zoom,
  with the title and caption, without the range slider, on an opaque background. The image explains
  itself whatever the window size or theme.
- **Library choice.** `plotly.js-cartesian-dist-min` is the smallest prebuilt Plotly with bar, scatter,
  WebGL scatter and heat map, which G1–G9 need. A custom `plotly.js/lib/core` build would be smaller,
  but Vite cannot compile Plotly's glslify shaders. `chunkSizeWarningLimit` was raised to 1500 kB for
  that one chunk; the first-screen budget is checked from the build report instead.

**Carried forward.** Plotly's range buttons and legend are below the 44 px touch-target size (for T40,
the accessibility inspection). Scrolling past a chart on a real phone is not verified, since Plotly may
capture the drag (T38 and a real-device check). E2's `features` (names, units) is not yet in the
front end's `AppSettings`, so G3 formats units by feature id (for T17).

## 2026-11-11 — Wave 2, back end: T10–T13 reviewed and committed (back-end half of MS1)

**Delegated to** the backend-endpoints cook (Sonnet 5.5, high effort): 62 tool calls, ~20 min.
**Lead review:** `git diff --cached` empty (no stray staging); `vendor_a2.py --check` passes (vendored
files untouched); `pytest` **478 passed** (343 new), warnings are errors. E6's paged shape was checked
against the plan (s06 E6: "A1, extended", answers `address, date|null, transactions, page, pageSize,
total`): it matches. Live probe: E3 lists 28; E4 for an address outside the snapshot → 404
`unsupported` with three examples and `canLookupLive:false`; E5 for the running example → 377 tx,
367 scored, 3 flagged on 3 days; E6 `status=flagged&sort=-score` → 3 rows (scores 5.61, 5.19, 5.11);
E7 → flagged, the limitation line present, all nine methods' flags; a bad query → 400 with field
errors; `If-None-Match` → **304**; no warnings in the server log. Commit `fd2d796`.

**Measured** (Uvicorn over HTTP, gzip; warm = median of 30, cold = cache cleared):

| Request | Running example cold / warm | Largest address (700 tx) cold / warm | Body (gzip) |
|---|---|---|---|
| E5 timeline | 57 / 1.5 ms | 102 / 1.5 ms | 11.6–18.4 kB (1.2–1.5 kB) |
| E6, 50 rows | 97 / 1.5 ms | 104 / 1.5 ms | 12.5–13.0 kB (3.3–3.6 kB) |
| E6, 200 rows | 58 / 2.8 ms | 104 / 2.8 ms | 52 kB (13 kB) |
| E7 | 59 / 1.4 ms | 103 / 1.5 ms | 2.7–2.9 kB (1.2–1.3 kB) |

All within the plan's budgets (s10.3: E5 150 ms, or 20 ms cached; E6 page of 200 within 150 ms; E7
150 ms; timeline body 60 kB; one transaction 6 kB). Warming all 28 addresses: ~1.2 s and ~51 MB, after
"ready", so the 10 s start budget is untouched.

**Design notes for the technical document.**
- **One scoring, three views.** `score_address` returns up to 2 MB, so the service scores an address once
  per method, keeps the result and cuts it into the timeline (11–18 kB), a filtered, sorted, paged
  list, and one transaction (under 3 kB). Endpoints only filter, sort, page and pick; nothing is
  recomputed. Parity tests rebuild the whole `score_address` result from those pieces for all 28 addresses.
- **An address store behind one interface.** Services read an address through `AddressStore.get` (its
  features, transactions, scores and source, or `Unsupported`). `SnapshotStore` splits the frozen tables
  once at start. A live store (S-09) only implements the same two methods.
- **A bounded, warmed, per-method cache.** One entry per (method, address), least-recently-used
  eviction, capacity of one snapshot (28 entries, ~51 MB). It fills lazily and is warmed for the
  default method after "ready", so a warm view takes ~1.5 ms. A non-default method shares the loaded
  tables (`dataclasses.replace(predictor, selected=m)`) and never disturbs the default entries.
- **Short-history addresses stay visible.** `score_address` raises for them, but the screen must list
  their transactions unscored, so their timeline and rows come from the feature table (E5/E6 200).
  E7 answers 422 `insufficient_history` with the transaction's own history, the same body for a
  short address and for an early transaction of a normal one.
- **Layered validation, always 400.** Pydantic checks types and enums; `core/validation` checks
  addresses, transaction IDs and days; the service checks rules that need settings or two fields (page
  size, day order, `date` versus a range). Limits come from `settings.json` → `web`. Bodies over
  `maxBodyBytes` are refused with 413 by a middleware that reads at most one byte past the limit.
- **Revalidation without state.** An innermost middleware hashes the finished JSON (inside gzip, whose
  timestamp would otherwise change the hash) and answers 304 on a matching `If-None-Match`. Routes opt in
  with `Cache-Control: no-cache` through one dependency. No version table, and the tag changes exactly when
  the answer does.

**Choices accepted:** `sort=amount` is by signed `netSats`; unscored rows sort last both ways; unknown
query parameters are a 400; `page` past the end is an empty 200 with the real `total`.
**Found in review, carried forward:**
- (a) A2's reason text can repeat itself ("Lower ratio to the usual amount than usual"). It comes from the
  frozen `explorer/explain.py`; any fix belongs in the web layer and in `MODIFICATIONS.md`.
- (b) A 400 names only the first layer's faults: with `pageSize=999&status=bogus` only `status` is
  reported, because the type check stops before the page-size rule.
- (c) E2 has no ETag (the plan lists only snapshot GETs).

## 2026-11-11 — T17 started (front-end half of MS1)
**frontend-views** cook: aligns `types.ts` with the real E3–E7, applies D-W-10 (thresholds only from E2),
adds E2's `features`, records fixtures from the real API in place of the illustrative mock data, makes
Vitest read `shared/address_vectors.json`, puts V1–V3 on the real API and removes the prototype banner.
**backend-whatif** cook started in parallel: T14 (E8, E9 with the batched feature build and its parity
test, which must be shown to catch a planted bug) and T15 (E10 export, E11 methods). `backend/` only.

## 2026-11-11 — T17 reviewed; **MS1 passed** (4 days early)

**Delegated to** the frontend-views cook (Sonnet 5.5, high effort): 87 tool calls, ~18 min.
**Lead review:** `npm test` **244 passed, 0 skipped** (the D1-sample skip is replaced by the shared
vectors: 52 browser-checkable entries, all agreeing with the server's checker), typecheck and build
clean, wording clean, index clean. Looked at the cook's screenshots against the real API (desktop
transaction view, phone transaction view): real data, the flag line at ±5, the nine verdicts, the
limitation line. Commit `610331d`.

**Cook claim found false: "the mock is not in the production bundle".** The build emitted a 32 kB
`mockApi` chunk, because `api/client.ts` imported the mock statically. **Lead fix:** both mock imports
(`client.ts`, `main.tsx`) now sit under a condition written on `import.meta.env.VITE_API_MODE`, which
Vite replaces with a literal at build time, so production folds it away. Checked: no mock strings and
no fixture addresses in `dist/`. The first screen downloads the same ~124 kB gzip as before, now in one
request instead of three; the old chunk was mostly shared code that the static import always loaded.

**Contract drift caught by running live** (by the cook): E5's `range.start`/`end` are timestamps,
not day keys; G1 and the tiles would have broken on real data. Fractional `spanDays` now prints as
"under a day" or whole days.

**MS1 gate, run by the lead from a fresh clone of `origin/main`** (scratch folder):
`vendor_a2.py --check` passes; Uvicorn ready in ~1.3 s with a clean log; E5 answers 200 for all 28
addresses; `npm ci`, `npm test` (244) and `npm run build` are clean. The first back-end run found
**1 failure**: `test_schemas.py` parses `frontend/src/api/types.ts` and read the `null` inside
`Record<MethodId, number | null>` (added by T17) as "this property is nullable". `main` had been red
since `610331d`, because the lead ran only the front-end suite before committing a front-end package.
**Fix** (`9adf130`): `top_level_nullable()` strips nested `<…>` and `{…}` before looking for `null`
(six cases checked). Re-run in the clone: **478 passed**. MS1's conditions (both tiers from a fresh
clone; E1–E7 for all 28 with parity; V1–V3 on real data, including the unsupported and short-history
states) are met. The clone reused the existing `cos30049-a3` environment; building a fresh environment
from `environment.yml` was checked by the backend-core cook.

**Lessons recorded (process).**
- **Cross-tier tests exist** (the back end reads `types.ts`), so **both suites run before every
  commit**, whichever tier the package touched.
- **Lead slip:** while checking a bundle size, the lead ran `git stash` / `git stash pop` for a few
  seconds while the backend-whatif cook was editing `backend/`. The pop was clean (stash list empty, no
  conflict markers, the cook's files present), and the cook was told. **Rule from now on:** no
  working-tree-wide git command (stash, checkout, reset) while a cook is running. Compare builds in a
  separate clone or worktree instead.
- Cook reports are verified against the build and `git status`. Two of four reports so far contained a
  false claim (the index left "clean" while three paths were staged; "mock not bundled").

**UI observations from the screenshots** (to fix later):
- (a) On a phone, the G3 table's Role column clips ("contribut…").
- (b) Amounts are printed with different precision in the explanation and the facts ("0.0011126" vs
  "0.00111260").
- (c) The verdict table shows K-Means 6.69 and TxGPT 5.57 next to "–" while the baseline's 5.61 says
  "Flag". Each method has its own scale; G4 (S-02, score against its own threshold) is the plan's
  answer, and the verdict table could add a threshold column once E11 exists.

**Design notes for the technical document.**
- **Fixtures are recorded, not invented.** `scripts/record-fixtures.mjs` saves the service's own answers
  (E1–E3, an E4 404, E5, all E6 pages and selected E7 answers for one normal and one short-history
  address). The mock only filters, sorts and pages them, so tests and the demo mode use real shapes and
  numbers, and re-running the script refreshes both after a new snapshot.
- **The mock cannot ship.** It is reachable only through a condition on `import.meta.env`, which the
  build replaces with a literal, so production bundles contain neither the mock nor its data.
- **One flag line, from the model.** The front end draws the threshold that E2 reports (A2's tuned 5.0),
  echoed in each response's `method`. With the service unreachable it draws none rather than guess.
- **A transaction can be unscorable on a normal address.** E7's 422 covers early transactions of a
  well-covered address too. V3 handles it per transaction: the facts stay, the reason is given, and the
  next step is the address's first scored day.
- **Two checkers, one set of vectors.** pytest and Vitest both run `shared/address_vectors.json`, so the
  browser and the server are shown to accept and reject the same addresses with the same messages.
**frontend-explore** cook started: T18 (tabs, filter bar, table), T25 (G2), V7, and the two UI fixes (phone table, amount precision). `frontend/` only.

## 2026-11-11 — T14 and T15 reviewed and committed (what-if, export, methods)

**Delegated to** the backend-whatif cook (Sonnet 5.5, high effort): 108 tool calls, ~34 min.
**Lead review and changes** (commit `2bde9b8`):
- **Limitation line in every CSV row.** The cook followed the plan's E10 note (flagged rows only), which
  conflicts with the wording rule ("every export"): a CSV filtered to unflagged rows carried no
  limitation at all. Now every CSV row carries it (the JSON file states it once at the top and in
  flagged rows). Two tests that encoded the old behaviour were updated, and a test was added for a CSV
  with no flagged row. **D-W-11.**
- The what-if vectors moved to `shared/whatif_vectors.json`, where the plan puts them.
- **Verification in a clean worktree of the commit, before pushing** (the new rule): `vendor_a2.py
  --check` passes; `pytest` **570 passed** (119.8 s); `npm ci`, `npm test` (244), typecheck and build
  clean; Uvicorn under `-W error` starts clean; live E8 (0.05 BTC out: flagged, 5.98, limitation
  present), E9 (41 points, usual 0.000525 BTC, 8 methods), E10 (`text/csv`, `attachment;
  filename="1Bbcsfxj-2026-10-22.csv"`), E11 (baseline threshold 5.0).

**Parity of the batched curve (the T14 claim that matters).** Batch against single `score_what_if`
calls over 6 addresses (the running example; the largest; the one with the fewest scored; the oldest;
a Taproot address; a mid-sized one) × both directions × 3 times (the first scorable moment, the exact
second of a real transaction, a day after the last) × 41 log-spaced amounts (0.000001–10 BTC).
- **Flags equal everywhere.**
- **Scores** exactly equal for baseline, Isolation Forest, LOF, DBSCAN and regression range. Within
  4.3e-14 (regression), 7.1e-15 (fusion) and 8.9e-16 (k-means): BLAS summation order. Two identical
  single calls differ at the same level, and the features themselves are bit-identical. Tolerance 1e-12.
- The full grid (1,517 amounts, 8 min 16 s) runs under `PARITY_FULL=1`. The default run spot-checks it
  in ~40 s and always checks the running example's full 41-point curve.
- **Planted bugs:** dropping the newest earlier row failed 15 of 20 parity tests. Three meta-tests stay
  in the suite and plant bugs (newest earlier row dropped; same-second real row counted as history;
  hypothetical rows staggered in time) to prove the check fails.

**Measured** (Uvicorn, warm median of 7):

| Request | Running example | Largest (700 tx) | Budget | Plan's measurement |
|---|---|---|---|---|
| E8 | 267 ms (cold 339) | 340 ms | 700 ms | 400 ms |
| E9, 7 amounts | 156 ms | — | — | 160 ms |
| E9, 41 points (default) | 200 ms | 342 ms | 1.5 s | 180 ms |
| E9, 61 points | 165 ms | 238 ms | 1.5 s | — |
| E10 CSV (295 kB) | — | 21 ms (cold, uncached method: 120) | — | — |
| E11 | 1 ms | | — | — |

The default curve builds twice (a probe build finds the usual amount), which is why 41 default points
on the largest address cost more than 61 explicit ones.

**Design notes for the technical document.**
- **Why one batch is valid.** A2's `build_features` never treats rows at the same second as each
  other's history. All hypothetical rows share one timestamp, so none sees another, and one build
  scores them all. Staggering their times is exactly the bug the third meta-test plants.
- **Exact where it can be, bounded where it cannot.** Flags and five methods are exactly equal; three
  methods differ by BLAS summation order (≤ 4.3e-14), the same noise as between two identical single
  calls. The test states that tolerance and why.
- **One 422 for "not enough history".** `score_what_if` returns an unscored row when history exists but
  is under the minimum, and raises when there is none. E8 and E9 turn both into the same 422 with the
  counts and the first scorable date.
- **The export is the screen.** E10 reuses E6's cached view and filters, so the file lists exactly
  what the table shows. Amounts are formatted from integer satoshis with A2's own `format_btc`. Text
  cells that start like a formula (`=`, `+`, `-`, `@`, tab, CR) get a leading apostrophe; numbers stay
  numbers.
- **Scoring once per batch.** Scoring through `fusion.Cached` instead of a score pass and then a flag
  pass halved batch scoring (≈0.26 → 0.13 s for 41 rows) without reimplementing A2's flag logic.

**Choices accepted:**
- Mod numbering follows the plan (batch = Mod-5, 422 = Mod-6).
- E9 accepts a list, a log range or the default.
- The default curve answers 400 on `direction` when that direction has no history at that time.
- `maxGapYears` uses 365.25-day years.
- JSON export in satoshis.
- E11's `burst` is A2's per-transaction recall.

**Carried forward:**
- The back-end suite now takes ~2 min (from 33 s): the wording and parity grids. Consider a `-m "not slow"`
  marker for inner loops, with the full suite before every commit.
- A Uvicorn on port 8000 started detached (parent `launchd`) was still running after the cook
  reported "servers stopped". Owner unclear (it may be the explore cook's test server); cleared once
  no cook is running.
**backend-hardening** cook started: web-layer rewording of A2 reasons, one 400 for every faulty field, `slow` marker, ETag on E2, README draft (every command run). No Should items before MS2 (risk 6).

## 2026-11-12 — Usage limit hit mid-wave; both cooks resumed
Both running cooks (frontend-explore, backend-hardening) stopped on an API usage limit (HTTP 429, monthly
spend / 5-hour window) on the night of 11 Nov. Their unfinished work stayed on disk and uncommitted,
and nothing was half-committed: commits are only made by the lead after review, so an interrupted cook
leaves the repository consistent at `9715eea`. After the reset both were resumed from where they stopped
(not restarted), so no work was repeated.
**Lesson for planning:** high-effort Sonnet cooks cost about 200–300k tokens per package. Two in parallel
plus the lead's reviews used up a 5-hour window in about 4 hours. Keep at most two cooks at once, and put
the next wave's most important package first.

## 2026-11-12 — T18, T25, V7 reviewed and committed

**Delegated to** the frontend-explore cook (Sonnet 5.5, high effort; stopped once by the usage limit and
resumed): 53 tool calls. **Lead review:** index clean; `npm test` **320 passed, 0 skipped**; typecheck
and build clean; main JS **400.3 kB / 130.9 kB gzip** (+6.5 kB gzip on `610331d`'s 124.4, inside the
10 kB allowance); no mock in `dist/`; wording clean; `types.ts` unchanged. Looked at the transactions
tab (desktop) and the About page screenshots against the real back end. Verified in a clean worktree
of the commit: back end **570 passed**, front end 320 passed, build clean. Commit `867c2f9`.

**Back-end findings passed to the hardening cook** (it was editing that code):
- (a) E6 `sort=amount` ordered by signed `netSats`, so "largest first" put every received transaction
  before any sent one. **D-W-12:** sort by absolute amount.
- (b) A2's `format_btc` strips trailing zeros, so the explanation said "0.0011126 BTC" while the screen
  says "0.00111260 BTC". **D-W-13:** BTC amounts in server text are normalised to 8 places in the web
  layer (the plan: "amounts to eight places"); the vendored file is unchanged.

**Server ownership resolved.** The explore cook reports the Uvicorn on :8000 (pid 96319) and the Vite
on :5173 (pid 98068) as its own, and stopped both by PID. This corrects the lead's earlier guess (from
start times) that 96319 was an orphan of the endpoints cook. No stray servers remain.

**Design notes for the technical document.**
- **The URL is the filter state.** One `Filters` object, parsed from the route's query string
  (`lib/transactionFilters.ts`), feeds the filter bar, G2 and the table; none keeps its own copy.
  Serialisation uses a fixed key order, so equal filters give equal links and equal request keys. The
  browser applies the server's rules with the server's wording, and nothing is sent while a date is
  invalid.
- **Pages joined for the chart, not for the table.** G2 needs every matching transaction, so
  `useAllTransactions` fetches E6 pages of 200 in time order (rows cannot move between pages), draws
  after the first page, keeps the previous rows while refreshing, and is cancelled by a filter change.
  The table pages 50 at a time.
- **Zoom and filters stay in step.** Dragging G2's time axis writes `from`/`to`, and reset clears them.
  Plotly reports its own redraws as relayout events, so the wrapper ignores events during a redraw;
  without that guard the dates drifted in a loop.
- **Status and direction never by colour alone.** Orange triangle (unusual), blue circle (not
  unusual), grey diamond (not scored); filled = received, outlined = sent; the legend names both.
  (The plan's "hollow grey" for not scored was not used, so direction stays readable on short-history
  addresses, where every point is not scored.)
- **No sideways scrolling anywhere.** Tables become cards (rows stack, cells carry `data-label`) below
  720 px for the transaction table and 560 px for chart tables. The screenshot script enforces it.

**Choices accepted:**
- Direction labels Received/Sent everywhere.
- Default sort newest first.
- Filter changes replace history.
- The main reason is shown only on unusual rows (a reason on a not-unusual row would read like a flag).
- "Flagged by n of 9 methods".
- The plan's "remember last filters" preference left out (filters live in the URL).

**Carried forward:** the About page's generated feature list lacks an "and" ("Size, Burst, Gap,
Relative size are measured"); the mock-only loading and offline shots were not re-run.
**frontend-whatif** cook started: T19 V4 what-if lab, T27 G5 (MS2 critical path first), then V5 models page (with thresholds in the verdict table) and T22 export menu. `frontend/` only, back end on port 8010.

## 2026-11-12 — Hardening and the what-if lab reviewed; a flaky test found; the Mac lost its developer tools

### Back-end hardening (commit `ee858f7`)
**Delegated to** the backend-hardening cook (Sonnet 5.5, high effort; resumed once after the usage limit):
88 tool calls. Delivered:
- **Mod-12** (`app/services/reasons.py`): A2's F4 reasons "Higher/Lower ratio to the usual amount than
  usual" become "Larger/Smaller amount relative to the usual for this direction", keyed by A2's own
  `headline()`; BTC amounts in A2's text are written to 8 places (D-W-13), checked against E7's facts.
- **Mod-13:** one 400 names every faulty field across both layers.
- **Mod-14:** `sort=amount` by absolute amount (D-W-12).
- E2 ETag; a `slow` marker (`-m "not slow"`: 431 tests in ~28 s; full: 600 in ~2 min).
- **The README draft:** every command run on the Mac except those marked as not run (the Windows block,
  `pip install`, `--assistant-weights`).
**Lead review:** index clean, wording clean (re-run after the tool problem below), vendored files
untouched, README structure checked.

### The what-if lab (commit `d57c220`)
**Delegated to** the frontend-whatif cook (Sonnet 5.5, high effort): 104 tool calls, ~27 min.
**Lead review:** `npm test` **445 passed, 0 skipped**; typecheck and build clean; main JS **139.1 kB
gzip** (+8.2); no mock or fixtures in `dist/`; wording clean. Looked at the lab (the 0.05 BTC example:
flagged 5.98 against 5.00, both crossings marked, "flagged from about 0.023 BTC upwards, and below about
0.000011 BTC") and V5 (nine E11 cards with intervals). The verdict table now has each method's flag
line, which settles the "K-Means 6.69 next to –" confusion: its line is 9.98.
**Lead fix:** CORS now exposes `Content-Disposition`, so a cross-origin page can read E10's file name
(commit `14309b2`).

### A flaky test, found and fixed (commit `89d8c6e`)
The full back-end suite failed **1 run in about 5**, both in the cooks' runs and in clean worktrees with
nothing else running. A first guess, a wall-clock ratio in `test_cache.py` (`warm < cold / 5`), was
removed (the hit counter already proves the cache), but failures continued. Recording failing test names
over repeated runs found the real cause: `test_e9_scores_equal_what_e8_answers_for_each_amount`
compared E9 and E8 **scores with `==`**, and the regression score differed in the 15th digit
(11.471391016432957 vs …962). This is the multithreaded-BLAS noise the parity tests already tolerate
(1e-12). Now flags are compared exactly and scores with the parity helper `agree()`.
**Verification:** three consecutive full runs in a clean worktree, **601 passed** each time; front end
445 passed; build clean.
**Lead mistake recorded:** `14309b2` (the CORS change) broke `test_cors_allows_the_vite_origins_and_nothing_else`,
because the lead ran only `test_http_layer.py` before committing. It was caught by the worktree run
before any push, and fixed in `89d8c6e`. The rule stands: **the full suite runs before every commit**.

### The Mac lost its Command Line Tools
At 08:24 on 12 Nov, `/Library/Developer/CommandLineTools` disappeared, so Apple's `/usr/bin/git` and
`/usr/bin/python3` stubs began asking to install the developer tools. macOS itself was not updated
(the system version dates from 13 Aug), and no installer was running. Deleting that folder needs
administrator rights, which the lead and the cooks do not have. **Workaround (no admin needed):** a
standalone git 2.56.1 in its own conda environment (`conda create -n tools -c conda-forge git`), linked
as `~/.local/bin/git` (first on the PATH). Python commands use the conda interpreters. Pushing works.
The user can reinstall the tools with `xcode-select --install`.

### Design notes for the technical document
- **One place for A2's wording.** A2's explanation template is frozen, so the web layer rewrites its
  output once (two F4 phrases; amounts to a satoshi's precision), keyed by A2's own `headline()`, so a
  change in A2's wording fails `test_reasons.py` first.
- **Two-layer validation, one answer.** Pydantic checks types; each route's service rules then judge the
  values that passed; one 400 lists every field at fault. A value that failed its type check is named
  once.
- **The real-time loop.** The form state becomes a request key, debounced by `web.whatIf.debounceMs`;
  `useRequest` cancels the older request and keeps the previous result, dimmed. "Updating" shows as
  soon as the key and its debounced copy differ (within one frame), so feedback is immediate while the
  server is asked at most once per pause. Keystroke to verdict: ~600–650 ms, including the 250 ms
  debounce.
- **Amounts are strings until the server.** The browser parses BTC amounts as digit strings (BigInt),
  never as floats, and sends the decimal string, so "0.1" is never 0.1000000000000000055.
- **The curve follows the server's flags.** G5 marks crossings between neighbouring points whose
  server flags differ, interpolated on log amount, and writes the sentence under the chart from the same
  runs, rather than re-deriving a rule in the browser.
- **Tolerances are stated, not hidden.** Wherever two code paths compute the same score (batch vs
  single, E9 vs E8), flags are compared exactly and scores within 1e-12, with the reason in the test.

**Carried forward:**
- G5's log-axis tick labels overlap at desktop width.
- Method names differ between E11 ("Robust z baseline (A1)") and the front end's own list ("Robust z
  baseline"); one source (E11) is to be chosen.
**frontend-polish** cook started (one cook only: the front end is the only Must work left before MS2): T21 state catalogue, T28 layouts and touch targets with screenshots into `docs/screenshots/`, method names from E11, the About list wording, and a front-end MS2 dry run. Should items wait for MS2 (risk 6).

## 2026-11-12 — Polish reviewed (T21, T28); **MS2 passed**; model allocation policy

### Frontend polish (commits `55c0b98`, `3a83414`)
**Delegated to** the frontend-polish cook (Sonnet 5.5, high effort; stopped once by the usage limit and
resumed). **Lead review:**
- `npm test` **546 passed, 0 skipped**; typecheck and build clean; main **140.6 kB gzip** (+1.5); no mock
  in `dist/`; wording clean; `docs/screenshots/` 48 files, 13 MB.
- Looked at the lab (G5's ticks now 0.00001…0.1 with no overlap; "usual" on its line) and the 429 state
  (countdown plus "Try again now").
- **Lead change:** CORS also exposes `Retry-After`.
- **The worktree check then failed 4 contract tests:** the cook had put the client-only
  `retryAfterSeconds` (read from a header) into `ErrorExtras`, which every contract-checked error body
  extends. It moved to `ServiceBody`, the body for a 429, which is assembled by the client and not
  contract-checked (`3a83414`).
- Verified in a clean worktree: back end **601**, front end **546**, build clean. Pushed.

**Design notes for the technical document.**
- **One panel, one catalogue.** Every failure leaves the client as an `ApiError` and every view renders it
  through `ErrorState`. `stateCatalogue.test.tsx` crosses 7 views with 8 failure kinds, so a new status
  or view is covered by adding one row. The mock reproduces offline, starting, busy, slow and timeout.
- **Why Plotly's widgets are replaced on touch.** Plotly's range buttons, legend entries and tool bar are
  19–24 px tall with no setting. The wrapper draws its own 44 px range buttons (on every width, so they are
  also keyboard-reachable), drops the tool bar on touch, and makes the legend display-only there.
- **Axis labels fit the room.** `amountTicks` picks the finest log-axis tick set whose widest label fits
  the measured chart width (1-2-5 per decade, then powers of ten, then every nth power), so nothing
  depends on a breakpoint.
- **A slow request says so; a busy service counts down.** One `useSlow` hook, driven by the time limit in
  settings, so the notice and the timeout cannot drift apart. The 429 panel reads `Retry-After`, counts
  down visually, announces the wait once to screen readers, and retries by itself.

### MS2 — passed 12 Nov (plan date 22 Nov)
Run by the lead from a fresh clone with both servers started the README's way. The full record, condition by
condition, is in **`docs/TEST_LOG.md`**. In short:
- **API half:** 28 addresses, 7,966 rows, 822 transaction details (all 681 flagged ones carry the
  limitation line and 9 verdicts), the what-if 5.98 and three invalid bodies refused with 400, 11
  operations (GET and POST), `/docs` 200, 945 bodies with no banned word.
- **Screen half:** 48 shots against the real back end with no sideways scrolling at 390/820/1280.
- Server log clean.

**New tool:** `tools/ms_gate_check.py`, the API half of the gate, re-runnable at MS4 and quoted in the test log.

### Model allocation policy (the user's instruction, 12 Nov) — D-W-14
| Work | Model |
|---|---|
| Replanning, milestone gates (MS2–MS5), architecture, subtle or high-stakes work, final review before submission | **Opus 5.5 or Fable 5.2** (the lead directly, or a Fable/Opus subagent for a big standalone piece), always with a detailed written plan or record first |
| Routine features that follow an existing pattern | **Sonnet 5.5**, medium effort; high only when the work is subtle |
| Mechanical work: recording fixtures, screenshot runs, docstring/comment passes, tables from `openapi.json`, log tidying | **Haiku 5.5** |
| Cheap shell checks (test runs, curl probes, size checks) | the lead directly (low token cost) |

**Why:** until now every cook was Sonnet at high effort, including mechanical work, and two 5-hour
windows ran out. Matching the model to the work stretches the budget to 5 Dec, and keeps the strongest
models for the decisions that carry the marks.

## 2026-11-12 — Replanned the Should tier; wave A started
Plan written on Opus: **`docs/PLAN_SHOULD.md`** (what each Should item needs, dependencies, waves A–D with a model per package, review routine, cut rules, usage trigger, team decisions). Wave A: **A-back** (Sonnet 5.5 medium: S-04 watchlist back end E13–E15 on SQLite; `ranks` per method in E7/E8 for G4) and **A-front** (Sonnet 5.5 medium: S-01 method menu; S-03 G6 on V5).

## 2026-11-12 — Decisions from the team and the tutor; developer tools back
- **CR-08 (live lookup) approved by the team** (reported by the user, 12 Nov). **D-W-15:** S-09 becomes wave B2 in
  `docs/PLAN_SHOULD.md` (one Sonnet 5.5 high package for both tiers; off by default; the Must tier still needs no
  network, D-A3-7). The four names belong in the minutes.
- **Generative AI: the tutor said in person that AI use is acceptable**; an email confirmation is expected (to be
  saved in `docs/brief/` and quoted in the report's declaration). This lowers risk 32 (rule broken or
  under-declared). The logging in `docs/AI_USE_LOG.md` continues unchanged, since the declaration is still required.
- **Command Line Tools:** `/Library/Developer/CommandLineTools` was recreated at 08:26, two minutes after it
  vanished, so an update was reinstalling them. `xcode-select --install` reported them installed. The
  `~/.local/bin/git` link to conda's git was removed; Apple's git 2.50.1 is in use again (the conda `tools`
  environment stays as a fallback).

## 2026-11-12 — Wave A back end reviewed (S-04 watchlist back end, S-02 ranks)
**Delegated to** the A-back cook (**Sonnet 5.5, medium effort**): 30 tool calls, ~12 min, **~130k tokens** (the
high-effort packages cost 250–380k; the cheaper policy, D-W-14, works). **Lead review:** index clean; vendored
files unchanged; wording clean. Live probe on a scratch database (`EXPLORER_DB`): PUT 201 then 200; one 400
naming `label` (41 characters) and `note` (a number); PUT for an address outside the snapshot 404; DELETE 204
then 404; E7 `ranks` for all nine methods on a flagged transaction (baseline 1.0, regression range 0.485);
E7 body 3,041 bytes (budget 6 kB); clean log. Verified in a clean worktree: back end **646 passed**, front end
546, build clean. Commit `a411820`.
**Design notes:**
- **An exact cap under concurrency.** One SQLite connection behind a lock; the count check and the insert
  run in one `BEGIN IMMEDIATE` transaction, so the 200-entry limit holds when requests arrive in parallel on
  the thread pool (tested with 100 threads against a limit of 10).
- **Ranks without rescoring.** A rank is the share of the address's own scored transactions at or below
  this score, found by `searchsorted` in one sorted pool per address and method, built from the cached
  `score_address` result. For a what-if, the pool is the stored scores strictly before its time, the same
  history it is judged against.
- **No file at import.** The database opens in the lifespan (`create_app(database=…)`, then `EXPLORER_DB`,
  then `backend/var/explorer.db`), so tests and tools that build the app write nothing.
**Minor, for polish:** a non-text `note` gets "Must be text of an acceptable length", which reads oddly for a
wrong type.

## 2026-11-12 — Wave A front end reviewed (S-01 method selector, S-03 G6)
**Delegated to** the A-front cook (Sonnet 5.5, medium effort): 81 tool calls, ~18 min, ~236k tokens. **Lead review:**
`npm test` 575, typecheck and build clean, main **142.4 kB gzip** (budget 150), no mock in `dist/`, wording clean;
looked at V5 with G6. The cook reported one flaky test it had not caused; the lead reproduced and **fixed the race**:
`g5WhatIfResponse` read the first chart draw, but the method's E11 name (via `useMethods`) can arrive after it, so
under load the test saw the fallback name. It now waits for the redraw. Three consecutive full runs under load:
575 passed. Verified in a clean worktree: back end 646, front end 575, build clean. Commit `2411243`.
**Measured** (production build via `vite preview` on the real back end): method-switch feedback 8–24 ms; overview
updated in 32–36 ms warm (worst 46 ms), 175 ms (running example) to 349 ms (largest) cold. The plan's target is 0.5 s.
**Design notes:**
- **The link decides the method.** `method=` is in the URL (left out for the default), so a shared link reproduces the
  view exactly; the remembered preference only seeds links out of V1. Requests and caches are keyed by method.
- **G6 is honest about what it measures.** Recall per planted pattern with 95 % intervals, straight from E11,
  captioned as measured on planted test transactions, which says nothing about accuracy on real activity.
- **Waiting for the state, not the first event.** Tests of charts whose words come from a second request wait for
  the redraw that carries them; reading the first draw raced under load.
**Choices accepted:** the what-if lab keeps the baseline (E8/E9 take no `method`) and says so; the method menu is on V3 too.

## 2026-11-12 — Wave B reviewed (Assistant back end; watchlist UI, G4, replay); worktree parallelism; usability pack

### Wave B front end (commit `0f4febf`)
**Delegated to** B-front (Sonnet 5.5, medium): 83 tool calls, ~20 min, ~269k tokens. **Lead review:** 610 tests twice,
typecheck and build clean, **no mock in `dist/`** (the cook had not checked; the lead did), wording clean, the replay
never says "live". Lead's own measurement: **first-screen JS 145.3 kB gzip** (entry plus preloaded chunks, gzip -9),
inside the 150 kB budget with little room, so every later screen is lazy-loaded. Looked at the replay screenshot.
Verified in a clean worktree: back end 646, front end 610, build clean.
**Design notes:**
- **The watchlist is a store, not a request cache:** a module-level `useSyncExternalStore` keeps the star, V1 and V6
  in step, with optimistic removal rolled back if the service refuses.
- **The replay is honest:** each row carries its snapshot verdict, which never used later transactions (the
  time-safety rule), so replaying forward shows what the Explorer would have said on the day; replaying every row
  reproduces E5's days and totals exactly (a test asserts it). The charts' axes stay fixed to the full history.
- **G4** shows where a transaction ranks among the address's own transactions for each model, on each model's own
  scale (E7/E8 `ranks`), with the deciding method ringed.

### The Assistant back end (commit `6e1a6b8`)
**Delegated to** B-back (Sonnet 5.5, **high**: subtle work): 65 tool calls, ~20 min, ~214k tokens.
**Lead review:**
- The 5 newly vendored `lm/` modules (`writers`, `chat`, `generate`, `model`, `tokenizer`) are byte-identical to A2
  `aa56a26`; `vendor_a2.py --check` passes; the weights stay git-ignored.
- **The precompute finished:** 677 distinct fact sets for the 681 flagged transactions, **all 677 written by the
  Assistant and passed A2's guardrail, 0 template fallbacks**, ~2.2 s each (`backend/data/assistant_answers.json`,
  472 kB).
- The 32 Assistant tests re-run on the finished file.
- Live probe:
  - a prepared answer, served in 0.0 s;
  - a fresh what-if, which loaded the real model and wrote a guarded answer in **6.7 s**;
  - a concurrent second request, **429 with `Retry-After: 10`**;
  - the repeat, cached in 0.0 s;
  - a clean log.
- Clean worktree: back end **677 passed, 1 skipped** (the real-model test, since the weights are not in git), front
  end 610, build clean.
- **D-W-09 closed:** `EXPLORER_ASSISTANT` is back to `auto`.

**Choices accepted:**
- The served text gets the Mod-12 rewording after the guardrail has judged the writer's own words. The rewording
  changes no value, and re-checking would wrongly fail "0.05000000" against "0.05".
- A cancelled request finishes in its worker and is cached (a thread cannot be cancelled, and greedy decoding means
  a retry gets the same answer).
- Prepared answers are keyed by the facts hash, so an identical what-if hits them too.

**Design notes:**
- **One answer at a time, without queueing:** a try-lock answers 429 at once and the client counts down from
  `Retry-After`; memory and prepared answers bypass the lock, so only new writing is serialised.
- **Greedy decoding makes caching sound:** same facts, same answer, so the cache key is the SHA-256 of A2's facts
  summary, and failures are cached too. Prepared answers use the same key and are re-checked by the guardrail when
  served.
- **Torch is optional:** `find_spec` decides "not installed" without importing it. With the Assistant off or absent,
  E12 answers the template and the reason. The Must tier and every test run without torch.
- **A rejected answer cannot leak:** the service keeps only the names of failed checks, never the rejected text.

### Parallel cooks in git worktrees (the user's instruction: more cooks at once, detailed reports) — D-W-16
From now on each **code** cook runs in its own git worktree on its own branch (the Agent tool's worktree
isolation). It commits there (no AI attribution, no push), and the lead reviews each branch and merges it into
`main`, resolving overlaps (`types.ts`, `endpoints.ts`, `mockApi.ts`, `main.py`). **Document-only** cooks write in
their own folder under `docs/` in the main tree.
Running now:
- **B2 live lookup** (S-09, Sonnet high, worktree)
- **C-front** (S-05 panel, S-07, S-08; Sonnet medium, worktree)
- **C-tools** (S-12 `measure.py` and CI; Sonnet medium, worktree)
- **report-material** (Haiku, `docs/report-material/`)

### Usability pack (commit `7c3dd25`)
**Delegated to** a Haiku 5.5 cook (~109k tokens). Delivered `docs/usability/`:
- the facilitator's script (five tasks on real data: s08's four from A1 plus the added what-if task);
- the observation sheet, with **Nielsen's 0–4 severity scale**. The brief said 1–4, but the plan says 0–4, so the
  plan won;
- a consent template marked for the Swinburne check;
- the accessibility checklist.

The tool refused the cook's write of `findings-template.md`; the cook did not work around it, and the lead saved its
text. **For the team:** check the consent template; book two participants; pick Task 3's flagged day in rehearsal;
confirm Task 5's threshold on the build.

## 2026-11-12 — Report material reviewed (Haiku); clarifications
**Delegated to** a Haiku 5.5 cook (~194k tokens): `docs/report-material/` with:
- `api-reference.md`/`.tex` **generated** from `openapi.json` by `make_api_reference.py` (15 operations on 14 paths,
  55 schemas; it refuses banned words in its output; the lead re-ran it);
- `measurements.md` (every figure copied with its source, and a list of what is "not measured yet");
- `decisions.md`;
- `design-notes.md` (55 notes, generated from this log);
- `screenshot-index.md` (58 files, generated);
- `video-shotlist.md` (6:35).

**Lead correction:** the shot list thought only `0.123456789` was refused in the browser. The MS2 dry run had
confirmed six refusals, and direction cannot be mistyped (two buttons). Fixed.
**Clarifications the cook asked for** (this log is append-only, so they are recorded here):
- In the 11 Nov E5–E7 timing table, the body column reads "plain size (gzip size)".
- **D-W-11 supersedes the plan's E10 line** ("on flagged rows, the limitation line"): every CSV row carries it, as the
  wording rule requires. The plan itself is not edited.
- The 48 screenshots of the MS2 record grew to 58 with wave A/B. Shots 53 = 08 and 54 = 16 are byte-identical (the G4
  shots capture the same transaction page, which now holds G4): use one of each in the report.
- "Ready" times differ by run and machine load: 0.7 s (11 Nov), 1.3 s (MS1 clone), 0.8 s (MS2 clone). The report
  should quote `tools/measure.py`'s run when it lands.

**Gaps for the report (T47):** **no architecture figure has been drawn yet**; the Week 9 minutes (recording D-A3-1…11,
CR-07/CR-08 by name) are the team's.

## 2026-11-12 — Four cooks interrupted (usage limit; three stopped by hand) and continued
The usage limit hit again (5-hour window; the message also cites the monthly spend limit) while four cooks ran,
and three were then stopped by hand by accident. The system will not resume an agent stopped by hand, so at the
user's request the lead started **new cooks that continue inside their predecessors' worktrees**, so no work was lost:
- **live lookup** (S-09, Sonnet high): on branch `worktree-agent-a93f6e580f3925d66`, from commit `6ef05fd` (A2's
  `explorer/transactions.py` vendored);
- **measure.py and CI** (Sonnet medium): on branch `worktree-agent-a0670ebff94dc37ab`, reviewing and keeping the 4
  uncommitted files;
- **architecture figures** (Fable 5.2): restarted from scratch (nothing had been written).

The Assistant-panel cook (hit by the limit, not stopped by hand) was resumed directly.
Housekeeping: `.claude/` (where agent worktrees live) is now git-ignored (`588deba`).
**Lesson:** five cooks in parallel used up a 5-hour window in about 1.5 hours. Parallel work speeds up progress,
but each window now buys less work.

## 2026-11-13 — S-12 measure.py and CI merged (first branch merged from a worktree)
**Delegated to** the C-tools cook (Sonnet 5.5, medium; continued after an accidental stop and a usage limit) in worktree
branch `worktree-agent-a0670ebff94dc37ab`. Commits `0f69f02`, `c5d3f84`; **merged** as `75eaf5a`.
**Lead review:**
- commits carry no attribution;
- the Vite proxy change only adds an optional `EXPLORER_API` override (default still :8000);
- the CI file is read-only, cancels older runs and uses the README's own commands;
- the new scripts pass `node --check`;
- `measure.py` compiles;
- a clean worktree of the merge: back end 677 + 1 skipped, front end 610, build clean.

**The quoted measurement run** (`docs/report-material/measured/measure.md`; Apple M5, a freshly started back end,
15 repeats, production build) — **every budget passes**:

| Measure | Budget | Running example | Largest |
|---|---|---|---|
| E5 cold / warm | 150 / 20 ms | 1.9 / 1.5 ms | 1.6 / 1.3 ms |
| E6 200 rows cold / warm | 150 ms | 2.8 / 2.9 ms | 2.8 / 2.6 ms |
| E7 cold / warm | 150 ms | 2.7 / 1.5 ms | 1.4 / 1.2 ms |
| E8 cold / warm | 700 ms | 327 / 274 ms | 332 / 372 ms |
| E9 41 points cold / warm | 1.5 s | 214 / 210 ms | 341 / 436 ms |
| E5 / E7 plain bodies | 60 / 6 kB | 11.6 / 3.0 kB | 18.4 / 2.9 kB |
| First-screen JS (gzip -9) | 150 kB | 145.3 kB | |
| Page open → first chart (G1 / G2 / G5) | 1.5 s | 333 / 370 / 934 ms | |
| Chart redraw (G1 / G2 / G5) | 300 ms | 72 / 44 / 35 ms | |

Caveats stated in the script: cold E5 is a cache hit (the cache warms at start); times are client-side on
loopback; the 50,000-point WebGL and "first view usable in 2 s" budgets are not scripted.

**CI dry run** (from a `git archive`, fresh venv, no torch):
- back end: `pip install`, `vendor_a2.py --check`, pytest **677 passed, 1 skipped** (219 s wall);
- front end: `npm ci`, 610 tests, typecheck and build.

**Design notes:**
- **One script, one table.** The report quotes `measure.py`'s generated table (date, commit, machine, repeats) rather
  than hand-copied numbers. Each figure with a plan budget gets pass/fail, and the script exits 1 on a failure.
- **CI as the README's commands.** Two independent jobs (back end without PyTorch, so the Assistant's tests skip;
  front end from the lock file), caches keyed on the dependency files, and a newer push cancels the older run to save
  private-repo minutes.

**Note:** `chart-timings.mjs` missed a draw about once in 40 runs (cause unknown), so it retries up to 3 times and
reports retries on stderr.
**Push blocked (13 Nov):** GitHub refused `75eaf5a` because the login token lacks the `workflow` scope ("refusing to allow an OAuth App to create or update workflow `.github/workflows/ci.yml`"). Local `main` is ahead of `origin/main` until the user grants the scope (`gh auth refresh -h github.com -s workflow`, then `gh auth setup-git`).

## 2026-11-13 — C-front merged (S-05 panel, S-07, S-08); architecture figures (Fable)
**C-front** (Sonnet 5.5, medium; resumed twice after usage limits) on branch `worktree-agent-af1bba6203d9d303f`,
commits `a5029d1`, `bc14059`, `658d94e`, `fc31a29`, **merged** as `ea70d25` (git merged `screenshots.mjs` cleanly
with C-tools' refactor; the lead checked its syntax and shot list).
- Clean worktree of the merge: back end 677 + 1 skipped, front end **635**, build clean, no mock in `dist/`, wording
  clean, **first-screen JS 146.9 kB gzip** (budget 150; 3.1 kB left).
- **S-05 panel:** template first; for a flagged snapshot transaction where the model cannot run, E12 is asked at once
  (the prepared answer); where it can run, a button, so opening a page never starts a 10 s write; a progress line with
  "Keep the template"; failed checks named in plain words; 429 through the existing countdown; a per-call 90 s limit.
  Shown under the default method only (the prepared answers describe the baseline's flag).
- **S-07:** box or lasso in G2, or a span-of-days form for keyboard and touch, selects table rows with a summary. A
  real-browser bug was found and fixed: Plotly reports an empty selection while redrawing to show one.
- **S-08:** keep up to 10 what-ifs per address, compare two, CSV with the limitation line on every row.

**Architecture figures** (Fable 5.2, ~364k tokens): `docs/report-material/figures/` holds `architecture`, `whatif-flow`
and `request-lifecycle`, each as compilable TikZ (pdflatex, exit 0), PDF and SVG, generated from one description in
`make_figures.py` so the two formats cannot drift. Every box is checked against a named source file (`README.md`).
The figures record **16 plan-versus-code differences** (V1–V7 not V8; G1–G6; E1–E15; five middleware layers;
`useDebouncedValue`; two-layer validation; E9 independent of E8; and others).
**Lead update:** the footer said "no view calls E12". That was true when drawn and stale after `ea70d25`, so it was
regenerated, and README row 14 updated. A stale comment in `api/endpoints.ts` about exposed headers was corrected.
**For the report:** at full width, the architecture figure is about two-thirds of a page of the 1.25-page section.
Either trim the footer and legend, or move it to the appendix and keep `whatif-flow` in the body (the team's call).

## 2026-11-13 — S-09 live lookup merged; **work paused at the user's request**
**Live lookup** (Sonnet 5.5, high; continued after an accidental stop, two usage limits and a network error) on
branch `worktree-agent-a93f6e580f3925d66`, commits `6ef05fd`, `2237c10`, `71a3f2f`, `15cae09`, **merged** as `8ff1519`.
**Four conflicts** (two cooks appending to the same places), resolved by the lead:
- `vite.config.ts`: both proxy overrides kept (`EXPLORER_API ?? VITE_PROXY_TARGET ?? :8000`);
- `endpoints.ts`: imports combined;
- `screenshots.mjs`: both shot sets kept, and the live branch's private DevTools client dropped (main had moved it to
  `cdp.mjs`);
- `base.css`: both blocks kept.

**Verified:** a clean worktree of the merge gave back end **724 passed, 2 skipped**, front end **650**, build clean, no
mock, **first-screen JS 147.8 kB gzip** (budget 150). Then `tools/ms_gate_check.py` on the running app (live lookup
on) **passed**: 28 addresses, 7,966 rows, 681 flagged with the limitation line, 945 bodies with no banned word,
**20 operations** (GET, POST, PUT, DELETE).
**The cook's evidence:**
- 5 real Esplora fetches of `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh` (500 of 1,157 transactions in 27.6 s, 490
  scored, 24 flagged on 20 days);
- cancel stores nothing;
- live off → 403;
- three snapshot addresses pushed through the live route match their saved scores within 1e-9 (Mod-11);
- tests never use the network: a fake Esplora, and an autouse guard on `urlopen`.

**A real bug the cook fixed:** the ETag middleware buffered the event stream (it treats `no-cache` 200s as snapshot
data), so the dialog would have shown nothing until the end. The stream now sends `no-cache, no-transform`, with a
regression test.
**Design notes:**
- **A fetched address takes A2's held-out route:** `build_transactions` → `build_features` → the 70 % split → every
  frozen method. The regression's per-address residual scale is recomputed by the training's rule. Parity within
  1e-9 is the evidence.
- **Progress is an append-only event list:** E17 returns the current state; E18 replays the list from the start, then
  follows it. A late or reconnecting client misses nothing, and polling E17 needs no new code.
- **Politeness and privacy are structural:** only the address is sent; requests are paced; one lookup at a time and
  6 an hour; the cache is local and "Forget" deletes it together with the watchlist entry.

**Demo risks:** the first fetch of an address needs Blockstream reachable (fetch the demo address beforehand: the
cache then answers for 7 days); a 500-transaction fetch takes ~25–30 s.

### Paused (13 Nov), at the user's request
- **State:** `main` = `8ff1519` (+ this log). All merged worktrees and branches removed; no agent running.
- **Every Should item but S-11 is built:** S-01 to S-10 (types half deferred), S-12.
- **Running for the user:** back end on :8000 (live lookup on) and front end on :5173, detached.
- **GitHub is behind:** pushes are refused until the token has the `workflow` scope (CI file). 12+ reviewed commits are
  local only.
- **Usage:** limits were hit five times in two days. Five parallel cooks use a 5-hour window in about 1.5 hours.

## 2026-11-14 — Session journal, 10–13 Nov (written before the chat was compacted)
**From an empty folder to MS2 plus 11 of 12 Should items in four days.**
- **10–11 Nov:** read both plans and wrote `TODO.md`. Installed Node; created the private repo. Identified the
  submitted A2 commit from the downloaded zip (`aa56a26` = `v1.0`; the zip adds wording-only edits and the Assistant's
  weights). Wave 1: the back-end core and the front end on A3's layout. Wave 2: charts, E3–E7. **MS1 passed** from a
  fresh clone (a cross-tier contract test was fixed on the way).
- **12 Nov:**
  - What-if E8/E9 (batched build; parity shown, planted bugs caught), export E10, methods E11.
  - Hardening (reason rewording, one 400 for every field, sort by size).
  - The what-if lab, V5, the state catalogue and layouts.
  - **MS2 passed** from a fresh clone (`docs/TEST_LOG.md`).
  - Replanned the Should tier on Opus (`docs/PLAN_SHOULD.md`).
  - Waves A and B: method selector, G4, G6, watchlist, replay, and the Assistant (E12; 677 prepared answers, all
    guardrail-passed).
  - Usability pack; report material.
- **13 Nov:**
  - Parallel cooks in git worktrees: `measure.py` (every budget passes) and CI; the Assistant panel, linked
    selection, scenarios; architecture figures (Fable); live lookup S-09 (merged with 4 conflicts resolved).
  - Paused by the user, with the app left running on :8000/:5173 for them.

**Decisions made with the user:**
- the private repo;
- no AI co-author lines;
- the tutor accepts AI use (in person; email expected);
- CR-08 approved by the team;
- the model allocation policy (D-W-14);
- more parallel cooks in worktrees (D-W-16).

**Recurring problems and their fixes:**
- **Usage limits** (five times): resume agents rather than restart them.
- **Agents' false claims** (about 1 report in 3): verify everything.
- **Flaky tests:** BLAS noise compared with `==`; a wall-clock ratio; a test reading the first chart draw.
- **The Mac's Command Line Tools** vanished for two minutes (an update): conda git as the fallback.
- **GitHub refuses the CI file** without the `workflow` scope: the user must refresh the token.

**Context files:**
- `CLAUDE.md` (auto-loaded), `docs/HANDOFF.md` (full cold start), `TODO.md`, this log, `docs/TEST_LOG.md`,
  `docs/PLAN_SHOULD.md`, `docs/AI_USE_LOG.md`;
- memory: `~/.claude/projects/-Users-tritran2411/memory/cos30049-a3-plan.md`.

## 2026-11-15 — UI remake on branch `ui-remake` (member-led, Opus 5.5)

The member (Cao Tri) was unhappy with the look and asked for a full UI makeover, then for a layout change.
Work happened in a worktree `../COS30049A3-ui` on branch `ui-remake` (from `main` `d039e64`), previewed on a second
dev server at :5174 next to the original on :5173. Six commits, all as Defaul119, logged in `docs/AI_USE_LOG.md`:

- `fd9e2ba` palette and fonts: glacier blue, navy and lemon (the member's brief); self-hosted IBM Plex via
  `@fontsource/ibm-plex-sans` and `-mono` 5.2.6 (SIL OFL, Latin subset; no third-party request, works offline).
  All styling sits in one new file, `frontend/src/styles/remake.css`, loaded after `base.css` and `shell.css`.
- `d96cd11` layout v2, after a study of block explorers (Blockstream captured; Etherscan and Blockchair block automated
  browsers and were not worked around) and a static mockup the member approved: header address search on every page
  (`HeaderSearch`, hands the text to Screen 1 via `#/?q=`, `/` focuses it), address profile card with a metric strip,
  tabs on top of their content, a right rail of unusual days on the overview, the day page's heading and day
  navigation in one card; restrained palette (navy brand, steel data, lemon only for badges/focus, gold `#a67c00` for
  unusual marks in light mode). Chart hints and About now say "yellow triangles". The tab bar is kept in one place in
  the tree (switching tabs re-mounted it and lost focus; a test caught it).
- `0d65064`, `938ef03`, `c10da09` home page: navy hero with one big lookup field and a lemon button, snapshot summary
  strip (sums of E3), address list with a client-side filter and sort, one-line rows, kind chips and a steel
  unusual-share bar; the status dot and theme switch moved into the header (grey strip removed; the E2 snapshot line
  moved to the footer); the header search is hidden on the home page; the three-step guide was removed at the
  member's request.
- `23379c6` tests: three timing-sensitive `transactionsTab` tests checked an in-between state that lasted 100-150 ms of
  mock latency and failed about 1 run in 3 under load, **on `main` too**. Latency is now 400 ms with longer final
  waits; assertions unchanged.

Checks on the branch: typecheck; 657 front-end tests (7 new: header search, home list); first-screen JS
**149.4 kB of 150** (almost no headroom: keep anything new lazy); every text pair contrast-checked; full screenshot
set at 1280/820/390 with no sideways scroll. Not merged into `main`: the member and team review it first.

Decision **D-W-17**: the visual design and layout follow the remake (member's call, 15 Nov). `docs/screenshots/` and
the report/usability material still show the old look and must be re-taken after the merge.
