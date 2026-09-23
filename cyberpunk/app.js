// NEURAL TYPER - Main Application
const app = {
    currentMode: 'home',
    currentText: '',
    currentPosition: 0,
    startTime: null,
    errors: 0,
    isPaused: false,
    soundEnabled: true,
    theme: 'dark',
    lang: 'ru',
    audioPreset: 'full', // 'full' | 'office'
    timerInterval: null,
    speedTestLimit: 60,
    lessons: {
        beginner: [
            { id: 1, name: 'Домашний ряд', text: 'ааа ооо еее ввв ааа ооо еее ввв фыва олдж', difficulty: 'Легко' },
            { id: 2, name: 'Верхний ряд', text: 'ййй ццц ууу ккк енгш щзхъ йцукен', difficulty: 'Легко' },
            { id: 3, name: 'Нижний ряд', text: 'ззз ххх ъъъ ячсмитьбю ячсм', difficulty: 'Легко' }
        ],
        medium: [
            { id: 4, name: 'Слова', text: 'дом кот мир лес вода небо земля город стол окно дверь книга', difficulty: 'Средне' },
            { id: 5, name: 'Фразы', text: 'быстрая печать это навык который можно развить с практикой', difficulty: 'Средне' }
        ],
        advanced: [
            { id: 6, name: 'Код', text: 'function hello() { return "world"; } const x = 42;', difficulty: 'Сложно' },
            { id: 7, name: 'Длинный текст', text: 'В киберпанк мире технологии развились до невероятных высот и нейронные интерфейсы стали реальностью', difficulty: 'Сложно' }
        ]
    },
    currentLessonId: null,
    speedWords: ['как', 'так', 'все', 'это', 'был', 'она', 'они', 'мой', 'его', 'что', 'год', 'дом', 'день', 'раз', 'рука', 'нога', 'вода', 'небо', 'земля', 'город']
};

let lessonsFilterDifficulty = 'all';
let lessonsFilterType = 'all';

const translations = {
    ru: {
        training: 'ОБУЧЕНИЕ', trainingDesc: 'Программа нейро-адаптации', trainingStats: '46 модулей',
        speedTest: 'ТЕСТ СКОРОСТИ', speedTestDesc: 'Анализ производительности', speedTestStats: '60 секунд',
        freeMode: 'СВОБОДНЫЙ РЕЖИМ', freeModeDesc: 'Кастомная тренировка', freeModeStats: 'Без ограничений',
        multiplayer: 'МУЛЬТИПЛЕЕР', multiplayerDesc: 'Нейро-дуэль онлайн', multiplayerStats: 'PvP режим',
        statsTitle: 'СТАТИСТИКА СИСТЕМЫ', speed: 'СКОРОСТЬ', speedUnit: 'зн/мин',
        accuracy: 'ТОЧНОСТЬ', accuracyUnit: '%', modules: 'МОДУЛИ', modulesUnit: 'пройдено',
        time: 'ВРЕМЯ', timeUnit: 'минут', exit: 'ВЫХОД', restart: 'РЕСТАРТ',
        close: 'ЗАКРЫТЬ', repeat: 'ПОВТОРИТЬ', back: 'НАЗАД', lessonsTitle: 'МОДУЛИ ОБУЧЕНИЯ',
        themeChanged: 'Тема изменена', soundOn: 'Звук включен', soundOff: 'Звук выключен',
        presetFull: 'Полный киберпанк', presetOffice: 'Офис',
        langChanged: 'Язык изменен', systemReady: 'Система инициализирована', mpSoon: 'Мультиплеер запускается на основном сайте',
        hubIdle: 'HUB · IDLE', modeLessons: 'MODE · TRAINING', modeSpeed: 'MODE · SPEED TEST',
        modeFree: 'MODE · FREE TYPING', modeLesson: 'MODE · LESSON'
    },
    en: {
        training: 'TRAINING', trainingDesc: 'Neural adaptation program', trainingStats: '46 modules',
        speedTest: 'SPEED TEST', speedTestDesc: 'Performance analysis', speedTestStats: '60 seconds',
        freeMode: 'FREE MODE', freeModeDesc: 'Custom training', freeModeStats: 'No limits',
        multiplayer: 'MULTIPLAYER', multiplayerDesc: 'Neural duel online', multiplayerStats: 'PvP mode',
        statsTitle: 'SYSTEM STATISTICS', speed: 'SPEED', speedUnit: 'cpm',
        accuracy: 'ACCURACY', accuracyUnit: '%', modules: 'MODULES', modulesUnit: 'completed',
        time: 'TIME', timeUnit: 'minutes', exit: 'EXIT', restart: 'RESTART',
        close: 'CLOSE', repeat: 'REPEAT', back: 'BACK', lessonsTitle: 'TRAINING MODULES',
        themeChanged: 'Theme changed', soundOn: 'Sound enabled', soundOff: 'Sound muted',
        presetFull: 'Full cyberpunk', presetOffice: 'Office',
        langChanged: 'Language changed', systemReady: 'System initialized', mpSoon: 'Multiplayer runs on the main site',
        hubIdle: 'HUB · IDLE', modeLessons: 'MODE · TRAINING', modeSpeed: 'MODE · SPEED TEST',
        modeFree: 'MODE · FREE TYPING', modeLesson: 'MODE · LESSON'
    }
};

