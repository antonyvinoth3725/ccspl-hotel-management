$(document).ready(function () {
    loadAddOns();

    $('#addOnModal').on('click', function (event) {
        if (event.target === this) closeAddOnModal();
    });
    $('#addOnCode, #addOnName, #addOnUnitType, #addOnRate').on('input change', function () {
        clearAddOnError('#' + this.id, '#' + this.id + 'Error');
    });
});

function htmlEncode(value) {
    return $('<div>').text(value == null ? '' : value).html();
}

function loadAddOns() {
    showAddOnsLoader(true);
    $.ajax({
        url: '/Admin/AddOns/get',
        type: 'GET',
        dataType: 'json',
        success: function (rows) {
            renderAddOns(Array.isArray(rows) ? rows : []);
        },
        error: function () {
            renderAddOns([]);
            showToast('Unable to load add ons.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showAddOnsLoader(false);
        }
    });
}

function showAddOnsLoader(show) {
    $('#addOnsListPanel .table-wrap').toggleClass('hidden', show);
    $('#addOnsListPanel .pageloaderpanel').toggleClass('hidden', !show);
}

function renderAddOns(rows) {
    var html = '';
    rows.forEach(function (item, index) {
        var id = Number(item.id ?? item.Id) || 0;
        var code = item.code ?? item.Code ?? '';
        var name = item.addOnName ?? item.AddOnName ?? '';
        var unitType = item.unitType ?? item.UnitType ?? '';
        var rate = Number(item.rate ?? item.Rate) || 0;
        var active = Boolean(item.isActive ?? item.IsActive);
        var status = active
            ? '<span class="badge-pill badge-pill--success">Active</span>'
            : '<span class="badge-pill badge-pill--warning">Inactive</span>';
        var statusAction = active
            ? '<button type="button" class="action-item addon-action-inactive" onclick="setAddOnActive(' + id + ', false)"><span class="action-icon action-icon-text" aria-hidden="true">&#128274;</span>Inactive</button>'
            : '<button type="button" class="action-item addon-action-active" onclick="setAddOnActive(' + id + ', true)"><span class="action-icon action-icon-text" aria-hidden="true">&#128275;</span>Active</button>';

        html += '<tr>' +
            '<td>' + (index + 1) + '</td>' +
            '<td><strong>' + htmlEncode(code) + '</strong></td>' +
            '<td><strong>' + htmlEncode(name) + '</strong></td>' +
            '<td>' + htmlEncode(unitType) + '</td>' +
            '<td class="rate-cell">S$' + rate.toFixed(2) + '</td>' +
            '<td>' + status + '</td>' +
            '<td><div class="row-actions addon-row-actions">' +
            '<button type="button" class="dots-btn" title="Actions">&#8943;</button>' +
            '<div class="actions-menu hidden">' +
            (active ? '<button type="button" class="action-item addon-action-edit" onclick="editAddOn(' + id + ')"><span class="action-icon action-icon-text" aria-hidden="true">&#9998;</span>Edit</button>' : '') +
            statusAction +
            '<button type="button" class="action-item addon-action-delete" onclick="deleteAddOn(' + id + ')"><span class="action-icon action-icon-text" aria-hidden="true">&#128465;</span>Delete</button>' +
            '</div></div></td></tr>';
    });

    $('#addOnsList tbody').html(html);
    if (typeof renderDataTable === 'function') renderDataTable('addOnsList');
}

function openAddOnModal() {
    clearAddOnForm(false);
    $('#addOnModalTitle').text('Create Add On');
    setActionButtonLabel('#btnSaveAddOn', 'Save');
    $('#addOnModal').removeClass('hidden');
    GetAutoGenerateCode();
    $('#addOnName').trigger('focus');
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
                $('#addOnCode').val(res.code || '');
            } else {
                showToast((res && res.message) || 'Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
            }
        },
        error: function () {
            showToast('Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
        }
    });
}

function closeAddOnModal() {
    $('#addOnModal').addClass('hidden');
}

function clearAddOnForm(keepId) {
    if (!keepId) $('#addOnId').val('');
    $('#addOnName, #addOnUnitType, #addOnRate').val('');
    clearAddOnError('#addOnCode', '#addOnCodeError');
    clearAddOnError('#addOnName', '#addOnNameError');
    clearAddOnError('#addOnUnitType', '#addOnUnitTypeError');
    clearAddOnError('#addOnRate', '#addOnRateError');
}

function setAddOnError(input, error, message) {
    $(input).addClass('input-error');
    $(error).removeClass('hidden').text(message);
}

function clearAddOnError(input, error) {
    $(input).removeClass('input-error');
    $(error).addClass('hidden').text('');
}

