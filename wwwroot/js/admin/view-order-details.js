document.addEventListener('DOMContentLoaded', function () {
    const report = document.getElementById('viewOrderReport');
    const downloadButton = document.getElementById('btnDownloadOrderPdf');
    const whatsappButton = document.getElementById('btnSendOrderWhatsapp');
    const emailButton = document.getElementById('btnSendOrderEmail');
    const stateBox = document.getElementById('viewOrderState');
    const id = Number(report.dataset.orderId);

    let currentDetails = null;

    const norm = s => String(s || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const html = v => {
        const d = document.createElement('div');
        d.textContent = v ?? '';
        return d.innerHTML;
    };
    const value = (r, n, f = '') => {
        r = r || {};
        for (const x of n) {
            const k = Object.keys(r).find(y => norm(y) === norm(x));
            if (k && r[k] != null) return r[k];
        }
        return f;
    };
    const money = v => 'S$' + (Number(v) || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    const date = v => {
        if (!v) return '-';
        const d = new Date(v);
        return isNaN(d) ? v : d.toLocaleDateString('en-SG');
    };
    const line = (l, v) => '<div>' + l + ': ' + html(v || '-') + '</div>';
    const section = (title, headers, rows, fields, empty) =>
        '<section class="review-section"><div class="review-table-title">' + title +
        '</div><div class="review-table-wrap"><table class="item-table review-table"><thead><tr>' +
        headers.map(x => '<th>' + x + '</th>').join('') +
        '</tr></thead><tbody>' +
        (rows.length
            ? rows.map(r => '<tr>' + fields.map(f => '<td>' + f(r) + '</td>').join('') + '</tr>').join('')
            : '<tr><td colspan="' + headers.length + '" class="view-order-empty">' + empty + '</td></tr>') +
        '</tbody></table></div></section>';
    const friendlyOrderError = message => window.AdminOrderShare && typeof window.AdminOrderShare.sanitizeOrderErrorMessage === 'function'
        ? window.AdminOrderShare.sanitizeOrderErrorMessage(message, 'Unable to load order details right now. Please try again.')
        : 'Unable to load order details right now. Please try again.';

    function setActionButtons(enabled) {
        [downloadButton, whatsappButton, emailButton].forEach(function (button) {
            if (!button) return;
            button.disabled = !enabled;
        });
    }

    setActionButtons(false);

    fetch('/Admin/ViewOrderDetails/get?orderId=' + encodeURIComponent(id))
        .then(async r => {
            const b = await r.json();
            if (!r.ok) throw Error(friendlyOrderError(b.message));
            return b;
        })
        .then(data => {
            const details = data.details || {};
            currentDetails = details;

            const head = details.order || {};
            const packageRow = Object.assign({}, head, details.package || {});
            const eventRow = details.event || {};
            const included = details.includedItems || [];
            const extras = details.extraItems || [];
            const addons = details.addOns || [];
            const utensils = details.utensils || [];
            const statusText = value(head, ['OrderStatusName', 'StatusName', 'Status'], '-');
            const isQuotation = statusText.trim().toLowerCase() === 'quotation';
            const orderLabel = isQuotation ? 'Quotation' : 'Order';

            document.getElementById('pageTitle').textContent = isQuotation ? 'Quotation Details' : 'Order Details';
            document.getElementById('pageSubTitle').textContent = isQuotation
                ? 'Complete catering quotation summary'
                : 'Complete catering order summary';
            document.getElementById('orderNumber').textContent = orderLabel + ': ' + value(head, ['OrderNumber', 'OrderNo'], '#' + data.orderId);
            document.getElementById('orderDate').textContent = 'Date: ' + date(value(head, ['CreatedDate', 'OrderDate']));
            document.getElementById('orderStatus').textContent = 'Status: ' + (statusText || '-');

            document.getElementById('customerInfo').innerHTML =
                line('Name', value(head, ['CustomerName', 'Name'])) +
                line('Contact', value(head, ['ContactName', 'ContactPerson'])) +
                line('Email', value(head, ['EmailId', 'Email'])) +
                line('Mobile', value(head, ['MobileNo', 'Phone', 'ContactNo'])) +
                line('Address', value(head, ['CustomerAddress']));

            const eventAddress = value(eventRow, ['EventAddress']) || value(head, ['DeliveryAddress', 'CustomerAddress']);
            const eventNotes = value(eventRow, ['Notes']) || value(head, ['Notes']);

            document.getElementById('eventInfo').innerHTML =
                line('Event Name', value(head, ['EventName', 'EventType'])) +
                line('Date', date(value(eventRow, ['EventDate']) || value(head, ['EventDate']))) +
                line('Meal Period', value(head, ['MealPeriodName', 'MealPeriod'])) +
                line('Pax', value(head, ['Pax'])) +
                line('Address', eventAddress) +
                line('Notes', eventNotes);

            let out = section(
                'Package Details',
                ['Package', 'Rate', 'Pax', 'Amount'],
                [packageRow],
                [
                    r => html(value(r, ['PackageName', 'Package'], '-')),
                    r => money(value(r, ['PackageRate', 'Rate', 'PackagePrice'])) + '/pax',
                    r => html(value(r, ['Pax'], 0)),
                    r => money(value(r, ['PackageBaseAmount', 'PackageAmount']))
                ],
                'No package selected.'
            );

            out += section(
                'Included Package Dish Choices',
                ['Category', 'Dish', 'Included Qty', 'Unit', 'Status'],
                included,
                [
                    r => html(value(r, ['CategoryName', 'Category'], '-')),
                    r => html(value(r, ['MenuName', 'DishName', 'Dish'], '-')),
                    r => html(value(r, ['IncludedQty', 'Qty'], 1)),
                    r => html(value(r, ['Unit'], 'choice')),
                    r => '<span class="included-pill">Included</span>'
                ],
                'No package dishes selected.'
            );

            if (extras.length) {
                out += section(
                    'Additional Chargeable Menu Items',
                    ['Item', 'Category', 'Qty', 'Unit', 'Unit Price', 'Amount'],
                    extras,
                    [
                        r => html(value(r, ['MenuName', 'ItemName', 'Item'], '-')),
                        r => html(value(r, ['CategoryName', 'Category'], '-')),
                        r => html(value(r, ['Qty'], 0)),
                        r => html(value(r, ['Unit'], 'item')),
                        r => money(value(r, ['UnitPrice', 'Price'])),
                        r => money(value(r, ['TotalAmount', 'Amount']))
                    ],
                    ''
                );
            }

            if (addons.length) {
                out += section(
                    'Add-ons',
                    ['Add-on', 'Unit', 'Qty', 'Price', 'Amount'],
                    addons,
                    [
                        r => html(value(r, ['AddOnName', 'AddOnsName', 'Name'], '-')),
                        r => html(value(r, ['Unit'], 'event')),
                        r => html(value(r, ['Qty'], 0)),
                        r => money(value(r, ['UnitPrice', 'Price'])),
                        r => money(value(r, ['TotalAmount', 'Amount']))
                    ],
                    ''
                );
            }

            if (utensils.length) {
                out += section(
                    'Utensils / Equipment',
                    ['Item', 'Qty', 'Rental', 'Deposit', 'Amount'],
                    utensils,
                    [
                        r => html(value(r, ['UtensilName', 'UtensilsName', 'ItemName'], '-')),
                        r => html(value(r, ['Qty'], 0)),
                        r => money(value(r, ['UnitPrice', 'Rental'])),
                        r => money(value(r, ['RefundableDeposit', 'Deposit'])),
                        r => money(value(r, ['TotalAmount', 'Amount']))
                    ],
                    ''
                );
            }

            document.getElementById('orderSections').innerHTML = out;

            const payments = [
                ['Package Base', value(head, ['PackageBaseAmount'])],
                ['Additional Menu', value(head, ['AdditionalMenuAmount'])],
                ['Add-ons', value(head, ['AddOnsAmount'])],
                ['Utensils / Setup', value(head, ['UtensilsAmount'])],
                ['GST (' + value(head, ['TaxPercentage'], 0) + '%)', value(head, ['TaxAmount'])],
                ['Refundable Deposit', value(head, ['RefundableDeposit'])]
            ];

            document.getElementById('paymentSummary').innerHTML =
                payments.map(p => '<tr><td>' + p[0] + '</td><td>' + money(p[1]) + '</td></tr>').join('') +
                '<tr class="review-grand-total"><td>Total</td><td>' +
                money(value(head, ['TotalAmount', 'GrandTotal'])) +
                '</td></tr>';

            stateBox.classList.add('view-order-hidden');
            report.classList.remove('view-order-hidden');
            setActionButtons(true);
        })
        .catch(e => {
            stateBox.textContent = e.message;
            setActionButtons(false);
        });

    if (downloadButton) {
        downloadButton.addEventListener('click', function () {
            window.AdminOrderShare.downloadOrderPdf(id, {
                button: downloadButton,
                details: currentDetails,
                busyText: 'Downloading...'
            }).catch(function (error) {
                if (window.showToast) {
                    showToast(error.message || 'Unable to download PDF.', 4000, {
                        type: 'error',
                        title: 'Download failed'
                    });
                }
            });
        });
    }

    if (whatsappButton) {
        whatsappButton.addEventListener('click', function () {
            window.AdminOrderShare.prepareWhatsappShare(id, {
                button: whatsappButton,
                details: currentDetails,
                busyText: 'Preparing...'
            }).catch(function (error) {
                if (window.showToast) {
                    showToast(error.message || 'Unable to prepare WhatsApp order details.', 4000, {
                        type: 'error',
                        title: 'WhatsApp failed'
                    });
                }
            });
        });
    }

    if (emailButton) {
        emailButton.addEventListener('click', function () {
            window.AdminOrderShare.sendOrderEmail(id, {
                button: emailButton,
                details: currentDetails,
                busyText: 'Sending...'
            }).catch(function (error) {
                if (window.showToast) {
                    showToast(error.message || 'Unable to send order email.', 4000, {
                        type: 'error',
                        title: 'Email failed'
                    });
                }
            });
        });
    }
});