function setModeLabel(key) {
    const el = document.getElementById('modeLabel');
    if (!el) return;
    const t = translations[app.lang] || translations.ru;
    el.textContent = t[key] || '';
}

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
}

function showHome() {
    console.log('showHome called');
    hideAllScreens();
    document.getElementById('homeScreen').classList.add('active');
    app.currentMode = 'home';
    setModeLabel('hubIdle');
}

function showLessons() {
    console.log('showLessons called');
    hideAllScreens();
    const screen = document.getElementById('lessonsScreen');
    console.log('lessonsScreen element:', screen);
    if (screen) {
        screen.classList.add('active');
        app.currentMode = 'lessons';
        renderLessons();
        setModeLabel('modeLessons');
    } else {
        console.error('lessonsScreen not found!');
    }
}

function showSpeedTest() {
    console.log('showSpeedTest called');
    const text = generateSpeedTest();
    console.log('Generated text:', text);
    startPractice(text, 'speedtest');
    setModeLabel('modeSpeed');
}

function showFreeMode() {
    console.log('showFreeMode called');
    const modal = document.getElementById('freeModeModal');
    const textarea = document.getElementById('freeModeTextarea');
    if (!modal || !textarea) return;
    textarea.value = '';
    updateFreeModeChars();
    modal.classList.add('active');
}

function showMultiplayer() {
    console.log('showMultiplayer called');
    // Переход на основной сайт с полноценным мультиплеером
    window.location.href = 'https://zoobastik.me/';
}

function exitPractice() {
    if (app.timerInterval) clearInterval(app.timerInterval);
    showHome();
}

function restartPractice() {
    if (app.currentMode === 'speedtest') {
        const text = generateSpeedTest();
        startPractice(text, 'speedtest');
        setModeLabel('modeSpeed');
    } else {
        startPractice(app.currentText, app.currentMode);
    }
}

function closeResults() {
    document.getElementById('resultsModal').classList.remove('active');
    exitPractice();
}

function repeatPractice() {
    closeResults();
    if (app.currentMode === 'speedtest') {
        showSpeedTest();
    } else {
        restartPractice();
    }
}

function closeFreeModeModal() {
    const modal = document.getElementById('freeModeModal');
    if (modal) modal.classList.remove('active');
}

function startFreeModeFromModal() {
    const textarea = document.getElementById('freeModeTextarea');
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) {
        showNotification('Введите текст для тренировки', 'warning');
        return;
    }
    closeFreeModeModal();
    startPractice(text, 'free');
    setModeLabel('modeFree');
}

function updateFreeModeChars() {
    const textarea = document.getElementById('freeModeTextarea');
    const counter = document.getElementById('freeModeChars');
    if (!textarea || !counter) return;
    counter.textContent = textarea.value.length;
}

function applyFreeModePreset(preset) {
    const textarea = document.getElementById('freeModeTextarea');
    if (!textarea) return;
    let text = '';
    if (preset === 'motivation') {
        text = 'Каждый день по несколько минут печати приближает тебя к скорости, о которой ты раньше только мечтал. Главное - не идеальный результат, а регулярное движение вперёд.';
    } else if (preset === 'code') {
        text = 'function neuralTyping(speed, accuracy) { const focus = true; const practice = speed * accuracy; return focus && practice > 0 ? "upgrade" : "idle"; }';
    } else if (preset === 'story') {
        text = 'В неоновом тумане мегаполиса клавиатура щёлкает как сердце системы. Каждый символ - импульс по проводам, каждое слово - новый пакет данных в бесконечной сети.';
    }
    textarea.value = text;
    updateFreeModeChars();
    textarea.focus();
    textarea.setSelectionRange(text.length, text.length);
}

