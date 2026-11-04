$(document).ready(function () {
    initPackagePage();
});

var packagesData = [];
var categoryList = [];
var packageCategories = [];
var foodMenuList = [];
var packageMenuIds = [];
var packageMenuSelectionOrder = [];
var existingPackageMenus = [];
var packageMenuConfigs = {};
var currentPackageId = 0;
var packageMenusSyncingSelection = false;
var includedPackageMenuGroupName = 'Included';

function isIncludedPackageMenuGroup(groupName) {
    return String(groupName || '').trim().toLowerCase() === includedPackageMenuGroupName.toLowerCase();
}

function getCurrentUserIdSafe() {
    return window.getCurrentUserId ? window.getCurrentUserId() : 0;
}

function getQueryParam(param) {
    var params = new URLSearchParams(window.location.search);
    return params.get(param);
}

function initPackagePage() {
    if ($('#packagesTable').length) {
        loadPackages();
    }

    if ($('#packageName').length) {
        initPackageForm();
    }
}

function loadPackages() {
    showPackagesLoader(true);

    $.ajax({
        url: '/Admin/Packages/get',
        type: 'GET',
        dataType: 'json',
        success: function (items) {
            packagesData = Array.isArray(items) ? items : [];
            renderPackagesList(packagesData);
        },
        error: function () {
            packagesData = [];
            renderPackagesList(packagesData);
        },
        complete: function () {
            showPackagesLoader(false);
        }
    });
}

function renderPackagesList(rows) {
    rows = Array.isArray(rows) ? rows : [];
    var html = '';

    for (var i = 0; i < rows.length; i++) {
        var p = rows[i];
        var serial = i + 1;
        var packageName = p.name || '';
        var price = parseFloat(p.price) || 0;
        var active = p.isActive;
        var id = p.id || 0;

        var statusBadge = active
            ? '<span class="badge badge-confirmed">Active</span>'
            : '<span class="badge badge-cancelled">Inactive</span>';

        var actions = `
            <button type="button" class="action-item package-action-edit" data-id="${id}" onclick="editPackage(${p.id})"><span class="action-icon action-icon-text" aria-hidden="true">&#9998;</span>Edit</button>
            <button type="button" class="action-item package-action-delete" data-id="${id}" onclick="deletePackage(this.dataset.id)"><span class="action-icon action-icon-text" aria-hidden="true">&#128465;</span>Delete</button>
            <button type="button" class="action-item ${active ? 'package-action-inactive' : 'package-action-active'}" data-id="${id}" data-state="${active ? 'active' : 'inactive'}" onclick="togglePackageStatus(this.dataset.id, ${active ? 'false' : 'true'})"><span class="action-icon action-icon-text" aria-hidden="true">${active ? '&#128274;' : '&#128275;'}</span>${active ? 'Inactive' : 'Active'}</button>`;

        html += `
            <tr data-id="${id}">
                <td>${serial}</td>
                <td><strong>${packageName}</strong></td>
                <td class="num">S$ ${price.toFixed(2)}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="row-actions package-row-actions">
                        <button type="button" class="dots-btn" title="Actions">⋯</button>
                        <div class="actions-menu hidden">
                            ${actions}
                        </div>
                    </div>
                </td>
            </tr>`;
    }

    $('#packagesTable tbody').html(html);

    if (typeof renderDataTable === 'function') {
        renderDataTable('packagesTable');
    }
}

function showPackagesLoader(show) {
    var $panel = $('.pageloaderpanel');
    if ($panel.length) {
        $('#packagesListPanel .table-wrap').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
        return;
    }
}

function setFieldError(inputSelector, errorSelector, message) {
    $(inputSelector).addClass('input-error');
    $(errorSelector).removeClass('hidden').text(message);
}

function clearFieldError(inputSelector, errorSelector) {
    $(inputSelector).removeClass('input-error');
    $(errorSelector).addClass('hidden').text('');
}

function initField(inputSelector, errorSelector) {
    clearFieldError(inputSelector, errorSelector);
    var el = document.querySelector(inputSelector);
    if (el) {
        el.oninput = function () {
            clearFieldError(inputSelector, errorSelector);
        };
    }
}

