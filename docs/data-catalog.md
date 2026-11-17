# Data catalog

Every piece of data Nabd 7 holds: where it lives, what reads it, and what it would reveal to a trainee who downloaded it.

- The clinical content of the cases **has not been reviewed by a physician** (`reviewed: false` in `er-cases.json`).
  The system does not diagnose or treat real patients.
- The emergency room runs in the browser and downloads its case file. The server's model and use cases read the same
  file; the browser does not call them yet.
- There is no database, no server-side account and no authentication ([decision 0008](decisions/0008-no-database-and-no-authentication-in-this-phase.md)).
  Accounts, progress and the consoles' records live in the visitor's browser.

## Summary table

| Data set | Lives in | Read by | Served to the browser? | Contains answers or scoring rules? |
|---|---|---|---|---|
| `er-cases.json` | `src/Nabd.Infrastructure/CaseData/Files/` | Browser: the room, the consoles and the student's academic part (cases' names). Server: `ErCaseFileMapper` | Yes | Yes (diagnoses, expected steps, test indications, scoring hints) |
| `er-act.json` | same | Browser: the room's offline reader | Yes | No (classifier weights) |
| `er-find.json` | same | Browser: the room's offline reader | Yes | No (classifier weights; finding vocabulary) |
| Demo accounts | `ClientScripts/script/070-demo-accounts.js` | Browser | Yes, inside `/js/script.js` | No |
| The consoles' demo data (institutions, users, sections, staff, rosters, results) | `ClientScripts/admin/010`–`030` (seed) and the browser store | Browser | Yes, inside `/js/admin.js` | No |
| The scoring rubric of the assessment layer, the coach's drill templates | `ClientScripts/erplus/020-assessment.js`, `app/065-drill-templates.js` | Browser | Yes | Yes (weights, life-saving list, expected drill steps) |
| Images | `src/Nabd.Web/wwwroot/img` (named in `images.json`) | Browser | Yes, as static files | No |
| Browser storage | The visitor's browser | Browser | Never reaches the server | No |
| Server session store | Memory of the server process | Server (session API, off by default) | Only the fields of `SessionSnapshot` and `SessionReport` | The answers stay on the server until the report |

## The case data files (`src/Nabd.Infrastructure/CaseData/Files`)

`CaseDataFiles.KnownNames` lists the three files; no other name can be read or served
(`Only_the_shipped_data_files_can_be_read`, `Data_that_the_application_does_not_name_cannot_be_asked_for`). Git does not
convert their line endings.

### er-cases.json

- **Purpose.** The six emergency cases of the ER room (`asthma`, `sepsis`, `pe`, `stemi`, `dka`, `htn`) and the catalogs
  of 22 tests and 42 actions they share. It holds the patient script, the relative's and nurse's lines, the vital-sign
  timeline, the history facts, the examination findings, the per-case evaluation rules, the test results and the
  nurse-role orders.
- **Manifest** (`data/er-cases.json`): 259,214 bytes; SHA-256 `4c76ccf2fb6c478deb17db926e0bb3339941fd13b7f186bdd2aac38323739865`.

| Top-level field | Type | Content |
|---|---|---|
| `tests` | array of 22 | `id`, `ar`, `en`, `group`, `tat`, `kw`, `panel` |
| `actions` | array of 42 | `id`, `ar`, `en`, `dose`, `kw`, and optional `limits`, `repeat`, `fx`, `suggest`, `risky`, `total`, `pushHarm` |
| `cases` | array of 6 | One object per case (fields below) |
| `reviewed` | boolean | `false` |

Main fields of a case: `id`, `bed`, `dx` (true diagnosis and accepted wordings), `dispo` (correct
disposition), `dispoBad`, `collapse` (one case), `patient`, `companion`, `nurse`, `risk` (start, rate and three stage
thresholds), `vitals` (keyframes), `temp`, `kg`, `stageLines`, `facts`, `exam`, `care` (per-action evaluation rules),
`results` (per-test result and indication), `teach`, `brief`, `improve`, `nurseMode`, `findMap`.

- **Counts**: 6 cases; 22 tests; 42 actions; 104 facts in total; 22 examination items; 152 `care`
  entries; 137 `results` entries; 58 nurse-mode orders; 103 accepted diagnosis terms; 155 `findMap` entries. Recomputed
  from the file: all match.
- **Read by the browser.** `er.js` loads the whole file into `D`. The academic portal in
  `script.js` fetches it too, to list cases for assignment (`script/770-academic-foundation.js`, `fetch('data/er-cases.json')`).
