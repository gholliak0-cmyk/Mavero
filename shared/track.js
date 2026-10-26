/* Mavero — Meta Pixel. Поки PIXEL_ID порожній, нічого не завантажується і не надсилається.
   Події: PageView (кожна сторінка), ViewContent (обрали модель), InitiateCheckout (перейшли до форми),
   Purchase (сервер підтвердив замовлення), Lead (надіслали питання з «Контактів»).
   Purchase і Lead дублюються з сервера (Conversions API у api/order.js) з тим самим eventID,
   тому Meta рахує кожне замовлення один раз. */
(function () {
  const PIXEL_ID = '1645310737067292';

  const M = (window.MAVERO = window.MAVERO || {});
  const sent = new Set(); // щоб ViewContent і InitiateCheckout не сипались на кожен клік

  M.newEventId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));
  M.track = () => {};
  M.trackOnce = () => {};
  if (!PIXEL_ID) return;

  /* Стандартний код Meta Pixel */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');

  // user — дані покупця для кращого зіставлення (піксель сам хешує їх перед відправкою)
  M.track = (name, params = {}, eventID, user) => {
    if (user) fbq('init', PIXEL_ID, user);
    fbq('track', name, params, eventID ? { eventID } : undefined);
  };
  M.trackOnce = (key, name, params) => {
    if (sent.has(key)) return;
    sent.add(key);
    M.track(name, params);
  };
})();
