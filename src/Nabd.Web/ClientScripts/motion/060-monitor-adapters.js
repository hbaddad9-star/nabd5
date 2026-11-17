  function enhanceMonitors() {
    const er = document.querySelector('.er-mon:not([data-mon])');
    if (er) {
      const ids = [['hr', 'er-v-hr'], ['spo2', 'er-v-spo2'], ['rr', 'er-v-rr'], ['temp', 'er-v-temp'], ['bp', 'er-v-bp']];
      makeMonitor(er, {
        hr: () => document.getElementById('er-v-hr'),
        spo2: () => document.getElementById('er-v-spo2'),
        dot: () => er.querySelector('.er-mon-dot'),
        vt: () => document.getElementById('view-er').dataset.rhythm === 'vt',
        quiet: () => { const b = document.getElementById('er-brief'); return !!(b && !b.hidden); },
        warn: (key, raw) => (window.nbErVitals ? window.nbErVitals.warn(key, raw) : ''),
        tiles: () => ids.map(([key, id]) => {
          const v = document.getElementById(id);
          return v ? { key, el: v.parentElement, val: () => v } : null;
        }).filter(Boolean)
      });
    }
  }
