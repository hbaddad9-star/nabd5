using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nabd.Application.Abstractions.Ai;
using Nabd.Infrastructure.CaseData;

namespace Nabd.Infrastructure.Ai;

/// <summary>
/// The emergency room's understanding service, run by Claude from inside the application. It answers the three
/// requests the room has always sent to <c>/api/er-chat</c>, with the same fields (docs/agent/er-agent.ar.md, section 9):
/// a turn (the reading of the trainee's message, who answers, and the answer), a spoken line, and the grade of the handover.
/// </summary>
/// <remarks>
/// <para>The division is the one of decision D-01: Claude reads and speaks; the rules, the data and the scoring stay ours.
/// The case file (facts, examination, orders, tests, the people's personas, the true diagnosis) is the only source of
/// clinical content that reaches the prompts; Claude chooses among the identifiers the file lists and words what the file
/// says, in plain formal Arabic. It never writes a number the rules compute, and the room still applies its own rules to what
/// it reads.</para>
/// <para>Any failure (no key, a timeout, a refusal, an unreadable answer) is answered with a status the room treats as "use
/// your own rules for this message" (502 on a turn, an empty reply on a line, no <c>dx</c> on a grade).</para>
/// </remarks>
public sealed class ClaudeUnderstandingServiceGateway : IUnderstandingServiceGateway
{
    private static readonly HashSet<string> Targets = ["patient", "companion", "nurse", "supervisor", "room"];
    private static readonly HashSet<string> Kinds = ["open", "history", "exam", "order", "smalltalk", "help", "answer", "other"];
    private static readonly HashSet<string> PendingOk = ["good", "partial", "wrong", "withdraw", "na"];
    private static readonly HashSet<string> Vague = ["none", "drug", "needle", "analgesic", "bp", "fever", "labs"];
    private static readonly HashSet<string> Speakers = ["patient", "companion", "nurse", "supervisor"];

    private readonly IClaudeCompleter _claude;
    private readonly CaseDataFiles _files;
    private readonly ClaudeOptions _options;
    private readonly ILogger<ClaudeUnderstandingServiceGateway> _logger;
    private readonly SemaphoreSlim _loading = new(1, 1);
    private Dictionary<string, CaseInfo>? _cases;

