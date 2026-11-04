$(document).ready(function () {
    loadRoles();
});

function closeRolesModal() {
    $('#rolesModal').addClass('hidden');
}

function openRolesModal() {
    clearRoleForm();
    $('#model-title').html('Create Role');
    $('#rolesModal').removeClass('hidden');

    initRoleField('#roleCode', '#roleCodeError');
    initRoleField('#roleName', '#roleNameError');
    
    // Change button text to "Save" for create mode
    setActionButtonLabel('#saveRoleBtn', 'Save');
    GetAutoGenerateCode();
}

function GetAutoGenerateCode() {
    var entityNo = parseInt(sessionStorage.getItem('gcCurrentEntityNo') || '0', 10) || 0;

    if (entityNo <= 0) {
        showToast('Entity No was not found in session storage.', 3000, { type: 'warning', title: 'Validation' });
        return;
    }

    $.ajax({
        url: '/Admin/CodeTemplate/latestcode?entityNo=' + entityNo,
        type: 'GET',
        success: function (res) {
            if (res && res.success) {
                $('#roleCode').val(res.code || '');
            } else {
                showToast((res && res.message) || 'Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
            }
        },
        error: function () {
            showToast('Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
        }
    });
}

function loadRoles() {
    showRolesLoader(true);

    $.ajax({
        url: '/Admin/Roles/get',
        type: 'GET',
        dataType: 'json',
        success: function (rows) {
            renderRolesList(Array.isArray(rows) ? rows : []);
        },
        error: function () {
            renderRolesList([]);
            showToast('Unable to load roles.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showRolesLoader(false);
        }
    });
}

function showRolesLoader(show) {
    // prefer the page-specific id, but accept the shared class names too
    var $panel = $('.pageloaderpanel');
    if ($panel.length) {
        $('#rolesListPanel .table-wrap').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
        return;
    }
}

function renderRolesList(rows) {
    debugger;
    rows = Array.isArray(rows) ? rows : [];
    var html = '';
    if (rows.length) {
        for (var i = 0; i < rows.length; i++) {
            var role = rows[i];
            var serial = i + 1;
            var id = role.id || 0;
            var code = role.code || '';
            var name = role.name || '';
            var remarks = role.remarks || '';
            var active = role.isActive;

            var actions;
            if (active) {
                actions = `<button type="button" class="action-item roles-action-edit" data-id="${id}" onclick="editRole(this.dataset.id)"><span class="action-icon action-icon-text" aria-hidden="true">&#9998;</span>Edit</button>
                           <button type="button" class="action-item roles-action-inactive" data-id="${id}" onclick="setRoleActive(this.dataset.id, false)"><span class="action-icon action-icon-text" aria-hidden="true">&#128274;</span>Inactive</button>`;
            } else {
                actions = `<button type="button" class="action-item roles-action-active" data-id="${id}" onclick="setRoleActive(this.dataset.id, true)"><span class="action-icon action-icon-text" aria-hidden="true">&#128275;</span>Active</button>`;
            }

            var statusBadge;
            if (active) {
                statusBadge = '<span class="badge-pill badge-pill--success">Active</span>';
            } else {
                statusBadge = '<span class="badge-pill badge-pill--warning">Inactive</span>';
            }

            html += `
                <tr>
                    <td>${serial}</td>
                    <td><strong>${code || ''}</strong></td>
                    <td><strong>${name || ''}</strong></td>
                    <td>${remarks || ''}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="row-actions roles-row-actions">
                            <button class="dots-btn" title="Actions">⋯</button>
                            <div class="actions-menu hidden">
                                ${actions}
                                <button type="button" class="action-item roles-action-delete" data-id="${id}" onclick="deleteRole(this.dataset.id)"><span class="action-icon action-icon-text" aria-hidden="true">&#128465;</span>Delete</button>
                                <button type="button" class="action-item roles-action-permission" data-permission="" data-id="${id}" data-code="${code}" onclick="showRolePermission(this.dataset.id, this.dataset.code)"><span class="action-icon action-icon-text" aria-hidden="true">&#9881;</span>Role Permission</button>
                            </div>
                        </div>
                    </td>
                </tr>`;
        }
    }

    $('#rolesList tbody').html(html);
    if (typeof renderDataTable === 'function') {
        renderDataTable('rolesList');
    }
}

function clearRoleForm(keepId) {
    if (!keepId) {
        $('#roleId').val('');
        // Reset button label to "Save" when clearing the form in create mode.
        setActionButtonLabel('#saveRoleBtn', 'Save');
    }
    $('#roleName').val('');
    $('#roleRemarks').val('');
    clearRoleError('#roleCode', '#roleCodeError');
    clearRoleError('#roleName', '#roleNameError');
}

function setRoleError(inputSelector, errorSelector, message) {
    $(inputSelector).addClass('input-error');
    $(errorSelector).removeClass('hidden').text(message);
}

function clearRoleError(inputSelector, errorSelector) {
    $(inputSelector).removeClass('input-error');
    $(errorSelector).addClass('hidden').text('');
}

// Initialize role input field: clear error and attach input handler
function initRoleField(inputSelector, errorSelector) {
    clearRoleError(inputSelector, errorSelector);
    var el = document.querySelector(inputSelector);
    if (el) {
        el.oninput = function () {
            clearRoleError(inputSelector, errorSelector);
        };
    }
}

function saveRole() {
    if (window.gcFormValidation && !window.gcFormValidation.validateScope($('.main').first(), true)) {
        return;
    }

    clearRoleError('#roleCode', '#roleCodeError');
    clearRoleError('#roleName', '#roleNameError');

    var code = $('#roleCode').val();
    if (code) {
        code = code.toString().trim();
    } else {
        code = '';
    }

    var name = $('#roleName').val();
    if (name) {
        name = name.toString().trim();
    } else {
        name = '';
    }

    var firstInvalid = null;

    if (!code) {
        setRoleError('#roleCode', '#roleCodeError', 'Code is required');
        firstInvalid = '#roleCode';
    }

    if (!name) {
        setRoleError('#roleName', '#roleNameError', 'Name is required');
        if (!firstInvalid) {
            firstInvalid = '#roleName';
        }
    }

    if (firstInvalid) {
        $(firstInvalid).focus();
        return;
    }

    setButtonBusy('#saveRoleBtn', true, 'Saving...');

    var roleId = $('#roleId').val();
    var entityNo = parseInt(sessionStorage.getItem('gcCurrentEntityNo') || '0', 10) || 0;
    var role = {
        Id: roleId ? parseInt(roleId) : 0,
        Code: code,
        Name: name,
        Remarks: $('#roleRemarks').val() || '',
        IsActive: true,
        IsDeleted: false,
        CreatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        UpdatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        EntityNo: entityNo
    };

    var endpoint = role.Id ? '/Admin/Roles/update' : '/Admin/Roles/create';

    $.ajax({
        url: endpoint,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(role),
        success: function (res) {
            debugger;
            if (res && res.success) {
                showToast(roleId == 0 ? 'Role saved successfully.' : 'Role updated successfully', 3000, { type: 'success', title: roleId == 0 ? 'Saved' : 'Updated' });
                clearRoleForm();
                $('#rolesModal').addClass('hidden');
                loadRoles();
            } else {
                setButtonBusy('#saveRoleBtn', false);
                var errorMsg = res && res.message ? res.message : (roleId == 0 ? 'Unable to save role.' : 'Unable to update role');
                showToast(errorMsg, 3000, { type: 'error', title: roleId == 0 ? 'Save failed' : 'Update failed' });
            }
        },
        error: function () {
            setButtonBusy('#saveRoleBtn', false);
            showToast(roleId == 0 ? 'Save failed.' : 'Update failed.', 3000, { type: 'error', title: roleId == 0 ? 'Save failed' : 'Update failed' });
        }
    });
}

function editRole(id) {
    $('#model-title').html('Edit Role');

    $.ajax({
        url: '/Admin/Roles/get/' + id,
        type: 'GET',
        success: function (role) {
            if (!role) {
                showToast('Role not found.', 3000, { type: 'warning', title: 'Not found' });
                return;
            }
                $('#roleId').val(role.Id || role.id || '');
                $('#roleCode').val(role.Code || role.code || '');
                $('#roleName').val(role.Name || role.name || '');
                $('#roleRemarks').val(role.Remarks || role.remarks || '');
                // initialize fields (clear validation and attach handlers)
                initRoleField('#roleCode', '#roleCodeError');
                initRoleField('#roleName', '#roleNameError');

                $('#rolesModal').removeClass('hidden');
                
                // Change button text to "Update" for edit mode
                setActionButtonLabel('#saveRoleBtn', 'Update');
        },
        error: function () { showToast('Unable to load role.', 3000, { type: 'error', title: 'Load failed' }); }
    });
}

function showRolePermission(id, code) {
    if (!id) return;
    window.location.href = '/Admin/Roles/RolePermission?RoleId=' + encodeURIComponent(id);
}

function hideRolePermission() {
    // Permission view moved to separate route: /Admin/RolePermission
}

function deleteRole(id) {
    if (!id) return;
    showToast('Delete this role?', 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Delete',
        noText: 'Cancel',
        onYes: function () {
            $.ajax({
                url: '/Admin/Roles/delete/' + id,
                type: 'POST',
                success: function (res) {
                    if (res && res.success) {
                        showToast('Role deleted successfully.', 3000, { type: 'success', title: 'Deleted' });
                    } else {
                        showToast('Unable to delete role.', 3000, { type: 'error', title: 'Delete failed' });
                    }
                    setTimeout(loadRoles, 300);
                },
                error: function () { showToast('Delete failed.', 3000, { type: 'error', title: 'Delete failed' }); }
            });
        },
        onNo: function () {
            showToast('Delete cancelled.', 3000, { type: 'info', title: 'Cancelled' });
        }
    });
}

function setRoleActive(id, isActive) {
    if (!id) return;

    var confirmMessage = isActive ? 'Mark this role active?' : 'Mark this role inactive?';
    var successMessage = isActive ? 'Role activated.' : 'Role marked inactive.';

    showToast(confirmMessage, 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Yes',
        noText: 'No',
        onYes: function () {
            $.ajax({
                url: '/Admin/Roles/activeinactive?id=' + id + '&status=' + isActive,
                type: 'POST',
                success: function (res) {
                    if (res && res.success) {
                        showToast(successMessage, 3000, { type: 'success', title: 'Updated' });
                    } else {
                        showToast('Unable to update role status.', 3000, { type: 'error', title: 'Update failed' });
                    }
                    setTimeout(loadRoles, 350);
                },
                error: function () {
                    showToast('Request failed.', 3000, { type: 'error', title: 'Request failed' });
                }
            });
        },
        onNo: function () {
            showToast('Action cancelled.', 3000, { type: 'info', title: 'Cancelled' });
        }
    });
}

