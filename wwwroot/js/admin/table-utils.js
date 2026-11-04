function storeOriginalRowOrder(table) {
    var tbody = table.tBodies[0];
    if (!tbody) return;
    var rows = tbody.querySelectorAll('tr');
    rows.forEach(function (row, index) {
        row.dataset.originalOrder = index;
    });
}

function getTablePageSize(table) {
    var size = parseInt(table.dataset.pageSize, 10);
    return isNaN(size) || size <= 0 ? 10 : size;
}

function getCurrentPage(table) {
    var page = parseInt(table.dataset.datatablePage, 10);
    return isNaN(page) || page < 1 ? 1 : page;
}

function getDataTableRows(table) {
    var tbody = table.tBodies[0];
    if (!tbody) return [];
    return Array.prototype.slice.call(tbody.querySelectorAll('tr'));
}

function getTableColumnMeta(table) {
    if (!table || !table.tHead || !table.tHead.rows || !table.tHead.rows.length) return [];
    var headerRow = table.tHead.rows[0];
    return Array.prototype.slice.call(headerRow.cells || []).map(function (cell, index) {
        return {
            index: index,
            label: (cell.textContent || '').replace(/\s+/g, ' ').trim() || ('Column ' + (index + 1))
        };
    });
}

function getHiddenColumnIndexes(table) {
    if (!table || !table.dataset.hiddenColumns) return [];
    return table.dataset.hiddenColumns
        .split(',')
        .map(function (item) { return parseInt(item, 10); })
        .filter(function (num) { return !isNaN(num); });
}

function setHiddenColumnIndexes(table, hiddenIndexes) {
    var normalized = (hiddenIndexes || []).slice().sort(function (a, b) { return a - b; });
    table.dataset.hiddenColumns = normalized.join(',');
}

function applyTableColumnVisibility(table) {
    if (!table) return;
    var hiddenSet = new Set(getHiddenColumnIndexes(table));
    var rows = [];

    if (table.tHead && table.tHead.rows) {
        rows = rows.concat(Array.prototype.slice.call(table.tHead.rows));
    }
    if (table.tBodies && table.tBodies.length) {
        Array.prototype.slice.call(table.tBodies).forEach(function (tbody) {
            rows = rows.concat(Array.prototype.slice.call(tbody.rows));
        });
    }

    rows.forEach(function (row) {
        Array.prototype.slice.call(row.cells || []).forEach(function (cell, colIndex) {
            cell.style.display = hiddenSet.has(colIndex) ? 'none' : '';
        });
    });
}

function closeColumnChooserMenus() {
    document.querySelectorAll('.column-chooser-popover.open').forEach(function (menu) {
        menu.classList.remove('open');
        menu.classList.add('hidden');
    });
}

function updateSelectAllCheckbox(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;

    var chooser = document.querySelector('.js-column-chooser[data-table="' + tableId + '"]');
    if (!chooser) return;

    var selectAllInput = chooser.querySelector('.js-column-select-all');
    if (!selectAllInput) return;

    var columns = getTableColumnMeta(table);
    if (!columns.length) {
        selectAllInput.checked = false;
        selectAllInput.indeterminate = false;
        return;
    }

    var hiddenSet = new Set(getHiddenColumnIndexes(table));
    var visibleCount = columns.length - hiddenSet.size;

    selectAllInput.checked = visibleCount === columns.length;
    selectAllInput.indeterminate = visibleCount > 0 && visibleCount < columns.length;
}

function updateColumnChooserState(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var hiddenSet = new Set(getHiddenColumnIndexes(table));
    var inputs = document.querySelectorAll('.js-column-chooser[data-table="' + tableId + '"] input[type="checkbox"]');
    inputs.forEach(function (input) {
        if (input.classList.contains('js-column-select-all')) return;
        var colIndex = parseInt(input.value, 10);
        input.checked = !hiddenSet.has(colIndex);
    });

    updateSelectAllCheckbox(tableId);
}

function setAllColumnsVisible(tableId, visible) {
    var table = document.getElementById(tableId);
    if (!table) return;

    var columns = getTableColumnMeta(table);
    if (!columns.length) return;

    if (visible) {
        setHiddenColumnIndexes(table, []);
    } else {
        // Keep first column visible to avoid blank table.
        var hiddenIndexes = columns.slice(1).map(function (c) { return c.index; });
        setHiddenColumnIndexes(table, hiddenIndexes);
    }

    applyTableColumnVisibility(table);
    renderDataTable(tableId);
    updateColumnChooserState(tableId);
}

