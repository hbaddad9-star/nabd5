    /* The student's academic part: a result not yet published by the supervisor cannot be opened. An assigned
       case opens through the room's own layer (erplus/040-open-case.js). */
    function nb8Init() {
      document.addEventListener('click', (e) => {
        const t = e.target.closest && e.target.closest('[data-nb8-locked]');
        if (t) showToast('هذه النتيجة غير منشورة بعد ولا يمكن فتحها قبل أن يعتمدها المشرف.');
      });
    }
