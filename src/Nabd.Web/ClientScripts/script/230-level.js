    /* The trainee's level: an estimate from the year of study (a practitioner counts as intermediate). The level
       quiz is for later (decision log D-60), so nothing else decides it yet. */
    const NB_LEVELS = { 1: { name: 'مبتدئ', cls: 'l1' }, 2: { name: 'متوسط', cls: 'l2' }, 3: { name: 'متقدم', cls: 'l3' } };
    function nbDerivedLevel(u) {
      if (u.role === 'professor') return 0;
      if (u.role === 'practitioner') return 2;
      return (u.year || 4) <= 2 ? 1 : (u.year || 4) === 3 ? 2 : 3;
    }
