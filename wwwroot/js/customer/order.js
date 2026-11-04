// ===== CUSTOMER ORDER WIZARD =====
$(function () {
    var gstRate = 0;
    var organizationInfo = {};
    var currentStep = 1;
    var state = {
        selectedEvent: '',
        eventName: '',
        eventMinPax: 0,
        eventAdvanceBookingDays: 0,
        customizeMenus: false,
        menuBasedPricing: false,
        pax: 0,
        selectedPackage: '',
        packageName: '-',
        packagePrice: 0,
        step1View: 'packages',
        showPackages: false,
        extraItems: {},
        extraItemNotes: {},
        addons: {},
        utensils: {},
        details: {
            company: '',
            contact: '',
            email: '',
            mobile: '',
            mobile2: '',
            eventDate: '',
            mealPeriodId: '',
            mealPeriod: '',
            consumingTime: '',
            deliveryType: 0,
            locationId: '',
            postal: '',
            customerAddress: '',
            addressLine1: '',
            notes: ''
        }
    };

    var packages = [];
    var events = [];
    var packagesLoading = false;
    var orderSubmitInProgress = false;
    var quotationSendInProgress = false;
    var quotationOrderId = 0;
    var quotationOrderNumber = '';
    var orderSubmitAction = '';
    var savedOrderId = 0;
    var amendmentOrderId = 0;
    var amendmentMealPeriodName = '';
    var amendmentLocationId = null;
    var amendmentPaidAmount = 0;
    var amendmentPaymentLoaded = false;
    var amendmentDetailsLoadedFromApi = false;
    var paymentEmailContextKey = 'gayatri.order.paymentEmailContext';
    var paymentReturnContextKey = 'gayatri.order.paymentReturnContext';
    var signatureCanvas = null;
    var signatureContext = null;
    var signatureDrawing = false;
    var signatureHasInk = false;
    var menuPriceMap = {};
    var menuCatalogByCategoryId = {};
    var menuPriceMapLoading = false;
    var menuPriceMapLoaded = false;
    var customizeCategoryOpenState = {};
    var customizeAccordionRenderIndex = 0;


    function loadOrganizationGst() {
        return $.ajax({
            url: '/Customer/Organization/gst',
            type: 'GET',
            dataType: 'json',
            success: function (organization) {
                organizationInfo = organization || {};
                var configuredRate = Number(organization?.gstRate ?? organization?.GSTRate);

                gstRate = Number.isFinite(configuredRate) && configuredRate >= 0
                    ? configuredRate / 100
                    : 0;

                renderStep();
            },
            error: function () {
                gstRate = 0;
                renderStep();
                showToast('Unable to load GST from Organization.', 3000, {
                    type: 'error',
                    title: 'GST load failed'
                });
            }
        });
    }

    function loadOrderEvents() {
        $.ajax({
            url: '/Customer/Order/events',
            type: 'GET',
            success: function (rows) {
                events = (Array.isArray(rows) ? rows : []).map(function (item) {
                    return {
                        id: String(item.id ?? item.Id ?? ''),
                        name: item.name ?? item.Name ?? 'Event',
                        minPax: Number(item.minPax ?? item.MinPax ?? 0),
                        advanceBookingDays: Math.max(0, Number((item.advanceBookingDays ?? item.AdvanceBookingDays) ?? 0) || 0)
                    };
                }).filter(function (item) { return item.id; });
                if (amendmentOrderId > 0) {
                    var selectedEvent = events.find(function (item) { return item.id === String(state.selectedEvent); });
                    if (selectedEvent) {
                        state.eventName = selectedEvent.name;
                        state.eventMinPax = selectedEvent.minPax;
                        state.eventAdvanceBookingDays = selectedEvent.advanceBookingDays;
                    }
                }
                renderStep();
            },
            error: function () {
                events = [];
                renderStep();
                showToast('Unable to load events.', 3000, { type: 'error', title: 'Event load failed' });
            }
        });
    }

    function loadOrderPackages(eventId) {
        packages = [];
        packagesLoading = true;
        renderStep();
        $.ajax({
            url: '/Customer/Order/events/' + encodeURIComponent(eventId) + '/packages',
            type: 'GET',
            success: function (rows) { renderOrderPackages(rows || []); },
            error: function () {
                renderOrderPackages([]);
                showToast('Unable to load packages for this event.', 3000, { type: 'error', title: 'Package load failed' });
            },
            complete: function () {
                packagesLoading = false;
                if (currentStep === 1 && state.step1View === 'packages') {
                    renderStep(false);
                }
            }
        });
    }

    function toBool(value, defaultValue) {
        if (value === null || value === undefined) {
            return !!defaultValue;
        }
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'number') {
            return value !== 0;
        }
        if (typeof value === 'string') {
            var normalized = value.trim().toLowerCase();
            if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y') {
                return true;
            }
            if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'n' || normalized === '') {
                return false;
            }
        }
        return !!value;
    }

    function normalizeMenuFoodType(value) {
        var normalized = String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
        if (normalized === '1' || normalized === 'veg' || normalized === 'vegetarian') {
            return { key: 'veg', label: 'VEG' };
        }
        if (normalized === '2' || normalized === 'nonveg' || normalized === 'nonvegetarian') {
            return { key: 'non-veg', label: 'NON-VEG' };
        }
        return null;
    }

    function buildMenuFoodTypeBadge(value) {
        var foodType = normalizeMenuFoodType(value);
        return foodType
            ? '<span class="menu-food-type-badge ' + foodType.key + '">' + foodType.label + '</span>'
            : '';
    }

    function resolveMenuFoodType(menu, category) {
        if (!menu) return null;
        var directValue = menu.foodType ?? menu.FoodType;
        if (normalizeMenuFoodType(directValue)) return directValue;

        var sourceCategoryId = String(menu.sourceCategoryId || (category && category.sourceCategoryId) || '');
        var catalogMenu = (menuCatalogByCategoryId[sourceCategoryId] || []).find(function (item) {
            return String(item.id) === String(menu.id || '');
        });
        return catalogMenu ? catalogMenu.foodType : null;
    }

    function updateMenuFoodTypeBadge($select, value) {
        var $wrap = $select.closest('.menu-select-with-type');
        if (!$wrap.length) return;
        $wrap.find('.menu-food-type-badge').remove();
        var badgeHtml = buildMenuFoodTypeBadge(value);
        $wrap.toggleClass('has-food-type', !!badgeHtml);
        if (badgeHtml) $wrap.append(badgeHtml);
    }

    function renderOrderPackages(rows) {
        rows = Array.isArray(rows) ? rows : [];
        packages = rows.filter(function (item) {
            var isActive = toBool(item.isActive ?? item.IsActive, true);
            var isDeleted = toBool(item.isDeleted ?? item.IsDeleted, false);
            return isActive && !isDeleted;
        }).map(function (item) {
            return {
                id: String(item.id ?? item.Id ?? ''),
                name: item.name ?? item.Name ?? 'Package',
                price: Number(item.price ?? item.Price ?? 0),
                desc: item.description ?? item.Description ?? '',
                isEmpty: toBool(item.isEmpty ?? item.IsEmpty, false)
            };
        }).filter(function (item) {
            return item.id !== '';
        });

        renderStep(false);
    }

    var includedChoices = [];
    var includedChoiceSelections = {};
    var includedChoiceDetails = {};
    var skippedCustomizeCategories = {};
    var skippedCustomizeMenuChoices = {};
    var fixedPackageOriginalState = {};
    var fixedMenuPriceToastShown = false;
    var packageCategoriesLoading = false;
    var customizeMenuMinimumQty = 10;

    var extraRows = [];
    var extraGroups = [];
    var additionalMenusLoading = false;
    var additionalMenusLoaded = false;
    var addonRows = [];
    var addOnsLoading = false;
    var addOnsLoaded = false;
    var mealPeriods = [];
    var mealPeriodsLoading = false;
    var mealPeriodsLoaded = false;
    var deliveryZones = [];
    var deliveryZonesLoading = false;
    var deliveryZonesLoaded = false;
    var utensilRows = [];
    var utensilsLoading = false;
    var utensilsLoaded = false;

    function money(value) {
        var amount = Number(value);
        if (!Number.isFinite(amount)) amount = 0;
        return 'S$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function escapeHtml(value) {
        return $('<div>').text(value ?? '').html();
    }

    function escapeHtmlAttribute(value) {
        return escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    var phoneCountries = [
        ['SG','Singapore','65',8,8],['IN','India','91',10,10],['MY','Malaysia','60',9,10],['ID','Indonesia','62',9,12],
        ['AE','United Arab Emirates','971',9,9],['SA','Saudi Arabia','966',9,9],['QA','Qatar','974',8,8],['KW','Kuwait','965',8,8],
        ['BH','Bahrain','973',8,8],['OM','Oman','968',8,8],['US','United States','1',10,10],['CA','Canada','1',10,10],
        ['GB','United Kingdom','44',10,10],['AU','Australia','61',9,9],['NZ','New Zealand','64',8,10],['CN','China','86',11,11],
        ['JP','Japan','81',9,10],['KR','South Korea','82',9,10],['LK','Sri Lanka','94',9,9],['BD','Bangladesh','880',10,10],
        ['PK','Pakistan','92',10,10],['NP','Nepal','977',10,10],['AF','Afghanistan','93',9,9],['ZA','South Africa','27',9,9],
        ['DE','Germany','49',10,11],['FR','France','33',9,9],['IT','Italy','39',9,11],['ES','Spain','34',9,9],
        ['PT','Portugal','351',9,9],['NL','Netherlands','31',9,9],['BE','Belgium','32',9,9],['CH','Switzerland','41',9,9],
        ['AT','Austria','43',10,13],['IE','Ireland','353',9,9],['SE','Sweden','46',9,10],['NO','Norway','47',8,8],
        ['DK','Denmark','45',8,8],['FI','Finland','358',9,10],['PL','Poland','48',9,9],['CZ','Czechia','420',9,9],
        ['GR','Greece','30',10,10],['TR','Turkey','90',10,10],['RU','Russia','7',10,10],['UA','Ukraine','380',9,9],
        ['BR','Brazil','55',10,11],['MX','Mexico','52',10,10],['AR','Argentina','54',10,10],['CL','Chile','56',9,9],
        ['CO','Colombia','57',10,10],['PE','Peru','51',9,9],['PH','Philippines','63',10,10],['TH','Thailand','66',9,9],
        ['VN','Vietnam','84',9,10],['MM','Myanmar','95',8,10],['KH','Cambodia','855',8,9],['HK','Hong Kong','852',8,8],
        ['MO','Macao','853',8,8],['TW','Taiwan','886',9,9],['IL','Israel','972',9,9],['JO','Jordan','962',9,9],
        ['LB','Lebanon','961',7,8],['EG','Egypt','20',10,10],['KE','Kenya','254',9,9],['NG','Nigeria','234',10,10],
        ['GH','Ghana','233',9,9],['TZ','Tanzania','255',9,9],['UG','Uganda','256',9,9],['MU','Mauritius','230',8,8],
        ['FJ','Fiji','679',7,7],['PG','Papua New Guinea','675',8,8],['BN','Brunei','673',7,7],['BT','Bhutan','975',8,8],
        ['MV','Maldives','960',7,7],['IR','Iran','98',10,10],['IQ','Iraq','964',10,10],['SY','Syria','963',9,9],
        ['YE','Yemen','967',9,9],['PS','Palestine','970',9,9],['MA','Morocco','212',9,9],['DZ','Algeria','213',9,9],
        ['TN','Tunisia','216',8,8],['ET','Ethiopia','251',9,9],['ZW','Zimbabwe','263',9,9],['ZM','Zambia','260',9,9],
        ['IS','Iceland','354',7,7],['RO','Romania','40',9,9],['HU','Hungary','36',9,9],['BG','Bulgaria','359',8,9],
        ['HR','Croatia','385',8,9],['RS','Serbia','381',8,9],['SK','Slovakia','421',9,9],['SI','Slovenia','386',8,8],
        ['LT','Lithuania','370',8,8],['LV','Latvia','371',8,8],['EE','Estonia','372',7,8],['CY','Cyprus','357',8,8],
        ['MT','Malta','356',8,8],['LU','Luxembourg','352',8,9],['AL','Albania','355',9,9],['GE','Georgia','995',9,9],
        ['AM','Armenia','374',8,8],['AZ','Azerbaijan','994',9,9],['KZ','Kazakhstan','7',10,10],['UZ','Uzbekistan','998',9,9],
        ['JM','Jamaica','1',10,10],['TT','Trinidad & Tobago','1',10,10],['DO','Dominican Republic','1',10,10],['PR','Puerto Rico','1',10,10],
        ['AD','Andorra','376',6,9],['AO','Angola','244',9,9],['AG','Antigua & Barbuda','1',10,10],['BS','Bahamas','1',10,10],
        ['BB','Barbados','1',10,10],['BY','Belarus','375',9,9],['BZ','Belize','501',7,7],['BJ','Benin','229',8,10],
        ['BO','Bolivia','591',8,8],['BA','Bosnia & Herzegovina','387',8,8],['BW','Botswana','267',7,8],['BF','Burkina Faso','226',8,8],
        ['BI','Burundi','257',8,8],['CV','Cape Verde','238',7,7],['CM','Cameroon','237',9,9],['CF','Central African Republic','236',8,8],
        ['TD','Chad','235',8,8],['KM','Comoros','269',7,7],['CG','Congo','242',9,9],['CD','Congo (DRC)','243',9,9],
        ['CR','Costa Rica','506',8,8],['CI','Cote d’Ivoire','225',10,10],['CU','Cuba','53',8,8],['DJ','Djibouti','253',8,8],
        ['DM','Dominica','1',10,10],['EC','Ecuador','593',9,9],['SV','El Salvador','503',8,8],['GQ','Equatorial Guinea','240',9,9],
        ['ER','Eritrea','291',7,7],['SZ','Eswatini','268',8,8],['GA','Gabon','241',7,8],['GM','Gambia','220',7,7],
        ['GD','Grenada','1',10,10],['GT','Guatemala','502',8,8],['GN','Guinea','224',9,9],['GW','Guinea-Bissau','245',7,9],
        ['GY','Guyana','592',7,7],['HT','Haiti','509',8,8],['HN','Honduras','504',8,8],['KI','Kiribati','686',8,8],
        ['KG','Kyrgyzstan','996',9,9],['LA','Laos','856',8,10],['LS','Lesotho','266',8,8],['LR','Liberia','231',7,9],
        ['LY','Libya','218',9,9],['LI','Liechtenstein','423',7,9],['MG','Madagascar','261',9,9],['MW','Malawi','265',9,9],
        ['ML','Mali','223',8,8],['MH','Marshall Islands','692',7,7],['MR','Mauritania','222',8,8],['FM','Micronesia','691',7,7],
        ['MD','Moldova','373',8,8],['MC','Monaco','377',8,9],['MN','Mongolia','976',8,8],['ME','Montenegro','382',8,8],
        ['MZ','Mozambique','258',9,9],['NA','Namibia','264',9,9],['NR','Nauru','674',7,7],['NI','Nicaragua','505',8,8],
        ['NE','Niger','227',8,8],['KP','North Korea','850',10,10],['MK','North Macedonia','389',8,8],['PW','Palau','680',7,7],
        ['PA','Panama','507',8,8],['PY','Paraguay','595',9,9],['RW','Rwanda','250',9,9],['KN','Saint Kitts & Nevis','1',10,10],
        ['LC','Saint Lucia','1',10,10],['VC','Saint Vincent & Grenadines','1',10,10],['WS','Samoa','685',7,7],['SM','San Marino','378',6,10],
        ['ST','Sao Tome & Principe','239',7,7],['SN','Senegal','221',9,9],['SC','Seychelles','248',7,7],['SL','Sierra Leone','232',8,8],
        ['SB','Solomon Islands','677',7,7],['SO','Somalia','252',8,9],['SS','South Sudan','211',9,9],['SD','Sudan','249',9,9],
        ['SR','Suriname','597',7,7],['TJ','Tajikistan','992',9,9],['TL','Timor-Leste','670',7,8],['TG','Togo','228',8,8],
        ['TO','Tonga','676',7,7],['TM','Turkmenistan','993',8,8],['TV','Tuvalu','688',6,7],['UY','Uruguay','598',8,8],
        ['VU','Vanuatu','678',7,7],['VA','Vatican City','39',9,11],['VE','Venezuela','58',10,10]
    ];
    function findPhoneCountry(iso) { return phoneCountries.find(function (c) { return c[0] === iso; }) || phoneCountries[0]; }
    function parseStoredPhone(value) {
        var digits = String(value || '').replace(/\D/g, '');
        var country = phoneCountries.slice().sort(function (a, b) { return b[2].length - a[2].length; }).find(function (c) { return digits.indexOf(c[2]) === 0 && digits.length - c[2].length >= c[3]; }) || phoneCountries[0];
        return { country: country, local: digits.indexOf(country[2]) === 0 ? digits.slice(country[2].length) : digits };
    }
    function buildCountryOptions(selectedIso) {
        return phoneCountries.map(function (country) {
            return '<option value="' + country[0] + '"'
                + (country[0] === selectedIso ? ' selected' : '')
                + '>+' + country[2] + '</option>';
        }).join('');
    }
    function buildInternationalPhoneNumber(inputSelector, countrySelector) {
        var local = String($(inputSelector).val() || '').replace(/\D/g, '').replace(/^0+/, '');
        var country = findPhoneCountry($(countrySelector).val());
        return local ? '+' + country[2] + ' ' + local : '';
    }
    function phoneLocalDigits(value) { return String(value || '').replace(/\D/g, ''); }
    function isoToDisplayDate(value) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '')); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
    function displayToIsoDate(value) {
        var m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(value || '').trim()); if (!m) return '';
        var date = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        return date.getFullYear() === Number(m[3]) && date.getMonth() === Number(m[2]) - 1 && date.getDate() === Number(m[1]) ? m[3] + '-' + m[2] + '-' + m[1] : '';
    }

    function isCategorySkipped(categoryId) {
        return false;
    }

    function getMenuChoiceSkipKey(categoryId, choiceIndex) {
        return String(categoryId) + ':' + String(choiceIndex);
    }

    function isMenuChoiceSkipped(categoryId, choiceIndex) {
        return false;
    }

    function packageBase() {
        if (state.menuBasedPricing) {
            return includedChoices.reduce(function (categoryTotal, category) {
                if (isCategorySkipped(category.categoryId)) return categoryTotal;

                return categoryTotal + getSelectedIncludedMenuEntries(category).reduce(function (menuTotal, entry) {
                    return menuTotal + (entry.quantity * getMenuUnitPrice(category, entry.menu.id));
                }, 0);
            }, 0);
        }

        return state.pax * state.packagePrice;
    }

    function calculatedSinglePaxRate() {
        if (!state.menuBasedPricing) return state.packagePrice;

        var pax = Math.max(0, parseInt(state.pax, 10) || 0);
        return pax > 0 ? packageBase() / pax : 0;
    }

    function getMenuUnitPrice(category, menuId) {
        menuId = String(menuId || '');
        if (!menuId) {
            return 0;
        }

        var menu = (category && Array.isArray(category.menus) ? category.menus : []).find(function (item) {
            return String(item.id) === menuId;
        });
        var menuPrice = Number(menu && (menu.price ?? menu.Price));

        if (Number.isFinite(menuPrice) && menuPrice >= 0) {
            return menuPrice;
        }

        return Number(menuPriceMap[menuId]) || 0;
    }

    function extraTotal() {
        return extraRows.reduce(function (sum, row) {
            return sum + ((state.extraItems[row.key] || 0) * row.price);
        }, 0);
    }

    function addonTotal() {
        return addonRows.reduce(function (sum, row) {
            return sum + ((state.addons[row.key] || 0) * row.price);
        }, 0);
    }

    function utensilTotal() {
        return utensilRows.reduce(function (sum, row) {
            return sum + ((state.utensils[row.name] || 0) * row.price);
        }, 0);
    }

    function deliveryTotal() {
        if (String(state.details.deliveryType || '') !== '3') {
            return 0;
        }

        var selectedLocationId = String(state.details.locationId || '');
        var selectedZone = deliveryZones.find(function (zone) {
            return zone.id === selectedLocationId;
        });
        return Number(selectedZone && selectedZone.deliveryFee) || 0;
    }

    function gstTotal() {
        var subtotal = packageBase() + extraTotal() + addonTotal() + utensilTotal();
        return subtotal * gstRate;
    }

    function grandTotal() {
        var total = packageBase() + extraTotal() + addonTotal() + utensilTotal() + deliveryTotal() + gstTotal();
        return Math.round(total + Number.EPSILON);
    }

    function updateSummary() {
        // Remove legacy markup when an older compiled Razor view is still being served.
        $('#summaryServiceCharge, #summaryDeposit').closest('.summary-row').remove();
        $('#summaryEvent').text(state.eventName || '-');
        $('#summaryPkg').text(state.packageName || '-');
        $('#summaryPax').text(state.pax);
        $('#summaryPaxRow').toggleClass('hidden', state.customizeMenus);
        $('#summaryBaseLabel').text(state.menuBasedPricing ? 'Custom Menu Value' : 'Package Base');
        $('#summaryAdditionalLabel').text(state.menuBasedPricing ? 'Additional Menu Rates' : 'Additional Menu');
        $('#summaryBase').text(money(packageBase()));
        $('#summaryAdditional').text(money(extraTotal() || 0));
        $('#summaryAddons').text(money(addonTotal() || 0));
        $('#summaryUtensils').text(money(utensilTotal()));
        $('#summaryDelivery').text(money(deliveryTotal()));
        $('#summaryGstLabel').text('GST (' + ((gstRate * 100).toFixed(2).replace(/\.?0+$/, '')) + '%)');
        $('#summaryGst').text(money(gstTotal()));
        $('#summaryTotal').text(money(grandTotal()));
        $('#customMenuValueLabel').text(state.menuBasedPricing ? 'Custom Menu Value' : 'Package Rate');
        $('#orderValueLabel').text(state.menuBasedPricing ? 'Order Value' : 'Package Value');
        $('#singlePaxRate').text(money(calculatedSinglePaxRate()) + ' / pax');
        $('#customMenuValue').text(money(packageBase()));
        $('#orderValue').text(money(grandTotal()));
        var canNavigateBack = currentStep > 1 || (currentStep === 1 && (state.step1View === 'form' || state.showPackages));
        $('#btnTopBack').toggleClass('hidden', !canNavigateBack);
        $('#summaryBackBtn').toggleClass('hidden', !canNavigateBack);
        $('#summaryNextBtn').toggleClass('hidden', currentStep === 6);
        $('#summaryNextBtn').text(currentStep === 1 && state.step1View === 'packages' && !state.showPackages
            ? 'Continue to Packages \u2192'
            : 'Continue \u2192');
        $('#summaryQuoteBtn').toggleClass('hidden', currentStep !== 6 || amendmentOrderId > 0);
        $('#summarySubmitBtn').toggleClass('hidden', currentStep !== 6);
        syncSubmitButtonsState();
    }

    function setButtonLoading($button, isLoading, loadingText) {
        if (!$button || !$button.length) {
            return;
        }

        if (!$button.data('default-text')) {
            $button.data('default-text', $.trim($button.text()));
        }

        if (isLoading) {
            $button.addClass('btn-loading');
            $button.prop('disabled', true);
            $button.html('<span class="btn-loading-spinner" aria-hidden="true"></span><span>' + escapeHtml(loadingText) + '</span>');
            return;
        }

        $button.removeClass('btn-loading');
        $button.prop('disabled', false);
        $button.text($button.data('default-text') || 'Submit');
    }

    function syncSubmitButtonsState(activeAction) {
        if (activeAction) {
            orderSubmitAction = activeAction;
        }

        var $quoteButton = $('#summaryQuoteBtn');
        var $submitButton = $('#summarySubmitBtn');

        if (!orderSubmitInProgress) {
            setButtonLoading($quoteButton, false);
            setButtonLoading($submitButton, false);
            orderSubmitAction = '';
            return;
        }

        if (orderSubmitAction === 'quote') {
            setButtonLoading($quoteButton, true, 'Sending...');
            $submitButton.prop('disabled', true);
        } else {
            setButtonLoading($submitButton, true, 'Submitting...');
            $quoteButton.prop('disabled', true);
        }
    }

    function finishSubmitFlow() {
        orderSubmitInProgress = false;
        syncSubmitButtonsState();
    }

    function resetOrderForNew() {
        $('#orderPaymentModal').addClass('hidden');
        clearPaymentEmailContext();
        finishSubmitFlow();

        currentStep = 1;
        state.step1View = 'packages';
        state.showPackages = false;
        state.selectedEvent = '';
        state.eventName = '';
        state.eventMinPax = 0;
        state.eventAdvanceBookingDays = 0;
        state.customizeMenus = false;
        state.menuBasedPricing = false;
        state.selectedPackage = '';
        state.packageName = '-';
        state.packagePrice = 0;
        state.pax = 0;
        state.extraItems = {};
        state.extraItemNotes = {};
        state.addons = {};
        state.utensils = {};
        state.details = {
            company: '',
            contact: '',
            email: '',
            mobile: '',
            mobile2: '',
            eventDate: '',
            mealPeriodId: '',
            mealPeriod: '',
            consumingTime: '',
            deliveryType: 0,
            locationId: '',
            postal: '',
            customerAddress: '',
            addressLine1: '',
            notes: ''
        };
        savedOrderId = 0;
        quotationOrderId = 0;
        quotationOrderNumber = '';

        packages = [];
        includedChoices = [];
        includedChoiceSelections = {};
        includedChoiceDetails = {};
        skippedCustomizeCategories = {};
        skippedCustomizeMenuChoices = {};
        renderStep();

        window.setTimeout(function () {
            $('#eventType').trigger('focus');
        }, 100);
    }

    function updateSteps() {
        $('.wizard-step').removeClass('active done');
        $('.wizard-step').each(function () {
            var step = parseInt($(this).data('step'), 10);
            var displayStep = parseInt($(this).data('display-step'), 10) || step;
            if (step < currentStep) {
                $(this).addClass('done').find('.wizard-step-num').html('&#10003;');
            } else {
                $(this).find('.wizard-step-num').text(displayStep);
            }
            if (step === currentStep) {
                $(this).addClass('active');
            }
        });
    }

    function showOrderLoader(show) {
        var $panel = $('#orderStepWrap .pageloaderpanel');
        $('#orderStepContent').toggleClass('hidden', show);
        $panel.toggleClass('hidden', !show);
    }

    function initializeCountrySearch() {
        if (typeof $.fn.select2 !== 'function') {
            return;
        }

        $('.phone-country').each(function () {
            var $country = $(this);

            if ($country.hasClass('select2-hidden-accessible')) {
                return;
            }

            $country.select2({
                width: '70px',
                dropdownCssClass: 'phone-country-dropdown',
                minimumResultsForSearch: 0,
                placeholder: 'Search country',
                templateSelection: function (data) {
                    if (!data.id) {
                        return data.text;
                    }

                    return '+' + findPhoneCountry(data.id)[2];
                },
                templateResult: function (data) {
                    if (!data.id) {
                        return data.text;
                    }

                    var country = findPhoneCountry(data.id);
                    return '+' + country[2] + ' ' + country[1];
                },
                matcher: function (params, data) {
                    var search = String(params.term || '').trim().toLowerCase();
                    if (!search) {
                        return data;
                    }

                    var country = findPhoneCountry(data.id);
                    var searchableText = [data.text, data.id, country[1], '+' + country[2]]
                        .join(' ')
                        .toLowerCase();

                    return searchableText.indexOf(search) > -1 ? data : null;
                }
            });
        });
    }

    function renderStep(withLoader) {
        var useLoader = withLoader !== false;

        function doRender() {
            try {
                updateSteps();
                if (currentStep === 1) renderStep1();
                if (currentStep === 2) renderStep2();
                if (currentStep === 3) renderStep3();
                if (currentStep === 4) renderStep4();
                if (currentStep === 5) renderStep5();
                if (currentStep === 6) renderStep6();
                initializeCountrySearch();
                updateSummary();
            } catch (error) {
                if (window.console && typeof window.console.error === 'function') {
                    window.console.error('Failed to render customer order step.', error);
                }
                showOrderLoader(false);
                if (currentStep === 1) {
                   // Direct Customize Menu button is intentionally hidden; IsEmpty packages still use its workflow.
                   $('#orderStepContent').html('<div class="card order-card"><div class="section-label">Select Event</div><div class="order-fields event-order-fields" style="margin-bottom:18px"><div><label>Event Type</label><select id="eventType"><option value="">-- Select Event --</option></select></div><div><label>Min No. of Pax</label><input type="number" id="eventPaxCount" disabled></div><div class="event-selection-note" role="status"><span class="event-selection-note-icon" aria-hidden="true">!</span><div><strong>Please select an event first</strong><span>The pax field will be enabled after your selection.</span></div></div></div></div>');

                } else {
                    $('#orderStepContent').html('<div class="card order-card"><div class="muted">Unable to render this step right now. Please refresh the page.</div></div>');
                }
                updateSummary();
            }
        }

        if (useLoader) {
            showOrderLoader(true);
            setTimeout(doRender, 80);
            return;
        }

        doRender();
    }

    function renderStep1() {
        var html = '';

        if (state.step1View === 'packages') {
            var eventOptions = events.map(function (item) {
                return '<option value="' + item.id + '"' + (item.id === state.selectedEvent ? ' selected' : '') + '>' + escapeHtml(item.name) + '</option>';
            }).join('');

            var packagesPanel = '';
            if (state.selectedEvent && state.showPackages) {
                packagesPanel = '<div class="section-label">Available Packages</div>' +
                    '<div class="muted" style="font-size:13px;margin-bottom:12px">Select a package configured for this event.</div>' +
                    (packagesLoading
                        ? '<div class="event-packages-loader"><div class="spinner"></div><span>Loading packages...</span></div>'
                        : packages.length
                            ? '<div class="pkg-grid">' + packages.map(renderPackageCard).join('') + '</div>'
                            : '<div class="muted">No packages are configured for this event.</div>');
            }

            if (state.showPackages) {
                html = '<div class="card order-card">' +
                    '<div class="selection-details-card"><div class="order-fields selection-details-fields">' +
                    '<div><label>Event Type</label><div class="plain-text-field">' + escapeHtml(state.eventName) + '</div></div>' +
                    '<div><label>No. of Pax</label><div class="plain-text-field">' + escapeHtml(String(state.pax || '')) + '</div></div>' +
                    '<div><label>Event Date</label><div class="plain-text-field">' + escapeHtml(state.details.eventDate || '-') + '</div></div>' +
                    '</div></div>' + packagesPanel + '</div>';
                showOrderLoader(false);
                $('#orderStepContent').html(html);
                return;
            }

            var eventSelectionNote = state.selectedEvent ? '' :
                '<div class="event-selection-note" role="status"><span class="event-selection-note-icon" aria-hidden="true">!</span>' +
                '<div><strong>Please select an event first</strong><span>The pax field will be enabled after your selection.</span></div></div>';

            var firstStepEventDetails = state.selectedEvent
                ? buildEventDetailsCard('Event & Customer Details', 'Complete these details now. You can review or edit them again in the Event Details step.')
                : '';

            html = '<div class="card order-card">' +
                '<div class="section-label">Select Event</div>' +
                '<div class="order-fields event-order-fields" style="margin-bottom:18px"><div><label>Event Type</label><select id="eventType"><option value="">-- Select Event --</option>' + eventOptions + '</select></div>' +
                '<div><label>Min No. of Pax</label><input type="number" id="eventPaxCount" min="' + state.eventMinPax + '" value="' + (state.selectedEvent ? state.pax : '') + '"' + (state.selectedEvent ? '' : ' disabled') + '>' +
                (state.selectedEvent ? '<div class="muted" style="font-size:12px;margin-top:6px">Minimum ' + state.eventMinPax + ' pax required. You can enter any higher number.</div>' : '') + '</div>' +
                // Direct Customize Menu button is intentionally hidden; IsEmpty packages still use its workflow.
                eventSelectionNote + '</div>' +
                firstStepEventDetails +
                packagesPanel +
                '</div>';
            showOrderLoader(false);
            $('#orderStepContent').html(html);
            return;
        }

        html = '<div class="card order-card">' +
            '<div class="section-label">' + (state.customizeMenus ? 'Step 1 - Customize Menu' : 'Step 1 - Select Indian Package') + '</div>' +
            '<div class="selection-details-card"><div class="order-fields selection-details-fields' + (state.customizeMenus ? ' customize-details-fields' : '') + '">' +
            '<div><label>Event Type</label><div class="plain-text-field">' + escapeHtml(state.eventName) + '</div></div>' +
            (state.customizeMenus ? '' : '<div><label>No. of Pax</label><div class="plain-text-field">' + state.pax + '</div></div>') +
            '<div><label>' + (state.customizeMenus ? 'Order Type' : 'Package') + '</label><div class="plain-text-field">' + (state.customizeMenus ? 'Customize Menu' : escapeHtml(state.packageName)) + '</div></div>' +
            '<div><label>GST</label><div class="plain-text-field">' + (gstRate * 100).toFixed(0) + '% GST</div></div>' +
            '</div></div>' +
            '<div class="choice-block' + (state.customizeMenus ? '' : ' fixed-menu-mode') + '"><div class="customize-menu-heading"><div class="section-label">' + (state.customizeMenus ? 'Customize Menu Selection' : ('Package Choice Selection - ' + state.packageName.toUpperCase())) + '</div>' +
            (state.customizeMenus ? '<div class="customize-minimum-rule"><span aria-hidden="true">i</span> Minimum quantity per choice: <strong>' + customizeMenuMinimumQty + '</strong></div>' : '') + '</div>' +
            '<div class="package-value-box' + (state.customizeMenus ? '' : ' has-single-pax-rate') + '">' +
            (state.customizeMenus ? '' : '<div><span>Single Pax Rate</span><b id="singlePaxRate">' + money(calculatedSinglePaxRate()) + ' / pax</b></div>') +
            '<div><span id="customMenuValueLabel">' + (state.menuBasedPricing ? 'Custom Menu Value' : 'Package Rate') + '</span><b id="customMenuValue">' + money(packageBase()) + '</b></div>' +
            '<div><span id="orderValueLabel">' + (state.menuBasedPricing ? 'Order Value' : 'Package Value') + '</span><b id="orderValue">' + (state.menuBasedPricing ? money(grandTotal()) : money(packageBase())) + '</b></div></div>' +
            '<div class="muted" style="font-size:13px">' + (state.menuBasedPricing
                ? 'Customize mode is ON. Price is calculated using selected menu prices multiplied by entered quantities.'
                : 'Fixed mode is ON. Package value uses package rate x pax. You can enter notes for each dish.') + '</div>' +
            (packageCategoriesLoading
                ? '<div class="muted">Loading package categories...</div>'
                : includedChoices.length
                    ? (state.customizeMenus ? (customizeAccordionRenderIndex = 0, includedChoices.map(renderChoiceBlock).join('')) : renderFixedMenuCompact())
                    : '<div class="muted">No categories are configured for this package.</div>') +
            '</div>' +
            '</div>';
        showOrderLoader(false);
        $('#orderStepContent').html(html);
    }

    function renderFixedMenuCompact() {
        var menuRows = [];
        var totalMenus = 0;
        var fixedItemsLabelRendered = false;
        var columnHeadings = '<div class="fixed-menu-column-headings"><span></span><span>Menu</span><span>Qty</span><span>Notes</span></div>';
        var fixedCategories = [];
        var choiceCategories = [];

        includedChoices.forEach(function (category) {
            var menus = Array.isArray(category.menus) ? category.menus : [];
            (menus.length > 1 ? choiceCategories : fixedCategories).push(category);
        });

        fixedCategories.concat(choiceCategories).forEach(function (category) {
            var categoryId = String(category.categoryId);
            var menus = Array.isArray(category.menus) ? category.menus : [];
            var choiceDetails = includedChoiceDetails[categoryId] || [];
            var hasMultipleMenus = menus.length > 1;

            if (!menus.length) {
                return;
            }

            totalMenus += hasMultipleMenus
                ? Math.max(1, choiceDetails.filter(function (details) {
                    return details && details.selected !== false;
                }).length)
                : 1;

            if (!hasMultipleMenus && !fixedItemsLabelRendered) {
                menuRows.push('<div class="fixed-menu-category-label"><span>Fixed Items</span>' +
                    '<small>Included with package &middot; Full quantity</small></div>' + columnHeadings);
                fixedItemsLabelRendered = true;
            }

            if (hasMultipleMenus) {
                var choiceLimit = Math.min(Math.max(1, Number(category.requiredQuantity) || 1), menus.length);
                var selectedQtyTotal = choiceDetails.reduce(function (total, details) {
                    return total + (details && details.selected !== false ? Math.max(0, parseInt(details.qty, 10) || 0) : 0);
                }, 0);
                menuRows.push('<div class="fixed-menu-category-label"><span>' +
                    escapeHtml(category.categoryName || 'Menu choice') + '</span><small>' +
                    (choiceLimit === 1 ? 'Choose 1' : ('Choose up to ' + choiceLimit + ' · <span data-fixed-category-total="' + categoryId + '">Qty total ' + selectedQtyTotal + ' / ' + state.pax + '</span>')) +
                    '</small></div>' + columnHeadings);
            }

            menus.forEach(function (menu, index) {
                var details = choiceDetails[index] || {};
                var isSelected = details.selected !== false;
                var qty = Math.max(0, parseInt(details.qty, 10) || 0);
                var notes = String(details.notes || '');
                var menuName = String(menu.name || 'Not configured');
                var selectedFoodType = resolveMenuFoodType(menu, category);
                var foodTypeBadge = buildMenuFoodTypeBadge(selectedFoodType);
                var originalMenu = (fixedPackageOriginalState[categoryId] || [])[index] || {};
                var originalMenuName = String(originalMenu.menuName || menuName);
                var menuWasChanged = String(originalMenu.menuId || '') !== String(menu.id || '');
                var editMenus = menuCatalogByCategoryId[String(menu.sourceCategoryId || category.sourceCategoryId || '')] || [];
                if (!editMenus.some(function (item) { return String(item.id) === String(menu.id); })) {
                    editMenus = [{ id: String(menu.id), name: menuName, price: Number(menu.price) || 0, foodType: selectedFoodType }].concat(editMenus);
                }
                var menuOptions = editMenus.map(function (item) {
                    return '<option value="' + escapeHtmlAttribute(item.id) + '"' +
                        (String(item.id) === String(menu.id) ? ' selected' : '') + '>' +
                        escapeHtml(item.name) + '</option>';
                }).join('');

                menuRows.push('<div class="fixed-menu-row' + (hasMultipleMenus ? ' multi-menu' : ' single-menu') + '">' +
                    '<label class="fixed-menu-check-wrap"><input type="checkbox" class="fixed-menu-check" data-category-id="' + categoryId + '" data-choice-index="' + index + '"' + (isSelected ? ' checked' : '') + '></label>' +
                    '<div class="fixed-menu-menu-cell"><div class="menu-select-with-type' + (foodTypeBadge ? ' has-food-type' : '') + '"><select class="fixed-menu-select" aria-label="Change ' + escapeHtmlAttribute(menuName) + '" data-category-id="' + categoryId + '" data-choice-index="' + index + '">' + menuOptions + '</select>' + foodTypeBadge + '</div>' +
                    (menuWasChanged
                        ? '<div class="fixed-menu-change-summary"><span>Menu Price: <strong>' + money(getMenuUnitPrice(category, menu.id)) + '</strong></span><span class="fixed-menu-change-divider" aria-hidden="true">|</span><span><strong>' + escapeHtml(originalMenuName) + '</strong></span><span class="fixed-menu-change-arrow" aria-hidden="true">&rarr;</span><span><strong>' + escapeHtml(menuName) + '</strong></span></div>'
                        : '<div class="fixed-menu-menu-price">Menu price: ' + money(getMenuUnitPrice(category, menu.id)) + '</div>') +
                    '</div>' +
                    '<div class="fixed-menu-qty-cell"><input type="number" class="included-menu-qty fixed-menu-qty" min="0" step="1" inputmode="numeric" aria-label="Quantity for ' + escapeHtmlAttribute(menuName) + '" value="' + qty + '" data-category-id="' + categoryId + '" data-choice-index="' + index + '"' + (!hasMultipleMenus ? ' readonly aria-readonly="true" title="Quantity follows pax"' : (isSelected ? '' : ' disabled')) + '></div>' +
                    '<div class="fixed-menu-notes-cell"><input type="text" class="included-menu-notes fixed-menu-note-input" maxlength="500" placeholder="Notes (optional)" aria-label="Notes for ' + escapeHtmlAttribute(menuName) + '" value="' + escapeHtmlAttribute(notes) + '" data-category-id="' + categoryId + '" data-choice-index="' + index + '"></div>' +
                    '</div>');
            });
        });

        if (!menuRows.length) {
            return '<div class="muted">No fixed menus are configured for this package.</div>';
        }

        return '<div class="fixed-menu-board"><div class="fixed-menu-toolbar"><span class="fixed-menu-count">Total dishes: ' + totalMenus + '</span><span class="fixed-menu-help">Choose the required dish only where options are shown</span></div><div class="fixed-menu-flat-list">' + menuRows.join('') + '</div></div>';
    }

    function renderChoiceBlock(category) {
        var requiredQuantity = Number(category.requiredQuantity) || 1;
        var categoryId = String(category.categoryId);
        var selections = includedChoiceSelections[categoryId] || [];
        var choiceDetails = includedChoiceDetails[categoryId] || [];
        var isCustomizeMode = !!state.customizeMenus;
        var isSkipped = false;
        var categoryQuantity = getCategoryQuantity(categoryId, requiredQuantity);
        var quantitiesMeetMinimum = hasValidCategoryQuantities(categoryId, requiredQuantity);
        var selectedChoiceCount = selections.reduce(function (count, menuId, index) {
            return count + (!isMenuChoiceSkipped(categoryId, index) && String(menuId || '').trim() ? 1 : 0);
        }, 0);
        var satisfiedChoiceCount = Array.from({ length: requiredQuantity }, function (_, index) {
            return isMenuChoiceSkipped(categoryId, index) || String(selections[index] || '').trim();
        }).filter(Boolean).length;
        var isCategoryComplete = isSkipped || (satisfiedChoiceCount === requiredQuantity && quantitiesMeetMinimum);
        var isCategoryOpen = isCustomizeCategoryOpen(categoryId, isCategoryComplete);
        var rowsHtml = isSkipped
            ? '<div class="muted" style="font-size:12px">This category is skipped for this order.</div>'
            : Array.from({ length: requiredQuantity }, function (_, index) {
                var selectedId = String(selections[index] || '');
                var details = choiceDetails[index] || {};
                var quantity = selectedId ? Math.max(0, parseInt(details.qty, 10) || 0) : '';
                var notes = String(details.notes || '');
                var isMenuSkipped = isMenuChoiceSkipped(categoryId, index);
                var selectedMenu = (category.menus || []).find(function (menu) {
                    return String(menu.id) === selectedId;
                });
                var selectedInOtherChoices = selections.filter(function (_, selectionIndex) {
                    return selectionIndex !== index;
                }).map(String);
                var selectedOptions = (category.menus || []).filter(function (menu) {
                    return selectedInOtherChoices.indexOf(String(menu.id)) === -1;
                }).map(function (menu) {
                    var menuId = String(menu.id);
                    return '<option value="' + menuId + '" data-food-type="' + escapeHtmlAttribute(menu.foodType ?? '') + '"' + (menuId === selectedId ? ' selected' : '') + '>' + escapeHtml(menu.name) + '</option>';
                }).join('');
                var placeholder = category.menusLoading ? 'Loading menus...' : (category.menus || []).length ? 'Select menu' : 'No menus available';
                var selectedFoodTypeBadge = buildMenuFoodTypeBadge(selectedMenu ? selectedMenu.foodType : null);
                if (!isCustomizeMode) {
                    return '<div class="included-choice-row fixed-mode"><div class="form-group included-choice-menu"><div class="fixed-menu-name-row"><div class="fixed-menu-name">' + escapeHtml(selectedMenu ? selectedMenu.name : (category.menusLoading ? 'Loading menus...' : 'Not configured')) + '</div>' + selectedFoodTypeBadge + '</div></div>' +
                        '<div class="form-group included-choice-notes"><label>Notes</label><input type="text" class="included-menu-notes" maxlength="500" placeholder="Special instructions (optional)" value="' + escapeHtmlAttribute(notes) + '" data-category-id="' + categoryId + '" data-choice-index="' + index + '"></div></div>';
                }

                var selectedMenuPrice = getMenuUnitPrice(category, selectedId);

                return '<div class="included-choice-row' + (isMenuSkipped ? ' menu-choice-skipped' : '') + '"><div class="form-group included-choice-menu"><label>Choice ' + (index + 1) + '</label><div class="menu-select-with-type' + (selectedFoodTypeBadge ? ' has-food-type' : '') + '"><select class="included-menu-select" data-category-id="' + categoryId + '" data-choice-index="' + index + '"' + ((category.menus || []).length && !isMenuSkipped ? '' : ' disabled') + '><option value="">' + placeholder + '</option>' + selectedOptions + '</select>' + selectedFoodTypeBadge + '</div><div class="included-menu-price">Menu price: ' + money(selectedMenuPrice) + '</div></div>' +
                    '<div class="form-group included-choice-qty"><label>Qty</label><input type="number" class="included-menu-qty" min="' + customizeMenuMinimumQty + '" step="1" inputmode="numeric" placeholder="0" value="' + quantity + '" data-category-id="' + categoryId + '" data-choice-index="' + index + '"' + (isMenuSkipped || !selectedId ? ' disabled' : '') + '></div>' +
                    '<div class="form-group included-choice-notes"><label>Notes</label><input type="text" class="included-menu-notes" maxlength="500" placeholder="Special instructions (optional)" value="' + escapeHtmlAttribute(notes) + '" data-category-id="' + categoryId + '" data-choice-index="' + index + '"' + (isMenuSkipped ? ' disabled' : '') + '></div></div>';
            }).join('');
        var headerRight = isCustomizeMode
            ? '<div class="choice-requirements"><div class="choice-requirements-stack"><div class="choice-required-line"><span class="choice-progress-chip' + (selectedChoiceCount === requiredQuantity ? ' is-complete' : '') + '">' + selectedChoiceCount + ' of ' + requiredQuantity + ' selected</span><div class="category-qty-total' + (quantitiesMeetMinimum ? ' valid' : '') + '" data-category-id="' + categoryId + '">' + ('Minimum qty per choice: ' + customizeMenuMinimumQty) + '</div></div></div></div>'
            : '';

        return '<div class="choice-block choice-accordion' + (isCategoryOpen ? ' is-open' : '') + '" data-category-id="' + categoryId + '"><div class="choice-header"><button type="button" class="choice-accordion-toggle" aria-expanded="' + (isCategoryOpen ? 'true' : 'false') + '" data-category-id="' + categoryId + '"><span class="choice-title">' + escapeHtml(category.categoryName) + '</span><span class="choice-chevron" aria-hidden="true"></span></button>' +
            headerRight +
            '</div>' +
            '<div class="choice-accordion-body">' + rowsHtml + '</div></div>';
    }

    function isCustomizeCategoryOpen(categoryId, isComplete) {
        var renderIndex = customizeAccordionRenderIndex++;
        if (Object.prototype.hasOwnProperty.call(customizeCategoryOpenState, categoryId)) {
            return customizeCategoryOpenState[categoryId];
        }
        return renderIndex === 0 && !isComplete;
    }

    function loadMenuPriceMap() {
        if (menuPriceMapLoaded || menuPriceMapLoading) {
            return;
        }

        menuPriceMapLoading = true;
        $.ajax({
            url: '/Customer/Menu/get',
            type: 'GET',
            success: function (rows) {
                menuPriceMap = {};
                menuCatalogByCategoryId = {};
                (Array.isArray(rows) ? rows : []).forEach(function (category) {
                    var categoryId = String(category.id ?? category.Id ?? '');
                    var catalogItems = (Array.isArray(category.items) ? category.items : []).map(function (item) {
                        var menuId = String(item.id ?? item.Id ?? '');
                        var menuPrice = Number(item.price ?? item.Price ?? 0);
                        if (menuId) {
                            menuPriceMap[menuId] = Number.isFinite(menuPrice) ? menuPrice : 0;
                        }
                        return {
                            id: menuId,
                            name: String(item.name ?? item.Name ?? ''),
                            price: Number.isFinite(menuPrice) ? menuPrice : 0,
                            foodType: item.foodType ?? item.FoodType ?? null
                        };
                    }).filter(function (item) {
                        return item.id && item.name;
                    });
                    if (categoryId) menuCatalogByCategoryId[categoryId] = catalogItems;
                });
            },
            error: function () {
                menuPriceMap = {};
                showToast('Unable to load menu prices for customize mode.', 3000, {
                    type: 'warning',
                    title: 'Pricing info'
                });
            },
            complete: function () {
                menuPriceMapLoading = false;
                menuPriceMapLoaded = true;
                if (currentStep === 1 && state.step1View === 'form') {
                    renderStep(false);
                }
            }
        });
    }

    function initializeCategoryChoices(category) {
        var categoryId = String(category.categoryId);
        var requiredQuantity = Number(category.requiredQuantity) || 1;
        var menus = category.menus || [];

        includedChoiceSelections[categoryId] = includedChoiceSelections[categoryId] || [];
        includedChoiceDetails[categoryId] = includedChoiceDetails[categoryId] || [];

        for (var index = 0; index < requiredQuantity; index++) {
            if (!state.customizeMenus && !String(includedChoiceSelections[categoryId][index] || '').trim() && menus.length) {
                var fallbackMenu = menus[index % menus.length];
                includedChoiceSelections[categoryId][index] = String((fallbackMenu || {}).id || '');
            }

            includedChoiceDetails[categoryId][index] = includedChoiceDetails[categoryId][index] || {
                qty: 0,
                notes: ''
            };
        }

        if (state.customizeMenus) {
            for (var customizeIndex = 0; customizeIndex < requiredQuantity; customizeIndex++) {
                var hasSelectedMenu = String(includedChoiceSelections[categoryId][customizeIndex] || '').trim() !== '';
                var savedQuantity = Math.max(0, parseInt(includedChoiceDetails[categoryId][customizeIndex].qty, 10) || 0);
                includedChoiceDetails[categoryId][customizeIndex].qty = hasSelectedMenu
                    ? Math.max(customizeMenuMinimumQty, savedQuantity || customizeMenuMinimumQty)
                    : 0;
            }
            return;
        }

        if (menus.length > 1) {
            for (var fixedIndex = 0; fixedIndex < menus.length; fixedIndex++) {
                if (typeof includedChoiceDetails[categoryId][fixedIndex].selected !== 'boolean') {
                    includedChoiceDetails[categoryId][fixedIndex].selected = fixedIndex === 0;
                }
                includedChoiceDetails[categoryId][fixedIndex].qty = includedChoiceDetails[categoryId][fixedIndex].selected
                    ? Math.max(1, parseInt(includedChoiceDetails[categoryId][fixedIndex].qty, 10) || parseInt(state.pax, 10) || 1)
                    : 0;
            }
            return;
        }

        for (var fixedSingleIndex = 0; fixedSingleIndex < requiredQuantity; fixedSingleIndex++) {
            includedChoiceDetails[categoryId][fixedSingleIndex].selected = true;
            includedChoiceDetails[categoryId][fixedSingleIndex].qty = Math.max(1, parseInt(state.pax, 10) || 1);
        }
    }

    function initializeAllCategoryChoices() {
        includedChoices.forEach(function (category) {
            initializeCategoryChoices(category);
        });
    }

    function restoreCustomizeMenuChoices(savedItems) {
        var nextChoiceIndex = {};

        (Array.isArray(savedItems) ? savedItems : []).forEach(function (item) {
            var categoryId = String(item.categoryId ?? item.CategoryId ?? '');
            var menuId = String(item.menuId ?? item.MenuId ?? '');
            var category = includedChoices.find(function (choiceCategory) {
                return String(choiceCategory.categoryId) === categoryId;
            });

            if (!category || !menuId) return;

            var choiceIndex = nextChoiceIndex[categoryId] || 0;
            if (choiceIndex >= (Number(category.requiredQuantity) || 1)) return;

            includedChoiceSelections[categoryId] = includedChoiceSelections[categoryId] || [];
            includedChoiceDetails[categoryId] = includedChoiceDetails[categoryId] || [];
            includedChoiceSelections[categoryId][choiceIndex] = menuId;
            includedChoiceDetails[categoryId][choiceIndex] = {
                qty: Math.max(customizeMenuMinimumQty, Number(item.qty ?? item.Qty) || customizeMenuMinimumQty),
                notes: String(item.notes ?? item.Notes ?? '')
            };
            nextChoiceIndex[categoryId] = choiceIndex + 1;
        });
    }

    function loadDirectCustomizeMenus(savedItems) {
        packageCategoriesLoading = true;
        includedChoices = [];
        includedChoiceSelections = {};
        includedChoiceDetails = {};
        skippedCustomizeCategories = {};
        skippedCustomizeMenuChoices = {};
        renderStep();

        $.ajax({
            url: '/Customer/Menu/get',
            type: 'GET',
            success: function (rows) {
                var categories = (Array.isArray(rows) ? rows : []).map(function (category) {
                    var categoryId = category.id ?? category.Id ?? 0;
                    var menus = (Array.isArray(category.items) ? category.items : []).map(function (menu) {
                        return {
                            id: String(menu.id ?? menu.Id ?? ''),
                            name: menu.name ?? menu.Name ?? '',
                            price: Number(menu.price ?? menu.Price ?? 0) || 0,
                            foodType: menu.foodType ?? menu.FoodType ?? null
                        };
                    }).filter(function (menu) {
                        return menu.id && menu.name;
                    });

                    return {
                        categoryId: categoryId,
                        categoryName: category.name ?? category.Name ?? '',
                        requiredQuantity: Math.max(1, Number((category.maxChoice ?? category.MaxChoice) ?? 1) || 1),
                        menus: menus,
                        menusLoading: false
                    };
                }).filter(function (category) {
                    return category.categoryId && category.categoryName && category.menus.length;
                });

                includedChoices = categories;
                initializeAllCategoryChoices();
                restoreCustomizeMenuChoices(savedItems);
            },
            error: function () {
                includedChoices = [];
                showToast('Unable to load customize menu categories.', 3000, {
                    type: 'error',
                    title: 'Load failed'
                });
            },
            complete: function () {
                packageCategoriesLoading = false;
                renderStep(false);
            }
        });
    }

    function refreshCategoryChoiceDropdowns(categoryId) {
        categoryId = String(categoryId);
        var category = includedChoices.find(function (item) {
            return String(item.categoryId) === categoryId;
        });
        if (!category) return;

        var selections = includedChoiceSelections[categoryId] || [];
        $('.included-menu-select[data-category-id="' + categoryId + '"]').each(function () {
            var $select = $(this);
            var choiceIndex = Number($select.data('choice-index'));
            var selectedId = String(selections[choiceIndex] || '');
            var selectedInOtherChoices = selections.filter(function (_, index) {
                return index !== choiceIndex;
            }).map(String);

            $select.empty().append($('<option></option>').val('').text('Select menu'));
            (category.menus || []).forEach(function (menu) {
                var menuId = String(menu.id);
                if (selectedInOtherChoices.indexOf(menuId) === -1) {
                    $select.append($('<option></option>')
                        .val(menuId)
                        .text(menu.name)
                        .attr('data-food-type', menu.foodType ?? ''));
                }
            });
            $select.val(selectedId);
        });
    }

    function loadPackageFixedMenus(packageId, savedItems) {
        includedChoices = [];
        skippedCustomizeCategories = {};
        skippedCustomizeMenuChoices = {};
        packageCategoriesLoading = true;
        renderStep();

        $.ajax({
            url: '/Customer/Packages/GetFixedMenusByPackageId',
            type: 'GET',
            data: { packageId: packageId },
            success: function (rows) {
                renderPackageFixedMenus(rows || [], savedItems);
            },
            error: function () {
                renderPackageFixedMenus([], savedItems);
                showToast('Unable to load fixed package menus.', 3000, { type: 'error', title: 'Load failed' });
            }
        });
    }

    function renderPackageFixedMenus(rows, savedItems) {
        rows = Array.isArray(rows) ? rows : [];
        savedItems = Array.isArray(savedItems) ? savedItems : null;
        var groupedMenus = {};
        var choiceGroupIds = {};
        var nextChoiceGroupId = 1;

        rows.forEach(function (item) {
            var fixedMenuId = String(item.foodMenuId ?? item.FoodMenuId ?? item.menuId ?? item.MenuId ?? '');
            var fixedMenuName = String(item.foodMenuName ?? item.FoodMenuName ?? item.menuName ?? item.MenuName ?? '');
            var fixedMenuPrice = Number(item.foodMenuPrice ?? item.FoodMenuPrice ?? item.price ?? item.Price ?? 0);

            if (!fixedMenuId || !fixedMenuName) {
                return;
            }

            var choiceGroupName = String(item.choiceGroupName ?? item.ChoiceGroupName ?? '').trim();
            var isIncludedGroup = choiceGroupName.toLowerCase() === 'included';
            if (isIncludedGroup) {
                choiceGroupName = '';
            }
            var normalizedChoiceGroup = choiceGroupName.toLowerCase();
            if (choiceGroupName && !choiceGroupIds[normalizedChoiceGroup]) {
                choiceGroupIds[normalizedChoiceGroup] = 'choice-group-' + nextChoiceGroupId++;
            }
            var categoryId = choiceGroupName ? choiceGroupIds[normalizedChoiceGroup] : ('menu-' + fixedMenuId);
            if (!groupedMenus[categoryId]) {
                groupedMenus[categoryId] = {
                    categoryId: categoryId,
                    sourceCategoryId: parseInt(item.categoryId ?? item.CategoryId ?? 0, 10) || null,
                    categoryName: choiceGroupName || String(item.categoryName ?? item.CategoryName ?? 'Fixed Menus'),
                    requiredQuantity: 1,
                    isChoiceGroup: !!choiceGroupName,
                    fixedMenu: true,
                    menus: [],
                    menusLoading: false
                };
            }

            groupedMenus[categoryId].menus.push({
                id: fixedMenuId,
                name: fixedMenuName,
                price: fixedMenuPrice,
                foodType: item.foodType ?? item.FoodType ?? null,
                sourceCategoryId: parseInt(item.categoryId ?? item.CategoryId ?? 0, 10) || null
            });
        });

        includedChoices = Object.keys(groupedMenus).map(function (categoryId) {
            var category = groupedMenus[categoryId];
            category.requiredQuantity = category.isChoiceGroup ? category.menus.length : 1;
            return category;
        });

        packageCategoriesLoading = false;
        includedChoiceSelections = {};
        includedChoiceDetails = {};
        fixedPackageOriginalState = {};
        fixedMenuPriceToastShown = false;
        includedChoices.forEach(function (category) {
            var categoryKey = String(category.categoryId);
            var menus = category.menus || [];
            fixedPackageOriginalState[categoryKey] = menus.map(function (menu, index) {
                return {
                    menuId: String(menu.id || ''),
                    menuName: String(menu.name || ''),
                    selected: menus.length === 1 || index === 0
                };
            });
            includedChoiceSelections[categoryKey] = menus.map(function (menu) { return String(menu.id || ''); });
            includedChoiceDetails[categoryKey] = menus.map(function (menu, index) {
                var savedItem = savedItems && savedItems.find(function (item) {
                    return String(item.menuId ?? item.MenuId ?? '') === String(menu.id || '');
                });
                var selected = savedItems ? !!savedItem : (menus.length === 1 || index === 0);
                return {
                    selected: selected,
                    qty: selected ? Math.max(1, Number(savedItem && (savedItem.qty ?? savedItem.Qty)) || parseInt(state.pax, 10) || 1) : 0,
                    notes: selected ? String((savedItem && (savedItem.notes ?? savedItem.Notes)) || '') : ''
                };
            });
        });
        syncMenuBasedPricingWithFixedPackage(true);
        renderStep();
    }

    function renderPackageCard(pkg) {
        var selected = pkg.id === state.selectedPackage;
        var cardClasses = ['pkg-card'];
        if (pkg.isEmpty) cardClasses.push('empty-package');
        if (selected) cardClasses.push('selected');

        return '<div class="' + cardClasses.join(' ') + '" data-package-id="' + pkg.id + '">' +
            (pkg.isEmpty ? '<div class="pkg-custom-badge"><span aria-hidden="true">&#10022;</span> Build Your Own</div>' : '') +
            '<div class="pkg-name">' + escapeHtml(pkg.name) + '</div>' +
            '<div class="pkg-price">S$' + pkg.price.toFixed(2) + '<span>/pax</span></div>' +
            '<div class="pkg-desc" role="button" tabindex="0" aria-expanded="false" title="Click to show full description">' + escapeHtml(pkg.desc) + '</div>' +
            '<button class="btn ' + (selected ? 'btn-orange' : 'btn-primary') + ' select-package-btn">' + (selected ? 'Selected' : 'Select Package') + (pkg.isEmpty && !selected ? '<span class="pkg-btn-arrow" aria-hidden="true">&rarr;</span>' : '') + '</button>' +
            '</div>';
    }

    function renderStep2() {
        if (!additionalMenusLoaded && !additionalMenusLoading) {
            loadAdditionalMenus();
        }
        var html = '<div class="card order-card"><div class="section-label">Step 2 - Additional Menu Items + Qty</div><div class="muted" style="font-size:13px;margin-bottom:16px">This tab is only for extra items the customer wants in addition to the selected package. Only this tab shows item prices because these are additional chargeable items outside the package.</div>' + renderExtraTable() + '</div>';
        showOrderLoader(false);
        $('#orderStepContent').html(html);
    }

    function renderExtraTable() {
        if (additionalMenusLoading) return '<div class="muted">Loading additional menu items...</div>';
        if (!extraGroups.length) return '<div class="data-table-card"><div class="muted" style="padding:18px">No additional items available.</div></div>';

        return extraGroups.map(function (group) {
            var selectedCount = group.items.filter(function (row) { return (state.extraItems[row.key] || 0) > 0; }).length;
            var rows = group.items.map(function (row) {
                var qty = state.extraItems[row.key] || 0;
                var selected = qty > 0;
                var notes = state.extraItemNotes[row.key] || '';
                return '<tr class="' + (selected ? 'selected-row' : '') + '">' +
                    '<td><input type="checkbox" class="extra-check" data-item-id="' + row.key + '"' + (selected ? ' checked' : '') + '></td>' +
                    '<td><strong>' + escapeHtml(row.dish) + '</strong><div class="muted">' + escapeHtml(row.code) + '</div></td>' +
                    '<td>' + escapeHtml(row.type) + '</td>' +
                    '<td class="price-cell">' + money(row.price) + '</td>' +
                    '<td><input class="qty-input extra-qty" data-item-id="' + row.key + '" type="number" min="10" step="1" inputmode="numeric" value="' + qty + '"></td>' +
                    '<td>' + escapeHtml(row.unit) + '</td>' +
                    '<td><input class="extra-item-notes" data-item-id="' + row.key + '" type="text" maxlength="500" placeholder="Notes (optional)" aria-label="Notes for ' + escapeHtmlAttribute(row.dish) + '" value="' + escapeHtmlAttribute(notes) + '"></td>' +
                    '<td class="amount-cell">' + money(qty * row.price) + '</td></tr>';
            }).join('');
            return '<div class="data-table-card" style="margin-bottom:18px"><div class="mini-head"><div><div class="mini-head-title">' + escapeHtml(group.name) + '</div><div class="muted">Optional extra items. Selected: ' + selectedCount + '</div></div><span class="badge badge-quotation">Additional</span></div><table class="item-table extra-items-table"><thead><tr><th>Select</th><th>Dish</th><th>Type</th><th>Guide Price</th><th>Qty</th><th>Unit</th><th>Notes</th><th>Amount</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
        }).join('');
    }

    function loadAdditionalMenus() {

        additionalMenusLoading = true;
        $.ajax({
            url: '/Customer/Packages/additional-menus',
            type: 'GET',
            success: function (rows) {
                extraGroups = (Array.isArray(rows) ? rows : []).map(function (group) {
                    var items = group.items ?? group.Items ?? [];
                    var categoryId = Number((group.categoryId ?? group.CategoryId) ?? 0) || null;
                    return {
                        name: group.categoryName ?? group.CategoryName ?? 'Menu Items',
                        items: items.map(function (item) {
                            return {
                                key: String(item.id ?? item.Id ?? ''),
                                categoryId: categoryId,
                                code: item.code ?? item.Code ?? '',
                                dish: item.name ?? item.Name ?? '',
                                // type: item.foodType ?? item.FoodType ?? '',
                                type: item.foodType == 1 ? "Veg" : item.foodType == 2 ? "Non-Veg" : "Mixed",

                                price: Number(item.price ?? item.Price ?? 0),
                                unit: item.unit ?? item.Unit ?? 'item'
                            };
                        })
                    };
                });
                extraRows = extraGroups.reduce(function (rows, group) { return rows.concat(group.items); }, []);
            },
            error: function (xhr) {
                extraGroups = [];
                extraRows = [];
                showToast(xhr.responseJSON?.message || 'Unable to load additional menu items.', 3000, { type: 'error', title: 'Load failed' });
            },
            complete: function () {
                additionalMenusLoading = false;
                additionalMenusLoaded = true;
                if (currentStep === 2) renderStep();
            }
        });
    }

    function renderStep3() {
        if (!addOnsLoaded && !addOnsLoading) {
            loadAddOns();
        }
        if (!utensilsLoaded && !utensilsLoading) {
            loadOrderUtensils();
        }
        var html = '<div class="card order-card"><div class="section-label">Step 3 - Add-ons / Live Counters / Service</div><div class="muted" style="font-size:13px;margin-bottom:16px">Select optional items. Quantity is enabled for station/service based items.</div><div class="data-table-card"><table class="item-table"><thead><tr><th>Select</th><th>Add-on</th><th>Price</th><th>Qty</th><th>Amount</th></tr></thead><tbody>' +
            addonRows.map(function (row) {
                var qty = state.addons[row.key] || 0;
                return '<tr class="' + (qty > 0 ? 'selected-row' : '') + '"><td><input type="checkbox" class="addon-check" data-addon-id="' + row.key + '"' + (qty > 0 ? ' checked' : '') + '></td><td><strong>' + escapeHtml(row.name) + '</strong><div class="muted">' + escapeHtml(row.code) + '</div></td><td class="price-cell">' + (row.unit.toLowerCase() === 'pax' ? money(row.price) + '/pax' : money(row.price)) + '</td><td><input class="qty-input addon-qty" data-addon-id="' + row.key + '" type="number" min="0" step="1" inputmode="numeric" value="' + qty + '"></td><td class="amount-cell">' + money(qty * row.price) + '</td></tr>';
            }).join('') + (addonRows.length ? '' : '<tr><td colspan="5" class="muted">' + (addOnsLoading ? 'Loading add-ons...' : 'No add-ons available.') + '</td></tr>') + '</tbody></table></div>' +
            buildUtensilsSection() + '</div>';
        showOrderLoader(false);
        $('#orderStepContent').html(html);
    }

    function loadAddOns() {
        addOnsLoading = true;
        $.ajax({
            url: '/Customer/Order/addons',
            type: 'GET',
            success: function (rows) {
                addonRows = (Array.isArray(rows) ? rows : []).map(function (item) {
                    return {
                        key: String(item.id ?? item.Id ?? ''),
                        code: item.code ?? item.Code ?? '',
                        name: item.addOnName ?? item.AddOnName ?? '',
                        unit: item.unitType ?? item.UnitType ?? 'item',
                        price: Number(item.rate ?? item.Rate ?? 0)
                    };
                }).filter(function (item) {
                    return item.key && item.name;
                });
            },
            error: function (xhr) {
                addonRows = [];
                showToast(xhr.responseJSON?.message || 'Unable to load add-ons.', 3000, { type: 'error', title: 'Load failed' });
            },
            complete: function () {
                addOnsLoading = false;
                addOnsLoaded = true;
                if (currentStep === 3) renderStep();
            }
        });
    }

    function getConsumingTimePickerParts(value) {
        var match = /^(\d{2}):(\d{2})/.exec(String(value || ''));
        var date = new Date();
        var hour24 = match ? parseInt(match[1], 10) : date.getHours();
        var minute = match ? parseInt(match[2], 10) : Math.floor(date.getMinutes() / 15) * 15;
        if (![0, 15, 30, 45].includes(minute)) {
            minute = Math.round(minute / 15) * 15;
            if (minute === 60) {
                minute = 0;
                hour24 = (hour24 + 1) % 24;
            }
        }
        return {
            hour: hour24 % 12 || 12,
            minute: minute,
            period: hour24 < 12 ? 'AM' : 'PM'
        };
    }

    function formatConsumingTime(value) {
        if (!value) return '';
        var match = /^(\d{2}):(\d{2})/.exec(String(value));
        if (!match) return '';
        var hour24 = parseInt(match[1], 10);
        var minute = parseInt(match[2], 10);
        if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) return '';
        return String(hour24 % 12 || 12).padStart(2, '0') + ':' +
            String(minute).padStart(2, '0') + ' ' + (hour24 < 12 ? 'AM' : 'PM');
    }

    function parseConsumingTime(value) {
        var text = String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
        var match = /^(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)$/.exec(text);
        if (!match) return null;

        var hour = parseInt(match[1], 10);
        var minute = parseInt(match[2], 10);
        var period = match[3];
        if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

        var hour24 = hour % 12 + (period === 'PM' ? 12 : 0);
        return {
            value: String(hour24).padStart(2, '0') + ':' + String(minute).padStart(2, '0'),
            display: String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0') + ' ' + period
        };
    }

    function buildConsumingTimePicker(value) {
        var parts = getConsumingTimePickerParts(value);
        var hours = [];
        var minutes = [];
        var periods = [];
        for (var hour = 1; hour <= 12; hour++) {
            hours.push('<button type="button" class="consuming-time-option' + (hour === parts.hour ? ' selected' : '') + '" data-unit="hour" data-value="' + hour + '">' + String(hour).padStart(2, '0') + '</button>');
        }
        [0, 15, 30, 45].forEach(function (minute) {
            minutes.push('<button type="button" class="consuming-time-option' + (minute === parts.minute ? ' selected' : '') + '" data-unit="minute" data-value="' + minute + '">' + String(minute).padStart(2, '0') + '</button>');
        });
        ['AM', 'PM'].forEach(function (period) {
            periods.push('<button type="button" class="consuming-time-option' + (period === parts.period ? ' selected' : '') + '" data-unit="period" data-value="' + period + '">' + period + '</button>');
        });
        return '<div class="consuming-time-picker hidden" data-hour="' + parts.hour + '" data-minute="' + parts.minute + '" data-period="' + parts.period + '">' +
            '<div class="consuming-time-column"><div class="consuming-time-column-title">Hour</div>' + hours.join('') + '</div>' +
            '<div class="consuming-time-column"><div class="consuming-time-column-title">Minute</div>' + minutes.join('') + '</div>' +
            '<div class="consuming-time-column"><div class="consuming-time-column-title">Period</div>' + periods.join('') + '</div></div>';
    }

    function buildEventDetailsCard(sectionTitle, sectionHelp) {
        if (!mealPeriodsLoaded && !mealPeriodsLoading) {
            loadMealPeriods();
        }
        if (!deliveryZonesLoaded && !deliveryZonesLoading) {
            loadDeliveryZones();
        }
        var d = state.details;
        var isSelfService = String(d.deliveryType || '') === '2';
        var isDelivery = String(d.deliveryType || '') === '3';
        if (isSelfService) {
            d.locationId = '';
        }
        var minimumEventDate = getMinimumEventDate();
        if (d.eventDate && d.eventDate < minimumEventDate) {
            d.eventDate = '';
        }
        var mealPeriodOptions = mealPeriods.map(function (period) {
            return '<option value="' + period.id + '"' + (String(d.mealPeriodId) === period.id ? ' selected' : '') + '>' + escapeHtml(period.name) + '</option>';
        }).join('');
        var mealPeriodPlaceholder = mealPeriodsLoading ? 'Loading meal periods...' : (mealPeriods.length ? 'Select meal period' : 'No meal periods available');
        var deliveryZoneOptions = deliveryZones.map(function (zone) {
            return '<option value="' + zone.id + '"' + (String(d.locationId) === zone.id ? ' selected' : '') + '>' + escapeHtml(zone.name) + ' &mdash; ' + money(zone.deliveryFee) + '</option>';
        }).join('');
        var deliveryZonePlaceholder = isSelfService
            ? 'Not required for Self Service'
            : (deliveryZonesLoading ? 'Loading delivery zones...' : (deliveryZones.length ? 'Select delivery zone' : 'No delivery zones available'));
        var selectedDeliveryZone = deliveryZones.find(function (zone) { return String(zone.id) === String(d.locationId || ''); });
        var deliveryTypeCards = '<div class="form-group delivery-service-field"><div class="delivery-section-title">Getting it to you</div><label>How should we serve it? <span class="field-required">*</span></label>' +
            '<div class="delivery-choice-grid" role="radiogroup" aria-label="How should we serve your order?">' +
            '<label class="delivery-choice-card' + (String(d.deliveryType) === '3' ? ' selected' : '') + '"><input type="radio" class="delivery-type-choice" name="deliveryTypeChoice" value="3"' + (String(d.deliveryType) === '3' ? ' checked' : '') + '><span><strong>We deliver &amp; set up</strong><small>Fee by zone</small></span></label>' +
            '<label class="delivery-choice-card' + (String(d.deliveryType) === '2' ? ' selected' : '') + '"><input type="radio" class="delivery-type-choice" name="deliveryTypeChoice" value="2"' + (String(d.deliveryType) === '2' ? ' checked' : '') + '><span><strong>Self collection</strong><small>No delivery fee</small></span></label>' +
            '</div><select id="detailDeliveryType" class="form-control delivery-type-native" aria-hidden="true" tabindex="-1"><option value="">Select delivery type</option><option value="2"' + (String(d.deliveryType) === '2' ? ' selected' : '') + '>Self Service</option><option value="3"' + (String(d.deliveryType) === '3' ? ' selected' : '') + '>Delivery</option></select><div class="field-error hidden" id="detailDeliveryTypeError"></div></div>';
        var html = '<div class="event-details-early"><div class="section-label">' + escapeHtml(sectionTitle || 'Step 4 - Event and Customer Details') + '</div>' +
            (sectionHelp ? '<div class="muted event-details-early-help">' + escapeHtml(sectionHelp) + '</div>' : '') +
            '<div class="form-row col2">' +
            '<div class="form-group"><label>Customer / Company Name <span class="field-required">*</span></label><input id="detailCompany" class="form-control" value="' + d.company + '"><div class="field-error hidden" id="detailCompanyError"></div></div>' +
            '<div class="form-group"><label>Contact Person <span class="field-required">*</span></label><input id="detailContact" class="form-control" value="' + d.contact + '"><div class="field-error hidden" id="detailContactError"></div></div>' +
            '<div class="form-group"><label>Mobile / WhatsApp <span class="field-required">*</span></label><div class="international-phone-input"><select id="detailMobileCountry" class="phone-country" aria-label="Mobile country code">' + buildCountryOptions(parseStoredPhone(d.mobile).country[0]) + '</select><input id="detailMobile" class="form-control" type="tel" inputmode="numeric" maxlength="15" autocomplete="tel-national" placeholder="Enter mobile number" value="' + escapeHtmlAttribute(parseStoredPhone(d.mobile).local) + '"></div><div class="field-error hidden" id="detailMobileError"></div></div>' +
            '<div class="form-group"><label>Alternate Mobile No </label><div class="international-phone-input"><select id="detailMobile2Country" class="phone-country" aria-label="Alternate mobile country code">' + buildCountryOptions(parseStoredPhone(d.mobile2).country[0]) + '</select><input id="detailMobile2" class="form-control" type="tel" inputmode="numeric" maxlength="15" placeholder="Enter alternate number" value="' + escapeHtmlAttribute(parseStoredPhone(d.mobile2).local) + '"></div><div class="field-error hidden" id="detailMobile2Error"></div></div>' +
            '<div class="form-group"><label>Email <span class="field-required">*</span></label><input id="detailEmail" class="form-control" type="email" inputmode="email" autocomplete="email" placeholder="Enter email address" value="' + d.email + '"><div class="field-error hidden" id="detailEmailError"></div></div>' +
            '<div class="form-group"><label>Event Date <span class="field-required">*</span></label><div class="event-date-wrap"><input id="detailDateText" class="form-control" type="text" inputmode="numeric" maxlength="10" autocomplete="off" placeholder="dd-mm-yyyy" value="' + isoToDisplayDate(d.eventDate) + '"><span class="event-date-toggle" aria-hidden="true">&#128197;</span><input id="detailDate" class="native-event-date" type="date" min="' + minimumEventDate + '" data-advance-booking-days="' + state.eventAdvanceBookingDays + '" value="' + d.eventDate + '" aria-label="Choose event date"></div><div class="field-hint">Type a date (for example, 25-12-2026) or select using the calendar.</div><div class="field-error hidden" id="detailDateError"></div></div>' +
            '<div class="form-group"><label>Meal Period <span class="field-required">*</span></label><select id="detailPeriod" class="form-control"' + (mealPeriods.length ? '' : ' disabled') + '><option value="">' + mealPeriodPlaceholder + '</option>' + mealPeriodOptions + '</select><div class="field-error hidden" id="detailPeriodError"></div></div>' +
            '<div class="form-group"><label for="detailConsumingTime">Consuming Time <span class="field-required">*</span></label><div class="consuming-time-wrap"><input id="detailConsumingTime" class="form-control" type="text" maxlength="11" autocomplete="off" aria-describedby="detailConsumingTimeHint detailConsumingTimeError" placeholder="hh:mm AM/PM" data-time="' + escapeHtmlAttribute(String(d.consumingTime || '').slice(0, 5)) + '" value="' + escapeHtmlAttribute(formatConsumingTime(d.consumingTime)) + '"><button type="button" class="consuming-time-toggle" aria-label="Choose consuming time"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5v5l3.25 2"></path></svg></button>' + buildConsumingTimePicker(d.consumingTime) + '</div><div class="field-hint" id="detailConsumingTimeHint">Type a time (for example, 06:30 PM) or select using the clock.</div><div class="field-error hidden" id="detailConsumingTimeError"></div></div>' +
            deliveryTypeCards +
            '<div class="form-group delivery-only-field' + (!isDelivery ? ' hidden' : '') + '"><label for="detailDeliveryZone">Delivery Zone <span class="field-required">*</span></label><select id="detailDeliveryZone" class="form-control"' + (!isDelivery || !deliveryZones.length ? ' disabled' : '') + '><option value="">' + deliveryZonePlaceholder + '</option>' + deliveryZoneOptions + '</select><div class="delivery-fee-note' + (isDelivery && selectedDeliveryZone ? '' : ' hidden') + '" id="deliveryFeeNote">' + (selectedDeliveryZone ? 'Delivery fee ' + money(selectedDeliveryZone.deliveryFee) + ' &mdash; added to your total now, not at checkout.' : '') + '</div><div class="field-error hidden" id="detailDeliveryZoneError"></div></div>' +
            '<div class="form-group event-address-field"><label for="detailCustomerAddress">Customer Address <span class="field-required">*</span></label><textarea class="form-control" id="detailCustomerAddress" name="CustomerAddress" rows="2" placeholder="Enter customer address">' + escapeHtml(d.customerAddress || '') + '</textarea><div class="field-error hidden" id="detailCustomerAddressError"></div></div>' +
            '<div class="form-group event-address-field delivery-only-field' + (!isDelivery ? ' hidden' : '') + '"><label for="detailAddressLine1">Delivery Address <span class="field-required">*</span></label><textarea class="form-control" id="detailAddressLine1" name="DeliveryAddress" rows="2" placeholder="Enter delivery address">' + escapeHtml(d.addressLine1 || '') + '</textarea><div class="field-error hidden" id="detailAddressLine1Error"></div></div>' +
            '<div class="form-group delivery-only-field' + (!isDelivery ? ' hidden' : '') + '"><label for="detailPostal">Delivery Postal Code <span class="field-required">*</span></label><input id="detailPostal" class="form-control" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]{5,6}" autocomplete="postal-code" placeholder="Enter 6-digit postal code" value="' + escapeHtml(d.postal || '') + '"><div class="field-error hidden" id="detailPostalError"></div></div>' +
            '</div><div class="form-group"><label>Notes</label><textarea id="detailNotes" rows="3">' + d.notes + '</textarea></div></div>';
        return html;
    }

    function renderStep4() {
        var html = '<div class="card order-card">' + buildEventDetailsCard('Step 4 - Event and Customer Details', '') + '</div>';
        showOrderLoader(false);
        $('#orderStepContent').html(html);
    }

    function loadMealPeriods() {
        mealPeriodsLoading = true;
        $.ajax({
            url: '/Customer/Order/meal-periods',
            type: 'GET',
            success: function (rows) {
                mealPeriods = (Array.isArray(rows) ? rows : []).filter(function (item) {
                    var isActive = toBool(item.isActive ?? item.IsActive, true);
                    var isDeleted = toBool(item.isDeleted ?? item.IsDeleted, false);
                    return isActive && !isDeleted;
                }).sort(function (left, right) {
                    return Number(left.displayOrder ?? left.DisplayOrder ?? 0) - Number(right.displayOrder ?? right.DisplayOrder ?? 0);
                }).map(function (item) {
                    return {
                        id: String(item.id ?? item.Id ?? ''),
                        name: item.mealPeriodName ?? item.MealPeriodName ?? ''
                    };
                }).filter(function (item) {
                    return item.id && item.name;
                });
                if (amendmentOrderId > 0 && !state.details.mealPeriodId && amendmentMealPeriodName) {
                    var selectedPeriod = mealPeriods.find(function (item) {
                        return item.name.toLowerCase() === amendmentMealPeriodName.toLowerCase();
                    });
                    if (selectedPeriod) {
                        state.details.mealPeriodId = selectedPeriod.id;
                        state.details.mealPeriod = selectedPeriod.name;
                    }
                }
            },
            error: function (xhr) {
                mealPeriods = [];
                var message = xhr.responseJSON?.detail || xhr.responseJSON?.message || 'Unable to load meal periods.';
                showToast(message, 4000, { type: 'error', title: 'Meal period load failed' });
            },
            complete: function () {
                mealPeriodsLoading = false;
                mealPeriodsLoaded = true;
                if (currentStep === 4 || (currentStep === 1 && state.step1View === 'packages' && state.selectedEvent)) renderStep(false);
            }
        });
    }

    function loadDeliveryZones() {
        deliveryZonesLoading = true;
        $.ajax({
            url: '/Customer/Order/delivery-zones',
            type: 'GET',
            success: function (rows) {
                deliveryZones = (Array.isArray(rows) ? rows : []).map(function (item) {
                    return {
                        id: String(item.id ?? item.Id ?? ''),
                        name: item.deliveryZone ?? item.DeliveryZone ?? '',
                        deliveryFee: Number(item.deliveryFee ?? item.DeliveryFee ?? 0) || 0
                    };
                }).filter(function (item) {
                    return item.id && item.name;
                });
            },
            error: function (xhr) {
                deliveryZones = [];
                var message = xhr.responseJSON?.detail || xhr.responseJSON?.message || 'Unable to load delivery zones.';
                showToast(message, 4000, { type: 'error', title: 'Delivery zone load failed' });
            },
            complete: function () {
                deliveryZonesLoading = false;
                deliveryZonesLoaded = true;
                if (currentStep === 4 || (currentStep === 1 && state.step1View === 'packages' && state.selectedEvent)) renderStep(false);
            }
        });
    }

    function renderStep5() {
        if (!utensilsLoaded && !utensilsLoading) {
            loadOrderUtensils();
        }
        var html = '<div class="card order-card">' + buildUtensilsSection() + '</div>';
        showOrderLoader(false);
        $('#orderStepContent').html(html);
    }

    function buildUtensilsSection() {
        return '<div class="combined-utensils-section"><div class="section-label">Utensils and Equipment</div><div class="muted" style="font-size:13px;margin-bottom:16px">Utensil quantity can be auto-suggested from admin/kitchen configuration, then adjusted manually.</div><div class="actions" style="margin-bottom:14px"><button class="btn btn-primary" id="suggestUtensilsBtn">Use Suggested Qty</button><button class="btn btn-light" id="clearUtensilsBtn">Clear Utensils</button></div><div class="data-table-card"><table class="item-table"><thead><tr><th>Item</th><th>Suggested</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>' +
            (utensilsLoading
                ? '<tr><td colspan="5" class="muted">Loading utensils...</td></tr>'
                : utensilRows.map(function (row) {
                    row.suggested = calculateUtensilSuggestedQty(row);
                    var qty = state.utensils[row.name] || 0;
                    return '<tr class="' + (qty > 0 ? 'selected-row' : '') + '"><td><strong>' + row.name + '</strong><div class="muted">' + row.unit + '</div></td><td>' + row.suggested + '</td><td><input class="qty-input utensil-qty" data-id="' + row.id + '" data-name="' + row.name + '" type="number" min="0" max="' + row.suggested + '" step="1" inputmode="numeric" value="' + qty + '"></td><td class="price-cell">' + money(row.price) + '</td><td class="amount-cell">' + money(qty * row.price) + '</td></tr>';
                }).join('') + (utensilRows.length ? '' : '<tr><td colspan="5" class="muted">No utensils available.</td></tr>')) + '</tbody></table></div></div>';
    }

    function calculateUtensilSuggestedQty(row, calculatingIds) {


        calculatingIds = calculatingIds || {};

        if (calculatingIds[row.id]) {
            return Math.max(0, Number(row.minimumQty) || 0);
        }

        calculatingIds[row.id] = true;

        var baseQty = Number(state.pax) || 0;
        var ruleType = String(row.ruleType || 'PAX').trim().toUpperCase();
        var operator = String(row.ruleOperator || 'SAME').trim().toUpperCase();
        var ruleValue = Number(row.ruleValue) || 0;
        var rulePercentage = Number(row.rulePercentage) || 0;

        if (ruleType === 'CHAFING_DISH_QTY') {
            var chafingDish = utensilRows.find(function (item) {
                return item.id !== row.id &&
                    String(item.ruleType || '').trim().toUpperCase() === 'PAX' &&
                    String(item.name || '').trim().toUpperCase().includes('CHAFING');
            });

            baseQty = chafingDish
                ? calculateUtensilSuggestedQty(chafingDish, calculatingIds)
                : 0;
        }

        var suggested;
        switch (operator) {
            case 'ADD':
                suggested = baseQty + ruleValue;
                break;
            case 'MULTIPLY':
                suggested = baseQty * ruleValue;
                break;
            case 'DIVIDE':
                suggested = ruleValue > 0 ? baseQty / ruleValue : 0;
                break;
            case 'PERCENTAGE':
                suggested = baseQty + (baseQty * rulePercentage / 100);
                break;
            case 'FIXED':
                suggested = ruleValue;
                break;
            case 'SAME':
            default:
                suggested = baseQty;
                break;
        }

        delete calculatingIds[row.id];

        suggested = Number.isFinite(suggested) ? Math.ceil(suggested) : 0;
        return Math.max(suggested, Number(row.minimumQty) || 0, 0);
    }

    function loadOrderUtensils() {

        utensilsLoading = true;
        $.ajax({
            url: '/Customer/Order/utensils',
            type: 'GET',
            dataType: 'json',
            success: function (rows) {
                utensilRows = (Array.isArray(rows) ? rows : []).filter(function (item) {
                    var isActive = toBool(item.isActive ?? item.IsActive, true);
                    var isDeleted = toBool(item.isDeleted ?? item.IsDeleted, false);
                    return isActive && !isDeleted;
                }).map(function (item) {
                    var ruleType = String(item.ruleType ?? item.RuleType ?? 'PAX').trim().toUpperCase();
                    var ruleOperator = String(item.ruleOperator ?? item.RuleOperator ?? 'SAME').trim().toUpperCase();
                    var ruleValue = Number(item.ruleValue ?? item.RuleValue ?? 0);
                    var rulePercentage = Number(item.rulePercentage ?? item.RulePercentage ?? 0);
                    var minimumQty = Number(item.minimumQty ?? item.MinimumQty ?? 0);
                    return {
                        id: String(item.id ?? item.Id ?? ''),
                        name: item.utensilName ?? item.UtensilName ?? '',
                        unit: 'per pc',
                        ruleType: ruleType,
                        ruleOperator: ruleOperator,
                        ruleValue: ruleValue,
                        rulePercentage: rulePercentage,
                        minimumQty: minimumQty,
                        ruleLabel: item.ruleDescription ?? item.RuleDescription ?? 'Manual',
                        suggested: 0,
                        price: Number(item.price ?? item.Price ?? 0)
                    };
                }).filter(function (item) {
                    return item.id && item.name;
                });
            },
            error: function (xhr) {
                utensilRows = [];
                var response = xhr && xhr.responseJSON ? xhr.responseJSON : {};
                showToast(response.detail || response.message || 'Unable to load utensils.', 3000, { type: 'error', title: 'Load failed' });
            },
            complete: function () {
                utensilsLoading = false;
                utensilsLoaded = true;
                if (currentStep === 3 || currentStep === 5) renderStep(false);
            }
        });
    }

    function getSelectedIncludedMenuEntries(category) {
        var categoryId = String(category.categoryId);
        var choiceDetails = includedChoiceDetails[categoryId] || [];
        var menus = Array.isArray(category.menus) ? category.menus : [];
        var entries = [];

        if (state.customizeMenus) {
            var selections = includedChoiceSelections[categoryId] || [];
            selections.forEach(function (menuId, choiceIndex) {
                if (isMenuChoiceSkipped(categoryId, choiceIndex)) return;

                var menu = menus.find(function (item) {
                    return String(item.id) === String(menuId || '');
                });
                var details = choiceDetails[choiceIndex] || {};
                var quantity = Math.max(0, parseInt(details.qty, 10) || 0);

                if (!menu || quantity <= 0) return;
                entries.push({ menu: menu, details: details, quantity: quantity });
            });
            return entries;
        }

        menus.forEach(function (menu, index) {
            var details = choiceDetails[index] || {};
            if (details.selected === false) return;
            entries.push({
                menu: menu,
                details: details,
                quantity: Math.max(0, parseInt(details.qty, 10) || 0)
            });
        });
        return entries;
    }

    function buildReviewDetails(title, rows) {
        return '<div class="review-detail-block"><strong class="review-detail-title">' + escapeHtml(title) + '</strong>' +
            rows.map(function (row) {
                return '<div class="review-detail-row"><span class="review-detail-label">' + escapeHtml(row[0]) +
                    '</span><span class="review-detail-colon">:</span><span class="review-detail-value">' +
                    escapeHtml(row[1] || '-') + '</span></div>';
            }).join('') + '</div>';
    }

    function renderStep6() {
        var includedRows = [];
        includedChoices.forEach(function (category) {
            if (isCategorySkipped(category.categoryId)) return;

            getSelectedIncludedMenuEntries(category).forEach(function (entry) {
                var notes = String(entry.details.notes || '').trim();
                var unitPrice = getMenuUnitPrice(category, entry.menu.id);
                var itemAmount = entry.quantity * unitPrice;
                // Included package quantity is intentionally hidden on the review screen.
                // Previous row markup (kept for future reference):
                // includedRows.push('<tr><td>' + escapeHtml(category.categoryName || '-') + '</td><td>' +
                //     escapeHtml(entry.menu.name || '-') + '</td><td>' + entry.quantity + '</td><td>' +
                //     escapeHtml(notes || '-') + '</td>' + (state.menuBasedPricing
                //         ? '<td>' + money(unitPrice) + '</td><td>' + money(itemAmount) + '</td>'
                //         : '<td><span class="badge badge-paid">Included</span></td>') + '</tr>');
                includedRows.push('<tr><td>' + escapeHtml(category.categoryName || '-') + '</td><td>' +
                    escapeHtml(entry.menu.name || '-') + '</td><td>' + escapeHtml(notes || '-') + '</td>' +
                    (state.menuBasedPricing
                        ? '<td>' + money(unitPrice) + '</td><td>' + money(itemAmount) + '</td>'
                        : '<td><span class="badge badge-paid">Included</span></td>') + '</tr>');
            });
        });

        var extraReviewRows = extraRows.filter(function (row) {
            return (state.extraItems[row.key] || 0) > 0;
        }).map(function (row) {
            var qty = state.extraItems[row.key] || 0;
            // Additional item Unit is intentionally hidden on the review screen.
            // Previous row markup (kept for future reference):
            // return '<tr><td>' + escapeHtml(row.dish) + '</td><td>' + escapeHtml(row.type) + '</td><td>' + qty +
            //     '</td><td>' + escapeHtml(row.unit) + '</td><td>' + escapeHtml(state.extraItemNotes[row.key] || '-') + '</td><td>' + money(row.price) + '</td><td>' + money(qty * row.price) + '</td></tr>';
            return '<tr><td>' + escapeHtml(row.dish) + '</td><td>' + escapeHtml(row.type) + '</td><td>' + qty +
                '</td><td>' + escapeHtml(state.extraItemNotes[row.key] || '-') + '</td><td>' + money(row.price) + '</td><td>' + money(qty * row.price) + '</td></tr>';
        }).join('');

        var addonReviewRows = addonRows.filter(function (row) {
            return (state.addons[row.key] || 0) > 0;
        }).map(function (row) {
            var qty = state.addons[row.key] || 0;
            return '<tr><td>' + escapeHtml(row.name) + '</td><td>' + escapeHtml(row.unit) + '</td><td>' + qty +
                '</td><td>' + money(row.price) + '</td><td>' + money(qty * row.price) + '</td></tr>';
        }).join('');

        var utensilReviewRows = utensilRows.filter(function (row) {
            return (state.utensils[row.name] || 0) > 0;
        }).map(function (row) {
            var qty = state.utensils[row.name] || 0;
            return '<tr><td>' + escapeHtml(row.name) + '</td><td>' + qty +
                '</td><td>' + money(row.price) + '</td><td>' + money(qty * row.price) + '</td></tr>';
        }).join('');

        var organizationName = organizationInfo.name ?? organizationInfo.Name ?? 'Gayatri Restaurant';
        var organizationUen = organizationInfo.uen ?? organizationInfo.UEN ?? '-';
        var organizationEmail = organizationInfo.email ?? organizationInfo.Email ?? '-';
        var organizationHotline = organizationInfo.hotline ?? organizationInfo.Hotline ?? '-';
        var organizationWhatsapp = organizationInfo.whatsapp ?? organizationInfo.Whatsapp ?? '-';
        var amendmentSettlementRows = '';
        if (amendmentOrderId > 0) {
            var amendmentBalanceDue = Math.max(0, grandTotal() - amendmentPaidAmount);
            var amendmentRefundDue = Math.max(0, amendmentPaidAmount - grandTotal());
            amendmentSettlementRows = '<tr><td>Previously Paid</td><td>' + money(amendmentPaidAmount) + '</td></tr>' +
                (amendmentBalanceDue > 0
                    ? '<tr><td>Balance Due</td><td>' + money(amendmentBalanceDue) + '</td></tr>'
                    : '') +
                (amendmentRefundDue > 0
                    ? '<tr><td><strong>Refund Due</strong></td><td><strong>' + money(amendmentRefundDue) + '</strong></td></tr>'
                    : '');
        }

        // Additional item Unit header is intentionally hidden on the review screen.
        // Previous section markup (kept for future reference):
        // var extraReviewSection = extraReviewRows
        //     ? '<section class="review-section"><div class="review-table-title">Additional Chargeable Menu Items</div><div class="review-table-wrap"><table class="item-table review-table"><thead><tr><th>Item</th><th>Type</th><th>Qty</th><th>Unit</th><th>Notes</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>' + extraReviewRows + '</tbody></table></div></section>'
        //     : '';
        var extraReviewSection = extraReviewRows
            ? '<section class="review-section"><div class="review-table-title">Additional Chargeable Menu Items</div><div class="review-table-wrap"><table class="item-table review-table"><thead><tr><th>Item</th><th>Type</th><th>Qty</th><th>Notes</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>' + extraReviewRows + '</tbody></table></div></section>'
            : '';
        var addonReviewSection = addonReviewRows
            ? '<section class="review-section"><div class="review-table-title">Add-ons</div><div class="review-table-wrap"><table class="item-table review-table"><thead><tr><th>Add-on</th><th>Unit</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>' + addonReviewRows + '</tbody></table></div></section>'
            : '';
        var utensilReviewSection = utensilReviewRows
            ? '<section class="review-section"><div class="review-table-title">Utensils / Equipment</div><div class="review-table-wrap"><table class="item-table review-table"><thead><tr><th>Item</th><th>Qty</th><th>Rental</th><th>Amount</th></tr></thead><tbody>' + utensilReviewRows + '</tbody></table></div></section>'
            : '';

        // Included package Qty header/cell count is intentionally hidden on the review screen.
        // Previous section markup (kept for future reference):
        // var includedReviewSection = '<section class="review-section"><div class="review-table-title">Included Package Dish Choices</div><div class="review-table-wrap"><table class="item-table review-table"><thead><tr><th>Category</th><th>Dish</th><th>Qty</th><th>Notes</th>' + (state.menuBasedPricing ? '<th>Unit Price</th><th>Amount</th>' : '<th>Status</th>') + '</tr></thead><tbody>' + (includedRows.join('') || '<tr><td colspan="' + (state.menuBasedPricing ? '6' : '5') + '" class="muted">No package dishes selected.</td></tr>') + '</tbody></table></div></section>';
        var includedReviewSection = '<section class="review-section"><div class="review-table-title">Included Package Dish Choices</div><div class="review-table-wrap"><table class="item-table review-table"><thead><tr><th>Category</th><th>Dish</th><th>Notes</th>' + (state.menuBasedPricing ? '<th>Unit Price</th><th>Amount</th>' : '<th>Status</th>') + '</tr></thead><tbody>' + (includedRows.join('') || '<tr><td colspan="' + (state.menuBasedPricing ? '5' : '4') + '" class="muted">No package dishes selected.</td></tr>') + '</tbody></table></div></section>';

        var html = '<div class="review-sheet report-review" id="orderReviewReport">' +
            '<div class="review-top"><div class="review-brand"><img class="review-logo" src="/images/logo.jpg" alt="' + escapeHtml(organizationName) + ' logo"></div><div class="review-line"><div class="review-title">' + escapeHtml(organizationName) + '</div>UEN: ' + escapeHtml(organizationUen) + '<br>Email: ' + escapeHtml(organizationEmail) + '<br>Hotline: ' + escapeHtml(organizationHotline) + ' &nbsp;|&nbsp; WhatsApp: ' + escapeHtml(organizationWhatsapp) + '</div></div>' +
            '<div class="review-quote-meta"><strong>Quotation Request</strong><span>Date: ' + new Date().toLocaleDateString('en-SG') + '</span><span>Status: Draft</span></div>' +
            '<div class="review-split">' +
            buildReviewDetails('Customer', [['Name', state.details.company], ['Contact', state.details.contact], ['Email', state.details.email], ['Mobile', state.details.mobile], ['Alternate Mobile', state.details.mobile2], ['Address', state.details.customerAddress]]) +
            buildReviewDetails('Event', [['Type', state.eventName], ['Date', state.details.eventDate], ['Meal Period', state.details.mealPeriod], ['Consuming Time', formatConsumingTime(state.details.consumingTime)], ['Delivery Type', getDeliveryTypeName(state.details.deliveryType)], ['Pax', String(state.pax || '-')], ['Delivery Address', buildDeliveryAddress()], ['Notes', state.details.notes]]) +
            '</div>' +
            '<section class="review-section"><div class="review-table-title">Package Details</div><div class="review-table-wrap"><table class="item-table review-table"><thead><tr><th>Package</th><th>Rate</th><th>Pax</th><th>Amount</th></tr></thead><tbody><tr><td>' + escapeHtml(state.packageName || '-') + '</td><td>' + (state.menuBasedPricing ? 'Custom menu pricing' : (money(state.packagePrice) + '/pax')) + '</td><td>' + state.pax + '</td><td>' + money(packageBase()) + '</td></tr></tbody></table></div></section>' +
            includedReviewSection +
            extraReviewSection + addonReviewSection + utensilReviewSection +
            '<section class="review-section review-payment-section"><div class="review-table-title">Payment Summary</div><div class="review-table-wrap"><table class="item-table review-table review-payment-table"><tbody><tr><td>Package Base</td><td>' + money(packageBase()) + '</td></tr><tr><td>Additional Menu</td><td>' + money(extraTotal()) + '</td></tr><tr><td>Add-ons</td><td>' + money(addonTotal()) + '</td></tr><tr><td>Utensils / Setup</td><td>' + money(utensilTotal()) + '</td></tr><tr><td>Delivery Amount</td><td>' + money(deliveryTotal()) + '</td></tr><tr><td>GST (' + (gstRate * 100).toFixed(0) + '%)</td><td>' + money(gstTotal()) + '</td></tr><tr class="review-grand-total"><td>Revised Total</td><td>' + money(grandTotal()) + '</td></tr>' + amendmentSettlementRows + '</tbody></table></div></section></div>';
        showOrderLoader(false);
        $('#orderStepContent').html(html);
    }

    function generateOrderNumber() {
        var datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        var randomPart = Math.floor(Math.random() * 900) + 100;
        return 'GC-' + datePart + '-' + randomPart;
    }

    function buildDeliveryAddress() {
        return String(state.details.addressLine1 || '').trim();
    }

    function getDeliveryTypeName(deliveryType) {
        return {
            '1': 'Buffet',
            '2': 'Self Service',
            '3': 'Delivery'
        }[String(deliveryType || '')] || '-';
    }

    function buildOrderPayload(orderStatus, digitalSignature) {
        var customerName = String(state.details.company || state.details.contact || '').trim();
        var customerMobile = String(state.details.mobile || '').trim();
        var orderTotal = grandTotal();
        var paidAmount = amendmentOrderId > 0 ? amendmentPaidAmount : 0;
        var refundedAmount = amendmentOrderId > 0 ? Math.max(0, paidAmount - orderTotal) : 0;
        var order = {
            id: amendmentOrderId > 0 ? amendmentOrderId : 0,
            orderNumber: generateOrderNumber(),
            customerId: 0,
            packageId: parseInt(state.selectedPackage, 10) || null,
            eventId: parseInt(state.selectedEvent, 10) || null,
            mealPeriodId: parseInt(state.details.mealPeriodId, 10) || null,
            locationId: parseInt(state.details.locationId, 10) || null,
            eventDate: state.details.eventDate || null,
            deliveryAddress: buildDeliveryAddress(),
            notes: state.details.notes,
            pax: state.pax,
            packageBaseAmount: packageBase(),
            additionalMenuAmount: extraTotal(),
            addOnsAmount: addonTotal(),
            utensilsAmount: utensilTotal(),
            serviceCharge: 0,
            subTotal: packageBase() + extraTotal() + addonTotal() + utensilTotal() + deliveryTotal(),
            discount: 0,
            deliveryFee: deliveryTotal(),
            taxAmount: gstTotal(),
            totalAmount: orderTotal,
            taxPercentage: gstRate * 100,
            paidAmount: paidAmount,
            balanceAmount: Math.max(0, orderTotal - paidAmount),
            refundedAmount: refundedAmount,
            refundStatus: refundedAmount > 0 ? 2 : 1,
            paymentStatus: paidAmount <= 0 ? 0 : (paidAmount >= orderTotal ? 2 : 1),
            orderStatus: parseInt(orderStatus, 10) || 0,
            digitalSignature: digitalSignature || null,
            createdDate: new Date().toISOString(),
            createdBy: null,
            updatedDate: null,
            updatedBy: null
        };

        var packageDetails = [];
        includedChoices.forEach(function (category) {
            var categoryId = String(category.categoryId);
            if (isCategorySkipped(categoryId)) {
                return;
            }
            getSelectedIncludedMenuEntries(category).forEach(function (entry) {
                var qty = entry.quantity;
                if (qty <= 0) return;

                packageDetails.push({
                    categoryId: parseInt(category.sourceCategoryId ?? category.categoryId, 10) || null,
                    menuId: parseInt(entry.menu.id, 10) || null,
                    qty: qty,
                    notes: String(entry.details.notes || '').trim() || null,
                    isActive: true,
                    isDeleted: false
                });
            });
        });

        var extraItems = extraRows.filter(function (row) {
            return (state.extraItems[row.key] || 0) > 0;
        }).map(function (row) {
            var qty = state.extraItems[row.key] || 0;
            return {
                categoryId: row.categoryId,
                menuId: parseInt(row.key, 10) || null,
                qty: qty,
                unitPrice: row.price,
                totalAmount: qty * row.price,
                notes: String(state.extraItemNotes[row.key] || '').trim() || null,
                isActive: true,
                isDeleted: false
            };
        });

        var addOns = addonRows.filter(function (row) {
            return (state.addons[row.key] || 0) > 0;
        }).map(function (row) {
            var qty = state.addons[row.key] || 0;
            return {
                addOnsId: parseInt(row.key, 10) || 0,
                qty: qty,
                unitPrice: row.price,
                totalAmount: qty * row.price,
                isActive: true,
                isDeleted: false
            };
        });

        var utensils = utensilRows.filter(function (row) {
            return (state.utensils[row.name] || 0) > 0;
        }).map(function (row) {
            var qty = state.utensils[row.name] || 0;
            return {
                utensilsId: parseInt(row.id, 10) || 0,
                qty: qty,
                unitPrice: row.price,
                totalAmount: qty * row.price,
                refundableDeposit: 0,
                isActive: true,
                isDeleted: false
            };
        });

        return {
            customer: {
                id: 0,
                name: customerName,
                mobileNo: customerMobile,
                alternateMobileNo: String(state.details.mobile2 || '').trim() || null,
                emailId: state.details.email || null,
                address: state.details.customerAddress || null,
                pincode: state.details.postal || null,
                remarks: state.details.notes || null,
                isActive: true,
                isDeleted: false
            },
            order: order,
            event: {
                eventDate: state.details.eventDate || null,
                mobileNo: customerMobile || null,
                alternateMobileNo: String(state.details.mobile2 || '').trim() || null,
                customerAddress: state.details.customerAddress || null,
                deliveryAddress: buildDeliveryAddress() || null,
                deliveryPincode: String(state.details.postal || '').trim() || null,
                locationId: parseInt(state.details.locationId, 10) || null,
                notes: state.details.notes || null,
                mealPeriodId: parseInt(state.details.mealPeriodId, 10) || null,
                consumingTime: state.details.consumingTime ? state.details.consumingTime + ':00' : null,
                deliveryType: parseInt(state.details.deliveryType, 10) || null,
                isActive: true,
                isDeleted: false
            },
            packageDetails: packageDetails,
            extraItems: extraItems,
            addOns: addOns,
            utensils: utensils
        };
    }

    function validateOrderForm() {
        if (!validateStep(1, true)) {
            currentStep = 1;
            renderStep();
            return false;
        }

        if (!validateStep(4, true)) {
            currentStep = 4;
            renderStep();
            return false;
        }

        return true;
    }

    function submitOrder(orderStatus, digitalSignature, quotationChannel) {
        if (orderSubmitInProgress) {
            return;
        }

        if (!validateOrderForm()) {
            return;
        }

        var isQuotation = parseInt(orderStatus, 10) === 5;
        var whatsappWindow = null;

        if (isQuotation && (quotationChannel === 'whatsapp' || quotationChannel === 'both')) {
            whatsappWindow = window.open('about:blank', '_blank');
        }

        if (savedOrderId > 0) {
            if (isQuotation) {
                showToast('This order has already been saved. Please complete or retry its payment.', 4000, {
                    type: 'warning',
                    title: 'Order already saved'
                });
                return;
            }

            orderSubmitInProgress = true;
            syncSubmitButtonsState('submit');
            openPaymentForSavedOrder(savedOrderId);
            return;
        }

        orderSubmitInProgress = true;
        syncSubmitButtonsState(isQuotation ? 'quote' : 'submit');
        if (isQuotation && quotationChannel) {
            setQuotationSendState(true, quotationChannel);
        }

        var orderRequest = buildOrderPayload(orderStatus, digitalSignature);

        $.ajax({
            url: amendmentOrderId > 0 ? '/Admin/Orders/CreateAmendmentOrder' : '/Customer/Order/save',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(orderRequest),
            success: function (response) {
                if (response && response.success) {
                    savedOrderId = parseInt(response.id, 10) || 0;

                    if (amendmentOrderId > 0) {
                        sessionStorage.removeItem('gayatri.amendmentOrder');
                        var savedTotalAmount = Number(response.totalAmount ?? response.TotalAmount);
                        var savedPaidAmount = Number(response.paidAmount ?? response.PaidAmount);
                        var savedBalanceAmount = Number(response.balanceAmount ?? response.BalanceAmount);
                        var amendmentTotal = Number.isFinite(savedTotalAmount) ? savedTotalAmount : grandTotal();
                        var amendmentPaid = Number.isFinite(savedPaidAmount) ? savedPaidAmount : amendmentPaidAmount;
                        var amendmentBalance = Number.isFinite(savedBalanceAmount)
                            ? Math.max(0, savedBalanceAmount)
                            : Math.max(0, amendmentTotal - amendmentPaid);
                        var amendmentRefundDue = Math.max(0, amendmentPaid - amendmentTotal);
                        showToast(amendmentRefundDue > 0
                            ? 'Amendment saved. Refund due: ' + money(amendmentRefundDue) + '.'
                            : (response.message || 'Amendment order created successfully.'), 4000, {
                                type: amendmentRefundDue > 0 ? 'warning' : 'success',
                                title: amendmentRefundDue > 0 ? 'Refund due' : 'Amendment saved'
                            });

                        if (!isQuotation && amendmentBalance > 0) {
                            openAmendmentPayment(savedOrderId, amendmentBalance, amendmentTotal, amendmentPaid);
                        } else {
                            setTimeout(function () {
                                window.location.href = '/Admin/Orders';
                            }, 800);
                        }
                        return;
                    }

                    if (isQuotation) {
                        quotationOrderId = savedOrderId;
                        quotationOrderNumber = String(response.orderNumber || response.OrderNumber || '').trim();
                        setQuotationSendState(false);
                        sendQuotationByChannel(savedOrderId, quotationChannel, whatsappWindow);
                        return;
                    }

                    showToast('Order details saved successfully. Please complete payment.', 3000, {
                        type: 'success',
                        title: 'Saved'
                    });
                    openPaymentForSavedOrder(savedOrderId);
                } else {
                    finishSubmitFlow();
                    if (whatsappWindow && !whatsappWindow.closed) {
                        whatsappWindow.close();
                    }
                    if (isQuotation) {
                        setQuotationSendState(false);
                    }
                    var errorMessage = response && response.message
                        ? response.message
                        : 'Unable to save order.';
                    showToast(errorMessage, 4000, {
                        type: 'error',
                        title: 'Save failed'
                    });
                }
            },
            error: function (xhr) {
                finishSubmitFlow();
                if (whatsappWindow && !whatsappWindow.closed) {
                    whatsappWindow.close();
                }
                if (isQuotation) {
                    setQuotationSendState(false);
                }
                var errorMessage = xhr && xhr.status < 500 && xhr.responseJSON && xhr.responseJSON.message
                    ? xhr.responseJSON.message
                    : 'Save failed.';
                showToast(errorMessage, 4000, {
                    type: 'error',
                    title: 'Save failed'
                });
            }
        });
    }

    function prepareSignatureCanvas() {
        signatureCanvas = document.getElementById('signatureCanvas');
        if (!signatureCanvas) {
            return;
        }

        var bounds = signatureCanvas.getBoundingClientRect();
        var ratio = window.devicePixelRatio || 1;
        signatureCanvas.width = Math.max(1, Math.round(bounds.width * ratio));
        signatureCanvas.height = Math.max(1, Math.round(bounds.height * ratio));
        signatureContext = signatureCanvas.getContext('2d');
        signatureContext.setTransform(ratio, 0, 0, ratio, 0, 0);
        signatureContext.lineCap = 'round';
        signatureContext.lineJoin = 'round';
        signatureContext.lineWidth = 2.25;
        signatureContext.strokeStyle = '#17231b';
        signatureContext.fillStyle = '#ffffff';
        signatureContext.fillRect(0, 0, bounds.width, bounds.height);
        signatureHasInk = false;
        $('#signatureError').addClass('hidden');
    }

    function signaturePoint(event) {
        var bounds = signatureCanvas.getBoundingClientRect();
        return {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top
        };
    }

    function startSignature(event) {
        if (!signatureContext || event.button > 0) {
            return;
        }
        event.preventDefault();
        signatureDrawing = true;
        var point = signaturePoint(event);
        signatureContext.beginPath();
        signatureContext.moveTo(point.x, point.y);
        signatureCanvas.setPointerCapture(event.pointerId);
    }

    function drawSignature(event) {
        if (!signatureDrawing || !signatureContext) {
            return;
        }
        event.preventDefault();
        var point = signaturePoint(event);
        signatureContext.lineTo(point.x, point.y);
        signatureContext.stroke();
        signatureContext.beginPath();
        signatureContext.moveTo(point.x, point.y);
        signatureHasInk = true;
        $('#signatureError').addClass('hidden');
    }

    function endSignature(event) {
        if (!signatureDrawing) {
            return;
        }
        signatureDrawing = false;
        signatureContext.closePath();
        if (signatureCanvas.hasPointerCapture(event.pointerId)) {
            signatureCanvas.releasePointerCapture(event.pointerId);
        }
    }

    function openSignatureModal() {
        $('#signatureModal').removeClass('hidden');
        window.requestAnimationFrame(function () {
            prepareSignatureCanvas();
            $('#btnCloseSignature').trigger('focus');
        });
    }

    function closeSignatureModal() {
        if (orderSubmitInProgress) {
            return;
        }
        $('#signatureModal').addClass('hidden');
        signatureDrawing = false;
    }

    function bindSignatureCanvas() {
        signatureCanvas = document.getElementById('signatureCanvas');
        if (!signatureCanvas) {
            return;
        }
        signatureCanvas.addEventListener('pointerdown', startSignature);
        signatureCanvas.addEventListener('pointermove', drawSignature);
        signatureCanvas.addEventListener('pointerup', endSignature);
        signatureCanvas.addEventListener('pointercancel', endSignature);
    }

    function showQuotationOptions() {

        $("#quotationOptionsModal").css("display", "flex");
        $("#btnQuoteEmail").html('<span class="quotation-btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 5h18v14H3V5Zm2 2v.5l7 5 7-5V7H5Zm14 10V9.9l-7 5-7-5V17h14Z"/></svg></span><span class="quotation-btn-label">Email</span>');
        $("#btnQuoteWhatsapp").html('<span class="quotation-btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-7.7 13.65L3 21l4.5-1.2A9 9 0 1 0 12 3Zm0 16a7 7 0 0 1-3.57-.98l-.7-.42-2.02.54.57-1.94-.46-.73A7 7 0 1 1 12 19Zm3.84-5.25c-.21-.1-1.24-.61-1.43-.68-.19-.07-.33-.1-.47.1-.14.21-.54.68-.66.82-.12.14-.24.16-.45.05-1.23-.61-2.04-1.09-2.86-2.48-.22-.38.22-.35.62-1.16.07-.14.03-.26-.02-.37-.05-.1-.47-1.13-.64-1.55-.17-.4-.34-.35-.47-.36h-.4c-.14 0-.37.05-.56.26-.19.21-.73.71-.73 1.74s.75 2.02.85 2.16c.1.14 1.48 2.26 3.58 3.17.5.22.89.34 1.2.43.5.16.96.14 1.32.08.4-.06 1.24-.51 1.41-1 .17-.49.17-.91.12-1-.05-.09-.19-.14-.4-.24Z"/></svg></span><span class="quotation-btn-label">WhatsApp</span>');
        $("#btnQuoteBoth").html('<span class="quotation-btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7l-4 3v-3H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 3v.5l8 5.2 8-5.2V7l-8 5.2L4 7Z"/></svg></span><span class="quotation-btn-label">Both</span>');
        setQuotationSendState(false);

        $("#btnQuoteEmail").off().click(function () {
            if (quotationSendInProgress) return;
            placeQuotationAndSend('email');
        });

        $("#btnQuoteWhatsapp").off().click(function () {
            if (quotationSendInProgress) return;
            placeQuotationAndSend('whatsapp');
        });

        $("#btnQuoteBoth").off().click(function () {
            if (quotationSendInProgress) return;
            placeQuotationAndSend('both');
        });

        $("#btnCancelQuotation").off().click(function () {
            if (quotationSendInProgress) return;
            $("#quotationOptionsModal").hide();
            finishSubmitFlow();
        });

    }

    function setQuotationSendState(isSending, channel) {
        quotationSendInProgress = isSending;
        var $email = $("#btnQuoteEmail");
        var $whatsapp = $("#btnQuoteWhatsapp");
        var $both = $("#btnQuoteBoth");

        $email.add($whatsapp).add($both).add("#btnCancelQuotation").prop("disabled", isSending);
        $email.find(".quotation-btn-icon").toggle(!isSending || channel !== "email");
        $whatsapp.find(".quotation-btn-icon").toggle(!isSending || channel !== "whatsapp");
        $both.find(".quotation-btn-icon").toggle(!isSending || channel !== "both");
        $email.find(".quotation-btn-label").text(isSending && channel === "email" ? "Sending..." : "Email");
        $whatsapp.find(".quotation-btn-label").text(isSending && channel === "whatsapp" ? "Sending..." : "WhatsApp");
        $both.find(".quotation-btn-label").text(isSending && channel === "both" ? "Sending..." : "Both");
        $email.add($whatsapp).add($both).find(".quotation-btn-spinner").remove();

        if (isSending && channel === "email") {
            $email.prepend('<span class="quotation-btn-spinner" aria-hidden="true"></span>');
        } else if (isSending && channel === "whatsapp") {
            $whatsapp.prepend('<span class="quotation-btn-spinner" aria-hidden="true"></span>');
        } else if (isSending && channel === "both") {
            $both.prepend('<span class="quotation-btn-spinner" aria-hidden="true"></span>');
        }
    }

    function buildQuotationShareDetails(orderId) {
        var orderNumber = buildQuotationNumber(orderId);
        var customerName = String(state.details.company || state.details.contact || 'Customer').trim();
        var address = buildDeliveryAddress() || '-';
        var selectedIncludedItems = [];

        includedChoices.forEach(function (category) {
            var categoryId = String(category.categoryId || '');
            var selections = includedChoiceSelections[categoryId] || [];

            selections.forEach(function (menuId) {
                var selectedMenu = (category.menus || []).find(function (menu) {
                    return String(menu.id || '') === String(menuId || '');
                });

                if (!selectedMenu) return;

                selectedIncludedItems.push({
                    CategoryName: category.categoryName || category.name || '-',
                    MenuName: selectedMenu.name || '-',
                    IncludedQty: 1,
                    Unit: 'choice'
                });
            });
        });

        var selectedExtraItems = extraRows.filter(function (row) {
            return (state.extraItems[row.key] || 0) > 0;
        }).map(function (row) {
            var qty = state.extraItems[row.key] || 0;
            return {
                CategoryName: row.category || row.groupName || row.type || 'Additional Menu',
                MenuName: row.dish || row.name || row.code || 'Additional item',
                Qty: qty,
                Unit: row.unit || 'item',
                Notes: String(state.extraItemNotes[row.key] || '').trim(),
                UnitPrice: row.price || 0,
                TotalAmount: qty * (row.price || 0)
            };
        });

        var selectedAddOns = addonRows.filter(function (row) {
            return (state.addons[row.key] || 0) > 0;
        }).map(function (row) {
            var qty = state.addons[row.key] || 0;
            return {
                AddOnName: row.name || row.code || 'Add-on',
                Qty: qty,
                Unit: row.unit || 'event',
                UnitPrice: row.price || 0,
                TotalAmount: qty * (row.price || 0)
            };
        });

        var selectedUtensils = utensilRows.filter(function (row) {
            return (state.utensils[row.name] || 0) > 0;
        }).map(function (row) {
            var qty = state.utensils[row.name] || 0;
            return {
                UtensilName: row.name || 'Utensil',
                Qty: qty,
                UnitPrice: row.price || 0,
                RefundableDeposit: 0,
                TotalAmount: qty * (row.price || 0)
            };
        });

        return {
            order: {
                OrderId: Number(orderId) || 0,
                OrderNumber: orderNumber,
                CustomerName: customerName,
                MobileNo: String(state.details.mobile || '').trim(),
                EmailId: String(state.details.email || '').trim(),
                CustomerAddress: address,
                PackageName: state.packageName || '-',
                EventName: state.eventName || '-',
                MealPeriodName: state.details.mealPeriod || '-',
                EventDate: state.details.eventDate || null,
                Pax: Number(state.pax) || 0,
                DeliveryAddress: address,
                Notes: state.details.notes || '',
                PackageBaseAmount: packageBase(),
                AdditionalMenuAmount: extraTotal(),
                AddOnsAmount: addonTotal(),
                UtensilsAmount: utensilTotal(),
                TaxPercentage: Number((gstRate * 100).toFixed(0)) || 0,
                TaxAmount: gstTotal(),
                RefundableDeposit: 0,
                TotalAmount: grandTotal(),
                OrderStatusName: 'Quotation',
                CreatedDate: new Date().toISOString()
            },
            package: {
                PackageName: state.packageName || '-',
                PackagePrice: state.packagePrice || 0,
                PackageRate: state.packagePrice || 0,
                PackageBaseAmount: packageBase(),
                Pax: Number(state.pax) || 0
            },
            event: {
                EventDate: state.details.eventDate || null,
                EventAddress: address,
                Notes: state.details.notes || ''
            },
            includedItems: selectedIncludedItems,
            extraItems: selectedExtraItems,
            addOns: selectedAddOns,
            utensils: selectedUtensils
        };
    }

    function createQuotationAttachmentArtifact(orderId) {
        var fileName = buildQuotationNumber(orderId).replace(/[^a-z0-9_-]+/gi, '-') + '.pdf';
        var reportPages = buildLocalInvoiceHtmlPages(orderId, true);

        return new Promise(function (resolve, reject) {
            createInvoicePdfBlobFromHtml(reportPages, fileName, function (pdfBlob) {
                resolve({
                    fileName: fileName,
                    pdfBlob: pdfBlob,
                    source: 'quotation-invoice'
                });
            }, function (error) {
                reject(error instanceof Error ? error : new Error(error || 'Unable to prepare quotation PDF.'));
            });
        });
    }

    function sendQuotationEmail(orderId) {

        if (quotationSendInProgress) return;
        var toEmail = String(state.details.email || '').trim();

        if (!toEmail) {
            showToast('Email is required.', 3500, {
                type: 'warning',
                title: 'Email missing'
            });
            finishSubmitFlow();
            return;
        }

        setQuotationSendState(true, "email");
        window.AdminOrderShare.sendOrderEmail(orderId, {
            button: $("#btnQuoteEmail")[0],
            details: buildQuotationShareDetails(orderId),
            busyText: 'Sending...',
            useInvoicePdf: true
        }).then(function () {
            showToast("Quotation sent successfully.", 3000, {
                type: "success",
                title: "Success"
            });

            $("#quotationOptionsModal").hide();

            setTimeout(function () {
                window.location.href = "/Customer/Home";
            }, 500);
        }).catch(function (error) {
            showToast(error.message || "Failed to send quotation.", 3000, {
                type: "error",
                title: "Error"
            });
            setQuotationSendState(false);
            finishSubmitFlow();
        });
    }

    function sendQuotationWhatsapp(orderId, whatsappWindow) {

        if (quotationSendInProgress) return;
        setQuotationSendState(true, "whatsapp");
        window.AdminOrderShare.prepareWhatsappShare(orderId, {
            button: $("#btnQuoteWhatsapp")[0],
            details: buildQuotationShareDetails(orderId),
            busyText: 'Preparing...',
            popupWindow: whatsappWindow,
            useInvoicePdf: true
        }).then(function () {
            showToast('Quotation prepared for WhatsApp.', 3000, {
                type: 'success',
                title: 'Success'
            });

            $('#quotationOptionsModal').hide();

            setTimeout(function () {
                window.location.href = '/Customer/Home';
            }, 800);
        }).catch(function (error) {
            showToast(error.message || 'Failed to send quotation by WhatsApp.', 3000, {
                type: 'error',
                title: 'Error'
            });
            setQuotationSendState(false);
            finishSubmitFlow();
        });
    }

    function placeQuotationAndSend(channel) {
        if (quotationOrderId > 0) {
            var whatsappWindow = null;
            if (channel === 'whatsapp' || channel === 'both') {
                whatsappWindow = window.open('about:blank', '_blank');
            }
            sendQuotationByChannel(quotationOrderId, channel, whatsappWindow);
            return;
        }

        submitOrder(5, null, channel);
    }

    function sendQuotationByChannel(orderId, channel, whatsappWindow) {
        if (channel === 'email') {
            sendQuotationEmail(orderId);
        } else if (channel === 'whatsapp') {
            sendQuotationWhatsapp(orderId, whatsappWindow);
        } else if (channel === 'both') {
            sendQuotationBoth(orderId, whatsappWindow);
        }
    }

    function sendQuotationBoth(orderId, whatsappWindow) {
        if (quotationSendInProgress) return;

        var toEmail = String(state.details.email || '').trim();
        if (!toEmail) {
            if (whatsappWindow && !whatsappWindow.closed) {
                whatsappWindow.close();
            }
            showToast('Email is required to send by both methods.', 3500, {
                type: 'warning',
                title: 'Email missing'
            });
            finishSubmitFlow();
            return;
        }

        setQuotationSendState(true, 'both');
        var details = buildQuotationShareDetails(orderId);
        var sharedOptions = {
            details: details,
            useInvoicePdf: true
        };

        // Start WhatsApp directly from the click event so browsers do not block its new tab.
        var whatsappPromise = window.AdminOrderShare.prepareWhatsappShare(orderId, Object.assign({}, sharedOptions, {
            busyText: 'Preparing...',
            popupWindow: whatsappWindow
        }));
        var emailPromise = window.AdminOrderShare.sendOrderEmail(orderId, Object.assign({}, sharedOptions, {
            busyText: 'Sending...'
        }));

        Promise.allSettled([emailPromise, whatsappPromise]).then(function (results) {
            var emailSucceeded = results[0].status === 'fulfilled';
            var whatsappSucceeded = results[1].status === 'fulfilled';

            if (emailSucceeded && whatsappSucceeded) {
                showToast('Quotation sent by email and prepared for WhatsApp.', 4000, {
                    type: 'success',
                    title: 'Success'
                });
                $('#quotationOptionsModal').hide();
                setTimeout(function () {
                    window.location.href = '/Customer/Home';
                }, 800);
                return;
            }

            var failedChannel = emailSucceeded ? 'WhatsApp' : (whatsappSucceeded ? 'email' : 'email and WhatsApp');
            var failedResult = emailSucceeded ? results[1] : results[0];
            var failureMessage = failedResult.reason && failedResult.reason.message;
            showToast(failureMessage || ('Failed to send the quotation by ' + failedChannel + '.'), 4500, {
                type: 'error',
                title: emailSucceeded || whatsappSucceeded ? 'Partially sent' : 'Send failed'
            });
            setQuotationSendState(false);
            finishSubmitFlow();
        });
    }

    function openPaymentForSavedOrder(orderId) {
        savePaymentEmailContext(orderId);
        OrderPayment.open(orderId, grandTotal(), function (result) {
            if (result && result.cancelled) {
                Promise.resolve(sendPaymentFailureEmail(orderId)).finally(function () {
                    clearPaymentEmailContext();
                    finishSubmitFlow();
                    redirectToCustomerHomeAfterPaymentCancellation();
                });
                return;
            }

            showToast('Payment completed successfully.', 30000, { type: 'success', title: 'Paid' });
            sendOrderReviewEmail(orderId);
        });
    }

    function redirectToCustomerHomeAfterPaymentCancellation() {
        window.setTimeout(function () {
            window.location.href = '/Customer/Home';
        }, 800);
    }

    function openAmendmentPayment(orderId, balanceAmount, totalAmount, paidAmount) {
        OrderPayment.open(orderId, balanceAmount, function (result) {
            if (result && result.cancelled) {
                finishSubmitFlow();
                window.location.href = '/Admin/Orders';
                return;
            }

            showToast('Amendment balance paid successfully.', 3000, {
                type: 'success',
                title: 'Payment completed'
            });
            setTimeout(function () {
                window.location.href = '/Admin/Orders';
            }, 800);
        }, {
            returnPage: 'adminorders',
            totalAmount: totalAmount,
            paidAmount: paidAmount
        });
    }

    function savePaymentEmailContext(orderId) {
        try {
            localStorage.setItem(paymentEmailContextKey, JSON.stringify({
                orderId: parseInt(orderId, 10) || 0,
                savedAt: Date.now(),
                state: state,
                organizationInfo: organizationInfo,
                gstRate: gstRate,
                includedChoices: includedChoices,
                includedChoiceSelections: includedChoiceSelections,
                includedChoiceDetails: includedChoiceDetails,
                skippedCustomizeCategories: skippedCustomizeCategories,
                extraRows: extraRows,
                addonRows: addonRows,
                utensilRows: utensilRows
            }));
        } catch (_error) {
            // Payment can continue; email failure will be shown after confirmation.
        }
    }

    function clearPaymentEmailContext() {
        try {
            localStorage.removeItem(paymentEmailContextKey);
            sessionStorage.removeItem(paymentReturnContextKey);
        } catch (_error) {
            // Storage cleanup failure must not block the completed payment flow.
        }
    }

    function restorePaymentEmailContext(orderId) {
        try {
            var saved = JSON.parse(localStorage.getItem(paymentEmailContextKey) || 'null');
            if (!saved || Number(saved.orderId) !== Number(orderId)) return false;
            if (!saved.savedAt || Date.now() - Number(saved.savedAt) > 2 * 60 * 60 * 1000) {
                clearPaymentEmailContext();
                return false;
            }

            state = saved.state || state;
            organizationInfo = saved.organizationInfo || organizationInfo;
            gstRate = Number(saved.gstRate) || 0;
            includedChoices = saved.includedChoices || [];
            includedChoiceSelections = saved.includedChoiceSelections || {};
            includedChoiceDetails = saved.includedChoiceDetails || {};
            skippedCustomizeCategories = saved.skippedCustomizeCategories || {};
            extraRows = saved.extraRows || [];
            addonRows = saved.addonRows || [];
            utensilRows = saved.utensilRows || [];
            return true;
        } catch (_error) {
            clearPaymentEmailContext();
            return false;
        }
    }

    function resumePaymentEmailAfterRedirect() {
        var query = new URLSearchParams(window.location.search);
        var returnedOrderId = parseInt(query.get('paymentOrderId'), 10) || 0;
        var returnedChargeId = String(query.get('paymentChargeId') || '').trim();
        if (returnedOrderId <= 0) return;

        var paymentReturn;
        try {
            paymentReturn = JSON.parse(sessionStorage.getItem(paymentReturnContextKey) || 'null');
        } catch (_error) {
            paymentReturn = null;
        }

        if (returnedChargeId) {
            paymentReturn = {
                orderId: returnedOrderId,
                chargeId: returnedChargeId
            };
        }

        if (!paymentReturn ||
            Number(paymentReturn.orderId) !== returnedOrderId ||
            !paymentReturn.chargeId) {
            showToast('Payment returned, but its verification reference was not found.', 5000, {
                type: 'warning',
                title: 'Payment verification'
            });
            return;
        }

        function verifyReturnedPayment(attempt) {
            $.getJSON('/Customer/OrderPayment/status/' + encodeURIComponent(paymentReturn.chargeId))
                .done(function (result) {
                    if (!result.paid) {
                        if (String(result.status || '').toLowerCase() === 'pending' && attempt < 15) {
                            if (attempt === 0) {
                                showToast('Confirming payment. Please wait...', 5000, {
                                    type: 'info',
                                    title: 'Payment verification'
                                });
                            }
                            window.setTimeout(function () {
                                verifyReturnedPayment(attempt + 1);
                            }, 4000);
                            return;
                        }

                        showToast('Payment is still ' + String(result.status || 'pending') + '. The invoice will be emailed only after successful payment.', 6000, {
                            type: 'warning',
                            title: 'Payment pending'
                        });

                        if (String(result.status || '').toLowerCase() !== 'pending') {
                            redirectToCustomerHomeAfterPaymentCancellation();
                        }
                        return;
                    }

                    if (!restorePaymentEmailContext(returnedOrderId)) {
                        showToast('Payment succeeded, but the invoice details expired. Please contact support.', 6000, {
                            type: 'warning',
                            title: 'Email not sent'
                        });
                        return;
                    }

                    sessionStorage.removeItem(paymentReturnContextKey);
                    showToast('Payment completed successfully.', 30000, { type: 'success', title: 'Paid' });
                    sendOrderReviewEmail(returnedOrderId);
                })
                .fail(function () {
                    showToast('Unable to verify the completed payment. Please refresh and try again.', 5000, {
                        type: 'warning',
                        title: 'Payment verification'
                    });
                });
        }

        verifyReturnedPayment(0);
    }

    function closePaymentModal() {
        $('#paymentModal').addClass('hidden');
        $('#paymentQrImage').attr('src', '');

        if (orderSubmitInProgress && orderSubmitAction === 'submit') {
            finishSubmitFlow();
        }
    }

    function openPaymentModal(orderId, upiId) {
        var amount = grandTotal();
        var payeeName = String(organizationInfo.name ?? organizationInfo.Name ?? 'Gayatri Catering');
        var upiUri = 'upi://pay?pa=' + encodeURIComponent(upiId) +
            '&pn=' + encodeURIComponent(payeeName) +
            '&tn=' + encodeURIComponent('Order ' + orderId) +
            '&am=' + amount.toFixed(2) + '&cu=INR';
        var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(upiUri);
        $('#paymentAmountText').text('Amount: ' + money(amount));
        $('#paymentUpiText').text('UPI ID: ' + upiId);
        $('#paymentQrImage').attr('src', qrUrl);
        $('#btnPaymentDone').data('order-id', orderId);
        $('#paymentModal').removeClass('hidden');
    }

    function getInvoiceReportFileName() {
        var reportName = 'Invoice';
        var today = new Date();
        var day = today.getDate();
        var month = today.getMonth() + 1;
        var year = today.getFullYear();
        return reportName + '-' + day + '-' + month + '-' + year + '.pdf';
    }

    function formatInvoiceDate(value) {
        var d = new Date(value);
        return isNaN(d.getTime())
            ? '-'
            : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function formatInvoiceAmount(value) {
        var amount = Number(value);
        if (!Number.isFinite(amount)) {
            amount = 0;
        }
        return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function buildInvoiceNumber(orderId) {
        var numericOrderId = parseInt(orderId, 10) || 0;
        return 'INV-GC' + String(numericOrderId).padStart(6, '0');
    }

    function buildQuotationNumber(orderId) {
        if (quotationOrderNumber) {
            return quotationOrderNumber;
        }
        var numericOrderId = parseInt(orderId, 10) || 0;
        return 'QT-GC' + String(numericOrderId).padStart(6, '0');
    }

    function buildInvoiceLineItems() {
        var lines = [];
        var runningNo = 1;

        var selectedIncludedMenus = [];
        includedChoices.forEach(function (category) {
            if (state.customizeMenus && isCategorySkipped(category.categoryId)) {
                return;
            }
            var selections = includedChoiceSelections[String(category.categoryId)] || [];
            selections.forEach(function (menuId, choiceIndex) {
                if (state.customizeMenus && isMenuChoiceSkipped(category.categoryId, choiceIndex)) {
                    return;
                }
                var selectedMenu = (category.menus || []).find(function (menu) {
                    return String(menu.id) === String(menuId || '');
                });
                if (selectedMenu && selectedMenu.name) {
                    selectedIncludedMenus.push(String(selectedMenu.name));
                }
            });
        });

        var packageDescription = '<strong>' + escapeHtml(state.packageName || 'Package') + '</strong>';
        if (selectedIncludedMenus.length) {
            packageDescription += '<br>' + selectedIncludedMenus.map(function (name) {
                return escapeHtml(name.replace(/^\s*-\s*/, ''));
            }).join('<br>');
        }

        lines.push({
            no: runningNo++,
            descriptionHtml: packageDescription,
            qty: state.pax || 0,
            unitPrice: state.packagePrice || 0,
            total: packageBase()
        });

        extraRows.filter(function (row) {
            return (state.extraItems[row.key] || 0) > 0;
        }).forEach(function (row) {
            var qty = state.extraItems[row.key] || 0;
            lines.push({
                no: runningNo++,
                descriptionHtml: escapeHtml(row.dish || row.code || 'Additional item'),
                qty: qty,
                unitPrice: row.price || 0,
                total: qty * (row.price || 0)
            });
        });

        addonRows.filter(function (row) {
            return (state.addons[row.key] || 0) > 0;
        }).forEach(function (row) {
            var qty = state.addons[row.key] || 0;
            lines.push({
                no: runningNo++,
                descriptionHtml: escapeHtml(row.name || row.code || 'Add-on'),
                qty: qty,
                unitPrice: row.price || 0,
                total: qty * (row.price || 0)
            });
        });

        utensilRows.filter(function (row) {
            return (state.utensils[row.name] || 0) > 0;
        }).forEach(function (row) {
            var qty = state.utensils[row.name] || 0;
            lines.push({
                no: runningNo++,
                descriptionHtml: escapeHtml(row.name || 'Utensil'),
                qty: qty,
                unitPrice: row.price || 0,
                total: qty * (row.price || 0)
            });
        });

        return lines;
    }

    function splitInvoiceLineItemsForPages(lineItems) {
        var firstPageLimit = 18;
        var regularPageLimit = 26;
        var lastPageLimitWithSummary = 16;
        var chunks = [];

        if (!Array.isArray(lineItems) || !lineItems.length) {
            return [[]];
        }

        function getPageCapacity(pageIndex, totalPages) {
            if (totalPages === 1) {
                return lastPageLimitWithSummary;
            }

            if (pageIndex === 0) {
                return firstPageLimit;
            }

            if (pageIndex === totalPages - 1) {
                return lastPageLimitWithSummary;
            }

            return regularPageLimit;
        }

        function getTotalCapacity(totalPages) {
            var totalCapacity = 0;
            for (var pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                totalCapacity += getPageCapacity(pageIndex, totalPages);
            }

            return totalCapacity;
        }

        function getFutureCapacity(startPageIndex, totalPages) {
            var totalCapacity = 0;
            for (var pageIndex = startPageIndex; pageIndex < totalPages; pageIndex++) {
                totalCapacity += getPageCapacity(pageIndex, totalPages);
            }

            return totalCapacity;
        }

        var totalPages = lineItems.length <= lastPageLimitWithSummary ? 1 : 2;
        while (lineItems.length > getTotalCapacity(totalPages)) {
            totalPages++;
        }

        var remaining = lineItems.length;
        var cursor = 0;
        for (var currentPage = 0; currentPage < totalPages; currentPage++) {
            var pageCapacity = getPageCapacity(currentPage, totalPages);
            var pagesLeft = totalPages - currentPage;
            var futureCapacity = getFutureCapacity(currentPage + 1, totalPages);
            var requiredOnThisPage = Math.max(0, remaining - futureCapacity);
            var balancedCount = Math.ceil(remaining / pagesLeft);
            var pageCount = Math.min(pageCapacity, Math.max(requiredOnThisPage, balancedCount));

            chunks.push(lineItems.slice(cursor, cursor + pageCount));
            cursor += pageCount;
            remaining -= pageCount;
        }

        return chunks;
    }

    function getInvoicePdfMaxPageHeightPx() {
        var previewWidth = 960;
        var pdfPageWidth = 595;
        var pdfPageHeight = 842;
        var marginLeft = 20;
        var marginRight = 20;
        var imageTop = 20;
        var pageNumberGap = 20;
        var contentWidth = pdfPageWidth - marginLeft - marginRight;
        var maxContentHeight = pdfPageHeight - imageTop - pageNumberGap;
        return Math.floor((previewWidth * maxContentHeight) / contentWidth) - 8;
    }

    function measureInvoicePageHeight(orderId, lineItems, options) {
        if (!document || !document.body) {
            return Number.POSITIVE_INFINITY;
        }

        var host = document.createElement('div');
        host.style.position = 'fixed';
        host.style.left = '-20000px';
        host.style.top = '0';
        host.style.width = '960px';
        host.style.maxWidth = '960px';
        host.style.background = '#fff';
        host.style.padding = '0';
        host.style.margin = '0';
        host.style.boxSizing = 'border-box';
        host.style.overflow = 'visible';
        host.style.opacity = '1';
        host.style.visibility = 'hidden';
        host.style.pointerEvents = 'none';
        host.innerHTML = buildLocalInvoiceHtml(orderId, $.extend({}, options, { lineItems: lineItems }), false);
        document.body.appendChild(host);

        var height = host.scrollHeight || host.offsetHeight || 0;

        if (host.parentNode) {
            host.parentNode.removeChild(host);
        }

        return height;
    }

    function fillInvoicePageByHeight(orderId, sourceItems, startIndex, options, maxPageHeightPx, keepAtLeast) {
        var pageItems = [];
        var lastFitCount = 0;
        var maxIndex = Math.max(startIndex, sourceItems.length - Math.max(0, keepAtLeast));

        for (var index = startIndex; index < maxIndex; index++) {
            pageItems.push(sourceItems[index]);
            if (measureInvoicePageHeight(orderId, pageItems, options) <= maxPageHeightPx) {
                lastFitCount = pageItems.length;
                continue;
            }

            pageItems.pop();
            break;
        }

        if (!lastFitCount && startIndex < sourceItems.length - Math.max(0, keepAtLeast)) {
            lastFitCount = 1;
        }

        return sourceItems.slice(startIndex, startIndex + lastFitCount);
    }

    function fitInvoiceLastPageChunk(orderId, lineItems, maxPageHeightPx) {
        var tailItems = [];

        for (var index = lineItems.length - 1; index >= 0; index--) {
            tailItems.unshift(lineItems[index]);
            if (measureInvoicePageHeight(orderId, tailItems, {
                includeHeader: false,
                includeParty: false,
                includeSummary: true,
                includeTerms: true,
                includeSignatures: true,
                includeFooter: true
            }) > maxPageHeightPx) {
                tailItems.shift();
                break;
            }
        }

        return tailItems.length ? tailItems : [lineItems[lineItems.length - 1]];
    }

    function paginateInvoiceLeadingItems(orderId, lineItems, maxPageHeightPx) {
        var chunks = [];
        var cursor = 0;

        while (cursor < lineItems.length) {
            var isFirstPage = cursor === 0;
            var pageItems = fillInvoicePageByHeight(orderId, lineItems, cursor, {
                includeHeader: isFirstPage,
                includeParty: isFirstPage,
                includeSummary: false,
                includeTerms: false,
                includeSignatures: false,
                includeFooter: false
            }, maxPageHeightPx, 0);

            if (!pageItems.length) {
                pageItems = lineItems.slice(cursor, cursor + 1);
            }

            chunks.push(pageItems);
            cursor += pageItems.length;
        }

        return chunks;
    }

    function getInvoiceChunkUnusedHeight(orderId, chunk, isFirst, isLast, maxPageHeightPx) {
        var pageHeight = measureInvoicePageHeight(orderId, chunk, {
            includeHeader: isFirst,
            includeParty: isFirst,
            includeSummary: isLast,
            includeTerms: isLast,
            includeSignatures: isLast,
            includeFooter: isLast
        });

        return Math.max(0, maxPageHeightPx - pageHeight);
    }

    function compareInvoiceLayouts(nextLayout, currentBest) {
        if (!currentBest) {
            return true;
        }

        if (nextLayout.pageCount !== currentBest.pageCount) {
            return nextLayout.pageCount < currentBest.pageCount;
        }

        if (nextLayout.maxUnused !== currentBest.maxUnused) {
            return nextLayout.maxUnused < currentBest.maxUnused;
        }

        if (nextLayout.totalUnused !== currentBest.totalUnused) {
            return nextLayout.totalUnused < currentBest.totalUnused;
        }

        return nextLayout.lastPageCount >= currentBest.lastPageCount;
    }

    function buildLocalInvoiceHtml(orderId, options, isQuotation) {
        options = options || {};
        var logoUrl = (window.location.origin || '') + '/images/logo.jpg';
        var orderDateText = formatInvoiceDate(new Date());
        var eventDateText = formatInvoiceDate(state.details.eventDate);
        var taxPct = Number(gstRate * 100).toFixed(0);
        var invoiceNo = isQuotation ? buildQuotationNumber(orderId) : buildInvoiceNumber(orderId);
        var lineItems = Array.isArray(options.lineItems) ? options.lineItems : buildInvoiceLineItems();
        var includeHeader = options.includeHeader !== false;
        var includeParty = options.includeParty !== false;
        var includeSummary = options.includeSummary !== false;
        var includeTerms = options.includeTerms !== false;
        var includeSignatures = options.includeSignatures !== false;
        var includeFooter = options.includeFooter !== false;
        var lineRowsHtml = lineItems.map(function (item) {
            return '<tr>' +
                '<td class="text-center">' + item.no + '</td>' +
                '<td>' + item.descriptionHtml + '</td>' +
                '<td class="text-center">' + escapeHtml(item.qty) + '</td>' +
                '<td class="text-right">S$' + formatInvoiceAmount(item.unitPrice) + '</td>' +
                '<td class="text-right">S$' + formatInvoiceAmount(item.total) + '</td>' +
                '</tr>';
        }).join('');

        const docTitle = isQuotation ? "Quotation" : "Tax Invoice";
        const docNoLabel = isQuotation ? "QT NO" : "INV NO";
        const dateLabel = isQuotation ? "Quotation Date" : "Order Date";
        const filePrefix = isQuotation ? "Quotation" : "Invoice";
        const orderPrefix = isQuotation ? "QT" : "INV";
        const functionDateLabel = isQuotation ? "Function Date" : "Invoice/Function Date";

        if (!lineRowsHtml) {
            lineRowsHtml = '<tr><td class="text-center">1</td><td>No line items</td><td class="text-center">0</td><td class="text-right">S$0.00</td><td class="text-right">S$0.00</td></tr>';
        }

        return '<style>' +
            '.invoice-sheet{background:#fff;color:#1a1a1a;font-family:Segoe UI,Calibri,Tahoma,sans-serif;margin:0 auto;max-width:960px;padding:16px 20px 32px;line-height:1.5}' +
            '.invoice-sheet *{box-sizing:border-box}' +
            '.invoice-sheet.continued-page{padding-top:28px}' +
            '.invoice-header-section{border-bottom:4px solid #1a1a1a;margin-bottom:14px;padding-bottom:12px}' +
            '.invoice-header{display:flex;justify-content:space-between;gap:28px;align-items:flex-start}' +
            '.invoice-logo{display:block;width:180px;height:72px;object-fit:contain;margin-bottom:4px}' +
            '.invoice-company-note{font-size:13px;margin:4px 0;font-weight:800;color:#1f7a4a}' +
            '.invoice-brand-block{display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-start;margin-left:auto;text-align:right;min-width:0}' +
            '.invoice-brand-title{display:block;width:auto;font-size:36px;font-weight:900;letter-spacing:.03em;margin:0 0 8px;text-transform:uppercase;text-align:right;line-height:1.05}' +
            '.invoice-brand-sub{display:block;width:auto;margin-top:4px;color:#333;font-size:16px;line-height:1.25;white-space:nowrap;text-align:right}' +
            '.invoice-brand-label{font-weight:800}' +
            '.invoice-brand-value{font-weight:600}' +
            '.invoice-party-grid{display:grid;gap:16px;grid-template-columns:minmax(0,1.15fr) minmax(0,0.85fr);margin-bottom:14px;background:#fafafa;padding:14px;border-radius:4px;border:1.5px solid #1a1a1a}' +
            '.invoice-party-grid > div{min-width:0}' +
            '.invoice-party-grid > div:first-child .invoice-meta-row strong{text-align:left}' +
            '.invoice-block-title{font-size:12px;font-weight:800;text-transform:uppercase;color:#1a1a1a;margin-bottom:10px;letter-spacing:.08em;border-bottom:2px solid #1f7a4a;padding-bottom:4px}' +
            '.invoice-customer-name{font-size:16px;font-weight:700;margin:0 0 4px;color:#1a1a1a}' +
            '.invoice-address,.invoice-label-line{font-size:12px;line-height:1.45;margin:2px 0;color:#555;white-space:normal;overflow-wrap:anywhere;word-break:break-word}' +
            '.invoice-meta-row{display:grid;grid-template-columns:170px minmax(0,1fr);margin-bottom:5px;align-items:baseline;column-gap:8px}' +
            '.invoice-meta-row strong{font-size:12px;color:#1f4733;font-weight:700;text-align:left;white-space:nowrap}' +
            '.invoice-meta-row span{font-size:12px;color:#555;white-space:normal;overflow-wrap:anywhere;word-break:break-word}' +
            '.invoice-party-grid > div:nth-child(2){text-align:left;justify-self:end;width:100%;max-width:420px;margin-right:0}' +
            '.invoice-party-grid > div:nth-child(2) .invoice-meta-row strong{text-align:left}' +
            '.invoice-party-grid > div:nth-child(2) .invoice-meta-row span{text-align:left}' +
            '.invoice-items-summary-wrapper{display:block;margin-bottom:12px}' +
            '.invoice-items-block{margin-bottom:0}' +
            '.invoice-items{border-collapse:collapse;border-spacing:0;table-layout:fixed;width:100%;background:#fff}' +
            '.invoice-items th,.invoice-items td{border:1px solid #2f3640;font-size:12px;padding:8px 10px;vertical-align:top;line-height:1.25}' +
            '.invoice-items th{font-weight:900;text-transform:uppercase;background-color:#3da970;color:#fff;letter-spacing:.05em;font-size:11px;padding:10px 8px;border:1px solid #1a1a1a;white-space:normal}' +
            '.w-no{width:7%}.w-desc{width:46%}.w-qty{width:13%}.w-unit{width:17%}.w-total{width:17%}' +
            '.invoice-items tbody td{word-wrap:break-word;overflow-wrap:anywhere;white-space:normal}' +
            '.text-center{text-align:center}.text-right{text-align:right}' +
            '.invoice-summary{width:100%}.invoice-summary table{border-collapse:collapse;border-spacing:0;table-layout:fixed;width:100%;background:#fff}' +
            '.invoice-summary td{border:1px solid #2f3640;font-size:12px;padding:10px 12px;line-height:1.25}' +
            '.invoice-summary .label{font-weight:800;text-align:left;background-color:#f5f5f5;color:#555}' +
            '.invoice-summary .amount{text-align:right;white-space:nowrap;background-color:#f5f5f5;color:#1a1a1a;font-weight:400}' +
            '.invoice-summary .grand td,.invoice-summary .balance td{font-weight:400;background-color:#e8f4ed;color:#1f4733}' +
            '.invoice-summary .grand .label,.invoice-summary .balance .label{font-weight:800}' +
            '.invoice-terms{margin-bottom:18px;padding:12px 14px;background-color:#f0f8f4;border:2px solid #1f7a4a;border-radius:4px}' +
            '.invoice-terms h3{font-size:13px;font-weight:800;margin:0 0 8px;color:#1f4733;text-transform:uppercase}' +
            '.invoice-terms p{font-size:12px;margin:0 0 6px;line-height:1.5;color:#555}' +
            '.invoice-signatures{display:grid;gap:32px;grid-template-columns:repeat(2,minmax(0,1fr));margin-bottom:18px;margin-top:18px}' +
            '.invoice-signature{padding-top:12px}.invoice-signature:first-child{text-align:left}.invoice-signature:last-child{text-align:right}' +
            '.invoice-signature .line{border-top:3px solid #333;display:block;margin-bottom:6px;width:160px}' +
            '.invoice-signature:first-child .line{margin-left:0}.invoice-signature:last-child .line{margin-left:auto}' +
            '.invoice-signature div{font-size:13px;font-weight:700;color:#1a1a1a}' +
            '.invoice-footer-section{border-top:4px solid #1a1a1a;padding-top:14px;margin-top:8px;text-align:center;background:#fafafa;padding-bottom:12px;margin-left:-20px;margin-right:-20px;margin-bottom:-32px;padding-left:20px;padding-right:20px}' +
            '.invoice-footer strong{display:block;font-size:13px;margin-bottom:4px;font-weight:800;color:#1a1a1a}' +
            '.invoice-footer-line{font-size:12px;color:#333;line-height:1.4;margin:2px 0}' +
            '.invoice-footer-legal{font-size:10px;color:#999;margin-top:6px}' +
            '</style>' +
            '<section class="invoice-sheet ' + (includeHeader ? 'first-page' : 'continued-page') + '">' +
            (includeHeader
                ? '<div class="invoice-header-section"><div class="invoice-header"><div><img class="invoice-logo" src="' + logoUrl + '" alt="Gayatri Restaurant"><div class="invoice-company-note">Catering Hotline : +65 6294 6294</div></div><div class="invoice-brand-block"><h1 class="invoice-brand-title">' + docTitle + '</h1><div class="invoice-brand-sub"><span class="invoice-brand-label">GST Reg No.</span> <span class="invoice-brand-value">19-9503681-K</span></div><div class="invoice-brand-sub"><span class="invoice-brand-label">' + docNoLabel + ':</span> <span class="invoice-brand-value">' + escapeHtml(invoiceNo) + '</span></div><div class="invoice-brand-sub"><span class="invoice-brand-label">' + dateLabel + ':</span> <span class="invoice-brand-value">' + escapeHtml(orderDateText) + '</span></div></div></div></div>'
                : '') +
            (includeParty
                ? '<div class="invoice-party-grid"><div><div class="invoice-block-title">Bill To:</div><div class="invoice-meta-row"><strong>Customer Name:</strong><span>' + escapeHtml(state.details.company || state.details.contact || '-') + '</span></div><div class="invoice-meta-row"><strong>Address:</strong><span>' + escapeHtml((state.details.customerAddress || '-') + (state.details.postal ? ' ' + state.details.postal : '')) + '</span></div><div class="invoice-meta-row"><strong>Tel:</strong><span>' + escapeHtml(state.details.mobile || '-') + '</span></div></div><div><div class="invoice-block-title">Event Details</div><div class="invoice-meta-row"><strong>' + functionDateLabel + ':</strong><span>' + escapeHtml(eventDateText) + '</span></div><div class="invoice-meta-row"><strong>Departure Time:</strong><span>-</span></div><div class="invoice-meta-row"><strong>Consuming Time:</strong><span>' + escapeHtml(state.details.mealPeriod || '-') + '</span></div><div class="invoice-meta-row"><strong>Location:</strong><span>' + escapeHtml(buildDeliveryAddress() || '-') + '</span></div></div></div>'
                : '') +
            '<div class="invoice-items-summary-wrapper"><div class="invoice-items-block"><table class="invoice-items"><colgroup><col class="w-no"><col class="w-desc"><col class="w-qty"><col class="w-unit"><col class="w-total"></colgroup><thead><tr><th class="col-no text-center">No</th><th class="col-desc">Description</th><th class="col-qty text-center">No Of Items</th><th class="col-unit text-right">Unit Price</th><th class="col-total text-right">Total</th></tr></thead><tbody>' + lineRowsHtml + '</tbody></table></div>' +
            (includeSummary
                ? '<div class="invoice-summary"><table><colgroup><col class="w-no"><col class="w-desc"><col class="w-qty"><col class="w-unit"><col class="w-total"></colgroup><tr><td colspan="3" class="label">Sub total</td><td colspan="2" class="amount">S$' + formatInvoiceAmount(packageBase() + extraTotal() + addonTotal() + utensilTotal()) + '</td></tr><tr><td colspan="3" class="label">' + escapeHtml(taxPct) + '% GST</td><td colspan="2" class="amount">S$' + formatInvoiceAmount(gstTotal()) + '</td></tr><tr class="grand"><td colspan="3" class="label">Grand Total</td><td colspan="2" class="amount">S$' + formatInvoiceAmount(grandTotal()) + '</td></tr><tr class="balance"><td colspan="3" class="label">Balance Remaining</td><td colspan="2" class="amount">S$' + formatInvoiceAmount(grandTotal()) + '</td></tr></table></div>'
                : '') +
            '</div>' +
            (includeTerms
                ? '<div class="invoice-terms"><h3>Terms &amp; Conditions:</h3><p>Deposit paid is not refundable.</p><p>Cheque should be made payable to GAYATRI RESTAURANT</p><p>For online payment details: Bank Name: DBS | Account No: 0721067358 / Paynow: 52817812ADBS</p><p>Food best consumed within 3 hours from consuming time.</p></div>'
                : '') +
            (includeSignatures
                ? '<div class="invoice-signatures"><div class="invoice-signature"><span class="line"></span><div>Authorise Signature</div></div><div class="invoice-signature"><span class="line"></span><div>Customer Signature</div></div></div>'
                : '') +
            (includeFooter
                ? '<div class="invoice-footer-section"><div class="invoice-footer"><strong>Main Restaurant: 122 Race Course Road #01-01, Singapore 218583</strong><div class="invoice-footer-line">Tel: 6291 1011 &nbsp;&nbsp; Office: 6292 4544 &nbsp;&nbsp; Fax: 62974850</div><div class="invoice-footer-line">Email: info@gayatrirestaurant.com &nbsp;&nbsp; Catering Hotline: +65 6294 6294</div><div class="invoice-footer-line">Co. Regn. No. 52817812A &nbsp;&nbsp; GST Reg No. 19-9503681-K</div><div class="invoice-footer-legal">Website: www.gayatrirestaurant.com</div></div></div>'
                : '') +
            '</section>';
    }

    function buildLocalInvoiceHtmlPages(orderId, isQuotation) {
        var lineItems = buildInvoiceLineItems();
        var chunks = [];
        var maxPageHeightPx = getInvoicePdfMaxPageHeightPx();

        if (measureInvoicePageHeight(orderId, lineItems, {
            includeHeader: true,
            includeParty: true,
            includeSummary: true,
            includeTerms: true,
            includeSignatures: true,
            includeFooter: true
        }) <= maxPageHeightPx) {
            return [buildLocalInvoiceHtml(orderId, {
                lineItems: lineItems,
                includeHeader: true,
                includeParty: true,
                includeSummary: true,
                includeTerms: true,
                includeSignatures: true,
                includeFooter: true
            }, isQuotation)];
        }

        if (!document || !document.body) {
            chunks = splitInvoiceLineItemsForPages(lineItems);
        } else {
            var bestLayout = null;

            for (var lastPageCount = 1; lastPageCount < lineItems.length; lastPageCount++) {
                var candidateLastChunk = lineItems.slice(lineItems.length - lastPageCount);
                if (measureInvoicePageHeight(orderId, candidateLastChunk, {
                    includeHeader: false,
                    includeParty: false,
                    includeSummary: true,
                    includeTerms: true,
                    includeSignatures: true,
                    includeFooter: true
                }) > maxPageHeightPx) {
                    continue;
                }

                var leadingItems = lineItems.slice(0, lineItems.length - lastPageCount);
                var candidateChunks = paginateInvoiceLeadingItems(orderId, leadingItems, maxPageHeightPx);
                candidateChunks.push(candidateLastChunk);

                var maxUnused = 0;
                var totalUnused = 0;
                for (var pageIndex = 0; pageIndex < candidateChunks.length; pageIndex++) {
                    var unusedHeight = getInvoiceChunkUnusedHeight(orderId, candidateChunks[pageIndex], pageIndex === 0, pageIndex === candidateChunks.length - 1, maxPageHeightPx);
                    maxUnused = Math.max(maxUnused, unusedHeight);
                    totalUnused += unusedHeight;
                }

                var candidateLayout = {
                    chunks: candidateChunks,
                    pageCount: candidateChunks.length,
                    maxUnused: maxUnused,
                    totalUnused: totalUnused,
                    lastPageCount: lastPageCount
                };

                if (compareInvoiceLayouts(candidateLayout, bestLayout)) {
                    bestLayout = candidateLayout;
                }
            }

            chunks = bestLayout && bestLayout.chunks.length
                ? bestLayout.chunks
                : splitInvoiceLineItemsForPages(lineItems);
        }

        var totalPages = chunks.length;

        return chunks.map(function (chunk, index) {
            var isFirst = index === 0;
            var isLast = index === totalPages - 1;
            return buildLocalInvoiceHtml(orderId, {
                lineItems: chunk,
                includeHeader: isFirst,
                includeParty: isFirst,
                includeSummary: isLast,
                includeTerms: isLast,
                includeSignatures: isLast,
                includeFooter: isLast
            }, isQuotation);
        });
    }

    function buildInvoiceEmailBody(orderId, isQuotation) {
        var customerName = String(state.details.company || state.details.contact || 'Customer');
        var formattedDate = formatInvoiceDate(state.details.eventDate);
        var formattedTotal = 'S$' + formatInvoiceAmount(grandTotal());
        var invoiceNo = isQuotation ? buildQuotationNumber(orderId) : buildInvoiceNumber(orderId);
        var logoUrl = (window.location.origin || '') + '/images/logo.jpg';
        const docTitle = isQuotation ? "Quotation" : "Invoice";
        const totalLabel = isQuotation ? "Quotation Total" : "Invoice Total";

        var body = '<p>Dear ' + escapeHtml(customerName) + ',</p>' +
            '<p>Thank you for choosing <strong>Gayatri Catering</strong>. Please find attached your ' + docTitle +' PDF for order <strong>' + escapeHtml(invoiceNo) + '</strong>.</p>' +
            '<p><strong>' + docTitle +' Summary</strong><br>' +
            'Event Date: ' + escapeHtml(formattedDate) + '<br>' +
            '' + totalLabel + ': ' + escapeHtml(formattedTotal) + '</p>';

        body += '<p>Kindly review the attached invoice and keep it for your reference. If you need any clarification regarding the order details, invoice amount, or payment status, please contact our team and we will assist you.</p>' +
            '<div style="margin-top:16px;padding-top:12px;border-top:1px solid #e4e7eb;">' +
            '<div style="margin-bottom:8px;"><img src="' + logoUrl + '" alt="Gayatri Catering" width="180" style="display:block;width:180px;max-width:180px;height:auto;"></div>' +
            '<div style="font-size:13px;line-height:1.5;color:#1f2937;">' +
            '<strong>Main Restaurant: 122 Race Course Road #01-01, Singapore 218583</strong><br>' +
            'Catering Hotline: +65 6294 6294<br>' +
            'Website: www.gayatrirestaurant.com' +
            '</div></div>';

        return body;
    }

    function createInvoicePdfBlobFromHtml(reportHtmlPages, fileName, done, fail) {
        var jsPdfFactory = window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : null;
        if (!jsPdfFactory) {
            fail('PDF library is not available.');
            return;
        }

        if (!window.html2canvas) {
            fail('html2canvas is not available.');
            return;
        }

        var reportPages = Array.isArray(reportHtmlPages)
            ? reportHtmlPages.slice()
            : [String(reportHtmlPages || '')];

        function createPageHost(pageHtml) {
            var host = document.createElement('div');
            host.style.position = 'fixed';
            host.style.left = '-20000px';
            host.style.top = '0';
            host.style.width = '960px';
            host.style.maxWidth = '960px';
            host.style.background = '#fff';
            host.style.padding = '0';
            host.style.boxSizing = 'border-box';
            host.style.overflow = 'visible';
            host.style.opacity = '1';
            host.style.visibility = 'visible';
            host.style.zIndex = '1';
            host.style.pointerEvents = 'none';
            host.innerHTML = pageHtml +
                '<style>' +
                '.invoice-items th{background:#ffffff !important;color:#a0a6af !important}' +
                '.invoice-items th.col-no,.invoice-items th.col-desc,.invoice-items th.col-qty,.invoice-items th.col-unit,.invoice-items th.col-total{background:#ffffff !important;color:#a0a6af !important}' +
                '</style>';
            document.body.appendChild(host);
            return host;
        }

        function renderPageCanvas(pageHtml) {
            var host = createPageHost(pageHtml);
            var images = host.querySelectorAll('img');
            var imagePromises = [];

            images.forEach(function (img) {
                if (img.complete) {
                    return;
                }

                imagePromises.push(new Promise(function (resolve) {
                    img.onload = img.onerror = resolve;
                }));
            });

            return Promise.all(imagePromises)
                .then(function () {
                    return html2canvas(host, {
                        scale: Math.min(2, Math.max(1.5, window.devicePixelRatio || 1.5)),
                        useCORS: true,
                        backgroundColor: '#ffffff',
                        allowTaint: true,
                        logging: false,
                        windowWidth: host.scrollWidth,
                        windowHeight: host.scrollHeight
                    });
                })
                .then(function (canvas) {
                    if (host.parentNode) {
                        host.parentNode.removeChild(host);
                    }
                    return canvas;
                }, function (error) {
                    if (host.parentNode) {
                        host.parentNode.removeChild(host);
                    }
                    throw error;
                });
        }

        var pdf = new jsPdfFactory('p', 'pt', 'a4');
        var pageWidth = pdf.internal.pageSize.getWidth();
        var pageHeight = pdf.internal.pageSize.getHeight();
        var marginLeft = 20;
        var marginRight = 20;
        var imageTop = 20;
        var pageNumberGap = 20;
        var contentWidth = pageWidth - marginLeft - marginRight;
        var maxContentHeight = pageHeight - imageTop - pageNumberGap;
        var totalPages = Math.max(1, reportPages.length);
        var sequence = Promise.resolve();

        reportPages.forEach(function (pageHtml, index) {
            sequence = sequence.then(function () {
                return renderPageCanvas(pageHtml).then(function (canvas) {
                    var imgData = canvas.toDataURL('image/jpeg', 0.92);
                    var scale = Math.min(contentWidth / canvas.width, maxContentHeight / canvas.height);
                    var renderWidth = canvas.width * scale;
                    var renderHeight = canvas.height * scale;

                    if (index > 0) {
                        pdf.addPage();
                    }

                    pdf.addImage(imgData, 'JPEG', marginLeft, imageTop, renderWidth, renderHeight);
                    pdf.setPage(index + 1);
                    pdf.setFontSize(9);
                    pdf.text('Page ' + (index + 1) + ' of ' + totalPages, pageWidth - marginRight, pageHeight - 8, { align: 'right' });
                });
            });
        });

        sequence.then(function () {
            try {
                done(pdf.output('blob'));
            } catch (_err) {
                fail('Unable to generate invoice PDF.');
            }
        }).catch(function () {
            fail('Unable to render invoice HTML for PDF.');
        });
    }

    function sendOrderReviewEmail(orderId) {
        var toEmail = String(state.details.email || '').trim();
        if (!toEmail) {
            showToast('Email is required in Event Details to send invoice.', 3500, { type: 'warning', title: 'Email missing' });
            showOrderLoader(false);
            finishSubmitFlow();
            return;
        }

        var formData = new FormData();
        formData.append('ToEmail', toEmail);
        formData.append('Subject', 'Invoice - ' + buildInvoiceNumber(orderId));
        formData.append('ReportId', '4');
        formData.append('OrderId', String(orderId));
        formData.append('ReportFiltersJson', JSON.stringify({ OrderId: orderId }));

        $.ajax({
            url: '/Common/SendReportEmail',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function () {
                clearPaymentEmailContext();
                showToast('Invoice sent to email successfully.', 3500, { type: 'success', title: 'Email sent' });
                setTimeout(function () {
                    showOrderLoader(false);
                    finishSubmitFlow();
                    window.location.href = '/Customer/Home';
                }, 400);
            },
            error: function (xhr) {
                clearPaymentEmailContext();
                var message = (xhr && xhr.responseJSON && (xhr.responseJSON.Message || xhr.responseJSON.message))
                    ? (xhr.responseJSON.Message || xhr.responseJSON.message)
                    : 'Payment confirmed, but invoice email failed.';
                showToast(message, 4000, { type: 'warning', title: 'Email failed' });
                showOrderLoader(false);
                finishSubmitFlow();
            }
        });
    }

    function buildPaymentFailureEmailDetails(orderId) {
        return {
            order: {
                OrderId: Number(orderId) || 0,
                OrderNumber: buildInvoiceNumber(orderId),
                CustomerName: String(state.details.company || state.details.contact || 'Customer').trim(),
                MobileNo: String(state.details.mobile || '').trim(),
                EmailId: String(state.details.email || '').trim(),
                EventName: String(state.eventName || '-').trim(),
                MealPeriodName: String(state.details.mealPeriod || '-').trim(),
                EventDate: state.details.eventDate || null,
                Pax: Number(state.pax) || 0,
                TotalAmount: grandTotal(),
                PaidAmount: 0,
                OrderStatusName: 'Payment Pending'
            },
            event: {
                EventDate: state.details.eventDate || null
            }
        };
    }

    function sendPaymentFailureEmail(orderId) {
        var details = buildPaymentFailureEmailDetails(orderId);
        var customerEmail = String(state.details.email || '').trim();

        if (!customerEmail) {
            showToast('Order was created, but the customer email is missing for the payment reminder.', 4500, {
                type: 'warning',
                title: 'Email missing'
            });
            return $.Deferred().resolve().promise();
        }

        if (!window.AdminOrderShare || typeof window.AdminOrderShare.sendOrderEmail !== 'function') {
            return $.Deferred().resolve().promise();
        }

        return window.AdminOrderShare.sendOrderEmail(orderId, {
            details: details,
            useInvoicePdf: true,
            emailSubject: window.AdminOrderShare.buildPaymentFailureEmailSubject(orderId, details, {
                subjectPrefix: 'Payment Pending'
            }),
            emailBody: window.AdminOrderShare.buildPaymentFailureEmailBody(orderId, details, {
                reasonText: 'the payment was cancelled before it could be completed',
                supportPhone: '+65 6294 6294',
                supportEmail: 'info@gayatrirestaurant.com'
            })
        }).then(function () {
            showToast('Payment pending email sent to the customer.', 3500, {
                type: 'success',
                title: 'Email sent'
            });
        }).catch(function (error) {
            showToast(error && error.message ? error.message : 'Payment was cancelled, but the email could not be sent.', 4500, {
                type: 'warning',
                title: 'Email failed'
            });
        });
    }

    function loadUpiAndOpenPayment(orderId) {
        var upiId = String(organizationInfo.upiId ?? organizationInfo.UPIId ?? '').trim();
        if (upiId) {
            openPaymentModal(orderId, upiId);
            return;
        }
        $.ajax({
            url: '/Customer/Organization/gst',
            type: 'GET',
            success: function (data) {
                var settingsUpi = String(data?.upiId ?? data?.UPIId ?? '').trim();
                if (!settingsUpi) {
                    showToast('UPI Id is not configured. Please contact support.', 4000, { type: 'error', title: 'Payment unavailable' });
                    return;
                }
                organizationInfo = Object.assign({}, organizationInfo || {}, data || {});
                openPaymentModal(orderId, settingsUpi);
            },
            error: function () {
                showToast('Unable to load UPI Id for payment.', 4000, { type: 'error', title: 'Payment unavailable' });
            }
        });
    }

    $(document).on('change', '#eventPaxCount', function () {
        var enteredPax = parseInt($(this).val(), 10) || 0;
        if (enteredPax < state.eventMinPax) {
            enteredPax = state.eventMinPax;
            $(this).val(enteredPax);
            showToast('Pax cannot be less than the event minimum of ' + state.eventMinPax + '.', 2500, {
                type: 'warning',
                title: 'Minimum pax'
            });
        }
        state.pax = enteredPax;
        if (state.customizeMenus) {
            initializeAllCategoryChoices();
            renderStep(false);
            return;
        }
        updateSummary();
    });

    function startDirectCustomizeWorkflow(customPackage) {
        if (!state.selectedEvent) {
            showToast('Select an event first to customize menu.', 2500, {
                type: 'warning',
                title: 'Event required'
            });
            return;
        }

        state.customizeMenus = true;
        state.menuBasedPricing = true;
        state.selectedPackage = customPackage ? String(customPackage.id || '') : '';
        state.packageName = customPackage ? String(customPackage.name || 'Customize Package') : '-';
        state.packagePrice = customPackage ? Number(customPackage.price || 0) : 0;
        state.step1View = 'form';
        currentStep = 1;

        loadMenuPriceMap();
        loadDirectCustomizeMenus();
    }

    $(document).on('click', '#btnCustomizeMenuDirect', function () {
        startDirectCustomizeWorkflow();
    });

    $(document).on('change', '#eventType', function () {
        var eventId = String($(this).val() || '').trim();
        var selectedEvent = events.find(function (item) {
            return String(item.id) === eventId;
        });

        state.selectedEvent = eventId;
        state.eventName = selectedEvent ? selectedEvent.name : '';
        state.eventMinPax = selectedEvent ? Number(selectedEvent.minPax) || 0 : 0;
        state.eventAdvanceBookingDays = selectedEvent ? Math.max(0, Number(selectedEvent.advanceBookingDays) || 0) : 0;
        state.selectedPackage = '';
        state.packageName = '-';
        state.packagePrice = 0;
        state.customizeMenus = false;
        state.menuBasedPricing = false;
        state.pax = selectedEvent ? state.eventMinPax : '';
        state.step1View = 'packages';
        state.showPackages = false;
        includedChoices = [];
        includedChoiceSelections = {};
        includedChoiceDetails = {};
        skippedCustomizeCategories = {};
        skippedCustomizeMenuChoices = {};

        if (eventId) {
            loadOrderPackages(eventId);
        } else {
            packages = [];
        }

        renderStep();
    });

    $(document).on('click', '.pkg-card, .select-package-btn', function (e) {
        var card = $(e.target).closest('.pkg-card');
        if (card.length) {
            selectPackage(card.data('package-id'));
        }
    });

    $(document).on('click', '#btnChangePackage', function (e) {
        e.preventDefault();
        state.step1View = 'packages';
        state.showPackages = true;
        currentStep = 1;
        renderStep();
    });

    $(document).on('click', '#btnResetOrder', function (e) {
        e.preventDefault();
        resetOrderForNew();
    });

    function togglePackageDescription(description) {
        var isExpanded = description.toggleClass('expanded').hasClass('expanded');
        description.attr('aria-expanded', isExpanded);
        description.attr('title', isExpanded ? 'Click to hide full description' : 'Click to show full description');
    }

    $(document).on('click', '.pkg-desc', function (e) {
        e.stopPropagation();
        togglePackageDescription($(this));
    });

    $(document).on('keydown', '.pkg-desc', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            togglePackageDescription($(this));
        }
    });

    function selectPackage(packageId) {
        packageId = String(packageId);
        var pkg = packages.find(function (x) { return x.id === packageId; });
        if (!pkg) return;
        if (pkg.isEmpty) {
            startDirectCustomizeWorkflow(pkg);
            return;
        }
        state.customizeMenus = false;
        state.menuBasedPricing = false;
        state.selectedPackage = pkg.id;
        state.packageName = pkg.name;
        state.packagePrice = pkg.price;
        state.pax = Math.max(parseInt(state.pax, 10) || 0, state.eventMinPax);
        state.step1View = 'form';
        currentStep = 1;
        includedChoiceSelections = {};
        includedChoiceDetails = {};
        skippedCustomizeCategories = {};
        skippedCustomizeMenuChoices = {};
        loadMenuPriceMap();
        loadPackageFixedMenus(pkg.id);
    }

    function setFieldError(inputSelector, errorSelector, message) {
        var $input = $(inputSelector);
        var $error = $(errorSelector);
        $input.addClass('input-error');
        $error.removeClass('hidden').text(message || 'Required');
    }

    function clearFieldError(inputSelector, errorSelector) {
        $(inputSelector).removeClass('input-error');
        $(errorSelector).addClass('hidden').text('');
    }

    function getMinimumEventDate() {
        var date = new Date();
        date.setHours(12, 0, 0, 0);
        date.setDate(date.getDate() + (Number(state.eventAdvanceBookingDays) || 0));
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    }

    function getAdvanceBookingMessage() {
        var days = Number(state.eventAdvanceBookingDays) || 0;
        return 'Date must be booked at least ' + days + ' day' + (days === 1 ? '' : 's') + ' in advance. Please select ' + getMinimumEventDate() + ' or later.';
    }

    function focusFixedMenuQuantity(categoryId) {
        window.requestAnimationFrame(function () {
            var quantityInput = document.querySelector(
                '.fixed-menu-qty[data-category-id="' + categoryId + '"]:not([disabled]):not([readonly])'
            );

            if (!quantityInput) {
                return;
            }

            quantityInput.focus({ preventScroll: true });
            quantityInput.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            quantityInput.select();
        });
    }

    function validateStep1(showFeedback) {
        if (!state.selectedEvent) {
            if (showFeedback) showToast('Select an event to continue.', 3000, { type: 'error', title: 'Validation' });
            return false;
        }
        if (state.step1View === 'packages' || (!state.customizeMenus && !state.selectedPackage)) {
            if (showFeedback) {
                showToast(state.customizeMenus ? 'Complete menu selection to continue.' : 'Select a package to continue.', 3000, { type: 'error', title: 'Validation' });
            }
            return false;
        }

        if ((parseInt(state.pax, 10) || 0) <= 0) {
            if (showFeedback) {
                showToast('Enter a valid pax count.', 3000, { type: 'error', title: 'Validation' });
            }
            return false;
        }

        if ((parseInt(state.pax, 10) || 0) < state.eventMinPax) {
            if (showFeedback) {
                showToast('Minimum pax for ' + state.eventName + ' is ' + state.eventMinPax + '.', 3000, { type: 'error', title: 'Validation' });
            }
            return false;
        }

        for (var i = 0; i < includedChoices.length; i++) {
            var category = includedChoices[i];
            var requiredQuantity = Number(category.requiredQuantity) || 1;
            var categoryId = String(category.categoryId);

            if (state.customizeMenus && isCategorySkipped(categoryId)) {
                continue;
            }

            var selections = includedChoiceSelections[categoryId] || [];
            if (!state.customizeMenus && (category.menus || []).length > 1) {
                var selectedFixedMenus = (includedChoiceDetails[categoryId] || []).filter(function (details) {
                    return details && details.selected !== false && (parseInt(details.qty, 10) || 0) > 0;
                }).length;
                var fixedQuantityTotal = (includedChoiceDetails[categoryId] || []).reduce(function (total, details) {
                    return total + (details && details.selected !== false ? Math.max(0, parseInt(details.qty, 10) || 0) : 0);
                }, 0);
                if (selectedFixedMenus < 1 || selectedFixedMenus > requiredQuantity || fixedQuantityTotal !== (parseInt(state.pax, 10) || 0)) {
                    if (showFeedback) {
                        showToast('Choose up to ' + requiredQuantity + ' dish' + (requiredQuantity === 1 ? '' : 'es') +
                            ' from ' + category.categoryName + ' and make the quantity total ' + state.pax + '.', 4000,
                            { type: 'error', title: 'Menu quantity required' });
                        focusFixedMenuQuantity(categoryId);
                    }
                    return false;
                }
            }

            if (state.customizeMenus) {
                if (!validateCategoryQuantity(category, showFeedback)) {
                    return false;
                }
            }
        }

        return true;
    }

    function validateStep4(showFeedback) {
        var requiredFields = [
            { key: 'company', input: '#detailCompany', error: '#detailCompanyError', message: 'Customer / Company Name is required' },
            { key: 'contact', input: '#detailContact', error: '#detailContactError', message: 'Contact Person is required' },
            { key: 'email', input: '#detailEmail', error: '#detailEmailError', message: 'Email is required' },
            { key: 'mobile', input: '#detailMobile', error: '#detailMobileError', message: 'Mobile / WhatsApp is required' },
            { key: 'eventDate', input: '#detailDateText', error: '#detailDateError', message: 'Event Date is required' },
            { key: 'mealPeriodId', input: '#detailPeriod', error: '#detailPeriodError', message: 'Meal Period is required' },
            { key: 'consumingTime', input: '#detailConsumingTime', error: '#detailConsumingTimeError', message: 'Consuming Time is required' },
            { key: 'deliveryType', input: '#detailDeliveryType', error: '#detailDeliveryTypeError', message: 'Delivery Type is required' },
            { key: 'locationId', input: '#detailDeliveryZone', error: '#detailDeliveryZoneError', message: 'Delivery Zone is required' },
            { key: 'customerAddress', input: '#detailCustomerAddress', error: '#detailCustomerAddressError', message: 'Customer Address is required' },
            { key: 'addressLine1', input: '#detailAddressLine1', error: '#detailAddressLine1Error', message: 'Delivery Address is required' },
            { key: 'postal', input: '#detailPostal', error: '#detailPostalError', message: 'Postal Code is required' }
        ];

        if ($('#detailCompany').length) {
            updateEventDetails();
        }

        var firstInvalid = null;
        var hasErrors = false;
        var hasAdvanceBookingError = false;
        var hasDuplicateMobileError = false;
        requiredFields.forEach(function (field) {
            if (['locationId', 'addressLine1', 'postal'].indexOf(field.key) > -1 && String(state.details.deliveryType || '') !== '3') {
                clearFieldError(field.input, field.error);
                return;
            }
            clearFieldError(field.input, field.error);
            var value = $(field.input).length
                ? String($(field.input).val() || '').trim()
                : String(state.details[field.key] || '').trim();
            if (!value || value === '0') {
                hasErrors = true;
                if (showFeedback) {
                    if ($(field.input).length) {
                        setFieldError(field.input, field.error, field.message);
                    }
                }
                if (!firstInvalid && $(field.input).length) {
                    firstInvalid = field.input;
                }
            }
        });

        var postalCode = $('#detailPostal').length
            ? String($('#detailPostal').val() || '').trim()
            : String(state.details.postal || '').trim();
        if (postalCode && !/^\d{6}$/.test(postalCode)) {
            hasErrors = true;
            if (showFeedback && $('#detailPostal').length) {
                setFieldError('#detailPostal', '#detailPostalError', 'Enter a valid 6-digit Postal Code');
            }
            if (!firstInvalid && $('#detailPostal').length) {
                firstInvalid = '#detailPostal';
            }
        }

        var email = $('#detailEmail').length
            ? String($('#detailEmail').val() || '').trim()
            : String(state.details.email || '').trim();
        clearFieldError('#detailEmail', '#detailEmailError');
        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
            hasErrors = true;
            if (showFeedback) {
                if ($('#detailEmail').length) {
                    setFieldError('#detailEmail', '#detailEmailError', 'Enter a valid email address');
                }
            }
            if (!firstInvalid && $('#detailEmail').length) {
                firstInvalid = '#detailEmail';
            }
        }

        var mobileCountry = findPhoneCountry($('#detailMobileCountry').val());
        var alternateCountry = findPhoneCountry($('#detailMobile2Country').val());
        var mobile = phoneLocalDigits($('#detailMobile').val());
        var alternateMobile = phoneLocalDigits($('#detailMobile2').val());
        if (mobile && (mobile.length < mobileCountry[3] || mobile.length > mobileCountry[4])) {
            hasErrors = true;
            if (showFeedback && $('#detailMobile').length) {
                setFieldError('#detailMobile', '#detailMobileError', 'Enter a valid ' + (mobileCountry[3] === mobileCountry[4] ? mobileCountry[3] : mobileCountry[3] + '-' + mobileCountry[4]) + '-digit number for ' + mobileCountry[1]);
            }
            if (!firstInvalid && $('#detailMobile').length) {
                firstInvalid = '#detailMobile';
            }
        }
        clearFieldError('#detailMobile2', '#detailMobile2Error');
        if (alternateMobile && (alternateMobile.length < alternateCountry[3] || alternateMobile.length > alternateCountry[4])) {
            hasErrors = true;
            if (showFeedback && $('#detailMobile2').length) {
                setFieldError('#detailMobile2', '#detailMobile2Error', 'Enter a valid ' + (alternateCountry[3] === alternateCountry[4] ? alternateCountry[3] : alternateCountry[3] + '-' + alternateCountry[4]) + '-digit number for ' + alternateCountry[1]);
            }
            if (!firstInvalid && $('#detailMobile2').length) {
                firstInvalid = '#detailMobile2';
            }
        } else if (mobile && alternateMobile && mobileCountry[2] + mobile === alternateCountry[2] + alternateMobile) {
            hasErrors = true;
            hasDuplicateMobileError = true;
            if (showFeedback && $('#detailMobile2').length) {
                setFieldError('#detailMobile2', '#detailMobile2Error', 'Alternate Mobile No must be different from Mobile / WhatsApp');
            }
            if (!firstInvalid && $('#detailMobile2').length) {
                firstInvalid = '#detailMobile2';
            }
        }

        var eventDateText = String($('#detailDateText').val() || '').trim();
        var eventDate = $('#detailDate').length
            ? String($('#detailDate').val() || '').trim()
            : String(state.details.eventDate || '').trim();
        if (eventDateText && !eventDate) {
            hasErrors = true;
            if (showFeedback) setFieldError('#detailDateText', '#detailDateError', 'Enter a valid date in dd-mm-yyyy format');
            if (!firstInvalid) firstInvalid = '#detailDateText';
        } else if (eventDate && eventDate < getMinimumEventDate()) {
            hasErrors = true;
            hasAdvanceBookingError = true;
            if (showFeedback && $('#detailDate').length) {
                setFieldError('#detailDateText', '#detailDateError', getAdvanceBookingMessage());
            }
            if (!firstInvalid && $('#detailDate').length) {
                firstInvalid = '#detailDateText';
            }
        }

        var consumingTimeText = $('#detailConsumingTime').length
            ? String($('#detailConsumingTime').val() || '').trim()
            : formatConsumingTime(state.details.consumingTime);
        var parsedConsumingTime = parseConsumingTime(consumingTimeText);
        if (consumingTimeText && !parsedConsumingTime) {
            clearFieldError('#detailConsumingTime', '#detailConsumingTimeError');
            hasErrors = true;
            if (showFeedback && $('#detailConsumingTime').length) {
                setFieldError('#detailConsumingTime', '#detailConsumingTimeError', 'Enter a valid time in hh:mm AM/PM format');
            }
            if (!firstInvalid && $('#detailConsumingTime').length) firstInvalid = '#detailConsumingTime';
        } else if (consumingTimeText) {
            clearFieldError('#detailConsumingTime', '#detailConsumingTimeError');
        }

        if (hasErrors && showFeedback) {
            if (firstInvalid) {
                $(firstInvalid).focus();
            }
            if (hasDuplicateMobileError && firstInvalid === '#detailMobile2') {
                showToast('Enter a different Alternate Mobile No.', 3200, { type: 'error', title: 'Mobile number required' });
            } else if (!hasAdvanceBookingError) {
                showToast('Please fill all required Event Details fields.', 3200, { type: 'error', title: 'Validation' });
            }
        }

        return !hasErrors;
    }

    function validateStep(stepNumber, showFeedback) {
        if (stepNumber === 1) {
            return validateStep1(showFeedback);
        }
        if (stepNumber === 4) {
            return validateStep4(showFeedback);
        }
        return true;
    }

    function canMoveToStep(targetStep, showFeedback) {
        if (targetStep <= currentStep) {
            return true;
        }
        return validateStep(currentStep, showFeedback);
    }

    function onIncludedMenuChange() {
        var $select = $(this);
        var categoryId = String($(this).data('category-id'));
        var choiceIndex = Number($(this).data('choice-index'));
        var selectedMenuId = String($(this).val() || '');

        includedChoiceSelections[categoryId] = includedChoiceSelections[categoryId] || [];
        includedChoiceDetails[categoryId] = includedChoiceDetails[categoryId] || [];
        includedChoiceSelections[categoryId][choiceIndex] = selectedMenuId;
        includedChoiceDetails[categoryId][choiceIndex] = includedChoiceDetails[categoryId][choiceIndex] || { qty: 0, notes: '' };
        var currentQuantity = Math.max(0, parseInt(includedChoiceDetails[categoryId][choiceIndex].qty, 10) || 0);
        var quantityInput = $select.closest('.included-choice-row').find('.included-menu-qty');
        if (selectedMenuId) {
            var selectedQuantity = Math.max(customizeMenuMinimumQty, currentQuantity || customizeMenuMinimumQty);
            includedChoiceDetails[categoryId][choiceIndex].qty = selectedQuantity;
            quantityInput.prop('disabled', false).val(selectedQuantity);
        } else {
            includedChoiceDetails[categoryId][choiceIndex].qty = 0;
            quantityInput.prop('disabled', true).val('');
        }

        refreshCategoryChoiceDropdowns(categoryId);
        var category = includedChoices.find(function (item) {
            return String(item.categoryId) === categoryId;
        });
        var selectedMenu = category && (category.menus || []).find(function (menu) {
            return String(menu.id) === selectedMenuId;
        });
        updateMenuFoodTypeBadge($select, selectedMenu ? selectedMenu.foodType : null);
        var selectedMenuPrice = getMenuUnitPrice(category, includedChoiceSelections[categoryId][choiceIndex]);
        $select.closest('.included-choice-row').find('.included-menu-price').text('Menu price: ' + money(selectedMenuPrice));
        updateCategorySelectionProgress(categoryId);
        updateCategoryQuantityStatus(categoryId);
        updateSummary();
    }

    function updateCategorySelectionProgress(categoryId) {
        categoryId = String(categoryId);
        var category = includedChoices.find(function (item) {
            return String(item.categoryId) === categoryId;
        });
        if (!category) return;

        var requiredQuantity = Number(category.requiredQuantity) || 1;
        var selections = includedChoiceSelections[categoryId] || [];
        var selectedCount = selections.reduce(function (count, menuId, index) {
            return count + (!isMenuChoiceSkipped(categoryId, index) && String(menuId || '').trim() ? 1 : 0);
        }, 0);
        $('.choice-block[data-category-id="' + categoryId + '"] .choice-progress-chip')
            .text(selectedCount + ' of ' + requiredQuantity + ' selected')
            .toggleClass('is-complete', selectedCount === requiredQuantity);
    }

    function getCategoryQuantity(categoryId, requiredQuantity) {
        var choiceDetails = includedChoiceDetails[String(categoryId)] || [];
        var total = 0;

        for (var index = 0; index < requiredQuantity; index++) {
            if (isMenuChoiceSkipped(categoryId, index)) {
                continue;
            }
            total += Math.max(0, parseInt((choiceDetails[index] || {}).qty, 10) || 0);
        }

        return total;
    }

    function setChoiceDetail(categoryId, choiceIndex, fieldName, value) {
        includedChoiceDetails[categoryId] = includedChoiceDetails[categoryId] || [];
        includedChoiceDetails[categoryId][choiceIndex] = includedChoiceDetails[categoryId][choiceIndex] || {};
        includedChoiceDetails[categoryId][choiceIndex][fieldName] = value;
    }

    function hasValidCategoryQuantities(categoryId, requiredQuantity) {
        var choiceDetails = includedChoiceDetails[String(categoryId)] || [];
        var selections = includedChoiceSelections[String(categoryId)] || [];

        for (var index = 0; index < requiredQuantity; index++) {
            if (isMenuChoiceSkipped(categoryId, index) || !String(selections[index] || '').trim()) {
                continue;
            }
            var quantity = parseInt((choiceDetails[index] || {}).qty, 10) || 0;
            var minimumQuantity = state.customizeMenus ? customizeMenuMinimumQty : 1;
            if (quantity < minimumQuantity) {
                return false;
            }
        }

        return true;
    }

    function updateCategoryQuantityStatus(categoryId) {
        categoryId = String(categoryId);
        var category = includedChoices.find(function (item) {
            return String(item.categoryId) === categoryId;
        });
        if (!category) return;

        if (isCategorySkipped(categoryId)) {
            $('.category-qty-total[data-category-id="' + categoryId + '"]')
                .text('Skipped for this order')
                .removeClass('invalid')
                .addClass('valid skipped');
            $('.included-menu-qty[data-category-id="' + categoryId + '"]').removeClass('input-error');
            return;
        }

        var requiredQuantity = Number(category.requiredQuantity) || 1;
        var matches = hasValidCategoryQuantities(categoryId, requiredQuantity);

        $('.category-qty-total[data-category-id="' + categoryId + '"]')
            .text('Minimum qty per choice: ' + customizeMenuMinimumQty)
            .toggleClass('valid', matches)
            .toggleClass('invalid', !matches);
        $('.included-menu-qty[data-category-id="' + categoryId + '"]').each(function () {
            var choiceIndex = Number($(this).data('choice-index'));
            var isSelected = String((includedChoiceSelections[categoryId] || [])[choiceIndex] || '').trim() !== '';
            var quantity = parseInt($(this).val(), 10) || 0;
            $(this).toggleClass('input-error', isSelected && quantity < customizeMenuMinimumQty);
        });
    }

    function validateCategoryQuantity(category, showFeedback) {
        var categoryId = String(category.categoryId);
        var requiredQuantity = Number(category.requiredQuantity) || 1;
        var hasValidQuantities = hasValidCategoryQuantities(categoryId, requiredQuantity);

        updateCategoryQuantityStatus(categoryId);

        if (hasValidQuantities) {
            return true;
        }

        if (showFeedback) {
            var message = 'Enter a minimum quantity of ' + customizeMenuMinimumQty + ' for every ' + category.categoryName + ' choice.';
            showToast(message, 4200, {
                type: 'error',
                title: 'Quantity mismatch'
            });
            $('.included-menu-qty[data-category-id="' + categoryId + '"].input-error').first().trigger('focus');
        }

        return false;
    }

    function onIncludedMenuQuantityChange() {
        var categoryId = String($(this).data('category-id'));
        var choiceIndex = Number($(this).data('choice-index'));
        var quantity = Math.max(0, parseInt($(this).val(), 10) || 0);

        setChoiceDetail(categoryId, choiceIndex, 'qty', quantity);
        updateCategoryQuantityStatus(categoryId);
        updateSummary();
    }

    function onIncludedMenuQuantityBlur() {
        var categoryId = String($(this).data('category-id'));
        var choiceIndex = Number($(this).data('choice-index'));
        var hasSelectedMenu = String((includedChoiceSelections[categoryId] || [])[choiceIndex] || '').trim() !== '';
        if (!hasSelectedMenu) {
            $(this).val('');
            setChoiceDetail(categoryId, choiceIndex, 'qty', 0);
            return;
        }
        var minimumQuantity = state.customizeMenus ? customizeMenuMinimumQty : 0;
        var quantity = Math.max(minimumQuantity, parseInt($(this).val(), 10) || 0);
        $(this).val(quantity);
        $(this).trigger('change');
    }

    function onIncludedMenuNotesInput() {
        var categoryId = String($(this).data('category-id'));
        var choiceIndex = Number($(this).data('choice-index'));
        setChoiceDetail(categoryId, choiceIndex, 'notes', String($(this).val() || ''));
    }

    function syncMenuBasedPricingWithFixedPackage(suppressToast) {
        if (state.customizeMenus) return;

        var hasMenuChanges = includedChoices.some(function (category) {
            var categoryId = String(category.categoryId);
            var originalRows = fixedPackageOriginalState[categoryId] || [];
            return (category.menus || []).some(function (menu, index) {
                var original = originalRows[index];
                return !original || String(menu.id || '') !== String(original.menuId || '');
            });
        });
        var wasMenuBased = state.menuBasedPricing;
        state.menuBasedPricing = hasMenuChanges;

        if (hasMenuChanges) loadMenuPriceMap();
        if (suppressToast || wasMenuBased === hasMenuChanges) return;

        if (fixedMenuPriceToastShown) return;
        if (hasMenuChanges) fixedMenuPriceToastShown = true;

        showToast(hasMenuChanges
            ? 'You changed a menu item. Your order total is now calculated using each selected menu price and quantity.'
            : 'You restored the original menu items. Your package is back to the fixed package price.', 10000, {
            type: 'info',
            title: hasMenuChanges ? 'Package price updated' : 'Fixed package price restored'
        });
    }

    function onFixedMenuChange() {
        var $select = $(this);
        var categoryId = String($select.data('category-id'));
        var choiceIndex = Number($select.data('choice-index'));
        var selectedMenuId = String($select.val() || '');
        var category = includedChoices.find(function (item) {
            return String(item.categoryId) === categoryId;
        });
        if (!category || !selectedMenuId || !category.menus[choiceIndex]) return;

        var currentMenu = category.menus[choiceIndex];
        if (String(currentMenu.id) === selectedMenuId) return;

        var duplicateChoice = category.menus.some(function (menu, index) {
            return index !== choiceIndex && String(menu.id) === selectedMenuId;
        });
        if (duplicateChoice) {
            $select.val(String(currentMenu.id));
            showToast('This menu is already selected in the same package choice.', 3000, {
                type: 'warning',
                title: 'Choose another menu'
            });
            return;
        }

        var sourceCategoryId = String(currentMenu.sourceCategoryId || category.sourceCategoryId || '');
        var replacement = (menuCatalogByCategoryId[sourceCategoryId] || []).find(function (menu) {
            return String(menu.id) === selectedMenuId;
        });
        if (!replacement) return;

        category.menus[choiceIndex] = {
            id: String(replacement.id),
            name: replacement.name,
            price: Number(replacement.price) || 0,
            foodType: replacement.foodType ?? null,
            sourceCategoryId: currentMenu.sourceCategoryId || category.sourceCategoryId || null
        };
        includedChoiceSelections[categoryId] = includedChoiceSelections[categoryId] || [];
        includedChoiceSelections[categoryId][choiceIndex] = String(replacement.id);

        syncMenuBasedPricingWithFixedPackage(false);
        renderStep(false);
    }

    function onFixedMenuSelectionChange() {
        var categoryId = String($(this).data('category-id'));
        var choiceIndex = Number($(this).data('choice-index'));
        var isChecked = $(this).is(':checked');
        var pax = Math.max(1, parseInt(state.pax, 10) || 1);
        var currentQty = parseInt(((includedChoiceDetails[categoryId] || [])[choiceIndex] || {}).qty, 10) || 0;
        var category = includedChoices.find(function (item) {
            return String(item.categoryId) === categoryId;
        });

        if (isChecked && category && Number(category.requiredQuantity) === 1) {
            (category.menus || []).forEach(function (_, index) {
                if (index === choiceIndex) return;
                setChoiceDetail(categoryId, index, 'selected', false);
                setChoiceDetail(categoryId, index, 'qty', 0);
            });
        } else if (isChecked && category) {
            var selectedCount = (includedChoiceDetails[categoryId] || []).filter(function (details, index) {
                return index === choiceIndex || (details && details.selected !== false);
            }).length;
            if (selectedCount > Number(category.requiredQuantity)) {
                $(this).prop('checked', false);
                showToast('Choose only ' + category.requiredQuantity + ' dishes from ' + category.categoryName + '.', 3000, {
                    type: 'error',
                    title: 'Choice limit'
                });
                return;
            }

            var selectedIndexes = [];
            (category.menus || []).forEach(function (_, index) {
                var details = (includedChoiceDetails[categoryId] || [])[index] || {};
                if (index === choiceIndex || details.selected !== false) {
                    selectedIndexes.push(index);
                }
            });
            var baseQty = Math.floor(pax / selectedIndexes.length);
            var remainder = pax % selectedIndexes.length;
            selectedIndexes.forEach(function (index, selectedIndex) {
                setChoiceDetail(categoryId, index, 'qty', baseQty + (selectedIndex < remainder ? 1 : 0));
            });
        }

        setChoiceDetail(categoryId, choiceIndex, 'selected', isChecked);
        if (!isChecked) {
            setChoiceDetail(categoryId, choiceIndex, 'qty', 0);
            if (category && Number(category.requiredQuantity) > 1) {
                var remainingSelectedIndex = -1;
                (category.menus || []).some(function (_, index) {
                    var details = (includedChoiceDetails[categoryId] || [])[index] || {};
                    if (index !== choiceIndex && details.selected !== false) {
                        remainingSelectedIndex = index;
                        return true;
                    }
                    return false;
                });
                if (remainingSelectedIndex >= 0) {
                    setChoiceDetail(categoryId, remainingSelectedIndex, 'qty', pax);
                }
            }
            $('.fixed-menu-qty[data-category-id="' + categoryId + '"][data-choice-index="' + choiceIndex + '"]').val(0).prop('disabled', true);
        } else {
            var updatedQty = parseInt(((includedChoiceDetails[categoryId] || [])[choiceIndex] || {}).qty, 10) || 0;
            var nextQty = updatedQty > 0 ? updatedQty : (currentQty > 0 ? currentQty : pax);
            setChoiceDetail(categoryId, choiceIndex, 'qty', nextQty);
            $('.fixed-menu-qty[data-category-id="' + categoryId + '"][data-choice-index="' + choiceIndex + '"]').val(nextQty).prop('disabled', false).trigger('focus');
        }

        syncMenuBasedPricingWithFixedPackage(false);
        renderStep(false);
    }

    function onFixedMenuQuantityChange() {
        var categoryId = String($(this).data('category-id'));
        var choiceIndex = Number($(this).data('choice-index'));
        var quantity = Math.max(0, parseInt($(this).val(), 10) || 0);

        setChoiceDetail(categoryId, choiceIndex, 'qty', quantity);
        if (quantity > 0) {
            setChoiceDetail(categoryId, choiceIndex, 'selected', true);
        }
        var quantityTotal = (includedChoiceDetails[categoryId] || []).reduce(function (total, details) {
            return total + (details && details.selected !== false ? Math.max(0, parseInt(details.qty, 10) || 0) : 0);
        }, 0);
        $('[data-fixed-category-total="' + categoryId + '"]').text('Qty total ' + quantityTotal + ' / ' + state.pax);
        updateSummary();
    }

    function onFixedMenuQuantityBlur() {
        var quantity = Math.max(0, parseInt($(this).val(), 10) || 0);
        $(this).val(quantity);
    }

    $(document).on('change', '.included-menu-select', onIncludedMenuChange);
    $(document).on('input change', '.included-menu-qty', onIncludedMenuQuantityChange);
    $(document).on('blur', '.included-menu-qty', onIncludedMenuQuantityBlur);
    $(document).on('input', '.included-menu-notes', onIncludedMenuNotesInput);
    $(document).on('change', '.fixed-menu-select', onFixedMenuChange);
    $(document).on('change', '.fixed-menu-check', onFixedMenuSelectionChange);
    $(document).on('input change', '.fixed-menu-qty', onFixedMenuQuantityChange);
    $(document).on('blur', '.fixed-menu-qty', onFixedMenuQuantityBlur);
    $(document).on('click', '.choice-accordion-toggle', function () {
        var categoryId = String($(this).data('category-id'));
        var $block = $(this).closest('.choice-accordion');
        var willOpen = !$block.hasClass('is-open');
        customizeCategoryOpenState[categoryId] = willOpen;
        $block.toggleClass('is-open', willOpen);
        $(this).attr('aria-expanded', willOpen ? 'true' : 'false');
    });
    $(document).on('focusin', '.choice-accordion-body :input', function () {
        var $block = $(this).closest('.choice-accordion');
        if (!$block.hasClass('is-open')) {
            var categoryId = String($block.data('category-id'));
            customizeCategoryOpenState[categoryId] = true;
            $block.addClass('is-open').find('.choice-accordion-toggle').attr('aria-expanded', 'true');
        }
    });
    function onExtraItemCheckChange() {
        var itemId = String($(this).data('item-id'));

        if ($(this).is(':checked')) {
            state.extraItems[itemId] = state.extraItems[itemId] || 10;
        } else {
            delete state.extraItems[itemId];
            delete state.extraItemNotes[itemId];
        }

        renderStep(false);
    }

    var lastWholeQuantityWarningAt = 0;

    function showWholeQuantityWarning() {
        var now = Date.now();
        if (now - lastWholeQuantityWarningAt < 800) return;
        lastWholeQuantityWarningAt = now;
        showToast('Only whole numbers are allowed for quantity.', 2500, {
            type: 'warning',
            title: 'Invalid quantity'
        });
    }

    $(document).on('keydown', '.qty-input', function (event) {
        if (['.', ',', 'Decimal', 'e', 'E', '+', '-'].indexOf(event.key) !== -1) {
            event.preventDefault();
            showWholeQuantityWarning();
        }
    });

    $(document).on('input', '.qty-input', function () {
        var rawValue = String($(this).val() || '');
        if (!rawValue || /^\d+$/.test(rawValue)) return;

        var numericValue = Number(rawValue.replace(',', '.'));
        $(this).val(Number.isFinite(numericValue) ? Math.max(0, Math.trunc(numericValue)) : 0);
        showWholeQuantityWarning();
    });

    function onExtraItemQuantityChange() {
        var itemId = String($(this).data('item-id'));
        var qty = parseInt($(this).val(), 10) || 0;

        if (qty > 0 && qty < 10) {
            qty = 10;
            showToast('Minimum quantity for an additional menu item is 10.', 3000, {
                type: 'warning',
                title: 'Minimum quantity'
            });
        }

        if (qty >= 10) {
            state.extraItems[itemId] = qty;
        } else {
            delete state.extraItems[itemId];
            delete state.extraItemNotes[itemId];
        }

        renderStep(false);
    }

    $(document).on('change', '.extra-check', onExtraItemCheckChange);
    $(document).on('change', '.extra-qty', onExtraItemQuantityChange);
    $(document).on('input', '.extra-item-notes', function () {
        var itemId = String($(this).data('item-id'));
        state.extraItemNotes[itemId] = String($(this).val() || '').slice(0, 500);
    });

    $(document).on('change', '.addon-check', function () {
        var addonId = String($(this).data('addon-id'));
        if ($(this).is(':checked')) {
            state.addons[addonId] = state.addons[addonId] || 1;
        } else {
            delete state.addons[addonId];
        }
        renderStep(false);
    });

    $(document).on('change', '.addon-qty', function () {
        var addonId = String($(this).data('addon-id'));
        var qty = parseInt($(this).val(), 10) || 0;
        if (qty > 0) state.addons[addonId] = qty; else delete state.addons[addonId];
        renderStep(false);
    });

    $(document).on('change', '.utensil-qty', function () {
        var utensilId = String($(this).data('id'));
        var name = $(this).data('name');
        var qty = parseInt($(this).val(), 10) || 0;
        var utensil = utensilRows.find(function (row) {
            return String(row.id) === utensilId;
        });
        var suggestedQty = utensil ? calculateUtensilSuggestedQty(utensil) : 0;

        if (qty > suggestedQty) {
            qty = suggestedQty;
            showToast('Quantity must be equal to or less than the suggested quantity (' + suggestedQty + ').', 3000, {
                type: 'warning',
                title: 'Invalid quantity'
            });
        }

        qty = Math.max(qty, 0);
        if (qty > 0) state.utensils[name] = qty; else delete state.utensils[name];
        renderStep(false);
    });

    $(document).on('click', '#suggestUtensilsBtn', function () {
        state.utensils = {};
        utensilRows.forEach(function (row) {
            state.utensils[row.name] = calculateUtensilSuggestedQty(row);
        });
        renderStep(false);
    });

    $(document).on('click', '#clearUtensilsBtn', function () {
        state.utensils = {};
        renderStep(false);
    });

    function scrollOrderPageToTop() {
        window.requestAnimationFrame(function () {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        });
    }

    $(document).on('click', '#summaryNextBtn', function () {
        if (currentStep === 1 && state.step1View === 'packages' && !state.showPackages) {
            if (!state.selectedEvent) {
                showToast('Select an event to continue.', 3000, { type: 'error', title: 'Validation' });
                return;
            }
            if ((parseInt(state.pax, 10) || 0) < state.eventMinPax) {
                showToast('Minimum pax for ' + state.eventName + ' is ' + state.eventMinPax + '.', 3000, { type: 'error', title: 'Validation' });
                return;
            }
            if (!validateStep4(true)) {
                return;
            }
            state.showPackages = true;
            renderStep(false);
            scrollOrderPageToTop();
            return;
        }
        var targetStep = currentStep === 3 ? 6 : Math.min(6, currentStep + 1);
        if (!canMoveToStep(targetStep, true)) {
            return;
        }
        currentStep = targetStep;
        renderStep();
        scrollOrderPageToTop();
    });

    function navigateToPreviousOrderStep() {
        if (currentStep === 1) {
            if (state.step1View === 'packages' && state.showPackages) {
                state.showPackages = false;
                renderStep();
                scrollOrderPageToTop();
                return;
            }
            if (state.step1View !== 'form') return;
            state.step1View = 'packages';
            state.showPackages = true;
        } else {
            currentStep = currentStep === 6 ? 3 : currentStep - 1;
        }
        renderStep();
        scrollOrderPageToTop();
    }

    $(document).on('click', '#btnTopBack, #summaryBackBtn', navigateToPreviousOrderStep);

    $(document).on('click', '#summaryQuoteBtn', function () {
        if (!validateOrderForm()) {
            return;
        }

        if (savedOrderId > 0) {
            showToast('This order has already been saved. Please complete or retry its payment.', 4000, {
                type: 'warning',
                title: 'Order already saved'
            });
            return;
        }

        showQuotationOptions();
    });

    $(document).on('click', '#summarySubmitBtn', function () {
        if (!validateOrderForm()) {
            return;
        }

        // Amendments are prepared by an admin. Save the amended order without
        // asking the admin to sign; the customer signs later from the emailed link.
        if (amendmentOrderId > 0) {
            submitOrder(0, null);
            return;
        }

        openSignatureModal();
    });

    $(document).on('click', '#btnCloseSignature', closeSignatureModal);

    $(document).on('click', '#signatureModal', function (event) {
        if (event.target === this) {
            closeSignatureModal();
        }
    });

    $(document).on('click', '#btnClearSignature', function () {
        prepareSignatureCanvas();
    });

    $(document).on('click', '#btnConfirmSignature', function () {
        if (!signatureHasInk || !signatureCanvas) {
            $('#signatureError').removeClass('hidden');
            return;
        }

        var signatureData = signatureCanvas.toDataURL('image/png');
        $('#signatureModal').addClass('hidden');
        submitOrder(0, signatureData);
    });

    $(document).on('keydown', function (event) {
        if (event.key === 'Escape' && !$('#signatureModal').hasClass('hidden')) {
            closeSignatureModal();
        }
    });

    $(document).on('click', '#btnClosePayment, #btnPaymentCancel', function () {
        closePaymentModal();
    });

    $(document).on('click', '#btnPaymentDone', function () {
        var orderId = parseInt($(this).data('order-id'), 10) || 0;
        if (orderId <= 0) {
            showToast('Unable to confirm payment right now.', 3000, { type: 'error', title: 'Payment failed' });
            return;
        }

        $('#paymentModal').addClass('hidden');
        sendOrderReviewEmail(orderId);
    });

    function updateEventDetails() {
        var selectedMealPeriod = $('#detailPeriod option:selected');
        state.details = {
            company: $('#detailCompany').val(),
            contact: $('#detailContact').val(),
            email: $('#detailEmail').val(),
            mobile: buildInternationalPhoneNumber('#detailMobile', '#detailMobileCountry'),
            mobile2: buildInternationalPhoneNumber('#detailMobile2', '#detailMobile2Country'),
            eventDate: $('#detailDate').val(),
            mealPeriodId: $('#detailPeriod').val(),
            mealPeriod: selectedMealPeriod.val() ? selectedMealPeriod.text() : '',
            consumingTime: String($('#detailConsumingTime').attr('data-time') || ''),
            deliveryType: $('#detailDeliveryType').val(),
            locationId: $('#detailDeliveryZone').val(),
            postal: $('#detailPostal').val(),
            customerAddress: $('#detailCustomerAddress').val(),
            addressLine1: $('#detailAddressLine1').val(),
            notes: $('#detailNotes').val()
        };
    }

    $(document).on('input', '#detailPostal', function () {
        var digitsOnly = String($(this).val() || '').replace(/\D/g, '').slice(0, 6);
        $(this).val(digitsOnly);
    });

    $(document).on('input', '#detailMobile, #detailMobile2', function () {
        var country = findPhoneCountry($(this).is('#detailMobile') ? $('#detailMobileCountry').val() : $('#detailMobile2Country').val());
        var digitsOnly = String($(this).val() || '').replace(/\D/g, '').replace(/^0+/, '').slice(0, country[4]);
        $(this).val(digitsOnly);
    });

    $(document).on('change', '#detailMobileCountry, #detailMobile2Country', function () {
        ($(this).is('#detailMobileCountry') ? $('#detailMobile') : $('#detailMobile2')).trigger('input').trigger('change');
    });

    $(document).on('input', '#detailDateText', function () {
        var digits = String($(this).val() || '').replace(/\D/g, '').slice(0, 8);
        var formatted = digits.slice(0, 2)
            + (digits.length > 2 ? '-' + digits.slice(2, 4) : '')
            + (digits.length > 4 ? '-' + digits.slice(4) : '');

        $(this).val(formatted);
        $('#detailDate').val(displayToIsoDate(formatted));
        clearFieldError('#detailDateText', '#detailDateError');
        updateEventDetails();
        updateSummary();
    });

    $(document).on('blur', '#detailDateText', function () {
        var eventDateText = String($(this).val() || '').trim();
        var eventDate = displayToIsoDate(eventDateText);

        if (eventDateText && !eventDate) {
            setFieldError('#detailDateText', '#detailDateError', 'Enter a valid date in dd-mm-yyyy format');
            return;
        }

        if (eventDate && eventDate < getMinimumEventDate()) {
            setFieldError('#detailDateText', '#detailDateError', getAdvanceBookingMessage());
            return;
        }

        clearFieldError('#detailDateText', '#detailDateError');
    });

    $(document).on('change', '#detailDate', function () {
        $('#detailDateText').val(isoToDisplayDate($(this).val()));
        clearFieldError('#detailDateText', '#detailDateError');
    });

    $(document).on('click', '.consuming-time-toggle', function (event) {
        event.stopPropagation();
        var picker = $(this).closest('.consuming-time-wrap').find('.consuming-time-picker');
        $('.consuming-time-picker').not(picker).addClass('hidden');
        picker.toggleClass('hidden');
    });

    $(document).on('click', '.consuming-time-option', function (event) {
        event.stopPropagation();
        var option = $(this);
        var picker = option.closest('.consuming-time-picker');
        var unit = option.attr('data-unit');
        var value = option.attr('data-value');
        picker.attr('data-' + unit, value);
        picker.find('.consuming-time-option[data-unit="' + unit + '"]').removeClass('selected');
        option.addClass('selected');

        var hour = parseInt(picker.attr('data-hour'), 10);
        var minute = parseInt(picker.attr('data-minute'), 10);
        var period = picker.attr('data-period');
        var hour24 = hour % 12 + (period === 'PM' ? 12 : 0);
        var timeValue = String(hour24).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
        var input = picker.closest('.consuming-time-wrap').find('#detailConsumingTime');
        input.attr('data-time', timeValue).val(formatConsumingTime(timeValue)).trigger('change');
    });

    $(document).on('input', '#detailConsumingTime', function () {
        var parsed = parseConsumingTime($(this).val());
        $(this).attr('data-time', parsed ? parsed.value : '');
    });

    $(document).on('blur', '#detailConsumingTime', function () {
        var input = $(this);
        var text = String(input.val() || '').trim();
        var parsed = parseConsumingTime(text);
        if (!text) {
            input.attr('data-time', '');
            return;
        }
        if (!parsed) {
            input.attr('data-time', '');
            setFieldError('#detailConsumingTime', '#detailConsumingTimeError', 'Enter a valid time in hh:mm AM/PM format');
            return;
        }
        input.attr('data-time', parsed.value).val(parsed.display);
        clearFieldError('#detailConsumingTime', '#detailConsumingTimeError');
        updateEventDetails();
        updateSummary();
    });

    $(document).on('click', function () {
        $('.consuming-time-picker').addClass('hidden');
    });

    $(document).on('keydown', function (event) {
        if (event.key === 'Escape') {
            $('.consuming-time-picker').addClass('hidden');
        }
    });

    $(document).on('change', '#detailDeliveryType', function () {
        var deliveryType = String($(this).val() || '');
        var isSelfService = deliveryType === '2';
        var $deliveryZone = $('#detailDeliveryZone');
        state.details.deliveryType = deliveryType;

        if (isSelfService) {
            $deliveryZone.val('').prop('disabled', true);
            state.details.locationId = '';
            state.details.addressLine1 = '';
            state.details.postal = '';
            clearFieldError('#detailDeliveryZone', '#detailDeliveryZoneError');
            clearFieldError('#detailAddressLine1', '#detailAddressLine1Error');
            clearFieldError('#detailPostal', '#detailPostalError');
        } else {
            $deliveryZone.prop('disabled', !deliveryZones.length);
        }

        renderStep(false);
    });

    $(document).on('change', '.delivery-type-choice', function () {
        $('#detailDeliveryType').val(String($(this).val() || '')).trigger('change');
    });

    $(document).on('change', '#detailDeliveryZone', function () {
        var zoneId = String($(this).val() || '');
        var zone = deliveryZones.find(function (item) { return String(item.id) === zoneId; });
        state.details.locationId = zoneId;
        $('#deliveryFeeNote')
            .toggleClass('hidden', !zone)
            .text(zone ? 'Delivery fee ' + money(zone.deliveryFee) + ' — added to your total now, not at checkout.' : '');
        updateSummary();
    });

    $(document).on('input change', '#detailCompany, #detailContact, #detailEmail, #detailMobile, #detailMobile2, #detailMobileCountry, #detailMobile2Country, #detailDate, #detailPeriod, #detailConsumingTime, #detailDeliveryType, #detailDeliveryZone, #detailPostal, #detailCustomerAddress, #detailAddressLine1, #detailNotes', function () {
        var id = this.id;
        if (id) {
            clearFieldError('#' + id, '#' + id + 'Error');
        }
        updateEventDetails();
        updateSummary();
    });

    function loadAmendmentOrder() {
        var query = new URLSearchParams(window.location.search);
        amendmentOrderId = parseInt(query.get('amendmentOrderId'), 10) || 0;
        if (amendmentOrderId <= 0) return;

        $('.page-title').text('Amend Order');
        document.title = 'Amend Order - Gayatri Catering';

        if (!amendmentDetailsLoadedFromApi) {
            showOrderLoader(true);
            $.ajax({
                url: '/Admin/ViewOrderDetails/get',
                type: 'GET',
                data: { orderId: amendmentOrderId },
                success: function (response) {
                    if (!response || !response.success || !response.details) {
                        showOrderLoader(false);
                        showToast('Unable to load amendment order details.', 3500, { type: 'error', title: 'Amendment' });
                        return;
                    }

                    sessionStorage.setItem('gayatri.amendmentOrder', JSON.stringify({
                        orderId: amendmentOrderId,
                        paidAmount: Number(response.details.order?.paidAmount) || 0,
                        paymentStatus: Number(response.details.order?.paymentStatus) || 0,
                        details: response.details
                    }));
                    amendmentDetailsLoadedFromApi = true;
                    loadAmendmentOrder();
                },
                error: function (xhr) {
                    showOrderLoader(false);
                    showToast(xhr.responseJSON?.message || 'Unable to load amendment order details.', 3500, { type: 'error', title: 'Amendment' });
                }
            });
            return;
        }

        var saved;
        try {
            saved = JSON.parse(sessionStorage.getItem('gayatri.amendmentOrder') || 'null');
        } catch (_error) {
            saved = null;
        }

        if (!saved || Number(saved.orderId) !== amendmentOrderId || !saved.details || !saved.details.order) {
            showOrderLoader(false);
            showToast('Unable to load amendment order details.', 3500, { type: 'error', title: 'Amendment' });
            return;
        }

        var details = saved.details;
        var header = details.order;
        var deliveryAddress = String(header.deliveryAddress || details.event?.eventAddress || '').trim();
        var postalMatch = deliveryAddress.match(/(?:^|,\s*)(\d{6})$/);
        amendmentPaidAmount = Math.max(0, Number((header.paidAmount ?? saved.paidAmount) ?? 0) || 0);
        amendmentPaymentLoaded = true;
        amendmentLocationId = parseInt(header.locationId, 10) || null;

        state.selectedEvent = String(header.eventId || '');
        state.selectedPackage = String(details.package?.packageId || '');
        state.packageName = details.package?.packageName || header.packageName || '-';
        state.packagePrice = Number(details.package?.packagePrice) || 0;
        state.pax = Number(header.pax) || 0;
        state.customizeMenus = toBool(details.package?.isEmpty ?? details.package?.IsEmpty, false);
        var savedPackageBase = Number(header.packageBaseAmount ?? header.PackageBaseAmount);
        var fixedPackageBase = state.pax * state.packagePrice;
        state.menuBasedPricing = state.customizeMenus ||
            (Number.isFinite(savedPackageBase) && Math.abs(savedPackageBase - fixedPackageBase) > 0.01);
        state.step1View = 'form';
        amendmentMealPeriodName = String(header.mealPeriodName || '');
        state.details = {
            company: header.customerName || '',
            contact: header.customerName || '',
            email: header.emailId || '',
            mobile: header.mobileNo || '',
            mobile2: details.event?.alternateMobileNo || '',
            eventDate: header.eventDate ? String(header.eventDate).slice(0, 10) : '',
            mealPeriodId: String(header.mealPeriodId || ''),
            mealPeriod: amendmentMealPeriodName,
            consumingTime: details.event?.consumingTime
                ? String(details.event.consumingTime).slice(0, 5)
                : '',
            deliveryType: Number(details.event?.deliveryType) || 0,
            locationId: String(amendmentLocationId || ''),
            postal: header.pincode || (postalMatch ? postalMatch[1] : ''),
            customerAddress: header.customerAddress || '',
            addressLine1: postalMatch ? deliveryAddress.slice(0, postalMatch.index).replace(/,\s*$/, '') : deliveryAddress,
            notes: header.notes || ''
        };

        includedChoiceSelections = {};
        includedChoiceDetails = {};
        skippedCustomizeCategories = {};
        skippedCustomizeMenuChoices = {};
        (details.includedItems || []).forEach(function (item) {
            var categoryId = String(item.categoryId || '');
            if (!categoryId || !item.menuId) return;
            includedChoiceSelections[categoryId] = includedChoiceSelections[categoryId] || [];
            includedChoiceDetails[categoryId] = includedChoiceDetails[categoryId] || [];
            includedChoiceSelections[categoryId].push(String(item.menuId));
            includedChoiceDetails[categoryId].push({
                qty: Number(item.qty) || 1,
                notes: String(item.notes || '')
            });
        });

        state.extraItems = {};
        state.extraItemNotes = {};
        (details.extraItems || []).forEach(function (item) {
            state.extraItems[String(item.menuId)] = Number(item.qty) || 0;
            state.extraItemNotes[String(item.menuId)] = String(item.notes || '');
        });
        state.addons = {};
        (details.addOns || []).forEach(function (item) {
            state.addons[String(item.addOnsId)] = Number(item.qty) || 0;
        });
        state.utensils = {};
        (details.utensils || []).forEach(function (item) {
            state.utensils[String(item.utensilName)] = Number(item.qty) || 0;
        });

        if (state.selectedEvent) loadOrderPackages(state.selectedEvent);
        if (state.selectedPackage) {
            if (state.customizeMenus) {
                loadMenuPriceMap();
                loadDirectCustomizeMenus(details.includedItems || []);
            } else {
                if (state.menuBasedPricing) loadMenuPriceMap();
                loadPackageFixedMenus(state.selectedPackage, details.includedItems || []);
            }
        }

    }

    showOrderLoader(true);
    renderStep(false);
    bindSignatureCanvas();
    loadAmendmentOrder();
    loadOrganizationGst();
    loadOrderEvents();
    resumePaymentEmailAfterRedirect();
});