function toggleTableColumn(tableId, colIndex, visible) {
    var table = document.getElementById(tableId);
    if (!table) return;

    var columns = getTableColumnMeta(table);
    var hiddenSet = new Set(getHiddenColumnIndexes(table));

    if (visible) {
        hiddenSet.delete(colIndex);
    } else {
        var willHideCount = hiddenSet.size + (hiddenSet.has(colIndex) ? 0 : 1);
        if (willHideCount >= columns.length) {
            showToast('At least one column must remain visible.', 2200, { type: 'warning', title: 'Columns' });
            updateColumnChooserState(tableId);
            return;
        }
        hiddenSet.add(colIndex);
    }

    setHiddenColumnIndexes(table, Array.from(hiddenSet));
    applyTableColumnVisibility(table);
    renderDataTable(tableId);
    updateColumnChooserState(tableId);
}

function buildColumnChooser(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return null;

    var columns = getTableColumnMeta(table);
    if (!columns.length) return null;

    var wrapper = document.createElement('div');
    wrapper.className = 'column-chooser-wrap js-column-chooser';
    wrapper.dataset.table = tableId;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-light btn-column-chooser';
    button.setAttribute('aria-label', 'Choose columns');
    button.setAttribute('title', 'Choose columns');
    button.innerHTML = '<span class="column-chooser-icon" aria-hidden="true">▦</span>';

    var popover = document.createElement('div');
    popover.className = 'column-chooser-popover hidden';
    popover.innerHTML = '<div class="column-chooser-title">Columns</div>';

    var selectAll = document.createElement('label');
    selectAll.className = 'column-chooser-item column-chooser-item-select-all';
    selectAll.innerHTML =
        '<input class="js-column-select-all" type="checkbox">' +
        '<span>Select all columns</span>';
    popover.appendChild(selectAll);

    var selectAllInput = selectAll.querySelector('.js-column-select-all');
    selectAllInput.addEventListener('change', function () {
        setAllColumnsVisible(tableId, selectAllInput.checked);
    });

    var hiddenSet = new Set(getHiddenColumnIndexes(table));
    columns.forEach(function (col) {
        var item = document.createElement('label');
        item.className = 'column-chooser-item';
        item.innerHTML =
            '<input type="checkbox" value="' + col.index + '" ' + (hiddenSet.has(col.index) ? '' : 'checked') + '>' +
            '<span>' + col.label + '</span>';

        var checkbox = item.querySelector('input');
        checkbox.addEventListener('change', function () {
            toggleTableColumn(tableId, col.index, checkbox.checked);
        });

        popover.appendChild(item);
    });

    button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        var isOpen = !popover.classList.contains('hidden');
        closeColumnChooserMenus();
        if (isOpen) {
            popover.classList.add('hidden');
            popover.classList.remove('open');
            return;
        }
        popover.classList.remove('hidden');
        popover.classList.add('open');
        updateColumnChooserState(tableId);
    });

    wrapper.appendChild(button);
    wrapper.appendChild(popover);
    updateSelectAllCheckbox(tableId);
    return wrapper;
}

function injectColumnChoosers(root) {
    var scope = root || document;
    var searches = scope.querySelectorAll('.tbl-search[data-table]');

    searches.forEach(function (search) {
        var tableId = search.getAttribute('data-table') || '';
        if (!tableId) return;

        var actionBar = search.closest('.panel-actions, .page-header-actions') || search.parentElement;
        if (!actionBar) return;

        if (actionBar.querySelector('.js-column-chooser[data-table="' + tableId + '"]')) {
            return;
        }

        var chooser = buildColumnChooser(tableId);
        if (!chooser) return;

        var anchor = search.closest('.app-header-filter') || search;
        anchor.insertAdjacentElement('afterend', chooser);
    });
}

function applyDataTableSearch(tableId, value) {
    var table = document.getElementById(tableId);
    if (!table) return;
    table.dataset.datatableSearch = value || '';
    table.dataset.datatablePage = '1';
    renderDataTable(tableId);
}

function clearTableSortState(table) {
    table.dataset.datatableSortCol = '';
    table.dataset.datatableSortDir = '';
    table.querySelectorAll('th.sortable').forEach(function (th) {
        th.classList.remove('sorted-asc', 'sorted-desc');
    });
}

