var kitchenActiveTab = 'queue';
var kitchenQueueOrders = [];
var kitchenReadyOrders = [];
var kitchenSearchTerms = {
    queue: '',
    ready: ''
};

$(document).ready(function () {
    setKitchenDatesToToday();
    bindKitchenDateValidation();

    loadKitchenOrders(1);
    loadKitchenOrders(2);
    bindKitchenSearchInputs();
    updateKitchenSearchVisibility();
});

function openKitchenTab(tab) {
    kitchenActiveTab = tab === 'ready' ? 'ready' : 'queue';
    updateKitchenSearchVisibility();

    if (kitchenActiveTab === 'ready') {
        loadKitchenOrders(2);
        return;
    }

    loadKitchenOrders(1);
}

function setKitchenDatesToToday() {
    var today = new Date();
    var todayValue = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    var fromInput = document.getElementById('kitchenFromDate');
    var toInput = document.getElementById('kitchenToDate');

    $('#kitchenFromDate').val(todayValue);
    $('#kitchenToDate').val(todayValue);

    if (fromInput && fromInput._flatpickr) {
        fromInput._flatpickr.setDate(todayValue, true, 'Y-m-d');
    }

    if (toInput && toInput._flatpickr) {
        toInput._flatpickr.setDate(todayValue, true, 'Y-m-d');
    }

    syncKitchenDateLimits();
}

function applyKitchenFilter() {
    if (!ensureKitchenValidDateRange(true)) {
        return;
    }

    if (kitchenActiveTab === 'ready') {
        loadKitchenOrders(2);
        return;
    }

    loadKitchenOrders(1);
}

function resetKitchenFilter() {
    setKitchenDatesToToday();
    ensureKitchenValidDateRange(false);
    if (kitchenActiveTab === 'ready') {
        loadKitchenOrders(2);
        return;
    }

    loadKitchenOrders(1);
}

function bindKitchenDateValidation() {
    $('#kitchenFromDate').on('change', function () {
        syncKitchenDateLimits();
        ensureKitchenValidDateRange(true, 'from');
    });

    $('#kitchenToDate').on('change', function () {
        syncKitchenDateLimits();
        ensureKitchenValidDateRange(true, 'to');
    });
}

function syncKitchenDateLimits() {
    var fromDate = String($('#kitchenFromDate').val() || '').trim();
    var toDate = String($('#kitchenToDate').val() || '').trim();
    var fromParsed = parseKitchenInputDate(fromDate);
    var toParsed = parseKitchenInputDate(toDate);
    var fromInput = document.getElementById('kitchenFromDate');
    var toInput = document.getElementById('kitchenToDate');

    if (fromDate) {
        $('#kitchenToDate').attr('min', fromDate);
    } else {
        $('#kitchenToDate').removeAttr('min');
    }

    if (toDate) {
        $('#kitchenFromDate').attr('max', toDate);
    } else {
        $('#kitchenFromDate').removeAttr('max');
    }

    // If flatpickr is active, enforce limits at picker level too.
    if (toInput && toInput._flatpickr) {
        toInput._flatpickr.set('minDate', fromParsed || null);
    }

    if (fromInput && fromInput._flatpickr) {
        fromInput._flatpickr.set('maxDate', toParsed || null);
    }
}

function ensureKitchenValidDateRange(showMessage, changedField) {
    var fromDate = String($('#kitchenFromDate').val() || '').trim();
    var toDate = String($('#kitchenToDate').val() || '').trim();
    var fromParsed = parseKitchenInputDate(fromDate);
    var toParsed = parseKitchenInputDate(toDate);

    if (!fromDate || !toDate) {
        return true;
    }

    if (!fromParsed || !toParsed) {
        return true;
    }

    if (fromParsed.getTime() <= toParsed.getTime()) {
        return true;
    }

    if (String(changedField || '').toLowerCase() === 'to') {
        $('#kitchenToDate').val(fromDate);
    } else {
        $('#kitchenFromDate').val(toDate);
    }

    syncKitchenDateLimits();

    if (showMessage && window.showToast) {
        showToast('To Date cannot be earlier than From Date.', 3200, {
            type: 'warning',
            title: 'Invalid date range'
        });
    }

    return false;
}