function initDescriptionAutoGrow() {
    var el = document.getElementById('packageDescription');
    if (!el) return;

    function adjustHeight() {
        var minHeight = 42;
        el.style.height = minHeight + 'px';
        var next = Math.max(minHeight, el.scrollHeight);
        el.style.height = next + 'px';
    }

    el.removeEventListener('input', adjustHeight);
    el.addEventListener('input', adjustHeight);
    adjustHeight();
}

function createCategoryRow(item, takenIds) {
    takenIds = Array.isArray(takenIds) ? takenIds : [];
    if (!item.rowKey) item.rowKey = 'pkgcat_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    var $row = $('<div class="category-row"></div>');
    $row.attr('data-id', item.id || '');

    var dropdownId = 'categoryDropdown_' + (item.id || Date.now());
    var $select = $('<select id="' + dropdownId + '" class="form-control category-select"></select>');
    $select.append('<option value="0">-- Select category --</option>');

    categoryList.forEach(function (c) {
        var cId = parseInt(c.Id, 10);
        if (takenIds.indexOf(cId) === -1) {
            var $option = $('<option></option>')
                .attr('value', cId)
                .text(c.Name);
            $select.append($option);
        }
    });

    $select.val(item.categoryId || '');
    $select.on('change', function () {
        item.categoryId = $(this).val();
        renderCategories();
    });

    var $quantity = $('<input type="number" class="form-control category-quantity" min="1" />');
    $quantity.val(item.quantity || 0);
    $quantity.on('input', function () {
        item.quantity = $(this).val();
    });

    var $remove = $('<button type="button" class="btn btn-light btn-sm btn-remove-category" onclick="removePackageCategoryByKey(\'' + item.rowKey + '\')">Remove</button>');

    $row.append($select, $quantity, $remove);
    return $row;
}

function renderCategories() {
    var $container = $('#categoryRows');
    if (!$container.length) return;

    $container.empty();
    packageCategories.forEach(function (item) {
        var takenIds = packageCategories
            .filter(function (c) { return c !== item; })
            .map(function (c) { return parseInt(c.categoryId, 10); })
            .filter(function (id) { return id > 0; });
        $container.append(createCategoryRow(item, takenIds));
    });
}

function addCategoryRow() {
    var item = {
        id: '' + Date.now() + Math.random(),
        rowKey: 'pkgcat_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        categoryId: '',
        quantity: 1
    };
    packageCategories.push(item);
    renderCategories();
}

// function handleAddCategoryRow() {
//     var hasEmptyCategory = packageCategories.some(function (c) { return !c.categoryId; });
//     if (hasEmptyCategory) {
//         showToast('Please select a category for the current row', 3000, { type: 'error', title: 'Validation' });
//         return;
//     }
//     addCategoryRow();
// }

// function removePackageCategoryByKey(rowKey) {
//     var item = packageCategories.find(function (c) { return c.rowKey === rowKey; });
//     if (!item) return;

//     var itemId = item.Id || 0;

//     if (itemId && parseInt(itemId, 10) > 0) {
//         $.ajax({
//             url: '/Admin/PackageItems/delete/' + parseInt(itemId, 10),
//             type: 'DELETE',
//             dataType: 'json',
//             success: function (result) {
//                 if (result && result.success) {
//                     packageCategories = packageCategories.filter(function (c) { return c !== item; });
//                     renderCategories();
//                     showToast('Category removed successfully.', 3000, { type: 'success', title: 'Removed' });
//                 } else {
//                     showToast('Unable to delete category.', 3000, { type: 'error', title: 'Delete failed' });
//                 }
//             },
//             error: function () {
//                 showToast('Unable to delete category.', 3000, { type: 'error', title: 'Delete failed' });
//             }
//         });
//     } else {
//         packageCategories = packageCategories.filter(function (c) { return c !== item; });
//         renderCategories();
//         showToast('Category removed.', 3000, { type: 'success', title: 'Removed' });
//     }
// }

