# Changelog

## 7.2.2 — 2026-11-22 (presentation materials; development postponed)

- **Presentation materials saved in `docs/pitch/`.** The nine-slide deck (HTML and PDF), the approved speaking script, the team document and the companion papers: two survey report templates that compute percentages from the counts typed in from the paper forms, the research file (40 references, study DOIs checked against Crossref), the operating cost, the business model canvas, the assessment standards and a pilot study plan. Index in `docs/pitch/README.ar.md`.
- **Development postponed** until the new requirements document. No application code changed since 7.2.1.

## 7.2.1 — 2026-11-19 (development freeze)

- **Freeze check before the presentation.** Every page of the three console accounts, the student home, the three open sections, all seven cases and the operating room were opened in a browser: no script error and no broken text or image.
- **The sidebar matches the site.** The guest links pointed at landing sections that no longer exist; they now go to the sections of the public header. The signed-in sidebar no longer shows the open sections as «قريباً»: «الأمراض التنفسية» opens that section's cases, «أقسام التدريب» opens the sections, and «غرفة العمليات» is listed.
- **Demo script and handover updated** for 7.2: the open sections, the hyperkalaemia case, the framework assessment, the operating room, Claude on or off, and the freeze.

## 7.2.0 — 2026-11-19

- **The patient and the relative speak simple colloquial; everyone else stays formal (owner, agent log D-68).** Their lines in the case file, the room's offline lines, the relatives' interruptions, the operating-room patient and Claude's voice prompt for the patient and relative (`PeopleRegister`) use everyday Arabic that leans to the standard; the nurse, the doctor, the supervisor and the interface stay formal (60 staff lines that were still colloquial were corrected). The companion's telling line is linked again to the fact it reveals. The approved room's fingerprint was re-recorded.
- **Assessment by the international frameworks (D-69).** The doctor's report adds the primary survey (ABCDE: first minute of each letter, complete in the first five minutes, order), SAMPLE history coverage, the response to each deterioration in minutes, communication in the four Calgary-Cambridge domains and the error type of every error. All read from what the trainee did in the session. The assessment axis is now history 6, ABCDE 4, reassessment 5; a deterioration left three minutes is a major error.
- **A seventh emergency case (D-70).** Severe hyperkalaemia with ECG changes on acute-on-chronic kidney injury, built on the project's clinical data files: full history with the relative, examinations, 22 tests with results, IV calcium (new in the catalogue), insulin with dextrose, salbutamol, fluids, the dangerous orders the nurse challenges, deterioration over time and a nurse role. Orders given together run in a safe order (dextrose before insulin). A home medicine named in the handover is no longer read as a claimed treatment.
- **Three specialty sections open (D-71).** Pulmonology, cardiology, and endocrinology and diabetes list their cases by complaint; each case opens in the simulation room.

## 7.1.0 — 2026-11-19

- **Formal language after sign-in (owner's decision, 2026-11-19).** The clinical coach, the room's interruptions, the case file's lines (patient, relative, nurse, supervisor), the room's offline lines and the operating-room chat are in plain formal Arabic close to the standard. The people are named by role («المريض محمود العبادي»، «المرافق (ابنه)») and no longer by nickname or kunya. What the system understands from the trainee still accepts colloquial and formal forms. The approved room's fingerprint was re-recorded (agent log D-65, D-66).
- **Claude as the understanding service.** `ClaudeUnderstandingServiceGateway` serves the room's turn, line and handover grade from our own server with the Anthropic SDK; off by default, key from the environment, rules and scoring stay in our code (D-67). Not yet tried against the live service.
- **Operating-room page redesigned.** A case bar (patient, procedure, side), the platform's own camera bar, monitor, anatomy and full-screen buttons over the 3D view with the simulator's controls hidden, and the chat under a navy header with the step progress.

- **The 3D operating room.** A new section (`#view-or`): the operating-room simulator, taken from the `or-simulator/`
  folder of the project's original repository (runtime, models and licences only; its documents, tests and build tools
  are left out), runs in a frame (`wwwroot/or3d`, `index.html?embed=1` shows the 3D view only). On its left, the team's
  chat: the supervisor and the patient speak, the trainee answers by an action button or a typed message, and an action
  moves the room (the face, the abdomen, the monitor, the surgeon's place). The first session is the preparation of a
  patient for an appendectomy, six steps before the incision; training content, not reviewed by a physician.
  A teaser on the public landing and a card on the signed-in home lead to it. The frame loads only when the page is
  opened; the page is protected like the other trainee views and closed to console accounts.

## 7.0.0 — 2026-11-18

The first official release. Everything the platform does today, with nothing the platform no longer uses.

### The platform

- **Access.** One sign-in for everyone by e-mail; the e-mail decides the account (Nabd's administration, a
  university's staff or student by its roster, an independent trainee). An unknown e-mail goes to registration.
  Registration is one step: name, e-mail, the track (it decides the role in the room for good) and the year.
- **The trainee.** A home with his own facts and «ابدأ أول حالة» before the first session, the emergency room in the
  role of his track, saved reports with the supervisor's review, the clinical coach with a guided drill, and a profile
  with «بياناتي» and a printable record.
- **The emergency room.** Six cases, the approved room unchanged, with switchable layers: realism, the assessment
  (rubric, errors by severity, timeline, handover, reflection, the university's pass mark) and the nurse's call to the
  doctor.
- **The consoles.** Nabd's administration, the university's (courses, sections, staff, roster, open cases, pass marks,
  permissions) and the supervisor's (assignments, results, overrides with a reason, rating, publishing).

### The code

- Clean Architecture in five projects (ASP.NET Core MVC, .NET 10); the client in nine bundles by responsibility, one
  browser store, one image catalogue.
- About 34,000 lines removed since 6.11: the old client's unreachable features, the respiratory room, the old landing,
  unused styles, images and data, the migration tooling and documents ([decision 0021](docs/decisions/0021-v7-clean-release.md)).
- The approved room is protected by a fingerprint; designed regions by approved snapshots; 207 tests; browser walks
  in `tools/qa`.

### Documents

[docs/HANDOVER.ar.md](docs/HANDOVER.ar.md) (start here), [docs/prototype-constraints.ar.md](docs/prototype-constraints.ar.md),
[docs/architecture.md](docs/architecture.md), [docs/image-library/README.ar.md](docs/image-library/README.ar.md),
[docs/agent/er-agent.ar.md](docs/agent/er-agent.ar.md), [docs/next-phase-backlog.md](docs/next-phase-backlog.md).
