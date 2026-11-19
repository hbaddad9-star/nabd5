  /* ==========================================================================================================
     096 · the operating room's chat: the supervisor and the patient speak, the trainee answers by an action (the
     buttons under the chat) or by a typed message. A session is six steps of the preparation for an appendectomy,
     before the incision; each step has the expected answer and, for some, a premature or wrong one that the
     supervisor corrects. An action also moves the 3D room (NabdOrRoom.act): the face for the patient's identity, the
     abdomen for the examination, the monitor, the surgeon's place.
     The register is formal and plain: close to standard Arabic, with no colloquial forms and no nicknames; people are
     named by their role and, for the patient, by his name («المريض سامر خالد»).
     The lines are training content written for the prototype and not reviewed by a physician (the page says so);
     no dose, value or threshold is stated. Typed messages are matched by keywords, in the browser, after the Arabic
     is normalised, and the matching accepts formal and colloquial forms alike; nothing is sent anywhere and nothing is stored.
     ========================================================================================================== */
  {
    const log = byId('or-chat-log'), actionsBox = byId('or-chat-actions'), form = byId('or-chat-form'), input = byId('or-chat-input');
    const stepLabel = byId('or-chat-step'), bar = byId('or-progress-bar');
    const WHO = { sup: 'المشرف', pat: 'المريض سامر خالد', me: 'أنت', sys: '' };

    // Arabic as typed, reduced to one spelling: no diacritics or tatweel, one alef, ta marbuta as ha, alef maqsura as ya
    const norm = s => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();

    /* the session. Each action: its button label, the trainee's line, what it matches when typed, the room's button
       it presses, and the replies; kind "ok" moves to the next step, "wrong" is corrected, "aside" is answered only. */
    const STEPS = [
      {
        sup: 'مرحباً بك في غرفة العمليات. المريض شاب حضر لإجراء استئصال الزائدة الدودية. ما أول خطوة تقوم بها قبل أي إجراء؟',
        hint: 'ابدأ بالتحقق من هوية المريض: اطلب منه اسمه الكامل وتاريخ ميلاده.',
        actions: [
          { kind: 'ok', label: 'التحقق من هوية المريض', room: 'camera-face', say: 'مرحباً، أنا الطبيب المتدرّب. هل تتفضّل بذكر اسمك الكامل وتاريخ ميلادك؟', match: /اسم|هوي|عرف|ميلاد|مين انت|من انت|بطاق|اسوار|تحقق|اتحقق/,
            replies: [['pat', 'أهلاً يا دكتور. اسمي سامر خالد، ومواليد 2001.'], ['sup', 'ممتاز. الاسم وتاريخ الميلاد مطابقان للسوار وللملف، وبذلك تأكّدنا من أنه المريض الصحيح.']] },
          { kind: 'wrong', label: 'بدء التعقيم', say: 'لنبدأ بالتعقيم.', match: /عقم|تعقيم|ابدا العمليه|شق|نبلش العمليه/,
            replies: [['sup', 'ليس الآن. لا نلمس المريض قبل التحقق من هويته ومن موافقته.']] },
        ],
      },
      {
        sup: 'جيد. تحقّق الآن من الموافقة، واسأله عن الحساسية وعن آخر مرة تناول فيها الطعام أو الشراب.',
        hint: 'اسأله: هل لديك حساسية من أي دواء؟ ومتى تناولت الطعام أو الشراب آخر مرة؟',
        actions: [
          { kind: 'ok', label: 'السؤال عن الحساسية والصيام', say: 'سيد سامر، هل لديك حساسية من أي دواء؟ ومتى تناولت الطعام أو الشراب آخر مرة؟', match: /حساس|اكل|شرب|صيام|صايم|موافق|وقعت|توقيع|تناول/,
            replies: [['pat', 'ما بعرف إنه عندي حساسية من أي دوا. آخر أكل أكلته كان مبارح بالليل، ومن وقتها ما شربت إشي.'], ['sup', 'حسناً. والموافقة الخطية موقَّعة في الملف. لننتقل إلى الخطوة التالية.']] },
          { kind: 'aside', label: 'السؤال عن عمله', say: 'ما طبيعة عملك يا سيد سامر؟', match: /بتشتغل|شغلك|مهنت|وظيف|عملك|تعمل/,
            replies: [['pat', 'بشتغل محاسب.'], ['sup', 'حسن أن تتعرّف إليه، لكن المهم الآن هو الحساسية والصيام.']] },
        ],
      },
      {
        sup: 'قبل البدء، علينا أن نفحص البطن بأنفسنا. ما الذي ستفحصه؟',
        hint: 'شكوى المريض في البطن: افحص البطن، وخاصة الجهة اليمنى السفلية.',
        actions: [
          { kind: 'ok', label: 'فحص البطن', room: 'camera-abdomen', say: 'سأفحص بطنك بلطف. أخبرني أين تشعر بالألم تحديداً.', match: /بطن|جس|افحص|الربع|تحت ع اليمين|تحت على اليمين|اسفل/,
            replies: [['pat', 'آه… هون، تحت عاليمين. بيوجع كثير لما تضغط.'], ['sup', 'صحيح. موضع الألم يتوافق مع التشخيص، ويجب توثيق الفحص قبل العملية.']] },
          { kind: 'wrong', label: 'فحص الصدر', room: 'camera-torso', say: 'سأبدأ بفحص الصدر.', match: /صدر|رئه|رئتين|قلب/,
            replies: [['sup', 'فحص الصدر من اختصاص طبيب التخدير، أما شكوى المريض فهي في البطن. ركّز على البطن.']] },
        ],
      },
      {
        sup: 'قبل التخدير، علينا الاطمئنان على علاماته الحيوية. ماذا تفعل؟',
        hint: 'افتح شاشة العلامات الحيوية واقرأها.',
        actions: [
          { kind: 'ok', label: 'فتح شاشة العلامات الحيوية', room: 'open-vitals', say: 'سأطّلع على شاشة المراقبة.', match: /علامات|حيوي|مونيتور|مونيتر|مراقب|شاشه|ضغط|نبض|اكسجين|vital|اطلع/,
            replies: [['sup', 'جيد. أبقِ نظرك على الشاشة طوال العملية، وأخبرني فوراً بأي تغيّر.']] },
          { kind: 'wrong', label: 'بدء التخدير فوراً', say: 'لنبدأ التخدير الآن.', match: /خدر|تخدير|بنج|نوم/,
            replies: [['sup', 'التخدير من مهام طبيب التخدير، ويكون بعد الاطمئنان على العلامات الحيوية. افتح شاشة المراقبة أولاً.']] },
        ],
      },
      {
        sup: 'الآن وقفة الأمان الجماعية قبل الشق (Time-out). أعلن للفريق اسم المريض، والإجراء، وجهة العملية.',
        hint: 'قل: المريض سامر خالد، الإجراء استئصال الزائدة الدودية، الجهة اليمنى.',
        actions: [
          { kind: 'ok', label: 'إعلان وقفة الأمان', say: 'وقفة الأمان: المريض سامر خالد، الإجراء استئصال الزائدة الدودية، الجهة اليمنى.', match: t => /يمين|يمني/.test(t) && /زائد|سامر/.test(t) && !/يسار|يسري/.test(t),
            replies: [['sup', 'ممتاز. اتفق الفريق كله على المريض والإجراء والجهة، وبذلك نتجنّب أخطر الأخطاء.']] },
          { kind: 'wrong', label: 'إعلان الجهة اليسرى', say: 'وقفة الأمان: المريض سامر خالد، الإجراء استئصال الزائدة، الجهة اليسرى.', match: /يسار|يسري/,
            replies: [['sup', 'توقّف! الزائدة الدودية في الجهة اليمنى. وُجدت وقفة الأمان لالتقاط مثل هذا الخطأ. أعلنها من جديد بشكل صحيح.']] },
        ],
      },
      {
        sup: 'كل شيء جاهز. خذ مكانك عند موقع الجرّاح.',
        hint: 'انتقل إلى موقع الجرّاح.',
        actions: [
          { kind: 'ok', label: 'الانتقال إلى موقع الجرّاح', room: 'camera-surgeon', say: 'أنا جاهز في موقع الجرّاح.', match: /جراح|موقع|مكان|جاهز/,
            replies: [['sup', 'عمل مرتّب. تنتهي هنا هذه النسخة التجريبية؛ وستُضاف خطوات العملية نفسها بعد مراجعة الأطباء.']] },
        ],
      },
    ];
    // words that only move the room, at any step
    const VIEWS = [[/وجه|راس/, 'camera-face', 'الوجه'], [/صدر/, 'camera-torso', 'الصدر'], [/بطن/, 'camera-abdomen', 'البطن'], [/تخدير/, 'camera-anesthesia', 'جهة التخدير'], [/ادوات|صينيه/, 'camera-instruments', 'الأدوات'], [/الغرفه كلها|مدخل/, 'camera-room', 'مدخل الغرفة']];
    const LOOK = /وريني|ورجيني|فرجيني|ارني|اريني|اعرض|بدي اشوف|اريد ان ار|خليني اشوف|روح|اذهب|انتقل|حول|لف/;

    let step = 0, hints = 0, slips = 0, busy = false, started = false;

    function line(who, text) {
      const li = document.createElement('li');
      li.className = 'or-msg is-' + who;
      if (WHO[who]) { const b = document.createElement('b'); b.textContent = WHO[who]; li.appendChild(b); }
      const p = document.createElement('p'); p.textContent = text; li.appendChild(p);
      log.appendChild(li);
      log.scrollTop = log.scrollHeight;
    }
    function typing(who) {
      const li = document.createElement('li');
      li.className = 'or-msg is-' + who + ' is-typing';
      li.innerHTML = '<b>' + WHO[who] + '</b><p><i></i><i></i><i></i></p>';
      log.appendChild(li);
      log.scrollTop = log.scrollHeight;
      return li;
    }
    // the replies one after the other, each after a short "typing", then what comes next
    function say(replies, then) {
      busy = true; draw();
      const next = i => {
        if (i >= replies.length) { busy = false; if (then) then(); draw(); return; }
        const [who, text] = replies[i];
        const t = typing(who);
        setTimeout(() => { t.remove(); line(who, text); next(i + 1); }, Math.min(1400, 450 + text.length * 12));
      };
      next(0);
    }
    function progress() {
      const done = Math.min(step, STEPS.length);
      stepLabel.textContent = step >= STEPS.length ? 'انتهت الجلسة' : 'الخطوة ' + (step + 1) + ' من ' + STEPS.length;
      bar.style.width = (done / STEPS.length * 100) + '%';
    }
    function draw() {
      progress();
      actionsBox.textContent = '';
      input.disabled = busy;
      if (step >= STEPS.length) {
        const again = document.createElement('button');
        again.type = 'button'; again.className = 'or-act is-main focus-ring'; again.textContent = 'بدء الجلسة من جديد';
        again.disabled = busy;
        again.addEventListener('click', restart);
        actionsBox.appendChild(again);
        return;
      }
      STEPS[step].actions.forEach(a => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'or-act focus-ring'; b.textContent = a.label; b.disabled = busy;
        b.addEventListener('click', () => answer(a));
        actionsBox.appendChild(b);
      });
      const h = document.createElement('button');
      h.type = 'button'; h.className = 'or-act is-hint focus-ring'; h.textContent = 'تلميح'; h.disabled = busy;
      h.addEventListener('click', hint);
      actionsBox.appendChild(h);
    }
    function answer(a, typed) {
      if (busy || step >= STEPS.length) return;
      line('me', typed || a.say);
      if (a.room) NabdOrRoom.act(a.room);
      if (a.kind === 'wrong') slips++;
      say(a.replies, a.kind === 'ok' ? advance : null);
    }
    function advance() {
      step++;
      if (step < STEPS.length) { say([['sup', STEPS[step].sup]]); return; }
      progress();
      line('sys', 'انتهت الجلسة: ' + STEPS.length + ' من ' + STEPS.length + ' خطوات · التلميحات المطلوبة: ' + hints + ' · الأخطاء التي صحّحها المشرف: ' + slips + '.');
    }
    function hint() {
      if (busy || step >= STEPS.length) return;
      hints++;
      say([['sup', STEPS[step].hint]]);
    }
    const matches = (a, t) => (typeof a.match === 'function' ? a.match(t) : a.match.test(t));
    function typedMessage(text) {
      const t = norm(text);
      const acts = step < STEPS.length ? STEPS[step].actions : [];
      // the expected answer first; then a request to look somewhere («أرني جهة التخدير») only moves the room; then the rest
      const ok = acts.find(a => a.kind === 'ok' && matches(a, t));
      if (ok) { answer(ok, text); return; }
      const v = LOOK.test(t) && VIEWS.find(([re]) => re.test(t));
      if (v) { line('me', text); NabdOrRoom.act(v[1]); line('sys', 'تحرّكت الكاميرا إلى ' + v[2] + '.'); return; }
      const other = acts.find(a => matches(a, t));
      if (other) { answer(other, text); return; }
      line('me', text);
      if (/ساعد|تلميح|شو اعمل|شو بعمل|ماذا افعل|مش عارف|لا اعرف|لا اعلم/.test(t) && step < STEPS.length) { hints++; say([['sup', STEPS[step].hint]]); return; }
      if (/^(مرحبا|اهلا|السلام|هلا|صباح|مسا)/.test(t)) { say([['pat', 'أهلين يا دكتور.']]); return; }
      const w = VIEWS.find(([re]) => re.test(t));
      if (w) { NabdOrRoom.act(w[1]); line('sys', 'تحرّكت الكاميرا إلى ' + w[2] + '.'); return; }
      say([['sup', step < STEPS.length ? 'لم أفهم قصدك تماماً. ' + STEPS[step].hint : 'انتهت الجلسة. يمكنك بدؤها من جديد.']]);
    }
    function restart() {
      step = 0; hints = 0; slips = 0;
      log.textContent = '';
      NabdOrRoom.act('camera-room');
      line('sys', 'جلسة جديدة: تجهيز مريض لاستئصال الزائدة الدودية، قبل الشق.');
      say([['sup', STEPS[0].sup]]);
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text || busy) return;
      input.value = '';
      typedMessage(text);
    });
    // the first time the page is opened, the supervisor opens the session
    document.addEventListener('nb:or-open', () => { if (started) return; started = true; restart(); });
    draw();
  }
