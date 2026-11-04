(function () {
    var scriptLoadPromises = {};
    var EXPORT_SCOPE = {
        CURRENT_PAGE: 'current-page',
        FILTERED: 'filtered'
    };

    function getTableById(tableId) {
        return tableId ? document.getElementById(tableId) : null;
    }

    function getDefaultExportName(table) {
        var page = toPlainText(document.body.getAttribute('data-page'));
        var title = toPlainText(document.title);
        var source = page || title || 'Export';

        // Keep only the page-level portion of the title (e.g., "Quotations - Gayatri Catering" -> "Quotations").
        var root = source.split(/\s[-|]\s|\s[–—]\s/)[0] || source;
        var cleaned = toPlainText(root).replace(/[\\/:*?"<>|]/g, '').trim();
        return cleaned || 'Export';
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function toPlainText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function sanitizeToken(value) {
        return String(value || 'table').replace(/[^a-zA-Z0-9_-]/g, '-');
    }

    function loadScriptOnce(key, src) {
        if (scriptLoadPromises[key]) {
            return scriptLoadPromises[key];
        }

        scriptLoadPromises[key] = new Promise(function (resolve, reject) {
            var existing = document.querySelector('script[data-export-lib="' + key + '"]');
            if (existing) {
                if (existing.dataset.loaded === '1') {
                    resolve();
                    return;
                }
                existing.addEventListener('load', function () { resolve(); }, { once: true });
                existing.addEventListener('error', function () { reject(new Error('Unable to load export dependency.')); }, { once: true });
                return;
            }

            var script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.dataset.exportLib = key;
            script.addEventListener('load', function () {
                script.dataset.loaded = '1';
                resolve();
            }, { once: true });
            script.addEventListener('error', function () {
                reject(new Error('Unable to load export dependency.'));
            }, { once: true });
            document.head.appendChild(script);
        });

        return scriptLoadPromises[key];
    }

    function isNodeHidden(node) {
        if (!node) return true;
        if (node.classList && node.classList.contains('hidden')) return true;
        var style = window.getComputedStyle(node);
        return style.display === 'none' || style.visibility === 'hidden';
    }

    function getExportData(table, options) {
        if (!table) return { headers: [], rows: [], columnTypes: [] };

        var scope = (options && options.scope) || EXPORT_SCOPE.FILTERED;

        var headerRow = table.tHead && table.tHead.rows && table.tHead.rows.length ? table.tHead.rows[0] : null;
        if (!headerRow) return { headers: [], rows: [], columnTypes: [] };

        var visibleColumnIndexes = [];
        var headers = [];
        var columnTypes = [];

        function isActionColumn(headerText, headerCell) {
            var normalized = toPlainText(headerText).toLowerCase();
            if (normalized === 'action' || normalized === 'actions') return true;
            if (!headerCell) return false;
            var cls = String(headerCell.className || '').toLowerCase();
            return cls.indexOf('action') > -1;
        }

        Array.prototype.slice.call(headerRow.cells || []).forEach(function (cell, index) {
            if (isNodeHidden(cell)) return;
            var headerText = toPlainText(cell.textContent);
            if (!headerText) return;
            if (isActionColumn(headerText, cell)) return;
            visibleColumnIndexes.push(index);
            headers.push(headerText);
            columnTypes.push(toPlainText(cell.getAttribute('data-export-type') || 'text').toLowerCase());
        });

        if (!headers.length) return { headers: [], rows: [], columnTypes: [] };

        var bodyRows = Array.prototype.slice.call((table.tBodies[0] && table.tBodies[0].rows) || []);
        var filteredRows = bodyRows.filter(function (row) {
            if (row.dataset && row.dataset.datatableMatch !== undefined) {
                return row.dataset.datatableMatch === '1';
            }
            return !isNodeHidden(row);
        });

        if (scope === EXPORT_SCOPE.CURRENT_PAGE) {
            filteredRows = filteredRows.filter(function (row) {
                return !isNodeHidden(row);
            });
        }

        var rows = filteredRows.map(function (row) {
            var values = [];
            visibleColumnIndexes.forEach(function (colIndex) {
                var cell = row.cells[colIndex];
                if (!cell || isNodeHidden(cell)) {
                    values.push('');
                    return;
                }
                values.push(toPlainText(cell.innerText || cell.textContent || ''));
            });
            return values;
        });

        return { headers: headers, rows: rows, columnTypes: columnTypes };
    }

    function normalizeExportType(typeName) {
        var value = String(typeName || '').toLowerCase();
        if (value === 'int' || value === 'integer' || value === 'decimal' || value === 'numeric' || value === 'number' || value === 'currency' || value === 'money') {
            return 'number';
        }
        if (value === 'date' || value === 'datetime') {
            return value;
        }
        return 'text';
    }

    function parseNumberLike(value) {
        var text = toPlainText(value);
        if (!text) return null;
        var normalized = text.replace(/,/g, '').replace(/[^0-9.\-]/g, '');
        if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') return null;
        var num = Number(normalized);
        return Number.isFinite(num) ? num : null;
    }

    function downloadBlob(blob, fileName) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
    }

    function escapeCsvCell(value) {
        var text = String(value ?? '');
        if (/[",\n\r]/.test(text)) {
            return '"' + text.replace(/"/g, '""') + '"';
        }
        return text;
    }

    function getScopeLabel(scope) {
        return scope === EXPORT_SCOPE.CURRENT_PAGE ? 'Current page' : 'All filtered rows';
    }

    function getVisibleDateInputs() {
        var inputs = Array.prototype.slice.call(document.querySelectorAll('input[type="date"], input[type="datetime-local"]'));
        return inputs.filter(function (input) {
            if (!input || isNodeHidden(input)) return false;
            return !!toPlainText(input.value);
        });
    }

    function getExportDateRangeLabel() {
        var visibleDateInputs = getVisibleDateInputs();
        if (!visibleDateInputs.length) return 'All dates';

        var values = visibleDateInputs.map(function (input) {
            return toPlainText(input.value);
        }).filter(Boolean);

        if (!values.length) return 'All dates';
        if (values.length === 1) return values[0];
        return values[0] + ' to ' + values[1];
    }

    function readLogoImageDataUrl() {
        var logo = document.querySelector('.navbar-brand img, .nav-logo img, .brand-logo img, img[alt*="logo" i]');
        if (!logo || !logo.complete || !logo.naturalWidth) {
            return Promise.resolve(null);
        }

        return new Promise(function (resolve) {
            try {
                var canvas = document.createElement('canvas');
                var maxWidth = 180;
                var scale = Math.min(1, maxWidth / logo.naturalWidth);
                var width = Math.max(1, Math.round(logo.naturalWidth * scale));
                var height = Math.max(1, Math.round(logo.naturalHeight * scale));

                canvas.width = width;
                canvas.height = height;

                var context = canvas.getContext('2d');
                context.drawImage(logo, 0, 0, width, height);

                resolve({
                    dataUrl: canvas.toDataURL('image/png'),
                    width: width,
                    height: height
                });
            } catch (_error) {
                resolve(null);
            }
        });
    }

    function ensureXlsx() {
        if (window.XLSX) return Promise.resolve();
        return loadScriptOnce('xlsx', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    }

    function ensurePdfLibraries() {
        var needJsPdf = !window.jspdf || !window.jspdf.jsPDF;
        var needAutoTable = !window.jspdf || !window.jspdf.jsPDF || !window.jspdf.jsPDF.API || !window.jspdf.jsPDF.API.autoTable;
        var tasks = [];

        if (needJsPdf) {
            tasks.push(loadScriptOnce('jspdf', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'));
        }

        if (needAutoTable) {
            tasks.push(loadScriptOnce('jspdf-autotable', 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js'));
        }

        return Promise.all(tasks);
    }

    function setMenuButtonBusy(button, busy, text) {
        if (!button) return;
        if (busy) {
            if (!button.dataset.defaultLabel) {
                var labelNode = button.querySelector('.export-menu-label');
                button.dataset.defaultLabel = labelNode ? labelNode.textContent : button.textContent;
            }
            button.disabled = true;
            var target = button.querySelector('.export-menu-label');
            if (target) {
                target.textContent = text || 'Working...';
            }
            return;
        }

        button.disabled = false;
        var resetTarget = button.querySelector('.export-menu-label');
        if (resetTarget && button.dataset.defaultLabel) {
            resetTarget.textContent = button.dataset.defaultLabel;
        }
    }

    function fallbackExportTableToXls(headers, rows, fileName) {
        var htmlRows = rows.map(function (row) {
            return '<tr>' + row.map(function (cell) {
                return '<td>' + escapeHtml(cell) + '</td>';
            }).join('') + '</tr>';
        }).join('');

        var html = '<html><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr>' +
            headers.map(function (h) { return '<th>' + escapeHtml(h) + '</th>'; }).join('') +
            '</tr></thead><tbody>' + htmlRows + '</tbody></table></body></html>';

        var blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        downloadBlob(blob, fileName + '.xls');
    }

    function exportTableToCsv(tableId, fileName, options) {
        var table = getTableById(tableId);
        if (!table) {
            showToast('Table not found for export.', 2500, { type: 'error', title: 'Export failed' });
            return;
        }

        var exportData = getExportData(table, options);
        var headers = exportData.headers;
        var rows = exportData.rows;
        var columnTypes = (exportData.columnTypes || []).map(normalizeExportType);
        var safeName = fileName || getDefaultExportName(table);

        if (!headers.length || !rows.length) {
            showToast('No data available to export.', 2500, { type: 'warning', title: 'Export' });
            return;
        }

        var lines = [];
        lines.push(headers.map(escapeCsvCell).join(','));
        rows.forEach(function (row) {
            lines.push(row.map(escapeCsvCell).join(','));
        });

        var csv = '\uFEFF' + lines.join('\r\n');
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, safeName + '.csv');
    }

    async function exportTableToExcel(tableId, fileName, options) {
        var table = getTableById(tableId);
        if (!table) {
            showToast('Table not found for export.', 2500, { type: 'error', title: 'Export failed' });
            return;
        }

        var exportData = getExportData(table, options);
        var headers = exportData.headers;
        var rows = exportData.rows;
        var safeName = fileName || getDefaultExportName(table);

        if (!headers.length || !rows.length) {
            showToast('No data available to export.', 2500, { type: 'warning', title: 'Export' });
            return;
        }

        try {
            await ensureXlsx();
            if (!window.XLSX) {
                throw new Error('xlsx library missing');
            }

            var typedRows = rows.map(function (row) {
                return row.map(function (cell, index) {
                    var colType = columnTypes[index] || 'text';
                    if (colType !== 'number') return cell;
                    var parsed = parseNumberLike(cell);
                    return parsed === null ? cell : parsed;
                });
            });

            var aoa = [headers].concat(typedRows);
            var ws = window.XLSX.utils.aoa_to_sheet(aoa);
            ws['!cols'] = headers.map(function (header, index) {
                var maxLen = typedRows.reduce(function (len, row) {
                    return Math.max(len, String((row && row[index]) || '').length);
                }, String(header || '').length);
                return { wch: Math.min(Math.max(maxLen + 2, 10), 48) };
            });

            var wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, 'Export');
            window.XLSX.writeFile(wb, safeName + '.xlsx');
        } catch (_error) {
            fallbackExportTableToXls(headers, rows, safeName);
        }
    }

    function fallbackExportTableToPdf(table, fileName) {
        var printWindow = window.open('', '_blank', 'width=1100,height=900');
        if (!printWindow) {
            showToast('Unable to open print window.', 2500, { type: 'error', title: 'Export failed' });
            return;
        }

        var title = fileName || getDefaultExportName(table);
        var printTable = table ? table.cloneNode(true) : null;
        if (printTable) {
            printTable.removeAttribute('id');
            printTable.removeAttribute('style');
        }
        printWindow.document.write('<html><head><title>' + title + '</title>');
        printWindow.document.write('<style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#111;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:8px;text-align:left;} th{background:#f3f4f6;}</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<h2>' + title + '</h2>');
        printWindow.document.write(printTable ? printTable.outerHTML : '');
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    async function exportTableToPdf(tableId, fileName, options) {
        var table = getTableById(tableId);
        if (!table) {
            showToast('Table not found for export.', 2500, { type: 'error', title: 'Export failed' });
            return;
        }

        var exportData = getExportData(table, options);
        var headers = exportData.headers;
        var rows = exportData.rows;
        var columnTypes = (exportData.columnTypes || []).map(normalizeExportType);
        var safeName = fileName || getDefaultExportName(table);
        var scope = (options && options.scope) || EXPORT_SCOPE.FILTERED;

        if (!headers.length || !rows.length) {
            showToast('No data available to export.', 2500, { type: 'warning', title: 'Export' });
            return;
        }

        try {
            await ensurePdfLibraries();
            if (!window.jspdf || !window.jspdf.jsPDF) {
                throw new Error('jsPDF unavailable');
            }

            var jsPdfFactory = window.jspdf.jsPDF;
            var doc = new jsPdfFactory('l', 'pt', 'a4');
            var pageWidth = doc.internal.pageSize.getWidth();
            var brandingLogo = await readLogoImageDataUrl();
            var titleText = String(safeName || 'Export');
            var startY = 48;

            if (brandingLogo && brandingLogo.dataUrl) {
                doc.addImage(brandingLogo.dataUrl, 'PNG', 40, 18, brandingLogo.width, brandingLogo.height);
                startY = Math.max(startY, 22 + brandingLogo.height);
            }

            doc.setFontSize(14);
            doc.setTextColor(20, 35, 28);
            doc.text(titleText, 40, startY + 12);

            doc.setFontSize(9);
            doc.setTextColor(92, 103, 118);
            doc.text('Scope: ' + getScopeLabel(scope), 40, startY + 28);
            doc.text('Date range: ' + getExportDateRangeLabel(), 40, startY + 42);
            doc.text('Generated: ' + new Date().toLocaleString(), 40, startY + 56);

            var tableStartY = startY + 72;

            if (typeof doc.autoTable === 'function') {
                var columnStyles = {};
                columnTypes.forEach(function (colType, colIndex) {
                    if (colType === 'number') {
                        columnStyles[colIndex] = { halign: 'right' };
                        return;
                    }
                    if (colType === 'date' || colType === 'datetime') {
                        columnStyles[colIndex] = { halign: 'center' };
                    }
                });

                doc.autoTable({
                    head: [headers],
                    body: rows,
                    startY: tableStartY,
                    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
                    headStyles: { fillColor: [31, 122, 74], textColor: 255 },
                    theme: 'grid',
                    margin: { left: 24, right: 24 },
                    columnStyles: columnStyles
                });
            } else {
                // If autotable plugin is unavailable, fallback to print export.
                throw new Error('autoTable unavailable');
            }

            var footerText = 'Generated on ' + new Date().toLocaleString();
            doc.setFontSize(8);
            doc.setTextColor(90);
            doc.text(footerText, pageWidth - 180, doc.internal.pageSize.getHeight() - 16);
            doc.save(safeName + '.pdf');
        } catch (_error) {
            fallbackExportTableToPdf(table, safeName);
        }
    }

    function closeExportMenus() {
        document.querySelectorAll('.export-menu.open').forEach(function (menu) {
            menu.classList.remove('open');
            menu.classList.add('hidden');
        });
    }

    function getSelectedExportScope(wrapper) {
        if (!wrapper) return EXPORT_SCOPE.FILTERED;
        var selected = wrapper.querySelector('.js-export-scope:checked');
        return selected && selected.value ? selected.value : EXPORT_SCOPE.FILTERED;
    }

    function buildExportMenu(tableId) {
        var safeTableToken = sanitizeToken(tableId || 'table');
        var scopeName = 'exportScope_' + safeTableToken;
        var excelIcon = '' +
            '<svg class="export-menu-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path d="M6 3.5h7.1L18 8.4V20.5a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2Z" fill="#1a6e3c" opacity=".14" />' +
            '<path d="M13.1 3.5V8.4H18" fill="none" stroke="#1a6e3c" stroke-width="1.5" stroke-linejoin="round" />' +
            '<path d="M6 3.5h7.1L18 8.4V20.5a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2Z" fill="none" stroke="#1a6e3c" stroke-width="1.4" stroke-linejoin="round" />' +
            '<path d="M8 11.2h8M8 14.2h8M8 17.2h8" stroke="#1a6e3c" stroke-width="1.3" stroke-linecap="round" />' +
            '<path d="M9 10.1h2.1l.9 1.9.9-1.9H15l-1.8 2.8 1.9 3.1H13l-1-1.8-1 1.8H9l1.9-3.1-1.9-2.8Z" fill="#1a6e3c" />' +
            '</svg>';

        var pdfIcon = '' +
            '<svg class="export-menu-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path d="M6 3.5h7.1L18 8.4V20.5a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2Z" fill="#b91c1c" opacity=".12" />' +
            '<path d="M13.1 3.5V8.4H18" fill="none" stroke="#b91c1c" stroke-width="1.5" stroke-linejoin="round" />' +
            '<path d="M6 3.5h7.1L18 8.4V20.5a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2Z" fill="none" stroke="#b91c1c" stroke-width="1.4" stroke-linejoin="round" />' +
            '<path d="M8.2 16.9V9.9H11c1.7 0 2.8 1 2.8 2.6S12.7 15 11 15h-1v1.9H8.2Zm1.8-3.4h.7c.6 0 1-.4 1-1s-.4-1-1-1h-.7v2Zm3.6 3.4V9.9h2.4c2 0 3.2 1.1 3.2 3.2s-1.2 3.2-3.2 3.2h-2.4Zm1.6-1.4h.7c1 0 1.6-.6 1.6-1.8s-.6-1.8-1.6-1.8h-.7v3.6Zm4.5 1.4V9.9H20v1.3h-2.2v1.1h1.9v1.3h-1.9v2.6h-1.6Z" fill="#b91c1c" />' +
            '</svg>';

        var csvIcon = '' +
            '<svg class="export-menu-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path d="M6 3.5h7.1L18 8.4V20.5a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2Z" fill="#0f766e" opacity=".12" />' +
            '<path d="M13.1 3.5V8.4H18" fill="none" stroke="#0f766e" stroke-width="1.5" stroke-linejoin="round" />' +
            '<path d="M6 3.5h7.1L18 8.4V20.5a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2Z" fill="none" stroke="#0f766e" stroke-width="1.4" stroke-linejoin="round" />' +
            '<path d="M7.8 13.8c0-1.9 1.2-3.2 3.1-3.2.9 0 1.7.3 2.3 1l-1 1.1c-.3-.3-.7-.5-1.2-.5-1 0-1.6.7-1.6 1.7 0 1.1.6 1.8 1.6 1.8.5 0 .9-.2 1.2-.5l1 1c-.6.7-1.4 1-2.3 1-1.9 0-3.1-1.3-3.1-3.4Zm6.1 3.2v-6.3h1.7V17h-1.7Zm2.7 0v-6.3H20v1.4h-1.8v1.1h1.6v1.3h-1.6V17h-1.6Z" fill="#0f766e" />' +
            '</svg>';

        var wrapper = document.createElement('div');
        wrapper.className = 'export-menu-wrap';
        wrapper.innerHTML = '' +
            '<button type="button" class="btn btn-light btn-export js-export-trigger" data-permission="download">' +
            '<span class="export-trigger-icon" aria-hidden="true">⭳</span>' +
            '<span class="export-trigger-label">Export</span>' +
            '</button>' +
            '<div class="export-menu hidden">' +
            '<div class="export-menu-header">' +
            '<div class="export-menu-title">Export data</div>' +
            '<div class="export-menu-subtitle">Choose the format that fits your workflow.</div>' +
            '<div class="export-scope-group" role="radiogroup" aria-label="Export scope">' +
            '<label class="export-scope-option">' +
            '<input class="js-export-scope" type="radio" name="' + scopeName + '" value="' + EXPORT_SCOPE.FILTERED + '" checked>' +
            '<span>All filtered rows</span>' +
            '</label>' +
            '<label class="export-scope-option">' +
            '<input class="js-export-scope" type="radio" name="' + scopeName + '" value="' + EXPORT_SCOPE.CURRENT_PAGE + '">' +
            '<span>Current page</span>' +
            '</label>' +
            '</div>' +
            '</div>' +
            '<button type="button" class="export-menu-item js-export-excel" aria-label="Export as Excel">' +
            '<span class="export-menu-icon export-menu-icon-excel" aria-hidden="true">' + excelIcon + '</span>' +
            '<span class="export-menu-item-text">' +
            '<span class="export-menu-label">Excel</span>' +
            '<span class="export-menu-help">Spreadsheet format</span>' +
            '</span>' +
            '</button>' +
            '<button type="button" class="export-menu-item js-export-csv" aria-label="Export as CSV">' +
            '<span class="export-menu-icon export-menu-icon-csv" aria-hidden="true">' + csvIcon + '</span>' +
            '<span class="export-menu-item-text">' +
            '<span class="export-menu-label">CSV</span>' +
            '<span class="export-menu-help">Lightweight data format</span>' +
            '</span>' +
            '</button>' +
            '<button type="button" class="export-menu-item js-export-pdf" aria-label="Export as PDF">' +
            '<span class="export-menu-icon export-menu-icon-pdf" aria-hidden="true">' + pdfIcon + '</span>' +
            '<span class="export-menu-item-text">' +
            '<span class="export-menu-label">PDF</span>' +
            '<span class="export-menu-help">Print-ready document</span>' +
            '</span>' +
            '</button>' +
            '</div>';

        var toggle = wrapper.querySelector('.js-export-trigger');
        var menu = wrapper.querySelector('.export-menu');

        toggle.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            closeExportMenus();
            menu.classList.toggle('hidden');
            menu.classList.toggle('open');
        });

        wrapper.querySelector('.js-export-excel').addEventListener('click', async function (e) {
            e.preventDefault();
            e.stopPropagation();

            var button = this;
            var scope = getSelectedExportScope(wrapper);
            setMenuButtonBusy(button, true, 'Exporting...');
            try {
                await exportTableToExcel(tableId, null, { scope: scope });
            } finally {
                setMenuButtonBusy(button, false);
                closeExportMenus();
            }
        });

        wrapper.querySelector('.js-export-csv').addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            var button = this;
            var scope = getSelectedExportScope(wrapper);
            setMenuButtonBusy(button, true, 'Exporting...');
            try {
                exportTableToCsv(tableId, null, { scope: scope });
            } finally {
                setMenuButtonBusy(button, false);
                closeExportMenus();
            }
        });

        wrapper.querySelector('.js-export-pdf').addEventListener('click', async function (e) {
            e.preventDefault();
            e.stopPropagation();

            var button = this;
            var scope = getSelectedExportScope(wrapper);
            setMenuButtonBusy(button, true, 'Exporting...');
            try {
                await exportTableToPdf(tableId, null, { scope: scope });
            } finally {
                setMenuButtonBusy(button, false);
                closeExportMenus();
            }
        });

        return wrapper;
    }

    function injectExportMenus(root) {
        var scope = root || document;
        var actionBars = scope.querySelectorAll('.page-header-actions, .panel-actions');

        actionBars.forEach(function (bar) {
            if (bar.querySelector('.export-menu-wrap')) return;

            var search = bar.querySelector('.tbl-search[data-table]');
            if (!search) return;

            var tableId = search.getAttribute('data-table') || '';
            if (!tableId) return;

            var addButton = bar.querySelector('.btn-add');
            var afterExportButton = bar.querySelector('.btn-toolbar-after-export');
            var exportNode = buildExportMenu(tableId);
            if (addButton) {
                bar.insertBefore(exportNode, addButton);
            } else if (afterExportButton) {
                bar.insertBefore(exportNode, afterExportButton);
            } else {
                bar.appendChild(exportNode);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        injectExportMenus(document);
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.export-menu-wrap')) {
            closeExportMenus();
        }
    });

    var exportObserver = new MutationObserver(function () {
        injectExportMenus(document);
    });

    exportObserver.observe(document.documentElement, { childList: true, subtree: true });

    window.exportTableToExcel = exportTableToExcel;
    window.exportTableToCsv = exportTableToCsv;
    window.exportTableToPdf = exportTableToPdf;
    window.injectExportMenus = injectExportMenus;
})();