function loadCategories(items) {
    var source = Array.isArray(items) ? items : [];
    categoryList = source.map(function (item) {
        return {
            Id:  item.id || 0,
            Name:  item.name || ''
        };
    });

    if (!packageCategories.length && categoryList.length) {
        addCategoryRow();
        return;
    }

    renderCategories();
}

function collectPayload() {
    return {
        Id: currentPackageId,
        Name: $('#packageName').val().toString().trim(),
        Description: $('#packageDescription').val().toString().trim(),
        Price: parseFloat($('#packagePrice').val()) || 0,
        IsActive: true,
        IsEmpty: $('#packageIsEmpty').is(':checked'),
        PackageMenus: getSelectedPackageMenus(),
        PackageItems: packageCategories
            .filter(function (c) { return c.categoryId; })
            .map(function (c) {
                return {
                    CategoryId: parseInt(c.categoryId, 10),
                    Quantity: parseInt(c.quantity, 10) || 1,
                    IsActive: true,
                    IsDeleted: false
                };
            })
    };
}

function getSelectedPackageMenus() {
    var selected = packageMenuSelectionOrder.length ? packageMenuSelectionOrder.slice() : ($('#packageMenuIds').val() || []);
    return selected.map(function (value, index) {
        var id = parseInt(value, 10) || 0;
        var config = packageMenuConfigs[String(id)] || {};
        var choiceGroupName = String(config.choiceGroupName || '').trim();
        return {
            FoodMenuId: id,
            ChoiceGroupName: choiceGroupName && !isIncludedPackageMenuGroup(choiceGroupName)
                ? choiceGroupName
                : includedPackageMenuGroupName,
            DisplayOrder: index + 1
        };
    }).filter(function (item) { return item.FoodMenuId > 0; });
}

function renderPackageMenuChoiceConfigs() {
    var $wrap = $('#packageMenuChoiceConfigWrap');
    var $list = $('#packageMenuChoiceConfigs');
    if (!$list.length) return;
    var html = packageMenuSelectionOrder.map(function (id) {
        var menu = foodMenuList.find(function (item) { return Number(item.id || item.Id) === Number(id); }) || {};
        var config = packageMenuConfigs[String(id)] || {};
        var name = menu.name || menu.Name || ('Menu #' + id);
        var isFullQuantity = !config.choiceGroupName || isIncludedPackageMenuGroup(config.choiceGroupName);
        return '<div class="package-menu-choice-config" data-menu-id="' + id + '">' +
            '<div class="package-menu-choice-name">' + $('<div>').text(name).html() + '</div>' +
            '<select class="form-control package-menu-behaviour"><option value="full"' + (isFullQuantity ? ' selected' : '') + '>Full quantity</option><option value="choice"' + (!isFullQuantity ? ' selected' : '') + '>Choice / split</option></select>' +
            '<input class="form-control package-menu-group-name" maxlength="100" placeholder="Group name, e.g. Rice Choice" value="' + (isFullQuantity ? includedPackageMenuGroupName : $('<div>').text(config.choiceGroupName || '').html()) + '"' + (isFullQuantity ? ' disabled' : '') + '></div>';
    }).join('');
    $list.html(html);
    $wrap.toggleClass('hidden', !packageMenuSelectionOrder.length);
}

function syncPackageMenuSelectionOrder() {
    var $select = $('#packageMenuIds');
    if (!$select.length) return;

    var selectedIds = ($select.val() || []).map(function (value) {
        return parseInt(value, 10) || 0;
    }).filter(function (id) {
        return id > 0;
    });

    packageMenuSelectionOrder = packageMenuSelectionOrder.filter(function (id) {
        return selectedIds.indexOf(id) > -1;
    });

    selectedIds.forEach(function (id) {
        if (packageMenuSelectionOrder.indexOf(id) === -1) {
            packageMenuSelectionOrder.push(id);
        }
    });

    var orderedIds = packageMenuSelectionOrder.filter(function (id) {
        return selectedIds.indexOf(id) > -1;
    });

    var currentIds = selectedIds.join(',');
    var orderedValue = orderedIds.join(',');
    if (currentIds !== orderedValue) {
        packageMenusSyncingSelection = true;
        $select.val(orderedIds.map(String)).trigger('change.select2');
        packageMenusSyncingSelection = false;
    }

    packageMenuIds = orderedIds;
}

