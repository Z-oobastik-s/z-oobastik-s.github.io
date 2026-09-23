/**
 * Multiplayer Mode - Real-time typing competition
 * Uses Firebase Realtime Database
 */

import { initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, onValue, onDisconnect, serverTimestamp, remove, get, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

// Reuse existing Firebase app if already initialized (e.g. by visitor-stats.js)
let fbApp;
try { fbApp = getApp(); } catch (e) { fbApp = initializeApp(firebaseConfig); }
const database = getDatabase(fbApp);

// Multiplayer state
const multiplayerState = {
    roomCode: null,
    playerId: null,
    playerNumber: null, // 1 or 2
    opponentId: null,
    isHost: false,
    gameStarted: false,
    gameText: '',
    myProgress: 0,
    myErrors: 0,
    opponentProgress: 0,
    opponentErrors: 0,
    myReady: true,
    opponentReady: true,
    gameEnded: false,
    opponentLeftHandled: false,
    autoStartTimeoutId: null,
    roomListenerUnsub: null,
    currentMatchId: null
};

function clearAutoStartTimer() {
    if (multiplayerState.autoStartTimeoutId) {
        clearTimeout(multiplayerState.autoStartTimeoutId);
        multiplayerState.autoStartTimeoutId = null;
    }
}

function unsubscribeRoomListener() {
    if (multiplayerState.roomListenerUnsub) {
        try { multiplayerState.roomListenerUnsub(); } catch (e) {}
        multiplayerState.roomListenerUnsub = null;
    }
}

// Generate unique room code
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Generate unique player ID
function generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Text library for themed texts
const textLibrary = {
    anime: {
        ru: "Наруто Узумаки мечтал стать хокаге чтобы все признали его силу верил в друзей даже когда казалось что надежды нет сила воли помогла ему преодолеть все трудности и стать сильнейшим ниндзя в деревне Коноха",
        en: "Naruto Uzumaki dreamed of becoming hokage so everyone would recognize his strength believed in friends even when hope seemed lost willpower helped him overcome all difficulties and become the strongest ninja in Konoha village"
    },
    games: {
        ru: "В мире компьютерных игр существует множество жанров от шутеров до стратегий каждый игрок может найти что-то по душе соревнования киберспорт объединяют миллионы людей по всему миру создавая уникальную культуру и сообщество геймеров",
        en: "In the world of computer games there are many genres from shooters to strategies each player can find something to their liking competitions esports unite millions of people around the world creating a unique culture and community of gamers"
    },
    animals: {
        ru: "Животные населяют нашу планету миллионы лет от крошечных насекомых до огромных слонов каждый вид уникален и важен для экосистемы дельфины умны как люди а колибри машут крыльями восемьдесят раз в секунду природа удивительна",
        en: "Animals have inhabited our planet for millions of years from tiny insects to huge elephants each species is unique and important for the ecosystem dolphins are as smart as humans and hummingbirds flap their wings eighty times per second nature is amazing"
    },
    space: {
        ru: "Космос бесконечен и полон загадок звёзды рождаются и умирают чёрные дыры поглощают всё вокруг галактики сталкиваются создавая новые миры человечество только начинает исследовать вселенную мечтая о путешествиях к далёким планетам и встрече с инопланетными цивилизациями",
        en: "Space is infinite and full of mysteries stars are born and die black holes absorb everything around galaxies collide creating new worlds humanity is just beginning to explore the universe dreaming of traveling to distant planets and meeting alien civilizations"
    },
    war: {
        ru: "Война это страшное испытание для человечества принося разрушения и страдания история помнит великие сражения где решались судьбы народов храбрость солдат подвиги героев вечная память павшим мир это величайшая ценность которую нужно беречь любой ценой",
        en: "War is a terrible test for humanity bringing destruction and suffering history remembers great battles where the fates of nations were decided courage of soldiers feats of heroes eternal memory to the fallen peace is the greatest value that must be protected at any cost"
    },
    nature: {
        ru: "Природа создала удивительные ландшафты высокие горы глубокие океаны бескрайние леса и жаркие пустыни каждая экосистема уникальна реки текут к морям деревья очищают воздух цветы радуют глаз птицы поют песни человек должен заботиться о планете сохраняя её красоту для будущих поколений",
        en: "Nature has created amazing landscapes high mountains deep oceans endless forests and hot deserts each ecosystem is unique rivers flow to the seas trees purify the air flowers delight the eye birds sing songs humans must take care of the planet preserving its beauty for future generations"
    }
};

function getThemedWords(theme, layout) {
    const text = textLibrary[theme]?.[layout] || textLibrary[theme]?.ru;
    if (!text) return [];
    return text.split(/\s+/).filter(Boolean);
}

function cryptoRandInt(max) {
    // max > 0
    try {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const arr = new Uint32Array(1);
            crypto.getRandomValues(arr);
            return arr[0] % max;
        }
    } catch (e) {}
    // Fallback: should not be used in modern browsers, but keeps the app working.
    return Math.floor(Math.random() * max);
}

