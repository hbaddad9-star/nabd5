# 0016. The ER room's realism mode (V6.8)

- Status: accepted (2026-11-16)
- Builds on: ADR 0015 (consoles); the ER room as it stands (`ClientScripts/er`, legacy `er.js`)

## Context

The owner wants the emergency room to feel like one: a trainee who is pressed, distracted and must still keep
the patient alive. His points, in his words reduced to a list:

1. Danger the trainee sees and hears: the colour turns red and the pulse sound changes as the patient worsens.
2. Interruptions from the family and the team, talking over each other. The goal is to see whether the trainee
   absorbs an angry relative, keeps his head, and does not let the patient die because he was flustered.
3. A short card that says what he is going to do, instead of a long briefing that everyone skips.
4. Time pressure that is felt, without telling him "you have 20 minutes".
5. Dose suggestions ("بقترح non-rebreather 15 L، ماشي؟") only for first and second years; none from the fourth
   year on.
6. The current look of the room is approved: changes are light, shown first as a model, and the approved version
   must stay available to go back to.

## Decision

A **layer over the room, switchable, never inside it**:

- `ClientScripts/erplus/010-realism.js` (bundle `js/er-plus.js`, loaded after the room) and `css/er-plus.css`.
  The legacy room is not edited. The layer reads the room through its own hook (`window.__nbER`), adds elements
  next to the room's own, and writes each interruption into the room's chat record so that the patient and the
  family "know" it happened.
- Every style rule starts from `#view-er.nbp-on`; the class is set only while the mode is on.
- **Switch.** On by default. Nabd's administration turns it off (platform settings, "غرفة الطوارئ: وضع
  الواقعية"), or `?realism=off` in the address for the visit (`?realism=on` turns it back on). Off, the room is
  exactly the reference version: no class, no added element, the dose suggestions restored.
- **Reference version.** Git tag `er-room-reference-2026-11-16` marks the room and its chat as approved.

What the mode does:

1. **Summary card.** The briefing opens on "ملخصك قبل الدخول": role, who is in the room, three steps, and a warning
   that the family and the team may interrupt. "التعليمات الكاملة" unfolds the original briefing unchanged.
2. **Intervention window.** Beside the clock, a bar labelled "نافذة التدخل" with three states (الوقت معك، يضيق،
   تدخّل الآن). It drains with the patient's risk and, more slowly, with time, and refills when he improves. It
   never shows a number of minutes.
3. **Danger.** Urgent: an amber glow around the monitor. Critical: a pulsing red glow, a red edge around the
   screen and a red clock. With the room's sound on, a pulse tone beats with the heart rate and its pitch falls
   with the saturation (as a real pulse oximeter does), turning harsher when critical; the room's own alarm tones
   are unchanged.
4. **Interruptions.** On the room's clock: a relative who bursts in, the triage nurse asking for the doctor at
   another bed, an angry companion (once the patient is worse), the laboratory on the phone about a sample's
   label, and a relative who wants to film. In the nurse's room: a relative asking for water, another patient's
   bell, an angry relative asking for the doctor, the laboratory. When the monitor turns critical the family
   panics. Asking the family to wait outside (the room's own rule for stepping out) stops the family's lines.
5. **After the handover.** "إدارة الضغط والمقاطعات" on the report: each interruption, whether he answered it
   (calming, deferring, confirming the patient's identity, refusing water) within two turns, and whether care
   went on. A training note; the score is unchanged.
6. **Dose hints by year.** For a trainee in year 3 or above, the case's dose suggestions are withheld for the
   session, so the nurse asks "mask ولا nasal، وعلى كم لتر؟" instead of proposing. Years 1 and 2 keep them.

## Consequences

- The room's scoring, chat engine and case data are untouched; turning the mode off restores everything.
- The interruptions are scripted lines, the same for every case, not generated; a physician should review them
  with the cases.
- The response check is keyword-based (Arabic phrases for calming, deferring, identity, refusing water); it can
  miss a correct answer worded differently. It is shown as a training note, not graded.
- The pulse tone needs the room's sound to be switched on (a browser rule: sound starts after a press).

## Evidence

- Headless Chrome, 1440 x 900: mode on (summary shown, four briefing sections folded, window drains to
  "تدخّل الآن" at critical risk, red edge on, family panic line, interruptions in the chat and in the chat
  record, report panel after a real handover); year 4 nurse asks the oxygen device and flow, year 2 nurse
  proposes it; mode off (`?realism=off`): no class, no added element, no interruption, suggestions restored.
- `dotnet test`: the new `AdminConsoleTests` check that the mode is switchable, that hints follow the year, and
  that every style rule waits for the mode's class.
