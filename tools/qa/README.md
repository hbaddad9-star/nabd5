# Browser walks (QA)

Two walks through the running site in a headless Chrome, with no dependencies (Node 22+). They complement
`dotnet test`, which checks what the server sends; these check what a person sees and does.

| Walk | What it covers |
|---|---|
| `seats.mjs` | Every seat on every screen: guest (landing, sign-in, registration), sign-in edge cases (empty, invalid, a university domain off the roster, registration without a name or a track), the independent trainee (home, header, sidebar and its locked rooms, sections, reports, coach, profile tabs, the ER briefing and room, back button, sign-out), the university student (academic part, an assignment opens its case), the supervisor, the university admin and Nabd's admin (each console page). On each screen: script errors, broken images, sideways overflow, an empty page. Lines start with ✓ or ✗ |
| `rules-of-entry.mjs` | The owner's rules of V6.11 (decision log D-57 to D-60): an unknown e-mail goes to registration, the year is asked there, the role in the room is the track's and follows a change in «بياناتي», a supervisor keeps the role switch, the level quiz is hidden |

## Running

Start the site, then run a walk at a desktop and a phone size:

```bash
dotnet run --project src/Nabd.Web --launch-profile http
```

```bash
node tools/qa/seats.mjs qa-out 1440 900
```

```bash
node tools/qa/seats.mjs qa-out 390 844
```

Screenshots go to the folder given (`qa-out`, not committed). Each run uses a fresh browser profile in the system's
temp folder, so storage starts empty. `CHROME` sets the browser's path (Chrome or Edge); `NABD_HOST` the site's
address. A clean run ends with `errors: []` and no ✗ line.