    /// <summary>Creates the gateway.</summary>
    public ClaudeUnderstandingServiceGateway(IClaudeCompleter claude, CaseDataFiles files, IOptions<ClaudeOptions> options, ILogger<ClaudeUnderstandingServiceGateway> logger)
    {
        ArgumentNullException.ThrowIfNull(options);
        _claude = claude;
        _files = files;
        _options = options.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public Task<bool> IsAvailableAsync(UnderstandingService service, CancellationToken cancellationToken = default) =>
        Task.FromResult(service == UnderstandingService.ErRoom && _options.Enabled && _options.ResolveKey().Length > 0);

    /// <inheritdoc />
    public async Task<UnderstandingResponse> SendAsync(UnderstandingRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (request.Service != UnderstandingService.ErRoom || !await IsAvailableAsync(request.Service, cancellationToken).ConfigureAwait(false)) return UnderstandingResponse.Unavailable;
        JsonObject? body;
        try { body = JsonNode.Parse(request.JsonBody.Span) as JsonObject; }
        catch (JsonException) { return Reply(400, new JsonObject { ["error"] = "bad request" }); }
        if (body is null) return Reply(400, new JsonObject { ["error"] = "bad request" });
        var cases = await LoadAsync(cancellationToken).ConfigureAwait(false);
        if (!cases.TryGetValue(Str(body["case"], 60), out var c)) return Reply(400, new JsonObject { ["error"] = "case" });
        var ctx = new Turn(c, body);
        return Str(body["mode"], 10) switch
        {
            "line" => await LineAsync(ctx, cancellationToken).ConfigureAwait(false),
            "grade" => await GradeAsync(ctx, cancellationToken).ConfigureAwait(false),
            _ => await TurnAsync(ctx, cancellationToken).ConfigureAwait(false),
        };
    }

    /* ---------- a turn: read, route, voice ---------- */

    private async Task<UnderstandingResponse> TurnAsync(Turn t, CancellationToken ct)
    {
        if (t.Text.Length == 0) return Reply(400, new JsonObject { ["error"] = "empty" });
        var raw = await _claude.CompleteAsync(new ClaudeCall(_options.ReaderModel, Prompts.Reader(t.Case, t.Nurse), Prompts.ReaderUser(t), 900), ct).ConfigureAwait(false);
        var read = raw is null ? null : ParseRead(raw, t.Case, t.Nurse);
        if (read is null) return Reply(502, new JsonObject { ["error"] = "empty" });

        // Routing: the rules of the room, in code (decision D-01), over what Claude read.
        var to = Str(read["to"], 12);
        var facts = read["facts"]!.AsArray().Select(x => x!.GetValue<string>()).ToList();
        var nActions = read["actions"]!.AsArray().Count;
        var nTests = read["tests"]!.AsArray().Count;
        var kind = Str(read["kind"], 12);
        var pendingOk = Str(read["pending_ok"], 10);
        var answeredOpen = pendingOk is "good" or "partial" or "wrong" or "withdraw";
        var work = nActions + nTests > 0;
        if (facts.Count > 0 && (to is "nurse" or "room")) to = "patient";
        if (facts.Count > 0 && to == "patient" && facts.All(id => t.Case.FactOwner(id) == "companion")) to = "companion";
        if (kind == "help" && to != "companion") to = "supervisor";
        if (to is "patient" or "companion") read["pending_ok"] = "na";

        var reply = new JsonObject { ["read"] = read, ["to"] = to };
        var silent = t.Case.Unconscious(t.Risk) && to == "patient"
            || t.Nurse && to == "nurse"
            || !t.Nurse && to == "nurse" && (work || kind == "order")
            || to == "room" && (work || kind == "other")
            || answeredOpen && to != "supervisor";
        if (!t.Nurse && to == "nurse" && kind == "order" && !work && facts.Count == 0 && !answeredOpen) { reply["unplaced"] = true; silent = true; }
        if (silent) { reply["reply"] = null; return Reply(200, reply); }

        var speaker = to == "room" ? "patient" : to;
        var line = await VoiceAsync(t, speaker, Prompts.TurnPlan(t.Case, speaker, facts, read), null, ct).ConfigureAwait(false);
        if (line.Failed) { reply["voiceFailed"] = true; reply["reply"] = null; return Reply(200, reply); }
        if (line.Held) { reply["held"] = true; reply["reply"] = null; return Reply(200, reply); }
        reply["reply"] = line.Text;
        return Reply(200, reply);
    }

    /* ---------- a spoken line the room has decided on ---------- */

    private async Task<UnderstandingResponse> LineAsync(Turn t, CancellationToken ct)
    {
        var speaker = Str(t.Body["speaker"], 12);
        if (!Speakers.Contains(speaker)) speaker = "patient";
        if (t.Nurse && speaker == "nurse") return Reply(400, new JsonObject { ["error"] = "speaker" });
        var line = await VoiceAsync(t, speaker, null, Str(t.Body["why"], 300), ct).ConfigureAwait(false);
        if (line.Failed) return Reply(502, new JsonObject { ["error"] = "empty" });
        return Reply(200, new JsonObject { ["reply"] = line.Held ? null : line.Text });
    }

    /* ---------- the grade of the final diagnosis and the handover ---------- */

    private async Task<UnderstandingResponse> GradeAsync(Turn t, CancellationToken ct)
    {
        var raw = await _claude.CompleteAsync(new ClaudeCall(_options.ReaderModel, Prompts.Grader(t.Case, t.Nurse), Prompts.GraderUser(t), 500), ct).ConfigureAwait(false);
        if (ExtractJson(raw) is not JsonObject g) return Reply(502, new JsonObject { ["error"] = "empty" });
        var dx = Str(g["dx"], 8);
        var result = new JsonObject
        {
            // The nurse is not graded on the diagnosis: the room reads the grade as "not applicable".
            ["dx"] = t.Nurse ? "wrong" : dx is "right" or "close" or "wrong" ? dx : "wrong",
            ["s"] = Bool(g["s"]), ["b"] = Bool(g["b"]), ["a"] = Bool(g["a"]), ["r"] = Bool(g["r"]),
            ["invented"] = Bool(g["invented"]),
            ["note"] = Str(g["note"], 240),
        };
        return Reply(200, result);
    }

    /* ---------- one voice ---------- */

    private async Task<Voiced> VoiceAsync(Turn t, string speaker, string? plan, string? why, CancellationToken ct)
    {
        var model = speaker == "supervisor" ? _options.ReaderModel : _options.VoiceModel;
        var raw = await _claude.CompleteAsync(new ClaudeCall(model, Prompts.Voice(t.Case, speaker, t.Nurse), Prompts.VoiceUser(t, speaker, plan, why), 400), ct).ConfigureAwait(false);
        var text = ExtractJson(raw) is JsonObject o ? Str(o["reply"], 400) : "";
        if (text.Length == 0) return new Voiced("", true, false);
        // The supervisor never names the diagnosis unless the trainee already did.
        if (speaker == "supervisor" && Leaks(text, t)) return new Voiced("", false, true);
        return new Voiced(text, false, false);
    }

    private static bool Leaks(string text, Turn t)
    {
        var said = Fold(string.Join(' ', t.History.Where(h => h.R == "s").Select(h => h.T)));
        var folded = Fold(text);
        return t.Case.Accept.Any(term => term.Length >= 3 && folded.Contains(term, StringComparison.Ordinal) && !said.Contains(term, StringComparison.Ordinal));
    }

    /* ---------- the reading, validated against the case file ---------- */

    private static JsonObject? ParseRead(string raw, CaseInfo c, bool nurse)
    {
        if (ExtractJson(raw) is not JsonObject n) return null;
        string Pick(string key, HashSet<string> set, string fallback) { var v = Str(n[key], 16); return set.Contains(v) ? v : fallback; }
        JsonArray Ids(string key, HashSet<string> known) => new(Distinct(n[key], 12).Where(known.Contains).Select(id => (JsonNode)id).ToArray());
        var actions = new JsonArray();
        foreach (var a in (n["actions"] as JsonArray ?? []).OfType<JsonObject>().Take(8))
        {
            var id = Str(a["id"], 40);
            if (!c.ActionIds.Contains(id) || actions.Any(x => x!["id"]!.GetValue<string>() == id)) continue;
            var ok = Str(a["dose_ok"], 8);
            actions.Add(new JsonObject { ["id"] = id, ["dose"] = Str(a["dose"], 40), ["agent"] = Str(a["agent"], 40), ["dose_ok"] = ok is "wrong" or "ok" ? ok : "unclear" });
        }
        var tests = new JsonArray();
        foreach (var x in (n["tests"] as JsonArray ?? []).OfType<JsonObject>().Take(8))
        {
            var id = Str(x["id"], 40);
            if (!c.TestIds.Contains(id) || tests.Any(y => y!["id"]!.GetValue<string>() == id)) continue;
            var ok = Str(x["reason_ok"], 8);
            tests.Add(new JsonObject { ["id"] = id, ["reason"] = Str(x["reason"], 200), ["reason_ok"] = ok is "good" or "weak" ? ok : "none" });
        }
        var tone = n["tone"] as JsonObject;
        var read = new JsonObject
        {
            ["to"] = Pick("to", Targets, "room"),
            ["kind"] = Pick("kind", Kinds, "other"),
            ["facts"] = Ids("facts", c.FactIds),
            ["exam"] = Ids("exam", c.ExamIds),
            ["actions"] = actions,
            ["tests"] = tests,
            ["tone"] = new JsonObject
            {
                ["introduced"] = Bool(tone?["introduced"]), ["empathy"] = Bool(tone?["empathy"]), ["rude"] = Bool(tone?["rude"]),
                ["jargon"] = Bool(tone?["jargon"]), ["explained"] = Bool(tone?["explained"]), ["consent"] = Bool(tone?["consent"]),
            },
            ["pending_ok"] = Pick("pending_ok", PendingOk, "na"),
        };
        if (!nurse) read["vague"] = Pick("vague", Vague, "none");
        return read;
    }

    /* ---------- small helpers ---------- */

    internal static JsonNode? ExtractJson(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        if (start < 0 || end <= start) return null;
        try { return JsonNode.Parse(text[start..(end + 1)]); }
        catch (JsonException) { return null; }
    }

    internal static string Str(JsonNode? node, int max)
    {
        var s = node is JsonValue v && v.TryGetValue<string>(out var text) ? text : "";
        s = s.Trim();
        return s.Length > max ? s[..max] : s;
    }

    private static bool Bool(JsonNode? node) => node is JsonValue v && v.TryGetValue<bool>(out var b) && b;

    private static IEnumerable<string> Distinct(JsonNode? array, int take) =>
        (array as JsonArray ?? []).Select(x => Str(x, 60)).Where(s => s.Length > 0).Distinct().Take(take);

    /// <summary>Arabic folded to one spelling, as the room folds it: no diacritics, one alef, ha for ta marbuta, ya for alef maqsura.</summary>
    internal static string Fold(string s) =>
        Regex.Replace(s ?? "", "[ً-ْـ]", "").Replace('أ', 'ا').Replace('إ', 'ا').Replace('آ', 'ا').Replace('ة', 'ه').Replace('ى', 'ي').ToLowerInvariant();

    private static UnderstandingResponse Reply(int status, JsonNode body) =>
        new(status, Encoding.UTF8.GetBytes(body.ToJsonString(new JsonSerializerOptions { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping })), "application/json");

    private async Task<Dictionary<string, CaseInfo>> LoadAsync(CancellationToken ct)
    {
        if (_cases is not null) return _cases;
        await _loading.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            if (_cases is not null) return _cases;
            using var doc = JsonDocument.Parse(await _files.ReadAsync(CaseDataFiles.ErCases, ct).ConfigureAwait(false));
            var actions = doc.RootElement.GetProperty("actions");
            var tests = doc.RootElement.GetProperty("tests");
            var map = new Dictionary<string, CaseInfo>(StringComparer.Ordinal);
            foreach (var c in doc.RootElement.GetProperty("cases").EnumerateArray())
            {
                var info = new CaseInfo(c, actions, tests);
                map[info.Id] = info;
            }

            _logger.LogInformation("Claude gateway read {Count} cases", map.Count);
            return _cases = map;
        }
        finally { _loading.Release(); }
    }

    private sealed record Voiced(string Text, bool Failed, bool Held);
}
