/* The supervisor's console (V6.7.4, 2026-11-15; docs/decisions/0015-admin-console-prototype.md, fourth addendum).
   The legacy academic portal (#view-university) is tied to its own demo records (three universities at once, the
   older specialty cases, join codes) and its scripts are pinned by the legacy baseline, so it could not follow the
   university's sections and roster. This console replaces it for a staff member of a university: the same shell
   as the other consoles, the same demo store, and the university's own settings decide what he may do here
   (assign cases, publish results, see names, create sections). A supervisor sees his sections; a course
   coordinator sees the sections of his courses. Built on 010 (window.NabdConsole) and 020 (window.NabdUni).
   Results are repeatable demo records; nothing here reaches the rooms or changes a case. */
(function () {
  'use strict';
  const C = window.NabdConsole, Un = window.NabdUni;
  if (!C || !Un) return;
  const { root, ic, chip, esc, n, pct, bar, card, empty, day, toast, field } = C;
  const { U, myOrg, students, listed, kpi, score, riskWhy, idleText, ROLE, passMark } = Un;
  const S = () => C.state();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- who is signed in, what he sees, what the university lets him do ---------- */
  const meStaff = () => { let mail = ''; try { mail = String(authState.user.email || '').toLowerCase(); } catch (e) {} return U().staff.find(t => t.email === mail) || null; };
  const scope = () => { const u = U(), t = meStaff(); return t ? u.sections.filter(s => s.sup === t.id || (t.role === 'coordinator' && (t.courses || []).includes(s.course)) || t.role === 'uadmin') : []; };
  function can() {
    const p = U().policy, t = meStaff() || {}, co = t.role === 'coordinator' || t.role === 'uadmin';
    return { assign: co ? p.coordAssign : p.supAssign, publish: co ? true : p.supPublish, names: p.supSeesNames, sections: co ? p.coordSections : p.supSections, role: t.role || 'supervisor' };
  }
  const mine = () => { const ids = scope().map(s => s.id); return students().filter(s => ids.includes(s.sec)); };
  const nm = s => (can().names ? (s.name || s.email) : 'طالب ' + s.num);
  const secOf = id => U().sections.find(s => s.id === id) || { name: '' };
  const myAssigns = () => { const x = myOrg(), names = scope().map(s => s.name); return (S().assign || []).filter(a => a.org === x.id && names.includes(a.cohort)); };
  const caseName = id => { const c = (C.cases() || []).find(k => k.id === id); return c ? c.dx : (C.CASE_SHORT[id] || id); };
  const store = () => { const u = U(); u.published = u.published || {}; u.notes = u.notes || {}; u.overrides = u.overrides || {}; u.ratings = u.ratings || {}; return u; };
  /* V6.9: the supervisor may change a result's mark with a written reason; the record keeps both numbers */
  const eff = r => { const o = store().overrides[r.key]; return o ? o.total : r.total; };
  const RATING = ['', 'يحتاج إعادة كاملة', 'دون المتوقع', 'عند المتوقع', 'فوق المتوقع', 'متميّز'];
  const clk = m => `${Math.floor(m)}:${String(Math.round((m % 1) * 60)).padStart(2, '0')}`;
  /* what happened in the attempt and what the student wrote after it: repeatable demo records, like the result */
  function attempt(r) {
    const g = C.rng('tl:' + r.key), t = [0.5 + g() * 0.6];
    for (let i = 0; i < 5; i++) t.push(t[i] + 0.7 + g() * (r.minutes / 6));
    const rows = [[t[0], 'تواصل', 'عرّف بنفسه وبدأ بالقصة'], [t[1], 'إجراء', 'أول إجراء علاجي'], [t[2], 'فحص', 'طلب الفحوصات الأولى'], [t[3], 'مقاطعة', g() < 0.6 ? 'مرافق غاضب · تعامل معه' : 'مرافق غاضب · بلا رد'], [t[4], 'إعادة تقييم', g() < r.total / 100 ? 'رجع إلى المريض بعد العلاج' : 'لم يرجع إلى المريض بعد العلاج']];
    r.errs.forEach((e, i) => rows.push([t[1] + (i + 1) * 0.9 + g(), 'خطأ', e]));
    if (g() < 0.7) rows.push([t[3] + 0.4, 'طلب مساعدة', 'الأخصائي المناوب']);
    rows.push([Math.max(r.minutes - 0.4, t[5]), 'تسليم', 'سلّم الحالة']);
    const HARD = ['لما ساء المريض والأهل يسألون في الوقت نفسه.', 'حساب الجرعة والممرضة تنتظر.', 'قرار الوجهة: عناية أم مراقبة عالية.', 'لم أعرف متى أطلب الأخصائي.'];
    const NEXT = ['أطلب المساعدة أبكر.', 'أسأل عن الحساسية قبل أي دواء.', 'أعيد قياس الضغط بعد كل علاج.', 'أشرح للأهل بجملة واحدة ثم أعود للمريض.'];
    return { rows: rows.sort((a, b) => a[0] - b[0]), hard: HARD[Math.floor(g() * HARD.length)], next: NEXT[Math.floor(g() * NEXT.length)] };
  }

  /* V6.9.1: the sessions students really played reach their supervisor. There is no server yet: the accounts
     live in the browser's own store (the one the sign-in reads), so a student's session played in this browser
     shows here, beside the demo records, marked as real. With the server it is the same record, read from the
     database. The key ties the supervisor's review (mark, rating, publishing) to that session for the student. */
  const AXIS_OF = { safe: 'safe', dx: 'dx', tests: 'tests', assess: 'hist', team: 'comm', hand: 'hand' };
  const TL = { action: 'إجراء', test: 'فحص', harm: 'خطأ', stage: 'حالة المريض', better: 'تحسّن', comm: 'تواصل', exam: 'فحص سريري', read: 'قراءة نتيجة', dose: 'جرعة', order: 'أمر', check: 'تحقق', scope: 'حدود الدور', int: 'مقاطعة', help: 'طلب مساعدة' };
  const DISPO = { icu: 'العناية الحثيثة', hdu: 'مراقبة عالية في الطوارئ', cath: 'القسطرة', ward: 'طابق عادي', home: 'البيت' };
  const accounts = () => window.NabdStore.accounts();
  function liveOf(s, h, key) {
    const caseId = h.caseId.replace(/^er_/, '').replace(/_n$/, ''), sec = secOf(s.sec), d = h.detail || {};
    const asg = myAssigns().filter(a => a.cohort === sec.name && a.caseId === caseId && (Date.parse(a.at) || 0) <= h.ts).sort((x, y) => (Date.parse(y.at) || 0) - (Date.parse(x.at) || 0))[0];
    const axes = Array.isArray(h.axes) && h.axes.length ? h.axes : null;
    const dom = h.rubric === 'v2' && axes ? C.DOMAINS.map(dm => { const x = axes.find(q => AXIS_OF[q.k] === dm.id); return x ? Math.round(x.pts / x.max * 100) : 0; }) : null;
    return { a: asg || { id: 'free', caseId, cohort: sec.name, free: true }, s,
      r: { done: true, live: true, nurse: /_n$/.test(h.caseId), total: h.num, dom, axes, crit: h.critical || [], errs: [...(h.critical || []), ...(d.major || [])],
        minutes: Math.max(1, Math.round(d.minutes || 0)), key, ts: h.ts, timeline: h.timeline || [], reflect: h.reflect || null, detail: d } };
  }
  function liveRuns() {
    const roster = mine(), seen = new Set(), out = [];
    Object.values(accounts()).forEach(acc => {
      const mail = String((acc && acc.email) || '').toLowerCase(), s = mail && roster.find(k => String(k.email).toLowerCase() === mail);
      if (!s) return;
      (acc.history || []).filter(h => h && /^er_/.test(h.caseId || '') && h.ts && typeof h.num === 'number').forEach(h => {
        const key = 'live:' + s.id + ':' + h.ts;
        if (!seen.has(key)) { seen.add(key); out.push(liveOf(s, h, key)); }
      });
    });
    return out.sort((x, y) => y.r.ts - x.r.ts);
  }
  /* a student with real sessions: his sessions, average and last activity are his own, not the demo figures */
  function realOf(s, lv) {
    const l = (lv || liveRuns()).filter(x => x.s.id === s.id);
    return l.length ? Object.assign({}, s, { reg: true, fresh: false, sessions: l.length, avg: Math.round(l.reduce((q, w) => q + eff(w.r), 0) / l.length), idle: Math.max(0, Math.round((Date.now() - l[0].r.ts) / 864e5)) }) : s;
  }
  /* the verdict: the mark against the section's pass mark, and no critical error unless the supervisor struck it out */
  const passOf = (r, a) => eff(r) >= passMark(a.cohort) && !((r.crit || []).length && !(store().overrides[r.key] || {}).waive);
  const weakOf = r => {
    if (r.axes) { const w = r.axes.reduce((m, x) => (x.pts / x.max < m.pts / m.max ? x : m)); return { name: w.label, pct: Math.round(w.pts / w.max * 100) }; }
    const j = r.dom.indexOf(Math.min(...r.dom)); return { name: C.DOMAINS[j].name, pct: r.dom[j] };
  };

  /* a student's result on an assignment: a repeatable demo record */
  function result(a, s) {
    const r = C.rng(a.id + ':' + s.id);
    if (!s.reg || r() * 100 >= s.done) return { done: false };
    const total = clamp(Math.round(s.avg + (r() - 0.5) * 16), 35, 99);
    const dom = C.DOMAINS.map(d => clamp(Math.round(total + (d.v - C.PLATFORM_SCORE) + (r() - 0.5) * 18), 20, 100));
    const errs = C.ERRORS.filter(() => r() < (100 - total) / 130).map(e => e[0]).slice(0, 3);
    return { done: true, total, dom, errs, minutes: Math.round(9 + r() * 10), key: a.id + ':' + s.id };
  }
  function allResults() {
    const all = mine(), out = [];
    myAssigns().forEach(a => all.filter(s => secOf(s.sec).name === a.cohort).forEach(s => { const r = result(a, s); if (r.done) out.push({ a, s, r, pub: !!store().published[r.key] }); }));
    liveRuns().forEach(x => out.push({ ...x, pub: !!store().published[x.r.key] }));
    return out;
  }
  const dueText = iso => { const d = Math.round((new Date(iso) - new Date()) / 864e5); return d < 0 ? 'انتهى الموعد' : d === 0 ? 'اليوم' : `بعد ${n(d)} أيام`; };
  C.setCounts(() => { try { return C.consoleRole() === 'professor' && can().publish ? { sresults: allResults().filter(k => !k.pub).length } : {}; } catch (e) { return {}; } });

  /* ---------- pages ---------- */
  const notStaff = body => { body.innerHTML = `<section class="nbx-card nbx-empty-state">${ic('alert', 26)}<h2>بريدك غير مدرج في كادر الجامعة</h2><p>تضيفك إدارة الجامعة إلى الكادر وتسند لك شعبك، ثم تظهر هنا.</p></section>`; };

  function shome(body, act) {
    const t = meStaff();
    if (!t) { notStaff(body); return; }
    const x = myOrg(), u = U(), k = can(), secs = scope(), all = mine(), reg = all.filter(s => s.reg), F = C.orgFigures(x);
    const res = allResults(), wait = res.filter(r => !r.pub), risk = reg.filter(s => s.risk && !s.off), asg = myAssigns();
    act.innerHTML = `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbxs-act="try-er">${ic('pulse', 16)}تجربة غرفة الطوارئ</button>${k.sections ? `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbxs-act="section-new">${ic('plus', 16)}إضافة شعبة</button>` : ''}${k.assign && secs.length ? `<button type="button" class="nbx-btn nbx-btn-primary" data-nbxs-act="assign-new">${ic('plus', 16)}إسناد حالة</button>` : ''}`;
    const tasks = [];
    if (wait.length) tasks.push(['sresults', 'rules', `${n(wait.length)} نتائج ${k.publish ? 'بانتظار اعتمادك' : 'بانتظار اعتماد المنسق'}`, 'لا يراها الطالب قبل اعتمادها ونشرها.']);
    if (risk.length) tasks.push(['sstudents', 'target', `${n(risk.length)} طلاب يحتاجون متابعة`, 'متوسط دون 65% أو انقطاع أكثر من أسبوعين.']);
    asg.filter(a => { const d = Math.round((new Date(a.due) - new Date()) / 864e5); return d >= 0 && d <= 3; }).forEach(a => tasks.push(['sassign', 'cases', `موعد «${caseName(a.caseId)}» ${dueText(a.due)}`, a.cohort]));
    if (!asg.length && secs.length) tasks.push(['sassign', 'cases', 'لم تُسند حالة لشعبك بعد', k.assign ? 'أسند أول حالة ليبدأ طلابك.' : 'يسندها منسق المساق في جامعتك.']);
    const perm = (ok, text) => `<li class="${ok ? '' : 'is-off'}">${ic(ok ? 'check' : 'alert', 15)}${esc(text)}</li>`;
    body.innerHTML = `
      <div class="nbx-chips">${chip(ROLE[k.role][0], ROLE[k.role][1])}${chip(x.name, 'navy')}${chip(`${n(secs.length)} شعب`, 'muted')}</div>
      <div class="nbx-kpis">
        ${kpi('طلابي', `${n(reg.length)}<em> / ${n(all.length)}</em>`, 'سجّلوا حساباتهم من القائمة', bar(reg.length, all.length || 1))}
        ${kpi('واجبات مسندة', n(asg.length), `${n(res.length)} نتيجة مُنجزة`)}
        ${kpi(k.publish ? 'بانتظار اعتمادك' : 'بانتظار المنسق', n(wait.length), 'نتائج لم تُنشر للطلاب بعد')}
        ${kpi('يحتاجون متابعة', n(risk.length), 'متوسط دون 65% أو انقطاع')}
      </div>
      <div class="nbx-section-t nbx-section-flat"><h2>شعبي</h2><p>${k.role === 'coordinator' ? 'شعب المساقات التي تنسّقها.' : 'الشعب التي أسندتها لك إدارة الجامعة.'}</p></div>
      ${secs.length ? `<div class="nbx-grid">${secs.map(s => {
        const i = u.sections.indexOf(s), my = all.filter(q => q.sec === s.id), rg = my.filter(q => q.reg), co = u.courses.find(c => c.id === s.course) || {}, f = F.cohorts[i] || {};
        const done = rg.length ? Math.round(rg.reduce((a, q) => a + q.done, 0) / rg.length) : 0;
        return `<section class="nbx-card nbx-sec"><header class="nbx-card-head"><h2>${esc(s.name)} <small dir="ltr">${esc(co.code || '')}</small></h2>${rg.length ? score(f.score || 0) : chip('لم يبدأ', 'muted')}</header>
          <dl class="nbx-dl">
            <div><dt>الطلاب</dt><dd class="nbx-num">${n(rg.length)} سجّلوا من ${n(listed(u, s))}</dd></div>
            <div><dt>إنجاز الواجبات</dt><dd class="nbx-num">${n(done)}%</dd></div>
            <div><dt>واجبات مسندة</dt><dd class="nbx-num">${n(asg.filter(a => a.cohort === s.name).length)}</dd></div>
            <div><dt>يحتاجون متابعة</dt><dd class="nbx-num">${n(rg.filter(q => q.risk && !q.off).length)}</dd></div>
          </dl>
          <div class="nbx-card-act"><button type="button" class="nbx-btn nbx-btn-quiet" data-nbxs-act="stu-sec" data-id="${s.id}">طلاب الشعبة</button>${k.assign ? `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbxs-act="assign-new" data-sec="${esc(s.name)}">إسناد حالة</button>` : ''}</div>
        </section>`; }).join('')}</div>` : `<section class="nbx-card nbx-empty-state">${ic('cases', 26)}<h2>لم تُسند لك شعبة بعد</h2><p>تسند إدارة الجامعة الشعب من صفحة المساقات والشعب.</p></section>`}
      <div class="nbx-grid">
        ${card('بانتظارك', tasks.length ? `<ul class="nbx-tasks">${tasks.map(([p, i, t2, s2]) => `<li><button type="button" data-nbx-go="${p}">${ic(i)}<span><b>${esc(t2)}</b><small>${esc(s2)}</small></span>${ic('arrow', 16)}</button></li>`).join('')}</ul>` : empty('لا يوجد ما ينتظرك الآن.'))}
        ${card('صلاحياتك في جامعتك', `<ul class="nbx-perms">
            ${perm(true, 'تتابع طلاب شعبك وتكتب لهم ملاحظاتك')}
            ${perm(k.assign, k.assign ? 'تسند الحالات لشعبك' : 'إسناد الحالات لمنسق المساق')}
            ${perm(k.publish, k.publish ? 'تعتمد نتائج طلابك وتنشرها' : 'اعتماد النتائج لمنسق المساق')}
            ${perm(k.sections, k.sections ? 'تنشئ شعبك' : 'إنشاء الشعب لإدارة الجامعة')}
            ${perm(k.names, k.names ? 'ترى أسماء طلاب شعبك ودرجاتهم' : 'ترى الدرجات دون أسماء')}
          </ul>`, '', 'تحددها إدارة الجامعة')}
      </div>`;
    if (!C.cases()) C.loadCases().then(() => C.render());
  }

  function sassign(body, act) {
    if (!meStaff()) { notStaff(body); return; }
    const k = can(), secs = scope(), all = mine(), list = myAssigns();
    if (k.assign && secs.length) act.innerHTML = `<button type="button" class="nbx-btn nbx-btn-primary" data-nbxs-act="assign-new">${ic('plus', 16)}إسناد حالة</button>`;
    body.innerHTML = `${k.assign ? '' : `<div class="nbx-banner nbx-banner-info">${ic('rules')}<span><b>إسناد الحالات في جامعتك لمنسق المساق.</b> تتابع هنا ما أُسند لشعبك ونتائج طلابك.</span></div>`}
      <div class="nbx-card nbx-table-card"><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>الحالة</th><th>الشعبة</th><th>موعد التسليم</th><th>أنجزوا</th><th>متوسط الأداء</th><th><span class="nbx-sr">إجراء</span></th></tr></thead>
        <tbody>${list.map(a => {
          const st = all.filter(s => secOf(s.sec).name === a.cohort && s.reg), rs = st.map(s => result(a, s)).filter(r => r.done);
          const avg = rs.length ? Math.round(rs.reduce((q, r) => q + r.total, 0) / rs.length) : 0;
          return `<tr>
            <td><b>${esc(caseName(a.caseId))}</b><small>أسندها ${esc(a.by)}</small></td>
            <td>${esc(a.cohort)}</td>
            <td class="nbx-num">${esc(day(a.due))}<small>${esc(dueText(a.due))}</small></td>
            <td class="nbx-num"><span>${n(rs.length)} / ${n(st.length)}</span>${bar(rs.length, st.length || 1)}</td>
            <td class="nbx-num">${rs.length ? score(avg) : '—'}</td>
            <td class="nbx-row-act"><button type="button" class="nbx-btn nbx-btn-quiet" data-nbxs-act="res-of" data-id="${a.id}">النتائج</button>${k.assign ? `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbxs-act="unassign" data-id="${a.id}" data-nbx-confirm="تأكيد الإلغاء">إلغاء الإسناد</button>` : ''}</td>
          </tr>`; }).join('') || `<tr><td colspan="6">${empty(k.assign ? 'لم تُسند حالة بعد. ابدأ من «إسناد حالة».' : 'لم يُسند لشعبك شيء بعد.')}</td></tr>`}</tbody>
      </table></div></div>
      <p class="nbx-foot-note nbx-foot-tight">تُسند الحالات من مكتبة نبض المفتوحة لجامعتك فقط. يرى الطالب الواجب في صفحته، ويفتح غرفة الطوارئ على الحالة نفسها.</p>`;
    if (!C.cases()) C.loadCases().then(() => C.render());
  }

  const sf = { tab: 'all', sec: 'all', q: '', limit: 15 };
  function sstudents(body) {
    if (!meStaff()) { notStaff(body); return; }
    const secs = scope(), all = mine(), q = sf.q.trim(), k = can(), lvAll = liveRuns();
    if (sf.sec !== 'all' && !secs.some(s => s.id === sf.sec)) sf.sec = 'all';
    const is = { all: () => true, risk: s => s.reg && s.risk && !s.off, new: s => !s.reg };
    const tab = (id, label) => `<button type="button" class="${sf.tab === id ? 'is-on' : ''}" data-nbxs-act="stu-filter" data-v="${id}">${label} <em>${n(all.filter(is[id]).length)}</em></button>`;
    const rows = all.filter(s => (is[sf.tab] || is.all)(s) && (sf.sec === 'all' || s.sec === sf.sec) && (!q || (s.name || '').includes(q) || s.num.includes(q))).sort((a, b) => (sf.tab === 'risk' ? a.avg - b.avg : 0));
    body.innerHTML = `
      <div class="nbx-toolbar">
        <div class="nbx-tabs" role="group" aria-label="تصفية الطلاب">${tab('all', 'الكل')}${tab('risk', 'يحتاجون متابعة')}${tab('new', 'لم يسجّلوا بعد')}</div>
        <div class="nbx-toolbar-end"><label class="nbx-field nbx-field-inline"><span class="nbx-sr">الشعبة</span><select data-nbxs-select="sec"><option value="all">كل شعبي</option>${secs.map(s => `<option value="${s.id}"${sf.sec === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
        <label class="nbx-search">${ic('search', 16)}<input type="search" data-nbxs-input="q" value="${esc(sf.q)}" placeholder="ابحث بالاسم أو الرقم الجامعي"></label></div>
      </div>
      <div class="nbx-card nbx-table-card"><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>الطالب</th><th>الشعبة</th><th>الجلسات</th><th>إنجاز الواجبات</th><th>متوسط الأداء</th><th>آخر نشاط</th><th>الحالة</th><th><span class="nbx-sr">إجراء</span></th></tr></thead>
        <tbody>${rows.slice(0, sf.limit).map(s => realOf(s, lvAll)).map(s => `<tr>
          <td><b>${esc(nm(s))}</b>${k.names ? `<small dir="ltr">${esc(s.num)}</small>` : ''}</td>
          <td>${esc(secOf(s.sec).name)}</td>
          ${s.reg ? `<td class="nbx-num">${n(s.sessions)}</td>
          <td class="nbx-num"><span>${n(s.done)}%</span>${bar(s.done, 100, s.done < 60 ? 'warn' : '')}</td>
          <td class="nbx-num">${s.fresh ? '—' : score(s.avg)}</td>
          <td class="nbx-num">${esc(idleText(s.idle))}</td>
          <td>${s.off ? chip('موقوف', 'bad') : s.risk ? chip('يحتاج متابعة', 'warn') : chip('نشط', 'ok')}${s.risk && !s.off ? `<small>${esc(riskWhy(s))}</small>` : ''}</td>
          <td><button type="button" class="nbx-btn nbx-btn-quiet" data-nbxs-act="stu-open" data-id="${s.id}">فتح الملف</button></td>`
          : `<td class="nbx-num">—</td><td class="nbx-num">—</td><td class="nbx-num">—</td><td class="nbx-num">—</td><td>${chip('لم يسجّل بعد', 'muted')}</td><td></td>`}
        </tr>`).join('') || `<tr><td colspan="8">${empty('لا يوجد طلاب بهذه التصفية.')}</td></tr>`}</tbody></table>
        ${rows.length > sf.limit ? `<div class="nbx-more"><button type="button" class="nbx-btn nbx-btn-quiet" data-nbxs-act="stu-more">عرض المزيد (${n(rows.length - sf.limit)})</button></div>` : ''}</div></div>
      <p class="nbx-foot-note nbx-foot-tight">ترى طلاب شعبك فقط. ${k.names ? '' : 'أسماء الطلاب مخفية حسب إعدادات الخصوصية في جامعتك. '}إضافة الطلاب إلى القائمة وإيقافهم لإدارة الجامعة.</p>`;
  }

  const rf = { asg: 'all', tab: 'wait', limit: 15 };
  function sresults(body, act) {
    if (!meStaff()) { notStaff(body); return; }
    const k = can(), list = myAssigns(), all = allResults().filter(r => rf.asg === 'all' || r.a.id === rf.asg);
    if (rf.asg !== 'all' && !list.some(a => a.id === rf.asg)) rf.asg = 'all';
    const wait = all.filter(r => !r.pub), rows = (rf.tab === 'wait' ? wait : all.filter(r => r.pub)).sort((a, b) => (b.r.live ? 1 : 0) - (a.r.live ? 1 : 0) || eff(a.r) - eff(b.r));
    if (k.publish && wait.length) act.innerHTML = `<button type="button" class="nbx-btn nbx-btn-primary" data-nbxs-act="res-approve-all" data-nbx-confirm="تأكيد اعتماد ${n(wait.length)} نتيجة">${ic('check', 16)}اعتماد ونشر الكل (${n(wait.length)})</button>`;
    const tab = (id, label, c) => `<button type="button" class="${rf.tab === id ? 'is-on' : ''}" data-nbxs-act="res-tab" data-v="${id}">${label} <em>${n(c)}</em></button>`;
    body.innerHTML = `${k.publish ? '' : `<div class="nbx-banner nbx-banner-info">${ic('rules')}<span><b>اعتماد النتائج في جامعتك لمنسق المساق.</b> ترى نتائج طلابك وتكتب ملاحظاتك، ولا تنشرها.</span></div>`}
      <div class="nbx-toolbar">
        <div class="nbx-tabs" role="group" aria-label="حالة النتائج">${tab('wait', 'بانتظار الاعتماد', wait.length)}${tab('pub', 'منشورة للطلاب', all.length - wait.length)}</div>
        <div class="nbx-toolbar-end"><label class="nbx-field nbx-field-inline"><span class="nbx-sr">الواجب</span><select data-nbxs-select="asg"><option value="all">كل الواجبات</option>${list.map(a => `<option value="${a.id}"${rf.asg === a.id ? ' selected' : ''}>${esc(caseName(a.caseId) + ' · ' + a.cohort)}</option>`).join('')}</select></label></div>
      </div>
      <div class="nbx-card nbx-table-card"><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>الطالب</th><th>الحالة</th><th>الدرجة</th><th>أضعف محور</th><th>أخطاء</th><th>المدة</th><th><span class="nbx-sr">إجراء</span></th></tr></thead>
        <tbody>${rows.slice(0, rf.limit).map(({ a, s, r, pub }) => { const w = weakOf(r); return `<tr${r.live ? ' class="is-live"' : ''}>
          <td><b>${esc(nm(s))}</b><small>${esc(a.cohort)}</small></td>
          <td>${esc(caseName(a.caseId))}${r.live ? `<small><span class="nbx-live">جلسة حقيقية</span> ${a.free ? 'تدريب حر' : 'واجب'} · ${r.nurse ? 'دور التمريض' : 'دور الطبيب'} · ${esc(day(new Date(r.ts).toISOString()))}</small>` : ''}</td>
          <td class="nbx-num">${score(eff(r))}<small>${passOf(r, a) ? 'مجتاز' : (r.crit || []).length && !(store().overrides[r.key] || {}).waive ? 'غير مجتاز: خطأ حرج' : 'غير مجتاز'}${store().overrides[r.key] ? ' · معدّلة' : ''}</small></td>
          <td>${esc(w.name)}<small class="nbx-num">${n(w.pct)}%</small></td>
          <td class="nbx-num">${r.errs.length ? n(r.errs.length) : 'لا يوجد'}</td>
          <td class="nbx-num">${n(r.minutes)} دقيقة</td>
          <td class="nbx-row-act"><button type="button" class="nbx-btn nbx-btn-quiet" data-nbxs-act="res-open" data-id="${r.key}">التفاصيل</button>${k.publish && !pub ? `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbxs-act="res-approve" data-id="${r.key}">${ic('check', 15)}اعتماد ونشر</button>` : ''}</td>
        </tr>`; }).join('') || `<tr><td colspan="7">${empty(rf.tab === 'wait' ? 'لا توجد نتائج بانتظار الاعتماد.' : 'لم تُنشر نتائج بعد.')}</td></tr>`}</tbody></table>
        ${rows.length > rf.limit ? `<div class="nbx-more"><button type="button" class="nbx-btn nbx-btn-quiet" data-nbxs-act="res-more">عرض المزيد (${n(rows.length - rf.limit)})</button></div>` : ''}</div></div>
      <p class="nbx-foot-note nbx-foot-tight">يرى الطالب درجة الغرفة الآلية فور انتهاء جلسته، ولا يرى الدرجة المعتمدة ولا ملاحظتك ولا تقييمك العام قبل النشر. «جلسة حقيقية» جلسةٌ لعبها طالب من شعبك على هذا الجهاز؛ باقي الصفوف بيانات توضيحية، وتصل كل الجلسات من الخادم عند ربطه.</p>`;
    if (!C.cases()) C.loadCases().then(() => C.render());
  }

  C.addPages({
    shome: ['بوابة المشرف', () => { const t = meStaff(); return t ? `${t.name} · ${ROLE[t.role][0]} · ${myOrg().name}` : myOrg().name; }, shome],
    sassign: ['الواجبات', 'الحالات المسندة لشعبك: موعدها، من أنجزها، ومتوسط أدائهم.', sassign],
    sstudents: ['طلابي', 'طلاب شعبك: نشاطهم، إنجازهم، ومن يحتاج متابعة. افتح ملف الطالب لتقرأ نتائجه وتكتب ملاحظتك.', sstudents],
    sresults: ['النتائج والاعتماد', 'راجع نتيجة كل طالب، ثم اعتمدها وانشرها ليراها.', sresults]
  });

  /* ---------- drawers ---------- */
  const domBars = dom => `<ul class="nbx-comp">${C.DOMAINS.map((d, j) => `<li class="nbx-comp-${dom[j] >= 75 ? 'ok' : dom[j] >= 68 ? 'mid' : 'low'}"><span>${esc(d.name)}</span><b class="nbx-num">${n(dom[j])}%</b><span class="nbx-comp-bar"><i style="width:${dom[j]}%"></i></span></li>`).join('')}</ul>`;
  const axesBars = axes => `<ul class="nbx-comp">${axes.map(x => { const p = Math.round(x.pts / x.max * 100); return `<li class="nbx-comp-${p >= 75 ? 'ok' : p >= 60 ? 'mid' : 'low'}"><span>${esc(x.label)}</span><b class="nbx-num">${n(Math.round(x.pts))} / ${n(x.max)}</b><span class="nbx-comp-bar"><i style="width:${p}%"></i></span></li>`; }).join('')}</ul>`;
  function studentFile(s) {
    const k = can(), u = store(), lv = liveRuns().filter(x => x.s.id === s.id).map(x => ({ a: x.a, r: x.r }));
    const rs = [...lv, ...myAssigns().filter(a => secOf(s.sec).name === a.cohort).map(a => ({ a, r: result(a, s) })).filter(q => q.r.done || !lv.some(x => x.a.id === q.a.id))];
    const done = rs.filter(q => q.r.done), note = u.notes[s.id] || {}, withDom = done.filter(q => q.r.dom);
    const dom = withDom.length ? C.DOMAINS.map((d, j) => Math.round(withDom.reduce((q, w) => q + w.r.dom[j], 0) / withDom.length)) : null;
    if (lv.length) s = realOf(s);
    const errs = {}; done.forEach(q => q.r.errs.forEach(e => { errs[e] = (errs[e] || 0) + 1; }));
    C.openDrawer('ملف الطالب: ' + nm(s), `<div class="nbx-casefile">
      <dl class="nbx-dl">
        <div><dt>الشعبة</dt><dd>${esc(secOf(s.sec).name)}</dd></div>
        <div><dt>متوسط الأداء</dt><dd>${score(s.avg)}</dd></div>
        <div><dt>الجلسات</dt><dd class="nbx-num">${n(s.sessions)}</dd></div>
        <div><dt>آخر نشاط</dt><dd class="nbx-num">${esc(idleText(s.idle))}</dd></div>
      </dl>
      ${s.risk ? `<div class="nbx-banner nbx-banner-warn nbx-gap">${ic('alert')}<span><b>يحتاج متابعة:</b> ${esc(riskWhy(s))}.</span></div>` : ''}
      <h3 class="nbx-sub">الكفاءات السريرية</h3>${dom ? domBars(dom) : empty('لم ينجز واجباً بعد.')}
      <h3 class="nbx-sub">نتائج الواجبات</h3>
      ${rs.length ? `<ul class="nbx-assigns">${rs.map(({ a, r }) => `<li><span><b>${esc(caseName(a.caseId))}</b><small>${r.live ? `<span class="nbx-live">جلسة حقيقية</span> ${esc(day(new Date(r.ts).toISOString()))} · ${a.free ? 'تدريب حر' : 'واجب'}` : 'التسليم ' + esc(day(a.due))}</small></span>${r.done ? `<span class="nbx-due">${score(eff(r))}<small>${u.published[r.key] ? 'منشورة' : 'بانتظار الاعتماد'}</small><button type="button" class="nbx-btn nbx-btn-quiet nbx-btn-sm" data-nbxs-act="res-open" data-id="${esc(r.key)}">فتح</button></span>` : chip('لم يُنجز', 'muted')}</li>`).join('')}</ul>` : empty('لم يُسند لشعبته واجب بعد.')}
      ${Object.keys(errs).length ? `<h3 class="nbx-sub">أخطاء تكررت عنده</h3><ul class="nbx-perms nbx-perms-no">${Object.entries(errs).sort((a, b) => b[1] - a[1]).map(([e, c]) => `<li>${ic('alert', 15)}${esc(e)}${c > 1 ? ` (${n(c)} مرات)` : ''}</li>`).join('')}</ul>` : ''}
      <form class="nbx-form nbx-assign" novalidate>
        ${field('ملاحظتك للطالب', `<textarea name="note" rows="3" maxlength="400" placeholder="ما الذي يركّز عليه في المحاولة القادمة">${esc(note.text || '')}</textarea>`, note.at ? `آخر تعديل ${esc(day(note.at))}` : 'يراها الطالب مع نتيجته بعد النشر')}
        <p class="nbx-form-err" role="alert" hidden></p>
        <div class="nbx-form-act"><button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-close>إغلاق</button><button type="submit" class="nbx-btn nbx-btn-primary">حفظ الملاحظة</button></div>
      </form></div>`, fd => {
      const text = String(fd.get('note') || '').trim();
      if (!text) return 'اكتب الملاحظة أولاً.';
      u.notes[s.id] = { text, at: new Date().toISOString(), by: (meStaff() || {}).name || '' };
      C.log(`كتب ملاحظة لطالب في «${secOf(s.sec).name}»`, 'content');
      toast('حُفظت الملاحظة.');
      C.save();
    });
    if (!k.names) root.querySelector('#nbx-drawer-title').textContent = 'ملف الطالب: طالب ' + s.num;
  }
  function resultFile(key) {
    const hit = allResults().find(q => q.r.key === key);
    if (!hit) return;
    const { a, s, r, pub } = hit, k = can(), u = store(), o = u.overrides[r.key], rate = u.ratings[r.key], mark = passMark(a.cohort);
    const at = r.live ? { rows: (r.timeline || []).map(l => [l.at, TL[l.type] || l.type, l.text]), hard: (r.reflect || {}).hard || '', next: (r.reflect || {}).change || '' } : attempt(r);
    const total = eff(r), may = k.publish && !pub, ok = passOf(r, a), d = r.detail || {};
    const did = r.live ? `<h3 class="nbx-sub">ما فعله الطالب</h3>
      <dl class="nbx-dl">${d.role !== 'nurse' ? `<div><dt>تشخيصه</dt><dd>${esc(d.dx || '—')}<small>الصحيح: ${esc(d.dxRight || '')}</small></dd></div>
        <div><dt>الوجهة</dt><dd>${esc(DISPO[d.dispo] || '—')}<small>الصحيحة: ${esc(DISPO[d.dispoRight] || '')}</small></dd></div>` : ''}
        <div><dt>إعادة التقييم</dt><dd class="nbx-num">${esc(d.reassess || '—')}</dd></div><div><dt>طلب المساعدة</dt><dd>${esc((d.helps || []).join('، ') || '—')}</dd></div></dl>
      ${d.sbar ? `<p class="nbx-quote"><b>تسليمه كما كتبه:</b> ${esc(d.sbar)}</p>` : ''}
      ${(d.hand || []).length ? `<ul class="nbx-checks">${d.hand.map(x => `<li class="${x.ok ? 'is-ok' : 'is-miss'}"><b>${esc(x.label)}</b><span>${x.ok ? 'ذُكر' : esc(x.miss)}</span></li>`).join('')}</ul>` : ''}` : '';
    C.openDrawer('نتيجة: ' + nm(s), `<div class="nbx-casefile">
      <dl class="nbx-dl">
        <div><dt>الحالة</dt><dd>${esc(caseName(a.caseId))}</dd></div>
        <div><dt>الشعبة</dt><dd>${esc(a.cohort)}</dd></div>
        <div><dt>الدرجة</dt><dd>${score(total)}${o ? `<small class="nbx-num">الآلية ${n(r.total)}%</small>` : ''}</dd></div>
        <div><dt>الحكم</dt><dd>${chip(ok ? 'مجتاز' : 'غير مجتاز', ok ? 'ok' : 'bad')}<small class="nbx-num">علامة النجاح ${n(mark)}%${(r.crit || []).length ? (o && o.waive ? ' · أُسقط الخطأ الحرج' : ' · خطأ حرج') : ''}</small></dd></div>
        <div><dt>المدة</dt><dd class="nbx-num">${n(r.minutes)} دقيقة</dd></div>
        <div><dt>تقييم المشرف العام</dt><dd>${rate ? `<b class="nbx-num">${n(rate.v)} / 5</b><small>${esc(RATING[rate.v])}</small>` : 'لم يُكتب بعد'}</dd></div>
      </dl>
      ${o ? `<div class="nbx-banner nbx-banner-info nbx-gap">${ic('rules')}<span><b>${o.waive ? 'أُسقط الخطأ الحرج' : 'درجة معدّلة'}:</b> ${o.total !== o.from ? `من ${n(o.from)}% إلى ${n(o.total)}%، ` : ''}${esc(o.by)}، ${esc(day(o.at))}. السبب: ${esc(o.why)}</span></div>` : ''}
      ${r.live ? `<div class="nbx-banner nbx-banner-info nbx-gap">${ic('pulse')}<span><b>جلسة حقيقية</b> لعبها الطالب في غرفة الطوارئ (${r.nurse ? 'دور التمريض' : 'دور الطبيب'})، ${esc(day(new Date(r.ts).toISOString()))}.</span></div>` : ''}
      <h3 class="nbx-sub">الدرجة حسب ${r.axes ? 'المحور' : 'الكفاءة'}</h3>${r.axes ? axesBars(r.axes) : domBars(r.dom)}
      <h3 class="nbx-sub">الأخطاء في هذه المحاولة</h3>
      ${r.errs.length ? `<ul class="nbx-perms nbx-perms-no">${r.errs.map(e => `<li>${ic('alert', 15)}${esc(e)}</li>`).join('')}</ul>` : empty('لم تُسجَّل أخطاء.')}
      ${did}
      <h3 class="nbx-sub">الخط الزمني للمحاولة</h3>
      <ol class="nbx-timeline">${at.rows.map(([t, tag, text]) => `<li class="${tag === 'خطأ' ? 'is-bad' : ''}"><time class="nbx-num" dir="ltr">${clk(t)}</time><em>${esc(tag)}</em><span>${esc(text)}</span></li>`).join('')}</ol>
      <h3 class="nbx-sub">تأمل الطالب بعد الحالة</h3>
      ${at.hard || at.next ? `<dl class="nbx-dl nbx-dl-wide"><div><dt>أصعب لحظة</dt><dd>${esc(at.hard || '—')}</dd></div><div><dt>ما يغيّره لو أعادها</dt><dd>${esc(at.next || '—')}</dd></div></dl>` : empty('تخطّى الطالب أسئلة التأمل.')}
      <div class="nbx-banner nbx-banner-${pub ? 'info' : 'warn'} nbx-gap">${ic(pub ? 'check' : 'alert')}<span>${pub ? '<b>منشورة للطالب.</b> يراها في صفحته مع ملاحظتك. التعديل بعد النشر غير متاح.' : '<b>لم تُنشر بعد.</b> يرى الطالب درجة الغرفة الآلية فقط، لا الدرجة المعتمدة ولا ملاحظتك.'}</span></div>
      ${may ? `<form class="nbx-form nbx-assign" novalidate>
        <h3 class="nbx-sub">تقييمك وتعديل الدرجة</h3>
        ${field('تقييمك العام للأداء', `<select name="rate"><option value="">بلا تقييم</option>${[1, 2, 3, 4, 5].map(v => `<option value="${v}"${rate && rate.v === v ? ' selected' : ''}>${v} · ${RATING[v]}</option>`).join('')}</select>`, 'حكمك السريري على المحاولة كلها، بجانب الدرجة الآلية')}
        ${field('الدرجة بعد التعديل', `<input type="number" name="total" inputmode="numeric" min="0" max="100" step="1" value="${o ? o.total : ''}" placeholder="${r.total}">`, `اتركها فارغة لتبقى الدرجة الآلية (${n(r.total)}%)`)}
        ${(r.crit || []).length ? `<label class="nbx-check"><input type="checkbox" name="waive"${o && o.waive ? ' checked' : ''}><span><b>الخطأ الحرج لم يحدث فعلاً في هذه المحاولة</b><small>${esc(r.crit.join('، '))}. القواعد الحالية تقرأ الكلمات وقد تخطئ؛ يُسقط بسببك المكتوب.</small></span></label>` : ''}
        ${field('سبب التعديل', `<textarea name="why" rows="2" maxlength="300" placeholder="ما الذي رأيته في المحاولة ولم تحسبه الدرجة الآلية">${esc(o ? o.why : '')}</textarea>`, 'مطلوب عند تغيير الدرجة، ويبقى في سجل النتيجة باسمك')}
        <p class="nbx-form-err" role="alert" hidden></p>
        <div class="nbx-form-act">${o ? `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbxs-act="res-reset" data-id="${r.key}" data-nbx-confirm="تأكيد إلغاء التعديل">إلغاء التعديل</button>` : ''}<button type="submit" class="nbx-btn nbx-btn-quiet">حفظ التقييم</button><button type="button" class="nbx-btn nbx-btn-primary" data-nbxs-act="res-approve" data-id="${r.key}">${ic('check', 16)}اعتماد ونشر</button></div>
      </form>` : ''}
      <div class="nbx-form-act"><button type="button" class="nbx-btn nbx-btn-quiet" data-nbxs-act="stu-open" data-id="${s.id}">ملف الطالب</button><button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-close>إغلاق</button></div>
    </div>`, fd => {
      const raw = String(fd.get('total') || '').trim(), why = String(fd.get('why') || '').trim(), rv = Number(fd.get('rate')) || 0, who = (meStaff() || {}).name || '';
      const waive = fd.get('waive') === 'on', v = raw ? Math.round(Number(raw)) : (o ? o.total : r.total);
      if (raw && !(v >= 0 && v <= 100)) return 'الدرجة رقم بين 0 و100.';
      if (v !== r.total || waive) {
        if (why.length < 10) return 'اكتب سبب التعديل (عشرة أحرف على الأقل).';
        u.overrides[r.key] = { total: v, from: r.total, why, by: who, at: new Date().toISOString(), waive };
        C.log(waive ? `أسقط خطأً حرجاً في نتيجة طالب في «${caseName(a.caseId)}»` : `عدّل درجة طالب في «${caseName(a.caseId)}» من ${r.total}% إلى ${v}%`, 'content');
      } else if (raw || o) delete u.overrides[r.key];
      if (rv) u.ratings[r.key] = { v: rv, by: who, at: new Date().toISOString() }; else delete u.ratings[r.key];
      toast('حُفظ تقييمك.');
      C.save();
    });
  }
  function approve(keys) {
    const u = store(), who = (meStaff() || {}).name || '';
    keys.forEach(key => { u.published[key] = { by: who, at: new Date().toISOString() }; });
    C.log(keys.length === 1 ? 'اعتمد نتيجة طالب ونشرها' : `اعتمد ${keys.length} نتيجة ونشرها`, 'content');
    C.save(); C.closeDrawer(); toast(keys.length === 1 ? 'اعتُمدت النتيجة ونُشرت للطالب.' : `اعتُمدت ${n(keys.length)} نتيجة ونُشرت.`); C.render();
  }

  /* ---------- events ---------- */
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-nbxs-act]');
    if (!b || b.disabled) return;
    const a = b.getAttribute('data-nbxs-act'), id = b.getAttribute('data-id'), k = can();
    switch (a) {
      case 'try-er': { const nav = document.getElementById('app-nav-er'); if (nav) nav.click(); break; }
      case 'section-new': if (k.sections) Un.sectionForm(null); break;
      case 'assign-new': if (k.assign) C.loadCases().then(() => C.assignForm(myOrg(), b.getAttribute('data-sec'), scope().map(s => s.name))); break;
      case 'unassign': {
        if (!k.assign) break;
        const st = S(), rec = (st.assign || []).find(q => q.id === id); if (!rec) break;
        st.assign = st.assign.filter(q => q !== rec);
        window.NabdStore.saveAssignments(window.NabdStore.assignments().filter(q => q && q.id !== 'as_' + rec.id));
        C.log(`ألغى إسناد «${caseName(rec.caseId)}» عن ${rec.cohort}`, 'content'); C.save(); toast('أُلغي الإسناد.'); C.render(); break;
      }
      case 'stu-sec': sf.sec = id; sf.tab = 'all'; sf.limit = 15; C.go('sstudents'); break;
      case 'stu-filter': sf.tab = b.getAttribute('data-v'); sf.limit = 15; C.render(); break;
      case 'stu-more': sf.limit += 25; C.render(); break;
      case 'stu-open': { const s = mine().find(q => q.id === id); if (s) studentFile(s); break; }
      case 'res-of': rf.asg = id; rf.tab = 'wait'; rf.limit = 15; C.go('sresults'); break;
      case 'res-tab': rf.tab = b.getAttribute('data-v'); rf.limit = 15; C.render(); break;
      case 'res-more': rf.limit += 25; C.render(); break;
      case 'res-open': resultFile(id); break;
      case 'res-approve': if (k.publish) approve([id]); break;
      case 'res-reset': if (k.publish && store().overrides[id]) { delete store().overrides[id]; C.log('ألغى تعديل درجة طالب وأعاد الدرجة الآلية', 'content'); C.save(); toast('أُعيدت الدرجة الآلية.'); C.render(); resultFile(id); } break;
      case 'res-approve-all': if (k.publish) approve(allResults().filter(q => !q.pub && (rf.asg === 'all' || q.a.id === rf.asg)).map(q => q.r.key)); break;
    }
  });
  root.addEventListener('input', e => {
    const t = e.target;
    if (!t.matches('[data-nbxs-input="q"]')) return;
    sf.q = t.value; sf.limit = 15;
    const pos = t.selectionStart; C.render();
    const again = root.querySelector('[data-nbxs-input="q"]');
    if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (err) {} }
  });
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-nbxs-select="sec"]')) { sf.sec = t.value; sf.limit = 15; C.render(); }
    else if (t.matches('[data-nbxs-select="asg"]')) { rf.asg = t.value; rf.limit = 15; C.render(); }
  });
})();
