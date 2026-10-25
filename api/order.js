/* Mavero — приймає заявку з форми лендінгу і пересилає її в Telegram.
   Змінні середовища (Vercel → Settings → Environment Variables):
     TELEGRAM_BOT_TOKEN — токен від @BotFather
     TELEGRAM_CHAT_ID   — куди слати заявки
   type: 'order' — замовлення (дані отримувача, доставка, оплата)
   type: 'review' — відгук з форми «Залиште відгук» */

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

  let text;
  if (b.type === 'review') {
    if (!b.name || String(b.text || '').trim().length < 10) {
      return res.status(400).json({ ok: false, error: 'Вкажіть ім’я і текст відгуку' });
    }
    text = reviewMessage(b);
  } else {
    const phone = String(b.phone || '').replace(/[^\d+]/g, '');
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
  return res.status(200).json({ ok: true });
}
