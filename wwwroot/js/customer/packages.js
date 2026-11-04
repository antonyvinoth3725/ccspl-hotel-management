$(document).ready(function () {
    loadPackages();

    $(document).on('input', '#packageNameSearch', function () {
        filterPackages($(this).val());
    });

    $(document).on('click', '.package-view-btn', function () {
        var packageId = Number($(this).data('package-id')) || 0;
        var packageName = String($(this).data('package-name') || 'Package');
        if (!packageId || $(this).prop('disabled')) {
            return;
        }

        $('.package-view-btn').removeClass('is-active');
        $(this).addClass('is-active');
        showPackageDetails(packageId, packageName);
    });
});

var allPackages = [];

function loadPackages() {
    $('#packageCards').html(
        '<div class="card package-loading-card">' +
        '<div class="pageloaderpanel">' +
        '<div class="spinner" aria-hidden="true"></div>' +
        '<div class="loader-text">Loading packages...</div>' +
        '</div>' +
        '</div>'
    );

    $.ajax({
        url: '/Customer/Packages/get',
        type: 'GET',
        success: function (data) { renderPackages(data); },
        error: function () { renderPackages([]); }
    });
}

function renderPackages(packages) {
    allPackages = Array.isArray(packages) ? packages : [];
    renderPackageCards(allPackages, '');
}

function filterPackages(searchTerm) {
    var normalizedSearch = String(searchTerm || '').trim().toLowerCase();
    var filteredPackages = allPackages.filter(function (item) {
        var packageName = String(item.name || item.Name || '');
        return packageName.toLowerCase().indexOf(normalizedSearch) !== -1;
    });

    renderPackageCards(filteredPackages, normalizedSearch);
}

function renderPackageCards(packages, searchTerm) {
    var html = '';
    if (!Array.isArray(packages) || packages.length === 0) {
        html = '<div class="card package-empty-card"><p class="muted">' +
            (searchTerm ? 'No packages found for "' + escapePackageHtml(searchTerm) + '".' : 'No packages available right now. Please check back later.') +
            '</p></div>';
    } else {
        html = packages.map(function (item) {
            var price = parseFloat(item.price || item.Price || 0) || 0;
            var description = item.description || item.Description || 'A catering package with event setup options.';
            var packageName = item.name || item.Name || 'Package';
            var packageId = parseInt(item.id || item.Id, 10) || 0;
            var isActive = item.isActive === '1' || item.isActive === 'true' || item.isActive === true || item.IsActive === '1' || item.IsActive === 'true' || item.IsActive === true;
            var buttonClass = isActive ? 'btn-primary' : 'btn-light disabled';
            var buttonText = isActive ? 'View' : 'Unavailable';

            return '<article class="preset-card' + (isActive ? '' : ' muted') + '">' +
                '<div class="preset-name">' + escapePackageHtml(packageName) + '</div>' +
                '<div class="preset-price"><span class="preset-currency">S$</span>' + price.toFixed(2) + ' <span>/ pax</span></div>' +
                '<div class="preset-description" title="' + escapePackageHtml(description) + '">' + escapePackageHtml(description) + '</div>' +
                '<button type="button" data-package-id="' + packageId + '" data-package-name="' + escapePackageHtml(packageName) + '" class="btn ' + buttonClass + ' btn-sm preset-action package-view-btn"' + (isActive ? '' : ' disabled') + '>' + buttonText + '</button>' +
                '</article>';
        }).join('');
    }
    $('#packageCards').html(html);
}

function showPackageDetails(packageId, packageName) {
    if (!packageId) return;

    $('#packageDetailTitle').text(packageName);
    $('#packageDetailMeta').html('<span class="meta-pill">Loading...</span>');
    $('#packageDetailContent').html(buildDetailsSkeleton());
    $('#packageSidebar').addClass('is-open');

    $.getJSON('/Customer/Packages/GetFixedMenusByPackageId', { packageId: packageId }).done(function (items) {
        renderPackageDetails(items);
    }).fail(function () {
        $('#packageDetailMeta').html('<span class="meta-pill">Unavailable</span>');
        $('#packageDetailContent').html('<div class="package-detail-status error">Unable to load this package menu.</div>');
    });
}