- **Read by the server.** Yes, in part, through `ErCaseFileMapper` (see the next section). The mapper reads about a dozen
  groups of fields. The conversation, teaching and nurse-mode fields are **not mapped**. The external function
  `er-chat` imports its own copy of the file.
- **What a trainee could learn from it if downloaded.** Everything about each case: the true diagnosis and every
  accepted wording; the correct disposition and the wrong ones; for each action whether it is a key step, its deadline,
  its correct dose text, whether it is harmful and how much risk it adds; the allergy trap; for each test whether it is
  indicated, acceptable, not indicated or harmful, with the reason and the key interpretation; the full result values;
  which history items are red flags; what the relative hides; the risk thresholds and stage timing; the nurse-mode
  orders with doses.
- **Integrity notes** (kept as they are). In case `dka`, 5 result keys have no entry in `tests`
  (`lipase`, `osmolality`, `magnesium_level`, `phosphate`, `hba1c`). In case `htn` the id `neuro` exists in both
  `facts` and `exam`. The action `cpr` has no `care` entry in any case. 60 of the 121 finding classes in `er-find.json`
  have no `findMap` entry in any case (recomputed from the two files). The `reviewed` flag is `false` at top level and also on `dka` and `htn`; the other
  four cases carry no per-case flag. Repairing any of this is a clinical-content change and was not done
  ([decision 0005](decisions/0005-legacy-data-behind-repositories.md)).

### er-act.json

- **Purpose.** A linear text classifier with 10 dialogue acts (greeting, wish, thanks, yes, no, unsure, refuse, number,
  time, other). The ER room uses it for short replies when the server cannot be reached.
- **Manifest** (`data/er-act.json`): 410,682 bytes; SHA-256 `5891145b9b5b39c80ffc339f5fa09d29576a1257771d01d79fc5025152f3ce66`.

| Field | Type | Content |
|---|---|---|
| `source` | string | Training note: "Not a medical model" |
| `acts` | string[10] | Act labels |
| `n` | number[2] | N-gram length range |
| `bias`, `idf`, `grams`, `w` | arrays | Bias (10), idf (8000), n-gram vocabulary (8000), weights (8000 rows of 10) |

- **Read by the browser.** `loadAct` and `readAct` in `er.js`. **Server:** none.
- **What a trainee could learn.** Classifier weights only; no clinical answers. A trainee could reproduce the classifier.
- **Integrity.** The three parallel arrays have equal length.

### er-find.json

- **Purpose.** A linear classifier from a history question to one of 122 classes (121 finding ids plus `none`). The ER
  room uses it offline to decide which history item a question asks about.
- **Manifest** (`data/er-find.json`): 737,985 bytes; SHA-256 `eb4fedc9e3f1e4d234c66b2fd126e5bd1d0c9bcb191f1b8383f2552c6ada9367`.

| Field | Type | Content |
|---|---|---|
| `source`, `n`, `tau`, `scale` | string, number[2], 0.3, 40 | Training note, n-gram range, confidence threshold, weight quantisation |
| `classes` | string[122] | Finding ids and `none` |
| `bias`, `idf`, `grams`, `w` | arrays | Bias (122), idf and grams (5000 each), sparse weight rows |

- **Read by the browser.** `loadFind`, `readFinding` in `er.js`; the id is then looked up in a
  case's `findMap` (`er.js:1193`). **Server:** none.
- **What a trainee could learn.** The vocabulary of 121 finding ids. It names findings in general; it holds no case content.

## How the server reads cases

The path, from the file to the domain:

```
CaseDataFiles.ReadAsync("er-cases")          the only code that opens the files, by known name
   -> ErCaseFileMapper.Map(bytes)              JSON -> ErCaseFile (Catalog, Cases, Reviewed)
   -> JsonClinicalCaseRepository               reads and maps once, on first use; keeps the result
   -> IClinicalCaseRepository                  the port in Nabd.Application.Abstractions.Data
   -> ClinicalCatalog and ClinicalCase         immutable domain objects (Nabd.Domain)
```

`IClinicalCaseRepository` offers `GetCatalogAsync`, `ListCaseIdsAsync`, `FindAsync(caseId)` and
`IsClinicallyReviewedAsync`. The mapper keeps the order of the entries in the file (the cases, and each case's care
steps and results), because the scoring rules walk a case's entries in that order. The `ClinicalCase` constructor refuses a case without an id or with fewer than two
vital-sign anchors, or with anchors that do not rise in risk (`DomainException`). The mapper throws
`InvalidDataException` for an unknown test indication.

