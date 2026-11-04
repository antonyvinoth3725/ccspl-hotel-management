var codeTemplateRows = [];

$(document).ready(function () {
    loadCodeTemplates();
});

function loadCodeTemplates() {
    showCodeTemplateLoader(true);
    $.ajax({
        url: '/Admin/CodeTemplate/getall',
        type: 'GET',
        success: function (rows) {
            codeTemplateRows = Array.isArray(rows) ? rows : [];
            renderCodeTemplateRows();
        },
        error: function () {
            codeTemplateRows = [];
            renderCodeTemplateRows();
            setButtonBusy('#btnSaveCodeTemplates', false);
            showToast('Unable to load code templates.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showCodeTemplateLoader(false);
            setButtonBusy('#btnSaveCodeTemplates', false);
        }
    });
}

function showCodeTemplateLoader(show) {
    $('#codeTemplateWrap').toggleClass('hidden', show);
    $('#codeTemplateEmpty').toggleClass('hidden', true);
    $('#codeTemplateLoader').toggleClass('hidden', !show);
}

function renderCodeTemplateRows() {
    codeTemplateRows = Array.isArray(codeTemplateRows) ? codeTemplateRows : [];

    var html = '';

    for (var i = 0; i < codeTemplateRows.length; i++) {
        var row = codeTemplateRows[i];
        var id = row.id || row.Id || 0;
        var entityNo = row.entityNo || row.EntityNo || 0;
        var name = row.name || row.Name || '';
        var noOfDigit = row.noOfDigit || row.NoOfDigit || 0;
        var startValue = row.startValue || row.StartValue || 0;
        var prefix = row.prefix || row.Prefix || '';
        var currentValue = row.currentValue || row.CurrentValue || 0;
        var suffix = row.suffix || row.Suffix || '';
        var isDateMonthYearWise = toCodeTemplateBool(row.isDateMonthYearWise ?? row.IsDateMonthYearWise ?? false);

        html += `
            <tr data-index="${i}" data-id="${id}" data-entityno="${entityNo}">
                <td>${i + 1}</td>
                <td class="code-cell-name">
                    <span class="code-name-text">${escapeHtml(name || '-')}</span>
                </td>
                <td><input type="number" class="code-number js-code-noofdigit" min="0" value="${escapeHtmlAttr(noOfDigit)}"></td>
                <td><input type="number" class="code-number js-code-startvalue" min="0" value="${escapeHtmlAttr(startValue)}"></td>
                <td><input type="text" class="code-input js-code-prefix" value="${escapeHtmlAttr(prefix)}" placeholder=""></td>
                <td><input type="number" class="code-number js-code-currentvalue" min="0" value="${escapeHtmlAttr(currentValue)}"></td>
                <td><input type="text" class="code-input js-code-suffix" value="${escapeHtmlAttr(suffix)}" placeholder=""></td>
                <td>
                    <label class="code-switch" title="${isDateMonthYearWise ? 'Year wise enabled' : 'Year wise disabled'}">
                        <input type="checkbox" class="js-code-datewise" ${isDateMonthYearWise ? 'checked' : ''}>
                        <span class="code-switch-slider"></span>
                    </label>
                </td>
            </tr>`;
    }

    $('#codeTemplateBody').html(html);
    $('#codeTemplateEmpty').toggleClass('hidden', codeTemplateRows.length > 0);
    $('#codeTemplateWrap').toggleClass('hidden', codeTemplateRows.length === 0);

    if (typeof renderDataTable === 'function') {
        renderDataTable('codeTemplateTable');
    }
}

function collectCodeTemplateRows() {
    var rows = [];

    $('#codeTemplateBody tr').each(function () {
        var $row = $(this);

        rows.push({
            Id: parseInt($row.attr('data-id'), 10) || 0,
            EntityNo: parseInt($row.attr('data-entityno'), 10) || 0,
            Name: ($row.find('.code-name-text').text() || '').toString().trim(),
            NoOfDigit: parseInt($row.find('.js-code-noofdigit').val(), 10) || 0,
            StartValue: parseInt($row.find('.js-code-startvalue').val(), 10) || 0,
            Prefix: ($row.find('.js-code-prefix').val() || '').toString().trim(),
            CurrentValue: parseInt($row.find('.js-code-currentvalue').val(), 10) || 0,
            Suffix: ($row.find('.js-code-suffix').val() || '').toString().trim(),
            IsDateMonthYearWise: $row.find('.js-code-datewise').is(':checked'),
            IsActive: true,
            IsDeleted: false,
            CreatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
            UpdatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0
        });
    });

    return rows;
}

function validateCodeTemplateRows(rows) {
    if (!rows.length) {
        showToast('No code templates found to save.', 3000, { type: 'warning', title: 'Validation' });
        return false;
    }

    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];

        if (row.EntityNo <= 0) {
            showToast('Entity No is missing for row ' + (i + 1) + '.', 3000, { type: 'warning', title: 'Validation' });
            return false;
        }

        if (!row.Name) {
            showToast('Name is missing for row ' + (i + 1) + '.', 3000, { type: 'warning', title: 'Validation' });
            return false;
        }

        if (row.NoOfDigit < 0) {
            showToast('No Of Digit cannot be negative for row ' + (i + 1) + '.', 3000, { type: 'warning', title: 'Validation' });
            focusCodeTemplateInput(i, '.js-code-noofdigit');
            return false;
        }

        if (row.StartValue < 0) {
            showToast('Start Value cannot be negative for row ' + (i + 1) + '.', 3000, { type: 'warning', title: 'Validation' });
            focusCodeTemplateInput(i, '.js-code-startvalue');
            return false;
        }

        if (row.CurrentValue < 0) {
            showToast('Current Value cannot be negative for row ' + (i + 1) + '.', 3000, { type: 'warning', title: 'Validation' });
            focusCodeTemplateInput(i, '.js-code-currentvalue');
            return false;
        }
    }

    return true;
}

function focusCodeTemplateInput(index, selector) {
    var $row = $('#codeTemplateBody tr[data-index="' + index + '"]');
    if ($row.length) {
        var $input = $row.find(selector).first();
        if ($input.length) {
            $input.trigger('focus');
        }
    }
}

function saveAllCodeTemplates() {
    if (window.gcFormValidation && !window.gcFormValidation.validateScope($('.main').first(), true)) {
        return;
    }

    var rows = collectCodeTemplateRows();

    if (!validateCodeTemplateRows(rows)) {
        return;
    }

    setButtonBusy('#btnSaveCodeTemplates', true, 'Saving...');

    $.ajax({
        url: '/Admin/CodeTemplate/saveall',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(rows),
        success: function (res) {
            if (res && res.success) {
                setButtonBusy('#btnSaveCodeTemplates', false);
                showToast(res.message || 'Code templates saved successfully.', 3000, { type: 'success', title: 'Saved' });
                loadCodeTemplates();
            } else {
                setButtonBusy('#btnSaveCodeTemplates', false);
                showToast((res && res.message) || 'Unable to save code templates.', 3000, { type: 'error', title: 'Save failed' });
            }
        },
        error: function (xhr) {
            setButtonBusy('#btnSaveCodeTemplates', false);
            showToast(xhr.responseJSON?.message || 'Save failed.', 3000, { type: 'error', title: 'Save failed' });
        }
    });
}

function downloadCodeTemplates() {
    return;
}

function toCodeTemplateBool(value) {
    return value === true ||
        value === 1 ||
        value === '1' ||
        value === 'true' ||
        value === 'True';
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeHtmlAttr(value) {
    return escapeHtml(value);
}
