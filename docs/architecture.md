# Architecture

Nabd («نَبْض الأردن») 7 is an Arabic clinical-simulation trainer for medical and nursing students, built on ASP.NET Core
MVC (.NET 10) with Clean Architecture. This document says what each project holds, which way the dependencies point,
how the page reaches the browser, where the logic runs, and where the server takes over next.

The clinical content of the cases **has not been reviewed by a physician**. The data file says so (`reviewed: false`),
the repository exposes that flag, and a test pins it.

## The five projects

```
Nabd.sln
├── src/Nabd.Domain           the clinical simulation: cases, vital signs, risk, stages, scoring
├── src/Nabd.Application      use cases and the contracts (ports) the outside world must fulfil
├── src/Nabd.Infrastructure   adapters: the case data files, the session store, the understanding service
├── src/Nabd.Web              ASP.NET Core MVC: controllers, Razor views, client scripts, images, static assets
└── tests/Nabd.Tests          architecture, domain, golden masters, application, infrastructure, web and client tests
```

Dependencies point inwards only:

```
Nabd.Web ──────────► Nabd.Application ──────────► Nabd.Domain
   │                        ▲
   └──► Nabd.Infrastructure ┘   (Web references Infrastructure only to register it: the composition root)
```

`tests/Nabd.Tests/Architecture/LayeringTests.cs` checks this on the compiled assemblies.

### Nabd.Domain

No package or project references. Everything in it is plain C#.

| Folder | Holds |
|---|---|
| `Cases/` | `ClinicalCase` (reference data: risk profile, vital-sign anchors, care steps, expected test results, stage cues, findings, disposition and collapse rules) with `VitalsAt(risk)` and `StageAt(risk)` |
| `Catalog/` | `ClinicalCatalog`: the interventions and tests every case shares, with their repeat rules and general effects |
| `Simulation/` | `SimulationSession`, the aggregate root: time, risk, stage, the blood-pressure cuff, interventions, harms, tests, anaphylaxis, ventricular tachycardia, arrest and handover. Value objects (`VitalSigns`, `VitalEffect`, records of what happened) and session events |
| `Simulation/Scoring/` | `SessionScorer`: the 100-point score in six parts, the destination verdict, and the reasons that fail a session whatever its score |
| `Common/` | `DomainException`, and the two numeric helpers kept exactly as the approved room computes |

`SimulationSession` is a rule-for-rule port of the clinical core of the approved ER room (`er.js`). It is pinned by
45 golden-master traces recorded from that code and replayed **bit for bit** (see
[testing-strategy.md](testing-strategy.md) and [decision 0004](decisions/0004-clinical-core-pinned-by-golden-masters.md)).
The session knows nothing about text, the screen or the network: it receives the outcome of an order as a command.

### Nabd.Application

References the domain, plus the dependency-injection and logging abstractions.

| Folder | Holds |
|---|---|
| `Simulation/` | Use cases `StartSimulationSession`, `AdvanceSimulation`, `ExecuteIntervention`, `ReportHarmfulOrder`, `RequestMedicalTest`, `CompleteSimulation`, `GenerateSessionReport`; the views a trainee may see (`SessionSnapshot`, `SessionReport`) |
| `Dialogue/` | Use case `ProcessPatientMessage`: checks a room's request and relays it to the understanding service (the external serverless function that reads what the trainee wrote and voices the people in the room) |
| `Abstractions/Data/` | `IClinicalCaseRepository`, `IClientDataDocumentSource` |
| `Abstractions/Simulation/` | `ISimulationSessionStore` |
| `Abstractions/Ai/` | `IUnderstandingServiceGateway` |
| `Abstractions/Agents/` | The multi-agent contracts: `IAgentOrchestrator`, `IPatientAgent`, `ICompanionAgent`, `INurseAgent`, `ISupervisorAgent`. **Contracts only**; a test fails if anything implements them |
| `Common/` | `Result<T>` and `Error`: a use case reports a failure without throwing |

A use case is one sealed class with one `HandleAsync` method. It loads what it needs through a port, asks the
domain to do the work, and returns a view. No clinical rule lives in this layer, and there is no mediator library
([decision 0001](decisions/0001-clean-architecture-in-five-projects.md)).

