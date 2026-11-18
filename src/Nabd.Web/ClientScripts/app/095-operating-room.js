  /* ==========================================================================================================
     095 · the operating-room section (#view-or): its entries, the way back, and the 3D room's frame.
     The frame (wwwroot/or3d, the simulator, same origin) is loaded the first time the page is shown, never with the
     home: its models weigh about 25 MB. NabdOrRoom lets the chat (096) move the room's camera and open its monitor by
     pressing the simulator's own buttons; a request made while the room is still loading waits for it.
     Reads and writes nothing: no storage, no network beyond the frame itself.
     ========================================================================================================== */
  document.addEventListener('click', e => {
    if (e.target.closest('[data-or-open]')) navigateTo('or');
    else if (e.target.closest('#or-back-btn')) navigateTo('home');
    else {
      const tool = e.target.closest('[data-or-act]');
      if (tool) { NabdOrRoom.act(tool.dataset.orAct); setTimeout(NabdOrRoom.sync, 400); }
      else if (e.target.closest('[data-or-full]')) {
        const stage = byId('or3d-stage');
        if (document.fullscreenElement) document.exitFullscreen(); else if (stage.requestFullscreen) stage.requestFullscreen().catch(() => {});
      }
    }
  });

  const NabdOrRoom = (() => {
    const view = byId('view-or'), frame = byId('or3d-frame'), loading = byId('or3d-loading');
    let ready = false, pending = null;
    const doc = () => { try { return frame.contentDocument; } catch (e) { return null; } };
    // the simulator hides its loading card once the patient and the team are in the room
    const loaded = () => {
      const d = doc(), card = d && d.getElementById('loading-state');
      if (!card) return false;
      const st = d.defaultView.getComputedStyle(card);
      return card.hidden || st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0';
    };
    const press = id => {
      const d = doc(), b = d && d.getElementById(id);
      if (!b || b.disabled) return;
      // the simulator's camera views move the camera only in its room view, not in the trainee's own eyes
      const eyes = d.getElementById('toggle-trainee-mode');
      if (id.startsWith('camera-') && eyes && eyes.getAttribute('aria-pressed') === 'true') eyes.click();
      // a new view closes the monitor the chat opened before
      const monitor = d.getElementById('vitals-dialog');
      if (id.startsWith('camera-') && monitor && monitor.open) d.getElementById('vitals-close')?.click();
      b.click();
    };
    // the platform's buttons show what the simulator shows: the camera view, the anatomy, the monitor
    function sync() {
      const d = doc();
      if (!d || view.classList.contains('hidden')) return;
      view.querySelectorAll('[data-or-act]').forEach(b => {
        const el = d.getElementById(b.dataset.orAct);
        const on = b.dataset.orAct === 'open-vitals' ? !!(d.getElementById('vitals-dialog') || {}).open : !!el && el.getAttribute('aria-pressed') === 'true';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    function watch() {
      // the simulator could not load (no WebGL 2, a model missing): say so instead of waiting for ever
      const card = doc() && doc().getElementById('loading-state');
      if (card && card.dataset.state === 'error') {
        loading.querySelector('b').textContent = 'تعذّر تشغيل غرفة العمليات على هذا الجهاز';
        loading.querySelector('span').textContent = 'تحتاج الغرفة متصفحاً يدعم WebGL 2. المحادثة تعمل بدونها.';
        return;
      }
      if (loaded()) {
        ready = true;
        loading.hidden = true;
        setInterval(sync, 700);
        if (pending) { press(pending); pending = null; }
        return;
      }
      setTimeout(watch, 700);
    }
    function start() {
      if (frame.getAttribute('src')) return;
      frame.setAttribute('src', frame.dataset.src);
      frame.addEventListener('load', watch, { once: true });
    }
    // the page is opened by navigateTo and by the browser's history: start when it is shown, whichever led there
    new MutationObserver(() => { if (!view.classList.contains('hidden')) { start(); document.dispatchEvent(new CustomEvent('nb:or-open')); } })
      .observe(view, { attributes: true, attributeFilter: ['class'] });
    return Object.freeze({
      /** Presses one of the simulator's buttons (a camera view, the monitor) now, or as soon as the room is ready. */
      act(id) { if (ready) press(id); else pending = id; },
      isReady: () => ready,
      sync,
    });
  })();
