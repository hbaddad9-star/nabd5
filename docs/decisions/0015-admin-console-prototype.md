# 0015. The admin console, a front-end prototype (V6.7)

- Status: accepted (2026-11-14)
- Builds on: ADR 0008 (no database or server authentication in this phase), ADR 0012 (sign-in pages), ADR 0014
  (signed-in home, V6.7 design system)

## Context

The owner asked for a control panel that makes Nabd read as an official platform: institutions and university
records, subscriptions, users and roles, and the clinical content (cases, sources, rules and limits) managed from
the platform rather than in code. The final submission to an international competition is about a week away, so
the owner asked for the complete product shape as a prototype (rooms, idea, workflow, design) and explicitly no
server work now: "an admin account in the normal sign-in that opens the management dashboard".

The real version needs server identity, roles and a database. Without them any admin page is reachable by
anyone, as the professor's page already is (ADR 0008). That remains true and is stated, not hidden.

## Decision

1. **Entry.** A fourth demo account on the sign-in screen, "إدارة المنصة" (`data-demo-login="admin"`, role
   `admin`), added at runtime to the legacy `DEMO_ACCOUNTS`. It opens `#view-admin` instead of the home; the home
   redirects to the console for this role; signing out returns to the landing.
2. **Its own parts.** Markup `Views/Home/Admin/_AdminView.cshtml` (inside the home region, after the home view),
   script bundle `js/admin.js` (`ClientScripts/admin/010-admin-console.js`), stylesheet `css/admin-v67.css`. The
   legacy client is not edited: two of its globals (`showOnlySection`, `navigateTo`) and the welcome-toast hint
   (`nb8RoleHint`) are wrapped.
3. **Pages.** Overview (indicators, weekly sessions, decisions waiting, system status, activity), institutions
   (domain, plan, seats, contract, cohorts, invite code), users and roles (approve, suspend, change role, invite,
   CSV import), subscriptions and plans (renew, convert a trial, record a payment), the case library (the six ER
   cases read from the room's own `data/er-cases.json`; draft, medical review, published), sources and media
   (guidelines linked to cases, licence status), rules and limits (the ER scoring weights and penalties as they
   are in the scoring engine, order-safety rules, session settings, enabled sections), audit log (CSV export) and
   settings (announcement, maintenance, retention, data requests, demo reset).
4. **Honesty.** Every page carries "بيئة العرض" (demo environment); figures other than the cases are demo data kept
   in this browser (`localStorage` key `nabd_v2_admin`). The console cannot approve a case medically (only a
   reviewer's account would), so the cases stay "awaiting a physician's review", as the data file says
   (`reviewed: false`). Rule changes are a draft "sent for approval" and never reach the scoring or the safety
   rules. Prices are not invented (plans say "by seats, yearly").
5. **What reaches students.** Only the announcement: when switched on, a banner shows at the top of the signed-in
   home (`#nbx-home-announce`).
6. **The chat is untouched.** No selector, element or script call of the console reaches the rooms
   (`AdminConsoleTests`); the ER room's computed styles (briefing and a session with chat, 1440 x 900 and
   390 x 844) are identical with and without the console's stylesheet.

## Consequences

- The product shape (who manages what, how content is reviewed, how rules are governed) can be shown and agreed
  before any server work.
- When the server phase starts, each page maps to a use case behind the existing repositories (ADR 0005); the
  console's local store is replaced by API calls, and access is enforced on the server by role.
- Until then the console is a demonstration: anyone can open it, and its data lives in one browser.

## Evidence

- `dotnet test`: 214 passed (four new `AdminConsoleTests`; `LandingBaseline/home.html` and `auth.html` approved
  again; the head and body seams register `css/admin-v67.css` and `js/admin.js`).
- Headless Chrome, 1440 x 900 and 390 x 844: every page, the case file, a form's validation, home redirect,
  sign-out, the announcement on a student's home; no script errors.
- ER room computed styles: 0 differences at both sizes, briefing and session with chat.
- Review (V6.7.1, same day): the legacy stylesheets forced every input, select and textarea to a 12 px corner and
  border and h1-h4 to weight 500 (all !important); the console now sets its own. Tables read as stacked records
  under 640 px (each cell carries its column name), the weekly chart uses short date labels on phones, secondary
  text and surfaces are darker, disabled buttons are grey, and the toast sits at the bottom while the console is
  shown. ER room computed styles still identical at both sizes; `dotnet test` 214 passed.

## Addendum: V6.7.1 (2026-11-14), three additions after a competitor-view review

1. **Clinical quality on the overview.** A section "جودة التدريب السريري": the platform's average on each of the
   room's scoring domains against a 75 % target, the most frequent errors (share of sessions, change on last
   month, the case where each is most common), and a table of every ER case with sessions, average score,
   compliance with the order-safety rules and the median time to its critical action. Demo figures, labelled as
   such; with the server they are computed from the sessions.
