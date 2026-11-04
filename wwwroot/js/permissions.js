(function () {
    var currentMenuRights = null;
    var loadedRightsKey = '';

    function toInt(value) {
        var parsed = parseInt(value, 10);
        return isNaN(parsed) ? 0 : parsed;
    }

    function getCurrentUserId() {
        var user = getUserDetails() || {};
        return toInt(user.userId || 0);
    }

    function getCurrentRoleId() {
        var user = getUserDetails() || {};
        return toInt(user.roleId || 0);
    }

    function getCurrentEntityNo() {
        return toInt(sessionStorage.getItem('gcCurrentEntityNo') || '0');
    }

    function storeCurrentMenuContext(entityNo, route, menuName) {
        var updated = false;
        if (entityNo && entityNo > 0) {
            var nextEntityNo = String(entityNo);
            if (sessionStorage.getItem('gcCurrentEntityNo') !== nextEntityNo) {
                sessionStorage.setItem('gcCurrentEntityNo', nextEntityNo);
                updated = true;
            }
        }
        if (route) {
            sessionStorage.setItem('gcCurrentMenuRoute', route);
        }
        if (menuName) {
            sessionStorage.setItem('gcCurrentMenuName', menuName);
        }

        if (updated) {
            loadedRightsKey = '';
            loadCurrentMenuRights();
        }
    }

    function findPermissionsForCurrentEntity() {
        return currentMenuRights;
    }

    function setElementVisibility($elements, isVisible) {
        if (!$elements || !$elements.length) return;

        $elements.each(function () {
            if (isVisible) {
                this.style.removeProperty('display');
                this.removeAttribute('data-permission-hidden');
            } else {
                this.style.setProperty('display', 'none', 'important');
                this.setAttribute('data-permission-hidden', '1');
            }
        });
    }

    function notifyMenuRightsChanged() {
        try {
            document.dispatchEvent(new CustomEvent('gc:menu-rights-loaded', {
                detail: {
                    entityNo: getCurrentEntityNo(),
                    roleId: getCurrentRoleId(),
                    rights: currentMenuRights
                }
            }));
        } catch (e) {
            // Ignore event dispatch issues in older browsers.
        }
    }

    function hideIfNeeded(root, permission, selectors) {
        if (selectors && selectors.length) {
            setElementVisibility($(root).find(selectors.join(', ')), !!permission);
        }
    }

    function toggleByHeuristic(root, permission, matcher) {
        var $root = root ? $(root) : $(document);
        var $candidates = $root.find('button, a.btn, .action-item, .dropdown-item');

        $candidates.each(function () {
            var $el = $(this);
            var text = ($el.text() || '').toLowerCase().replace(/\s+/g, ' ').trim();
            var id = ($el.attr('id') || '').toLowerCase();
            var cls = ($el.attr('class') || '').toLowerCase();
            var onclick = ($el.attr('onclick') || '').toLowerCase();
            var title = ($el.attr('title') || '').toLowerCase();
            var aria = ($el.attr('aria-label') || '').toLowerCase();

            if (typeof matcher === 'function' && matcher({ text: text, id: id, cls: cls, onclick: onclick, title: title, aria: aria })) {
                setElementVisibility($el, !!permission);
            }
        });
    }

    function inferModalSavePermission($button) {
        var explicitPermission = String($button.attr('data-permission') || '').toLowerCase();
        if (explicitPermission === 'create' || explicitPermission === 'edit') {
            return explicitPermission;
        }

        var $modal = $button.closest('.modal-overlay, .modal-box, .modal-content');
        if (!$modal.length) {
            return '';
        }

        var titleText = $.trim($modal.find('.modal-title, [id$="-title"], [id="modal-title"]').first().text()).toLowerCase();
        var buttonText = $.trim($button.attr('data-gc-button-label') || $button.text()).toLowerCase();

        if (titleText.indexOf('edit') > -1 || titleText.indexOf('update') > -1 || buttonText.indexOf('update') === 0) {
            return 'edit';
        }

        if (titleText.indexOf('create') > -1 || titleText.indexOf('add') > -1 || titleText.indexOf('new') > -1 || buttonText.indexOf('save') === 0) {
            return 'create';
        }

        return '';
    }

    function applyModalSaveVisibility(root, canCreate, canEdit) {
        var $root = root ? $(root) : $(document);
        var $buttons = $root.find('.modal-overlay button, .modal-box button, .modal-content button');

        $buttons.each(function () {
            var $button = $(this);
            var permissionType = inferModalSavePermission($button);
            if (!permissionType) {
                return;
            }

            setElementVisibility($button, permissionType === 'edit' ? canEdit : canCreate);
        });
    }

    function applyPermissionVisibility(root) {
        var $root = root ? $(root) : $(document);
        var permission = findPermissionsForCurrentEntity();

        // Secure default: when permission context is unavailable, keep protected actions hidden.
        var canCreate = !!(permission && (permission.create || permission.Create));
        var canEdit = !!(permission && (permission.edit || permission.Edit));
        var canDelete = !!(permission && (permission.delete || permission.Delete));
        var canActiveInactive = !!(permission && (permission.activeInActive || permission.ActiveInActive || permission.activeInactive || permission.ActiveInactive));
        var canDownload = !!(permission && (permission.download || permission.Download));
        var canPrint = !!(permission && (permission.print || permission.Print));

        hideIfNeeded($root, canCreate, [
            '.btn-add',
            '.btn-create',
            '[data-permission="create"]',
            '[id^="btnAdd"]',
            'button[id*="Add"]',
            'a.btn[id*="Add"]'
        ]);

        toggleByHeuristic($root, canCreate, function (v) {
            return v.text === 'add' || v.text.indexOf('+ add') === 0 || v.text.indexOf('add ') === 0 || v.text.indexOf('new ') === 0 || v.text.indexOf('create') === 0 || v.id.indexOf('add') > -1 || v.id.indexOf('create') > -1 || v.cls.indexOf('btn-add') > -1 || v.cls.indexOf('btn-create') > -1;
        });

        if (!canCreate) {
            $root.find('button, a.btn').each(function () {
                var $el = $(this);
                var text = ($el.text() || '').toLowerCase().replace(/\s+/g, ' ').trim();
                var id = ($el.attr('id') || '').toLowerCase();
                var onclick = ($el.attr('onclick') || '').toLowerCase();

                var looksLikeCreateAction = text.indexOf('+ add') === 0 || text.indexOf('add ') === 0 || text === 'add' || text.indexOf('new ') === 0 || id.indexOf('btnadd') === 0 || id.indexOf('add') > -1 || (onclick.indexOf('open') > -1 && text.indexOf('add') > -1);
                if (looksLikeCreateAction) {
                    $el.hide();
                }
            });
        }

        hideIfNeeded($root, canEdit, [
            '.btn-edit',
            '[data-permission="edit"]'
        ]);

        toggleByHeuristic($root, canEdit, function (v) {
            if (v.text.indexOf('role permission') > -1 || v.cls.indexOf('btn-role-permission') > -1) {
                return false;
            }
            return v.text === 'edit' || v.text.indexOf('edit ') === 0 || v.id.indexOf('edit') > -1 || v.cls.indexOf('btn-edit') > -1 || v.onclick.indexOf('edit') > -1;
        });

        hideIfNeeded($root, canDelete, [
            '.btn-delete',
            '[data-permission="delete"]'
        ]);

        toggleByHeuristic($root, canDelete, function (v) {
            return v.text === 'delete' || v.text.indexOf('delete ') === 0 || v.text === 'remove' || v.id.indexOf('delete') > -1 || v.cls.indexOf('btn-delete') > -1 || v.onclick.indexOf('delete') > -1 || v.onclick.indexOf('remove') > -1;
        });

        hideIfNeeded($root, canActiveInactive, [
            '.btn-toggle',
            '.btn-set-active',
            '.btn-set-inactive',
            '[data-permission="activeinactive"]'
        ]);

        toggleByHeuristic($root, canActiveInactive, function (v) {
            return v.text === 'active' || v.text === 'inactive' || v.text.indexOf('activate') === 0 || v.text.indexOf('deactivate') === 0 || v.cls.indexOf('btn-toggle') > -1 || v.cls.indexOf('btn-set-active') > -1 || v.cls.indexOf('btn-set-inactive') > -1 || v.onclick.indexOf('set') > -1 && v.onclick.indexOf('active') > -1;
        });

        hideIfNeeded($root, canDownload, [
            '.btn-export',
            '.btn-download',
            '.js-export-trigger',
            '.js-export-excel',
            '.js-export-pdf',
            '[data-permission="download"]'
        ]);

        toggleByHeuristic($root, canDownload, function (v) {
            return v.text === 'export' || v.text.indexOf('export ') === 0 || v.text.indexOf('download') === 0 || v.text.indexOf('excel') > -1 || v.text.indexOf('pdf') > -1 || v.id.indexOf('export') > -1 || v.id.indexOf('download') > -1 || v.cls.indexOf('btn-export') > -1 || v.cls.indexOf('btn-download') > -1 || v.title.indexOf('export') > -1 || v.aria.indexOf('export') > -1;
        });

        hideIfNeeded($root, canPrint, [
            '.btn-print',
            '.js-print-page',
            '.js-print-invoice',
            '[data-permission="print"]'
        ]);

        toggleByHeuristic($root, canPrint, function (v) {
            return v.text === 'print' || v.text.indexOf('print ') === 0 || v.id.indexOf('print') > -1 || v.cls.indexOf('btn-print') > -1 || v.title.indexOf('print') > -1 || v.aria.indexOf('print') > -1;
        });

        applyModalSaveVisibility($root, canCreate, canEdit);

    }


    function loadCurrentMenuRights() {
        var roleId = getCurrentRoleId();
        var entityNo = getCurrentEntityNo();

        if (!roleId || !entityNo) {
            currentMenuRights = null;
            applyPermissionVisibility(document);
            notifyMenuRightsChanged();
            return $.Deferred().resolve().promise();
        }

        var nextKey = roleId + ':' + entityNo;
        if (loadedRightsKey === nextKey && currentMenuRights) {
            applyPermissionVisibility(document);
            notifyMenuRightsChanged();
            return $.Deferred().resolve().promise();
        }

        return $.ajax({
            url: '/Common/GetMenuRights?roleId=' + encodeURIComponent(roleId) + '&entityNo=' + encodeURIComponent(entityNo),
            type: 'GET',
            dataType: 'json',
            success: function (rights) {
                currentMenuRights = rights || null;
                loadedRightsKey = nextKey;
                applyPermissionVisibility(document);
                notifyMenuRightsChanged();
            },
            error: function () {
                currentMenuRights = null;
                loadedRightsKey = '';
                applyPermissionVisibility(document);
                notifyMenuRightsChanged();
            }
        });
    }

    function getCurrentMenuRights() {
        return currentMenuRights;
    }

    function getMenuPermissionFlag(rights, permissionName) {
        if (!rights) return false;

        var name = String(permissionName || '').toLowerCase();
        if (name === 'create') return !!(rights.create || rights.Create);
        if (name === 'edit') return !!(rights.edit || rights.Edit);
        if (name === 'delete') return !!(rights.delete || rights.Delete);
        if (name === 'activeinactive') return !!(rights.activeInActive || rights.ActiveInActive || rights.activeInactive || rights.ActiveInactive);
        if (name === 'download') return !!(rights.download || rights.Download);
        if (name === 'print') return !!(rights.print || rights.Print);
        if (name === 'view') return !!(rights.view || rights.View);
        return false;
    }

    function hasCurrentMenuPermission(permissionName) {
        return getMenuPermissionFlag(currentMenuRights, permissionName);
    }

    function redirectAfterLogin(context) {
        var userRoleId = toInt(context && context.roleId);

        if (!userRoleId) {
            userRoleId = getCurrentRoleId();
        }

        if (typeof window.updateUserDetails === 'function') {
            window.updateUserDetails({ roleId: userRoleId || 0 });
        } else {
            var currentUser = getUserDetails();
            currentUser.roleId = userRoleId || 0;
            localStorage.setItem('UserDetails', JSON.stringify(currentUser));
        }

        if (!userRoleId) {
            window.location.href = '/Customer/Home';
            return;
        }

        sessionStorage.removeItem('gcCurrentEntityNo');
        sessionStorage.removeItem('gcCurrentMenuRoute');
        sessionStorage.removeItem('gcCurrentMenuName');
        currentMenuRights = null;
        loadedRightsKey = '';

        var roleLabel = (context && context.roleLabel ? String(context.roleLabel) : '').toLowerCase();
        var targetRoute = roleLabel.indexOf('customer') > -1 ? '/Customer/Home' : '/Admin/Dashboard';
        window.location.href = targetRoute;
    }

    function bootstrapPermissions() {
        applyPermissionVisibility(document);
        loadCurrentMenuRights();
    }

    document.addEventListener('DOMContentLoaded', bootstrapPermissions);

    var permissionObserver = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
            var mutation = mutations[i];
            if (mutation.addedNodes && mutation.addedNodes.length) {
                applyPermissionVisibility(document);
                break;
            }
        }
    });

    permissionObserver.observe(document.documentElement, { childList: true, subtree: true });

    window.getCurrentUserId = getCurrentUserId;
    window.getCurrentRoleId = getCurrentRoleId;
    window.getCurrentEntityNo = getCurrentEntityNo;
    window.storeCurrentMenuContext = storeCurrentMenuContext;
    window.loadCurrentMenuRights = loadCurrentMenuRights;
    window.getCurrentMenuRights = getCurrentMenuRights;
    window.getMenuPermissionFlag = getMenuPermissionFlag;
    window.hasCurrentMenuPermission = hasCurrentMenuPermission;
    window.applyPermissionVisibility = applyPermissionVisibility;
    window.redirectAfterLogin = redirectAfterLogin;
})();
