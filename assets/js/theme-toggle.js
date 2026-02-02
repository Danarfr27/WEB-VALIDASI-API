// theme-toggle.js
;(function(){
  const KEY = 'site-theme'
  function current(){
    return localStorage.getItem(KEY) || 'dark'
  }
  function apply(t){
    if(t === 'light'){
      document.documentElement.setAttribute('data-theme','light')
    }else{
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem(KEY,t)
    updateButton(t)
  }
  function toggle(){
    apply(current() === 'dark' ? 'light' : 'dark')
  }
  function createButton(){
    const b = document.createElement('button')
    b.id = 'themeToggleAuto'
    b.title = 'Toggle light / dark'
    b.style.position = 'fixed'
    b.style.right = '18px'
    b.style.top = '12px'
    b.style.zIndex = 9999
    b.style.padding = '8px 10px'
    b.style.borderRadius = '10px'
    b.style.border = 'none'
    b.style.cursor = 'pointer'
    b.style.background = 'linear-gradient(90deg, rgba(0,0,0,0.3), rgba(255,255,255,0.03))'
    b.style.color = '#fff'
    b.addEventListener('click', toggle)
    document.body.appendChild(b)
    return b
  }
  let btn = null
  function updateButton(t){
    if(!btn) return
    if(t === 'light'){
      btn.textContent = '☀️ Light'
      btn.style.background = 'linear-gradient(90deg, #fff, #f1f5f9)'
      btn.style.color = '#0b1220'
    }else{
      btn.textContent = '🌑 Dark'
      btn.style.background = 'linear-gradient(90deg, rgba(10,6,8,0.6), rgba(50,10,25,0.25))'
      btn.style.color = '#fff'
    }
  }

  // init
  document.addEventListener('DOMContentLoaded', ()=>{
    btn = createButton()
    const t = current()
    apply(t)
  })
})()
