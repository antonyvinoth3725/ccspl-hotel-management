(function (window) {
    'use strict';

    function norm(value) {
        return String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    }

    function valueOf(record, names, fallback) {
        var row = record || {};
        var defaultValue = arguments.length >= 3 ? fallback : '';
        for (var i = 0; i < names.length; i++) {
            var target = norm(names[i]);
            var key = Object.keys(row).find(function (candidate) {
                return norm(candidate) === target;
            });
            if (key && row[key] !== null && row[key] !== undefined) {
                return row[key];
            }
        }
        return defaultValue;
    }

    function money(value) {
        return 'S$' + (Number(value) || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function displayDate(value) {
        if (!value) return '-';
        var parsed = new Date(value);
        return isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-CA');
    }

    function escapeHtml(value) {
        var node = document.createElement('div');
        node.textContent = value ?? '';
        return node.innerHTML;
    }

    function toast(message, type, title, timeout) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, timeout || 3500, { type: type || 'info', title: title || '' });
        }
    }

    function sanitizeOrderErrorMessage(message, fallback) {
        var raw = String(message || '').trim();
        var safeFallback = fallback || 'Unable to load order details right now. Please try again.';

        if (!raw) {
            return safeFallback;
        }

        var lowered = raw.toLowerCase();
        var looksTechnical =
            lowered.indexOf('database error') >= 0 ||
            lowered.indexOf('invalid column name') >= 0 ||
            lowered.indexOf('sql') >= 0 ||
            lowered.indexOf('exception') >= 0 ||
            lowered.indexOf('stack trace') >= 0;

        return looksTechnical ? safeFallback : raw;
    }

    function toDomButton(button) {
        if (!button) return null;
        if (window.jQuery && button instanceof window.jQuery) {
            return button[0] || null;
        }
        return button.nodeType ? button : null;
    }

    function runWithButtonState(button, busyText, work) {
        var element = toDomButton(button);
        if (!element) {
            return Promise.resolve().then(work);
        }

        var previousHtml = element.innerHTML;
        element.disabled = true;
        element.innerHTML = busyText;

        return Promise.resolve()
            .then(work)
            .finally(function () {
                element.disabled = false;
                element.innerHTML = previousHtml;
            });
    }

    async function fetchOrderDetails(orderId, options) {
        var opts = options || {};
        var requestUrl = opts.detailsUrl || ('/Admin/ViewOrderDetails/get?orderId=' + encodeURIComponent(orderId));
        var response = await fetch(requestUrl, {
            headers: { 'Accept': 'application/json' }
        });
        var payload = await response.json();
        if (!response.ok || !payload || !payload.success) {
            throw new Error(sanitizeOrderErrorMessage(payload && payload.message, 'Unable to load order details right now. Please try again.'));
        }
        return payload.details || {};
    }

    function resolveOrderDetails(orderId, options) {
        var opts = options || {};
        if (opts.details) {
            return Promise.resolve(opts.details);
        }
        if (typeof opts.fetchDetails === 'function') {
            return Promise.resolve(opts.fetchDetails(orderId));
        }
        return fetchOrderDetails(orderId, opts);
    }

    function getCustomerWhatsappNumber(details) {
        var head = details && details.order ? details.order : {};
        var raw = String(valueOf(head, ['MobileNo', 'Phone', 'ContactNo'], '') || '').trim();
        var normalized = raw.replace(/[^\d]/g, '');
        if (normalized.indexOf('00') === 0) {
            normalized = normalized.substring(2);
        }
        return normalized;
    }

    function getCustomerEmail(details) {
        var head = details && details.order ? details.order : {};
        return String(valueOf(head, ['EmailId', 'Email'], '') || '').trim();
    }

    function getOrderPdfFileName(orderId, details) {
        var head = details && details.order ? details.order : {};
        var orderNumber = String(valueOf(head, ['OrderNumber', 'OrderNo'], 'Order-' + orderId) || '').trim();
        var safe = orderNumber.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '');
        return (safe || ('Order-' + orderId)) + '-details.pdf';
    }

    function isQuotationDetails(details, options) {
        var opts = options || {};
        if (opts.forceQuotation === true || String(opts.documentType || '').toLowerCase() === 'quotation') {
            return true;
        }

        var head = details && details.order ? details.order : {};
        var statusText = String(valueOf(head, ['OrderStatusName', 'StatusName', 'Status'], '') || '').trim().toLowerCase();
        return statusText === 'quotation';
    }

    function getInvoiceReportUrl(orderId) {
        return '/Common/ReportPdf?reportId=4&orderId=' + encodeURIComponent(orderId);
    }

    function getInvoicePdfFileName(orderId, details) {
        var head = details && details.order ? details.order : {};
        var orderNumber = String(valueOf(head, ['OrderNumber', 'OrderNo'], 'Invoice-' + orderId) || '').trim();
        var safe = orderNumber.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '');
        return (safe || ('Invoice-' + orderId)) + '.pdf';
    }

    function parseFileNameFromDisposition(disposition) {
        var raw = String(disposition || '').trim();
        if (!raw) return '';
        var utfMatch = raw.match(/filename\*=UTF-8''([^;]+)/i);
        if (utfMatch && utfMatch[1]) {
            try {
                return decodeURIComponent(utfMatch[1]).replace(/^["']|["']$/g, '');
            } catch (_error) {
                return utfMatch[1].replace(/^["']|["']$/g, '');
            }
        }
        var plainMatch = raw.match(/filename="?([^";]+)"?/i);
        return plainMatch && plainMatch[1] ? plainMatch[1].trim() : '';
    }

    async function readJsonError(response, fallbackMessage) {
        var text = await response.text();
        if (!text) {
            throw new Error(fallbackMessage);
        }

        try {
            var payload = JSON.parse(text);
            var message = payload && (payload.Message || payload.message) ? (payload.Message || payload.message) : fallbackMessage;
            throw new Error(message);
        } catch (parseError) {
            if (parseError instanceof SyntaxError) {
                throw new Error(text || fallbackMessage);
            }
            throw parseError;
        }
    }

    async function fetchInvoicePdfArtifact(orderId, details) {
        var response = await fetch(getInvoiceReportUrl(orderId), {
            headers: { 'Accept': 'application/pdf' }
        });

        if (!response.ok) {
            await readJsonError(response, 'Unable to generate invoice PDF.');
        }

        var pdfBlob = await response.blob();
        var headerFileName = parseFileNameFromDisposition(response.headers.get('content-disposition'));
        var fileName = headerFileName || getInvoicePdfFileName(orderId, details);

        return {
            fileName: fileName,
            pdfBlob: pdfBlob
        };
    }

    async function createAttachmentArtifact(orderId, details, options) {
        var opts = options || {};
        if (typeof opts.createAttachmentArtifact === 'function') {
            var customArtifact = await Promise.resolve(opts.createAttachmentArtifact(orderId, details, opts));
            if (!customArtifact || !customArtifact.pdfBlob || !customArtifact.fileName) {
                throw new Error('Unable to prepare the PDF attachment.');
            }

            return {
                fileName: customArtifact.fileName,
                pdfBlob: customArtifact.pdfBlob,
                source: customArtifact.source || 'custom'
            };
        }

        if (opts.useInvoicePdf === false) {
            var detailFileName = getOrderPdfFileName(orderId, details);
            var detailBlob = await createOrderDetailsPdfBlob(details, detailFileName);
            return {
                fileName: detailFileName,
                pdfBlob: detailBlob,
                source: 'order-details'
            };
        }

        var invoiceArtifact = await fetchInvoicePdfArtifact(orderId, details);
        return {
            fileName: invoiceArtifact.fileName,
            pdfBlob: invoiceArtifact.pdfBlob,
            source: 'invoice'
        };
    }

    function buildWhatsappMessage(orderId, details, options) {
        var head = details && details.order ? details.order : {};
        var eventInfo = details && details.event ? details.event : {};
        var customerName = valueOf(head, ['CustomerName', 'Name'], 'Customer');
        var orderNumber = valueOf(head, ['OrderNumber', 'OrderNo'], '#' + orderId);
        var eventName = valueOf(head, ['EventName', 'EventType'], '-');
        var mealPeriod = valueOf(head, ['MealPeriodName', 'MealPeriod'], '-');
        var pax = Number(valueOf(head, ['Pax'], 0)) || 0;
        var totalAmount = money(valueOf(head, ['TotalAmount', 'GrandTotal'], 0));
        var status = valueOf(head, ['OrderStatusName', 'StatusName', 'Status'], 'Pending');
        var eventDate = displayDate(valueOf(eventInfo, ['EventDate'], valueOf(head, ['EventDate'], null)));
        var isQuotation = isQuotationDetails(details, options);
        var label = isQuotation ? 'Quotation' : 'Invoice';

        return [
            'Hello ' + customerName + ',',
            '',
            'Please find your ' + label.toLowerCase() + ' details below:',
            label + ': ' + orderNumber,
            'Event: ' + eventName,
            'Event Date: ' + eventDate,
            'Meal Period: ' + mealPeriod,
            'Pax: ' + pax,
            'Total: ' + totalAmount,
            'Status: ' + status,
            '',
            'Regards,',
            'Gayatri Catering'
        ].join('\n');
    }

    function buildEmailSubject(orderId, details, options) {
        var head = details && details.order ? details.order : {};
        var orderNumber = valueOf(head, ['OrderNumber', 'OrderNo'], 'Order #' + orderId);
        var status = String(valueOf(head, ['OrderStatusName', 'StatusName', 'Status'], '') || '').trim().toLowerCase();
        if (!isQuotationDetails(details, options) && status === 'cancelled') {
            return 'Cancelled Invoice - ' + orderNumber;
        }
        return isQuotationDetails(details, options) ? ('Quotation Details - ' + orderNumber) : ('Invoice - ' + orderNumber);
    }

    function buildEmailBody(orderId, details, options) {
        var head = details && details.order ? details.order : {};
        var eventInfo = details && details.event ? details.event : {};
        var customerName = valueOf(head, ['CustomerName', 'Name'], 'Customer');
        var orderNumber = valueOf(head, ['OrderNumber', 'OrderNo'], '#' + orderId);
        var eventName = valueOf(head, ['EventName', 'EventType'], '-');
        var mealPeriod = valueOf(head, ['MealPeriodName', 'MealPeriod'], '-');
        var pax = valueOf(head, ['Pax'], 0);
        var totalAmount = money(valueOf(head, ['TotalAmount', 'GrandTotal'], 0));
        var status = valueOf(head, ['OrderStatusName', 'StatusName', 'Status'], 'Pending');
        var eventDate = displayDate(valueOf(eventInfo, ['EventDate'], valueOf(head, ['EventDate'], null)));
        var logoUrl = window.location.origin + '/images/logo.jpg';
        var isQuotation = isQuotationDetails(details, options);
        var title = isQuotation ? 'Quotation' : 'Invoice';

        return [
            '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111827;">',
            '<p style="margin:0 0 18px;">Dear ' + escapeHtml(customerName) + ',</p>',
            '<p style="margin:0 0 18px;">Thank you for choosing <strong>Gayatri Catering</strong>. Please find attached your ' + escapeHtml(title.toLowerCase()) + ' PDF for <strong>' + escapeHtml(orderNumber) + '</strong>.</p>',
            '<div style="margin:0 0 18px;">',
            '<div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:6px;">' + escapeHtml(title) + ' Summary</div>',
            '<div>Event: ' + escapeHtml(eventName) + '</div>',
            '<div>Event Date: ' + escapeHtml(eventDate) + '</div>',
            '<div>Meal Period: ' + escapeHtml(mealPeriod) + '</div>',
            '<div>Pax: ' + escapeHtml(pax) + '</div>',
            '<div>Total: ' + escapeHtml(totalAmount) + '</div>',
            '<div>Status: ' + escapeHtml(status) + '</div>',
            '</div>',
            '<p style="margin:0 0 26px;">Kindly review the attached order details and keep it for your reference. If you need any clarification regarding the event details, order amount, or payment status, please contact our team and we will assist you.</p>',
            '<div style="margin-top:10px;padding-top:8px;">',
            '<div style="margin-bottom:12px;"><img src="' + escapeHtml(logoUrl) + '" alt="Gayatri Catering" width="180" style="display:block;width:180px;max-width:180px;height:auto;"></div>',
            '<div style="font-size:13px;line-height:1.55;color:#1f2937;">',
            '<div><strong>Main Restaurant: 122 Race Course Road #01-01, Singapore 218583</strong></div>',
            '<div>Tel: 6291 1011 | Office: 6292 4544 | Fax: 62974850</div>',
            '<div>Email: info@gayatrirestaurant.com | WhatsApp: +65 6294 6294</div>',
            '<div>Website: <a href="https://www.gayatrirestaurant.com" style="color:#0f766e;text-decoration:underline;">www.gayatrirestaurant.com</a> | Co. Regn. No. 52817812A</div>',
            '</div>',
            '</div>',
            '</div>'
        ].join('');
    }

    function buildPaymentFailureEmailSubject(orderId, details, options) {
        var head = details && details.order ? details.order : {};
        var orderNumber = valueOf(head, ['OrderNumber', 'OrderNo'], 'Order #' + orderId);
        var prefix = String(options && options.subjectPrefix || 'Payment Pending').trim() || 'Payment Pending';
        return prefix + ' - ' + orderNumber;
    }

    function resolvePaymentFailureCustomerName(details) {
        var head = details && details.order ? details.order : {};
        var candidates = [
            valueOf(head, ['CustomerName', 'Name'], ''),
            valueOf(head, ['ContactName', 'ContactPerson', 'PersonName'], ''),
            valueOf(head, ['CompanyName', 'Company'], '')
        ];

        for (var i = 0; i < candidates.length; i++) {
            var candidate = String(candidates[i] || '').trim();
            if (!candidate) continue;
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) continue;
            return candidate;
        }

        return 'Customer';
    }

    function buildPaymentFailureEmailBody(orderId, details, options) {
        var head = details && details.order ? details.order : {};
        var customerName = resolvePaymentFailureCustomerName(details);
        var orderNumber = valueOf(head, ['OrderNumber', 'OrderNo'], '#' + orderId);
        var totalAmount = money(valueOf(head, ['TotalAmount', 'GrandTotal'], 0));
        var paidAmount = money(valueOf(head, ['PaidAmount'], 0));
        var outstandingAmount = money(Math.max(0, Number(valueOf(head, ['TotalAmount', 'GrandTotal'], 0)) - Number(valueOf(head, ['PaidAmount'], 0))));
        var logoUrl = window.location.origin + '/images/logo.jpg';
        var supportPhone = String(options && options.supportPhone || '+65 6294 6294').trim() || '+65 6294 6294';
        var supportEmail = String(options && options.supportEmail || 'info@gayatrirestaurant.com').trim() || 'info@gayatrirestaurant.com';
        var reasonText = String(options && options.reasonText || 'the payment window was closed or cancelled before the transaction was completed').trim();

        return [
            '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111827;">',
            '<p style="margin:0 0 18px;">Dear ' + escapeHtml(customerName) + ',</p>',
            '<p style="margin:0 0 18px;">Your order <strong>' + escapeHtml(orderNumber) + '</strong> has been created successfully, but ' + escapeHtml(reasonText) + '.</p>',
            '<div style="margin:0 0 18px;">',
            '<div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:6px;">Payment Summary</div>',
            '<div>Total: ' + escapeHtml(totalAmount) + '</div>',
            '<div>Paid: ' + escapeHtml(paidAmount) + '</div>',
            '<div>Outstanding: ' + escapeHtml(outstandingAmount) + '</div>',
            '<div>Status: Payment Pending</div>',
            '</div>',
            '<p style="margin:0 0 18px;">Please complete the payment again when you are ready. If you need help, contact our team at <strong>' + escapeHtml(supportPhone) + '</strong> or <a href="mailto:' + escapeHtml(supportEmail) + '" style="color:#0f766e;text-decoration:underline;">' + escapeHtml(supportEmail) + '</a>.</p>',
            '<p style="margin:0 0 26px;">For your reference, the invoice PDF for this order is attached to this email.</p>',
            '<div style="margin-top:10px;padding-top:8px;">',
            '<div style="margin-bottom:12px;"><img src="' + escapeHtml(logoUrl) + '" alt="Gayatri Catering" width="180" style="display:block;width:180px;max-width:180px;height:auto;"></div>',
            '<div style="font-size:13px;line-height:1.55;color:#1f2937;">',
            '<div><strong>Main Restaurant: 122 Race Course Road #01-01, Singapore 218583</strong></div>',
            '<div>Catering Hotline: ' + escapeHtml(supportPhone) + '</div>',
            '<div>Email: ' + escapeHtml(supportEmail) + '</div>',
            '</div>',
            '</div>',
            '</div>'
        ].join('');
    }

    function createOrderDetailsPdfBlob(details, fileName) {
        var reportHtml = buildOrderDetailsHtml(details);
        return new Promise(function (resolve, reject) {
            createPdfBlobFromHtml(reportHtml, fileName, resolve, reject);
        });
    }

    function createPdfBlobFromHtml(reportHtml, fileName, done, fail) {
        var jsPdfFactory = window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : null;
        if (!jsPdfFactory) {
            fail(new Error('PDF library is not available.'));
            return;
        }

        if (!window.html2canvas) {
            fail(new Error('html2canvas is not available.'));
            return;
        }

        var host = document.createElement('div');
        host.style.position = 'fixed';
        host.style.left = '-20000px';
        host.style.top = '0';
        host.style.width = '1040px';
        host.style.maxWidth = '1040px';
        host.style.background = '#fff';
        host.style.padding = '0';
        host.style.boxSizing = 'border-box';
        host.style.overflow = 'visible';
        host.style.opacity = '1';
        host.style.visibility = 'visible';
        host.style.zIndex = '1';
        host.style.pointerEvents = 'none';
        host.innerHTML = reportHtml;
        document.body.appendChild(host);

        var images = host.querySelectorAll('img');
        var imagePromises = [];
        images.forEach(function (img) {
            if (img.complete) return;
            imagePromises.push(new Promise(function (resolveImage) {
                img.onload = img.onerror = resolveImage;
            }));
        });

        Promise.all(imagePromises)
            .then(function () {
                return window.html2canvas(host, {
                    scale: Math.min(2, Math.max(1.5, window.devicePixelRatio || 1.5)),
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    allowTaint: true,
                    logging: false,
                    windowWidth: host.scrollWidth,
                    windowHeight: host.scrollHeight
                });
            })
            .then(function (canvas) {
                if (host.parentNode) {
                    host.parentNode.removeChild(host);
                }

                var pdf = new jsPdfFactory('p', 'pt', 'a4');
                var pageWidth = pdf.internal.pageSize.getWidth();
                var pageHeight = pdf.internal.pageSize.getHeight();
                var marginLeft = 20;
                var marginRight = 20;
                var marginTop = 20;
                var pageNumberGap = 20;
                var contentWidth = pageWidth - marginLeft - marginRight;
                var availableHeight = pageHeight - marginTop - pageNumberGap;
                var fullContentHeight = canvas.height * contentWidth / canvas.width;
                var totalPages = Math.max(1, Math.ceil(fullContentHeight / availableHeight));
                var sliceHeightPx = Math.max(1, Math.floor(canvas.width * (availableHeight / contentWidth)));
                var pageCanvas = document.createElement('canvas');
                var pageContext = pageCanvas.getContext('2d');
                var renderedHeight = 0;
                var pageIndex = 0;

                if (!pageContext) {
                    throw new Error('Unable to prepare PDF canvas.');
                }

                pageCanvas.width = canvas.width;

                while (renderedHeight < canvas.height) {
                    var currentSliceHeight = Math.min(sliceHeightPx, canvas.height - renderedHeight);
                    pageCanvas.height = currentSliceHeight;
                    pageContext.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
                    pageContext.drawImage(
                        canvas,
                        0,
                        renderedHeight,
                        canvas.width,
                        currentSliceHeight,
                        0,
                        0,
                        canvas.width,
                        currentSliceHeight
                    );

                    if (pageIndex > 0) {
                        pdf.addPage();
                    }

                    var imageData = pageCanvas.toDataURL('image/png');
                    var pageRenderHeight = currentSliceHeight * contentWidth / canvas.width;
                    pdf.addImage(imageData, 'PNG', marginLeft, marginTop, contentWidth, pageRenderHeight, undefined, 'FAST');
                    pdf.setFontSize(9);
                    pdf.text('Page ' + (pageIndex + 1) + ' of ' + totalPages, pageWidth - marginRight, pageHeight - 8, { align: 'right' });

                    renderedHeight += currentSliceHeight;
                    pageIndex += 1;
                }

                done(pdf.output('blob'));
            })
            .catch(function (error) {
                if (host.parentNode) {
                    host.parentNode.removeChild(host);
                }

                fail(error instanceof Error ? error : new Error('Unable to render order details PDF.'));
            });
    }

    function buildOrderDetailsHtml(details) {
        var head = details && details.order ? details.order : {};
        var packageInfo = Object.assign({}, head, details && details.package ? details.package : {});
        var eventInfo = details && details.event ? details.event : {};
        var included = Array.isArray(details && details.includedItems) ? details.includedItems : [];
        var extras = Array.isArray(details && details.extraItems) ? details.extraItems : [];
        var addons = Array.isArray(details && details.addOns) ? details.addOns : [];
        var utensils = Array.isArray(details && details.utensils) ? details.utensils : [];
        var statusText = valueOf(head, ['OrderStatusName', 'StatusName', 'Status'], '-');
        var isQuotation = String(statusText).trim().toLowerCase() === 'quotation';
        var titleText = isQuotation ? 'Quotation Details' : 'Order Details';
        var orderLabel = isQuotation ? 'Quotation' : 'Order';
        var eventAddress = valueOf(eventInfo, ['EventAddress'], valueOf(head, ['DeliveryAddress', 'CustomerAddress'], '-'));
        var eventNotes = valueOf(eventInfo, ['Notes'], valueOf(head, ['Notes'], '-'));
        var refundableDeposit = valueOf(head, ['RefundableDeposit'], 0);

        function line(label, val) {
            return '<div>' + escapeHtml(label) + ': ' + escapeHtml(val || '-') + '</div>';
        }

        function section(title, headers, rows, fields, empty) {
            var body = rows.length
                ? rows.map(function (row) {
                    return '<tr>' + fields.map(function (field) { return '<td>' + field(row) + '</td>'; }).join('') + '</tr>';
                }).join('')
                : '<tr><td colspan="' + headers.length + '" class="pdf-empty">' + escapeHtml(empty) + '</td></tr>';

            return '<section class="pdf-section-block"><div class="pdf-table-title">' + escapeHtml(title) + '</div><table class="pdf-table"><thead><tr>' +
                headers.map(function (header) { return '<th>' + escapeHtml(header) + '</th>'; }).join('') +
                '</tr></thead><tbody>' + body + '</tbody></table></section>';
        }

        var htmlParts = [];
        htmlParts.push('<div class="admin-order-pdf">');
        htmlParts.push('<style>' +
            '.admin-order-pdf{background:#fff;color:#1a1a1a;font-family:Segoe UI,Calibri,Tahoma,sans-serif;margin:0 auto;max-width:1040px;padding:20px 22px 28px;line-height:1.45}' +
            '.admin-order-pdf *{box-sizing:border-box}' +
            '.pdf-header{display:flex;justify-content:space-between;gap:28px;align-items:flex-start;border-bottom:2px solid #1a6e3c;padding-bottom:14px;margin-bottom:14px}' +
            '.pdf-logo-wrap{width:240px;flex:0 0 240px}' +
            '.pdf-logo{width:180px;max-width:180px;height:auto;object-fit:contain}' +
            '.pdf-brand{flex:1 1 auto;text-align:right}' +
            '.pdf-brand-title{font-family:Georgia,Times New Roman,serif;font-size:30px;font-weight:700;color:#124d2b;margin:0 0 8px}' +
            '.pdf-brand-line{font-size:12px;line-height:1.45}' +
            '.pdf-meta{display:flex;justify-content:flex-end;gap:14px;flex-wrap:wrap;margin-bottom:14px;font-size:11px;color:#374151}' +
            '.pdf-split{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-bottom:16px;padding:0 0 16px;border-bottom:1px solid #d9e6de}' +
            '.pdf-split strong{display:block;font-size:15px;margin-bottom:8px;color:#124d2b}' +
            '.pdf-section-block{margin-bottom:16px}' +
            '.pdf-table-title{font-size:14px;font-weight:800;color:#111827;margin-bottom:6px}' +
            '.pdf-table{width:100%;border-collapse:collapse;border-spacing:0;table-layout:fixed}' +
            '.pdf-table th,.pdf-table td{border-bottom:1px solid #e5e7eb;padding:8px 10px;font-size:12px;vertical-align:top;word-wrap:break-word;white-space:normal}' +
            '.pdf-table th{background:#f6f7f8;color:#5d6b64;text-transform:uppercase;font-size:10.5px;letter-spacing:.04em}' +
            '.pdf-table td:last-child,.pdf-table th:last-child{text-align:right}' +
            '.pdf-table .pdf-center{text-align:center;display:block}' +
            '.pdf-payment tr:last-child td{font-weight:800;color:#124d2b;font-size:18px;border-bottom:0;padding-top:12px}' +
            '.pdf-pill{display:inline-block;padding:4px 10px;border-radius:999px;background:#d1fae5;color:#047857;font-weight:800;font-size:11px}' +
            '.pdf-empty{text-align:center;color:#6b7280}' +
            '</style>');
        htmlParts.push('<div class="pdf-header"><div class="pdf-logo-wrap"><img class="pdf-logo" src="' + window.location.origin + '/images/logo.jpg" alt="Gayatri Restaurant logo"></div><div class="pdf-brand"><div class="pdf-brand-title">Gayatri Restaurant Pte Ltd</div><div class="pdf-brand-line">Co. Regn. No. 52817812A</div><div class="pdf-brand-line">Main Restaurant: 122 Race Course Road #01-01, Singapore 218583</div><div class="pdf-brand-line">Tel: 6291 1011 | Office: 6292 4544 | Fax: 62974850</div><div class="pdf-brand-line">Email: info@gayatrirestaurant.com</div><div class="pdf-brand-line">WhatsApp: +65 6294 6294 | www.gayatrirestaurant.com</div></div></div>');
        htmlParts.push('<div class="pdf-meta"><span>' + escapeHtml(orderLabel) + ': ' + escapeHtml(valueOf(head, ['OrderNumber', 'OrderNo'], '-')) + '</span><span>Date: ' + escapeHtml(displayDate(valueOf(head, ['CreatedDate', 'OrderDate'], null))) + '</span><span>Status: ' + escapeHtml(statusText) + '</span></div>');
        htmlParts.push('<div class="pdf-split"><div><strong>Customer</strong>' +
            line('Name', valueOf(head, ['CustomerName', 'Name'], '-')) +
            line('Contact', valueOf(head, ['ContactName', 'ContactPerson'], '-')) +
            line('Email', valueOf(head, ['EmailId', 'Email'], '-')) +
            line('Mobile', valueOf(head, ['MobileNo', 'Phone', 'ContactNo'], '-')) +
            line('Address', valueOf(head, ['CustomerAddress'], '-')) +
            '</div><div><strong>Event</strong>' +
            line('Event Name', valueOf(head, ['EventName', 'EventType'], '-')) +
            line('Date', displayDate(valueOf(eventInfo, ['EventDate'], valueOf(head, ['EventDate'], null)))) +
            line('Meal Period', valueOf(head, ['MealPeriodName', 'MealPeriod'], '-')) +
            line('Pax', valueOf(head, ['Pax'], 0)) +
            line('Address', eventAddress) +
            line('Notes', eventNotes) +
            '</div></div>');

        htmlParts.push(section('Package Details', ['Package', 'Rate', 'Pax', 'Amount'], [packageInfo], [
            function (row) { return escapeHtml(valueOf(row, ['PackageName', 'Package'], '-')); },
            function (row) { return escapeHtml(money(valueOf(row, ['PackageRate', 'Rate', 'PackagePrice'], 0)) + '/pax'); },
            function (row) { return '<span class="pdf-center">' + escapeHtml(valueOf(row, ['Pax'], 0)) + '</span>'; },
            function (row) { return escapeHtml(money(valueOf(row, ['PackageBaseAmount', 'PackageAmount'], 0))); }
        ], 'No package selected.'));

        htmlParts.push(section('Included Package Dish Choices', ['Category', 'Dish', 'Included Qty', 'Unit', 'Status'], included, [
            function (row) { return escapeHtml(valueOf(row, ['CategoryName', 'Category'], '-')); },
            function (row) { return escapeHtml(valueOf(row, ['MenuName', 'DishName', 'Dish'], '-')); },
            function (row) { return '<span class="pdf-center">' + escapeHtml(valueOf(row, ['IncludedQty', 'Qty'], 1)) + '</span>'; },
            function () { return 'choice'; },
            function () { return '<span class="pdf-pill">Included</span>'; }
        ], 'No package dishes selected.'));

        if (extras.length) {
            htmlParts.push(section('Additional Chargeable Menu Items', ['Item', 'Category', 'Qty', 'Unit', 'Unit Price', 'Amount'], extras, [
                function (row) { return escapeHtml(valueOf(row, ['MenuName', 'ItemName', 'Item'], '-')); },
                function (row) { return escapeHtml(valueOf(row, ['CategoryName', 'Category'], '-')); },
                function (row) { return '<span class="pdf-center">' + escapeHtml(valueOf(row, ['Qty'], 0)) + '</span>'; },
                function (row) { return escapeHtml(valueOf(row, ['Unit'], 'item')); },
                function (row) { return escapeHtml(money(valueOf(row, ['UnitPrice', 'Price'], 0))); },
                function (row) { return escapeHtml(money(valueOf(row, ['TotalAmount', 'Amount'], 0))); }
            ], ''));
        }

        if (addons.length) {
            htmlParts.push(section('Add-ons', ['Add-on', 'Unit', 'Qty', 'Price', 'Amount'], addons, [
                function (row) { return escapeHtml(valueOf(row, ['AddOnName', 'AddOnsName', 'Name'], '-')); },
                function (row) { return escapeHtml(valueOf(row, ['Unit'], 'event')); },
                function (row) { return '<span class="pdf-center">' + escapeHtml(valueOf(row, ['Qty'], 0)) + '</span>'; },
                function (row) { return escapeHtml(money(valueOf(row, ['UnitPrice', 'Price'], 0))); },
                function (row) { return escapeHtml(money(valueOf(row, ['TotalAmount', 'Amount'], 0))); }
            ], ''));
        }

        if (utensils.length) {
            htmlParts.push(section('Utensils / Equipment', ['Item', 'Qty', 'Rental', 'Deposit', 'Amount'], utensils, [
                function (row) { return escapeHtml(valueOf(row, ['UtensilName', 'UtensilsName', 'ItemName'], '-')); },
                function (row) { return '<span class="pdf-center">' + escapeHtml(valueOf(row, ['Qty'], 0)) + '</span>'; },
                function (row) { return escapeHtml(money(valueOf(row, ['UnitPrice', 'Rental'], 0))); },
                function (row) { return escapeHtml(money(valueOf(row, ['RefundableDeposit', 'Deposit'], 0))); },
                function (row) { return escapeHtml(money(valueOf(row, ['TotalAmount', 'Amount'], 0))); }
            ], ''));
        }

        htmlParts.push('<section class="pdf-section-block"><div class="pdf-table-title">Payment Summary</div><table class="pdf-table pdf-payment"><tbody>' +
            '<tr><td>Package Base</td><td>' + escapeHtml(money(valueOf(head, ['PackageBaseAmount'], 0))) + '</td></tr>' +
            '<tr><td>Additional Menu</td><td>' + escapeHtml(money(valueOf(head, ['AdditionalMenuAmount'], 0))) + '</td></tr>' +
            '<tr><td>Add-ons</td><td>' + escapeHtml(money(valueOf(head, ['AddOnsAmount'], 0))) + '</td></tr>' +
            '<tr><td>Utensils / Setup</td><td>' + escapeHtml(money(valueOf(head, ['UtensilsAmount'], 0))) + '</td></tr>' +
            '<tr><td>GST (' + escapeHtml(valueOf(head, ['TaxPercentage'], 0)) + '%)</td><td>' + escapeHtml(money(valueOf(head, ['TaxAmount'], 0))) + '</td></tr>' +
            '<tr><td>Refundable Deposit</td><td>' + escapeHtml(money(refundableDeposit)) + '</td></tr>' +
            '<tr><td>Total</td><td>' + escapeHtml(money(valueOf(head, ['TotalAmount', 'GrandTotal'], 0))) + '</td></tr>' +
            '</tbody></table></section>');
        htmlParts.push('</div>');
        return htmlParts.join('');
    }

    function triggerBlobDownload(blob, fileName) {
        var blobUrl = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(function () {
            URL.revokeObjectURL(blobUrl);
        }, 2000);
    }

    async function downloadOrderPdf(orderId, options) {
        var opts = options || {};
        return runWithButtonState(opts.button, opts.busyText || 'Preparing...', async function () {
            var details = await resolveOrderDetails(orderId, opts);
            var artifact = await createAttachmentArtifact(orderId, details, opts);
            triggerBlobDownload(artifact.pdfBlob, artifact.fileName);

            if (opts.successToast !== false) {
                toast('PDF downloaded successfully.', 'success', 'Download');
            }

            return {
                details: details,
                fileName: artifact.fileName,
                pdfBlob: artifact.pdfBlob,
                source: artifact.source
            };
        });
    }

    function printInvoice(orderId, options) {
        var opts = options || {};
        var parsedOrderId = Number(orderId);
        if (!Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
            return Promise.reject(new Error('A valid order is required to print an invoice.'));
        }

        return runWithButtonState(opts.button, opts.busyText || 'Opening...', function () {
            var printWindow = window.open(getInvoiceReportUrl(parsedOrderId), '_blank');
            if (!printWindow) {
                throw new Error('Popup blocked. Allow popups to print the invoice.');
            }

            toast('Invoice opened. Use the browser print command to print it.', 'info', 'Print invoice');
            return printWindow;
        });
    }

    async function prepareWhatsappShare(orderId, options) {
        var opts = options || {};
        return runWithButtonState(opts.button, opts.busyText || 'Preparing...', async function () {
            var popupWindow = opts.popupWindow || null;
            if (!popupWindow && opts.openWindowImmediately !== false) {
                popupWindow = window.open('about:blank', '_blank');
            }

            var details = await resolveOrderDetails(orderId, opts);
            var phone = getCustomerWhatsappNumber(details);
            if (!phone) {
                if (popupWindow && !popupWindow.closed) {
                    popupWindow.close();
                }
                throw new Error('Customer mobile number is missing.');
            }

            var artifact = await createAttachmentArtifact(orderId, details, opts);
            var message = buildWhatsappMessage(orderId, details, opts);
            var shareUrl = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);

            triggerBlobDownload(artifact.pdfBlob, artifact.fileName);
            if (popupWindow && !popupWindow.closed) {
                popupWindow.location.href = shareUrl;
            } else {
                window.open(shareUrl, '_blank');
            }

            var pdfLabel = isQuotationDetails(details, opts) || opts.useInvoicePdf === false ? 'quotation details PDF' : 'invoice PDF';
            toast('WhatsApp opened for the customer and the ' + pdfLabel + ' was downloaded. Please attach the PDF in WhatsApp.', 'info', 'WhatsApp', 5000);

            return {
                details: details,
                fileName: artifact.fileName,
                pdfBlob: artifact.pdfBlob,
                shareUrl: shareUrl,
                source: artifact.source
            };
        });
    }

    async function sendOrderEmail(orderId, options) {
        var opts = options || {};
        return runWithButtonState(opts.button, opts.busyText || 'Sending...', async function () {
            var details = await resolveOrderDetails(orderId, opts);
            var email = getCustomerEmail(details);
            if (!email) {
                throw new Error('Customer email address is missing.');
            }

            if (!isQuotationDetails(details, opts) && opts.useInvoicePdf !== false) {
                var reportFormData = new FormData();
                reportFormData.append('ToEmail', email);
                reportFormData.append('Subject', opts.emailSubject || buildEmailSubject(orderId, details, opts));
                reportFormData.append('EmailBody', opts.emailBody || buildEmailBody(orderId, details, opts));
                reportFormData.append('ReportId', '4');
                reportFormData.append('OrderId', String(orderId));
                reportFormData.append('ReportFiltersJson', JSON.stringify({ OrderId: orderId }));

                var reportResponse = await fetch('/Common/SendReportEmail', {
                    method: 'POST',
                    body: reportFormData
                });

                var reportPayload = await reportResponse.json();
                if (!reportResponse.ok) {
                    throw new Error(reportPayload && reportPayload.Message ? reportPayload.Message : 'Unable to send email.');
                }

                toast('Invoice email sent successfully.', 'success', 'Email');

                return {
                    details: details,
                    payload: reportPayload,
                    source: 'invoice'
                };
            }

            var artifact = await createAttachmentArtifact(orderId, details, opts);
            var formData = new FormData();
            formData.append('ToEmail', email);
            formData.append('Subject', opts.emailSubject || buildEmailSubject(orderId, details, opts));
            formData.append('Body', opts.emailBody || buildEmailBody(orderId, details, opts));
            formData.append('Attachment', artifact.pdfBlob, artifact.fileName);

            var response = await fetch('/Common/SendEmail', {
                method: 'POST',
                body: formData
            });

            var payload = await response.json();
            if (!response.ok) {
                throw new Error(payload && payload.Message ? payload.Message : 'Unable to send email.');
            }

            toast('Order details email sent successfully.', 'success', 'Email');

            return {
                details: details,
                fileName: artifact.fileName,
                pdfBlob: artifact.pdfBlob,
                payload: payload,
                source: artifact.source
            };
        });
    }

    window.AdminOrderShare = {
        fetchOrderDetails: fetchOrderDetails,
        getOrderPdfFileName: getOrderPdfFileName,
        getCustomerWhatsappNumber: getCustomerWhatsappNumber,
        getCustomerEmail: getCustomerEmail,
        sanitizeOrderErrorMessage: sanitizeOrderErrorMessage,
        buildWhatsappMessage: buildWhatsappMessage,
        buildEmailSubject: buildEmailSubject,
        buildEmailBody: buildEmailBody,
        buildPaymentFailureEmailSubject: buildPaymentFailureEmailSubject,
        buildPaymentFailureEmailBody: buildPaymentFailureEmailBody,
        resolvePaymentFailureCustomerName: resolvePaymentFailureCustomerName,
        createOrderDetailsPdfBlob: createOrderDetailsPdfBlob,
        buildOrderDetailsHtml: buildOrderDetailsHtml,
        triggerBlobDownload: triggerBlobDownload,
        downloadOrderPdf: downloadOrderPdf,
        printInvoice: printInvoice,
        prepareWhatsappShare: prepareWhatsappShare,
        sendOrderEmail: sendOrderEmail
    };
})(window);
