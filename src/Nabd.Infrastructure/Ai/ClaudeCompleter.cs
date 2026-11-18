using Anthropic;
using Anthropic.Models.Messages;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Nabd.Infrastructure.Ai;

/// <summary>Settings of the connection to Claude. The key is never in a file of the repository: it comes from the environment or the host's secret store.</summary>
public sealed class ClaudeOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "Claude";

    /// <summary>False (the default) keeps the emergency room on its old relay or offline. True, with a key, makes Claude the room's understanding service.</summary>
    public bool Enabled { get; set; }

    /// <summary>The API key. Empty means the <c>ANTHROPIC_API_KEY</c> environment variable. Never commit a key.</summary>
    public string ApiKey { get; set; } = "";

    /// <summary>The model that reads the trainee's message and grades the handover.</summary>
    public string ReaderModel { get; set; } = "claude-opus-5-5";

    /// <summary>The model that voices the patient, the relative, the nurse and the supervisor. A smaller model (for example claude-haiku-5-5) is faster and cheaper.</summary>
    public string VoiceModel { get; set; } = "claude-opus-5-5";

    /// <summary>Seconds one Claude call may take. The room gives up after 15 seconds for a turn, so a turn (a read then a voice) must fit.</summary>
    public int TimeoutSeconds { get; set; } = 7;

    /// <summary>The key to use, or empty when none is set.</summary>
    public string ResolveKey() => !string.IsNullOrWhiteSpace(ApiKey) ? ApiKey : Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY") ?? "";
}

/// <summary>One call to Claude: what to say to it and how long to wait.</summary>
/// <param name="Model">The model.</param>
/// <param name="System">The instructions.</param>
/// <param name="User">The message.</param>
/// <param name="MaxTokens">The most it may write.</param>
public sealed record ClaudeCall(string Model, string System, string User, int MaxTokens);

/// <summary>The one door to Claude. The gateway asks for text through it, so a test can answer without a network and the SDK stays in one class.</summary>
public interface IClaudeCompleter
{
    /// <summary>The text Claude wrote, or null when the call failed, timed out, or was declined.</summary>
    Task<string?> CompleteAsync(ClaudeCall call, CancellationToken cancellationToken = default);
}

/// <summary>Calls Claude through the official Anthropic SDK.</summary>
public sealed class AnthropicSdkCompleter : IClaudeCompleter
{
    private readonly AnthropicClient _client;
    private readonly TimeSpan _timeout;
    private readonly ILogger<AnthropicSdkCompleter> _logger;

    /// <summary>Creates the completer with the configured key.</summary>
    public AnthropicSdkCompleter(IOptions<ClaudeOptions> options, ILogger<AnthropicSdkCompleter> logger)
    {
        ArgumentNullException.ThrowIfNull(options);
        _client = new AnthropicClient { ApiKey = options.Value.ResolveKey() };
        _timeout = TimeSpan.FromSeconds(Math.Clamp(options.Value.TimeoutSeconds, 2, 30));
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<string?> CompleteAsync(ClaudeCall call, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(call);
        try
        {
            var request = new MessageCreateParams
            {
                Model = call.Model,
                MaxTokens = call.MaxTokens,
                System = call.System,
                // Thinking stays at the model's default; low effort keeps a spoken line fast.
                OutputConfig = new OutputConfig { Effort = Effort.Low },
                Messages = [new UserMessageParam { Content = call.User }],
            };
            var response = await _client.Messages.Create(request).WaitAsync(_timeout, cancellationToken).ConfigureAwait(false);
            // A safety decline carries no usable text: the room then uses its own rules for this turn.
            if (response.StopReason == "refusal") { _logger.LogWarning("Claude declined a request to model {Model}", call.Model); return null; }
            var text = string.Concat(response.Content.Select(b => b.Value).OfType<TextBlock>().Select(t => t.Text));
            return string.IsNullOrWhiteSpace(text) ? null : text;
        }
        catch (Exception e) when (e is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            // Only the kind of failure is logged: never the prompt, the key or the trainee's words.
            _logger.LogWarning("Claude call to {Model} failed: {Reason}", call.Model, e.GetType().Name);
            return null;
        }
    }
}
