var allUsers = [];

$(document).ready(function () {
    bindUsersSearch();
    loadUsers();
});

function bindUsersSearch() {
    $('#usersSearch').off('input.users').on('input.users', function () {
        applyUsersFilter($(this).val());
    });
}

function applyUsersFilter(searchText) {
    var term = (searchText || '').toLowerCase().trim();
    if (!term) {
        renderUsersList(allUsers);
        return;
    }

    var filtered = allUsers.filter(function (u) {
        var code = String(u.code || u.Code || '').toLowerCase();
        var name = String(u.name || u.Name || '').toLowerCase();
        var email = String(u.email || u.Email || '').toLowerCase();
        var contact = String(u.contactNo || u.ContactNo || '').toLowerCase();
        return code.indexOf(term) > -1 || name.indexOf(term) > -1 || email.indexOf(term) > -1 || contact.indexOf(term) > -1;
    });

    renderUsersList(filtered);
}

function escapeUsersHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


function initUserRolesDropdown() {
    var $roles = $('#userRoles');
    if (!$roles.length || typeof $roles.select2 !== 'function') return;

    if (!$roles.hasClass('select2-hidden-accessible')) {
        $roles.select2({
            width: '100%',
            placeholder: $roles.data('placeholder') || 'Select roles',
            closeOnSelect: false,
            dropdownParent: $('#usersModal .modal-box')
        });
    }

    $roles.off('change.roles').on('change.roles', function () {
        clearRolesError();
    });
}

function setRolesError(message) {
    $('#userRolesError').removeClass('hidden').text(message || 'Roles is required');
    $('#usersModal .select2-container--default .select2-selection--multiple').addClass('input-error');
}

function clearRolesError() {
    $('#userRolesError').addClass('hidden').text('');
    $('#usersModal .select2-container--default .select2-selection--multiple').removeClass('input-error');
}

function normalizeRoleIds(roleIds) {
    var ids = Array.isArray(roleIds) ? roleIds : [];
    return ids
        .map(function (x) { return parseInt(x, 10); })
        .filter(function (x) { return !isNaN(x) && x > 0; });
}

function loadUserRolesOptions(selectedRoleIds) {
    var selected = normalizeRoleIds(selectedRoleIds);
    var selectedMap = {};
    for (var i = 0; i < selected.length; i++) {
        selectedMap[selected[i]] = true;
    }

    $.ajax({
        url: '/Admin/Roles/get',
        type: 'GET',
        dataType: 'json',
        success: function (roles) {
            var list = Array.isArray(roles) ? roles : [];
            var activeRoles = list.filter(function (r) {
                return r.isActive !== false;
            });

            var html = '';
            for (var j = 0; j < activeRoles.length; j++) {
                var role = activeRoles[j];
                var id = parseInt(role.id || role.Id, 10);
                if (isNaN(id)) continue;

                var text = (role.name || role.Name || '') + ' (' + (role.code || role.Code || '') + ')';
                var selectedAttr = selectedMap[id] ? ' selected' : '';
                html += '<option value="' + id + '"' + selectedAttr + '>' + text + '</option>';
            }

            $('#userRoles').html(html);
            initUserRolesDropdown();
            $('#userRoles').trigger('change.select2');
        },
        error: function () {
            $('#userRoles').html('');
            initUserRolesDropdown();
            $('#userRoles').trigger('change.select2');
        }
    });
}

function getSelectedUserRoleIds() {
    return ($('#userRoles').val() || [])
        .map(function (x) { return parseInt(x, 10); })
        .filter(function (x) { return !isNaN(x) && x > 0; });
}