function startPractice(text, mode) {
    console.log('startPractice called with mode:', mode);
    if (mode !== 'speedtest') setConsecutiveSpeedtests(0);
    hideAllScreens();
    document.getElementById('practiceScreen').classList.add('active');
    app.currentMode = mode;
    app.currentText = text;
    app.currentPosition = 0;
    app.startTime = Date.now();
    app.errors = 0;
    app.isPaused = false;
    document.getElementById('sessionId').textContent = String(Date.now()).slice(-3);
    const wrapper = document.getElementById('textDisplayWrapper');
    if (wrapper) {
        app.speedTestWordIndex = 0;
        renderSpeedTestLine();
    } else {
        renderText();
    }
    updateStats();
    startTimer();
    if (mode === 'lesson') setModeLabel('modeLesson');
}

function renderText() {
    if (app.currentMode === 'speedtest' || app.currentMode === 'lesson' || app.currentMode === 'free') return;
    const display = document.getElementById('textDisplay');
    let html = '';
    for (let i = 0; i < app.currentText.length; i++) {
        const char = app.currentText[i];
        let className = i < app.currentPosition ? 'char-typed' : i === app.currentPosition ? 'char-current' : 'char-future';
        const displayChar = char === ' ' ? '&nbsp;' : escapeHtml(char);
        html += `<span class="${className}">${displayChar}</span>`;
    }
    display.innerHTML = html;
    showNextKey();
    const currentSpan = display.querySelector('.char-current');
    if (currentSpan && display.scrollWidth > display.clientWidth) {
        const spanRect = currentSpan.getBoundingClientRect();
        const containerRect = display.getBoundingClientRect();
        if (spanRect.right > containerRect.right || spanRect.left < containerRect.left) {
            const centerOffset = currentSpan.offsetLeft - display.clientWidth / 2 + currentSpan.offsetWidth / 2;
            display.scrollTo({ left: Math.max(0, centerOffset), behavior: 'smooth' });
        }
    }
}

const TEXT_LINE_GAP = 12;

function applyPresetUI() {
    const icon = document.getElementById('presetIcon');
    const label = document.getElementById('presetLabel');
    if (!icon || !label) return;
    if (app.audioPreset === 'full') {
        icon.textContent = '◈';
        label.textContent = app.lang === 'en' ? 'CYBER FX' : 'КИБЕР FX';
    } else {
        icon.textContent = '▢';
        label.textContent = app.lang === 'en' ? 'OFFICE' : 'ОФИС';
    }
}

function renderSpeedTestLine() {
    const line = document.getElementById('text-line');
    if (!line) return;
    app.speedTestTranslateX = 0;
    const words = app.currentText.trim().split(/\s+/).filter(Boolean);
    line.innerHTML = words.map((w, i) => {
        const span = document.createElement('span');
        span.textContent = w;
        if (i === 0) span.classList.add('current');
        return span;
    }).map(s => s.outerHTML).join('');
    line.style.transform = 'translateX(0)';
}

