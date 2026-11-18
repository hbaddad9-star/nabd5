    // The views of the page. The coach's page is opened by app/070-coach-page.js (a plain navigation leads home);
    // 'debrief' opens the room's last report or, without one, the reports in the profile (app/100-shell.js);
    // 'university' leads a student to the assignments on the home (admin/010-admin-console.js).
    const PROTECTED_VIEWS = new Set(['home', 'debrief', 'coach', 'profile', 'university', 'er', 'or']);
    const REMOVED_VIEWS = new Set(['coach']);
    const STORAGE_KEYS = {
      ACTIVE_USER_ID: 'nabd_v2_active_user_id',
      ACCOUNTS_MAP: 'nabd_v2_accounts_map'
    };

    let authState = {
      isAuthenticated: false,
      user: null
    };

    let currentView = 'index';
