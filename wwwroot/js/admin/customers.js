$(document).ready(function () {
    initCustomerFormValidation();
    loadCustomers();
});

var CUSTOMER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setCustomerFieldError(inputSelector, errorSelector, message) {
    $(inputSelector).addClass('input-error');
    $(errorSelector).removeClass('hidden').text(message || 'Invalid value');
}

function clearCustomerFieldError(inputSelector, errorSelector) {
    $(inputSelector).removeClass('input-error');
    $(errorSelector).addClass('hidden').text('');
}

function toDigitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
}

function validateCustomerName(showError) {
    var name = String($('#customerName').val() || '').trim();
    if (!name) {
        if (showError) setCustomerFieldError('#customerName', '#customerNameError', 'Name is required.');
        return false;
    }

    if (name.length < 2) {
        if (showError) setCustomerFieldError('#customerName', '#customerNameError', 'Name must be at least 2 characters.');
        return false;
    }

    clearCustomerFieldError('#customerName', '#customerNameError');
    return true;
}

function validateCustomerEmail(showError) {
    var email = String($('#customerEmailId').val() || '').trim();
    if (!email) {
        if (showError) setCustomerFieldError('#customerEmailId', '#customerEmailIdError', 'Email is required.');
        return false;
    }

    if (!CUSTOMER_EMAIL_REGEX.test(email)) {
        if (showError) setCustomerFieldError('#customerEmailId', '#customerEmailIdError', 'Enter a valid email address.');
        return false;
    }

    clearCustomerFieldError('#customerEmailId', '#customerEmailIdError');
    return true;
}

function validateCustomerMobile(showError) {
    var mobile = String($('#customerMobileNo').val() || '').trim();
    if (!mobile) {
        if (showError) setCustomerFieldError('#customerMobileNo', '#customerMobileNoError', 'Mobile number is required.');
        return false;
    }

    if (!/^\d{8,15}$/.test(mobile)) {
        if (showError) setCustomerFieldError('#customerMobileNo', '#customerMobileNoError', 'Mobile number must be 8 to 15 digits.');
        return false;
    }

    clearCustomerFieldError('#customerMobileNo', '#customerMobileNoError');
    return true;
}

function validateCustomerPincode(showError) {
    var pincode = String($('#customerPincode').val() || '').trim();
    if (!pincode) {
        clearCustomerFieldError('#customerPincode', '#customerPincodeError');
        return true;
    }

    if (!/^\d{4,10}$/.test(pincode)) {
        if (showError) setCustomerFieldError('#customerPincode', '#customerPincodeError', 'Postal code must be 4 to 10 digits.');
        return false;
    }

    clearCustomerFieldError('#customerPincode', '#customerPincodeError');
    return true;
}

function validateCustomerForm(showError) {
    var isNameValid = validateCustomerName(showError);
    var isEmailValid = validateCustomerEmail(showError);
    var isMobileValid = validateCustomerMobile(showError);
    var isPincodeValid = validateCustomerPincode(showError);
    return isNameValid && isEmailValid && isMobileValid && isPincodeValid;
}

function clearCustomerValidationErrors() {
    clearCustomerFieldError('#customerName', '#customerNameError');
    clearCustomerFieldError('#customerEmailId', '#customerEmailIdError');
    clearCustomerFieldError('#customerMobileNo', '#customerMobileNoError');
    clearCustomerFieldError('#customerPincode', '#customerPincodeError');
}

function initCustomerFormValidation() {
    $('#customerMobileNo').off('input.customerValidation').on('input.customerValidation', function () {
        var digits = toDigitsOnly($(this).val());
        if ($(this).val() !== digits) {
            $(this).val(digits);
        }
        validateCustomerMobile(true);
    });

    $('#customerPincode').off('input.customerValidation').on('input.customerValidation', function () {
        var digits = toDigitsOnly($(this).val());
        if ($(this).val() !== digits) {
            $(this).val(digits);
        }
        validateCustomerPincode(true);
    });

    $('#customerName').off('input.customerValidation blur.customerValidation').on('input.customerValidation blur.customerValidation', function () {
        validateCustomerName(true);
    });

    $('#customerEmailId').off('input.customerValidation blur.customerValidation').on('input.customerValidation blur.customerValidation', function () {
        validateCustomerEmail(true);
    });
}


