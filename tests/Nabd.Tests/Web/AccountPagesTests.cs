using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.Testing;
using Nabd.Tests.Support;

namespace Nabd.Tests.Web;

/// <summary>
/// The sign-in and registration pages (ADR 0012): /login and /register are the application's page opened on the
/// sign-in screen, so they differ from "/" only inside the screen and in the title; every id the legacy client
/// reads is there once; nothing pretends to sign in with Microsoft or Google.
/// </summary>
public class AccountPagesTests : IClassFixture<WebApplicationFactory<Program>>
{
    // Every id of the screen that the scripts read (150-auth-session-modal, 220-registration-role-cards,
    // 500-auth-modal-steps, 830-app-init-and-listeners, app/020-access).
    private static readonly string[] LegacyIds =
    [
        "auth-modal", "close-auth-modal-btn", "auth-modal-title", "auth-pane-login", "login-email", "login-error-msg",
        "submit-login-btn", "auth-tab-register", "nb-demo-title", "auth-pane-register", "reg-name", "reg-email", "nb8-rolehead",
        "reg-rolecards", "reg-error-msg", "reg-next-btn", "reg-year", "reg-year-wrap", "auth-tab-login",
    ];

    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public AccountPagesTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Theory]
    [InlineData("/login")]
    [InlineData("/register")]
    public async Task The_pages_are_served_like_the_home_page(string url)
    {
        var response = await _client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.True(response.Headers.CacheControl?.NoStore, "the page is not stored, like /");
        var head = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Head, url));
        head.EnsureSuccessStatusCode();
    }

    [Theory]
    [InlineData("/login/", "/login")]
    [InlineData("/register/", "/register")]
    [InlineData("/login/?next=1", "/login?next=1")]
    public async Task An_address_with_a_trailing_slash_goes_to_the_canonical_one(string url, string canonical)
    {
        // Below "/login/" the page's relative stylesheets and scripts would point to "/login/css/…" and fail.
        using var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        var response = await client.GetAsync(url);
        Assert.Equal(System.Net.HttpStatusCode.MovedPermanently, response.StatusCode);
        Assert.Equal(canonical, response.Headers.Location?.OriginalString);
    }

    [Theory]
    [InlineData("/login", "تسجيل الدخول | نَبْض الأردن")]
    [InlineData("/register", "إنشاء حساب | نَبْض الأردن")]
    public async Task Outside_the_screen_and_the_title_the_page_is_the_home_page(string url, string title)
    {
        var home = await Text("/");
        var page = await Text(url);
        Assert.Contains($"<title>{title}</title>", page);
        Assert.Contains("<title>نَبْض الأردن | أكاديمية المحاكاة السريرية</title>", home);
        static string Outside(string html) =>
            Regex.Replace(html.Replace(LandingRegions.Extract(html, "auth").TrimEnd('\n'), "\u0001auth\u0001"), "<title>[^<]*</title>", "<title/>");
        Assert.Equal(Outside(home), Outside(page));
    }

    [Fact]
    public async Task The_home_page_has_the_screen_hidden_on_the_sign_in_form()
    {
        var screen = LandingRegions.Extract(await Text("/"), "auth");
        var root = Root(screen);
        Assert.Matches("class=\"[^\"]*\\bhidden\\b", root);
        Assert.Contains("data-auth-tab=\"login\"", root);
        Assert.Contains("data-auth-page=\"\"", root); // not a sign-in address: the script leaves the address alone
        Assert.DoesNotMatch("id=\"auth-pane-login\" class=\"[^\"]*\\bhidden\\b", screen);
        Assert.Matches("id=\"auth-pane-register\" class=\"[^\"]*\\bhidden\\b", screen);
    }

    [Theory]
    [InlineData("/login", "login", "تسجيل الدخول")]
    [InlineData("/register", "register", "إنشاء حساب")]
    public async Task Each_page_opens_the_screen_on_its_own_form(string url, string tab, string heading)
    {
        var screen = LandingRegions.Extract(await Text(url), "auth");
        var root = Root(screen);
        Assert.Matches("class=\"[^\"]*\\bflex\\b", root);
        Assert.DoesNotMatch("class=\"[^\"]*\\bhidden\\b", root);
        Assert.Contains($"data-auth-tab=\"{tab}\"", root);
        Assert.Contains($"data-auth-page=\"{tab}\"", root);
        Assert.Matches($"id=\"auth-modal-title\"[^>]*>{heading}<", screen);
        var other = tab == "login" ? "register" : "login";
        Assert.DoesNotMatch($"id=\"auth-pane-{tab}\" class=\"[^\"]*\\bhidden\\b", screen);
        Assert.Matches($"id=\"auth-pane-{other}\" class=\"[^\"]*\\bhidden\\b", screen);
        // V7: one registration step, and no password anywhere (no server identity in this phase, ADR 0008)
        Assert.DoesNotContain("reg-step-2", screen);
        Assert.DoesNotContain("type=\"password\"", screen);
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/login")]
    [InlineData("/register")]
    public async Task Every_id_the_legacy_client_reads_is_in_the_screen_once(string url)
    {
        var screen = LandingRegions.Extract(await Text(url), "auth");
        foreach (var id in LegacyIds)
            Assert.True(Regex.Matches(screen, $"\\bid=\"{id}\"").Count == 1, $"{url}: id '{id}' should occur exactly once in the screen");
        foreach (var account in new[] { "doctor", "uniadmin", "admin" }) // V6.7.7: the administrations only
            Assert.Single(Regex.Matches(screen, $"data-demo-login=\"{account}\""));
        foreach (var role in new[] { "nursing", "medicine" }) // V6.7.7: staff come from the university's roster, not a card
            Assert.Single(Regex.Matches(screen, $"data-rc=\"{role}\""));
        // The classes the sign-in script reads: openAuthModal scrolls .nb-auth-simple and .nb-auth-main to the top.
        Assert.Single(Regex.Matches(screen, "class=\"nb-auth-simple[ \"]"));
        Assert.Single(Regex.Matches(screen, "class=\"nb-auth-main[ \"]"));
        Assert.DoesNotContain("nb-step", screen);
    }

    [Fact]
    public async Task Microsoft_and_Google_are_announced_not_pretended()
    {
        var screen = LandingRegions.Extract(await Text("/login"), "auth");
        var buttons = Regex.Matches(screen, "<button [^>]*data-auth-provider=\"([^\"]+)\"[^>]*>").ToList();
        Assert.Equal(["microsoft", "microsoft"], buttons.Select(b => b.Groups[1].Value)); // V6.7.6: Microsoft only (owner)
        Assert.All(buttons, b => Assert.Contains("aria-disabled=\"true\"", b.Value));
        Assert.Equal(2, Regex.Matches(screen, ">قريباً<").Count);
        // No link to a sign-in service, and no server endpoint for one.
        Assert.DoesNotMatch("(?i)accounts\\.google|login\\.microsoftonline|/signin-|oauth", screen);
        foreach (var endpoint in new[] { "/signin-google", "/signin-microsoft", "/signin-oidc" })
            Assert.Equal(System.Net.HttpStatusCode.NotFound, (await _client.GetAsync(endpoint)).StatusCode);
    }

    private static string Root(string screen) => Regex.Match(screen, "<div id=\"auth-modal\"[^>]*>").Value;

    private async Task<string> Text(string url)
    {
        var response = await _client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        return Encoding.UTF8.GetString(await response.Content.ReadAsByteArrayAsync()).Replace("\r\n", "\n");
    }
}
