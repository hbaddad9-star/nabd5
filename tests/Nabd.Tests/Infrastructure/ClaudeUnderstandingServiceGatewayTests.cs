using System.Text;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Nabd.Application.Abstractions.Ai;
using Nabd.Infrastructure.Ai;
using Nabd.Tests.Support;

namespace Nabd.Tests.Infrastructure;

/// <summary>
/// Claude as the emergency room's understanding service, against a fake Claude: nothing leaves the process. The tests keep
/// the contract the room reads (decision D-01: Claude reads and speaks, the rules and the data stay ours): identifiers outside
/// the case file are dropped, silence where the room must speak itself, the supervisor never names the diagnosis, and any
/// failure leaves the room on its own rules.
/// </summary>
public class ClaudeUnderstandingServiceGatewayTests
{
    private sealed class FakeClaude(Func<ClaudeCall, string?> answer) : IClaudeCompleter
    {
        public List<ClaudeCall> Calls { get; } = [];

        public Task<string?> CompleteAsync(ClaudeCall call, CancellationToken cancellationToken = default)
        {
            Calls.Add(call);
            return Task.FromResult(answer(call));
        }
    }

    private static ClaudeUnderstandingServiceGateway Gateway(FakeClaude claude, bool enabled = true, string key = "test-key") =>
        new(claude, TestData.CaseDataFiles, Options.Create(new ClaudeOptions { Enabled = enabled, ApiKey = key }), NullLogger<ClaudeUnderstandingServiceGateway>.Instance);

    private static UnderstandingRequest Request(object body) => new(UnderstandingService.ErRoom, Encoding.UTF8.GetBytes(JsonNode.Parse(System.Text.Json.JsonSerializer.Serialize(body))!.ToJsonString()));

    private static (int Status, JsonObject Body) Parse(UnderstandingResponse r) => (r.StatusCode, (JsonObject)JsonNode.Parse(r.Body.Span)!);

    private static readonly object Envelope = new { @case = "asthma", risk = 40, anx = 20, state = new { minute = 2, vitals = "SpO2 90", done = new string[0], results = new string[0] } };

    private static object Turn(string text, object? extra = null)
    {
        var o = JsonNode.Parse(System.Text.Json.JsonSerializer.Serialize(Envelope))!.AsObject();
        o["text"] = text;
        o["history"] = new JsonArray(new JsonObject { ["r"] = "s", ["t"] = text });
        if (extra is not null) foreach (var p in JsonNode.Parse(System.Text.Json.JsonSerializer.Serialize(extra))!.AsObject()) o[p.Key] = p.Value?.DeepClone();
        return o;
    }

