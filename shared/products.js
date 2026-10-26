/* Mavero — єдине джерело даних для всіх варіантів лендінгу.
   Ціни: дроп-ціна з прайсу постачальника + маржа 350–500 грн.
   old — перекреслена ціна; постав null, щоб її не показувати. */
(function () {
  const IMG = '/assets/img/';

  // Кольори корпусу (для малюнків і «чіпів» вибору)
  const COLOURS = {
    multi:   { name: 'Різнобарвний', faces: ['#F2C230', '#3D7FD9', '#E2543A'], swatch: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 3 1' preserveAspectRatio='none'%3E%3Crect width='1' height='1' fill='%23F2C230'/%3E%3Crect x='1' width='1' height='1' fill='%233D7FD9'/%3E%3Crect x='2' width='1' height='1' fill='%23E2543A'/%3E%3C/svg%3E\") center/cover" },
    pink:    { name: 'Рожевий',      faces: ['#F6BCCB', '#E99AB0', '#D9839B'], swatch: '#EFA6BA' },
    grey:    { name: 'Сірий',        faces: ['#C3C6C8', '#A4A8AB', '#8C9094'], swatch: '#A9ADB0' },
    natural: { name: 'Некрашений',   faces: ['#EBD3A6', '#DDBF88', '#CBA971'], swatch: '#E0C38E' },
    blue:    { name: 'Синій',        faces: ['#9EC0EA', '#7FA8DD', '#6890C8'], swatch: '#7FA8DD' },
    beige:   { name: 'Бежевий',      faces: ['#F1E2C8', '#E8D3B0', '#D9C19A'], swatch: '#E8D3B0' },
  };

  const PINK_PHOTOS = ['DSC03872.jpg', 'DSC03869.jpg', 'DSC03870.jpg', 'DSC03873.jpg', 'DSC03874.jpg', 'DSC03875.jpg'];

  const cubeZones = {
    15: ['Лабіринт', 'Застібки', 'Засув', 'Годинник', 'Лічниця', 'Котушка', 'Розетка з вилкою', 'Дзвіночок', 'Гра «Хто що їсть?»'],
    23: ['Велике коліщатко', 'Шестерня з піском', 'Лабіринт', 'Застібки', 'Спінер', 'Засув', 'Годинник',
         'Мелодійка — шестерня зі скрипковим ключем', 'Дверцята, що відчиняються', 'Лічниця', 'Котушка',
         'Розетка з вилкою', 'Дзвіночок', 'Карета', 'Гра «Хто що їсть?»'],
    30: ['Шестерні', 'Ксилофон', 'Світлофор', 'Застібки й ручка', 'Вимикач', 'Засув', 'Мале колесо', 'Годинник',
         'Метелик', 'Дверцята, що відчиняються', 'Лічниця', 'Котушка', 'Розетка з вилкою', 'Лабіринт і спінер',
         'Дошка для малювання', 'Гра «Хто що їсть?»'],
  };

  function cubeSize(id, label, price, old, codes, zonesTitle) {
    return {
      id, label, zonesTitle,
      variants: ['multi', 'pink', 'grey', 'natural'].map((c) => ({
        id: c,
        name: COLOURS[c].name,
        colour: c,
        price, old,
        code: codes[c],
        zones: cubeZones[id],
        photo: `${IMG}p/cube-${id}-${c}.jpg`,
      })),
    };
  }

  const z40 = ['Ксилофон', 'Вимикач', 'Розетка з вилкою', 'Металевий дзвіночок', 'Обертове дзеркальце',
    'Застібка-липучка, як на взутті', 'Металева засувка', 'Лабіринт з метеликом і квіткою',
    'Сортер: коло, квадрат, трикутник, овал', 'Шестерні (2 шт.)', 'Годинник зі стрілками',
    'Асоціативне коло з малюнками', 'Хмаринка з намистинами', 'Обертове сонечко',
    'Літери: А, Б, В, Г, Д, Ж, Є, І', 'Карета', 'Замок із дверцятами'];

  const CATALOG = [
    {
      id: 'cube', name: 'Бізікубик', plural: 'Бізікубики',
      blurb: 'Дерев’яний кубик: ігрові зони на кожній грані, грається з усіх боків.',
      sizes: [
        cubeSize('15', '15 см', 949, 1299,
          { multi: '15х15-різноб', pink: '15х15-роз', grey: '15х15-сірий', natural: '15х15-некра' }, 'Компактний, бере з собою в дорогу'),
        cubeSize('23', '23 см', 1549, 1999,
          { multi: '23х23-різноб', pink: '23х23-роз', grey: '23х23-сірий', natural: '23х23-некра' }, 'Найпопулярніший розмір'),
        cubeSize('30', '30 см', 2199, 2899,
          { multi: '30х30х30_нов_різноб', pink: '30х30х30_нов_роз', grey: '30х30х30_нов_сірий', natural: '30х30х30_нов_некра' }, 'Найбільше зон, на роки гри'),
      ],
    },
    {
      id: 'board', name: 'Бізіборд', plural: 'Бізіборди',
      blurb: 'Розвивальна дошка: кріпиться до стіни або лежить на підлозі.',
      sizes: [
        {
          id: '40x50', label: '40×50 см', zonesTitle: 'Можна повісити в дитячій',
          variants: [
            { id: 'rocket', name: 'Ракета і робот', colour: 'natural', price: 1599, old: 2099, code: 'борд-40Х50-ч', motifs: ['rocket', 'gears'],
              zones: ['Ракета', 'Робот', 'Масажер', 'Вимикач', 'Розетка з вилкою', 'Котушка', 'Пластиковий шпінгалет', 'Сортер', 'Спінер',
                      'Ксилофон', 'Колесо', 'Скрипковий ключ', 'Дзвіночок', 'Світлофор', 'Лічниця', 'Лабіринт'] },
            { id: 'bee', name: 'Бджілка і гусениця', colour: 'natural', price: 1599, old: 2099, code: 'борд-40Х50-ж', motifs: ['bee', 'clock'],
              zones: ['Годинник', 'Ксилофон', 'Масажер', 'Вимикач', 'Розетка з вилкою', 'Котушка', 'Металевий шпінгалет', 'Сортер', 'Спінер',
                      'Бджілка', 'Нота', 'Гусениця', 'Дзвіночок', 'Світлофор', 'Лічниця', 'Лабіринт'] },
            { id: 'pink', name: 'Рожевий з каретою', colour: 'pink', price: 1699, old: 2199, code: 'борд-40Х50-(розовий)', motifs: ['letters', 'carriage'], zones: z40 },
            { id: 'blue', name: 'Синій з каретою', colour: 'blue', price: 1699, old: 2199, code: 'борд-40Х50-(синій)', motifs: ['letters', 'carriage'], zones: z40 },
          ],
        },
        {
          id: '50x60', label: '50×60 см', zonesTitle: 'Найбільша дошка',
          variants: [
            { id: 'tractor', name: 'Трактор і крокодил', colour: 'natural', price: 1899, old: 2499, code: 'борд-50Х60-у', motifs: ['tractor', 'bee'],
              zones: ['Годинник', 'Ксилофон', 'Масажер', 'Вимикач', 'Розетка з вилкою', 'Котушка', 'Металевий шпінгалет', 'Сортер', 'Спінер',
                      'Бджілка', 'Колесо', 'Ліхтарик', 'Гусениця', 'Дзвіночок', 'Світлофор', 'Ліжечко з собачкою', 'Шестерні', 'Черевичок',
                      'Хмаринка', 'Крокодил', 'Трактор', 'Дверний гачок', 'Лабіринт'] },
            { id: 'beige', name: 'Бежевий з млином', colour: 'beige', price: 1999, old: 2599, code: 'борд-50Х60-(бежевий)', motifs: ['rocket', 'gears'],
              zones: ['Шестерні різних розмірів', 'Годинник із рухомими стрілками', 'Дзвіночок', 'Ксилофон з паличками', 'Ракета із замочком',
                      'Бджілка з лабіринтом-намистинами', 'Хмаринка зі шнурівками й кульками', 'Собачка-рахівниця', 'Млин з дверцятами й замком',
                      'Ялинка зі шнурівкою', 'Лабіринт-головоломка', 'Ліхтарик-кнопка', 'Роликовий масажер', 'Вимикачі та розетка',
                      'Засувка', 'Сортер: коло, квадрат, трикутник', 'Застібки-липучки та ремінці'] },
            { id: 'pink', name: 'Рожевий з принцесою', colour: 'pink', price: 1999, old: 2599, code: 'борд-50Х60-(розовий)', motifs: ['letters', 'carriage'],
              zones: ['Ксилофон', 'Вимикач', 'Розетка з вилкою', 'Металевий дзвіночок', 'Обертове дзеркальце', 'Хмаринка з намистинами',
                      'Бджілка з крутилками', 'Блискавка, як на сукенці', 'Застібка-липучка, як на взутті', 'Металева засувка',
                      'Лабіринт з метеликом і квіткою', 'Вітряк з лопатями', 'Собачка-рахівниця', 'Ялинка зі шнурівкою', 'Гусінь-шестерня',
                      'Годинник зі стрілками', 'Асоціативне коло з тваринами', 'Замки з дверцятами (2 шт.)', 'Карета з принцом і принцесою',
                      'Літери: А, Б, В, Г, Д, Е, Ж, І'] },
            { id: 'blue', name: 'Синій з ракетою', colour: 'blue', price: 1999, old: 2599, code: 'борд-50Х60-(синій)', motifs: ['rocket', 'letters'],
              zones: ['Ксилофон', 'Вимикач', 'Розетка з вилкою', 'Металевий дзвіночок', 'Світлофор із рухомими кружечками', 'Годинник зі стрілками',
                      'Шестерні різних розмірів (5 шт.)', 'Велике колесо з малюнками', 'Лабіринт-пазл з квітками й тваринками',
                      'Сортер: коло, квадрат, трикутник', 'Дверцята-ракета із замочком', 'Хмаринка з намистинами', 'Металева засувка',
                      'Ролик і тактильні елементи', 'Черевичок із застібками', 'Рахівниця з кульками', 'Обертові сонце, зірки й тваринки',
                      'Українські літери'] },
          ],
        },
      ],
    },
  ];

  /* ---------- Малюнки товарів у SVG (для кольорів і моделей без живого фото) ---------- */
  const EL = ['#E2543A', '#F2C230', '#3D7FD9', '#4CAF6A'];
  const DARK = '#1E1E1C';

  function faceLeft() {
    return `<circle cx="30" cy="30" r="17" fill="#fff"/><path d="M30 30V18M30 30l8 5" stroke="${DARK}" stroke-width="3" stroke-linecap="round"/>
      <rect x="56" y="14" width="30" height="32" rx="7" fill="#fff"/><circle cx="66" cy="30" r="3.5" fill="${DARK}"/><circle cx="76" cy="30" r="3.5" fill="${DARK}"/>
      <rect x="12" y="58" width="76" height="30" rx="4" fill="#fff"/>
      ${[66, 76, 84].map((y, i) => `<path d="M16 ${y}H84" stroke="${DARK}" stroke-width="1.6"/>` +
        [0, 1, 2].map((k) => `<circle cx="${22 + k * 9 + i * 6}" cy="${y}" r="3.6" fill="${EL[(i + k) % 4]}"/>`).join('')).join('')}`;
  }
  function faceRight() {
    return `<rect x="12" y="12" width="34" height="44" rx="3" fill="${EL[0]}"/><circle cx="40" cy="34" r="3" fill="#fff"/>
      <circle cx="70" cy="32" r="15" fill="${EL[1]}" stroke="${DARK}" stroke-width="5" stroke-dasharray="4 4"/><circle cx="70" cy="32" r="4" fill="${DARK}"/>
      <path d="M14 76h20v-10h18v16h18v-12h16" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="86" cy="70" r="5" fill="${EL[2]}"/>`;
  }
  function faceTop() {
    return [0, 1, 2, 3, 4].map((i) => `<rect x="${16 + i * 14}" y="${18 + i * 4}" width="10" height="${62 - i * 8}" rx="2" fill="${EL[i % 4]}"/>`).join('');
  }

  // Ізометричний кубик. scale — відносний розмір (15/23/30 см).
  function cubeSVG(colour, opts = {}) {
    const f = COLOURS[colour].faces;
    const s = opts.scale || 1;
    const t = `translate(${130 - 130 * s} ${262 - 262 * s}) scale(${s})`;
    return `<svg viewBox="0 0 260 262" role="img" aria-label="${opts.label || 'Бізікубик, ' + COLOURS[colour].name.toLowerCase()}" xmlns="http://www.w3.org/2000/svg"><g transform="${t}">
      <polygon points="130,20 233.9,80 130,140 26.1,80" fill="${f[0]}"/>
      <polygon points="26.1,80 130,140 130,260 26.1,200" fill="${f[1]}"/>
      <polygon points="130,140 233.9,80 233.9,200 130,260" fill="${f[2]}"/>
      <g transform="matrix(1.039,-0.6,1.039,0.6,26.1,80)">${faceTop()}</g>
      <g transform="matrix(1.039,0.6,0,1.2,26.1,80)">${faceLeft()}</g>
      <g transform="matrix(1.039,-0.6,0,1.2,130,140)">${faceRight()}</g>
    </g></svg>`;
  }

  const MOTIF = {
    rocket: (x, y) => `<g transform="translate(${x} ${y})"><path d="M20 0c14 12 14 34 8 52H12C6 34 6 12 20 0z" fill="#fff"/><circle cx="20" cy="22" r="6" fill="${EL[2]}"/><path d="M12 52l-8 10h12zM28 52l8 10H24z" fill="${EL[0]}"/></g>`,
    gears: (x, y) => `<g transform="translate(${x} ${y})"><circle cx="16" cy="16" r="14" fill="${EL[1]}" stroke="${DARK}" stroke-width="5" stroke-dasharray="4 4"/><circle cx="40" cy="34" r="11" fill="${EL[3]}" stroke="${DARK}" stroke-width="5" stroke-dasharray="4 4"/></g>`,
    bee: (x, y) => `<g transform="translate(${x} ${y})"><ellipse cx="24" cy="20" rx="22" ry="15" fill="${EL[1]}"/><path d="M16 6v28M28 6v28" stroke="${DARK}" stroke-width="5"/><ellipse cx="18" cy="4" rx="9" ry="6" fill="#fff"/></g>`,
    letters: (x, y) => `<g transform="translate(${x} ${y})" font-family="Montserrat, sans-serif" font-weight="800" font-size="20">${['А', 'Б', 'В', 'Г'].map((l, i) => `<rect x="${i * 26}" y="0" width="22" height="26" rx="4" fill="#fff"/><text x="${i * 26 + 11}" y="20" text-anchor="middle" fill="${EL[i % 4]}">${l}</text>`).join('')}</g>`,
    carriage: (x, y) => `<g transform="translate(${x} ${y})"><path d="M6 30C6 10 50 10 50 30z" fill="#fff"/><rect x="4" y="28" width="48" height="8" rx="3" fill="${EL[1]}"/><circle cx="14" cy="42" r="7" fill="${DARK}"/><circle cx="42" cy="42" r="7" fill="${DARK}"/></g>`,
    tractor: (x, y) => `<g transform="translate(${x} ${y})"><rect x="0" y="14" width="40" height="18" rx="3" fill="${EL[3]}"/><rect x="22" y="0" width="18" height="16" rx="2" fill="#fff"/><circle cx="10" cy="36" r="8" fill="${DARK}"/><circle cx="36" cy="34" r="11" fill="${DARK}"/></g>`,
    clock: (x, y) => `<g transform="translate(${x} ${y})"><circle cx="18" cy="18" r="18" fill="#fff"/><path d="M18 18V7M18 18l8 5" stroke="${DARK}" stroke-width="3" stroke-linecap="round"/></g>`,
  };

  // Бізіборд: дошка з елементами. Пропорції 40×50 / 50×60.
  function boardSVG(colour, motifs = [], opts = {}) {
    const f = COLOURS[colour].faces;
    const w = 300, h = opts.big ? 250 : 240;
    const m = motifs.map((k, i) => MOTIF[k](i === 0 ? 34 : 196, i === 0 ? 30 : 34)).join('');
    return `<svg viewBox="0 0 ${w} ${h + 10}" role="img" aria-label="${opts.label || 'Бізіборд'}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${w}" height="${h}" rx="14" fill="${f[2]}"/>
      <rect x="10" y="10" width="${w - 20}" height="${h - 20}" rx="8" fill="${f[0]}"/>
      ${m}
      <g transform="translate(110 30)">${[0, 1, 2, 3, 4].map((i) => `<rect x="${i * 13}" y="${i * 3}" width="9" height="${54 - i * 6}" rx="2" fill="${EL[i % 4]}"/>`).join('')}</g>
      <rect x="32" y="${h - 96}" width="44" height="54" rx="8" fill="#fff"/><circle cx="46" cy="${h - 70}" r="4" fill="${DARK}"/><circle cx="62" cy="${h - 70}" r="4" fill="${DARK}"/>
      <rect x="96" y="${h - 96}" width="100" height="54" rx="4" fill="#fff"/>
      ${[0, 1, 2].map((r) => `<path d="M102 ${h - 82 + r * 14}H190" stroke="${DARK}" stroke-width="1.6"/>` + [0, 1, 2, 3].map((k) => `<circle cx="${110 + k * 10 + r * 8}" cy="${h - 82 + r * 14}" r="4.2" fill="${EL[(r + k) % 4]}"/>`).join('')).join('')}
      <circle cx="244" cy="${h - 70}" r="26" fill="#fff"/><path d="M244 ${h - 70}V${h - 88}M244 ${h - 70}l12 8" stroke="${DARK}" stroke-width="4" stroke-linecap="round"/>
    </svg>`;
  }

  function art(cat, size, v, opts = {}) {
    if (cat.id === 'cube') {
      const scale = opts.scaled ? { 15: 0.58, 23: 0.8, 30: 1 }[size.id] : 1;
      return cubeSVG(v.colour, { scale, label: `${cat.name} ${size.label}, ${v.name.toLowerCase()}` });
    }
    return boardSVG(v.colour, v.motifs, { big: size.id === '50x60', label: `${cat.name} ${size.label}, ${v.name.toLowerCase()}` });
  }

  // Плоский список усіх товарних позицій
  const ITEMS = [];
  CATALOG.forEach((cat) => cat.sizes.forEach((size) => size.variants.forEach((v) => ITEMS.push({ cat, size, v }))));

  /* ---------- Фото: тільки фото саме цієї моделі ----------
     Перше — з прайсу постачальника, далі — з папок постачальника на Google Диску.
     kid: true — фото з дитиною (у галереї потрапляє в «Живі фото»). */
  const EXTRA = {
    'cube|23|pink': [['DSC03870.jpg', 'Рожевий кубик 23 см у грі', true], ['DSC03875.jpg', 'Поруч з дитиною — видно розмір 23 см', true]],
    'cube|15|grey': [['DSC04410.jpg', 'Сірий кубик 15 см у грі', true]],
    'board|40x50|rocket': [['p/board-40x50-rocket-kid1.jpg', 'Борд «Ракета і робот» у грі: можна гратися на підлозі', true],
                           ['p/board-40x50-rocket-kid2.jpg', 'Лабіринт і ксилофон зблизька, в руках дитини', true],
                           ['p/board-40x50-rocket-kid3.jpg', 'Те саме фото збоку: ракета, робот, світлофор, рахівниця', true]],
    'board|40x50|blue': [['p/board-40x50-blue-2.jpg', 'Синій борд 40×50 цілком'], ['p/board-40x50-blue-3.jpg', 'Годинник, хмаринка з намистинами й ракета'], ['p/board-40x50-blue-4.jpg', 'Ксилофон і черевичок із застібками']],
    'board|40x50|pink': [['p/board-40x50-pink-2.jpg', 'Рожевий борд 40×50 цілком'], ['p/board-40x50-pink-3.jpg', 'Карета, замок і сортер зблизька'], ['p/board-40x50-pink-4.jpg', 'Ксилофон і черевичок із застібками']],
  };
  ITEMS.forEach(({ cat, size, v }) => {
    if (cat.id === 'board') v.photo = `${IMG}p/board-${size.id}-${v.id}.jpg`;
    const title = `${cat.name} ${size.label}, ${v.name.toLowerCase()}`;
    v.gallery = [{ src: v.photo, alt: title, cap: `${title}: фото моделі` }]
      .concat((EXTRA[`${cat.id}|${size.id}|${v.id}`] || []).map(([f, cap, kid]) => ({ src: IMG + f, alt: cap, cap, life: !!kid })));
  });

  /* ---------- Відгуки ----------
     ЗАМІНИ на справжні відгуки покупців (скрін з Instagram/Telegram, текст, ім’я, місто).
     Поки sample: true — на сайті картка підписана «Зразок», щоб не вводити покупців в оману.
     item — 'категорія|розмір|колір' з каталогу вище. */
  const REVIEWS = [
    { sample: true, name: '@нікнейм_покупця', city: 'Місто', item: 'cube|23|multi', text: 'Короткий відгук покупця: що сподобалось дитині.' },
    { sample: true, name: '@нікнейм_покупця', city: 'Місто', item: 'board|50x60|blue', text: 'Короткий відгук про бізіборд і доставку.' },
    { sample: true, name: '@нікнейм_покупця', city: 'Місто', item: 'cube|15|pink', text: 'Короткий відгук: якість, розмір, враження.' },
  ];

  window.MAVERO = {
    brand: 'Mavero',
    // ЗАМІНИ перед запуском: справжній телефон і Telegram магазину
    contact: { phone: '+380 00 000 00 00', phoneHref: 'tel:+380000000000', telegram: 'https://t.me/', city: 'Україна' },
    COLOURS, CATALOG, ITEMS, PINK_PHOTOS, IMG, REVIEWS,
    cubeSVG, boardSVG, art,
    fmt: (n) => n.toLocaleString('uk-UA').replace(/\s/g, ' ') + ' грн',
  };
})();
