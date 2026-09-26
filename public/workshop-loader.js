// Progress is preparation milestones, not invented byte percentages or job progress.
(function(){
 const el=document.getElementById('workshop-loader');if(!el)return;
 const bar=el.querySelector('progress'),title=el.querySelector('h2'),label=el.querySelector('p'),skip=el.querySelector('button'),app=document.getElementById('app');
 let done=false,ready=false,failed=false,current=0;
 if(app)app.inert=true;
 function progress(value,text){if(done)return;current=Math.max(current,Math.min(96,value));bar.value=current;bar.setAttribute('aria-valuetext',text);label.textContent=text;}
 function finish(complete=true){if(done)return;done=true;clearTimeout(slow);clearTimeout(stalled);observer.disconnect();if(app)app.inert=false;if(complete)bar.value=100;title.textContent=complete?'공방 문을 열어요':'대화부터 시작해요';label.textContent=complete?'작업대가 준비됐어요':'공방을 기다리지 않고 시작할 수 있어요';el.classList.add('is-leaving');setTimeout(()=>{el.hidden=true;},450);}
 function inspect(){
  if(done)return;
  const host=document.getElementById('world-host');const nowReady=!!app?.firstElementChild;
  if(nowReady&&!ready){ready=true;skip.hidden=false;progress(12,'도면을 펼치고 있어요');}
  if(host?.dataset.ready==='true'||ready&&!document.body.classList.contains('world-home')&&!document.body.classList.contains('world-chat'))finish();
  if(ready&&title.textContent!=='공방 화면을 준비하지 못했어요'&&(host?.dataset.state==='unavailable'||host?.dataset.state==='lost')){failed=true;title.textContent='공방 화면을 준비하지 못했어요';label.textContent='대화는 그대로 이용할 수 있어요';skip.textContent='대화 화면 열기';}
 }
 const observer=new MutationObserver(inspect);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-ready','data-state','class']});
 const slow=setTimeout(()=>{if(!done){title.textContent='공방을 조금 더 준비하고 있어요';if(ready)skip.hidden=false;}},12000);
 const stalled=setTimeout(()=>{if(!done&&!ready){title.textContent='입구를 다시 확인해 주세요';label.textContent='연결이 지연되고 있어요';skip.textContent='다시 열기';skip.hidden=false;failed=true;}},30000);
 skip.addEventListener('click',()=>{if(!ready){location.reload();return;}finish(false);});
 window.addEventListener('zeder-scene-ready',()=>finish());
 window.addEventListener('zeder-scene-progress',e=>progress(e.detail.value,e.detail.label));
 window.addEventListener('zeder-scene-failed',()=>{failed=true;inspect();});
 inspect();
})();
