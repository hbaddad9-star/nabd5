# Setup

## What you need

| Tool | Version used | Needed for |
|---|---|---|
| .NET SDK | 10.0 (`global.json` rolls forward within 10.0) | Building, testing and running the application |
| Node.js | 22 or later | Only for the browser walks (`tools/qa`) and approving region snapshots (`tools/approve-regions.mjs`) |
| Google Chrome or Microsoft Edge | any recent | Only for the browser walks |

No database, no container and no secret is needed to build, test or run.

## Build, test, run

From the repository root:

```
dotnet restore Nabd.sln
dotnet build Nabd.sln
dotnet test Nabd.sln
dotnet run --project src/Nabd.Web --launch-profile http
```

The page is at <http://localhost:5054>. `GET /healthz` answers `ok`.

Warnings are errors in every project. Public members need XML documentation in every project except the tests.

## Configuration

Settings live in `src/Nabd.Web/appsettings.json`, overridden by `appsettings.Development.json` and by environment
variables (`Section__Key`).

| Setting | Default | Meaning |
|---|---|---|
| `UnderstandingServices:ErRoom:Enabled` | `true`; **`false` in Development** | Whether the ER room may reach its understanding service. Off, the room runs in its offline mode |
| `UnderstandingServices:ErRoom:Endpoint` | the service's URL | Where the service is |
| `UnderstandingServices:ErRoom:TimeoutSeconds` | `20` | How long to wait for it |
| `UnderstandingServices:ErRoom:Origin` | empty (the endpoint's own origin) | The `Origin` header sent to the service; see decision 0006 |
| `Claude:Enabled` | `false` | **Claude as the room's understanding service** (agent decision D-67). On, with a key, it replaces the relay above. The key is read from the `ANTHROPIC_API_KEY` environment variable or a secret store (`Claude:ApiKey`), never from a file of the repository |
| `Claude:ReaderModel` / `Claude:VoiceModel` | `claude-opus-5-5` | The model that reads and grades, and the model that voices the people; a smaller one (for example `claude-haiku-5-5`) for the voices is faster and cheaper |
| `Claude:TimeoutSeconds` | `7` | One Claude call; a turn is a read then a voice and the room gives up after 15 seconds |
| `RateLimits:UnderstandingPerMinute` | `40` | Requests per minute, per caller address, to `/api/er-chat` |
| `RateLimits:SimulationPerMinute` | `240` | The same, for the session API |
| `RateLimits:SimulationStartsPerMinute` | `6` | Sessions one caller address may start per minute |
| `Simulation:Sessions:MaximumSessions` | `500` | Sessions kept in memory at once |
| `Simulation:Sessions:IdleMinutes` | `120` | Minutes after which an untouched session is dropped |
| `Simulation:ServerSessionsApi:Enabled` | `false`; **`true` in Development** | Whether `/api/simulation/sessions` exists |
| `CaseData:RootPath` | empty (the folder shipped with the application) | Where the case data files are read from |

### The understanding service costs money

Each turn in the room with its service switched on calls a paid model. That is why the service is **off in
Development**. Switch it on locally only on purpose:

```
UnderstandingServices__ErRoom__Enabled=true dotnet run --project src/Nabd.Web
```

The application holds no model key. The key lives in the service's environment and must never be copied into this
repository, its settings or its logs.

## Working on the code

- **Where to write what** (which folder, which stylesheet, the store, images): see
  [prototype-constraints.ar.md](prototype-constraints.ar.md), section 4, and [architecture.md](architecture.md).
- **Client scripts** are under `src/Nabd.Web/ClientScripts/<bundle>/`, each folder with a `README.md`. The application
  joins them on first request, so restart it after editing a fragment. The order is `bundles.json`.
- **The approved room** (`er/`, `css/er.css`) is fingerprinted; changing it is the owner's decision. Its additions go
  in `erplus/` and `css/er-plus.css`.
- **Images** are named in `src/Nabd.Web/images.json` ([image-library/README.ar.md](image-library/README.ar.md)).
- **Data.** The case files are under `src/Nabd.Infrastructure/CaseData/Files/`. A change to a case is a clinical change:
  it needs a physician's review and fails the golden masters on purpose.
- **Designed regions.** After an intended change to a header, the landing, the home, the sign-in screen or the footer,
  run `node tools/approve-regions.mjs` with the site running and commit the snapshots with the change.
- **Line endings.** Text is stored with line feeds (`.gitattributes`); the bundler and the tests normalise them.

## Tools

| Tool | Purpose |
|---|---|
| `tools/qa/seats.mjs`, `tools/qa/rules-of-entry.mjs` | Browser walks: every seat on every screen; the rules of entry ([tools/qa/README.md](../tools/qa/README.md)) |
| `tools/approve-regions.mjs` | Records the approved snapshots of the designed regions from a running site |

## Deployment notes

- The application is an ordinary ASP.NET Core process. It needs a host that runs .NET; static hosting such as
  GitHub Pages cannot run it.
- Behind a reverse proxy, configure forwarded headers so that the same-origin check sees the real host and the
  per-caller rate limit sees the real client address. Until it is configured, every user behind the proxy counts as
  one caller.
- Before real users: real identity, a database, and closing the stop-gap of decision 0006.
- `dotnet publish` was not exercised yet.
