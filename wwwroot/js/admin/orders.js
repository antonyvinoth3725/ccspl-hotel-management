// ===== ADMIN ORDERS =====
var orders = [];
var orderReOrderInProgress = false;
var adminOrdersPaymentContextKey = 'gayatri.admin.ordersPaymentContext';
var reminderInProgress = false;
var signatureRequestInProgress = false;
var drivers = [];
var ordersLoading = false;

function formatOrdersLocalDateInput(dateObj) {
    var year = dateObj.getFullYear();
    var month = String(dateObj.getMonth() + 1).padStart(2, '0');
    var day = String(dateObj.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function setOrdersDateValue(selector, value) {
    var input = $(selector).get(0);
    if (!input) return;

    if (input._flatpickr) {
        input._flatpickr.setDate(value, false, 'Y-m-d');
    } else {
        $(input).val(value);
    }
}

function getOrdersDateValue(selector) {
    var input = $(selector).get(0);
    if (!input) return '';

    if (input._flatpickr && input._flatpickr.selectedDates && input._flatpickr.selectedDates.length) {
        return formatOrdersLocalDateInput(input._flatpickr.selectedDates[0]);
    }

    return String($(input).val() || '').trim();
}

function syncOrdersDateBounds() {
    var fromDate = getOrdersDateValue('#ordersFromDate');
    var toDate = getOrdersDateValue('#ordersToDate');

    var fromInput = $('#ordersFromDate').get(0);
    var toInput = $('#ordersToDate').get(0);

    if (fromInput && fromInput._flatpickr) {
        fromInput._flatpickr.set('maxDate', toDate || null);
    }
    if (toInput && toInput._flatpickr) {
        toInput._flatpickr.set('minDate', fromDate || null);
    }
}

function parseOrdersDate(value) {
    var text = String(value || '').trim();
    if (!text) return null;
    var parts = text.split('-');
    if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    var parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

$(function () {

    var activeIndicator = 'orders';
    var ordersViewState = { orders: 'board', amendment: 'board' };
    var boardDrawerState = {
        orderId: 0,
        orderRow: null,
        details: null,
        tab: 'summary'
    };

    var today = new Date();
    var todayValue = formatOrdersLocalDateInput(today);
    setOrdersDateValue('#ordersFromDate', todayValue);
    setOrdersDateValue('#ordersToDate', todayValue);
    syncOrdersDateBounds();
    $('#ordersStatusFilter').val('');

    loadDrivers(function () {
        applyOrdersTabState();
        loadOrders();
    });
    resumeAdminOrdersPaymentAfterRedirect();

    function isAmendmentTab() {
        return activeIndicator === 'amendment';
    }

    function applyOrdersTabState() {
        var isAmendment = isAmendmentTab();

        $('#ordersTabOrders').toggleClass('active', !isAmendment).attr('aria-selected', String(!isAmendment));
        $('#ordersTabAmendments').toggleClass('active', isAmendment).attr('aria-selected', String(isAmendment));
        $('#ordersTabTitle').text(isAmendment ? 'Amendment History' : 'Manage Orders');
        $('#ordersSearch').attr('placeholder', isAmendment ? 'Search amendments...' : 'Search orders...');
        $('#ordersRefNoHeader').toggleClass('hidden', !isAmendment);
        $('#ordersTable tbody td.orders-refno-col').toggleClass('hidden', !isAmendment);
        applyOrdersViewState();
    }

    function renderCurrentOrdersView() {
        var currentView = ordersViewState[activeIndicator] || 'board';
        var isBoard = currentView === 'board';
        var searchText = getOrdersSearchText();
        var filteredOrders = filterOrdersBySearch(orders, searchText);

        $('#ordersViewBoard').toggleClass('active', isBoard).attr('aria-selected', String(isBoard));
        $('#ordersViewList').toggleClass('active', !isBoard).attr('aria-selected', String(!isBoard));
        $('#ordersContainer').toggleClass('hidden', isBoard);
        $('#ordersBoardView').toggleClass('hidden', !isBoard);
        $('#btnOrdersPrintLabels').toggleClass('hidden', isBoard);
        $('#ordersListPanel .js-export-trigger').toggleClass('hidden', isBoard);
        $('.column-chooser-wrap').toggleClass('hidden', isBoard);

        if (!isBoard) {
            closeBoardOrderDrawer();
        }

        if (isBoard) {
            renderOrdersBoard(filteredOrders);
            return;
        }

        renderOrders(filteredOrders);
    }

    function applyOrdersViewState() {
        renderCurrentOrdersView();
    }

    function getOrdersSearchText() {
        return String($('#ordersSearch').val() || '').trim().toLowerCase();
    }

    function matchesOrdersSearch(row, searchText) {
        if (!searchText) return true;

        var haystack = [
            row.orderNumber,
            row.OrderNumber,
            row.customerName,
            row.CustomerName,
            row.mobileNo,
            row.MobileNo,
            row.phone,
            row.Phone,
            row.packageName,
            row.PackageName,
            row.locationName,
            row.LocationName,
            row.eventName,
            row.EventName,
            row.mealPeriodName,
            row.MealPeriodName,
            row.id,
            row.Id,
            row.refNo,
            row.RefNo,
            (row.customerName || '') + ' ' + (row.mobileNo || '') + ' ' + (row.packageName || '')
        ].join(' ').toLowerCase();

        return haystack.indexOf(searchText) !== -1;
    }

    function filterOrdersBySearch(rows, searchText) {
        if (!Array.isArray(rows)) return [];
        if (!searchText) return rows;
        return rows.filter(function (row) {
            return matchesOrdersSearch(row, searchText);
        });
    }

    function refreshOrdersSearchDisplay() {
        var searchText = getOrdersSearchText();
        var filteredRows = filterOrdersBySearch(orders, searchText);

        if (ordersViewState[activeIndicator] === 'board') {
            renderOrdersBoard(filteredRows);
            return;
        }

        renderOrders(filteredRows);
    }

    function normalizeOrderStatusValue(value) {
        if (value === null || value === undefined || value === '') return 0;

        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : 0;
        }

        if (typeof value === 'string') {
            var trimmed = value.trim();
            if (!trimmed) return 0;

            var numeric = Number(trimmed);
            if (Number.isFinite(numeric)) return numeric;

            var normalized = trimmed.toLowerCase();
            var statusMap = {
                'pending': 0,
                'in kitchen': 1,
                'ready': 2,
                'ready for delivery': 2,
                'out for delivery': 3,
                'assigned for driver': 3,
                'delivered': 4,
                'cancel order': 7,
                'cancelled': 7,
                'amended': 8
            };
            return statusMap[normalized] !== undefined ? statusMap[normalized] : 0;
        }

        return Number(value) || 0;
    }

    function renderOrdersBoard(rows) {
        var boardColumns = [
            { key: 0, label: 'Pending (New)', badge: 'badge-pending' },
            { key: 1, label: 'In Kitchen', badge: 'badge-in-kitchen' },
            { key: 2, label: 'Ready', badge: 'badge-ready-for-delivery' },
            { key: 3, label: 'Out for delivery', badge: 'badge-assigned-for-driver' },
            { key: 4, label: 'Delivered', badge: 'badge-delivered' }
        ];

        var searchText = getOrdersSearchText();

        var html = '<div class="orders-board-grid">';
        boardColumns.forEach(function (column) {
            var items = (rows || []).filter(function (row) {
                var rowStatus = normalizeOrderStatusValue(row.orderStatus ?? row.OrderStatus ?? row.status ?? row.Status ?? row.order_status ?? row.Order_Status);
                return rowStatus === Number(column.key) && matchesOrdersSearch(row, searchText);
            });

            var nextStatusLabels = {
                0: 'Send to Kitchen',
                1: 'Ready',
                2: 'Out for delivery',
                3: 'Delivered'
            };

            var cards = items.map(function (row) {
                var total = Number(row.totalAmount ?? row.TotalAmount ?? 0);
                var paid = Number(row.paidAmount ?? row.PaidAmount ?? 0);
                var balance = total - paid;
                var nextStatus = column.key < 3 ? nextStatusLabels[column.key] : null;
                var orderId = Number(row.id ?? row.Id) || 0;
                var actionBtn = nextStatus ?
                    '<button type="button" class="orders-board-card-action" onclick="event.stopPropagation(); ordersBoardAdvanceStatus(this, ' + orderId + ', ' + (column.key + 1) + ')">→ ' + escapeHtml(nextStatus) + '</button>' :
                    '';
                return '<div class="orders-board-card" role="button" tabindex="0" onclick="openBoardOrderDrawer(' + orderId + ')">' +
                    '<div class="orders-board-card-head">' +
                        '<div class="orders-board-card-order">' + escapeHtml(row.orderNumber || ('#' + row.id)) + '</div>' +
                    '</div>' +
                    '<div class="orders-board-card-customer">' + escapeHtml(row.customerName || '-') + '</div>' +
                    '<div class="orders-board-card-meta">' +
                        '<span>' + escapeHtml(row.eventName || row.packageName || 'Event') + '</span>' +
                        '<span>' + escapeHtml(row.mealPeriodName || '—') + '</span>' +
                    '</div>' +
                    '<div class="orders-board-card-amounts">' +
                        '<div class="orders-board-card-balance"><span class="orders-board-card-label">BAL</span> <span class="orders-board-card-amount-value">' + money(balance) + '</span></div>' +
                        '<div class="orders-board-card-total"><span class="orders-board-card-label">Total</span> <span class="orders-board-card-total-value">' + money(total) + '</span></div>' +
                    '</div>' +
                    '<div class="orders-board-card-footer">' +
                        '<span>' + escapeHtml(row.mobileNo || row.emailId || 'Contact not set') + '</span>' +
                    '</div>' +
                    (actionBtn ? '<div class="orders-board-card-actions">' + actionBtn + '</div>' : '') +
                '</div>';
            }).join('') || '<div class="muted">No orders in this stage.</div>';

            html += '<div class="orders-board-column">' +
                '<div class="orders-board-column-header">' +
                    '<span class="orders-board-column-name">' + escapeHtml(column.label) + '</span>' +
                    '<span class="orders-board-column-count">' + items.length + '</span>' +
                '</div>' +
                '<div class="orders-board-cards">' + cards + '</div>' +
            '</div>';
        });

        html += '</div>';
        $('#ordersBoardView').html(html);
    }

    $('.orders-tab-btn').on('click', function () {
        var nextIndicator = String($(this).data('indicator') || 'orders').toLowerCase();
        if (nextIndicator !== 'orders' && nextIndicator !== 'amendment') nextIndicator = 'orders';
        if (activeIndicator === nextIndicator) return;

        activeIndicator = nextIndicator;
        applyOrdersTabState();
        loadOrders();
    });

    $('.orders-view-btn').on('click', function () {
        var nextView = String($(this).data('view') || 'list').toLowerCase();
        if (nextView !== 'list' && nextView !== 'board') nextView = 'list';
        ordersViewState[activeIndicator] = nextView;
        applyOrdersViewState();
    });

    function loadDrivers(callback) {
        $.ajax({
            url: '/Admin/Driver/get',
            type: 'GET',
            dataType: 'json',
            success: function (res) {
                drivers = res || [];
                if (callback) callback();
            },
            error: function () {
                drivers = [];
                if (callback) callback();
            }
        });
    }

    function getDriverDropdownOptions() {
        var html = '<option value="">-- Select Driver --</option>';
        (drivers || []).forEach(function (driver) {
            html += '<option value="' + escapeHtml(driver.id) + '">' + escapeHtml(driver.driverName || driver.name || '') + '</option>';
        });
        return html;
    }

    function getBoardDrawerRow(orderId) {
        orderId = Number(orderId);
        return orders.find(function (item) {
            return Number(item.id ?? item.Id) === orderId;
        }) || null;
    }

    function getBoardDrawerStatusMeta(details, row) {
        var source = details && details.order ? details.order : (row || {});
        var statusValue = normalizeOrderStatusValue(source.orderStatus ?? source.OrderStatus ?? source.status ?? source.Status);
        var statusName = String(source.orderStatusName ?? source.OrderStatusName ?? source.statusName ?? source.StatusName ?? '').trim();

        if (!statusName) {
            if (statusValue === 0) statusName = 'Pending';
            else if (statusValue === 1) statusName = 'In Kitchen';
            else if (statusValue === 2) statusName = 'Ready for Delivery';
            else if (statusValue === 3) statusName = 'Assigned for Driver';
            else if (statusValue === 4) statusName = 'Delivered';
            else if (statusValue === 7) statusName = 'Cancelled';
            else if (statusValue === 8) statusName = 'Amended';
            else statusName = 'Unknown';
        }

        var badgeClass = 'badge-unknown';
        if (statusValue === 0) badgeClass = 'badge-pending';
        else if (statusValue === 1) badgeClass = 'badge-in-kitchen';
        else if (statusValue === 2) badgeClass = 'badge-ready-for-delivery';
        else if (statusValue === 3) badgeClass = 'badge-assigned-for-driver';
        else if (statusValue === 4) badgeClass = 'badge-delivered';
        else if (statusValue === 7) badgeClass = 'badge-cancelled';
        else if (statusValue === 8) badgeClass = 'badge-amended';

        return {
            value: statusValue,
            name: statusName,
            badgeClass: badgeClass
        };
    }

    function boardDrawerValue(value, fallback) {
        var text = String(value == null ? '' : value).trim();
        return text || String(fallback || '-');
    }

    function renderBoardDrawerKeyValue(label, value) {
        return '<div class="orders-board-drawer-kv-row">' +
            '<span class="orders-board-drawer-kv-label">' + escapeHtml(label) + '</span>' +
            '<span class="orders-board-drawer-kv-value">' + escapeHtml(boardDrawerValue(value, '-')) + '</span>' +
            '</div>';
    }

    function renderBoardDrawerSummary(details) {
        var order = details && details.order ? details.order : {};
        var eventInfo = details && details.event ? details.event : {};
        var balanceAmount = Number(order.balanceAmount ?? order.BalanceAmount ?? 0) || 0;
        var paidAmount = Number(order.paidAmount ?? order.PaidAmount ?? 0) || 0;
        var totalAmount = Number(order.totalAmount ?? order.TotalAmount ?? 0) || 0;
        var eventAddress = readDetailValue(eventInfo, ['EventAddress', 'Address'], readDetailValue(order, ['DeliveryAddress', 'CustomerAddress'], '-'));
        var customerAddress = readDetailValue(order, ['CustomerAddress', 'Address'], '-');
        var contactPhone = readDetailValue(order, ['MobileNo', 'Phone', 'ContactNo'], readDetailValue(eventInfo, ['AlternateMobileNo'], '-'));
        var contactEmail = readDetailValue(order, ['EmailId', 'Email'], '-');

        var html = '<div class="orders-board-drawer-kv">';
        html += renderBoardDrawerKeyValue('Event date', displayDate(readDetailValue(order, ['EventDate'], readDetailValue(eventInfo, ['EventDate'], ''))));
        html += renderBoardDrawerKeyValue('Guests', readDetailValue(order, ['Pax'], '-'));
        html += renderBoardDrawerKeyValue('Event type', readDetailValue(order, ['EventName'], readDetailValue(eventInfo, ['EventName'], '-')));
        html += renderBoardDrawerKeyValue('Meal period', readDetailValue(order, ['MealPeriodName'], readDetailValue(eventInfo, ['ConsumingTime'], '-')));
        html += renderBoardDrawerKeyValue('Delivery', eventAddress);
        html += renderBoardDrawerKeyValue('Customer address', customerAddress);
        html += renderBoardDrawerKeyValue('Mobile', contactPhone);
        html += renderBoardDrawerKeyValue('Email', contactEmail);
        html += '</div>';

        if (balanceAmount > 0) {
            html += '<div class="orders-board-drawer-highlight">' +
                '<div class="orders-board-drawer-highlight-title">Balance due now</div>' +
                '<div class="orders-board-drawer-highlight-text">Paid ' + money(paidAmount) + ' of ' + money(totalAmount) + '. Balance ' + money(balanceAmount) + '.</div>' +
                '</div>';
        }

        return html;
    }

    function renderBoardDrawerItemList(items, sectionTitle, type) {
        items = Array.isArray(items) ? items : [];
        var html = '<div class="orders-board-drawer-group">';
        html += '<div class="orders-board-drawer-section-title">' + escapeHtml(sectionTitle) + '</div>';

        if (!items.length) {
            html += '<div class="orders-board-drawer-empty">No ' + escapeHtml(sectionTitle.toLowerCase()) + ' found.</div></div>';
            return html;
        }

        items.forEach(function (item) {
            var name = readDetailValue(item, ['MenuName', 'DishName', 'ItemName', 'UtensilName', 'AddOnName', 'Name'], '-');
            var category = readDetailValue(item, ['CategoryName', 'Category'], '');
            var qty = readDetailValue(item, ['IncludedQty', 'Qty', 'Quantity'], '');
            var unitPrice = Number(readDetailValue(item, ['Price', 'Rate', 'Amount'], 0)) || 0;

            html += '<div class="orders-board-drawer-item">' +
                '<div class="orders-board-drawer-item-top">' +
                    '<div class="orders-board-drawer-item-title">' + escapeHtml(boardDrawerValue(name, '-')) + '</div>' +
                    (type !== 'included' ? '<div class="orders-board-drawer-item-amount">' + money(unitPrice) + '</div>' : '') +
                '</div>' +
                '<div class="orders-board-drawer-item-meta">' +
                escapeHtml(boardDrawerValue(category, sectionTitle)) +
                (qty !== '' ? ' • Qty ' + escapeHtml(String(qty)) : '') +
                '</div>' +
                '</div>';
        });

        html += '</div>';
        return html;
    }

    function renderBoardDrawerMenu(details) {
        var order = details && details.order ? details.order : {};
        var html = '';

        html += '<div class="orders-board-drawer-group">' +
            '<div class="orders-board-drawer-section-title">Package</div>' +
            '<div class="orders-board-drawer-item">' +
            '<div class="orders-board-drawer-item-top">' +
            '<div class="orders-board-drawer-item-title">' + escapeHtml(boardDrawerValue(readDetailValue(order, ['PackageName'], '-'), '-')) + '</div>' +
            '<div class="orders-board-drawer-item-amount">' + money(readDetailValue(order, ['PackageBaseAmount'], 0)) + '</div>' +
            '</div>' +
            '<div class="orders-board-drawer-item-meta">Pax ' + escapeHtml(String(readDetailValue(order, ['Pax'], '-'))) + '</div>' +
            '</div>' +
            '</div>';

        html += renderBoardDrawerItemList(details && details.includedItems, 'Included menu', 'included');
        html += renderBoardDrawerItemList(details && details.extraItems, 'Extra items', 'extra');
        html += renderBoardDrawerItemList(details && details.addOns, 'Add-ons', 'addon');
        html += renderBoardDrawerItemList(details && details.utensils, 'Utensils', 'utensil');

        return html;
    }

    function renderBoardDrawerPayment(details) {
        var order = details && details.order ? details.order : {};
        var reminderOrder = boardDrawerState.orderRow || order || {};
        var packageBaseAmount = Number(readDetailValue(order, ['PackageBaseAmount'], 0)) || 0;
        var additionalMenuAmount = Number(readDetailValue(order, ['AdditionalMenuAmount'], 0)) || 0;
        var addOnsAmount = Number(readDetailValue(order, ['AddOnsAmount'], 0)) || 0;
        var utensilsAmount = Number(readDetailValue(order, ['UtensilsAmount'], 0)) || 0;
        var taxAmount = Number(readDetailValue(order, ['TaxAmount'], 0)) || 0;
        var paidAmount = Number(readDetailValue(order, ['PaidAmount'], 0)) || 0;
        var balanceAmount = Number(readDetailValue(order, ['BalanceAmount'], 0)) || 0;
        var totalAmount = Number(readDetailValue(order, ['TotalAmount'], 0)) || 0;
        var paymentStatusValue = String(reminderOrder.paymentStatus ?? reminderOrder.PaymentStatus ?? '').trim();
        var isReminderEligible = balanceAmount > 0 && ((paidAmount < totalAmount) || paymentStatusValue === '0' || paymentStatusValue === '1');

        var html = '<div class="orders-board-drawer-kv orders-board-drawer-payment-card">' +
            renderBoardDrawerKeyValue('Package base', money(packageBaseAmount)) +
            renderBoardDrawerKeyValue('Additional menu', money(additionalMenuAmount)) +
            renderBoardDrawerKeyValue('Add-ons', money(addOnsAmount)) +
            renderBoardDrawerKeyValue('Utensils / setup', money(utensilsAmount)) +
            renderBoardDrawerKeyValue('GST', money(taxAmount)) +
            renderBoardDrawerKeyValue('Paid', money(paidAmount)) +
            renderBoardDrawerKeyValue('Balance', money(balanceAmount)) +
            '<div class="orders-board-drawer-kv-row orders-board-drawer-total">' +
            '<span class="orders-board-drawer-kv-label">Total</span>' +
            '<span class="orders-board-drawer-kv-value orders-board-drawer-money">' + money(totalAmount) + '</span>' +
            '</div>' +
            '</div>';

        if (isReminderEligible) {
            html += '<div class="orders-board-drawer-highlight orders-board-drawer-highlight-payment">' +
                '<div class="orders-board-drawer-highlight-title">Balance due now</div>' +
                '<div class="orders-board-drawer-highlight-text">Paid ' + money(paidAmount) + ' of ' + money(totalAmount) + '. Balance ' + money(balanceAmount) + '.</div>' +
                '</div>' +
                '<div class="orders-board-drawer-payment-actions">' +
                '<button type="button" class="orders-board-drawer-reminder-btn" onclick="openBoardOrderReminder()">Send Payment Reminder</button>' +
                '</div>';
        }

        return html;
    }

    function renderBoardDrawerLoader() {
        return '<div class="orders-board-drawer-loader">' +
            '<div class="orders-board-drawer-loader-card">' +
                '<div class="orders-board-drawer-loader-line orders-board-drawer-loader-line--title"></div>' +
                '<div class="orders-board-drawer-loader-line orders-board-drawer-loader-line--subtitle"></div>' +
            '</div>' +
            '<div class="orders-board-drawer-loader-card">' +
                '<div class="orders-board-drawer-loader-row"><span></span><span></span></div>' +
                '<div class="orders-board-drawer-loader-row"><span></span><span></span></div>' +
                '<div class="orders-board-drawer-loader-row"><span></span><span></span></div>' +
                '<div class="orders-board-drawer-loader-row"><span></span><span></span></div>' +
                '<div class="orders-board-drawer-loader-row"><span></span><span></span></div>' +
            '</div>' +
        '</div>';
    }

    function renderBoardDrawerPrimaryAction(details, row) {
        var statusMeta = getBoardDrawerStatusMeta(details, row);
        var orderId = Number(boardDrawerState.orderId) || 0;
        var nextStatus = 0;
        var buttonText = '';
        var buttonClass = '';

        if (statusMeta.value === 0) {
            nextStatus = 1;
            buttonText = 'Send to Kitchen';
            buttonClass = 'orders-board-drawer-stage-btn-kitchen';
        }
        else if (statusMeta.value === 1) {
            nextStatus = 2;
            buttonText = 'Move to Ready';
            buttonClass = 'orders-board-drawer-stage-btn-ready';
        }
        else if (statusMeta.value === 2) {
            nextStatus = 3;
            buttonText = 'Move to Out for delivery';
            buttonClass = 'orders-board-drawer-stage-btn-driver';
        }

        if (!orderId || !nextStatus || !buttonText) {
            return '';
        }

        return '<button type="button" class="orders-board-drawer-stage-btn ' + buttonClass + '" id="ordersBoardDrawerStageBtn" onclick="ordersBoardAdvanceStatus(this, ' + orderId + ', ' + nextStatus + ')">' +
            '<span class="orders-board-drawer-stage-icon" aria-hidden="true">&#8594;</span>' +
            '<span>' + escapeHtml(buttonText) + '</span>' +
            '</button>';
    }

    function setBoardDrawerActionsLoading(isLoading) {
        $('#ordersBoardDrawerWhatsappBtn, #ordersBoardDrawerEmailBtn, #ordersBoardDrawerDownloadBtn, #ordersBoardDrawerStageBtn')
            .prop('disabled', !!isLoading)
            .toggleClass('is-disabled', !!isLoading);
    }

    function renderBoardOrderDrawer() {
        var details = boardDrawerState.details;
        var row = boardDrawerState.orderRow || {};
        var order = details && details.order ? details.order : row;
        var statusMeta = getBoardDrawerStatusMeta(details, row);
        var orderNumber = readDetailValue(order, ['OrderNumber', 'OrderNo'], row.orderNumber || row.OrderNumber || ('#' + (boardDrawerState.orderId || 0)));
        var customerName = readDetailValue(order, ['CustomerName', 'Name'], row.customerName || row.CustomerName || '-');
        var eventName = readDetailValue(order, ['EventName'], row.eventName || row.EventName || 'Event');

        $('#ordersBoardDrawerOrderNo').text(boardDrawerValue(orderNumber, 'Order'));
        $('#ordersBoardDrawerSubtitle').text(boardDrawerValue(customerName, '-') + ' • ' + boardDrawerValue(eventName, 'Event'));
        $('#ordersBoardDrawerStatus')
            .attr('class', 'badge ' + statusMeta.badgeClass)
            .text(statusMeta.name);

        $('#ordersBoardDrawerPanelSummary').html(renderBoardDrawerSummary(details));
        $('#ordersBoardDrawerPanelMenu').html(renderBoardDrawerMenu(details));
        $('#ordersBoardDrawerPanelPayment').html(renderBoardDrawerPayment(details));
        var primaryActionHtml = renderBoardDrawerPrimaryAction(details, row);
        $('#ordersBoardDrawerPrimaryAction')
            .html(primaryActionHtml)
            .toggleClass('hidden', primaryActionHtml === '');
        setBoardDrawerActionsLoading(false);

        setBoardOrderDrawerTab(boardDrawerState.tab || 'summary');
    }

    function openBoardOrderDrawerInternal(orderId, activeTab) {
        orderId = Number(orderId);
        if (!orderId || !Number.isInteger(orderId)) {
            if (window.showToast) {
                showToast('Invalid order Id.', 3000, { type: 'warning', title: 'View order' });
            }
            return;
        }

        boardDrawerState.orderId = orderId;
        boardDrawerState.orderRow = getBoardDrawerRow(orderId);
        boardDrawerState.details = null;
        boardDrawerState.tab = activeTab || 'summary';
        var loaderHtml = renderBoardDrawerLoader();

        $('#ordersBoardDrawerOrderNo').text('Loading...');
        $('#ordersBoardDrawerSubtitle').text('Fetching order details');
        $('#ordersBoardDrawerStatus').attr('class', 'badge badge-pending').text('Loading');
        $('#ordersBoardDrawerPanelSummary').html(loaderHtml);
        $('#ordersBoardDrawerPanelMenu').html(loaderHtml);
        $('#ordersBoardDrawerPanelPayment').html(loaderHtml);
        $('#ordersBoardDrawerPrimaryAction').addClass('hidden').empty();
        setBoardDrawerActionsLoading(true);

        $('#ordersBoardDrawer').attr('aria-hidden', 'false');
        $('#ordersBoardDrawerOverlay').removeClass('hidden');
        $('body').addClass('orders-board-drawer-open');
        setBoardOrderDrawerTab(boardDrawerState.tab);

        if (!window.AdminOrderShare || typeof window.AdminOrderShare.fetchOrderDetails !== 'function') {
            $('#ordersBoardDrawerPanelSummary').html('<div class="orders-board-drawer-empty">Order details are unavailable.</div>');
            $('#ordersBoardDrawerPrimaryAction').addClass('hidden').empty();
            setBoardDrawerActionsLoading(false);
            return;
        }

        window.AdminOrderShare.fetchOrderDetails(orderId)
            .then(function (details) {
                boardDrawerState.details = details || {};
                renderBoardOrderDrawer();
            })
            .catch(function (error) {
                $('#ordersBoardDrawerPanelSummary').html('<div class="orders-board-drawer-empty">' + escapeHtml(error.message || 'Unable to load order details.') + '</div>');
                $('#ordersBoardDrawerPanelMenu').html('<div class="orders-board-drawer-empty">Unable to load menu details.</div>');
                $('#ordersBoardDrawerPanelPayment').html('<div class="orders-board-drawer-empty">Unable to load payment details.</div>');
                $('#ordersBoardDrawerPrimaryAction').addClass('hidden').empty();
                setBoardDrawerActionsLoading(false);
            });
    }

    function closeBoardOrderDrawer() {
        $('#ordersBoardDrawer').attr('aria-hidden', 'true');
        $('#ordersBoardDrawerOverlay').addClass('hidden');
        $('body').removeClass('orders-board-drawer-open');
    }

    function setBoardOrderDrawerTab(tabName) {
        var tab = String(tabName || 'summary').toLowerCase();
        if (tab !== 'summary' && tab !== 'menu' && tab !== 'payment') {
            tab = 'summary';
        }

        boardDrawerState.tab = tab;
        $('#ordersBoardDrawerTabSummary').toggleClass('active', tab === 'summary');
        $('#ordersBoardDrawerTabMenu').toggleClass('active', tab === 'menu');
        $('#ordersBoardDrawerTabPayment').toggleClass('active', tab === 'payment');
        $('#ordersBoardDrawerPanelSummary').toggleClass('hidden', tab !== 'summary');
        $('#ordersBoardDrawerPanelMenu').toggleClass('hidden', tab !== 'menu');
        $('#ordersBoardDrawerPanelPayment').toggleClass('hidden', tab !== 'payment');
    }

    function openBoardOrderReminder() {
        if (!boardDrawerState.orderId || typeof window.ordersReminder !== 'function') return;
        closeBoardOrderDrawer();
        window.setTimeout(function () {
            window.ordersReminder(boardDrawerState.orderId, true);
        }, 180);
    }

    function ordersBoardAdvanceStatus(buttonElement, orderId, nextStatus) {
        orderId = Number(orderId);
        nextStatus = Number(nextStatus);
        if (!orderId || !nextStatus) return;

        if (nextStatus === 3) {
            closeBoardOrderDrawer();
            showDriverAssignmentModal(orderId);
            return;
        }

        updateOrderStatus(orderId, nextStatus);
    }

    function sendBoardOrderWhatsapp(buttonElement) {
        if (!boardDrawerState.orderId) return;
        window.AdminOrderShare.prepareWhatsappShare(boardDrawerState.orderId, {
            button: buttonElement,
            busyText: 'Preparing...'
        }).catch(function (error) {
            if (window.showToast) {
                showToast(error.message || 'Unable to prepare WhatsApp order details.', 4000, {
                    type: 'error',
                    title: 'WhatsApp failed'
                });
            }
        });
    }

    function sendBoardOrderEmail(buttonElement) {
        if (!boardDrawerState.orderId) return;
        window.AdminOrderShare.sendOrderEmail(boardDrawerState.orderId, {
            button: buttonElement,
            busyText: 'Sending...'
        }).catch(function (error) {
            if (window.showToast) {
                showToast(error.message || 'Unable to send order email.', 4000, {
                    type: 'error',
                    title: 'Email failed'
                });
            }
        });
    }

    function downloadBoardOrderPdf(buttonElement) {
        if (!boardDrawerState.orderId) return;
        window.AdminOrderShare.downloadOrderPdf(boardDrawerState.orderId, {
            button: buttonElement,
            busyText: 'Downloading...'
        }).catch(function (error) {
            if (window.showToast) {
                showToast(error.message || 'Unable to download order PDF.', 4000, {
                    type: 'error',
                    title: 'Download failed'
                });
            }
        });
    }

    window.openBoardOrderDrawer = openBoardOrderDrawerInternal;
    window.closeBoardOrderDrawer = closeBoardOrderDrawer;
    window.setBoardOrderDrawerTab = setBoardOrderDrawerTab;
    window.openBoardOrderReminder = openBoardOrderReminder;
    window.ordersBoardAdvanceStatus = ordersBoardAdvanceStatus;
    window.sendBoardOrderWhatsapp = sendBoardOrderWhatsapp;
    window.sendBoardOrderEmail = sendBoardOrderEmail;
    window.downloadBoardOrderPdf = downloadBoardOrderPdf;

    function updateOrderStatus(orderId, status) {
        $.ajax({
            url: '/Admin/Orders/UpdateOrderStatus',
            type: 'POST',
            data: {
                orderId: orderId,
                status: status
            },
            success: function () {
                var currentDrawerOrderId = Number(boardDrawerState.orderId || 0);
                var currentDrawerTab = boardDrawerState.tab || 'summary';
                loadOrders(function () {
                    if (currentDrawerOrderId === Number(orderId) && $('#ordersBoardDrawer').attr('aria-hidden') === 'false') {
                        openBoardOrderDrawerInternal(orderId, currentDrawerTab);
                    }
                });
            },
            error: function () {
                alert('Failed to update order status. Please try again.');
            }
        });
    }

    function showDriverAssignmentModal(orderId) {
        var order = orders.find(function (o) { return Number(o.id ?? o.Id) === Number(orderId); });
        if (!order) return;

        Swal.fire({
            title: '<div class="orders-driver-modal-header"><span class="orders-driver-modal-icon">🚚</span><span>Assign Driver</span></div>',
            html: '<div class="orders-driver-modal-body">' +
                '<div class="orders-driver-modal-subtitle">Select a delivery partner for this order</div>' +
                '<div class="orders-driver-select-wrap">' +
                '<label class="orders-driver-label" for="orderDriverSelect">Driver</label>' +
                '<select id="orderDriverSelect" class="orders-driver-select">' +
                getDriverDropdownOptions() +
                '</select>' +
                '</div>' +
                '</div>',
            showCancelButton: true,
            confirmButtonText: 'Assign Driver',
            cancelButtonText: 'Cancel',
            width: '440px',
            customClass: {
                popup: 'orders-driver-modal',
                confirmButton: 'orders-driver-confirm',
                cancelButton: 'orders-driver-cancel'
            },
            buttonsStyling: false,
            didOpen: function () {
                var $select = $('#orderDriverSelect');
                if ($select.length) {
                    $select.focus();
                }
            }
        }).then(function (result) {
            if (result.isConfirmed) {
                var driverId = $('#orderDriverSelect').val();
                if (!driverId || driverId === '') {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Please select a driver',
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'orders-driver-modal',
                            confirmButton: 'orders-driver-confirm'
                        },
                        buttonsStyling: false
                    });
                    return;
                }
                assignDriverToOrder(orderId, driverId);
            }
        });
    }

    function assignDriverToOrder(orderId, driverId) {
        var order = orders.find(function (o) { return Number(o.id ?? o.Id) === Number(orderId); });
        if (!order) return;

        var logistics = {
            Id: orderId ? parseInt(orderId, 10) : 0,
            OrderDate: order.createdDate || order.CreatedDate || new Date().toISOString(),
            OrderNumber: order.orderNumber || order.OrderNumber || '',
            Location: order.deliveryAddress || order.DeliveryAddress || '',
            DriverId: driverId,
            Status: 0,
            IsActive: true,
            IsDeleted: false,
            CreatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
            UpdatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0
        };

        $.ajax({
            url: '/Admin/Logistics/Create',
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            data: JSON.stringify(logistics),
            success: function (response) {
                if (response.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: response.message,
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#0f5b38',
                        allowOutsideClick: false
                    }).then(function (result) {
                        if (result.isConfirmed) {
                            if (response.whatsappUrl) {
                                window.open(response.whatsappUrl, '_blank');
                            }
                            loadOrders();
                        }
                    });
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Warning',
                        text: response.message,
                        confirmButtonColor: '#0f5b38'
                    });
                }
            },
            error: function () {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Assignment failed.',
                    confirmButtonColor: '#0f5b38'
                });
            }
        });
    }

    function loadOrders(callback) {
        if (!drivers || drivers.length === 0) {
            loadDrivers(function () {
                performLoadOrders(callback);
            });
        } else {
            performLoadOrders(callback);
        }
    }

    function performLoadOrders(callback) {
        ordersLoading = true;
        showOrdersLoader(true);
        $.ajax({
            url: '/Admin/Orders/get',
            type: 'GET',
            data: {
                fromDate: getOrdersDateValue('#ordersFromDate') || null,
                toDate: getOrdersDateValue('#ordersToDate') || null,
                indicator: isAmendmentTab() ? "amendment" : "orders",
                status: ($('#ordersStatusFilter').val() === '' ? null : Number($('#ordersStatusFilter').val())),
                eventFilter: $('#ordersEventFilter').val() || null
            },
            success: function (rows) {
                orders = Array.isArray(rows) ? rows : [];
                showOrdersLoader(false);
                renderCurrentOrdersView();
                if (typeof callback === 'function') {
                    callback(orders);
                }
            },
            error: function (xhr) {
                orders = [];
                var message = xhr.responseJSON?.message || (isAmendmentTab() ? 'Unable to load amendment history.' : 'Unable to load orders.');
                $('#ordersContainer').html('<div class="muted">' + escapeHtml(message) + '</div>');
                $('#ordersBoardView').html('<div class="muted">' + escapeHtml(message) + '</div>');
                showOrdersLoader(false);
            },
            complete: function () {
                ordersLoading = false;
                showOrdersLoader(false);
                renderCurrentOrdersView();
            }
        });
    }

    function showOrdersLoader(show) {
        var $panel = $('#ordersListPanel .pageloaderpanel');
        if (!$panel.length) return;

        $panel.toggleClass('hidden', !show);

        if (show) {
            $('#ordersListPanel .table-wrap').addClass('hidden');
            $('#ordersBoardView').addClass('hidden');
            return;
        }

        var isBoard = ordersViewState[activeIndicator] === 'board';
        $('#ordersListPanel .table-wrap').toggleClass('hidden', isBoard);
        $('#ordersBoardView').toggleClass('hidden', !isBoard);
    }

    $('#ordersFromDate, #ordersToDate, #ordersStatusFilter, #ordersEventFilter').on('change', function () {
        var fromDate = getOrdersDateValue('#ordersFromDate');
        var toDate = getOrdersDateValue('#ordersToDate');
        var fromDateObj = parseOrdersDate(fromDate);
        var toDateObj = parseOrdersDate(toDate);

        if (fromDateObj && toDateObj && fromDateObj > toDateObj) {
            if (window.showToast) {
                showToast('From date was later than To date. It has been auto-corrected.', 3000, { type: 'warning', title: 'Invalid Date' });
            }
            setOrdersDateValue('#ordersToDate', fromDate);
        }

        syncOrdersDateBounds();
        loadOrders();
    });

    $('#ordersSearch').on('input keyup', function () {
        var searchValue = $(this).val() || '';
        if (ordersLoading) {
            return;
        }

        if (ordersViewState[activeIndicator] === 'board') {
            renderCurrentOrdersView();
            return;
        }

        if (typeof window.applyDataTableSearch === 'function') {
            window.applyDataTableSearch('ordersTable', searchValue);
        }
    });

    $(document).on('change', '#ordersSelectAll', function () {
        var checked = $(this).prop('checked');
        $('#ordersTable tbody .orders-row-select').prop('checked', checked);
        syncOrdersSelectAllState();
    });

    $(document).on('change', '#ordersTable tbody .orders-row-select', function () {
        syncOrdersSelectAllState();
    });

    $('#btnOrdersPrintLabels').on('click', function () {
        window.ordersPrintLabels();
    });

    function money(value) {
        return 'S$' + (Number(value) || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function displayDate(value) {
        if (!value) return '-';
        var date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toLocaleDateString('en-CA');
    }

    function escapeHtml(value) {
        return $('<div>').text(value ?? '').html();
    }

    function cssName(value) {
        return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    function setPrintLabelsButtonBusy(isBusy, statusText) {
        var $button = $('#btnOrdersPrintLabels');
        if (!$button.length) return;

        if (isBusy) {
            if (!$button.data('defaultHtml')) {
                $button.data('defaultHtml', $button.html());
            }
            var labelText = String(statusText || 'Preparing labels...');
            $button.prop('disabled', true).html('<span aria-hidden="true">&#8635;</span><span>' + escapeHtml(labelText) + '</span>');
            return;
        }

        var defaultHtml = $button.data('defaultHtml');
        $button.prop('disabled', false);
        if (defaultHtml) {
            $button.html(defaultHtml);
        }
    }

    function updatePrintLoaderWindow(printWindow, completed, total) {
        if (!printWindow || printWindow.closed) return;
        try {
            var doc = printWindow.document;
            var countNode = doc.getElementById('labelLoadCount');
            var barNode = doc.getElementById('labelLoadBar');
            var pctNode = doc.getElementById('labelLoadPct');
            if (!countNode) return;

            var safeTotal = Math.max(Number(total) || 0, 1);
            var safeCompleted = Math.min(Math.max(Number(completed) || 0, 0), safeTotal);
            var percent = Math.round((safeCompleted / safeTotal) * 100);

            countNode.textContent = 'Loading ' + completed + '/' + total + ' order(s)';
            if (barNode) {
                barNode.style.width = percent + '%';
            }
            if (pctNode) {
                pctNode.textContent = percent + '%';
            }
        } catch (_error) {
        }
    }

    function getSelectedOrderIds() {
        var ids = [];
        $('#ordersTable tbody .orders-row-select:checked').each(function () {
            var id = Number($(this).data('orderId'));
            if (id && Number.isInteger(id)) {
                ids.push(id);
            }
        });
        return Array.from(new Set(ids));
    }

    function syncOrdersSelectAllState() {
        var $checkboxes = $('#ordersTable tbody .orders-row-select');
        var $selectAll = $('#ordersSelectAll');
        if (!$selectAll.length) return;

        var total = $checkboxes.length;
        var checked = $checkboxes.filter(':checked').length;
        $selectAll.prop('checked', total > 0 && checked === total);
        $selectAll.prop('indeterminate', checked > 0 && checked < total);
    }

    function readDetailValue(record, names, fallback) {
        var row = record || {};
        var defaultValue = arguments.length >= 3 ? fallback : '';
        for (var i = 0; i < names.length; i++) {
            var target = cssName(names[i]);
            var key = Object.keys(row).find(function (candidate) {
                return cssName(candidate) === target;
            });
            if (key && row[key] !== null && row[key] !== undefined) {
                return row[key];
            }
        }
        return defaultValue;
    }

    function normalizeLabelDetailsList(payload) {
        var details = payload && payload.details ? payload.details : payload;
        if (!details) return [];

        if (Array.isArray(details)) {
            return details;
        }

        if (Array.isArray(details.orders)) {
            return details.orders;
        }

        if (Array.isArray(details.orderDetails)) {
            return details.orderDetails;
        }

        if (details.order || details.includedItems || details.extraItems || details.addOns || details.utensils) {
            return [details];
        }

        return [];
    }

    function buildOrderLabelItems(details) {
        var head = details && details.order ? details.order : {};
        var orderNumber = String(readDetailValue(head, ['OrderNumber', 'OrderNo'], '') || '').trim();
        var customerName = String(readDetailValue(head, ['CustomerName', 'Name'], '-') || '-').trim();
        var mobileNo = String(readDetailValue(head, ['MobileNo', 'Phone', 'ContactNo'], '-') || '-').trim();
        var emailId = String(readDetailValue(head, ['EmailId', 'Email'], '-') || '-').trim();
        var packageName = String(readDetailValue(head, ['PackageName', 'Package'], '-') || '-').trim();
        var locationName = String(readDetailValue(head, ['LocationName', 'Location'], '-') || '-').trim();
        var mealPeriodName = String(readDetailValue(head, ['MealPeriodName', 'MealPeriod'], '-') || '-').trim();
        var eventDate = displayDate(readDetailValue(head, ['EventDate'], readDetailValue(head, ['OrderDate'], null)));
        var items = [];

        (details.includedItems || []).forEach(function (item) {
            items.push({
                type: 'Included',
                name: String(readDetailValue(item, ['MenuName', 'DishName', 'Dish'], '-') || '-').trim(),
                category: String(readDetailValue(item, ['CategoryName', 'Category'], '-') || '-').trim(),
                qty: Number(readDetailValue(item, ['IncludedQty', 'Qty'], 1)) || 1
            });
        });

        (details.extraItems || []).forEach(function (item) {
            items.push({
                type: 'Extra',
                name: String(readDetailValue(item, ['MenuName', 'ItemName', 'Item'], '-') || '-').trim(),
                category: String(readDetailValue(item, ['CategoryName', 'Category'], '-') || '-').trim(),
                qty: Number(readDetailValue(item, ['Qty'], 1)) || 1
            });
        });

        if (!items.length) {
            items.push({
                type: 'Order',
                name: 'No menu items found',
                category: '-',
                qty: 1
            });
        }

        return items.map(function (item) {
            return {
                orderNumber: orderNumber || '',
                customerName: customerName,
                mobileNo: mobileNo,
                emailId: emailId,
                packageName: packageName,
                locationName: locationName,
                mealPeriodName: mealPeriodName,
                eventDate: eventDate,
                type: item.type,
                name: item.name,
                category: item.category,
                qty: item.qty
            };
        });
    }

    function getLabelBrandingInfo() {
        var defaultName = 'Gayatri Catering';
        var defaultContact = '+65 6294 6294';
        var defaultAddress = '122 Race Course Road #01-01, Singapore 218583';
        var logoUrl = window.location.origin + '/images/logo.jpg';

        var footerName = $('.app-footer .footer-logo').first().text().trim();
        var footerContactLines = $('.app-footer .footer-contact div').map(function () {
            return $(this).text().trim();
        }).get().filter(function (line) {
            return !!line;
        });

        var contactText = footerContactLines[0] || '';
        var addressText = footerContactLines[1] || '';

        contactText = contactText.replace(/^Contact\s*:\s*/i, '').trim();

        return {
            name: footerName || defaultName,
            contact: contactText || defaultContact,
            address: addressText || defaultAddress,
            logoUrl: logoUrl
        };
    }

    function buildMenuLabelCards(detailsList, branding) {
        var brand = branding || getLabelBrandingInfo();
        var cards = [];
        detailsList.forEach(function (details) {
            buildOrderLabelItems(details).forEach(function (item) {
                cards.push(
                    '<div class="label-card">' +
                    '<div class="label-corner label-corner-left" aria-hidden="true"></div>' +
                    '<div class="label-corner label-corner-right" aria-hidden="true"></div>' +
                    '<div class="label-side label-side-top">' +
                    '<div class="label-side-inner label-rotated">' +
                    '<div class="label-brand">' +
                    '<img src="' + escapeHtml(brand.logoUrl) + '" alt="' + escapeHtml(brand.name) + '">' +
                    '<div class="label-brand-text">' +
                    '<div class="label-brand-name">' + escapeHtml(brand.name) + '</div>' +
                    '<div class="label-brand-line">Contact: ' + escapeHtml(brand.contact) + '</div>' +
                    '<div class="label-brand-line">' + escapeHtml(brand.address) + '</div>' +
                    '</div>' +
                    '</div>' +
                    '<div class="label-meta-primary">' + escapeHtml(item.orderNumber || 'Order') + ' | QTY ' + escapeHtml(String(item.qty || 1)) + '</div>' +
                    '<div class="label-dish">' + escapeHtml(item.name) + '</div>' +
                    '<div class="label-meta-secondary">' + escapeHtml(item.packageName || '-') + '</div>' +
                    '</div>' +
                    '</div>' +
                    '<div class="label-center-pattern" aria-hidden="true"><span class="label-center-diamond"></span></div>' +
                    '<div class="label-side label-side-bottom">' +
                    '<div class="label-side-inner">' +
                    '<div class="label-meta-primary">' + escapeHtml(item.type) + ' | ' + escapeHtml(item.mealPeriodName || '-') + '</div>' +
                    '<div class="label-dish">' + escapeHtml(item.name) + '</div>' +
                    '<div class="label-meta-secondary">' + escapeHtml(item.locationName || '-') + ' | ' + escapeHtml(item.category || '-') + '</div>' +
                    '<div class="label-brand">' +
                    '<img src="' + escapeHtml(brand.logoUrl) + '" alt="' + escapeHtml(brand.name) + '">' +
                    '<div class="label-brand-text">' +
                    '<div class="label-brand-name">' + escapeHtml(brand.name) + '</div>' +
                    '<div class="label-brand-line">Contact: ' + escapeHtml(brand.contact) + '</div>' +
                    '<div class="label-brand-line">' + escapeHtml(brand.address) + '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>'
                );
            });
        });
        return cards;
    }

    function requestOrderDetails(orderId) {
        return fetch('/Admin/ViewOrderDetails/get?orderId=' + encodeURIComponent(orderId), {
            headers: { 'Accept': 'application/json' }
        }).then(async function (response) {
            var payload = await response.json();
            if (!response.ok || !payload || !payload.success) {
                throw new Error((payload && payload.message) ? payload.message : 'Unable to load order details right now. Please try again.');
            }
            return payload;
        });
    }

    async function fetchLabelDetailsForOrders(orderIds, onProgress) {
        var ids = Array.from(new Set((orderIds || []).map(function (value) {
            return Number(value);
        }).filter(function (value) {
            return value && Number.isInteger(value);
        })));

        if (!ids.length) {
            return { detailsList: [], failedIds: [] };
        }

        var total = ids.length;
        var completed = 0;
        var progressCallback = typeof onProgress === 'function' ? onProgress : null;

        if (progressCallback) {
            progressCallback(0, total);
        }

        var settled = await Promise.allSettled(ids.map(function (orderId) {
            return requestOrderDetails(orderId).then(function (payload) {
                var detailsList = normalizeLabelDetailsList(payload);
                return detailsList.length ? detailsList[0] : null;
            }).finally(function () {
                completed += 1;
                if (progressCallback) {
                    progressCallback(completed, total);
                }
            });
        }));

        var details = [];
        var failedIds = [];

        settled.forEach(function (result, index) {
            if (result.status === 'fulfilled' && result.value) {
                details.push(result.value);
            } else {
                failedIds.push(ids[index]);
            }
        });

        return { detailsList: details, failedIds: failedIds };
    }

    function openPrintWindow(title, bodyHtml, printWindowRef) {
        var printWindow = printWindowRef || window.open('', '_blank', 'width=1200,height=900');
        if (!printWindow) {
            if (window.showToast) {
                showToast('Unable to open print window.', 3000, { type: 'error', title: 'Print failed' });
            }
            return;
        }

        printWindow.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + escapeHtml(title) + '</title>');
        printWindow.document.write('<style>body{font-family:Georgia,Times New Roman,serif;margin:6mm;color:#1f2937;background:#fff}.labels-grid{display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:8px;align-items:stretch}.label-card{position:relative;display:flex;flex-direction:column;border:1px solid #f3b4a6;border-radius:10px;overflow:hidden;break-inside:avoid;aspect-ratio:1.24;min-height:252px;background:radial-gradient(circle at 15% 12%,#fff0ec 0,#fff8f6 36%,#ffffff 100%)}.label-card:before,.label-card:after{content:"";position:absolute;left:0;right:0;height:18px;pointer-events:none;background-image:radial-gradient(circle,#fb923c 35%,transparent 37%);background-size:10px 10px;opacity:.92;z-index:0}.label-card:before{top:0}.label-card:after{bottom:0}.label-corner{position:absolute;top:20px;bottom:20px;width:42px;pointer-events:none;opacity:.78;z-index:0}.label-corner-left{left:0;background:radial-gradient(circle at 0 50%,transparent 32px,#fb6b2d 33px,#fb6b2d 34px,transparent 35px),radial-gradient(circle,#fb6b2d 28%,transparent 30%);background-size:100% 100%,14px 14px;background-position:left center,left top}.label-corner-right{right:0;background:radial-gradient(circle at 100% 50%,transparent 32px,#fb6b2d 33px,#fb6b2d 34px,transparent 35px),radial-gradient(circle,#fb6b2d 28%,transparent 30%);background-size:100% 100%,14px 14px;background-position:right center,right top}.label-side{position:relative;z-index:1;flex:1;display:flex;align-items:center;justify-content:center;padding:8px 28px}.label-side-inner{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;width:100%;max-width:100%;gap:3px}.label-rotated{transform:rotate(180deg)}.label-meta-primary{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#9a3412;font-family:Segoe UI,Arial,sans-serif;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.label-meta-secondary{font-size:9px;color:#0f766e;font-family:Segoe UI,Arial,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.label-dish{color:#166534;font-weight:700;font-size:30px;line-height:1.08;max-height:66px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;text-wrap:balance}.label-center-pattern{position:relative;z-index:1;height:26px;background-image:radial-gradient(circle,#fb923c 34%,transparent 36%);background-size:10px 10px;background-color:#fff7f5;display:flex;align-items:center;justify-content:center}.label-center-diamond{display:inline-block;width:34px;height:34px;transform:rotate(45deg);border:1px solid #f39c87;background:radial-gradient(circle,#fff 0,#fff 35%,#ffe9e2 100%)}.label-brand{display:flex;align-items:flex-start;justify-content:center;gap:6px;margin-top:2px;max-width:100%}.label-brand img{width:auto;height:auto;max-width:42px;max-height:34px;object-fit:contain;object-position:center;background:#fff;border-radius:6px;border:1px solid #f6cbc0;padding:1px;flex:0 0 auto;box-shadow:0 1px 0 rgba(255,255,255,.8)}.label-brand-text{text-align:left;max-width:128px}.label-brand-name{font-size:9px;line-height:1.15;color:#166534;font-weight:800;font-family:Segoe UI,Arial,sans-serif;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.label-brand-line{font-size:7px;line-height:1.2;color:#334155;font-family:Segoe UI,Arial,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}@media print{body{margin:5mm}.labels-grid{grid-template-columns:repeat(3,1fr);gap:7px}.label-card{aspect-ratio:1.22;min-height:238px}.label-side{padding:7px 24px}.label-dish{font-size:27px;max-height:60px}.label-brand img{max-width:38px;max-height:30px;width:auto;height:auto;object-fit:contain;object-position:center;background:#fff;padding:1px}.label-brand-text{max-width:116px}}</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(bodyHtml);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    window.ordersPrintLabels = async function () {
        if ($('#btnOrdersPrintLabels').prop('disabled')) {
            return;
        }

        var selectedIds = getSelectedOrderIds();
        if (!selectedIds.length) {
            if (window.showToast) {
                showToast('Select one or more orders first.', 3000, { type: 'warning', title: 'Print Labels' });
            }
            return;
        }

        setPrintLabelsButtonBusy(true, 'Preparing labels...');

        // Open immediately from user click to avoid popup blockers during async fetch.
        var printWindow = window.open('', '_blank', 'width=1200,height=900');
        if (!printWindow) {
            if (window.showToast) {
                showToast('Unable to open print window.', 3000, { type: 'error', title: 'Print failed' });
            }
            setPrintLabelsButtonBusy(false);
            return;
        }

        printWindow.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Preparing labels</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif;color:#1f2937}.loader-wrap{text-align:center;padding:24px 28px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;box-shadow:0 12px 30px rgba(15,23,42,.08);min-width:320px}.loader-pulse{position:relative;width:42px;height:42px;margin:0 auto 12px}.loader-pulse:before,.loader-pulse:after{content:"";position:absolute;inset:0;border-radius:999px;border:2px solid rgba(37,99,235,.25);animation:pulse 1.5s ease-out infinite}.loader-pulse:after{animation-delay:.45s}.loader-orb{position:absolute;inset:9px;border-radius:999px;background:radial-gradient(circle at 30% 30%,#93c5fd 0%,#3b82f6 55%,#2563eb 100%);box-shadow:0 4px 12px rgba(37,99,235,.32)}.loader-title{font-weight:700;font-size:15px;margin-bottom:6px}.loader-sub{font-size:12px;color:#64748b}.loader-progress{height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin:12px 0 6px}.loader-progress-fill{height:100%;width:0%;background:linear-gradient(90deg,#2563eb 0%,#0ea5e9 100%);transition:width .25s ease}.loader-pct{font-size:11px;font-weight:700;color:#334155}@keyframes pulse{0%{transform:scale(.68);opacity:.85}70%{transform:scale(1.15);opacity:0}100%{transform:scale(1.15);opacity:0}}</style></head><body><div class="loader-wrap"><div class="loader-pulse"><div class="loader-orb"></div></div><div class="loader-title">Preparing labels...</div><div class="loader-sub" id="labelLoadCount">Loading 0/' + escapeHtml(String(selectedIds.length)) + ' order(s)</div><div class="loader-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div class="loader-progress-fill" id="labelLoadBar"></div></div><div class="loader-pct" id="labelLoadPct">0%</div></div></body></html>');
        printWindow.document.close();

        try {
            var result = await fetchLabelDetailsForOrders(selectedIds, function (completed, total) {
                setPrintLabelsButtonBusy(true, 'Loading ' + completed + '/' + total + '...');
                updatePrintLoaderWindow(printWindow, completed, total);
            });
            var detailsList = result.detailsList || [];

            if (!detailsList.length) {
                try { printWindow.close(); } catch (_error) { }
                if (window.showToast) {
                    showToast('Unable to load selected order details for label printing.', 3000, { type: 'error', title: 'Print Labels' });
                }
                return;
            }

            var branding = getLabelBrandingInfo();
            var cards = buildMenuLabelCards(detailsList, branding).join('');
            var html = '<div class="labels-grid">' + cards + '</div>';

            openPrintWindow('Order Labels', html, printWindow);

            if (result.failedIds && result.failedIds.length && window.showToast) {
                showToast('Some selected orders could not be loaded for label printing.', 3500, { type: 'warning', title: 'Print Labels' });
            }
        } catch (error) {
            try { printWindow.close(); } catch (_error) { }
            if (window.showToast) {
                showToast(error.message || 'Unable to print selected order labels.', 3500, { type: 'error', title: 'Print Labels failed' });
            }
        } finally {
            setPrintLabelsButtonBusy(false);
        }
    };

    function getReOrderButtonHtml() {
        return '<span class="action-icon action-icon-text" aria-hidden="true">&#8635;</span><span class="orders-action-label">Re Order</span>';
    }

    function getStatusActionHtml(status) {
        if (Number(status) === 1) {
            return '<span class="action-icon action-icon-text" aria-hidden="true">&#127859;</span><span class="orders-action-label">Send to Kitchen</span>';
        }
        if (Number(status) === 7) {
            return '<span class="action-icon action-icon-text" aria-hidden="true">&#10005;</span><span class="orders-action-label">Cancel</span>';
        }
        return 'Update Status';
    }

    function renderOrders(rows) {
        var html = '';
        var showRefNo = isAmendmentTab();
        rows.forEach(function (o, index) {
            var serial = index + 1;
            var orderDate = o.createdDate || o.CreatedDate || null;
            var eventDate = o.eventDate || o.EventDate || null;
            var refNo = o.refNo || o.RefNo || '-';
            var orderStatus = Number(o.orderStatus ?? o.OrderStatus ?? 0);
            var orderStatusLabel = 'Unknown';
            var orderStatusBadge = 'badge-unknown';

            var paymentStatus = Number(o.paymentStatus ?? o.paymentStatus ?? 0);
            var paymentStatusLabel = 'Pending';

            var paidAmount = Number(o.paidAmount) || 0;
            var totalAmount = Number(o.totalAmount) || 0;
            var balanceAmount = Math.max(0, totalAmount - paidAmount);
            var backendRefundedAmount = Number(o.refundedAmount ?? o.RefundedAmount) || 0;
            var refundDue = isAmendmentTab()
                ? Math.max(backendRefundedAmount, paidAmount - totalAmount, 0)
                : Math.max(0, paidAmount - totalAmount);
      
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
                orderStatusLabel = 'Cancel Order';
                orderStatusBadge = 'badge-cancelled';
            }
            else if (orderStatus == 8) {
                orderStatusLabel = 'Amended';
                orderStatusBadge = 'badge-amended';
            }

            if (paymentStatus === 1) {
                paymentStatusLabel = 'Partially Paid';
            } else if (paymentStatus === 2) {
                paymentStatusLabel = 'Paid';
            }
            if (refundDue > 0) {
                paymentStatusLabel = 'Refund Due';
            }

            var actionItems = '';

            actionItems += '<button type="button" class="action-item orders-action-view" onclick="ordersView(' + o.id + ')">' +
                '<span class="action-icon action-icon-text" aria-hidden="true">&#128065;</span><span class="orders-action-label">View</span></button>';

            if (balanceAmount > 0 && orderStatus != 2 && orderStatus != 3 && orderStatus != 4 && orderStatus != 7 && orderStatus != 8) {
                actionItems += '<button type="button" class="action-item orders-action-payment" onclick="ordersPayBalance(this, ' + o.id + ')">' +
                    '<span class="action-icon action-icon-text" aria-hidden="true">&#128179;</span><span class="orders-action-label">Pay Balance</span></button>';
            }

            if (orderStatus != 7 && orderStatus != 8 && (paymentStatus === 0 || paymentStatus === 1)) {
                actionItems += '<button type="button" class="action-item orders-action-reminder" onclick="ordersReminder(' + o.id + ')">' +
                    '<span class="action-icon action-icon-text" aria-hidden="true">&#128276;</span><span class="orders-action-label">Send Reminder</span></button>';
            }

            if (orderStatus == 0) {
                actionItems += '<button type="button" class="action-item orders-action-kitchen" onclick="ordersUpdateStatus(this, ' + o.id + ', 1)">' +
                    '<span class="action-icon action-icon-text" aria-hidden="true">&#127859;</span><span class="orders-action-label">Send to Kitchen</span></button>';
            }

            if (orderStatus != 1 && orderStatus != 2 && orderStatus != 3 && orderStatus != 4 && orderStatus != 7 && orderStatus != 8) {
                actionItems += '<button type="button" class="action-item orders-action-cancel" onclick="ordersUpdateStatus(this, ' + o.id + ', 7)">' +
                    '<span class="action-icon action-icon-text" aria-hidden="true">&#10005;</span><span class="orders-action-label">Cancel</span></button>';
                actionItems += '<button type="button" class="action-item orders-action-amendment" onclick="ordersAmendment(' + o.id + ')">' +
                    '<span class="action-icon action-icon-text" aria-hidden="true">&#9998;</span><span class="orders-action-label">Amendment</span></button>';
            }

            actionItems += '<button type="button" class="action-item orders-action-reorder" onclick="ordersReOrder(this, ' + o.id + ')">' +
                getReOrderButtonHtml() + '</button>';
            actionItems += '<button type="button" class="action-item orders-action-wa" onclick="ordersWhatsapp(this, ' + o.id + ')">' +
                '<span class="action-icon action-icon-text" aria-hidden="true">&#128172;</span><span class="orders-action-label">WhatsApp</span></button>';
            actionItems += '<button type="button" class="action-item orders-action-email" onclick="ordersEmail(this, ' + o.id + ')">' +
                '<span class="action-icon action-icon-text" aria-hidden="true">&#9993;</span><span class="orders-action-label">Email</span></button>';
            debugger;
            if (!o.hasDigitalSignature) {
                actionItems += '<button type="button" class="action-item orders-action-signature" onclick="ordersGetSignature(this, ' + o.id + ')">' +
                    '<span class="action-icon action-icon-text" aria-hidden="true">&#9997;</span><span class="orders-action-label">Get Customer Signature</span></button>';
            }

            actionItems += '<button type="button" class="action-item orders-action-download" onclick="ordersDownload(this, ' + o.id + ')">' +
                '<span class="action-icon action-icon-text" aria-hidden="true">&#8681;</span><span class="orders-action-label">Download</span></button>';

            html += '<tr data-order-id="' + Number(o.id || 0) + '">' +
                '<td class="orders-select-col" style="width:44px;text-align:center;"><input type="checkbox" class="orders-row-select" data-order-id="' + o.id + '" aria-label="Select order ' + escapeHtml(o.orderNumber || ('#' + o.id)) + '"></td>' +
                '<td>' + serial + '</td>' +
                '<td><button type="button" class="order-ref-link" onclick="ordersView(' + o.id + ')">' + escapeHtml(o.orderNumber || ('#' + o.id)) + '</button><div class="muted">' + displayDate(orderDate) + '</div></td>' +
                '<td class="orders-refno-col' + (showRefNo ? '' : ' hidden') + '">' + escapeHtml(refNo) + '</td>' +
                '<td><strong>' + escapeHtml(o.customerName) + '</strong><div class="muted">' + escapeHtml(o.mobileNo) + ' &bull; ' + escapeHtml(o.emailId) + '</div></td>' +
                '<td>' + displayDate(eventDate) + '<div class="muted">' + escapeHtml(o.mealPeriodName || '-') + '</div></td>' +
                '<td>' + escapeHtml(o.packageName || '-') + '<div class="muted">Pax: ' + (Number(o.pax) || 0) + ' &bull; ' + escapeHtml(o.locationName || '-') + '</div></td>' +
                '<td><span class="badge ' + orderStatusBadge + '">' + escapeHtml(orderStatusLabel) + '</span></td>' +
                '<td><span class="badge ' + (refundDue > 0 ? 'badge-refund-due' : paymentClass(paymentStatus)) + '">' + escapeHtml(paymentStatusLabel) + '</span><div class="muted">Paid ' + money(paidAmount) + '</div>' + (refundDue > 0 ? '<div class="muted orders-refund-due-text">Refund Due ' + money(refundDue) + '</div>' : '') + '</td>' +
                '<td class="num"><strong>' + money(o.totalAmount) + '</strong></td>' +
                '<td><div class="row-actions order-row-actions">' +
                '<button type="button" class="dots-btn" title="Actions">&#8943;</button>' +
                '<div class="actions-menu hidden">' + actionItems + '</div>' +
                '</div></td>' +
                '</tr>';
        });
        $('#ordersTable tbody').html(html);
        syncOrdersSelectAllState();

        if (typeof renderDataTable === 'function') {
            renderDataTable('ordersTable');
        }
    }

    function paymentClass(payment) {
        if (payment === 2) return 'badge-paid';
        if (payment === 1) return 'badge-partially-paid';
        return 'badge-unpaid';
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

    function openOrder(id) {
        var o = orders.find(function (item) { return Number(item.id) === Number(id); });
        if (!o) return;
        var paymentStatus = 'Pending';
        var orderStatus = 'Unknown';
        var orderStatusValue = Number(o.orderStatus ?? o.OrderStatus ?? 0);
        var orderStatusLabel = String(o.orderStatusName ?? o.OrderStatusName ?? '').trim();
        var paymentStatusValue = String(o.paymentStatus ?? '').trim();

        if (paymentStatusValue === '1') {
            paymentStatus = 'Partially Paid';
        } else if (paymentStatusValue === '2') {
            paymentStatus = 'Paid';
        }

        if (orderStatusValue == 0) {
            orderStatus = 'Pending';
        } else if (orderStatusValue == 1) {
            orderStatus = 'In Kitchen';
        } else if (orderStatusValue == 2) {
            orderStatus = 'Ready for Delivery';
        } else if (orderStatusValue == 3) {
            orderStatus = 'Out for delivery';
        } else if (orderStatusValue == 4) {
            orderStatus = 'Delivered';
        } else if (orderStatusValue == 5) {
            orderStatus = 'Quotation';
        } else if (orderStatusValue == 6) {
            orderStatus = 'Quotation to Order';
        } else if (orderStatusValue == 7) {
            orderStatus = 'Cancel Order';
        } else if (orderStatusValue == 8) {
            orderStatus = 'Amended';
        } else if (orderStatusLabel) {
            orderStatus = orderStatusLabel;
        }

        var html = '<div class="modal-header"><h3>Order ' + escapeHtml(o.orderNumber || ('#' + o.id)) + '</h3><button type="button" class="btn-close" onclick="closeOrder()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<p><strong>Customer:</strong> ' + escapeHtml(o.customerName) + ' <span class="muted">' + escapeHtml(o.mobileNo) + ' &bull; ' + escapeHtml(o.emailId) + '</span></p>' +
            '<p><strong>Package:</strong> ' + escapeHtml(o.packageName || '-') + ' <span class="muted">(' + escapeHtml(o.locationName || '-') + ')</span></p>' +
            '<p><strong>Date:</strong> ' + displayDate(o.eventDate) + ' &bull; ' + escapeHtml(o.mealPeriodName || '-') + ' &bull; <strong>Pax:</strong> ' + (Number(o.pax) || 0) + '</p><hr>' +
            '<p><strong>Status:</strong> ' + escapeHtml(orderStatus) + ' &nbsp; <strong>Payment:</strong> ' + escapeHtml(paymentStatus) + '</p>' +
            '<p><strong>Amount:</strong> ' + money(o.totalAmount) + ' <span class="muted">Paid ' + money(o.paidAmount) + '</span></p>' +
            '</div><div class="modal-footer"><button type="button" class="btn btn-light" onclick="closeOrder()">Close</button></div>';
        openModal(html);
    }

    window.ordersUpdateStatus = function (buttonElement, orderId, status, skipConfirm) {
        if (Number(status) === 1 && !skipConfirm && window.confirmAdminAction) {
            window.confirmAdminAction({
                title: 'Send to Kitchen',
                message: 'Send this order to the kitchen now?',
                confirmText: 'Send to Kitchen'
            }).then(function (confirmed) {
                if (confirmed) window.ordersUpdateStatus(buttonElement, orderId, status, true);
            });
            return;
        }

        if (Number(status) === 7 && !skipConfirm && window.confirmAdminAction) {
            window.confirmAdminAction({
                title: 'Cancel Order',
                message: 'Cancel this order? This will update the order status and send the cancellation email.',
                confirmText: 'Cancel Order',
                danger: true
            }).then(function (confirmed) {
                if (confirmed) window.ordersUpdateStatus(buttonElement, orderId, status, true);
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
        var defaultText = getStatusActionHtml(status);
        var busyText = Number(status) === 7 ? 'Cancelling...' : 'Updating...';
        var successTitle = Number(status) === 7 ? 'Order cancelled' : 'Status updated';
        var failedMessage = Number(status) === 7 ? 'Unable to cancel order.' : 'Unable to update order status.';

        if (!orderId || !Number.isInteger(status)) {
            if (window.showToast) {
                showToast('Invalid order status request.', 3000, { type: 'error', title: 'Update failed' });
            }
            return;
        }

        button.prop('disabled', true).text(busyText);
        $.ajax({
            url: '/Admin/Orders/UpdateOrderStatus?OrderId=' + encodeURIComponent(orderId) + '&Status=' + encodeURIComponent(status),
            type: 'POST',
            success: async function (response) {
                if (response?.success) {
                    if (window.showToast) showToast(response.message || 'Order status updated.', 3000, { type: 'success', title: successTitle });
                    if (status === 7 && window.AdminOrderShare && typeof window.AdminOrderShare.sendOrderEmail === 'function') {
                        try {
                            await window.AdminOrderShare.sendOrderEmail(orderId, { useInvoicePdf: true });
                        } catch (error) {
                            if (window.showToast) {
                                showToast(error.message || 'Order was cancelled, but the cancellation email could not be sent.', 4000, {
                                    type: 'warning',
                                    title: 'Email not sent'
                                });
                            }
                        }
                    }
                    loadOrders();
                } else {
                    if (window.showToast) {
                        showToast(response?.message || failedMessage, 3500, { type: 'error', title: 'Update failed' });
                    }
                    button.prop('disabled', false).html(defaultText);
                }
            },
            error: function (xhr) {
                if (window.showToast) {
                    showToast(xhr.responseJSON?.message || failedMessage, 3500, { type: 'error', title: 'Update failed' });
                }
                button.prop('disabled', false).html(defaultText);
            }
        });
    };

    window.ordersView = function (orderId) {
        orderId = Number(orderId);

        if (!orderId || !Number.isInteger(orderId)) {
            if (window.showToast) {
                showToast('Invalid order Id.', 3000, { type: 'warning', title: 'View Order' });
            }
            return;
        }

        viewOrderDetails(orderId);
    };

    window.ordersPayBalance = function (buttonElement, orderId, skipConfirm) {
        if (!skipConfirm && window.confirmAdminAction) {
            window.confirmAdminAction({
                title: 'Pay Balance',
                message: 'Open the payment popup for the outstanding balance?',
                confirmText: 'Open Payment'
            }).then(function (confirmed) {
                if (confirmed) window.ordersPayBalance(buttonElement, orderId, true);
            });
            return;
        }

        var button = $(buttonElement);
        orderId = Number(orderId);

        if (button.prop('disabled') || orderReOrderInProgress) return;

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
            loadOrders();
            return;
        }

        orderReOrderInProgress = true;
        button.prop('disabled', true).html('Opening...');
        openAdminOrdersPayment({
            orderId: orderId,
            orderNumber: String(selectedOrder.orderNumber ?? selectedOrder.OrderNumber ?? '').trim(),
            button: button,
            email: String(selectedOrder.emailId ?? selectedOrder.EmailId ?? '').trim(),
            totalAmount: totalAmount,
            paidAmount: paidAmount,
            balanceAmount: balanceAmount,
            savedAt: Date.now()
        });
    };

    window.ordersReOrder = function (buttonElement, orderId, skipConfirm) {
        if (!skipConfirm && window.confirmAdminAction) {
            window.confirmAdminAction({
                title: 'Re Order',
                message: 'Create a new re-order from this order before opening payment?',
                confirmText: 'Create Re Order'
            }).then(function (confirmed) {
                if (confirmed) window.ordersReOrder(buttonElement, orderId, true);
            });
            return;
        }

        var button = $(buttonElement);
        orderId = Number(orderId);

        if (button.prop('disabled') || orderReOrderInProgress) return;

        if (!orderId || !Number.isInteger(orderId)) {
            if (window.showToast) {
                showToast('Invalid order Id for Re Order.', 3000, { type: 'warning', title: 'Re Order' });
            }
            return;
        }

        orderReOrderInProgress = true;
        button.prop('disabled', true).html('Creating...');
        $.ajax({
            url: '/Admin/Orders/CreateReOrder?OrderId=' + encodeURIComponent(orderId),
            type: 'POST',
            success: function (response) {
                if (response?.success) {
                    if (window.showToast) {
                        showToast(response.message || 'Order created successfully.', 3000, { type: 'success', title: 'Re Order' });
                    }
                    openAdminOrdersPayment({
                        orderId: Number(response.orderId) || 0,
                        orderNumber: response.orderNumber || '',
                        customerName: response.customerName || '',
                        email: response.email || '',
                        totalAmount: Number(response.totalAmount) || 0
                    });
                } else {
                    if (window.showToast) {
                        showToast(response?.message || 'Unable to create re order.', 3500, { type: 'error', title: 'Re Order failed' });
                    }
                    orderReOrderInProgress = false;
                    button.prop('disabled', false).html(getReOrderButtonHtml());
                }
            },
            error: function (xhr) {
                if (window.showToast) {
                    showToast(xhr.responseJSON?.message || 'Unable to create re order.', 3500, { type: 'error', title: 'Re Order failed' });
                }
                orderReOrderInProgress = false;
                button.prop('disabled', false).html(getReOrderButtonHtml());
            }
        });
    };

    $('#orderModal').on('click', function (event) {
        if (event.target.id === 'orderModal') closeModal();
    });

    window.closeOrder = closeModal;

    window.ordersAmendment = function (orderId, skipConfirm) {
        if (!skipConfirm && window.confirmAdminAction) {
            window.confirmAdminAction({
                title: 'Amendment',
                message: 'Open this order for amendment?',
                confirmText: 'Open Amendment'
            }).then(function (confirmed) {
                if (confirmed) window.ordersAmendment(orderId, true);
            });
            return;
        }

        orderId = Number(orderId);

        if (!orderId || !Number.isInteger(orderId)) {
            if (window.showToast) {
                showToast('Invalid order Id for Amendment.', 3000, { type: 'warning', title: 'Amendment' });
            }
            return;
        }

        $.ajax({
            url: '/Admin/ViewOrderDetails/get',
            type: 'GET',
            data: { orderId: orderId },
            success: function (response) {
                if (response && response.success && response.details) {
                    var selectedOrder = orders.find(function (item) {
                        return Number(item.id) === orderId;
                    }) || {};
                    sessionStorage.setItem('gayatri.amendmentOrder', JSON.stringify({
                        orderId: orderId,
                        paidAmount: Number(selectedOrder.paidAmount) || 0,
                        paymentStatus: Number(selectedOrder.paymentStatus) || 0,
                        details: response.details
                    }));
                    window.location.href = '/Customer/Order?amendmentOrderId=' + encodeURIComponent(orderId);
                } else {
                    showToast('Unable to load order details.', 3000, { type: 'error', title: 'Amendment' });
                }
            },
            error: function (xhr) {
                showToast(xhr.responseJSON?.message || 'Unable to load order details.', 3000, { type: 'error', title: 'Amendment' });
            }
        });
    };

    window.ordersWhatsapp = function (buttonElement, orderId, skipConfirm) {
        if (!skipConfirm && window.confirmAdminAction) {
            window.confirmAdminAction({
                title: 'WhatsApp',
                message: 'Open WhatsApp share for this order?',
                confirmText: 'Open WhatsApp'
            }).then(function (confirmed) {
                if (confirmed) window.ordersWhatsapp(buttonElement, orderId, true);
            });
            return;
        }

        var button = $(buttonElement);
        orderId = Number(orderId);

        if (!orderId || !Number.isInteger(orderId)) {
            if (window.showToast) {
                showToast('Invalid order Id for WhatsApp.', 3000, { type: 'warning', title: 'WhatsApp' });
            }
            return;
        }

        window.AdminOrderShare.prepareWhatsappShare(orderId, { button: buttonElement, busyText: 'Preparing...' })
            .catch(function (error) {
                if (window.showToast) {
                    showToast(error.message || 'Unable to prepare WhatsApp order details.', 4000, {
                        type: 'error',
                        title: 'WhatsApp failed'
                    });
                }
            });
    };

    window.ordersEmail = function (buttonElement, orderId, skipConfirm) {
        if (!skipConfirm && window.confirmAdminAction) {
            window.confirmAdminAction({
                title: 'Email',
                message: 'Send the order email now?',
                confirmText: 'Send Email'
            }).then(function (confirmed) {
                if (confirmed) window.ordersEmail(buttonElement, orderId, true);
            });
            return;
        }

        orderId = Number(orderId);

        if (!orderId || !Number.isInteger(orderId)) {
            if (window.showToast) {
                showToast('Invalid order Id for Email.', 3000, { type: 'warning', title: 'Email' });
            }
            return;
        }

        window.AdminOrderShare.sendOrderEmail(orderId, { button: buttonElement, busyText: 'Sending...' })
            .catch(function (error) {
                if (window.showToast) {
                    showToast(error.message || 'Unable to send order email.', 4000, {
                        type: 'error',
                        title: 'Email failed'
                    });
                }
            });
    };

    window.ordersGetSignature = function (buttonElement, orderId, skipConfirm) {
        orderId = Number(orderId);
        if (!orderId || !Number.isInteger(orderId)) {
            showToast('Invalid order Id.', 3000, { type: 'warning', title: 'Get Customer Signature' });
            return;
        }

        if (!skipConfirm && window.confirmAdminAction) {
            window.confirmAdminAction({
                title: 'Get Customer Signature',
                message: 'Open the customer signature request popup for this order?',
                confirmText: 'Continue'
            }).then(function (confirmed) {
                if (confirmed) window.ordersGetSignature(buttonElement, orderId, true);
            });
            return;
        }

        var selectedOrder = getReminderOrder(orderId);
        if (!selectedOrder) {
            showToast('Unable to find the selected order.', 3000, { type: 'error', title: 'Customer Signature' });
            return;
        }

        var customerName = String(selectedOrder.customerName ?? selectedOrder.CustomerName ?? '-').trim() || '-';
        var orderNumber = String(selectedOrder.orderNumber ?? selectedOrder.OrderNumber ?? ('#' + orderId)).trim();
        var customerEmail = String(selectedOrder.emailId ?? selectedOrder.EmailId ?? '-').trim() || '-';
        var customerMobile = String(selectedOrder.mobileNo ?? selectedOrder.MobileNo ?? '-').trim() || '-';
        var html = '<div class="orders-reminder-modal">' +
            '<div class="orders-reminder-shell">' +
            '<div class="orders-reminder-header"><div class="orders-reminder-heading"><span class="orders-reminder-title-icon" aria-hidden="true">&#9997;</span><div><h3>Get Customer Signature</h3><p>Choose how you want to send the secure signing link.</p></div></div><button type="button" class="btn-close" onclick="closeOrder()" aria-label="Close">&times;</button></div>' +
            '<div class="modal-body orders-reminder-body">' +
            '<div class="orders-reminder-hero"><div class="orders-reminder-hero-copy"><span class="orders-reminder-hero-kicker">Signature request</span><strong>' + escapeHtml(orderNumber) + '</strong><span>' + escapeHtml(customerName) + '</span></div><div class="orders-reminder-hero-balance"><span>Status</span><strong>Awaiting</strong></div></div>' +
            '<div class="orders-reminder-meta-grid">' +
            '<div class="orders-reminder-meta-item"><span class="orders-reminder-label">Order</span><strong>' + escapeHtml(orderNumber) + '</strong></div>' +
            '<div class="orders-reminder-meta-item"><span class="orders-reminder-label">Customer</span><strong>' + escapeHtml(customerName) + '</strong></div>' +
            '<div class="orders-reminder-meta-item"><span class="orders-reminder-label">Email</span><strong>' + escapeHtml(customerEmail) + '</strong></div>' +
            '<div class="orders-reminder-meta-item"><span class="orders-reminder-label">Mobile</span><strong>' + escapeHtml(customerMobile) + '</strong></div></div>' +
            '<p class="orders-reminder-note"><span class="orders-reminder-note-icon" aria-hidden="true">&#8505;</span><span>The customer can review the order, sign, and submit using the secure link. The link expires in 7 days.</span></p>' +
            '</div><div class="modal-footer orders-reminder-footer">' +
            '<button type="button" class="btn btn-light orders-reminder-close-btn" onclick="closeOrder()">Close</button>' +
            buildSignatureRequestButton('email', orderId) + buildSignatureRequestButton('whatsapp', orderId) + buildSignatureRequestButton('both', orderId) +
            '</div></div></div>';
        openModal(html);
    };

    window.ordersDownload = function (buttonElement, orderId, skipConfirm) {
        if (!skipConfirm && window.confirmAdminAction) {
            window.confirmAdminAction({
                title: 'Download',
                message: 'Download order PDF now?',
                confirmText: 'Download'
            }).then(function (confirmed) {
                if (confirmed) window.ordersDownload(buttonElement, orderId, true);
            });
            return;
        }

        orderId = Number(orderId);

        if (!orderId || !Number.isInteger(orderId)) {
            if (window.showToast) {
                showToast('Invalid order Id for Download.', 3000, { type: 'warning', title: 'Download' });
            }
            return;
        }

        window.AdminOrderShare.downloadOrderPdf(orderId, { button: buttonElement, busyText: 'Downloading...' })
            .catch(function (error) {
                if (window.showToast) {
                    showToast(error.message || 'Unable to download order PDF.', 4000, {
                        type: 'error',
                        title: 'Download failed'
                    });
                }
            });
    };

    function normalizeWhatsappNumber(rawValue) {
        var digits = String(rawValue || '').replace(/[^\d]/g, '');
        if (!digits) return '';
        return digits;
    }

    function getReminderOrder(orderId) {
        orderId = Number(orderId);
        return orders.find(function (item) {
            return Number(item.id ?? item.Id) === orderId;
        }) || null;
    }

    function getReminderBalance(order) {
        var totalAmount = Number(order.totalAmount ?? order.TotalAmount) || 0;
        var paidAmount = Number(order.paidAmount ?? order.PaidAmount) || 0;
        return Math.max(0, totalAmount - paidAmount);
    }

    function createReminderPaymentLink(order) {
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

    function createCustomerSignatureLink(order) {
        var orderId = Number(order.id ?? order.Id) || 0;
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: '/Admin/Orders/CreateSignatureLink',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ orderId: orderId }),
                success: function (response) {
                    var signatureUrl = String(response?.signatureUrl || '').trim();
                    if (!signatureUrl) return reject(new Error('Unable to generate signature link.'));
                    resolve(signatureUrl);
                },
                error: function (xhr) {
                    reject(new Error(xhr.responseJSON?.message || 'Unable to generate signature link.'));
                }
            });
        });
    }

    function buildSignatureEmailBody(order, signatureUrl) {
        var customerName = String(order.customerName ?? order.CustomerName ?? 'Customer').trim() || 'Customer';
        var orderNumber = String(order.orderNumber ?? order.OrderNumber ?? ('#' + (order.id ?? order.Id))).trim();
        return '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.6;color:#111827">' +
            '<p>Dear ' + escapeHtml(customerName) + ',</p>' +
            '<p>Please review order <strong>' + escapeHtml(orderNumber) + '</strong> and provide your digital signature.</p>' +
            '<p><a href="' + escapeHtml(signatureUrl) + '" target="_blank" rel="noopener" style="display:inline-block;background:#126b3a;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700">Review and Sign Order</a></p>' +
            '<p>This secure link expires in 7 days.</p><p>Regards,<br>Gayatri Catering</p></div>';
    }

    function sendSignatureEmail(order, signatureUrl) {
        var email = String(order.emailId ?? order.EmailId ?? '').trim();
        if (!email) return Promise.reject(new Error('Customer email is missing for this order.'));
        var orderNumber = String(order.orderNumber ?? order.OrderNumber ?? ('#' + (order.id ?? order.Id))).trim();
        var formData = new FormData();
        formData.append('ToEmail', email);
        formData.append('Subject', 'Signature requested for order ' + orderNumber);
        formData.append('Body', buildSignatureEmailBody(order, signatureUrl));
        return new Promise(function (resolve, reject) {
            $.ajax({ url: '/Common/SendEmail', type: 'POST', data: formData, processData: false, contentType: false,
                success: function () { resolve(); },
                error: function (xhr) { reject(new Error(xhr.responseJSON?.Message || xhr.responseJSON?.message || 'Unable to send signature email.')); }
            });
        });
    }

    function sendSignatureWhatsapp(order, signatureUrl) {
        var phone = normalizeWhatsappNumber(order.mobileNo ?? order.MobileNo);
        if (!phone) throw new Error('Customer mobile number is missing for WhatsApp.');
        var customerName = String(order.customerName ?? order.CustomerName ?? 'Customer').trim() || 'Customer';
        var orderNumber = String(order.orderNumber ?? order.OrderNumber ?? ('#' + (order.id ?? order.Id))).trim();
        var message = ['Hello ' + customerName + ',', '', 'Please review and sign order ' + orderNumber + '.', 'Sign here: ' + signatureUrl, '', 'Regards,', 'Gayatri Catering'].join('\n');
        window.open('https://wa.me/' + encodeURIComponent(phone) + '?text=' + encodeURIComponent(message), '_blank', 'noopener');
    }

    function buildSignatureRequestButton(channel, orderId) {
        var config = reminderChannelConfig(channel);
        return '<button type="button" class="btn orders-reminder-send-btn orders-signature-request-btn orders-reminder-btn-' + channel + '" data-channel="' + channel + '" data-label="' + escapeHtml(config.label) + '" onclick="ordersSendSignatureRequest(\'' + channel + '\',' + Number(orderId) + ')">' +
            '<span class="orders-reminder-btn-icon" aria-hidden="true">' + config.icon + '</span><span class="orders-reminder-btn-text">' + escapeHtml(config.label) + '</span><span class="orders-reminder-btn-loader hidden" aria-hidden="true"><span class="orders-reminder-spinner"></span></span></button>';
    }

    window.ordersSendSignatureRequest = function (channel, orderId) {
        if (signatureRequestInProgress) return;
        var order = getReminderOrder(orderId);
        var normalizedChannel = String(channel || '').toLowerCase();
        if (!order || ['email', 'whatsapp', 'both'].indexOf(normalizedChannel) === -1) {
            showToast('Unable to prepare this signature request.', 3000, { type: 'error', title: 'Customer Signature' });
            return;
        }
        signatureRequestInProgress = true;
        setReminderButtonsBusy(true, normalizedChannel);
        createCustomerSignatureLink(order).then(function (signatureUrl) {
            if (normalizedChannel === 'email') return sendSignatureEmail(order, signatureUrl).then(function () { showToast('Signature request emailed successfully.', 3500, { type: 'success', title: 'Request sent' }); });
            if (normalizedChannel === 'whatsapp') { sendSignatureWhatsapp(order, signatureUrl); showToast('WhatsApp signature request opened.', 3500, { type: 'success', title: 'Request ready' }); return; }
            return sendSignatureEmail(order, signatureUrl).then(function () { sendSignatureWhatsapp(order, signatureUrl); showToast('Email sent and WhatsApp opened.', 3800, { type: 'success', title: 'Request sent' }); });
        }).catch(function (error) {
            showToast(error.message || 'Unable to send signature request.', 4200, { type: 'error', title: 'Request failed' });
        }).finally(function () {
            signatureRequestInProgress = false;
            setReminderButtonsBusy(false);
        });
    };

    function buildReminderEmailBody(order, paymentUrl) {
        var customerName = String(order.customerName ?? order.CustomerName ?? 'Customer').trim() || 'Customer';
        var orderNumber = String(order.orderNumber ?? order.OrderNumber ?? ('#' + (order.id ?? order.Id))).trim();
        var balanceAmount = getReminderBalance(order);
        var eventDate = displayDate(order.eventDate ?? order.EventDate);
        var mealPeriod = String(order.mealPeriodName ?? order.MealPeriodName ?? '-').trim();

        return [
            '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.6;color:#111827;">',
            '<p>Dear ' + escapeHtml(customerName) + ',</p>',
            '<p>This is a friendly payment reminder for your order <strong>' + escapeHtml(orderNumber) + '</strong>.</p>',
            '<p><strong>Outstanding Amount:</strong> ' + escapeHtml(money(balanceAmount)) + '<br>',
            '<strong>Event Date:</strong> ' + escapeHtml(eventDate) + '<br>',
            '<strong>Meal Period:</strong> ' + escapeHtml(mealPeriod) + '</p>',
            '<p>Please complete the remaining payment using this secure link:</p>',
            '<p><a href="' + escapeHtml(paymentUrl) + '" target="_blank" rel="noopener" style="display:inline-block;background:#ea6b1a;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700;">Pay Remaining Amount</a></p>',
            '<p>If you have already made this payment, kindly ignore this reminder.</p>',
            '<p>Regards,<br>Gayatri Catering</p>',
            '</div>'
        ].join('');
    }

    function sendReminderEmail(order, paymentUrl) {
        var toEmail = String(order.emailId ?? order.EmailId ?? '').trim();
        if (!toEmail) {
            return Promise.reject(new Error('Customer email is missing for this order.'));
        }

        var orderNumber = String(order.orderNumber ?? order.OrderNumber ?? ('#' + (order.id ?? order.Id))).trim();
        var formData = new FormData();
        formData.append('ToEmail', toEmail);
        formData.append('Subject', 'Payment Reminder - ' + orderNumber);
        formData.append('Body', buildReminderEmailBody(order, paymentUrl));

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

    function sendReminderWhatsapp(order, paymentUrl) {
        var phone = normalizeWhatsappNumber(order.mobileNo ?? order.MobileNo);
        if (!phone) {
            throw new Error('Customer mobile number is missing for WhatsApp reminder.');
        }

        var customerName = String(order.customerName ?? order.CustomerName ?? 'Customer').trim() || 'Customer';
        var orderNumber = String(order.orderNumber ?? order.OrderNumber ?? ('#' + (order.id ?? order.Id))).trim();
        var balanceAmount = getReminderBalance(order);
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
        return '<button type="button" class="btn orders-reminder-send-btn orders-reminder-btn-' + channel + '" data-channel="' + channel + '" data-label="' + escapeHtml(config.label) + '" onclick="ordersSendReminder(\'' + channel + '\',' + Number(orderId) + ')">' +
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

    window.ordersSendReminder = function (channel, orderId) {
        if (reminderInProgress) return;
        var selectedOrder = getReminderOrder(orderId);
        if (!selectedOrder) {
            showToast('Unable to find the selected order.', 3000, { type: 'error', title: 'Reminder' });
            return;
        }

        var normalizedChannel = String(channel || '').toLowerCase();
        if (['email', 'whatsapp', 'both'].indexOf(normalizedChannel) === -1) {
            showToast('Invalid reminder channel.', 3000, { type: 'error', title: 'Reminder' });
            return;
        }

        reminderInProgress = true;
        setReminderButtonsBusy(true, normalizedChannel);

        createReminderPaymentLink(selectedOrder)
            .then(function (paymentUrl) {
                if (normalizedChannel === 'email') {
                    return sendReminderEmail(selectedOrder, paymentUrl).then(function () {
                        showToast('Payment reminder email sent successfully.', 3500, { type: 'success', title: 'Reminder sent' });
                    });
                }

                if (normalizedChannel === 'whatsapp') {
                    sendReminderWhatsapp(selectedOrder, paymentUrl);
                    showToast('WhatsApp reminder opened successfully.', 3500, { type: 'success', title: 'Reminder ready' });
                    return;
                }

                return sendReminderEmail(selectedOrder, paymentUrl).then(function () {
                    sendReminderWhatsapp(selectedOrder, paymentUrl);
                    showToast('Email sent and WhatsApp reminder opened.', 3800, { type: 'success', title: 'Reminder sent' });
                });
            })
            .catch(function (error) {
                showToast(error.message || 'Unable to send payment reminder.', 4000, { type: 'error', title: 'Reminder failed' });
            })
            .finally(function () {
                reminderInProgress = false;
                setReminderButtonsBusy(false);
            });
    };

    window.ordersReminder = function (orderId, skipConfirm) {
        if (!skipConfirm && window.confirmAdminAction) {
            window.confirmAdminAction({
                title: 'Send Reminder',
                message: 'Open the payment reminder popup for this order?',
                confirmText: 'Open Reminder'
            }).then(function (confirmed) {
                if (confirmed) window.ordersReminder(orderId, true);
            });
            return;
        }

        var selectedOrder = getReminderOrder(orderId);
        if (!selectedOrder) {
            showToast('Unable to find the selected order.', 3000, { type: 'error', title: 'Reminder' });
            return;
        }

        var balanceAmount = getReminderBalance(selectedOrder);
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
    };

    function saveAdminOrdersPaymentContext(context) {
        context.savedAt = Date.now();
        try {
            localStorage.setItem(adminOrdersPaymentContextKey, JSON.stringify(context));
        } catch (_error) {
        }
        return context;
    }

    function getAdminOrdersPaymentContext(orderId) {
        try {
            var context = JSON.parse(localStorage.getItem(adminOrdersPaymentContextKey) || 'null');
            if (!context || Number(context.orderId) !== Number(orderId)) return null;
            if (!context.savedAt || Date.now() - Number(context.savedAt) > 2 * 60 * 60 * 1000) {
                localStorage.removeItem(adminOrdersPaymentContextKey);
                return null;
            }
            return context;
        } catch (_error) {
            return null;
        }
    }

    function clearAdminOrdersPaymentContext() {
        try {
            localStorage.removeItem(adminOrdersPaymentContextKey);
            sessionStorage.removeItem('gayatri.order.paymentReturnContext');
        } catch (_error) {
        }
    }

    function buildAdminOrdersPaymentContext(orderId, details) {
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

    function sendAdminOrdersInvoice(context) {
        if (!context.email) {
            clearAdminOrdersPaymentContext();
            orderReOrderInProgress = false;
            showToast('Payment succeeded, but the customer email is missing.', 5000, {
                type: 'warning',
                title: 'Email missing'
            });
            loadOrders();
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
                clearAdminOrdersPaymentContext();
                orderReOrderInProgress = false;
                showToast('Payment completed and tax invoice sent successfully.', 4500, {
                    type: 'success',
                    title: 'Paid'
                });
                loadOrders();
            },
            error: function (xhr) {
                clearAdminOrdersPaymentContext();
                orderReOrderInProgress = false;
                showToast(xhr.responseJSON?.Message || 'Payment completed, but tax invoice email failed.', 5000, {
                    type: 'warning',
                    title: 'Email failed'
                });
                loadOrders();
            }
        });
    }

    function openAdminOrdersPayment(context) {
        saveAdminOrdersPaymentContext(context);
        var balanceAmount = Number(context.balanceAmount) || Number(context.totalAmount) || 0;
        OrderPayment.open(context.orderId, balanceAmount, function (result) {
            if (result && result.cancelled) {
                Promise.resolve(sendAdminOrdersPaymentPendingEmail(context)).finally(function () {
                    clearAdminOrdersPaymentContext();
                    orderReOrderInProgress = false;
                        if (context.button && context.button.length) {
                            context.button.prop('disabled', false).html(getReOrderButtonHtml());
                        }
                    loadOrders();
                });
                return;
            }

            showToast('Payment completed. Preparing the tax invoice...', 4000, {
                type: 'success',
                title: 'Paid'
            });
            sendAdminOrdersInvoice(context);
        }, {
            returnPage: 'adminorders',
            totalAmount: Number(context.totalAmount) || 0,
            paidAmount: Number(context.paidAmount) || 0
        });
    }

    function buildAdminOrdersPaymentFailureDetails(context) {
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

    function sendAdminOrdersPaymentPendingEmail(context) {
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

        var details = buildAdminOrdersPaymentFailureDetails(context);

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

    $(document).on('orderRefund:completed', function () {
        loadOrders();
    });

    function resumeAdminOrdersPaymentAfterRedirect() {
        var query = new URLSearchParams(window.location.search);
        var orderId = parseInt(query.get('paymentOrderId'), 10) || 0;
        var chargeId = String(query.get('paymentChargeId') || '').trim();
        var paymentStatus = String(query.get('paymentStatus') || '').trim().toLowerCase();
        if (orderId <= 0) return;

        var context = getAdminOrdersPaymentContext(orderId);
        window.history.replaceState({}, document.title, '/Admin/Orders');

        function sendRecoveredInvoice() {
            if (context) {
                sendAdminOrdersInvoice(context);
                return;
            }

            if (!window.AdminOrderShare || typeof window.AdminOrderShare.fetchOrderDetails !== 'function') {
                clearAdminOrdersPaymentContext();
                orderReOrderInProgress = false;
                showToast('Payment completed, but invoice details could not be restored. Please refresh and try again.', 5000, {
                    type: 'warning',
                    title: 'Payment verification'
                });
                loadOrders();
                return;
            }

            window.AdminOrderShare.fetchOrderDetails(orderId)
                .then(function (details) {
                    context = buildAdminOrdersPaymentContext(orderId, details);
                    saveAdminOrdersPaymentContext(context);
                    sendAdminOrdersInvoice(context);
                })
                .catch(function () {
                    clearAdminOrdersPaymentContext();
                    orderReOrderInProgress = false;
                    showToast('Payment completed, but invoice details could not be restored. Please refresh and try again.', 5000, {
                        type: 'warning',
                        title: 'Payment verification'
                    });
                    loadOrders();
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

            clearAdminOrdersPaymentContext();
            orderReOrderInProgress = false;
            showToast('Payment returned, but it could not be verified.', 5000, {
                type: 'warning',
                title: 'Payment verification'
            });
            loadOrders();
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

                    clearAdminOrdersPaymentContext();
                    orderReOrderInProgress = false;
                    showToast('Payment is ' + String(result.status || 'pending') + '. Invoice email was not sent.', 6000, {
                        type: 'warning',
                        title: 'Payment pending'
                    });
                    loadOrders();
                })
                .fail(function () {
                    clearAdminOrdersPaymentContext();
                    orderReOrderInProgress = false;
                    showToast('Unable to verify payment. Please refresh and try again.', 5000, {
                        type: 'warning',
                        title: 'Payment verification'
                    });
                    loadOrders();
                });
        }

        verify(0);
    }
});

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