function clearPackageMenuSearchInput() {
    var $select = $('#packageMenuIds');
    if (!$select.length) return;

    var $search = $select.next('.select2').find('.select2-search__field');
    if ($search.length) {
        $search.val('');
        $search.trigger('input');
    }
}

function keepPackageMenuDropdownOpen() {
    var $select = $('#packageMenuIds');
    if (!$select.length || typeof $select.select2 !== 'function') return;

    window.setTimeout(function () {
        if (!$select.next('.select2').hasClass('select2-container--open')) {
            $select.select2('open');
        }
    }, 0);
}

function initPackageMenusDropdown() {
    var $select = $('#packageMenuIds');
    if (!$select.length || typeof $select.select2 !== 'function') return;

    if (!$select.hasClass('select2-hidden-accessible')) {
        $select.select2({
            width: '100%',
            placeholder: 'Select food menus',
            closeOnSelect: false
        });
    }

    $select.off('.packageMenusOrder');
    $select.on('select2:select.packageMenusOrder', function (event) {
        if (!event || !event.params || !event.params.data) return;
        var selectedId = parseInt(event.params.data.id, 10) || 0;
        if (selectedId > 0 && packageMenuSelectionOrder.indexOf(selectedId) === -1) {
            packageMenuSelectionOrder.push(selectedId);
        }
        syncPackageMenuSelectionOrder();
        renderPackageMenus();
        clearPackageMenuSearchInput();
        keepPackageMenuDropdownOpen();
    });

    $select.on('select2:unselect.packageMenusOrder', function (event) {
        if (!event || !event.params || !event.params.data) return;
        var removedId = parseInt(event.params.data.id, 10) || 0;
        if (removedId > 0) {
            packageMenuSelectionOrder = packageMenuSelectionOrder.filter(function (id) {
                return id !== removedId;
            });
        }
        syncPackageMenuSelectionOrder();
        renderPackageMenus();
    });
}

function renderPackageMenus() {
    var $select = $('#packageMenuIds');
    if (!$select.length) return;

    var selectedSet = new Set(packageMenuIds.map(function (id) { return parseInt(id, 10) || 0; }));
    var selectedOrderSet = new Set(packageMenuSelectionOrder.map(function (id) { return parseInt(id, 10) || 0; }));
    var html = '';
    var orderedMenus = [];

    packageMenuSelectionOrder.forEach(function (id) {
        var menu = foodMenuList.find(function (item) {
            return (parseInt(item.id || item.Id || 0, 10) || 0) === id;
        });
        if (menu && selectedSet.has(id)) {
            orderedMenus.push(menu);
        }
    });

    foodMenuList.forEach(function (menu) {
        var menuId = parseInt(menu.id || menu.Id || 0, 10);
        if (menuId > 0 && !selectedOrderSet.has(menuId)) {
            orderedMenus.push(menu);
        }
    });

    orderedMenus.forEach(function (menu) {
        var menuId = parseInt(menu.id || menu.Id || 0, 10);
        if (menuId <= 0) return;
        var name = menu.name || menu.Name || '';
        var code = menu.code || menu.Code || '';
        var category = menu.category || menu.Category || '';
        var label = name;

        if (code) label = code + ' - ' + name;
        if (category) label += ' (' + category + ')';

        html += '<option value="' + menuId + '"' + (selectedSet.has(menuId) ? ' selected' : '') + '>' +
            $('<div>').text(label).html() +
            '</option>';
    });

    $select.html(html);
    initPackageMenusDropdown();
    if (!packageMenuSelectionOrder.length && packageMenuIds.length) {
        packageMenuSelectionOrder = packageMenuIds.slice();
    }
    syncPackageMenuSelectionOrder();
    $select.trigger('change.select2');
    renderPackageMenuChoiceConfigs();
}

