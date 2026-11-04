$(document).ready(function () {
    bindAuthoriseSignatureCanvas();
    editsetting();
});

var GST_SCHEDULE_DRAFT_KEY = 'gc.settings.gstScheduleDraft';
var authoriseSignatureCanvas = null;
var authoriseSignatureContext = null;
var authoriseSignatureDrawing = false;
var authoriseSignatureHasInk = false;
var currentAuthoriseSignatureData = null;

function prepareAuthoriseSignatureCanvas() {
    authoriseSignatureCanvas = document.getElementById('authoriseSignatureCanvas');
    if (!authoriseSignatureCanvas) return;

    var bounds = authoriseSignatureCanvas.getBoundingClientRect();
    var ratio = window.devicePixelRatio || 1;
    authoriseSignatureCanvas.width = Math.max(1, Math.round(bounds.width * ratio));
    authoriseSignatureCanvas.height = Math.max(1, Math.round(bounds.height * ratio));
    authoriseSignatureContext = authoriseSignatureCanvas.getContext('2d');
    authoriseSignatureContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    authoriseSignatureContext.lineWidth = 2;
    authoriseSignatureContext.lineCap = 'round';
    authoriseSignatureContext.lineJoin = 'round';
    authoriseSignatureContext.strokeStyle = '#17231b';
    authoriseSignatureContext.fillStyle = '#ffffff';
    authoriseSignatureContext.fillRect(0, 0, bounds.width, bounds.height);
    authoriseSignatureHasInk = false;
}

function drawExistingAuthoriseSignature(signatureDataUrl) {
    if (!authoriseSignatureContext || !authoriseSignatureCanvas || !signatureDataUrl) {
        return;
    }

    var img = new Image();
    img.onload = function () {
        var bounds = authoriseSignatureCanvas.getBoundingClientRect();
        var maxWidth = bounds.width - 16;
        var maxHeight = bounds.height - 16;
        var scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        var drawWidth = img.width * scale;
        var drawHeight = img.height * scale;
        var x = (bounds.width - drawWidth) / 2;
        var y = (bounds.height - drawHeight) / 2;
        authoriseSignatureContext.drawImage(img, x, y, drawWidth, drawHeight);
        authoriseSignatureHasInk = true;
    };
    img.src = signatureDataUrl;
}

function signaturePointFromCanvas(event, canvas) {
    var bounds = canvas.getBoundingClientRect();
    return {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top
    };
}

function startAuthoriseSignature(event) {
    if (!authoriseSignatureContext || event.button > 0) return;
    event.preventDefault();
    authoriseSignatureDrawing = true;
    var point = signaturePointFromCanvas(event, authoriseSignatureCanvas);
    authoriseSignatureContext.beginPath();
    authoriseSignatureContext.moveTo(point.x, point.y);
    authoriseSignatureCanvas.setPointerCapture(event.pointerId);
}

function drawAuthoriseSignature(event) {
    if (!authoriseSignatureDrawing || !authoriseSignatureContext) return;
    event.preventDefault();
    var point = signaturePointFromCanvas(event, authoriseSignatureCanvas);
    authoriseSignatureContext.lineTo(point.x, point.y);
    authoriseSignatureContext.stroke();
    authoriseSignatureContext.beginPath();
    authoriseSignatureContext.moveTo(point.x, point.y);
    authoriseSignatureHasInk = true;
}

function endAuthoriseSignature(event) {
    if (!authoriseSignatureDrawing) return;
    authoriseSignatureDrawing = false;
    authoriseSignatureContext.closePath();
    if (authoriseSignatureCanvas && authoriseSignatureCanvas.hasPointerCapture(event.pointerId)) {
        authoriseSignatureCanvas.releasePointerCapture(event.pointerId);
    }
}

function clearAuthoriseSignature() {
    currentAuthoriseSignatureData = null;
    prepareAuthoriseSignatureCanvas();
}

function refreshAuthoriseSignatureCanvas(signatureDataUrl, attempt) {
    var tries = Number(attempt || 0);
    if (!authoriseSignatureCanvas) {
        authoriseSignatureCanvas = document.getElementById('authoriseSignatureCanvas');
    }
    if (!authoriseSignatureCanvas) {
        return;
    }

    // Canvas must be measured after panel is visible; hidden layout returns width 0.
    var bounds = authoriseSignatureCanvas.getBoundingClientRect();
    if (bounds.width <= 1 && tries < 6) {
        window.requestAnimationFrame(function () {
            refreshAuthoriseSignatureCanvas(signatureDataUrl, tries + 1);
        });
        return;
    }

    prepareAuthoriseSignatureCanvas();
    drawExistingAuthoriseSignature(signatureDataUrl || currentAuthoriseSignatureData);
}