function loadUserRoleMappings(userId) {
    if (!userId || parseInt(userId, 10) <= 0) {
        loadUserRolesOptions([]);
        return;
    }

    $.ajax({
        url: '/Admin/UserRoleMapping/get?userId=' + parseInt(userId, 10),
        type: 'GET',
        dataType: 'json',
        success: function (rows) {
            var list = Array.isArray(rows) ? rows : [];
            var roleIds = list
                .map(function (x) { return parseInt(x.roleId || x.RoleId, 10); })
                .filter(function (x) { return !isNaN(x) && x > 0; });
            loadUserRolesOptions(roleIds);
        },
        error: function () {
            loadUserRolesOptions([]);
        }
    });
}

function saveUserRoleMappings(userId, roleIds, isUpdate, emailStatus) {
    var ids = Array.isArray(roleIds) ? roleIds : [];
    if (!ids.length) {
        setButtonBusy('#saveUserBtn', false);
        showToast('Select at least one role.', 3000, { type: 'error', title: 'Validation' });
        return;
    }

    var payload = ids.map(function (roleId) {
        return {
            UserId: userId,
            RoleId: roleId,
            IsActive: true,
            IsDeleted: false,
            CreatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
            UpdatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0
        };
    });

    $.ajax({
        url: '/Admin/UserRoleMapping/save',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function (res) {
            if (res && res.success) {
                if (!isUpdate && emailStatus && emailStatus.sent === false) {
                    showToast('User created successfully, but welcome email failed: ' + (emailStatus.error || 'Unknown mail error.'), 5000, { type: 'warning', title: 'Mail not sent' });
                } else {
                    showToast(isUpdate ? 'User updated successfully.' : 'User created successfully.', 3000, { type: 'success', title: isUpdate ? 'Updated' : 'Created' });
                }
                clearUsersForm();
                $('#usersModal').addClass('hidden');
                loadUsers();
                setButtonBusy('#saveUserBtn', false);
            } else {
                setButtonBusy('#saveUserBtn', false);
                showToast('User saved, but role mapping failed.', 3000, { type: 'error', title: 'Role mapping failed' });
            }
        },
        error: function () {
            setButtonBusy('#saveUserBtn', false);
            showToast('User saved, but role mapping failed.', 3000, { type: 'error', title: 'Role mapping failed' });
        }
    });
}

function bindUserImageUpload() {
    $('#userImageFile').off('change').on('change', function () {
        var file = this.files && this.files[0] ? this.files[0] : null;
        if (!file) {
            updateUserImageViewButton();
            return;
        }

        var reader = new FileReader();
        reader.onload = function (e) {
            var imageData = e && e.target ? e.target.result : '';
            if (imageData) {
                $('#userImagePreview').attr('src', imageData).removeClass('hidden');
            } else {
                $('#userImagePreview').attr('src', '').addClass('hidden');
            }

            updateUserImageViewButton();
        };
        reader.readAsDataURL(file);
    });
}

function buildUserImageUrl(imageValue) {
    if (!imageValue) return '';

    var value = String(imageValue).trim();
    if (!value) return '';

    if (/[<>"'`]/.test(value)) {
        return '';
    }

    if (/^(javascript|vbscript):/i.test(value)) {
        return '';
    }

    if (/^data:/i.test(value)) {
        var validDataImage = /^data:image\/(png|jpe?g|gif|webp|bmp);base64,[a-z0-9+/=\s]+$/i.test(value);
        return validDataImage ? value : '';
    }

    if (value.indexOf('http://') === 0 || value.indexOf('https://') === 0 || value.indexOf('/FileUpload/') === 0) {
        return value;
    }

    if (!/^[a-zA-Z0-9_./\-]+$/.test(value)) {
        return '';
    }

    return '/FileUpload/User/' + value;
}

function getCurrentUserImageUrl() {
    var previewSrc = $('#userImagePreview').attr('src') || '';
    if (previewSrc) {
        return previewSrc;
    }

    return buildUserImageUrl($('#userImage').val() || '');
}

function updateUserImageViewButton() {
    var imageUrl = getCurrentUserImageUrl();
    $('#btnViewUserImage').toggleClass('hidden', !imageUrl);
}

function openUserImageInNewTab(imageUrl) {
    if (!imageUrl) {
        showToast('No user image available.', 3000, { type: 'warning', title: 'Image not found' });
        return;
    }

    window.open(imageUrl, '_blank', 'noopener,noreferrer');
}

function viewCurrentUserImage() {
    openUserImageInNewTab(getCurrentUserImageUrl());
}

function closeUsersModal() {
    $('#usersModal').addClass('hidden');
}

function openUsersModal() {
    bindUserImageUpload();
    loadUserRolesOptions([]);

    clearUsersForm();
    $('#users-title').html('Create User');
    $('#usersModal').removeClass('hidden');

    initUserField('#userCode', '#userCodeError');
    initUserField('#userName', '#userNameError');
    initUserField('#userEmail', '#userEmailError');

    setActionButtonLabel('#saveUserBtn', 'Save');
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
                $('#userCode').val(res.code || '');
            } else {
                showToast((res && res.message) || 'Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
            }
        },
        error: function () {
            showToast('Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
        }
    });
}

