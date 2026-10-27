/* Mavero — спільна логіка: конфігуратор, прайс, форма замовлення, анімації появи. */
(function () {
  const M = window.MAVERO;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Стан вибору (спільний для конфігуратора і форми) ---------- */
  const state = { cat: M.CATALOG[0], size: M.CATALOG[0].sizes[1], v: M.CATALOG[0].sizes[1].variants[1] };
  const listeners = [];
  function select(catId, sizeId, vId) {
    const cat = M.CATALOG.find((c) => c.id === catId) || state.cat;
    const size = cat.sizes.find((s) => s.id === sizeId) || cat.sizes[Math.min(1, cat.sizes.length - 1)];
    // при зміні розміру зберігаємо колір, якщо він є
    const v = size.variants.find((x) => x.id === vId) || size.variants.find((x) => x.id === state.v.id) || size.variants[0];
    Object.assign(state, { cat, size, v });
    listeners.forEach((fn) => fn(state));
  }
  const label = (s = state) => `${s.cat.name} ${s.size.label}, ${s.v.name.toLowerCase()}`;
  const plural = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'ігрова зона' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'ігрові зони' : 'ігрових зон');

  function chip(text, pressed, attrs, swatch) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (swatch ? ' chip-swatch' : '');
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    Object.entries(attrs).forEach(([k, v]) => (b.dataset[k] = v));
    if (swatch) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = swatch;
      dot.setAttribute('aria-hidden', 'true');
      b.append(dot);
    }
    b.append(document.createTextNode(text));
    return b;
  }

  // Горизонтальний свайп пальцем або мишею: fn(+1) — наступне, fn(-1) — попереднє.
  // Повертає функцію, яка каже, чи щойно був свайп (щоб не спрацював клік).
  function onSwipe(el, fn) {
    let x0 = null, y0 = 0, swiped = false;
    el.style.touchAction = 'pan-y';
    el.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; swiped = false; });
    el.addEventListener('pointercancel', () => (x0 = null));
    el.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped = true; fn(dx < 0 ? 1 : -1); }
    });
    return () => swiped;
  }

  // Прокрутка до конструктора: фото моделі по центру екрана (якщо конструктора немає — до форми)
  function toConfigurator() {
    const t = $('.cfg-visual') || $('#order');
    if (!t) return;
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    t.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
    if (location.hash !== '#configurator') history.replaceState(null, '', '#configurator');
  }

  /* ---------- Конфігуратор ---------- */
  function mountConfigurator(root) {
    const el = (k) => $(`[data-cfg-${k}]`, root);
    const cats = el('cats'), sizes = el('sizes'), vars = el('variants');
    const fig = el('figure'), cap = el('caption');
    const zoom = el('zoom');
    let gal = [], at = 0;

    function showPhoto(i) {
      at = (i + gal.length) % gal.length;
      const g = gal[at];
      fig.innerHTML = `<img src="${g.src}" alt="${g.alt}" width="1100" height="1100">`;
      if (cap) cap.textContent = g.cap;
      $$('.thumb', el('thumbs')).forEach((t, k) => t.setAttribute('aria-pressed', k === at ? 'true' : 'false'));
      if (zoom && zoom.open) zoomShow();
    }
    function step(d) {
      if (gal.length < 2) return;
      fig.classList.remove('is-in');
      showPhoto(at + d);
      requestAnimationFrame(() => fig.classList.add('is-in'));
    }
    function zoomShow() {
      const g = gal[at];
      $('[data-zoom-img]', zoom).innerHTML = `<img src="${g.src}" alt="${g.alt}" width="1100" height="1100">`;
      $('[data-zoom-cap]', zoom).textContent = g.cap;
      $('[data-zoom-count]', zoom).textContent = gal.length > 1 ? `${at + 1} / ${gal.length}` : '';
      $$('[data-zoom-prev],[data-zoom-next]', zoom).forEach((b) => (b.hidden = gal.length < 2));
    }
    const figSwiped = onSwipe(fig.parentElement, step);
    if (zoom) {
      fig.parentElement.addEventListener('click', () => {
        if (figSwiped() || !gal.length) return;
        zoomShow();
        zoom.showModal();
      });
      const zoomSwiped = onSwipe($('[data-zoom-img]', zoom), step);
      $('[data-zoom-prev]', zoom).addEventListener('click', () => step(-1));
      $('[data-zoom-next]', zoom).addEventListener('click', () => step(1));
      $('[data-zoom-close]', zoom).addEventListener('click', () => zoom.close());
      zoom.addEventListener('click', (e) => { if (e.target === zoom && !zoomSwiped()) zoom.close(); });
      zoom.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });
    }

    function render(s) {
      cats.replaceChildren(...M.CATALOG.map((c) => chip(c.plural, c === s.cat, { cat: c.id })));
      sizes.replaceChildren(...s.cat.sizes.map((z) => chip(z.label, z === s.size, { size: z.id })));
      vars.replaceChildren(...s.size.variants.map((v) => chip(v.name, v === s.v, { v: v.id }, M.COLOURS[v.colour].swatch)));
      const varLabel = el('variants-label');
      if (varLabel) varLabel.textContent = s.cat.id === 'cube' ? 'Колір' : 'Модель';

      fig.classList.remove('is-in');
      const thumbs = el('thumbs');
      if (s.v.photo && root.dataset.cfgPhotos !== 'off') {
        gal = s.v.gallery;
        if (thumbs) {
          thumbs.hidden = s.v.gallery.length < 2;
          thumbs.replaceChildren(...s.v.gallery.map((g, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'thumb';
            b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
            b.setAttribute('aria-label', g.cap);
            b.innerHTML = `<img src="${g.src}" alt="" width="120" height="120" loading="lazy">`;
            b.addEventListener('click', () => step(i - at));
            return b;
          }));
        }
        showPhoto(0);
        fig.parentElement.classList.toggle('can-zoom', !!zoom);
        fig.parentElement.classList.toggle('can-swipe', gal.length > 1);
      } else {
        gal = [];
        fig.parentElement.classList.remove('can-zoom', 'can-swipe');
        if (thumbs) thumbs.replaceChildren();
        fig.innerHTML = M.art(s.cat, s.size, s.v, { scaled: true });
        if (cap) cap.textContent = s.cat.id === 'cube'
          ? `Малюнок: ${s.v.name.toLowerCase()} кубик ${s.size.label} у масштабі до 30 см.`
          : `Малюнок моделі «${s.v.name}». Живе фото надішлемо в месенджер.`;
      }
      requestAnimationFrame(() => fig.classList.add('is-in'));

      root.dataset.colour = s.v.colour;
      el('name').textContent = label(s);
      el('now').textContent = M.fmt(s.v.price);
      const old = el('old');
      if (old) { old.textContent = s.v.old ? M.fmt(s.v.old) : ''; old.hidden = !s.v.old; }
      const n = s.v.zones.length;
      el('count').textContent = `${n} ${plural(n)}`;
      const note = el('note'); if (note) note.textContent = s.size.zonesTitle;
      el('zones').replaceChildren(...s.v.zones.map((z) => Object.assign(document.createElement('li'), { textContent: z })));
    }

    root.addEventListener('click', (e) => {
      const b = e.target.closest('button.chip');
      if (!b) return;
      if (b.dataset.cat) select(b.dataset.cat);
      else if (b.dataset.size) select(state.cat.id, b.dataset.size);
      else if (b.dataset.v) select(state.cat.id, state.size.id, b.dataset.v);
    });
    listeners.push(render);
    render(state);

    // Скільки вже в кошику — під кнопками
    const cartNote = el('cart'), addBtn = $('[data-add]', root);
    const drawNote = () => {
      if (!cartNote) return;
      const n = cartCount();
      cartNote.innerHTML = cart.auto || !n ? '' : `У кошику: ${n} шт. на ${M.fmt(cartSum())} · <a href="#order" data-buy>Оформити</a>`;
    };
    cartListeners.push(drawNote);
    drawNote();
    if (addBtn) addBtn.addEventListener('click', () => {
      addBtn.textContent = '✓ Додано. Оберіть ще одну модель';
      clearTimeout(addBtn.t);
      addBtn.t = setTimeout(() => (addBtn.textContent = '+ Додати в кошик і обрати ще'), 2200);
    });
  }

  /* ---------- Кошик: кілька різних моделей в одному замовленні ----------
     Поки покупець нічого не клав у кошик (auto), кошик показує модель, обрану в конструкторі. */
  const CART_KEY = 'mavero-cart';
  const keyOf = (s) => `${s.cat.id}|${s.size.id}|${s.v.id}`;
  const byKey = (k) => M.ITEMS.find((x) => keyOf(x) === k);
  const clampQty = (n) => Math.max(1, Math.min(10, parseInt(n, 10) || 1));
  const cart = { lines: [], auto: true };
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    cart.lines = saved.filter((l) => byKey(l.k)).map((l) => ({ k: l.k, n: clampQty(l.n) }));
    cart.auto = !cart.lines.length;
  } catch (x) { /* немає доступу до сховища — кошик живе до перезавантаження */ }
  if (cart.auto) cart.lines = [{ k: keyOf(state), n: 1 }];
  const cartListeners = [];
  function cartChanged() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart.auto ? [] : cart.lines)); } catch (x) { /* див. вище */ }
    cartListeners.forEach((fn) => fn());
  }
  function cartAdd(k) {
    if (cart.auto) { cart.lines = []; cart.auto = false; }
    if (!cart.lines.some((l) => l.k === k)) cart.lines.push({ k, n: 1 });
    cartChanged();
  }
  const cartItems = () => cart.lines.map((l) => ({ ...byKey(l.k), n: l.n, k: l.k }));
  const cartCount = () => cart.lines.reduce((a, l) => a + l.n, 0);
  const cartSum = () => cartItems().reduce((a, x) => a + x.v.price * x.n, 0);
  listeners.push((s) => { if (cart.auto) { cart.lines = [{ k: keyOf(s), n: 1 }]; cartChanged(); } });

  /* ---------- Meta Pixel (shared/track.js): що дивились і коли перейшли до замовлення ---------- */
  const item = (s = state, n = 1) => ({ content_ids: [s.v.code], content_name: label(s), content_type: 'product', value: s.v.price * n, currency: 'UAH', num_items: n });
  const cartEvent = () => ({ content_ids: cartItems().map((x) => x.v.code), contents: cartItems().map((x) => ({ id: x.v.code, quantity: x.n })), content_type: 'product', value: cartSum(), currency: 'UAH', num_items: cartCount() });
  listeners.push((s) => M.trackOnce('vc:' + s.v.code, 'ViewContent', item(s)));
  const checkout = () => M.trackOnce('ic', 'InitiateCheckout', cartEvent());

  /* ---------- Перегляд фото на весь екран (галерея і прайс) ----------
     Повертає open(list, i); елемент list: { src, alt, title, price?, old?, pick? } */
  function mountLightbox(dlg) {
    let list = [], at = 0;
    function open(l, i) {
      if (l) list = l;
      at = (i + list.length) % list.length;
      const x = list[at];
      $('[data-lb-img]', dlg).innerHTML = `<img src="${x.src}" alt="${x.alt}" width="1100" height="1100">`;
      $('[data-lb-cap]', dlg).innerHTML = x.title + (x.price ? ` — ${M.fmt(x.price)}${x.old ? ` <s>${M.fmt(x.old)}</s>` : ''}` : '');
      const count = $('[data-lb-count]', dlg);
      if (count) count.textContent = list.length > 1 ? `${at + 1} / ${list.length}` : '';
      $$('[data-lb-prev],[data-lb-next]', dlg).forEach((b) => (b.hidden = list.length < 2));
      const pick = $('[data-lb-pick]', dlg);
      pick.hidden = !x.pick;
      pick.dataset.p = x.pick || '';
      if (!dlg.open) dlg.showModal();
    }
    const go = (d) => list.length > 1 && open(null, at + d);
    $('[data-lb-prev]', dlg).addEventListener('click', () => go(-1));
    $('[data-lb-next]', dlg).addEventListener('click', () => go(1));
    $('[data-lb-close]', dlg).addEventListener('click', () => dlg.close());
    const swiped = onSwipe($('[data-lb-img]', dlg), go);
    dlg.addEventListener('click', (e) => { if (e.target === dlg && !swiped()) dlg.close(); });
    dlg.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); });
    $('[data-lb-pick]', dlg).addEventListener('click', (e) => {
      const [c, s, v] = e.currentTarget.dataset.p.split('|');
      dlg.close();
      select(c, s, v);
      toConfigurator();
    });
    return open;
  }

  // Усі фото однієї моделі для перегляду: перше — з прайсу, далі — деталі й фото з дітьми
  const slidesOf = ({ cat, size, v }) => v.gallery.map((g, k) => ({
    src: g.src, alt: g.alt, title: k ? g.cap : `${cat.name} ${size.label}, ${v.name.toLowerCase()}`,
    price: v.price, old: v.old, pick: `${cat.id}|${size.id}|${v.id}`,
  }));

  /* ---------- Прайс: усі позиції, згенеровані з даних ---------- */
  function mountPricelist(root) {
    const frag = document.createDocumentFragment();
    M.CATALOG.forEach((cat) => {
      const count = cat.sizes.reduce((a, s) => a + s.variants.length, 0);
      const group = document.createElement('div');
      group.className = 'pl-group';
      group.innerHTML = `<div class="pl-head"><h3>${cat.plural}</h3><span>${count} позицій</span></div><ul class="pl-items"></ul>`;
      const ul = $('ul', group);
      cat.sizes.forEach((size) => size.variants.forEach((v) => {
        const li = document.createElement('li');
        li.className = 'pl-item';
        const photo = v.photo && root.dataset.plPhotos !== 'off';
        const name = `${cat.name} ${size.label} · ${v.name}`;
        const thumb = photo
          ? `<button type="button" class="pl-thumb" data-zoom="${cat.id}|${size.id}|${v.id}" aria-label="Фото: ${name}"><img src="${v.photo}" alt="" width="1100" height="1100" loading="lazy"></button>`
          : `<span class="pl-thumb">${M.art(cat, size, v)}</span>`;
        li.innerHTML = `${thumb}
          <span class="pl-body"><span class="pl-line"><span class="pl-name">${name}</span><span class="pl-price">${M.fmt(v.price)}${v.old ? ` <s>${M.fmt(v.old)}</s>` : ''}</span></span>
          <span class="pl-desc">${v.zones.length} ${plural(v.zones.length)}: ${v.zones.slice(0, 4).join(', ').toLowerCase()}…</span>
          <button type="button" class="pl-pick" data-pick="${cat.id}|${size.id}|${v.id}">Обрати цю модель</button></span>`;
        ul.append(li);
      }));
      frag.append(group);
    });
    root.replaceChildren(frag);
    const dlg = root.parentElement.querySelector('dialog');
    const open = dlg && mountLightbox(dlg);
    root.addEventListener('click', (e) => {
      const z = e.target.closest('[data-zoom]');
      if (z && open) {
        open(slidesOf(byKey(z.dataset.zoom)), 0);
        return;
      }
      const b = e.target.closest('[data-pick]');
      if (!b) return;
      const [c, s, v] = b.dataset.pick.split('|');
      select(c, s, v);
      toConfigurator();
    });
  }

  /* ---------- Міні-галерея: плитка на кожну модель; у перегляді — усі фото цієї моделі ---------- */
  function mountGallery(root) {
    const grid = $('[data-gallery-grid]', root), filters = $('[data-gallery-filters]', root), dlg = $('dialog', root);
    const shots = M.ITEMS.map((it) => ({ ...slidesOf(it)[0], kind: it.cat.id, slides: slidesOf(it) }));
    const kinds = [['all', 'Усі'], ['cube', 'Бізікубики'], ['board', 'Бізіборди']];
    let kind = 'all';
    const open = mountLightbox(dlg);

    function render() {
      const list = shots.filter((x) => kind === 'all' || x.kind === kind);
      filters.replaceChildren(...kinds.map(([k, t]) => chip(`${t} · ${k === 'all' ? shots.length : shots.filter((x) => x.kind === k).length}`, k === kind, { kind: k })));
      grid.replaceChildren(...list.map((x) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'g-tile';
        const more = x.slides.length > 1 ? `<span class="g-more">+${x.slides.length - 1} фото</span>` : '';
        b.innerHTML = `<img src="${x.src}" alt="${x.alt}" width="1100" height="1100" loading="lazy">${more}<span class="g-cap">${x.title}${x.price ? ` <b>${M.fmt(x.price)}</b>${x.old ? ` <s>${M.fmt(x.old)}</s>` : ''}` : ''}</span>`;
        b.addEventListener('click', () => open(x.slides, 0));
        return b;
      }));
    }
    filters.addEventListener('click', (e) => { const b = e.target.closest('[data-kind]'); if (b) { kind = b.dataset.kind; render(); } });
    render();
  }

  /* ---------- Відгуки з даних (REVIEWS у products.js) ---------- */
  function mountReviews(root) {
    const sec = root.closest('section');
    if (sec) sec.classList.toggle('no-reviews', !(M.REVIEWS || []).length);
    root.replaceChildren(...(M.REVIEWS || []).map((r) => {
      const [c, s, v] = r.item.split('|');
      const it = M.ITEMS.find((x) => x.cat.id === c && x.size.id === s && x.v.id === v);
      const card = document.createElement('figure');
      card.className = 'rv' + (r.sample ? ' rv-sample' : '');
      card.innerHTML = `${it ? `<img src="${it.v.photo}" alt="${it.cat.name} ${it.size.label}, ${it.v.name.toLowerCase()}" width="1100" height="1100" loading="lazy">` : ''}
        ${r.sample ? '<span class="rv-flag">Зразок, замініть справжнім відгуком</span>' : ''}
        <blockquote>${r.text}</blockquote>
        <figcaption><b>${r.name}</b>, ${r.city}${it ? `<br>${it.cat.name} ${it.size.label}, ${it.v.name.toLowerCase()}` : ''}</figcaption>`;
      return card;
    }));
  }

  /* ---------- Форма замовлення → /api/order (Vercel-функція шле заявку в Telegram) ---------- */
  // Токен бота живе тільки на сервері (змінні середовища), у браузерному коді його немає.
  const ORDER_URL = '/api/order';
  const NP_FEE = (sum) => Math.round(20 + sum * 0.02); // комісія Нової Пошти за накладений платіж

  async function post(payload) {
    const r = await fetch(ORDER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => null);
    // Демо-режим тільки на своєму комп'ютері. На справжньому сайті помилка = помилка, щоб замовлення не губились.
    const local = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);
    if (local && (!r || [404, 405, 501].includes(r.status))) {
      // Локальний перегляд без сервера: функції /api/order тут немає, тому просто показуємо результат.
      console.info('[Mavero] /api/order недоступний (локальний перегляд). Дані:', payload);
      return;
    }
    if (!r || !r.ok) {
      const j = r ? await r.json().catch(() => ({})) : {};
      throw new Error(j.error || 'order ' + (r ? r.status : 'network'));
    }
  }

  /* ---------- Підказки під полем (міста й відділення Нової Пошти) ----------
     load(текст) → масив або null (сервіс недоступний); render(елемент) → HTML рядка; pick(елемент) — вибір. */
  let acId = 0;
  function autocomplete(input, { load, render, pick, when = () => true }) {
    const list = document.createElement('ul');
    list.className = 'ac-list';
    list.id = 'ac-' + ++acId;
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    input.closest('.field').after(list);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', list.id);
    input.setAttribute('aria-expanded', 'false');
    input.autocomplete = 'off';
    let items = [], active = -1, seq = 0, timer;

    function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
    function draw() {
      list.innerHTML = items.length
        ? items.map((x, i) => `<li role="option" id="${list.id}-${i}" aria-selected="${i === active}">${render(x)}</li>`).join('')
        : '<li class="ac-none" aria-disabled="true">Нічого не знайдено. Спробуйте інакше.</li>';
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      if (active >= 0) {
        input.setAttribute('aria-activedescendant', `${list.id}-${active}`);
        list.children[active].scrollIntoView({ block: 'nearest' });
      }
    }
    async function update() {
      if (!when()) return close();
      const my = ++seq;
      const data = await load(input.value.trim());
      if (my !== seq || document.activeElement !== input) return;
      if (!data) return close();
      items = data;
      active = -1;
      draw();
    }
    function choose(i) { if (!items[i]) return; pick(items[i]); close(); }

    input.addEventListener('input', (e) => { if (!e.isTrusted) return; clearTimeout(timer); timer = setTimeout(update, 250); });
    input.addEventListener('focus', update);
    input.addEventListener('blur', () => setTimeout(close, 150));
    input.addEventListener('keydown', (e) => {
      if (list.hidden || !items.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        draw();
      } else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') close();
    });
    list.addEventListener('mousedown', (e) => e.preventDefault()); // фокус лишається в полі
    list.addEventListener('click', (e) => { const li = e.target.closest('[role="option"]'); if (li) choose([...list.children].indexOf(li)); });
    return { update, close };
  }

  const lineName = (x) => `${x.cat.name} ${x.size.label}, ${x.v.name.toLowerCase()}`;

  function mountOrder(form) {
    const f = form.elements;
    const box = $('[data-cart]', form);
    const radio = (name) => (form.querySelector(`input[name="${name}"]:checked`) || {}).value || '';

    // Кошик у формі: фото, назва, ціна, кількість, прибрати
    function drawCart() {
      const items = cartItems();
      box.innerHTML = items.length ? `<ul class="cart-list">${items.map((x) => `
        <li class="cart-line" data-k="${x.k}">
          <span class="cart-img">${x.v.photo ? `<img src="${x.v.photo}" alt="" width="1100" height="1100" loading="lazy">` : M.art(x.cat, x.size, x.v)}</span>
          <span class="cart-info"><b>${lineName(x)}</b><span>${M.fmt(x.v.price)}${x.v.old ? ` <s>${M.fmt(x.v.old)}</s>` : ''}</span></span>
          <span class="cart-qty"><button type="button" data-q="-1" aria-label="Менше: ${lineName(x)}"${x.n < 2 ? ' disabled' : ''}>−</button><output aria-live="polite">${x.n}</output><button type="button" data-q="1" aria-label="Більше: ${lineName(x)}"${x.n > 9 ? ' disabled' : ''}>+</button></span>
          <button type="button" class="cart-del" data-del aria-label="Прибрати з кошика: ${lineName(x)}">×</button>
        </li>`).join('')}</ul>`
        : '<p class="cart-empty">Кошик порожній. Оберіть модель у конструкторі.</p>';
      box.insertAdjacentHTML('beforeend', '<a class="cart-more" href="#configurator" data-cart-more>+ Додати інший товар</a>');
      sync();
    }
    box.addEventListener('click', (e) => {
      const li = e.target.closest('[data-k]');
      if (e.target.closest('[data-cart-more]')) { e.preventDefault(); toConfigurator(); return; }
      if (!li) return;
      const line = cart.lines.find((l) => l.k === li.dataset.k);
      const q = e.target.closest('[data-q]');
      if (q) line.n = clampQty(line.n + +q.dataset.q);
      else if (e.target.closest('[data-del]')) cart.lines = cart.lines.filter((l) => l !== line);
      else return;
      cart.auto = false;
      cartChanged();
    });

    // Поля доставки підлаштовуються під перевізника; Укрпошта — лише з передоплатою
    function sync() {
      const sum = cartSum();
      const delivery = radio('delivery');
      const cod = form.querySelector('input[name="payment"][value="cod"]');
      if (cod) {
        cod.disabled = delivery === 'ukr';
        if (cod.disabled && cod.checked) form.querySelector('input[name="payment"][value="prepay"]').checked = true;
      }
      const branch = $('[data-branch-label]', form);
      if (branch) {
        branch.textContent = { np: 'Номер відділення Нової Пошти', npbox: 'Номер поштомату', ukr: 'Адреса та індекс відділення Укрпошти' }[delivery] || 'Відділення';
        f.branch.placeholder = { np: 'Номер або вулиця, наприклад 12', npbox: 'Номер або вулиця поштомату', ukr: 'вул. Шевченка, 5, 79000' }[delivery] || '';
      }
      const total = $('[data-order-total]', form);
      if (total) {
        const n = cartCount(), pay = radio('payment');
        total.innerHTML = !n ? '' : `До сплати: <b>${M.fmt(sum)}</b>` + (n > 1 ? ` за ${n} шт.` : '') +
          (pay === 'cod' ? `<br><span>Плюс комісія Нової Пошти при отриманні, приблизно ${M.fmt(NP_FEE(sum))}</span>`
            : pay === 'prepay' ? '<br><span>Реквізити для оплати надішлемо після підтвердження</span>' : '');
      }
    }
    cartListeners.push(drawCart);
    form.addEventListener('change', sync);
    // змінили перевізника — оновлюємо підказку під полем відділення, якщо там була помилка
    form.addEventListener('change', (e) => { if (e.target.name === 'delivery' && f.branch.hasAttribute('aria-invalid')) f.branch.dispatchEvent(new Event('input')); });
    drawCart();

    /* Нова Пошта: місто й відділення обираються зі списку, щоб не було помилок в адресі.
       Якщо довідник недоступний (npDown), поля працюють як звичайний текст. */
    let npCity = null, npBranch = null, npDown = false;
    const isNP = () => radio('delivery') !== 'ukr';
    const npKind = () => (radio('delivery') === 'npbox' ? 'postomat' : 'branch');
    const npGet = (qs) => fetch('/api/np?' + qs)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => j.data)
      .catch(() => { npDown = true; return null; });
    const enc = encodeURIComponent;
    const setVal = (el, v) => { el.value = v; el.dispatchEvent(new Event('input')); }; // повторна перевірка поля
    const resetBranch = () => { npBranch = null; if (f.branch.value) setVal(f.branch, ''); };

    autocomplete(f.city, {
      when: () => isNP() && !npDown,
      load: (q) => (q.length < 2 ? Promise.resolve(null) : npGet('city=' + enc(q))),
      render: (c) => `<b>${c.name}</b> <span>${c.type}${/обл\./.test(c.name) ? '' : `, ${c.area} обл.`}</span>`,
      pick: (c) => {
        npCity = c;
        setVal(f.city, /обл\./.test(c.name) ? c.name : `${c.name}, ${c.area} обл.`);
        resetBranch();
        f.branch.focus();
      },
    });
    autocomplete(f.branch, {
      when: () => isNP() && !npDown && !!npCity,
      load: (q) => npGet(`wh=${npCity.ref}&kind=${npKind()}&q=${enc(q)}`),
      render: (w) => w.name.replace(/№\d+/, (m) => `<b>${m}</b>`),
      pick: (w) => { npBranch = w; setVal(f.branch, w.name); },
    });
    f.city.addEventListener('input', (e) => { if (e.isTrusted) { npCity = null; resetBranch(); } });
    f.branch.addEventListener('input', (e) => { if (e.isTrusted) npBranch = null; });
    // відділення й поштомат — різні списки, тому при зміні способу доставки відділення обираємо заново
    let lastDelivery = radio('delivery');
    form.addEventListener('change', (e) => {
      if (e.target.name !== 'delivery') return;
      if (e.target.value !== lastDelivery) resetBranch();
      lastDelivery = e.target.value;
    });

    const phone = f.phone;
    M.phoneMask(phone);
    M.lettersOnly(f.name);
    form.addEventListener('focusin', checkout);
    const delivery = () => radio('delivery');
    const check = M.validate(form, {
      name: (v) => !v ? 'Вкажіть прізвище та ім’я отримувача.'
        : v.split(/\s+/).length < 2 ? 'Потрібні і прізвище, і ім’я — як у паспорті.' : '',
      phone: (v) => !v || v === '+380' ? 'Вкажіть номер телефону.'
        : !M.phoneValid(v) ? 'Номер неповний: потрібно +380 і ще 9 цифр.' : '',
      city: (v) => v.length < 2 ? 'Вкажіть місто або село.'
        : isNP() && !npDown && !npCity ? 'Оберіть місто зі списку підказок.' : '',
      branch: (v) => !v ? (delivery() === 'ukr' ? 'Вкажіть адресу або індекс відділення.' : delivery() === 'npbox' ? 'Оберіть поштомат.' : 'Оберіть відділення.')
        : delivery() === 'ukr' ? ''
        : npDown ? (/\d/.test(v) ? '' : 'Вкажіть номер цифрами, наприклад 12.')
        : !npCity ? 'Спершу оберіть місто зі списку.'
        : !npBranch ? (delivery() === 'npbox' ? 'Оберіть поштомат зі списку.' : 'Оберіть відділення зі списку.') : '',
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = (k) => (f[k] && f[k].value.trim()) || '';
      const err = $('[data-order-error]', form);
      if (!cart.lines.length) {
        err.textContent = 'Кошик порожній: додайте хоча б одну модель.';
        box.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const valid = check();
      err.textContent = valid ? '' : 'Перевірте поля, позначені червоним.';
      if (!valid) return;

      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      const items = cartItems(), sum = cartSum(), event = cartEvent();
      const dl = form.querySelector('input[name="delivery"]:checked');
      const pl = form.querySelector('input[name="payment"]:checked');
      const eventId = M.newEventId();
      try {
        await post({
          type: 'order', event_id: eventId,
          name: val('name'), phone: phone.value,
          items: items.map((x) => ({ product: `${x.cat.name} ${x.size.label}`, colour: x.v.name.toLowerCase(), code: x.v.code, price: x.v.price, qty: x.n })),
          total: sum,
          delivery: dl ? dl.dataset.title : '', city: val('city'), branch: val('branch'),
          payment: pl ? pl.dataset.title : '',
          comment: val('comment'),
          website: val('website'),
        });
        // Лише після відповіді сервера «ok»: невдалі спроби й помилки валідації не рахуються
        M.track('Purchase', event, eventId, { ph: phone.value.replace(/\D/g, ''), ct: val('city').toLowerCase().replace(/\s+/g, ''), country: 'ua' });
        showThanks(items, sum, val('name'), pl ? pl.value : '');
        form.classList.add('is-sent');
        $('[data-order-ok]', form).hidden = false;
        cart.lines = [];
        cart.auto = false;
        cartChanged();
      } catch (x) {
        err.textContent = (x.message && !/^order /.test(x.message) ? x.message + '. ' : 'Не вдалося надіслати. ') + 'Спробуйте ще раз за хвилину.';
        btn.disabled = false;
      }
    });
  }

  // Вікно «Дякуємо» після успішного замовлення
  function showThanks(items, sum, name, pay) {
    const dlg = $('[data-thanks]');
    if (!dlg) return;
    const first = name.split(/\s+/)[1] || name;
    $('[data-thanks-name]', dlg).textContent = first ? `${first}, дякуємо!` : 'Дякуємо!';
    $('[data-thanks-list]', dlg).innerHTML = items.map((x) => `<li><span class="cart-img">${x.v.photo ? `<img src="${x.v.photo}" alt="" width="1100" height="1100">` : M.art(x.cat, x.size, x.v)}</span><span>${lineName(x)}${x.n > 1 ? ` × ${x.n}` : ''}</span><b>${M.fmt(x.v.price * x.n)}</b></li>`).join('');
    $('[data-thanks-sum]', dlg).textContent = M.fmt(sum);
    $('[data-thanks-pay]', dlg).textContent = pay === 'prepay'
      ? 'Реквізити для оплати надішлемо, коли підтвердимо замовлення.'
      : 'Оплата на пошті після огляду. Нічого платити зараз не потрібно.';
    dlg.showModal();
  }

  /* ---------- Форма «Залишити відгук» → теж у Telegram, власник додає відгук на сайт ---------- */
  function mountReviewForm(form) {
    const check = M.validate(form, {
      rname: (v) => (!v ? 'Вкажіть ім’я або нікнейм.' : ''),
      rtext: (v) => (!v ? 'Напишіть кілька слів про покупку.' : v.length < 10 ? 'Напишіть хоча б одне речення.' : ''),
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = form.elements, err = $('[data-review-error]', form);
      const name = f.rname.value.trim(), text = f.rtext.value.trim();
      if (!check()) return;
      err.textContent = '';
      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      try {
        await post({ type: 'review', name, model: f.rmodel.value, text, website: f.website.value });
        form.classList.add('is-sent');
        const ok = $('[data-review-ok]', form);
        ok.hidden = false;
        ok.focus();
      } catch (x) {
        err.textContent = 'Не вдалося надіслати. Спробуйте ще раз.';
        btn.disabled = false;
      }
    });
    const sel = form.elements.rmodel;
    if (sel) sel.append(...M.ITEMS.map(({ cat, size, v }) => new Option(`${cat.name} ${size.label}, ${v.name.toLowerCase()}`)));
  }

  /* ---------- «Чим корисний»: власні вкладки, не залежать від обраного товару ---------- */
  function mountUse(root) {
    const show = (id) => {
      $$('[data-use-panel]', root).forEach((p) => (p.hidden = p.dataset.usePanel !== id));
      $$('[data-use-tab]', root).forEach((b) => b.setAttribute('aria-pressed', b.dataset.useTab === id ? 'true' : 'false'));
    };
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-use-tab]'); if (b) show(b.dataset.useTab); });
    show($('[data-use-tab]', root).dataset.useTab);
  }

  /* ---------- Кнопки «Замовити цю» ведуть до форми ---------- */
  // Кнопки «Обрати кубик / борд»: перемикають категорію і ведуть до конструктора
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-goto-cat]');
    if (!a) return;
    e.preventDefault();
    select(a.dataset.gotoCat);
    toConfigurator();
  });

  // Інші посилання на конструктор («Змінити модель», футер, «Обрати розмір») — так само до фото
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href="#configurator"]:not([data-goto-cat]):not(.skip)');
    if (!a || !$('[data-cfg]')) return;
    e.preventDefault();
    toConfigurator();
  });

  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) { cartAdd(keyOf(state)); return; }
    const a = e.target.closest('[data-buy]');
    if (!a) return;
    const f = $('#order');
    if (!f) return;
    e.preventDefault();
    if ('addThis' in a.dataset) cartAdd(keyOf(state));
    checkout();
    f.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    setTimeout(() => { const i = $('input[name="name"]', f); i && i.focus({ preventScroll: true }); }, 500);
  });

  /* ---------- Поява секцій (частинами, з затримкою) ---------- */
  function mountReveal() {
    const items = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) return items.forEach((i) => i.classList.add('in'));
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -6% 0px' });
    items.forEach((i) => io.observe(i));
  }

  /* ---------- Кадр, у якому змінюються фото (тап — наступне) ---------- */
  function mountCrossfade(frame) {
    const imgs = $$('img', frame);
    const cap = frame.parentElement.querySelector('[data-fade-caption]');
    let i = 0;
    const show = (n) => {
      imgs.forEach((im, k) => im.classList.toggle('on', k === n));
      if (cap) cap.textContent = imgs[n].dataset.caption || imgs[n].alt;
    };
    show(0);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let t = reduce ? null : setInterval(() => !document.hidden && show((i = (i + 1) % imgs.length)), 3200);
    frame.addEventListener('click', () => { show((i = (i + 1) % imgs.length)); if (t) { clearInterval(t); t = setInterval(() => !document.hidden && show((i = (i + 1) % imgs.length)), 3200); } });
  }

  document.documentElement.classList.add('js');
  window.addEventListener('DOMContentLoaded', () => {
    $$('[data-cfg]').forEach(mountConfigurator);
    $$('[data-pricelist]').forEach(mountPricelist);
    $$('form[data-order]').forEach(mountOrder);
    $$('[data-fade]').forEach(mountCrossfade);
    $$('[data-gallery]').forEach(mountGallery);
    $$('[data-reviews]').forEach(mountReviews);
    $$('form[data-review]').forEach(mountReviewForm);
    $$('[data-use]').forEach(mountUse);
    $$('[data-art]').forEach((n) => {
      const [c, s, v] = n.dataset.art.split('|');
      const it = M.ITEMS.find((x) => x.cat.id === c && x.size.id === s && x.v.id === v);
      if (it) n.innerHTML = M.art(it.cat, it.size, it.v, { scaled: n.dataset.scaled === '1' });
    });
    $$('[data-contact-phone]').forEach((a) => { a.textContent = M.contact.phone; a.href = M.contact.phoneHref; });
    mountReveal();
  });

  M.select = select;
  M.plural = plural;
  M.state = state;
})();
