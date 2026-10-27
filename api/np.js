/* Mavero — підказки Нової Пошти для форми замовлення (міста, відділення, поштомати).
   GET /api/np?city=Ки                          → міста, де є Нова Пошта
   GET /api/np?wh=<CityRef>&kind=branch&q=12    → відділення міста (kind=postomat — поштомати)
   Змінна середовища NP_API_KEY (Vercel) — ключ з кабінету Нової Пошти. Без неї довідник теж працює,
   але з ключем Нова Пошта не обмежує кількість запитів. */

const NP_URL = 'https://api.novaposhta.ua/v2.0/json/';
const POSTOMAT = 'f9316480-5f2d-425d-bc2c-ac7cd29decf0'; // TypeOfWarehouseRef поштоматів

async function np(calledMethod, methodProperties) {
  const r = await fetch(NP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: process.env.NP_API_KEY || '', modelName: 'Address', calledMethod, methodProperties }),
    signal: AbortSignal.timeout(6000),
  });
  const j = await r.json();
  if (!j.success) throw new Error((j.errors || []).join('; ') || 'NP error');
  return j.data || [];
}

async function cities(q) {
  const data = await np('getCities', { FindByString: q, Limit: '20' });
  return data.map((c) => ({
    ref: c.Ref,
    name: c.Description,
    area: c.AreaDescription,
    type: c.SettlementTypeDescription,
  }));
}

async function warehouses(cityRef, kind, q) {
  const props = { CityRef: cityRef, Limit: '200', Page: '1' };
  if (q) props.FindByString = q;
  if (kind === 'postomat') props.TypeOfWarehouseRef = POSTOMAT;
  const data = await np('getWarehouses', props);
  const list = data
    .filter((w) => w.WarehouseStatus === 'Working')
    .filter((w) => (kind === 'postomat' ? w.CategoryOfWarehouse === 'Postomat' : w.CategoryOfWarehouse !== 'Postomat'))
    .map((w) => ({ ref: w.Ref, num: w.Number, name: w.Description }));
  // набрали номер — спершу точний збіг, потім номери, що з нього починаються;
  // поштомати «тільки для мешканців/співробітників» — в кінці списку
  const own = (w) => (/тільки для/i.test(w.name) ? 1 : 0);
  const rank = (w) => (/^\d+$/.test(q) ? (w.num === q ? 0 : w.num.startsWith(q) ? 1 : 2) : 0);
  list.sort((a, b) => rank(a) - rank(b) || own(a) - own(b) || a.num - b.num);
  return list.slice(0, 50);
}

export default async function handler(req, res) {
  const { city, wh, kind = 'branch' } = req.query || {};
  const q = String(req.query.q || '').trim().slice(0, 60);
  try {
    let data;
    if (city !== undefined) {
      const c = String(city).trim().slice(0, 60);
      data = c.length < 2 ? [] : await cities(c);
    } else if (wh && /^[\w-]{36}$/.test(wh)) {
      data = await warehouses(wh, kind === 'postomat' ? 'postomat' : 'branch', q);
    } else {
      return res.status(400).json({ ok: false });
    }
    // довідник змінюється рідко — Vercel тримає відповідь у кеші добу
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ ok: true, data });
  } catch (x) {
    console.error('NP lookup failed', x.message);
    return res.status(502).json({ ok: false });
  }
}
