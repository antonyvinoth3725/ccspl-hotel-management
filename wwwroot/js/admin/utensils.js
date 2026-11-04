$(document).ready(function () {
    $('#utRuleOperator').on('change', updateRuleOperatorDescription);
    $('#utRuleType, #utRuleValue, #utRulePercentage').on('input change', updateGeneratedRuleDescription);
    updateRuleOperatorDescription();
    loadUtensils();
});

var ruleOperatorDescriptions = {
    SAME: 'Uses the source value directly.',
    ADD: 'Source value + Rule Value.',
    MULTIPLY: 'Source value × Rule Value.',
    DIVIDE: 'Source value ÷ Rule Value.',
    PERCENTAGE: 'Source value plus the Rule Percentage.',
    FIXED: 'Always uses the Rule Value.'
};

function updateRuleOperatorDescription() {
    var operator = ($('#utRuleOperator').val() || '').toUpperCase();
    $('#utRuleOperatorDescription').text(ruleOperatorDescriptions[operator] || '');
    $('#utRulePercentage').prop('disabled', operator !== 'PERCENTAGE');
    $('#utRuleValue').prop('disabled', operator === 'PERCENTAGE');
    updateGeneratedRuleDescription();
}

function formatRuleNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number.toString() : '0';
}

function updateGeneratedRuleDescription() {
    var ruleType = ($('#utRuleType').val() || '').trim().toUpperCase();
    var operator = ($('#utRuleOperator').val() || 'SAME').toUpperCase();
    var ruleValue = formatRuleNumber($('#utRuleValue').val());
    var rulePercentage = formatRuleNumber($('#utRulePercentage').val());
    var description = '';

    if (ruleType) {
        switch (operator) {
            case 'ADD':
                description = ruleType + ' + ' + ruleValue;
                break;
            case 'MULTIPLY':
                description = ruleType + ' x ' + ruleValue;
                break;
            case 'DIVIDE':
                description = ruleType + ' / ' + ruleValue;
                break;
            case 'PERCENTAGE':
                description = ruleType + ' + ' + rulePercentage + '%';
                break;
            case 'FIXED':
                description = ruleValue + ' (FIXED)';
                break;
            case 'SAME':
            default:
                description = ruleType;
                break;
        }
    }

    $('#utRuleDescription').val(description);
}

function closeMenuModal() {
    $('#utensilsModal').addClass('hidden');
}

function openMenuModal() {
    clearUtensilForm();
    $('#utensils-title').text('Create Utensil');
    setActionButtonLabel('#btnSaveUtensil', 'Save');
    $('#utensilsModal').removeClass('hidden');
}

