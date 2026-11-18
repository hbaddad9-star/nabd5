/* The ER room's assessment layer (V6.9, 2026-11-16; docs/decisions/0017-er-assessment-layer.md and
   docs/agent/er-agent.ar.md).
   The owner's decisions after the four-role review: the doctor's grading must be stricter than the nurse's, errors
   are ranked by how dangerous they are, asking for help has an orderly place in the room, reassessment after a
   treatment counts, and the report carries the case's objectives, a timeline and the trainee's own reflection.
   Like the realism mode this is a layer over the room and rides on the same switch: the legacy room (js/er.js)
   is not edited. It reads the room's state through window.__nbER, re-scores the doctor's run on the approved
   weights from the parts the room itself computed, and rewrites the report's head, parts and the saved result.
   With the mode off nothing here runs and the room's own score stands. The checks are keyword rules until the
   model reads the conversation; the document says which rule each one stands in for. */
(function () {
  'use strict';
  const view = document.getElementById('view-er');
  if (!view) return;
  const H = () => window.__nbER, P = () => window.__nbPlus;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // the room's own normalisation: marks off, Arabic digits to Latin, letter forms folded
  const norm = s => String(s == null ? '' : s).replace(/[ً-ٰٟـ]/g, '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[؟?!,،:؛()"'«»\-_/]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const mm = t => `${Math.floor(t)}:${String(Math.floor((t % 1) * 60)).padStart(2, '0')}`;
  const user = () => { try { return authState.user || null; } catch (e) { return null; } };
  const isNurse = E => !!E && E.role === 'nurse';
  const DISPO = { icu: 'العناية الحثيثة', hdu: 'مراقبة عالية في الطوارئ', cath: 'القسطرة', ward: 'طابق عادي', home: 'البيت' };

  /* the session's own notes: what the trainee wrote and when, and the help he asked for */
  const A = { E: null, msgs: [], helps: [], built: false, entry: null, result: null };
  document.addEventListener('submit', ev => {
    if (!ev.target || ev.target.id !== 'er-form' || !A.E || A.E.over) return;
    const text = String(($('er-input') || {}).value || '').trim();
    if (text) A.msgs.push({ at: A.E.sim, text: norm(text) });
  }, true);

  /* ---------- 1. asking for help, in order ---------- */
  const HELP = [
    { id: 'senior', title: 'الأخصائي المناوب', note: 'الحالة تسوء، أو قرار أكبر منك', say: 'نادوا الأخصائي المناوب' },
    { id: 'icu', title: 'العناية الحثيثة', note: 'تنفس يتعب، إشباع لا يرتفع، أو ضغط لا يستجيب', say: 'اتصلوا بالعناية الحثيثة' },
    { id: 'code', title: 'فريق الإنعاش (كود)', note: 'توقف وشيك: يظهر حين يدخل المونيتور مرحلة الخطر', say: 'اطلبوا فريق الإنعاش، code', needStage: 2 },
    { id: 'surgery', title: 'الجراحة', note: 'رأي جراحي عاجل', say: 'أطلب استشارة جراحة', needs: 'call_surgery' }
  ];
  // the nurse's room has two calls of its own: the doctor on the phone (who then asks for an SBAR) and the code team
  function nurseHelp(E) {
    const N = E.nurse || {}, doc = (N.sex === 'F' ? 'بالدكتورة ' : 'بالدكتور ') + (N.doc || '');
    return [
      { id: 'doc', title: 'الاتصال بالطبيب', note: 'تدهور، أو تحتاج أمراً طبياً: دواء، سوائل، تحاليل، تصوير. بعد الاتصال يسألك عن الوضع: قدّم له SBAR بالأرقام', say: 'بتصل ' + doc },
      { id: 'code', title: 'فريق الإنعاش (كود)', note: 'توقف وشيك: يظهر حين يدخل المونيتور مرحلة الخطر', say: 'نادوا فريق الإنعاش', needStage: 2 }
    ];
  }
  const helpList = E => (isNurse(E) ? nurseHelp(E) : HELP).filter(o => (!o.needs || (E.c.care || {})[o.needs]) && (!o.needStage || E.stage >= o.needStage));
  function closeHelp() { const m = $('nbq-help-menu'); if (m) m.remove(); const b = $('nbq-help'); if (b) b.setAttribute('aria-expanded', 'false'); }
  function openHelp(E) {
    const form = $('er-form'), stage = form && form.parentNode;
    if (!stage || $('nbq-help-menu')) { closeHelp(); return; }
    const m = document.createElement('div');
    m.id = 'nbq-help-menu';
    m.className = 'nbq-help-menu';
    m.setAttribute('role', 'menu');
    m.setAttribute('data-no-terms', '');
    m.style.bottom = (form.offsetHeight + 6) + 'px';
    m.innerHTML = '<p class="nbq-help-h">من تطلب؟</p>' + helpList(E).map(o =>
      `<button type="button" role="menuitem" data-nbq-help="${o.id}"><b>${esc(o.title)}</b><small>${esc(o.note)}</small></button>`).join('');
    stage.appendChild(m);
    $('nbq-help').setAttribute('aria-expanded', 'true');
    const first = m.querySelector('button');
    if (first) first.focus();
  }
  function helpButton(E) {
    const form = $('er-form'), end = $('er-end');
    let b = $('nbq-help');
    const want = !!form && !!end;
    if (!want) { if (b) b.remove(); closeHelp(); return; }
    if (!b) {
      b = document.createElement('button');
      b.type = 'button'; b.id = 'nbq-help'; b.className = 's nbq-help';
      b.setAttribute('aria-haspopup', 'menu'); b.setAttribute('aria-expanded', 'false');
      b.textContent = 'طلب مساعدة';
      form.insertBefore(b, end);
    }
    b.disabled = !!E.over || !!E.paused;
    if (b.disabled) closeHelp();
  }
  view.addEventListener('click', ev => {
    const E = A.E, t = ev.target;
    if (!E || !t || !t.closest) return;
    if (t.closest('#nbq-help')) { openHelp(E); return; }
    const pick = t.closest('[data-nbq-help]');
    if (pick) {
      const o = helpList(E).find(x => x.id === pick.getAttribute('data-nbq-help'));
      closeHelp();
      if (o && !E.over) {
        A.helps.push({ at: E.sim, id: o.id, title: o.title });
        A.msgs.push({ at: E.sim, text: norm(o.say) });
        try { H().send(o.say); } catch (e) {}
        const i = $('er-input'); if (i) i.focus();
      }
      return;
    }
    if (!t.closest('#nbq-help-menu')) closeHelp();
  });
  view.addEventListener('keydown', ev => {
    const m = $('nbq-help-menu');
    if (!m) return;
    if (ev.key === 'Escape') { closeHelp(); const b = $('nbq-help'); if (b) b.focus(); return; }
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
    const items = [...m.querySelectorAll('button')], i = items.indexOf(document.activeElement);
    if (!items.length) return;
    ev.preventDefault();
    items[(i + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
  });

  /* ---------- 2. the measures the room does not take ---------- */
  // going back to the patient after a treatment: asking how he is, repeating a reading, examining again
  const REASSESS = /(طمن|كيف صار|شو صار مع|شو وضع|كيف وضع|كيف حال|تحسن|احسن هلا|احسن هسا|كيف النفس|كيف نفس|كيف الالم|كيف الوجع|هلا كيف|هسا كيف|عيد|قيس|شيك|شوف.{0,10}(ضغط|نبض|اشباع|سكر)|اسمع.{0,6}صدر|افحص|reassess|recheck|repeat|كم صار|كم الاشباع|كم الضغط|قديش صار)/;
  // asking about allergy (the patient or the companion), and the first medicine given (oxygen and procedures aside)
  const ASK_ALLERGY = /(حساسي|تحسس|allerg)/;
  function allergyCheck(E) {
    const asked = A.msgs.find(m => ASK_ALLERGY.test(m.text)), D = H().D;
    const meds = [...E.done.entries()].filter(([id]) => { const a = (D.actions || []).find(k => k.id === id); return a && a.dose === true && id !== 'oxygen'; }).map(([, x]) => x.at);
    const first = meds.length ? Math.min(...meds) : null;
    return { askedAt: asked ? asked.at : null, known: !!asked || E.facts.has('allergy'), first, late: first != null && (!asked || asked.at > first) };
  }
  function reassessment(E) {
    const care = E.c.care || {};
    const given = [...E.done.entries()].filter(([id, x]) => x && (care[id] || {}).slow > 0 && id !== 'sit_up').map(([id, x]) => ({ id, at: x.at })).sort((a, b) => a.at - b.at);
    const rounds = [];
    given.forEach(g => { const r = rounds[rounds.length - 1]; if (r && g.at - r.from <= 1) { r.to = g.at; r.ids.push(g.id); } else rounds.push({ from: g.at, to: g.at, ids: [g.id] }); });
    const exams = (E.log || []).filter(l => l.type === 'exam').map(l => l.at);
    const reads = ['bp_repeat', 'temp'].map(id => E.done.get(id)).filter(Boolean).map(x => x.last || x.at);
    const counted = rounds.filter(r => E.sim - r.to >= 1); // the case ended before there was time to go back
    counted.forEach(r => {
      const inWin = t => t > r.to && t <= r.to + 3;
      r.ok = A.msgs.some(m => inWin(m.at) && REASSESS.test(m.text)) || exams.some(inWin) || reads.some(inWin);
    });
    // nothing given earns nothing; a treatment given in the last minute is not held against him
    return { rounds: counted, done: counted.filter(r => r.ok).length, frac: counted.length ? counted.filter(r => r.ok).length / counted.length : given.length ? 1 : 0 };
  }

  // the room's own safety list, rebuilt from its state (key care steps and timed results)
  const doneAs = (E, id) => E.done.get(id) || (id === 'call_senior' ? E.done.get('call_icu') : undefined);
  function steps(E) {
    const c = E.c, out = [];
    Object.entries(c.care || {}).filter(([, d]) => d.key).forEach(([id, d]) => { const x = doneAs(E, id); out.push({ id, label: d.label, by: d.by, at: x ? x.at : null, state: !x ? 'missed' : x.at <= d.by ? 'ontime' : 'late' }); });
    Object.entries(c.results || {}).filter(([, r]) => r.by).forEach(([id, r]) => { const x = E.tests[id]; out.push({ id, label: r.label, by: r.by, at: x ? x.at : null, state: !x ? 'missed' : x.at <= r.by ? 'ontime' : 'late' }); });
    return out;
  }
  /* D-07 (2026-11-16): a missed key step is critical when it saves life now or its time had passed; one whose
     time had not come when the patient was handed over is a major error. The physician marks "lifesaving" per step
     in the case template; until then these steps and timed results count as lifesaving. */
  const LIFESAVING = ['oxygen', 'neb_salbutamol', 'fluids', 'antibiotics', 'aspirin', 'cath_lab', 'anticoag', 'airway', 'nitrate', 'shock', 'ecg', 'glucose'];
  const lifesaving = (E, k) => { const d = (E.c.care || {})[k.id] || (E.c.results || {})[k.id] || {}; return d.lifesaving === true || (d.lifesaving !== false && LIFESAVING.includes(k.id)); };
  const fell = E => !!E.c.collapse && (E.topStage >= 3 || E.done.has(E.c.collapse.need));
  const dispoRight = E => (fell(E) ? E.c.collapse.dispo : E.c.dispo);
  function dispoCheck(E, place) {
    if ((E.c.dispoBad || []).includes(place)) return 'bad';
    return place === dispoRight(E) || (!fell(E) && (E.c.dispoAlso || []).includes(place)) ? 'right' : 'wrong';
  }

  // a dose three times the upper limit or more is not a slip, it is a critical error
  const UNIT = [[/(mcg|ميكرو)/, 'mcg'], [/(^|[^a-z])mg|ملغ|ملي ?غرام|ملجم/, 'mg'], [/(^|[^a-z])g($|[^a-z])|غرام|جرام/, 'g'], [/(^|[^a-z])l($|[^a-z])|لتر/, 'l'], [/(^|[^a-z])ml|مل($| )/, 'ml'], [/unit|وحد/, 'unit']];
  function overdose(w) {
    const D = H().D, a = (D.actions || []).find(x => x.ar === w.ar || x.id === w.id);
    const s = norm(w.dose), n = parseFloat((s.match(/\d+(\.\d+)?/) || [])[0]);
    if (!a || !a.limits || !(n > 0)) return 0;
    const unit = (UNIT.find(([re]) => re.test(s)) || [])[1];
    const lim = a.limits.find(l => String(l.unit).toLowerCase() === unit);
    return lim && lim.hi > 0 ? n / lim.hi : 0;
  }

  /* ---------- 3. the doctor's handover, graded by what it says ---------- */
  const SITUATION = /(ضيق|نفس|الم|وجع|صدر|حراره|سخونه|استفراغ|دوخه|هبوط|اغماء|تعب|اجا|اجت|دخل|وصل|يشكي|تشكي|complain|present)/;
  // a disease name alone is the situation, not the background: the background says what is known about the patient
  const BACKGROUND = /(معروف|سوابق|تاريخ مرضي|history|known|مزمن|من صغر|من سنين|مدخن|بدخن|ادويه|ادويت|بياخد|بتاخد|بخاخ|عمليه سابقه|عمليات|حبوب|انسولين|ما عنده امراض|ما عندها امراض|بدون امراض|لا يوجد امراض|مريض سكري|مريضه سكري|مريض ضغط|مريضه ضغط|مريض قلب|مريضه قلب|مريض كل|مريضه كل)/;
  const ALLERGY = /(حساسي|تحسس|allerg)/;
  const PLAN = /(بدي|اقترح|نحتاج|يحتاج|تحتاج|لازم|توصي|انصح|plan|recommend|خطه|يكمل|تكمل|كملوا|متابعه|مراقبه|monitor|نعيد|بانتظار|ننتظر|pending)/;
  function handover(E) {
    const d = E.draft || {}, handed = E.outcome !== 'arrest' && !!String(d.sbar || '').trim();
    if (!handed) return { handed: false, checks: [], pts: 0, place: null };
    const c = E.c, p = c.patient || {}, raw = norm(d.sbar);
    const names = norm(p.name || '').split(' ').filter(w => w.length > 2 && !/^(الحاج|الحاجه|ابو|ام)$/.test(w));
    const ident = names.some(w => raw.includes(w)) || new RegExp('(^|\\D)' + p.age + '(\\D|$)').test(raw);
    const problem = [...(c.dx.accept || []), ...(c.dx.close || [])].some(w => raw.includes(norm(w))) || SITUATION.test(raw);
    // the numbers must be the patient's: age, durations and doses are set aside, the rest is held against the monitor
    const bare = raw.replace(/(عمره|عمرها|عمر)\s*\d+/g, ' ').replace(/\d+(\.\d+)?\s*(سنه|سنين|سنوات|عام|year|yo|ساعه|ساعات|ساعتين|يوم|ايام|دقيقه|دقايق|لتر|l|mg|ملغ|غرام|g|mcg|ml|مل)(\s|$)/g, ' ');
    const nums = (bare.match(/\d+(\.\d+)?/g) || []).map(Number);
    let v = null;
    try { v = H().live(); } catch (e) { v = null; }
    const near = v ? [['spo2', 3], ['hr', 12], ['rr', 4], ['sbp', 12]].filter(([k, tol]) => nums.some(n => Math.abs(n - v[k]) <= tol)).map(([k]) => k) : [];
    const D = H().D, given = [...E.done.keys()].map(id => (D.actions || []).find(a => a.id === id)).filter(a => a && a.kw && !/^(call_|temp$|bp_repeat$)/.test(a.id));
    const said = given.filter(a => a.kw.some(k => raw.includes(norm(k))) || raw.includes(norm(a.ar)));
    const checks = [
      { k: 's', label: 'هوية المريض ومشكلته', ok: ident && problem, miss: !ident ? 'لم تذكر اسم المريض أو عمره' : 'لم تذكر بماذا جاء' },
      { k: 'b', label: 'الخلفية', ok: BACKGROUND.test(raw), miss: 'لا أمراض سابقة ولا أدوية في تسليمك' },
      { k: 'a', label: 'القراءات الحالية بالأرقام', ok: near.length >= 2, miss: near.length ? 'رقم واحد يطابق المونيتور، والمطلوب قراءتان على الأقل' : 'لا رقم في تسليمك يطابق قراءات المونيتور الآن' },
      { k: 'g', label: 'ما أُعطي', ok: said.length > 0, miss: given.length ? 'لم تذكر أي علاج مما أُعطي' : 'لم يُعطَ علاج لتذكره' },
      { k: 'al', label: 'الحساسية', ok: ALLERGY.test(raw) && allergyCheck(E).known, miss: ALLERGY.test(raw) ? 'ذكرت الحساسية ولم تسأل عنها خلال الحالة' : 'من يستلم لا يعرف إن كان عند المريض حساسية' },
      { k: 'r', label: 'الخطة والمعلّق', ok: PLAN.test(raw), miss: 'لا توصية ولا ما ينتظر المستلم' }
    ];
    const place = dispoCheck(E, d.dispo);
    // "gave aspirin" about a drug nobody gave: the room's own rule, read here from the same state
    const claims = /(اعطيت|عطيت|اعطيناه|اعطيناها|عطيناه|عطيناها|اخذ|اخد|gave|given|started)/.test(raw) && !/(بدي|اقترح|نحتاج|يحتاج|تحتاج|لازم|need|plan)/.test(raw);
    const invented = claims && (D.actions || []).some(a => a.limits && !E.done.has(a.id) && a.kw.some(k => raw.includes(norm(k))));
    const pts = clamp(checks.filter(x => x.ok).length * 1.5 + (place === 'right' ? 6 : 0) - (invented ? 4 : 0), 0, 15);
    return { handed: true, checks, pts, place, invented, dispo: d.dispo };
  }

  /* ---------- 4. the score on the approved weights ---------- */
  function passMark() {
    const u = user();
    try {
      const s = (window.NabdStore && window.NabdStore.consoleState()) || {};
      // a university student is known by his e-mail on the university's roster (the consoles' own lookup)
      let org = u && u.org;
      if (!org && u && u.email && window.NabdUni) { const w = window.NabdUni.whois(u.email); if (w && w.org) org = w.org.id; }
      const marks = org && s.uni && s.uni[org] && s.uni[org].policy && s.uni[org].policy.passMarks;
      const w = u && u.email && window.NabdUni ? window.NabdUni.whois(u.email) : null;
      const cy = w && w.course && /(\d)\d\d/.exec(w.course.code || '');
      const m = marks && Number(marks[cy ? Number(cy[1]) : Number(u.year) || 0]);
      if (m >= 40 && m <= 95) return m;
    } catch (e) {}
    return 70;
  }
  function assess(E, legacy) {
    const c = E.c, st = steps(E), hand = handover(E), re = reassessment(E);
    const handed = hand.handed;
    // --- errors by severity ---
    const critical = [], major = [], minor = [];
    if (E.outcome === 'arrest') critical.push({ text: 'توقف القلب قبل أن تستقر الحالة', at: E.sim });
    (E.harms || []).filter(h => h.risk >= 8).forEach(h => critical.push({ text: 'أذى وصل إلى المريض: ' + h.label, at: h.at, why: h.why }));
    (E.wrongDoses || []).forEach(w => {
      const x = overdose(w), ref = w.ref ? 'المرجع: ' + w.ref : '';
      const a = (H().D.actions || []).find(k => k.id === w.id || k.ar === w.ar), got = a && E.done.get(a.id);
      const reached = !!got && norm(got.dose) === norm(w.dose);
      const times = x >= 1.5 ? ` (${Math.round(x)} أضعاف الحد الأعلى)` : '';
      if (reached && x >= 3) critical.push({ text: `جرعة أُعطيت للمريض${times}: ${w.ar} ${w.dose}`, why: ref });
      else if (reached) major.push({ text: `جرعة خارج المدى أُعطيت: ${w.ar} ${w.dose}`, why: ref });
      else major.push({ text: `طلبت جرعة خاطئة${times} وأوقفتها الممرضة: ${w.ar} ${w.dose}`, why: (ref ? ref + '. ' : '') + 'في الواقع قد لا يوقفك أحد.' });
    });
    st.filter(k => k.state === 'missed').forEach(k => {
      if (lifesaving(E, k) || E.sim > k.by) critical.push({ text: 'إجراء أساسي لم يحدث: ' + k.label });
      else major.push({ text: 'لم يحدث قبل التسليم: ' + k.label, why: `سلّمت المريض عند الدقيقة ${mm(E.sim)} قبل موعده، ومن يستلمه يجب أن يعرف أنه لم يُعطَ بعد.` });
    });
    /* D-08 (2026-11-16): the history is part of the case. Fewer than two of the case's red-flag facts (or all of
       them when it has fewer) and the case is not passed, whatever the number. */
    const reds = [...(c.facts || []), ...(c.exam || [])].filter(f => f.red), got = reds.filter(f => E.facts.has(f.id) || E.exam.has(f.id));
    const need = Math.min(2, reds.length);
    if (got.length < need) critical.push({ text: `قصة مرضية غير كافية: وصلت إلى ${got.length} من ${reds.length} معلومات خطر، والحد الأدنى ${need}`, why: 'اسأل المريض أو مرافقه قبل أن تقرّر: متى بدأ، ماذا جرّب، أمراضه وأدويته وحساسيته.' });
    if (handed && hand.place === 'bad') critical.push({ text: 'وجهة خطرة: ' + (DISPO[hand.dispo] || '') });
    if (handed && E.vtNow) critical.push({ text: 'VT لم يُعالج عند التسليم' });
    if (handed && fell(E) && !E.done.has(c.collapse.need)) critical.push({ text: 'هبوط لم يُعالج عند التسليم' });
    if (handed && E.anaph && !E.anaph.treated) critical.push({ text: 'تأق لم يُعالج بالأدرينالين' });
    if (handed && !Object.keys(E.tests || {}).length) critical.push({ text: 'سُلّمت الحالة بلا أي فحص' });
    (E.harms || []).filter(h => h.risk < 8).forEach(h => major.push({ text: h.label, at: h.at, why: h.why }));
    (E.caught || []).filter(x => !E.harmed.has(x.id)).forEach(x => major.push({ text: 'أمر غير آمن أوقفته الممرضة: ' + x.ar, why: x.why || '' }));
    st.filter(k => k.state === 'late').forEach(k => major.push({ text: 'تأخر: ' + k.label, at: k.at }));
    if (hand.invented) major.push({ text: 'ذكرت في التسليم علاجاً لم يُعطَ' });
    const al = allergyCheck(E);
    if (al.late) major.push({ text: al.askedAt == null ? 'أعطيت أدوية ولم تسأل عن الحساسية أبداً' : 'أعطيت أول دواء قبل أن تسأل عن الحساسية', at: al.first, why: 'اسأل المريض أو مرافقه عن الحساسية قبل أول دواء، ولو بجملة واحدة.' });
    // D-10: high-flow oxygen left running on a saturation of 99% or more, never turned down
    const ox = E.done.get('oxygen'), flow = ox ? parseFloat((String(ox.dose || '').match(/\d+(\.\d+)?/) || [])[0]) : 0;
    let sat = null; try { sat = Math.round(H().live().spo2); } catch (e) {}
    const down = A.msgs.some(m => /(خفف|خففو|نزل|نزلو|قلل|قللو|وقف|اوقف|شيل).{0,20}(اكسجين|اوكسجين|o2|لتر|nasal)/.test(m.text));
    const tgt = (String(((c.care || {}).oxygen || {}).why || '').match(/(\d\d)\s*[–-]\s*(\d\d)/) || [null, '94', '98']);
    if (handed && ox && flow >= 10 && sat >= 99 && !down) minor.push({ text: `أكسجين عالٍ (${flow} لتر) والإشباع ${sat}%، ولم تخفّضه`, why: `الهدف في هذه الحالة ${tgt[1]}–${tgt[2]}%. الأكسجين دواء: يُخفَّض حين يتجاوز الإشباع الهدف.` });
    (E.unneeded || []).forEach(u => minor.push({ text: u.label, why: u.why }));
    Object.values(E.tests || {}).filter(t => t.ind === 'no' && t.justOk !== true).forEach(t => { const m = (H().D.tests || []).find(x => x.id === t.id) || {}; minor.push({ text: 'فحص غير لازم: ' + (m.ar || t.id), at: t.at }); });
    if (E.comm && E.comm.jargon > 0) minor.push({ text: `مصطلحات طبية مع الأهل (${E.comm.jargon})` });

    // --- team: help in time, and the interruptions ---
    const call = doneAs(E, 'call_senior') || E.done.get('call_surgery'), needHelp = (c.care.call_senior || {}).key || E.topStage >= 2;
    const by = (c.care.call_senior || {}).by || 10;
    // D-09: nothing to fail earns its points only when the patient was handed over alive
    const helpPts = call ? (call.at <= by ? 3 : 1.5) : needHelp || !handed ? 0 : 3;
    const fired = P() ? P().fired() : [];
    const intPts = fired.length ? 2 * fired.filter(i => i.answered).length / fired.length : handed ? 2 : 0;

    // --- the six axes ---
    const axes = [
      // a major error the room does not charge is charged here: a medicine before the allergy question costs 3
      { k: 'safe', label: 'السلامة والإجراءات الحرجة', max: 35, pts: legacy.safe * 35 / 40 - (al.late ? 3 : 0), comp: 'التعرّف على المريض الحرج وتدبيره' },
      { k: 'assess', label: 'التقييم وإعادة التقييم', max: 15, pts: legacy.hist + 5 * re.frac, comp: 'القصة والفحص السريري' },
      { k: 'dx', label: 'التشخيص', max: 10, pts: legacy.dx * 10 / 15, comp: 'الاستدلال السريري' },
      { k: 'tests', label: 'الفحوصات', max: 10, pts: legacy.tests * 10 / 15, comp: 'طلب الفحوصات وقراءتها' },
      { k: 'team', label: 'التواصل والفريق', max: 15, pts: legacy.comm + helpPts + intPts, comp: 'التواصل والعمل ضمن فريق' },
      { k: 'hand', label: 'التسليم والوجهة', max: 15, pts: hand.pts, comp: 'تسليم المريض' }
    ].map(a => ({ ...a, pts: clamp(Math.round(a.pts * 10) / 10, 0, a.max) }));
    const total = Math.round(axes.reduce((s, a) => s + a.pts, 0));
    const mark = passMark(), passed = total >= mark && !critical.length;
    return { total, mark, passed, axes, critical, major, minor, steps: st, hand, re, help: { call, need: needHelp, by, pts: helpPts }, ints: { fired, pts: intPts }, legacyDx: legacy.dx };
  }

  /* ---------- 5. the timeline ---------- */
  const TYPE = { action: 'إجراء', test: 'فحص', harm: 'خطأ', stage: 'حالة المريض', better: 'تحسّن', comm: 'تواصل', exam: 'فحص سريري', read: 'قراءة نتيجة', dose: 'جرعة', order: 'أمر', check: 'تحقق', scope: 'حدود الدور', int: 'مقاطعة', help: 'طلب مساعدة' };
  function timeline(E) {
    const rows = (E.log || []).map(l => ({ at: l.at, type: l.type, text: l.text }));
    (P() ? P().fired() : []).forEach(i => rows.push({ at: i.firedAt, type: 'int', text: i.name + (i.answered ? ' · تعاملت معه' : ' · بلا رد') }));
    A.helps.forEach(h => rows.push({ at: h.at, type: 'help', text: h.title }));
    const asked = rows.filter(r => r.type === 'help');
    return rows.filter(r => !(r.type === 'action' && /^(استدعاء|إبلاغ|نداء)/.test(r.text) && asked.some(h => Math.abs(h.at - r.at) < 0.05))).filter(r => r.at != null).sort((a, b) => a.at - b.at).slice(0, 60);
  }

  /* ---------- 6. the report ---------- */
  const STATE = { ontime: ['في وقته', 'ok'], late: ['متأخر', 'mid'], missed: ['لم يحدث', 'bad'] };
  const sevList = (list, cls) => list.map(x => `<li class="${cls}"><b>${esc(x.text)}</b>${x.at != null ? `<span class="font-num" dir="ltr">${mm(x.at)}</span>` : ''}${x.why ? `<small>${esc(x.why)}</small>` : ''}</li>`).join('');
  function sections(E, r) {
    const c = E.c, d = E.draft || {};
    const dxState = !r.hand.handed ? ['لا تسليم', 'bad'] : r.legacyDx >= 15 ? ['صحيح', 'ok'] : r.legacyDx > 0 ? ['قريب', 'mid'] : ['غير مطابق', 'bad'];
    const goals = r.steps.map(k => `<tr><td>${esc(k.label)}</td><td class="font-num" dir="ltr">≤ ${k.by}:00</td><td class="font-num" dir="ltr">${k.at == null ? '—' : mm(k.at)}</td><td><span class="nbq-chip is-${STATE[k.state][1]}">${STATE[k.state][0]}</span></td></tr>`).join('')
      + `<tr><td>التشخيص</td><td>${esc(fell(E) && c.collapse.dx ? c.collapse.dx : c.dx.ar)}</td><td>${r.hand.handed ? esc(d.dx || '') : '—'}</td><td><span class="nbq-chip is-${dxState[1]}">${dxState[0]}</span></td></tr>`
      + `<tr><td>الوجهة</td><td>${esc(DISPO[dispoRight(E)] || '')}</td><td>${r.hand.handed ? esc(DISPO[d.dispo] || '') : '—'}</td><td><span class="nbq-chip is-${!r.hand.handed ? 'bad' : r.hand.place === 'right' ? 'ok' : r.hand.place === 'bad' ? 'bad' : 'mid'}">${!r.hand.handed ? 'لا تسليم' : r.hand.place === 'right' ? 'صحيحة' : r.hand.place === 'bad' ? 'خطرة' : 'غير الأنسب'}</span></td></tr>`;
    const crit = r.critical.length ? `<section class="nbq-crit" data-no-terms><h4>خطأ حرج: الحالة غير مجتازة مهما كانت الدرجة</h4><ul>${sevList(r.critical, 'is-crit')}</ul></section>` : '';
    const sev = !r.major.length && !r.minor.length ? `<section class="nbq-box" data-no-terms><h4>الأخطاء حسب الخطورة</h4><p class="nbq-line nbq-clean">لا أخطاء جسيمة ولا بسيطة في هذه المحاولة.</p></section>` : `<section class="nbq-box" data-no-terms><h4>الأخطاء حسب الخطورة</h4>
      <div class="nbq-sev"><div><h5 class="t-major">جسيم <span class="font-num">${r.major.length}</span></h5>${r.major.length ? `<ul>${sevList(r.major, 'is-major')}</ul>` : '<p>لا شيء.</p>'}</div>
      <div><h5 class="t-minor">بسيط <span class="font-num">${r.minor.length}</span></h5>${r.minor.length ? `<ul>${sevList(r.minor, 'is-minor')}</ul>` : '<p>لا شيء.</p>'}</div></div></section>`;
    const reLine = r.re.rounds.length ? `أعدت تقييم المريض بعد ${r.re.done} من ${r.re.rounds.length} ${r.re.rounds.length === 1 ? 'تدخل' : 'تدخلات'}.` : 'لم يُسجَّل تدخل يحتاج إعادة تقييم.';
    const helpLine = r.help.call ? `طلبت المساعدة عند الدقيقة ${mm(r.help.call.at)}${r.help.call.at <= r.help.by ? '، في وقتها' : `، والمتوقع قبل الدقيقة ${r.help.by}`}.` : r.help.need ? 'لم تطلب مساعدة، والحالة كانت تستدعيها.' : 'لم تحتج الحالة إلى طلب مساعدة.';
    const how = `<section class="nbq-box" data-no-terms><h4>أهداف الحالة: المتوقع وما فعلته</h4>
      <div class="nbq-scroll"><table class="nbq-goals"><thead><tr><th>الهدف</th><th>المتوقع</th><th>أنت</th><th>النتيجة</th></tr></thead><tbody>${goals}</tbody></table></div>
      <p class="nbq-line"><b>إعادة التقييم:</b> ${reLine} بعد كل علاج ارجع إلى المريض: كيف النفس، كم صار الإشباع، كم الضغط.</p>
      <p class="nbq-line"><b>طلب المساعدة:</b> ${helpLine}</p></section>`;
    const hand = !r.hand.handed ? '' : `<section class="nbq-box" data-no-terms><h4>تسليمك: ما ذُكر وما نقص</h4>
      <ul class="nbq-hand">${r.hand.checks.map(x => `<li class="${x.ok ? 'is-ok' : 'is-miss'}"><b>${esc(x.label)}</b><span>${x.ok ? 'ذُكر' : esc(x.miss)}</span></li>`).join('')}</ul>
      ${r.hand.invented ? '<p class="nbq-line is-bad">ذكرت علاجاً لم يُعطَ. التسليم الخاطئ يضلل من يستلم المريض.</p>' : ''}
      <p class="nbq-note">الأرقام تُقارن بقراءات المونيتور وقت التسليم. رقم واحد أو كلمة عامة لا تكفي.</p></section>`;
    return { crit, body: how + sev + hand };
  }
  function timeBox(rows) {
    return `<section class="nbq-box nbq-time" data-no-terms><h4>الخط الزمني للجلسة</h4>${rows.length ? `<ol>${rows.map(l => `<li class="t-${esc(l.type)}"><time class="font-num" dir="ltr">${mm(l.at)}</time><span class="nbq-tag">${esc(TYPE[l.type] || l.type)}</span><p>${esc(l.text)}</p></li>`).join('')}</ol>` : '<p>لا أحداث مسجّلة.</p>'}</section>`;
  }

  // the saved result follows the report: the number, the verdict, the axes, the timeline and the reflection
  function resave(u) {
    try {
      const avgOf = runs => runs.length ? Math.round(runs.reduce((a, h) => a + (h.num || 0), 0) / runs.length) + '%' : '';
      const er = (u.history || []).filter(h => /^er_/.test(h.caseId || ''));
      const doc = avgOf(er.filter(h => !/_n$/.test(h.caseId))), nur = avgOf(er.filter(h => /_n$/.test(h.caseId)));
      u.stats = u.stats || {};
      if (doc) u.stats.avgErDoctor = doc; else delete u.stats.avgErDoctor;
      if (nur) u.stats.avgErNurse = nur; else delete u.stats.avgErNurse;
      const nursing = typeof nbTrackOf === 'function' && nbTrackOf(u) === 'nursing';
      u.stats.avgEr = (nursing ? nur || doc : doc || nur) || avgOf(er);
      if (typeof saveAccountToStorage === 'function') saveAccountToStorage(u);
      if (typeof renderHomePath === 'function') renderHomePath(u);
    } catch (e) {}
  }
  function entryOf(E) {
    const u = user(), h = u && u.history && u.history[0];
    return h && h.caseId === 'er_' + E.c.id + (isNurse(E) ? '_n' : '') && Date.now() - (h.ts || 0) < 120000 ? h : null;
  }

  function reflectCard(E, box) {
    const card = document.createElement('section');
    card.className = 'nbq-reflect';
    card.setAttribute('data-no-terms', '');
    card.innerHTML = `<h4>قبل أن تقرأ تقريرك</h4>
      <p>سؤالان قصيران. إجابتك تُحفظ مع النتيجة ويقرؤها مشرفك، ولا تغيّر درجتك.</p>
      <label>ما أصعب لحظة في هذه الحالة؟<textarea id="nbq-r1" rows="2" maxlength="300"></textarea></label>
      <label>لو أعدتها الآن، ما أول شيء تغيّره؟<textarea id="nbq-r2" rows="2" maxlength="300"></textarea></label>
      <div class="nbq-reflect-f"><button type="button" class="nbq-skip" data-nbq-reflect="skip">تخطَّ</button><button type="button" class="nbq-go" data-nbq-reflect="go">اعرض تقريري</button></div>`;
    box.insertBefore(card, box.firstChild);
    box.classList.add('nbq-waiting');
    const done = keep => {
      const r1 = keep ? String($('nbq-r1').value || '').trim() : '', r2 = keep ? String($('nbq-r2').value || '').trim() : '';
      card.remove();
      box.classList.remove('nbq-waiting');
      if (r1 || r2) {
        const page = box.querySelector('.er-report-page'), foot = page && page.querySelector('.er-pane-f');
        const sec = document.createElement('section');
        sec.className = 'nbq-box nbq-mine';
        sec.setAttribute('data-no-terms', '');
        sec.innerHTML = `<h4>تأملك</h4>${r1 ? `<p><b>أصعب لحظة:</b> ${esc(r1)}</p>` : ''}${r2 ? `<p><b>ما تغيّره:</b> ${esc(r2)}</p>` : ''}`;
        if (page) page.insertBefore(sec, foot || null);
        if (A.entry) { A.entry.reflect = { hard: r1, change: r2 }; const u = user(); if (u) resave(u); }
      }
      const score = box.querySelector('.er-score');
      if (score) score.focus({ preventScroll: true });
      box.scrollTop = 0;
    };
    card.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('[data-nbq-reflect]'); if (b) done(b.getAttribute('data-nbq-reflect') === 'go'); });
    const first = $('nbq-r1'); if (first) first.focus({ preventScroll: true });
  }

  function dedupe(page, st) {
    const good = page.querySelector('.er-good'), gaps = page.querySelector('.er-gaps');
    const onTime = st.filter(k => k.state === 'ontime').length, notOnTime = st.length - onTime;
    if (good) {
      [...good.children].slice(0, onTime).forEach(li => li.remove());
      [...good.children].filter(li => /^الوجهة صحيحة/.test(li.textContent.trim())).forEach(li => li.remove());
    }
    if (gaps) {
      [...gaps.children].slice(0, notOnTime).forEach(li => li.remove());
      [...gaps.children].forEach(li => {
        const b = ((li.querySelector('b') || {}).textContent || '').trim();
        if (/^(التسليم|الـ ?handover|handover|الوجهة)$/i.test(b) || /(جرعة|dose) غير صحيحة/i.test(b) || /^أوقفتك الممرضة/.test(b)) li.remove();
      });
    }
    [good, gaps].forEach(list => { if (list && !list.children.length) { const h = list.previousElementSibling; if (h && h.tagName === 'H4') h.remove(); list.remove(); } });
  }
  // the last finished attempt at the same case, in the same role
  function previous(E) {
    const u = user(), id = 'er_' + E.c.id + (isNurse(E) ? '_n' : '');
    return ((u && u.history) || []).slice(1).find(h => h && h.caseId === id && typeof h.num === 'number') || null;
  }
  // everything the report says, kept with the result: the student can read it again and the supervisor reviews it
  function detailOf(E, r) {
    const c = E.c, d = E.draft || {}, hand = r && r.hand;
    return {
      minutes: Math.round(E.sim * 100) / 100, role: isNurse(E) ? 'nurse' : 'doctor', caseId: c.id, bed: c.bed, patient: (c.patient || {}).name || '',
      dx: d.dx || '', dxRight: fell(E) && c.collapse.dx ? c.collapse.dx : c.dx.ar, dispo: d.dispo || '', dispoRight: dispoRight(E), sbar: d.sbar || '',
      outcome: E.outcome || '', major: r ? r.major.map(x => x.text) : [], minor: r ? r.minor.map(x => x.text) : [],
      steps: r ? r.steps.map(k => ({ label: k.label, by: k.by, at: k.at == null ? null : Math.round(k.at * 100) / 100, state: k.state })) : [],
      hand: hand && hand.handed ? hand.checks.map(x => ({ label: x.label, ok: x.ok, miss: x.miss })) : [],
      reassess: r ? `${r.re.done}/${r.re.rounds.length}` : '', helps: A.helps.map(h => h.title)
    };
  }
  // the nurse's report keeps its own seven parts and its own verdict; they are read from the page as the room wrote them
  const NURSE_AXES = ['التقييم الأولي (ABCDE)', 'التعرف على التدهور والتصعيد', 'التدخلات ضمن نطاق التمريض', 'سلامة الدواء', 'المتابعة وإعادة التقييم', 'التواصل', 'التسليم (SBAR)'];
  function nurseParts(page) {
    const parts = [...page.querySelectorAll('.er-parts li b')].map(b => (b.textContent.match(/([\d.]+)\s*\/\s*([\d.]+)/) || []).slice(1).map(Number));
    if (parts.length !== NURSE_AXES.length || parts.some(p => p.length !== 2)) return null;
    return parts.map(([pts, max], i) => ({ k: 'n' + i, label: NURSE_AXES[i], pts, max }));
  }
  function build(E) {
    const box = $('er-debrief'), page = box && !box.hidden && box.querySelector('.er-report-page');
    if (!page || page.querySelector('.nbq-time')) return false;
    const foot = page.querySelector('.er-pane-f');
    const rows = timeline(E);
    A.entry = entryOf(E);
    if (!isNurse(E)) {
      const parts = [...page.querySelectorAll('.er-parts li b')].map(b => parseFloat(b.textContent));
      if (parts.length === 6 && parts.every(n => n >= 0)) {
        const r = assess(E, { safe: parts[0], dx: parts[1], tests: parts[2], hist: parts[3], comm: parts[4], hand: parts[5] });
        A.result = r;
        const s = sections(E, r);
        const num = page.querySelector('.er-score b'), verdict = page.querySelector('.er-score span');
        if (num) num.textContent = String(r.total);
        const prev = previous(E);
        if (num) num.insertAdjacentHTML('beforeend', '<small class="nbq-of">/100</small>');
        const head = page.querySelector('.er-score');
        if (head) head.classList.add(r.passed ? 'nbq-pass' : 'nbq-fail');
        if (verdict) { verdict.setAttribute('data-no-terms', ''); verdict.innerHTML = `<em class="nbq-verdict">${r.passed ? 'مجتاز' : r.critical.length ? 'غير مجتاز: خطأ حرج' : 'غير مجتاز'}</em> علامة النجاح ${r.mark} · مدة الحالة ${mm(E.sim)}${prev ? ` · محاولتك السابقة <b class="font-num">${prev.num}</b> ${r.total > prev.num ? '<i class="nbq-up">تحسّنت</i>' : r.total < prev.num ? '<i class="nbq-down">تراجعت</i>' : ''}` : ''}`; }
        const list = page.querySelector('.er-parts');
        list.setAttribute('data-no-terms', '');
        list.innerHTML = r.axes.map(a => `<li>${esc(a.label)} <b class="font-num">${Math.round(a.pts)} / ${a.max}</b></li>`).join('');
        list.insertAdjacentHTML('afterend', s.crit + s.body);
        dedupe(page, r.steps);
        if (A.entry) Object.assign(A.entry, { num: r.total, passed: r.passed, score: `${r.total}% (${r.passed ? 'مجتاز' : 'غير مجتاز'})`, rubric: 'v2', mark: r.mark,
          axes: r.axes.map(a => ({ k: a.k, label: a.label, pts: a.pts, max: a.max, comp: a.comp })), critical: r.critical.map(x => x.text),
          detail: detailOf(E, r) });
      }
    }
    if (isNurse(E) && A.entry) {
      const axes = nurseParts(page), v = ((page.querySelector('.er-score span') || {}).textContent || '');
      const fails = /غير مجتاز:/.test(v) ? v.split('غير مجتاز:')[1].split('·')[0].split('،').map(x => x.trim()).filter(Boolean) : [];
      Object.assign(A.entry, { rubric: 'nurse-v1', axes, critical: fails, detail: detailOf(E, null) });
    }
    const t = document.createElement('div');
    t.innerHTML = timeBox(rows);
    page.insertBefore(t.firstChild, foot || null);
    if (A.entry) { A.entry.timeline = rows.slice(0, 40).map(l => ({ at: Math.round(l.at * 100) / 100, type: l.type, text: l.text })); const u = user(); if (u) resave(u); }
    reflectCard(E, box);
    return true;
  }

  /* ---------- why «سلّم» is disabled: a word counter under each box and one line saying what is missing ----------
     The room enables the button only when every SBAR box has three words (the nurse) or the diagnosis, the
     destination and the handover are filled (the doctor), and says nothing when it does not. This reads the same
     fields and only explains; it never enables the button. */
  const words = v => String(v || '').trim().split(/\s+/).filter(Boolean).length;
  function sheetGuide() {
    const sheet = $('er-sheet'), go = $('er-end-go'), pane = go && go.closest('.er-pane'), foot = pane && pane.querySelector('.er-pane-f');
    if (!sheet || sheet.hidden || !pane || !foot) return;
    const nurse = !!$('er-sbar-s'), need = [];
    if (nurse) [['s', 'الوضع'], ['b', 'الخلفية'], ['a', 'التقييم'], ['r', 'التوصية']].forEach(([k, l]) => { const t = $('er-sbar-' + k), n = words(t && t.value); need.push({ l, n, want: 3, ok: n >= 3, el: t }); });
    else {
      const dx = $('er-dx'), dp = $('er-dispo'), sb = $('er-sbar');
      need.push({ l: 'التشخيص', ok: !!(dx && dx.value.trim()) }, { l: 'الوجهة', ok: !!(dp && dp.value) }, { l: 'التسليم (SBAR)', ok: !!(sb && sb.value.trim()) });
    }
    pane.querySelectorAll('[data-just]').forEach(t => {
      const n = words(t.value), lab = t.closest('label'), name = lab && lab.childNodes[0] ? lab.childNodes[0].textContent.trim() : 'الفحص';
      need.push({ l: 'تبرير ' + name, n, want: 3, ok: n >= 3, el: t });
    });
    need.forEach(x => {
      if (!x.el) return;
      let c = x.el.nextElementSibling;
      if (!c || !c.classList.contains('nbq-cnt')) { c = document.createElement('small'); c.className = 'nbq-cnt'; c.setAttribute('data-no-terms', ''); x.el.insertAdjacentElement('afterend', c); }
      const txt = x.ok ? `✓ ${x.n} كلمات` : `${x.n} من ${x.want} كلمات على الأقل`;
      if (c.textContent !== txt) c.textContent = txt;
      c.classList.toggle('is-ok', x.ok);
    });
    let st = $('nbq-why');
    if (!st) { st = document.createElement('p'); st.id = 'nbq-why'; st.className = 'nbq-why'; st.setAttribute('role', 'status'); st.setAttribute('data-no-terms', ''); foot.insertAdjacentElement('beforebegin', st); }
    const miss = need.filter(x => !x.ok);
    const how = nurse ? 'يُفتح زر «سلّم» حين تكتب ثلاث كلمات على الأقل في كل خانة من الأربع.' : 'يُفتح زر «سلّم» حين تكتب التشخيص وتختار الوجهة وتكتب التسليم.';
    const msg = miss.length ? `${how} ينقصك: ${miss.map(x => (x.want ? `${x.l} (${x.n} من ${x.want} كلمات)` : x.l)).join('، ')}.` : 'كل شيء مكتمل: يمكنك التسليم.';
    if (st.textContent !== msg) st.textContent = msg;
    st.classList.toggle('is-ready', !miss.length);
    go.title = miss.length ? msg : '';
    go.setAttribute('aria-describedby', 'nbq-why');
  }

  /* ---------- the loop ---------- */
  function tick() {
    requestAnimationFrame(tick);
    const h = H(), E = h && h.E, on = !!E && !!P() && P().enabled();
    if (!on) { const b = $('nbq-help'); if (b) b.remove(); closeHelp(); A.E = null; return; }
    if (E !== A.E) {
      Object.assign(A, { E, msgs: [], helps: [], built: false, entry: null, result: null });
      closeHelp();
      const box = $('er-debrief'); if (box) box.classList.remove('nbq-waiting');
    }
    helpButton(E);
    sheetGuide();
    if (E.over && !A.built) A.built = build(E);
    // the realism mode's pressure panel belongs inside the report, above the timeline, not under its buttons
    if (E.over && A.built) {
      const box = $('er-debrief'), loose = box && box.querySelector(':scope > .nbp-report'), time = box && box.querySelector('.er-report-page .nbq-time');
      if (loose && time) time.parentNode.insertBefore(loose, time);
    }
  }
  requestAnimationFrame(tick);
  window.__nbAssess = { LIFESAVING, get result() { return A.result; }, get helps() { return A.helps; }, handover: () => (A.E ? handover(A.E) : null), reassessment: () => (A.E ? reassessment(A.E) : null) };
})();