function loadFoodMenus() {
    return fetchFoodMenusByUrl('/Admin/FoodMenus/get')
    .done(function (items) {
        foodMenuList = Array.isArray(items) ? items : [];
        renderPackageMenus();
    })
    .fail(function () {
        foodMenuList = [];
        renderPackageMenus();
        showToast('Unable to load food menus.', 3000, { type: 'error', title: 'Load failed' });
    });
}

function fetchFoodMenusByUrl(url) {
    return $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json'
    });
}

function validateForm() {
    clearFieldError('#packageName', '#packageNameError');
    clearFieldError('#packagePrice', '#packagePriceError');

    var firstInvalid = null;
    var name = $('#packageName').val().toString().trim();
    var price = $('#packagePrice').val();
    var isempty = $('#packageIsEmpty').is(':checked');

    if (!name) {
        setFieldError('#packageName', '#packageNameError', 'Package name is required');
        firstInvalid = firstInvalid || '#packageName';
    }

    if (isempty != true) {
        if (!price || parseFloat(price) <= 0) {
            setFieldError('#packagePrice', '#packagePriceError', 'Enter a valid price');
            firstInvalid = firstInvalid || '#packagePrice';
        }
    }
    

    var choiceGroupCounts = {};
    var choiceConfigInvalid = false;
    $('.package-menu-choice-config').each(function () {
        var $row = $(this);
        if ($row.find('.package-menu-behaviour').val() !== 'choice') return;
        var groupName = String($row.find('.package-menu-group-name').val() || '').trim();
        if (!groupName) {
            choiceConfigInvalid = true;
            $row.find('.package-menu-group-name').addClass('input-error');
            return;
        }
        var key = groupName.toLowerCase();
        choiceGroupCounts[key] = (choiceGroupCounts[key] || 0) + 1;
    });
    if (choiceConfigInvalid || Object.keys(choiceGroupCounts).some(function (key) { return choiceGroupCounts[key] < 2; })) {
        showToast('Every choice group needs a group name and at least two menu items.', 4000, { type: 'error', title: 'Package menu validation' });
        return false;
    }

    
    // var hasCategorySelected = packageCategories.some(function (c) { return c.categoryId; });
    // if (!hasCategorySelected) {
    //     showToast('Add at least one category', 3000, { type: 'error', title: 'Validation' });
    //     return false;
    // }

    if (firstInvalid) {
        $(firstInvalid).focus();
        return false;
    }

    return true;
}


function loadPackageForEdit(id) {
    if (!id) return;

    $.ajax({
        url: '/Admin/Packages/get/' + id,
        type: 'GET',
        dataType: 'json',
        success: function (packageData) {
            $('#packageName').val(packageData.name || '');
            $('#packageDescription').val(packageData.description || '');
            $('#packagePrice').val(packageData.price || 0.00);
            if (packageData.isEmpty === true) {
                $('#packageIsEmpty').prop('checked', true);
            }
            $('#packageIsEmpty').val(packageData.isEmpty || '');
            initDescriptionAutoGrow();

            
            // loadPackageItems(id);
            loadPackageMenus(id);
        },
        error: function () {
            showToast('Unable to load package details.', 3000, { type: 'error', title: 'Load failed' });
        }
    });
}

// function loadPackageItems(id) {
//     if (!id) return;

//     $.ajax({
//         url: '/Admin/PackageItems/GetByPackageId?packageId=' + id,
//         type: 'GET',
//         dataType: 'json',
//         success: function (items) {
//             packageCategories = Array.isArray(items) ? items.map(function (item) {
//                 return {
//                     Id: item.id || 0,
//                     id: '' + Date.now() + Math.random(),
//                     rowKey: 'pkgcat_' + (item.id || Date.now()) + '_' + Math.floor(Math.random() * 1000),
//                     categoryId: parseInt(item.CategoryId || item.categoryId || 0, 10),
//                     quantity: item.Quantity || item.quantity || 1
//                 };
//             }) : [];

//             renderCategories();
//         },
//         error: function () {
//             renderCategories();
//         }
//     });
// }

