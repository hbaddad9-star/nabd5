/* The clinical coach's page and its guided drill (V6.9.5-6, 2026-11-17; docs/agent/er-agent.ar.md D-45 to D-52). A scripted
   prototype of the training the owner described: the coach takes a real gap from the trainee's record, plays
   the patient and his family, and works the steps with him. On a wrong step it never gives the answer at once:
   a question first, then a hint, then the answer with its reason, and the drill goes on. At the end the trainee
   sees each step (first time, after a question, after a hint, or given), and the real case to try next.
   The lines are fixed and the check is by keywords: the agent will speak and judge freely inside the same drill
   template. Also here: the coach's demo data (a few sessions added to the signed-in account, marked as demo, and
   removable) so the coach can be shown before a trainee has played. Nothing here reaches the rooms.
   V6.9.6 (owner): the coach is a page of its own, full width, entered from one card on the home (and from the
   header and the sidebar). The page holds the trainee's figures, what he needs to develop with its stages (guided
   drill, then a real case, then closed), his path over his sessions, the coach's record, and the drill itself.
   It is drawn in the application's coach view (#view-coach), whose legacy content stays in the page, hidden. */
(function () {
  'use strict';
  const C = window.NabdConsole;
  if (!C) return;
  const byId = id => document.getElementById(id);
  const esc = C.esc;
  const norm = s => String(s == null ? '' : s).replace(/[ً-ٰٟـ]/g, '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[؟?!,،:؛()"'«»\-_/]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const user = () => { try { return authState.user || null; } catch (e) { return null; } };
  const save = u => { try { if (typeof saveAccountToStorage === 'function') saveAccountToStorage(u); } catch (e) {} };

  /* ---------- the drill template (D-50): written by a physician; this one is a prototype for review ---------- */
  const DRILLS = {
    elderly: {
      id: 'elderly', title: 'كبير سن مع سكري وضغط', skill: 'الأولويات', next: { id: 'sepsis', label: 'الحاج أبو خالد، 74 سنة' },
      cast: { c: 'المدرب', p: 'أبو محمود · 87 سنة', d: 'بنته سلوى' },
      principle: ['التشوّش عند كبير السن السكري: سكر الدم قبل أي تصوير.', 'ثم ABCDE وأدويته: خافض السكر، المدر، المميّع.', 'لا تنزّل الضغط بسرعة، وانتبه لخطر السقوط.'],
      steps: [
        { label: 'أول خطوة', say: [['c', 'اعتبرني أبو محمود، 87 سنة، وبنتي سلوى معي.'], ['p', 'مين إنت؟… وين أنا؟'], ['d', 'من الصبح هيك مش عارف حدا! الحقوه يا دكتور!'], ['c', 'شو أول إشي بتعمله؟']],
          re: /(abcde|مجرى|تنفس|علامات حيويه|العلامات|ضغط|نبض|اشباع|اكسجين|vital|اقيس|بقيس|قيس|airway)/,
          ladder: ['قبل أي فحص أو قرار: شو بتتأكد منه بالمريض اللي قدامك؟', 'ابدأ من الأساس: مجرى الهواء والتنفس والدورة، وقِس العلامات الحيوية.', 'أول خطوة: ABCDE والعلامات الحيوية. المريض المشوّش ممكن يكون عنده خطر على مجرى الهواء أو هبوط.'],
          ok: [['c', 'صح. العلامات: الضغط 168/92، النبض 96، الإشباع 95%، الحرارة 36.8، ومجرى الهواء سليم.']] },
        { label: 'سكر الدم', say: [['c', 'شو الفحص الأسرع اللي بيغيّر قرارك هلأ؟']],
          re: /(سكر|glucose|جلوكوز|غلوكوز|سكري الدم|بي جي|bgl|hgt|شعري)/,
          ladder: ['قبل الطبقي: شو أسرع فحص بيغيّر قرارك عند مريض سكري مشوّش؟', 'فكّر بإشي بتقيسه بنقطة دم من إصبعه بثواني.', 'سكر الدم الشعري. نقص السكر عند كبير السن بيشبه الجلطة، وعلاجه بدقائق.'],
          ok: [['d', 'أبوي بياخد حبوب سكر، والصبح ما أكل إشي!'], ['c', 'السكر 52.']] },
        { label: 'علاج نقص السكر', say: [['c', 'السكر 52 وهو مشوّش وما بيقدر يبلع. شو بتعمل؟']],
          re: /(دكستروز|dextrose|d50|d10|جلوكوز وريدي|سكر وريدي|جلوكاجون|glucagon|سكر بالوريد|محلول سكر)/,
          ladder: ['هو مشوّش وما بيبلع: من وين بتعطيه السكر؟', 'بالوريد: محلول سكر مركّز، أو إبرة بالعضل إذا ما في وريد.', 'دكستروز وريدي (مثلاً 10%)، أو جلوكاجون بالعضل إذا ما في وريد. ثم أعد قياس السكر بعد 15 دقيقة.'],
          ok: [['p', 'آه… شو صار؟ وين أنا؟'], ['c', 'صحي، والسكر صار 118. بس ضغطه هلأ 210/110.']] },
        { label: 'الضغط', say: [['c', 'بتنزّل الضغط هلأ بسرعة؟']],
          re: /(^لا|لا |ما بنزل|ما رح انزل|مش بسرعه|مش هلا|تدريجي|بالتدريج|اراقب|مراقبه|بعيد القياس|اعيد القياس|بستنى|بشويش)/,
          ladder: ['هو صحي والضغط عالي بعد نوبة نقص سكر وتوتر: شو الخطر من إنزاله بسرعة عند كبير السن؟', 'التنزيل السريع ممكن يقلّل تروية الدماغ. شو البديل؟', 'لا تنزّله بسرعة: أعد القياس بعد ما يهدأ، وراقب، وعالج السبب. التنزيل الحاد خطر على كبير السن.'],
          ok: [['c', 'صح. أعدت القياس بعد ربع ساعة: 172/94.']] },
        { label: 'الأدوية', say: [['d', 'يا دكتور هو بياخد كيس حبوب، ما بعرف شو كلهم.'], ['c', 'شو بتسأل سلوى عن أدويته؟']],
          re: /(ادوي|دوا|حبوب|جرع|مدر|انسولين|سلفونيل|جليك|اسماء|كيس|العلب|جيبي|بتجيبي|مميع)/,
          ladder: ['نقص السكر صار من إشي: شو لازم تعرف عن اللي بياخده؟', 'اطلب الكيس نفسه، واسأل عن حبوب السكر وكم جرعة أخذ، والمدرّ والمميّع.', 'جيبي كيس الأدوية: أسماؤها وجرعاتها، خاصة حبوب السكر (بعضها بيعمل نقص طويل)، والمدرّ، والمميّع.'],
          ok: [['d', 'هذا الكيس: جليكلازيد مرتين، ومدرّ، وأسبرين.'], ['c', 'جليكلازيد بيعمل نقص سكر طويل عند كبير السن: لازم يضل تحت المراقبة ويتكرر قياس السكر.']] },
        { label: 'الإغلاق', say: [['c', 'آخر خطوة: قلّي الخطوات بكلامك وبالترتيب.']],
          re: null, check: t => /سكر/.test(t) && /(abcde|علامات|ضغط|نبض|تنفس|مجرى)/.test(t),
          ladder: ['ناقصك خطوة أساسية. شو أول فحص بيغيّر قرارك؟', 'رتّبها: ABCDE والعلامات، ثم السكر، ثم العلاج، ثم الضغط بهدوء، ثم الأدوية.', 'ABCDE والعلامات الحيوية، سكر الدم، دكستروز إذا ناقص وإعادة القياس، الضغط بدون تنزيل سريع، كيس الأدوية والمراقبة.'],
          ok: [['c', 'ممتاز. هاي الخطوات اللي بدنا إياها كل مرة.']] }
      ]
    }
  };

  /* ---------- the gap (D-46): read from the record; the prototype names the elderly when they are the weak spot ---------- */
  const AGE = { asthma: 23, sepsis: 74, pe: 34, stemi: 58, dka: 19, htn: 71 };
  function gapOf(u) {
    const runs = ((u && u.history) || []).filter(h => h && /^er_/.test(h.caseId || '') && typeof h.num === 'number');
    const caseOf = h => String(h.caseId).replace(/^er_/, '').replace(/_n$/, '');
    const elder = runs.filter(h => (AGE[caseOf(h)] || 0) >= 65);
    const weak = elder.filter(h => h.num < 70 || (h.critical || []).length);
    if (weak.length >= 2) return { drill: 'elderly', title: 'كبار السن مع سكري وضغط', why: `في ${weak.length} جلسات مع مرضى كبار بالسن كانت نتيجتك دون المطلوب.` };
    if (weak.length === 1) return { drill: 'elderly', title: 'كبار السن مع سكري وضغط', why: 'في جلسة مع مريض كبير بالسن ظهر خطأ أساسي.' };
    return null;
  }

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
    if (u) { u.coach = (u.coach || []).filter(x => x && x.drill); u.coach.unshift({ drill: S.d.id, at: Date.now(), score, steps: S.log.slice() }); save(u); }
    const LBL = { first: ['من أول مرة', 'ok'], question: ['بعد سؤال', 'mid'], hint: ['بعد تلميح', 'mid'], answer: ['أخذ الجواب', 'bad'] };
    const box = byId('nbx-drill-end');
    const input = byId('nbx-drill-form');
    if (input) input.hidden = true;
    if (box) {
      box.hidden = false;
      box.innerHTML = `<h3>انتهى التمرين: <b class="nbx-num">${score}%</b></h3>
        <ul>${S.d.steps.map((st, j) => `<li><span>${esc(st.label)}</span><em class="is-${LBL[S.log[j]][1]}">${LBL[S.log[j]][0]}</em></li>`).join('')}</ul>
        <p>النقص يُغلق حين تمرّ حالة حقيقية من الفئة نفسها دون الخطأ نفسه. جرّب الآن: <b>${esc(S.d.next.label)}</b>.</p>
        <div class="nbx-drill-act"><button type="button" class="nbx-coach-btn is-main" data-nbx-drill="case">ادخل الحالة الحقيقية</button><button type="button" class="nbx-coach-btn" data-nbx-drill="again">أعد التمرين</button><button type="button" class="nbx-coach-btn" data-nbx-drill="close">رجوع للمدرب</button></div>`;
    }
  }
  function start(id, why) {
    if (!byId('nbx-cp')) open();
    const d = DRILLS[id], host = byId('nbx-cp-main');
    if (!d || !host) return;
    Object.assign(S, { d, i: 0, tries: 0, log: [], busy: false });
    host.innerHTML = `<div id="nbx-drill" class="nbx-drill">
      <header class="nbx-drill-head"><span class="nbx-coach-ic" aria-hidden="true"></span><div><span class="nbx-coach-kicker">تمرين موجّه · نموذج</span><h2>${esc(d.title)} · ${esc(d.skill)}</h2><p>${esc(why || 'تمرين على أولويات مريض كبير بالسن.')}</p></div>
        <span class="nbx-drill-ladder">سؤال ← تلميح ← جواب</span><button type="button" class="nbx-coach-btn" data-nbx-drill="close">إنهاء</button></header>
      <div class="nbx-drill-body">
        <ol id="nbx-drill-rail" class="nbx-drill-rail" aria-label="خطوات التمرين"></ol>
        <div class="nbx-drill-main">
          <div class="nbx-drill-principle"><b>المبدأ</b><ul>${d.principle.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
          <div id="nbx-drill-chat" class="nbx-drill-chat" aria-live="polite"></div>
          <form id="nbx-drill-form" class="nbx-drill-form" autocomplete="off"><input id="nbx-drill-in" type="text" maxlength="300" placeholder="قلّه شو بتعمل…" aria-label="جوابك في التمرين"><button type="submit" class="nbx-coach-btn is-main">أرسل</button></form>
          <section id="nbx-drill-end" class="nbx-drill-end" hidden></section>
        </div>
      </div>
      <p class="nbx-coach-note">نموذج بنص ثابت ويقرأ الكلمات. مع الإيجنت يحاورك بحرية داخل التمرين نفسه، والتمرين يكتبه طبيب ويوقّعه.</p>
    </div>`;
    rail();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    lines(d.steps[0].say);
  }

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
    const p = host(), u = user();
    if (!p || !u) return;
    const d = CD() ? CD().data(u) : null, titleOf = CD() ? CD().titleOf : (h => h.caseTitle || ''), caseOf = CD() ? CD().caseOf : (h => h.caseId);
    const gaps = gapsOf(u), demo = (u.history || []).some(h => h && h.demo), record = (u.coach || []).filter(x => x && x.drill);
    const sub = !d ? 'يبدأ بعد أول حالة تنهيها.' : `${d.runs.length} ${d.runs.length === 1 ? 'جلسة' : d.runs.length === 2 ? 'جلستان' : 'جلسات'} · متوسط ${d.avg}%${d.before == null ? '' : d.recent > d.before ? ' · تحسّنت' : d.recent < d.before ? ' · تراجعت' : ''}`;
    const head = `<header class="nbx-c2-head"><div><h1>المدرب السريري</h1><p>يتدرّب معك على ما تحتاج تطويره، خطوة خطوة.</p><span class="nbx-c2-sub">${esc(sub)}</span></div>
        <button type="button" class="nbx-c2-back" data-nbx-drill="home">← الرئيسية</button></header>`;
    const foot = `<p class="nbx-c2-foot">نموذج يقرأ تقاريرك بقواعد ثابتة، ولاحقاً يحاورك بحرية. ${demo ? '<button type="button" class="nbx-coach-link" data-nbx-drill="demo-clear">احذف بيانات العرض</button>' : '<button type="button" class="nbx-coach-link" data-nbx-drill="demo-add">أضف بيانات عرض</button>'}</p>`;
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
  const shown = window.showOnlySection;
  if (typeof shown === 'function') window.showOnlySection = function (viewId) { shown(viewId); if (viewId !== 'coach') { const v = byId('view-coach'); if (v) v.classList.remove('nbx-cp-on'); } };

  document.addEventListener('submit', e => {
    if (!e.target || e.target.id !== 'nbx-drill-form') return;
    e.preventDefault();
    const i = byId('nbx-drill-in'), v = String((i && i.value) || '').trim();
    if (!v) return;
    i.value = '';
    answer(v);
  });
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-nbx-drill]') : null;
    if (!b) return;
    const k = b.getAttribute('data-nbx-drill');
    if (k === 'start') { start(b.getAttribute('data-id') || 'elderly', b.getAttribute('data-why') || ''); return; }
    if (k === 'again' && S.d) { start(S.d.id, ''); return; }
    if (k === 'case' && S.d && typeof nb8OpenAssignedCase === 'function') { nb8OpenAssignedCase(S.d.next.id); return; }
    if (k === 'close') { S.d = null; overview(); return; }
    if (k === 'home') { S.d = null; try { navigateTo('home'); } catch (err) {} return; }
    if (k === 'gap-case' && typeof nb8OpenAssignedCase === 'function') { nb8OpenAssignedCase(b.getAttribute('data-case')); return; }
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
    save(u);
    if (byId('nbx-cp') && currentView === 'coach') overview(); else open();
  }
  function clear() {
    const u = user();
    if (!u) return;
    u.history = (u.history || []).filter(h => !h.demo);
    save(u);
    if (byId('nbx-cp') && currentView === 'coach') overview(); else { try { navigateTo('home'); } catch (e) {} }
  }

  window.NabdCoachDrill = Object.freeze({ open, overview, start, gapOf, gapsOf, openGaps, seed, clear, DRILLS, get active() { return !!byId('nbx-drill'); } });
})();
