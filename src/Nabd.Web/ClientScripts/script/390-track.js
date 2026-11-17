    function nbTrackOf(u) {
      if (!u || u.role === 'professor') return null;
      if (u.track) return u.track;
      if (u.role === 'practitioner') return 'nursing';
      return /^الطب/.test(u.specialty || '') ? 'medicine' : 'nursing';
    }

