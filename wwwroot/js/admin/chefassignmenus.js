/*
 * Chef - Assign Menus page.
 * Orders and menu summaries are loaded from the ChefMenuAssignment endpoints.
 */

var camState = {
    orders: [],
    selectedOrderIds: [],
    assignedQty: {},
    assignmentId: parseInt($('#camAssignmentId').val(), 10) || 0,
    editData: null,
    pendingHeaderId: 0
};

$(document).ready(function () {
    initCamOrdersDropdown();
    initCamCookDate();
    initCamMenuSearch();
    renderCamMenuGroups();
    updateCamFooter();
    loadCamEditAssignment();
    loadCamHistory();
    $('#camSendModal').on('click', function (event) { if (event.target === this) closeCamSendModal(); });
    $(document).on('keydown.camSend', function (event) { if (event.key === 'Escape') closeCamSendModal(); });
});

function initCamOrdersDropdown() {
    var $select = $('#camOrdersSelect');
    if (!$select.length) return;

    if (typeof $select.select2 === 'function') {
        $select.select2({
            width: '100%',
            placeholder: $select.data('placeholder') || 'Search and select orders...',
            closeOnSelect: false
        });
    }

    $select.on('change', function () {
        camState.selectedOrderIds = ($(this).val() || []).map(function (v) { return parseInt(v, 10); });
        renderCamMenuGroups();
        updateCamFooter();
    });
}

function initCamMenuSearch() {
    $('#camMenuSearch').on('input', applyCamMenuSearch);
}

function applyCamMenuSearch() {
    var term = String($('#camMenuSearch').val() || '').trim().toLowerCase();
    var visibleCount = 0;

    $('#camMenuGroups .cam-menu-row').each(function () {
        var menuName = String($(this).data('menu-name') || '').toLowerCase();
        var visible = !term || menuName.indexOf(term) !== -1;
        $(this).toggleClass('hidden', !visible);
        if (visible) visibleCount += 1;
    });

    $('#camMenuNoSearchResults').toggleClass('hidden', visibleCount > 0 || !term);
    syncCamSelectAll();
}

function initCamCookDate() {
    var now = new Date();
    var today = formatCamDate(now);
    var $eventDate = $('#camEventDate');
    if (!$eventDate.length) return;
    $eventDate.attr('min', today);
    setCamFlatpickrMin($eventDate, today);
    $eventDate.on('change', function () {
        loadCamOrders($(this).val());
    });
}

function formatCamDate(date) {
    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
}

function setCamFlatpickrMin($input, value) {
    var input = $input.get(0);
    if (input && input._flatpickr) input._flatpickr.set('minDate', value || null);
}

function setCamFlatpickrMax($input, value) {
    var input = $input.get(0);
    if (input && input._flatpickr) input._flatpickr.set('maxDate', value || null);
}

function clearCamDate($input) {
    var input = $input.get(0);
    if (input && input._flatpickr) {
        input._flatpickr.clear();
    } else {
        $input.val('');
    }
}

function loadCamOrders(eventDate) {
    var $select = $('#camOrdersSelect');
    camState.orders = [];
    camState.selectedOrderIds = [];
    camState.assignedQty = {};
    $select.empty().prop('disabled', !eventDate).trigger('change');
    if (!eventDate) return;

    $.getJSON('/Admin/Chef/assignment/orders', {
        eventDate: eventDate,
        assignmentId: camState.assignmentId || null
    })
        .done(function (orders) {
            camState.orders = Array.isArray(orders) ? orders.map(normalizeCamOrder) : [];
            camState.orders.forEach(function (order) {
                $select.append(new Option(order.orderNumber + ' (Pax ' + order.pax + ')', order.id));
            });
            $select.prop('disabled', false).trigger('change.select2');

            if (camState.editData) {
                $select.val(camState.editData.orderIds || []).trigger('change');
            }
        })
        .fail(function () {
            showToast('Unable to load orders for the selected event date.', 3000, { type: 'error', title: 'Orders' });
        });
}

