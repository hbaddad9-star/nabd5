/* The ER room: the nurse's call with the doctor, and tests the room does not have (V6.9.3, 2026-11-17;
   docs/agent/er-agent.ar.md D-37, D-39, D-40). Same switch and same rule as the realism mode: a layer over the
   room, never inside it.
   1. The call. In the nurse's room the doctor is outside and the trainee phones him. The owner chose model A: a
      call box over the chat. From "اتصلتَ بالدكتور …" until the doctor reaches the bed (or the trainee ends the
      call), the doctor's lines and what the trainee says to him go into the box; the room below goes on (the
      monitor, the family, the interruptions). While the call is open the trainee writes to the doctor (his
      message is addressed to him by name, so the room hands it to the doctor); a chip switches back to the room.
   2. Tests the catalogue does not have. The room answered "ما لقطت الطلب، شو اسمه بالزبط؟" to a vitamin D or an
      MRI, as if the trainee had misspoken, read "فيتامين د" in the nurse's room as a call to the doctor, and
      dropped an ESR in silence. Here the nurse (or, in the nurse's room, the instructor) answers as a colleague
      would: not an emergency test, not available from the ED now, or not among this case's tests. */
(function () {
  'use strict';
  const view = document.getElementById('view-er');
  if (!view) return;
  const H = () => window.__nbER, P = () => window.__nbPlus;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s == null ? '' : s).replace(/[ً-ٰٟـ]/g, '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[؟?!,،:؛()"'«»\-_/]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const live = () => { const h = H(); return h && h.E && P() && P().enabled() ? h.E : null; };
  const isNurse = E => !!E && E.role === 'nurse';
  const mmss = m => `${String(Math.floor(m)).padStart(2, '0')}:${String(Math.floor((m % 1) * 60)).padStart(2, '0')}`;

  /* ---------- the feed: lines this layer writes the way the room writes them ---------- */
  function line(cls, who, text) {
    const feed = $('er-feed');
    if (!feed) return null;
    const d = document.createElement('div');
    d.className = 'er-msg ' + cls;
    d.innerHTML = (who ? `<span class="er-who">${esc(who)}</span>` : '') + `<p>${esc(text)}</p>`;
    feed.appendChild(d);
    feed.scrollTop = feed.scrollHeight;
    return d;
  }

  /* ---------- 1. the call ---------- */
  const C = { E: null, on: false, at: 0, target: 'doc', pending: null, raw: '', placeholder: null };
  const docName = E => (E.nurse.sex === 'F' ? 'د. ' : 'د. ') + E.nurse.doc;
  const docAddr = E => (E.nurse.sex === 'F' ? 'دكتورة ' : 'دكتور ') + E.nurse.doc + '، ';
  function callBox(E) {
    let b = $('nbq-call');
    if (b) return b;
    const stage = document.querySelector('#view-er .er-stage'), feed = $('er-feed');
    if (!stage || !feed) return null;
    b = document.createElement('section');
    b.id = 'nbq-call';
    b.className = 'nbq-call';
    b.setAttribute('data-no-terms', '');
    b.setAttribute('aria-label', 'مكالمة مع الطبيب');
    b.innerHTML = `<header><span class="nbq-call-ic" aria-hidden="true"></span><b>مكالمة مع ${esc(docName(E))}</b><time id="nbq-call-t" class="font-num" dir="ltr">00:00</time><button type="button" id="nbq-call-end">إنهاء المكالمة</button></header>
      <div class="nbq-call-thread" id="nbq-call-thread" aria-live="polite"></div>
      <p class="nbq-call-foot">الغرفة تحت المكالمة مستمرة: المونيتور والأهل والفريق.</p>`;
    stage.insertBefore(b, feed);
    stage.classList.add('nbq-has-call');
    return b;
  }
  function targetChip(E) {
    const bar = $('er-form'), input = $('er-input');
    if (!bar || !input) return;
    let t = $('nbq-target');
    if (!t) {
      t = document.createElement('button');
      t.type = 'button'; t.id = 'nbq-target'; t.className = 'nbq-target';
      bar.insertBefore(t, input);
    }
    if (C.placeholder === null) C.placeholder = input.getAttribute('placeholder') || '';
    const doc = C.target === 'doc';
    t.textContent = doc ? 'إلى: ' + docName(E) : 'إلى: الغرفة';
    t.classList.toggle('is-doc', doc);
    t.setAttribute('aria-label', doc ? 'تكتب الآن للطبيب في المكالمة. اضغط لتكتب للغرفة' : 'تكتب الآن للغرفة. اضغط لتكتب للطبيب');
    input.setAttribute('placeholder', doc ? 'اكتب للطبيب…' : C.placeholder);
  }
  function startCall(E) {
    if (C.on) return;
    C.on = true; C.at = E.sim; C.target = 'doc';
    callBox(E); targetChip(E);
  }
  function endCall(E, why) {
    if (!C.on) return;
    C.on = false; C.pending = null;
    const b = $('nbq-call'); if (b) b.remove();
    const stage = document.querySelector('#view-er .er-stage'); if (stage) stage.classList.remove('nbq-has-call');
    const t = $('nbq-target'); if (t) t.remove();
    const input = $('er-input'); if (input && C.placeholder !== null) input.setAttribute('placeholder', C.placeholder);
    if (why === 'user' && E && !E.over) line('k-sys', '', 'أنهيت المكالمة مع ' + docName(E) + '.');
  }
  function moveToCall(node, who) {
    const thread = $('nbq-call-thread');
    if (!thread) return;
    const c = node.cloneNode(true);
    c.classList.add('nbq-call-msg');
    if (who === 'me' && C.raw) { const p = c.querySelector('p'); if (p) p.textContent = C.raw; }
    thread.appendChild(c);
    thread.scrollTop = thread.scrollHeight;
    node.classList.add('nbq-moved');
  }
  const seen = new WeakSet();
  function watchFeed() {
    const feed = $('er-feed');
    if (!feed || seen.has(feed)) return;
    seen.add(feed);
    new MutationObserver(list => {
      const E = live();
      if (!E || !isNurse(E) || E.over) return;
      list.forEach(m => m.addedNodes.forEach(n => {
        if (!n.classList || !n.classList.contains('er-msg') || n.classList.contains('nbp-msg')) return;
        const text = (n.textContent || '').trim();
        if (n.classList.contains('k-sys') && /^اتصلتَ ب/.test(text) && !E.nurse.present) { startCall(E); n.classList.add('nbq-moved'); return; }
        if (!C.on) return;
        if (n.classList.contains('k-n') && !n.classList.contains('er-dots') && !E.nurse.present) { moveToCall(n, 'doc'); return; }
        if (n.classList.contains('k-me') && C.pending === 'doc') { C.pending = null; moveToCall(n, 'me'); }
      }));
    }).observe(feed, { childList: true });
  }
  view.addEventListener('click', ev => {
    const E = live(), t = ev.target;
    if (!E || !t || !t.closest) return;
    if (t.closest('#nbq-call-end')) { endCall(E, 'user'); return; }
    if (t.closest('#nbq-target')) { C.target = C.target === 'doc' ? 'room' : 'doc'; targetChip(E); const i = $('er-input'); if (i) i.focus(); }
  });

  /* ---------- 2. tests the room does not have ---------- */
  // what a colleague says: a follow-up test (not for the ED), not available from the ED now, or not in this case
  const NOT_HERE = [
    { re: /(\besr\b|سرعه (ال)?ترسيب|ترسيب الدم)/, name: 'الـESR', kind: 'follow', alt: 'crp' },
    // an Arabic letter is not a word character for \b: "د" ends at a space or the end of the line
    { re: /(فيتامين ?د( |$)|فيتامين ?دال|vit(amin)? ?d\b)/, name: 'فحص فيتامين د', kind: 'follow' },
    { re: /(فيتامين ?ب ?12|\bb12\b)/, name: 'فحص فيتامين B12', kind: 'follow' },
    { re: /(فيريتين|ferritin|مخزون الحديد|\biron\b|فحص حديد)/, name: 'مخزون الحديد', kind: 'follow' },
    { re: /(hba1c|السكر التراكمي|سكر تراكمي|تراكمي)/, name: 'السكر التراكمي', kind: 'follow' },
    { re: /(دهنيات|كوليسترول|cholesterol|lipid)/, name: 'الدهنيات', kind: 'follow' },
    { re: /(\btsh\b|الغده الدرقيه|غده درقيه|thyroid|\bt4\b)/, name: 'فحص الغدة الدرقية', kind: 'follow' },
    { re: /(\bmri\b|رنين مغناطيسي|رنين)/, name: 'الـMRI', kind: 'mri' },
    { re: /(اميليز|amylase|ليبيز|lipase)/, name: 'إنزيمات البنكرياس', kind: 'case' },
    { re: /(زمره الدم|فصيله الدم|cross ?match|كروس ماتش|crossmatch)/, name: 'فصيلة الدم والتوافق', kind: 'case' },
    { re: /(فحص براز|stool|زراعه بلغم|sputum)/, name: 'هاد الفحص', kind: 'case' }
  ];
  function notHere(text) { const t = norm(text); return NOT_HERE.filter(x => x.re.test(t)); }
  function reply(E, items, handled) {
    const nurse = isNurse(E), has = id => (H().D.tests || []).some(t => t.id === id);
    const parts = items.map(x => {
      if (x.kind === 'follow') return `${x.name} فحص متابعة مش فحص طوارئ: بيطلع بعد يوم وما بيغيّر قرارك هلأ${x.alt && has(x.alt) && !handled ? '، والـCRP بيعطيك فكرة عن الالتهاب' : ''}.`;
      if (x.kind === 'mri') return `الـMRI مش متاح من الطوارئ هلأ.${has('ct_head') ? ' إذا بدك صورة للراس في طبقي دماغ.' : ''}`;
      return `${x.name} مش ضمن الفحوصات المتاحة بهالحالة. القائمة كاملة بزر «Labs».`;
    });
    const tail = nurse ? ' وأصلاً الفحوصات المخبرية بدها أمر طبيب.' : handled ? '' : ' بدك إشي ثاني؟';
    const text = parts.join(' ') + tail;
    const who = nurse ? 'المشرفة ' + E.c.nurse.name : 'الممرضة ' + E.c.nurse.name;
    line(nurse ? 'k-d' : 'k-n', who, text);
    try { E.chat.push({ r: nurse ? 'd' : 'n', t: text }); } catch (e) {}
  }

  /* ---------- what the trainee writes, before the room reads it ---------- */
  document.addEventListener('submit', ev => {
    if (!ev.target || ev.target.id !== 'er-form') return;
    const E = live(), input = $('er-input');
    if (!E || E.over || !input) return;
    const text = String(input.value || '').trim();
    if (!text) return;
    const missing = notHere(text);
    if (missing.length) {
      let read = null;
      try { read = H().localRead(text); } catch (e) { read = null; }
      const known = !!read && (((read.tests || []).length) || ((read.actions || []).length));
      if (!known) {
        // nothing in the message the room has: the room would answer as if the trainee misspoke, so it does not read it
        ev.preventDefault(); ev.stopImmediatePropagation();
        line('k-me', 'أنت', text);
        try { E.chat.push({ r: 's', t: text }); } catch (e) {}
        input.value = '';
        setTimeout(() => { const now = live(); if (now === E && !E.over) reply(E, missing, false); }, 700);
        return;
      }
      // the room takes the rest (the CRP of "ESR و CRP"); the missing one is answered after it
      setTimeout(() => { const now = live(); if (now === E && !E.over) reply(E, missing, true); }, 2600);
    }
    // during the call the trainee speaks to the doctor: his line is addressed to him, so the room hands it over
    if (C.on && C.target === 'doc' && isNurse(E)) {
      C.pending = 'doc'; C.raw = text;
      const n = norm(text), dn = norm(E.nurse.doc);
      if (!n.includes(dn) && !/(^| )(دكتور|دكتوره|يا دكتور|دكتورة)( |$)/.test(n)) input.value = docAddr(E) + text;
    }
  }, true);

  /* ---------- the loop ---------- */
  function tick() {
    requestAnimationFrame(tick);
    const E = live();
    if (E !== C.E) { if (C.on) endCall(C.E, 'reset'); C.E = E; C.placeholder = null; }
    if (!E) return;
    watchFeed();
    if (!isNurse(E)) return;
    if (C.on && (E.over || E.nurse.present)) { endCall(E, E.over ? 'over' : 'arrived'); return; }
    if (C.on) { const t = $('nbq-call-t'), txt = mmss(Math.max(0, E.sim - C.at)); if (t && t.textContent !== txt) t.textContent = txt; }
  }
  requestAnimationFrame(tick);
  window.__nbCall = { get on() { return C.on; }, get target() { return C.target; }, notHere };
})();
