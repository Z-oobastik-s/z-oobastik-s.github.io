const express = require('express');
const { query } = require('../db/connection');
const { authMiddleware, getUserById } = require('./auth');
const { send500 } = require('../lib/httpError');
const { getShopPriceForLesson } = require('../lib/shopPrices');
const ALLOWED_AVATAR_PATHS = require('../lib/allowedAvatars');
const { pickRandomCardId, BOOSTER_COST, DUPLICATE_REFUND, isValidCardNumber } = require('../lib/collectiblePull');

const router = express.Router();

/** Разовое начисление больше этого отклоняется; клиент режет крупные суммы на несколько запросов (см. scripts/auth.js). */
const MAX_POSITIVE_COINS_PER_REQUEST = 50000;

// Все роуты требуют авторизации
router.use(authMiddleware);

function normalizeCollectedIds(arr) {
    if (!Array.isArray(arr)) return [];
    const seen = Object.create(null);
    const out = [];
    for (const x of arr) {
        const id = String(x).replace(/\D/g, '');
        const n = parseInt(id, 10);
        if (!n || !isValidCardNumber(n)) continue;
        const s = String(n);
        if (seen[s]) continue;
        seen[s] = 1;
        out.push(s);
    }
    return out;
}

// POST /api/users/:uid/cards/pull — купить бустер: случайная карта или дубликат (+ монеты)
router.post('/:uid/cards/pull', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const uid = req.params.uid;
        const row = await query(
            `SELECT Balance, CollectedCardsJson FROM Users WHERE Uid = @uid`,
            { uid }
        );
        if (row.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        const balance = row.recordset[0].Balance ?? 0;
        let collected = [];
        try {
            collected = JSON.parse(row.recordset[0].CollectedCardsJson || '[]');
        } catch (e) {
            collected = [];
        }
        collected = normalizeCollectedIds(collected);
        if (balance < BOOSTER_COST) {
            return res.status(400).json({ success: false, error: 'Недостаточно монет' });
        }
        let newBalance = balance - BOOSTER_COST;
        const cardId = pickRandomCardId();
        const had = collected.includes(cardId);
        let duplicate = false;
        if (!had) {
            collected.push(cardId);
        } else {
            duplicate = true;
            newBalance += DUPLICATE_REFUND;
        }
        await query(
            `UPDATE Users SET Balance = @bal, CollectedCardsJson = @json WHERE Uid = @uid`,
            { uid, bal: newBalance, json: JSON.stringify(collected) }
        );
        const user = await getUserById(uid);
        return res.json({
            success: true,
            cardId,
            duplicate,
            refundCoins: duplicate ? DUPLICATE_REFUND : 0,
            balance: user.balance,
            collectedCards: user.collectedCards || collected
        });
    } catch (err) {
        return send500(res, err, 'Cards pull error');
    }
});

// POST /api/users/:uid/cards/pull-batch — несколько бустеров за один запрос (count 1..50)
router.post('/:uid/cards/pull-batch', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const uid = req.params.uid;
        const raw = parseInt(req.body && req.body.count, 10);
        if (!Number.isFinite(raw) || raw < 1 || raw > 50) {
            return res.status(400).json({ success: false, error: 'count must be 1-50' });
        }
        const count = raw;
        const row = await query(
            `SELECT Balance, CollectedCardsJson FROM Users WHERE Uid = @uid`,
            { uid }
        );
        if (row.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        let balance = row.recordset[0].Balance ?? 0;
        let collected = [];
        try {
            collected = JSON.parse(row.recordset[0].CollectedCardsJson || '[]');
        } catch (e) {
            collected = [];
        }
        collected = normalizeCollectedIds(collected);
        const need = count * BOOSTER_COST;
        if (balance < need) {
            return res.status(400).json({ success: false, error: 'Недостаточно монет' });
        }
        const pulls = [];
        for (let i = 0; i < count; i++) {
            balance -= BOOSTER_COST;
            const cardId = pickRandomCardId();
            const had = collected.includes(cardId);
            let duplicate = false;
            if (!had) {
                collected.push(cardId);
            } else {
                duplicate = true;
                balance += DUPLICATE_REFUND;
            }
            pulls.push({
                cardId,
                duplicate,
                refundCoins: duplicate ? DUPLICATE_REFUND : 0
            });
        }
        await query(
            `UPDATE Users SET Balance = @bal, CollectedCardsJson = @json WHERE Uid = @uid`,
            { uid, bal: balance, json: JSON.stringify(collected) }
        );
        const user = await getUserById(uid);
        const newCards = pulls.filter((p) => !p.duplicate).length;
        const duplicates = pulls.filter((p) => p.duplicate).length;
        const totalRefund = pulls.reduce((sum, p) => sum + (p.refundCoins || 0), 0);
        return res.json({
            success: true,
            count,
            pulls,
            summary: {
                newCards,
                duplicates,
                totalRefund
            },
            balance: user.balance,
            collectedCards: user.collectedCards || collected
        });
    } catch (err) {
        return send500(res, err, 'Cards pull-batch error');
    }
});

