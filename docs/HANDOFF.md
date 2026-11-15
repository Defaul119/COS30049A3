# Handoff — COS30049 Assignment 3 (for any model or person picking this up)

Written 12 Nov 2026 by the lead (Claude Opus 5.5) so that another model run through the Claude Code
CLI (for example DeepSeek) or a teammate can continue **without any earlier conversation**. Read this
whole file first, then `TODO.md`, then the newest entries of `docs/WORKLOG.md`.

---

## 1. What the project is

- **Unit:** COS30049 Computing Technology Innovation Project, Swinburne (HCMC). **Group:**
  HCMC_COS30049.1_4. **Members:** Cam Dan Bui, Cao Tri Tran (the user, GitHub `Defaul119`), Le Quang Anh
  Hoang, Minh Khang Nguyen. **Tutor:** Arthur Hoang.
- **Assignment 3** (45 % of the unit): a full-stack web app on Assignment 2's models. **Due Sun 6 Dec
  2026 23:59 GMT+7; planned submission Sat 5 Dec.**
- **The product:** *Bitcoin Address Activity Explorer*, a React + TypeScript (Vite) front end and a
  FastAPI back end around A2's `Predictor`. It shows one Bitcoin address's activity per day, marks
  transactions that are **unusual compared with the same address's own earlier history**, explains
  why, shows what each of 9 models says, and lets the user try a hypothetical ("what-if") transaction.
  It is an **unusual-activity indicator, never a verdict about a person**.
