# Testing strategy

Two kinds of checks: `dotnet test` (207 tests, in memory, a few seconds, no browser or network) checks what the server
sends and what the code computes; the browser walks in `tools/qa/` check what a person sees and does.

## The tests (`tests/Nabd.Tests`)

| Folder | Tests | What they hold |
|---|---|---|
| `Architecture/` | 10 | The five projects and the dependency rule of Clean Architecture (`LayeringTests`); the solution builds and starts (`SolutionSmokeTests`) |
| `Domain/` | 16 | The simulation session: vital signs, stages, treatments, harms, tests, arrest, scoring |
| `GoldenMasters/` | 46 | The domain model replays 45 recorded scenarios of the approved room's clinical core and must give the same state at every step (`ErClinicalTraceTests`) |
| `Application/` | 13 | The use cases: start, advance, order, complete, report |
| `Infrastructure/` | 14 | The case file and its mapping to the domain (`ErCaseFileMapperTests`); the gateway to the understanding service (`HttpUnderstandingServiceGatewayTests`) |
| `Web/` | 64 | The sign-in pages (`AccountPagesTests`); the site's assets (`SiteAssetsTests`); the image catalogue (`ImageCatalogTests`); the understanding endpoint and the session API; the security and error findings of the review (`ReviewFindingsTests`) |
| `Client/` | 44 | The browser code as the server joins it: the consoles, the trainee's application and the room's layers keep to their own elements and rules (`AdminConsoleTests`); the landing, the home and the sign-in screen keep their structure, honest wording, stylesheet isolation and size budgets (`LandingTests`) |

### What protects what

| Protection | Test | How to change it on purpose |
|---|---|---|
| The approved emergency room | `SiteAssetsTests.The_approved_emergency_room_is_unchanged`: SHA-256 of `/js/er.js` and `/css/er.css` (line feeds) | A change to the room is the owner's decision. Show it, then write the new fingerprints in the test |
| The designed regions (public header, signed-in header, landing, home, sign-in, footer) | `SiteAssetsTests.Each_designed_region_is_its_approved_snapshot` against `LandingBaseline/NAME.html` | Look at the change in the browser, run `node tools/approve-regions.mjs` with the site running, review the diff of the snapshots, commit them with the change |
| The clinical core | `ErClinicalTraceTests` (golden masters) | A clinical rule change fails them on purpose. Record new traces only for a reviewed clinical change and say so in the commit |
| The consoles never reach the rooms; one store; each stylesheet on its own elements | `AdminConsoleTests` | Keep new code in its folder (`admin/`, `app/`, `erplus/`) and its stylesheet |
| Images by key | `ImageCatalogTests` | Add the image to `images.json`; a view writes `@Img["key"]` |
| The layers of the solution | `LayeringTests` | Do not add a reference against the dependency rule |

## The browser walks (`tools/qa`)

| Walk | Covers |
|---|---|
| `seats.mjs` | Every seat on every screen: guest, sign-in edge cases, independent trainee, university student, supervisor, university administrator, Nabd's administration. On each screen: script errors, broken images, sideways overflow, an empty page |
| `rules-of-entry.mjs` | The owner's rules D-57 to D-60: unknown e-mail to registration, the year at registration, the role locked to the track, a supervisor keeps the role switch, the level quiz hidden |

Run them with the site running, at a desktop and a phone size ([tools/qa/README.md](../tools/qa/README.md)). A clean
run ends with `errors: []` and no ✗ line. They are not in CI (the runner would need a browser and a started site).

## How v7 was verified

The clean-up of v7 ([decision 0021](decisions/0021-v7-clean-release.md)) removed about 34,000 lines. It was checked
four ways, before and after:

1. **Coverage.** The walks ran with the browser's code coverage on, recording every function that ran; a fragment was a
   candidate only when none of its functions ran.
2. **References.** Nothing was removed while a live file still named it; tools listed the lookups of elements that no
   longer exist and the calls to functions that no longer exist, until both lists were empty. No named function in any
   bundle is left without a caller.
3. **Pixels.** A fixed set of screens (landing, sign-in, registration, home, profile, coach, room briefing, the three
   consoles) was captured at 1440 and 390 wide before and after the stylesheet clean-up: identical, apart from the
   room's random case.
4. **Behaviour.** The walks of the room (assessment, supervisor chain, nurse call, coach drill, profile) gave the same
   results as v6.11: the same marks, axes, errors, orders and records.

## What is not covered

- The understanding service itself (the relay is tested against a fake; the real service was not called by the tests).
- Browsers other than Chrome, real phones, screen readers and an automated accessibility audit.
- Load, concurrency, long uptime, and `dotnet publish` behind a reverse proxy.
- The walks are run by hand.
