$(document).ready(function () {
    loadDriver();
    $('#EmploymentType').focus();
});

function closeDriverModal() {
    $('#driverModal').addClass('hidden');
}

function opendriverModal() {
    clearDriverForm();
    $('#driver-title').text('Create Driver');
    setActionButtonLabel('#btnSaveDriver', 'Save');
    if (typeof applyPermissionVisibility === 'function') applyPermissionVisibility(document);
    $('#driverModal').removeClass('hidden');

    initCategoryField('#Code', '#CodeError');
    initCategoryField('#ItemName', '#ItemNameError');
    initCategoryField('#MobileNo', '#MobileNoError');
    initCategoryField('#Email', '#EmailError');
    initCategoryField('#LicenseNo', '#LicenseNoError');
    initCategoryField('#LicenseExpiryDate', '#LicenseExpiryDateError');
    initCategoryField('#DateofBirth', '#DateofBirthError');
    initCategoryField('#Gender', '#GenderError');
    initCategoryField('#Address', '#AddressError');
    initCategoryField('#City', '#CityError');
    initCategoryField('#State', '#StateError');
    initCategoryField('#Pincode', '#PincodeError');
    initCategoryField('#VehicleType', '#VehicleTypeError');
    initCategoryField('#VehicleNo', '#VehicleNoError');
    initCategoryField('#ExperienceYears', '#ExperienceYearsError');
    initCategoryField('#JoiningDate', '#JoiningDateError');
    initCategoryField('#EmploymentType', '#EmploymentTypeError');
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
                $('#Code').val(res.code || '');
            } else {
                showToast((res && res.message) || 'Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
            }
        },
        error: function () {
            showToast('Unable to generate code.', 3000, { type: 'error', title: 'Load failed' });
        }
    });
}

