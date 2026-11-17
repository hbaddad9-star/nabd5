using System.Text.Json;

namespace Nabd.Web.Images;

/// <summary>
/// The site's images by key (V6.11; ADR 0020). The paths live in one file, <c>images.json</c> at the web project's
/// root, so an image is changed there and never in a view. Views reach it as <c>@Img["key"]</c> (Views/_ViewImports).
/// A key that is not in the file stops the page with an error that names it: a missing image is found on the first
/// request, not by a visitor.
/// </summary>
public sealed class ImageCatalog
{
    private readonly IReadOnlyDictionary<string, string> _paths;

    /// <summary>Reads <c>images.json</c> from the web project's content root (once, at start-up).</summary>
    public ImageCatalog(IWebHostEnvironment environment)
        : this(File.ReadAllText(Path.Combine(environment.ContentRootPath, FileName)))
    {
    }

    /// <summary>Reads a catalogue given as JSON text (the tests use it).</summary>
    public ImageCatalog(string json)
    {
        using var document = JsonDocument.Parse(json);
        _paths = document.RootElement.GetProperty("images").EnumerateObject()
            .ToDictionary(entry => entry.Name, entry => entry.Value.GetProperty("src").GetString() ?? "", StringComparer.Ordinal);
    }

    /// <summary>The catalogue's file name, at the web project's root.</summary>
    public const string FileName = "images.json";

    /// <summary>The path of the image under wwwroot, as the page writes it (relative, no leading slash).</summary>
    public string this[string key] =>
        _paths.TryGetValue(key, out var path) ? path : throw new KeyNotFoundException($"The image '{key}' is not in {FileName}.");

    /// <summary>Every key in the catalogue.</summary>
    public IReadOnlyCollection<string> Keys => _paths.Keys.ToList();
}