function normalizeCamOrder(order) {
    return {
        id: parseInt(order.orderId || order.OrderId, 10),
        orderNumber: order.orderNumber || order.OrderNumber || '',
        eventDate: (order.eventDate || order.EventDate || '').toString().slice(0, 10),
        pax: parseInt(order.pax || order.Pax, 10) || 0
    };
}

function renderCamMenuGroups() {
    var $groupsWrap = $('#camMenuGroups');
    var $empty = $('#camMenuEmpty');

    if (!camState.selectedOrderIds.length) {
        $groupsWrap.addClass('hidden').html('');
        $empty.removeClass('hidden');
        return;
    }

    $.ajax({
        url: '/Admin/Chef/assignment/menu-summary' + (camState.assignmentId > 0 ? '?assignmentId=' + camState.assignmentId : ''),
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(camState.selectedOrderIds.join(','))
    }).done(function (summaries) {
        var groups = Array.isArray(summaries) ? summaries.map(normalizeCamSummary) : [];
        renderCamSummaryRows(groups, $groupsWrap, $empty);
    }).fail(function () {
        $groupsWrap.addClass('hidden').html('');
        $empty.removeClass('hidden').find('.cam-menu-empty-text').text('Unable to load menu quantities.');
    });
}

function normalizeCamSummary(item) {
    return {
        menuId: parseInt(item.menuId || item.MenuId, 10),
        menuName: item.menuName || item.MenuName || '',
        orderedQty: parseInt(item.orderedQty || item.OrderedQty, 10) || 0,
        alreadyAssignedQty: parseInt(item.alreadyAssignedQty || item.AlreadyAssignedQty, 10) || 0,
        remainingQty: Math.max(0, parseInt(item.remainingQty || item.RemainingQty, 10) || 0)
    };
}

function renderCamSummaryRows(groups, $groupsWrap, $empty) {
    groups = groups.filter(function (group) { return group.remainingQty > 0; });
    if (!groups.length) {
        $groupsWrap.addClass('hidden').html('');
        $empty.removeClass('hidden');
        return;
    }

    $empty.addClass('hidden');
    $groupsWrap.removeClass('hidden');

    var html = '<div class="cam-menu-table-wrap"><table class="cam-menu-table"><thead><tr>' +
        '<th class="cam-menu-check-col"><label class="cam-select-all-label" for="camSelectAll"><input type="checkbox" id="camSelectAll" class="cam-menu-check cam-select-all-check" onchange="toggleCamSelectAll(this)"><span>Select</span></label></th><th>Menu Item</th><th>Total Qty</th><th>Available</th>' +
        (camState.assignmentId > 0 ? '<th class="cam-menu-action-col">Action</th>' : '') +
        '</tr></thead><tbody>';
    groups.forEach(function (group) {
        var unavailable = group.remainingQty <= 0;
        var canDelete = camState.assignmentId > 0
            && camState.editData
            && (camState.editData.menuIds || camState.editData.MenuIds || []).indexOf(group.menuId) !== -1;
        html += '<tr class="cam-menu-row' + (unavailable ? ' cam-menu-row-unavailable' : '') + '" data-menu-name="' + escapeCamHtml(group.menuName) + '">' +
            '<td class="cam-menu-check-col"><input type="checkbox" class="cam-menu-check" data-menu-id="' + group.menuId + '" ' + (unavailable ? 'disabled' : '') + ' onchange="toggleCamMenu(this)"></td>' +
            '<td><span class="cam-order-ref">' + escapeCamHtml(group.menuName) + '</span></td>' +
            '<td>' + group.orderedQty + '</td>' +
            '<td><span class="cam-remaining-badge ' + (group.remainingQty > 0 ? 'available' : 'zero') + '">' + group.remainingQty + '</span></td>' +
            (camState.assignmentId > 0 ? '<td class="cam-menu-action-col">' + (canDelete ? '<button type="button" class="cam-menu-delete" onclick="deleteCamMenu(' + group.menuId + ', this)"><i class="fa-solid fa-trash"></i> Delete</button>' : '<span class="muted">-</span>') + '</td>' : '') +
            '</tr>';
    });

    html += '</tbody></table></div><div class="cam-menu-no-results hidden" id="camMenuNoSearchResults">No matching menu items.</div>';
    $groupsWrap.html(html);
    applyCamEditValues();
    applyCamMenuSearch();
}

