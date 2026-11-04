using System;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;

namespace GayatriCateringPortal.Common;

public class GlobalExceptionFilter : IExceptionFilter
{
    private readonly ILogger<GlobalExceptionFilter> _logger;

    public GlobalExceptionFilter(ILogger<GlobalExceptionFilter> logger)
    {
        _logger = logger;
    }

    public void OnException(ExceptionContext context)
    {
        _logger.LogError(context.Exception, "Unhandled exception for path: {Path}", context.HttpContext.Request.Path);

        var request = context.HttpContext.Request;
        var acceptHeader = request.Headers["Accept"].ToString();
        var acceptsJson = acceptHeader.Contains("application/json", StringComparison.OrdinalIgnoreCase);
        var isAjax = string.Equals(request.Headers["X-Requested-With"], "XMLHttpRequest", StringComparison.OrdinalIgnoreCase);
        var isApiLikePath = request.Path.StartsWithSegments("/api")
                            || request.Path.Value?.Contains("/get", StringComparison.OrdinalIgnoreCase) == true
                            || request.Path.Value?.Contains("/save", StringComparison.OrdinalIgnoreCase) == true
                            || request.Path.Value?.Contains("/delete", StringComparison.OrdinalIgnoreCase) == true
                            || request.Path.Value?.Contains("/activeinactive", StringComparison.OrdinalIgnoreCase) == true;

        if (acceptsJson || isAjax || isApiLikePath)
        {
            context.Result = new JsonResult(new
            {
                success = false,
                message = "Something went wrong. Please try again."
            })
            {
                StatusCode = 500
            };
        }
        else
        {
            context.Result = new RedirectToActionResult("Error", "Home", null);
        }

        context.ExceptionHandled = true;
    }
}
