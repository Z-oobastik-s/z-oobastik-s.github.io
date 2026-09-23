/**
 * Dev-only последовательности на главной (англ. раскладка, без фокуса в полях ввода).
 * Не документируется в UI.
 */
(function () {
    'use strict';

    var BUFFER_IDLE_MS = 2000;
    var MAX_BUF = 24;
    var buf = '';
    var lastTs = 0;
    var lastMode = null;

    var CHEATS = [
        { kind: 'coins', code: 'cheatcoin20000', amount: 20000 },
        { kind: 'coins', code: 'cheatcoin1000', amount: 1000 },
        { kind: 'level', code: 'cheatlevelup' }
    ];

    
    function cheatsAllowed() {
        var auth = window.authModule;
        if (!auth || typeof auth.getCurrentUser !== 'function') return false;
        var u = auth.getCurrentUser();
        if (!u) return false;
        var name = String(u.username || '').trim().toLowerCase();
        return name === 'zzz';
    }

    function resetBuffer() {
        buf = '';
        lastTs = 0;
    }

    function onHome() {
        try {
            return window.app && window.app.currentMode === 'home';
        } catch (_e) {
            return false;
        }
    }

    function typingInField() {
        var el = document.activeElement;
        if (!el || el === document.body) return false;
        var tag = (el.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
        return !!el.isContentEditable;
    }

    function syncModeAndMaybeReset() {
        try {
            var m = window.app ? window.app.currentMode : null;
            if (m !== lastMode) {
                resetBuffer();
                lastMode = m;
            }
        } catch (_e) {
            resetBuffer();
        }
    }

    function grantCoins(n) {
        if (!cheatsAllowed()) return;
        var auth = window.authModule;
        var u = auth && auth.getCurrentUser && auth.getCurrentUser();
        if (u && auth.addCoins) {
            auth.addCoins(u.uid, n).then(function (res) {
                if (res.success && typeof window.updateUserUI === 'function') {
                    var cu = auth.getCurrentUser();
                    if (cu) window.updateUserUI(cu, cu);
                }
            }).catch(function () {});
        }
    }

    function doLevelUp() {
        if (!cheatsAllowed()) return;
        var L = window.levelModule;
        if (!L || typeof window.applySessionXpAndLevelReward !== 'function') return;
        var curXP = L.getPlayerXP();
        var lv = L.getLevelInfo(curXP).level;
        var need = L.getXPThreshold(lv + 1) - curXP;
        if (need < 1) need = 1;
        window.applySessionXpAndLevelReward(need);
        if (window.app && window.app.pendingLevelUp) {
            var up = window.app.pendingLevelUp;
            window.app.pendingLevelUp = null;
            if (typeof window.showLevelUpSequence === 'function') window.showLevelUpSequence(up);
        }
        if (typeof window.renderLevelBlock === 'function') window.renderLevelBlock();
    }

    function tryMatch() {
        if (!cheatsAllowed()) return false;
        var i, c;
        for (i = 0; i < CHEATS.length; i++) {
            c = CHEATS[i];
            if (buf.length >= c.code.length && buf.slice(-c.code.length) === c.code) {
                if (c.kind === 'coins') grantCoins(c.amount);
                else if (c.kind === 'level') doLevelUp();
                resetBuffer();
                return true;
            }
        }
        return false;
    }

    document.addEventListener('keydown', function (e) {
        syncModeAndMaybeReset();
        if (!onHome()) return;
        if (!cheatsAllowed()) return;
        if (typingInField()) {
            resetBuffer();
            return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) {
            resetBuffer();
            return;
        }
        var now = Date.now();
        if (lastTs > 0 && now - lastTs > BUFFER_IDLE_MS) resetBuffer();
        lastTs = now;

        var k = e.key;
        if (k.length !== 1) return;
        var ch = k.toLowerCase();
        if (!/[a-z0-9]/.test(ch)) {
            resetBuffer();
            return;
        }
        buf = (buf + ch).slice(-MAX_BUF);
        tryMatch();
    }, false);

    window.addEventListener('blur', resetBuffer);

    setInterval(syncModeAndMaybeReset, 500);
})();