- **The plan is the specification.** `docs/plan/main.pdf` (69 pages; LaTeX sources in
  `docs/plan/sections/*.tex`, which are easier to read). It defines scope IDs (M-01…M-16 Must, S-01…S-12
  Should, C-01…C-07 Could, W-01…W-08 Won't), endpoints E1–E22, views V1–V8, charts G1–G9, journeys J1–J8,
  tasks T01–T52 and milestones MS1–MS5. **Where this file and the plan disagree, the plan wins.**
  A 17-page team briefing is at `~/Desktop/COS30049/explainers/a3/a3.pdf` (sources `t01`–`t05`); its
  chart owners are stale.
- **Brief and rubric:** `docs/brief/` (Markdown). 40 of the 45 marks are judged from the running app and
  the 7-minute video; the report (8 pages) is 5 marks.

## 2. Status — **PAUSED on 13 Nov 2026** at the user's request

| Milestone | Date | State |
|---|---|---|
| MS1 walking skeleton | Sun 15 Nov | **Passed 11 Nov** (`docs/TEST_LOG.md`) |
| MS2 minimum viable demonstration | Sun 22 Nov | **Passed 12 Nov** (`docs/TEST_LOG.md`; re-run with `tools/ms_gate_check.py`) |
| MS3 feature freeze (Should items finished or cut) | Fri 27 Nov | **11 of 12 Should items built**; left: S-11 browser tests, the S-10 generated-types half |
| MS4 code freeze, `v1.0-rc`, clean install Win + Mac | Sun 29 Nov | |
| MS5 submit on Canvas | Sat 5 Dec | |

**`main` (local) = `8ff1519` plus log commits, all merged and verified.**
- Clean worktree: back end **724 passed, 2 skipped** (the real-model and opt-in network tests), front end **650**,
  build clean, no mock in `dist/`, first-screen JS **147.8 kB gzip** (budget 150; keep new screens lazy).
- `tools/ms_gate_check.py` passes on the running app.

**Built:**
- **Back end, 20 operations:** E1–E11 (Must); E12 Assistant; E13–E15 watchlist (SQLite); E16–E20 live lookup (off by
  default, `EXPLORER_LIVE_LOOKUP=on`).
- **Must-tier features:** ETag/304, 413, 429 with `Retry-After`, one error body, two-layer validation (one 400 names
  every faulty field).
- **Should-tier features:** per-method `ranks`, 677 prepared Assistant answers (all passed A2's guardrail).
- **Front end:** V1–V8:
  - address selection with watch star and recent addresses;
  - overview with method menu, G1, flagged days, replay;
  - Transactions tab with filter bar, G2 with linked selection, table, export;
  - What-if lab with G5, G4, scenarios and the Assistant panel;
  - transaction view with G3, G4, verdict table with flag lines, Assistant panel;
  - V5 models with G6; V6 watchlist; V7 about; V8 live-lookup dialog.
- **Front end, everywhere:** the full state catalogue, 44 px touch targets, light and dark.
- **Tools and docs:**
  - `tools/measure.py` (every plan budget passes; `docs/report-material/measured/`);
  - CI workflow `.github/workflows/ci.yml`;
  - report material, API reference and three architecture figures (`docs/report-material/`);
  - usability pack (`docs/usability/`);
  - 64 screenshots (`docs/screenshots/`).

**Not on GitHub yet:** pushes are refused because the token lacks the `workflow` scope (needed for the CI file).
The user must run `~/.local/bin/gh auth refresh -h github.com -s workflow` then `~/.local/bin/gh auth setup-git`;
after that, `git push`, and check the first CI run with `gh run list`.

**Running when paused** (started for the user to look at):
- back end `uvicorn` on :8000 with `EXPLORER_LIVE_LOOKUP=on`, and the front end `npm run dev` on :5173, both
  detached;
- PIDs in the session scratchpad (`app-backend.pid`, `app-frontend.pid`);
- otherwise find them with `lsof -i :8000 -i :5173` and stop them with `kill`.

**15 Nov: UI remake on branch `ui-remake`** (worktree `../COS30049A3-ui`, pushed to origin, **not merged**): new
look and layout (profile card, rail, header search, home hero and filterable list), self-hosted IBM Plex fonts, all
styling in `frontend/src/styles/remake.css`; 657 front-end tests; first-screen JS 149.4 kB of 150. Details:
`docs/WORKLOG.md` (15 Nov) and decision D-W-17. Its dev server runs on :5174 next to `main`'s on :5173 (stop it with
`lsof -i :5174` and `kill`). The worktree has its own `node_modules` (npm replaced the first symlink); the main checkout
needs `npm ci` after the merge, because `main`'s `node_modules` has no `@fontsource` packages yet.

**No agent is running.**

## 3. Where everything is

| What | Path |
|---|---|
| A3 repository (work here) | `~/Desktop/COS30049/COS30049A3` (branch `main`) |
| Task list (keep current) | `TODO.md` |
| Engineering log (append-only; source for the technical document) | `docs/WORKLOG.md` |
| AI use log (source of the report's AI declaration) | `docs/AI_USE_LOG.md` |
| The plan | `docs/plan/main.pdf`, `docs/plan/sections/*.tex` |
| Brief | `docs/brief/` |
| README (draft; T43 completes it) | `README.md` |
| Web changes to A2 code, each with its test | `backend/MODIFICATIONS.md` (Mod-1…Mod-14 so far) |
| API contract | `backend/openapi.json` (regenerate: `python -m app.core.openapi` from `backend/`) |
| Front-end contract | `frontend/src/api/types.ts` (a back-end test parses it, see §6) |
| Shared test vectors (pytest **and** Vitest) | `shared/address_vectors.json`, `shared/whatif_vectors.json` |
| Assignment 2 repository (**read-only**) | `~/Desktop/COS30049/COS30049A2` (tag `v1.0` → `aa56a26`, local only, not pushed) |
| A2 submitted zip (downloaded) | `~/Downloads/COS30049A2_submisison-20261111T145705Z-1-001.zip` |
| Assistant weights (610 MB, verified, git-ignored) | `~/Desktop/COS30049/A2_submitted_artifacts/models/assistant/` (also copied into `backend/models/assistant/`) |
| A1 prototype (origin of the front end) | `~/Desktop/COS30049/asm1_demo` (commit `8375cf0`) |

## 4. Machine and tools (Mac, Apple M5, macOS 26.6)

- **Node v24.22.2** in `~/.local/node`, linked from `~/.local/bin` (already on the zsh PATH). In
  non-interactive shells run `export PATH="$HOME/.local/bin:$PATH"` first.
- **Python:** conda at `~/miniconda3` (not on the PATH; the `defaults` channel was removed, so use
  conda-forge). Back-end env **`cos30049-a3`** → `~/miniconda3/envs/cos30049-a3/bin/python`
  (Python 3.11.18, numpy 2.2.6, pandas 2.2.3, scikit-learn 1.6.1, FastAPI 0.162.4, Uvicorn 0.54.0,
  Pydantic 2.14.3, httpx2 2.16.0, pytest 9.2.0). A2's env `cos30049-a2` also exists.
- **Apple's Command Line Tools** vanished briefly on 12 Nov (08:24–08:26, an update reinstalling them) and are
  back: `/usr/bin/git` works again. If `git` ever asks to install developer tools, a fallback exists:
  `~/miniconda3/envs/tools/bin/git` (conda-forge git 2.56.1). Use the conda Python for project work in any case.
- **GitHub CLI:** `~/.local/bin/gh`, logged in as `Defaul119`. Pushing over HTTPS works.
- **No sudo, no Homebrew.** Never try to use either.

## 5. How to run, test and verify

```bash
export PATH="$HOME/.local/bin:$PATH"; cd ~/Desktop/COS30049/COS30049A3
P=~/miniconda3/envs/cos30049-a3/bin/python

# back end
cd backend && $P -m uvicorn app.main:app --port 8000      # ready ~1 s; /docs lists every endpoint
$P -m pytest -q                      # full suite, 724 passed + 2 skipped, warnings are errors
$P -m pytest -q -m "not slow"        # quick run (inner loop only)
PARITY_FULL=1 $P -m pytest -q tests/test_whatif_parity.py   # 1,517 amounts, ~8 min (optional)
cd .. && $P tools/vendor_a2.py --check                       # A2 files unchanged (hashes)

# front end (second terminal; Vite proxies /api to 127.0.0.1:8000)
cd frontend && npm ci && npm run dev  # http://localhost:5173
npm test                              # Vitest, 650 tests, 0 skipped
npm run typecheck && npm run build    # must be clean, no warnings
VITE_API_MODE=mock npm run dev        # runs on the recorded fixtures, no back end
npm run fixtures                      # re-record fixtures from a running back end
npm run screenshots                   # layouts at 390/820/1280; fails on sideways scroll
```

**The verification protocol before every push** (each step exists because skipping it once caused a problem):
1. `git diff --cached --name-only` shows only the files you mean to commit (an agent once left paths staged).
2. Commit locally. Then verify **in a clean worktree of that commit**, never in a working tree that
   another agent is editing:
   ```bash
   W=/tmp/a3-verify; git worktree add -q --detach $W HEAD
   (cd $W && $P tools/vendor_a2.py --check)
   (cd $W/backend && $P -m pytest -q)                         # FULL suite, not a subset
   (cd $W/frontend && npm ci && npm test && npm run typecheck && npm run build)
   git worktree remove --force $W
   ```
   **Run both suites whatever tier you changed**: `backend/tests/test_schemas.py` parses
   `frontend/src/api/types.ts`.
3. Only then `git push`.
4. For a suspected flaky test, run the full suite 3 times with `-rf` and record the failing test names.

## 6. Rules that must not be broken

**Model allocation (the user's instruction, D-W-14).** Match the model to the work:
- **Opus 5.5 or Fable 5.2:** replanning, milestone gates (MS2–MS5), architecture, subtle or high-stakes work,
  and the final review before submission. **Always write a detailed plan or record first** (in `docs/`).
- **Sonnet 5.5, medium effort:** routine features that follow an existing pattern (high effort only when subtle).
- **Haiku 5.5:** mechanical work (recording fixtures, screenshot runs, docstring passes, tables from
  `openapi.json`, log tidying).
- Cheap shell checks are done directly by the lead.

If you are a different model (for example DeepSeek), apply the same idea: spend the most capable model's effort on
planning, gates and review, and the cheapest on mechanical work.

**Content and wording**
- **Wording rule.** Never use the words in `backend/config/settings.json` → `bannedWords` (fraud,
  criminal, illicit, guilty, suspicious) in any UI string, API message, test name, document or commit
  message. Say "unusual", "flag", "worth a look". Every flagged item carries the limitation line:
  *"Unusual activity requires investigation; it does not indicate wrongdoing."*, and so does every
  export (CSV: every row; JSON: at the top).
- **A2's numbers are frozen** (scope W-06). Never retrain, re-tune or regenerate any model or data file.
- **The vendored A2 code is never edited**: `backend/explorer/`, `backend/lm/`, `backend/models/`,
  `backend/data/` (hashes in `backend/A2_VENDOR.json`). Web changes go in `backend/app/` and get a
  row in `backend/MODIFICATIONS.md`.

**Single sources of truth**
- **The flag threshold comes only from the API** (E2 `thresholds.flagAbsZ` = **5.0**, A2's *tuned*
  value saved with the baseline model). `settings.json` → `baseline.flagAbsZ` = 3.5 is A1's untuned
  default and must never reach the screen (D-W-10).
- **One settings file**, `backend/config/settings.json`, imported by the front end at build time and
  served by E2 at run time. Never copy it.
- **Limits** live in `settings.json` → `web` and are enforced by the server and mirrored in the browser.

**Git and process**
- **Commits:** identity `Defaul119 <231157022+Defaul119@users.noreply.github.com>` (already set in the
  repo's git config). **Never add a `Co-Authored-By` line or any AI attribution** to commit messages
  or PRs. This is the user's explicit instruction; AI use is declared in `docs/AI_USE_LOG.md` instead.
- **The repository stays private** until marks are released (D-A3-1).
- **No working-tree-wide git command** (`stash`, `checkout`, `reset`) while another agent is editing
  the tree. Compare builds in a worktree.
- **If you delegate to sub-agents:** a **code** cook runs in its own git worktree on its own branch (D-W-16), commits
  there without AI attribution, never pushes, and reports its branch; the lead reviews the branch, merges it into
  `main`, resolves overlaps, verifies and pushes. A **document-only** cook writes only in its own `docs/` folder and
  runs no git. Every cook stops its servers by PID and reports in detail. The lead reviews, verifies (§5) and commits. Verify their
  claims against `git status` and the build: about a third of agent reports contained a false claim.
- **Should items only after MS2** (the plan's risk 6). Could items only after MS3, with a logged change.
- **Log as you go:** append a dated entry to `docs/WORKLOG.md` (Context / Decisions / Done / Evidence /
  Open, plus design notes worded for the technical document). Add a row to `docs/AI_USE_LOG.md` for
  every session, naming the model actually used (for example "DeepSeek via Claude Code CLI").
  Keep `TODO.md` current (`[ ]` open, `[~]` in progress, `[x]` done with the commit hash).

## 7. Decisions so far (details in `docs/WORKLOG.md`)

| ID | Decision |
|---|---|
| D-W-01 | Local git repo on `main`; a private remote only with the user's approval (given 11 Nov) |
| D-W-02 | Node v24.22.2 installed per user into `~/.local` (checksum verified) |
| D-W-03/06 | A3 loads A2 commit `aa56a26`, tagged `v1.0`: the submitted zip equals it plus wording-only edits |
| D-W-04 | One settings file: `backend/config/settings.json` |
| D-W-05 | Work split by tree (back end / front end) so agents never collide |
| D-W-07 | The Assistant's weights exist (in the submitted zip, hash-verified); S-05 can use them |
| D-W-08 | Remote `Defaul119/COS30049A3`, switched from public to **private** before the first push |
| D-W-09 | `EXPLORER_ASSISTANT` defaults to `off` until S-05 builds E12; then back to the plan's `auto` |
| D-W-10 | Thresholds only from the API (5.0), never `baseline.flagAbsZ` (3.5) |
| D-W-11 | The limitation line is on every CSV row, not only flagged ones |
| D-W-12 | E6/E10 `sort=amount` orders by absolute amount |
| D-W-13 | BTC amounts in server text are written to 8 decimal places (web-layer rewrite; A2 untouched) |
| D-W-14 | Model by kind of work: Opus/Fable for planning, gates and review; Sonnet medium for features; Haiku for mechanical work |
| D-W-15 | CR-08 approved: live lookup (S-09) is wave B2, off by default (`EXPLORER_LIVE_LOOKUP=off`) |
| D-W-16 | Code cooks work in their own git worktree and branch; the lead merges and verifies |

## 8. What to do next, in order (on resuming)

0. **UI remake (15 Nov):** the member reviews `ui-remake` (and the team if wanted); then merge into `main` after
   both full suites pass in a clean worktree, re-take `docs/screenshots/` (`npm run screenshots`), refresh the report
   and usability material that shows screens, and add the IBM Plex (SIL OFL) line to the licences (T43).

1. **Push** once the `workflow` scope is granted (above), and check that the first CI run is green.
2. **S-11 browser tests** (wave D, Sonnet medium): turn `frontend/scripts/screenshots.mjs`'s journeys into asserted
   browser tests at 390/820/1280 and re-take the screenshots (several older shots predate the Assistant panel). The
   `LIVE=1` shots need a back end with live lookup on and network access.
3. **S-10 generated types** (Sonnet medium): `openapi-typescript` → `frontend/src/api/generated.ts`, with a test that
   `types.ts` agrees with it (the API has now settled).
4. **MS3 gate (Fri 27 Nov), on Opus or Fable, with a detailed record in `docs/TEST_LOG.md`:**
   - each Should item finished and tested, or cut and recorded;
   - re-run `tools/ms_gate_check.py` and the screenshots from a fresh clone;
   - re-run `tools/measure.py`.
5. **T39–T41 usability and accessibility** (people needed; the pack is in `docs/usability/`).
6. **Freeze and package:**
   - T43: README complete, docstring pass, `LICENSES.md` licence line;
   - T44: clean install from a trial zip (macOS here; Windows by the user);
   - T45 MS4 `v1.0-rc`;
   - T50: `tools/package.py`, the zip from the tag, checksums.
7. **Report and video support:** the material is in `docs/report-material/`. Whether the architecture figure goes in
   the body or the appendix is the team's call.

**Open review findings:** see the bottom of `TODO.md` (e.g. the E14 wrong-type wording; scrolling past a chart on a
real phone not verified).

## 9. Things only the user or the team can do

- **Generative AI:** the tutor said in person that AI use is acceptable (12 Nov); **an email is expected**: save it to
  `docs/brief/` and quote it in the report's AI declaration. All use stays logged in `docs/AI_USE_LOG.md`. (Also: the downloaded A2 submission contained no separate AI declaration; worth checking with
  the team.)
- **CR-08 (live lookup) approved** by the team (12 Nov): S-09 is wave B2 in `docs/PLAN_SHOULD.md`. Record the
  names in the minutes; CR-07 (scope) votes also belong there.
- **Push A2's `v1.0` tag** if wanted (`git -C ~/Desktop/COS30049/COS30049A2 push origin v1.0`; that repo is public).
- **Usability sessions, the Windows clean install, the video (recording and narration), report writing,
  minutes, the contribution form, the Canvas upload.**

## 10. Lessons and traps (each one cost time once)

- **E5 `range.start`/`end` are timestamps, not days.** Use `dayKey()` on the front end.
- **Floating-point noise.** Regression, fusion and k-means scores differ in the 15th digit between
  code paths and even between runs (multithreaded BLAS). Compare flags exactly and scores with the
  1e-12 helper `agree()` in `backend/tests/test_whatif_parity.py`. Never compare scores with `==`.
- **Never assert on wall-clock ratios** in pass/fail tests; they fail under load. Timings belong to
  `tools/measure.py` (S-12).
- **The mock must not ship.** It is imported only under `import.meta.env.VITE_API_MODE === 'mock'`
  (a build-time literal). Check `dist/` after building.
- **ETag hashing sits inside gzip** (gzip stamps the time, so hashing compressed bytes breaks 304s).
- **Plotly reports its own redraws as zoom (relayout) events.** `PlotlyChart` ignores them during a
  redraw; without that, the date filters drifted in a loop.
- **The default E9 curve answers 400 on `direction`** when that direction has no earlier history at
  that time; the lab falls back to a range around the typed amount.
- **Usage limits:** a high-effort agent package costs ~250–350k tokens. Two in parallel plus review used
  up a 5-hour window in about 4 hours. Plan one or two packages at a time, most important first. An
  interrupted agent's work stays on disk; resume it rather than restarting.
- **Servers left running:** agents sometimes leave Uvicorn/Vite running. Check
  `ps -eo pid,command | grep -E "uvicorn|vite"`, find the owner (`lsof -a -p PID -d cwd`), and stop only
  what is not in use.

## 11. Delegation brief template (if you use sub-agents)

> You are the **<name>** cook on COS30049 Assignment 3 (Bitcoin Address Activity Explorer: React +
> TypeScript + Vite over FastAPI around A2's `Predictor`). A lead reviews and commits your work.
> Build **<tasks with IDs>** and report back.
> **Where things are:** repo `~/Desktop/COS30049/COS30049A3`, head `<hash>`;
> `export PATH="$HOME/.local/bin:$PATH"`; Python `~/miniconda3/envs/cos30049-a3/bin/python`; current
> test counts; what already exists to reuse; the plan sections to read; the contract
> (`backend/openapi.json`, `frontend/src/api/types.ts`). Where the plan specifies something, follow it
> exactly; where it is silent, choose the simplest consistent option and say so.
> **Tasks:** numbered, each with its acceptance check.
> **Rules:** wording rule; tests, typecheck and build clean with no warnings; no dead code; **no git
> commands at all**; write only under `<folders>`; don't edit `TODO.md` or `docs/`; servers on port
> `<port>`, stopped by PID at the end.
> **Report:** files changed; test counts and build sizes; checks run (real API or mock); deviations and
> choices; problems found in other tiers (request, response, expected); 3–6 notes for the technical
> document.

**Review checklist for each returned package:**
- `git diff --cached` is empty;
- tests, typecheck and build re-run by you;
- banned-word grep;
- `vendor_a2.py --check`;
- no mock in `dist/`;
- main chunk size;
- look at 2–3 screenshots;
- probe the live API for back-end work;
- worktree verification (§5);
- commit (no AI attribution), push;
- WORKLOG entry, AI_USE_LOG row, TODO update.
