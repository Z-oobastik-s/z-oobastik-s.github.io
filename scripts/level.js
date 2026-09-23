/**
 * Player level and XP system - игровая прокачка
 */

const PLAYER_XP_KEY = 'zoobastiks_player_xp';

// XP required (total from 0) to reach each level. Level 1 = 0, level 2 = 100, ...
function getXPThreshold(level) {
    if (level <= 1) return 0;
    var xp = 0;
    for (var i = 1; i < level; i++) {
        xp += 80 + Math.floor(i * 22);
    }
    return xp;
}

function getLevelInfo(totalXP) {
    var xp = Math.max(0, Math.floor(totalXP));
    var level = 1;
    while (getXPThreshold(level + 1) <= xp) level++;
    var xpForCurrent = getXPThreshold(level);
    var xpForNext = getXPThreshold(level + 1);
    var xpInLevel = xp - xpForCurrent;
    var xpToNext = xpForNext - xpForCurrent;
    var tierName = getTierName(level);
    return {
        level: level,
        tierName: tierName,
        totalXP: xp,
        xpInLevel: xpInLevel,
        xpToNext: xpToNext,
        progressPct: xpToNext > 0 ? Math.round((xpInLevel / xpToNext) * 100) : 100
    };
}

// Уникальное название ранга для каждого уровня (1–150), без повторений в пределах списка
var TIER_NAMES_RU = [
    'Новичок', 'Юный печатник', 'Начинающий', 'Первые шаги', 'Уверенный старт',
    'Ученик', 'Грамотей', 'Успевающий', 'Старательный', 'Отличник',
    'Практик', 'Настойчивый', 'Трудяга', 'Опытный', 'Быстрые пальцы',
    'Знаток', 'Грамотей-про', 'Следопыт', 'Точный удар', 'Скоростник',
    'Мастер', 'Виртуоз клавиш', 'Меткий', 'Неудержимый', 'Чемпион ряда',
    'Эксперт', 'Ас набора', 'Молния', 'Безошибочный', 'Эталон',
    'Виртуоз', 'Снайпер букв', 'Турбо-печатник', 'Живые пальцы', 'Гроссмейстер',
    'Легенда', 'Титан клавиатуры', 'Небожитель', 'Метр набора', 'Абсолют',
    'Титан', 'Повелитель клавиш', 'Король скорости', 'Идеал', 'Великий',
    'Бог клавиатуры', 'Создатель текста', 'Маг клавиш', 'Звезда набора', 'Вершина',
    'Разрушитель ряда', 'Властелин пробела', 'Хроно-печатник', 'Синхрон пальцев', 'Поток сознания',
    'Архитектор строк', 'Код клавиш', 'Сверхновая набора', 'Резонанс раскладки', 'Вихрь букв',
    'Космический набор', 'Звёздный ряд', 'Туманность текста', 'Орбита скорости', 'Солнечный ветер',
    'Квазар CPM', 'Пульсар точности', 'Тьма между рядами', 'Скиталец Shift', 'Страж Enter',
    'Молот табуляции', 'Клинок Backspace', 'Страж CapsLock', 'Теневой Alt', 'Король Tab',
    'Дракон Ctrl', 'Феникс Пробел', 'Страж Meta', 'Проводник Esc', 'Хранитель F-ряда',
    'Измерение Unicode', 'Призрак UTF-8', 'Алхимик раскладки', 'Стек ума', 'Рекурсия скилла',
    'Квантовый набор', 'Сингулярность скорости', 'Тёмная материя текста', 'Большой ритм', 'Мультивселенная руки',
    'Клинок времени', 'Гиперпоток', 'Варп-набор', 'Импульс движка', 'Сверхновая ранга',
    'Элита вечности', 'Властелин консоли', 'Повелитель буфера', 'Архимаг ввода', 'Верховный скрипт',
    'Судьба раскладки', 'Мета-типист', 'Омега скорости', 'Альфа точности', 'Миф клавиш',
    'Бесконечность Enter', 'Абсолют нуля ошибок', 'Тысячерукий набор', 'Мириада символов', 'Буйство строк',
    'Пульс галактики', 'Король латентности', 'Титан буфера', 'Вихрь автоповтора', 'Щит фокуса',
    'Копьё ритма', 'Молот метронома', 'Корона дисциплины', 'Печать мастера', 'Сердце набора',
    'Око над клавишами', 'Коготь раскладки', 'Крыло скорости', 'Шторм символов', 'Рог дисциплины',
    'Клык точности', 'Перо быстроты', 'Скакун ряда', 'Шлем безошибочности', 'Крыло софта',
    'Сияние CPM', 'Гул механики', 'Звон Enter', 'Бахрома Shift', 'Молния Alt',
    'Рёв Ctrl', 'Шёпот пробела', 'Скалолаз Tab', 'Танец пальцев', 'Рубеж 100',
    'Рубеж 110', 'Рубеж 120', 'Рубеж 130', 'Рубеж 140', 'Корона Zoobastiks'
];
var TIER_NAMES_EN = [
    'Rookie', 'Young Typer', 'Beginner', 'First Steps', 'Confident Start',
    'Apprentice', 'Literate', 'Ace Student', 'Diligent', 'Honor Roll',
    'Practitioner', 'Persistent', 'Hard Worker', 'Experienced', 'Quick Fingers',
    'Expert', 'Pro Literate', 'Trailblazer', 'Precise Strike', 'Speedster',
    'Master', 'Key Virtuoso', 'Sharp', 'Unstoppable', 'Row Champion',
    'Ace', 'Typing Ace', 'Lightning', 'Flawless', 'Benchmark',
    'Virtuoso', 'Letter Sniper', 'Turbo Typer', 'Live Fingers', 'Grandmaster',
    'Legend', 'Keyboard Titan', 'Immortal', 'Typing Master', 'Absolute',
    'Titan', 'Key Lord', 'Speed King', 'Ideal', 'The Great',
    'Keyboard God', 'Text Creator', 'Key Mage', 'Typing Star', 'The Peak',
    'Row Breaker', 'Space Sovereign', 'Chrono Typer', 'Finger Sync', 'Mindstream',
    'Line Architect', 'Key Alchemist', 'Supernova Typist', 'Layout Resonance', 'Letter Maelstrom',
    'Cosmic Typer', 'Star Row', 'Text Nebula', 'Speed Orbit', 'Solar Gale',
    'CPM Quasar', 'Accuracy Pulsar', 'Void Between Rows', 'Shift Wanderer', 'Enter Warden',
    'Tab Maul', 'Backspace Blade', 'Caps Guardian', 'Shadow Alt', 'Tab Monarch',
    'Ctrl Dragon', 'Space Phoenix', 'Meta Warden', 'Esc Guide', 'F-Row Keeper',
    'Unicode Plane', 'UTF-8 Wraith', 'Layout Alchemist', 'Mind Stack', 'Skill Recursion',
    'Quantum Typer', 'Speed Singularity', 'Dark Matter Text', 'Big Rhythm', 'Multiverse Hand',
    'Time Edge', 'Hyperflow', 'Warp Typist', 'Engine Surge', 'Rank Supernova',
    'Eternity Elite', 'Console Overlord', 'Buffer Tyrant', 'Input Archmage', 'Supreme Script',
    'Layout Fate', 'Meta Typist', 'Omega Speed', 'Alpha Precision', 'Key Myth',
    'Enter Infinity', 'Zero-Error Absolute', 'Thousand-Hand Typer', 'Myriad Glyphs', 'Line Rampage',
    'Galaxy Pulse', 'Latency King', 'Buffer Titan', 'Repeat Storm', 'Focus Aegis',
    'Rhythm Spear', 'Metronome Hammer', 'Discipline Crown', 'Master Seal', 'Typing Heart',
    'Key Eye', 'Layout Fang', 'Speed Wing', 'Symbol Storm', 'Discipline Horn',
    'Precision Fang', 'Velocity Quill', 'Row Stallion', 'Flawless Helm', 'Soft Wing',
    'CPM Glow', 'Mechanic Hum', 'Enter Chime', 'Shift Fringe', 'Alt Lightning',
    'Ctrl Roar', 'Space Whisper', 'Tab Climber', 'Finger Dance', 'Tier 100',
    'Tier 110', 'Tier 120', 'Tier 130', 'Tier 140', 'Zoobastiks Crown'
];
var TIER_NAMES_UA = [
    'Новачок', 'Юний друкар', 'Початківець', 'Перші кроки', 'Впевнений старт',
    'Учень', 'Грамотій', 'Успішний', 'Старанний', 'Відмінник',
    'Практик', 'Наполегливий', 'Трудар', 'Досвідчений', 'Швидкі пальці',
    'Знавець', 'Грамотій-про', 'Слідопит', 'Точний удар', 'Швидкісник',
    'Майстер', 'Віртуоз клавіш', 'Влучний', 'Незупинний', 'Чемпіон ряду',
    'Експерт', 'Ас набору', 'Блискавка', 'Безпомилковий', 'Еталон',
    'Віртуоз', 'Снайпер літер', 'Турбо-друкар', 'Живі пальці', 'Гросмейстер',
    'Легенда', 'Титан клавіатури', 'Безсмертний', 'Метр набору', 'Абсолют',
    'Титан', 'Володар клавіш', 'Король швидкості', 'Ідеал', 'Великий',
    'Бог клавіатури', 'Творець тексту', 'Маг клавіш', 'Зірка набору', 'Вершина',
    'Руйнівник ряду', 'Володар пробілу', 'Хроно-друкар', 'Синхрон пальців', 'Потік думки',
    'Архітектор рядків', 'Код клавіш', 'Наднова набору', 'Резонанс розкладки', 'Вихор літер',
    'Космічний набір', 'Зоряний ряд', 'Туманність тексту', 'Орбіта швидкості', 'Сонячний вітер',
    'Квазар CPM', 'Пульсар точності', 'Темрява між рядами', 'Мандрівник Shift', 'Вартовий Enter',
    'Молот табуляції', 'Лезо Backspace', 'Вартовий CapsLock', 'Тіньовий Alt', 'Король Tab',
    'Дракон Ctrl', 'Фенікс Пробіл', 'Вартовий Meta', 'Провідник Esc', 'Хранитель F-ряду',
    'Вимір Unicode', 'Привид UTF-8', 'Алхімік розкладки', 'Стек розуму', 'Рекурсія скілу',
    'Квантовий набір', 'Сингулярність швидкості', 'Темна матерія тексту', 'Великий ритм', 'Мультивсесвіт руки',
    'Лезо часу', 'Гіперпотік', 'Варп-набір', 'Імпульс двигуна', 'Наднова рангу',
    'Еліта вічності', 'Володар консолі', 'Повелитель буфера', 'Архімаг вводу', 'Верховний скрипт',
    'Доля розкладки', 'Мета-типіст', 'Омега швидкості', 'Альфа точності', 'Міф клавіш',
    'Нескінченність Enter', 'Абсолют нульових помилок', 'Тисяцерукий набір', 'Міріада символів', 'Негода рядків',
    'Пульс галактики', 'Король латентності', 'Титан буфера', 'Вихор автоповтору', 'Щит фокусу',
    'Спис ритму', 'Молот метронома', 'Корона дисципліни', 'Печатка майстра', 'Серце набору',
    'Око над клавішами', 'Кіготь розкладки', 'Крило швидкості', 'Буря символів', 'Ріг дисципліни',
    'Ікло точності', 'Перо швидкості', 'Скакун ряду', 'Шолом безпомилковості', 'Крило софту',
    'Сяйво CPM', 'Гул механіки', 'Дзвін Enter', 'Бахрома Shift', 'Блискавка Alt',
    'Рик Ctrl', 'Шепіт пробілу', 'Скелелаз Tab', 'Танець пальців', 'Рубіж 100',
    'Рубіж 110', 'Рубіж 120', 'Рубіж 130', 'Рубіж 140', 'Корона Zoobastiks'
];

