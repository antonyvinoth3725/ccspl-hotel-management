// Popular & Freebies page - client-side rendering and actions

var packageNameCache = {};
var packageNameRequests = {};

$(document).ready(function () {
    loadPopularFreebies();
    loadFreebiePackages();
    loadFreebieLocations();
});


function loadFreebiePackages(selectedId) {
    return $.ajax({
        url: '/Admin/Packages/get',
        type: 'GET',
        success: function (rows) {
            var $package = $('#freebiePackageId');
            var currentValue = selectedId ?? $package.val() ?? '';

            $package.empty().append(
                $('<option>').val('').text('All packages')
            );

            (Array.isArray(rows) ? rows : []).forEach(function (item) {
                var id = item.id ?? item.Id ?? 0;
                var name = item.name ?? item.Name ?? '';
                var isActive = item.isActive ?? item.IsActive ?? false;
                var isDeleted = item.isDeleted ?? item.IsDeleted ?? false;

                if (id && name && isActive && !isDeleted) {
                    $package.append(
                        $('<option>').val(id).text(name)
                    );
                }
            });

            $package.val(String(currentValue));
        },
        error: function (xhr) {
            showToast(
                xhr.responseJSON?.message || 'Unable to load packages.',
                3000,
                { type: 'error', title: 'Package load failed' }
            );
        }
    });
}


function loadFreebieLocations(selectedId) {
    return $.ajax({
        url: '/Admin/Locations/getAll',
        type: 'GET',
        success: function (rows) {
            var $location = $('#freebieLocationId');
            var currentValue = selectedId ?? $location.val() ?? '';

            $location.empty().append(
                $('<option>').val('').text('All locations')
            );

            (Array.isArray(rows) ? rows : []).forEach(function (item) {
                var id = item.id ?? item.Id ?? 0;
                var name = item.locationName ?? item.LocationName ?? '';
                var isActive = item.isActive ?? item.IsActive ?? false;
                var isDeleted = item.isDeleted ?? item.IsDeleted ?? false;

                if (id && name && isActive && !isDeleted) {
                    $location.append(
                        $('<option>').val(id).text(name)
                    );
                }
            });

            $location.val(String(currentValue));
        },
        error: function (xhr) {
            showToast(
                xhr.responseJSON?.message || 'Unable to load locations.',
                3000,
                { type: 'error', title: 'Location load failed' }
            );
        }
    });
}


function loadPopularFreebies() {
    showFreebiesLoader(true);

    $.ajax({
        url: '/Admin/Freebies/getAll',
        type: 'GET',
        success: function (rows) {
            renderPopularFreebieList(rows || []);
        },
        error: function () {
            renderPopularFreebieList([]);
            showToast(
                'Unable to load freebies.',
                3000,
                {
                    type: 'error',
                    title: 'Load failed'
                }
            );
        },
        complete: function () {
            showFreebiesLoader(false);
        }
    });
}

function showFreebiesLoader(show) {
    var $panel = $('.pageloaderpanel');
    if ($panel.length) {
        $('#freebiesListPanel .table-wrap').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
    }
}


