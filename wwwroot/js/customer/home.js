// ===== CUSTOMER HOME =====
$(function () {
    // Service card click navigation
    $(document).on('click', '.service-card[data-href]', function () {
        window.location.href = $(this).data('href');
    });
});
