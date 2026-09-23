/**
 * Статистика посещений и онлайн-пользователей через Firebase Realtime Database.
 * Пути:
 *   siteStats/visits          - общий счётчик
 *   siteStats/daily/YYYY-MM-DD - дневные посещения
 *   online/{visitorId}        - присутствие: lastSeen (обновляется heartbeat), joinedAt, …
 *                               В UI «онлайн» только если lastSeen не старше ONLINE_PRESENCE_TTL_MS.
 */

import { initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, update, onValue, onDisconnect, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

var VISITS_KEY     = 'zoob_visit_counted';
var VISITOR_ID_KEY = 'zoob_visitor_id';
var GEO_CACHE_KEY  = 'zoob_geo_v1';
var XP_KEY         = 'zoobastiks_player_xp';

// ── Helpers ─────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

function getTodayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function getDateKey(daysAgo) {
    var d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function getOrCreateVisitorId() {
    try {
        var id = sessionStorage.getItem(VISITOR_ID_KEY);
        if (id) return id;
        id = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        sessionStorage.setItem(VISITOR_ID_KEY, id);
        return id;
    } catch (e) {
        return 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    }
}

function countryCodeToFlag(code) {
    if (!code || code.length !== 2) return '🌍';
    try {
        var c = code.toUpperCase();
        return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65) +
               String.fromCodePoint(0x1F1E6 + c.charCodeAt(1) - 65);
    } catch (e) { return '🌍'; }
}

function getDeviceType() {
    var ua = navigator.userAgent || '';
    if (/Mobile|Android.*Mobile|iPhone|iPod/i.test(ua)) return 'mobile';
    if (/Tablet|iPad|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
    return 'desktop';
}

function deviceIcon(type) {
    if (type === 'mobile') return '📱';
    if (type === 'tablet') return '📟';
    return '💻';
}

function _escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** URL аватара для src: только http(s), корень или assets/, без javascript/data. */
function _isSafeAvatarUrl(s) {
    if (!s || typeof s !== 'string') return false;
    var t = s.trim();
    if (!t || t.indexOf('<') >= 0) return false;
    var low = t.toLowerCase();
    if (low.indexOf('javascript:') === 0 || low.indexOf('data:') === 0) return false;
    if (/^https?:\/\//i.test(t)) return true;
    if (t.charAt(0) === '/') return true;
    if (/^assets\//i.test(t)) return true;
    return false;
}

function _resolveOnlineAvatarSrc(u) {
    if (!u || typeof u !== 'object') return '';
    if (_isSafeAvatarUrl(u.photoURL)) return u.photoURL.trim();
    var idx = u.avatarIndex;
    if (typeof idx === 'number' && window.authModule && Array.isArray(window.authModule.AVAILABLE_AVATARS)) {
        var p = window.authModule.AVAILABLE_AVATARS[idx];
        if (p && _isSafeAvatarUrl(p)) return String(p).trim();
    }
    return '';
}

function getStatsLang() {
    if (typeof window.app !== 'undefined' && window.app.lang) {
        return window.app.lang === 'ua' ? 'uk' : window.app.lang;
    }
    var dl = document.documentElement && document.documentElement.getAttribute('data-lang');
    if (dl === 'ua') return 'uk';
    if (dl) return dl;
    var hl = document.documentElement && document.documentElement.getAttribute('lang');
    if (hl === 'en') return 'en';
    if (hl === 'uk') return 'uk';
    return 'ru';
}

function pluralPlayers(n, lang) {
    var num = typeof n === 'number' && n >= 0 ? n : 0;
    lang = lang || getStatsLang();
    if (lang === 'en') return num === 1 ? '1 player' : num + ' players';
    if (lang === 'uk') {
        var d = num % 10, h = num % 100;
        if (d === 1 && h !== 11) return num + ' гравець';
        if (d >= 2 && d <= 4 && (h < 10 || h >= 20)) return num + ' гравці';
        return num + ' гравців';
    }
    var d = num % 10, h = num % 100;
    if (d === 1 && h !== 11) return num + ' игрок';
    if (d >= 2 && d <= 4 && (h < 10 || h >= 20)) return num + ' игрока';
    return num + ' игроков';
}

function updateUI(visits, onlineCount) {
    var visitsEl = document.getElementById('siteStatsVisits');
    var onlineEl = document.getElementById('siteStatsOnline');
    var lang = getStatsLang();
    var locale = lang === 'en' ? 'en-US' : lang === 'uk' ? 'uk-UA' : 'ru-RU';
    if (visitsEl && typeof visits === 'number') visitsEl.textContent = visits.toLocaleString(locale);
    if (onlineEl) onlineEl.textContent = pluralPlayers(typeof onlineCount === 'number' ? onlineCount : 0, lang);
}

// Цвет аватара по нику (детерминированный)
function nameToColor(name) {
    var palette = ['#06b6d4','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#f97316','#84cc16'];
    if (!name) return palette[0];
    var hash = 0;
    for (var i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
    return palette[hash % palette.length];
}

// Цвет badge уровня
function levelColor(lvl) {
    if (!lvl) return '#475569';
    if (lvl >= 30) return '#f59e0b';
    if (lvl >= 20) return '#8b5cf6';
    if (lvl >= 10) return '#06b6d4';
    return '#64748b';
}

// Сколько времени прошло (joinedAt в мс)
function timeAgo(ts, lang) {
    if (!ts) return '';
    var mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
    if (lang === 'en') {
        if (mins < 1) return 'just now';
        if (mins === 1) return '1 min';
        if (mins < 60) return mins + ' min';
        return Math.floor(mins / 60) + ' h';
    }
    if (lang === 'uk') {
        if (mins < 1) return 'щойно';
        if (mins < 60) return mins + ' хв';
        return Math.floor(mins / 60) + ' год';
    }
    if (mins < 1) return 'только что';
    if (mins < 60) return mins + ' мин.';
    return Math.floor(mins / 60) + ' ч.';
}

// ── Geo detection via Cloudflare trace ─────────────────────────────────────

async function fetchGeo() {
    try {
        var cached = sessionStorage.getItem(GEO_CACHE_KEY);
        if (cached) return JSON.parse(cached);
        var res = await fetch('https://www.cloudflare.com/cdn-cgi/trace', { cache: 'no-store' });
        var text = await res.text();
        var m = text.match(/loc=([A-Z]{2})/);
        var code = m ? m[1] : 'XX';
        var data = { code: code, flag: countryCodeToFlag(code) };
        try { sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(data)); } catch (e) {}
        return data;
    } catch (e) {
        return { code: 'XX', flag: '🌍' };
    }
}

// ── Auth user info ──────────────────────────────────────────────────────────

function _getCurrentUserInfo() {
    try {
        var auth = window.authModule;
        if (!auth || !auth.getCurrentUser) return null;
        var user = auth.getCurrentUser();
        if (!user) return null;
        var result = {
            displayName: user.displayName || user.username || null,
            username: user.username || null,
            avatarIndex: typeof user.avatarIndex === 'number' ? user.avatarIndex : 0,
            photoURL: user.photoURL && typeof user.photoURL === 'string' ? user.photoURL : null
        };
        try {
            var xp = parseInt(localStorage.getItem(XP_KEY)) || 0;
            if (window.levelModule && window.levelModule.getLevelInfo) {
                var info = window.levelModule.getLevelInfo(xp);
                result.level = info.level;
                result.tierName = info.tierName;
            }
        } catch (e) {}
        return result;
    } catch (e) { return null; }
}

// ── Firebase setup ──────────────────────────────────────────────────────────

var fbApp;
try { fbApp = getApp(); } catch (e) { fbApp = initializeApp(firebaseConfig); }
var database = getDatabase(fbApp);

var visitsRef = ref(database, 'siteStats/visits');
var dailyRef  = ref(database, 'siteStats/daily');
var onlineRef = ref(database, 'online');

var _visits     = 0;
var _onlineData = {};
var _dailyData  = {};

/** Нет обновления lastSeen дольше — не считаем онлайн (onDisconnect часто не срабатывает). */
var ONLINE_PRESENCE_TTL_MS   = 3 * 60 * 1000;
var PRESENCE_HEARTBEAT_MS    = 45 * 1000;
var _presenceHeartbeatId     = null;
var _presenceVisibilityBound = false;

function presenceLastSeenMs(u) {
    if (!u || u.lastSeen == null) return null;
    var ls = u.lastSeen;
    if (typeof ls === 'number' && isFinite(ls)) return ls;
    return null;
}

function isPresenceFresh(u) {
    var ms = presenceLastSeenMs(u);
    if (ms != null) return (Date.now() - ms) <= ONLINE_PRESENCE_TTL_MS;
    return isLegacyPresenceFresh(u);
}

/** Подстраховка для старых записей без lastSeen: только очень «молодой» joinedAt (одна вкладка). */
function isLegacyPresenceFresh(u) {
    var j = u && u.joinedAt;
    if (typeof j !== 'number' || !isFinite(j)) return false;
    return (Date.now() - j) <= ONLINE_PRESENCE_TTL_MS;
}

function getFreshOnlineEntries() {
    return Object.entries(_onlineData).filter(function (e) {
        return isPresenceFresh(e[1]);
    });
}

function getFreshOnlineCount() {
    return getFreshOnlineEntries().length;
}

function syncOnlineUiFromCache() {
    var n = getFreshOnlineCount();
    window.__siteStatsOnline = n;
    updateUI(_visits, n);
    _refreshModal();
}

var _firebaseError = null;

function _onFirebaseError(err) {
    _firebaseError = err && err.code ? err.code : 'permission-denied';
    console.warn('[visitor-stats] Firebase read blocked:', _firebaseError,
        '- check Realtime Database rules in Firebase Console.');
    _refreshModal();
}

onValue(visitsRef, function (snap) {
    _firebaseError = null;
    _visits = typeof snap.val() === 'number' ? snap.val() : 0;
    window.__siteStatsVisits = _visits;
    syncOnlineUiFromCache();
}, _onFirebaseError);

onValue(dailyRef, function (snap) {
    _dailyData = snap.val() || {};
    window.__siteStatsDailyData = _dailyData;
    _refreshModal();
}, _onFirebaseError);

onValue(onlineRef, function (snap) {
    _firebaseError = null;
    _onlineData = snap.val() || {};
    window.__siteStatsOnlineData = _onlineData;
    syncOnlineUiFromCache();
}, _onFirebaseError);

// Пересчёт «онлайн» по таймеру: без нового события Firebase записи «призраки» исчезают из списка.
setInterval(function () {
    if (_firebaseError) return;
    syncOnlineUiFromCache();
}, 30000);

// ── Visit recording ─────────────────────────────────────────────────────────

function recordVisit() {
    try {
        if (sessionStorage.getItem(VISITS_KEY)) return;
        sessionStorage.setItem(VISITS_KEY, '1');
        runTransaction(visitsRef, function (c) { return (c || 0) + 1; }).catch(function () {});
        var dayKey = getTodayKey();
        runTransaction(ref(database, 'siteStats/daily/' + dayKey), function (c) { return (c || 0) + 1; }).catch(function () {});
    } catch (e) {}
}

var _myPresenceRef = null;
var _geoData       = null;

function touchPresenceLastSeen() {
    if (!_myPresenceRef) return;
    update(_myPresenceRef, { lastSeen: serverTimestamp() }).catch(function () {});
}

function startPresenceHeartbeat() {
    if (_presenceHeartbeatId) clearInterval(_presenceHeartbeatId);
    touchPresenceLastSeen();
    _presenceHeartbeatId = setInterval(touchPresenceLastSeen, PRESENCE_HEARTBEAT_MS);
    if (!_presenceVisibilityBound) {
        _presenceVisibilityBound = true;
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') touchPresenceLastSeen();
        });
    }
}

async function registerPresence() {
    var visitorId = getOrCreateVisitorId();
    _myPresenceRef = ref(database, 'online/' + visitorId);
    _geoData = await fetchGeo();

    var data = {
        lastSeen:    serverTimestamp(),
        joinedAt:    Date.now(),
        countryCode: _geoData.code,
        flag:        _geoData.flag,
        device:      getDeviceType()
    };

    // Если уже вошёл - добавляем данные аккаунта
    var userInfo = _getCurrentUserInfo();
    if (userInfo) {
        data.displayName = userInfo.displayName;
        data.username    = userInfo.username;
        data.avatarIndex = userInfo.avatarIndex;
        data.photoURL    = userInfo.photoURL || null;
        data.level       = userInfo.level || null;
        data.tierName    = userInfo.tierName || null;
    }

    set(_myPresenceRef, data).then(function () {
        onDisconnect(_myPresenceRef).remove().catch(function () {});
        startPresenceHeartbeat();
    }).catch(function () {});
}

// ── Public: обновить данные аккаунта в присутствии (вызывается из main.js) ─

window.__updatePresenceUser = function (user) {
    if (!_myPresenceRef) return;
    var updates = {};
    if (user) {
        updates.displayName = user.displayName || user.username || null;
        updates.username    = user.username || null;
        updates.avatarIndex = typeof user.avatarIndex === 'number' ? user.avatarIndex : 0;
        updates.photoURL    = user.photoURL && typeof user.photoURL === 'string' ? user.photoURL : null;
        try {
            var xp = parseInt(localStorage.getItem(XP_KEY)) || 0;
            if (window.levelModule && window.levelModule.getLevelInfo) {
                var info = window.levelModule.getLevelInfo(xp);
                updates.level    = info.level;
                updates.tierName = info.tierName;
            }
        } catch (e) {}
    } else {
        // Вышел - очищаем данные аккаунта
        updates.displayName = null;
        updates.username    = null;
        updates.avatarIndex = null;
        updates.photoURL    = null;
        updates.level       = null;
        updates.tierName    = null;
    }
    updates.lastSeen = serverTimestamp();
    update(_myPresenceRef, updates).catch(function () {});
};

recordVisit();
registerPresence();

// ── Stats Modal ─────────────────────────────────────────────────────────────

var _modalOpen = false;
var _modalWrap = null;

function _t(key) {
    var lang = getStatsLang();
    var T = {
        title:       { ru: 'Статистика сайта',          en: 'Site Statistics',      uk: 'Статистика сайту' },
        totalVisits: { ru: 'Всего посещений',             en: 'Total visits',         uk: 'Всього відвідувань' },
        byDay:       { ru: 'Посещения по дням',           en: 'Visits by day',        uk: 'Відвідування по днях' },
        onlineNow:   { ru: 'Онлайн сейчас',              en: 'Online now',            uk: 'Онлайн зараз' },
        nobody:      { ru: 'Никого нет онлайн',           en: 'No one online',        uk: 'Нікого немає онлайн' },
        visitor:     { ru: 'Гость',                       en: 'Guest',                uk: 'Гість' },
        today:       { ru: 'Сегодня',                     en: 'Today',                uk: 'Сьогодні' },
        yesterday:   { ru: 'Вчера',                       en: 'Yesterday',            uk: 'Вчора' },
        dayBefore:   { ru: 'Позавчера',                   en: '2 days ago',           uk: 'Позавчора' },
        daysAgo:     { ru: ' дн. назад',                  en: ' days ago',            uk: ' дн. тому' },
        liveUpdates: { ru: 'Обновляется в реальном времени', en: 'Updates in real time', uk: 'Оновлюється в реальному часі' },
        level:       { ru: 'Ур.',                         en: 'Lv.',                  uk: 'Рів.' },
        onSite:      { ru: 'на сайте',                    en: 'on site',              uk: 'на сайті' }
    };
    var entry = T[key];
    if (!entry) return key;
    return entry[lang] || entry['ru'];
}

function _dayLabel(daysAgo) {
    if (daysAgo === 0) return _t('today');
    if (daysAgo === 1) return _t('yesterday');
    if (daysAgo === 2) return _t('dayBefore');
    return daysAgo + _t('daysAgo');
}

function _buildContent() {
    var lang   = getStatsLang();
    var locale = lang === 'en' ? 'en-US' : lang === 'uk' ? 'uk-UA' : 'ru-RU';

    // Firebase access error banner
    if (_firebaseError) {
        var errMsg = lang === 'en'
            ? 'Firebase read access is blocked (' + _firebaseError + '). Update Realtime Database rules in Firebase Console.'
            : lang === 'uk'
            ? 'Firebase заблокував читання (' + _firebaseError + '). Оновіть правила Realtime Database у Firebase Console.'
            : 'Firebase заблокировал чтение (' + _firebaseError + '). Обновите правила Realtime Database в Firebase Console.';
        return '<div style="padding:20px">' +
            '<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:16px;text-align:center">' +
                '<div style="font-size:28px;margin-bottom:8px">🔒</div>' +
                '<p style="color:#fca5a5;font-size:13px;margin:0;line-height:1.5">' + errMsg + '</p>' +
            '</div>' +
        '</div>';
    }

    // Last 7 days chart
    var days = [];
    var maxVal = 1;
    for (var i = 0; i < 7; i++) {
        var key = getDateKey(i);
        var val = _dailyData[key] || 0;
        if (val > maxVal) maxVal = val;
        days.push({ label: _dayLabel(i), val: val, isToday: i === 0 });
    }

    var daysHTML = days.map(function (d) {
        var pct = Math.max(Math.round((d.val / maxVal) * 100), d.val > 0 ? 2 : 0);
        var barColor = d.isToday
            ? 'linear-gradient(90deg,#06b6d4,#67e8f9)'
            : 'linear-gradient(90deg,#1e3a5f,#2563eb)';
        return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">' +
            '<span style="width:88px;font-size:11px;color:' + (d.isToday ? '#e2e8f0' : '#94a3b8') + ';flex-shrink:0;font-weight:' + (d.isToday ? '600' : '400') + '">' + d.label + '</span>' +
            '<div style="flex:1;background:rgba(255,255,255,0.05);border-radius:4px;height:16px;overflow:hidden">' +
            '<div style="height:100%;width:' + pct + '%;background:' + barColor + ';border-radius:4px;transition:width .5s ease"></div>' +
            '</div>' +
            '<span style="width:30px;text-align:right;font-size:11px;color:' + (d.isToday ? '#22d3ee' : '#475569') + ';font-variant-numeric:tabular-nums">' + d.val + '</span>' +
        '</div>';
    }).join('');

    // Online users (только свежий lastSeen; см. ONLINE_PRESENCE_TTL_MS)
    var users = getFreshOnlineEntries();
    var onlineCount = users.length;

    var onlineHTML = onlineCount === 0
        ? '<p style="color:#475569;font-size:12px;text-align:center;padding:10px 0">' + _t('nobody') + '</p>'
        : users.map(function (entry, i) {
            var u = entry[1] || {};
            var hasAccount  = !!(u.displayName || u.username);
            var name        = u.displayName || u.username || (_t('visitor') + ' #' + (i + 1));
            var initial     = String(name).charAt(0).toUpperCase();
            var avatarColor = nameToColor(name);
            var nameSafe    = _escapeHtml(name);
            var flag        = u.flag || '🌍';
            var country     = (u.countryCode && u.countryCode !== 'XX') ? u.countryCode : '';
            var device      = deviceIcon(u.device || 'desktop');
            var lvl         = u.level || null;
            var tier        = u.tierName || null;
            var ago         = u.joinedAt ? timeAgo(u.joinedAt, lang) : '';

            var avatarSrc = hasAccount ? _resolveOnlineAvatarSrc(u) : '';
            var avatarHTML;
            if (hasAccount) {
                if (avatarSrc) {
                    var srcEsc = _escapeHtml(avatarSrc);
                    avatarHTML =
                        '<div style="width:38px;height:38px;border-radius:50%;overflow:hidden;flex-shrink:0;box-shadow:0 0 0 2px rgba(255,255,255,0.1);position:relative;background:' +
                        avatarColor +
                        '">' +
                        '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff">' +
                        _escapeHtml(initial) +
                        '</div>' +
                        '<img src="' +
                        srcEsc +
                        '" alt="" width="38" height="38" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;z-index:1" onerror="this.style.display=\'none\'"/>' +
                        '</div>';
                } else {
                    avatarHTML =
                        '<div style="width:38px;height:38px;border-radius:50%;background:' +
                        avatarColor +
                        ';display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0;box-shadow:0 0 0 2px rgba(255,255,255,0.1)">' +
                        _escapeHtml(initial) +
                        '</div>';
                }
            } else {
                avatarHTML =
                    '<div style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">👤</div>';
            }

            // Level badge
            var levelHTML = lvl
                ? '<span style="font-size:10px;background:' + levelColor(lvl) + '22;color:' + levelColor(lvl) + ';border:1px solid ' + levelColor(lvl) + '55;border-radius:4px;padding:1px 5px;font-weight:600;white-space:nowrap">' + _t('level') + ' ' + lvl + (tier ? ' · ' + _escapeHtml(tier) : '') + '</span>'
                : '';

            // Name + meta row
            var metaHTML = '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:3px">' +
                '<span style="font-size:11px">' + flag + '</span>' +
                '<span style="font-size:11px;color:#64748b">' + device + '</span>' +
                (country ? '<span style="font-size:10px;color:#475569">' + country + '</span>' : '') +
                (ago ? '<span style="font-size:10px;color:#334155;margin-left:auto">' + ago + ' ' + _t('onSite') + '</span>' : '') +
            '</div>';

            return '<div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,' + (hasAccount ? '0.1' : '0.05') + ');border-radius:12px;margin-bottom:6px' + (hasAccount ? ';box-shadow:0 0 0 1px ' + avatarColor + '22' : '') + '">' +
                avatarHTML +
                '<div style="flex:1;min-width:0">' +
                    '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
                        '<span style="font-size:13px;font-weight:' + (hasAccount ? '600' : '400') + ';color:' + (hasAccount ? '#e2e8f0' : '#94a3b8') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px">' + nameSafe + '</span>' +
                        levelHTML +
                    '</div>' +
                    metaHTML +
                '</div>' +
                '<span style="width:8px;height:8px;border-radius:50%;background:#34d399;flex-shrink:0;box-shadow:0 0 8px #34d39977"></span>' +
            '</div>';
        }).join('');

    return '<div style="padding:18px 20px 6px">' +
        // Total visits card
        '<div style="display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,rgba(6,182,212,0.12),rgba(6,182,212,0.04));border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:14px 18px;margin-bottom:18px">' +
            '<div>' +
                '<p style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px">' + _t('totalVisits') + '</p>' +
                '<p style="font-size:28px;font-weight:700;color:#22d3ee;font-variant-numeric:tabular-nums;margin:0;line-height:1">' + (_visits || 0).toLocaleString(locale) + '</p>' +
            '</div>' +
            '<span style="font-size:36px;opacity:0.35">📈</span>' +
        '</div>' +
        // Daily chart
        '<p style="font-size:11px;color:#475569;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px">' + _t('byDay') + '</p>' +
        daysHTML +
        // Online users
        '<p style="font-size:11px;color:#475569;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:18px 0 10px">' +
            _t('onlineNow') + ' <span style="color:#34d399;font-weight:700">' + onlineCount + '</span>' +
        '</p>' +
        onlineHTML +
        // Live indicator
        '<div style="display:flex;align-items:center;gap:6px;justify-content:center;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06)">' +
            '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#34d399;animation:_spulse 2s infinite"></span>' +
            '<span style="font-size:10px;color:#334155">' + _t('liveUpdates') + '</span>' +
        '</div>' +
    '</div>';
}

function _attachHandlers() {
    var closeBtn = document.getElementById('_statsClose');
    var overlay  = document.getElementById('_statsOverlay');
    if (closeBtn) closeBtn.addEventListener('click', _closeModal);
    if (overlay)  overlay.addEventListener('click', function (e) {
        if (e.target === overlay) _closeModal();
    });
}

function _openModal() {
    if (_modalWrap) { _modalWrap.remove(); _modalWrap = null; }
    _modalOpen = true;

    _modalWrap = document.createElement('div');
    _modalWrap.id = '_statsModalWrap';
    _modalWrap.innerHTML =
        '<div id="_statsOverlay" style="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;animation:_sfade .18s ease">' +
            '<div style="background:linear-gradient(155deg,#0f172a 0%,#1e293b 100%);border:1px solid rgba(6,182,212,0.2);border-radius:18px;width:100%;max-width:440px;max-height:88vh;overflow-y:auto;box-shadow:0 30px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(6,182,212,0.08)">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px 0;position:sticky;top:0;background:#0f172a;z-index:1;border-radius:18px 18px 0 0">' +
                    '<h2 style="font-size:15px;font-weight:700;color:#e2e8f0;margin:0;display:flex;align-items:center;gap:8px"><span>📊</span>' + _t('title') + '</h2>' +
                    '<button id="_statsClose" style="width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:background .15s" onmouseover="this.style.background=\'rgba(255,255,255,0.15)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.08)\'">✕</button>' +
                '</div>' +
                '<div id="_statsContent">' + _buildContent() + '</div>' +
            '</div>' +
        '</div>';

    if (!document.getElementById('_statsStyle')) {
        var st = document.createElement('style');
        st.id  = '_statsStyle';
        st.textContent = '@keyframes _sfade{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}@keyframes _spulse{0%,100%{opacity:1}50%{opacity:.4}}';
        document.head.appendChild(st);
    }

    document.body.appendChild(_modalWrap);
    _attachHandlers();
    document.addEventListener('keydown', _onEsc);
}

function _closeModal() {
    if (_modalWrap) { _modalWrap.remove(); _modalWrap = null; }
    _modalOpen = false;
    document.removeEventListener('keydown', _onEsc);
}

function _onEsc(e) { if (e.key === 'Escape') _closeModal(); }

function _refreshModal() {
    if (!_modalOpen || !_modalWrap) return;
    var content = document.getElementById('_statsContent');
    if (content) content.innerHTML = _buildContent();
}

// ── Init click on stats bar ─────────────────────────────────────────────────

function _initBar() {
    var bar = document.getElementById('siteStatsBar');
    if (!bar) return;
    bar.addEventListener('click', function () {
        if (_modalOpen) _closeModal(); else _openModal();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initBar);
} else {
    _initBar();
}

if (typeof window !== 'undefined') {
    window.__siteStatsUpdateUI = updateUI;
    window.__siteStatsRefreshModal = _refreshModal;
}
export { pluralPlayers, updateUI };
