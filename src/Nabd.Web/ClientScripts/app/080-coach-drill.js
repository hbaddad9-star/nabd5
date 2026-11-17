  /* ==========================================================================================================
     080 · coach drill: the drill's engine (question, hint, answer), the full-screen chat and its side panel.
     ========================================================================================================== */
  /* ---------- the drill ---------- */
  const S = { d: null, i: 0, tries: 0, log: [], busy: false };
  const WHO = (d, k) => ({ c: d.cast.c, p: d.cast.p, d: d.cast.d, me: 'أنت' }[k]);
  function bubble(k, text, extra) {
    const t = byId('nbx-drill-chat');
    if (!t) return;
    const b = document.createElement('div');
    b.className = 'nbx-dm is-' + k + (extra ? ' ' + extra : '');
    b.innerHTML = `<small>${esc(WHO(S.d, k))}${extra === 'is-q' ? ' · سؤال' : extra === 'is-hint' ? ' · تلميح' : extra === 'is-ans' ? ' · الجواب' : ''}</small><p>${esc(text)}</p>`;
    t.appendChild(b);
    t.scrollTop = t.scrollHeight;
  }
  function lines(list, then) {
    S.busy = true;
    const input = byId('nbx-drill-in');
    if (input) input.disabled = true;
    let k = 0;
    const step = () => {
      if (!byId('nbx-drill')) return;
      if (k >= list.length) { S.busy = false; if (input) { input.disabled = false; input.focus({ preventScroll: true }); } if (then) then(); return; }
      const [w, t, x] = list[k++];
      bubble(w, t, x);
      setTimeout(step, 520);
    };
    step();
  }
  function rail() {
    const r = byId('nbx-drill-rail');
    if (!r) return;
    r.innerHTML = S.d.steps.map((st, j) => {
      const done = S.log[j];
      const cls = done ? (done === 'first' ? 'is-ok' : done === 'answer' ? 'is-bad' : 'is-mid') : j === S.i ? 'is-now' : '';
      return `<li class="${cls}">${esc(st.label)}</li>`;
    }).join('');
  }
  const LADDER = ['is-q', 'is-hint', 'is-ans'];
  function answer(text) {
    if (S.busy || !S.d) return;
    const st = S.d.steps[S.i];
    bubble('me', text);
    const t = norm(text);
    const ok = st.check ? st.check(t) : st.re.test(t);
    if (ok) {
      S.log[S.i] = ['first', 'question', 'hint'][S.tries] || 'hint';
      rail();
      lines(st.ok, nextStep);
      return;
    }
    const k = S.tries++;
    if (k < 2) { lines([['c', st.ladder[k], LADDER[k]]]); return; }
    S.log[S.i] = 'answer';
    rail();
    lines([['c', st.ladder[2], 'is-ans'], ...st.ok], nextStep);
  }
  function nextStep() {
    S.i++; S.tries = 0;
    rail();
    if (S.i >= S.d.steps.length) { finish(); return; }
    lines(S.d.steps[S.i].say);
  }
  function finish() {
    const pts = { first: 3, question: 2, hint: 1, answer: 0 };
    const score = Math.round(S.log.reduce((a, r) => a + pts[r], 0) / (S.d.steps.length * 3) * 100);
    const u = user();
    if (u) { u.coach = (u.coach || []).filter(x => x && x.drill); u.coach.unshift({ drill: S.d.id, at: Date.now(), score, steps: S.log.slice() }); saveAccount(u); }
    const LBL = { first: ['من أول مرة', 'ok'], question: ['بعد سؤال', 'mid'], hint: ['بعد تلميح', 'mid'], answer: ['أخذ الجواب', 'bad'] };
    const box = byId('nbx-drill-end');
    const input = byId('nbx-drill-form');
    if (input) input.hidden = true;
    if (box) {
      const chat = byId('nbx-drill-chat'); if (chat) { chat.appendChild(box); setTimeout(() => { chat.scrollTop = chat.scrollHeight; }, 30); }
      box.hidden = false;
      box.innerHTML = `<h3>انتهى التمرين: <b class="nbx-num">${score}%</b></h3>
        <ul>${S.d.steps.map((st, j) => `<li><span>${esc(st.label)}</span><em class="is-${LBL[S.log[j]][1]}">${LBL[S.log[j]][0]}</em></li>`).join('')}</ul>
        <p>النقص يُغلق حين تمرّ حالة حقيقية من الفئة نفسها دون الخطأ نفسه. جرّب الآن: <b>${esc(S.d.next.label)}</b>.</p>
        <div class="nbx-drill-act"><button type="button" class="nbx-coach-btn is-main" data-nbx-drill="case">ادخل الحالة الحقيقية</button><button type="button" class="nbx-coach-btn" data-nbx-drill="again">أعد التمرين</button><button type="button" class="nbx-coach-btn" data-nbx-drill="close">رجوع للمدرب</button></div>`;
    }
  }
  /* V6.9.8 (owner): the drill takes the whole screen under the header. The chat fills it and scrolls by itself;
     the page does not scroll and the footer is out of the way. On the right, the trainee's plan (what he needs to
     develop, with its stage) and the coach's record. */
  let fullSaved = null;
  function fullOn() {
    if (fullSaved) return;
    const foot = byId('site-footer');
    fullSaved = { html: document.documentElement.style.overflow, body: document.body.style.overflow, foot: foot ? foot.style.display : '' };
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    if (foot) foot.style.display = 'none';
    const p = byId('nbx-cp'); if (p) p.classList.add('is-full');
    window.scrollTo(0, 0);
  }
  function fullOff() {
    const p = byId('nbx-cp'); if (p) p.classList.remove('is-full');
    if (!fullSaved) return;
    document.documentElement.style.overflow = fullSaved.html;
    document.body.style.overflow = fullSaved.body;
    const foot = byId('site-footer'); if (foot) foot.style.display = fullSaved.foot;
    fullSaved = null;
  }
  function sidePanel(u, current) {
    const gaps = gapsOf(u), record = (u.coach || []).filter(x => x && x.drill);
    const STG = ['', 'تمرين موجّه', 'حالة حقيقية', 'أُغلق'];
    const plan = gaps.length ? gaps.map(x => `<li class="${x.drill === current ? 'is-now' : ''}"><b>${esc(x.title)}</b><small>${x.kind === 'drill' ? esc(STG[x.stage]) : esc(x.skill)}</small></li>`).join('') : '<li class="is-empty">لا نقاط مفتوحة.</li>';
    const rec = `<li class="is-now"><b>${esc(DRILL_NAME[current] || current)}</b><small>الآن</small></li>` + record.slice(0, 12).map(r => `<li><b>${esc(DRILL_NAME[r.drill] || r.drill)}</b><small>${esc(new Date(r.at).toLocaleDateString('ar-JO-u-nu-latn', { day: 'numeric', month: 'short' }))} · ${r.score}%</small></li>`).join('');
    return `<aside class="nbx-df-side" aria-label="خطتك وسجل التدريب">
        <button type="button" class="nbx-df-back" data-nbx-drill="close">← المدرب السريري</button>
        <section><h3>خطتي</h3><ul>${plan}</ul></section>
        <section><h3>سجل التدريب</h3><ul>${rec}</ul></section>
      </aside>`;
  }
  function start(id, why) {
    if (!byId('nbx-cp')) open();
    const d = DRILLS[id], host = byId('nbx-cp-main'), u = user();
    if (!d || !host || !u) return;
    Object.assign(S, { d, i: 0, tries: 0, log: [], busy: false });
    host.innerHTML = `<div id="nbx-drill" class="nbx-drill nbx-df">
      ${sidePanel(u, d.id)}
      <section class="nbx-df-main">
        <header class="nbx-df-top">
          <div class="nbx-df-title"><span class="nbx-coach-kicker">تمرين موجّه · نموذج</span><h2>${esc(d.title)} · ${esc(d.skill)}</h2>${why ? `<p>${esc(why)}</p>` : ''}</div>
          <ol id="nbx-drill-rail" class="nbx-drill-rail" aria-label="خطوات التمرين"></ol>
          <button type="button" class="nbx-df-end" data-nbx-drill="close">إنهاء</button>
        </header>
        <div id="nbx-drill-chat" class="nbx-drill-chat" aria-live="polite">
          <details class="nbx-drill-principle"><summary>المبدأ في ثلاثة أسطر</summary><ul>${d.principle.map(p => `<li>${esc(p)}</li>`).join('')}</ul></details>
        </div>
        <section id="nbx-drill-end" class="nbx-drill-end" hidden></section>
        <form id="nbx-drill-form" class="nbx-drill-form" autocomplete="off"><input id="nbx-drill-in" type="text" maxlength="300" placeholder="قلّه شو بتعمل…" aria-label="جوابك في التمرين"><button type="submit" class="nbx-c2-main">أرسل</button></form>
      </section>
    </div>`;
    fullOn();
    rail();
    lines(d.steps[0].say);
  }
  document.addEventListener('submit', e => {
    if (!e.target || e.target.id !== 'nbx-drill-form') return;
    e.preventDefault();
    const i = byId('nbx-drill-in'), v = String((i && i.value) || '').trim();
    if (!v) return;
    i.value = '';
    answer(v);
  });
