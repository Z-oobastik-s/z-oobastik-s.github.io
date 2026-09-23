/**
 * Authentication Module
 * Режим 1: window.API_BASE_URL задан - данные в MSSQL через backend API.
 * Режим 2: API_BASE_URL пустой - данные в localStorage (как раньше).
 */

export const AVAILABLE_AVATARS = [
    'assets/images/profile photo/profile_1.png',
    'assets/images/profile photo/profile_2.jpg',
    'assets/images/profile photo/profile_3.jpg',
    'assets/images/profile photo/profile_4.jpg',
    'assets/images/profile photo/profile_5.jpg',
    'assets/images/profile photo/profile_6.jpg',
    'assets/images/profile photo/profile_7.jpg',
    'assets/images/profile photo/profile_8.jpg',
    'assets/images/profile photo/profile_9.jpg',
    'assets/images/profile photo/profile_10.jpg',
    'assets/images/profile photo/profile_11.jpg',
    'assets/images/profile photo/profile_12.jpg',
    'assets/images/profile photo/profile_13.jpg',
    'assets/images/profile photo/profile_14.jpg',
    'assets/images/profile photo/profile_15.jpg',
    'assets/images/profile photo/profile_16.jpg',
    'assets/images/profile photo/profile_17.jpg',
    'assets/images/profile photo/profile_18.jpg',
    'assets/images/profile photo/profile_19.jpg',
    'assets/images/profile photo/profile_20.jpg'
];

/** Минимальный уровень для разблокировки аватара (0 = доступен с первого уровня). */
export const AVATAR_UNLOCK_LEVELS = [
    0, 0, 0, 5, 5, 10,   // 1–6
    12, 12, 15, 15, 18, 18, 21, 21, 24, 24, 27, 27, 30, 30   // 7–20
];

const STORAGE_KEY_USERS = 'zwebsitesimulator_users';
const STORAGE_KEY_CURRENT_USER = 'zwebsitesimulator_current_user';
const STORAGE_KEY_TOKEN = 'zwebsitesimulator_token';

function useApi() {
    return typeof window !== 'undefined' && window.API_BASE_URL && window.API_BASE_URL.trim() !== '';
}

function getToken() {
    try {
        return localStorage.getItem(STORAGE_KEY_TOKEN);
    } catch (e) {
        return null;
    }
}

async function apiFetch(path, options = {}) {
    const base = (window.API_BASE_URL || '').replace(/\/$/, '');
    const url = base + path;
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    let data = {};
    if (ct.includes('application/json')) {
        if (text) {
            try {
                data = JSON.parse(text);
            } catch (_e) {
                data = {};
            }
        }
    }
    if (!res.ok) {
        const msg = (data && data.error) || (text && text.slice(0, 200)) || res.statusText || 'API Error';
        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}

function fallbackHash(password) {
    let h = 0;
    const s = String(password);
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    const part = Math.abs(h).toString(16).padStart(8, '0');
    return (part + part + part + part + part + part + part + part).slice(0, 64);
}

async function hashPassword(password) {
    const s = String(password || '');
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(s);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            return fallbackHash(s);
        }
    }
    return fallbackHash(s);
}

function getAllUsersStorage() {
    try {
        const usersJson = localStorage.getItem(STORAGE_KEY_USERS);
        return usersJson ? JSON.parse(usersJson) : {};
    } catch (e) {
        return {};
    }
}

function saveAllUsersStorage(users) {
    try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
        return true;
    } catch (e) {
        console.error('Failed to save users:', e);
        return false;
    }
}

function getCurrentUserFromStorage() {
    try {
        const userJson = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
        return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
        return null;
    }
}

function saveCurrentUserToStorage(user) {
    try {
        if (user) {
            localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
        } else {
            localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
        }
        return true;
    } catch (e) {
        console.error('Failed to save current user:', e);
        return false;
    }
}

