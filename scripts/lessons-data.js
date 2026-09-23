/**
 * Lessons Data - встроенные данные уроков
 * Система сложности:
 * - beginner: только строчные буквы, без заглавных, без запятых и точек
 * - medium: добавляются заглавные буквы
 * - advanced: заглавные + запятые + точки
 */

const LESSONS_DATA = {
    beginner: {
        level: "beginner",
        name_ru: "Начинающий",
        name_en: "Beginner",
        name_ua: "Початківець",
        description_ru: "Основные позиции и базовые упражнения",
        description_en: "Basic positions and exercises",
        lessons: [
            {
                id: 1,
                name: "Домашний ряд - ФЫВА ОЛДЖ",
                description: "Изучение базовых позиций пальцев",
                layout: "ru",
                text: "фыва олдж фыва олдж фыва олдж фыва олдж фыва олдж фыва олдж фыва олдж фыва олдж",
                difficulty: "easy"
            },
            {
                id: 2,
                name: "Домашний ряд - расширенный",
                description: "Добавляем больше букв",
                layout: "ru",
                text: "фыва олдж фывап олдж фыва олдж асдф фыва олдж фывапролдж фыва олдж асдфг",
                difficulty: "easy"
            },
            {
                id: 3,
                name: "Верхний ряд - основы",
                description: "Учимся набирать верхний ряд",
                layout: "ru",
                text: "йцукен гшщз йцукен гшщз йцукен гшщз фыва олдж йцукен гшщз фыва олдж йцукен",
                difficulty: "easy"
            },
            {
                id: 4,
                name: "Нижний ряд - основы",
                description: "Изучаем нижний ряд клавиатуры",
                layout: "ru",
                text: "ячсмить бюячсм ячсмить бю фыва олдж ячсм фыва олдж ячсмить бюфыва",
                difficulty: "easy"
            },
            {
                id: 5,
                name: "Слова о природе",
                description: "Красота окружающего мира",
                layout: "ru",
                text: "солнце луна звёзды небо облака дождь снег ветер море река озеро гора лес цветы трава дерево",
                difficulty: "easy"
            },
            {
                id: 6,
                name: "Добрые слова",
                description: "Позитивные эмоции",
                layout: "ru",
                text: "улыбка дарит радость доброта делает мир лучше дружба согревает сердце любовь побеждает всё надежда ведёт вперёд",
                difficulty: "easy"
            },
            {
                id: 7,
                name: "Home Row - ASDF JKL;",
                description: "Basic finger positions in English",
                layout: "en",
                text: "asdf jkl asdf jkl asdf jkl asdf jkl asdf jkl asdf jkl asdf jkl asdf jkl asdf",
                difficulty: "easy"
            },
            {
                id: 8,
                name: "Home Row Extended",
                description: "More letters from home row",
                layout: "en",
                text: "asdf jkl asdfg jkl asdf jkl asdfg hjkl asdf jkl asdfgh jkl asdf jkl asdfg",
                difficulty: "easy"
            },
            {
                id: 9,
                name: "Nature Words",
                description: "Beauty around us",
                layout: "en",
                text: "sun moon stars sky cloud rain snow wind sea lake river mountain forest flower grass tree bird",
                difficulty: "easy"
            },
            {
                id: 10,
                name: "Kind Words",
                description: "Positive emotions",
                layout: "en",
                text: "a smile brings joy kindness makes life better friends warm the heart love wins all hope leads forward dreams come true",
                difficulty: "easy"
            },
            {
                id: 101,
                name: "Домашній ряд - ФІВА ОЛДЖ",
                description: "Базові позиції пальців",
                layout: "ua",
                text: "фіва олдж фіва олдж фіва олдж фіва олдж фіва олдж фіва олдж фіва олдж фіва олдж",
                difficulty: "easy"
            },
            {
                id: 102,
                name: "Прості слова",
                description: "Набираємо перші слова",
                layout: "ua",
                text: "дім кіт мама тато вода рука нога день ніч стіл стілець вікно двері лампа книга",
                difficulty: "easy"
            },
            {
                id: 103,
                name: "Добрі слова",
                description: "Позитивні емоції",
                layout: "ua",
                text: "посмішка дарує радість доброта робить світ кращим дружба зігріває серце любов перемагає все надія веде вперед мрії збуваються",
                difficulty: "easy"
            },
            {
                id: 104,
                name: "Українські кольори",
                description: "Краса природи",
                layout: "ua",
                text: "синьо небо зелена трава жовті соняшники білі хмари червона калина золота пшениця",
                difficulty: "easy"
            },
            {
                id: 105,
                name: "Тварини України",
                description: "Фауна нашої країни",
                layout: "ua",
                text: "ведмідь вовк лось олень кабан заєць лисиця білка сова лелека журавель",
                difficulty: "easy"
            },
            {
                id: 11,
                name: "Животные дома",
                description: "Наши питомцы",
                layout: "ru",
                text: "кот собака попугай хомяк рыбка кролик черепаха морская свинка кошки очень умные животные они любят играть и спать собаки верные друзья которые всегда рады хозяину попугаи могут говорить и повторять слова хомяки маленькие и пушистые зверьки рыбки плавают в аквариуме и радуют глаз кролики прыгают и едят морковку черепахи медленные но мудрые животные",
                difficulty: "easy"
            },
            {
                id: 12,
                name: "Фрукты и овощи",
                description: "Полезная еда",
                layout: "ru",
                text: "яблоко банан апельсин помидор огурец морковь картофель капуста яблоки бывают красные зелёные и жёлтые бананы растут на пальмах и очень сладкие апельсины сочные и полезные для здоровья помидоры красные и круглые огурцы зелёные и хрустящие морковь оранжевая и содержит витамины картофель можно варить жарить и запекать капуста идёт в салаты и супы",
                difficulty: "easy"
            },
            {
                id: 13,
                name: "Цвета радуги",
                description: "Яркие краски",
                layout: "ru",
                text: "красный оранжевый жёлтый зелёный голубой синий фиолетовый красный цвет как спелая вишня оранжевый как апельсин жёлтый как солнце зелёный как трава голубой как небо синий как море фиолетовый как слива цвета радуги всегда красивые и яркие они делают мир интереснее и веселее",
                difficulty: "easy"
            },
            {
                id: 14,
                name: "Времена года",
                description: "Смена сезонов",
                layout: "ru",
                text: "весна лето осень зима солнце дождь снег листья весна приносит тепло и цветы лето жаркое и солнечное осень красивая с жёлтыми листьями зима холодная со снегом и льдом солнце светит ярко дождь поливает землю снег покрывает всё белым листья падают с деревьев осенью",
                difficulty: "easy"
            },
            {
                id: 15,
                name: "Спорт и игры",
                description: "Активный отдых",
                layout: "ru",
                text: "футбол баскетбол плавание бег теннис велосипед футбол играют ногами и мячом баскетбол играют руками и корзиной плавание полезно для здоровья бег укрепляет ноги теннис игра с ракеткой велосипед езда на двух колёсах спорт делает нас сильными и здоровыми",
                difficulty: "easy"
            },
            {
                id: 16,
                name: "Музыкальные инструменты",
                description: "Звуки музыки",
                layout: "ru",
                text: "гитара пианино скрипка барабан флейта саксофон гитара имеет струны и играют на ней пальцами пианино большой инструмент с клавишами скрипка маленькая и играют смычком барабан бьют палочками флейта дуют в неё саксофон медный духовой инструмент музыка приносит радость и хорошее настроение",
                difficulty: "easy"
            },
            {
                id: 17,
                name: "Техника и гаджеты",
                description: "Современные устройства",
                layout: "ru",
                text: "компьютер телефон планшет наушники клавиатура мышь компьютер помогает работать и играть телефон для звонков и сообщений планшет удобный для чтения наушники слушают музыку клавиатура для печати текста мышь управляет курсором техника делает жизнь проще и интереснее",
                difficulty: "easy"
            },
            {
                id: 18,
                name: "Транспорт",
                description: "Средства передвижения",
                layout: "ru",
                text: "машина автобус поезд самолёт велосипед мотоцикл машина ездит по дорогам автобус перевозит много людей поезд едет по рельсам самолёт летает в небе велосипед ездит на двух колёсах мотоцикл быстрый и шумный транспорт помогает быстро добраться куда нужно",
                difficulty: "easy"
            },
            {
                id: 19,
                name: "Школьные предметы",
                description: "Учёба",
                layout: "ru",
                text: "математика русский язык история география биология химия физика математика учит считать и решать задачи русский язык учит правильно говорить и писать история рассказывает о прошлом география о странах и городах биология о животных и растениях химия о веществах физика о законах природы",
                difficulty: "easy"
            },
            {
                id: 20,
                name: "Домашние дела",
                description: "Повседневные задачи",
                layout: "ru",
                text: "уборка готовка стирка мытьё посуда пылесос уборка делает дом чистым готовка создаёт вкусную еду стирка чистит одежду мытьё делает всё блестящим посуда должна быть чистой пылесос убирает пыль домашние дела важны для порядка в доме",
                difficulty: "easy"
            },
            {
                id: 21,
                name: "Animals at Home",
                description: "Our pets",
                layout: "en",
                text: "cat dog parrot hamster fish rabbit turtle guinea pig cats are smart animals they love to play and sleep dogs are loyal friends always happy to see you parrots can talk and repeat words hamsters are small and fluffy creatures fish swim in aquariums and look beautiful rabbits jump and eat carrots turtles are slow but wise animals",
                difficulty: "easy"
            },
            {
                id: 22,
                name: "Fruits and Vegetables",
                description: "Healthy food",
                layout: "en",
                text: "apple banana orange tomato cucumber carrot potato cabbage apples can be red green or yellow bananas grow on trees and are very sweet oranges are juicy and good for health tomatoes are red and round cucumbers are green and crispy carrots are orange and have vitamins potatoes can be boiled fried or baked cabbage goes in salads and soups",
                difficulty: "easy"
            },
            {
                id: 23,
                name: "Rainbow Colors",
                description: "Bright colors",
                layout: "en",
                text: "red orange yellow green blue indigo violet red is like a ripe cherry orange like an orange yellow like the sun green like grass blue like sky indigo like deep water violet like a plum rainbow colors are always beautiful and bright they make the world more interesting and fun",
                difficulty: "easy"
            },
            {
                id: 24,
                name: "Seasons",
                description: "Changing weather",
                layout: "en",
                text: "spring summer autumn winter sun rain snow leaves spring brings warmth and flowers summer is hot and sunny autumn is beautiful with yellow leaves winter is cold with snow and ice sun shines brightly rain waters the earth snow covers everything white leaves fall from trees in autumn",
                difficulty: "easy"
            },
            {
                id: 25,
                name: "Sports and Games",
                description: "Active fun",
                layout: "en",
                text: "football basketball swimming running tennis bicycle football is played with feet and a ball basketball is played with hands and a basket swimming is good for health running strengthens legs tennis is played with a racket bicycle has two wheels sport makes us strong and healthy",
                difficulty: "easy"
            },
            {
                id: 106,
                name: "Фрукти та овочі",
                description: "Корисна їжа",
                layout: "ua",
                text: "яблуко банан апельсин помідор огірок морква картопля капуста яблука бувають червоні зелені та жовті банани ростуть на пальмах і дуже солодкі апельсини соковиті та корисні для здоровя помідори червоні та круглі огірки зелені та хрусткі морква помаранчева та містить вітаміни картоплю можна варити смажити та запікати капуста йде в салати та супи",
                difficulty: "easy"
            },
            {
                id: 107,
                name: "Кольори веселки",
                description: "Яскраві фарби",
                layout: "ua",
                text: "червоний помаранчевий жовтий зелений блакитний синій фіолетовий червоний колір як стигла вишня помаранчевий як апельсин жовтий як сонце зелений як трава блакитний як небо синій як море фіолетовий як слива кольори веселки завжди красиві та яскраві вони роблять світ цікавішим та веселішим",
                difficulty: "easy"
            },
            {
                id: 108,
                name: "Пори року",
                description: "Зміна сезонів",
                layout: "ua",
                text: "весна літо осінь зима сонце дощ сніг листя весна приносить тепло та квіти літо спекотне та сонячне осінь красива з жовтим листям зима холодна зі снігом та льодом сонце світить яскраво дощ поливає землю сніг покриває все білим листя падає з дерев восени",
                difficulty: "easy"
            },
            {
                id: 109,
                name: "Спорт та ігри",
                description: "Активний відпочинок",
                layout: "ua",
                text: "футбол баскетбол плавання біг теніс велосипед футбол грають ногами та мячем баскетбол грають руками та кошиком плавання корисне для здоровя біг зміцнює ноги теніс гра з ракеткою велосипед їзда на двох коліщатках спорт робить нас сильними та здоровими",
                difficulty: "easy"
            },
            {
                id: 110,
                name: "Транспорт",
                description: "Засоби пересування",
                layout: "ua",
                text: "машина автобус потяг літак велосипед мотоцикл машина їздить дорогами автобус перевозить багато людей потяг їде рейками літак літає в небі велосипед їздить на двох коліщатках мотоцикл швидкий та шумний транспорт допомагає швидко дістатися куди потрібно",
                difficulty: "easy"
            },
            {
                id: 111,
                name: "Тварини України",
                description: "Фауна та різноманіття",
                layout: "ua",
                text: "ведмідь вовк лисиця білка сова лелека журавель орел сокіл голуб горобець кабан заєць рис олень їжак бобер єнот",
                difficulty: "easy"
            },
            {
                id: 112,
                name: "Птахи та крила",
                description: "Пернаті друзі",
                layout: "ua",
                text: "ластівка лелека журавель орел сокіл голуб горлиця зозуля шпака ворона чайка качка гуска лебідь",
                difficulty: "easy"
            },
            {
                id: 113,
                name: "Квітковий сад",
                description: "Ароматні назви",
                layout: "ua",
                text: "квітка троянда ромашка волошка соняшник жоржина тюльпан барвінок пролісок калина кущ дерево сад",
                difficulty: "easy"
            },
            {
                id: 114,
                name: "Лісова стежка",
                description: "Тиша і природа",
                layout: "ua",
                text: "ліс трава гриб дерево гілка листя мох ягода жолудь пень камінь стежка тінь",
                difficulty: "easy"
            },
            {
                id: 115,
                name: "Море і хвилі",
                description: "Безмежний горизонт",
                layout: "ua",
                text: "море хвиля прибій берег пісок камінь риба дельфін чайка хвіст мушля корабель вітер",
                difficulty: "easy"
            },
            {
                id: 116,
                name: "Річки та озера",
                description: "Вода поруч",
                layout: "ua",
                text: "річка озеро вода струмінь місток човен туман берег хвиля риба міст злива",
                difficulty: "easy"
            },
            {
                id: 117,
                name: "Їжа та смак",
                description: "Смачні слова",
                layout: "ua",
                text: "хліб сир масло молоко яблуко банан апельсин помідор огірок морква картопля капуста вареники борщ сметана",
                difficulty: "easy"
            },
            {
                id: 118,
                name: "Кухонні предмети",
                description: "Тарілки і ложки",
                layout: "ua",
                text: "сковорода каструля ложка вилка тарілка чашка чайник плита духовка ніж дошка кухонний салат суп",
                difficulty: "easy"
            },
            {
                id: 119,
                name: "Місто вогнів",
                description: "Урбаністичні слова",
                layout: "ua",
                text: "місто вулиця будинок площа парк ліхтар неон метро зупинка дорога проспект будні тиша",
                difficulty: "easy"
            },
            {
                id: 120,
                name: "Транспорт навколо",
                description: "Рух і швидкість",
                layout: "ua",
                text: "машина автобус поїзд літак велосипед мотоцикл тролейбус таксі вантажівка маршрутка дорога міст місток колеса",
                difficulty: "easy"
            },
            {
                id: 121,
                name: "Час і календар",
                description: "Вчимося на час",
                layout: "ua",
                text: "день ніч ранок вечір вчора сьогодні завтра секунда хвилина година тиждень місяць рік погода",
                difficulty: "easy"
            },
            {
                id: 122,
                name: "Школа та уроки",
                description: "Класні слова",
                layout: "ua",
                text: "школа клас учитель учень домашнє завдання зошит ручка олівець книга дошка навчання знання",
                difficulty: "easy"
            },
            {
                id: 123,
                name: "Робота і навички",
                description: "Розвиток щодня",
                layout: "ua",
                text: "праця вміння навичка робота старання відповідальність розвиток мета терпіння спокій впевненість результат",
                difficulty: "easy"
            },
            {
                id: 124,
                name: "Емоції та надія",
                description: "Теплі слова",
                layout: "ua",
                text: "радість сміх любов дружба надія віра спокій упевненість натхнення доброта турбота мрія",
                difficulty: "easy"
            },
            {
                id: 125,
                name: "Кольори спектра",
                description: "Палітра без меж",
                layout: "ua",
                text: "синій блакитний зелений жовтий помаранчевий червоний фіолетовий рожевий білий чорний сірий веселка",
                difficulty: "easy"
            },
            {
                id: 126,
                name: "Українська культура",
                description: "Традиції та мистецтво",
                layout: "ua",
                text: "вишиванка писанка орнамент калина пісня кобзар бандура рушник традиція родина серце",
                difficulty: "easy"
            },
            {
                id: 127,
                name: "Козацька слава",
                description: "Історія і воля",
                layout: "ua",
                text: "козак гетьман січ фортеця воля свобода табір кінь шабля козацький степ шлях",
                difficulty: "easy"
            },
            {
                id: 128,
                name: "Спорт і гра",
                description: "Активний день",
                layout: "ua",
                text: "футбол баскетбол теніс гра мяч ракетка біг плавання велосипед швидко спритно легко",
                difficulty: "easy"
            },
            {
                id: 129,
                name: "Домашні улюбленці",
                description: "Тепло в оселі",
                layout: "ua",
                text: "кіт кішка собака пес кролик білка папуга рибка черепаха морська свинка їжак",
                difficulty: "easy"
            },
            {
                id: 130,
                name: "Мрії та думки",
                description: "Вперед до мети",
                layout: "ua",
                text: "мрія думка сила воля шлях мета успіх старання перемога віра радість спокій",
                difficulty: "easy"
            },
            {
                id: 131,
                name: "Комплектовщик складу",
                description: "Про роботу та порядок",
                layout: "ua",
                text: "комплектовщик пакує коробки складає замовлення перевіряє позиції етикетка штрихкод товар склад відправка доставка клієнт",
                difficulty: "easy"
            },
            {
                id: 132,
                name: "Клейщик стикерів",
                description: "Етикетки і акуратність",
                layout: "ua",
                text: "клейщик клею стикер наклейка етикетка клей стрічка папір упаковка товар бренд номер серія коробка",
                difficulty: "easy"
            },
            {
                id: 133,
                name: "Грузчик",
                description: "Вантаж і відповідальність",
                layout: "ua",
                text: "грузчик підіймає ящик вантаж вага доставка склад руки піддон теліжка безпека швидко",
                difficulty: "easy"
            },
            {
                id: 134,
                name: "Продавець",
                description: "Магазин і добрий сервіс",
                layout: "ua",
                text: "продавець магазин вітрина клієнт покупець каса ціна чек товар вибір вдячність посмішка",
                difficulty: "easy"
            },
            {
                id: 135,
                name: "Айтішник",
                description: "Код і щоденна практика",
                layout: "ua",
                text: "айтишник компютер програма код сервер тест відлагодження браузер мережа дані алгоритм знання помилки",
                difficulty: "easy"
            },
            {
                id: 136,
                name: "Водій",
                description: "Маршрут і спокій",
                layout: "ua",
                text: "водій керує машина дорога маршрут зупинка час безпека пасажир поїздка кермо",
                difficulty: "easy"
            },
            {
                id: 137,
                name: "Факти про зорі",
                description: "Нічне небо",
                layout: "ua",
                text: "факт зорі світло ніч небо телескоп всесвіт галактика сяє мерехтить тиша диво",
                difficulty: "easy"
            },
            {
                id: 138,
                name: "Факти про час",
                description: "День за днем",
                layout: "ua",
                text: "факт день ніч ранок вечір сонце місяць хвилина година секунда час цикл повтор",
                difficulty: "easy"
            },
            {
                id: 139,
                name: "Факти про тварин",
                description: "Птахи і звірі",
                layout: "ua",
                text: "факт тварина дельфін кит жаба лисиця білка сова лелека птах вода їжа",
                difficulty: "easy"
            },
            {
                id: 140,
                name: "Факти про рослини",
                description: "Сад і життя",
                layout: "ua",
                text: "факт дерево трава квітка насіння листя корінь сонце волога грунт сад квітне",
                difficulty: "easy"
            },
            {
                id: 141,
                name: "Історія про урок",
                description: "Школа і знання",
                layout: "ua",
                text: "історія школа урок знання учень вчитель зошит ручка олівець книга дошка навчання завдання",
                difficulty: "easy"
            },
            {
                id: 142,
                name: "Історія про працю",
                description: "Старання щодня",
                layout: "ua",
                text: "історія праця робота старання відповідальність терпіння результат спокій впевненість успіх щодня",
                difficulty: "easy"
            },
            {
                id: 143,
                name: "Маленька мандрівка",
                description: "Дорога і спокій",
                layout: "ua",
                text: "історія ранок дорога місто село парк ліс річка місток човен туман поворот",
                difficulty: "easy"
            },
            {
                id: 144,
                name: "Історія про склад",
                description: "Коробки і порядок",
                layout: "ua",
                text: "історія склад коробка товар посилка відправка вантаж руки порядок чекання щиро",
                difficulty: "easy"
            },
            {
                id: 145,
                name: "Кухня щодня",
                description: "Смак і турбота",
                layout: "ua",
                text: "історія кухня суп каша молоко сир хліб чашка ложка тарілка плита смак варю смажу",
                difficulty: "easy"
            },
            {
                id: 146,
                name: "Перукар",
                description: "Зачіска і акуратність",
                layout: "ua",
                text: "перукар волосся зачіска гребінець ножиці шампунь клієнт дзеркало стрижка укладка охайність",
                difficulty: "easy"
            },
            {
                id: 147,
                name: "Маляр",
                description: "Колір і ремонт",
                layout: "ua",
                text: "маляр фарба стіна колір пензель валик ремонт майстер чистота рівна поверхня",
                difficulty: "easy"
            },
            {
                id: 148,
                name: "Механік",
                description: "Мотор і сервіс",
                layout: "ua",
                text: "механік мотор колесо сервіс ремонт інструмент гайка болт ключ двигун безпека",
                difficulty: "easy"
            },
            {
                id: 149,
                name: "Садівник",
                description: "Полив і квіти",
                layout: "ua",
                text: "садівник дерево трава квітка насіння листя полив вода сонце грунт сад квітне",
                difficulty: "easy"
            },
            {
                id: 150,
                name: "Лікар",
                description: "Турбота і здоровя",
                layout: "ua",
                text: "лікар лікує здоровя пацієнт лікарня медсестра турбота ліки шприц допомога спокій",
                difficulty: "easy"
            },
            {
                id: 151,
                name: "Поштар",
                description: "Листи і доставка",
                layout: "ua",
                text: "поштар лист конверт адреса марка пошта номер трек доставка швидко чекання",
                difficulty: "easy"
            },
            {
                id: 152,
                name: "Фотограф",
                description: "Світло і кадр",
                layout: "ua",
                text: "фотограф камера світло кадр фото портрет лінза момент фокус тиша",
                difficulty: "easy"
            },
            {
                id: 153,
                name: "Дизайнер",
                description: "Стиль і ідеї",
                layout: "ua",
                text: "дизайнер макет колір шрифт стиль ідея фон кнопка екран працює",
                difficulty: "easy"
            },
            {
                id: 154,
                name: "Курєр",
                description: "Пакет і дорога",
                layout: "ua",
                text: "курєр пакет доставка адреса дорога час сумка пакування двері підїзд",
                difficulty: "easy"
            },
            {
                id: 155,
                name: "Оператор",
                description: "Заявки і відповідь",
                layout: "ua",
                text: "оператор телефон лінія заявка клієнт відповідає компютер меню система порядок",
                difficulty: "easy"
            },
            {
                id: 156,
                name: "Кондитер",
                description: "Тісто і смак",
                layout: "ua",
                text: "кондитер тісто цукор мед печиво торт кухня смак запах аромат плита",
                difficulty: "easy"
            },
            {
                id: 157,
                name: "Слюсар",
                description: "Ремонт і інструмент",
                layout: "ua",
                text: "слюсар труба кран вода ключ гайка ремонт інструмент майстер будинок сервіс",
                difficulty: "easy"
            },
            {
                id: 158,
                name: "Електрик",
                description: "Світло і безпека",
                layout: "ua",
                text: "електрик провід світло щит кабель розетка безпека вимикач робота",
                difficulty: "easy"
            },
            {
                id: 159,
                name: "Вчитель",
                description: "Учень і урок",
                layout: "ua",
                text: "вчитель урок знання учень клас навчання читання писання пояснює старання",
                difficulty: "easy"
            },
            {
                id: 160,
                name: "Будівельник",
                description: "Цегла і дах",
                layout: "ua",
                text: "будівельник цегла бетон стіна дах ремонт інструмент рівень робота порядок",
                difficulty: "easy"
            },
            {
                id: 26,
                name: "Склад и порядок",
                description: "Про работу и внимательность",
                layout: "ru",
                text: "я работаю на складе внимательно комплектую коробки проверяю метки и аккуратно готовлю посылки для клиентов",
                difficulty: "easy"
            },
            {
                id: 27,
                name: "Клей и стикеры",
                description: "Про наклейки без спешки",
                layout: "ru",
                text: "я клейщик наклеиваю стикеры ровно разглаживаю пленку чтобы не было пузырей и проверяю номер на коробке",
                difficulty: "easy"
            },
            {
                id: 28,
                name: "Груз и безопасность",
                description: "Про аккуратные движения",
                layout: "ru",
                text: "я грузчик поднимаю ящики бережно ставлю поддон точно следую правилам безопасности и работаю спокойно",
                difficulty: "easy"
            },
            {
                id: 29,
                name: "Магазин и чек",
                description: "Про сервис и доброту",
                layout: "ru",
                text: "продавец приветствует клиента помогает выбрать товар и дает понятный чек после покупки улыбка остается надолго",
                difficulty: "easy"
            },
            {
                id: 30,
                name: "Айти практика",
                description: "Про код и порядок мыслей",
                layout: "ru",
                text: "айтишник пишет код запускает тесты ищет ошибки исправляет решение и снова проверяет пока все работает ровно",
                difficulty: "easy"
            },
            {
                id: 31,
                name: "Дорога и время",
                description: "Про маршрут без спешки",
                layout: "ru",
                text: "водитель ведет машину по маршруту держит скорость спокойно думает о безопасности и уважает время каждого дня",
                difficulty: "easy"
            },
            {
                id: 32,
                name: "Факт о море",
                description: "Небо и волны",
                layout: "ru",
                text: "факт море бесконечно волны приносят свежесть звезды сияют далеко и когда учишься печатать настроение становится лучше",
                difficulty: "easy"
            },
            {
                id: 33,
                name: "Факт о лесe",
                description: "Природа рядом",
                layout: "ru",
                text: "в лесу растут деревья трава поют птицы и слышен тихий ветер я смотрю внимательно и запоминаю красоту вокруг",
                difficulty: "easy"
            },
            {
                id: 34,
                name: "История дня",
                description: "Мини рассказ",
                layout: "ru",
                text: "сегодня я учусь печатать дома потом читаю слова вслух делаю короткую паузу и замечаю как растет точность",
                difficulty: "easy"
            },
            {
                id: 35,
                name: "Снова и лучше",
                description: "Про регулярность",
                layout: "ru",
                text: "каждый день я тренируюсь печатаю спокойно сохраняю ошибки в голове и постепенно становлюсь быстрее и точнее",
                difficulty: "easy"
            },
            {
                id: 201,
                name: "Work at the warehouse",
                description: "Packs and labels carefully",
                layout: "en",
                text: "today i work at a warehouse i pack boxes carefully check each label and prepare every order for shipping to customers",
                difficulty: "easy"
            },
            {
                id: 202,
                name: "Sticker maker",
                description: "Smooth and tidy results",
                layout: "en",
                text: "i am a sticker maker i place each label straight smooth the film and double check the number on the box",
                difficulty: "easy"
            },
            {
                id: 203,
                name: "Loading with care",
                description: "Safety first",
                layout: "en",
                text: "i am a loader i lift crates gently set pallets correctly follow safety rules and work without rushing",
                difficulty: "easy"
            },
            {
                id: 204,
                name: "Friendly shop service",
                description: "Help and a clear receipt",
                layout: "en",
                text: "the shop seller greets customers helps them choose the right item prints a receipt and keeps a warm smile",
                difficulty: "easy"
            },
            {
                id: 205,
                name: "Coding every day",
                description: "Fix errors and continue",
                layout: "en",
                text: "an it person writes code runs tests finds bugs fixes the solution and checks again until everything works well",
                difficulty: "easy"
            },
            {
                id: 206,
                name: "Driver calm route",
                description: "Time and safety",
                layout: "en",
                text: "the driver follows the route keeps safe speed stays calm and respects time so each trip feels smooth",
                difficulty: "easy"
            },
            {
                id: 207,
                name: "Fact about the ocean",
                description: "Waves and wonder",
                layout: "en",
                text: "fact the ocean is wide waves bring cool air distant stars shine and learning to type makes the day feel brighter",
                difficulty: "easy"
            },
            {
                id: 208,
                name: "Forest is alive",
                description: "Birds and wind",
                layout: "en",
                text: "in the forest trees grow grass sings birds fly and a quiet wind moves leaves i look carefully and remember the beauty",
                difficulty: "easy"
            },
            {
                id: 209,
                name: "A small morning story",
                description: "Practice and reading",
                layout: "en",
                text: "this morning i practice typing at home then i read words out loud take a short break and notice better accuracy",
                difficulty: "easy"
            },
            {
                id: 210,
                name: "Again and better",
                description: "Regular training",
                layout: "en",
                text: "every day i train calmly keep mistakes in mind and slowly become faster with steady practice and clear focus",
                difficulty: "easy"
            },
            {
                id: 211,
                name: "Цифры: ряд 0–9",
                description: "Быстрый набор чисел и простых комбинаций",
                layout: "ru",
                text: "1 2 3 4 5 6 7 8 9 0 12 34 56 78 90 100 365 1000 2025 42 99 7 3 11 22 33 44 55 66 77 88 99 100 256 512 1024 2048 4096 123 321 789 987 000 111 222 333",
                difficulty: "easy",
                digitsOnly: true
            },
            {
                id: 212,
                name: "Numbers: 0–9 practice",
                description: "Digit row and simple combos",
                layout: "en",
                text: "1 2 3 4 5 6 7 8 9 0 12 34 56 78 90 100 365 1000 2025 42 99 7 3 11 22 33 44 55 66 77 88 99 100 256 512 1024 2048 4096 123 321 789 987 000 111 222 333",
                difficulty: "easy",
                digitsOnly: true
            },
            {
                id: 213,
                name: "Цифри: ряд 0–9",
                description: "Швидкий набір чисел",
                layout: "ua",
                text: "1 2 3 4 5 6 7 8 9 0 12 34 56 78 90 100 365 1000 2025 42 99 7 3 11 22 33 44 55 66 77 88 99 100 256 512 1024 2048 4096 123 321 789 987 000 111 222 333",
                difficulty: "easy",
                digitsOnly: true
            },
            {
                id: 214,
                name: "Цифры: десятки и сотни",
                description: "Ритм 10 · 100 · 1000",
                layout: "ru",
                text: "10 20 30 40 50 60 70 80 90 100 200 300 400 500 600 700 800 900 1000 1100 1500 2000 2500 3000 4000 5000 7500 10000 12500 25000 50000 75000 100000",
                difficulty: "easy",
                digitsOnly: true
            },
            {
                id: 215,
                name: "Numbers: tens and hundreds",
                description: "Steady rhythm 10 · 100 · 1000",
                layout: "en",
                text: "10 20 30 40 50 60 70 80 90 100 200 300 400 500 600 700 800 900 1000 1100 1500 2000 2500 3000 4000 5000 7500 10000 12500 25000 50000 75000 100000",
                difficulty: "easy",
                digitsOnly: true
            },
            {
                id: 216,
                name: "Цифри: десятки та сотні",
                description: "Ритм 10 · 100 · 1000",
                layout: "ua",
                text: "10 20 30 40 50 60 70 80 90 100 200 300 400 500 600 700 800 900 1000 1100 1500 2000 2500 3000 4000 5000 7500 10000 12500 25000 50000 75000 100000",
                difficulty: "easy",
                digitsOnly: true
            },
            {
                id: 217,
                name: "Цифры: пары и повторы",
                description: "Двузначные блоки и зеркала",
                layout: "ru",
                text: "05 07 12 18 24 31 47 52 63 74 88 96 03 30 12 21 45 54 67 76 09 90 101 121 202 303 414 505 616 717 808 909 112 221 334 443 556 665 778 887 998 889",
                difficulty: "easy",
                digitsOnly: true
            },
            {
                id: 218,
                name: "Numbers: pairs and mirrors",
                description: "Two-digit blocks practice",
                layout: "en",
                text: "05 07 12 18 24 31 47 52 63 74 88 96 03 30 12 21 45 54 67 76 09 90 101 121 202 303 414 505 616 717 808 909 112 221 334 443 556 665 778 887 998 889",
                difficulty: "easy",
                digitsOnly: true
            },
            {
                id: 219,
                name: "Цифри: пари та повтори",
                description: "Двозначні комбінації",
                layout: "ua",
                text: "05 07 12 18 24 31 47 52 63 74 88 96 03 30 12 21 45 54 67 76 09 90 101 121 202 303 414 505 616 717 808 909 112 221 334 443 556 665 778 887 998 889",
                difficulty: "easy",
                digitsOnly: true
            },
            {
                id: 220,
                name: "Цифры: тройки подряд",
                description: "Трёхзначные числа без паузы",
                layout: "ru",
                text: "127 256 384 512 640 768 896 135 246 357 468 579 680 791 802 913 024 142 253 364 475 586 697 708 819 920 037 148 259 370 481 592 603 714 825 936 047 158 269 370",
                difficulty: "easy",
                digitsOnly: true
            },
            {
                id: 221,
                name: "Numbers: triple digits",
                description: "Three-digit chunks flow",
                layout: "en",
                text: "127 256 384 512 640 768 896 135 246 357 468 579 680 791 802 913 024 142 253 364 475 586 697 708 819 920 037 148 259 370 481 592 603 714 825 936 047 158 269 370",
                difficulty: "easy",
                digitsOnly: true
            },
            {
                id: 222,
                name: "Цифри: потрійні блоки",
                description: "Три цифри підряд",
                layout: "ua",
                text: "127 256 384 512 640 768 896 135 246 357 468 579 680 791 802 913 024 142 253 364 475 586 697 708 819 920 037 148 259 370 481 592 603 714 825 936 047 158 269 370",
                difficulty: "easy",
                digitsOnly: true
            },
            {
                id: 223,
                name: "Микро: домашний ряд (фикс)",
                description: "Короткая линия без генерации текста",
                layout: "ru",
                text: "фыва олдж фыва олдж фыва олдж фыва олдж фыва олдж фыва олдж фыва олдж фыва олдж",
                difficulty: "easy",
                fixedText: true
            },
            {
                id: 224,
                name: "Micro: home row (fixed)",
                description: "Short line, exact text you see",
                layout: "en",
                text: "asdf jkl asdf jkl asdf jkl asdf jkl asdf jkl asdf jkl asdf jkl asdf jkl",
                difficulty: "easy",
                fixedText: true
            },
            {
                id: 225,
                name: "Мікро: домашній ряд (фікс)",
                description: "Короткий рядок без генерації",
                layout: "ua",
                text: "фіва олдж фіва олдж фіва олдж фіва олдж фіва олдж фіва олдж фіва олдж фіва олдж",
                difficulty: "easy",
                fixedText: true
            },
            {
                id: 226,
                name: "Цифры: короткий поток",
                description: "Компактный набор для фильтра до 100 символов",
                layout: "ru",
                text: "1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 30 40 50 60 70 80 90 99 100",
                difficulty: "easy",
                digitsOnly: true
            },
            {
                id: 227,
                name: "Numbers: short stream",
                description: "Compact digits for quick drills",
                layout: "en",
                text: "1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 30 40 50 60 70 80 90 99 100",
                difficulty: "easy",
                digitsOnly: true
            },
            {
                id: 228,
                name: "Цифри: короткий потік",
                description: "Компактний набір цифр",
                layout: "ua",
                text: "1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 30 40 50 60 70 80 90 99 100",
                difficulty: "easy",
                digitsOnly: true
            }
        ]
    },
    medium: {
        level: "medium",
        name_ru: "Средний",
        name_en: "Medium",
        name_ua: "Середній",
        description_ru: "Усложнённые упражнения с заглавными буквами",
        description_en: "Advanced exercises with capital letters",
        lessons: [
            {
                id: 1,
                name: "Все буквы русского алфавита",
                description: "Практика всех букв",
                layout: "ru",
                text: "Съешь же ещё этих мягких французских булок да выпей чаю Широкая электрификация южных губерний даст мощный толчок подъёму сельского хозяйства",
                difficulty: "medium"
            },
            {
                id: 2,
                name: "Удивительный мир дельфинов",
                description: "Захватывающая история об умнейших существах океана",
                layout: "ru",
                text: "Дельфины спят с открытым одним глазом Это не шутка природы а гениальное эволюционное решение Половина их мозга бодрствует контролируя дыхание пока другая половина отдыхает Через несколько часов полушария меняются местами Представьте что вы могли бы делать домашнее задание одной половиной мозга а другой при этом спать Дельфины общаются с помощью уникальных свистов которые служат как имена Каждый дельфин имеет свой собственный свист подпись который он получает в детстве и сохраняет всю жизнь Они узнают друг друга по этим звукам даже после многих лет разлуки словно мы узнаём голоса старых друзей по телефону",
                difficulty: "medium"
            },
            {
                id: 3,
                name: "Секрет долголетия",
                description: "Жизненно важная информация",
                layout: "ru",
                text: "Учёные выяснили что люди из голубых зон живут дольше всех Их секрет прост натуральная еда движение каждый день крепкие семейные связи и позитивное отношение к жизни Важно не количество лет а качество каждого прожитого дня",
                difficulty: "medium"
            },
            {
                id: 7,
                name: "Смешные факты о животных",
                description: "Забавные истории из мира природы",
                layout: "ru",
                text: "Улитки могут спать до трёх лет подряд Представьте как они просыпаются и думают что же я пропустил Зайцы могут прыгать на высоту до трёх метров это как если бы человек прыгнул на крышу пятиэтажного дома Коровы имеют лучших друзей и расстраиваются когда их разлучают Осьминоги имеют три сердца и синюю кровь они настоящие инопланетяне океана",
                difficulty: "medium"
            },
            {
                id: 8,
                name: "Прикольные истории о еде",
                description: "Интересные факты о продуктах",
                layout: "ru",
                text: "Морковь изначально была фиолетовой а не оранжевой Оранжевую морковь вывели специально в честь голландского короля Бананы это ягоды а клубника нет это очень странно но так устроена ботаника Шоколад был когда то валютой ацтеки использовали какао бобы как деньги Мёд никогда не портится археологи нашли мёд которому три тысячи лет и он всё ещё съедобен",
                difficulty: "medium"
            },
            {
                id: 9,
                name: "Забавные факты о космосе",
                description: "Невероятные космические истории",
                layout: "ru",
                text: "На Сатурне и Юпитере идут дожди из алмазов представьте как там красиво во время грозы В космосе нет звука но если бы был то Солнце ревело бы как реактивный двигатель Один день на Венере длиннее чем один год она очень медленно вращается В космосе можно плакать но слёзы не падают они просто плавают вокруг глаз",
                difficulty: "medium"
            },
            {
                id: 10,
                name: "Смешные истории о технологиях",
                description: "Забавные факты о гаджетах",
                layout: "ru",
                text: "Первый компьютер весил тридцать тонн и занимал целую комнату а сейчас у нас в кармане телефоны мощнее того компьютера Интернет изначально был создан для обмена научными данными а теперь мы смотрим там котиков и мемы Первый смартфон стоил четыре тысячи долларов и мог только звонить сейчас за сто долларов можно купить телефон который делает всё",
                difficulty: "medium"
            },
            {
                id: 11,
                name: "Прикольные факты о человеке",
                description: "Интересные истории о нас самих",
                layout: "ru",
                text: "Человек моргает двадцать тысяч раз в день это как если бы мы закрывали глаза на тридцать минут каждый день За всю жизнь человек проходит расстояние равное пяти оборотам вокруг Земли это очень много шагов Ногти на руках растут быстрее чем на ногах потому что мы чаще используем руки Волосы на голове могут выдержать вес двух слонов но только если их очень много",
                difficulty: "medium"
            },
            {
                id: 12,
                name: "Забавные истории о спорте",
                description: "Смешные спортивные факты",
                layout: "ru",
                text: "Футбольный мяч изначально был сделан из мочевого пузыря свиньи сейчас это звучит странно но раньше так и было В баскетболе изначально не было дриблинга игроки просто стояли и передавали мяч друг другу Самый длинный матч по теннису длился одиннадцать часов и пять минут игроки играли три дня подряд В хоккее шайба может лететь со скоростью сто семьдесят километров в час это быстрее чем едет машина",
                difficulty: "medium"
            },
            {
                id: 13,
                name: "Смешные факты о музыке",
                description: "Забавные музыкальные истории",
                layout: "ru",
                text: "Слушая музыку можно сжечь калории это правда но очень мало примерно как съесть одну конфету Гитара изначально имела четыре струны а не шесть как сейчас Барабанщики тратят столько же энергии сколько футболисты за матч они настоящие спортсмены Слух музыкантов лучше чем у обычных людей они могут различать ноты которые другие не слышат",
                difficulty: "medium"
            },
            {
                id: 14,
                name: "Прикольные истории о путешествиях",
                description: "Интересные факты о странах",
                layout: "ru",
                text: "В Японии есть остров где живут только кролики их там тысячи и они не боятся людей В Норвегии можно бесплатно учиться в университете даже если ты не норвежец В Исландии нет комаров потому что там слишком холодно для них В Швейцарии запрещено иметь только одну морскую свинку потому что им скучно одним",
                difficulty: "medium"
            },
            {
                id: 15,
                name: "Забавные факты о времени",
                description: "Смешные истории о часах и календарях",
                layout: "ru",
                text: "Секунда была придумана в древнем Вавилоне они делили час на шестьдесят частей Високосный год существует потому что Земля вращается не ровно триста шестьдесят пять дней а чуть дольше Самое длинное слово в русском языке имеет сто восемьдесят девять букв но его никто не использует В разных странах неделя начинается в разные дни в некоторых с понедельника в других с воскресенья",
                difficulty: "medium"
            },
            {
                id: 16,
                name: "Смешные истории о языке",
                description: "Забавные лингвистические факты",
                layout: "ru",
                text: "В русском языке есть слова которые состоят только из гласных например ау или уа В английском языке самое длинное слово без гласных это rhythms оно состоит только из согласных В китайском языке один и тот же звук может означать разные вещи в зависимости от тона В эскимосском языке есть двадцать пять слов для обозначения снега потому что снег для них очень важен",
                difficulty: "medium"
            },
            {
                id: 17,
                name: "Прикольные факты о книгах",
                description: "Интересные истории о литературе",
                layout: "ru",
                text: "Самая большая книга в мире весит больше тонны и её страницы сделаны из камня Самая маленькая книга размером с маковое зёрнышко в ней можно прочитать только под микроскопом Первая книга была написана на глиняных табличках в древней Месопотамии В средние века книги были настолько дорогими что их приковывали цепями к полкам чтобы не украли",
                difficulty: "medium"
            },
            {
                id: 18,
                name: "Забавные истории о фильмах",
                description: "Смешные факты о кино",
                layout: "ru",
                text: "В фильме Терминатор робот говорит я вернусь но на самом деле он говорит я буду назад это ошибка перевода Первый фильм длился всего сорок семь секунд и показывал как люди выходят из завода Сейчас фильмы длятся два часа а раньше хватало минуты В Голливуде есть закон что если актёр умирает во время съёмок фильм всё равно должен быть закончен",
                difficulty: "medium"
            },
            {
                id: 19,
                name: "Смешные факты о деньгах",
                description: "Забавные истории о валюте",
                layout: "ru",
                text: "Первые деньги были сделаны из ракушек и они были очень тяжёлыми чтобы их носить В древнем Китае деньги были в виде ножей и лопат это было неудобно но оригинально Бумажные деньги изначально были просто расписками что у тебя есть золото в банке Самая большая монета в мире весит сто килограмм и стоит миллион долларов",
                difficulty: "medium"
            },
            {
                id: 20,
                name: "Прикольные истории о праздниках",
                description: "Интересные факты о торжествах",
                layout: "ru",
                text: "Новый год в разных странах празднуют в разное время когда у нас полночь в Австралии уже утро следующего дня День рождения изначально праздновали только короли простые люди не отмечали свои дни рождения Дед Мороз в разных странах выглядит по разному в России он в синей шубе в Америке в красной В Японии на Новый год едят лапшу потому что она символизирует долгую жизнь",
                difficulty: "medium"
            },
            {
                id: 21,
                name: "Забавные факты о погоде",
                description: "Смешные истории о климате",
                layout: "ru",
                text: "Молния ударяет в землю сто раз в секунду это очень часто но мы не всегда это видим Дождь падает со скоростью тридцать два километра в час это быстрее чем бежит человек Снежинки всегда имеют шесть сторон но никогда не бывают одинаковыми каждая уникальна В пустыне может быть минус двадцать градусов ночью и плюс сорок днём это огромная разница",
                difficulty: "medium"
            },
            {
                id: 22,
                name: "Смешные истории о школе",
                description: "Забавные факты об образовании",
                layout: "ru",
                text: "Раньше в школах не было перемен дети учились целый день без перерыва это было очень тяжело Первый университет был создан больше тысячи лет назад в Марокко он работает до сих пор Домашнее задание изобрели в Италии в шестнадцатом веке и с тех пор дети его не любят В Финляндии школьники не получают домашнее задание и у них лучшие результаты в мире",
                difficulty: "medium"
            },
            {
                id: 23,
                name: "Прикольные факты о играх",
                description: "Интересные истории о развлечениях",
                layout: "ru",
                text: "Шахматы изобрели в Индии больше полутора тысяч лет назад и игра до сих пор популярна Первая компьютерная игра была создана в тысяча девятьсот пятьдесят восьмом году она называлась Теннис для двоих Монополия изначально была создана чтобы показать как плох капитализм но стала самой популярной настольной игрой В видеоиграх персонажи бегают быстрее чем в реальности потому что иначе игра была бы скучной",
                difficulty: "medium"
            },
            {
                id: 24,
                name: "Забавные истории о модах",
                description: "Смешные факты о стиле",
                layout: "ru",
                text: "Раньше каблуки носили мужчины а не женщины это было практично для верховой езды Джинсы изначально были рабочей одеждой для золотоискателей они были очень прочными Галстук изначально был шарфом который носили хорватские солдаты в семнадцатом веке В средние века модно было иметь бледную кожу женщины даже кровопускание делали чтобы стать бледнее",
                difficulty: "medium"
            },
            {
                id: 25,
                name: "Смешные факты о снах",
                description: "Забавные истории о сновидениях",
                layout: "ru",
                text: "Человек видит сны каждую ночь но помнит только последний сон перед пробуждением Во сне мы не можем читать текст если видите во сне книгу попробуйте прочитать и проснётесь Дельфины спят с одним открытым глазом чтобы не утонуть это очень умно Животные тоже видят сны собаки во сне могут лаять и двигать лапами как будто бегут",
                difficulty: "medium"
            },
            {
                id: 4,
                name: "All English Letters",
                description: "Practice all letters",
                layout: "en",
                text: "The quick brown fox jumps over the lazy dog Pack my box with five dozen liquor jugs How vexingly quick daft zebras jump",
                difficulty: "medium"
            },
            {
                id: 5,
                name: "The Amazing Octopus",
                description: "Journey into the world of the smartest invertebrate",
                layout: "en",
                text: "Octopuses have three hearts and blue blood This is not science fiction but incredible reality Two hearts pump blood to the gills while the third pumps it to the rest of the body When an octopus swims the heart that delivers blood to the body stops beating which is why these creatures prefer to crawl rather than swim as it tires them less",
                difficulty: "medium"
            },
            {
                id: 6,
                name: "The Power of Habits",
                description: "Life changing advice",
                layout: "en",
                text: "Small habits create remarkable results over time Reading ten pages daily equals thirty books per year Exercising for twenty minutes builds strength gradually Saving five dollars a day becomes nearly two thousand annually Your daily choices shape your future self",
                difficulty: "medium"
            },
            {
                id: 104,
                name: "Карпатські гори",
                description: "Природа України",
                layout: "ua",
                text: "Карпати вкриті густими лісами та альпійськими луками Тут живуть рідкісні тварини бурі ведмеді рисі та благородні олені Гірські потоки несуть кришталево чисту воду Полонини вкриті барвистими квітами влітку Взимку гори перетворюються на казкову країну снігу",
                difficulty: "medium"
            },
            {
                id: 105,
                name: "Дніпро водна артерія",
                description: "Річка що об'єднує",
                layout: "ua",
                text: "Дніпро третя за довжиною річка Європи після Волги та Дунаю Вона протікає через центр України з'єднуючи північ і південь країни На берегах Дніпра розташовані найбільші міста Київ Дніпро Запоріжжя Херсон Річка живила українські землі століттями даруючи воду для землеробства та рибу для харчування",
                difficulty: "medium"
            },
            {
                id: 106,
                name: "Українська вишиванка",
                description: "Традиції в орнаментах",
                layout: "ua",
                text: "Вишиванка це не просто одяг а справжня енциклопедія українського народу Кожен орнамент має своє значення та розповідає історію Геометричні візерунки символізують родючість землі та врожай Рослинні мотиви втілюють зв'язок з природою Червоний колір означає любов до життя чорний символізує землю та мудрість предків",
                difficulty: "medium"
            },
            {
                id: 107,
                name: "Українська кухня",
                description: "Смаки що з'єднують покоління",
                layout: "ua",
                text: "Український борщ це не просто страва а символ домашнього затишку та родинного тепла Кожна господиня має свій секретний рецепт що передається з покоління в покоління Вареники з вишнями картоплею або сиром вміють готувати в кожній українській родині Сало українці вважають делікатесом який цінується не менше за найвитонченіші закуски",
                difficulty: "medium"
            },
            {
                id: 108,
                name: "Українські писанки",
                description: "Мистецтво на яйці",
                layout: "ua",
                text: "Писанка це унікальне українське мистецтво розпису яєць воском та барвниками що налічує тисячі років історії Кожен символ на писанці має глибоке значення закладене предками Сонце означає життя та енергію зірки символізують долю хрест захист від зла Безкінечник вічність життя дерево зв'язок поколінь",
                difficulty: "medium"
            },
            {
                id: 109,
                name: "Хортиця острів свободи",
                description: "Колиска козацтва",
                layout: "ua",
                text: "Острів Хортиця на Дніпрі найбільший річковий острів Європи став колискою запорізького козацтва Тут розташовувалися перші козацькі січі фортеці свободи серед дніпровських порогів Природні умови острова ідеально підходили для оборони пороги захищали з півдня а густі ліси та болота ховали козацькі табори",
                difficulty: "medium"
            },
            {
                id: 110,
                name: "Львів місто лева",
                description: "Культурна столиця",
                layout: "ua",
                text: "Львів заснований в тисяча двісті п'ятдесят шостому році князем Данилом Галицьким та названий на честь його сина Лева став перехрестям культур де зустрічалися Схід і Захід Старе місто Львова внесене до списку Всесвітньої спадщини ЮНЕСКО зберігає атмосферу середньовічної Європи Бруковані вулиці ведуть до площі Ринок серця міста оточеного кам'яницями різних епох",
                difficulty: "medium"
            },
            {
                id: 121,
                name: "Цікаві факти про Україну",
                description: "Пізнавальна інформація",
                layout: "ua",
                text: "Україна має найбільшу площу в Європі після Росії Українська мова займає друге місце за мелодійністю після італійської Київський метрополітен має найглибшу станцію у світі Арсенальна глибиною сто п'ять метрів Україна є найбільшим експортером соняшників у світі",
                difficulty: "medium"
            },
            {
                id: 122,
                name: "Українські традиції",
                description: "Культурна спадщина",
                layout: "ua",
                text: "Колядки це стародавні пісні які співають на Різдво ходячи по домівках та бажаючи господарям щастя та достатку Гадання на Святого Андрія традиція дівчат яка дозволяє дізнатися про майбутнього нареченого Вінок символ дівоцтва та чистоти який дівчата носять до весілля",
                difficulty: "medium"
            },
            {
                id: 123,
                name: "Українські прислів'я",
                description: "Народна мудрість",
                layout: "ua",
                text: "Тиха вода береги рве означає що тихі люди часто найнебезпечніші Хто рано встає тому Бог дає каже про важливість раннього підйому Добра слава лежить а погана біжить означає що погана новина поширюється швидше",
                difficulty: "medium"
            },
            {
                id: 124,
                name: "Українські народні пісні",
                description: "Музична спадщина",
                layout: "ua",
                text: "Ой у лузі червона калина похилилася ця пісня стала символом боротьби за незалежність Червону калину в садочку посадила символізує любов до рідної землі Їхав козак за Дунай розповідає про козацьку доблесть та відвагу",
                difficulty: "medium"
            },
            {
                id: 125,
                name: "Українські міста",
                description: "Географія країни",
                layout: "ua",
                text: "Київ столиця України заснована в п'ятому столітті один з найстаріших міст Східної Європи Львів культурна столиця з унікальною архітектурою Одеса морська перлина з багатою історією Харків великий промисловий центр Дніпро місто на Дніпрі",
                difficulty: "medium"
            },
            {
                id: 137,
                name: "Гравець без ніка",
                description: "Фінальний режим у темному місті",
                layout: "ua",
                text: "У темному місті де ніч світиться неоном а вулиці нагадують величезну карту гри жив гравець без ніка Ніхто не знав хто він і звідки але всі знали що коли він з'являється починається справжня гра Одного разу система міста дала збій і на небі спалахнуло повідомлення фінальний режим активовано переможе той хто знайде гравця без ніка Сотні мисливців кинулись у темні провулки і на дахи будівель але він рухався швидше знаючи старі секрети карти Коли вони майже наздогнали його на старому мосту він зупинився і активував прихований механізм який ніхто ніколи не помічав Місто на мить завмерло небо потемніло а потім система видала останнє повідомлення переможець визначений І всі гравці раптом зрозуміли що гравець без ніка не тікав від гри він проходив її до кінця І коли світло повернулося його вже не було а на екранах залишився лише напис гра завершена дякуємо за проходження",
                difficulty: "medium"
            },
            {
                id: 30,
                name: "Игрок без ника",
                description: "Финальный режим в тёмном городе",
                layout: "ru",
                text: "В тёмном городе где ночь светится неоном а улицы напоминают огромную карту игры жил игрок без ника Никто не знал кто он и откуда но все знали что когда он появляется начинается настоящая игра Однажды система города дала сбой и на небе вспыхнуло сообщение финальный режим активирован победит тот кто найдёт игрока без ника Сотни охотников кинулись в тёмные переулки и на крыши зданий но он двигался быстрее зная старые секреты карты Когда они почти настигли его на старом мосту он остановился и активировал скрытый механизм который никто никогда не замечал Город на миг замер небо потемнело а потом система выдала последнее сообщение победитель определён И все игроки вдруг поняли что игрок без ника не убегал от игры он проходил её до конца И когда свет вернулся его уже не было а на экранах осталась лишь надпись игра завершена спасибо за прохождение",
                difficulty: "medium"
            },
            {
                id: 138,
                name: "Секретний рівень",
                description: "Забутий сервер під містом",
                layout: "ua",
                text: "У старому підземному комплексі під містом де давно ніхто не був стояв забутий сервер гри Одного разу випадковий гравець знайшов вхід і вирішив зайти всередину Там було темно але в центрі залу світився старий термінал На екрані було написано секретний рівень якщо ти це читаєш значить ти перший хто дійшов сюди Гравець натиснув запуск і двері позаду закрилися почався таймер а навколо ожили старі механізми пастки рухомі стіни і темні коридори Він біг вперед розгадував прості але небезпечні загадки і поступово дістався до останніх дверей Коли таймер показував останні секунди він відкрив їх і натиснув фінальну кнопку У той же момент система видала повідомлення рівень пройдено сервер розблоковано а на екрані з'явився напис переможець лише один І коли гравець вийшов на поверхню сервер остаточно вимкнувся наче цей рівень існував лише для того щоб один раз бути пройденим",
                difficulty: "medium"
            },
            {
                id: 200,
                name: "Комплектування замовлень",
                description: "Праця, порядок, уважність",
                layout: "ua",
                text: "Сьогодні я комплектую замовлення: кожна коробка має етикетку, а товар має своє місце. Я перевіряю позиції й швидко готую посилки до відправки. Усе складається рівно, бо порядок економить час.",
                difficulty: "medium"
            },
            {
                id: 201,
                name: "Історія про продавця",
                description: "Сервіс і доброзичливість",
                layout: "ua",
                text: "У магазині продавець вітає клієнта усмішкою та уважно слухає побажання. Він пропонує вибір, пояснює різницю й формує чек. Коли сервіс простий, покупки стають приємними та зрозумілими.",
                difficulty: "medium"
            },
            {
                id: 202,
                name: "Факт про зорі",
                description: "Далеке світло",
                layout: "ua",
                text: "Нічне небо мерехтить, і кожна зоря світить далеко, крізь час. Телескоп відкриває нові відтінки та дає відчуття масштабу всесвіту. Коли дивишся вгору, думки стають спокійнішими.",
                difficulty: "medium"
            },
            {
                id: 203,
                name: "Подорож водія",
                description: "Маршрут, безпека, спокій",
                layout: "ua",
                text: "Водій стежить за маршрутом і за правилами безпеки. Коли дорога рівна, подорож проходить тихо, без поспіху. Подумки я рахую зупинки й відчуваю, як час минає м'яко.",
                difficulty: "medium"
            },
            {
                id: 204,
                name: "Факт про час",
                description: "Планування щодня",
                layout: "ua",
                text: "Хвилина здається короткою, але саме вона будує звичку. Година встигає розгорнути думки та справи. Тому я планую день і залишаю місце для відпочинку.",
                difficulty: "medium"
            },
            {
                id: 205,
                name: "Урок вчителя",
                description: "Слухати, питати, робити",
                layout: "ua",
                text: "Учень слухає уважно, ставить питання й записує головне. Вчитель пояснює простими словами, а завдання стає ясним кроком. Коли практика триває щодня, знання збираються в міцну картину.",
                difficulty: "medium"
            },
            {
                id: 206,
                name: "Річка і трава",
                description: "Природний ритм",
                layout: "ua",
                text: "Річка тече до моря, а трава росте після дощу. Кожен день має свій ритм, і природа нагадує про терпіння. Достатньо зупинитися та подивитися уважно, щоб помітити красу.",
                difficulty: "medium"
            },
            {
                id: 207,
                name: "Айтішник працює",
                description: "Код і тести",
                layout: "ua",
                text: "Айтішник пише код, запускає програму та перевіряє результат. Якщо з'являється помилка, він аналізує причину та виправляє рішення. Коли все працює, відчувається впевненість і порядок у думках.",
                difficulty: "medium"
            },
            {
                id: 208,
                name: "Факти про тварин",
                description: "Поведінка і дім",
                layout: "ua",
                text: "Дельфін пливе поруч із хвилями й ловить ритм моря. Білка стрибає між гілками та шукає їжу. У кожної істоти є свій спосіб жити, і цей спосіб вартий уваги.",
                difficulty: "medium"
            },
            {
                id: 209,
                name: "Кухня щодня",
                description: "Смак і турбота",
                layout: "ua",
                text: "Коли вариш суп, кухня наповнюється теплим запахом. Смаки збирають родину за столом, а слова стають простішими. Я готую повільно, щоб кожна ложка була вдалою.",
                difficulty: "medium"
            },
            {
                id: 31,
                name: "Секретный уровень",
                description: "Забытый сервер под городом",
                layout: "ru",
                text: "В старом подземном комплексе под городом где давно никто не был стоял забытый сервер игры Однажды случайный игрок нашёл вход и решил зайти внутрь Там было темно но в центре зала светился старый терминал На экране было написано секретный уровень если ты это читаешь значит ты первый кто дошёл сюда Игрок нажал запуск и двери позади закрылись начался таймер а вокруг ожили старые механизмы ловушки движущиеся стены и тёмные коридоры Он бежал вперёд разгадывал простые но опасные загадки и постепенно добрался до последних дверей Когда таймер показывал последние секунды он открыл их и нажал финальную кнопку В тот же момент система выдала сообщение уровень пройден сервер разблокирован а на экране появилась надпись победитель только один И когда игрок вышел на поверхность сервер окончательно выключился словно этот уровень существовал лишь для того чтобы один раз быть пройденным",
                difficulty: "medium"
            },
            {
                id: 500,
                name: "Комплектовка заказов",
                description: "Порядок в каждой коробке",
                layout: "ru",
                text: "Сегодня я комплектую заказ. Я нахожу нужный товар, сверяю метку и аккуратно кладу всё в коробку. Затем я готовлю посылку к отправке и проверяю детали, чтобы ничего не перепутать.",
                difficulty: "medium"
            },
            {
                id: 501,
                name: "Стикеры без ошибок",
                description: "Точность и терпение",
                layout: "ru",
                text: "Я клею стикер ровно и без спешки. Сначала я выравниваю поверхность, потом разглаживаю наклейку, чтобы не осталось пузырей. Номер на упаковке я проверяю два раза.",
                difficulty: "medium"
            },
            {
                id: 502,
                name: "Грузчик и тишина",
                description: "Движения без лишнего шума",
                layout: "ru",
                text: "Грузчик поднимает ящики осторожно. Он ставит поддон на место, следит за безопасностью и работает в своём ритме. Когда склад организован, всё происходит быстрее и спокойнее.",
                difficulty: "medium"
            },
            {
                id: 503,
                name: "Продавец помогает",
                description: "Сервис в деталях",
                layout: "ru",
                text: "Продавец встречает клиента доброжелательно. Он предлагает выбор, поясняет различия и помогает найти подходящий товар. В конце он печатает чек и желает хорошего дня.",
                difficulty: "medium"
            },
            {
                id: 504,
                name: "Айтишник и тест",
                description: "Ошибка превращается в подсказку",
                layout: "ru",
                text: "Айтишник пишет код и запускает тесты. Если появляется ошибка, он читает журнал, ищет причину и исправляет решение. Потом он снова проверяет, пока программа не станет стабильной.",
                difficulty: "medium"
            },
            {
                id: 505,
                name: "Факт о звёздах",
                description: "Ночь и наблюдение",
                layout: "ru",
                text: "Небо ночью выглядит тихим, но в нём идёт вечная история. Звёзды светят далеко, и свет идёт к нам из прошлого. Если поднять голову и понаблюдать, мысли становятся спокойнее.",
                difficulty: "medium"
            },
            {
                id: 506,
                name: "Факт о море",
                description: "Волны меняют настроение",
                layout: "ru",
                text: "Море широкое, и его волны всегда двигаются по-своему. Сегодня ты видишь спокойную гладь, а завтра приходит шторм. Такая перемена напоминает, что ритм важен для обучения.",
                difficulty: "medium"
            },
            {
                id: 507,
                name: "Мини-история о дне",
                description: "Повторение и рост",
                layout: "ru",
                text: "Сначала я печатаю несколько слов медленно. Затем я добавляю скорость, но сохраняю точность. В конце дня я вижу, что прогресс стал заметным, и хочется продолжать ещё раз завтра.",
                difficulty: "medium"
            },
            {
                id: 1500,
                name: "Computer and care",
                description: "A steady routine",
                layout: "en",
                text: "I work step by step every day. First I prepare the computer, then I test the program and look for mistakes. When the code behaves well, I feel calm and ready to type faster.",
                difficulty: "medium"
            },
            {
                id: 1501,
                name: "Seller and service",
                description: "Clear choices",
                layout: "en",
                text: "The seller helps the customer choose the right item. He explains the options and keeps the process friendly. After that he prints the receipt and wishes you a good day.",
                difficulty: "medium"
            },
            {
                id: 1502,
                name: "Facts in the night",
                description: "Stars and silence",
                layout: "en",
                text: "The night sky looks quiet, but it is full of distant light. Stars shine far away, and their light reaches us slowly. Taking a moment to watch can refresh your mind.",
                difficulty: "medium"
            },
            {
                id: 1503,
                name: "Ocean rhythm",
                description: "Waves and focus",
                layout: "en",
                text: "The ocean is wide and the waves move again and again. One day the surface is smooth, and another day the water changes. This rhythm reminds me to keep typing with patience.",
                difficulty: "medium"
            },
            {
                id: 1504,
                name: "Packing carefully",
                description: "Order makes it easy",
                layout: "en",
                text: "I pack boxes carefully and check each label before shipping. Everything has a place, and that makes the work fast and safe. Calm steps help me learn and improve.",
                difficulty: "medium"
            },
            {
                id: 1505,
                name: "Sticker work",
                description: "No bubbles",
                layout: "en",
                text: "I place stickers carefully and smooth the surface. I check the number twice to avoid mistakes. When the label looks neat, the whole package feels better.",
                difficulty: "medium"
            },
            {
                id: 1506,
                name: "A short story",
                description: "Practice grows",
                layout: "en",
                text: "Today I start slowly, focusing on correct letters. Then I continue with steady speed and clear attention. At the end I notice that my accuracy improves, and I want to try again tomorrow.",
                difficulty: "medium"
            },
            {
                id: 1507,
                name: "Driver calm route",
                description: "Rules and calm",
                layout: "en",
                text: "The driver follows the route and keeps safety first. He stays calm, respects the time, and avoids rushing. With a good plan, every trip feels smoother and easier.",
                difficulty: "medium"
            },
            {
                id: 1601,
                name: "Цифры: списки и паузы",
                description: "Только цифры (0-9) и пробелы",
                layout: "ru",
                text: "1 2 3 4 5 6 7 8 9 0 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 30 31 32 33 34 35 40 41 42 43 44 45 50 51 52 53 54 55 60 61 62 63 64 65 2024 365 1000 1010 1111 1212 1313 1414 1515 1616",
                difficulty: "medium",
                digitsOnly: true
            },
            {
                id: 1602,
                name: "Numbers: lists and spacing",
                description: "Digits only (0-9) with spaces",
                layout: "en",
                text: "1 2 3 4 5 6 7 8 9 0 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 30 31 32 33 34 35 40 41 42 43 44 45 50 51 52 53 54 55 60 61 62 63 64 65 2025 365 1000 1001 1111 1212 1313 1414 1515 1616 1717",
                difficulty: "medium",
                digitsOnly: true
            },
            {
                id: 1603,
                name: "Цифри: списки та дати",
                description: "Лише цифри (0-9) та пробіли",
                layout: "ua",
                text: "1 2 3 4 5 6 7 8 9 0 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 30 31 32 33 34 35 40 41 42 43 44 45 50 51 52 53 54 55 60 61 62 63 64 65 2024 365 1000 1010 1111 1212 1313 1414 1515 1616 1717 1818",
                difficulty: "medium",
                digitsOnly: true
            },
            {
                id: 1604,
                name: "Цифры: время и доли",
                description: "Только цифры: HHMM и числа",
                layout: "ru",
                text: "0000 0630 0915 1245 1520 1800 2210 2359 005 010 015 020 025 033 050 066 075 082 090 099 100 025 050 150 275 12125 0100 2024 1234567 0089 0110 0123 0134 0145 0156 0167 0178 0189",
                difficulty: "medium",
                digitsOnly: true
            },
            {
                id: 1605,
                name: "Numbers: time and ratios",
                description: "Digits only: HHMM and numbers",
                layout: "en",
                text: "0000 0630 0915 1245 1520 1800 2210 2359 005 010 015 020 025 033 050 066 075 082 090 099 100 025 050 150 275 12125 0100 2025 1234567 0089 0110 0123 0134 0145 0156 0167 0178 0189",
                difficulty: "medium",
                digitsOnly: true
            },
            {
                id: 1606,
                name: "Цифри: час та частки",
                description: "Лише цифри: HHMM та числа",
                layout: "ua",
                text: "0000 0630 0915 1245 1520 1800 2210 2359 005 010 015 020 025 033 050 066 075 082 090 099 100 025 050 150 275 12125 0100 2026 1234567 0089 0110 0123 0134 0145 0156 0167 0178 0189",
                difficulty: "medium",
                digitsOnly: true
            },
            {
                id: 1607,
                name: "Цифры: телефон и индекс",
                description: "Только цифры: номера и индексы",
                layout: "ru",
                text: "8 800 555 3535 8 495 123 4567 7 912 345 6789 380 44 123 4567 101000 125047 630001 350000 443022 190000 620075 115114 197342 443090 350091 900 200 300 400 500 800 880 960",
                difficulty: "medium",
                digitsOnly: true
            },
            {
                id: 1608,
                name: "Numbers: phone-style groups",
                description: "Digits only: phone-style groups",
                layout: "en",
                text: "1 800 555 01 99 1 212 555 01 00 44 20 7946 0958 49 30 12345678 0800 111 2345 020 7946 0018 00 353 1 234 5678 900 200 300 400 500 600 700 800 900 118 118 999",
                difficulty: "medium",
                digitsOnly: true
            },
            {
                id: 1609,
                name: "Цифри: як у телефоні",
                description: "Групи цифр та коди",
                layout: "ua",
                text: "380 50 123 45 67 380 67 234 56 78 044 123 45 67 032 225 88 99 800 50 50 50 53600 79000 65000 49000 21000 33000 900 300 600 900 800 500 777",
                difficulty: "medium",
                digitsOnly: true
            },
            {
                id: 1610,
                name: "Цифры: длинный ряд 0-9",
                description: "Только цифры и пробелы",
                layout: "ru",
                text: "0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 30 31 32 33 34 35 40 41 42 43 44 45",
                difficulty: "medium",
                digitsOnly: true
            },
            {
                id: 1611,
                name: "Numbers: long 0-9 row",
                description: "Digits only and spaces",
                layout: "en",
                text: "0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 30 31 32 33 34 35 40 41 42 43 44 45",
                difficulty: "medium",
                digitsOnly: true
            },
            {
                id: 1612,
                name: "Цифри: довгий ряд 0-9",
                description: "Лише цифри та пробіли",
                layout: "ua",
                text: "0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 30 31 32 33 34 35 40 41 42 43 44 45",
                difficulty: "medium",
                digitsOnly: true
            },
            {
                id: 1613,
                name: "Цифры: длинные двухзначные",
                description: "Только цифры и пробелы",
                layout: "ru",
                text: "10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 30 31 32 33 34 35 40 41 42 43 44 45 50 51 52 53 54 55 60 61 62 63 64 65",
                difficulty: "medium",
                digitsOnly: true
            },
            {
                id: 1614,
                name: "Numbers: long two-digit sets",
                description: "Digits only and spaces",
                layout: "en",
                text: "10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 30 31 32 33 34 35 40 41 42 43 44 45 50 51 52 53 54 55 60 61 62 63 64 65",
                difficulty: "medium",
                digitsOnly: true
            },
            {
                id: 1615,
                name: "Цифри: довгі двозначні набори",
                description: "Лише цифри та пробіли",
                layout: "ua",
                text: "10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 30 31 32 33 34 35 40 41 42 43 44 45 50 51 52 53 54 55 60 61 62 63 64 65",
                difficulty: "medium",
                digitsOnly: true
            }
        ]
    },
    advanced: {
        level: "advanced",
        name_ru: "Продвинутый",
        name_en: "Advanced",
        name_ua: "Просунутий",
        description_ru: "Сложные тексты с заглавными буквами, запятыми и точками",
        description_en: "Complex texts with capital letters, commas and periods",
        lessons: [
            {
                id: 1,
                name: "Код: JavaScript",
                description: "Набор кода на JavaScript",
                layout: "en",
                text: "function calculateSum(arr) { return arr.reduce((acc, curr) => acc + curr, 0); } const result = calculateSum([1, 2, 3, 4, 5]); console.log(result);",
                difficulty: "hard"
            },
            {
                id: 2,
                name: "Код: Python",
                description: "Набор кода на Python",
                layout: "en",
                text: "def calculate_sum(arr): return sum(arr) result = calculate_sum([1, 2, 3, 4, 5]) print(result) for i in range(10): print(i)",
                difficulty: "hard"
            },
            {
                id: 3,
                name: "JSON структура",
                description: "Набор JSON данных",
                layout: "en",
                text: "{name: John, age: 30, city: New York, hobbies: [reading, swimming], active: true}",
                difficulty: "hard"
            },
            {
                id: 4,
                name: "Специальные символы",
                description: "Практика спецсимволов",
                layout: "en",
                text: "@#$%^&*()_+-=[]{}|\\:;<>,.?/~` email@example.com https://website.com/path?param=value&other=123",
                difficulty: "hard"
            },
            {
                id: 5,
                name: "Тайны человеческого мозга",
                description: "Путешествие в самый загадочный орган",
                layout: "ru",
                text: "Ваш мозг потребляет двадцать процентов всей энергии тела, хотя весит всего два процента от общей массы. Это похоже на маленький суперкомпьютер, который требует огромного количества электричества для работы. Каждую секунду в нём происходит сто тысяч химических реакций, создавая миллиарды электрических импульсов. Нейроны передают сигналы со скоростью до четырёхсот километров в час, быстрее многих гоночных автомобилей.",
                difficulty: "hard"
            },
            {
                id: 6,
                name: "Загадка Бермудского треугольника",
                description: "Мистические истории",
                layout: "ru",
                text: "В районе Бермудских островов бесследно исчезли сотни кораблей и самолётов. Учёные предлагают разные объяснения: магнитные аномалии, метановые пузыри из океанского дна, внезапные штормы. Но некоторые случаи до сих пор остаются загадкой, порождая множество теорий и легенд.",
                difficulty: "hard"
            },
            {
                id: 7,
                name: "Смешные факты о животных",
                description: "Забавные истории из мира природы",
                layout: "ru",
                text: "Улитки могут спать до трёх лет подряд. Представьте, как они просыпаются и думают: что же я пропустил? Зайцы могут прыгать на высоту до трёх метров - это как если бы человек прыгнул на крышу пятиэтажного дома. Коровы имеют лучших друзей и расстраиваются, когда их разлучают. Осьминоги имеют три сердца и синюю кровь - они настоящие инопланетяне океана.",
                difficulty: "hard"
            },
            {
                id: 8,
                name: "Прикольные истории о еде",
                description: "Интересные факты о продуктах",
                layout: "ru",
                text: "Морковь изначально была фиолетовой, а не оранжевой. Оранжевую морковь вывели специально в честь голландского короля. Бананы - это ягоды, а клубника - нет. Это очень странно, но так устроена ботаника. Шоколад был когда-то валютой - ацтеки использовали какао-бобы как деньги. Мёд никогда не портится - археологи нашли мёд, которому три тысячи лет, и он всё ещё съедобен.",
                difficulty: "hard"
            },
            {
                id: 9,
                name: "Забавные факты о космосе",
                description: "Невероятные космические истории",
                layout: "ru",
                text: "На Сатурне и Юпитере идут дожди из алмазов - представьте, как там красиво во время грозы! В космосе нет звука, но если бы был, то Солнце ревело бы как реактивный двигатель. Один день на Венере длиннее, чем один год - она очень медленно вращается. В космосе можно плакать, но слёзы не падают - они просто плавают вокруг глаз.",
                difficulty: "hard"
            },
            {
                id: 10,
                name: "Смешные истории о технологиях",
                description: "Забавные факты о гаджетах",
                layout: "ru",
                text: "Первый компьютер весил тридцать тонн и занимал целую комнату, а сейчас у нас в кармане телефоны мощнее того компьютера. Интернет изначально был создан для обмена научными данными, а теперь мы смотрим там котиков и мемы. Первый смартфон стоил четыре тысячи долларов и мог только звонить - сейчас за сто долларов можно купить телефон, который делает всё.",
                difficulty: "hard"
            },
            {
                id: 11,
                name: "Прикольные факты о человеке",
                description: "Интересные истории о нас самих",
                layout: "ru",
                text: "Человек моргает двадцать тысяч раз в день - это как если бы мы закрывали глаза на тридцать минут каждый день. За всю жизнь человек проходит расстояние, равное пяти оборотам вокруг Земли - это очень много шагов! Ногти на руках растут быстрее, чем на ногах, потому что мы чаще используем руки. Волосы на голове могут выдержать вес двух слонов, но только если их очень много.",
                difficulty: "hard"
            },
            {
                id: 12,
                name: "Забавные истории о спорте",
                description: "Смешные спортивные факты",
                layout: "ru",
                text: "Футбольный мяч изначально был сделан из мочевого пузыря свиньи - сейчас это звучит странно, но раньше так и было. В баскетболе изначально не было дриблинга - игроки просто стояли и передавали мяч друг другу. Самый длинный матч по теннису длился одиннадцать часов и пять минут - игроки играли три дня подряд! В хоккее шайба может лететь со скоростью сто семьдесят километров в час - это быстрее, чем едет машина.",
                difficulty: "hard"
            },
            {
                id: 13,
                name: "Смешные факты о музыке",
                description: "Забавные музыкальные истории",
                layout: "ru",
                text: "Слушая музыку, можно сжечь калории - это правда, но очень мало, примерно как съесть одну конфету. Гитара изначально имела четыре струны, а не шесть, как сейчас. Барабанщики тратят столько же энергии, сколько футболисты за матч - они настоящие спортсмены! Слух музыкантов лучше, чем у обычных людей - они могут различать ноты, которые другие не слышат.",
                difficulty: "hard"
            },
            {
                id: 14,
                name: "Прикольные истории о путешествиях",
                description: "Интересные факты о странах",
                layout: "ru",
                text: "В Японии есть остров, где живут только кролики - их там тысячи, и они не боятся людей. В Норвегии можно бесплатно учиться в университете, даже если ты не норвежец. В Исландии нет комаров, потому что там слишком холодно для них. В Швейцарии запрещено иметь только одну морскую свинку, потому что им скучно одним.",
                difficulty: "hard"
            },
            {
                id: 15,
                name: "Забавные факты о времени",
                description: "Смешные истории о часах и календарях",
                layout: "ru",
                text: "Секунда была придумана в древнем Вавилоне - они делили час на шестьдесят частей. Високосный год существует, потому что Земля вращается не ровно триста шестьдесят пять дней, а чуть дольше. Самое длинное слово в русском языке имеет сто восемьдесят девять букв, но его никто не использует. В разных странах неделя начинается в разные дни - в некоторых с понедельника, в других с воскресенья.",
                difficulty: "hard"
            },
            {
                id: 16,
                name: "Смешные истории о языке",
                description: "Забавные лингвистические факты",
                layout: "ru",
                text: "В русском языке есть слова, которые состоят только из гласных - например, ау или уа. В английском языке самое длинное слово без гласных - это rhythms, оно состоит только из согласных. В китайском языке один и тот же звук может означать разные вещи в зависимости от тона. В эскимосском языке есть двадцать пять слов для обозначения снега, потому что снег для них очень важен.",
                difficulty: "hard"
            },
            {
                id: 17,
                name: "Прикольные факты о книгах",
                description: "Интересные истории о литературе",
                layout: "ru",
                text: "Самая большая книга в мире весит больше тонны, и её страницы сделаны из камня. Самая маленькая книга размером с маковое зёрнышко - в ней можно прочитать только под микроскопом. Первая книга была написана на глиняных табличках в древней Месопотамии. В средние века книги были настолько дорогими, что их приковывали цепями к полкам, чтобы не украли.",
                difficulty: "hard"
            },
            {
                id: 18,
                name: "Забавные истории о фильмах",
                description: "Смешные факты о кино",
                layout: "ru",
                text: "В фильме Терминатор робот говорит я вернусь, но на самом деле он говорит я буду назад - это ошибка перевода. Первый фильм длился всего сорок семь секунд и показывал, как люди выходят из завода. Сейчас фильмы длятся два часа, а раньше хватало минуты. В Голливуде есть закон, что если актёр умирает во время съёмок, фильм всё равно должен быть закончен.",
                difficulty: "hard"
            },
            {
                id: 19,
                name: "Смешные факты о деньгах",
                description: "Забавные истории о валюте",
                layout: "ru",
                text: "Первые деньги были сделаны из ракушек, и они были очень тяжёлыми, чтобы их носить. В древнем Китае деньги были в виде ножей и лопат - это было неудобно, но оригинально. Бумажные деньги изначально были просто расписками, что у тебя есть золото в банке. Самая большая монета в мире весит сто килограмм и стоит миллион долларов.",
                difficulty: "hard"
            },
            {
                id: 20,
                name: "Прикольные истории о праздниках",
                description: "Интересные факты о торжествах",
                layout: "ru",
                text: "Новый год в разных странах празднуют в разное время - когда у нас полночь, в Австралии уже утро следующего дня. День рождения изначально праздновали только короли - простые люди не отмечали свои дни рождения. Дед Мороз в разных странах выглядит по-разному - в России он в синей шубе, в Америке в красной. В Японии на Новый год едят лапшу, потому что она символизирует долгую жизнь.",
                difficulty: "hard"
            },
            {
                id: 21,
                name: "Забавные факты о погоде",
                description: "Смешные истории о климате",
                layout: "ru",
                text: "Молния ударяет в землю сто раз в секунду - это очень часто, но мы не всегда это видим. Дождь падает со скоростью тридцать два километра в час - это быстрее, чем бежит человек. Снежинки всегда имеют шесть сторон, но никогда не бывают одинаковыми - каждая уникальна. В пустыне может быть минус двадцать градусов ночью и плюс сорок днём - это огромная разница!",
                difficulty: "hard"
            },
            {
                id: 22,
                name: "Смешные истории о школе",
                description: "Забавные факты об образовании",
                layout: "ru",
                text: "Раньше в школах не было перемен - дети учились целый день без перерыва, это было очень тяжело. Первый университет был создан больше тысячи лет назад в Марокко - он работает до сих пор. Домашнее задание изобрели в Италии в шестнадцатом веке, и с тех пор дети его не любят. В Финляндии школьники не получают домашнее задание, и у них лучшие результаты в мире.",
                difficulty: "hard"
            },
            {
                id: 23,
                name: "Прикольные факты о играх",
                description: "Интересные истории о развлечениях",
                layout: "ru",
                text: "Шахматы изобрели в Индии больше полутора тысяч лет назад, и игра до сих пор популярна. Первая компьютерная игра была создана в тысяча девятьсот пятьдесят восьмом году - она называлась Теннис для двоих. Монополия изначально была создана, чтобы показать, как плох капитализм, но стала самой популярной настольной игрой. В видеоиграх персонажи бегают быстрее, чем в реальности, потому что иначе игра была бы скучной.",
                difficulty: "hard"
            },
            {
                id: 24,
                name: "Забавные истории о модах",
                description: "Смешные факты о стиле",
                layout: "ru",
                text: "Раньше каблуки носили мужчины, а не женщины - это было практично для верховой езды. Джинсы изначально были рабочей одеждой для золотоискателей - они были очень прочными. Галстук изначально был шарфом, который носили хорватские солдаты в семнадцатом веке. В средние века модно было иметь бледную кожу - женщины даже кровопускание делали, чтобы стать бледнее.",
                difficulty: "hard"
            },
            {
                id: 25,
                name: "Смешные факты о снах",
                description: "Забавные истории о сновидениях",
                layout: "ru",
                text: "Человек видит сны каждую ночь, но помнит только последний сон перед пробуждением. Во сне мы не можем читать текст - если видите во сне книгу, попробуйте прочитать и проснётесь. Дельфины спят с одним открытым глазом, чтобы не утонуть - это очень умно. Животные тоже видят сны - собаки во сне могут лаять и двигать лапами, как будто бегут.",
                difficulty: "hard"
            },
            {
                id: 26,
                name: "Прикольные истории о науке",
                description: "Интересные научные факты",
                layout: "ru",
                text: "Ньютон открыл закон тяготения, когда ему на голову упало яблоко - это самая известная история в науке. Эйнштейн не мог запомнить свой номер телефона, потому что говорил, что его можно найти в телефонной книге. Первый калькулятор был размером с комнату и работал на механических шестерёнках. Учёные до сих пор не знают, почему мы зеваем - есть много теорий, но точного ответа нет.",
                difficulty: "hard"
            },
            {
                id: 27,
                name: "Забавные факты о истории",
                description: "Смешные исторические истории",
                layout: "ru",
                text: "В древнем Риме люди использовали губки на палках вместо туалетной бумаги - это было не очень гигиенично. Наполеон был невысоким, но это миф - на самом деле он был среднего роста для того времени. В средние века люди думали, что помидоры ядовиты, и выращивали их только для красоты. Первая пицца была создана в Италии, но изначально это была еда для бедных.",
                difficulty: "hard"
            },
            {
                id: 28,
                name: "Смешные истории о медицине",
                description: "Забавные медицинские факты",
                layout: "ru",
                text: "Раньше врачи думали, что кровопускание лечит все болезни - это было очень опасно. Первая операция под наркозом была проведена в тысяча восемьсот сорок шестом году - до этого люди терпели боль. Аспирин изначально был сделан из коры ивы - древние люди жевали кору, чтобы снять боль. Врачи до сих пор не знают, почему мы смеёмся - это одна из загадок человеческого организма.",
                difficulty: "hard"
            },
            {
                id: 7,
                name: "Ancient Egypt Mysteries",
                description: "Historical discoveries",
                layout: "en",
                text: "The Great Pyramid was built with such precision that modern engineers struggle to replicate it. Ancient Egyptians performed complex brain surgery and created early forms of antibiotics. Cleopatra lived closer to our time than to the pyramid construction. Their knowledge of astronomy helped predict Nile floods with remarkable accuracy.",
                difficulty: "hard"
            },
            {
                id: 8,
                name: "The Psychology of Success",
                description: "Mind science insights",
                layout: "en",
                text: "Successful people share common traits beyond talent. They embrace failure as learning opportunities. Morning routines set productive momentum for entire days. Visualization techniques activate the same brain regions as actual practice. Surrounding yourself with ambitious people naturally elevates your own standards and achievements.",
                difficulty: "hard"
            },
            {
                id: 111,
                name: "Київська Русь",
                description: "Витоки державності",
                layout: "ua",
                text: "Київська Русь була могутньою середньовічною державою, що існувала з дев'ятого по тринадцяте століття. Столиця Київ був одним з найбільших та найбагатших міст Європи того часу. Тут налічувалося понад чотириста церков та вісім ринків. Володимир Великий хрестив Русь у дев'ятсот вісімдесят вісьмому році, що відкрило шлях до європейської цивілізації. Ярослав Мудрий створив перший писемний звід законів Руську Правду.",
                difficulty: "hard"
            },
            {
                id: 112,
                name: "Козацька слава",
                description: "Захисники свободи",
                layout: "ua",
                text: "Запорізька Січ була унікальним явищем в історії Європи демократичною військовою республікою. Козаки обирали свого гетьмана на загальній раді, де кожен мав право голосу. Вони захищали українські землі від набігів татар та турків, ризикуючи життям заради свободи народу. Козацька доблесть стала легендою. Богдан Хмельницький підняв повстання проти польського гніту та створив козацьку державу.",
                difficulty: "hard"
            },
            {
                id: 113,
                name: "Тарас Шевченко",
                description: "Великий Кобзар України",
                layout: "ua",
                text: "Тарас Григорович Шевченко народився в родині кріпаків тисяча вісімсот чотирнадцятого року. Дитинство в неволі загартувало його дух та наповнило серце жагою до свободи. Талант до малювання врятував його, коли друзі викупили Тараса з кріпацтва. Він здобув освіту в Академії мистецтв у Санкт-Петербурзі, де розквітнув його художній талант. Але справжню славу принесла йому поезія. Збірка Кобзар стала маніфестом українського національного відродження.",
                difficulty: "hard"
            },
            {
                id: 114,
                name: "Софія Київська",
                description: "Перлина архітектури",
                layout: "ua",
                text: "Софійський собор в Києві, побудований в одинадцятому столітті за часів Ярослава Мудрого, став символом могутності Київської Русі. Собор названий на честь храму Святої Софії в Константинополі, підкреслюючи зв'язок з Візантією. Тринадцять куполів собору символізують Христа та дванадцять апостолів. Всередині зберігся унікальний комплекс мозаїк та фресок одинадцятого століття площею понад двісті шістдесят квадратних метрів.",
                difficulty: "hard"
            },
            {
                id: 115,
                name: "Бандура душа України",
                description: "Інструмент що співає",
                layout: "ua",
                text: "Бандура унікальний український струнний інструмент, що поєднує риси лютні та гуслів, налічує від тридцяти до шістдесяти струн. Кобзарі мандрівні співці грали на бандурі та передавали історичні думи про козацьку славу, героїчні битви та народні страждання. Вони були живою пам'яттю народу, зберігаючи в піснях те, що не змогли записати літописи. Радянська влада боялася кобзарів як носіїв національної свідомості та піддавала їх репресіям.",
                difficulty: "hard"
            },
            {
                id: 116,
                name: "Голодомор народна трагедія",
                description: "Пам'ять що не згасне",
                layout: "ua",
                text: "Голодомор тисяча дев'ятсот тридцять другого тридцять третього років, штучно організований радянською владою голод, забрав життя мільйонів українців. Село позбавили зерна, худоби, насіння, навіть городини. Люди помирали посеред родючих чорноземів, на яких могла б годуватися вся Європа. Селянам забороняли виїжджати з голодуючих сіл, щоб приховати масштаби трагедії від світу. НКВС конфісковувало останні крихти їжі, засуджуючи цілі родини на смерть.",
                difficulty: "hard"
            },
            {
                id: 117,
                name: "Мова що оживає",
                description: "Відродження української",
                layout: "ua",
                text: "Українська мова витримала століття утисків, заборон та русифікації, але не зламалася. Емський указ тисяча вісімсот сімдесят шостого року заборонив друкувати книги українською мовою, окрім художньої літератури. Радянська влада спочатку підтримувала українізацію, а потім жорстоко придушила її, репресуючи інтелігенцію. Українську витісняли зі шкіл, університетів, офіційного вжитку. Але мова жила в селах, у піснях, у серцях патріотів. З здобуттям незалежності почалося відродження української в усіх сферах життя.",
                difficulty: "hard"
            },
            {
                id: 118,
                name: "Майдан воля народу",
                description: "Революція гідності",
                layout: "ua",
                text: "Листопад дві тисячі тринадцятого року Київ вийшов на Майдан Незалежності, протестуючи проти відмови влади підписати угоду про асоціацію з Європейським Союзом. Студенти та молодь першими стали в центрі міста, вимагаючи європейського шляху для України. Жорстокий розгін мирного протесту силовиками розпалив полум'я революції. Сотні тисяч людей прийшли підтримати Майдан, принісши з собою намети, їжу, дрова. Зимою люди стояли на морозі, співали гімн та вірили в перемогу справедливості.",
                difficulty: "hard"
            },
            {
                id: 119,
                name: "Чорнобильська катастрофа",
                description: "Урок для людства",
                layout: "ua",
                text: "Двадцять шостого квітня тисяча дев'ятсот вісімдесят шостого року сталася найбільша техногенна катастрофа в історії. Вибух на четвертому енергоблоці Чорнобильської АЕС викинув у атмосферу величезну кількість радіоактивних речовин. Пожежники та ліквідатори героїчно боролися з вогнем, не знаючи про смертельну небезпеку радіації. Багато з них загинули від променевої хвороби, ставши справжніми героями. Тридцять кілометрову зону довкола станції евакуювали, люди залишили свої домівки назавжди.",
                difficulty: "hard"
            },
            {
                id: 120,
                name: "Україна сьогодні",
                description: "Шлях до майбутнього",
                layout: "ua",
                text: "Україна молода незалежна держава, що здобула свободу в тисяча дев'ятсот дев'яносто першому році після розпаду Радянського Союзу. Шлях до справжньої незалежності виявився складним і болісним. Дві революції Помаранчева та Революція Гідності показали прагнення народу до демократії та європейських цінностей. Російська агресія, анексія Криму та війна на Донбасі стали випробуванням на міцність молодої нації. Українці довели свою готовність захищати свободу та незалежність ціною власного життя. Країна реформується, змінює економіку, бореться з корупцією, будує громадянське суспільство.",
                difficulty: "hard"
            },
            {
                id: 126,
                name: "Українські анекдоти",
                description: "Народний гумор",
                layout: "ua",
                text: "Приходить козак до гетьмана та каже: Гетьмане, татари напали! А гетьман йому: А чому ти не сказав раніше? А козак: Та я ж тільки що приїхав! Або ще один: Чому українці так люблять сало? Бо воно не тільки смачне, а й не потребує холодильника. А найкращий: Що таке українська мрія? Щоб сусід не мав кращого сала.",
                difficulty: "hard"
            },
            {
                id: 127,
                name: "Текст пісні Ой у лузі червона калина",
                description: "Легендарна пісня",
                layout: "ua",
                text: "Ой у лузі червона калина похилилася, Чогось наша славна Україна зажурилася. А ми тую червону калину підіймемо, А ми нашу славну Україну, гей, гей, розвеселимо! Не хилися, червона калино, маєш білий цвіт, Не журися, славна Україно, маєш вільний рід. А ми тую червону калину підіймемо, А ми нашу славну Україну, гей, гей, розвеселимо!",
                difficulty: "hard"
            },
            {
                id: 128,
                name: "Текст пісні Їхав козак за Дунай",
                description: "Козацька пісня",
                layout: "ua",
                text: "Їхав козак за Дунай, сказав: Дівчино, прощай! Ти, конику вороненький, неси та гуляй! Постій, постій, мій козаче, твоя дівчина плаче. Як же мені не плакати, як же не журитись, Коли мій милий поїхав, не сказав де з'явиться. Постій, постій, мій козаче, твоя дівчина плаче.",
                difficulty: "hard"
            },
            {
                id: 129,
                name: "Цікаві факти про українську мову",
                description: "Мовознавство",
                layout: "ua",
                text: "Українська мова належить до слов'янської групи індоєвропейської сім'ї мов. Вона має багато спільного з білоруською та російською, але має свої унікальні особливості. Українська мова має сім відмінків, тоді як багато інших мов мають менше. Найдовше слово в українській мові досягає двадцяти восьми літер. Українська мова має три форми майбутнього часу, що робить її унікальною серед слов'янських мов.",
                difficulty: "hard"
            },
            {
                id: 130,
                name: "Історія українського козацтва",
                description: "Воєнна історія",
                layout: "ua",
                text: "Українське козацтво виникло в п'ятнадцятому столітті як вільне військове товариство. Козаки захищали кордони Речі Посполитої від татарських набігів. Запорізька Січ була центром козацької держави, де козаки жили за демократичними принципами. Вони обирали свого отамана та гетьмана, приймали рішення на загальних радах. Козаки брали участь у багатьох війнах, включаючи Тридцятирічну війну та війни з Османською імперією. Їхня слава про мужність та відвагу поширилася по всій Європі.",
                difficulty: "hard"
            },
            {
                id: 131,
                name: "Українська література",
                description: "Літературна спадщина",
                layout: "ua",
                text: "Українська література має багатовікову історію, починаючи з часів Київської Русі. Слово о полку Ігоревім один з найстаріших пам'ятників східнослов'янської літератури. Тарас Шевченко вважається засновником сучасної української літератури. Його збірка Кобзар стала символом національного відродження. Іван Франко, Леся Українка, Михайло Коцюбинський та інші письменники зробили великий внесок у розвиток української літератури. Сучасні українські письменники продовжують традиції та створюють нові твори.",
                difficulty: "hard"
            },
            {
                id: 132,
                name: "Українські свята та традиції",
                description: "Культурні обряди",
                layout: "ua",
                text: "Різдво в Україні святкується сьомого січня за юліанським календарем. Святий вечір перед Різдвом називається Святвечір, коли родина збирається за столом з дванадцятьма стравами. Великдень головне свято християнського календаря, яке супроводжується багатьма традиціями, включаючи писанки та паски. Івана Купала літнє свято з вогнями, вінками та гаданнями. Масляна свято перед Великим постом з млинцями та веселощами.",
                difficulty: "hard"
            },
            {
                id: 133,
                name: "Українська музика",
                description: "Музична культура",
                layout: "ua",
                text: "Українська музика має багату історію, починаючи з народних пісень та кобзарського мистецтва. Бандура, кобза, сопілка традиційні українські інструменти. Українські композитори, такі як Микола Лисенко, Сергій Прокоф'єв, Дмитро Бортнянський, зробили великий внесок у світову музику. Сучасна українська музика включає різні жанри від року до електронної музики. Українські виконавці завоювали визнання на міжнародній арені.",
                difficulty: "hard"
            },
            {
                id: 134,
                name: "Українська кухня детально",
                description: "Кулінарні традиції",
                layout: "ua",
                text: "Борщ найвідоміша українська страва, яка має безліч варіантів. Червоний борщ готується з буряка, капусти, картоплі, моркви та м'яса. Вареники це тісто з різними начинками: картоплею, капустою, сиром, вишнями. Голубці капустяні листя, фаршировані м'ясом та рисом. Сало солоне свиняче сало, яке їдять з хлібом та часником. Пампушки маленькі булочки, які подають до борщу. Українська кухня багата та різноманітна, з багатьма регіональними особливостями.",
                difficulty: "hard"
            },
            {
                id: 135,
                name: "Географія України",
                description: "Природні багатства",
                layout: "ua",
                text: "Україна розташована в Східній Європі та має площу понад шістсот тисяч квадратних кілометрів. Країна має вихід до Чорного та Азовського морів. Карпати найвищі гори України, де розташована гора Говерла висотою дві тисячі шістдесят один метр. Дніпро найдовша річка України, яка протікає через центр країни. Україна має багаті родючі чорноземи, які вважаються одними з найкращих у світі. Клімат помірно континентальний з теплим літом та м'якою зимою.",
                difficulty: "hard"
            },
            {
                id: 136,
                name: "Гравець без ніка",
                description: "Кіберпанк-історія про темне місто та портали",
                layout: "ua",
                text: "У темному місті, де неон світиться як портали між світами, жив один гравець, якого ніхто ніколи не бачив, але всі знали його нік. Він з'являвся там, де система ламалась, де правила гри раптово переставали працювати, де карти мінялися прямо під ногами людей. І одного разу вночі, коли сервер міста знову перезавантажився і вулиці на секунду стали порожні як чиста карта перед стартом нового рівня, він знову увійшов у гру. Ніхто не знав, хто він насправді. Одні казали, що він просто гравець, який колись зайшов у гру і не зміг вийти. Інші казали, що він частина самої системи, баг, який навчився думати як людина. Але правда була ще дивнішою і небезпечнішою, бо цей гравець знав секрети рівнів, які навіть розробники давно забули. У нього не було бази, не було команди, не було навіть стабільного спавну. Він просто рухався крізь місто, рівень за рівнем, як тінь, що ковзає по карті, збираючи інформацію, ресурси і дивні артефакти, які випадали лише у тих місцях, де реальність тріщала. І саме тому ця історія тільки починається, бо кожен новий рівень ховає нові пастки, нові альянси, нові зради і нових гравців, які думають, що можуть перемогти систему. Але рано чи пізно всі вони дізнаються одну просту річ: у цій грі виграє не той, хто сильніший, а той, хто бачить правила там, де інші бачать лише карту.",
                difficulty: "hard"
            },
            {
                id: 200,
                name: "Комплектовщик складу",
                description: "Порядок і точність",
                layout: "ua",
                text: "У передсвітлі я бачу склад. Комплектовщик зчитує штрихкод, знаходить товар і складає коробку акуратно. Потім він готує посилку до відправки, і черга рухається швидко. Кожна деталь має значення, тому все працює рівно.",
                difficulty: "hard"
            },
            {
                id: 201,
                name: "Клейщик стикерів",
                description: "Рівні етикетки",
                layout: "ua",
                text: "Клейщик стикерів працює з терпінням. Він розгладжує наклейку без бульбашок, вирівнює етикетку і перевіряє номер. Коли все виходить рівно, упаковка виглядає як подарунок, а клієнт радіє. Спокій і уважність роблять процес простішим.",
                difficulty: "hard"
            },
            {
                id: 202,
                name: "Грузчик",
                description: "Безпека на першому місці",
                layout: "ua",
                text: "Грузчик підіймає вантаж обережно, бо вага відчувається в кожному русі. Він ставить піддон правильно, стежить за безпекою і не поспішає. Коли склад організований, все працює тихо і точно. Так день завершується без зайвих труднощів.",
                difficulty: "hard"
            },
            {
                id: 203,
                name: "Продавець",
                description: "Сервіс у деталях",
                layout: "ua",
                text: "Продавець у магазині зустрічає людей чемно. Він допомагає вибрати товар, підказує розмір і пояснює умови. Чек завершує розмову, і клієнт виходить із посмішкою. Доброта та порядок створюють відчуття надійності.",
                difficulty: "hard"
            },
            {
                id: 204,
                name: "Айтішник",
                description: "Код, тести і стабільність",
                layout: "ua",
                text: "Айтішник пише код вранці і тестує ввечері. Програма може видати помилку, але він аналізує лог, виправляє рішення та запускає тест ще раз. Так формується стабільність, а страх зникає. Коли все працює, відчувається справжня впевненість.",
                difficulty: "hard"
            },
            {
                id: 205,
                name: "Маленька подорож",
                description: "Місто і думки",
                layout: "ua",
                text: "Уяви маленьку подорож містом. У старих вулицях чути кроки, а вечірній ліхтар підсвічує тіні. Я йду повільно, щоб помітити деталі, і думаю про новий день. Так мандри стають цікавими, а розум відпочиває.",
                difficulty: "hard"
            },
            {
                id: 206,
                name: "Факт про зорі",
                description: "Нічне диво",
                layout: "ua",
                text: "Нічне небо приховує диво. Зорі здаються спокійними, але вони сяють і змінюються щомиті. Коли я дивлюся в телескоп, уявляю цілі галактики та відчуваю тишу. Навіть одна хвилина спостереження додає натхнення.",
                difficulty: "hard"
            },
            {
                id: 207,
                name: "Факт про час",
                description: "План і повторення",
                layout: "ua",
                text: "Час минає, але можна керувати планом. Хвилина має значення, а година дає можливість зробити більше. Я повторюю кроки щодня і бачу результат. Так знання міцнішають, а день стає продуктивним.",
                difficulty: "hard"
            },
            {
                id: 208,
                name: "Річка і ліс",
                description: "Природа говорить",
                layout: "ua",
                text: "Річка тече до моря, і трава росте після дощу. Птахи прокидаються рано, а ліс дихає спокоєм. Якщо зупинитися й слухати, природа розповість свої секрети. Я вчуся бачити красу у простих речах.",
                difficulty: "hard"
            },
            {
                id: 209,
                name: "Факт про тварин",
                description: "Дельфін і звірі",
                layout: "ua",
                text: "Дельфін пливе поруч із хвилями, ніби грає з водою. Звірі шукають їжу й захищають свій дім. Кожен день приносить нові дрібні факти, і це захоплює. Так природа підтримує цікавість щодня.",
                difficulty: "hard"
            },
            {
                id: 210,
                name: "Учень і вчитель",
                description: "Знання та практика",
                layout: "ua",
                text: "Учитель пояснює матеріал чітко, а учень задає питання. Клас працює разом, і знання стають міцними. Практика приносить впевненість, а страх помилок зникає. Коли все повторюється, результат стає видно.",
                difficulty: "hard"
            },
            {
                id: 29,
                name: "Игрок без ника",
                description: "Киберпанк-история о тёмном городе и порталах",
                layout: "ru",
                text: "В тёмном городе, где неон светится как порталы между мирами, жил один игрок, которого никто никогда не видел, но все знали его ник. Он появлялся там, где система ломалась, где правила игры вдруг переставали работать, где карты менялись прямо под ногами людей. И однажды ночью, когда сервер города снова перезагрузился и улицы на секунду стали пусты как чистая карта перед стартом нового уровня, он снова вошёл в игру. Никто не знал, кто он на самом деле. Одни говорили, что он просто игрок, который когда-то зашёл в игру и не смог выйти. Другие говорили, что он часть самой системы, баг, который научился думать как человек. Но правда была ещё страннее и опаснее, ведь этот игрок знал секреты уровней, о которых даже разработчики давно забыли. У него не было базы, не было команды, не было даже стабильного спавна. Он просто двигался сквозь город, уровень за уровнем, как тень, скользящая по карте, собирая информацию, ресурсы и странные артефакты, которые выпадали только в тех местах, где реальность давала трещину. И именно поэтому эта история только начинается, ведь каждый новый уровень таит новые ловушки, новые союзы, новые предательства и новых игроков, которые думают, что смогут победить систему. Но рано или поздно все они узнают одну простую вещь: в этой игре выигрывает не тот, кто сильнее, а тот, кто видит правила там, где другие видят лишь карту.",
                difficulty: "hard"
            },
            {
                id: 3000,
                name: "Спокойный ритм",
                description: "Скорость растет, когда ты уверен в каждом символе",
                layout: "ru",
                text: "Сегодня я читаю текст внимательно, затем печатаю ровно, без лишних рывков. Если появляется ошибка, я не устраиваю суету, а возвращаюсь и продолжаю. С каждым новым заходом пальцы запоминают порядок, и скорость становится стабильной. Так тренировка превращается в спокойный ритм.",
                difficulty: "hard"
            },
            {
                id: 3001,
                name: "План и точность",
                description: "Мысль впереди пальцев",
                layout: "ru",
                text: "Я мысленно разбиваю строку на части, чтобы не терять фокус. Точность важнее спешки, потому что ошибка ломает поток. Когда я удерживаю темп, становится легче сохранять правильные позиции. В конце урока я вижу прогресс не только в скорости, но и в качестве.",
                difficulty: "hard"
            },
            {
                id: 3002,
                name: "Невидимые детали",
                description: "Урок из мелочей",
                layout: "ru",
                text: "Тонкие детали решают результат, даже когда они кажутся незаметными. Правильные паузы между словами помогают дыханию, а стабильный угол взгляда снижает ошибки. Я повторяю практику, фиксирую прогресс и продолжаю. Так незаметные привычки собираются в заметный рост.",
                difficulty: "hard"
            },
            {
                id: 3003,
                name: "Сила привычки",
                description: "Повторение формирует контроль",
                layout: "ru",
                text: "Привычка печатать регулярно сильнее мотивации, которая приходит и уходит. Важно сохранять спокойствие и доверять повторению. Каждый урок добавляет маленький слой уверенности, и через время точность становится привычкой. Скорость приходит вместе с контролем, и текст начинает читаться легче.",
                difficulty: "hard"
            },
            {
                id: 3004,
                name: "Короткая история",
                description: "Как ошибка стала подсказкой",
                layout: "ru",
                text: "Когда я впервые допустил ошибку в середине строки, я остановился и понял причину. Я не просто вернулся назад, я изменил темп и снова проверил путь. В следующем заходе скорость выросла, а количество ошибок уменьшилось. Именно так одна подсказка превращается в уверенность.",
                difficulty: "hard"
            },
            {
                id: 3005,
                name: "Сосредоточение",
                description: "Один символ за раз",
                layout: "ru",
                text: "Пока текст движется вперед, я держу внимание на текущем символе. Я слушаю ритм и печатаю без пауз, когда это возможно. Если нужно, я делаю микропаузу и продолжаю. В итоге урок превращается в контроль, а контроль дает рост.",
                difficulty: "hard"
            },
            {
                id: 4000,
                name: "Code and calm",
                description: "Focus keeps the flow",
                layout: "en",
                text: "Typing feels smoother when focus leads the hands. I read the next phrase carefully, then I type it with steady rhythm, one character at a time. If a mistake appears, I correct it and continue without rushing. With practice, the flow returns, and accuracy becomes natural.",
                difficulty: "hard"
            },
            {
                id: 4001,
                name: "A lesson in details",
                description: "Small changes make big progress",
                layout: "en",
                text: "I break the text into small parts, so my mind stays ready for what comes next. Slow is not failure, it is control. Each run teaches timing, and each correct repeat builds confidence. When the pace is stable, the text looks clearer and typing feels easier.",
                difficulty: "hard"
            },
            {
                id: 4002,
                name: "Night facts",
                description: "Stars guide the attention",
                layout: "en",
                text: "The night sky is quiet, yet it holds endless facts. I imagine distant stars shining through time, and I keep my attention on the screen. This mindset reduces errors and helps me stay consistent. One line of focus turns into momentum for the next run.",
                difficulty: "hard"
            },
            {
                id: 4003,
                name: "Ocean rhythm",
                description: "Learning needs patience",
                layout: "en",
                text: "The ocean never stops moving, and neither does learning. Waves remind me that progress comes in cycles. I keep typing with a calm pace, and I let repetition do the work. After every session, I review my results and return with a better plan.",
                difficulty: "hard"
            },
            {
                id: 4004,
                name: "A short story",
                description: "Mistakes become signals",
                layout: "en",
                text: "When I made a mistake in the middle of the sentence, I paused and analyzed it. Then I changed the rhythm and tried again with clearer attention. The next run felt smoother, and my accuracy improved quickly. That is how one signal becomes a guide.",
                difficulty: "hard"
            },
            {
                id: 4005,
                name: "Clear routine",
                description: "Confidence is built step by step",
                layout: "en",
                text: "A clear routine helps me stay confident. I start slowly, I keep the current char in mind, and I maintain the flow until the end. When punctuation appears, I remain careful and consistent. At the end, the lesson feels like a small victory.",
                difficulty: "hard"
            },
            {
                id: 5001,
                name: "Цифры: коды, версии, IP",
                description: "Только цифры (0-9) и пробелы",
                layout: "ru",
                text: "2001 30105 4096 8080 443 192168001 10001 1721602541 90 5 12 255 26 14159 271828 19 99 42 200 1500000 999 20251130 557558 376173 5001 123456 789012 345678 901234 567890",
                difficulty: "hard",
                digitsOnly: true
            },
            {
                id: 5002,
                name: "Numbers: codes and tech",
                description: "Digits only (0-9) with spaces",
                layout: "en",
                text: "2001 30105 4096 8080 443 192168001 10001 1721602541 90 5 12 255 26 14159 271828 19 99 42 200 1500000 999 20251130 557558 376173 5002 123456 789012 345678 901234 567890 256 512 1024",
                difficulty: "hard",
                digitsOnly: true
            },
            {
                id: 5003,
                name: "Цифри: коди та дані",
                description: "Лише цифри (0-9) та пробіли",
                layout: "ua",
                text: "2001 30105 4096 8080 443 192168001 10001 1721602541 90 5 12 255 26 14159 271828 19 99 42 200 1500000 999 20251130 557558 376173 5003 123456 789012 345678 901234 567890",
                difficulty: "hard",
                digitsOnly: true
            },
            {
                id: 5004,
                name: "Цифры: ряды и проценты",
                description: "Только цифры: ряды чисел без знаков",
                layout: "ru",
                text: "1 2 3 4 5 6 7 8 9 0 10 12 15 18 20 24 30 33 36 40 45 50 60 64 72 75 80 90 99 100 125 144 256 512 1024 2020 2021 2022 2023 2024 2025 10 15 20 25 30 50 70 90",
                difficulty: "hard",
                digitsOnly: true
            },
            {
                id: 5005,
                name: "Numbers: rows and rates",
                description: "Digits only: number rows without operators",
                layout: "en",
                text: "1 2 3 4 5 6 7 8 9 0 10 12 15 18 20 24 30 33 36 40 45 50 60 64 72 75 80 90 99 100 125 144 256 512 1024 2020 2021 2022 2023 2024 2025 10 15 20 25 30 50 70 90 60 90 120 180",
                difficulty: "hard",
                digitsOnly: true
            },
            {
                id: 5006,
                name: "Цифри: відсотки і ряди",
                description: "Лише цифри: ряди чисел без знаків",
                layout: "ua",
                text: "1 2 3 4 5 6 7 8 9 0 10 12 15 18 20 24 30 33 36 40 45 50 60 64 72 75 80 90 99 100 125 144 256 512 1024 2020 2021 2022 2023 2024 2025 10 15 20 25 30 50 70 90 60 90 120 180",
                difficulty: "hard",
                digitsOnly: true
            },
            {
                id: 5011,
                name: "Цифры: длинные коды",
                description: "Только цифры и пробелы",
                layout: "ru",
                text: "2001 30105 4096 8080 443 192168001 10001 1721602541 2025 2024 365 1000 1010 1111 1212 1313 1414 1515 1616 1717 1818",
                difficulty: "hard",
                digitsOnly: true
            },
            {
                id: 5012,
                name: "Numbers: long codes",
                description: "Digits only and spaces",
                layout: "en",
                text: "2001 30105 4096 8080 443 192168001 10001 1721602541 2025 2024 365 1000 1010 1111 1212 1313 1414 1515 1616 1717 1818",
                difficulty: "hard",
                digitsOnly: true
            },
            {
                id: 5013,
                name: "Цифри: довгі коди",
                description: "Лише цифри та пробіли",
                layout: "ua",
                text: "2001 30105 4096 8080 443 192168001 10001 1721602541 2025 2024 365 1000 1010 1111 1212 1313 1414 1515 1616 1717 1818",
                difficulty: "hard",
                digitsOnly: true
            },
            {
                id: 5014,
                name: "Цифры: многоразрядные блоки",
                description: "Только цифры и пробелы",
                layout: "ru",
                text: "0000 0630 0915 1245 1520 1800 2210 2359 0100 0123 0134 0145 0156 0167 0178 0189 050 066 075 082 090 099 100 125 144 256 512 1024",
                difficulty: "hard",
                digitsOnly: true
            },
            {
                id: 5015,
                name: "Numbers: multi-digit blocks",
                description: "Digits only and spaces",
                layout: "en",
                text: "0000 0630 0915 1245 1520 1800 2210 2359 0100 0123 0134 0145 0156 0167 0178 0189 050 066 075 082 090 099 100 125 144 256 512 1024",
                difficulty: "hard",
                digitsOnly: true
            },
            {
                id: 5016,
                name: "Цифри: багаторозрядні блоки",
                description: "Лише цифри та пробіли",
                layout: "ua",
                text: "0000 0630 0915 1245 1520 1800 2210 2359 0100 0123 0134 0145 0156 0167 0178 0189 050 066 075 082 090 099 100 125 144 256 512 1024",
                difficulty: "hard",
                digitsOnly: true
            }
        ]
    }
};

/** Для lesson-progression и других модулей, которые читают window.LESSONS_DATA */
if (typeof window !== 'undefined') window.LESSONS_DATA = LESSONS_DATA;
