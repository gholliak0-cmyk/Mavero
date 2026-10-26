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

  /* ---------- Конфігуратор ---------- */
  function mountConfigurator(root) {
    const el = (k) => $(`[data-cfg-${k}]`, root);
    const cats = el('cats'), sizes = el('sizes'), vars = el('variants');
    const fig = el('figure'), cap = el('caption');

    function render(s) {
      cats.replaceChildren(...M.CATALOG.map((c) => chip(c.plural, c === s.cat, { cat: c.id })));
      sizes.replaceChildren(...s.cat.sizes.map((z) => chip(z.label, z === s.size, { size: z.id })));
      vars.replaceChildren(...s.size.variants.map((v) => chip(v.name, v === s.v, { v: v.id }, M.COLOURS[v.colour].swatch)));
      const varLabel = el('variants-label');
      if (varLabel) varLabel.textContent = s.cat.id === 'cube' ? 'Колір' : 'Модель';

      fig.classList.remove('is-in');
      const thumbs = el('thumbs');
      if (s.v.photo && root.dataset.cfgPhotos !== 'off') {
        const show = (g) => {
          fig.innerHTML = `<img src="${g.src}" alt="${g.alt}" width="1100" height="1100">`;
          if (cap) cap.textContent = g.cap;
        };
        show(s.v.gallery[0]);
        if (thumbs) {
          thumbs.hidden = s.v.gallery.length < 2;
          thumbs.replaceChildren(...s.v.gallery.map((g, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'thumb';
            b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
            b.setAttribute('aria-label', g.cap);
            b.innerHTML = `<img src="${g.src}" alt="" width="120" height="120" loading="lazy">`;
            b.addEventListener('click', () => {
              $$('.thumb', thumbs).forEach((t) => t.setAttribute('aria-pressed', t === b ? 'true' : 'false'));
              fig.classList.remove('is-in');
              show(g);
              requestAnimationFrame(() => fig.classList.add('is-in'));
            });
            return b;
          }));
        }
      } else {
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
  }

  /* ---------- Meta Pixel (shared/track.js): що дивились і коли перейшли до замовлення ---------- */
  const item = (s = state, n = 1) => ({ content_ids: [s.v.code], content_name: label(s), content_type: 'product', value: s.v.price * n, currency: 'UAH', num_items: n });
  listeners.push((s) => M.trackOnce('vc:' + s.v.code, 'ViewContent', item(s)));
  const checkout = () => M.trackOnce('ic', 'InitiateCheckout', item());

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
        const thumb = v.photo && root.dataset.plPhotos !== 'off' ? `<img src="${v.photo}" alt="" width="1100" height="1100" loading="lazy">` : M.art(cat, size, v);
        li.innerHTML = `<span class="pl-thumb">${thumb}</span>
          <span class="pl-body"><span class="pl-line"><span class="pl-name">${cat.name} ${size.label} · ${v.name}</span><span class="pl-price">${M.fmt(v.price)}</span></span>
          <span class="pl-desc">${v.zones.length} ${plural(v.zones.length)}: ${v.zones.slice(0, 4).join(', ').toLowerCase()}…</span>
          <button type="button" class="pl-pick" data-pick="${cat.id}|${size.id}|${v.id}">Обрати цю модель</button></span>`;
        ul.append(li);
      }));
      frag.append(group);
    });
    root.replaceChildren(frag);
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick]');
      if (!b) return;
      const [c, s, v] = b.dataset.pick.split('|');
      select(c, s, v);
      const target = $('#configurator') || $('#order');
      target && target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Міні-галерея: усі фото товарів, фільтр і перегляд на весь екран ---------- */
  function mountGallery(root) {
    const grid = $('[data-gallery-grid]', root), filters = $('[data-gallery-filters]', root), dlg = $('dialog', root);
    const shots = [];
    M.ITEMS.forEach(({ cat, size, v }) => shots.push({ ...v.gallery[0], kind: cat.id, pick: `${cat.id}|${size.id}|${v.id}`, title: `${cat.name} ${size.label}, ${v.name.toLowerCase()}`, price: v.price }));
    // живі фото з фотосесії — окремою групою
    const seen = new Set();
    M.ITEMS.forEach(({ v }) => v.gallery.filter((g) => g.life && !seen.has(g.src)).forEach((g) => { seen.add(g.src); shots.push({ ...g, kind: 'life', title: g.cap }); }));
    const kinds = [['all', 'Усі'], ['cube', 'Бізікубики'], ['board', 'Бізіборди'], ['life', 'Живі фото']];
    let kind = 'all', list = shots, at = 0;

    function render() {
      list = shots.filter((x) => kind === 'all' || x.kind === kind);
      filters.replaceChildren(...kinds.map(([k, t]) => chip(`${t} · ${k === 'all' ? shots.length : shots.filter((x) => x.kind === k).length}`, k === kind, { kind: k })));
      grid.replaceChildren(...list.map((x, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'g-tile' + (x.kind === 'life' ? ' g-life' : '');
        b.innerHTML = `<img src="${x.src}" alt="${x.alt}" width="1100" height="1100" loading="lazy"><span class="g-cap">${x.title}${x.price ? ` <b>${M.fmt(x.price)}</b>` : ''}</span>`;
        b.addEventListener('click', () => open(i));
        return b;
      }));
    }
    function open(i) {
      at = (i + list.length) % list.length;
      const x = list[at];
      $('[data-lb-img]', dlg).innerHTML = `<img src="${x.src}" alt="${x.alt}" width="1100" height="1100">`;
      $('[data-lb-cap]', dlg).textContent = x.title + (x.price ? ' — ' + M.fmt(x.price) : '');
      const pick = $('[data-lb-pick]', dlg);
      pick.hidden = !x.pick;
      pick.dataset.p = x.pick || '';
      if (!dlg.open) dlg.showModal();
    }
    filters.addEventListener('click', (e) => { const b = e.target.closest('[data-kind]'); if (b) { kind = b.dataset.kind; render(); } });
    $('[data-lb-prev]', dlg).addEventListener('click', () => open(at - 1));
    $('[data-lb-next]', dlg).addEventListener('click', () => open(at + 1));
    $('[data-lb-close]', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') open(at - 1); if (e.key === 'ArrowRight') open(at + 1); });
    $('[data-lb-pick]', dlg).addEventListener('click', (e) => {
      const [c, s, v] = e.currentTarget.dataset.p.split('|');
      dlg.close();
      select(c, s, v);
      const t = $('#configurator');
      t && t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    render();
  }

  /* ---------- Відгуки з даних (REVIEWS у products.js) ---------- */
  function mountReviews(root) {
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

  function mountOrder(form) {
    const product = $('[data-order-product]', form) || $('[data-order-product]');
    const hidden = $('input[name="product"]', form);
    const f = form.elements;
    const qty = () => Math.max(1, Math.min(10, parseInt(f.qty && f.qty.value, 10) || 1));
    const radio = (name) => (form.querySelector(`input[name="${name}"]:checked`) || {}).value || '';

    // Поля доставки підлаштовуються під перевізника; Укрпошта — лише з передоплатою
    function sync() {
      const s = state, n = qty(), sum = s.v.price * n;
      if (product) product.textContent = `${label(s)} — ${M.fmt(s.v.price)}`;
      if (hidden) hidden.value = `${label(s)} (${s.v.code}) — ${M.fmt(s.v.price)}`;
      const delivery = radio('delivery');
      const cod = form.querySelector('input[name="payment"][value="cod"]');
      if (cod) {
        cod.disabled = delivery === 'ukr';
        if (cod.disabled && cod.checked) form.querySelector('input[name="payment"][value="prepay"]').checked = true;
      }
      const branch = $('[data-branch-label]', form);
      if (branch) {
        branch.textContent = { np: 'Номер відділення Нової Пошти', npbox: 'Номер поштомату', ukr: 'Адреса та індекс відділення Укрпошти' }[delivery] || 'Відділення';
        f.branch.placeholder = { np: 'Наприклад, 12', npbox: 'Наприклад, 34567', ukr: 'вул. Шевченка, 5, 79000' }[delivery] || '';
        f.branch.inputMode = delivery === 'ukr' ? 'text' : 'numeric';
      }
      const total = $('[data-order-total]', form);
      if (total) {
        const pay = radio('payment');
        total.innerHTML = `До сплати: <b>${M.fmt(sum)}</b>` + (n > 1 ? ` за ${n} шт.` : '') +
          (pay === 'cod' ? `<br><span>Плюс комісія Нової Пошти при отриманні, приблизно ${M.fmt(NP_FEE(sum))}</span>`
            : pay === 'prepay' ? '<br><span>Реквізити для оплати надішлемо після підтвердження</span>' : '');
      }
    }
    listeners.push(sync);
    form.addEventListener('change', sync);
    form.addEventListener('input', (e) => { if (e.target.name === 'qty') sync(); });
    $$('[data-qty]', form).forEach((b) => b.addEventListener('click', () => { f.qty.value = Math.max(1, Math.min(10, qty() + +b.dataset.qty)); sync(); }));
    sync();

    const phone = f.phone;
    phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+380 '; });
    form.addEventListener('focusin', checkout);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = (k) => (f[k] && f[k].value.trim()) || '';
      const name = val('name');
      const digits = phone.value.replace(/\D/g, '');
      const err = $('[data-order-error]', form);
      const bad = !name ? 'Вкажіть, будь ласка, прізвище та ім’я отримувача.'
        : !/^(380\d{9}|0\d{9})$/.test(digits) ? 'Перевірте номер: потрібно 10 цифр, наприклад 067 123 45 67.'
        : f.city && !val('city') ? 'Вкажіть місто або село.'
        : f.branch && !val('branch') ? 'Вкажіть відділення або поштомат.'
        : f.payment && !radio('payment') ? 'Оберіть спосіб оплати.' : '';
      err.textContent = bad;
      if (bad) { const first = form.querySelector(':invalid'); first && first.focus(); return; }

      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      const n = qty();
      const dl = form.querySelector('input[name="delivery"]:checked');
      const pl = form.querySelector('input[name="payment"]:checked');
      const eventId = M.newEventId();
      try {
        await post({
          type: 'order', event_id: eventId,
          name, phone: phone.value,
          product: `${state.cat.name} ${state.size.label}`, colour: state.v.name.toLowerCase(),
          code: state.v.code, price: state.v.price, qty: n, total: state.v.price * n,
          delivery: dl ? dl.dataset.title : '', city: val('city'), branch: val('branch'),
          payment: pl ? pl.dataset.title : '',
          comment: val('comment'),
          website: val('website'),
        });
        // Лише після відповіді сервера «ok»: невдалі спроби й помилки валідації не рахуються
        const ph = digits.length === 10 ? '38' + digits : digits;
        M.track('Purchase', item(state, n), eventId, { ph, ct: val('city').toLowerCase().replace(/\s+/g, ''), country: 'ua' });
        form.classList.add('is-sent');
        const ok = $('[data-order-ok]', form);
        ok.hidden = false;
        ok.focus();
      } catch (x) {
        err.textContent = (x.message && !/^order /.test(x.message) ? x.message + '. ' : 'Не вдалося надіслати. ') + 'Спробуйте ще раз за хвилину.';
        btn.disabled = false;
      }
    });
  }

  /* ---------- Форма «Залишити відгук» → теж у Telegram, власник додає відгук на сайт ---------- */
  function mountReviewForm(form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = form.elements, err = $('[data-review-error]', form);
      const name = f.rname.value.trim(), text = f.rtext.value.trim();
      err.textContent = !name ? 'Вкажіть ім’я або нікнейм.' : text.length < 10 ? 'Напишіть хоча б одне речення.' : '';
      if (err.textContent) return;
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

  /* ---------- «Чим корисний»: опис змінюється разом з обраною категорією ---------- */
  function mountUse(root) {
    const show = (s) => {
      $$('[data-use-panel]', root).forEach((p) => (p.hidden = p.dataset.usePanel !== s.cat.id));
      $$('[data-use-tab]', root).forEach((b) => b.setAttribute('aria-pressed', b.dataset.useTab === s.cat.id ? 'true' : 'false'));
    };
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-use-tab]'); if (b) select(b.dataset.useTab); });
    listeners.push(show);
    show(state);
  }

  /* ---------- Кнопки «Замовити цю» ведуть до форми ---------- */
  // Кнопки «Обрати кубик / борд»: перемикають категорію і ведуть до конструктора
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-goto-cat]');
    if (!a) return;
    e.preventDefault();
    select(a.dataset.gotoCat);
    const t = $('#configurator');
    t && t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-buy]');
    if (!a) return;
    const f = $('#order');
    if (!f) return;
    e.preventDefault();
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