function cryptoPick(arr) {
    if (!arr || !arr.length) return '';
    return arr[cryptoRandInt(arr.length)];
}

function maybeUppercase(word) {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function sanitizeToken(token) {
    if (!token) return '';
    const s = String(token);
    try {
        // Keep only letters/digits (remove em-dash, hyphens, quotes, etc).
        return s.replace(/[^\p{L}\p{N}]+/gu, '');
    } catch (_) {
        // Fallback for older engines without unicode property escapes.
        return s.replace(/[^0-9A-Za-zА-Яа-яЁёІіЇїЄєҐґ]+/g, '');
    }
}

export function generateRandomTextByChars(targetChars, language, theme, options = {}) {
    const includeComma = !!options.includeComma;
    const includePeriod = !!options.includePeriod;
    const includeDigits = !!options.includeDigits;
    const mixCase = !!options.mixCase;

    const wordsFromRandomPool = language === 'en'
        ? ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'time', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'with', 'work', 'year', 'back', 'call', 'come', 'made', 'make', 'more', 'over', 'such', 'take', 'than', 'them', 'then', 'very', 'well', 'when', 'your']
        : language === 'ua'
            ? ['як', 'так', 'все', 'це', 'був', 'вона', 'вони', 'мій', 'його', 'що', 'рік', 'дім', 'день', 'раз', 'рука', 'нога', 'мама', 'тато', 'вода', 'небо', 'земля', 'місто', 'стіл', 'вікно', 'двері', 'книга', 'лампа', 'стілець', 'друг', 'життя', 'час', 'люди', 'справа', 'місце', 'слово', 'сторона', 'питання', 'робота', 'школа', 'дитина', 'батько', 'сестра', 'брат', 'країна', 'мова', 'дерево', 'квітка', 'сонце', 'місяць', 'зірка']
            : ['как', 'так', 'все', 'это', 'был', 'она', 'они', 'мой', 'его', 'что', 'год', 'дом', 'день', 'раз', 'рука', 'нога', 'мама', 'папа', 'вода', 'небо', 'земля', 'город', 'стол', 'окно', 'дверь', 'книга', 'лампа', 'стул', 'друг', 'жизнь', 'время', 'человек', 'дело', 'место', 'слово', 'сторона', 'вопрос', 'работа', 'школа', 'ребенок', 'отец', 'мать', 'брат', 'сестра', 'страна', 'язык', 'дерево', 'цветок', 'солнце', 'луна', 'звезда'];

    const themedWords = theme && theme !== 'random'
        ? getThemedWords(theme, language)
        : [];

    const wordPool = themedWords.length ? themedWords : wordsFromRandomPool;

    // Tune probabilities: punctuation isn't overwhelming.
    const commaChance = includeComma ? 0.10 : 0;
    const periodChance = includePeriod ? 0.06 : 0;
    const digitChance = includeDigits ? 0.03 : 0;

    let out = '';
    let needSpace = false;

    while (out.length < targetChars) {
        // Choose token
        let token = '';
        if (digitChance && cryptoRandInt(1000) < Math.floor(digitChance * 1000)) {
            token = String(cryptoRandInt(9999) + 1);
        } else {
            token = cryptoPick(wordPool) || cryptoPick(wordsFromRandomPool);
        }

        token = sanitizeToken(token);
        if (!token) continue;

        // Respect casing option: no uppercase unless mixCase is enabled.
        if (!mixCase) {
            token = token.toLowerCase();
        } else {
            // MixCase: occasionally upper-case first letter / whole token.
            const rCase = cryptoRandInt(100);
            if (rCase < 20) token = maybeUppercase(token);
            else if (rCase >= 20 && rCase < 24) token = token.toUpperCase();
            else token = token.toLowerCase();
        }

        if (needSpace) out += ' ';
        out += token;
        needSpace = true;

        // Optional punctuation (only comma/dot - no dashes, etc).
        if (includeComma || includePeriod) {
            const r = cryptoRandInt(1000);
            if (includeComma && r < Math.floor(commaChance * 1000)) {
                out += ',';
            } else if (includePeriod && r < Math.floor((commaChance + periodChance) * 1000)) {
                out += '.';
                // after dot we still keep space before next token (needSpace stays true)
            }
        }
    }

    return out.slice(0, targetChars).trim();
}

