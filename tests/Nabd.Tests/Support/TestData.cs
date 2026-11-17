using Microsoft.Extensions.Options;
using Nabd.Infrastructure.CaseData;

namespace Nabd.Tests.Support;

/// <summary>Shared access to the real data files and to the test inputs copied next to the test binaries.</summary>
internal static class TestData
{
    public static string OutputFolder => AppContext.BaseDirectory;

    public static string GoldenMasters(string area) => Path.Combine(OutputFolder, "GoldenMasters", area);


    public static CaseDataFiles CaseDataFiles { get; } = new(Options.Create(new CaseDataOptions()));

    public static JsonClinicalCaseRepository CaseRepository { get; } = new(CaseDataFiles);

    /// <summary>Text with line endings as line feeds, whatever the checkout did.</summary>
    public static string ReadNormalized(string path) => File.ReadAllText(path).Replace("\r\n", "\n");
}
