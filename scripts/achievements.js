/**
 * Achievements system for Zoobastiks typing trainer
 * Displays under progress on home; dim when locked, glow when unlocked; tooltip on hover; click to highlight.
 */

const ACHIEVEMENTS_STORAGE_KEY = 'typeMasterAchievements';
const ACHIEVEMENTS_SELECTED_KEY = 'typeMasterAchievementsSelected';

const ACHIEVEMENTS = [
    { id: 'first_lesson', icon: '🎯', titleRu: 'Первый шаг', titleEn: 'First step', titleUa: 'Перший крок', descRu: 'Пройдите 1 урок', descEn: 'Complete 1 lesson', descUa: 'Пройдіть 1 урок', condition: 'lessons', value: 1 },
    { id: 'lessons_5', icon: '📖', titleRu: 'Читатель', titleEn: 'Reader', titleUa: 'Читач', descRu: 'Пройдите 5 уроков', descEn: 'Complete 5 lessons', descUa: 'Пройдіть 5 уроків', condition: 'lessons', value: 5 },
    { id: 'lessons_10', icon: '📚', titleRu: 'Десяточка', titleEn: 'Ten lessons', titleUa: 'Десятка', descRu: 'Пройдите 10 уроков', descEn: 'Complete 10 lessons', descUa: 'Пройдіть 10 уроків', condition: 'lessons', value: 10 },
    { id: 'lessons_25', icon: '🌟', titleRu: 'Звёздочка', titleEn: 'Star', titleUa: 'Зірочка', descRu: 'Пройдите 25 уроков', descEn: 'Complete 25 lessons', descUa: 'Пройдіть 25 уроків', condition: 'lessons', value: 25 },
    { id: 'lessons_50', icon: '🏆', titleRu: 'Полтинник', titleEn: 'Fifty', titleUa: 'П\'ятдесят', descRu: 'Пройдите 50 уроков', descEn: 'Complete 50 lessons', descUa: 'Пройдіть 50 уроків', condition: 'lessons', value: 50 },
    { id: 'speed_100', icon: '🐢', titleRu: 'Старт', titleEn: 'Start', titleUa: 'Старт', descRu: 'Достигните 100 зн/мин', descEn: 'Reach 100 CPM', descUa: 'Досягніть 100 зн/хв', condition: 'speed', value: 100 },
    { id: 'speed_150', icon: '🌱', titleRu: 'Прогресс', titleEn: 'Progress', titleUa: 'Прогрес', descRu: 'Достигните 150 зн/мин', descEn: 'Reach 150 CPM', descUa: 'Досягніть 150 зн/хв', condition: 'speed', value: 150 },
    { id: 'speed_200', icon: '⚡', titleRu: 'Разгон', titleEn: 'Accelerate', titleUa: 'Розгін', descRu: 'Достигните 200 зн/мин', descEn: 'Reach 200 CPM', descUa: 'Досягніть 200 зн/хв', condition: 'speed', value: 200 },
    { id: 'speed_250', icon: '🔥', titleRu: 'Огонь', titleEn: 'On fire', titleUa: 'Вогонь', descRu: 'Достигните 250 зн/мин', descEn: 'Reach 250 CPM', descUa: 'Досягніть 250 зн/хв', condition: 'speed', value: 250 },
    { id: 'speed_300', icon: '💨', titleRu: 'Быстрые пальцы', titleEn: 'Fast fingers', titleUa: 'Швидкі пальці', descRu: 'Достигните 300 зн/мин', descEn: 'Reach 300 CPM', descUa: 'Досягніть 300 зн/хв', condition: 'speed', value: 300 },
    { id: 'speed_350', icon: '👑', titleRu: 'Король клавиатуры', titleEn: 'Keyboard king', titleUa: 'Король клавіатури', descRu: 'Достигните 350 зн/мин', descEn: 'Reach 350 CPM', descUa: 'Досягніть 350 зн/хв', condition: 'speed', value: 350 },
    { id: 'words_1000', icon: '📝', titleRu: 'Тысяча слов', titleEn: 'Thousand words', titleUa: 'Тисяча слів', descRu: 'Напечатайте 1000 слов', descEn: 'Type 1000 words', descUa: 'Надрукуйте 1000 слів', condition: 'words', value: 1000 },
    { id: 'words_5000', icon: '📄', titleRu: 'Писатель', titleEn: 'Writer', titleUa: 'Письменник', descRu: 'Напечатайте 5000 слов', descEn: 'Type 5000 words', descUa: 'Надрукуйте 5000 слів', condition: 'words', value: 5000 },
    { id: 'words_10000', icon: '📖', titleRu: 'Книжник', titleEn: 'Bookworm', titleUa: 'Книжник', descRu: 'Напечатайте 10000 слов', descEn: 'Type 10000 words', descUa: 'Надрукуйте 10000 слів', condition: 'words', value: 10000 },
    { id: 'sessions_5', icon: '🌱', titleRu: 'Регулярность', titleEn: 'Regular', titleUa: 'Регулярність', descRu: 'Завершите 5 тренировок', descEn: 'Complete 5 sessions', descUa: 'Завершіть 5 тренувань', condition: 'sessions', value: 5 },
    { id: 'sessions_10', icon: '🔥', titleRu: 'В ритме', titleEn: 'In the zone', titleUa: 'В ритмі', descRu: 'Завершите 10 тренировок', descEn: 'Complete 10 sessions', descUa: 'Завершіть 10 тренувань', condition: 'sessions', value: 10 },
    { id: 'sessions_25', icon: '⭐', titleRu: 'Привычка', titleEn: 'Habit', titleUa: 'Звичка', descRu: 'Завершите 25 тренировок', descEn: 'Complete 25 sessions', descUa: 'Завершіть 25 тренувань', condition: 'sessions', value: 25 },
    { id: 'sessions_50', icon: '💪', titleRu: 'Мастер практики', titleEn: 'Practice master', titleUa: 'Майстер практики', descRu: 'Завершите 50 тренировок', descEn: 'Complete 50 sessions', descUa: 'Завершіть 50 тренувань', condition: 'sessions', value: 50 },
    { id: 'time_30', icon: '⏱️', titleRu: 'Полчаса в деле', titleEn: 'Half an hour', titleUa: 'Півгодини в справі', descRu: 'Потратьте 30 минут на тренировки', descEn: 'Spend 30 minutes training', descUa: 'Витратьте 30 хвилин на тренування', condition: 'time', value: 30 * 60 },
    { id: 'time_60', icon: '🕐', titleRu: 'Час скорости', titleEn: 'Hour of speed', titleUa: 'Година швидкості', descRu: 'Потратьте 1 час на тренировки', descEn: 'Spend 1 hour training', descUa: 'Витратьте 1 годину на тренування', condition: 'time', value: 60 * 60 },
    { id: 'time_300', icon: '🏅', titleRu: 'Пять часов', titleEn: 'Five hours', titleUa: 'П\'ять годин', descRu: 'Потратьте 5 часов на тренировки', descEn: 'Spend 5 hours training', descUa: 'Витратьте 5 годин на тренування', condition: 'time', value: 300 * 60 },
    { id: 'accuracy_80', icon: '🎯', titleRu: 'Точность 80%', titleEn: '80% accuracy', titleUa: 'Точність 80%', descRu: 'Средняя точность не ниже 80%', descEn: 'Average accuracy at least 80%', descUa: 'Середня точність не нижче 80%', condition: 'accuracy', value: 80 },
    { id: 'accuracy_90', icon: '✨', titleRu: 'Точность 90%', titleEn: '90% accuracy', titleUa: 'Точність 90%', descRu: 'Средняя точность не ниже 90%', descEn: 'Average accuracy at least 90%', descUa: 'Середня точність не нижче 90%', condition: 'accuracy', value: 90 },
    { id: 'accuracy_95', icon: '💫', titleRu: 'Снайпер', titleEn: 'Sniper', titleUa: 'Снайпер', descRu: 'Средняя точность не ниже 95%', descEn: 'Average accuracy at least 95%', descUa: 'Середня точність не нижче 95%', condition: 'accuracy', value: 95 }
];

