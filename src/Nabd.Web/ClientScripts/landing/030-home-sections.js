/* =========================================================================
   Nabd signed-in home, V6.6: the training sections' filter and buttons (Views/Home/Dashboard/_Fields.cshtml).
   - the filter shows the cards of one field by toggling the legacy class "hidden" (nothing else is changed);
   - the open section's button presses the existing #launch-er-random-btn, so the room opens exactly as from
     the ER card (the legacy launchRandomER);
   - a section that is not open yet says so in the note under the cards (and in the application's toast when
     the legacy showToast is there); it never pretends to open anything.
   Reads and writes nothing else: no storage, no network.
   ========================================================================= */
(function () {
  'use strict';

  const box = document.getElementById('home-fields9');
  if (!box) return;
  const cards = [...box.querySelectorAll('.h9-fields > li[data-field]')];
  const chips = [...box.querySelectorAll('[data-field-filter]')];
  const count = document.getElementById('nh-fields-count');
  const note = document.getElementById('nh-fields-note');

  const plural = n => (n === 1 ? 'قسم واحد' : n === 2 ? 'قسمان' : n <= 10 ? n + ' أقسام' : n + ' قسماً');

  function apply(filter) {
    let shown = 0;
    let open = 0;
    cards.forEach(card => {
      const isOpen = card.classList.contains('is-open');
      const show = filter === 'all' || (filter === 'open' ? isOpen : card.dataset.field === filter);
      card.classList.toggle('hidden', !show);
      if (show) { shown++; if (isOpen) open++; }
    });
    chips.forEach(chip => {
      const on = chip.dataset.fieldFilter === filter;
      chip.classList.toggle('is-on', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (count) count.textContent = plural(shown) + (open ? ' · ' + (open === 1 ? 'متاح الآن قسم واحد' : open + ' متاحة الآن') : ' · تُفتح قريباً');
    if (note) note.classList.add('hidden');
  }

  chips.forEach(chip => chip.addEventListener('click', () => apply(chip.dataset.fieldFilter)));

  box.addEventListener('click', e => {
    const btn = e.target.closest('[data-field-go]');
    if (!btn) return;
    if (btn.dataset.fieldGo === 'er') {
      document.getElementById('launch-er-random-btn')?.click();
      return;
    }
    const msg = 'قسم ' + (btn.dataset.fieldName || '') + ' قيد الإعداد ويُفتح قريباً. المتاح الآن: قسم الطوارئ.';
    if (note) {
      note.textContent = msg;
      note.classList.remove('hidden');
    }
    if (typeof window.showToast === 'function') window.showToast(msg);
  });

  apply('all');
})();

/* Entrance (2026-11-14, owner: "the page is too still"): the home's cards rise into place once, as they scroll
   into view. Only what is below the fold is held back; nothing is held back when motion is reduced or the
   browser has no IntersectionObserver; parts drawn later (the steps, the assignments) are picked up as they
   appear. Adds the classes nh-rise / nh-in only (home.css, section 7). */
(function () {
  'use strict';

  const home = document.getElementById('view-home');
  if (!home || !('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const PARTS = [
    '.nh-hero-facts > div', '.nh-er-feats > li', '#home-er-card .v7-er-steps li', '.h9-fields > li',
    '.nh-uni-flow > li', '#nb8-guide-steps > li', '#home-path .nb-kpis > div',
  ].join(',');

  const io = new IntersectionObserver(entries => {
    let k = 0;
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.style.setProperty('--nh-d', (k++ * 60) + 'ms');
      e.target.classList.add('nh-in');
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  function arm() {
    if (home.classList.contains('hidden')) return;
    home.querySelectorAll(PARTS).forEach(el => {
      if (el.dataset.nhRise) return;
      el.dataset.nhRise = '1';
      const r = el.getBoundingClientRect();
      if (r.height && r.top < window.innerHeight * 0.92) return; // already on screen: it stays as it is
      el.classList.add('nh-rise');
      io.observe(el);
    });
  }

  new MutationObserver(arm).observe(home, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
  arm();
})();
