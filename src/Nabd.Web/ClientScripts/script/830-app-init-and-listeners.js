    function initNabdApp() {
      if (window.__nabdInitialized) return;
      window.__nabdInitialized = true;

      const savedUserId = safeStorageGet(STORAGE_KEYS.ACTIVE_USER_ID, null);
      const storedUserObj = savedUserId ? getAccountFromStorageOrDefault(savedUserId) : null;
      const savedUserObj = storedUserObj && !storedUserObj.isDemo ? storedUserObj : null;
      if (storedUserObj?.isDemo) safeStorageRemove(STORAGE_KEYS.ACTIVE_USER_ID);

      if (savedUserObj) {
        authState.isAuthenticated = true;
        authState.user = savedUserObj;
        syncAuthShellUI();
        navigateTo('home');
      } else {
        authState.isAuthenticated = false;
        authState.user = null;
        syncAuthShellUI();
        navigateTo('index');
      }

      // Global Escape key handler
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeSidebar();
          closeAccountDropdown();
          closeAuthModal();
        }
      });

      // Close account dropdown when clicking outside
      document.addEventListener('click', (e) => {
        const menu = document.getElementById('account-dropdown-menu');
        const btn = document.getElementById('user-menu-btn');
        if (menu && btn && !menu.classList.contains('hidden')) {
          if (!menu.contains(e.target) && !btn.contains(e.target)) {
            closeAccountDropdown();
          }
        }
      });

      // Public Header & Index CTAs (Login & Register Buttons)
      document.getElementById('public-brand-btn')?.addEventListener('click', () => navigateTo('index'));
      document.getElementById('public-login-btn')?.addEventListener('click', () => openAuthModal('login'));
      document.getElementById('public-register-btn')?.addEventListener('click', () => openAuthModal('register'));

      document.querySelectorAll('[data-demo-login]').forEach(btn => {
        btn.addEventListener('click', () => nbDemoLogin(btn.dataset.demoLogin));
      });

      // App Header Navigation (Signed-In)
      document.getElementById('app-brand-btn')?.addEventListener('click', () => navigateTo('home'));
      document.getElementById('app-nav-home')?.addEventListener('click', () => navigateTo('home'));
      document.getElementById('app-nav-uni')?.addEventListener('click', () => navigateTo('university'));
      document.getElementById('app-nav-coach')?.addEventListener('click', () => navigateTo('coach'));
      document.getElementById('app-open-sidebar-btn')?.addEventListener('click', openSidebar);
      document.getElementById('user-menu-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAccountDropdown();
      });

      // Emergency Room Launchers
      const launchRandomER = () => {
        if (!authState.isAuthenticated || !authState.user) {
          openAuthModal('login', 'يرجى تسجيل الدخول أولاً لدخول غرفة الطوارئ.');
          return;
        }
        window.nbOpenER();
      };
      document.getElementById('app-nav-er')?.addEventListener('click', launchRandomER);
      document.getElementById('side-er-btn')?.addEventListener('click', launchRandomER);
      document.getElementById('launch-er-random-btn')?.addEventListener('click', launchRandomER);
      document.getElementById('foot-er-btn')?.addEventListener('click', launchRandomER);

      // Account Dropdown Menu Items
      document.querySelectorAll('.dropdown-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetView = btn.getAttribute('data-drop-view');
          const ptab = btn.getAttribute('data-profile-tab');
          closeAccountDropdown();
          navigateTo(targetView);
          if (targetView === 'profile' && ptab) {
            switchProfileSubTab(ptab);
          }
        });
      });
      document.getElementById('dropdown-switch-demo-btn')?.addEventListener('click', () => {
        closeAccountDropdown();
        openAuthModal('login');
      });
      document.getElementById('dropdown-logout-btn')?.addEventListener('click', logoutUser);

      // Sidebar Controls & Links
      document.getElementById('close-sidebar-btn')?.addEventListener('click', closeSidebar);
      document.getElementById('sidebar-backdrop')?.addEventListener('click', closeSidebar);
      document.querySelectorAll('.guest-side-link').forEach(link => {
        link.addEventListener('click', () => closeSidebar());
      });
      document.getElementById('side-guest-login-btn')?.addEventListener('click', () => openAuthModal('login'));
      document.getElementById('side-guest-register-btn')?.addEventListener('click', () => openAuthModal('register'));

      document.querySelectorAll('.side-app-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.getAttribute('data-side-app');
          navigateTo(target);
        });
      });
      document.getElementById('side-uni-portal-btn')?.addEventListener('click', () => navigateTo('university'));
      document.getElementById('side-switch-demo-btn')?.addEventListener('click', () => openAuthModal('login'));
      document.getElementById('side-logout-btn')?.addEventListener('click', logoutUser);

      // Home Quick Buttons & Professor/Student Home Sections
      document.getElementById('home-quick-profile-btn')?.addEventListener('click', () => navigateTo('profile'));
      document.getElementById('home-quick-er-btn')?.addEventListener('click', launchRandomER); // mobile audit 2026-11-07
      document.getElementById('home-quick-uni-btn')?.addEventListener('click', () => navigateTo('university'));

      // Profile Sub-tabs, Certificate Print & Settings
      document.querySelectorAll('.profile-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchProfileSubTab(btn.getAttribute('data-ptab')));
      });
      document.getElementById('profile-quick-open-cert-btn')?.addEventListener('click', () => {
        switchProfileSubTab('certificate');
      });
      document.getElementById('side-cert-btn')?.addEventListener('click', () => {
        navigateTo('profile');
        switchProfileSubTab('certificate');
      });
      document.getElementById('print-certificate-btn')?.addEventListener('click', () => {
        showToast('جارٍ فتح نافذة طباعة ملخص جلساتك التدريبية...');
        setTimeout(() => {
          try { window.print(); } catch (e) {}
        }, 150);
      });
      document.getElementById('settings-switch-demo-btn')?.addEventListener('click', () => openAuthModal('login'));

      // Auth form and account registration
      initAuthRoles();
      try { nb8Init(); } catch (e) { console.error(e); } // phase8 2026-11-07: academic portal
      document.getElementById('close-auth-modal-btn')?.addEventListener('click', closeAuthModal);
      // A tap on the dimmed area outside the box closes it too (only when the press also started there,
      // so selecting text in a field and releasing outside does not close the form).
      (() => {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;
        let downOnBackdrop = false, upOnBackdrop = false;
        modal.addEventListener('pointerdown', e => { downOnBackdrop = e.target === modal; });
        modal.addEventListener('pointerup', e => { upOnBackdrop = e.target === modal; });
        modal.addEventListener('click', e => { if (e.target === modal && downOnBackdrop && upOnBackdrop) closeAuthModal(); downOnBackdrop = upOnBackdrop = false; });
      })();
      document.getElementById('auth-tab-login')?.addEventListener('click', () => switchAuthModalTab('login'));
      document.getElementById('auth-tab-register')?.addEventListener('click', () => switchAuthModalTab('register'));

      // Footer App Links
      document.querySelectorAll('.foot-app-link').forEach(btn => {
        btn.addEventListener('click', () => navigateTo(btn.getAttribute('data-foot-app')));
      });

      // Toast Close
      document.getElementById('calm-toast-close')?.addEventListener('click', () => {
        document.getElementById('calm-toast')?.classList.add('hidden');
      });
    }