function nextWord() {
    const line = document.getElementById('text-line');
    const words = line ? line.querySelectorAll('span') : [];
    const index = app.speedTestWordIndex || 0;
    if (index >= words.length) return;
    words[index].classList.add('done');
    words[index].classList.remove('current');
    const currentTx = app.speedTestTranslateX != null ? app.speedTestTranslateX : 0;
    const shift = words[index].offsetWidth + TEXT_LINE_GAP;
    app.speedTestTranslateX = currentTx - shift;
    line.style.transform = `translateX(${app.speedTestTranslateX}px)`;
    if (index + 1 < words.length) {
        words[index + 1].classList.add('current');
    }
    app.speedTestWordIndex = index + 1;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function handleKeyPress(e) {
    // Глобальные хоткеи для переключения режимов на главном экране
    if (app.currentMode === 'home') {
        if (e.key === '1') { e.preventDefault(); showLessons(); return; }
        if (e.key === '2') { e.preventDefault(); showSpeedTest(); return; }
        if (e.key === '3') { e.preventDefault(); showFreeMode(); return; }
        if (e.key === '4') { e.preventDefault(); showMultiplayer(); return; }
        if (e.key.toLowerCase() === 'l') { e.preventDefault(); showLessons(); return; }
        if (e.key.toLowerCase() === 's') { e.preventDefault(); showSpeedTest(); return; }
        if (e.key.toLowerCase() === 'f') { e.preventDefault(); showFreeMode(); return; }
    }

    if (app.currentMode !== 'speedtest' && app.currentMode !== 'free' && app.currentMode !== 'lesson') return;
    if (app.isPaused) return;
    if (e.key.length > 1 && e.key !== 'Backspace') return;
    e.preventDefault();
    
    if (e.key === 'Backspace') {
        if (app.currentPosition > 0) {
            app.currentPosition--;
            renderText();
            updateStats();
        }
        return;
    }
    
    const expectedChar = app.currentText[app.currentPosition];
    if (e.key === expectedChar) {
        app.currentPosition++;
        playSound('correct');
        highlightKey(e.key);
        if ((app.currentMode === 'speedtest' || app.currentMode === 'lesson' || app.currentMode === 'free')) {
            const justTyped = app.currentText[app.currentPosition - 1];
            if (justTyped === ' ' || app.currentPosition === app.currentText.length) {
                nextWord();
            }
        }
    } else {
        app.errors++;
        playSound('error');
    }
    
    renderText();
    updateStats();
    
    if (app.currentPosition >= app.currentText.length) {
        finishPractice();
    }
}

function updateStats() {
    const elapsed = (Date.now() - app.startTime) / 1000;
    const minutes = elapsed / 60;
    const speed = minutes > 0 ? Math.round(app.currentPosition / minutes) : 0;
    document.getElementById('currentSpeed').textContent = speed;
    const totalAttempts = app.currentPosition + app.errors;
    const accuracy = totalAttempts > 0 ? Math.round((app.currentPosition / totalAttempts) * 100) : 100;
    document.getElementById('currentAccuracy').textContent = accuracy;
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    document.getElementById('currentTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    const progress = Math.round((app.currentPosition / app.currentText.length) * 100);
    document.getElementById('currentProgress').textContent = progress;
    document.getElementById('progressBar').style.width = progress + '%';
}

function startTimer() {
    app.timerInterval = setInterval(() => {
        if (app.isPaused) return;
        updateStats();
        if (app.currentMode === 'speedtest') {
            const elapsed = (Date.now() - app.startTime) / 1000;
            if (elapsed >= app.speedTestLimit) {
                finishPractice();
            }
        }
    }, 100);
}

function finishPractice() {
    if (app.timerInterval) clearInterval(app.timerInterval);
    const elapsed = (Date.now() - app.startTime) / 1000;
    const minutes = elapsed / 60;
    const speed = Math.round(app.currentPosition / minutes);
    const totalAttempts = app.currentPosition + app.errors;
    const accuracy = Math.round((app.currentPosition / totalAttempts) * 100);
    if (app.currentMode === 'speedtest') {
        const n = getConsecutiveSpeedtests() + 1;
        setConsecutiveSpeedtests(n);
    }
    saveStats(speed, accuracy, elapsed);
    showResults(speed, accuracy, elapsed, app.errors);
}

function showResults(speed, accuracy, time, errors) {
    document.getElementById('resultSpeed').textContent = speed;
    document.getElementById('resultAccuracy').textContent = accuracy;
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    document.getElementById('resultTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    document.getElementById('resultErrors').textContent = errors;
    document.getElementById('resultsModal').classList.add('active');
    playSound('victory');
}

function renderLessons() {
    console.log('renderLessons called');
    const container = document.getElementById('lessonsList');
    console.log('lessonsList container:', container);
    container.innerHTML = '';
    const stats = JSON.parse(localStorage.getItem('neuralTyperStats') || '{}');
    const completedIds = new Set(stats.completedLessonIds || []);
    Object.entries(app.lessons).forEach(([levelKey, lessons]) => {
        lessons.forEach(lesson => {
            const type = getLessonType(lesson);
            if (lessonsFilterDifficulty !== 'all' && levelKey !== lessonsFilterDifficulty) return;
            if (lessonsFilterType !== 'all' && type !== lessonsFilterType) return;
            const card = document.createElement('div');
            const isCompleted = completedIds.has(lesson.id);
            card.className = 'lesson-card' + (isCompleted ? ' completed' : '');
            card.onclick = () => {
                app.currentLessonId = lesson.id;
                startPractice(lesson.text, 'lesson');
            };
            const previewText = lesson.text.slice(0, 120).replace(/\s+/g, ' ').trim();
            card.innerHTML = `
                <div class="lesson-title">${lesson.name}</div>
                <div class="lesson-desc">${lesson.difficulty}</div>
                <div class="lesson-meta">
                    <span class="lesson-type-badge">${type === 'letters' ? 'Буквы' : type === 'words' ? 'Слова' : 'Текст'}</span>
                    <span>${lesson.text.length} символов</span>
                </div>
                <div class="lesson-stats">
                    <span>ID: ${lesson.id}</span>
                    <span>Язык: RU</span>
                </div>
                <div class="lesson-preview">${escapeHtml(previewText)}${lesson.text.length > previewText.length ? '…' : ''}</div>
            `;
            container.appendChild(card);
        });
    });
    console.log('Lessons rendered, total cards:', container.children.length);
}

function getLessonType(lesson) {
    const text = (lesson.text || '').trim();
    if (!text) return 'text';
    const words = text.split(/\s+/);
    const hasSentencePunctuation = /[.!?]/.test(text);
    if (!hasSentencePunctuation && words.length <= 3) return 'letters';
    if (!hasSentencePunctuation && words.length <= 10) return 'words';
    return 'text';
}

function renderKeyboard() {
    const container = document.getElementById('keyboardContainer');
    const layout = [
        ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ'],
        ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
        ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю']
    ];
    const keyboard = document.createElement('div');
    keyboard.className = 'keyboard';
    layout.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        row.forEach(key => {
            const keyDiv = document.createElement('div');
            keyDiv.className = 'key';
            keyDiv.textContent = key;
            keyDiv.dataset.key = key;
            rowDiv.appendChild(keyDiv);
        });
        keyboard.appendChild(rowDiv);
    });
    const spaceRow = document.createElement('div');
    spaceRow.className = 'keyboard-row';
    const spaceKey = document.createElement('div');
    spaceKey.className = 'key space';
    spaceKey.textContent = 'SPACE';
    spaceKey.dataset.key = ' ';
    spaceRow.appendChild(spaceKey);
    keyboard.appendChild(spaceRow);
    container.innerHTML = '';
    container.appendChild(keyboard);
}

function highlightKey(key) {
    document.querySelectorAll('.key.highlight, .key.active').forEach(k => k.classList.remove('highlight', 'active'));
    const keyEl = document.querySelector(`[data-key="${key}"]`);
    if (keyEl) {
        keyEl.classList.add('active');
        setTimeout(() => keyEl.classList.remove('active'), 200);
    }
}

function showNextKey() {
    document.querySelectorAll('.key.highlight').forEach(k => k.classList.remove('highlight'));
    if (app.currentPosition < app.currentText.length) {
        const nextChar = app.currentText[app.currentPosition];
        const keyEl = document.querySelector(`[data-key="${nextChar}"]`);
        if (keyEl) keyEl.classList.add('highlight');
    }
}

function generateSpeedTest() {
    const words = [];
    for (let i = 0; i < 50; i++) {
        words.push(app.speedWords[Math.floor(Math.random() * app.speedWords.length)]);
    }
    return words.join(' ');
}

function toggleTheme() {
    app.theme = app.theme === 'dark' ? 'light' : 'dark';
    document.body.style.filter = app.theme === 'light' ? 'invert(1) hue-rotate(180deg)' : 'none';
    showNotification(translations[app.lang].themeChanged, 'info');
}

function toggleSound() {
    app.soundEnabled = !app.soundEnabled;
    const icon = document.querySelector('#soundToggle .icon');
    icon.textContent = app.soundEnabled ? '♪' : '🔇';
    showNotification(app.soundEnabled ? translations[app.lang].soundOn : translations[app.lang].soundOff, 'info');
}

function togglePreset() {
    app.audioPreset = app.audioPreset === 'full' ? 'office' : 'full';
    localStorage.setItem('neuralTyperPreset', app.audioPreset);
    const t = translations[app.lang];
    showNotification(app.audioPreset === 'full' ? t.presetFull : t.presetOffice, 'info');
    applyPresetUI();
}

function toggleLang() {
    app.lang = app.lang === 'ru' ? 'en' : 'ru';
    document.getElementById('currentLang').textContent = app.lang.toUpperCase();
    updateLanguage();
    showNotification(translations[app.lang].langChanged, 'info');
    applyPresetUI();
}

function updateLanguage() {
    const t = translations[app.lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });
}

