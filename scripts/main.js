/**
 * TypeMaster - Main Application Logic
 * Typing trainer with lessons, free mode, and speed test
 */

// Иконка валюты - картинка монеты (money.png)
var COIN_ICON_IMG = '<img src="assets/images/money.png" alt="" class="coin-icon-img inline-block flex-shrink-0" width="20" height="20" style="vertical-align: middle;">';

// Global state
const app = {
    currentMode: 'home', // home, lessons, practice
    currentLayout: 'ru',
    currentLesson: null,
    currentText: '',
    currentPosition: 0,
    startTime: null,
    endTime: null,
    isPaused: false,
    errors: 0,
    myReady: false,
    opponentReady: false,
    opponentErrors: 0,
    totalChars: 0,
    soundEnabled: true,
    bgMusicEnabled: false,
    animationsEnabled: true,
    theme: 'dark',
    lang: 'ru',
    timerInterval: null,
    speedTestDuration: 60,
    speedTestWords: [],
    // Performance optimizations
    statsUpdatePending: false,
    lastStatsUpdate: 0,
    cachedDOM: {},
    animationFrameId: null,
    pendingLevelUp: null,
    pendingLevelUpRewardCoins: 0,
    /** После модалки level-up: 'repeat' = снова запустить раунд (без exitPractice). */
    _afterLevelUpAction: null,
    totalLessonPauseDuration: 0,
    _pauseStartAt: null,
    botBattleActive: false,
    lastMatchWasBot: false,
    botOpponentName: '',
    /** После урока: ключ пройденного урока - проскроллить список к следующему доступному */
    _pendingLessonListScrollFromKey: null
};
window.app = app;

// Streak (серия дней) + «заморозка»: 1 раз за календарную неделю можно не сбросить серию при пропуске ровно одного дня
const STREAK_KEY = 'zoobastiks_streak';
/** Фильтр списка уроков: all | short | digits */
var lessonListFilter = 'all';

function streakDateStr(d) {
    d = d || new Date();
    return d.toISOString().slice(0, 10);
}
function calendarDaysBetween(isoFrom, isoTo) {
    if (!isoFrom || !isoTo) return 999;
    var a = new Date(isoFrom + 'T12:00:00').getTime();
    var b = new Date(isoTo + 'T12:00:00').getTime();
    return Math.round((b - a) / 86400000);
}
/** Идентификатор ISO-недели для лимита заморозок (1 раз в неделю) */
function streakWeekId(d) {
    d = d ? new Date(d.getTime()) : new Date();
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dayNum = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((t - yearStart) / 86400000) + 1) / 7);
    return t.getUTCFullYear() + '-W' + weekNo;
}
function getStreak() {
    try {
        var raw = localStorage.getItem(STREAK_KEY);
        if (!raw) return 0;
        var data = JSON.parse(raw);
        var last = data.lastDate;
        var count = data.count || 0;
        var today = streakDateStr();
        var yesterday = streakDateStr(new Date(Date.now() - 86400000));
        if (last === today) return count;
        if (last === yesterday) return count;
        return 0;
    } catch (_) { return 0; }
}
function updateStreak() {
    var today = streakDateStr();
    var data;
    try {
        var raw = localStorage.getItem(STREAK_KEY);
        data = raw ? JSON.parse(raw) : { lastDate: '', count: 0 };
    } catch (_) {
        data = { lastDate: '', count: 0 };
    }
    if (data.lastDate === today) return;

    var weekId = streakWeekId(new Date());
    var gap = data.lastDate ? calendarDaysBetween(data.lastDate, today) : 999;

    if (!data.lastDate) {
        data.count = 1;
    } else if (gap === 1) {
        data.count = (data.count || 0) + 1;
    } else if (gap === 2 && data.freezeWeekUsed !== weekId) {
        data.count = (data.count || 0) + 1;
        data.freezeWeekUsed = weekId;
    } else {
        data.count = 1;
    }
    data.lastDate = today;
    try {
        localStorage.setItem(STREAK_KEY, JSON.stringify(data));
    } catch (_) {}
}

// DOM Cache - кэшируем часто используемые элементы
const DOM = {
    get: function(id) {
        if (!this.cache) this.cache = {};
        if (!this.cache[id]) {
            this.cache[id] = document.getElementById(id);
        }
        return this.cache[id];
    },
    clear: function() {
        this.cache = {};
    }
};

// Throttle: fires immediately on first call, then at most once per `limit` ms.
// A trailing call is always scheduled so the last invocation never gets silently dropped.
function throttle(func, limit) {
    let lastCall = 0;
    let trailingTimer = null;
    return function() {
        const now = Date.now();
        const remaining = limit - (now - lastCall);
        const args = arguments;
        const ctx = this;
        if (remaining <= 0) {
            if (trailingTimer) { clearTimeout(trailingTimer); trailingTimer = null; }
            lastCall = now;
            func.apply(ctx, args);
        } else {
            clearTimeout(trailingTimer);
            trailingTimer = setTimeout(function() {
                lastCall = Date.now();
                trailingTimer = null;
                func.apply(ctx, args);
            }, remaining);
        }
    };
}

// RequestAnimationFrame wrapper для таймеров
function rafTimer(callback) {
    let lastTime = 0;
    const frame = (currentTime) => {
        const delta = currentTime - lastTime;
        if (delta >= 1000) { // Update every second
            callback();
            lastTime = currentTime;
        }
        app.animationFrameId = requestAnimationFrame(frame);
    };
    app.animationFrameId = requestAnimationFrame(frame);
    return () => {
        if (app.animationFrameId) {
            cancelAnimationFrame(app.animationFrameId);
            app.animationFrameId = null;
        }
    };
}

var pwaDeferredPrompt = null;
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  pwaDeferredPrompt = e;
});

function initPwaInstallBanner() {
  var banner = document.getElementById('pwaInstallBanner');
  var btn = document.getElementById('pwaInstallBtn');
  var dismiss = document.getElementById('pwaInstallDismiss');
  if (!banner || !btn) return;
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var dismissed = false;
  try { dismissed = localStorage.getItem('zoob_pwa_banner_dismissed') === '1'; } catch (e) {}
  if (isStandalone || !pwaDeferredPrompt || dismissed) return;
  banner.classList.remove('hidden');
  banner.classList.add('flex');
  btn.onclick = function () {
    if (!pwaDeferredPrompt) return;
    pwaDeferredPrompt.prompt();
    pwaDeferredPrompt.userChoice.then(function (choice) {
      if (choice.outcome === 'accepted') banner.classList.add('hidden');
      pwaDeferredPrompt = null;
    });
  };
  if (dismiss) {
    dismiss.onclick = function () {
      banner.classList.add('hidden');
      try { localStorage.setItem('zoob_pwa_banner_dismissed', '1'); } catch (e) {}
    };
  }
}

// In-memory кэш ошибок по клавишам - flush в localStorage при finishPractice
var _keyErrorsCache = {};
var _keyErrorsFlushTimer = null;

function _flushKeyErrors() {
    if (!Object.keys(_keyErrorsCache).length) return;
    try {
        var stored = localStorage.getItem('zoob_key_errors');
        var base = stored ? JSON.parse(stored) : {};
        for (var k in _keyErrorsCache) {
            base[k] = (base[k] || 0) + _keyErrorsCache[k];
        }
        localStorage.setItem('zoob_key_errors', JSON.stringify(base));
    } catch (_e) {}
    _keyErrorsCache = {};
}

/**
 * После сессии без ошибок (100% точность) - уменьшаем «хвост» по буквам, которые реально печатали.
 * Счётчики постепенно падают и ключи исчезают из профиля.
 */
function _decayKeyErrorsIfPerfect(accuracy, errors) {
    if (errors !== 0 || accuracy !== 100) return;
    var text = app.currentText;
    if (!text || typeof text !== 'string' || text.length < 8) return;
    var practiced = {};
    for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') continue;
        if (ch.length !== 1) continue;
        practiced[ch] = 1;
        if (ch.toLowerCase) practiced[ch.toLowerCase()] = 1;
    }
    try {
        var raw = localStorage.getItem('zoob_key_errors');
        var base = raw ? JSON.parse(raw) : {};
        var changed = false;
        for (var k in base) {
            if (!Object.prototype.hasOwnProperty.call(base, k)) continue;
            var cnt = Number(base[k]);
            if (!isFinite(cnt) || cnt <= 0) continue;
            if (k.length !== 1) continue;
            var kl = k.toLowerCase();
            if (!practiced[k] && !practiced[kl]) continue;
            var drop = Math.max(1, Math.round(cnt * 0.2));
            var next = cnt - drop;
            if (next <= 0) {
                delete base[k];
            } else {
                base[k] = next;
            }
            changed = true;
        }
        if (changed) {
            localStorage.setItem('zoob_key_errors', JSON.stringify(base));
        }
    } catch (_e) {}
}

// Периодический flush раз в 5 секунд (страховка при внезапном закрытии)
function _startKeyErrorsFlushTimer() {
    if (_keyErrorsFlushTimer) return;
    _keyErrorsFlushTimer = setInterval(_flushKeyErrors, 5000);
}

// Translations
// Audio elements
let audioClick = null;
let audioError = null;
let audioWelcome = null;
let audioVictory = null;
let audioThemeTransition = null;
let audioDeniedMoney = null;
var bgMusicAudio = null;
var bgMusicTrackIndex = 0;
var bgMusicPausedAt = 0;
var bgMusicPausedTrackIndex = 0;
var BG_MUSIC_TRACKS = ['assets/sounds/violin_2.ogg', 'assets/sounds/violin.mp3', 'assets/sounds/violin_1.mp3'];
var BG_MUSIC_VOLUME = 0.06;
var SFX_VOLUME = 0.04; // 2–5% громкость всех эффектов
let audioSwipeAnimation = null;
let audioOnSound = null;
let audioOffSound = null;
let audioOpenShop = null;
let audioClickLanguage = null;
let audioBuyShop = null;
let audioOpenProfile = null;
let audioOpenAchievement = null;
let audioCompleteAdvanced = null;
let audioOpenTelegram = null;
let audioFeedback = null;
let audioClickMenu0 = null;
let audioClickMenu1 = null;
let welcomePlayed = false;
var _homeMascotShowTimer = null;
var _homeMascotAutoHideTimer = null;
var _homeMascotIntroObs = null;
var _homeMascotIntroFallbackTimer = null;
var _homeMascotIntroPollTimer = null;
var _homeMascotSafetyTimer = null;
var _homeMascotSlideEndHandler = null;
var _homeMascotCurrentKey = '';
/** Поколение scheduleHomeMascot: старые колбэки интро не трогают новый цикл */
var HOME_MASCOT_HI_COUNT = 30;
var _homeMascotPipelineGen = 0;
/** Уже запланирован или показан маскот в текущем цикле (гонка safety vs основной таймер) */
var _homeMascotShowPipelineDone = false;
/** Ссылка на обработчик ended у welcome - снимаем при общем «выкл звук», чтобы не включать музыку по старому событию */
var _welcomeEndedHandler = null;

/** v=… подставляется из version.json - после деплоя подтягиваются новые ogg/mp3 без ручного сброса кэша */
function soundAssetUrl(path) {
    if (!path || typeof path !== 'string') return path;
    var v = typeof window !== 'undefined' && window.__zoobAssetBust != null ? window.__zoobAssetBust : 0;
    var sep = path.indexOf('?') >= 0 ? '&' : '?';
    return path + sep + 'v=' + encodeURIComponent(String(v));
}

/** Интро при загрузке главной: один из треков выбирается случайно на каждый визит */
var WELCOME_INTRO_SOURCES = [
    'assets/sounds/welcome.ogg',
    'assets/sounds/welcome_1.ogg',
    'assets/sounds/welcome_2.ogg',
    'assets/sounds/welcome_3.ogg'
];

function pickWelcomeIntroSource() {
    return soundAssetUrl(WELCOME_INTRO_SOURCES[Math.floor(Math.random() * WELCOME_INTRO_SOURCES.length)]);
}

// translations extracted to scripts/ui/translations.js
// Fallback: inline definition kept for builds that don't load the separate file first.
const translations = window.translations || {
    ru: {
        welcome: 'Добро пожаловать в игру',
        subtitle: 'Научитесь печатать быстро и без ошибок',
        lessons: 'Уроки',
        lessonsDesc: 'Обучение с нуля до профи',
        freeMode: 'Свободная печать',
        freeModeDesc: 'Свой текст для тренировки',
        speedTest: 'Тест скорости',
        speedTestDesc: '60 секунд на максимум',
        multiplayer: 'Мультиплеер',
        multiplayerDesc: 'Соревнуйся с друзьями!',
        siteLanguageLabel: 'Язык сайта',
        keyboardLayoutLabel: 'Раскладка',
        soundLabel: 'Звук вкл/выкл',
        themeLabel: 'Светлая/тёмная тема',
        yourProgress: 'Ваш прогресс',
        achievements: 'Достижения',
        rateSite: 'Оцените сайт',
        thanksForRating: 'Спасибо за оценку!',
        bestSpeed: 'Лучший результат',
        avgAccuracy: 'Средняя точность',
        completedLessons: 'Пройдено уроков',
        totalTime: 'Общее время',
        progressLessonsHint: 'все языки',
        mobilePcHint: 'Для лучшего взаимодействия рекомендуем зайти с компьютера.',
        back: 'Назад',
        chooseDifficulty: 'Выберите уровень сложности',
        homeMascotCloseAria: 'Скрыть подсказку',
        homeMascotHi1: 'Привет! Давно не виделись - заходи в уроки, я по тебе скучала.',
        homeMascotHi2: 'Ты сегодня готов жать на рекорд или пока разминка?',
        homeMascotHi3: 'Ура, ты здесь! Выбери режим - я с тобой рядом.',
        homeMascotHi4: 'Пару строк в свободной печати - и день уже победил. Погнали?',
        homeMascotHi5: 'Не забывай про серию дней - я слежу, чтобы ты не сливался.',
        homeMascotHi6: 'Тест на скорость на минуту - честная проверка, если хочешь цифры без сюсюканья.',
        homeMascotHi7: 'В мультиплеере можно устроить дуэль - позови друга, будет веселее.',
        homeMascotHi8: 'Тема сверху, фон меняешь в профиле - подстрой вайб, я только за.',
        homeMascotHi9: 'Уроки копят награды - чем ровнее строка, тем приятнее прогресс.',
        homeMascotHi10: 'Устали руки - сделай паузу. Я подожду, лишь бы не пропадал надолго.',
        homeMascotHi11: 'Сегодня хватит и одного закрытого урока - это уже маленькая победа.',
        homeMascotHi12: 'Клавиатура внизу подсказывает пальцы - спокойно смотри на экран.',
        homeMascotHi13: 'Магазин уроков иногда подкидывает сюрпризы - глянь, если скучно.',
        homeMascotHi14: 'Не гонись за идеальным заходом - лучше ровный ритм, чем рывками.',
        homeMascotHi15: 'Ошибка не приговор - главное не закипеть и поправить пальцы.',
        homeMascotHi16: 'Дыхание ровное, плечи ниже ушей - так удобнее печатать дольше.',
        homeMascotHi17: 'Если застрял на уроке, переключись на минутку в свободный режим.',
        homeMascotHi18: 'Достижения любопытные - загляни в профиль, когда будет настроение.',
        homeMascotHi19: 'Мультиплеер терпеливый: можно собраться не спеша и потом догнать.',
        homeMascotHi20: 'Звук кликов можно выключить - я не обижусь, кому-то так спокойнее.',
        homeMascotHi21: 'Главная - твой лобби: отсюда во все режимы без лишних кликов.',
        homeMascotHi22: 'Раскладку не забывай переключать - я однажды сама чуть не попала в капс.',
        homeMascotHi23: 'Короткая сессия лучше, чем никакой - пять минут тоже считаются.',
        homeMascotHi24: 'Точность иногда важнее скорости - нервы скажут спасибо.',
        homeMascotHi25: 'Урок с подсказками рук - смотри на экран, не на пальцы, постепенно привыкнешь.',
        homeMascotHi26: 'Прогресс сохраняется - можешь закрыть вкладку и вернуться, маршрут не сбросится.',
        homeMascotHi27: 'Если друг онлайн, кинь ему линк на мультиплеер - посоревнуетесь честно.',
        homeMascotHi28: 'Награды за серию дней копятся - не ломай цепочку без нужды.',
        homeMascotHi29: 'Свободная печать принимает свой текст - учебник, заметки, что угодно.',
        homeMascotHi30: 'Я тут не судья - ты сам выбираешь темп, я просто болею за тебя.',
        chooseDifficultyEpic: 'Сюжетная кампания',
        lessonsSagaCampaignLine: 'Три акта, один замысел: от первой буквы до финала сезона. Язык уроков (RU/EN/UA) - твой выбор, цепочка и награды общие.',
        chapterBannerAriaFallback: 'Сюжетная глава.',
        chapterBriefingCombinedObjective: '{{n}} миссий на карте. {{goal}}',
        chapterCodenameBeginner: 'Глава I // Протокол пробуждения',
        chapterTitleBeginner: 'Первый контакт',
        chapterHookBeginner: 'Система выводит тебя из спящего режима. Запомни ряды, поймай ритм - здесь начинается легенда о скорости.',
        chapterObjectiveBeginner: 'Освоить базу, собрать уверенность и открыть путь к среднему уровню.',
        chapterCardHookBeginner: 'Тихий старт. Система учит тебя не спешить и не ошибаться.',
        chapterCodenameMedium: 'Глава II // Режим перегруза',
        chapterTitleMedium: 'Разгон без тормозов',
        chapterHookMedium: 'Полигон разогревается: длиннее тексты, выше темп. Мозг и пальцы синхронизируются - ты уже не новичок.',
        chapterObjectiveMedium: 'Прокачать скорость, держать точность и подготовиться к финальному рубежу.',
        chapterCardHookMedium: 'Темп растёт. Каждая миссия - как круг на треке.',
        chapterCodenameAdvanced: 'Глава III // Точка невозврата',
        chapterTitleAdvanced: 'Адреналин и боссы',
        chapterHookAdvanced: 'Только для тех, кто готов жечь клавиши. Здесь решают характер, выносливость и точность до последнего знака.',
        chapterObjectiveAdvanced: 'Закрепить мастерство, выдержать марафоны и бить рекорды без жалости к ошибкам.',
        chapterCardHookAdvanced: 'Финал сезона. Либо ты тащишь, либо текст тащит тебя.',
        exit: 'Выйти',
        restart: 'Заново',
        pause: 'Пауза',
        resume: 'Продолжить',
        speed: 'Скорость',
        cpm: 'зн/мин',
        wpm: 'сл/мин',
        accuracy: 'Точность',
        time: 'Время',
        progress: 'Прогресс',
        results: 'Результаты',
        errors: 'Ошибки',
        repeat: 'Повторить',
        close: 'Закрыть',
        enterYourText: 'Введите свой текст для тренировки...',
        start: 'Начать',
        // Multiplayer
        multiplayerMenu: 'Мультиплеер',
        createRoom: 'Создать комнату',
        createRoomDesc: 'Получи код и отправь другу',
        joinRoom: 'Подключиться',
        joinRoomDesc: 'Введи код комнаты друга',
        roomCode: 'Код комнаты',
        copyCode: 'Копировать код',
        codeCopied: 'Код скопирован',
        waitingForPlayer: 'Ожидание игрока...',
        playersCount: 'игроков',
        roomClosed: 'Комната закрыта',
        opponentLeft: 'Противник покинул игру',
        youWon: 'Победа!',
        youLost: 'Поражение',
        youWonMsg: 'Ты первый допечатал текст!',
        youLostMsg: 'Противник был быстрее',
        roomCreated: 'Комната создана',
        joinedRoom: 'Вы подключились к комнате',
        playerJoined: 'Игрок подключился',
        leftRoom: 'Вы покинули комнату',
        errorCreatingRoom: 'Ошибка создания комнаты',
        multiplayerPermissionDeniedBody: 'База отклонила запись. В Firebase Console → Realtime Database → Rules разрешите чтение и запись для веток rooms, siteStats и online (файл database.rules.json в репозитории).',
        errorJoiningRoom: 'Ошибка подключения',
        enterRoomCode: 'Введи код комнаты (например: ABC123)',
        invalidCode: 'Введи корректный код (6 символов)',
        chooseGameMode: 'Выбери режим игры',
        textTheme: 'Тематика текста',
        textLanguage: 'Язык текста',
        wordCount: 'Количество слов',
        sendCodeToFriend: 'Отправь этот код другу!',
        shortText: 'Короткий текст',
        mediumText: 'Средний текст',
        longText: 'Длинный текст',
        words30: 'слов',
        words50: 'слов',
        words100: 'слов',
        words1000: 'слов',
        // Auth & Profile
        login: 'Войти',
        register: 'Зарегистрироваться',
        logout: 'Выйти',
        profile: 'Профиль',
        username: 'Логин',
        email: 'Email',
        password: 'Пароль',
        emailOptional: 'Email не обязателен',
        bio: 'О себе',
        save: 'Сохранить',
        statistics: 'Статистика',
        backgrounds: 'Фоны',
        backgroundsTip: 'Выберите фон для главного экрана. Новые фоны открываются за монеты.',
        chooseBackground: 'Выбрать фон',
        totalSessions: 'Всего сессий',
        totalErrors: 'Всего ошибок',
        loginSuccess: 'Вход выполнен успешно',
        level: 'Уровень',
        levelUp: 'Повышение уровня!',
        levelUpLabel: 'Уровень',
        levelRank: 'Ранг',
        levelUpCongrats: 'Продолжайте в том же духе!',
        levelUpNewRank: 'Новый ранг',
        levelUpRewardTitle: 'Награда за уровень',
        levelUpCoinsGranted: '+{{n}} монет на баланс',
        levelUpCoinsGuest: '+{{n}} монет зачислим при входе в аккаунт',
        guestPromisedHeaderTitle: 'Монеты к зачислению на баланс после входа в аккаунт',
        guestPromisedShortLabel: 'при входе',
        resultRewardGuestHint: 'Сохраним в накопление до входа - затем зачислим на баланс.',
        promisedCoinsClaimedToast: '+{{n}} монет с накопления зачислено на баланс',
        tapToContinue: 'Нажмите чтобы продолжить',
        unlockAtLevel: 'Разблокируется на уровне',
        levelShort: 'Ур.',
        continue: 'Продолжить',
        allLevels: 'Все уровни',
        skip: 'Пропустить',
        next: 'Далее',
        onbTitle1: 'Добро пожаловать в Zoobastiks!',
        onbText1: 'Уроки, тест скорости и свободная печать - всё здесь. Короткий обзор за 3 шага.',
        onbTitle2: 'Уроки и режимы',
        onbText2: 'Карточки на главной: пошаговые уроки, свой текст по темам, тест на 60 секунд. Выбери и начни.',
        onbTitle3: 'Уровень и прогресс',
        onbText3: 'В шапке справа - твой уровень и XP. Занимайся чаще, получай опыт и открывай новые ранги. Удачи!',
        onbLetsGo: 'Погнали!',
        registerSuccess: 'Регистрация успешна',
        logoutSuccess: 'Выход выполнен',
        loginError: 'Ошибка входа',
        registerError: 'Ошибка регистрации',
        fillAllFields: 'Заполните все поля',
        passwordTooShort: 'Пароль должен быть не менее 6 символов',
        profileSaved: 'Профиль сохранён',
        saveError: 'Ошибка сохранения',
        chooseAvatar: 'Выберите аватар',
        updatingAvatar: 'Обновление аватара...',
        avatarUpdated: 'Аватар обновлён',
        updateError: 'Ошибка обновления',
        noAccount: 'Нет аккаунта?',
        haveAccount: 'Уже есть аккаунт?',
        admin: 'Админ',
        adminPanel: 'Админ-панель',
        allUsers: 'Все пользователи',
        country: 'Страна',
        lastLogin: 'Последний вход',
        sessions: 'Сессий',
        actions: 'Действия',
        delete: 'Удалить',
        refresh: 'Обновить',
        confirmDelete: 'Вы уверены, что хотите удалить этого пользователя?',
        userDeleted: 'Пользователь удалён',
        deleteError: 'Ошибка удаления',
        loadError: 'Ошибка загрузки',
        accessDenied: 'Доступ запрещён',
        // Shop
        shop: 'Магазин',
        shopTitle: 'Магазин уроков',
        allLanguages: 'Все языки',
        allCategories: 'Все категории',
        selectLessonLanguage: 'Выберите язык урока:',
        reward: 'Награда',
        rewardUpTo: 'Награда: до',
        coinsAtAccuracy: 'монет (при точности ≥90%)',
        purchased: 'Куплено',
        buy: 'Купить',
        notEnoughCoins: 'Недостаточно монет',
        startLesson: 'Начать урок',
        lessonPurchased: 'Урок успешно куплен!',
        purchaseError: 'Ошибка покупки',
        tipInsufficientCoins: 'Пройди уроки с точностью 90%+ - получай монеты!',
        shopTipEarn: 'Чем выше точность в уроках - тем больше монет в награду.',
        shopTipFocus: 'Меньше ошибок = больше награда. Целься в 90%+ точности!',
        shopTipDaily: 'Регулярные тренировки повышают скорость и приносят монеты.',
        shopTipFlip: 'Наведи на карточку - увидишь совет на обороте.',
        shopTipLevel: 'Сложнее урок - выше награда за прохождение.',
        // Animations
        toggleAnimations: 'Включить/выключить анимации',
        animationsOn: 'Анимации включены',
        animationsOff: 'Анимации выключены',
        // Free Mode
        cancel: 'Отмена',
        characters: 'символов',
        tip: '💡 Совет:',
        freeModeTip: 'Можно вставить текст из любого источника. Нажмите Ctrl+Enter для быстрого старта',
        textByTheme: 'Текст по теме:',
        loadRandomText: 'Случайный набор',
        freeModeFromTheme: 'Текст из темы',
        freeModeCharsetLabel: 'Набор для случайного текста',
        freeModeCharsetLetters: 'Буквы и пробел (по раскладке)',
        freeModeCharsetAlnum: 'Буквы, цифры, пробел (без знаков)',
        freeModeCharsetDigits: 'Только цифры',
        freeModeLengthLabel: 'Целевая длина',
        freeModeRandomHint: 'Учитывает раскладку и настройки выше',
        themeMotivation: 'Мотивация',
        themeQuotes: 'Цитаты',
        themeFacts: 'Факты',
        themeHumor: 'Юмор',
        themeProverbs: 'Пословицы',
        // Footer
        footerDesc: 'Проект из эпохи нейросетей и квантовых вычислений. Тренируйся печатать быстрее скорости мысли.',
        neuralLink: 'Нейросвязь',
        establishConnection: 'Установить связь',
        contactDesc: 'Подключись к нейросети разработчика через квантовый канал связи',
        copyright: '© 2025 Zoobastiks. Все права защищены. Проект из будущего.',
        poweredBy: 'Работает на квантовых процессорах',
        statsVisits: 'Посещений:',
        aboutProject: 'О проекте',
        reviewsLink: 'Отзывы',
        allReviews: 'Все отзывы',
        copyResult: 'Скопировать результат',
        copyResultShort: 'Копия',
        resultCopied: 'Результат скопирован в буфер обмена',
        copyFailed: 'Не удалось скопировать',
        hotkeysHint: 'Esc - закрыть · Enter или R - повторить',
        streakDays: 'дней подряд',
        streakHint: 'Серия дней с тренировкой',
        // Multiplayer room settings
        mpThemeRandom: 'Случайные',
        mpThemeAnime: 'Аниме',
        mpThemeGames: 'Игры',
        mpThemeAnimals: 'Животные',
        mpThemeSpace: 'Космос',
        mpThemeNature: 'Природа',
        mpTextLength: 'Длина текста (символы)',
        mpChars: 'симв',
        mpTextOptions: 'Параметры текста',
        mpOptComma: 'Запятые',
        mpOptPeriod: 'Точки',
        mpOptDigits: 'Цифры',
        mpOptMixCase: 'Микс',
        mpAlwaysRandom: 'Текст генерируется случайно на лету.',
        mpPlayers: 'Игроки',
        mpDuelOnly: 'Сейчас доступна только дуэль:',
        mp2Players: '2 игрока',
        profileTabOverview: 'Обзор',
        profileTabHistory: 'История',
        profileTabErrors: 'Ошибки',
        profileXpTrack: 'Прогресс',
        profileTabNoSessions: 'Пока нет сессий - пройди урок!',
        profileTabNoAchiev: 'Достижений пока нет',
        profileTabNoErrors: 'Пройди урок - и здесь появится аналитика ошибок',
        profileTabNeedMore: 'Пройди хотя бы 2 сессии для динамики',
        profileTabSessions: 'Последние сессии',
        profileTabAchievements: 'Достижения',
        profileTabMissedKeys: 'Проблемные клавиши',
        profileTabAccTrend: 'Динамика точности',
        profileTabSpeed: 'Скорость',
        profileTabLocked: 'закрыто',
        profileTabOnSite: 'на сайте',
        profileModeMultiplayerBot: 'Дуэль с ботом'
    },
    en: {
        welcome: 'Welcome to Zoobastiks',
        subtitle: 'Learn to type fast and accurately',
        lessons: 'Lessons',
        lessonsDesc: 'From beginner to pro',
        freeMode: 'Free Typing',
        freeModeDesc: 'Custom text practice',
        speedTest: 'Speed Test',
        speedTestDesc: '60 seconds challenge',
        multiplayer: 'Multiplayer',
        multiplayerDesc: 'Compete with friends!',
        siteLanguageLabel: 'Site language',
        keyboardLayoutLabel: 'Keyboard',
        soundLabel: 'Sound on/off',
        themeLabel: 'Light/dark theme',
        yourProgress: 'Your Progress',
        achievements: 'Achievements',
        rateSite: 'Rate site',
        thanksForRating: 'Thanks for your rating!',
        bestSpeed: 'Best Speed',
        avgAccuracy: 'Average Accuracy',
        completedLessons: 'Completed Lessons',
        totalTime: 'Total Time',
        progressLessonsHint: 'all languages',
        mobilePcHint: 'For a better experience we recommend using a computer.',
        back: 'Back',
        chooseDifficulty: 'Choose Difficulty Level',
        homeMascotCloseAria: 'Dismiss hint',
        homeMascotHi1: 'Hi! Long time no see - jump into lessons, I missed you.',
        homeMascotHi2: 'Ready to chase a record today, or just a warm-up run?',
        homeMascotHi3: 'You are here! Pick a mode - I am right with you.',
        homeMascotHi4: 'A few lines in free typing and the day is already a win. Let us go?',
        homeMascotHi5: 'Keep that daily streak - I am watching so you do not slip.',
        homeMascotHi6: 'The one minute speed test is a straight shootout if you want hard numbers.',
        homeMascotHi7: 'Multiplayer duels exist - ping a friend and chase the win together.',
        homeMascotHi8: 'Theme toggle is up top; background is in your profile - tune the vibe, I am all for it.',
        homeMascotHi9: 'Lessons stack rewards - cleaner lines make the grind feel good.',
        homeMascotHi10: 'Hands tired? Pause. I will wait - just do not ghost for weeks.',
        homeMascotHi11: 'Finishing a single lesson today still counts as a win. Promise.',
        homeMascotHi12: 'The keyboard below nudges your fingers - keep your eyes on the text.',
        homeMascotHi13: 'The lesson shop sometimes drops fun stuff - peek if you are bored.',
        homeMascotHi14: 'Do not wait for a perfect start - steady rhythm beats jittery bursts.',
        homeMascotHi15: 'A typo is not a sentence - breathe and fix your fingers calmly.',
        homeMascotHi16: 'Steady breath, shoulders down - easier to type for longer that way.',
        homeMascotHi17: 'Stuck on a lesson? Hop into free mode for a minute to reset.',
        homeMascotHi18: 'Achievements are quirky - check your profile when you feel like it.',
        homeMascotHi19: 'Multiplayer is patient: gather calmly, then chase each other later.',
        homeMascotHi20: 'You can mute the key clicks - I will not mind if it feels calmer.',
        homeMascotHi21: 'Home is your lobby: every mode starts here without extra clicks.',
        homeMascotHi22: 'Do not forget the keyboard layout - I almost trapped myself in caps once.',
        homeMascotHi23: 'A short session beats none - five minutes still counts.',
        homeMascotHi24: 'Accuracy can beat raw speed sometimes - your nerves will thank you.',
        homeMascotHi25: 'Hand hint lessons want your eyes on the screen, not the keys - you will adapt.',
        homeMascotHi26: 'Progress saves - close the tab and return, your path stays put.',
        homeMascotHi27: 'If a friend is online, toss them a multiplayer link - fair duel.',
        homeMascotHi28: 'Streak rewards stack - try not to break the chain for no reason.',
        homeMascotHi29: 'Free typing accepts your own text - notes, homework, whatever helps.',
        homeMascotHi30: 'I am not here to judge - you pick the pace, I am just cheering.',
        chooseDifficultyEpic: 'Story campaign',
        lessonsSagaCampaignLine: 'Three acts, one arc: from the first keypress to the season finale. Pick a lesson language (RU/EN/UA) - the chain and rewards stay yours.',
        chapterBannerAriaFallback: 'Story chapter.',
        chapterBriefingCombinedObjective: '{{n}} missions on the map. {{goal}}',
        chapterCodenameBeginner: 'Chapter I // Awakening protocol',
        chapterTitleBeginner: 'First contact',
        chapterHookBeginner: 'The system pulls you out of sleep mode. Learn the rows, feel the rhythm - this is where the speed legend starts.',
        chapterObjectiveBeginner: 'Master the basics, build confidence, and unlock the road to the mid tier.',
        chapterCardHookBeginner: 'Quiet start. The system teaches you calm hands and clean input.',
        chapterCodenameMedium: 'Chapter II // Overdrive',
        chapterTitleMedium: 'Full throttle',
        chapterHookMedium: 'The range goes hot: longer texts, higher pace. Brain and fingers sync - you are not a rookie anymore.',
        chapterObjectiveMedium: 'Push your tempo, hold accuracy, and get ready for the final wall.',
        chapterCardHookMedium: 'Pace climbs. Every mission is another lap on the circuit.',
        chapterCodenameAdvanced: 'Chapter III // Point of no return',
        chapterTitleAdvanced: 'Boss rush adrenaline',
        chapterHookAdvanced: 'For those ready to burn the keyboard. Grit, stamina, and pixel-perfect accuracy decide everything.',
        chapterObjectiveAdvanced: 'Lock in mastery, survive marathons, and chase records with zero excuses.',
        chapterCardHookAdvanced: 'Season finale. Either you carry the run, or the text carries you.',
        exit: 'Exit',
        restart: 'Restart',
        pause: 'Pause',
        resume: 'Resume',
        speed: 'Speed',
        cpm: 'cpm',
        wpm: 'wpm',
        accuracy: 'Accuracy',
        time: 'Time',
        progress: 'Progress',
        results: 'Results',
        errors: 'Errors',
        repeat: 'Repeat',
        close: 'Close',
        enterYourText: 'Enter your text to practice...',
        start: 'Start',
        // Multiplayer
        multiplayerMenu: 'Multiplayer',
        createRoom: 'Create Room',
        createRoomDesc: 'Get code and send to friend',
        joinRoom: 'Join Room',
        joinRoomDesc: 'Enter friend\'s room code',
        roomCode: 'Room Code',
        copyCode: 'Copy Code',
        codeCopied: 'Code Copied',
        waitingForPlayer: 'Waiting for player...',
        playersCount: 'players',
        roomClosed: 'Room Closed',
        opponentLeft: 'Opponent Left',
        youWon: 'Victory!',
        youLost: 'Defeat',
        youWonMsg: 'You finished first!',
        youLostMsg: 'Opponent was faster',
        roomCreated: 'Room Created',
        joinedRoom: 'You joined the room',
        playerJoined: 'Player joined',
        leftRoom: 'You left the room',
        errorCreatingRoom: 'Error creating room',
        multiplayerPermissionDeniedBody: 'Database denied the write. In Firebase Console → Realtime Database → Rules, allow read and write for branches rooms, siteStats, and online (see database.rules.json in the repo).',
        errorJoiningRoom: 'Error joining room',
        enterRoomCode: 'Enter room code (e.g.: ABC123)',
        invalidCode: 'Enter valid code (6 characters)',
        chooseGameMode: 'Choose game mode',
        textTheme: 'Text Theme',
        textLanguage: 'Text Language',
        wordCount: 'Word Count',
        sendCodeToFriend: 'Send this code to friend!',
        shortText: 'Short Text',
        mediumText: 'Medium Text',
        longText: 'Long Text',
        words30: 'words',
        words50: 'words',
        words100: 'words',
        words1000: 'words',
        // Auth & Profile
        login: 'Login',
        register: 'Register',
        logout: 'Logout',
        profile: 'Profile',
        username: 'Username',
        email: 'Email',
        password: 'Password',
        emailOptional: 'Email is optional',
        bio: 'About me',
        save: 'Save',
        statistics: 'Statistics',
        backgrounds: 'Backgrounds',
        backgroundsTip: 'Choose a background for the main screen. New backgrounds unlock for coins.',
        chooseBackground: 'Choose background',
        totalSessions: 'Total Sessions',
        totalErrors: 'Total Errors',
        loginSuccess: 'Login successful',
        registerSuccess: 'Registration successful',
        logoutSuccess: 'Logout successful',
        level: 'Level',
        levelUp: 'Level Up!',
        levelUpLabel: 'Level',
        levelRank: 'Rank',
        levelUpCongrats: 'Keep up the great work!',
        levelUpNewRank: 'New rank',
        levelUpRewardTitle: 'Level-up reward',
        levelUpCoinsGranted: '+{{n}} coins on balance',
        levelUpCoinsGuest: '+{{n}} coins when you sign in',
        guestPromisedHeaderTitle: 'Coins waiting to be added to your balance after sign-in',
        guestPromisedShortLabel: 'on sign-in',
        resultRewardGuestHint: 'We save these to your pending balance until you sign in - then they go to your account.',
        promisedCoinsClaimedToast: '+{{n}} pending coins added to your balance',
        tapToContinue: 'Tap to continue',
        unlockAtLevel: 'Unlock at level',
        levelShort: 'Lvl.',
        continue: 'Continue',
        allLevels: 'All levels',
        skip: 'Skip',
        next: 'Next',
        onbTitle1: 'Welcome to Zoobastiks!',
        onbText1: 'Lessons, speed test and free typing - all in one place. A quick 3-step overview.',
        onbTitle2: 'Lessons and modes',
        onbText2: 'Cards on the home screen: step-by-step lessons, themed texts, 60-second test. Pick one and start.',
        onbTitle3: 'Level and progress',
        onbText3: 'In the top right - your level and XP. Practice more, earn experience and unlock new ranks. Good luck!',
        onbLetsGo: "Let's go!",
        loginError: 'Login error',
        registerError: 'Registration error',
        fillAllFields: 'Please fill all fields',
        passwordTooShort: 'Password must be at least 6 characters',
        profileSaved: 'Profile saved',
        saveError: 'Save error',
        chooseAvatar: 'Choose Avatar',
        updatingAvatar: 'Updating avatar...',
        avatarUpdated: 'Avatar updated',
        updateError: 'Update error',
        noAccount: 'No account?',
        haveAccount: 'Already have account?',
        admin: 'Admin',
        adminPanel: 'Admin Panel',
        allUsers: 'All Users',
        country: 'Country',
        lastLogin: 'Last Login',
        sessions: 'Sessions',
        actions: 'Actions',
        delete: 'Delete',
        refresh: 'Refresh',
        confirmDelete: 'Are you sure you want to delete this user?',
        userDeleted: 'User deleted',
        deleteError: 'Delete error',
        loadError: 'Load error',
        accessDenied: 'Access denied',
        // Shop
        shop: 'Shop',
        shopTitle: 'Lesson Shop',
        allLanguages: 'All Languages',
        allCategories: 'All Categories',
        selectLessonLanguage: 'Select lesson language:',
        reward: 'Reward',
        rewardUpTo: 'Reward: up to',
        coinsAtAccuracy: 'coins (at accuracy ≥90%)',
        purchased: 'Purchased',
        buy: 'Buy',
        notEnoughCoins: 'Not enough coins',
        startLesson: 'Start Lesson',
        lessonPurchased: 'Lesson purchased successfully!',
        purchaseError: 'Purchase error',
        tipInsufficientCoins: 'Complete lessons with 90%+ accuracy to earn coins!',
        shopTipEarn: 'Higher accuracy in lessons means more coins as reward.',
        shopTipFocus: 'Fewer errors = more reward. Aim for 90%+ accuracy!',
        shopTipDaily: 'Regular practice boosts speed and earns coins.',
        shopTipFlip: 'Hover over the card to see a tip on the back.',
        shopTipLevel: 'Harder lesson = bigger reward for completing it.',
        // Animations
        toggleAnimations: 'Toggle animations',
        animationsOn: 'Animations enabled',
        animationsOff: 'Animations disabled',
        // Free Mode
        cancel: 'Cancel',
        characters: 'characters',
        tip: '💡 Tip:',
        freeModeTip: 'You can paste text from any source. Press Ctrl+Enter to start quickly',
        textByTheme: 'Text by theme:',
        loadRandomText: 'Random sample',
        freeModeFromTheme: 'Text from theme',
        freeModeCharsetLabel: 'Charset for random text',
        freeModeCharsetLetters: 'Letters and space (keyboard layout)',
        freeModeCharsetAlnum: 'Letters, digits, space (no punctuation)',
        freeModeCharsetDigits: 'Digits only',
        freeModeLengthLabel: 'Target length',
        freeModeRandomHint: 'Uses layout and settings above',
        themeMotivation: 'Motivation',
        themeQuotes: 'Quotes',
        themeFacts: 'Facts',
        themeHumor: 'Humor',
        themeProverbs: 'Proverbs',
        // Footer
        footerDesc: 'A project from the era of neural networks and quantum computing. Train to type faster than the speed of thought.',
        neuralLink: 'Neural Link',
        establishConnection: 'Establish Connection',
        contactDesc: 'Connect to the developer\'s neural network through a quantum communication channel',
        copyright: '© 2025 Zoobastiks. All rights reserved. Project from the future.',
        poweredBy: 'Powered by quantum processors',
        statsVisits: 'Visits:',
        aboutProject: 'About',
        reviewsLink: 'Reviews',
        allReviews: 'All reviews',
        copyResult: 'Copy result',
        copyResultShort: 'Copy',
        resultCopied: 'Result copied to clipboard',
        copyFailed: 'Copy failed',
        hotkeysHint: 'Esc - close · Enter or R - repeat',
        streakDays: 'day streak',
        streakHint: 'Consecutive days with practice',
        // Multiplayer room settings
        mpThemeRandom: 'Random',
        mpThemeAnime: 'Anime',
        mpThemeGames: 'Games',
        mpThemeAnimals: 'Animals',
        mpThemeSpace: 'Space',
        mpThemeNature: 'Nature',
        mpTextLength: 'Text length (chars)',
        mpChars: 'chars',
        mpTextOptions: 'Text options',
        mpOptComma: 'Commas',
        mpOptPeriod: 'Periods',
        mpOptDigits: 'Digits',
        mpOptMixCase: 'Mix',
        mpAlwaysRandom: 'Text is always generated randomly.',
        mpPlayers: 'Players',
        mpDuelOnly: 'Only duel available:',
        mp2Players: '2 players',
        profileTabOverview: 'Overview',
        profileTabHistory: 'History',
        profileTabErrors: 'Errors',
        profileXpTrack: 'Progress',
        profileTabNoSessions: 'No sessions yet - complete a lesson!',
        profileTabNoAchiev: 'No achievements yet',
        profileTabNoErrors: 'Complete a lesson to see key error analytics',
        profileTabNeedMore: 'Complete at least 2 sessions to see trends',
        profileTabSessions: 'Recent Sessions',
        profileTabAchievements: 'Achievements',
        profileTabMissedKeys: 'Most Missed Keys',
        profileTabAccTrend: 'Accuracy Trend',
        profileTabSpeed: 'Speed',
        profileTabLocked: 'locked',
        profileTabOnSite: 'on site',
        profileModeMultiplayerBot: 'Bot duel'
    }
};

// Ensure window.translations is always set (scripts/ui/translations.js may have pre-populated it)
window.translations = translations;

// Speed test: ядро в коде; для ru доп. слова из scripts/speed-test-words.js (window.__zoobSpeedTestWords.ru)
const speedTestWords = (function () {
    function mergeSpeedLang(baseArr, extraArr) {
        var seen = Object.create(null);
        var out = [];
        function addAll(arr) {
            if (!arr || !arr.length) return;
            for (var i = 0; i < arr.length; i++) {
                var w = arr[i];
                if (w == null || w === '') continue;
                var k = String(w).toLowerCase().trim();
                if (!k || seen[k]) continue;
                seen[k] = 1;
                out.push(w);
            }
        }
        addAll(baseArr);
        addAll(extraArr);
        return out;
    }
    var glob = typeof window !== 'undefined' && window.__zoobSpeedTestWords;
    var exRu = glob && Array.isArray(glob.ru) ? glob.ru : [];
    var coreRu = [
        'как', 'так', 'все', 'это', 'был', 'быть', 'может', 'нужно', 'она', 'они', 'мы', 'я', 'ты',
        'мой', 'твой', 'его', 'ее', 'их', 'что', 'когда', 'где', 'почему', 'зачем', 'потому', 'если',
        'год', 'день', 'ночь', 'утро', 'вечер', 'вчера', 'сегодня', 'завтра', 'сейчас', 'потом', 'раньше',
        'дом', 'квартира', 'комната', 'окно', 'дверь', 'стена', 'пол', 'потолок', 'стол', 'стул', 'лампа',
        'книга', 'тетрадь', 'ручка', 'карандаш', 'экран', 'клавиатура', 'мышь', 'телефон', 'наушники',
        'рука', 'нога', 'голова', 'спина', 'глаз', 'ухо', 'сердце', 'мозг', 'мысль', 'чувство',
        'мама', 'папа', 'друг', 'подруга', 'семья', 'ребенок', 'учитель', 'ученик', 'коллега', 'сосед',
        'вода', 'воздух', 'огонь', 'земля', 'снег', 'дождь', 'ветер', 'солнце', 'небо', 'планета', 'мир',
        'город', 'деревня', 'улица', 'парк', 'лес', 'река', 'море', 'озеро', 'гора', 'поле', 'дорога',
        'жизнь', 'время', 'дело', 'работа', 'школа', 'игра', 'урок', 'проект', 'задача', 'цель',
        'слово', 'язык', 'буква', 'звук', 'фраза', 'текст', 'строка', 'страница',
        'быстро', 'медленно', 'тихо', 'громко', 'далеко', 'близко', 'рядом', 'вместе', 'один', 'два',
        'новый', 'старый', 'маленький', 'большой', 'длинный', 'короткий', 'легкий', 'тяжелый', 'простой', 'сложный',
        'правда', 'ложь', 'вопрос', 'ответ', 'пример', 'память', 'опыт', 'навык', 'скорость', 'точность'
    ];
    return {
        ru: mergeSpeedLang(coreRu, exRu),
        en: [
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'we', 'they', 'he', 'she', 'it', 'all', 'can',
            'will', 'would', 'could', 'should', 'must', 'may', 'might', 'have', 'has', 'had', 'was', 'were',
            'one', 'two', 'three', 'time', 'day', 'night', 'morning', 'evening', 'today', 'yesterday', 'tomorrow',
            'now', 'soon', 'later', 'early', 'late', 'again', 'always', 'never', 'sometimes',
            'man', 'woman', 'child', 'friend', 'family', 'teacher', 'student', 'worker', 'player', 'user',
            'hand', 'head', 'back', 'face', 'eye', 'ear', 'heart', 'mind', 'thought', 'feeling',
            'new', 'old', 'good', 'bad', 'small', 'large', 'short', 'long', 'fast', 'slow', 'easy', 'hard',
            'home', 'room', 'door', 'window', 'table', 'chair', 'screen', 'keyboard', 'mouse', 'phone',
            'book', 'page', 'line', 'word', 'letter', 'text', 'code', 'error', 'result',
            'life', 'world', 'work', 'game', 'lesson', 'project', 'task', 'goal', 'skill', 'speed', 'accuracy',
            'water', 'air', 'fire', 'snow', 'rain', 'wind', 'sun', 'sky', 'river', 'mountain', 'city', 'street',
            'walk', 'run', 'move', 'think', 'type', 'learn', 'play', 'start', 'finish', 'press', 'hold', 'release'
        ],
        ua: [
            'як', 'так', 'все', 'це', 'був', 'бути', 'може', 'треба', 'вона', 'вони', 'ми', 'я', 'ти',
            'мій', 'твій', 'його', 'її', 'їхній', 'що', 'коли', 'де', 'чому', 'навіщо', 'тому', 'якщо',
            'рік', 'день', 'ніч', 'ранок', 'вечір', 'вчора', 'сьогодні', 'завтра', 'зараз', 'потім', 'раніше',
            'дім', 'квартира', 'кімната', 'вікно', 'двері', 'стіна', 'підлога', 'стеля', 'стіл', 'стілець', 'лампа',
            'книга', 'зошит', 'ручка', 'олівець', 'екран', 'клавіатура', 'миша', 'телефон', 'навушники',
            'рука', 'нога', 'голова', 'спина', 'око', 'вухо', 'серце', 'мозок', 'думка', 'почуття',
            'мама', 'тато', 'друг', 'подруга', 'родина', 'дитина', 'учитель', 'учень', 'колега', 'сусід',
            'вода', 'повітря', 'вогонь', 'земля', 'сніг', 'дощ', 'вітер', 'сонце', 'небо', 'світ',
            'місто', 'село', 'вулиця', 'парк', 'ліс', 'річка', 'море', 'озеро', 'гора', 'поле', 'дорога',
            'життя', 'час', 'справа', 'робота', 'школа', 'гра', 'урок', 'проєкт', 'завдання', 'мета',
            'слово', 'мова', 'літера', 'звук', 'фраза', 'текст', 'рядок', 'сторінка',
            'швидко', 'повільно', 'тихо', 'голосно', 'далеко', 'близько', 'поруч', 'разом', 'один', 'два',
            'новий', 'старий', 'маленький', 'великий', 'довгий', 'короткий', 'легкий', 'важкий', 'простий', 'складний',
            'правда', 'брехня', 'питання', 'відповідь', 'приклад', 'пам\'ять', 'досвід', 'навичка', 'швидкість', 'точність',
            'акція', 'продаж', 'покупка', 'замовлення', 'доставка', 'оплата', 'повернення', 'гарантія', 'сервіс', 'підтримка',
            'пошта', 'месенджер', 'скайп', 'відео', 'аудіо', 'фото', 'стиль', 'дизайн', 'верстка', 'розробка',
            'програмування', 'фронтенд', 'бекенд', 'алгоритм', 'база', 'дані', 'сервер', 'хост', 'домен', 'хостинг'
        ]
    };
})();

// Доп. слова для режима «слабые клавиши» (буквы ы ф г и т.д. в обычном списке реже)
const adaptiveExtraWords = {
    ru: [
        'флаг', 'фраза', 'фронт', 'фонарь', 'фантазия', 'февраль', 'фасад', 'фильм', 'фигура', 'формат', 'футбол', 'фургон',
        'функция', 'фактор', 'фокус', 'фирма', 'финал', 'физика', 'философ', 'фонтан', 'формула',
        'мысль', 'мысли', 'мышь', 'мыть', 'вымысел', 'сыр', 'рыба', 'крыша', 'дым', 'лысый', 'жизнь',
        'ты', 'мы', 'вы', 'был', 'стыл', 'рысь', 'дыра', 'слышать', 'ныть', 'грызть', 'крыса',
        'гроза', 'гром', 'грусть', 'голос', 'глаз', 'горох', 'гигант', 'гладкий', 'граница', 'газета', 'герб',
        'город', 'огонь', 'молоко', 'хорошо', 'молодость', 'огромный', 'дорога', 'корова', 'голова', 'уголь',
        'фыркнуть', 'фальшь', 'фьорды', 'афиша', 'эфир', 'трофей', 'граф', 'гриф', 'груша'
    ],
    en: [
        'fuzzy', 'fox', 'fix', 'flux', 'quartz', 'quiz', 'jazz', 'buzz', 'pizza', 'zephyr', 'galaxy', 'sphinx',
        'oxygen', 'hyphen', 'rhythm', 'gazebo', 'jinx', 'queue', 'quiche', 'squid', 'text', 'next', 'vex'
    ],
    ua: [
        'фраза', 'фронт', 'фільм', 'фантазія', 'фонтан', 'формат', 'функція', 'гроза', 'гром', 'гора', 'голос',
        'газета', 'миготіти', 'миска', 'сир', 'риба', 'криша', 'дим', 'ти', 'ми', 'ви', 'фільтр'
    ]
};

// Перемешивание массива (Fisher–Yates)
function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Current selected lesson language
let selectedLessonLang = 'ru';
let currentLevelData = null; // Сохраняем данные текущего уровня

// Расчёт награды за урок
function calculateLessonRewardCoins(lesson, accuracy, isFirstTime) {
    if (!lesson || accuracy < 90) return 0;
    
    // Определяем сложность
    let difficulty = lesson.difficulty;
    if (!difficulty || difficulty === 'easy') {
        if (lesson.key) {
            if (lesson.key.includes('advanced') || lesson.key.includes('hard')) {
                difficulty = 'hard';
            } else if (lesson.key.includes('medium')) {
                difficulty = 'medium';
            } else {
                difficulty = 'easy';
            }
        } else if (currentLevelData) {
            if (currentLevelData.level === 'advanced') difficulty = 'hard';
            else if (currentLevelData.level === 'medium') difficulty = 'medium';
            else difficulty = 'easy';
        } else {
            difficulty = 'easy';
        }
    }
    
    // Базовое начисление по сложности
    let baseCoins = 10; // easy / beginner
    if (difficulty === 'hard' || difficulty === 'advanced') baseCoins = 20;
    else if (difficulty === 'medium') baseCoins = 15;
    
    // Множитель за точность
    let multiplier = 1;
    if (accuracy >= 98) {
        multiplier = 1.5;
    } else if (accuracy >= 95) {
        multiplier = 1.2;
    } else {
        multiplier = 1.0;
    }
    
    let coins = Math.round(baseCoins * multiplier);
    
    // Повторные прохождения получают меньше
    if (!isFirstTime) {
        coins = Math.max(1, Math.round(coins * 0.25));
    }

    var colMult = 1;
    if (typeof window !== 'undefined' && window.collectibleCardsModule && window.collectibleCardsModule.getLessonCoinMultiplier) {
        colMult = window.collectibleCardsModule.getLessonCoinMultiplier();
    }
    coins = Math.max(1, Math.round(coins * colMult));

    return coins;
}

// --------------- Фоны (покупка/выбор) ---------------
// BACKGROUNDS extracted to scripts/ui/backgrounds.js
// Fallback: inline definition kept for builds that don't load the separate file first.
var BACKGROUNDS = window.BACKGROUNDS || [
    { id: 'bg_dark_1', path: 'assets/images/background_black.jpg', theme: 'dark', cost: 0, name: 'Тёмный 1' },
    { id: 'bg_dark_2', path: 'assets/images/background_black_1.jpg', theme: 'dark', cost: 0, name: 'Тёмный 2' },
    { id: 'bg_dark_3', path: 'assets/images/background_black_2.jpg', theme: 'dark', cost: 0, name: 'Тёмный 3' },
    { id: 'bg_dark_4', path: 'assets/images/Background/background_black_3.jpg', theme: 'dark', cost: 30, name: 'Тёмный 4' },
    { id: 'bg_dark_5', path: 'assets/images/Background/background_black_4.jpg', theme: 'dark', cost: 30, name: 'Тёмный 5' },
    { id: 'bg_dark_6', path: 'assets/images/Background/background_black_5.jpg', theme: 'dark', cost: 30, name: 'Тёмный 6' },
    { id: 'bg_dark_7', path: 'assets/images/Background/background_black_6.jpg', theme: 'dark', cost: 30, name: 'Тёмный 7' },
    { id: 'bg_dark_8', path: 'assets/images/Background/background_black_7.jpg', theme: 'dark', cost: 30, name: 'Тёмный 8' },
    { id: 'bg_dark_9', path: 'assets/images/Background/background_black_8.jpg', theme: 'dark', cost: 30, name: 'Тёмный 9' },
    { id: 'bg_dark_10', path: 'assets/images/Background/background_black_9.jpg', theme: 'dark', cost: 30, name: 'Тёмный 10' },
    { id: 'bg_dark_11', path: 'assets/images/Background/background_black_10.jpg', theme: 'dark', cost: 30, name: 'Тёмный 11' },
    { id: 'bg_dark_12', path: 'assets/images/Background/background_black_11.jpg', theme: 'dark', cost: 30, name: 'Тёмный 12' },
    { id: 'bg_light_1', path: 'assets/images/background_white.jpg', theme: 'light', cost: 0, name: 'Светлый 1' },
    { id: 'bg_light_2', path: 'assets/images/background_white_1.jpg', theme: 'light', cost: 0, name: 'Светлый 2' },
    { id: 'bg_light_3', path: 'assets/images/background_white_2.jpg', theme: 'light', cost: 0, name: 'Светлый 3' },
    { id: 'bg_light_4', path: 'assets/images/Background/background_white_3.jpg', theme: 'light', cost: 30, name: 'Светлый 4' },
    { id: 'bg_light_5', path: 'assets/images/Background/background_white_4.jpg', theme: 'light', cost: 30, name: 'Светлый 5' },
    { id: 'bg_light_6', path: 'assets/images/Background/background_white_5.jpg', theme: 'light', cost: 30, name: 'Светлый 6' },
    { id: 'bg_light_7', path: 'assets/images/Background/background_white_6.jpg', theme: 'light', cost: 30, name: 'Светлый 7' },
    { id: 'bg_light_8', path: 'assets/images/Background/background_white_7.jpg', theme: 'light', cost: 30, name: 'Светлый 8' },
    { id: 'bg_light_9', path: 'assets/images/Background/background_white_8.jpg', theme: 'light', cost: 30, name: 'Светлый 9' },
    { id: 'bg_light_10', path: 'assets/images/Background/background_white_9.jpg', theme: 'light', cost: 30, name: 'Светлый 10' },
    { id: 'bg_light_11', path: 'assets/images/Background/background_white_10.jpg', theme: 'light', cost: 30, name: 'Светлый 11' }
];
// Expose so other scripts can read it
window.BACKGROUNDS = BACKGROUNDS;
var BG_STORAGE_UNLOCKED = 'zoobastiks_unlocked_backgrounds';
var BG_STORAGE_SELECTED_DARK = 'zoobastiks_selected_bg_dark';
var BG_STORAGE_SELECTED_LIGHT = 'zoobastiks_selected_bg_light';

function getUnlockedBackgroundIds() {
    try {
        var raw = localStorage.getItem(BG_STORAGE_UNLOCKED);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return BACKGROUNDS.filter(function(b) { return b.cost === 0; }).map(function(b) { return b.id; });
}

function setUnlockedBackgroundIds(ids) {
    try {
        localStorage.setItem(BG_STORAGE_UNLOCKED, JSON.stringify(ids));
    } catch (e) {}
}

function getSelectedBackgroundId(theme) {
    var key = theme === 'dark' ? BG_STORAGE_SELECTED_DARK : BG_STORAGE_SELECTED_LIGHT;
    try {
        var id = localStorage.getItem(key);
        if (id && BACKGROUNDS.some(function(b) { return b.id === id && b.theme === theme; })) return id;
    } catch (e) {}
    var forTheme = BACKGROUNDS.filter(function(b) { return b.theme === theme && b.cost === 0; });
    return forTheme.length ? forTheme[0].id : null;
}

function setSelectedBackgroundId(theme, id) {
    var key = theme === 'dark' ? BG_STORAGE_SELECTED_DARK : BG_STORAGE_SELECTED_LIGHT;
    try {
        localStorage.setItem(key, id || '');
    } catch (e) {}
}

/** Разрешить фон для темы (та же логика, что у applyBackgroundToPage). */
function resolveBackgroundForTheme(theme) {
    var selectedId = getSelectedBackgroundId(theme);
    var unlocked = getUnlockedBackgroundIds();
    var bg = null;
    if (selectedId && unlocked.indexOf(selectedId) >= 0) {
        bg = BACKGROUNDS.find(function (b) { return b.id === selectedId; });
    }
    if (!bg) {
        var available = BACKGROUNDS.filter(function (b) { return b.theme === theme && unlocked.indexOf(b.id) >= 0; });
        bg = available.length ? available[Math.floor(Math.random() * available.length)] : BACKGROUNDS.find(function (b) { return b.theme === theme; });
        if (bg && !selectedId) setSelectedBackgroundId(theme, bg.id);
    }
    return bg || null;
}

function applyBackgroundToPage() {
    var theme = getCurrentTheme();
    var bg = resolveBackgroundForTheme(theme);
    if (bg) {
        document.body.style.backgroundImage = "url('" + bg.path + "')";
        var preview = document.getElementById('profileCurrentBgPreview');
        if (preview) preview.style.backgroundImage = "url('" + bg.path + "')";
    }
}

/** Прогреть URL в кэше изображений (смена темы без «подвисания» на декоде). */
function warmImageUrls(urls, done) {
    var list = urls.filter(Boolean);
    if (!list.length) {
        done();
        return;
    }
    var left = list.length;
    function one() {
        if (--left <= 0) done();
    }
    for (var i = 0; i < list.length; i++) {
        var img = new Image();
        img.onload = function () {
            var el = this;
            if (el.decode) {
                el.decode().then(one).catch(one);
            } else {
                one();
            }
        };
        img.onerror = one;
        img.src = list[i];
    }
}

// Background images setup (использует выбранный или случайный из открытых)
function setRandomBackground() {
    applyBackgroundToPage();
}

function updateProfileBgPreview() {
    var preview = document.getElementById('profileCurrentBgPreview');
    if (!preview) return;
    var theme = getCurrentTheme();
    var id = getSelectedBackgroundId(theme);
    var bg = id ? BACKGROUNDS.find(function(b) { return b.id === id; }) : BACKGROUNDS.find(function(b) { return b.theme === theme; });
    if (bg) preview.style.backgroundImage = "url('" + bg.path + "')";
}

function openBackgroundSelectorModal() {
    var modal = document.getElementById('backgroundSelectorModal');
    if (!modal) return;
    renderBackgroundSelectorGrid();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.onclick = function(e) { if (e.target === modal) closeBackgroundSelectorModal(); };
}

function closeBackgroundSelectorModal() {
    var modal = document.getElementById('backgroundSelectorModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.onclick = null;
    }
}

function getCurrentTheme() {
    return (typeof app !== 'undefined' && app.theme === 'dark') || document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function renderBackgroundSelectorGrid() {
    var grid = document.getElementById('backgroundSelectorGrid');
    if (!grid) return;
    var theme = getCurrentTheme();
    var unlocked = getUnlockedBackgroundIds();
    var selectedId = getSelectedBackgroundId(theme);
    grid.innerHTML = '';
    // Показываем только фоны текущей темы (тёмные при тёмной теме, светлые при светлой)
    BACKGROUNDS.filter(function(b) { return b.theme === theme; }).forEach(function(bg) {
        var unlocked_ = unlocked.indexOf(bg.id) >= 0;
        var selected = selectedId === bg.id;
        var card = document.createElement('div');
        card.className = 'profile-stat-tile rounded-xl overflow-hidden relative cursor-pointer transition-all duration-200 aspect-[4/3] min-h-0 ' +
            (selected ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900 dark:ring-offset-black' : '');
        var thumb = document.createElement('div');
        thumb.className = 'w-full h-full min-h-[100px] bg-cover bg-center';
        thumb.style.backgroundImage = "url('" + bg.path + "')";
        card.appendChild(thumb);
        var label = document.createElement('div');
        label.className = 'absolute bottom-0 left-0 right-0 py-1.5 px-2 text-xs font-medium truncate ' +
            (bg.theme === 'dark' ? 'text-white bg-black/60' : 'text-gray-900 bg-white/70');
        label.textContent = bg.name;
        card.appendChild(label);
        if (!unlocked_) {
            var lock = document.createElement('div');
            lock.className = 'absolute inset-0 flex flex-col items-center justify-center bg-black/60';
            lock.innerHTML = '<span class="text-2xl mb-1">🔒</span><span class="text-xs text-amber-400 font-semibold flex items-center justify-center gap-1">' + (bg.cost ? (bg.cost + ' ' + COIN_ICON_IMG) : '') + '</span>';
            card.appendChild(lock);
            card.onclick = function() { buyProfileBackground(bg.id); };
        } else {
            if (selected) {
                var check = document.createElement('div');
                check.className = 'absolute top-1 right-1 bg-cyan-500 rounded-full p-1';
                check.innerHTML = '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>';
                card.appendChild(check);
            }
            card.onclick = function() { selectProfileBackground(bg.id); };
        }
        grid.appendChild(card);
    });
}

function selectProfileBackground(backgroundId) {
    var bg = BACKGROUNDS.find(function(b) { return b.id === backgroundId; });
    if (!bg) return;
    var unlocked = getUnlockedBackgroundIds();
    if (unlocked.indexOf(backgroundId) < 0) return;
    setSelectedBackgroundId(bg.theme, backgroundId);
    applyBackgroundToPage();
    renderBackgroundSelectorGrid();
    updateProfileBgPreview();
    showToast((typeof t('profileSaved') !== 'undefined' ? t('profileSaved') : 'Сохранено') + ' - ' + bg.name, 'success');
}

async function buyProfileBackground(backgroundId) {
    var bg = BACKGROUNDS.find(function(b) { return b.id === backgroundId; });
    if (!bg || bg.cost === 0) return;
    var user = window.authModule && window.authModule.getCurrentUser ? window.authModule.getCurrentUser() : null;
    if (!user) {
        showToast(typeof t('loginRequired') === 'string' ? t('loginRequired') : 'Войдите в аккаунт', 'info');
        return;
    }
    var balance = (user.balance != null ? user.balance : 0) || (window.authModule && window.authModule.getUserBalance ? window.authModule.getUserBalance(user.uid) : 0);
    if (balance < bg.cost) {
        if (typeof playDeniedMoneySound === 'function') playDeniedMoneySound();
        showToast(typeof t('notEnoughCoins') === 'string' ? t('notEnoughCoins') : 'Недостаточно монет', 'error');
        return;
    }
    if (!window.authModule || !window.authModule.deductCoins) {
        showToast('Ошибка покупки', 'error');
        return;
    }
    try {
        var result = await window.authModule.deductCoins(user.uid, bg.cost);
        if (result && result.success) {
            var newBalance = result.balance != null ? result.balance : (balance - bg.cost);
            var unlocked = getUnlockedBackgroundIds();
            if (unlocked.indexOf(backgroundId) < 0) unlocked.push(backgroundId);
            setUnlockedBackgroundIds(unlocked);
            if (currentUserProfile) currentUserProfile.balance = newBalance;
            var balanceEl = DOM.get('profileBalance');
            if (balanceEl) balanceEl.innerHTML = newBalance + ' ' + COIN_ICON_IMG;
            renderBackgroundSelectorGrid();
            updateProfileBgPreview();
            var updatedUser = window.authModule && window.authModule.getCurrentUser ? window.authModule.getCurrentUser() : null;
            if (updatedUser && typeof updateUserUI === 'function') updateUserUI(updatedUser, currentUserProfile || updatedUser);
            var shopBalanceEl = DOM.get('shopBalance');
            if (shopBalanceEl) shopBalanceEl.textContent = (updatedUser && (updatedUser.balance != null) ? updatedUser.balance : newBalance) + '';
            showToast(bg.name + ' - ' + (app.lang === 'en' ? 'Unlocked!' : 'Открыто!'), 'success');
        } else {
            if (result && result.error && (result.error === 'Недостаточно монет' || result.error.indexOf('монет') !== -1)) {
                if (typeof playDeniedMoneySound === 'function') playDeniedMoneySound();
            }
            showToast(result && result.error ? result.error : 'Ошибка', 'error');
        }
    } catch (_e) {
        showToast('Ошибка покупки', 'error');
    }
}

// Create floating particles effect (мало DOM-узлов, без box-shadow - дешевле для GPU)
function createParticles() {
    if (!app.animationsEnabled) return;
    
    var heroContainer = document.querySelector('.hero-container')
        || document.getElementById('homeScreen');
    if (!heroContainer) return;
    
    // Reuse: если частицы уже есть - не пересоздаём (только показываем)
    const existing = heroContainer.querySelectorAll('.particle');
    if (existing.length > 0) {
        existing.forEach(p => { p.style.display = ''; });
        return;
    }

    var count = 8;
    try {
        if (window.matchMedia('(max-width: 768px)').matches) count = 5;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) count = 0;
    } catch (e) {}
    if (count <= 0) return;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 10 + 14) + 's';
        particle.style.animationDelay = Math.random() * 5 + 's';
        particle.style.opacity = String(Math.random() * 0.35 + 0.25);
        frag.appendChild(particle);
    }
    heroContainer.appendChild(frag);
}

// Onboarding (первый заход)
const ONBOARDING_STORAGE_KEY = 'zoobastiks_onboarding_seen';
var onboardingStep = 1;

function showOnboardingIfFirstVisit() {
    try {
        if (localStorage.getItem(ONBOARDING_STORAGE_KEY)) return;
    } catch (e) { return; }
    var overlay = document.getElementById('onboardingOverlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    overlay.style.visibility = 'visible';
    onboardingStep = 1;
    goToOnboardingStep(1);
}

function goToOnboardingStep(step) {
    onboardingStep = step;
    for (var i = 1; i <= 3; i++) {
        var slide = DOM.get('onboardingSlide' + i);
        var dot = DOM.get('onbDot' + i);
        if (slide) slide.classList.toggle('active', i === step);
        if (dot) dot.classList.toggle('active', i === step);
    }
    var nextBtn = DOM.get('onbNextBtn');
    var goBtn = DOM.get('onbGoBtn');
    if (nextBtn) nextBtn.classList.toggle('hidden', step === 3);
    if (goBtn) goBtn.classList.toggle('hidden', step !== 3);
}

function nextOnboardingStep() {
    if (onboardingStep < 3) goToOnboardingStep(onboardingStep + 1);
    else finishOnboarding();
}

function finishOnboarding() {
    try {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    } catch (e) {}
    var overlay = document.getElementById('onboardingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.display = '';
        overlay.style.visibility = '';
    }
    setRandomBackground();
}

// Отложенная установка фона (после первого кадра), чтобы LCP был контент, а не большое изображение
function scheduleBackgroundAfterFirstPaint() {
    function run() {
        setRandomBackground();
        updateFooterBackground();
    }
    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(run, { timeout: 400 });
    } else {
        requestAnimationFrame(function() { requestAnimationFrame(run); });
    }
}

// Контекстное меню по правой кнопке отключено (обойти можно через инструменты браузера).
document.addEventListener(
    'contextmenu',
    function (e) {
        e.preventDefault();
    },
    true
);

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    app.isPaused = false;
    
    loadSettings();
    scheduleBackgroundAfterFirstPaint();
    applyAnimationsSetting();
    initializeUI();
    updateTranslations();
    if (typeof initAuthModalControls === 'function') initAuthModalControls();
    if (window.statsModule) window.statsModule.updateDisplay();
    if (window.achievementsModule) window.achievementsModule.render('achievementsBlock');
    if (window.levelModule) renderLevelBlock();
    if (window.keyboardModule) window.keyboardModule.render(app.currentLayout);
    initSiteRating();
    // Футер/фон уже запланированы в scheduleBackgroundAfterFirstPaint
    
    // Аудио после version.json - к звукам добавляется ?v=build, чтобы SW/браузер не отдавали старые файлы
    fetchDeployBuild().then(function (data) {
        var b = _parseDeployBuild(data);
        if (b != null) {
            __zoobDeployBaseline = b;
            window.__zoobAssetBust = b;
        } else {
            window.__zoobAssetBust = Math.floor(Date.now() / 1000);
        }
    }).catch(function () {
        window.__zoobAssetBust = Math.floor(Date.now() / 1000);
    }).finally(function () {
        setTimeout(function () {
            initializeAudio();
            createParticles();
        }, 0);
    });
    
    setTimeout(showOnboardingIfFirstVisit, 700);
    
    if ('serviceWorker' in navigator) {
        var swUpdateIntervalId = null;
        function clearSwUpdateInterval() {
            if (swUpdateIntervalId != null) {
                clearInterval(swUpdateIntervalId);
                swUpdateIntervalId = null;
            }
        }
        window.addEventListener('pagehide', function (ev) {
            if (ev.persisted) return;
            clearSwUpdateInterval();
        });
        navigator.serviceWorker.register('sw.js').then(function (reg) {
            if (reg) {
                swUpdateIntervalId = setInterval(function () { reg.update(); }, 5 * 60 * 1000);
            }
        }).catch(function () {});
        window.addEventListener('focus', function () {
            navigator.serviceWorker.getRegistration().then(function (reg) {
                if (reg) reg.update();
            }).catch(function () {});
        });
        // Новый SW: оверлей + жёсткая перезагрузка (как при смене version.json)
        navigator.serviceWorker.addEventListener('message', function (e) {
            if (e.data && e.data.type === 'SW_UPDATED') {
                performAppHardReload();
            }
        });
    }
    initDeployVersionCheck();
    initPwaInstallBanner();

    // Initialize auth state listener
    if (window.authModule) {
        window.authModule.onAuthStateChange(async (user) => {
            // Обновляем присутствие в Firebase (ник, уровень, аватар)
            if (typeof window.__updatePresenceUser === 'function') {
                window.__updatePresenceUser(user || null);
            }
            if (user) {
                // user уже полный объект из localStorage
                currentUserProfile = user;
                updateUserUI(user, user);
                
                const adminCheck = await window.authModule.isAdmin(user.uid);
                if (adminCheck) {
                    const adminBtn = DOM.get('adminBtn');
                    if (adminBtn) adminBtn.classList.remove('hidden');
                }
            } else {
                currentUserProfile = null;
                const profileBtn = DOM.get('userProfileBtn');
                const loginBtn = DOM.get('loginBtn');
                const adminBtn = DOM.get('adminBtn');
                const balanceDisplay = DOM.get('balanceDisplay');
                const shopBtn = DOM.get('shopBtn');
                if (profileBtn) profileBtn.classList.add('hidden');
                if (loginBtn) loginBtn.classList.remove('hidden');
                if (adminBtn) adminBtn.classList.add('hidden');
                if (balanceDisplay) balanceDisplay.classList.add('hidden');
                if (shopBtn) shopBtn.classList.add('hidden');
                if (typeof updateGuestPromisedHeader === 'function') updateGuestPromisedHeader();
            }
        });
    }
    
    if (typeof updateGuestPromisedHeader === 'function') updateGuestPromisedHeader();

    initHomeMascotCloseButton();
    scheduleHomeMascot();
    if (!window.__zoobMascotPageshowBound) {
        window.__zoobMascotPageshowBound = true;
        window.addEventListener('pageshow', function (ev) {
            try {
                if (!ev.persisted) return;
                if (app.currentMode !== 'home') return;
                var h = document.getElementById('homeScreen');
                if (!h || h.classList.contains('hidden')) return;
                scheduleHomeMascot();
            } catch (_pe) {}
        });
    }

    // Воспроизводим welcome звук при загрузке главной страницы
    setTimeout(() => {
        playWelcomeSound();
    }, 500);
});

// Initialize audio elements
function initializeAudio() {
    try {
        audioClick = new Audio(soundAssetUrl('assets/sounds/click.ogg'));
        audioError = new Audio(soundAssetUrl('assets/sounds/error.ogg'));
        audioWelcome = new Audio(pickWelcomeIntroSource());
        audioVictory = new Audio(soundAssetUrl('assets/sounds/victory.ogg'));
        audioThemeTransition = new Audio(soundAssetUrl('assets/sounds/transition_theme.ogg'));
        audioDeniedMoney = new Audio(soundAssetUrl('assets/sounds/denied_money.ogg'));
        audioSwipeAnimation = new Audio(soundAssetUrl('assets/sounds/swipe_animation.ogg'));
        audioOnSound = new Audio(soundAssetUrl('assets/sounds/On_sound.ogg'));
        audioOffSound = new Audio(soundAssetUrl('assets/sounds/Off_sound.ogg'));
        audioOpenShop = new Audio(soundAssetUrl('assets/sounds/open_shop.ogg'));
        audioClickLanguage = new Audio(soundAssetUrl('assets/sounds/click_language.ogg'));
        audioBuyShop = new Audio(soundAssetUrl('assets/sounds/buy_shop_sound.ogg'));
        audioOpenProfile = new Audio(soundAssetUrl('assets/sounds/open_profile.ogg'));
        audioOpenAchievement = new Audio(soundAssetUrl('assets/sounds/open_achievement.ogg'));
        audioCompleteAdvanced = new Audio(soundAssetUrl('assets/sounds/complete_advanced.ogg'));
        audioOpenTelegram = new Audio(soundAssetUrl('assets/sounds/open_telegram.ogg'));
        audioFeedback = new Audio(soundAssetUrl('assets/sounds/feetback.ogg'));
        audioClickMenu0 = new Audio(soundAssetUrl('assets/sounds/click_menu_0.ogg'));
        audioClickMenu1 = new Audio(soundAssetUrl('assets/sounds/click_menu_1.ogg'));
        
        // Set volumes (2–5% через SFX_VOLUME)
        if (audioClick) audioClick.volume = SFX_VOLUME;
        if (audioError) audioError.volume = SFX_VOLUME;
        if (audioWelcome) audioWelcome.volume = SFX_VOLUME;
        if (audioVictory) audioVictory.volume = SFX_VOLUME;
        if (audioThemeTransition) audioThemeTransition.volume = SFX_VOLUME;
        if (audioDeniedMoney) audioDeniedMoney.volume = SFX_VOLUME;
        if (audioSwipeAnimation) audioSwipeAnimation.volume = SFX_VOLUME;
        if (audioOnSound) audioOnSound.volume = SFX_VOLUME;
        if (audioOffSound) audioOffSound.volume = SFX_VOLUME;
        if (audioOpenShop) audioOpenShop.volume = SFX_VOLUME;
        if (audioClickLanguage) audioClickLanguage.volume = SFX_VOLUME;
        if (audioBuyShop) audioBuyShop.volume = SFX_VOLUME;
        if (audioOpenProfile) audioOpenProfile.volume = SFX_VOLUME;
        if (audioOpenAchievement) audioOpenAchievement.volume = SFX_VOLUME;
        if (audioCompleteAdvanced) audioCompleteAdvanced.volume = SFX_VOLUME;
        if (audioOpenTelegram) audioOpenTelegram.volume = SFX_VOLUME;
        if (audioFeedback) audioFeedback.volume = SFX_VOLUME;
        if (audioClickMenu0) audioClickMenu0.volume = SFX_VOLUME;
        if (audioClickMenu1) audioClickMenu1.volume = SFX_VOLUME;
    } catch (e) {
        console.log('Audio files not available, using fallback');
    }
}

// Play welcome sound once (на время воспроизведения приглушаем фоновую музыку)
function playWelcomeSound() {
    if (!welcomePlayed && app.soundEnabled && audioWelcome && app.currentMode === 'home') {
        if (_welcomeEndedHandler && audioWelcome) {
            audioWelcome.removeEventListener('ended', _welcomeEndedHandler);
            _welcomeEndedHandler = null;
        }
        var bgWasPlaying = bgMusicAudio && !bgMusicAudio.paused;
        if (bgWasPlaying) stopBgMusic();
        _welcomeEndedHandler = function() {
            audioWelcome.removeEventListener('ended', _welcomeEndedHandler);
            _welcomeEndedHandler = null;
            if (app.bgMusicEnabled && bgWasPlaying) startBgMusic();
        };
        audioWelcome.addEventListener('ended', _welcomeEndedHandler);
        var playPromise = audioWelcome.play();
        if (playPromise !== undefined) {
            playPromise.then(function() {
                welcomePlayed = true;
            }).catch(function() {
                if (_welcomeEndedHandler && audioWelcome) {
                    audioWelcome.removeEventListener('ended', _welcomeEndedHandler);
                    _welcomeEndedHandler = null;
                }
                if (bgWasPlaying && app.bgMusicEnabled) startBgMusic();
                var playOnInteraction = function() {
                    document.removeEventListener('click', playOnInteraction);
                    document.removeEventListener('keydown', playOnInteraction);
                    if (!app.soundEnabled) {
                        welcomePlayed = true;
                        return;
                    }
                    if (!welcomePlayed && audioWelcome && app.currentMode === 'home') {
                        var bgPlaying = bgMusicAudio && !bgMusicAudio.paused;
                        if (bgPlaying) stopBgMusic();
                        _welcomeEndedHandler = function() {
                            audioWelcome.removeEventListener('ended', _welcomeEndedHandler);
                            _welcomeEndedHandler = null;
                            if (app.bgMusicEnabled && bgPlaying) startBgMusic();
                        };
                        audioWelcome.addEventListener('ended', _welcomeEndedHandler);
                        audioWelcome.play().catch(function() {
                            if (_welcomeEndedHandler && audioWelcome) {
                                audioWelcome.removeEventListener('ended', _welcomeEndedHandler);
                                _welcomeEndedHandler = null;
                            }
                            if (app.bgMusicEnabled && bgPlaying) startBgMusic();
                        });
                        welcomePlayed = true;
                    }
                };
                document.addEventListener('click', playOnInteraction, { once: true });
                document.addEventListener('keydown', playOnInteraction, { once: true });
            });
        }
    }
}

function updateSoundToggleIcon() {
    var icon = DOM.get('soundIcon');
    if (!icon) return;
    if (app.soundEnabled) {
        icon.innerHTML = '<path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd" />';
    } else {
        icon.innerHTML = '<path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd" />';
    }
}

// Load settings from localStorage
function loadSettings() {
    const savedTheme = localStorage.getItem('theme');
    const savedLang = localStorage.getItem('lang');
    const savedLayout = localStorage.getItem('layout');
    const savedSound = localStorage.getItem('sound');
    const savedAnimations = localStorage.getItem('animations');
    
    if (savedTheme) {
        app.theme = savedTheme;
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        // Футер и фон тела задаются в scheduleBackgroundAfterFirstPaint (после первого кадра, для LCP)
    }
    
    if (savedLang) {
        app.lang = normalizeSiteLangFromStorage(savedLang);
        if (savedLang === 'uk') {
            try { localStorage.setItem('lang', 'ua'); } catch (e) {}
        }
    }
    syncSiteLanguageUI();
    syncSelectedLessonLangWithSite();
    
    if (savedLayout) {
        app.currentLayout = savedLayout;
        // Обновляем отображение кнопки раскладки
        const layoutBtn = DOM.get('currentLayout');
        if (layoutBtn) {
            layoutBtn.textContent = app.currentLayout === 'ru' ? 'РУС' : app.currentLayout === 'en' ? 'ENG' : 'УКР';
        }
    }
    
    if (savedSound !== null) {
        app.soundEnabled = savedSound === 'true';
    }
    
    if (savedAnimations !== null) {
        app.animationsEnabled = savedAnimations === 'true';
        applyAnimationsSetting();
    }
    var savedBgMusic = localStorage.getItem('bgMusic');
    if (savedBgMusic !== null) app.bgMusicEnabled = savedBgMusic === 'true';
    updateBgMusicIcon();
    updateSoundToggleIcon();
    if (app.bgMusicEnabled) setTimeout(function() { startBgMusic(); }, 300);
}

// Initialize UI event listeners - ОПТИМИЗИРОВАНА
function initializeUI() {
    // Theme toggle
    const themeToggle = DOM.get('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    
    // Language toggle
    const langToggle = DOM.get('langToggle');
    if (langToggle) langToggle.addEventListener('click', toggleLanguage);
    
    // Layout toggle
    const layoutToggle = DOM.get('layoutToggle');
    if (layoutToggle) layoutToggle.addEventListener('click', toggleLayout);
    
    // Sound toggle
    const soundToggle = DOM.get('soundToggle');
    if (soundToggle) soundToggle.addEventListener('click', toggleSound);
    
    // Background music toggle
    const bgMusicToggle = DOM.get('bgMusicToggle');
    if (bgMusicToggle) bgMusicToggle.addEventListener('click', toggleBgMusic);
    
    // Animations toggle
    const animationsToggle = DOM.get('animationsToggle');
    if (animationsToggle) animationsToggle.addEventListener('click', toggleAnimations);
    
    // Портал: выпадающее меню «О проекте» / «Отзывы»
    const sitePortalBtn = document.getElementById('sitePortalBtn');
    const sitePortalDropdown = document.getElementById('sitePortalDropdown');
    if (sitePortalBtn && sitePortalDropdown) {
        sitePortalBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var open = !sitePortalDropdown.classList.contains('hidden');
            sitePortalDropdown.classList.toggle('hidden', open);
            sitePortalBtn.setAttribute('aria-expanded', !open);
        });
        document.addEventListener('click', function (e) {
            if (!e.target.closest('#sitePortalWrap')) {
                sitePortalDropdown.classList.add('hidden');
                sitePortalBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }
    
    // Keyboard input - используем passive для лучшей производительности
    document.addEventListener('keydown', handleKeyPress, { passive: false });
    // Global hotkeys: Esc - close modal, Enter/R - repeat when results open
    document.addEventListener('keydown', handleGlobalHotkeys);
}

function isInputFocused() {
    const el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

function isModalVisible(id) {
    const el = document.getElementById(id);
    return el && !el.classList.contains('hidden') && el.classList.contains('flex');
}

function isAnyModalVisible() {
    return isModalVisible('onboardingOverlay') || isModalVisible('levelUpTitr') || isModalVisible('levelUpModal') ||
        isModalVisible('levelListModal') || isModalVisible('resultsModal') || isModalVisible('freeModeModal') || isModalVisible('loginModal');
}

function closeTopModal() {
    if (isModalVisible('onboardingOverlay')) { finishOnboarding(); return; }
    if (isModalVisible('levelUpTitr')) { finishLevelUpTitr(); return; }
    if (isModalVisible('levelUpModal')) { closeLevelUpModal(); return; }
    if (isModalVisible('levelListModal')) { closeLevelListModal(); return; }
    if (isModalVisible('resultsModal')) { closeResults(); return; }
    if (isModalVisible('freeModeModal')) { closeFreeModeModal(); return; }
    if (isModalVisible('loginModal')) { closeLoginModal(); return; }
}

// ── Автообновление при новом деплое (version.json + service worker) ─────────
var __zoobDeployPollTimer = null;
var __zoobDeployBaseline = null;

function _parseDeployBuild(data) {
    if (!data || data.build == null) return null;
    var b = Number(data.build);
    return isFinite(b) ? b : null;
}

function showAppUpdateOverlay() {
    var el = document.getElementById('appUpdateOverlay');
    if (!el) return;
    var lang = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'ru';
    var title = el.querySelector('[data-update-title]');
    var sub = el.querySelector('[data-update-sub]');
    if (title) {
        title.textContent = lang === 'en' ? 'Updating…' : 'Сайт обновляется';
    }
    if (sub) {
        sub.textContent = lang === 'en'
            ? 'Please wait - loading the new version.'
            : 'Подождите, загружается новая версия…';
    }
    el.classList.add('is-visible');
}

/** Сброс кэшей SW и перезагрузка (после оверлея). */
function performAppHardReload() {
    if (window.__zoobUpdateReloading) return;
    window.__zoobUpdateReloading = true;
    showAppUpdateOverlay();
    var go = function () {
        window.location.reload();
    };
    setTimeout(function () {
        if ('caches' in window) {
            caches.keys().then(function (keys) {
                return Promise.all(keys.map(function (k) { return caches.delete(k); }));
            }).catch(function () {}).finally(function () {
                if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
                    navigator.serviceWorker.getRegistrations().then(function (regs) {
                        return Promise.all(regs.map(function (r) { return r.unregister(); }));
                    }).catch(function () {}).finally(go);
                } else {
                    go();
                }
            });
        } else if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
            navigator.serviceWorker.getRegistrations().then(function (regs) {
                return Promise.all(regs.map(function (r) { return r.unregister(); }));
            }).catch(function () {}).finally(go);
        } else {
            go();
        }
    }, 400);
}

function fetchDeployBuild() {
    return fetch('./version.json?b=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
}

function initDeployVersionCheck() {
    if (__zoobDeployPollTimer) clearInterval(__zoobDeployPollTimer);
    // Базовый build задаётся до вызова - см. fetch версии перед initializeAudio
    setTimeout(function () {
        __zoobDeployPollTimer = setInterval(function () {
            if (window.__zoobUpdateReloading) return;
            fetchDeployBuild().then(function (d) {
                var nb = _parseDeployBuild(d);
                if (nb == null || __zoobDeployBaseline == null) return;
                if (nb > __zoobDeployBaseline) {
                    performAppHardReload();
                }
            });
        }, 45000);
    }, 20000);
}

function handleGlobalHotkeys(e) {
    if (e.key === 'Escape') {
        if (isAnyModalVisible()) {
            closeTopModal();
        }
        return;
    }
    // Пробел не должен «нажимать» сфокусированную кнопку «Повторить» в модалке результатов
    if (e.key === ' ' && isModalVisible('resultsModal')) {
        e.preventDefault();
        return;
    }
    if (isInputFocused()) return;
    // Guard: ignore hotkeys fired within 500 ms of practice finishing to prevent
    // the very keystroke that typed the last character from instantly repeating the round.
    const justFinished = app.practiceFinishedAt && (Date.now() - app.practiceFinishedAt < 500);
    if (e.key === 'Enter') {
        if (justFinished) return;
        if (isModalVisible('resultsModal')) { e.preventDefault(); repeatPractice(); return; }
        if (isModalVisible('levelUpModal')) { e.preventDefault(); closeLevelUpModal(); return; }
    }
    // Физическая клавиша R (KeyR) - работает при любой раскладке (RU/EN/UA).
    if (e.code === 'KeyR') {
        if (e.ctrlKey || e.metaKey) return;
        if (justFinished) return;
        if (isModalVisible('resultsModal')) { e.preventDefault(); repeatPractice(); return; }
    }
}

// Update footer background image based on theme
function updateFooterBackground() {
    const footer = document.getElementById('footer');
    if (!footer) return;
    
    const isDark = app.theme === 'dark' || document.documentElement.classList.contains('dark');
    const imagePath = isDark 
        ? 'assets/images/contact_black.jpg' 
        : 'assets/images/contact_white.jpg';
    
    footer.style.backgroundImage = `url('${imagePath}')`;
}

// Theme toggle: прогрев фонов + один кадр без transition на всём дереве (меньше jank от backdrop-filter)
function toggleTheme() {
    if (app.soundEnabled && audioThemeTransition) {
        audioThemeTransition.currentTime = 0;
        audioThemeTransition.play().catch(() => {});
    }

    var nextTheme = app.theme === 'dark' ? 'light' : 'dark';
    var nextBg = resolveBackgroundForTheme(nextTheme);
    var footerPath = nextTheme === 'dark'
        ? 'assets/images/contact_black.jpg'
        : 'assets/images/contact_white.jpg';
    var warm = [footerPath];
    if (nextBg && nextBg.path) warm.push(nextBg.path);

    warmImageUrls(warm, function () {
        document.documentElement.classList.add('zoob-theme-switching');
        requestAnimationFrame(function () {
            app.theme = nextTheme;
            document.documentElement.classList.toggle('dark', app.theme === 'dark');
            localStorage.setItem('theme', app.theme);
            applyBackgroundToPage();
            updateFooterBackground();

            const icon = DOM.get('themeIcon');
            if (icon) {
                if (app.theme === 'dark') {
                    icon.innerHTML = '<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />';
                } else {
                    icon.innerHTML = '<path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />';
                }
            }

            requestAnimationFrame(function () {
                document.documentElement.classList.remove('zoob-theme-switching');
            });
        });
    });
}

/** localStorage мог хранить `uk` (ISO); в коде везде `ua` для украинского UI */
function normalizeSiteLangFromStorage(savedLang) {
    if (!savedLang) return 'ru';
    if (savedLang === 'uk') return 'ua';
    if (savedLang === 'ru' || savedLang === 'en' || savedLang === 'ua') return savedLang;
    return 'ru';
}

/** Атрибут `lang` у &lt;html&gt;: для украинского - BCP47 `uk` */
function siteLangHtmlAttr() {
    if (app.lang === 'en') return 'en';
    if (app.lang === 'ua') return 'uk';
    return 'ru';
}

function syncSiteLanguageUI() {
    try {
        document.documentElement.setAttribute('data-lang', app.lang || 'ru');
        document.documentElement.setAttribute('lang', siteLangHtmlAttr());
    } catch (e) {}
    const langEl = DOM.get('currentLang');
    if (langEl) {
        langEl.textContent = app.lang === 'ua' ? 'UA' : (app.lang || 'ru').toUpperCase();
    }
}

// Language toggle: RU → EN → UA → RU
function toggleLanguage() {
    if (app.soundEnabled && audioClickLanguage) {
        audioClickLanguage.currentTime = 0;
        audioClickLanguage.play().catch(() => {});
    }
    const order = ['ru', 'en', 'ua'];
    var idx = order.indexOf(app.lang);
    if (idx < 0) idx = 0;
    app.lang = order[(idx + 1) % order.length];
    localStorage.setItem('lang', app.lang);
    syncSiteLanguageUI();
    syncSelectedLessonLangWithSite();
    updateTranslations();
    updateRoomSelectionUI();
    if (mpRoomSettingsMode === 'bot') refreshMpBotVoiceSelect();
    if (app.currentMode === 'lessons') {
        var _ll = document.getElementById('lessonsList');
        if (currentLevelData && _ll && !_ll.classList.contains('difficulty-grid')) {
            showLessonList(currentLevelData);
        } else {
            loadLessons();
        }
    }
}

// Layout toggle
function toggleLayout() {
    if (app.soundEnabled && audioClickLanguage) {
        audioClickLanguage.currentTime = 0;
        audioClickLanguage.play().catch(() => {});
    }
    // Циклическое переключение: ru -> en -> ua -> ru
    const layouts = ['ru', 'en', 'ua'];
    const currentIndex = layouts.indexOf(app.currentLayout);
    app.currentLayout = layouts[(currentIndex + 1) % layouts.length];
    
    localStorage.setItem('layout', app.currentLayout);
    const layoutText = app.currentLayout === 'ru' ? 'РУС' : app.currentLayout === 'en' ? 'ENG' : 'УКР';
    const layoutEl = DOM.get('currentLayout');
    if (layoutEl) layoutEl.textContent = layoutText;
    
    // Обновляем клавиатуру с новой раскладкой
    window.keyboardModule.render(app.currentLayout);
    
    // Если мы в режиме практики, обновляем подсветку текущей клавиши
    if (app.currentMode === 'practice' && app.currentPosition < app.currentText.length) {
        const currentChar = app.currentText[app.currentPosition];
        window.keyboardModule.highlightStatic(currentChar);
    }
}

// Фоновая музыка (violin_2.ogg → violin.mp3 → violin_1.mp3 по кругу, продолжение с места паузы)
function startBgMusic() {
    if (!app.bgMusicEnabled || !BG_MUSIC_TRACKS.length) return;
    if (bgMusicAudio) {
        var trackIndex = bgMusicPausedTrackIndex;
        var seekTo = bgMusicPausedAt;
        bgMusicAudio.src = soundAssetUrl(BG_MUSIC_TRACKS[trackIndex]);
        bgMusicTrackIndex = trackIndex;
        bgMusicAudio.volume = BG_MUSIC_VOLUME;
        bgMusicAudio.currentTime = seekTo;
        bgMusicAudio.play().catch(function() {});
        return;
    }
    bgMusicAudio = new Audio(soundAssetUrl(BG_MUSIC_TRACKS[0]));
    bgMusicAudio.volume = BG_MUSIC_VOLUME;
    bgMusicAudio.addEventListener('ended', function() {
        if (!app.bgMusicEnabled) return;
        bgMusicTrackIndex = (bgMusicTrackIndex + 1) % BG_MUSIC_TRACKS.length;
        bgMusicPausedTrackIndex = bgMusicTrackIndex;
        bgMusicPausedAt = 0;
        bgMusicAudio.src = soundAssetUrl(BG_MUSIC_TRACKS[bgMusicTrackIndex]);
        bgMusicAudio.play().catch(function() {});
    });
    bgMusicTrackIndex = 0;
    bgMusicPausedTrackIndex = 0;
    bgMusicPausedAt = 0;
    bgMusicAudio.src = soundAssetUrl(BG_MUSIC_TRACKS[0]);
    bgMusicAudio.play().catch(function() {});
}

function stopBgMusic() {
    if (bgMusicAudio) {
        bgMusicPausedAt = bgMusicAudio.currentTime;
        bgMusicPausedTrackIndex = bgMusicTrackIndex;
        bgMusicAudio.pause();
    }
}

function updateBgMusicIcon() {
    var icon = document.getElementById('bgMusicIcon');
    var btn = document.getElementById('bgMusicToggle');
    if (icon) {
        var path = 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z';
        icon.innerHTML = app.bgMusicEnabled ? '<path d="' + path + '"/>' : '<path d="' + path + '" opacity="0.5"/>';
    }
    if (btn) btn.disabled = !app.soundEnabled;
}

function toggleBgMusic() {
    app.bgMusicEnabled = !app.bgMusicEnabled;
    try { localStorage.setItem('bgMusic', app.bgMusicEnabled); } catch (e) {}
    updateBgMusicIcon();
    if (app.bgMusicEnabled) startBgMusic();
    else stopBgMusic();
}

// Sound toggle
function toggleSound() {
    app.soundEnabled = !app.soundEnabled;
    localStorage.setItem('sound', app.soundEnabled);
    if (app.soundEnabled && audioOnSound) {
        audioOnSound.currentTime = 0;
        audioOnSound.play().catch(() => {});
        if (app.bgMusicEnabled) startBgMusic();
    } else {
        welcomePlayed = true;
        if (_welcomeEndedHandler && audioWelcome) {
            audioWelcome.removeEventListener('ended', _welcomeEndedHandler);
            _welcomeEndedHandler = null;
        }
        stopBgMusic();
        if (audioOffSound) {
            audioOffSound.currentTime = 0;
            audioOffSound.play().catch(() => {});
        }
        if (audioWelcome) {
            audioWelcome.pause();
            audioWelcome.currentTime = 0;
        }
    }
    updateBgMusicIcon();
    updateSoundToggleIcon();
}

// Apply animations setting to body
function applyAnimationsSetting() {
    if (app.animationsEnabled) {
        document.body.classList.remove('no-animations');
    } else {
        document.body.classList.add('no-animations');
        // Удаляем все частицы если анимации отключены
        const particles = document.querySelectorAll('.particle');
        particles.forEach(p => p.remove());
    }
    // Обновляем иконку
    const icon = DOM.get('animationsIcon');
    if (icon) {
        if (app.animationsEnabled) {
            // Иконка включенных анимаций (play/pause)
            icon.innerHTML = '<path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />';
        } else {
            // Иконка отключенных анимаций (стоп)
            icon.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" />';
        }
    }
}

// Animations toggle
function toggleAnimations() {
    if (app.soundEnabled && audioSwipeAnimation) {
        audioSwipeAnimation.currentTime = 0;
        audioSwipeAnimation.play().catch(() => {});
    }
    app.animationsEnabled = !app.animationsEnabled;
    localStorage.setItem('animations', app.animationsEnabled);
    applyAnimationsSetting();
    
    // Если анимации включили, создаём частицы
    if (app.animationsEnabled) {
        createParticles();
    }
    
    // Показываем уведомление
    const message = app.animationsEnabled 
        ? t('animationsOn') 
        : t('animationsOff');
    showToast(message, 'info', '');
}

// Update all translations
function updateTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[app.lang] && translations[app.lang][key]) {
            el.textContent = translations[app.lang][key];
        }
    });
    
    // Обновляем title атрибуты
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (translations[app.lang] && translations[app.lang][key]) {
            el.setAttribute('title', translations[app.lang][key]);
        }
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria-label');
        if (translations[app.lang] && translations[app.lang][key]) {
            el.setAttribute('aria-label', translations[app.lang][key]);
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[app.lang] && translations[app.lang][key]) {
            el.setAttribute('placeholder', translations[app.lang][key]);
        }
    });
    updateResultsModalHotkeysHint();
    if (window.levelModule) renderLevelBlock();
    if (window.achievementsModule && typeof window.achievementsModule.render === 'function') {
        window.achievementsModule.render('achievementsBlock');
    }
    if (typeof window.__siteStatsRefreshModal === 'function') window.__siteStatsRefreshModal();
    if (typeof window.__siteStatsUpdateUI === 'function' && typeof window.__siteStatsVisits !== 'undefined') {
        window.__siteStatsUpdateUI(window.__siteStatsVisits, window.__siteStatsOnline);
    }
    if (typeof refreshMpRoomSettingsChrome === 'function') refreshMpRoomSettingsChrome();
    if (mpRoomSettingsMode === 'bot' && typeof refreshMpBotVoiceSelect === 'function') refreshMpBotVoiceSelect();
    if (typeof updateAuthHudBar === 'function') updateAuthHudBar();
    var _ps = document.getElementById('profileScreen');
    if (_ps && !_ps.classList.contains('hidden') && typeof showProfileTab === 'function') {
        showProfileTab(_lastProfileTab);
    }
    var _lvlList = document.getElementById('levelListModal');
    if (_lvlList && !_lvlList.classList.contains('hidden') && typeof fillLevelListModal === 'function') {
        fillLevelListModal();
    }
    var _mascotW = document.getElementById('homeMascotWidget');
    var _mascotB = document.getElementById('homeMascotBubble');
    if (_mascotW && _mascotB && !_mascotW.classList.contains('hidden') && _homeMascotCurrentKey && typeof t === 'function') {
        _mascotB.textContent = t(_homeMascotCurrentKey);
    }
    refreshLessonLangButtonStyles();
    if (typeof updateLessonFilterHint === 'function') updateLessonFilterHint();
    if (typeof updateGuestPromisedHeader === 'function') updateGuestPromisedHeader();
    if (typeof syncAuthPasswordToggleTitles === 'function') syncAuthPasswordToggleTitles();
    /* Сетка глав: подзаголовок и хаб заполняются из JS, не data-i18n - подтягиваем при смене языка сайта */
    if (app.currentMode === 'lessons') {
        var _llGrid = document.getElementById('lessonsList');
        if (_llGrid && _llGrid.classList.contains('difficulty-grid') && typeof syncLessonsSagaDifficultyScreen === 'function') {
            syncLessonsSagaDifficultyScreen();
        }
    }
}

// Navigation functions
// Show/hide footer
function toggleFooter(show) {
    const footer = document.getElementById('footer') || document.querySelector('footer');
    if (footer) {
        if (show) {
            footer.classList.remove('hidden');
        } else {
            footer.classList.add('hidden');
        }
    }
}

function showHome() {
    DOM.clear(); // Invalidate stale element references after screen switch.
    hideAllScreens();
    // Leaving multiplayer via "Back" hides #multiplayerMainMenu while dialogs close; restore so next visit is not empty.
    const mpMain = document.getElementById('multiplayerMainMenu');
    if (mpMain) mpMain.classList.remove('hidden');
    const homeScreen = DOM.get('homeScreen');
    if (homeScreen) homeScreen.classList.remove('hidden');
    app.currentMode = 'home';
    createParticles();
    toggleFooter(true); // Показываем футер на главной странице
    if (window.statsModule) window.statsModule.updateDisplay();
    if (window.achievementsModule) window.achievementsModule.render('achievementsBlock');
    if (window.levelModule) renderLevelBlock();
    scheduleHomeMascot();
}

function showLessons() {
    playMenuClickSound();
    hideAllScreens();
    const lessonsScreen = DOM.get('lessonsScreen');
    if (lessonsScreen) lessonsScreen.classList.remove('hidden');
    app.currentMode = 'lessons';
    syncSelectedLessonLangWithSite();
    refreshLessonLangButtonStyles();
    loadLessons();
    toggleFooter(false); // Скрываем футер в разделе уроков
}

const FREE_MODE_THEME_KEY = 'zoobastiks_free_mode_theme';
const FREE_MODE_CHARSET_KEY = 'zoobastiks_free_mode_charset';
const FREE_MODE_LENGTH_KEY = 'zoobastiks_free_mode_len';

// Show free mode modal
function showFreeMode() {
    playMenuClickSound();
    const modal = DOM.get('freeModeModal');
    const textInput = DOM.get('freeModeTextInput');
    const themeSelect = DOM.get('freeModeThemeSelect');
    if (modal && textInput) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        textInput.value = '';
        if (themeSelect) {
            var saved = localStorage.getItem(FREE_MODE_THEME_KEY);
            if (saved && [].slice.call(themeSelect.options).some(function (o) { return o.value === saved; })) {
                themeSelect.value = saved;
            }
            themeSelect.removeEventListener('change', saveFreeModeTheme);
            themeSelect.addEventListener('change', saveFreeModeTheme);
        }
        var charsetSel = DOM.get('freeModeCharsetSelect');
        var lenSel = DOM.get('freeModeLengthSelect');
        try {
            if (charsetSel) {
                var sc = localStorage.getItem(FREE_MODE_CHARSET_KEY);
                if (sc && ['letters', 'alnum', 'digits'].indexOf(sc) >= 0) charsetSel.value = sc;
            }
            if (lenSel) {
                var sl = localStorage.getItem(FREE_MODE_LENGTH_KEY);
                if (sl && [].slice.call(lenSel.options).some(function (o) { return o.value === sl; })) lenSel.value = sl;
            }
        } catch (_e) {}
        if (charsetSel) {
            charsetSel.removeEventListener('change', saveFreeModeGeneratorPrefs);
            charsetSel.addEventListener('change', saveFreeModeGeneratorPrefs);
        }
        if (lenSel) {
            lenSel.removeEventListener('change', saveFreeModeGeneratorPrefs);
            lenSel.addEventListener('change', saveFreeModeGeneratorPrefs);
        }
        textInput.focus();
        updateFreeModeCharCount();
        
        // Добавляем обработчик для подсчета символов
        textInput.addEventListener('input', updateFreeModeCharCount);
        
        // Закрытие по клику вне модального окна
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeFreeModeModal();
            }
        };
        
        // Закрытие по Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeFreeModeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
}

// Close free mode modal
function closeFreeModeModal() {
    const modal = DOM.get('freeModeModal');
    const textInput = DOM.get('freeModeTextInput');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    if (textInput) {
        textInput.removeEventListener('input', updateFreeModeCharCount);
    }
}

// Update character count in free mode modal
function updateFreeModeCharCount() {
    const textInput = DOM.get('freeModeTextInput');
    const charCount = DOM.get('freeModeCharCount');
    if (textInput && charCount) {
        charCount.textContent = textInput.value.length;
    }
}

function saveFreeModeTheme() {
    var select = DOM.get('freeModeThemeSelect');
    if (select) localStorage.setItem(FREE_MODE_THEME_KEY, select.value);
}

function saveFreeModeGeneratorPrefs() {
    var charsetSel = DOM.get('freeModeCharsetSelect');
    var lenSel = DOM.get('freeModeLengthSelect');
    try {
        if (charsetSel && charsetSel.value) localStorage.setItem(FREE_MODE_CHARSET_KEY, charsetSel.value);
        if (lenSel && lenSel.value) localStorage.setItem(FREE_MODE_LENGTH_KEY, lenSel.value);
    } catch (_e) {}
}

function getFreeModeTargetLength() {
    var lenSel = DOM.get('freeModeLengthSelect');
    var n = lenSel ? parseInt(lenSel.value, 10) : 400;
    return Number.isFinite(n) && n > 0 ? n : 400;
}

function getThemedTextsLangKey() {
    return app.lang === 'en' ? 'en' : 'ru';
}

function getFreeModeAlphabetForLayout() {
    var L = app.currentLayout;
    if (L === 'en') return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (L === 'ua') return 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюяАБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ';
    return 'абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
}

function buildFreeModeCharPool(charsetMode) {
    if (charsetMode === 'digits') return '0123456789';
    var letters = getFreeModeAlphabetForLayout() + ' ';
    if (charsetMode === 'letters') return letters;
    if (charsetMode === 'alnum') return letters.replace(/\s/g, '') + '0123456789 ';
    return letters;
}

function generateFreeModeTextFromPool(pool, length) {
    if (!pool || pool.length === 0 || length < 1) return '';
    var s = '';
    for (var i = 0; i < length; i++) {
        s += pool.charAt(Math.floor(Math.random() * pool.length));
    }
    return s;
}

function loadGeneratedFreeModeText() {
    var charsetSel = DOM.get('freeModeCharsetSelect');
    var mode = charsetSel ? charsetSel.value : 'letters';
    if (['letters', 'alnum', 'digits'].indexOf(mode) < 0) mode = 'letters';
    var len = getFreeModeTargetLength();
    saveFreeModeGeneratorPrefs();
    var pool = buildFreeModeCharPool(mode);
    var text = generateFreeModeTextFromPool(pool, len);
    var textInput = DOM.get('freeModeTextInput');
    if (textInput) {
        textInput.value = text;
        updateFreeModeCharCount();
        textInput.focus();
    }
}

// Load a random text from the selected theme into free mode textarea (склеиваем фрагменты до целевой длины)
function loadThemedText() {
    var themes = window.THEMED_TEXTS;
    if (!themes) return;
    var lang = getThemedTextsLangKey();
    var data = themes[lang];
    if (!data) return;
    var select = DOM.get('freeModeThemeSelect');
    var themeId = select ? select.value : 'motivation';
    var theme = data[themeId];
    if (!theme || !theme.texts || theme.texts.length === 0) return;
    var lenTarget = getFreeModeTargetLength();
    var parts = [];
    var acc = '';
    var guard = 0;
    while (acc.length < lenTarget && guard < 120) {
        guard++;
        var piece = theme.texts[Math.floor(Math.random() * theme.texts.length)];
        parts.push(piece);
        acc = parts.join(' ');
    }
    var text = acc.length >= lenTarget ? acc : acc + ' ' + theme.texts[0];
    if (text.length > lenTarget + 80) text = text.slice(0, lenTarget + 40).replace(/\s+\S*$/, '').trim();
    var textInput = DOM.get('freeModeTextInput');
    if (textInput) {
        textInput.value = text;
        updateFreeModeCharCount();
        textInput.focus();
    }
    saveFreeModeTheme();
}

// Start free mode practice
function startFreeModePractice() {
    const textInput = DOM.get('freeModeTextInput');
    if (!textInput) return;
    
    const text = textInput.value.trim();
    if (!text) {
        showToast(t('enterYourText'), 'warning', '');
        textInput.focus();
        return;
    }
    
    if (text.length < 10) {
        const message = app.lang === 'ru' 
            ? 'Текст должен содержать минимум 10 символов' 
            : 'Text must contain at least 10 characters';
        showToast(message, 'warning', '');
        textInput.focus();
        return;
    }
    
    closeFreeModeModal();
    startPractice(text, 'free');
}

function showSpeedTest() {
    playMenuClickSound();
    const words = speedTestWords[app.currentLayout];
    
    // Если слов нет для текущей раскладки, используем английские
    if (!words || words.length === 0) {
        console.warn(`No speed test words for layout: ${app.currentLayout}, using English`);
        const fallbackWords = speedTestWords['en'] || [];
        const pool = shuffleArray(fallbackWords);
        const testWords = [];
        while (testWords.length < 100 && pool.length > 0) {
            testWords.push(pool.pop());
            if (pool.length === 0 && testWords.length < 100) {
                // Перемешиваем снова, если нужно добрать до 100 слов
                pool.push(...shuffleArray(fallbackWords));
            }
        }
        startPractice(testWords.join(' '), 'speedtest');
        return;
    }
    
    const testWords = [];
    let pool = shuffleArray(words);
    
    while (testWords.length < 100) {
        if (pool.length === 0) {
            pool = shuffleArray(words);
        }
        testWords.push(pool.pop());
    }
    
    startPractice(testWords.join(' '), 'speedtest');
}

function homeMascotGreetingKeys() {
    var keys = [];
    var n;
    for (n = 1; n <= HOME_MASCOT_HI_COUNT; n++) keys.push('homeMascotHi' + n);
    return keys;
}

function _homeMascotClearSlideListener(w) {
    if (!w || !_homeMascotSlideEndHandler) return;
    w.removeEventListener('transitionend', _homeMascotSlideEndHandler);
    _homeMascotSlideEndHandler = null;
}

function finalizeHomeMascotHidden() {
    if (_homeMascotAutoHideTimer) {
        clearTimeout(_homeMascotAutoHideTimer);
        _homeMascotAutoHideTimer = null;
    }
    var w = document.getElementById('homeMascotWidget');
    if (w) _homeMascotClearSlideListener(w);
    if (w) {
        w.classList.remove('home-mascot-widget--in', 'home-mascot-widget--leaving');
        w.classList.add('hidden');
        w.setAttribute('aria-hidden', 'true');
    }
}

function beginHomeMascotSlideOut() {
    var w = document.getElementById('homeMascotWidget');
    if (!w || w.classList.contains('hidden')) return;
    if (!w.classList.contains('home-mascot-widget--in')) return;
    if (_homeMascotAutoHideTimer) {
        clearTimeout(_homeMascotAutoHideTimer);
        _homeMascotAutoHideTimer = null;
    }
    _homeMascotClearSlideListener(w);
    _homeMascotSlideEndHandler = function (e) {
        if (e.propertyName !== 'transform') return;
        finalizeHomeMascotHidden();
    };
    w.addEventListener('transitionend', _homeMascotSlideEndHandler);
    w.classList.remove('home-mascot-widget--in');
    w.classList.add('home-mascot-widget--leaving');
    setTimeout(function () {
        if (w && !w.classList.contains('hidden') && w.classList.contains('home-mascot-widget--leaving')) {
            finalizeHomeMascotHidden();
        }
    }, 950);
}

function hideHomeMascotWidget() {
    if (_homeMascotIntroObs) {
        try { _homeMascotIntroObs.disconnect(); } catch (_e) {}
        _homeMascotIntroObs = null;
    }
    if (_homeMascotIntroFallbackTimer) {
        clearTimeout(_homeMascotIntroFallbackTimer);
        _homeMascotIntroFallbackTimer = null;
    }
    if (_homeMascotIntroPollTimer) {
        clearInterval(_homeMascotIntroPollTimer);
        _homeMascotIntroPollTimer = null;
    }
    if (_homeMascotSafetyTimer) {
        clearTimeout(_homeMascotSafetyTimer);
        _homeMascotSafetyTimer = null;
    }
    if (_homeMascotShowTimer) {
        clearTimeout(_homeMascotShowTimer);
        _homeMascotShowTimer = null;
    }
    if (_homeMascotAutoHideTimer) {
        clearTimeout(_homeMascotAutoHideTimer);
        _homeMascotAutoHideTimer = null;
    }
    var w = document.getElementById('homeMascotWidget');
    if (w) _homeMascotClearSlideListener(w);
    if (w) {
        w.classList.add('hidden');
        w.classList.remove('home-mascot-widget--in', 'home-mascot-widget--leaving');
        w.setAttribute('aria-hidden', 'true');
    }
}

function introOverlayEffectivelyGone() {
    var el = document.getElementById('introOverlay');
    if (!el || !el.isConnected) return true;
    var st = window.getComputedStyle(el);
    if (st.visibility === 'hidden') return true;
    if (st.display === 'none') return true;
    var op = parseFloat(st.opacity);
    if (!isNaN(op) && op < 0.05) return true;
    return false;
}

function whenIntroOverlayGone(cb) {
    if (typeof cb !== 'function') return;
    if (_homeMascotIntroObs) {
        try { _homeMascotIntroObs.disconnect(); } catch (_e2) {}
        _homeMascotIntroObs = null;
    }
    if (_homeMascotIntroFallbackTimer) {
        clearTimeout(_homeMascotIntroFallbackTimer);
        _homeMascotIntroFallbackTimer = null;
    }
    if (_homeMascotIntroPollTimer) {
        clearInterval(_homeMascotIntroPollTimer);
        _homeMascotIntroPollTimer = null;
    }
    var ov = document.getElementById('introOverlay');
    if (!ov) {
        setTimeout(cb, 0);
        return;
    }
    var done = false;
    function cleanupIntroWatchers() {
        if (_homeMascotIntroObs) {
            try { _homeMascotIntroObs.disconnect(); } catch (_e3) {}
            _homeMascotIntroObs = null;
        }
        if (_homeMascotIntroFallbackTimer) {
            clearTimeout(_homeMascotIntroFallbackTimer);
            _homeMascotIntroFallbackTimer = null;
        }
        if (_homeMascotIntroPollTimer) {
            clearInterval(_homeMascotIntroPollTimer);
            _homeMascotIntroPollTimer = null;
        }
    }
    function once() {
        if (done) return;
        done = true;
        cleanupIntroWatchers();
        cb();
    }
    if (introOverlayEffectivelyGone()) {
        _homeMascotIntroFallbackTimer = setTimeout(function () {
            _homeMascotIntroFallbackTimer = null;
            once();
        }, 380);
        return;
    }
    _homeMascotIntroObs = new MutationObserver(function () {
        if (introOverlayEffectivelyGone()) once();
    });
    _homeMascotIntroObs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    _homeMascotIntroPollTimer = setInterval(function () {
        if (introOverlayEffectivelyGone()) once();
    }, 200);
    _homeMascotIntroFallbackTimer = setTimeout(once, 13000);
}

function showHomeMascotWidget() {
    var w = document.getElementById('homeMascotWidget');
    var b = document.getElementById('homeMascotBubble');
    var img = document.getElementById('homeMascotImg');
    if (!w || !b) return;
    if (!w.classList.contains('hidden') && w.classList.contains('home-mascot-widget--in')) return;
    if (_homeMascotAutoHideTimer) {
        clearTimeout(_homeMascotAutoHideTimer);
        _homeMascotAutoHideTimer = null;
    }
    _homeMascotClearSlideListener(w);
    if (img) {
        var _mGif = soundAssetUrl('assets/animation/Girl_Horse_Sticker.gif');
        var _mPng = soundAssetUrl('assets/animation/Girl_Horse_Sticker.png');
        img.onerror = function () {
            if (img.getAttribute('data-mascot-fallback') === '1') return;
            img.setAttribute('data-mascot-fallback', '1');
            img.onerror = null;
            img.src = _mPng;
        };
        img.removeAttribute('data-mascot-fallback');
        img.src = _mGif;
    }
    var keys = homeMascotGreetingKeys();
    var k = keys[Math.floor(Math.random() * keys.length)];
    _homeMascotCurrentKey = k;
    b.textContent = typeof t === 'function' ? t(k) : '';
    w.classList.remove('hidden', 'home-mascot-widget--leaving');
    w.classList.remove('home-mascot-widget--in');
    w.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            w.classList.add('home-mascot-widget--in');
        });
    });
    var reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var visibleMs = reduced ? 2000 : 4000;
    _homeMascotAutoHideTimer = setTimeout(function () {
        _homeMascotAutoHideTimer = null;
        beginHomeMascotSlideOut();
    }, visibleMs);
}

function scheduleHomeMascot() {
    var gen = ++_homeMascotPipelineGen;
    _homeMascotShowPipelineDone = false;
    hideHomeMascotWidget();
    if (app.currentMode !== 'home') return;
    var homeEl = document.getElementById('homeScreen');
    if (!homeEl || homeEl.classList.contains('hidden')) return;

    whenIntroOverlayGone(function () {
        if (gen !== _homeMascotPipelineGen) return;
        if (app.currentMode !== 'home') return;
        var h = document.getElementById('homeScreen');
        if (!h || h.classList.contains('hidden')) return;
        var extra = 600 + Math.floor(Math.random() * 1000);
        _homeMascotShowTimer = setTimeout(function () {
            _homeMascotShowTimer = null;
            if (gen !== _homeMascotPipelineGen) return;
            if (app.currentMode !== 'home') return;
            var el = document.getElementById('homeScreen');
            if (!el || el.classList.contains('hidden')) return;
            if (_homeMascotShowPipelineDone) return;
            _homeMascotShowPipelineDone = true;
            showHomeMascotWidget();
        }, extra);
    });

    _homeMascotSafetyTimer = setTimeout(function () {
        _homeMascotSafetyTimer = null;
        if (gen !== _homeMascotPipelineGen) return;
        if (_homeMascotShowPipelineDone) return;
        if (app.currentMode !== 'home') return;
        var hs = document.getElementById('homeScreen');
        if (!hs || hs.classList.contains('hidden')) return;
        if (!(introOverlayEffectivelyGone() || !document.getElementById('introOverlay'))) return;
        _homeMascotShowPipelineDone = true;
        showHomeMascotWidget();
    }, 15500);
}

function initHomeMascotCloseButton() {
    var btn = document.getElementById('homeMascotClose');
    if (!btn || btn.getAttribute('data-mascot-bound') === '1') return;
    btn.setAttribute('data-mascot-bound', '1');
    btn.addEventListener('click', function () {
        beginHomeMascotSlideOut();
    });
}

function hideAllScreens() {
    hideHomeMascotWidget();
    const screens = [
        'homeScreen', 'lessonsScreen', 'practiceScreen',
        'multiplayerMenuScreen', 'multiplayerWaitingScreen', 'multiplayerGameScreen',
        'profileScreen', 'adminPanelScreen', 'shopScreen', 'collectibleScreen'
    ];
    
    screens.forEach(id => {
        const el = DOM.get(id);
        if (el) el.classList.add('hidden');
    });

    // Hide multiplayer dialogs/modals too (not included in .screens list above).
    ['roomSettingsDialog', 'joinRoomDialog', 'multiplayerResultsModal'].forEach(id => {
        const el = DOM.get(id);
        if (el) el.classList.add('hidden');
    });
}

/** Мова пулу уроків (RU/EN/UA) узгоджується з мовою інтерфейсу, поки користувач не змінить уручну. */
function syncSelectedLessonLangWithSite() {
    selectedLessonLang = app.lang === 'ua' ? 'ua' : app.lang === 'en' ? 'en' : 'ru';
}

function refreshLessonLangButtonStyles() {
    document.querySelectorAll('[id^="lessonLang"]').forEach(function (btn) {
        btn.className = 'w-full px-4 py-4 rounded-xl bg-gray-700/50 dark:bg-gray-800/50 hover:bg-gray-600/50 text-gray-300 font-bold text-lg transition-all transform hover:scale-105';
    });
    var cap = selectedLessonLang.charAt(0).toUpperCase() + selectedLessonLang.slice(1);
    var activeBtn = DOM.get('lessonLang' + cap);
    if (activeBtn) {
        activeBtn.className = 'w-full px-4 py-4 rounded-xl bg-gradient-to-br from-primary to-cyan-500 text-white font-bold text-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all transform hover:scale-105';
    }
}

// Select lesson language
function selectLessonLanguage(lang) {
    selectedLessonLang = lang;
    refreshLessonLangButtonStyles();
    loadLessons();
}

function chapterStoryKeyPart(level) {
    if (level === 'beginner' || level === 'medium' || level === 'advanced') {
        return level.charAt(0).toUpperCase() + level.slice(1);
    }
    return 'Beginner';
}

function tChapterField(level, field) {
    var key = 'chapter' + field + chapterStoryKeyPart(level);
    return typeof t === 'function' ? t(key) : '';
}

/** Ключ перевода эпизода саги по главе и номеру акта (0..5). */
function sagaBeatKeyForTier(levelKey, storyAct) {
    var i = Math.abs(storyAct) % 6;
    var part = levelKey === 'medium' ? 'Medium' : levelKey === 'advanced' ? 'Advanced' : 'Beginner';
    return 'sagaBeat' + part + i;
}

function hideLessonsChapterBriefing() {
    var b = document.getElementById('lessonsChapterBanner');
    if (b) {
        b.classList.add('hidden');
        b.setAttribute('aria-hidden', 'true');
    }
}

function syncLessonsSagaDifficultyScreen() {
    var titleEl = document.getElementById('lessonsScreenTitle');
    var subEl = document.getElementById('lessonsSagaSubtitle');
    var hubEl = document.getElementById('lessonsSagaHub');
    if (titleEl) titleEl.textContent = (typeof t === 'function' ? t('chooseDifficultyEpic') : '').toUpperCase();
    if (subEl) {
        subEl.textContent = typeof t === 'function' ? t('lessonsSagaCampaignLine') : '';
        subEl.classList.remove('hidden');
    }
    if (hubEl) {
        var progM = window.lessonProgressionModule;
        if (typeof t === 'function' && progM && typeof progM.getTierCompletion === 'function' && typeof progM.isTierUnlocked === 'function' && window.statsModule) {
            function hubLine(tier, labelKey) {
                var label = t(labelKey);
                if (!progM.isTierUnlocked(window.statsModule, tier, selectedLessonLang)) {
                    return label + ': ' + t('sagaHubLockedPiece');
                }
                var c = progM.getTierCompletion(window.statsModule, tier, selectedLessonLang);
                if (c.total > 0 && typeof trReplace === 'function') {
                    return label + ': ' + trReplace('sagaHubProgressPiece', { done: String(c.done), total: String(c.total) });
                }
                return label + ': 0 / 0';
            }
            hubEl.innerHTML =
                '<span class="lessons-saga-hub__title">' + escapeHtml(t('sagaHubPulseTitle')) + '</span>' +
                '<span class="lessons-saga-hub__line">' + escapeHtml(hubLine('beginner', 'sagaHubChapter1')) + '</span>' +
                '<span class="lessons-saga-hub__line">' + escapeHtml(hubLine('medium', 'sagaHubChapter2')) + '</span>' +
                '<span class="lessons-saga-hub__line">' + escapeHtml(hubLine('advanced', 'sagaHubChapter3')) + '</span>';
            hubEl.classList.remove('hidden');
        } else {
            hubEl.textContent = '';
            hubEl.classList.add('hidden');
        }
    }
}

function syncLessonsChapterBriefing(levelData, missionCount) {
    var lv = levelData && levelData.level;
    if (lv !== 'beginner' && lv !== 'medium' && lv !== 'advanced') lv = 'beginner';
    var banner = document.getElementById('lessonsChapterBanner');
    if (!banner) return;
    banner.classList.remove('chapter-briefing--beginner', 'chapter-briefing--medium', 'chapter-briefing--advanced');
    banner.classList.add('chapter-briefing--' + lv);
    var titleStory = tChapterField(lv, 'Title');
    var aria = (typeof t === 'function' ? t('chapterBannerAriaFallback') : '') + ' ' + titleStory;
    banner.setAttribute('aria-label', aria.trim());
    var cn = document.getElementById('chapterBannerCodename');
    var tl = document.getElementById('chapterBannerTitle');
    var hk = document.getElementById('chapterBannerHook');
    var ob = document.getElementById('chapterBannerObjective');
    if (cn) cn.textContent = tChapterField(lv, 'Codename');
    if (tl) tl.textContent = titleStory;
    if (hk) hk.textContent = tChapterField(lv, 'Hook');
    if (ob) {
        var goal = tChapterField(lv, 'Objective');
        ob.textContent = typeof trReplace === 'function'
            ? trReplace('chapterBriefingCombinedObjective', { n: String(missionCount), goal: goal })
            : (String(missionCount) + ' ' + goal);
    }
    var trk = document.getElementById('chapterBannerTrack');
    if (trk) {
        var progM = window.lessonProgressionModule;
        if (progM && typeof progM.getTierCompletion === 'function' && window.statsModule && typeof trReplace === 'function') {
            var tc = progM.getTierCompletion(window.statsModule, lv, selectedLessonLang);
            if (tc.total > 0) {
                trk.textContent = trReplace('chapterBriefingTrackLine', { done: String(tc.done), total: String(tc.total) });
                trk.classList.remove('hidden');
            } else {
                trk.textContent = '';
                trk.classList.add('hidden');
            }
        } else {
            trk.textContent = '';
            trk.classList.add('hidden');
        }
    }
    banner.classList.remove('hidden');
    banner.setAttribute('aria-hidden', 'false');
}

// Load lessons - ОПТИМИЗИРОВАНА с DocumentFragment
function loadLessons() {
    const container = DOM.get('lessonsList');
    if (!container) return;

    hideLessonsChapterBriefing();
    syncLessonsSagaDifficultyScreen();
    
    const levels = ['beginner', 'medium', 'advanced'];
    const fragment = document.createDocumentFragment();
    
    // Получаем купленные уроки
    const user = window.authModule?.getCurrentUser();
    const purchasedLessons = user?.purchasedLessons || [];
    
    for (const level of levels) {
        const data = LESSONS_DATA[level];
        if (!data) continue;
        
        // Filter lessons by selected language
        let lessonsForLang = data.lessons.filter(l => l.layout === selectedLessonLang);
        
        // Добавляем купленные уроки из магазина
        if (window.shopModule && purchasedLessons.length > 0) {
            purchasedLessons.forEach(lessonId => {
                const shopLesson = window.shopModule.getLessonById(lessonId);
                if (shopLesson && shopLesson.layout === selectedLessonLang) {
                    // Определяем уровень сложности
                    let lessonLevel = 'beginner';
                    if (shopLesson.difficulty === 'hard') lessonLevel = 'advanced';
                    else if (shopLesson.difficulty === 'medium') lessonLevel = 'medium';
                    
                    // Добавляем только если это текущий уровень
                    if (lessonLevel === level) {
                        lessonsForLang.push({
                            ...shopLesson,
                            id: shopLesson.id,
                            isShopLesson: true
                        });
                    }
                }
            });
        }
        
        if (lessonsForLang.length === 0) continue;
        
        const card = document.createElement('div');
        var progM = window.lessonProgressionModule;
        var tierOpen = !progM || typeof progM.isTierUnlocked !== 'function' || progM.isTierUnlocked(window.statsModule, level, selectedLessonLang);
        card.className = `difficulty-card difficulty-card--saga difficulty-card--${level}` + (tierOpen ? '' : ' difficulty-card--locked');
        if (tierOpen) {
            card.onclick = () => showLessonList({ ...data, lessons: lessonsForLang });
        } else {
            card.onclick = function (ev) {
                if (ev) { ev.preventDefault(); ev.stopPropagation(); }
                var msg = level === 'medium' ? t('tierLockedToastMedium') : t('tierLockedToastAdvanced');
                showToast(msg, 'info', t('tip'));
            };
        }
        
        var levelTitleKey = level === 'beginner' ? 'difficultyBeginner' : level === 'medium' ? 'difficultyMedium' : 'difficultyAdvanced';
        const levelName = typeof t === 'function' ? t(levelTitleKey) : (app.lang === 'en' ? data.name_en : (app.lang === 'ua' ? (data.name_ua || data.name_ru) : data.name_ru));
        const levelIcons = { beginner: '🌱', medium: '⚡', advanced: '🔥' };
        const levelNumbers = { beginner: '01', medium: '02', advanced: '03' };
        const lessonsLabel = app.lang === 'ru' ? 'уроков' : app.lang === 'en' ? 'lessons' : 'уроків';
        const badgeText = `${lessonsForLang.length} ${lessonsLabel.toUpperCase()}`;
        var codename = tChapterField(level, 'Codename');
        var cardHook = tChapterField(level, 'CardHook');
        var lockStripHtml = '';
        var lockVeilHtml = '';
        if (!tierOpen) {
            var preTier = level === 'medium' ? 'beginner' : 'medium';
            var pr = progM && typeof progM.getTierCompletion === 'function'
                ? progM.getTierCompletion(window.statsModule, preTier, selectedLessonLang)
                : { done: 0, total: 0 };
            var pct = pr.total > 0 ? Math.min(100, Math.round((pr.done / pr.total) * 100)) : 0;
            var progLine = pr.total > 0 && typeof trReplace === 'function'
                ? trReplace('tierLockProgressLine', { done: String(pr.done), total: String(pr.total) })
                : '';
            var hintKey = level === 'medium' ? 'tierLockCardHintMedium' : 'tierLockCardHintAdvanced';
            var hintText = typeof t === 'function' ? t(hintKey) : '';
            var veilLabel = typeof t === 'function' ? t('tierLockVeilLabel') : '';
            var teaserKey = level === 'medium' ? 'tierLockTeaserMedium' : 'tierLockTeaserAdvanced';
            var teaserText = typeof t === 'function' ? t(teaserKey) : '';
            lockVeilHtml =
                '<div class="difficulty-card__lock-veil" aria-hidden="true">' +
                '<span class="difficulty-card__lock-scan"></span>' +
                '<div class="difficulty-card__lock-ring difficulty-card__lock-ring--' + level + '">' +
                '<svg class="difficulty-card__lock-svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
                '<path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>' +
                '</svg></div>' +
                '<span class="difficulty-card__lock-label">' + escapeHtml(veilLabel) + '</span>' +
                '</div>';
            lockStripHtml =
                '<div class="difficulty-card__lock-strip">' +
                '<span class="difficulty-card__locked-tag difficulty-card__locked-tag--strip">' + escapeHtml(typeof t === 'function' ? t('difficultyCardLocked') : '') + '</span>' +
                (pr.total > 0
                    ? '<div class="difficulty-card__lock-meter" role="presentation"><span class="difficulty-card__lock-meter-fill" style="width:' + pct + '%"></span></div>' +
                      '<p class="difficulty-card__lock-progress">' + escapeHtml(progLine) + '</p>'
                    : '') +
                '<p class="difficulty-card__lock-teaser">' + escapeHtml(teaserText) + '</p>' +
                '<p class="difficulty-card__lock-hint">' + escapeHtml(hintText) + '</p>' +
                '</div>';
        }

        card.innerHTML = `
            <div class="difficulty-card__particles" aria-hidden="true"></div>
            <div class="difficulty-card__accent">
                <span class="difficulty-card__number">${levelNumbers[level]}</span>
            </div>
            <div class="difficulty-card__inner">
                <span class="difficulty-card__codename">${escapeHtml(codename)}</span>
                <div class="difficulty-card__icon-wrap">
                    <span class="difficulty-card__icon">${levelIcons[level]}</span>
                </div>
                <h3 class="difficulty-card__title">${escapeHtml(levelName)}</h3>
                <p class="difficulty-card__hook">${escapeHtml(cardHook)}</p>
                <span class="difficulty-card__badge">${escapeHtml(badgeText)}</span>
                ${lockStripHtml}
            </div>
            ${lockVeilHtml}
        `;
        
        fragment.appendChild(card);
    }
    
    var filterBar = document.getElementById('lessonDurationFilterBar');
    if (filterBar) filterBar.classList.add('hidden');
    container.classList.add('difficulty-grid');
    container.innerHTML = '';
    container.appendChild(fragment);
}

function _isLessonBeginnerish(lesson) {
    return !!(lesson && (lesson.level === 'beginner' || lesson.difficulty === 'easy'));
}

/**
 * Третий чип на карточке урока: эмоция/миссия вместо длины в символах (длина - в фильтре сверху).
 */
function getLessonCardVibe(lesson, lessonDifficulty, levelTier) {
    var tier = levelTier || 'beginner';
    var diff = lessonDifficulty || 'easy';
    var isHard = diff === 'hard' || diff === 'advanced';
    var isMed = diff === 'medium';

    if (lesson && lesson.fixedText === true) {
        return { key: 'lessonVibeExact', hintKey: 'lessonVibeHintExact', tone: 'exact' };
    }
    if (lesson && lesson.digitsOnly === true) {
        if (isHard || tier === 'advanced') {
            return { key: 'lessonVibeDigitsMarathon', hintKey: 'lessonVibeHintDigitsMarathon', tone: 'epic' };
        }
        if (isMed || tier === 'medium') {
            return { key: 'lessonVibeDigitsGrind', hintKey: 'lessonVibeHintDigitsGrind', tone: 'rush' };
        }
        return { key: 'lessonVibeDigitsSprint', hintKey: 'lessonVibeHintDigitsSprint', tone: 'digits' };
    }
    if (isHard || tier === 'advanced') {
        return { key: 'lessonVibeBoss', hintKey: 'lessonVibeHintBoss', tone: 'boss' };
    }
    if (isMed || tier === 'medium') {
        return { key: 'lessonVibeRush', hintKey: 'lessonVibeHintRush', tone: 'rush' };
    }
    return { key: 'lessonVibeWarmup', hintKey: 'lessonVibeHintWarmup', tone: 'calm' };
}

/**
 * Верхняя оценка длины текста в практике (символов) - для фильтров «до N символов».
 * Должна совпадать с тем, что реально получает пользователь в startPractice (верхняя граница).
 */
function estimateLessonCharMaxForFilter(lesson) {
    if (!lesson) return 9999;
    var text = typeof lesson.text === 'string' ? lesson.text : String(lesson.text || '');
    var trimmed = text.trim();
    var layout = lesson.layout || 'ru';
    var beg = _isLessonBeginnerish(lesson);

    if (lesson.fixedText === true) {
        return trimmed.length || 9999;
    }
    if (lesson.digitsOnly === true) {
        if (lesson.difficulty === 'medium') return 700;
        if (lesson.difficulty === 'hard') return 900;
        return trimmed.length || 9999;
    }
    if (beg) {
        return 200;
    }
    if ((layout === 'ru' || layout === 'en') && trimmed.length > 0) {
        var minC = Math.max(120, Math.round(trimmed.length * 0.75));
        var maxC = Math.min(4500, Math.max(minC + 40, Math.round(trimmed.length * 1.08)));
        return maxC;
    }
    return trimmed.length || 9999;
}

var LESSON_CHAR_FILTERS = {
    len_100: 100,
    len_200: 200,
    len_300: 300,
    len_400: 400
};

function setLessonListFilter(mode) {
    if (mode === 'digits' || mode === 'all' || LESSON_CHAR_FILTERS[mode]) lessonListFilter = mode;
    else lessonListFilter = 'all';
    if (currentLevelData) showLessonList(currentLevelData);
    updateLessonFilterBarStyles();
}

function updateLessonFilterHint() {
    var el = document.getElementById('lessonFilterHint');
    if (!el) return;
    if (lessonListFilter === 'digits') {
        el.textContent = typeof t === 'function' ? t('lessonFilterDigitsHint') : '';
        return;
    }
    var n = LESSON_CHAR_FILTERS[lessonListFilter];
    if (n) {
        el.textContent = typeof trReplace === 'function' ? trReplace('lessonFilterUpToHint', { n: String(n) }) : ('<= ' + n);
        return;
    }
    el.textContent = typeof t === 'function' ? t('lessonFilterAllHint') : '';
}

function updateLessonFilterBarStyles() {
    if (lessonListFilter === 'short') lessonListFilter = 'all';
    var allBtn = document.getElementById('lessonFilterAll');
    var len100Btn = document.getElementById('lessonFilterLen100');
    var len200Btn = document.getElementById('lessonFilterLen200');
    var len300Btn = document.getElementById('lessonFilterLen300');
    var len400Btn = document.getElementById('lessonFilterLen400');
    var digBtn = document.getElementById('lessonFilterDigits');
    var on = 'lesson-filter-chip lesson-filter-chip--on whitespace-nowrap';
    var off = 'lesson-filter-chip lesson-filter-chip--off whitespace-nowrap';
    if (allBtn) allBtn.className = lessonListFilter === 'all' ? on : off;
    if (len100Btn) len100Btn.className = lessonListFilter === 'len_100' ? on : off;
    if (len200Btn) len200Btn.className = lessonListFilter === 'len_200' ? on : off;
    if (len300Btn) len300Btn.className = lessonListFilter === 'len_300' ? on : off;
    if (len400Btn) len400Btn.className = lessonListFilter === 'len_400' ? on : off;
    if (digBtn) digBtn.className = lessonListFilter === 'digits' ? on : off;
    updateLessonFilterHint();
}

/** Чекпоинты отключены: звук, тост и пульс прогресс-бара отвлекали во время набора. */
function initLessonCheckpoints() {
    app._checkpointStep = 0;
    app._checkpointNext = 0;
}

function flashCheckpointBar() {
    var wrap = document.getElementById('progressBarWrap');
    if (!wrap) return;
    wrap.classList.remove('checkpoint-pulse');
    void wrap.offsetWidth;
    wrap.classList.add('checkpoint-pulse');
    setTimeout(function () { wrap.classList.remove('checkpoint-pulse'); }, 700);
}

function maybeTriggerTypingCheckpoint() {
    var modes = ['lesson', 'practice', 'free', 'adaptive', 'replay-errors'];
    if (modes.indexOf(app.currentMode) === -1 || !app._checkpointStep) return;
    var total = app.totalChars || 0;
    if (total < 22) return;
    while (app._checkpointNext > 0 && app.currentPosition >= app._checkpointNext && app.currentPosition < total) {
        playSound('checkpoint');
        flashCheckpointBar();
        if (typeof showToast === 'function') {
            showToast(t('checkpointDone'), 'success', '✓');
        }
        app._checkpointNext = Math.min(app._checkpointNext + app._checkpointStep, total);
    }
}

function updateCheckpointHintLine() {
    var el = document.getElementById('checkpointHintLine');
    if (!el) return;
    var modes = ['lesson', 'practice', 'free', 'adaptive', 'replay-errors'];
    if (modes.indexOf(app.currentMode) === -1 || !app._checkpointStep || app.totalChars < 22) {
        el.textContent = '';
        el.classList.add('opacity-0', 'hidden');
        return;
    }
    var nextAt = app._checkpointNext || 0;
    var left = Math.max(0, nextAt - app.currentPosition);
    el.classList.remove('opacity-0', 'hidden');
    if (left <= 0 || app.currentPosition >= app.totalChars - 1) {
        el.textContent = t('checkpointAlmost');
    } else {
        el.textContent = t('checkpointNext') + ' ' + left;
    }
}

function buildUniqueErrorSnippets() {
    var list = app._errorSnippetList || [];
    var seen = {};
    var out = [];
    list.forEach(function (s) {
        var x = String(s || '').trim();
        if (x.length < 2) return;
        if (seen[x]) return;
        seen[x] = 1;
        out.push(x);
    });
    return out.slice(0, 14);
}

function buildErrorReplayTextFromSnippets(snippets) {
    if (!snippets || !snippets.length) return '';
    var text = snippets.join('  ');
    if (text.length > 380) text = text.slice(0, 380);
    var sp = text.lastIndexOf(' ');
    if (sp > 120) text = text.slice(0, sp);
    return text;
}

/** Оставшееся время дриля ошибок (на паузе - «заморожено», пока дедлайн не сдвинут) */
function getReplaySecondsRemaining() {
    if (!app._replayDeadline) return 0;
    if (app.isPaused && app._replayPausedAt != null) {
        return Math.max(0, Math.ceil((app._replayDeadline - app._replayPausedAt) / 1000));
    }
    return Math.max(0, Math.ceil((app._replayDeadline - Date.now()) / 1000));
}

function updateReplayDeadlineUI() {
    var el = document.getElementById('replayDeadlineLine');
    if (!el) return;
    if (app.currentMode !== 'replay-errors' || !app._replayDeadline) {
        el.classList.add('hidden');
        el.textContent = '';
        return;
    }
    el.textContent = trReplace('replayTimeLeft', { s: String(getReplaySecondsRemaining()) });
    el.classList.remove('hidden');
}

function startErrorReplayPractice() {
    var modal = DOM.get('resultsModal');
    if (modal) {
        resetResultAbabaSticker();
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    var profileScreen = document.getElementById('profileScreen');
    if (profileScreen && !profileScreen.classList.contains('hidden')) profileScreen.classList.add('hidden');
    var sn = app._lastErrorReplaySnippets && app._lastErrorReplaySnippets.length
        ? app._lastErrorReplaySnippets
        : buildUniqueErrorSnippets();
    var text = buildErrorReplayTextFromSnippets(sn);
    if (!text || text.length < 3) return;
    app._replayTimeLimitSec = 60;
    startPractice(text, 'replay-errors', null);
}

function buildCoachTipFromSession() {
    var errN = app.errors || 0;
    if (errN < 2) return '';
    var afterSp = app._errorsAfterSpaceCount || 0;
    var pairs = app._errorPairCounts || {};
    var bestPair = '';
    var bestN = 0;
    Object.keys(pairs).forEach(function (p) {
        if (pairs[p] > bestN) { bestN = pairs[p]; bestPair = p; }
    });
    if (afterSp >= 2 && afterSp >= bestN * 0.65) {
        return t('coachAfterSpace');
    }
    if (bestPair.length === 2 && bestN >= 2) {
        return trReplace('coachBigram', { pair: bestPair });
    }
    if (bestPair.length >= 1 && bestN >= 1) {
        return trReplace('coachBigram', { pair: bestPair });
    }
    return '';
}

function computeResultSpeedInsights(currentSpeed) {
    var out = { yesterdayLine: '' };
    if (!window.statsModule) return out;
    var sessions = window.statsModule.data && window.statsModule.data.sessions ? window.statsModule.data.sessions : [];
    if (!sessions.length) return out;
    var yStr = streakDateStr(new Date(Date.now() - 86400000));
    var yBest = 0;
    for (var j = 0; j < sessions.length; j++) {
        var ss = sessions[j];
        if (!ss || !ss.timestamp) continue;
        if (streakDateStr(new Date(ss.timestamp)) !== yStr) continue;
        if (ss.speed > yBest) yBest = ss.speed;
    }
    if (yBest > 0 && currentSpeed > 0) {
        var dy = currentSpeed - yBest;
        var sg = dy > 0 ? '+' : '';
        out.yesterdayLine = trReplace('resultVsYesterday', { y: yBest, sign: sg, d: Math.abs(dy) });
    }
    return out;
}

// Show lesson list - ОПТИМИЗИРОВАНА с DocumentFragment
function lessonListKeyFor(lesson, levelKey) {
    if (!lesson) return '';
    if (lesson.isShopLesson) return 'shop_lesson_' + lesson.id;
    return 'lesson_' + levelKey + '_' + lesson.id;
}

/** Следующий доступный (открытый и ещё не пройденный) урок после afterKey, иначе первый такой в главе. */
function resolveNextPlayableLessonKey(levelData, afterKey) {
    if (!levelData || !window.statsModule) return afterKey || null;
    var prog = window.lessonProgressionModule;
    var full = levelData.lessons || [];
    var core = prog && typeof prog.getCoreOrderedLessons === 'function'
        ? prog.getCoreOrderedLessons(full)
        : full.filter(function (l) { return !l.isShopLesson; });
    if (!core.length) return afterKey || null;

    function isUnlocked(lesson) {
        if (lesson.isShopLesson) return true;
        if (!prog || typeof prog.isLessonUnlocked !== 'function') return true;
        return prog.isLessonUnlocked(window.statsModule, levelData.level, lesson, full);
    }

    var startIdx = 0;
    if (afterKey) {
        for (var i = 0; i < core.length; i++) {
            if (lessonListKeyFor(core[i], levelData.level) === afterKey) {
                startIdx = i + 1;
                break;
            }
        }
    }

    function firstPlayableFrom(from) {
        for (var j = from; j < core.length; j++) {
            var lesson = core[j];
            if (!isUnlocked(lesson)) continue;
            var key = lessonListKeyFor(lesson, levelData.level);
            var st = window.statsModule.getLessonStats(key);
            if (!st || !st.completed) return key;
        }
        return null;
    }

    var next = firstPlayableFrom(startIdx);
    if (next) return next;
    next = firstPlayableFrom(0);
    if (next) return next;
    if (startIdx > 0 && startIdx <= core.length) {
        return lessonListKeyFor(core[Math.min(startIdx, core.length) - 1], levelData.level);
    }
    return afterKey || null;
}

function scrollLessonsListToKey(lessonKey) {
    if (!lessonKey) return;
    var container = DOM.get('lessonsList');
    if (!container) return;
    var safe = String(lessonKey).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    var card = container.querySelector('.lesson-card[data-lesson-key="' + safe + '"]');
    if (!card) return;
    try {
        card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    } catch (e) {
        try { card.scrollIntoView(true); } catch (e2) {}
    }
    card.classList.remove('lesson-card--scroll-focus');
    // reflow so animation can replay
    void card.offsetWidth;
    card.classList.add('lesson-card--scroll-focus');
    setTimeout(function () {
        try { card.classList.remove('lesson-card--scroll-focus'); } catch (_e) {}
    }, 1300);
}

function showLessonList(levelData) {
    currentLevelData = levelData;
    const container = DOM.get('lessonsList');
    if (!container) return;
    
    const titleEl = document.getElementById('lessonsScreenTitle');
    if (titleEl) titleEl.textContent = tChapterField(levelData.level, 'Title');
    var sagaSub = document.getElementById('lessonsSagaSubtitle');
    if (sagaSub) {
        sagaSub.textContent = t('lessonsSagaUnlockLine');
        sagaSub.classList.remove('hidden');
    }
    var sagaHub = document.getElementById('lessonsSagaHub');
    if (sagaHub) {
        sagaHub.textContent = '';
        sagaHub.classList.add('hidden');
    }

    var filterBar = document.getElementById('lessonDurationFilterBar');
    if (filterBar) {
        filterBar.classList.remove('hidden');
        updateLessonFilterBarStyles();
    }
    
    container.classList.remove('difficulty-grid');
    // Используем DocumentFragment для batch updates
    const fragment = document.createDocumentFragment();

    var lessonsToShow = levelData.lessons.slice();
    if (lessonListFilter === 'short') lessonListFilter = 'all';
    if (LESSON_CHAR_FILTERS[lessonListFilter]) {
        var thr = LESSON_CHAR_FILTERS[lessonListFilter];
        lessonsToShow = lessonsToShow.filter(function (l) { return estimateLessonCharMaxForFilter(l) <= thr; });
    } else if (lessonListFilter === 'digits') {
        lessonsToShow = lessonsToShow.filter(function (l) { return l.digitsOnly === true; });
    }

    if (lessonListFilter !== 'all' && lessonsToShow.length) {
        // Sort filtered lessons by estimated target length.
        lessonsToShow.sort(function (a, b) { return estimateLessonCharMaxForFilter(a) - estimateLessonCharMaxForFilter(b); });
    }

    syncLessonsChapterBriefing(levelData, lessonsToShow.length);

    if (lessonsToShow.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'col-span-full text-center py-10 text-gray-400 text-sm px-4';
        empty.textContent = lessonListFilter === 'digits' ? t('lessonFilterEmptyDigits') : t('lessonFilterEmpty');
        fragment.appendChild(empty);
        container.innerHTML = '';
        container.appendChild(fragment);
        app._pendingLessonListScrollFromKey = null;
        return;
    }

    var fullTrackLessons = levelData.lessons;
    var prog = window.lessonProgressionModule;
    var prevStoryAct = -1;

    lessonsToShow.forEach((lesson, index) => {
        // Для shop уроков используем другой ключ
        const lessonKey = lesson.isShopLesson 
            ? `shop_lesson_${lesson.id}` 
            : `lesson_${levelData.level}_${lesson.id}`;
        const lessonStats = window.statsModule.getLessonStats(lessonKey);

        var fullIdx = prog && typeof prog.findCoreIndex === 'function'
            ? prog.findCoreIndex(lesson, levelData.level, fullTrackLessons)
            : -1;
        if (prog && fullIdx >= 0 && typeof prog.actIndexForCoreIndex === 'function') {
            var storyAct = prog.actIndexForCoreIndex(fullIdx);
            if (storyAct !== prevStoryAct) {
                var beatKey = sagaBeatKeyForTier(levelData.level, storyAct);
                var beatText = typeof t === 'function' ? t(beatKey) : '';
                if (!beatText || beatText === beatKey) {
                    beatKey = typeof prog.sagaBeatKeyForAct === 'function' ? prog.sagaBeatKeyForAct(storyAct) : 'sagaBeat0';
                    beatText = typeof t === 'function' ? t(beatKey) : '';
                }
                var epLine = typeof trReplace === 'function'
                    ? trReplace('sagaEpisode', { n: String(storyAct + 1) })
                    : ('Ep ' + (storyAct + 1));
                var actRow = document.createElement('div');
                actRow.className = 'lesson-saga-act col-span-full';
                actRow.innerHTML =
                    '<div class="lesson-saga-act__inner">' +
                    '<span class="lesson-saga-act__ep">' + escapeHtml(epLine) + '</span>' +
                    '<p class="lesson-saga-act__hook">' + escapeHtml(beatText) + '</p>' +
                    '</div>';
                fragment.appendChild(actRow);
                prevStoryAct = storyAct;
            }
        }
        
        let lessonDifficulty = lesson.difficulty;
        if (!lessonDifficulty || lessonDifficulty === 'easy') {
            if (levelData.level === 'advanced') lessonDifficulty = 'hard';
            else if (levelData.level === 'medium') lessonDifficulty = 'medium';
            else lessonDifficulty = 'easy';
        }
        let rewardCoins = 10;
        if (lessonDifficulty === 'hard' || lessonDifficulty === 'advanced') rewardCoins = 20;
        else if (lessonDifficulty === 'medium') rewardCoins = 15;
        
        const difficultyClass = lessonDifficulty === 'hard' || lessonDifficulty === 'advanced' ? 'hard' : lessonDifficulty === 'medium' ? 'medium' : 'easy';

        var unlocked = lesson.isShopLesson
            || (lessonStats && lessonStats.completed)
            || !prog
            || typeof prog.isLessonUnlocked !== 'function'
            || prog.isLessonUnlocked(window.statsModule, levelData.level, lesson, fullTrackLessons);

        const card = document.createElement('div');
        card.className = 'lesson-card lesson-card--' + difficultyClass + (unlocked ? '' : ' lesson-card--locked');
        card.setAttribute('data-lesson-key', lessonKey);
        var payload = { ...lesson, key: lessonKey, difficulty: lessonDifficulty, level: levelData.level };
        if (unlocked) {
            card.onclick = () => startPractice(lesson.text, 'lesson', payload);
        } else {
            card.onclick = function () {
                showToast(t('lessonLockedToast'), 'info', t('tip'));
            };
        }
        
        let topBadge = '';
        if (lessonStats && lessonStats.completed) {
            topBadge = `<div class="lesson-card__done"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>✓</div>`;
        } else if (lesson.isShopLesson) {
            topBadge = `<div class="lesson-card__shop">Магазин</div>`;
        } else if (!unlocked) {
            topBadge = '<div class="lesson-card__lock-badge" aria-hidden="true">🔒</div>';
        }
        
        let statsBlock = '';
        if (lessonStats && lessonStats.completed) {
            const accuracy = lessonStats.accuracy || 0;
            const accClass = accuracy >= 95 ? 'lesson-card__accuracy--high' : accuracy >= 85 ? 'lesson-card__accuracy--mid' : 'lesson-card__accuracy--low';
            const bestLabel = app.lang === 'ru' ? 'Лучший результат' : app.lang === 'en' ? 'Best result' : 'Найкращий результат';
            statsBlock = `<div class="lesson-card__stats"><span class="text-gray-500">${bestLabel}</span><span class="lesson-card__accuracy ${accClass}">${accuracy}%</span></div>`;
        }
        
        const difficultyLabel = lessonDifficulty === 'hard' || lessonDifficulty === 'advanced'
            ? (app.lang === 'ru' ? 'сложно' : app.lang === 'ua' ? 'складно' : 'hard')
            : lessonDifficulty === 'medium'
                ? (app.lang === 'ru' ? 'средне' : app.lang === 'ua' ? 'середньо' : 'medium')
                : (app.lang === 'ru' ? 'легко' : app.lang === 'ua' ? 'легко' : 'easy');
        
        const missionNum = (fullIdx >= 0 ? String(fullIdx + 1) : String(index + 1)).padStart(2, '0');
        var descTrim = (lesson.description || '').trim();
        var descHtml = descTrim
            ? '<p class="lesson-card__desc lesson-card__desc--line">' + escapeHtml(descTrim) + '</p>'
            : '';
        var vibeMeta = getLessonCardVibe(lesson, lessonDifficulty, levelData.level);
        var vibeHint = typeof t === 'function' ? t(vibeMeta.hintKey) : '';
        var vibeLabel = typeof t === 'function' ? t(vibeMeta.key) : '';
        var vibeTone = vibeMeta.tone || 'calm';
        const vibeTagHtml = `<span class="lesson-card__tag lesson-card__tag--vibe lesson-card__tag--vibe-${vibeTone}" title="${escapeHtml(vibeHint)}">${escapeHtml(vibeLabel)}</span>`;
        var lockStrip = !unlocked && !lesson.isShopLesson
            ? '<p class="lesson-card__locked-hint">' + escapeHtml(t('lessonCardLockedHint')) + '</p>'
            : '';
        card.innerHTML = `
            ${topBadge}
            <div class="lesson-card__accent">
                <span class="lesson-card__mission-num">${missionNum}</span>
            </div>
            <div class="lesson-card__body">
                <h4 class="lesson-card__title">${escapeHtml(lesson.name)}</h4>
                ${descHtml}
                <div class="lesson-card__tags">
                    <span class="lesson-card__tag lesson-card__tag--lang">${lesson.layout.toUpperCase()}</span>
                    <span class="lesson-card__tag lesson-card__tag--${difficultyClass}">${difficultyLabel}</span>
                    ${vibeTagHtml}
                </div>
                <div class="lesson-card__reward">
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941a2.305 2.305 0 01-.567-.267C8.07 11.66 8 11.434 8 11c0-.114.07-.34.433-.582A2.305 2.305 0 019 10.151V8.151c-.22.071-.412.164-.567.267C8.07 8.66 8 8.886 8 9c0 .114.07.34.433.582.155.103.346.196.567.267v1.698a2.305 2.305 0 01-.567-.267C8.07 11.66 8 11.434 8 11c0-.114.07-.34.433-.582A2.305 2.305 0 019 10.151V8.151c.22.071.412.164.567.267C9.93 8.66 10 8.886 10 9c0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267v1.941a4.535 4.535 0 001.676-.662C11.398 9.765 12 8.99 12 8c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 009 5.092V3.151a2.305 2.305 0 01.567.267C9.93 3.66 10 3.886 10 4c0 .114-.07.34-.433.582A2.305 2.305 0 019 4.849v1.698z" clip-rule="evenodd"/></svg>
                <span>${t('rewardUpTo')} ${rewardCoins * 2} ${t('coinsAtAccuracy')}</span>
            </div>
                ${statsBlock}
                ${lockStrip}
            </div>
        `;
        
        fragment.appendChild(card);
    });
    
    // Batch update - один раз заменяем весь контент
    container.innerHTML = '';
    container.appendChild(fragment);

    var scrollFrom = app._pendingLessonListScrollFromKey;
    if (scrollFrom) {
        app._pendingLessonListScrollFromKey = null;
        var targetKey = resolveNextPlayableLessonKey(levelData, scrollFrom);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                var keyed = targetKey || scrollFrom;
                var safe = String(keyed).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                var found = container.querySelector('.lesson-card[data-lesson-key="' + safe + '"]');
                if (!found && scrollFrom && scrollFrom !== keyed) {
                    keyed = scrollFrom;
                }
                scrollLessonsListToKey(keyed);
            });
        });
    }
}

/** Полоса «операции» на экране практики - код + бриф. */
function syncPracticeMissionBar() {
    var bar = document.getElementById('practiceMissionBar');
    var cEl = document.getElementById('practiceMissionCode');
    var bEl = document.getElementById('practiceMissionBrief');
    if (!bar || !cEl || !bEl) return;
    var lesson = app.currentLesson;
    var mode = app.currentMode;
    if (!lesson || (mode !== 'lesson' && mode !== 'practice') || mode === 'replay-errors' || !window.lessonMissionsModule) {
        bar.classList.add('hidden');
        cEl.textContent = '';
        bEl.textContent = '';
        return;
    }
    var levelKey = lesson.level;
    if (!levelKey && currentLevelData && currentLevelData.level) levelKey = currentLevelData.level;
    if (lesson.isShopLesson) {
        if (lesson.level) levelKey = lesson.level;
        else if (lesson.difficulty === 'hard') levelKey = 'advanced';
        else if (lesson.difficulty === 'medium') levelKey = 'medium';
        else levelKey = 'beginner';
    }
    if (!levelKey) levelKey = 'beginner';
    var m = window.lessonMissionsModule.getMissionForLesson(lesson, levelKey, app.lang);
    cEl.textContent = m.code || '';
    bEl.textContent = m.brief || '';
    bar.classList.remove('hidden');
}

// ------------------------------
// Ukrainian lesson text from pool: word order matches lesson data (readable, not random).
// Small pools (<5 unique words): cyclic repeat for keyboard rows. Longer pools: repeat phrase to 100-200 chars if needed.
// ------------------------------
const UA_BEGINNER_ALLOWED_LETTERS_RE = /[абвгґдеєжзиіїйклмнопрстуфхцчшщьюя]/i;
const UA_BEGINNER_WORD_STRIP_RE = /[^абвгґдеєжзиіїйклмнопрстуфхцчшщьюя]+/gi;
const UA_BEGINNER_FALLBACK_WORDS = [
    'дім', 'кіт', 'пес', 'мама', 'тато', 'вода', 'рука', 'нога', 'день', 'ніч', 'стіл', 'стілець',
    'вікно', 'двері', 'лампа', 'книга', 'сонце', 'місяць', 'зорі', 'небо', 'хмари', 'дощ', 'сніг',
    'вітер', 'море', 'річка', 'озеро', 'гора', 'ліс', 'трава', 'дерево', 'квітка', 'яблуко',
    'банан', 'апельсин', 'помідор', 'огірок', 'морква', 'картопля', 'капуста', 'сонячник',
    'кольори', 'червоний', 'зелений', 'синій', 'жовтий', 'фіолетовий', 'блакитний', 'білий',
    'весна', 'літо', 'осінь', 'зима', 'друг', 'друзі', 'любов', 'радість', 'надія', 'мрія',
    'гра', 'ігри', 'спорт', 'біг', 'плавання', 'теніс', 'велосипед', 'футбол', 'баскетбол',
    'школа', 'урок', 'завдання', 'зошит', 'ручка', 'олівець', 'клас', 'вчитель', 'учень', 'книга',
    'транспорт', 'машина', 'автобус', 'поїзд', 'літак', 'мотоцикл', 'дорога', 'швидко', 'тихо',
    'рано', 'вечір', 'ранок', 'вчора', 'сьогодні', 'завтра', 'добре', 'краще', 'повільно', 'порядок',
    'радісно', 'сміх', 'слухай', 'пиши', 'читай', 'вивчай', 'працюй', 'думай'
].map(w => String(w).toLowerCase());

function sanitizeUaBeginnerWord(word) {
    if (!word) return '';
    // Lowercase + keep only letters from the allowed Ukrainian alphabet.
    const lower = String(word).toLowerCase();
    const stripped = lower.replace(UA_BEGINNER_WORD_STRIP_RE, '');
    // Avoid pathological results (e.g. empty or non-letter-only).
    if (!stripped) return '';
    // Ensure we really have at least one allowed letter.
    if (!UA_BEGINNER_ALLOWED_LETTERS_RE.test(stripped)) return '';
    return stripped;
}

function cryptoRandInt(max) {
    if (max <= 0) return 0;
    try {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const arr = new Uint32Array(1);
            crypto.getRandomValues(arr);
            return arr[0] % max;
        }
    } catch (e) {}
    return Math.floor(Math.random() * max);
}

function cryptoShuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = cryptoRandInt(i + 1);
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}

function generateUaBeginnerLessonText(poolText, minChars = 100, maxChars = 200) {
    const tokens = String(poolText || '')
        .trim()
        .split(/\s+/)
        .map(s => sanitizeUaBeginnerWord(s))
        .filter(Boolean);

    if (tokens.length === 0) {
        return 'дім кіт мама тато вода рука нога день ніч стіл стілець вікно двері лампа книга';
    }

    const seen = new Set();
    const uniqueInOrder = [];
    for (let ti = 0; ti < tokens.length; ti++) {
        const t = tokens[ti];
        if (!seen.has(t)) {
            seen.add(t);
            uniqueInOrder.push(t);
        }
    }
    const isSmallPool = uniqueInOrder.length > 0 && uniqueInOrder.length < 5;
    if (isSmallPool) {
        return generateCyclicWordText(uniqueInOrder, minChars, maxChars);
    }

    const phrase = tokens.join(' ').replace(/\s+/g, ' ').trim();

    if (phrase.length >= minChars && phrase.length <= maxChars) {
        return phrase;
    }
    if (phrase.length > maxChars) {
        let head = phrase.slice(0, maxChars);
        const sp = head.lastIndexOf(' ');
        if (sp >= minChars) return head.slice(0, sp).trim();
        return head.trim();
    }

    let out = phrase;
    let guard = 0;
    while (out.length < minChars && guard++ < 800) {
        out = (out + ' ' + phrase).trim();
    }
    if (out.length > maxChars) {
        out = out.slice(0, maxChars);
        const sp = out.lastIndexOf(' ');
        if (sp >= minChars) out = out.slice(0, sp).trim();
    }
    return out;
}

// ------------------------------
// Shared helpers for all language beginner generators
// ------------------------------

// Циклічне повторення малого набору слів у фіксованому порядку (ряди клавіатури) - без рандому.
function generateCyclicWordText(words, minChars, maxChars) {
    const list = (words || []).filter(Boolean);
    const outWords = [];
    let outLen = 0;
    let pass = 0;
    while (outLen < minChars && pass < 120 && list.length) {
        for (let i = 0; i < list.length; i++) {
            const w = list[i];
            const sep = outWords.length ? 1 : 0;
            const nextLen = outLen + sep + w.length;
            if (nextLen > maxChars) break;
            outWords.push(w);
            outLen = nextLen;
            if (outLen >= minChars) break;
        }
        pass++;
    }
    const result = outWords.join(' ').trim();
    if (result.length >= minChars) return result;
    // Ultimate fallback for extremely short words
    return (words.join(' ') + ' ').repeat(Math.ceil(minChars / (words.join(' ').length + 1))).trim().slice(0, maxChars);
}

// Pool shuffler: shuffle pool words and cycle if total pool chars < minChars (for vocab lessons).
function generateShuffledPoolText(words, minChars, maxChars) {
    const totalChars = words.reduce((s, w) => s + w.length, 0) + Math.max(0, words.length - 1);
    if (totalChars < minChars) {
        return generateCyclicWordText(words, minChars, maxChars);
    }
    const maxAttempts = 12;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const shuffled = cryptoShuffle(words.slice());
        const outWords = [];
        let outLen = 0;
        for (let i = 0; i < shuffled.length; i++) {
            const w = shuffled[i];
            const sep = outWords.length ? 1 : 0;
            const nextLen = outLen + sep + w.length;
            if (nextLen > maxChars) continue;
            outWords.push(w);
            outLen = nextLen;
            if (outLen >= minChars) break;
        }
        const text = outWords.join(' ').trim().replace(/\s+/g, ' ');
        if (text.length >= minChars && text.length <= maxChars) return text;
    }
    // Last resort: just join all words
    return words.join(' ').slice(0, maxChars);
}

// ------------------------------
// RU/EN beginner generators
// Keep output lowercase letters + spaces only (no punctuation).
// ------------------------------
function sanitizeRuBeginnerWord(word) {
    if (!word) return '';
    const lower = String(word).toLowerCase();
    // Keep only lowercase Russian letters (incl. ё).
    const stripped = lower.replace(/[^абвгдеёжзиийклмнопрстуфхцчшщъыьэюя]+/gi, '');
    if (!/[абвгдеёжзиийклмнопрстуфхцчшщъыьэюя]/i.test(stripped)) return '';
    return stripped;
}

function sanitizeEnBeginnerWord(word) {
    if (!word) return '';
    const lower = String(word).toLowerCase();
    const stripped = lower.replace(/[^a-z]+/g, '');
    if (!/[a-z]/i.test(stripped)) return '';
    return stripped;
}

function generateRuBeginnerSentenceText(poolText, minChars = 100, maxChars = 200) {
    const poolLower = String(poolText || '').toLowerCase();
    const rawWords = String(poolText || '')
        .split(/\s+/)
        .map(s => sanitizeRuBeginnerWord(s))
        .filter(Boolean);

    let candidates = Array.from(new Set(rawWords));

    if (candidates.length === 0) return 'я учусь печатать и читаю слова';

    // Small pool (keyboard drills like "фыва олдж"): cyclic repetition, no foreign words.
    if (candidates.length < 5) {
        return generateCyclicWordText(candidates, minChars, maxChars);
    }
    // Medium pool (standard vocabulary lessons 5-17 words): shuffle pool-only, no sentence builder.
    if (candidates.length < 17) {
        return generateShuffledPoolText(candidates, minChars, maxChars);
    }

    // Beginner readability: always use 1st person singular.
    const subjects = ['я'];
    const times = ['сегодня', 'вчера', 'завтра', 'утром', 'вечером', 'ночью', 'днем', 'теперь', 'всегда'];
    const verbs = ['учусь', 'пишу', 'читаю', 'делаю', 'знаю', 'вижу', 'помню', 'повторяю', 'практикую', 'тренируюсь'];
    const connectors = ['и', 'а', 'но', 'потом', 'снова', 'тогда'];

    // Choose a stable verb by keywords.
    const has = (needle) => poolLower.includes(String(needle || '').toLowerCase());
    let fixedVerb = null;
    if (has('клей') || has('стикер') || has('наклей')) fixedVerb = 'клею';
    else if (has('склад') || has('заказ') || has('комплект') || has('короб') || has('упаков')) fixedVerb = 'комплектую';
    else if (has('груз') || has('ящик')) fixedVerb = 'гружу';
    else if (has('продав') || has('магазин') || has('клиент') || has('чек')) fixedVerb = 'продаю';
    else if (has('айтиш') || has('код') || has('программа') || has('сервер') || has('тест')) fixedVerb = 'пишу';
    else if (has('учитель') || has('учен') || has('урок') || has('знани')) fixedVerb = 'учу';
    else if (has('водител') || has('маршрут') || has('руль')) fixedVerb = 'вожу';
    else fixedVerb = 'учусь';
    fixedVerb = sanitizeRuBeginnerWord(fixedVerb) || 'учусь';

    // Coherent beginner sentence attempt to avoid "word salad".
    // Pattern: {time} я {verb} {obj1} и {obj2} чтобы {goal} и {obj3} {adverb}
    const adverbsRu = ['аккуратно', 'точно', 'спритно', 'быстро', 'внимательно', 'спокойно', 'уверенно', 'сосредоточенно', 'чётко']
        .map(w => sanitizeRuBeginnerWord(w))
        .filter(Boolean);
    let fixedAdverb = 'точно';
    if (has('аккурат') || has('ровн')) fixedAdverb = 'аккуратно';
    else if (has('внимат')) fixedAdverb = 'внимательно';
    else if (has('быстр') || has('швидк')) fixedAdverb = 'быстро';
    else if (has('споко')) fixedAdverb = 'спокойно';
    else if (has('увер')) fixedAdverb = 'уверенно';
    fixedAdverb = sanitizeRuBeginnerWord(fixedAdverb) || adverbsRu[0] || 'точно';

    const goalWordsRu = ['порядок', 'точность', 'спокойствие', 'успех', 'уверенность', 'внимание', 'знания', 'терпение', 'радость', 'мечта']
        .map(w => sanitizeRuBeginnerWord(w))
        .filter(Boolean);
    let fixedGoal = 'точность';
    if (has('склад') || has('поряд')) fixedGoal = 'порядок';
    else if (has('клей') || has('стикер') || has('накле')) fixedGoal = 'точность';
    else if (has('груз') || has('вантаж')) fixedGoal = 'успех';
    else if (has('код') || has('тест') || has('программ')) fixedGoal = 'уверенность';
    else if (has('вчитель') || has('урок') || has('знан')) fixedGoal = 'знания';
    fixedGoal = sanitizeRuBeginnerWord(fixedGoal) || goalWordsRu[0] || 'точность';

    const stopWordsRu = new Set([
        'я', 'и', 'а', 'но', 'потом', 'снова', 'тогда',
        'сегодня', 'вчера', 'завтра', 'утром', 'вечером', 'ночью', 'днем', 'теперь', 'всегда',
        'чтобы'
    ].map(w => sanitizeRuBeginnerWord(w)).filter(Boolean));

    const objCandidates = candidates
        .filter(w => w && !stopWordsRu.has(w))
        .filter(w => w !== fixedVerb && w !== fixedAdverb && w !== fixedGoal)
        .slice();

    const timeCandidates = times.filter(w => !stopWordsRu.has(w));
    const time = timeCandidates.length ? timeCandidates[cryptoRandInt(timeCandidates.length)] : (times.length ? times[cryptoRandInt(times.length)] : null);

    const used = new Set();
    [fixedVerb, fixedGoal, fixedAdverb].forEach(w => { if (w) used.add(w); });
    const pickUnique = () => {
        const available = objCandidates.filter(w => !used.has(w));
        if (!available.length) return null;
        const w = available[cryptoRandInt(available.length)];
        used.add(w);
        return w;
    };

    const obj1 = pickUnique();
    const obj2 = pickUnique();
    const obj3 = pickUnique();
    const wordChToBy = sanitizeRuBeginnerWord('чтобы') || 'чтобы';

    if (time && obj1 && obj2 && obj3) {
        let attemptWords = [time, 'я', fixedVerb, obj1, 'и', obj2, wordChToBy, fixedGoal, 'и', obj3, fixedAdverb]
            .map(w => sanitizeRuBeginnerWord(w))
            .filter(Boolean);
        let attemptText = attemptWords.join(' ').replace(/\s+/g, ' ').trim();

        // Extend until we hit 100-200 chars.
        const usedObjs = new Set([obj1, obj2, obj3].filter(Boolean));
        let loops = 0;
        while (attemptText.length < minChars && loops < 60) {
            loops++;
            const availableObjs = objCandidates.filter(w => w && !usedObjs.has(w));
            const poolForPick = availableObjs.length ? availableObjs : objCandidates.filter(Boolean);
            if (!poolForPick.length) break;
            const nextObj = poolForPick[cryptoRandInt(poolForPick.length)];
            const candidateWords = attemptWords.concat(['и', nextObj]);
            const candidateText = candidateWords.join(' ').replace(/\s+/g, ' ').trim();
            if (candidateText.length > maxChars) break;
            attemptWords = candidateWords;
            attemptText = candidateText;
            usedObjs.add(nextObj);
        }

        if (attemptText.length >= minChars && attemptText.length <= maxChars) return attemptText;
    }

    const templates = [
        ['{time}', '{subj}', '{verb}', '{w}', '{w}', '{c}', '{w}', '{w}'],
        ['{time}', '{subj}', '{verb}', '{w}', '{w}', 'и', '{w}', '{w}', '{c}'],
        ['{time}', '{subj}', '{verb}', '{w}', 'и', '{w}', '{w}', '{c}', '{w}'],
        ['{time}', '{subj}', '{verb}', '{w}', '{c}', '{w}', '{w}', 'и', '{w}']
    ];

    const pickRandom = (arr) => {
        if (!arr || arr.length === 0) return null;
        return arr[cryptoRandInt(arr.length)];
    };

    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const template = templates[cryptoRandInt(templates.length)];
        const used = new Set();
        const outWords = [];
        let outLen = 0;
        let ok = true;

        for (let i = 0; i < template.length; i++) {
            const token = template[i];
            let word = null;
            if (token === '{w}') {
                word = pickRandom(candidates.filter(w => !used.has(w)));
            } else if (token === '{subj}') {
                word = pickRandom(subjects.filter(w => !used.has(w)));
            } else if (token === '{verb}') {
                word = fixedVerb;
            } else if (token === '{time}') {
                word = pickRandom(times.filter(w => !used.has(w)));
            } else if (token === '{c}') {
                word = pickRandom(connectors.filter(w => !used.has(w)));
            } else {
                word = sanitizeRuBeginnerWord(token);
            }

            if (!word) {
                ok = false;
                break;
            }
            // No repeats in a single output.
            if (used.has(word)) {
                ok = false;
                break;
            }

            const sepLen = outWords.length ? 1 : 0;
            if (outLen + sepLen + word.length > maxChars) {
                ok = false;
                break;
            }

            outWords.push(word);
            used.add(word);
            outLen += sepLen + word.length;
        }

        if (!ok) continue;

        // Fill a bit to reach 100-200 chars.
        let safeLoops = 0;
        while (outLen < minChars && safeLoops < 60) {
            safeLoops++;
            const insertConnector = outLen + 2 < maxChars && cryptoRandInt(100) < 30;
            if (insertConnector) {
                const c = pickRandom(connectors.filter(x => !used.has(x)));
                const w = pickRandom(candidates.filter(x => !used.has(x)));
                if (!c || !w) break;
                const addLen = c.length + 1 + w.length + (outWords.length ? 1 : 0) + 1; // spaces: before c + between + before w
                if (outLen + addLen > maxChars) break;
                outWords.push(c);
                outWords.push(w);
                used.add(c);
                used.add(w);
                outLen += 1 + c.length + 1 + w.length;
            } else {
                const w = pickRandom(candidates.filter(x => !used.has(x)));
                if (!w) break;
                const sepLen = outWords.length ? 1 : 0;
                if (outLen + sepLen + w.length > maxChars) break;
                outWords.push(w);
                used.add(w);
                outLen += sepLen + w.length;
            }
        }

        if (outLen >= minChars && outLen <= maxChars) {
            const outText = outWords.join(' ').replace(/\s+/g, ' ').trim();
            if (outText.length >= minChars && outText.length <= maxChars) return outText;
        }
    }

    // Fallback to simple RU word-bag (still: lowercase letters + spaces only).
    const shuffled = cryptoShuffle(candidates);
    const outWords = [];
    let outLen = 0;
    for (let i = 0; i < shuffled.length; i++) {
        const w = shuffled[i];
        const sepLen = outWords.length ? 1 : 0;
        const nextLen = outLen + sepLen + w.length;
        if (nextLen > maxChars) continue;
        outWords.push(w);
        outLen = nextLen;
        if (outLen >= minChars) break;
    }
    return outWords.join(' ').trim().replace(/\s+/g, ' ');
}

function generateEnBeginnerSentenceText(poolText, minChars = 100, maxChars = 200) {
    const poolLower = String(poolText || '').toLowerCase();
    const rawWords = String(poolText || '')
        .split(/\s+/)
        .map(s => sanitizeEnBeginnerWord(s))
        .filter(Boolean);

    let candidates = Array.from(new Set(rawWords));

    if (candidates.length === 0) return 'i practice typing and read words';

    // Small pool (keyboard drills): cyclic repetition, no foreign words.
    if (candidates.length < 5) {
        return generateCyclicWordText(candidates, minChars, maxChars);
    }
    // Medium pool (standard vocabulary lessons): shuffle pool-only, no sentence builder.
    if (candidates.length < 17) {
        return generateShuffledPoolText(candidates, minChars, maxChars);
    }

    // Beginner readability: always use "i".
    const subjects = ['i'];
    const times = ['today', 'now', 'morning', 'evening', 'night', 'always', 'then'];
    const verbs = ['type', 'learn', 'read', 'write', 'practice', 'repeat', 'improve', 'focus'];
    const connectors = ['and', 'but', 'then', 'because', 'so', 'always'];

    // Choose a stable verb by keywords.
    const has = (needle) => poolLower.includes(String(needle || '').toLowerCase());
    let fixedVerb = null;
    if (has('warehouse') || has('pack') || has('order') || has('box')) fixedVerb = 'pack';
    else if (has('sticker') || has('label')) fixedVerb = 'stick';
    else if (has('loader') || has('load') || has('crate') || has('cargo')) fixedVerb = 'load';
    else if (has('seller') || has('shop') || has('customer')) fixedVerb = 'sell';
    else if (has('it') || has('code') || has('program') || has('server') || has('test')) fixedVerb = 'code';
    else if (has('driver') || has('route') || has('car')) fixedVerb = 'drive';
    else if (has('read') || has('book') || has('words')) fixedVerb = 'read';
    else fixedVerb = 'type';
    fixedVerb = sanitizeEnBeginnerWord(fixedVerb) || 'type';

    // Coherent beginner sentence attempt to avoid "word salad".
    // Pattern: {time} i {verb} {obj1} and {obj2} so {goal} and {obj3} {adverb}
    const adverbsEn = ['carefully', 'accurately', 'clearly', 'steadily', 'calmly', 'quickly', 'confidently', 'patiently']
        .map(w => sanitizeEnBeginnerWord(w))
        .filter(Boolean);
    let fixedAdverb = 'clearly';
    if (has('care') || has('accur')) fixedAdverb = 'carefully';
    else if (has('fast') || has('quick')) fixedAdverb = 'quickly';
    else if (has('calm') || has('quiet')) fixedAdverb = 'calmly';
    fixedAdverb = sanitizeEnBeginnerWord(fixedAdverb) || adverbsEn[0] || 'clearly';

    const goalWordsEn = ['order', 'accuracy', 'focus', 'progress', 'calm', 'confidence', 'knowledge', 'success', 'clarity']
        .map(w => sanitizeEnBeginnerWord(w))
        .filter(Boolean);
    let fixedGoal = 'accuracy';
    if (has('order') || has('warehouse') || has('pack')) fixedGoal = 'order';
    else if (has('sticker') || has('label')) fixedGoal = 'accuracy';
    else if (has('code') || has('test') || has('program')) fixedGoal = 'confidence';
    else fixedGoal = 'focus';
    fixedGoal = sanitizeEnBeginnerWord(fixedGoal) || goalWordsEn[0] || 'accuracy';

    const stopWordsEn = new Set([
        'i', 'we', 'you', 'he', 'she', 'it',
        'and', 'but', 'then', 'because', 'so', 'always',
        'today', 'now', 'morning', 'evening', 'night', 'then'
    ].map(w => sanitizeEnBeginnerWord(w)).filter(Boolean));

    const objCandidates = candidates
        .filter(w => w && !stopWordsEn.has(w))
        .filter(w => w !== fixedVerb && w !== fixedAdverb && w !== fixedGoal)
        .slice();

    const timeCandidates = times.filter(w => !stopWordsEn.has(w));
    const time = timeCandidates.length ? timeCandidates[cryptoRandInt(timeCandidates.length)] : (times.length ? times[cryptoRandInt(times.length)] : null);

    const used = new Set();
    [fixedVerb, fixedGoal, fixedAdverb].forEach(w => { if (w) used.add(w); });
    const pickUnique = () => {
        const available = objCandidates.filter(w => !used.has(w));
        if (!available.length) return null;
        const w = available[cryptoRandInt(available.length)];
        used.add(w);
        return w;
    };

    const obj1 = pickUnique();
    const obj2 = pickUnique();
    const obj3 = pickUnique();
    const wordSo = sanitizeEnBeginnerWord('so') || 'so';

    if (time && obj1 && obj2 && obj3) {
        const attemptWords = [time, 'i', fixedVerb, obj1, 'and', obj2, wordSo, fixedGoal, 'and', obj3, fixedAdverb]
            .map(w => sanitizeEnBeginnerWord(w))
            .filter(Boolean);
        let attemptText = attemptWords.join(' ').replace(/\s+/g, ' ').trim();

        // Extend with more objects if we ended up slightly too short.
        const usedObjs = new Set([obj1, obj2, obj3].filter(Boolean));
        let loops = 0;
        while (attemptText.length < minChars && loops < 60) {
            loops++;
            const availableObjs = objCandidates.filter(w => w && !usedObjs.has(w));
            const poolForPick = availableObjs.length ? availableObjs : objCandidates.filter(Boolean);
            if (!poolForPick.length) break;
            const nextObj = poolForPick[cryptoRandInt(poolForPick.length)];
            const candidateWords = attemptWords.concat(['and', nextObj].filter(Boolean));
            const candidateText = candidateWords.join(' ').replace(/\s+/g, ' ').trim();
            if (candidateText.length > maxChars) break;
            attemptWords.push('and', nextObj);
            attemptText = candidateText;
            usedObjs.add(nextObj);
        }

        if (attemptText.length >= minChars && attemptText.length <= maxChars) return attemptText;
    }

    const templates = [
        ['{time}', '{subj}', '{verb}', '{w}', '{w}', '{c}', '{w}', '{w}'],
        ['{time}', '{subj}', '{verb}', '{w}', '{w}', 'and', '{w}', '{w}'],
        ['{time}', '{subj}', '{verb}', '{w}', 'and', '{w}', '{w}', '{c}', '{w}'],
        ['{time}', '{subj}', '{verb}', '{w}', '{c}', '{w}', '{w}', 'and', '{w}']
    ];

    const pickRandom = (arr) => {
        if (!arr || arr.length === 0) return null;
        return arr[cryptoRandInt(arr.length)];
    };

    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const template = templates[cryptoRandInt(templates.length)];
        const used = new Set();
        const outWords = [];
        let outLen = 0;
        let ok = true;

        for (let i = 0; i < template.length; i++) {
            const token = template[i];
            let word = null;
            if (token === '{w}') word = pickRandom(candidates.filter(w => !used.has(w)));
            else if (token === '{subj}') word = pickRandom(subjects.filter(w => !used.has(w)));
            else if (token === '{verb}') word = fixedVerb;
            else if (token === '{time}') word = pickRandom(times.filter(w => !used.has(w)));
            else if (token === '{c}') word = pickRandom(connectors.filter(w => !used.has(w)));
            else word = sanitizeEnBeginnerWord(token);

            if (!word || used.has(word)) {
                ok = false;
                break;
            }
            const sepLen = outWords.length ? 1 : 0;
            if (outLen + sepLen + word.length > maxChars) {
                ok = false;
                break;
            }
            outWords.push(word);
            used.add(word);
            outLen += sepLen + word.length;
        }

        if (!ok) continue;

        let safeLoops = 0;
        while (outLen < minChars && safeLoops < 60) {
            safeLoops++;
            const insertConnector = outLen + 2 < maxChars && cryptoRandInt(100) < 30;
            if (insertConnector) {
                const c = pickRandom(connectors.filter(x => !used.has(x)));
                const w = pickRandom(candidates.filter(x => !used.has(x)));
                if (!c || !w) break;
                const addLen = c.length + 1 + w.length + (outWords.length ? 1 : 0) + 1;
                if (outLen + addLen > maxChars) break;
                outWords.push(c);
                outWords.push(w);
                used.add(c);
                used.add(w);
                outLen += 1 + c.length + 1 + w.length;
            } else {
                const w = pickRandom(candidates.filter(x => !used.has(x)));
                if (!w) break;
                const sepLen = outWords.length ? 1 : 0;
                if (outLen + sepLen + w.length > maxChars) break;
                outWords.push(w);
                used.add(w);
                outLen += sepLen + w.length;
            }
        }

        if (outLen >= minChars && outLen <= maxChars) {
            const outText = outWords.join(' ').replace(/\s+/g, ' ').trim();
            if (outText.length >= minChars && outText.length <= maxChars) return outText;
        }
    }

    // Fallback to simple word bag from original.
    return String(poolText || '').toLowerCase().split(/\s+/).filter(Boolean).slice(0, 30).join(' ');
}

function loadRecentTexts(storageKey) {
    if (!storageKey) return [];
    try {
        const raw = localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveRecentTexts(storageKey, texts, maxHistory = 16) {
    if (!storageKey) return;
    try {
        const trimmed = Array.isArray(texts) ? texts.slice(-maxHistory) : [];
        localStorage.setItem(storageKey, JSON.stringify(trimmed));
    } catch (e) {
        // ignore
    }
}

function generateRuEnBeginnerUniqueText(poolText, lessonKey, layout, minChars = 100, maxChars = 200) {
    const storageKey = lessonKey ? (`ruen_beginner_recentTexts_${layout}_${lessonKey}`) : null;
    const recentTexts = loadRecentTexts(storageKey);

    const maxAttempts = 24;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const candidate = layout === 'ru'
            ? generateRuBeginnerSentenceText(poolText, minChars, maxChars)
            : generateEnBeginnerSentenceText(poolText, minChars, maxChars);
        if (!storageKey || !recentTexts.includes(candidate)) {
            if (storageKey) saveRecentTexts(storageKey, recentTexts.concat([candidate]), 16);
            return candidate;
        }
    }

    // Fallback: last candidate even if collision.
    const fallback = layout === 'ru'
        ? generateRuBeginnerSentenceText(poolText, minChars, maxChars)
        : generateEnBeginnerSentenceText(poolText, minChars, maxChars);
    if (storageKey) saveRecentTexts(storageKey, recentTexts.concat([fallback]), 16);
    return fallback;
}

// Start practice - ОПТИМИЗИРОВАНА
function startPractice(text, mode, lesson = null) {
    if (typeof window.__zoobLoadDeferredScripts === 'function') {
        window.__zoobLoadDeferredScripts();
    }
    if (mode === 'lesson' && lesson && !lesson.isShopLesson && window.lessonProgressionModule && typeof window.lessonProgressionModule.isLessonUnlocked === 'function') {
        var lv = lesson.level || (currentLevelData && currentLevelData.level) || 'beginner';
        var fullList = (currentLevelData && currentLevelData.lessons) ? currentLevelData.lessons : [];
        var lKey = lesson.key || ('lesson_' + lv + '_' + lesson.id);
        var alreadyDone = window.statsModule && window.statsModule.getLessonStats(lKey);
        if (fullList.length && !(alreadyDone && alreadyDone.completed) && !window.lessonProgressionModule.isLessonUnlocked(window.statsModule, lv, lesson, fullList)) {
            showToast(t('lessonLockedToast'), 'info', t('tip'));
            return;
        }
    }
    toggleFooter(false); // Скрываем футер при начале практики
    // КРИТИЧНО: Сразу сбрасываем паузу чтобы избежать блокировки ввода
    app.isPaused = false;
    
    hideAllScreens();
    const practiceScreen = DOM.get('practiceScreen');
    if (practiceScreen) {
        practiceScreen.classList.remove('hidden');
    }
    
    // Очищаем старые таймеры
    if (app.timerInterval) {
        clearInterval(app.timerInterval);
        app.timerInterval = null;
    }
    if (app.animationFrameId) {
        cancelAnimationFrame(app.animationFrameId);
        app.animationFrameId = null;
    }
    
    // Очищаем переменные теста на скорость и паузы
    app.speedTestStartTime = null;
    app.speedTestEndTime = null;
    app.pauseStartTime = null;
    app.totalLessonPauseDuration = 0;
    app._pauseStartAt = null;

    // Сбрасываем кэш ошибок текущей сессии и запускаем flush-таймер
    _keyErrorsCache = {};
    /** Накопление по клавишам за всю сессию (не обнуляется периодическим flush в LS - иначе «проблемные клавиши» в результатах терялись) */
    app._sessionKeyErrors = {};
    _startKeyErrorsFlushTimer();

    // Запускаем запись истории скорости для WPM-графика
    if (window.wpmChartModule) window.wpmChartModule.startRecording();
    
    app.currentMode = mode;
    app.currentLesson = lesson;

    let effectiveText = text;
    if (mode === 'lesson' && lesson && lesson.fixedText === true) {
        effectiveText = String(lesson.text || text || '').trim();
    } else if (mode === 'lesson' && lesson && lesson.isShopLesson === true && lesson.text) {
        // Уроки из магазина: целый осмысленный текст из данных (без перестановки фраз и обрезки до «салата»).
        effectiveText = String(lesson.text || text || '').trim();
    } else if (
        mode === 'lesson' &&
        lesson &&
        lesson.digitsOnly === true
    ) {
        // digitsOnly уроки должны содержать только цифровой пул:
        // не используем RU/EN/UA beginner-генераторы (они подмешивают fallback словами при "неподходящем" пуле).
        const pool = (lesson && lesson.text) ? lesson.text : text;
        effectiveText = String(pool || '').trim();

        // Чтобы уроки для `medium` и `hard` были существенно длиннее (цель: 3–5 минут),
        // расширяем цифровой пул повторением без добавления каких-либо новых символов.
        var targetChars = 0;
        if (lesson && lesson.difficulty === 'medium') targetChars = 700;
        else if (lesson && lesson.difficulty === 'hard') targetChars = 900;

        if (targetChars && effectiveText && effectiveText.length < targetChars) {
            // base должен быть без завершающих пробелов, чтобы склейка давала стабильную разметку.
            var base = effectiveText.replace(/\s+$/g, '');
            var out = base;
            while (out.length < targetChars) {
                out += ' ' + base;
            }
            // trimEnd уберёт только пробелы, а цифры останутся.
            effectiveText = out.slice(0, targetChars).trimEnd();
        }
    } else if (
        mode === 'lesson' &&
        lesson &&
        lesson.layout === 'ua' &&
        lesson.text &&
        lesson.digitsOnly !== true
    ) {
        const isBeginnerishUa = (lesson.level === 'beginner' || lesson.difficulty === 'easy');
        if (isBeginnerishUa) {
            effectiveText = generateUaBeginnerLessonText(lesson.text, 100, 200);
        } else {
            effectiveText = String(lesson.text || text || '').trim().replace(/\s+/g, ' ');
        }
    } else if (
        mode === 'lesson' &&
        lesson &&
        (lesson.layout === 'ru' || lesson.layout === 'en') &&
        lesson.text
    ) {
        const isBeginnerish = (lesson.level === 'beginner' || lesson.difficulty === 'easy');
        if (isBeginnerish) {
            // Короткие пулы слов: собираем связные предложения с рандомом только внутри шаблона.
            effectiveText = generateRuEnBeginnerUniqueText(lesson.text, lesson.key, lesson.layout, 100, 200);
        } else {
            // Средний/продвинутый: как в магазине - цельный текст из данных, без перестановки фраз.
            effectiveText = String(lesson.text || text || '').trim().replace(/\s+/g, ' ');
        }
    }

    // UA beginner hard validation: if we accidentally ended up with a non-UA string
    // (e.g. due to rapid navigation and a wrong target), force a valid UA fallback.
    if (
        mode === 'lesson' &&
        lesson &&
        lesson.layout === 'ua' &&
        (lesson.level === 'beginner' || lesson.difficulty === 'easy') &&
        lesson.digitsOnly !== true
    ) {
        const uaAllowed = /^[абвгґдеєжзиіїйклмнопрстуфхцчшщьюя ]+$/i;
        const s = String(effectiveText || '');
        if (!s || !uaAllowed.test(s) || s.trim().length === 0) {
            effectiveText = generateUaBeginnerLessonText(lesson.text || text, 100, 200);
        }
    }

    // Hard safety: never allow an empty target string.
    // When `app.currentText.length === 0`, the UI renders an empty field (no spans),
    // which looks like the practice is "broken".
    if (typeof effectiveText !== 'string') effectiveText = String(effectiveText ?? '');
    if (!effectiveText || effectiveText.trim().length === 0) {
        const pool = (lesson && lesson.text) ? lesson.text : text;
        if (lesson && lesson.layout === 'ua' && lesson.digitsOnly !== true) {
            effectiveText = generateUaBeginnerLessonText(pool, 100, 200);
        } else {
            // Best-effort fallback: use original pool (may still be generated elsewhere).
            effectiveText = String(pool || '').trim();
        }
        if (!effectiveText) effectiveText = (lesson && lesson.digitsOnly === true) ? '0' : 'дім кіт мама тато вода рука нога день ніч стіл стілець вікно двері лампа книга';
    }

    app.currentText = effectiveText;
    app.currentPosition = 0;
    app.startTime = Date.now();
    app.endTime = null;
    app.isPaused = false;
    app.errors = 0;
    app.totalChars = effectiveText.length;
    app.typedText = '';

    if (mode === 'speedtest') {
        app._speedTestPrevProgressPct = null;
        try {
            var _lsPrev = localStorage.getItem('zoobastiks_speedtest_last_progress');
            if (_lsPrev) {
                var _pj = JSON.parse(_lsPrev);
                if (_pj && typeof _pj.pct === 'number' && _pj.pct >= 0 && _pj.pct <= 100) {
                    app._speedTestPrevProgressPct = _pj.pct;
                }
            }
        } catch (_e) {}
    } else {
        app._speedTestPrevProgressPct = null;
    }

    app._errorSnippetList = [];
    app._errorPairCounts = {};
    app._errorsAfterSpaceCount = 0;
    app._replayAutoFinishing = false;
    if (mode === 'replay-errors') {
        app._replayDeadline = Date.now() + (app._replayTimeLimitSec || 60) * 1000;
    } else {
        app._replayDeadline = null;
    }
    initLessonCheckpoints();
    
    // Очищаем кэш DOM при смене экрана
    DOM.clear();
    
    // Автоматически устанавливаем раскладку по языку урока
    if (lesson && lesson.layout) {
        app.currentLayout = lesson.layout;
        const layoutNames = { 'ru': 'РУС', 'en': 'ENG', 'ua': 'УКР' };
        const layoutEl = DOM.get('currentLayout');
        if (layoutEl) {
            layoutEl.textContent = layoutNames[app.currentLayout] || 'РУС';
        }
        window.keyboardModule.render(app.currentLayout);
    }
    
    // Сбросить кнопку паузы
    const pauseBtn = DOM.get('pauseBtn');
    if (pauseBtn) {
        const span = pauseBtn.querySelector('span');
        if (span) {
            // Safety: translations might not be ready yet on very fast navigation.
            const tr = window.translations && window.translations[app.lang] ? window.translations[app.lang] : null;
            const pauseText = tr && tr.pause ? tr.pause : 'Пауза';
            span.textContent = pauseText;
        }
    }
    
    renderText();
    updateStats();
    updateCheckpointHintLine();
    updateReplayDeadlineUI();
    if (mode === 'replay-errors' && typeof showToast === 'function') {
        showToast(trReplace('replayModeBanner', { s: String(app._replayTimeLimitSec || 60) }), 'info', '⏱');
    }

    // Накладываем heatmap ошибок на клавиатуру
    if (window.heatmapModule) {
        setTimeout(function () {
            var kbEl = document.getElementById('keyboardContainer');
            if (kbEl) {
                window.heatmapModule.renderHeatmap(kbEl, window.heatmapModule.getErrorMap());
            }
        }, 200);
    }
    
    if (mode === 'speedtest') {
        startSpeedTestTimer();
    } else {
        startStatsTimer();
    }
    syncPracticeMissionBar();
    // Фокус на body, чтобы нажатия клавиш сразу обрабатывались (особенно после «Повторить»).
    setTimeout(function () { document.body.focus(); }, 0);
}

// Render text display - reuses existing span nodes to avoid per-keypress DOM create/destroy.
function renderText() {
    const display = DOM.get('textDisplay');
    if (!display) return;

    // Safety: restore text if it got cleared unexpectedly.
    if (typeof app.currentText !== 'string' || app.currentText.length === 0) {
        const lesson = app.currentLesson;
        const pool = (lesson && lesson.text) ? lesson.text : '';
        if (lesson && lesson.layout === 'ua' && lesson.digitsOnly !== true) {
            app.currentText = generateUaBeginnerLessonText(pool, 100, 200);
            app.totalChars = app.currentText.length;
            app.currentPosition = Math.min(app.currentPosition || 0, app.currentText.length);
            app.typedText = '';
        } else {
            app.currentText = String(pool || '').trim() || ' ';
            app.totalChars = app.currentText.length;
            app.currentPosition = Math.min(app.currentPosition || 0, app.currentText.length);
        }
    }

    const WINDOW_SIZE = 60;
    const TYPED_VISIBLE = 10;

    const startPos = Math.max(0, app.currentPosition - TYPED_VISIBLE);
    const endPos = Math.min(app.currentText.length, startPos + WINDOW_SIZE);
    const windowLen = endPos - startPos;

    if (windowLen === 0) { display.innerHTML = ''; return; }

    // Adjust child count WITHOUT clearing innerHTML - reuse existing spans.
    while (display.childElementCount > windowLen) display.removeChild(display.lastChild);
    if (display.childElementCount < windowLen) {
        const frag = document.createDocumentFragment();
        for (let i = display.childElementCount; i < windowLen; i++) frag.appendChild(document.createElement('span'));
        display.appendChild(frag);
    }

    const children = display.children;

    for (let i = 0; i < windowLen; i++) {
        const charIdx = startPos + i;
        const char = app.currentText[charIdx];
        const span = children[i];

        let newClass;
        if (charIdx < app.currentPosition) {
            newClass = 'char-typed';
            const dist = app.currentPosition - charIdx;
            const opacity = Math.max(0.2, 1 - (dist / TYPED_VISIBLE));
            // cssText batches two property writes into one style recalc.
            span.style.cssText = 'opacity:' + opacity + ';font-size:0.9em';
        } else {
            if (span.style.cssText) span.style.cssText = '';
            newClass = charIdx === app.currentPosition ? 'char-current' : 'char-future';
        }

        if (span.className !== newClass) span.className = newClass;

        // Use \u00A0 for space to avoid innerHTML (avoids HTML parser call).
        const content = char === ' ' ? '\u00A0' : char;
        if (span.textContent !== content) span.textContent = content;
    }

    // Direct O(1) index access - no querySelector('.char-current') needed.
    const cursorSpan = children[app.currentPosition - startPos];
    if (cursorSpan) {
        // 'instant' eliminates competing smooth-scroll animations during fast typing.
        cursorSpan.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
    }

    if (app.currentPosition < app.currentText.length) {
        window.keyboardModule.highlightStatic(app.currentText[app.currentPosition]);
    }
}

// Handle key press - ОПТИМИЗИРОВАНА
function handleKeyPress(e) {
    if (isModalVisible('resultsModal')) return;
    // Разрешаем ввод во всех режимах практики
    const validModes = ['practice', 'speedtest', 'lesson', 'free', 'adaptive', 'replay-errors'];
    if (!validModes.includes(app.currentMode) || app.isPaused) return;
    
    // Ignore special keys; allow Enter only when the expected character is '\n'
    const expectedChar = app.currentText[app.currentPosition];
    if (e.key.length > 1 && e.key !== 'Backspace' && !(e.key === 'Enter' && expectedChar === '\n')) return;
    
    e.preventDefault();
    
    if (e.key === 'Backspace') {
        if (app.currentPosition > 0) {
            app.currentPosition--;
            // Remove last character from typed text
            if (app.typedText) {
                app.typedText = app.typedText.slice(0, -1);
            }
            renderText();
            updateStats(); // Throttled
        }
        return;
    }
    
    // НОВАЯ ЛОГИКА: Блокируем неправильный ввод
    if (e.key !== expectedChar) {
        // Неправильный символ - играем звук ошибки и НЕ двигаемся дальше
        playSound('error');
        app.errors++;
        // Per-key error tracking - in-memory, flush при finishPractice
        var _ec = app.currentText[app.currentPosition];
        var _p = app.currentPosition;
        var _t = app.currentText;
        /* Одна позиция = один символ ожидания (включая пробел) */
        if (typeof _ec === 'string' && _ec.length === 1) {
            _keyErrorsCache[_ec] = (_keyErrorsCache[_ec] || 0) + 1;
            if (!app._sessionKeyErrors) app._sessionKeyErrors = {};
            app._sessionKeyErrors[_ec] = (app._sessionKeyErrors[_ec] || 0) + 1;
        }
        if (_p > 0 && _t[_p - 1] === ' ') {
            app._errorsAfterSpaceCount = (app._errorsAfterSpaceCount || 0) + 1;
        }
        if (_p > 0 && _t.length) {
            var pair = _t[_p - 1] + (_t[_p] || '');
            if (pair.length >= 2) {
                app._errorPairCounts = app._errorPairCounts || {};
                app._errorPairCounts[pair] = (app._errorPairCounts[pair] || 0) + 1;
            }
        }
        var sn = _t.slice(Math.max(0, _p - 4), Math.min(_t.length, _p + 7)).replace(/\s+/g, ' ').trim();
        if (sn.length >= 2) {
            app._errorSnippetList = app._errorSnippetList || [];
            app._errorSnippetList.push(sn);
        }
        highlightError();
        return;
    }
    
    // Если дошли сюда - символ правильный
    playSound('correct');
    window.keyboardModule.highlight(e.key);
    
    app.currentPosition++;
    
    // Store typed text for comparison
    if (!app.typedText) app.typedText = '';
    app.typedText += e.key;
    
    renderText(); // Оптимизирован с DocumentFragment
    updateStats(); // Throttled - не обновляет DOM при каждом нажатии
    maybeTriggerTypingCheckpoint();
    updateCheckpointHintLine();
    
    // Check if finished
    if (app.currentPosition >= app.currentText.length) {
        finishPractice();
    }
}

// Подсветка ошибки (мигание) - ОПТИМИЗИРОВАНА
function highlightError() {
    const display = DOM.get('textDisplay');
    if (!display) return;
    
    display.style.animation = 'shake 0.3s';
    setTimeout(() => {
        if (display) {
            display.style.animation = '';
        }
    }, 300);
}

// Update stats during practice - ОПТИМИЗИРОВАННАЯ с кэшированием DOM
const updateStats = throttle(function() {
    const elapsed = app.isPaused ? 0 : Math.max(0, (Date.now() - app.startTime - (app.totalLessonPauseDuration || 0)) / 1000);
    const minutes = elapsed / 60;
    
    // Кэшируем элементы
    const speedEl = DOM.get('currentSpeed');
    const accuracyEl = DOM.get('currentAccuracy');
    const timeEl = DOM.get('currentTime');
    const progressEl = DOM.get('currentProgress');
    const progressBar = DOM.get('progressBar');
    
    if (!speedEl || !accuracyEl || !timeEl || !progressEl || !progressBar) return;
    
    // Speed (characters per minute)
    const speed = minutes > 0 ? Math.round(app.currentPosition / minutes) : 0;
    if (speedEl.textContent !== String(speed)) {
        speedEl.textContent = speed;
    }
    
    // Accuracy
    const totalAttempts = app.currentPosition + app.errors;
    const accuracy = totalAttempts > 0 
        ? Math.round((app.currentPosition / totalAttempts) * 100) 
        : 100;
    if (accuracyEl.textContent !== String(accuracy)) {
        accuracyEl.textContent = accuracy;
    }
    
    // Time
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    if (timeEl.textContent !== timeStr) {
        timeEl.textContent = timeStr;
    }
    
    // Progress
    const progress = Math.round((app.currentPosition / app.totalChars) * 100);
    if (progressEl.textContent !== String(progress)) {
        progressEl.textContent = progress;
    }
    const progressWidth = progress + '%';
    if (progressBar.style.width !== progressWidth) {
        progressBar.style.width = progressWidth;
    }

    updateCheckpointHintLine();
}, 100); // Throttle to max 10 updates per second

// Stats timer for regular lessons - ОПТИМИЗИРОВАН с requestAnimationFrame
function startStatsTimer() {
    if (app.timerInterval) {
        clearInterval(app.timerInterval);
    }
    if (app.animationFrameId) {
        cancelAnimationFrame(app.animationFrameId);
    }
    
    let lastUpdate = 0;
    const update = (currentTime) => {
        if (app.currentMode === 'replay-errors' && app._replayDeadline) {
            if (currentTime - (app._lastReplayUiTs || 0) >= 250) {
                app._lastReplayUiTs = currentTime;
                updateReplayDeadlineUI();
            }
        }
        if (app.isPaused) {
            app.animationFrameId = requestAnimationFrame(update);
            return;
        }
        
        if (currentTime - lastUpdate >= 1000) {
            // startStatsTimer отвечает только за таймер; скорость/точность/прогресс - updateStats
            const elapsed = Math.max(0, (Date.now() - app.startTime - (app.totalLessonPauseDuration || 0)) / 1000);
            const timeEl = DOM.get('currentTime');
            if (timeEl) {
                const mins = Math.floor(elapsed / 60);
                const secs = Math.floor(elapsed % 60);
                const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
                if (timeEl.textContent !== timeStr) {
                    timeEl.textContent = timeStr;
                }
            }
            if (app.currentMode === 'replay-errors' && app._replayDeadline && Date.now() >= app._replayDeadline && !app._replayAutoFinishing) {
                app._replayAutoFinishing = true;
                finishPractice();
                return;
            }
            lastUpdate = currentTime;
        }
        
        app.animationFrameId = requestAnimationFrame(update);
    };
    
    app.animationFrameId = requestAnimationFrame(update);
}

// Speed test timer - ОПТИМИЗИРОВАН с requestAnimationFrame
function startSpeedTestTimer() {
    if (app.timerInterval) {
        clearInterval(app.timerInterval);
    }
    if (app.animationFrameId) {
        cancelAnimationFrame(app.animationFrameId);
    }
    
    // Сохраняем начальное время и продолжительность
    app.speedTestStartTime = Date.now();
    app.speedTestEndTime = app.speedTestStartTime + (app.speedTestDuration * 1000);
    
    // Показываем начальное время
    const timeEl = DOM.get('currentTime');
    if (timeEl) {
        const mins = Math.floor(app.speedTestDuration / 60);
        const secs = app.speedTestDuration % 60;
        timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    const update = (currentTime) => {
        if (app.isPaused) {
            app.animationFrameId = requestAnimationFrame(update);
            return;
        }
        
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((app.speedTestEndTime - now) / 1000));
        
        if (remaining <= 0) {
            if (app.animationFrameId) {
                cancelAnimationFrame(app.animationFrameId);
                app.animationFrameId = null;
            }
            finishPractice();
            return;
        }
        
        const timeEl = DOM.get('currentTime');
        const speedEl = DOM.get('currentSpeed');
        
        if (timeEl) {
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
            if (timeEl.textContent !== timeStr) {
                timeEl.textContent = timeStr;
            }
        }
        
        if (speedEl) {
            const elapsed = (now - app.speedTestStartTime) / 1000;
            const minutes = elapsed / 60;
            const speed = minutes > 0 ? Math.round(app.currentPosition / minutes) : 0;
            if (speedEl.textContent !== String(speed)) {
                speedEl.textContent = speed;
            }
        }
        
        app.animationFrameId = requestAnimationFrame(update);
    };
    
    app.animationFrameId = requestAnimationFrame(update);
}

// Toggle pause
function togglePause() {
    if (app.isPaused) {
        // Снимаем паузу
        app.isPaused = false;
        
        const now = Date.now();
        if (app.currentMode === 'speedtest' && app.pauseStartTime) {
            // Speed test: сдвигаем время окончания
            const pauseDuration = now - app.pauseStartTime;
            app.speedTestEndTime += pauseDuration;
            app.pauseStartTime = null;
        } else if (app._pauseStartAt) {
            // Уроки/свободный режим: накапливаем общее время паузы
            app.totalLessonPauseDuration += now - app._pauseStartAt;
            app._pauseStartAt = null;
        }
        if (app._replayPausedAt && app._replayDeadline) {
            app._replayDeadline += now - app._replayPausedAt;
            app._replayPausedAt = null;
        }
        
        const pauseBtn = DOM.get('pauseBtn');
        if (pauseBtn) {
            const span = pauseBtn.querySelector('span');
            if (span) {
                const tr = window.translations && window.translations[app.lang] ? window.translations[app.lang] : null;
                span.textContent = (tr && tr.pause) ? tr.pause : 'Пауза';
            }
        }
        updateReplayDeadlineUI();
    } else {
        // Ставим на паузу
        app.isPaused = true;
        
        if (app.currentMode === 'speedtest') {
            app.pauseStartTime = Date.now();
        } else {
            // Для уроков - запоминаем момент начала паузы
            app._pauseStartAt = Date.now();
        }
        if (app.currentMode === 'replay-errors' && app._replayDeadline) {
            app._replayPausedAt = Date.now();
        }
        
        const pauseBtn = DOM.get('pauseBtn');
        if (pauseBtn) {
            const span = pauseBtn.querySelector('span');
            if (span) {
                const tr = window.translations && window.translations[app.lang] ? window.translations[app.lang] : null;
                span.textContent = (tr && tr.resume) ? tr.resume : 'Продолжить';
            }
        }
        updateReplayDeadlineUI();
    }
}

// Restart practice
function restartPractice() {
    // Speed test: always generate a fresh random word set.
    if (app.currentMode === 'speedtest') {
        showSpeedTest();
        return;
    }

    // Ukrainian beginner lessons: re-generate from the pool each time.
    if (
        app.currentLesson &&
        app.currentLesson.layout === 'ua' &&
        app.currentLesson.level === 'beginner' &&
        app.currentMode === 'lesson'
    ) {
        startPractice(app.currentLesson.text, app.currentMode, app.currentLesson);
        return;
    }

    startPractice(app.currentText, app.currentMode, app.currentLesson);
}

// Exit practice - ОПТИМИЗИРОВАНА
function exitPractice() {
    var pmb = document.getElementById('practiceMissionBar');
    if (pmb) pmb.classList.add('hidden');
    // Сбрасываем паузу при выходе
    app.isPaused = false;
    app._replayDeadline = null;
    app._replayPausedAt = null;
    app._replayAutoFinishing = false;
    app._lastReplayUiTs = 0;
    var rdl = document.getElementById('replayDeadlineLine');
    if (rdl) {
        rdl.classList.add('hidden');
        rdl.textContent = '';
    }
    if (window.wpmChartModule) window.wpmChartModule.stopRecording();
    
    if (app.timerInterval) {
        clearInterval(app.timerInterval);
        app.timerInterval = null;
    }
    
    if (app.animationFrameId) {
        cancelAnimationFrame(app.animationFrameId);
        app.animationFrameId = null;
    }
    
    // Останавливаем welcome звук если играет
    if (audioWelcome && !audioWelcome.paused) {
        audioWelcome.pause();
        audioWelcome.currentTime = 0;
    }

    var scrollFromKey = null;
    if (app.currentLesson && (app.currentMode === 'lesson' || app.currentMode === 'practice')) {
        scrollFromKey = app.currentLesson.key || null;
        if (!scrollFromKey && currentLevelData) {
            scrollFromKey = lessonListKeyFor(app.currentLesson, currentLevelData.level || app.currentLesson.level);
        }
    }
    
    if (app.currentLesson && currentLevelData) {
        if (scrollFromKey) app._pendingLessonListScrollFromKey = scrollFromKey;
        showLessons();
        setTimeout(() => showLessonList(currentLevelData), 100);
    } else if (app.currentLesson) {
        showLessons();
    } else {
        showHome();
    }
}

function grantCoinsForNewAchievements(newlyAchievements) {
    if (!newlyAchievements || newlyAchievements.length === 0) return;
    if (!window.achievementsModule || !window.achievementsModule.COINS_PER_ACHIEVEMENT) return;
    var totalCoins = window.achievementsModule.COINS_PER_ACHIEVEMENT * newlyAchievements.length;
    const user = window.authModule?.getCurrentUser();
    if (user && window.authModule) {
        window.authModule.addCoins(user.uid, totalCoins).then(function (result) {
            if (result.success) {
                var updatedUser = window.authModule.getCurrentUser();
                if (updatedUser) updateUserUI(updatedUser, updatedUser);
                var msg = app.lang === 'en' ? '+' + totalCoins + ' coins for achievements!' : '+' + totalCoins + ' монет за достижения!';
                showToast(msg, 'success', '🪙');
            }
        }).catch(function (err) { console.error('Achievement coins:', err); });
        return;
    }
    if (totalCoins > 0 && window.guestPromisedCoins) {
        window.guestPromisedCoins.add(totalCoins);
        if (typeof updateGuestPromisedHeader === 'function') updateGuestPromisedHeader();
        var msgG = app.lang === 'en' ? '+' + totalCoins + ' coins for achievements (saved for sign-in)!' : app.lang === 'ua'
            ? '+' + totalCoins + ' монет за досягнення (збережено до входу)!'
            : '+' + totalCoins + ' монет за достижения (сохранено до входа)!';
        showToast(msgG, 'success', '🪙');
    }
}

// Finish practice - ОПТИМИЗИРОВАНА
async function finishPractice() {
    if (app.timerInterval) {
        clearInterval(app.timerInterval);
        app.timerInterval = null;
    }
    
    if (app.animationFrameId) {
        cancelAnimationFrame(app.animationFrameId);
        app.animationFrameId = null;
    }

    app._replayDeadline = null;
    app._replayPausedAt = null;
    app._replayAutoFinishing = false;
    app._lastReplayUiTs = 0;
    var _replayLineEl = document.getElementById('replayDeadlineLine');
    if (_replayLineEl) {
        _replayLineEl.classList.add('hidden');
        _replayLineEl.textContent = '';
    }
    
    // БЛОКИРУЕМ ДАЛЬНЕЙШИЙ ВВОД
    app.isPaused = true;
    
    app.endTime = Date.now();
    // Вычитаем накопленное время пауз (для уроков/свободного режима)
    const pauseOffset = app.currentMode === 'speedtest' ? 0 : (app.totalLessonPauseDuration || 0);
    const elapsed = Math.max(1, (app.endTime - app.startTime - pauseOffset) / 1000);
    const minutes = elapsed / 60;
    const speed = Math.round(app.currentPosition / minutes);
    
    // НОВАЯ ФОРМУЛА ТОЧНОСТИ
    const totalAttempts = app.currentPosition + app.errors;
    const accuracy = totalAttempts > 0 
        ? Math.round((app.currentPosition / totalAttempts) * 100) 
        : 100;
    
    var _sessionMode = app.currentMode;
    if (app.currentMode === 'practice' && app.currentLesson) _sessionMode = 'lesson';
    const sessionData = {
        speed,
        accuracy,
        time: Math.round(elapsed),
        errors: app.errors,
        mode: _sessionMode,
        layout: app.currentLayout,
        lessonKey: app.currentLesson?.key || null,
        lessonName: app.currentLesson?.name || null,
        timestamp: Date.now()
    };

    // Сначала проверяем «первый проход» ДО сохранения сессии (иначе урок уже помечен пройденным и награда считается как за повтор)
    let rewardCoins = 0;
    let isFirstTimeCompletion = false;
    if (app.currentLesson && (app.currentMode === 'lesson' || app.currentMode === 'practice')) {
        const lessonKey = app.currentLesson.key || `lesson_${app.currentLesson.id}`;
        const lessonStatsBefore = window.statsModule.getLessonStats(lessonKey);
        isFirstTimeCompletion = !lessonStatsBefore || !lessonStatsBefore.completed;
        rewardCoins = calculateLessonRewardCoins(app.currentLesson, accuracy, isFirstTimeCompletion);
    }
    
    window.statsModule.addSession(sessionData);

    if (isFirstTimeCompletion && app.currentLesson && !app.currentLesson.isShopLesson && (app.currentMode === 'lesson' || app.currentMode === 'practice')) {
        var _progS = window.lessonProgressionModule;
        var _lk = app.currentLesson.level || (currentLevelData && currentLevelData.level);
        if (_progS && typeof _progS.getTierCompletion === 'function' && window.statsModule && (_lk === 'beginner' || _lk === 'medium' || _lk === 'advanced')) {
            var _lay = app.currentLesson.layout || (typeof selectedLessonLang !== 'undefined' ? selectedLessonLang : 'ru');
            var _tc = _progS.getTierCompletion(window.statsModule, _lk, _lay);
            if (_tc.total > 0 && _tc.done >= _tc.total && typeof showToast === 'function' && typeof t === 'function') {
                if (_lk === 'beginner') showToast(t('sagaToastChapter2Unlocked'), 'success', t('tip'));
                else if (_lk === 'medium') showToast(t('sagaToastChapter3Unlocked'), 'success', t('tip'));
                else showToast(t('sagaToastCampaignComplete'), 'success', t('tip'));
            }
        }
    }

    updateStreak();
    if (window.levelModule) {
        applySessionXpAndLevelReward(window.levelModule.calculateSessionXP(sessionData));
    }
    var newlyAchievements = window.achievementsModule ? window.achievementsModule.checkAndNotify() : [];
    if (newlyAchievements && newlyAchievements.length > 0 && app.soundEnabled && audioCompleteAdvanced) {
        audioCompleteAdvanced.currentTime = 0;
        audioCompleteAdvanced.play().catch(() => {});
    }

    const user = window.authModule?.getCurrentUser();
    if (user && window.authModule) {
        window.authModule.addUserSession(user.uid, sessionData).catch(err => {
            console.error('Failed to save session to profile:', err);
        });
        
        if (rewardCoins > 0) {
            window.authModule.addCoins(user.uid, rewardCoins).then(result => {
                if (result.success) {
                    const updatedUser = window.authModule.getCurrentUser();
                    updateUserUI(updatedUser, updatedUser);
                    const message = isFirstTimeCompletion
                        ? `+${rewardCoins} ${app.lang === 'ru' ? 'монет за урок!' : app.lang === 'en' ? 'coins for lesson!' : 'монет за урок!'}`
                        : `+${rewardCoins} ${app.lang === 'ru' ? 'монет за повторное прохождение' : app.lang === 'en' ? 'coins for replay' : 'монет за повторне проходження'}`;
                    showToast(message, 'success', app.lang === 'ru' ? 'Баланс' : app.lang === 'en' ? 'Balance' : 'Баланс');
                } else {
                    console.error('Failed to add coins:', result.error);
                }
            }).catch(err => {
                console.error('Failed to add coins:', err);
            });
        }
        grantCoinsForNewAchievements(newlyAchievements);
    } else {
        if (rewardCoins > 0 && window.guestPromisedCoins) {
            window.guestPromisedCoins.add(rewardCoins);
            if (typeof updateGuestPromisedHeader === 'function') updateGuestPromisedHeader();
            const message = isFirstTimeCompletion
                ? `+${rewardCoins} ${app.lang === 'ru' ? 'монет за урок!' : app.lang === 'en' ? 'coins for lesson!' : 'монет за урок!'}`
                : `+${rewardCoins} ${app.lang === 'ru' ? 'монет за повторное прохождение' : app.lang === 'en' ? 'coins for replay' : 'монет за повторне проходження'}`;
            showToast(message, 'success', app.lang === 'ru' ? 'К накоплению' : app.lang === 'en' ? 'Saved' : 'До входу');
        }
        grantCoinsForNewAchievements(newlyAchievements);
    }
    
    // Mark timestamp so handleGlobalHotkeys ignores the same keydown event
    // that finished the lesson (prevents instant repeat-round trigger).
    app.practiceFinishedAt = Date.now();

    // Снимок по клавишам за всю сессию (см. app._sessionKeyErrors - не сбрасывается таймером flush)
    app._lastSessionErrors = Object.assign({}, app._sessionKeyErrors || {});

    app._lastErrorReplaySnippets = app.errors > 0 ? buildUniqueErrorSnippets() : [];

    // Сохраняем накопленные ошибки по клавишам в localStorage
    _flushKeyErrors();

    // Идеальная сессия: уменьшаем исторические счётчики по напечатанным буквам
    _decayKeyErrorsIfPerfect(accuracy, app.errors);

    // Останавливаем запись скорости
    if (window.wpmChartModule) window.wpmChartModule.stopRecording();

    var _resultOpts = { missionFirstClear: isFirstTimeCompletion };
    if (app.currentMode === 'speedtest') {
        var _tchars = Math.max(1, app.totalChars || 1);
        var _progPct = Math.min(100, Math.round((app.currentPosition / _tchars) * 100));
        _resultOpts.speedTestProgressPct = _progPct;
        _resultOpts.speedTestPrevPct = app._speedTestPrevProgressPct;
        _resultOpts.speedTestTyped = app.currentPosition;
        _resultOpts.speedTestTotal = app.totalChars || 0;
        try {
            localStorage.setItem('zoobastiks_speedtest_last_progress', JSON.stringify({ pct: _progPct, t: Date.now() }));
        } catch (_lsE) {}
    }
    showResults(speed, accuracy, elapsed, app.errors, rewardCoins, _resultOpts);
    setTimeout(function () {
        if (window.integrityMonitor && typeof window.integrityMonitor.ping === 'function') {
            window.integrityMonitor.ping();
        }
    }, 2600);
}

// Last result data for copy to clipboard
let lastResultData = { speed: 0, accuracy: 0, time: 0, errors: 0, progressPct: null, progressPrevPct: null };

function resetResultAbabaSticker() {
    var el = document.getElementById('resultAbabaSticker');
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('is-ababa-visible');
    el.classList.remove('is-ababa-mirror');
    el.setAttribute('aria-hidden', 'true');
    var row = document.getElementById('resultCoachTipRow');
    if (row) row.classList.remove('resultCoachTipRow--sticker-only');
}

/** Стикер Ababa только после теста скорости: плавное появление снизу. */
function scheduleResultAbabaStickerEntrance() {
    var el = document.getElementById('resultAbabaSticker');
    if (!el) return;
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
    var instant = !app.animationsEnabled;
    try {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) instant = true;
    } catch (_e) {}
    el.classList.remove('is-ababa-visible');
    if (instant) {
        el.classList.add('is-ababa-visible');
        return;
    }
    setTimeout(function () {
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                el.classList.add('is-ababa-visible');
            });
        });
    }, 200);
}

// Show results modal - ОПТИМИЗИРОВАНА. rewardCoins - уже посчитанная награда из finishPractice (чтобы не пересчитывать после addSession).
function showResults(speed, accuracy, time, errors, rewardCoins, options) {
    options = options || {};
    resetResultAbabaSticker();
    lastResultData = { speed, accuracy, time: Math.round(time), errors, progressPct: null, progressPrevPct: null };
    if (app.currentMode === 'speedtest' && typeof options.speedTestProgressPct === 'number') {
        lastResultData.progressPct = options.speedTestProgressPct;
        if (typeof options.speedTestPrevPct === 'number') lastResultData.progressPrevPct = options.speedTestPrevPct;
    }
    var rMission = document.getElementById('resultMissionLine');
    if (rMission) {
        if (app.currentLesson && (app.currentMode === 'lesson' || app.currentMode === 'practice') && window.lessonMissionsModule) {
            var lk = app.currentLesson.level;
            if (!lk && currentLevelData && currentLevelData.level) lk = currentLevelData.level;
            if (app.currentLesson.isShopLesson) {
                if (app.currentLesson.level) lk = app.currentLesson.level;
                else if (app.currentLesson.difficulty === 'hard') lk = 'advanced';
                else if (app.currentLesson.difficulty === 'medium') lk = 'medium';
                else lk = 'beginner';
            }
            if (!lk) lk = 'beginner';
            var mLine = window.lessonMissionsModule.getMissionCompleteLine(app.currentLesson, lk, app.lang, { firstClear: !!options.missionFirstClear });
            if (mLine) {
                rMission.textContent = mLine;
                rMission.classList.remove('hidden');
            } else {
                rMission.textContent = '';
                rMission.classList.add('hidden');
            }
        } else {
            rMission.textContent = '';
            rMission.classList.add('hidden');
        }
    }
    var rCampNext = document.getElementById('resultCampaignNextLine');
    if (rCampNext) {
        rCampNext.textContent = '';
        rCampNext.classList.add('hidden');
        if (options.missionFirstClear && app.currentLesson && !app.currentLesson.isShopLesson && (app.currentMode === 'lesson' || app.currentMode === 'practice')) {
            var progR = window.lessonProgressionModule;
            var layR = app.currentLesson.layout || (typeof selectedLessonLang !== 'undefined' ? selectedLessonLang : 'ru');
            var advR = progR && progR.getTierCompletion && window.statsModule
                ? progR.getTierCompletion(window.statsModule, 'advanced', layR)
                : { done: 0, total: 0 };
            var campaignDoneR = advR.total > 0 && advR.done >= advR.total;
            if (!campaignDoneR && typeof t === 'function') {
                rCampNext.textContent = t('resultCampaignNextHint');
                rCampNext.classList.remove('hidden');
            }
        }
    }
    const speedEl = DOM.get('resultSpeed');
    const accuracyEl = DOM.get('resultAccuracy');
    const timeEl = DOM.get('resultTime');
    const errorsEl = DOM.get('resultErrors');
    const rewardEl = DOM.get('resultReward');
    const rewardAmountEl = DOM.get('resultRewardAmount');
    
    if (speedEl) speedEl.textContent = speed;
    if (accuracyEl) accuracyEl.textContent = accuracy;
    
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    if (timeEl) timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    if (errorsEl) errorsEl.textContent = errors;

    var metricsGrid = document.getElementById('resultMetricsGrid');
    var progCell = document.getElementById('resultProgressCell');
    var progEl = document.getElementById('resultProgress');
    var progSub = document.getElementById('resultProgressSubline');
    var _isSpeedResult = app.currentMode === 'speedtest';
    var _progPct = options.speedTestProgressPct;
    if (metricsGrid && progCell && progEl) {
        if (_isSpeedResult && typeof _progPct === 'number') {
            metricsGrid.classList.remove('grid-cols-4');
            metricsGrid.classList.add('grid-cols-5');
            progCell.classList.remove('hidden');
            progEl.textContent = _progPct + '%';
            var _charsS = trReplace('resultProgressCharsShort', {
                typed: String(options.speedTestTyped != null ? options.speedTestTyped : 0),
                total: String(options.speedTestTotal != null ? options.speedTestTotal : 0)
            });
            var _prevP = options.speedTestPrevPct;
            var _cmp = '';
            if (typeof _prevP !== 'number') {
                _cmp = t('resultProgressNoBaseline');
            } else {
                var _delta = _progPct - _prevP;
                if (_delta > 0) {
                    _cmp = trReplace('resultProgressBeatPrev', { prev: String(_prevP), delta: String(_delta), curr: String(_progPct) });
                } else if (_delta < 0) {
                    _cmp = trReplace('resultProgressBehindPrev', { prev: String(_prevP), delta: String(_delta), curr: String(_progPct) });
                } else {
                    _cmp = trReplace('resultProgressTiePrev', { prev: String(_prevP) });
                }
            }
            if (progSub) {
                progSub.textContent = _cmp + ' \u00b7 ' + _charsS;
                progSub.setAttribute('title', _cmp + ' | ' + _charsS);
            }
        } else {
            metricsGrid.classList.add('grid-cols-4');
            metricsGrid.classList.remove('grid-cols-5');
            progCell.classList.add('hidden');
            if (progSub) {
                progSub.textContent = '';
                progSub.removeAttribute('title');
            }
        }
    }
    
    if (rewardEl && rewardAmountEl) {
        const coins = rewardCoins !== undefined ? rewardCoins : (app.currentLesson && (app.currentMode === 'lesson' || app.currentMode === 'practice')
            ? (() => { const k = app.currentLesson.key || `lesson_${app.currentLesson.id}`; const s = window.statsModule.getLessonStats(k); return calculateLessonRewardCoins(app.currentLesson, accuracy, !s || !s.completed); })()
            : 0);
        var guestHint = document.getElementById('resultGuestPromisedHint');
        if (coins > 0) {
            rewardAmountEl.textContent = `+${coins} ${app.lang === 'ru' ? 'монет' : app.lang === 'en' ? 'coins' : 'монет'}`;
            rewardEl.classList.remove('hidden');
            var isGuest = !(window.authModule && window.authModule.getCurrentUser && window.authModule.getCurrentUser());
            if (guestHint) {
                if (isGuest) {
                    guestHint.classList.remove('hidden');
                    guestHint.textContent = t('resultRewardGuestHint');
                } else {
                    guestHint.classList.add('hidden');
                }
            }
        } else {
            rewardEl.classList.add('hidden');
            if (guestHint) guestHint.classList.add('hidden');
        }
    } else if (rewardEl) {
        rewardEl.classList.add('hidden');
    }
    
    // === PB (личный рекорд): бейдж под строкой «число + зн/мин», на всю ширину ячейки ===
    const pbBadge = document.getElementById('resultPbBadge');
    if (pbBadge) {
        try {
            // Пробуем разные пути к bestSpeed
            let bestSpeed = 0;
            if (window.statsModule && window.statsModule.data) {
                bestSpeed = window.statsModule.data.bestSpeed || 0;
            } else {
                try { bestSpeed = JSON.parse(localStorage.getItem('zoobastiks_stats') || '{}').bestSpeed || 0; } catch (_) {}
            }
            // Сравниваем ПРЕДЫДУЩИЙ рекорд (до этой сессии, он уже мог обновиться)
            // Считаем: если speed >= bestSpeed - новый рекорд
            if (speed > 0 && speed >= bestSpeed && bestSpeed > 0) {
                pbBadge.textContent = speed > bestSpeed ? '🏆 Новый рекорд!' : '🏆 Рекорд!';
                pbBadge.className = 'results-stat-pb-inline results-stat-pb--record';
                pbBadge.setAttribute('title', pbBadge.textContent);
            } else if (bestSpeed > 0 && speed < bestSpeed) {
                const diff = bestSpeed - speed;
                pbBadge.textContent = '-' + diff + ' до рекорда';
                pbBadge.className = 'results-stat-pb-inline results-stat-pb--behind';
                pbBadge.setAttribute('title', pbBadge.textContent);
            } else {
                pbBadge.textContent = '';
                pbBadge.className = 'hidden results-stat-pb-inline';
                pbBadge.removeAttribute('title');
            }
        } catch (_e) {
            pbBadge.textContent = '';
            pbBadge.className = 'hidden results-stat-pb-inline';
            pbBadge.removeAttribute('title');
        }
    }

    // === WPM-график ===
    const chartCanvas = document.getElementById('resultSpeedChart');
    if (chartCanvas && window.wpmChartModule) {
        const history = (app.speedHistory && app.speedHistory.length) ? app.speedHistory.slice() : [];
        // Добавляем финальную точку с реальными данными
        if (speed > 0) {
            history.push({ t: Math.round(time), cpm: speed });
        }
        // Задержка: даём модалу стать visible до рендера (иначе canvas.offsetWidth = 0)
        setTimeout(function () {
            window.wpmChartModule.renderChart(chartCanvas, history);
        }, 80);
    }

    // === Сравнение со вчерашним лучшим результатом (медиана за неделю убрана) ===
    var insightBox = document.getElementById('resultSpeedInsight');
    var insightY = document.getElementById('resultSpeedInsightYesterday');
    if (insightBox && insightY) {
        var ins = computeResultSpeedInsights(speed);
        if (ins.yesterdayLine) {
            insightBox.classList.remove('hidden');
            insightY.textContent = ins.yesterdayLine;
        } else {
            insightBox.classList.add('hidden');
            insightY.textContent = '';
        }
    }

    // === Совет тренера (биграммы / пробел) ===
    var coachBox = document.getElementById('resultCoachTip');
    var coachTxt = document.getElementById('resultCoachTipText');
    if (coachBox && coachTxt) {
        var coach = buildCoachTipFromSession();
        if (coach) {
            coachTxt.textContent = coach;
            coachBox.classList.remove('hidden');
        } else {
            coachBox.classList.add('hidden');
        }
    }

    var coachTipRow = document.getElementById('resultCoachTipRow');
    var ababaStickerEl = document.getElementById('resultAbabaSticker');
    var coachTipVisible = coachBox && !coachBox.classList.contains('hidden');
    var ababaMirror = app.currentMode === 'speedtest' && !coachTipVisible;
    if (coachTipRow) {
        coachTipRow.classList.toggle('resultCoachTipRow--sticker-only', ababaMirror);
    }
    if (ababaStickerEl) {
        ababaStickerEl.classList.toggle('is-ababa-mirror', ababaMirror);
    }

    // === Топ-3 проблемных клавиши сессии ===
    const topErrorsBlock = document.getElementById('resultTopErrors');
    const topErrorsList = document.getElementById('resultTopErrorsList');
    var replayWrap = document.getElementById('resultReplayErrorsWrap');
    var replayBtn = document.getElementById('resultReplayErrorsBtn');
    var canReplay = errors > 0 && app._lastErrorReplaySnippets && app._lastErrorReplaySnippets.length > 0;
    if (replayWrap) {
        if (canReplay) {
            replayWrap.classList.remove('hidden');
            if (replayBtn) replayBtn.textContent = t('resultReplayErrors');
        } else {
            replayWrap.classList.add('hidden');
        }
    }
    if (topErrorsBlock && topErrorsList && window.heatmapModule) {
        // Используем снимок ошибок сессии (до flush), не опустевший _keyErrorsCache
        const sessionErrors = app._lastSessionErrors || {};
        const top = window.heatmapModule.getTopErrors(sessionErrors, 3);
        if (top.length > 0 || canReplay) {
            if (top.length > 0) {
                topErrorsList.innerHTML = top.map(function (e) {
                    var disp = e.key === ' ' ? '␣' : e.key;
                    var safeKey = escapeHtml(String(disp == null ? '' : disp));
                    var cnt = escapeHtml(String(e.count == null ? '' : e.count));
                    return '<span class="results-error-pill">' + safeKey +
                        '<span class="results-error-pill-count">×' + cnt + '</span></span>';
                }).join('');
                topErrorsList.classList.remove('hidden');
            } else {
                topErrorsList.innerHTML = '';
                topErrorsList.classList.add('hidden');
            }
            topErrorsBlock.classList.remove('hidden');
        } else {
            topErrorsBlock.classList.add('hidden');
        }
    } else if (topErrorsBlock) {
        topErrorsBlock.classList.add('hidden');
    }

    // Воспроизводим звук победы
    if (app.soundEnabled && audioVictory) {
        audioVictory.currentTime = 0;
        audioVictory.play().catch(() => {});
    }
    
    const modal = DOM.get('resultsModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        bindResultsModalViewportScale();
        setTimeout(function () { syncResultsModalShellScale(); }, 0);
        var rTitle = document.getElementById('resultsModalTitle');
        if (rTitle) {
            rTitle.setAttribute('tabindex', '-1');
            setTimeout(function () { try { rTitle.focus(); } catch (_e) {} }, 0);
        } else {
            focusFirstInModal(modal);
        }
    }
    if (app.currentMode === 'speedtest') {
        scheduleResultAbabaStickerEntrance();
    }
    updateResultsModalHotkeysHint();
}

function bindResultsModalViewportScale() {
    if (window._resultsModalVvBound) return;
    window._resultsModalVvBound = true;
    var sync = function () { syncResultsModalShellScale(); };
    window.addEventListener('resize', sync);
    var vv = window.visualViewport;
    if (vv) {
        vv.addEventListener('resize', sync);
        vv.addEventListener('scroll', sync);
    }
}

/** Компенсация pinch/масштаба страницы: карточка остаётся читаемой (где браузер отдаёт visualViewport.scale). */
function syncResultsModalShellScale() {
    var modal = document.getElementById('resultsModal');
    if (!modal || modal.classList.contains('hidden')) return;
    var shell = modal.querySelector('.results-modal-shell');
    if (!shell) return;
    var vv = window.visualViewport;
    if (!vv) {
        shell.style.removeProperty('transform');
        shell.style.removeProperty('transform-origin');
        return;
    }
    var s = vv.scale;
    if (typeof s === 'number' && s > 0.15 && s < 0.998) {
        var inv = Math.min(1.85, Math.max(1, 1 / s));
        shell.style.transformOrigin = 'center center';
        shell.style.transform = 'scale(' + inv + ')';
        return;
    }
    var docW = document.documentElement.clientWidth;
    var vwW = vv.width;
    if (window.innerWidth >= 768 && docW > 0 && vwW > 0 && docW > vwW + 6) {
        var z = docW / vwW;
        if (z > 1.02 && z < 2.6) {
            shell.style.transformOrigin = 'center center';
            shell.style.transform = 'scale(' + Math.min(1.75, z) + ')';
            return;
        }
    }
    shell.style.removeProperty('transform');
    shell.style.removeProperty('transform-origin');
}

function _countCharInString(str, c) {
    var s = str.toLowerCase();
    var cl = c.toLowerCase();
    var n = 0;
    for (var i = 0; i < s.length; i++) {
        if (s[i] === cl) n++;
    }
    return n;
}

function _normalizeWeakKeyFromStats(raw) {
    if (raw == null) return '';
    var s = String(raw);
    if (s === 'space' || s === 'Space') return ' ';
    if (s.length === 1) return s.toLowerCase();
    return s.toLowerCase().charAt(0);
}

function _isWeakKeyDigit(k) {
    return typeof k === 'string' && k.length === 1 && k >= '0' && k <= '9';
}

/**
 * Если по цифрам ошибок не меньше, чем по лучшей «буквенной» клавише - тренируем цифры,
 * иначе слова из словаря не содержат 1/0/8 и режим вырождается в случайный набор слов.
 */
function _shouldPreferAdaptiveDigitDrill(top) {
    if (!top || !top.length) return false;
    var bestDigit = null;
    var bestLetter = null;
    top.forEach(function (e) {
        var k = _normalizeWeakKeyFromStats(e.key);
        if (!k || k === ' ') return;
        var c = Math.max(1, Math.round(Number(e.count) || 1));
        if (_isWeakKeyDigit(k)) {
            if (!bestDigit || c > bestDigit.count) bestDigit = { key: k, count: c };
        } else {
            if (!bestLetter || c > bestLetter.count) bestLetter = { key: k, count: c };
        }
    });
    if (!bestDigit) return false;
    if (!bestLetter) return true;
    return bestDigit.count >= bestLetter.count;
}

function generateAdaptiveDigitDrillText(topWeakDigits, weight) {
    var weakDigits = (topWeakDigits || []).filter(_isWeakKeyDigit);
    if (!weakDigits.length) weakDigits = ['3', '4', '5'];
    var allDigits = '0123456789';
    function pickChar() {
        var tw = weakDigits.reduce(function (s, d) { return s + (weight[d] || 1); }, 0);
        if (tw > 0 && Math.random() < 0.7) {
            var r = Math.random() * tw;
            var j;
            for (j = 0; j < weakDigits.length; j++) {
                r -= (weight[weakDigits[j]] || 1);
                if (r <= 0) return weakDigits[j];
            }
            return weakDigits[weakDigits.length - 1];
        }
        return allDigits.charAt(Math.floor(Math.random() * 10));
    }
    var parts = [];
    var approxLen = 0;
    while (approxLen < 500) {
        var chunkLen = 2 + Math.floor(Math.random() * 5);
        var chunk = '';
        var z;
        for (z = 0; z < chunkLen; z++) chunk += pickChar();
        parts.push(chunk);
        approxLen += chunk.length + 1;
    }
    var text = parts.join(' ');
    if (text.length > 520) {
        var cut = text.slice(0, 520);
        var lastSp = cut.lastIndexOf(' ');
        text = lastSp > 0 ? cut.slice(0, lastSp) : cut;
    }
    return text;
}

/**
 * Адаптивный текст: приоритет словам с редкими в словаре слабыми буквами (ф, ы, г…),
 * а не только «о», плюс гарантированные вставки по каждой топ-букве.
 */
function generateAdaptiveText(lang) {
    var layout = (app && app.currentLayout) || lang || 'ru';
    if (typeof speedTestWords === 'undefined') layout = 'ru';
    if (!speedTestWords[layout]) {
        layout = speedTestWords[lang] ? lang : (speedTestWords.ru ? 'ru' : 'en');
    }

    var errorMap = window.heatmapModule ? window.heatmapModule.getErrorMap() : {};
    var top = window.heatmapModule ? window.heatmapModule.getTopErrors(errorMap, 8) : [];

    if (_shouldPreferAdaptiveDigitDrill(top)) {
        var digitWeights = {};
        var digitOrder = [];
        top.forEach(function (e) {
            var k = _normalizeWeakKeyFromStats(e.key);
            if (!_isWeakKeyDigit(k)) return;
            var cnt = Math.max(1, Math.round(Number(e.count) || 1));
            digitWeights[k] = Math.max(digitWeights[k] || 0, cnt);
            if (digitOrder.indexOf(k) === -1) digitOrder.push(k);
        });
        digitOrder.sort(function (a, b) { return (digitWeights[b] || 0) - (digitWeights[a] || 0); });
        return generateAdaptiveDigitDrillText(digitOrder, digitWeights);
    }

    var words = (speedTestWords[layout] || []).slice();
    var extra = (typeof adaptiveExtraWords !== 'undefined' && adaptiveExtraWords[layout]) ? adaptiveExtraWords[layout] : [];
    extra.forEach(function (w) {
        if (words.indexOf(w) === -1) words.push(w);
    });

    if (top.length === 0) {
        return shuffleArray(words).slice(0, 45).join(' ');
    }

    var weakChars = [];
    var weight = {};
    top.forEach(function (e) {
        var raw = (e.key && String(e.key)) ? String(e.key) : '';
        if (!raw || raw === ' ') return;
        var k = _normalizeWeakKeyFromStats(raw);
        if (!k || k === ' ') return;
        if (weakChars.indexOf(k) === -1) weakChars.push(k);
        weight[k] = Math.max(weight[k] || 0, Math.max(1, Math.round(Number(e.count) || 1)));
    });

    if (weakChars.length === 0) {
        return shuffleArray(words).slice(0, 45).join(' ');
    }

    var corpFreq = {};
    weakChars.forEach(function (c) { corpFreq[c] = 0; });
    words.forEach(function (w) {
        var wl = w.toLowerCase();
        weakChars.forEach(function (c) {
            corpFreq[c] += _countCharInString(wl, c);
        });
    });

    function scoreWord(w) {
        var wl = w.toLowerCase();
        var s = 0;
        var distinct = 0;
        weakChars.forEach(function (c) {
            var occ = _countCharInString(wl, c);
            if (!occ) return;
            distinct++;
            var cf = corpFreq[c] || 0;
            s += occ * weight[c] / Math.sqrt(0.75 + cf);
        });
        s += distinct * 12;
        var len = wl.replace(/\s+/g, '').length || 1;
        s += (distinct / len) * 30;
        return s;
    }

    var scored = words.map(function (w) { return { w: w, s: scoreWord(w) }; });
    scored.sort(function (a, b) { return b.s - a.s; });

    var selected = [];
    var used = {};
    var i;
    for (i = 0; i < scored.length && selected.length < 50; i++) {
        if (scored[i].s <= 0) break;
        if (!used[scored[i].w]) {
            selected.push(scored[i].w);
            used[scored[i].w] = 1;
        }
    }

    weakChars.slice(0, 6).forEach(function (c) {
        var candidates = words
            .filter(function (w) { return w.toLowerCase().indexOf(c) !== -1; })
            .map(function (w) {
                var wl = w.toLowerCase();
                var occ = _countCharInString(wl, c);
                return { w: w, ratio: occ / Math.max(1, wl.length) };
            })
            .sort(function (a, b) { return b.ratio - a.ratio || b.w.length - a.w.length; });
        var added = 0;
        for (var j = 0; j < candidates.length && added < 6; j++) {
            var ww = candidates[j].w;
            if (!used[ww]) {
                selected.push(ww);
                used[ww] = 1;
                added++;
            }
        }
    });

    selected = shuffleArray(selected);

    if (selected.length < 14) {
        var fb = shuffleArray(words);
        fb.forEach(function (w) {
            if (selected.length >= 55) return;
            if (!used[w]) {
                selected.push(w);
                used[w] = 1;
            }
        });
    }

    var text = selected.join(' ');
    if (text.length > 520) {
        var cut = text.slice(0, 520);
        var lastSp = cut.lastIndexOf(' ');
        text = lastSp > 0 ? cut.slice(0, lastSp) : cut;
    }
    return text;
}

/** Запускает тренировку слабых клавиш из модала результатов. */
function startAdaptivePractice() {
    // Закрываем модал результатов если открыт
    var modal = DOM.get('resultsModal');
    if (modal) {
        resetResultAbabaSticker();
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    // Закрываем экран профиля если открыт
    var profileScreen = document.getElementById('profileScreen');
    if (profileScreen && !profileScreen.classList.contains('hidden')) {
        profileScreen.classList.add('hidden');
    }
    var text = generateAdaptiveText(app.lang);
    startPractice(text, 'adaptive', null);
}

function updateResultsModalHotkeysHint() {
    const el = document.getElementById('resultsHotkeysHint');
    const row = translations[app.lang] || translations.ru;
    if (el && row && row.hotkeysHint) el.textContent = row.hotkeysHint;
}

// Copy result to clipboard (for sharing). Используем Clipboard API с fallback на execCommand.
function copyResultsToClipboard() {
    const d = lastResultData;
    const mins = Math.floor(d.time / 60);
    const secs = Math.floor(d.time % 60);
    const timeStr = mins + ':' + (secs < 10 ? '0' : '') + secs;
    const site = 'Zoobastiks';
    var _progLine = '';
    if (d.progressPct != null && typeof d.progressPct === 'number') {
        _progLine = app.lang === 'en'
            ? ', progress ' + d.progressPct + '%'
            : app.lang === 'ua'
                ? ', прогрес ' + d.progressPct + '%'
                : ', прогресс ' + d.progressPct + '%';
    }
    const text = app.lang === 'en'
        ? site + ' - ' + d.speed + ' cpm, ' + d.accuracy + '% accuracy, ' + timeStr + ', ' + d.errors + ' errors' + _progLine
        : app.lang === 'ua'
            ? site + ' - ' + d.speed + ' зн/хв, точність ' + d.accuracy + '%, час ' + timeStr + ', помилок ' + d.errors + _progLine
            : site + ' - ' + d.speed + ' зн/мин, точность ' + d.accuracy + '%, время ' + timeStr + ', ошибок ' + d.errors + _progLine;

    function onSuccess() {
        showToast(t('resultCopied'), 'success', '');
    }
    function onFail() {
        showToast(typeof t('copyFailed') !== 'undefined' ? t('copyFailed') : 'Не удалось скопировать', 'warning', '');
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).then(function () {
            onSuccess();
        }).catch(function () {
            fallbackCopy();
        });
    } else {
        fallbackCopy();
    }

    function fallbackCopy() {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        try {
            textarea.select();
            textarea.setSelectionRange(0, text.length);
            var ok = document.execCommand('copy');
            if (ok) onSuccess(); else onFail();
        } catch (e) {
            onFail();
        }
        document.body.removeChild(textarea);
    }
}

// Close results modal - ОПТИМИЗИРОВАНА. skipExit = true: только скрыть окно (для «Повторить»).
function closeResults(skipExit) {
    resetResultAbabaSticker();
    const modal = DOM.get('resultsModal');
    if (modal) {
        var shell = modal.querySelector('.results-modal-shell');
        if (shell) {
            shell.style.removeProperty('transform');
            shell.style.removeProperty('transform-origin');
        }
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    if (skipExit) return;
    if (app.pendingLevelUp) {
        showLevelUpSequence(app.pendingLevelUp);
        app.pendingLevelUp = null;
    } else {
        exitPractice();
    }
}

// Repeat practice - не вызываем exitPractice(), только скрываем модалку и перезапускаем раунд.
function repeatPractice() {
    closeResults(true);
    // Level-up титр/модалку нельзя пропускать: иначе игрок не видит награду и новый ранг.
    if (app.pendingLevelUp) {
        var lv = app.pendingLevelUp;
        app.pendingLevelUp = null;
        app._afterLevelUpAction = 'repeat';
        showLevelUpSequence(lv);
        return;
    }
    restartPractice();
    // Фокус на body, чтобы нажатия клавиш обрабатывались и раунд был активен.
    setTimeout(function () { document.body.focus(); }, 0);
}

/** XP после сессии: уровень, награда монетами (залогиненные), очередь на титр. */
function applySessionXpAndLevelReward(xpAmount) {
    if (!window.levelModule) return;
    var xpResult = window.levelModule.addPlayerXP(xpAmount);
    renderLevelBlock();
    if (!xpResult.leveledUp) return;
    app.pendingLevelUp = xpResult.newLevel;
    var fromLv = typeof xpResult.fromLevel === 'number' ? xpResult.fromLevel : xpResult.newLevel - (xpResult.levelsGained || 1);
    app.pendingLevelUpRewardCoins = window.levelModule.getLevelUpBonusCoins(fromLv, xpResult.newLevel);
    var user = window.authModule && window.authModule.getCurrentUser && window.authModule.getCurrentUser();
    if (user && window.authModule.addCoins && app.pendingLevelUpRewardCoins > 0) {
        window.authModule.addCoins(user.uid, app.pendingLevelUpRewardCoins).then(function (res) {
            if (res.success) {
                var u = window.authModule.getCurrentUser && window.authModule.getCurrentUser();
                if (u && typeof updateUserUI === 'function') updateUserUI(u, u);
            }
        }).catch(function () {});
    } else if (app.pendingLevelUpRewardCoins > 0 && window.guestPromisedCoins) {
        window.guestPromisedCoins.add(app.pendingLevelUpRewardCoins);
        if (typeof updateGuestPromisedHeader === 'function') updateGuestPromisedHeader();
    }
}

// Level block and level-up modal
function renderLevelBlock() {
    if (!window.levelModule) return;
    var info = window.levelModule.getLevelInfo(window.levelModule.getPlayerXP());
    var levelNum = DOM.get('levelNumber');
    var tierName = DOM.get('levelTierName');
    var progressBar = DOM.get('levelProgressBar');
    var xpText = DOM.get('levelXPText');
    if (levelNum) levelNum.textContent = info.level;
    if (tierName) tierName.textContent = info.tierName;
    if (progressBar) progressBar.style.width = info.progressPct + '%';
    if (xpText) {
        if (info.xpToNext > 0) {
            xpText.textContent = info.xpInLevel + '/' + info.xpToNext;
        } else {
            xpText.textContent = info.totalXP;
        }
    }
    var levelBlock = DOM.get('levelBlock');
    if (levelBlock) {
        var tip;
        if (app.lang === 'en') {
            tip = 'Level ' + info.level + ' - ' + info.tierName + ' · ' + info.xpInLevel + '/' + info.xpToNext + ' XP to next';
            if (info.xpToNext <= 0) tip = 'Level ' + info.level + ' - ' + info.tierName;
        } else if (app.lang === 'ua') {
            tip = 'Рівень ' + info.level + ' - ' + info.tierName + ' · ' + info.xpInLevel + '/' + info.xpToNext + ' XP до наступного';
            if (info.xpToNext <= 0) tip = 'Рівень ' + info.level + ' - ' + info.tierName;
        } else {
            tip = 'Уровень ' + info.level + ' - ' + info.tierName + ' · ' + info.xpInLevel + '/' + info.xpToNext + ' XP до следующего';
            if (info.xpToNext <= 0) tip = 'Уровень ' + info.level + ' - ' + info.tierName;
        }
        levelBlock.setAttribute('title', tip);
    }
    var streakEl = DOM.get('streakBadge');
    if (streakEl) {
        var streak = getStreak();
        var numEl = streakEl.querySelector ? streakEl.querySelector('.streak-number') : null;
        if (streak > 0) {
            if (numEl) numEl.textContent = streak; else streakEl.textContent = '\uD83D\uDD25 ' + streak;
            var tr = translations[app.lang] || {};
            var base = (tr.streakHint || 'Серия дней с тренировкой') + ': ' + streak + ' ' + (tr.streakDays || 'дней подряд');
            var freeze = tr.streakFreezeHint || '';
            streakEl.title = freeze ? base + '\n' + freeze : base;
            streakEl.classList.remove('hidden');
        } else {
            streakEl.classList.add('hidden');
        }
    }
}

var levelUpTitrTimeout = null;
var levelUpTitrKeydown = null;

function finishLevelUpTitr() {
    var titr = DOM.get('levelUpTitr');
    if (titr) {
        titr.classList.remove('level-up-titr--epic');
        titr.classList.add('hidden');
        titr.classList.remove('flex');
        var innerEpic = titr.querySelector('.level-up-titr-content');
        if (innerEpic) innerEpic.classList.remove('level-up-titr-content--epic');
    }
    if (levelUpTitrTimeout) {
        clearTimeout(levelUpTitrTimeout);
        levelUpTitrTimeout = null;
    }
    if (levelUpTitrKeydown) {
        document.removeEventListener('keydown', levelUpTitrKeydown);
        levelUpTitrKeydown = null;
    }
    var level = app.levelUpTitrLevel;
    if (level != null) {
        app.levelUpTitrLevel = null;
        showLevelUpModal(level);
    }
}

function showLevelUpSequence(level) {
    if (level == null) level = (window.levelModule && window.levelModule.getLevelInfo(window.levelModule.getPlayerXP()).level) + 1;
    app.levelUpTitrLevel = level;
    var titr = DOM.get('levelUpTitr');
    var numEl = DOM.get('levelUpTitrNumber');
    var rankEl = DOM.get('levelUpTitrRank');
    if (numEl) numEl.textContent = level;
    if (rankEl && window.levelModule) {
        rankEl.textContent = window.levelModule.getTierName(level);
    }
    if (titr) {
        titr.classList.add('level-up-titr--epic');
        titr.classList.remove('hidden');
        titr.classList.add('flex');
        var inner = titr.querySelector('.level-up-titr-content');
        if (inner) inner.classList.add('level-up-titr-content--epic');
    }
    if (app.soundEnabled && audioVictory) {
        audioVictory.currentTime = 0;
        audioVictory.play().catch(function() {});
    }
    if (app.soundEnabled && audioCompleteAdvanced) {
        try {
            var ding = audioCompleteAdvanced.cloneNode();
            ding.volume = SFX_VOLUME * 0.85;
            ding.currentTime = 0;
            setTimeout(function () { ding.play().catch(function () {}); }, 320);
        } catch (_e) {}
    }
    levelUpTitrTimeout = setTimeout(finishLevelUpTitr, 2800);
    levelUpTitrKeydown = function (e) {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            finishLevelUpTitr();
        }
    };
    document.addEventListener('keydown', levelUpTitrKeydown);
}

function showLevelUpModal(level) {
    var modal = DOM.get('levelUpModal');
    var numEl = DOM.get('levelUpNumber');
    var tierEl = DOM.get('levelUpTierName');
    var rewardBlock = DOM.get('levelUpRewardBlock');
    var rewardCoinsEl = DOM.get('levelUpRewardCoins');
    if (numEl) numEl.textContent = level;
    if (tierEl && window.levelModule) {
        tierEl.textContent = window.levelModule.getTierName(level);
    }
    var rc = app.pendingLevelUpRewardCoins || 0;
    var user = window.authModule && window.authModule.getCurrentUser && window.authModule.getCurrentUser();
    if (rewardBlock && rewardCoinsEl) {
        if (rc > 0) {
            rewardBlock.classList.remove('hidden');
            rewardCoinsEl.textContent = user
                ? trReplace('levelUpCoinsGranted', { n: rc })
                : trReplace('levelUpCoinsGuest', { n: rc });
        } else {
            rewardBlock.classList.add('hidden');
        }
    }
    if (modal) {
        var card = modal.querySelector('.level-up-card');
        if (card) card.classList.add('level-up-card--epic');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        focusFirstInModal(modal);
    }
}

function closeLevelUpModal() {
    var modal = DOM.get('levelUpModal');
    if (modal) {
        var card = modal.querySelector('.level-up-card');
        if (card) card.classList.remove('level-up-card--epic');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    app.pendingLevelUpRewardCoins = 0;
    var resume = app._afterLevelUpAction;
    app._afterLevelUpAction = null;
    if (resume === 'repeat') {
        restartPractice();
        setTimeout(function () { document.body.focus(); }, 0);
        return;
    }
    exitPractice();
}

function toggleLevelListModal() {
    var modal = DOM.get('levelListModal');
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
        // Звук сразу по клику (как playMenuClickSound - через новый Audio для надёжного воспроизведения)
        if (app.soundEnabled) {
            try {
                var snd = audioOpenAchievement ? audioOpenAchievement.cloneNode() : new Audio(soundAssetUrl('assets/sounds/open_achievement.ogg'));
                snd.volume = SFX_VOLUME;
                snd.currentTime = 0;
                snd.play().catch(function() {});
            } catch (e) {}
        }
        fillLevelListModal();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        focusFirstInModal(modal);
        document.addEventListener('click', levelListModalOutsideClick);
        document.addEventListener('keydown', levelListModalEscape);
    } else {
        closeLevelListModal();
    }
}

function levelListModalOutsideClick(e) {
    var modal = DOM.get('levelListModal');
    var block = DOM.get('levelBlock');
    if (!modal || !block) return;
    if (modal.contains(e.target) || block.contains(e.target)) return;
    closeLevelListModal();
    document.removeEventListener('click', levelListModalOutsideClick);
}

function levelListModalEscape(e) {
    if (e.key === 'Escape') {
        closeLevelListModal();
        document.removeEventListener('keydown', levelListModalEscape);
    }
}

function closeLevelListModal() {
    var modal = DOM.get('levelListModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    document.removeEventListener('click', levelListModalOutsideClick);
    document.removeEventListener('keydown', levelListModalEscape);
}

function fillLevelListModal() {
    var listEl = DOM.get('levelListModalBody');
    if (!listEl || !window.levelModule) return;
    var current = window.levelModule.getLevelInfo(window.levelModule.getPlayerXP()).level;
    var getTier = window.levelModule.getTierName;
    var getXP = window.levelModule.getXPThreshold;
    var cap = (window.levelModule.getMaxTierLevel && window.levelModule.getMaxTierLevel()) || 150;
    var maxLv = Math.min(280, Math.max(cap, current));
    var html = '<div class="level-list-scroll space-y-1.5 max-h-[60vh] pr-1">';
    for (var lvl = 1; lvl <= maxLv; lvl++) {
        var tier = getTier(lvl);
        var xpFrom = getXP(lvl);
        var xpTo = getXP(lvl + 1);
        var isCurrent = lvl === current;
        var xpText = xpFrom + ' – ' + xpTo + ' XP';
        var cls = isCurrent ? 'bg-amber-500/25 border-amber-500/50 shadow-sm shadow-amber-500/10' : 'bg-white/5 border-white/10 hover:bg-white/8';
        var numCls = isCurrent ? 'text-amber-400' : 'text-gray-300 dark:text-gray-400';
        var tierCls = isCurrent ? 'text-amber-200' : 'text-gray-400 dark:text-gray-500';
        html += '<div class="flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors ' + cls + '">';
        html += '<span class="font-bold tabular-nums w-8 ' + numCls + '">' + lvl + '</span>';
        html += '<span class="text-sm flex-1 truncate mx-2 ' + tierCls + '">' + tier + '</span>';
        html += '<span class="text-xs text-gray-500 dark:text-gray-500 tabular-nums shrink-0">' + xpText + '</span></div>';
    }
    html += '</div>';
    listEl.innerHTML = html;
}

// Play sound
// Pre-allocated audio pools - avoids cloneNode() and GC pressure on every keypress.
const _SFX_POOL_SIZE = 6;
let _clickPool = null, _clickIdx = 0;
let _errorPool = null, _errorIdx = 0;

function _initSfxPools() {
    try {
        if (audioClick && !_clickPool) {
            _clickPool = [];
            for (let i = 0; i < _SFX_POOL_SIZE; i++) {
                const a = audioClick.cloneNode();
                a.volume = SFX_VOLUME;
                _clickPool.push(a);
            }
        }
        if (audioError && !_errorPool) {
            _errorPool = [];
            for (let i = 0; i < _SFX_POOL_SIZE; i++) {
                const a = audioError.cloneNode();
                a.volume = SFX_VOLUME;
                _errorPool.push(a);
            }
        }
    } catch (e) {}
}

function playSound(type) {
    if (!app.soundEnabled) return;
    if (!_clickPool) _initSfxPools();

    try {
        if (type === 'correct' && _clickPool && _clickPool.length) {
            const sound = _clickPool[_clickIdx % _clickPool.length];
            _clickIdx++;
            sound.currentTime = 0;
            sound.play().catch(() => {});
        } else if (type === 'error' && _errorPool && _errorPool.length) {
            const sound = _errorPool[_errorIdx % _errorPool.length];
            _errorIdx++;
            sound.currentTime = 0;
            sound.play().catch(() => {});
        } else if (type === 'correct' && audioClick) {
            audioClick.currentTime = 0;
            audioClick.play().catch(() => {});
        } else if (type === 'error' && audioError) {
            audioError.currentTime = 0;
            audioError.play().catch(() => {});
        } else if (type === 'checkpoint' && audioClick) {
            try {
                audioClick.volume = 0.45;
                audioClick.currentTime = 0;
                audioClick.play().catch(() => {});
                setTimeout(function () { try { audioClick.volume = 1; } catch (_e) {} }, 120);
            } catch (_e) {}
        }
    } catch (e) {
        // Fallback to Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            var fq = type === 'correct' ? 800 : type === 'checkpoint' ? 1100 : 200;
            oscillator.frequency.value = fq;
            gainNode.gain.value = type === 'checkpoint' ? SFX_VOLUME * 0.55 : SFX_VOLUME;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + (type === 'checkpoint' ? 0.07 : 0.05));
        } catch (e2) {}
    }
}

// Utility function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- Игровые уведомления: очередь, GPU-анимации, группировка монет ---
var _notifyQueue = [];
var _notifyBusy = false;
var _notifyActiveTimer = null;
var _notifyGapTimer = null;
var NOTIFY_GAP_MS = 720;
var COIN_BATCH_MS = 620;
var _coinBatchItems = [];
var _coinBatchTimer = null;

function parseCoinAmount(s) {
    var m = String(s).match(/\+(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
}

function flushCoinBatch() {
    _coinBatchTimer = null;
    if (!_coinBatchItems.length) return;
    var total = 0;
    _coinBatchItems.forEach(function (x) {
        total += parseCoinAmount(x.message);
    });
    var first = _coinBatchItems[0];
    var last = _coinBatchItems[_coinBatchItems.length - 1];
    var lang = (app && app.lang) ? app.lang : 'ru';
    var msg;
    if (_coinBatchItems.length === 1) {
        msg = first.message;
    } else if (total > 0) {
        if (lang === 'en') {
            msg = '+' + total + ' coins (combined)';
        } else if (lang === 'ua') {
            msg = '+' + total + ' монет (разом)';
        } else {
            msg = '+' + total + ' монет (разом)';
        }
    } else {
        msg = first.message;
    }
    var label = last.label || first.label || '';
    _coinBatchItems = [];
    _notifyQueue.push({ kind: 'reward', message: msg, label: label, icon: '', title: '', mergeCoins: false });
    notifyPump();
}

function tryMergeCoinBatch(item) {
    if (!item || item.kind !== 'reward' || !item.mergeCoins) return false;
    _coinBatchItems.push({ message: item.message, label: item.label || '' });
    clearTimeout(_coinBatchTimer);
    _coinBatchTimer = setTimeout(flushCoinBatch, COIN_BATCH_MS);
    return true;
}

function isCoinRewardText(m) {
    m = String(m || '');
    if (!/\+(\d+)/.test(m)) return false;
    return /монет|монета|coins?\b/i.test(m);
}

function legacyToNotifyItem(message, type, title) {
    var label = title != null && title !== undefined ? String(title) : '';
    var msg = String(message || '');
    if (type === 'error') {
        return { kind: 'system_error', message: msg, label: label, icon: '', title: '', mergeCoins: false };
    }
    if (type === 'warning') {
        return { kind: 'system_warning', message: msg, label: label, icon: '', title: '', mergeCoins: false };
    }
    if (type === 'info') {
        return { kind: 'system_info', message: msg, label: label, icon: '', title: '', mergeCoins: false };
    }
    if (type === 'success') {
        if (label === '✓' || label === '\u2713') {
            return { kind: 'progress', message: msg, label: label, icon: '', title: '', mergeCoins: false };
        }
        if (isCoinRewardText(msg)) {
            return { kind: 'reward', message: msg, label: label, icon: '', title: '', mergeCoins: true };
        }
        return { kind: 'faint_success', message: msg, label: label, icon: '', title: '', mergeCoins: false };
    }
    return { kind: 'system_info', message: msg, label: label, icon: '', title: '', mergeCoins: false };
}

function normalizeNotifyPayload(raw) {
    return {
        kind: raw.kind,
        message: raw.message != null ? String(raw.message) : '',
        label: raw.label != null ? String(raw.label) : '',
        title: raw.title != null ? String(raw.title) : '',
        icon: raw.icon != null ? String(raw.icon) : '',
        mergeCoins: !!raw.mergeCoins,
        durationMs: raw.durationMs > 0 ? raw.durationMs : null
    };
}

function notifyEnqueue(raw) {
    if (!raw || !raw.kind) return;
    var item = normalizeNotifyPayload(raw);
    if (tryMergeCoinBatch(item)) return;
    _notifyQueue.push(item);
    notifyPump();
}

function notifyPump() {
    if (_notifyBusy) return;
    var item = _notifyQueue.shift();
    if (!item) return;
    _notifyBusy = true;
    renderNotifyCard(item, function () {
        clearTimeout(_notifyGapTimer);
        _notifyGapTimer = setTimeout(function () {
            _notifyBusy = false;
            notifyPump();
        }, NOTIFY_GAP_MS);
    });
}

function playNotifySfx(kind) {
    if (!app.soundEnabled) return;
    try {
        var audioContext = new (window.AudioContext || window.webkitAudioContext)();
        var o = audioContext.createOscillator();
        var g = audioContext.createGain();
        o.connect(g);
        g.connect(audioContext.destination);
        o.type = 'sine';
        var fq = 340;
        if (kind === 'achievement') fq = 720;
        else if (kind === 'reward') fq = 520;
        else if (kind === 'progress' || kind === 'faint_success') fq = 600;
        else if (kind === 'system_error') fq = 220;
        else if (kind === 'system_warning') fq = 300;
        else if (kind === 'system_info') fq = 400;
        o.frequency.value = fq;
        var t0 = audioContext.currentTime;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + (kind === 'achievement' ? 0.2 : 0.12));
        o.start(t0);
        o.stop(t0 + 0.22);
    } catch (e) {}
}

function notifyKickerFor(kind) {
    var lang = (app && app.lang) ? app.lang : 'ru';
    var achievement = { ru: 'Достижение', en: 'Achievement', ua: 'Досягнення' };
    var reward = { ru: 'Награда', en: 'Reward', ua: 'Нагорода' };
    var progress = { ru: 'Прогресс', en: 'Progress', ua: 'Прогрес' };
    var done = { ru: 'Готово', en: 'Done', ua: 'Готово' };
    var system = { ru: 'Система', en: 'System', ua: 'Система' };
    var pick = function (row) { return row[lang] || row.ru; };
    if (kind === 'achievement') return pick(achievement);
    if (kind === 'reward') return pick(reward);
    if (kind === 'progress') return pick(progress);
    if (kind === 'faint_success') return pick(done);
    return pick(system);
}

function notifyDismissAria() {
    var lang = (app && app.lang) ? app.lang : 'ru';
    if (lang === 'en') return 'Dismiss';
    if (lang === 'ua') return 'Закрити';
    return 'Закрыть';
}

function notifyDurationFor(item) {
    if (item.durationMs != null && item.durationMs > 0) return item.durationMs;
    switch (item.kind) {
        case 'achievement': return 5200;
        case 'reward': return 3200;
        case 'progress': return 2800;
        case 'faint_success': return 2600;
        case 'system_error': return 4000;
        case 'system_warning': return 3600;
        default: return 3000;
    }
}

function updateNotifyContainerPlacement(container, item) {
    var rm = document.getElementById('resultsModal');
    var mp = document.getElementById('multiplayerResultsModal');
    var resultsOpen = rm && !rm.classList.contains('hidden');
    var mpOpen = mp && !mp.classList.contains('hidden');
    var modalOpen = !!(resultsOpen || mpOpen);
    container.classList.toggle('toast-container--dodge-modal', modalOpen);
    container.classList.toggle('toast-container--epic', item.kind === 'achievement' && !modalOpen);
}

/** Заголовок только из символов без букв (эмодзи, ✓) - на Win 8.1 даёт «квадратики», не показываем. */
function notifyLabelIsIconOnly(label) {
    if (label == null || label === undefined) return true;
    var s = String(label).trim();
    if (!s) return true;
    if (/[a-zA-Z\u0400-\u04FF]/.test(s)) return false;
    return true;
}

function notifySvgTrophy() {
    return '<svg class="notify-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><linearGradient id="ntg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f5e9ff"/><stop offset="55%" stop-color="#c4b5fd"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><path fill="url(#ntg)" stroke="rgba(167,139,250,0.95)" stroke-width="1.5" d="M18 14h28v8H18z"/><path fill="url(#ntg)" stroke="rgba(167,139,250,0.95)" stroke-width="1.5" d="M14 22h36v4c0 10-8 18-18 18S14 36 14 26v-4z"/><path fill="#6d28d9" opacity="0.88" d="M24 44h16v8H24z"/><path fill="none" stroke="rgba(196,181,253,0.75)" stroke-width="1.5" d="M20 22V18a12 12 0 0 1 24 0v4"/></svg>';
}

function notifySvgCoin() {
    return '<svg class="notify-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><ellipse cx="36" cy="22" rx="20" ry="11" fill="#14532d" stroke="#4ade80" stroke-width="2"/><ellipse cx="28" cy="38" rx="20" ry="11" fill="#166534" stroke="#86efac" stroke-width="2"/><ellipse cx="32" cy="30" rx="17" ry="9" fill="none" stroke="#bbf7d0" stroke-width="1.75" opacity="0.95"/></svg>';
}

function notifySvgCheck() {
    return '<svg class="notify-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="26" fill="none" stroke="#22d3ee" stroke-width="3"/><path fill="none" stroke="#22d3ee" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="M18 34l10 10 18-22"/></svg>';
}

function notifySvgCross() {
    return '<svg class="notify-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="26" fill="none" stroke="#f87171" stroke-width="3"/><path fill="none" stroke="#f87171" stroke-width="4" stroke-linecap="round" d="M22 22l20 20M42 22L22 42"/></svg>';
}

function notifySvgWarn() {
    return '<svg class="notify-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path fill="rgba(251,191,36,0.12)" stroke="#fbbf24" stroke-width="2" stroke-linejoin="round" d="M32 10L54 54H10L32 10z"/><path stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round" d="M32 24v14"/><circle cx="32" cy="46" r="2.5" fill="#fbbf24"/></svg>';
}

function notifySvgInfo() {
    return '<svg class="notify-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="26" fill="none" stroke="#22d3ee" stroke-width="3"/><path fill="#22d3ee" d="M29 20h6v6h-6zm0 10h6v18h-6z"/></svg>';
}

function notifySvgClock() {
    return '<svg class="notify-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="26" fill="none" stroke="#22d3ee" stroke-width="3"/><path stroke="#22d3ee" stroke-width="3" stroke-linecap="round" d="M32 20v14l10 6"/></svg>';
}

function notifyIconMarkup(item) {
    var k = item.kind;
    if (k === 'achievement') return notifySvgTrophy();
    if (k === 'reward') return notifySvgCoin();
    if (k === 'progress' || k === 'faint_success') return notifySvgCheck();
    if (k === 'system_error') return notifySvgCross();
    if (k === 'system_warning') return notifySvgWarn();
    if (k === 'system_info') {
        if (item.label && /[\u23F0-\u23F3\u231A\u231B\u23F1\u23F2]/.test(item.label)) return notifySvgClock();
        return notifySvgInfo();
    }
    return notifySvgInfo();
}

function renderNotifyCard(item, done) {
    var container = document.getElementById('toastContainer');
    if (!container) {
        done();
        return;
    }
    playNotifySfx(item.kind);
    updateNotifyContainerPlacement(container, item);
    container.innerHTML = '';

    var card = document.createElement('div');
    card.className = 'notify-card notify-card--' + item.kind;
    if (item.kind === 'achievement') {
        card.classList.add('notify-card--epic');
    }
    card.setAttribute('role', item.kind === 'system_error' ? 'alert' : 'status');

    var h1 = document.createElement('div');
    h1.className = 'notify-hud notify-hud--tl';
    var h2 = document.createElement('div');
    h2.className = 'notify-hud notify-hud--br';
    card.appendChild(h1);
    card.appendChild(h2);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'notify-dismiss';
    btn.setAttribute('aria-label', notifyDismissAria());
    btn.textContent = '\u00d7';

    var iconWrap = document.createElement('div');
    iconWrap.className = 'notify-icon-slot';
    var iconInner = document.createElement('div');
    iconInner.className = 'notify-icon-inner';
    iconInner.innerHTML = notifyIconMarkup(item);
    iconWrap.appendChild(iconInner);

    var body = document.createElement('div');
    body.className = 'notify-body';

    var kicker = document.createElement('div');
    kicker.className = 'notify-kicker';
    var kKind = item.kind.indexOf('system') === 0 ? 'system' : item.kind;
    if (item.kind === 'faint_success') kKind = 'faint_success';
    kicker.textContent = notifyKickerFor(kKind);

    var titleEl = null;
    if (item.kind === 'achievement' && item.title) {
        titleEl = document.createElement('div');
        titleEl.className = 'notify-title';
        titleEl.textContent = item.title;
    } else if (item.label && !notifyLabelIsIconOnly(item.label)) {
        titleEl = document.createElement('div');
        titleEl.className = 'notify-title';
        titleEl.textContent = item.label;
    }

    var msgEl = document.createElement('div');
    msgEl.className = 'notify-msg';
    msgEl.textContent = item.message || '';

    body.appendChild(kicker);
    if (titleEl) body.appendChild(titleEl);
    body.appendChild(msgEl);

    card.appendChild(btn);
    card.appendChild(iconWrap);
    card.appendChild(body);
    container.appendChild(card);

    var finished = false;
    function cleanupAfterExit() {
        container.classList.remove('toast-container--epic', 'toast-container--dodge-modal');
        done();
    }
    function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(_notifyActiveTimer);
        _notifyActiveTimer = null;
        card.classList.remove('notify-card--in');
        card.classList.add('notify-card--out');
        var completed = false;
        function complete() {
            if (completed) return;
            completed = true;
            try { card.remove(); } catch (e) {}
            cleanupAfterExit();
        }
        var fallback = setTimeout(complete, 450);
        card.addEventListener('transitionend', function onEnd(ev) {
            if (ev.target !== card) return;
            if (ev.propertyName !== 'opacity' && ev.propertyName !== 'transform') return;
            clearTimeout(fallback);
            card.removeEventListener('transitionend', onEnd);
            complete();
        });
    }

    btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        finish();
    });
    card.addEventListener('click', finish);

    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            card.classList.add('notify-card--in');
        });
    });

    _notifyActiveTimer = setTimeout(finish, notifyDurationFor(item));
}

function showToast(message, type = 'info', title = '') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    if (message && typeof message === 'object' && !Array.isArray(message) && message.kind) {
        notifyEnqueue(message);
        return;
    }
    notifyEnqueue(legacyToNotifyItem(message, type, title));
}

function t(key) {
    const tr = window.translations || {};
    const langTable = tr[app.lang] || {};
    var val = langTable[key];
    if ((val === undefined || val === '') && app.lang === 'ua' && tr.ru) {
        val = tr.ru[key];
    }
    return (val !== undefined && val !== '') ? val : key;
}

function trReplace(key, map) {
    var s = t(key);
    if (!map) return s;
    Object.keys(map).forEach(function (k) {
        s = s.split('{{' + k + '}}').join(String(map[k]));
    });
    return s;
}

// ============================================
// AUTHENTICATION & PROFILE FUNCTIONS
// ============================================

let currentUserProfile = null;
let avatarSaveInFlight = false;
let avatarModalEscapeHandler = null;

// Auth state listener will be initialized in DOMContentLoaded

/** Бейдж «обещанных» монет для гостей (до входа). */
function updateGuestPromisedHeader() {
    var wrap = document.getElementById('guestPromisedCoinsWrap');
    var amtEl = document.getElementById('guestPromisedCoinsAmount');
    if (!wrap || !amtEl) return;
    var g = window.guestPromisedCoins;
    var n = g && typeof g.peekTotal === 'function' ? g.peekTotal() : 0;
    if (window.authModule && window.authModule.getCurrentUser && window.authModule.getCurrentUser()) {
        wrap.classList.add('hidden');
        return;
    }
    if (n > 0) {
        amtEl.textContent = String(n);
        wrap.classList.remove('hidden');
        wrap.setAttribute('title', t('guestPromisedHeaderTitle'));
    } else {
        wrap.classList.add('hidden');
        amtEl.textContent = '0';
    }
}

// Update user UI in header - ОПТИМИЗИРОВАНА
function updateUserUI(user, profile) {
    const profileBtn = DOM.get('userProfileBtn');
    const loginBtn = DOM.get('loginBtn');
    const userName = DOM.get('userName');
    const userAvatar = DOM.get('userAvatar');
    const balanceDisplay = DOM.get('balanceDisplay');
    const userBalance = DOM.get('userBalance');
    const shopBtn = DOM.get('shopBtn');
    const guestPromisedWrap = document.getElementById('guestPromisedCoinsWrap');
    if (guestPromisedWrap) guestPromisedWrap.classList.add('hidden');
    
    if (!profileBtn || !loginBtn || !userName || !userAvatar) return;
    
    profileBtn.classList.remove('hidden');
    loginBtn.classList.add('hidden');
    if (balanceDisplay) balanceDisplay.classList.remove('hidden');
    if (shopBtn) shopBtn.classList.remove('hidden');
    
    // user теперь объект из localStorage
    const displayUser = profile || user;
    userName.textContent = displayUser?.displayName || displayUser?.username || 'User';
    
    // Обновляем баланс
    if (userBalance && displayUser) {
        const balance = displayUser.balance || 0;
        userBalance.textContent = balance;
    }
    
    // Используем аватар из профиля или первый по умолчанию
    const avatarURL = displayUser?.photoURL || 
        (window.authModule?.AVAILABLE_AVATARS ? window.authModule.AVAILABLE_AVATARS[0] : '');
    
    if (avatarURL) {
        userAvatar.src = avatarURL;
        userAvatar.alt = '';
        userAvatar.style.display = 'block';
        userAvatar.style.width = '32px';
        userAvatar.style.height = '32px';
        userAvatar.style.objectFit = 'cover';
    } else {
        userAvatar.style.display = 'none';
    }
}

// Доступность: фокус на первый фокусируемый элемент в модалке
function focusFirstInModal(modal) {
    if (!modal) return;
    var focusable = modal.querySelector('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (focusable) setTimeout(function () { focusable.focus(); }, 0);
}

/** Клики по «глаз», рандом и копирование: делегирование с data-auth-act (надёжнее inline при SVG внутри кнопок). */
function initAuthModalControls() {
    var root = document.getElementById('loginModal');
    if (!root || root.getAttribute('data-auth-bound') === '1') return;
    root.setAttribute('data-auth-bound', '1');
    root.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('[data-auth-act]') : null;
        if (!btn || !root.contains(btn)) return;
        var act = btn.getAttribute('data-auth-act');
        if (act === 'toggle-pw-login') {
            e.preventDefault();
            toggleAuthPassword('loginPassword', 'loginPasswordToggle');
        } else if (act === 'toggle-pw-reg') {
            e.preventDefault();
            toggleAuthPassword('registerPassword', 'registerPasswordToggle');
        } else if (act === 'rnd-login') {
            e.preventDefault();
            fillRandomAuthLogin();
        } else if (act === 'rnd-pass') {
            e.preventDefault();
            fillRandomAuthPassword();
        } else if (act === 'copy-reg') {
            e.preventDefault();
            copyRegisterCredentials();
        }
    });
}

function syncAuthModalPanels(mode) {
    var modal = document.getElementById('loginModal');
    var track = document.getElementById('authPanelsTrack');
    var loginCol = document.getElementById('authPanelLogin');
    var regCol = document.getElementById('authPanelRegister');
    if (modal) modal.setAttribute('data-auth-tab', mode === 'register' ? 'register' : 'login');
    if (track) track.setAttribute('data-panel', mode === 'register' ? '1' : '0');
    if (loginCol) {
        if ('inert' in loginCol) loginCol.inert = mode === 'register';
        loginCol.setAttribute('aria-hidden', mode === 'register' ? 'true' : 'false');
    }
    if (regCol) {
        if ('inert' in regCol) regCol.inert = mode === 'login';
        regCol.setAttribute('aria-hidden', mode === 'login' ? 'true' : 'false');
    }
}

function updateAuthHudBar() {
    var tierEl = document.getElementById('authHudTier');
    var syncEl = document.getElementById('authHudSync');
    if (!tierEl) return;
    var level = 1;
    var tierName = '';
    try {
        var L = window.levelModule;
        if (L && typeof L.getPlayerXP === 'function' && typeof L.getLevelInfo === 'function') {
            var info = L.getLevelInfo(L.getPlayerXP());
            level = info.level || 1;
            tierName = info.tierName || '';
        }
    } catch (_e) {}
    tierEl.textContent = tierName ? 'LV.' + level + ' · ' + tierName : 'LV.' + level;
    if (syncEl && typeof t === 'function') syncEl.textContent = t('authHudGuest');
}

var _authModalVpBound = false;

/** Реальная высота окна (visualViewport / innerHeight), чтобы карточка не вылезала за экран на любых DPI и после ресайза. */
function syncAuthModalMaxHeight() {
    var modal = document.getElementById('loginModal');
    if (!modal) return;
    var vv = window.visualViewport;
    var h = vv && typeof vv.height === 'number' ? vv.height : window.innerHeight;
    var slack = 36;
    var px = Math.max(220, Math.round(h - slack));
    modal.style.setProperty('--auth-modal-max-h', px + 'px');
}

function bindAuthModalViewportListeners() {
    if (_authModalVpBound) return;
    _authModalVpBound = true;
    var vv = window.visualViewport;
    if (vv && vv.addEventListener) {
        vv.addEventListener('resize', syncAuthModalMaxHeight);
        vv.addEventListener('scroll', syncAuthModalMaxHeight);
    }
    window.addEventListener('resize', syncAuthModalMaxHeight);
}

function unbindAuthModalViewportListeners() {
    if (!_authModalVpBound) return;
    _authModalVpBound = false;
    var vv = window.visualViewport;
    if (vv && vv.removeEventListener) {
        vv.removeEventListener('resize', syncAuthModalMaxHeight);
        vv.removeEventListener('scroll', syncAuthModalMaxHeight);
    }
    window.removeEventListener('resize', syncAuthModalMaxHeight);
}

// Show login modal
function showLoginModal() {
    var modal = document.getElementById('loginModal');
    if (!modal) return;
    initAuthModalControls();
    syncAuthModalMaxHeight();
    bindAuthModalViewportListeners();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    switchToLogin();
    syncAuthPasswordToggleTitles();
    updateAuthHudBar();
    focusFirstInModal(modal);
}

// Close login modal
function closeLoginModal() {
    var modal = document.getElementById('loginModal');
    if (modal) {
        unbindAuthModalViewportListeners();
        modal.style.removeProperty('--auth-modal-max-h');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    resetAuthInlineErrors();
    ['loginPassword', 'registerPassword'].forEach(function (id) {
        var inp = document.getElementById(id);
        if (inp) inp.type = 'password';
    });
    syncAuthPasswordToggleTitles();
    updateRegisterPasswordStrength(true);
}

function syncAuthPasswordToggleTitles() {
    [['loginPassword', 'loginPasswordToggle'], ['registerPassword', 'registerPasswordToggle']].forEach(function (pair) {
        var inp = document.getElementById(pair[0]);
        var btn = document.getElementById(pair[1]);
        if (inp && btn) {
            btn.setAttribute('title', t(inp.type === 'password' ? 'authRevealPassword' : 'authHidePassword'));
            btn.setAttribute('data-visible', inp.type === 'text' ? 'true' : 'false');
        }
    });
}

function toggleAuthPassword(inputId, btnId) {
    var inp = document.getElementById(inputId);
    var btn = document.getElementById(btnId);
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
    if (btn) {
        btn.setAttribute('title', t(inp.type === 'password' ? 'authRevealPassword' : 'authHidePassword'));
        btn.setAttribute('aria-pressed', inp.type === 'text' ? 'true' : 'false');
        btn.setAttribute('data-visible', inp.type === 'text' ? 'true' : 'false');
    }
}

function authSecureRandomInt(max) {
    if (max <= 0) return 0;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        var buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return buf[0] % max;
    }
    return Math.floor(Math.random() * max);
}

function generateAuthUsername() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var len = 8 + authSecureRandomInt(3);
    var s = '';
    for (var i = 0; i < len; i++) s += chars[authSecureRandomInt(chars.length)];
    return s;
}

function generateAuthPassword() {
    var all = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    var len = 14;
    var s = '';
    for (var j = 0; j < len; j++) s += all[authSecureRandomInt(all.length)];
    return s;
}

function fillRandomAuthLogin() {
    var el = document.getElementById('registerUsername');
    if (el) el.value = generateAuthUsername();
}

function fillRandomAuthPassword() {
    var el = document.getElementById('registerPassword');
    if (el) {
        el.value = generateAuthPassword();
        updateRegisterPasswordStrength();
    }
}

function updateRegisterPasswordStrength(clear) {
    var el = document.getElementById('registerPassword');
    var fill = document.getElementById('authStrengthFill');
    var label = document.getElementById('authStrengthLabel');
    if (!fill || !label) return;
    if (clear || !el || !el.value) {
        fill.style.width = '0%';
        fill.className = 'auth-strength-fill';
        label.textContent = '';
        return;
    }
    var pwd = el.value;
    var score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    var tier = 'weak';
    var pct = 28;
    if (score >= 5) {
        tier = 'strong';
        pct = 100;
    } else if (score >= 3) {
        tier = 'medium';
        pct = 62;
    } else if (score >= 1) {
        tier = 'weak';
        pct = 34;
    }
    fill.className = 'auth-strength-fill ' + tier;
    fill.style.width = pct + '%';
    label.textContent = t(tier === 'weak' ? 'authPasswordWeak' : tier === 'medium' ? 'authPasswordMedium' : 'authPasswordStrong');
}

async function copyRegisterCredentials() {
    var uEl = document.getElementById('registerUsername');
    var pEl = document.getElementById('registerPassword');
    var u = uEl ? uEl.value : '';
    var p = pEl ? pEl.value : '';
    if (!u.trim() || !p) {
        showToast(t('fillAllFields'), 'error');
        return;
    }
    var text = u.trim() + '\n' + p;
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-99999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        showToast(t('authCopied'), 'success');
    } catch (e) {
        showToast(t('saveError'), 'error');
    }
}

window.__zoobAuthActImpl = function (act) {
    if (act === 'toggle-pw-login') toggleAuthPassword('loginPassword', 'loginPasswordToggle');
    else if (act === 'toggle-pw-reg') toggleAuthPassword('registerPassword', 'registerPasswordToggle');
    else if (act === 'rnd-login') fillRandomAuthLogin();
    else if (act === 'rnd-pass') fillRandomAuthPassword();
    else if (act === 'copy-reg') copyRegisterCredentials();
};

async function copyProfileLogin() {
    var el = document.getElementById('profileLoginValue');
    var u = el ? String(el.textContent || '').trim() : '';
    if (!u) {
        showToast(t('saveError'), 'error');
        return;
    }
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(u);
        } else {
            var ta = document.createElement('textarea');
            ta.value = u;
            ta.style.position = 'fixed';
            ta.style.left = '-99999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        showToast(t('profileCopyLoginDone'), 'success');
    } catch (err) {
        showToast(t('saveError'), 'error');
    }
}

function resetAuthInlineErrors() {
    ['loginError', 'registerError'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.textContent = '';
        el.classList.add('hidden');
    });
}

function showAuthInlineError(el, message) {
    if (!el || message == null || message === '') return;
    el.textContent = message;
    el.classList.remove('hidden');
}

// Switch to login form
function switchToLogin() {
    resetAuthInlineErrors();
    syncAuthModalPanels('login');
    var titleEl = document.getElementById('authModalTitle');
    if (titleEl) titleEl.textContent = t('authWelcomeBack');
    var tabL = document.getElementById('authTabLogin');
    var tabR = document.getElementById('authTabRegister');
    if (tabL) {
        tabL.classList.add('auth-tab--active');
        tabL.setAttribute('aria-selected', 'true');
    }
    if (tabR) {
        tabR.classList.remove('auth-tab--active');
        tabR.setAttribute('aria-selected', 'false');
    }
    updateRegisterPasswordStrength(true);
}

// Switch to register form
function switchToRegister() {
    resetAuthInlineErrors();
    syncAuthModalPanels('register');
    var titleEl = document.getElementById('authModalTitle');
    if (titleEl) titleEl.textContent = t('authCreateAccount');
    var tabL = document.getElementById('authTabLogin');
    var tabR = document.getElementById('authTabRegister');
    if (tabL) {
        tabL.classList.remove('auth-tab--active');
        tabL.setAttribute('aria-selected', 'false');
    }
    if (tabR) {
        tabR.classList.add('auth-tab--active');
        tabR.setAttribute('aria-selected', 'true');
    }
    updateRegisterPasswordStrength(true);
}

/** Сообщения auth API / auth.js: коды и старые русские строки - в текст текущего языка сайта. */
function translateAuthMessage(raw) {
    if (raw == null || raw === '') return '';
    var byCode = {
        invalid_credentials: 'authInvalidCredentials',
        fill_credentials: 'fillAllFields',
        register_fields_required: 'fillAllFields',
        username_too_short: 'usernameTooShort',
        password_too_short: 'passwordTooShort',
        username_taken: 'authUsernameTaken',
        register_failed: 'registerError',
        save_failed: 'authSaveFailed'
    };
    if (byCode[raw]) return t(byCode[raw]);
    var legacyRu = {
        'Неверный логин или пароль': 'authInvalidCredentials',
        'Введите логин и пароль': 'fillAllFields',
        'Логин и пароль обязательны': 'fillAllFields',
        'Логин должен быть не менее 3 символов': 'usernameTooShort',
        'Пароль должен быть не менее 6 символов': 'passwordTooShort',
        'Этот логин уже занят': 'authUsernameTaken',
        'Ошибка регистрации': 'registerError',
        'Ошибка сохранения данных': 'authSaveFailed'
    };
    if (legacyRu[raw]) return t(legacyRu[raw]);
    return String(raw);
}

// Handle login
async function handleLogin() {
    if (!window.authModule) {
        showToast('Система авторизации не загружена', 'error');
        return;
    }
    
    const username = DOM.get('loginUsername')?.value || '';
    const password = DOM.get('loginPassword')?.value || '';
    const errorEl = DOM.get('loginError');
    
    if (!username || !password) {
        showAuthInlineError(errorEl, t('fillAllFields'));
        return;
    }
    
    const result = await window.authModule.loginUser(username, password);
    
    if (result.success) {
        closeLoginModal();
        showToast(t('loginSuccess'), 'success');
        if (result.claimedPromisedCoins > 0) {
            showToast(trReplace('promisedCoinsClaimedToast', { n: result.claimedPromisedCoins }), 'success', '\uD83E\uDE99');
        }
        if (result.user) {
            currentUserProfile = result.user;
            updateUserUI(result.user, result.user);
        }
    } else {
        showAuthInlineError(errorEl, translateAuthMessage(result.error) || t('loginError'));
    }
}

// Handle register
async function handleRegister() {
    if (!window.authModule) {
        showToast('Система авторизации не загружена', 'error');
        return;
    }
    
    const username = DOM.get('registerUsername')?.value || '';
    const password = DOM.get('registerPassword')?.value || '';
    const errorEl = DOM.get('registerError');
    
    if (!username || !password) {
        showAuthInlineError(errorEl, t('fillAllFields'));
        return;
    }
    
    if (username.length < 3) {
        showAuthInlineError(errorEl, t('usernameTooShort'));
        return;
    }
    
    if (password.length < 6) {
        showAuthInlineError(errorEl, t('passwordTooShort'));
        return;
    }
    
    // Email не обязателен, передаём пустую строку
    const result = await window.authModule.registerUser(username, password, '');
    
    if (result.success) {
        closeLoginModal();
        showToast(t('registerSuccess'), 'success');
        if (result.claimedPromisedCoins > 0) {
            showToast(trReplace('promisedCoinsClaimedToast', { n: result.claimedPromisedCoins }), 'success', '\uD83E\uDE99');
        }
        if (result.user) {
            currentUserProfile = result.user;
            updateUserUI(result.user, result.user);
        }
    } else {
        showAuthInlineError(errorEl, translateAuthMessage(result.error) || t('registerError'));
    }
}

// Logout user
async function logoutUser() {
    const result = await window.authModule.logoutUser();
    if (result.success) {
        currentUserProfile = null;
        showHome();
        showToast(t('logoutSuccess'), 'info');
        if (typeof updateGuestPromisedHeader === 'function') updateGuestPromisedHeader();
    }
}

// ── Profile Tabs ──────────────────────────────────────────────────────────────

function _t(key) {
    var lang = (app && app.lang) || 'ru';
    return (translations[lang] && translations[lang][key]) || (translations['ru'] && translations['ru'][key]) || key;
}

function _sessionTimeAgo(ts) {
    if (!ts) return '';
    var lang = (app && app.lang) || 'ru';
    var mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
    if (lang === 'en') {
        if (mins < 1) return 'just now';
        if (mins < 60) return mins + ' min ago';
        if (mins < 1440) return Math.floor(mins / 60) + ' h ago';
        return Math.floor(mins / 1440) + ' d ago';
    }
    if (lang === 'ua') {
        if (mins < 1) return 'щойно';
        if (mins < 60) return mins + ' хв тому';
        if (mins < 1440) return Math.floor(mins / 60) + ' год тому';
        return Math.floor(mins / 1440) + ' дн. тому';
    }
    if (mins < 1) return 'только что';
    if (mins < 60) return mins + ' мин назад';
    if (mins < 1440) return Math.floor(mins / 60) + ' ч назад';
    return Math.floor(mins / 1440) + ' дн. назад';
}

/**
 * Рисует Canvas line-chart скорости последних 20 сессий в профиле.
 */
// Хранилище listeners профиль-чарта (чтобы не дублировать)
var _profileChartListeners = null;

function _renderProfileProgressChart() {
    var canvas = document.getElementById('profileProgressChart');
    if (!canvas) return;

    var sessions = (window.statsModule && window.statsModule.getRecentSessions) ? window.statsModule.getRecentSessions(20) : [];

    var dpr = window.devicePixelRatio || 1;
    var W = canvas.offsetWidth || 400;
    var H = 140;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    if (!sessions || sessions.length < 2) {
        ctx.fillStyle = 'rgba(99,102,241,0.08)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(148,163,184,0.5)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        var need2 = (app.lang === 'en') ? 'Need at least 2 sessions' : (app.lang === 'ua') ? 'Потрібно щонайменше 2 сесії' : 'Нужно минимум 2 сессии';
        ctx.fillText(need2, W / 2, H / 2);
        return;
    }

    var padL = 40, padR = 14, padT = 12, padB = 26;
    var cw = W - padL - padR;
    var ch = H - padT - padB;

    var defPrac = (app.lang === 'en') ? 'Free Practice' : (app.lang === 'ua') ? 'Вільна практика' : 'Свободная практика';
    var points = sessions.slice().reverse().map(function (s) {
        return { cpm: s.speed || 0, acc: s.accuracy || 0, name: _resolveLessonName(s) || defPrac };
    });
    var maxCpm = Math.max.apply(null, points.map(function (p) { return p.cpm; }));
    maxCpm = Math.max(maxCpm, 60);

    var step = cw / Math.max(points.length - 1, 1);

    // Фон
    ctx.fillStyle = 'rgba(99,102,241,0.06)';
    ctx.fillRect(padL, padT, cw, ch);

    // Сетка Y
    ctx.strokeStyle = 'rgba(148,163,184,0.15)';
    ctx.lineWidth = 1;
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
        var gy = padT + ch - f * ch;
        ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(padL + cw, gy); ctx.stroke();
        if (f > 0) {
            ctx.fillStyle = 'rgba(148,163,184,0.6)';
            ctx.font = '9px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(Math.round(f * maxCpm), padL - 4, gy + 3);
        }
    });

    // Заливка под линией
    ctx.beginPath();
    points.forEach(function (p, i) {
        var x = padL + i * step;
        var y = padT + ch - (p.cpm / maxCpm) * ch;
        if (i === 0) { ctx.moveTo(x, padT + ch); ctx.lineTo(x, y); }
        else ctx.lineTo(x, y);
    });
    ctx.lineTo(padL + (points.length - 1) * step, padT + ch);
    ctx.closePath();
    var areaGrad = ctx.createLinearGradient(0, padT, 0, padT + ch);
    areaGrad.addColorStop(0, 'rgba(99,102,241,0.22)');
    areaGrad.addColorStop(1, 'rgba(99,102,241,0.02)');
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Линия
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    var lineGrad = ctx.createLinearGradient(padL, 0, padL + cw, 0);
    lineGrad.addColorStop(0, '#6366f1');
    lineGrad.addColorStop(1, '#06b6d4');
    ctx.strokeStyle = lineGrad;
    points.forEach(function (p, i) {
        var x = padL + i * step;
        var y = padT + ch - (p.cpm / maxCpm) * ch;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Точки
    points.forEach(function (p, i) {
        var x = padL + i * step;
        var y = padT + ch - (p.cpm / maxCpm) * ch;
        var color = p.acc >= 95 ? '#10b981' : p.acc >= 75 ? '#f59e0b' : '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    });

    // Метки X
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    var showEvery = Math.max(1, Math.floor(points.length / 5));
    points.forEach(function (p, i) {
        if (i % showEvery === 0 || i === points.length - 1) {
            ctx.fillText('#' + (i + 1), padL + i * step, padT + ch + 16);
        }
    });

    // ── Tooltip ──────────────────────────────────────────────────────────────
    if (_profileChartListeners) {
        canvas.removeEventListener('mousemove', _profileChartListeners.move);
        canvas.removeEventListener('mouseleave', _profileChartListeners.leave);
        if (_profileChartListeners.tip && _profileChartListeners.tip.parentNode) {
            _profileChartListeners.tip.parentNode.removeChild(_profileChartListeners.tip);
        }
        _profileChartListeners = null;
    }

    var wrapper = canvas.parentElement;
    if (!wrapper) return;
    wrapper.style.position = 'relative';

    var tip = document.createElement('div');
    tip.style.cssText = [
        'position:absolute;pointer-events:none;display:none;',
        'background:rgba(15,23,42,0.96);color:#e2e8f0;',
        'border:1px solid rgba(99,102,241,0.55);border-radius:9px;',
        'padding:7px 12px;font-size:12px;font-family:monospace;',
        'white-space:nowrap;z-index:9999;',
        'box-shadow:0 4px 20px rgba(0,0,0,0.55);',
        'line-height:1.6;'
    ].join('');
    wrapper.appendChild(tip);

    function onMove(e) {
        var rect = canvas.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;

        var closest = null, minDist = Infinity, closestIdx = -1;
        points.forEach(function (p, i) {
            var px = padL + i * step;
            var py = padT + ch - (p.cpm / maxCpm) * ch;
            var d = Math.abs(mx - px);
            if (d < minDist) { minDist = d; closest = p; closestIdx = i; }
        });

        if (closest && minDist < step * 0.55) {
            var color = closest.acc >= 95 ? '#10b981' : closest.acc >= 75 ? '#f59e0b' : '#ef4444';
            tip.innerHTML =
                '<b style="color:#6366f1">' + closest.cpm + '</b> зн/мин · ' +
                '<b style="color:' + color + '">' + closest.acc + '%</b><br>' +
                '<span style="color:#94a3b8;font-size:10px">#' + (closestIdx + 1) + ' · ' + escapeHtml(closest.name.slice(0, 28)) + '</span>';

            var px = padL + closestIdx * step;
            var tipW = 200;
            var tipX = Math.max(2, Math.min(px - tipW / 2, W - tipW - 4));
            var tipY = 4;
            tip.style.left = tipX + 'px';
            tip.style.top  = tipY + 'px';
            tip.style.display = 'block';
            canvas.style.cursor = 'crosshair';
        } else {
            tip.style.display = 'none';
            canvas.style.cursor = '';
        }
    }
    function onLeave() { tip.style.display = 'none'; canvas.style.cursor = ''; }

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    _profileChartListeners = { move: onMove, leave: onLeave, tip: tip };
}

var _lastProfileTab = 'overview';

function showProfileTab(tab) {
    _lastProfileTab = tab || 'overview';
    ['overview', 'history', 'errors'].forEach(function (t) {
        var btn = document.getElementById('profileTab-' + t);
        var panel = document.getElementById('profileTab' + t.charAt(0).toUpperCase() + t.slice(1));
        if (btn) btn.classList.toggle('active', t === tab);
        if (panel) panel.classList.toggle('hidden', t !== tab);
    });
    if (tab === 'overview') renderProfileOverview();
    if (tab === 'history') {
        renderProfileHistory();
        // Задержка: canvas нужен layout после DOM-рендера
        setTimeout(_renderProfileProgressChart, 80);
    }
    if (tab === 'errors') renderProfileErrors();
}

// Lookup real lesson name from LESSONS_DATA by lessonKey + layout
function _resolveLessonName(session) {
    if (session.lessonName) return session.lessonName;
    var key = session.lessonKey;
    if (!key) return null;
    // key format: lesson_beginner_2, lesson_medium_5, etc.
    try {
        if (typeof LESSONS_DATA !== 'undefined') {
            var m = key.match(/^lesson_(beginner|medium|advanced)_(\d+)$/);
            if (m) {
                var lvl = m[1], id = parseInt(m[2]);
                var lvlData = LESSONS_DATA[lvl];
                if (lvlData && lvlData.lessons) {
                    var found = lvlData.lessons.find(function (l) { return l.id === id; });
                    if (found) return found.name;
                }
            }
            // shop lesson: shop_lesson_3
            var sm = key.match(/^shop_lesson_(\d+)$/);
            if (sm) {
                var sid = parseInt(sm[1]);
                for (var lvlKey in LESSONS_DATA) {
                    var lvData = LESSONS_DATA[lvlKey];
                    if (lvData && lvData.lessons) {
                        var sf = lvData.lessons.find(function (l) { return l.id === sid; });
                        if (sf) return sf.name;
                    }
                }
            }
        }
    } catch (e) {}
    return null;
}

function _calcStreak(sessions) {
    if (!sessions || sessions.length === 0) return 0;
    var dayMs = 86400000;
    var now = new Date(); now.setHours(0,0,0,0);
    var checkDay = now.getTime();
    var todayEnd = checkDay + dayMs;
    var hasToday = sessions.some(function(s) { return s.timestamp >= checkDay && s.timestamp < todayEnd; });
    if (!hasToday) checkDay -= dayMs;
    var streak = 0;
    while (true) {
        var dEnd = checkDay + dayMs;
        var has = sessions.some(function(s) { return s.timestamp >= checkDay && s.timestamp < dEnd; });
        if (!has) break;
        streak++;
        checkDay -= dayMs;
    }
    return streak;
}

function renderProfileOverview() {
    var el = document.getElementById('profileOverviewContent');
    if (!el) return;
    var lang = (app && app.lang) || 'ru';
    var en = lang === 'en';
    var uk = lang === 'ua';
    /** ru, en, ua - для текстів профілю */
    function P(ru, enStr, uaStr) {
        if (lang === 'en') return enStr;
        if (lang === 'ua') return (uaStr != null && uaStr !== '') ? uaStr : ru;
        return ru;
    }
    var profile = currentUserProfile || {};
    var stats = profile.stats || {};

    var bestSpeed        = stats.bestSpeed || 0;
    var avgAcc           = stats.averageAccuracy || 0;
    var totalSessions    = stats.totalSessions || 0;
    var completedLessons = stats.completedLessons || 0;
    var totalErrors      = stats.totalErrors || 0;
    var totalMinutes     = Math.floor((stats.totalTime || 0) / 60);
    var totalHours       = Math.floor(totalMinutes / 60);
    var timeLabel        = totalHours > 0 ? totalHours + P('ч', 'h', ' год') : (totalMinutes > 0 ? totalMinutes + P('м', 'm', ' хв') : '0' + P('м', 'm', ' хв'));

    var levelInfo = window.levelModule
        ? window.levelModule.getLevelInfo(window.levelModule.getPlayerXP())
        : { level: 1, tierName: '-', progressPct: 0, xpInLevel: 0, xpToNext: 100 };
    var balance = profile.balance != null ? profile.balance : 0;

    var sessions = (window.statsModule && window.statsModule.getRecentSessions) ? window.statsModule.getRecentSessions(30) : [];
    var streak = _calcStreak(sessions);
    var lastSession = sessions.length > 0 ? sessions[0] : null;
    var lastSessionTime = lastSession && lastSession.timestamp ? _sessionTimeAgo(lastSession.timestamp) : null;

    var allAchiev = (window.achievementsModule && window.achievementsModule.getAchievements) ? window.achievementsModule.getAchievements() : [];
    var unlockedIds = new Set();
    try { JSON.parse(localStorage.getItem('typeMasterAchievements') || '[]').forEach(function(id) { unlockedIds.add(id); }); } catch(e) {}
    var unlocked = allAchiev.filter(function(a) { return unlockedIds.has(a.id); });
    var lockedCount = allAchiev.length - unlocked.length;

    var skillLevels = [
        { min: 500, icon: '👑', title: P('Мастер', 'Master', 'Майстер'), color: '#f59e0b', sub: P('Ты в топ 1% всех печатающих!', 'Top 1% of all typists!', 'Ти в топ-1% усіх, хто друкує!') },
        { min: 400, icon: '🚀', title: P('Эксперт', 'Expert', 'Експерт'), color: '#8b5cf6', sub: P('Невероятная скорость!', 'Incredibly fast!', 'Неймовірна швидкість!') },
        { min: 300, icon: '🔥', title: P('Продвинутый', 'Advanced', 'Просунутий'), color: '#ef4444', sub: P('Быстрее большинства людей!', 'Faster than most people!', 'Швидше за більшість людей!') },
        { min: 200, icon: '⚡', title: P('Быстрый', 'Fast', 'Швидкий'), color: '#22d3ee', sub: P('Отличный прогресс!', 'Great progress, keep going!', 'Чудовий прогрес!') },
        { min: 100, icon: '💪', title: P('Уверенный', 'Confident', 'Впевнений'), color: '#10b981', sub: P('Ты на правильном пути!', 'On the right track!', 'Ти на правильному шляху!') },
        { min: 50,  icon: '✏️', title: P('Ученик', 'Student', 'Учень'), color: '#94a3b8', sub: P('Практикуйся каждый день!', 'Keep practicing every day!', 'Практикуйся щодня!') },
        { min: 0,   icon: '🐣', title: P('Новичок', 'Beginner', 'Новачок'), color: '#64748b', sub: P('Каждый мастер когда-то был новичком!', 'Every master was once a beginner!', 'Кожен майстер колись був новачком!') }
    ];
    var skillIdx = skillLevels.findIndex(function(s) { return bestSpeed >= s.min; });
    if (skillIdx < 0) skillIdx = skillLevels.length - 1;
    var skill = skillLevels[skillIdx];
    var nextSkill = skillIdx > 0 ? skillLevels[skillIdx - 1] : null;

    var tierColors = {
        'Первые шаги': '#94a3b8', 'Ученик': '#10b981', 'Практик': '#22d3ee',
        'Профессионал': '#8b5cf6', 'Мастер': '#f59e0b', 'Легенда': '#ef4444',
        'First Steps': '#94a3b8', 'Apprentice': '#10b981', 'Practitioner': '#22d3ee',
        'Professional': '#8b5cf6', 'Master': '#f59e0b', 'Legend': '#ef4444'
    };
    var ruTierForColor = window.levelModule.getTierNameForLang ? window.levelModule.getTierNameForLang(levelInfo.level, 'ru') : levelInfo.tierName;
    var tierColor = tierColors[ruTierForColor] || tierColors[levelInfo.tierName] || '#22d3ee';

    var html = '';

    // ── 1. Hero stats ────────────────────────────────────────────────────────
    var spdColor = bestSpeed >= 300 ? '#f59e0b' : bestSpeed >= 200 ? '#22d3ee' : bestSpeed >= 100 ? '#10b981' : '#94a3b8';
    var accColor = avgAcc >= 95 ? '#10b981' : avgAcc >= 80 ? '#22d3ee' : avgAcc >= 60 ? '#f59e0b' : '#ef4444';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">';
    html += '<div class="pcA" style="text-align:center;border-color:' + spdColor + '33">' +
        '<div class="pcLbl">🚀 ' + P('Рекорд', 'Best Speed', 'Рекорд') + '</div>' +
        '<div style="font-size:30px;font-weight:900;color:' + spdColor + ';line-height:1">' + bestSpeed + '</div>' +
        '<div class="pct5" style="font-size:10px;margin-top:4px">' + P('зн/мин', 'ch / min', 'зн/хв') + '</div>' +
    '</div>';
    html += '<div class="pcA" style="text-align:center;border-color:' + accColor + '33">' +
        '<div class="pcLbl">🎯 ' + P('Точность', 'Avg Accuracy', 'Точність') + '</div>' +
        '<div style="font-size:30px;font-weight:900;color:' + accColor + ';line-height:1">' + avgAcc + '%</div>' +
        '<div class="pct5" style="font-size:10px;margin-top:4px">' + P('в среднем', 'on average', 'у середньому') + '</div>' +
    '</div>';
    html += '<div class="pcA" style="text-align:center;border-color:rgba(167,139,250,0.3)">' +
        '<div class="pcLbl">⏱ ' + P('Время', 'Total Time', 'Час') + '</div>' +
        '<div style="font-size:30px;font-weight:900;color:#a78bfa;line-height:1">' + timeLabel + '</div>' +
        '<div class="pct5" style="font-size:10px;margin-top:4px">' + P('практики', 'practiced', 'практики') + '</div>' +
    '</div>';
    html += '</div>';

    // ── 2. Secondary stats ───────────────────────────────────────────────────
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">';
    [
        { v: totalSessions,    l: P('Сессий', 'Sessions', 'Сесій'),          icon: '🎮', c: 'var(--pct2)' },
        { v: completedLessons, l: P('Уроков пройдено', 'Lessons Done', 'Уроків пройдено'), icon: '📚', c: '#22d3ee' },
        { v: totalErrors,      l: P('Всего ошибок', 'Total Errors', 'Усього помилок'),    icon: '❌', c: '#f87171' }
    ].forEach(function(m) {
        html += '<div class="pcB" style="text-align:center">' +
            '<div class="pct5" style="font-size:10px;margin-bottom:5px">' + m.icon + ' ' + m.l + '</div>' +
            '<div style="font-size:22px;font-weight:800;color:' + m.c + '">' + m.v + '</div>' +
        '</div>';
    });
    html += '</div>';

    // ── 3. Level card ────────────────────────────────────────────────────────
    html += '<div class="pcLvl" style="border:1px solid ' + tierColor + '33;margin-bottom:12px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
            '<div>' +
                '<div class="pcLbl" style="margin-bottom:4px">' + P('Твой уровень', 'Your Level', 'Твій рівень') + '</div>' +
                '<div style="display:flex;align-items:baseline;gap:8px">' +
                    '<span style="font-size:26px;font-weight:900;color:' + tierColor + '">' + P('Ур. ', 'LVL ', 'Рів. ') + levelInfo.level + '</span>' +
                    '<span style="font-size:14px;color:' + tierColor + ';opacity:.85;font-weight:700">' + levelInfo.tierName + '</span>' +
                '</div>' +
            '</div>' +
            '<div style="text-align:right">' +
                '<div class="pcLbl" style="margin-bottom:2px">💰 ' + P('Монет', 'Balance', 'Монет') + '</div>' +
                '<div style="font-size:22px;font-weight:800;color:#f59e0b">' + balance + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="pcBarTr" style="height:10px;margin-bottom:6px">' +
            '<div style="height:100%;width:' + (levelInfo.progressPct || 0) + '%;background:linear-gradient(90deg,' + tierColor + '88,' + tierColor + ');border-radius:99px"></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11px" class="pct5">' +
            '<span>' + (levelInfo.xpInLevel || 0) + ' / ' + (levelInfo.xpToNext || 100) + ' XP</span>' +
            '<span>' + P('⬆️ До след. уровня: ', '⬆️ To next level: ', '⬆️ До наступного рівня: ') + Math.max(0, (levelInfo.xpToNext || 100) - (levelInfo.xpInLevel || 0)) + ' XP</span>' +
        '</div>' +
    '</div>';

    // ── 4. Typist skill ──────────────────────────────────────────────────────
    html += '<div class="pcA" style="border-color:' + skill.color + '33;display:flex;align-items:center;gap:16px;margin-bottom:12px">' +
        '<div style="font-size:40px;line-height:1;flex-shrink:0">' + skill.icon + '</div>' +
        '<div style="flex:1">' +
            '<div class="pcLbl" style="margin-bottom:2px">' + P('Класс печатника', 'Typist Class', 'Клас друкаря') + '</div>' +
            '<div style="font-size:20px;font-weight:900;color:' + skill.color + ';margin-bottom:2px">' + skill.title.toUpperCase() + '</div>' +
            '<div class="pct3" style="font-size:12px">' + skill.sub + '</div>' +
            (nextSkill
                ? '<div class="pct5" style="font-size:11px;margin-top:5px">' + P('Следующий: ', 'Next: ', 'Далі: ') + '<span style="color:' + nextSkill.color + '">' + nextSkill.icon + ' ' + nextSkill.title + '</span>' + P(' - достигни ' + nextSkill.min + ' зн/мин', ' - reach ' + nextSkill.min + ' ch/min', ' - досягни ' + nextSkill.min + ' зн/хв') + '</div>'
                : '<div style="font-size:11px;color:#f59e0b;margin-top:5px">🏆 ' + P('Максимальный класс достигнут!', 'Maximum class reached!', 'Максимальний клас досягнуто!') + '</div>') +
        '</div>' +
    '</div>';

    // ── 5. Streak + Last session ─────────────────────────────────────────────
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">';
    var streakColor = streak >= 7 ? '#f59e0b' : streak >= 3 ? '#f97316' : streak >= 1 ? '#10b981' : 'var(--pct5)';
    var streakIcon  = streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : streak >= 1 ? '✅' : '💤';
    var streakWord;
    if (en) {
        streakWord = streak + ' day' + (streak === 1 ? '' : 's') + ' in a row';
    } else if (uk) {
        var sm = streak % 10, sh = streak % 100;
        if (sm === 1 && sh !== 11) streakWord = streak + ' день поспіль';
        else if (sm >= 2 && sm <= 4 && (sh < 10 || sh >= 20)) streakWord = streak + ' дні поспіль';
        else streakWord = streak + ' днів поспіль';
    } else {
        streakWord = streak % 10 === 1 && streak !== 11 ? streak + ' день подряд'
          : streak % 10 >= 2 && streak % 10 <= 4 && (streak < 10 || streak > 20) ? streak + ' дня подряд'
          : streak + ' дней подряд';
    }

    html += '<div class="pcC" style="text-align:center;border-color:' + streakColor + '33">' +
        '<div style="font-size:30px;margin-bottom:6px">' + streakIcon + '</div>' +
        '<div style="font-size:22px;font-weight:800;color:' + streakColor + ';line-height:1">' + (streak === 0 ? P('Нет серии', 'No streak', 'Немає серії') : streakWord) + '</div>' +
        '<div class="pct4" style="font-size:11px;margin-top:4px">' + P('серия дней', 'daily streak', 'серія днів') + '</div>' +
        (streak === 0 ? '<div class="pct6" style="font-size:10px;margin-top:4px">' + P('Начни сегодня!', 'Practice today to start!', 'Почни сьогодні!') + '</div>' : '') +
    '</div>';

    html += '<div class="pcC" style="text-align:center">' +
        '<div style="font-size:30px;margin-bottom:6px">🕒</div>' +
        '<div class="pct1" style="font-size:14px;font-weight:700;line-height:1.3">' + (lastSessionTime || P('Сессий пока нет', 'No sessions yet', 'Сесій поки немає')) + '</div>' +
        '<div class="pct4" style="font-size:11px;margin-top:4px">' + P('последняя сессия', 'last session', 'остання сесія') + '</div>' +
        (lastSession ? '<div class="pct5" style="font-size:10px;margin-top:4px">' + Math.round(lastSession.accuracy || 0) + '% · ' + (lastSession.speed || 0) + P(' зн/мин', ' ch/min', ' зн/хв') + '</div>' : '') +
    '</div>';
    html += '</div>';

    // ── 6. Achievements ──────────────────────────────────────────────────────
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
        '<p class="profile-section-title mb-0">🏆 ' + P('Достижения', 'Achievements', 'Досягнення') + '</p>' +
        '<span class="pct5" style="font-size:12px;font-weight:500">' + unlocked.length + ' / ' + allAchiev.length + '</span>' +
        (unlocked.length > 0
            ? '<div style="flex:1;height:4px;margin-left:4px" class="pcBarTr"><div style="height:100%;width:' + Math.round(unlocked.length / Math.max(1,allAchiev.length) * 100) + '%;background:linear-gradient(90deg,#10b981,#22d3ee);border-radius:99px"></div></div>'
            : '') +
    '</div>';

    if (unlocked.length === 0) {
        html += '<div class="pcD" style="margin-bottom:16px">' +
            '<div style="font-size:36px;margin-bottom:8px">🏅</div>' +
            '<div class="pct4" style="font-size:13px">' + P('Проходи уроки - получай достижения!', 'Complete lessons to earn achievements!', 'Проходь уроки - отримуй досягнення!') + '</div>' +
        '</div>';
    } else {
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:16px">';
        unlocked.slice(-4).reverse().forEach(function(a) {
            var aTitle = lang === 'en' ? a.titleEn : (lang === 'ua' ? a.titleUa : a.titleRu);
            html += '<div class="pcAch">' +
                '<div style="font-size:28px;margin-bottom:6px">' + (a.icon || '🎖️') + '</div>' +
                '<div class="pct1" style="font-size:11px;font-weight:700;line-height:1.3">' + escapeHtml(aTitle || a.titleRu || '') + '</div>' +
            '</div>';
        });
        if (lockedCount > 0) {
            html += '<div class="pcAch-lock">' +
                '<div style="font-size:22px;margin-bottom:6px">🔒</div>' +
                '<div class="pct6" style="font-size:11px">+ ' + lockedCount + ' ' + P('закрыто', 'locked', 'закрито') + '</div>' +
            '</div>';
        }
        html += '</div>';
    }

    // ── 7. Background ────────────────────────────────────────────────────────
    html += '<div class="pcC" style="display:flex;flex-wrap:wrap;align-items:center;gap:12px">' +
        '<p class="profile-section-title mb-0" style="margin:0">🎨 ' + P('Фон', 'Background', 'Фон') + '</p>' +
        '<div id="profileCurrentBgPreview" style="width:72px;height:44px;border-radius:8px;background-size:cover;background-position:center;border:1px solid var(--pcbr);flex-shrink:0"></div>' +
        '<button type="button" onclick="openBackgroundSelectorModal()" style="background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.4);color:#22d3ee;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600">' + P('Выбрать фон', 'Choose Background', 'Обрати фон') + '</button>' +
    '</div>';

    el.innerHTML = html;
}

function renderProfileHistory() {
    var el = document.getElementById('profileHistoryContent');
    if (!el) return;
    var lang = (app && app.lang) || 'ru';
    function P(ru, enStr, uaStr) {
        if (lang === 'en') return enStr;
        if (lang === 'ua') return (uaStr != null && uaStr !== '') ? uaStr : ru;
        return ru;
    }

    var sessions = (window.statsModule && window.statsModule.getRecentSessions) ? window.statsModule.getRecentSessions(15) : [];
    var allAchiev = (window.achievementsModule && window.achievementsModule.getAchievements) ? window.achievementsModule.getAchievements() : [];
    var unlockedIds = [];
    try { unlockedIds = JSON.parse(localStorage.getItem('typeMasterAchievements') || '[]'); } catch (e) {}
    var unlocked = allAchiev.filter(function (a) { return unlockedIds.indexOf(a.id) !== -1; });

    var html = '';

    // ── Recent Sessions ──
    html += '<p class="profile-section-title mb-3">🕒 ' + _t('profileTabSessions') + '</p>';

    if (sessions.length === 0) {
        html += '<div class="pcD">' +
            '<div style="font-size:3rem;margin-bottom:10px">📭</div>' +
            '<div class="pct5" style="font-size:14px;font-weight:600;margin-bottom:4px">' + _t('profileTabNoSessions') + '</div>' +
        '</div>';
    } else {
        html += '<div style="display:flex;flex-direction:column;gap:8px">';
        sessions.slice(0, 10).forEach(function (s) {
            var acc = s.accuracy || 0;
            var spd = s.speed || 0;
            var err = s.errors || 0;

            var spdColor = spd >= 300 ? '#f59e0b' : spd >= 200 ? '#22d3ee' : spd >= 100 ? '#10b981' : '#94a3b8';
            var spdIcon  = spd >= 300 ? '🔥' : spd >= 200 ? '⚡' : spd >= 100 ? '✅' : '🐌';
            var spdLabel = P(
                spd >= 300 ? 'Молния' : spd >= 200 ? 'Быстро' : spd >= 100 ? 'Хорошо' : 'Тренировка',
                spd >= 300 ? 'Lightning' : spd >= 200 ? 'Fast' : spd >= 100 ? 'Good' : 'Training',
                spd >= 300 ? 'Блискавка' : spd >= 200 ? 'Швидко' : spd >= 100 ? 'Добре' : 'Тренування'
            );
            var accColor  = acc >= 95 ? '#10b981' : acc >= 80 ? '#22d3ee' : acc >= 60 ? '#f59e0b' : '#ef4444';
            var errColor  = err === 0 ? '#10b981' : err <= 5 ? '#f59e0b' : '#ef4444';
            var modeIcon  = s.mode === 'lesson' ? '📚' : s.mode === 'speedtest' ? '⚡' : s.mode === 'multiplayer-bot' ? '🤖' : '✍️';
            var modeName  = s.mode === 'lesson' ? P('Урок', 'Lesson', 'Урок')
                          : s.mode === 'speedtest' ? P('Тест скорости', 'Speed Test', 'Тест швидкості')
                          : s.mode === 'multiplayer-bot' ? (typeof _t === 'function' ? _t('profileModeMultiplayerBot') : P('Дуэль с ботом', 'Bot duel', 'Дуель з ботом'))
                          : P('Практика', 'Practice', 'Практика');
            var resolved    = _resolveLessonName(s);
            var lessonTitle = resolved || P('Свободная практика', 'Free Practice', 'Вільна практика');
            var layoutBadge = s.layout ? s.layout.toUpperCase() : '';
            var timeStr     = _sessionTimeAgo(s.timestamp);
            var dur         = s.time ? (Math.floor(s.time / 60) + ':' + String(s.time % 60).padStart(2, '0')) : null;

            html += '<div class="pcSess" style="border-left:3px solid ' + accColor + '">' +
                '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">' +
                    '<div style="width:36px;height:36px;border-radius:8px;background:var(--pchv);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">' + modeIcon + '</div>' +
                    '<div style="flex:1;min-width:0">' +
                        '<div class="pct1" style="font-size:14px;font-weight:700;line-height:1.3;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(lessonTitle) + '</div>' +
                        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
                            '<span class="pct4" style="font-size:10px">' + modeName + '</span>' +
                            (layoutBadge ? '<span class="pct3" style="font-size:9px;background:var(--pchv);padding:1px 7px;border-radius:99px;font-weight:700">' + layoutBadge + '</span>' : '') +
                            '<span class="pct6" style="font-size:10px">·</span>' +
                            '<span class="pct5" style="font-size:10px">' + (timeStr || '') + (dur ? ' · ' + dur : '') + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div style="flex-shrink:0;background:var(--pchv);border:1px solid var(--pcbr);border-radius:8px;padding:4px 8px;text-align:center">' +
                        '<div style="font-size:9px;font-weight:700;color:' + spdColor + ';letter-spacing:.06em">' + spdIcon + ' ' + spdLabel + '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">' +
                    '<div style="background:var(--pchv);border-radius:8px;padding:8px;text-align:center">' +
                        '<div style="font-size:18px;font-weight:800;color:' + spdColor + ';line-height:1">' + spd + '</div>' +
                        '<div class="pct5" style="font-size:9px;margin-top:2px;font-weight:600">' + P('зн/мин', 'ch/min', 'зн/хв') + '</div>' +
                    '</div>' +
                    '<div style="background:var(--pchv);border-radius:8px;padding:8px;text-align:center">' +
                        '<div style="font-size:18px;font-weight:800;color:' + accColor + ';line-height:1">' + acc + '%</div>' +
                        '<div class="pct5" style="font-size:9px;margin-top:2px;font-weight:600">' + P('точность', 'accuracy', 'точність') + '</div>' +
                    '</div>' +
                    '<div style="background:var(--pchv);border-radius:8px;padding:8px;text-align:center">' +
                        '<div style="font-size:18px;font-weight:800;color:' + errColor + ';line-height:1">' + err + '</div>' +
                        '<div class="pct5" style="font-size:9px;margin-top:2px;font-weight:600">' + P('ошибок', 'errors', 'помилок') + '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        });
        html += '</div>';
    }

    // ── Achievements ──
    html += '<p class="profile-section-title mt-6 mb-3">🏆 ' + _t('profileTabAchievements') + '</p>';

    if (unlocked.length === 0) {
        html += '<div class="pcD">' +
            '<div style="font-size:3rem;margin-bottom:10px">🔒</div>' +
            '<div class="pct4" style="font-size:13px">' + _t('profileTabNoAchiev') + '</div>' +
        '</div>';
    } else {
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">';
        unlocked.forEach(function (a) {
            var aTitle = lang === 'en' ? a.titleEn : (lang === 'ua' ? a.titleUa : a.titleRu);
            var aDesc = lang === 'en' ? a.descEn : (lang === 'ua' ? a.descUa : a.descRu);
            html += '<div class="pcAch" style="padding:16px 12px">' +
                '<div style="font-size:32px;margin-bottom:8px;line-height:1">' + (a.icon || '🎖️') + '</div>' +
                '<div class="pct1" style="font-size:12px;font-weight:700;margin-bottom:4px;line-height:1.3">' + escapeHtml(aTitle || '') + '</div>' +
                '<div class="pct4" style="font-size:10px;line-height:1.4">' + escapeHtml(aDesc || '') + '</div>' +
            '</div>';
        });
        var lockedCount = allAchiev.length - unlocked.length;
        if (lockedCount > 0) {
            html += '<div class="pcAch-lock" style="padding:16px 12px;opacity:.6">' +
                '<div style="font-size:28px;margin-bottom:8px">🔒</div>' +
                '<div class="pct5" style="font-size:11px">+ ' + lockedCount + ' ' + _t('profileTabLocked') + '</div>' +
            '</div>';
        }
        html += '</div>';
    }

    el.innerHTML = html;
}

function renderProfileErrors() {
    var el = document.getElementById('profileErrorsContent');
    if (!el) return;
    var lang = (app && app.lang) || 'ru';
    var en = lang === 'en';
    var uk = lang === 'ua';
    function P(ru, enStr, uaStr) {
        if (lang === 'en') return enStr;
        if (lang === 'ua') return (uaStr != null && uaStr !== '') ? uaStr : ru;
        return ru;
    }

    var keyErrors = {};
    try { keyErrors = JSON.parse(localStorage.getItem('zoob_key_errors') || '{}'); } catch (e) {}
    var sorted = Object.entries(keyErrors).sort(function (a, b) { return b[1] - a[1]; });
    var maxErr = sorted.length > 0 ? sorted[0][1] : 1;
    var totalKeyErr = sorted.reduce(function (s, e) { return s + e[1]; }, 0);

    var sessions = (window.statsModule && window.statsModule.getRecentSessions) ? window.statsModule.getRecentSessions(10) : [];
    var avgAcc = sessions.length ? Math.round(sessions.reduce(function (s, x) { return s + (x.accuracy || 0); }, 0) / sessions.length) : 0;

    var grade = avgAcc >= 95 ? { l: P('ОТЛИЧНО!', 'PERFECT!', 'ЧУДОВО!'), c: '#10b981', icon: '🏆', sub: P('Невероятная точность! Так держать!', 'Incredible typing! Keep it up!', 'Неймовірна точність! Так тримай!') }
              : avgAcc >= 85 ? { l: P('ХОРОШО!', 'GREAT!', 'ДОБРЕ!'),  c: '#22d3ee', icon: '⭐', sub: P('Очень хорошо! Продолжай тренироваться!', 'Very good! Keep practicing!', 'Дуже добре! Продовжуй тренуватися!') }
              : avgAcc >= 70 ? { l: P('НЕПЛОХО!', 'NOT BAD!', 'НЕПОГАНО!'), c: '#f59e0b', icon: '📈', sub: P('Становится лучше! Не останавливайся!', 'Getting better! Don\'t stop!', 'Стає краще! Не зупиняйся!') }
              : sessions.length > 0
              ?               { l: P('ТРЕНИРУЙСЯ!', 'KEEP GOING!', 'ТРЕНУЙСЯ!'), c: '#ef4444', icon: '💪', sub: P('Больше практики - меньше ошибок!', 'More practice = fewer mistakes!', 'Більше практики - менше помилок!') }
              : null;

    var html = '';

    // ── 1. Summary card ──────────────────────────────────────────────────────
    if (grade) {
        html += '<div class="pcLvl" style="border:1px solid ' + grade.c + '33;margin-bottom:22px">' +
            '<div style="display:flex;align-items:center;gap:18px">' +
                '<div style="font-size:48px;line-height:1">' + grade.icon + '</div>' +
                '<div style="flex:1">' +
                    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">' +
                        '<span style="font-size:34px;font-weight:900;color:' + grade.c + ';line-height:1">' + avgAcc + '%</span>' +
                        '<span style="font-size:15px;font-weight:800;color:' + grade.c + ';opacity:.85;letter-spacing:.04em">' + grade.l + '</span>' +
                    '</div>' +
                    '<div class="pcBarTr" style="height:8px;margin-bottom:8px">' +
                        '<div style="height:100%;width:' + avgAcc + '%;background:linear-gradient(90deg,' + grade.c + '66,' + grade.c + ');border-radius:99px"></div>' +
                    '</div>' +
                    '<p class="pct3" style="font-size:13px;margin:0">' + grade.sub + '</p>' +
                '</div>' +
            '</div>' +
            '<div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">' +
                '<div style="flex:1;min-width:80px;background:var(--pchv);border-radius:10px;padding:10px;text-align:center">' +
                    '<div style="font-size:22px;font-weight:800;color:#f87171">' + totalKeyErr + '</div>' +
                    '<div class="pct4" style="font-size:11px;margin-top:2px">' + P('❌ Всего ошибок', '❌ Total errors', '❌ Усього помилок') + '</div>' +
                '</div>' +
                '<div style="flex:1;min-width:80px;background:var(--pchv);border-radius:10px;padding:10px;text-align:center">' +
                    '<div style="font-size:22px;font-weight:800;color:#fb923c">' + sorted.length + '</div>' +
                    '<div class="pct4" style="font-size:11px;margin-top:2px">' + P('⌨️ Трудных клавиш', '⌨️ Hard keys', '⌨️ Складних клавіш') + '</div>' +
                '</div>' +
                '<div style="flex:1;min-width:80px;background:var(--pchv);border-radius:10px;padding:10px;text-align:center">' +
                    '<div style="font-size:22px;font-weight:800;color:#a3e635">' + sessions.length + '</div>' +
                    '<div class="pct4" style="font-size:11px;margin-top:2px">' + P('🎯 Уроков', '🎯 Sessions', '🎯 Сесій') + '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    // ── 2. Problem key cards ─────────────────────────────────────────────────
    html += '<p class="profile-section-title mb-4">⌨️ ' + P('Какие клавиши даются труднее всего', 'Hardest keys for you', 'Які клавіші даються найважче') + '</p>';

    if (sorted.length === 0) {
        html += '<div class="pcD" style="padding:32px">' +
            '<div style="font-size:48px;margin-bottom:12px">🎯</div>' +
            '<div class="pct2" style="font-size:16px;font-weight:700;margin-bottom:6px">' + P('Ошибок пока нет!', 'No mistakes yet!', 'Помилок поки немає!') + '</div>' +
            '<div class="pct4" style="font-size:13px">' + P('Пройди урок - и здесь появится статистика по клавишам.', 'Complete a lesson - key stats will appear here.', 'Пройди урок - і тут з’явиться статистика по клавішах.') + '</div>' +
        '</div>';
    } else {
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:10px;margin-bottom:6px">';
        sorted.slice(0, 10).forEach(function (entry, i) {
            var ch = entry[0], cnt = entry[1];
            var pct = cnt / maxErr;
            var keyColor  = pct > 0.7 ? '#ef4444' : pct > 0.4 ? '#f97316' : pct > 0.15 ? '#f59e0b' : '#64748b';
            var glowColor = pct > 0.7 ? 'rgba(239,68,68,0.35)' : pct > 0.4 ? 'rgba(249,115,22,0.3)' : pct > 0.15 ? 'rgba(245,158,11,0.25)' : 'transparent';
            var medals = ['🥇','🥈','🥉'];
            var dispChar = ch === ' ' ? '␣' : ch;
            var timesLabel;
            if (en) {
                timesLabel = cnt === 1 ? '1 time' : cnt + ' times';
            } else if (uk) {
                var u10 = cnt % 10, u100 = cnt % 100;
                if (u10 === 1 && u100 !== 11) timesLabel = cnt + '\u00a0раз';
                else if (u10 >= 2 && u10 <= 4 && (u100 < 10 || u100 >= 20)) timesLabel = cnt + '\u00a0рази';
                else timesLabel = cnt + '\u00a0разів';
            } else {
                timesLabel = cnt + '\u00a0' + (cnt % 10 === 1 && cnt !== 11 ? 'раз' : cnt % 10 >= 2 && cnt % 10 <= 4 && (cnt < 10 || cnt > 20) ? 'раза' : 'раз');
            }

            html += '<div class="pcKey" style="' +
                'display:flex;flex-direction:column;align-items:center;gap:6px;' +
                'padding:14px 10px 12px;position:relative;' +
                'border:1px solid ' + keyColor + '44;border-bottom:4px solid ' + keyColor + ';' +
                'box-shadow:0 4px 16px ' + glowColor + ';' +
            '">' +
                (medals[i] ? '<span style="position:absolute;top:5px;right:6px;font-size:13px">' + medals[i] + '</span>' : '') +
                '<span class="pct1" style="font-size:30px;font-weight:900;font-family:monospace;line-height:1">' + escapeHtml(dispChar) + '</span>' +
                '<div class="pcBarTr" style="width:85%;height:4px">' +
                    '<div style="height:100%;width:' + Math.round(pct * 100) + '%;background:' + keyColor + ';border-radius:99px"></div>' +
                '</div>' +
                '<span style="font-size:11px;font-weight:700;color:' + keyColor + ';text-align:center;line-height:1.2">' + timesLabel + '</span>' +
            '</div>';
        });
        html += '</div>';
        if (sorted.length > 10) {
            html += '<p class="pct6" style="font-size:11px;text-align:center;margin-top:4px">+ ' + P('ещё ' + (sorted.length - 10) + ' клавиш', (sorted.length - 10) + ' more keys', 'ще ' + (sorted.length - 10) + ' клавіш') + '</p>';
        }
    }

    // ── 3. Tip ───────────────────────────────────────────────────────────────
    if (sorted.length > 0) {
        var worstChar = sorted[0][0];
        var worstCnt  = sorted[0][1];
        var dispWorst = worstChar === ' ' ? '␣' : worstChar;
        var tipText = en
            ? 'You miss the key <b style="color:#f59e0b;font-size:16px;font-family:monospace">' + escapeHtml(dispWorst) + '</b> most often - <b>' + worstCnt + ' time' + (worstCnt === 1 ? '' : 's') + '</b>. Try slowing down a little when you reach this key!'
            : uk
            ? 'Найчастіше ти промахуєшся по клавіші <b style="color:#f59e0b;font-size:18px;font-family:monospace">' + escapeHtml(dispWorst) + '</b> - уже <b>' + worstCnt + ' ' + (function () { var w = worstCnt % 10, wh = worstCnt % 100; if (w === 1 && wh !== 11) return 'раз'; if (w >= 2 && w <= 4 && (wh < 10 || wh >= 20)) return 'рази'; return 'разів'; })() + '</b>. Спробуй трохи сповільнитися на цій клавіші!'
            : 'Чаще всего ты промахиваешься по клавише <b style="color:#f59e0b;font-size:18px;font-family:monospace">' + escapeHtml(dispWorst) + '</b> - уже <b>' + worstCnt + ' раз' + (worstCnt % 10 >= 2 && worstCnt % 10 <= 4 && (worstCnt < 10 || worstCnt > 20) ? 'а' : '') + '</b>. Попробуй немного притормозить на этой клавише!';
        html += '<div class="pcTip">' +
            '<span style="font-size:30px;flex-shrink:0;line-height:1">💡</span>' +
            '<div>' +
                '<div style="font-size:12px;font-weight:800;color:#f59e0b;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">' + P('Совет лично для тебя', 'Personal Tip', 'Порада саме для тебе') + '</div>' +
                '<div class="pct2" style="font-size:14px;line-height:1.65">' + tipText + '</div>' +
            '</div>' +
        '</div>';
    }

    // ── 3.5 Кнопка тренировки слабых клавиш ─────────────────────────────────
    if (sorted.length > 0) {
        html += '<button onclick="startAdaptivePractice()" style="' +
            'width:100%;margin:18px 0 6px;padding:14px;border-radius:12px;' +
            'background:linear-gradient(135deg,rgba(99,102,241,0.25),rgba(6,182,212,0.2));' +
            'border:1px solid rgba(99,102,241,0.45);color:#a5b4fc;' +
            'font-size:14px;font-weight:700;cursor:pointer;' +
            'display:flex;align-items:center;justify-content:center;gap:10px;' +
            'transition:background 0.2s,border-color 0.2s;"' +
            ' onmouseover="this.style.background=\'linear-gradient(135deg,rgba(99,102,241,0.45),rgba(6,182,212,0.35))\'"' +
            ' onmouseout="this.style.background=\'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(6,182,212,0.2))\'">' +
            '<span style="font-size:20px">🎯</span>' +
            '<span>' + (en ? 'Train Weak Keys' : 'Тренировать слабые клавиши') + '</span>' +
        '</button>';
    }

    // ── 4. Recent attempts ───────────────────────────────────────────────────
    if (sessions.length > 0) {
        html += '<p class="profile-section-title mt-6 mb-3">🎮 ' + (en ? 'Recent Attempts' : 'Последние попытки') + '</p>';
        html += '<div style="display:flex;flex-direction:column;gap:6px">';
        sessions.slice(0, 6).forEach(function (s, i) {
            var acc = s.accuracy || 0;
            var stars = acc >= 95 ? '⭐⭐⭐' : acc >= 80 ? '⭐⭐' : acc >= 60 ? '⭐' : '';
            var label = acc >= 95 ? (en ? 'Perfect!' : 'Отлично!')
                      : acc >= 80 ? (en ? 'Good!' : 'Хорошо!')
                      : acc >= 60 ? (en ? 'Keep going!' : 'Неплохо!')
                      :             (en ? 'Need work' : 'Надо работать');
            var labelColor = acc >= 95 ? '#10b981' : acc >= 80 ? '#22d3ee' : acc >= 60 ? '#f59e0b' : '#ef4444';
            var resolved = _resolveLessonName(s);
            var title = resolved || (en ? 'Free Practice' : 'Свободная практика');
            var timeStr = _sessionTimeAgo(s.timestamp);

            html += '<div class="pcSess" style="display:flex;align-items:center;gap:12px">' +
                '<div style="font-size:20px;line-height:1;flex-shrink:0;min-width:52px;text-align:center">' + (stars || '❌') + '</div>' +
                '<div style="flex:1;min-width:0">' +
                    '<div class="pct1" style="font-size:13px;font-weight:' + (i === 0 ? '700' : '500') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(title) + '</div>' +
                    '<div class="pct5" style="font-size:10px;margin-top:1px">' + (timeStr || '') + '</div>' +
                '</div>' +
                '<div style="text-align:right;flex-shrink:0">' +
                    '<div style="font-size:18px;font-weight:800;color:' + labelColor + '">' + acc + '%</div>' +
                    '<div style="font-size:10px;color:' + labelColor + ';opacity:.8">' + label + '</div>' +
                '</div>' +
            '</div>';
        });
        html += '</div>';
    }

    el.innerHTML = html;
}

// Show profile screen
async function showProfile() {
    toggleFooter(false); // Скрываем футер в профиле
    const user = window.authModule.getCurrentUser();
    if (!user) {
        showLoginModal();
        return;
    }
    if (app.soundEnabled && audioOpenProfile) {
        audioOpenProfile.currentTime = 0;
        audioOpenProfile.play().catch(() => {});
    }
    hideAllScreens();
    const profileScreen = DOM.get('profileScreen');
    if (profileScreen) profileScreen.classList.remove('hidden');

    // Reset tabs to Overview on each profile open
    showProfileTab('overview');

    // user уже полный объект из localStorage
    currentUserProfile = user;
    loadProfileData(user);
    updateProfileBgPreview();
}

var _profileDraftBaseline = { displayName: '', bio: '' };

function snapshotProfileDraftBaseline() {
    var dnEl = document.getElementById('profileDisplayName');
    var bioEl = document.getElementById('profileBio');
    _profileDraftBaseline = {
        displayName: (dnEl && dnEl.value || '').trim(),
        bio: bioEl ? bioEl.value : ''
    };
    updateProfileDirtyState();
}

function updateProfileDirtyState() {
    var hint = document.getElementById('profileUnsavedHint');
    var dnEl = document.getElementById('profileDisplayName');
    var bioEl = document.getElementById('profileBio');
    if (!hint || !dnEl || !bioEl) return;
    var curDn = (dnEl.value || '').trim();
    var curBio = bioEl.value || '';
    var dirty = curDn !== _profileDraftBaseline.displayName || curBio !== _profileDraftBaseline.bio;
    if (dirty) hint.classList.remove('hidden');
    else hint.classList.add('hidden');
}

// Load profile data into UI - ОПТИМИЗИРОВАНА
function loadProfileData(profile) {
    const emailEl = DOM.get('profileEmail');
    const bioEl = DOM.get('profileBio');
    const loginValEl = DOM.get('profileLoginValue');
    const displayNameInput = DOM.get('profileDisplayName');
    
    var loginId = profile.username || profile.login || profile.userLogin || profile.accountUsername || '';
    if (loginValEl) loginValEl.textContent = loginId;
    if (displayNameInput) {
        var disp = (profile.displayName || profile.username || '').trim();
        displayNameInput.value = disp;
    }
    if (emailEl) {
        var em = profile.email || '';
        emailEl.textContent = em;
        emailEl.classList.toggle('hidden', !em);
    }
    if (bioEl) bioEl.value = (!profile.bio || profile.bio === 'null') ? '' : profile.bio;
    
    const photoEl = DOM.get('profilePhoto');
    const placeholderEl = DOM.get('profilePhotoPlaceholder');
    
    // Используем аватар из профиля или первый по умолчанию
    const avatarURL = profile.photoURL || 
        (window.authModule?.AVAILABLE_AVATARS ? window.authModule.AVAILABLE_AVATARS[0] : '');
    
    if (avatarURL && photoEl && placeholderEl) {
        photoEl.src = avatarURL;
        photoEl.alt = '';
        photoEl.style.display = 'block';
        photoEl.style.width = '128px';
        photoEl.style.height = '128px';
        photoEl.style.objectFit = 'cover';
        placeholderEl.style.display = 'none';
    } else if (photoEl && placeholderEl) {
        photoEl.style.display = 'none';
        placeholderEl.style.display = 'flex';
    }
    
    // Load statistics
    const stats = profile.stats || {};
    const bestSpeedEl = DOM.get('profileBestSpeed');
    const avgAccuracyEl = DOM.get('profileAvgAccuracy');
    const totalSessionsEl = DOM.get('profileTotalSessions');
    const completedLessonsEl = DOM.get('profileCompletedLessons');
    const totalErrorsEl = DOM.get('profileTotalErrors');
    const totalTimeEl = DOM.get('profileTotalTime');
    
    if (bestSpeedEl) bestSpeedEl.textContent = stats.bestSpeed || 0;
    if (avgAccuracyEl) avgAccuracyEl.textContent = (stats.averageAccuracy || 0) + '%';
    if (totalSessionsEl) totalSessionsEl.textContent = stats.totalSessions || 0;
    if (completedLessonsEl) completedLessonsEl.textContent = stats.completedLessons || 0;
    if (totalErrorsEl) totalErrorsEl.textContent = stats.totalErrors || 0;
    
    // Format total time
    if (totalTimeEl) {
        const totalMinutes = Math.floor((stats.totalTime || 0) / 60);
        const hours = Math.floor(totalMinutes / 60);
        totalTimeEl.textContent = hours > 0 ? hours + 'ч' : totalMinutes + 'м';
    }
    
    // Level, tier, balance, XP bar (2090 profile)
    var levelInfo = window.levelModule ? window.levelModule.getLevelInfo(window.levelModule.getPlayerXP()) : { level: 1, tierName: '-', progressPct: 0, xpInLevel: 0, xpToNext: 100 };
    var tierEl = DOM.get('profileTierName');
    var levelEl = DOM.get('profileLevelNumber');
    var balanceEl = DOM.get('profileBalance');
    var xpBarEl = DOM.get('profileXPBar');
    var xpLabelEl = DOM.get('profileXPLabel');
    var deckEl = DOM.get('profileDeck');
    var xpPct = levelInfo.progressPct != null ? levelInfo.progressPct : 0;
    if (tierEl) tierEl.textContent = levelInfo.tierName || '-';
    if (levelEl) levelEl.textContent = levelInfo.level || 1;
    if (balanceEl) balanceEl.innerHTML = (profile.balance != null ? profile.balance : 0) + ' ' + COIN_ICON_IMG;
    if (xpBarEl) xpBarEl.style.width = xpPct + '%';
    if (deckEl && deckEl.style) deckEl.style.setProperty('--xp-pct', String(Math.min(1, Math.max(0, xpPct / 100))));
    if (xpLabelEl) xpLabelEl.textContent = (levelInfo.xpInLevel != null ? levelInfo.xpInLevel : 0) + ' / ' + (levelInfo.xpToNext != null ? levelInfo.xpToNext : 300) + ' XP';

    // Re-render dynamic overview tab with fresh profile data
    renderProfileOverview();

    snapshotProfileDraftBaseline();
}

// Save profile
async function saveProfile() {
    const user = window.authModule.getCurrentUser();
    if (!user) return;
    
    const bio = document.getElementById('profileBio').value;
    const displayName = (document.getElementById('profileDisplayName') && document.getElementById('profileDisplayName').value || '').trim();
    if (!displayName) {
        showToast(t('profileNicknameEmpty'), 'error');
        return;
    }
    
    const updates = {
        bio: bio,
        displayName: displayName
    };
    
    const result = await window.authModule.updateUserProfile(user.uid, updates);
    
    if (result.success) {
        showToast(t('profileSaved'), 'success');
        currentUserProfile = { ...currentUserProfile, ...updates };
        if (typeof updateUserUI === 'function') updateUserUI(user, currentUserProfile);
        snapshotProfileDraftBaseline();
    } else {
        showToast(t('saveError'), 'error');
    }
}

// Show avatar selector modal
function showAvatarSelector() {
    const modal = DOM.get('avatarSelectorModal');
    if (!modal) return;
    
    const avatarGrid = DOM.get('avatarGrid');
    if (!avatarGrid) return;
    
    avatarGrid.innerHTML = '';
    
    // Всегда 20 аватаров: из auth или собираем сами (на случай кэша)
    var base = 'assets/images/profile photo/profile_';
    var avatars = [];
    var unlockLevels = [0, 0, 0, 5, 5, 10, 12, 12, 15, 15, 18, 18, 21, 21, 24, 24, 27, 27, 30, 30];
    var fromAuth = (window.authModule && window.authModule.AVAILABLE_AVATARS) ? window.authModule.AVAILABLE_AVATARS : [];
    for (var i = 0; i < 20; i++) {
        avatars.push(fromAuth[i] || (i === 0 ? base + '1.png' : base + (i + 1) + '.jpg'));
    }
    if (window.authModule && window.authModule.AVATAR_UNLOCK_LEVELS && window.authModule.AVATAR_UNLOCK_LEVELS.length >= 20) {
        unlockLevels = window.authModule.AVATAR_UNLOCK_LEVELS.slice(0, 20);
    }
    var currentAvatarIndex = currentUserProfile?.avatarIndex ?? 0;
    var currentLevel = window.levelModule ? window.levelModule.getLevelInfo(window.levelModule.getPlayerXP()).level : 1;

    avatars.forEach(function(avatarPath, index) {
        var requiredLevel = unlockLevels[index] ?? 0;
        var isLocked = requiredLevel > 0 && currentLevel < requiredLevel;
        var isSelected = index === currentAvatarIndex && !isLocked;

        var avatarItem = document.createElement('div');
        avatarItem.className = 'avatar-card relative overflow-hidden transition-all duration-200 group ' +
            (isLocked ? 'avatar-card--locked cursor-not-allowed' : 'cursor-pointer') +
            (isSelected ? ' avatar-card--selected' : '');

        var img = document.createElement('img');
        img.src = avatarPath;
        img.alt = 'Avatar ' + (index + 1);
        img.loading = 'lazy';
        img.onerror = function() {
            this.style.background = 'rgba(255,255,255,0.08)';
            this.alt = '?';
            this.onerror = null;
        };
        avatarItem.appendChild(img);

        if (isSelected) {
            var overlay = document.createElement('div');
            overlay.className = 'absolute inset-0 bg-gradient-to-br from-cyan-500/15 to-transparent pointer-events-none z-10';
            avatarItem.appendChild(overlay);
            var checkmark = document.createElement('div');
            checkmark.className = 'absolute top-1 right-1 bg-cyan-500/90 rounded-full p-1 z-20';
            checkmark.innerHTML = '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>';
            avatarItem.appendChild(checkmark);
        }

        if (isLocked) {
            var lockOverlay = document.createElement('div');
            lockOverlay.className = 'absolute inset-0 flex flex-col items-center justify-center bg-black/55 z-20 avatar-lock-overlay';
            var shortLabel = (typeof t('levelShort') === 'string' ? t('levelShort') : 'Ур.') + ' ' + requiredLevel;
            lockOverlay.innerHTML = '<span class="text-xl mb-0.5">🔒</span><span class="avatar-lock-text text-amber-400 font-semibold">' + shortLabel + '</span>';
            avatarItem.appendChild(lockOverlay);
            avatarItem.onclick = function() { showToast(t('unlockAtLevel') + ' ' + requiredLevel, 'info'); };
        } else {
            avatarItem.onclick = (function(idx) { return function() { selectAvatar(idx); }; })(index);
        }

        avatarGrid.appendChild(avatarItem);
    });

    modal.style.zIndex = '9999';
    modal.style.position = 'fixed';
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    modal.onclick = function(e) {
        if (e.target === modal) closeAvatarSelector();
    };

    if (avatarModalEscapeHandler) {
        document.removeEventListener('keydown', avatarModalEscapeHandler);
        avatarModalEscapeHandler = null;
    }
    avatarModalEscapeHandler = function (e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeAvatarSelector();
        }
    };
    document.addEventListener('keydown', avatarModalEscapeHandler);

    focusFirstInModal(modal);
}

// Close avatar selector
function closeAvatarSelector() {
    if (avatarModalEscapeHandler) {
        document.removeEventListener('keydown', avatarModalEscapeHandler);
        avatarModalEscapeHandler = null;
    }
    const modal = DOM.get('avatarSelectorModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.onclick = null; // Убираем обработчик
    }
}

// Select avatar
async function selectAvatar(avatarIndex) {
    const user = window.authModule?.getCurrentUser();
    if (!user || !window.authModule) return;
    if (avatarSaveInFlight) return;

    const grid = DOM.get('avatarGrid');
    avatarSaveInFlight = true;
    if (grid) {
        grid.style.pointerEvents = 'none';
        grid.style.opacity = '0.65';
    }

    try {
        const result = await window.authModule.updateProfileAvatar(user.uid, avatarIndex);

        if (result.success) {
            const url = result.photoURL;
            const idx = result.avatarIndex != null ? result.avatarIndex : avatarIndex;

            const profilePhoto = DOM.get('profilePhoto');
            const profilePlaceholder = DOM.get('profilePhotoPlaceholder');
            const userAvatar = DOM.get('userAvatar');

            if (profilePhoto && url) {
                profilePhoto.src = url;
                profilePhoto.alt = '';
                profilePhoto.style.display = 'block';
                profilePhoto.style.width = '128px';
                profilePhoto.style.height = '128px';
                profilePhoto.style.objectFit = 'cover';
                profilePhoto.style.objectPosition = 'center';
            }
            if (profilePlaceholder) profilePlaceholder.style.display = 'none';
            if (userAvatar && url) {
                userAvatar.src = url;
                userAvatar.alt = '';
                userAvatar.style.display = 'block';
                userAvatar.style.width = '32px';
                userAvatar.style.height = '32px';
                userAvatar.style.objectFit = 'cover';
                userAvatar.style.objectPosition = 'center';
            }

            if (currentUserProfile) {
                currentUserProfile.photoURL = url;
                currentUserProfile.avatarIndex = idx;
            }

            const fresh = window.authModule.getCurrentUser();
            if (fresh && typeof updateUserUI === 'function') updateUserUI(fresh, fresh);

            closeAvatarSelector();
            showToast(t('avatarUpdated'), 'success');
        } else {
            showToast(result.error || t('updateError'), 'error');
        }
    } finally {
        avatarSaveInFlight = false;
        if (grid) {
            grid.style.pointerEvents = '';
            grid.style.opacity = '';
        }
    }
}

// Show admin panel
async function showAdminPanel() {
    toggleFooter(false); // Скрываем футер в админ-панели
    const user = window.authModule.getCurrentUser();
    if (!user) return;
    
    const isAdmin = await window.authModule.isAdmin(user.uid);
    if (!isAdmin) {
        showToast(t('accessDenied'), 'error');
        return;
    }
    
    hideAllScreens();
    document.getElementById('adminPanelScreen').classList.remove('hidden');
    refreshUsersList();
}

// Refresh users list
async function refreshUsersList() {
    const result = await window.authModule.getAllUsers();
    if (!result.success) {
        showToast(t('loadError'), 'error');
        return;
    }
    
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    result.users.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-700 hover:bg-gray-700/30';
        
        const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never';
        const stats = user.stats || {};
        
        // Ячейка: никнейм
        const usernameTd = document.createElement('td');
        usernameTd.className = 'p-3';
        usernameTd.textContent = user.username || user.displayName || 'N/A';

        // Ячейка: email
        const emailTd = document.createElement('td');
        emailTd.className = 'p-3';
        emailTd.textContent = user.email || 'N/A';

        // Ячейка: страна
        const countryTd = document.createElement('td');
        countryTd.className = 'p-3';
        countryTd.textContent = user.country || 'Unknown';

        // Ячейка: IP
        const ipTd = document.createElement('td');
        ipTd.className = 'p-3 font-mono text-sm';
        ipTd.textContent = user.ip || 'N/A';

        // Ячейка: последний вход
        const lastLoginTd = document.createElement('td');
        lastLoginTd.className = 'p-3 text-sm';
        lastLoginTd.textContent = lastLogin;

        // Ячейка: число сессий
        const sessionsTd = document.createElement('td');
        sessionsTd.className = 'p-3';
        sessionsTd.textContent = String(stats.totalSessions || 0);

        // Ячейка: действия
        const actionsTd = document.createElement('td');
        actionsTd.className = 'p-3';
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm';
        deleteBtn.textContent = t('delete');
        deleteBtn.addEventListener('click', () => deleteUserFromAdmin(user.id));
        actionsTd.appendChild(deleteBtn);

        row.appendChild(usernameTd);
        row.appendChild(emailTd);
        row.appendChild(countryTd);
        row.appendChild(ipTd);
        row.appendChild(lastLoginTd);
        row.appendChild(sessionsTd);
        row.appendChild(actionsTd);
        
        tbody.appendChild(row);
    });
}

// Delete user from admin panel
async function deleteUserFromAdmin(uid) {
    if (!confirm(t('confirmDelete'))) return;
    
    const result = await window.authModule.deleteUser(uid);
    
    if (result.success) {
        showToast(t('userDeleted'), 'success');
        refreshUsersList();
    } else {
        showToast(t('deleteError'), 'error');
    }
}

// ============================================
// MULTIPLAYER MODE FUNCTIONS
// ============================================

// Show multiplayer menu
function showMultiplayerMenu() {
    if (typeof window.__zoobLoadDeferredScripts === 'function') {
        window.__zoobLoadDeferredScripts();
    }
    playMenuClickSound();
    toggleFooter(false); // Скрываем футер в мультиплеере
    hideAllScreens();
    document.getElementById('multiplayerMenuScreen').classList.remove('hidden');
    const mpMain = document.getElementById('multiplayerMainMenu');
    if (mpMain) mpMain.classList.remove('hidden');
    mpRoomSettingsMode = 'online';
    app.currentMode = 'multiplayer-menu';
    if (typeof refreshMpRoomSettingsChrome === 'function') refreshMpRoomSettingsChrome();
}

// Room settings
let selectedWordCount = 200; // Default (chars)
let selectedTheme = 'random'; // Default
let selectedMultiplayerLang = 'ru'; // Default
let selectedTextOptComma = false;
let selectedTextOptPeriod = false;
let selectedTextOptDigits = false;
let selectedTextOptMixCase = false;
let mpRoomSettingsMode = 'online'; // 'online' | 'bot'

const BOT_DIFFICULTY_IDS = ['novice', 'easy', 'medium', 'hard', 'insane', 'impossible'];
const BOT_DIFFICULTY_STORAGE_KEY = 'zoob_mp_bot_difficulty';

function loadStoredBotDifficulty() {
    try {
        const v = localStorage.getItem(BOT_DIFFICULTY_STORAGE_KEY);
        if (v && BOT_DIFFICULTY_IDS.includes(v)) return v;
    } catch (e) {}
    return 'medium';
}

let selectedBotDifficulty = loadStoredBotDifficulty();

function selectBotDifficulty(d) {
    if (!BOT_DIFFICULTY_IDS.includes(d)) return;
    selectedBotDifficulty = d;
    try {
        localStorage.setItem(BOT_DIFFICULTY_STORAGE_KEY, d);
    } catch (e) {}
    document.querySelectorAll('.mp-diff-btn').forEach(btn => {
        const on = btn.getAttribute('data-difficulty') === d;
        btn.dataset.selected = String(on);
    });
}

function mpVoiceLangFromSite() {
    if (app.lang === 'ua') return 'ua';
    if (app.lang === 'en') return 'en';
    return 'ru';
}

function refreshMpBotVoiceSelect() {
    const sel = document.getElementById('mpBotVoiceSelect');
    if (!sel || !window.botBattleModule || typeof window.botBattleModule.populateVoiceSelect !== 'function') return;
    window.botBattleModule.populateVoiceSelect(sel, mpVoiceLangFromSite(), t('mpBotVoiceAuto'));
}

function getMpBotVoiceUriForSpeak() {
    const s = document.getElementById('mpBotVoiceSelect');
    if (s && s.value) return s.value;
    if (window.botBattleModule && typeof window.botBattleModule.getVoiceUriStored === 'function') {
        const u = window.botBattleModule.getVoiceUriStored();
        return u || null;
    }
    return null;
}

function onMpBotVoiceChange(el) {
    if (window.botBattleModule && typeof window.botBattleModule.setVoiceUriStored === 'function') {
        window.botBattleModule.setVoiceUriStored(el && el.value ? el.value : '');
    }
}

// Show room settings (forBot = true → duel vs AI, same text options)
function showRoomSettings(forBot) {
    if (typeof forBot === 'undefined') forBot = false;
    mpRoomSettingsMode = forBot ? 'bot' : 'online';
    document.getElementById('multiplayerMainMenu').classList.add('hidden');
    document.getElementById('roomSettingsDialog').classList.remove('hidden');
    document.getElementById('joinRoomDialog').classList.add('hidden');
    refreshMpRoomSettingsChrome();
    updateRoomSelectionUI();
}

function showBotBattleSettings() {
    showRoomSettings(true);
}

function refreshMpRoomSettingsChrome() {
    const titleEl = document.getElementById('mpRoomSettingsTitle');
    const btnLabel = document.getElementById('mpRoomPrimaryBtnLabel');
    const isBot = mpRoomSettingsMode === 'bot';
    if (titleEl) titleEl.textContent = isBot ? t('mpBotRoomTitle') : t('chooseGameMode');
    if (btnLabel) btnLabel.textContent = isBot ? t('mpStartBotBattle') : t('createRoom');
    document.querySelectorAll('.mp-online-only').forEach(el => {
        el.classList.toggle('hidden', isBot);
    });
    document.querySelectorAll('.mp-bot-only').forEach(el => {
        el.classList.toggle('hidden', !isBot);
    });
    const tts = document.getElementById('mpBotTtsCheckbox');
    if (tts && window.botBattleModule && typeof window.botBattleModule.getTtsStored === 'function') {
        tts.checked = !!window.botBattleModule.getTtsStored();
    }
    if (isBot) {
        selectBotDifficulty(selectedBotDifficulty);
        refreshMpBotVoiceSelect();
        try {
            if (window.speechSynthesis && !window._mpBotVoiceHooked) {
                window._mpBotVoiceHooked = true;
                window.speechSynthesis.addEventListener('voiceschanged', () => {
                    if (mpRoomSettingsMode === 'bot') refreshMpBotVoiceSelect();
                });
            }
        } catch (e) {}
    }
}

function onMpBotTtsChange(el) {
    if (window.botBattleModule && typeof window.botBattleModule.setTtsStored === 'function') {
        window.botBattleModule.setTtsStored(!!(el && el.checked));
    }
}

// Select multiplayer language
function selectMultiplayerLang(lang) {
    selectedMultiplayerLang = lang;
    // Update button styles
    document.querySelectorAll('.mp-lang-btn').forEach(btn => {
        const btnLang = btn.getAttribute('data-lang');
        const divs = btn.querySelectorAll('div');
        if (btnLang === lang) {
            btn.classList.add('border-warning', 'bg-warning/20');
            btn.classList.remove('border-transparent');
            divs.forEach(div => div.classList.add('text-white'));
        } else {
            btn.classList.remove('border-warning', 'bg-warning/20');
            btn.classList.add('border-transparent');
            divs.forEach(div => div.classList.remove('text-white'));
        }
    });
    updateRoomSelectionUI();
}

// Select theme
function selectTheme(theme) {
    selectedTheme = theme;
    // Update button styles
    document.querySelectorAll('.theme-btn').forEach(btn => {
        const btnTheme = btn.getAttribute('data-theme');
        const divs = btn.querySelectorAll('div');
        if (btnTheme === theme) {
            btn.classList.add('border-success', 'bg-success/20');
            btn.classList.remove('border-transparent');
            divs.forEach(div => div.classList.add('text-white'));
        } else {
            btn.classList.remove('border-success', 'bg-success/20');
            btn.classList.add('border-transparent');
            divs.forEach(div => div.classList.remove('text-white'));
        }
    });
    updateRoomSelectionUI();
}

// Hide room settings
function hideRoomSettings() {
    const dlg = document.getElementById('roomSettingsDialog');
    if (dlg && !dlg.classList.contains('hidden')) {
        dlg.classList.add('hidden');
        document.getElementById('multiplayerMainMenu').classList.remove('hidden');
    }
    mpRoomSettingsMode = 'online';
    refreshMpRoomSettingsChrome();
}

// Select word count
function selectWordCount(count) {
    selectedWordCount = count;
    // Update button styles
    document.querySelectorAll('.room-setting-btn').forEach(btn => {
        const wordCount = parseInt(btn.getAttribute('data-words'));
        const divs = btn.querySelectorAll('div');
        if (wordCount === count) {
            btn.classList.add('border-primary', 'bg-primary/20');
            btn.classList.remove('border-transparent');
            divs.forEach(div => div.classList.add('text-white'));
        } else {
            btn.classList.remove('border-primary', 'bg-primary/20');
            btn.classList.add('border-transparent');
            divs.forEach(div => div.classList.remove('text-white'));
        }
    });
    updateRoomSelectionUI();
}

function setMultiplayerTextOption(type, value) {
    if (type === 'comma') selectedTextOptComma = !!value;
    if (type === 'period') selectedTextOptPeriod = !!value;
    if (type === 'digits') selectedTextOptDigits = !!value;
    if (type === 'mixCase') selectedTextOptMixCase = !!value;
    updateRoomSelectionUI();
}

function getMultiplayerTextOptions() {
    return {
        lengthMode: 'chars',
        includeComma: selectedTextOptComma,
        includePeriod: selectedTextOptPeriod,
        includeDigits: selectedTextOptDigits,
        mixCase: selectedTextOptMixCase
    };
}

function updateRoomSelectionUI() {
    const dialog = document.getElementById('roomSettingsDialog');
    if (!dialog) return;

    // Ensure selected-state attrs are always visible (independent of Tailwind generation).
    dialog.querySelectorAll('.theme-btn').forEach(btn => {
        const t = btn.getAttribute('data-theme');
        btn.dataset.selected = String(t === selectedTheme);
    });
    dialog.querySelectorAll('.mp-lang-btn').forEach(btn => {
        const l = btn.getAttribute('data-lang');
        btn.dataset.selected = String(l === selectedMultiplayerLang);
    });
    dialog.querySelectorAll('.room-setting-btn').forEach(btn => {
        const w = parseInt(btn.getAttribute('data-words') || '0', 10);
        btn.dataset.selected = String(w === selectedWordCount);
    });
    dialog.querySelectorAll('.mp-diff-btn').forEach(btn => {
        const d = btn.getAttribute('data-difficulty');
        btn.dataset.selected = String(d === selectedBotDifficulty);
    });

    // Options visual state
    const setOptOn = (opt, on) => {
        const el = dialog.querySelector(`.mp-opt[data-opt="${opt}"]`);
        if (el) el.dataset.on = String(!!on);
    };
    setOptOn('comma', selectedTextOptComma);
    setOptOn('period', selectedTextOptPeriod);
    setOptOn('digits', selectedTextOptDigits);
    setOptOn('mixCase', selectedTextOptMixCase);

    const oc = document.getElementById('mpOptComma');
    const op = document.getElementById('mpOptPeriod');
    const od = document.getElementById('mpOptDigits');
    const om = document.getElementById('mpOptMixCase');
    if (oc) oc.checked = selectedTextOptComma;
    if (op) op.checked = selectedTextOptPeriod;
    if (od) od.checked = selectedTextOptDigits;
    if (om) om.checked = selectedTextOptMixCase;

    // Summary - language-aware labels
    const isEn = app.lang === 'en';
    const isUa = app.lang === 'ua';

    const themeTitles = isEn
        ? { random: 'Random', anime: 'Anime', games: 'Games', animals: 'Animals', space: 'Space', nature: 'Nature' }
        : isUa
            ? { random: 'Випадкові', anime: 'Аніме', games: 'Ігри', animals: 'Тварини', space: 'Космос', nature: 'Природа' }
            : { random: 'Случайные', anime: 'Аниме', games: 'Игры', animals: 'Животные', space: 'Космос', nature: 'Природа' };

    const langTitles = { ru: 'RU', en: 'EN', ua: 'UA' };

    const labelTheme = isEn ? 'THEME: ' : isUa ? 'ТЕМА: ' : 'ТЕМА: ';
    const labelLang  = isEn ? 'LANG: '  : isUa ? 'МОВА: ' : 'ЯЗЫК: ';
    const labelLen   = isEn ? 'LENGTH: ' : isUa ? 'ДОВЖИНА: ' : 'ДЛИНА: ';

    const themeEl = document.getElementById('mpRoomSummaryTheme');
    const langEl = document.getElementById('mpRoomSummaryLang');
    const lenEl = document.getElementById('mpRoomSummaryLen');

    if (themeEl) themeEl.textContent = labelTheme + (themeTitles[selectedTheme] || 'RANDOM');
    if (langEl) langEl.textContent = labelLang + (langTitles[selectedMultiplayerLang] || selectedMultiplayerLang.toUpperCase());
    if (lenEl) lenEl.textContent = labelLen + String(selectedWordCount);
}

// Show join room dialog
function showJoinRoomDialog() {
    document.getElementById('multiplayerMainMenu').classList.add('hidden');
    document.getElementById('joinRoomDialog').classList.remove('hidden');
    document.getElementById('roomSettingsDialog').classList.add('hidden');
    document.getElementById('joinRoomCodeInput').value = '';
    document.getElementById('joinRoomError').classList.add('hidden');
}

// Hide join room dialog
function hideJoinRoomDialog() {
    document.getElementById('joinRoomDialog').classList.add('hidden');
    document.getElementById('multiplayerMainMenu').classList.remove('hidden');
}

function formatMultiplayerFirebaseError(error) {
    var msg = error && error.message != null ? String(error.message) : '';
    var code = error && error.code != null ? String(error.code) : '';
    if (/PERMISSION_DENIED/i.test(msg) || code === 'PERMISSION_DENIED') {
        return t('multiplayerPermissionDeniedBody');
    }
    return msg;
}

// Create multiplayer room with settings
async function createMultiplayerRoomWithSettings() {
    if (mpRoomSettingsMode === 'bot') {
        startBotBattleFromSettings();
        return;
    }
    try {
        app.lastMatchWasBot = false;
        window.secondPlayerNotified = false; // Сброс флага
        const opts = getMultiplayerTextOptions();
        const roomCode = await window.multiplayerModule.createRoom(selectedWordCount, selectedTheme, selectedMultiplayerLang, opts);
        
        hideRoomSettings();
        hideAllScreens();
        document.getElementById('multiplayerWaitingScreen').classList.remove('hidden');
        document.getElementById('multiplayerRoomCode').textContent = roomCode;
        app.currentMode = 'multiplayer-waiting';
        
        showToast(t('roomCreated'), 'success', t('multiplayer'));
        
    } catch (error) {
        console.error('Failed to create room:', error);
        var createErr = formatMultiplayerFirebaseError(error) || (error && error.message) || '';
        showToast(createErr, 'error', t('errorCreatingRoom'));
    }
}

// Join multiplayer room
async function joinMultiplayerRoom() {
    const roomCode = document.getElementById('joinRoomCodeInput').value.trim().toUpperCase();
    
    if (!roomCode || roomCode.length !== 6) {
        document.getElementById('joinRoomError').textContent = t('invalidCode');
        document.getElementById('joinRoomError').classList.remove('hidden');
        return;
    }
    
    try {
        app.lastMatchWasBot = false;
        window.secondPlayerNotified = false;
        await window.multiplayerModule.joinRoom(roomCode);
        
        hideAllScreens();
        document.getElementById('multiplayerWaitingScreen').classList.remove('hidden');
        document.getElementById('multiplayerRoomCode').textContent = roomCode;
        app.currentMode = 'multiplayer-waiting';
        
        showToast(t('joinedRoom'), 'success', t('multiplayer'));
        
    } catch (error) {
        console.error('Failed to join room:', error);
        var joinErr = formatMultiplayerFirebaseError(error) || (error && error.message) || '';
        document.getElementById('joinRoomError').textContent = joinErr;
        document.getElementById('joinRoomError').classList.remove('hidden');
    }
}

function hideBotBattleChrome() {
    const chatWrap = document.getElementById('multiplayerBotChatWrap');
    if (chatWrap) chatWrap.classList.add('hidden');
    const hud = document.getElementById('multiplayerGameHudTitle');
    if (hud) hud.textContent = t('multiplayer');
}

function startBotBattleFromSettings() {
    if (typeof window.__zoobLoadDeferredScripts === 'function') {
        window.__zoobLoadDeferredScripts();
    }
    const gen = window.multiplayerModule && window.multiplayerModule.generateRandomTextByChars;
    const botReady = window.botBattleModule && typeof window.botBattleModule.start === 'function';
    if (typeof gen !== 'function' || !botReady) {
        showToast(t('mpBotLoading'), 'info', t('multiplayer'));
        let tries = 0;
        const id = setInterval(() => {
            tries++;
            const g = window.multiplayerModule && window.multiplayerModule.generateRandomTextByChars;
            const b = window.botBattleModule && typeof window.botBattleModule.start === 'function';
            if (typeof g === 'function' && b) {
                clearInterval(id);
                startBotBattleFromSettings();
            } else if (tries > 28) {
                clearInterval(id);
                showToast(t('errorCreatingRoom'), 'error', t('multiplayer'));
            }
        }, 200);
        return;
    }
    hideRoomSettings();
    const opts = getMultiplayerTextOptions();
    let gameText;
    try {
        gameText = gen.call(window.multiplayerModule, selectedWordCount, selectedMultiplayerLang, selectedTheme, opts);
    } catch (err) {
        console.error('Bot battle text:', err);
        showToast(t('errorCreatingRoom'), 'error', t('multiplayer'));
        return;
    }
    if (!gameText || !gameText.length) {
        showToast(t('errorCreatingRoom'), 'error', t('multiplayer'));
        return;
    }
    const botName = (window.botBattleModule && window.botBattleModule.pickBotName)
        ? window.botBattleModule.pickBotName(selectedMultiplayerLang)
        : 'Bot';
    const ttsEl = document.getElementById('mpBotTtsCheckbox');
    const ttsOn = ttsEl ? !!ttsEl.checked : false;
    if (window.botBattleModule && typeof window.botBattleModule.setTtsStored === 'function') {
        window.botBattleModule.setTtsStored(ttsOn);
    }
    beginBotBattleSession(gameText, botName, ttsOn);
}

function beginBotBattleSession(gameText, botName, ttsEnabled) {
    try {
        if (window.botBattleModule) window.botBattleModule.stop();
    } catch (e) {}

    hideAllScreens();
    document.getElementById('multiplayerGameScreen').classList.remove('hidden');
    app.currentMode = 'multiplayer-game';
    app.botBattleActive = true;
    app.lastMatchWasBot = true;
    app.gameEnded = false;
    app.botOpponentName = botName || 'Bot';
    app._botMpSessionLogged = false;

    try { closeMultiplayerResultsModal(); } catch (e2) {}
    stopMultiplayerRematchCountdown();

    app.currentText = gameText;
    app.currentPosition = 0;
    app.errors = 0;
    app.opponentErrors = 0;
    app.startTime = Date.now();
    app.isPaused = false;

    const oppEl = document.getElementById('multiplayerOpponentName');
    if (oppEl) oppEl.textContent = app.botOpponentName;
    const myNameEl = document.getElementById('multiplayerMyName');
    if (myNameEl) {
        const u = window.authModule && window.authModule.getCurrentUser && window.authModule.getCurrentUser();
        myNameEl.textContent = (u && u.username) ? u.username : (app.lang === 'en' ? 'You' : app.lang === 'ua' ? 'Ви' : 'Вы');
    }

    const hud = document.getElementById('multiplayerGameHudTitle');
    if (hud) hud.textContent = t('mpVsBotHud');

    const chatWrap = document.getElementById('multiplayerBotChatWrap');
    const chatName = document.getElementById('multiplayerBotChatName');
    const chatText = document.getElementById('multiplayerBotChatText');
    if (chatWrap) chatWrap.classList.remove('hidden');
    if (chatName) chatName.textContent = app.botOpponentName + ' · ' + t('mpBotSays');
    if (chatText) chatText.textContent = '';

    renderMultiplayerText();
    const display = document.getElementById('multiplayerTextDisplay');
    if (display) display.scrollLeft = 0;

    document.getElementById('multiplayerMyProgress').textContent = '0';
    document.getElementById('multiplayerMyProgressBar').style.width = '0%';
    document.getElementById('multiplayerOpponentProgress').textContent = '0';
    document.getElementById('multiplayerOpponentProgressBar').style.width = '0%';

    const keyboardContainer = document.getElementById('multiplayerKeyboardContainer');
    keyboardContainer.innerHTML = '';
    window.keyboardModule.render(app.currentLayout, keyboardContainer);

    document.removeEventListener('keydown', handleMultiplayerKeyPress);
    document.addEventListener('keydown', handleMultiplayerKeyPress);

    if (!window.botBattleModule || typeof window.botBattleModule.start !== 'function') return;

    const voiceSel = document.getElementById('mpBotVoiceSelect');
    const voiceUri = (voiceSel && voiceSel.value)
        ? voiceSel.value
        : (window.botBattleModule.getVoiceUriStored && window.botBattleModule.getVoiceUriStored()) || '';

    window.botBattleModule.start({
        text: gameText,
        textLang: selectedMultiplayerLang,
        ttsEnabled: !!ttsEnabled,
        difficulty: selectedBotDifficulty,
        voiceURI: voiceUri || null,
        onMessage(msg) {
            const el = document.getElementById('multiplayerBotChatText');
            if (el) el.textContent = msg;
        },
        onProgress(pct, errs) {
            if (app.gameEnded) return;
            app.opponentErrors = errs || 0;
            document.getElementById('multiplayerOpponentProgress').textContent = String(pct);
            document.getElementById('multiplayerOpponentProgressBar').style.width = pct + '%';
        },
        onErrors(e) {
            app.opponentErrors = e;
        },
        onBotWin() {
            if (app.gameEnded) return;
            finishBotBattleLoss();
        }
    });
}

function finishBotBattleLoss() {
    if (app.gameEnded) return;
    app.gameEnded = true;
    app.botBattleActive = false;
    document.removeEventListener('keydown', handleMultiplayerKeyPress);
    try {
        if (window.botBattleModule) window.botBattleModule.stop();
    } catch (e) {}

    const line = (window.botBattleModule && window.botBattleModule.lineForMatchEnd)
        ? window.botBattleModule.lineForMatchEnd(true, selectedMultiplayerLang)
        : '';
    const chatEl = document.getElementById('multiplayerBotChatText');
    if (chatEl && line) chatEl.textContent = line;

    const ttsOn = window.botBattleModule && window.botBattleModule.getTtsStored && window.botBattleModule.getTtsStored();
    if (ttsOn && line && window.botBattleModule.speakLine) {
        window.botBattleModule.speakLine(line, selectedMultiplayerLang, getMpBotVoiceUriForSpeak());
    }

    openMultiplayerResultsModal(false);
}

// Leave multiplayer room
async function leaveMultiplayerRoom(redirectTo = 'home') {
    try {
        // Stop game input handler to avoid "ghost" key presses after leaving.
        app.gameEnded = true;
        document.removeEventListener('keydown', handleMultiplayerKeyPress);

        if (app.botBattleActive) {
            try {
                if (window.botBattleModule) window.botBattleModule.stop();
            } catch (e0) {}
            app.botBattleActive = false;
            app.lastMatchWasBot = false;
            app.gameEnded = false;
            hideBotBattleChrome();
            try { closeMultiplayerResultsModal(); } catch (e1) {}
            showToast(t('leftRoom'), 'info', t('multiplayer'));
            if (redirectTo === 'multiplayer-menu') {
                showMultiplayerMenu();
            } else {
                showHome();
            }
            setRandomBackground();
            createParticles();
            return;
        }

        await window.multiplayerModule.leaveRoom();
        showToast(t('leftRoom'), 'info', t('multiplayer'));
        if (redirectTo === 'multiplayer-menu') {
            showMultiplayerMenu();
        } else {
            showHome();
        }
        // Восстанавливаем фон и частицы
        setRandomBackground();
        createParticles();
    } catch (error) {
        console.error('Failed to leave room:', error);
        if (redirectTo === 'multiplayer-menu') {
            showMultiplayerMenu();
        } else {
            showHome();
        }
        setRandomBackground();
        createParticles();
    }
}

// Copy room code to clipboard
function copyRoomCode() {
    const roomCode = document.getElementById('multiplayerRoomCode').textContent;
    const onSuccess = () => showToast(`${t('codeCopied')}: ${roomCode}`, 'success');
    const onFail = () => showToast(t('copyFailed') || 'Ошибка копирования', 'error');

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(roomCode).then(onSuccess).catch(() => fallbackCopy());
    } else {
        fallbackCopy();
    }

    function fallbackCopy() {
        var textarea = document.createElement('textarea');
        textarea.value = roomCode;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        try {
            textarea.select();
            textarea.setSelectionRange(0, roomCode.length);
            document.execCommand('copy') ? onSuccess() : onFail();
        } catch (e) {
            onFail();
        }
        document.body.removeChild(textarea);
    }
}

// Multiplayer callbacks
// Render multiplayer text - ОПТИМИЗИРОВАНА с DocumentFragment
function renderMultiplayerText() {
    const display = DOM.get('multiplayerTextDisplay');
    if (!display) return;

    const WINDOW_SIZE = 60;
    const TYPED_VISIBLE = 10;

    const startPos = Math.max(0, app.currentPosition - TYPED_VISIBLE);
    const endPos = Math.min(app.currentText.length, startPos + WINDOW_SIZE);
    const windowLen = endPos - startPos;

    if (windowLen === 0) { display.innerHTML = ''; return; }

    // Reuse existing spans - same strategy as single-player renderText.
    while (display.childElementCount > windowLen) display.removeChild(display.lastChild);
    if (display.childElementCount < windowLen) {
        const frag = document.createDocumentFragment();
        for (let i = display.childElementCount; i < windowLen; i++) frag.appendChild(document.createElement('span'));
        display.appendChild(frag);
    }

    const children = display.children;
    for (let i = 0; i < windowLen; i++) {
        const charIdx = startPos + i;
        const char = app.currentText[charIdx];
        const span = children[i];

        let newClass;
        if (charIdx < app.currentPosition) {
            newClass = 'char-typed';
            const dist = app.currentPosition - charIdx;
            span.style.cssText = 'opacity:' + Math.max(0.2, 1 - (dist / TYPED_VISIBLE)) + ';font-size:0.9em';
        } else {
            if (span.style.cssText) span.style.cssText = '';
            newClass = charIdx === app.currentPosition ? 'char-current' : 'char-future';
        }

        if (span.className !== newClass) span.className = newClass;
        const content = char === ' ' ? '\u00A0' : char;
        if (span.textContent !== content) span.textContent = content;
    }

    const cursorSpan = children[app.currentPosition - startPos];
    if (cursorSpan) cursorSpan.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
}

window.onMultiplayerUpdate = (data) => {
    if (data && typeof data.opponentErrors !== 'undefined') {
        app.opponentErrors = data.opponentErrors || 0;
    }
    if (data && typeof data.opponentReady !== 'undefined') {
        app.opponentReady = !!data.opponentReady;
    }
    if (data && typeof data.myReady !== 'undefined') {
        app.myReady = !!data.myReady;
    }
    updateMultiplayerResultsHint();
    // Update player count
    if (data.playerCount) {
        // If opponent left, allow the "second player joined" toast next time.
        if (data.playerCount < 2 && window.secondPlayerNotified) {
            window.secondPlayerNotified = false;
        }
        const countEl = document.getElementById('multiplayerPlayerCount');
        if (countEl) {
            countEl.innerHTML = `<span class="text-success font-bold">${data.playerCount}</span> / <span class="text-gray-400">2</span> <span data-i18n="playersCount">${t('playersCount')}</span>`;
        }
        
        // Уведомление когда второй игрок подключился
        if (data.playerCount === 2 && !window.secondPlayerNotified) {
            window.secondPlayerNotified = true;
            showToast(t('playerJoined'), 'success', t('multiplayer'));
        }
    }
    
    // Update opponent progress in game
    if (data.opponentProgress !== undefined && app.currentMode === 'multiplayer-game') {
        const progress = Math.round(data.opponentProgress);
        document.getElementById('multiplayerOpponentProgress').textContent = progress;
        document.getElementById('multiplayerOpponentProgressBar').style.width = progress + '%';
    }
};

window.onMultiplayerStart = (gameText) => {
    app.botBattleActive = false;
    app.lastMatchWasBot = false;
    hideBotBattleChrome();

    hideAllScreens();
    document.getElementById('multiplayerGameScreen').classList.remove('hidden');
    app.currentMode = 'multiplayer-game';
    
    // Close results modal and stop countdown from previous rematch.
    try { closeMultiplayerResultsModal(); } catch (e) {}
    stopMultiplayerRematchCountdown();
    
    // Setup game
    app.currentText = gameText;
    app.currentPosition = 0;
    app.errors = 0;
    app.startTime = Date.now();
    app.isPaused = false;
    
    // Render text
    const display = document.getElementById('multiplayerTextDisplay');
    renderMultiplayerText();
    if (display) {
        // Prevent stale horizontal scroll offset from previous match.
        display.scrollLeft = 0;
    }
    
    // Reset progress bars
    document.getElementById('multiplayerMyProgress').textContent = '0';
    document.getElementById('multiplayerMyProgressBar').style.width = '0%';
    document.getElementById('multiplayerOpponentProgress').textContent = '0';
    document.getElementById('multiplayerOpponentProgressBar').style.width = '0%';
    
    // Render keyboard
    const keyboardContainer = document.getElementById('multiplayerKeyboardContainer');
    keyboardContainer.innerHTML = '';
    window.keyboardModule.render(app.currentLayout, keyboardContainer);
    
    // Focus input
    document.addEventListener('keydown', handleMultiplayerKeyPress);
};

window.onMultiplayerRoomDeleted = () => {
    if (!app.gameEnded) { // Показываем только если игра не закончилась
        showToast(t('opponentLeft'), 'warning', t('roomClosed'));
        setTimeout(() => {
            showHome();
            setRandomBackground();
            createParticles();
        }, 1500);
    }
};

window.onOpponentFinished = () => {
    if (!app.gameEnded) {
        app.gameEnded = true;
        document.removeEventListener('keydown', handleMultiplayerKeyPress);
        // Disable rematch auto-start: mark myself as not ready.
        try { window.multiplayerModule?.setReadyForNext?.(false); } catch (e) {}
        openMultiplayerResultsModal(false);
    }
};

window.onOpponentLeft = () => {
    // Even if game already ended (results modal is open), we still must update UI.
    try { closeMultiplayerResultsModal(); } catch (e) {}
    stopMultiplayerRematchCountdown();

    // Prevent ghost input
    try { document.removeEventListener('keydown', handleMultiplayerKeyPress); } catch (e) {}

    showToast(t('opponentLeft'), 'warning', t('roomClosed'));
    // Return player to a consistent "waiting" state.
    try {
        returnToMultiplayerLobby();
    } catch (e) {
        setTimeout(() => returnToMultiplayerLobby(), 300);
    }
};

// Handle multiplayer key press
function handleMultiplayerKeyPress(e) {
    if (app.currentMode !== 'multiplayer-game' || app.isPaused) return;
    
    const expectedCharForKey = app.currentText[app.currentPosition];
    if (e.key.length > 1 && e.key !== 'Backspace' && !(e.key === 'Enter' && expectedCharForKey === '\n')) return;
    
    e.preventDefault();
    
    const display = document.getElementById('multiplayerTextDisplay');
    
    if (e.key === 'Backspace') {
        if (app.currentPosition > 0) {
            app.currentPosition--;
            renderMultiplayerText();
            updateMultiplayerProgress();
        }
        return;
    }
    
    const expectedChar = app.currentText[app.currentPosition];
    
    if (e.key === expectedChar) {
        // Correct
        app.currentPosition++;
        renderMultiplayerText();
        playSound('correct');
        updateMultiplayerProgress();
        
        // Check if finished
        if (app.currentPosition >= app.currentText.length) {
            finishMultiplayerGame();
        }
    } else {
        // Error
        app.errors++;
        playSound('error');
        if (app.botBattleActive) {
            if (window.botBattleModule) window.botBattleModule.notifyPlayer(app.currentPosition);
        } else {
            window.multiplayerModule?.updateErrors?.(app.errors);
        }
    }
}

// Update multiplayer progress (UI only for my bar)
function applyMyMultiplayerProgressUI() {
    if (!app.currentText || app.currentText.length === 0) {
        const progress = 0;
        document.getElementById('multiplayerMyProgress').textContent = progress;
        document.getElementById('multiplayerMyProgressBar').style.width = progress + '%';
        return;
    }
    const raw = (app.currentPosition / app.currentText.length) * 100;
    const isFinished = app.currentPosition >= app.currentText.length;
    const progress = isFinished ? 100 : Math.floor(raw);
    document.getElementById('multiplayerMyProgress').textContent = progress;
    document.getElementById('multiplayerMyProgressBar').style.width = progress + '%';
}

// Update multiplayer progress
function updateMultiplayerProgress() {
    applyMyMultiplayerProgressUI();
    if (app.botBattleActive) {
        if (window.botBattleModule) window.botBattleModule.notifyPlayer(app.currentPosition);
        return;
    }
    if (!app.currentText || app.currentText.length === 0) {
        window.multiplayerModule.updateProgress(0);
        return;
    }
    const raw = (app.currentPosition / app.currentText.length) * 100;
    const isFinished = app.currentPosition >= app.currentText.length;
    const progress = isFinished ? 100 : Math.floor(raw);
    window.multiplayerModule.updateProgress(progress);
}

// Finish multiplayer game
async function finishMultiplayerGame() {
    if (app.gameEnded) return; // Защита от повторного вызова

    if (app.botBattleActive) {
        app.gameEnded = true;
        app.botBattleActive = false;
        document.removeEventListener('keydown', handleMultiplayerKeyPress);
        try {
            if (window.botBattleModule) window.botBattleModule.stop();
        } catch (e) {}
        const line = (window.botBattleModule && window.botBattleModule.lineForMatchEnd)
            ? window.botBattleModule.lineForMatchEnd(false, selectedMultiplayerLang)
            : '';
        const chatEl = document.getElementById('multiplayerBotChatText');
        if (chatEl && line) chatEl.textContent = line;
        const ttsOn = window.botBattleModule && window.botBattleModule.getTtsStored && window.botBattleModule.getTtsStored();
        if (ttsOn && line && window.botBattleModule.speakLine) {
            window.botBattleModule.speakLine(line, selectedMultiplayerLang, getMpBotVoiceUriForSpeak());
        }
        openMultiplayerResultsModal(true);
        return;
    }

    app.gameEnded = true;
    document.removeEventListener('keydown', handleMultiplayerKeyPress);
    try {
        await window.multiplayerModule.finishGame();
    } catch (e) {
        console.error('finishMultiplayerGame error:', e);
    } finally {
        openMultiplayerResultsModal(true);
    }
}

// Return to lobby after match
async function returnToMultiplayerLobby() {
    try { await window.multiplayerModule.resetGame(); } catch (e) {}
    hideAllScreens();
    document.getElementById('multiplayerWaitingScreen').classList.remove('hidden');
    app.currentMode = 'multiplayer-waiting';
    app.gameEnded = false;
    window.secondPlayerNotified = false;
}

function formatClock(totalSeconds) {
    totalSeconds = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m + ':' + String(s).padStart(2, '0');
}

function mpResultsThemeTitle(theme) {
    const keys = {
        random: 'mpThemeRandom',
        anime: 'mpThemeAnime',
        games: 'mpThemeGames',
        animals: 'mpThemeAnimals',
        space: 'mpThemeSpace',
        nature: 'mpThemeNature'
    };
    return t(keys[theme] || 'mpThemeRandom');
}

function mpResultsDifficultyLabel(diffId) {
    const map = {
        novice: 'mpDiffNovice',
        easy: 'mpDiffEasy',
        medium: 'mpDiffMedium',
        hard: 'mpDiffHard',
        insane: 'mpDiffInsane',
        impossible: 'mpDiffImpossible'
    };
    return t(map[diffId] || 'mpDiffMedium');
}

/** Одна запись в локальной статистике / профиле после дуэли с ботом (победа или поражение). */
function recordBotMultiplayerSessionIfNeeded() {
    if (!app.lastMatchWasBot || app._botMpSessionLogged) return;
    app._botMpSessionLogged = true;
    const myChars = app.currentPosition || 0;
    const myErrors = app.errors || 0;
    const timeSec = Math.max(1, Math.round((Date.now() - (app.startTime || Date.now())) / 1000));
    const minutes = timeSec / 60;
    const speed = Math.round(myChars / minutes);
    const accuracy = myChars + myErrors > 0 ? Math.round((myChars / (myChars + myErrors)) * 100) : 100;
    const botLabel = (app.botOpponentName && String(app.botOpponentName).trim()) || 'Bot';
    const modeLabel = typeof t === 'function' ? t('profileModeMultiplayerBot') : 'Bot duel';
    const sessionData = {
        speed: speed,
        accuracy: accuracy,
        time: timeSec,
        errors: myErrors,
        mode: 'multiplayer-bot',
        layout: app.currentLayout || 'ru',
        lessonKey: null,
        lessonName: modeLabel + ' · ' + botLabel,
        timestamp: Date.now()
    };
    if (window.statsModule && typeof window.statsModule.addSession === 'function') {
        window.statsModule.addSession(sessionData);
    }
    updateStreak();
    if (window.levelModule) {
        applySessionXpAndLevelReward(window.levelModule.calculateSessionXP(sessionData));
    }
    var newlyAchievements = window.achievementsModule && typeof window.achievementsModule.checkAndNotify === 'function'
        ? window.achievementsModule.checkAndNotify()
        : [];
    var user = window.authModule && window.authModule.getCurrentUser && window.authModule.getCurrentUser();
    if (user && window.authModule.addUserSession) {
        window.authModule.addUserSession(user.uid, sessionData).catch(function (err) {
            console.error('Failed to save bot duel session:', err);
        });
    }
    grantCoinsForNewAchievements(newlyAchievements);
}

function openMultiplayerResultsModal(isWin) {
    const modal = document.getElementById('multiplayerResultsModal');
    if (!modal) return;

    recordBotMultiplayerSessionIfNeeded();

    const myChars = app.currentPosition || 0;
    const myErrors = app.errors || 0;
    const totalLen = (app.currentText && app.currentText.length) ? app.currentText.length : 1;
    const opponentErrors = app.opponentErrors || 0;

    // Opponent chars from current opponent progress percent.
    const oppProgressEl = document.getElementById('multiplayerOpponentProgress');
    const oppProgress = oppProgressEl ? parseFloat(oppProgressEl.textContent) : 0;
    const oppChars = Math.round((oppProgress / 100) * totalLen);

    const timeSec = (Date.now() - (app.startTime || Date.now())) / 1000;
    const minutes = Math.max(1 / 60, timeSec / 60);

    const myCpm = Math.round(myChars / minutes);
    const myWpm = Math.round((myChars / 5) / minutes);
    const myAcc = Math.round(myChars + myErrors > 0 ? (myChars / (myChars + myErrors)) * 100 : 100);

    const oppCpm = Math.round(oppChars / minutes);
    const oppWpm = Math.round((oppChars / 5) / minutes);
    const oppAcc = Math.round(oppChars + opponentErrors > 0 ? (oppChars / (oppChars + opponentErrors)) * 100 : 100);
    const cpmDelta = Math.round(oppCpm - myCpm);

    const isEnglish = app.lang === 'en';
    const isUkrainian = app.lang === 'ua';
    const badgeWin = isEnglish ? 'WIN' : (isUkrainian ? 'ПОБЕДА' : 'ПОБЕДА');
    const badgeLose = isEnglish ? 'LOSE' : (isUkrainian ? 'ПОРАЖЕННЯ' : 'ПОРАЖЕНИЕ');

    const title = isWin ? (isEnglish ? 'Victory' : 'Победа') : (isEnglish ? 'Defeat' : 'Поражение');
    const subtitle = isWin
        ? (isEnglish ? 'Match finished. You typed faster.' : 'Матч завершён. Вы ввели текст быстрее.')
        : (isEnglish ? 'Match finished. Opponent was faster.' : 'Матч завершён. Соперник был быстрее.');

    document.getElementById('multiplayerResultsTitle').textContent = title;
    document.getElementById('multiplayerResultsSubtitle').textContent = subtitle;
    document.getElementById('mpResMyBadge').textContent = isWin ? badgeWin : badgeLose;
    document.getElementById('mpResOppBadge').textContent = isWin ? badgeLose : badgeWin;

    document.getElementById('mpResMyCpm').textContent = myCpm;
    document.getElementById('mpResMyWpm').textContent = myWpm;
    document.getElementById('mpResMyAcc').textContent = myAcc;
    document.getElementById('mpResMyChars').textContent = myChars;
    document.getElementById('mpResMyErrors').textContent = myErrors;
    document.getElementById('mpResMyTime').textContent = formatClock(timeSec);

    document.getElementById('mpResOppCpm').textContent = oppCpm;
    document.getElementById('mpResOppWpm').textContent = oppWpm;
    document.getElementById('mpResOppAcc').textContent = oppAcc;
    document.getElementById('mpResOppChars').textContent = oppChars;
    document.getElementById('mpResOppErrors').textContent = opponentErrors;

    const botMetaRow = document.getElementById('mpResBotMetaRow');
    const botDiffPill = document.getElementById('mpResBotDifficultyPill');
    const botChipTheme = document.getElementById('mpResBotChipTheme');
    const botChipLen = document.getElementById('mpResBotChipLen');
    const botChipLang = document.getElementById('mpResBotChipLang');
    const botChipOpts = document.getElementById('mpResBotChipOpts');
    const botChipBot = document.getElementById('mpResBotChipBot');
    const botChipBotSep = document.getElementById('mpResBotChipBotSep');
    const botPaceNote = document.getElementById('mpResBotPaceNote');
    if (botMetaRow) {
        if (app.lastMatchWasBot) {
            botMetaRow.style.display = 'block';
            botMetaRow.querySelectorAll('[data-i18n]').forEach((el) => {
                const key = el.getAttribute('data-i18n');
                if (key) el.textContent = t(key);
            });
            if (botDiffPill) botDiffPill.textContent = mpResultsDifficultyLabel(selectedBotDifficulty);
            const themeStr = mpResultsThemeTitle(selectedTheme);
            const lenStr = selectedWordCount + ' ' + t('mpChars');
            const langStr = (selectedMultiplayerLang || 'ru').toUpperCase();
            if (botChipTheme) {
                botChipTheme.textContent = themeStr;
                botChipTheme.title = t('mpResRowTheme') + ': ' + themeStr;
            }
            if (botChipLen) {
                botChipLen.textContent = lenStr;
                botChipLen.title = t('mpResRowLength') + ': ' + lenStr;
            }
            if (botChipLang) {
                botChipLang.textContent = langStr;
                botChipLang.title = t('mpResRowTextLang') + ': ' + langStr;
            }
            const optParts = [];
            if (selectedTextOptComma) optParts.push(t('mpOptComma'));
            if (selectedTextOptPeriod) optParts.push(t('mpOptPeriod'));
            if (selectedTextOptDigits) optParts.push(t('mpOptDigits'));
            if (selectedTextOptMixCase) optParts.push(t('mpOptMixCase'));
            const optsFull = optParts.length ? optParts.join(', ') : t('mpResOptsPlain');
            const optsChip = optParts.length ? optsFull : t('mpResOptsChip');
            if (botChipOpts) {
                botChipOpts.textContent = optsChip;
                botChipOpts.title = t('mpResRowTextOpts') + ': ' + optsFull;
            }
            const botNameTrim = app.botOpponentName && String(app.botOpponentName).trim();
            if (botChipBot && botChipBotSep) {
                if (botNameTrim) {
                    botChipBot.textContent = botNameTrim;
                    botChipBot.title = t('mpResRowBot') + ': ' + botNameTrim;
                    botChipBot.classList.remove('hidden');
                    botChipBotSep.classList.remove('hidden');
                } else {
                    botChipBot.classList.add('hidden');
                    botChipBotSep.classList.add('hidden');
                }
            }
            if (botPaceNote) {
                if (!isWin && cpmDelta >= 12) {
                    botPaceNote.textContent = t('mpResBotPaceAhead').replace('{n}', String(cpmDelta));
                    botPaceNote.classList.remove('hidden');
                } else if (isWin && cpmDelta <= -12) {
                    botPaceNote.textContent = t('mpResBotPaceYouAhead').replace('{n}', String(Math.abs(cpmDelta)));
                    botPaceNote.classList.remove('hidden');
                } else {
                    botPaceNote.classList.add('hidden');
                }
            }
        } else {
            botMetaRow.style.display = 'none';
            if (botPaceNote) botPaceNote.classList.add('hidden');
        }
    }

    const pillsRow = document.getElementById('mpResReadyPillsRow');
    if (pillsRow) pillsRow.style.display = app.lastMatchWasBot ? 'none' : '';

    const rematchL = document.getElementById('mpResRematchLabel');
    const settingsL = document.getElementById('mpResSettingsLabel');
    const exitL = document.getElementById('mpResExitLabel');
    if (rematchL) rematchL.textContent = t('mpPlayAgain');
    if (settingsL) settingsL.textContent = t('mpChangeSettings');
    if (exitL) exitL.textContent = app.lastMatchWasBot ? t('mpBotExitToMenu') : t('mpExitRoom');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    updateMultiplayerResultsHint();
}

function updateMultiplayerResultsHint() {
    const modal = document.getElementById('multiplayerResultsModal');
    const hint = document.getElementById('mpResRematchHint');
    if (!modal || !hint) return;
    const isVisible = !modal.classList.contains('hidden');
    if (!isVisible) return;

    if (app.lastMatchWasBot) {
        hint.style.animation = '';
        hint.textContent = t('mpBotRematchHint');
        hint.style.border = '1px solid rgba(255,255,255,0.10)';
        hint.style.background = 'transparent';
        hint.style.boxShadow = 'none';
        return;
    }

    const isEnglish = app.lang === 'en';
    const isUkrainian = app.lang === 'ua';

    const opponentWants = app.opponentReady === true;
    const iWant = app.myReady === true;

    updateMultiplayerReadyPills();

    if (!opponentWants) {
        hint.style.animation = '';
        hint.textContent = isEnglish
            ? 'Next match starts only when both players press "Rematch".'
            : (isUkrainian ? 'Наступний матч почнеться лише коли обидва гравці натиснуть «Грати знову».' : 'Следующий матч начнётся только когда оба игрока нажмут «Играть снова».');
        hint.style.border = '1px solid rgba(255,255,255,0.10)';
        hint.style.background = 'transparent';
        hint.style.boxShadow = 'none';
        return;
    }

    if (opponentWants && !iWant) {
        hint.style.animation = '';
        hint.textContent = isEnglish
            ? 'Your opponent wants a rematch. Press "Rematch" to start.'
            : (isUkrainian ? 'Суперник хоче зіграти ще раз. Натисніть «Грати знову».' : 'Соперник хочет сыграть ещё раз. Нажмите «Играть снова».');
        hint.style.border = '1px solid rgba(168,85,247,0.25)';
        hint.style.background = 'rgba(168,85,247,0.08)';
        hint.style.boxShadow = '0 0 22px rgba(168,85,247,0.18)';
        return;
    }

    if (opponentWants && iWant) {
        startMultiplayerRematchCountdown();
        const remainingMs = mpRematchCountdownEndTs ? (mpRematchCountdownEndTs - Date.now()) : 0;
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

        hint.textContent = isEnglish
            ? `Both players are ready. Starting next match in ${remainingSec}s...`
            : (isUkrainian
                ? `Обидва гравці готові. Наступний матч через ${remainingSec}с...`
                : `Оба игрока готовы. Следующий матч через ${remainingSec}с...`);
        hint.style.border = '1px solid rgba(0,229,255,0.25)';
        hint.style.background = 'rgba(0,229,255,0.08)';
        hint.style.boxShadow = '0 0 22px rgba(0,229,255,0.18)';
        hint.style.animation = 'mpCountdownPulse 0.85s ease-in-out infinite';
        return;
    }
}

function updateMultiplayerReadyPills() {
    const myPill = document.getElementById('mpResMyReadyPill');
    const oppPill = document.getElementById('mpResOppReadyPill');
    if (!myPill || !oppPill) return;
    if (app.lastMatchWasBot) return;

    const isEnglish = app.lang === 'en';
    const isUkrainian = app.lang === 'ua';

    const myReady = app.myReady === true;
    const oppReady = app.opponentReady === true;

    const myText = myReady
        ? (isEnglish ? 'YOU READY' : (isUkrainian ? 'ВИ ГОТОВІ' : 'ВЫ ГОТОВЫ'))
        : (isEnglish ? 'YOU WAIT' : (isUkrainian ? 'ВИ ЧЕКАЄТЕ' : 'ВЫ ЖДЁТЕ'));

    const oppText = oppReady
        ? (isEnglish ? 'OPP READY' : (isUkrainian ? 'СУПЕРНИК ГОТОВИЙ' : 'СОПЕРНИК ГОТОВ'))
        : (isEnglish ? 'OPP WAIT' : (isUkrainian ? 'СУПЕРНИК ЧЕКАЄ' : 'СОПЕРНИК ЖДЁТ'));

    const applyPillStyle = (el, isReady, color) => {
        el.textContent = el === myPill ? myText : oppText;
        if (isReady) {
            el.style.borderColor = color.readyBorder;
            el.style.background = color.readyBg;
            el.style.color = color.readyColor;
            el.style.boxShadow = color.readyGlow;
        } else {
            el.style.borderColor = color.notBorder;
            el.style.background = color.notBg;
            el.style.color = color.notColor;
            el.style.boxShadow = 'none';
        }
    };

    applyPillStyle(myPill, myReady, {
        readyBorder: 'rgba(0,229,255,0.85)',
        readyBg: 'rgba(0,229,255,0.12)',
        readyColor: 'rgba(0,229,255,0.98)',
        readyGlow: '0 0 18px rgba(0,229,255,0.22)',
        notBorder: 'rgba(255,255,255,0.10)',
        notBg: 'rgba(255,255,255,0.04)',
        notColor: 'rgba(229,231,235,0.75)'
    });

    applyPillStyle(oppPill, oppReady, {
        readyBorder: 'rgba(168,85,247,0.85)',
        readyBg: 'rgba(168,85,247,0.12)',
        readyColor: 'rgba(196,181,253,0.98)',
        readyGlow: '0 0 18px rgba(168,85,247,0.20)',
        notBorder: 'rgba(255,255,255,0.10)',
        notBg: 'rgba(255,255,255,0.04)',
        notColor: 'rgba(229,231,235,0.75)'
    });
}

function closeMultiplayerResultsModal() {
    const modal = document.getElementById('multiplayerResultsModal');
    if (!modal) return;
    const botMetaRow = document.getElementById('mpResBotMetaRow');
    if (botMetaRow) botMetaRow.style.display = 'none';
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    stopMultiplayerRematchCountdown();
}

let mpRematchCountdownIntervalId = null;
let mpRematchCountdownEndTs = null;

function stopMultiplayerRematchCountdown() {
    if (mpRematchCountdownIntervalId) {
        clearInterval(mpRematchCountdownIntervalId);
        mpRematchCountdownIntervalId = null;
    }
    mpRematchCountdownEndTs = null;
}

function startMultiplayerRematchCountdown() {
    if (mpRematchCountdownIntervalId) return;
    // Host auto-start delay is 3000ms.
    mpRematchCountdownEndTs = Date.now() + 3000;
    mpRematchCountdownIntervalId = setInterval(function () {
        updateMultiplayerResultsHint();
        const remainingMs = mpRematchCountdownEndTs ? (mpRematchCountdownEndTs - Date.now()) : 0;
        if (remainingMs <= 0) stopMultiplayerRematchCountdown();
    }, 150);
}

window.multiplayerResultsRematch = async function() {
    closeMultiplayerResultsModal();
    if (app.lastMatchWasBot) {
        startBotBattleFromSettings();
        return;
    }
    await returnToMultiplayerLobby();
};

window.multiplayerResultsExit = async function() {
    closeMultiplayerResultsModal();
    if (app.lastMatchWasBot) {
        app.lastMatchWasBot = false;
        app.gameEnded = false;
        hideBotBattleChrome();
        showHome();
        setRandomBackground();
        createParticles();
        return;
    }
    await leaveMultiplayerRoom();
};

window.multiplayerResultsSettings = async function() {
    closeMultiplayerResultsModal();
    if (app.lastMatchWasBot) {
        app.gameEnded = false;
        showMultiplayerMenu();
        // showMultiplayerMenu() сбрасывает режим в online; для рестарта бота обязательно снова выставить bot.
        mpRoomSettingsMode = 'bot';
        document.getElementById('multiplayerMainMenu').classList.add('hidden');
        document.getElementById('roomSettingsDialog').classList.remove('hidden');
        document.getElementById('joinRoomDialog').classList.add('hidden');
        refreshMpRoomSettingsChrome();
        updateRoomSelectionUI();
        return;
    }
    await leaveMultiplayerRoom('multiplayer-menu');
};

// Shop functions
let currentShopCategory = 'all';
let currentShopLanguage = 'all';

// Show shop screen
function showShop() {
    const user = window.authModule?.getCurrentUser();
    if (!user) {
        showLoginModal();
        return;
    }
    if (app.soundEnabled && audioOpenShop) {
        audioOpenShop.currentTime = 0;
        audioOpenShop.play().catch(() => {});
    }
    hideAllScreens();
    const shopScreen = DOM.get('shopScreen');
    if (shopScreen) shopScreen.classList.remove('hidden');
    toggleFooter(false); // Скрываем футер в магазине
    
    // Обновляем баланс в магазине
    const shopBalance = DOM.get('shopBalance');
    if (shopBalance) {
        shopBalance.textContent = user.balance || 0;
    }
    
    // Сбрасываем фильтры
    currentShopLanguage = 'all';
    currentShopCategory = 'all';
    
    // Подсветка кнопки «Все языки» по умолчанию
    document.querySelectorAll('.shop-lang-btn').forEach(btn => {
        const lang = btn.getAttribute('data-lang');
        if (lang === 'all') {
            btn.classList.add('border-cyan-500', 'bg-cyan-500/20');
            btn.classList.remove('border-transparent');
        } else {
            btn.classList.remove('border-cyan-500', 'bg-cyan-500/20');
            btn.classList.add('border-transparent');
        }
    });
    
    // Сразу показываем категории и загружаем все уроки (все языки, все категории)
    const categoryTabs = DOM.get('shopCategoryTabs');
    if (categoryTabs) categoryTabs.classList.remove('hidden');
    loadShopLessons();
    requestAnimationFrame(function checkShopLoaded() {
        const grid = document.getElementById('shopLessonsGrid');
        if (grid && !grid.querySelector('.shop-card-wrap') && window.shopModule) {
            loadShopLessons();
        }
    });
}

function showCollectibles() {
    if (!window.authModule || !window.authModule.getCurrentUser()) {
        showLoginModal();
        showToast(t('collectiblesLogin'), 'info', t('login'));
        return;
    }
    playMenuClickSound();
    hideAllScreens();
    var el = document.getElementById('collectibleScreen');
    if (el) el.classList.remove('hidden');
    toggleFooter(false);
    requestAnimationFrame(function () {
        renderCollectiblesGrid();
        if (typeof updateTranslations === 'function') updateTranslations();
    });
}

/** SVG «?» и значок пустого слота для карточек коллекции (без эмодзи, Win 8.1). */
var CC_COLLECT_Q_SVG = '<svg xmlns="http://www.w3.org/2000/svg" class="cc-slot__q-svg" viewBox="0 0 64 64" aria-hidden="true"><path fill="rgba(148,163,184,0.48)" d="M30.2 15.2c-7.2 0-12.8 5.9-12.6 13.1.1 4 2.3 7.4 6 9.7l2.4 1.5c2 1.3 3.1 3.2 3 5.6v1.8h8.4v-2.1c.1-4.6-2.1-8-6.1-10.5l-2.6-1.6c-1.7-1-2.6-2.5-2.7-4.4-.1-3.4 2.6-6.1 7.1-6 4.2.1 7 2.8 7 6.5 0 2.1 1 3.8 2.9 4.9l1.3.8c3.7 2.2 5.7 5.7 5.7 10v3.7h-8.4v-3.4c0-2.6-1.2-4.8-3.6-6.1l-1.5-.9c-4.9-3-7.6-7.7-7.8-13.7-.2-8.2 5.9-14.7 14.5-14.7zm-2.3 37.4h8.4V44h-8.4v8.6z"/></svg>';
var CC_COLLECT_BADGE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" class="cc-badge-minus-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.25" fill="none" stroke="currentColor" stroke-width="1.65"/><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M7.75 12h8.5"/></svg>';

function renderCollectiblesGrid() {
    var mod = window.collectibleCardsModule;
    if (!mod) return;
    var user = window.authModule && window.authModule.getCurrentUser();
    var owned = user && user.collectedCards ? mod.normalizeOwned(user.collectedCards) : [];
    var ownedSet = Object.create(null);
    owned.forEach(function (id) { ownedSet[id] = 1; });
    var grid = document.getElementById('collectibleGrid');
    if (!grid) return;
    var ids = mod.getAllCardIds();
    grid.innerHTML = ids.map(function (id) {
        var have = !!ownedSet[id];
        var r = mod.getRarityKey(id);
        var path = mod.cardPath(id);
        if (have) {
            return (
                '<div class="cc-slot cc-slot--owned cc-rarity-' + r + '" data-card-id="' + id + '">' +
                '<img src="' + path + '" alt="" loading="lazy" decoding="async" fetchpriority="low" width="240" height="320">' +
                '<span class="cc-slot__ring"></span>' +
                '<span class="cc-slot__badge cc-badge--' + r + '">' + r + '</span></div>'
            );
        }
        var chanceStr = mod.formatDropChanceForDisplay ? mod.formatDropChanceForDisplay(id, 2) : '0';
        var chanceLine = trReplace('collectiblesChanceValue', { pct: chanceStr });
        var rarityName = t('collectiblesRarity_' + r);
        var cardTip = trReplace('collectiblesCardChanceTitle', { pct: chanceStr });
        var flipMicro = escapeHtml(t('collectiblesFlipMicro'));
        var tipAttr = String(cardTip).replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        return (
            '<div class="cc-slot cc-slot--locked cc-flip-root cc-rarity-' + r + '" tabindex="0" data-card-id="' + id + '" title="' + tipAttr + '">' +
            '<div class="cc-flip-inner">' +
            '<div class="cc-flip-face cc-flip-face--front">' +
            '<div class="cc-slot__placeholder" aria-hidden="true">' + CC_COLLECT_Q_SVG + '</div></div>' +
            '<div class="cc-flip-face cc-flip-face--back cc-flip-back--' + r + '">' +
            '<div class="cc-flip-back-hud" aria-hidden="true"></div>' +
            '<p class="cc-flip-chance-line">' + escapeHtml(chanceLine) + '</p>' +
            '<p class="cc-flip-rarity-name">' + escapeHtml(rarityName) + '</p>' +
            '<p class="cc-flip-micro">' + flipMicro + '</p>' +
            '</div></div>' +
            '<span class="cc-slot__ring"></span>' +
            '<span class="cc-slot__badge cc-badge--locked">' + CC_COLLECT_BADGE_SVG + '</span></div>'
        );
    }).join('');
    var prog = document.getElementById('collectibleProgressText');
    if (prog) prog.textContent = owned.length + ' / ' + mod.TOTAL;
    var bonus = document.getElementById('collectibleBonusLine');
    if (bonus) {
        bonus.textContent = trReplace('collectiblesBonusLine', { pct: String(mod.getCollectionBonusPercent(owned.length)) });
    }
    var bal = user ? (user.balance || 0) : 0;
    var packs = [
        { id: 'collectibleBoosterBtn', n: 1, labelKey: 'collectiblesBooster' },
        { id: 'collectibleBoosterBtn10', n: 10, labelKey: 'collectiblesBooster10' },
        { id: 'collectibleBoosterBtn50', n: 50, labelKey: 'collectiblesBooster50' }
    ];
    packs.forEach(function (p) {
        var b = document.getElementById(p.id);
        if (!b) return;
        b.disabled = bal < mod.BOOSTER_COST * p.n;
        var spanPrice = b.querySelector('.cc-booster-price-num');
        if (spanPrice) spanPrice.textContent = String(mod.BOOSTER_COST * p.n);
        var lab = b.querySelector('.cc-booster-label');
        if (lab) lab.textContent = t(p.labelKey);
    });
}

function restoreCollectibleBoosterLabels() {
    var mod = window.collectibleCardsModule;
    if (!mod) return;
    var packs = [
        { id: 'collectibleBoosterBtn', labelKey: 'collectiblesBooster' },
        { id: 'collectibleBoosterBtn10', labelKey: 'collectiblesBooster10' },
        { id: 'collectibleBoosterBtn50', labelKey: 'collectiblesBooster50' }
    ];
    packs.forEach(function (p) {
        var b = document.getElementById(p.id);
        if (!b) return;
        var lab = b.querySelector('.cc-booster-label');
        if (lab) lab.textContent = t(p.labelKey);
    });
}

function setCollectibleBoosterButtonsPulling() {
    document.querySelectorAll('.cc-booster-pack-btn').forEach(function (b) {
        b.disabled = true;
        var lab = b.querySelector('.cc-booster-label');
        if (lab) lab.textContent = t('collectiblesPulling');
    });
}

function closeCollectibleBatchReveal() {
    var m = document.getElementById('collectibleBatchReveal');
    if (m) {
        var panel = m.querySelector('.cc-batch-reveal-panel');
        if (panel) panel.classList.remove('cc-reveal-slam');
        m.classList.add('hidden');
    }
}

function showCollectibleBatchReveal(res, mod) {
    var m = document.getElementById('collectibleBatchReveal');
    var titleEl = document.getElementById('collectibleBatchRevealTitle');
    var summaryEl = document.getElementById('collectibleBatchRevealSummary');
    var grid = document.getElementById('collectibleBatchRevealGrid');
    if (!m || !grid || !mod || !mod.cardPath) return;
    var pulls = res.pulls || [];
    var n = pulls.length;
    if (titleEl) titleEl.textContent = trReplace('collectiblesBatchTitle', { n: String(n) });
    var s = res.summary || { newCards: 0, duplicates: 0, totalRefund: 0 };
    if (summaryEl) {
        summaryEl.textContent = trReplace('collectiblesBatchSummary', {
            newN: String(s.newCards),
            dupN: String(s.duplicates),
            coins: String(s.totalRefund)
        });
    }
    grid.innerHTML = pulls
        .map(function (p) {
            var src = escapeHtml(mod.cardPath(p.cardId));
            var badgeClass = p.duplicate ? 'cc-batch-badge cc-batch-badge--dup' : 'cc-batch-badge cc-batch-badge--new';
            var badgeText = escapeHtml(p.duplicate ? t('collectiblesBatchDup') : t('collectiblesBatchNew'));
            return (
                '<div class="cc-batch-cell">' +
                '<span class="' +
                badgeClass +
                '">' +
                badgeText +
                '</span>' +
                '<img src="' +
                src +
                '" alt="" width="72" height="96" loading="lazy" decoding="async" class="cc-batch-cell-img">' +
                '</div>'
            );
        })
        .join('');
    m.classList.remove('hidden');
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            var panel = document.querySelector('#collectibleBatchReveal .cc-batch-reveal-panel');
            if (panel) {
                panel.classList.remove('cc-reveal-slam');
                void panel.offsetWidth;
                panel.classList.add('cc-reveal-slam');
            }
        });
    });
}

function playCollectibleRevealEntrance() {
    var panel = document.querySelector('#collectibleReveal .cc-reveal-panel');
    if (!panel) return;
    panel.classList.remove('cc-reveal-slam');
    void panel.offsetWidth;
    panel.classList.add('cc-reveal-slam');
}

function closeCollectibleReveal() {
    var m = document.getElementById('collectibleReveal');
    if (m) {
        var panel = m.querySelector('.cc-reveal-panel');
        if (panel) panel.classList.remove('cc-reveal-slam');
        m.classList.add('hidden');
    }
}

function tryPullCollectibleBooster(count) {
    var mod = window.collectibleCardsModule;
    var auth = window.authModule;
    if (!mod || !auth) return;
    var user = auth.getCurrentUser();
    if (!user) {
        showLoginModal();
        return;
    }
    var n = typeof count === 'number' ? count : parseInt(count, 10);
    if (!Number.isFinite(n) || n < 1) n = 1;
    if (n > 50) n = 50;

    setCollectibleBoosterButtonsPulling();

    var finish = function () {
        restoreCollectibleBoosterLabels();
        renderCollectiblesGrid();
    };

    if (n === 1) {
        auth
            .pullCollectibleBooster(user.uid)
            .then(function (res) {
                if (!res.success) {
                    showToast(res.error || t('collectiblesOpenError'), 'error', t('tip'));
                    return;
                }
                var updated = auth.getCurrentUser();
                if (updated) updateUserUI(updated, updated);
                var img = document.getElementById('collectibleRevealImg');
                var tx = document.getElementById('collectibleRevealText');
                var m = document.getElementById('collectibleReveal');
                if (img && mod.cardPath) img.src = mod.cardPath(res.cardId);
                if (tx) {
                    tx.textContent = res.duplicate
                        ? t('collectiblesDuplicate') + ' +' + (res.refundCoins || 0)
                        : t('collectiblesNewCard');
                }
                if (m) {
                    m.classList.remove('hidden');
                    requestAnimationFrame(function () {
                        requestAnimationFrame(playCollectibleRevealEntrance);
                    });
                }
                if (res.duplicate) {
                    showToast('+' + (res.refundCoins || 0) + ' ' + (app.lang === 'en' ? 'coins' : 'монет'), 'success', t('reward'));
                } else {
                    showToast(t('collectiblesNewCard'), 'success', t('collectiblesTitle'));
                }
            })
            .catch(function () {
                showToast(t('collectiblesOpenError'), 'error', t('tip'));
            })
            .finally(finish);
        return;
    }

    if (typeof auth.pullCollectibleBoosterBatch !== 'function') {
        showToast(t('collectiblesOpenError'), 'error', t('tip'));
        finish();
        return;
    }

    auth
        .pullCollectibleBoosterBatch(user.uid, n)
        .then(function (res) {
            if (!res.success) {
                showToast(res.error || t('collectiblesOpenError'), 'error', t('tip'));
                return;
            }
            var updated = auth.getCurrentUser();
            if (updated) updateUserUI(updated, updated);
            showCollectibleBatchReveal(res, mod);
            var s = res.summary;
            if (s) {
                showToast(
                    trReplace('collectiblesBatchToast', {
                        newN: String(s.newCards),
                        dupN: String(s.duplicates),
                        coins: String(s.totalRefund)
                    }),
                    'success',
                    t('collectiblesTitle')
                );
            }
        })
        .catch(function () {
            showToast(t('collectiblesOpenError'), 'error', t('tip'));
        })
        .finally(finish);
}

// Select shop language
function selectShopLanguage(lang) {
    currentShopLanguage = lang;
    
    // Обновляем активную кнопку языка
    document.querySelectorAll('.shop-lang-btn').forEach(btn => {
        const btnLang = btn.getAttribute('data-lang');
        if (btnLang === lang) {
            btn.classList.add('border-cyan-500', 'bg-cyan-500/20');
            btn.classList.remove('border-transparent');
        } else {
            btn.classList.remove('border-cyan-500', 'bg-cyan-500/20');
            btn.classList.add('border-transparent');
        }
    });
    
    // Показываем категории после выбора языка (или если выбраны все языки)
    const categoryTabs = DOM.get('shopCategoryTabs');
    if (categoryTabs) categoryTabs.classList.remove('hidden');
    
    // Сбрасываем категорию и загружаем уроки
    currentShopCategory = 'all';
    loadShopLessons();
}

// Случайный совет для оборота карточки магазина
function getRandomShopTip() {
    const keys = ['shopTipEarn', 'shopTipFocus', 'shopTipDaily', 'shopTipFlip', 'shopTipLevel'];
    return t(keys[Math.floor(Math.random() * keys.length)]);
}

// Load shop lessons (flip-карточки + советы на обороте)
function loadShopLessons() {
    const grid = DOM.get('shopLessonsGrid');
    if (!grid || !window.shopModule) return;
    
    const user = window.authModule?.getCurrentUser();
    if (!user) return;
    
    const purchasedLessons = user.purchasedLessons || [];
    const allLessons = window.shopModule.getAllShopLessons();
    
    let filteredLessons = allLessons;
    if (currentShopLanguage !== 'all') {
        filteredLessons = allLessons.filter(lesson => lesson.layout === currentShopLanguage);
    }
    if (currentShopCategory !== 'all') {
        filteredLessons = filteredLessons.filter(lesson => {
            let lessonDifficulty = lesson.difficulty;
            if (!lessonDifficulty || lessonDifficulty === 'easy') lessonDifficulty = 'beginner';
            else if (lessonDifficulty === 'hard') lessonDifficulty = 'advanced';
            return lessonDifficulty === currentShopCategory;
        });
    }
    
    const categoryContainer = DOM.get('shopCategoryTabs');
    if (categoryContainer) {
        categoryContainer.innerHTML = '';
        const difficultyCategories = [
            { id: 'all', name: t('allCategories') },
            { id: 'beginner', name: `🌱 ${app.lang === 'ru' ? 'Начинающий' : app.lang === 'en' ? 'Beginner' : 'Початківець'}` },
            { id: 'medium', name: `⚡ ${app.lang === 'ru' ? 'Средний' : app.lang === 'en' ? 'Medium' : 'Середній'}` },
            { id: 'advanced', name: `🔥 ${app.lang === 'ru' ? 'Продвинутый' : app.lang === 'en' ? 'Advanced' : 'Просунутий'}` }
        ];
        difficultyCategories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = `shop-category-btn px-3 py-1.5 rounded-lg glass border-2 hover:border-cyan-500/50 text-sm font-medium transition-all ${cat.id === currentShopCategory ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300' : 'border-transparent'}`;
            btn.setAttribute('data-category', cat.id);
            btn.textContent = cat.name;
            btn.onclick = () => selectShopCategory(cat.id);
            categoryContainer.appendChild(btn);
        });
    }
    
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const difficultyNames = { easy: 'Легкий', medium: 'Средний', hard: 'Продвинутый' };
    const difficultyClassMap = { easy: 'shop-card-diff--easy', medium: 'shop-card-diff--medium', hard: 'shop-card-diff--hard' };
    
    filteredLessons.forEach(lesson => {
        const isPurchased = purchasedLessons.includes(lesson.id);
        const hasCoins = (user.balance || 0) >= lesson.price;
        const tip = getRandomShopTip();
        
        const wrap = document.createElement('div');
        wrap.className = 'shop-card-wrap';
        wrap.setAttribute('data-lesson-id', lesson.id);
        
        var shopVibeMeta = getLessonCardVibe(lesson, lesson.difficulty || 'easy', lesson.difficulty === 'hard' ? 'advanced' : lesson.difficulty === 'medium' ? 'medium' : 'beginner');
        var shopVibeHint = typeof t === 'function' ? t(shopVibeMeta.hintKey) : '';
        var shopVibeText = typeof t === 'function' ? t(shopVibeMeta.key) : '';
        var shopVibeTone = shopVibeMeta.tone || 'calm';
        const shopVibeLine = shopVibeText
            ? `<div class="shop-card-vibe shop-card-vibe--${shopVibeTone}" title="${escapeHtml(shopVibeHint)}">${escapeHtml(shopVibeText)}</div>`
            : '';
        var diffKey = lesson.difficulty || 'easy';
        var shopDiffClass = difficultyClassMap[diffKey] || difficultyClassMap.easy;
        var shopDiffLabel = difficultyNames[diffKey] || difficultyNames.easy;
        const frontContent = `
            <div class="shop-card-head">
                <h3 class="shop-card-title">${escapeHtml(lesson.name)}</h3>
                <div class="shop-card-corner">
                    ${isPurchased
                        ? '<span class="shop-card-owned" title="">✓</span>'
                        : '<span class="shop-card-price">' + lesson.price + ' ' + COIN_ICON_IMG + '</span>'}
                </div>
            </div>
            <p class="shop-card-blurb">${escapeHtml(lesson.description)}</p>
            <div class="shop-card-badges">
                <span class="shop-card-diff ${shopDiffClass}">${shopDiffLabel}</span>
                ${shopVibeLine}
            </div>
            ${isPurchased ? `
                <button type="button" class="shop-card-btn shop-card-btn--go shop-purchase-go" onclick="startPurchasedLesson('${lesson.id}')">${t('startLesson')}</button>
            ` : `
                <button type="button" class="shop-card-btn shop-card-btn--buy shop-purchase-btn ${hasCoins ? '' : 'shop-card-btn--disabled'}" onclick="purchaseLesson('${lesson.id}')" data-lesson-id="${lesson.id}" data-can-buy="${hasCoins}" ${hasCoins ? '' : 'disabled'}>${hasCoins ? t('buy') : t('notEnoughCoins')}</button>
            `}
        `;
        
        const backContent = `
            <div class="shop-tip-icon" aria-hidden="true">💡</div>
            <div class="shop-tip-text">${escapeHtml(tip)}</div>
            <div class="shop-card-back-actions">
                ${isPurchased ? `
                    <button type="button" class="shop-card-btn shop-card-btn--go shop-card-back-btn" onclick="startPurchasedLesson('${lesson.id}')">${t('startLesson')}</button>
                ` : `
                    <button type="button" class="shop-card-btn shop-card-btn--buy shop-card-back-btn ${hasCoins ? '' : 'shop-card-btn--disabled'}" onclick="purchaseLesson('${lesson.id}')" data-lesson-id="${lesson.id}" data-can-buy="${hasCoins}" ${hasCoins ? '' : 'disabled'}>${hasCoins ? t('buy') : t('notEnoughCoins')}</button>
                `}
            </div>
        `;
        wrap.innerHTML = `
            <div class="shop-card-inner">
                <div class="shop-card-front">${frontContent}</div>
                <div class="shop-card-back">${backContent}</div>
            </div>
        `;
        fragment.appendChild(wrap);
    });
    
    grid.appendChild(fragment);
}

// Select shop category
function selectShopCategory(category) {
    currentShopCategory = category;
    loadShopLessons();
}

// Анимация полёта карточки к блоку баланса при покупке
function animatePurchaseFly(lessonId) {
    const wrap = document.querySelector(`.shop-card-wrap[data-lesson-id="${lessonId}"]`);
    const targetEl = document.getElementById('shopFlyTarget') || document.getElementById('shopBalanceWrap');
    if (!wrap || !targetEl) return;
    
    const rect = wrap.getBoundingClientRect();
    const clone = wrap.cloneNode(true);
    const inner = clone.querySelector('.shop-card-inner');
    if (inner) inner.style.transform = 'rotateY(0deg)';
    clone.classList.add('shop-card-fly');
    clone.style.position = 'fixed';
    clone.style.left = rect.left + 'px';
    clone.style.top = rect.top + 'px';
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '9999';
    document.body.appendChild(clone);
    
    const targetRect = targetEl.getBoundingClientRect();
    const endLeft = targetRect.left + targetRect.width / 2 - rect.width / 2;
    const endTop = targetRect.top + targetRect.height / 2 - rect.height / 2;
    
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            clone.classList.add('shop-fly-anim');
            clone.style.left = endLeft + 'px';
            clone.style.top = endTop + 'px';
            clone.style.transform = 'scale(0.2)';
            clone.style.opacity = '0';
        });
    });
    
    setTimeout(() => {
        clone.remove();
        const updatedUser = window.authModule?.getCurrentUser();
        if (updatedUser) updateUserUI(updatedUser, updatedUser);
    loadShopLessons();
    }, 650);
}

// Purchase lesson
async function purchaseLesson(lessonId) {
    const user = window.authModule?.getCurrentUser();
    if (!user) {
        showLoginModal();
        return;
    }
    
    const lesson = window.shopModule?.getLessonById(lessonId);
    if (lesson && (user.balance || 0) < lesson.price) {
        playDeniedMoneySound();
        showToast(t('tipInsufficientCoins'), 'info', t('tip'));
        return;
    }
    
    const result = await window.authModule.purchaseLesson(user.uid, lessonId);
    
    if (result.success) {
        if (app.soundEnabled && audioBuyShop) {
            audioBuyShop.currentTime = 0;
            audioBuyShop.play().catch(() => {});
        }
        showToast(t('lessonPurchased'), 'success', t('shop'));
        if (document.getElementById('shopScreen') && !document.getElementById('shopScreen').classList.contains('hidden')) {
            animatePurchaseFly(lessonId);
        } else {
        const updatedUser = window.authModule.getCurrentUser();
        updateUserUI(updatedUser, updatedUser);
        loadShopLessons();
        }
    } else {
        if (result.error && (result.error === 'Недостаточно монет' || result.error.indexOf('монет') !== -1)) {
            playDeniedMoneySound();
        }
        showToast(result.error || t('purchaseError'), 'error', app.lang === 'ru' ? 'Ошибка' : app.lang === 'en' ? 'Error' : 'Помилка');
    }
}

function playDeniedMoneySound() {
    if (!app.soundEnabled) return;
    try {
        var s = audioDeniedMoney ? audioDeniedMoney.cloneNode() : new Audio(soundAssetUrl('assets/sounds/denied_money.ogg'));
        s.volume = SFX_VOLUME;
        s.currentTime = 0;
        s.play().catch(function() {});
    } catch (e) {}
}

function playTelegramSound() {
    if (!app.soundEnabled || !audioOpenTelegram) return;
    audioOpenTelegram.currentTime = 0;
    audioOpenTelegram.play().catch(() => {});
}

function playMenuClickSound() {
    if (!app.soundEnabled) return;
    var num = Math.random() < 0.5 ? '0' : '1';
    var s = new Audio(soundAssetUrl('assets/sounds/click_menu_' + num + '.ogg'));
    s.volume = SFX_VOLUME;
    s.play().catch(function () {});
}

const SITE_RATING_STORAGE_KEY = 'zoobastiks_site_rating';

function initSiteRating() {
    const wrap = document.getElementById('siteRatingStars');
    if (!wrap) return;
    const stars = wrap.querySelectorAll('.site-star');
    const container = wrap.closest('.site-rating-wrap');
    if (!container || !stars.length) return;

    function updateStars(value) {
        const v = parseInt(value, 10) || 0;
        container.setAttribute('data-rating', v);
        stars.forEach((star, i) => {
            if (i < v) star.classList.add('active');
            else star.classList.remove('active');
        });
    }

    const saved = parseInt(localStorage.getItem(SITE_RATING_STORAGE_KEY), 10);
    if (saved >= 1 && saved <= 5) updateStars(saved);

    stars.forEach((star) => {
        const rating = parseInt(star.getAttribute('data-rating'), 10);
        star.addEventListener('mouseenter', function () {
            stars.forEach((s, i) => {
                if (i < rating) s.classList.add('hover');
                else s.classList.remove('hover');
            });
        });
        star.addEventListener('mouseleave', function () {
            stars.forEach((s) => s.classList.remove('hover'));
        });
        star.addEventListener('click', function () {
            localStorage.setItem(SITE_RATING_STORAGE_KEY, String(rating));
            updateStars(rating);
            if (app.soundEnabled && audioFeedback) {
                audioFeedback.currentTime = 0;
                audioFeedback.play().catch(() => {});
            }
            const msg = app.lang === 'en' ? t('thanksForRating') : t('thanksForRating');
            showToast(msg, 'success', '⭐');
        });
    });
}

// Start purchased lesson
function startPurchasedLesson(lessonId) {
    if (!window.shopModule) return;
    
    const lesson = window.shopModule.getLessonById(lessonId);
    if (!lesson) {
        showToast('Урок не найден', 'error', 'Ошибка');
        return;
    }
    
    // Определяем уровень сложности
    let level = 'beginner';
    if (lesson.difficulty === 'hard') level = 'advanced';
    else if (lesson.difficulty === 'medium') level = 'medium';
    
    // Создаём объект урока для системы
    const lessonObj = {
        id: lesson.id,
        name: lesson.name,
        description: lesson.description,
        layout: lesson.layout,
        text: lesson.text,
        difficulty: lesson.difficulty,
        level: level,
        key: `shop_lesson_${lesson.id}`,
        isShopLesson: true
    };
    
    startPractice(lesson.text, 'lesson', lessonObj);
}

window.applySessionXpAndLevelReward = applySessionXpAndLevelReward;
window.showLevelUpSequence = showLevelUpSequence;
window.renderLevelBlock = renderLevelBlock;
window.updateUserUI = updateUserUI;
window.updateGuestPromisedHeader = updateGuestPromisedHeader;

