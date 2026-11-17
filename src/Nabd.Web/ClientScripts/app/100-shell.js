  /* ==========================================================================================================
     100 · shell: the sidebar's labels, the browser's history, the views closed to console accounts, the last report.
     Installs the third (outermost) wrapper of showOnlySection.
     ========================================================================================================== */
  /* ---------- 6. the sidebar ---------- */
  function sidebar() {
    const nav = byId('sidebar-app-nav');
    if (!nav) return;
    nav.setAttribute('data-no-terms', '');
    nav.querySelectorAll('.v7-item span').forEach(s => { if (/الـ ?ER/.test(s.textContent)) s.textContent = s.textContent.replace(/الـ ?ER/g, 'غرفة الطوارئ'); });
    nav.querySelectorAll('.v7-item').forEach(b => {
      const locked = b.classList.contains('er-locked'), mine = b.querySelector('.v7-tag[data-nbx-soon]');
      if (!locked) { if (mine) mine.remove(); return; }
      const tag = b.querySelector('.v7-tag');
      if (tag) tag.textContent = 'قريباً';
      else { const t = document.createElement('span'); t.className = 'v7-tag'; t.setAttribute('data-nbx-soon', ''); t.textContent = 'قريباً'; b.appendChild(t); }
    });
  }

  /* ---------- 1, 2, 4, 7. views and the browser's history ---------- */
  let popping = false, last = null;
  const CLOSED = ['university', 'debrief', 'profile', 'coach'];
  const showBeforeShell = window.showOnlySection;
  window.showOnlySection = function (viewId) {
    if (isConsole() && CLOSED.includes(viewId)) { navigateTo('home'); return; }
    showBeforeShell(viewId);
    if (viewId !== last) {
      if (viewId !== 'er') { try { if (last === null || popping) history.replaceState({ nbView: viewId }, ''); else history.pushState({ nbView: viewId }, ''); } catch (e) {} }
      last = viewId;
    }
    const u = user();
    sidebar();
    photo(u);
    if (viewId === 'profile') { profile(); setTimeout(profile, 150); }
    // «تقرير آخر جلسة»: the room opens the report of this visit; without one, the saved reports in the profile
    if (viewId === 'debrief' && u && u.role === 'student') setTimeout(() => {
      let cur = ''; try { cur = currentView; } catch (e) {}
      if (cur !== 'debrief') return;
      navigateTo('profile');
      setTimeout(() => { const first = document.querySelector('#nbx-runs-profile details'); if (first) { first.open = true; window.scrollTo({ top: first.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' }); } }, 200);
    }, 0);
  };
  window.addEventListener('popstate', e => {
    popping = true; setTimeout(() => { popping = false; }, 0);
    let cur = ''; try { cur = currentView; } catch (err) {}
    if (cur === 'er') return; // the room's own handler closes its sheet or goes home
    if (e.state && e.state.nbER) return;
    const u = user();
    // an entry without a view is the page as it was loaded (the sign-in pages rewrite it): for a signed-in user, his home
    const v = (e.state && e.state.nbView) || (u ? 'home' : '');
    if (!v) return;
    if (!u && v !== 'index') return;
    if (u && v === 'index') return;
    if (v === 'coach' && window.NabdCoachDrill && !isConsole()) window.NabdCoachDrill.open();
    else navigateTo(v === 'admin' ? 'home' : v);
  });

  setTimeout(() => { try { sidebar(); photo(user()); } catch (e) {} }, 0);
  window.NabdShell = Object.freeze({ profile });
