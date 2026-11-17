    /* Registration's track cards: one is pressed at a time; app/020-access.js reads the pressed one. */
    function nbSetRegRole(r) {
      document.querySelectorAll('#reg-rolecards [data-rc]').forEach(b => {
        b.classList.toggle('is-on', b.dataset.rc === r);
        b.setAttribute('aria-pressed', b.dataset.rc === r ? 'true' : 'false');
      });
    }

    function initAuthRoles() {
      document.querySelectorAll('#reg-rolecards [data-rc]').forEach(b => b.addEventListener('click', () => nbSetRegRole(b.dataset.rc)));
    }
