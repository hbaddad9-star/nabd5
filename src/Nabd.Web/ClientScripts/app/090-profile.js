  /* ==========================================================================================================
     090 · profile: the trainee's card first, the dashboard cards, the supervisor's note, the record's serial,
     and "my data" (name, track, year, photograph).
     ========================================================================================================== */
  /* ---------- 5. the profile ---------- */
  const TRACK = { nursing: 'التمريض', medicine: 'الطب' };
  // the room's own reading of the track (accounts from the legacy demo sign-in carry no track field)
  const myTrack = u => { let t = u.track; try { if (typeof nbTrackOf === 'function') t = nbTrackOf(u) || t; } catch (e) {} return t; };
  const YEARS = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'];
  const uniOf = u => { try { const w = Un && u && u.email ? Un.whois(u.email) : null; return w && w.kind === 'student' ? w : null; } catch (e) { return null; } };
  function photo(u) {
    [byId('profile-avatar-box'), byId('header-avatar-circle'), byId('side-user-av')].forEach(el => {
      if (!el) return;
      if (u && u.photo) { el.style.backgroundImage = `url("${u.photo}")`; el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center'; el.style.color = 'transparent'; }
      else { el.style.backgroundImage = ''; el.style.color = ''; }
    });
  }
  function shrink(file) {
    return new Promise((res, rej) => {
      if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { rej(new Error('type')); return; }
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const s = 160, c = document.createElement('canvas'); c.width = s; c.height = s;
        const k = Math.max(s / img.width, s / img.height), w = img.width * k, h = img.height * k;
        c.getContext('2d').drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('read')); };
      img.src = url;
    });
  }
  function myData(u) {
    const pane = byId('profile-pane-settings');
    if (!pane) return;
    let box = byId('nbx-me');
    if (!u || u.role !== 'student') { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('section'); box.id = 'nbx-me'; box.className = 'nbx-aff nbx-me'; box.setAttribute('data-no-terms', ''); const h = pane.querySelector('h2, h3'); pane.insertBefore(box, h ? h.nextSibling : pane.firstChild); }
    if (box.contains(document.activeElement)) return; // not redrawn while he is typing in it
    const uni = uniOf(u), year = Number(u.year) || 4;
    box.innerHTML = `<div class="nbx-aff-head"><h2>بياناتي</h2></div>
      <form class="nbx-me-form" novalidate>
        <div class="nbx-me-photo"><span class="nbx-me-av" id="nbx-me-av">${u.photo ? '' : esc(u.initials || '')}</span>
          <div><label class="nbx-me-file">غيّر الصورة<input type="file" accept="image/png,image/jpeg,image/webp" id="nbx-me-file"></label>${u.photo ? '<button type="button" class="nbx-me-link" data-nbx-me="nophoto">احذف الصورة</button>' : ''}<small>تُصغَّر وتُحفظ على هذا الجهاز فقط.</small></div></div>
        <label>الاسم<input type="text" name="name" maxlength="60" value="${esc(u.name || '')}"${uni ? ' disabled' : ''}>${uni ? '<small>اسمك كما في قائمة جامعتك. لتعديله راجع إدارة الجامعة.</small>' : ''}</label>
        <label>المسار<select name="track"${uni ? ' disabled' : ''}>${Object.entries(TRACK).map(([k, v]) => `<option value="${k}"${myTrack(u) === k ? ' selected' : ''}>${v}</option>`).join('')}</select>${uni ? '<small>من مساقك في الجامعة.</small>' : '<small>يحدد دورك في غرفة الطوارئ: طبيب أو ممرض/ة.</small>'}</label>
        <label>السنة الدراسية<select name="year"${uni ? ' disabled' : ''}>${YEARS.map((y, i) => `<option value="${i + 1}"${year === i + 1 ? ' selected' : ''}>السنة ${y}</option>`).join('')}</select><small>${uni ? 'من رقم مساقك.' : 'في السنة الأولى والثانية تقترح عليك الممرضة الجرعات.'}</small></label>
        <p class="nbx-me-err" role="alert" hidden></p>
        ${uni ? '' : '<button type="submit" class="nbx-me-save">حفظ</button>'}
      </form>`;
    const av = byId('nbx-me-av'); if (av && u.photo) { av.style.backgroundImage = `url("${u.photo}")`; }
  }
  const refresh = u => { try { if (typeof saveAccountToStorage === 'function') saveAccountToStorage(u); } catch (e) {} try { syncAuthShellUI(); } catch (e) {} try { renderProfileView(); } catch (e) {} try { if (window.NabdAccess) window.NabdAccess.apply(); } catch (e) {} profile(); };
  document.addEventListener('submit', e => {
    const f = e.target && e.target.closest ? e.target.closest('.nbx-me-form') : null;
    if (!f) return;
    e.preventDefault();
    const u = user(); if (!u || uniOf(u)) return;
    const fd = new FormData(f), name = String(fd.get('name') || '').trim().replace(/\s+/g, ' '), track = fd.get('track') === 'medicine' ? 'medicine' : 'nursing', year = Math.max(1, Math.min(6, Number(fd.get('year')) || 4));
    const err = f.querySelector('.nbx-me-err');
    if (name.length < 2) { err.textContent = 'اكتب اسمك (حرفان على الأقل).'; err.hidden = false; return; }
    const p = name.split(' ').filter(Boolean);
    Object.assign(u, { name, track, year, initials: p.length >= 2 ? p[0][0] + ' ' + p[1][0] : name.slice(0, 2), specialty: TRACK[track], roleLabel: `متدرّب مستقل · ${TRACK[track]}` });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    refresh(u);
    toast('حُفظت بياناتك.');
  });
  document.addEventListener('change', async e => {
    const t = e.target;
    if (!t || t.id !== 'nbx-me-file' || !t.files || !t.files[0]) return;
    const u = user(); if (!u) return;
    try { u.photo = await shrink(t.files[0]); t.blur(); refresh(u); toast('تغيّرت صورتك.'); }
    catch (err) { toast('تعذّرت قراءة الصورة. اختر صورة PNG أو JPG.'); }
  });
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-nbx-me="nophoto"]') : null;
    if (!b) return;
    const u = user(); if (!u) return;
    delete u.photo; b.blur(); refresh(u); toast('حُذفت الصورة.');
  });
  function profile() {
    const u = user(), view = byId('view-profile');
    if (!view || !u) return;
    photo(u);
    if (u.role !== 'student') return;
    // the trainee's own card first, then his affiliation and his reports
    const head = byId('profile-name-heading'), card = head && [...view.children].find(c => c.contains(head));
    const aff = byId('nbx-aff'), runs = byId('nbx-runs-profile');
    if (card && aff && card.nextElementSibling !== aff) card.after(aff);
    if (aff && runs && aff.nextElementSibling !== runs) aff.after(runs);
    const uni = uniOf(u), runsList = erRuns(u);
    // the coach's card
    const dc = byId('dash-coach');
    if (dc && window.NabdCoachDrill) {
      const gaps = window.NabdCoachDrill.gapsOf(u), STG = ['', 'تمرين موجّه', 'حالة حقيقية', 'أُغلق'], h3 = dc.parentElement && dc.parentElement.querySelector('h3');
      if (h3) h3.textContent = 'ما تحتاج تطويره';
      dc.setAttribute('data-no-terms', '');
      dc.innerHTML = (gaps.length ? `<ul class="nbx-pf-list">${gaps.slice(0, 4).map(x => `<li><b>${esc(x.title)}</b><small>${esc(x.kind === 'drill' ? STG[x.stage] : x.skill)}</small></li>`).join('')}</ul>` : `<p class="nb-dsub">${runsList.length ? 'لا نقاط مفتوحة الآن.' : 'تظهر بعد أول حالة تنهيها.'}</p>`)
        + '<button type="button" class="nb-link-btn" data-nbx-coach-open>افتح المدرب السريري</button>';
    }
    // skills: his ER axes
    const ds = byId('dash-skills');
    if (ds) {
      const ax = {};
      runsList.filter(h => Array.isArray(h.axes)).forEach(h => h.axes.forEach(x => { (ax[x.label] = ax[x.label] || []).push(x.pts / x.max); }));
      const rows = Object.entries(ax).map(([k, v]) => [k, Math.round(v.reduce((a, b) => a + b, 0) / v.length * 100)]).sort((a, b) => b[1] - a[1]);
      const h3 = ds.parentElement && ds.parentElement.querySelector('h3');
      if (rows.length) {
        if (h3) h3.textContent = 'مهاراتي بحسب المحور';
        ds.setAttribute('data-no-terms', '');
        ds.innerHTML = rows.map(r => `<div class="nb-bar"><div><span>${esc(r[0])}</span><b class="font-num">${r[1]}%</b></div><i><u style="width:${r[1]}%;background:${r[1] >= 75 ? '#0E7540' : r[1] >= 60 ? '#16838A' : '#D28A09'}"></u></i></div>`).join('');
      }
    }
    // repeated errors: from his saved reports
    const pm = byId('path-mistakes'), cd = window.NabdCoachData ? window.NabdCoachData.data(u) : null;
    if (pm) {
      pm.setAttribute('data-no-terms', '');
      pm.innerHTML = cd && cd.top.length
        ? `<ul class="nbx-pf-list">${cd.top.map(([t, n]) => `<li><b>${esc(t)}</b><small>${n === 1 ? 'مرة واحدة' : n === 2 ? 'مرتان' : n + ' مرات'}</small></li>`).join('')}</ul>`
        : '<p class="nbx-pf-empty">لا أخطاء متكررة بعد. تظهر هنا من تقارير جلساتك.</p>';
    }
    // the supervisor's notes: a university student's card only
    const pn = byId('path-notes'), pnCard = pn && pn.parentElement;
    if (pnCard) {
      pnCard.style.display = uni ? '' : 'none';
      if (uni) {
        let note = null;
        try { note = (Un.U(uni.org).notes || {})[uni.student.id] || null; } catch (e) {}
        pn.setAttribute('data-no-terms', '');
        pn.innerHTML = note && note.text
          ? `<div class="nb-item nbx-pf-note"><span><b>ملاحظة ${esc(note.by || uni.supervisor || 'المشرف')}</b><br>${esc(note.text)}</span></div>`
          : '<p class="nbx-pf-empty">لا ملاحظات من المشرف حالياً.</p>';
      }
    }
    // the record's serial: from the e-mail, not from the account's internal id
    const sn = byId('cert-serial-num');
    if (sn && u.email) { let h = 0; for (const ch of u.email) h = (h * 31 + ch.charCodeAt(0)) >>> 0; sn.textContent = `NABD-2026-${h.toString(36).toUpperCase().padStart(6, '0').slice(-6)}-${100 + ((u.history || []).length)}`; }
    myData(u);
  }
