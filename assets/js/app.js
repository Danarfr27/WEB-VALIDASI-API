function $(sel){return document.querySelector(sel)}
const fileInput = $('#fileInput')
const pasteArea = $('#pasteArea')
const startBtn = $('#startBtn')
const clearBtn = $('#clearBtn')
const providerSel = $('#provider')
const resultsTable = $('#resultsTable tbody')
const progressEl = $('#progress')
const countsEl = $('#counts')
const downloadActive = $('#downloadActive')
const downloadInvalid = $('#downloadInvalid')
const batchSizeInput = $('#batchSize')

function maskKey(k){
  if(!k) return ''
  if(k.length<=10) return k.slice(0,2)+"..."+k.slice(-2)
  return k.slice(0,4)+"..."+k.slice(-4)
}

function parseKeysFromText(text){
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
  const set = []
  const seen = new Set()
  for(const l of lines){
    if(l.startsWith('#')) continue
    if(!seen.has(l)){
      seen.add(l)
      set.push(l)
    }
  }
  return set
}

function readFileAsText(file){
  return new Promise((res,rej)=>{
    const r = new FileReader()
    r.onload = ()=>res(String(r.result))
    r.onerror = ()=>rej(r.error)
    r.readAsText(file)
  })
}

function detectProvider(key){
  if(!key || !key.startsWith('sk-')) return 'gemini'
  if(key.startsWith('sk-ant')) return 'anthropic'
  if(key.startsWith('sk-proj')) return 'openai'
  if(key.startsWith('sk-or')) return 'openrouter'
  if(key.length <= 40) return 'deepseek'
  return 'openai'
}

async function collectKeys(){
  let keys = []
  if(fileInput.files && fileInput.files.length>0){
    try{
      const txt = await readFileAsText(fileInput.files[0])
      keys = parseKeysFromText(txt)
    }catch(e){console.error('File read error:', e)}
  }
  const pasted = parseKeysFromText(pasteArea.value||'')
  const merged = [...new Set([...(keys||[]), ...pasted])]
  return merged
}

function updateCounts(active,invalid,total){
  countsEl.textContent = `Aktif: ${active} — Invalid: ${invalid} — Total: ${total}`
}

function appendRow(idx, key, ok, status, provider){
  const tr = document.createElement('tr')
  const tdIdx = document.createElement('td')
  tdIdx.textContent = idx
  const tdKey = document.createElement('td')
  tdKey.innerHTML = `<span class="masked">${maskKey(key)}</span>`
  const tdProvider = document.createElement('td')
  tdProvider.textContent = provider || 'auto'
  tdProvider.className = 'provider-tag'
  const tdStatus = document.createElement('td')
  tdStatus.textContent = ok? 'ACTIVE':'INVALID'
  tdStatus.className = ok? 'status-ok':'status-bad'
  const tdCode = document.createElement('td')
  tdCode.textContent = status||''
  tr.append(tdIdx,tdKey,tdProvider,tdStatus,tdCode)
  resultsTable.appendChild(tr)
}

function enableDownloads(activeList, invalidList){
  downloadActive.disabled = activeList.length===0
  downloadInvalid.disabled = invalidList.length===0
  downloadActive.onclick = ()=>downloadTxt(activeList,'aktif.txt')
  downloadInvalid.onclick = ()=>downloadTxt(invalidList,'invalid.txt')
}

function downloadTxt(list, filename){
  const content = list.join('\n') + '\n'
  const blob = new Blob([content],{type:'text/plain'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

async function runCheck(){
  startBtn.disabled = true
  resultsTable.innerHTML = ''
  progressEl.textContent = 'Mengumpulkan keys...'
  const keys = await collectKeys()
  if(!keys || keys.length===0){
    progressEl.textContent = 'Tidak ada keys ditemukan.'
    startBtn.disabled = false
    return
  }

  const selectedProvider = providerSel.value
  const batchSize = Math.max(1, Number(batchSizeInput.value) || 8)
  progressEl.textContent = `Mulai pengecekan (${keys.length} keys, provider: ${selectedProvider})`

  const active = []
  const invalid = []
  let processed = 0

  for(let i=0;i<keys.length;i+=batchSize){
    const batch = keys.slice(i, i+batchSize)
    const batchNum = Math.floor(i/batchSize)+1
    const totalBatches = Math.ceil(keys.length/batchSize)
    progressEl.textContent = `Batch ${batchNum}/${totalBatches} (${batch.length} keys) ...`

    try{
      console.log('Sending batch:', batchNum, 'keys:', batch.length, 'provider:', selectedProvider)
      const r = await fetch('/api/validate',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({keys:batch, provider:selectedProvider})
      })
      console.log('Response status:', r.status)

      const text = await r.text()
      console.log('Response text:', text.substring(0, 200))

      let j
      try {
        j = JSON.parse(text)
      } catch(parseErr) {
        console.error('JSON parse error:', parseErr)
        throw new Error('Invalid JSON response: ' + text.substring(0, 100))
      }

      console.log('Parsed response:', j)

      if(j && j.ok === true && Array.isArray(j.results)){
        for(const res of j.results){
          processed++
          const provider = res.provider || selectedProvider || 'auto'
          appendRow(processed, res.key, !!res.valid, res.status, provider)
          if(res.valid) active.push(res.key)
          else invalid.push(res.key)
        }
      } else {
        console.error('Unexpected response format:', j)
        for(const k of batch){ 
          processed++
          const provider = selectedProvider === 'auto' ? detectProvider(k) : selectedProvider
          appendRow(processed, k, false, 'Invalid response format', provider)
          invalid.push(k)
        }
      }
    } catch(err){
      console.error('Batch error:', err)
      progressEl.textContent = `Error batch ${batchNum}: ${err.message}`
      for(const k of batch){ 
        processed++
        const provider = selectedProvider === 'auto' ? detectProvider(k) : selectedProvider
        appendRow(processed, k, false, 'Error: ' + err.message, provider)
        invalid.push(k)
      }
    }
    updateCounts(active.length, invalid.length, keys.length)
  }

  progressEl.textContent = `Selesai — Aktif: ${active.length}, Invalid: ${invalid.length}, Total: ${processed}`
  enableDownloads(active, invalid)
  startBtn.disabled = false
}

startBtn.addEventListener('click', runCheck)
clearBtn.addEventListener('click', ()=>{
  fileInput.value=''
  pasteArea.value=''
  resultsTable.innerHTML=''
  progressEl.textContent='Menunggu tindakan...'
  updateCounts(0,0,0)
  downloadActive.disabled=true
  downloadInvalid.disabled=true
})
