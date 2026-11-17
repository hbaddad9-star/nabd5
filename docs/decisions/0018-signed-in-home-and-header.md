# 0018. The signed-in home and header in the owner's order, the nurse's call box (V6.9.3)

- Status: accepted (2026-11-17)
- Builds on: ADR 0014 (the signed-in home), ADR 0016 and 0017 (the ER room's layers); decisions D-37 to D-43 in
  `docs/agent/er-agent.ar.md`

## Context

The owner chose among the models shown on 2026-11-17:

- **The call with the doctor:** model A, a call box over the chat.
- **Tests the room does not have:** to be answered as a colleague would.
- **The home:** the trainee first, then "what to do now", the emergency room, his numbers.
- **The header:** the platform's main sections rather than its rooms. Home alone, then the academic section and
  the rest; the clinical coach last, to be reworked later.
- **The training sections:** without the emergency room, which has its own card.

## Decision

**The ER room** (`ClientScripts/erplus/030-call-and-tests.js`), a layer on the realism switch like ADR 0016:
- **The call box.** In the nurse's room, from the room's "اتصلتَ بالدكتور …" until the doctor reaches the bed
  (or "إنهاء المكالمة"), the doctor's lines and what the trainee says to him move into a box over the chat, with
  the doctor's name and the call's time; the room below goes on.
- **Talking to the doctor.** While the call is open the trainee writes to the doctor: his line is addressed to
  the doctor by name before the room reads it, so the room hands it to the doctor. A chip («إلى: د. …» /
  «إلى: الغرفة») switches back to the room.
- **Hidden, not removed.** The moved lines stay in the room's feed, hidden, so the room's own code and record
  are untouched.
- **Tests the catalogue does not have:**
  - A follow-up test (ESR, vitamin D, B12, iron, HbA1c, lipids, thyroid): "not an emergency test".
  - An MRI: "not available from the ED now", with the CT head offered.
  - A test that is not among the case's (pancreatic enzymes, blood group, stool, sputum): "not among this
    case's tests".
  - The nurse answers in the doctor's room, the instructor in the nurse's.
  - When nothing else in the message is a test or an order, the room does not read it (it used to answer
    "ما لقطت الطلب" and, in the nurse's room, read «فيتامين د» as a call to the doctor).
  - When the rest is a real test (the CRP of "ESR و CRP"), the room takes it and the missing one is answered
    after.

**The home** (region `home`, approved snapshot):
- The hero's four facts are the student's own: his last session, his sessions, his average, his weakest axis
  (filled by admin.js; anyone else keeps the platform's facts).
- The order is set from `home-v66.css`'s layer over `home9.css`: welcome, professor section, "ماذا ستفعل الآن",
  the ER card, the progress band, the university block, the sections.
- The sections list loses the emergency room card and the "المتاح الآن" filter. "الطوارئ والحالات الحرجة"
  becomes "العناية الحرجة" (eleven sections, all being prepared).

**The header** (new region `app-header`, approved snapshot):
- The order is الرئيسية · غرفة الطوارئ · أقسام التدريب · القسم الأكاديمي (university students only) · تقاريري
  (students) · المدرب السريري (last, still locked).
- The legacy ids stay. `#app-nav-cases` remains hidden by `scope.css`.
- `#app-nav-fields` and `#app-nav-reports` are bound by admin.js.
- The nav is `data-no-terms`, so «غرفة الطوارئ» is not replaced by «الـ ER».

## Consequences

- A trainee's message during the call carries the doctor's name in the room's record ("دكتور سامر، …"), as a
  phone call does.
- The test replies are a fixed list until the agent reads any test (D-39); the misread of «د» elsewhere stays in
  the legacy reader.
- The professor and the admin keep the platform's facts on the hero; the reports link is for students.
- `LandingV6Tests`: the sections are eleven, none open, and no section opens the room (the ER card does).

## Addendum: V6.9.4, the clinical coach (2026-11-17)

The owner: the coach comes last on the home, and the header leads to it; "what to do now" must not be the last
section. The coach (`040-access.js`, styled in `admin-v67.css` under `#view-home .nbx-coach`, a prefix the guard
now allows) is appended to the home with `order: 8`, after the sections. It reads the student's saved reports:
- his average and the direction of his last sessions (the last three against the three before);
- his last six scores as bars;
- his weakest axis;
- the errors that came back (the same step or error across sessions, deadlines and dose figures set aside);
- one exercise for the next case, from the most repeated error or else the weakest axis;
- a button to repeat the case with his lowest last score, a new case, or his reports.

The header's «المدرب السريري» is no longer locked; it, and the sidebar's coach item (unlocked at run time for a
student), scroll to the coach. Professors and admins see neither the coach nor its button. The legacy coach view
stays removed (`REMOVED_VIEWS`). Decision D-44.

The home now reads: the trainee (his facts) · what to do now · the emergency room · his level · his
assignments · the sections · the coach.

## Evidence

- Headless Chrome, 1440 x 900:
  - **The call:** the SBAR, the doctor's orders, the allergy question and the answer all in the box. Back to the
    room by the chip. The box closes when the doctor arrives, and "إنهاء المكالمة" ends it by hand.
  - **The test replies:** vitamin D, MRI, ESR with CRP, and amylase, in the doctor's room; vitamin D in the
    nurse's room, with no call to the doctor.
  - **The home:** the order is as above. A new student's facts read "لم تبدأ بعد"; after a case, his last
    session, average and weakest axis.
  - **The header:** each kind of user sees the right buttons. «أقسام التدريب» scrolls to the sections and
    «تقاريري» opens the profile at the reports.
- `dotnet test`: 226 passed.