function toggleCamMenu(checkbox) {
    $(checkbox).closest('tr').toggleClass('cam-menu-row-selected', checkbox.checked);
    updateCamFooter();
}

function toggleCamSelectAll(selectAll) {
    var checked = !!selectAll.checked;
    $('#camMenuGroups .cam-menu-row:not(.hidden) .cam-menu-check:not(:disabled)').each(function () {
        this.checked = checked;
        $(this).closest('tr').toggleClass('cam-menu-row-selected', checked);
    });
    updateCamFooter();
}

function syncCamSelectAll() {
    var selectAll = document.getElementById('camSelectAll');
    if (!selectAll) return;

    var checkboxes = $('#camMenuGroups .cam-menu-row:not(.hidden) .cam-menu-check:not(:disabled)').get();
    var checkedCount = checkboxes.filter(function (checkbox) { return checkbox.checked; }).length;
    selectAll.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
    selectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    selectAll.disabled = checkboxes.length === 0;
}

function updateCamFooter() {
    var totalItems = 0;
    var totalQty = 0;

    $('#camMenuGroups .cam-menu-row .cam-menu-check:checked').each(function () {
        var val = parseInt($(this).closest('tr').find('.cam-remaining-badge').text(), 10) || 0;
        if (val > 0) {
            totalItems += 1;
            totalQty += val;
        }
    });

    $('#camStatItems').text(totalItems + ' items');
    $('#camStatQty').text(totalQty + ' qty selected');
    $('#camFooterItems').text(totalItems);
    $('#camFooterQty').text(totalQty);

    var eventDate = $('#camEventDate').val();
    $('#camFooterDate').text(eventDate ? eventDate : 'Not set');
    syncCamSelectAll();
}

function submitChefAssignment() {
    var menuIds = [];
    $('#camMenuGroups .cam-menu-row .cam-menu-check:checked').each(function () {
        var menuId = parseInt($(this).data('menu-id'), 10);
        if (menuId > 0) menuIds.push(menuId);
    });

    if (!$('#camEventDate').val() || !camState.selectedOrderIds.length || !menuIds.length) {
        showToast('Select orders and check at least one menu.', 3000, { type: 'error', title: 'Validation' });
        return;
    }

    var payload = {
        headerId: camState.assignmentId || null,
        chefId: parseInt($('#camChefId').val(), 10) || 0,
        eventDate: $('#camEventDate').val(),
        orderIds: camState.selectedOrderIds.join(','),
        menuIds: menuIds.join(',')
    };

    var $actionButton = $('#camSaveSendBtn');
    $actionButton.prop('disabled', true);
    setCamButtonLoading($actionButton, true, 'Saving & preparing...');
    $.ajax({
        url: '/Admin/Chef/assignment/save',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload)
    }).done(function (response) {
        if (response && response.success) {
            showToast(camState.assignmentId ? 'Assignment updated successfully.' : 'Menus assigned successfully.', 3000, { type: 'success', title: 'Saved' });
            var savedHeaderId = parseInt(response.headerId, 10) || 0;
            openCamSendModal(savedHeaderId);
            refreshCamMenuSummary();
            loadCamHistory();
        } else {
            showToast((response && response.message) || 'Unable to save assignment.', 3000, { type: 'error', title: 'Save failed' });
        }
    }).fail(function (xhr) {
        showToast((xhr.responseJSON && xhr.responseJSON.message) || 'Unable to save assignment.', 3000, { type: 'error', title: 'Save failed' });
    }).always(function () {
        setCamButtonLoading($actionButton, false);
        $actionButton.prop('disabled', false);
    });
}

