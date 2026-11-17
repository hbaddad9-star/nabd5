/* The university's console (V6.7.2, 2026-11-15; docs/decisions/0015-admin-console-prototype.md, second addendum).
   The owner's rule for an institution that rents the platform: it organises its own people and reads its own
   results, and nothing more. So this console, opened by the "uniadmin" demo account, lets the university's
   administration create courses and sections, list its academic staff (course coordinators and supervisors) and
   its students, choose which cases of the platform's library are open to its students, read its reports and set
   who may do what inside the university. It cannot add or edit a case, change the scoring or the safety rules,
   or see another institution. Built on the admin console's shell (010-admin-console.js, window.NabdConsole); the
   data is the same demo store (key "uni" of nabd_v2_admin), and the university's sections are the institution's
   cohorts, so the platform's admin and the university see one set of figures. Nothing here reaches the rooms.
   V6.7.3 (owner, 2026-11-15): one sign-in for everyone, and the e-mail decides. The university hands over the list
   of its people's e-mails (the roster); whoever signs up with a listed e-mail enters his own university in his
   own role. No join codes and no manual approval. The sign-in forms show what an e-mail is recognised as. */
(function () {
  'use strict';
  const C = window.NabdConsole;
  if (!C || typeof DEMO_ACCOUNTS === 'undefined') return;
  const { root, ic, chip, esc, n, pct, bar, card, empty, day, uid, toast, field, formEnd } = C;

  DEMO_ACCOUNTS.uniadmin = {
    id: 'uniadmin', name: 'د. ريم الحديدي', initials: 'ر ح', email: 'r.hadidi@uni1.edu.jo', uni: 'جامعة 1', org: 'ju',
    role: 'uniadmin', roleNameAr: 'مدير الجامعة', specialty: 'إدارة الجامعة', roleLabel: 'مدير الجامعة · لوحة الجامعة',
    isDemo: true, stats: { completed: 0, avgSpec: '0%', avgEr: '0%' }, strengths: [], weaknesses: [], recommendations: [], history: []
  };

  /* V6.7.4: one university for the whole demo chain. The legacy "doctor" account becomes a supervisor of the
     university of the "uniadmin" account, and so opens the supervisor's console (030-supervisor-console.js). */
  /* V6.7.6 (owner): generic institution names everywhere in the demo, including the legacy demo accounts and the
     legacy cohort table (their scripts are pinned, so the names are replaced at run time, never in those files) */
  const GENERIC = [['جامعة العلوم والتكنولوجيا الأردنية', 'جامعة 2'], ['جامعة العلوم والتكنولوجيا', 'جامعة 2'], ['الجامعة الأردنية', 'جامعة 1'],
    ['الجامعة الهاشمية', 'جامعة 3'], ['جامعة اليرموك', 'جامعة 4'], ['جامعة مؤتة', 'جامعة 5'], ['جامعة الشرق الأوسط', 'جامعة 6'], ['مستشفى التخصصي السريري', 'مستشفى 1']];
  const generic = t => GENERIC.reduce((v, [a, b]) => String(v).split(a).join(b), t);
  Object.values(DEMO_ACCOUNTS).forEach(a => { if (a && typeof a === 'object') ['uni', 'roleLabel', 'specialty'].forEach(k => { if (typeof a[k] === 'string') a[k] = generic(a[k]); }); });
  try { if (typeof NB_COHORTS === 'object' && NB_COHORTS) Object.values(NB_COHORTS).forEach(c => { if (c && typeof c.uni === 'string') c.uni = generic(c.uni); }); } catch (e) {}
  if (DEMO_ACCOUNTS.rana) Object.assign(DEMO_ACCOUNTS.rana, { uni: 'جامعة 1', email: 'rana.m@uni1.edu.jo', roleLabel: 'طالبة تمريض · السنة الرابعة · جامعة 1' });
  if (DEMO_ACCOUNTS.med_student) Object.assign(DEMO_ACCOUNTS.med_student, { uni: 'جامعة 1', email: 'zaid.a@uni1.edu.jo' });
  if (DEMO_ACCOUNTS.doctor) Object.assign(DEMO_ACCOUNTS.doctor, { org: 'ju', email: 'a.majali@uni1.edu.jo', uni: 'كلية التمريض — جامعة 1', roleNameAr: 'مشرف أكاديمي', roleLabel: 'مشرف أكاديمي · جامعة 1' });

  /* ---------- the university's data ---------- */
  const S = () => C.state();
  const myOrg = () => { let id = 'ju'; try { id = (authState.user && authState.user.org) || id; } catch (e) {} return S().unis.find(x => x.id === id) || S().unis[0]; };
  const ROLE = { uadmin: ['إدارة الجامعة', 'navy'], coordinator: ['منسق مساق', 'info'], supervisor: ['مشرف أكاديمي', 'teal'] };
  function seedUni(x) {
    const courses = [], sections = [];
    x.cohorts.forEach(([code, name, size], i) => {
      let c = courses.find(k => k.code === code);
      if (!c) { c = { id: 'c' + (courses.length + 1), code, name: String(name).split(' · ')[0], track: /^MED/i.test(code) ? 'الطب' : /^CPD/i.test(code) ? 'تعليم مستمر' : 'التمريض' }; courses.push(c); }
      sections.push({ id: 's' + (i + 1), course: c.id, name, size, cap: Math.ceil(size / 10) * 10 + 5, sup: '' });
    });
    const mail = u => u + '@' + x.domain;
    let staff;
    if (x.id === 'ju') {
      staff = [
        { id: 't0', name: DEMO_ACCOUNTS.uniadmin.name, email: DEMO_ACCOUNTS.uniadmin.email, role: 'uadmin', status: 'active', courses: [] },
        { id: 't1', name: 'د. هيفاء النسور', email: mail('h.nsour'), role: 'coordinator', status: 'active', courses: courses[0] ? [courses[0].id] : [] },
        { id: 't2', name: (DEMO_ACCOUNTS.doctor || {}).name || 'د. عبدالرحمن المجالي', email: mail('a.majali'), role: 'supervisor', status: 'active', courses: [] },
        { id: 't3', name: 'أ. دانا القضاة', email: mail('d.qudah'), role: 'supervisor', status: 'active', courses: [] },
        { id: 't4', name: 'د. فراس العمري', email: mail('f.omari'), role: 'coordinator', status: 'active', courses: courses[1] ? [courses[1].id] : [] },
        { id: 't5', name: 'أ. رزان الشوابكة', email: mail('r.shawabkeh'), role: 'supervisor', status: 'invited', courses: [] }
      ];
      sections.forEach((s, i) => { s.sup = ['t2', 't3', 't4'][i % 3]; });
      /* the legacy demo student ("rana") sits in the legacy section NUR-JU-2026: the first section stands for it */
      if (sections[0]) sections[0].legacy = 'NUR-JU-2026';
    } else {
      /* other institutions: the people the platform's admin already lists for them */
      staff = S().users.filter(k => k.org === x.id && (k.role === 'professor' || k.role === 'uniadmin'))
        .map((k, i) => ({ id: 't' + i, name: k.name, email: k.email, role: k.role === 'uniadmin' ? 'uadmin' : 'supervisor', status: k.status === 'active' ? 'active' : 'invited', courses: [] }));
      const sup = staff.find(t => t.role === 'supervisor');
      sections.forEach(s => { s.sup = sup ? sup.id : ''; });
    }
    return { courses, sections, staff, caseOff: [], suspended: [], requests: [], extra: [],
      policy: { coordSections: true, supSections: false, coordAssign: true, supAssign: true, supPublish: true, adminSeesNames: true, supSeesNames: true } };
  }
  function U(x) {
    x = x || myOrg();
    const st = S();
    st.uni = st.uni || {};
    if (!st.uni[x.id]) { st.uni[x.id] = seedUni(x); C.save(); }
    const u = st.uni[x.id];
    u.extra = u.extra || [];
    /* V6.9: the pass mark of the emergency room, one for each study year (the university's own choice) */
    if (!u.policy.passMarks) u.policy.passMarks = { 1: 70, 2: 70, 3: 70, 4: 70, 5: 70, 6: 70 };
    /* the demo chain's two students are on the roster of the demo university, so their e-mail opens their section */
    if (x.id === 'ju' && !u.demoStudents && u.sections.length) {
      u.demoStudents = true;
      [['r-rana', 'رنا المحاسنة', 'rana.m', u.sections[0]], ['r-zaid', 'زيد العبداللات', 'zaid.a', u.sections[u.sections.length - 1]]]
        .forEach(([id, name, local, sec]) => { if (!u.extra.some(k => k.id === id)) u.extra.push({ id, name, email: local + '@' + x.domain, sec: sec.id }); });
    }
    /* V6.9.1: the demo supervisor (t2) follows both demo students, so a session played by either reaches him;
       the coordinator of the medicine course still sees its section through his course */
    if (x.id === 'ju' && !u.demoChain) {
      u.demoChain = true;
      const z = u.extra.find(k => k.id === 'r-zaid'), zs = z && u.sections.find(k => k.id === z.sec);
      if (zs && u.staff.some(t => t.id === 't2')) zs.sup = 't2';
    }
    u.sections.forEach(k => { if (!k.legacy) k.legacy = 'SEC-' + String(x.id).toUpperCase() + '-' + String(k.id).toUpperCase(); });
    try { u.sections.forEach(k => { if (!NB_COHORTS[k.legacy]) NB_COHORTS[k.legacy] = { uni: x.name, name: k.name }; else NB_COHORTS[k.legacy].name = NB_COHORTS[k.legacy].name || k.name; }); } catch (e) {}
    if (x.id === 'ju' && !u.staff.some(t => t.role === 'uadmin')) u.staff.unshift({ id: 't0', name: DEMO_ACCOUNTS.uniadmin.name, email: DEMO_ACCOUNTS.uniadmin.email, role: 'uadmin', status: 'active', courses: [] });
    return u;
  }
  const listed = (u, sec) => sec.size + u.extra.filter(k => k.sec === sec.id).length;
  /* the university's sections are the institution's cohorts: the platform's admin reads the same figures */
  function sync(x) {
    x = x || myOrg();
    const u = U(x);
    x.cohorts = u.sections.map(s => [(u.courses.find(c => c.id === s.course) || {}).code || '', s.name, listed(u, s)]);
    x.used = u.sections.reduce((a, s) => a + listed(u, s), 0);
    C.save();
  }
  const courseOf = id => U().courses.find(c => c.id === id) || { code: '', name: '' };
  const staffOf = id => U().staff.find(t => t.id === id);
  const caseOpen = id => !U().caseOff.includes(id);
  function toStudentHome(recs, x) {
    const u = U(x);
    let list = [];
    try { list = JSON.parse(localStorage.getItem('nabd_v2_assignments') || '[]'); if (!Array.isArray(list)) list = []; } catch (e) { list = []; }
    recs.forEach(rec => {
      const sec = u.sections.find(k => k.name === rec.cohort);
      if (!sec || !sec.legacy) return;
      const ts = Date.parse(rec.at) || Date.now(), old = list.find(a => a && a.caseId === rec.caseId && a.section === sec.legacy);
      if (old) Object.assign(old, { due: rec.due, by: rec.by });
      else list.push({ id: 'as_' + rec.id, caseId: rec.caseId, section: sec.legacy, due: rec.due, note: '', by: rec.by, ts });
    });
    try { localStorage.setItem('nabd_v2_assignments', JSON.stringify(list)); } catch (e) {}
  }
  C.setOnAssign((rec, x) => toStudentHome([rec], x));
  const bridge = x => toStudentHome((S().assign || []).filter(a => a.org === x.id), x);
  C.setCaseFilter((orgId, caseId) => !((((S().uni || {})[orgId] || {}).caseOff) || []).includes(caseId));

  /* the roster: every listed student, signed up or not (repeatable demo records, plus the ones added here) */
  const FIRST_F = ['رنا', 'سارة', 'لمى', 'دانا', 'هبة', 'نور', 'ريم', 'آية', 'جنى', 'سلمى', 'تالا', 'ميس', 'روان', 'ليان', 'فرح'];
  const FIRST_M = ['زيد', 'أحمد', 'عمر', 'خالد', 'يزن', 'محمد', 'ليث', 'حمزة', 'كرم', 'معاذ', 'أنس', 'بشار', 'طارق', 'سيف', 'عون'];
  const LAST = ['المحاسنة', 'العبداللات', 'الزعبي', 'المومني', 'البطاينة', 'الخطيب', 'الحياري', 'الرواشدة', 'العمري', 'النسور', 'القضاة', 'الشوابكة', 'الخصاونة', 'الطراونة', 'المجالي', 'العدوان', 'الحديدي', 'الكيلاني', 'السالم', 'الرفاعي'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function students(x) {
    x = x || myOrg();
    const u = U(x), F = C.orgFigures(x), out = [];
    u.sections.forEach((sec, si) => {
      const r = C.rng(x.id + ':' + sec.id), base = (F.cohorts[si] || {}).score || 75;
      for (let i = 0; i < sec.size; i++) {
        const fem = r() < 0.6, pool = fem ? FIRST_F : FIRST_M;
        const name = pool[Math.floor(r() * pool.length)] + ' ' + LAST[Math.floor(r() * LAST.length)];
        let pre = ''; for (let k = 0; k < 3; k++) pre += 'abdehklmnrsty'[Math.floor(r() * 13)];
        const num = '02' + String(10000 + Math.floor(r() * 89999));
        const avg = clamp(Math.round(base + (r() - 0.5) * 28), 41, 98);
        const idle = r() < 0.06 ? Math.round(15 + r() * 20) : Math.round(r() * 9);
        const sessions = Math.round(2 + r() * 16), done = clamp(Math.round(58 + r() * 42 - (idle > 14 ? 28 : 0)), 8, 100);
        const reg = r() >= 0.09, id = sec.id + '-' + i;
        out.push(reg ? { id, name, num, email: pre + num + '@' + x.domain, sec: sec.id, reg, avg, idle, sessions, done, risk: avg < 65 || idle > 14, off: u.suspended.includes(id) }
          : { id, name, num, email: pre + num + '@' + x.domain, sec: sec.id, reg, avg: 0, idle: 0, sessions: 0, done: 0, risk: false, off: false });
      }
    });
    u.extra.forEach(k => out.push({ id: k.id, name: k.name || '', num: k.email.split('@')[0], email: k.email, sec: k.sec, reg: !!k.reg, fresh: true, added: true, avg: 0, idle: 0, sessions: 0, done: 0, risk: false, off: false }));
    return out;
  }
  const riskWhy = s => [s.avg < 65 ? `متوسط ${n(s.avg)}%` : '', s.idle > 14 ? `دون نشاط منذ ${n(s.idle)} يوماً` : ''].filter(Boolean).join(' · ');
  const shown = s => (U().policy.adminSeesNames ? (s.name || s.email) : 'طالب ' + s.num);
  const kpi = (label, value, sub, extra) => `<div class="nbx-kpi"><span>${label}</span><b>${value}</b><small>${sub}</small>${extra || ''}</div>`;
  const score = v => `<span class="nbx-score nbx-score-${C.band(v)}">${n(v)}%</span>`;
  const idleText = d => (d === 0 ? 'اليوم' : d === 1 ? 'أمس' : `قبل ${n(d)} أيام`);

  /* ---------- pages ---------- */
  function uhome(body) {
    sync();
    const x = myOrg(), u = U(), F = C.orgFigures(x), all = students(), reg = all.filter(s => s.reg);
    const total = all.length, risk = reg.filter(s => s.risk && !s.off), waiting = total - reg.length;
    const noSup = u.sections.filter(s => !staffOf(s.sup) || staffOf(s.sup).status !== 'active');
    const assigns = (S().assign || []).filter(a => a.org === x.id).length;
    const openCases = (C.cases() || []).filter(c => caseOpen(c.id)).length;
    const steps = [
      ['usettings', 'بيانات الجامعة والعقد', `${C.PLANS[x.plan].name} · ${n(x.seats)} مقعداً`, true],
      ['ucourses', 'المساقات والشعب', `${n(u.courses.length)} مساقات · ${n(u.sections.length)} شعب`, u.sections.length > 0],
      ['ustaff', 'الكادر الأكاديمي', noSup.length ? `${n(noSup.length)} شعب دون مشرف نشط` : `${n(u.staff.filter(t => t.status === 'active').length)} أعضاء نشطون`, u.staff.some(t => t.status === 'active') && !noSup.length],
      ['ustudents', 'قائمة الطلاب', total ? `${n(reg.length)} سجّلوا من ${n(total)}` : 'لم تُضف القائمة بعد', total > 0],
      ['ulibrary', 'الحالات المتاحة', C.cases() ? `${n(openCases)} من ${n(C.cases().length)} حالات مفتوحة` : 'من مكتبة نبض', !C.cases() || openCases > 0],
      ['ureports', 'المتابعة والتقارير', assigns ? `${n(assigns)} واجبات مسندة` : 'لم تُسند حالة بعد', assigns > 0]
    ];
    const next = steps.findIndex(s => !s[3]);
    const onb = `<ol class="nbx-onb">${steps.map(([p, t, sub, done], i) => `<li class="${done ? 'is-done' : i === next ? 'is-now' : ''}"><button type="button" data-nbx-go="${p}"><i>${done ? ic('check', 14) : n(i + 1)}</i><span><b>${esc(t)}</b><small>${esc(sub)}</small></span></button></li>`).join('')}</ol>`;
    const tasks = [];
    noSup.forEach(s => tasks.push(['ucourses', 'alert', `شعبة «${s.name}» دون مشرف نشط`, 'عيّن مشرفاً ليتابع طلابها.']));
    u.staff.filter(t => t.status === 'invited').forEach(t => tasks.push(['ustaff', 'users', `${t.name} لم يسجّل حسابه بعد`, 'مُدرج في قائمة الكادر ببريده الجامعي.']));
    if (risk.length) tasks.push(['ustudents', 'target', `${n(risk.length)} طلاب يحتاجون متابعة`, 'متوسط دون 65% أو انقطاع أكثر من أسبوعين.']);
    if (waiting) tasks.push(['ustudents', 'users', `${n(waiting)} طلاب في القائمة لم يسجّلوا بعد`, 'يدخلون مباشرة عند إنشاء حسابهم ببريد الجامعة.']);
    if (x.status !== 'pending' && Math.round((new Date(x.end) - new Date()) / 864e5) <= 90) tasks.push(['usettings', 'subs', `ينتهي عقد الجامعة في ${day(x.end)}`, 'يُجدَّد من إدارة منصة نبض.']);
    const r = C.rng(x.id + ':errors');
    const errors = C.ERRORS.map(([t, v, d, c]) => [t, clamp(Math.round(v + (r() - 0.5) * 8), 3, 40), d, c]).sort((a, b) => b[1] - a[1]);
    const active = reg.filter(s => s.idle <= 7 && !s.off).length;
    body.innerHTML = `
      <div class="nbx-chips">${chip(C.PLANS[x.plan].name, 'navy')}${chip(C.STATUS[x.status][0], C.STATUS[x.status][1])}${chip(`العقد حتى ${day(x.end)}`, 'muted')}<span class="nbx-invite"><small>بريد الجامعة</small><code dir="ltr">@${esc(x.domain)}</code></span></div>
      ${card('إعداد الجامعة على المنصة', onb, '', next < 0 ? 'اكتمل الإعداد' : `الخطوة التالية: ${esc(steps[next][1])}`)}
      <div class="nbx-kpis">
        ${kpi('الطلاب في القائمة', `${n(total)}<em> / ${n(x.seats)}</em>`, `${n(reg.length)} سجّلوا حساباتهم`, bar(total, x.seats, pct(total, x.seats) > 90 ? 'warn' : ''))}
        ${kpi('نشطون هذا الأسبوع', n(active), `${pct(active, reg.length)}% من المسجّلين`)}
        ${kpi('جلسات التدريب', n(reg.reduce((a, s) => a + s.sessions, 0)), 'في غرفة الطوارئ، هذا الفصل')}
        ${kpi('متوسط الأداء', `${n(F.score)}%`, F.score === C.PLATFORM_SCORE ? 'مثل متوسط المنصة' : `${F.score > C.PLATFORM_SCORE ? 'أعلى' : 'أدنى'} من متوسط المنصة (${n(C.PLATFORM_SCORE)}%)`)}
      </div>
      <div class="nbx-grid nbx-grid-wide">
        ${F.cohorts.length ? card('مصفوفة الكفاءات', C.competencyMatrix(x, F), '', 'محاور تقييم الغرفة لكل شعبة · آخر 30 يوماً') : card('مصفوفة الكفاءات', empty('تظهر بعد إضافة الشعب وبدء التدريب.'))}
        ${card('بانتظار قرارك', tasks.length ? `<ul class="nbx-tasks">${tasks.map(([p, i, t, s]) => `<li><button type="button" data-nbx-go="${p}">${ic(i)}<span><b>${esc(t)}</b><small>${esc(s)}</small></span>${ic('arrow', 16)}</button></li>`).join('')}</ul>` : empty('لا يوجد ما ينتظر قراراً.'))}
      </div>
      <div class="nbx-grid">
        ${card('طلاب يحتاجون متابعة', risk.length ? `<ul class="nbx-assigns">${risk.slice().sort((a, b) => a.avg - b.avg).slice(0, 6).map(s => `<li><span><b>${esc(shown(s))}</b><small>${esc((u.sections.find(k => k.id === s.sec) || {}).name || '')} · ${esc(riskWhy(s))}</small></span>${score(s.avg)}</li>`).join('')}</ul><div class="nbx-card-act"><button type="button" class="nbx-btn nbx-btn-quiet" data-nbxu-act="stu-filter" data-v="risk">عرض الكل (${n(risk.length)})</button></div>` : empty('لا يوجد طلاب متعثرون.'), '', 'متوسط دون 65% أو انقطاع')}
        ${card('أكثر الأخطاء تكراراً في جامعتك', `<ol class="nbx-errors">${errors.map(([t, v, d, c]) => `<li><span class="nbx-err-t"><b>${esc(t)}</b><small>${c ? 'الأكثر في حالة ' + esc(C.CASE_SHORT[c]) : 'في كل الحالات'}</small></span><span class="nbx-err-v"><b class="nbx-num">${n(v)}%</b><small class="${d < 0 ? 'nbx-good' : d > 0 ? 'nbx-bad' : ''}">${d < 0 ? '▼ ' + n(-d) + ' نقطة' : d > 0 ? '▲ ' + n(d) + ' نقطة' : 'دون تغيير'}</small></span></li>`).join('')}</ol>`, '', 'نسبة جلسات طلابك')}
      </div>
      <p class="nbx-foot-note nbx-foot-tight">أرقام الاستخدام والأداء توضيحية في بيئة العرض؛ تُحسب من جلسات طلاب الجامعة عند ربط الخادم.</p>`;
    if (!C.cases()) C.loadCases().then(() => C.render());
  }

  function ucourses(body, act) {
    sync();
    const u = U(), all = students();
    act.innerHTML = `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbxu-act="course-new">${ic('plus', 16)}إضافة مساق</button><button type="button" class="nbx-btn nbx-btn-primary" data-nbxu-act="section-new"${u.courses.length ? '' : ' disabled'}>${ic('plus', 16)}إضافة شعبة</button>`;
    if (!u.courses.length) { body.innerHTML = `<section class="nbx-card nbx-empty-state">${ic('cases', 26)}<h2>لا توجد مساقات بعد</h2><p>أضف المساق أولاً، ثم أنشئ شعبه وعيّن لكل شعبة مشرفاً.</p></section>`; return; }
    body.innerHTML = u.courses.map(c => {
      const secs = u.sections.filter(s => s.course === c.id);
      const coord = u.staff.filter(t => t.role === 'coordinator' && (t.courses || []).includes(c.id)).map(t => t.name).join('، ');
      return `<div class="nbx-card nbx-table-card"><header class="nbx-card-head"><h2><span dir="ltr">${esc(c.code)}</span> · ${esc(c.name)} <small>${esc(c.track)} · المنسق: ${esc(coord || 'لم يُعيَّن')}</small></h2><span class="nbx-card-act-in"><button type="button" class="nbx-btn nbx-btn-quiet" data-nbxu-act="course-edit" data-id="${c.id}">تعديل</button><button type="button" class="nbx-btn nbx-btn-quiet" data-nbxu-act="section-new" data-course="${c.id}">${ic('plus', 15)}شعبة</button></span></header>
        ${secs.length ? `<div class="nbx-table-wrap"><table class="nbx-table nbx-table-fixed">
          <thead><tr><th>الشعبة</th><th>المشرف</th><th>الطلاب في القائمة</th><th>سجّلوا حساباتهم</th><th><span class="nbx-sr">إجراء</span></th></tr></thead>
          <tbody>${secs.map(s => { const t = staffOf(s.sup), tot = listed(u, s), reg = all.filter(k => k.sec === s.id && k.reg).length; return `<tr>
            <td><b>${esc(s.name)}</b></td>
            <td>${t ? esc(t.name) + (t.status === 'active' ? '' : ' <small class="nbx-warn-t">لم يسجّل حسابه بعد</small>') : '<small class="nbx-warn-t">لم يُعيَّن مشرف</small>'}</td>
            <td class="nbx-num"><span>${n(tot)} / ${n(s.cap)}</span>${bar(tot, s.cap, pct(tot, s.cap) > 90 ? 'warn' : '')}</td>
            <td class="nbx-num"><span>${n(reg)} (${pct(reg, tot)}%)</span>${bar(reg, tot || 1)}</td>
            <td class="nbx-row-act"><button type="button" class="nbx-btn nbx-btn-quiet" data-nbxu-act="roster-add" data-sec="${s.id}">إضافة طلاب</button><button type="button" class="nbx-btn nbx-btn-quiet" data-nbxu-act="section-edit" data-id="${s.id}">تعديل</button></td>
          </tr>`; }).join('')}</tbody></table></div>` : empty('لا توجد شعب في هذا المساق بعد.')}</div>`;
    }).join('') + `<p class="nbx-foot-note nbx-foot-tight">يدخل الطالب إلى شعبته مباشرة عند إنشاء حسابه بالبريد المدرج في قائمتها. ${U().policy.coordSections ? 'يستطيع منسق المساق إنشاء شعب مساقه أيضاً' : 'إنشاء الشعب لإدارة الجامعة فقط'}؛ تُضبط الصلاحيات من إعدادات الجامعة.</p>`;
  }

  function permsOf(role) {
    const p = U().policy;
    if (role === 'uadmin') return ['يدير المساقات والشعب والكادر وقائمة الطلاب', 'يرى تقارير الجامعة كاملة', 'يحدد صلاحيات الأدوار داخل الجامعة'];
    return (role === 'coordinator'
      ? [p.coordSections && 'ينشئ شعب مساقه ويعدّلها', p.coordAssign && 'يسند الحالات والامتحانات لشعب مساقه', 'يرى تقارير مساقه كاملة']
      : ['يتابع طلاب شعبه ويكتب ملاحظاته', p.supAssign && 'يسند الحالات لشعبه', p.supSections && 'ينشئ شعبه', p.supPublish && 'يعتمد نتائج طلابه وينشرها', p.supSeesNames ? 'يرى أسماء طلاب شعبه ودرجاتهم' : 'يرى درجات شعبه دون أسماء']).filter(Boolean);
  }
  const permList = role => `<ul class="nbx-perms">${permsOf(role).map(t => `<li>${ic('check', 15)}${esc(t)}</li>`).join('')}</ul>`;
  function ustaff(body, act) {
    const u = U();
    act.innerHTML = `<button type="button" class="nbx-btn nbx-btn-primary" data-nbxu-act="staff-new">${ic('plus', 16)}إضافة عضو للكادر</button>`;
    body.innerHTML = `
      <div class="nbx-card nbx-table-card"><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>عضو الكادر</th><th>الدور</th><th>المساقات والشعب</th><th>الطلاب</th><th>الحساب</th><th><span class="nbx-sr">إجراء</span></th></tr></thead>
        <tbody>${u.staff.map(t => {
          const secs = u.sections.filter(s => s.sup === t.id), cs = (t.courses || []).map(id => courseOf(id).code).filter(Boolean);
          const mine = t.role === 'uadmin' ? u.sections : u.sections.filter(s => s.sup === t.id || (t.role === 'coordinator' && (t.courses || []).includes(s.course)));
          return `<tr>
            <td><b>${esc(t.name)}</b><small dir="ltr">${esc(t.email)}</small></td>
            <td>${chip(ROLE[t.role][0], ROLE[t.role][1])}</td>
            <td>${t.role === 'uadmin' ? 'كل الجامعة' : (cs.length ? `<span dir="ltr">${esc(cs.join(' · '))}</span>` : '') + (secs.length ? `<small>${esc(secs.map(s => s.name).join('، '))}</small>` : (cs.length ? '' : '<small>لم تُسند له شعبة</small>'))}</td>
            <td class="nbx-num">${n(mine.reduce((a, s) => a + listed(u, s), 0))}</td>
            <td>${t.status === 'active' ? chip('مسجّل', 'ok') : t.status === 'invited' ? chip('لم يسجّل بعد', 'muted') : chip('موقوف', 'bad')}</td>
            <td><button type="button" class="nbx-btn nbx-btn-quiet" data-nbxu-act="staff-open" data-id="${t.id}">تعديل</button></td>
          </tr>`; }).join('') || `<tr><td colspan="6">${empty('لم يُضف أحد بعد.')}</td></tr>`}</tbody>
      </table></div></div>
      <div class="nbx-grid">
        ${card(ROLE.coordinator[0], permList('coordinator'), '', 'صلاحياته في جامعتك')}
        ${card(ROLE.supervisor[0], permList('supervisor'), '', 'صلاحياته في جامعتك')}
      </div>
      <p class="nbx-foot-note nbx-foot-tight">يدخل كل عضو ببريده الجامعي، ويُفتح له ما يخص دوره فقط. تختلف الجامعات: في بعضها يضع منسق المساق الشعب والامتحانات، ويكتفي المشرف بمتابعة طلابه؛ اضبط ذلك من <button type="button" class="nbx-inline" data-nbx-go="usettings">إعدادات الجامعة</button>.</p>`;
  }

  const sf = { tab: 'all', sec: 'all', q: '', limit: 15 };
  function ustudents(body, act) {
    sync();
    const u = U(), x = myOrg(), all = students(), q = sf.q.trim();
    const secName = id => (u.sections.find(s => s.id === id) || {}).name || '';
    act.innerHTML = `<button type="button" class="nbx-btn nbx-btn-primary" data-nbxu-act="roster-add"${u.sections.length ? '' : ' disabled'}>${ic('plus', 16)}إضافة طلاب للقائمة</button>`;
    const is = { all: () => true, risk: s => s.reg && s.risk && !s.off, new: s => !s.reg, off: s => s.off };
    const tab = (id, label) => `<button type="button" class="${sf.tab === id ? 'is-on' : ''}" data-nbxu-act="stu-filter" data-v="${id}">${label} <em>${n(all.filter(is[id]).length)}</em></button>`;
    const rows = all.filter(s => (is[sf.tab] || is.all)(s) && (sf.sec === 'all' || s.sec === sf.sec) && (!q || (s.name || '').includes(q) || s.num.includes(q) || s.email.includes(q.toLowerCase())))
      .sort((a, b) => (sf.tab === 'risk' ? a.avg - b.avg : 0));
    body.innerHTML = `
      <div class="nbx-toolbar">
        <div class="nbx-tabs" role="group" aria-label="تصفية الطلاب">${tab('all', 'الكل')}${tab('risk', 'يحتاجون متابعة')}${tab('new', 'لم يسجّلوا بعد')}${tab('off', 'موقوفون')}</div>
        <div class="nbx-toolbar-end"><label class="nbx-field nbx-field-inline"><span class="nbx-sr">الشعبة</span><select data-nbxu-select="sec"><option value="all">كل الشعب</option>${u.sections.map(s => `<option value="${s.id}"${sf.sec === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
        <label class="nbx-search">${ic('search', 16)}<input type="search" data-nbxu-input="q" value="${esc(sf.q)}" placeholder="ابحث بالاسم أو الرقم الجامعي"></label></div>
      </div>
      <div class="nbx-card nbx-table-card"><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>الطالب</th><th>الشعبة</th><th>الجلسات</th><th>إنجاز الواجبات</th><th>متوسط الأداء</th><th>آخر نشاط</th><th>الحساب</th><th><span class="nbx-sr">إجراء</span></th></tr></thead>
        <tbody>${rows.slice(0, sf.limit).map(s => `<tr>
          <td><b>${esc(shown(s))}</b>${u.policy.adminSeesNames && s.name ? `<small dir="ltr">${esc(s.email)}</small>` : ''}</td>
          <td>${esc(secName(s.sec))}</td>
          ${s.reg ? `<td class="nbx-num">${n(s.sessions)}</td>
          <td class="nbx-num"><span>${n(s.done)}%</span>${bar(s.done, 100, s.done < 60 ? 'warn' : '')}</td>
          <td class="nbx-num">${s.fresh ? '—' : score(s.avg)}</td>
          <td class="nbx-num">${esc(idleText(s.idle))}</td>
          <td>${s.off ? chip('موقوف', 'bad') : s.risk ? chip('يحتاج متابعة', 'warn') : chip('مسجّل', 'ok')}${s.risk && !s.off ? `<small>${esc(riskWhy(s))}</small>` : ''}</td>
          <td><button type="button" class="nbx-btn nbx-btn-quiet" data-nbxu-act="stu-toggle" data-id="${s.id}">${s.off ? 'إعادة تفعيل' : 'إيقاف'}</button></td>`
          : `<td class="nbx-num">—</td><td class="nbx-num">—</td><td class="nbx-num">—</td><td class="nbx-num">—</td>
          <td>${chip('لم يسجّل بعد', 'muted')}</td>
          <td>${s.added ? `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbxu-act="roster-remove" data-id="${s.id}" data-nbx-confirm="تأكيد الحذف">حذف من القائمة</button>` : ''}</td>`}
        </tr>`).join('') || `<tr><td colspan="8">${empty('لا يوجد طلاب بهذه التصفية.')}</td></tr>`}</tbody></table>
        ${rows.length > sf.limit ? `<div class="nbx-more"><button type="button" class="nbx-btn nbx-btn-quiet" data-nbxu-act="stu-more">عرض المزيد (${n(rows.length - sf.limit)})</button></div>` : ''}</div></div>
      <p class="nbx-foot-note nbx-foot-tight">القائمة هي بريد كل طالب مسموح له. من ينشئ حسابه ببريد منها يدخل إلى شعبته مباشرة، ومن ليس فيها لا يدخل ضمن الجامعة. ${u.policy.adminSeesNames ? '' : 'أسماء الطلاب مخفية عن إدارة الجامعة حسب إعدادات الخصوصية.'} المتاح: ${n(Math.max(0, x.seats - all.length))} مقعداً من ${n(x.seats)}.</p>`;
  }

  function ulibrary(body, act) {
    const u = U(), x = myOrg(), list = C.cases();
    act.innerHTML = `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbxu-act="case-request">${ic('plus', 16)}طلب حالة من نبض</button>`;
    if (!list) { body.innerHTML = empty('جارٍ تحميل الحالات…'); C.loadCases().then(() => C.render()); return; }
    const r = C.rng(x.id + ':cases');
    body.innerHTML = `
      <div class="nbx-banner nbx-banner-info">${ic('rules')}<span><b>الحالات من مكتبة نبض.</b> تختار الجامعة ما يُفتح لطلابها. لا تضيف الجامعة حالات ولا تعدّل محتواها أو تقييمها؛ يكتبها فريق نبض ويراجعها طبيب.</span></div>
      <div class="nbx-card nbx-table-card"><header class="nbx-card-head"><h2>غرفة الطوارئ <small>${n(list.filter(c => caseOpen(c.id)).length)} من ${n(list.length)} حالات مفتوحة لطلابك</small></h2></header><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>الحالة</th><th>المريض</th><th>المراجعة الطبية</th><th>جلسات طلابك</th><th>متوسط أدائهم</th><th>متاحة لطلابك</th></tr></thead>
        <tbody>${list.map(c => { const rv = C.reviewOf(c), ses = Math.round(18 + r() * 70), avg = Math.round(68 + r() * 20), on = caseOpen(c.id); return `<tr>
          <td><b>${esc(c.dx)}</b><small dir="ltr">${esc(c.en)}</small></td>
          <td><span class="nbx-nowrap">${esc(c.patient)}</span><small>${esc(c.sex)} · ${n(c.age)} سنة</small></td>
          <td>${chip(rv[0], rv[1])}</td>
          <td class="nbx-num">${on ? n(ses) : '—'}</td>
          <td class="nbx-num">${on ? score(avg) : '—'}</td>
          <td><label class="nbx-switch nbx-switch-solo"><input type="checkbox" role="switch" data-nbxu-case="${c.id}"${on ? ' checked' : ''} aria-label="${esc(c.dx)}: متاحة لطلابك"><i aria-hidden="true"></i><span>${on ? 'مفتوحة' : 'مغلقة'}</span></label></td>
        </tr>`; }).join('')}</tbody></table></div></div>
      ${u.requests.length ? card('طلباتك من نبض', `<ul class="nbx-assigns">${u.requests.map(k => `<li><span><b>${esc(k.title)}</b><small>${esc(k.why || '')}</small></span>${chip('أُرسل إلى فريق المحتوى', 'info')}</li>`).join('')}</ul>`) : ''}
      <div class="nbx-grid">
        <section class="nbx-card nbx-soon"><span class="nbx-soon-ic">${ic('pulse', 22)}</span><div><h2>الغرف التخصصية</h2><p>تظهر هنا لتفتحها لطلابك عند إطلاقها.</p></div>${chip('قيد الإعداد', 'muted')}</section>
        <section class="nbx-card nbx-soon"><span class="nbx-soon-ic">${ic('cube', 22)}</span><div><h2>غرف العمليات ثلاثية الأبعاد</h2><p>غرف محاكاة جراحية، تُضاف إلى مكتبتك عند إطلاقها.</p></div>${chip('قريباً', 'teal')}</section>
      </div>`;
  }

  function sectionRows() {
    const x = myOrg(), u = U(), F = C.orgFigures(x), all = students();
    return u.sections.map((s, i) => {
      const mine = all.filter(k => k.sec === s.id && k.reg), c = F.cohorts[i] || {}, r = C.rng(x.id + ':safe:' + s.id);
      return { s, course: courseOf(s.course), sup: (staffOf(s.sup) || {}).name || 'لم يُعيَّن', size: listed(u, s), reg: mine.length, sessions: mine.reduce((a, k) => a + k.sessions, 0),
        done: mine.length ? Math.round(mine.reduce((a, k) => a + k.done, 0) / mine.length) : 0, score: c.score || 0, safety: Math.round(74 + r() * 19), risk: mine.filter(k => k.risk && !k.off).length };
    });
  }
  function ureports(body, act) {
    sync();
    const x = myOrg(), rows = sectionRows(), list = C.cases() || [], r = C.rng(x.id + ':cases');
    act.innerHTML = `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbxu-act="reports-export">${ic('download', 16)}تصدير تقرير الشعب (CSV)</button>`;
    const tot = rows.reduce((a, k) => a + k.reg, 0) || 1;
    body.innerHTML = `
      <div class="nbx-kpis">
        ${kpi('الشعب', n(rows.length), `${n(U().courses.length)} مساقات`)}
        ${kpi('جلسات التدريب', n(rows.reduce((a, k) => a + k.sessions, 0)), 'هذا الفصل')}
        ${kpi('إنجاز الواجبات', `${n(Math.round(rows.reduce((a, k) => a + k.done * k.reg, 0) / tot))}%`, 'متوسط الشعب')}
        ${kpi('الالتزام بقواعد السلامة', `${n(Math.round(rows.reduce((a, k) => a + k.safety * k.reg, 0) / tot))}%`, 'متوسط الشعب')}
      </div>
      <div class="nbx-card nbx-table-card"><header class="nbx-card-head"><h2>الأداء حسب الشعبة</h2><span class="nbx-card-meta">هذا الفصل</span></header><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>الشعبة</th><th>المشرف</th><th>المسجّلون</th><th>الجلسات</th><th>إنجاز الواجبات</th><th>متوسط الأداء</th><th>الالتزام بالسلامة</th><th>يحتاجون متابعة</th></tr></thead>
        <tbody>${rows.map(k => `<tr><td><b>${esc(k.s.name)}</b><small dir="ltr">${esc(k.course.code)}</small></td><td>${esc(k.sup)}</td><td class="nbx-num">${n(k.reg)} / ${n(k.size)}</td><td class="nbx-num">${n(k.sessions)}</td>
          <td class="nbx-num"><span>${n(k.done)}%</span>${bar(k.done, 100, k.done < 70 ? 'warn' : '')}</td><td class="nbx-num">${k.reg ? score(k.score) : '—'}</td><td class="nbx-num"><span>${n(k.safety)}%</span>${bar(k.safety, 100, k.safety < 80 ? 'warn' : '')}</td><td class="nbx-num">${k.risk ? `<span class="nbx-warn-t">${n(k.risk)}</span>` : '0'}</td></tr>`).join('') || `<tr><td colspan="8">${empty('لا توجد شعب بعد.')}</td></tr>`}</tbody></table></div></div>
      <div class="nbx-card nbx-table-card"><header class="nbx-card-head"><h2>الأداء حسب الحالة</h2><span class="nbx-card-meta">الحالات المفتوحة لطلابك</span></header><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>الحالة</th><th>الجلسات</th><th>متوسط الأداء</th><th>الالتزام بالسلامة</th></tr></thead>
        <tbody>${list.map(c => { const ses = Math.round(18 + r() * 70), avg = Math.round(68 + r() * 20), safe = Math.min(97, Math.round(avg + 3 + (c.id.length % 5))); return caseOpen(c.id) ? `<tr><td><b>${esc(c.dx)}</b><small dir="ltr">${esc(c.en)}</small></td><td class="nbx-num">${n(ses)}</td><td class="nbx-num">${score(avg)}</td><td class="nbx-num"><span>${n(safe)}%</span>${bar(safe, 100, safe < 80 ? 'warn' : '')}</td></tr>` : ''; }).join('') || `<tr><td colspan="4">${empty('جارٍ تحميل الحالات…')}</td></tr>`}</tbody></table></div></div>
      <p class="nbx-foot-note nbx-foot-tight">تقرير الطالب المفصّل (إجاباته وملاحظات المشرف) يقرؤه مشرف الشعبة من بوابته. الأرقام توضيحية في بيئة العرض.</p>`;
    if (!C.cases()) C.loadCases().then(() => C.render());
  }

  const YEARS = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'];
  /* the pass mark of a section: its course's year, read from the course number as universities write it
     (NUR-401 is a fourth-year course, MED-512 a fifth-year one); 70 when the number says none */
  const passMark = name => {
    const u = U(), sec = u.sections.find(s => s.name === name), c = sec && u.courses.find(k => k.id === sec.course);
    const y = c && /(\d)\d\d/.exec(c.code || ''), m = y && Number((u.policy.passMarks || {})[Number(y[1])]);
    return m || 70;
  };
  function usettings(body) {
    const x = myOrg(), u = U(), p = u.policy;
    const sample = (u.staff.find(t => t.role === 'coordinator') || u.staff[0] || {}).email || '';
    const sw = (k, label, note) => `<label class="nbx-switch"><span><b>${esc(label)}</b>${note ? `<small>${esc(note)}</small>` : ''}</span><input type="checkbox" role="switch" data-nbxu-policy="${k}"${p[k] ? ' checked' : ''}><i aria-hidden="true"></i></label>`;
    body.innerHTML = `
      <div class="nbx-grid">
        ${card('بيانات الجامعة', `<dl class="nbx-dl">
            <div><dt>الجامعة</dt><dd>${esc(x.name)}</dd></div>
            <div><dt>بريد الجامعة</dt><dd dir="ltr" class="nbx-refs">@${esc(x.domain)}</dd></div>
            <div><dt>الباقة</dt><dd>${esc(C.PLANS[x.plan].name)}</dd></div>
            <div><dt>المقاعد</dt><dd class="nbx-num">${n(x.used)} / ${n(x.seats)}</dd></div>
            <div><dt>بداية العقد</dt><dd class="nbx-num">${esc(day(x.start))}</dd></div>
            <div><dt>نهاية العقد</dt><dd class="nbx-num">${esc(day(x.end))}</dd></div>
          </dl><p class="nbx-foot-note">العقد والباقة وعدد المقاعد تُدار من إدارة منصة نبض. لتعديلها تواصل مع مدير حسابك.</p>`, '', 'للقراءة فقط')}
        ${card('ما لا تملكه الجامعة', `<ul class="nbx-perms nbx-perms-no">
            <li>${ic('alert', 15)}لا تضيف حالات ولا تعدّل محتواها: تختار من مكتبة نبض فقط.</li>
            <li>${ic('alert', 15)}لا تغيّر أوزان التقييم ولا قواعد سلامة الأوامر.</li>
            <li>${ic('alert', 15)}لا ترى بيانات جامعة أخرى ولا طلابها.</li>
            <li>${ic('alert', 15)}لا تصل إلى قاعدة بيانات المنصة: تقرأ تقارير جامعتها فقط.</li>
          </ul>`, '', 'حدود ثابتة لكل المؤسسات')}
        ${card('كيف يدخل منتسبو الجامعة', `<ol class="nbx-steps">
            <li class="is-done"><b>الجامعة تسلّم قائمة البريد</b><small>بريد كل طالب وكل عضو في الكادر، مع دوره وشعبته</small></li>
            <li class="is-done"><b>كل شخص ينشئ حسابه ببريده الجامعي</b><small>من صفحة التسجيل نفسها للجميع، أو بحساب Microsoft الجامعي لاحقاً</small></li>
            <li class="is-done"><b>المنصة تتعرّف على البريد</b><small>الطالب يدخل شعبته، والمشرف بوابته، وإدارة الجامعة هذه اللوحة</small></li>
            <li><b>بريد خارج القائمة لا يدخل ضمن الجامعة</b><small>حتى لو كان على بريد الجامعة نفسه</small></li>
          </ol>${sample ? `<p class="nbx-foot-note">للتجربة: اكتب في شاشة الدخول بريداً من القائمة، مثل <code dir="ltr" class="nbx-kbd">${esc(sample)}</code>، وسيظهر تحته ما تعرّفت عليه المنصة.</p>` : ''}
          <div class="nbx-switches nbx-sep">
            ${sw('adminSeesNames', 'إدارة الجامعة ترى أسماء الطلاب ودرجاتهم', 'وإلا ترى أرقاماً مجمّعة وأرقاماً جامعية فقط')}
            ${sw('supSeesNames', 'المشرف يرى أسماء طلاب شعبه ودرجاتهم', 'شعبه فقط، لا شعب غيره')}
          </div>`, '', 'الدخول والخصوصية')}
        ${card('من ينشئ الشعب ويسند الحالات', `<div class="nbx-switches">
            ${sw('coordSections', 'منسق المساق ينشئ شعب مساقه', 'وإلا فإنشاء الشعب لإدارة الجامعة فقط')}
            ${sw('coordAssign', 'منسق المساق يسند الحالات والامتحانات', 'لكل شعب مساقه')}
            ${sw('supSections', 'المشرف ينشئ شعبه', 'في الجامعات التي يدير فيها المشرف شعبه بنفسه')}
            ${sw('supAssign', 'المشرف يسند الحالات لشعبه', 'وإلا فوظيفته متابعة طلابه فقط')}
            ${sw('supPublish', 'المشرف يعتمد نتائج طلابه وينشرها', 'وإلا يعتمدها منسق المساق')}
          </div>`, '', 'تختلف من جامعة لأخرى')}
        ${card('علامة النجاح في غرفة الطوارئ', `<div class="nbx-marks">${YEARS.map((y, i) => `<label class="nbx-field"><span>السنة ${y}</span><input type="number" inputmode="numeric" min="40" max="95" step="5" value="${Number(p.passMarks[i + 1]) || 70}" data-nbxu-pass="${i + 1}" aria-label="علامة النجاح للسنة ${y}"></label>`).join('')}</div>
          <p class="nbx-foot-note">سنة الشعبة من رقم مساقها (NUR-401 مساق سنة رابعة). من 40 إلى 95. الحالة التي فيها خطأ حرج غير مجتازة مهما كانت درجتها، وهذه قاعدة ثابتة من نبض لا تتغيّر من هنا.</p>`, '', 'لكل سنة دراسية')}
      </div>
      <p class="nbx-foot-note nbx-foot-tight">في بيئة العرض تتعرّف شاشة الدخول على البريد وتعرض الجهة والدور، وتُحفظ هذه الإعدادات وتظهر في صفحات اللوحة. فرض الدخول حسب القائمة والصلاحيات يتم على خادم المنصة في المرحلة التالية.</p>`;
  }

  C.addPages({
    uhome: ['لوحة الجامعة', () => { const x = myOrg(); return `${x.name} · ما تحتاج إدارته اليوم: الشعب، الكادر، الطلاب، ونتائج التدريب.`; }, uhome],
    ucourses: ['المساقات والشعب', 'أنشئ المساق، ثم شعبه، وعيّن لكل شعبة مشرفاً وأضف طلابها.', ucourses],
    ustaff: ['الكادر الأكاديمي', 'إدارة الجامعة، منسقو المساقات، والمشرفون: من يدرّس ماذا، وما صلاحية كل دور.', ustaff],
    ustudents: ['الطلاب', 'قائمة طلاب الجامعة: من سجّل حسابه، نشاطه، إنجازه، ومن يحتاج متابعة.', ustudents],
    ulibrary: ['مكتبة الحالات', 'الحالات التي يتدرّب عليها طلابك، من مكتبة نبض المعتمدة.', ulibrary],
    ureports: ['التقارير', 'نتائج التدريب على مستوى الجامعة: كل شعبة، كل حالة.', ureports],
    usettings: ['إعدادات الجامعة', 'بيانات العقد، طريقة الدخول، صلاحيات الأدوار داخل الجامعة، والخصوصية.', usettings]
  });

  /* on an institution's page of the platform's admin: who may enter as this institution */
  C.setOrgCard(x => {
    const u = U(x), all = students(x), reg = all.filter(s => s.reg).length;
    return card('قائمة المنتسبين', `<dl class="nbx-dl">
        <div><dt>طلاب في القائمة</dt><dd class="nbx-num">${n(all.length)} / ${n(x.seats)} مقعداً</dd></div>
        <div><dt>سجّلوا حساباتهم</dt><dd class="nbx-num">${n(reg)} (${pct(reg, all.length)}%)</dd></div>
        <div><dt>الكادر الأكاديمي</dt><dd class="nbx-num">${n(u.staff.length)} أعضاء</dd></div>
        <div><dt>بريد المؤسسة</dt><dd dir="ltr" class="nbx-refs">@${esc(x.domain)}</dd></div>
      </dl><p class="nbx-foot-note">تسلّم المؤسسة بريد طلابها وكادرها. من ينشئ حسابه ببريد من القائمة يدخل إلى مؤسسته ودوره مباشرة، ومن ليس فيها لا يدخل ضمنها.</p>
      <div class="nbx-card-act"><button type="button" class="nbx-btn nbx-btn-quiet" data-nbxu-act="roster-add" data-org="${x.id}"${u.sections.length ? '' : ' disabled'}>${ic('upload', 16)}إضافة طلاب للقائمة</button></div>`, '', 'من يدخل ضمن هذه المؤسسة');
  });

  /* ---------- drawers ---------- */
  function courseForm(c) {
    const isNew = !c;
    c = c || { code: '', name: '', track: 'التمريض' };
    C.openDrawer(isNew ? 'إضافة مساق' : 'تعديل: ' + c.code + ' · ' + c.name, `<form class="nbx-form" novalidate>
      <div class="nbx-form-2">${field('رمز المساق', `<input name="code" dir="ltr" required maxlength="12" value="${esc(c.code)}" placeholder="NUR-401">`)}
      ${field('المسار', `<select name="track">${['التمريض', 'الطب', 'تعليم مستمر'].map(t => `<option${t === c.track ? ' selected' : ''}>${t}</option>`).join('')}</select>`)}</div>
      ${field('اسم المساق', `<input name="name" required maxlength="80" value="${esc(c.name)}" placeholder="مثلاً: تمريض الطوارئ">`)}
      ${isNew || U().sections.some(k => k.course === c.id) ? (isNew ? '' : '<p class="nbx-foot-note">لا يُحذف مساق فيه شعب. احذف شعبه الفارغة أولاً.</p>') : ''}
      ${formEnd(isNew ? 'إضافة المساق' : 'حفظ التغييرات', isNew || U().sections.some(k => k.course === c.id) ? '' : `<button type="button" class="nbx-btn nbx-btn-danger" data-nbxu-act="course-delete" data-id="${c.id}" data-nbx-confirm="تأكيد الحذف">حذف</button>`)}
    </form>`, fd => {
      const code = String(fd.get('code') || '').trim().toUpperCase(), name = String(fd.get('name') || '').trim();
      if (!/^[A-Z]{2,5}-?\d{2,4}$/.test(code)) return 'رمز المساق غير صحيح، مثل: NUR-401';
      if (!name) return 'اكتب اسم المساق.';
      if (U().courses.some(k => k.code === code && k !== c)) return 'هذا الرمز مستخدم لمساق آخر.';
      if (isNew) { U().courses.push({ id: uid('c'), code, name, track: fd.get('track') }); C.log(`أضاف مساق «${code} ${name}»`, 'org'); toast('أُضيف المساق.'); }
      else { Object.assign(c, { code, name, track: fd.get('track') }); C.log(`حدّث مساق «${code}»`, 'org'); toast('حُفظت التغييرات.'); }
      sync();
    });
  }
  function sectionForm(s, courseId) {
    const u = U(), isNew = !s;
    s = s || { course: courseId || u.courses[0].id, name: '', cap: 40, sup: '', size: 0 };
    const have = isNew ? 0 : listed(u, s), sups = u.staff.filter(t => t.status !== 'off' && t.role !== 'uadmin');
    C.openDrawer(isNew ? 'إضافة شعبة' : 'تعديل: ' + s.name, `<form class="nbx-form" novalidate>
      ${field('المساق', `<select name="course">${u.courses.map(c => `<option value="${c.id}"${c.id === s.course ? ' selected' : ''}>${esc(c.code + ' · ' + c.name)}</option>`).join('')}</select>`)}
      ${field('اسم الشعبة', `<input name="name" required maxlength="80" value="${esc(s.name)}" placeholder="مثلاً: تمريض الطوارئ · شعبة 3">`)}
      <div class="nbx-form-2">${field('المشرف', `<select name="sup"><option value="">لم يُعيَّن بعد</option>${sups.map(t => `<option value="${t.id}"${t.id === s.sup ? ' selected' : ''}>${esc(t.name)}${t.status === 'invited' ? ' (لم يسجّل بعد)' : ''}</option>`).join('')}</select>`)}
      ${field('السعة', `<input name="cap" type="number" min="${Math.max(1, have)}" max="400" value="${esc(s.cap)}">`)}</div>
      ${isNew ? '<p class="nbx-foot-note">بعد الإضافة أضف طلاب الشعبة إلى قائمتها ببريدهم الجامعي.</p>' : `<p class="nbx-foot-note">${n(have)} طالباً في قائمة الشعبة.${have ? ' لا تُحذف شعبة فيها طلاب.' : ''}</p>`}
      ${formEnd(isNew ? 'إضافة الشعبة' : 'حفظ التغييرات', isNew || have ? '' : `<button type="button" class="nbx-btn nbx-btn-danger" data-nbxu-act="section-delete" data-id="${s.id}" data-nbx-confirm="تأكيد الحذف">حذف</button>`)}
    </form>`, fd => {
      const name = String(fd.get('name') || '').trim(), cap = Math.max(have || 1, parseInt(fd.get('cap'), 10) || 1);
      if (!name) return 'اكتب اسم الشعبة.';
      if (u.sections.some(k => k.name === name && k !== s)) return 'توجد شعبة بهذا الاسم.';
      const data = { course: fd.get('course'), name, cap, sup: fd.get('sup') || '' };
      if (isNew) { u.sections.push(Object.assign({ id: uid('s'), size: 0 }, data)); C.log(`أضاف شعبة «${name}»`, 'org'); toast('أُضيفت الشعبة.'); }
      else { Object.assign(s, data); C.log(`حدّث شعبة «${name}»`, 'org'); toast('حُفظت التغييرات.'); }
      sync();
    });
  }
  function staffForm(t) {
    const u = U(), x = myOrg(), isNew = !t;
    t = t || { name: '', email: '', role: 'supervisor', status: 'invited', courses: [] };
    C.openDrawer(isNew ? 'إضافة عضو للكادر' : 'تعديل: ' + t.name, `<form class="nbx-form" novalidate>
      ${field('الاسم', `<input name="name" required maxlength="80" value="${esc(t.name)}">`)}
      ${field('البريد الجامعي', `<input name="email" type="email" dir="ltr" required maxlength="120" value="${esc(t.email)}" placeholder="name@${esc(x.domain)}">`, `يدخل به إلى المنصة، ويجب أن ينتهي بـ @${esc(x.domain)}`)}
      <div class="nbx-form-2">${field('الدور', `<select name="role" data-nbxu-role>${Object.entries(ROLE).map(([k, v]) => `<option value="${k}"${k === t.role ? ' selected' : ''}>${v[0]}</option>`).join('')}</select>`)}
      ${isNew ? '' : field('الحساب', `<select name="status"><option value="active"${t.status === 'active' ? ' selected' : ''}>مسجّل</option><option value="invited"${t.status === 'invited' ? ' selected' : ''}>لم يسجّل بعد</option><option value="off"${t.status === 'off' ? ' selected' : ''}>موقوف</option></select>`)}</div>
      <fieldset class="nbx-field"><legend>مساقات ينسّقها (لمنسق المساق)</legend><div class="nbx-checks">${u.courses.map(c => `<label class="nbx-check"><input type="checkbox" name="courses" value="${c.id}"${(t.courses || []).includes(c.id) ? ' checked' : ''}><span>${esc(c.code + ' · ' + c.name)}</span></label>`).join('') || empty('أضف المساقات أولاً.')}</div></fieldset>
      <div class="nbx-perm"><h3 class="nbx-sub">صلاحيات هذا الدور في جامعتك</h3><div data-nbxu-perms>${permList(t.role)}</div></div>
      ${isNew ? '' : `<p class="nbx-foot-note">شعبه: ${esc(u.sections.filter(s => s.sup === t.id).map(s => s.name).join('، ') || 'لا شعب بعد')}. تُسند الشعب من صفحة المساقات والشعب.</p>`}
      ${formEnd(isNew ? 'إضافة للكادر' : 'حفظ التغييرات', isNew ? '' : `<button type="button" class="nbx-btn nbx-btn-danger" data-nbxu-act="staff-delete" data-id="${t.id}" data-nbx-confirm="تأكيد الحذف">حذف</button>`)}
    </form>`, fd => {
      const name = String(fd.get('name') || '').trim(), email = String(fd.get('email') || '').trim().toLowerCase();
      if (!name) return 'اكتب الاسم.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'البريد الإلكتروني غير صحيح.';
      if (!email.endsWith('@' + x.domain) && !email.endsWith('.' + x.domain)) return `البريد يجب أن ينتهي بـ @${x.domain}`;
      if (u.staff.some(k => k.email === email && k !== t)) return 'هذا البريد مسجل لعضو آخر.';
      const role = fd.get('role'), status = isNew ? 'invited' : fd.get('status');
      if (!isNew && t.role === 'uadmin' && (role !== 'uadmin' || status !== 'active') && u.staff.filter(k => k.role === 'uadmin' && k.status === 'active').length < 2) return 'يجب أن يبقى للجامعة حساب إدارة واحد نشط على الأقل.';
      const data = { name, email, role, courses: role === 'coordinator' ? fd.getAll('courses') : [] };
      if (isNew) { u.staff.push(Object.assign({ id: uid('t'), status }, data)); C.log(`أضاف ${name} إلى كادر الجامعة بدور «${ROLE[role][0]}»`, 'users'); toast('أُضيف إلى قائمة الكادر. يدخل ببريده الجامعي.'); }
      else { Object.assign(t, data, { status }); C.log(`حدّث حساب ${name}`, 'users'); toast('حُفظت التغييرات.'); }
      C.save();
    });
  }
  /* students are added by e-mail: one per line, an optional name after a comma; a CSV file fills the same box */
  function rosterForm(x, secId) {
    const u = U(x);
    C.openDrawer('إضافة طلاب للقائمة', `<form class="nbx-form" novalidate>
      <p class="nbx-text"><b>${esc(x.name)}</b> · المتاح ${n(Math.max(0, x.seats - students(x).length))} مقعداً من ${n(x.seats)}</p>
      ${field('الشعبة', `<select name="sec">${u.sections.map(s => `<option value="${s.id}"${s.id === secId ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>`)}
      ${field('بريد الطلاب', `<textarea name="list" rows="7" dir="ltr" placeholder="abc0231184@${esc(x.domain)}, الاسم الكامل&#10;def0229047@${esc(x.domain)}"></textarea>`, 'بريد واحد في كل سطر، ويمكن كتابة الاسم بعد فاصلة')}
      <label class="nbx-btn nbx-btn-quiet nbx-file nbx-file-wide">${ic('upload', 16)}أو اختر ملف CSV (البريد، الاسم)<input type="file" accept=".csv,text/csv,text/plain" data-nbxu-file></label>
      <p class="nbx-foot-note">من ينشئ حسابه ببريد من هذه القائمة يدخل إلى شعبته مباشرة. لا يُقبل بريد خارج @${esc(x.domain)}.</p>
      ${formEnd('إضافة إلى القائمة')}
    </form>`, fd => {
      const sec = u.sections.find(s => s.id === fd.get('sec'));
      if (!sec) return 'اختر الشعبة.';
      const have = new Set(students(x).map(s => s.email)), add = [];
      let bad = 0, dup = 0;
      String(fd.get('list') || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(l => {
        const [mail, ...rest] = l.split(/[,;\t]/), email = String(mail || '').trim().replace(/^"|"$/g, '').toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !(email.endsWith('@' + x.domain) || email.endsWith('.' + x.domain))) { bad++; return; }
        if (have.has(email)) { dup++; return; }
        have.add(email); add.push({ id: uid('r'), email, name: rest.join(' ').trim().replace(/^"|"$/g, '').slice(0, 80), sec: sec.id });
      });
      if (!add.length) return bad ? `لم يُضف أحد: ${n(bad)} سطراً ليس بريداً على @${x.domain}.` : dup ? 'كل هذا البريد موجود في القائمة.' : 'اكتب بريد الطلاب، واحداً في كل سطر.';
      if (students(x).length + add.length > x.seats) return `القائمة تتجاوز مقاعد العقد (${n(x.seats)}). اطلب مقاعد إضافية من إدارة نبض.`;
      u.extra.push(...add);
      sec.cap = Math.max(sec.cap, listed(u, sec));
      C.log(`أضاف ${add.length} طالباً إلى قائمة «${sec.name}» (${x.name})`, 'users');
      toast(`أُضيف ${n(add.length)} إلى القائمة${bad + dup ? `، وتُرك ${n(bad + dup)} (مكرر أو خارج بريد الجامعة)` : ''}.`);
      sf.tab = 'new'; sf.sec = 'all'; sf.limit = 15;
      sync(x);
    });
  }
  function caseRequest() {
    C.openDrawer('طلب حالة من نبض', `<form class="nbx-form" novalidate>
      ${field('الحالة المطلوبة', `<input name="title" required maxlength="90" placeholder="مثلاً: نوبة صرع عند طفل">`)}
      ${field('لماذا تحتاجها جامعتك', `<textarea name="why" rows="3" maxlength="240" placeholder="المساق، والمهارة التي يتدرّب عليها الطلاب"></textarea>`)}
      <p class="nbx-foot-note">يصل الطلب إلى فريق المحتوى في نبض. تُكتب الحالة وتُراجع طبياً هناك، ثم تظهر في مكتبتك لتفتحها لطلابك.</p>
      ${formEnd('إرسال الطلب')}
    </form>`, fd => {
      const title = String(fd.get('title') || '').trim();
      if (!title) return 'اكتب الحالة المطلوبة.';
      U().requests.unshift({ id: uid('q'), title, why: String(fd.get('why') || '').trim(), at: new Date().toISOString() });
      C.log(`طلبت ${myOrg().name} حالة جديدة: «${title}»`, 'content');
      toast('أُرسل الطلب إلى فريق نبض.');
      C.save();
    });
  }
  function exportSections() {
    const rows = [['المساق', 'الشعبة', 'المشرف', 'في القائمة', 'المسجّلون', 'الجلسات', 'إنجاز الواجبات %', 'متوسط الأداء %', 'الالتزام بالسلامة %', 'يحتاجون متابعة']]
      .concat(sectionRows().map(k => [k.course.code, k.s.name, k.sup, k.size, k.reg, k.sessions, k.done, k.score, k.safety, k.risk]));
    const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'nabd-university-sections.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- events ---------- */
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-nbxu-act]');
    if (!b || b.disabled) return;
    const a = b.getAttribute('data-nbxu-act'), id = b.getAttribute('data-id');
    if (a === 'roster-add') { const x = S().unis.find(k => k.id === b.getAttribute('data-org')) || myOrg(); if (U(x).sections.length) rosterForm(x, b.getAttribute('data-sec')); return; }
    const u = U();
    switch (a) {
      case 'course-new': courseForm(null); break;
      case 'course-edit': courseForm(u.courses.find(c => c.id === id)); break;
      case 'section-new': if (u.courses.length) sectionForm(null, b.getAttribute('data-course')); break;
      case 'section-edit': sectionForm(u.sections.find(s => s.id === id)); break;
      case 'section-delete': { const s = u.sections.find(k => k.id === id); if (s && !listed(u, s)) { u.sections = u.sections.filter(k => k !== s); C.log(`حذف شعبة «${s.name}»`, 'org'); sync(); C.closeDrawer(); toast('حُذفت الشعبة.'); C.render(); } break; }
      case 'course-delete': { const c = u.courses.find(k => k.id === id); if (c && !u.sections.some(k => k.course === c.id)) { u.courses = u.courses.filter(k => k !== c); u.staff.forEach(t => { t.courses = (t.courses || []).filter(k => k !== c.id); }); C.log(`حذف مساق «${c.code}»`, 'org'); C.save(); C.closeDrawer(); toast('حُذف المساق.'); C.render(); } break; }
      case 'staff-delete': {
        const t = u.staff.find(k => k.id === id); if (!t) break;
        let mine = ''; try { mine = String(authState.user.email || '').toLowerCase(); } catch (err) {}
        if (t.email === mine) { toast('لا تحذف حسابك أنت.'); break; }
        if (t.role === 'uadmin' && u.staff.filter(k => k.role === 'uadmin' && k.status === 'active').length < 2) { toast('يجب أن يبقى للجامعة حساب إدارة واحد نشط على الأقل.'); break; }
        u.staff = u.staff.filter(k => k !== t); u.sections.forEach(k => { if (k.sup === t.id) k.sup = ''; });
        C.log(`حذف ${t.name} من كادر الجامعة`, 'users'); C.save(); C.closeDrawer(); toast('حُذف من الكادر. شعبه صارت دون مشرف.'); C.render(); break;
      }
      case 'staff-new': staffForm(null); break;
      case 'staff-open': staffForm(u.staff.find(t => t.id === id)); break;
      case 'stu-filter': sf.tab = b.getAttribute('data-v'); sf.limit = 15; C.go('ustudents'); break;
      case 'stu-more': sf.limit += 25; C.render(); break;
      case 'stu-toggle': { const on = u.suspended.includes(id); u.suspended = on ? u.suspended.filter(k => k !== id) : u.suspended.concat(id); C.log(on ? 'أعاد تفعيل حساب طالب' : 'أوقف حساب طالب', 'users'); C.save(); toast(on ? 'أُعيد تفعيل الحساب.' : 'أُوقف الحساب.'); C.render(); break; }
      case 'roster-remove': { const k = u.extra.find(r => r.id === id); if (k) { u.extra = u.extra.filter(r => r !== k); C.log(`حذف ${k.email} من قائمة الطلاب`, 'users'); sync(); toast('حُذف من القائمة.'); C.render(); } break; }
      case 'case-request': caseRequest(); break;
      case 'reports-export': exportSections(); break;
    }
  });
  root.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('[data-nbxu-input="q"]')) {
      sf.q = t.value; sf.limit = 15;
      const pos = t.selectionStart; C.render();
      const again = root.querySelector('[data-nbxu-input="q"]');
      if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (err) {} }
    } else if (t.matches('[data-nbxu-role]')) {
      const box = t.form && t.form.querySelector('[data-nbxu-perms]');
      if (box) box.innerHTML = permList(t.value);
    }
  });
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-nbxu-file]') && t.files && t.files[0]) {
      const reader = new FileReader(), box = t.form && t.form.querySelector('[name="list"]');
      reader.onload = () => { if (box) box.value = String(reader.result || '').replace(/^﻿/, '').trim(); };
      reader.readAsText(t.files[0]);
      return;
    }
    if (t.matches('[data-nbxu-select="sec"]')) { sf.sec = t.value; sf.limit = 15; C.render(); return; }
    const u = U();
    if (t.matches('[data-nbxu-case]')) {
      const id = t.getAttribute('data-nbxu-case'), c = (C.cases() || []).find(k => k.id === id);
      u.caseOff = t.checked ? u.caseOff.filter(k => k !== id) : u.caseOff.concat(id);
      C.log(`${t.checked ? 'فتح' : 'أغلق'} حالة «${c ? c.dx : id}» لطلاب ${myOrg().name}`, 'content');
      C.save(); toast(t.checked ? 'فُتحت الحالة لطلابك.' : 'أُغلقت الحالة عن طلابك.'); C.render(); return;
    }
    if (t.matches('[data-nbxu-pass]')) {
      const y = Number(t.getAttribute('data-nbxu-pass')), v = Math.max(40, Math.min(95, Math.round(Number(t.value) || 70)));
      t.value = v;
      if (u.policy.passMarks[y] === v) return;
      u.policy.passMarks[y] = v;
      C.log(`غيّر علامة النجاح في غرفة الطوارئ للسنة ${YEARS[y - 1]} إلى ${v}%`, 'rules');
      C.save(); toast(`علامة النجاح للسنة ${YEARS[y - 1]}: ${C.n(v)}%.`); return;
    }
    if (t.matches('[data-nbxu-policy]')) {
      const k = t.getAttribute('data-nbxu-policy');
      u.policy[k] = t.checked;
      C.log(`غيّر إعداد صلاحيات الجامعة: ${t.closest('label').querySelector('b').textContent} (${t.checked ? 'مفعّل' : 'موقوف'})`, 'rules');
      C.save();
    }
  });

  function whois(value) {
    const email = String(value || '').trim().toLowerCase();
    if (email === 'admin@nabd.demo') return { kind: 'admin' };
    const x = S().unis.find(o => email.endsWith('@' + o.domain) || email.endsWith('.' + o.domain));
    if (!x) return { kind: 'none' };
    if (x.status === 'pending') return { kind: 'blocked', why: `${x.name}: العقد لم يُفعَّل بعد.` };
    const u = U(x), t = u.staff.find(k => k.email === email);
    if (t) return t.status === 'off' ? { kind: 'blocked', why: `${x.name}: هذا الحساب موقوف. راجع إدارة جامعتك.` } : { kind: 'staff', org: x, staff: t };
    const st = students(x).find(k => k.email === email);
    if (!st) return { kind: 'blocked', why: `هذا البريد على ${x.name}، لكنه ليس في قائمتها. راجع إدارة جامعتك لإضافتك.` };
    if (st.off) return { kind: 'blocked', why: `${x.name}: هذا الحساب موقوف. راجع إدارة جامعتك.` };
    const section = u.sections.find(k => k.id === st.sec) || null;
    return { kind: 'student', org: x, student: st, section, course: section ? u.courses.find(c => c.id === section.course) || null : null, supervisor: section ? (u.staff.find(k => k.id === section.sup) || {}).name || '' : '' };
  }
  function markRegistered(x, st) { const k = U(x).extra.find(r => r.id === st.id); if (k && !k.reg) { k.reg = true; C.save(); } }
  window.NabdUni = Object.freeze({ U, myOrg, students, sync, listed, sectionForm, kpi, score, riskWhy, idleText, ROLE, whois, markRegistered, bridge, passMark });

  /* ---------- one sign-in for everyone: what an e-mail is recognised as (shown under the e-mail field) ---------- */
  const PLAT = { professor: 'مشرف أكاديمي', student: 'طالب', practitioner: 'ممارس', uniadmin: 'إدارة الجامعة', reviewer: 'مراجع طبي', editor: 'محرّر محتوى' };
  function recognise(value) {
    const email = String(value || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    if (email === 'admin@nabd.demo') return { ok: true, text: 'بريد معروف: إدارة نبض. تدخل إلى لوحة التحكم.' };
    const x = S().unis.find(o => email.endsWith('@' + o.domain) || email.endsWith('.' + o.domain));
    if (!x) return null;
    if (x.status === 'pending') return { ok: false, text: `${x.name}: العقد لم يُفعَّل بعد.` };
    const u = U(x), t = u.staff.find(k => k.email === email);
    if (t) return t.status === 'off' ? { ok: false, text: `${x.name}: هذا الحساب موقوف. راجع إدارة جامعتك.` }
      : { ok: true, text: `بريد معروف: ${x.name} · ${ROLE[t.role][0]}. تدخل إلى ${t.role === 'uadmin' ? 'لوحة الجامعة' : 'بوابة المشرف'}.` };
    const p = S().users.find(k => k.email === email);
    if (p && PLAT[p.role]) return { ok: true, text: `بريد معروف: ${x.name} · ${PLAT[p.role]}.` };
    const st = students(x).find(k => k.email === email);
    if (st) return st.off ? { ok: false, text: `${x.name}: هذا الحساب موقوف. راجع إدارة جامعتك.` }
      : { ok: true, text: `بريد معروف: ${x.name} · طالب · ${(u.sections.find(k => k.id === st.sec) || {}).name || ''}. تدخل إلى شعبتك مباشرة.` };
    return { ok: false, text: `هذا البريد على ${x.name}، لكنه ليس في قائمتها. راجع إدارة جامعتك لإضافتك.` };
  }
  document.addEventListener('input', e => {
    const t = e.target;
    if (!t || (t.id !== 'login-email' && t.id !== 'reg-email')) return;
    const host = t.closest('.nl-auth-field') || t.parentElement;
    let line = host.querySelector('.nl-auth-roster');
    let hit = null;
    try { hit = recognise(t.value); } catch (err) { hit = null; }
    if (!hit) { if (line) line.remove(); return; }
    if (!line) { line = document.createElement('p'); line.className = 'nl-auth-roster'; line.setAttribute('role', 'status'); host.appendChild(line); }
    line.classList.toggle('is-ok', hit.ok); line.classList.toggle('is-no', !hit.ok);
    line.textContent = hit.text;
  });
})();
