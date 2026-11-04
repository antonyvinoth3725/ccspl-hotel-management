$(function () {

    /* ---- Nav Tab Switching ---- */
    $('.nav-tab').on('click', function () {
        var pg = $(this).data('page');
        $('.nav-tab').removeClass('active');
        $(this).addClass('active');
        showPage(pg);
        syncSidebar(pg);
    });

    /* ---- Sidebar Switching ---- */
    $('.sidebar-item[data-page]').on('click', function () {
        var pg = $(this).data('page');
        $('.sidebar-item').removeClass('active');
        $(this).addClass('active');
        showPage(pg);
        $('.nav-tab').removeClass('active');
        $('.nav-tab[data-page="' + pg + '"]').addClass('active');
    });

    function showPage(id) {
        if (!id) return;
        $('.page').removeClass('active');
        $('#page-' + id).addClass('active');
    }

    function syncSidebar(id) {
        $('.sidebar-item').removeClass('active');
        $('.sidebar-item[data-page="' + id + '"]').addClass('active');
    }

    /* ---- Quick Action Cards ---- */
    $(document).on('click', '.qa-card[data-page]', function () {
        var pg = $(this).data('page');
        showPage(pg);
        syncSidebar(pg);
        $('.nav-tab').removeClass('active');
        $('.nav-tab[data-page="' + pg + '"]').addClass('active');
    });

    /* ---- Modal Open ---- */
    $(document).on('click', '[data-modal]', function () {
        $('#' + $(this).data('modal')).removeClass('hidden');
    });

    /* ---- Modal Close ---- */
    $(document).on('click', '.modal-close', function () {
        $(this).closest('.modal-overlay').addClass('hidden');
    });
    $(document).on('click', '.modal-overlay', function (e) {
        if ($(e.target).hasClass('modal-overlay')) $(this).addClass('hidden');
    });

    /* ---- Table Search ---- */
    $(document).on('keyup', '.tbl-search', function () {
        var val = $(this).val().toLowerCase();
        var tbl = $(this).data('table');
        $('#' + tbl + ' tbody tr').each(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(val) > -1);
        });
    });

    /* ---- Default page ---- */
    showPage('dashboard');
    syncSidebar('dashboard');
});