A second reader exists, but it does not interpret the data: `FileClientDataDocumentSource` reads each of the eight files
as opaque bytes, keeps them in memory and serves them with a SHA-256 based entity tag through `ClientDataController`
(`GET /data/{name}.json`).

### Field mapping (checked in `ErCaseFileMapper.cs`)

| JSON field | Domain member |
|---|---|
| `actions[].id`, `ar`, `en` | `InterventionDefinition.Id`, `ArabicName`, `EnglishName` |
| `actions[].dose` (true) | `InterventionDefinition.RequiresDose` |
| `actions[].repeat` `{gap, again, max, up}` | `RepeatRule(GapMinutes, AgainShare, Maximum, OnlyMoreAdds)` |
| `actions[].fx` `{spo2, hr, rr, sbp, dbp, ramp}` | `VitalEffect` (also used for `care[].fx`) |
| `tests[].id`, `ar`, `en` | `TestDefinition(Id, ArabicName, EnglishName)` |
| `cases[].id` | `ClinicalCase.Id` |
| `cases[].risk` `{start, rate, watch, urgent, critical}` | `RiskProfile(Start, RatePerMinute, Watch, Urgent, Critical)` |
| `cases[].risk.hold` `{until, at}` | `RiskHold(UntilActionId, AtRisk)` |
| `cases[].vitals[]` `{at, hr, sbp, dbp, rr, spo2}` | `VitalAnchor(AtRisk, VitalSigns)`, in file order |
| `cases[].temp` | `ClinicalCase.Temperature` |
| `cases[].kg` | `ClinicalCase.WeightKg` (nullable) |
| `cases[].vt` | `ClinicalCase.VentricularTachycardiaWhenCritical` |
| `cases[].care.<actionId>` `{key, by, slow, onset, spo2, fx}` | `CareStep(ActionId, IsKey, DueByMinute, RiskSlowing, OnsetMinutes, OxygenSaturationGain, Effect)` |
| `cases[].results.<testId>` `{ind, whenShock, by, before}` | `TestExpectation(TestId, Indication, WhenShocked, DueByMinute, BeforeActionId)` |
| `results[].ind` values `indicated`, `acceptable`, `no`, `harm` | `TestIndication.Indicated`, `Acceptable`, `NotIndicated`, `Harmful` (a missing `ind` becomes `NotIndicated`) |
| `cases[].stageLines.watch`, `urgent`, `critical` | `StageCue(NamesMeasuredSigns)`: true when the stage has a `parts` array. The text is not read |
| `cases[].facts[]` `{id, red}` | `ClinicalFinding(Id, IsExamination: false, IsRedFlag)` |
| `cases[].exam[]` `{id, red}` | `ClinicalFinding(Id, IsExamination: true, IsRedFlag)` |
| `cases[].dispo`, `dispoAlso`, `dispoBad` | `DispositionRule(Right, AlsoAcceptable, Dangerous)` |
| `cases[].collapse` `{need, dispo}` | `CollapseRule(RescueActionId, Destination)` |
| top-level `reviewed` (true only if the JSON value is `true`) | `ErCaseFile.Reviewed`, exposed by `IsClinicallyReviewedAsync` |

### Fields deliberately not mapped

The mapper's summary says the conversation fields stay with the room. By inspection of the mapper, these
fields exist in the file and are not read on the server:

| Group | Fields not mapped |
|---|---|
| Action catalog | `kw`, `limits`, `suggest`, `risky`, `total`, `pushHarm` |
| Test catalog | `group`, `tat`, `kw`, `panel` |
| Case identity and truth | `bed`, `dx` (diagnosis and accepted wordings), `dispoWhy`, `collapse.why`, `collapse.needWhy`, `collapse.dx`, `hyper`, per-case `reviewed` |
| People | `patient`, `companion` (lines, tells, persona), `nurse` |
| Stage text | the text of `stageLines` (only the presence of `parts` is read) |
| History and examination | `facts` and `exam` fields other than `id` and `red` (question, keywords, answer, `who`, `covers`, `nurseNote`, `sayCritical`, `sayReact`) |
| Care rules | `care` fields other than `key`, `by`, `slow`, `onset`, `spo2`, `fx` (for example `label`, `why`, `dose`, `harm`, `risk`, `challenge`, the allergy fields, the gating fields) |
| Result detail | `results` fields other than `ind`, `whenShock`, `by`, `before` (for example `why`, `good`, `rows`, `key`, `report`) |
| Teaching and nurse role | `teach`, `brief`, `improve`, `improveBy`, `nurseMode`, `findMap` |

The harm and allergy judgement is therefore **not** on the server; the session API takes it as an input (decision 0007).

## Data kept in the browser

