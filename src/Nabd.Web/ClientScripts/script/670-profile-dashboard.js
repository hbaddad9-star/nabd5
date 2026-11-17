    function nbDateOf(h) { return h.date || (h.ts ? new Date(h.ts).toISOString().slice(0, 10) : '--'); }

    function renderProfileDash(u) {
      const dashBtn = document.querySelector('[data-ptab="dash"]');
      const isProf = u.role === 'professor';
      dashBtn?.classList.toggle('hidden', isProf);
      if (isProf) { document.getElementById('profile-pane-dash')?.classList.add('hidden'); return; }
      const $ = id => document.getElementById(id);
      // level: an estimate from the year and the sessions (the level quiz is for later, decision log D-60)
      const lv = NB_LEVELS[nbDerivedLevel(u)];
      $('dash-level').innerHTML = `<span class="nb-level ${lv.cls}">${lv.name}</span><p class="nb-dsub">تقدير من سنتك الدراسية وجلساتك.</p>`;
      // recent
      const rec = (u.history || []).slice(0, 5);
      $('dash-recent').innerHTML = rec.length ? rec.map(h => `<div class="nb-li"><span class="nb-sc">${h.num != null ? h.num + '%' : h.score}</span><div><b>${h.caseTitle}</b><small>${nbDateOf(h)} · ${h.mode}</small></div></div>`).join('') + '<button type="button" class="nb-mini" id="dash-hist-go">كل السجل</button>' : '<p class="nb-dsub">لا جلسات بعد.</p>';
      $('dash-hist-go')?.addEventListener('click', () => switchProfileSubTab('history'));
    }

    function switchProfileSubTab(ptab) {
      ['dash', 'overview', 'history', 'certificate', 'settings'].forEach(t => {
        document.getElementById('profile-pane-' + t)?.classList.toggle('hidden', t !== ptab);
      });
      document.querySelectorAll('.profile-tab-btn').forEach(btn => {
        const isCurrent = btn.getAttribute('data-ptab') === ptab;
        btn.className = isCurrent
          ? 'profile-tab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-teal-700 text-white focus-ring'
          : 'profile-tab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 focus-ring';
      });
    }