function getTierNameForLang(level, lang) {
    var maxLen = TIER_NAMES_RU.length;
    var capped = Math.min(level, maxLen);
    var index = Math.max(0, Math.min(capped - 1, maxLen - 1));
    var base;
    if (lang === 'en') base = TIER_NAMES_EN[index] || TIER_NAMES_EN[TIER_NAMES_EN.length - 1];
    else if (lang === 'ua') base = TIER_NAMES_UA[index] || TIER_NAMES_UA[TIER_NAMES_UA.length - 1];
    else base = TIER_NAMES_RU[index] || TIER_NAMES_RU[TIER_NAMES_RU.length - 1];
    if (level > maxLen) return base + ' +' + (level - maxLen);
    return base;
}

function getTierName(level) {
    var l = (typeof app !== 'undefined' && app.lang === 'en') ? 'en' : (typeof app !== 'undefined' && app.lang === 'ua') ? 'ua' : 'ru';
    return getTierNameForLang(level, l);
}

function getPlayerXP() {
    try {
        var stored = localStorage.getItem(PLAYER_XP_KEY);
        if (stored !== null) return Math.max(0, parseInt(stored, 10));
    } catch (e) {}
    return 0;
}

function setPlayerXP(totalXP) {
    try {
        localStorage.setItem(PLAYER_XP_KEY, String(Math.max(0, Math.floor(totalXP))));
    } catch (e) {}
}