// GET /api/users/:uid/profile
router.get('/:uid/profile', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const user = await getUserById(req.params.uid);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        return res.json({ success: true, data: user });
    } catch (err) {
        return send500(res, err, 'Get profile error');
    }
});

// PUT /api/users/:uid/profile
router.put('/:uid/profile', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const { username, displayName, bio } = req.body || {};
        const updates = [];
        const params = { uid: req.params.uid };
        if (username !== undefined) {
            const un = String(username).trim();
            if (un.length < 3) {
                return res.status(400).json({ success: false, error: 'Логин должен быть не менее 3 символов' });
            }
            const dup = await query(
                `SELECT Uid FROM Users WHERE Username = @username AND Uid <> @uid`,
                { username: un, uid: req.params.uid }
            );
            if (dup.recordset.length > 0) {
                return res.status(400).json({ success: false, error: 'Этот логин уже занят' });
            }
            updates.push('Username = @username');
            params.username = un;
        }
        if (displayName !== undefined) {
            updates.push('DisplayName = @displayName');
            params.displayName = String(displayName).trim().slice(0, 120);
        }
        if (bio !== undefined) {
            updates.push('Bio = @bio');
            params.bio = String(bio).slice(0, 4000);
        }
        if (updates.length === 0) {
            const user = await getUserById(req.params.uid);
            return res.json({ success: true, user });
        }
        await query(
            `UPDATE Users SET ${updates.join(', ')} WHERE Uid = @uid`,
            params
        );
        const user = await getUserById(req.params.uid);
        return res.json({ success: true, user });
    } catch (err) {
        return send500(res, err, 'Update profile error');
    }
});

// PUT /api/users/:uid/avatar
router.put('/:uid/avatar', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const { avatarIndex } = req.body || {};
        const idx = avatarIndex != null ? parseInt(avatarIndex, 10) : NaN;
        if (!Number.isFinite(idx) || idx < 0 || idx >= ALLOWED_AVATAR_PATHS.length) {
            return res.status(400).json({ success: false, error: 'Неверный индекс аватара' });
        }
        const photoURL = ALLOWED_AVATAR_PATHS[idx];
        await query(
            `UPDATE Users SET AvatarIndex = @avatarIndex, PhotoURL = @photoURL WHERE Uid = @uid`,
            { uid: req.params.uid, avatarIndex: idx, photoURL }
        );
        const user = await getUserById(req.params.uid);
        return res.json({ success: true, photoURL: user.photoURL, avatarIndex: user.avatarIndex });
    } catch (err) {
        return send500(res, err, 'Update avatar error');
    }
});

async function applySessionToUser(uid, session) {
    const { speed = 0, accuracy = 0, time = 0, errors = 0, mode = '', layout = '', lessonKey = null, timestamp = Date.now() } = session;
    await query(
        `INSERT INTO UserSessions (UserId, Speed, Accuracy, TimeSeconds, Errors, Mode, Layout, LessonKey, Timestamp)
         VALUES (@uid, @speed, @accuracy, @time, @errors, @mode, @layout, @lessonKey, @timestamp)`,
        { uid, speed, accuracy, time, errors, mode, layout, lessonKey, timestamp }
    );
    const userRow = await query(
        `SELECT TotalSessions, TotalTime, BestSpeed, AverageAccuracy, CompletedLessonsCount, TotalErrors, RecentSessionsJson FROM Users WHERE Uid = @uid`,
        { uid }
    );
    if (userRow.recordset.length === 0) return;
    const u = userRow.recordset[0];
    let recentSessions = [];
    try { recentSessions = JSON.parse(u.RecentSessionsJson || '[]'); } catch (e) {}
    recentSessions.push({ speed, accuracy, time, errors, mode, layout, lessonKey, timestamp });
    if (recentSessions.length > 100) recentSessions = recentSessions.slice(-100);
    const totalSessions = (u.TotalSessions || 0) + 1;
    const totalTime = (u.TotalTime || 0) + time;
    const bestSpeed = Math.max(u.BestSpeed || 0, speed);
    const totalErrors = (u.TotalErrors || 0) + errors;
    const totalAccuracy = recentSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0);
    const averageAccuracy = recentSessions.length > 0 ? Math.round(totalAccuracy / recentSessions.length) : 0;
    // Completed lessons - считаем за всё время по UserSessions, а не по последним 100
    const countResult = await query(
        `SELECT COUNT(DISTINCT LessonKey) AS cnt FROM UserSessions WHERE UserId = @uid AND LessonKey IS NOT NULL AND LessonKey != ''`,
        { uid }
    );
    const completedLessons = (countResult.recordset[0] && countResult.recordset[0].cnt) || 0;
    await query(
        `UPDATE Users SET TotalSessions = @totalSessions, TotalTime = @totalTime, BestSpeed = @bestSpeed, AverageAccuracy = @averageAccuracy, CompletedLessonsCount = @completedLessons, TotalErrors = @totalErrors, RecentSessionsJson = @recentJson WHERE Uid = @uid`,
        { uid, totalSessions, totalTime, bestSpeed, averageAccuracy, completedLessons, totalErrors, recentJson: JSON.stringify(recentSessions) }
    );
}

