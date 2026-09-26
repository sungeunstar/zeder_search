/** One human decision per submitted experiment. Visual actions are never approvals. */
import {clone,clean,latestPlan,validatePlan,versionPlan,reviewRequest} from './domain.js';
import {briefJournal,captureBrief,reviewPacket} from './brief.js';

export const EXECUTION_FIELDS = Object.freeze([
 ['audience','고객 가설'],['offer','고객에게 할 제안'],['hypothesis','확인할 가설'],
 ['channel','먼저 사용할 채널'],['action','첫 실행'],['signal','확인할 반응'],
 ['nextDecision','반응을 본 다음'],['tools','준비 도구']
]);
const known = n => n && ['stated','confirmed'].includes(n.status);
export function intakeStatus(t){
 const notes=briefJournal(t,{includeProposal:false}).items;
 const get=k=>notes.find(n=>n.key===k);
 const missing=['business','goal'].filter(k=>!known(get(k)));
 return {ready:missing.length===0,missing,notes};
}
export function firstPlan(raw,selected=0){
 const p=validatePlan(raw);
 const i=Math.max(0,Math.min(p.paths.length-1,Number(selected)||0));
 p.paths=[{...p.paths[i],id:'path-1'}];
 p.offer=clean(raw.offer,1200)||'고객이 얻을 변화와 부담 없는 다음 행동을 짧게 제안합니다.';
 p.channel=clean(raw.channel,500)||'접근 가능한 채널 한 곳 · 게시·연락 가능 여부 확인 전';
 p.nextDecision=clean(raw.nextDecision,1000)||'응답의 이유를 기록하고, 반응이 약하면 고객 가설이나 제안을 하나씩 바꿉니다.';
 return p;
}
export function executionDiff(base,next){
 const a=firstPlan(base),b=firstPlan(next),value=(p,key)=>key==='tools'?p.paths[0].tools.join(', '):p.paths[0][key]??p[key];
 return EXECUTION_FIELDS.map(([key,label])=>({key,label,before:value(a,key),after:value(b,key)}))
  .filter(x=>JSON.stringify(x.before)!==JSON.stringify(x.after));
}
export function singleGateReply(t){
 const intake=intakeStatus(t),get=k=>intake.notes.find(n=>n.key===k),users=t.messages.filter(m=>m.role==='user');
 const last=users.at(-1)?.text||'',prior=latestPlan(t);
 if(!known(get('business')))return {reply:'어떤 제품이나 서비스를 알리고 싶으세요?',quickReplies:[],plan:null};
 if(!known(get('goal')))return {reply:'지금 가장 먼저 이루고 싶은 건 무엇인가요?',quickReplies:['첫 고객과 대화하고 싶어요','상담 문의를 늘리고 싶어요','어떤 고객이 필요한지 확인하고 싶어요'],plan:null};
 const changedFacts=prior&&intake.notes.some(n=>known(n)&&['business','goal','budget','audience','channel'].includes(n.key)&&n.value!==prior[n.key]);
 if(prior&&!changedFacts&&!/바꿔|수정|변경|다시|예산|대신|없이|줄여|고객은|목표는|채널은|타깃|타겟/.test(last))return {reply:'이 가설이 실제 반응으로 이어지는지 먼저 확인하는 제안이에요. 바꾸고 싶은 조건을 말씀해 주세요.',quickReplies:[],plan:null};
 const business=get('business').value,goal=get('goal').value;
 const local=/매장|카페|식당|필라테스|스튜디오|미용실/.test(business);
 const uncertain=!known(get('audience'));
 const audience=known(get('audience'))?get('audience').value:local?'매장 가까운 곳에서 관련 서비스를 찾는 사람 · 검증 전 후보':'제품이 해결하는 문제를 실제로 겪는 사람 · 검증 전 후보';
 const budget=get('budget')?.value||'예산 미정 · 지출은 제안하지 않음';
 const channel=known(get('channel'))?get('channel').value:'관련 고객과 대화할 수 있는 공개 채널 한 곳 · 이용 규칙 확인 전';
 const offer=uncertain?'제품 소개보다 먼저, 지금 겪는 문제에 대한 짧은 대화를 제안합니다.':'제품이 어떤 상황에 도움이 되는지 설명하고, 관심 여부를 답해 달라고 제안합니다.';
 const action=uncertain?'위 고객 후보가 모이는 공개 채널 한 곳을 정하고, 대화가 허용되는 범위에서 최근 겪은 문제와 현재 해결 방법을 물어봅니다.':'위 고객 후보에게 짧은 소개와 하나의 제안 문구를 준비합니다. 게시·연락이 허용되는 채널 한 곳에서 관심 여부를 확인합니다.';
 const plan={title:uncertain?'첫 고객 후보의 문제 확인하기':'한 가지 제안으로 첫 반응 확인하기',business,audience,goal,budget,
  offer,channel,summary:uncertain?'고객이 불명확하므로 판매보다 문제 확인을 먼저 제안해요.':'여러 방법을 동시에 시작하지 않고, 고객 하나와 제안 하나를 먼저 확인해요.',
  hypothesis:uncertain?'이 고객 후보는 제품이 해결하려는 문제를 최근에 겪었고, 현재 대안의 불편을 설명할 수 있을 것이다.':'이 고객 후보에게 쓰임새와 다음 행동이 분명한 제안을 하면, 단순 조회를 넘어 관심을 답할 것이다.',
  nextDecision:uncertain?'같은 문제가 반복되는지와 현재 대안을 기록합니다. 문제가 뚜렷하지 않으면 고객 후보를 바꿉니다.':'관심을 보인 이유와 거절한 이유를 기록합니다. 응답이 없으면 노출 여부를 먼저 확인하고, 고객이나 제안 중 하나만 바꿉니다.',
  paths:[{title:uncertain?'판매 전에 문제부터 듣기':'한 채널에서 첫 제안 시험하기',action,reason:uncertain?'누가 고객인지 확신이 없는 상태에서 광고를 넓히지 않기 위해서예요.':'준비할 일을 줄이고 어느 제안에 반응했는지 구분하기 위해서예요.',signal:uncertain?'최근 문제의 구체적인 사례 · 현재 대안 · 해결에 쓰는 노력':'관심 답변 · 상담 문의 · 제안을 거절한 이유',tools:uncertain?['interview','tracker']:['outreach','tracker']}],
  assumptions:['고객과 채널은 검증 전 제안입니다. 실제 후보를 찾거나 연락한 상태가 아닙니다.','예시 모드의 규칙 기반 초안입니다. 시장조사나 실제 LLM 분석 결과가 아닙니다.']};
 return {reply:prior?'조건을 반영해 첫 실행안을 정리했어요.':'먼저 확인할 가설과 첫 실행을 하나로 정리했어요.',quickReplies:[],plan:firstPlan(plan)};
}
export function collectFirstReview(form,t,loose=false){
 const data=new FormData(form),base=Number(form.dataset.base),packet=reviewPacket(t);
 if(base!==packet.requestVersion)throw new Error('요청이 변경됐어요. 최신 의뢰를 열어 주세요.');
 const origin=packet.plan;
 const plan=firstPlan(origin,Number(data.get('source-path')||0));
 for(const key of ['audience','offer','hypothesis','channel','nextDecision'])plan[key]=String(data.get(key)??'').trim();
 plan.paths[0]={...plan.paths[0],...Object.fromEntries(['action','signal'].map(k=>[k,String(data.get(k)??'').trim()])),tools:data.getAll('tools')};
 // Read-only facts are not editable strategy inputs.
 for(const key of ['business','goal','budget'])plan[key]=packet.plan[key];
 const note=String(data.get('review-note')??'').trim();
 if(!loose){
  for(const key of ['offer','channel','nextDecision'])if(!plan[key]||plan[key].length>1200)throw new Error('제안·채널·다음 판단을 확인해 주세요.');
  validatePlan(plan);if(!note||note.length>2000)throw new Error('이 방향을 유지하거나 바꾼 이유를 적어 주세요.');
 }
 return {base,plan,note,dirty:true};
}
export function deliverFirstReview(t,draft){
 if(t.status!=='requested'||draft.base!==t.submittedVersion)throw new Error('이미 전달했거나 다른 버전의 요청입니다. 최신 의뢰를 열어 주세요.');
 const packet=reviewPacket(t),plan=firstPlan(draft.plan);
 for(const key of ['business','goal','budget'])if(plan[key]!==packet.plan[key])throw new Error('고객이 남긴 사업·목표·예산은 수정할 수 없습니다.');
 const note=clean(draft.note,2000);if(!note)throw new Error('검토 이유를 적어 주세요.');
 const changes=executionDiff(packet.plan,plan);
 reviewRequest(t,plan,note,draft.base);
 const now=new Date().toISOString();
 t.reviewDecision={base:draft.base,version:t.reviewedVersion,kind:changes.length?'adjusted':'kept',changes,note,at:now};
 t.reviewDraft=null;
 // Deliberately no approveRequest(): delivering feedback is NOT customer consent to spending.
 return t;
}