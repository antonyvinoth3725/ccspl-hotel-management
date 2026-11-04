(function (window, $) {
    'use strict';

    if (!window || !$) {
        return;
    }

    var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var DIGITS_ONLY_HINT = /(mobile|phone|contact|hotline|whatsapp|pincode|postal|zip)/i;

    function normalizeText(value) {
        return String(value || '').trim();
    }

    function normalizeFieldKey($field) {
        var id = $field.attr('id') || '';
        var name = $field.attr('name') || '';
        var placeholder = $field.attr('placeholder') || '';
        return (id + ' ' + name + ' ' + placeholder).toLowerCase();
    }

    function getFieldLabel($field) {
        var $group = $field.closest('.form-group');
        if (!$group.length) {
            return '';
        }

        var $label = $group.find('label').first();
        if (!$label.length) {
            return '';
        }

        return normalizeText($label.text()).replace(/\*/g, '');
    }

    function inferRules($field) {
        var type = String($field.attr('type') || '').toLowerCase();
        var key = normalizeFieldKey($field);
        var $group = $field.closest('.form-group');

        var rules = {
            required: $field.is('[required]') || $group.find('.field-required').length > 0,
            email: type === 'email' || /email/.test(key),
            digitsOnly: DIGITS_ONLY_HINT.test(key),
            date: type === 'date',
            number: type === 'number'
        };

        if ($field.attr('data-validate-email') === 'true') {
            rules.email = true;
        }

        if ($field.attr('data-validate-digits') === 'true') {
            rules.digitsOnly = true;
        }

        return rules;
    }

    function ensureFieldErrorContainer($field) {
        var $group = $field.closest('.form-group');
        if (!$group.length) {
            return null;
        }

        var fieldId = $field.attr('id');
        if (!fieldId) {
            return null;
        }

        var errorId = fieldId + 'Error';
        var $error = $group.find('#' + errorId).first();

        if (!$error.length) {
            $error = $('<div/>', {
                id: errorId,
                'class': 'field-error hidden',
                'data-field-error': fieldId
            });
            $field.after($error);
        }

        return $error;
    }

    function showFieldError($field, message) {
        var $error = ensureFieldErrorContainer($field);
        $field.addClass('input-error');

        if ($error && $error.length) {
            $error.removeClass('hidden').text(message || 'Invalid value');
        }
    }

    function clearFieldError($field) {
        var $error = ensureFieldErrorContainer($field);
        $field.removeClass('input-error');

        if ($error && $error.length) {
            $error.addClass('hidden').text('');
        }
    }

    function sanitizeDigits($field) {
        var current = String($field.val() || '');
        var sanitized = current.replace(/\D/g, '');
        if (current !== sanitized) {
            $field.val(sanitized);
        }
        return {
            hadInvalidChars: current !== sanitized,
            sanitizedValue: sanitized
        };
    }

    function isHelperControl($field) {
        if (!$field || !$field.length) {
            return false;
        }

        if ($field.hasClass('select2-search__field')) {
            return true;
        }

        var role = String($field.attr('role') || '').toLowerCase();
        if (role === 'searchbox' && $field.closest('.select2-container').length) {
            return true;
        }

        return false;
    }

    function isVisibleAndEnabled($field) {
        if (!$field || !$field.length) return false;
        if (isHelperControl($field)) return false;
        if ($field.is(':disabled')) return false;
        if (!$field.is(':visible')) return false;

        var type = String($field.attr('type') || '').toLowerCase();
        if (type === 'hidden' || type === 'file' || type === 'checkbox' || type === 'radio') {
            return false;
        }

        return true;
    }

    function validateField($field, showError) {
        if (!isVisibleAndEnabled($field)) {
            clearFieldError($field);
            return true;
        }

        var rules = inferRules($field);
        var rawValue = $field.val();
        var value = normalizeText(rawValue);
        var label = getFieldLabel($field) || 'This field';

        var digitsMeta = { hadInvalidChars: false, sanitizedValue: value };
        if (rules.digitsOnly) {
            digitsMeta = sanitizeDigits($field);
            value = normalizeText($field.val());
            if (digitsMeta.hadInvalidChars && showError) {
                showFieldError($field, label + ' must contain digits only.');
                return false;
            }
        }

        if (rules.required && !value) {
            if (showError) {
                showFieldError($field, label + ' is required.');
            } else {
                clearFieldError($field);
            }
            return false;
        }

        if (rules.email && value && !EMAIL_REGEX.test(value)) {
            if (showError) {
                showFieldError($field, 'Enter a valid email address.');
            } else {
                clearFieldError($field);
            }
            return false;
        }

        if (rules.digitsOnly && value && !/^\d+$/.test(value)) {
            if (showError) {
                showFieldError($field, label + ' must contain digits only.');
            } else {
                clearFieldError($field);
            }
            return false;
        }

        if (rules.number && value) {
            var parsed = Number(value);
            if (Number.isNaN(parsed)) {
                if (showError) {
                    showFieldError($field, label + ' must be a valid number.');
                } else {
                    clearFieldError($field);
                }
                return false;
            }
        }

        if (rules.date && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            if (showError) {
                showFieldError($field, 'Enter a valid date.');
            } else {
                clearFieldError($field);
            }
            return false;
        }

        clearFieldError($field);
        return true;
    }

    function bindLiveValidation($scope) {
        if (!$scope || !$scope.length) {
            return;
        }

        $scope.find('input, textarea, select').each(function () {
            var $field = $(this);
            var rules = inferRules($field);

            if (!rules.required && !rules.email && !rules.digitsOnly && !rules.date && !rules.number) {
                return;
            }

            ensureFieldErrorContainer($field);

            if ($field.data('gcValidationBound')) {
                return;
            }

            var events = 'input.gcValidation keyup.gcValidation paste.gcValidation blur.gcValidation change.gcValidation';
            $field.on(events, function () {
                var eventType = String(arguments[0] && arguments[0].type || '').toLowerCase();
                var shouldShowError = eventType === 'blur' || eventType === 'change';
                validateField($field, shouldShowError);
            });

            if (rules.digitsOnly) {
                $field.attr('inputmode', 'numeric');
            }

            $field.data('gcValidationBound', true);
        });
    }

    function getValidationScopeFromButton(button) {
        var $btn = $(button);
        var $modal = $btn.closest('.modal-box');
        if ($modal.length) {
            return $modal;
        }

        var buttonId = String($btn.attr('id') || '').toLowerCase();
        if (buttonId === 'btnsavesettings') {
            var $settings = $('#settingsContentWrap');
            if ($settings.length) {
                return $settings;
            }
        }

        var $card = $btn.closest('.card, .settings-page');
        if ($card.length) {
            return $card;
        }

        return $('.main').first();
    }

    function validateScope(scope, showError) {
        var $scope = scope ? $(scope) : $('.main').first();
        if (!$scope.length) {
            return true;
        }

        bindLiveValidation($scope);

        var isValid = true;
        var $firstInvalid = null;

        $scope.find('input, textarea, select').each(function () {
            var $field = $(this);
            var rules = inferRules($field);
            if (!rules.required && !rules.email && !rules.digitsOnly && !rules.date && !rules.number) {
                return;
            }

            var fieldValid = validateField($field, showError !== false);
            if (!fieldValid) {
                isValid = false;
                if (!$firstInvalid) {
                    $firstInvalid = $field;
                }
            }
        });

        if (!isValid && $firstInvalid && $firstInvalid.length) {
            $firstInvalid.focus();
        }

        return isValid;
    }

    function isSaveActionElement(target) {
        if (!target) {
            return false;
        }

        var element = target.closest('button, input[type="button"], input[type="submit"]');
        if (!element) {
            return false;
        }

        var onclick = String(element.getAttribute('onclick') || '').toLowerCase();
        var id = String(element.getAttribute('id') || '').toLowerCase();
        var text = normalizeText(element.textContent || element.value || '').toLowerCase();

        if (onclick.indexOf('save') > -1) {
            return true;
        }

        if (id.indexOf('save') > -1) {
            return true;
        }

        return text === 'save' || text === 'save settings' || text === 'update';
    }

    function initAutoSaveGuard() {
        document.addEventListener('click', function (event) {
            if (!isSaveActionElement(event.target)) {
                return;
            }

            var button = event.target.closest('button, input[type="button"], input[type="submit"]');
            var $scope = getValidationScopeFromButton(button);
            var ok = validateScope($scope, true);

            if (!ok) {
                event.preventDefault();
                event.stopImmediatePropagation();

                if (typeof window.showToast === 'function') {
                    window.showToast('Please fix validation errors before saving.', 3000, { type: 'warning', title: 'Validation' });
                }
            }
        }, true);
    }

    function init() {
        bindLiveValidation($('.main'));

        // Modal/forms can open later; this keeps bindings fresh.
        $(document).on('click.gcValidation', function () {
            bindLiveValidation($('.main'));
        });

        initAutoSaveGuard();
    }

    window.gcFormValidation = {
        init: init,
        bindLiveValidation: bindLiveValidation,
        validateScope: validateScope,
        validateField: validateField,
        clearFieldError: clearFieldError,
        showFieldError: showFieldError
    };

    $(init);
})(window, window.jQuery);
