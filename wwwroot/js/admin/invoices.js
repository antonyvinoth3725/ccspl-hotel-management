$(function () {
    var data = [
        { invoice: 'INV-2024-024', order: 'GC-2024-024', customer: 'Raj Kumar', amount: 10500, paid: 5250 },
        { invoice: 'INV-2024-023', order: 'GC-2024-023', customer: 'Priya Nair', amount: 1800, paid: 1800 },
        { invoice: 'INV-2024-022', order: 'GC-2024-022', customer: 'Anand Corp', amount: 2400, paid: 2400 },
        { invoice: 'INV-2024-020', order: 'GC-2024-020', customer: 'Suresh Babu', amount: 750, paid: 0 }
    ];

    loadInvoices();

    function loadInvoices() {
        $.get('/Admin/Invoices/get').done(function (rows) {
            render(rows);
        }).fail(function () {
            render(data);
        });
    }

    function render(rows) {
        var html = '<table class="tbl"><thead><tr><th>Invoice</th><th>Order</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Actions</th></tr></thead><tbody>';
        rows.forEach(function (row) {
            var balance = (row.amount || 0) - (row.paid || 0);
            html += '<tr><td><strong>' + row.invoice + '</strong></td><td>' + row.order + '</td><td>' + row.customer + '</td>' +
                '<td class="num">S$' + (row.amount || 0).toLocaleString() + '</td>' +
                '<td class="num">S$' + (row.paid || 0).toLocaleString() + '</td>' +
                '<td class="num"><strong style="color:' + (balance > 0 ? 'var(--red)' : 'var(--green)') + '">S$' + balance.toLocaleString() + '</strong></td>' +
                '<td><button class="btn btn-light btn-xs js-print-invoice">Print</button></td></tr>';
        });
        html += '</tbody></table>';
        $('#invoicesTable').html(html);
    }

    $(document).on('click', '.js-print-invoice', function () {
        window.print();
    });
});