function deleteChefAssignment(skipConfirm) {
    if (!camState.assignmentId) return;

    if (!skipConfirm) {
        window.confirmAdminAction({
            title: 'Delete Assignment',
            message: 'Remove this complete menu assignment?',
            bodyHtml: '<div class="cam-confirm-detail"><span class="cam-confirm-detail-icon"><i class="fa-solid fa-calendar-xmark"></i></span><div><strong>' + escapeCamHtml($('#camChefName').text()) + '</strong><small>Event date: ' + escapeCamHtml($('#camEventDate').val() || '-') + '<br>All menus in this assignment will be removed.</small></div></div>',
            confirmText: 'Delete Assignment',
            cancelText: 'Keep Assignment',
            confirmIcon: 'fa-solid fa-trash-can',
            cancelIcon: 'fa-solid fa-xmark',
            danger: true
        }).then(function (confirmed) {
            if (confirmed) deleteChefAssignment(true);
        });
        return;
    }

    $('#camDeleteBtn').prop('disabled', true);
    setCamButtonLoading($('#camDeleteBtn'), true, 'Deleting...');
    $.ajax({
        url: '/Admin/Chef/assignment/delete/' + camState.assignmentId,
        type: 'POST'
    }).done(function (response) {
        if (response && response.success) {
            showToast('Assignment deleted successfully.', 2500, { type: 'success', title: 'Deleted' });
            window.location.href = '/Admin/Chef';
        } else {
            showToast('Unable to delete assignment.', 3000, { type: 'error', title: 'Delete failed' });
        }
    }).fail(function () {
        showToast('Unable to delete assignment.', 3000, { type: 'error', title: 'Delete failed' });
    }).always(function () {
        setCamButtonLoading($('#camDeleteBtn'), false);
        $('#camDeleteBtn').prop('disabled', false);
    });
}

function refreshCamMenuSummary() {
    var selectedOrderIds = camState.selectedOrderIds.join(',');
    if (!selectedOrderIds) return;

    $.ajax({
        url: '/Admin/Chef/assignment/menu-summary' + (camState.assignmentId > 0 ? '?assignmentId=' + camState.assignmentId : ''),
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(selectedOrderIds)
    }).done(function (summaries) {
        var $groupsWrap = $('#camMenuGroups');
        var $empty = $('#camMenuEmpty');
        var groups = Array.isArray(summaries) ? summaries.map(normalizeCamSummary) : [];
        renderCamSummaryRows(groups, $groupsWrap, $empty);
    });
}

function deleteCamMenu(menuId, button, skipConfirm) {
    if (!camState.assignmentId) return;

    if (!skipConfirm) {
        var menuName = $(button).closest('tr').find('.cam-order-ref').text().trim() || 'Selected menu';
        window.confirmAdminAction({
            title: 'Delete Menu',
            message: 'Remove this menu from the chef assignment?',
            bodyHtml: '<div class="cam-confirm-detail"><span class="cam-confirm-detail-icon"><i class="fa-solid fa-utensils"></i></span><div><strong>' + escapeCamHtml(menuName) + '</strong><small>Only this menu will be removed. Other assigned menus will remain unchanged.</small></div></div>',
            confirmText: 'Delete Menu',
            cancelText: 'Keep Menu',
            confirmIcon: 'fa-solid fa-trash-can',
            cancelIcon: 'fa-solid fa-xmark',
            danger: true
        }).then(function (confirmed) {
            if (confirmed) deleteCamMenu(menuId, button, true);
        });
        return;
    }

    $(button).prop('disabled', true);
    setCamButtonLoading($(button), true, 'Deleting...');
    $.post('/Admin/Chef/assignment/delete-menu/' + camState.assignmentId + '/' + menuId)
        .done(function (response) {
            if (response && response.success) {
                var currentMenuIds = camState.editData.menuIds || camState.editData.MenuIds || [];
                camState.editData.menuIds = currentMenuIds.filter(function (id) { return parseInt(id, 10) !== menuId; });
                showToast('Menu deleted from assignment.', 2500, { type: 'success', title: 'Deleted' });
                refreshCamMenuSummary();
                loadCamHistory();
            } else {
                showToast('Unable to delete menu.', 3000, { type: 'error', title: 'Delete failed' });
            }
        }).fail(function () {
            showToast('Unable to delete menu.', 3000, { type: 'error', title: 'Delete failed' });
        }).always(function () {
            setCamButtonLoading($(button), false);
            $(button).prop('disabled', false);
        });
}

