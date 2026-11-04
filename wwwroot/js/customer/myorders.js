// ===== CUSTOMER MY ORDERS =====
$(function () {
    var myOrders = [];
    var convertedPaymentContextKey = 'gayatri.myorders.convertedPaymentContext';
    var paymentReturnContextKey = 'gayatri.order.paymentReturnContext';
    var pageQuery = new URLSearchParams(window.location.search);
    var initialPhone = pageQuery.get('phoneNo') || '';
    var reminderOrderId = parseInt(pageQuery.get('reminderOrderId'), 10) || 0;
    var reminderOpenPayment = String(pageQuery.get('openPayment') || '').trim() === '1';
    var reminderAutoOpened = false;
    $('#myOrdersPhone').val(initialPhone);
    if (initialPhone) loadMyOrders(initialPhone);
    else showPhonePrompt();

    function buildOrdersLoader(message) {
        return '<div class="card myorders-loading-card">' +
            '<div class="pageloaderpanel">' +
            '<div class="spinner" aria-hidden="true"></div>' +
            '<div class="loader-text">' + escapeHtml(message || 'Loading orders...') + '</div>' +
            '</div>' +
            '</div>';
    }

    function loadMyOrders(phoneNo) {
        $('#ordersList').html(buildOrdersLoader('Loading orders...'));
        $.get('/Customer/MyOrders/get', { phoneNo: phoneNo }, function (data) {
            myOrders = Array.isArray(data) ? data : [];
            bindEventNames(myOrders).always(function () {
                renderOrders(myOrders);
                tryOpenReminderPayment();
            });
        }).fail(function (xhr) {
            var message = xhr.responseJSON?.message || 'Unable to load your orders.';
            $('#ordersList').html('<div class="muted">' + escapeHtml(message) + '</div>');
        });
    }

    function bindEventNames(orders) {
        var eventIds = [];
        orders.forEach(function (order) {
            var eventId = parseInt(order.eventId, 10) || 0;
            if (eventId > 0 && eventIds.indexOf(eventId) === -1) eventIds.push(eventId);
        });

        var requests = eventIds.map(function (eventId) {
            return $.getJSON('/Customer/Order/events/' + eventId).then(function (eventItem) {
                orders.forEach(function (order) {
                    if (Number(order.eventId) === eventId) order.eventName = eventItem.name || '-';
                });
            }, function () {
                return null;
            });
        });

        return requests.length ? $.when.apply($, requests) : $.Deferred().resolve().promise();
    }

    $('#btnFindMyOrders').on('click', function () {
        var phoneNo = ($('#myOrdersPhone').val() || '').trim();
        if (!phoneNo) {
            showPhonePrompt();
            $('#myOrdersPhone').focus();
            return;
        }
        loadMyOrders(phoneNo);
    });

    $('#myOrdersPhone').on('keydown', function (event) {
        if (event.key === 'Enter') $('#btnFindMyOrders').trigger('click');
    });

    $(document).on('click', '.btn-myorder-wa', function () {
        var button = this;
        var orderId = Number(button.getAttribute('data-id'));
        var phoneNo = ($('#myOrdersPhone').val() || '').trim();

        if (!orderId || !Number.isInteger(orderId)) {
            if (window.showToast) {
                showToast('Invalid order Id for WhatsApp.', 3000, {
                    type: 'warning',
                    title: 'WhatsApp'
                });
            }
            return;
        }

        if (!phoneNo) {
            if (window.showToast) {
                showToast('Please enter your phone number first.', 3000, {
                    type: 'warning',
                    title: 'WhatsApp'
                });
            }
            $('#myOrdersPhone').focus();
            return;
        }

        window.AdminOrderShare.prepareWhatsappShare(orderId, {
            button: button,
            busyText: 'Preparing...',
            detailsUrl: '/Customer/MyOrders/details?orderId=' + encodeURIComponent(orderId) + '&phoneNo=' + encodeURIComponent(phoneNo)
        })
            .catch(function (error) {
                if (window.showToast) {
                    showToast(error.message || 'Unable to prepare WhatsApp order details.', 4000, {
                        type: 'error',
                        title: 'WhatsApp failed'
                    });
                }
            });
    });

    function showPhonePrompt() {
        $('#ordersList').html('<div class="card"><div class="muted">Enter your phone number to view your orders.</div></div>');
    }

    function renderOrders(orders) {
        if (!orders.length) {
            $('#ordersList').html('<div class="card"><p class="muted">No orders found for this phone number.</p></div>');
            return;
        }

        var statusFiveOrders = orders.filter(function (order) {
            return Number(order.orderStatus ?? order.OrderStatus) === 5;
        });
        var remainingOrders = orders.filter(function (order) {
            return Number(order.orderStatus ?? order.OrderStatus) !== 5 && Number(order.orderStatus ?? order.OrderStatus) !== 6;
        });

        var html = '<div class="orders-split">' +
            renderOrderSection('Quotation Orders', statusFiveOrders, 'No status 5 orders found.') +
            renderOrderSection('Remaining Orders', remainingOrders, 'No remaining orders found.') +
            '</div>';

        $('#ordersList').html(html);
    }

    function renderOrderSection(title, orders, emptyMessage) {
        var cards = orders.map(renderOrderCard).join('');
        return '<section class="orders-section">' +
            '<div class="orders-section-header"><h2>' + escapeHtml(title) + '</h2><span class="orders-count">' + orders.length + '</span></div>' +
            '<div class="orders-section-list">' + (cards || '<div class="orders-empty">' + escapeHtml(emptyMessage) + '</div>') + '</div>' +
            '</section>';
    }

    function actionIcon(name) {
        if (name === 'view') {
            return '<span class="order-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"></path><circle cx="12" cy="12" r="3"></circle></svg></span>';
        }
        if (name === 'track') {
            return '<span class="order-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z"></path><circle cx="12" cy="11" r="2.5"></circle></svg></span>';
        }
        if (name === 'whatsapp') {
            return '<span class="order-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.05 4.94A9.77 9.77 0 0 0 12.09 2C6.66 2 2.24 6.4 2.24 11.83c0 1.74.45 3.43 1.31 4.92L2 22l5.4-1.41a9.8 9.8 0 0 0 4.69 1.2h.01c5.43 0 9.84-4.4 9.84-9.83a9.77 9.77 0 0 0-2.89-7.02Zm-6.96 15.19h-.01a8.14 8.14 0 0 1-4.15-1.14l-.3-.18-3.2.84.86-3.12-.2-.32a8.13 8.13 0 0 1-1.25-4.34c0-4.5 3.67-8.17 8.18-8.17 2.18 0 4.23.84 5.77 2.39a8.1 8.1 0 0 1 2.39 5.78c0 4.5-3.67 8.16-8.18 8.16Zm4.48-6.1c-.25-.12-1.46-.72-1.69-.8-.23-.09-.39-.12-.56.12-.16.24-.64.8-.78.96-.14.17-.28.19-.52.07-.25-.12-1.03-.38-1.96-1.22-.72-.64-1.21-1.43-1.35-1.67-.14-.24-.01-.37.1-.49.1-.09.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.77-1.84-.2-.48-.4-.41-.56-.42h-.48c-.16 0-.43.06-.66.31-.23.24-.87.85-.87 2.08s.89 2.42 1.01 2.58c.12.16 1.75 2.67 4.24 3.74.59.26 1.06.41 1.43.52.6.19 1.14.16 1.57.1.48-.07 1.46-.6 1.66-1.18.21-.58.21-1.08.14-1.18-.06-.1-.22-.16-.47-.28Z"></path></svg></span>';
        }
        return '';
    }

    function renderOrderCard(o) {
            var orderNumber = o.orderNumber || ('#' + o.id);
            var total = Number(o.totalAmount) || 0;
            var paid = Number(o.paidAmount) || 0;
            var balance = Math.max(0, total - paid);
            var statusLabel = o.orderStatusName || 'Pending';
            var statusClass = cssName(statusLabel);
            var paymentLabel = paymentStatusName(o.paymentStatus);
            var isQuotation = Number(o.orderStatus ?? o.OrderStatus) === 5;
            var convertButton = isQuotation
                ? '<button type="button" class="btn btn-convert-order btn-xs btn-convert-my-quotation" data-id="' + o.id + '">Convert to Order</button>'
                : '';

            return '<article class="order-card">' +
                '<div class="order-card-header">' +
                '<strong class="order-ref">' + escapeHtml(orderNumber) + '</strong>' +
                '<span class="badge badge-' + statusClass + '">' + escapeHtml(statusLabel) + '</span>' +
                '</div>' +
                '<div class="order-meta order-meta--details">' +
                '<div class="order-meta-item"><strong>Event</strong><span>' + escapeHtml(o.eventName || '-') + '</span></div>' +
                '<div class="order-meta-item"><strong>Package</strong><span>' + escapeHtml(o.packageName || '-') + '</span></div>' +
                '<div class="order-meta-item"><strong>Event Date</strong><span>' + displayDate(o.eventDate) + '</span></div>' +
                '<div class="order-meta-item"><strong>Meal Period</strong><span>' + escapeHtml(o.mealPeriodName || '-') + '</span></div>' +
                '<div class="order-meta-item"><strong>Pax</strong><span>' + (Number(o.pax) || 0) + '</span></div>' +
                '<div class="order-meta-item"><strong>Order Status</strong><span class="badge badge-' + statusClass + '">' + escapeHtml(statusLabel) + '</span></div>' +
                '<div class="order-meta-item"><strong>Payment</strong><span class="badge ' + paymentClass(paymentLabel) + '">' + escapeHtml(paymentLabel) + '</span></div>' +
                '<div class="order-meta-item"><strong>Total</strong><span>S$' + total.toFixed(2) + '</span></div>' +
                '<div class="order-meta-item"><strong>Paid</strong><span>S$' + paid.toFixed(2) + '</span></div>' +
                '<div class="order-meta-item"><strong>Balance</strong><span>S$' + balance.toFixed(2) + '</span></div>' +
                '</div>' +
                '<div class="actions order-card-actions">' +
                '<button type="button" class="btn btn-primary btn-xs btn-view-my-order" data-id="' + o.id + '">' + actionIcon('view') + '<span>View Order</span></button>' +
                convertButton +
                '<a href="/Customer/Track?ref=' + encodeURIComponent(orderNumber) + '" class="btn btn-light btn-xs">' + actionIcon('track') + '<span>Track</span></a>' +
                '<button type="button" class="btn btn-orange btn-xs btn-myorder-wa" data-id="' + o.id + '">' + actionIcon('whatsapp') + '<span>WhatsApp</span></button>' +
                '</div></article>';
    }

    function saveConvertedPaymentContext(order) {
        var context = {
            orderId: Number(order.id) || 0,
            phoneNo: ($('#myOrdersPhone').val() || '').trim(),
            email: String(order.emailId || '').trim(),
            orderNumber: order.orderNumber || '',
            savedAt: Date.now()
        };
        try {
            localStorage.setItem(convertedPaymentContextKey, JSON.stringify(context));
        } catch (_error) {
            // Redirect-based payment will display a recovery warning if storage is unavailable.
        }
        return context;
    }

    function getConvertedPaymentContext(orderId) {
        try {
            var context = JSON.parse(localStorage.getItem(convertedPaymentContextKey) || 'null');
            if (!context || Number(context.orderId) !== Number(orderId)) return null;
            if (!context.savedAt || Date.now() - Number(context.savedAt) > 2 * 60 * 60 * 1000) {
                localStorage.removeItem(convertedPaymentContextKey);
                return null;
            }
            return context;
        } catch (_error) {
            return null;
        }
    }

    function clearConvertedPaymentContext() {
        try {
            localStorage.removeItem(convertedPaymentContextKey);
            sessionStorage.removeItem(paymentReturnContextKey);
        } catch (_error) {
            // Cleanup must not affect a completed payment.
        }
    }

    function sendConvertedOrderInvoice(orderId, context) {
        if (!context || !context.email) {
            clearConvertedPaymentContext();
            showToast('Payment succeeded, but no customer email is available for the tax invoice.', 5000, {
                type: 'warning',
                title: 'Email missing'
            });
            if (context && context.phoneNo) loadMyOrders(context.phoneNo);
            return;
        }

        var formData = new FormData();
        formData.append('ToEmail', context.email);
        formData.append('Subject', 'Tax Invoice - ' + (context.orderNumber || ('Order ' + orderId)));
        formData.append('ReportId', '4');
        formData.append('OrderId', String(orderId));
        formData.append('ReportFiltersJson', JSON.stringify({ OrderId: orderId }));

        $.ajax({
            url: '/Common/SendReportEmail',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function () {
                clearConvertedPaymentContext();
                showToast('Payment completed and tax invoice sent successfully.', 4500, {
                    type: 'success',
                    title: 'Paid'
                });
                loadMyOrders(context.phoneNo);
            },
            error: function (xhr) {
                clearConvertedPaymentContext();
                showToast(xhr.responseJSON?.Message || 'Payment completed, but the tax invoice email failed.', 5000, {
                    type: 'warning',
                    title: 'Email failed'
                });
                loadMyOrders(context.phoneNo);
            }
        });
    }

    function buildConvertedPaymentFailureDetails(order) {
        var totalAmount = Number(order.totalAmount) || 0;
        var paidAmount = Number(order.paidAmount) || 0;
        return {
            order: {
                OrderId: Number(order.id) || 0,
                OrderNumber: String(order.orderNumber || ('Order-' + (Number(order.id) || 0))).trim(),
                CustomerName: String(order.customerName || 'Customer').trim(),
                MobileNo: String(order.mobileNo || '').trim(),
                EmailId: String(order.emailId || '').trim(),
                EventName: String(order.eventName || '-').trim(),
                MealPeriodName: String(order.mealPeriodName || '-').trim(),
                EventDate: order.eventDate || null,
                Pax: Number(order.pax) || 0,
                TotalAmount: totalAmount,
                PaidAmount: paidAmount,
                OrderStatusName: 'Payment Pending'
            },
            event: {
                EventDate: order.eventDate || null
            }
        };
    }

    function sendConvertedPaymentPendingEmail(order) {
        if (!window.AdminOrderShare || typeof window.AdminOrderShare.sendOrderEmail !== 'function') {
            return $.Deferred().resolve().promise();
        }

        if (!order || !order.emailId) {
            showToast('Payment was cancelled, but the customer email is missing for the reminder email.', 4500, {
                type: 'warning',
                title: 'Email missing'
            });
            return $.Deferred().resolve().promise();
        }

        var details = buildConvertedPaymentFailureDetails(order);

        return window.AdminOrderShare.sendOrderEmail(order.id, {
            details: details,
            useInvoicePdf: true,
            emailSubject: window.AdminOrderShare.buildPaymentFailureEmailSubject(order.id, details, {
                subjectPrefix: 'Payment Pending'
            }),
            emailBody: window.AdminOrderShare.buildPaymentFailureEmailBody(order.id, details, {
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

    function openConvertedOrderPayment(order) {
        var orderId = Number(order.id) || 0;
        var amountDue = Math.max(0, (Number(order.totalAmount) || 0) - (Number(order.paidAmount) || 0));
        var context = saveConvertedPaymentContext(order);

        OrderPayment.open(orderId, amountDue, function (result) {
            if (result && result.cancelled) {
                Promise.resolve(sendConvertedPaymentPendingEmail(order)).finally(function () {
                    clearConvertedPaymentContext();
                    loadMyOrders(context.phoneNo);
                });
                return;
            }

            showToast('Payment completed. Preparing your tax invoice...', 4000, {
                type: 'success',
                title: 'Paid'
            });
            sendConvertedOrderInvoice(orderId, context);
        }, {
            returnPage: 'myorders',
            totalAmount: Number(order.totalAmount) || amountDue,
            paidAmount: Number(order.paidAmount) || 0
        });
    }

    function tryOpenReminderPayment() {
        if (reminderAutoOpened || !reminderOpenPayment || reminderOrderId <= 0) return;

        var order = myOrders.find(function (item) {
            return Number(item.id) === Number(reminderOrderId);
        });

        if (!order) {
            showToast('Reminder order not found for this phone number.', 3800, {
                type: 'warning',
                title: 'Payment reminder'
            });
            reminderAutoOpened = true;
            return;
        }

        var amountDue = Math.max(0, (Number(order.totalAmount) || 0) - (Number(order.paidAmount) || 0));
        if (amountDue <= 0) {
            showToast('This order is already fully paid.', 3200, {
                type: 'info',
                title: 'Payment reminder'
            });
            reminderAutoOpened = true;
            return;
        }

        reminderAutoOpened = true;
        openConvertedOrderPayment(order);
    }

    $(document).on('click', '.btn-convert-my-quotation', function () {
        var $button = $(this);
        var quotationId = Number($button.data('id')) || 0;
        var phoneNo = ($('#myOrdersPhone').val() || '').trim();
        var quotation = myOrders.find(function (item) { return Number(item.id) === quotationId; });
        if (!quotationId || !phoneNo || !quotation || $button.prop('disabled')) return;

        $button.prop('disabled', true).text('Converting...');
        $.ajax({
            url: '/Customer/MyOrders/convert-to-order',
            type: 'POST',
            data: {
                quotationId: quotationId,
                phoneNo: phoneNo
            },
            success: function (response) {
                if (!response || !response.success) {
                    showToast(response?.message || 'Unable to convert quotation.', 3000, {
                        type: 'warning',
                        title: 'Not converted'
                    });
                    $button.prop('disabled', false).text('Convert to Order');
                    return;
                }

                showToast(response.message || 'Order created successfully.', 2500, {
                    type: 'success',
                    title: 'Success'
                });
                openConvertedOrderPayment(quotation);
            },
            error: function (xhr) {
                showToast(xhr.responseJSON?.message || 'Unable to convert quotation.', 3000, {
                    type: 'error',
                    title: 'Conversion failed'
                });
                $button.prop('disabled', false).text('Convert to Order');
            }
        });
    });

    function resumeConvertedPaymentAfterRedirect() {
        var query = new URLSearchParams(window.location.search);
        var orderId = parseInt(query.get('paymentOrderId'), 10) || 0;
        var chargeId = String(query.get('paymentChargeId') || '').trim();
        if (orderId <= 0) return;

        var context = getConvertedPaymentContext(orderId);
        if (context && context.phoneNo) {
            $('#myOrdersPhone').val(context.phoneNo);
            loadMyOrders(context.phoneNo);
        }
        if (!context || !chargeId) {
            showToast('Payment returned, but its invoice context could not be restored.', 5000, {
                type: 'warning',
                title: 'Payment verification'
            });
            return;
        }
        window.history.replaceState({}, document.title, '/Customer/MyOrders');

        function verify(attempt) {
            $.getJSON('/Customer/OrderPayment/status/' + encodeURIComponent(chargeId))
                .done(function (result) {
                    if (result.paid) {
                        showToast('Payment completed. Preparing your tax invoice...', 4000, {
                            type: 'success',
                            title: 'Paid'
                        });
                        sendConvertedOrderInvoice(orderId, context);
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
                    showToast('Payment is ' + String(result.status || 'pending') + '. The invoice has not been emailed.', 6000, {
                        type: 'warning',
                        title: 'Payment pending'
                    });
                })
                .fail(function () {
                    showToast('Unable to verify payment. Please refresh and try again.', 5000, {
                        type: 'warning',
                        title: 'Payment verification'
                    });
                });
        }

        verify(0);
    }

    $(document).on('click', '.btn-view-my-order', function () {
        var id = Number($(this).data('id'));
        var o = myOrders.find(function (item) { return Number(item.id) === id; });
        if (!o) return;

        var total = Number(o.totalAmount) || 0;
        var paid = Number(o.paidAmount) || 0;
        var balance = Math.max(0, total - paid);
        var html = '<div class="modal-header"><span class="modal-title">Order ' + escapeHtml(o.orderNumber || ('#' + o.id)) + '</span>' +
            '<button type="button" class="modal-close" id="closeMyOrderModal">&times;</button></div>' +
            '<div class="my-order-modal-grid">' +
            detailRow('Customer', o.customerName || '-') +
            detailRow('Mobile', o.mobileNo || '-') +
            detailRow('Email', o.emailId || '-') +
            detailRow('Event', o.eventName || '-') +
            detailRow('Package', o.packageName || '-') +
            detailRow('Event Date', displayDate(o.eventDate)) +
            detailRow('Meal Period', o.mealPeriodName || '-') +
            detailRow('Location', o.locationName || '-') +
            detailRow('Pax', Number(o.pax) || 0) +
            detailRow('Order Status', o.orderStatusName || 'Pending') +
            detailRow('Payment Status', paymentStatusName(o.paymentStatus)) +
            detailRow('Total', 'S$' + total.toFixed(2)) +
            detailRow('Paid / Balance', 'S$' + paid.toFixed(2) + ' / S$' + balance.toFixed(2)) +
            '</div><div class="actions my-order-modal-actions"><button type="button" class="btn btn-light" id="closeMyOrderModalBtn">Close</button></div>';

        $('#myOrderModalBox').html(html);
        $('#myOrderModal').removeClass('hidden');
    });

    function detailRow(label, value) {
        return '<div class="my-order-modal-item"><strong>' + escapeHtml(label) + '</strong><span>' + escapeHtml(value) + '</span></div>';
    }

    function closeMyOrderModal() {
        $('#myOrderModal').addClass('hidden');
        $('#myOrderModalBox').html('');
    }

    $(document).on('click', '#closeMyOrderModal, #closeMyOrderModalBtn', closeMyOrderModal);
    $('#myOrderModal').on('click', function (event) {
        if (event.target.id === 'myOrderModal') closeMyOrderModal();
    });

    function paymentStatusName(payment) {
        var value = String(payment ?? '').trim();
        if (value === '0') return 'Pending';
        if (value === '1') return 'Partially Paid';
        if (value === '2') return 'Paid';
        return value || 'Pending';
    }

    function paymentClass(payment) {
        if (payment === 'Paid') return 'badge-paid';
        if (payment === 'Partially Paid') return 'badge-partially-paid';
        return 'badge-unpaid';
    }

    function cssName(value) {
        return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    function displayDate(value) {
        if (!value) return '-';
        var date = new Date(value);
        return isNaN(date.getTime()) ? escapeHtml(value) : date.toLocaleDateString('en-CA');
    }

    function escapeHtml(value) {
        return $('<div>').text(value ?? '').html();
    }

    resumeConvertedPaymentAfterRedirect();
});