function loadUsers() {
    showUsersLoader(true);

    $.ajax({
        url: '/Admin/Users/get',
        type: 'GET',
        dataType: 'json',
        success: function (rows) {
            allUsers = Array.isArray(rows) ? rows : [];
            applyUsersFilter($('#usersSearch').val());
        },
        error: function () {
            allUsers = [];
            renderUsersList([]);
            showToast('Unable to load users.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showUsersLoader(false);
        }
    });
}

function showUsersLoader(show) {
    var $panel = $('.pageloaderpanel');
    if ($panel.length) {
        $('#usersCardsWrap').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
        return;
    }
}

function renderUsersList(rows) {
    rows = Array.isArray(rows) ? rows : [];
    var html = '';

    for (var i = 0; i < rows.length; i++) {
        var u = rows[i];
        var code = u.code || '';
        var name = u.name || '';
        var email = u.email || '';
        var contact = u.contactNo || '';
        var safeCode = escapeUsersHtml(code || '-');
        var safeName = escapeUsersHtml(name || '-');
        var safeEmail = escapeUsersHtml(email || '-');
        var safeContact = escapeUsersHtml(contact || '-');
        var isAdmin = u.isAdmin;
        var isActive = u.isActive;
        var id = u.id || 0;
        var imageValue = u.image || u.Image || '';
        var imageUrl = buildUserImageUrl(imageValue);
        var safeImageUrl = escapeUsersHtml(imageUrl);
        var safeAltName = escapeUsersHtml(name || 'User');
        var imageCell = imageUrl
            ? '<div class="user-list-image-cell"><img src="' + safeImageUrl + '" alt="' + safeAltName + '" class="user-list-image" loading="lazy" decoding="async" /></div>'
            : '<div class="user-list-image user-list-image-placeholder">' + escapeUsersHtml((name || '?').charAt(0).toUpperCase()) + '</div>';

        var adminBadge = isAdmin
            ? '<span class="badge badge-confirmed">Admin</span>'
            : '<span class="badge badge-cancelled">User</span>';

        var statusBadge = isActive
            ? '<span class="badge badge-confirmed">Active</span>'
            : '<span class="badge badge-cancelled">Inactive</span>';

        var actions = `
            <button type="button" class="action-item users-action-edit" data-id="${id}" onclick="editUser(${id})"><span class="action-icon action-icon-text" aria-hidden="true">&#9998;</span>Edit</button>
            <button type="button" class="action-item users-action-delete" data-id="${id}" onclick="deleteUser(this.dataset.id)"><span class="action-icon action-icon-text" aria-hidden="true">&#128465;</span>Delete</button>
            <button type="button" class="action-item ${isActive ? 'users-action-inactive' : 'users-action-active'}" data-id="${id}" data-state="${isActive ? 'active' : 'inactive'}" onclick="setUserActive(this.dataset.id, ${isActive ? 'false' : 'true'})"><span class="action-icon action-icon-text" aria-hidden="true">${isActive ? '&#128274;' : '&#128275;'}</span>${isActive ? 'Inactive' : 'Active'}</button>`;

        html += `
            <div class="user-card" data-id="${id}">
                <div class="user-card-top">
                    <div class="user-card-profile">${imageCell}</div>
                    <div class="user-card-title-wrap">
                        <div class="user-card-name">${safeName}</div>
                        <div class="user-card-code">${safeCode}</div>
                    </div>
                    <div class="row-actions user-card-actions">
                        <button type="button" class="dots-btn" title="Actions">⋯</button>
                        <div class="actions-menu hidden">${actions}</div>
                    </div>
                </div>
                <div class="user-card-tags">${statusBadge}${adminBadge}</div>
                <div class="user-card-meta-grid">
                    <div class="user-card-detail"><label>Email</label><div>${safeEmail}</div></div>
                    <div class="user-card-detail user-card-detail-inline"><label>Contact</label><div>${safeContact}</div></div>
                </div>
            </div>`;
    }

    $('#usersCards').html(html);
    $('#usersCardsEmpty').toggleClass('hidden', rows.length > 0);
}

function setUserError(inputSelector, errorSelector, message) {
    $(inputSelector).addClass('input-error');
    $(errorSelector).removeClass('hidden').text(message);
}

function clearUserError(inputSelector, errorSelector) {
    $(inputSelector).removeClass('input-error');
    $(errorSelector).addClass('hidden').text('');
}

function initUserField(inputSelector, errorSelector) {
    clearUserError(inputSelector, errorSelector);
    $(inputSelector).on('input', function () {
        clearUserError(inputSelector, errorSelector);
    });
}

function sanitizeDigitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
}

