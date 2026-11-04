$(document).ready(function () {
    loadMealPeriod();
});

function loadMealPeriod() {
    showMealPeriodsLoader(true);

    $.ajax({
        url: '/Admin/MealPeriods/getAll',
        type: 'GET',
        success: function (rows) {
            renderMealPeriodList(rows || []);
        },
        error: function () {
            renderMealPeriodList([]);
            showToast('Unable to load meal periods.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showMealPeriodsLoader(false);
        }
    });
}

function showMealPeriodsLoader(show) {
    var $panel = $('.pageloaderpanel');
    if ($panel.length) {
        $('#mealPeriodsListPanel .table-wrap').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
    }
}


function renderMealPeriodList(rows) {
    rows = Array.isArray(rows) ? rows : [];

    var html = rows.map(function (meal, index) {

        var serial = index + 1;

        var id = meal.id ?? meal.Id ?? '';
        var code = meal.code ?? meal.Code ?? '';
        var mealPeriodName = meal.mealPeriodName ?? meal.MealPeriodName ?? '';
        var startTime = formatTime12Hour(meal.startTime ?? meal.StartTime ?? '');
        var endTime = formatTime12Hour(meal.endTime ?? meal.EndTime ?? '');
        var displayOrder = meal.displayOrder ?? meal.DisplayOrder ?? '';
        var activeValue = meal.isActive ?? meal.IsActive ?? false;

        var active = activeValue === true ||
            activeValue === 'true' ||
            activeValue === 'True' ||
            activeValue === '1' ||
            activeValue === 1;

        var actions;

        if (active) {
            actions = `
                <button type="button" class="action-item mealperiod-action-edit" data-id="${id}" onclick="editMealPeriod(this.dataset.id)">
                    <span class="action-icon action-icon-text" aria-hidden="true">&#9998;</span>Edit
                </button>
                <button type="button" class="action-item mealperiod-action-inactive" data-id="${id}" onclick="setMealPeriodActive(this.dataset.id, false)">
                    <span class="action-icon action-icon-text" aria-hidden="true">&#128274;</span>Inactive
                </button>`;
        } else {
            actions = `
                <button type="button" class="action-item mealperiod-action-active" data-id="${id}" onclick="setMealPeriodActive(this.dataset.id, true)">
                    <span class="action-icon action-icon-text" aria-hidden="true">&#128275;</span>Active
                </button>`;
        }

        var statusBadge = active
            ? '<span class="badge-pill badge-pill--success">Active</span>'
            : '<span class="badge-pill badge-pill--warning">Inactive</span>';

        return `
            <tr>
                <td>${serial}</td>
                <td>${code}</td>
                <td>${mealPeriodName}</td>               
                <td>${statusBadge}</td>
                <td>
                    <div class="row-actions mealperiod-row-actions">
                        <button class="dots-btn" title="Actions">⋯</button>
                        <div class="actions-menu hidden">
                            ${actions}
                            <button type="button" class="action-item mealperiod-action-delete" data-id="${id}" onclick="deleteMealPeriod(this.dataset.id)">
                                <span class="action-icon action-icon-text" aria-hidden="true">&#128465;</span>Delete
                            </button>
                        </div>
                    </div>
                </td>
            </tr>`;
    }).join('');

    $('#mealPeriodList tbody').html(html);

    if (typeof renderDataTable === 'function') {
        renderDataTable('mealPeriodList');
    }
}


function clearMealPeriodForm() {
    $('#mealPeriodId').val('');
    $('#mealPeriodName').val('');
    $('#mealPeriodStartTime').val('');
    $('#mealPeriodEndTime').val('');
    $('#mealPeriodDisplayOrder').val('');
    setActionButtonLabel('#saveMealPeriodBtn', 'Save');
}

function closeMealPeriodModal() {
    $('#mealPeriodsModal').addClass('hidden');
}

function openMealPeriodModal() {
    clearMealPeriodForm();
    $('#mealPeriods-title').text('Create Meal Period');
    $('#mealPeriodsModal').removeClass('hidden');
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
                $('#mealPeriodCode').val(res.code || '');
            } else {
                showToast((res && res.message) || 'Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
            }
        },
        error: function () {
            showToast('Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
        }
    });
}