function loadDriver() {
    showDriverLoader(true);

    $.ajax({
        url: '/Admin/Driver/get',
        type: 'GET',
        dataType: 'json',
        success: function (rows) {
            renderDriverList(Array.isArray(rows) ? rows : []);
        },
        error: function () {
            renderDriverList([]);
            showToast('Unable to load Driver.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showDriverLoader(false);
        }
    });
}
function showDriverLoader(show) {
    var $panel = $('.pageloaderpanel');
    if ($panel.length) {
        $('#menusListPanel .table-wrap').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
        return;
    }
}

function renderDriverList(rows) {
    rows = Array.isArray(rows) ? rows : [];
    var html = '';
    if (rows.length) {
        for (var i = 0; i < rows.length; i++) {
            var driver = rows[i];
            var sNo = i + 1;
            var id = driver.id || driver.Id || '';
            var code = driver.code || driver.Code || '';
            var name = driver.name || driver.Name || '';
            var MobileNo = driver.mobileNo || driver.MobileNo || '';
            var Email = driver.email || driver.Email || '';
            var EmployeeType = driver.employeeType || driver.EmployeeType || '';
            var active = driver.isActive;

            var actions;
            if (active) {
                actions = `<button type="button" class="action-item driver-action-edit" data-id="${id}" onclick="editDriver(this.dataset.id)"><span class="action-icon action-icon-text" aria-hidden="true">&#9998;</span>Edit</button>
                           <button type="button" class="action-item driver-action-inactive" data-id="${id}" onclick="setDriverActive(this.dataset.id, false)"><span class="action-icon action-icon-text" aria-hidden="true">&#128274;</span>Inactive</button>`;
            } else {
                actions = `<button type="button" class="action-item driver-action-active" data-id="${id}" onclick="setDriverActive(this.dataset.id, true)"><span class="action-icon action-icon-text" aria-hidden="true">&#128275;</span>Active</button>`;
            }

            var statusBadge;
            if (active) {
                statusBadge = '<span class="badge-pill badge-pill--success">Active</span>';
            } else {
                statusBadge = '<span class="badge-pill badge-pill--warning">Inactive</span>';
            }

            html +=  `
                <tr>
                    <td>${sNo}</td>
                    <td>${code}</td>
                    <td>${name}</td>
                    <td>${MobileNo || ''}</td>
                    <td>${Email || ''}</td>
                    <td>${EmployeeType || ''}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="row-actions driver-row-actions">
                            <button class="dots-btn" title="Actions">⋯</button>
                            <div class="actions-menu hidden">
                                ${actions}
                                <button type="button" class="action-item driver-action-delete" data-id="${id}" onclick="deleteDriver(this.dataset.id)"><span class="action-icon action-icon-text" aria-hidden="true">&#128465;</span>Delete</button>
                            </div>
                        </div>
                    </td>
                </tr>`;
        }
    }

    $('#driverList tbody').html(html);
    if (typeof renderDataTable === 'function') {
        renderDataTable('driverList');
    }
}

function clearDriverForm() {
    $('#driverId').val('');
    $('#Name').val('');
    $('#MobileNo').val('');
    $('#Email').val('');
    $('#LicenseNo').val('')
    $('#LicenseExpiryDate').val('');
    $('#DateofBirth').val('');
    $('#Gender').val('');
    $('#Address').val('');
    $('#City').val('');
    $('#State').val('');
    $('#Pincode').val('');
    $('#VehicleType').val('');
    $('#VehicleNo').val('');
    $('#ExperienceYears').val('');
    $('#JoiningDate').val('');
    $('#EmploymentType').val('');
    setActionButtonLabel('#btnSaveDriver', 'Save');

    clearDriverError('#Code', '#CodeError');
    clearDriverError('#Name', '#NameError');
    clearDriverError('#MobileNo', '#MobileNoError');
    clearDriverError('#Email', '#EmailError');
    clearDriverError('#LicenseNo', '#LicenseNoError');
    clearDriverError('#LicenseExpiryDate', '#LicenseExpiryDateError');
    clearDriverError('#DateofBirth', '#DateofBirthError');
    clearDriverError('#Gender', '#GenderError');
    clearDriverError('#Address', '#AddressError');
    clearDriverError('#City', '#CityError');
    clearDriverError('#State', '#StateError');
    clearDriverError('#Pincode', '#PincodeError');
    clearDriverError('#VehicleType', '#VehicleTypeError');
    clearDriverError('#VehicleNo', '#VehicleNoError');
    clearDriverError('#ExperienceYears', '#ExperienceYearsError');
    clearDriverError('#JoiningDate', '#JoiningDateError');
    clearDriverError('#EmploymentType', '#EmploymentTypeError');
}

function setDriverError(inputSelector, errorSelector, message) {
    $(inputSelector).addClass('input-error');
    $(errorSelector).removeClass('hidden').text(message);
}

function clearDriverError(inputSelector, errorSelector) {
    $(inputSelector).removeClass('input-error');
    $(errorSelector).addClass('hidden').text('');
}

function initCategoryField(inputSelector, errorSelector) {
    clearDriverError(inputSelector, errorSelector);
    var el = document.querySelector(inputSelector);
    if (el) {
        el.oninput = function () {
            clearDriverError(inputSelector, errorSelector);
        };
    }
}

function sanitizeDriverDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function isValidDriverEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function validateForm() {
    clearDriverError('#Code', '#CodeError');
    clearDriverError('#Name', '#NameError');
    clearDriverError('#MobileNo', '#MobileNoError');
    clearDriverError('#Email', '#EmailError');
    clearDriverError('#LicenseNo', '#LicenseNoError');
    clearDriverError('#LicenseExpiryDate', '#LicenseExpiryDateError');
    clearDriverError('#DateofBirth', '#DateofBirthError');
    clearDriverError('#Gender', '#GenderError');
    clearDriverError('#Address', '#AddressError');
    clearDriverError('#City', '#CityError');
    clearDriverError('#State', '#StateError');
    clearDriverError('#Pincode', '#PincodeError');
    clearDriverError('#VehicleType', '#VehicleTypeError');
    clearDriverError('#VehicleNo', '#VehicleNoError');
    clearDriverError('#ExperienceYears', '#ExperienceYearsError');
    clearDriverError('#JoiningDate', '#JoiningDateError');
    clearDriverError('#EmploymentType', '#EmploymentTypeError');


    var code = $('#Code').val();
    if (code) {
        code = code.toString().trim();
    } else {
        code = '';
    }

    var name = $('#Name').val();
    if (name) {
        name = name.toString().trim();
    } else {
        name = '';
    }

    var MobileNo = $('#MobileNo').val();
    if (MobileNo) {
        MobileNo = sanitizeDriverDigits(MobileNo);
    } else {
        MobileNo = '';
    }

    var employmentType = $('#EmploymentType').val();
    if (employmentType) {
        employmentType = employmentType.toString().trim();
    } else {
        employmentType = '';
    }

    $('#MobileNo').val(MobileNo);

    var email = ($('#Email').val() || '').toString().trim();
    var pincode = sanitizeDriverDigits($('#Pincode').val() || '');
    $('#Pincode').val(pincode);

    var firstInvalid = null;

    if (!code) {
        setDriverError('#Code', '#CodeError', 'Code is required');
        firstInvalid = '#Code';
    }

    if (!name) {
        setDriverError('#Name', '#NameError', 'Name is required');
        if (!firstInvalid) {
            firstInvalid = '#Name';
        }
    }

    if (!MobileNo) {
        setDriverError('#MobileNo', '#MobileNoError', 'MobileNo is required');
        if (!firstInvalid) {
            firstInvalid = '#MobileNo';
        }
    } else if (!/^\d{8,15}$/.test(MobileNo)) {
        setDriverError('#MobileNo', '#MobileNoError', 'MobileNo must be 8 to 15 digits');
        if (!firstInvalid) {
            firstInvalid = '#MobileNo';
        }
    }

    if (email && !isValidDriverEmail(email)) {
        setDriverError('#Email', '#EmailError', 'Enter a valid email');
        if (!firstInvalid) {
            firstInvalid = '#Email';
        }
    }

    if (pincode && !/^\d{4,10}$/.test(pincode)) {
        setDriverError('#Pincode', '#PincodeError', 'Pincode must be 4 to 10 digits');
        if (!firstInvalid) {
            firstInvalid = '#Pincode';
        }
    }

    if (!employmentType) {
        setDriverError('#EmploymentType', '#EmploymentTypeError', 'EmploymentType is required');
        if (!firstInvalid) {
            firstInvalid = '#EmploymentType';
        }
    }

    if (firstInvalid) {
        $(firstInvalid).focus();
        return false;
    }

    return true;
}

function saveDriver() {
    if (window.gcFormValidation && !window.gcFormValidation.validateScope('#driverModal .modal-box', true)) {
        return;
    }

    if (!validateForm()) {
        return;
    }

    setButtonBusy('#btnSaveDriver', true, 'Saving...');

    var DriverId = $('#driverId').val();
    var entityNo = parseInt(sessionStorage.getItem('gcCurrentEntityNo') || '0', 10) || 0;
    var driver = {
        Id: DriverId ? parseInt(DriverId) : 0,
        Code: $('#Code').val() || '',
        Name: $('#Name').val() || '',
        MobileNo: sanitizeDriverDigits($('#MobileNo').val() || ''),
        Email: ($('#Email').val() || '').trim(),
        LicenseNo: $('#LicenseNo').val() || null,
        LicenseExpiryDate: $('#LicenseExpiryDate').val() || null,
        DateofBirth: $('#DateofBirth').val() || null,
        Gender: $('#Gender').val() || null,
        Address: $('#Address').val() || null,
        City: $('#City').val() || null,
        State: $('#State').val() || null,
        Pincode: sanitizeDriverDigits($('#Pincode').val() || '') || null,
        VehicleType: $('#VehicleType').val() || null,
        VehicleNo: $('#VehicleNo').val() || null,
        ExperienceYears: $('#ExperienceYears').val()
            ? parseInt($('#ExperienceYears').val())
            : null,
        JoiningDate: $('#JoiningDate').val() || null,
        IsActive: true,
        IsDeleted: false,
        CreatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        UpdatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        EntityNo: entityNo,
        EmployeeType: $('#EmploymentType').val() || null
    };

    var endpoint = driver.Id ? '/Admin/Driver/update' : '/Admin/Driver/create';

    $.ajax({
        url: endpoint,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(driver),
        success: function (res) {
            if (res && res.success) {
                showToast(DriverId == 0 ? 'Driver saved successfully.' : 'Driver updated successfully', 3000, { type: 'success', title: DriverId == 0 ? 'Saved' : 'Updated' });
                clearDriverForm();
                $('#driverModal').addClass('hidden');
                loadDriver();
            } else {
                setButtonBusy('#btnSaveDriver', false);
                var errorMsg = res && res.message ? res.message : (DriverId == 0 ? 'Unable to save Driver.' : 'Unable to update Driver');
                showToast(errorMsg, 3000, { type: 'error', title: DriverId == 0 ? 'Save failed' : 'Update failed' });
            }
        },
        error: function () {
            setButtonBusy('#btnSaveDriver', false);
            showToast('Save failed.', 3000, { type: 'error', title: 'Save failed' });
        }
    });
}

function editDriver(id) {
    $('#driver-title').text('Edit Driver');
    $.ajax({
        url: '/Admin/Driver/get/' + id,
        type: 'GET',
        success: function (role) {
            if (!role) {
                showToast('Driver not found.', 3000, { type: 'warning', title: 'Not found' });
                return;
            }

            $('#driverId').val(role.Id || role.id || '');
            $('#Code').val(role.Code || role.code || '');
            $('#Name').val(role.Name || role.name || '');
            $('#MobileNo').val(role.MobileNo || role.mobileNo || '');
            $('#Email').val(role.Email || role.email || '');
            $('#Gender').val(role.Gender || role.gender || '');
            $('#EmploymentType').val(role.EmployeeType || role.employeeType || '');
            setActionButtonLabel('#btnSaveDriver', 'Update');
            if (typeof applyPermissionVisibility === 'function') applyPermissionVisibility(document);
            $('#driverModal').removeClass('hidden');
        },
        error: function () { showToast('Unable to load Driver.', 3000, { type: 'error', title: 'Load failed' }); }
    });
}

function deleteDriver(id) {
    if (!id) return;
    showToast('Delete this Driver?', 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Delete',
        noText: 'Cancel',
        onYes: function () {
            $.ajax({
                url: '/Admin/Driver/delete/' + id,
                type: 'POST',
                success: function (res) {
                    if (res && res.success) {
                        showToast('Driver deleted successfully.', 3000, { type: 'success', title: 'Deleted' });
                    } else {
                        showToast('Unable to delete Driver.', 3000, { type: 'error', title: 'Delete failed' });
                    }
                    setTimeout(loadDriver, 300);
                },
                error: function () { showToast('Delete failed.', 3000, { type: 'error', title: 'Delete failed' }); }
            });
        },
        onNo: function () {
            showToast('Delete cancelled.', 3000, { type: 'info', title: 'Cancelled' });
        }
    });
}

function setDriverActive(id, isActive) {
    if (!id) return;

    var confirmMessage = isActive ? 'Mark this Driver active?' : 'Mark this Driver inactive?';
    var successMessage = isActive ? 'Driver activated.' : 'Driver marked inactive.';

    showToast(confirmMessage, 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Yes',
        noText: 'No',
        onYes: function () {
            $.ajax({
                url: '/Admin/Driver/activeinactive/' + id + '?status=' + isActive,
                type: 'POST',
                success: function (res) {
                    if (res && res.success) {
                        showToast(successMessage, 3000, { type: 'success', title: 'Updated' });
                    } else {
                        showToast('Unable to update Driver status.', 3000, { type: 'error', title: 'Update failed' });
                    }
                    setTimeout(loadDriver, 350);
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
