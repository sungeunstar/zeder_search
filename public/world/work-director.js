// Visual choreography cannot complete real requests, reviews or external actions.
export const STATIONS=Object.freeze({desk:{position:[-1.24,.405,2.84],yaw:Math.PI+.08},board:{position:[1.15,.405,-2.12],yaw:Math.PI},shelf:{position:[-2.38,.405,-1.86],yaw:Math.PI}});
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function taskFromInput(text='',question=''){
 const input=String(text).slice(0,4000),q=String(question).slice(0,2000);
 if(/취소|중지/.test(input))return 'brief';
 if(/문구|카피|콘텐츠|블로그|이메일|메시지|소개글|상세페이지|랜딩/.test(input))return 'content';
 if(/검색|리서치|조사|경쟁사|리드|후보/.test(input))return 'research';
 if(/인스타|유튜브|네이버|채널|광고|홍보방법/.test(input))return 'channel';
 if(/가격|할인|혜택|제안|오퍼/.test(input))return 'offer';
 if(/타깃|타겟|고객|회원|주민|직장인|작은 팀/.test(input))return 'audience';
 if(/예산|만원|전략|실행안/.test(input))return 'strategy';
 if(/고객|타깃|타겟|누구/.test(q))return 'audience';if(/예산|전략/.test(q))return 'strategy';return 'brief';
}
export const TASK_LABELS=Object.freeze({brief:'요청 정리 중',audience:'타깃에 관한 답변 작성 중',channel:'채널에 관한 답변 작성 중',offer:'제안에 관한 답변 작성 중',research:'조사 방향에 관한 답변 작성 중',content:'콘텐츠에 관한 답변 작성 중',strategy:'전략에 관한 답변 작성 중'});
const stationFor=task=>task==='research'?'shelf':['audience','channel','offer','strategy'].includes(task)?'board':'desk';
function semantic(s){if(s.stage==='error')return s.cancelled?'cancelled':'error';if(s.stage==='thinking')return 'processing';if(s.stage==='requested')return 'review_wait';if(s.stage==='reviewed')return 'review_ready';if(s.stage==='preparing')return 'approved';return s.outputId?'result_ready':s.threadId?'awaiting_input':'idle';}
export function routeBetween(from,to){const start=[...from],end=[...to],points=[];const front=p=>p[2]>2.4,back=p=>p[2]<.15;if((front(start)&&back(end))||(back(start)&&front(end)))points.push([-3.86,.405,start[2]],[-3.86,.405,end[2]]);points.push(end);return points.filter((p,i)=>distance(i?points[i-1]:start,p)>.02);}
export function createWorkDirector(){
 let ambientRound=0,info={},state='idle',action='idle',task='brief',generation=null,station='desk',elapsed=0;
 let position=[...STATIONS.desk.position],yaw=STATIONS.desk.yaw,queue=[],current=null,speed=0,phaseTime=0,carrying=false,revision=0;
 const history=[];const record=event=>{history.push({event,request:info.threadId||null,generation,task});if(history.length>32)history.shift();};
 function next(){current=queue.shift()||null;elapsed=0;if(current){action=current.action;station=current.station||station;carrying=!!current.carry;record(action);}else{action=state==='error'?'error':state==='cancelled'?'cancelled':state==='idle'?'idle':state==='processing'?(station==='board'?'think':station==='shelf'?'research':'think'):'wait';carrying=false;current={action,duration:Infinity,station};}}
 function stepsTo(name,carry=false,from=position){return routeBetween(from,STATIONS[name].position).map(to=>({action:'walk',to,station:name,carry}));}
 function choreograph(steps){queue=steps;next();revision++;}
 function resetPose(){position=[...STATIONS.desk.position];yaw=STATIONS.desk.yaw;station='desk';speed=0;}
 function observe(nextInfo){
  const nextState=semantic(nextInfo),switched=(info.threadId||'')!==(nextInfo.threadId||''),oldOutput=info.outputId,oldResponse=info.responseId;
  const newGeneration=nextInfo.stage==='thinking'&&nextInfo.generationId&&(generation!==nextInfo.generationId||switched);
  const wasProcessing=state==='processing';info={...nextInfo};state=nextState;
  if(switched){queue=[];current=null;resetPose();generation=null;}task=nextInfo.task||'brief';
  if(newGeneration){generation=nextInfo.generationId;record('request-start');const name=stationFor(task);choreograph([{action:'receive',duration:.55,station},...stepsTo(name),{action:name==='shelf'?'research':'think',duration:Infinity,station:name}]);return;}
  if(state==='error'||state==='cancelled'){if(action!==state){choreograph([{action:state,duration:Infinity}]);record('request-stopped');}return;}
  if(switched||!revision){choreograph([{action:state==='idle'?'idle':'wait',duration:Infinity}]);return;}
  const newOutput=!!info.outputId&&info.outputId!==oldOutput;
  if(newOutput){record('result-available');const name=stationFor(task),to=STATIONS[name].position;choreograph([...stepsTo(name),{action:'read',duration:.55,station:name},...stepsTo('desk',true,to),{action:'prepare',duration:.55,station:'desk',carry:true},{action:'ready',duration:1,station:'desk'}]);return;}
  if(wasProcessing&&state!=='processing'&&oldResponse!==info.responseId){record('answer-available');const name=stationFor(task);choreograph([...stepsTo(name),{action:'read',duration:.8,station:name}]);return;}
  if(['review_wait','review_ready','approved'].includes(state)){if(state==='review_wait'&&action!=='wait'){choreograph([{action:'wait',duration:Infinity}]);record('review-wait');}else if(state==='review_ready'&&newOutput)choreograph([...stepsTo('desk'),{action:'ready',duration:1}]);}
 }
 function ambientSteps(){const side=[STATIONS.desk.position[0]+1.12,.405,3.55];return [...stepsTo('desk'),{action:'tidy',duration:3.6+(ambientRound++%3)*.35,station:'desk'},{action:ambientRound%2?'read':'stretch',duration:2.2,station:'desk'},{action:'look-sea',duration:3,station:'desk'},{action:'walk',to:side,station:'desk'},{action:'look-sea',duration:2,station:'desk'},...stepsTo('desk',false,side),{action:'tidy',duration:2.4,station:'desk'}].map(s=>({...s,ambient:true}));}
 function update(dt,{reduce=false}={}){
  if(!Number.isFinite(dt)||dt<0)throw new TypeError('Finite positive animation dt required');
  if(reduce){queue=[];current={action:state==='error'?'error':state==='cancelled'?'cancelled':state==='idle'?'idle':'wait',duration:Infinity};action=current.action;carrying=false;speed=0;return view();}
  const delta=Math.min(dt,.12);phaseTime+=delta;if(!current)next();if(!current)return view();elapsed+=delta;
  if(['idle','awaiting_input','result_ready','review_wait','review_ready','approved'].includes(state)&&['idle','wait'].includes(action)&&current.duration===Infinity&&elapsed>3.2){queue=ambientSteps();next();}
  if(current.action==='walk'){
   const d=distance(position,current.to),desired=Math.atan2(current.to[0]-position[0],current.to[2]-position[2]);const error=angle(yaw,desired);yaw+=error*(1-Math.exp(-delta*8));
   const wanted=Math.abs(error)>.72?0:Math.min(1.85,Math.sqrt(d*5.2));speed+=(wanted-speed)*(1-Math.exp(-delta*6));const move=Math.min(d,delta*speed);
   if(d>.005){position[0]+=(current.to[0]-position[0])*move/d;position[2]+=(current.to[2]-position[2])*move/d;}if(d<.025){position=[...current.to];speed=0;next();}
  }else{speed*=Math.exp(-delta*12);const target=STATIONS[station].yaw;yaw+=angle(yaw,target)*(1-Math.exp(-delta*5));if(elapsed>=current.duration)next();}
  return view();
 }
 function view(){const status=state==='processing'?TASK_LABELS[task]||TASK_LABELS.brief:({idle:'',awaiting_input:'답변을 기다리고 있어요',result_ready:'전략 초안 준비됨',review_wait:'검토 대기 · 로컬 체험',review_ready:'검토본 준비됨 · 로컬 체험',approved:'준비 승인됨 · 외부 실행 전',cancelled:'응답 생성 중지',error:'응답을 만들지 못했어요'}[state]||'');return {state,action,elapsed,duration:Number.isFinite(current?.duration)?current.duration:null,ambient:!!current?.ambient,task,station,position:[...position],yaw,speed,phaseTime,carrying,status,processing:state==='processing',resultAvailable:!!info.outputId&&state!=='processing',generation,threadId:info.threadId||null,outputId:info.outputId||null,revision,history:history.map(e=>({...e}))};}
 return {observe,update,view};
}