function loadUtensils() {
    showUtensilsLoader(true);

    $.ajax({
        url: '/Admin/Utensils/get',
        type: 'GET',
        dataType: 'json',
        success: function (rows) {
            renderUtensilList(Array.isArray(rows) ? rows : []);
        },
        error: function () {
            renderUtensilList([]);
            showToast('Unable to load Utensil.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showUtensilsLoader(false);
        }
    });
}

function showUtensilsLoader(show) {
    var $panel = $('.pageloaderpanel');
    if ($panel.length) {
        $('#utensilListPanel .table-wrap').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
    }
}

function renderUtensilList(rows) {
    rows = Array.isArray(rows) ? rows : [];
    var html = '';
    if (rows.length) {
        html = rows.map(function (utensil, index) {
            var serial = index + 1;
            var id = utensil.id || utensil.Id || '';
            var utensilName = utensil.utensilName || utensil.UtensilName || '';
            var ruleDescription = utensil.ruleDescription ?? utensil.RuleDescription ?? '';
            var price = utensil.price || utensil.Price || '';
            var depAmt = utensil.depositAmount || utensil.DepositAmount || '';
            var active = utensil.isActive;

            var actions;
            if (active) {
                actions = `<button type="button" class="action-item utensil-action-edit" data-id="${id}" onclick="editUtensil(this.dataset.id)"><span class="action-icon action-icon-text" aria-hidden="true">&#9998;</span>Edit</button>
                           <button type="button" class="action-item utensil-action-inactive" data-id="${id}" onclick="setUtensilActive(this.dataset.id, false)"><span class="action-icon action-icon-text" aria-hidden="true">&#128274;</span>Inactive</button>`;
            } else {
                actions = `<button type="button" class="action-item utensil-action-active" data-id="${id}" onclick="setUtensilActive(this.dataset.id, true)"><span class="action-icon action-icon-text" aria-hidden="true">&#128275;</span>Active</button>`;
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
                    <td>${utensilName}</td>
                    <td>${ruleDescription}</td>
                    <td>${price || ''}</td>
                    <td>${depAmt || ''}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="row-actions utensil-row-actions">
                            <button class="dots-btn" title="Actions">⋯</button>
                            <div class="actions-menu hidden">
                                ${actions}
                                <button type="button" class="action-item utensil-action-delete" data-id="${id}" onclick="deleteUtensil(this.dataset.id)"><span class="action-icon action-icon-text" aria-hidden="true">&#128465;</span>Delete</button>
                            </div>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    }

    $('#utensilList tbody').html(html);
    if (typeof renderDataTable === 'function') {
        renderDataTable('utensilList');
    }
}

function clearUtensilForm() {
    $('#utensilId').val('');
    $('#utName').val('');
    $('#utRuleType').val('');
    $('#utRuleOperator').val('SAME');
    updateRuleOperatorDescription();
    $('#utRuleValue').val('1');
    $('#utRulePercentage').val('0');
    $('#utMinimumQty').val('0');
    updateGeneratedRuleDescription();
    $('#utPrice').val('');
    $('#utDepAmt').val('0.00');

    clearUtensilError('#utName', '#utNameError');
    clearUtensilError('#utPrice', '#utPriceError');
    clearUtensilError('#utDepAmt', '#utDepAmtError');
}

function setUtensilError(inputSelector, errorSelector, message) {
    $(inputSelector).addClass('input-error');
    $(errorSelector).removeClass('hidden').text(message);
}

function clearUtensilError(inputSelector, errorSelector) {
    $(inputSelector).removeClass('input-error');
    $(errorSelector).addClass('hidden').text('');
}

function validateForm() {
    clearUtensilError('#utName', '#utNameError');
    clearUtensilError('#utPrice', '#utPriceError');
    clearUtensilError('#utDepAmt', '#utDepAmtError');

    var code = $('#utName').val();
    if (code) {
        code = code.toString().trim();
    } else {
        code = '';
    }

    var firstInvalid = null;

    if (!code) {
        setUtensilError('#utName', '#utNameError', 'Name is required');
        firstInvalid = '#utName';
    }

    if (firstInvalid) {
        $(firstInvalid).focus();
        return false;
    }

    return true;
}

function saveutensil() {
    if (window.gcFormValidation && !window.gcFormValidation.validateScope($('.main').first(), true)) {
        return;
    }

    if (!validateForm()) {
        return;
    }

    setButtonBusy('#btnSaveUtensil', true, 'Saving...');

    var utensilId = $('#utensilId').val();
    var utensil = {
        Id: utensilId ? parseInt(utensilId): 0,
        UtensilName: $('#utName').val() || '',
        RuleType: $('#utRuleType').val() || '',
        RuleOperator: $('#utRuleOperator').val() || '',
        RuleValue: Number($('#utRuleValue').val()) || 0,
        RulePercentage: Number($('#utRulePercentage').val()) || 0,
        MinimumQty: parseInt($('#utMinimumQty').val(), 10) || 0,
        RuleDescription: ($('#utRuleDescription').val() || '').trim(),
        Price: Number($('#utPrice').val()) || 0,
        DepositAmount: Number($('#utDepAmt').val()) || 0,
        IsActive: true,
        IsDeleted: false,
        CreatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        CreatedDate: null,
        UpdatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        UpdatedDate: null
    };

    var endpoint = utensil.Id ? '/Admin/Utensils/update' : '/Admin/Utensils/create';

    $.ajax({
        url: endpoint,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(utensil),
        success: function (res) {
            if (res && res.success) {
                showToast(utensilId == 0 ? 'Utensils saved successfully.' : 'Utensils updated successfully', 3000, { type: 'success', title: utensilId == 0 ? 'Saved' : 'Updated' });
                clearUtensilForm();
                $('#utensilsModal').addClass('hidden');
                loadUtensils();
            } else {
                setButtonBusy('#btnSaveUtensil', false);
                var errorMsg = res && res.message ? res.message : (utensilId == 0 ? 'Unable to save Utensils.' : 'Unable to update Utensil');
                showToast(errorMsg, 3000, { type: 'error', title: utensilId == 0 ? 'Save failed' : 'Update failed' });
            }
        },
        error: function (xhr) {
            setButtonBusy('#btnSaveUtensil', false);
            var response = xhr.responseJSON;
            showToast(response?.message || response?.detail || 'Save failed.', 3000, { type: 'error', title: 'Save failed' });
        }
    });
}

function editUtensil(id) {
    $('#utensils-title').text('Edit Utensil');
    $.ajax({
        url: '/Admin/Utensils/get/' + id,
        type: 'GET',
        success: function (role) {
            if (!role) {
                showToast('Utensils not found.', 3000, { type: 'warning', title: 'Not found' });
                return;
            }
            $('#utensilId').val(role.Id || role.id || '');
            $('#utName').val(role.UtensilName || role.utensilName || '');
            $('#utRuleType').val(role.RuleType ?? role.ruleType ?? '');
            $('#utRuleOperator').val(role.RuleOperator ?? role.ruleOperator ?? 'SAME');
            updateRuleOperatorDescription();
            $('#utRuleValue').val(role.RuleValue ?? role.ruleValue ?? 0);
            $('#utRulePercentage').val(role.RulePercentage ?? role.rulePercentage ?? 0);
            $('#utMinimumQty').val(role.MinimumQty ?? role.minimumQty ?? 0);
            updateGeneratedRuleDescription();
            $('#utPrice').val(role.Price || role.price || '');
            $('#utDepAmt').val(role.DepositAmount || role.depositAmount || '');
            setActionButtonLabel('#btnSaveUtensil', 'Update');
            $('#utensilsModal').removeClass('hidden');
        },
        error: function () { showToast('Unable to load Utensils.', 3000, { type: 'error', title: 'Load failed' }); }
    });
}

function deleteUtensil(id) {
    if (!id) return;
    showToast('Delete this Utensil?', 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Delete',
        noText: 'Cancel',
        onYes: function () {
            $.ajax({
                url: '/Admin/Utensils/delete/' + id,
                type: 'POST',
                success: function (res) {
                    if (res && res.success) {
                        showToast('Utensils deleted successfully.', 3000, { type: 'success', title: 'Deleted' });
                    } else {
                        showToast('Unable to delete Utensils.', 3000, { type: 'error', title: 'Delete failed' });
                    }
                    setTimeout(loadUtensils, 300);
                },
                error: function () { showToast('Delete failed.', 3000, { type: 'error', title: 'Delete failed' }); }
            });
        },
        onNo: function () {
            showToast('Delete cancelled.', 3000, { type: 'info', title: 'Cancelled' });
        }
    });
}

function setUtensilActive(id, isActive) {
    if (!id) return;

    var confirmMessage = isActive ? 'Mark this Utensils active?' : 'Mark this Utensils inactive?';
    var successMessage = isActive ? 'Utensils activated.' : 'Utensils marked inactive.';

    showToast(confirmMessage, 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Yes',
        noText: 'No',
        onYes: function () {
            $.ajax({
                url: '/Admin/Utensils/activeinactive/' + id + '?status=' + isActive,
                type: 'POST',
                success: function (res) {
                    if (res && res.success) {
                        showToast(successMessage, 3000, { type: 'success', title: 'Updated' });
                    } else {
                        showToast('Unable to update Utensils status.', 3000, { type: 'error', title: 'Update failed' });
                    }
                    setTimeout(loadUtensils, 350);
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
