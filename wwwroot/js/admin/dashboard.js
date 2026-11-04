var dashboardState = {
    currentFilter: 'all',
    chartMetricMode: 'revenue',
    compareMode: false,
    sourceNote: 'Source: Orders table filtered by CreatedDate range.',
    chartCacheKeyPrefix: 'gayatri.dashboard.chart.cache.'
};
var dashboardHasLoadedOnce = false;

var dashboardCurrencyFormatter = new Intl.NumberFormat('en-SG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

$(function () {
    window.dashboardReOrderInProgress = false;
    window.dashboardReminderInProgress = false;
    window.adminDashboardPaymentContextKey = 'gayatri.admin.dashboardPaymentContext';

    applyDatePreset('today', false);
    bindDashboardDatePresetEvents();
    bindDashboardChartControlEvents();
    bindDashboardQuickFilterEvents();
    applyRoleBasedDashboardPriority();
    $('#chartMetricMode').val(dashboardState.chartMetricMode);
    $('#chartCompareMode').prop('checked', dashboardState.compareMode);

    loadDashboard();
    resumeAdminDashboardPaymentAfterRedirect();

    $("#ordersFromDate, #ordersToDate").on("change", function () {
        validateDateRange();
    });

});

function money(value) {
    value = Number(value) || 0;
    return 'S$' + dashboardCurrencyFormatter.format(value);
}

function formatLocalDateInput(dateObj) {
    var year = dateObj.getFullYear();
    var month = String(dateObj.getMonth() + 1).padStart(2, '0');
    var day = String(dateObj.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function setDashboardDateValue(selector, value) {
    var input = $(selector).get(0);
    if (!input) return;

    if (input._flatpickr) {
        input._flatpickr.setDate(value, false, 'Y-m-d');
    } else {
        $(input).val(value);
    }
}

function getDashboardDateValue(selector) {
    var input = $(selector).get(0);
    if (!input) return '';

    if (input._flatpickr && input._flatpickr.selectedDates && input._flatpickr.selectedDates.length) {
        return formatLocalDateInput(input._flatpickr.selectedDates[0]);
    }

    return String($(input).val() || '').trim();
}

function syncDashboardDateBounds() {
    var fromDate = getDashboardDateValue('#ordersFromDate');
    var toDate = getDashboardDateValue('#ordersToDate');

    var fromInput = $('#ordersFromDate').get(0);
    var toInput = $('#ordersToDate').get(0);

    if (fromInput && fromInput._flatpickr) {
        fromInput._flatpickr.set('maxDate', toDate || null);
    }
    if (toInput && toInput._flatpickr) {
        toInput._flatpickr.set('minDate', fromDate || null);
    }
}

function parseDashboardDate(dateText) {
    var value = String(dateText || '').trim();
    if (!value) return null;

    var parts = value.split('-');
    if (parts.length === 3) {
        var year = Number(parts[0]);
        var month = Number(parts[1]);
        var day = Number(parts[2]);
        if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
            return new Date(year, month - 1, day);
        }
    }

    var parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function applyDatePreset(preset, shouldReload) {
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var end = new Date(start);

    if (preset === 'last7') {
        start.setDate(start.getDate() - 6);
    } else if (preset === 'thisMonth') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (preset === 'lastMonth') {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    setDashboardDateValue('#ordersFromDate', formatLocalDateInput(start));
    setDashboardDateValue('#ordersToDate', formatLocalDateInput(end));
    syncDashboardDateBounds();

    $('.dashboard-preset-btn').removeClass('active');
    $('.dashboard-preset-btn[data-preset="' + preset + '"]').addClass('active');

    updateDashboardRangeLabel();
    if (shouldReload !== false) {
        loadDashboard();
    }
}

function bindDashboardDatePresetEvents() {
    $(document).on('click', '.dashboard-preset-btn', function () {
        applyDatePreset(String($(this).data('preset') || 'today'), true);
    });
}

function bindDashboardChartControlEvents() {
    $('#chartMetricMode').on('change', function () {
        dashboardState.chartMetricMode = String($(this).val() || 'revenue');
        loadDashboard();
    });

    $('#chartCompareMode').on('change', function () {
        dashboardState.compareMode = $(this).is(':checked');
        loadDashboard();
    });
}

function bindDashboardQuickFilterEvents() {
    $(document).on('click', '.dashboard-filter-chip', function () {
        var next = String($(this).data('filter') || 'all').toLowerCase();
        dashboardState.currentFilter = next;
        $('.dashboard-filter-chip').removeClass('active');
        $(this).addClass('active');
        renderDashboard(orders);
    });
}

function applyRoleBasedDashboardPriority() {
    var roleName = String($('#navProfileRole').text() || '').trim().toLowerCase();
    if (!roleName) return;

    var $cards = $('.stats-grid .stat-link');
    if (!$cards.length) return;

    function moveCard(selector) {
        var $card = $cards.find(selector).closest('.stat-link');
        if ($card.length) {
            $('.stats-grid').prepend($card);
        }
    }

    if (roleName.indexOf('finance') > -1) {
        moveCard('#kpiOutstanding');
        moveCard('#kpiActive');
        moveCard('#kpiRevenue');
        return;
    }

    if (roleName.indexOf('kitchen') > -1) {
        moveCard('#kpiOrders');
        moveCard('#kpiOutstanding');
        return;
    }

    if (roleName.indexOf('logistics') > -1 || roleName.indexOf('driver') > -1) {
        moveCard('#kpiLogistics');
        moveCard('#kpiOrders');
    }
}

function updateDashboardRangeLabel() {
    var fromDate = getDashboardDateValue('#ordersFromDate');
    var toDate = getDashboardDateValue('#ordersToDate');
    var text = 'Range: ' + (fromDate || '-') + ' to ' + (toDate || '-');
    $('#dashboardRangeLabel').text(text);
}

function updateDashboardLastUpdatedLabel(serverUtcText) {
    var utcDate = serverUtcText ? new Date(serverUtcText) : new Date();
    var label = isNaN(utcDate.getTime()) ? new Date() : utcDate;
    $('#dashboardLastUpdated').text('Last updated: ' + label.toLocaleString('en-SG'));
}

function validateDateRange() {

    var fromDate = getDashboardDateValue('#ordersFromDate');
    var toDate = getDashboardDateValue('#ordersToDate');

    if (!fromDate && !toDate)
        return;

    if (!fromDate && toDate) {
        setDashboardDateValue('#ordersFromDate', toDate);
        fromDate = toDate;
    }

    if (fromDate && !toDate) {
        setDashboardDateValue('#ordersToDate', fromDate);
        toDate = fromDate;
    }

    var fromDateObj = parseDashboardDate(fromDate);
    var toDateObj = parseDashboardDate(toDate);

    if (fromDateObj && toDateObj && fromDateObj > toDateObj) {

        showToast("From date was later than To date. It has been auto-corrected.", 3200, {
            type: "warning",
            title: "Invalid Date"
        });

        setDashboardDateValue('#ordersToDate', fromDate);
    }

    syncDashboardDateBounds();
    updateDashboardRangeLabel();
    loadDashboard();
}

function getDashboardReOrderButtonHtml() {
    return '<span class="action-icon action-icon-text" aria-hidden="true">&#8635;</span><span class="dashboard-action-label">Re Order</span>';
}

function getStatusActionText(status) {
    if (Number(status) === 1) return '<span class="action-icon action-icon-text" aria-hidden="true">&#127859;</span><span class="dashboard-action-label">Send to Kitchen</span>';
    if (Number(status) === 7) return '<span class="action-icon action-icon-text" aria-hidden="true">&#10005;</span><span class="dashboard-action-label">Cancel</span>';
    return 'Update Status';
}

function displayDate(value) {
    if (!value) return '-';
    var date = new Date(value);
    return isNaN(date.getTime()) ? value : date.toLocaleDateString('en-CA');
}

function escapeHtml(value) {
    return $('<div>').text(value ?? '').html();
}

var orders = [];

function matchesDashboardQuickFilter(orderItem) {
    var filter = String(dashboardState.currentFilter || 'all').toLowerCase();
    if (filter === 'all') return true;

    var orderStatus = Number(orderItem.orderStatus ?? orderItem.OrderStatus ?? 0);
    var paymentStatus = Number(orderItem.paymentStatus ?? orderItem.PaymentStatus ?? 0);

    if (filter === 'pending') return orderStatus === 0;
    if (filter === 'amended') return orderStatus === 8;
    if (filter === 'paid') return paymentStatus === 2;
    if (filter === 'partially-paid') return paymentStatus === 1;
    return true;
}

function renderDashboard(rows) {

    orders = Array.isArray(rows) ? rows : [];
    var visibleOrders = orders.filter(matchesDashboardQuickFilter);

    var html = '<table class="tbl" id="recentOrdersTable" data-page-size="10"><thead><tr><th class="sortable">#</th><th class="sortable">Order No / Date</th><th class="sortable">Customer</th><th class="sortable">Event Schedule</th><th class="sortable">Package / Pax</th><th class="sortable">Status</th><th class="sortable">Payment</th><th class="sortable">Amount</th><th>Actions</th></tr></thead><tbody>';
    visibleOrders.forEach(function (o, index) {
        var serial = index + 1;
        var orderDate = o.createdDate || o.CreatedDate || o.orderDate || o.OrderDate || null;
        var eventDate = o.eventDate || o.EventDate || null;
        var orderStatus = Number(o.orderStatus ?? o.OrderStatus ?? 0);
        var paymentStatus = Number(o.paymentStatus ?? o.PaymentStatus ?? 0);
        var paymentStatusLabel = 'Pending';
        var orderStatusLabel = 'Unknown';
        var orderStatusBadge = 'badge-unknown';

        var paidAmount = Number(o.paidAmount ?? o.PaidAmount) || 0;
        var totalAmount = Number(o.totalAmount ?? o.TotalAmount) || 0;
        var balanceAmount = Math.max(0, totalAmount - paidAmount);
        var refundDue = Math.max(0, paidAmount - totalAmount);

        if (paymentStatus === 1) {
            paymentStatusLabel = 'Partially Paid';
        } else if (paymentStatus === 2) {
            paymentStatusLabel = 'Paid';
        }
        if (refundDue > 0) {
            paymentStatusLabel = 'Refund Due';
        }

        if (orderStatus == 0) {
            orderStatusLabel = 'Pending';
            orderStatusBadge = 'badge-pending';
        }
        else if (orderStatus == 1) {
            orderStatusLabel = 'In Kitchen';
            orderStatusBadge = 'badge-in-kitchen';
        }
        else if (orderStatus == 2) {
            orderStatusLabel = 'Ready for Delivery';
            orderStatusBadge = 'badge-ready-for-delivery';
        }
        else if (orderStatus == 3) {
            orderStatusLabel = 'Out for delivery';
            orderStatusBadge = 'badge-assigned-for-driver';
        }
        else if (orderStatus == 4) {
            orderStatusLabel = 'Delivered';
            orderStatusBadge = 'badge-delivered';
        }
        else if (orderStatus == 5) {
            orderStatusLabel = 'Quotation';
            orderStatusBadge = 'badge-quotation';
        }
        else if (orderStatus == 6) {
            orderStatusLabel = 'Quotation to Order';
            orderStatusBadge = 'badge-quotation-to-order';
        }
        else if (orderStatus == 7) {
            orderStatusLabel = 'Cancelled';
            orderStatusBadge = 'badge-cancelled';
        }
        else if (orderStatus == 8) {
            orderStatusLabel = 'Amended';
            orderStatusBadge = 'badge-amended';
        }

        var actionItems = '';
        actionItems += '<button type="button" class="action-item dashboard-action-view" onclick="dashboardViewOrder(' + o.id + ')">' +
            '<span class="action-icon action-icon-text" aria-hidden="true">&#128065;</span><span class="dashboard-action-label">View</span></button>';
        if (balanceAmount > 0 && orderStatus != 2 && orderStatus != 3 && orderStatus != 4 && orderStatus != 7 && orderStatus != 8) {
            actionItems += '<button type="button" class="action-item dashboard-action-payment" onclick="dashboardPayBalance(this, ' + o.id + ')">' +
                '<span class="action-icon action-icon-text" aria-hidden="true">&#128179;</span><span class="dashboard-action-label">Pay Balance</span></button>';
        }

        if (orderStatus != 7 && orderStatus != 8 && (paymentStatus === 0 || paymentStatus === 1)) {
            actionItems += '<button type="button" class="action-item dashboard-action-reminder" onclick="dashboardReminder(' + o.id + ')">' +
                '<span class="action-icon action-icon-text" aria-hidden="true">&#128276;</span><span class="dashboard-action-label">Send Reminder</span></button>';
        }

        if (orderStatus == 0) {
            actionItems += '<button type="button" class="action-item dashboard-action-kitchen" onclick="dashboardUpdateStatus(this, ' + o.id + ', 1)">' +
                '<span class="action-icon action-icon-text" aria-hidden="true">&#127859;</span><span class="dashboard-action-label">Send to Kitchen</span></button>';
        }
        if (orderStatus != 1 && orderStatus != 2 && orderStatus != 3 && orderStatus != 4 && orderStatus != 7 && orderStatus != 8) {
            actionItems += '<button type="button" class="action-item dashboard-action-cancel" onclick="dashboardUpdateStatus(this, ' + o.id + ', 7)">' +
                '<span class="action-icon action-icon-text" aria-hidden="true">&#10005;</span><span class="dashboard-action-label">Cancel</span></button>';
            actionItems += '<button type="button" class="action-item dashboard-action-amendment" onclick="dashboardAmendment(' + o.id + ')">' +
                '<span class="action-icon action-icon-text" aria-hidden="true">&#9998;</span><span class="dashboard-action-label">Amendment</span></button>';
        }
        actionItems += '<button type="button" class="action-item dashboard-action-reorder" onclick="dashboardReOrder(this, ' + o.id + ')">' +
            getDashboardReOrderButtonHtml() + '</button>';
        actionItems += '<button type="button" class="action-item dashboard-action-wa" onclick="dashboardWhatsapp(this, ' + o.id + ')">' +
            '<span class="action-icon action-icon-text" aria-hidden="true">&#128172;</span><span class="dashboard-action-label">WhatsApp</span></button>';
        actionItems += '<button type="button" class="action-item dashboard-action-email" onclick="dashboardEmail(this, ' + o.id + ')">' +
            '<span class="action-icon action-icon-text" aria-hidden="true">&#9993;</span><span class="dashboard-action-label">Email</span></button>';
        actionItems += '<button type="button" class="action-item dashboard-action-download" onclick="dashboardDownload(this, ' + o.id + ')">' +
            '<span class="action-icon action-icon-text" aria-hidden="true">&#8681;</span><span class="dashboard-action-label">Download</span></button>';

        html += '<tr data-order-id="' + Number(o.id || 0) + '">' +
            '<td>' + serial + '</td>' +
            '<td><button type="button" class="dashboard-order-ref-link" onclick="dashboardViewOrder(' + o.id + ')">' + escapeHtml(o.orderNumber || ('#' + o.id)) + '</button><div class="muted">' + displayDate(orderDate) + '</div></td>' +

            '<td><strong>' + escapeHtml(o.customerName || o.CustomerName || '-') + '</strong>' +
            '<div class="muted">' + escapeHtml(o.mobileNo || o.MobileNo || '-') + ' &bull; ' + escapeHtml(o.emailId || o.EmailId || '-') + '</div></td>' +

            '<td>' + displayDate(eventDate) +
            '<div class="muted">' + escapeHtml(o.mealPeriodName || o.MealPeriodName || '-') + '</div></td>' +

            '<td>' + escapeHtml(o.packageName || o.PackageName || '-') +
            '<div class="muted">Pax: ' + escapeHtml(o.pax || o.Pax || 0) + ' &bull; ' + escapeHtml(o.locationName || o.LocationName || '-') + '</div></td>' +

            '<td><span class="badge ' +
            orderStatusBadge +
            '">' + escapeHtml(orderStatusLabel) + '</span></td>' +

            '<td><span class="badge ' +
            (refundDue > 0 ? 'badge-refund-due' : paymentClass(paymentStatus)) +
            '">' + escapeHtml(paymentStatusLabel) +
            '</span><div class="muted">Paid ' +
            money(paidAmount) +
            '</div>' + (refundDue > 0 ? '<div class="muted orders-refund-due-text">Refund Due ' + money(refundDue) + '</div>' : '') + '</td>' +

            '<td class="num"><strong>' +
            money(o.totalAmount) +
            '</strong></td>' +

            '<td><div class="row-actions dashboard-row-actions">' +
            '<button type="button" class="dots-btn" title="Actions">&#8943;</button>' +
            '<div class="actions-menu hidden">' + actionItems + '</div>' +
            '</div></td>' +

            '</tr>';
    });
    html += '</tbody></table>';
    $('#recentOrders').html(html);

    if (typeof renderDataTable === 'function') {
        renderDataTable('recentOrdersTable');
    }
}

function paymentClass(payment) {
    if (payment === 2) return 'badge-paid';
    if (payment === 1) return 'badge-partially-paid';
    return 'badge-unpaid';
}

function dashboardViewOrder(orderId) {
    orderId = Number(orderId);

    if (!orderId || !Number.isInteger(orderId)) {
        showToast('Invalid order Id.', 3000, { type: 'warning', title: 'View Order' });
        return;
    }

    viewOrderDetails(orderId);
}

function dashboardPayBalance(buttonElement, orderId, skipConfirm) {
    if (!skipConfirm && window.confirmAdminAction) {
        window.confirmAdminAction({
            title: 'Pay Balance',
            message: 'Open the payment popup for this order\'s outstanding balance?',
            confirmText: 'Proceed to Payment'
        }).then(function (confirmed) {
            if (confirmed) dashboardPayBalance(buttonElement, orderId, true);
        });
        return;
    }

    var button = $(buttonElement);
    orderId = Number(orderId);

    if (button.prop('disabled') || window.dashboardReOrderInProgress) return;

    var selectedOrder = orders.find(function (order) {
        return Number(order.id ?? order.Id) === orderId;
    });

    if (!selectedOrder) {
        showToast('Unable to find the selected order. Please refresh and try again.', 3500, {
            type: 'warning',
            title: 'Pay Balance'
        });
        return;
    }

    var totalAmount = Number(selectedOrder.totalAmount ?? selectedOrder.TotalAmount) || 0;
    var paidAmount = Number(selectedOrder.paidAmount ?? selectedOrder.PaidAmount) || 0;
    var balanceAmount = Math.max(0, totalAmount - paidAmount);

    if (balanceAmount <= 0) {
        showToast('This order is already fully paid.', 3000, {
            type: 'info',
            title: 'Pay Balance'
        });
        loadDashboard();
        return;
    }

    window.dashboardReOrderInProgress = true;
    button.prop('disabled', true).html('Opening...');
    openAdminDashboardPayment({
        orderId: orderId,
        orderNumber: String(selectedOrder.orderNumber ?? selectedOrder.OrderNumber ?? '').trim(),
        customerName: String(selectedOrder.customerName ?? selectedOrder.CustomerName ?? '').trim(),
        email: String(selectedOrder.emailId ?? selectedOrder.EmailId ?? '').trim(),
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        balanceAmount: balanceAmount,
        savedAt: Date.now()
    });
}

function dashboardUpdateStatus(buttonElement, orderId, status, skipConfirm) {
    if (Number(status) === 1 && !skipConfirm && window.confirmAdminAction) {
        window.confirmAdminAction({
            title: 'Send to Kitchen',
            message: 'Send this order to the kitchen now?',
            confirmText: 'Send to Kitchen'
        }).then(function (confirmed) {
            if (confirmed) dashboardUpdateStatus(buttonElement, orderId, status, true);
        });
        return;
    }

    if (Number(status) === 7 && !skipConfirm && window.confirmAdminAction) {
        window.confirmAdminAction({
            title: 'Cancel Order',
            message: 'Cancel this order? This will update the status and send the cancellation email.',
            confirmText: 'Cancel Order',
            danger: true
        }).then(function (confirmed) {
            if (confirmed) dashboardUpdateStatus(buttonElement, orderId, status, true);
        });
        return;
    }

    var button = $(buttonElement);
    if (button.prop('disabled')) return;

    orderId = Number(orderId);
    status = Number(status);

    if (status === 7 && window.OrderRefund && typeof window.OrderRefund.open === 'function') {
        window.OrderRefund.open(orderId);
        return;
    }

    var defaultText = getStatusActionText(status);
    var busyText = status === 7 ? 'Cancelling...' : 'Updating...';
    var successTitle = status === 7 ? 'Order cancelled' : 'Status updated';
    var failedMessage = status === 7 ? 'Unable to cancel order.' : 'Unable to update order status.';

    if (!orderId || !Number.isInteger(status)) {
        showToast('Invalid order status request.', 3000, { type: 'error', title: 'Update failed' });
        return;
    }

    button.prop('disabled', true).text(busyText);
    $.ajax({
        url: '/Admin/Orders/UpdateOrderStatus?OrderId=' + encodeURIComponent(orderId) + '&Status=' + encodeURIComponent(status),
        type: 'POST',
        success: async function (response) {
            if (response?.success) {
                showToast(response.message || 'Order status updated.', 3000, { type: 'success', title: successTitle });
                if (status === 7 && window.AdminOrderShare && typeof window.AdminOrderShare.sendOrderEmail === 'function') {
                    try {
                        await window.AdminOrderShare.sendOrderEmail(orderId, { useInvoicePdf: true });
                    } catch (error) {
                        showToast(error.message || 'Order was cancelled, but the cancellation email could not be sent.', 4000, {
                            type: 'warning',
                            title: 'Email not sent'
                        });
                    }
                }
                loadDashboard();
            } else {
                showToast(response?.message || failedMessage, 3500, { type: 'error', title: 'Update failed' });
                button.prop('disabled', false).html(defaultText);
            }
        },
        error: function (xhr) {
            showToast(xhr.responseJSON?.message || failedMessage, 3500, { type: 'error', title: 'Update failed' });
            button.prop('disabled', false).html(defaultText);
        }
    });
}

function dashboardReOrder(buttonElement, orderId, skipConfirm) {
    if (!skipConfirm && window.confirmAdminAction) {
        window.confirmAdminAction({
            title: 'Re Order',
            message: 'Create a new re-order from this order and open payment?',
            confirmText: 'Create Re Order'
        }).then(function (confirmed) {
            if (confirmed) dashboardReOrder(buttonElement, orderId, true);
        });
        return;
    }

    var button = $(buttonElement);
    if (button.prop('disabled') || window.dashboardReOrderInProgress) return;

    orderId = Number(orderId);

    if (!orderId || !Number.isInteger(orderId)) {
        showToast('Invalid order Id for Re Order.', 3000, { type: 'warning', title: 'Re Order' });
        return;
    }

    window.dashboardReOrderInProgress = true;
    button.prop('disabled', true).html('Creating...');
    $.ajax({
        url: '/Admin/Orders/CreateReOrder?OrderId=' + encodeURIComponent(orderId),
        type: 'POST',
        success: function (response) {
            if (response?.success) {
                showToast(response.message || 'Order created successfully.', 3000, { type: 'success', title: 'Re Order' });
                openAdminDashboardPayment({
                    orderId: Number(response.orderId) || 0,
                    orderNumber: response.orderNumber || '',
                    email: response.email || '',
                    totalAmount: Number(response.totalAmount) || 0
                });
            } else {
                showToast(response?.message || 'Unable to create re order.', 3500, { type: 'error', title: 'Re Order failed' });
                window.dashboardReOrderInProgress = false;
                button.prop('disabled', false).html(getDashboardReOrderButtonHtml());
            }
        },
        error: function (xhr) {
            showToast(xhr.responseJSON?.message || 'Unable to create re order.', 3500, { type: 'error', title: 'Re Order failed' });
            window.dashboardReOrderInProgress = false;
            button.prop('disabled', false).html(getDashboardReOrderButtonHtml());
        }
    });
}

function dashboardAmendment(orderId, skipConfirm) {
    if (!skipConfirm && window.confirmAdminAction) {
        window.confirmAdminAction({
            title: 'Amendment',
            message: 'Open this order for amendment?',
            confirmText: 'Open Amendment'
        }).then(function (confirmed) {
            if (confirmed) dashboardAmendment(orderId, true);
        });
        return;
    }

    orderId = Number(orderId);

    if (!orderId || !Number.isInteger(orderId)) {
        showToast('Invalid order Id for Amendment.', 3000, { type: 'warning', title: 'Amendment' });
        return;
    }

    $.ajax({
        url: '/Admin/ViewOrderDetails/get',
        type: 'GET',
        data: { orderId: orderId },
        success: function (response) {
            if (!response || !response.success || !response.details) {
                showToast('Unable to load order details.', 3000, { type: 'error', title: 'Amendment' });
                return;
            }

            var selectedOrder = orders.find(function (item) {
                return Number(item.id ?? item.Id) === orderId;
            }) || {};
            var orderHeader = response.details.order || response.details.Order || {};

            sessionStorage.setItem('gayatri.amendmentOrder', JSON.stringify({
                orderId: orderId,
                paidAmount: Number(selectedOrder.paidAmount ?? selectedOrder.PaidAmount ?? orderHeader.paidAmount ?? orderHeader.PaidAmount) || 0,
                paymentStatus: Number(selectedOrder.paymentStatus ?? selectedOrder.PaymentStatus ?? orderHeader.paymentStatus ?? orderHeader.PaymentStatus) || 0,
                details: response.details
            }));
            window.location.href = '/Customer/Order?amendmentOrderId=' + encodeURIComponent(orderId);
        },
        error: function (xhr) {
            showToast(xhr.responseJSON?.message || 'Unable to load order details.', 3000, { type: 'error', title: 'Amendment' });
        }
    });
}

function dashboardWhatsapp(buttonElement, orderId, skipConfirm) {
    if (!skipConfirm && window.confirmAdminAction) {
        window.confirmAdminAction({
            title: 'WhatsApp',
            message: 'Open WhatsApp share for this order?',
            confirmText: 'Open WhatsApp'
        }).then(function (confirmed) {
            if (confirmed) dashboardWhatsapp(buttonElement, orderId, true);
        });
        return;
    }

    orderId = Number(orderId);

    if (!orderId || !Number.isInteger(orderId)) {
        showToast('Invalid order Id for WhatsApp.', 3000, { type: 'warning', title: 'WhatsApp' });
        return;
    }

    window.AdminOrderShare.prepareWhatsappShare(orderId, { button: buttonElement, busyText: 'Preparing...' })
        .catch(function (error) {
            showToast(error.message || 'Unable to prepare WhatsApp order details.', 4000, {
                type: 'error',
                title: 'WhatsApp failed'
            });
        });
}

function dashboardEmail(buttonElement, orderId, skipConfirm) {
    if (!skipConfirm && window.confirmAdminAction) {
        window.confirmAdminAction({
            title: 'Email',
            message: 'Send the order email now?',
            confirmText: 'Send Email'
        }).then(function (confirmed) {
            if (confirmed) dashboardEmail(buttonElement, orderId, true);
        });
        return;
    }

    orderId = Number(orderId);

    if (!orderId || !Number.isInteger(orderId)) {
        showToast('Invalid order Id for Email.', 3000, { type: 'warning', title: 'Email' });
        return;
    }

    window.AdminOrderShare.sendOrderEmail(orderId, { button: buttonElement, busyText: 'Sending...' })
        .catch(function (error) {
            showToast(error.message || 'Unable to send order email.', 4000, {
                type: 'error',
                title: 'Email failed'
            });
        });
}

function normalizeWhatsappNumber(rawValue) {
    var digits = String(rawValue || '').replace(/[^\d]/g, '');
    if (!digits) return '';
    return digits;
}

function dashboardGetReminderOrder(orderId) {
    return orders.find(function (item) {
        return Number(item.id ?? item.Id) === Number(orderId);
    }) || null;
}

function dashboardGetReminderBalance(order) {
    var totalAmount = Number(order.totalAmount ?? order.TotalAmount) || 0;
    var paidAmount = Number(order.paidAmount ?? order.PaidAmount) || 0;
    return Math.max(0, totalAmount - paidAmount);
}

function dashboardCreateReminderPaymentLink(order) {
    var orderId = Number(order.id ?? order.Id) || 0;
    if (orderId <= 0) {
        return Promise.reject(new Error('Invalid order for payment reminder.'));
    }

    return new Promise(function (resolve, reject) {
        $.ajax({
            url: '/Admin/Orders/CreateReminderPaymentLink',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ orderId: orderId }),
            success: function (response) {
                var paymentUrl = String(response?.paymentUrl || '').trim();
                if (!paymentUrl) {
                    reject(new Error('Unable to generate payment link.'));
                    return;
                }
                resolve(paymentUrl);
            },
            error: function (xhr) {
                reject(new Error(xhr.responseJSON?.message || 'Unable to generate payment link.'));
            }
        });
    });
}

function reminderChannelConfig(channel) {
    if (channel === 'email') {
        return {
            label: 'Email',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path></svg>',
            busyLabel: 'Sending Email...'
        };
    }
    if (channel === 'whatsapp') {
        return {
            label: 'WhatsApp',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.05 4.94A9.77 9.77 0 0 0 12.09 2C6.66 2 2.24 6.4 2.24 11.83c0 1.74.45 3.43 1.31 4.92L2 22l5.4-1.41a9.8 9.8 0 0 0 4.69 1.2h.01c5.43 0 9.84-4.4 9.84-9.83a9.77 9.77 0 0 0-2.89-7.02Zm-6.96 15.19h-.01a8.14 8.14 0 0 1-4.15-1.14l-.3-.18-3.2.84.86-3.12-.2-.32a8.13 8.13 0 0 1-1.25-4.34c0-4.5 3.67-8.17 8.18-8.17 2.18 0 4.23.84 5.77 2.39a8.1 8.1 0 0 1 2.39 5.78c0 4.5-3.67 8.16-8.18 8.16Zm4.48-6.1c-.25-.12-1.46-.72-1.69-.8-.23-.09-.39-.12-.56.12-.16.24-.64.8-.78.96-.14.17-.28.19-.52.07-.25-.12-1.03-.38-1.96-1.22-.72-.64-1.21-1.43-1.35-1.67-.14-.24-.01-.37.1-.49.1-.09.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.77-1.84-.2-.48-.4-.41-.56-.42h-.48c-.16 0-.43.06-.66.31-.23.24-.87.85-.87 2.08s.89 2.42 1.01 2.58c.12.16 1.75 2.67 4.24 3.74.59.26 1.06.41 1.43.52.6.19 1.14.16 1.57.1.48-.07 1.46-.6 1.66-1.18.21-.58.21-1.08.14-1.18-.06-.1-.22-.16-.47-.28Z"></path></svg>',
            busyLabel: 'Opening WhatsApp...'
        };
    }
    return {
        label: 'Both',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h12a2 2 0 0 1 2 2v8"></path><path d="M4 17h8"></path><path d="m17 14 3-3 3 3"></path><path d="m20 11v8"></path></svg>',
        busyLabel: 'Sending Both...'
    };
}

function buildReminderButton(channel, orderId) {
    var config = reminderChannelConfig(channel);
    return '<button type="button" class="btn orders-reminder-send-btn orders-reminder-btn-' + channel + '" data-channel="' + channel + '" data-label="' + escapeHtml(config.label) + '" onclick="dashboardSendReminder(\'' + channel + '\',' + Number(orderId) + ')">' +
        '<span class="orders-reminder-btn-icon" aria-hidden="true">' + config.icon + '</span>' +
        '<span class="orders-reminder-btn-text">' + escapeHtml(config.label) + '</span>' +
        '<span class="orders-reminder-btn-loader hidden" aria-hidden="true"><span class="orders-reminder-spinner"></span></span>' +
        '</button>';
}

function setReminderButtonsBusy(isBusy, activeChannel) {
    var $buttons = $('.orders-reminder-send-btn');
    $buttons.prop('disabled', !!isBusy).toggleClass('is-loading', !!isBusy);

    $buttons.each(function () {
        var $button = $(this);
        var channel = String($button.data('channel') || '').toLowerCase();
        var originalLabel = String($button.data('label') || $button.text() || '').trim();
        var config = reminderChannelConfig(channel);

        if (!isBusy) {
            $button.find('.orders-reminder-btn-text').text(originalLabel || config.label);
            $button.find('.orders-reminder-btn-loader').addClass('hidden');
            $button.find('.orders-reminder-btn-icon').removeClass('hidden');
            return;
        }

        var isActive = !activeChannel || channel === activeChannel;
        $button.find('.orders-reminder-btn-text').text(isActive ? config.busyLabel : originalLabel || config.label);
        $button.find('.orders-reminder-btn-loader').toggleClass('hidden', !isActive);
        $button.find('.orders-reminder-btn-icon').toggleClass('hidden', isActive);
    });
}

function openModal(html) {
    var isReminderModal = String(html || '').indexOf('orders-reminder-modal') !== -1;
    $('#orderModalBox')
        .toggleClass('orders-reminder-host', isReminderModal)
        .html(html);
    $('#orderModal').removeClass('hidden');
}

function closeModal() {
    $('#orderModalBox').removeClass('orders-reminder-host').html('');
    $('#orderModal').addClass('hidden');
}

window.closeOrder = closeModal;

function dashboardBuildReminderEmailBody(order, paymentUrl) {
    var customerName = String(order.customerName ?? order.CustomerName ?? 'Customer').trim() || 'Customer';
    var orderNumber = String(order.orderNumber ?? order.OrderNumber ?? ('#' + (order.id ?? order.Id))).trim();
    var balanceAmount = dashboardGetReminderBalance(order);
    var eventDate = displayDate(order.eventDate ?? order.EventDate);
    var mealPeriod = String(order.mealPeriodName ?? order.MealPeriodName ?? '-').trim();

    return [
        '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.6;color:#111827;">',
        '<p>Dear ' + $('<div>').text(customerName).html() + ',</p>',
        '<p>This is a friendly payment reminder for your order <strong>' + $('<div>').text(orderNumber).html() + '</strong>.</p>',
        '<p><strong>Outstanding Amount:</strong> ' + $('<div>').text(money(balanceAmount)).html() + '<br>',
        '<strong>Event Date:</strong> ' + $('<div>').text(eventDate).html() + '<br>',
        '<strong>Meal Period:</strong> ' + $('<div>').text(mealPeriod).html() + '</p>',
        '<p>Please complete the remaining payment using this secure link:</p>',
        '<p><a href="' + $('<div>').text(paymentUrl).html() + '" target="_blank" rel="noopener" style="display:inline-block;background:#ea6b1a;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700;">Pay Remaining Amount</a></p>',
        '<p>If you have already made this payment, kindly ignore this reminder.</p>',
        '<p>Regards,<br>Gayatri Catering</p>',
        '</div>'
    ].join('');
}

function dashboardSendReminderEmail(order, paymentUrl) {
    var toEmail = String(order.emailId ?? order.EmailId ?? '').trim();
    if (!toEmail) {
        return Promise.reject(new Error('Customer email is missing for this order.'));
    }

    var orderNumber = String(order.orderNumber ?? order.OrderNumber ?? ('#' + (order.id ?? order.Id))).trim();
    var formData = new FormData();
    formData.append('ToEmail', toEmail);
    formData.append('Subject', 'Payment Reminder - ' + orderNumber);
    formData.append('Body', dashboardBuildReminderEmailBody(order, paymentUrl));

    return new Promise(function (resolve, reject) {
        $.ajax({
            url: '/Common/SendEmail',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function () { resolve(); },
            error: function (xhr) {
                reject(new Error(xhr.responseJSON?.Message || xhr.responseJSON?.message || 'Unable to send reminder email.'));
            }
        });
    });
}

function dashboardSendReminderWhatsapp(order, paymentUrl) {
    var phone = normalizeWhatsappNumber(order.mobileNo ?? order.MobileNo);
    if (!phone) {
        throw new Error('Customer mobile number is missing for WhatsApp reminder.');
    }

    var customerName = String(order.customerName ?? order.CustomerName ?? 'Customer').trim() || 'Customer';
    var orderNumber = String(order.orderNumber ?? order.OrderNumber ?? ('#' + (order.id ?? order.Id))).trim();
    var balanceAmount = dashboardGetReminderBalance(order);
    var message = [
        'Hello ' + customerName + ',',
        '',
        'Payment reminder for order ' + orderNumber + '.',
        'Outstanding Amount: ' + money(balanceAmount),
        'Pay here: ' + paymentUrl,
        '',
        'Regards,',
        'Gayatri Catering'
    ].join('\n');

    var whatsappUrl = 'https://wa.me/' + encodeURIComponent(phone) + '?text=' + encodeURIComponent(message);
    window.open(whatsappUrl, '_blank', 'noopener');
}

function dashboardSendReminder(channel, orderId) {
    if (window.dashboardReminderInProgress) return;

    var selectedOrder = dashboardGetReminderOrder(orderId);
    if (!selectedOrder) {
        showToast('Unable to find the selected order.', 3000, { type: 'error', title: 'Reminder' });
        return;
    }

    var normalizedChannel = String(channel || '').toLowerCase();
    if (['email', 'whatsapp', 'both'].indexOf(normalizedChannel) === -1) {
        showToast('Invalid reminder channel.', 3000, { type: 'error', title: 'Reminder' });
        return;
    }

    window.dashboardReminderInProgress = true;
    setReminderButtonsBusy(true, normalizedChannel);

    dashboardCreateReminderPaymentLink(selectedOrder)
        .then(function (paymentUrl) {
            if (normalizedChannel === 'email') {
                return dashboardSendReminderEmail(selectedOrder, paymentUrl).then(function () {
                    showToast('Payment reminder email sent successfully.', 3500, { type: 'success', title: 'Reminder sent' });
                });
            }

            if (normalizedChannel === 'whatsapp') {
                dashboardSendReminderWhatsapp(selectedOrder, paymentUrl);
                showToast('WhatsApp reminder opened successfully.', 3500, { type: 'success', title: 'Reminder ready' });
                return;
            }

            return dashboardSendReminderEmail(selectedOrder, paymentUrl).then(function () {
                dashboardSendReminderWhatsapp(selectedOrder, paymentUrl);
                showToast('Email sent and WhatsApp reminder opened.', 3800, { type: 'success', title: 'Reminder sent' });
            });
        })
        .catch(function (error) {
            showToast(error.message || 'Unable to send payment reminder.', 4000, { type: 'error', title: 'Reminder failed' });
        })
        .finally(function () {
            window.dashboardReminderInProgress = false;
            setReminderButtonsBusy(false);
        });
}

function dashboardReminder(orderId, skipConfirm) {
    if (!skipConfirm && window.confirmAdminAction) {
        window.confirmAdminAction({
            title: 'Send Reminder',
            message: 'Open the payment reminder popup for this order?',
            confirmText: 'Open Reminder'
        }).then(function (confirmed) {
            if (confirmed) dashboardReminder(orderId, true);
        });
        return;
    }

    var selectedOrder = dashboardGetReminderOrder(orderId);
    if (!selectedOrder) {
        showToast('Unable to find the selected order.', 3000, { type: 'error', title: 'Reminder' });
        return;
    }

    var balanceAmount = dashboardGetReminderBalance(selectedOrder);
    if (balanceAmount <= 0) {
        showToast('This order has no outstanding balance.', 3000, { type: 'info', title: 'Reminder' });
        return;
    }

    var paymentStatusValue = String(selectedOrder.paymentStatus ?? selectedOrder.PaymentStatus ?? '').trim();
    var paidAmount = Number(selectedOrder.paidAmount ?? selectedOrder.PaidAmount) || 0;
    var totalAmount = Number(selectedOrder.totalAmount ?? selectedOrder.TotalAmount) || 0;
    var isReminderEligible = (paidAmount < totalAmount) || paymentStatusValue === '0' || paymentStatusValue === '1';

    if (!isReminderEligible) {
        showToast('Reminder is available only when there is pending payment.', 3200, { type: 'warning', title: 'Reminder' });
        return;
    }

    var customerName = String(selectedOrder.customerName ?? selectedOrder.CustomerName ?? '-').trim() || '-';
    var orderNumber = String(selectedOrder.orderNumber ?? selectedOrder.OrderNumber ?? ('#' + (selectedOrder.id ?? selectedOrder.Id))).trim();
    var customerEmail = String(selectedOrder.emailId ?? selectedOrder.EmailId ?? '-').trim() || '-';
    var customerMobile = String(selectedOrder.mobileNo ?? selectedOrder.MobileNo ?? '-').trim() || '-';

    var html = '<div class="orders-reminder-modal">' +
        '<div class="orders-reminder-shell">' +
        '<div class="orders-reminder-header"><div class="orders-reminder-heading"><span class="orders-reminder-title-icon" aria-hidden="true">&#128276;</span><div><h3>Send Payment Reminder</h3><p>Choose how you want to contact the customer.</p></div></div><button type="button" class="btn-close" onclick="closeOrder()" aria-label="Close">&times;</button></div>' +
        '<div class="modal-body orders-reminder-body">' +
        '<div class="orders-reminder-hero">' +
        '<div class="orders-reminder-hero-copy"><span class="orders-reminder-hero-kicker">Payment reminder</span><strong>' + escapeHtml(orderNumber) + '</strong><span>' + escapeHtml(customerName) + '</span></div>' +
        '<div class="orders-reminder-hero-balance"><span>Outstanding</span><strong>' + money(balanceAmount) + '</strong></div>' +
        '</div>' +
        '<div class="orders-reminder-meta-grid">' +
        '<div class="orders-reminder-meta-item"><span class="orders-reminder-label">Order</span><strong>' + escapeHtml(orderNumber) + '</strong></div>' +
        '<div class="orders-reminder-meta-item"><span class="orders-reminder-label">Customer</span><strong>' + escapeHtml(customerName) + '</strong></div>' +
        '<div class="orders-reminder-meta-item"><span class="orders-reminder-label">Email</span><strong>' + escapeHtml(customerEmail) + '</strong></div>' +
        '<div class="orders-reminder-meta-item"><span class="orders-reminder-label">Mobile</span><strong>' + escapeHtml(customerMobile) + '</strong></div>' +
        '</div>' +
        '<div class="orders-reminder-balance-card"><div><span class="orders-reminder-label">Outstanding Amount</span><strong>' + money(balanceAmount) + '</strong></div><div class="orders-reminder-balance-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22"></path><path d="M17 5.5A4.5 4.5 0 0 0 12.5 1H9a4 4 0 0 0 0 8h6a4 4 0 0 1 0 8H8.5A4.5 4.5 0 0 1 4 12.5"></path></svg></div></div>' +
        '<p class="orders-reminder-note"><span class="orders-reminder-note-icon" aria-hidden="true">&#8505;</span><span>Choose a channel to send the reminder. A secure payment link will be generated automatically for the remaining amount.</span></p>' +
        '</div>' +
        '<div class="modal-footer orders-reminder-footer">' +
        '<button type="button" class="btn btn-light orders-reminder-close-btn" onclick="closeOrder()">Close</button>' +
        buildReminderButton('email', Number(selectedOrder.id ?? selectedOrder.Id)) +
        buildReminderButton('whatsapp', Number(selectedOrder.id ?? selectedOrder.Id)) +
        buildReminderButton('both', Number(selectedOrder.id ?? selectedOrder.Id)) +
        '</div>' +
        '</div>' +
        '</div>';

    openModal(html);
}

function dashboardDownload(buttonElement, orderId) {
    orderId = Number(orderId);

    if (!orderId || !Number.isInteger(orderId)) {
        showToast('Invalid order Id for Download.', 3000, { type: 'warning', title: 'Download' });
        return;
    }

    window.AdminOrderShare.downloadOrderPdf(orderId, { button: buttonElement, busyText: 'Downloading...' })
        .catch(function (error) {
            showToast(error.message || 'Unable to download order PDF.', 4000, {
                type: 'error',
                title: 'Download failed'
            });
        });
}

function saveAdminDashboardPaymentContext(context) {
    context.savedAt = Date.now();
    try {
        localStorage.setItem(window.adminDashboardPaymentContextKey, JSON.stringify(context));
    } catch (_error) {
    }
    return context;
}

function getAdminDashboardPaymentContext(orderId) {
    try {
        var context = JSON.parse(localStorage.getItem(window.adminDashboardPaymentContextKey) || 'null');
        if (!context || Number(context.orderId) !== Number(orderId)) return null;
        if (!context.savedAt || Date.now() - Number(context.savedAt) > 2 * 60 * 60 * 1000) {
            localStorage.removeItem(window.adminDashboardPaymentContextKey);
            return null;
        }
        return context;
    } catch (_error) {
        return null;
    }
}

function clearAdminDashboardPaymentContext() {
    try {
        localStorage.removeItem(window.adminDashboardPaymentContextKey);
        sessionStorage.removeItem('gayatri.order.paymentReturnContext');
    } catch (_error) {
    }
}

function buildAdminDashboardPaymentContext(orderId, details) {
    var head = details && details.order ? details.order : {};
    var totalAmount = Number(head.totalAmount || head.TotalAmount || 0) || 0;
    var paidAmount = Number(head.paidAmount || head.PaidAmount || 0) || 0;
    return {
        orderId: Number(orderId) || 0,
        orderNumber: String(head.orderNumber || head.OrderNumber || '').trim(),
        email: String(head.emailId || head.EmailId || '').trim(),
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        balanceAmount: Math.max(0, totalAmount - paidAmount),
        savedAt: Date.now()
    };
}

function sendAdminDashboardInvoice(context) {
    if (!context.email) {
        clearAdminDashboardPaymentContext();
        window.dashboardReOrderInProgress = false;
        showToast('Payment succeeded, but the customer email is missing.', 5000, {
            type: 'warning',
            title: 'Email missing'
        });
        loadDashboard();
        return;
    }

    var formData = new FormData();
    formData.append('ToEmail', context.email);
    formData.append('Subject', 'Tax Invoice - ' + (context.orderNumber || ('Order ' + context.orderId)));
    formData.append('ReportId', '4');
    formData.append('OrderId', String(context.orderId));
    formData.append('ReportFiltersJson', JSON.stringify({ OrderId: context.orderId }));

    $.ajax({
        url: '/Common/SendReportEmail',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function () {
            clearAdminDashboardPaymentContext();
            window.dashboardReOrderInProgress = false;
            showToast('Payment completed and tax invoice sent successfully.', 4500, {
                type: 'success',
                title: 'Paid'
            });
            loadDashboard();
        },
        error: function (xhr) {
            clearAdminDashboardPaymentContext();
            window.dashboardReOrderInProgress = false;
            showToast(xhr.responseJSON?.Message || 'Payment completed, but tax invoice email failed.', 5000, {
                type: 'warning',
                title: 'Email failed'
            });
            loadDashboard();
        }
    });
}

function openAdminDashboardPayment(context) {
    saveAdminDashboardPaymentContext(context);
    var balanceAmount = Number(context.balanceAmount) || Number(context.totalAmount) || 0;
    OrderPayment.open(context.orderId, balanceAmount, function (result) {
        if (result && result.cancelled) {
            Promise.resolve(sendAdminDashboardPaymentPendingEmail(context)).finally(function () {
                clearAdminDashboardPaymentContext();
                window.dashboardReOrderInProgress = false;
                loadDashboard();
            });
            return;
        }

        showToast('Payment completed. Preparing the tax invoice...', 4000, {
            type: 'success',
            title: 'Paid'
        });
        sendAdminDashboardInvoice(context);
    }, {
        returnPage: 'admindashboard',
        totalAmount: Number(context.totalAmount) || 0,
        paidAmount: Number(context.paidAmount) || 0
    });
}

$(document).on('orderRefund:completed', function () {
    loadDashboard();
});

function buildAdminDashboardPaymentFailureDetails(context) {
    var totalAmount = Number(context.totalAmount) || 0;
    var paidAmount = Number(context.paidAmount) || 0;
    return {
        order: {
            OrderId: Number(context.orderId) || 0,
            OrderNumber: String(context.orderNumber || '').trim(),
                CustomerName: String(context.customerName || 'Customer').trim(),
            MobileNo: String(context.mobileNo || '').trim(),
            EmailId: String(context.email || '').trim(),
            EventName: String(context.eventName || '-').trim(),
            MealPeriodName: String(context.mealPeriodName || '-').trim(),
            EventDate: context.eventDate || null,
            Pax: Number(context.pax) || 0,
            TotalAmount: totalAmount,
            PaidAmount: paidAmount,
            OrderStatusName: 'Payment Pending'
        },
        event: {
            EventDate: context.eventDate || null
        }
    };
}

function sendAdminDashboardPaymentPendingEmail(context) {
    if (!window.AdminOrderShare || typeof window.AdminOrderShare.sendOrderEmail !== 'function') {
        return $.Deferred().resolve().promise();
    }

    if (!context || !context.email) {
        showToast('Payment was cancelled, but the customer email is missing for the reminder email.', 4500, {
            type: 'warning',
            title: 'Email missing'
        });
        return $.Deferred().resolve().promise();
    }

    var details = buildAdminDashboardPaymentFailureDetails(context);

    return window.AdminOrderShare.sendOrderEmail(context.orderId, {
        details: details,
        useInvoicePdf: true,
        emailSubject: window.AdminOrderShare.buildPaymentFailureEmailSubject(context.orderId, details, {
            subjectPrefix: 'Payment Pending'
        }),
        emailBody: window.AdminOrderShare.buildPaymentFailureEmailBody(context.orderId, details, {
            reasonText: 'the payment was cancelled before it could be completed',
            supportPhone: '+65 6294 6294',
            supportEmail: 'info@gayatrirestaurant.com'
        })
    }).then(function () {
        showToast('Payment pending email sent to the customer.', 3500, {
            type: 'success',
            title: 'Email sent'
        });
    }).catch(function (error) {
        showToast(error && error.message ? error.message : 'Payment was cancelled, but the email could not be sent.', 4500, {
            type: 'warning',
            title: 'Email failed'
        });
    });
}

function resumeAdminDashboardPaymentAfterRedirect() {
    var query = new URLSearchParams(window.location.search);
    var orderId = parseInt(query.get('paymentOrderId'), 10) || 0;
    var chargeId = String(query.get('paymentChargeId') || '').trim();
    var paymentStatus = String(query.get('paymentStatus') || '').trim().toLowerCase();
    if (orderId <= 0) return;

    var context = getAdminDashboardPaymentContext(orderId);
    window.history.replaceState({}, document.title, '/Admin/Dashboard');

    function sendRecoveredInvoice() {
        if (context) {
            sendAdminDashboardInvoice(context);
            return;
        }

        if (!window.AdminOrderShare || typeof window.AdminOrderShare.fetchOrderDetails !== 'function') {
            clearAdminDashboardPaymentContext();
            window.dashboardReOrderInProgress = false;
            showToast('Payment completed, but invoice details could not be restored. Please refresh and try again.', 5000, {
                type: 'warning',
                title: 'Payment verification'
            });
            loadDashboard();
            return;
        }

        window.AdminOrderShare.fetchOrderDetails(orderId)
            .then(function (details) {
                context = buildAdminDashboardPaymentContext(orderId, details);
                saveAdminDashboardPaymentContext(context);
                sendAdminDashboardInvoice(context);
            })
            .catch(function () {
                clearAdminDashboardPaymentContext();
                window.dashboardReOrderInProgress = false;
                showToast('Payment completed, but invoice details could not be restored. Please refresh and try again.', 5000, {
                    type: 'warning',
                    title: 'Payment verification'
                });
                loadDashboard();
            });
    }

    if (!chargeId) {
        if (paymentStatus === 'successful' || paymentStatus === 'paid') {
            showToast('Payment completed. Preparing the tax invoice...', 4000, {
                type: 'success',
                title: 'Paid'
            });
            sendRecoveredInvoice();
            return;
        }

        clearAdminDashboardPaymentContext();
        window.dashboardReOrderInProgress = false;
        showToast('Payment returned, but it could not be verified.', 5000, {
            type: 'warning',
            title: 'Payment verification'
        });
        loadDashboard();
        return;
    }

    function verify(attempt) {
        $.getJSON('/Customer/OrderPayment/status/' + encodeURIComponent(chargeId))
            .done(function (result) {
                if (result.paid) {
                    showToast('Payment completed. Preparing the tax invoice...', 4000, {
                        type: 'success',
                        title: 'Paid'
                    });
                    sendRecoveredInvoice();
                    return;
                }

                if (String(result.status || '').toLowerCase() === 'pending' && attempt < 15) {
                    if (attempt === 0) {
                        showToast('Confirming payment. Please wait...', 5000, {
                            type: 'info',
                            title: 'Payment verification'
                        });
                    }
                    window.setTimeout(function () { verify(attempt + 1); }, 4000);
                    return;
                }

                clearAdminDashboardPaymentContext();
                window.dashboardReOrderInProgress = false;
                showToast('Payment is ' + String(result.status || 'pending') + '. Invoice email was not sent.', 6000, {
                    type: 'warning',
                    title: 'Payment pending'
                });
                loadDashboard();
            })
            .fail(function () {
                clearAdminDashboardPaymentContext();
                window.dashboardReOrderInProgress = false;
                showToast('Unable to verify payment. Please refresh and try again.', 5000, {
                    type: 'warning',
                    title: 'Payment verification'
                });
                loadDashboard();
            });
    }

    verify(0);
}

function renderDashboardSummary(summary) {
    var safe = summary || {};
    $('#kpiOrders').text(Number(safe.totalOrders) || 0);
    $('#kpiActive').text(money(safe.activeOrders));
    $('#kpiWithoutGST').text(money(safe.totalWOGST));
    $('#kpiLogistics').text(money(safe.utensilsAmount));
    $('#kpiRevenue').text(money(safe.totalSales));
    $('#kpiOutstanding').text(money(safe.outstanding));
    $('#kpiDelivered').text(Number(safe.deliveredOrders) || 0);
    $('#kpiNotDelivered').text(Number(safe.notDeliveredOrders) || 0);
}

function renderDashboardAlerts(alerts) {
    var safe = alerts || {};
    $('#dashboardAlertOverdue').text(Number(safe.overdueOutstandingCount) || 0);
    $('#dashboardAlertUpcoming').text(Number(safe.upcomingPendingPaymentCount) || 0);
    $('#dashboardAlertStuck').text(Number(safe.stuckOrdersCount) || 0);
}

function buildDashboardChartCacheKey(fromDate, toDate) {
    return dashboardState.chartCacheKeyPrefix + [fromDate || '', toDate || ''].join('|');
}

function cacheDashboardChartPayload(fromDate, toDate, payload) {
    try {
        sessionStorage.setItem(buildDashboardChartCacheKey(fromDate, toDate), JSON.stringify(payload || {}));
    } catch (_error) {
    }
}

function getCachedDashboardChartPayload(fromDate, toDate) {
    try {
        var raw = sessionStorage.getItem(buildDashboardChartCacheKey(fromDate, toDate));
        return raw ? JSON.parse(raw) : null;
    } catch (_error) {
        return null;
    }
}

function loadDashboard() {
    showDashboardLoader(true);

    var fromDate = $('#ordersFromDate').val();
    var toDate = $('#ordersToDate').val();
    var cached = getCachedDashboardChartPayload(fromDate, toDate);
    if (cached && cached.chart) {
        renderSalesChart(cached.chart, cached.previousChart);
    }

    $.ajax({
        url: "/Admin/Dashboard/get",
        type: "GET",
        data: {
            fromDate: fromDate,
            toDate: toDate
        },
        success: function (res) {
            dashboardState.sourceNote = String(res.sourceNote || dashboardState.sourceNote || '');
            updateDashboardRangeLabel();
            updateDashboardLastUpdatedLabel(res.generatedAtUtc);
            renderDashboardSummary(res.summary || {});
            renderDashboardAlerts(res.alerts || {});

            $('#dashboardChartSource').text(dashboardState.sourceNote || 'Source: Orders table filtered by CreatedDate range.');
            $('#dashboardAlertSource').text(dashboardState.sourceNote || 'Source: Orders table filtered by CreatedDate range.');
            $('#dashboardTableSource').text(dashboardState.sourceNote || 'Source: Orders table filtered by CreatedDate range.');
            $('#dashboardKpiSource').text(dashboardState.sourceNote || 'Source: Orders table filtered by CreatedDate range.');

            window.setTimeout(function () {
                renderSalesChart(res.chart || {}, res.previousChart || {});
            }, 40);

            window.setTimeout(function () {
                renderDashboard(res.recentOrders || []);
            }, 90);

            cacheDashboardChartPayload(fromDate, toDate, {
                chart: res.chart || {},
                previousChart: res.previousChart || {}
            });
        },
        error: function () {
            showToast("Unable to load dashboard.");
        },
        complete: function () {
            showDashboardLoader(false);
            dashboardHasLoadedOnce = true;
        }
    });

}

function showDashboardLoader(show) {
    var $panel = $('#dashboardSkeleton');
    if ($panel.length) {
        $('#dashboardContentWrap').toggleClass('hidden', show && !dashboardHasLoadedOnce);
        $panel.toggleClass('hidden', !show);
    }
}

var salesChart = null;

//function renderSalesChart(chartData) {

//    var ctx = document.getElementById("salesChart");

//    if (salesChart)
//        salesChart.destroy();

//    salesChart = new Chart(ctx, {

//        type: "bar",

//        data: {

//            labels: chartData.labels,

//            datasets: [
//                {
//                    label: "Order Value",
//                    data: chartData.orderValue,
//                    backgroundColor: "#0f9d94"
//                },
//                {
//                    label: "Deposit",
//                    data: chartData.deposit,
//                    backgroundColor: "#ff9800"
//                },
//                {
//                    label: "Full Payment",
//                    data: chartData.fullPayment,
//                    backgroundColor: "#1565c0"
//                }
//            ]
//        },

//        options: {

//            responsive: true,

//            maintainAspectRatio: false,

//            scales: {

//                y: {
//                    beginAtZero: true
//                }
//            }
//        }
//    });
//}

var salesChart = null;

function getChartSeriesByMetric(chartData, metricMode) {
    var labels = Array.isArray(chartData && chartData.labels) ? chartData.labels : [];
    var values = [];
    var label = 'Revenue';
    var color = '#166534';

    if (metricMode === 'collections') {
        values = Array.isArray(chartData && chartData.deposit) ? chartData.deposit : [];
        label = 'Collections';
        color = '#b45309';
    } else if (metricMode === 'outstanding') {
        values = Array.isArray(chartData && chartData.outstanding) ? chartData.outstanding : [];
        label = 'Outstanding';
        color = '#9a3412';
    } else {
        values = Array.isArray(chartData && chartData.orderValue) ? chartData.orderValue : [];
    }

    return {
        labels: labels,
        values: values,
        label: label,
        color: color
    };
}

function renderSalesChart(chart, previousChart) {
    var chartData = chart || {};
    var metricMode = dashboardState.chartMetricMode || String($('#chartMetricMode').val() || 'revenue');
    dashboardState.chartMetricMode = metricMode;

    var current = getChartSeriesByMetric(chartData, metricMode);
    var hasCurrentData = current.values.some(function (value) { return Number(value) > 0; });

    var currentTotal = current.values.reduce(function (sum, value) { return sum + (Number(value) || 0); }, 0);
    var previous = getChartSeriesByMetric(previousChart || {}, metricMode);
    var previousTotal = previous.values.reduce(function (sum, value) { return sum + (Number(value) || 0); }, 0);
    var changePercent = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
    $('#chartSummaryCurrentLabel').text(current.label);
    $('#chartSummaryCurrent').text(money(currentTotal));
    $('#chartSummaryPrevious').text(money(previousTotal));
    $('#chartSummaryChange').text((changePercent >= 0 ? '+' : '') + changePercent.toFixed(1) + '%');
    $('#chartSummaryChange').toggleClass('is-positive', changePercent >= 0).toggleClass('is-negative', changePercent < 0);
    $('.dashboard-chart-card').toggleClass('is-single-period', current.labels.length <= 1);

    if (!hasCurrentData) {
        if (salesChart) {
            salesChart.destroy();
            salesChart = null;
        }
        $('#dashboardChartEmpty').removeClass('hidden');
        return;
    }

    $('#dashboardChartEmpty').addClass('hidden');

    var datasets = [{
        label: current.label,
        data: current.values,
        backgroundColor: current.color,
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 26
    }];

    if (dashboardState.compareMode) {
        if (previous.values.length) {
            datasets.push({
                label: current.label + ' (Previous Period)',
                data: previous.values,
                backgroundColor: 'rgba(15, 118, 110, .45)',
                borderColor: '#0f766e',
                borderWidth: 1,
                borderRadius: 8,
                borderSkipped: false,
                maxBarThickness: 18
            });
        }
    }

    var ctx = document.getElementById('salesChart').getContext('2d');
    if (salesChart) salesChart.destroy();

    salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: current.labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            animation: {
                duration: 700,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'center',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: {
                            size: 13,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: '#134e35',
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function (context) {
                            var allPoints = context.chart.data.datasets
                                .map(function (dataset) { return Number(dataset.data[context.dataIndex]) || 0; });
                            var total = allPoints.reduce(function (sum, value) { return sum + value; }, 0);
                            var value = Number(context.raw) || 0;
                            var percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                            return context.dataset.label + ': ' + money(value) + ' (' + percent + '%)';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#4b5563',
                        font: { weight: '600' }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(120, 84, 37, .14)' },
                    ticks: {
                        color: '#7a6752',
                        callback: function (value) {
                            return money(value);
                        }
                    }
                }
            }
        }
    });
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
