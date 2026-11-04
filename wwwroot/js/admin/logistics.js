$(document).ready(function () {
    loadDriverMaster(function () {
        loadPendingOrder();
        $('.js-column-chooser[data-table="DeliveredTable"]').hide();
        //loadDelivered();
    });
});

var driverMaster = [];
var deliveredRows = [];

function displayDate(value) {
    if (!value) return '-';
    var date = new Date(value);
    return isNaN(date.getTime()) ? value : date.toLocaleDateString('en-CA');
}

function displayDateTime(value) {
    if (!value) return '-';
    var date = new Date(value);
    if (isNaN(date.getTime())) return value;

    var datePart = date.toLocaleDateString('en-CA');
    var timePart = date.toLocaleTimeString('en-SG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return datePart + ' ' + timePart;
}

function escapeLogisticsHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeLogisticsImageSrc(value) {
    if (!value) return '';

    var src = String(value).trim();
    if (!src) return '';

    if (/[<>\"'`]/.test(src)) {
        return '';
    }

    if (/^(javascript|vbscript):/i.test(src)) {
        return '';
    }

    if (/^data:/i.test(src)) {
        return /^data:image\/(png|jpe?g|gif|webp|bmp);base64,[a-z0-9+/=\s]+$/i.test(src) ? src : '';
    }

    if (/^https?:\/\//i.test(src) || src.indexOf('/') === 0) {
        return src;
    }

    if (/^[a-z0-9+/=\s]+$/i.test(src)) {
        return 'data:image/jpeg;base64,' + src;
    }

    return '';
}

function loadPendingOrder() {
    showlogiLoader(true);

    $.ajax({
        url: '/Admin/Logistics/get',
        type: 'GET',
        dataType: 'json',
        data: {
            indicator: "logistics"
        },
        success: function (rows) {
            renderLogisList(Array.isArray(rows) ? rows : []);
        },
        error: function () {
            renderLogisList([]);
            showToast('Unable to load Logistics.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showlogiLoader(false);
        }
    });
}

function loadDelivered() {
    showlogiLoader(true);

    $.ajax({
        url: '/Admin/Logistics/getDelivered',
        type: 'GET',
        dataType: 'json',
        success: function (rows) {
            renderLogisDelList(Array.isArray(rows) ? rows : []);
        },
        error: function () {
            renderLogisDelList([]);
            showToast('Unable to load Logistics.', 3000, { type: 'error', title: 'Load failed' });
        },
        complete: function () {
            showlogiLoader(false);
        }
    });
}

function showlogiLoader(show) {
    var $panel = $('.pageloaderpanel');
    if ($panel.length) {
        $('#LogiListPanel .table-wrap').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
        return;
    }
}
function renderLogisList(rows) {

    let html = "";

    rows.forEach(function (item, index) {

        html += `
        <tr>
            <td class="text-center">${index + 1}</td>
            <td><strong style="color:#1d4ed8">${item.orderNumber ?? ""}</strong></td>
            <td>${item.customerName ?? ""}</td>
            <td class="text-nowrap">${displayDate(item.createdDate ?? item.CreatedDate)}</td>
            <td class="text-nowrap">${displayDate(item.eventDate ?? item.EventDate)}</td>
            <td>${item.deliveryAddress ?? ""}</td>

            <td class="driver-cell">
                <select class="form-select driver"
        id="driver_${item.id}">
    ${getDriverDropdown(item.driverId)}
</select>
            </td>

            <td class="action-cell">
                <button class="btn btn-assign btn-sm"
                        onclick="assignDelivery(
    ${item.id},
    '${item.createdDate ?? ""}',
    '${item.orderNumber ?? ""}',
    '${item.deliveryAddress ?? ""}'
)">
                    <span class="btn-assign-icon" aria-hidden="true">📍</span>
                    Assign
                </button>
            </td>
        </tr>`;
    });

    $("#PendingTable tbody").html(html);
    if (typeof renderDataTable === 'function') {
        renderDataTable('PendingTable');
    }
}

function loadDriverMaster(callback) {
    $.ajax({
        url: '/Admin/Driver/get',
        type: 'GET',
        dataType: 'json',
        success: function (res) {
            driverMaster = res || [];

            if (callback) {
                callback();
            }
        },
        error: function () {
            showToast('Unable to load drivers.', 3000,
                { type: 'error', title: 'Error' });
        }
    });
}

function getDriverDropdown(selectedDriverId) {

    var options = '<option value="">Select Driver</option>';

    $.each(driverMaster, function (i, driver) {

        options += `<option value="${driver.id}"
                        ${driver.id == selectedDriverId ? 'selected' : ''}>
                        ${driver.code} - ${driver.name}
                    </option>`;
    });

    return options;
}

function renderLogisDelList(rows) {

    deliveredRows = rows ||[];

    let html = "";

    deliveredRows.forEach(function (item, index) {

        html += `
        <tr>
            <td>${index + 1}</td>
            <td><strong style="color:#1d4ed8">${item.orderNumber ?? ""}</td>
            <td>${item.customerName ?? ""}</td>
            <td>${displayDate(item.orderDate)}</td>
            <td>${item.location ?? ""}</td> 
            <td>${item.driverName ?? ""}</td> 
            <td>${displayDateTime(item.deliveredDate)}</td> 
            <td class="action-cell">
                    <button type="button"
                            class="btn btn-view-delivery btn-sm"
                            onclick="viewDeliveryDetails(${item.id ?? item.Id})">
                        👁 View
                    </button>
                </td>
        </tr>`;
    });

    $("#DeliveredTable tbody").html(html);
    if (typeof renderDataTable === 'function') {
        renderDataTable('DeliveredTable');
    }
}

function viewDeliveryDetails(id) {

    var item = deliveredRows.find(function (x) {
        return x.id == id;
    });

    if (!item) {
        showToast("Delivery details not found.", 3000, {
            type: "error",
            title: "Error"
        });
        return;
    }

    var parcelPhoto = sanitizeLogisticsImageSrc(item.parcelPhoto);
    var customerSignature = sanitizeLogisticsImageSrc(item.customerSignature);

    Swal.fire({
        title: "Delivery Details",
        width: "920px",
        customClass: {
            popup: "delivery-details-modal",
            title: "delivery-details-modal-title",
            confirmButton: "delivery-details-close"
        },
        html: `
            <section class="delivery-details" aria-label="Delivery details">
                <div class="delivery-record-header">
                    <div class="delivery-record-status">
                        <span class="delivery-status-dot"></span>
                        Delivered
                    </div>
                    <span class="delivery-record-caption">Proof of delivery</span>
                </div>

                <dl class="delivery-info">
                    <div class="delivery-info-item">
                        <dt>Order Number</dt>
                        <dd>${escapeLogisticsHtml(item.orderNumber ?? "-")}</dd>
                    </div>
                    <div class="delivery-info-item">
                        <dt>Delivered On</dt>
                        <dd>${escapeLogisticsHtml(displayDateTime(item.deliveredDate))}</dd>
                    </div>
                </dl>

                <div class="delivery-images">
                    <article class="delivery-image-card">
                        <div class="delivery-image-card-header">
                            <span class="delivery-image-card-title">Parcel Photo</span>
                            <span class="delivery-evidence-label">Photo</span>
                        </div>
                        <div class="delivery-image-frame">
                            ${parcelPhoto
                ? `<img src="${parcelPhoto}" class="delivery-preview-image" alt="Parcel photo for order ${escapeLogisticsHtml(item.orderNumber ?? "")}" />`
                : `<div class="no-delivery-image">No parcel photo available</div>`
            }
                        </div>
                    </article>

                    <article class="delivery-image-card">
                        <div class="delivery-image-card-header">
                            <span class="delivery-image-card-title">Customer Signature</span>
                            <span class="delivery-evidence-label">Signature</span>
                        </div>
                        <div class="delivery-image-frame">
                            ${customerSignature
                ? `<img src="${customerSignature}" class="delivery-preview-image" alt="Customer signature for order ${escapeLogisticsHtml(item.orderNumber ?? "")}" />`
                : `<div class="no-delivery-image">No customer signature available</div>`
            }
                        </div>
                    </article>
                </div>
            </section>
        `,
        confirmButtonText: "Close",
        confirmButtonColor: "#0f5b38"
    });
}

function getDeliveryImageHtml(value, title) {

    if (!value) {
        return `
            <div class="delivery-no-image">
                <span>📷</span>
                <div>No ${title} available</div>
            </div>
        `;
    }

    var src = sanitizeLogisticsImageSrc(value);
    var safeTitle = escapeLogisticsHtml(title);

    if (!src) {
        return `
        <div class="delivery-no-image">
            <span>📷</span>
            <div>No ${safeTitle} available</div>
        </div>
    `;
    }

    return `
        <div class="delivery-image-wrapper">
            <img src="${src}"
                 alt="${safeTitle}"
                 class="delivery-preview-image"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">

            <div class="delivery-image-error" style="display:none;">
                Unable to load image
            </div>
        </div>
    `;
}

function assignDelivery(id, OrderDate, OrderNumber, DeliveryAddress) {

    var driver = $("#driver_" + id).val();

    if (driver == "") {
        showToast("Please select a driver.");
        return;
    }

    var Logistics = {
        Id: id ? parseInt(id) : 0,
        OrderDate: OrderDate,
        OrderNumber: OrderNumber,
        Location: DeliveryAddress,
        DriverId: driver,
        Status:0,
        IsActive: true,
        IsDeleted: false,
        CreatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0,
        UpdatedBy: window.getCurrentUserId ? window.getCurrentUserId() : 0
    };

    $.ajax({
        url: "/Admin/Logistics/Create",
        type: "POST",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify(Logistics),
        success: function (response) {
            //if (response.success) {
            //    showToast(response.message, 3000, {
            //        type: "success",
            //        title: "Success"
            //    });
            //    //window.open(response.whatsappUrl, "_blank");
            //    loadPendingOrder();
            //} else {
            //    showToast(response.message, 3000, {
            //        type: "warning",
            //        title: "Warning"
            //    });
            //}

            if (response.success) {
                Swal.fire({
                    icon: "success",
                    title: "Success",
                    text: response.message,
                    confirmButtonText: "OK",
                    confirmButtonColor: "#ff7b00",
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        if (response.sendDriverAccessMessage && response.whatsappUrl) {
                            window.open(response.whatsappUrl, "_blank", "noopener");
                        }
                        loadPendingOrder();
                    }
                });

            } else {

                Swal.fire({
                    icon: "warning",
                    title: "Warning",
                    text: response.message,
                    confirmButtonColor: "#ff7b00"
                });
            }
        },
        error: function () {
            //showToast("Assignment failed.");
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Assignment failed.",
                confirmButtonColor: "#ff7b00"
            });
        }
    });
}