// POST /api/users/:uid/session - одна сессия
router.post('/:uid/session', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) return res.status(403).json({ success: false, error: 'Forbidden' });
        await applySessionToUser(req.params.uid, req.body);
        return res.json({ success: true });
    } catch (err) {
        return send500(res, err, 'Add session error');
    }
});

// POST /api/users/:uid/sessions - несколько сессий (batch)
router.post('/:uid/sessions', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) return res.status(403).json({ success: false, error: 'Forbidden' });
        const sessions = Array.isArray(req.body) ? req.body : (req.body.sessions || []);
        for (const s of sessions) {
            await applySessionToUser(req.params.uid, { ...s, timestamp: s.timestamp || Date.now() });
        }
        return res.json({ success: true });
    } catch (err) {
        return send500(res, err, 'Add sessions error');
    }
});

// POST /api/users/:uid/coins
router.post('/:uid/coins', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const amount = parseInt(req.body.amount, 10) || 0;
        if (amount === 0) return res.status(400).json({ success: false, error: 'Invalid amount' });
        if (amount > 0) {
            if (amount > MAX_POSITIVE_COINS_PER_REQUEST) {
                return res.status(400).json({ success: false, error: 'credit_too_large' });
            }
            await query(
                `UPDATE Users SET Balance = Balance + @amount WHERE Uid = @uid`,
                { uid: req.params.uid, amount }
            );
        } else {
            const spend = -amount;
            const upd = await query(
                `UPDATE Users SET Balance = Balance - @spend WHERE Uid = @uid AND Balance >= @spend`,
                { uid: req.params.uid, spend }
            );
            if (!upd.affectedRows) {
                return res.status(400).json({ success: false, error: 'Недостаточно монет' });
            }
        }
        const user = await getUserById(req.params.uid);
        return res.json({ success: true, balance: user.balance });
    } catch (err) {
        return send500(res, err, 'Add coins error');
    }
});

// POST /api/users/:uid/purchase
router.post('/:uid/purchase', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const { lessonId } = req.body || {};
        if (!lessonId) {
            return res.status(400).json({ success: false, error: 'lessonId required' });
        }
        const price = getShopPriceForLesson(lessonId);
        if (price == null) {
            return res.status(400).json({ success: false, error: 'Неизвестный урок' });
        }
        const uid = req.params.uid;
        const userRow = await query(`SELECT Balance, PurchasedLessonsJson FROM Users WHERE Uid = @uid`, { uid });
        if (userRow.recordset.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
        const row = userRow.recordset[0];
        let purchased = [];
        try { purchased = JSON.parse(row.PurchasedLessonsJson || '[]'); } catch (e) {}
        if (purchased.includes(lessonId)) {
            return res.status(400).json({ success: false, error: 'Урок уже куплен' });
        }
        const balance = row.Balance ?? 0;
        if (balance < price) {
            return res.status(400).json({ success: false, error: 'Недостаточно монет' });
        }
        purchased.push(lessonId);
        await query(
            `UPDATE Users SET Balance = Balance - @price, PurchasedLessonsJson = @json WHERE Uid = @uid`,
            { uid, price, json: JSON.stringify(purchased) }
        );
        const user = await getUserById(uid);
        return res.json({ success: true, balance: user.balance });
    } catch (err) {
        return send500(res, err, 'Purchase error');
    }
});

// POST /api/users/:uid/integrity-reset - сброс прогресса при срабатывании анти-накрутки (только свой uid)
router.post('/:uid/integrity-reset', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const uid = req.params.uid;
        await query(`DELETE FROM UserSessions WHERE UserId = @uid`, { uid });
        await query(
            `UPDATE Users SET
                Balance = 50,
                PurchasedLessonsJson = '[]',
                CollectedCardsJson = '[]',
                TotalSessions = 0,
                TotalTime = 0,
                BestSpeed = 0,
                AverageAccuracy = 0,
                CompletedLessonsCount = 0,
                TotalErrors = 0,
                RecentSessionsJson = '[]'
             WHERE Uid = @uid`,
            { uid }
        );
        const user = await getUserById(uid);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        return res.json({ success: true, user });
    } catch (err) {
        return send500(res, err, 'Integrity reset error');
    }
});

// GET /api/users/:uid/balance
router.get('/:uid/balance', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const user = await getUserById(req.params.uid);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        return res.json({ success: true, balance: user.balance });
    } catch (err) {
        return send500(res, err, 'Balance error');
    }
});

// GET /api/users/:uid/lesson-purchased/:lessonId
router.get('/:uid/lesson-purchased/:lessonId', async (req, res) => {
    try {
        if (req.uid !== req.params.uid) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const user = await getUserById(req.params.uid);
        if (!user) return res.json({ purchased: false });
        const purchased = user.purchasedLessons && user.purchasedLessons.includes(req.params.lessonId);
        return res.json({ purchased: !!purchased });
    } catch (err) {
        return send500(res, err, 'Lesson purchased check error');
    }
});

module.exports = router;

