/**
 * Анти-накрутка: эвристики по балансу, уровню, сессиям и достижениям.
 * При срабатывании - сообщение и полный сброс игровых данных (локально + сервер при API).
 */
(function () {
    'use strict';

    var PING_COOLDOWN_MS = 8000;
    var PERIODIC_MS = 120000;
    var INITIAL_DELAY_MS = 4000;
    var MAX_ACHIEVEMENTS = 24;
    var STORAGE_USERS = 'zwebsitesimulator_users';
    var STORAGE_CURRENT = 'zwebsitesimulator_current_user';
    var STORAGE_TOKEN = 'zwebsitesimulator_token';
    /** Синхронизация вкладок: нарушение зафиксировано, пока не выполнен сброс. */
    var VIOLATION_FLAG_KEY = '__zoob_integrity_violation';

    var lastPingAt = 0;
    var annulRunning = false;
    var periodicPingId = null;
    var initialPingTimeoutId = null;
    /** Авто-аннулирование через N мс после показа окна (без кнопки). */
    var AUTO_ANNUL_MS = 5000;
    var annulCountdownTimer = null;
    var annulAutoTimer = null;
    /** Пока висит бан-экран: слежение за DOM, попытка снять блок - сразу сброс. */
    var integrityLockUid = null;
    var shieldBodyObserver = null;
    var shieldAttrObserver = null;
    var watchdogTimer = null;
    var tamperRaf = null;
    var WATCHDOG_MS = 100;

    function useApi() {
        return typeof window !== 'undefined' && window.API_BASE_URL && String(window.API_BASE_URL).trim() !== '';
    }

    function igLang() {
        if (typeof app !== 'undefined' && app.lang) {
            return app.lang === 'uk' ? 'ua' : app.lang;
        }
        var dl = document.documentElement && document.documentElement.getAttribute('data-lang');
        if (dl === 'uk') return 'ua';
        return dl || 'ru';
    }

    function igT(key) {
        var tr = window.translations || {};
        var L = igLang();
        var t = tr[L] && tr[L][key];
        if ((!t || t === '') && L === 'ua' && tr.ru) t = tr.ru[key];
        if ((!t || t === '') && tr.en) t = tr.en[key];
        return t || key;
    }

    function igReplace(key, map) {
        var s = igT(key);
        if (!map) return s;
        Object.keys(map).forEach(function (k) {
            s = s.split('{{' + k + '}}').join(String(map[k]));
        });
        return s;
    }

    function clearAnnulUiTimers() {
        if (annulCountdownTimer) {
            clearInterval(annulCountdownTimer);
            annulCountdownTimer = null;
        }
        if (annulAutoTimer) {
            clearTimeout(annulAutoTimer);
            annulAutoTimer = null;
        }
    }

    function bonusCoinsForReachedLevel(level) {
        if (level <= 1) return 0;
        var c = 10 + Math.floor(level * 1.5);
        if (level % 5 === 0) c += 20;
        if (level % 10 === 0) c += 40;
        if (level >= 51) c += 15 + Math.floor((level - 50) * 0.5);
        return c;
    }

    function sumLevelUpCoinsUpToLevel(level) {
        var sum = 0;
        var Lmax = Math.min(200, Math.max(1, Math.floor(level)));
        for (var L = 2; L <= Lmax; L++) sum += bonusCoinsForReachedLevel(L);
        return sum;
    }

    function countUnlockedAchievements() {
        try {
            var raw = localStorage.getItem('typeMasterAchievements');
            var a = raw ? JSON.parse(raw) : [];
            return Array.isArray(a) ? a.length : 0;
        } catch (_e) {
            return 0;
        }
    }

    function countUniqueLessonsFromStats(statsData) {
        var ls = statsData && statsData.lessonStats;
        if (!ls || typeof ls !== 'object') return 0;
        var n = 0;
        Object.keys(ls).forEach(function (k) {
            if (ls[k] && ls[k].completed) n++;
        });
        return n;
    }

    function wipeGameLocalStorage() {
        var keys = [
            'typeMasterStats',
            'typeMasterAchievements',
            'typeMasterAchievementsSelected',
            'zoobastiks_player_xp',
            'zoobastiks_stats',
            'zoobastiks_streak',
            'zoobastiks_speedtest_last_progress',
            'zoobastiks_unlocked_backgrounds',
            'zoob_guest_promised_coins_v1'
        ];
        try {
            keys.forEach(function (k) {
                try {
                    localStorage.removeItem(k);
                } catch (_e) {}
            });
            var toRemove = [];
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key && key.indexOf('zoob_daily_') === 0) toRemove.push(key);
            }
            toRemove.forEach(function (k) {
                try {
                    localStorage.removeItem(k);
                } catch (_e) {}
            });
        } catch (_e) {}
    }

    function resetLocalRegisteredUser(uid) {
        if (!uid) return;
        try {
            var raw = localStorage.getItem(STORAGE_USERS);
            var users = raw ? JSON.parse(raw) : {};
            if (!users || typeof users !== 'object') users = {};
            var u = users[uid];
            if (u) {
                u.balance = 50;
                u.purchasedLessons = [];
                u.collectedCards = [];
                u.stats = {
                    totalSessions: 0,
                    totalTime: 0,
                    bestSpeed: 0,
                    averageAccuracy: 0,
                    completedLessons: 0,
                    totalErrors: 0,
                    sessions: []
                };
                users[uid] = u;
                localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
            }
            var curRaw = localStorage.getItem(STORAGE_CURRENT);
            var cur = curRaw ? JSON.parse(curRaw) : null;
            if (cur && cur.uid === uid && u) {
                localStorage.setItem(STORAGE_CURRENT, JSON.stringify(u));
            }
        } catch (_e) {}
    }

    function readViolationFlagUid() {
        try {
            var raw = localStorage.getItem(VIOLATION_FLAG_KEY);
            if (!raw) return null;
            var o = JSON.parse(raw);
            return o && o.uid ? String(o.uid) : null;
        } catch (_e) {
            return null;
        }
    }

    function setViolationFlag(uid) {
        try {
            localStorage.setItem(VIOLATION_FLAG_KEY, JSON.stringify({ uid: uid, at: Date.now() }));
        } catch (_e) {}
    }

    function clearViolationFlag() {
        try {
            localStorage.removeItem(VIOLATION_FLAG_KEY);
        } catch (_e) {}
    }

    function isAnnulOverlayInDom() {
        return !!document.getElementById('integrityAnnulOverlay');
    }

    /** Оверлей на месте, видим и перекрывает экран (не только удаление в Elements). */
    function isIntegrityGateOk() {
        var el = document.getElementById('integrityAnnulOverlay');
        if (!el || !el.isConnected) return false;
        if (el.hasAttribute('hidden')) return false;
        var s = window.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.08) return false;
        if (s.pointerEvents === 'none') return false;
        var r = el.getBoundingClientRect();
        var vw = window.innerWidth || 0;
        var vh = window.innerHeight || 0;
        var minW = Math.min(240, vw * 0.35);
        var minH = Math.min(240, vh * 0.35);
        if (r.width < minW || r.height < minH) return false;
        var overlaps = r.bottom > 40 && r.right > 40 && r.left < vw - 40 && r.top < vh - 40;
        return overlaps;
    }

    function stopIntegritySentinels() {
        if (shieldBodyObserver) {
            try {
                shieldBodyObserver.disconnect();
            } catch (_e) {}
            shieldBodyObserver = null;
        }
        if (shieldAttrObserver) {
            try {
                shieldAttrObserver.disconnect();
            } catch (_e) {}
            shieldAttrObserver = null;
        }
        if (watchdogTimer) {
            clearInterval(watchdogTimer);
            watchdogTimer = null;
        }
        if (tamperRaf != null) {
            try {
                cancelAnimationFrame(tamperRaf);
            } catch (_e2) {}
            tamperRaf = null;
        }
        integrityLockUid = null;
        try {
            window.__zoobIntegrityActive = false;
        } catch (_e3) {}
    }

    function triggerTamperAnnul() {
        if (annulRunning) return;
        var uid = integrityLockUid || readViolationFlagUid();
        if (!uid) {
            stopIntegritySentinels();
            clearViolationFlag();
            wipeGameLocalStorage();
            location.reload();
            return;
        }
        clearAnnulUiTimers();
        executeAnnulment(uid);
    }

    function scheduleTamperCheck() {
        if (tamperRaf != null) return;
        tamperRaf = requestAnimationFrame(function () {
            tamperRaf = null;
            if (!integrityLockUid || annulRunning) return;
            if (readViolationFlagUid() !== integrityLockUid) return;
            if (!isIntegrityGateOk()) triggerTamperAnnul();
        });
    }

    function startIntegritySentinels(uid, overlayEl) {
        stopIntegritySentinels();
        if (!uid) return;
        integrityLockUid = uid;
        try {
            window.__zoobIntegrityActive = true;
        } catch (_e) {}

        watchdogTimer = setInterval(scheduleTamperCheck, WATCHDOG_MS);

        if (typeof MutationObserver !== 'undefined' && document.body) {
            try {
                shieldBodyObserver = new MutationObserver(function () {
                    scheduleTamperCheck();
                });
                shieldBodyObserver.observe(document.body, { childList: true });
            } catch (_e1) {}
        }
        if (overlayEl && typeof MutationObserver !== 'undefined') {
            try {
                shieldAttrObserver = new MutationObserver(function () {
                    scheduleTamperCheck();
                });
                shieldAttrObserver.observe(overlayEl, {
                    attributes: true,
                    attributeFilter: ['style', 'class', 'hidden']
                });
            } catch (_e2) {}
        }
        scheduleTamperCheck();
    }

    function trapOverlayKeys(e) {
        if (!isAnnulOverlayInDom()) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    async function postIntegrityReset(uid) {
        var base = (window.API_BASE_URL || '').replace(/\/$/, '');
        var token = null;
        try {
            token = localStorage.getItem(STORAGE_TOKEN);
        } catch (_e) {}
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        var res = await fetch(base + '/api/users/' + encodeURIComponent(uid) + '/integrity-reset', {
            method: 'POST',
            headers: headers,
            body: '{}'
        });
        var text = await res.text();
        var data = {};
        try {
            data = text ? JSON.parse(text) : {};
        } catch (_e) {
            data = {};
        }
        if (!res.ok) {
            var err = new Error((data && data.error) || text || res.statusText || 'integrity-reset failed');
            err.status = res.status;
            throw err;
        }
        return data;
    }

    function evaluateViolations(user) {
        var violations = [];
        var balance = Number(user.balance);
        if (!isFinite(balance) || balance < 0) {
            violations.push('corrupt_balance');
            return violations;
        }
        if (balance > 9999999) violations.push('absurd_balance');

        var xp = 0;
        var level = 1;
        if (window.levelModule && window.levelModule.getPlayerXP && window.levelModule.getLevelInfo) {
            xp = window.levelModule.getPlayerXP();
            level = window.levelModule.getLevelInfo(xp).level || 1;
        }

        var statsData = window.statsModule && window.statsModule.data ? window.statsModule.data : {};
        var ust = user.stats || {};
        var totalSessions = Math.max(statsData.totalSessions || 0, ust.totalSessions || 0);
        var totalTime = Math.max(statsData.totalTime || 0, ust.totalTime || 0);

        var achCount = Math.min(MAX_ACHIEVEMENTS, countUnlockedAchievements());
        var uniqueLessons = countUniqueLessonsFromStats(statsData);

        var sumLevelCoins = sumLevelUpCoinsUpToLevel(level);
        var lessonCoinCeil = uniqueLessons * 450;
        var sessionCoinCeil = totalSessions * 45;
        var plausible = 50 + sumLevelCoins + achCount * 50 + lessonCoinCeil + sessionCoinCeil;

        if (balance > plausible + 4000) violations.push('balance_vs_progress');

        if (level >= 22 && totalSessions < 14 && totalTime < 1000) violations.push('xp_without_play');

        if (balance >= 12000 && uniqueLessons <= 2 && totalTime < 2400 && totalSessions < 28) {
            violations.push('rich_low_activity');
        }

        var cards = Array.isArray(user.collectedCards) ? user.collectedCards.length : 0;
        if (cards >= 18 && totalSessions < 10 && totalTime < 900) violations.push('cards_without_play');

        if (level >= 28 && totalTime < 1400 && totalSessions < 22) violations.push('high_level_shallow_stats');

        if (achCount >= 10 && totalSessions < 4 && totalTime < 300) violations.push('achievements_without_play');

        var uniq = {};
        violations.forEach(function (v) {
            uniq[v] = 1;
        });
        return Object.keys(uniq);
    }

    function buildModal() {
        var wrap = document.createElement('div');
        wrap.id = 'integrityAnnulOverlay';
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-modal', 'true');
        wrap.setAttribute('data-zoob-integrity-shield', '1');
        wrap.style.cssText =
            'position:fixed;left:0;top:0;right:0;bottom:0;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;box-sizing:border-box;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,23,42,0.92);backdrop-filter:blur(8px);pointer-events:auto;user-select:none;-webkit-user-select:none;';
        var box = document.createElement('div');
        box.style.cssText =
            'max-width:440px;width:100%;background:linear-gradient(160deg,#1e293b,#0f172a);border:1px solid rgba(248,113,113,0.35);border-radius:16px;padding:22px 24px;box-shadow:0 24px 64px rgba(0,0,0,0.55);color:#e2e8f0;font-family:system-ui,sans-serif;font-size:15px;line-height:1.45;';
        var title = document.createElement('h2');
        title.style.cssText = 'margin:0 0 12px;font-size:1.15rem;font-weight:700;color:#fecaca;';
        title.textContent = igT('integrityAnnulTitle');
        var body = document.createElement('p');
        body.style.cssText = 'margin:0 0 18px;color:#cbd5e1;';
        body.textContent = igT('integrityAnnulBody');
        var status = document.createElement('p');
        status.id = 'integrityAnnulStatus';
        status.style.cssText =
            'margin:0;padding:14px 16px;border-radius:10px;text-align:center;font-weight:700;font-size:15px;color:#fecaca;background:rgba(127,29,29,0.35);border:1px solid rgba(248,113,113,0.4);';
        status.textContent = igReplace('integrityAnnulSeconds', { n: String(Math.ceil(AUTO_ANNUL_MS / 1000)) });
        box.appendChild(title);
        box.appendChild(body);
        box.appendChild(status);
        wrap.appendChild(box);
        return { wrap: wrap, statusEl: status };
    }

    async function shouldSkip(user) {
        if (!user || !user.uid) return true;
        if (String(user.username || '').toLowerCase() === 'zzz') return true;
        if (window.authModule && typeof window.authModule.isAdmin === 'function') {
            try {
                if (await window.authModule.isAdmin(user.uid)) return true;
            } catch (_e) {}
        }
        return false;
    }

    async function executeAnnulment(uid) {
        if (annulRunning) return;
        stopIntegritySentinels();
        annulRunning = true;
        try {
            clearViolationFlag();
            if (useApi()) {
                try {
                    var data = await postIntegrityReset(uid);
                    if (data && data.user) {
                        try {
                            localStorage.setItem(STORAGE_CURRENT, JSON.stringify(data.user));
                        } catch (_e) {}
                    }
                } catch (_e) {
                    /* still wipe client + local profile */
                }
            } else {
                resetLocalRegisteredUser(uid);
            }
            wipeGameLocalStorage();
            if (window.levelModule && window.levelModule.setPlayerXP) {
                try {
                    window.levelModule.setPlayerXP(0);
                } catch (_e) {}
            }
        } finally {
            annulRunning = false;
            clearAnnulUiTimers();
            location.reload();
        }
    }

    function showAnnulModal() {
        if (isAnnulOverlayInDom()) return;
        clearAnnulUiTimers();

        var u = window.authModule && window.authModule.getCurrentUser();
        var uid = u && u.uid ? u.uid : null;

        var m = buildModal();
        document.body.appendChild(m.wrap);

        var totalSec = Math.max(1, Math.ceil(AUTO_ANNUL_MS / 1000));
        var left = totalSec;
        m.statusEl.textContent = igReplace('integrityAnnulSeconds', { n: String(left) });

        annulCountdownTimer = setInterval(function () {
            left -= 1;
            if (left <= 0) {
                if (annulCountdownTimer) {
                    clearInterval(annulCountdownTimer);
                    annulCountdownTimer = null;
                }
                m.statusEl.textContent = igT('integrityAnnulApplying');
                return;
            }
            m.statusEl.textContent = igReplace('integrityAnnulSeconds', { n: String(left) });
        }, 1000);

        annulAutoTimer = setTimeout(function () {
            annulAutoTimer = null;
            clearAnnulUiTimers();
            if (uid) executeAnnulment(uid);
            else {
                stopIntegritySentinels();
                clearViolationFlag();
                wipeGameLocalStorage();
                location.reload();
            }
        }, AUTO_ANNUL_MS);

        if (uid) startIntegritySentinels(uid, m.wrap);
    }

    async function runChecks() {
        if (annulRunning) return;
        var user = window.authModule && window.authModule.getCurrentUser();
        if (!user) return;
        if (await shouldSkip(user)) return;

        var violations = evaluateViolations(user);
        var flaggedUid = readViolationFlagUid();

        if (violations.length) setViolationFlag(user.uid);

        var needModal = violations.length > 0 || flaggedUid === user.uid;
        if (!needModal) return;

        if (!isAnnulOverlayInDom()) showAnnulModal();
    }

    function ping() {
        var now = Date.now();
        if (now - lastPingAt < PING_COOLDOWN_MS) return;
        lastPingAt = now;
        runChecks().catch(function () {});
    }

    window.integrityMonitor = {
        ping: ping,
        runChecks: runChecks
    };

    function scheduleInitial() {
        if (initialPingTimeoutId != null) {
            clearTimeout(initialPingTimeoutId);
            initialPingTimeoutId = null;
        }
        initialPingTimeoutId = setTimeout(function () {
            initialPingTimeoutId = null;
            ping();
        }, INITIAL_DELAY_MS);
    }

    function teardownIntegrityTimers() {
        if (periodicPingId != null) {
            clearInterval(periodicPingId);
            periodicPingId = null;
        }
        if (initialPingTimeoutId != null) {
            clearTimeout(initialPingTimeoutId);
            initialPingTimeoutId = null;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleInitial);
    } else {
        scheduleInitial();
    }

    periodicPingId = setInterval(ping, PERIODIC_MS);

    try {
        window.addEventListener('pagehide', function (ev) {
            if (ev.persisted) return;
            teardownIntegrityTimers();
        });
    } catch (_e) {}

    if (window.authModule && typeof window.authModule.onAuthStateChange === 'function') {
        window.authModule.onAuthStateChange(function (u) {
            if (u) setTimeout(ping, 2600);
        });
    }

    try {
        window.addEventListener('storage', function (e) {
            if (e.key !== VIOLATION_FLAG_KEY || !e.newValue) return;
            var u = window.authModule && window.authModule.getCurrentUser();
            if (!u || !u.uid) return;
            var flagged = readViolationFlagUid();
            if (flagged !== u.uid) return;
            if (annulRunning) return;
            if (!isAnnulOverlayInDom()) showAnnulModal();
        });
    } catch (_e) {}

    try {
        document.addEventListener('keydown', trapOverlayKeys, true);
    } catch (_e) {}

    function bootViolationFromStorage() {
        var u = window.authModule && window.authModule.getCurrentUser();
        if (!u || !u.uid) return;
        if (readViolationFlagUid() !== u.uid) return;
        showAnnulModal();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(bootViolationFromStorage, 0);
        });
    } else {
        setTimeout(bootViolationFromStorage, 0);
    }
})();

