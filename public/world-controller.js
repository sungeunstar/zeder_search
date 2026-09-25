import {load} from './store.js';
import {latestPlan} from './domain.js';
// The workshop observes the same persisted request/version as the 2D app.
// An artisan writing is only shown while the app is actually preparing a response.
let world=null,loading=null,current='off',workState={stage:'idle'};
function readWorkState(view){
 if(!['chat','request'].includes(view))return {stage:'idle',audience:'',channel:'',offer:'',count:0};
 try{const id=location.hash.replace(/^#\/?/,'').split('/')[1];const t=load().threads.find(t=>t.id===id);if(!t)return {stage:'idle'};const p=latestPlan(t);
  return {stage:document.querySelector('.thinking')?'thinking':t.error?'error':t.status==='draft'?(p?'draft':'conversation'):t.status,audience:p?.audience??'',channel:p?.paths?.map(p=>p.title).join(' · ')??'',offer:p?.goal??'',count:t.messages.length};
 }catch{return {stage:'idle',audience:'',channel:'',offer:'',count:0};}
}
function controls(){document.querySelector('[data-world=explore]')?.remove();document.querySelector('.world-exit')?.remove();const replay=document.querySelector('[data-world=replay]');if(replay)replay.textContent='공방 둘러보기';const b=document.querySelector('[data-world=pause]');if(b&&world){const p=world.debug().paused;b.textContent=p?'재생':'정지';b.setAttribute('aria-pressed',String(p));}}
export function syncWorld(view){
 current=view;workState=readWorkState(view);controls();const active=view==='home'||view==='chat';const host=document.getElementById('world-host');if(!host)return;
 host.hidden=!active;document.body.classList.toggle('world-home',view==='home');document.body.classList.toggle('world-chat',view==='chat');
 if(world){world.setView(view);world.setState(workState);controls();return;}
 if(!active||loading)return;
 loading=import('./world/atelier.js').then(({createAtelier})=>{world=createAtelier(host);world.setView(current);world.setState(workState);window.zederWorld=world;controls();}).catch(error=>{
  console.error('Workshop renderer failed:',error);document.body.classList.add('world-unavailable');host.textContent='';host.dataset.state='unavailable';const msg=document.getElementById('world-status');if(msg)msg.textContent='3D 화면을 불러오지 못했습니다. 대화는 사용할 수 있습니다.';
 });
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-world]');if(!b||!world)return;const a=b.dataset.world;if(a==='skip')world.skip();if(a==='replay')world.replay();if(a==='pause')world.togglePause();controls();});
document.addEventListener('focusin',e=>{if(e.target.id==='message'&&world&&world.debug().mode==='intro')world.skip();});
document.addEventListener('world-error',e=>{const s=document.getElementById('world-status');if(s)s.textContent=e.detail;});
window.addEventListener('pagehide',()=>world?.setView('off'));window.addEventListener('pageshow',()=>world?.setView(current));
