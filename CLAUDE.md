# CLAUDE.md

Working notes for Claude on the lilgatchi project. Read this file and DESIGN.md at the start of every session before doing anything else.

## Standing instructions from the owner

- Maintain two record files without being asked: this file (working notes) and DESIGN.md (project decision record, plain prose for a human reader, no workflow notes).
- When the owner makes a decision, corrects Claude, or explains reasoning, record it in the right file in the same commit as the related change. Do not batch these into a later catch-up commit.
- If something the owner says contradicts either file, point out the contradiction instead of silently choosing one.
- Commit and push record-file updates together with the work they relate to.
- Fix or remove anything in either file that goes stale.
- In DESIGN.md, mark each decision as the owner's or a "Claude default", so the owner can see which choices still need their confirmation.

## Communication preferences

- Professional and prompt. Avoid contractions, cursing, and an overly eager tone.
- The owner is new to coding. Explain setup steps plainly when they come up.
- When building a feature, list any choices the owner did not specify in the report back.

## Repository layout

- `index.html`: the page. Loads the scripts below in order with plain `<script>` tags.
- `css/style.css`: all styling. The window is a 250 x 350 px `.card`.
- `js/pet.js`: pet rules (stats, 5-minute steps, feeding, mood). No browser code, so Node can test it.
- `js/names.js`: random name generator with a block list of rude substrings.
- `js/storage.js`: the only code that touches localStorage (key `lilgatchi.save.v1`). Swap this for file saving in the .exe.
- `js/main.js`: page wiring, timers, blinking, tabs, debug tools. `ART` at the top holds the image paths; set `ART.blink` once a closed-eyes frame exists.
- `assets/critter.jpg`: the owner's placeholder art.
- `tests/run.js`: logic tests.

## How to run and test

- Run: open `index.html` directly in a browser (double-click). No server or build step.
- Logic tests: `node tests/run.js` from the repository root.
- Visual check: Playwright is available in the session (Chromium is preinstalled; do not run `playwright install`). Use `page.clock.install()` and `page.clock.runFor()` to fast-forward game time. Load the page with a `file://` URL. Keep throwaway scripts and screenshots in the scratchpad, not the repository.

## Conventions

- Do not use ES modules (`import`/`export`, `type="module"`). Browsers block them on `file://` pages, which would break double-click opening. Each script instead attaches one global (`Pet`, `Names`, `LilStorage`) and, where useful, also exports through `module.exports` for Node tests.
- Saved data shape: `{ version: 1, pet: { name, fullness, health, carryMs, lastUpdate }, settings: { speed } }`. If this changes, bump `version` and handle old saves rather than discarding them silently.
- Time model: `pet.lastUpdate` is real clock time. Each tick, real elapsed time times `settings.speed` is fed to `Pet.advance()` as game time. `carryMs` holds game time toward the next 5-minute step. Time away is caught up at 1x on load.

## Git workflow notes

- Each session starts from a fresh clone, so there is no saved git identity. Commit with:
  `git -c user.name="airwingeethaub" -c user.email="alexander.d.irwin@gmail.com" commit ...`
- End commit messages with the attribution lines given by the session (Co-Authored-By and Claude-Session).
- Work so far is committed directly to `main`. No branch or pull request workflow has been set up.
- Pushes print `fatal: expected 'acknowledgments', received 'packfile'` and `push negotiation failed; proceeding anyway`. This is noise from the session's git proxy, not a failure. Confirm success by comparing `git rev-parse HEAD` with `git ls-remote origin`.
- The clone is shallow. Before pushing, run `git fetch origin main` and rebase if needed, or the push may be rejected.

## Lessons learned

- At the start of the first session, the GitHub App did not yet have write access, and the repository attach tool reported pushes as refused. A dry-run push later passed and a real push succeeded. If a push is refused, the fix is installing the Claude GitHub App at https://github.com/apps/claude/installations/select_target.
