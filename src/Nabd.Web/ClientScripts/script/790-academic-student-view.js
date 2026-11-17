    /* ---------- the student's academic part on her home: her section and its assignments ---------- */
    function nb8RenderStudentUni(u) {
      const homeBox = document.getElementById('nb8-home-stu-uni');
      if (!homeBox) return;
      if (!u || nb8IsProf(u)) { homeBox.innerHTML = ''; return; }
      const sec = nb8UserSection(u);
      const coh = sec ? NB_COHORTS[sec] : null;
      const mine = sec ? nb8GetAssignments().filter(a => a.section === sec).sort((a, b) => (b.ts || 0) - (a.ts || 0)) : [];
      const today = new Date().toISOString().slice(0, 10);
      const card = (a, c) => {
        const L = nb8CaseLabel(c);
        const done = nb8AssignDone(u, a);
        const late = !done && a.due && a.due < today;
        return `<article class="nb8-as-card${done ? ' is-done' : ''}">
          <div class="nb8-as-top"><span class="nb8-chip">واجب</span>${a.due ? `<span class="nb8-due${late ? ' is-late' : ''}">${late ? 'انتهى موعد التسليم: ' : 'التسليم: '}${nb8Esc(nb8FmtDate(a.due))}</span>` : ''}</div>
          <h3>${nb8Esc(L.title)}</h3>
          ${L.line ? `<p class="nb8-arrival">${nb8Esc(L.line)}</p>` : ''}
          ${a.note ? `<p class="nb8-as-note"><b>ملاحظة المشرف:</b> <span data-no-terms>${nb8Esc(a.note)}</span></p>` : ''}
          ${done ? `<p class="nb8-done">أنجزت هذه الحالة بعد إسنادها: <span class="font-num">${nb8Esc(done.score || ((done.num != null ? done.num : '--') + '%'))}</span></p>` : ''}
          <button type="button" class="nb8-go focus-ring" data-nb8-open-case="${nb8Esc(a.caseId)}">${done ? 'أعد المحاولة في غرفة الطوارئ' : 'ابدأ الواجب في غرفة الطوارئ'} ←</button>
        </article>`;
      };
      const draw = (cases) => {
        const byId = {}; (cases || []).forEach(c => { byId[c.id] = c; });
        const secLine = sec
          ? `<div class="nb8-secline"><span>شعبتك</span><b dir="ltr">${nb8Esc(sec)}</b><small>${nb8Esc(coh ? coh.name : '')}</small>${u.cohort ? '' : '<span class="nb8-demo-tag">بيانات تجريبية للعرض</span>'}</div>`
          : '';
        const cards = mine.length
          ? `<div class="nb8-as-grid">${mine.map(a => card(a, byId[a.caseId])).join('')}</div>`
          : (sec ? '<p class="nb8-empty">لا توجد واجبات مسندة لشعبتك حالياً. يمكنك التدرّب في غرفة الطوارئ متى شئت.</p>' : '');
        if (homeBox) homeBox.innerHTML = secLine + cards;
      };
      draw(nb8CasesCache);
      if (mine.length && !nb8CasesCache) nb8LoadErCases().then(draw).catch(() => {});
    }

