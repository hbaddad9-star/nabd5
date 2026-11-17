  /* ==========================================================================================================
     010 · core: the guard and the helpers shared by every fragment of this bundle.
     ========================================================================================================== */
  const C = window.NabdConsole, Un = window.NabdUni;
  if (!C || !Un || typeof loginWithAccount !== 'function' || typeof showOnlySection !== 'function' || typeof navigateTo !== 'function') return;

  /* ---------- helpers every part of the trainee's application shares ---------- */
  const byId = id => document.getElementById(id);
  const esc = C.esc;
  // the signed-in account, or null
  const user = () => { try { return authState.isAuthenticated ? authState.user : null; } catch (e) { return null; } };
  const saveAccount = u => { try { if (typeof saveAccountToStorage === 'function') saveAccountToStorage(u); } catch (e) {} };
  const toast = t => { try { showToast(t); } catch (e) {} };
  // a console account: Nabd's admin, a university's admin, a supervisor or coordinator
  const isConsole = () => { try { return !!C.consoleRole(); } catch (e) { return false; } };
  // the ER sessions kept with an account
  const erRuns = u => ((u && u.history) || []).filter(h => h && /^er_/.test(h.caseId || '') && typeof h.num === 'number');
  // marks off, Arabic digits to Latin, letter forms folded (the room's own normalisation)
  const norm = s => String(s == null ? '' : s).replace(/[ً-ٰٟـ]/g, '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[؟?!,،:؛()"'«»\-_/]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
