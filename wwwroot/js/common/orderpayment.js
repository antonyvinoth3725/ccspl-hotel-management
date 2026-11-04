// Shared Omise payment component. Page-specific behavior belongs in the completion callback.
(function (window, $) {
    'use strict';
    var config = null;
    var orderId = 0;
    var amount = 0;
    var totalAmount = 0;
    var previouslyPaidAmount = 0;
    var completed = null;
    var statusTimer = null;
    var returnPage = '';
    var returnToken = '';

    function error(message) {
        if (!message) { $('#orderPaymentError').addClass('hidden').text(''); return; }
        $('#orderPaymentError').removeClass('hidden').text(message);
    }

    function cardError(message) {
        if (!message) {
            $('#orderPaymentCardError').addClass('hidden').text('');
            return;
        }
        $('#orderPaymentCardError').removeClass('hidden').text(message);
    }

    function clearCardInputErrors() {
        $('#paymentCardName, #paymentCardNumber, #paymentExpiryMonth, #paymentExpiryYear, #paymentSecurityCode').removeClass('input-error');
        cardError('');
    }

    function setBusy(busy) {
        $('#btnPayNow')
            .prop('disabled', busy)
            .toggleClass('is-loading', !!busy)
            .removeClass('is-success')
            .find('.pay-btn-text')
            .text(busy ? 'Processing...' : 'Pay Now');

        $('#btnCancelOrderPayment, #btnCloseOrderPayment').prop('disabled', busy);
    }
    function selectedMode() { return $('input[name="orderPaymentMode"]:checked').val() || 'card'; }

    function paymentAmount() {
        return Number($('#orderPaymentPayAmount').val());
    }

    function paymentAmountText() {
        return String($('#orderPaymentPayAmount').val() || '').trim();
    }

    function setPaymentAmountError(message) {
        $('#orderPaymentPayAmount').addClass('input-error');
        $('#orderPaymentPayAmountError').removeClass('hidden').text(message);
    }

    function clearPaymentAmountError() {
        $('#orderPaymentPayAmount').removeClass('input-error');
        $('#orderPaymentPayAmountError').addClass('hidden').text('');
    }

    function validatePaymentAmount() {
        clearPaymentAmountError();
        var text = paymentAmountText();
        var value = paymentAmount();
        if (!Number.isFinite(value) || value <= 0) {
            setPaymentAmountError('Amount to pay is required and must be greater than zero.');
            $('#orderPaymentPayAmount').focus();
            return false;
        }
        if (!/^\d+(\.\d{1,2})?$/.test(text)) {
            setPaymentAmountError('Enter an amount with a maximum of 2 decimal places.');
            $('#orderPaymentPayAmount').focus();
            return false;
        }
        if (value > amount + 0.0001) {
            setPaymentAmountError('Amount cannot exceed the outstanding balance of S$' + amount.toFixed(2) + '.');
            $('#orderPaymentPayAmount').focus();
            return false;
        }
        return true;
    }

    function validatePaymentAmountLive() {
        clearPaymentAmountError();
        error('');

        var text = paymentAmountText();
        var value = paymentAmount();
        var message = '';
        if (!text || !Number.isFinite(value) || value <= 0) {
            message = 'Amount to pay is required and must be greater than zero.';
        } else if (!/^\d+(\.\d{1,2})?$/.test(text)) {
            message = 'Enter an amount with a maximum of 2 decimal places.';
        } else if (value > amount + 0.0001) {
            message = 'Amount cannot exceed the outstanding balance of S$' + amount.toFixed(2) + '.';
        }

        if (message) {
            setPaymentAmountError(message);
        }

        var canPay = !message && !!config && !$('#btnPayNow').hasClass('is-loading') && !$('#btnPayNow').hasClass('is-success');
        $('#btnPayNow').prop('disabled', !canPay);
    }

    function digitsOnly(value) {
        return String(value || '').replace(/\D/g, '');
    }

    function formatCardNumber(value) {
        var digits = digitsOnly(value).substring(0, 19);
        return digits.replace(/(.{4})/g, '$1 ').trim();
    }

    function luhnValid(numberDigits) {
        var sum = 0;
        var shouldDouble = false;
        for (var i = numberDigits.length - 1; i >= 0; i--) {
            var digit = parseInt(numberDigits.charAt(i), 10);
            if (shouldDouble) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            shouldDouble = !shouldDouble;
        }
        return sum % 10 === 0;
    }

    function validateCardDetails() {
        clearCardInputErrors();

        var mode = selectedMode();
        if (mode !== 'card') return true;

        var name = String($('#paymentCardName').val() || '').trim();
        var cardDigits = digitsOnly($('#paymentCardNumber').val());
        var monthText = digitsOnly($('#paymentExpiryMonth').val());
        var month = parseInt(monthText, 10);
        var yearText = digitsOnly($('#paymentExpiryYear').val());
        var year = parseInt(yearText, 10);
        var cvv = digitsOnly($('#paymentSecurityCode').val());

        if (!name || name.length < 2) {
            $('#paymentCardName').addClass('input-error').focus();
            cardError('Enter the name as shown on the card.');
            return false;
        }

        if (cardDigits.length < 12 || cardDigits.length > 19 || !luhnValid(cardDigits)) {
            $('#paymentCardNumber').addClass('input-error').focus();
            cardError('Enter a valid card number.');
            return false;
        }

        if (monthText.length !== 2 || !Number.isInteger(month) || month < 1 || month > 12) {
            $('#paymentExpiryMonth').addClass('input-error').focus();
            cardError('Enter a valid expiry month (MM).');
            return false;
        }

        if (!Number.isInteger(year) || yearText.length !== 2) {
            $('#paymentExpiryYear').addClass('input-error').focus();
            cardError('Enter the last 2 digits of the expiry year (YY).');
            return false;
        }

        var now = new Date();
        var currentYear = now.getFullYear();
        var currentMonth = now.getMonth() + 1;
        var fullYear = Math.floor(currentYear / 100) * 100 + year;
        if (fullYear < currentYear || (fullYear === currentYear && month < currentMonth)) {
            $('#paymentExpiryYear, #paymentExpiryMonth').addClass('input-error');
            $('#paymentExpiryMonth').focus();
            cardError('Card is expired. Please use another card.');
            return false;
        }

        if (cvv.length !== 3) {
            $('#paymentSecurityCode').addClass('input-error').focus();
            cardError('Enter a valid 3-digit CVV or CVC.');
            return false;
        }

        return true;
    }

    function showSuccessAndClose(result) {
        $('#btnPayNow')
            .prop('disabled', true)
            .removeClass('is-loading')
            .addClass('is-success')
            .find('.pay-btn-text')
            .text('Paid');

        $('#btnCancelOrderPayment, #btnCloseOrderPayment').prop('disabled', true);

        window.setTimeout(function () {
            close(false);
            $('#btnCancelOrderPayment, #btnCloseOrderPayment').prop('disabled', false);
            if (typeof completed === 'function') completed(result);
        }, 650);
    }

    function close(cancelled) {
        $('#orderPaymentModal').addClass('hidden');
        $('#paymentSecurityCode').val('');
        if (statusTimer) window.clearTimeout(statusTimer);
        if (cancelled && typeof completed === 'function') completed({ cancelled: true });
    }

    function refreshMode() {
        if (statusTimer) {
            window.clearTimeout(statusTimer);
            statusTimer = null;
        }
        var card = selectedMode() === 'card';
        $('#orderPaymentCardFields').toggleClass('hidden', !card);
        $('#orderPaymentSourceHelp').toggleClass('hidden', card);
        $('#omiseQrWrap').addClass('hidden');
        $('#btnPayNow').removeClass('hidden');
        clearCardInputErrors();
        $('#orderPaymentError').addClass('hidden').text('');
    }

    function createPaymentMethod(callback) {
        if (!config || !config.publicKey) {
            callback(0, { message: 'Omise configuration is unavailable. Please contact the administrator.' });
            return;
        }

        var mode = selectedMode();
        var amountMinor = Math.round(paymentAmount() * 100);
        Omise.setPublicKey(config.publicKey);
        if (mode === 'card') {
            var number = String($('#paymentCardNumber').val() || '').replace(/\s+/g, '');
            Omise.createToken('card', {
                name: String($('#paymentCardName').val() || '').trim(), number: number,
                expiration_month: parseInt($('#paymentExpiryMonth').val(), 10),
                expiration_year: Math.floor(new Date().getFullYear() / 100) * 100 + parseInt($('#paymentExpiryYear').val(), 10),
                security_code: String($('#paymentSecurityCode').val() || '').trim()
            }, callback);
            return;
        }
        var sourceType = mode === 'upi' ? config.upiSourceType : config.qrSourceType;
        Omise.createSource(sourceType, { amount: amountMinor, currency: config.currency }, callback);
    }

    function poll(chargeId) {
        statusTimer = window.setTimeout(function () {
            $.getJSON('/Customer/OrderPayment/status/' + encodeURIComponent(chargeId)).done(function (result) {
                if (result.paid) {
                    showSuccessAndClose(result);
                } else if (result.status === 'pending') {
                    poll(chargeId);
                } else {
                    error(result.message || ('Payment ' + result.status + '.'));
                }
            }).fail(function () { poll(chargeId); });
        }, 4000);
    }

    function payNow() {
        error('');
        if (!validatePaymentAmount()) return;
        if (!validateCardDetails()) return;
        var currentPaymentAmount = paymentAmount();
        var cumulativePaidAmount = previouslyPaidAmount + currentPaymentAmount;
        var balanceAmount = Math.max(0, totalAmount - cumulativePaidAmount);
        setBusy(true);
        createPaymentMethod(function (statusCode, response) {
            if (statusCode !== 200 || !response || !response.id) {
                setBusy(false);
                error(response && response.message ? response.message : 'Please check the payment details.');
                return;
            }
            $.ajax({
                url: '/Customer/OrderPayment/pay', type: 'POST', contentType: 'application/json',
                data: JSON.stringify({
                    orderId: orderId,
                    amount: currentPaymentAmount,
                    totalAmount: totalAmount,
                    paidAmount: cumulativePaidAmount,
                    balanceAmount: balanceAmount,
                    paymentMode: selectedMode(),
                    paymentMethodId: response.id,
                    returnPage: returnPage,
                    returnToken: returnToken
                })
            }).done(function (result) {
                setBusy(false);
                if (result.qrImageUrl) {
                    $('#omiseQrImage').attr('src', result.qrImageUrl);
                    $('#omiseQrWrap').removeClass('hidden');
                    $('#btnPayNow').addClass('hidden');
                    poll(result.chargeId);
                } else if (result.authorizeUrl) {
                    try {
                        sessionStorage.setItem('gayatri.order.paymentReturnContext', JSON.stringify({
                            orderId: orderId,
                            chargeId: result.chargeId,
                            savedAt: Date.now()
                        }));
                    } catch (_error) {
                        // The return page will show a verification warning if storage is unavailable.
                    }
                    window.location.href = result.authorizeUrl;
                } else if (result.status === 'successful') {
                    showSuccessAndClose(result);
                } else {
                    poll(result.chargeId);
                }
            }).fail(function (xhr) {
                setBusy(false);
                error(xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Payment could not be processed.');
            });
        });
    }

    window.OrderPayment = {
        open: function (id, total, onCompleted, options) {
            orderId = parseInt(id, 10) || 0; amount = Number(total) || 0; completed = onCompleted;
            totalAmount = Number(options && options.totalAmount) || amount;
            previouslyPaidAmount = Number(options && options.paidAmount) || 0;
            var requestedReturnPage = options && options.returnPage;
            returnPage = requestedReturnPage === 'myorders' ||
                requestedReturnPage === 'reminderpayment' ||
                requestedReturnPage === 'adminquotations' ||
                requestedReturnPage === 'adminorders' ||
                requestedReturnPage === 'admindashboard'
                ? requestedReturnPage
                : '';
            returnToken = String(options && options.returnToken || '').trim();
            config = null;
            $('#orderPaymentAmount').text('Outstanding balance: S$' + amount.toFixed(2));
            $('#orderPaymentPayAmount').attr('max', amount.toFixed(2)).val(amount.toFixed(2));
            $('#orderPaymentHelpText, .order-payment-amount-field .field-help').text(
                'You may adjust the amount for partial payment. The remaining balance must be paid at least 4 days before the event.'
            );
            $('input[name="orderPaymentMode"][value="qr"]').siblings('span').text('QR/Pay Now');
            clearPaymentAmountError();
            clearCardInputErrors();
            $('#btnPayNow').removeClass('hidden').prop('disabled', true).removeClass('is-loading').find('.pay-btn-text').text('Loading...');
            $('#btnCancelOrderPayment, #btnCloseOrderPayment').prop('disabled', false);
            refreshMode();
            $('#orderPaymentModal').removeClass('hidden');
            $.getJSON('/Customer/OrderPayment/config').done(function (result) {
                config = result;
                $('#btnPayNow').removeClass('is-loading').find('.pay-btn-text').text('Proceed');
                validatePaymentAmountLive();
            }).fail(function (xhr) {
                var message = xhr.responseJSON && xhr.responseJSON.message
                    ? xhr.responseJSON.message
                    : 'Unable to load Omise configuration.';
                error(message);
                $('#btnPayNow').prop('disabled', true).removeClass('is-loading').find('.pay-btn-text').text('Proceed');
            });
        }
    };

    $(document).on('change', 'input[name="orderPaymentMode"]', refreshMode);
    $(document).on('input', '#orderPaymentPayAmount', function () {
        validatePaymentAmountLive();
    });
    $(document).on('input', '#paymentCardNumber', function () {
        this.value = formatCardNumber(this.value);
        clearCardInputErrors();
    });
    $(document).on('input', '#paymentExpiryMonth', function () {
        var month = digitsOnly(this.value).substring(0, 2);
        if (month.length === 2 && parseInt(month, 10) > 12) {
            month = '12';
        }
        this.value = month;
        clearCardInputErrors();
    });
    $(document).on('input', '#paymentExpiryYear', function () {
        this.value = digitsOnly(this.value).substring(0, 2);
        clearCardInputErrors();
    });
    $(document).on('input', '#paymentSecurityCode', function () {
        this.value = digitsOnly(this.value).substring(0, 3);
        clearCardInputErrors();
    });
    $(document).on('input', '#paymentCardName', clearCardInputErrors);
    $(document).on('click', '#btnPayNow', payNow);
    $(document).on('click', '#btnCloseOrderPayment, #btnCancelOrderPayment', function () { close(true); });
})(window, jQuery);