function loadPackageMenus(id) {
    if (!id) return;

    $.ajax({
        url: '/Admin/PackageMenus/GetByPackageId?packageId=' + id,
        type: 'GET',
        dataType: 'json',
        success: function (items) {
            var source = Array.isArray(items) ? items : [];
            existingPackageMenus = source.map(function (item) {
                return {
                    id: parseInt(item.id || item.Id || 0, 10),
                    foodMenuId: parseInt(item.foodMenuId || item.FoodMenuId || 0, 10),
                    choiceGroupName: String(item.choiceGroupName || item.ChoiceGroupName || ''),
                    displayOrder: parseInt(item.displayOrder || item.DisplayOrder || 0, 10)
                };
            }).filter(function (entry) {
                return entry.id > 0 && entry.foodMenuId > 0;
            });

            packageMenuIds = existingPackageMenus.map(function (entry) { return entry.foodMenuId; });
            packageMenuConfigs = {};
            existingPackageMenus.forEach(function (entry) {
                packageMenuConfigs[String(entry.foodMenuId)] = { choiceGroupName: entry.choiceGroupName };
            });
            existingPackageMenus.sort(function (a, b) { return a.displayOrder - b.displayOrder; });
            packageMenuIds = existingPackageMenus.map(function (entry) { return entry.foodMenuId; });
            packageMenuSelectionOrder = packageMenuIds.slice();
            renderPackageMenus();
        },
        error: function () {
            existingPackageMenus = [];
            packageMenuIds = [];
            packageMenuSelectionOrder = [];
            renderPackageMenus();
        }
    });
}

function loadFoodMenuCategories() {
    $.ajax({
        url: '/Admin/FoodMenuCategories/get',
        type: 'GET',
        dataType: 'json',
        success: function (items) {
            var source = Array.isArray(items) ? items : [];
            categoryList = source.map(function (item) {
                return {
                    Id:  item.id || 0,
                    Name:item.name || ''
                };
            });

            if (!packageCategories.length && categoryList.length) {
                addCategoryRow();
            } else {
                renderCategories();
            }
        },
        error: function () {
            categoryList = [];
            renderCategories();
        }
    });
}

function initPackageForm() {
    initField('#packageName', '#packageNameError');
    initField('#packagePrice', '#packagePriceError');
    initDescriptionAutoGrow();
    initPackageMenusDropdown();

    var packageId = parseInt(getQueryParam('packageId') || 0, 10);
    currentPackageId = packageId;

    $('#packageMenuIds').on('change', function () {
        if (packageMenusSyncingSelection) return;
        syncPackageMenuSelectionOrder();
    });

    if (packageId > 0) {
        setActionButtonLabel('#savePackage', 'Update');
        
        // loadFoodMenuCategories();
        loadFoodMenus().always(function () {
            loadPackageForEdit(packageId);
        });
        return;
    }

    
    // loadFoodMenuCategories();
    loadFoodMenus();
}

function savePackage() {
    if (window.gcFormValidation && !window.gcFormValidation.validateScope($('.main').first(), true)) {
        return;
    }

    if (!validateForm()) {
        return;
    }

    setButtonBusy('#savePackage', true, 'Saving...');

    var payload = collectPayload();
    var packagePayload = {
        Id: payload.Id,
        Name: payload.Name,
        Description: payload.Description,
        Price: payload.Price,
        IsActive: payload.IsActive,
        CreatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        CreatedDate: null,
        UpdatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        UpdatedDate: null,
        IsDeleted: false,
        IsEmpty: payload.IsEmpty
    };

    var isUpdate = packagePayload.Id && packagePayload.Id > 0;
    var endpoint = isUpdate ? '/Admin/Packages/update' : '/Admin/Packages/create';

    $.ajax({
        url: endpoint,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(packagePayload),
        success: function (result) {
            if (result && result.success) {
                var packageId = isUpdate ? packagePayload.Id : result.id;
                savePackageItems(packageId, payload.PackageItems, function (itemsSaved) {
                    if (!itemsSaved) {
                        setButtonBusy('#savePackage', false);
                        showToast('Unable to save package items.', 3000, { type: 'error', title: 'Save failed' });
                        return;
                    }

                    savePackageMenus(packageId, payload.PackageMenus, isUpdate, function (menusSaved) {
                        setButtonBusy('#savePackage', false);
                        if (!menusSaved) {
                            showToast('Package saved, but menu mapping failed.', 3000, { type: 'warning', title: 'Partial save' });
                            return;
                        }

                        var successMsg = isUpdate ? 'Package updated successfully.' : 'Package created successfully.';
                        showToast(successMsg, 300, { type: 'success', title: 'Success' });
                        setTimeout(function () {
                            window.location.href = '/Admin/Packages';
                        }, 300);
                    });
                });
            } else {
                setButtonBusy('#savePackage', false);
                var errorMsg = result && result.message ? result.message : 'Unable to save package.';
                showToast(errorMsg, 3000, { type: 'error', title: 'Save failed' });
            }
        },
        error: function () {
            setButtonBusy('#savePackage', false);
            showToast('Unable to save package.', 3000, { type: 'error', title: 'Save failed' });
        }
    });
}