function bindAuthoriseSignatureCanvas() {
    authoriseSignatureCanvas = document.getElementById('authoriseSignatureCanvas');
    if (!authoriseSignatureCanvas) return;

    refreshAuthoriseSignatureCanvas(currentAuthoriseSignatureData, 0);
    authoriseSignatureCanvas.addEventListener('pointerdown', startAuthoriseSignature);
    authoriseSignatureCanvas.addEventListener('pointermove', drawAuthoriseSignature);
    authoriseSignatureCanvas.addEventListener('pointerup', endAuthoriseSignature);
    authoriseSignatureCanvas.addEventListener('pointercancel', endAuthoriseSignature);

    $(window).on('resize', function () {
        var preserved = currentAuthoriseSignatureData;
        if (!preserved && authoriseSignatureHasInk && authoriseSignatureCanvas) {
            preserved = authoriseSignatureCanvas.toDataURL('image/png');
        }
        refreshAuthoriseSignatureCanvas(preserved, 0);
    });

    $(document).on('click', '#btnClearAuthoriseSignature', function () {
        clearAuthoriseSignature();
    });
}

function getAuthoriseSignatureData() {
    if (authoriseSignatureHasInk && authoriseSignatureCanvas) {
        return authoriseSignatureCanvas.toDataURL('image/png');
    }
    return currentAuthoriseSignatureData;
}

function readGstScheduleDraft() {
    try {
        var raw = localStorage.getItem(GST_SCHEDULE_DRAFT_KEY);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
        return null;
    }
}

function saveGstScheduleDraft(rate, effectiveFrom) {
    var nextRate = (rate || '').toString().trim();
    var nextEffective = (effectiveFrom || '').toString().trim();

    if (!nextRate || !nextEffective) {
        localStorage.removeItem(GST_SCHEDULE_DRAFT_KEY);
        return;
    }

    var payload = {
        rate: nextRate,
        effectiveFrom: nextEffective,
        savedAt: new Date().toISOString()
    };
    localStorage.setItem(GST_SCHEDULE_DRAFT_KEY, JSON.stringify(payload));
}

function applyGstScheduleDraftToForm() {
    var draft = readGstScheduleDraft();
    if (!draft) {
        return;
    }

    $('#upcomingGstRate').val(draft.rate || '');
    setGstEffectiveDateValue(normalizeDateInputValue(draft.effectiveFrom || ''));
}

function setGstEffectiveDateValue(value) {
    var normalized = normalizeDateInputValue(value || '');
    var input = document.getElementById('gstEffectiveFrom');
    if (!input) return;

    if (input._flatpickr) {
        input._flatpickr.setDate(normalized || null, true, 'Y-m-d');
    } else {
        $('#gstEffectiveFrom').val(normalized);
    }
}

function normalizeDateInputValue(dateValue) {
    var value = (dateValue || '').toString().trim();
    if (!value) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    // Handles values like 20-07-2026 or 20/07/2026
    var dmyMatch = value.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})(?:\s.*)?$/);
    if (dmyMatch) {
        return dmyMatch[3] + '-' + dmyMatch[2] + '-' + dmyMatch[1];
    }

    if (value.indexOf('T') > -1) {
        return value.split('T')[0];
    }

    if (value.indexOf(' ') > -1) {
        var firstPart = value.split(' ')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(firstPart)) {
            return firstPart;
        }

        var firstPartDmy = firstPart.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
        if (firstPartDmy) {
            return firstPartDmy[3] + '-' + firstPartDmy[2] + '-' + firstPartDmy[1];
        }
    }

    var parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
        var y = parsed.getFullYear();
        var m = (parsed.getMonth() + 1).toString().padStart(2, '0');
        var d = parsed.getDate().toString().padStart(2, '0');
        return y + '-' + m + '-' + d;
    }

    return '';
}

function updateGstScheduleNote() {
    var $note = $('#gstScheduleNote');
    if (!$note.length) return;

    var currentRate = ($('#gstrate').val() || '').toString().trim();
    var upcomingRate = ($('#upcomingGstRate').val() || '').toString().trim();
    var effectiveFrom = ($('#gstEffectiveFrom').val() || '').toString().trim();

    if (!upcomingRate || !effectiveFrom) {
        $note.text('Keep current GST in GST Rate (%). Enter upcoming GST and effective date to plan future change.');
        return;
    }

    $note.text('Current GST ' + (currentRate || '-') + '% remains active until ' + effectiveFrom + '. Upcoming GST ' + upcomingRate + '% is saved as schedule draft.');
}

