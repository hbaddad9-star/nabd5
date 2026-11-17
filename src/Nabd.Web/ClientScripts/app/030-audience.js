  /* ==========================================================================================================
     030 · audience: what each trainee sees. The academic part is a university student's; the header, the sidebar
     and the profile follow. Installs the first wrapper of showOnlySection (applyAudience after every view change).
     ========================================================================================================== */
  /* ---------- what each trainee sees: the academic part only for a university's student ---------- */
  const uniStudent = u => { if (!u || u.role !== 'student') return false; if (u.org) return true; try { return !!nb8UserSection(u); } catch (e) { return !!u.cohort; } };
  function affiliation(u, uni) {
    const view = byId('view-profile');
    if (!view) return;
    let box = byId('nbx-aff');
    if (!u || u.role !== 'student') { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('section'); box.id = 'nbx-aff'; box.className = 'nbx-aff'; box.setAttribute('data-no-terms', ''); view.insertBefore(box, view.firstChild); }
    const esc = C.esc;
    if (!uni) {
      box.innerHTML = `<div class="nbx-aff-head"><span class="nbx-aff-tag">حساب فردي</span><h2>تتدرّب بشكل مستقل</h2></div>
        <p>غرف التدريب وسجلّك وتقاريرك كلها لك. القسم الجامعي (الشعبة والواجبات والمشرف) يظهر لطلاب الجامعات المتعاقدة عند الدخول ببريدهم الجامعي.</p>`;
      return;
    }
    let who = { kind: 'none' };
    try { who = Un.whois(u.email); } catch (e) {}
    const sec = who.kind === 'student' && who.section ? who.section.name : (u.cohortName || '');
    let count = 0;
    count = window.NabdStore.assignments().filter(a => a && a.section === u.cohort).length;
    box.innerHTML = `<div class="nbx-aff-head"><span class="nbx-aff-tag is-uni">القسم الجامعي</span><h2>${esc(u.uni || '')}</h2></div>
      <dl><div><dt>الشعبة</dt><dd>${esc(sec || 'لم تُحدَّد')}</dd></div><div><dt>المشرف</dt><dd>${esc((who.kind === 'student' && who.supervisor) || 'لم يُعيَّن')}</dd></div><div><dt>واجبات مسندة</dt><dd>${C.n(count)}</dd></div></dl>
      <button type="button" data-nbx-aff-go>واجباتي الجامعية</button>`;
  }
  // the sidebar's coach item is the legacy page's, locked: for a student it is opened here
  function coachSide(student) {
    const item = [...document.querySelectorAll('#app-sidebar .v7-item')].find(b => /المدرب السريري/.test(b.textContent || ''));
    if (!item) return;
    if (student) { item.classList.remove('er-locked'); item.removeAttribute('aria-disabled'); item.removeAttribute('tabindex'); item.setAttribute('data-nbx-coach-side', ''); }
    else if (item.hasAttribute('data-nbx-coach-side')) { item.classList.add('er-locked'); item.setAttribute('aria-disabled', 'true'); item.setAttribute('tabindex', '-1'); item.removeAttribute('data-nbx-coach-side'); }
  }

  function applyAudience() {
    let u = null;
    try { u = authState.isAuthenticated ? authState.user : null; } catch (e) {}
    const student = !!u && u.role === 'student', uni = uniStudent(u), hide = student && !uni;
    ['home-quick-uni-btn', 'app-nav-uni', 'home-student-uni-section'].forEach(id => { const el = byId(id); if (el) el.style.display = hide ? 'none' : ''; });
    const side = byId('side-uni-portal-btn');
    if (side && side.parentElement) {
      side.parentElement.style.display = hide ? 'none' : '';
      const title = side.parentElement.querySelector('p'), label = [...side.querySelectorAll('span')].pop();
      if (title) title.textContent = uni ? 'القسم الجامعي' : 'المسار الجامعي';
      if (label) label.textContent = uni ? 'واجباتي الجامعية' : 'الجلسات الجامعية';
    }
    affiliation(u, uni);
    runs(u, uni);
    meFacts(u);
    setTimeout(() => { try { meFacts(u); } catch (e) {} }, 250); // after the legacy client has drawn the level
    const rep = byId('app-nav-reports'); if (rep) rep.style.display = student ? '' : 'none';
    const cb = byId('app-nav-coach'); if (cb) cb.style.display = student ? '' : 'none';
    coach(u);
    coachSide(student);
  }
  const showBeforeAudience = window.showOnlySection;
  window.showOnlySection = function (viewId) { showBeforeAudience(viewId); try { applyAudience(); } catch (e) {} };
  window.NabdAccess = Object.freeze({ apply: () => { try { applyAudience(); } catch (e) {} }, uniStudent });
  document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('[data-nbx-aff-go]')) { try { navigateTo('university'); } catch (err) {} } });
  setTimeout(() => { try { applyAudience(); } catch (e) {} }, 0);
