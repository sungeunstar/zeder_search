// Lazy-load the real Three.js scene only on customer routes. The marketer studio remains 2D.
let world=null,loading=null,current='off';
export function syncWorld(view){
 current=view;const active=view==='home'||view==='chat';const host=document.getElementById('world-host');if(!host)return;
 host.hidden=!active;document.body.classList.toggle('world-home',view==='home');document.body.classList.toggle('world-chat',view==='chat');
 if(world){world.setView(view);updateControls();return;}
 if(!active||loading)return;
 loading=import('./world/island.js').then(({createIsland})=>{world=createIsland(host);world.setView(current);window.zederWorld=world;updateControls();}).catch(error=>{
  console.error('Island renderer failed:',error);document.body.classList.add('world-unavailable');host.textContent='';host.dataset.state='unavailable';
  const message=document.getElementById('world-status');if(message)message.textContent='3D 화면을 불러오지 못했습니다. 대화는 사용할 수 있습니다.';
 });
}
document.addEventListener('click',e=>{const button=e.target.closest('[data-world]');if(!button||!world)return;const action=button.dataset.world;if(action==='skip')world.skip();if(action==='replay')world.replay();if(action==='explore')world.explore();if(action==='exit')world.exitExplore();if(action==='pause'){const paused=world.togglePause();button.textContent=paused?'재생':'정지';button.setAttribute('aria-pressed',String(paused));}updateControls();});
document.addEventListener('focusin',e=>{if(e.target.id==='message'&&world)world.skip();});
document.addEventListener('world-error',e=>{const status=document.getElementById('world-status');if(status)status.textContent=e.detail;});
window.addEventListener('pagehide',()=>world?.setView('off'));
window.addEventListener('pageshow',()=>world?.setView(current));

function updateControls(){if(!world)return;const button=document.querySelector('[data-world=pause]');if(button){const paused=world.debug().paused;button.textContent=paused?'재생':'정지';button.setAttribute('aria-pressed',String(paused));}}