function clearUsersForm(keepId) {
    if (!keepId) {
        $('#userId').val('');
        setActionButtonLabel('#saveUserBtn', 'Save');
    }
    $('#userName').val('');
    $('#userEmail').val('');
    $('#userContact').val('');
    $('#userRemarks').val('');
    $('#userPostalCode').val('');
    $('#userGender').val('');
    $('#userAddress').val('');
    $('#userImage').val('');
    $('#userImageFile').val('');
    $('#userIsActive').val('true');
    $('#userImagePreview').attr('src', '').addClass('hidden');
    updateUserImageViewButton();
    $('#userIsAdmin').prop('checked', false);
    loadUserRolesOptions([]);
    clearRolesError();
    clearUserError('#userCode', '#userCodeError');
    clearUserError('#userName', '#userNameError');
    clearUserError('#userEmail', '#userEmailError');
    clearUserError('#userContact', '#userContactError');
    clearUserError('#userPostalCode', '#userPostalCodeError');
}

function editUser(id) {
    bindUserImageUpload();

    $('#users-title').html('Edit User');

    $.ajax({
        url: '/Admin/Users/get/' + id,
        type: 'GET',
        dataType: 'json',
        success: function (user) {
            if (!user) {
                showToast('User not found.', 3000, { type: 'warning', title: 'Not found' });
                return;
            }
            $('#userId').val(user.id || 0);
            $('#userCode').val(user.code || '');
            $('#userName').val(user.name || '');
            $('#userEmail').val(user.email || '');
            $('#userContact').val(user.contactNo || '');
            $('#userRemarks').val(user.remarks || '');

            $('#userPostalCode').val(user.postalCode || '');
            $('#userGender').val(user.gender || '');
            $('#userAddress').val(user.address || '');

            var imageValue = user.Image || user.image || '';
            $('#userImage').val(imageValue);
            if (imageValue) {
                $('#userImagePreview').attr('src', buildUserImageUrl(imageValue)).removeClass('hidden');
            } else {
                $('#userImagePreview').attr('src', '').addClass('hidden');
            }

            updateUserImageViewButton();

            $('#userImageFile').val('');
            $('#userIsAdmin').prop('checked', user.isAdmin || false);
            $('#userIsActive').val(((user.isActive) ? true : false).toString());

            var userId = user.id || 0;
            loadUserRoleMappings(userId);

            initUserField('#userCode', '#userCodeError');
            initUserField('#userName', '#userNameError');
            initUserField('#userEmail', '#userEmailError');

            $('#usersModal').removeClass('hidden');
            setActionButtonLabel('#saveUserBtn', 'Update');
        },
        error: function () {
            showToast('Unable to load user.', 3000, { type: 'error', title: 'Load failed' });
        }
    });
}

