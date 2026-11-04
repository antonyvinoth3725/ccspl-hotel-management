$(document).ready(function () {
    loadChef();
});

function closeChefModal() {
    $('#chefModal').addClass('hidden');
}

function openChefModal() {
    clearChefForm();
    $('#chef-title').text('Create Chef');
    setActionButtonLabel('#btnSaveChef', 'Save');
    if (typeof applyPermissionVisibility === 'function') applyPermissionVisibility(document);
    $('#chefModal').removeClass('hidden');

    initChefField('#ChefCode', '#ChefCodeError');
    initChefField('#ChefName', '#ChefNameError');
    initChefField('#MobileNo', '#MobileNoError');
    initChefField('#Email', '#EmailError');
    initChefField('#ChefType', '#ChefTypeError');
    initChefField('#Specialization', '#SpecializationError');
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
                $('#ChefCode').val(res.code || '');
            } else {
                showToast((res && res.message) || 'Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
            }
        },
        error: function () {
            showToast('Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
        }
    });
}

function loadChef() {
    showChefLoader(true);

    $.ajax({
        url: '/Admin/Chef/get',
        type: 'GET',
        dataType: 'json',
        success: function (rows) {
            renderChefList(Array.isArray(rows) ? rows : []);
        },
        error: function () {
            renderChefList([]);
            showToast('Unable to load Chef.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showChefLoader(false);
        }
    });
}
function showChefLoader(show) {
    var $panel = $('.pageloaderpanel');
    if ($panel.length) {
        $('#chefListPanel .table-wrap').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
        return;
    }
}

function renderChefList(rows) {
    rows = Array.isArray(rows) ? rows : [];
    var html = '';
    if (rows.length) {
        for (var i = 0; i < rows.length; i++) {
            var chef = rows[i];
            var sNo = i + 1;
            var id = chef.id || chef.Id || '';
            var code = chef.code || chef.Code || '';
            var name = chef.name || chef.Name || '';
            var MobileNo = chef.mobileNo || chef.MobileNo || '';
            var Email = chef.emailId || chef.EmailId || '';
            var active = chef.isActive;

            var actions;
            if (active) {
                actions = `<button type="button" class="action-item chef-action-edit" data-id="${id}" onclick="editChef(this.dataset.id)"><span class="action-icon action-icon-text" aria-hidden="true">&#9998;</span>Edit</button>
                           <button type="button" class="action-item chef-action-assign" data-id="${id}" data-name="${name}" onclick="assignChefMenus(this.dataset.id, this.dataset.name)"><span class="action-icon action-icon-text" aria-hidden="true">&#127859;</span>Assign Menus</button>
                           <button type="button" class="action-item chef-action-inactive" data-id="${id}" onclick="setChefActive(this.dataset.id, false)"><span class="action-icon action-icon-text" aria-hidden="true">&#128274;</span>Inactive</button>`;
            } else {
                actions = `<button type="button" class="action-item chef-action-active" data-id="${id}" onclick="setChefActive(this.dataset.id, true)"><span class="action-icon action-icon-text" aria-hidden="true">&#128275;</span>Active</button>`;
            }

            var statusBadge;
            if (active) {
                statusBadge = '<span class="badge-pill badge-pill--success">Active</span>';
            } else {
                statusBadge = '<span class="badge-pill badge-pill--warning">Inactive</span>';
            }

            html += `
                <tr>
                    <td>${sNo}</td>
                    <td>${code}</td>
                    <td>${name}</td>
                    <td>${MobileNo || ''}</td>
                    <td>${Email || ''}</td> 
                    <td>${statusBadge}</td>
                    <td>
                        <div class="row-actions chef-row-actions">
                            <button class="dots-btn" title="Actions">⋯</button>
                            <div class="actions-menu hidden">
                                ${actions}
                                <button type="button" class="action-item chef-action-delete" data-id="${id}" onclick="deleteChef(this.dataset.id)"><span class="action-icon action-icon-text" aria-hidden="true">&#128465;</span>Delete</button>
                            </div>
                        </div>
                    </td>
                </tr>`;
        }
    }

    $('#chefList tbody').html(html);
    if (typeof renderDataTable === 'function') {
        renderDataTable('chefList');
    }
}

function clearChefForm() {
    $('#chefId').val('');
    $('#ChefName').val('');
    $('#MobileNo').val('');
    $('#Email').val('');
    $('#ChefType').val('')
    $('#Specialization').val(''); 
    setActionButtonLabel('#btnSaveChef', 'Save');

    clearChefError('#Code', '#CodeError');
    clearChefError('#ChefName', '#ChefNameError');
    clearChefError('#MobileNo', '#MobileNoError');
    clearChefError('#Email', '#EmailError');
    clearChefError('#ChefType', '#ChefTypeError');
    clearChefError('#Specialization', '#SpecializationError');
}

function setChefError(inputSelector, errorSelector, message) {
    $(inputSelector).addClass('input-error');
    $(errorSelector).removeClass('hidden').text(message);
}

function clearChefError(inputSelector, errorSelector) {
    $(inputSelector).removeClass('input-error');
    $(errorSelector).addClass('hidden').text('');
}

function initChefField(inputSelector, errorSelector) {
    clearChefError(inputSelector, errorSelector);
    var el = document.querySelector(inputSelector);
    if (el) {
        el.oninput = function () {
            clearChefError(inputSelector, errorSelector);
        };
    }
}

function sanitizeChefDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function isValidChefEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function validateForm() {
    clearChefError('#Code', '#CodeError');
    clearChefError('#ChefName', '#ChefNameError');
    clearChefError('#MobileNo', '#MobileNoError');
    clearChefError('#Email', '#EmailError');
    clearChefError('#ChefType', '#ChefTypeError');
    clearChefError('#Specialization', '#SpecializationError');


    var code = $('#ChefCode').val();
    if (code) {
        code = code.toString().trim();
    } else {
        code = '';
    }

    var name = $('#ChefName').val();
    if (name) {
        name = name.toString().trim();
    } else {
        name = '';
    }

    var MobileNo = $('#MobileNo').val();
    if (MobileNo) {
        MobileNo = sanitizeChefDigits(MobileNo);
    } else {
        MobileNo = '';
    } 

    $('#MobileNo').val(MobileNo);

    var email = ($('#Email').val() || '').toString().trim(); 

    var firstInvalid = null;

    if (!code) {
        setChefError('#ChefCode', '#ChefCodeError', 'Code is required');
        firstInvalid = '#Code';
    }

    if (!name) {
        setChefError('#ChefName', '#ChefNameError', 'Name is required');
        if (!firstInvalid) {
            firstInvalid = '#Name';
        }
    }

    if (!MobileNo) {
        setChefError('#MobileNo', '#MobileNoError', 'MobileNo is required');
        if (!firstInvalid) {
            firstInvalid = '#MobileNo';
        }
    } else if (!/^\d{8,15}$/.test(MobileNo)) {
        setChefError('#MobileNo', '#MobileNoError', 'MobileNo must be 8 to 15 digits');
        if (!firstInvalid) {
            firstInvalid = '#MobileNo';
        }
    }

    if (email && !isValidChefEmail(email)) {
        setChefError('#Email', '#EmailError', 'Enter a valid email');
        if (!firstInvalid) {
            firstInvalid = '#Email';
        }
    } 
     
    if (firstInvalid) {
        $(firstInvalid).focus();
        return false;
    }

    return true;
}

function saveChef() {
    if (window.gcFormValidation && !window.gcFormValidation.validateScope('#chefModal .modal-box', true)) {
        return;
    }

    if (!validateForm()) {
        return;
    }

    setButtonBusy('#btnSaveChef', true, 'Saving...');

    var ChefId = $('#chefId').val();
    var entityNo = parseInt(sessionStorage.getItem('gcCurrentEntityNo') || '0', 10) || 0;
    var chef = {
        Id: ChefId ? parseInt(ChefId) : 0,
        Code: $('#ChefCode').val() || '',
        Name: $('#ChefName').val() || '',
        MobileNo: sanitizeChefDigits($('#MobileNo').val() || ''),
        EmailId: ($('#Email').val() || '').trim(),
        ChefType: $('#ChefType').val() || "",
        Specialization: $('#Specialization').val() || "",
        KitchenBranch: null,
        JoiningDate:  null,
        EmploymentStatus:  null,
        Address: null,    
        IsActive: true,
        IsDeleted: false,
        CreatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        UpdatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        EntityNo: entityNo
    };

    var endpoint = chef.Id ? '/Admin/Chef/update' : '/Admin/Chef/create';

    $.ajax({
        url: endpoint,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(chef),
        success: function (res) {
            if (res && res.success) {
                showToast(ChefId == 0 ? 'Chef saved successfully.' : 'Chef updated successfully', 3000, { type: 'success', title: ChefId == 0 ? 'Saved' : 'Updated' });
                clearChefForm();
                $('#chefModal').addClass('hidden');
                loadChef();
            } else {
                setButtonBusy('#btnSaveChef', false);
                var errorMsg = res && res.message ? res.message : (ChefId == 0 ? 'Unable to save Chef.' : 'Unable to update Chef');
                showToast(errorMsg, 3000, { type: 'error', title: ChefId == 0 ? 'Save failed' : 'Update failed' });
            }
        },
        error: function () {
            setButtonBusy('#btnSaveChef', false);
            showToast('Save failed.', 3000, { type: 'error', title: 'Save failed' });
        }
    });
}

function editChef(id) {
    $('#chef-title').text('Edit Chef');
    $.ajax({
        url: '/Admin/Chef/get/' + id,
        type: 'GET',
        success: function (role) {
            if (!role) {
                showToast('Chef not found.', 3000, { type: 'warning', title: 'Not found' });
                return;
            }

            $('#chefId').val(role.Id || role.id || '');
            $('#ChefCode').val(role.Code || role.code || '');
            $('#ChefName').val(role.Name || role.name || '');
            $('#MobileNo').val(role.MobileNo || role.mobileNo || '');
            $('#Email').val(role.EmailId || role.emailId || '');
            $('#ChefType').val(role.ChefType || role.chefType || '');
            $('#Specialization').val(role.Specialization || role.specialization || '');
            setActionButtonLabel('#btnSaveChef', 'Update');
            if (typeof applyPermissionVisibility === 'function') applyPermissionVisibility(document);
            $('#chefModal').removeClass('hidden');
        },
        error: function () { showToast('Unable to load Chef.', 3000, { type: 'error', title: 'Load failed' }); }
    });
}

function deleteChef(id) {
    if (!id) return;
    showToast('Delete this Chef?', 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Delete',
        noText: 'Cancel',
        onYes: function () {
            $.ajax({
                url: '/Admin/Chef/delete/' + id,
                type: 'POST',
                success: function (res) {
                    if (res && res.success) {
                        showToast('Chef deleted successfully.', 3000, { type: 'success', title: 'Deleted' });
                    } else {
                        showToast('Unable to delete Chef.', 3000, { type: 'error', title: 'Delete failed' });
                    }
                    setTimeout(loadChef, 300);
                },
                error: function () { showToast('Delete failed.', 3000, { type: 'error', title: 'Delete failed' }); }
            });
        },
        onNo: function () {
            showToast('Delete cancelled.', 3000, { type: 'info', title: 'Cancelled' });
        }
    });
}

function assignChefMenus(id, name) {
    if (!id) return;
    window.location.href = '/Admin/Chef/AssignMenus/' + id;
}

function setChefActive(id, isActive) {
    if (!id) return;

    var confirmMessage = isActive ? 'Mark this Chef active?' : 'Mark this Chef inactive?';
    var successMessage = isActive ? 'Chef activated.' : 'Chef marked inactive.';

    showToast(confirmMessage, 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Yes',
        noText: 'No',
        onYes: function () {
            $.ajax({
                url: '/Admin/Chef/activeinactive/' + id + '?status=' + isActive,
                type: 'POST',
                success: function (res) {
                    if (res && res.success) {
                        showToast(successMessage, 3000, { type: 'success', title: 'Updated' });
                    } else {
                        showToast('Unable to update Chef status.', 3000, { type: 'error', title: 'Update failed' });
                    }
                    setTimeout(loadChef, 350);
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
