$(document).ready(function () {
    initEventPage();
});

var availablePackages = [];
var selectedEventPackageIds = [];
var existingEventDetails = [];
var currentEventId = 0;

function initEventPage() {
    if ($('#eventsTable').length) loadEvents();
    if ($('#eventName').length) initEventForm();
}

function loadEvents() {
    $('#eventsListPanel .table-wrap').addClass('hidden');
    $('.pageloaderpanel').removeClass('hidden');

    $.getJSON('/Admin/EventMaster/get')
        .done(renderEvents)
        .fail(function () { renderEvents([]); })
        .always(function () {
            $('#eventsListPanel .table-wrap').removeClass('hidden');
            $('.pageloaderpanel').addClass('hidden');
        });
}

function renderEvents(rows) {
    var html = '';
    (Array.isArray(rows) ? rows : []).forEach(function (item, index) {
        var active = !!item.isActive;
        html += '<tr><td>' + (index + 1) + '</td><td><strong>' + escapeEventHtml(item.name) + '</strong></td><td>' + (item.minPax || 0) + '</td><td>' + formatServiceCharge(item.serviceCharge) + '</td><td>' + (item.advanceBookingDays || 0) + '</td>' +
            '<td><span class="badge ' + (active ? 'badge-confirmed' : 'badge-cancelled') + '">' + (active ? 'Active' : 'Inactive') + '</span></td>' +
            '<td><div class="row-actions event-row-actions"><button type="button" class="dots-btn">&#8943;</button><div class="actions-menu hidden">' +
            (active ? '<button type="button" class="action-item event-action-edit" onclick="editEvent(' + item.id + ')"><span class="action-icon action-icon-text" aria-hidden="true">&#9998;</span>Edit</button>' : '') +
            '<button type="button" class="action-item event-action-delete" onclick="deleteEvent(' + item.id + ')"><span class="action-icon action-icon-text" aria-hidden="true">&#128465;</span>Delete</button>' +
            '<button type="button" class="action-item ' + (active ? 'event-action-inactive' : 'event-action-active') + '" onclick="toggleEventStatus(' + item.id + ',' + (!active) + ')"><span class="action-icon action-icon-text" aria-hidden="true">' + (active ? '&#128274;' : '&#128275;') + '</span>' + (active ? 'Inactive' : 'Active') + '</button>' +
            '<button type="button" class="action-item event-action-print" onclick="printEvent(' + item.id + ')"><span class="action-icon action-icon-text" aria-hidden="true">&#128424;</span>Print</button>' +
            '</div></div></td></tr>';
    });

    $('#eventsTable tbody').html(html);
    if (typeof renderDataTable === 'function') renderDataTable('eventsTable');
}

function initEventForm() {
    $('#eventName,#minPax,#advanceBookingDays,#serviceCharge').on('input', clearEventErrors);
    $('#eventPackageIds').on('change', function () {
        selectedEventPackageIds = getSelectedEventPackageIds();
    });

    currentEventId = parseInt(new URLSearchParams(window.location.search).get('eventId') || 0, 10);
    initEventPackageDropdown();

    loadAvailablePackages(function () {
        if (currentEventId > 0) {
            if (typeof setActionButtonLabel === 'function') setActionButtonLabel('#saveEvent', 'Update');
            loadEventForEdit(currentEventId);
        } else {
            selectedEventPackageIds = [];
            existingEventDetails = [];
            renderEventPackageOptions();
        }
    });
}

function initEventPackageDropdown() {
    var $select = $('#eventPackageIds');
    if (!$select.length || typeof $select.select2 !== 'function') return;

    if (!$select.hasClass('select2-hidden-accessible')) {
        $select.select2({
            width: '100%',
            placeholder: 'Select packages',
            closeOnSelect: false
        });
    }
}

function loadAvailablePackages(done) {
    $.getJSON('/Admin/Packages/get').done(function (rows) {
        availablePackages = (Array.isArray(rows) ? rows : []).map(function (x) {
            return {
                id: parseInt(x.id ?? x.Id, 10) || 0,
                name: x.name ?? x.Name ?? '',
                isActive: !!(x.isActive ?? x.IsActive)
            };
        }).filter(function (x) { return x.id > 0; });
    }).always(done || function () {});
}

