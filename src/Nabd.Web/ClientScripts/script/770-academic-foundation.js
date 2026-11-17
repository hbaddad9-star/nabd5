    /* =========================================================================
       THE STUDENT'S ACADEMIC PART
       Role guidance on the home and the assignments of the student's section.
       Built only on data the app already holds (NB_COHORTS, data/er-cases.json,
       the user's own ER history) plus the 'nabd_v2_assignments' key. Nothing here is shared between devices.
       Plain function declarations and `var` so nothing hits a TDZ if a render
       runs early.
       ========================================================================= */
    var nb8CasesCache = null, nb8CasesLoading = null;
    function nb8Keys() { return { assign: 'nabd_v2_assignments' }; }
    function nb8Esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
    function nb8IsProf(u) { return !!u && (u.role === 'professor' || u.role === 'doctor'); }
    function nb8FmtDate(iso) {
      try { const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? String(iso) : d.toLocaleDateString('ar-JO', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return String(iso); }
    }
    // The course codes the page already printed (NUR-402, NUR-405, MED-410), each with one section from NB_COHORTS.
    // Demo cohort records carry no section; they sit in the first section of their track.
    function nb8UserSection(u) {
      if (!u) return null;
      if (u.cohort && NB_COHORTS[u.cohort]) return u.cohort;
      return ({ rana: 'NUR-JU-2026', med_student: 'MED-JUST-2026' })[u.id] || null; // demo accounts only
    }
    // phase8 2026-11-07 (review): drop malformed entries so a damaged store never breaks the home page.
    function nb8GetAssignments() { const a = safeStorageGet(nb8Keys().assign, []); return Array.isArray(a) ? a.filter(x => x && typeof x === 'object' && typeof x.caseId === 'string' && typeof x.section === 'string') : []; }

    // ER cases: reuse what er.js already loaded, otherwise fetch the same file once.
    function nb8LoadErCases() {
      if (nb8CasesCache) return Promise.resolve(nb8CasesCache);
      try { const D = window.__nbER && window.__nbER.D; if (D && Array.isArray(D.cases)) { nb8CasesCache = D.cases; return Promise.resolve(nb8CasesCache); } } catch (e) {}
      if (!nb8CasesLoading) {
        nb8CasesLoading = fetch('data/er-cases.json')
          .then(r => { if (!r.ok) throw new Error('cases'); return r.json(); })
          .then(j => { nb8CasesCache = Array.isArray(j.cases) ? j.cases : []; return nb8CasesCache; })
          .catch(e => { nb8CasesLoading = null; throw e; });
      }
      return nb8CasesLoading;
    }
    // Neutral label for students: bed + patient + the arrival line. Never the diagnosis.
    function nb8CaseLabel(c) {
      if (!c) return { title: 'حالة من غرفة الطوارئ', line: '' };
      const p = c.patient || {};
      const who = p.name ? `${p.name}${p.age ? '، ' + p.age + ' سنة' : ''}` : '';
      return { title: [c.bed, who].filter(Boolean).join(' · ') || 'حالة من غرفة الطوارئ', line: p.arrival || '' };
    }
    function nb8AssignDone(u, a) {
      // mobile audit 2026-11-07: a nurse-role run of the case (er_<id>_n) counts too, so a nursing class can finish it.
      return ((u && u.history) || []).find(h => h && (h.caseId === 'er_' + a.caseId || h.caseId === 'er_' + a.caseId + '_n') && (h.ts || 0) >= (a.ts || 0)) || null;
    }

    // Opens the ER room on the assigned case: er.js open() reads ?case= when it starts a new case.