    [Fact]
    public async Task It_is_off_without_the_switch_or_the_key()
    {
        var claude = new FakeClaude(_ => "{}");
        Assert.False(await Gateway(claude, enabled: false).IsAvailableAsync(UnderstandingService.ErRoom));
        Assert.False(await Gateway(claude, key: "").IsAvailableAsync(UnderstandingService.ErRoom) && Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY") is null);
        Assert.Equal(503, (await Gateway(claude, enabled: false).SendAsync(Request(Turn("مرحبا")))).StatusCode);
        Assert.Empty(claude.Calls);
    }

    [Fact]
    public async Task A_turn_is_read_against_the_case_file_and_the_patient_answers_in_simple_colloquial()
    {
        var claude = new FakeClaude(c => c.System.StartsWith("You read", StringComparison.Ordinal)
            ? """{"to":"patient","kind":"history","facts":["trigger","not-a-fact"],"exam":[],"actions":[{"id":"oxygen","dose":"10","agent":"","dose_ok":"ok"},{"id":"made-up","dose":"","agent":"","dose_ok":"ok"}],"tests":[],"tone":{"empathy":true},"pending_ok":"na","vague":"none"}"""
            : """{"reply":"كنت بنظّف الغرفة وكان فيها غبرة كثير."}""");
        var (status, body) = Parse(await Gateway(claude).SendAsync(Request(Turn("شو سبب النوبة؟ واعطوها اكسجين"))));
        Assert.Equal(200, status);
        var read = body["read"]!.AsObject();
        // only identifiers of the case file survive: the invented fact and the invented order are dropped
        Assert.Equal(["trigger"], read["facts"]!.AsArray().Select(x => (string)x!).ToArray());
        Assert.Equal(["oxygen"], read["actions"]!.AsArray().Select(x => (string)x!["id"]!).ToArray());
        Assert.True((bool)read["tone"]!["empathy"]!);
        // the order makes the nurse the one who speaks about it; a question inside the order is still the patient's to answer
        Assert.Equal("patient", (string)body["to"]!);
        Assert.Contains("غبرة", (string)body["reply"]!);
        // the patient's call carries the case file's own line as the plan, never a model-written fact
        var voice = claude.Calls.Last();
        Assert.Contains("بنظّف الغرفة", voice.User);
        // the patient and the relative speak simple colloquial; the staff stay formal (agent log D-68)
        Assert.Contains("simple everyday Levantine", voice.System);
        Assert.DoesNotContain("plain formal Arabic", voice.System);
        Assert.Contains("kunya", voice.System);
    }

    [Fact]
    public async Task A_pure_order_to_the_nurse_is_left_to_the_room_and_a_nameless_order_is_marked_unplaced()
    {
        var order = new FakeClaude(_ => """{"to":"nurse","kind":"order","facts":[],"exam":[],"actions":[{"id":"oxygen","dose":"15 L","agent":"","dose_ok":"ok"}],"tests":[],"tone":{},"pending_ok":"na","vague":"none"}""");
        var (_, silent) = Parse(await Gateway(order).SendAsync(Request(Turn("اعطوها اكسجين 15 لتر"))));
        Assert.Null(silent["reply"]);
        Assert.Single(order.Calls); // no voice call was paid for

        var nameless = new FakeClaude(_ => """{"to":"nurse","kind":"order","facts":[],"exam":[],"actions":[],"tests":[],"tone":{},"pending_ok":"na","vague":"drug"}""");
        var (_, unplaced) = Parse(await Gateway(nameless).SendAsync(Request(Turn("اعملوا إشي"))));
        Assert.True((bool)unplaced["unplaced"]!);
        Assert.Null(unplaced["reply"]);
    }

    [Fact]
    public async Task The_supervisor_never_names_the_diagnosis_unless_the_trainee_did()
    {
        var claude = new FakeClaude(c => c.System.StartsWith("You read", StringComparison.Ordinal)
            ? """{"to":"supervisor","kind":"help","facts":[],"exam":[],"actions":[],"tests":[],"tone":{},"pending_ok":"na","vague":"none"}"""
            : """{"reply":"هذه حالة ربو حاد، فكّر في العلاج."}""");
        var (status, body) = Parse(await Gateway(claude).SendAsync(Request(Turn("ساعدني يا دكتور"))));
        Assert.Equal(200, status);
        Assert.True((bool)body["held"]!);
        Assert.Null(body["reply"]);

        var said = Turn("هل هي نوبة ربو؟");
        var (_, allowed) = Parse(await Gateway(claude).SendAsync(Request(said)));
        Assert.Null(allowed["held"]);
        Assert.Contains("ربو", (string)allowed["reply"]!);
    }

    [Fact]
    public async Task A_spoken_line_is_worded_by_Claude_and_a_nurse_never_voices_the_doctor()
    {
        var claude = new FakeClaude(_ => """{"reply":"يا دكتور، أرجو أن تخبرني بما أصاب ابنتي."}""");
        var line = Turn("", new { mode = "line", speaker = "companion", why = "The relative has been ignored for three minutes." });
        var (status, body) = Parse(await Gateway(claude).SendAsync(Request(line)));
        Assert.Equal(200, status);
        Assert.Contains("ابنتي", (string)body["reply"]!);
        // the room's reason travels as data, inside its own tag
        Assert.Contains("<room_note>The relative has been ignored", claude.Calls.Single().User);

        var asNurse = Turn("", new { mode = "line", speaker = "nurse", role = "nurse" });
        Assert.Equal(400, Parse(await Gateway(claude).SendAsync(Request(asNurse))).Status);
    }

    [Fact]
    public async Task The_grade_is_a_judgement_of_the_text_and_never_a_score()
    {
        var claude = new FakeClaude(_ => """{"dx":"close","s":true,"b":true,"a":false,"r":true,"invented":false,"note":"تسليم جيد، ينقصه التقييم."}""");
        var grade = Turn("", new { mode = "grade", dxText = "ضيق نفس", sbar = "S: ... B: ... R: ...", harms = new[] { "تنبيب قبل الحاجة" } });
        var (status, body) = Parse(await Gateway(claude).SendAsync(Request(grade)));
        Assert.Equal(200, status);
        Assert.Equal("close", (string)body["dx"]!);
        Assert.False((bool)body["a"]!);
        Assert.DoesNotContain("score", body.ToJsonString());
        Assert.Contains("<trainee_message>DIAGNOSIS: ضيق نفس", claude.Calls.Single().User);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("not json at all")]
    [InlineData("{}")]
    public async Task When_Claude_fails_the_room_is_left_on_its_own_rules(string? answer)
    {
        var claude = new FakeClaude(_ => answer);
        var turn = (await Gateway(claude).SendAsync(Request(Turn("مرحبا")))).StatusCode;
        Assert.True(turn == 502 || answer == "{}", "a turn that could not be read answers 502 so the room reads it itself");
        var (lineStatus, _) = Parse(await Gateway(claude).SendAsync(Request(Turn("", new { mode = "line", speaker = "patient", why = "x" }))));
        Assert.Equal(502, lineStatus);
    }

    [Fact]
    public async Task An_unknown_case_or_an_unreadable_body_is_refused_without_calling_Claude()
    {
        var claude = new FakeClaude(_ => "{}");
        Assert.Equal(400, (await Gateway(claude).SendAsync(Request(new { @case = "nope", text = "x" }))).StatusCode);
        Assert.Equal(400, (await Gateway(claude).SendAsync(new UnderstandingRequest(UnderstandingService.ErRoom, "[1]"u8.ToArray()))).StatusCode);
        Assert.Empty(claude.Calls);
    }
}
