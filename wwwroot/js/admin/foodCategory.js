$(document).ready(function () {
    loadFoodCategories();
});

function closeFoodCategoryModal() {
    $('#foodCategoryModal').addClass('hidden');
}

function openFoodCategoryModal() {
    clearFoodCategoryForm();
    $('#foodCategoryModal').removeClass('hidden');

    initCategoryField('#categoryCode', '#categoryCodeError');
    initCategoryField('#categoryName', '#categoryNameError');
    initCategoryField('#categoryMaxChoice', '#categoryMaxChoiceError');
    
    setActionButtonLabel('#saveCategoryBtn', 'Save');
    GetAutoGenerateCode();
}

function GetAutoGenerateCode() {
    var entityNo = parseInt(sessionStorage.getItem('gcCurrentEntityNo') || '0', 10) || 0;

    if (entityNo <= 0) {
        showToast('Entity No was not found in session storage.', 3000, { type: 'warning', title: 'Validation' });
        return;
    }

    $.ajax({
        url: '/Admin/CodeTemplate/latestcode?entityNo=' + entityNo,
        type: 'GET',
        success: function (res) {
            if (res && res.success) {
                $('#categoryCode').val(res.code || '');
            } else {
                showToast((res && res.message) || 'Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
            }
        },
        error: function () {
            showToast('Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
        }
    });
}

function loadFoodCategories() {
    showCategoryLoader(true);

    $.ajax({
        url: '/Admin/FoodMenuCategories/get',
        type: 'GET',
        dataType: 'json',
        success: function (rows) {
            renderFoodCategoriesList(Array.isArray(rows) ? rows : []);
        },
        error: function () {
            renderFoodCategoriesList([]);
            showToast('Unable to load food categories.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showCategoryLoader(false);
        }
    });
}

function showCategoryLoader(show) {
    var $panel = $('.pageloaderpanel');
    if ($panel.length) {
        $('#foodCategoryListPanel .table-wrap').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
        return;
    }
}

function renderFoodCategoriesList(rows) {
    rows = Array.isArray(rows) ? rows : [];
    var html = '';

    if (rows.length) {
        for (var i = 0; i < rows.length; i++) {
            var category = rows[i];
            var serial = i + 1;
            var id = category.id || 0;
            var code = category.code || '';
            var name = category.name || '';
            var isActive = category.isActive;

            var actions;
            if (isActive) {
                actions = `<button type="button" class="action-item foodcategory-action-edit" data-id="${id}" onclick="editFoodCategory(this.dataset.id)"><span class="action-icon action-icon-text" aria-hidden="true">&#9998;</span>Edit</button>
                           <button type="button" class="action-item foodcategory-action-inactive" data-id="${id}" onclick="setFoodCategoryActive(this.dataset.id, false)"><span class="action-icon action-icon-text" aria-hidden="true">&#128274;</span>Inactive</button>`;
            } else {
                actions = `<button type="button" class="action-item foodcategory-action-active" data-id="${id}" onclick="setFoodCategoryActive(this.dataset.id, true)"><span class="action-icon action-icon-text" aria-hidden="true">&#128275;</span>Active</button>`;
            }

            var statusBadge;
            if (isActive) {
                statusBadge = '<span class="badge-pill badge-pill--success">Active</span>';
            } else {
                statusBadge = '<span class="badge-pill badge-pill--warning">Inactive</span>';
            }

            html += `
                <tr>
                    <td>${serial}</td>
                    <td>${code}</td>
                    <td>${name}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="row-actions foodcategory-row-actions">
                            <button class="dots-btn" title="Actions">⋯</button>
                            <div class="actions-menu hidden">
                                ${actions}
                                <button type="button" class="action-item foodcategory-action-delete" data-id="${id}" onclick="deleteFoodCategory(this.dataset.id)"><span class="action-icon action-icon-text" aria-hidden="true">&#128465;</span>Delete</button>
                            </div>
                        </div>
                    </td>
                </tr>`;
        }
    }

    $('#foodCategoryList tbody').html(html);

    if (typeof renderDataTable === 'function') {
        renderDataTable('foodCategoryList');
    }
}

function setCategoryError(inputSelector, errorSelector, message) {
    $(inputSelector).addClass('input-error');
    $(errorSelector).removeClass('hidden').text(message);
}

function clearCategoryError(inputSelector, errorSelector) {
    $(inputSelector).removeClass('input-error');
    $(errorSelector).addClass('hidden').text('');
}

function initCategoryField(inputSelector, errorSelector) {
    clearCategoryError(inputSelector, errorSelector);
    var el = document.querySelector(inputSelector);
    if (el) {
        el.oninput = function () {
            clearCategoryError(inputSelector, errorSelector);
        };
    }
}

function clearFoodCategoryForm(keepId) {
    if (!keepId) {
        $('#categoryId').val('');
        setActionButtonLabel('#saveCategoryBtn', 'Save');
    }
    $('#categoryName').val('');
    $('#categoryMaxChoice').val('');
    clearCategoryError('#categoryCode', '#categoryCodeError');
    clearCategoryError('#categoryName', '#categoryNameError');
    clearCategoryError('#categoryMaxChoice', '#categoryMaxChoiceError');
}

function editFoodCategory(id) {
    $('#modal-title').html('Edit Food Category');

    $.ajax({
        url: '/Admin/FoodMenuCategories/get/' + id,
        type: 'GET',
        success: function (category) {
            if (!category) {
                showToast('Food category not found.', 3000, { type: 'warning', title: 'Not found' });
                return;
            }
            $('#categoryId').val(category.Id || category.id || '');
            $('#categoryCode').val(category.Code || category.code || '');
            $('#categoryName').val(category.Name || category.name || '');
            $('#categoryMaxChoice').val(category.MaxChoice ?? category.maxChoice ?? '');
            
            initCategoryField('#categoryCode', '#categoryCodeError');
            initCategoryField('#categoryName', '#categoryNameError');
            initCategoryField('#categoryMaxChoice', '#categoryMaxChoiceError');

            $('#foodCategoryModal').removeClass('hidden');
            setActionButtonLabel('#saveCategoryBtn', 'Update');
        },
        error: function () {
            showToast('Unable to load food category.', 3000, { type: 'error', title: 'Load failed' });
        }
    });
}

function validateForm() {
    clearCategoryError('#categoryCode', '#categoryCodeError');
    clearCategoryError('#categoryName', '#categoryNameError');
    clearCategoryError('#categoryMaxChoice', '#categoryMaxChoiceError');

    var code = $('#categoryCode').val();
    if (code) {
        code = code.toString().trim();
    } else {
        code = '';
    }

    var name = $('#categoryName').val();
    if (name) {
        name = name.toString().trim();
    } else {
        name = '';
    }

    var maxChoiceValue = $('#categoryMaxChoice').val();
    var maxChoice = Number(maxChoiceValue);

    var firstInvalid = null;

    if (!code) {
        setCategoryError('#categoryCode', '#categoryCodeError', 'Code is required');
        firstInvalid = '#categoryCode';
    }

    if (!name) {
        setCategoryError('#categoryName', '#categoryNameError', 'Name is required');
        if (!firstInvalid) {
            firstInvalid = '#categoryName';
        }
    }

    if (maxChoiceValue === '') {
        setCategoryError('#categoryMaxChoice', '#categoryMaxChoiceError', 'Max Choice is required');
        if (!firstInvalid) {
            firstInvalid = '#categoryMaxChoice';
        }
    } else if (!Number.isInteger(maxChoice) || maxChoice < 0) {
        setCategoryError('#categoryMaxChoice', '#categoryMaxChoiceError', 'Max Choice must be a whole number of 0 or more');
        if (!firstInvalid) {
            firstInvalid = '#categoryMaxChoice';
        }
    }

    if (firstInvalid) {
        $(firstInvalid).focus();
        return false;
    }

    return true;
}

function saveFoodCategory() {
    if (window.gcFormValidation && !window.gcFormValidation.validateScope($('.main').first(), true)) {
        return;
    }

    debugger;
    if (!validateForm()) {
        return;
    }

    setButtonBusy('#saveCategoryBtn', true, 'Saving...');

    var categoryId = $('#categoryId').val();
    var entityNo = parseInt(sessionStorage.getItem('gcCurrentEntityNo') || '0', 10) || 0;
    var category = {
        Id: categoryId ? parseInt(categoryId) : 0,
        Code: $('#categoryCode').val().trim(),
        Name: $('#categoryName').val().trim(),
        MaxChoice: parseInt($('#categoryMaxChoice').val(), 10),
        IsActive: true,
        IsDeleted: false,
        CreatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        CreatedDate: null,
        UpdatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        UpdatedDate: null,
        EntityNo: entityNo
    };

    var endpoint = category.Id ? '/Admin/FoodMenuCategories/update' : '/Admin/FoodMenuCategories/create';
    var isUpdate = category.Id > 0;

    $.ajax({
        url: endpoint,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(category),
        success: function (res) {
            if (res && res.success) {
                showToast(isUpdate ? 'Food category updated successfully.' : 'Food category created successfully.', 3000, { type: 'success', title: isUpdate ? 'Updated' : 'Created' });
                clearFoodCategoryForm();
                $('#foodCategoryModal').addClass('hidden');
                loadFoodCategories();
            } else {
                setButtonBusy('#saveCategoryBtn', false);
                var errorMsg = res && res.message ? res.message : (isUpdate ? 'Unable to update food category.' : 'Unable to create food category.');
                showToast(errorMsg, 3000, { type: 'error', title: 'Save failed' });
            }
        },
        error: function () {
            setButtonBusy('#saveCategoryBtn', false);
            showToast(isUpdate ? 'Update failed.' : 'Save failed.', 3000, { type: 'error', title: 'Save failed' });
        }
    });
}

function deleteFoodCategory(id) {
    if (!id) return;

    var confirmMsg = 'Are you sure you want to delete this food category?';
    showToast(confirmMsg, 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm Delete',
        yesText: 'Delete',
        noText: 'Cancel',
        onYes: function () {
            $.ajax({
                url: '/Admin/FoodMenuCategories/delete/' + id,
                type: 'POST',
                dataType: 'json',
                success: function (result) {
                    if (result && result.success) {
                        showToast('Food category deleted successfully.', 3000, { type: 'success', title: 'Deleted' });
                        loadFoodCategories();
                    } else {
                        showToast('Unable to delete food category.', 3000, { type: 'error', title: 'Delete failed' });
                    }
                },
                error: function () {
                    showToast('Delete failed.', 3000, { type: 'error', title: 'Delete failed' });
                }
            });
        }
    });
}

function setFoodCategoryActive(id, status) {
    if (!id) return;

    $.ajax({
        url: '/Admin/FoodMenuCategories/activeinactive?id=' + id + '&status=' + status,
        type: 'POST',
        dataType: 'json',
        success: function (result) {
            if (result && result.success) {
                var msg = status ? 'Food category activated.' : 'Food category marked inactive.';
                showToast(msg, 3000, { type: 'success', title: 'Updated' });
                loadFoodCategories();
            } else {
                showToast('Unable to update food category status.', 3000, { type: 'error', title: 'Update failed' });
            }
        },
        error: function () {
            showToast('Request failed.', 3000, { type: 'error', title: 'Request failed' });
        }
    });
}
