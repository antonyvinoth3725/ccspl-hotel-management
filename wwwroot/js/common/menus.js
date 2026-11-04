// Simple jQuery menu loader to match the project's style
$(document).ready(function () {
    var bootCompleted = false;

    function getRoleId() {
        if (typeof window.getCurrentRoleId === 'function') {
            return parseInt(window.getCurrentRoleId() || '0', 10) || 0;
        }
        return 0;
    }

    function getMenuCacheKey(roleId) {
        return 'gcp_admin_menus_role_' + roleId;
    }

    function cacheMenuGroups(roleId, groups) {
        if (!roleId) return;
        try {
            var payload = {
                ts: Date.now(),
                groups: Array.isArray(groups) ? groups : []
            };
            sessionStorage.setItem(getMenuCacheKey(roleId), JSON.stringify(payload));
        } catch (e) {
            // Ignore cache failures (quota/private mode), menu still works via API.
        }
    }

    function readCachedMenuGroups(roleId) {
        if (!roleId) return null;
        try {
            var raw = sessionStorage.getItem(getMenuCacheKey(roleId));
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.groups)) return null;
            return parsed.groups;
        } catch (e) {
            return null;
        }
    }

    function bindSidebarMenuContext() {
        $('#sidebarDynamic .sidebar-item').off('click.menucontext').on('click.menucontext', function () {
            var entityNo = parseInt($(this).data('entity-no') || '0', 10) || 0;
            var route = $(this).attr('href') || '';
            var menuName = $(this).data('menu-name') || '';
            if (entityNo > 0 && window.storeCurrentMenuContext) {
                window.storeCurrentMenuContext(entityNo, route, menuName);
                if (window.applyPermissionVisibility) {
                    window.applyPermissionVisibility(document);
                }
            }
        });

        var $active = $('#sidebarDynamic .sidebar-item.active').first();
        if ($active.length && window.storeCurrentMenuContext) {
            var activeEntityNo = parseInt($active.data('entity-no') || '0', 10) || 0;
            var activeRoute = $active.attr('href') || '';
            var activeName = $active.data('menu-name') || '';
            if (activeEntityNo > 0) {
                window.storeCurrentMenuContext(activeEntityNo, activeRoute, activeName);
                if (window.applyPermissionVisibility) {
                    window.applyPermissionVisibility(document);
                }
            }
        }

        $('#sidebarMenuSearch').off('input.menusearch').on('input.menusearch', function () {
            var query = String($(this).val() || '').trim().toLowerCase();
            var visibleCount = 0;

            $('#sidebarDynamic .sidebar-section').each(function () {
                var $section = $(this);
                var sectionVisibleCount = 0;
                var $item = $section.next('.sidebar-item');

                while ($item.length) {
                    var itemMatches = !query || String($item.text() || '').toLowerCase().indexOf(query) >= 0;
                    $item.toggle(itemMatches);
                    if (itemMatches) {
                        sectionVisibleCount++;
                        visibleCount++;
                    }
                    $item = $item.next('.sidebar-item');
                }

                $section.toggle(sectionVisibleCount > 0);
            });

            $('#sidebarMenuNoResults').toggle(!!query && visibleCount === 0);
        });
    }

    function renderSidebar(groups) {
        function normalizePath(path) {
            var value = String(path || '').trim();
            if (!value) return '';
            value = value.split('?')[0].split('#')[0];
            if (value.length > 1 && value.charAt(value.length - 1) === '/') {
                value = value.substring(0, value.length - 1);
            }
            return value.toLowerCase();
        }

        var currentPath = normalizePath(window.location.pathname || '/');
        var html = '<div class="sidebar-menu-search-wrap">' +
            '<span class="sidebar-menu-search-icon" aria-hidden="true">&#128269;</span>' +
            '<input type="search" id="sidebarMenuSearch" class="sidebar-menu-search" placeholder="Search menu..." aria-label="Search menu" autocomplete="off" spellcheck="false">' +
            '</div>';

        if (Array.isArray(groups) && groups.length) {
            for (var gi = 0; gi < groups.length; gi++) {
                var g = groups[gi] || {};
                var groupName = g.name || g.Name || '';
                html += '<div class="sidebar-section">' + groupName + '</div>';
                var menus = g.menus || g.Menus || [];

                for (var i = 0; i < menus.length; i++) {
                    var m = menus[i] || {};
                    var route = m.route || '#';
                    var name = m.name || '';
                    var icon = m.menuIcon || '';
                    var entityNo = m.entityNo || m.EntityNo || 0;
                    var routePath = normalizePath(route);
                    var active = !!(routePath && (currentPath === routePath || currentPath.indexOf(routePath + '/') === 0));

                    html += '<a class="sidebar-item' + (active ? ' active' : '') + '" href="' + route + '" data-entity-no="' + entityNo + '" data-menu-name="' + name + '"><span class="icon">' + icon + '</span> ' + name + '</a>';
                }
            }
        }

        if (!html) {
            html += '<div class="sidebar-section">Menu</div><div class="sidebar-item">No menu items found</div>';
        }

        html += '<div id="sidebarMenuNoResults" class="sidebar-menu-no-results" style="display:none">No matching menu</div>';

        $('#sidebarDynamic').html(html);
        var sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.scrollTop = 0;
        }
        bindSidebarMenuContext();
    }

    function fetchMenus(roleId, onSuccess, onError) {
        $.ajax({
            url: '/Common/menus?roleId=' + encodeURIComponent(roleId),
            type: 'GET',
            dataType: 'json',
            success: function (groups) {
                if (typeof onSuccess === 'function') {
                    onSuccess(groups);
                }
            },
            error: function (err) {
                if (typeof onError === 'function') {
                    onError(err);
                }
            }
        });
    }

    function completeAppBoot() {
        if (bootCompleted) {
            return;
        }

        bootCompleted = true;
        var $loader = $('#appBootLoader');
        if (!$loader.length) {
            return;
        }

        $loader.addClass('is-hiding');
        setTimeout(function () {
            $loader.addClass('hidden');
        }, 280);
    }

    var bootFallbackTimer = setTimeout(function () {
        completeAppBoot();
    }, 8000);

    if (!$('#sidebarDynamic').length) {
        clearTimeout(bootFallbackTimer);
        completeAppBoot();
        return;
    }

    var roleId = getRoleId();
    var cachedGroups = readCachedMenuGroups(roleId);

    if (cachedGroups && cachedGroups.length) {
        renderSidebar(cachedGroups);
        clearTimeout(bootFallbackTimer);
        completeAppBoot();

        fetchMenus(roleId, function (groups) {
            renderSidebar(groups);
            cacheMenuGroups(roleId, groups);
        }, function () {
            // Keep cached menu on refresh failure.
        });

        return;
    }

    fetchMenus(roleId, function (groups) {
        renderSidebar(groups);
        cacheMenuGroups(roleId, groups);
        clearTimeout(bootFallbackTimer);
        completeAppBoot();
    }, function (err) {
        console.error('Unable to load menus', err);
        $('#sidebarDynamic').text('Menu load failed');
        clearTimeout(bootFallbackTimer);
        completeAppBoot();
    });
});