function renderEventPackageOptions() {
    var $select = $('#eventPackageIds');
    if (!$select.length) return;

    var selectedSet = new Set(selectedEventPackageIds.map(function (id) { return parseInt(id, 10) || 0; }));
    var html = '';

    availablePackages.forEach(function (pkg) {
        var packageId = parseInt(pkg.id, 10) || 0;
        if (packageId <= 0) return;

        var isSelected = selectedSet.has(packageId);
        if (!pkg.isActive && !isSelected) return;

        var name = pkg.name + (!pkg.isActive ? ' (Inactive)' : '');
        html += '<option value="' + packageId + '"' + (isSelected ? ' selected' : '') + '>' + escapeEventHtml(name) + '</option>';
    });

    $select.html(html);
    initEventPackageDropdown();
    $select.val(selectedEventPackageIds.map(String)).trigger('change.select2');
}

function getSelectedEventPackageIds() {
    return ($('#eventPackageIds').val() || [])
        .map(function (value) { return parseInt(value, 10) || 0; })
        .filter(function (id) { return id > 0; });
}

function loadEventForEdit(id) {
    $.getJSON('/Admin/EventMaster/get/' + id).done(function (item) {
        $('#eventName').val(item.name || '');
        $('#minPax').val(item.minPax || '');
        $('#advanceBookingDays').val(item.advanceBookingDays ?? 0);
        $('#serviceCharge').val(item.serviceCharge ?? 0);

        var rows = item.packageDetails ?? item.PackageDetails ?? [];
        existingEventDetails = (Array.isArray(rows) ? rows : []).map(function (x) {
            return {
                id: parseInt(x.id ?? x.Id, 10) || 0,
                packageId: parseInt(x.packageId ?? x.PackageId, 10) || 0
            };
        }).filter(function (x) {
            return x.id > 0 && x.packageId > 0;
        });

        selectedEventPackageIds = existingEventDetails.map(function (x) { return x.packageId; });
        renderEventPackageOptions();
    }).fail(function () {
        showToast('Unable to load event details.', 3000, { type: 'error', title: 'Load failed' });
    });
}

function validateEvent() {
    clearEventErrors();
    var valid = true;

    if (!$('#eventName').val().trim()) {
        $('#eventName').addClass('input-error');
        $('#eventNameError').removeClass('hidden').text('Event name is required');
        valid = false;
    }

    if ((parseInt($('#minPax').val(), 10) || 0) <= 0) {
        $('#minPax').addClass('input-error');
        $('#minPaxError').removeClass('hidden').text('Minimum pax is required');
        valid = false;
    }

    var advanceDays = parseInt($('#advanceBookingDays').val(), 10);
    if (isNaN(advanceDays) || advanceDays < 0) {
        $('#advanceBookingDays').addClass('input-error');
        $('#advanceBookingDaysError').removeClass('hidden').text('Advance booking days must be zero or more');
        valid = false;
    }

    var serviceCharge = parseFloat($('#serviceCharge').val());
    if (isNaN(serviceCharge) || serviceCharge < 0) {
        $('#serviceCharge').addClass('input-error');
        $('#serviceChargeError').removeClass('hidden').text('Service charge must be zero or more');
        valid = false;
    }

    if (!getSelectedEventPackageIds().length) {
        showToast('Select at least one package', 3000, { type: 'error', title: 'Validation' });
        valid = false;
    }

    return valid;
}

