const $ = id => document.getElementById(id);
const validateBtn = $('validateBtn');
const clearBtn = $('clearBtn');
const apikeysEl = $('apikeys');
const resultsList = $('resultsList');
const downloadValidBtn = $('downloadValid');
const downloadInvalidBtn = $('downloadInvalid');

let validKeys = [];
let invalidKeys = [];

async function checkKeys(keys, provider){
  resultsList.innerHTML = '';
  const arr = keys.split('\n').map(s=>s.trim()).filter(Boolean);
  if(!arr.length){ resultsList.textContent = 'Masukkan setidaknya satu API key.'; return; }
  // reset
  validKeys = [];
  invalidKeys = [];
  downloadValidBtn.disabled = true;
  downloadInvalidBtn.disabled = true;

  for(const key of arr){
    const item = document.createElement('div');
    item.className = 'result-item';
    item.innerHTML = `<div class="key">${escapeHtml(key.slice(0,32))}${key.length>32? '...':''}</div><div class="meta"><span class="status-pill">Memeriksa...</span></div>`;
    resultsList.appendChild(item);

    try{
      const resp = await fetch('/api/validate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({apiKey:key, provider})
      });
      const data = await resp.json();
      const pill = item.querySelector('.status-pill');
      if(resp.ok && data.ok){
        if(data.valid){ item.classList.add('valid'); pill.className='status-pill ok'; pill.textContent='Valid'; validKeys.push(key); }
        else { item.classList.add('invalid'); pill.className='status-pill bad'; pill.textContent='Invalid'; invalidKeys.push(key); }
      } else {
        item.classList.add('invalid'); pill.className='status-pill bad'; pill.textContent='Error';
        invalidKeys.push(key);
      }
    }catch(e){
      const pill = item.querySelector('.status-pill');
      item.classList.add('invalid'); pill.className='status-pill bad'; pill.textContent='Error';
      invalidKeys.push(key);
    }
  }
  // after processing all keys, enable downloads where applicable
  if(validKeys.length) downloadValidBtn.disabled = false;
  if(invalidKeys.length) downloadInvalidBtn.disabled = false;
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

validateBtn.addEventListener('click', ()=>{
  validateBtn.disabled = true; validateBtn.textContent='Menjalankan...';
  checkKeys(apikeysEl.value, $('provider').value).finally(()=>{ validateBtn.disabled=false; validateBtn.textContent='Cek Sekarang'; });
});

clearBtn.addEventListener('click', ()=>{ apikeysEl.value=''; resultsList.innerHTML='Belum ada pengecekan.'; });

function downloadTxt(filename, lines){
  const blob = new Blob([lines.join('\n')], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

downloadValidBtn.addEventListener('click', ()=>{
  if(!validKeys.length) return;
  downloadTxt('valid_keys.txt', validKeys);
});

downloadInvalidBtn.addEventListener('click', ()=>{
  if(!invalidKeys.length) return;
  downloadTxt('invalid_keys.txt', invalidKeys);
});
