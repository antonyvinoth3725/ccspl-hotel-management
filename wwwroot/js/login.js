(function () {
    var otpExpiresAt = null;
    var otpInterval = null;
    var otpVerified = false;
    var isRedirecting = false;

    function ensureSendCodeButtonMarkup() {
        var $btn = $('#sendCodeBtn');
        if (!$btn.length || $btn.data('gcLoaderReady')) return;

        var label = $.trim($btn.text()) || 'Send Code';
        $btn.html('<span class="gc-btn-label"></span><span class="gc-btn-loader" aria-hidden="true"></span>');
        $btn.find('.gc-btn-label').text(label);
        $btn.data('gcLoaderReady', true);
    }

    function ensureSignInButtonMarkup() {
        var $btn = $('#signInBtn');
        if (!$btn.length || $btn.data('gcLoaderReady')) return;

        var label = $.trim($btn.text()) || 'Verify OTP';
        $btn.html('<span class="gc-btn-label"></span><span class="gc-btn-loader" aria-hidden="true"></span>');
        $btn.find('.gc-btn-label').text(label);
        $btn.data('gcLoaderReady', true);
    }

    function setSendCodeButtonState(isDisabled, label, isLoading) {
        var $btn = $('#sendCodeBtn');
        if (!$btn.length) return;

        ensureSendCodeButtonMarkup();

        $btn.prop('disabled', !!isDisabled);
        $btn.toggleClass('is-busy', !!isLoading);

        if ($btn.find('.gc-btn-label').length) {
            $btn.find('.gc-btn-label').text(label || 'Send Code');
        } else {
            $btn.text(label || 'Send Code');
        }
    }

    function setSendCodeVisible(isVisible) {
        var $btn = $('#sendCodeBtn');
        if (!$btn.length) return;
        $btn.toggleClass('hidden', !isVisible);
    }

    function setSignInButtonState(isDisabled, label, isLoading) {
        var $btn = $('#signInBtn');
        if (!$btn.length) return;

        ensureSignInButtonMarkup();

        $btn.prop('disabled', !!isDisabled);
        $btn.toggleClass('is-busy', !!isLoading);

        if ($btn.find('.gc-btn-label').length) {
            $btn.find('.gc-btn-label').text(label || 'Verify OTP');
        } else {
            $btn.text(label || 'Verify OTP');
        }
    }

    function setSignInIdleState() {
        setSignInButtonState(false, otpVerified ? 'Login' : 'Verify OTP', false);
    }

    function setOtpHint(text, showWarning) {
        var $el = $('#otpExpiryText');
        if (!$el.length) return;

        if (!text) {
            $el.addClass('hidden').text('').css('color', '');
            return;
        }

        $el.removeClass('hidden').text(text);
        $el.css('color', showWarning ? '#dc2626' : '');
    }

    function stopOtpTimer() {
        if (otpInterval) {
            clearInterval(otpInterval);
            otpInterval = null;
        }
    }

    function resetLoginState() {
        isRedirecting = false;
        stopOtpTimer();
        otpExpiresAt = null;
        otpVerified = false;
        $('#loginRoleWrap').addClass('hidden');
        $('#loginRole').prop('disabled', true).html('<option value="">--Select role--</option>');
        setSignInIdleState();
        $('#loginEmail').prop('readonly', false);
        $('#loginCode').prop('readonly', false);
        setSendCodeVisible(true);
        setSendCodeButtonState(false, 'Send Code', false);
        setOtpHint('', false);
        $('#loginCloseBtn, #cancelLoginBtn').prop('disabled', false);
        $('#loginRole').prop('disabled', true);
    }

    function setRedirectingState() {
        isRedirecting = true;
        setSignInButtonState(true, 'Redirecting...', true);
        $('#sendCodeBtn').prop('disabled', true);
        $('#loginCloseBtn, #cancelLoginBtn').prop('disabled', true);
        $('#loginEmail, #loginCode, #loginRole').prop('disabled', true);
        setOtpHint('Login successful. Redirecting to your portal...', false);
    }

    function bindRoles(roles) {
        var list = Array.isArray(roles) ? roles : [];
        var options = '<option value="">--Select role--</option>';

        for (var i = 0; i < list.length; i++) {
            var roleId = parseInt(list[i].roleId || list[i].RoleId || 0, 10);
            var roleName = (list[i].roleName || list[i].RoleName || '').toString();
            if (roleId > 0 && roleName) {
                options += '<option value="' + roleId + '">' + roleName + '</option>';
            }
        }

        $('#loginRole').html(options).prop('disabled', false);
        $('#loginRoleWrap').removeClass('hidden');
    }

    function startOtpTimer(seconds) {
        stopOtpTimer();

        var ttl = parseInt(seconds, 10);
        if (!ttl || ttl <= 0) {
            setOtpHint('OTP expired. Please click Send Code again.', true);
            setSendCodeButtonState(false, 'Send Code', false);
            otpExpiresAt = null;
            setSignInIdleState();
            return;
        }

        otpExpiresAt = new Date(Date.now() + (ttl * 1000));
        setSendCodeButtonState(true, 'Resend', false);
        setSendCodeVisible(true);

        otpInterval = setInterval(function () {
            var remaining = Math.max(0, Math.floor((otpExpiresAt.getTime() - Date.now()) / 1000));
            if (remaining <= 0) {
                stopOtpTimer();
                otpExpiresAt = null;
                setSendCodeButtonState(false, 'Send Code', false);
                setOtpHint('OTP expired. Please click Send Code again.', true);
                setSignInIdleState();
                return;
            }

            var sec = remaining < 10 ? ('0' + remaining) : String(remaining);
            setSendCodeButtonState(true, 'Resend (' + sec + 's)', false);
            setOtpHint('Code expires in 00:' + sec, false);
        }, 250);
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
    }

    function sendCode() {
        var email = ($('#loginEmail').val() || '').trim();

        resetLoginState();

        if (!validateEmail(email)) {
            showToast('Please enter valid email.', 2500, { type: 'warning', title: 'Validation' });
            $('#loginEmail').focus();
            setSignInIdleState();
            return;
        }

        setSendCodeButtonState(true, 'Sending...', true);

        $.ajax({
            url: '/Login/SendCode',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email: email }),
            success: function (res) {
                if (res && res.success) {
                    showToast(res.message || 'OTP sent successfully.', 2500, { type: 'success', title: 'OTP Sent' });
                    startOtpTimer(res.expiresInSeconds || 60);
                    $('#loginCode').val('');
                    $('#loginCode').focus();
                } else {
                    showToast((res && res.message) || 'Unable to send OTP.', 3000, { type: 'error', title: 'Send failed' });
                }
            },
            error: function () {
                showToast('Unable to send OTP.', 3000, { type: 'error', title: 'Send failed' });
            },
            complete: function () {
                if (!otpExpiresAt) {
                    setSendCodeButtonState(false, 'Send Code', false);
                }
            }
        });
    }

    function verifyOtp() {
        var email = ($('#loginEmail').val() || '').trim();
        var code = ($('#loginCode').val() || '').trim();
        var shouldAutoComplete = false;

        if (!validateEmail(email)) {
            showToast('Please enter valid email.', 2500, { type: 'warning', title: 'Validation' });
            $('#loginEmail').focus();
            return;
        }

        if (!code) {
            showToast('Please enter OTP code.', 2500, { type: 'warning', title: 'Validation' });
            $('#loginCode').focus();
            setSignInIdleState();
            return;
        }

        if (!otpExpiresAt || Date.now() > otpExpiresAt.getTime()) {
            showToast('OTP expired. Please click Send Code again.', 2500, { type: 'warning', title: 'OTP expired' });
            setSignInIdleState();
            return;
        }

        setSignInButtonState(true, 'Verifying...', true);

        $.ajax({
            url: '/Login/VerifyCode',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email: email, code: code }),
            success: function (res) {
                if (res && res.success) {
                    var roles = res.roles || [];
                    if (!Array.isArray(roles) || roles.length === 0) {
                        showToast('No role is mapped for this user.', 3000, { type: 'error', title: 'Role missing' });
                        setSignInIdleState();
                        return;
                    }

                    otpVerified = true;
                    stopOtpTimer();
                    otpExpiresAt = null;
                    setSendCodeVisible(false);
                    setOtpHint('', false);
                    bindRoles(roles);
                    $('#loginEmail').prop('readonly', true);
                    $('#loginCode').prop('readonly', true);

                    if (roles.length === 1) {
                        var oneRoleId = parseInt(roles[0].roleId || roles[0].RoleId || 0, 10);
                        if (oneRoleId > 0) {
                            $('#loginRole').val(String(oneRoleId));
                            shouldAutoComplete = true;
                            showToast('OTP verified. Logging in with your mapped role.', 2200, { type: 'success', title: 'OTP Verified' });
                            completeLogin();
                            return;
                        }
                    }

                    setSignInButtonState(false, 'Login', false);
                    $('#loginRole').focus();
                    showToast(res.message || 'OTP validated successfully.', 2500, { type: 'success', title: 'OTP Verified' });
                } else {
                    showToast((res && res.message) || 'Invalid OTP.', 3000, { type: 'error', title: 'Login failed' });
                    setSignInIdleState();
                }
            },
            error: function () {
                showToast('Unable to verify OTP. Please try again.', 3000, { type: 'error', title: 'Login failed' });
                setSignInIdleState();
            },
            complete: function () {
                if (!shouldAutoComplete) {
                    setSignInIdleState();
                }
            }
        });
    }

    function completeLogin() {
        var email = ($('#loginEmail').val() || '').trim();
        var roleId = parseInt($('#loginRole').val() || '0', 10);
        var redirectStarted = false;

        if (!otpVerified) {
            verifyOtp();
            return;
        }

        if (roleId <= 0) {
            showToast('Please select role.', 2500, { type: 'warning', title: 'Validation' });
            $('#loginRole').focus();
            setSignInIdleState();
            return;
        }

        setSignInButtonState(true, 'Signing In...', true);

        $.ajax({
            url: '/Login/CompleteLogin',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email: email, roleId: roleId }),
            success: function (res) {
                if (res && res.success) {
                    redirectStarted = true;
                    stopOtpTimer();

                    var roleLabel = res.roleLabel || 'User';
                    var userName = res.userName || 'User';
                    var userImage = res.userImage || '';
                    var userId = parseInt(res.userId || '0', 10) || 0;
                    var roleId = parseInt(res.roleId || '0', 10) || 0;
                    var existingDetails = typeof window.getUserDetails === 'function' ? (window.getUserDetails() || {}) : {};

                    var userDetails = {
                        isLoggedIn: true,
                        userId: userId,
                        roleId: roleId,
                        userEmail: email,
                        userRole: roleLabel,
                        userName: userName,
                        userImage: userImage,
                        sidebarCollapsed: !!existingDetails.sidebarCollapsed
                    };

                    if (typeof window.setUserDetails === 'function') {
                        window.setUserDetails(userDetails);
                    } else {
                        localStorage.setItem('UserDetails', JSON.stringify(userDetails));
                    }

                    if (typeof window.renderHeaderProfile === 'function') {
                        window.renderHeaderProfile();
                    }

                    setRedirectingState();
                    showToast(res.message || 'Signed in successfully.', 2500, { type: 'success', title: 'Welcome' });

                    if (typeof window.redirectAfterLogin === 'function') {
                        window.redirectAfterLogin({
                            userId: userId,
                            roleId: roleId,
                            roleLabel: roleLabel,
                            userName: userName
                        });
                    } else if (res.redirectUrl) {
                        window.location.href = res.redirectUrl;
                    }
                } else {
                    showToast((res && res.message) || 'Unable to login.', 3000, { type: 'error', title: 'Login failed' });
                    setSignInIdleState();
                }
            },
            error: function () {
                showToast('Unable to login. Please try again.', 3000, { type: 'error', title: 'Login failed' });
                setSignInIdleState();
            },
            complete: function () {
                if (!redirectStarted) {
                    setSignInIdleState();
                }
            }
        });
    }

    function signIn() {
        if (otpVerified) {
            completeLogin();
            return;
        }

        verifyOtp();
    }

    function bindLoginEvents() {
        ensureSendCodeButtonMarkup();
        ensureSignInButtonMarkup();

        $('#loginCode').off('keypress.login').on('keypress.login', function (e) {
            if (e.which === 13) {
                e.preventDefault();
                signIn();
            }
        });

        $('#loginEmail').off('input.login').on('input.login', function () {
            if (otpVerified) {
                resetLoginState();
            }
        });

        $('#loginCode').off('input.reset').on('input.reset', function () {
            if (otpVerified) {
                resetLoginState();
            }
        });

        resetLoginState();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindLoginEvents);
    } else {
        bindLoginEvents();
    }

    window.LoginProcess = {
        sendCode: sendCode,
        signIn: signIn,
        stopOtpTimer: stopOtpTimer,
        reset: resetLoginState
    };
})();
