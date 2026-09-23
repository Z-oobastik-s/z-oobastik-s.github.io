/**
 * Линейная сюжетная разблокировка уроков и актов внутри главы (beginner/medium/advanced).
 * Урок N открыт, если пройден урок N-1 в том же треке (уровень + раскладка RU/EN/UA).
 * Уровень «Средний» открывается после всех базовых уроков «Начинающий» на этой раскладке;
 * «Продвинутый» - после всех базовых «Средний». Уроки из магазина не входят в цепочку.
 */
(function (global) {
    'use strict';

    /** Сколько уроков подряд объединяем в один «эпизод» сюжета в списке (3 = один ряд в сетке md:grid-cols-3). */
    var ACT_LESSON_COUNT = 3;

    /** const LESSONS_DATA в lessons-data.js не всегда на window - берём оба источника */
    function lessonsDataRoot() {
        if (global.LESSONS_DATA) return global.LESSONS_DATA;
        if (typeof LESSONS_DATA !== 'undefined') return LESSONS_DATA;
        return null;
    }

    function lessonKey(lesson, levelKey) {
        if (!lesson) return '';
        if (lesson.isShopLesson) return 'shop_lesson_' + lesson.id;
        return 'lesson_' + levelKey + '_' + lesson.id;
    }

    function getCoreOrderedLessons(lessonsForLang) {
        if (!lessonsForLang || !lessonsForLang.length) return [];
        return lessonsForLang.filter(function (l) { return !l.isShopLesson; });
    }

    function isLessonCompleted(statsModule, key) {
        if (!statsModule || !key) return false;
        try {
            var s = statsModule.getLessonStats(key);
            return !!(s && s.completed);
        } catch (_e) {
            return false;
        }
    }

    function findCoreIndex(lesson, levelKey, lessonsForLang) {
        if (!lesson || lesson.isShopLesson) return -1;
        var core = getCoreOrderedLessons(lessonsForLang);
        for (var i = 0; i < core.length; i++) {
            if (core[i].id === lesson.id && core[i].layout === lesson.layout) return i;
        }
        return -1;
    }

    function isLessonUnlockedInCore(statsModule, levelKey, coreOrdered, index) {
        if (index <= 0) return true;
        var prev = coreOrdered[index - 1];
        if (!prev) return true;
        return isLessonCompleted(statsModule, lessonKey(prev, levelKey));
    }

    /**
     * @param {object} statsModule - window.statsModule
     * @param {string} levelKey - beginner | medium | advanced
     * @param {object} lesson - объект урока
     * @param {Array} lessonsForLang - полный список уроков уровня для текущей раскладки (как в showLessonList)
     */
    function isLessonUnlocked(statsModule, levelKey, lesson, lessonsForLang) {
        if (!lesson || lesson.isShopLesson) return true;
        var core = getCoreOrderedLessons(lessonsForLang);
        var idx = findCoreIndex(lesson, levelKey, lessonsForLang);
        if (idx < 0) return true;
        return isLessonUnlockedInCore(statsModule, levelKey, core, idx);
    }

    function isTierUnlocked(statsModule, tier, layout) {
        if (tier === 'beginner') return true;
        var root = lessonsDataRoot();
        if (!root) return false;
        var needTier = tier === 'medium' ? 'beginner' : tier === 'advanced' ? 'medium' : null;
        if (!needTier) return true;
        var data = root[needTier];
        if (!data || !data.lessons) return false;
        var core = data.lessons.filter(function (l) { return l.layout === layout && !l.isShopLesson; });
        if (core.length === 0) return false;
        for (var i = 0; i < core.length; i++) {
            var k = lessonKey(core[i], needTier);
            if (!isLessonCompleted(statsModule, k)) return false;
        }
        return true;
    }

    /** Сколько базовых уроков трека пройдено на раскладке (для UI замка). */
    function getTierCompletion(statsModule, tier, layout) {
        var root = lessonsDataRoot();
        if (!root || !root[tier] || !root[tier].lessons) {
            return { done: 0, total: 0 };
        }
        var core = root[tier].lessons.filter(function (l) {
            return l.layout === layout && !l.isShopLesson;
        });
        var total = core.length;
        var done = 0;
        for (var i = 0; i < core.length; i++) {
            if (isLessonCompleted(statsModule, lessonKey(core[i], tier))) done++;
        }
        return { done: done, total: total };
    }

    function actIndexForCoreIndex(coreIndex) {
        if (coreIndex < 0) return -1;
        return Math.floor(coreIndex / ACT_LESSON_COUNT);
    }

    function sagaBeatKeyForAct(actIndex) {
        var keys = ['sagaBeat0', 'sagaBeat1', 'sagaBeat2', 'sagaBeat3', 'sagaBeat4', 'sagaBeat5'];
        return keys[actIndex % keys.length];
    }

    global.lessonProgressionModule = {
        ACT_LESSON_COUNT: ACT_LESSON_COUNT,
        lessonKey: lessonKey,
        getCoreOrderedLessons: getCoreOrderedLessons,
        findCoreIndex: findCoreIndex,
        isLessonUnlocked: isLessonUnlocked,
        isTierUnlocked: isTierUnlocked,
        getTierCompletion: getTierCompletion,
        actIndexForCoreIndex: actIndexForCoreIndex,
        sagaBeatKeyForAct: sagaBeatKeyForAct
    };
})(typeof window !== 'undefined' ? window : this);