function loadCamEditAssignment() {
    if (!camState.assignmentId) return;

    $.getJSON('/Admin/Chef/assignment/get/' + camState.assignmentId).done(function (assignment) {
        camState.editData = assignment;
        $('#camSelectionTitle').text('Edit Menu Assignment');
        setCamDateValue($('#camEventDate'), assignment.eventDate || assignment.EventDate);
        setCamDateDisabled($('#camEventDate'), true);
        loadCamOrders(String(assignment.eventDate || assignment.EventDate).slice(0, 10));
    });
}

function toggleCamHistory(show) {
    var $card = $('#camHistoryCard');
    var shouldShow = typeof show === 'boolean' ? show : $card.hasClass('hidden');
    $card.toggleClass('hidden', !shouldShow);
    if (shouldShow) {
        loadCamHistory(true);
        $('html, body').animate({ scrollTop: $card.offset().top - 90 }, 180);
    }
}

function loadCamHistory(showButtonLoader) {
    var chefId = parseInt($('#camChefId').val(), 10) || 0;
    if (!chefId) return;
    if (showButtonLoader) setCamButtonLoading($('#camHistoryBtn'), true, 'Loading...');
    $('#camHistoryList').html('<div class="cam-history-empty">Loading assignments...</div>');
    $.getJSON('/Admin/Chef/assignment/list/' + chefId).done(function (items) {
        renderCamHistory(Array.isArray(items) ? items : []);
    }).fail(function () {
        $('#camHistoryList').html('<div class="cam-history-empty">Unable to load assigned menus.</div>');
    }).always(function () {
        if (showButtonLoader) setCamButtonLoading($('#camHistoryBtn'), false);
    });
}

function renderCamHistory(items) {
    if (!items.length) {
        $('#camHistoryList').html('<div class="cam-history-empty">No menus have been assigned to this chef yet.</div>');
        return;
    }
    var html = '';
    items.forEach(function (item) {
        var id = parseInt(item.headerId || item.HeaderId, 10);
        var eventDate = formatCamDisplayDate(item.eventDate || item.EventDate);
        var assignedDate = formatCamDisplayDate(item.createdDate || item.CreatedDate, true);
        var orders = item.orderNumbers || item.OrderNumbers || '-';
        var menus = item.menuNames || item.MenuNames || '-';
        var count = parseInt(item.menuCount || item.MenuCount, 10) || 0;
        var qty = parseInt(item.totalQty || item.TotalQty, 10) || 0;
        html += '<article class="cam-history-item">' +
            '<div class="cam-history-main"><div class="cam-history-dates"><span>Event <strong>' + escapeCamHtml(eventDate) + '</strong></span><span>Assigned <strong>' + escapeCamHtml(assignedDate) + '</strong></span></div>' +
            '<div class="cam-history-orders">' + escapeCamHtml(orders) + '</div><div class="cam-history-menus">' + escapeCamHtml(menus) + '</div>' +
            '<div class="cam-history-badges"><span>' + count + ' menus</span><span>' + qty + ' total qty</span></div></div>' +
            '<div class="cam-history-actions"><a class="btn btn-sm cam-btn-edit" href="/Admin/Chef/AssignMenus/' + ($('#camChefId').val()) + '?assignmentId=' + id + '"><i class="fa-solid fa-pen-to-square"></i> View / Edit</a>' +
            '<a class="btn btn-sm cam-btn-pdf" href="/Admin/Chef/assignment/pdf/' + id + '"><i class="fa-solid fa-file-pdf"></i> PDF</a>' +
            '<button type="button" class="btn btn-sm cam-btn-email" onclick="sendCamHistoryEmail(' + id + ', this)"><i class="fa-solid fa-envelope"></i> Email</button>' +
            '<button type="button" class="btn btn-sm cam-btn-whatsapp" onclick="sendCamHistoryWhatsApp(' + id + ', this)"><i class="fa-brands fa-whatsapp"></i> WhatsApp</button></div></article>';
    });
    $('#camHistoryList').html(html);
}