// Create new room
export async function createRoom(wordCount = 50, theme = 'random', layout = 'ru', options = {}) {
    const roomCode = generateRoomCode();
    const playerId = generatePlayerId();
    
    multiplayerState.roomCode = roomCode;
    multiplayerState.playerId = playerId;
    multiplayerState.isHost = true;
    multiplayerState.playerNumber = 1;
    
    // Generate game text: always random (crypto) + respects punctuation/options.
    // Currently wordCount parameter is used as "target chars".
    const gameText = generateRandomTextByChars(wordCount, layout, theme, options);
    
    multiplayerState.gameText = gameText;
    
    // Create room in database
    const roomRef = ref(database, `rooms/${roomCode}`);
    await set(roomRef, {
        host: playerId,
        players: {
            [playerId]: {
                id: playerId,
                number: 1,
                ready: true,
                progress: 0,
                errors: 0,
                finished: false,
                lastUpdate: serverTimestamp()
            }
        },
        gameText: multiplayerState.gameText,
        started: false,
        matchId: 0,
        createdAt: serverTimestamp()
    });
    
    // Setup disconnect handler
    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    onDisconnect(playerRef).remove();
    
    // Listen for opponent
    listenToRoom(roomCode);
    
    return roomCode;
}

// Join existing room
export async function joinRoom(roomCode) {
    const playerId = generatePlayerId();
    
    // Check if room exists
    const roomRef = ref(database, `rooms/${roomCode}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
        throw new Error('Комната не найдена');
    }
    
    const roomData = snapshot.val();
    const playerCount = Object.keys(roomData.players || {}).length;
    
    if (playerCount >= 2) {
        throw new Error('Комната полная');
    }
    
    if (roomData.started) {
        throw new Error('Игра уже началась');
    }
    
    multiplayerState.roomCode = roomCode;
    multiplayerState.playerId = playerId;
    multiplayerState.isHost = false;
    multiplayerState.playerNumber = 2;
    multiplayerState.gameText = roomData.gameText;
    
    // Add player to room
    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    await set(playerRef, {
        id: playerId,
        number: 2,
        ready: true,
        progress: 0,
        errors: 0,
        finished: false,
        lastUpdate: serverTimestamp()
    });
    
    // Setup disconnect handler
    onDisconnect(playerRef).remove();
    
    // Listen to room
    listenToRoom(roomCode);
    
    return roomCode;
}

// Listen to room updates
function listenToRoom(roomCode) {
    const roomRef = ref(database, `rooms/${roomCode}`);

    // Prevent duplicated listeners if user re-enters multiplayer quickly
    unsubscribeRoomListener();
    multiplayerState.roomListenerUnsub = onValue(roomRef, (snapshot) => {
        // After leaving/resetting state we should ignore any updates.
        if (!multiplayerState.roomCode || !multiplayerState.playerId) return;

        if (!snapshot.exists()) {
            // Room deleted
            if (window.onMultiplayerRoomDeleted) {
                window.onMultiplayerRoomDeleted();
            }
            return;
        }
        
        const roomData = snapshot.val();
        const players = roomData.players || {};
        const playerIds = Object.keys(players);
        
        // Find opponent
        const opponentId = playerIds.find(id => id !== multiplayerState.playerId);

        // Readiness state for rematch sync
        multiplayerState.myReady = players[multiplayerState.playerId]?.ready === true;
        multiplayerState.opponentReady = opponentId ? (players[opponentId]?.ready === true) : false;

        if (opponentId) {
            multiplayerState.opponentId = opponentId;
            multiplayerState.opponentProgress = players[opponentId].progress || 0;
            multiplayerState.opponentErrors = players[opponentId].errors || 0;
            
            // Check if opponent finished
            if (players[opponentId].finished && !multiplayerState.gameEnded) {
                // Stop further opponent-finished callbacks for this client.
                multiplayerState.gameEnded = true;
                if (window.onOpponentFinished) {
                    window.onOpponentFinished();
                }
            }
        }
        
        // If game already started and we no longer have an opponent player in the room,
        // treat it as "opponent left" to avoid leaving the other player in a broken state.
        // This must also work after match end (results modal open), so we intentionally
        // do NOT gate by gameEnded.
        if (roomData.started && multiplayerState.gameStarted && !opponentId) {
            if (!multiplayerState.opponentLeftHandled) {
                multiplayerState.opponentLeftHandled = true;
                multiplayerState.gameEnded = true;
                if (window.onOpponentLeft) {
                    window.onOpponentLeft();
                }
            }
        }
        
        // Update UI with player count
        if (window.onMultiplayerUpdate) {
            window.onMultiplayerUpdate({
                playerCount: playerIds.length,
                started: roomData.started,
                opponentProgress: multiplayerState.opponentProgress,
                opponentErrors: multiplayerState.opponentErrors,
                myReady: multiplayerState.myReady,
                opponentReady: multiplayerState.opponentReady
            });
        }
        
        // Start game when both players ready
        if (multiplayerState.isHost) {
            const allReady = playerIds.length === 2 && playerIds.every(id => players[id] && players[id].ready === true);
            const shouldAutoStart = allReady && !roomData.started;
            if (shouldAutoStart && !multiplayerState.autoStartTimeoutId) {
                // Auto-start after 3 seconds, but we will re-check players inside callback.
                multiplayerState.autoStartTimeoutId = setTimeout(async () => {
                    multiplayerState.autoStartTimeoutId = null;
                    if (!multiplayerState.roomCode || !multiplayerState.playerId) return;

                    const currentSnapshot = await get(roomRef);
                    if (!currentSnapshot.exists()) return;
                    const freshRoom = currentSnapshot.val() || {};
                    if (freshRoom.started) return;

                    const freshPlayers = freshRoom.players || {};
                    const freshPlayerIds = Object.keys(freshPlayers);
                    if (freshPlayerIds.length !== 2) return; // someone left during the delay
                    const freshAllReady = freshPlayerIds.every(id => freshPlayers[id] && freshPlayers[id].ready === true);
                    if (!freshAllReady) return;

                    await update(roomRef, { 
                        started: true,
                        matchId: Date.now()
                    });
                }, 3000);
            } else if ((!shouldAutoStart || roomData.started) && multiplayerState.autoStartTimeoutId) {
                clearAutoStartTimer();
            }
        }
        
        // Notify when game starts (matchId prevents race conditions)
        if (roomData.started) {
            const matchId = roomData.matchId || 0;
            if (matchId && matchId !== multiplayerState.currentMatchId) {
                multiplayerState.currentMatchId = matchId;
                multiplayerState.gameStarted = true;
                if (window.onMultiplayerStart) {
                    window.onMultiplayerStart(multiplayerState.gameText);
                }
            }
        }
    });
}

// Update player progress
export async function updateProgress(progress) {
    if (!multiplayerState.roomCode || !multiplayerState.playerId) return;
    
    multiplayerState.myProgress = progress;
    
    const playerRef = ref(database, `rooms/${multiplayerState.roomCode}/players/${multiplayerState.playerId}`);
    await update(playerRef, {
        progress: progress,
        lastUpdate: serverTimestamp()
    });
}

// Update player errors (wrong key presses)
export async function updateErrors(errors) {
    if (!multiplayerState.roomCode || !multiplayerState.playerId) return;
    multiplayerState.myErrors = errors;
    const playerRef = ref(database, `rooms/${multiplayerState.roomCode}/players/${multiplayerState.playerId}`);
    await update(playerRef, {
        errors: errors,
        lastUpdate: serverTimestamp()
    });
}

// Used to control rematch: when a player is ready for the next match, set ready=true.
export async function setReadyForNext(ready) {
    if (!multiplayerState.roomCode || !multiplayerState.playerId) return;
    const playerRef = ref(database, `rooms/${multiplayerState.roomCode}/players/${multiplayerState.playerId}`);
    await update(playerRef, {
        ready: !!ready,
        lastUpdate: serverTimestamp()
    });
}

// Mark player as finished
export async function finishGame() {
    if (!multiplayerState.roomCode || !multiplayerState.playerId) return;
    
    multiplayerState.gameEnded = true;
    
    const playerRef = ref(database, `rooms/${multiplayerState.roomCode}/players/${multiplayerState.playerId}`);
    await update(playerRef, {
        finished: true,
        progress: 100,
        errors: multiplayerState.myErrors || 0,
        ready: false,
        finishedAt: serverTimestamp()
    });
}

// Leave room
export async function leaveRoom() {
    if (!multiplayerState.roomCode || !multiplayerState.playerId) return;

    clearAutoStartTimer();
    unsubscribeRoomListener();
    
    const playerRef = ref(database, `rooms/${multiplayerState.roomCode}/players/${multiplayerState.playerId}`);
    await remove(playerRef);
    
    // If host, delete entire room
    if (multiplayerState.isHost) {
        const roomRef = ref(database, `rooms/${multiplayerState.roomCode}`);
        await remove(roomRef);
    }
    
    // Reset state
    multiplayerState.roomCode = null;
    multiplayerState.playerId = null;
    multiplayerState.opponentId = null;
    multiplayerState.isHost = false;
    multiplayerState.gameStarted = false;
    multiplayerState.gameEnded = false;
    multiplayerState.opponentLeftHandled = false;
    multiplayerState.myProgress = 0;
    multiplayerState.opponentProgress = 0;
}

// Get current state
export function getMultiplayerState() {
    return { ...multiplayerState };
}

// Check if in multiplayer mode
export function isMultiplayerActive() {
    return multiplayerState.roomCode !== null;
}

// Reset game for rematch (keep room alive)
export async function resetGame() {
    if (!multiplayerState.roomCode || !multiplayerState.playerId) return;
    
    clearAutoStartTimer();
    // Keep room listener active for rematch; just clear auto-start.
    multiplayerState.gameStarted = false;
    multiplayerState.gameEnded = false;
    multiplayerState.opponentLeftHandled = false;
    multiplayerState.myProgress = 0;
    multiplayerState.opponentProgress = 0;
    // currentMatchId stays to prevent duplicate onMultiplayerStart for the same match.
    // It will change when the host sets a new matchId for the next round.
    
    const playerRef = ref(database, `rooms/${multiplayerState.roomCode}/players/${multiplayerState.playerId}`);
    await update(playerRef, {
        progress: 0,
        finished: false,
        ready: true,
        errors: 0
    });

    // Make sure "started" is false when someone left (so the other player can re-invite).
    // For rematch with two players we keep the previous behavior (host controls started=false).
    const roomRef = ref(database, `rooms/${multiplayerState.roomCode}`);
    try {
        const roomSnapshot = await get(roomRef);
        if (roomSnapshot.exists()) {
            const roomData = roomSnapshot.val() || {};
            const players = roomData.players || {};
            const playerCount = Object.keys(players).length;

            if (playerCount < 2 || multiplayerState.isHost) {
                await update(roomRef, { started: false });
            }
        }
    } catch (e) {
        // If we can't read the room, we still keep the old safe path: host resets started=false.
        if (multiplayerState.isHost) {
            await update(roomRef, { started: false });
        }
    }
}

// Export for global access
window.multiplayerModule = {
    createRoom,
    joinRoom,
    updateProgress,
    updateErrors,
    finishGame,
    leaveRoom,
    resetGame,
    setReadyForNext,
    getMultiplayerState,
    isMultiplayerActive,
    generateRandomTextByChars
};