function attachTableSort(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;

    storeOriginalRowOrder(table);
    var ths = table.querySelectorAll('th.sortable');
    ths.forEach(function (th) {
        th.addEventListener('click', function () {
            var columnIndex = Array.prototype.indexOf.call(th.parentNode.children, th);
            var currentSortCol = table.dataset.datatableSortCol;
            var currentSortDir = table.dataset.datatableSortDir;
            var newSortDir = 'asc';

            if (currentSortCol === String(columnIndex)) {
                newSortDir = currentSortDir === 'asc' ? 'desc' : currentSortDir === 'desc' ? '' : 'asc';
            }

            clearTableSortState(table);
            if (!newSortDir) {
                renderDataTable(tableId);
                return;
            }

            th.classList.add(newSortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
            table.dataset.datatableSortCol = String(columnIndex);
            table.dataset.datatableSortDir = newSortDir;
            renderDataTable(tableId);
        });
    });
}

function sortTable(table, colIndex, ascending) {
    var rows = getDataTableRows(table);
    rows.sort(function (a, b) {
        var aText = (a.cells[colIndex] && a.cells[colIndex].textContent || '').trim();
        var bText = (b.cells[colIndex] && b.cells[colIndex].textContent || '').trim();
        var aNum = parseFloat(aText.replace(/[^0-9.-]+/g, ''));
        var bNum = parseFloat(bText.replace(/[^0-9.-]+/g, ''));

        if (!isNaN(aNum) && !isNaN(bNum)) {
            return ascending ? aNum - bNum : bNum - aNum;
        }

        return ascending ? aText.localeCompare(bText) : bText.localeCompare(aText);
    });
    return rows;
}

function filterTableRows(table) {
    var search = (table.dataset.datatableSearch || '').toLowerCase();
    var rows = getDataTableRows(table);
    rows.forEach(function (row) {
        var text = row.textContent.toLowerCase();
        row.dataset.datatableMatch = !search || text.indexOf(search) > -1 ? '1' : '0';
    });
}

function paginateTableRows(table, rows) {
    var pageSize = getTablePageSize(table);
    var currentPage = getCurrentPage(table);
    var matchedRows = rows.filter(function (row) { return row.dataset.datatableMatch === '1'; });
    var totalPages = Math.max(1, Math.ceil(matchedRows.length / pageSize));
    if (currentPage > totalPages) {
        currentPage = totalPages;
        table.dataset.datatablePage = String(currentPage);
    }

    matchedRows.forEach(function (row, index) {
        row.style.display = index >= (currentPage - 1) * pageSize && index < currentPage * pageSize ? '' : 'none';
    });
    rows.filter(function (row) { return row.dataset.datatableMatch !== '1'; }).forEach(function (row) { row.style.display = 'none'; });

    return {
        currentPage: currentPage,
        pageSize: pageSize,
        totalRows: matchedRows.length,
        totalPages: totalPages
    };
}

function findDataTableFooter(table) {
    if (!table || !table.id) return null;
    var wrapper = table.closest('.table-wrap');
    var host = wrapper && wrapper.parentElement ? wrapper.parentElement : wrapper;
    if (!host) return null;
    return host.querySelector('.datatable-footer[data-table-id="' + table.id + '"]');
}

function buildDataTableFooter(table) {
    var wrapper = table.closest('.table-wrap');
    if (!wrapper) return null;

    var existing = findDataTableFooter(table);
    if (existing) return existing;

    var host =  wrapper;

    var footer = document.createElement('div');
    footer.className = 'datatable-footer';
    footer.dataset.tableId = table.id;
    footer.innerHTML = '<div class="datatable-info"></div>' +
        '<div class="datatable-controls">' +
        '<div class="datatable-page-size"><label>Rows per page:' +
        '<select class="datatable-page-size-select">' +
        '<option value="5">5</option>' +
        '<option value="10">10</option>' +
        '<option value="20">20</option>' +
        '<option value="50">50</option>' +
        '</select></label></div>' +
        '<div class="datatable-pagination"></div>' +
        '</div>';
    host.appendChild(footer);

    footer.querySelector('.datatable-page-size-select').addEventListener('change', function () {
        table.dataset.pageSize = this.value;
        table.dataset.datatablePage = '1';
        renderDataTable(table.id);
    });

    return footer;
}

function renderDataTableFooter(table, state) {
    var footer = buildDataTableFooter(table);
    if (!footer) return;

    var pageInfo = footer.querySelector('.datatable-info');
    pageInfo.textContent = state.totalRows + ' record' + (state.totalRows === 1 ? '' : 's') + ' found';

    var pagination = footer.querySelector('.datatable-pagination');
    pagination.innerHTML = '';

    function createPageBtn(label, page, disabled, active) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'datatable-page-btn';
        if (disabled) btn.classList.add('disabled');
        if (active) btn.classList.add('active');
        btn.textContent = label;
        btn.disabled = !!disabled;
        btn.addEventListener('click', function () {
            if (disabled) return;
            table.dataset.datatablePage = String(page);
            renderDataTable(table.id);
        });
        return btn;
    }

    pagination.appendChild(createPageBtn('«', 1, state.currentPage === 1, false));
    pagination.appendChild(createPageBtn('‹', Math.max(1, state.currentPage - 1), state.currentPage === 1, false));

    var startPage = Math.max(1, state.currentPage - 2);
    var endPage = Math.min(state.totalPages, startPage + 4);
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    if (startPage > 1) {
        pagination.appendChild(createPageBtn('1', 1, false, false));
        if (startPage > 2) {
            var dots = document.createElement('span');
            dots.className = 'datatable-page-dots';
            dots.textContent = '...';
            pagination.appendChild(dots);
        }
    }

    for (var i = startPage; i <= endPage; i++) {
        pagination.appendChild(createPageBtn(String(i), i, false, i === state.currentPage));
    }

    if (endPage < state.totalPages) {
        if (endPage < state.totalPages - 1) {
            var dots2 = document.createElement('span');
            dots2.className = 'datatable-page-dots';
            dots2.textContent = '...';
            pagination.appendChild(dots2);
        }
        pagination.appendChild(createPageBtn(String(state.totalPages), state.totalPages, false, false));
    }

    pagination.appendChild(createPageBtn('›', Math.min(state.totalPages, state.currentPage + 1), state.currentPage === state.totalPages, false));
    pagination.appendChild(createPageBtn('»', state.totalPages, state.currentPage === state.totalPages, false));
}

