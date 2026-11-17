    /* Protected Navigation Guard */
    function navigateTo(viewId) {
      if (REMOVED_VIEWS.has(viewId)) viewId = 'home';
      const isAuth = Boolean(authState.isAuthenticated && authState.user);

      if (PROTECTED_VIEWS.has(viewId) && !isAuth) {
        currentView = 'index';
        showOnlySection('index');
        closeSidebar();
        openAuthModal('login', 'يرجى تسجيل الدخول للوصول إلى مساحة التدريب السريري.');
        try { history.replaceState(null, '', window.location.pathname); } catch (e) {}
        return false;
      }

      currentView = viewId;
      showOnlySection(viewId);
      // phase8 2026-11-07: assignments and notes may have changed since sign-in (same device, other account)
      if ((viewId === 'university' || viewId === 'home') && authState.user) { try { nb8RenderAcademic(authState.user); } catch (e) { console.error(e); } }

      document.querySelectorAll('.app-nav-btn').forEach(btn => {
        const bView = btn.getAttribute('data-app-view');
        const isActive = bView === viewId;
        btn.classList.toggle('active', isActive);
      });

      // the last report: the room shows the one of this visit; without one the shell opens the saved reports
      if (viewId === 'debrief' && window.nbErReport && window.nbErReport()) return;

      closeSidebar();
      closeAccountDropdown();

      window.scrollTo({ top: 0, behavior: 'smooth' });

      return true;
    }

    function showOnlySection(viewId) {
      ['index', 'home', 'coach', 'profile', 'er'].forEach(v => {
        const sec = document.getElementById('view-' + v);
        if (sec) sec.classList.toggle('hidden', v !== viewId);
      });
      const footer = document.getElementById('site-footer');
      if (footer) footer.classList.toggle('hidden', viewId === 'er');
      if (viewId === 'profile' && authState.user) { try { renderProfileView(); } catch (e) { console.error(e); } }
    }

