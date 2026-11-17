using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc.Testing;
using Nabd.Tests.Support;

namespace Nabd.Tests.Web;

/// <summary>
/// What the browser receives: the designed regions are their approved snapshots, every script and stylesheet the
/// page names is served, nothing that is not named can be asked for, and the approved emergency room (its script
/// and stylesheet, ADR 0016) is unchanged to the byte.
/// </summary>
public class SiteAssetsTests : IClassFixture<WebApplicationFactory<Program>>
{
    /// <summary>
    /// The approved emergency room, fingerprinted with line endings as line feeds. A change to the room is the
    /// owner's decision (docs/prototype-constraints.ar.md, section 1): show the change, then record the new value.
    /// </summary>
    private static readonly IReadOnlyDictionary<string, string> ApprovedRoom = new Dictionary<string, string>
    {
        ["/js/er.js"] = "7b126404b2748724dfc63d8f3da05c33b6530ebf30ae7d2b45f0d612426f2204",
        ["/css/er.css"] = "03b5f056098883f5a96e75efe220200791d077f91be27409229c3bc88dd5aa38",
    };

    private readonly HttpClient _client;

    public SiteAssetsTests(WebApplicationFactory<Program> factory) => _client = factory.CreateClient();

    public static TheoryData<string> RegionNames() => [.. LandingRegions.Names];

    [Theory]
    [MemberData(nameof(RegionNames))]
    public async Task Each_designed_region_is_its_approved_snapshot(string name)
    {
        var served = await Page();
        var approved = TestData.ReadNormalized(LandingRegions.SnapshotPath(name));
        var region = LandingRegions.Extract(served, name);
        if (approved == region) return;
        var at = Enumerable.Range(0, Math.Min(approved.Length, region.Length)).FirstOrDefault(i => approved[i] != region[i]);
        Assert.Fail($"region {name} differs from its snapshot at character {at}: approved «{Around(approved, at)}» served «{Around(region, at)}». Approve it with tools/approve-regions.mjs only if the change was intended.");
    }

    [Fact]
    public async Task The_designed_regions_come_in_page_order()
    {
        var served = await Page();
        var at = LandingRegions.Names.Select(r => served.IndexOf($"<!-- nabd:region {r} ", StringComparison.Ordinal)).ToList();
        Assert.All(at, i => Assert.True(i >= 0));
        Assert.Equal(at.Order(), at);
    }

    [Fact]
    public async Task Every_script_and_stylesheet_the_page_names_is_served()
    {
        var page = await Page();
        var scripts = System.Text.RegularExpressions.Regex.Matches(page, "<script src=\"(js/[^\"]+)\"").Select(m => m.Groups[1].Value).ToList();
        var styles = System.Text.RegularExpressions.Regex.Matches(page, "<link rel=\"stylesheet\" href=\"(css/[^\"]+)\"").Select(m => m.Groups[1].Value).ToList();
        Assert.Equal(["js/script.js", "js/motion.js", "js/terms.js", "js/ui.js", "js/er.js", "js/landing.js", "js/admin.js", "js/app.js", "js/er-plus.js"], scripts);
        Assert.True(styles.Count >= 10, string.Join(", ", styles));
        foreach (var file in scripts.Concat(styles))
        {
            var response = await _client.GetAsync("/" + file);
            Assert.True(response.IsSuccessStatusCode, $"{file}: {(int)response.StatusCode}");
            Assert.False((await response.Content.ReadAsByteArrayAsync()).Length == 0, $"{file} is empty");
        }
    }

    [Fact]
    public async Task The_approved_emergency_room_is_unchanged()
    {
        foreach (var (url, sha) in ApprovedRoom)
        {
            var text = (await _client.GetStringAsync(url)).Replace("\r\n", "\n");
            Assert.True(sha == Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(text))), $"{url} is not the approved room");
        }
    }

    [Fact]
    public async Task Data_that_the_application_does_not_name_cannot_be_asked_for()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/data/secrets.json")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/data/..%2Fappsettings.json")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/js/unknown.js")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/js/resp.js")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/data/resp-patients.json")).StatusCode);
        // the source fragments are joined on the server; none is reachable on its own
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/ClientScripts/er/010-config-state.js")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/ClientScripts/bundles.json")).StatusCode);
        foreach (var name in new[] { "er-act", "er-cases", "er-find" })
            Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync($"/data/{name}.json")).StatusCode);
    }

    [Fact]
    public async Task A_bundle_is_revalidated_with_its_entity_tag()
    {
        var first = await _client.GetAsync("/js/ui.js");
        var tag = first.Headers.ETag;
        Assert.NotNull(tag);
        var request = new HttpRequestMessage(HttpMethod.Get, "/js/ui.js");
        request.Headers.IfNoneMatch.Add(tag);
        Assert.Equal(HttpStatusCode.NotModified, (await _client.SendAsync(request)).StatusCode);
    }

    private async Task<string> Page()
    {
        var response = await _client.GetAsync("/");
        response.EnsureSuccessStatusCode();
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        return (await response.Content.ReadAsStringAsync()).Replace("\r\n", "\n");
    }

    private static string Around(string text, int at) => text.Substring(Math.Max(0, at - 30), Math.Min(80, text.Length - Math.Max(0, at - 30))).Replace("\n", "⏎");
}
