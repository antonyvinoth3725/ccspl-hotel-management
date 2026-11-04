(function (window, $) {
    'use strict';

    var currentSummary = null;

    function money(value, currency) {
        return (currency || 'SGD') + ' ' + (Number(value) || 0).toFixed(2);
    }

    function escapeHtml(value) {
        return $('<div>').text(value == null ? '' : String(value)).html();
    }

    function close() {
        $('#orderRefundModal').addClass('hidden');
        currentSummary = null;
    }

    function render(summary) {
        currentSummary = summary;
        var refundable = Number(summary.refundableAmount) || 0;
        var currency = summary.currency || 'SGD';
        var html = '<div class="order-refund-shell">' +
            '<div class="modal-header order-refund-header">' +
            '<div class="order-refund-title-wrap">' +
            '<h3>Cancel & Refund ' + escapeHtml(summary.orderNumber || ('#' + summary.orderId)) + '</h3>' +
            '</div>' +
            '<button type="button" class="btn-close" id="btnCloseOrderRefund" onclick="OrderRefund.close()">&times;</button></div>' +
            '<div class="modal-body order-refund-body">' +
            '<div class="order-refund-customer"><strong>' + escapeHtml(summary.customerName) + '</strong> <span class="muted">' + escapeHtml(summary.emailId) + '</span></div>' +
            '<div class="refund-summary-grid">' +
            '<div class="refund-stat-card"><span class="refund-stat-label">Total</span><strong class="refund-stat-value">' + money(summary.totalAmount, currency) + '</strong></div>' +
            '<div class="refund-stat-card"><span class="refund-stat-label">Paid</span><strong class="refund-stat-value">' + money(summary.paidAmount, currency) + '</strong></div>' +
            '<div class="refund-stat-card"><span class="refund-stat-label">Already refunded</span><strong class="refund-stat-value">' + money(summary.refundedAmount, currency) + '</strong></div>' +
            '<div class="refund-stat-card refund-stat-card-highlight"><span class="refund-stat-label">Available to refund</span><strong class="refund-stat-value">' + money(refundable, currency) + '</strong></div>' +
            '</div>' +
            '<div class="form-group refund-form-group"><label for="orderRefundAmount">Refund amount</label>' +
            '<input type="number" class="form-control" id="orderRefundAmount" min="0" step="0.01" max="' + refundable.toFixed(2) + '" value="' + refundable.toFixed(2) + '"></div>' +
            '<div class="form-group refund-form-group"><label for="orderNonRefundableAmount">Non-refundable amount</label>' +
            '<input type="number" class="form-control" id="orderNonRefundableAmount" min="0" step="0.01" max="' + refundable.toFixed(2) + '" value="0.00"></div>' +
            '<div class="form-group refund-form-group"><label for="orderCancellationReason">Cancellation reason</label>' +
            '<textarea class="form-control" id="orderCancellationReason" rows="3" maxlength="500" placeholder="Enter the reason for cancellation"></textarea></div>' +
            '<p class="muted refund-warning">Order is cancelled after Omise confirms requested refunds.</p>' +
            '</div><div class="modal-footer order-refund-footer">' +
            '<button type="button" class="btn btn-light" id="btnCancelOrderRefund" onclick="OrderRefund.close()">Close</button>' +
            '<button type="button" class="btn btn-light" id="btnCancelWithoutRefund" onclick="OrderRefund.submit(false)">Cancel without refund</button>' +
            '<button type="button" class="btn btn-danger" id="btnProcessOrderRefund" onclick="OrderRefund.submit(true)"' + (refundable <= 0 ? ' disabled' : '') + '>Refund & Cancel</button>' +
            '</div></div>';

        $('#orderRefundModalBox').html(html);
        $('#orderRefundModal').removeClass('hidden');
    }

    function open(orderId) {
        if (!orderId) return;
        $.ajax({
            url: '/Admin/OrderRefund/summary/' + encodeURIComponent(orderId),
            type: 'GET',
            success: function (res) {
                if (res && res.success && res.data) render(res.data);
                else showToast(res?.message || 'Unable to load refund details.', 3000, { type: 'error', title: 'Load failed' });
            },
            error: function (xhr) {
                showToast(xhr.responseJSON?.message || 'Unable to load refund details. Run the OrderRefund SQL script first.', 4000, { type: 'error', title: 'Load failed' });
            }
        });
    }

    function getRequest(includeRefund) {
        var available = Number(currentSummary?.refundableAmount) || 0;
        return {
            orderId: Number(currentSummary?.orderId) || 0,
            refundAmount: includeRefund ? (Number($('#orderRefundAmount').val()) || 0) : 0,
            nonRefundableAmount: includeRefund ? (Number($('#orderNonRefundableAmount').val()) || 0) : available,
            reason: ($('#orderCancellationReason').val() || '').trim()
        };
    }

    function validate(request, includeRefund) {
        var available = Number(currentSummary?.refundableAmount) || 0;
        if (!request.reason) {
            showToast('Enter the cancellation reason.', 3000, { type: 'warning', title: 'Validation' });
            return false;
        }
        if (includeRefund && (request.refundAmount <= 0 || request.refundAmount > available)) {
            showToast('Refund amount must be greater than zero and cannot exceed the available amount.', 3500, { type: 'warning', title: 'Validation' });
            return false;
        }
        if (request.nonRefundableAmount < 0 || Math.abs((request.refundAmount + request.nonRefundableAmount) - available) > 0.001) {
            showToast('Refund and non-refundable amounts must account for the full paid balance.', 3500, { type: 'warning', title: 'Validation' });
            return false;
        }
        return true;
    }

    function sendCancellationEmail(orderId) {
        if (!window.AdminOrderShare || typeof window.AdminOrderShare.sendOrderEmail !== 'function') return Promise.resolve();
        return window.AdminOrderShare.sendOrderEmail(orderId, { useInvoicePdf: true });
    }

    function submit(includeRefund) {
        if (!currentSummary) return;
        var request = getRequest(includeRefund);
        if (!validate(request, includeRefund)) return;

        var currency = currentSummary.currency || 'SGD';
        var message = includeRefund
            ? 'Refund ' + money(request.refundAmount, currency) + ' through Omise and cancel this order?'
            : 'Cancel this order without sending any Omise refund?';

        showToast(message, 0, {
            confirm: true,
            type: 'warning',
            title: 'Confirm cancellation',
            yesText: includeRefund ? 'Refund & Cancel' : 'Cancel Order',
            noText: 'Back',
            onYes: function () {
                var button = includeRefund ? $('#btnProcessOrderRefund') : $('#btnCancelWithoutRefund');
                button.prop('disabled', true).text(includeRefund ? 'Refunding...' : 'Cancelling...');
                $.ajax({
                    url: includeRefund ? '/Admin/OrderRefund/process' : '/Admin/OrderRefund/cancel-without-refund',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(request),
                    success: async function (res) {
                        if (!res || !res.success) {
                            button.prop('disabled', false).text(includeRefund ? 'Refund & Cancel' : 'Cancel without refund');
                            showToast(res?.message || 'Unable to complete cancellation.', 4500, { type: 'error', title: 'Cancellation failed' });
                            return;
                        }
                        close();
                        showToast(res.message || 'Order cancelled successfully.', 3500, { type: 'success', title: 'Order cancelled' });
                        $(document).trigger('orderRefund:completed', [res]);
                        try {
                            await sendCancellationEmail(request.orderId);
                        } catch (error) {
                            showToast(error.message || 'Cancellation completed, but the email could not be sent.', 4000, { type: 'warning', title: 'Email not sent' });
                        }
                    },
                    error: function (xhr) {
                        button.prop('disabled', false).text(includeRefund ? 'Refund & Cancel' : 'Cancel without refund');
                        showToast(xhr.responseJSON?.message || 'Unable to complete cancellation.', 4500, { type: 'error', title: 'Cancellation failed' });
                    }
                });
            }
        });
    }

    $(document).on('input', '#orderRefundAmount', function () {
        var available = Number(currentSummary?.refundableAmount) || 0;
        var refund = Math.max(0, Number($(this).val()) || 0);
        $('#orderNonRefundableAmount').val(Math.max(0, available - refund).toFixed(2));
    });

    window.OrderRefund = {
        open: open,
        close: close,
        submit: submit
    };
})(window, jQuery);
