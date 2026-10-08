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
- `css/style.css`: all styling. The window is a 250 x 350 px `.card`. Tabs: Pet, Status, Attributes, Debug; four tabs already fill the tab bar at 11 px text, so a fifth needs a different tab design. The Pet tab is nearly full (portrait 136 px, a row of three buttons, a 2 x 2 grid of care buttons).
- `js/pet.js`: pet rules (species, stats, attributes, hunger steps, feed, medicine, train, lights, bedtime, mood) and the save format (`newSave`, `migrate`). `SPECIES`, `ATTRIBUTES`, and their display names live here. No browser code, so Node can test it.
- `js/names.js`: random name generator with a block list of rude substrings.
- `js/storage.js`: the only code that touches localStorage. The key stays `lilgatchi.save.v1` even though the data inside is now version 3; the `version` field inside the data is what counts. Swap this for file saving in the .exe.
- `js/main.js`: page wiring, timers, the analog clock, blinking, floating text, tabs, the pet picker, debug tools. `ART` at the top maps each species to its pictures; set a species' `blink` once a closed-eyes frame exists. Meter rows on Status and Attributes are built in JS from `STATUS_METERS` and `Pet.ATTRIBUTES`.
- `assets/frog.jpg`, `assets/clown.jpg`, `assets/dog.jpg`: the owner's placeholder art, one per species. The clown is pixel art and uses `image-rendering: pixelated` (the `.pixel` class).
- `tests/run.js`: logic tests.

## How to run and test

- Run: open `index.html` directly in a browser (double-click). No server or build step.
- Logic tests: `node tests/run.js` from the repository root.
- Visual check: Playwright is installed globally in the session (`require('playwright')` works from any folder; Chromium is preinstalled; do not run `playwright install`). Use `page.clock.install()` and `page.clock.runFor()` to fast-forward game time. Load the page with a `file://` URL. Keep throwaway scripts and screenshots in the scratchpad, not the repository.
- `page.clock` does not advance CSS transitions or animations; they run on real time. Before screenshotting something that fades (such as the darkened picture), wait in real time with `await new Promise(r => setTimeout(r, 1000))`, or the shot will look wrong.
- `page.clock.runFor(N)` can stop just short of an event N ms away, because ticks land every 250 ms. Run slightly longer than the exact interval in timing checks.

## Conventions

- Do not use ES modules (`import`/`export`, `type="module"`). Browsers block them on `file://` pages, which would break double-click opening. Each script instead attaches one global (`Pet`, `Names`, `LilStorage`) and, where useful, also exports through `module.exports` for Node tests.
- Saved data shape (version 3): `{ version: 3, pet: { name, species, fullness, health, fitness, attributes: { rowdiness, angst, tism, sin, diligence }, stepProgress, lightsOn, bedtime, wakeTime, lastUpdate }, settings: { hungerPace, clockOffsetMs } }`. `bedtime` and `wakeTime` are minutes after midnight. If the shape changes, bump `version` and add an upgrade step in `Pet.migrate()` with a test, rather than discarding old saves. Versions 1 and 2 are upgraded there already (both become a frog).
- With no valid save, `data` is `null` and the picker opens without Cancel. Code that runs on timers (`tick`, `render`, `blink`) must return early when `data` is null.
- Time model: `pet.lastUpdate` is real clock time. Each tick, real elapsed time is fed to `Pet.advance(pet, gameMs, stepMs)`, where `stepMs` comes from `Pet.PACES[settings.hungerPace]`. `pet.stepProgress` is the fraction (0 to 1) of the way to the next step, stored as a fraction so that switching pace does not cause a burst of steps. Time away is caught up at 1x on load.
- Clock model: the displayed time is `Date.now() + settings.clockOffsetMs`. Setting the time by hand sets the offset. An offset under 1 second counts as "System clock". There is no speed multiplier any more; the owner removed 2x speed, and the clock must not be tied to the hunger pace.
- Randomness in pet rules (such as the training injury roll) takes an optional `rand` function so tests can force outcomes.

## Git workflow notes

- Each session starts from a fresh clone, so there is no saved git identity. Commit with:
  `git -c user.name="airwingeethaub" -c user.email="alexander.d.irwin@gmail.com" commit ...`
- End commit messages with the attribution lines given by the session (Co-Authored-By and Claude-Session).
- Work so far is committed directly to `main`. No branch or pull request workflow has been set up.
- Pushes print `fatal: expected 'acknowledgments', received 'packfile'` and `push negotiation failed; proceeding anyway`. This is noise from the session's git proxy, not a failure. Confirm success by comparing `git rev-parse HEAD` with `git ls-remote origin`.
- The clone is shallow. Before pushing, run `git fetch origin main` and rebase if needed, or the push may be rejected.

## Lessons learned

- At the start of the first session, the GitHub App did not yet have write access, and the repository attach tool reported pushes as refused. A dry-run push later passed and a real push succeeded. If a push is refused, the fix is installing the Claude GitHub App at https://github.com/apps/claude/installations/select_target.
