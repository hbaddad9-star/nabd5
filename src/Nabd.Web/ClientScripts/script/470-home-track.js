    /* The signed-in home by the trainee's track: the welcome line and the "what will you do now?" guide (780).
       Called on sign-in (130) and after a session is saved (the room, er/580, and its assessment layer). */
    function renderHomePath(u) {
      if (!u || u.role === 'professor') return;
      const track = nbTrackOf(u), nurse = track === 'nursing';
      const ws = document.getElementById('home-welcome-sub');
      if (ws) ws.textContent = !track ? 'غرفة الطوارئ مفتوحة، وباقي الغرف تُفتح لاحقاً.' : nurse
        ? 'مسار التمريض: في غرفة الطوارئ تتولى الحالة بتقييم منهجي ومراقبة وسلامة دواء. باقي الغرف تُفتح لاحقاً.'
        : 'مسار الطب: في غرفة الطوارئ أنت الطبيب المقيم، من المقابلة حتى تسليم الحالة. باقي الغرف تُفتح لاحقاً.';
      try { nb8RenderGuide(u); } catch (e) { console.error(e); }
    }