function loadCustomers() {
    showCustomersLoader(true);

    $.ajax({
        url: '/Admin/Customers/getAll',
        type: 'GET',
        success: function (rows) {
            renderCustomerList(rows || []);
        },
        error: function () {
            renderCustomerList([]);
            showToast('Unable to load customers.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showCustomersLoader(false);
        }
    });
}

function showCustomersLoader(show) {
    var $panel = $('.pageloaderpanel');
    if ($panel.length) {
        $('#customersListPanel .table-wrap').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
    }
}

function renderCustomerList(rows) {
    rows = Array.isArray(rows) ? rows : [];

    var html = rows.map(function (customer, index) {

        var serial = index + 1;

        var id = customer.id ?? customer.Id ?? 0;
        var code = customer.code ?? customer.Code ?? '';
        var name = customer.name ?? customer.Name ?? '';
        var mobile = customer.mobileNo ?? customer.MobileNo ?? '';
        var email = customer.emailId ?? customer.EmailId ?? '';
        var remarks = customer.remarks ?? customer.Remarks ?? '';
        var active = customer.isActive ?? customer.IsActive ?? false;


        var actions;
        if (active) {
            actions = `<button type="button" class="action-item customers-action-edit" data-id="${id}" onclick="editCustomer(this.dataset.id)"><span class="action-icon action-icon-text" aria-hidden="true">&#9998;</span>Edit</button>
                           <button type="button" class="action-item customers-action-inactive" data-id="${id}" onclick="setCustomerActive(this.dataset.id, false)"><span class="action-icon action-icon-text" aria-hidden="true">&#128274;</span>Inactive</button>`;
        } else {
            actions = `<button type="button" class="action-item customers-action-active" data-id="${id}" onclick="setCustomerActive(this.dataset.id, true)"><span class="action-icon action-icon-text" aria-hidden="true">&#128275;</span>Active</button>`;
        }

        var statusBadge;
        if (active) {
            statusBadge = '<span class="badge-pill badge-pill--success">Active</span>';
        } else {
            statusBadge = '<span class="badge-pill badge-pill--warning">Inactive</span>';
        }
                

        return `
            <tr>
                <td>${serial}</td>
                <td>${code}</td>
                <td>${name}</td>
                <td>${mobile}</td>
                <td>${email}</td>
                <td>${remarks}</td>
                <td>${statusBadge}</td>
                <td>
                <div class="row-actions customers-row-actions">
                <button class="dots-btn" title="Actions">⋯</button>
                            <div class="actions-menu hidden">
                                ${actions}
                                <button type="button" class="action-item customers-action-delete" data-id="${id}" onclick="deleteCustomer(this.dataset.id)"><span class="action-icon action-icon-text" aria-hidden="true">&#128465;</span>Delete</button>
                               
                            </div>
                        </div>
                        </td>
            </tr>`;
    }).join('');

    $('#customerList tbody').html(html);

    if (typeof renderDataTable === 'function') {
        renderDataTable('customerList');
    }
}

function clearCustomerForm() {
    $('#customerId').val('');
    $('#customerName').val('');
    $('#customerMobileNo').val('');
    $('#customerEmailId').val('');
    $('#customerAddress').val('');
    $('#customerPincode').val('');
    $('#customerRemarks').val('');
    clearCustomerValidationErrors();
}
function closeCustomerModal() {
    $('#customersModal').addClass('hidden');
}

function openCustomerModal() {
    clearCustomerForm();
    $('#customers-title').text('Create Customer');
    // hideRolePermission();
    $('#customersModal').removeClass('hidden');
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
                $('#customerCode').val(res.code || '');
            } else {
                showToast((res && res.message) || 'Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
            }
        },
        error: function () {
            showToast('Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
        }
    });
}
function saveCustomer() {
    if (window.gcFormValidation && !window.gcFormValidation.validateScope('#customersModal .modal-box', true)) {
        return;
    }

    if (!validateCustomerForm(true)) {
        showToast('Please fix validation errors before saving.', 3000, { type: 'warning', title: 'Validation' });
        return;
    }

    var entityNo = parseInt(sessionStorage.getItem('gcCurrentEntityNo') || '0', 10) || 0;
    var customer = {
        Id: parseInt($('#customerId').val()) || 0,
        Code: $('#customerCode').val() || '',
        Name: ($('#customerName').val() || '').trim(),
        MobileNo: toDigitsOnly($('#customerMobileNo').val() || ''),
        EmailId: ($('#customerEmailId').val() || '').trim(),
        Address: $('#customerAddress').val() || '',
        Pincode: toDigitsOnly($('#customerPincode').val() || ''),
        Remarks: $('#customerRemarks').val() || '',
        IsActive: true,
        IsDeleted: false,
        CreatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        CreatedDate: new Date().toISOString(),
        UpdatedBy: null,
        UpdatedDate: null,
        EntityNo: entityNo
    };

    setButtonBusy('button[onclick="saveCustomer()"]', true, 'Saving...');
   

    var endpoint = customer.Id ? '/Admin/Customers/update' : '/Admin/Customers/create';

    $.ajax({
        url: endpoint,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(customer),
        success: function (res) {
            if (res && res.success) {
                showToast(res.message || 'Customer saved successfully.', 3000, { type: 'success', title: 'Saved' });
                clearCustomerForm();
                $('#customersModal').addClass('hidden');
                loadCustomers();
            } else {
                setButtonBusy('button[onclick="saveCustomer()"]', false);
                showToast(res?.message || 'Unable to save Customer.', 3000, { type: 'error', title: 'Save failed' });
            }
        },
        error: function (xhr) {
            setButtonBusy('button[onclick="saveCustomer()"]', false);
            showToast(xhr.responseJSON?.message || 'Save failed.', 3000, { type: 'error', title: 'Save failed' });
        }
    });
}


