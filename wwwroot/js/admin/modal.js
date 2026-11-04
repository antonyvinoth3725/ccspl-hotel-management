// Modal helper that can render into a per-view container (preferred) or fallback to global container
(function(){
    function findContainer(opts) {
        if (!opts) return null;
        var sel = opts.container || opts.containerSelector || opts.containerId;
        if (sel && $(sel).length) return $(sel);
        return null;
    }

    function escapeHtml(value) {
        return $('<div>').text(value ?? '').html();
    }

    function closeConfirmModal() {
        $('#confirmModalBody').empty();
        $('#confirmModalTitle').text('Confirm Action');
        $('#confirmModalMessage').text('Are you sure you want to continue?');
        $('#confirmModalOk').removeClass('btn-danger').addClass('btn-primary').text('Confirm').off('click');
        $('#confirmModal').addClass('hidden');
    }

    window.closeConfirmModal = closeConfirmModal;

    window.confirmAdminAction = function (options) {
        options = options || {};

        return new Promise(function (resolve) {
            var title = String(options.title || 'Confirm Action');
            var message = String(options.message || 'Are you sure you want to continue?');

            if (!$('#confirmModal').length || typeof window.openConfirmModal !== 'function') {
                resolve(window.confirm(message));
                return;
            }

            window.openConfirmModal({
                title: title,
                message: message,
                bodyHtml: options.bodyHtml || '',
                confirmText: options.confirmText || 'Confirm',
                cancelText: options.cancelText || 'Cancel',
                confirmIcon: options.confirmIcon || '',
                cancelIcon: options.cancelIcon || '',
                danger: !!options.danger,
                onConfirm: function () { resolve(true); },
                onCancel: function () { resolve(false); }
            });
        });
    };

    window.openConfirmModal = function (options) {
        options = options || {};

        var title = String(options.title || 'Confirm Action');
        var message = String(options.message || 'Are you sure you want to continue?');
        var bodyHtml = String(options.bodyHtml || '');
        var confirmText = String(options.confirmText || 'Confirm');
        var cancelText = String(options.cancelText || 'Cancel');
        var confirmIcon = String(options.confirmIcon || '');
        var cancelIcon = String(options.cancelIcon || '');
        var danger = !!options.danger;
        var onConfirm = typeof options.onConfirm === 'function' ? options.onConfirm : null;
        var onCancel = typeof options.onCancel === 'function' ? options.onCancel : null;

        $('#confirmModalTitle').text(title);
        $('#confirmModalMessage').text(message);
        $('#confirmModalBody').html(bodyHtml);
        $('#confirmModalOk')
            .html((confirmIcon ? '<i class="' + escapeHtml(confirmIcon) + '" aria-hidden="true"></i>' : '') + '<span>' + escapeHtml(confirmText) + '</span>')
            .toggleClass('btn-danger', danger).toggleClass('btn-primary', !danger);
        $('#confirmModalCancel')
            .html((cancelIcon ? '<i class="' + escapeHtml(cancelIcon) + '" aria-hidden="true"></i>' : '') + '<span>' + escapeHtml(cancelText) + '</span>');
        $('#confirmModal').removeClass('hidden');

        $('#confirmModalClose, #confirmModalCancel').off('click').on('click', function () {
            closeConfirmModal();
            if (onCancel) onCancel();
        });

        $('#confirmModalOk').off('click').on('click', function () {
            closeConfirmModal();
            if (onConfirm) onConfirm();
        });

        $('#confirmModal').off('click').on('click', function (event) {
            if (event.target && event.target.id === 'confirmModal') {
                closeConfirmModal();
                if (onCancel) onCancel();
            }
        });
    };

    window.openCrudModal = function (title, bodyHtml, onSubmit, options) {
        options = options || {};
        var showClear = !!options.showClear;
        var html = '<div class="modal-header"><h3>' + (title || '') + '</h3><button class="btn-close modal-internal-close">×</button></div>';
        html += '<div class="modal-body">' + bodyHtml + '</div>';
        html += '<div class="modal-footer">';
        // note: per-user preference - only show Clear and Save by default when requested; cancel remains for backward compatibility
        if (options.showCancel) html += '<button class="btn btn-light modal-internal-cancel">Cancel</button> ';
        if (showClear) html += '<button class="btn btn-secondary modal-internal-clear">Clear</button> ';
        html += '<button class="btn btn-primary modal-internal-submit">Save</button>';
        html += '</div>';

        var $container = findContainer(options);
        if ($container) {
            // render into provided container
            $container.html(html);
            // show overlay if parent has .modal-overlay
            var $overlay = $container.closest('.modal-overlay');
            if ($overlay.length) $overlay.removeClass('hidden');

            $overlay.find('.modal-internal-close, .modal-internal-cancel').on('click', function () {
                $overlay.addClass('hidden');
                $container.html('');
            });
            if (showClear) {
                $overlay.find('.modal-internal-clear').on('click', function () {
                    $container.find('input, select, textarea').each(function () { var $el = $(this); if ($el.is(':checkbox')||$el.is(':radio')) $el.prop('checked', false); else $el.val(''); });
                });
            }
            $overlay.find('.modal-internal-submit').on('click', function () { if (typeof onSubmit === 'function') onSubmit(); });
            return;
        }

        // fallback to global modal
        var showClear = !!options.showClear;
        var fallbackHtml = html;
        if ($('#crudModalBox').length) {
            $('#crudModalBox').html(fallbackHtml);
            $('#crudModal').removeClass('hidden');
            $('#crudModal').find('.modal-internal-close, .modal-internal-cancel').on('click', function () { window.closeCrudModal(); });
            if (showClear) {
                $('#crudModal').find('.modal-internal-clear').on('click', function () { $('#crudModalBox').find('input, select, textarea').each(function () { var $el = $(this); if ($el.is(':checkbox')||$el.is(':radio')) $el.prop('checked', false); else $el.val(''); }); });
            }
            $('#crudModal').find('.modal-internal-submit').on('click', function () { if (typeof onSubmit === 'function') onSubmit(); });
        } else {
            console.warn('No modal container found to render CRUD modal.');
        }
    };

    window.closeCrudModal = function () {
        if ($('#crudModalBox').length) { $('#crudModalBox').html(''); $('#crudModal').addClass('hidden'); return; }
        // hide any per-view overlays
        $('.modal-overlay').each(function () { var $o = $(this); if (!$o.hasClass('keep-open')) { $o.addClass('hidden'); $o.find('.modal-box').html(''); } });
    };


})();
