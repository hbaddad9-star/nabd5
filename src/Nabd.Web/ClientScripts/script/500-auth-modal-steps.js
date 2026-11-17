
    function switchAuthModalTab(tab) {
      const isLogin = tab === 'login';
      document.getElementById('auth-pane-login')?.classList.toggle('hidden', !isLogin);
      document.getElementById('auth-pane-register')?.classList.toggle('hidden', isLogin);
      const title = document.getElementById('auth-modal-title');
      if (title) title.textContent = isLogin ? 'تسجيل الدخول' : 'إنشاء حساب';
    }

