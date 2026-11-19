  /* ==========================================================================================================
     060 · coach data: what the coach reads from the saved reports (averages, weakest axis, repeated errors)
     and the gap that has a guided drill.
     ========================================================================================================== */
  /* ---------- V6.9.4: the clinical coach, the last section of the home ----------
     The owner: the coach comes last on the home, and the header's «المدرب السريري» leads to it. It reads the
     trainee's own saved reports (no server, no model yet): his scores over his last sessions, his weakest axis,
     the errors that keep coming back, and one exercise for the next case with the case to repeat. With the agent
     it will talk with him about each session (docs/agent/er-agent.ar.md, D-44). */
  const COACH_TIP = {
    safe: 'الأولوية للحياة: الأكسجين والعلاج الأساسي في أول دقائق، قبل أي فحص.',
    assess: 'اسأل عن القصة قبل أن تقرّر، وبعد كل علاج ارجع للمريض: كيف النفس؟ كم صار الإشباع؟',
    dx: 'قبل التسليم اكتب تشخيصاً واحداً وسبباً واحداً من الحالة يدعمه.',
    tests: 'اطلب ما يغيّر قرارك الآن فقط، واقرأ كل نتيجة قبل أن تطلب غيرها.',
    team: 'عرّف بنفسك للأهل، اشرح لهم بجملة واحدة، واطلب المساعدة قبل أن يسوء المريض.',
    hand: 'سلّم بستة بنود: من المريض ومشكلته، خلفيته، قراءتان بالأرقام، ما أُعطي، الحساسية، والخطة.'
  };
  const COACH_ERR = [
    [/الحساسية/, 'اسأل عن الحساسية قبل أول دواء، ولو بجملة واحدة للمريض أو مرافقه.'],
    [/قصة مرضية غير كافية/, 'قبل أول قرار اسأل سؤالين على الأقل: متى بدأ، وما أمراضه وأدويته.'],
    [/جرعة/, 'قل الدواء والجرعة والطريق كاملة، وراجع المدى قبل أن تطلب.'],
    [/لم يحدث|تأخر/, 'رتّب أولوياتك: ما ينقذ الحياة أولاً، ثم الفحوصات.']
  ];
  // the same error in different sessions: the step's deadline and the dose's figures set aside, the step's name kept
  const errKey = t => {
    const x = String(t).replace(/\s*خلال أول \d+ (دقائق|دقيقة|دقيقه)/g, '').replace(/\s*\([^)]*\)/g, '');
    return (/\d/.test(x) ? x.split(':')[0] : x).trim();
  };
  const caseOf = h => String(h.caseId || '').replace(/^er_/, '').replace(/_n$/, '');
  const titleOf = h => String(h.caseTitle || 'حالة').replace(/^غرفة الطوارئ( \(دور التمريض\))? · /, '');
  function coachData(u) {
    const runs = ((u && u.history) || []).filter(h => h && /^er_/.test(h.caseId || '') && typeof h.num === 'number');
    if (!runs.length) return null;
    const avg = a => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
    const recent = avg(runs.slice(0, 3).map(h => h.num)), before = avg(runs.slice(3, 6).map(h => h.num));
    const axes = {};
    runs.filter(h => Array.isArray(h.axes)).forEach(h => h.axes.forEach(x => { const a = axes[x.label] = axes[x.label] || { k: x.k, v: [] }; a.v.push(x.pts / x.max); }));
    const ax = Object.entries(axes).map(([label, a]) => ({ label, k: a.k, pct: Math.round(a.v.reduce((x, y) => x + y, 0) / a.v.length * 100) })).sort((a, b) => a.pct - b.pct);
    const errs = {};
    runs.forEach(h => {
      const d = h.detail || {};
      [...(h.critical || []), ...(d.major || []), ...(d.minor || []), ...(d.hand || []).filter(x => !x.ok).map(x => 'التسليم بلا: ' + x.label)]
        .forEach(t => { const k = errKey(t); errs[k] = (errs[k] || 0) + 1; });
    });
    const top = Object.entries(errs).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const weak = ax[0] || null;
    const errTip = top.length ? (COACH_ERR.find(([re]) => re.test(top[0][0])) || [])[1] : null;
    const tip = errTip || (weak && (COACH_TIP[weak.k] || (/تقييم|متابعة/.test(weak.label) ? COACH_TIP.assess : /تسليم|SBAR/.test(weak.label) ? COACH_TIP.hand : /تواصل/.test(weak.label) ? COACH_TIP.team : COACH_TIP.safe))) || COACH_TIP.safe;
    const latest = {};
    runs.forEach(h => { const c = caseOf(h); if (!(c in latest)) latest[c] = h; });
    const lowest = Object.values(latest).sort((a, b) => a.num - b.num)[0];
    return { runs, last: runs.slice(0, 6).reverse(), avg: avg(runs.map(h => h.num)), recent, before, weak, ax, top, tip, lowest };
  }
  window.NabdCoachData = Object.freeze({ data: coachData, titleOf, caseOf });
  /* ---------- the gap (D-46): read from the record; the prototype names the elderly when they are the weak spot ---------- */
  const AGE = { asthma: 23, sepsis: 74, pe: 34, stemi: 58, dka: 19, htn: 71, hyperk: 66 };
  function gapOf(u) {
    const runs = ((u && u.history) || []).filter(h => h && /^er_/.test(h.caseId || '') && typeof h.num === 'number');
    const caseOf = h => String(h.caseId).replace(/^er_/, '').replace(/_n$/, '');
    const elder = runs.filter(h => (AGE[caseOf(h)] || 0) >= 65);
    const weak = elder.filter(h => h.num < 70 || (h.critical || []).length);
    if (weak.length >= 2) return { drill: 'elderly', title: 'كبار السن مع سكري وضغط', why: `في ${weak.length} جلسات مع مرضى كبار بالسن كانت نتيجتك دون المطلوب.` };
    if (weak.length === 1) return { drill: 'elderly', title: 'كبار السن مع سكري وضغط', why: 'في جلسة مع مريض كبير بالسن ظهر خطأ أساسي.' };
    return null;
  }