function savePackageItems(packageId, items, callback) {
    callback = typeof callback === 'function' ? callback : function () {};
    var preparedItems = Array.isArray(items) ? items : [];
    if (!preparedItems.length) {
        callback(true);
        return;
    }

    var itemsPayload = preparedItems.map(function (item) {
        return {
            PackageId: packageId,
            CategoryId: parseInt(item.CategoryId || item.categoryId, 10),
            Quantity: parseInt(item.Quantity || item.quantity, 10) || 1,
            CreatedBy: getCurrentUserIdSafe(),
            CreatedDate: new Date().toISOString(),
            IsActive: true,
            IsDeleted: false
        };
    });

    $.ajax({
        url: '/Admin/PackageItems/save',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(itemsPayload),
        success: function (result) {
            if (result && result.success) {
                callback(true);
            } else {
                callback(false);
            }
        },
        error: function () {
            callback(false);
        }
    });
}

function savePackageMenus(packageId, menuItems, isUpdate, callback) {
    callback = typeof callback === 'function' ? callback : function () {};

    var preparedMenus = Array.isArray(menuItems) ? menuItems : [];
    var selectedIds = preparedMenus.map(function (item) { return parseInt(item.FoodMenuId, 10) || 0; }).filter(function (id) { return id > 0; });

    var payload = preparedMenus.map(function (menuItem) {
        return {
            PackageId: packageId,
            FoodMenuId: parseInt(menuItem.FoodMenuId, 10),
            ChoiceGroupName: String(menuItem.ChoiceGroupName || '').trim() || null,
            DisplayOrder: parseInt(menuItem.DisplayOrder, 10) || 0,
            CreatedBy: getCurrentUserIdSafe(),
            CreatedDate: new Date().toISOString(),
            UpdatedBy: getCurrentUserIdSafe(),
            IsActive: true,
            IsDeleted: false
        };
    });

    var toDelete = [];
    if (isUpdate) {
        var selectedSet = new Set(selectedIds);
        toDelete = existingPackageMenus.filter(function (entry) {
            return !selectedSet.has(parseInt(entry.foodMenuId, 10) || 0);
        });
    }

    var saveRequest = payload.length
        ? $.ajax({
            url: '/Admin/PackageMenus/save',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload)
        })
        : $.Deferred().resolve({ success: true }).promise();

    saveRequest.done(function (saveResult) {
        if (payload.length && (!saveResult || !saveResult.success)) {
            callback(false);
            return;
        }

        if (!toDelete.length) {
            callback(true);
            return;
        }

        var deleteCalls = toDelete.map(function (entry) {
            return $.ajax({
                url: '/Admin/PackageMenus/delete/' + entry.id,
                type: 'DELETE',
                dataType: 'json'
            });
        });

        $.when.apply($, deleteCalls).done(function () {
            callback(true);
        }).fail(function () {
            callback(false);
        });
    }).fail(function () {
        callback(false);
    });
}

