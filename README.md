# نَبْض الأردن — Nabd 7

An Arabic clinical-simulation platform for medical and nursing students. A trainee manages an emergency patient in a
chat-driven room: talks to the patient and the relative, works with the nurse or the doctor, reads the monitor, orders
tests, hands over, and gets a detailed report. A university subscribes, organises its students and supervisors and
chooses among Nabd's cases; a supervisor reviews and approves his students' sessions.

> **Training prototype.** The clinical content of the cases has **not been reviewed by a physician**. The system does
> not diagnose or treat real patients and must not be presented as doing so. Accounts and records are kept in the
> browser in this phase; there is no server identity yet.

**Start with [docs/HANDOVER.ar.md](docs/HANDOVER.ar.md)** (the handover guide, in Arabic): what works, how to run it,
the demo accounts, where to change what. What changed in this release: [CHANGELOG.md](CHANGELOG.md).

## Quick start

```
dotnet build Nabd.sln
dotnet test Nabd.sln
dotnet run --project src/Nabd.Web --launch-profile http
```

Then open <http://localhost:5054>. Requires the .NET 10 SDK. In Development the paid understanding service is
switched off and the room runs in its offline mode ([docs/setup.md](docs/setup.md)).

## Layout

```
Nabd.sln
src/
  Nabd.Domain/           the clinical simulation model (no dependencies)
  Nabd.Application/      use cases and ports
  Nabd.Infrastructure/   case data, session store, the understanding-service gateway
  Nabd.Web/              MVC: controllers, Razor views, client scripts (nine bundles), images.json, static assets
tests/
  Nabd.Tests/            architecture, domain, golden masters, application, infrastructure, web and client tests (207)
tools/
  qa/                    browser walks: every seat on every screen, the rules of entry
  approve-regions.mjs    records the approved snapshots of the designed regions
docs/
```

## Documentation

| Document | Content |
|---|---|
| [docs/HANDOVER.ar.md](docs/HANDOVER.ar.md) | **The handover guide** (Arabic) |
| [docs/prototype-constraints.ar.md](docs/prototype-constraints.ar.md) | The prototype's design constraints: what is not touched, honesty, identity, where to write what, the gate of every change (Arabic) |
| [docs/delivery-report.ar.md](docs/delivery-report.ar.md) | The delivery report: what was done, the self-critique, recommendations, the owner's decisions (Arabic) |
| [docs/architecture.md](docs/architecture.md) | The projects, the client's bundles, what the browser keeps, the seams to the server, security |
| [docs/requirements.md](docs/requirements.md) | What the system must do and keep, and where each requirement is checked |
| [docs/workflows.md](docs/workflows.md) | User journeys and system flows |
| [docs/testing-strategy.md](docs/testing-strategy.md) | The tests, what protects what, the browser walks, how v7 was verified |
| [docs/setup.md](docs/setup.md) | Tools, commands, configuration, deployment notes |
| [docs/data-catalog.md](docs/data-catalog.md) | Every data file and stored key: content, readers, exposure |
| [docs/ui-design-system.md](docs/ui-design-system.md) | Tokens, typography, components, stylesheets, design rules |
| [docs/image-library/README.ar.md](docs/image-library/README.ar.md) | The images: how to change one, what exists, what is still needed (Arabic) |
| [docs/agent/er-agent.ar.md](docs/agent/er-agent.ar.md) | The ER agent's specification and numbered decision log (Arabic) |
| [docs/demo-script.ar.md](docs/demo-script.ar.md) | The demo script for the committee (Arabic) |
| [docs/next-phase-backlog.md](docs/next-phase-backlog.md) | What is open: the product, the owner's decisions, quality |
| [docs/decisions/](docs/decisions/) | Architecture decision records |

## Ground rules

- No secret in this repository, in client code, or in a response.
- The approved emergency room (`ClientScripts/er/`, `css/er.css`) changes only by the owner's decision; its additions are
  layers in `erplus/`. A test fingerprints it.
- Designed regions (headers, landing, home, sign-in, footer) change through approved snapshots (`tools/approve-regions.mjs`).
- No unused code: a view, function, rule, image or data file that nothing uses is removed ([decision 0021](docs/decisions/0021-v7-clean-release.md)).
- Images are named in `src/Nabd.Web/images.json`; credits are in `src/Nabd.Web/wwwroot/img/CREDITS.txt` and
  `img/landing/CREDITS.md`; the Arabic font's licence is `src/Nabd.Web/wwwroot/fonts/noto-sans-arabic/LICENSE.md`.