2. **An institution page.** Each institution opens its own page (from the name or "عرض المؤسسة"): plan, status,
   invoice and invite code; seats, active students, sessions and average score; a competency matrix (scoring
   domains by cohort, banded mastered / acceptable / needs training) that names the weakest point and offers to
   assign a training case to that cohort; the cohorts with supervisor, assignments, completion and score; the
   contract with its actions; the assigned cases. Per-institution figures come from a repeatable seeded stream,
   so they stay the same between visits.
3. **The medical reviewer.** A fifth demo account, "مراجع طبي" (`data-demo-login="reviewer"`, role `reviewer`),
   opens the same console narrowed to the review queue, case library, sources, rules and audit log. The reviewer
   opens a case, completes a four-point checklist (clinical consistency, doses and units, the linked guideline,
   the disposition) and approves it, or returns it to the editor with notes; confirms a source; and approves or
   rejects the rule changes the platform admin sent, shown as a list of differences. The admin still cannot
   approve a case. Approvals live in this demo environment: they show in the console, while the room keeps the
   case file's own label (`reviewed: false`) and its scoring engine until the server phase.

The demo store moved to version 2 (review assignments and cohort assignments), upgrading a version 1 store in
place.

## Second addendum: V6.7.2 (2026-11-15), the university's console

A review of the university portal found no account for the institution itself: the portal has the supervisor's
side and the student's, a supervisor saw sections of three universities at once, and the portal's data and the
admin console's data were two unrelated sets. The owner set the rule for an institution that rents the platform:
it organises its own people and reads its own results, and nothing more; it may open or close the platform's
cases for its students, but never adds or edits a case and never reaches the platform's data.

1. **Entry.** A sixth demo account, "مدير الجامعة" (`data-demo-login="uniadmin"`, role `uniadmin`, institution
   `ju`), opens the same console shell narrowed to seven pages of its own. Script:
   `ClientScripts/admin/020-university-console.js`, a second fragment of the `admin` bundle, built on an interface
   the first fragment exposes (`window.NabdConsole`).
2. **Pages.** The university's overview (six setup steps that double as navigation, seats, active students,
   sessions, average score, the competency matrix, what awaits a decision, students who need follow-up, frequent
   errors); courses and sections (a join code per section, a supervisor per section); academic staff (course
   coordinators and supervisors, invited by university e-mail); students (activity, completion, score, at-risk,
   join requests); the case library (the platform's cases, each open or closed for this university, and a
   request to Nabd for a new case); reports (by section and by case, CSV export); settings.
3. **Who may do what inside the university** is the university's choice (settings): whether a course
   coordinator creates sections and sets assignments, whether a supervisor creates sections, assigns cases and
   publishes results or only follows the students, whether the administration and the supervisor see students'
   names with their grades, and whether new students are approved by hand. The settings are stored and shown on
   the console's pages; the supervisor's portal will enforce them in the server phase.
4. **Fixed limits**, stated on the settings page: no adding or editing cases, no change to scoring weights or
   order-safety rules, no view of another institution, no access to the platform's data.
5. **One set of figures.** The university's sections are the institution's cohorts in the demo store, so the
   platform's admin sees the section the university adds; an institution's active seats are now the students of
   its sections (store version 3, upgrading version 2 in place). A case the university closes is not offered
   when a case is assigned to its sections, by the university or by the platform's admin.

Not done here: the supervisor's portal (`#view-university`) still shows its own demo sections; aligning it with
the university's sections and tidying its pages is the next step.

## Third addendum: V6.7.3 (2026-11-15), owner's decisions after seeing the consoles

1. **No reviewer console.** The medical reviewer tries a case in the room as any trainee does, and the platform is
   licensed before launch; a section of its own is not needed. The "reviewer" demo account, its review queue and
   its approve / reject screens of V6.7.1 are removed. The admin's case file now records the outcome of the
   medical review: the reviewer's name, the four checks, notes, and who recorded it (`by`, `recordedBy`); an
   approval is not recorded before the four checks are ticked. A rule change stays a draft, with its list of
   differences, until the admin approves it. "مراجع طبي" remains a role of a person in the users list.
2. **One sign-in for everyone; the e-mail decides.** The university hands over the e-mails of its people (the
   roster): students with their section, staff with their role. Whoever signs up with a listed e-mail enters his
   own university in his own role; an e-mail of the university's domain that is not listed does not. Join codes
   and manual approval of V6.7.2 are removed. Students are added by e-mail (one per line, or a CSV file), by the
   university or by Nabd's admin from the institution's page; the roster cannot exceed the contract's seats.
   Staff roles are university administration, course coordinator and supervisor.
3. **The sign-in forms show the recognition.** Under the e-mail field of the sign-in and registration forms a
   line says what the e-mail is recognised as (institution, role, section and destination), or that it is on a
   contracted domain but not on the roster. This is a display in the demo environment: enforcing entry by roster
   belongs to the server, where the roster is checked on registration and on every sign-in.
4. **Type and tables.** The page's Arabic face has two cuts only, regular (under 600) and bold (600 and up), so
   small grey text in the regular cut read as faint. Secondary text is larger and darker, labels of indicators
   are in the regular cut, bold is kept for names, figures and headings; tables have a clearer head, even rows,
   and the action column aligned at the end. A medium cut would need two more font files (not downloaded).