function getLang() {
    var l;
    if (typeof app !== 'undefined' && app.lang) l = app.lang;
    else l = (localStorage.getItem('lang') || 'ru').toLowerCase();
    if (l === 'uk') l = 'ua';
    return l;
}

function loadUnlocked() {
    try {
        const raw = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
}

function saveUnlocked(ids) {
    try {
        localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {}
}

function getSelectedId() {
    return localStorage.getItem(ACHIEVEMENTS_SELECTED_KEY) || null;
}

function setSelectedId(id) {
    if (id) localStorage.setItem(ACHIEVEMENTS_SELECTED_KEY, id);
    else localStorage.removeItem(ACHIEVEMENTS_SELECTED_KEY);
}

function getStatsForCheck() {
    if (!window.statsModule) return null;
    const d = window.statsModule.data;
    const uniqueLessons = window.statsModule.getUniqueLessonsCount ? window.statsModule.getUniqueLessonsCount() : (d.lessonStats ? Object.keys(d.lessonStats).length : 0);
    const totalWords = window.statsModule.getTotalWords ? window.statsModule.getTotalWords() : Math.floor((d.totalCharsTyped || 0) / 5);
    return {
        lessons: uniqueLessons,
        speed: d.bestSpeed || 0,
        words: totalWords,
        sessions: d.totalSessions || 0,
        time: d.totalTime || 0,
        accuracy: d.averageAccuracy || 0
    };
}

function checkCondition(ach, stats) {
    if (!stats) return false;
    switch (ach.condition) {
        case 'lessons': return stats.lessons >= ach.value;
        case 'speed': return stats.speed >= ach.value;
        case 'words': return stats.words >= ach.value;
        case 'sessions': return stats.sessions >= ach.value;
        case 'time': return stats.time >= ach.value;
        case 'accuracy': return stats.accuracy >= ach.value;
        default: return false;
    }
}

function checkAndUnlock() {
    const unlocked = loadUnlocked();
    const stats = getStatsForCheck();
    const newlyUnlocked = [];
    ACHIEVEMENTS.forEach(function (ach) {
        if (unlocked.indexOf(ach.id) !== -1) return;
        if (checkCondition(ach, stats)) {
            unlocked.push(ach.id);
            newlyUnlocked.push(ach);
        }
    });
    if (newlyUnlocked.length) saveUnlocked(unlocked);
    return newlyUnlocked;
}

/** За одну сессию показываем тост только за высший новый порог по скорости и по точности (остальные - все). */
function pickToastsForSession(newlyUnlocked) {
    if (!newlyUnlocked.length) return [];
    const bySpeed = newlyUnlocked.filter(function (a) { return a.condition === 'speed'; });
    const byAccuracy = newlyUnlocked.filter(function (a) { return a.condition === 'accuracy'; });
    const rest = newlyUnlocked.filter(function (a) { return a.condition !== 'speed' && a.condition !== 'accuracy'; });
    var out = rest.slice();
    if (bySpeed.length) {
        bySpeed.sort(function (a, b) { return (b.value - a.value); });
        out.push(bySpeed[0]);
    }
    if (byAccuracy.length) {
        byAccuracy.sort(function (a, b) { return (b.value - a.value); });
        out.push(byAccuracy[0]);
    }
    return out;
}

function showAchievementToast(ach) {
    const lang = getLang();
    const title = lang === 'en' ? ach.titleEn : (lang === 'ua' ? ach.titleUa : ach.titleRu);
    const msg = lang === 'en' ? 'Achievement unlocked!' : (lang === 'ua' ? 'Досягнення розблоковано!' : 'Достижение получено!');
    if (typeof showToast === 'function') {
        showToast({ kind: 'achievement', title: title, message: msg, icon: ach.icon || '' });
    } else {
        try { console.log('[Achievement]', title, ach.icon); } catch (e) {}
    }
}

function render(container) {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return;
    const unlocked = loadUnlocked();
    const selectedId = getSelectedId();
    const lang = getLang();
    el.innerHTML = '';
    const maxPerRow = 16;
    const useLabels = ACHIEVEMENTS.length <= maxPerRow;
    const total = ACHIEVEMENTS.length;
    const baseSize = total <= maxPerRow ? 48 : 40;
    ACHIEVEMENTS.forEach(function (ach, index) {
        const isUnlocked = unlocked.indexOf(ach.id) !== -1;
        const isSelected = selectedId === ach.id;
        const title = lang === 'en' ? ach.titleEn : (lang === 'ua' ? ach.titleUa : ach.titleRu);
        const desc = lang === 'en' ? ach.descEn : (lang === 'ua' ? ach.descUa : ach.descRu);
        const coinsHint = lang === 'en' ? '(+50 coins)' : lang === 'ua' ? '(+50 монет)' : '(+50 монет)';
        const tip = isUnlocked ? title + ' - ' + desc + ' ' + coinsHint : desc;
        const animIndex = index % 12;
        const div = document.createElement('div');
        div.className = 'achievement-icon-wrap' + (isUnlocked ? ' achievement-unlocked ach-hover-' + animIndex : ' achievement-locked') + (isSelected ? ' achievement-selected' : '');
        div.title = tip;
        div.setAttribute('data-achievement-id', ach.id);
        div.setAttribute('data-tooltip', tip);
        var shortTitle = title.length > 10 ? title.slice(0, 9) + '…' : title;
        div.style.width = baseSize + 'px';
        div.style.minWidth = baseSize + 'px';
        div.style.height = baseSize + 'px';
        if (useLabels) {
            div.innerHTML = '<span class="achievement-icon">' + ach.icon + '</span><span class="achievement-label">' + shortTitle + '</span>';
        } else {
            div.innerHTML = '<span class="achievement-icon">' + ach.icon + '</span>';
        }
        div.addEventListener('click', function () {
            const newSel = isSelected ? null : ach.id;
            setSelectedId(newSel);
            render('achievementsBlock');
        });
        (function (wrap, tipText) {
            wrap.addEventListener('mouseenter', function () {
                var t = document.getElementById('achievementTooltip');
                if (!t) { t = document.createElement('div'); t.id = 'achievementTooltip'; t.className = 'achievement-tooltip'; document.body.appendChild(t); }
                t.textContent = tipText;
                t.style.left = '0';
                t.style.top = '0';
                t.classList.remove('hidden');
                var leave = function () { t.classList.add('hidden'); wrap.removeEventListener('mouseleave', leave); };
                wrap.addEventListener('mouseleave', leave);
                requestAnimationFrame(function () {
                    if (t.classList.contains('hidden')) return;
                    t.style.position = 'fixed';
                    var r = wrap.getBoundingClientRect();
                    var gap = 8;
                    var top = r.bottom + gap;
                    var left = r.left + (r.width / 2);
                    t.style.left = left + 'px';
                    t.style.top = top + 'px';
                    t.style.transform = 'translateX(-50%)';
                    t.style.maxWidth = '280px';
                });
                requestAnimationFrame(function () {
                    if (t.classList.contains('hidden')) return;
                    var tRect = t.getBoundingClientRect();
                    var r = wrap.getBoundingClientRect();
                    var gap = 8;
                    var leftCenter = parseFloat(t.style.left, 10);
                    var leftEdge = leftCenter - tRect.width / 2;
                    if (tRect.right > window.innerWidth - 8) leftEdge = window.innerWidth - tRect.width - 8;
                    if (tRect.left < 8) leftEdge = 8;
                    t.style.left = leftEdge + 'px';
                    t.style.transform = '';
                    var top = parseFloat(t.style.top, 10);
                    if (top + tRect.height > window.innerHeight - 8) top = r.top - tRect.height - gap;
                    if (top < 8) top = 8;
                    t.style.top = top + 'px';
                });
            });
        })(div, tip);
        el.appendChild(div);
    });
    if (!useLabels) {
        el.classList.add('wrap');
    } else {
        el.classList.remove('wrap');
    }
}

const COINS_PER_ACHIEVEMENT = 50;

/** Возвращает массив только что разблокированных достижений (для начисления монет в main.js). */
function checkAndNotify() {
    const newly = checkAndUnlock();
    const toShow = pickToastsForSession(newly);
    toShow.forEach(function (ach) {
        showAchievementToast(ach);
    });
    var block = document.getElementById('achievementsBlock');
    if (block) render('achievementsBlock');
    return newly;
}

// Export
window.achievementsModule = {
    checkAndNotify: checkAndNotify,
    checkAndUnlock: checkAndUnlock,
    loadUnlocked: loadUnlocked,
    render: render,
    getAchievements: function () { return ACHIEVEMENTS; },
    COINS_PER_ACHIEVEMENT: COINS_PER_ACHIEVEMENT
};