$(function () {

    $("#btnPending").click(function () {

        $(".delivery-tab").removeClass("active");
        $(this).addClass("active");

        $("#pendingSection").show();
        $("#pendingsearch").show();
        $("#deliveredSection").hide();
        $("#deliverysearch").hide();

        $("#btnPending")
            .removeClass("btn-outline-warning")
            .addClass("btn-warning");

        $("#btnDelivered")
            .removeClass("btn-success")
            .addClass("btn-outline-success");

        $('.js-column-chooser[data-table="PendingTable"]').show();
        $('.js-column-chooser[data-table="DeliveredTable"]').hide();

        loadPendingOrder();

    });

    $("#btnDelivered").click(function () {

        $(".delivery-tab").removeClass("active");
        $(this).addClass("active");

        $("#pendingSection").hide();
        $("#pendingsearch").hide();
        $("#deliveredSection").show();
        $("#deliverysearch").show();

        $("#btnDelivered")
            .removeClass("btn-outline-success")
            .addClass("btn-success");

        $("#btnPending")
            .removeClass("btn-warning")
            .addClass("btn-outline-warning");

        $('.js-column-chooser[data-table="PendingTable"]').hide();
        $('.js-column-chooser[data-table="DeliveredTable"]').show();

        loadDelivered();

    });

});