function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// --------------- Регистрация ---------------
export async function registerUser(username, password, email = '') {
    if (!username || !password) {
        return { success: false, error: 'register_fields_required' };
    }
    if (username.length < 3) {
        return { success: false, error: 'username_too_short' };
    }
    if (password.length < 6) {
        return { success: false, error: 'password_too_short' };
    }

    if (useApi()) {
        try {
            const data = await apiFetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, password, email: email || '' })
            });
            if (data.token) localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
            if (data.user) saveCurrentUserToStorage(data.user);
            let claimed = 0;
            if (data.user && data.user.uid) {
                claimed = await mergeGuestPromisedCoinsIntoUser(data.user.uid);
            }
            if (claimed === 0 && data.user) notifyAuthStateListeners(data.user);
            const u = getCurrentUserFromStorage();
            return { success: true, user: u || data.user, claimedPromisedCoins: claimed };
        } catch (err) {
            return { success: false, error: (err.data && err.data.error) || err.message || 'register_failed' };
        }
    }

    const users = getAllUsersStorage();
    if (Object.values(users).some(u => u.username === username)) {
        return { success: false, error: 'username_taken' };
    }
    const hashedPassword = await hashPassword(password);
    const uid = generateUserId();
    const user = {
        uid, username, displayName: username, passwordHash: hashedPassword, email: email || '',
        photoURL: AVAILABLE_AVATARS[0], avatarIndex: 0, bio: '', createdAt: Date.now(), lastLogin: Date.now(),
        isAdmin: false, balance: 50, purchasedLessons: [], collectedCards: [],
        stats: { totalSessions: 0, totalTime: 0, bestSpeed: 0, averageAccuracy: 0, completedLessons: 0, totalErrors: 0, sessions: [] }
    };
    users[uid] = user;
    if (!saveAllUsersStorage(users)) return { success: false, error: 'save_failed' };
    saveCurrentUserToStorage(user);
    const claimed = await mergeGuestPromisedCoinsIntoUser(user.uid);
    if (claimed === 0) notifyAuthStateListeners(user);
    const u = getCurrentUserFromStorage();
    return { success: true, user: u || user, claimedPromisedCoins: claimed };
}

// --------------- Вход ---------------
export async function loginUser(username, password) {
    if (!username || !password) {
        return { success: false, error: 'fill_credentials' };
    }

    if (useApi()) {
        try {
            const data = await apiFetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            if (data.token) localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
            if (data.user) saveCurrentUserToStorage(data.user);
            let claimed = 0;
            if (data.user && data.user.uid) {
                claimed = await mergeGuestPromisedCoinsIntoUser(data.user.uid);
            }
            if (claimed === 0 && data.user) notifyAuthStateListeners(data.user);
            const u = getCurrentUserFromStorage();
            return { success: true, user: u || data.user, claimedPromisedCoins: claimed };
        } catch (err) {
            return { success: false, error: (err.data && err.data.error) || err.message || 'invalid_credentials' };
        }
    }

    const users = getAllUsersStorage();
    const user = Object.values(users).find(u => u.username === username);
    if (!user) return { success: false, error: 'invalid_credentials' };
    const hashedPassword = await hashPassword(password);
    if (user.passwordHash !== hashedPassword) return { success: false, error: 'invalid_credentials' };
    user.lastLogin = Date.now();
    users[user.uid] = user;
    if (!saveAllUsersStorage(users)) return { success: false, error: 'save_failed' };
    saveCurrentUserToStorage(user);
    const claimed = await mergeGuestPromisedCoinsIntoUser(user.uid);
    if (claimed === 0) notifyAuthStateListeners(user);
    const u = getCurrentUserFromStorage();
    return { success: true, user: u || user, claimedPromisedCoins: claimed };
}

