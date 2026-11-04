var quotationRows = [];
var quotationConversionInProgress = false;
var adminQuotationPaymentContextKey = 'gayatri.admin.quotationPaymentContext';

function formatQuotationsLocalDateInput(dateObj) {
    var year = dateObj.getFullYear();
    var month = String(dateObj.getMonth() + 1).padStart(2, '0');
    var day = String(dateObj.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function setQuotationsDateValue(selector, value) {
    var input = $(selector).get(0);
    if (!input) return;

    if (input._flatpickr) {
        input._flatpickr.setDate(value, false, 'Y-m-d');
    } else {
        $(input).val(value);
    }
}

function getQuotationsDateValue(selector) {
    var input = $(selector).get(0);
    if (!input) return '';

    if (input._flatpickr && input._flatpickr.selectedDates && input._flatpickr.selectedDates.length) {
        return formatQuotationsLocalDateInput(input._flatpickr.selectedDates[0]);
    }

    return String($(input).val() || '').trim();
}

function syncQuotationsDateBounds() {
    var fromDate = getQuotationsDateValue('#quotationsFromDate');
    var toDate = getQuotationsDateValue('#quotationsToDate');

    var fromInput = $('#quotationsFromDate').get(0);
    var toInput = $('#quotationsToDate').get(0);

    if (fromInput && fromInput._flatpickr) {
        fromInput._flatpickr.set('maxDate', toDate || null);
    }
    if (toInput && toInput._flatpickr) {
        toInput._flatpickr.set('minDate', fromDate || null);
    }
}

function parseQuotationsDate(value) {
    var text = String(value || '').trim();
    if (!text) return null;
    var parts = text.split('-');
    if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    var parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

$(document).ready(function () {
    var today = new Date();
    var todayValue = formatQuotationsLocalDateInput(today);
    setQuotationsDateValue('#quotationsFromDate', todayValue);
    setQuotationsDateValue('#quotationsToDate', todayValue);
    syncQuotationsDateBounds();

    loadPendingOrder();
    resumeAdminQuotationPaymentAfterRedirect();

    $('#quotationsFromDate, #quotationsToDate').on('change', function () {
        var fromDate = getQuotationsDateValue('#quotationsFromDate');
        var toDate = getQuotationsDateValue('#quotationsToDate');
        var fromDateObj = parseQuotationsDate(fromDate);
        var toDateObj = parseQuotationsDate(toDate);

        if (fromDateObj && toDateObj && fromDateObj > toDateObj) {
            if (window.showToast) {
                showToast('From date was later than To date. It has been auto-corrected.', 3000, {
                    type: 'warning',
                    title: 'Invalid Date'
                });
            }
            setQuotationsDateValue('#quotationsToDate', fromDate);
        }

        syncQuotationsDateBounds();
        loadPendingOrder();
    });

});

function loadPendingOrder() {
    showQuotationsLoader(true);

    $.ajax({
        url: '/Admin/Quotations/get',
        type: 'GET',
        data: {
            fromDate: getQuotationsDateValue('#quotationsFromDate') || null,
            toDate: getQuotationsDateValue('#quotationsToDate') || null
        },
        dataType: 'json',
        success: function (rows) {
            quotationRows = Array.isArray(rows) ? rows : [];
            renderQuoList(quotationRows);
        },
        error: function () {
            renderQuoList([]);
            showToast('Unable to load Quotation.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showQuotationsLoader(false);
        }
    });
}

function showQuotationsLoader(show) {
    var $panel = $('.pageloaderpanel');
    if ($panel.length) {
        $('#QuotListPanel .table-wrap').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
        return;
    }
}
function renderQuoList(rows) {

    let html = "";

    rows.forEach(function (item, index) {

        var QuotationStatus = 'Unknown', StatusBadgeColor = 'badge-unknown', convertOrderButton = '', actionItems = '';

        if (item.orderStatus == 5) {
            QuotationStatus = "Pending";
            StatusBadgeColor = 'badge-pending';
            convertOrderButton = `<button type="button" class="action-item quotation-action-convert btn-convert-order"
                data-id="${Number(item.id) || 0}"
                onclick="convertToOrder(this, ${Number(item.id) || 0})">
                <span class="action-icon action-icon-text" aria-hidden="true">&#8644;</span>
                <span class="quotation-action-label">Convert to Order</span>
            </button>`;
        }
        else if (item.orderStatus == 6) {
            QuotationStatus = "Converted to Order";
            StatusBadgeColor = 'badge-quotation-to-order';
        }
        else if (item.orderStatus == 0) {
            QuotationStatus = "Expired";
            StatusBadgeColor = 'badge-cancelled';
        }

        actionItems += `<button type="button" class="action-item quotation-action-view" onclick="viewOrderDetails(${Number(item.id) || 0})">
                <span class="action-icon action-icon-text" aria-hidden="true">&#128065;</span>
                <span class="quotation-action-label">View</span>
            </button>`;
        actionItems += convertOrderButton;
        actionItems += `<button type="button" class="action-item quotation-action-wa" onclick="quotationWhatsapp(this, ${Number(item.id) || 0})">
                <span class="action-icon action-icon-text" aria-hidden="true">&#128172;</span>
                <span class="quotation-action-label">WhatsApp</span>
            </button>`;
        actionItems += `<button type="button" class="action-item quotation-action-email" onclick="quotationEmail(this, ${Number(item.id) || 0})">
                <span class="action-icon action-icon-text" aria-hidden="true">&#9993;</span>
                <span class="quotation-action-label">Email</span>
            </button>`;
        actionItems += `<button type="button" class="action-item quotation-action-download" onclick="quotationDownload(this, ${Number(item.id) || 0})">
                <span class="action-icon action-icon-text" aria-hidden="true">&#8681;</span>
                <span class="quotation-action-label">Download</span>
            </button>`;

        html += `
        <tr data-order-id="${Number(item.id) || 0}">
            <td>${index + 1}</td>            
            <td>
                <button type="button" class="order-ref-link" onclick="viewOrderDetails(${Number(item.id) || 0})">
                    ${item.orderNumber ?? ""}
                </button>
            </td>
            <td>${item.customerName ?? ""}</td>
            <td>${item.packageName ?? ""}</td>
            <td>${Number(item.pax) || 0}</td>
            <td>${displayDate(item.createdDate ?? item.CreatedDate)}</td>
            <td>${displayDate(item.eventDate ?? item.EventDate)}</td>
            <td>
                <span class="badge-pill ${StatusBadgeColor}">
                  ${QuotationStatus}
                </span>
            </td>
            <td>${money(item.totalAmount)}</td>
            <td>
                <div class="row-actions quotation-row-actions">
                    <button type="button" class="dots-btn" title="Actions">&#8943;</button>
                    <div class="actions-menu hidden">
                        ${actionItems}
                    </div>
                </div>
            </td>
        </tr>`;
    });

    $("#quotationsTable tbody").html(html);
    if (typeof renderDataTable === 'function') {
        renderDataTable('quotationsTable');
    }
}

function displayDate(value) {
    if (!value) return '-';
    var date = new Date(value);
    return isNaN(date.getTime()) ? value : date.toLocaleDateString('en-CA');
}

function convertToOrder(buttonElement, quotationid, skipConfirm) {
    if (!skipConfirm && window.confirmAdminAction) {
        window.confirmAdminAction({
            title: 'Convert to Order',
            message: 'Convert this quotation to an order?',
            confirmText: 'Convert to Order'
        }).then(function (confirmed) {
            if (confirmed) convertToOrder(buttonElement, quotationid, true);
        });
        return;
    }

    quotationid = Number(quotationid) || 0;
    if (!quotationid || quotationConversionInProgress) return;

    var quotation = quotationRows.find(function (item) {
        return Number(item.id) === quotationid;
    });
    var $button = $(buttonElement);
    quotationConversionInProgress = true;
    $button.prop('disabled', true).text('Converting...');

    $.ajax({
        url: "/Admin/Quotations/ConvertToOrder",
        type: "POST",
        data: {
            QuotationId: quotationid || 0
        },
        success: function (response) {
            if (response.success) {
                showToast(response.message, 3000, {
                    type: "success",
                    title: "Success"
                });
                openAdminQuotationPayment({
                    orderId: Number(response.orderId) || quotationid,
                    orderNumber: response.orderNumber || quotation?.orderNumber || '',
                    customerName: response.customerName || quotation?.customerName || quotation?.CustomerName || '',
                    email: response.email || quotation?.emailId || '',
                    totalAmount: Number(response.totalAmount) || Number(quotation?.totalAmount) || 0
                });
            } else {
                showToast(response.message, 3000, {
                    type: "warning",
                    title: "Warning"
                });
                quotationConversionInProgress = false;
                $button.prop('disabled', false).html('<span class="action-icon action-icon-text" aria-hidden="true">&#8644;</span><span class="quotation-action-label">Convert to Order</span>');
            }
        },
        error: function (xhr) {
            showToast(xhr.responseJSON?.message || "Conversion failed.");
            quotationConversionInProgress = false;
            $button.prop('disabled', false).html('<span class="action-icon action-icon-text" aria-hidden="true">&#8644;</span><span class="quotation-action-label">Convert to Order</span>');
        }
    });
}

function quotationWhatsapp(buttonElement, orderId, skipConfirm) {
    if (!skipConfirm && window.confirmAdminAction) {
        window.confirmAdminAction({
            title: 'WhatsApp',
            message: 'Open WhatsApp share for this quotation?',
            confirmText: 'Open WhatsApp'
        }).then(function (confirmed) {
            if (confirmed) quotationWhatsapp(buttonElement, orderId, true);
        });
        return;
    }

    orderId = Number(orderId);

    if (!orderId || !Number.isInteger(orderId)) {
        if (window.showToast) {
            showToast('Invalid quotation Id for WhatsApp.', 3000, {
                type: 'warning',
                title: 'WhatsApp'
            });
        }
        return;
    }

    window.AdminOrderShare.prepareWhatsappShare(orderId, {
        button: buttonElement,
        busyText: 'Preparing...',
        useInvoicePdf: true,
        forceQuotation: true,
        documentType: 'quotation'
    }).catch(function (error) {
        if (window.showToast) {
            showToast(error.message || 'Unable to prepare WhatsApp quotation details.', 4000, {
                type: 'error',
                title: 'WhatsApp failed'
            });
        }
    });
}

function quotationEmail(buttonElement, orderId, skipConfirm) {
    if (!skipConfirm && window.confirmAdminAction) {
        window.confirmAdminAction({
            title: 'Email',
            message: 'Send quotation email now?',
            confirmText: 'Send Email'
        }).then(function (confirmed) {
            if (confirmed) quotationEmail(buttonElement, orderId, true);
        });
        return;
    }

    orderId = Number(orderId);

    if (!orderId || !Number.isInteger(orderId)) {
        if (window.showToast) {
            showToast('Invalid quotation Id for Email.', 3000, {
                type: 'warning',
                title: 'Email'
            });
        }
        return;
    }

    window.AdminOrderShare.sendOrderEmail(orderId, {
        button: buttonElement,
        busyText: 'Sending...',
        useInvoicePdf: true,
        forceQuotation: true,
        documentType: 'quotation'
    }).catch(function (error) {
        if (window.showToast) {
            showToast(error.message || 'Unable to send quotation email.', 4000, {
                type: 'error',
                title: 'Email failed'
            });
        }
    });
}

function quotationDownload(buttonElement, orderId, skipConfirm) {
    if (!skipConfirm && window.confirmAdminAction) {
        window.confirmAdminAction({
            title: 'Download',
            message: 'Download quotation PDF now?',
            confirmText: 'Download'
        }).then(function (confirmed) {
            if (confirmed) quotationDownload(buttonElement, orderId, true);
        });
        return;
    }

    orderId = Number(orderId);

    if (!orderId || !Number.isInteger(orderId)) {
        if (window.showToast) {
            showToast('Invalid quotation Id for Download.', 3000, {
                type: 'warning',
                title: 'Download'
            });
        }
        return;
    }

    window.AdminOrderShare.downloadOrderPdf(orderId, {
        button: buttonElement,
        busyText: 'Downloading...',
        useInvoicePdf: true,
        forceQuotation: true,
        documentType: 'quotation'
    }).catch(function (error) {
        if (window.showToast) {
            showToast(error.message || 'Unable to download quotation PDF.', 4000, {
                type: 'error',
                title: 'Download failed'
            });
        }
    });
}

function saveAdminQuotationPaymentContext(context) {
    context.savedAt = Date.now();
    try {
        localStorage.setItem(adminQuotationPaymentContextKey, JSON.stringify(context));
    } catch (_error) {
        // Redirect recovery will show a warning if browser storage is unavailable.
    }
    return context;
}

function getAdminQuotationPaymentContext(orderId) {
    try {
        var context = JSON.parse(localStorage.getItem(adminQuotationPaymentContextKey) || 'null');
        if (!context || Number(context.orderId) !== Number(orderId)) return null;
        if (!context.savedAt || Date.now() - Number(context.savedAt) > 2 * 60 * 60 * 1000) {
            localStorage.removeItem(adminQuotationPaymentContextKey);
            return null;
        }
        return context;
    } catch (_error) {
        return null;
    }
}

function clearAdminQuotationPaymentContext() {
    try {
        localStorage.removeItem(adminQuotationPaymentContextKey);
        sessionStorage.removeItem('gayatri.order.paymentReturnContext');
    } catch (_error) {
        // Cleanup must not affect a completed payment.
    }
}

function openAdminQuotationPayment(context) {
    saveAdminQuotationPaymentContext(context);
    OrderPayment.open(context.orderId, context.totalAmount, function (result) {
        if (result && result.cancelled) {
            Promise.resolve(sendAdminQuotationPaymentPendingEmail(context)).finally(function () {
                clearAdminQuotationPaymentContext();
                quotationConversionInProgress = false;
                loadPendingOrder();
            });
            return;
        }

        showToast('Payment completed. Preparing the tax invoice...', 4000, {
            type: 'success',
            title: 'Paid'
        });
        sendAdminQuotationInvoice(context);
    }, { returnPage: 'adminquotations' });
}

function sendAdminQuotationInvoice(context) {
    if (!context.email) {
        clearAdminQuotationPaymentContext();
        quotationConversionInProgress = false;
        showToast('Payment succeeded, but the customer email is missing.', 5000, {
            type: 'warning',
            title: 'Email missing'
        });
        loadPendingOrder();
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
            clearAdminQuotationPaymentContext();
            quotationConversionInProgress = false;
            showToast('Payment completed and tax invoice sent successfully.', 4500, {
                type: 'success',
                title: 'Paid'
            });
            loadPendingOrder();
        },
        error: function (xhr) {
            clearAdminQuotationPaymentContext();
            quotationConversionInProgress = false;
            showToast(xhr.responseJSON?.Message || 'Payment completed, but tax invoice email failed.', 5000, {
                type: 'warning',
                title: 'Email failed'
            });
            loadPendingOrder();
        }
    });
}

function buildAdminQuotationPaymentFailureDetails(context) {
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

function sendAdminQuotationPaymentPendingEmail(context) {
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

    var details = buildAdminQuotationPaymentFailureDetails(context);

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

function resumeAdminQuotationPaymentAfterRedirect() {
    var query = new URLSearchParams(window.location.search);
    var orderId = parseInt(query.get('paymentOrderId'), 10) || 0;
    var chargeId = String(query.get('paymentChargeId') || '').trim();
    if (orderId <= 0) return;

    var context = getAdminQuotationPaymentContext(orderId);
    if (!context || !chargeId) {
        showToast('Payment returned, but its invoice context could not be restored.', 5000, {
            type: 'warning',
            title: 'Payment verification'
        });
        return;
    }
    window.history.replaceState({}, document.title, '/Admin/Quotations');

    function verify(attempt) {
        $.getJSON('/Customer/OrderPayment/status/' + encodeURIComponent(chargeId))
            .done(function (result) {
                if (result.paid) {
                    showToast('Payment completed. Preparing the tax invoice...', 4000, {
                        type: 'success',
                        title: 'Paid'
                    });
                    sendAdminQuotationInvoice(context);
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
                showToast('Payment is ' + String(result.status || 'pending') + '. Invoice email was not sent.', 6000, {
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

function money(value) {
    value = Number(value) || 0;
    return 'S$' + value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
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
