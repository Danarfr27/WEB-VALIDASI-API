// /api/validate.js — Vercel serverless function
const https = require('https');

const PROVIDERS = {
  gemini: {
    endpoint: 'generativelanguage.googleapis.com',
    path: '/v1/models',
    authMode: 'query_key',
    keyName: null,
    extraHeaders: {},
  },
  openai: {
    endpoint: 'api.openai.com',
    path: '/v1/models',
    authMode: 'bearer',
    keyName: null,
    extraHeaders: {},
  },
  anthropic: {
    endpoint: 'api.anthropic.com',
    path: '/v1/models',
    authMode: 'api_key_header',
    keyName: 'x-api-key',
    extraHeaders: { 'anthropic-version': '2023-06-01' },
  },
  deepseek: {
    endpoint: 'api.deepseek.com',
    path: '/user/balance',
    authMode: 'bearer',
    keyName: null,
    extraHeaders: {},
  },
  openrouter: {
    endpoint: 'openrouter.ai',
    path: '/api/v1/auth/key',
    authMode: 'bearer',
    keyName: null,
    extraHeaders: {},
  },
};

function detectProvider(key) {
  if (!key || typeof key !== 'string') return 'gemini';
  if (!key.startsWith('sk-')) return 'gemini';
  if (key.startsWith('sk-ant')) return 'anthropic';
  if (key.startsWith('sk-proj')) return 'openai';
  if (key.startsWith('sk-or')) return 'openrouter';
  if (key.length <= 40) return 'deepseek';
  return 'openai';
}

function makeRequest(config, key) {
  return new Promise((resolve) => {
    const headers = { ...config.extraHeaders };
    let path = config.path;

    if (config.authMode === 'bearer') {
      headers['Authorization'] = `Bearer ${key}`;
    } else if (config.authMode === 'api_key_header') {
      headers[config.keyName] = key;
    } else if (config.authMode === 'query_key') {
      path = `${path}?key=${encodeURIComponent(key)}`;
    }

    const options = {
      hostname: config.endpoint,
      port: 443,
      path: path,
      method: 'GET',
      headers: headers,
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const status = res.statusCode;
        let valid = false;
        let statusText = '';

        if (status === 200) {
          valid = true;
          if (config.endpoint === 'api.deepseek.com') {
            try {
              const json = JSON.parse(data);
              const bal = json.balance_infos && json.balance_infos[0] ? json.balance_infos[0].total_balance : 'N/A';
              statusText = `Active | Balance: ${bal}`;
            } catch (e) {
              statusText = 'Active';
            }
          } else if (config.endpoint === 'openrouter.ai') {
            try {
              const json = JSON.parse(data);
              const usage = json.usage || 0;
              const limit = json.limit || 'unlimited';
              statusText = `Active | Usage: ${usage}/${limit}`;
            } catch (e) {
              statusText = 'Active';
            }
          } else {
            statusText = 'Active';
          }
        } else if (status === 401 || status === 403) {
          statusText = 'Invalid / Unauthorized';
        } else {
          statusText = `HTTP ${status}`;
        }

        resolve({ valid, status: statusText, httpCode: status });
      });
    });

    req.on('error', (err) => {
      resolve({ valid: false, status: `Error: ${err.message}`, httpCode: null });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ valid: false, status: 'Timeout', httpCode: null });
    });

    req.end();
  });
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    // Vercel auto-parses JSON body when Content-Type is application/json
    const body = req.body || {};
    const keys = body.keys;
    const provider = body.provider || 'auto';

    if (!Array.isArray(keys) || keys.length === 0) {
      res.status(400).json({ ok: false, error: 'No keys provided', body: body });
      return;
    }

    const results = [];
    for (const key of keys) {
      const detectedProvider = provider === 'auto' ? detectProvider(key) : (provider || 'gemini');
      const config = PROVIDERS[detectedProvider] || PROVIDERS.gemini;
      const result = await makeRequest(config, key);
      results.push({
        key: key,
        valid: result.valid,
        status: result.status,
        httpCode: result.httpCode,
        provider: detectedProvider,
      });
    }

    res.status(200).json({ ok: true, results: results });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};
