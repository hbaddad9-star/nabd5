# 0014 — V6.6: livelier sign-in pages and a redesigned signed-in home, with the rooms untouched

Status: proposed (awaiting the owner's visual review) · 2026-11-14 · builds on [0011](0011-landing-v63-refinement-layer.md), [0012](0012-sign-in-and-registration-pages.md), [0013](0013-signed-in-application-in-the-landing-identity.md)

## Context

The owner approved the landing's hero and the overall design, and asked (2026-11-14) for two things in the same
colours and the same order of content: sign-in and registration pages that look like the pages of an official
site, with more life in them; and a better home after sign-in, with the character of a medical training academy
(type, cards, the hero, the arrangement of text). One thing must not change in any detail: the chat, in the ER
room and in the specialty rooms.

## Decision

- **Sign-in and registration (`/login`, `/register`).** Markup in `Views/Account`, styles in `auth.css`, as in
  decision 0012; every id, attribute and class the legacy client reads is kept (`AccountPagesTests`).
  - The form sits in a white card with a copper hairline, on a tinted page; the three text fields and the two
    password fields carry a drawn icon; the main action (sign in, next, create) is the landing's action copper;
    each demo account has a navy role tile; a list has a drawn caret.
  - The navy panel shows a scene above its statement: the landing's hero photo in a frame, with two drawn cards
    over it (the room's readings with a moving trace, and the report). The cards are decoration, hidden from
    screen readers; they picture the ER room's monitor and report, they are not live data. The three points are
    side by side as glass cards. Motion stops under `prefers-reduced-motion`.
  - On a narrow screen the panel is no longer hidden: it is a short photo band with the statement over it, and
    the form's pane rises over its lower edge.
  - This replaces one line of decision 0012 ("the prototype's photo is not used"): the photo used here is not
    the prototype's sign-in photo but the landing's hero, which the page already shows. Its source and licence
    are still to be documented (`img/landing/CREDITS.md`), so the same condition applies to this panel as to
    the landing: not cleared for public release until that is done.
- **The signed-in home (`#view-home`).** One new stylesheet, `wwwroot/css/home-v66.css`, loaded last; CSS only.
  No markup, no script and no other stylesheet changes; the head gets one link (registered difference 19 in
  `seams.json` now lists it).
  - Welcome: a navy hero with the photo fading into it, a copper eyebrow, a large name, light actions.
  - ER entry: a white card whose one copper button is the page's main action, beside a navy steps panel.
  - Training sections: photo cards in the landing's card language; the open one framed in copper.
  - Assignments and the professor's section: the same card; progress: a navy band with the level beside its
    figures; «ماذا ستفعل الآن؟»: numbered step cards.
  - The order of the sections, their text and what each role sees are the legacy ones.
- **The rooms cannot be reached.** Every selector of `home-v66.css` starts from `#view-home`, names no other
  view and uses no sibling combinator; `auth.css` starts every selector from `#auth-modal` (both tested). The ER
  room and the respiratory room are siblings of the home, so no rule of either file applies inside them.
- **Nothing a script shows or hides is forced.** `home-v66.css` is `!important` inside `@layer nl-refine`, so it
  sets `display` and `visibility` there only on its own `::before` / `::after`; its single layout `display` is an
  ordinary declaration outside the layer, on an element nothing hides (tested). Its two-column grids are declared
  for wide screens only, so the legacy single column on a phone stays.

## Evidence

- `dotnet test`: 208 passed (two new tests for `home-v66.css`).
- The computed style of every element of the ER room (briefing, then a running session with the trainee's and
  the room's messages), of the handover dialog, the image viewer and the application header was compared with
  `home-v66.css` switched off and `auth.css` replaced by its previous version: no difference, at 1440 × 900 and
  at 390 × 844.
- Screens checked at 1440 × 900 and 390 × 844: `/login`, `/register` (both steps), the home of the three demo
  accounts (medical student, nursing student, professor).

## Consequences

- `LandingBaseline/auth.html` is approved again (the screen's markup changed); the other three regions and the
  rest of the page are unchanged.
- `app-v65.css` still carries the home's first restyling; where both files set a property, `home-v66.css` wins by
  coming later with at least the same specificity. Removing the superseded rules from `app-v65.css` is cleanup
  for later, not needed for correctness.
- The home's markup is still the legacy one, so anything that needs new elements (figures in the hero, a
  different order, new copy) is a further step: it would make the home a redesigned region with its own approved
  snapshot, as the landing and the sign-in screen are.

## Second pass (2026-11-14, owner's review)

The owner asked for three changes; they are made, and the decision above is amended where they differ from it.

- **No line above the header.** The scroll-progress line and the view-change sweep (`.nb-progress`, `.nb-sweep`,
  moved by `motion.js`) are left unpainted on signed-in screens (`app-v65.css`, paint only: the elements and the
  script are unchanged). On the public landing the legacy line stays as it was.
- **The home is a redesigned region.** The welcome, the ER entry and the training sections needed new markup, so
  `#view-home` is now the region `home` (`LandingBaseline/regions.json`, snapshot `home.html`), like the landing
  and the sign-in screen; the rest of the page still equals the legacy page. Every id the legacy client reads or
  fills inside the home is kept (tested). This replaces "No markup, no script" above.
  - Welcome: a white card, the trainee's line, name and actions beside a framed photo (no blending), then four
    facts of the platform (the open section, six critical cases, a report out of 100, SBAR handover).
  - ER entry: «اتخاذ القرار السريري تحت ضغط الوقت», a paragraph on what the room trains, its six cases by
    their English names (from `er-cases.json`), «ابدأ حالة عشوائية» (still `#launch-er-random-btn`), and the
    method of a case in three steps; the hint about the briefing window is removed.
  - Training sections: a centred head, a filter by field, twelve common sections with English terms and an
    Arabic line, and a button on each. Emergency opens the room through the legacy button; the others say that
    they are being prepared. Wired by a new fragment, `ClientScripts/landing/030-home-sections.js` (toggles the
    legacy `hidden` class only; no storage, no network).
  - The three new parts carry `data-no-terms`, so the legacy term replacement (`terms.js`) does not turn their
    Arabic into English (it had turned «الباطنية» into «Internal medicine»).
  - The look is quieter: white cards with hairline borders, no rhythm-line backgrounds, no copper glows.
- **Evidence.** `dotnet test`: 210 passed. ER room computed styles (briefing and a session with messages),
  handover dialog, image viewer and header: no difference with `home-v66.css` off and the previous `auth.css`,
  at 1440 x 900 and 390 x 844. Screens checked at both sizes for the medical student, and the filter and the
  buttons driven in a browser.

## Third pass (2026-11-14, owner's review as a competitor would see it)

- **Sign-in scrolling.** On a wide screen the navy panel is exactly one window high (it was at least one, so when
  its content was slightly taller it slid with the form, then stopped); the screen still scrolls as one page, so
  the wheel works over either column. The scrollbar is thin (`auth.css`).
- **Icons in the middle of their tiles.** The landing's value strip drew its icons in the tiles' corner: the tile
  is a span and `.nl-value-item span` made it a block. `landing-v64.css` makes it a centred grid (CSS only; the
  landing's markup and snapshot are unchanged). A measuring pass over the landing and the home found no other
  off-centre icon.
- **ER entry.** The list of the room's cases is removed; three of the room's tools take its place (live monitor,
  history taking in Arabic, decisions with a clinical reason), each with a centred icon.
- **University assignments.** Rebuilt: the section's line as a course card and a drawn empty state, beside a pale
  panel with how an assignment works (three linked steps) and the way to the portal. Every id the legacy client
  reads is kept (`home-student-uni-section`, `home-student-uni-badge`, `nb8-home-stu-uni`,
  `home-student-open-uni-btn`); the hidden legacy cards stay.
- **A livelier page.** Cards rise into place once as they scroll into view (`030-home-sections.js`, classes
  `nh-rise` / `nh-in`; nothing on screen is held back, nothing moves under reduced motion); section cards and steps
  lift on hover and the section photos ease in.
- **Evidence.** `dotnet test`: 210 passed (`LandingBaseline/home.html` approved again). ER room computed styles
  (briefing and a session with chat): no difference, at 1440 x 900 and 390 x 844.

## Fourth pass (2026-11-14): the V6.7 design system, first step

The owner accepted the proposals to make the platform official and medical rather than template-like, and asked
to start; the first step is one design system (docs/ui-design-system.md, "V6.7 design system").

- **Sign-in screen.** The panel's floating cards (readings, report), its decorative trace and its tag are removed
  from the markup; the photo is framed plainly with a caption; the three points are a ruled list; the panel is flat
  navy. The form card has a navy top rule; radii and shadows follow the scale; no lift on hover; eyebrows lose
  their dash. The motion keyframes of the removed cards are deleted.
- **Signed-in home.** Radii mapped to the scale (18 to 10, 14 to 10, 12 to 8, 10 to 8, 9 to 6), the card shadow
  is one pixel, eyebrows lose their dash, hover changes the border only (no lift, no photo zoom), the entrance is
  a short fade, and figures are tabular.
- **Evidence.** `dotnet test`: 210 passed (`LandingBaseline/auth.html` approved again). ER room computed styles
  (briefing and a session with chat): no difference, at 1440 x 900 and 390 x 844.

## Fifth pass (2026-11-14): the design system on the rest of the site

- **Profile, university portal, report** (`app-v65.css`, section 9, paint only, each selector from one of these
  views): radii and the one-pixel shadow; section titles over a rule; the profile's tabs as an underlined bar with
  the open tab in navy; the skill bars in teal; tabular figures; the portal's section line as a course card and
  its empty states as quiet panels.
- **Landing** (`landing-v64.css`, last block, no `!important`): its cards take the radii, the one-pixel shadow
  and a hover that changes the border only; the sections' eyebrows lose their dash. The hero's composition, its
  markup and the approved snapshot are unchanged.
- **One stroke width** (1.75) for the line icons of the sign-in screen and the home.
- **Evidence.** `dotnet test`: 210 passed. ER room computed styles (briefing and a session with chat): no
  difference, at 1440 x 900 and 390 x 844; the new `app-v65.css` rules start from #view-profile,
  #view-university or #view-debrief, siblings of the room.
