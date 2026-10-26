/* Mavero — приймає заявку з форми лендінгу і пересилає її в Telegram.
   Змінні середовища (Vercel → Settings → Environment Variables):
     TELEGRAM_BOT_TOKEN — токен від @BotFather
     TELEGRAM_CHAT_ID   — куди слати заявки
   type: 'order' — замовлення (дані отримувача, доставка, оплата)
   type: 'review' — відгук з форми «Залиште відгук»
   type: 'question' — питання зі сторінки «Контакти»
   Meta Conversions API (необов'язково, вмикається, коли задані обидві змінні):
     META_PIXEL_ID     — ID пікселя (той самий, що в shared/track.js)
     META_CAPI_TOKEN   — токен з Events Manager → Налаштування → Conversions API
     META_TEST_CODE    — тимчасово, код з вкладки «Тестові події», щоб перевірити */

import { createHash } from 'node:crypto';

const esc = (s) => String(s ?? '').trim().slice(0, 500)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = (n) => Number(n || 0).toLocaleString('uk-UA') + ' грн';

function orderMessage(b, phone) {
  const qty = Math.max(1, Math.min(10, parseInt(b.qty, 10) || 1));
  const total = Number(b.total) || Number(b.price) * qty;
  const cod = /наклад/i.test(b.payment || '');
  return [
    '🛒 <b>Нове замовлення</b>',
    '',
    `📦 ${esc(b.product)}${b.colour ? ', ' + esc(b.colour) : ''}`,
    b.code ? `🏷 Код постачальника: <code>${esc(b.code)}</code>` : null,
    `🔢 Кількість: ${qty} × ${money(b.price)}`,
    `💰 Сума: <b>${money(total)}</b>`,
    '',
    '<b>Отримувач</b>',
    `👤 ${esc(b.name)}`,
    `📞 <a href="tel:${esc(phone)}">${esc(phone)}</a>`,
    '',
    '<b>Доставка</b>',
    `🚚 ${esc(b.delivery || 'не вказано')}`,
    `📍 ${esc(b.city || 'місто не вказано')}`,
    `🏤 ${esc(b.branch || 'відділення не вказано')}`,
    '',
    '<b>Оплата</b>',
    `💳 ${esc(b.payment || 'не вказано')}`,
    cod ? `   комісія НП при отриманні ≈ ${money(Math.round(20 + total * 0.02))}` : null,
    b.comment ? `\n💬 ${esc(b.comment)}` : null,
  ].filter((x) => x !== null).join('\n');
}

function reviewMessage(b) {
  return [
    '⭐️ <b>Новий відгук з сайту</b>',
    '',
    `👤 ${esc(b.name)}`,
    b.model ? `📦 ${esc(b.model)}` : null,
    '',
    esc(b.text),
    '',
    'Щоб показати його на сайті: додай у REVIEWS у shared/products.js',
  ].filter((x) => x !== null).join('\n');
}

function questionMessage(b) {
  return [
    '❓ <b>Питання з сайту</b>',
    '',
    `👤 ${esc(b.name)}`,
    `📞 ${esc(b.contact)}`,
    '',
    esc(b.text),
  ].join('\n');
}

/* ---------- Meta Conversions API: те саме замовлення з сервера, з тим самим event_id, що й піксель ---------- */
const sha = (v) => createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');
const cookie = (req, name) => (String(req.headers.cookie || '').match(new RegExp('(?:^|; )' + name + '=([^;]*)')) || [])[1];

async function sendToMeta(req, b, phone) {
  const { META_PIXEL_ID: pixel, META_CAPI_TOKEN: token, META_TEST_CODE: testCode } = process.env;
  if (!pixel || !token || !b.event_id) return;
  const digits = phone.replace(/\D/g, '');
  const ph = digits.length === 10 ? '38' + digits : digits;
  const [ln, fn] = String(b.name || '').trim().split(/\s+/); // у формі просимо «Прізвище та ім’я»
  const user_data = {
    country: [sha('ua')],
    client_ip_address: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || undefined,
    client_user_agent: req.headers['user-agent'],
    fbp: cookie(req, '_fbp'),
    fbc: cookie(req, '_fbc'),
  };
  if (ph.length >= 11) user_data.ph = [sha(ph)];
  if (b.type === 'order' && ln) user_data.ln = [sha(ln)];
  if (b.type === 'order' && fn) user_data.fn = [sha(fn)];
  if (b.city) user_data.ct = [sha(String(b.city).replace(/\s+/g, ''))];

  const qty = Math.max(1, Math.min(10, parseInt(b.qty, 10) || 1));
  const event = b.type === 'question'
    ? { event_name: 'Lead' }
    : { event_name: 'Purchase', custom_data: { currency: 'UAH', value: Number(b.price) * qty, content_ids: [String(b.code || '')], content_type: 'product', num_items: qty } };

  const body = {
    data: [{
      ...event,
      event_time: Math.floor(Date.now() / 1000),
      event_id: String(b.event_id),
      action_source: 'website',
      event_source_url: req.headers.referer,
      user_data,
    }],
  };
  if (testCode) body.test_event_code = testCode;

  try {
    const r = await fetch(`https://graph.facebook.com/v24.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) console.error('Meta CAPI error', r.status, await r.text());
  } catch (x) {
    console.error('Meta CAPI failed', x.message); // замовлення вже в Telegram, тому покупцеві помилку не показуємо
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  let b;
  try {
    b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({ ok: false, error: 'Некоректні дані' });
  }

  // Приховане поле-пастка: людина його не бачить, бот-спамер заповнює
  if (b.website) return res.status(200).json({ ok: true });

  let text, phone = '';
  if (b.type === 'question') {
    if (!b.name || String(b.contact || '').trim().length < 5 || String(b.text || '').trim().length < 5) {
      return res.status(400).json({ ok: false, error: 'Вкажіть ім’я, контакт і питання' });
    }
    text = questionMessage(b);
  } else if (b.type === 'review') {
    if (!b.name || String(b.text || '').trim().length < 10) {
      return res.status(400).json({ ok: false, error: 'Вкажіть ім’я і текст відгуку' });
    }
    text = reviewMessage(b);
  } else {
    phone = String(b.phone || '').replace(/[^\d+]/g, '');
    if (!b.name || phone.length < 10) {
      return res.status(400).json({ ok: false, error: 'Вкажіть прізвище, ім’я і телефон' });
    }
    if (!b.city || !b.branch) {
      return res.status(400).json({ ok: false, error: 'Вкажіть місто і відділення' });
    }
    text = orderMessage(b, phone);
  }

  const tg = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  if (!tg.ok) {
    console.error('Telegram error', tg.status, await tg.text());
    return res.status(502).json({ ok: false, error: 'Не вдалося надіслати, спробуйте ще раз' });
  }
  if (b.type === 'order') await sendToMeta(req, b, phone);
  else if (b.type === 'question') await sendToMeta(req, b, /^\+?[\d\s()-]{10,}$/.test(String(b.contact || '')) ? String(b.contact) : '');
  return res.status(200).json({ ok: true });
}
