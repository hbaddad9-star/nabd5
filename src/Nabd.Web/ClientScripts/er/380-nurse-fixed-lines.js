  /* ---------- nurse mode: the doctor's and the instructor's lines (fixed) ---------- */
  const DX_Q = /(?:شو (?:عنده|عندها|التشخيص)|تشخيص|diagnos)/;
  function docLine(read, t) {
    const N = E.nurse, X = N.esc, c = E.c;
    const ordIds = N.orders.filter(o => !o.cancelled).map(o => o.id);
    const ment = (read.mentioned || mentionedIds(t)).filter(id => !NURSE_OWN.has(id));
    let line;
    // An allergy statement is heard as one, even when it names a drug ("عنده حساسية من البنسلين").
    if (ALLERGY_W.test(t)) line = 'حسناً.';
    else if (DX_Q.test(t)) {
      const g = N.nm.dxAfter, dx = fell() && c.collapse && c.collapse.dx ? c.collapse.dx : g.text;
      line = reached() && (!g.gate || (E.tests[g.gate] && E.tests[g.gate].back)) ? 'الأرجح ' + dx + '.' : 'التشخيص ما زال قيد التقييم.';
    } else if (/(?:^| )(?:تعال|تعالي|بسرعه|شوفها|شوفه|محتاجك|بحتاجك)(?: |$)/.test(t) && !read.readBack && !ment.length) {
      if (N.present) line = 'أنا هنا.';
      else { line = comes() + '.'; later(0.2, doctorArrives); }
    } else if (read.readBack || ment.some(id => ordIds.includes(id))) line = 'نعم، كما اتفقنا.';
    else if (ment.length) {
      const id = ment[0], care = c.care[id], res = c.results[id];
      const bad = testOf(id) && !actOf(id) ? !res || res.ind === 'no' || res.ind === 'harm' : !care || care.harm || care.off;
      line = bad ? 'لا، هذا غير مناسب الآن.' : 'لننجز الأوامر التي اتفقنا عليها أولاً.';
    } else if (/(?:شو (?:بدك|اعمل|نعمل|الخطه|كمان بدك)|في اشي تاني|شو الاوامر|اوامر)/.test(t)) {
      const open = N.orders.filter(openOrd);
      line = open.length ? 'ما زلتُ أريد: ' + open.map(o => o.ar).join('، و') + '.' : 'حسناً، تابع وراقب.';
    } else if (/\d/.test(digits(t)) || /(صار|تغير|نزل|طلع|بتسوء|ساء|تدهور|اسوا|احسن|تحسن)/.test(t)) {
      if (X.reNeeded !== null && X.updateAt === null) X.updateAt = E.sim;
      line = 'حسناً، تابع وراقب، وأخبرني إن تغيّر شيء.';
    } else if (N.allergyAskedByDoc && !N.allergyAnswered && !N.allergyToldDoc) line = 'حسناً. وهل توجد حساسية من أدوية؟';
    else line = 'حسناً، ماذا أيضاً؟';
    docSay(line);
  }
  function instructorLine(read, t) {
    const named = [...new Set([...(read.named || []), ...mentionedIds(t)])];
    const toDoc = E.nurse.sex === 'F' ? 'للدكتورة' : 'للدكتور';
    if (read.whichDrug) return 'أي دواء بالضبط؟ الأوامر المفتوحة: ' + read.whichDrug.join('، و') + '.';
    if (read.suggested && read.suggested.length) return reached() ? 'اقتراح منطقي، أبلغه ' + toDoc + '.' : 'اقتراح منطقي، أبلغه ' + toDoc + ' ضمن الـR في الـSBAR.';
    if (read.planOnly) return 'صحيح، الأدوية تُعطى بأمر. ماذا تستطيع أن تفعل الآن ضمن صلاحيتك؟';
    if (DX_Q.test(t)) return 'التشخيص من مهام ' + docW() + '. ماذا ترى أنت في الأرقام وفي المريض؟';
    const drug = named.find(id => isDrug(id) || (actOf(id) && DOCTOR_ONLY.has(id)));
    if (drug) return actOf(drug).ar + ' يحتاج إلى أمر طبيب. إن رأيته لازماً، فاقترحه على ' + (E.nurse.sex === 'F' ? 'الدكتورة' : 'الدكتور') + ' ضمن الـR في الـSBAR.';
    if (named.some(id => NURSE_OWN.has(id) || id === 'oxygen' || NURSE_TESTS.has(id))) return 'هذا ضمن صلاحيتك. نفّذه وراقب الاستجابة.';
    const T = ['ما أهم رقم على المونيتور الآن، وماذا يعني في الـABCDE؟', 'قبل أي دواء: هل سألت عن الحساسية والأدوية؟', 'بعد كل تدخل: ماذا تغيّر في الأرقام؟', 'إذا أردت إبلاغ ' + docW() + ' الآن: ما الـS والـB والـA والـR؟', 'ماذا تستطيع أن تفعل بنفسك ضمن البروتوكول، وماذا يحتاج إلى أمر؟'];
    return T[E.nurse.teachAt++ % T.length];
  }

