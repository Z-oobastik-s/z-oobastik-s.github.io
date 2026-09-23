const express = require('express');
const { query } = require('../db/connection');
const { authMiddleware, getUserById, rowToUser } = require('./auth');
const { send500 } = require('../lib/httpError');

const router = express.Router();

router.use(authMiddleware);

async function requireAdmin(req, res, next) {
    const user = await getUserById(req.uid);
    if (!user || !user.isAdmin) {
        return res.status(403).json({ success: false, error: 'Доступ запрещён' });
    }
    next();
}

// GET /api/admin/users
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const result = await query(
            `SELECT Uid, Username, DisplayName, Email, CreatedAt, LastLogin, IsAdmin, Ip, Country, City,
             Balance, PurchasedLessonsJson, CollectedCardsJson, TotalSessions, TotalTime, BestSpeed, AverageAccuracy, CompletedLessonsCount, TotalErrors, RecentSessionsJson
             FROM Users ORDER BY LastLogin DESC`
        );
        const users = result.recordset.map(row => ({
            id: row.Uid,
            ...rowToUser(row)
        }));
        return res.json({ success: true, users });
    } catch (err) {
        return send500(res, err, 'Get all users error');
    }
});

// DELETE /api/admin/users/:uid
router.delete('/users/:uid', requireAdmin, async (req, res) => {
    try {
        const uid = req.params.uid;
        await query(`DELETE FROM Users WHERE Uid = @uid`, { uid });
        return res.json({ success: true });
    } catch (err) {
        return send500(res, err, 'Delete user error');
    }
});

module.exports = router;

