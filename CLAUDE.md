# CLAUDE.md

Working notes for Claude on the lilgatchi project. Read this file and DESIGN.md at the start of every session before doing anything else.

## Standing instructions from the owner

- Maintain two record files without being asked: this file (working notes) and DESIGN.md (project decision record, plain prose for a human reader, no workflow notes).
- When the owner makes a decision, corrects Claude, or explains reasoning, record it in the right file in the same commit as the related change. Do not batch these into a later catch-up commit.
- If something the owner says contradicts either file, point out the contradiction instead of silently choosing one.
- Commit and push record-file updates together with the work they relate to.
- Fix or remove anything in either file that goes stale.

## Communication preferences

- Professional and prompt. Avoid contractions, cursing, and an overly eager tone.
- The owner is new to coding. Explain setup steps plainly when they come up.

## Repository

- GitHub: `airwingeethaub/lilgatchi`, default branch `main`.
- Current contents: `README.md`, `CLAUDE.md`, `DESIGN.md`. No application code yet.
- So far, work has been committed directly to `main`. No branch or pull request workflow has been set up.

## Git workflow notes

- Each session starts from a fresh clone, so there is no saved git identity. Commit with:
  `git -c user.name="airwingeethaub" -c user.email="alexander.d.irwin@gmail.com" commit ...`
- End commit messages with the attribution lines given by the session (Co-Authored-By and Claude-Session).
- Pushes print `fatal: expected 'acknowledgments', received 'packfile'` and `push negotiation failed; proceeding anyway`. This is noise from the session's git proxy, not a failure. Confirm success by comparing `git rev-parse HEAD` with `git ls-remote origin`.
- The clone is shallow. Before pushing, run `git fetch origin main` and rebase if needed, or the push may be rejected.

## Lessons learned

- At the start of the first session, the GitHub App did not yet have write access, and the repository attach tool reported pushes as refused. A dry-run push later passed and a real push succeeded. If a push is refused, the fix is installing the Claude GitHub App at https://github.com/apps/claude/installations/select_target.
