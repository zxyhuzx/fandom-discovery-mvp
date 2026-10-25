(()=>{
 const key='byeoljup-theme';let theme='dark';try{theme=localStorage.getItem(key)==='light'?'light':'dark'}catch{}
 const apply=()=>{document.documentElement.dataset.theme=theme;document.querySelectorAll('[data-theme-toggle]').forEach(b=>{b.textContent=theme==='dark'?'라이트 모드':'다크 모드';b.setAttribute('aria-label',b.textContent+'로 전환')});document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#050b13':'#e5eaf1')};
 apply();document.addEventListener('DOMContentLoaded',()=>{apply();document.querySelectorAll('[data-theme-toggle]').forEach(b=>b.addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';try{localStorage.setItem(key,theme)}catch{}apply()}))});
})();