All of it sits in the visitor's browser and never reaches the server. The new code reads and writes it through
`window.NabdStore` (`shared/010-store.js`); the shell uses `safeStorageGet`/`safeStorageSet`
(`script/100-local-storage-store.js`), which fall back to `window.name` when `localStorage` is blocked.

| Key | Store | Holds | Personal data? |
|---|---|---|---|
| `nabd_v2_accounts_map` | localStorage | Every account used on this device: name, e-mail, track, year, photo, university and section, and its saved sessions with their full reports and the coach's record | Yes |
| `nabd_v2_active_user_id` | localStorage | The signed-in account's id | Indirect (built from the e-mail) |
| `nabd_v2_admin` | localStorage | The consoles' state: institutions, users, subscriptions, case reviews, rules, audit log, settings; each university's courses, sections, staff, roster, policy (pass marks, permissions), published results, overrides, ratings, notes | Yes (names and e-mails of the demo roster; supervisors' notes) |
| `nabd_v2_assignments` | localStorage | The assignments a student's home reads: `{id, caseId, section, due, note, by, ts}` | No |
| `nbx_page`, `nbx_org`, `nbx_role`, `nbp_realism` | sessionStorage | This visit's console page and the realism switch | No |
| `nbSound`, `nabd_terms_lang` | localStorage | The monitor's sound, the terms' language | No |

Anyone can edit this storage in the browser's tools, change a role or a mark. The sign-in is not a security boundary.

## Data kept on the server

The only data the server keeps is the in-memory session store, `InMemorySimulationSessionStore`
(`src/Nabd.Infrastructure/Simulation`). The case files are read-only and are not "kept".

| Item | Detail |
|---|---|
| What an entry holds | A `SessionEntry`: the `SimulationSession` (time, risk, stage, blood-pressure cuff, interventions, harms, tests, arrest and handover state), a lock, the graded `HandoverAssessment` once handed over, and the `CommunicationRecord` recorded at the end |
| Key | A random `SessionId` (a GUID). With no authentication it is the only thing that protects a session (decision 0007) |
| Personal data | None. An entry has no user, name or account field |
| Limits | At most 500 sessions (`Simulation:Sessions:MaximumSessions`); a new one is refused when full. Idle entries are dropped after 120 minutes (`IdleMinutes`) |
| Lifetime | Until idle time, or until the process restarts. Sessions are not shared between instances |
| Persistence | None. No database, no file |
| Who can reach it | The session API under `/api/simulation/sessions`, which answers 404 unless `Simulation:ServerSessionsApi:Enabled` is true (true in Development and tests, false in `appsettings.json`) |
| What a response shows | The monitor, the cuff, the stage and what was done. The risk, its rate, the test indication and the scoring rules stay on the server until the report (`SimulationSessionsApiTests`) |
| Used by the room today | No. The room does not call this API yet |

The relay to the understanding service (`/api/er-chat`) stores nothing; it checks and forwards the request.

## Exposure today and how it closes

Rule: internal clinical evaluation data should not reach the browser. It is **not met** while the room runs in the
browser: a visitor can request `er-cases.json` and the bundles.

| Data set | Exposed today? | Stops being served when |
|---|---|---|
| `er-cases.json` | Yes, whole file | The room's engine runs on the server, and the consoles read the cases' names from an API |
| `er-act.json`, `er-find.json` | Yes | The room no longer reads replies offline in the browser. They hold no answers |
| The assessment rubric and drill templates | Yes, inside the bundles | Scoring moves to the server (the session API) |
| Browser storage | Never leaves the browser | Real identity and a store exist (decision 0008) |

The server's session API does not widen exposure: it is off by default, and a test asserts that its responses omit the
risk and the test indication.

## Rules for this data

- **A change to a case is a clinical change.** It needs a physician's review, fails the golden masters on purpose, and
  is recorded in the commit.
- **Not physician-reviewed.** `er-cases.json` has `reviewed: false`; the repository exposes the flag
  (`IsClinicallyReviewedAsync`, pinned by `The_clinical_content_is_reported_as_not_reviewed_by_a_physician`).
- **Not for real patients.** The classifier files say they read language, not medicine.
- **Credits.** `er-act.json` and `er-find.json` were trained on Nabd's own language batch and findings dictionary (their
  `source` lines). Images: `src/Nabd.Web/wwwroot/img/CREDITS.txt` and `img/landing/CREDITS.md`; the clinical images
  kept for later: `docs/image-library/files/CREDITS.txt`.
- **No secrets in this data.**
- **Personal data.** The server stores none. Moving accounts, rosters or notes to a server is a new personal-data
  decision.
