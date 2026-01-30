// Vercel Serverless Function (Node.js)
// Supports checking a single `apiKey` (legacy) or an array `keys: []`.
export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ok:false,error:'Method not allowed'});
  const body = req.body || {};
  const provider = body.provider || 'gemini';
  const keys = Array.isArray(body.keys) ? body.keys : (body.apiKey ? [body.apiKey] : []);
  if(!keys || keys.length === 0) return res.status(400).json({ok:false,error:'Missing keys'});

  // Helper to check a single key according to provider
  async function checkOne(key){
    try{
      if(!provider || provider === 'gemini'){
        const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(key)}`;
        const r = await fetch(url);
        const text = await r.text();
        if(r.status === 200) return {key, valid:true, provider:'gemini', status:200, message:''};
        if(r.status === 401 || r.status === 403) return {key, valid:false, provider:'gemini', status:r.status, message:text};
        const makesSense = typeof key === 'string' && key.length >= 20;
        return {key, valid:makesSense, provider:'gemini', status:r.status, message:text};
      }

      if(provider === 'openai'){
        const r = await fetch('https://api.openai.com/v1/models',{headers:{'Authorization':`Bearer ${key}`}});
        const text = await r.text();
        if(r.status === 200) return {key, valid:true, provider:'openai', status:200, message:''};
        if(r.status === 401 || r.status === 403) return {key, valid:false, provider:'openai', status:r.status, message:text};
        const makesSense = typeof key === 'string' && key.length >= 20;
        return {key, valid:makesSense, provider:'openai', status:r.status, message:text};
      }

      const makesSense = typeof key === 'string' && key.length >= 20;
      return {key, valid:makesSense, provider:'unknown', status:0, message:''};
    }catch(err){
      return {key, valid:false, provider:provider, status:0, message:err.message};
    }
  }

  // Process keys in batches to limit concurrency
  const batchSize = Number(body.batchSize) || 8;
  const results = [];
  for(let i=0;i<keys.length;i+=batchSize){
    const batch = keys.slice(i, i+batchSize);
    const promises = batch.map(k => checkOne(k));
    // wait batch
    // eslint-disable-next-line no-await-in-loop
    const batchRes = await Promise.all(promises);
    results.push(...batchRes);
  }

  return res.status(200).json({ok:true, count:results.length, results});
}
