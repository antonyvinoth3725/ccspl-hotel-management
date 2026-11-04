// ===== ADMIN REPORT RUNTIME (NEW CATALOG + PREVIEW VIEW) =====
$(function () {
    var state = {
        roleId: typeof window.getCurrentRoleId === 'function' ? (parseInt(window.getCurrentRoleId() || '0', 10) || 1) : 1,
        categories: [],
        allReports: [],
        reportSearch: '',
        selectedReportId: 0,
        definition: null,
        lastPreviewResult: null,
        previewSort: { field: '', direction: '' },
        viewMode: 'catalog', // 'catalog' or 'preview'
        reportColumns: [], // Available columns for current report
        selectedColumns: [] // User-selected columns
    };

    function escapeHtml(value) {
        return $('<div>').text(value ?? '').html();
    }

    // ===== COLUMN MANAGEMENT FUNCTIONS =====
    function fetchReportColumns(reportId) {
        return $.ajax({
            url: '/Admin/Reports/columns?reportId=' + encodeURIComponent(reportId),
            type: 'GET',
            dataType: 'json'
        });
    }

    function fetchVisibleColumns(reportId) {
        return $.ajax({
            url: '/Admin/Reports/columns/visible?reportId=' + encodeURIComponent(reportId),
            type: 'GET',
            dataType: 'json'
        });
    }

    function filterColumnsByVisibility(resultColumns, visibleColumns) {
        if (!Array.isArray(visibleColumns) || !Array.isArray(resultColumns)) {
            return resultColumns;
        }

        // Create a map of visible column names for quick lookup
        var visibilityMap = {};
        var displayOrderMap = {};
        var displayLabelMap = {};
        visibleColumns.forEach(function (col) {
            var colName = (col.columnName || col.ColumnName || '').toLowerCase();
            visibilityMap[colName] = true;
            displayOrderMap[colName] = col.displayOrder || col.DisplayOrder || 999;
            displayLabelMap[colName] = col.displayLabel || col.DisplayLabel || '';
        });

        // Filter result columns to only include visible ones
        var filtered = resultColumns.filter(function (col) {
            var fieldName = (col.field || col.Field || '').toLowerCase();
            return visibilityMap[fieldName];
        });

        // Sort by display order if available
        filtered.sort(function (a, b) {
            var fieldA = (a.field || a.Field || '').toLowerCase();
            var fieldB = (b.field || b.Field || '').toLowerCase();
            var orderA = displayOrderMap[fieldA] || 999;
            var orderB = displayOrderMap[fieldB] || 999;
            return orderA - orderB;
        });

        filtered.forEach(function (col) {
            var fieldName = (col.field || col.Field || '').toLowerCase();
            if (displayLabelMap[fieldName]) col.header = displayLabelMap[fieldName];
        });

        return filtered;
    }

    function toBoolean(value) {
        return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
    }

    function getVisibleColumnNames(visibleColumns) {
        return (Array.isArray(visibleColumns) ? visibleColumns : [])
            .map(function (col) { return String(col.columnName || col.ColumnName || '').toLowerCase(); })
            .filter(Boolean);
    }

    function getVisibleColumnLabels(visibleColumns) {
        var labels = {};
        (Array.isArray(visibleColumns) ? visibleColumns : []).forEach(function (col) {
            var name = String(col.columnName || col.ColumnName || '').trim();
            if (!name) return;
            labels[name] = col.displayLabel || col.DisplayLabel || '';
        });
        return labels;
    }

    function applyVisibleColumns(response, visibleColumns) {
        if (!response || !Array.isArray(visibleColumns)) return response;

        // A brand-new report may not have ReportColumns configured yet.
        // In that case, retain all stored-procedure columns as a safe default.
        if (!visibleColumns.length) {
            response.visibleColumnNames = null;
            response.visibleColumnLabels = {};
            return response;
        }

        response.visibleColumnNames = getVisibleColumnNames(visibleColumns);
        response.visibleColumnLabels = getVisibleColumnLabels(visibleColumns);
        if (Array.isArray(response.columns)) {
            response.columns = filterColumnsByVisibility(response.columns, visibleColumns);
        }
        return response;
    }

    function renderColumnsModal(columns) {
        if (!columns) {
            $('#columnsList').html('<div class="hint" style="grid-column: 1/-1;">Unable to load columns data.</div>');
            $('#columnsTotalCount').text('0');
            $('#columnsSelectedCount').text('0');
            return;
        }

        if (!columns.length) {
            $('#columnsList').html('<div class="hint" style="grid-column: 1/-1; margin: 0; min-height: 80px;">No columns configured for this report. Please initialize columns first.</div>');
            $('#columnsTotalCount').text('0');
            $('#columnsSelectedCount').text('0');
            return;
        }

        state.reportColumns = columns;
        var html = '';
        var visibleCount = 0;

        columns.forEach(function (col) {
            var colId = 'col_' + (col.id || col.ColumnName || col.columnName);
            var isVisible = toBoolean(col.isVisible !== undefined ? col.isVisible : col.IsVisible);
            var checked = isVisible ? 'checked' : '';
            
            if (isVisible) visibleCount++;

            html += '<div class="column-item">';
            html += '<input type="checkbox" id="' + colId + '" data-column-name="' + escapeHtml(col.columnName) + '" ' + checked + ' onchange="updateColumnCount()" class="column-checkbox">';
            html += '<label for="' + colId + '" class="column-label">';
            html += '<span class="column-name">' + escapeHtml(col.displayLabel || col.columnName) + '</span>';
            html += '</label>';
            html += '</div>';
        });

        $('#columnsList').html(html);
        $('#columnsTotalCount').text(columns.length);
        $('#columnsSelectedCount').text(visibleCount);
        
        // Set "Select All" checkbox state
        $('#selectAllColumns').prop('checked', visibleCount === columns.length);
    }

    function openColumnsModal() {
        $('#columnsSearch').val(''); // Clear search
        $('#columnsList .column-item').show(); // Show all items
        $('#columnsModal').removeClass('hidden');
    }

    function saveColumnsPreferences() {
        if (window.gcFormValidation && !window.gcFormValidation.validateScope($('.main').first(), true)) {
            return;
        }

        var selectedCols = [];
        $('#columnsList input[type="checkbox"]').each(function () {
            selectedCols.push({
                columnName: $(this).data('column-name'),
                // SQL Server reliably converts JSON 1/0 values to BIT.
                isVisible: $(this).prop('checked') ? 1 : 0
            });
        });

        if (!selectedCols.length || !selectedCols.some(function (col) { return col.isVisible === 1; })) {
            if (typeof showToast === 'function') {
                showToast('Please select at least one column.', 3000, { type: 'warning', title: 'Validation' });
            }
            return;
        }

        $.ajax({
            url: '/Admin/Reports/columns/save',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                reportId: state.selectedReportId,
                columnVisibilityJson: JSON.stringify(selectedCols)
            }),
            success: function () {
                closeColumnsModal();
                if (state.lastPreviewResult) $('#btnPreviewReport').trigger('click');
                if (typeof showToast === 'function') {
                    showToast('Column preferences saved successfully.', 2500, { type: 'success', title: 'Saved' });
                }
            },
            error: function () {
                if (typeof showToast === 'function') {
                    showToast('Unable to save column preferences.', 3000, { type: 'error', title: 'Error' });
                }
            }
        });
    }

    function resetColumnsToDefault() {
        $.ajax({
            url: '/Admin/Reports/columns/reset',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ reportId: state.selectedReportId }),
            success: function () {
                // Reload columns to show all visible
                fetchReportColumns(state.selectedReportId).done(function (columns) {
                    renderColumnsModal(columns);
                });
                if (state.lastPreviewResult) $('#btnPreviewReport').trigger('click');
                if (typeof showToast === 'function') {
                    showToast('Column view reset to default.', 2500, { type: 'success', title: 'Reset' });
                }
            },
            error: function () {
                if (typeof showToast === 'function') {
                    showToast('Unable to reset columns.', 3000, { type: 'error', title: 'Error' });
                }
            }
        });
    }

    function updateColumnCount() {
        var total = state.reportColumns.length;
        var checked = $('#columnsList input[type="checkbox"]:checked').length;
        $('#columnsSelectedCount').text(checked);
        $('#selectAllColumns').prop('checked', checked === total);
    }

    function toggleAllColumns() {
        var isChecked = $('#selectAllColumns').prop('checked');
        $('#columnsList input[type="checkbox"]').prop('checked', isChecked);
        updateColumnCount();
    }

    // Expose functions globally for onclick handlers
    window.openColumnsModal = openColumnsModal;
    window.closeColumnsModal = function () {
        $('#columnsModal').addClass('hidden');
    };
    window.saveColumnsPreferences = saveColumnsPreferences;
    window.resetColumnsToDefault = resetColumnsToDefault;
    window.updateColumnCount = updateColumnCount;
    window.toggleAllColumns = toggleAllColumns;

    function filterColumnsSearch() {
        var keyword = String($('#columnsSearch').val() || '').trim().toLowerCase();
        $('#columnsList .column-item').each(function () {
            var columnName = $(this).find('.column-name').text().toLowerCase();
            var isMatch = columnName.indexOf(keyword) >= 0;
            $(this).toggle(isMatch || !keyword);
        });
    }

    function fetchCategories() {
        return $.ajax({
            url: '/Admin/Reports/categories?roleId=' + encodeURIComponent(state.roleId),
            type: 'GET',
            dataType: 'json'
        });
    }

    function fetchAllReports() {
        return $.ajax({
            url: '/Admin/Reports/list?roleId=' + encodeURIComponent(state.roleId),
            type: 'GET',
            dataType: 'json'
        });
    }

    function fetchDefinition(reportId) {
        return $.ajax({
            url: '/Admin/Reports/definition?roleId=' + encodeURIComponent(state.roleId) + '&reportId=' + encodeURIComponent(reportId),
            type: 'GET',
            dataType: 'json'
        });
    }

    // ===== VIEW MANAGEMENT =====
    function showCatalogView() {
        state.viewMode = 'catalog';
        $('#reportsCatalogView').show();
        $('#reportsPreviewView').hide();
        $('.page-header .search-bar').show();
    }

    function showPreviewView() {
        state.viewMode = 'preview';
        $('#reportsCatalogView').hide();
        $('#reportsPreviewView').show();
        $('.page-header .search-bar').hide();
    }

    // ===== CATALOG VIEW FUNCTIONS =====
    function renderCatalogByCategories() {
        var keyword = String(state.reportSearch || '').trim().toLowerCase();
        var html = '';

        if (!state.categories.length) {
            $('#reportCategoriesGrid').html('<div class="hint">No categories available.</div>');
            return;
        }

        state.categories.forEach(function (category) {
            var categoryId = parseInt(category.id || category.Id || '0', 10) || 0;
            var categoryName = category.name || category.Name || 'Category';
            
            // Filter reports by category
            var categoryReports = state.allReports.filter(function (r) {
                var rCategoryId = parseInt(r.categoryId || r.CategoryId || '0', 10) || 0;
                return rCategoryId === categoryId;
            });

            // Apply search filter
            if (keyword) {
                categoryReports = categoryReports.filter(function (r) {
                    var reportCode = String(r.reportCode || r.ReportCode || '').toLowerCase();
                    var displayName = String(r.displayName || r.DisplayName || r.reportName || r.ReportName || '').toLowerCase();
                    var desc = String(r.description || r.Description || '').toLowerCase();
                    return reportCode.indexOf(keyword) >= 0 || displayName.indexOf(keyword) >= 0 || desc.indexOf(keyword) >= 0;
                });
            }

            // Skip empty categories when searching
            if (!categoryReports.length) {
                if (keyword) return; // Skip in search mode
            }

            html += '<div class="category-section">';
            html += '<div class="category-header">';
            html += '<h3 class="category-title">' + escapeHtml(categoryName) + '</h3>';
            html += '<div class="category-count">' + categoryReports.length + '</div>';
            html += '</div>';
            html += '<div class="reports-cards-container">';

            if (!categoryReports.length) {
                html += '<div class="hint">No reports in this category.</div>';
            } else {
                categoryReports.forEach(function (report) {
                    var reportId = parseInt(report.id || report.Id || '0', 10) || 0;
                    var displayName = report.displayName || report.DisplayName || report.reportName || report.ReportName || 'Report';
                    var desc = report.description || report.Description || 'No description';
                    var icon = report.icon || report.Icon || '📊';

                    // Render icon classes returned by ReportMaster directly.
                    var iconClass = typeof icon === 'string' && icon.indexOf('pi ') === 0 ? icon : '';
                    var iconContent = iconClass ? '' : escapeHtml(icon);

                    html += '<div class="report-card" data-report-id="' + reportId + '">';
                    html += '<div class="report-card-header">';
                    html += '<div class="report-card-icon' + (iconClass ? ' ' + iconClass : '') + '">' + iconContent + '</div>';
                    html += '<div style="flex:1">';
                    html += '<div class="report-card-title">' + escapeHtml(displayName) + '</div>';
                    html += '<div class="report-card-description">' + escapeHtml(desc) + '</div>';
                    html += '</div>';
                    html += '</div>';
                    html += '<div class="report-card-footer">';
                    html += '<span class="report-card-badge">' + escapeHtml(categoryName) + '</span>';
                    html += '<button type="button" class="report-card-action btn-open-report" data-report-id="' + reportId + '">Open →</button>';
                    html += '</div>';
                    html += '</div>';
                });
            }

            html += '</div>';
            html += '</div>';
        });

        if (!html) {
            html = '<div class="hint">No reports match your search.</div>';
        }

        $('#reportCategoriesGrid').html(html);
    }

    // ===== PREVIEW VIEW FUNCTIONS =====
    function renderFilters() {
        var definition = state.definition;
        if (!definition || !definition.filters) {
            $('#reportFilterWrap').html('<div class="hint">Select a report to load filters.</div>');
            return;
        }

        var filters = Array.isArray(definition.filters) ? definition.filters : [];
        if (!filters.length) {
            $('#reportFilterWrap').html('<div class="hint">No filters configured for this report.</div>');
            return;
        }

        var html = '';

        filters.forEach(function (filter) {
            var fieldName = filter.fieldName || filter.FieldName || '';
            var displayName = filter.displayName || filter.DisplayName || fieldName;
            var controlType = (filter.controlType || filter.ControlType || 'text').toString().toLowerCase();
            var isRequired = !!(filter.isRequired || filter.IsRequired);
            var isShow = filter.isShow === undefined ? !!filter.IsShow : !!filter.isShow;
            var dataType = (filter.dataType || filter.DataType || '').toString().toLowerCase();
            var value = '';
            var options = filter.options || filter.Options || filter.items || filter.Items || filter.values || filter.Values || [];

            if (fieldName.toLowerCase() === 'roleid') {
                value = String(state.roleId);
            }

            if (!isShow) {
                html += '<input type="hidden" class="report-filter" data-field-name="' + escapeHtml(fieldName) + '" data-data-type="' + escapeHtml(dataType) + '" value="' + escapeHtml(value) + '">';
                return;
            }

            var inputType = 'text';
            if (controlType === 'date') inputType = 'date';
            if (controlType === 'number' || dataType === 'int' || dataType === 'decimal' || dataType === 'numeric') inputType = 'number';

            if (controlType === 'textarea') {
                html += '<div class="filter-group">';
                html += '<label>' + escapeHtml(displayName) + (isRequired ? ' <span style="color: #e74c3c; font-weight: 600;">*</span>' : '') + '</label>';
                html += '<textarea class="report-filter form-control" rows="3" data-field-name="' + escapeHtml(fieldName) + '" data-required="' + (isRequired ? '1' : '0') + '" data-data-type="' + escapeHtml(dataType) + '">' + escapeHtml(value) + '</textarea>';
                html += '</div>';
                return;
            }

            if (controlType === 'dropdown') {
                html += '<div class="filter-group">';
                html += '<label>' + escapeHtml(displayName) + (isRequired ? ' <span style="color: #e74c3c; font-weight: 600;">*</span>' : '') + '</label>';
                html += '<select class="report-filter form-control" data-field-name="' + escapeHtml(fieldName) + '" data-required="' + (isRequired ? '1' : '0') + '" data-data-type="' + escapeHtml(dataType) + '">';
                html += '<option value="">Select ' + escapeHtml(displayName) + '</option>';
                if (Array.isArray(options)) {
                    options.forEach(function (opt) {
                        var optionValue = opt.value !== undefined ? opt.value : (opt.Value !== undefined ? opt.Value : (opt.id !== undefined ? opt.id : (opt.Id !== undefined ? opt.Id : opt)));
                        var optionText = opt.text || opt.Text || opt.label || opt.Label || String(optionValue || opt || '');
                        var selected = String(optionValue) === String(value) ? ' selected' : '';
                        html += '<option value="' + escapeHtml(optionValue) + '"' + selected + '>' + escapeHtml(optionText) + '</option>';
                    });
                }
                html += '</select>';
                html += '</div>';
                return;
            }

            if (controlType === 'autocomplete') {
                html += '<div class="filter-group">';
                html += '<label>' + escapeHtml(displayName) + (isRequired ? ' <span style="color: #e74c3c; font-weight: 600;">*</span>' : '') + '</label>';
                html += '<select class="report-filter report-filter-autocomplete form-control" data-field-name="' + escapeHtml(fieldName) + '" data-required="' + (isRequired ? '1' : '0') + '" data-data-type="' + escapeHtml(dataType) + '" data-source="orders" data-placeholder="Type to search order number...">';
                html += '<option value="">Select ' + escapeHtml(displayName) + '</option>';
                html += '</select>';
                html += '</div>';
                return;
            }

            html += '<div class="filter-group">';
            html += '<label>' + escapeHtml(displayName) + (isRequired ? ' <span style="color: #e74c3c; font-weight: 600;">*</span>' : '') + '</label>';
            html += '<input type="' + inputType + '" class="report-filter form-control" data-field-name="' + escapeHtml(fieldName) + '" data-required="' + (isRequired ? '1' : '0') + '" data-data-type="' + escapeHtml(dataType) + '" value="' + escapeHtml(value) + '">';
            html += '</div>';
        });

        $('#reportFilterWrap').html(html);
        initAutocompleteFilters();
        initDynamicReportDateFilters();
    }

    function formatReportLocalDateInput(dateObj) {
        var year = dateObj.getFullYear();
        var month = String(dateObj.getMonth() + 1).padStart(2, '0');
        var day = String(dateObj.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    function getReportFilterDateValue($input) {
        if (!$input || !$input.length) return '';
        var input = $input.get(0);

        if (input && input._flatpickr && input._flatpickr.selectedDates && input._flatpickr.selectedDates.length) {
            return formatReportLocalDateInput(input._flatpickr.selectedDates[0]);
        }

        return String($input.val() || '').trim();
    }

    function setReportFilterDateValue($input, value) {
        if (!$input || !$input.length) return;
        var input = $input.get(0);

        if (input && input._flatpickr) {
            input._flatpickr.setDate(value, false, 'Y-m-d');
            return;
        }

        $input.val(value);
    }

    function parseReportDateValue(value) {
        var text = String(value || '').trim();
        if (!text) return null;

        var parts = text.split('-');
        if (parts.length === 3) {
            var year = Number(parts[0]);
            var month = Number(parts[1]);
            var day = Number(parts[2]);
            if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
                return new Date(year, month - 1, day);
            }
        }

        var parsed = new Date(text);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    function isDateFilter($input) {
        if (!$input || !$input.length) return false;
        var dataType = String($input.data('data-type') || '').toLowerCase();
        var type = String($input.attr('type') || '').toLowerCase();
        var fieldName = String($input.data('field-name') || '').toLowerCase();
        return dataType === 'date' || type === 'date' || /date/.test(fieldName);
    }

    function buildReportDateRangeGroups() {
        var dateInputs = $('.report-filter').filter(function () {
            return isDateFilter($(this));
        });

        var groups = [];
        var used = {};

        function normalizeBase(name, prefix) {
            return String(name || '').toLowerCase().replace(new RegExp('^' + prefix, 'i'), '');
        }

        dateInputs.each(function (i) {
            if (used[i]) return;

            var $from = $(this);
            var fromName = String($from.data('field-name') || '').trim();
            if (!fromName || !/^from|^start/i.test(fromName)) return;

            var fromBase = normalizeBase(fromName, 'from|start');
            var matchIndex = -1;
            var $to = $();

            dateInputs.each(function (j) {
                if (i === j || used[j]) return;
                var $candidate = $(this);
                var candidateName = String($candidate.data('field-name') || '').trim();
                if (!candidateName || !/^to|^end/i.test(candidateName)) return;

                var toBase = normalizeBase(candidateName, 'to|end');
                if (toBase === fromBase) {
                    matchIndex = j;
                    $to = $candidate;
                    return false;
                }
                return;
            });

            if ($to.length) {
                used[i] = true;
                used[matchIndex] = true;
                groups.push({ from: $from, to: $to });
            }
        });

        return groups;
    }

    function syncReportDateRangeBounds() {
        var groups = buildReportDateRangeGroups();
        groups.forEach(function (pair) {
            var fromValue = getReportFilterDateValue(pair.from);
            var toValue = getReportFilterDateValue(pair.to);

            var fromInput = pair.from.get(0);
            var toInput = pair.to.get(0);

            if (fromInput && fromInput._flatpickr) {
                fromInput._flatpickr.set('maxDate', toValue || null);
            }
            if (toInput && toInput._flatpickr) {
                toInput._flatpickr.set('minDate', fromValue || null);
            }
        });
    }

    function validateReportDateRangeFilters(showWarning) {
        var groups = buildReportDateRangeGroups();
        var hasFixedAny = false;

        groups.forEach(function (pair) {
            var fromValue = getReportFilterDateValue(pair.from);
            var toValue = getReportFilterDateValue(pair.to);
            var fromDate = parseReportDateValue(fromValue);
            var toDate = parseReportDateValue(toValue);

            if (!fromDate || !toDate) return;
            if (fromDate <= toDate) return;

            setReportFilterDateValue(pair.to, fromValue);
            hasFixedAny = true;
        });

        if (hasFixedAny && showWarning && typeof showToast === 'function') {
            showToast('From date was later than To date. It has been auto-corrected.', 3000, {
                type: 'warning',
                title: 'Invalid Date'
            });
        }

        if (hasFixedAny) {
            syncReportDateRangeBounds();
        }

        return !hasFixedAny;
    }

    function initDynamicReportDateFilters() {
        $(document)
            .off('change.reportDateRange', '#reportFilterWrap .report-filter')
            .on('change.reportDateRange', '#reportFilterWrap .report-filter', function () {
                var $input = $(this);
                if (!isDateFilter($input)) return;
                validateReportDateRangeFilters(true);
                syncReportDateRangeBounds();
            });

        syncReportDateRangeBounds();
        validateReportDateRangeFilters(false);
    }

    function formatReportDate(value) {
        if (!value) return '';
        var date = new Date(value);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    function buildAutocompleteResultMarkup(item) {
        if (!item) return '';

        var orderNumber = item.orderNumber || item.OrderNumber || item.text || item.Text || '';
        var eventDate = formatReportDate(item.eventDate || item.EventDate);
        var orderDate = formatReportDate(item.createdDate || item.CreatedDate);
        var summary = escapeHtml(orderNumber || 'Order');

        if (eventDate || orderDate) {
            summary += ' (';
            summary += 'Event Date: ' + escapeHtml(eventDate || '-');
            summary += ' | Order Date: ' + escapeHtml(orderDate || '-');
            summary += ')';
        }

        return '<div class="report-autocomplete-item"><div class="report-autocomplete-title">' + summary + '</div></div>';
    }

    function initAutocompleteFilters() {
        if (typeof $.fn.select2 !== 'function') {
            return;
        }

        $('.report-filter-autocomplete').each(function () {
            var $select = $(this);
            if ($select.hasClass('select2-hidden-accessible')) {
                $select.select2('destroy');
            }

            $select.select2({
                width: '100%',
                placeholder: String($select.data('placeholder') || 'Type to search order number...'),
                allowClear: true,
                minimumInputLength: 1,
                templateResult: function (item) {
                    if (!item || !item.id) {
                        return item.text || item.orderNumber || 'Search order number';
                    }

                    return $(buildAutocompleteResultMarkup(item));
                },
                templateSelection: function (item) {
                    if (!item || !item.id) {
                        return item.text || 'Select order number';
                    }

                    return item.orderNumber || item.text || '';
                },
                ajax: {
                    url: '/Admin/Reports/GetAutoCompleteOrdersNumbers',
                    dataType: 'json',
                    delay: 250,
                    data: function (params) {
                        return {
                            orderNumber: params.term || ''
                        };
                    },
                    processResults: function (data) {
                        var items = Array.isArray(data) ? data : [];
                        return {
                            results: items.map(function (item) {
                                var id = item.id !== undefined ? item.id : (item.Id !== undefined ? item.Id : '');
                                return {
                                    id: String(id),
                                    text: (item.orderNumber || item.OrderNumber || item.text || item.Text || String(id)) + ((item.eventDate || item.EventDate || item.createdDate || item.CreatedDate) ? ' (Event Date: ' + formatReportDate(item.eventDate || item.EventDate) + ' | Order Date: ' + formatReportDate(item.createdDate || item.CreatedDate) + ')' : ''),
                                    orderNumber: item.orderNumber || item.OrderNumber || item.text || item.Text || '',
                                    eventDate: item.eventDate || item.EventDate || null,
                                    createdDate: item.createdDate || item.CreatedDate || null
                                };
                            })
                        };
                    },
                    cache: true
                }
            });
        });
    }

    function readFilters() {
        var values = {};
        var missing = [];

        $('.report-filter').each(function () {
            var fieldName = ($(this).data('field-name') || '').toString();
            if (!fieldName) return;

            var isRequired = String($(this).data('required') || '0') === '1';
            var dataType = ($(this).data('data-type') || '').toString().toLowerCase();
            var rawValue = ($(this).val() || '').toString().trim();

            if (isRequired && !rawValue) {
                missing.push(fieldName);
                return;
            }

            if (!rawValue) {
                values[fieldName] = null;
                return;
            }

            if (dataType === 'int' || dataType === 'integer') {
                values[fieldName] = parseInt(rawValue, 10) || 0;
                return;
            }

            if (dataType === 'decimal' || dataType === 'numeric' || dataType === 'money') {
                values[fieldName] = parseFloat(rawValue) || 0;
                return;
            }

            values[fieldName] = rawValue;
        });

        return {
            values: values,
            missing: missing
        };
    }

    function resolvePath(source, path) {
        if (!source || !path) return null;
        var parts = String(path).split('.');
        var current = source;

        for (var i = 0; i < parts.length; i++) {
            if (current === null || current === undefined) return null;
            var key = parts[i];

            if (Array.isArray(current) && /^\d+$/.test(key)) {
                current = current[parseInt(key, 10)];
                continue;
            }

            var foundKey = null;
            Object.keys(current).some(function (candidate) {
                if (candidate.toLowerCase() === key.toLowerCase()) {
                    foundKey = candidate;
                    return true;
                }
                return false;
            });

            current = foundKey ? current[foundKey] : null;
        }

        return current;
    }

    function formatTemplateValue(value, formatHint) {
        if (value === null || value === undefined) return '';
        var hint = String(formatHint || '').toLowerCase();

        if (hint === 'signature') {
            var raw = '';
            if (typeof value === 'string') {
                raw = value.trim();
            } else if (Array.isArray(value)) {
                raw = value.join('');
            } else {
                raw = String(value || '').trim();
            }

            if (!raw) return '';
            if (raw.indexOf('data:image/') === 0) return raw;

            // ASP.NET can serialize byte[] as base64; normalize to PNG data URL for template images.
            return 'data:image/png;base64,' + raw;
        }

        if (hint === 'date') {
            var onlyDate = new Date(value);
            return isNaN(onlyDate.getTime())
                ? value
                : onlyDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        if (hint === 'number') {
            var n = Number(value);
            return Number.isFinite(n) ? n.toLocaleString() : value;
        }

        if (hint === 'currency') {
            var c = Number(value);
            return Number.isFinite(c) ? c.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value;
        }

        if (hint === 'datetime') {
            var d = new Date(value);
            return isNaN(d.getTime()) ? value : d.toLocaleString();
        }

        return value;
    }

    function applyTokens(template, context) {
        return String(template || '').replace(/{{\s*([^{}]+?)\s*}}/g, function (_match, tokenExpr) {
            var expr = String(tokenExpr || '').trim();
            if (!expr || expr.charAt(0) === '#' || expr.charAt(0) === '/') return _match;

            var parts = expr.split('|');
            var path = parts[0] || '';
            var formatHint = parts.length > 1 ? parts[1] : '';
            var value = resolvePath(context, path);
            return escapeHtml(formatTemplateValue(value, formatHint));
        });
    }

    function renderTemplateLoops(template, context) {
        return String(template || '').replace(/{{#\s*([A-Za-z0-9_.]+)\s*}}([\s\S]*?){{\/\s*\1\s*}}/g, function (_match, collectionPath, block) {
            var rows = resolvePath(context, collectionPath);
            if (!Array.isArray(rows) || !rows.length) return '';

            return rows.map(function (row, index) {
                var rowContext = $.extend({}, context, row, { rowNumber: index + 1 });
                return applyTokens(block, rowContext);
            }).join('');
        });
    }

    function normalizePreviewColumnType(column, fieldName) {
        var type = String((column && (column.type || column.Type)) || '').toLowerCase();
        if (type === 'number' || type === 'currency' || type === 'int' || type === 'integer' || type === 'decimal' || type === 'numeric' || type === 'money') {
            return 'number';
        }
        if (type === 'date' || type === 'datetime') {
            return type;
        }
        if (/date$/i.test(String(fieldName || ''))) {
            return 'date';
        }
        return 'text';
    }

    function getRowFieldValue(row, fieldName) {
        if (!row || !fieldName) return null;
        if (Object.prototype.hasOwnProperty.call(row, fieldName)) return row[fieldName];

        var foundKey = null;
        Object.keys(row).some(function (candidate) {
            if (candidate.toLowerCase() === String(fieldName).toLowerCase()) {
                foundKey = candidate;
                return true;
            }
            return false;
        });

        return foundKey ? row[foundKey] : resolvePath(row, fieldName);
    }

    function comparePreviewValues(a, b, type) {
        if (type === 'number') {
            var aNum = Number(a);
            var bNum = Number(b);
            var aOk = Number.isFinite(aNum);
            var bOk = Number.isFinite(bNum);
            if (aOk && bOk) return aNum - bNum;
            if (aOk) return 1;
            if (bOk) return -1;
        }

        if (type === 'date' || type === 'datetime') {
            var aDate = new Date(a);
            var bDate = new Date(b);
            var aTime = aDate.getTime();
            var bTime = bDate.getTime();
            var aValid = !isNaN(aTime);
            var bValid = !isNaN(bTime);
            if (aValid && bValid) return aTime - bTime;
            if (aValid) return 1;
            if (bValid) return -1;
        }

        return String(a === null || a === undefined ? '' : a).localeCompare(
            String(b === null || b === undefined ? '' : b),
            undefined,
            { numeric: true, sensitivity: 'base' }
        );
    }

    function inferPreviewTypeFromHeader(headerText) {
        var text = String(headerText || '').toLowerCase();
        if (/amount|qty|quantity|total|price|rate|pax|count|balance|tax/.test(text)) return 'number';
        if (/date|time|day/.test(text)) return 'date';
        return 'text';
    }

    function getPreviewStatusColumnIndex($table) {
        if (!$table || !$table.length) return -1;
        var index = -1;
        $table.find('thead th').each(function (i) {
            var label = $(this).text().replace(/\s+/g, ' ').trim().toLowerCase();
            if (label === 'status' || label === 'order status') {
                index = i;
                return false;
            }
            return true;
        });
        return index;
    }

    function getPreviewPaymentStatusColumnIndex($table) {
        if (!$table || !$table.length) return -1;
        var index = -1;
        $table.find('thead th').each(function (i) {
            var label = $(this).text().replace(/\s+/g, ' ').trim().toLowerCase();
            if (label === 'payment status' || label === 'payment') {
                index = i;
                return false;
            }
            return true;
        });
        return index;
    }

    function getReportStatusClass(statusText) {
        var key = String(statusText || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (!key) return '';
        if (key === 'pending') return 'report-status-pending';
        if (key === 'in kitchen') return 'report-status-in-kitchen';
        if (key === 'ready for delivery') return 'report-status-ready';
        if (key === 'assigned for driver') return 'report-status-assigned';
        if (key === 'amended') return 'report-status-amended';
        if (key === 'cancel order' || key === 'cancelled' || key === 'canceled') return 'report-status-cancelled';
        return '';
    }

    function applyReportStatusBadges($table) {
        if (!$table || !$table.length) return;
        var statusIndex = getPreviewStatusColumnIndex($table);
        if (statusIndex < 0) return;

        $table.find('tbody tr').each(function () {
            var $cell = $(this).children('td').eq(statusIndex);
            if (!$cell.length) return;

            if ($cell.find('.report-status-badge, .badge-pill, .badge').length) {
                return;
            }

            var rawText = $cell.text().replace(/\s+/g, ' ').trim();
            if (!rawText) return;

            var badgeClass = getReportStatusClass(rawText);
            if (!badgeClass) return;

            $cell.html('<span class="report-status-badge ' + badgeClass + '">' + escapeHtml(rawText) + '</span>');
        });
    }

    function getReportPaymentStatusClass(statusText) {
        var key = String(statusText || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (!key) return 'report-payment-muted';

        if (key === 'paid' || key === 'successful' || key === 'completed' || key === '2') {
            return 'report-payment-paid';
        }

        if (key === 'partially paid' || key === 'partial paid' || key === 'partially-paid' || key === 'part payment' || key === '1') {
            return 'report-payment-partial';
        }

        if (key === 'pending' || key === 'unpaid' || key === '0') {
            return 'report-payment-pending';
        }

        if (key === 'failed' || key === 'declined' || key === 'cancelled' || key === 'canceled' || key === 'expired' || key === 'refunded') {
            return 'report-payment-danger';
        }

        return 'report-payment-muted';
    }

    function applyReportPaymentStatusBadges($table) {
        if (!$table || !$table.length) return;
        var paymentStatusIndex = getPreviewPaymentStatusColumnIndex($table);
        if (paymentStatusIndex < 0) return;

        $table.find('tbody tr').each(function () {
            var $cell = $(this).children('td').eq(paymentStatusIndex);
            if (!$cell.length) return;

            if ($cell.find('.report-payment-badge, .status-pill, .badge-pill, .badge').length) {
                return;
            }

            var rawText = $cell.text().replace(/\s+/g, ' ').trim();
            if (!rawText) return;

            var badgeClass = getReportPaymentStatusClass(rawText);
            $cell.html('<span class="report-payment-badge ' + badgeClass + '">' + escapeHtml(rawText) + '</span>');
        });
    }

    function sortRenderedPreviewTableByColumn($table, columnIndex, direction) {
        if (!$table || !$table.length || columnIndex < 0) return;

        var $tbody = $table.find('tbody').first();
        if (!$tbody.length) return;

        var rows = $tbody.find('tr').get();
        if (!rows.length) return;

        var $headerCell = $table.find('thead th').eq(columnIndex);
        var explicitType = String($headerCell.attr('data-export-type') || '').toLowerCase();
        var valueType = explicitType || inferPreviewTypeFromHeader($headerCell.text());

        rows.sort(function (rowA, rowB) {
            var valueA = $(rowA).children('td').eq(columnIndex).text().trim();
            var valueB = $(rowB).children('td').eq(columnIndex).text().trim();
            var result = comparePreviewValues(valueA, valueB, valueType);
            return direction === 'asc' ? result : -result;
        });

        rows.forEach(function (row) {
            $tbody.append(row);
        });
    }

    function decorateReportPreviewTableHeaders() {
        var $tables = getPreviewFeatureTables();
        if (!$tables.length) return;

        $tables.each(function () {
            var $table = $(this);
            var $headers = $table.find('thead th');
            if (!$headers.length) return;

            $headers.each(function (index) {
                var $th = $(this);
                $th.addClass('report-sortable-th');
                if (!$th.attr('title')) {
                    $th.attr('title', 'Click to sort');
                }
                if (!$th.attr('data-sort-index')) {
                    $th.attr('data-sort-index', String(index));
                }
            });
        });
    }

    function getPreviewFeatureTables() {
        return $('#reportResultWrap #reportResultTable')
            .not('#reportExportTable');
    }

    function getPreviewTableState($table) {
        var raw = $table.data('preview-table-state');
        if (raw && typeof raw === 'object') {
            raw.pageSize = 10;
            return raw;
        }
        var stateObj = { query: '', page: 1, pageSize: 10 };
        $table.data('preview-table-state', stateObj);
        return stateObj;
    }

    function ensurePreviewTableTools($table, tableIndex) {
        var $wrap = $table.closest('.table-wrap');
        if (!$wrap.length) return null;

        var $resultsSection = $table.closest('.results-section');
        var $resultsHeader = $resultsSection.find('.results-header').first();

        var toolbarId = 'reportPreviewTools_' + tableIndex;
        var footerId = 'reportPreviewPager_' + tableIndex;

        var $toolbar = $('#' + toolbarId);
        if (!$toolbar.length) {
            $toolbar = $('<div class="report-table-tools report-table-tools-inline" id="' + toolbarId + '">' +
                '<div class="report-table-search-wrap">' +
                '<input type="text" class="form-control report-table-search" placeholder="Search in table..." aria-label="Search report table" autocomplete="off">' +
                '</div>' +
                '</div>');
            if ($resultsHeader.length) {
                $resultsHeader.append($toolbar);
            } else {
                $wrap.before($toolbar);
            }
        } else {
            // Move existing toolbar to the current preview header when preview re-renders.
            if ($resultsHeader.length) {
                $resultsHeader.append($toolbar);
            } else {
                $wrap.before($toolbar);
            }
        }

        var $footer = $('#' + footerId);
        if (!$footer.length) {
            $footer = $('<div class="report-table-pager" id="' + footerId + '">' +
                '<div class="report-table-pager-info"></div>' +
                '<div class="report-table-pager-right">' +
                '<div class="report-table-page-size">' +
                '<label>Rows per page: 10</label>' +
                '</div>' +
                '<div class="report-table-pager-actions"></div>' +
                '</div>' +
                '</div>');
            $wrap.after($footer);
        } else {
            // Keep pager tied to the currently rendered preview table.
            $wrap.after($footer);
        }

        return { toolbar: $toolbar, footer: $footer };
    }

    function applyPreviewTableSearchAndPagination($table, tableIndex, ui) {
        if (!$table || !$table.length) return;

        var stateObj = getPreviewTableState($table);
        ui = ui || ensurePreviewTableTools($table, tableIndex);
        if (!ui) return;
        stateObj.pageSize = 10;

        var $rows = $table.find('tbody tr');
        var query = String(stateObj.query || '').trim().toLowerCase();
        var pageSize = 10;

        var matched = [];
        $rows.each(function () {
            var $row = $(this);
            var text = $row.text().toLowerCase();
            var isMatch = !query || text.indexOf(query) >= 0;
            $row.attr('data-preview-match', isMatch ? '1' : '0');
            if (isMatch) matched.push(this);
        });

        var totalRows = matched.length;
        var totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
        if (stateObj.page > totalPages) stateObj.page = totalPages;
        if (stateObj.page < 1) stateObj.page = 1;

        var start = (stateObj.page - 1) * pageSize;
        var end = start + pageSize;

        $rows.hide();
        for (var i = start; i < end && i < matched.length; i++) {
            $(matched[i]).show();
        }

        var from = totalRows === 0 ? 0 : (start + 1);
        var to = Math.min(end, totalRows);
        ui.footer.find('.report-table-pager-info').text(from + '-' + to + ' of ' + totalRows + ' rows');

        var $actions = ui.footer.find('.report-table-pager-actions');
        $actions.empty();

        function addPagerButton(label, page, disabled, active) {
            var $btn = $('<button type="button" class="report-page-btn">' + label + '</button>');
            if (disabled) $btn.prop('disabled', true).addClass('disabled');
            if (active) $btn.addClass('active');
            $btn.on('click', function () {
                if (disabled) return;
                stateObj.page = page;
                applyPreviewTableSearchAndPagination($table, tableIndex);
            });
            $actions.append($btn);
        }

        addPagerButton('«', 1, stateObj.page === 1, false);
        addPagerButton('‹', Math.max(1, stateObj.page - 1), stateObj.page === 1, false);

        var startPage = Math.max(1, stateObj.page - 2);
        var endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (var p = startPage; p <= endPage; p++) {
            addPagerButton(String(p), p, false, p === stateObj.page);
        }

        addPagerButton('›', Math.min(totalPages, stateObj.page + 1), stateObj.page === totalPages, false);
        addPagerButton('»', totalPages, stateObj.page === totalPages, false);
    }

    function initializePreviewTableFeatures() {
        var $tables = getPreviewFeatureTables();
        if (!$tables.length) return;

        $tables.each(function (index) {
            var $table = $(this);
            var tableIndex = index + 1;
            var ui = ensurePreviewTableTools($table, tableIndex);
            if (!ui) return;

            var stateObj = getPreviewTableState($table);
            applyReportStatusBadges($table);
            applyReportPaymentStatusBadges($table);

            var $search = ui.toolbar.find('.report-table-search');
            $search.off('input.reportPreviewSearch').on('input.reportPreviewSearch', function () {
                stateObj.query = $(this).val() || '';
                stateObj.page = 1;
                applyPreviewTableSearchAndPagination($table, tableIndex, ui);
            });
            $search.val(stateObj.query || '');
            stateObj.pageSize = 10;

            applyPreviewTableSearchAndPagination($table, tableIndex, ui);
        });
    }

    function resetPreviewTableUi() {
        $('#resultsSectionWrap .report-table-tools, #resultsSectionWrap .report-table-pager').remove();
    }

    function applyPreviewSort(rows, columns) {
        var inputRows = Array.isArray(rows) ? rows : [];
        if (!inputRows.length) return [];

        var sortField = String(state.previewSort && state.previewSort.field || '').trim();
        var sortDirection = String(state.previewSort && state.previewSort.direction || '').toLowerCase();
        if (!sortField || (sortDirection !== 'asc' && sortDirection !== 'desc')) {
            return inputRows.slice();
        }

        var sortColumn = (Array.isArray(columns) ? columns : []).find(function (column) {
            return String(column.field || column.Field || '').toLowerCase() === sortField.toLowerCase();
        });
        var normalizedType = normalizePreviewColumnType(sortColumn || {}, sortField);

        var sorted = inputRows.map(function (row, index) {
            return { row: row, index: index };
        });

        sorted.sort(function (left, right) {
            var leftValue = getRowFieldValue(left.row, sortField);
            var rightValue = getRowFieldValue(right.row, sortField);
            var result = comparePreviewValues(leftValue, rightValue, normalizedType);
            if (result === 0) return left.index - right.index;
            return sortDirection === 'asc' ? result : -result;
        });

        return sorted.map(function (entry) { return entry.row; });
    }

    function buildTableMarkup(rows, columns, sortState) {
        if (!rows.length || !columns.length) {
            return '<div class="hint" style="padding:12px">No data found for selected filters.</div>';
        }

        var html = '<div class="table-wrap"><table class="table" id="reportResultTable"><thead><tr>';
        columns.forEach(function (column) {
            var type = String(column.type || column.Type || 'text').toLowerCase();
            var field = String(column.field || column.Field || '');
            var isSortable = !!field;
            var isActiveSort = isSortable && sortState
                && String(sortState.field || '').toLowerCase() === field.toLowerCase()
                && (sortState.direction === 'asc' || sortState.direction === 'desc');
            var sortClass = '';
            if (isActiveSort && sortState.direction === 'asc') sortClass = ' sorted-asc';
            if (isActiveSort && sortState.direction === 'desc') sortClass = ' sorted-desc';

            html += '<th class="report-col-' + escapeHtml(type) + (isSortable ? ' report-sortable-th sortable' : '') + sortClass + '"' +
                (isSortable ? ' data-sort-field="' + escapeHtml(field) + '"' : '') +
                (isSortable ? ' title="Click to sort"' : '') +
                '>' + escapeHtml(column.header || field || '-') + '</th>';
        });
        html += '</tr></thead><tbody>';

        rows.forEach(function (row) {
            html += '<tr>';
            columns.forEach(function (column) {
                var field = column.field || '';
                var value = row[field];
                var type = String(column.type || column.Type || 'text').toLowerCase();
                var displayValue = value;

                if ((type === 'date' || /date$/i.test(field)) && value !== null && value !== undefined && value !== '') {
                    displayValue = formatTemplateValue(value, 'date');
                    type = 'date';
                } else if (type === 'number' && value !== null && value !== undefined && value !== '') {
                    displayValue = formatTemplateValue(value, 'number');
                }

                html += '<td class="report-col-' + escapeHtml(type) + '">' +
                    escapeHtml(displayValue === null || displayValue === undefined ? '' : displayValue) + '</td>';
            });
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        return html;
    }

    function buildKitchenGroupedTable(rows) {
        if (!Array.isArray(rows) || !rows.length) return '';

        var dateOrder = [];
        var dateBuckets = {};

        rows.forEach(function (row) {
            var rawDate = resolvePath(row, 'EventDate');
            var dateLabel = formatTemplateValue(rawDate, 'date') || 'No Date';
            var categoryName = String(resolvePath(row, 'CategoryName') || 'Uncategorized').trim() || 'Uncategorized';
            var menuName = String(resolvePath(row, 'MenuName') || '').trim() || '-';
            var qtyRaw = resolvePath(row, 'TotalQty');
            if (qtyRaw === null || qtyRaw === undefined || qtyRaw === '') qtyRaw = resolvePath(row, 'Qty');
            if (qtyRaw === null || qtyRaw === undefined || qtyRaw === '') qtyRaw = resolvePath(row, 'Quantity');
            var qty = Number(qtyRaw);
            if (!Number.isFinite(qty)) qty = 0;

            if (!dateBuckets[dateLabel]) {
                dateBuckets[dateLabel] = {
                    label: dateLabel,
                    totalQty: 0,
                    categoryOrder: [],
                    categories: {}
                };
                dateOrder.push(dateLabel);
            }

            var dateBucket = dateBuckets[dateLabel];
            dateBucket.totalQty += qty;

            if (!dateBucket.categories[categoryName]) {
                dateBucket.categories[categoryName] = {
                    name: categoryName,
                    subtotal: 0,
                    items: []
                };
                dateBucket.categoryOrder.push(categoryName);
            }

            var categoryBucket = dateBucket.categories[categoryName];
            categoryBucket.subtotal += qty;
            categoryBucket.items.push({
                menuName: menuName,
                qty: qty
            });
        });

        var html = '';

        dateOrder.forEach(function (dateKey) {
            var dateBucket = dateBuckets[dateKey];
            html += '<section class="kq-date-group">';
            html += '<header class="kq-date-head">';
            html += '<h3 class="kq-date-title">' + escapeHtml(dateBucket.label) + '</h3>';
            html += '<div class="kq-date-total">Date Total <strong>' + escapeHtml(formatTemplateValue(dateBucket.totalQty, 'number')) + '</strong></div>';
            html += '</header>';
            html += '<div class="kq-cat-grid">';

            dateBucket.categoryOrder.forEach(function (categoryKey) {
                var categoryBucket = dateBucket.categories[categoryKey];
                categoryBucket.items.sort(function (a, b) {
                    var qtyDiff = (Number(b.qty) || 0) - (Number(a.qty) || 0);
                    if (qtyDiff !== 0) return qtyDiff;
                    return String(a.menuName || '').localeCompare(String(b.menuName || ''));
                });
                html += '<article class="kq-cat-card">';
                html += '<div class="kq-cat-head">';
                html += '<h4 class="kq-cat-title">' + escapeHtml(categoryBucket.name) + '</h4>';
                html += '<span class="kq-cat-subtotal">Subtotal ' + escapeHtml(formatTemplateValue(categoryBucket.subtotal, 'number')) + '</span>';
                html += '</div>';
                html += '<table class="kq-mini-table" aria-label="Category summary">';
                html += '<thead><tr><th>Menu Item</th><th>Qty</th></tr></thead><tbody>';

                categoryBucket.items.forEach(function (item) {
                    html += '<tr>';
                    html += '<td>' + escapeHtml(item.menuName) + '</td>';
                    html += '<td class="kq-mini-qty">' + escapeHtml(formatTemplateValue(item.qty, 'number')) + '</td>';
                    html += '</tr>';
                });

                html += '</tbody></table>';
                html += '</article>';
            });

            html += '</div>';
            html += '</section>';
        });

        return html;
    }

    function renderTemplatePreview(result) {
        var htmlTemplate = (result && result.htmlTemplate) ? String(result.htmlTemplate) : '';
        if (!htmlTemplate) return null;

        var rows = Array.isArray(result.rows) ? result.rows : [];
        var columns = Array.isArray(result.columns) ? result.columns : [];
        var header = result && result.header ? result.header : (rows.length ? rows[0] : {});
        var report = result.report || {};

        function sumByField(fieldName) {
            var total = 0;
            rows.forEach(function (row) {
                var value = resolvePath(row, fieldName);
                var n = Number(value);
                if (Number.isFinite(n)) total += n;
            });
            return total;
        }

        function sumByFields(fieldNames) {
            var total = 0;
            rows.forEach(function (row) {
                for (var i = 0; i < fieldNames.length; i++) {
                    var value = resolvePath(row, fieldNames[i]);
                    var n = Number(value);
                    if (value !== null && value !== undefined && value !== '' && Number.isFinite(n)) {
                        total += n;
                        break;
                    }
                }
            });
            return total;
        }

        function sumBalance() {
            var total = 0;
            rows.forEach(function (row) {
                var value = resolvePath(row, 'BalanceAmount');
                if (value === null || value === undefined || value === '') {
                    value = resolvePath(row, 'BalanceRemaining');
                }
                if (value === null || value === undefined || value === '') {
                    value = resolvePath(row, 'Outstanding');
                }
                var n = Number(value);
                if (Number.isFinite(n)) total += n;
            });
            return total;
        }

        var totalAmount = sumByFields(['TotalAmount', 'InvoiceAmount', 'BilledAmount', 'GrossAmount']);
        var paidAmount = sumByFields(['PaidAmount', 'CollectedAmount', 'PaymentAmount', 'ReceivedAmount']);
        var balanceAmount = sumBalance();
        var paidPercentage = totalAmount > 0
            ? Math.min(100, Math.max(0, (paidAmount / totalAmount) * 100))
            : 0;

        var context = {
            report: report,
            rows: rows,
            emptyRows: rows.length ? [] : [{}],
            columns: columns,
            columnLabels: result.visibleColumnLabels || {},
            header: header,
            meta: {
                rowCount: rows.length,
                executedAt: result.executedAt || ''
            },
            table: buildTableMarkup(applyPreviewSort(rows, columns), columns, state.previewSort),
            kitchenGroupedTable: buildKitchenGroupedTable(rows),
            sumTotalAmount: totalAmount || sumByFields(['TotalSales', 'TotalSpent', 'NetSales', 'SalesAmount']),
            sumPaidAmount: paidAmount,
            sumInvoiceCount: sumByFields(['InvoiceCount', 'TransactionCount']),
            sumPax: sumByFields(['Pax', 'TotalPax']),
            sumTotalOrders: sumByFields(['TotalOrders', 'OrderCount']),
            sumActiveOrders: sumByFields(['ActiveOrders', 'ActiveCount']),
            sumTaxAmount: sumByFields(['TaxAmount', 'TotalTax', 'TaxCollected']),
            sumTotalQty: sumByFields(['TotalQty', 'Qty', 'Quantity']),
            sumItemAmount: sumByFields(['ItemAmount']),
            sumBalanceAmount: balanceAmount,
            paidPercentage: paidPercentage.toFixed(1),
            outstandingPercentage: (100 - paidPercentage).toFixed(1)
        };

        var rawTableToken = '__REPORT_TABLE__';
        var rawKitchenGroupedToken = '__KITCHEN_GROUPED_TABLE__';
        var templateWithRawBlocks = htmlTemplate
            .replace(/{{\s*table\s*}}/gi, rawTableToken)
            .replace(/{{\s*kitchenGroupedTable\s*}}/gi, rawKitchenGroupedToken);
        var htmlWithLoops = renderTemplateLoops(templateWithRawBlocks, context);
        var htmlWithTokens = applyTokens(htmlWithLoops, context);
        var renderedHtml = htmlWithTokens
            .replace(new RegExp(rawTableToken, 'g'), context.table)
            .replace(new RegExp(rawKitchenGroupedToken, 'g'), context.kitchenGroupedTable || '');
        var visibleNames = Array.isArray(result.visibleColumnNames) ? result.visibleColumnNames : null;
        var columnHeaderMap = {};

        columns.forEach(function (column) {
            var fieldName = String(column.field || column.Field || '').toLowerCase();
            if (fieldName) {
                columnHeaderMap[fieldName] = column.header || column.Header || column.field || column.Field || '';
            }
        });

        if (visibleNames || Object.keys(columnHeaderMap).length) {
            var visibleMap = {};
            (visibleNames || []).forEach(function (name) {
                visibleMap[String(name).toLowerCase()] = true;
            });

            var wrapper = $('<div>').html(renderedHtml);
            wrapper.find('[data-report-column]').each(function () {
                var names = String($(this).attr('data-report-column') || '')
                    .split(',')
                    .map(function (name) { return name.trim().toLowerCase(); })
                    .filter(Boolean);

                if ($(this).is('th')) {
                    var headerField = names.find(function (name) { return columnHeaderMap[name]; });
                    if (headerField) $(this).text(columnHeaderMap[headerField]);
                }

                if (visibleNames && names.length && !names.some(function (name) { return visibleMap[name]; })) {
                    $(this).remove();
                }
            });
            renderedHtml = wrapper.html();
        }

        return renderedHtml;
    }

    function renderPreview(result) {
        state.lastPreviewResult = result || null;
        var rows = result && Array.isArray(result.rows) ? result.rows : [];
        var columns = result && Array.isArray(result.columns) ? result.columns : [];
        var report = result && result.report ? result.report : null;
        var templateKind = (result && result.templateKind ? String(result.templateKind) : '').toLowerCase();

        // Always rebuild table tools for the current preview block.
        resetPreviewTableUi();

        if (templateKind === 'html' && result && result.htmlTemplate) {
            var rendered = renderTemplatePreview(result);
            if (rendered) {
                $('#reportResultWrap').html(rendered);
                decorateReportPreviewTableHeaders();
                initializePreviewTableFeatures();
                return;
            }
        }

        if (!rows.length || !columns.length) {
            $('#reportResultWrap').html('<div class="hint" style="padding:12px">No data found for selected filters.</div>');
            return;
        }

        var sortedRows = applyPreviewSort(rows, columns);

        var html = '';
        if (report) {
            html += '<div class="report-result-head">' +
                '<div><strong>' + escapeHtml(report.displayName || report.reportName || 'Report') + '</strong></div>' +
                '<div class="hint">Stored Procedure: ' + escapeHtml(report.storedProcedure || '-') + ' | Rows: ' + rows.length + '</div>' +
                '</div>';
        }

        html += buildTableMarkup(sortedRows, columns, state.previewSort);
        $('#reportResultWrap').html(html);
        decorateReportPreviewTableHeaders();
        initializePreviewTableFeatures();
    }

    function ensureExportTable(result) {
        var tableId = 'reportExportTable';
        $('#' + tableId).remove();

        var rows = result && Array.isArray(result.rows) ? result.rows : [];
        var columns = result && Array.isArray(result.columns) ? result.columns : [];
        if (!rows.length || !columns.length) return null;

        var sortedRows = applyPreviewSort(rows, columns);

        var html = '<table id="' + tableId + '" style="position:fixed;left:-10000px;top:0;opacity:0;pointer-events:none;"><thead><tr>';
        columns.forEach(function (column) {
            var colType = String(column.type || column.Type || 'text').toLowerCase();
            html += '<th data-export-type="' + escapeHtml(colType) + '">' + escapeHtml(column.header || column.field || '-') + '</th>';
        });
        html += '</tr></thead><tbody>';

        sortedRows.forEach(function (row) {
            html += '<tr>';
            columns.forEach(function (column) {
                var field = column.field || '';
                var value = row[field];
                var colType = String(column.type || column.Type || 'text').toLowerCase();
                var displayValue = value;

                if ((colType === 'date' || /date$/i.test(field)) && value !== null && value !== undefined && value !== '') {
                    displayValue = formatTemplateValue(value, 'date');
                    colType = 'date';
                } else if (colType === 'number' && value !== null && value !== undefined && value !== '') {
                    displayValue = formatTemplateValue(value, 'number');
                } else if (colType === 'currency' && value !== null && value !== undefined && value !== '') {
                    displayValue = formatTemplateValue(value, 'currency');
                }

                html += '<td data-export-type="' + escapeHtml(colType) + '">' + escapeHtml(displayValue === null || displayValue === undefined ? '' : displayValue) + '</td>';
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        $('body').append(html);
        return tableId;
    }

    function getActiveReportName() {
        if (!state.lastPreviewResult || !state.lastPreviewResult.report) return 'Report';
        return state.lastPreviewResult.report.displayName || state.lastPreviewResult.report.reportName || 'Report';
    }

    function getActiveReportNameWithDate() {
        var reportName = getActiveReportName();
        var today = new Date();
        var day = today.getDate();
        var month = today.getMonth() + 1;
        var year = today.getFullYear();
        return reportName + '-' + day + '-' + month + '-' + year;
    }

    function printCurrentPreview() {
        if (!state.lastPreviewResult || !Array.isArray(state.lastPreviewResult.rows) || !state.lastPreviewResult.rows.length) {
            if (typeof showToast === 'function') {
                showToast('Run preview before print.', 2500, { type: 'warning', title: 'Print' });
            }
            return;
        }

        var $printRoot = $('<div>').append($('#reportResultWrap').children().clone(true, true));

        $printRoot.find('.report-table-tools, .report-table-pager, .column-chooser-wrap').remove();
        $printRoot.find('#reportResultTable tbody tr').each(function () {
            $(this).show().css('display', '');
        });

        var html = $printRoot.html() || '';
        var win = window.open('', '_blank', 'width=1200,height=900');
        if (!win) {
            if (typeof showToast === 'function') {
                showToast('Popup blocked. Allow popups to print report.', 3000, { type: 'warning', title: 'Print' });
            }
            return;
        }

        win.document.write('<html><head><title>' + escapeHtml(getActiveReportNameWithDate()) + '</title>');
        win.document.write('<link rel="stylesheet" href="/css/site.css">');
        win.document.write('<style>body{padding:18px;font-family:Segoe UI,Arial,sans-serif;} .table{width:100%;border-collapse:collapse;} .table th,.table td{border:1px solid #d6d9de;padding:7px;text-align:left;} .table th{background:#f4f6f8;}</style>');
        win.document.write('</head><body>' + html + '</body></html>');
        win.document.close();
        win.focus();
        win.print();
    }

    function exportCurrentPreviewExcel() {
        var tableId = ensureExportTable(state.lastPreviewResult);
        if (!tableId) {
            if (typeof showToast === 'function') {
                showToast('Run preview before Excel export.', 2500, { type: 'warning', title: 'Export Excel' });
            }
            return;
        }

        if (typeof window.exportTableToExcel === 'function') {
            window.exportTableToExcel(tableId, getActiveReportNameWithDate());
        } else {
            if (typeof showToast === 'function') {
                showToast('Excel export helper is not available.', 2500, { type: 'error', title: 'Export Excel' });
            }
        }
    }

    function exportCurrentPreviewPdf() {
        var tableId = ensureExportTable(state.lastPreviewResult);
        if (!tableId) {
            if (typeof showToast === 'function') {
                showToast('Run preview before PDF export.', 2500, { type: 'warning', title: 'Export PDF' });
            }
            return;
        }

        if (typeof window.exportTableToPdf === 'function') {
            window.exportTableToPdf(tableId, getActiveReportNameWithDate());
        } else {
            if (typeof showToast === 'function') {
                showToast('PDF export helper is not available.', 2500, { type: 'error', title: 'Export PDF' });
            }
        }
    }

    // ===== LOAD INITIAL DATA =====
    function showFiltersLoader(show) {
        $('#filtersLoader').toggleClass('hidden', !show);
    }

    function showPreviewLoader(show) {
        $('#previewLoader').toggleClass('hidden', !show);
    }

    function showContentLoader(show) {
        $('#contentLoader').toggleClass('hidden', !show);
    }

    function loadInitialData() {
        showContentLoader(true);
        $.when(fetchCategories(), fetchAllReports()).done(function (categoriesResult, reportsResult) {
            state.categories = Array.isArray(categoriesResult[0]) ? categoriesResult[0] : [];
            state.allReports = Array.isArray(reportsResult[0]) ? reportsResult[0] : [];
            renderCatalogByCategories();
        }).fail(function () {
            $('#reportCategoriesGrid').html('<div class="hint">Unable to load reports. Please try again.</div>');
        }).always(function () {
            showContentLoader(false);
        });
    }

    // ===== EVENT HANDLERS - CATALOG VIEW =====
    $(document).on('click', '.report-card', function () {
        var reportId = parseInt($(this).data('report-id') || '0', 10) || 0;
        if (reportId > 0) {
            state.selectedReportId = reportId;
            state.previewSort = { field: '', direction: '' };
            resetPreviewTableUi();
            showPreviewView();
            
            // Update header info
            var report = state.allReports.find(function (r) {
                return parseInt(r.id || r.Id || '0', 10) === reportId;
            });
            if (report) {
                $('.report-name').text(report.displayName || report.reportName || 'Report');
                $('.report-description').text(report.description || report.Description || '');
            }
            
            // Load definition and filters
            showFiltersLoader(true);
            fetchDefinition(reportId).done(function (definition) {
                state.definition = definition || null;
                renderFilters();
                $('#reportResultWrap').html('<div class="hint">Click Preview to run this report.</div>');
            }).fail(function () {
                $('#reportResultWrap').html('<div class="hint">Unable to load report definition.</div>');
            }).always(function () {
                showFiltersLoader(false);
            });
        }
    });

    $(document).on('click', '.btn-open-report', function (e) {
        e.stopPropagation();
        var reportId = parseInt($(this).data('report-id') || '0', 10) || 0;
        if (reportId > 0) {
            state.selectedReportId = reportId;
            state.previewSort = { field: '', direction: '' };
            resetPreviewTableUi();
            showPreviewView();
            
            // Update header info
            var report = state.allReports.find(function (r) {
                return parseInt(r.id || r.Id || '0', 10) === reportId;
            });
            if (report) {
                $('.report-name').text(report.displayName || report.reportName || 'Report');
                $('.report-description').text(report.description || report.Description || '');
            }
            
            // Load definition and filters
            showFiltersLoader(true);
            fetchDefinition(reportId).done(function (definition) {
                state.definition = definition || null;
                renderFilters();
                $('#reportResultWrap').html('<div class="hint">Click Preview to run this report.</div>');
            }).fail(function () {
                $('#reportResultWrap').html('<div class="hint">Unable to load report definition.</div>');
            }).always(function () {
                showFiltersLoader(false);
            });
        }
    });

    $('#txtReportSearch').on('input', function () {
        state.reportSearch = $(this).val() || '';
        renderCatalogByCategories();
    });

    $('#columnsSearch').on('input', function () {
        filterColumnsSearch();
    });

    // ===== EVENT HANDLERS - PREVIEW VIEW =====
    $('#btnBackToCatalog').on('click', function () {
        state.selectedReportId = 0;
        state.definition = null;
        state.lastPreviewResult = null;
        state.previewSort = { field: '', direction: '' };
        resetPreviewTableUi();
        showCatalogView();
        $('#txtReportSearch').focus();
    });

    $(document).on('click', '#reportResultWrap th.report-sortable-th', function () {
        var $th = $(this);
        var field = String($th.data('sort-field') || '').trim();

        if (field && state.lastPreviewResult) {
            var currentField = String(state.previewSort.field || '').toLowerCase();
            var nextDirection = 'asc';

            if (currentField === field.toLowerCase()) {
                if (state.previewSort.direction === 'asc') {
                    nextDirection = 'desc';
                } else if (state.previewSort.direction === 'desc') {
                    nextDirection = '';
                }
            }

            if (!nextDirection) {
                state.previewSort = { field: '', direction: '' };
            } else {
                state.previewSort = { field: field, direction: nextDirection };
            }

            renderPreview(state.lastPreviewResult);
            return;
        }

        // Fallback for template tables that do not carry data-sort-field metadata.
        var $table = $th.closest('table');
        var columnIndex = parseInt($th.attr('data-sort-index') || '-1', 10);
        if (!$table.length || isNaN(columnIndex) || columnIndex < 0) return;

        var wasAsc = $th.hasClass('sorted-asc');
        var nextDir = wasAsc ? 'desc' : 'asc';

        $table.find('thead th').removeClass('sorted-asc sorted-desc');
        $th.addClass(nextDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
        sortRenderedPreviewTableByColumn($table, columnIndex, nextDir);
        initializePreviewTableFeatures();
    });

    $('#btnPreviewReport').on('click', function () {
        if (!state.selectedReportId) {
            if (typeof showToast === 'function') {
                showToast('Please select a report first.', 3000, { type: 'warning', title: 'Report' });
            }
            return;
        }

        if (!validateReportDateRangeFilters(true)) {
            return;
        }

        var result = readFilters();
        if (result.missing.length) {
            if (typeof showToast === 'function') {
                showToast('Please fill required filters before preview.', 3000, { type: 'warning', title: 'Validation' });
            }
            return;
        }

        if (typeof setButtonBusy === 'function') {
            setButtonBusy('#btnPreviewReport', true, 'Loading...');
        }
        showPreviewLoader(true);

        $.ajax({
            url: '/Admin/Reports/preview',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                roleId: state.roleId,
                reportId: state.selectedReportId,
                filters: result.values
            }),
            success: function (response) {
                // Fetch visible columns and filter results
                fetchVisibleColumns(state.selectedReportId).done(function (visibleCols) {
                    renderPreview(applyVisibleColumns(response || {}, visibleCols));
                }).fail(function () {
                    // If column visibility fetch fails, render with all columns
                    renderPreview(response || {});
                });
            },
            error: function (xhr) {
                var message = (xhr && xhr.responseJSON && xhr.responseJSON.message) ? xhr.responseJSON.message : 'Unable to execute report.';
                $('#reportResultWrap').html('<div class="hint" style="padding:12px">' + escapeHtml(message) + '</div>');
                if (typeof showToast === 'function') {
                    showToast(message, 3200, { type: 'error', title: 'Preview failed' });
                }
            },
            complete: function () {
                if (typeof setButtonBusy === 'function') {
                    setButtonBusy('#btnPreviewReport', false);
                }
                showPreviewLoader(false);
            }
        });
    });

    $('#btnColumnsReport').on('click', function () {
        if (!state.selectedReportId) {
            if (typeof showToast === 'function') {
                showToast('Please select a report first.', 2000, { type: 'warning', title: 'No Report Selected' });
            }
            return;
        }

        fetchReportColumns(state.selectedReportId)
            .done(function (columns) {
                renderColumnsModal(columns);
                openColumnsModal();
            })
            .fail(function (xhr, status, error) {
                var errorMsg = 'Unable to load columns. ';
                if (xhr.status === 404) {
                    errorMsg += 'API endpoint not found.';
                } else if (xhr.status === 500) {
                    errorMsg += 'Server error.';
                } else {
                    errorMsg += error || 'Unknown error.';
                }
                if (typeof showToast === 'function') {
                    showToast(errorMsg, 3000, { type: 'error', title: 'Error' });
                }
                console.error('Columns fetch failed:', { status: xhr.status, error: error, response: xhr.responseText });
            });
    });

    $('#btnPrintReport').on('click', function () {
        printCurrentPreview();
    });

    $('#btnExportExcelReport').on('click', function () {
        exportCurrentPreviewExcel();
    });

    $('#btnExportPdfReport').on('click', function () {
        exportCurrentPreviewPdf();
    });

    // Close modal when clicking outside of it
    $('#columnsModal').on('click', function (e) {
        if (e.target === this) {
            window.closeColumnsModal();
        }
    });

    // Close modal when pressing Escape
    $(document).on('keydown', function (e) {
        if (e.key === 'Escape' && !$('#columnsModal').hasClass('hidden')) {
            window.closeColumnsModal();
        }
    });

    // ===== INITIALIZE PAGE =====
    loadInitialData();
});
