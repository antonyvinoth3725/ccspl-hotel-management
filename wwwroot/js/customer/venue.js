$(document).ready(function () {
    loadVenues();
});

function loadVenues() {
    $.ajax({
        url: "/Customer/Venue/get",
        type: "GET",
        success: function (data) {
            renderVenues(data);
        },
        error: function () {
            renderVenues([]);
        }
    });
}

function renderVenues(venues) {
    var html = '';
    if (!Array.isArray(venues) || venues.length === 0) {
        html = '<div class="venue-empty-state"><i class="fa-regular fa-calendar-xmark" aria-hidden="true"></i><strong>No service locations are available right now.</strong><span>Please contact us for availability.</span></div>';
    } else {
        html = venues.map(function (item) {
            var locationName = item.locationName || item.LocationName || 'Venue';
            var deliveryZone = item.deliveryZone || item.DeliveryZone || 'N/A';
            var remarks = item.remarks || item.Remarks || 'Function hall and event setup available.';
            var deliveryFee = parseFloat(item.deliveryFee || item.DeliveryFee || 0) || 0;
            var isActive = item.isActive === '1' || item.isActive === 'true' || item.isActive === true || item.IsActive === true;
            var buttonClass = isActive ? 'btn-orange' : 'btn-light disabled';
            var buttonText = isActive ? 'Book Function' : 'Not Available';

            return '<article class="venue-card' + (isActive ? '' : ' venue-card-unavailable') + '">' +
                '<div class="venue-card-top"><span class="venue-location-icon"><i class="fa-solid fa-location-dot" aria-hidden="true"></i></span>' +
                '<span class="venue-availability ' + (isActive ? 'is-available' : '') + '">' + (isActive ? 'Available' : 'Unavailable') + '</span></div>' +
                '<div class="venue-caption"><h3>' + escapeVenueHtml(locationName) + '</h3>' +
                '<p>' + escapeVenueHtml(remarks) + '</p></div>' +
                '<dl class="venue-meta">' +
                '<div><dt>Service Zone</dt><dd>' + escapeVenueHtml(deliveryZone) + '</dd></div>' +
                '<div><dt>Delivery Fee</dt><dd>S$' + deliveryFee.toFixed(2) + '</dd></div>' +
                '</dl>' +
                (isActive
                    ? '<a href="/Customer/Order" class="btn btn-orange venue-book-button"><i class="fa-solid fa-calendar-plus" aria-hidden="true"></i> Book Function</a>'
                    : '<span class="venue-unavailable-note">Currently unavailable</span>') +
                '</article>';
        }).join('');
    }
    $('#venueCards').html(html);
}

function escapeVenueHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
