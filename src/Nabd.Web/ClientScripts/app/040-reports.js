  /* ==========================================================================================================
     040 · reports: the trainee's saved reports on the home and in the profile, with his supervisor's review.
     ========================================================================================================== */
  /* ---------- V6.9.1: the student's own reports and his supervisor's review ----------
     Every finished case is kept with the account (the room's result plus what the assessment layer adds: the axes,
     the errors by severity, the objectives, the handover checklist, the timeline and the reflection), so the
     report can be read again after signing out and in. A university student also sees where his supervisor
     stands: waiting for review, or approved with the final mark, the rating and the note. */
  const RDISPO = { icu: 'العناية الحثيثة', hdu: 'مراقبة عالية في الطوارئ', cath: 'القسطرة', ward: 'طابق عادي', home: 'البيت' };
  const RTL = { action: 'إجراء', test: 'فحص', harm: 'خطأ', stage: 'حالة المريض', better: 'تحسّن', comm: 'تواصل', exam: 'فحص سريري', read: 'قراءة نتيجة', dose: 'جرعة', order: 'أمر', check: 'تحقق', scope: 'حدود الدور', int: 'مقاطعة', help: 'طلب مساعدة' };
  const RSTATE = { ontime: ['في وقته', 'ok'], late: ['متأخر', 'mid'], missed: ['لم يحدث', 'bad'] };
  const RATING = ['', 'يحتاج إعادة كاملة', 'دون المتوقع', 'عند المتوقع', 'فوق المتوقع', 'متميّز'];
  const clock = m => `${Math.floor(m || 0)}:${String(Math.round(((m || 0) % 1) * 60)).padStart(2, '0')}`;
  function reviewOf(u, h) {
    let who = { kind: 'none' };
    try { who = Un.whois(u.email); } catch (e) {}
    if (who.kind !== 'student') return null;
    const st = Un.U(who.org), key = 'live:' + who.student.id + ':' + h.ts;
    return { pub: (st.published || {})[key], o: (st.overrides || {})[key], rate: (st.ratings || {})[key], note: (st.notes || {})[who.student.id], sup: who.supervisor || '' };
  }
  function runHtml(u, h) {
    const esc = C.esc, d = h.detail || {}, rv = reviewOf(u, h), nurse = /_n$/.test(h.caseId || '');
    const date = (() => { try { return new Date(h.ts).toLocaleDateString('ar-JO-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return h.date || ''; } })();
    const fin = rv && rv.pub ? (rv.o ? rv.o.total : h.num) : null;
    const status = !rv ? '' : rv.pub ? `<i class="is-pub">معتمدة: <b class="nbx-num">${fin}</b></i>` : '<i class="is-wait">بانتظار مراجعة المشرف</i>';
    const list = (arr, cls) => arr && arr.length ? `<ul class="nbx-run-errs ${cls}">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    const rev = !rv ? '' : rv.pub
      ? `<div class="nbx-run-rev is-pub"><b>مراجعة ${esc(rv.sup || 'المشرف')}</b><p>الدرجة المعتمدة <b class="nbx-num">${fin}%</b>${rv.o && rv.o.total !== h.num ? ` (درجة الغرفة ${h.num}%، عدّلها المشرف: ${esc(rv.o.why)})` : ''}${rv.o && rv.o.waive ? ` · أسقط المشرف الخطأ الحرج: ${esc(rv.o.why)}` : ''}${rv.rate ? ` · تقييمه العام ${rv.rate.v}/5 (${esc(RATING[rv.rate.v])})` : ''}</p>${rv.note && rv.note.text ? `<p><b>ملاحظته لك:</b> ${esc(rv.note.text)}</p>` : ''}</div>`
      : '<div class="nbx-run-rev"><p>وصل تقريرك إلى مشرفك. تظهر هنا الدرجة المعتمدة وملاحظته بعد أن يراجعها وينشرها.</p></div>';
    const axes = Array.isArray(h.axes) && h.axes.length ? `<ul class="nbx-run-axes">${h.axes.map(x => { const p = Math.round(x.pts / x.max * 100); return `<li class="is-${p >= 75 ? 'ok' : p >= 60 ? 'mid' : 'low'}"><span>${esc(x.label)}</span><b class="nbx-num">${Math.round(x.pts)} / ${x.max}</b><i><em style="width:${p}%"></em></i></li>`; }).join('')}</ul>` : '';
    const steps = (d.steps || []).length ? `<h5>أهداف الحالة</h5><ul class="nbx-run-steps">${d.steps.map(k => `<li><span>${esc(k.label)}</span><span class="nbx-num">${k.at == null ? '—' : clock(k.at)}</span><em class="is-${RSTATE[k.state][1]}">${RSTATE[k.state][0]}</em></li>`).join('')}</ul>` : '';
    const hand = (d.hand || []).length ? `<h5>تسليمك</h5><ul class="nbx-run-hand">${d.hand.map(x => `<li class="${x.ok ? 'is-ok' : 'is-miss'}"><span>${esc(x.label)}</span><em>${x.ok ? 'ذُكر' : esc(x.miss)}</em></li>`).join('')}</ul>` : '';
    const tl = (h.timeline || []).length ? `<h5>الخط الزمني</h5><ol class="nbx-run-tl">${h.timeline.map(l => `<li class="t-${esc(l.type)}"><time class="nbx-num" dir="ltr">${clock(l.at)}</time><em>${esc(RTL[l.type] || l.type)}</em><span>${esc(l.text)}</span></li>`).join('')}</ol>` : '';
    const refl = h.reflect && (h.reflect.hard || h.reflect.change) ? `<h5>تأملك</h5><p class="nbx-run-refl">${h.reflect.hard ? `<b>أصعب لحظة:</b> ${esc(h.reflect.hard)}<br>` : ''}${h.reflect.change ? `<b>ما تغيّره:</b> ${esc(h.reflect.change)}` : ''}</p>` : '';
    const dx = d.dxRight && !nurse ? `<p class="nbx-run-dx"><b>التشخيص الصحيح:</b> ${esc(d.dxRight)}${d.dx ? ` · <b>كتبت:</b> ${esc(d.dx)}` : ''}${d.dispo ? ` · <b>الوجهة:</b> ${esc(RDISPO[d.dispo] || d.dispo)}${d.dispoRight && d.dispoRight !== d.dispo ? ` (الصحيحة: ${esc(RDISPO[d.dispoRight] || '')})` : ''}` : ''}</p>` : '';
    return `<li><details class="nbx-run">
      <summary><span class="nbx-run-t"><b>${esc(h.caseTitle || 'غرفة الطوارئ')}</b><small>${esc(date)} · ${nurse ? 'دور التمريض' : 'دور الطبيب'}${d.minutes ? ' · ' + clock(d.minutes) + ' دقيقة' : ''}</small></span>
        <span class="nbx-run-s"><b class="nbx-num">${h.num}<small>/100</small></b><em class="${h.passed ? 'is-ok' : 'is-bad'}">${h.passed ? 'مجتاز' : 'غير مجتاز'}</em>${status}</span></summary>
      <div class="nbx-run-body">${rev}${dx}${axes}
        ${(h.critical || []).length ? `<h5 class="is-bad">خطأ حرج</h5>${list(h.critical, 'is-crit')}` : ''}
        ${(d.major || []).length ? `<h5>أخطاء جسيمة</h5>${list(d.major, 'is-major')}` : ''}
        ${(d.minor || []).length ? `<h5>أخطاء بسيطة</h5>${list(d.minor, 'is-minor')}` : ''}
        ${steps}${hand}${tl}${refl}
        ${!h.detail && !h.timeline ? '<p class="nbx-run-old">جلسة قبل حفظ التقارير الكاملة: تبقى درجتها في سجلك.</p>' : ''}
      </div></details></li>`;
  }
  function runsBlock(u, max, title, sub) {
    const runs = ((u && u.history) || []).filter(h => h && /^er_/.test(h.caseId || '') && h.ts).slice(0, max);
    const all = ((u && u.history) || []).filter(h => h && /^er_/.test(h.caseId || '')).length;
    return `<div class="nbx-runs-head"><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div>
      ${runs.length ? `<ul class="nbx-runs-list">${runs.map(h => runHtml(u, h)).join('')}</ul>${all > runs.length ? `<button type="button" class="nbx-runs-more" data-nbx-runs-all>كل تقاريرك (${C.n(all)}) في ملفك الشخصي</button>` : ''}`
        : '<p class="nbx-runs-empty">لم تُنهِ حالة في غرفة الطوارئ بعد. كل تقرير يُحفظ هنا مع حسابك، وتقدر ترجعله متى شئت.</p>'}`;
  }
  function runs(u, uni) {
    const homeHost = document.querySelector('#home-student-uni-section .nh-uni-main');
    let home = byId('nbx-runs-home');
    if (homeHost && u && u.role === 'student' && uni) {
      if (!home) { home = document.createElement('section'); home.id = 'nbx-runs-home'; home.className = 'nbx-runs'; home.setAttribute('data-no-terms', ''); homeHost.appendChild(home); }
      home.innerHTML = runsBlock(u, 3, 'تقاريرك ومراجعة المشرف', 'كل حالة تنهيها تصل إلى مشرفك، وتظهر هنا الدرجة المعتمدة وملاحظته حين ينشرها.');
    } else if (home) home.remove();
    const view = byId('view-profile'), aff = byId('nbx-aff');
    let prof = byId('nbx-runs-profile');
    if (view && aff && u && u.role === 'student') {
      if (!prof) { prof = document.createElement('section'); prof.id = 'nbx-runs-profile'; prof.className = 'nbx-aff nbx-runs'; prof.setAttribute('data-no-terms', ''); aff.insertAdjacentElement('afterend', prof); }
      prof.innerHTML = runsBlock(u, 12, 'تقاريري في غرفة الطوارئ', uni ? 'تقرير كل حالة كما كتبته الغرفة، ومراجعة مشرفك حين ينشرها.' : 'تقرير كل حالة كما كتبته الغرفة: افتحه لتراجع ما فعلت.');
    } else if (prof) prof.remove();
  }
  document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('[data-nbx-runs-all]')) { try { navigateTo('profile'); } catch (err) {} } });