function renderPopularFreebieList(rows) {
    rows = Array.isArray(rows) ? rows : [];

    var html = rows.map(function (item, index) {
        var serial = index + 1;

        var id = item.id ?? item.Id ?? 0;
        var name = item.name ?? item.Name ?? '';
        var packageId = item.packageId ?? item.PackageId ?? '';
        var minPax = item.minPax ?? item.MinPax ?? '';
        var freeQty = item.freeQty ?? item.FreeQty ?? '';
        var locationId =
            item.locationId ??
            item.LocationId ??
            '';

        var displayOrder =
            item.displayOrder ??
            item.DisplayOrder ??
            0;

        var validFrom =
            item.validFrom ??
            item.ValidFrom ??
            '';

        var validTo =
            item.validTo ??
            item.ValidTo ??
            '';

        var remarks =
            item.remarks ??
            item.Remarks ??
            '';

        var active =
            item.isActive ??
            item.IsActive ??
            false;

        var statusBadge = active
            ? '<span class="badge-pill badge-pill--success">Active</span>'
            : '<span class="badge-pill badge-pill--warning">Inactive</span>';

        var actions;

        if (active) {
            actions = `
                <button type="button"
                        class="action-item freebies-action-edit"
                        data-id="${id}"
                        onclick="editPopularFreebie(this.dataset.id)">
                    <span class="action-icon action-icon-text" aria-hidden="true">&#9998;</span>
                    Edit
                </button>

                <button type="button"
                        class="action-item freebies-action-inactive"
                        data-id="${id}"
                        onclick="setPopularFreebieActive(this.dataset.id, false)">
                    <span class="action-icon action-icon-text" aria-hidden="true">&#128274;</span>
                    Inactive
                </button>`;
        } else {
            actions = `
                <button type="button"
                        class="action-item freebies-action-active"
                        data-id="${id}"
                        onclick="setPopularFreebieActive(this.dataset.id, true)">
                    <span class="action-icon action-icon-text" aria-hidden="true">&#128275;</span>
                    Active
                </button>`;
        }

        return `
            <tr>
                <td>${serial}</td>

                <td>
                    <span class="freebie-item-icon">🎁</span>
                    ${escapeHtml(name)}
                </td>

                <td class="package-name-cell" data-package-id="${packageId || ''}">
                    ${packageId ? 'Loading...' : 'All packages'}
                </td>

                <td>${escapeHtml(freeQty)}</td>

                <td>${displayOrder}</td>

                <td>${formatDate(validFrom)}</td>

                <td>${formatDate(validTo)}</td>

                <td>${escapeHtml(remarks)}</td>

                <td>${statusBadge}</td>

                <td>
                    <div class="row-actions freebies-row-actions">
                        <button type="button"
                                class="dots-btn"
                                title="Actions">
                            ⋯
                        </button>

                        <div class="actions-menu hidden">
                            ${actions}

                            <button type="button"
                                    class="action-item freebies-action-delete"
                                    data-id="${id}"
                                    onclick="deletePopularFreebie(this.dataset.id)">
                                <span class="action-icon action-icon-text" aria-hidden="true">&#128465;</span>
                                Delete
                            </button>
                        </div>
                    </div>
                </td>
            </tr>`;
    }).join('');

    $('#popularFreebieList tbody').html(html);

    bindPackageNamesById();

    updateFreebieRecordCount(rows.length);

    if (typeof renderDataTable === 'function') {
        renderDataTable('popularFreebieList');
    }
}


function getTriggerText(
    packageId,
    minPax,
    locationId
) {
    if (packageId) {
        return 'Package ID: ' + packageId;
    }

    if (locationId) {
        return 'Location ID: ' + locationId;
    }

    if (minPax) {
        return 'Minimum ' + minPax + ' pax';
    }

    return 'All packages';
}


function bindPackageNamesById() {
    $('#popularFreebieList .package-name-cell').each(function () {
        var packageId = parseInt($(this).attr('data-package-id'), 10) || 0;

        if (!packageId) {
            $(this).text('All packages');
            return;
        }

        if (packageNameCache[packageId]) {
            $(this).text(packageNameCache[packageId]);
            return;
        }

        if (packageNameRequests[packageId]) {
            return;
        }

        packageNameRequests[packageId] = $.ajax({
            url: '/Admin/Packages/get/' + encodeURIComponent(packageId),
            type: 'GET',
            success: function (item) {
                var name = item?.name ?? item?.Name ?? '';
                packageNameCache[packageId] = name || ('Package ID: ' + packageId);

                $('#popularFreebieList .package-name-cell[data-package-id="' + packageId + '"]')
                    .text(packageNameCache[packageId]);
            },
            error: function () {
                $('#popularFreebieList .package-name-cell[data-package-id="' + packageId + '"]')
                    .text('Package ID: ' + packageId);
            },
            complete: function () {
                delete packageNameRequests[packageId];
            }
        });
    });
}


function clearPopularFreebieForm() {
    $('#popularFreebieId').val('');
    $('#freebieName').val('');
    $('#freebiePackageId').val('');
    $('#freebieMinPax').val('');
    $('#freebieFreeQty').val('');
    $('#freebieLocationId').val('');
    $('#freebieDisplayOrder').val('');
    $('#freebieValidFrom').val('');
    $('#freebieValidTo').val('');
    $('#freebieRemarks').val('');
}


function openPopularFreebieModal() {
    clearPopularFreebieForm();
    $('#popularFreebie-title').text('Create Popular Freebie');

    $('#popularFreebieModal').removeClass('hidden');
}


function closePopularFreebieModal() {
    $('#popularFreebieModal').addClass('hidden');
}


