  // Offline, the nurse says what she sees and what nurses start with, reads a result's numbers, and asks what is wanted.
  function nurseLine(read, t) {
    const v = E.show || live(), c = E.c;
    const asked = D.tests.filter(x => hasAny(t, x.kw) && E.tests[x.id] && E.tests[x.id].back).map(x => x.id);
    if (asked.length) return asked.map(id => resultBrief(id)).join(' ');
    if (/(?:شو (?:ب)?رايك|نبدا|ابدا|شو نعمل|من وين)/.test(t)) {
      const first = [];
      if (Math.round(v.spo2) < 94 && !E.done.has('oxygen')) first.push('الأكسجين');
      if (!E.done.has('iv_access')) first.push('الكانيولا');
      return `يا دكتور، الـSpO2 ${Math.round(v.spo2)}% والنبض ${Math.round(v.hr)}.${first.length ? ' عادةً نبدأ بـ' + first.join(' و') + '، ' : ' '}ما الذي تطلبه؟`;
    }
    if (/(?:حجم|غيج|gauge|g )/.test(t) && /(?:كانيولا|كانولا|كنيولا|cannula)/.test(t)) return 'غيج 18 على الأقل، حجم كافٍ للسوائل والدم. هل أركّبها؟';
    // (chat fix 2 2026-11-08) Doctor room: the temperature is said once measured, or offered.
    if (!NM() && /حراره|سخونه|(?:^| )temp/.test(t) && !/(?:ضغط|نبض|اكسجين|ارقام|spo2|sat)/.test(t)) { if (E.tempKnown) return `الحرارة ${E.c.temp.toFixed(1)}.`; read.offerAct = 'temp'; return 'لم أقس الحرارة بعد. هل أقيسها؟'; }
    if (VITALS_Q.test(t)) return spokenVitals() + '.';
    // (chat fix 2026-11-08) Doctor room: an order she could not place gets one precise question, never "what do I do?".
    if (!NM()) return read.typedOrder || /[؟?]/.test(read.text || '') ? unplacedReply(read, t) : wordsIn(t) <= 3 ? 'نعم يا دكتور؟' : 'حاضر يا دكتور، أراقبه.';
    return 'حسناً، ماذا تريد أن أفعل؟';
  }
  // An order the reader could not place: a drug is asked by name and dose, anything else by its name.
  const unplacedOrder = t => (doseIn(t) ? 'يا دكتور، ما اسم الدواء بالضبط؟ لم ألتقط الاسم.' : /(?:^| )[وف]?(?:[اتنب]?عط|حط|علق|ضيف|جيب|جهز|ابدا|بلش)\S*/.test(t) ? 'أي دواء بالضبط يا دكتور؟ أخبرني باسمه وجرعته.' : NM() ? 'يا دكتور، أخبرني باسم الإجراء أو الفحص بالضبط، وسأنفّذه الآن.' : 'لم ألتقط الطلب يا دكتور، ما اسمه بالضبط؟');
  // What the nurse says to an order-like message she cannot act on: never a promise she will not keep.
  function unplacedReply(read, t) {
    // «لو لسا واطي… جهزي نورأدرينالين»: a plan for later, held until the doctor says so.
    if (/(?:^| )(?:لو|اذا)(?: |$)/.test(t) && (read.named || []).length) return 'حاضر يا دكتور، سأجهّزه وأنتظر كلمتك.';
    if (/[؟?]/.test(read.text || '')) {
      if (/(?:فحص|افحص|اسمع|jvp|crackles|oedema|edema|تورم|air entry)/.test(t)) return 'الفحص بين يديك يا دكتور، وأنا معك.';
      if (NM()) return 'لستُ متأكدة يا دكتور، القرار لك.';
      // (chat fix 2 2026-11-08) A drug that would hurt him now gets her challenge, never «القرار إلك».
      const risky = (read.named || []).find(riskyNow);
      if (risky) return riskLine(risky);
      const nd = (read.named || []).find(id => (actOf(id) || {}).dose);
      if (nd) return `${actOf(nd).ar}؟ إذا أردت${fem(actOf(nd).ar) ? 'ها' : 'ه'} فأخبرني بالجرعة، وإن لم تكن متأكداً فاسأل المشرف.`;
      // (live check 2026-11-08) How he is, asked in words the reader missed: the monitor, never «سؤال للمشرف».
      if (/(?:^| )(?:وضعه|وضعها|حالته|حالتها|كيفه|كيفها|كيفو|طمنيني|طمنوني|طمني|تحسن|تحسنت|اتحسن|اتحسنت|اسوا|(?:هو|هي) (?:منيح|منيحه|احسن))(?: |$)/.test(t)) { read.to = 'nurse'; return howLine(); }
      return 'هذا سؤال للمشرف يا دكتور. وإن أردت أن أفعل شيئاً فأخبرني باسمه.';
    }
    if (/(?:^| )[وف]?(?:[اتنب]?عط|حط|علق|ضيف|ركب|جيب|جهز|اسحب|ابعت|اطلب|قيس|شغل|ابدا|بلش|اعمل|بدي)\S*/.test(t) || /[a-z]{2,}/.test(t)) return unplacedOrder(t);
    if (NM()) return 'حاضر يا دكتور.';
    // (chat fix 2 2026-11-08) Never «حاضر» for nothing: a dose alone asks of which drug; anything else asks its name.
    const dz = doseIn(read.text || '');
    if (dz) return `${dz} من أي دواء يا دكتور؟`;
    return 'لم ألتقط الطلب يا دكتور. ما اسم الدواء أو الفحص؟';
  }
  // (chat fix 2 2026-11-08) A drug that would harm this patient now: a trap of the case, or too early by the numbers.
  const riskyNow = id => { const care = E.c.care[id]; if (!care) return !!(actOf(id) || {}).risky; return !!(care.harm || (care.stableHarm && tooEarly(care))); };
  const riskLine = id => { const care = E.c.care[id] || {}, ar = (actOf(id) || {}).ar || ''; const ch = care.harm ? care.challenge : care.stableHarm && care.stableHarm.challenge; return (ch || `يا دكتور، ${ar}؟ ما الاستطباب هنا؟`).replace(/\s*(?:هل أنت )?متأكد[ةه]?؟\s*$/, '') + ' لن أجهّزه قبل أن يوافق المشرف.'; };
  // A name with a dose that no drug in the room has: the nurse says she does not know it.
  const KNOWN_W = /^(?:اعط\S*|عط\S*|حط\S*|علق\S*|ضيف\S*|جيب\S*|جهز\S*|ابدا\S*|بلش\S*|ركب\S*|اسحب\S*|ابعت\S*|اطلب\S*|بدي|بدنا|لازم|كمان|هسا|هلا|فورا|حالا|stat|وريد\S*|بالوريد|عضل\S*|بالعضل|تحت|الجلد|جلد|فموي|بالفم|iv|im|sc|po|حقنه|ابره|حبه|حبوب|مل|ملغ|mg|ml|mcg|ميكرو\S*|غرام|وحده|وحدات|units?|يا|سستر|دكتور|المريض|المريضه|للمريض|للمريضه|بسرعه|ببطء|دقيقه|دقايق|ساعه|bolus|بولس|مره|كمان|تسريب|نقط|بالساعه|الساعه|لكل|كيلو|بالكيلو|طيب|ماشي|اوكي|infusion|drip|دلوقتي|الحين|هلا|هسا)$/;
  const unknownName = t => { const w = t.split(' ').map(x => (x.length > 4 ? x.replace(/^[وبلف](?=\S{4})/, '') : x)).filter(x => x && !/\d/.test(x) && x.length >= 5 && !/^لل/.test(x) && !KNOWN_W.test(x) && !norm(E.c.nurse.name).split(' ').includes(x) && !norm(E.c.patient.name).split(' ').includes(x) && !D.actions.some(a => hasAny(x, a.kw)) && !D.tests.some(a => hasAny(x, a.kw))); return w.length === 1 ? w[0] : ''; };
