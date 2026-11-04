(function () {
    'use strict';
    var canvas = document.getElementById('signatureCanvas');
    var form = document.getElementById('signatureForm');
    if (!canvas || !form) return;
    var ctx = canvas.getContext('2d'), drawing = false, hasInk = false;

    function resize() {
        var saved = hasInk ? canvas.toDataURL('image/png') : null;
        var rect = canvas.parentElement.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
        var canvasHeight = Math.max(120, Math.round(canvas.parentElement.getBoundingClientRect().height));
        canvas.width = Math.max(1, Math.round(rect.width * ratio)); canvas.height = Math.round(canvasHeight * ratio);
        canvas.style.width = rect.width + 'px'; canvas.style.height = canvasHeight + 'px';
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.lineWidth = 2.25; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#173724';
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, rect.width, canvasHeight);
        if (saved) { var img = new Image(); img.onload = function () { ctx.drawImage(img, 0, 0, rect.width, canvasHeight); }; img.src = saved; }
    }
    function point(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    canvas.addEventListener('pointerdown', function (e) { if (e.button > 0) return; drawing = true; var p = point(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', function (e) { if (!drawing) return; var p = point(e); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x, p.y); hasInk = true; });
    function stop(e) { drawing = false; ctx.closePath(); if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); }
    canvas.addEventListener('pointerup', stop); canvas.addEventListener('pointercancel', stop);
    window.addEventListener('resize', resize); resize();

    window.clearOrderSignature = function () {
        hasInk = false;
        resize();
        $('#signatureMessage').text('');
    };

    window.submitOrderSignature = function () {
        if (!hasInk) {
            $('#signatureMessage').text('Please draw your signature before submitting.');
            return;
        }

        $('#signatureValue').val(canvas.toDataURL('image/png'));
        $('#submitSignature').prop('disabled', true).text('Submitting...');
        $('#signatureMessage').text('');

        $.ajax({
            url: '/Customer/OrderSignature/Submit',
            type: 'POST',
            data: new FormData(form),
            processData: false,
            contentType: false,
            success: function (response) {
                if (!response || response.success !== true) {
                    showSignatureError(response?.message || 'Unable to save your signature. Please try again.');
                    return;
                }

                $('.signature-card').addClass('signature-card-complete').html(
                    '<div class="result-card">' +
                    '<div class="result-icon">&#10003;</div>' +
                    '<h1>Thank you</h1>' +
                    '<p>Your signature for order <strong>' + escapeSignatureHtml(response.orderNumber || '') + '</strong> was submitted successfully.</p>' +
                    '<p>You can now close this page.</p>' +
                    '</div>'
                );
            },
            error: function (xhr) {
                if (xhr.responseJSON?.alreadySigned) {
                    showAlreadySigned(xhr.responseJSON.message);
                    return;
                }
                var message = xhr.responseJSON?.message || 'Unable to save your signature. Please try again.';
                showSignatureError(message);
            }
        });
    };

    function showSignatureError(message) {
        $('#signatureMessage').text(message);
        $('#submitSignature').prop('disabled', false).text('Submit signature');
    }

    function showAlreadySigned(message) {
        $('.signature-card').addClass('signature-card-complete').html(
            '<div class="result-card signature-status-card">' +
            '<div class="result-icon">&#10003;</div>' +
            '<h1>Signature Already Submitted</h1>' +
            '<p>' + escapeSignatureHtml(message) + '</p>' +
            '<p>You can now close this page.</p>' +
            '</div>'
        );
    }

    function escapeSignatureHtml(value) {
        return $('<div>').text(value || '').html();
    }
}());
