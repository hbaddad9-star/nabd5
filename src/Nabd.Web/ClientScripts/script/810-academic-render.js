    /* The academic part of a student's home: her section's assignments and her results (790). The supervisor's
       tools are in his own console (admin/030-supervisor-console.js). */
    function nb8RenderAcademic(u) {
      if (u && !nb8IsProf(u)) nb8RenderStudentUni(u);
    }
