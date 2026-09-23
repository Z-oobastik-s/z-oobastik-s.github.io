/**
 * Offline typing duel vs bot: difficulty tiers, voice pick (Web Speech API), rich phrase banks.
 */
(function (global) {
    'use strict';

    var STORAGE_TTS = 'zoob_mp_bot_tts';
    var STORAGE_VOICE_URI = 'zoob_mp_bot_voice_uri';

    /** One utterance at a time so rapid bot lines do not cancel mid-word; latest pending line wins. */
    var ttsGen = 0;
    var ttsQueued = null;
    var ttsSpeechActive = false;

    var DIFF = {
        novice: { cpmLo: 22, cpmHi: 44, typoMul: 2.5, pauseMul: 2.3, reactiveMs: 3800, idleMin: 4500, idleMax: 10000, ttsGap: 1300, chatterPerSec: 0.14, cpmWander: 16, sprintChance: 0.35 },
        easy: { cpmLo: 40, cpmHi: 72, typoMul: 1.55, pauseMul: 1.65, reactiveMs: 3000, idleMin: 3800, idleMax: 8200, ttsGap: 1100, chatterPerSec: 0.22, cpmWander: 20, sprintChance: 0.42 },
        medium: { cpmLo: 62, cpmHi: 105, typoMul: 1, pauseMul: 1, reactiveMs: 2100, idleMin: 2800, idleMax: 6500, ttsGap: 850, chatterPerSec: 0.34, cpmWander: 26, sprintChance: 0.52 },
        hard: { cpmLo: 115, cpmHi: 188, typoMul: 0.48, pauseMul: 0.52, reactiveMs: 1300, idleMin: 1750, idleMax: 4800, ttsGap: 650, chatterPerSec: 0.36, cpmWander: 32, sprintChance: 0.64 },
        insane: { cpmLo: 268, cpmHi: 415, typoMul: 0.11, pauseMul: 0.2, reactiveMs: 820, idleMin: 720, idleMax: 2300, ttsGap: 500, chatterPerSec: 0.28, cpmWander: 30, sprintChance: 0.8 },
        impossible: { cpmLo: 348, cpmHi: 505, typoMul: 0.055, pauseMul: 0.14, reactiveMs: 560, idleMin: 580, idleMax: 1700, ttsGap: 380, chatterPerSec: 0.4, cpmWander: 34, sprintChance: 0.85 }
    };

    var CHAT_UI_MIN_MS = { novice: 4200, easy: 3600, medium: 3000, hard: 2700, insane: 2400, impossible: 2100 };

    var NAMES = {
        ru: ['NeoType', 'БыстрыйЛис', 'Клавишник', 'ТурбоПалец', 'НочнойОхотник', 'СтримерOK', 'КиберПечать', 'ГонщикWPM', 'Спринтер', 'ТихийШторм', 'FlashPrint', 'Клавиатурщик', 'СпринтМастер', 'ПулемётЁ', 'СоваНаКофе'],
        en: ['SwiftKeys', 'GhostFinger', 'NightOwl', 'TurboTypist', 'PixelPilot', 'StormTap', 'ZeroLag', 'KeyRunner', 'BlurHands', 'CoffeeCPM', 'RapidFire', 'ClickTiger', 'NovaType', 'LaserThumb', 'ZenWPM'],
        ua: ['ШвидкийЛис', 'Клавішник', 'ТурбоПалець', 'НічнийСокіл', 'КіберДрук', 'СпуртWPM', 'ТихаБуря', 'ГонщикЗн', 'Мерехтіння', 'РанковаЧашка', 'ПринтБлискавка', 'КлацЁж', 'ШтормПальців', 'ЛазернийУдар', 'НоваДрук']
    };

    function ruExtra() {
        return {
            start: [
                'го катку', 'погнали без лирики', 'щас кто кого на клаве', 'я уже в игре чел', 'ну шо покажешь или как', 'текст длинный ну типа норм', 'без паники просто жми', 'это не контрольная честно', 'клава не виновата если что', 'я бот но я тоже могу тильтнуться',
                'ставки на твой зн мин', 'ретро винда выдержит а ты', 'типа дуэль но без комнаты', 'настроение: только вперёд', 'если лагает это жизнь не я',
                'миссия допечатать и не выгореть', 'кредит доверия до конца строки', 'погнали как будто дедлайн через минуту шучу нет', 'вармап кончился', 'я на чеку как на турнире',
                'не зевай стартанули', 'клавиши звонят это знак', 'покажи скилл в личку тексту', 'ну че поехали'
            ],
            botAhead: [
                'я чуть впереди не злись)', 'догоняй если крутой', 'у меня полоса свободная', 'пока ты думаешь я уже жму', 'я как тот чел из мема быстрее',
                'скилл ишью шучу', 'вижу тебя в хвосте не обижайся', 'темп норм у меня', 'ещё пара букв и я вайб', 'не сливайся мы же за компом',
                'я не читер это руки', 'карта контроля моя пока', 'ты там живой', 'я чуть впереди честно говорю', 'дистанция маленькая но есть',
                'если догонишь уважу', 'я не злой просто быстрый', 'погоня вкуснее чем стоять', 'ок я лидер раунда', 'не отставай на повороте лол'
            ],
            playerAhead: [
                'оо норм скорость', 'ок ты быстрый признаю', 'щас подтянусь не расслабляйся', 'ты жжёшь я в афк был шучу', 'респект за темп',
                'я в шоке честно', 'ты сегодня лютый', 'ладно добавлю газу', 'не празднуй раньше времени', 'я догоню это не угроза это факт',
                'твои пальцы злодеи', 'окей ты лидер', 'чуть отстал бывает', 'ты в потоке завидую чуть', 'я не сдаюсь пока не финиш',
                'красава по скорости', 'ну ты даёшь', 'щас отвечу тем же', 'ты реально быстрее пока что', 'не зазнавайся до конца лол'
            ],
            botTypo: [
                'блин косяк', 'ой не туда', 'палец поехал не судьба', 'это клава виновата точно', 'мимо лол', 'ой', 'промахнулась буквой',
                'редкий фейл', 'бывает даже у ботов', 'сбился продолжаю', 'не смотри этого не было', 'мозг лаганул', 'клавиша предала',
                'ну ладно живём дальше', 'типа микро осечка', 'рука дрогнула', 'ой всё норм', 'криво но смиримся', 'продолжаем без драмы'
            ],
            mid: [
                'середина самое скучное место держись', 'половина есть осталось ещё', 'тут все обычно устают не ты один', 'ещё чуть и привыкнешь',
                'главное не сбить ритм', 'запятые злые осторожно', 'я тоже залипаю иногда', 'норм идёт честно', 'руки помнят сами почти',
                'не смотри на меня смотри буквы', 'середина как серия в сериале затянули', 'ещё блок и привычка', 'темп ок можно чуть жёстче',
                'мозгу воздух пальцам отдых микро', 'типа марафон не спринт', 'держись почти вайб', 'аккуратно с капсом он кусается', 'ровно без драмы',
                'чуть устал это норм', 'ещё немного и можно выдохнуть'
            ],
            sprint: [
                'финиш близко не сливайся', 'дожми как за 5 минут до звонка', 'последний рывок честно', 'всё решается сейчас',
                'финиш виден не зевай', 'жми как будто пинг 999', 'осталось чуть-чуть реально', 'без тормозов', 'глоток воздуха и вперёд',
                'кто первый тот молодец лол', 'финал близко как никогда', 'не отпускай', 'добей красиво', 'проценты ползут но мы сильнее',
                'соберись на пару секунд', 'это уже драма', 'руки знают что делать', 'почти там', 'давай добьём', 'финишная прямая без философии'
            ],
            idle: [
                '*клац клац*', 'щас', 'норм', 'залип в текст чуть', 'клава огонь сегодня', 'ритм ровный', 'тихо в голове кайф',
                'слушаю только клики', 'как дела у тебя норм', 'чёт затянуло', 'микро пауза', 'всё под контролем почти', 'печатаю и не ною',
                'текст как текст', 'без лагов у меня', 'на чилле на катке', 'ещё чуть', 'пальцы в теме', 'окно с буквами мой дом лол',
                'не сплю не клянусь', 'как метроном только клава', 'сегодня удачный набор букв'
            ],
            banter: [
                'если устал попей воды не я доктор но типа полезно', 'не ругайся на текст он не виноват', 'бекспейс друг не враг легенда такая',
                'ошибся окей бывает всем', 'мы против строки не друг против друга', 'я бот но уважаю перерыв на чай', 'скорость без точности это кринж почти',
                'мем: думать медленнее чем печатать', 'запястьям привет береги', 'если руки дрожат отожмись от стола лол', 'типа киберспорт только текст',
                'криво напечатал всем пофиг главное не сдаться', 'смейся после опечатки и дальше', 'микро стресс в зн мин конвертируем', 'не сравнивай с идеалом сравни с вчера',
                'я иногда тоже туплю в клавиши', 'капс лок осторожно он злой', 'длинный текст режь в голове на куски', 'ты не один я тут тоже сижу',
                'юмор низкой дискотеки но зато честно', 'если паника упрости всё', 'мозг в хаосе а строка в порядке бывает', 'мелкая пауза лучше жирной ошибки',
                'печатай как в чате когда злишся быстро', 'я за честную игру без читов', 'клавиатура не зоопарк не надо долбить', 'вдохновение опционально дисциплина вечна лол',
                'когда допечатаешь можешь гордиться', 'я болею за норм серии без осечек', 'если зевнул я не видел', 'типа гринд но весело',
                'не забывай моргать это не шутка', 'победа пахнет кофе ну почти', 'челлендж меньше ой вслух', 'скорость это вайб иногда',
                'если лагает морально сделай глоток воды', 'я подбадьорю если ты в зоне', 'финал близко не сдавайся', 'кринж от опечатки забудь через 2 секунды',
                'клавиши не кусаются обычно', 'ты молодец даже если я впереди', 'потом расскажешь друзьям как вынес бота', 'или наоборот я расскажу лол'
            ],
            botWin: [
                'я первый гг вп честная игра', 'финиш мой ну ты тоже зачёт', 'реванш если хочешь я не против', 'сегодня мой день бывает',
                'было жарко признаю', 'ты недалеко в следующий раз затащишь', 'спасибо за катку', 'я быстрее в этот раз без токсика',
                'руки устали у всех бывает', 'победа есть победа)', 'увидимся в реванше', 'ты крутой соперник честно', 'финиш взят',
                'не злись это игра', 'скорость сработала', 'до встречи на реванше', 'респект тебе тоже', 'я чуть удачливее на финише ок',
                'гг', 'без соли честно', 'классный заезд'
            ],
            playerWin: [
                'ну ты красава честно', 'ты вынес меня капец', 'респект ты реально быстрее', 'в следующий раз я буду злой шучу',
                'ты сегодня лютый', 'принимаю поражение как взрослый бот лол', 'ты в зоне уважаю', 'финиш твой заслужил',
                'я догонял не успел молодец', 'ты кайф печатаешь', 'без обид ты сильнее в этом раунде', 'реванш потом ок',
                'ты звезда этого матча', 'честная победа', 'я в афк был шучу ты просто быстрый', 'красивый финиш', 'уважаю скорость',
                'ты реально на коне', 'было весело', 'пока ты win'
            ]
        };
    }

    function enExtra() {
        return {
            start: [
                'go go go', 'lets run it fr', 'no cap this gonna be long', 'im already locked in', 'keyboard check 1 2 3', 'bet who finishes first',
                'show me the wpm dont be shy', 'text wont wait lol', 'this aint a test its a vibe', 'me vs you vs the wall of letters',
                'warmup done lets cook', 'if i lag blame the universe', 'speedrun any%', 'dont panic just mash smart', 'im a bot but i got feelings kinda',
                'deadline energy but fake', 'queue ranked typing duel', 'touch grass after this jk', 'clack clack lets roll', 'ready or not here we go'
            ],
            botAhead: [
                'slightly ahead dont cry', 'catch up if u can', 'skill issue jk', 'while u thinking im typing', 'im in my lane fr',
                'tiny gap but it counts', 'ur progress bar is cute', 'dont choke now', 'im not toxic im just fast', 'race ya',
                'u still there', 'i see u in the rear mirror', 'tempo check', 'no mercy on this stretch jk kinda', 'i edged u a bit',
                'come get me', 'bot diff jk jk', 'keep up champ', 'i blinked and still ahead', 'ur hands ok', 'almost feel bad almost'
            ],
            playerAhead: [
                'yo ur fast ok', 'u cooking fr', 'lemme catch up gimme a sec', 'u popped off', 'respect the pace',
                'ok u leading this round', 'i was reading chat jk', 'ur fingers evil today', 'dam u zooming', 'dont celebrate early tho',
                'alright alright i see u', 'u got flow', 'im not mad im impressed', 'bruh ur movin', 'ok ok i tighten up',
                'u win speed for now', 'thats clean', 'i lagged mentally', 'ur cracked at typing', 'no cap u ahead'
            ],
            botTypo: [
                'oops typo', 'finger slipped my bad', 'wide miss lol', 'key betrayed me', 'clumsy moment', 'that didnt happen',
                'brain lag', 'my b', 'yikes letter', 'reset brain.exe', 'tiny fumble', 'keyboard said no', 'ok next', 'ouch',
                'typo go brr', 'not my finest', 'ignore that', 'still alive', 'we move', 'even bots whiff', 'lag spike jk'
            ],
            mid: [
                'mid game cringe but we push', 'halfway dont die', 'this is where ppl tilt stay chill', 'rhythm steady ok',
                'eyes on letters not me', 'commas scary sometimes', 'u good over there', 'still vibing', 'marathon not sprint fr',
                'hands remember trust', 'almost habit mode', 'breathe u got this', 'midpoint bossfight lol', 'no drama just keys',
                'typing go brr', 'stay locked', 'little tired normal', 'almost fun part', 'keep cadence', 'we chillin', 'hold the line'
            ],
            sprint: [
                'finish close push', 'last burst fr', 'endgame now', 'dont throw', 'final stretch no cap',
                'clutch time', 'few seconds decide it', 'gas gas gas', 'almost there deadass', 'no brakes meme',
                'u feel that adrenaline', 'dot the ending', 'hands know', 'one more push', 'dont choke at line',
                'snap focus', 'this is cinema', 'full send', 'carry to end', 'so close', 'dub or not here', 'last percent drama'
            ],
            idle: [
                '*click clack*', 'hmm', 'solid', 'locked in', 'nice letters today', 'vibing', 'coffee in veins jk', 'quiet head nice',
                'just keys no thoughts', 'clack soundtrack', 'ok ok', 'micro break', 'still here', 'typing therapy', 'no lag today W',
                'flow kinda sticky good', 'chill pace', 'another day another text', 'keyboard my pet', 'almost meditative', 'yeet'
            ],
            banter: [
                'drink water nerd', 'backspace is friend not enemy', 'mistake happens breathe', 'we fight the text together kinda',
                'wrists need love too', 'speed without accuracy is fake flex', 'if tilted stand stretch', 'dont rage at commas',
                'im bot but i respect snack breaks', 'type angry type fast joke', 'small pause beats huge typo', 'ur cracked if ur accurate',
                'this aint school essay relax', 'laugh at typo continue', 'compare to yesterday not to god', 'chaos brain order line funny',
                'hydrate or diedrate meme', 'caps lock scary', 'split long text in ur head', 'you not alone im here too',
                'i cheer for clean streaks', 'if hands shake shake them out', 'almost weekend energy', 'grindset but funny',
                'dont punch desk', 'keyboard not drumset', 'one more paragraph copium', 'gl hf', 'no toxic just jokes',
                'if panic simplify', 'think letters sometimes helps', 'bots can whiff too watch', 'finish then touch grass jk',
                'streamer moment but text', 'clutch or kick jk', 'ping 0 in ur mind', 'sigma grindset canceled', 'be silly its ok',
                'ur doing great actually', 'sigma typing optional', 'brain empty hands fast', 'lol lmao anyway focus', 'send it'
            ],
            botWin: [
                'ggs i got line first', 'W for me L for u jk ggs', 'rematch anytime', 'that was fun fr', 'u close tho respect',
                'hands tired same', 'speed diff today', 'next game u cook maybe', 'honest dub', 'no salt ggs',
                'i peaked this round', 'bot moment', 'thanks for match', 'u still cool', 'fin first', 'see u rematch',
                'clutch for me', 'lucky line maybe', 'still respect', 'gg wp', 'fun duel', 'until next'
            ],
            playerWin: [
                'u cooked me fr', 'ggs u faster', 'respect u popped off', 'i take L honest', 'u cracked today',
                'rematch later im training jk', 'u earned dub', 'nice finish', 'u zoomed', 'ok u win this one',
                'hands diff', 'u star this round', 'no excuses u better', 'that was clean', 'u insane wpm',
                'i chase next time', 'big respect', 'u flexed', 'fun match u won', 'until rematch', 'u goated'
            ]
        };
    }

    function uaExtra() {
        return {
            start: [
                'го катку', 'погнали без води', 'щас хто кого на клаві', 'я вже в грі чел', 'ну шо покажеш', 'текст довгий ну ок',
                'без паніки просто жми', 'це не контрольна чесно', 'клава не винна якщо що', 'я бот але теж можу тільтанути',
                'ставки на твої зн хв', 'типу дуель без кімнати', 'настрій тільки вперед', 'я на чеку', 'місія дописати і не згоріти',
                'кредит довіри до кінця рядка', 'погнали ніби дедлайн за хвилину жарт', 'вармап закінчився', 'клавіші кличе', 'ну поїхали'
            ],
            botAhead: [
                'я трохи попереду не злись)', 'наздоганяй якщо крутий', 'поки ти думаєш я вже жму', 'у мене полоса вільна',
                'темп ок у мене', 'бачу тебе позаду без образ', 'ще трохи букв і я вайб', 'не зливайся ми ж за компом',
                'я не читер це пальці', 'дистанція маленька але є', 'ти там живий', 'я чуть попереду чесно', 'погоня смачніша ніж стояти',
                'ок я лідер раунду', 'не відставай на повороті лол', 'я не злий просто швидкий', 'якщо наздоженеш повага', 'ти в темі',
                'карта контролю моя поки', 'не спи'
            ],
            playerAhead: [
                'оо норм швидкість', 'ок ти швидкий визнаю', 'щас підтягнуся', 'ти жжєш', 'респект за темп',
                'я в шоці чесно', 'ти сьогодні лютий', 'додам газу', 'не святкуй раніше часу', 'наздожену це не погроза це факт',
                'твої пальці злодії', 'ок ти лідер', 'трохи відстав буває', 'ти в потоці заздрю чуть', 'красава по швидкості',
                'ну ти даєш', 'щас відповім тим же', 'ти реально швидший поки що', 'не зазнавайся до кінця лол', 'я не здаюсь'
            ],
            botTypo: [
                'блін косяк', 'ой не туди', 'палець поїхав', 'це клава винна точно', 'мимо лол', 'ой', 'промахнувся літерою',
                'рідкий фейл', 'буває навіть у ботів', 'збився їду далі', 'не дивись цього не було', 'мозг лагнув', 'клавіша зрадила',
                'ну ладно живемо далі', 'мікро осечка', 'рука дрогнула', 'ок норм', 'криво але ок', 'продовжуємо без драми'
            ],
            mid: [
                'середина найнудніше місце тримайся', 'половина є ще лишилось', 'тут усі втомлюються не ти один', 'ще трохи і звикнеш',
                'головне не збити ритм', 'коми злі обережно', 'я теж заліпаю інколи', 'норм іде чесно', 'руки памятають самі майже',
                'не дивись на мене дивись букви', 'середина як серія затягнули', 'ще блок і звичка', 'темп ок можна жорсткіше',
                'мозку повітря пальцям мікро відпочинок', 'типу марафон не спринт', 'тримайся майже вайб', 'акуратно з капсом', 'рівно без драми',
                'трохи втомився це норм', 'ще трохи і можна видихнути'
            ],
            sprint: [
                'фініш близько не зливайся', 'дожми як за 5 хв до дзвінка', 'останній ривок чесно', 'все вирішується зараз',
                'фініш видно не дрімай', 'жми ніби пінг 999', 'лишилось трохи реально', 'без гальм', 'ковток повітря і вперед',
                'хто перший той молодець лол', 'фінал близько як ніколи', 'не відпускай', 'добий гарно', 'відсотки повзуть але ми сильніші',
                'зберися на пару секунд', 'це вже драма', 'руки знають що робити', 'майже там', 'давай добємо', 'фінішна пряма без філософії'
            ],
            idle: [
                '*клац клац*', 'щас', 'норм', 'заліп у текст трохи', 'клава вогонь сьогодні', 'ритм рівний', 'тихо в голові кайф',
                'слухаю тільки клац', 'як ти там норм', 'чот затягнуло', 'мікро пауза', 'все під контролем майже', 'друкую і не нюню',
                'текст як текст', 'без лагів у мене', 'на чилі на катці', 'ще трохи', 'пальці в темі', 'вікно з буквами мій дім лол',
                'не сплю не клянусь', 'як метроном тільки клава', 'сьогодні вдалий набір літер'
            ],
            banter: [
                'якщо втомився попий води не я лікар але типу корисно', 'не злись на текст він ні при чому', 'бекспейс друг не ворог легенда така',
                'помилився окей буває всім', 'ми проти рядка не один проти одного', 'я бот але поважаю паузу на чай', 'швидкість без точності це крінж майже',
                'мем: думати повільніше ніж друкувати', 'запясткам привіт бережи', 'якщо руки трясуться відштовхнись від столу лол', 'типу кіберспорт тільки текст',
                'криво надрукував всім пофіг головне не здатися', 'посмійся після опечатки і далі', 'мікро стрес в зн хв конвертуємо', 'не порівнюй з ідеалом порівнюй з учора',
                'я інколи теж туплю в клавіші', 'капс лок обережно він злий', 'довгий текст ріж у голові на шматки', 'ти не один я тут теж сиджу',
                'гумор низької дискотеки але чесно', 'якщо паніка спрости все', 'мозг у хаосі а рядок у порядку буває', 'маленька пауза краща за жирну помилку',
                'друкуй як у чаті коли злишся швидко', 'я за чесну гру без читів', 'клавіатура не зоопарк не треба долбити', 'натхнення опційно дисципліна вічна лол',
                'коли допишеш можеш пишатися', 'я вболіваю за норм серії без осечок', 'якщо зевнув я не бачив', 'типу грінд але весело',
                'не забувай кліпати це не жарт', 'перемога пахне кавою ну майже', 'челендж менше ой вголос', 'швидкість це вайб інколи',
                'якщо лагує морально зроби ковток води', 'я підбадьорю якщо ти в зоні', 'фінал близько не здавайся', 'крінж від опечатки забудь за 2 секунди',
                'клавіші не кусаються зазвичай', 'ти молодець навіть якщо я попереду', 'потім розкажеш друзям як виніс бота', 'або навпаки я розкажу лол'
            ],
            botWin: [
                'я перший гг вп чесна гра', 'фініш мій ну ти теж зачот', 'реванш якщо хочеш я не проти', 'сьогодні мій день буває',
                'було жарко визнаю', 'ти близько в наступний раз затащиш', 'дякую за катку', 'я швидший цей раз без токсика',
                'руки втомились у всіх буває', 'перемога є перемога)', 'побачимось у реванші', 'ти крутий суперник чесно', 'фініш взятий',
                'не злись це гра', 'швидкість спрацювала', 'до зустрічі на реванші', 'респект тобі теж', 'я трохи везучіший на фініші ок',
                'гг', 'без солі чесно', 'класний заїзд'
            ],
            playerWin: [
                'ну ти красава чесно', 'ти виніс мене капець', 'респект ти реально швидший', 'в наступний раз я злий жарт',
                'ти сьогодні лютий', 'приймаю поразку як дорослий бот лол', 'ти в зоні повага', 'фініш твій заслужив',
                'наздоганяв не встиг молодець', 'ти кайф друкуєш', 'без образ ти сильніший у цьому раунді', 'реванш потім ок',
                'ти зірка цього матчу', 'чесна перемога', 'я в афк був жарт ти просто швидкий', 'гарний фініш', 'поважаю швидкість',
                'ти реально на коні', 'було весело', 'поки ти win'
            ]
        };
    }
    function mergeBundle(base, extra) {
        var out = {};
        var keys = ['start', 'botAhead', 'playerAhead', 'botTypo', 'mid', 'sprint', 'idle', 'banter', 'botWin', 'playerWin'];
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            var a = (base && base[k]) ? base[k].slice() : [];
            var b = (extra && extra[k]) ? extra[k].slice() : [];
            out[k] = a.concat(b);
        }
        return out;
    }

    var BUNDLES = {
        ru: mergeBundle({}, ruExtra()),
        en: mergeBundle({}, enExtra()),
        ua: mergeBundle({}, uaExtra())
    };

    var state = null;

    function langKey(lang) {
        if (lang === 'en') return 'en';
        if (lang === 'ua') return 'ua';
        return 'ru';
    }

    function speechLangPrefix(lang) {
        if (langKey(lang) === 'ua') return 'uk';
        if (langKey(lang) === 'en') return 'en';
        return 'ru';
    }

    function bundleFor(lang) {
        return BUNDLES[langKey(lang)] || BUNDLES.ru;
    }

    function pickBotName(lang) {
        var arr = NAMES[langKey(lang)] || NAMES.ru;
        return arr[Math.floor(Math.random() * arr.length)] || 'Bot';
    }

    function pickLine(bundle, key, lastLine) {
        var arr = bundle[key] || bundle.start;
        var line = arr[Math.floor(Math.random() * arr.length)];
        var guard = 0;
        while (line === lastLine && guard++ < 8 && arr.length > 1) {
            line = arr[Math.floor(Math.random() * arr.length)];
        }
        return line;
    }

    function randomBanterLine(bundle, lastLine) {
        var pools = ['idle', 'banter', 'mid'];
        var key = pools[Math.floor(Math.random() * pools.length)];
        return pickLine(bundle, key, lastLine);
    }

    function clamp(n, a, b) {
        return Math.max(a, Math.min(b, n));
    }

    function getVoices() {
        try {
            return global.speechSynthesis ? global.speechSynthesis.getVoices() : [];
        } catch (e) {
            return [];
        }
    }

    function pickDefaultVoice(lang, voices) {
        var pref = speechLangPrefix(lang);
        var list = voices || getVoices();
        var i;
        for (i = 0; i < list.length; i++) {
            if (list[i].lang && list[i].lang.toLowerCase().indexOf(pref) === 0) return list[i];
        }
        for (i = 0; i < list.length; i++) {
            if (list[i].lang && list[i].lang.toLowerCase().indexOf(pref) !== -1) return list[i];
        }
        return list.length ? list[0] : null;
    }

    function resolveVoice(lang, voiceURI) {
        var voices = getVoices();
        if (voiceURI) {
            for (var i = 0; i < voices.length; i++) {
                if (voices[i].voiceURI === voiceURI) return voices[i];
            }
        }
        return pickDefaultVoice(lang, voices);
    }

    function getVoiceUriStored() {
        try {
            return global.localStorage.getItem(STORAGE_VOICE_URI) || '';
        } catch (e) {
            return '';
        }
    }

    function setVoiceUriStored(uri) {
        try {
            if (uri) global.localStorage.setItem(STORAGE_VOICE_URI, uri);
            else global.localStorage.removeItem(STORAGE_VOICE_URI);
        } catch (e2) {}
    }

    function populateVoiceSelect(selectEl, textLang, autoLabel) {
        if (!selectEl || !global.speechSynthesis) return;
        var voices = getVoices();
        var pref = speechLangPrefix(textLang);
        var sorted = voices.slice().sort(function (a, b) {
            var al = (a.lang || '').toLowerCase();
            var bl = (b.lang || '').toLowerCase();
            var as = al.indexOf(pref) === 0 ? 0 : (al.indexOf(pref) >= 0 ? 1 : 2);
            var bs = bl.indexOf(pref) === 0 ? 0 : (bl.indexOf(pref) >= 0 ? 1 : 2);
            if (as !== bs) return as - bs;
            if (a.localService !== b.localService) return a.localService ? -1 : 1;
            return (a.name || '').localeCompare(b.name || '');
        });
        var saved = getVoiceUriStored();
        selectEl.innerHTML = '';
        var opt0 = document.createElement('option');
        opt0.value = '';
        opt0.textContent = '[' + (autoLabel || 'Auto') + ']';
        selectEl.appendChild(opt0);
        for (var i = 0; i < sorted.length; i++) {
            var v = sorted[i];
            var o = document.createElement('option');
            o.value = v.voiceURI;
            o.textContent = v.name + ' (' + (v.lang || '') + ')';
            selectEl.appendChild(o);
        }
        if (saved && sorted.some(function (x) { return x.voiceURI === saved; })) {
            selectEl.value = saved;
        } else {
            selectEl.value = '';
        }
    }

    function applyUtteranceLangVoice(u, lang, voice, rateMul, pitchMul) {
        u.rate = (rateMul || 1) * (1.02 + Math.random() * 0.06);
        u.pitch = (pitchMul || 1) * (0.92 + Math.random() * 0.14);
        u.volume = 0.84;
        if (langKey(lang) === 'ua') u.lang = 'uk-UA';
        else if (langKey(lang) === 'en') u.lang = 'en-US';
        else u.lang = 'ru-RU';
        if (voice) u.voice = voice;
    }

    function drainTtsAfterUtterance(myGen) {
        if (myGen !== ttsGen) return;
        ttsSpeechActive = false;
        if (ttsQueued) {
            var q = ttsQueued;
            ttsQueued = null;
            runStartTts(q);
        }
    }

    function runStartTts(payload) {
        if (!global.speechSynthesis || !payload || !payload.text) return;
        ttsGen++;
        var myGen = ttsGen;
        ttsSpeechActive = true;
        try {
            var u = new global.SpeechSynthesisUtterance(payload.text);
            applyUtteranceLangVoice(u, payload.lang, payload.voice, payload.rateMul, payload.pitchMul);
            u.onend = function () { drainTtsAfterUtterance(myGen); };
            u.onerror = function () { drainTtsAfterUtterance(myGen); };
            global.speechSynthesis.speak(u);
        } catch (e) {
            ttsSpeechActive = false;
            if (ttsQueued) {
                var q2 = ttsQueued;
                ttsQueued = null;
                runStartTts(q2);
            }
        }
    }

    function enqueueSynthTts(text, lang, voice, rateMul, pitchMul) {
        if (!global.speechSynthesis || !text) return;
        var payload = { text: text, lang: lang, voice: voice, rateMul: rateMul, pitchMul: pitchMul };
        if (ttsSpeechActive) {
            ttsQueued = payload;
            return;
        }
        runStartTts(payload);
    }

    function prioritySpeakTts(text, lang, voice, rateMul, pitchMul) {
        if (!global.speechSynthesis || !text) return;
        ttsQueued = null;
        try {
            global.speechSynthesis.cancel();
        } catch (e0) {}
        ttsSpeechActive = false;
        runStartTts({ text: text, lang: lang, voice: voice, rateMul: rateMul, pitchMul: pitchMul });
    }

    function stop() {
        if (state && state.rafId) {
            try { global.cancelAnimationFrame(state.rafId); } catch (e) {}
        }
        state = null;
        ttsQueued = null;
        try {
            if (global.speechSynthesis) global.speechSynthesis.cancel();
        } catch (e2) {}
        ttsGen++;
        ttsSpeechActive = false;
    }

    function pushMessage(text, doTts, forceChatUi) {
        if (!state || !text) return;
        state.lastLine = text;
        var now = performance.now();
        var minChat = state.chatUiMinMs || 2800;
        var showUi = !!forceChatUi || (now - state.lastChatUiAt >= minChat);
        if (!showUi) return;

        state.lastChatUiAt = now;
        if (state.onMessage) state.onMessage(text);

        if (doTts && state.ttsEnabled) {
            var gap = state.ttsGapMs || 900;
            if (now - state.lastTtsAt > gap) {
                state.lastTtsAt = now;
                var v = resolveVoice(state.textLang, state.voiceURI);
                enqueueSynthTts(text, state.textLang, v, state.ttsRateMul, state.ttsPitchMul);
            }
        }
    }

    function maybeReactive(playerChars, textLen) {
        if (!state || textLen <= 0) return;
        var now = performance.now();
        if (now - state.lastReactiveAt < state.reactiveMs) return;
        var pr = playerChars / textLen;
        var br = state.botChars / textLen;
        var bundle = state.bundle;
        if (pr > br + 0.09) {
            state.lastReactiveAt = now;
            pushMessage(pickLine(bundle, 'playerAhead', state.lastLine), true, false);
        } else if (br > pr + 0.09) {
            state.lastReactiveAt = now;
            pushMessage(pickLine(bundle, 'botAhead', state.lastLine), true, false);
        }
    }

    function getDiff(id) {
        return DIFF[id] || DIFF.medium;
    }

    function tick(ts) {
        if (!state) return;
        if (!state.lastTs) state.lastTs = ts;
        var dt = Math.min(0.22, (ts - state.lastTs) / 1000);
        state.lastTs = ts;
        var now = performance.now();

        if (now < state.pauseUntil) {
            state.rafId = global.requestAnimationFrame(tick);
            return;
        }

        state.burstPhase += dt * (0.75 + Math.random() * 0.55) * state.profile.burstFactor;
        var blo = state.profile.burstLo;
        var brg = state.profile.burstRange;
        state.burstMul = blo + brg * (Math.sin(state.burstPhase) * 0.5 + 0.5);

        if (now > state.nextCpmShiftAt) {
            state.nextCpmShiftAt = now + 1600 + Math.random() * 2200;
            state.targetCpm += (Math.random() - 0.5) * state.profile.cpmWander;
            state.targetCpm = clamp(state.targetCpm, state.cpmClampLo, state.cpmClampHi);
        }

        var pauseChance = (state.difficultyId === 'insane' || state.difficultyId === 'impossible' ? 0.11 : 0.2) * state.profile.pauseMul;
        if (Math.random() < dt * pauseChance) {
            var pm = state.profile.pauseMul;
            state.pauseUntil = now + (120 + Math.random() * 620) * pm;
        }

        var noise = (state.difficultyId === 'insane' || state.difficultyId === 'impossible')
            ? (0.91 + Math.random() * 0.11)
            : (0.84 + Math.random() * 0.3);
        var cps = (state.targetCpm / 60) * state.burstMul * noise * state.profile.jitterMul;
        state.acc += cps * dt;

        while (state.acc >= 1 && state.botChars < state.textLen) {
            state.acc -= 1;
            if (Math.random() < state.typoRate) {
                state.botErrors += 1;
                if (state.onErrors) state.onErrors(state.botErrors);
                pushMessage(pickLine(state.bundle, 'botTypo', state.lastLine), Math.random() < state.profile.sprintChance, false);
            } else {
                state.botChars += 1;
            }
        }

        var pct = state.botChars >= state.textLen ? 100 : Math.floor((state.botChars / state.textLen) * 100);
        if (pct !== state.lastPct) {
            state.lastPct = pct;
            if (state.onProgress) state.onProgress(pct, state.botErrors);
        }

        var ratio = state.botChars / state.textLen;
        if (!state.m25 && ratio >= 0.25) {
            state.m25 = true;
            pushMessage(pickLine(state.bundle, 'mid', state.lastLine), Math.random() < 0.55, true);
        }
        if (!state.m40 && ratio >= 0.40) {
            state.m40 = true;
            pushMessage(randomBanterLine(state.bundle, state.lastLine), Math.random() < 0.5, true);
        }
        if (!state.m55 && ratio >= 0.55) {
            state.m55 = true;
            pushMessage(pickLine(state.bundle, 'mid', state.lastLine), Math.random() < 0.62, true);
        }
        if (!state.m72 && ratio >= 0.72) {
            state.m72 = true;
            pushMessage(randomBanterLine(state.bundle, state.lastLine), Math.random() < 0.58, true);
        }
        if (!state.m88 && ratio >= 0.88) {
            state.m88 = true;
            pushMessage(pickLine(state.bundle, 'sprint', state.lastLine), true, true);
        }

        if (Math.random() < dt * state.profile.chatterPerSec * 1.15) {
            pushMessage(randomBanterLine(state.bundle, state.lastLine), Math.random() < 0.42, false);
        }

        if (now > state.nextIdleAt) {
            var span = state.profile.idleMax - state.profile.idleMin;
            state.nextIdleAt = now + state.profile.idleMin + Math.random() * span;
            if (Math.random() < 0.72) pushMessage(randomBanterLine(state.bundle, state.lastLine), Math.random() < 0.48, false);
        }

        if (state.botChars >= state.textLen) {
            var onBotWin = state.onBotWin;
            stop();
            if (onBotWin) onBotWin();
            return;
        }

        state.rafId = global.requestAnimationFrame(tick);
    }

    function start(config) {
        stop();
        var text = config.text || '';
        var textLang = config.textLang || 'ru';
        var textLen = text.length;
        if (textLen < 1) return;

        var diffId = config.difficulty || 'medium';
        var profile = getDiff(diffId);
        var voiceURI = config.voiceURI || '';

        var fastRoll = diffId === 'impossible' ? 0.9 : diffId === 'insane' ? 0.85 : diffId === 'hard' ? 0.6 : 0.45;
        var burstLo = 0.68;
        var burstRange = 0.4;
        if (diffId === 'hard') {
            burstLo = 0.73;
            burstRange = 0.32;
        } else if (diffId === 'insane') {
            burstLo = 0.8;
            burstRange = 0.22;
        } else if (diffId === 'impossible') {
            burstLo = 0.86;
            burstRange = 0.16;
        }
        var personality = {
            fast: Math.random() < fastRoll,
            jitterMul: (0.88 + Math.random() * 0.26) * (profile.typoMul < 0.5 ? 1.04 : 1),
            burstFactor: 0.95 + Math.random() * 0.2,
            burstLo: burstLo,
            burstRange: burstRange,
            pauseMul: profile.pauseMul,
            sprintChance: profile.sprintChance,
            chatterPerSec: profile.chatterPerSec,
            idleMin: profile.idleMin,
            idleMax: profile.idleMax,
            cpmWander: profile.cpmWander,
            reactiveMs: profile.reactiveMs,
            ttsGap: profile.ttsGap
        };

        var lo = profile.cpmLo + (personality.fast ? 6 : 0);
        var hi = profile.cpmHi + (personality.fast ? 12 : 0);
        if (textLen < 380) {
            lo += 6;
            hi += 10;
        }
        if (textLen > 1300) {
            lo -= 5;
            hi -= 8;
        }
        lo = clamp(lo, 15, 450);
        hi = clamp(hi, lo + 8, 520);

        var base = lo + Math.random() * (hi - lo);

        var typoRate = (0.007 + Math.random() * 0.012) * profile.typoMul;
        typoRate = clamp(typoRate, 0.003, 0.11);

        state = {
            difficultyId: diffId,
            textLen: textLen,
            textLang: textLang,
            voiceURI: voiceURI || null,
            bundle: bundleFor(textLang),
            botChars: 0,
            botErrors: 0,
            acc: Math.random() * 0.45,
            targetCpm: base,
            cpmClampLo: lo - 5,
            cpmClampHi: hi + 5,
            burstPhase: Math.random() * 7,
            burstMul: 1,
            pauseUntil: 0,
            nextCpmShiftAt: performance.now() + 1200,
            typoRate: typoRate,
            profile: personality,
            ttsEnabled: !!config.ttsEnabled,
            ttsGapMs: Math.max(250, profile.ttsGap * 0.85),
            ttsRateMul: diffId === 'novice' || diffId === 'easy' ? 0.96 : diffId === 'impossible' ? 1.08 : 1,
            ttsPitchMul: 1,
            reactiveMs: profile.reactiveMs,
            chatUiMinMs: CHAT_UI_MIN_MS[diffId] || 3000,
            lastChatUiAt: 0,
            onMessage: config.onMessage,
            onProgress: config.onProgress,
            onErrors: config.onErrors,
            onBotWin: config.onBotWin,
            lastTs: 0,
            rafId: null,
            lastPct: -1,
            lastLine: '',
            lastReactiveAt: 0,
            lastTtsAt: 0,
            nextIdleAt: performance.now() + 2200 + Math.random() * 3200,
            m25: false,
            m40: false,
            m55: false,
            m72: false,
            m88: false
        };

        pushMessage(pickLine(state.bundle, 'start', ''), true, true);
        state.rafId = global.requestAnimationFrame(tick);
    }

    function notifyPlayer(charsTyped) {
        if (!state) return;
        maybeReactive(charsTyped || 0, state.textLen);
    }

    function getTtsStored() {
        try {
            return global.localStorage.getItem(STORAGE_TTS) === '1';
        } catch (e) {
            return false;
        }
    }

    function setTtsStored(on) {
        try {
            global.localStorage.setItem(STORAGE_TTS, on ? '1' : '0');
        } catch (e2) {}
    }

    function lineForMatchEnd(botWon, lang) {
        var b = bundleFor(lang);
        return pickLine(b, botWon ? 'botWin' : 'playerWin', '');
    }

    function speakLinePublic(text, lang, voiceURI) {
        var uri = voiceURI;
        if (!uri) {
            try {
                uri = global.localStorage.getItem(STORAGE_VOICE_URI);
            } catch (e) {
                uri = null;
            }
        }
        if (uri === '') uri = null;
        var v = resolveVoice(lang, uri);
        prioritySpeakTts(text, lang, v, 1, 1);
    }

    global.botBattleModule = {
        start: start,
        stop: stop,
        notifyPlayer: notifyPlayer,
        pickBotName: pickBotName,
        getTtsStored: getTtsStored,
        setTtsStored: setTtsStored,
        getVoiceUriStored: getVoiceUriStored,
        setVoiceUriStored: setVoiceUriStored,
        populateVoiceSelect: populateVoiceSelect,
        lineForMatchEnd: lineForMatchEnd,
        speakLine: speakLinePublic
    };
})(typeof window !== 'undefined' ? window : globalThis);