function savePopularFreebie() {
    if (window.gcFormValidation && !window.gcFormValidation.validateScope($('.main').first(), true)) {
        return;
    }

    setButtonBusy('button[onclick="savePopularFreebie()"]', true, 'Saving...');
    var id =
        parseInt($('#popularFreebieId').val()) || 0;

    var name =
        ($('#freebieName').val() || '').trim();

    var displayOrder =
        parseInt($('#freebieDisplayOrder').val()) || 0;

    if (!name) {
        showToast(
            'Name is required.',
            3000,
            {
                type: 'warning',
                title: 'Validation'
            }
        );

        $('#freebieName').focus();
        setButtonBusy('button[onclick="savePopularFreebie()"]', false);
        return;
    }

    if (displayOrder <= 0) {
        showToast(
            'Display Order must be greater than zero.',
            3000,
            {
                type: 'warning',
                title: 'Validation'
            }
        );

        $('#freebieDisplayOrder').focus();
        setButtonBusy('button[onclick="savePopularFreebie()"]', false);
        return;
    }

    var minPax = getNullableInt(
        $('#freebieMinPax').val()
    );

    var validFrom =
        $('#freebieValidFrom').val() || null;

    var validTo =
        $('#freebieValidTo').val() || null;

    if (
        validFrom &&
        validTo &&
        new Date(validFrom) > new Date(validTo)
    ) {
        showToast(
            'Valid From cannot be greater than Valid To.',
            3000,
            {
                type: 'warning',
                title: 'Validation'
            }
        );

        setButtonBusy('button[onclick="savePopularFreebie()"]', false);
        return;
    }

    var popularFreebie = {
        Id: id,
        Name: name,

        PackageId: getNullableInt(
            $('#freebiePackageId').val()
        ),

        MinPax: minPax,
        FreeQty: getNullableInt(
            $('#freebieFreeQty').val()
        ),

        LocationId: getNullableInt(
            $('#freebieLocationId').val()
        ),

        DisplayOrder: displayOrder,

        IsActive: true,

        ValidFrom: validFrom,
        ValidTo: validTo,

        Remarks:
            ($('#freebieRemarks').val() || '').trim(),

        IsDeleted: false,

        CreatedBy: id === 0 ? 1 : undefined,
        CreatedDate:
            id === 0
                ? new Date().toISOString()
                : undefined,

        UpdatedBy: id > 0 ? 1 : null,
        UpdatedDate:
            id > 0
                ? new Date().toISOString()
                : null
    };

    var endpoint = id > 0
        ? '/Admin/Freebies/update'
        : '/Admin/Freebies/create';

    $.ajax({
        url: endpoint,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(popularFreebie),

        success: function (res) {
            if (res && res.success) {
                showToast(
                    res.message ||
                    'Popular Freebie saved successfully.',
                    3000,
                    {
                        type: 'success',
                        title: 'Saved'
                    }
                );

                clearPopularFreebieForm();
                closePopularFreebieModal();
                loadPopularFreebies();
            } else {
                setButtonBusy('button[onclick="savePopularFreebie()"]', false);
                showToast(
                    res?.message ||
                    'Unable to save Popular Freebie.',
                    3000,
                    {
                        type: 'error',
                        title: 'Save failed'
                    }
                );
            }
        },

        error: function (xhr) {
            setButtonBusy('button[onclick="savePopularFreebie()"]', false);
            showToast(
                xhr.responseJSON?.message ||
                xhr.responseText ||
                'Save failed.',
                3000,
                {
                    type: 'error',
                    title: 'Save failed'
                }
            );
        }
    });
}


function editPopularFreebie(id) {
    if (!id) {
        return;
    }

    $('#popularFreebie-title').text('Edit Popular Freebie');

    $.ajax({
        url: '/Admin/Freebies/get/' + id,
        type: 'GET',

        success: function (item) {
            if (!item) {
                showToast(
                    'Popular Freebie not found.',
                    3000,
                    {
                        type: 'warning',
                        title: 'Not found'
                    }
                );

                return;
            }

            $('#popularFreebieId').val(
                item.id ??
                item.Id ??
                ''
            );

            $('#freebieName').val(
                item.name ??
                item.Name ??
                ''
            );

            var selectedPackageId =
                item.packageId ??
                item.PackageId ??
                '';

            if ($('#freebiePackageId option[value="' + selectedPackageId + '"]').length) {
                $('#freebiePackageId').val(String(selectedPackageId));
            } else {
                loadFreebiePackages(selectedPackageId);
            }

            $('#freebieMinPax').val(
                item.minPax ??
                item.MinPax ??
                ''
            );

            $('#freebieFreeQty').val(
                item.freeQty ??
                item.FreeQty ??
                ''
            );

            var selectedLocationId =
                item.locationId ??
                item.LocationId ??
                '';

            if ($('#freebieLocationId option[value="' + selectedLocationId + '"]').length) {
                $('#freebieLocationId').val(String(selectedLocationId));
            } else {
                loadFreebieLocations(selectedLocationId);
            }

            $('#freebieDisplayOrder').val(
                item.displayOrder ??
                item.DisplayOrder ??
                ''
            );

            $('#freebieValidFrom').val(
                formatDateForInput(
                    item.validFrom ??
                    item.ValidFrom
                )
            );

            $('#freebieValidTo').val(
                formatDateForInput(
                    item.validTo ??
                    item.ValidTo
                )
            );

            $('#freebieRemarks').val(
                item.remarks ??
                item.Remarks ??
                ''
            );

            $('#popularFreebieModal')
                .removeClass('hidden');
        },

        error: function (xhr) {
            showToast(
                xhr.responseJSON?.message ||
                'Unable to load Popular Freebie.',
                3000,
                {
                    type: 'error',
                    title: 'Load failed'
                }
            );
        }
    });
}


