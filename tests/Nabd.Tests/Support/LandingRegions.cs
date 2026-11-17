using System.Text.Json;

namespace Nabd.Tests.Support;

/// <summary>
/// The designed regions of the page (the public header, the signed-in header, the landing, the signed-in home, the
/// sign-in screen, the footer), as LandingBaseline/regions.json names them. The served page marks each with
/// <c>&lt;!-- nabd:region NAME ... --&gt;</c> … <c>&lt;!-- /nabd:region NAME --&gt;</c>.
/// </summary>
internal static class LandingRegions
{
    public static IReadOnlyList<string> Names { get; } = Load();

    public static string SnapshotPath(string name) => Path.Combine(TestData.OutputFolder, "LandingBaseline", name + ".html");

    /// <summary>The region as served, from its start marker to the end of its end marker, plus a line feed.</summary>
    public static string Extract(string served, string name)
    {
        var startMarker = $"<!-- nabd:region {name} ";
        var endMarker = $"<!-- /nabd:region {name} -->";
        var start = served.IndexOf(startMarker, StringComparison.Ordinal);
        var end = served.IndexOf(endMarker, StringComparison.Ordinal);
        Assert.True(start >= 0, $"region {name}: start marker missing");
        Assert.True(end > start, $"region {name}: end marker missing or before the start");
        Assert.True(served.IndexOf(startMarker, start + 1, StringComparison.Ordinal) < 0 && served.IndexOf(endMarker, end + 1, StringComparison.Ordinal) < 0, $"region {name}: markers repeated");
        return served[start..(end + endMarker.Length)] + "\n";
    }

    private static List<string> Load()
    {
        using var doc = JsonDocument.Parse(File.ReadAllText(Path.Combine(TestData.OutputFolder, "LandingBaseline", "regions.json")));
        return [.. doc.RootElement.GetProperty("regions").EnumerateArray().Select(r => r.GetProperty("name").GetString()!)];
    }
}
