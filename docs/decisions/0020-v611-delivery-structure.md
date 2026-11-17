# 0020. V6.11: the client split by responsibility, one browser store, one image catalogue

Date: 2026-11-18 · Status: accepted (owner, "organise our files: MVC, clean architecture, maintainable, extensible";
"the images in their own file, so we can change them")

## Context

By V6.10 the new browser code (written on top of the pinned legacy client) had grown inside one bundle, `admin.js`:
the three consoles, sign-in, the trainee's home, reports, profile, the clinical coach and its drill, and the history
layer, about 3,600 lines. Its stylesheet, `admin-v67.css`, held the consoles' rules and the trainee's. Every script
read and wrote `localStorage`/`sessionStorage` itself, with the keys spelled out in each place. Image paths were
written in about 30 places across the views and one script.

That made three things hard: telling the client which part is the console and which is the trainee's application;
replacing the browser store with a server API later; and changing a picture without touching a view.

The server side was already in five projects under clean architecture ([0001](0001-clean-architecture-in-five-projects.md)).
The legacy client (`script`, `er`, `resp`, `ui`, `motion`, `terms`) is pinned byte for byte and is not reorganised.

## Decision

1. **Three new bundles, one responsibility each** (`ClientScripts/bundles.json`):

   | Bundle | Folder | Responsibility |
   |---|---|---|
   | `admin.js` | `shared/` + `admin/` | the browser store, then the three consoles: Nabd's administration, the university's, the supervisor's |
   | `app.js` | `app/` (one function scope, `_open.txt`/`_close.txt`) | the trainee's application: sign-in rules, who sees what, home, reports, coach data and drills, coach page, profile, the shell (sidebar, history, back button) |
   | `er-plus.js` | `erplus/` | layers over the ER room: realism, assessment, the nurse–doctor call, opening a case and the role rule |

   `app/` is cut into eleven numbered fragments by concern (core helpers, access, audience, reports, home, coach
   data, drill templates, coach page, coach drill, profile, shell). Fragments share one closure, so the order in
   `bundles.json` is the dependency order.

2. **One browser store** (`shared/010-store.js`, `window.NabdStore`). It is the only code in the new bundles that
   touches `localStorage` or `sessionStorage`; everything else asks it (`consoleState`, `assignments`, `accounts`,
   `session`). The day the server keeps these records, this file becomes the API client and nothing else changes.
   A test fails if `app.js` or `er-plus.js` reads the browser storage directly.

3. **The trainee's stylesheet is its own** (`css/trainee.css`): every rule whose selector starts at the home's
   reports or coach card, the coach page or the profile moved out of `admin-v67.css`. Each stylesheet is guarded by a
   test that its selectors start from its own elements.

4. **One image catalogue** (`src/Nabd.Web/images.json`, `Images/ImageCatalog.cs`, injected into every view as
   `@Img["key"]` through `Views/_ViewImports.cshtml`). A view writes a key, never a path; the script that draws the
   coach card reads its path from a data attribute the home writes. The legacy client's own images are listed in the
   same file (replace the file at the same path). `ImageCatalogTests` fails when a key points at a missing file or a
   view writes a path itself. What is still needed is in [docs/image-library/README.ar.md](../image-library/README.ar.md).

5. **The owner's rules of entry** applied in the same pass (decision log D-57 to D-61): the role in the room is the
   track's; the year is asked at registration; an unknown e-mail at sign-in goes to registration; the level quiz is
   hidden until it is rebuilt; the locked rooms stay in the sidebar marked «قريباً».

## Consequences

- The rendered page is unchanged except: one script tag (`js/app.js`), one stylesheet link (`css/trainee.css`)
  (both registered in `LegacyBaseline/seams.json`), the year field in registration's first step (auth snapshot),
  and the coach image's data attribute (home snapshot). The 29 image swaps render the same paths.
- 232 tests pass; the headless walks of V6.10 (sign-in, roles, back button, reports, supervisor chain, coach,
  drill, assessment, call box) give the same results, at 1440 and 390 wide.
- Moving to a server is now three seams: `NabdStore` (records), `ImageCatalog` (already server-side), and the
  room's own endpoints. See [architecture.md](../architecture.md), "The new client".
- The QA pass of the same version (every seat at 1440 and 390, `tools/qa/`) fixed four faults: a console account sent
  to the coach page landed on the trainee's home (the legacy client turns the removed view `coach` into `home`); the
  track card was pre-selected, so a medicine student who did not notice became a nurse for good (now the trainee
  must choose); an invalid e-mail was answered "type your e-mail"; the move to registration looked like an error
  (now a note). The browser walks moved into the repository (`tools/qa/`), so they can be run again. Findings left
  for the owner are Q1 to Q6 in [next-phase-backlog.md](../next-phase-backlog.md).
- Not done here: the legacy client's own structure; a build step (minification, modules). The bundles are still
  plain concatenation, which keeps the byte-for-byte baseline possible.
