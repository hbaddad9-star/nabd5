# Requirements

What Nabd 7 must do and keep. Each requirement names where it is checked: a test (`dotnet test`), a browser walk
(`tools/qa`), or a decision (ADRs in `docs/decisions/`, the agent's decision log `docs/agent/er-agent.ar.md`).

## Purpose and users

Nabd («نَبْض الأردن») is an Arabic clinical-simulation trainer. A trainee manages an emergency patient in a
chat-driven room: talks to the patient and the relative, works with the nurse or the doctor, reads a monitor, orders
tests, hands the patient over and receives a scored report. A university subscribes, organises its students and
supervisors, and chooses among Nabd's cases; a supervisor reviews and approves his students' sessions.

| User | What the user does |
|---|---|
| Independent trainee (medicine or nursing) | Registers with an e-mail, plays the ER room in the role of his track, reads his reports, trains gaps with the clinical coach |
| University student | Signs in with an e-mail on her university's roster; also sees her section's assignments and her supervisor's reviewed results |
| Supervisor (university staff) | Assigns cases to his sections, reads his students' sessions, overrides a mark with a written reason, rates and publishes |
| University administrator | Manages courses, sections, staff, the student roster, which of Nabd's cases are open, pass marks and permissions |
| Nabd's administration | Institutions, users, subscriptions, the case library and its review, sources, scoring rules, audit log, platform settings |
| Maintainer | Builds, tests and extends the .NET solution ([setup.md](setup.md)) |

Statements every presentation of the system must keep:

- The clinical content of the cases has **not been reviewed by a physician**. The data file says so (`reviewed: false`)
  and a test pins it (`The_clinical_content_is_reported_as_not_reviewed_by_a_physician`).
- The system does not diagnose or treat real patients and must not be presented as doing so.
- This is a prototype: accounts, sessions and the consoles' records are kept in one browser; the sign-in is not a
  security boundary ([decision 0008](decisions/0008-no-database-and-no-authentication-in-this-phase.md)).

## Functional requirements

### Access

| ID | Requirement | Checked by |
|---|---|---|
| FR-1 | One sign-in for everyone, by e-mail only (no password in this phase). The e-mail decides the account: Nabd's administration, a university's staff or student (by its domain and roster), or an independent trainee | `One_sign_in_for_everyone_and_the_email_decides`; walk `seats` |
| FR-2 | An e-mail with no account and on no roster goes to registration with the e-mail filled in and a note (D-59) | `The_trainees_application_is_its_own_bundle_and_stylesheet`; walk `rules-of-entry` |
| FR-3 | A university's domain off its roster is refused with a message naming the university | walk `seats` (B) |
| FR-4 | Registration is one step: name, e-mail, the track (chosen, never pre-selected) and the year of study (D-57, D-58). An e-mail that has an account signs in to it and overwrites nothing | `Registration_asks_no_section_code_and_no_password`; walk `seats`, `qa4` |
| FR-5 | Three demo buttons on the sign-in screen open the three consoles: Nabd's administration, a university administrator, a supervisor | `Every_id_the_legacy_client_reads_is_in_the_screen_once` |
| FR-6 | A visitor who asks for a signed-in page is sent to the sign-in screen; sign-out returns to the landing page; the browser's Back button moves between the application's views and never signs the user out or in | walk `seats` (C), `qa4` |

### The trainee's application

| ID | Requirement | Checked by |
|---|---|---|
| FR-7 | The home: the hero with the trainee's own facts (level, last session, sessions, weakest axis), «ماذا ستفعل الآن؟» by track, the ER card, the training sections (marked «قريباً»), the academic part for a university student, the coach's card | `The_home_keeps_every_id_its_scripts_fill_and_its_sections_are_honest`; walk `seats` |
| FR-8 | Before the first session, the hero's main action is «ابدأ أول حالة» on every screen (V7) | walk `rules-of-entry` |
| FR-9 | The header: home, training sections, the academic section (university students only), my reports, the clinical coach | `Everyone_signs_in_directly_and_only_a_universitys_student_sees_the_academic_part` |
| FR-10 | The sidebar keeps the locked rooms (respiratory room, specialty cases) visible with «قريباً»; they do not open (D-61) | walk `seats` (C) |
| FR-11 | Reports: every saved session is listed with its mark, verdict, axes, errors by severity, timeline and the supervisor's review when published | `A_real_session_reaches_the_supervisor_and_comes_back_to_the_student`; walk `chain` |
| FR-12 | The clinical coach: reads the saved reports, names the gaps, offers a guided drill (scripted, «كبار السن مع سكري وضغط») and the real case to try next; a gap closes after the drill and a later case without the same error (D-50 to D-52). Demo data on the coach page follows Nabd's setting «بيانات عرض في صفحة المدرب» (V7) | `The_clinical_coach_reads_the_trainees_reports_and_comes_last`; walk `cp` |
| FR-13 | The profile: the trainee's card, level (an estimate from the year; the level quiz is for later, D-60), recent sessions, skills by axis, repeated errors, the supervisor's note (university students), a printable record with a serial, and «بياناتي» (name, track, year, photo; read-only for a university student) | walk `qa4` |
| FR-14 | «تقرير آخر جلسة» opens the room's report of this visit, or the saved reports in the profile | `The_shell_keeps_history_guards_the_consoles_and_opens_the_right_case` |

### The emergency room

| ID | Requirement | Checked by |
|---|---|---|
| FR-15 | Six cases: asthma, sepsis, pulmonary embolism, STEMI, DKA, hypertensive emergency; chosen by id (an assignment, the coach) or at random | `The_file_gives_six_cases_and_the_shared_catalog` |
| FR-16 | The role in the room is the trainee's track: medicine plays the doctor, nursing the nurse. There is no switch at the briefing for a trainee; a console account trying the room keeps it (D-57) | walk `rules-of-entry` |
| FR-17 | The approved room (conversation, monitor, orders, tests, deterioration, handover, report) is unchanged to the byte | `The_approved_emergency_room_is_unchanged` |
| FR-18 | The realism layer (interruptions, alarm colour and pulse tone, the intervention window, a short briefing summary; dose hints for years 1 and 2) can be switched off by Nabd's administration, which restores the approved room as it is | `The_er_realism_mode_is_a_switchable_layer_over_the_room` |
| FR-19 | The assessment layer: the doctor's rubric (safety 35, assessment 15, diagnosis 10, tests 10, team 15, handover 15) and the nurse's; errors by severity, a critical error fails the case; objectives on a timeline; reassessment; help (senior, intensive care); the handover graded by content and checked against the monitor; a reflection; the pass mark of the university for the student's year | `The_er_assessment_layer_rides_on_the_same_switch`; walk `assess` |
| FR-20 | The nurse calls the doctor in a box over the chat (SBAR); tests not in the case's list get a realistic reply | walk `call` |
| FR-21 | A case asked for (an assignment, the coach) replaces a case that was never started; a case under way is kept and the trainee is told (D-56) | `The_shell_keeps_history_guards_the_consoles_and_opens_the_right_case` |

### The consoles

| ID | Requirement | Checked by |
|---|---|---|
| FR-22 | Nabd's administration: overview, institutions, users and roles, subscriptions, case library and review, sources, scoring rules, audit log, settings (realism switch, coach demo data, demo reset) | `The_console_is_reached_through_a_demo_account_and_starts_hidden`; walk `seats` (G) |
| FR-23 | A university chooses among Nabd's cases and never writes one; it manages courses, sections, staff, the roster, pass marks per year and its supervisors' permissions | `The_university_manages_its_own_people_and_cannot_write_cases`; walk `seats` (F) |
| FR-24 | A supervisor works inside his sections and his university's settings: assignments, students, results; an override keeps both numbers and needs a written reason; a critical error is waived only with a reason | `The_supervisor_works_inside_his_sections_and_the_universitys_settings`; walk `chain` |
| FR-25 | Every delete asks twice, in place | `Deleting_asks_twice_in_place` |
| FR-26 | A console account sent to a trainee's page returns to its console | walk `seats` (E) |

### The server

| ID | Requirement | Checked by |
|---|---|---|
| FR-27 | `GET /`, `/login`, `/register` render the page; `/js/{bundle}.js` joins the client fragments; `/data/{name}.json` serves only the four named data files | `Data_that_the_application_does_not_name_cannot_be_asked_for` |
| FR-28 | `POST /api/er-chat` relays the room's message to the understanding service through the application layer (same origin, size limit, rate limit); `GET ?ping=1` checks it without calling a model | `UnderstandingEndpointTests` |
| FR-29 | A server-side session API (start, advance, interventions, harmful orders, tests, completion, report) exists and is tested; it is off by default and not called by the room yet | `SimulationSessionsApiTests` |
| FR-30 | The site's images are named in `images.json`; views write keys | `ImageCatalogTests` |

## Clinical simulation rules that must not change

These rules are pinned by the golden masters. A change to any of them fails the test run on purpose
([decision 0004](decisions/0004-clinical-core-pinned-by-golden-masters.md)). The golden-master test is
`ErClinicalTraceTests.Domain_model_reproduces_the_legacy_trace`, run for 45 recorded scenarios of the legacy `er.js`. It
requires exact equality of every number after every step. The unit tests in `Domain/SimulationSessionTests.cs` state
each rule on its own.

The pinning proves equality with the legacy code. It does not prove that a rule is clinically correct.

| Rule | Domain member | Test |
|---|---|---|
| Untreated, the risk rises at the rate of the case (sepsis: starts at 46, gains 3 per simulated minute) | `SimulationSession.NetRiskRate`, `Tick` | `Untreated_risk_rises_at_the_rate_of_the_case` |
| One call advances at most two seconds of simulated time | `SimulationSession.Tick` | `One_call_never_advances_more_than_two_seconds` |
| The stage follows the risk across the case's thresholds; a stage change raises a `StageChanged` event | `ClinicalCase.StageAt`, `SimulationSession.Stage` | `The_stage_follows_the_risk_up_and_the_cuff_measures_when_the_patient_gets_sick` |
| The cuff measures every 2 simulated minutes, every minute once the patient is sick | `SimulationSession.TakeCuffReading`, `Cuff` | same test |
| A treatment slows the risk only after its onset | `SimulationSession.ApplyIntervention` | `A_treatment_slows_the_risk_only_after_its_onset` |
| Oxygen raises the saturation gradually and never above 99 | `SimulationSession.CurrentVitals` | `Oxygen_raises_the_saturation_gradually_and_never_above_99` |
| The same oxygen flow again adds nothing; a higher flow adds a share | `SimulationSession.ApplyIntervention` | `The_same_oxygen_flow_again_adds_nothing_and_a_higher_flow_adds_a_share` |
| Supportive care holds a septic patient; only the antibiotic turns the case round | `ApplyIntervention`, `NetRiskRate` | `Supportive_care_holds_a_septic_patient_but_only_the_antibiotic_turns_him_round` |
| The risk never falls below the floor of 20 | `SimulationSession.RiskFloor` | `Risk_never_falls_below_the_floor_of_the_resuscitation_room` |
| A harm raises the risk a moment after the order and is not counted as a step done | `SimulationSession.ApplyHarm`, `HarmfulOrders` | `A_harm_raises_the_risk_a_moment_after_the_order_and_is_not_a_step_done` |
| Anaphylaxis stops short of arrest, does not settle by itself, and adrenaline treats it | `ApplyHarm`, `Anaphylaxis` | `Anaphylaxis_stops_short_of_arrest_and_adrenaline_treats_it` |
| A test that is safe at first becomes harmful once the untreated systolic pressure is below 90, and adds 6 to the risk | `SimulationSession.OrderTest`, `UntreatedSystolicPressure` | `A_test_that_is_safe_at_first_becomes_harmful_once_the_pressure_has_fallen` |
| Ordering the same test twice keeps the first order | `SimulationSession.OrderTest` | `Ordering_the_same_test_twice_keeps_the_first_order` |
| At a risk of 100 the patient arrests, the session ends and time stops | `Tick`, `Outcome`, `PatientArrested` | `At_a_risk_of_100_the_patient_arrests_and_the_session_ends` |
| A handover is stable only below the first threshold with every key step done | `SimulationSession.HandOver` | `A_handover_is_stable_only_below_the_first_threshold_with_every_key_step_done` |
| A dangerous destination fails the session whatever the score | `SessionScorer.JudgeDestination`, `Judge` | `A_dangerous_destination_fails_the_session_whatever_the_score` |
| An order for something the catalog does not have is a domain error | `DomainException` | `An_order_for_something_the_catalog_does_not_have_is_a_domain_error` |
| Ventricular tachycardia and shock, the planned collapse, and supportive care held until the cause is treated | `SimulationSession` (VT, collapse, hold) | The three rescue traces in `ErClinicalTraceTests` |
| The score is out of 100 in six parts: safety 40, diagnosis 15, tests 15, history 10, communication 10, handover 10 (read from `SessionScorer.Score`) | `SessionScorer.Score` | The final score and the six parts in every trace. A changed scoring weight failed 12 of 45 traces in the mutation check |
| The pass mark is 70, and these fail a session whatever its score: cardiac arrest, dangerous destination, a harm of risk 8 or more, a missed key step, untreated VT, untreated collapse, untreated anaphylaxis, no test ordered, a wrong diagnosis graded by the service | `SessionScorer.PassMark`, `Judge`, `FailureReason` | The verdicts in every trace; `A_well_managed_case_is_handed_over_stable_and_passes` |
| The same case with the same inputs gives the same numbers (the arithmetic order of the legacy code is kept) | `Numbers.Round`, `Numbers.Clamp` | All 45 traces |

A mutation check was run when the tests were written: one changed model constant failed 33 of 45 traces
([decision 0004](decisions/0004-clinical-core-pinned-by-golden-masters.md)).

Rules that are not pinned by a golden master (they are preserved only because the browser code is unchanged): the
nurse role's score, order safety (dose checks, allergy, "too early"), reading of the trainee's text, the
conversation, the respiratory room, the coach, the professor portal.

## Non-functional requirements

| ID | Requirement | How it is met |
|---|---|---|
| NFR-1 | Clean Architecture: Domain depends on nothing; Application on Domain only; Infrastructure never on Web; controllers take no infrastructure type; exactly five projects | `LayeringTests` |
| NFR-2 | No unused code: no view, script function, stylesheet rule or image that nothing uses (V7) | the clean-up method in [decision 0021](decisions/0021-v7-clean-release.md); `ImageCatalogTests` |
| NFR-3 | The approved emergency room is protected: its script and stylesheet are fingerprinted | `The_approved_emergency_room_is_unchanged` |
| NFR-4 | Each part of the client keeps to its own elements: the consoles' and the trainee's stylesheets start from their own views; the room's layer from `#view-er.nbp-on`; `admin.js` and `app.js` never reach the rooms' chat | `AdminConsoleTests` |
| NFR-5 | One store for the browser's records (`NabdStore`); nothing else in the new client reads the storage | `The_trainees_application_is_its_own_bundle_and_stylesheet` |
| NFR-6 | The designed regions of the page (headers, landing, home, sign-in, footer) change only through an approved snapshot | `Each_designed_region_is_its_approved_snapshot`; `tools/approve-regions.mjs` |
| NFR-7 | Arabic, right to left; desktop 1440 and phone 390 without sideways scrolling, broken images or script errors | walk `seats` at both sizes |
| NFR-8 | No secret in the repository or the client; the paid understanding service is off in Development | [setup.md](setup.md) |
| NFR-9 | Data files are reachable only by name; source fragments cannot be requested | `Only_the_shipped_data_files_can_be_read`, `Data_that_the_application_does_not_name_cannot_be_asked_for` |
| NFR-10 | Stated gap: the browser downloads the case file (diagnoses, expected steps, scoring hints), so a trainee could read it. Closing it means moving the room to the server | [architecture.md](architecture.md), "The seams to the server" |
| NFR-11 | Limits on the server's endpoints: JSON objects only, 64 KB bodies, same-origin, per-caller rate limits; the session API caps sessions and drops idle ones | `UnderstandingEndpointTests`, `SimulationSessionsApiTests`, `ReviewFindingsTests` |
| NFR-12 | Errors reach the caller as problem documents without stack traces; protective headers on every response | `ReviewFindingsTests` |
| NFR-13 | The build treats warnings as errors; public members are documented | `Directory.Build.props` |
| NFR-14 | The golden masters are deterministic and replay without Node.js, a browser or the network | `ErClinicalTraceTests` |
| NFR-15 | `dotnet test` runs in seconds, in memory | 207 tests |

## Constraints of this phase

No database and no server identity ([0008](decisions/0008-no-database-and-no-authentication-in-this-phase.md));
the room runs in the browser and the server's session API stays off ([0007](decisions/0007-server-session-api-off-by-default.md));
the multi-agent system is contracts only ([0009](decisions/0009-multi-agent-contracts-only.md)); the approved room
changes only by the owner's decision ([docs/prototype-constraints.ar.md](prototype-constraints.ar.md)).

## Open items

The product's open items, the owner's decisions and the quality gaps are kept in one place:
[next-phase-backlog.md](next-phase-backlog.md).
