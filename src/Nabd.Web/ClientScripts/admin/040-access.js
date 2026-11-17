/* Access (V6.7.7, 2026-11-16; docs/decisions/0015-admin-console-prototype.md, sixth addendum). The owner's
   structure for who enters and what he sees:
   - One sign-in and one registration for everyone, and it enters directly. In this prototype the browser does
     not check a password (there is no server to check it against); the e-mail decides where the person lands.
   - An e-mail on a university's roster opens that university in the person's role: its administration, a
     supervisor or coordinator, or a student of a section. An e-mail on a contracted domain that is not on the
     roster is refused. "admin@nabd.demo" is Nabd's administration.
   - Any other e-mail is an independent trainee: the training rooms and his own record, and no academic section
     at all (no university block on the home, no university link in the header, the sidebar or the profile).
   - A university student sees everything the independent trainee sees, plus his university's part, kept apart
     and named as such in the sidebar and in the profile.
   The legacy sign-in and registration handlers are not edited: these listeners run before them (capture) and
   call the legacy loginWithAccount(). Nothing here reaches the rooms. */
(function () {
  'use strict';
  const C = window.NabdConsole, Un = window.NabdUni;
  if (!C || !Un || typeof loginWithAccount !== 'function') return;
  const byId = id => document.getElementById(id);
  const valid = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const say = (id, text) => { const b = byId(id); if (!b) return; b.textContent = text || ''; b.classList.toggle('hidden', !text); };
  const initials = name => { const p = String(name).split(' ').filter(Boolean); return p.length >= 2 ? p[0][0] + ' ' + p[1][0] : String(name).slice(0, 2); };
  const FRESH = {
    isDemo: false, stats: { completed: 0, avgSpec: 'لا توجد بعد', avgEr: 'لا توجد بعد' },
    strengths: ['حساب جديد: تظهر نقاط القوة هنا بعد أولى جلساتك.'], weaknesses: ['لا توجد ملاحظات قبل إجراء الجلسات.'],
    recommendations: ['ابدأ بغرفة الطوارئ، ثم راجع تقرير أدائك.'], history: []
  };

  /* ---------- the account an e-mail opens ---------- */
  function build(email, name, track) {
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
      base = { name: who.student.name || name || (stored && stored.name) || email.split('@')[0], uni: x.name, org: x.id, role: 'student', roleNameAr: 'طالب جامعي', specialty: med ? 'الطب' : 'التمريض',
        track: med ? 'medicine' : 'nursing', year: (stored && stored.year) || 4, cohort: sec.legacy || null, cohortName: sec.name || null, roleLabel: `طالب جامعي · ${sec.name || ''} · ${x.name}` };
    } else {
      const med = track ? track === 'medicine' : !!(stored && stored.track === 'medicine');
      base = { name: name || (stored && stored.name) || email.split('@')[0], uni: 'حساب فردي', org: '', role: 'student', roleNameAr: 'متدرّب مستقل', specialty: med ? 'الطب' : 'التمريض',
        track: med ? 'medicine' : 'nursing', year: (stored && stored.year) || 4, cohort: null, cohortName: null, roleLabel: `متدرّب مستقل · ${med ? 'الطب' : 'التمريض'}` };
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
    if (!valid(email)) { say('login-error-msg', 'اكتب بريدك الإلكتروني.'); return; }
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
    if (!valid(email)) { say('reg-error-msg', 'اكتب بريدك الإلكتروني.'); return; }
    const r = build(email, name, on && on.dataset.rc === 'medicine' ? 'medicine' : 'nursing');
    if (r.error) { say('reg-error-msg', r.error); return; }
    loginWithAccount(r.acc, `تم إنشاء حسابك، ${r.acc.name}.`, 'home');
  }, true);

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
    try { count = (JSON.parse(localStorage.getItem('nabd_v2_assignments') || '[]') || []).filter(a => a && a.section === u.cohort).length; } catch (e) {}
    box.innerHTML = `<div class="nbx-aff-head"><span class="nbx-aff-tag is-uni">القسم الجامعي</span><h2>${esc(u.uni || '')}</h2></div>
      <dl><div><dt>الشعبة</dt><dd>${esc(sec || 'لم تُحدَّد')}</dd></div><div><dt>المشرف</dt><dd>${esc((who.kind === 'student' && who.supervisor) || 'لم يُعيَّن')}</dd></div><div><dt>واجبات مسندة</dt><dd>${C.n(count)}</dd></div></dl>
      <button type="button" data-nbx-aff-go>واجباتي الجامعية</button>`;
  }
  /* ---------- V6.9.1: the student's own reports and his supervisor's review ----------
     Every finished case is kept with the account (the room's result plus what the assessment layer adds: the axes,
     the errors by severity, the objectives, the handover checklist, the timeline and the reflection), so the
     report can be read again after signing out and in. A university student also sees where his supervisor
     stands: waiting for review, or approved with the final mark, the rating and the note. */
  const RDISPO = { icu: 'العناية الحثيثة', hdu: 'مراقبة عالية في الطوارئ', cath: 'القسطرة', ward: 'طابق عادي', home: 'البيت' };
  const RTL = { action: 'إجراء', test: 'فحص', harm: 'خطأ', stage: 'حالة المريض', better: 'تحسّن', comm: 'تواصل', exam: 'فحص سريري', read: 'قراءة نتيجة', dose: 'جرعة', order: 'أمر', check: 'تحقق', scope: 'حدود الدور', int: 'مقاطعة', help: 'طلب مساعدة' };
  const RSTATE = { ontime: ['في وقته', 'ok'], late: ['متأخر', 'mid'], missed: ['لم يحدث', 'bad'] };
  const RATING = ['', 'يحتاج إعادة كاملة', 'دون المتوقع', 'عند المتوقع', 'فوق المتوقع', 'متميّز'];
  const clock = m => `${Math.floor(m || 0)}:${String(Math.round(((m || 0) % 1) * 60)).padStart(2, '0')}`;
  function reviewOf(u, h) {
    let who = { kind: 'none' };
    try { who = Un.whois(u.email); } catch (e) {}
    if (who.kind !== 'student') return null;
    const st = Un.U(who.org), key = 'live:' + who.student.id + ':' + h.ts;
    return { pub: (st.published || {})[key], o: (st.overrides || {})[key], rate: (st.ratings || {})[key], note: (st.notes || {})[who.student.id], sup: who.supervisor || '' };
  }
  function runHtml(u, h) {
    const esc = C.esc, d = h.detail || {}, rv = reviewOf(u, h), nurse = /_n$/.test(h.caseId || '');
    const date = (() => { try { return new Date(h.ts).toLocaleDateString('ar-JO-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return h.date || ''; } })();
    const fin = rv && rv.pub ? (rv.o ? rv.o.total : h.num) : null;
    const status = !rv ? '' : rv.pub ? `<i class="is-pub">معتمدة: <b class="nbx-num">${fin}</b></i>` : '<i class="is-wait">بانتظار مراجعة المشرف</i>';
    const list = (arr, cls) => arr && arr.length ? `<ul class="nbx-run-errs ${cls}">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    const rev = !rv ? '' : rv.pub
      ? `<div class="nbx-run-rev is-pub"><b>مراجعة ${esc(rv.sup || 'المشرف')}</b><p>الدرجة المعتمدة <b class="nbx-num">${fin}%</b>${rv.o && rv.o.total !== h.num ? ` (درجة الغرفة ${h.num}%، عدّلها المشرف: ${esc(rv.o.why)})` : ''}${rv.o && rv.o.waive ? ` · أسقط المشرف الخطأ الحرج: ${esc(rv.o.why)}` : ''}${rv.rate ? ` · تقييمه العام ${rv.rate.v}/5 (${esc(RATING[rv.rate.v])})` : ''}</p>${rv.note && rv.note.text ? `<p><b>ملاحظته لك:</b> ${esc(rv.note.text)}</p>` : ''}</div>`
      : '<div class="nbx-run-rev"><p>وصل تقريرك إلى مشرفك. تظهر هنا الدرجة المعتمدة وملاحظته بعد أن يراجعها وينشرها.</p></div>';
    const axes = Array.isArray(h.axes) && h.axes.length ? `<ul class="nbx-run-axes">${h.axes.map(x => { const p = Math.round(x.pts / x.max * 100); return `<li class="is-${p >= 75 ? 'ok' : p >= 60 ? 'mid' : 'low'}"><span>${esc(x.label)}</span><b class="nbx-num">${Math.round(x.pts)} / ${x.max}</b><i><em style="width:${p}%"></em></i></li>`; }).join('')}</ul>` : '';
    const steps = (d.steps || []).length ? `<h5>أهداف الحالة</h5><ul class="nbx-run-steps">${d.steps.map(k => `<li><span>${esc(k.label)}</span><span class="nbx-num">${k.at == null ? '—' : clock(k.at)}</span><em class="is-${RSTATE[k.state][1]}">${RSTATE[k.state][0]}</em></li>`).join('')}</ul>` : '';
    const hand = (d.hand || []).length ? `<h5>تسليمك</h5><ul class="nbx-run-hand">${d.hand.map(x => `<li class="${x.ok ? 'is-ok' : 'is-miss'}"><span>${esc(x.label)}</span><em>${x.ok ? 'ذُكر' : esc(x.miss)}</em></li>`).join('')}</ul>` : '';
    const tl = (h.timeline || []).length ? `<h5>الخط الزمني</h5><ol class="nbx-run-tl">${h.timeline.map(l => `<li class="t-${esc(l.type)}"><time class="nbx-num" dir="ltr">${clock(l.at)}</time><em>${esc(RTL[l.type] || l.type)}</em><span>${esc(l.text)}</span></li>`).join('')}</ol>` : '';
    const refl = h.reflect && (h.reflect.hard || h.reflect.change) ? `<h5>تأملك</h5><p class="nbx-run-refl">${h.reflect.hard ? `<b>أصعب لحظة:</b> ${esc(h.reflect.hard)}<br>` : ''}${h.reflect.change ? `<b>ما تغيّره:</b> ${esc(h.reflect.change)}` : ''}</p>` : '';
    const dx = d.dxRight && !nurse ? `<p class="nbx-run-dx"><b>التشخيص الصحيح:</b> ${esc(d.dxRight)}${d.dx ? ` · <b>كتبت:</b> ${esc(d.dx)}` : ''}${d.dispo ? ` · <b>الوجهة:</b> ${esc(RDISPO[d.dispo] || d.dispo)}${d.dispoRight && d.dispoRight !== d.dispo ? ` (الصحيحة: ${esc(RDISPO[d.dispoRight] || '')})` : ''}` : ''}</p>` : '';
    return `<li><details class="nbx-run">
      <summary><span class="nbx-run-t"><b>${esc(h.caseTitle || 'غرفة الطوارئ')}</b><small>${esc(date)} · ${nurse ? 'دور التمريض' : 'دور الطبيب'}${d.minutes ? ' · ' + clock(d.minutes) + ' دقيقة' : ''}</small></span>
        <span class="nbx-run-s"><b class="nbx-num">${h.num}<small>/100</small></b><em class="${h.passed ? 'is-ok' : 'is-bad'}">${h.passed ? 'مجتاز' : 'غير مجتاز'}</em>${status}</span></summary>
      <div class="nbx-run-body">${rev}${dx}${axes}
        ${(h.critical || []).length ? `<h5 class="is-bad">خطأ حرج</h5>${list(h.critical, 'is-crit')}` : ''}
        ${(d.major || []).length ? `<h5>أخطاء جسيمة</h5>${list(d.major, 'is-major')}` : ''}
        ${(d.minor || []).length ? `<h5>أخطاء بسيطة</h5>${list(d.minor, 'is-minor')}` : ''}
        ${steps}${hand}${tl}${refl}
        ${!h.detail && !h.timeline ? '<p class="nbx-run-old">جلسة قبل حفظ التقارير الكاملة: تبقى درجتها في سجلك.</p>' : ''}
      </div></details></li>`;
  }
  function runsBlock(u, max, title, sub) {
    const runs = ((u && u.history) || []).filter(h => h && /^er_/.test(h.caseId || '') && h.ts).slice(0, max);
    const all = ((u && u.history) || []).filter(h => h && /^er_/.test(h.caseId || '')).length;
    return `<div class="nbx-runs-head"><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div>
      ${runs.length ? `<ul class="nbx-runs-list">${runs.map(h => runHtml(u, h)).join('')}</ul>${all > runs.length ? `<button type="button" class="nbx-runs-more" data-nbx-runs-all>كل تقاريرك (${C.n(all)}) في ملفك الشخصي</button>` : ''}`
        : '<p class="nbx-runs-empty">لم تُنهِ حالة في غرفة الطوارئ بعد. كل تقرير يُحفظ هنا مع حسابك، وتقدر ترجعله متى شئت.</p>'}`;
  }
  function runs(u, uni) {
    const homeHost = document.querySelector('#home-student-uni-section .nh-uni-main');
    let home = byId('nbx-runs-home');
    if (homeHost && u && u.role === 'student' && uni) {
      if (!home) { home = document.createElement('section'); home.id = 'nbx-runs-home'; home.className = 'nbx-runs'; home.setAttribute('data-no-terms', ''); homeHost.appendChild(home); }
      home.innerHTML = runsBlock(u, 3, 'تقاريرك ومراجعة المشرف', 'كل حالة تنهيها تصل إلى مشرفك، وتظهر هنا الدرجة المعتمدة وملاحظته حين ينشرها.');
    } else if (home) home.remove();
    const view = byId('view-profile'), aff = byId('nbx-aff');
    let prof = byId('nbx-runs-profile');
    if (view && aff && u && u.role === 'student') {
      if (!prof) { prof = document.createElement('section'); prof.id = 'nbx-runs-profile'; prof.className = 'nbx-aff nbx-runs'; prof.setAttribute('data-no-terms', ''); aff.insertAdjacentElement('afterend', prof); }
      prof.innerHTML = runsBlock(u, 12, 'تقاريري في غرفة الطوارئ', uni ? 'تقرير كل حالة كما كتبته الغرفة، ومراجعة مشرفك حين ينشرها.' : 'تقرير كل حالة كما كتبته الغرفة: افتحه لتراجع ما فعلت.');
    } else if (prof) prof.remove();
  }
  document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('[data-nbx-runs-all]')) { try { navigateTo('profile'); } catch (err) {} } });

  /* ---------- V6.9.3: the trainee first on the home, and the header's main sections ---------- */
  // the hero's four facts become the trainee's own; anyone else keeps the platform's facts written in the page
  let platformFacts = null;
  function meFacts(u) {
    const dl = byId('nh-me-facts');
    if (!dl) return;
    if (platformFacts === null) platformFacts = dl.innerHTML;
    if (!u || u.role !== 'student') { if (dl.innerHTML !== platformFacts) dl.innerHTML = platformFacts; return; }
    const esc = C.esc, runs = (u.history || []).filter(h => h && typeof h.num === 'number');
    const last = runs[0], avg = runs.length ? Math.round(runs.reduce((a, h) => a + h.num, 0) / runs.length) : null;
    const axes = {};
    runs.filter(h => Array.isArray(h.axes)).forEach(h => h.axes.forEach(x => { const k = x.label; (axes[k] = axes[k] || []).push(x.pts / x.max); }));
    const weak = Object.entries(axes).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => a[1] - b[1])[0];
    const title = h => String(h.caseTitle || '').replace(/^غرفة الطوارئ( \(دور التمريض\))? · /, '');
    const cell = (dt, dd, small) => `<div><dt>${dt}</dt><dd>${dd}${small ? ` <span>${small}</span>` : ''}</dd></div>`;
    dl.innerHTML = cell('آخر جلسة', last ? `${esc(last.num)}%` : 'لم تبدأ بعد', last ? esc(title(last)) : '')
      + cell('جلساتك', esc(String(runs.length)), !runs.length ? '' : runs.length === 1 ? 'جلسة مكتملة' : runs.length === 2 ? 'جلستان مكتملتان' : runs.length <= 10 ? 'جلسات مكتملة' : 'جلسة مكتملة')
      + cell('متوسطك', avg == null ? '—' : `${avg}%`, '')
      + cell('أضعف محور', weak ? esc(weak[0]) : '—', weak ? `${Math.round(weak[1] * 100)}%` : '');
  }
  const goHome = id => { try { navigateTo('home'); } catch (e) {} setTimeout(() => { const el = byId(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: 'smooth' }); }, 120); };
  document.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    if (t.closest('#app-nav-fields')) { goHome('home-fields9'); return; }
    if (t.closest('#app-nav-reports')) { try { navigateTo('profile'); } catch (err) {} setTimeout(() => { const el = byId('nbx-runs-profile'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: 'smooth' }); }, 160); }
  });


  /* ---------- V6.9.4: the clinical coach, the last section of the home ----------
     The owner: the coach comes last on the home, and the header's «المدرب السريري» leads to it. It reads the
     trainee's own saved reports (no server, no model yet): his scores over his last sessions, his weakest axis,
     the errors that keep coming back, and one exercise for the next case with the case to repeat. With the agent
     it will talk with him about each session (docs/agent/er-agent.ar.md, D-44). */
  const COACH_TIP = {
    safe: 'الأولوية للحياة: الأكسجين والعلاج الأساسي في أول دقائق، قبل أي فحص.',
    assess: 'اسأل عن القصة قبل أن تقرّر، وبعد كل علاج ارجع للمريض: كيف النفس؟ كم صار الإشباع؟',
    dx: 'قبل التسليم اكتب تشخيصاً واحداً وسبباً واحداً من الحالة يدعمه.',
    tests: 'اطلب ما يغيّر قرارك الآن فقط، واقرأ كل نتيجة قبل أن تطلب غيرها.',
    team: 'عرّف بنفسك للأهل، اشرح لهم بجملة واحدة، واطلب المساعدة قبل أن يسوء المريض.',
    hand: 'سلّم بستة بنود: من المريض ومشكلته، خلفيته، قراءتان بالأرقام، ما أُعطي، الحساسية، والخطة.'
  };
  const COACH_ERR = [
    [/الحساسية/, 'اسأل عن الحساسية قبل أول دواء، ولو بجملة واحدة للمريض أو مرافقه.'],
    [/قصة مرضية غير كافية/, 'قبل أول قرار اسأل سؤالين على الأقل: متى بدأ، وما أمراضه وأدويته.'],
    [/جرعة/, 'قل الدواء والجرعة والطريق كاملة، وراجع المدى قبل أن تطلب.'],
    [/لم يحدث|تأخر/, 'رتّب أولوياتك: ما ينقذ الحياة أولاً، ثم الفحوصات.']
  ];
  // the same error in different sessions: the step's deadline and the dose's figures set aside, the step's name kept
  const errKey = t => {
    const x = String(t).replace(/\s*خلال أول \d+ (دقائق|دقيقة|دقيقه)/g, '').replace(/\s*\([^)]*\)/g, '');
    return (/\d/.test(x) ? x.split(':')[0] : x).trim();
  };
  const caseOf = h => String(h.caseId || '').replace(/^er_/, '').replace(/_n$/, '');
  const titleOf = h => String(h.caseTitle || 'حالة').replace(/^غرفة الطوارئ( \(دور التمريض\))? · /, '');
  function coachData(u) {
    const runs = ((u && u.history) || []).filter(h => h && /^er_/.test(h.caseId || '') && typeof h.num === 'number');
    if (!runs.length) return null;
    const avg = a => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
    const recent = avg(runs.slice(0, 3).map(h => h.num)), before = avg(runs.slice(3, 6).map(h => h.num));
    const axes = {};
    runs.filter(h => Array.isArray(h.axes)).forEach(h => h.axes.forEach(x => { const a = axes[x.label] = axes[x.label] || { k: x.k, v: [] }; a.v.push(x.pts / x.max); }));
    const ax = Object.entries(axes).map(([label, a]) => ({ label, k: a.k, pct: Math.round(a.v.reduce((x, y) => x + y, 0) / a.v.length * 100) })).sort((a, b) => a.pct - b.pct);
    const errs = {};
    runs.forEach(h => {
      const d = h.detail || {};
      [...(h.critical || []), ...(d.major || []), ...(d.minor || []), ...(d.hand || []).filter(x => !x.ok).map(x => 'التسليم بلا: ' + x.label)]
        .forEach(t => { const k = errKey(t); errs[k] = (errs[k] || 0) + 1; });
    });
    const top = Object.entries(errs).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const weak = ax[0] || null;
    const errTip = top.length ? (COACH_ERR.find(([re]) => re.test(top[0][0])) || [])[1] : null;
    const tip = errTip || (weak && (COACH_TIP[weak.k] || (/تقييم|متابعة/.test(weak.label) ? COACH_TIP.assess : /تسليم|SBAR/.test(weak.label) ? COACH_TIP.hand : /تواصل/.test(weak.label) ? COACH_TIP.team : COACH_TIP.safe))) || COACH_TIP.safe;
    const latest = {};
    runs.forEach(h => { const c = caseOf(h); if (!(c in latest)) latest[c] = h; });
    const lowest = Object.values(latest).sort((a, b) => a.num - b.num)[0];
    return { runs, last: runs.slice(0, 6).reverse(), avg: avg(runs.map(h => h.num)), recent, before, weak, ax, top, tip, lowest };
  }
  // V6.9.6 (owner): on the home the coach is one card; everything else is on the coach's own page (050-coach-drill.js)
  function coach(u) {
    const home = byId('view-home');
    if (!home) return;
    let box = byId('nbx-coach');
    if (!u || u.role !== 'student') { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('section'); box.id = 'nbx-coach'; box.className = 'nbx-coach'; box.setAttribute('data-no-terms', ''); box.setAttribute('aria-labelledby', 'nbx-coach-h'); home.appendChild(box); }
    const esc = C.esc, d = coachData(u), gap = window.NabdCoachDrill ? window.NabdCoachDrill.gapOf(u) : null;
    const open = window.NabdCoachDrill ? window.NabdCoachDrill.openGaps(u) : 0;
    const status = !d ? 'يبدأ بعد أول حالة تنهيها في غرفة الطوارئ.'
      : gap ? `بانتظارك: ${esc(gap.title)}` : open ? `${open === 1 ? 'نقطة واحدة' : open + ' نقاط'} تحتاج تطوير` : `${d.runs.length} ${d.runs.length === 1 ? 'جلسة' : 'جلسات'} · متوسط ${d.avg}%`;
    box.innerHTML = `<div class="nbx-coach-card-row">
        <span class="nbx-coach-ic" aria-hidden="true"></span>
        <div class="nbx-coach-card-copy"><span class="nbx-coach-kicker">مساحتك الشخصية</span><h2 id="nbx-coach-h">المدرب السريري</h2>
          <p>يقرأ تقاريرك، يسمّي ما تحتاج تطويره، ويتدرّب معك عليه خطوة خطوة: هو المريض وأهله، وأنت المسؤول.</p>
          <span class="nbx-coach-status${gap ? ' is-gap' : ''}">${status}</span></div>
        <button type="button" class="nbx-coach-btn is-main" data-nbx-coach-open>افتح المدرب ←</button>
      </div>`;
  }
  window.NabdCoachData = Object.freeze({ data: coachData, titleOf, caseOf });
  // the coach's own buttons, and the header's and the sidebar's «المدرب السريري», which lead to it
  document.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    if (t.closest('[data-nbx-coach-open]')) { if (window.NabdCoachDrill) window.NabdCoachDrill.open(); return; }
    const go = t.closest('[data-nbx-coach-go]');
    if (go) {
      const k = go.getAttribute('data-nbx-coach-go');
      if (k === 'new') { const b = byId('launch-er-random-btn'); if (b) b.click(); }
      else if (k === 'case' && typeof nb8OpenAssignedCase === 'function') nb8OpenAssignedCase(go.getAttribute('data-case'));
      else if (k === 'reports') { const r = byId('app-nav-reports'); if (r) r.click(); }
      return;
    }
    if (t.closest('#app-nav-coach') || t.closest('[data-nbx-coach-side]')) {
      let u = null; try { u = authState.user; } catch (err) {}
      if (!u || u.role !== 'student') return;
      e.preventDefault(); e.stopImmediatePropagation();
      try { if (typeof closeSidebar === 'function') closeSidebar(); } catch (err) {}
      if (window.NabdCoachDrill) window.NabdCoachDrill.open(); else goHome('nbx-coach');
    }
  }, true);
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
    const rep = byId('app-nav-reports'); if (rep) rep.style.display = student ? '' : 'none';
    const cb = byId('app-nav-coach'); if (cb) cb.style.display = student ? '' : 'none';
    coach(u);
    coachSide(student);
  }
  const shown = window.showOnlySection;
  window.showOnlySection = function (viewId) { shown(viewId); try { applyAudience(); } catch (e) {} };
  document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('[data-nbx-aff-go]')) { try { navigateTo('university'); } catch (err) {} } });
  setTimeout(() => { try { applyAudience(); } catch (e) {} }, 0);
})();
