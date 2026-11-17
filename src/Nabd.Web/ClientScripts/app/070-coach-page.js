  /* ==========================================================================================================
     070 · coach page: the coach's own page (focus, other points, last sessions, drills), its buttons, the header's
     and the sidebar's way to it, and the demo data. Installs the second wrapper of showOnlySection.
     ========================================================================================================== */
  /* ---------- the coach's page ---------- */
  const CD = () => window.NabdCoachData;
  // the stages of a gap that has a drill: guided drill, then a real case of the same kind without the error, then closed
  function stageOf(u, gapDrill) {
    const runs = ((u && u.history) || []).filter(h => h && /^er_/.test(h.caseId || '') && typeof h.num === 'number');
    const drills = ((u && u.coach) || []).filter(x => x && x.drill === gapDrill);
    const last = drills[0];
    if (!last) return { stage: 1, last: null };
    const caseOf = h => String(h.caseId).replace(/^er_/, '').replace(/_n$/, '');
    const real = runs.find(h => (AGE[caseOf(h)] || 0) >= 65 && h.ts > last.at && h.num >= 70 && !(h.critical || []).length);
    return { stage: real ? 3 : 2, last, real };
  }
  function gapsOf(u) {
    const out = [], g = gapOf(u), drillDone = ((u && u.coach) || []).some(x => x && x.drill === 'elderly');
    if (g || drillDone) out.push({ kind: 'drill', drill: 'elderly', title: 'كبار السن مع سكري وضغط', skill: 'الأولويات', why: g ? g.why : 'تدرّبت عليه سابقاً.', ...stageOf(u, 'elderly') });
    const d = CD() && CD().data(u);
    if (d) d.top.filter(([, n]) => n >= 2).slice(0, 3).forEach(([t, n]) => out.push({ kind: 'skill', title: t, skill: n === 2 ? 'تكرّر مرتين' : 'تكرّر ' + n + ' مرات', why: n === 2 ? 'ظهر في جلستين من جلساتك.' : 'ظهر في ' + n + ' جلسات من جلساتك.', stage: 0 }));
    return out;
  }
  const openGaps = u => gapsOf(u).filter(x => x.stage !== 3).length;
  const STAGES = ['تمرين موجّه', 'حالة حقيقية', 'أُغلق'];
  const DRILL_NAME = { elderly: 'كبار السن مع سكري وضغط' };
  function host() {
    const view = byId('view-coach');
    if (!view) return null;
    let p = byId('nbx-cp');
    if (!p) { p = document.createElement('div'); p.id = 'nbx-cp'; p.className = 'nbx-cp'; p.setAttribute('data-no-terms', ''); view.appendChild(p); }
    view.classList.add('nbx-cp-on');
    return p;
  }
  function open() {
    const u = user();
    if (!u || u.role !== 'student') return;
    try { if (typeof showOnlySection === 'function') showOnlySection('coach'); } catch (e) {}
    try { currentView = 'coach'; } catch (e) {}
    document.querySelectorAll('#app-header nav button').forEach(b => b.classList.toggle('active', b.id === 'app-nav-coach'));
    S.d = null;
    overview();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  /* V6.9.7 (owner: "clear, simple, easy, not crowded"): one thing to do now, a short list of the rest, and the
     progress in two plain lists. One primary button on the page. */
  function overview() {
    fullOff();
    const p = host(), u = user();
    if (!p || !u) return;
    const d = CD() ? CD().data(u) : null, titleOf = CD() ? CD().titleOf : (h => h.caseTitle || ''), caseOf = CD() ? CD().caseOf : (h => h.caseId);
    const gaps = gapsOf(u), demo = (u.history || []).some(h => h && h.demo), record = (u.coach || []).filter(x => x && x.drill);
    const sub = !d ? 'يبدأ بعد أول حالة تنهيها.' : `${d.runs.length} ${d.runs.length === 1 ? 'جلسة' : d.runs.length === 2 ? 'جلستان' : 'جلسات'} · متوسط ${d.avg}%${d.before == null ? '' : d.recent > d.before ? ' · تحسّنت' : d.recent < d.before ? ' · تراجعت' : ''}`;
    const head = `<header class="nbx-c2-head"><div><h1>المدرب السريري</h1><p>يتدرّب معك على ما تحتاج تطويره، خطوة خطوة.</p><span class="nbx-c2-sub">${esc(sub)}</span></div>
        <button type="button" class="nbx-c2-back" data-nbx-drill="home">← الرئيسية</button></header>`;
    const offerDemo = ((window.NabdStore.consoleState() || {}).settings || {}).coachDemo !== false;
    const demoLink = demo ? '<button type="button" class="nbx-coach-link" data-nbx-drill="demo-clear">احذف بيانات العرض</button>'
      : offerDemo ? '<button type="button" class="nbx-coach-link" data-nbx-drill="demo-add">أضف بيانات عرض</button>' : '';
    const foot = `<p class="nbx-c2-foot">نموذج يقرأ تقاريرك بقواعد ثابتة، ولاحقاً يحاورك بحرية. ${demoLink}</p>`;
    if (!d) {
      p.innerHTML = `${head}<div id="nbx-cp-main" class="nbx-cp-main"><section class="nbx-c2-focus"><span class="nbx-c2-label">ابدأ من هنا</span><h2>أنهِ حالة واحدة في غرفة الطوارئ</h2><p>يقرأ المدرب تقريرك، ويقول لك ما تحتاج تطويره، ويتدرّب معك عليه.</p>
        <button type="button" class="nbx-c2-main" data-nbx-coach-go="new">ابدأ حالة</button></section></div>${foot}`;
      return;
    }
    const focus = gaps.find(x => x.kind === 'drill' && x.stage !== 3) || gaps.find(x => x.stage !== 3) || null;
    const rest = gaps.filter(x => x !== focus);
    let focusHtml;
    if (focus && focus.kind === 'drill') {
      const step = ['تمرين موجّه', 'حالة حقيقية', 'أُغلق'];
      const act = focus.stage === 1
        ? `<button type="button" class="nbx-c2-main" data-nbx-drill="start" data-id="${focus.drill}" data-why="${esc(focus.why)}">ابدأ التمرين</button>`
        : `<button type="button" class="nbx-c2-main" data-nbx-drill="gap-case" data-case="${esc(DRILLS[focus.drill].next.id)}">ادخل الحالة الحقيقية</button><button type="button" class="nbx-c2-quiet" data-nbx-drill="start" data-id="${focus.drill}">أعد التمرين</button>`;
      focusHtml = `<section class="nbx-c2-focus"><span class="nbx-c2-label">تمرينك الآن</span><h2>${esc(focus.title)}</h2><p>${esc(focus.why)}</p>
        <ol class="nbx-c2-steps">${step.map((n, j) => `<li class="${focus.stage > j + 1 ? 'is-done' : focus.stage === j + 1 ? 'is-now' : ''}"><i></i><span>${n}</span></li>`).join('')}</ol>
        <div class="nbx-c2-act">${act}</div></section>`;
    } else if (focus) {
      focusHtml = `<section class="nbx-c2-focus"><span class="nbx-c2-label">ركّز على</span><h2>${esc(focus.title)}</h2><p>${esc(focus.why)} تمرينه الموجّه قيد الإعداد، فتدرّب عليه في حالة.</p>
        <div class="nbx-c2-act">${d.lowest ? `<button type="button" class="nbx-c2-main" data-nbx-drill="gap-case" data-case="${esc(caseOf(d.lowest))}">تدرّب في حالة</button>` : ''}</div></section>`;
    } else {
      focusHtml = `<section class="nbx-c2-focus is-clear"><span class="nbx-c2-label">لا شيء مفتوح</span><h2>أحسنت، لا نقاط تحتاج تطوير الآن</h2><p>استمر بالحالات، والمدرب يراقب تقاريرك.</p><div class="nbx-c2-act"><button type="button" class="nbx-c2-main" data-nbx-coach-go="new">حالة جديدة</button></div></section>`;
    }
    const restHtml = rest.length ? `<section class="nbx-c2-block"><h3>نقاط أخرى</h3><ul class="nbx-c2-list">${rest.map(x => `<li><div><b>${esc(x.title)}</b><small>${esc(x.stage === 3 ? 'أُغلق' : x.skill)}</small></div>${x.stage === 3 ? '<span class="nbx-c2-ok">✓</span>' : d.lowest ? `<button type="button" class="nbx-c2-quiet" data-nbx-drill="gap-case" data-case="${esc(caseOf(d.lowest))}">تدرّب</button>` : ''}</li>`).join('')}</ul></section>` : '';
    const sessions = d.runs.slice(0, 4).map(h => `<li><div><b>${esc(titleOf(h))}</b><small>${esc(new Date(h.ts).toLocaleDateString('ar-JO-u-nu-latn', { day: 'numeric', month: 'short' }))}</small></div><span class="nbx-c2-score ${h.passed ? 'is-ok' : 'is-low'}">${h.num}%</span></li>`).join('');
    const drills = record.length ? record.slice(0, 4).map(r => `<li><div><b>${esc(DRILL_NAME[r.drill] || r.drill)}</b><small>${esc(new Date(r.at).toLocaleDateString('ar-JO-u-nu-latn', { day: 'numeric', month: 'short' }))}</small></div><span class="nbx-c2-score ${r.score >= 70 ? 'is-ok' : 'is-low'}">${r.score}%</span></li>`).join('')
      : '<li class="nbx-c2-none">لم تبدأ أي تمرين بعد.</li>';
    p.innerHTML = `${head}
      <div id="nbx-cp-main" class="nbx-cp-main">
        ${focusHtml}
        ${restHtml}
        <div class="nbx-c2-two">
          <section class="nbx-c2-block"><h3>آخر جلساتك</h3><ul class="nbx-c2-list">${sessions}</ul></section>
          <section class="nbx-c2-block"><h3>تمارينك</h3><ul class="nbx-c2-list">${drills}</ul></section>
        </div>
      </div>${foot}`;
  }
  // leaving the coach's view hands it back to the legacy page as it was
  const showBeforeCoach = window.showOnlySection;
  window.showOnlySection = function (viewId) { showBeforeCoach(viewId); if (viewId !== 'coach') { fullOff(); const v = byId('view-coach'); if (v) v.classList.remove('nbx-cp-on'); const cb = byId('app-nav-coach'); if (cb) cb.classList.remove('active'); } };

  // the coach's own buttons, and the header's and the sidebar's «المدرب السريري», which lead to it
  document.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    if (t.closest('[data-nbx-coach-open]')) { if (window.NabdCoachDrill) window.NabdCoachDrill.open(); return; }
    const go = t.closest('[data-nbx-coach-go]');
    if (go) {
      const k = go.getAttribute('data-nbx-coach-go');
      if (k === 'new') { const b = byId('launch-er-random-btn'); if (b) b.click(); }
      else if (k === 'case' && window.NabdRoom) window.NabdRoom.openCase(go.getAttribute('data-case'));
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
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-nbx-drill]') : null;
    if (!b) return;
    const k = b.getAttribute('data-nbx-drill');
    if (k === 'start') { start(b.getAttribute('data-id') || 'elderly', b.getAttribute('data-why') || ''); return; }
    if (k === 'again' && S.d) { start(S.d.id, ''); return; }
    if (k === 'case' && S.d && window.NabdRoom) { window.NabdRoom.openCase(S.d.next.id); return; }
    if (k === 'close') { S.d = null; overview(); return; }
    if (k === 'home') { S.d = null; try { navigateTo('home'); } catch (err) {} return; }
    if (k === 'gap-case' && window.NabdRoom) { window.NabdRoom.openCase(b.getAttribute('data-case')); return; }
    if (k === 'demo-add') { seed(); return; }
    if (k === 'demo-clear') { clear(); }
  });

  /* ---------- the coach's demo data: a few sessions on the signed-in account, marked, and removable ---------- */
  function seed() {
    const u = user();
    if (!u) return;
    const day = 864e5, now = Date.now();
    const mk = (caseId, title, num, ago, axes, critical, major, hand) => ({
      caseTitle: 'غرفة الطوارئ · ' + title, mode: 'غرفة الطوارئ', caseId: 'er_' + caseId, num, passed: num >= 70 && !critical.length, score: `${num}% (${num >= 70 && !critical.length ? 'مجتاز' : 'غير مجتاز'})`,
      ts: now - ago * day, date: new Date(now - ago * day).toISOString().slice(0, 10), workupCount: 3, questions: 4, rubric: 'v2', demo: true,
      axes: [['safe', 'السلامة والإجراءات الحرجة', 35], ['assess', 'التقييم وإعادة التقييم', 15], ['dx', 'التشخيص', 10], ['tests', 'الفحوصات', 10], ['team', 'التواصل والفريق', 15], ['hand', 'التسليم والوجهة', 15]]
        .map(([k, label, max], j) => ({ k, label, max, pts: Math.round(max * axes[j]) })),
      critical, detail: { minutes: 6.5, role: 'doctor', major, minor: [], steps: [], hand: hand.map(([label, ok]) => ({ label, ok, miss: ok ? '' : 'لم يُذكر' })), reassess: '1/3', helps: [] }
    });
    const runs = [
      mk('htn', 'طارئة ارتفاع ضغط مع وذمة رئة حادة', 52, 6, [.6, .3, .7, .6, .5, .5], ['قصة مرضية غير كافية'], ['أعطيت أول دواء قبل أن تسأل عن الحساسية'], [['الخلفية', false], ['الحساسية', false], ['القراءات الحالية بالأرقام', true]]),
      mk('sepsis', 'التهاب رئوي مكتسب من المجتمع مع إنتان (sepsis)', 58, 4, [.6, .4, .7, .7, .6, .5], [], ['لم يحدث قبل التسليم: سوائل', 'أعطيت أول دواء قبل أن تسأل عن الحساسية'], [['الخلفية', false], ['الحساسية', true], ['القراءات الحالية بالأرقام', true]]),
      mk('asthma', 'نوبة ربو حادة مهددة للحياة', 78, 2, [.9, .6, 1, .8, .7, .8], [], [], [['الخلفية', true], ['الحساسية', true], ['القراءات الحالية بالأرقام', true]]),
      mk('htn', 'طارئة ارتفاع ضغط مع وذمة رئة حادة', 64, 1, [.7, .4, .7, .6, .6, .6], [], ['تأخر: نترات'], [['الخلفية', false], ['الحساسية', true], ['القراءات الحالية بالأرقام', true]])
    ].sort((a, b) => b.ts - a.ts);
    u.history = [...runs, ...(u.history || []).filter(h => !h.demo)].sort((a, b) => (b.ts || 0) - (a.ts || 0));
    saveAccount(u);
    if (byId('nbx-cp') && currentView === 'coach') overview(); else open();
  }
  function clear() {
    const u = user();
    if (!u) return;
    u.history = (u.history || []).filter(h => !h.demo);
    saveAccount(u);
    if (byId('nbx-cp') && currentView === 'coach') overview(); else { try { navigateTo('home'); } catch (e) {} }
  }

  window.NabdCoachDrill = Object.freeze({ open, overview, start, gapOf, gapsOf, openGaps, seed, clear, DRILLS, get active() { return !!byId('nbx-drill'); } });
