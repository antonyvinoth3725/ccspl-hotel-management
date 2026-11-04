$(function () {
    var $root = $('.reminder-pay-page');
    if (!$root.length) return;

    var isValid = String($root.data('valid') || '') === '1';
    if (!isValid) return;

    var orderId = Number($root.data('orderId')) || 0;
    var totalAmount = Number($root.data('totalAmount')) || 0;
    var paidAmount = Number($root.data('paidAmount')) || 0;
    var balanceAmount = Math.max(0, Number($root.data('balanceAmount')) || 0);
    var token = String($root.data('token') || '').trim();
    var orderNumber = String($root.data('orderNumber') || ('#' + orderId)).trim();
    var email = String($root.data('email') || '').trim();
    var opened = false;

    function setNote(text, type) {
        var $note = $('#reminderPayNote');
        if (!$note.length) return;
        $note.removeClass('is-error is-success is-warning');
        if (type) $note.addClass('is-' + type);
        $note.text(text || '');
    }

    function openPayment() {
        if (opened || orderId <= 0 || balanceAmount <= 0) return;
        opened = true;

        OrderPayment.open(orderId, balanceAmount, function (result) {
            if (result && result.cancelled) {
                Promise.resolve(sendReminderPaymentPendingEmail()).finally(function () {
                    opened = false;
                    setNote('Payment window closed. You can click Pay Now again to continue payment.', 'warning');
                });
                return;
            }

            setNote('Payment completed successfully for ' + orderNumber + '.', 'success');
            $('#btnOpenReminderPay').prop('disabled', true).text('Paid');
        }, {
            returnPage: 'reminderpayment',
            returnToken: token,
            totalAmount: totalAmount,
            paidAmount: paidAmount
        });
    }

    function buildReminderPaymentFailureDetails() {
        return {
            order: {
                OrderId: orderId,
                OrderNumber: orderNumber,
                CustomerName: String($root.data('customerName') || 'Customer').trim(),
                MobileNo: '',
                EmailId: email,
                EventName: '-',
                MealPeriodName: '-',
                EventDate: null,
                Pax: 0,
                TotalAmount: totalAmount,
                PaidAmount: paidAmount,
                OrderStatusName: 'Payment Pending'
            },
            event: {}
        };
    }

    function sendReminderPaymentPendingEmail() {
        if (!email) {
            return $.Deferred().resolve().promise();
        }

        if (!window.AdminOrderShare || typeof window.AdminOrderShare.sendOrderEmail !== 'function') {
            return $.Deferred().resolve().promise();
        }

        var details = buildReminderPaymentFailureDetails();

        return window.AdminOrderShare.sendOrderEmail(orderId, {
            details: details,
            useInvoicePdf: true,
            emailSubject: window.AdminOrderShare.buildPaymentFailureEmailSubject(orderId, details, {
                subjectPrefix: 'Payment Pending'
            }),
            emailBody: window.AdminOrderShare.buildPaymentFailureEmailBody(orderId, details, {
                reasonText: 'the payment was cancelled before it could be completed',
                supportPhone: '+65 6294 6294',
                supportEmail: 'info@gayatrirestaurant.com'
            })
        }).then(function () {
            setNote('Payment pending email sent to the customer.', 'success');
        }).catch(function (error) {
            setNote(error && error.message ? error.message : 'Payment was cancelled, but the email could not be sent.', 'warning');
        });
    }

    $('#btnOpenReminderPay').on('click', function () {
        openPayment();
    });

    openPayment();
});