function saveMealPeriod() {
    if (window.gcFormValidation && !window.gcFormValidation.validateScope($('.main').first(), true)) {
        return;
    }

    var saveButtonSelector = '#saveMealPeriodBtn';
    setButtonBusy(saveButtonSelector, true, 'Saving...');

    var id = parseInt($('#mealPeriodId').val(), 10) || 0;
    var entityNo = parseInt(sessionStorage.getItem('gcCurrentEntityNo') || '0', 10) || 0;

    var mealPeriod = {
        Id: id,
        Code: ($('#mealPeriodCode').val() || '').trim(),
        MealPeriodName: ($('#mealPeriodName').val() || '').trim(),
        StartTime: $('#mealPeriodStartTime').val() || null,
        EndTime: $('#mealPeriodEndTime').val() || null,
        DisplayOrder:parseInt($('#mealPeriodDisplayOrder').val(), 10) || 0,
        IsActive: true,
        IsDeleted: false,
        CreatedBy: id === 0 ? 1 : null,
        CreatedDate: id === 0? new Date().toISOString() : new Date().toISOString(),
        UpdatedBy: id > 0 ? 1 : null,
        UpdatedDate: id > 0 ? new Date().toISOString() : null,
        EntityNo: entityNo
    };
    if (!mealPeriod.MealPeriodName) {
        showToast(
            'Meal Period Name is required.',
            3000,
            {
                type: 'warning',
                title: 'Validation'
            });

        $('#mealPeriodName').focus();
        setButtonBusy(saveButtonSelector, false);

        return;
    }
    // if (!mealPeriod.StartTime) {
    //     showToast(
    //         'Start Time is required.',
    //         3000,
    //         {
    //             type: 'warning',
    //             title: 'Validation'
    //         });

    //     $('#mealPeriodStartTime').focus();
    //     setButtonBusy(saveButtonSelector, false);

    //     return;
    // }
    // if (!mealPeriod.EndTime) {
    //     showToast(
    //         'End Time is required.',
    //         3000,
    //         {
    //             type: 'warning',
    //             title: 'Validation'
    //         });

    //     $('#mealPeriodEndTime').focus();
    //     setButtonBusy(saveButtonSelector, false);

    //     return;
    // }
    if (mealPeriod.DisplayOrder <= 0) {
        showToast(
            'Display Order must be greater than zero.',
            3000,
            {
                type: 'warning',
                title: 'Validation'
            });

        $('#mealPeriodDisplayOrder').focus();
        setButtonBusy(saveButtonSelector, false);

        return;
    }
    // if (mealPeriod.StartTime >= mealPeriod.EndTime) {
    //     showToast(
    //         'End Time must be greater than Start Time.',
    //         3000,
    //         {
    //             type: 'warning',
    //             title: 'Validation'
    //         });

    //     $('#mealPeriodEndTime').focus();
    //     setButtonBusy(saveButtonSelector, false);

    //     return;
    // }

    var endpoint = id > 0
        ? '/Admin/MealPeriods/update'
        : '/Admin/MealPeriods/create';

    $.ajax({
        url: endpoint,
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(mealPeriod),
        success: function (res) {
            if (res && res.success) {
                showToast(
                    id === 0 ? 'Meal Period saved successfully.' : 'Meal Period updated successfully.',
                    3000,
                    {
                        type: 'success',
                        title: id === 0 ? 'Saved' : 'Updated'
                    });

                closeMealPeriodModal();
                clearMealPeriodForm();
                loadMealPeriod();
                return;
            }

            setButtonBusy(saveButtonSelector, false);
            showToast(
                res && res.message
                    ? res.message
                    : (id === 0 ? 'Unable to save Meal Period.' : 'Unable to update Meal Period.'),
                3000,
                {
                    type: 'error',
                    title: id === 0 ? 'Save failed' : 'Update failed'
                });
        },
        error: function (xhr) {
            var message = id === 0 ? 'Save failed.' : 'Update failed.';

            if (xhr.responseJSON) {
                message =
                    xhr.responseJSON.message ||
                    xhr.responseJSON.title ||
                    message;
            }

            setButtonBusy(saveButtonSelector, false);
            showToast(
                message,
                3000,
                {
                    type: 'error',
                    title: id === 0 ? 'Save failed' : 'Update failed'
                });
        }
    });
}