function parseKitchenInputDate(value) {
    var raw = String(value || '').trim();
    if (!raw) return null;

    // Native date input value format: yyyy-mm-dd
    var iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
        return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    }

    // Rich picker display format: dd-mm-yyyy
    var dmy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dmy) {
        return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    }

    var parsed = new Date(raw);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function bindKitchenSearchInputs() {
    $('#kitchenQueueSearch').on('input', function () {
        kitchenSearchTerms.queue = String($(this).val() || '');
        if (kitchenActiveTab === 'queue') {
            renderKitchenBoard();
        }
    });

    $('#kitchenReadySearch').on('input', function () {
        kitchenSearchTerms.ready = String($(this).val() || '');
        if (kitchenActiveTab === 'ready') {
            renderKitchenBoard();
        }
    });
}

function updateKitchenSearchVisibility() {
    $('#queueSearchWrap').toggleClass('hidden', kitchenActiveTab !== 'queue');
    $('#readySearchWrap').toggleClass('hidden', kitchenActiveTab !== 'ready');
}

function getKitchenSearchTerm() {
    return String(kitchenSearchTerms[kitchenActiveTab] || '').trim().toLowerCase();
}

function filterKitchenRows(rows) {
    var term = getKitchenSearchTerm();
    if (!term) {
        return Array.isArray(rows) ? rows : [];
    }

    return (Array.isArray(rows) ? rows : []).filter(function (item) {
        var haystack = [
            item.orderDate,
            item.orderNumber,
            item.customerName,
            item.packageName,
            item.eventDate,
            item.mealPeriod,
            item.pax,
            item.location,
            item.deliveryAddress
        ].join(' ').toLowerCase();

        return haystack.indexOf(term) > -1;
    });
}

function renderKitchenBoard() {
    var sourceRows = kitchenActiveTab === 'ready' ? kitchenReadyOrders : kitchenQueueOrders;
    renderKitchenCards(sourceRows || []);
}

function clearKitchenDateInput(inputId) {
    var input = document.getElementById(inputId);
    if (!input) return;

    if (input._flatpickr) {
        input._flatpickr.clear();
        return;
    }

    input.value = '';
}

function markKitchenReady(orderId) {
    showKitchenLoader(true);

    $.ajax({
        url: '/Admin/Orders/UpdateOrderStatus?OrderId=' + orderId + '&Status=2',
        type: 'POST',
        success: function (response) {
            loadKitchenOrders(1);
            loadKitchenOrders(2);
            showToast('Order marked ready for delivery.', 2200, { type: 'success', title: 'Updated' });
        },
        error: function () {
            showToast('Unable to update order status.', 3000, { type: 'error', title: 'Update failed' });
            showKitchenLoader(false);
        }
    });
}

function viewKitchenOrder(orderId) {
    showToast('Order details page will be connected soon.', 2200, { type: 'info', title: 'View Order' });
}

function showKitchenLoader(show) {
    var $panel = $('#kitchenQueueBoard .pageloaderpanel');
    if ($panel.length) {
        $('#kitchenContentWrap').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
    }
}