function setPopularFreebieActive(id, isActive) {
    if (!id) {
        return;
    }

    var confirmMessage = isActive
        ? 'Mark this Popular Freebie active?'
        : 'Mark this Popular Freebie inactive?';

    var successMessage = isActive
        ? 'Popular Freebie activated.'
        : 'Popular Freebie marked inactive.';

    showToast(confirmMessage, 0, {
        confirm: true,
        type: 'warning',
        title: 'Confirm',
        yesText: 'Yes',
        noText: 'No',

        onYes: function () {
            $.ajax({
                url:
                    '/Admin/Freebies/activeinactive' +
                    '?id=' + encodeURIComponent(id) +
                    '&status=' + encodeURIComponent(isActive),

                type: 'POST',

                success: function (res) {
                    if (res && res.success) {
                        showToast(
                            successMessage,
                            3000,
                            {
                                type: 'success',
                                title: 'Updated'
                            }
                        );

                        loadPopularFreebies();
                    } else {
                        showToast(
                            res?.message ||
                            'Unable to update status.',
                            3000,
                            {
                                type: 'error',
                                title: 'Update failed'
                            }
                        );
                    }
                },

                error: function (xhr) {
                    showToast(
                        xhr.responseJSON?.message ||
                        'Request failed.',
                        3000,
                        {
                            type: 'error',
                            title: 'Request failed'
                        }
                    );
                }
            });
        },

        onNo: function () {
            showToast(
                'Action cancelled.',
                3000,
                {
                    type: 'info',
                    title: 'Cancelled'
                }
            );
        }
    });
}


function deletePopularFreebie(id) {
    if (!id) {
        return;
    }

    showToast(
        'Delete this Popular Freebie?',
        0,
        {
            confirm: true,
            type: 'warning',
            title: 'Confirm',
            yesText: 'Delete',
            noText: 'Cancel',

            onYes: function () {
                $.ajax({
                    url:
                        '/Admin/Freebies/delete/' +
                        encodeURIComponent(id),

                    type: 'POST',

                    success: function (res) {
                        if (res && res.success) {
                            showToast(
                                'Popular Freebie deleted successfully.',
                                3000,
                                {
                                    type: 'success',
                                    title: 'Deleted'
                                }
                            );

                            loadPopularFreebies();
                        } else {
                            showToast(
                                res?.message ||
                                'Unable to delete Popular Freebie.',
                                3000,
                                {
                                    type: 'error',
                                    title: 'Delete failed'
                                }
                            );
                        }
                    },

                    error: function (xhr) {
                        showToast(
                            xhr.responseJSON?.message ||
                            'Delete failed.',
                            3000,
                            {
                                type: 'error',
                                title: 'Delete failed'
                            }
                        );
                    }
                });
            },

            onNo: function () {
                showToast(
                    'Delete cancelled.',
                    3000,
                    {
                        type: 'info',
                        title: 'Cancelled'
                    }
                );
            }
        }
    );
}


function getNullableInt(value) {
    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ''
    ) {
        return null;
    }

    var parsedValue = parseInt(value);

    return Number.isNaN(parsedValue)
        ? null
        : parsedValue;
}


function getNullableDecimal(value) {
    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ''
    ) {
        return null;
    }

    var parsedValue = parseFloat(value);

    return Number.isNaN(parsedValue)
        ? null
        : parsedValue;
}


function formatDateForInput(value) {
    if (!value) {
        return '';
    }

    var date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    var year = date.getFullYear();
    var month = String(
        date.getMonth() + 1
    ).padStart(2, '0');

    var day = String(
        date.getDate()
    ).padStart(2, '0');

    return year + '-' + month + '-' + day;
}


function formatDate(value) {
    if (!value) {
        return '';
    }

    var date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleDateString('en-GB');
}


function escapeHtml(value) {
    return $('<div>')
        .text(value ?? '')
        .html();
}


function updateFreebieRecordCount(count) {
    $('#popularFreebieRecordCount').text(
        count + (count === 1
            ? ' record found'
            : ' records found')
    );
}