function getMaxTierLevel() {
    return TIER_NAMES_RU.length;
}

/** Монеты за один достигнутый уровень L (L >= 2). */
function bonusCoinsForReachedLevel(level) {
    if (level <= 1) return 0;
    var c = 10 + Math.floor(level * 1.5);
    if (level % 5 === 0) c += 20;
    if (level % 10 === 0) c += 40;
    if (level >= 51) c += 15 + Math.floor((level - 50) * 0.5);
    return c;
}

/** Сумма монет за все уровни (fromLevel+1 … toLevel). */
function getLevelUpBonusCoins(fromLevel, toLevel) {
    var sum = 0;
    var a = Math.floor(fromLevel);
    var b = Math.floor(toLevel);
    if (b <= a) return 0;
    for (var L = a + 1; L <= b; L++) {
        sum += bonusCoinsForReachedLevel(L);
    }
    return sum;
}

function addPlayerXP(amount) {
    var current = getPlayerXP();
    var beforeLevel = getLevelInfo(current).level;
    var newTotal = current + Math.max(0, Math.floor(amount));
    setPlayerXP(newTotal);
    var after = getLevelInfo(newTotal);
    var leveledUp = after.level > beforeLevel;
    return {
        totalXP: newTotal,
        leveledUp: leveledUp,
        newLevel: after.level,
        fromLevel: beforeLevel,
        levelsGained: after.level - beforeLevel,
        info: after
    };
}