function loadKitchenOrders(status) {
    var fromDate = $('#kitchenFromDate').val() || '';
    var toDate = $('#kitchenToDate').val() || '';
    var $content = $('#kitchenContent');

    showKitchenLoader(true);

    $.ajax({
        url: '/Admin/Kitchen/GetKitchenQueueOrders?Status=' + status + '&Fromdate=' + encodeURIComponent(fromDate) + '&ToDate=' + encodeURIComponent(toDate),
        type: 'GET',
        dataType: 'json',
        success: function (rows) {
            var list = Array.isArray(rows) ? rows : [];
            if (status === 1) {
                kitchenQueueOrders = list;
            } else if (status === 2) {
                kitchenReadyOrders = list;
            }
            renderKitchenBoard();
        },
        error: function () {
            if (status === 1) {
                kitchenQueueOrders = [];
            } else if (status === 2) {
                kitchenReadyOrders = [];
            }
            renderKitchenBoard();
            showToast('Unable to load kitchen queue orders.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showKitchenLoader(false);
        }
    });
}

function renderKitchenCards(rows) {
    var list = filterKitchenRows(rows || []);
    var queueCount = kitchenQueueOrders.length;
    var readyCount = kitchenReadyOrders.length;
    var html = '' +
        '<div class="kitchen-tabs">' +
            '<button type="button" class="kitchen-tab' + (kitchenActiveTab === 'queue' ? ' active' : '') + '" onclick="openKitchenTab(\'queue\')"><span class="kitchen-tab-icon">🍳</span><span class="kitchen-tab-label">Queue</span><span class="kitchen-tab-count">' + queueCount + '</span></button>' +
            '<button type="button" class="kitchen-tab' + (kitchenActiveTab === 'ready' ? ' active' : '') + '" onclick="openKitchenTab(\'ready\')"><span class="kitchen-tab-icon">🚚</span><span class="kitchen-tab-label">Ready for Delivery</span><span class="kitchen-tab-count">' + readyCount + '</span></button>' +
        '</div>' +
        '<div class="kitchen-grid">';

    for (var i = 0; i < list.length; i++) {
        var item = list[i] || {};
        var isReady = parseInt(item.orderStatus, 10) === 2;
        var orderDate = item.orderDate ?? item.OrderDate;
        var eventDate = item.eventDate ?? item.EventDate;

        html += '' +
            '<article class="kitchen-order-card">' +
                '<div class="kitchen-order-top">' +
                    '<div class="kitchen-order-date">' + escapeKitchenHtml((item.mealPeriod || item.MealPeriod || '').toString().toUpperCase()) + '</div>' +
                    '<span class="kitchen-order-id">' + escapeKitchenHtml(item.orderNumber || '') + '</span>' +
                '</div>' +
                '<h3 class="kitchen-order-title">' + escapeKitchenHtml(item.customerName || '') + '</h3>' +
                '<p class="kitchen-order-meta">' + escapeKitchenHtml(item.packageName || '') + '</p>' +
                '<div class="kitchen-order-dates">' +
                    '<div><strong>Order Date:</strong> ' + escapeKitchenHtml(formatKitchenDate(orderDate)) + '</div>' +
                    '<div><strong>Event Date:</strong> ' + escapeKitchenHtml(formatKitchenDate(eventDate)) + '</div>' +
                '</div>' +
                '<div class="kitchen-order-facts">' +
                    '<span class="kitchen-fact-chip">' + escapeKitchenHtml(parseInt(item.pax, 10) || 0) + ' pax</span>' +
                '</div>' +
                '<div class="kitchen-card-footer">' +
                    '<div class="kitchen-status-pill ' + (isReady ? 'is-ready' : 'is-queue') + '">' + (isReady ? 'Ready for Delivery' : 'In Queue') + '</div>' +
                    '<div class="kitchen-card-actions">' +
                        '<button type="button" class="btn btn-light" onclick="viewOrderDetails(' + (parseInt(item.id, 10) || 0) + ')">View Order</button>' +
                        (isReady ? '' : '<button type="button" class="btn btn-primary" onclick="markKitchenReady(' + (parseInt(item.id, 10) || 0) + ')">Ready for Delivery</button>') +
                    '</div>' +
                '</div>' +
            '</article>';
    }

    if (!list.length) {
        html += '<div class="kitchen-empty">' + (kitchenActiveTab === 'ready' ? 'No orders are ready for delivery yet.' : 'No active queue orders.') + '</div>';
    }

    html += '</div>';
    if ($('#kitchenContent').length) {
        $('#kitchenContent').html(html);
    }
}

function formatKitchenDate(value) {
    
    if (!value) return '';
    var date = new Date(value);
    if (isNaN(date.getTime())) {
        return String(value);
    }

    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function escapeKitchenHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function viewOrderDetails(orderId) {


    orderId = Number(orderId);
    var friendlyOrderError = window.AdminOrderShare && typeof window.AdminOrderShare.sanitizeOrderErrorMessage === 'function'
        ? window.AdminOrderShare.sanitizeOrderErrorMessage
        : function () { return 'Unable to load order details right now. Please try again.'; };

    if (!Number.isInteger(orderId) || orderId <= 0) {
        if (window.showToast) {
            showToast('Invalid order Id.', 3000, { type: 'warning', title: 'View Order' });
        }
        return;
    }

    $.ajax({
        url: '/Admin/ViewOrderDetails/get',
        type: 'GET',
        data: {
            orderId: orderId
        },
        dataType: 'json',
        success: function (response) {
            if (response && response.success) {
                window.location.href = '/Admin/ViewOrderDetails?orderId=' + encodeURIComponent(orderId);
            }
        },
        error: function (xhr) {
            var message = friendlyOrderError(xhr.responseJSON?.message, 'Unable to load order details right now. Please try again.');

            if (window.showToast) {
                showToast(message, 3000, { type: 'error', title: 'View Order' });
            }
        }
    });
}