function showSettingsLoader(show) {
    var $panel = $('#settingsPanel .pageloaderpanel');
    if ($panel.length) {
        $('#settingsContentWrap').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
    }
}

function validateForm() {
    clearsettingError('#Compname', '#CompnameError');
    clearsettingError('#uen', '#uenError');
    clearsettingError('#address', '#addressError');
    clearsettingError('#email', '#emailError');
    clearsettingError('#hotline', '#hotlineError');
    clearsettingError('#whatsapp', '#whatsappError');
    clearsettingError('#Quotaval', '#QuotavalError');
    clearsettingError('#gstrate', '#gstrateError');

    var upcomingRate = ($('#upcomingGstRate').val() || '').toString().trim();
    var effectiveFrom = ($('#gstEffectiveFrom').val() || '').toString().trim();
    if ((upcomingRate && !effectiveFrom) || (!upcomingRate && effectiveFrom)) {
        showToast('Enter both Upcoming GST Rate and GST Effective From, or keep both empty.', 3000, { type: 'warning', title: 'Validation' });
        if (!upcomingRate) {
            $('#upcomingGstRate').focus();
        } else {
            $('#gstEffectiveFrom').focus();
        }
        return false;
    }

    var code = ($('#Compname').val() || '').toString().trim();
    var name = ($('#uen').val() || '').toString().trim();
    var email = ($('#email').val() || '').toString().trim();
    var hotline = ($('#hotline').val() || '').toString().trim();
    var whatsapp = ($('#whatsapp').val() || '').toString().trim();

    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var hotlineDigits = hotline.replace(/\D/g, '');
    var whatsappDigits = whatsapp.replace(/\D/g, '');

    $('#hotline').val(hotlineDigits);
    $('#whatsapp').val(whatsappDigits);

    var firstInvalid = null;

    if (!code) {
        setsettingError('#Compname', '#CompnameError', 'Name is required');
        firstInvalid = '#Compname';
    }

    if (!name) {
        setsettingError('#uen', '#uenError', 'UEN is required');
        if (!firstInvalid) {
            firstInvalid = '#uen';
        }
    }

    if (email && !emailRegex.test(email)) {
        setsettingError('#email', '#emailError', 'Enter a valid email address');
        if (!firstInvalid) {
            firstInvalid = '#email';
        }
    }

    if (hotlineDigits && !/^\d{8,15}$/.test(hotlineDigits)) {
        setsettingError('#hotline', '#hotlineError', 'Hotline must be 8 to 15 digits');
        if (!firstInvalid) {
            firstInvalid = '#hotline';
        }
    }

    if (whatsappDigits && !/^\d{8,15}$/.test(whatsappDigits)) {
        setsettingError('#whatsapp', '#whatsappError', 'WhatsApp must be 8 to 15 digits');
        if (!firstInvalid) {
            firstInvalid = '#whatsapp';
        }
    }

    if (firstInvalid) {
        $(firstInvalid).focus();
        return false;
    }

    return true;
}

function savesettings() {
    if (window.gcFormValidation && !window.gcFormValidation.validateScope('#settingsContentWrap', true)) {
        return;
    }

    if (!validateForm()) {
        return;
    }

    setButtonBusy('#btnSaveSettings', true, 'Saving...');

    var settingId = $('#settingId').val();
    var upcomingRate = ($('#upcomingGstRate').val() || '').toString().trim();
    var effectiveFrom = ($('#gstEffectiveFrom').val() || '').toString().trim();
    var setting = {
        Id: settingId ? parseInt(settingId, 10) : 0,
        Name: $('#Compname').val() || '',
        UEN: $('#uen').val() || '',
        Address: $('#address').val() || '',
        Email: $('#email').val() || '',
        Hotline: $('#hotline').val() || '',
        Whatsapp: $('#whatsapp').val() || '',
        UPIId: $('#upiId').val() || '',
        PaymentGatwayDetails: $('#paymentGatewayDetails').val() || '',
        QuotationValidity: $('#Quotaval').val() || 0,
        GSTRate: $('#gstrate').val() || 0,
        UpcomingGSTRate: upcomingRate ? upcomingRate : 0,
        GSTEffectiveFrom: effectiveFrom ? effectiveFrom : null,
        AuthoriseSignature: getAuthoriseSignatureData(),
        PortalMode: $('#portalmode').val() || '',
        GSTNO: 'GUH84945',
        IsActive: true,
        IsDeleted: false,
        CreatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        CreatedDate: null,
        UpdatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        UpdatedDate: null
    };

    var endpoint = setting.Id ? '/Admin/settings/update' : '/Admin/settings/create';
    var shouldReload = false;

    $.ajax({
        url: endpoint,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(setting),
        success: function (res) {
            if (res && res.success) {
                shouldReload = true;
                showToast('settings saved successfully.', 3000, { type: 'success', title: 'Saved' });
            } else {
                showToast('Unable to save settings.', 3000, { type: 'error', title: 'Save failed' });
            }
        },
        error: function () {
            showToast('Save failed.', 3000, { type: 'error', title: 'Save failed' });
        },
        complete: function () {
            setButtonBusy('#btnSaveSettings', false);
            if (shouldReload) {
                saveGstScheduleDraft(upcomingRate, effectiveFrom);
                editsetting();
            }
        }
    });
}

