# 0017. The ER room's assessment layer (V6.9)

- Status: accepted (2026-11-16)
- Builds on: ADR 0016 (the realism mode); the owner's decisions in `docs/agent/er-agent.ar.md`

## Context

After the realism mode the room was reviewed from four seats: trainee, academic supervisor, trainer and
competitor. The owner's answers, reduced to a list:

1. The doctor's grading was weaker than the nurse's. It must be the stricter one.
2. Errors are to be ranked by how dangerous they are and what was done, not all charged a few marks.
3. The handover changes with the case; that will be the model's work. Its rules are settled in the document now.
4. Asking for help gets an orderly place in the room (senior, intensive care, breathing, resuscitation).
5. The model will drive unexpected events and the variation between runs; the decisions go in the document.
6. Every proposal for the academic supervisor is accepted, to be built in turn.
7. Every proposal for the trainer's report is accepted, laid out professionally.
8. Scoring will come from the model reading every word; keyword rules stand in until then.

The review itself was wrong on two points, corrected here: the room already failed a case on a harmed patient, a
missed key step, an untreated arrhythmia or a dangerous destination (`520-conclude-report.js`), and already took
"call the senior" and "call ICU" as typed orders. What was missing was a dose's severity, an orderly way to ask,
and everything listed below.

## Decision

A second fragment in the realism mode's bundle, `ClientScripts/erplus/020-assessment.js`, on the **same switch**
and the same rule as ADR 0016: the legacy room is not edited (its bundle is pinned byte for byte by
`LegacySiteBaselineTests`), and with the mode off the room's own score and report stand.

The layer reads the room's state through `window.__nbER`, and the realism layer's through `window.__nbPlus`.
After the room renders its report, the layer re-scores the doctor's run from the six parts the room computed and
rewrites the report's head, its parts, and the saved result.

**The doctor's rubric (100):**

| Axis | Max | From |
|---|---|---|
| Safety and critical actions | 35 | the room's safety part, rescaled from 40 |
| Assessment and reassessment | 15 | the room's history part (10) + reassessment (5) |
| Diagnosis | 10 | the room's diagnosis part, rescaled from 15 |
| Investigations | 10 | the room's tests part, rescaled from 15 |
| Communication and team | 15 | the room's communication part (10) + help in time (3) + interruptions (2) |
| Handover and destination | 15 | graded by content (9) + right destination (6) − invented claim (4) |

**New measures:**

- *Reassessment.* Treatments given within a minute of each other form a round. A round is reassessed when, in the
  three simulated minutes after it, the trainee asks the room how the patient is, repeats the blood pressure or
  the temperature, or examines again.
- *Help in time.* Calling the senior (or ICU, or surgery) by the case's own deadline: 3; late: 1.5; not called
  when the case needed it: 0.
- *Handover by content.* Six checks: the patient's identity and problem; the background (a disease name alone is
  the situation, not the background); two readings at least that match the monitor at handover (age, durations
  and doses set aside); a treatment that was really given; the allergy; a plan.
- *Errors by severity.* Critical (fails the case whatever the number): the room's own list, plus a dose of three
  times the upper limit or more. Major: a dose out of range, an unsafe order the nurse stopped, a late key step,
  an invented claim. Minor: an unneeded test, jargon with the family.