$(document).on('change', '.package-menu-behaviour', function () {
    var $row = $(this).closest('.package-menu-choice-config');
    var id = String($row.data('menu-id'));
    var isChoice = $(this).val() === 'choice';
    var $input = $row.find('.package-menu-group-name');
    packageMenuConfigs[id] = packageMenuConfigs[id] || {};
    if (!isChoice) packageMenuConfigs[id].choiceGroupName = includedPackageMenuGroupName;
    if (isChoice && isIncludedPackageMenuGroup(packageMenuConfigs[id].choiceGroupName)) {
        packageMenuConfigs[id].choiceGroupName = '';
    }
    $input.prop('disabled', !isChoice).val(isChoice ? (packageMenuConfigs[id].choiceGroupName || '') : includedPackageMenuGroupName);
    if (isChoice) $input.trigger('focus');
});

$(document).on('input', '.package-menu-group-name', function () {
    var id = String($(this).closest('.package-menu-choice-config').data('menu-id'));
    packageMenuConfigs[id] = packageMenuConfigs[id] || {};
    packageMenuConfigs[id].choiceGroupName = String($(this).val() || '');
});

function clearPackageForm() {
    $('#packageName').val('');
    $('#packageDescription').val('');
    $('#packagePrice').val('');
    packageCategories = [];
    packageMenuIds = [];
    packageMenuSelectionOrder = [];
    packageMenuConfigs = {};
    existingPackageMenus = [];
    renderCategories();
    renderPackageMenus();
    $('#packageMenuIds').val([]).trigger('change');
    initDescriptionAutoGrow();
    clearFieldError('#packageName', '#packageNameError');
    clearFieldError('#packagePrice', '#packagePriceError');
}

function editPackage(id) {
    if (!id) return;
    window.location.href = '/Admin/Packages/edit?packageId=' + id;
}

function deletePackage(id) {
    if (!id) return;

    showToast('Delete this package?', 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Delete',
        noText: 'Cancel',
        onYes: function () {
            $.ajax({
                url: '/Admin/Packages/delete/' + id,
                type: 'POST',
                dataType: 'json',
                success: function (result) {
                    if (result && result.success) {
                        showToast('Package deleted successfully.', 3000, { type: 'success', title: 'Deleted' });
                    } else {
                        showToast('Unable to delete package.', 3000, { type: 'error', title: 'Delete failed' });
                    }
                    setTimeout(loadPackages, 300);
                },
                error: function () {
                    showToast('Delete failed.', 3000, { type: 'error', title: 'Delete failed' });
                }
            });
        },
        onNo: function () {
            showToast('Delete cancelled.', 3000, { type: 'info', title: 'Cancelled' });
        }
    });
}

function togglePackageStatus(id, isActive) {
    if (!id) return;

    var confirmMessage = isActive ? 'Mark this package active?' : 'Mark this package inactive?';
    var successMessage = isActive ? 'Package activated.' : 'Package marked inactive.';

    showToast(confirmMessage, 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Yes',
        noText: 'No',
        onYes: function () {
            $.ajax({
                url: '/Admin/Packages/activeinactive?id=' + id + '&status=' + isActive,
                type: 'POST',
                dataType: 'json',
                success: function (result) {
                    if (result && result.success) {
                        showToast(successMessage, 3000, { type: 'success', title: 'Updated' });
                    } else {
                        showToast('Unable to update package status.', 3000, { type: 'error', title: 'Update failed' });
                    }
                    setTimeout(loadPackages, 300);
                },
                error: function () {
                    showToast('Request failed.', 3000, { type: 'error', title: 'Request failed' });
                }
            });
        },
        onNo: function () {
            showToast('Action cancelled.', 3000, { type: 'info', title: 'Cancelled' });
        }
    });
}

$('#packageIsEmpty').on('change', function () {
    const isEmpty = $(this).is(':checked');

    $('#packageMenuIds')
        .prop('disabled', isEmpty)
        .trigger('change');

    if (isEmpty) {
        $('#packageMenuIds').val(null).trigger('change');

        $('#packageMenuChoiceConfigWrap').addClass('hidden');
        $('#packageMenuChoiceConfigs').empty();
    }
});

