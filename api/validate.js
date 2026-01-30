// Vercel Serverless Function (Node.js)
export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ok:false,error:'Method not allowed'});
  const { apiKey, provider } = req.body || {};
  if(!apiKey) return res.status(400).json({ok:false,error:'Missing apiKey'});

  try{
    // If provider explicitly requested as gemini or default, use Google Generative Language models endpoint
    if(!provider || provider === 'gemini'){
      // The Google Generative Language API accepts an API key as query param `key` for simple API key usage.
      const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(apiKey)}`;
      const r = await fetch(url);
      const text = await r.text();
      // 200 means the key worked and we can list models
      if(r.status === 200){
        return res.status(200).json({ok:true,valid:true,provider:'gemini',status:200});
      }
      // 401/403 -> invalid or unauthorized
      if(r.status === 401 || r.status === 403){
        return res.status(200).json({ok:true,valid:false,provider:'gemini',status:r.status,message:text});
      }
      // other statuses: return heuristic false
      const makesSense = typeof apiKey === 'string' && apiKey.length >= 20;
      return res.status(200).json({ok:true,valid:makesSense,provider:'gemini',status:r.status,message:text});
    }

    // Fallback: keep previous OpenAI behaviour for backward compatibility
    if(provider === 'openai'){
      const r = await fetch('https://api.openai.com/v1/models',{headers:{'Authorization':`Bearer ${apiKey}`}});
      const text = await r.text();
      if(r.status === 200){
        return res.status(200).json({ok:true,valid:true,provider:'openai',status:200});
      }
      if(r.status === 401){
        return res.status(200).json({ok:true,valid:false,provider:'openai',status:401,message:text});
      }
      const makesSense = typeof apiKey === 'string' && apiKey.length >= 20;
      return res.status(200).json({ok:true,valid:makesSense,provider:'openai',status:r.status,message:text});
    }

    // Unknown provider: simple heuristic
    const makesSense = typeof apiKey === 'string' && apiKey.length >= 20;
    return res.status(200).json({ok:true,valid:makesSense,provider:'unknown',status:0});

  }catch(err){
    return res.status(500).json({ok:false,error:err.message});
  }
}
