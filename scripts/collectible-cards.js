/**
 * Коллекционные карты: card_1…card_52, card_54…card_98 и card_99 (card_53 нет в наборе).
 * Бустер за монеты, бонус к награде за уроки по числу уникальных карт.
 */
(function (global) {
    'use strict';

    function buildCardNums() {
        var a = [];
        var i;
        for (i = 1; i <= 52; i++) a.push(i);
        for (i = 54; i <= 99; i++) a.push(i);
        return a;
    }

    var CARD_NUMS = buildCardNums();
    var TOTAL = CARD_NUMS.length;
    var VALID = Object.create(null);
    CARD_NUMS.forEach(function (n) { VALID[String(n)] = 1; });

    var BOOSTER_COST = 95;
    var DUPLICATE_REFUND = 30;
    /** Макс. бонус к монетам за урок (точность ≥90%), % */
    var MAX_COLLECTION_BONUS_PCT = 15;

    function cardPath(id) {
        return 'assets/images/card/card_' + id + '.png';
    }

    /** Вес по позиции в колоде (как на сервере): чем «правее» — тем реже. */
    function weightForIndex(idx) {
        if (TOTAL <= 1) return 12;
        var p = idx / (TOTAL - 1);
        if (p < 0.26) return 12;
        if (p < 0.52) return 10;
        if (p < 0.78) return 6;
        return 3;
    }

    var TOTAL_PULL_WEIGHT = (function () {
        var s = 0;
        var i;
        for (i = 0; i < TOTAL; i++) s += weightForIndex(i);
        return s;
    })();

    function pickRandomCardIdForPull() {
        var totalW = TOTAL_PULL_WEIGHT;
        var r = Math.random() * totalW;
        var i;
        for (i = 0; i < TOTAL; i++) {
            r -= weightForIndex(i);
            if (r <= 0) return String(CARD_NUMS[i]);
        }
        return String(CARD_NUMS[TOTAL - 1]);
    }

    /** Доля этой карты в суммарном весе бустера, % (для подсказки на обороте). */
    function getDropChancePercentForId(id) {
        var n = parseInt(id, 10);
        var sid = String(n);
        if (!n || !VALID[sid]) return 0;
        var idx = CARD_NUMS.indexOf(n);
        if (idx < 0) return 0;
        if (TOTAL_PULL_WEIGHT <= 0) return 0;
        return (weightForIndex(idx) / TOTAL_PULL_WEIGHT) * 100;
    }

    function formatDropChanceForDisplay(id, decimals) {
        var d = decimals == null ? 2 : decimals;
        var x = getDropChancePercentForId(id);
        if (!isFinite(x) || x <= 0) return '0';
        var pow = Math.pow(10, d);
        return (Math.round(x * pow) / pow).toFixed(d);
    }

    function getRarityKey(id) {
        var n = parseInt(id, 10);
        if (!n || !VALID[String(n)]) return 'common';
        var idx = CARD_NUMS.indexOf(n);
        if (idx < 0) return 'common';
        if (TOTAL <= 1) return 'common';
        var p = idx / (TOTAL - 1);
        if (p < 0.26) return 'common';
        if (p < 0.52) return 'uncommon';
        if (p < 0.78) return 'rare';
        return 'mythic';
    }

    function normalizeOwned(raw) {
        if (!raw || !Array.isArray(raw)) return [];
        var out = [];
        var seen = Object.create(null);
        raw.forEach(function (x) {
            var raw = String(x).replace(/\D/g, '');
            if (!raw) return;
            var n = parseInt(raw, 10);
            var id = String(n);
            if (!VALID[id]) return;
            if (seen[id]) return;
            seen[id] = 1;
            out.push(id);
        });
        return out;
    }

    /** Процент бонуса к монетам за урок (целое 0..MAX). */
    function getCollectionBonusPercent(ownedCount) {
        var n = Math.max(0, Math.min(TOTAL, parseInt(ownedCount, 10) || 0));
        return Math.min(MAX_COLLECTION_BONUS_PCT, Math.floor((n * MAX_COLLECTION_BONUS_PCT) / TOTAL));
    }

    function getLessonCoinMultiplier() {
        var user = global.authModule && typeof global.authModule.getCurrentUser === 'function'
            ? global.authModule.getCurrentUser()
            : null;
        var owned = normalizeOwned(user && user.collectedCards).length;
        var pct = getCollectionBonusPercent(owned);
        return 1 + pct / 100;
    }

    function getAllCardIds() {
        return CARD_NUMS.map(function (n) { return String(n); });
    }

    global.collectibleCardsModule = {
        TOTAL: TOTAL,
        BOOSTER_COST: BOOSTER_COST,
        DUPLICATE_REFUND: DUPLICATE_REFUND,
        MAX_COLLECTION_BONUS_PCT: MAX_COLLECTION_BONUS_PCT,
        cardPath: cardPath,
        pickRandomCardIdForPull: pickRandomCardIdForPull,
        getRarityKey: getRarityKey,
        normalizeOwned: normalizeOwned,
        getCollectionBonusPercent: getCollectionBonusPercent,
        getLessonCoinMultiplier: getLessonCoinMultiplier,
        getAllCardIds: getAllCardIds,
        TOTAL_PULL_WEIGHT: TOTAL_PULL_WEIGHT,
        getDropChancePercentForId: getDropChancePercentForId,
        formatDropChanceForDisplay: formatDropChanceForDisplay
    };
})(typeof window !== 'undefined' ? window : this);