## Fourth addendum: V6.7.4 (2026-11-15), the supervisor's console and one way to add, edit and delete

1. **The supervisor's console replaces the legacy academic portal for a university's staff.** The legacy portal
   (`#view-university`) is bound to its own demo records (sections of three universities, the older specialty
   cases, join codes), and its scripts are pinned by the legacy baseline, so it could not follow the university's
   sections and roster. A staff member of a university (role `professor` with an institution; in the demo, the
   "doctor" account, now a supervisor of the same university as the "uniadmin" account) opens the console shell
   on four pages: his sections, assignments, students, results. Script:
   `ClientScripts/admin/030-supervisor-console.js`. A professor account without an institution keeps the legacy
   home and portal.
2. **The university's settings take effect here.** Whether he assigns cases, publishes results, sees names or
   creates sections is read from the university's policy on every page; a course coordinator sees the sections
   of his courses with the coordinator's rights. Cases offered for assignment are those the university opened.
3. **The chain reaches the student.** An assignment to the section that stands for the legacy demo student's
   section is also written to the legacy portal's own key (`nabd_v2_assignments`), so the student sees it on her
   home and opens the ER room on that case through the legacy path, unchanged. Results in the console are
   repeatable demo records, not yet the student's real run.
4. **Trying the room.** "تجربة غرفة الطوارئ" presses the application's own ER navigation button; the room and its
   chat are entered exactly as a trainee enters them, and "الرئيسية" brings him back to his console.
5. **One way to add, edit and delete, in every console.** One primary "إضافة" action in the page head; in a row,
   "عرض" opens a page and "تعديل" opens the edit drawer, titled "تعديل: name"; required fields are marked; "حذف"
   sits apart at the start of the drawer's footer. A destructive or costly action asks twice in place: the first
   click arms the button with what the second click does, and it disarms after 4.5 seconds. No browser dialogs.
   Deletion is refused where it would orphan data (a course with sections, a section with students, the last
   university administrator, one's own account).
6. The demo store is version 4 (one university for the chain); an older demo store starts again from the seed.

## Fifth addendum: V6.7.5 (2026-11-15), review, motion and a formal finish

- **Review.** Every page of the three consoles and their main drawers, at 1440 x 900 and 390 x 844, checked by
  script for contrast, clipped text, small text and overflow: no script errors, no page wider than the screen.
  Found and fixed: the registration form still asked for a section code, against the e-mail roster (the field is
  hidden; the legacy script still reads it); the weekly chart's labels on a phone were 10.5 px (now 11); a
  competency matrix wider than a phone gave no hint that it scrolls (it now says so).
- **Motion.** On arriving at a page, its blocks rise into place as they come into view (a short stagger), figures
  count up to their value and bars and chart columns fill. The final text is restored exactly. A redraw of the
  same page (a filter, a toggle) does not move. Off under `prefers-reduced-motion: reduce` and without
  IntersectionObserver; nothing is hidden in either case.
- **Finish.** A hairline under each page's head, today's date in the top bar, a teal-to-navy rule on the
  indicators, quiet hover states (a border and a soft shadow, no jump), highlighted chart columns and matrix cells
  on hover.

## Sixth addendum: V6.7.7 (2026-11-16), who enters and what he sees (owner's structure)

1. **One sign-in, and it enters directly.** The sign-in and registration forms no longer check a password in the
   browser (there is no server to check it against, and a browser-side check protected nothing). The e-mail
   decides where the person lands (`ClientScripts/admin/040-access.js`, listeners that run before the legacy
   handlers and call the legacy `loginWithAccount()`; the legacy handlers are not edited):
   - on a university's roster: that university, in the person's role (its administration, a coordinator or
     supervisor, or a student of a section);
   - on a contracted domain but not on the roster: refused, with the reason;
   - `admin@nabd.demo`: Nabd's administration;
   - any other e-mail: an independent trainee.
2. **Independent trainee and university student.** An independent trainee sees the training rooms and his own
   record, and no academic part at all: no university block on the home, no university link in the header, the
   sidebar or the hero, and his profile says "حساب فردي". A university's student sees all of that plus his
   university's part, named "القسم الجامعي" in the sidebar and shown on the profile with his section, supervisor
   and assignments. Every section now has a code the student's own home understands, so a listed student of any
   section sees his assignments there.
3. **Ready accounts.** Only the three administrations (supervisor, university, Nabd). The two student accounts
   are removed; a trainee signs in with an e-mail. The demo university's roster lists the two former demo
   students, so `rana.m@uni1.edu.jo` opens a university student's view.
4. **The sign-in screen.** One centred card on a navy band; the side panel with the photo is gone. On a laptop
   the card has two columns (the form; then the university's Microsoft account and the ready accounts), so the
   whole screen shows without scrolling at 1366 x 657. Registration is one step: name, e-mail, password, track
   (nursing or medicine); the supervisor card is gone, since staff come from the university's roster.