function sendCamHistoryEmail(headerId, button) {
    if (!validateCamChefContacts(false, true)) return;
    sendCamEmail(headerId, button);
}

function openCamSendModal(headerId) {
    camState.pendingHeaderId = parseInt(headerId, 10) || 0;
    if (!camState.pendingHeaderId) return;
    $('#camSendModal').removeClass('hidden');
    $('body').addClass('cam-modal-open');
}

function closeCamSendModal() {
    if ($('#camSendModal .is-loading').length) return;
    $('#camSendModal').addClass('hidden');
    $('body').removeClass('cam-modal-open');
}

function sendCamSavedAssignment(channel, button) {
    var headerId = camState.pendingHeaderId;
    if (!headerId) return;
    var needsEmail = channel === 'email' || channel === 'both';
    var needsWhatsApp = channel === 'whatsapp' || channel === 'both';
    if (!validateCamChefContacts(needsWhatsApp, needsEmail)) return;

    var $button = $(button);
    $('#camSendModal .cam-send-option, #camSendModal .cam-send-later').prop('disabled', true);
    setCamButtonLoading($button, true, channel === 'both' ? 'Sending both...' : (needsEmail ? 'Sending email...' : 'Opening WhatsApp...'));

    if (needsWhatsApp) {
        var whatsappWindow = window.open('about:blank', '_blank');
        downloadCamAssignmentPdf(headerId);
        sendCamWhatsApp(whatsappWindow);
    }

    if (needsEmail) {
        $.post('/Admin/Chef/assignment/email/' + headerId)
            .done(function (response) {
                showToast((response && response.message) || 'Assignment PDF emailed to chef.', 2800, { type: 'success', title: channel === 'both' ? 'Sent successfully' : 'Email sent' });
                finishCamSendModal($button);
            })
            .fail(function (xhr) {
                showToast((xhr.responseJSON && xhr.responseJSON.message) || 'Unable to send chef email.', 3200, { type: 'error', title: 'Email failed' });
                resetCamSendModalButtons($button);
            });
    } else {
        window.setTimeout(function () {
            showToast('PDF downloaded and chef WhatsApp opened.', 2800, { type: 'success', title: 'WhatsApp ready' });
            finishCamSendModal($button);
        }, 600);
    }
}

function finishCamSendModal($button) {
    setCamButtonLoading($button, false);
    $('#camSendModal .cam-send-option, #camSendModal .cam-send-later').prop('disabled', false);
    $('#camSendModal').addClass('hidden');
    $('body').removeClass('cam-modal-open');
    camState.pendingHeaderId = 0;
}

function resetCamSendModalButtons($button) {
    setCamButtonLoading($button, false);
    $('#camSendModal .cam-send-option, #camSendModal .cam-send-later').prop('disabled', false);
}

function sendCamHistoryWhatsApp(headerId, button) {
    if (!validateCamChefContacts(true, false)) return;
    setCamButtonLoading($(button), true, 'Opening...');
    var whatsappWindow = window.open('about:blank', '_blank');
    downloadCamAssignmentPdf(headerId);
    sendCamWhatsApp(whatsappWindow);
    window.setTimeout(function () { setCamButtonLoading($(button), false); }, 500);
}

