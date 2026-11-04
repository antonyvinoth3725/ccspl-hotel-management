// Report Permission Management

$(document).ready(function () {
    loadRoles();
    setupEventHandlers();
    decorateActionButtons();
});

function filterReportPermissionRows(keyword) {
    var query = String(keyword || '').trim().toLowerCase();
    var $rows = $('#permissionTableBody tr[data-report-id]');

    if (!$rows.length) return;

    $rows.each(function () {
        var $row = $(this);
        var text = $row.text().toLowerCase();
        var isMatch = !query || text.indexOf(query) > -1;
        $row.toggle(isMatch);
    });
}

function loadRoles() {
    $.ajax({
        url: '/Admin/Roles/get',
        type: 'GET',
        dataType: 'json',
        success: function (roles) {
            var roleSelect = $('#roleSelect');
            roleSelect.empty();
            roleSelect.append('<option value="">-- Choose a role --</option>');

            if (Array.isArray(roles) && roles.length > 0) {
                roles.forEach(function (role) {
                    var roleId = role.id || 0;
                    var roleName = role.name || 'Unknown';
                    roleSelect.append('<option value="' + roleId + '">' + escapeHtml(roleName) + '</option>');
                });
            }
            
            // Hide page loader and show content after roles are loaded
            $('#pageLoader').addClass('hidden');
            $('#roleSelectorSection').removeClass('hidden');
            $('#emptyState').removeClass('hidden');
        },
        error: function () {
            showToast('Unable to load roles', 3000, { type: 'error' });
            $('#pageLoader').addClass('hidden');
            $('#roleSelectorSection').removeClass('hidden');
        }
    });
}

function loadReports(roleId) {
    if (roleId <= 0) {
        resetPermissions();
        return;
    }

    showLoader(true);

    $.ajax({
        url: '/Admin/Reports/permissions?roleId=' + roleId,
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            renderReportTable(Array.isArray(data) ? data : []);
            showLoader(false);
        },
        error: function () {
            showToast('Unable to load reports', 3000, { type: 'error' });
            resetPermissions();
            showLoader(false);
        }
    });
}

function renderReportTable(reports) {
    var tbody = $('#permissionTableBody');
    tbody.empty();

    if (reports.length === 0) {
        tbody.html('<tr><td colspan="6" style="text-align: center; padding: 24px;">No reports available</td></tr>');
        return;
    }

    reports.forEach(function (report) {
        var reportId = report.id || 0;
        var displayName = report.displayName || report.reportName || 'Report';
        var categoryName = report.categoryName || '-';

        var canView = report.canView || false;
        var canPrint = report.canPrint || false;
        var exportPdf = report.exportPdf || false;
        var exportExcel = report.exportExcel || false;

        var html = `
            <tr data-report-id="${reportId}">
                <td class="col-function">
                    <div>
                        <strong>${escapeHtml(displayName)}</strong>
                        <div style="font-size: 12px; color: #999; margin-top: 4px;">${escapeHtml(categoryName)}</div>
                    </div>
                </td>
                <td class="col-all">
                    <div class="permission-checkbox">
                        <input type="checkbox" class="permission-all" data-report-id="${reportId}" ${(canView && canPrint && exportPdf && exportExcel) ? 'checked' : ''} />
                    </div>
                </td>
                <td class="col-view">
                    <div class="permission-checkbox">
                        <input type="checkbox" class="permission-view" data-report-id="${reportId}" ${canView ? 'checked' : ''} />
                    </div>
                </td>
                <td class="col-print">
                    <div class="permission-checkbox">
                        <input type="checkbox" class="permission-print" data-report-id="${reportId}" ${canPrint ? 'checked' : ''} />
                    </div>
                </td>
                <td class="col-export-pdf">
                    <div class="permission-checkbox">
                        <input type="checkbox" class="permission-pdf" data-report-id="${reportId}" ${exportPdf ? 'checked' : ''} />
                    </div>
                </td>
                <td class="col-export-excel">
                    <div class="permission-checkbox">
                        <input type="checkbox" class="permission-excel" data-report-id="${reportId}" ${exportExcel ? 'checked' : ''} />
                    </div>
                </td>
            </tr>
        `;

        tbody.append(html);
    });

    $('#permissionGridWrap').removeClass('hidden');
    $('#emptyState').addClass('hidden');
    syncHeaderAllCheckbox();

    // Apply current search query after table re-render.
    filterReportPermissionRows($('#reportPermissionSearch').val());
}

function resetPermissions() {
    $('#permissionTableBody').empty();
    $('#permissionGridWrap').addClass('hidden');
    $('#emptyState').removeClass('hidden');
    $('#selectAllPermissions').prop('checked', false);
    $('#selectedRoleName').text('');
    $('#reportPermissionSearch').val('');
}

function showLoader(show) {
    $('#contentLoader').toggleClass('hidden', !show);
}

