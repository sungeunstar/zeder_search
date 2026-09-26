import {load} from './store.js';
import {workSnapshot} from './world/work-snapshot.js';
// The workshop observes the same persisted request/version as the 2D app.
// An artisan writing is only shown while the app is actually preparing a response.
let world=null,loading=null,current='off',workState={stage:'idle'};
function readWorkState(view,t,busy=false){
 if(!['chat','request'].includes(view))return workSnapshot(null);
 if(t)return workSnapshot(t,busy);
 try{const id=location.hash.replace(/^#\/?/,'').split('/')[1];return workSnapshot(load().threads.find(t=>t.id===id));}catch{return workSnapshot(null);}
}
const timeIcons={day:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',sunset:'<path d="M3 17h18M5 21h14M6 17a6 6 0 0 1 12 0M12 2v3M3 8l2 2m16-2-2 2"/>',night:'<path d="M20.3 14.3A8.5 8.5 0 0 1 9.7 3.7a8.5 8.5 0 1 0 10.6 10.6Z"/>'};
function timeControls(){
 const header=document.querySelector('.site-header');if(!header||!['home','chat','request'].includes(current)){document.querySelector('.time-controls')?.remove();return;}
 if(!document.querySelector('.time-controls')){
  const el=document.createElement('div');el.className='time-controls';el.setAttribute('role','group');el.setAttribute('aria-label','시간대');
  el.innerHTML=Object.entries(timeIcons).map(([value,icon])=>`<button type="button" data-time="${value}" aria-label="${{day:'낮',sunset:'노을',night:'밤'}[value]}" title="${{day:'낮',sunset:'노을',night:'밤'}[value]}"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg></button>`).join('');header.after(el);
 }
 const selected=world?.debug().timeOfDay||'sunset';document.querySelectorAll('[data-time]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.time===selected)));
}
function controls(){timeControls();
 let pin=document.getElementById('workbench-result');
 if(!pin){pin=document.createElement('button');pin.type='button';pin.id='workbench-result';pin.className='workbench-result';pin.hidden=true;pin.textContent='전략 열기 ↗';pin.setAttribute('aria-label','작업대의 실제 전략 열기');document.body.appendChild(pin);pin.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('world-artifact-open',{detail:{threadId:workState.threadId}})));}
 pin.hidden=!['chat','request'].includes(current)||!workState.outputId||workState.stage==='thinking';
document.querySelector('[data-world=explore]')?.remove();document.querySelector('.world-exit')?.remove();const replay=document.querySelector('[data-world=replay]');if(replay)replay.textContent='공방 둘러보기';const b=document.querySelector('[data-world=pause]');if(b&&world){const p=world.debug().paused;b.textContent=p?'재생':'정지';b.setAttribute('aria-pressed',String(p));}}
export function syncWorld(view,t=null,busy=false){
 current=view;workState=readWorkState(view,t,busy);controls();const active=['home','chat','request'].includes(view);const host=document.getElementById('world-host');if(!host)return;
 host.hidden=!active;document.body.classList.toggle('world-home',view==='home');document.body.classList.toggle('world-chat',['chat','request'].includes(view));
 if(world){world.setView(view);world.setState(workState);controls();return;}
 if(!active||loading)return;
 window.dispatchEvent(new CustomEvent('zeder-scene-progress',{detail:{value:20,label:'공방 재료를 가져오고 있어요'}}));
 loading=import('./world/atelier.js').then(async({createAtelier})=>{world=await createAtelier(host);world.setView(current);world.setState(workState);window.zederWorld=world;controls();window.dispatchEvent(new CustomEvent('zeder-scene-ready'));}).catch(error=>{
  window.dispatchEvent(new CustomEvent('zeder-scene-failed'));console.error('Workshop renderer failed:',error);document.body.classList.add('world-unavailable');host.textContent='';host.dataset.state='unavailable';const msg=document.getElementById('world-status');if(msg)msg.textContent='3D 화면을 불러오지 못했습니다. 대화는 사용할 수 있습니다.';
 });
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-world]');if(!b||!world)return;const a=b.dataset.world;if(a==='skip')world.skip();if(a==='replay')world.replay();if(a==='pause')world.togglePause();controls();});
document.addEventListener('focusin',e=>{if(e.target.id==='message'&&world&&world.debug().mode==='intro')world.skip();});
document.addEventListener('world-error',e=>{const s=document.getElementById('world-status');if(s)s.textContent=e.detail;});
window.addEventListener('pagehide',()=>world?.setView('off'));window.addEventListener('pageshow',()=>world?.setView(current));

document.addEventListener('click',e=>{const b=e.target.closest('[data-time]');if(!b||!world)return;world.setTimeOfDay(b.dataset.time);controls();});

document.addEventListener('world-motion',()=>controls());

// Returning to conversation must not leave a modal covering the composer.
document.addEventListener('click',e=>{if(e.target.closest('[data-action="revise-chat"],dialog [data-action="quick"]'))document.getElementById('dialog')?.close();},true);
window.addEventListener('hashchange',()=>document.getElementById('dialog')?.close());
