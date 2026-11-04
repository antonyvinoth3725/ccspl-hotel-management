using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GayatriCateringPortal.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace GayatriCateringPortal.Common
{
    public class AdminSessionMiddleware
    {
        private static readonly Dictionary<string, string> AdminPageRouteOverrides = new(StringComparer.OrdinalIgnoreCase)
        {
            ["FoodMenuCategories"] = "/Admin/FoodCategory",
            ["ViewOrderDetails"] = "/Admin/Orders"
        };

        private static readonly string[] ProtectedCommonPaths =
        {
            "/Common/menus",
            "/Common/GetMenuRights",
            "/Common/CreateRolePermission",
            "/Common/GetEntityMaster"
        };

        private readonly RequestDelegate _next;

        public AdminSessionMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var path = context.Request.Path.Value ?? string.Empty;
            if (!IsProtectedPath(path))
            {
                await _next(context);
                return;
            }

            ApplyNoCacheHeaders(context.Response);

            var userId = context.Session.GetInt32("UserId") ?? 0;
            var roleId = context.Session.GetInt32("RoleId") ?? 0;
            if (userId > 0 && roleId > 0)
            {
                if (path.StartsWith("/Admin", StringComparison.OrdinalIgnoreCase)
                    && IsHtmlPageRequest(context.Request)
                    && !HasAdminPageAccess(context, roleId, path))
                {
                    await RejectForbiddenAsync(context);
                    return;
                }

                await _next(context);
                return;
            }

            await RejectUnauthorizedAsync(context);
        }

        private static bool IsProtectedPath(string path)
        {
            if (path.StartsWith("/Admin", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            return ProtectedCommonPaths.Any(x => path.StartsWith(x, StringComparison.OrdinalIgnoreCase));
        }

        private static bool HasAdminPageAccess(HttpContext context, int roleId, string path)
        {
            if (roleId <= 0)
            {
                return false;
            }

            var commonRepository = context.RequestServices.GetService(typeof(ICommonRepository)) as ICommonRepository;
            if (commonRepository == null)
            {
                return false;
            }

            var requestedPath = ResolveProtectedPagePath(context, path);
            if (string.IsNullOrWhiteSpace(requestedPath))
            {
                return false;
            }

            try
            {
                var groups = commonRepository.GetMenuGroups(roleId);
                if (groups == null || groups.Count == 0)
                {
                    return false;
                }

                foreach (var group in groups)
                {
                    var menus = group?.Menus;
                    if (menus == null || menus.Count == 0)
                    {
                        continue;
                    }

                    foreach (var menu in menus)
                    {
                        var route = NormalizePath(menu?.Route);
                        if (string.IsNullOrWhiteSpace(route))
                        {
                            continue;
                        }

                        if (requestedPath.Equals(route, StringComparison.OrdinalIgnoreCase)
                            || requestedPath.StartsWith(route + "/", StringComparison.OrdinalIgnoreCase))
                        {
                            return true;
                        }
                    }
                }
            }
            catch
            {
                return false;
            }

            return false;
        }

        private static string ResolveProtectedPagePath(HttpContext context, string path)
        {
            var normalizedPath = NormalizePath(path);
            if (!normalizedPath.StartsWith("/Admin", StringComparison.OrdinalIgnoreCase))
            {
                return normalizedPath;
            }

            var actionDescriptor = context.GetEndpoint()?.Metadata.GetMetadata<ControllerActionDescriptor>();
            var controllerName = actionDescriptor?.ControllerName ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(controllerName)
                && AdminPageRouteOverrides.TryGetValue(controllerName, out var overrideRoute)
                && !string.IsNullOrWhiteSpace(overrideRoute))
            {
                return NormalizePath(overrideRoute);
            }

            return normalizedPath;
        }

        private static string NormalizePath(string? path)
        {
            var value = (path ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var queryIndex = value.IndexOf('?');
            if (queryIndex >= 0)
            {
                value = value.Substring(0, queryIndex);
            }

            var hashIndex = value.IndexOf('#');
            if (hashIndex >= 0)
            {
                value = value.Substring(0, hashIndex);
            }

            if (value.Length > 1 && value.EndsWith("/", StringComparison.Ordinal))
            {
                value = value.Substring(0, value.Length - 1);
            }

            return value;
        }

        private static bool IsAjaxOrJsonRequest(HttpRequest request)
        {
            var requestedWith = request.Headers["X-Requested-With"].ToString();
            if (requestedWith.Equals("XMLHttpRequest", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            var accept = request.Headers.Accept.ToString();
            return accept.IndexOf("application/json", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private static bool IsHtmlPageRequest(HttpRequest request)
        {
            if (!HttpMethods.IsGet(request.Method))
            {
                return false;
            }

            if (IsAjaxOrJsonRequest(request))
            {
                return false;
            }

            var accept = request.Headers.Accept.ToString();
            return string.IsNullOrWhiteSpace(accept)
                || accept.IndexOf("text/html", StringComparison.OrdinalIgnoreCase) >= 0
                || accept.IndexOf("*/*", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private static void ApplyNoCacheHeaders(HttpResponse response)
        {
            response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
            response.Headers["Pragma"] = "no-cache";
            response.Headers["Expires"] = "0";
        }

        private static Task RejectUnauthorizedAsync(HttpContext context)
        {
            if (IsHtmlPageRequest(context.Request))
            {
                context.Response.Redirect("/Customer/Home");
                return Task.CompletedTask;
            }

            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";
            return context.Response.WriteAsJsonAsync(new
            {
                success = false,
                message = "Session expired. Please login again."
            });
        }

        private static Task RejectForbiddenAsync(HttpContext context)
        {
            if (IsHtmlPageRequest(context.Request))
            {
                context.Response.Redirect("/Admin/Dashboard");
                return Task.CompletedTask;
            }

            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";
            return context.Response.WriteAsJsonAsync(new
            {
                success = false,
                message = "You do not have access to this page."
            });
        }
    }
}
