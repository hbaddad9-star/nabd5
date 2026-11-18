  // (chat check 2026-11-08) A history question the case has no line for. Asked about the complaint he came with, he says
  // it again; asked about another symptom or habit, he gives a standardized patient's plain «no», the same rule the online
  // patient voice follows (api/er-chat.js planPatient). A positive finding is never made up.
  const NO_TOPICS = [
    [/كحول|مشروب|(?:^| )خمر|(?:^| )بيره(?: |$)|نبيذ|alcohol/, 'لا… لا أشرب.', 'لا، لا يشرب.', 'لا، لا تشرب.'],
    [/عمليه|عمليات|جراحه|operation|surgery/, 'لا… لم أجرِ عمليات.', 'لا، لم يجرِ عمليات.', 'لا، لم تجرِ عمليات.'],
    [/استفراغ|(?:^| )بتستفرغ\S*|استفرغت\S*|ترجيع|غثيان|(?:^| )لايع(?:ه)?(?: |$)|vomit/, 'لا… لم أتقيأ.', 'لا، لم يتقيأ.', 'لا، لم تتقيأ.'],
    [/حراره|سخونه|(?:^| )(?:سخن\S*|مسخن\S*|مولع\S*)|(?:^| )حمي(?: |$)|fever/, 'لا… لم أشعر بارتفاع في الحرارة.', 'لا، لم يشعر بارتفاع في الحرارة.', 'لا، لم تشعر بارتفاع في الحرارة.'],
    [/كحه|(?:^| )بتكح\S*|(?:^| )بتسعل\S*|سعله|سعال|بلغم|cough/, 'لا… لا يوجد سعال.', 'لا، لا يسعل.', 'لا، لا تسعل.'],
    [/هيك قبل|قبل هيك|(?:صار|صاير) (?:معك|معه|معها) هيك|صارلك هيك|صارله هيك|صارلها هيك|اجاك هيك|اول مره/, 'لا… هذه أول مرة يحدث لي هذا.', 'لا، هذه أول مرة يحدث له هذا.', 'لا، هذه أول مرة يحدث لها هذا.'],
    [/بالعيله|العيله|عيلتك|حدا من اهل|اهلك عندهم|وراثي|family/, 'لا… لا أعرف أحداً في العائلة يعاني من هذا.', 'لا، لا يوجد أحد في العائلة يعاني من هذا.', 'لا، لا يوجد أحد في العائلة يعاني من هذا.'],
  ];
  function plainNo(read, t) {
    if (NM() || read.typedOrder || read.actions.length || read.tests.length || read.exam.length) return null;
    if (!/[؟?]/.test(read.text || '') && wordsIn(t) > 5) return null;
    const c = E.c, op = norm(c.patient.opening);
    if (read.to !== 'companion' && /نفس/.test(op) && /(?:^| )(?:نفسك|نفسها|نفسه|بتتنفس\S*|تتنفس\S*|مخنوق\S*|بتلهث\S*)(?: |$)|ضيق (?:ب)?(?:ال)?نفس|ضيقه نفس/.test(t)) { read.to = 'patient'; return 'آه... ' + c.patient.opening; }
    const hit = NO_TOPICS.find(([re]) => re.test(t));
    if (!hit) return null;
    // A patient who cannot give his own history (the confused man in sepsis) is spoken for by his relative.
    const byComp = read.to === 'companion' || c.facts.filter(f => f.who === 'companion').length * 2 > c.facts.length;
    read.to = byComp ? 'companion' : 'patient';
    return byComp ? (c.patient.sex === 'F' ? hit[3] : hit[2]) : hit[1];
  }
  function statusLine(read) {
    const sp = id => SPOKEN[id] || (actOf(id) || {}).ar || '', v = E.show || live();
    if (read.statusAll) {
      const given = [...E.done.keys()].filter(id => (actOf(id) || {}).dose);
      const open = [E.pending, ...E.queue.map(q => q[0]), ...(E.parked || [])].filter(q => q && q.type === 'dose').map(spk);
      const rest = open.length ? ' ' + [...new Set(open)].join(' و') + ' ما زلتُ بانتظار قرارك بشأنها.' : '';
      return given.length ? `أعطيت${hisHer()} ${given.map(id => sp(id) + (E.done.get(id).dose ? ' ' + E.done.get(id).dose : '')).join('، و')}.${rest}` : `لم أعطِ${hisHer()} أي دواء حتى الآن.${rest || ' أخبرني بما تريد.'}`;
    }
    const id = read.statusOf, d = E.done.get(id), q = openFor(id);
    if (id === 'oxygen' && d) return `${E.c.patient.sex === 'F' ? 'تتلقى' : 'يتلقى'} أكسجين ${d.dose || ''}، والـSpO2 ${Math.round(v.spo2)}%.`.replace(/ ،/, '،');
    if (d) return `${sp(id)} ${id === 'fluids' ? 'علّقتها' : 'أعطيته'}${d.dose ? ' (' + d.dose + ')' : ''} ${agoSaid(d.at)}.`;
    if (E.harmed.has(id)) return `${sp(id)} أعطيته كما طلبت.`;
    if (q) { read.reopen = q; read.clarify = true; return `${sp(id)} لم ${id === 'oxygen' ? 'أركّبه' : 'أعطِه'} بعد${id === 'oxygen' ? '، والـSpO2 ' + Math.round(v.spo2) + '%' : ''}. ${q.sug ? 'أقترح ' + shortTip(q) + '، هل توافق؟' : 'كم تريد؟'}`; }
    read.offerAct = id;
    return id === 'oxygen' ? `${E.c.patient.sex === 'F' ? 'لا تتلقى' : 'لا يتلقى'} أكسجين، والـSpO2 ${Math.round(v.spo2)}%. هل أبدأ بإعطائه؟` : `${sp(id)} لم نبدأ به بعد. هل تريد${fem(sp(id)) ? 'ها' : 'ه'} الآن؟`;
  }
  // (chat check 2026-11-08) The same judgement for the nurse's «طمنيني عنه», so she never contradicts the patient.
  const monitorLine = () => `المونيتور مركَّب منذ أن ${E.c.patient.sex === 'F' ? 'وصلت' : 'وصل'}: ${spokenVitals()}.`;
  // «طمنيني عنه» / «شو وضعه؟»: the numbers on the monitor and which way he is going.
  const howLine = () => { const came = E.c.patient.sex === 'F' ? 'وصلت' : 'وصل', tr = trendNow(); return `${spokenVitals()}. ${tr === 'better' ? 'أفضل قليلاً منذ أن ' + came : tr === 'worse' ? 'أسوأ منذ أن ' + came + '، ويجب أن نتحرك' : 'لا تغيّر يُذكر منذ أن ' + came}.`; };
  const trendNow = () => { const c = E.c; if (E.stage >= 2) return 'worse'; if (E.betterTurn != null || E.saidBy.size > 0 || E.improved > 0 || E.risk <= c.risk.start - 8) return 'better'; return E.stage === 1 || E.risk >= c.risk.start + 6 ? 'worse' : 'same'; };
  // How the patient feels now, from what the room has done: worse, better, or the same.
  function feelNow() {
    const c = E.c;
    if (E.stage >= 2) return pickOf(((c.stageLines[STAGES[E.stage]] || {}).patient) || ['...']);
    const better = E.betterTurn != null || E.saidBy.size > 0 || E.improved > 0 || E.risk <= c.risk.start - 8;
    if (better) { const by = c.improveBy || {}, own = [...E.saidBy].map(id => by[id]).filter(Boolean); const pool = own.length ? own : (c.improve || []); return pickOf(pool.length ? pool : ['أفضل قليلاً…']); }
    if (E.stage === 1 || E.risk >= c.risk.start + 6) return pickOf(((c.stageLines.watch || {}).patient) || ['أسوأ قليلاً يا دكتور…']);
    return 'ما زلتُ كما أنا يا دكتور… لم أشعر بفرق.';
  }
  function patLine(k) {
    const p = E.c.patient, nm = String(p.name);
    if (k === 'feel') return feelNow();
    // A confused patient answers as the case wrote him.
    const orient = E.c.facts.find(f => f.id === 'orient');
    if (orient && k !== 'age') { E.facts.add('orient'); return orient.say; }
    const name = /^(?:الحاج|الحاجه|الحاجة|ابو|أبو|ام|أم) /.test(nm) ? `أنا ${nm.replace(/^الحاج[ةه]? /, '')}...` : `${nm.split(' ')[0]}... ${nm}.`;
    if (k === 'name') return name;
    if (k === 'name_where') return name + ' وأنا هنا في المستشفى… في الطوارئ.';
    if (k === 'age') return `${p.age} سنة...`;
    return 'في المستشفى… في الطوارئ.';
  }
