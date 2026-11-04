$(function () {
    var items = [
        { id: 1, name: 'Basmati Rice', cat: 'Rice & Breads', price: 2.50, type: 'Veg', active: true },
        { id: 2, name: 'Paneer Butter Masala', cat: 'Vegetarian', price: 5.00, type: 'Veg', active: true },
        { id: 3, name: 'Chicken Masala', cat: 'Non-Vegetarian', price: 6.00, type: 'Non-Veg', active: true },
        { id: 4, name: 'Gulab Jamun', cat: 'Desserts', price: 2.50, type: 'Veg', active: true },
        { id: 5, name: 'Masala Chai', cat: 'Drinks', price: 1.50, type: 'Veg', active: true }
    ];

    loadMenuItems();

    function loadMenuItems() {
        $.get('/Admin/Menus/get').done(function (rows) {
            render(rows);
        }).fail(function () {
            render(items);
        });
    }

    function render(rows) {
        rows = rows || [];
        var html = '<table class="tbl" id="menuTbl"><thead><tr><th>Name</th><th>Category</th><th>Type</th><th class="num">Price/pax</th><th>Active</th><th>Actions</th></tr></thead><tbody>';
        rows.forEach(function (row) {
            var name = row.name || row.Name || 'Unnamed';
            var cat = row.cat || row.Cat || row.Category || 'General';
            var type = row.type || row.Type || 'Veg';
            var price = parseFloat(row.price || row.Price || 0) || 0;
            var active = row.active === true || row.active === '1' || row.active === 'true' || row.IsActive === '1' || row.IsActive === 'true';
            html += '<tr><td><strong>' + name + '</strong></td><td>' + cat + '</td>' +
                '<td><span class="badge ' + (type === 'Veg' ? 'badge-confirmed' : 'badge-cancelled') + '">' + type + '</span></td>' +
                '<td class="num">S$' + price.toFixed(2) + '</td>' +
                '<td><span class="badge ' + (active ? 'badge-confirmed' : 'badge-cancelled') + '">' + (active ? 'Active' : 'Inactive') + '</span></td>' +
                '<td>' + window.buildRowActions(row.id || row.Id || '', { active: active }) + '</td></tr>';
        });
        html += '</tbody></table>';
        $('#menuTable').html(html);
    }

    $('#btnAddMenu').on('click', function () {
        $('#addMenuModal').removeClass('hidden');
    });

    $('.modal-close').on('click', function () {
        $('#addMenuModal').addClass('hidden');
    });

    $('#btnSaveMenu').on('click', function () {
        var name = $('#newItemName').val().trim();
        if (!name) {
            showToast('Item name required');
            return;
        }

        var payload = {
            name: name,
            cat: $('#newItemCat').val(),
            price: $('#newItemPrice').val(),
            type: $('#newItemType').val()
        };

        $.ajax({
            url: '/Admin/Menus/save',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload)
        }).done(function () {
            showToast('Item added');
            $('#addMenuModal').addClass('hidden');
            loadMenuItems();
        }).fail(function () {
            showToast('Item added (demo)');
            $('#addMenuModal').addClass('hidden');
        });
    });

    $('#menuSearch').on('keyup', function () {
        var value = $(this).val().toLowerCase();
        $('#menuTbl tbody tr').each(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
        });
    });

    $('#catFilter').on('change', function () {
        var value = $(this).val().toLowerCase();
        $('#menuTbl tbody tr').each(function () {
            $(this).toggle(!value || $(this).text().toLowerCase().indexOf(value) > -1);
        });
    });
});