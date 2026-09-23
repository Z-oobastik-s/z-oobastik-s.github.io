/**
 * Daily Challenge Module
 * Generates a deterministic text from today's date seed.
 * Result is stored separately in localStorage.
 */

(function () {
    var STORAGE_PREFIX = 'zoob_daily_';

    /** Возвращает строку даты 'YYYY-MM-DD'. */
    function todayStr() {
        return new Date().toISOString().slice(0, 10);
    }

    /**
     * Простой линейный конгруэнтный генератор (LCG) на основе seed.
     * Детерминированный - одна и та же дата даёт одинаковые числа.
     */
    function makePrng(seed) {
        var s = seed | 0;
        return function () {
            s = (Math.imul(1664525, s) + 1013904223) | 0;
            return (s >>> 0) / 0x100000000;
        };
    }

    /** Строку даты превращает в числовой seed. */
    function dateSeed(dateStr) {
        var n = 0;
        for (var i = 0; i < dateStr.length; i++) {
            n = (n * 31 + dateStr.charCodeAt(i)) | 0;
        }
        return n;
    }

    /**
     * Перемешивает массив по seed (Fisher-Yates с PRNG).
     */
    function seededShuffle(arr, rand) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(rand() * (i + 1));
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
    }

    /**
     * Возвращает текст дня для заданного языка.
     * Текст фиксирован на сутки и меняется каждый день.
     * @param {string} lang - 'ru' | 'en' | 'ua'
     * @returns {string}
     */
    function getDailyText(lang) {
        var date = todayStr();
        var seed = dateSeed(date + '_' + (lang || 'ru'));
        var rand = makePrng(seed);

        // Берём слова из speedTestWords (доступны глобально)
        var words = [];
        if (typeof speedTestWords !== 'undefined' && speedTestWords[lang]) {
            words = speedTestWords[lang];
        } else if (typeof speedTestWords !== 'undefined' && speedTestWords['ru']) {
            words = speedTestWords['ru'];
        } else {
            words = ['typing', 'speed', 'daily', 'challenge', 'practice', 'keyboard', 'accuracy', 'words', 'test', 'skill'];
        }

        var shuffled = seededShuffle(words, rand);
        // Берём 40 слов → ~200 символов
        var result = shuffled.slice(0, 40).join(' ');
        // Обрезаем до 250 символов, не разрывая слово
        if (result.length > 250) {
            var trimmed = result.slice(0, 250);
            var lastSpace = trimmed.lastIndexOf(' ');
            result = lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed;
        }
        return result;
    }

    /** Проверяет, пройден ли уже сегодняшний челлендж. */
    function isDoneToday() {
        try {
            var stored = localStorage.getItem(STORAGE_PREFIX + todayStr());
            return !!stored;
        } catch (_e) { return false; }
    }

    /** Сохраняет результат сегодняшнего челленджа. */
    function saveDailyResult(result) {
        try {
            var key = STORAGE_PREFIX + todayStr();
            localStorage.setItem(key, JSON.stringify({
                date: todayStr(),
                speed: result.speed || 0,
                accuracy: result.accuracy || 0,
                time: result.time || 0,
                errors: result.errors || 0,
                ts: Date.now()
            }));
        } catch (_e) {}
    }

    /** Возвращает результат сегодняшнего челленджа или null. */
    function getDailyResult() {
        try {
            var raw = localStorage.getItem(STORAGE_PREFIX + todayStr());
            return raw ? JSON.parse(raw) : null;
        } catch (_e) { return null; }
    }

    /** Возвращает секунды до конца текущих суток (UTC+0). */
    function secondsUntilMidnight() {
        var now = new Date();
        var midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
        return Math.max(0, Math.floor((midnight - now) / 1000));
    }

    /** Форматирует секунды в HH:MM:SS. */
    function formatCountdown(secs) {
        var h = Math.floor(secs / 3600);
        var m = Math.floor((secs % 3600) / 60);
        var s = secs % 60;
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    /**
     * Запускает обновление countdown-таймера в элементе с id.
     * @param {string} elId - id элемента для вставки таймера
     * @returns {function} stopFn - вызвать для остановки
     */
    function startCountdownTimer(elId) {
        var el = document.getElementById(elId);
        if (!el) return function () {};
        var timer = setInterval(function () {
            var secs = secondsUntilMidnight();
            el.textContent = formatCountdown(secs);
            if (secs <= 0) clearInterval(timer);
        }, 1000);
        el.textContent = formatCountdown(secondsUntilMidnight());
        return function () { clearInterval(timer); };
    }

    window.dailyChallengeModule = {
        getDailyText: getDailyText,
        isDoneToday: isDoneToday,
        saveDailyResult: saveDailyResult,
        getDailyResult: getDailyResult,
        secondsUntilMidnight: secondsUntilMidnight,
        formatCountdown: formatCountdown,
        startCountdownTimer: startCountdownTimer
    };
})();
