// Locations page - client-side rendering and actions


$(document).ready(function () {
    loadLocation();
    $('#locationsModal').on('click', function (event) {
        if (event.target === this) closeLocationModal();
    });
    $('#locationCode, #locationName, #locationDeliveryFee').on('input change', function () {
        clearLocationError('#' + this.id, '#' + this.id + 'Error');
    });
});

function htmlEncodeLocation(value) {
    return $('<div>').text(value == null ? '' : value).html();
}



function loadLocation() {
    showLocationsLoader(true);

    $.ajax({
        url: '/Admin/Locations/getAll',
        type: 'GET',
        success: function (rows) {

            renderLocationList(rows || []);
        },
        error: function () {
            renderLocationList([]);
            showToast('Unable to load locations.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showLocationsLoader(false);
        }
    });
}


function showLocationsLoader(show) {
    var $panel = $('.pageloaderpanel');
    if ($panel.length) {
        $('#locationsListPanel .table-wrap').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
    }
}
function renderLocationList(rows) {
    rows = Array.isArray(rows) ? rows : [];

    var html = rows.map(function (location, index) {

        var serial = index + 1;

        var id = location.id ?? location.Id ?? 0;
        var code = location.code ?? location.Code ?? '';
        var locationName = location.locationName ?? location.LocationName ?? '';
        var deliveryZone = location.deliveryZone ?? location.DeliveryZone ?? '';
        var deliveryFee = location.deliveryFee ?? location.DeliveryFee ?? 0;
        var remarks = location.remarks ?? location.Remarks ?? '';
        var active = location.isActive ?? location.IsActive ?? false;

        var actions;

        if (active) {
            actions = `
                <button type="button" class="action-item location-action-edit" data-id="${id}" onclick="editLocation(this.dataset.id)">
                    <span class="action-icon action-icon-text" aria-hidden="true">&#9998;</span>Edit
                </button>
                <button type="button" class="action-item location-action-inactive" data-id="${id}" onclick="setLocationActive(this.dataset.id, false)">
                    <span class="action-icon action-icon-text" aria-hidden="true">&#128274;</span>Inactive
                </button>`;
        } else {
            actions = `
                <button type="button" class="action-item location-action-active" data-id="${id}" onclick="setLocationActive(this.dataset.id, true)">
                    <span class="action-icon action-icon-text" aria-hidden="true">&#128275;</span>Active
                </button>`;
        }

        var statusBadge = active
            ? '<span class="badge-pill badge-pill--success">Active</span>'
            : '<span class="badge-pill badge-pill--warning">Inactive</span>';

        return `
            <tr>
                <td>${serial}</td>
                <td><strong>${htmlEncodeLocation(code)}</strong></td>
                <td><strong>${htmlEncodeLocation(locationName)}</strong></td>
                <td>${htmlEncodeLocation(deliveryZone)}</td>
                <td>S$${Number(deliveryFee).toFixed(2)}</td>
                <td>${htmlEncodeLocation(remarks)}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="row-actions location-row-actions">
                        <button class="dots-btn" title="Actions">⋯</button>
                        <div class="actions-menu hidden">
                            ${actions}
                            <button type="button" class="action-item location-action-delete" data-id="${id}" onclick="deleteLocation(this.dataset.id)">
                                <span class="action-icon action-icon-text" aria-hidden="true">&#128465;</span>Delete
                            </button>
                        </div>
                    </div>
                </td>
            </tr>`;
    }).join('');

    $('#locationList tbody').html(html);

    if (typeof renderDataTable === 'function') {
        renderDataTable('locationList');
    }
}

function clearLocationForm(keepId) {
    if (!keepId) $('#locationId').val('');
    $('#locationName').val('');
    $('#locationDeliveryZone').val('');
    $('#locationDeliveryFee').val('');
    $('#locationRemarks').val('');
    clearLocationFormErrors();
}

function setLocationError(inputSelector, errorSelector, message) {
    $(inputSelector).addClass('input-error');
    $(errorSelector).removeClass('hidden').text(message);
}

function clearLocationError(inputSelector, errorSelector) {
    $(inputSelector).removeClass('input-error');
    $(errorSelector).addClass('hidden').text('');
}

function clearLocationFormErrors() {
    clearLocationError('#locationCode', '#locationCodeError');
    clearLocationError('#locationName', '#locationNameError');
    clearLocationError('#locationDeliveryFee', '#locationDeliveryFeeError');
}


function closeLocationModal() {
    $('#locationsModal').addClass('hidden');
}


function openLocationModal() {
    clearLocationForm(false);
    $('#locations-title').text('Create Location');
    setActionButtonLabel('#btnSaveLocation', 'Save');
    $('#locationsModal').removeClass('hidden');
    GetAutoGenerateCode();
    $('#locationName').trigger('focus');
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
                $('#locationCode').val(res.code || '');
            } else {
                showToast((res && res.message) || 'Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
            }
        },
        error: function () {
            showToast('Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
        }
    });
}
function saveLocation() {
    var id = Number($('#locationId').val()) || 0;
    var code = String($('#locationCode').val() || '').trim();
    var locationName = String($('#locationName').val() || '').trim();
    var deliveryFee = parseFloat($('#locationDeliveryFee').val()) || 0;
    var firstInvalid = null;

    clearLocationFormErrors();
    if (!code) {
        setLocationError('#locationCode', '#locationCodeError', 'Code is required');
        firstInvalid = '#locationCode';
    }
    if (!locationName) {
        setLocationError('#locationName', '#locationNameError', 'Location Name is required');
        firstInvalid = firstInvalid || '#locationName';
    }
    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
        setLocationError('#locationDeliveryFee', '#locationDeliveryFeeError', 'Enter a valid delivery fee (example: 10.50)');
        firstInvalid = firstInvalid || '#locationDeliveryFee';
    }
    if (firstInvalid) {
        $(firstInvalid).trigger('focus');
        return;
    }

    if (window.gcFormValidation && !window.gcFormValidation.validateScope('#locationsModal .modal-box', true)) {
        return;
    }

    setButtonBusy('#btnSaveLocation', true, id ? 'Updating...' : 'Saving...');

    var location = {
        Id: id,
        Code: code,
        LocationName: locationName,
        DeliveryZone: String($('#locationDeliveryZone').val() || '').trim() || null,
        DeliveryFee: deliveryFee,
        Remarks: String($('#locationRemarks').val() || '').trim(),
        IsActive: true,
        IsDeleted: false,
        CreatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        CreatedDate: new Date().toISOString(),
        UpdatedBy: null,
        UpdatedDate: null
    };

    var endpoint = location.Id ? '/Admin/Locations/update' : '/Admin/Locations/create';

    $.ajax({
        url: endpoint,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(location),
        success: function (res) {
            if (res && res.success) {
                showToast(res.message || 'Location saved successfully.', 3000, { type: 'success', title: 'Saved' });
                clearLocationForm(false);
                $('#locationsModal').addClass('hidden');
                loadLocation();
            } else {
                setButtonBusy('#btnSaveLocation', false);
                showToast(res?.message || 'Unable to save Location.', 3000, { type: 'error', title: 'Save failed' });
            }
        },
        error: function (xhr) {
            setButtonBusy('#btnSaveLocation', false);
            showToast(xhr.responseJSON?.message || 'Save failed.', 3000, { type: 'error', title: 'Save failed' });
        }
    });
}


