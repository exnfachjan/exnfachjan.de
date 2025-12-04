// Frontend helper: macht Requests an /api/youtube im gleichen Origin.
// Fügt keinen API-Key ins Client JS — Worker hält den Key.
// Fügt window.fetchYouTube(endpoint, params) zur Verfügung.
(function () {
  window.fetchYouTube = async function fetchYouTube(endpoint, params = {}) {
    if (!endpoint) throw new Error('fetchYouTube: endpoint is required');
    const sp = new URLSearchParams({ endpoint });
    for (const k in params) {
      if (params[k] != null) sp.set(k, String(params[k]));
    }
    const url = `/api/youtube?${sp.toString()}`;
    const resp = await fetch(url, { method: 'GET' });
    if (!resp.ok) {
      let txt = await resp.text();
      try { txt = JSON.parse(txt); } catch (e) {}
      const msg = (txt && txt.error) ? txt.error : `YouTube proxy error: ${resp.status}`;
      const err = new Error(msg);
      err.status = resp.status;
      throw err;
    }
    return resp.json();
  };
})();