function validateUserForm() {
    clearUserError('#userCode', '#userCodeError');
    clearUserError('#userName', '#userNameError');
    clearUserError('#userEmail', '#userEmailError');
    clearUserError('#userContact', '#userContactError');
    clearUserError('#userPostalCode', '#userPostalCodeError');
    clearRolesError();

    var firstInvalid = null;
    var code = $('#userCode').val().toString().trim();
    var name = $('#userName').val().toString().trim();
    var email = $('#userEmail').val().toString().trim();
    var contact = sanitizeDigitsOnly($('#userContact').val());
    var postalCode = sanitizeDigitsOnly($('#userPostalCode').val());

    $('#userContact').val(contact);
    $('#userPostalCode').val(postalCode);

    if (!code) {
        setUserError('#userCode', '#userCodeError', 'Code is required');
        firstInvalid = '#userCode';
    }

    if (!name) {
        setUserError('#userName', '#userNameError', 'Name is required');
        if (!firstInvalid) firstInvalid = '#userName';
    }

    if (!email) {
        setUserError('#userEmail', '#userEmailError', 'Email is required');
        if (!firstInvalid) firstInvalid = '#userEmail';
    } else if (!isValidEmail(email)) {
        setUserError('#userEmail', '#userEmailError', 'Enter a valid email');
        if (!firstInvalid) firstInvalid = '#userEmail';
    }

    if (contact && !/^\d{8,15}$/.test(contact)) {
        setUserError('#userContact', '#userContactError', 'Contact number must be 8 to 15 digits');
        if (!firstInvalid) firstInvalid = '#userContact';
    }

    if (postalCode && !/^\d{4,10}$/.test(postalCode)) {
        setUserError('#userPostalCode', '#userPostalCodeError', 'Postal code must be 4 to 10 digits');
        if (!firstInvalid) firstInvalid = '#userPostalCode';
    }

    var selectedRoles = getSelectedUserRoleIds();
    if (!selectedRoles.length) {
        setRolesError('Select at least one role');
        if (!firstInvalid) firstInvalid = '#userRoles';
    }

    if (firstInvalid) {
        if (firstInvalid === '#userRoles') {
            $('#userRoles').select2('open');
        } else {
            $(firstInvalid).focus();
        }
        return false;
    }

    return true;
}

