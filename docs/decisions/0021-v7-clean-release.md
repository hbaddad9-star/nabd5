# 0021. v7: one clean release, no unused code

Date: 2026-11-18 · Status: accepted (owner: "version 7 … no unused code; any code that existed before and was
cancelled, remove it; clean, tidy code and architecture, a complete design, complete MVC, on GitHub")

## Context

Up to v6.11 the browser kept the whole of the old client, pinned byte for byte by `LegacySiteBaselineTests` against a
copy of the old site, so that the approved emergency room could not change by accident. Most of that client was no
longer reachable: the old specialty simulation, the old nursing room, "observe an expert", the level quiz, the old
coach, the professor portal, the respiratory room and the old landing. Their views, scripts, styles, images and data
were still served. The owner asked for an official version 7 with none of it.

## Decision

1. **Remove what nothing uses**, by evidence, not by guess:
   - *coverage*: every walk ran with the browser's code coverage on; a fragment was a candidate only when none of its
     functions ran;
   - *references*: nothing was removed while a live file named it; tools listed the lookups of elements that no
     longer exist and the calls to functions that no longer exist until both lists were empty; no named function in
     any bundle is left without a caller;
   - *pixels*: a fixed set of screens at 1440 and 390 was compared before and after the stylesheet clean-up;
   - *behaviour*: the walks of the room, the supervisor chain, the coach and the profile gave the same results.
2. **Protect the approved room by fingerprint instead of by the old site.** `SiteAssetsTests` keeps the SHA-256 of
   `/js/er.js` and `/css/er.css`; the old site's copy, its manifest and `seams.json` are gone. The room's code is
   kept whole even where the walks did not reach it, because the realism switch restores it as it is.
3. **Name things for what they are.** Stylesheets lose their version numbers (`admin.css`, `home.css`, `app.css`,
   `landing*.css` …), fragments are renamed by content, `LegacyData` becomes `CaseData`, the client tests' folder
   becomes `Client`.
4. **Close the design gaps found in v6.11's QA**: no password field (sign-in is by e-mail in this phase), the track is
   chosen and never pre-selected, «ابدأ أول حالة» in the hero before the first session, demo data on the coach page
   behind a setting of Nabd's administration, the welcome message in plain Arabic, the footer's coach link working.

## What was removed

| Area | Removed |
|---|---|
| Client scripts | 7,400 lines: the shell went from 84 fragments (7,124 lines) to 24 (about 1,100); the respiratory room's bundle (21 fragments) |
| Views | The old simulation, nursing, observe, debrief, university portal and respiratory views; seven hidden home blocks; four dead dialogs; the second registration step and the password fields |
| Stylesheets | `resp.css`, `landing8.css`, `landing9.css`, `scope.css`; about 1,470 dead rules from the others |
| Server | The respiratory room's service, endpoint (`/api/resp-chat`), settings and its four data files; `er-lang.json`, which nothing read |
| Images | 46 files (5.8 MB) nothing showed; the four clinical images kept for the room's imaging moved to `docs/image-library/files` |
| Tests and tools | The old site's copy and the byte-for-byte baseline, the golden-master recorders, the migration and audit tools (the recorded golden masters stay) |
| Documents | The audit of the old site, the migration map, the landing's integration audit, 20 MB of old screenshots, the previous phase's report |

## Consequences

- 207 tests pass; the walks run clean at 1440 and 390 with no script error.
- The approved room changes only through its fingerprint, which makes the change visible in review.
- The decision records 0001 to 0020 are kept as history; where they mention removed files, this record supersedes them.
- What the old client did and how it was cut stays in the git history of the development branch, not in the release.