function editCustomer(id) {
    $('#customers-title').text('Edit Customer');

    $.ajax({
        url: '/Admin/Customers/get/' + id,
        type: 'GET',
        success: function (customer) {
            if (!customer) {
                showToast('Customer not found.', 3000, { type: 'warning', title: 'Not found' });
                return;
            }

            $('#customerId').val(customer.Id || customer.id || '');
            $('#customerCode').val(customer.Code || customer.code || '');
            $('#customerName').val(customer.Name || customer.name || '');
            $('#customerMobileNo').val(customer.MobileNo || customer.mobileNo || '');
            $('#customerEmailId').val(customer.EmailId || customer.emailId || '');
            $('#customerAddress').val(customer.Address || customer.address || '');
            $('#customerPincode').val(customer.Pincode || customer.pincode || '');
            $('#customerRemarks').val(customer.Remarks || customer.remarks || '');

            clearCustomerValidationErrors();
            validateCustomerForm(false);

            $('#customersModal').removeClass('hidden');
        },
        error: function () {
            showToast('Unable to load customer.', 3000, { type: 'error', title: 'Load failed' });
        }
    });
}
function setCustomerActive(id, isActive) {
    if (!id) return;

    var confirmMessage = isActive ? 'Mark this Customer active?' : 'Mark this Customer inactive?';
    var successMessage = isActive ? 'Customer activated.' : 'Customer marked inactive.';

    showToast(confirmMessage, 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Yes',
        noText: 'No',
        onYes: function () {
            $.ajax({
                url: '/Admin/Customers/activeinactive?id=' + id + '&status=' + isActive,
                type: 'POST',
                success: function (res) {
                    if (res && res.success) {
                        showToast(successMessage, 3000, { type: 'success', title: 'Updated' });
                    } else {
                        showToast('Unable to update Customer status.', 3000, { type: 'error', title: 'Update failed' });
                    }
                    setTimeout(loadCustomers, 350);
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


function deleteCustomer(id) {
    if (!id) return;
    showToast('Delete this Customer?', 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Delete',
        noText: 'Cancel',
        onYes: function () {
            $.ajax({
                url: '/Admin/Customers/delete/' + id,
                type: 'POST',
                success: function (res) {
                    if (res && res.success) {
                        showToast('Customer deleted successfully.', 3000, { type: 'success', title: 'Deleted' });
                    } else {
                        showToast('Unable to delete Customer.', 3000, { type: 'error', title: 'Delete failed' });
                    }
                    setTimeout(loadCustomers, 300);
                },
                error: function () { showToast('Delete failed.', 3000, { type: 'error', title: 'Delete failed' }); }
            });
        },
        onNo: function () {
            showToast('Delete cancelled.', 3000, { type: 'info', title: 'Cancelled' });
        }
    });
}







  