// --------------- Выход ---------------
export async function logoutUser() {
    if (useApi()) {
        try {
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            saveCurrentUserToStorage(null);
            notifyAuthStateListeners(null);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
    saveCurrentUserToStorage(null);
    notifyAuthStateListeners(null);
    return { success: true };
}

// --------------- Текущий пользователь ---------------
export function getCurrentUser() {
    return getCurrentUserFromStorage();
}

/** Поля профиля, разрешённые для изменения с клиента (без balance, isAdmin и т.д.). */
function pickProfileUpdates(updates) {
    if (!updates || typeof updates !== 'object') return {};
    const out = {};
    if (updates.username !== undefined) out.username = updates.username;
    if (updates.displayName !== undefined) out.displayName = updates.displayName;
    if (updates.bio !== undefined) out.bio = updates.bio;
    return out;
}

// --------------- Профиль ---------------
export async function getUserProfile(uid) {
    if (useApi()) {
        try {
            const data = await apiFetch(`/api/users/${uid}/profile`);
            return { success: true, data: data.data };
        } catch (err) {
            return { success: false, error: (err.data && err.data.error) || err.message };
        }
    }
    const users = getAllUsersStorage();
    const user = users[uid];
    return user ? { success: true, data: user } : { success: false, error: 'User not found' };
}

export async function updateUserProfile(uid, updates) {
    const safe = pickProfileUpdates(updates);
    if (useApi()) {
        try {
            const data = await apiFetch(`/api/users/${uid}/profile`, {
                method: 'PUT',
                body: JSON.stringify(safe)
            });
            if (data.user) saveCurrentUserToStorage(data.user);
            notifyAuthStateListeners(data.user);
            return { success: true };
        } catch (err) {
            return { success: false, error: (err.data && err.data.error) || err.message };
        }
    }
    const users = getAllUsersStorage();
    const user = users[uid];
    if (!user) return { success: false, error: 'User not found' };
    Object.assign(user, safe);
    users[uid] = user;
    if (!saveAllUsersStorage(users)) return { success: false, error: 'Ошибка сохранения данных' };
    const current = getCurrentUserFromStorage();
    if (current && current.uid === uid) saveCurrentUserToStorage(user);
    return { success: true };
}

export async function updateProfileAvatar(uid, avatarIndex) {
    if (avatarIndex < 0 || avatarIndex >= AVAILABLE_AVATARS.length) {
        return { success: false, error: 'Неверный индекс аватара' };
    }
    const photoURL = AVAILABLE_AVATARS[avatarIndex];
    if (useApi()) {
        try {
            const data = await apiFetch(`/api/users/${uid}/avatar`, {
                method: 'PUT',
                body: JSON.stringify({ avatarIndex })
            });
            const resolvedURL = data && data.photoURL ? data.photoURL : photoURL;
            const resolvedIdx = data && data.avatarIndex != null && Number.isFinite(Number(data.avatarIndex))
                ? Number(data.avatarIndex)
                : avatarIndex;
            const user = getCurrentUserFromStorage();
            if (user && user.uid === uid) {
                user.photoURL = resolvedURL;
                user.avatarIndex = resolvedIdx;
                saveCurrentUserToStorage(user);
                notifyAuthStateListeners(user);
            }
            return { success: true, photoURL: resolvedURL, avatarIndex: resolvedIdx };
        } catch (err) {
            return { success: false, error: (err.data && err.data.error) || err.message };
        }
    }
    const users = getAllUsersStorage();
    const user = users[uid];
    if (!user) return { success: false, error: 'User not found' };
    user.photoURL = photoURL;
    user.avatarIndex = avatarIndex;
    users[uid] = user;
    if (!saveAllUsersStorage(users)) return { success: false, error: 'Ошибка сохранения данных' };
    const current = getCurrentUserFromStorage();
    if (current && current.uid === uid) {
        saveCurrentUserToStorage(user);
        notifyAuthStateListeners(user);
    }
    return { success: true, photoURL, avatarIndex };
}

// --------------- Сессии (прогресс) ---------------
/** Очередь и таймер отдельно на каждый uid - сессии разных аккаунтов не сливаются в один batch при быстрой смене пользователя. */
const sessionQueuesByUid = new Map();
const sessionUpdateTimeoutsByUid = new Map();

function debouncedSessionUpdate(uid) {
    const prevTimer = sessionUpdateTimeoutsByUid.get(uid);
    if (prevTimer) clearTimeout(prevTimer);
    sessionUpdateTimeoutsByUid.set(uid, setTimeout(async () => {
        sessionUpdateTimeoutsByUid.delete(uid);
        const queue = sessionQueuesByUid.get(uid);
        if (!queue || queue.length === 0) {
            sessionQueuesByUid.delete(uid);
            return;
        }
        const batch = [...queue];
        sessionQueuesByUid.delete(uid);

        if (useApi()) {
            try {
                await apiFetch(`/api/users/${uid}/sessions`, {
                    method: 'POST',
                    body: JSON.stringify(batch)
                });
                const data = await apiFetch('/api/auth/me');
                if (data.user) {
                    saveCurrentUserToStorage(data.user);
                    notifyAuthStateListeners(data.user);
                }
            } catch (e) {
                console.error('Failed to update user session:', e);
            }
            return;
        }

        try {
            const users = getAllUsersStorage();
            const user = users[uid];
            if (!user) return;
            const currentStats = user.stats || {};
            const sessions = currentStats.sessions || [];
            batch.forEach(s => sessions.push({ ...s, timestamp: Date.now() }));
            const totalSessions = sessions.length;
            const totalTime = batch.reduce((sum, s) => sum + (s.time || 0), currentStats.totalTime || 0);
            const speeds = sessions.map(s => Number(s.speed) || 0);
            const bestFromSessions = speeds.length ? Math.max.apply(null, speeds) : 0;
            const bestSpeed = Math.max(currentStats.bestSpeed || 0, bestFromSessions);
            const totalErrors = batch.reduce((sum, s) => sum + (s.errors || 0), currentStats.totalErrors || 0);
            const totalAccuracy = sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0);
            const averageAccuracy = totalSessions > 0 ? Math.round(totalAccuracy / totalSessions) : 0;
            const completedLessons = new Set(sessions.filter(s => s.lessonKey).map(s => s.lessonKey)).size;
            user.stats = {
                totalSessions, totalTime, bestSpeed, averageAccuracy, completedLessons, totalErrors,
                sessions: sessions.slice(-100)
            };
            users[uid] = user;
            saveAllUsersStorage(users);
            const current = getCurrentUserFromStorage();
            if (current && current.uid === uid) saveCurrentUserToStorage(user);
        } catch (e) {
            console.error('Failed to update user session:', e);
        }
    }, 2000));
}

export async function addUserSession(uid, sessionData) {
    let q = sessionQueuesByUid.get(uid);
    if (!q) {
        q = [];
        sessionQueuesByUid.set(uid, q);
    }
    q.push(sessionData);
    debouncedSessionUpdate(uid);
    return { success: true };
}

// --------------- Админ ---------------
export async function isAdmin(uid) {
    if (useApi()) {
        const user = getCurrentUserFromStorage();
        return user && user.uid === uid && user.isAdmin === true;
    }
    const users = getAllUsersStorage();
    const user = users[uid];
    return user ? user.isAdmin === true : false;
}

export async function getAllUsers() {
    if (useApi()) {
        try {
            const data = await apiFetch('/api/admin/users');
            return { success: true, users: data.users };
        } catch (err) {
            return { success: false, error: (err.data && err.data.error) || err.message };
        }
    }
    const users = getAllUsersStorage();
    return { success: true, users: Object.values(users).map(u => ({ id: u.uid, ...u })) };
}

export async function deleteUser(uid) {
    if (useApi()) {
        try {
            await apiFetch(`/api/admin/users/${uid}`, { method: 'DELETE' });
            return { success: true };
        } catch (err) {
            return { success: false, error: (err.data && err.data.error) || err.message };
        }
    }
    const users = getAllUsersStorage();
    delete users[uid];
    if (!saveAllUsersStorage(users)) return { success: false, error: 'Ошибка сохранения данных' };
    return { success: true };
}

// --------------- Слушатель авторизации ---------------
let authStateListeners = [];
let currentAuthUser = null;

function notifyAuthStateListeners(user) {
    currentAuthUser = user;
    authStateListeners.forEach(cb => {
        try { cb(user); } catch (e) { console.error('Auth state listener error:', e); }
    });
}

function checkAuthState() {
    const user = getCurrentUserFromStorage();
    if (user !== currentAuthUser) notifyAuthStateListeners(user);
}

checkAuthState();

// При использовании API: если есть токен, но нет пользователя в кэше - подгрузить с сервера
if (useApi() && getToken() && !getCurrentUserFromStorage()) {
    apiFetch('/api/auth/me').then(async data => {
        if (data.user) {
            saveCurrentUserToStorage(data.user);
            const claimed = await mergeGuestPromisedCoinsIntoUser(data.user.uid);
            if (claimed === 0) notifyAuthStateListeners(data.user);
            else notifyAuthStateListeners(getCurrentUserFromStorage());
        }
    }).catch(() => {
        localStorage.removeItem(STORAGE_KEY_TOKEN);
    });
}

export function onAuthStateChange(callback) {
    authStateListeners.push(callback);
    const user = getCurrentUserFromStorage();
    if (user) setTimeout(() => callback(user), 0);
    return () => { authStateListeners = authStateListeners.filter(cb => cb !== callback); };
}

// --------------- Монеты и магазин ---------------
/** Должно совпадать с backend/routes/users.js MAX_POSITIVE_COINS_PER_REQUEST. */
const MAX_POSITIVE_COINS_PER_REQUEST = 50000;

/** Последовательная очередь: быстрые двойные клики не читают один и тот же баланс параллельно. */
let balanceOpChain = Promise.resolve();
function withBalanceLock(fn) {
    const next = balanceOpChain.then(() => fn());
    balanceOpChain = next.then(() => {}, () => {});
    return next;
}

export async function addCoins(uid, amount) {
    const n = parseInt(amount, 10) || 0;
    if (n <= 0) return { success: false, error: 'Invalid amount' };
    return withBalanceLock(async () => {
        if (useApi()) {
            try {
                let remaining = n;
                let data = null;
                while (remaining > 0) {
                    const chunk = Math.min(remaining, MAX_POSITIVE_COINS_PER_REQUEST);
                    data = await apiFetch(`/api/users/${uid}/coins`, {
                        method: 'POST',
                        body: JSON.stringify({ amount: chunk })
                    });
                    remaining -= chunk;
                }
                const user = getCurrentUserFromStorage();
                if (user && user.uid === uid) {
                    user.balance = data.balance;
                    saveCurrentUserToStorage(user);
                    notifyAuthStateListeners(user);
                }
                return { success: true, balance: data.balance };
            } catch (err) {
                return { success: false, error: (err.data && err.data.error) || err.message };
            }
        }
        const users = getAllUsersStorage();
        const user = users[uid];
        if (!user) return { success: false, error: 'User not found' };
        user.balance = (user.balance || 0) + n;
        users[uid] = user;
        if (!saveAllUsersStorage(users)) return { success: false, error: 'Ошибка сохранения данных' };
        const current = getCurrentUserFromStorage();
        if (current && current.uid === uid) saveCurrentUserToStorage(user);
        notifyAuthStateListeners(user);
        return { success: true, balance: user.balance };
    });
}

/**
 * Переносит обещанные гостевые монеты в аккаунт после входа/регистрации.
 * При сбое addCoins возвращает сумму обратно в guest storage.
 */
async function mergeGuestPromisedCoinsIntoUser(uid) {
    if (!uid) return 0;
    const g = typeof window !== 'undefined' && window.guestPromisedCoins;
    if (!g || typeof g.drainTotal !== 'function') return 0;
    const n = g.drainTotal();
    if (!n || n <= 0) return 0;
    try {
        const res = await addCoins(uid, n);
        if (res && res.success) return n;
    } catch (_e) {}
    g.add(n);
    return 0;
}

/** Списание монет (покупка фона и т.п.); в API через POST /coins с отрицательным amount. */
export async function deductCoins(uid, amount) {
    const n = parseInt(amount, 10) || 0;
    if (n <= 0) return { success: false, error: 'Invalid amount' };
    return withBalanceLock(async () => {
        if (useApi()) {
            try {
                const data = await apiFetch(`/api/users/${uid}/coins`, {
                    method: 'POST',
                    body: JSON.stringify({ amount: -n })
                });
                const user = getCurrentUserFromStorage();
                if (user && user.uid === uid) {
                    user.balance = data.balance;
                    saveCurrentUserToStorage(user);
                    notifyAuthStateListeners(user);
                }
                return { success: true, balance: data.balance };
            } catch (err) {
                return { success: false, error: (err.data && err.data.error) || err.message };
            }
        }
        const users = getAllUsersStorage();
        const user = users[uid];
        if (!user) return { success: false, error: 'User not found' };
        const b = user.balance || 0;
        if (b < n) return { success: false, error: 'Недостаточно монет' };
        user.balance = b - n;
        users[uid] = user;
        if (!saveAllUsersStorage(users)) return { success: false, error: 'Ошибка сохранения данных' };
        const current = getCurrentUserFromStorage();
        if (current && current.uid === uid) saveCurrentUserToStorage(user);
        notifyAuthStateListeners(user);
        return { success: true, balance: user.balance };
    });
}

/** Бустер коллекционных карт: списание монет, случайная карта или дубликат (+ монеты). */
export async function pullCollectibleBooster(uid) {
    const COST = (typeof window !== 'undefined' && window.collectibleCardsModule && window.collectibleCardsModule.BOOSTER_COST) || 95;
    const DUP = (typeof window !== 'undefined' && window.collectibleCardsModule && window.collectibleCardsModule.DUPLICATE_REFUND) || 30;
    return withBalanceLock(async () => {
        if (useApi()) {
            try {
                const data = await apiFetch(`/api/users/${uid}/cards/pull`, {
                    method: 'POST',
                    body: JSON.stringify({})
                });
                const user = getCurrentUserFromStorage();
                if (user && user.uid === uid) {
                    user.balance = data.balance;
                    user.collectedCards = data.collectedCards || user.collectedCards || [];
                    saveCurrentUserToStorage(user);
                    notifyAuthStateListeners(user);
                }
                return {
                    success: true,
                    cardId: data.cardId,
                    duplicate: !!data.duplicate,
                    refundCoins: data.refundCoins || 0,
                    balance: data.balance,
                    collectedCards: data.collectedCards
                };
            } catch (err) {
                return { success: false, error: (err.data && err.data.error) || err.message };
            }
        }
        const users = getAllUsersStorage();
        const user = users[uid];
        if (!user) return { success: false, error: 'User not found' };
        const b = user.balance || 0;
        if (b < COST) return { success: false, error: 'Недостаточно монет' };
        if (!user.collectedCards) user.collectedCards = [];
        user.balance = b - COST;
        const pick = (typeof window !== 'undefined' && window.collectibleCardsModule && window.collectibleCardsModule.pickRandomCardIdForPull)
            ? window.collectibleCardsModule.pickRandomCardIdForPull()
            : String(1 + Math.floor(Math.random() * 52));
        let duplicate = false;
        if (user.collectedCards.indexOf(pick) === -1) {
            user.collectedCards.push(pick);
        } else {
            duplicate = true;
            user.balance += DUP;
        }
        users[uid] = user;
        if (!saveAllUsersStorage(users)) return { success: false, error: 'Ошибка сохранения данных' };
        const current = getCurrentUserFromStorage();
        if (current && current.uid === uid) {
            saveCurrentUserToStorage(user);
            notifyAuthStateListeners(user);
        }
        return {
            success: true,
            cardId: pick,
            duplicate,
            refundCoins: duplicate ? DUP : 0,
            balance: user.balance,
            collectedCards: user.collectedCards.slice()
        };
    });
}

/** Несколько бустеров подряд (1..50), один запрос к API или одна блокировка баланса локально. */
export async function pullCollectibleBoosterBatch(uid, count) {
    const COST = (typeof window !== 'undefined' && window.collectibleCardsModule && window.collectibleCardsModule.BOOSTER_COST) || 95;
    const DUP = (typeof window !== 'undefined' && window.collectibleCardsModule && window.collectibleCardsModule.DUPLICATE_REFUND) || 30;
    const n = parseInt(count, 10);
    if (!Number.isFinite(n) || n < 1 || n > 50) {
        return { success: false, error: 'Неверное число бустеров' };
    }
    return withBalanceLock(async () => {
        if (useApi()) {
            try {
                const data = await apiFetch(`/api/users/${uid}/cards/pull-batch`, {
                    method: 'POST',
                    body: JSON.stringify({ count: n })
                });
                const user = getCurrentUserFromStorage();
                if (user && user.uid === uid) {
                    user.balance = data.balance;
                    user.collectedCards = data.collectedCards || user.collectedCards || [];
                    saveCurrentUserToStorage(user);
                    notifyAuthStateListeners(user);
                }
                return {
                    success: true,
                    count: data.count,
                    pulls: data.pulls,
                    summary: data.summary,
                    balance: data.balance,
                    collectedCards: data.collectedCards
                };
            } catch (err) {
                return { success: false, error: (err.data && err.data.error) || err.message };
            }
        }
        const users = getAllUsersStorage();
        const user = users[uid];
        if (!user) return { success: false, error: 'User not found' };
        let b = user.balance || 0;
        if (b < n * COST) return { success: false, error: 'Недостаточно монет' };
        if (!user.collectedCards) user.collectedCards = [];
        const pickFn =
            typeof window !== 'undefined' && window.collectibleCardsModule && window.collectibleCardsModule.pickRandomCardIdForPull
                ? () => window.collectibleCardsModule.pickRandomCardIdForPull()
                : () => String(1 + Math.floor(Math.random() * 52));
        const pulls = [];
        for (let i = 0; i < n; i++) {
            b -= COST;
            const pick = pickFn();
            let duplicate = false;
            if (user.collectedCards.indexOf(pick) === -1) {
                user.collectedCards.push(pick);
            } else {
                duplicate = true;
                b += DUP;
            }
            pulls.push({
                cardId: pick,
                duplicate,
                refundCoins: duplicate ? DUP : 0
            });
        }
        user.balance = b;
        users[uid] = user;
        if (!saveAllUsersStorage(users)) return { success: false, error: 'Ошибка сохранения данных' };
        const current = getCurrentUserFromStorage();
        if (current && current.uid === uid) {
            saveCurrentUserToStorage(user);
            notifyAuthStateListeners(user);
        }
        const newCards = pulls.filter((p) => !p.duplicate).length;
        const duplicates = pulls.filter((p) => p.duplicate).length;
        const totalRefund = pulls.reduce((sum, p) => sum + (p.refundCoins || 0), 0);
        return {
            success: true,
            count: n,
            pulls,
            summary: { newCards, duplicates, totalRefund },
            balance: user.balance,
            collectedCards: user.collectedCards.slice()
        };
    });
}

export async function purchaseLesson(uid, lessonId) {
    const shopLesson = window.shopModule && window.shopModule.getLessonById && window.shopModule.getLessonById(lessonId);
    if (!shopLesson) return { success: false, error: 'Урок не найден в магазине' };

    return withBalanceLock(async () => {
        if (useApi()) {
            try {
                const data = await apiFetch(`/api/users/${uid}/purchase`, {
                    method: 'POST',
                    body: JSON.stringify({ lessonId })
                });
                const user = getCurrentUserFromStorage();
                if (user && user.uid === uid) {
                    user.balance = data.balance;
                    user.purchasedLessons = user.purchasedLessons || [];
                    if (!user.purchasedLessons.includes(lessonId)) user.purchasedLessons.push(lessonId);
                    saveCurrentUserToStorage(user);
                    notifyAuthStateListeners(user);
                }
                return { success: true, balance: data.balance };
            } catch (err) {
                return { success: false, error: (err.data && err.data.error) || err.message };
            }
        }

        const users = getAllUsersStorage();
        const user = users[uid];
        if (!user) return { success: false, error: 'User not found' };
        if (!user.balance) user.balance = 0;
        if (!user.purchasedLessons) user.purchasedLessons = [];
        if (user.purchasedLessons.includes(lessonId)) return { success: false, error: 'Урок уже куплен' };
        if (user.balance < shopLesson.price) return { success: false, error: 'Недостаточно монет' };
        user.balance -= shopLesson.price;
        user.purchasedLessons.push(lessonId);
        users[uid] = user;
        if (!saveAllUsersStorage(users)) return { success: false, error: 'Ошибка сохранения данных' };
        const current = getCurrentUserFromStorage();
        if (current && current.uid === uid) saveCurrentUserToStorage(user);
        notifyAuthStateListeners(user);
        return { success: true, balance: user.balance };
    });
}

export function getUserBalance(uid) {
    const user = getCurrentUserFromStorage();
    if (user && user.uid === uid) return user.balance ?? 0;
    if (!useApi()) {
        const users = getAllUsersStorage();
        const u = users[uid];
        return u ? (u.balance || 0) : 0;
    }
    return 0;
}

export function isLessonPurchased(uid, lessonId) {
    const user = getCurrentUserFromStorage();
    if (user && user.uid === uid && user.purchasedLessons) return user.purchasedLessons.includes(lessonId);
    if (!useApi()) {
        const users = getAllUsersStorage();
        const u = users[uid];
        return u && u.purchasedLessons ? u.purchasedLessons.includes(lessonId) : false;
    }
    return false;
}

// Глобальный экспорт для main.js
window.authModule = {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    getUserProfile,
    updateUserProfile,
    updateProfileAvatar,
    AVAILABLE_AVATARS,
    AVATAR_UNLOCK_LEVELS,
    addUserSession,
    isAdmin,
    getAllUsers,
    deleteUser,
    onAuthStateChange,
    addCoins,
    deductCoins,
    purchaseLesson,
    pullCollectibleBooster,
    pullCollectibleBoosterBatch,
    getUserBalance,
    isLessonPurchased
};

