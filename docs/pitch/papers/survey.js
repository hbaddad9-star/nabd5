/* Nabd survey report: type the counts from the paper forms, the page computes the percentages,
   draws the bars and prints a clean report. Nothing is invented: an empty count stays empty. */
(function () {
  'use strict';
  const CFG = window.SURVEY;
  const KEY = 'nabd-survey-' + CFG.id + '-v1';
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let S = load() || fresh();
  function fresh() {
    const s = clone(CFG);
    [...s.profile, ...s.questions].forEach(q => { q.counts = q.options.map(() => ''); q.hl = q.hl || []; });
    s.meta.forEach(m => { m.value = m.value || ''; });
    s.summary = ''; s.notes = s.notes || '';
    return s;
  }
  function load() { try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private window: the page still works */ } }

  const num = v => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : 0; };
  const total = q => q.counts.reduce((a, c) => a + num(c), 0);
  const pct = (c, n) => n ? (Math.round(c * 1000 / n) / 10).toFixed(1) + '%' : '—';
  const LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="#6cc9ce" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h4l3-8 4 16 3-8h6"/></svg>';

  function qBlock(q, i, group) {
    const n = total(q);
    const rows = q.options.map((o, j) => {
      const c = num(q.counts[j]);
      const p = n ? c * 100 / n : 0;
      return `<tr class="${q.hl.includes(j) ? 'hl' : ''}">
        <td class="opt" contenteditable="true" data-edit="opt" data-g="${group}" data-i="${i}" data-j="${j}">${esc(o)}</td>
        <td class="cnt"><input type="number" min="0" inputmode="numeric" value="${esc(q.counts[j])}" data-g="${group}" data-i="${i}" data-j="${j}" aria-label="العدد"></td>
        <td class="pct" data-pct="${group}-${i}-${j}">${pct(c, n)}</td>
        <td class="bar"><i data-bar="${group}-${i}-${j}" style="width:${p}%"></i></td>
        <td class="screen-only mk"><button type="button" title="تمييز هذا الخيار في أبرز النتائج" data-act="hl" data-g="${group}" data-i="${i}" data-j="${j}">${q.hl.includes(j) ? '★' : '☆'}</button></td>
      </tr>`;
    }).join('');
    return `<div class="q">
      <div class="qh"><span class="qn">${group === 'p' ? 'خ' : 'س'}${i + 1}</span>
        <div class="qt" contenteditable="true" data-edit="text" data-g="${group}" data-i="${i}">${esc(q.text)}</div>
        <span class="qnn" data-n="${group}-${i}">${n ? 'أجاب ' + n : 'لم تُدخل الأعداد'}</span></div>
      <table class="qr"><thead><tr><th>الخيار</th><th>العدد</th><th>النسبة</th><th></th><th class="screen-only"></th></tr></thead><tbody>${rows}</tbody></table>
      ${group === 'q' ? `<div class="kline screen-only"><span>جملة النتيجة (تظهر في أبرز النتائج مع نسبة الخيارات المميّزة بنجمة):</span><div class="ke" contenteditable="true" data-edit="key" data-g="${group}" data-i="${i}">${esc(q.key || '')}</div></div>` : ''}
      <div class="qtools screen-only">
        <button type="button" data-act="addopt" data-g="${group}" data-i="${i}">+ خيار</button>
        <button type="button" data-act="delopt" data-g="${group}" data-i="${i}">− آخر خيار</button>
        <button type="button" data-act="up" data-g="${group}" data-i="${i}">↑</button>
        <button type="button" data-act="down" data-g="${group}" data-i="${i}">↓</button>
        <button type="button" class="del" data-act="delq" data-g="${group}" data-i="${i}">حذف السؤال</button>
      </div>
    </div>`;
  }

  function keyCards() {
    const cards = S.questions.map((q, i) => ({ q, i })).filter(x => x.q.key && x.q.hl.length);
    if (!cards.length) return '<p class="muted small">ميّزوا بنجمة الخيار المهم في أي سؤال، واكتبوا جملة النتيجة، فتظهر هنا.</p>';
    return cards.map(({ q, i }) => {
      const n = total(q), c = q.hl.reduce((a, j) => a + num(q.counts[j]), 0);
      return `<div class="kc" data-kc="${i}"><b>${pct(c, n)}</b><span>${esc(q.key)}</span><em>${n ? 'من ' + n + ' مشاركاً · س' + (i + 1) : 'بانتظار إدخال الأعداد'}</em></div>`;
    }).join('');
  }

  function formItem(q, i, label) {
    return `<div class="fi"><b>${label}${i + 1}. ${esc(q.text)}</b><div>${q.options.map(o => `<span>☐ ${esc(o)}</span>`).join('')}</div></div>`;
  }

  function render() {
    const valid = num((S.meta.find(m => m.k === 'valid') || {}).value), dist = num((S.meta.find(m => m.k === 'dist') || {}).value);
    const rate = valid && dist ? pct(valid, dist) : '—';
    document.getElementById('app').innerHTML = `
    <section class="sheet flow">
      <div class="band"><div class="brand"><div class="mark">${LOGO}</div><div class="name">نبض<small>منصة محاكاة سريرية تفاعلية</small></div></div>
        <div class="doc"><b>${esc(CFG.docNo)}</b>تقرير نتائج استبانة</div></div>
      <h1 contenteditable="true" data-edit="title">${esc(S.title)}</h1>
      <p class="lead" contenteditable="true" data-edit="lead">${esc(S.lead)}</p>

      <h2><span class="num">1</span>بيانات الاستبانة</h2>
      <table class="meta">${S.meta.map((m, i) => `<tr><th>${esc(m.label)}</th><td>${m.type === 'number'
        ? `<input class="mv" type="number" min="0" value="${esc(m.value)}" data-meta="${i}">`
        : `<div contenteditable="true" data-edit="meta" data-i="${i}">${esc(m.value)}</div>`}</td></tr>`).join('')}
        <tr><th>نسبة الاستجابة</th><td><b data-rate>${rate}</b> <span class="muted small">(الصالحة ÷ الموزّعة)</span></td></tr></table>

      <h2><span class="num">2</span>أبرز النتائج</h2>
      <div class="kcs" id="kcs">${keyCards()}</div>
      <div class="sum"><b>الخلاصة</b><div contenteditable="true" data-edit="summary" data-ph="اكتبوا هنا خلاصة النتائج في سطرين أو ثلاثة، بعد إدخال الأعداد.">${esc(S.summary)}</div></div>

      <h2><span class="num">3</span>خصائص العينة</h2>
      ${S.profile.map((q, i) => qBlock(q, i, 'p')).join('')}
      <button type="button" class="screen-only addq" data-act="addq" data-g="p">+ سؤال عن خصائص العينة</button>

      <h2><span class="num">4</span>النتائج التفصيلية</h2>
      ${S.questions.map((q, i) => qBlock(q, i, 'q')).join('')}
      <button type="button" class="screen-only addq" data-act="addq" data-g="q">+ سؤال</button>

      <h2><span class="num">5</span>ملاحظات منهجية</h2>
      <div class="sum"><div contenteditable="true" data-edit="notes">${esc(S.notes)}</div></div>

      <div class="sign">${CFG.signers.map(s => `<div><b>${esc(s)}</b><span>الاسم: ............................................</span><span>التوقيع: ..........................................</span><span>التاريخ: ..........................................</span></div>`).join('')}</div>
    </section>

    <section class="sheet flow form">
      <div class="band"><div class="brand"><div class="mark">${LOGO}</div><div class="name">نبض<small>منصة محاكاة سريرية تفاعلية</small></div></div>
        <div class="doc"><b>ملحق</b>نص الاستمارة كما وُزّعت</div></div>
      <h1>${esc(S.formTitle)}</h1>
      <p class="lead">${esc(S.formIntro)}</p>
      <h3>أولاً: معلومات عامة</h3>
      ${S.profile.map((q, i) => formItem(q, i, '')).join('')}
      <h3>ثانياً: الأسئلة</h3>
      ${S.questions.map((q, i) => formItem(q, i, '')).join('')}
      <p class="thanks">شكراً لوقتكم. الاستمارة مجهولة الهوية، وتُستخدم نتائجها لأغراض البحث والتطوير فقط.</p>
    </section>`;
  }

  // ---------- light updates that keep the cursor where it is
  function refreshQuestion(g, i) {
    const q = (g === 'p' ? S.profile : S.questions)[i], n = total(q);
    q.options.forEach((o, j) => {
      const c = num(q.counts[j]);
      const p = document.querySelector(`[data-pct="${g}-${i}-${j}"]`), b = document.querySelector(`[data-bar="${g}-${i}-${j}"]`);
      if (p) p.textContent = pct(c, n);
      if (b) b.style.width = (n ? c * 100 / n : 0) + '%';
    });
    const nn = document.querySelector(`[data-n="${g}-${i}"]`);
    if (nn) nn.textContent = n ? 'أجاب ' + n : 'لم تُدخل الأعداد';
    document.getElementById('kcs').innerHTML = keyCards();
  }
  function refreshRate() {
    const valid = num((S.meta.find(m => m.k === 'valid') || {}).value), dist = num((S.meta.find(m => m.k === 'dist') || {}).value);
    const el = document.querySelector('[data-rate]');
    if (el) el.textContent = valid && dist ? pct(valid, dist) : '—';
  }

  document.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('input[data-j]')) {
      const g = t.dataset.g, i = +t.dataset.i, j = +t.dataset.j;
      (g === 'p' ? S.profile : S.questions)[i].counts[j] = t.value;
      refreshQuestion(g, i); save();
    } else if (t.matches('input[data-meta]')) {
      S.meta[+t.dataset.meta].value = t.value; refreshRate(); save();
    } else if (t.matches('[contenteditable][data-edit]')) {
      const v = t.innerText.trim(), k = t.dataset.edit, g = t.dataset.g, i = +t.dataset.i;
      const list = g === 'p' ? S.profile : S.questions;
      if (k === 'title') S.title = v; else if (k === 'lead') S.lead = v;
      else if (k === 'summary') S.summary = v; else if (k === 'notes') S.notes = v;
      else if (k === 'meta') S.meta[i].value = v;
      else if (k === 'text') list[i].text = v;
      else if (k === 'opt') list[i].options[+t.dataset.j] = v;
      else if (k === 'key') { list[i].key = v; document.getElementById('kcs').innerHTML = keyCards(); }
      save();
    }
  });
  // paste as plain text only
  document.addEventListener('paste', e => {
    if (!e.target.closest('[contenteditable]')) return;
    e.preventDefault();
    document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
  });

  document.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const g = b.dataset.g, i = +b.dataset.i, list = g === 'p' ? S.profile : S.questions, q = list[i];
    switch (b.dataset.act) {
      case 'hl': { const j = +b.dataset.j; q.hl = q.hl.includes(j) ? q.hl.filter(x => x !== j) : [...q.hl, j]; break; }
      case 'addopt': q.options.push('خيار جديد'); q.counts.push(''); break;
      case 'delopt': if (q.options.length > 2) { q.options.pop(); q.counts.pop(); q.hl = q.hl.filter(x => x < q.options.length); } break;
      case 'up': if (i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]]; break;
      case 'down': if (i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]]; break;
      case 'delq':
        if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'متأكد؟ اضغط مرة ثانية'; setTimeout(() => { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'حذف السؤال'; } }, 4000); return; }
        list.splice(i, 1); break;
      case 'addq': list.push({ text: 'نص السؤال كما في الاستمارة', options: ['الخيار الأول', 'الخيار الثاني'], counts: ['', ''], hl: [], key: '' }); break;
      default: return;
    }
    save(); render();
  });

  // ---------- toolbar
  function armed(btn, label, run) {
    btn.addEventListener('click', () => {
      if (btn.dataset.armed !== '1') { btn.dataset.armed = '1'; const old = btn.textContent; btn.textContent = 'متأكد؟ اضغط مرة ثانية'; setTimeout(() => { btn.dataset.armed = ''; btn.textContent = old; }, 4000); return; }
      btn.dataset.armed = ''; btn.textContent = label; run();
    });
  }
  document.getElementById('t-print').addEventListener('click', () => window.print());
  armed(document.getElementById('t-zero'), 'تصفير الأعداد', () => {
    [...S.profile, ...S.questions].forEach(q => { q.counts = q.options.map(() => ''); });
    S.meta.forEach(m => { if (m.type === 'number') m.value = ''; });
    save(); render();
  });
  armed(document.getElementById('t-reset'), 'استرجاع النموذج الأصلي', () => { S = fresh(); save(); render(); });
  document.getElementById('t-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'nabd-' + CFG.id + '.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  const file = document.getElementById('t-file');
  document.getElementById('t-import').addEventListener('click', () => file.click());
  file.addEventListener('change', () => {
    const f = file.files[0]; if (!f) return;
    f.text().then(t => { try { const v = JSON.parse(t); if (v && v.id === CFG.id && Array.isArray(v.questions)) { S = v; save(); render(); } else alert('هذا الملف ليس لهذه الاستبانة.'); } catch (e) { alert('تعذّرت قراءة الملف.'); } });
    file.value = '';
  });

  render();
})();