function isValidEmail(email) {
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function saveUser() {
    var userId = $('#userId').val();
    var isUpdate = userId && parseInt(userId, 10) > 0;

    if (window.gcFormValidation && !window.gcFormValidation.validateScope('#usersModal .modal-box', true)) {
        return;
    }

    if (!validateUserForm()) {
        return;
    }

    setButtonBusy('#saveUserBtn', true, 'Saving...');

    var isActive = isUpdate ? ($('#userIsActive').val() === 'true') : true;
    var selectedRoles = getSelectedUserRoleIds();
    var entityNo = parseInt(sessionStorage.getItem('gcCurrentEntityNo') || '0', 10) || 0;
    var user = {
        Id: userId ? parseInt(userId) : 0,
        Code: $('#userCode').val().trim(),
        Name: $('#userName').val().trim(),
        Email: $('#userEmail').val().trim(),
        ContactNo: sanitizeDigitsOnly($('#userContact').val() || ''),
        Remarks: $('#userRemarks').val() || '',
        PostalCode: parseInt(sanitizeDigitsOnly($('#userPostalCode').val()), 10) || null,
        Gender: parseInt($('#userGender').val(), 10) || null,
        Address: $('#userAddress').val() || '',
        Image: $('#userImage').val() || '',
        IsAdmin: $('#userIsAdmin').prop('checked'),
        IsActive: isActive,
        IsDeleted: false,
        CreatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        UpdatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        EntityNo: entityNo
    };

    var endpoint = isUpdate ? '/Admin/Users/update' : '/Admin/Users/create';
    var formData = new FormData();

    Object.keys(user).forEach(function (key) {
        var value = user[key];
        if (value === null || typeof value === 'undefined') {
            return;
        }

        formData.append(key, value);
    });

    var imageFileInput = document.getElementById('userImageFile');
    var imageFile = imageFileInput && imageFileInput.files && imageFileInput.files.length ? imageFileInput.files[0] : null;
    if (imageFile) {
        formData.append('ImageFile', imageFile);
    }

    $.ajax({
        url: endpoint,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function (res) {
            if (res && res.success) {
                var savedUserId = isUpdate ? parseInt(userId, 10) : parseInt(res.id, 10);
                if (!savedUserId || isNaN(savedUserId)) {
                    setButtonBusy('#saveUserBtn', false);
                    showToast('User saved, but invalid user id for role mapping.', 3000, { type: 'error', title: 'Role mapping failed' });
                    return;
                }

                saveUserRoleMappings(savedUserId, selectedRoles, isUpdate, {
                    sent: res.emailSent !== false,
                    error: res.emailError || ''
                });
            } else {
                setButtonBusy('#saveUserBtn', false);
                var errorMsg = res && res.message ? res.message : (isUpdate ? 'Unable to update user.' : 'Unable to create user.');
                showToast(errorMsg, 3000, { type: 'error', title: 'Save failed' });
            }
        },
        error: function () {
            setButtonBusy('#saveUserBtn', false);
            showToast(isUpdate ? 'Update failed.' : 'Save failed.', 3000, { type: 'error', title: 'Save failed' });
        }
    });
}

function deleteUser(id) {
    if (!id) return;

    showToast('Delete this user?', 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Delete',
        noText: 'Cancel',
        onYes: function () {
            $.ajax({
                url: '/Admin/Users/delete/' + id,
                type: 'POST',
                dataType: 'json',
                success: function (result) {
                    if (result && result.success) {
                        showToast('User deleted successfully.', 3000, { type: 'success', title: 'Deleted' });
                    } else {
                        showToast('Unable to delete user.', 3000, { type: 'error', title: 'Delete failed' });
                    }
                    setTimeout(loadUsers, 300);
                },
                error: function () {
                    showToast('Delete failed.', 3000, { type: 'error', title: 'Delete failed' });
                }
            });
        },
        onNo: function () {
            showToast('Delete cancelled.', 3000, { type: 'info', title: 'Cancelled' });
        }
    });
}

function setUserActive(id, isActive) {
    if (!id) return;

    var confirmMessage = isActive ? 'Mark this user active?' : 'Mark this user inactive?';
    var successMessage = isActive ? 'User activated.' : 'User marked inactive.';

    showToast(confirmMessage, 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Yes',
        noText: 'No',
        onYes: function () {
            $.ajax({
                url: '/Admin/Users/activeinactive?id=' + id + '&status=' + isActive,
                type: 'POST',
                dataType: 'json',
                success: function (result) {
                    if (result && result.success) {
                        showToast(successMessage, 3000, { type: 'success', title: 'Updated' });
                    } else {
                        showToast('Unable to update user status.', 3000, { type: 'error', title: 'Update failed' });
                    }
                    setTimeout(loadUsers, 300);
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