function ensureDataTableSetup(table) {
    if (!table || table.dataset.datatableSetup === '1') return;

    if (table.querySelectorAll('th.sortable').length) {
        attachTableSort(table.id);
    }
    var footer = buildDataTableFooter(table);
    if (footer) {
        var select = footer.querySelector('.datatable-page-size-select');
        if (select) {
            select.value = String(getTablePageSize(table));
        }
    }

    table.dataset.datatableSetup = '1';
}

function renderDataTable(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;

    ensureDataTableSetup(table);
    storeOriginalRowOrder(table);
    var rows = getDataTableRows(table);
    filterTableRows(table);

    var sortCol = parseInt(table.dataset.datatableSortCol, 10);
    var sortDir = table.dataset.datatableSortDir;
    var tbody = table.tBodies[0];

    if (!isNaN(sortCol) && sortDir) {
        rows = sortTable(table, sortCol, sortDir === 'asc');
    } else {
        rows.sort(function (a, b) {
            return parseInt(a.dataset.originalOrder || '0', 10) - parseInt(b.dataset.originalOrder || '0', 10);
        });
    }

    rows.forEach(function (row) { tbody.appendChild(row); });
    applyTableColumnVisibility(table);
    var state = paginateTableRows(table, rows);
    renderDataTableFooter(table, state);
}

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('table.tbl').forEach(function (table) {
        if (table.id) renderDataTable(table.id);
    });

    document.querySelectorAll('input[data-table]').forEach(function (input) {
        if (input.dataset.datatableInputAttached) return;
        input.addEventListener('keyup', function () {
            applyDataTableSearch(input.dataset.table, input.value);
        });
        input.dataset.datatableInputAttached = '1';
    });

    injectColumnChoosers(document);
    document.addEventListener('click', function (event) {
        if (!event.target.closest('.column-chooser-wrap')) {
            closeColumnChooserMenus();
        }
    });

    var columnChooserObserver = new MutationObserver(function () {
        injectColumnChoosers(document);
    });
    columnChooserObserver.observe(document.documentElement, { childList: true, subtree: true });

    initRowActionMenus();
});

window.applyDataTableSearch = applyDataTableSearch;
window.injectColumnChoosers = injectColumnChoosers;

