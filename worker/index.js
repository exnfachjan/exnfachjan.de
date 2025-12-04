// Cloudflare Worker (module syntax)
// Proxy für YouTube Data API — liest den API-Key aus env.YOUTUBE_API_KEY.
// Unterstützte Endpoints: videos, search, channels
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    try {
      if (url.pathname === '/api/youtube' && request.method === 'GET') {
        const params = url.searchParams;
        const endpoint = params.get('endpoint');
        if (!endpoint) {
          return json({ ok: false, error: 'Missing "endpoint" query parameter' }, 400);
        }

        const allowed = new Set(['videos', 'search', 'channels']);
        if (!allowed.has(endpoint)) {
          return json({ ok: false, error: `Unsupported endpoint "${endpoint}"` }, 400);
        }

        const apiKey = env.YOUTUBE_API_KEY;
        if (!apiKey) {
          return json({ ok: false, error: 'YOUTUBE_API_KEY not configured on Cloudflare Worker' }, 500);
        }

        // Rebuild query, forward all params except 'endpoint'
        const forwardParams = new URLSearchParams();
        for (const [k, v] of params.entries()) {
          if (k === 'endpoint') continue;
          forwardParams.set(k, v);
        }

        forwardParams.set('key', apiKey);

        const externalUrl = `https://www.googleapis.com/youtube/v3/${endpoint}?${forwardParams.toString()}`;

        const forwardResp = await fetch(externalUrl, {
          method: 'GET',
          headers: {
            // YouTube expects a simple GET; we don't forward client credentials
            'Accept': 'application/json',
          },
        });

        const text = await forwardResp.text();
        const status = forwardResp.ok ? 200 : 502;
        return new Response(text, {
          status,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Unrelated requests -> 404 (static files should be served by Pages/Site)
      return new Response('Not found', { status: 404 });
    } catch (err) {
      return json({ ok: false, error: String(err) }, 500);
    }
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
}