// API route: POST /api/check
// Body: { keys: string[] , provider?: 'gemini'|'openai', concurrency?: number }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const { keys, provider = 'gemini', concurrency = 6 } = req.body || {};
  if (!Array.isArray(keys) || keys.length === 0) return res.status(400).json({ ok: false, error: 'Missing keys array' });

  const results = [];

  // concurrency-limited runner
  async function worker(pool) {
    while (pool.length) {
      const key = pool.shift();
      try {
        const r = await checkKey(key, provider);
        results.push({ key, ok: r });
      } catch (e) {
        results.push({ key, ok: false, error: e.message });
      }
    }
  }

  const pool = keys.slice();
  const workers = new Array(Math.max(1, Math.min(concurrency, keys.length))).fill(0).map(() => worker(pool));
  await Promise.all(workers);

  const active = results.filter(r => r.ok).map(r => r.key);
  const invalid = results.filter(r => !r.ok).map(r => r.key);

  return res.status(200).json({ ok: true, active, invalid });
}

async function checkKey(apiKey, provider) {
  // normalize provider
  if (!provider || provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(apiKey)}`;
    const r = await fetch(url, { method: 'GET' });
    if (r.status === 200) return true;
    if (r.status === 401 || r.status === 403) return false;
    // heuristic
    return typeof apiKey === 'string' && apiKey.length >= 20;
  }
  if (provider === 'openai') {
    const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
    if (r.status === 200) return true;
    if (r.status === 401 || r.status === 403) return false;
    return typeof apiKey === 'string' && apiKey.length >= 20;
  }
  return typeof apiKey === 'string' && apiKey.length >= 20;
}
