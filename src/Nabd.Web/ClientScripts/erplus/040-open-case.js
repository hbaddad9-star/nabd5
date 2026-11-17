/* Opening one case of the ER room (V6.10, 2026-11-18; docs/decisions/0019-qa-pass-v610.md).
   The QA pass found that an assignment, the coach's "repeat the case" and "enter the real case" did not open their
   case while another case sat unstarted at its briefing: the room kept the unstarted case and said "you have a
   case under way". Here a case that was never started (or is over) is replaced by the one asked for; a case
   under way is kept and the trainee is told. Also here: the trainee's role in the room is his track's (no switch
   at the briefing). Not on the realism switch: these are rules of entry, not changes of the room's look. */
(function () {
  'use strict';
  const toast = t => { try { showToast(t); } catch (e) {} };
  async function openCase(id) {
    if (typeof window.nbOpenER !== 'function') { toast('غرفة الطوارئ لم تُحمَّل بعد. حاول بعد لحظة.'); return; }
    await window.nbOpenER();
    const h = window.__nbER, E = h && h.E;
    if (!E || !id) return;
    if (E.c.id === id && !E.over) return;
    if (E.over || !E.started) { h.begin(id); return; }
    toast('لديك حالة جارية في الغرفة. أنهِها أولاً، ثم افتح هذه الحالة.');
  }
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-nb8-open-case]') : null;
    if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    openCase(b.getAttribute('data-nb8-open-case'));
  }, true);

  /* The role in the room is the trainee's track (V6.11, owner): chosen once, at registration, and changed only from
     "بياناتي" in the profile. The room's briefing offers a role switch; for a trainee it is replaced by a line that
     says his role. A console account trying the room keeps the switch. */
  // the room's own reading of the track (accounts from the legacy demo sign-in carry no track field)
  const trackRole = u => { let t = u.track; try { if (typeof nbTrackOf === 'function') t = nbTrackOf(u) || t; } catch (e) {} return t === 'nursing' ? 'nurse' : 'doctor'; };
  function lockRole() {
    let u = null;
    try { u = authState.isAuthenticated ? authState.user : null; } catch (e) {}
    if (!u || u.role !== 'student') return;
    const sw = document.querySelector('#view-er .er-role-sw');
    if (!sw) return;
    const nurse = !!sw.querySelector('[data-role="nurse"][aria-checked="true"]');
    const now = nurse ? 'nurse' : 'doctor', want = trackRole(u);
    // a role left on this device by a console account's try: the track's role is put back once (the room redraws)
    if (now !== want) {
      const E = window.__nbER && window.__nbER.E, key = (E && E.c && E.c.id) + ':' + want, b = sw.querySelector(`[data-role="${want}"]`);
      if (b && tried !== key) { tried = key; b.click(); return; }
    }
    const p = document.createElement('p');
    p.className = 'er-role-now';
    p.setAttribute('data-no-terms', '');
    p.innerHTML = `<b>دوري في الغرفة:</b> ${nurse ? 'ممرض/ة' : 'طبيب'}. <span class="er-small">${now === want ? 'حسب مسارك في حسابك. يتغيّر المسار من «بياناتي» في ملفك الشخصي.' : 'هذه الحالة تُلعب بدور الطبيب حالياً.'}</span>`;
    sw.replaceWith(p);
  }
  let tried = '';
  /* On entering the room: the role asked for is the track's, and a case still at its briefing that was set up for
     the other role (the track was changed in "بياناتي", or a console account tried the room on this device) is set
     up again for the track's role. A case under way is never touched. */
  function syncRole() {
    let u = null;
    try { u = authState.isAuthenticated ? authState.user : null; } catch (e) {}
    const h = window.__nbER;
    if (!u || u.role !== 'student' || !h) return;
    const want = trackRole(u);
    h.role = want;
    const E = h.E;
    if (E && E.c && !E.started && !E.over && E.role !== want && (want === 'doctor' || E.c.nurseMode)) h.beginAs(E.c.id, { role: want });
  }
  const room = document.getElementById('view-er');
  if (room && typeof MutationObserver === 'function') {
    new MutationObserver(lockRole).observe(room, { childList: true, subtree: true });
    let shown = false;
    new MutationObserver(() => { const now = !room.classList.contains('hidden'); if (now && !shown) syncRole(); shown = now; }).observe(room, { attributes: true, attributeFilter: ['class'] });
  }
  window.NabdRoom = Object.freeze({ openCase });
})();
