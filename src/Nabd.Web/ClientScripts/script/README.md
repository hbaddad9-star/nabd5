# script.js — the application shell

The browser receives these files joined in the order below as `/js/script.js` (`bundles.json`). They are the shell
the rest of the client stands on: the account and session, the sign-in screen, view navigation, the sidebar, the
profile, the student's academic part and the home by track. v7 removed everything of the old client that nothing used
(the old simulation, the nursing room, the level quiz, the old coach, the professor portal; [ADR 0021](../../../../docs/decisions/0021-v7-clean-release.md)).

The new code (`admin/`, `app/`, `erplus/`) wraps a few of these functions and never edits them: `showOnlySection`,
`navigateTo`, `loginWithAccount`, `saveAccountToStorage`, `getAccountFromStorageOrDefault`, `authState`,
`renderProfileView`, `showToast`.

| File | Responsibility |
|---|---|
| `070-demo-accounts.js` | `DEMO_ACCOUNTS`: the demo accounts the consoles extend (the supervisor `doctor`, the students the university's roster knows) |
| `090-session-state.js` | The views that need a signed-in user, the storage keys, `authState`, `currentView` |
| `100-local-storage-store.js` | `localStorage` with an in-memory fallback; accounts by id |
| `120-session-utilities.js` | `showToast`, the Arabic name of a role |
| `130-auth-shell-ui.js` | `syncAuthShellUI`: the headers, sidebar and welcome card after sign-in or sign-out |
| `140-view-navigation.js` | `navigateTo` (the signed-in guard) and `showOnlySection` |
| `150-auth-session-modal.js` | Sign-in with an account, demo sign-in, sign-out, the sign-in screen open and closed |
| `220-registration-role-cards.js` | Registration's track cards (one pressed at a time) |
| `230-level.js` | The trainee's level: an estimate from the year (`nbDerivedLevel`, `NB_LEVELS`) |
| `240-cohorts.js` | `NB_COHORTS`: the demo sections |
| `370-image-fallback.js` | `nbImgFail`: a placeholder when a picture fails to load |
| `390-track.js` | `nbTrackOf`: an account's track (medicine or nursing) |
| `470-home-track.js` | `renderHomePath`: the home's welcome line by track and «ماذا ستفعل الآن؟» |
| `500-auth-modal-steps.js` | Switching the sign-in screen between sign-in and registration |
| `510-sidebar-and-account-menu.js` | The sidebar and the account menu |
| `660-profile-view-render.js` | `renderProfileView`: the profile's card, history and printable record |
| `670-profile-dashboard.js` | The profile's dashboard tab (level, recent sessions) and its tabs |
| `770-academic-foundation.js` | The student's academic part: storage of assignments, the ER cases' labels, helpers |
| `780-academic-role-guide.js` | `nb8RenderGuide`: «ماذا ستفعل الآن؟» for the trainee's track |
| `790-academic-student-view.js` | The student's section and its assignments on the home |
| `810-academic-render.js` | `nb8RenderAcademic`: draws the student's academic part |
| `820-academic-init.js` | A result not yet published cannot be opened |
| `830-app-init-and-listeners.js` | `initNabdApp`: restores the session and binds the headers, sidebar, profile and sign-in screen |
| `840-app-bootstrap.js` | Runs `initNabdApp` once the page is ready |