/**
 * Начисление XP за сессию: режим + точность + скорость
 */
function calculateSessionXP(sessionData) {
    var base = 10;
    if (sessionData.mode === 'lesson') base += 15;
    else if (sessionData.mode === 'speedtest') base += 20;
    else if (sessionData.mode === 'free') base += 8;
    else if (sessionData.mode === 'replay-errors') base += 10; // короткий дриль после сессии
    else if (sessionData.mode === 'multiplayer-bot') base += 14;
    else base += 5;
    var acc = sessionData.accuracy || 0;
    var speed = sessionData.speed || 0;
    var accuracyBonus = Math.floor(acc / 5);
    var speedBonus = Math.min(25, Math.floor(speed / 15));
    return base + accuracyBonus + speedBonus;
}

window.levelModule = {
    getLevelInfo: getLevelInfo,
    getPlayerXP: getPlayerXP,
    setPlayerXP: setPlayerXP,
    addPlayerXP: addPlayerXP,
    calculateSessionXP: calculateSessionXP,
    getTierName: getTierName,
    getTierNameForLang: getTierNameForLang,
    getXPThreshold: getXPThreshold,
    getMaxTierLevel: getMaxTierLevel,
    getLevelUpBonusCoins: getLevelUpBonusCoins,
    bonusCoinsForReachedLevel: bonusCoinsForReachedLevel
};