function saveAddOn() {
    if (window.gcFormValidation && !window.gcFormValidation.validateScope($('.main').first(), true)) {
        return;
    }

    var id = Number($('#addOnId').val()) || 0;
    var entityNo = parseInt(sessionStorage.getItem('gcCurrentEntityNo') || '0', 10) || 0;
    var code = String($('#addOnCode').val() || '').trim();
    var name = String($('#addOnName').val() || '').trim();
    var unitType = String($('#addOnUnitType').val() || '').trim();
    var rateText = String($('#addOnRate').val() || '').trim();
    var rate = Number(rateText);
    var firstInvalid = null;

    clearAddOnFormErrors();
    if (!code) { setAddOnError('#addOnCode', '#addOnCodeError', 'Code is required'); firstInvalid = '#addOnCode'; }
    if (!name) { setAddOnError('#addOnName', '#addOnNameError', 'Add On Name is required'); firstInvalid = firstInvalid || '#addOnName'; }
    if (!unitType) { setAddOnError('#addOnUnitType', '#addOnUnitTypeError', 'Unit Type is required'); firstInvalid = firstInvalid || '#addOnUnitType'; }
    if (!rateText || !Number.isFinite(rate) || rate < 0) {
        setAddOnError('#addOnRate', '#addOnRateError', 'Enter a valid rate');
        firstInvalid = firstInvalid || '#addOnRate';
    }
    if (firstInvalid) { $(firstInvalid).trigger('focus'); return; }

    var userId = window.getCurrentUserId ? window.getCurrentUserId() : 0;
    var request = {
        Id: id, Code: code, AddOnName: name, UnitType: unitType, Rate: rate,
        IsActive: true, IsDeleted: false, CreatedBy: userId, UpdatedBy: userId, EntityNo: entityNo
    };

    setButtonBusy('#btnSaveAddOn', true, id ? 'Updating...' : 'Saving...');
    $.ajax({
        url: id ? '/Admin/AddOns/update' : '/Admin/AddOns/create',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(request),
        success: function (result) {
            if (result && result.success) {
                showToast(id ? 'Add On updated successfully.' : 'Add On saved successfully.', 3000, {
                    type: 'success', title: id ? 'Updated' : 'Saved'
                });
                closeAddOnModal();
                loadAddOns();
            } else {
                setButtonBusy('#btnSaveAddOn', false);
                showToast(result && result.message ? result.message : 'Unable to save Add On.', 3000, { type: 'error', title: 'Save failed' });
            }
        },
        error: function () {
            setButtonBusy('#btnSaveAddOn', false);
            showToast('Unable to save Add On.', 3000, { type: 'error', title: 'Save failed' });
        }
    });
}

function clearAddOnFormErrors() {
    clearAddOnError('#addOnCode', '#addOnCodeError');
    clearAddOnError('#addOnName', '#addOnNameError');
    clearAddOnError('#addOnUnitType', '#addOnUnitTypeError');
    clearAddOnError('#addOnRate', '#addOnRateError');
}

function editAddOn(id) {
    $.getJSON('/Admin/AddOns/get/' + id).done(function (item) {
        $('#addOnId').val(item.id ?? item.Id ?? '');
        $('#addOnCode').val(item.code ?? item.Code ?? '');
        $('#addOnName').val(item.addOnName ?? item.AddOnName ?? '');
        $('#addOnUnitType').val(item.unitType ?? item.UnitType ?? '');
        $('#addOnRate').val(item.rate ?? item.Rate ?? 0);
        clearAddOnFormErrors();
        $('#addOnModalTitle').text('Edit Add On');
        setActionButtonLabel('#btnSaveAddOn', 'Update');
        $('#addOnModal').removeClass('hidden');
    }).fail(function () {
        showToast('Unable to load Add On.', 3000, { type: 'error', title: 'Load failed' });
    });
}

function deleteAddOn(id) {
    confirmAddOnAction('Delete this Add On?', 'Delete', function () {
        $.post('/Admin/AddOns/delete/' + id).done(function (result) {
            showToast(result && result.success ? 'Add On deleted successfully.' : 'Unable to delete Add On.', 3000, {
                type: result && result.success ? 'success' : 'error',
                title: result && result.success ? 'Deleted' : 'Delete failed'
            });
            loadAddOns();
        }).fail(function () {
            showToast('Unable to delete Add On.', 3000, { type: 'error', title: 'Delete failed' });
        });
    });
}

function setAddOnActive(id, active) {
    confirmAddOnAction(active ? 'Mark this Add On active?' : 'Mark this Add On inactive?', 'Yes', function () {
        $.post('/Admin/AddOns/activeinactive?id=' + id + '&status=' + active).done(function (result) {
            showToast(result && result.success ? 'Add On status updated.' : 'Unable to update Add On status.', 3000, {
                type: result && result.success ? 'success' : 'error',
                title: result && result.success ? 'Updated' : 'Update failed'
            });
            loadAddOns();
        }).fail(function () {
            showToast('Unable to update Add On status.', 3000, { type: 'error', title: 'Update failed' });
        });
    });
}

function confirmAddOnAction(message, yesText, onYes) {
    showToast(message, 0, {
        confirm: true, type: 'warning', title: 'Confirm',
        yesText: yesText, noText: 'Cancel', onYes: onYes
    });
}
