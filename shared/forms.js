/* Mavero — перевірка форм: маска українського телефону й помилки під кожним полем.
   M.phoneMask(input) — у полі можна набрати лише номер у вигляді +380 67 123 45 67.
   M.validate(form, rules) — rules: { ім'я_поля: (значення) => 'текст помилки' або '' }.
   Повертає check(): перевіряє всі поля, показує помилки й переводить до першого неправильного. */
(function () {
  const M = (window.MAVERO = window.MAVERO || {});

  // Будь-який ввід (067…, 8067…, +38 (067)…, 38067…) зводимо до 380XXXXXXXXX
  function phoneDigits(v) {
    let d = v.replace(/\D/g, '');
    if (!d) return '';
    if ('380'.startsWith(d)) return d;
    if (d.startsWith('380')) {
      // поле вже мало «+380», а людина набирає 067… або 8067… — зайві 0 і 80 прибираємо
      const rest = d.slice(3).replace(/^8?0/, '');
      return ('380' + rest).slice(0, 12);
    }
    if (d.startsWith('80')) d = '3' + d;
    else if (d.startsWith('0')) d = '38' + d;
    else d = '380' + d;
    return d.slice(0, 12);
  }
  function phoneFormat(d) {
    if (!d) return '';
    return ('+' + d.slice(0, 3) + ' ' + d.slice(3, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8, 10) + ' ' + d.slice(10, 12)).trim();
  }
  M.phoneValid = (v) => /^380[1-9]\d{8}$/.test(phoneDigits(v));

  // only: якщо задано, маска вмикається лише тоді, коли only(значення) — true (поле «телефон або @нікнейм»)
  M.phoneMask = (input, only) => {
    input.addEventListener('focus', () => { if (!input.value && !only) input.value = '+380 '; });
    input.addEventListener('blur', () => { if (phoneDigits(input.value) === '380' && /^\+?380\s*$/.test(input.value)) input.value = ''; });
    input.addEventListener('input', (e) => {
      const v = input.value;
      if (only && !only(v)) return;
      let d = phoneDigits(v);
      // стерли все до коду країни — очищаємо поле, щоб не застрягати на «+380»
      if (e.inputType && e.inputType.startsWith('delete') && d.length <= 3) d = '';
      // курсор лишаємо після тієї ж кількості цифр, що й до форматування
      const before = v.slice(0, input.selectionStart || 0).replace(/\D/g, '').length;
      const shift = d.length - v.replace(/\D/g, '').length;
      input.value = phoneFormat(d);
      let pos = 0, seen = 0;
      const want = Math.max(0, before + shift);
      while (pos < input.value.length && seen < want) { if (/\d/.test(input.value[pos])) seen++; pos++; }
      if (document.activeElement === input) input.setSelectionRange(pos, pos);
    });
  };

  M.validate = (form, rules) => {
    const f = form.elements;
    function show(name) {
      const el = f[name];
      if (!el || !el.closest) return '';
      const msg = rules[name](el.value.trim(), el) || '';
      const box = el.closest('.field') || el.parentElement;
      let note = box.querySelector('.field-err');
      if (!note) {
        note = document.createElement('small');
        note.className = 'field-err';
        note.id = 'err-' + name + '-' + Math.random().toString(36).slice(2, 7);
        note.setAttribute('aria-live', 'polite');
        box.append(note);
        el.setAttribute('aria-describedby', note.id);
      }
      note.textContent = msg;
      if (msg) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
      return msg;
    }
    // Натиснули кнопку відправки: не показуємо помилку на виході з поля, бо текст зсуне кнопку
    // і клік «промахнеться». Усі поля все одно перевіряються при відправці.
    let pressing = false;
    form.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('[type="submit"]')) return;
      pressing = true;
      addEventListener('pointerup', () => setTimeout(() => (pressing = false), 400), { once: true });
    });
    Object.keys(rules).forEach((name) => {
      const el = f[name];
      if (!el || !el.addEventListener) return;
      // помилку показуємо, коли людина вийшла з поля; поки виправляє — прибираємо, щойно стало правильно
      el.addEventListener('blur', () => { if (!pressing && (el.value.trim() || el.hasAttribute('aria-invalid'))) show(name); });
      el.addEventListener('input', () => { if (el.hasAttribute('aria-invalid')) show(name); });
    });
    return () => {
      const bad = Object.keys(rules).filter((name) => show(name));
      if (bad.length) {
        const el = f[bad[0]];
        const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
        el.focus({ preventScroll: true });
      }
      return bad.length === 0;
    };
  };
})();