function renderPackageDetails(items) {
    items = Array.isArray(items) ? items : [];

    if (!items.length) {
        $('#packageDetailMeta').html('<span class="meta-pill">0 categories</span><span class="meta-pill">0 items</span>');
        $('#packageDetailContent').html('<div class="package-detail-status">No menu items are configured for this package.</div>');
        return;
    }

    var groupedCategories = [];
    var categoryMap = {};
    var menuCount = 0;
    var cardsHtml = '';

    items.forEach(function (item) {
        var categoryId = Number(item.categoryId || item.CategoryId || 0);
        var categoryName = String(item.categoryName || item.CategoryName || 'Category');
        var menuId = Number(item.foodMenuId || item.FoodMenuId || 0);
        var menuName = String(item.foodMenuName || item.FoodMenuName || '');

        if (!categoryId && !categoryName) {
            return;
        }

        if (!categoryMap[categoryId]) {
            categoryMap[categoryId] = {
                categoryId: categoryId,
                categoryName: categoryName,
                menus: []
            };
            groupedCategories.push(categoryMap[categoryId]);
        }

        categoryMap[categoryId].menus.push({
            id: menuId,
            name: menuName,
            price: Number(item.foodMenuPrice || item.FoodMenuPrice || 0) || 0
        });
        menuCount += 1;
    });

    if (!groupedCategories.length) {
        $('#packageDetailMeta').html('<span class="meta-pill">0 categories</span><span class="meta-pill">0 items</span>');
        $('#packageDetailContent').html('<div class="package-detail-status">No menu items are configured for this package.</div>');
        return;
    }

    groupedCategories.forEach(function (category, index) {
        var menus = category.menus || [];

        cardsHtml += '<section class="package-category-card" style="--stagger:' + index + '">' +
            '<div class="package-category-head">' +
            '<h3>' + escapePackageHtml(category.categoryName) + '</h3>' +
            '<span class="category-count">' + menus.length + ' item' + (menus.length === 1 ? '' : 's') + '</span>' +
            '</div><ul>';
        if (menus.length) {
            menus.forEach(function (menu) {
                cardsHtml += '<li>' + escapePackageHtml(menu.name) + (menu.price > 0 ? ' <span style="color:var(--orange);font-weight:700">S$' + menu.price.toFixed(2) + '</span>' : '') + '</li>';
            });
        } else {
            cardsHtml += '<li class="empty">No menu items available.</li>';
        }
        cardsHtml += '</ul></section>';
    });

    var html = '<div class="package-category-grid">' + cardsHtml + '</div>';

    $('#packageDetailMeta').html(
        '<span class="meta-pill">' + groupedCategories.length + ' categor' + (groupedCategories.length === 1 ? 'y' : 'ies') + '</span>' +
        '<span class="meta-pill">' + menuCount + ' menu item' + (menuCount === 1 ? '' : 's') + '</span>'
    );
    $('#packageDetailContent').html(html);
}

function buildDetailsSkeleton() {
    var blocks = [0, 1, 2].map(function () {
        return '<section class="details-skeleton-card">' +
            '<div class="details-skeleton-head shimmer"></div>' +
            '<div class="details-skeleton-lines">' +
            '<span class="shimmer"></span>' +
            '<span class="shimmer"></span>' +
            '<span class="shimmer short"></span>' +
            '</div>' +
            '</section>';
    }).join('');

    return '<div class="details-skeleton-wrap" aria-hidden="true">' + blocks + '</div>';
}

function escapePackageHtml(value) {
    return $('<div>').text(value || '').html();
}