function editLocation(id) {
    $('#locations-title').text('Edit Location');
    $.ajax({
        url: '/Admin/Locations/get/' + id,
        type: 'GET',
        success: function (location) {
            if (!location) {
                showToast('Location not found.', 3000, { type: 'warning', title: 'Not found' });
                return;
            }

            $('#locationId').val(location.Id || location.id || '');
            $('#locationCode').val(location.Code || location.code || '');
            $('#locationName').val(location.LocationName || location.locationName || '');
            $('#locationDeliveryZone').val(location.DeliveryZone || location.deliveryZone || '');
            $('#locationDeliveryFee').val(location.DeliveryFee || location.deliveryFee || 0);
            $('#locationRemarks').val(location.Remarks || location.remarks || '');

            clearLocationFormErrors();
            setActionButtonLabel('#btnSaveLocation', 'Update');
            $('#locationsModal').removeClass('hidden');
        },
        error: function () {
            showToast('Unable to load location.', 3000, { type: 'error', title: 'Load failed' });
        }
    });
}


function setLocationActive(id, isActive) {
    if (!id) return;

    var confirmMessage = isActive ? 'Mark this Location active?' : 'Mark this Location inactive?';
    var successMessage = isActive ? 'Location activated.' : 'Location marked inactive.';

    showToast(confirmMessage, 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Yes',
        noText: 'No',
        onYes: function () {
            $.ajax({
                url: '/Admin/Locations/activeinactive?id=' + id + '&status=' + isActive,
                type: 'POST',
                success: function (res) {
                    if (res && res.success) {
                        showToast(successMessage, 3000, { type: 'success', title: 'Updated' });
                    } else {
                        showToast('Unable to update Location status.', 3000, { type: 'error', title: 'Update failed' });
                    }

                    setTimeout(loadLocation, 350);
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


function deleteLocation(id) {
    if (!id) return;

    showToast('Delete this Location?', 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Delete',
        noText: 'Cancel',
        onYes: function () {
            $.ajax({
                url: '/Admin/Locations/delete/' + id,
                type: 'POST',
                success: function (res) {
                    if (res && res.success) {
                        showToast('Location deleted successfully.', 3000, { type: 'success', title: 'Deleted' });
                    } else {
                        showToast('Unable to delete Location.', 3000, { type: 'error', title: 'Delete failed' });
                    }

                    setTimeout(loadLocation, 300);
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
































