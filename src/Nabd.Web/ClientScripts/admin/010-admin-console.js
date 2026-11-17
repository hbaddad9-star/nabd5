/* The Nabd admin console (V6.7 prototype, 2026-11-14; docs/decisions/0015-admin-console-prototype.md).
   The owner asked for a control panel (institutions, users and roles, subscriptions, the case library, sources,
   rules, audit and settings) for the competition prototype, with no server work in this phase. Everything here
   runs in the browser, as the rest of the client does (ADR 0008): one more demo account ("admin", role "admin")
   opens #view-admin instead of the home; what the console changes is kept in this browser (localStorage
   "nabd_v2_admin") and is labelled as a demo environment. Nothing here reaches the rooms or their chat: the
   rules page keeps its changes as a draft awaiting approval and never feeds the scoring or the safety rules.
   The legacy client is not edited; two of its global functions are wrapped (showOnlySection, navigateTo).
   V6.7.1: the overview carries clinical quality indicators; each institution has its own page with a competency
   matrix. V6.7.3 (owner, 2026-11-15): there is no reviewer console. The medical reviewer tries a case in the room
   as any trainee does, before the platform is licensed; the admin records the reviewer's decision in the case file
   under the reviewer's name. */
(function () {
  'use strict';
  if (typeof DEMO_ACCOUNTS === 'undefined' || typeof navigateTo !== 'function' || typeof showOnlySection !== 'function') return;
  const root = document.getElementById('view-admin');
  if (!root) return;

  /* ---------- the account ---------- */
  DEMO_ACCOUNTS.admin = {
    id: 'admin', name: 'إدارة منصة نبض', initials: 'ن ب', email: 'admin@nabd.demo', uni: 'نَبْض الأردن',
    role: 'admin', roleNameAr: 'مدير المنصة', specialty: 'إدارة المنصة', roleLabel: 'مدير المنصة · لوحة التحكم',
    isDemo: true, stats: { completed: 0, avgSpec: '0%', avgEr: '0%' }, strengths: [], weaknesses: [], recommendations: [], history: []
  };
  if (typeof nb8RoleHint === 'function') {
    const legacyHint = nb8RoleHint;
    window.nb8RoleHint = u => (u && u.role === 'admin' ? 'لوحة التحكم: المؤسسات، المستخدمون، الاشتراكات، المحتوى والقوانين.'
      : u && u.role === 'uniadmin' ? 'لوحة الجامعة: المساقات والشعب، الكادر الأكاديمي، الطلاب والتقارير.'
      : u && u.role === 'professor' && u.org ? 'بوابة المشرف: شعبك، الواجبات، ونتائج طلابك.' : legacyHint(u));
  }
  const consoleRole = () => { try { const r = authState.isAuthenticated && authState.user && authState.user.role; return r === 'admin' || r === 'uniadmin' ? r : (r === 'professor' && authState.user.org ? 'professor' : ''); } catch (e) { return ''; } };
  const isAdmin = () => !!consoleRole();
  const me = () => (authState.user && authState.user.name) || 'إدارة منصة نبض';

  /* ---------- the view switch (wrapping the legacy globals; their own callers resolve them through window) ---------- */
  const legacyShow = showOnlySection, legacyNav = navigateTo;
  window.showOnlySection = function (viewId) {
    legacyShow(viewId);
    const on = viewId === 'admin';
    root.classList.toggle('hidden', !on);
    document.body.classList.toggle('nbx-admin', on);
    document.getElementById('site-footer')?.classList.toggle('hidden', on || ['sim', 'nurse', 'observe', 'resp', 'er'].includes(viewId));
    if (on) render();
    else { closeDrawer(); lastShown = ''; }
    paintAnnouncement();
    if (viewId === 'home') setTimeout(homeMotion, 200);
  };
  window.navigateTo = function (viewId, options) {
    if (viewId === 'admin' && !isAdmin()) viewId = (authState && authState.isAuthenticated) ? 'home' : 'index';
    else if (viewId === 'home' && isAdmin()) viewId = 'admin';
    /* V6.7.6: a student's assignments live on her home (the legacy portal shows its own old sections) */
    else if (viewId === 'university' && authState && authState.isAuthenticated && authState.user && authState.user.role === 'student') {
      const r = legacyNav('home', options);
      setTimeout(() => { const sec = document.getElementById('home-student-uni-section'); if (sec) window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - 84, behavior: 'smooth' }); }, 350);
      return r;
    }
    return legacyNav(viewId, options);
  };

  /* ---------- helpers ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n = v => Number(v || 0).toLocaleString('en-US');
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const day = iso => { try { return new Date(iso).toLocaleDateString('ar-JO-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return iso; } };
  const stamp = iso => { try { return new Date(iso).toLocaleString('ar-JO-u-nu-latn', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; } };
  const daysTo = iso => Math.round((new Date(iso) - new Date()) / 864e5);
  const uid = p => p + '-' + Math.random().toString(36).slice(2, 7);
  const toast = t => { try { showToast(t); } catch (e) {} };

  const ICONS = {
    overview: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z"/>',
    unis: '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-5h6v5M9 12h.01M15 12h.01"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2"/>',
    subs: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
    cases: '<path d="M8 4h8M9 2h6v4H9zM6 4H5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-1M8 11h8M8 15h5"/>',
    sources: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2v.5A1.5 1.5 0 0 0 5.5 22H20M8 7h8M8 11h5"/>',
    rules: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6zM9 12l2 2 4-4"/>',
    audit: '<path d="M12 8v4l3 2M3.05 11a9 9 0 1 1 .5 4M3 4v7h7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    arrow: '<path d="M15 6l-6 6 6 6"/>',
    back: '<path d="M9 6l6 6-6 6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    alert: '<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    cube: '<path d="m12 2 9 5v10l-9 5-9-5V7zM12 22V12M21 7l-9 5-9-5"/>',
    pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>'
  };
  const ic = (name, size) => `<svg class="nbx-ic" width="${size || 18}" height="${size || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  const chip = (text, tone) => `<span class="nbx-chip nbx-chip-${tone || 'muted'}">${esc(text)}</span>`;

  /* ---------- the demo data (kept in this browser) ---------- */
  const KEY = 'nabd_v2_admin';
  const PLANS = {
    uni: { name: 'الباقة الجامعية', who: 'كليات الطب والتمريض', price: 'حسب عدد المقاعد · سنوي', has: ['غرفة الطوارئ والغرف التخصصية', 'البوابة الجامعية وإسناد الواجبات', 'تقارير الأداء ولوحة المشرف', 'دعم التهيئة للكلية'] },
    org: { name: 'باقة المستشفيات', who: 'الممارسون وبرامج التعليم المستمر', price: 'حسب عدد الممارسين · سنوي', has: ['غرفة الطوارئ', 'سجل تدريب لكل ممارس', 'تقارير للإدارة التمريضية'] },
    trial: { name: 'فترة تجريبية', who: 'مؤسسة تقيّم المنصة', price: '30 يوماً دون التزام', has: ['غرفة الطوارئ', 'حتى 50 مقعداً', 'تقرير استخدام في نهاية الفترة'] }
  };
  const ROLES = { admin: 'مدير المنصة', uniadmin: 'مدير مؤسسة', professor: 'مشرف / أستاذ', reviewer: 'مراجع طبي', editor: 'محرّر محتوى سريري', student: 'طالب', practitioner: 'ممارس' };
  const STATUS = { active: ['نشط', 'ok'], trial: ['فترة تجريبية', 'info'], pending: ['بانتظار التوقيع', 'warn'], suspended: ['موقوف', 'bad'] };
  const INVOICE = { paid: ['مدفوعة', 'ok'], due: ['مستحقة', 'warn'], late: ['متأخرة', 'bad'], none: ['لا يوجد', 'muted'] };
  const DISPO = { icu: 'العناية الحثيثة', hdu: 'مراقبة عالية', cath: 'القسطرة', ward: 'طابق عادي', home: 'البيت' };
  const SAFETY = [
    { id: 'allergy', name: 'منع دواء يتحسس منه المريض', note: 'تتوقف الممرضة وتسأل قبل التنفيذ' },
    { id: 'offcase', name: 'السؤال عن أمر دون استطباب', note: 'أمر لا يخطط له ملف الحالة' },
    { id: 'dose', name: 'التحقق من الجرعة ووحدتها', note: 'جرعة خاطئة تُحسب في الخصومات' },
    { id: 'escalate', name: 'تصعيد الممرضة عند التأخر', note: 'تنبيه إذا تأخر إجراء حرج عن وقته' }
  ];
  const FEATURES = [
    { id: 'er', name: 'غرفة الطوارئ', note: 'مفتوحة للطلاب' },
    { id: 'uni', name: 'البوابة الجامعية', note: 'الواجبات والتقارير' },
    { id: 'coach', name: 'المدرب السريري', note: 'تدريب على نقاط الضعف' },
    { id: 'specialty', name: 'الغرف التخصصية', note: 'قيد الإعداد' },
    { id: 'or3d', name: 'غرف العمليات ثلاثية الأبعاد', note: 'قريباً' }
  ];
  /* V6.9: the doctor's rubric the room applies in its realism mode (docs/agent/er-agent.ar.md) */
  const WEIGHTS = [
    { id: 'safe', name: 'السلامة والإجراءات الحرجة في وقتها', v: 35 },
    { id: 'dx', name: 'التشخيص', v: 10 },
    { id: 'tests', name: 'الفحوصات ومبرراتها', v: 10 },
    { id: 'hist', name: 'التقييم وإعادة التقييم', v: 15 },
    { id: 'comm', name: 'التواصل والفريق (الأهل، طلب المساعدة، المقاطعات)', v: 15 },
    { id: 'hand', name: 'التسليم والوجهة', v: 15 }
  ];
  const OLD_WEIGHTS = { safe: 40, dx: 15, tests: 15, hist: 10, comm: 10, hand: 10 };
  const PENALTIES = [
    { id: 'harm', name: 'إجراء ضار بالمريض', v: 10 },
    { id: 'dose', name: 'جرعة خاطئة (حتى 9 نقاط)', v: 3 },
    { id: 'unneeded', name: 'فحص دون استطباب', v: 2 },
    { id: 'dispo', name: 'مكان خاطئ للمريض', v: 10 }
  ];
  const ago = (d, h) => new Date(Date.now() - (d * 24 + (h || 0)) * 36e5).toISOString();
  const ahead = d => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
  const rulesSeed = () => ({
    weights: Object.fromEntries(WEIGHTS.map(w => [w.id, w.v])),
    penalties: Object.fromEntries(PENALTIES.map(p => [p.id, p.v])),
    safety: Object.fromEntries(SAFETY.map(s => [s.id, true])),
    session: { minutes: 20, osce: false, hints: true, attempts: 2, dialect: 'jo' },
    features: { er: true, uni: true, coach: true, specialty: false, or3d: false }
  });
  const reviewSeed = () => ({
    asthma: { reviewer: 'د. سلمى الخطيب', at: ago(1, 3), status: 'assigned' },
    stemi: { reviewer: 'د. سلمى الخطيب', at: ago(0, 6), status: 'assigned' },
    pe: { reviewer: 'د. يوسف الحمود', at: ago(2, 2), status: 'assigned' }
  });
  const assignSeed = () => [
    { id: 'a1', org: 'ju', cohort: 'تمريض الطوارئ · شعبة 1', caseId: 'asthma', due: ahead(2), at: ago(0, 1), by: 'د. عبدالرحمن المجالي' },
    { id: 'a2', org: 'ju', cohort: 'تمريض الطوارئ · شعبة 1', caseId: 'stemi', due: ahead(3), at: ago(1, 4), by: 'عمادة كلية التمريض' },
    { id: 'a3', org: 'ju', cohort: 'طب الطوارئ · السنة الخامسة', caseId: 'sepsis', due: ahead(5), at: ago(2, 1), by: 'عمادة كلية التمريض' },
    { id: 'a4', org: 'just', cohort: 'المهارات السريرية', caseId: 'pe', due: ahead(6), at: ago(3, 2), by: 'كلية التمريض والطب' },
    { id: 'a5', org: 'hu', cohort: 'أساسيات التمريض السريري', caseId: 'asthma', due: ahead(4), at: ago(2, 5), by: 'أ. هالة الشريف' },
    { id: 'a6', org: 'sch', cohort: 'تمريض الطوارئ · تعليم مستمر', caseId: 'dka', due: ahead(9), at: ago(1, 7), by: 'إدارة التعليم التمريضي' }
  ];
  function seed() {
    return {
      v: 5,
      unis: [
        { id: 'ju', name: 'جامعة 1', type: 'جامعة', domain: 'uni1.edu.jo', plan: 'uni', seats: 200, used: 137, start: ahead(-260), end: ahead(105), status: 'active', invoice: 'paid', contact: 'عمادة كلية التمريض', cohorts: [['NUR-401', 'تمريض الطوارئ · شعبة 1', 38], ['NUR-401', 'تمريض الطوارئ · شعبة 2', 35], ['MED-512', 'طب الطوارئ · السنة الخامسة', 64]] },
        { id: 'just', name: 'جامعة 2', type: 'جامعة', domain: 'uni2.edu.jo', plan: 'uni', seats: 150, used: 100, start: ahead(-300), end: ahead(64), status: 'active', invoice: 'due', contact: 'كلية التمريض والطب', cohorts: [['NUR-430', 'التمريض الحرج · شعبة 1', 42], ['MED-540', 'المهارات السريرية', 58]] },
        { id: 'hu', name: 'جامعة 3', type: 'جامعة', domain: 'uni3.edu.jo', plan: 'uni', seats: 60, used: 47, start: ahead(-120), end: ahead(245), status: 'active', invoice: 'paid', contact: 'كلية التمريض', cohorts: [['NUR-322', 'أساسيات التمريض السريري', 47]] },
        { id: 'yu', name: 'جامعة 4', type: 'جامعة', domain: 'uni4.edu.jo', plan: 'trial', seats: 50, used: 39, start: ahead(-18), end: ahead(12), status: 'trial', invoice: 'none', contact: 'قسم التمريض', cohorts: [['NUR-210', 'مهارات تمريضية · تجريبي', 39]] },
        { id: 'sch', name: 'مستشفى 1', type: 'مستشفى', domain: 'hospital1.med.jo', plan: 'org', seats: 120, used: 86, start: ahead(-75), end: ahead(290), status: 'active', invoice: 'paid', contact: 'إدارة التعليم التمريضي', cohorts: [['CPD-ER', 'تمريض الطوارئ · تعليم مستمر', 86]] },
        { id: 'mu', name: 'جامعة 5', type: 'جامعة', domain: 'uni5.edu.jo', plan: 'uni', seats: 200, used: 0, start: ahead(20), end: ahead(385), status: 'pending', invoice: 'none', contact: 'كلية التمريض', cohorts: [] }
      ],
      users: [
        { id: 'u1', name: 'رنا المحاسنة', email: 'rana.m@uni2.edu.jo', role: 'student', org: 'just', status: 'active', seen: ago(0, 2) },
        { id: 'u2', name: 'زيد العبداللات', email: 'zaid.a@uni1.edu.jo', role: 'student', org: 'ju', status: 'active', seen: ago(0, 5) },
        { id: 'u3', name: 'أحمد السالم', email: 'ahmed.s@uni1.edu.jo', role: 'student', org: 'ju', status: 'active', seen: ago(1) },
        { id: 'u4', name: 'طارق العتيبي', email: 'tariq.rn@hospital1.med.jo', role: 'practitioner', org: 'sch', status: 'active', seen: ago(2) },
        { id: 'u5', name: 'د. عبدالرحمن المجالي', email: 'a.majali@uni1.edu.jo', role: 'professor', org: 'ju', status: 'active', seen: ago(0, 1) },
        { id: 'u6', name: 'د. سلمى الخطيب', email: 's.khatib@uni1.edu.jo', role: 'reviewer', org: 'ju', status: 'active', seen: ago(3) },
        { id: 'u7', name: 'د. يوسف الحمود', email: 'y.hamoud@uni3.edu.jo', role: 'reviewer', org: 'hu', status: 'active', seen: ago(6) },
        { id: 'u8', name: 'م. نور الدين قاسم', email: 'n.qasem@nabd.demo', role: 'editor', org: '', status: 'active', seen: ago(0, 3) },
        { id: 'u9', name: 'أ. هالة الشريف', email: 'h.sharif@uni3.edu.jo', role: 'uniadmin', org: 'hu', status: 'active', seen: ago(4) },
        { id: 'u10', name: 'لمى الرفاعي', email: 'lama.r@uni4.edu.jo', role: 'student', org: 'yu', status: 'pending', seen: '' },
        { id: 'u11', name: 'عمر البطاينة', email: 'omar.b@uni4.edu.jo', role: 'student', org: 'yu', status: 'pending', seen: '' },
        { id: 'u12', name: 'سارة الزعبي', email: 'sara.z@uni3.edu.jo', role: 'student', org: 'hu', status: 'pending', seen: '' },
        { id: 'u13', name: 'خالد المومني', email: 'k.momani@uni2.edu.jo', role: 'student', org: 'just', status: 'suspended', seen: ago(40) }
      ],
      review: reviewSeed(),
      assign: assignSeed(),
      drafts: [],
      sources: [
        { id: 's1', title: 'Global Strategy for Asthma Management and Prevention', org: 'GINA', year: 2024, cases: ['asthma'] },
        { id: 's2', title: 'Surviving Sepsis Campaign: International Guidelines', org: 'SCCM / ESICM', year: 2021, cases: ['sepsis'] },
        { id: 's3', title: 'Guidelines for the diagnosis and management of acute pulmonary embolism', org: 'ESC', year: 2019, cases: ['pe'] },
        { id: 's4', title: 'Guidelines for the management of acute coronary syndromes', org: 'ESC', year: 2023, cases: ['stemi'] },
        { id: 's5', title: 'The management of diabetic ketoacidosis in adults', org: 'JBDS-IP', year: 2023, cases: ['dka'] },
        { id: 's6', title: 'Guidelines for the diagnosis and treatment of acute and chronic heart failure', org: 'ESC', year: 2021, cases: ['htn'] },
        { id: 's7', title: 'Adult Advanced Cardiovascular Life Support', org: 'AHA', year: 2020, cases: ['asthma', 'sepsis', 'pe', 'stemi', 'dka', 'htn'] },
        { id: 's8', title: 'National Early Warning Score (NEWS2)', org: 'Royal College of Physicians', year: 2017, cases: [] }
      ],
      rules: rulesSeed(),
      rulesLive: rulesSeed(),
      rulesState: 'live',
      settings: { announce: false, announceText: 'تمت إضافة حالات جديدة إلى غرفة الطوارئ هذا الأسبوع.', maintenance: false, retention: '24' },
      requests: [
        { id: 'r1', kind: 'export', who: 'زيد العبداللات', at: ago(1), done: false },
        { id: 'r2', kind: 'delete', who: 'خالد المومني', at: ago(3), done: false }
      ],
      audit: [
        { at: ago(0, 1), who: 'د. عبدالرحمن المجالي', what: 'أسند حالة «نوبة ربو حادة» إلى شعبة تمريض الطوارئ 1', kind: 'content' },
        { at: ago(0, 4), who: 'إدارة منصة نبض', what: 'فعّل 12 مقعداً إضافياً لجامعة 2', kind: 'org' },
        { at: ago(1, 2), who: 'م. نور الدين قاسم', what: 'حدّث نص التسليم في حالة «الحماض الكيتوني»', kind: 'content' },
        { at: ago(2, 6), who: 'أ. هالة الشريف', what: 'أضافت شعبة «أساسيات التمريض السريري»', kind: 'org' },
        { at: ago(3, 1), who: 'إدارة منصة نبض', what: 'بدأت الفترة التجريبية لجامعة 4', kind: 'billing' },
        { at: ago(5, 3), who: 'إدارة منصة نبض', what: 'سجّل طلب حذف بيانات من مستخدم', kind: 'privacy' }
      ]
    };
  }
  let S;
  function load() {
    try {
      const raw = localStorage.getItem(KEY); const v = raw && JSON.parse(raw);
      /* version 4 (V6.7.4): the demo chain lives in one university; an older demo store starts again from the seed */
      if (v && v.v === 5) {
        S = v; /* V6.7.6: generic institution names */
        /* V6.9: a store still on the old default weights moves to the rubric the room applies now; edited weights stay */
        ['rules', 'rulesLive'].forEach(k => { if (S[k] && JSON.stringify(S[k].weights) === JSON.stringify(OLD_WEIGHTS)) S[k].weights = Object.fromEntries(WEIGHTS.map(w => [w.id, w.v])); });
        return;
      }
    } catch (e) {}
    S = seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function log(what, kind) {
    S.audit.unshift({ at: new Date().toISOString(), who: me(), what, kind: kind || 'system' });
    S.audit = S.audit.slice(0, 200);
    save();
  }
  load();

  /* the six ER cases are read from the application's own data document (the same file the room plays) */
  let CASES = null;
  function loadCases() {
    if (CASES) return Promise.resolve(CASES);
    return fetch('data/er-cases.json', { credentials: 'same-origin' }).then(r => r.json()).then(d => {
      CASES = (d.cases || []).map(c => ({
        id: c.id, dx: c.dx.ar, en: c.dx.en, patient: c.patient.name, age: c.patient.age, sex: c.patient.sex === 'F' ? 'أنثى' : 'ذكر',
        opening: c.patient.opening, arrival: c.patient.arrival, bed: c.bed, dispo: c.dispo, dispoWhy: c.dispoWhy,
        facts: (c.facts || []).length, exam: (c.exam || []).length, tests: Object.keys(c.results || {}).length,
        care: Object.keys(c.care || {}).length, stages: (c.stageLines && Object.keys(c.stageLines).length) || 0,
        reviewed: !!(c.reviewed === true || d.reviewed === true)
      }));
      return CASES;
    }).catch(() => (CASES = []));
  }
  const weekOf = back => { try { return new Date(Date.now() - back * 7 * 864e5).toLocaleDateString('ar-JO-u-nu-latn', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };
  const weekShort = back => { const d = new Date(Date.now() - back * 7 * 864e5); return d.getDate() + '/' + (d.getMonth() + 1); };
  const USAGE = { asthma: 412, stemi: 389, sepsis: 344, pe: 301, dka: 276, htn: 233 };
  /* clinical quality (demo figures for this environment; with the server they are computed from the sessions) */
  const DOMAINS = [
    { id: 'safe', name: 'السلامة والإجراءات الحرجة', v: 76 },
    { id: 'dx', name: 'التشخيص', v: 84 },
    { id: 'tests', name: 'الفحوصات', v: 79 },
    { id: 'hist', name: 'التقييم وإعادة التقييم', v: 71 },
    { id: 'comm', name: 'التواصل والفريق', v: 88 },
    { id: 'hand', name: 'التسليم والوجهة', v: 68 }
  ];
  const TARGET = 75;
  const PLATFORM_SCORE = Math.round(DOMAINS.reduce((a, d, j) => a + d.v * WEIGHTS[j].v, 0) / 100);
  const CASE_SHORT = { asthma: 'الربو الحاد', sepsis: 'الإنتان', pe: 'الانصمام الرئوي', stemi: 'احتشاء STEMI', dka: 'الحماض الكيتوني', htn: 'الطارئ الضغطي' };
  const ERRORS = [
    ['تسليم SBAR ناقص أو دون توصية', 21, -3, ''],
    ['تأخر الإجراء الحرج عن وقته', 17, -5, 'sepsis'],
    ['عدم السؤال عن الحساسية قبل الدواء', 13, 2, 'sepsis'],
    ['جرعة أو وحدة خاطئة', 11, -1, 'dka'],
    ['فحص دون استطباب', 9, -2, 'pe'],
    ['مكان خاطئ للمريض', 7, 0, 'pe']
  ];
  const CASE_Q = {
    asthma: [82, 91, '4.1', 'سالبيوتامول وأكسجين'], stemi: [77, 84, '9.5', 'أسبرين وتفعيل القسطرة'],
    sepsis: [74, 79, '38', 'مضاد حيوي وريدي'], pe: [71, 76, '22', 'مضاد تخثر'],
    dka: [79, 81, '31', 'سوائل وريدية'], htn: [80, 87, '12', 'نترات وريدية']
  };
  const band = v => (v >= 80 ? 'ok' : v >= 70 ? 'mid' : 'low');
  /* a repeatable pseudo-random stream per institution, so its demo figures stay the same between visits */
  const rng = seedStr => { let h = 2166136261; for (const ch of String(seedStr)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const WEEKS = [612, 704, 688, 823, 910, 1046, 1142, 1284];

  /* ---------- the console's own navigation ---------- */
  const PAGES = {
    overview: ['نظرة عامة', 'حالة المنصة اليوم: المؤسسات، الاستخدام، جودة التدريب، وما ينتظر قراراً.'],
    org: ['المؤسسة', ''],
    unis: ['المؤسسات والجامعات', 'سجل المؤسسات المتعاقدة: النطاق الجامعي، المقاعد، العقود والشعب.'],
    users: ['المستخدمون والأدوار', 'اعتماد التسجيلات، تعيين الأدوار، والإيقاف. كل دور يرى ما يخصه فقط.'],
    subs: ['الاشتراكات والباقات', 'الباقات المتاحة، وحالة كل اشتراك وتجديده وفاتورته.'],
    cases: ['مكتبة الحالات', 'كل حالة تمر بمسار: مسودة ← مراجعة طبية ← منشورة. يجرّب المراجع الحالة في الغرفة، وتُسجَّل نتيجته في ملف الحالة باسمه.'],
    sources: ['المصادر والمراجع', 'الإرشادات السريرية المرتبطة بالحالات، ومكتبة الوسائط وتراخيصها.'],
    rules: ['القوانين والقيود', 'أوزان التقييم، قواعد السلامة، إعدادات الجلسة، والأقسام المفعّلة. يبقى التعديل مسودة حتى يُعتمد.'],
    audit: ['سجل التدقيق', 'من غيّر ماذا ومتى. سجل لا يُحذف منه شيء.'],
    settings: ['إعدادات المنصة', 'الإعلانات، وضع الصيانة، وأدوات الخصوصية وحماية البيانات.']
  };
  const ROLE_PAGES = {
    admin: ['overview', 'unis', 'users', 'subs', 'cases', 'sources', 'rules', 'audit', 'settings', 'org'],
    /* the university's own administration (V6.7.2, admin/020-university-console.js): its courses, sections, staff,
       students, the cases it opens to its students out of the platform's library, its reports and its settings */
    uniadmin: ['uhome', 'ucourses', 'ustaff', 'ustudents', 'ulibrary', 'ureports', 'usettings'],
    /* the supervisor or course coordinator of a university (V6.7.4, admin/030-supervisor-console.js) */
    professor: ['shome', 'sassign', 'sstudents', 'sresults']
  };
  const PAGE_FN = { overview, org, unis, users, subs, cases, sources, rules, audit, settings };
  const allowed = p => (ROLE_PAGES[consoleRole()] || ROLE_PAGES.admin).includes(p);
  let page = 'overview', orgId = '', pageRole = '';
  try { const p = sessionStorage.getItem('nbx_page'); if (p && PAGES[p]) page = p; orgId = sessionStorage.getItem('nbx_org') || ''; pageRole = sessionStorage.getItem('nbx_role') || ''; } catch (e) {}
  const filters = { uni: 'all', uniQ: '', role: 'all', userQ: '', audit: 'all' };

  function go(p, id) {
    if (!PAGES[p]) return;
    page = p;
    if (p === 'org' && id) orgId = id;
    try { sessionStorage.setItem('nbx_page', p); sessionStorage.setItem('nbx_org', orgId); } catch (e) {}
    render();
    const main = document.getElementById('nbx-main');
    if (main) { main.scrollTop = 0; main.focus({ preventScroll: true }); }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function render() {
    if (root.classList.contains('hidden')) return;
    const u = authState.user || {};
    /* a different console account starts on its own first page (the review queue, or the overview) */
    if (consoleRole() !== pageRole) { pageRole = consoleRole(); page = (ROLE_PAGES[pageRole] || ROLE_PAGES.admin)[0]; try { sessionStorage.setItem('nbx_role', pageRole); sessionStorage.setItem('nbx_page', page); } catch (e) {} }
    if (!allowed(page)) page = (ROLE_PAGES[consoleRole()] || ROLE_PAGES.admin)[0];
    let theOrg = page === 'org' ? S.unis.find(x => x.id === orgId) : null;
    if (page === 'org' && !theOrg) page = 'unis';
    const title = theOrg ? theOrg.name : PAGES[page][0];
    const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
    set('nbx-user-name', u.name || '');
    set('nbx-user-role', u.roleNameAr || '');
    set('nbx-user-av', u.initials || '');
    set('nbx-title', title);
    const brandSmall = root.querySelector('.nbx-brand small');
    const consoleName = ({ uniadmin: 'لوحة الجامعة', professor: 'بوابة المشرف' })[consoleRole()] || 'لوحة التحكم';
    if (brandSmall) brandSmall.textContent = consoleName;
    const crumb = root.querySelector('.nbx-crumbs span');
    if (crumb) crumb.textContent = consoleRole() !== 'admin' && theOrg === null ? ((S.unis.find(x => x.id === (u.org || '')) || {}).name || consoleName) : consoleName;
    /* the rail shows only this role's pages, and a group's label only when one of its pages shows */
    root.querySelectorAll('.nbx-nav [data-nbx-go]').forEach(b => { b.hidden = !allowed(b.getAttribute('data-nbx-go')); });
    root.querySelectorAll('.nbx-nav .nbx-nav-group').forEach(g => {
      let el = g.nextElementSibling, any = false;
      while (el && !el.classList.contains('nbx-nav-group')) { if (!el.hidden) any = true; el = el.nextElementSibling; }
      g.hidden = !any;
    });
    const navKey = page === 'org' ? 'unis' : page;
    root.querySelectorAll('[data-nbx-go]').forEach(b => {
      const on = b.getAttribute('data-nbx-go') === navKey && b.closest('.nbx-nav');
      b.classList.toggle('is-on', !!on);
      if (b.closest('.nbx-nav')) b.setAttribute('aria-current', on ? 'page' : 'false');
    });
    const onNav = root.querySelector('.nbx-nav .is-on');
    if (onNav && window.innerWidth <= 960) { try { onNav.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {} }
    const counts = { cases: pendingReviews(), users: S.users.filter(x => x.status === 'pending').length };
    Object.assign(counts, extraCounts());
    root.querySelectorAll('[data-nbx-count]').forEach(el => { const c = counts[el.getAttribute('data-nbx-count')] || 0; el.textContent = c; el.hidden = !c; });
    const main = document.getElementById('nbx-main');
    if (!main) return;
    const sub = theOrg ? [theOrg.type, theOrg.domain, theOrg.contact].filter(Boolean).join(' · ') : (typeof PAGES[page][1] === 'function' ? PAGES[page][1]() : PAGES[page][1]);
    const head = `<div class="nbx-head"><div>${theOrg ? `<button type="button" class="nbx-back" data-nbx-go="unis">${ic('back', 15)}المؤسسات والجامعات</button>` : ''}<h1>${esc(title)}</h1><p>${esc(sub)}</p></div><div class="nbx-head-act" id="nbx-head-act"></div></div>`;
    main.innerHTML = head + '<div id="nbx-page" class="nbx-page"></div>';
    const body = document.getElementById('nbx-page'), act = document.getElementById('nbx-head-act');
    (PAGE_FN[page] || (b => { b.innerHTML = empty('جارٍ التحميل…'); }))(body, act, theOrg);
    labelTables(main);
    const shownKey = page + ':' + (theOrg ? theOrg.id : '') + ':' + consoleRole();
    if (shownKey !== lastShown) { lastShown = shownKey; motion(main); }
    const asof = document.getElementById('nbx-asof');
    if (asof) { try { asof.textContent = new Date().toLocaleDateString('ar-JO-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) {} }
  }

  /* ---------- motion (V6.7.5): on arriving at a page, its blocks rise into place as they come into view, figures
     count up to their value and bars fill. Only on arrival: a filter or a toggle on the same page redraws without
     moving. Off when the system asks for reduced motion, and without IntersectionObserver. ---------- */
  let lastShown = '', io = null;
  const reduceMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const BLOCKS = '.nbx-head, .nbx-kpi, .nbx-card, .nbx-plan, .nbx-flow, .nbx-chips, .nbx-section-t, .nbx-toolbar, .nbx-banner, .nbx-actions-bar';
  const FIGURES = '.nbx-kpi b, .nbx-flow b, .nbx-err-v b, .nbx-score, .nbx-comp b, .nbx-heat span, .nbx-col b, .nbx-plan footer b, .nbx-counts b';
  function countUp(el) {
    const node = [...el.childNodes].find(k => k.nodeType === 3 && /\d/.test(k.nodeValue));
    if (!node) return;
    const full = node.nodeValue, m = full.match(/^(\D*)(\d[\d,]*(?:\.\d+)?)([\s\S]*)$/);
    if (!m) return;
    const target = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length;
    if (!isFinite(target) || target <= 0) return;
    const fmt = v => (target >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(dec));
    const t0 = performance.now(), dur = 950;
    node.nodeValue = m[1] + fmt(0) + m[3];
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      node.nodeValue = p < 1 ? m[1] + fmt(target * e) + m[3] : full;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function prime(el) {
    el.querySelectorAll('.nbx-bar i, .nbx-comp-bar i').forEach(b => { if (b.dataset.w == null) { b.dataset.w = b.style.width; b.style.width = '0%'; } });
    el.querySelectorAll('.nbx-col i').forEach(b => { if (b.dataset.h == null) { b.dataset.h = b.style.height; b.style.height = '0%'; } });
  }
  function fill(el) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.querySelectorAll('[data-w]').forEach(b => { b.style.width = b.dataset.w; delete b.dataset.w; });
      el.querySelectorAll('[data-h]').forEach(b => { b.style.height = b.dataset.h; delete b.dataset.h; });
    }));
  }
  /* the signed-in home (V6.7.6): its blocks already rise with the legacy reveal; here its training fields come in
     one after another and its figures count up, once per arrival */
  let homeIO = null;
  function homeMotion() {
    const home = document.getElementById('view-home');
    if (!home || home.classList.contains('hidden') || reduceMotion() || !('IntersectionObserver' in window)) return;
    if (homeIO) homeIO.disconnect();
    const cards = [...home.querySelectorAll('#home-fields9 li')].filter(el => el.offsetParent);
    const figures = [...home.querySelectorAll('.font-num')].filter(el => el.offsetParent && /\d/.test(el.textContent));
    homeIO = new IntersectionObserver(entries => {
      entries.filter(en => en.isIntersecting).forEach((en, i) => {
        const el = en.target;
        homeIO.unobserve(el);
        if (el.classList.contains('nbh-rv')) { el.style.transitionDelay = Math.min(i, 8) * 55 + 'ms'; el.classList.add('is-in'); setTimeout(() => { el.style.transitionDelay = ''; }, 1100); }
        else countUp(el);
      });
    }, { rootMargin: '0px 0px -4% 0px', threshold: 0.1 });
    cards.forEach(el => { el.classList.add('nbh-rv'); el.classList.remove('is-in'); homeIO.observe(el); });
    figures.forEach(el => homeIO.observe(el));
  }
  function motion(scope) {
    if (io) { io.disconnect(); io = null; }
    if (reduceMotion() || !('IntersectionObserver' in window)) return;
    const blocks = [...scope.querySelectorAll(BLOCKS)].filter(el => !el.parentElement.closest('.nbx-rv'));
    io = new IntersectionObserver(entries => {
      entries.filter(en => en.isIntersecting).forEach((en, i) => {
        const el = en.target;
        io.unobserve(el);
        el.style.transitionDelay = Math.min(i, 6) * 60 + 'ms';
        el.classList.add('is-in');
        fill(el);
        el.querySelectorAll(FIGURES).forEach(countUp);
        setTimeout(() => { el.style.transitionDelay = ''; }, 1100);
      });
    }, { rootMargin: '0px 0px -4% 0px', threshold: 0.06 });
    blocks.forEach(el => { el.classList.add('nbx-rv'); prime(el); io.observe(el); });
  }
  /* every cell carries its column's name, so a table can read as stacked records on a phone */
  function labelTables(scope) {
    scope.querySelectorAll('.nbx-table').forEach(t => {
      const heads = [...t.querySelectorAll('thead th')].map(th => (th.querySelector('.nbx-sr') ? '' : th.textContent.trim()));
      t.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, i) => {
        if (td.hasAttribute('colspan')) return;
        td.setAttribute('data-label', heads[i] || '');
        if (!td.querySelector(':scope > .nbx-cell')) { const w = document.createElement('div'); w.className = 'nbx-cell'; while (td.firstChild) w.appendChild(td.firstChild); td.appendChild(w); }
      }));
    });
  }

  const rvOf = c => S.review[c.id] || {};
  const isApproved = c => !!(c.reviewed || rvOf(c).status === 'approved');
  const pendingReviews = () => (CASES ? CASES.filter(c => !isApproved(c)).length : 6);
  const orgName = id => (S.unis.find(x => x.id === id) || {}).name || 'منصة نبض';
  const bar = (v, max, tone) => `<span class="nbx-bar ${tone ? 'nbx-bar-' + tone : ''}"><i style="width:${Math.min(100, pct(v, max))}%"></i></span>`;
  const card = (title, inner, extra, meta) => `<section class="nbx-card ${extra || ''}"><header class="nbx-card-head"><h2>${title}</h2>${meta ? `<span class="nbx-card-meta">${meta}</span>` : ''}</header>${inner}</section>`;
  const empty = t => `<p class="nbx-empty">${esc(t)}</p>`;

  /* ---------- pages ---------- */
  function overview(body) {
    const live = S.unis.filter(x => x.status === 'active' || x.status === 'trial');
    const seats = live.reduce((a, x) => a + x.seats, 0), used = live.reduce((a, x) => a + x.used, 0);
    const week = WEEKS[WEEKS.length - 1], prev = WEEKS[WEEKS.length - 2];
    const kpi = (label, value, sub, extra) => `<div class="nbx-kpi"><span>${label}</span><b>${value}</b><small>${sub}</small>${extra || ''}</div>`;
    const tasks = [];
    const pr = pendingReviews();
    if (pr) tasks.push(['cases', 'alert', `${pr} حالات بانتظار مراجعة طبيب`, 'تبقى منشورة بعلامة «لم يراجعها طبيب بعد» حتى تُعتمد.']);
    const pu = S.users.filter(x => x.status === 'pending').length;
    if (pu) tasks.push(['users', 'users', `${pu} طلبات تسجيل بانتظار الاعتماد`, 'طلاب سجّلوا بنطاق جامعي متعاقد.']);
    S.unis.filter(x => x.status !== 'pending' && daysTo(x.end) <= 90).forEach(x => tasks.push(['subs', 'subs', `ينتهي عقد ${x.name} خلال ${daysTo(x.end)} يوماً`, x.status === 'trial' ? 'فترة تجريبية: حوّلها إلى اشتراك أو أنهها.' : 'جهّز التجديد قبل انتهاء المقاعد.']));
    if (rulesDiff(S.rules, S.rulesLive).length) tasks.push(['rules', 'rules', 'تعديلات على القوانين لم تُعتمد بعد', 'تبقى مسودة، ولا تُطبَّق على الطلاب قبل اعتمادها.']);
    tasks.push(['sources', 'sources', 'رخصة صورة الواجهة قيد التحقق', 'مطلوب تأكيد المصدر أو استبدال الصورة.']);
    const max = Math.max(...WEEKS);
    const chart = `<div class="nbx-chart" role="img" aria-label="جلسات التدريب في آخر ثمانية أسابيع، من ${n(WEEKS[0])} إلى ${n(week)}">${WEEKS.map((v, i) => `<div class="nbx-col${i === WEEKS.length - 1 ? ' is-now' : ''}"><b>${n(v)}</b><i style="height:${Math.round((v / max) * 100)}%"></i><span>${i === WEEKS.length - 1 ? '<span class="nbx-lbl-l">هذا الأسبوع</span><span class="nbx-lbl-s">الآن</span>' : `<span class="nbx-lbl-l">${esc(weekOf(WEEKS.length - 1 - i))}</span><span class="nbx-lbl-s" dir="ltr">${weekShort(WEEKS.length - 1 - i)}</span>`}</span></div>`).join('')}</div>`;
    const weakest = DOMAINS.slice().sort((a, b) => a.v - b.v)[0];
    const comps = `<ul class="nbx-comp">${DOMAINS.map(d => `<li class="nbx-comp-${d.v >= TARGET ? 'ok' : d.v >= TARGET - 7 ? 'mid' : 'low'}"><span>${esc(d.name)}</span><b class="nbx-num">${n(d.v)}%</b><span class="nbx-comp-bar"><i style="width:${d.v}%"></i><em style="inset-inline-start:${TARGET}%" title="الهدف ${TARGET}%"></em></span></li>`).join('')}</ul>
      <p class="nbx-insight">${ic('target', 16)}<span>أضعف محور على المنصة: <b>${esc(weakest.name)}</b> (${n(weakest.v)}%). صفحة كل مؤسسة تبيّن الشعب الأضعف فيه.</span></p>`;
    const errors = `<ol class="nbx-errors">${ERRORS.map(([t, v, d, c]) => `<li><span class="nbx-err-t"><b>${esc(t)}</b><small>${c ? 'الأكثر في حالة ' + esc(CASE_SHORT[c]) : 'في كل الحالات'}</small></span><span class="nbx-err-v"><b class="nbx-num">${n(v)}%</b><small class="${d < 0 ? 'nbx-good' : d > 0 ? 'nbx-bad' : ''}">${d < 0 ? '▼ ' + n(-d) + ' نقطة' : d > 0 ? '▲ ' + n(d) + ' نقطة' : 'دون تغيير'}</small></span></li>`).join('')}</ol>`;
    const caseRows = (CASES && CASES.length ? CASES : Object.keys(CASE_Q).map(id => ({ id, dx: CASE_SHORT[id], en: '' })))
      .slice().sort((a, b) => (CASE_Q[a.id] || [0, 0])[1] - (CASE_Q[b.id] || [0, 0])[1])
      .map(c => { const q = CASE_Q[c.id] || [0, 0, '-', '']; return `<tr>
        <td><b>${esc(c.dx)}</b>${c.en ? `<small dir="ltr">${esc(c.en)}</small>` : ''}</td>
        <td class="nbx-num">${n(USAGE[c.id] || 0)}</td>
        <td class="nbx-num"><span class="nbx-score nbx-score-${band(q[0])}">${n(q[0])}%</span></td>
        <td class="nbx-num"><span>${n(q[1])}%</span>${bar(q[1], 100, q[1] < 80 ? 'warn' : '')}</td>
        <td><b class="nbx-num">${esc(q[2])} دقيقة</b><small>${esc(q[3])}</small></td>
      </tr>`; }).join('');
    const sys = [
      ['ok', 'خادم التطبيق', 'يعمل'],
      ['ok', 'بوابة خدمة فهم المحادثة', 'مهيّأة عبر خادم التطبيق'],
      ['info', 'تخزين البيانات', 'في المتصفح · مرحلة النموذج'],
      ['info', 'المصادقة', 'حسابات عرض · مرحلة النموذج']
    ].map(([t, a, b]) => `<li><i class="nbx-dot nbx-dot-${t}"></i><span>${a}</span><small>${b}</small></li>`).join('');
    body.innerHTML = `
      <div class="nbx-kpis">
        ${kpi('المؤسسات المتعاقدة', n(S.unis.filter(x => x.status === 'active').length), `و${n(S.unis.filter(x => x.status === 'trial').length)} في فترة تجريبية`)}
        ${kpi('المقاعد المفعّلة', `${n(used)}<em> / ${n(seats)}</em>`, `${pct(used, seats)}% من المقاعد المتعاقد عليها`, bar(used, seats))}
        ${kpi('جلسات التدريب هذا الأسبوع', n(week), `<span class="nbx-up">▲ ${pct(week - prev, prev)}%</span> عن الأسبوع الماضي`)}
        ${kpi('متوسط أداء الطلاب', '81%', 'في غرفة الطوارئ، آخر 30 يوماً')}
      </div>
      <div class="nbx-grid nbx-grid-wide">
        ${card('جلسات التدريب الأسبوعية', chart)}
        ${card('بانتظار قرارك', `<ul class="nbx-tasks">${tasks.map(([p, i, t, s]) => `<li><button type="button" data-nbx-go="${p}">${ic(i)}<span><b>${esc(t)}</b><small>${esc(s)}</small></span>${ic('arrow', 16)}</button></li>`).join('')}</ul>`)}
      </div>
      <div class="nbx-section-t"><h2>جودة التدريب السريري</h2><p>ما يتعلمه الطلاب لا ما يستخدمونه فقط: محاور تقييم الغرفة، الأخطاء المتكررة، والالتزام بالسلامة في كل حالة. آخر 30 يوماً.</p></div>
      <div class="nbx-grid">
        ${card('الكفاءات السريرية', comps, '', `متوسط المنصة · الهدف ${TARGET}%`)}
        ${card('أكثر الأخطاء تكراراً', errors, '', 'نسبة الجلسات · مقارنة بالشهر الماضي')}
      </div>
      <div class="nbx-card nbx-table-card"><header class="nbx-card-head"><h2>الأداء والسلامة حسب الحالة</h2><span class="nbx-card-meta">من الأقل التزاماً بالسلامة</span></header><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>الحالة</th><th>الجلسات</th><th>متوسط الأداء</th><th>الالتزام بقواعد السلامة</th><th>الوقت حتى الإجراء الحرج (الوسيط)</th></tr></thead>
        <tbody>${caseRows}</tbody></table></div></div>
      <p class="nbx-foot-note nbx-foot-tight">أرقام الجودة توضيحية في بيئة العرض؛ تُحسب من جلسات الطلاب الفعلية عند ربط خادم المنصة.</p>
      <div class="nbx-grid nbx-grid-wide">
        ${card('آخر النشاطات', auditList(S.audit.slice(0, 6)))}
        ${card('حالة الأنظمة', `<ul class="nbx-sys">${sys}</ul>`)}
      </div>`;
    if (!CASES) loadCases().then(() => { if (page === 'overview') render(); });
  }

  function auditList(rows) {
    if (!rows.length) return empty('لا توجد نشاطات.');
    return `<ul class="nbx-feed">${rows.map(r => `<li><time>${esc(stamp(r.at))}</time><span><b>${esc(r.who)}</b> ${esc(r.what)}</span></li>`).join('')}</ul>`;
  }

  function unis(body, act) {
    act.innerHTML = `<button type="button" class="nbx-btn nbx-btn-primary" data-nbx-act="uni-new">${ic('plus', 16)}إضافة مؤسسة</button>`;
    const q = filters.uniQ.trim();
    const rows = S.unis.filter(x => (filters.uni === 'all' || x.status === filters.uni) && (!q || x.name.includes(q) || x.domain.includes(q)));
    const tab = (id, label) => `<button type="button" class="${filters.uni === id ? 'is-on' : ''}" data-nbx-act="uni-filter" data-v="${id}">${label} <em>${n(id === 'all' ? S.unis.length : S.unis.filter(x => x.status === id).length)}</em></button>`;
    body.innerHTML = `
      <div class="nbx-toolbar">
        <div class="nbx-tabs" role="group" aria-label="تصفية حسب الحالة">${tab('all', 'الكل')}${tab('active', 'نشط')}${tab('trial', 'تجريبي')}${tab('pending', 'بانتظار التوقيع')}</div>
        <label class="nbx-search">${ic('search', 16)}<input type="search" data-nbx-input="uniQ" value="${esc(filters.uniQ)}" placeholder="ابحث باسم المؤسسة أو النطاق"></label>
      </div>
      <div class="nbx-card nbx-table-card"><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>المؤسسة</th><th>الباقة</th><th>المقاعد</th><th>الشعب</th><th>نهاية العقد</th><th>الحالة</th><th><span class="nbx-sr">إجراء</span></th></tr></thead>
        <tbody>${rows.map(x => `<tr>
          <td><button type="button" class="nbx-link" data-nbx-go="org" data-id="${x.id}">${esc(x.name)}</button><small dir="ltr">${esc(x.domain)}</small></td>
          <td>${esc(PLANS[x.plan].name)}<small>${esc(x.type)}</small></td>
          <td class="nbx-num"><span>${n(x.used)} / ${n(x.seats)}</span>${bar(x.used, x.seats, pct(x.used, x.seats) > 90 ? 'warn' : '')}</td>
          <td class="nbx-num">${n(x.cohorts.length)}</td>
          <td class="nbx-num">${esc(day(x.end))}${x.status !== 'pending' && daysTo(x.end) <= 90 ? `<small class="nbx-warn-t">بعد ${n(daysTo(x.end))} يوماً</small>` : ''}</td>
          <td>${chip(STATUS[x.status][0], STATUS[x.status][1])}</td>
          <td><button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-go="org" data-id="${x.id}">عرض</button></td>
        </tr>`).join('') || `<tr><td colspan="7">${empty('لا توجد مؤسسات بهذه التصفية.')}</td></tr>`}</tbody>
      </table></div></div>`;
  }

  function users(body, act) {
    act.innerHTML = `<label class="nbx-btn nbx-btn-quiet nbx-file">${ic('upload', 16)}استيراد CSV<input type="file" accept=".csv,text/csv" data-nbx-file="users"></label>
      <button type="button" class="nbx-btn nbx-btn-primary" data-nbx-act="user-new">${ic('plus', 16)}إضافة مستخدم</button>`;
    const q = filters.userQ.trim();
    const rows = S.users.filter(x => (filters.role === 'all' || (filters.role === 'pending' ? x.status === 'pending' : x.role === filters.role)) && (!q || x.name.includes(q) || x.email.includes(q)));
    const tab = (id, label, c) => `<button type="button" class="${filters.role === id ? 'is-on' : ''}" data-nbx-act="role-filter" data-v="${id}">${label} <em>${n(c)}</em></button>`;
    const cnt = r => S.users.filter(x => x.role === r).length;
    body.innerHTML = `
      <div class="nbx-toolbar">
        <div class="nbx-tabs" role="group" aria-label="تصفية حسب الدور">${tab('all', 'الكل', S.users.length)}${tab('pending', 'بانتظار الاعتماد', S.users.filter(x => x.status === 'pending').length)}${tab('student', 'الطلاب', cnt('student'))}${tab('professor', 'المشرفون', cnt('professor'))}${tab('reviewer', 'المراجعون الطبيون', cnt('reviewer'))}${tab('editor', 'المحررون', cnt('editor'))}</div>
        <label class="nbx-search">${ic('search', 16)}<input type="search" data-nbx-input="userQ" value="${esc(filters.userQ)}" placeholder="ابحث بالاسم أو البريد"></label>
      </div>
      <div class="nbx-card nbx-table-card"><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>المستخدم</th><th>الدور</th><th>المؤسسة</th><th>آخر نشاط</th><th>الحالة</th><th><span class="nbx-sr">إجراءات</span></th></tr></thead>
        <tbody>${rows.map(x => `<tr>
          <td><b>${esc(x.name)}</b><small dir="ltr">${esc(x.email)}</small></td>
          <td>${chip(ROLES[x.role] || x.role, x.role === 'reviewer' ? 'teal' : x.role === 'admin' || x.role === 'uniadmin' ? 'navy' : 'muted')}</td>
          <td>${esc(x.org ? orgName(x.org) : 'منصة نبض')}</td>
          <td class="nbx-num">${x.seen ? esc(stamp(x.seen)) : '<small>لم يدخل بعد</small>'}</td>
          <td>${x.status === 'active' ? chip('نشط', 'ok') : x.status === 'pending' ? chip('بانتظار الاعتماد', 'warn') : chip('موقوف', 'bad')}</td>
          <td class="nbx-row-act">${x.status === 'pending' ? `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="user-approve" data-id="${x.id}">${ic('check', 15)}اعتماد</button>` : ''}
            <button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="user-open" data-id="${x.id}">تعديل</button></td>
        </tr>`).join('') || `<tr><td colspan="6">${empty('لا يوجد مستخدمون بهذه التصفية.')}</td></tr>`}</tbody>
      </table></div></div>
      <p class="nbx-foot-note">ملف CSV بثلاثة أعمدة: الاسم، البريد الجامعي، الدور (student أو professor). يُضاف كل سطر بحالة «بانتظار الاعتماد».</p>`;
  }

  function subs(body) {
    const count = p => S.unis.filter(x => x.plan === p && x.status !== 'pending').length;
    body.innerHTML = `
      <div class="nbx-plans">${Object.entries(PLANS).map(([id, p]) => `<article class="nbx-plan">
        <header><h2>${esc(p.name)}</h2><span>${esc(p.who)}</span></header>
        <p class="nbx-plan-price">${esc(p.price)}</p>
        <ul>${p.has.map(h => `<li>${ic('check', 15)}${esc(h)}</li>`).join('')}</ul>
        <footer><b class="nbx-num">${n(count(id))}</b> اشتراك فعّال</footer>
      </article>`).join('')}</div>
      <div class="nbx-card nbx-table-card"><header class="nbx-card-head"><h2>الاشتراكات</h2></header><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>المؤسسة</th><th>الباقة</th><th>المقاعد</th><th>البداية</th><th>التجديد</th><th>الفاتورة</th><th><span class="nbx-sr">إجراءات</span></th></tr></thead>
        <tbody>${S.unis.map(x => `<tr>
          <td><b>${esc(x.name)}</b></td>
          <td>${esc(PLANS[x.plan].name)}</td>
          <td class="nbx-num">${n(x.used)} / ${n(x.seats)}</td>
          <td class="nbx-num">${esc(day(x.start))}</td>
          <td class="nbx-num">${esc(day(x.end))}</td>
          <td>${chip(INVOICE[x.invoice][0], INVOICE[x.invoice][1])}</td>
          <td class="nbx-row-act">${x.status === 'pending' ? `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="sub-activate" data-id="${x.id}">تفعيل العقد</button>` : x.status === 'trial' ? `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="sub-convert" data-id="${x.id}" data-nbx-confirm="تأكيد التحويل">تحويل إلى اشتراك</button>` : `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="sub-renew" data-id="${x.id}" data-nbx-confirm="تأكيد التجديد">تجديد سنة</button>`}
            ${x.invoice === 'due' || x.invoice === 'late' ? `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="sub-paid" data-id="${x.id}">تسجيل الدفع</button>` : ''}</td>
        </tr>`).join('')}</tbody>
      </table></div></div>
      <p class="nbx-foot-note">تُسجَّل الاشتراكات والدفعات يدوياً في هذه المرحلة؛ الربط مع بوابة دفع إلكتروني في مرحلة لاحقة.</p>`;
  }

  function reviewOf(c) {
    const r = rvOf(c);
    if (isApproved(c)) return ['معتمدة طبياً', 'ok'];
    if (r.status === 'changes') return ['طُلبت تعديلات', 'bad'];
    if (r.reviewer) return ['قيد المراجعة لدى ' + r.reviewer, 'info'];
    return ['بانتظار مراجعة طبيب', 'warn'];
  }
  function cases(body, act) {
    act.innerHTML = `<button type="button" class="nbx-btn nbx-btn-primary" data-nbx-act="case-new">${ic('plus', 16)}حالة جديدة</button>`;
    if (!CASES) { body.innerHTML = empty('جارٍ تحميل الحالات…'); loadCases().then(() => { if (page === 'cases') render(); }); return; }
    const inReview = CASES.filter(c => !isApproved(c) && rvOf(c).reviewer).length;
    const flow = [['مسودات', S.drafts.length, 'muted'], ['قيد المراجعة الطبية', inReview, 'info'], ['منشورة بانتظار مراجعة', CASES.filter(c => !isApproved(c)).length - inReview, 'warn'], ['منشورة ومعتمدة', CASES.filter(isApproved).length, 'ok']];
    body.innerHTML = `
      <ol class="nbx-flow">${flow.map(([t, c, tone]) => `<li class="nbx-flow-${tone}"><b class="nbx-num">${n(c)}</b><span>${t}</span></li>`).join('')}</ol>
      <div class="nbx-card nbx-table-card"><header class="nbx-card-head"><h2>غرفة الطوارئ <small>${n(CASES.length)} حالات · من ملف الحالات الذي تشغّله الغرفة</small></h2></header><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>الحالة</th><th>المريض</th><th>المكان الصحيح</th><th>المحتوى</th><th>النشر</th><th>المراجعة الطبية</th><th><span class="nbx-sr">إجراء</span></th></tr></thead>
        <tbody>${CASES.map(c => { const r = reviewOf(c); return `<tr>
          <td><b>${esc(c.dx)}</b><small dir="ltr">${esc(c.en)}</small></td>
          <td><span class="nbx-nowrap">${esc(c.patient)}</span><small>${esc(c.sex)} · ${n(c.age)} سنة</small></td>
          <td class="nbx-nowrap">${esc(DISPO[c.dispo] || c.dispo)}</td>
          <td><span class="nbx-mini"><span><b class="nbx-num">${n(c.facts + c.exam)}</b> قصة وفحص</span><span><b class="nbx-num">${n(c.tests)}</b> فحصاً</span><span><b class="nbx-num">${n(c.care)}</b> إجراءً</span></span></td>
          <td>${chip('منشورة · v1.0', 'navy')}</td>
          <td>${chip(r[0], r[1])}</td>
          <td><button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="case-open" data-id="${c.id}">فتح الملف</button></td>
        </tr>`; }).join('')}</tbody>
      </table></div></div>
      ${S.drafts.length ? `<div class="nbx-card nbx-table-card"><header class="nbx-card-head"><h2>المسودات</h2></header><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>الحالة</th><th>القسم</th><th>المستوى</th><th>أُنشئت</th><th>الحالة</th><th><span class="nbx-sr">إجراء</span></th></tr></thead>
        <tbody>${S.drafts.map(d => `<tr><td><b>${esc(d.title)}</b><small>${esc(d.summary)}</small></td><td>${esc(d.dept)}</td><td>${esc(d.level)}</td><td class="nbx-num">${esc(stamp(d.at))}</td><td>${chip('مسودة', 'muted')}</td><td><button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="draft-delete" data-id="${d.id}" data-nbx-confirm="تأكيد الحذف">حذف</button></td></tr>`).join('')}</tbody>
      </table></div></div>` : ''}
      <div class="nbx-grid">
        <section class="nbx-card nbx-soon"><span class="nbx-soon-ic">${ic('pulse', 22)}</span><div><h2>الغرف التخصصية</h2><p>حالات التمريض والتخصصات: محتواها قيد الإعداد، وتُفتح للطلاب بعد المراجعة الطبية.</p></div>${chip('قيد الإعداد', 'muted')}</section>
        <section class="nbx-card nbx-soon"><span class="nbx-soon-ic">${ic('cube', 22)}</span><div><h2>غرف العمليات ثلاثية الأبعاد</h2><p>غرف محاكاة جراحية ثلاثية الأبعاد، تُدار حالاتها من هذه المكتبة عند إطلاقها.</p></div>${chip('قريباً', 'teal')}</section>
      </div>`;
  }

  function sources(body, act) {
    act.innerHTML = `<button type="button" class="nbx-btn nbx-btn-primary" data-nbx-act="source-new">${ic('plus', 16)}إضافة مرجع</button>`;
    const name = id => { const c = (CASES || []).find(x => x.id === id); return c ? c.dx : id; };
    body.innerHTML = `
      <div class="nbx-card nbx-table-card"><header class="nbx-card-head"><h2>الإرشادات السريرية <small>يُؤكَّد ربط المرجع بالحالة بعد المراجعة الطبية</small></h2></header><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>المرجع</th><th>الجهة</th><th>السنة</th><th>الحالات المرتبطة</th><th>الحالة</th><th><span class="nbx-sr">إجراء</span></th></tr></thead>
        <tbody>${S.sources.map(s => `<tr>
          <td dir="ltr" class="nbx-ltr"><b>${esc(s.title)}</b></td>
          <td dir="ltr" class="nbx-ltr">${esc(s.org)}</td>
          <td class="nbx-num">${esc(s.year)}</td>
          <td>${s.cases.length ? (s.cases.length > 3 ? chip('كل حالات الطوارئ', 'navy') : s.cases.map(c => chip(name(c), 'muted')).join(' ')) : '<small>مرجع عام للتقييم</small>'}</td>
          <td>${s.confirmed ? chip('مؤكَّد', 'ok') : `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="source-confirm" data-id="${s.id}">${ic('check', 15)}تأكيد المرجع</button>`}</td>
          <td><button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="source-delete" data-id="${s.id}" data-nbx-confirm="تأكيد الحذف">حذف</button></td>
        </tr>`).join('')}</tbody>
      </table></div></div>
      ${card('مكتبة الوسائط', `<ul class="nbx-media">
        <li><span class="nbx-media-ic">${ic('alert', 18)}</span><span><b>صورة الواجهة: فريق سريري</b><small dir="ltr">img/landing/hero-clinical-team.webp</small></span>${chip('الترخيص قيد التحقق', 'warn')}</li>
        <li><span class="nbx-media-ic">${ic('cases', 18)}</span><span><b>الصور السريرية للحالات</b><small>59 صورة: تخطيط القلب، الأشعة، نتائج المختبر</small></span>${chip('من محتوى المنصة', 'muted')}</li>
        <li><span class="nbx-media-ic">${ic('users', 18)}</span><span><b>صور الأقسام والتخصصات</b><small>بطاقات الصفحة الرئيسية</small></span>${chip('من محتوى المنصة', 'muted')}</li>
      </ul><p class="nbx-foot-note">لكل ملف حقل للمصدر والرخصة؛ لا يُنشر ملف دون رخصة مؤكدة.</p>`)}`;
    if (!CASES) loadCases().then(() => { if (page === 'sources') render(); });
  }

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function rules(body) {
    const R = S.rules, L = S.rulesLive;
    const total = Object.values(R.weights).reduce((a, v) => a + Number(v), 0);
    const diff = rulesDiff(R, L), changed = diff.length > 0;
    const banner = changed ? `<div class="nbx-banner nbx-banner-warn nbx-banner-col"><div class="nbx-banner-row">${ic('alert')}<span><b>${n(diff.length)} تعديلات لم تُعتمد بعد.</b> لا يتغير شيء عند الطلاب قبل اعتمادها.</span></div>
        <ul class="nbx-diff">${diff.map(([k, a, b]) => `<li><span>${esc(k)}</span><s>${esc(a)}</s><i aria-hidden="true">←</i><b>${esc(b)}</b></li>`).join('')}</ul></div>` : '';
    const sw = (group, id, on, label, note) => `<label class="nbx-switch"><span><b>${esc(label)}</b>${note ? `<small>${esc(note)}</small>` : ''}</span><input type="checkbox" role="switch" data-nbx-rule="${group}.${id}"${on ? ' checked' : ''}><i aria-hidden="true"></i></label>`;
    body.innerHTML = `${banner}
      <div class="nbx-grid">
        ${card('أوزان تقييم غرفة الطوارئ', `<div class="nbx-weights">${WEIGHTS.map(w => `<label class="nbx-weight"><span>${esc(w.name)}</span><input type="range" min="0" max="60" step="5" value="${R.weights[w.id]}" data-nbx-rule="weights.${w.id}"><b class="nbx-num">${n(R.weights[w.id])}</b></label>`).join('')}</div>
          <p class="nbx-total ${total === 100 ? 'is-ok' : 'is-bad'}">المجموع <b class="nbx-num">${n(total)}</b> / 100${total === 100 ? '' : ' · يجب أن يساوي 100 قبل الاعتماد'}</p>
          <p class="nbx-foot-note">القيم الافتراضية هي المطبقة في دور الطبيب حين يكون وضع الواقعية مفعّلاً. دور التمريض له محاوره الخاصة، وينتقل إلى أوزانه الجديدة في المرحلة التالية.</p>`)}
        ${card('الخصومات', `<div class="nbx-fields">${PENALTIES.map(x => `<label class="nbx-field nbx-field-row"><span>${esc(x.name)}</span><span class="nbx-stepper"><input type="number" min="0" max="20" value="${R.penalties[x.id]}" data-nbx-rule="penalties.${x.id}"><em>نقطة</em></span></label>`).join('')}</div>
          <p class="nbx-foot-note">توقف القلب أثناء الحالة يحدّ نقاط السلامة بـ 10. والخطأ الحرج يجعل الحالة غير مجتازة مهما كانت الدرجة: أذى وصل إلى المريض، جرعة ثلاثة أضعاف الحد الأعلى أُعطيت، إجراء أساسي لم يحدث، أو وجهة خطرة.</p>`)}
        ${card('قواعد سلامة الأوامر', `<div class="nbx-switches">${SAFETY.map(x => sw('safety', x.id, R.safety[x.id], x.name, x.note)).join('')}</div>`)}
        ${card('إعدادات الجلسة', `<div class="nbx-fields">
          <label class="nbx-field nbx-field-row"><span>المدة القصوى للحالة</span><span class="nbx-stepper"><input type="number" min="5" max="60" value="${R.session.minutes}" data-nbx-rule="session.minutes"><em>دقيقة</em></span></label>
          <label class="nbx-field nbx-field-row"><span>عدد المحاولات لكل واجب</span><span class="nbx-stepper"><input type="number" min="1" max="5" value="${R.session.attempts}" data-nbx-rule="session.attempts"><em>محاولة</em></span></label>
          <label class="nbx-field nbx-field-row"><span>لهجة المريض</span><select data-nbx-rule="session.dialect"><option value="jo"${R.session.dialect === 'jo' ? ' selected' : ''}>عامية أردنية</option><option value="msa"${R.session.dialect === 'msa' ? ' selected' : ''}>عربية فصحى مبسطة</option></select></label>
        </div><div class="nbx-switches">${sw('session', 'hints', R.session.hints, 'التلميحات أثناء الحالة', 'للسنوات الأولى')}${sw('session', 'osce', R.session.osce, 'وضع الامتحان (OSCE) افتراضياً', 'مؤقت ظاهر ودون تلميحات')}</div>`)}
        ${card('الأقسام المفعّلة للطلاب', `<div class="nbx-switches">${FEATURES.map(f => sw('features', f.id, R.features[f.id], f.name, f.note)).join('')}</div>`, 'nbx-span-2')}
      </div>
      <div class="nbx-actions-bar">
        <span>${changed ? `${n(diff.length)} تعديلات في المسودة · لا يتغير محرّك تقييم الغرفة في هذه المرحلة` : 'لا توجد تعديلات · الإصدار المعتمد حالياً'}</span>
        <button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="rules-reset"${changed ? '' : ' disabled'}>التراجع عن التعديلات</button>
        <button type="button" class="nbx-btn nbx-btn-primary" data-nbx-act="rules-approve"${changed && total === 100 ? '' : ' disabled'}>${ic('check', 16)}اعتماد التعديلات</button>
      </div>`;
  }
  function rulesDiff(R, L) {
    const out = [], onOff = v => (v ? 'مفعّل' : 'موقوف');
    WEIGHTS.forEach(w => { if (Number(R.weights[w.id]) !== Number(L.weights[w.id])) out.push(['وزن: ' + w.name, n(L.weights[w.id]), n(R.weights[w.id])]); });
    PENALTIES.forEach(x => { if (Number(R.penalties[x.id]) !== Number(L.penalties[x.id])) out.push(['خصم: ' + x.name, n(L.penalties[x.id]) + ' نقطة', n(R.penalties[x.id]) + ' نقطة']); });
    SAFETY.forEach(x => { if (R.safety[x.id] !== L.safety[x.id]) out.push(['قاعدة سلامة: ' + x.name, onOff(L.safety[x.id]), onOff(R.safety[x.id])]); });
    const SES = { minutes: ['المدة القصوى للحالة', v => n(v) + ' دقيقة'], attempts: ['عدد المحاولات', v => n(v)], dialect: ['لهجة المريض', v => (v === 'msa' ? 'فصحى مبسطة' : 'عامية أردنية')], hints: ['التلميحات', onOff], osce: ['وضع الامتحان', onOff] };
    Object.entries(SES).forEach(([k, [t, f]]) => { if (String(R.session[k]) !== String(L.session[k])) out.push([t, f(L.session[k]), f(R.session[k])]); });
    FEATURES.forEach(x => { if (R.features[x.id] !== L.features[x.id]) out.push(['قسم: ' + x.name, onOff(L.features[x.id]), onOff(R.features[x.id])]); });
    return out;
  }

  function orgFigures(x) {
    const r = rng(x.id);
    const profs = S.users.filter(u => u.org === x.id && u.role === 'professor').map(u => u.name);
    const cohorts = x.cohorts.map(([code, name, size], i) => {
      const comp = DOMAINS.map(d => Math.max(52, Math.min(96, Math.round(d.v + (r() - 0.5) * 22))));
      const score = Math.round(comp.reduce((a, v, j) => a + v * WEIGHTS[j].v, 0) / 100);
      const assigned = (S.assign || []).filter(a => a.org === x.id && a.cohort === name).length + 1 + Math.floor(r() * 3);
      return { code, name, size, comp, score, assigned, done: Math.round(58 + r() * 36), sup: profs[i % (profs.length || 1)] || x.contact || 'لم يُعيَّن' };
    });
    const total = cohorts.reduce((a, c) => a + c.size, 0) || 1;
    const orgComp = DOMAINS.map((d, j) => Math.round(cohorts.reduce((a, c) => a + c.comp[j] * c.size, 0) / total));
    const score = cohorts.length ? Math.round(cohorts.reduce((a, c) => a + c.score * c.size, 0) / total) : 0;
    return { cohorts, orgComp, score, active: Math.round(x.used * (0.52 + r() * 0.22)), sessions: Math.round(x.used * (2.3 + r() * 1.4)) };
  }

  function competencyMatrix(x, F) {
    let weak = { v: 101 };
    F.cohorts.forEach(c => c.comp.forEach((v, j) => { if (v < weak.v) weak = { v, c, d: DOMAINS[j] }; }));
    const cell = (v, extra) => `<td class="nbx-heat nbx-heat-${band(v)}${extra ? ' ' + extra : ''}"><span class="nbx-num">${n(v)}%</span></td>`;
    const matrix = `<div class="nbx-matrix-wrap"><table class="nbx-matrix">
        <thead><tr><th scope="col">المحور</th>${F.cohorts.map(c => `<th scope="col"><b dir="ltr">${esc(c.code)}</b><small>${esc(c.name)}</small></th>`).join('')}<th scope="col" class="nbx-matrix-all"><b>المؤسسة</b><small>${n(F.cohorts.reduce((a, c) => a + c.size, 0))} طالباً</small></th></tr></thead>
        <tbody>${DOMAINS.map((d, j) => `<tr><th scope="row">${esc(d.name)}</th>${F.cohorts.map(c => cell(c.comp[j])).join('')}${cell(F.orgComp[j], 'nbx-matrix-all')}</tr>`).join('')}</tbody>
      </table></div>
      <p class="nbx-scroll-hint">اسحب الجدول أفقياً لترى كل الشعب.</p>
      <div class="nbx-legend"><span><i class="nbx-heat-ok"></i>متقن · 80% فأكثر</span><span><i class="nbx-heat-mid"></i>مقبول · 70 إلى 79%</span><span><i class="nbx-heat-low"></i>يحتاج تدريباً · أقل من 70%</span></div>
      <p class="nbx-insight">${ic('target', 16)}<span>أضعف نقطة: <b>${esc(weak.d.name)}</b> في شعبة <b>${esc(weak.c.name)}</b> (${n(weak.v)}%).</span><button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="assign-new" data-id="${x.id}" data-cohort="${esc(weak.c.name)}">إسناد حالة تدريبية</button></p>`;
    return matrix;
  }

  function org(body, act, x) {
    const F = orgFigures(x);
    const code = (x.domain.split('.')[0] + '-' + x.id.slice(0, 2) + '7K2Q').toUpperCase();
    act.innerHTML = `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="uni-open" data-id="${x.id}">تعديل</button>${F.cohorts.length ? `<button type="button" class="nbx-btn nbx-btn-primary" data-nbx-act="assign-new" data-id="${x.id}">${ic('plus', 16)}إسناد حالة لشعبة</button>` : ''}`;
    const kpi = (label, value, sub, extra) => `<div class="nbx-kpi"><span>${label}</span><b>${value}</b><small>${sub}</small>${extra || ''}</div>`;
    const status = `<div class="nbx-chips">${chip(PLANS[x.plan].name, 'navy')}${chip(STATUS[x.status][0], STATUS[x.status][1])}${chip('الفاتورة: ' + INVOICE[x.invoice][0], INVOICE[x.invoice][1])}<span class="nbx-invite"><small>رمز الدعوة</small><code dir="ltr">${esc(code)}</code></span></div>`;
    const subAct = x.status === 'pending' ? `<button type="button" class="nbx-btn nbx-btn-primary" data-nbx-act="sub-activate" data-id="${x.id}">تفعيل العقد</button>`
      : x.status === 'trial' ? `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="sub-convert" data-id="${x.id}" data-nbx-confirm="تأكيد التحويل">تحويل إلى اشتراك</button>`
      : `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="sub-renew" data-id="${x.id}" data-nbx-confirm="تأكيد التجديد">تجديد سنة</button>`;
    const contract = card('العقد والاشتراك', `<dl class="nbx-dl">
        <div><dt>الباقة</dt><dd>${esc(PLANS[x.plan].name)}</dd></div>
        <div><dt>المقاعد</dt><dd class="nbx-num">${n(x.used)} / ${n(x.seats)}</dd></div>
        <div><dt>بداية العقد</dt><dd class="nbx-num">${esc(day(x.start))}</dd></div>
        <div><dt>نهاية العقد</dt><dd class="nbx-num">${esc(day(x.end))}${x.status !== 'pending' ? ` <small class="${daysTo(x.end) <= 90 ? 'nbx-warn-t' : ''}">بعد ${n(daysTo(x.end))} يوماً</small>` : ''}</dd></div>
      </dl><div class="nbx-card-act">${subAct}${x.invoice === 'due' || x.invoice === 'late' ? `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="sub-paid" data-id="${x.id}">تسجيل الدفع</button>` : ''}</div>`);
    if (!F.cohorts.length) {
      body.innerHTML = `${status}
        <section class="nbx-card nbx-empty-state">${ic('unis', 26)}<h2>لم تبدأ هذه المؤسسة بعد</h2><p>${x.status === 'pending' ? `العقد بانتظار التوقيع ويبدأ في ${esc(day(x.start))}. بعد التفعيل يضيف مدير المؤسسة الشعب ويدعو الطلاب برمز الدعوة.` : 'لا توجد شعب بعد. يضيفها مدير المؤسسة، ويدعو الطلاب برمز الدعوة.'}</p></section>
        <div class="nbx-grid">${contract}${card('خطوات التهيئة', `<ol class="nbx-steps"><li class="${x.status === 'pending' ? 'is-now' : 'is-done'}"><b>توقيع العقد وتفعيله</b><small>إدارة المنصة</small></li><li><b>تعيين مدير المؤسسة</b><small>يدير الشعب والمقاعد</small></li><li><b>إضافة الشعب ودعوة الطلاب</b><small>برمز الدعوة أو ملف CSV</small></li><li><b>إسناد أول حالة تدريبية</b><small>المشرف أو الأستاذ</small></li></ol>`)}</div>`;
      return;
    }
    const matrix = competencyMatrix(x, F);
    const assigns = (S.assign || []).filter(a => a.org === x.id);
    const caseName = id => { const c = (CASES || []).find(k => k.id === id); return c ? c.dx : (CASE_SHORT[id] || id); };
    body.innerHTML = `${status}
      <div class="nbx-kpis">
        ${kpi('المقاعد المفعّلة', `${n(x.used)}<em> / ${n(x.seats)}</em>`, `${pct(x.used, x.seats)}% من المقاعد`, bar(x.used, x.seats, pct(x.used, x.seats) > 90 ? 'warn' : ''))}
        ${kpi('طلاب نشطون هذا الأسبوع', n(F.active), `${pct(F.active, x.used)}% من الطلاب المسجلين`)}
        ${kpi('جلسات هذا الشهر', n(F.sessions), 'في غرفة الطوارئ')}
        ${kpi('متوسط الأداء', `${n(F.score)}%`, F.score === PLATFORM_SCORE ? 'مثل متوسط المنصة' : `${F.score > PLATFORM_SCORE ? 'أعلى' : 'أدنى'} من متوسط المنصة (${n(PLATFORM_SCORE)}%)`)}
      </div>
      ${card('مصفوفة الكفاءات', matrix, '', 'محاور تقييم الغرفة لكل شعبة · آخر 30 يوماً')}
      ${orgCard(x)}
      <div class="nbx-card nbx-table-card"><header class="nbx-card-head"><h2>الشعب والمساقات</h2><span class="nbx-card-meta">${n(F.cohorts.length)} شعب</span></header><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>الشعبة</th><th>الطلاب</th><th>المشرف</th><th>حالات مسندة</th><th>إنجاز الواجبات</th><th>متوسط الأداء</th></tr></thead>
        <tbody>${F.cohorts.map(c => `<tr><td><b>${esc(c.name)}</b><small dir="ltr">${esc(c.code)}</small></td><td class="nbx-num">${n(c.size)}</td><td>${esc(c.sup)}</td><td class="nbx-num">${n(c.assigned)}</td><td class="nbx-num"><span>${n(c.done)}%</span>${bar(c.done, 100, c.done < 70 ? 'warn' : '')}</td><td class="nbx-num"><span class="nbx-score nbx-score-${band(c.score)}">${n(c.score)}%</span></td></tr>`).join('')}</tbody>
      </table></div></div>
      <div class="nbx-grid">
        ${contract}
        ${card('الحالات المسندة', assigns.length ? `<ul class="nbx-assigns">${assigns.map(a => `<li><span><b>${esc(caseName(a.caseId))}</b><small>${esc(a.cohort)} · أسندها ${esc(a.by)}</small></span><span class="nbx-due"><small>التسليم</small><b class="nbx-num">${esc(day(a.due))}</b></span></li>`).join('')}</ul>` : empty('لا توجد حالات مسندة بعد.'), '', `${n(assigns.length)} واجبات`)}
      </div>
      <p class="nbx-foot-note nbx-foot-tight">مؤشرات الأداء والكفاءات توضيحية في بيئة العرض؛ تُحسب من جلسات طلاب المؤسسة عند ربط الخادم.</p>`;
    if (!CASES) loadCases().then(() => { if (page === 'org') render(); });
  }

  const KINDS = { all: 'الكل', org: 'المؤسسات', users: 'المستخدمون', billing: 'الاشتراكات', content: 'المحتوى', rules: 'القوانين', privacy: 'الخصوصية', system: 'النظام' };
  function audit(body, act) {
    act.innerHTML = `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="audit-export">${ic('download', 16)}تصدير CSV</button>`;
    const rows = S.audit.filter(r => filters.audit === 'all' || r.kind === filters.audit);
    body.innerHTML = `
      <div class="nbx-toolbar"><div class="nbx-tabs" role="group" aria-label="تصفية حسب النوع">${Object.entries(KINDS).map(([id, t]) => `<button type="button" class="${filters.audit === id ? 'is-on' : ''}" data-nbx-act="audit-filter" data-v="${id}">${t}</button>`).join('')}</div></div>
      <div class="nbx-card nbx-table-card"><div class="nbx-table-wrap"><table class="nbx-table">
        <thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>النوع</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td class="nbx-num">${esc(stamp(r.at))}</td><td><b>${esc(r.who)}</b></td><td>${esc(r.what)}</td><td>${chip(KINDS[r.kind] || r.kind, 'muted')}</td></tr>`).join('') || `<tr><td colspan="4">${empty('لا توجد سجلات بهذه التصفية.')}</td></tr>`}</tbody>
      </table></div></div>`;
  }

  function settings(body) {
    const st = S.settings;
    body.innerHTML = `
      <div class="nbx-grid">
        ${card('إعلان على الصفحة الرئيسية', `<div class="nbx-switches"><label class="nbx-switch"><span><b>إظهار الإعلان للطلاب والمشرفين</b><small>يظهر أعلى الصفحة الرئيسية بعد تسجيل الدخول</small></span><input type="checkbox" role="switch" data-nbx-set="announce"${st.announce ? ' checked' : ''}><i aria-hidden="true"></i></label></div>
          <label class="nbx-field"><span>نص الإعلان</span><textarea rows="3" maxlength="160" data-nbx-set="announceText">${esc(st.announceText)}</textarea></label>
          <div class="nbx-preview"><small>معاينة</small><div class="nbx-announce-pv">${ic('pulse', 16)}<span>${esc(st.announceText)}</span></div></div>`)}
        ${card('وضع الصيانة', `<div class="nbx-switches"><label class="nbx-switch"><span><b>إيقاف الجلسات الجديدة مؤقتاً</b><small>تكمل الجلسات المفتوحة، ولا تبدأ جلسات جديدة</small></span><input type="checkbox" role="switch" data-nbx-set="maintenance"${st.maintenance ? ' checked' : ''}><i aria-hidden="true"></i></label></div>
          <p class="nbx-foot-note">يُطبَّق مع خادم المنصة في المرحلة التالية؛ يُحفظ الإعداد هنا.</p>`)}
        ${card('الخصوصية وحماية البيانات', `<label class="nbx-field nbx-field-row"><span>مدة الاحتفاظ بسجلات التدريب</span><select data-nbx-set="retention"><option value="12"${st.retention === '12' ? ' selected' : ''}>12 شهراً</option><option value="24"${st.retention === '24' ? ' selected' : ''}>24 شهراً</option><option value="36"${st.retention === '36' ? ' selected' : ''}>36 شهراً</option></select></label>
          <h3 class="nbx-sub">طلبات البيانات</h3>
          <ul class="nbx-requests">${S.requests.map(r => `<li><span><b>${r.kind === 'export' ? 'تصدير بيانات' : 'حذف بيانات'}</b><small>${esc(r.who)} · ${esc(stamp(r.at))}</small></span>${r.done ? chip('نُفّذ', 'ok') : `<button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-act="req-done" data-id="${r.id}">تنفيذ</button>`}</li>`).join('')}</ul>
          <p class="nbx-foot-note">وفق قانون حماية البيانات الشخصية الأردني: حق الاطلاع والتصحيح والحذف.</p>`)}
        ${card('غرفة الطوارئ', `<div class="nbx-switches"><label class="nbx-switch"><span><b>وضع الواقعية</b><small>مقاطعات الأهل والفريق، إنذار باللون وصوت النبض، نافذة التدخل، وملخص قصير قبل الجلسة. التلميحات بالجرعات لطلاب السنة الأولى والثانية فقط.</small></span><input type="checkbox" role="switch" data-nbx-set="erRealism"${st.erRealism === false ? '' : ' checked'}><i aria-hidden="true"></i></label></div>
          <p class="nbx-foot-note">عند إيقافه تعود الغرفة إلى نسختها المرجعية المعتمدة كما هي.</p>`)}
        ${card('بيانات العرض', `<p class="nbx-text">كل ما في لوحة التحكم بيانات عرض محفوظة في هذا المتصفح فقط. إعادة الضبط ترجعها إلى حالتها الأولى.</p>
          <button type="button" class="nbx-btn nbx-btn-danger" data-nbx-act="reset-demo" data-nbx-confirm="تأكيد إعادة الضبط">إعادة ضبط بيانات العرض</button>`)}
      </div>`;
  }

  /* ---------- the drawer ---------- */
  const drawer = document.getElementById('nbx-drawer');
  let lastFocus = null;
  function openDrawer(title, html, onSubmit) {
    if (!drawer) return;
    lastFocus = document.activeElement;
    document.getElementById('nbx-drawer-title').textContent = title;
    const b = document.getElementById('nbx-drawer-body');
    b.innerHTML = html;
    drawer.hidden = false;
    document.body.classList.add('nbx-drawer-open');
    const form = b.querySelector('form');
    if (form && onSubmit) form.addEventListener('submit', e => { e.preventDefault(); const err = onSubmit(new FormData(form), form, e.submitter); if (err) { const box = form.querySelector('.nbx-form-err'); if (box) { box.textContent = err; box.hidden = false; } return; } closeDrawer(); render(); });
    setTimeout(() => (b.querySelector('input,select,textarea,button') || drawer.querySelector('[data-nbx-close]'))?.focus(), 30);
  }
  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true;
    document.body.classList.remove('nbx-drawer-open');
    try { lastFocus && lastFocus.focus(); } catch (e) {}
  }
  const field = (label, inner, hint) => `<label class="nbx-field"><span>${label}</span>${inner}${hint ? `<small>${hint}</small>` : ''}</label>`;
  const formEnd = (submit, danger) => `<p class="nbx-form-err" role="alert" hidden></p><div class="nbx-form-act">${danger || ''}<button type="button" class="nbx-btn nbx-btn-quiet" data-nbx-close>إلغاء</button><button type="submit" class="nbx-btn nbx-btn-primary">${submit}</button></div>`;
  const opts = (map, sel) => Object.entries(map).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(typeof v === 'string' ? v : v.name)}</option>`).join('');

  function uniForm(x) {
    const isNew = !x;
    x = x || { name: '', type: 'جامعة', domain: '', plan: 'uni', seats: 100, end: ahead(365), contact: '', status: 'pending' };
    const code = x.id ? (x.domain.split('.')[0] + '-' + x.id.slice(0, 2) + '7K2Q').toUpperCase() : '';
    openDrawer(isNew ? 'إضافة مؤسسة' : 'تعديل: ' + x.name, `<form class="nbx-form" novalidate>
      ${field('اسم المؤسسة', `<input name="name" required maxlength="80" value="${esc(x.name)}">`)}
      <div class="nbx-form-2">${field('النوع', `<select name="type">${['جامعة', 'مستشفى', 'مركز تدريب'].map(t => `<option${t === x.type ? ' selected' : ''}>${t}</option>`).join('')}</select>`)}
      ${field('النطاق البريدي', `<input name="domain" dir="ltr" required maxlength="60" value="${esc(x.domain)}" placeholder="example.edu.jo">`, 'يُقبل تسجيل الطلاب بهذا النطاق فقط')}</div>
      <div class="nbx-form-2">${field('الباقة', `<select name="plan">${opts(PLANS, x.plan)}</select>`)}
      ${field('عدد المقاعد', `<input name="seats" type="number" min="1" max="20000" value="${esc(x.seats)}">`)}</div>
      <div class="nbx-form-2">${field('نهاية العقد', `<input name="end" type="date" value="${esc(String(x.end).slice(0, 10))}">`)}
      ${field('الحالة', `<select name="status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${k === x.status ? ' selected' : ''}>${v[0]}</option>`).join('')}</select>`)}</div>
      ${field('جهة التواصل', `<input name="contact" maxlength="80" value="${esc(x.contact)}" placeholder="مثلاً: عمادة كلية التمريض">`)}
      ${isNew ? '' : `<h3 class="nbx-sub">الشعب والمساقات</h3>${x.cohorts.length ? `<ul class="nbx-cohorts">${x.cohorts.map(c => `<li><b dir="ltr">${esc(c[0])}</b><span>${esc(c[1])}</span><em class="nbx-num">${n(c[2])} طالباً</em></li>`).join('')}</ul>` : empty('لا توجد شعب بعد.')}
        <h3 class="nbx-sub">رمز الدعوة</h3><p class="nbx-code"><code dir="ltr">${esc(code)}</code><small>يُدخله الطالب عند التسجيل لينضم إلى المؤسسة</small></p>`}
      ${formEnd(isNew ? 'إضافة المؤسسة' : 'حفظ التغييرات')}
    </form>`, fd => {
      const name = String(fd.get('name') || '').trim(), domain = String(fd.get('domain') || '').trim().toLowerCase();
      if (!name) return 'اكتب اسم المؤسسة.';
      if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return 'النطاق البريدي غير صحيح، مثل: example.edu.jo';
      const seats = Math.max(1, parseInt(fd.get('seats'), 10) || 1);
      const data = { name, domain, type: fd.get('type'), plan: fd.get('plan'), seats, end: fd.get('end') || ahead(365), status: fd.get('status'), contact: String(fd.get('contact') || '').trim() };
      if (isNew) {
        S.unis.push(Object.assign({ id: uid('org'), used: 0, start: new Date().toISOString().slice(0, 10), invoice: 'none', cohorts: [] }, data));
        log(`أضاف مؤسسة «${name}»`, 'org');
        toast('أُضيفت المؤسسة.');
      } else {
        Object.assign(x, data);
        log(`حدّث بيانات «${name}»`, 'org');
        toast('حُفظت التغييرات.');
      }
      save();
    });
  }

  function userForm(x) {
    const isNew = !x;
    x = x || { name: '', email: '', role: 'student', org: S.unis[0].id, status: 'pending' };
    const orgs = '<option value="">منصة نبض</option>' + S.unis.map(o => `<option value="${o.id}"${o.id === x.org ? ' selected' : ''}>${esc(o.name)}</option>`).join('');
    openDrawer(isNew ? 'إضافة مستخدم' : 'تعديل: ' + x.name, `<form class="nbx-form" novalidate>
      ${field('الاسم', `<input name="name" required maxlength="80" value="${esc(x.name)}">`)}
      ${field('البريد الإلكتروني', `<input name="email" type="email" dir="ltr" required maxlength="120" value="${esc(x.email)}">`, 'بريد المؤسسة، ليتحقق النطاق')}
      <div class="nbx-form-2">${field('الدور', `<select name="role">${opts(ROLES, x.role)}</select>`)}
      ${field('المؤسسة', `<select name="org">${orgs}</select>`)}</div>
      ${isNew ? '' : field('الحالة', `<select name="status"><option value="active"${x.status === 'active' ? ' selected' : ''}>نشط</option><option value="pending"${x.status === 'pending' ? ' selected' : ''}>بانتظار الاعتماد</option><option value="suspended"${x.status === 'suspended' ? ' selected' : ''}>موقوف</option></select>`)}
      <div class="nbx-perm"><h3 class="nbx-sub">صلاحيات الدور</h3><p data-nbx-perm>${esc(PERMS[x.role] || '')}</p></div>
      ${formEnd(isNew ? 'إضافة المستخدم' : 'حفظ التغييرات', isNew ? '' : `<button type="button" class="nbx-btn nbx-btn-danger" data-nbx-act="user-delete" data-id="${x.id}" data-nbx-confirm="تأكيد الحذف">حذف</button>`)}
    </form>`, fd => {
      const name = String(fd.get('name') || '').trim(), email = String(fd.get('email') || '').trim().toLowerCase();
      if (!name) return 'اكتب اسم المستخدم.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'البريد الإلكتروني غير صحيح.';
      if (S.users.some(u => u.email === email && u !== x)) return 'هذا البريد مسجل لمستخدم آخر.';
      const data = { name, email, role: fd.get('role'), org: fd.get('org') || '' };
      if (isNew) {
        S.users.unshift(Object.assign({ id: uid('u'), status: 'pending', seen: '' }, data));
        log(`دعا ${name} بدور «${ROLES[data.role]}»`, 'users');
        toast('أُرسلت الدعوة.');
      } else {
        const before = x.role, st = fd.get('status');
        Object.assign(x, data, { status: st });
        log(before !== data.role ? `غيّر دور ${name} إلى «${ROLES[data.role]}»` : `حدّث حساب ${name}`, 'users');
        toast('حُفظت التغييرات.');
      }
      save();
    });
  }
  const PERMS = {
    admin: 'إدارة المنصة كاملة: المؤسسات، الاشتراكات، المحتوى، القوانين، والسجل.',
    uniadmin: 'مؤسسته فقط: طلابها وشعبها ومقاعدها وتقاريرها.',
    professor: 'شعبه فقط: إسناد الحالات، قراءة التقارير، وكتابة الملاحظات.',
    reviewer: 'يجرّب الحالات في الغرفة كأي متدرّب؛ تُسجَّل نتيجة مراجعته في ملف الحالة باسمه.',
    editor: 'كتابة الحالات وتعديلها كمسودات؛ لا ينشر دون مراجعة طبية.',
    student: 'التدريب في الغرف المفتوحة، وواجباته وتقاريره.',
    practitioner: 'التدريب في الغرف المفتوحة وسجل تعليمه المستمر.'
  };

  function caseSummary(c, rv) {
    const refs = S.sources.filter(x => x.cases.includes(c.id)).map(x => esc(x.org + ' ' + x.year)).join(' · ');
    return `<p class="nbx-case-en" dir="ltr">${esc(c.en)}</p>
      <dl class="nbx-dl">
        <div><dt>المريض</dt><dd>${esc(c.patient)} · ${esc(c.sex)} · ${n(c.age)} سنة</dd></div>
        <div><dt>السرير</dt><dd>${esc(c.bed)}</dd></div>
        <div><dt>المكان الصحيح</dt><dd>${esc(DISPO[c.dispo] || c.dispo)}</dd></div>
        <div><dt>الإصدار</dt><dd class="nbx-num">v1.0 · منشورة</dd></div>
      </dl>
      <h3 class="nbx-sub">الوصول</h3><p class="nbx-text">${esc(c.arrival)}</p>
      <blockquote class="nbx-quote">«${esc(c.opening)}»</blockquote>
      <h3 class="nbx-sub">محتوى الحالة</h3>
      <ul class="nbx-counts"><li><b class="nbx-num">${n(c.facts)}</b><span>معلومة في القصة المرضية</span></li><li><b class="nbx-num">${n(c.exam)}</b><span>نتيجة فحص سريري</span></li><li><b class="nbx-num">${n(c.tests)}</b><span>فحص مخبري وشعاعي</span></li><li><b class="nbx-num">${n(c.care)}</b><span>إجراء علاجي</span></li></ul>
      <h3 class="nbx-sub">لماذا هذا المكان</h3><p class="nbx-text">${esc(c.dispoWhy)}</p>
      <h3 class="nbx-sub">المراجع المرتبطة</h3><p class="nbx-text nbx-refs" dir="ltr">${refs || '—'}</p>
      <h3 class="nbx-sub">مسار النشر</h3>
      <ol class="nbx-steps"><li class="is-done"><b>كتابة الحالة</b><small>محرّر المحتوى</small></li><li class="${isApproved(c) ? 'is-done' : rv.reviewer ? 'is-now' : ''}"><b>المراجعة الطبية</b><small>${isApproved(c) ? (c.reviewed ? 'معتمدة' : 'اعتمدها ' + esc(rv.by || 'المراجع الطبي') + (rv.decidedAt ? ' · ' + esc(stamp(rv.decidedAt)) : '')) : rv.status === 'changes' ? 'طُلبت تعديلات · ' + esc(rv.by || '') : rv.reviewer ? 'لدى ' + esc(rv.reviewer) : 'لم تُسجَّل بعد'}</small></li><li class="is-done"><b>النشر للطلاب</b><small>${isApproved(c) ? 'معتمدة في بيئة العرض' : 'منشورة بعلامة «لم يراجعها طبيب بعد»'}</small></li></ol>
      ${rv.notes ? `<div class="nbx-banner nbx-banner-${rv.status === 'changes' ? 'warn' : 'info'}">${ic('alert')}<span><b>ملاحظات المراجع:</b> ${esc(rv.notes)}</span></div>` : ''}`;
  }
  const CHECKS = [
    ['facts', 'القصة والفحص والنتائج متسقة سريرياً'],
    ['doses', 'الأدوية والجرعات ووحداتها صحيحة'],
    ['guide', 'الإجراءات مطابقة للإرشاد المرتبط'],
    ['dispo', 'المكان الصحيح للمريض ومبرره صحيحان']
  ];
  function caseFile(c) {
    const rv = rvOf(c);
    const reviewers = S.users.filter(u => u.role === 'reviewer' && u.status === 'active');
    openDrawer(c.dx, `<div class="nbx-casefile">${caseSummary(c, rv)}
      ${isApproved(c) ? `<div class="nbx-banner nbx-banner-info nbx-assign">${ic('check')}<span><b>الحالة معتمدة طبياً.</b> ${c.reviewed ? 'معتمدة في ملف الحالات.' : 'سُجّل اعتماد ' + esc(rv.by || 'المراجع') + ' في بيئة العرض.'}</span></div>` : `<form class="nbx-form nbx-assign" novalidate>
        <h3 class="nbx-sub">تسجيل نتيجة المراجعة الطبية</h3>
        <p class="nbx-foot-note nbx-foot-flat">يجرّب المراجع الحالة في غرفة الطوارئ كأي متدرّب، ثم تُسجَّل نتيجته هنا باسمه وتاريخها.</p>
        ${field('المراجع الطبي', `<select name="reviewer">${reviewers.map(u => `<option${u.name === rv.reviewer ? ' selected' : ''}>${esc(u.name)}</option>`).join('')}</select>`, 'من المراجعين المسجلين في صفحة المستخدمين')}
        <fieldset class="nbx-field"><legend>ما تحقق منه المراجع</legend><div class="nbx-checks">${CHECKS.map(([k, t]) => `<label class="nbx-check"><input type="checkbox" name="chk" value="${k}"${(rv.checks || []).includes(k) ? ' checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div></fieldset>
        ${field('ملاحظات المراجع', `<textarea name="notes" rows="3" maxlength="400" placeholder="مطلوبة عند طلب التعديلات">${esc(rv.status === 'changes' ? rv.notes || '' : '')}</textarea>`)}
        <p class="nbx-form-err" role="alert" hidden></p>
        <div class="nbx-form-act"><button type="submit" name="decision" value="changes" class="nbx-btn nbx-btn-danger">تسجيل طلب تعديلات</button><button type="submit" name="decision" value="approve" class="nbx-btn nbx-btn-primary">${ic('check', 16)}تسجيل اعتماد المراجع</button></div>
      </form>`}
    </div>`, (fd, form, submitter) => {
      const decision = submitter && submitter.value, checks = fd.getAll('chk'), notes = String(fd.get('notes') || '').trim(), name = fd.get('reviewer');
      if (!name) return 'أضف مراجعاً طبياً من صفحة المستخدمين أولاً.';
      if (decision === 'approve' && checks.length < CHECKS.length) return 'لا يُسجَّل الاعتماد قبل اكتمال بنود التحقق الأربعة.';
      if (decision !== 'approve' && !notes) return 'اكتب ملاحظات المراجع قبل تسجيل طلب التعديلات.';
      S.review[c.id] = { reviewer: name, at: rv.at || new Date().toISOString(), status: decision === 'approve' ? 'approved' : 'changes', by: name, recordedBy: me(), decidedAt: new Date().toISOString(), notes, checks };
      log(decision === 'approve' ? `سجّل اعتماد ${name} لحالة «${c.dx}»` : `سجّل طلب ${name} تعديلات على حالة «${c.dx}»`, 'content');
      toast(decision === 'approve' ? 'سُجّل اعتماد الحالة.' : 'سُجّل طلب التعديلات.');
      save();
    });
  }

  let caseOk = () => true, extraCounts = () => ({}), orgCard = () => '', onAssign = () => {};
  function assignForm(x, cohort, only) {
    const due = ahead(7);
    openDrawer('إسناد حالة لشعبة', `<form class="nbx-form" novalidate>
      <p class="nbx-text"><b>${esc(x.name)}</b></p>
      ${field('الشعبة', `<select name="cohort">${x.cohorts.filter(c => !only || only.includes(c[1])).map(c => `<option${c[1] === cohort ? ' selected' : ''}>${esc(c[1])}</option>`).join('')}</select>`)}
      ${field('الحالة', `<select name="caseId">${(CASES || []).filter(c => caseOk(x.id, c.id)).map(c => `<option value="${c.id}">${esc(c.dx)}</option>`).join('')}</select>`, 'من حالات غرفة الطوارئ المتاحة لهذه المؤسسة')}
      ${field('موعد التسليم', `<input name="due" type="date" value="${due}">`)}
      <p class="nbx-foot-note">يصل الواجب إلى طلاب الشعبة في البوابة الجامعية، ويُحسب في مصفوفة الكفاءات بعد إنجازه.</p>
      ${formEnd('إسناد الحالة')}
    </form>`, fd => {
      const caseId = fd.get('caseId'), co = fd.get('cohort');
      if (!caseId || !co) return 'اختر الشعبة والحالة.';
      S.assign = S.assign || [];
      const rec = { id: uid('a'), org: x.id, cohort: co, caseId, due: fd.get('due') || due, at: new Date().toISOString(), by: me() };
      S.assign.unshift(rec);
      try { onAssign(rec, x); } catch (e) {}
      const c = (CASES || []).find(k => k.id === caseId);
      log(`أسند حالة «${c ? c.dx : caseId}» إلى شعبة ${co} (${x.name})`, 'content');
      toast('أُسندت الحالة للشعبة.');
      save();
    });
  }

  function caseNew() {
    openDrawer('حالة جديدة', `<form class="nbx-form" novalidate>
      ${field('عنوان الحالة', `<input name="title" required maxlength="90" placeholder="مثلاً: صدمة تحسسية بعد مضاد حيوي">`)}
      <div class="nbx-form-2">${field('القسم', `<select name="dept"><option>غرفة الطوارئ</option><option>الغرف التخصصية</option><option>غرف العمليات ثلاثية الأبعاد</option></select>`)}
      ${field('المستوى', `<select name="level"><option>مبتدئ</option><option selected>متوسط</option><option>متقدم</option></select>`)}</div>
      ${field('ملخص للمراجع', `<textarea name="summary" rows="3" maxlength="240" placeholder="المريض، الشكوى الرئيسية، وما يجب أن يفعله الطالب"></textarea>`)}
      <p class="nbx-foot-note">تُحفظ مسودة. يكمل محرّر المحتوى ملف المريض والمؤشرات والفحوصات، ثم تُسند للمراجعة الطبية.</p>
      ${formEnd('حفظ كمسودة')}
    </form>`, fd => {
      const title = String(fd.get('title') || '').trim();
      if (!title) return 'اكتب عنوان الحالة.';
      S.drafts.unshift({ id: uid('d'), title, dept: fd.get('dept'), level: fd.get('level'), summary: String(fd.get('summary') || '').trim(), at: new Date().toISOString() });
      log(`أنشأ مسودة حالة «${title}»`, 'content');
      toast('حُفظت المسودة.');
      save();
    });
  }

  function sourceNew() {
    const list = (CASES || []).map(c => `<label class="nbx-check"><input type="checkbox" name="cases" value="${c.id}"><span>${esc(c.dx)}</span></label>`).join('');
    openDrawer('إضافة مرجع', `<form class="nbx-form" novalidate>
      ${field('عنوان المرجع', `<input name="title" dir="ltr" required maxlength="160">`)}
      <div class="nbx-form-2">${field('الجهة', `<input name="org" dir="ltr" maxlength="60" placeholder="ESC, AHA, WHO…">`)}
      ${field('السنة', `<input name="year" type="number" min="1990" max="2030" value="${new Date().getFullYear()}">`)}</div>
      <fieldset class="nbx-field"><legend>الحالات المرتبطة</legend><div class="nbx-checks">${list || empty('تُحمَّل الحالات…')}</div></fieldset>
      ${formEnd('إضافة المرجع')}
    </form>`, fd => {
      const title = String(fd.get('title') || '').trim();
      if (!title) return 'اكتب عنوان المرجع.';
      S.sources.push({ id: uid('s'), title, org: String(fd.get('org') || '').trim(), year: parseInt(fd.get('year'), 10) || '', cases: fd.getAll('cases') });
      log(`أضاف مرجعاً: ${title}`, 'content');
      toast('أُضيف المرجع.');
      save();
    });
  }

  /* ---------- events ---------- */
  function disarm(b) { if (!b || !b.classList.contains('is-armed')) return; clearTimeout(b._t); b.classList.remove('is-armed'); b.innerHTML = b.dataset.label || b.innerHTML; }
  root.addEventListener('click', e => {
    const cf = e.target.closest('[data-nbx-confirm]');
    if (cf && !cf.disabled && !cf.classList.contains('is-armed')) {
      e.preventDefault(); e.stopImmediatePropagation();
      root.querySelectorAll('.is-armed').forEach(disarm);
      cf.dataset.label = cf.innerHTML; cf.classList.add('is-armed'); cf.textContent = cf.getAttribute('data-nbx-confirm');
      cf._t = setTimeout(() => disarm(cf), 4500);
      return;
    }
    const goBtn = e.target.closest('[data-nbx-go]');
    if (goBtn) { e.preventDefault(); go(goBtn.getAttribute('data-nbx-go'), goBtn.getAttribute('data-id')); return; }
    if (e.target.closest('[data-nbx-close]')) { closeDrawer(); return; }
    if (e.target.closest('#nbx-logout')) { try { logoutUser(); } catch (err) {} return; }
    const b = e.target.closest('[data-nbx-act]');
    if (!b || b.disabled) return;
    const a = b.getAttribute('data-nbx-act'), id = b.getAttribute('data-id'), v = b.getAttribute('data-v');
    const uni = () => S.unis.find(x => x.id === id), usr = () => S.users.find(x => x.id === id);
    switch (a) {
      case 'uni-filter': filters.uni = v; render(); break;
      case 'role-filter': filters.role = v; render(); break;
      case 'audit-filter': filters.audit = v; render(); break;
      case 'uni-new': uniForm(null); break;
      case 'uni-open': uniForm(uni()); break;
      case 'user-new': userForm(null); break;
      case 'user-open': userForm(usr()); break;
      case 'user-approve': { const x = usr(); x.status = 'active'; log(`اعتمد تسجيل ${x.name}`, 'users'); toast(`اعتُمد ${x.name}.`); render(); break; }
      case 'sub-renew': { const x = uni(); const d = new Date(x.end); d.setFullYear(d.getFullYear() + 1); x.end = d.toISOString().slice(0, 10); x.invoice = 'due'; log(`جدّد اشتراك «${x.name}» سنة`, 'billing'); toast('جُدّد الاشتراك وأُصدرت فاتورة.'); render(); break; }
      case 'sub-convert': { const x = uni(); x.plan = 'uni'; x.status = 'active'; x.seats = Math.max(x.seats, 100); x.end = ahead(365); x.invoice = 'due'; log(`حوّل «${x.name}» من فترة تجريبية إلى اشتراك`, 'billing'); toast('تحوّلت الفترة التجريبية إلى اشتراك.'); render(); break; }
      case 'sub-activate': { const x = uni(); x.status = 'active'; x.start = new Date().toISOString().slice(0, 10); x.invoice = 'due'; log(`فعّل عقد «${x.name}»`, 'billing'); toast('فُعّل العقد.'); render(); break; }
      case 'sub-paid': { const x = uni(); x.invoice = 'paid'; log(`سجّل دفع فاتورة «${x.name}»`, 'billing'); toast('سُجّل الدفع.'); render(); break; }
      case 'case-open': { const c = (CASES || []).find(x => x.id === id); if (c) caseFile(c); break; }
      case 'case-new': caseNew(); break;
      case 'source-new': loadCases().then(sourceNew); break;
      case 'rules-reset': S.rules = JSON.parse(JSON.stringify(S.rulesLive)); save(); render(); break;
      case 'rules-approve': S.rulesLive = JSON.parse(JSON.stringify(S.rules)); S.rulesState = 'live'; log('اعتمد تعديلات القوانين والقيود بعد المراجعة الطبية (بيئة العرض)', 'rules'); toast('اعتُمدت التعديلات في بيئة العرض.'); render(); break;
      case 'source-confirm': { const x = S.sources.find(k => k.id === id); if (x) { x.confirmed = me(); log(`أكّد ربط المرجع «${x.org} ${x.year}» بحالاته`, 'content'); toast('أُكّد المرجع.'); render(); } break; }
      case 'assign-new': { const x = uni(); if (x) loadCases().then(() => assignForm(x, b.getAttribute('data-cohort'))); break; }
      case 'req-done': { const r = S.requests.find(x => x.id === id); r.done = true; log(`نفّذ طلب ${r.kind === 'export' ? 'تصدير' : 'حذف'} بيانات ${r.who}`, 'privacy'); toast('نُفّذ الطلب.'); render(); break; }
      case 'audit-export': exportAudit(); break;
      case 'user-delete': { const x = usr(); if (x) { S.users = S.users.filter(k => k !== x); log(`حذف حساب ${x.name}`, 'users'); toast('حُذف المستخدم.'); closeDrawer(); render(); } break; }
      case 'draft-delete': { const d = S.drafts.find(k => k.id === id); if (d) { S.drafts = S.drafts.filter(k => k !== d); log(`حذف مسودة حالة «${d.title}»`, 'content'); toast('حُذفت المسودة.'); render(); } break; }
      case 'source-delete': { const x = S.sources.find(k => k.id === id); if (x) { S.sources = S.sources.filter(k => k !== x); log(`حذف المرجع «${x.org} ${x.year}»`, 'content'); toast('حُذف المرجع.'); render(); } break; }
      case 'reset-demo': { S = seed(); save(); paintAnnouncement(); toast('أُعيد ضبط بيانات العرض.'); render(); } break;
    }
    save();
  });
  root.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('[data-nbx-input]')) {
      filters[t.getAttribute('data-nbx-input')] = t.value;
      const pos = t.selectionStart; render();
      const again = root.querySelector(`[data-nbx-input="${t.getAttribute('data-nbx-input')}"]`);
      if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (err) {} }
    } else if (t.matches('[data-nbx-rule]') && t.type === 'range') {
      setRule(t, false);
      const out = t.parentElement.querySelector('b'); if (out) out.textContent = n(t.value);
    } else if (t.matches('[data-nbx-set="announceText"]')) {
      S.settings.announceText = t.value; save(); paintAnnouncement();
      const pv = root.querySelector('.nbx-announce-pv span'); if (pv) pv.textContent = t.value;
    } else if (t.matches('select[name="role"]')) {
      const p = t.form && t.form.querySelector('[data-nbx-perm]'); if (p) p.textContent = PERMS[t.value] || '';
    }
  });
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-nbx-rule]')) { setRule(t, true); return; }
    if (t.matches('[data-nbx-set]')) {
      const k = t.getAttribute('data-nbx-set');
      S.settings[k] = t.type === 'checkbox' ? t.checked : t.value;
      if (k === 'announce') log(t.checked ? 'أظهر إعلاناً على الصفحة الرئيسية' : 'أخفى إعلان الصفحة الرئيسية', 'system');
      else if (k === 'maintenance') log(t.checked ? 'فعّل وضع الصيانة' : 'أوقف وضع الصيانة', 'system');
      else if (k === 'erRealism') log(t.checked ? 'فعّل وضع الواقعية في غرفة الطوارئ' : 'أوقف وضع الواقعية في غرفة الطوارئ (النسخة المرجعية)', 'rules');
      else if (k === 'retention') log(`غيّر مدة الاحتفاظ بالسجلات إلى ${t.value} شهراً`, 'privacy');
      save(); paintAnnouncement();
      return;
    }
    if (t.matches('[data-nbx-file="users"]') && t.files && t.files[0]) importCsv(t.files[0]);
  });
  function setRule(t, rerender) {
    const [g, k] = t.getAttribute('data-nbx-rule').split('.');
    S.rules[g][k] = t.type === 'checkbox' ? t.checked : (t.type === 'range' || t.type === 'number') ? Math.max(0, parseInt(t.value, 10) || 0) : t.value;
    save();
    if (rerender) { const y = window.scrollY; render(); window.scrollTo(0, y); }
    else {
      const total = Object.values(S.rules.weights).reduce((a, v) => a + Number(v), 0);
      const tot = root.querySelector('.nbx-total');
      if (tot) { tot.className = 'nbx-total ' + (total === 100 ? 'is-ok' : 'is-bad'); tot.innerHTML = `المجموع <b class="nbx-num">${n(total)}</b> / 100${total === 100 ? '' : ' · يجب أن يساوي 100 قبل الإرسال'}`; }
    }
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer && !drawer.hidden) closeDrawer(); });

  function importCsv(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result || '').split(/\r?\n/).map(l => l.split(',').map(s => s.trim().replace(/^"|"$/g, ''))).filter(r => r.length >= 2 && r[0]);
      let added = 0;
      lines.forEach(([name, email, role]) => {
        email = (email || '').toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || S.users.some(u => u.email === email)) return;
        const dom = email.split('@')[1], org = (S.unis.find(o => dom === o.domain || dom.endsWith('.' + o.domain)) || {}).id || '';
        S.users.unshift({ id: uid('u'), name: name.slice(0, 80), email, role: role === 'professor' ? 'professor' : 'student', org, status: 'pending', seen: '' });
        added++;
      });
      if (added) log(`استورد ${added} مستخدماً من ملف CSV`, 'users');
      save();
      toast(added ? `أُضيف ${added} مستخدماً بانتظار الاعتماد.` : 'لم يُضف أحد: تأكد من الأعمدة (الاسم، البريد، الدور).');
      filters.role = added ? 'pending' : filters.role;
      render();
    };
    reader.readAsText(file);
  }
  function exportAudit() {
    const rows = [['الوقت', 'المستخدم', 'الإجراء', 'النوع']].concat(S.audit.map(r => [r.at, r.who, r.what, KINDS[r.kind] || r.kind]));
    const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'nabd-audit-log.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- the announcement on the signed-in home (the one setting that already reaches the students) ---------- */
  function paintAnnouncement() {
    const home = document.getElementById('view-home');
    if (!home) return;
    let el = document.getElementById('nbx-home-announce');
    const show = !!(S.settings.announce && String(S.settings.announceText || '').trim());
    if (!show) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'nbx-home-announce';
      el.className = 'nbx-announce';
      el.setAttribute('role', 'status');
      home.insertBefore(el, home.firstChild);
    }
    el.innerHTML = `${ic('pulse', 16)}<span><b>إعلان من إدارة المنصة</b> ${esc(S.settings.announceText)}</span>`;
  }
  window.addEventListener('storage', e => { if (e.key === KEY) { load(); paintAnnouncement(); render(); } });

  /* ---------- the interface the university console (admin/020-university-console.js) builds on ---------- */
  window.NabdConsole = Object.freeze({
    root, state: () => S, save, log, render, go, openDrawer, closeDrawer, ic, chip, esc, n, pct, bar, card, empty, day, stamp,
    ahead, uid, toast, field, formEnd, loadCases, cases: () => CASES, rng, band, me, orgFigures, competencyMatrix, reviewOf,
    isApproved, DOMAINS, WEIGHTS, ERRORS, CASE_SHORT, PLANS, STATUS, INVOICE, PLATFORM_SCORE,
    setCaseFilter: fn => { caseOk = fn; }, setCounts: fn => { extraCounts = fn; }, setOrgCard: fn => { orgCard = fn; }, setOnAssign: fn => { onAssign = fn; }, consoleRole, assignForm,
    addPages: defs => {
      Object.entries(defs).forEach(([k, [title, sub, fn]]) => { PAGES[k] = [title, sub]; PAGE_FN[k] = fn; });
      try { const p = sessionStorage.getItem('nbx_page'); if (p && defs[p]) page = p; } catch (e) {}
    }
  });

  /* ---------- start: a stored console session opens on the console (after the fragments that follow) ---------- */
  paintAnnouncement();
  setTimeout(() => { try { if (isAdmin() && typeof currentView !== 'undefined' && currentView === 'home') navigateTo('admin'); else if (!root.classList.contains('hidden')) render(); } catch (e) {} }, 0);
})();
