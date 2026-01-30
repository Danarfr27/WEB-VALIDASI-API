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
  // remove comments and duplicate
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

async function collectKeys(){
  let keys = []
  if(fileInput.files && fileInput.files.length>0){
    try{
      const txt = await readFileAsText(fileInput.files[0])
      keys = parseKeysFromText(txt)
    }catch(e){console.error(e)}
  }
  // also include paste area
  const pasted = parseKeysFromText(pasteArea.value||'')
  // merge (file first then paste but dedupe by parse function)
  const merged = [...new Set([...(keys||[]), ...pasted])]
  return merged
}

function updateCounts(active,invalid,total){
  countsEl.textContent = `Aktif: ${active} — Invalid: ${invalid} — Total: ${total}`
}

function appendRow(idx, key, ok, status){
  const tr = document.createElement('tr')
  const tdIdx = document.createElement('td')
  tdIdx.textContent = idx
  const tdKey = document.createElement('td')
  tdKey.innerHTML = `<span class="masked">${maskKey(key)}</span>`
  const tdStatus = document.createElement('td')
  tdStatus.textContent = ok? 'ACTIVE':'INVALID'
  tdStatus.className = ok? 'status-ok':'status-bad'
  const tdCode = document.createElement('td')
  tdCode.textContent = status||''
  tr.append(tdIdx,tdKey,tdStatus,tdCode)
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

  const provider = providerSel.value
  const batchSize = Math.max(1, Number(batchSizeInput.value) || 8)
  progressEl.textContent = `Mulai pengecekan (${keys.length} keys)`

  const active = []
  const invalid = []
  let processed = 0

  // process in frontend batches, each batch is sent to serverless function
  for(let i=0;i<keys.length;i+=batchSize){
    const batch = keys.slice(i, i+batchSize)
    progressEl.textContent = `Mengirim batch ${Math.floor(i/batchSize)+1} (${batch.length}) ...`
    try{
      const r = await fetch('/api/validate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keys:batch,provider, batchSize:batch.length})})
      const j = await r.json()
      if(j && j.ok && Array.isArray(j.results)){
        for(const res of j.results){
          processed++
          appendRow(processed, res.key, !!res.valid, res.status)
          if(res.valid) active.push(res.key)
          else invalid.push(res.key)
        }
        updateCounts(active.length, invalid.length, keys.length)
      }else{
        // fallback: mark all as invalid
        for(const k of batch){ processed++; appendRow(processed,k,false,'err'); invalid.push(k) }
        updateCounts(active.length, invalid.length, keys.length)
      }
    }catch(err){
      console.error(err)
      for(const k of batch){ processed++; appendRow(processed,k,false,'err'); invalid.push(k) }
      updateCounts(active.length, invalid.length, keys.length)
    }
  }

  progressEl.textContent = `Selesai — diproses: ${processed}`
  enableDownloads(active, invalid)
  startBtn.disabled = false
}

startBtn.addEventListener('click', runCheck)
clearBtn.addEventListener('click', ()=>{fileInput.value='';pasteArea.value='';resultsTable.innerHTML='';progressEl.textContent='Menunggu tindakan...';updateCounts(0,0,0);downloadActive.disabled=true;downloadInvalid.disabled=true})
