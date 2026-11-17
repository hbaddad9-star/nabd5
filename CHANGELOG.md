# Changelog

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
