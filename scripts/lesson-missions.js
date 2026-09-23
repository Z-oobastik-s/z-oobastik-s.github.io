/**
 * Игровые «операции» для уроков: короткий сленг, без простыней текста.
 * RU / EN / UA - под игроков ~12–30.
 */
(function (global) {
    'use strict';

    function normLang(lang) {
        if (lang === 'en') return 'en';
        if (lang === 'ua' || lang === 'uk') return 'ua';
        return 'ru';
    }

    function tierFromLevel(levelKey) {
        if (levelKey === 'medium') return 'medium';
        if (levelKey === 'advanced') return 'advanced';
        return 'beginner';
    }

    function storageKey(lesson, levelKey) {
        if (lesson && lesson.isShopLesson) return 'shop_lesson_' + lesson.id;
        return 'lesson_' + levelKey + '_' + lesson.id;
    }

    function poolIndex(seed, len) {
        if (!len) return 0;
        var h = 0;
        var s = String(seed);
        for (var i = 0; i < s.length; i++) {
            h = ((h << 5) - h + s.charCodeAt(i)) | 0;
        }
        return Math.abs(h) % len;
    }

    function opCode(lesson, levelKey) {
        if (lesson && lesson.isShopLesson) {
            var sid = String(lesson.id);
            var dig = sid.replace(/\D/g, '');
            var num = dig.length ? parseInt(dig.slice(-3), 10) : (poolIndex('sid_' + sid, 900) + 1);
            if (!num || num < 0) num = 1;
            return 'OP-P-' + String(num).padStart(3, '0');
        }
        var letter = levelKey === 'medium' ? 'M' : levelKey === 'advanced' ? 'A' : 'B';
        return 'OP-' + letter + '-' + String(lesson.id).padStart(3, '0');
    }

    /** Пулы брифингов (что сейчас делаем) */
    var BRIEF = {
        beginner: {
            ru: [
                'База: калибруй ввод, без паники - только ритм.',
                'Первый заход в сеть. Не тильтуй, это треня.',
                'Стабилизируй канал: руки chill, мозг focus.',
                'Тапай уверенно, как будто от этого зависит твой ранг (и зависит).',
                'Миссия на минималках: чистый ввод, zero drama.',
                'Гонка не со временем - с кривым нажатием. Лови букву.',
                'Ставим фундамент. Потом разгонимся, щас аккуратно.',
                'Нулевой лаг между пальцами и клавой - цель.',
                'Тач-тип как прокачка скилла: шаг за шагом.',
                'Мини-IQ тест для моторики - докажи, что ты не bot.',
                'Разогрев перед хайлайтом. Без импульса.',
                'Чилл, но пальцы в наушниках с музыкой дисциплины.',
                'Тренируем muscle memory - потом полетит само.',
                'Лайт-режим, хардовый фокус.',
                'Пальцы = твой squad. Синхрон или провал.',
                'Микро-задание: без рандомных мисскликов.',
                'Старт цепи операций. Не рви её.',
                'Канал открыт - не заспамь его ошибками.'
            ],
            en: [
                'Lock in. Home row = spawn point.',
                'Warm-up run - no throwing, just clean taps.',
                'Touch typing grind: chill hands, sharp eyes.',
                'Bot check: prove you are human with clean input.',
                'Tutorial island, but make it aesthetic.',
                'Steady WPM > ego taps. Breathe.',
                'Build the habit stack - one row at a time.',
                'Lowkey mission: zero panic misclicks.',
                'Fundamentals diff - respect the arc.',
                'Finger sync test - squad up.',
                'Micro-grind for macro glow-up later.',
                'No essay, just reps. Vibe and type.',
                'Starter arc: consistent > flashy.',
                'Tap like you mean it, not like you guess it.',
                'Training wheels off soon - respect the warmup.',
                'Channel open - don’t grief it with typos.',
                'Clean inputs only - we are not messy here.',
                'Grass-touch typing: stay grounded, stay accurate.'
            ],
            ua: [
                'Калібруєм канал: без зайвого тильту, тільки ритм.',
                'Перший захід - не нервуй, це просто прокачка.',
                'База має бути чистою - потім полетить кайф.',
                'Міні-місія: стабільний ввод, zero драми.',
                'Пальці в синхроні - тоді й швидкість.',
                'Тренуєм пам’ять м’язів - далі буде легше.',
                'Лайтовий старт, але з фокусом як у про.',
                'Не гони WPM поки - лови точність.',
                'Місія на кілька хвилин - зроби її ідеальною.',
                'Тач-принт без кринжу - тільки дисципліна.',
                'Малий рівень - великі амбіції. Ок.',
                'Підготовка до хайлайту. Без скачок.',
                'Канал відкрито - не завалюй помилками.',
                'Чіл, але не розслабляй пальці.',
                'Старт ланцюга квестів. Тримай лінію.',
                'Репи заради скилу, не заради понту.',
                'Мікро-фокус - макро-результат потім.',
                'Пальці як команда - без дезсинхрону.'
            ]
        },
        medium: {
            ru: [
                'Мид: больше огня, тот же контроль.',
                'Разгон разрешён - но не теряй голову.',
                'Регистры и ритм - проверка на взрослость.',
                'Тут уже не «потыкать» - тут держать линию.',
                'Ближе к эндгейму. Палец в нерве.',
                'Челлендж: скорость без хаоса.',
                'Коэффициент кайфа растёт - ошибки режут.',
                'Модуль чуть жёстче - ты готов?',
                'Держи темп как в рейде - стабильно.',
                'Больше уровней, меньше оправданий.',
                'Мидграйнд: стамина + внимание.',
                'Апгрейд сложности - докажи скилл.',
                'Тайминг на вес золота.',
                'Не фиди ошибками - играем серьёзно.',
                'Шире охват - тот же ice in veins.',
                'Грейд выше - зона комфорта в сторону.',
                'Комбо скорость+точность - вот мета.'
            ],
            en: [
                'Mid game: more heat, same control.',
                'Speed unlocked - ego still locked in.',
                'Caps and flow - proof you leveled up.',
                'Not casual taps anymore - hold the line.',
                'Closer to endgame fingers.',
                'Challenge: fast but not feral.',
                'Higher stakes - mistakes hurt more.',
                'Harder module - show the improvement arc.',
                'Raid tempo: stable clears.',
                'More letters, less excuses.',
                'Stamina round - stay sharp.',
                'Difficulty spike - respect it.',
                'Timing is currency here.',
                'Don’t int with typos - serious run.',
                'Wider coverage - cold veins meta.',
                'Comfort zone? Left behind.',
                'Meta is speed + accuracy stack.'
            ],
            ua: [
                'Мід: більше вогню, той самий контроль.',
                'Розгін ок - без втрати голови.',
                'Регістр і ритм - ти вже не новачок.',
                'Тут тримаємо лінію, а не «потицяти».',
                'Ближче до ендгейму для пальців.',
                'Челендж: швидко, але не хаотично.',
                'Складніше - помилки болючіші.',
                'Модуль жорсткіший - ти готова/готовий?',
                'Темп як у рейді: рівно.',
                'Більше літер - менше виправдань.',
                'Стаміна + увага - тренуємся.',
                'Складність ап - поважай.',
                'Таймінг = валюта.',
                'Не фіть помилками - серйозний забіг.',
                'Ширше покриття - холодні нерви.',
                'Зона комфорту вже не тут.',
                'Мета: швидкість + точність разом.'
            ]
        },
        advanced: {
            ru: [
                'Эндгейм: жми как будто на турнире.',
                'Тут уже «просто пройти» - слабый сценарий.',
                'Хард-мод: точка, запятая, темп - всё сразу.',
                'Финальный босс клавы. Без сейвов.',
                'Легендарный слот - докажи, что ты не нуб.',
                'Классно или никак: precision diff.',
                'Скилл чек: держишь ли ты айс?',
                'Для тех, кто уже «понял жизнь» клавиатуры.',
                'Максимальный коэфф - полный фокус.',
                'Топ-лобби текстом. Не облажайся.',
                'Сложность на максималках - welcome.',
                'Хай риск - хай reward в голове.',
                'Миссия для тех, кто живёт на WPM.',
                'Без пощады к пальцам - только прогресс.',
                'Финишная прямая скилла.',
                'Если вывезешь - ты уже gigachad раскладки.',
                'Турбо-режим: стиль и дисциплина.'
            ],
            en: [
                'Endgame: type like you are on stage.',
                '“Just finish” is weak - pop off instead.',
                'Hard mode: punctuation + tempo stacked.',
                'Final boss keyboard - no save scumming.',
                'Legend slot - prove you are not a noob.',
                'Clean or cringe - precision diff.',
                'Skill check: ice in your veins?',
                'For people who grind the keyboard for real.',
                'Max multipliers need max focus.',
                'Top lobby but it is just text. Deliver.',
                'Max difficulty - thanks for coming.',
                'High risk - high dopamine if clean.',
                'Mission for WPM addicts.',
                'No mercy reps - only growth.',
                'Finishing straight of the skill arc.',
                'If you clear this, you are him/her.',
                'Turbo mode: style + discipline.'
            ],
            ua: [
                'Ендгейм: тисни як на турнірі.',
                '«Просто пройти» - слабий сценарій.',
                'Хард: пунктуація + темп разом.',
                'Фінальний бос клави - без сейвів.',
                'Легендарний слот - не будь нубом.',
                'Або чисто, або крінж - precision diff.',
                'Скіллчек: холод у жилах?',
                'Для тих, хто вже рейджить по WPM.',
                'Максимум фокусу - максимум складності.',
                'Топ-лобі текстом. Вивези.',
                'Складність на максимумі - вітрич.',
                'Хайрізк - якщо чисто, буде кайф.',
                'Місія для залежних від швидкості.',
                'Без жалю до пальців - тільки ріст.',
                'Фінішна пряма скилу.',
                'Якщо зніс/зняла - ти вже легенда.',
                'Турбо: стиль + дисципліна.'
            ]
        }
    };

    var DONE_FIRST = {
        beginner: {
            ru: [
                'Канал чистый. Следующий слот открыт.',
                'Легчайшая. Идём дальше по квесту.',
                'GG - ввод в норме, можно флексить лайтово.',
                'Миссия снята. Ты в игре.',
                'Первый клир - welcome to grind.',
                'Красава, база поставлена.',
                'Стабильно. Кайфанул от ровных пальцев?',
                'Без кипиша - именно то, что надо.',
                'Операция закрыта. Респект.',
                'Ты только что прокачал сенсор своих рук.',
                'Фарм идёт. Следующий чекпоинт ждёт.',
                'Скилл появился - заметно.',
                'Чистый прогон. Next mission ready.',
                'Ты реально это вынес. Respect.',
                'Система довольна. И мы тоже.',
                'Первый зачёт - держи позитивный хвост.'
            ],
            en: [
                'Channel stable - next sector unlocked.',
                'Clean clear - questline continues.',
                'GG - inputs clean, flex a little.',
                'Mission done - you stay winning.',
                'First clear - welcome to the grind.',
                'Fundamentals pop off - nice.',
                'No panic run - exactly the vibe.',
                'Operation closed. Big respect.',
                'You just buffed your hands’ IQ.',
                'Farm is moving - checkpoint waits.',
                'Skill diff is showing.',
                'Flawless arc - next mission ready.',
                'You cooked that.',
                'System happy. We are too.',
                'First stamp - ride the momentum.',
                'Run counted - stay locked in.'
            ],
            ua: [
                'Канал чистий. Наступний слот відкрито.',
                'Чистий клір - квестина триває.',
                'GG - ввід ок, можна трішки пофлексити.',
                'Місія знята. Ти в грі.',
                'Перший зачєт - welcome to grind.',
                'Красота, база є.',
                'Без кіпішу - саме те.',
                'Операція закрита. Респект.',
                'Ти тільки що бафнув руки.',
                'Фарм жужжить - далі по маршруту.',
                'Скил видно.',
                'Чистий забіг - next ready.',
                'Ти це виніс/винесла.',
                'Система задоволена. І ми.',
                'Перший маркер - тримай імпульс.',
                'Зачот є - не гальмуй.'
            ]
        },
        medium: {
            ru: [
                'Мид пройден. Скилл растёт на глазах.',
                'Жёстче, но ты вынес. Respect.',
                'Темп держал - красава.',
                'Сложность апнута, ты не слился.',
                'Рейд без вайпа. Пошли дальше.',
                'Контроль + скорость = ты в теме.',
                'Чистый мид. Meta понял?',
                'Ядро прогресса - ты сделал шаг.',
                'Не фидил ошибками - умница/умник.',
                'Следующий тир уже близко.',
                'Стабильная разнесёнка. Nice.',
                'Скиллчек пройден - продолжаем.',
                'Ты держишь планку - так держать.',
                'Мид - не финал, но уже flex.',
                'Операция жёсткая, результат мягкий для эго.',
                'Вынес середину - топ.',
                'Фарм опыта идёт идеально.'
            ],
            en: [
                'Mid cleared - skill bar moves.',
                'Spicy clear - you delivered.',
                'Tempo held - W.',
                'Difficulty up - you did not fold.',
                'Raid without wipe - next pull.',
                'Control + speed - you get the meta.',
                'Clean mid - keep stacking.',
                'Core progress step - secured.',
                'No int - disciplined run.',
                'Next tier loading.',
                'Stable pop-off. Nice.',
                'Skill check passed - continue.',
                'You hold the standard - keep it.',
                'Mid is not final - still a flex.',
                'Hard mission, soft ego damage.',
                'You cleared the spike - top.',
                'XP farm looks elite.'
            ],
            ua: [
                'Мід знято - скил росте.',
                'Жорстко, але ти виніс/винесла.',
                'Темп тримав - краса.',
                'Складність вище - ти не злився.',
                'Рейд без вайпу - далі.',
                'Контроль + швидкість = ти в темі.',
                'Чистий мід - тримай лінію.',
                'Крок у прогресі - зафіксовано.',
                'Без фіду помилок - дисципліна.',
                'Наступний тір близько.',
                'Стабільний поп-оф. Nice.',
                'Скіллчек ок - рухаймось.',
                'Планка тримається - так і далі.',
                'Мід не фінал, але вже flex.',
                'Жорстка місія - м’яко для его.',
                'Спайк знято - топ.',
                'Фарм досвіду виглядає elite.'
            ]
        },
        advanced: {
            ru: [
                'Эндгейм-чек снят. Ты монстр.',
                'Такое вывозишь - уже не «для новичков».',
                'Легенда. Система аплодирует.',
                'Хард-мод сгорел дотла. Ты топ.',
                'Турбо-прогон засчитан. Красава.',
                'Скилл diff на лицо - respect.',
                'Ты реально main character.',
                'Разнес хард - держи уважение.',
                'Это уже уровень «покажи им».',
                'Финалка пройдена - flex разрешён.',
                'Вот это performance. WOW в хорошем смысле.',
                'Ты не просто прошёл - ты унёс.',
                'Комбо скорость+точность - идеал.',
                'Гига-клавишник energy.',
                'Следующий вызов боится тебя.',
                'Конец линии? Нет. Но ты босс.',
                'Скилл на пике - береги запястья.'
            ],
            en: [
                'Endgame check cleared - you are built different.',
                'If you can do this, you are not “beginner”.',
                'Legend - system claps.',
                'Hard mode ashes - you win.',
                'Turbo run counted - huge respect.',
                'Skill diff is obvious.',
                'Main character arc confirmed.',
                'You cracked the spike - salute.',
                'This is flex-permission territory.',
                'Finale done - you can celebrate (clean run).',
                'That performance was nasty (good).',
                'You did not squeak by - you carried.',
                'Speed + accuracy stack - perfect.',
                'Gigakeyboarder energy.',
                'Next challenge is scared.',
                'Boss phase cleared - wrists stay safe though.',
                'Peak skill - hydrate and stretch.'
            ],
            ua: [
                'Ендгейм знято - ти монстр.',
                'Це вже не для новачків - ти вище.',
                'Легенда - система аплодує.',
                'Хард згорів - ти виграв/виграла.',
                'Турбо-забіг зачтено. Респект.',
                'Скилл на обличчі.',
                'Ти головний персонаж арку.',
                'Спайк знято - салют.',
                'Тут вже можна флексити чисто.',
                'Фіналка пройдена - кайф.',
                'Перформанс - вогонь.',
                'Не проскочив/ла - виніс/винесла.',
                'Швидкість + точність = ідеал.',
                'Енергія гіга-клавіатури.',
                'Наступний виклик нервує.',
                'Бос пройдений - бережи зап’ястя.',
                'Пік скилу - вода й розминка.'
            ]
        }
    };

    var DONE_REPEAT = {
        beginner: {
            ru: [
                'Репет - скилл не убежал, ты молодец.',
                'Фарм монет/памяти - тоже контент.',
                'Повтор = прокачка стабильности.',
                'Ещё разок - пути speedrun.',
                'Закрепляем, чтобы в мясо не лезть.',
                'Кайф от ровного темпа - снова.',
                'Ремастер миссии. Лайк.',
                'Не лень повторить - значит прогресс.',
                'Grind значит respect.',
                'Чистый реплей - база.',
                'Ещё один заход - идеально.',
                'Репет без скуки - уровень прокачан.',
                'Настойчивость = сигма move.',
                'Ты полируешь скилл. Ок.',
                'Реген на кайфе.',
                'Треня закончится, скилл останется.'
            ],
            en: [
                'Replay - skill stayed paid.',
                'Farm run - still content.',
                'Repeat = stability stack.',
                'One more lap - speedrun brain.',
                'Lock it in so you do not int later.',
                'Clean tempo hits again.',
                'Remaster mission - W.',
                'Not lazy to repeat - that is growth.',
                'Grind is respect.',
                'Flawless replay - base.',
                'Another clear - crisp.',
                'Repeat without bore - upgraded mindset.',
                'Persistence = sigma move.',
                'You are polishing the skill. Good.',
                'Regen on positive mental.',
                'Practice ends, skill stays.'
            ],
            ua: [
                'Реплей - скил нікуди не подівся.',
                'Фарм - теж контент.',
                'Повтор = стабільність.',
                'Ще коло - speedrun мозок.',
                'Закріплюємо, щоб потім не крінжувати.',
                'Рівний темп знову зайшов.',
                'Ремайстер - W.',
                'Не лінь повторити - це ріст.',
                'Грінд = респект.',
                'Чистий реплей.',
                'Ще один клір - акуратно.',
                'Повтор без нудьги - прокачка менталу.',
                'Наполегливість = sigma.',
                'Поліруєш скил - топ.',
                'Реген на позитиві.',
                'Треня мине, скил лишиться.'
            ]
        },
        medium: {
            ru: [
                'Мид на репите - всё ещё круто.',
                'Повтор жёсткого = ментал бог.',
                'Шлифуем мид, легендарно.',
                'Ещё раз на уверенность.',
                'Скилл не ржавеет - плюс вайб.',
                'Фарм опыта на миде - norm.',
                'Темп держишь снова - respect.',
                'Ремастер мид-контента.',
                'Повтор без кринжа - прокачка.',
                'Середина покорена снова.',
                'Стабильность - сигма.',
                'Мид фармится - good.',
                'Ещё одна победа над рутиной.',
                'Полировка скилла идёт.',
                'Репет и кайф - совместимо.',
                'Докручиваем классику.',
                'Повтор = инвестиция в хайлайты.'
            ],
            en: [
                'Mid replay - still fire.',
                'Hard repeat - mental diff boss.',
                'Polishing mid - legendary.',
                'Again for confidence.',
                'Skill did not rust - W vibes.',
                'XP farm on mid - normal.',
                'Tempo held again - respect.',
                'Remaster mid content.',
                'Repeat without cringe - upgrade.',
                'Mid conquered twice.',
                'Stability = sigma.',
                'Mid farm continues - good.',
                'Another win over routine.',
                'Polishing is happening.',
                'Replay can slap - believe.',
                'Rounding the classics.',
                'Repeat = investing in highlights.'
            ],
            ua: [
                'Мід на реплеї - ще вогонь.',
                'Повтор жорсткого - ментал бос.',
                'Шліфуємо мід.',
                'Ще раз для впевненості.',
                'Скил не іржавіє - кайф.',
                'Фарм досвіду на міді - норм.',
                'Темп знову тримаєш - respect.',
                'Ремайстер міду.',
                'Повтор без крінжу.',
                'Мід знову взятий.',
                'Стабільність = sigma.',
                'Фарм міду - ок.',
                'Ще одна перемога над рутиною.',
                'Полірування триває.',
                'Реплей може зайти.',
                'Докручуємо класику.',
                'Повтор = інвест в хайлайт.'
            ]
        },
        advanced: {
            ru: [
                'Хард на репите - ты безумец в хорошем смысле.',
                'Ещё раз унес эндгейм - сталь.',
                'Повторяешь финалку = уверенность max.',
                'Гринд вершины - уважение.',
                'Скилл закалён повтором.',
                'Легендарный реплей.',
                'Ты точно не случайно здесь.',
                'Фарм кайфа на хай-сложности.',
                'Ещё один круг славы.',
                'Босс боссится снова - ты выиграл.',
                'Эндгейм фармится как надо.',
                'Ремастер финального контента.',
                'Повтор без страха - топ.',
                'Хард не страшен - привык.',
                'Скилл на репите только крепнет.',
                'Ещё раз доказал уровень.',
                'Ты main - остальные вайбят.'
            ],
            en: [
                'Hard replay - psycho (compliment).',
                'Endgame again - nerves of steel.',
                'Repeating finale - confidence maxed.',
                'Summit grind - respect.',
                'Skill tempered by repeats.',
                'Legendary replay.',
                'You are not here by accident.',
                'Dopamine farm on high diff.',
                'Another lap of glory.',
                'Boss round 2 - you still win.',
                'Endgame farm looks correct.',
                'Remaster finale content.',
                'Repeat fearless - top.',
                'Hard is normal now.',
                'Skill only stacks on replays.',
                'Proof of level again.',
                'Main character repeats hit different.'
            ],
            ua: [
                'Хард на реплеї - псих у хорошому сенсі.',
                'Ендгейм знову - нерви сталі.',
                'Повтор фіналки - впевненість max.',
                'Грінд вершини - респект.',
                'Скил закалений повторами.',
                'Легендарний реплей.',
                'Ти тут не випадково.',
                'Фарм кайфу на топ-складності.',
                'Ще коло слави.',
                'Босс раунд 2 - ти знову виграв/виграла.',
                'Ендгейм фарм - ок.',
                'Ремайстер фіналу.',
                'Повтор без страху.',
                'Хард тепер норма.',
                'Скил росте на реплеях.',
                'Знову доказав рівень.',
                'Мейн-персонаж - це ти.'
            ]
        }
    };

    /** Точечные усиления для популярных уроков - ключ как в storageKey */
    var OVERRIDES = {
        lesson_beginner_1: {
            ru: { brief: 'Калибруем «фыва олдж» - база всего.', doneFirst: 'Канал домашнего ряда стабилен. Дальше - больше букв.', doneRepeat: 'Домашний ряд уже в мышечной памяти - кайф.' },
            en: { brief: 'Calibrate home row - it is the whole foundation.', doneFirst: 'Home row channel is stable. More letters next.', doneRepeat: 'Home row is muscle memory now - clean.' },
            ua: { brief: 'Калібруєм фіва олдж - фундамент усього.', doneFirst: 'Домашній ряд ок. Далі більше літ.', doneRepeat: 'Домашній ряд у пам’яті рук - супер.' }
        },
        lesson_beginner_2: {
            ru: { brief: 'Расширяем базу - больше букв, тот же chill.', doneFirst: 'Расширение сетки снято. Идём в верх.', doneRepeat: 'Расширенка пройдена снова - жмёшь уверенно.' },
            en: { brief: 'Wider base - more letters, same chill.', doneFirst: 'Grid expansion cleared - upward row next.', doneRepeat: 'Extended home clear again - crisp.' },
            ua: { brief: 'Розширюєм базу - більше літер, той самий chill.', doneFirst: 'Розширення сітки ок. Далі вгору.', doneRepeat: 'Розширенка знову - рівно.' }
        },
        lesson_beginner_3: {
            ru: { brief: 'Верхний ряд - новая высота, не лезь без фокуса.', doneFirst: 'Верхушка покорена. Низ ждёт очередь.', doneRepeat: 'Верх снова чист - не дропай темп.' },
            en: { brief: 'Top row - new altitude, stay focused.', doneFirst: 'Top row secured. Bottom waits.', doneRepeat: 'Top row clean again - hold tempo.' },
            ua: { brief: 'Верхній ряд - нова висота, фокус увімк.', doneFirst: 'Верх взятий. Низ далі.', doneRepeat: 'Верх знову чисто - тримай темп.' }
        },
        lesson_beginner_4: {
            ru: { brief: 'Нижний ряд - добиваем классическую сетку.', doneFirst: 'Низ закрыт - сетка чувствуется целиком.', doneRepeat: 'Низ на репите - скилл не стареет.' },
            en: { brief: 'Bottom row - finish the classic grid.', doneFirst: 'Bottom closed - full grid vibes.', doneRepeat: 'Bottom grind - skill stays fresh.' },
            ua: { brief: 'Нижній ряд - збираємо класику.', doneFirst: 'Низ ок - сітка ціла.', doneRepeat: 'Низ знову - прокачка тримається.' }
        },
        lesson_beginner_7: {
            ru: { brief: 'ENG старт: asdf / jkl - твой западный спавн.', doneFirst: 'Англ-база стоит. Расширяй словарь.', doneRepeat: 'ENG home на повторе - всё щёлкает.' },
            en: { brief: 'ENG start: asdf / jkl - western spawn.', doneFirst: 'English base is set - expand vocab next.', doneRepeat: 'ENG home replay - still snappy.' },
            ua: { brief: 'ENG база: asdf / jkl - старт без паніки.', doneFirst: 'Англ-фундамент ок. Далі шире.', doneRepeat: 'ENG база знову - чисто.' }
        },
        lesson_beginner_101: {
            ru: { brief: 'UA домашний ряд - сво, без микса с ру.', doneFirst: 'UA-канал открыт. Дальше слова.', doneRepeat: 'UA база снова на максималках.' },
            en: { brief: 'UA home row - own track, clean run.', doneFirst: 'UA channel opened - words next.', doneRepeat: 'UA base replay - still solid.' },
            ua: { brief: 'UA домашній ряд - чиста база.', doneFirst: 'UA-база закріплена. Далі слова.', doneRepeat: 'UA база знову - топ.' }
        }
    };

    function pickBrief(lesson, levelKey, L) {
        var key = storageKey(lesson, levelKey);
        var ov = OVERRIDES[key];
        if (ov && ov[L] && ov[L].brief) return ov[L].brief;
        if (ov && ov.ru && ov.ru.brief) return ov.ru.brief;
        var tier = tierFromLevel(levelKey);
        var arr = BRIEF[tier][L] || BRIEF[tier].ru;
        return arr[poolIndex(key, arr.length)];
    }

    function getMissionForLesson(lesson, levelKey, lang) {
        if (!lesson) return { code: '', brief: '' };
        var L = normLang(lang);
        return {
            code: opCode(lesson, levelKey),
            brief: pickBrief(lesson, levelKey, L)
        };
    }

    function getMissionCompleteLine(lesson, levelKey, lang, opts) {
        if (!lesson) return '';
        var L = normLang(lang);
        var key = storageKey(lesson, levelKey);
        var first = !!(opts && opts.firstClear);
        var ov = OVERRIDES[key];
        if (ov && ov[L]) {
            if (first && ov[L].doneFirst) return ov[L].doneFirst;
            if (!first && ov[L].doneRepeat) return ov[L].doneRepeat;
        }
        var tier = tierFromLevel(levelKey);
        var pool = first ? DONE_FIRST : DONE_REPEAT;
        var arr = pool[tier][L] || pool[tier].ru;
        return arr[poolIndex(key + (first ? ':1' : ':0'), arr.length)];
    }

    global.lessonMissionsModule = {
        getMissionForLesson: getMissionForLesson,
        getMissionCompleteLine: getMissionCompleteLine,
        missionStorageKey: storageKey,
        tierFromLevel: tierFromLevel
    };
})(typeof window !== 'undefined' ? window : globalThis);