- *Pass mark.* The university's, for the student's year (`policy.passMarks`, set in the university's settings);
  70 otherwise.

**In the room:** a "طلب مساعدة" button beside the composer (doctor's room) opens a short menu: the senior on
call, intensive care, respiratory support, the resuscitation team, and surgery when the case has it. The choice
is sent through the room's own message intake, so the room handles it as a typed order.

**In the report**, in order: two reflection questions before the score (saved with the result, skippable); the
score and verdict; the critical errors; the case's objectives with the expected time against the trainee's; the
errors by severity; the handover checklist; the pressure panel of ADR 0016; the timeline. The nurse's report
gets the reflection and the timeline; its score is the room's own for now.

**In the consoles:** the university's settings carry a pass mark for each study year. The supervisor's result
file shows the verdict against it, a timeline, the student's reflection, an overall rating (1 to 5), and a mark
override that needs a written reason and keeps both numbers; it can be undone, and is closed once the result is
published.

## Consequences

- ADR 0016 said the interruptions were a training note outside the score. They now count for 2 of the 15
  marks of "communication and team" in the doctor's room.
- The saved result (the user's history) carries the new number, the verdict, the axes, the critical errors, the
  timeline and the reflection. The room's averages are recomputed the way the room computes them.
- All checks are keyword rules. They can miss a correct answer worded differently and will be replaced by the
  model's reading of the conversation; the scoring rules stay.
- The supervisor's timeline and reflection are repeatable demo records, like the results beside them. A trainee's
  real run reaches the supervisor when the server stores sessions.
- Not built yet, and listed in the document: the nurse's rubric on the new weights, the handover dialogue that
  changes with the destination (a receiver who reads back with one error and asks two questions), unexpected
  events, and case variants. These wait for the model and the case-authoring template.

## Addendum: fixes after the second review (same day)

A second pass from the same four seats, run in the browser, found faults in this layer:

- **An overdose the nurse stopped failed the case.** The room records a wrong dose at the order, before the nurse
  challenges it; the layer took that as given. Now only a dose that reached the patient is critical (three
  times the limit or more); one the nurse stopped is a major "near miss", said as such in the report.
- **Help options that did the same thing.** The room tells apart two calls (the senior, ICU). "Respiratory
  support" and "the resuscitation team" both became "ICU", and the code team could be called for a calm patient.
  The menu now offers the senior, ICU, surgery when the case has it, and the resuscitation team only once the
  monitor is urgent or critical.
- **Two pass marks for one student.** The room read the student's year, the supervisor's console read a year
  from the section's name (which never carries one), so the console always used 70. Both now read the year
  from the course number (NUR-401 is a fourth-year course), the room falling back to the student's year.
- **The rules page said 40 / 15 / 15 / 10 / 10 / 10 "applied in the room today".** It now shows the rubric the
  room applies (35 / 15 / 10 / 10 / 15 / 15) under the same names as the report; a demo store still on the old
  defaults moves to the new ones, edited weights stay.
- **The report said things twice.** The room's own lists repeated the timed steps, the destination, the wrong
  doses and the stopped orders that the objectives table and the errors box now carry; those items are removed
  from the room's lists while the mode is on. An empty errors box is one line. A help request is one row of the
  timeline, not two.
- **Medicines before the allergy question went unseen.** Now a major error (−3 on safety), and the handover's
  allergy line counts only if the allergy was asked during the case.

## Addendum: V6.9.1 (2026-11-17), the session is kept and goes round

The owner, after the review: what is for the agent goes into one document so it is not forgotten when the agent
is built (`docs/agent/er-agent.ar.md`, a numbered decision log D-01 to D-33 with each decision's status, the case
template, the session record, the agent's output shape and how the agent itself is tested); everything else is
built now. Most important: what a competitor would see. A student who plays a case, signs out, and opens the
supervisor's portal found nothing: the portal showed demo records only, and an old report could not be opened.

**The chain, without a server.** The legacy client keeps accounts in the browser
(`nabd_v2_accounts_map`), and an account's history survives signing out and in. The layer now writes the whole
report into the history entry (`detail`: duration, diagnosis written and right, destination, errors by
severity, objectives, handover checklist, reassessment, help; plus the axes, critical errors, timeline and
reflection). The supervisor's console reads the accounts of the students on its roster and shows each of their
sessions as a "real session" (first in the table, tied to an assignment or marked free practice, with the
student's own axes, handover text, checklist, timeline and reflection). Its review is stored under the key
`live:<roster id>:<timestamp>`; the student's home (university block) and profile list his reports, open each
one, and show where the supervisor stands: waiting, or approved with the final mark, the rating and the note.
With a server the same records move to the database. The demo supervisor (t2) now follows both demo students'
sections; the medicine course's coordinator still sees his.

**Grading decisions applied** (D-07 to D-10, D-27, D-29, D-30 in the document):
- A missed key step is critical only when it saves life now (a provisional list until the physician marks each
  step) or its time had passed; handed over before its time, it is major.
- Fewer than two of the case's red-flag facts fails the case.
- Points for "nothing to fail" (no interruption, help not needed) only for a patient handed over alive.
- High-flow oxygen left on a saturation of 99% or more is a minor error.
- The supervisor may strike out a critical error with a written reason (the rules read words and can be
  wrong).
- The student sees the room's automatic mark at once; the approved mark, the note and the rating after
  publishing.

**Report:** a verdict chip and "/100", the last attempt at the same case (improved or not), the psychological
safety line in the summary card, the objectives as cards and the timeline without an inner scroll on a phone,
arrow keys in the help menu. The nurse's run keeps its seven parts and its verdict in the history (`nurse-v1`),
so it reaches the supervisor too.

## Evidence

- Headless Chrome, 1440 x 900 and 390 x 844: a careful run (help menu, reassessment 2 of 2, handover 15 of 15,
  score 82, passed); a careless run (magnesium 20 g, eight times the limit: critical, not passed; the handover
  "مريضة 23 سنة عندها ربو بدي عناية" loses the background, the readings, the treatments and the allergy); mode
  off (the room's own report, no button, no added element); nurse's room (reflection and timeline, the room's
  score); arrest.
- `dotnet test`: `The_er_assessment_layer_rides_on_the_same_switch`.
