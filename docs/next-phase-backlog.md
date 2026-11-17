# Next-phase backlog

What Nabd 7 leaves open, most important first. Updated 2026-11-18 with v7.0.0.

## The product

| # | Item | Detail |
|---|---|---|
| P1 | **A server for the records** | Accounts, sessions, institutions and assignments live in one browser, so a session reaches the supervisor only on the same device. Replace `shared/010-store.js` (`NabdStore`) with an API client; nothing else in the client reads the storage ([architecture.md](architecture.md), "The seams to the server") |
| P2 | **Identity** | Sign-in is by e-mail only and the roster is enforced in the browser. University Microsoft sign-in and the roster on the server ([auth-external-providers.md](auth-external-providers.md)) |
| P3 | **Medical review** | No case, drill, dose range or life-saving list has a physician's sign-off yet (decision log D-07). Name the reviewer; the console already records the review |
| P4 | **The agent** | Scoring by the model, free dialogue in the coach's drills, case variants: specified in [agent/er-agent.ar.md](agent/er-agent.ar.md) |
| P5 | **Clinical images** | The room shows no image. 15 images for the six cases and 28 body photographs are listed in [image-library/README.ar.md](image-library/README.ar.md), with what to make first |
| P6 | **The level quiz** | Hidden (D-60); rebuild it from Nabd's own cases |
| P7 | **The respiratory room and the specialty cases** | Shown as «قريباً» (D-61). The old respiratory room was removed in v7; the new rooms are built as layers like `erplus/`, on the server once P1 exists |
| P8 | **Open owner decisions** | Section 8 of [agent/er-agent.ar.md](agent/er-agent.ar.md): nurse weights, unstable handover, averaging old and new reports, pass marks for four-year programmes, returning after a critical error, the report's layout |

## Owner decisions on the site

| # | Item | Detail |
|---|---|---|
| O1 | «تواصل معنا» | Leads to the footer, which has no contact method. Give a real contact or remove the link |
| O2 | Six landing photos without a documented source | Hero, four specialty cards, the closing band (`wwwroot/img/landing/CREDITS.md`). Provide the source and licence or replace them before any public release |
| O3 | Larger photos | The hero is 790 × 349 and the closing band 426 × 103: soft on large screens. Sizes wanted: [image-library/README.ar.md](image-library/README.ar.md), section 3 |
| O4 | Medium and SemiBold font faces | The Arabic font has a regular and a bold face only; two more faces would refine the headings. Needs the go-ahead to add the files |
| O5 | The landing dialog's note «هذه نسخة عرض أولي…» | Accurate today; not after launch |

## Quality

| # | Item | Detail |
|---|---|---|
| Q1 | Accessibility | No automated audit (axe or Lighthouse) and no screen-reader pass yet |
| Q2 | Other browsers and devices | Checked in Chrome only (desktop and phone emulation); Firefox, Safari (iOS) and real phones not tested |
| Q3 | One landing stylesheet | `landing.css` still holds the prototype's successive blocks (v7 removed 450 dead rules); fold it with `landing-sections.css` and `landing-cards.css` into one hand-maintained file with the same result |
| Q4 | Product screenshots | The landing's laptop and step images are screenshots of the room; retake them when the room's look changes |
| Q5 | The walks in CI | `tools/qa` runs by hand; CI would need a browser and a started site |
| Q6 | A Content-Security-Policy | Not possible while the room uses inline handlers; follows the room's move to the server |

## Closed by v7

- The dead code of the old client, the respiratory room, the old landing and the migration tooling are removed
  ([decision 0021](decisions/0021-v7-clean-release.md)).
- No password field (sign-in is by e-mail in this phase); the track is chosen, never pre-selected.
- «ابدأ أول حالة» in the hero before the first session; demo data on the coach page follows Nabd's setting.
- The welcome message stays in plain Arabic (the room's English terms are not applied to it).
- The footer's «المدرب السريري» opens the coach.