window.buildRowActions = function (id, opts) {
    opts = opts || {};
    var showEdit = opts.showEdit !== false;
    var showDelete = opts.showDelete !== false;
    var showToggle = opts.showToggle !== false;
    var showWA = !!opts.showWA;
    var showPermission = opts.showPermission !== false;
    var showPrint = opts.showPrint !== false;
    var active = opts.active;
    var code = opts.code || '';
    var html = '<div class="row-actions">';
    html += '<button type="button" class="dots-btn" title="Actions">⋯</button>';
    html += '<div class="actions-menu hidden">';
    if (showEdit) html += '<button type="button" class="action-item btn-edit" data-permission="edit" data-id="' + id + '"><span class="action-icon p-p-pencil"></span>Edit</button>';
    if (showDelete) html += '<button type="button" class="action-item btn-delete" data-permission="delete" data-id="' + id + '"><span class="action-icon p-p-trash"></span>Delete</button>';
    if (showToggle) html += '<button type="button" class="action-item btn-toggle" data-permission="activeinactive" data-id="' + id + '" data-state="' + (active ? 'active' : 'inactive') + '"><span class="action-icon p-p-' + (active ? 'lock' : 'unlock') + '"></span>' + (active ? 'Inactive' : 'Active') + '</button>';
    if (showPermission) html += '<button type="button" class="action-item btn-role-permission" data-permission="rolepermission" data-id="' + id + '" data-code="' + code + '"><span class="action-icon p-p-cog"></span>Role Permission</button>';
    if (showPrint) html += '<button type="button" class="action-item btn-print" data-permission="print" data-id="' + id + '"><span class="action-icon" aria-hidden="true">🖨</span>Print</button>';
    if (showWA) html += '<button type="button" class="action-item btn-wa" data-id="' + id + '"><span class="action-icon p-p-phone"></span>WA</button>';
    html += '</div></div>';
    return html;
};

function closeActionMenus() {
    document.querySelectorAll('.actions-menu').forEach(function (menu) {
        menu.classList.add('hidden');
        menu.style.position = '';
        menu.style.top = '';
        menu.style.left = '';
        menu.style.right = '';
        menu.style.maxHeight = '';
        menu.scrollTop = 0;
    });
    document.querySelectorAll('.row-actions').forEach(function (row) {
        row.classList.remove('open');
    });
}

function initRowActionMenus() {
    document.addEventListener('click', function (event) {
        var actionItem = event.target.closest('.action-item');
        if (actionItem) {
            closeActionMenus();
            return;
        }

        var btn = event.target.closest('.dots-btn');
        if (!btn) {
            if (!event.target.closest('.actions-menu')) {
                closeActionMenus();
            }
            return;
        }

        event.stopPropagation();
        var row = btn.closest('.row-actions');
        var menu = btn.nextElementSibling;
        if (!menu || !menu.classList.contains('actions-menu')) return;

        var isOpen = !menu.classList.contains('hidden');
        document.querySelectorAll('.actions-menu').forEach(function (otherMenu) {
            if (otherMenu !== menu) {
                otherMenu.classList.add('hidden');
                otherMenu.style.position = '';
                otherMenu.style.top = '';
                otherMenu.style.left = '';
                otherMenu.style.right = '';
                otherMenu.style.maxHeight = '';
            }
        });

        if (isOpen) {
            menu.classList.add('hidden');
            row.classList.remove('open');
            menu.style.position = '';
            menu.style.top = '';
            menu.style.left = '';
            menu.style.right = '';
            menu.style.maxHeight = '';
            return;
        }

        row.classList.add('open');
        document.querySelectorAll('.row-actions').forEach(function (otherRow) {
            if (otherRow !== row) otherRow.classList.remove('open');
        });

        var rect = btn.getBoundingClientRect();
        var viewportWidth = window.innerWidth;
        var viewportHeight = window.innerHeight;
        var viewportGap = 12;
        var top = rect.bottom + 6;

        menu.style.position = 'fixed';
        menu.style.top = '0';
        menu.style.left = '-9999px';
        menu.style.right = 'auto';
        menu.style.maxWidth = 'calc(100vw - 24px)';
        menu.style.maxHeight = Math.max(120, viewportHeight - (viewportGap * 2)) + 'px';
        menu.scrollTop = 0;
        menu.classList.remove('hidden');
        menu.style.visibility = 'hidden';

        var menuWidth = menu.offsetWidth;
        var menuHeight = menu.offsetHeight;

        if (top + menuHeight > viewportHeight - viewportGap) {
            top = rect.top - menuHeight - 6;
        }

        top = Math.max(
            viewportGap,
            Math.min(top, viewportHeight - menuHeight - viewportGap)
        );

        var left = rect.right - menuWidth;
        left = Math.max(viewportGap, Math.min(left, viewportWidth - menuWidth - viewportGap));
        menu.style.left = left + 'px';
        menu.style.right = 'auto';

        menu.style.top = top + 'px';
        menu.style.visibility = '';
    });
}

