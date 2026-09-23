const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/connection');
const { send500 } = require('../lib/httpError');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || String(JWT_SECRET).length < 16) {
    console.error('Задайте JWT_SECRET в backend/.env (не короче 16 символов).');
    process.exit(1);
}

function generateUid() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const body = req.body || {};
        const username = body.username != null ? String(body.username).trim() : '';
        const password = body.password != null ? String(body.password) : '';
        const email = body.email != null ? String(body.email).trim() : '';
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'register_fields_required' });
        }
        if (username.length < 3) {
            return res.status(400).json({ success: false, error: 'username_too_short' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'password_too_short' });
        }

        const existing = await query(
            `SELECT Uid FROM Users WHERE Username = @username`,
            { username }
        );
        if (existing.recordset.length > 0) {
            return res.status(400).json({ success: false, error: 'username_taken' });
        }

        let passwordHash;
        try {
            passwordHash = await bcrypt.hash(String(password), 10);
        } catch (hashErr) {
            console.error('bcrypt hash error:', hashErr);
            return res.status(500).json({ success: false, error: 'register_failed' });
        }
        const uid = generateUid();
        const now = Date.now();

        await query(
            `INSERT INTO Users (Uid, Username, DisplayName, PasswordHash, Email, PhotoURL, AvatarIndex, Bio, Balance, CreatedAt, LastLogin, IsAdmin, PurchasedLessonsJson, CollectedCardsJson, TotalSessions, TotalTime, BestSpeed, AverageAccuracy, CompletedLessonsCount, TotalErrors, RecentSessionsJson)
             VALUES (@uid, @username, @displayName, @passwordHash, @email, @photoURL, 0, '', 50, @now, @now, 0, '[]', '[]', 0, 0, 0, 0, 0, 0, '[]')`,
            {
                uid, username, displayName: username, passwordHash, email: email || '',
                photoURL: 'assets/images/profile photo/profile_1.png', now
            }
        );

        const user = await getUserById(uid);
        const token = jwt.sign({ uid }, JWT_SECRET, { expiresIn: '30d' });
        return res.json({ success: true, user: user, token });
    } catch (err) {
        return send500(res, err, 'Register error');
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const body = req.body || {};
        const username = body.username != null ? String(body.username).trim() : '';
        const password = body.password != null ? String(body.password) : '';
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'fill_credentials' });
        }

        const result = await query(
            `SELECT Uid, Username, DisplayName, PasswordHash, Email, PhotoURL, AvatarIndex, Bio, Balance, CreatedAt, LastLogin, IsAdmin, Ip, Country, City,
             PurchasedLessonsJson, CollectedCardsJson, TotalSessions, TotalTime, BestSpeed, AverageAccuracy, CompletedLessonsCount, TotalErrors, RecentSessionsJson
             FROM Users WHERE Username = @username`,
            { username }
        );
        if (result.recordset.length === 0) {
            return res.status(401).json({ success: false, error: 'invalid_credentials' });
        }

        const row = result.recordset[0];
        const match = await bcrypt.compare(password, row.PasswordHash);
        if (!match) {
            return res.status(401).json({ success: false, error: 'invalid_credentials' });
        }

        await query(`UPDATE Users SET LastLogin = @now WHERE Uid = @uid`, { now: Date.now(), uid: row.Uid });

        const user = rowToUser(row);
        const token = jwt.sign({ uid: row.Uid }, JWT_SECRET, { expiresIn: '30d' });
        return res.json({ success: true, user, token });
    } catch (err) {
        return send500(res, err, 'Login error');
    }
});

function rowToUser(row) {
    let purchasedLessons = [];
    try {
        if (row.PurchasedLessonsJson) purchasedLessons = JSON.parse(row.PurchasedLessonsJson);
    } catch (e) {}
    let collectedCards = [];
    try {
        if (row.CollectedCardsJson) collectedCards = JSON.parse(row.CollectedCardsJson);
    } catch (e) {}
    if (!Array.isArray(collectedCards)) collectedCards = [];
    let sessions = [];
    try {
        if (row.RecentSessionsJson) sessions = JSON.parse(row.RecentSessionsJson);
    } catch (e) {}
    return {
        uid: row.Uid,
        username: row.Username,
        displayName: row.DisplayName,
        email: row.Email || '',
        photoURL: row.PhotoURL || '',
        avatarIndex: row.AvatarIndex || 0,
        bio: row.Bio || '',
        balance: row.Balance ?? 0,
        createdAt: row.CreatedAt,
        lastLogin: row.LastLogin,
        isAdmin: !!row.IsAdmin,
        ip: row.Ip || '',
        country: row.Country || '',
        city: row.City || '',
        purchasedLessons,
        collectedCards,
        stats: {
            totalSessions: row.TotalSessions ?? 0,
            totalTime: row.TotalTime ?? 0,
            bestSpeed: row.BestSpeed ?? 0,
            averageAccuracy: row.AverageAccuracy ?? 0,
            completedLessons: row.CompletedLessonsCount ?? 0,
            totalErrors: row.TotalErrors ?? 0,
            sessions
        }
    };
}

async function getUserById(uid) {
    const result = await query(
        `SELECT Uid, Username, DisplayName, Email, PhotoURL, AvatarIndex, Bio, Balance, CreatedAt, LastLogin, IsAdmin, Ip, Country, City,
         PurchasedLessonsJson, CollectedCardsJson, TotalSessions, TotalTime, BestSpeed, AverageAccuracy, CompletedLessonsCount, TotalErrors, RecentSessionsJson
         FROM Users WHERE Uid = @uid`,
        { uid }
    );
    if (result.recordset.length === 0) return null;
    return rowToUser(result.recordset[0]);
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Требуется авторизация' });
    }
    const token = authHeader.slice(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.uid = decoded.uid;
        next();
    } catch (e) {
        return res.status(401).json({ success: false, error: 'Недействительный токен' });
    }
}

// GET /api/auth/me - текущий пользователь по токену
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await getUserById(req.uid);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        return res.json({ success: true, user });
    } catch (err) {
        return send500(res, err, 'Me error');
    }
});

module.exports = { router, authMiddleware, getUserById, rowToUser };