function playSound(type) {
    if (!app.soundEnabled) return;
    const vol = app.audioPreset === 'office' ? 0.35 : 1;
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        if (type === 'correct') {
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.1 * vol;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.05);
        } else if (type === 'error') {
            oscillator.frequency.value = 200;
            gainNode.gain.value = 0.15 * vol;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } else if (type === 'victory') {
            [800, 1000, 1200].forEach((freq, i) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.connect(gain);
                gain.connect(audioContext.destination);
                osc.frequency.value = freq;
                gain.gain.value = 0.1 * vol;
                osc.start(audioContext.currentTime + i * 0.1);
                osc.stop(audioContext.currentTime + i * 0.1 + 0.2);
            });
        }
    } catch (e) {
        console.log('Audio not supported');
    }
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.5s ease reverse';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

const ACHIEVEMENTS = [
    { id: 'first_lesson', titleRu: 'Первый модуль', titleEn: 'First module', check: (s) => (s.completedLessonIds || []).length >= 1 },
    { id: 'five_lessons', titleRu: 'Пять модулей', titleEn: 'Five modules', check: (s) => (s.completedLessonIds || []).length >= 5 },
    { id: 'speed_100', titleRu: 'Скорость 100+', titleEn: 'Speed 100+', check: (s) => (s.bestSpeed || 0) >= 100 },
    { id: 'three_speedtests', titleRu: 'Три спидтеста подряд', titleEn: 'Three speedtests in a row', check: () => false },
    { id: 'ten_minutes', titleRu: '10 минут практики', titleEn: '10 minutes practice', check: (s) => (s.totalTimeSeconds || 0) >= 600 }
];

