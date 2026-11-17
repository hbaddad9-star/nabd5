/* The browser store (V6.11, 2026-11-18; docs/architecture.md, "What the browser keeps").
   The prototype has no database: what the consoles and the trainee's application save is kept in this browser.
   This is the one place that reads and writes it. Every other script asks here, so the day the server stores
   these records, this file becomes the API client and nothing else changes.

   What is kept, and who owns it:
   - console     localStorage "nabd_v2_admin"          the consoles' state: institutions, users, rules, each
                                                       university's sections, staff, roster, policy, published
                                                       results, overrides, ratings, notes (admin/010, 020, 030)
   - assignments localStorage "nabd_v2_assignments"    the assignments a student's home reads (the legacy client's
                                                       own key; the consoles mirror theirs into it)
   - accounts    localStorage "nabd_v2_accounts_map"   every account that signed in on this device, with its
                                                       sessions and saved reports (the legacy client's own key)
   - session     sessionStorage                        this visit only: the console's page, the realism switch
   The legacy client keeps its own keys (the signed-in account, the placement, the notes); they are not touched. */
(function () {
  'use strict';
  const KEYS = Object.freeze({ console: 'nabd_v2_admin', assignments: 'nabd_v2_assignments', accounts: 'nabd_v2_accounts_map' });
  const read = (key, fallback) => { try { const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); } catch (e) { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; } };
  window.NabdStore = Object.freeze({
    KEYS,
    /* the consoles' state, or null when nothing was saved yet */
    consoleState: () => read(KEYS.console, null),
    saveConsoleState: state => write(KEYS.console, state),
    /* the assignments the student's home reads */
    assignments: () => { const list = read(KEYS.assignments, []); return Array.isArray(list) ? list : []; },
    saveAssignments: list => write(KEYS.assignments, list),
    /* every account kept on this device, by id (the legacy client's own store when it is there) */
    accounts: () => {
      try { if (typeof safeStorageGet === 'function' && typeof STORAGE_KEYS !== 'undefined') return safeStorageGet(STORAGE_KEYS.ACCOUNTS_MAP, {}) || {}; } catch (e) {}
      return read(KEYS.accounts, {}) || {};
    },
    /* this visit only */
    session: Object.freeze({
      get: key => { try { return sessionStorage.getItem(key); } catch (e) { return null; } },
      set: (key, value) => { try { sessionStorage.setItem(key, value); } catch (e) {} }
    })
  });
})();