function sendCamEmail(headerId, button) {
    var $button = button ? $(button) : $();
    setCamButtonLoading($button, true, 'Sending...');
    $.post('/Admin/Chef/assignment/email/' + headerId)
        .done(function (response) { showToast((response && response.message) || 'Assignment PDF emailed to chef.', 2500, { type: 'success', title: 'Email sent' }); })
        .fail(function (xhr) { showToast((xhr.responseJSON && xhr.responseJSON.message) || 'Unable to send chef email.', 3000, { type: 'error', title: 'Email' }); })
        .always(function () {
            setCamButtonLoading($button, false);
            if ($button.attr('id') === 'camSaveSendBtn') $('#camSaveSendBtn').prop('disabled', false);
        });
}

function sendCamWhatsApp(targetWindow) {
    var phone = String($('#camChefMobile').val() || '').replace(/[^0-9]/g, '');
    if (!phone) {
        if (targetWindow) targetWindow.close();
        showToast('Chef WhatsApp number is not available.', 3000, { type: 'error', title: 'WhatsApp' });
        return;
    }
    var whatsappUrl = 'https://wa.me/' + encodeURIComponent(phone);
    if (targetWindow) targetWindow.location.href = whatsappUrl;
    else window.open(whatsappUrl, '_blank', 'noopener');
}

function downloadCamAssignmentPdf(headerId) {
    var iframe = document.createElement('iframe');
    iframe.className = 'cam-download-frame';
    iframe.src = '/Admin/Chef/assignment/pdf/' + encodeURIComponent(headerId);
    document.body.appendChild(iframe);
    window.setTimeout(function () { iframe.remove(); }, 60000);
}

function validateCamChefContacts(requireMobile, requireEmail) {
    var missing = [];
    if (requireMobile && !String($('#camChefMobile').val() || '').replace(/[^0-9]/g, '')) missing.push('WhatsApp number');
    if (requireEmail && !String($('#camChefEmail').val() || '').trim()) missing.push('email ID');
    if (!missing.length) return true;
    showToast('Chef ' + missing.join(' and ') + ' is not available. Please update Chef Master first.', 3500, { type: 'error', title: 'Contact required' });
    return false;
}

function setCamButtonLoading($button, loading, text) {
    if (!$button || !$button.length) return;
    if (loading) {
        if (!$button.data('cam-original-html')) $button.data('cam-original-html', $button.html());
        $button.prop('disabled', true).addClass('is-loading')
            .html('<span class="cam-btn-spinner" aria-hidden="true"></span><span>' + escapeCamHtml(text || 'Please wait...') + '</span>');
    } else {
        var original = $button.data('cam-original-html');
        if (original) $button.html(original).removeData('cam-original-html');
        $button.prop('disabled', false).removeClass('is-loading');
    }
}

function formatCamDisplayDate(value, includeTime) {
    if (!value) return '-';
    var date = new Date(value);
    if (isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        (includeTime ? ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');
}

function applyCamEditValues() {
    if (!camState.editData) return;
    (camState.editData.menuIds || camState.editData.MenuIds || []).forEach(function (menuId) {
        var id = parseInt(menuId, 10);
        var checkbox = $('.cam-menu-check[data-menu-id="' + id + '"]');
        if (checkbox.length) {
            checkbox.prop('checked', true);
            checkbox.closest('tr').addClass('cam-menu-row-selected');
        }
    });
    updateCamFooter();
}

function setCamDateValue($input, value) {
    var normalized = value ? String(value).slice(0, 10) : '';
    var input = $input.get(0);
    if (input && input._flatpickr) input._flatpickr.setDate(normalized, false, 'Y-m-d');
    else $input.val(normalized);
}

function setCamDateDisabled($input, disabled) {
    var input = $input.get(0);
    $input.prop('disabled', disabled).toggleClass('cam-input-locked', disabled);

    if (input && input._flatpickr) {
        input._flatpickr.altInput.disabled = disabled;
        input._flatpickr.altInput.readOnly = disabled;
        $(input._flatpickr.altInput).toggleClass('cam-input-locked', disabled);
        input._flatpickr.set('clickOpens', !disabled);
    }
}

function escapeCamHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
