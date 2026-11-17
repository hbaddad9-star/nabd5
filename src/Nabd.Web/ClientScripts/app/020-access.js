  /* ==========================================================================================================
     020 · access: sign-in and registration enter directly; the e-mail decides the account (ADR 0015, sixth addendum).
     ========================================================================================================== */
  const valid = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  // tone 'info' draws a note instead of an error (the move from sign-in to registration is not a mistake)
  const say = (id, text, tone) => { const b = byId(id); if (!b) return; b.textContent = text || ''; b.classList.toggle('hidden', !text); if (tone) b.dataset.tone = tone; else delete b.dataset.tone; };
  const initials = name => { const p = String(name).split(' ').filter(Boolean); return p.length >= 2 ? p[0][0] + ' ' + p[1][0] : String(name).slice(0, 2); };
  const FRESH = {
    isDemo: false, stats: { completed: 0, avgSpec: 'لا توجد بعد', avgEr: 'لا توجد بعد' },
    strengths: ['حساب جديد: تظهر نقاط القوة هنا بعد أولى جلساتك.'], weaknesses: ['لا توجد ملاحظات قبل إجراء الجلسات.'],
    recommendations: ['ابدأ بغرفة الطوارئ، ثم راجع تقرير أدائك.'], history: []
  };

  /* ---------- the account an e-mail opens ---------- */
  function build(email, name, track, year) {
    const who = Un.whois(email);
    if (who.kind === 'blocked') return { error: who.why };
    if (who.kind === 'admin') return { acc: JSON.parse(JSON.stringify(DEMO_ACCOUNTS.admin)) };
    const id = 'local_' + email.replace(/[^a-z0-9]/g, '_');
    let stored = null;
    try { stored = getAccountFromStorageOrDefault(id) || null; } catch (e) { stored = null; }
    let base;
    if (who.kind === 'staff') {
      const t = who.staff, x = who.org, top = t.role === 'uadmin';
      if (t.status !== 'active') { t.status = 'active'; C.save(); }
      base = { name: t.name, uni: x.name, org: x.id, role: top ? 'uniadmin' : 'professor', roleNameAr: Un.ROLE[t.role][0], specialty: top ? 'إدارة الجامعة' : 'الإشراف الأكاديمي',
        roleLabel: `${Un.ROLE[t.role][0]} · ${x.name}`, track: null, year: null, cohort: null, cohortName: null };
    } else if (who.kind === 'student') {
      const x = who.org, sec = who.section || {}, med = !!who.course && /الطب/.test(who.course.track || '');
      Un.markRegistered(x, who.student);
      Un.bridge(x);
      // V6.10: a university student's year is his course's (NUR-401 is a fourth-year course)
      const cy = who.course && /(\d)\d\d/.exec(who.course.code || '');
      base = { name: who.student.name || name || (stored && stored.name) || email.split('@')[0], uni: x.name, org: x.id, role: 'student', roleNameAr: 'طالب جامعي', specialty: med ? 'الطب' : 'التمريض',
        track: med ? 'medicine' : 'nursing', year: (cy && Number(cy[1]) >= 1 && Number(cy[1]) <= 6 ? Number(cy[1]) : 0) || (stored && stored.year) || 4, cohort: sec.legacy || null, cohortName: sec.name || null, roleLabel: `طالب جامعي · ${sec.name || ''} · ${x.name}` };
    } else {
      const med = track ? track === 'medicine' : !!(stored && stored.track === 'medicine');
      base = { name: name || (stored && stored.name) || email.split('@')[0], uni: 'حساب فردي', org: '', role: 'student', roleNameAr: 'متدرّب مستقل', specialty: med ? 'الطب' : 'التمريض',
        track: med ? 'medicine' : 'nursing', year: year || (stored && stored.year) || 4, cohort: null, cohortName: null, roleLabel: `متدرّب مستقل · ${med ? 'الطب' : 'التمريض'}` };
    }
    const acc = Object.assign({}, JSON.parse(JSON.stringify(FRESH)), stored || {}, base, { id, email, initials: initials(base.name), isDemo: false });
    try { saveAccountToStorage(acc); } catch (e) {}
    return { acc };
  }

  /* ---------- sign-in and registration enter directly ---------- */
  { const f = byId('auth-pane-login'); if (f) f.noValidate = true; } // an empty password is not stopped by the browser either
  document.addEventListener('submit', e => {
    const f = e.target;
    if (!f || f.id !== 'auth-pane-login') return;
    e.preventDefault(); e.stopImmediatePropagation();
    const email = String((byId('login-email') || {}).value || '').trim().toLowerCase();
    say('login-error-msg', '');
    if (!valid(email)) { say('login-error-msg', email ? 'هذا البريد غير صحيح. مثال: name@example.com' : 'اكتب بريدك الإلكتروني.'); return; }
    // V6.11 (owner): an e-mail that has no account and is on no university's roster does not enter as a guess
    // (a name made from the address, the nursing track): it goes to registration, where the trainee says who he is
    let known = null, kind = 'none';
    try { known = getAccountFromStorageOrDefault('local_' + email.replace(/[^a-z0-9]/g, '_')); kind = Un.whois(email).kind; } catch (err) {}
    if (!known && kind === 'none') {
      const tab = byId('auth-tab-register');
      if (tab) tab.click();
      const re = byId('reg-email'); if (re) re.value = email;
      say('reg-error-msg', 'لا يوجد حساب بهذا البريد بعد. اكتب اسمك واختر مسارك وسنتك لننشئه.', 'info');
      const rn = byId('reg-name'); if (rn) rn.focus();
      return;
    }
    const r = build(email, '', '');
    if (r.error) { say('login-error-msg', r.error); return; }
    loginWithAccount(r.acc, `أهلاً بك، ${r.acc.name}.`, 'home');
  }, true);
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('#reg-next-btn') : null;
    if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const name = String((byId('reg-name') || {}).value || '').trim(), email = String((byId('reg-email') || {}).value || '').trim().toLowerCase();
    const on = document.querySelector('#reg-rolecards [data-rc].is-on');
    say('reg-error-msg', '');
    if (!name) { say('reg-error-msg', 'اكتب اسمك الكامل.'); return; }
    if (!valid(email)) { say('reg-error-msg', email ? 'هذا البريد غير صحيح. مثال: name@example.com' : 'اكتب بريدك الإلكتروني.'); return; }
    // V6.10: an e-mail that already has an account signs in to it; its name, track and record are not overwritten
    let had = null;
    try { had = getAccountFromStorageOrDefault('local_' + email.replace(/[^a-z0-9]/g, '_')); } catch (err) { had = null; }
    // V6.11 QA: the track is chosen once and decides the role in the room (D-57), so it is never pre-selected: a
    // new independent trainee picks it (a university's student takes his course's track)
    let kind = 'none'; try { kind = Un.whois(email).kind; } catch (err) {}
    if (!had && kind === 'none' && !on) { say('reg-error-msg', 'اختر مسارك: طالب طب أو طالب تمريض. المسار يحدد دورك في غرفة الطوارئ.'); const rc = byId('reg-rolecards'); if (rc) rc.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    const year = Math.max(1, Math.min(6, Number((byId('reg-year') || {}).value) || 4));
    const r = had ? build(email, '', '') : build(email, name, on && on.dataset.rc === 'medicine' ? 'medicine' : 'nursing', year);
    if (r.error) { say('reg-error-msg', r.error); return; }
    loginWithAccount(r.acc, had ? `لهذا البريد حساب، وقد دخلت إليه: ${r.acc.name}.` : `تم إنشاء حسابك، ${r.acc.name}.`, 'home');
  }, true);
