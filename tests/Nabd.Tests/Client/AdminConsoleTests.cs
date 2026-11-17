using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Nabd.Tests.Client;

/// <summary>
/// The admin console prototype (V6.7, ADR 0015) as the browser receives it: reached through a demo account on the
/// sign-in screen, drawn by its own script bundle, styled by its own stylesheet, and kept away from the rooms and
/// their chat (the owner's one fixed rule): no selector, element or script call of the console reaches them.
/// </summary>
public class AdminConsoleTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public AdminConsoleTests(WebApplicationFactory<Program> factory) => _client = factory.CreateClient();

    [Fact]
    public async Task The_console_is_reached_through_a_demo_account_and_starts_hidden()
    {
        var page = await Text("/");
        Assert.Contains("data-demo-login=\"admin\"", page);
        Assert.DoesNotContain("data-demo-login=\"reviewer\"", page); // V6.7.3: no reviewer console (owner)
        Assert.Contains("data-demo-login=\"uniadmin\"", page); // V6.7.2: the university's console
        Assert.Matches("<section id=\"view-admin\" class=\"hidden\"", page);
        foreach (var id in new[] { "nbx-main", "nbx-drawer", "nbx-logout", "nbx-title" }) Assert.Contains($"id=\"{id}\"", page);
        foreach (var p in new[] { "overview", "unis", "users", "subs", "cases", "sources", "rules", "audit", "settings" })
            Assert.Contains($"data-nbx-go=\"{p}\"", page);
        Assert.Contains("<script src=\"js/admin.js\" defer></script>", page);
        Assert.Contains("<link rel=\"stylesheet\" href=\"css/admin.css\">", page);
    }

    [Fact]
    public async Task The_console_says_it_runs_on_demo_data()
    {
        var page = await Text("/");
        var view = page[page.IndexOf("<section id=\"view-admin\"", StringComparison.Ordinal)..];
        Assert.Contains("بيئة العرض", view);
    }

    [Fact]
    public async Task The_stylesheet_reaches_only_the_console_and_the_home_announcement()
    {
        var css = Regex.Replace(await Text("/css/admin.css"), @"/\*.*?\*/", "", RegexOptions.Singleline);
        css = Regex.Replace(css, @"@keyframes[^{]*\{([^{}]*\{[^{}]*\})*\s*\}", ""); // a keyframe's steps are not selectors
        css = Regex.Replace(css, @"@[^{;]+\{", "{"); // the preludes of @media blocks
        var selectors = Regex.Matches(css, @"([^{}@]+)\{")
            .SelectMany(m => m.Groups[1].Value.Split(','))
            .Select(s => s.Trim())
            .Where(s => s.Length > 0 && !Regex.IsMatch(s, @"^(from|to|\d+%)$") && !s.StartsWith('('))
            .ToList();
        Assert.True(selectors.Count > 150, $"only {selectors.Count} selectors read");
        foreach (var s in selectors)
            Assert.True(s.StartsWith("#view-admin", StringComparison.Ordinal) || s.StartsWith("body.nbx-admin ", StringComparison.Ordinal)
                || s == "body.nbx-drawer-open" || s.StartsWith("#view-home .nbx-announce", StringComparison.Ordinal), $"selector outside the console: {s}");
        Assert.DoesNotContain("view-er", css);
        Assert.DoesNotContain("view-sim", css);
    }

    [Fact]
    public async Task There_is_no_reviewer_console_and_the_review_is_recorded_under_the_reviewers_name()
    {
        // owner, 2026-11-15: the medical reviewer tries a case in the room as any trainee does; no account of its own
        var js = await Text("/js/admin.js");
        Assert.DoesNotContain("DEMO_ACCOUNTS.reviewer", js);
        Assert.DoesNotContain("data-nbx-go=\"review\"", await Text("/"));
        // the admin records the decision; the record carries the reviewer's name and who recorded it
        Assert.Contains("by: name, recordedBy: me()", js);
        Assert.Contains("checks.length < CHECKS.length", js);
    }

    [Fact]
    public async Task One_sign_in_for_everyone_and_the_email_decides()
    {
        var js = await ConsoleAndApp();
        // the roster replaces join codes and manual approval
        foreach (var gone in new[] { "joinCode", "stu-approve", "manualApprove" }) Assert.DoesNotContain(gone, js);
        Assert.Contains("roster-add", js);
        // the sign-in forms show what an e-mail is recognised as
        Assert.Contains("t.id !== 'login-email' && t.id !== 'reg-email'", js);
        var page = await Text("/");
        Assert.Contains("id=\"login-email\"", page);
        Assert.Contains("id=\"reg-email\"", page);
    }

    [Fact]
    public async Task The_university_manages_its_own_people_and_cannot_write_cases()
    {
        var page = await Text("/");
        foreach (var p in new[] { "uhome", "ucourses", "ustaff", "ustudents", "ulibrary", "ureports", "usettings" })
            Assert.Contains($"data-nbx-go=\"{p}\" hidden", page); // shown only to the university's role
        var js = await Text("/js/admin.js");
        Assert.Contains("DEMO_ACCOUNTS.uniadmin", js);
        var pages = Regex.Match(js, @"uniadmin: \[([^\]]+)\]").Groups[1].Value;
        Assert.Equal("'uhome', 'ucourses', 'ustaff', 'ustudents', 'ulibrary', 'ureports', 'usettings'", pages);
        // the owner's rule: an institution chooses among the platform's cases; it never adds or edits one
        var university = js[js.IndexOf("The university's console", StringComparison.Ordinal)..];
        foreach (var forbidden in new[] { "case-new", "caseNew(", "drafts", "rulesLive", "S().rules", "weights" })
            Assert.DoesNotContain(forbidden, university);
        Assert.Contains("data-nbxu-case", university); // its one control over a case: open or closed for its students
    }

    [Fact]
    public async Task The_supervisor_works_inside_his_sections_and_the_universitys_settings()
    {
        var page = await Text("/");
        foreach (var p in new[] { "shome", "sassign", "sstudents", "sresults" })
            Assert.Contains($"data-nbx-go=\"{p}\" hidden", page);
        var js = await Text("/js/admin.js");
        var pages = Regex.Match(js, @"professor: \[([^\]]+)\]").Groups[1].Value;
        Assert.Equal("'shome', 'sassign', 'sstudents', 'sresults'", pages);
        // only a staff member of a university opens it; other professor accounts keep the legacy home
        Assert.Contains("r === 'professor' && authState.user.org ? 'professor' : ''", js);
        // what he may do is read from the university's settings, never fixed here
        Assert.Contains("assign: co ? p.coordAssign : p.supAssign", js);
        Assert.Contains("publish: co ? true : p.supPublish", js);
        Assert.Contains("names: p.supSeesNames", js);
    }

    [Fact]
    public async Task Deleting_asks_twice_in_place()
    {
        // one way to delete in every console: the first click arms the button, the second does it
        var js = await Text("/js/admin.js");
        Assert.Contains("closest('[data-nbx-confirm]')", js);
        Assert.DoesNotContain("window.confirm", js);
        foreach (var act in new[] { "user-delete", "source-delete", "draft-delete", "course-delete", "section-delete", "staff-delete", "roster-remove", "reset-demo", "unassign" })
            Assert.Matches("data-nbxu?s?-act=\"" + act + "\"[^>]*data-nbx-confirm", js);
    }

    [Fact]
    public async Task Motion_runs_on_arrival_only_and_respects_reduced_motion()
    {
        var js = await Text("/js/admin.js");
        Assert.Contains("prefers-reduced-motion: reduce", js);
        Assert.Contains("'IntersectionObserver' in window", js);
        Assert.Contains("if (shownKey !== lastShown)", js); // a redraw of the same page does not move
        var css = await Text("/css/admin.css");
        Assert.Contains(".nbx-rv", css);
    }

    [Fact]
    public async Task Registration_asks_no_section_code_and_no_password()
    {
        var page = await Text("/");
        foreach (var gone in new[] { "reg-code", "reg-pass", "login-pass", "reg-uni" }) Assert.DoesNotContain($"id=\"{gone}", page);
    }

    [Fact]
    public async Task Everyone_signs_in_directly_and_only_a_universitys_student_sees_the_academic_part()
    {
        var page = await Text("/");
        // the ready accounts are the three administrations; a trainee signs in with his e-mail
        Assert.DoesNotContain("data-demo-login=\"rana\"", page);
        Assert.DoesNotContain("data-demo-login=\"med_student\"", page);
        var js = await ConsoleAndApp();
        Assert.Contains("f.id !== 'auth-pane-login'", js);     // the sign-in form enters directly
        Assert.Contains("closest('#reg-next-btn')", js);        // and so does registration
        Assert.Contains("kind: 'blocked'", js);                 // a contracted domain off the roster is refused
        Assert.Contains("hide = student && !uni", js);          // an independent trainee: no academic part
        foreach (var id in new[] { "home-quick-uni-btn", "app-nav-uni", "home-student-uni-section", "side-uni-portal-btn" })
        {
            Assert.Contains($"'{id}'", js);
            Assert.Contains($"id=\"{id}\"", page);
        }
    }

    [Fact]
    public async Task The_er_realism_mode_is_a_switchable_layer_over_the_room()
    {
        var page = await Text("/");
        Assert.Contains("<script src=\"js/er-plus.js\" defer></script>", page);
        Assert.Contains("<link rel=\"stylesheet\" href=\"css/er-plus.css\">", page);
        var js = await Text("/js/er-plus.js");
        // switched off by Nabd's administration or by ?realism=off; then the room is the reference version
        Assert.Contains("settings.erRealism === false", js);
        Assert.Contains("realism=off", js);
        Assert.Contains("view.classList.toggle('nbp-on', on)", js);
        // dose hints for first and second years only, and restored when the mode is off
        Assert.Contains("if (year <= 2) return 'on'", js);
        Assert.Contains("restoreHints()", js);
        // every style rule waits for the mode's class
        var css = Regex.Replace(await Text("/css/er-plus.css"), @"/\*.*?\*/", "", RegexOptions.Singleline);
        css = Regex.Replace(css, @"@keyframes[^{]*\{([^{}]*\{[^{}]*\})*\s*\}", "");
        css = Regex.Replace(css, @"@[^{;]+\{", "{");
        foreach (Match m in Regex.Matches(css, @"([^{}]+)\{"))
            foreach (var sel in m.Groups[1].Value.Split(',').Select(x => x.Trim()).Where(x => x.Length > 0))
                Assert.True(sel.StartsWith("#view-er.nbp-on", StringComparison.Ordinal), $"rule outside the mode: {sel}");
    }

    [Fact]
    public async Task The_er_assessment_layer_rides_on_the_same_switch()
    {
        var js = await Text("/js/er-plus.js");
        // the assessment layer runs only while the realism mode is on, and never edits the room
        Assert.Contains("on = !!E && !!P() && P().enabled()", js);
        Assert.Contains("window.__nbPlus = { enabled,", js);
        // the approved weights of the doctor's rubric: 35, 15, 10, 10, 15, 15
        foreach (var axis in new[] { "k: 'safe', label: 'السلامة والإجراءات الحرجة', max: 35", "k: 'assess', label: 'التقييم وإعادة التقييم', max: 15",
                     "k: 'dx', label: 'التشخيص', max: 10", "k: 'tests', label: 'الفحوصات', max: 10", "k: 'team', label: 'التواصل والفريق', max: 15", "k: 'hand', label: 'التسليم والوجهة', max: 15" })
            Assert.Contains(axis, js);
        // a critical error fails the case whatever the number says; a dose of three times the limit is one when it
        // reached the patient, and a near miss (the nurse stopped it) is a major error
        Assert.Contains("passed = total >= mark && !critical.length", js);
        Assert.Contains("if (reached && x >= 3) critical.push", js);
        Assert.Contains("وأوقفتها الممرضة", js);
        // the resuscitation team is offered once the monitor is urgent or critical
        Assert.Contains("needStage: 2", js);
        // the handover's numbers are held against the monitor: two readings at least
        Assert.Contains("ok: near.length >= 2", js);
        // asking for help goes through the room's own message intake
        Assert.Contains("H().send(o.say)", js);
        // the handover sheet says why «سلّم» is disabled, for the nurse and the doctor, and the nurse has the help menu too
        Assert.Contains("st.id = 'nbq-why'", js);
        Assert.Contains("function nurseHelp(E)", js);
        // the pass mark comes from the university's settings, for the student's year
        Assert.Contains("policy.passMarks", js);
        var admin = await Text("/js/admin.js");
        Assert.Contains("data-nbxu-pass", admin);
        // Nabd's rules page shows the weights the room applies
        Assert.Contains("{ id: 'safe', name: 'السلامة والإجراءات الحرجة في وقتها', v: 35 }", admin);
        // the supervisor's override keeps both numbers and needs a written reason
        Assert.Contains("u.overrides[r.key] = { total: v, from: r.total, why, by: who", admin);
        Assert.Contains("if (why.length < 10) return", admin);
    }

    [Fact]
    public async Task A_real_session_reaches_the_supervisor_and_comes_back_to_the_student()
    {
        var admin = await ConsoleAndApp();
        // the supervisor reads the sessions kept with the students' accounts (no server yet)
        Assert.Contains("safeStorageGet(STORAGE_KEYS.ACCOUNTS_MAP, {})", admin);
        Assert.Contains("const key = 'live:' + s.id + ':' + h.ts;", admin);
        // a critical error fails the result unless the supervisor strikes it out with a written reason
        Assert.Contains("!((r.crit || []).length && !(store().overrides[r.key] || {}).waive)", admin);
        // the student reads the same key: waiting for review, or the approved mark and the note
        Assert.Contains("const st = Un.U(who.org), key = 'live:' + who.student.id + ':' + h.ts;", admin);
        Assert.Contains("بانتظار مراجعة المشرف", admin);
        var er = await Text("/js/er-plus.js");
        // the room keeps the whole report with the result, so it can be read again and reviewed
        Assert.Contains("detail: detailOf(E, r)", er);
        Assert.Contains("rubric: 'nurse-v1'", er);
    }

    [Fact]
    public async Task The_clinical_coach_reads_the_trainees_reports_and_comes_last()
    {
        var admin = await ConsoleAndApp();
        Assert.Contains("box.id = 'nbx-coach'", admin);
        Assert.Contains("h && /^er_/.test(h.caseId || '') && typeof h.num === 'number'", admin);
        Assert.Contains("goHome('nbx-coach')", admin);
        // V6.9.6: one card on the home opens the coach's page, which holds the gaps, their stages, the record and the drill
        Assert.Contains("data-nbx-coach-open", admin);
        Assert.Contains("const step = ['تمرين موجّه', 'حالة حقيقية', 'أُغلق'];", admin);
        Assert.Contains("showOnlySection('coach')", admin);
        var css = await Text("/css/trainee.css");
        Assert.Contains("#view-home .nbx-coach { order: 8;", css);
        var page = await Text("/");
        Assert.Contains("<button id=\"app-nav-coach\" type=\"button\" class=\"nav-link-item\">", page);
    }

    [Fact]
    public async Task The_shell_keeps_history_guards_the_consoles_and_opens_the_right_case()
    {
        var admin = await ConsoleAndApp();
        // each view change is a history entry, and the browser's back button returns to the view before
        Assert.Contains("history.pushState({ nbView: viewId }, '')", admin);
        Assert.Contains("window.addEventListener('popstate'", admin);
        // a console account is led back to its console from the legacy views
        Assert.Contains("const CLOSED = ['university', 'debrief', 'profile', 'coach'];", admin);
        // a case that was never started is replaced by the one asked for; one under way is kept
        Assert.Contains("if (E.over || !E.started) { h.begin(id); return; }", await Text("/js/er-plus.js"));
        // registering with an e-mail that has an account signs in to it and overwrites nothing
        Assert.Contains("const r = had ? build(email, '', '') : build(email, name,", admin);
        // the header no longer shows the emergency room; the button stays for the scripts that press it
        var page = await Text("/");
        Assert.Contains("<button id=\"app-nav-er\" type=\"button\" class=\"nav-link-item\" style=\"display:none\"", page);
        Assert.Contains("ابدأ مناوبتك في الطوارئ", page);
    }

    private async Task<string> ConsoleAndApp() => await Text("/js/admin.js") + "\n" + await Text("/js/app.js");

    [Fact]
    public async Task The_trainees_application_is_its_own_bundle_and_stylesheet()
    {
        var page = await Text("/");
        Assert.Contains("<script src=\"js/app.js\" defer></script>", page);
        Assert.Contains("<link rel=\"stylesheet\" href=\"css/trainee.css\">", page);
        Assert.True(page.IndexOf("js/admin.js", StringComparison.Ordinal) < page.IndexOf("js/app.js", StringComparison.Ordinal));
        var app = await Text("/js/app.js");
        // it never reaches the rooms: a case is opened through the room's own layer
        foreach (var forbidden in new[] { "view-er", "er-chat", "nbOpenER", "simState." }) Assert.DoesNotContain(forbidden, app);
        // nothing reads the browser's storage directly: the store module does
        foreach (var file in new[] { "/js/app.js", "/js/er-plus.js" })
        {
            var js = await Text(file);
            Assert.DoesNotContain("localStorage.", js);
            Assert.DoesNotContain("sessionStorage.", js);
        }
        var admin = await Text("/js/admin.js");
        Assert.Contains("window.NabdStore = Object.freeze(", admin);
        Assert.Equal(2, Regex.Matches(admin, @"localStorage\.(getItem|setItem)").Count); // the store's own read and write
        // every selector of its stylesheet starts from one of its own elements
        var css = Regex.Replace(await Text("/css/trainee.css"), @"/\*.*?\*/", "", RegexOptions.Singleline);
        css = Regex.Replace(css, @"@keyframes[^{]*\{([^{}]*\{[^{}]*\})*\s*\}", "");
        css = Regex.Replace(css, @"@[^{;]+\{", "{");
        var selectors = Regex.Matches(css, @"([^{}]+)\{").SelectMany(m => m.Groups[1].Value.Split(',')).Select(x => x.Trim()).Where(x => x.Length > 0).ToList();
        Assert.True(selectors.Count > 300, $"only {selectors.Count} selectors read");
        foreach (var sel in selectors)
            Assert.True(sel.StartsWith("#view-home .nbx-runs", StringComparison.Ordinal) || sel.StartsWith("#view-home .nbx-coach", StringComparison.Ordinal)
                || sel.StartsWith("#view-profile .nbx-", StringComparison.Ordinal) || sel.StartsWith("#view-coach", StringComparison.Ordinal), $"selector outside the trainee's application: {sel}");
        // V6.11 (owner): the role in the room is the track's, the year is asked at registration,
        // and a first sign-in with an unknown e-mail goes to registration
        Assert.Contains("function lockRole()", await Text("/js/er-plus.js"));
        Assert.Contains("say('reg-error-msg', 'لا يوجد حساب بهذا البريد بعد.", app);
        Assert.Matches("id=\"reg-rolecards\"(?s:.*)id=\"reg-year\"(?s:.*)id=\"reg-next-btn\"", page);
    }

    [Fact]
    public async Task The_script_never_reaches_the_rooms()
    {
        var js = await Text("/js/admin.js");
        Assert.Contains("DEMO_ACCOUNTS.admin", js);
        foreach (var room in new[] { "view-er", "view-sim", "view-nurse", "view-resp", "view-observe", "er-chat", "resp-chat", "nbOpenER", "simState." })
            Assert.DoesNotContain(room, js);
        // its only request is the case file the ER room already plays, read-only
        var fetches = Regex.Matches(js, @"fetch\('([^']+)'").Select(m => m.Groups[1].Value).ToList();
        Assert.Equal(new[] { "data/er-cases.json" }, fetches);
        Assert.DoesNotContain("method:", js);
    }

    private async Task<string> Text(string url)
    {
        var response = await _client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        return Encoding.UTF8.GetString(await response.Content.ReadAsByteArrayAsync()).Replace("\r\n", "\n");
    }
}
