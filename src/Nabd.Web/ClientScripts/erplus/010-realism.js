/* The ER room's realism mode (V6.8, 2026-11-16; docs/decisions/0016-er-realism-mode.md).
   The owner asked for an emergency room that feels like one: danger the trainee sees and hears (the monitor turns
   red, the pulse tone falls with the saturation), family and team who talk over each other and must be handled,
   pressure that is felt without a stated time limit, a short summary instead of a long briefing, and dose hints
   for first and second years only.
   A layer over the room, never inside it: the legacy room (js/er.js) is not edited and stays the reference
   version (git tag er-room-reference-2026-11-16). It reads the room through its own hook (window.__nbER), adds
   elements next to the room's own, and writes the interruptions into the room's chat record so the patient and
   the family "know" they happened. Switched off by Nabd's administration (settings: erRealism) or by ?realism=off
   in the address, the room is exactly the reference one. */
(function () {
  'use strict';
  const view = document.getElementById('view-er');
  if (!view) return;
  const H = () => window.__nbER;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reduce = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  /* ?realism=off (or =on) is remembered for the visit: the application's own navigation drops the address's query */
  const Store = window.NabdStore;
  { const q = /[?&]realism=(off|on)\b/.exec(location.search); if (q && Store) Store.session.set('nbp_realism', q[1]); }
  function enabled() {
    if (!Store) return true;
    if (Store.session.get('nbp_realism') === 'off') return false;
    const s = Store.consoleState();
    if (s && s.settings && s.settings.erRealism === false) return false;
    return true;
  }
  const user = () => { try { return authState.user || {}; } catch (e) { return {}; } };
  const isNurse = E => !!E && E.role === 'nurse';

  /* ---------- 1. dose hints for first and second years only ---------- */
  const stripped = [];
  function restoreHints() { while (stripped.length) { const [o, v] = stripped.pop(); o.suggest = v; } }
  function hintsFor(E) {
    restoreHints();
    const year = Number(user().year) || 4;
    if (year <= 2) return 'on';
    const strip = o => { if (o && o.suggest) { stripped.push([o, o.suggest]); delete o.suggest; } };
    try { Object.values(E.c.care || {}).forEach(strip); } catch (e) {}
    try { const D = H().D; (D.actions || []).forEach(strip); } catch (e) {}
    return 'off';
  }

  /* ---------- 2. the summary card on top of the briefing ---------- */
  function summary(E) {
    const brief = document.querySelector('#er-brief .er-brief');
    if (!brief || brief.querySelector('.nbp-sum')) return;
    const c = E.c, p = c.patient || {}, comp = c.companion || {}, nurse = isNurse(E);
    const goal = nurse
      ? ['قيّم المريض بطريقة ABCDE وقِس العلامات الحيوية.', 'بلّغ الطبيب برسالة SBAR بالأرقام حين يلزم.', 'نفّذ الأوامر بأمان، ثم سلّم الحالة لممرض المناوبة.']
      : ['ثبّت المريض أولاً: مجرى الهواء، التنفس، الدورة الدموية.', 'اعرف السبب: القصة، الفحص، والفحوصات التي تحتاجها فقط.', 'قرّر مكانه الصحيح وسلّمه للأخصائي.'];
    const people = [comp.name ? `${comp.name}${comp.rel ? ' (' + comp.rel + ')' : ''}` : '', nurse ? 'الطبيب المقيم على الهاتف' : 'ممرضة الطوارئ'].filter(Boolean).join('، ');
    const sec = document.createElement('section');
    sec.className = 'nbp-sum';
    sec.setAttribute('data-no-terms', '');
    sec.innerHTML = `<h4>ملخصك قبل الدخول</h4>
      <ul class="nbp-sum-list">
        <li><b>دورك</b><span>${nurse ? 'ممرض/ة الطوارئ المسؤول/ة عن السرير' : 'الطبيب المسؤول عن الحالة'}</span></li>
        <li><b>معك</b><span>${esc(people)}</span></li>
      </ul>
      <ol class="nbp-sum-steps">${goal.map(g => `<li>${esc(g)}</li>`).join('')}</ol>
      <p class="nbp-sum-warn">غرفة طوارئ حقيقية: الأهل والفريق قد يقاطعونك، والمريض لا ينتظر. تصرّف كما تتصرّف في مناوبتك.</p>
      <p class="nbp-sum-safe">هنا تخطئ وتتعلّم: لا يصل أي خطأ إلى مريض حقيقي، وتقريرك بعد الحالة يشرح لك كل خطوة.</p>
      <button type="button" class="nbp-sum-more" aria-expanded="false">التعليمات الكاملة</button>`;
    const now = brief.querySelector('.er-brief-now');
    (now ? now.parentNode : brief).insertBefore(sec, now ? now.nextSibling : brief.firstChild);
    brief.classList.add('nbp-compact');
    sec.querySelector('.nbp-sum-more').onclick = ev => {
      const open = brief.classList.toggle('nbp-full');
      ev.currentTarget.setAttribute('aria-expanded', String(open));
      ev.currentTarget.textContent = open ? 'إخفاء التعليمات الكاملة' : 'التعليمات الكاملة';
    };
  }

  /* ---------- 3. the intervention window: pressure without a stated time limit ---------- */
  function windowBar() {
    let bar = $('nbp-window');
    if (bar) return bar;
    const clock = $('er-clock');
    if (!clock) return null;
    bar = document.createElement('div');
    bar.id = 'nbp-window';
    bar.className = 'nbp-window';
    bar.setAttribute('data-no-terms', '');
    bar.setAttribute('role', 'img');
    bar.innerHTML = '<span class="nbp-w-label">نافذة التدخل</span><span class="nbp-w-track"><i></i></span><span class="nbp-w-state"></span>';
    clock.parentNode.insertBefore(bar, clock.nextSibling);
    return bar;
  }
  function paintWindow(E) {
    const bar = windowBar();
    if (!bar) return;
    const R = E.c.risk || {}, crit = R.critical || 100;
    const w = clamp((1 - E.risk / crit) * 0.75 + clamp(1 - E.sim / 25, 0, 1) * 0.25, 0, 1);
    const tone = E.over ? 'done' : w > 0.55 ? 'ok' : w > 0.3 ? 'mid' : 'low';
    const label = E.over ? 'انتهت الجلسة' : tone === 'ok' ? 'الوقت معك' : tone === 'mid' ? 'يضيق' : 'تدخّل الآن';
    bar.dataset.tone = tone;
    bar.querySelector('i').style.width = Math.round(w * 100) + '%';
    bar.querySelector('.nbp-w-state').textContent = label;
    bar.setAttribute('aria-label', 'نافذة التدخل: ' + label);
  }

  /* ---------- 4. danger: colour and the pulse tone ---------- */
  let ac = null, nextBeat = 0;
  function vignette(on) {
    let v = $('nbp-vignette');
    if (!on) { if (v) v.remove(); return; }
    if (!v) { v = document.createElement('div'); v.id = 'nbp-vignette'; v.className = 'nbp-vignette'; v.setAttribute('aria-hidden', 'true'); view.appendChild(v); }
  }
  view.addEventListener('click', () => {
    const mon = document.querySelector('#view-er .er-mon');
    if (!ac && mon && mon.dataset.sound) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
  }, true);
  function beat(E, now) {
    const mon = document.querySelector('#view-er .er-mon');
    if (!ac || !mon || !mon.dataset.sound || E.paused || E.over || document.hidden) return;
    let v = null;
    try { v = H().live(); } catch (e) { v = null; }
    if (!v || !v.hr) return;
    if (now < nextBeat) return;
    nextBeat = now + 60000 / clamp(v.hr, 30, 220);
    // a pulse oximeter's tone falls with the saturation: a trainee hears the patient getting worse
    const spo2 = clamp(v.spo2 || 98, 70, 100), freq = 520 + (spo2 - 70) * 12.5;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = E.stage >= 3 ? 'square' : 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(E.stage >= 3 ? 0.07 : 0.05, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + 0.11);
  }

  /* ---------- 5. interruptions: family and team who talk over each other ---------- */
  const CALM = /(اهد[اىي]|هدّ|بفهم|فاهم|معك حق|طمّن|طمن|مطمئن|اطمئن|بنعمل|عم نعمل|خليني|خلّيني|ثق[ي]?\b|ثقة|بنتك بأمان|ابنك بأمان|احنا معه|أنا معك|انا معك|لحظة)/;
  const OUT = /(اطلع|تطلع|اطلعوا|برّا|برا|بالخارج|استن[اىو]|انتظر|غرفة الانتظار|خارج الغرفة|لو سمحت.{0,12}(طلع|برا))/;
  const DEFER = /(يستن[اىو]|خليه|خليهم|زميل|بعدين|بعد شوي|حول|حوّل|مش هلأ|مش هلا|مشغول|بعد ما اخلص|بعد ما أخلص|اطلبوا|احكيله|احكيلهم)/;
  const IDCHK = /(اسم|تأكيد|أكد|اكد|رقم الملف|التاريخ|تاريخ الميلاد|اسمها|اسمه)/;
  const NO_WATER = /(لا|ممنوع|مش هلأ|مش هلا|استن|بعدين|صايم|لحد ما|حتى)/;
  function script(E) {
    const c = E.c, comp = c.companion || {}, nurse = isNurse(E), cn = comp.rel ? (/^(?:والدت|زوجت|ابنت|بنت|أخت|اخت)/.test(comp.rel) ? 'المرافقة' : 'المرافق') + ' (' + comp.rel + ')' : 'المرافق', p = c.patient || {};
    const kin = /أم|أب|ابن|بنت|زوج|أخ/.test(comp.rel || '') ? 'أخو المريض' : 'قريب المريض';
    const he = (p.sex || '') === 'F' ? 'ها' : 'ه';
    if (nurse) return [
      { at: 1.3, who: 'kin', name: kin, kind: 'water', text: `يا أستاذ، ${p.sex === 'F' ? 'هي عطشانة' : 'هو عطشان'} كثيراً، هل يمكن أن نعطي${he} قليلاً من الماء؟`, ok: NO_WATER },
      { at: 2.6, who: 'bell', name: 'جرس سرير 4', kind: 'defer', text: 'جرس سرير 4 يرنّ: المريض يريد الذهاب إلى الحمام وحده.', ok: DEFER },
      { at: 3.8, who: 'kin', name: kin, kind: 'angry', text: 'أين الطبيب؟! مضت ساعة ولم يأتِ أحد! أريد التحدث مع المسؤول!', ok: CALM },
      { at: 5.4, who: 'phone', name: 'المختبر على الهاتف', kind: 'id', text: 'المختبر: العينة التي وصلتنا مكتوب عليها اسم ناقص، نحتاج إلى تأكيد الاسم الكامل وتاريخ الميلاد.', ok: IDCHK }
    ];
    return [
      { at: 1.2, who: 'kin', name: kin, kind: 'angry', text: 'ماذا يحدث؟! لماذا تقفون جميعاً؟ يا دكتور، افعل شيئاً الآن!', ok: CALM },
      { at: 2.5, who: 'staff', name: 'ممرضة من الفرز', kind: 'defer', text: 'دكتور، وصل مريض بألم صدر إلى سرير 7 الآن، ويحتاجون إليك. هل تأتي أم ينتظرون؟', ok: DEFER },
      { at: 3.6, who: 'comp', name: cn, kind: 'angry', text: 'إذا أصابها مكروه فسأحمّلك المسؤولية! لماذا لا يخبرنا أحد بما أصابها؟', ok: CALM, needStage: 1 },
      { at: 4.8, who: 'phone', name: 'المختبر على الهاتف', kind: 'id', text: 'المختبر: لدينا عينة دم بلا اسم كامل من عندكم، نحتاج إلى تأكيد اسم المريض وتاريخ ميلاده.', ok: IDCHK },
      { at: 6.2, who: 'kin', name: kin, kind: 'angry', text: 'أريد أن أصوّر وأرسل إلى والدها، وأريد أن أعرف ما العلاج بالضبط!', ok: CALM }
    ];
  }
  const R = { E: null, list: [], fired: [], out: false, panic: false, turns: 0, lastStage: 0, hints: 'on' };
  function inject(item, E) {
    const feed = $('er-feed');
    if (!feed) return;
    const d = document.createElement('div');
    d.className = 'er-msg nbp-msg nbp-' + item.who + (item.who === 'comp' ? ' k-c' : '');
    d.innerHTML = `<span class="er-who">${esc(item.name)}</span><p>${esc(item.text)}</p>`;
    const atEnd = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 120;
    feed.appendChild(d);
    if (atEnd) feed.scrollTop = feed.scrollHeight;
    try { E.chat.push({ r: item.who === 'comp' || item.who === 'kin' ? 'c' : 'd', t: item.name + ': ' + item.text }); } catch (e) {}
    item.el = d;
  }
  function fire(E) {
    const outNow = R.out || (E.comp && E.sim < E.comp.outUntil);
    R.list.forEach(item => {
      if (item.done || E.sim < item.at || (item.needStage && E.stage < item.needStage)) return;
      if (outNow && (item.who === 'kin' || item.who === 'comp')) { item.done = true; item.skipped = true; return; }
      item.done = true; item.firedAt = E.sim; item.turnAt = R.turns; item.doneAt = E.done ? E.done.size : 0;
      inject(item, E); R.fired.push(item);
    });
    // the family panics the moment the monitor alarms in earnest
    if (!R.panic && E.stage >= 3 && !outNow) {
      R.panic = true;
      const item = { who: 'kin', name: (E.c.companion || {}).name || 'المرافق', kind: 'angry', text: 'ماذا حدث؟! لماذا يصدر الجهاز هذا الإنذار؟! أسرعوا!', ok: CALM, firedAt: E.sim, turnAt: R.turns, doneAt: E.done ? E.done.size : 0, done: true };
      inject(item, E); R.fired.push(item);
    }
  }
  // what the trainee writes is read before the room takes it
  document.addEventListener('submit', ev => {
    if (!ev.target || ev.target.id !== 'er-form' || !R.E || R.E.over) return;
    const text = String(($('er-input') || {}).value || '');
    if (!text.trim()) return;
    R.turns++;
    if (OUT.test(text)) R.out = true;
    R.fired.forEach(item => {
      if (item.answered || R.turns - item.turnAt > 2) return;
      if (item.ok.test(text) || (item.kind === 'angry' && OUT.test(text))) { item.answered = true; item.answerTurns = R.turns - item.turnAt; }
    });
  }, true);

  /* ---------- 6. after the handover: how the trainee handled the pressure ---------- */
  function report(E) {
    const box = $('er-debrief');
    if (!box || box.hidden || box.querySelector('.nbp-report') || !R.fired.length) return;
    const KIND = { angry: 'مرافق غاضب أو قلق', defer: 'طلب من مريض آخر', id: 'اتصال للتحقق من هوية العينة', water: 'طلب ماء للمريض' };
    const rows = R.fired.map(item => {
      const kept = E.done && E.done.size > item.doneAt;
      return `<li class="${item.answered ? 'is-ok' : 'is-miss'}"><b>${esc(KIND[item.kind] || item.kind)}</b><span>${item.answered ? 'تعاملت معه' + (item.answerTurns === 1 ? ' فوراً' : '') : 'لم تردّ عليه'}${kept ? ' · واصلت العلاج' : ''}</span></li>`;
    }).join('');
    const handled = R.fired.filter(i => i.answered).length;
    const sec = document.createElement('section');
    sec.className = 'nbp-report';
    sec.setAttribute('data-no-terms', '');
    sec.innerHTML = `<h4>إدارة الضغط والمقاطعات</h4>
      <p>${handled} من ${R.fired.length} مقاطعات تعاملت معها${R.out ? '، وطلبت من المرافقين الانتظار خارج الغرفة' : ''}. في الطوارئ الحقيقية تهدّئ الأهل بجملة واحدة واضحة، وتؤجّل ما يمكن تأجيله، وتعود للمريض.</p>
      <ul>${rows}</ul>
      <p class="nbp-report-note">${isNurse(E) ? 'ملاحظة تدريبية، لا تدخل في الدرجة.' : 'تدخل في محور «التواصل والفريق» بدرجتين من 15.'}</p>`;
    const anchor = box.querySelector('.er-pane, .er-report') || box;
    anchor.appendChild(sec);
  }

  /* ---------- the loop ---------- */
  let lastE = null;
  function tick(now) {
    requestAnimationFrame(tick);
    const h = H(), E = h && h.E;
    const on = enabled() && !!E;
    view.classList.toggle('nbp-on', on);
    if (!on) { vignette(false); const b = $('nbp-window'); if (b) b.remove(); if (!enabled()) restoreHints(); return; }
    if (E !== lastE) {
      lastE = E;
      Object.assign(R, { E, list: script(E), fired: [], out: false, panic: false, turns: 0, lastStage: 0 });
      R.hints = hintsFor(E);
      nextBeat = 0;
    }
    if (E.paused && !E.over) summary(E);
    paintWindow(E);
    vignette(!E.over && E.stage >= 3 && !reduce());
    if (!E.paused && !E.over) { fire(E); beat(E, now); }
    if (E.over) report(E);
  }
  requestAnimationFrame(tick);
  // read by the assessment layer (020): whether the mode is on, and the interruptions that fired
  window.__nbPlus = { enabled, fired: () => R.fired, out: () => R.out };
})();