function editsetting() {
    showSettingsLoader(true);

    $.ajax({
        url: '/Admin/settings/get',
        type: 'GET',
        success: function (setting) {
            if (!setting || setting.length === 0) {
                showToast('Settings not found.');
                return;
            }

            var data = setting[0];

            $('#settingId').val(data.id || data.Id || '');
            $('#Compname').val(data.name || data.Name || '');
            $('#uen').val(data.uen || data.UEN || '');
            $('#address').val(data.address || data.Address || '');
            $('#email').val(data.email || data.Email || '');
            $('#hotline').val(data.hotline || data.Hotline || '');
            $('#whatsapp').val(data.whatsapp || data.Whatsapp || '');
            $('#upiId').val(data.upiId || data.UPIId || '');
            $('#paymentGatewayDetails').val(data.paymentGatwayDetails || data.paymentGatewayDetails || data.PaymentGatwayDetails || '');
            $('#Quotaval').val(data.quotationValidity || data.QuotationValidity || '');
            $('#gstrate').val(data.gstRate || data.GSTRate || '');
            $('#portalmode').val(data.portalMode || data.PortalMode || '');

            currentAuthoriseSignatureData = data.authoriseSignature || data.AuthoriseSignature || null;

            var serverUpcoming = (data.upcomingGSTRate ?? data.UpcomingGSTRate ?? '').toString();
            var rawEffective = (data.gstEffectiveFrom ?? data.GSTEffectiveFrom ?? '').toString();
            var serverEffective = '';

            if (rawEffective) {
                // Expected API format: 2026-07-20T00:00:00
                if (rawEffective.length >= 10) {
                    serverEffective = rawEffective.substring(0, 10);
                }

                // Fallback for any non-ISO format
                if (!/^\d{4}-\d{2}-\d{2}$/.test(serverEffective)) {
                    serverEffective = normalizeDateInputValue(rawEffective);
                }
            }

            if (serverUpcoming || serverEffective) {
                $('#upcomingGstRate').val(serverUpcoming);
                setGstEffectiveDateValue(serverEffective);

                saveGstScheduleDraft(serverUpcoming, serverEffective);
            } else {
                applyGstScheduleDraftToForm();
            }

            updateGstScheduleNote();
        },
        error: function () {
            showToast('Unable to load settings.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showSettingsLoader(false);
            refreshAuthoriseSignatureCanvas(currentAuthoriseSignatureData, 0);
        }
    });
}

function clearsettingForm() {
    $('#settingId').val('');
    $('#Compname').val('');
    $('#uen').val('');
    $('#address').val('');
    $('#email').val('');
    $('#hotline').val('');
    $('#whatsapp').val('');
    $('#upiId').val('');
    $('#paymentGatewayDetails').val('');
    $('#Quotaval').val('');
    $('#gstrate').val('');
    $('#upcomingGstRate').val('');
    setGstEffectiveDateValue('');
    clearAuthoriseSignature();
    localStorage.removeItem(GST_SCHEDULE_DRAFT_KEY);

    clearsettingError('#Compname', '#CompnameError');
    clearsettingError('#uen', '#uenError');
    clearsettingError('#address', '#addressError');
    clearsettingError('#email', '#emailError');
    clearsettingError('#hotline', '#hotlineError');
    clearsettingError('#whatsapp', '#whatsappError');
    clearsettingError('#Quotaval', '#QuotavalError');
    clearsettingError('#gstrate', '#gstrateError');

    updateGstScheduleNote();
}

function setsettingError(inputSelector, errorSelector, message) {
    $(inputSelector).addClass('input-error');
    $(errorSelector).removeClass('hidden').text(message);
}

function clearsettingError(inputSelector, errorSelector) {
    $(inputSelector).removeClass('input-error');
    $(errorSelector).addClass('hidden').text('');
}

$(document).on('input change', '#gstrate, #upcomingGstRate, #gstEffectiveFrom', function () {
    updateGstScheduleNote();
});