function saveEvent() {
    if (window.gcFormValidation && !window.gcFormValidation.validateScope($('.main').first(), true)) {
        return;
    }

    if (!validateEvent()) return;
    if (typeof setButtonBusy === 'function') setButtonBusy('#saveEvent', true, 'Saving...');

    var userId = window.getCurrentUserId ? window.getCurrentUserId() : 0;
    selectedEventPackageIds = getSelectedEventPackageIds();

    var payload = {
        Id: currentEventId,
        Name: $('#eventName').val().trim(),
        MinPax: parseInt($('#minPax').val(), 10),
        ServiceCharge: parseFloat($('#serviceCharge').val()) || 0,
        AdvanceBookingDays: parseInt($('#advanceBookingDays').val(), 10) || 0,
        PackageIds: selectedEventPackageIds.join(','),
        IsActive: true,
        IsDeleted: false,
        CreatedBy: userId,
        UpdatedBy: userId
    };

    $.ajax({
        url: currentEventId ? '/Admin/EventMaster/update' : '/Admin/EventMaster/create',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).done(function (result) {
        if (!result || !result.success) {
            eventSaveFailed(result && result.message);
            return;
        }

        if (currentEventId > 0) {
            syncEventPackages(currentEventId, userId, function (ok) {
                if (ok) eventSaveComplete();
                else eventSaveFailed('Unable to update event packages.');
            });
            return;
        }

        eventSaveComplete();
    }).fail(function (xhr) {
        eventSaveFailed(xhr.responseJSON?.message);
    });
}

function syncEventPackages(eventId, userId, done) {
    done = typeof done === 'function' ? done : function () {};

    var selected = getSelectedEventPackageIds();
    var existing = existingEventDetails.slice();
    var existingIds = existing.map(function (x) { return x.packageId; });

    var toAdd = selected.filter(function (id) {
        return existingIds.indexOf(id) < 0;
    });

    var selectedSet = new Set(selected);
    var toDelete = existing.filter(function (x) {
        return !selectedSet.has(x.packageId);
    });

    var requests = [];
    if (toAdd.length) {
        var savePayload = toAdd.map(function (packageId) {
            return {
                EventId: eventId,
                PackageId: packageId,
                CreatedBy: userId,
                UpdatedBy: userId,
                IsActive: true,
                IsDeleted: false
            };
        });

        requests.push($.ajax({
            url: '/Admin/EventDetails/save',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(savePayload)
        }));
    }

    toDelete.forEach(function (x) {
        requests.push($.ajax({
            url: '/Admin/EventDetails/delete/' + x.id,
            type: 'DELETE'
        }));
    });

    if (!requests.length) {
        done(true);
        return;
    }

    $.when.apply($, requests).done(function () {
        var responses = extractAjaxResponses(arguments, requests.length);
        var ok = responses.every(function (x) { return x && x.success; });
        done(ok);
    }).fail(function () {
        done(false);
    });
}

function extractAjaxResponses(args, count) {
    if (count === 1) return [args[0]];

    var responses = [];
    for (var i = 0; i < args.length; i++) {
        responses.push(args[i][0]);
    }
    return responses;
}

function eventSaveComplete() {
    showToast(currentEventId ? 'Event updated successfully.' : 'Event created successfully.', 500, { type: 'success', title: 'Success' });
    setTimeout(function () { location.href = '/Admin/EventMaster'; }, 300);
}

function eventSaveFailed(message) {
    if (typeof setButtonBusy === 'function') setButtonBusy('#saveEvent', false);
    showToast(message || 'Unable to save event.', 3000, { type: 'error', title: 'Save failed' });
}

function clearEventForm() {
    $('#eventName,#minPax,#advanceBookingDays,#serviceCharge').val('');
    selectedEventPackageIds = [];
    existingEventDetails = [];
    renderEventPackageOptions();
    clearEventErrors();
}

function clearEventErrors() {
    $('#eventName,#minPax,#advanceBookingDays,#serviceCharge').removeClass('input-error');
    $('#eventNameError,#minPaxError,#advanceBookingDaysError,#serviceChargeError').addClass('hidden').text('');
}

function formatServiceCharge(value) {
    return 'S$' + (Number(value) || 0).toFixed(2);
}

function editEvent(id) {
    location.href = '/Admin/EventMaster/edit?eventId=' + id;
}

function printEvent(id) {
    id = parseInt(id, 10) || 0;
    if (!id) {
        showToast('Invalid event Id.', 3000, { type: 'warning', title: 'Print' });
        return;
    }
    window.open('/Admin/EventMaster/edit?eventId=' + id, '_blank');
}

function deleteEvent(id) {
    confirmEventAction('Delete this event?', function () {
        $.post('/Admin/EventMaster/delete/' + id).done(function (r) {
            eventActionResult(r, 'Event deleted successfully.');
        });
    });
}

function toggleEventStatus(id, status) {
    confirmEventAction(status ? 'Mark this event active?' : 'Mark this event inactive?', function () {
        $.post('/Admin/EventMaster/activeinactive?id=' + id + '&status=' + status).done(function (r) {
            eventActionResult(r, 'Event status updated.');
        });
    });
}

function confirmEventAction(message, action) {
    showToast(message, 0, { confirm: true, type: 'warning', title: 'Confirm', yesText: 'Yes', noText: 'No', onYes: action });
}

function eventActionResult(result, message) {
    showToast(result && result.success ? message : 'Unable to update event.', 3000, { type: result && result.success ? 'success' : 'error', title: result && result.success ? 'Success' : 'Failed' });
    setTimeout(loadEvents, 300);
}

function escapeEventHtml(value) {
    return $('<div>').text(value || '').html();
}