function escapeHtml(text) {
    if (!text) return '';
    return $('<div>').text(String(text)).html();
}

function setupEventHandlers() {
    // Role selection change
    $('#roleSelect').on('change', function () {
        var roleId = parseInt($(this).val() || '0', 10) || 0;
        var roleName = $(this).find('option:selected').text();
        $('#selectedRoleName').text(roleName);

        if (roleId > 0) {
            loadReports(roleId);
        } else {
            resetPermissions();
        }
    });

    // Select All permissions checkbox - check all individual permissions for all rows
    $(document).on('change', '#selectAllPermissions', function () {
        var isChecked = $(this).prop('checked');
        $('#permissionTableBody tr').each(function () {
            $(this).find('.permission-all').prop('checked', isChecked);
            $(this).find('.permission-view').prop('checked', isChecked);
            $(this).find('.permission-print').prop('checked', isChecked);
            $(this).find('.permission-pdf').prop('checked', isChecked);
            $(this).find('.permission-excel').prop('checked', isChecked);
        });
    });

    // Individual "All" checkbox for each report
    $(document).on('change', '.permission-all', function () {
        var reportId = $(this).data('report-id');
        var isChecked = $(this).prop('checked');
        var row = $('tr[data-report-id="' + reportId + '"]');

        row.find('.permission-view').prop('checked', isChecked);
        row.find('.permission-print').prop('checked', isChecked);
        row.find('.permission-pdf').prop('checked', isChecked);
        row.find('.permission-excel').prop('checked', isChecked);
        
        syncHeaderAllCheckbox();
    });

    // Individual permission checkboxes
    $(document).on('change', '.permission-view, .permission-print, .permission-pdf, .permission-excel', function () {
        var reportId = $(this).data('report-id');
        var row = $('tr[data-report-id="' + reportId + '"]');

        var canView = row.find('.permission-view').prop('checked');
        var canPrint = row.find('.permission-print').prop('checked');
        var exportPdf = row.find('.permission-pdf').prop('checked');
        var exportExcel = row.find('.permission-excel').prop('checked');

        var allChecked = canView && canPrint && exportPdf && exportExcel;
        row.find('.permission-all').prop('checked', allChecked);
        
        syncHeaderAllCheckbox();
    });

    // Client-side search for report permission table.
    $('#reportPermissionSearch').on('input', function () {
        filterReportPermissionRows($(this).val());
    });
}

function syncHeaderAllCheckbox() {
    // Check if all permissions across all rows are checked
    var allRowsFullyChecked = true;
    $('#permissionTableBody tr').each(function () {
        var canView = $(this).find('.permission-view').prop('checked');
        var canPrint = $(this).find('.permission-print').prop('checked');
        var exportPdf = $(this).find('.permission-pdf').prop('checked');
        var exportExcel = $(this).find('.permission-excel').prop('checked');
        
        if (!canView || !canPrint || !exportPdf || !exportExcel) {
            allRowsFullyChecked = false;
        }
    });
    
    $('#selectAllPermissions').prop('checked', allRowsFullyChecked);
}

function saveAllPermissions() {
    if (window.gcFormValidation && !window.gcFormValidation.validateScope($('.main').first(), true)) {
        return;
    }

    var roleId = parseInt($('#roleSelect').val() || '0', 10) || 0;

    if (roleId <= 0) {
        showToast('Please select a role first', 2000, { type: 'warning' });
        return;
    }

    var permissions = [];
    $('#permissionTableBody tr').each(function () {
        var reportId = parseInt($(this).data('report-id') || '0', 10) || 0;
        if (reportId <= 0) return;

        var canView = $(this).find('.permission-view').prop('checked');
        var canPrint = $(this).find('.permission-print').prop('checked');
        var exportPdf = $(this).find('.permission-pdf').prop('checked');
        var exportExcel = $(this).find('.permission-excel').prop('checked');

        permissions.push({
            reportId: reportId,
            roleId: roleId,
            canView: canView,
            canPrint: canPrint,
            exportPdf: exportPdf,
            exportExcel: exportExcel
        });
    });

    if (!permissions.length) {
        showToast('No permissions to save', 2000, { type: 'warning' });
        return;
    }

    // Show loading state on button
    setButtonBusy('#btnSavePermissions', true, 'Saving...');

    $.ajax({
        url: '/Admin/Reports/permissions/save',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(permissions),
        success: function () {
            showToast('Report permissions saved successfully.', 2500, { type: 'success', title: 'Saved' });
            setButtonBusy('#btnSavePermissions', false);
        },
        error: function () {
            showToast('Unable to save report permissions.', 3000, { type: 'error', title: 'Save failed' });
            setButtonBusy('#btnSavePermissions', false);
        }
    });
}

function resetRoleSelection() {
    $('#roleSelect').val('').trigger('change');
    resetPermissions();
}
