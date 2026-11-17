


    /* Utility: Format elapsed session timestamp MM:SS */

    
    function showToast(msg) {
      const el = document.getElementById('calm-toast');
      const txt = document.getElementById('calm-toast-text');
      if (!el || !txt) return;
      txt.textContent = msg;
      el.classList.remove('hidden');
      clearTimeout(window._toastTimer);
      window._toastTimer = setTimeout(() => el.classList.add('hidden'), 4500);
    }

    function getRoleArabicName(roleCode) {
      if (roleCode === 'professor' || roleCode === 'doctor') return 'أستاذ جامعي';
      if (roleCode === 'practitioner') return 'ممارس صحي';
      return 'طالب جامعي';
    }