### Nabd.Infrastructure

| Folder | Holds |
|---|---|
| `CaseData/Files/` | The four data files of the emergency room: `er-cases.json` (the six cases), `er-act.json` and `er-find.json` (the two small models the room uses offline to read what the trainee wrote), `er-lang.json` (its phrasing) |
| `CaseData/` | `CaseDataFiles` (the only code that opens those files, by known name), `JsonClinicalCaseRepository`, `FileClientDataDocumentSource`, `ErCases/ErCaseFileMapper` (case file → domain objects) |
| `Simulation/` | `InMemorySimulationSessionStore`: bounded, with an idle time limit |
| `Ai/` | `HttpUnderstandingServiceGateway`: relays the room's request to the understanding service |

### Nabd.Web (MVC)

| Folder | Holds |
|---|---|
| `Controllers/` | `HomeController` (the page), `AccountController` (`/login`, `/register`), `ClientScriptsController` (`/js/*.js`), `ClientDataController` (`/data/*.json`); `Api/UnderstandingController` (`/api/er-chat`), `Api/SimulationSessionsController` (`/api/simulation/sessions`, off by default) |
| `Views/` | The page as Razor partials: `Home/Landing` (the public landing), `Home/Dashboard` (the signed-in home), `Home/Coach`, `Home/Profile`, `Home/Rooms` (the ER room), `Home/Admin` (the consoles' frame), `Account` (sign-in and registration), `Shared/Layout` (headers, sidebar, footer, head) |
| `ClientScripts/` | The browser code: source fragments joined into nine bundles by `bundles.json` and `ClientBundleProvider` (below) |
| `Images/`, `images.json` | `ImageCatalog`: the site's images by key; a view writes `@Img["key"]` ([decision 0020](decisions/0020-v611-delivery-structure.md)) |
| `Http/` | Rate-limit policies, the same-origin filter, the cached-content result |
| `wwwroot/` | Stylesheets, images, the self-hosted Arabic font |
| `Program.cs` | The composition root |

Controllers are thin: each action calls one use case or one port and maps the result to HTTP.

## The client

The page is one Razor page with six views (`#view-index` the landing, `#view-home`, `#view-coach`, `#view-profile`,
`#view-er`, and `#view-or`, the operating room: the 3D simulator in a frame and the team's chat beside it) plus the consoles' frame (`#view-admin`) and the sign-in screen. Joining is plain concatenation: nothing
is minified or reordered.

| Bundle | Folder | Responsibility |
|---|---|---|
| `script.js` | `script/` (24 fragments) | The application shell: accounts and session, sign-in screen, view navigation, sidebar, profile render, the student's academic part, the home by track, level |
| `er.js` | `er/` (67) | **The approved emergency room**: conversation, monitor, orders, tests, deterioration, handover, report. Fingerprinted; changed only by the owner's decision |
| `motion.js`, `terms.js`, `ui.js` | `motion/`, `terms/`, `ui/` | The room's monitor and alarm sound, the English clinical terms in the room, the sidebar drawer |
| `landing.js` | `landing/` | The public landing, the sign-in pages' behaviour, the home's sections |
| `admin.js` | `shared/` + `admin/` | The browser store (`NabdStore`), then the three consoles: Nabd's administration, the university's, the supervisor's |
| `app.js` | `app/` (11, one scope) | The trainee's application: rules of entry, who sees what, home facts, reports, coach page and drills, profile, the shell's history and Back button |
| `er-plus.js` | `erplus/` | Layers over the room: realism, assessment, the nurse–doctor call, opening a case and the role rule |

Stylesheets follow the same split: `style.css` and `theme.css` (the shell's base), `er.css` (the approved room),
`landing*.css` (the landing), `auth.css` (sign-in), `app.css` (the signed-in screens' identity), `home-base.css` and
`home.css` (the home), `academic.css` (the student's academic part), `admin.css` (consoles), `trainee.css` (the
trainee's pages), `er-plus.css` (the room's layers, every rule under `#view-er.nbp-on`).

The new code reaches the shell only through a short list of its global functions, which it wraps
(`showOnlySection`, `navigateTo`, `loginWithAccount`, `saveAccountToStorage`, `getAccountFromStorageOrDefault`,
`authState`, `renderProfileView`, `showToast`, `window.nbOpenER`, `window.__nbER`).

### What the browser keeps

There is no database in this phase ([decision 0008](decisions/0008-no-database-and-no-authentication-in-this-phase.md)).
`window.NabdStore` (`shared/010-store.js`) is the one place the new code reads and writes the browser's storage.

| Record | Key |
|---|---|
| The consoles' state (institutions, users, each university's sections, staff, roster, policy, pass marks, published results, overrides, ratings, notes; platform settings) | `localStorage nabd_v2_admin` |
| Assignments | `localStorage nabd_v2_assignments` |
| Accounts with their saved sessions and reports | `localStorage nabd_v2_accounts_map`; the signed-in account `nabd_v2_active_user_id` |
| This visit only (console page, realism switch) | `sessionStorage nbx_page`, `nbx_org`, `nbx_role`, `nbp_realism` |
| Preferences | `localStorage nbSound` (monitor sound), `nabd_terms_lang` (terms) |

A saved report is the one source of what a trainee sees about himself and what the supervisor reviews (decision
log D-55 in [agent/er-agent.ar.md](agent/er-agent.ar.md)).

### The seams to the server

| Today in the browser | Becomes | Where to cut |
|---|---|---|
| `NabdStore` reads and writes `localStorage` | calls to the server's API (accounts, sessions, institutions, assignments) | `shared/010-store.js` only |
| The room computes the score in the browser | the server's session API (exists, off by default, [decision 0007](decisions/0007-server-session-api-off-by-default.md)) | `erplus/020-assessment.js` reads the result instead of computing it |
| E-mail sign-in without a password | server identity with university sign-in ([auth-external-providers.md](auth-external-providers.md)) | `app/020-access.js` |
| Image paths | already on the server | `images.json` |

## Where the logic runs today

| Concern | Runs in | Status |
|---|---|---|
| Clinical dynamics of the ER room (risk, vital signs, stages, cuff, interventions, harms, tests) and the doctor's score | Browser (the approved room) **and** `Nabd.Domain` | The domain reproduces the room exactly; the room does not call it yet |
| Reading what the trainee wrote; order safety (dose, allergy, "too early") | Browser and the understanding service | Not ported |
| Voices of the patient, relative, nurse, supervisor | The understanding service; fixed lines in the browser when offline | Relayed through the application |
| The assessment layer (rubric, errors, timeline, handover, reflection), the realism layer, the nurse's call | Browser (`er-plus.js`) | Prototype; decisions in ADRs 0016, 0017 and the decision log |
| Consoles, home, reports, coach, profile | Browser (`admin.js`, `app.js`) | Prototype on demo data |

## Data exposure

While the room runs in the browser, the browser downloads its case file, which holds diagnoses, expected steps and
scoring hints. The server's session API already sends only what a trainee may see (a test asserts it). Moving the room
to the server closes the gap. [data-catalog.md](data-catalog.md) lists, per file, what a trainee could learn from it.

## Security posture

| Area | State |
|---|---|
| Secrets | The application holds none. The model key stays in the understanding service's environment |
| Authentication, authorization | **None** in this phase. Accounts and roles are demo data in the browser; nothing server-side may rely on a role until real identity exists |
| Understanding endpoint | Same-origin filter, per-caller rate limit, 64 KB body limit, JSON and case-id validation before anything is relayed |
| Server session API | Off by default (`Simulation:ServerSessionsApi:Enabled`); bounded in-memory store |
| Response headers | `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`. No Content-Security-Policy yet: the room relies on inline handlers |
| Errors | Problem documents without stack traces; details go to the log |

## Preparing for the multi-agent system

Nothing of it is implemented. `Nabd.Application/Abstractions/Agents/` defines the orchestrator and the four voices;
`ProcessPatientMessage` is the single point through which a room's message leaves the application (when agents exist,
it asks the orchestrator instead of relaying); `SimulationSession` raises the events an orchestrator will react to.
The agent's behaviour and every decision about it are in [agent/er-agent.ar.md](agent/er-agent.ar.md). See
[decision 0009](decisions/0009-multi-agent-contracts-only.md).
