# UI design system: the V6.2 public landing

The visual language of the public landing (public header, landing view, public footer, landing dialog), taken
from the owner's prototype V6.2. The signed-in application keeps its own legacy styles; this system applies only
inside an element with the class `nabd-landing`.

## Tokens

Defined on `.nabd-landing` in `wwwroot/css/landing-v6.css` (generated; values are the prototype's, later
refinement blocks override earlier ones, the table shows the value in effect).

| Group | Token | Value | Use |
|---|---|---|---|
| Navy | `--navy` / `--navy-2` / `--navy-3` | `#082f3d` / `#0b3a49` / `#123f4e` | Header, hero, dark sections, headings |
| Copper | `--copper` / `--copper-light` / `--copper-dark` | `#c98768` / `#e5ad8e` / `#a96d51` | Accents, rules, icons on dark |
| Action | `--copper-action` / `--copper-action-hover` | `#9b6247` / `#89543d` | Primary buttons (the prototype's darker copper for white text) |
| Text | `--ink` / `--copy` / `--muted` / `--text-muted` | `#102f40` / `#536875` / `#788b95` / `#647680` | Body text, secondary text |
| Surface | `--paper` / `--surface` / `--surface-soft` / `--surface-warm` | `#f3f6f7` / `#fff` / `#f3f7f7` / `#faf7f5` | Page and card backgrounds |
| Lines | `--line` / `--line-strong` / `--card-border` | `#d9e1e5` / `#cbd7dc` / `#dce6e9` | Borders |
| Teal | `--teal` / `--teal-soft` | `#176a72` / `#e8f0f1` | Secondary accents |
| Shape | `--radius` / `--radius-card` | `12px` / `12px` | Cards (buttons use 7 px) |
| Shadow | `--shadow-card` / `--shadow-card-hover` | `0 8px 24px rgba(8,47,61,.065)` / `0 16px 34px rgba(8,47,61,.12)` | Cards |
| Layout | `--content` | `1320px` | Width of `.nl-container` (minus a gutter) |
| Rhythm | `--v6-section-space` | `clamp(76px, 8vw, 112px)` | Vertical space between sections |
| Font | `--font-ar` | `"Noto Sans Arabic", "Segoe UI Variable", "Segoe UI", Tahoma, Arial, sans-serif` | All landing text |

The prototype also defines a `--brand-*` scale (spacing 4–48 px, radii 6/10/16 px, status colours) and a
`--nabd-*` set used by its last refinement blocks; they are kept as they are.

## Typography

- **Font**: Noto Sans Arabic 2.010, Regular (100–599) and Bold (600–900), self-hosted as WOFF2
  (`wwwroot/fonts/noto-sans-arabic/`, SIL OFL 1.1), preloaded, `font-display: swap`.
- **Base**: 16 px, line height 1.65 (the landing root sets 16 px; the application's own root is 15 px).
- **Scale** (desktop → phone): hero title from `clamp(32.8px, 3.05vw, 47.2px)` on wide screens down to 33.28 px on
  phones; section titles `clamp(26.4px, 2.8vw, 37.6px)` and up, weight 700–800; card titles 15.7–18.9 px; body
  14–16 px; small print 11–12.5 px. Arabic text always has `letter-spacing: 0`. (Several refinement blocks of
  the prototype set these; the computed values are the prototype's, checked by `landing-style-diff.mjs`.)
- Latin labels inside the laptop mock-up use Arial, as in the prototype.

## Components

| Component | Classes | Notes |
|---|---|---|
| Container | `.nl-container` | `min(1320px, 100% − gutter)`; gutter 64 → 44 → 34 → 30 px as the screen narrows |
| Section head | `.nl-section-head`, `.nl-eyebrow` | Eyebrow with a copper rule, title, lead paragraph |
| Buttons | `.nl-btn` + `.nl-btn-copper` / `.nl-btn-navy` / `.nl-btn-outline-light` / `.nl-btn-outline-navy` | 45 px high, 7 px radius, weight 650 |
| Header | `.nl-site-header`, `.nl-header-inner`, `.nl-brand`, `.nl-main-nav`, `.nl-header-actions`, `.nl-menu-toggle` | Sticky; the nav becomes a drop-down panel at ≤ 820 px |
| Cards | `.nl-specialty-card`, `.nl-premium-about-card`, `.nl-audience-card`, `.nl-step` | Photo cards, glass cards on navy, audience rows, method steps |
| Showcase (V6.3, V6.4) | `.nl-showcase`, `.nl-showcase-text`, `.nl-room-points`, `.nl-room-point`, `.nl-room-icon`, `.nl-notebook…` | Text and four point cards (navy icon tile, title, one line) on the right; on the left a drawn laptop (`img/landing/v64/laptop.svg`: lid, hinge, aluminium base, keyboard and trackpad in true perspective, shadow on the table) with a real screenshot of the ER room laid over its screen (`.nl-notebook-screen`, the box `build-laptop.mjs` prints); at most 704 px wide |
| Steps (V6.3) | `.nl-flow`, `.nl-flow-step`, `.nl-flow-shot`, `.nl-flow-num`, `.nl-flow-arrow` | An ordered list of four cards with a real 4:3 screen, a navy number badge and an arrow in the gap toward the next step (left on rows, down when stacked) |
| About (V6.3) | `.nl-about-head`, `.nl-pillars`, `.nl-pillar…` | Title and lead side by side on the navy section; three light solid cards with a copper top rule and a navy icon tile |
| Partnership (V6.3) | `.nl-partner`, `.nl-partner-points`, `.nl-partner-visual` | Text with three checked points on the right; a 16:10 photo with a navy/copper grade and a caption on the left |
| Why (V6.3) | `.nl-why-grid`, `.nl-why-card`, `.nl-why-media`, `.nl-why-tag`, `.nl-why-body`, `.nl-why-answer` | Photo with a "who benefits" tag, the need, and a tinted «في نبض:» answer box |
| Footer | `.nl-site-footer`, `.nl-footer-main`, `.nl-footer-col`, `.nl-footer-bottom` | Three columns → two → one; the application adds `.nl-footer-links` (guest / signed-in groups) and `.nl-footer-credits` |
| Dialog | `.nl-modal-backdrop`, `.nl-modal` | Information only; no form |

## Breakpoints

From the prototype, unchanged: 1250, 1100, 900, 820 (header menu), 640/620/600, 520, 390, 350 px, plus
`(min-width: 821px)` and `(max-width: 1100px) and (min-width: 821px)` refinements, and
`prefers-reduced-motion: reduce`. Checked at 1536, 1440, 1024, 768, 390 and 320 px.

## How the stylesheets are built

| File | Written by | Content |
|---|---|---|
| `wwwroot/css/landing-v6.css` | `tools/migration/landing-v6/convert-css.mjs` from the prototype; **do not edit by hand** | The font faces; the prototype's rules with every class prefixed `nl-`, `:root`/`body` mapped to `.nabd-landing`, element selectors inside `:where(.nabd-landing)`, `rem` turned into the prototype's pixels; then the **guard** |
| `wwwroot/css/landing-v6-shell.css` | By hand | What the prototype could not know: the wrapper `#view-index`, legacy rules on properties the prototype never sets, the footer's signed-in links and credits |
| `wwwroot/css/landing-v63.css` | By hand (V6.3) | The refined sections. Every selector starts from `#view-index.nl-index-view`; fonts in `@layer nl-refine` as `!important` |
| `wwwroot/css/landing-v64.css` | By hand (V6.4) | The laptop, the showcase's point cards and the card language below. Same rules as `landing-v63.css` |
| `wwwroot/css/auth.css` | By hand (V6.4, replaces `auth-v63.css`) | The sign-in and registration pages (`#auth-modal`, markup in `Views/Account`). Every selector starts from `#auth-modal`; declarations `!important` in `@layer nl-refine`, except `display` on what `.hidden` may hide, which is an ordinary declaration outside the layer (tested) |
| `wwwroot/css/home-v66.css` | By hand (V6.6) | The signed-in home redesigned ([decision 0014](decisions/0014-sign-in-pages-and-signed-in-home-v66.md)): every selector starts from `#view-home`, no sibling combinator (tested); `!important` in `@layer nl-refine`; `display` and `visibility` there only on its own `::before` / `::after` (tested); two-column grids for wide screens only |
| `wwwroot/css/app-v65.css` | By hand (V6.5) | The signed-in application in the landing's identity: legacy colour variables redefined on signed-in roots, `!important` in `@layer nl-refine` only against legacy `!important`; paint only, never display or placement (tested); never selects the landing, the sign-in screen or the footer (tested) |

**The guard.** The legacy stylesheets force some properties on the landing with `!important` or with ID
selectors (fonts on every button/heading/`b`/`strong`; paint, padding and display on `#public-header`, its nav and
buttons, `#site-footer` and `[role="dialog"]`). An ordinary rule cannot win against them. The guard repeats the
prototype's own declarations of exactly those properties as `!important` inside cascade layers: a layered important
declaration beats every unlayered one regardless of specificity, while among themselves the guard's declarations
keep the prototype's specificity and order. Layer order (earlier wins for important declarations):

0. `nl-refine` — the V6.3 and V6.4 refinements (`landing-v63.css`, `landing-v64.css`, `auth.css`); above everything, so a refinement wins
   over the prototype and over the legacy `!important` rules ([decision 0011](decisions/0011-landing-v63-refinement-layer.md));
1. `nl-guard-own-important` — the prototype's own `!important` declarations;
2. `nl-guard-shell` — fonts of elements the application adds (filled in the shell file);
3. `nl-guard` — the prototype's declarations of the guarded properties;
4. `nl-guard-defaults` — browser defaults the prototype relied on (`b`/`strong`/heading weight and size; filled
   in the shell file).

The guarded properties and the classes they apply to are listed in `convert-css.mjs` (`FONT`, `PAINT`,
`GUARD_BY_SUBJECT`); a class that appears together with a guarded class on an element gets the same guard.

## Rules for changing the landing

1. Change the design in the prototype, regenerate with `convert-css.mjs` and `convert-markup.mjs`, and port the
   markup change into the Razor partial by hand (the partials carry integration edits; see
   [ui-integration-map.md](ui-integration-map.md)).
2. A rule for something the application adds goes into `landing-v6-shell.css`, starting from a landing root.
3. Every selector must start from `.nabd-landing`, `:where(.nabd-landing)`, an `nl-` class, or one of
   `#public-header`, `#view-index.nl-index-view`, `#site-footer`, `#nl-dialog` (tested).
4. Compare with the prototype at the six widths (`landing-style-diff.mjs`, `landing-visual-compare.mjs`), then
   approve the new region snapshots (`approve-landing-baseline.mjs`) in the same commit.
5. Since V6.3, a refinement that is not a prototype change goes into `landing-v63.css` / `landing-v64.css` (or
   `auth.css` for the sign-in pages): new components get new `nl-` class names that the prototype does not use
   (check `classes.json` from `convert-css.mjs`); fonts go into `@layer nl-refine`.

## The card language (V6.4)

One look for the landing's cards, as tokens on `#view-index.nl-index-view` in `landing-v64.css`:

| Token | Value | Use |
|---|---|---|
| `--nl-dna-border` / `--nl-dna-border-hover` | `#d6e2e6` / `#bdd0d7` | Hairline border of a white card |
| `--nl-dna-shadow` / `--nl-dna-shadow-hover` | a 1 px contact shadow plus a soft deep one | Cards at rest and on hover |
| `--nl-dna-tile` | navy gradient `#0e4658 → #082f3d` | Icon tiles (showcase points, step numbers, «عن نبض» icons) |
| `--nl-dna-tile-icon` | `#f0bd9f` | The copper line icon on a tile |
| `--nl-dna-line` | copper → light copper → transparent, from the right | The hairline that appears at a card's top on hover |

The value strip under the hero uses tinted teal tiles; the «لماذا» tags are navy pills with white text, and the
«في نبض:» answers have a copper rule.

## The sign-in and registration pages (V6.4)

`/login` and `/register` ([decision 0012](decisions/0012-sign-in-and-registration-pages.md)), after the owner's
prototype: the form column on the right (brand bar with the brand link, which goes home, and «إغلاق», which closes the screen and returns to where it was opened; copper eyebrow, a large navy title, a
one-line subtitle, fields, the navy main button, Microsoft and Google buttons marked «قريباً», the switch link, the
demo accounts, a privacy note, the footer line) and a navy panel on the left (brand, tag, statement, three points
with copper icon tiles, «الحالات للتدريب فقط…» at the foot), which stays in view while the form scrolls and is
hidden under 900 px (tighter on windows lower than 760 px, so its training-only line stays in view). Tokens on `#auth-modal` (`--nl-a-navy`, `--nl-a-teal`, `--nl-a-copper-text`, …); field and
button outlines `#82969f` (3:1 against white); fields 50 px high with 16 px text on phones; a show/hide button
in the password fields (the value stays left to right, the placeholder right to left); an opaque copper focus ring (4.9:1); registration steps as numbered dots joined by a bar; account types as three cards with a
round icon, teal when chosen.

## The signed-in application (V6.5)

[Decision 0013](decisions/0013-signed-in-application-in-the-landing-identity.md). `wwwroot/css/app-v65.css` gives
the screens after sign-in the landing's identity, with CSS only, by redefining the legacy colour variables on
signed-in roots:

| Legacy variable | Value in V6.5 | Was |
|---|---|---|
| `--bg`, `--bg-main` (page) | `#f3f6f7` | `#F4F8FA` |
| `--ink` / `--ink-2` / `--ink-3` | `#102f40` / `#536875` / `#5d7079` | `#193B4A` / `#4F6A77` / `#587180` |
| `--line` / `--line-2` | `#d9e1e5` / `#e6edf0` | `#DCE7EB` / `#E8EFF2` |
| `--tint` / `--tint-2` | `#e8f0f1` / `#f3f7f7` | `#E6F2F4` / `#F0F7F8` |
| `--signal` / `--signal-strong` | `#176a72` / `#135c63` | `#16838A` / `#0F6A70` |
| `--signal-light` | `#e5ad8e` (copper-light, on navy) | `#6CC9CE` |
| `--navy` | `#082f3d` | `#193B4A` |
| `--r`, `--r-lg` / `--r-xl` | `12px` / `16px` | `14px`, `20px` / `28px` |
| `--font-ar` | Noto Sans Arabic | Readex Pro |

Inside the monitors (`.nb-mon`, `#view-er .er-mon`, `#view-resp .rs-mon`) `--signal`, `--signal-light` and
`--paper` keep their legacy values: the traces are drawn in script and the legend must match them.

Parts: the application header is navy with a copper rule and a copper avatar, like the public header (same
height); the account menu and the drawer are white with navy text, copper eyebrows and a copper bar on the current
item; the toast is navy with a copper edge; the dialogs have a navy veil and 16 px corners. Home: the ER card in
the landing's navy band with a copper «ادخل الـ ER» button, navy step tiles with copper numbers, the open training
section framed in copper. ER room: copper send/start/hand-over buttons, white secondary buttons, navy pressed tabs,
filters and role choice, chat bubbles per speaker (trainee navy-teal, patient grey, nurse teal tint, relative
copper tint, supervisor white with a navy rule), copper eyebrows in the briefing, the tests panel and the report.
Unchanged on purpose: alarms, urgent and critical frames, the out-of-indication yellow, the monitor, success and
warning colours.

## The sign-in pages and the signed-in home (V6.6)

[Decision 0014](decisions/0014-sign-in-pages-and-signed-in-home-v66.md). Same palette and tokens as above.

**Sign-in and registration** (`auth.css`, markup in `Views/Account`):

| Component | Classes | Notes |
|---|---|---|
| Form card | `.nl-auth-content` | White, 18 px corners, a copper hairline at the top, on a tinted page (`.nl-auth-form-pane`) |
| Field icon | `.nl-auth-input-wrap`, `.nl-auth-input-icon`, `.nl-auth-input.nl-has-icon` | A drawn icon at the right end of a field; teal while the field is in use |
| Main action | `.nl-auth-submit` | The landing's action copper (`#9b6247` → `#8f593f`), white text |
| Demo account | `.nl-auth-demo-grid button`, `.nl-auth-demo-av`, `.nl-auth-demo-copy` | A navy role tile with a copper icon, then the role and the name |
| Scene | `.nl-auth-scene`, `.nl-auth-scene-photo`, `.nl-auth-float`, `.nl-auth-float-vitals`, `.nl-auth-float-report` | The landing's hero photo in a frame with two drawn cards (decoration, `aria-hidden`); a short photo band above the form at ≤ 900 px |
| Points | `.nl-auth-benefits` | Three glass cards side by side; a list at ≤ 1240 px |

Keyframes are `nl-auth-bob`, `nl-auth-pulse` and `nl-auth-trace`; all motion stops under
`prefers-reduced-motion: reduce`.

**The signed-in home** (`home-v66.css`; the region `home`, markup in `Views/Home/Dashboard`): tokens `--h-*` on
`#view-home` (the landing's values). New elements use the prefix `nh-`; their `display` is set outside the layer.

| Part | Selector | Look |
|---|---|---|
| Welcome | `.nh-hero`, `.nh-hero-main`, `.nh-hero-media`, `.nh-hero-facts` | White card, 18 px corners; copper eyebrow, navy name at `clamp(28px, 3vw, 42px)` / 850, a navy and an outlined action; the photo framed beside it; four facts in a strip below |
| ER entry | `#home-er-card`, `.nh-er-cases`, `.nh-er-actions` | White card; the six cases as quiet chips; the copper button is the page's main action; the method in a navy panel |
| Training sections | `.h9-fields-head`, `.nh-fields-filter`, `.h9-fields li`, `.nh-field-body`, `.nh-field-go` | Centred head, a filter bar (navy when chosen), photo cards with the English name, an Arabic line, terms in teal and a button (copper on the open section, outlined on the others); a teal «متاح الآن» tag |
| Assignments, professor | `#home-student-uni-section`, `#home-professor-section` | The same white card, 22 px corners |
| Progress | `#view-home #home-path .nb-path-dark` | Navy band: the level beside two glass figure tiles |
| Steps | `#view-home #nb8-guide` | Numbered step cards with a navy icon tile; copper border on hover |

Rules for changing the home: start every selector from `#view-home`; never name another view or use `+` / `~`;
inside the layer never set `display` or `visibility` except on your own pseudo-elements; declare multi-column
grids inside `@media (min-width: 769px)`; keep the clinical colours of the rooms out of it (the rooms are not
this file's).

## V6.7 design system (official, medical, not a template)

The owner asked (2026-11-14) for a site that reads as an official medical academy rather than a common
generated template. These rules apply to the sign-in screen (`auth.css`, its last block), the signed-in home (`home-v66.css`), the
profile, the university portal and the report (`app-v65.css`, section 9) and the landing's cards
(`landing-v64.css`, its last block; the hero's composition is kept as approved). The ER room and its chat are
never restyled.

| Rule | Value |
| --- | --- |
| Radii | 10 px cards and panels, 8 px inner cards, fields and buttons, 6 px small parts; pills only for status chips |
| Depth | hairline borders; a card's shadow is one pixel (`0 1px 2px rgba(8,47,61,.05)`); the form card alone has a quiet second layer |
| Accent | copper (`#9b6247` text / action) for the page's main action only; teal for links, terms and status |
| Official marks | a navy top rule on the form card; eyebrows are plain text (no decorative dash) |
| Hover | a border change only: no lift, no zoom, no glow |
| Motion | a short fade (8 px, 0.4 s) for content entering below the fold; nothing under reduced motion; no decorative loops |
| Figures | tabular numerals wherever a value is read (facts, progress, section codes) |
| Imagery | a photo is framed plainly, with a caption; no floating cards or drawn readings over it |
| Lists of points | a ruled list (a hairline between rows) instead of glass tiles |

| Icons | one line-icon set at a single stroke width (1.75) on the sign-in screen and the home; brand marks keep theirs |
| Section titles | on the profile and the portal, a title sits over a hairline rule, as in a printed report; the profile's tabs are an underlined bar |

Not yet done: the type pairing (an academic heading face and a monospace for readings needs self-hosted font
files, so it waits for the owner's approval to download them).

## The admin console (V6.7 prototype)

`css/admin-v67.css`, every selector from `#view-admin` (or `body.nbx-admin` while it is shown; ADR 0015). The same
system as the home: a navy side rail (groups: platform, institutions, clinical content, governance), a white top bar
with the "بيئة العرض" mark, cards of 10 px with a one-pixel shadow, ruled tables with tabular figures, status chips as
the only pills, copper for the page's one main action, a drawer from the side for forms and the case file. The
legacy stylesheets style every `[role="dialog"]` (background, animation, corners, all `!important`): the drawer's
panel overrides them by ID. On narrow screens the rail becomes a scrolling row of tabs and tables scroll sideways.