function getUnlockedAchievements() {
    try {
        const raw = localStorage.getItem('neuralTyperAchievements');
        return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
}

function unlockAchievement(id) {
    const unlocked = getUnlockedAchievements();
    if (unlocked.includes(id)) return false;
    unlocked.push(id);
    localStorage.setItem('neuralTyperAchievements', JSON.stringify(unlocked));
    return true;
}

function showAchievementToast(achievement) {
    const container = document.getElementById('notifications');
    if (!container) return;
    const t = app.lang === 'en' ? achievement.titleEn : achievement.titleRu;
    const el = document.createElement('div');
    el.className = 'notification achievement-toast';
    el.innerHTML = `<span class="achievement-toast-icon">★</span><span class="achievement-toast-title">${escapeHtml(t)}</span>`;
    container.appendChild(el);
    setTimeout(() => {
        el.style.animation = 'slideInRight 0.5s ease reverse';
        setTimeout(() => el.remove(), 500);
    }, 3500);
}

function getConsecutiveSpeedtests() {
    return parseInt(localStorage.getItem('neuralTyperConsecutiveSpeedtests') || '0', 10);
}

function setConsecutiveSpeedtests(n) {
    localStorage.setItem('neuralTyperConsecutiveSpeedtests', String(n));
}

function checkAchievements(stats, options = {}) {
    const unlocked = getUnlockedAchievements();
    const justUnlocked = [];
    for (const a of ACHIEVEMENTS) {
        if (unlocked.includes(a.id)) continue;
        const ok = a.id === 'three_speedtests' ? (options.consecutiveSpeedtests >= 3) : a.check(stats);
        if (ok && unlockAchievement(a.id)) justUnlocked.push(a);
    }
    justUnlocked.forEach(a => showAchievementToast(a));
    if (options.consecutiveSpeedtests >= 3) setConsecutiveSpeedtests(0);
}

function saveStats(speed, accuracy, time) {
    const stats = JSON.parse(localStorage.getItem('neuralTyperStats') || '{}');
    if (!stats.bestSpeed || speed > stats.bestSpeed) stats.bestSpeed = speed;
    if (!stats.bestAccuracy || accuracy > stats.bestAccuracy) stats.bestAccuracy = accuracy;
    const addSeconds = Math.round(time);
    stats.totalTimeSeconds = (stats.totalTimeSeconds || 0) + addSeconds;
    stats.sessions = (stats.sessions || 0) + 1;
    stats.totalAccuracy = (stats.totalAccuracy || 0) + accuracy;
    stats.avgAccuracy = Math.round(stats.totalAccuracy / stats.sessions);
    if (app.currentMode === 'lesson' && app.currentLessonId != null) {
        const set = new Set(stats.completedLessonIds || []);
        set.add(app.currentLessonId);
        stats.completedLessonIds = Array.from(set);
        stats.completedLessons = stats.completedLessonIds.length;
    }
    localStorage.setItem('neuralTyperStats', JSON.stringify(stats));
    loadStats();
    checkAchievements(stats, { consecutiveSpeedtests: getConsecutiveSpeedtests() });
}

function loadStats() {
    const stats = JSON.parse(localStorage.getItem('neuralTyperStats') || '{}');
    document.getElementById('bestSpeed').textContent = stats.bestSpeed || 0;
    document.getElementById('avgAccuracy').textContent = stats.avgAccuracy || 0;
    document.getElementById('completedLessons').textContent = stats.completedLessons || 0;
    const totalSec = stats.totalTimeSeconds || 0;
    const totalMin = Math.floor(totalSec / 60);
    const hours = Math.floor(totalMin / 60);
    let timeText;
    if (hours > 0) {
        timeText = hours + (app.lang === 'en' ? 'h' : 'ч');
    } else {
        timeText = totalMin + (app.lang === 'en' ? 'm' : 'м');
    }
    document.getElementById('totalTime').textContent = timeText;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    
    app.audioPreset = localStorage.getItem('neuralTyperPreset') || 'full';
    applyPresetUI();
    
    // Header buttons
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('soundToggle')?.addEventListener('click', toggleSound);
    document.getElementById('presetToggle')?.addEventListener('click', togglePreset);
    document.getElementById('langToggle')?.addEventListener('click', toggleLang);
    
    // Mode cards
    const modeCards = document.querySelectorAll('.mode-card');
    console.log('Found mode cards:', modeCards.length);
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.getAttribute('data-mode');
            console.log('Clicked mode:', mode);
            if (mode === 'lessons') showLessons();
            else if (mode === 'speedtest') showSpeedTest();
            else if (mode === 'free') showFreeMode();
            else if (mode === 'multiplayer') showMultiplayer();
        });
    });
    
    // Practice buttons
    document.getElementById('exitBtn')?.addEventListener('click', exitPractice);
    document.getElementById('restartBtn')?.addEventListener('click', restartPractice);
    document.getElementById('backBtn')?.addEventListener('click', showHome);
    
    // Results buttons
    document.getElementById('closeResultsBtn')?.addEventListener('click', closeResults);
    document.getElementById('repeatBtn')?.addEventListener('click', repeatPractice);
    
    // Keyboard
    document.addEventListener('keydown', handleKeyPress);
    
    // Initialize
    loadStats();
    renderKeyboard();
    updateLanguage();
    showNotification('Система инициализирована', 'success');

    // Free mode modal bindings
    document.getElementById('freeModeCancelBtn')?.addEventListener('click', closeFreeModeModal);
    document.getElementById('freeModeStartBtn')?.addEventListener('click', startFreeModeFromModal);
    document.getElementById('freeModeTextarea')?.addEventListener('input', updateFreeModeChars);
    document.querySelectorAll('.free-mode-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.getAttribute('data-preset');
            applyFreeModePreset(preset);
        });
    });

    // Lessons filters
    document.querySelectorAll('.lessons-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const value = btn.getAttribute('data-difficulty');
            lessonsFilterDifficulty = value || 'all';
            document.querySelectorAll('.lessons-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderLessons();
        });
    });
    document.querySelectorAll('.lessons-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const value = btn.getAttribute('data-type');
            lessonsFilterType = value || 'all';
            document.querySelectorAll('.lessons-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderLessons();
        });
    });
    
    console.log('Initialization complete');
});

