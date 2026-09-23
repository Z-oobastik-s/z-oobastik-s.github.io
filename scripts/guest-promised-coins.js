/**
 * Обещанные монеты для гостей: копятся в localStorage до входа в аккаунт.
 * После login/register auth.js забирает сумму и вызывает addCoins.
 */
(function () {
    'use strict';
    var STORAGE_KEY = 'zoob_guest_promised_coins_v1';
    var MAX_TOTAL = 9999999;

    function readRaw() {
        try {
            var v = parseInt(localStorage.getItem(STORAGE_KEY), 10);
            return isFinite(v) && v > 0 ? v : 0;
        } catch (_e) {
            return 0;
        }
    }

    function writeRaw(n) {
        try {
            if (n <= 0) localStorage.removeItem(STORAGE_KEY);
            else localStorage.setItem(STORAGE_KEY, String(n));
        } catch (_e) {}
    }

    window.guestPromisedCoins = {
        peekTotal: function () {
            return readRaw();
        },
        add: function (amount) {
            var n = parseInt(amount, 10) || 0;
            if (n <= 0) return readRaw();
            var sum = Math.min(MAX_TOTAL, readRaw() + n);
            writeRaw(sum);
            return sum;
        },
        /** Атомарно: забрать всю сумму и обнулить (для merge при входе). */
        drainTotal: function () {
            var t = readRaw();
            writeRaw(0);
            return t;
        },
        clear: function () {
            writeRaw(0);
        }
    };
})();
