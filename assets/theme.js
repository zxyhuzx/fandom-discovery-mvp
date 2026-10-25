(()=>{
 const key='byeoljup-theme';let theme='dark';try{theme=localStorage.getItem(key)==='light'?'light':'dark'}catch{}
 const apply=()=>{document.documentElement.dataset.theme=theme;document.querySelectorAll('[data-theme-toggle]').forEach(b=>{b.classList.add('theme-switch');b.innerHTML='<span class="theme-sun" aria-hidden="true">☀</span><span class="theme-moon" aria-hidden="true">☾</span><span class="theme-thumb" aria-hidden="true"></span>';b.setAttribute('role','switch');b.setAttribute('aria-checked',String(theme==='dark'));b.setAttribute('aria-label','다크 모드');b.title=theme==='dark'?'라이트 모드로 전환':'다크 모드로 전환'});document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#050b13':'#adb8c6')};
 apply();document.addEventListener('DOMContentLoaded',()=>{apply();document.querySelectorAll('[data-theme-toggle]').forEach(b=>b.addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';try{localStorage.setItem(key,theme)}catch{}apply()}))});
})();
