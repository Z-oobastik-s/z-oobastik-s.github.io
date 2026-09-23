/**
 * Серверный выбор карты для бустера (веса и список id совпадают с scripts/collectible-cards.js).
 * Карты: 1–52, 54–98 и 99 (номер 53 в наборе отсутствует).
 */
function buildCardNums() {
    const a = [];
    for (let i = 1; i <= 52; i++) a.push(i);
    for (let i = 54; i <= 99; i++) a.push(i);
    return a;
}

const CARD_NUMS = buildCardNums();
const TOTAL = CARD_NUMS.length;
const VALID_NUM = new Set(CARD_NUMS);

const BOOSTER_COST = 95;
const DUPLICATE_REFUND = 30;

function weightForIndex(idx) {
    if (TOTAL <= 1) return 12;
    const p = idx / (TOTAL - 1);
    if (p < 0.26) return 12;
    if (p < 0.52) return 10;
    if (p < 0.78) return 6;
    return 3;
}

function pickRandomCardId() {
    let totalW = 0;
    for (let i = 0; i < TOTAL; i++) totalW += weightForIndex(i);
    let r = Math.random() * totalW;
    for (let i = 0; i < TOTAL; i++) {
        r -= weightForIndex(i);
        if (r <= 0) return String(CARD_NUMS[i]);
    }
    return String(CARD_NUMS[TOTAL - 1]);
}

function isValidCardNumber(n) {
    return typeof n === 'number' && VALID_NUM.has(n);
}

module.exports = {
    CARD_NUMS,
    TOTAL,
    BOOSTER_COST,
    DUPLICATE_REFUND,
    pickRandomCardId,
    weightForIndex,
    isValidCardNumber
};
