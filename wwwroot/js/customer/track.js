$(function () {
    var standardSteps = [
        'Pending',
        'Confirmed',
        'In Kitchen',
        'Ready for Delivery',
        'Out for delivery',
        'Delivered'
    ];

    $('#btnTrack').on('click', trackOrder);

    $('#trackRef').on('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            trackOrder();
        }
    });

    var referenceFromUrl = new URLSearchParams(window.location.search).get('ref');
    if (referenceFromUrl) {
        $('#trackRef').val(referenceFromUrl);
        trackOrder();
    }

    function trackOrder() {
        var reference = $('#trackRef').val().trim();
        if (!reference) {
            $('#trackResult').hide();
            showToast('Please enter an order reference.', 2500, { type: 'warning' });
            return;
        }

        var $button = $('#btnTrack');
        $button.prop('disabled', true).html('<span>Tracking...</span><span class="track-button-spinner"></span>');

        $.ajax({
            url: '/Customer/Track/get',
            type: 'GET',
            dataType: 'json',
            data: { reference: reference },
            success: function (order) {
                renderTrack(order);
            },
            error: function (xhr) {
                $('#trackResult').hide();
                var message = xhr.responseJSON && xhr.responseJSON.message
                    ? xhr.responseJSON.message
                    : 'Unable to track the order right now.';
                showToast(message, 3000, { type: 'error' });
            },
            complete: function () {
                $button.prop('disabled', false).html('<span>Track Order</span><span aria-hidden="true">&#8594;</span>');
            }
        });
    }

    function renderTrack(order) {
        var status = order.orderStatusName || 'Pending';
        var normalizedStatus = normalizeStatus(status);
        var steps = normalizedStatus === 'quotation' ? ['Quotation'] : standardSteps;
        var currentStep = steps.findIndex(function (step) {
            return normalizeStatus(step) === normalizedStatus;
        });

        if (currentStep < 0) {
            currentStep = 0;
        }

        var progressHtml = steps.map(function (step, index) {
            var stateClass = index < currentStep ? 'completed' : index === currentStep ? 'active' : '';
            var marker = index < currentStep ? '&#10003;' : index + 1;

            return '<div class="track-step ' + stateClass + '">' +
                '<span class="track-step-marker">' + marker + '</span>' +
                '<span class="track-step-label">' + escapeHtml(step) + '</span>' +
                '</div>';
        }).join('');

        var html =
            '<div class="track-result-header">' +
                '<div>' +
                    '<span class="track-result-caption">Order reference</span>' +
                    '<h3>' + escapeHtml(order.orderNumber || '-') + '</h3>' +
                '</div>' +
                '<span class="status-badge status-' + cssName(status) + '">' + escapeHtml(status) + '</span>' +
            '</div>' +
            '<div class="track-progress">' + progressHtml + '</div>' +
            '<div class="track-order-details">' +
                detail('Customer', order.customerName) +
                detail('Event', order.eventName) +
                detail('Package', order.packageName) +
                detail('Event Date', displayDate(order.eventDate)) +
                detail('Meal Period', order.mealPeriodName) +
                detail('Pax', order.pax) +
                badgeDetail('Payment', paymentStatusName(order.paymentStatus), 'payment') +
                detail('Total', currency(order.totalAmount)) +
                detail('Paid', currency(order.paidAmount)) +
            '</div>';

        $('#trackContent').html(html);
        $('#trackResult').removeClass('hidden').show();
        window.setTimeout(function () {
            document.getElementById('trackResult')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
    }

    function detail(label, value) {
        var displayValue = value === null || value === undefined || value === '' ? '-' : value;
        return '<div class="track-detail ' + detailClass(label) + '">' +
            '<div class="track-detail-icon" aria-hidden="true">' + detailIcon(label) + '</div>' +
            '<div class="track-detail-copy"><span>' + escapeHtml(label) + '</span><strong>' +
            escapeHtml(displayValue) + '</strong></div></div>';
    }

    function badgeDetail(label, value, prefix) {
        var displayValue = value || 'Pending';
        return '<div class="track-detail ' + detailClass(label) + '">' +
            '<div class="track-detail-icon" aria-hidden="true">' + detailIcon(label) + '</div>' +
            '<div class="track-detail-copy"><span>' + escapeHtml(label) + '</span>' +
            '<strong class="track-detail-badge ' + cssName(prefix + '-' + displayValue) + '">' +
            escapeHtml(displayValue) + '</strong></div></div>';
    }

    function detailClass(label) {
        return 'track-detail-' + cssName(label);
    }

    function detailIcon(label) {
        var icons = {
            Customer: '&#128100;',
            Event: '&#127881;',
            Package: '&#127869;',
            'Event Date': '&#128197;',
            'Meal Period': '&#128337;',
            Pax: '&#128101;',
            Payment: '&#128179;',
            Total: '&#36;',
            Paid: '&#10003;'
        };
        return icons[label] || '&#8226;';
    }

    function normalizeStatus(value) {
        var status = String(value || '').trim().toLowerCase();
        var aliases = {
            kitchen: 'in kitchen',
            dispatch: 'out for delivery',
            completed: 'delivered'
        };
        return aliases[status] || status;
    }

    function paymentStatusName(value) {
        var statuses = {
            0: 'Pending',
            1: 'Partially Paid',
            2: 'Paid'
        };
        return statuses[value] || value || 'Pending';
    }

    function displayDate(value) {
        if (!value) return '-';
        var date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-SG');
    }

    function currency(value) {
        var amount = Number(value || 0);
        return 'S$' + amount.toLocaleString('en-SG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function cssName(value) {
        return String(value || 'pending').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    function escapeHtml(value) {
        return $('<div>').text(String(value)).html();
    }
});