function editMealPeriod(id) {
    if (!id)
        return;

    $('#mealPeriods-title').text('Edit Meal Period');

    $.ajax({
        url: '/Admin/MealPeriods/get/' + id,
        type: 'GET',
        success: function (meal) {
            if (!meal) {
                showToast(
                    'Meal Period not found.',
                    3000,
                    {
                        type: 'warning',
                        title: 'Not found'
                    });

                return;
            }

            var mealId =
                meal.id ?? meal.Id ?? 0;

            var code =
                meal.code ?? meal.Code ?? '';

            var name =
                meal.mealPeriodName ??
                meal.MealPeriodName ??
                '';

            var startTime =
                meal.startTime ??
                meal.StartTime ??
                '';

            var endTime =
                meal.endTime ??
                meal.EndTime ??
                '';

            var displayOrder =
                meal.displayOrder ??
                meal.DisplayOrder ??
                '';

            var isActive =
                meal.isActive ??
                meal.IsActive ??
                false;

            startTime = normalizeTime(startTime);
            endTime = normalizeTime(endTime);

            $('#mealPeriodId')
                .val(mealId);

            $('#mealPeriodCode')
                .val(code);

            $('#mealPeriodName')
                .val(name);

            $('#mealPeriodStartTime')
                .val(startTime);

            $('#mealPeriodEndTime')
                .val(endTime);

            $('#mealPeriodDisplayOrder')
                .val(displayOrder);

            $('#mealPeriodIsActive')
                .prop('checked', toBoolean(isActive));


            $('#mealPeriodsModal')
                .removeClass('hidden');

            setActionButtonLabel('#saveMealPeriodBtn', 'Update');
        },
        error: function (xhr) {
            var message =
                xhr.responseJSON?.message ||
                'Unable to load Meal Period.';

            showToast(
                message,
                3000,
                {
                    type: 'error',
                    title: 'Load failed'
                });
        }
    });
}

function normalizeTime(value) {
    if (!value)
        return '';

    value = value.toString();

    if (value.includes('.')) {
        value = value.split('.')[0];
    }

    return value;
}


function formatTime12Hour(value) {
    var time = normalizeTime(value);

    if (!time)
        return '';

    var parts = time.split(':');
    var hour = parseInt(parts[0], 10);
    var minute = parts[1] || '00';

    if (Number.isNaN(hour))
        return value;

    var period = hour >= 12 ? 'PM' : 'AM';
    var displayHour = hour % 12 || 12;

    return displayHour + ':' + minute + ' ' + period;
}


function toBoolean(value) {
    return value === true ||
        value === 1 ||
        value === '1' ||
        value === 'true' ||
        value === 'True';
}

function setMealPeriodActive(id, isActive) {
    if (!id) return;

    var confirmMessage = isActive ? 'Mark this Meal Period active?' : 'Mark this Meal Period inactive?';
    var successMessage = isActive ? 'Meal Period activated.' : 'Meal Period marked inactive.';

    showToast(confirmMessage, 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Yes',
        noText: 'No',
        onYes: function () {
            $.ajax({
                url: '/Admin/MealPeriods/activeinactive?id=' + id + '&status=' + isActive,
                type: 'POST',
                success: function (res) {
                    if (res && res.success) {
                        showToast(successMessage, 3000, { type: 'success', title: 'Updated' });
                    } else {
                        showToast('Unable to update meal period status.', 3000, { type: 'error', title: 'Update failed' });
                    }

                    setTimeout(loadMealPeriod, 350);
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


function deleteMealPeriod(id) {
    if (!id) return;

    showToast('Delete this meal period?', 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Delete',
        noText: 'Cancel',
        onYes: function () {
            $.ajax({
                url: '/Admin/MealPeriods/delete/' + id,
                type: 'POST',
                success: function (res) {
                    if (res && res.success) {
                        showToast('Meal period deleted successfully.', 3000, { type: 'success', title: 'Deleted' });
                    } else {
                        showToast('Unable to delete meal period.', 3000, { type: 'error', title: 'Delete failed' });
                    }

                    setTimeout(loadMealPeriod, 300);
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