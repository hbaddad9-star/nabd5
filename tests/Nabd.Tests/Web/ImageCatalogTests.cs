using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.Testing;
using Nabd.Web.Images;

namespace Nabd.Tests.Web;

/// <summary>
/// The site's images are named in one file, src/Nabd.Web/images.json (V6.11, owner; ADR 0020): the views use a key,
/// every key points at a file that exists, and the files the pinned legacy client writes are listed with it.
/// </summary>
public class ImageCatalogTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public ImageCatalogTests(WebApplicationFactory<Program> factory) => _factory = factory;

    private static string Web()
    {
        var folder = new DirectoryInfo(AppContext.BaseDirectory);
        while (folder is not null && !File.Exists(Path.Combine(folder.FullName, "Nabd.sln"))) folder = folder.Parent;
        Assert.NotNull(folder);
        return Path.Combine(folder!.FullName, "src", "Nabd.Web");
    }

    [Fact]
    public void Every_image_in_the_catalogue_is_a_file_of_the_site()
    {
        var web = Web();
        using var json = JsonDocument.Parse(File.ReadAllText(Path.Combine(web, ImageCatalog.FileName)));
        var images = json.RootElement.GetProperty("images").EnumerateObject().ToList();
        Assert.True(images.Count >= 30);
        foreach (var image in images)
        {
            var src = image.Value.GetProperty("src").GetString()!;
            Assert.True(File.Exists(Path.Combine(web, "wwwroot", src)), $"{image.Name}: {src} is not in wwwroot");
            Assert.False(string.IsNullOrWhiteSpace(image.Value.GetProperty("where").GetString()), $"{image.Name} does not say where it is shown");
        }
        foreach (var file in json.RootElement.GetProperty("legacy").GetProperty("files").EnumerateArray())
            Assert.True(File.Exists(Path.Combine(web, "wwwroot", file.GetString()!)), $"legacy {file} is not in wwwroot");
    }

    [Fact]
    public void The_views_name_their_images_by_key_and_every_key_is_in_the_catalogue()
    {
        var web = Web();
        var catalog = new ImageCatalog(File.ReadAllText(Path.Combine(web, ImageCatalog.FileName)));
        var used = new HashSet<string>(StringComparer.Ordinal);
        foreach (var view in Directory.EnumerateFiles(Path.Combine(web, "Views"), "*.cshtml", SearchOption.AllDirectories))
        {
            var text = File.ReadAllText(view);
            Assert.DoesNotMatch("src=\"img/|url\\(img/", text); // a path in a view is changed in images.json instead
            foreach (Match m in Regex.Matches(text, "@Img\\[\"([^\"]+)\"\\]")) used.Add(m.Groups[1].Value);
        }
        Assert.True(used.Count >= 25, $"only {used.Count} keys used");
        foreach (var key in used) Assert.False(string.IsNullOrEmpty(catalog[key]));
        // each key of the catalogue is shown somewhere: in a view, or (home.coach) by the trainee's script
        foreach (var key in catalog.Keys) Assert.True(used.Contains(key), $"{key} is in images.json but no view uses it");
        Assert.Throws<KeyNotFoundException>(() => catalog["no.such.image"]);
    }

    [Fact]
    public async Task The_page_writes_the_catalogues_paths()
    {
        var page = await _factory.CreateClient().GetStringAsync("/");
        Assert.Contains("src=\"img/landing/hero-clinical-team.webp\"", page);
        Assert.Contains("data-nbx-img-coach=\"img/v9/solution2.jpg\"", page);
        Assert.Contains("nbxImgCoach", await _factory.CreateClient().GetStringAsync("/js/app.js"));
    }
}
