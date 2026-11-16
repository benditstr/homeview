// Cloudflare Worker: holt deinen iCal-Kalender und gibt ihn mit CORS ans Dashboard weiter.
// Leitet nur Kalender-Adressen von iCloud, Google und Outlook weiter (kein offener Proxy).

const ALLOWED = [
  (h) => h.endsWith('.icloud.com'),
  (h) => h === 'calendar.google.com',
  (h) => h === 'outlook.office365.com' || h === 'outlook.live.com',
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const raw = new URL(request.url).searchParams.get('url');
    if (!raw) return new Response('url fehlt', { status: 400, headers: CORS });

    let target;
    try {
      target = new URL(raw.trim().replace(/^webcal:/i, 'https:'));
    } catch (e) {
      return new Response('ungültige url', { status: 400, headers: CORS });
    }
    if (target.protocol !== 'https:' || !ALLOWED.some((ok) => ok(target.hostname))) {
      return new Response('nicht erlaubt', { status: 403, headers: CORS });
    }

    const res = await fetch(target.toString(), { cf: { cacheTtl: 300, cacheEverything: true } });
    return new Response(await res.text(), {
      status: res.status,
      headers: { ...CORS, 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'max-age=300' },
    });
  },
};
