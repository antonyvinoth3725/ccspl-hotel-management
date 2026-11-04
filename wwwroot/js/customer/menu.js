// ===== CUSTOMER MENU =====
$(function () {
    loadCategoryMenus();

    function loadCategoryMenus() {
        $('#menuSections').html(buildMenuLoadingState());

        $.getJSON('/Customer/Menu/get').done(function (categories) {
            renderCategoryMenus(Array.isArray(categories) ? categories : []);
        }).fail(function () {
            $('#menuSections').html('<div class="card"><p class="muted">Unable to load menu items right now.</p></div>');
        });
    }

    function renderCategoryMenus(categories) {
        if (!categories.length) {
            $('#menuSections').html('<div class="card"><p class="muted">No menu items are available right now.</p></div>');
            return;
        }

        var html = '<div class="menu-sections">';
        categories.forEach(function (category) {
            var items = Array.isArray(category.items) ? category.items : [];
            var itemCount = items.length;
            html += '<section class="menu-section-card">' +
                '<div class="menu-section-header">' +
                '<div class="menu-section-title">' + escapeMenuHtml(category.name) + '</div>' +
                '<span class="menu-item-count">' + itemCount + '</span>' +
                '</div>' +
                '<div class="category-menu-list">';

            items.forEach(function (item) {
                var foodTypeBadge = buildFoodTypeBadge(item.foodType);
                var price = item.price ? 'S$' + formatPrice(item.price) : '';
                html += '<div class="category-menu-item">' +
                    '<div class="menu-item-main">' +
                    '<div class="menu-item-name">' + escapeMenuHtml(item.name) + '</div>' +
                    '<div class="menu-item-meta">' + foodTypeBadge + '</div>' +
                    '</div>' +
                    '<div class="menu-item-price">' + price + '</div>' +
                    '</div>';
            });

            html += '</div></section>';
        });
        html += '</div>';
        $('#menuSections').html(html);
        
        // Add scroll indicator for scrollable lists
        addScrollIndicators();
    }

    function addScrollIndicators() {
        $('.category-menu-list').each(function () {
            var list = $(this);
            var isScrollable = this.scrollHeight > this.clientHeight;
            
            if (isScrollable) {
                list.addClass('is-scrollable');
            }
        });
    }

    function buildFoodTypeBadge(foodType) {
        if (foodType === 1) return '<span class="food-type-badge veg">🥗 Veg</span>';
        if (foodType === 2) return '<span class="food-type-badge non-veg">🍗 Non-Veg</span>';
        return '<span class="food-type-badge other">•</span>';
    }

    function formatPrice(price) {
        var num = parseFloat(price);
        return isNaN(num) ? price : num.toFixed(2);
    }

    function buildMenuLoadingState() {
        return '<div class="card menu-loading-card">' +
            '<div class="pageloaderpanel">' +
            '<div class="spinner" aria-hidden="true"></div>' +
            '<div class="loader-text">Loading menu items...</div>' +
            '</div>' +
            '</div>';
    }

    function escapeMenuHtml(value) {
        return $('<div>').text(value || '').html();
    }
});
