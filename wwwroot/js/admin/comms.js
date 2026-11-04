$(document).ready(function () {
    loadComms();   
});

function closeCommsModal() {
    $('#commsModal').addClass('hidden');
}

function openCommsModal() {
    clearCommsForm();
    $('#menu-title').text('Create Menu');
    setActionButtonLabel('#btnSaveComms', 'Save');
    $('#commsModal').removeClass('hidden');

    initCategoryField('#cmChannel', '#cmChannelError');
    initCategoryField('#cmAddress', '#cmAddressError');
    initCategoryField('#cmMsgField', '#cmMsgFieldError'); 
}

function loadComms() {
    showCommsLoader(true);

    $.ajax({
        url: '/Admin/Comms/get',
        type: 'GET',
        dataType: 'json',
        success: function (rows) {
            renderCommsList(Array.isArray(rows) ? rows : []);
        },
        error: function () {
            renderCommsList([]);
            showToast('Unable to load Comms.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showCommsLoader(false);
        }
    });
}

function showCommsLoader(show) {
    var $panel = $('#commsListPanel .pageloaderpanel');
    if ($panel.length) {
        $('#commsListPanel .table-wrap').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
    }
}

function renderCommsList(rows) {
    rows = Array.isArray(rows) ? rows : [];
    var html = '';
    if (rows.length) {
        html = rows.map(function (comms, index) {
            var serial = index + 1;
            var id = comms.id || comms.Id || '';
            var Channel = comms.channel || comms.Channel || '';
            var ToAddress = comms.toAddress || comms.ToAddress || '';
            var Message = comms.message || comms.Message || '';
            var active = comms.isActive;

            var actions;
            if (active) {
                actions = `<button type="button" class="action-item comms-action-edit" data-id="${id}" onclick="editComms(this.dataset.id)"><span class="action-icon action-icon-text" aria-hidden="true">&#9998;</span>Edit</button>
                           <button type="button" class="action-item comms-action-inactive" data-id="${id}" onclick="setCommsActive(this.dataset.id, false)"><span class="action-icon action-icon-text" aria-hidden="true">&#128274;</span>Inactive</button>`;
            } else {
                actions = `<button type="button" class="action-item comms-action-active" data-id="${id}" onclick="setCommsActive(this.dataset.id, true)"><span class="action-icon action-icon-text" aria-hidden="true">&#128275;</span>Active</button>`;
            }

            var statusBadge;
            if (active) {
                statusBadge = '<span class="badge-pill badge-pill--success">Active</span>';
            } else {
                statusBadge = '<span class="badge-pill badge-pill--warning">Inactive</span>';
            }

            return `
                <tr>
                    <td>${serial}</td>
                    <td>${Channel}</td>
                    <td>${ToAddress}</td>
                    <td>${Message || ''}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="row-actions comms-row-actions">
                            <button class="dots-btn" title="Actions">⋯</button>
                            <div class="actions-menu hidden">
                                ${actions}
                                <button type="button" class="action-item comms-action-delete" data-id="${id}" onclick="deleteComms(this.dataset.id)"><span class="action-icon action-icon-text" aria-hidden="true">&#128465;</span>Delete</button>
                            </div>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    }

    $('#commsList tbody').html(html);
    if (typeof renderDataTable === 'function') {
        renderDataTable('commsList');
    }
}

function clearCommsForm() {
    $('#CommsId').val('');
    $('#cmChannel').val('');
    $('#cmAddress').val('');
    $('#cmMsgField').val('');
    setActionButtonLabel('#btnSaveComms', 'Save');

    clearCommsError('#cmChannel', '#cmChannelError');
    clearCommsError('#cmAddress', '#cmAddressError');
    clearCommsError('#cmMsgField', '#cmMsgFieldError');
}

function setCommsError(inputSelector, errorSelector, message) {
    $(inputSelector).addClass('input-error');
    $(errorSelector).removeClass('hidden').text(message);
}

function clearCommsError(inputSelector, errorSelector) {
    $(inputSelector).removeClass('input-error');
    $(errorSelector).addClass('hidden').text('');
}

function initCategoryField(inputSelector, errorSelector) {
    clearCommsError(inputSelector, errorSelector);
    var el = document.querySelector(inputSelector);
    if (el) {
        el.oninput = function () {
            clearCommsError(inputSelector, errorSelector);
        };
    }
}

function isValidCommsEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function toDigitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
}

function validateForm() {
    clearCommsError('#cmChannel', '#cmChannelError');
    clearCommsError('#cmAddress', '#cmAddressError');
    clearCommsError('#cmMsgField', '#cmMsgFieldError');

    var code = $('#cmChannel').val();
    if (code) {
        code = code.toString().trim();
    } else {
        code = '';
    }

    var name = $('#cmAddress').val();
    if (name) {
        name = name.toString().trim();
    } else {
        name = '';
    }

    var channel = ($('#cmChannel').val() || '').toString().trim().toLowerCase();

    var firstInvalid = null;

    if (!code) {
        setCommsError('#cmChannel', '#cmChannelError', 'Channel is required');
        firstInvalid = '#cmChannel';
    }

    if (!name) {
        setCommsError('#cmAddress', '#cmAddressError', 'Address is required');
        if (!firstInvalid) {
            firstInvalid = '#cmAddress';
        }
    } else if (channel === 'email' && !isValidCommsEmail(name)) {
        setCommsError('#cmAddress', '#cmAddressError', 'Enter a valid email address');
        if (!firstInvalid) {
            firstInvalid = '#cmAddress';
        }
    } else if ((channel === 'sms' || channel === 'whatsapp')) {
        var digits = toDigitsOnly(name);
        $('#cmAddress').val(digits);
        if (!/^\d{8,15}$/.test(digits)) {
            setCommsError('#cmAddress', '#cmAddressError', 'Enter a valid mobile number (8 to 15 digits)');
            if (!firstInvalid) {
                firstInvalid = '#cmAddress';
            }
        }
    }

    if (firstInvalid) {
        $(firstInvalid).focus();
        return false;
    }

    return true;
}

function saveComms() {
    if (window.gcFormValidation && !window.gcFormValidation.validateScope('#commsModal .modal-box', true)) {
        return;
    }

    if (!validateForm()) {
        return;
    }

    setButtonBusy('#btnSaveComms', true, 'Saving...');

    var commsId = $('#CommsId').val();
    var comms = {
        Id: commsId ? parseInt(commsId) : 0,
        Channel: $('#cmChannel').val() || '',
        ToAddress: $('#cmAddress').val() || '',
        Message: $('#cmMsgField').val() || '',
        IsActive: true,
        IsDeleted: false,
        CreatedBy: 1,
        CreatedDate: null,
        UpdatedBy: 1,
        UpdatedDate: null
    };

    var endpoint = comms.Id ? '/Admin/Comms/update' : '/Admin/Comms/create';

    $.ajax({
        url: endpoint,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(comms),
        success: function (res) {
            if (res && res.success) {
                showToast('Comms saved successfully.', 3000, { type: 'success', title: 'Saved' });
                clearCommsForm();
                $('#commsModal').addClass('hidden');
                loadComms();
            } else {
                setButtonBusy('#btnSaveComms', false);
                showToast('Unable to save Comms.', 3000, { type: 'error', title: 'Save failed' });
            }
        },
        error: function () {
            setButtonBusy('#btnSaveComms', false);
            showToast('Save failed.', 3000, { type: 'error', title: 'Save failed' });
        }
    });
}

function editComms(id) {
    $('#menu-title').text('Edit Comms');
    $.ajax({
        url: '/Admin/Comms/get/' + id,
        type: 'GET',
        success: function (comms) {
            if (!comms) {
                showToast('Comms not found.', 3000, { type: 'warning', title: 'Not found' });
                return;
            }

            $('#CommsId').val(comms.Id || comms.id || '');
            $('#cmChannel').val(comms.Channel || comms.channel || '');
            $('#cmAddress').val(comms.ToAddress || comms.toAddress || '');
            $('#cmMsgField').val(comms.Message || comms.message || '');
            setActionButtonLabel('#btnSaveComms', 'Update');
            $('#commsModal').removeClass('hidden');
        },
        error: function () { showToast('Unable to load Comms.', 3000, { type: 'error', title: 'Load failed' }); }
    });
}

function deleteComms(id) {
    if (!id) return;
    showToast('Delete this Comms?', 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Delete',
        noText: 'Cancel',
        onYes: function () {
            $.ajax({
                url: '/Admin/Comms/delete/' + id,
                type: 'POST',
                success: function (res) {
                    if (res && res.success) {
                        showToast('Comms deleted successfully.', 3000, { type: 'success', title: 'Deleted' });
                    } else {
                        showToast('Unable to delete Comms.', 3000, { type: 'error', title: 'Delete failed' });
                    }
                    setTimeout(loadComms, 300);
                },
                error: function () { showToast('Delete failed.', 3000, { type: 'error', title: 'Delete failed' }); }
            });
        },
        onNo: function () {
            showToast('Delete cancelled.', 3000, { type: 'info', title: 'Cancelled' });
        }
    });
}

function setCommsActive(id, isActive) {
    if (!id) return;

    var confirmMessage = isActive ? 'Mark this Comms active?' : 'Mark this Comms inactive?';
    var successMessage = isActive ? 'Comms activated.' : 'Comms marked inactive.';

    showToast(confirmMessage, 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Yes',
        noText: 'No',
        onYes: function () {
            $.ajax({
                url: '/Admin/Comms/activeinactive/' + id + '?status=' + isActive,
                type: 'POST',
                success: function (res) {
                    if (res && res.success) {
                        showToast(successMessage, 3000, { type: 'success', title: 'Updated' });
                    } else {
                        showToast('Unable to update Comms status.', 3000, { type: 'error', title: 'Update failed' });
                    }
                    setTimeout(loadComms, 350);
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
