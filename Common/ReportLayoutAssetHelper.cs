using System.Text.Json;
using Microsoft.Extensions.Hosting;

namespace GayatriCateringPortal.Common;

internal static class ReportLayoutAssetHelper
{
    public static bool Exists(IHostEnvironment environment, IConfiguration configuration, string? relativeAssetPath)
    {
        return ResolveExistingPath(environment, configuration, relativeAssetPath) != null;
    }

    public static JsonElement? LoadJson(IHostEnvironment environment, IConfiguration configuration, string? relativeAssetPath)
    {
        var fullPath = ResolveExistingPath(environment, configuration, relativeAssetPath);
        if (string.IsNullOrWhiteSpace(fullPath))
        {
            return null;
        }

        if (!string.Equals(Path.GetExtension(fullPath), ".json", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var json = File.ReadAllText(fullPath);
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
    }

    public static string? LoadHtml(IHostEnvironment environment, IConfiguration configuration, string? relativeAssetPath)
    {
        var fullPath = ResolveExistingPath(environment, configuration, relativeAssetPath);
        if (string.IsNullOrWhiteSpace(fullPath))
        {
            return null;
        }

        var extension = Path.GetExtension(fullPath);
        if (!string.Equals(extension, ".html", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(extension, ".htm", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var html = File.ReadAllText(fullPath);
        return string.IsNullOrWhiteSpace(html) ? null : html;
    }

    public static string? ResolveTemplateKind(IHostEnvironment environment, IConfiguration configuration, string? relativeAssetPath)
    {
        var fullPath = ResolveExistingPath(environment, configuration, relativeAssetPath);
        if (string.IsNullOrWhiteSpace(fullPath))
        {
            return null;
        }

        return Path.GetExtension(fullPath).ToLowerInvariant() switch
        {
            ".json" => "json",
            ".html" or ".htm" => "html",
            _ => null
        };
    }

    private static string? ResolveExistingPath(IHostEnvironment environment, IConfiguration configuration, string? relativeAssetPath)
    {
        if (string.IsNullOrWhiteSpace(relativeAssetPath))
        {
            return null;
        }

        var normalizedPath = relativeAssetPath
            .Trim()
            .Replace('/', Path.DirectorySeparatorChar)
            .Replace('\\', Path.DirectorySeparatorChar);

        var candidates = new List<string>();

        if (Path.IsPathRooted(normalizedPath))
        {
            candidates.Add(normalizedPath);
        }
        else
        {
            candidates.Add(Path.Combine(environment.ContentRootPath, normalizedPath));

            var reportsRoot = configuration["Reporting:TemplatesRoot"]?.Trim();
            if (!string.IsNullOrWhiteSpace(reportsRoot))
            {
                var normalizedRoot = reportsRoot
                    .Replace('/', Path.DirectorySeparatorChar)
                    .Replace('\\', Path.DirectorySeparatorChar)
                    .Trim(Path.DirectorySeparatorChar);

                var normalizedRelativePath = normalizedPath;
                if (normalizedRelativePath.StartsWith(normalizedRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                {
                    normalizedRelativePath = normalizedRelativePath[(normalizedRoot.Length + 1)..];
                }

                candidates.Add(Path.Combine(environment.ContentRootPath, normalizedRoot, normalizedRelativePath));
            }
        }

        return candidates
            .Where(path => !string.IsNullOrWhiteSpace(path))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault(File.Exists);
    }
}
