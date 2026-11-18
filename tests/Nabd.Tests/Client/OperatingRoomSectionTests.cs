using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Nabd.Tests.Client;

/// <summary>
/// The operating-room section (2026-11-18): the 3D operating room (the simulator in wwwroot/or3d, shown in a frame) with
/// the team's chat on its left, entered from a section of the public landing (a teaser) and from a card on the signed-in
/// home. These tests keep its seams: the page, the frame that loads only when opened, the chat, the simulator's files
/// and their licences, the two entries, the views the client guards, and the stylesheet's own prefix.
/// </summary>
public sealed class OperatingRoomSectionTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public OperatingRoomSectionTests(WebApplicationFactory<Program> factory) => _client = factory.CreateClient();

    [Fact]
    public async Task The_page_holds_the_room_frame_the_chat_and_a_way_back()
    {
        var page = await Page();
        Assert.Single(Regex.Matches(page, "<section id=\"view-or\" class=\"hidden or-view\""));
        // the frame names its document in data-src only: the 25 MB room loads when the page is opened, not with the home
        var frame = Regex.Match(page, "<iframe id=\"or3d-frame\"[^>]*>");
        Assert.True(frame.Success, "the room's frame is missing");
        Assert.Contains("data-src=\"or3d/index.html?embed=1\"", frame.Value);
        Assert.DoesNotMatch(@"\ssrc=", frame.Value);
        // the chat comes after the room in the markup, so on a right-to-left page it stands on the room's left
        var room = page.IndexOf("id=\"or3d-stage\"", StringComparison.Ordinal);
        var chat = page.IndexOf("id=\"or-chat\"", StringComparison.Ordinal);
        Assert.True(room > 0 && chat > room, "the chat should follow the room");
        foreach (var id in new[] { "or-chat-log", "or-chat-actions", "or-chat-form", "or-chat-input", "or-chat-step", "or-back-btn" })
            Assert.Contains($"id=\"{id}\"", page);
        Assert.Contains("BodyParts3D", page); // the licence of the internal anatomy asks for its attribution where it is shown
    }

    [Fact]
    public async Task The_simulator_is_served_with_its_models_and_its_licences()
    {
        var index = await Text("/or3d/index.html");
        Assert.Contains("./embed.css", index);
        Assert.Contains("./src/engine.js", index);
        var model = await _client.GetAsync("/or3d/assets/patient/patient.glb");
        model.EnsureSuccessStatusCode();
        Assert.Equal("model/gltf-binary", model.Content.Headers.ContentType?.MediaType);
        var physics = await _client.GetAsync("/or3d/vendor/rapier/rapier.mjs");
        physics.EnsureSuccessStatusCode();
        Assert.Equal("text/javascript", physics.Content.Headers.ContentType?.MediaType);
        // the third-party notices travel with the files they cover
        var root = Path.Combine(WebRoot(), "or3d");
        foreach (var notice in new[] { "vendor/three/LICENSE", "vendor/rapier/LICENSE", "assets/anatomy/PROVENANCE.md", "assets/patient/ASSET-PROVENANCE.md", "assets/staff/ASSET-PROVENANCE.md" })
            Assert.True(File.Exists(Path.Combine(root, notice)), notice + " is missing");
    }

    [Fact]
    public async Task The_chat_runs_six_steps_and_moves_the_room_by_its_own_buttons()
    {
        var app = await Text("/js/app.js");
        Assert.Contains("const STEPS = [", app);
        Assert.Equal(6, Regex.Matches(app, @"^\s{6}\{\r?\n\s{8}sup: '", RegexOptions.Multiline).Count);
        foreach (var button in new[] { "camera-face", "camera-abdomen", "open-vitals", "camera-surgeon" })
            Assert.Contains($"room: '{button}'", app);
        // the buttons exist in the simulator, so an action never presses nothing
        var index = await Text("/or3d/index.html");
        foreach (var button in new[] { "camera-face", "camera-abdomen", "camera-torso", "open-vitals", "camera-surgeon", "camera-room", "camera-anesthesia", "camera-instruments", "toggle-trainee-mode", "loading-state", "vitals-dialog", "vitals-close" })
            Assert.Contains($"id=\"{button}\"", index);
    }

    [Fact]
    public async Task The_landing_and_the_home_each_have_their_entry_in_their_place()
    {
        var page = await Page();
        var order = new[] { "id=\"nl-specialties\"", "id=\"nl-experience\"", "id=\"nl-or3d\"", "id=\"nl-method\"" }.Select(s => page.IndexOf(s, StringComparison.Ordinal)).ToList();
        Assert.All(order, i => Assert.True(i >= 0));
        Assert.Equal(order.Order().ToList(), order);
        // the home: the card follows the emergency room's card and its button carries the one hook the script binds
        var home = page.IndexOf("id=\"home-er-card\"", StringComparison.Ordinal);
        var card = page.IndexOf("id=\"home-or3d-card\"", StringComparison.Ordinal);
        Assert.True(home >= 0 && card > home, "the card should follow the emergency room's card");
        Assert.Matches("id=\"home-or3d-btn\"[^>]*data-or-open", page);
        // a guest sees a teaser, never a button that opens the protected page
        var teaser = Regex.Match(page, "<section aria-labelledby=\"nl-or-title\".*?</section>", RegexOptions.Singleline).Value;
        Assert.NotEmpty(teaser);
        Assert.DoesNotContain("<button", teaser);
        Assert.DoesNotContain("data-or-open", teaser);
    }

    [Fact]
    public async Task The_client_treats_the_page_as_a_protected_view_and_opens_it_from_the_entries()
    {
        var script = await Text("/js/script.js");
        Assert.Contains("const PROTECTED_VIEWS = new Set(['home', 'debrief', 'coach', 'profile', 'university', 'er', 'or']);", script);
        Assert.Contains("['index', 'home', 'coach', 'profile', 'er', 'or'].forEach", script);
        Assert.Contains("navigateTo('or')", await Text("/js/app.js"));
    }

    [Fact]
    public async Task The_stylesheet_keeps_to_the_sections_own_selectors()
    {
        var css = Regex.Replace(await Text("/css/operating-room.css"), @"/\*.*?\*/", "", RegexOptions.Singleline);
        Assert.DoesNotContain("http", css);
        Assert.DoesNotMatch(@"\.nl-[\w-]", css); // the landing's prefix belongs to the landing's stylesheets
        var selectors = Regex.Matches(css, @"(?:^|[};])\s*([^@{}]+?)\s*\{", RegexOptions.Multiline)
            .SelectMany(m => m.Groups[1].Value.Split(',')).Select(s => s.Trim()).Where(s => s.Length > 0).ToList();
        Assert.NotEmpty(selectors);
        var bad = selectors.Where(s => !Regex.IsMatch(s, @"^(#view-or|#home-or3d-card|#view-home > #home-or3d-card|#nl-or3d)(?![\w-])")).ToList();
        Assert.True(bad.Count == 0, "selectors that could reach another part of the page:\n  " + string.Join("\n  ", bad));
    }

    private static string WebRoot()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir != null; dir = dir.Parent)
        {
            var candidate = Path.Combine(dir.FullName, "src", "Nabd.Web", "wwwroot");
            if (Directory.Exists(candidate)) return candidate;
        }

        throw new DirectoryNotFoundException("src/Nabd.Web/wwwroot not found above the test binaries");
    }

    private async Task<string> Page() => (await Text("/")).Replace("\r\n", "\n");

    private async Task<string> Text(string url)
    {
        var response = await _client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync();
    }
}
