  /* ==========================================================================================================
     050 · home: the hero's facts are the trainee's own; the header's section buttons; the coach's card.
     ========================================================================================================== */
  /* ---------- V6.9.3: the trainee first on the home, and the header's main sections ---------- */
  // the hero's four facts become the trainee's own; anyone else keeps the platform's facts written in the page
  let platformFacts = null;
  function meFacts(u) {
    const dl = byId('nh-me-facts');
    if (!dl) return;
    if (platformFacts === null) platformFacts = dl.innerHTML;
    if (!u || u.role !== 'student') { if (dl.innerHTML !== platformFacts) dl.innerHTML = platformFacts; return; }
    const esc = C.esc, runs = (u.history || []).filter(h => h && typeof h.num === 'number');
    // the hero's first action: before the first session, the way into the room on every screen (V7, Q3)
    const go = byId('home-quick-er-btn');
    if (go) { go.style.display = runs.length ? '' : 'inline-flex'; go.textContent = runs.length ? 'ادخل غرفة الطوارئ' : 'ابدأ أول حالة ←'; }
    const last = runs[0], avg = runs.length ? Math.round(runs.reduce((a, h) => a + h.num, 0) / runs.length) : null;
    const axes = {};
    runs.filter(h => Array.isArray(h.axes)).forEach(h => h.axes.forEach(x => { const k = x.label; (axes[k] = axes[k] || []).push(x.pts / x.max); }));
    const weak = Object.entries(axes).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => a[1] - b[1])[0];
    const title = h => String(h.caseTitle || '').replace(/^غرفة الطوارئ( \(دور التمريض\))? · /, '');
    const cell = (dt, dd, small) => `<div><dt>${dt}</dt><dd>${dd}${small ? ` <span>${small}</span>` : ''}</dd></div>`;
    // the level (an estimate from the year, script/230-level.js), with the average as a ring beside it
    let level = ''; try { level = NB_LEVELS[nbDerivedLevel(u)].name; } catch (e) {}
    const pct = avg == null ? 0 : Math.max(0, Math.min(100, avg)), C2 = 2 * Math.PI * 15;
    const ring = `<svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true" style="flex:none"><circle cx="19" cy="19" r="15" fill="none" stroke="#e3eaed" stroke-width="5"/><circle cx="19" cy="19" r="15" fill="none" stroke="#176a72" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(C2 * pct / 100).toFixed(1)} ${C2.toFixed(1)}" transform="rotate(-90 19 19)"/></svg>`;
    const lvl = `<span style="display:inline-flex;align-items:center;gap:10px">${ring}<span style="display:grid;line-height:1.35">${esc(level || 'مبتدئ')}<span style="font-size:.8em;font-weight:400;color:#647680">${avg == null ? 'معدّلك يظهر بعد أول جلسة' : 'معدّلك ' + avg + '%'}</span></span></span>`;
    // V6.11 design pass: «معدّلك» (the average), so it does not read as the level «متوسط» beside it
    dl.innerHTML = `<div><dt>مستواك</dt><dd>${lvl}</dd></div>`
      + cell('آخر جلسة', last ? `${esc(last.num)}%` : 'لم تبدأ بعد', last ? esc(title(last)) : '')
      + cell('جلساتك', esc(String(runs.length)), !runs.length ? '' : runs.length === 1 ? 'جلسة مكتملة' : runs.length === 2 ? 'جلستان مكتملتان' : runs.length <= 10 ? 'جلسات مكتملة' : 'جلسة مكتملة')
      + cell('أضعف محور', weak ? esc(weak[0]) : '—', weak ? `${Math.round(weak[1] * 100)}%` : '');
  }
  const goHome = id => { try { navigateTo('home'); } catch (e) {} setTimeout(() => { const el = byId(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: 'smooth' }); }, 120); };
  document.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    if (t.closest('#app-nav-fields')) { goHome('home-fields9'); return; }
    if (t.closest('#app-nav-reports')) { try { navigateTo('profile'); } catch (err) {} setTimeout(() => { const el = byId('nbx-runs-profile'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: 'smooth' }); }, 160); }
  });


  // V6.9.6 (owner): on the home the coach is one card; everything else is on the coach's own page (050-coach-drill.js)
  // the photo's path is in images.json (key home.coach); the home writes it on its welcome block
  const coachImg = () => ((document.querySelector('[data-nbx-img-coach]') || {}).dataset || {}).nbxImgCoach || 'img/v9/solution2.jpg';
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
    box.innerHTML = `<div class="nbx-coach-hero">
        <figure class="nbx-coach-photo"><img src="${esc(coachImg())}" alt="مدرّب يتابع متدرّبين عند سرير المريض" width="960" height="680" loading="lazy" decoding="async"></figure>
        <div class="nbx-coach-hero-copy">
          <span class="nbx-coach-kicker">مساحتك الشخصية</span>
          <h2 id="nbx-coach-h">المدرب السريري</h2>
          <p>مدرّب يعرف أين تتعثّر، ويتدرّب معك عليه حتى تتقنه.</p>
          <ul class="nbx-coach-points">
            <li><b>يسمّي ما تحتاج تطويره</b><span>من تقارير جلساتك، بدليل لكل نقطة.</span></li>
            <li><b>يؤدّي دور المريض ومرافقيه</b><span>وأنت المسؤول عن القرار: تتصرّف خطوة بعد خطوة.</span></li>
            <li><b>سؤال، ثم تلميح، ثم الجواب</b><span>لا يعطيك الحل من أول مرة.</span></li>
          </ul>
          <div class="nbx-coach-hero-act"><button type="button" class="nbx-coach-cta" data-nbx-coach-open>افتح المدرب ←</button><span class="nbx-coach-status${gap ? ' is-gap' : ''}">${status}</span></div>
        </div>
      </div>`;
  }
