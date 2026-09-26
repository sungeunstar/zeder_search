/** A source-linked journal, not a model's invented customer profile. */
import {clone,uid,clean,latestPlan,versionPlan} from './domain.js';
export const BRIEF_FIELDS=Object.freeze({business:'제품·서비스',audience:'알리고 싶은 고객',goal:'이번 목표',budget:'사용할 예산',channel:'생각한 채널',constraints:'조건·제약'});
const uncertain=s=>/모르|미정|못했|못 정|정하지|찾아주세요|함께 찾아|추천해|추천받/.test(s);
const greeting=s=>/^(안녕(?:하세요)?|반가워요|안녕하세요[.! ]*|네|넵|응|좋아요|감사합니다)[.!\s]*$/.test(s.trim());
function keysFor(text,question,hasBusiness){
 const keys=[];
 if(/제품|서비스|운영|스튜디오|브랜드|쇼핑몰|판매|만들었|개발했|출시|카페|필라테스/.test(text)&&(!hasBusiness||/제품은|서비스는|운영하|만들었|개발했/.test(text)))keys.push('business');
 if(/목표|고객.*(?:모으|찾고|확보)|회원.*(?:모으|늘리)|매출|문의.*늘리|알리고 싶|홍보하고 싶/.test(text))keys.push('goal');
 if(/타깃|타겟|주민|직장인|소비자|대표|운영하는 사람|작은 팀|고객은|대상은/.test(text))keys.push('audience');
 if(/예산|\d[\d,.]*\s*(?:만\s*원|원)|돈을 쓰기 전|유료 광고 없이|광고비/.test(text))keys.push('budget');
 if(/인스타|네이버|유튜브|블로그|링크드인|커뮤니티|채널/.test(text))keys.push('channel');
 if(/하지 않|안 하고|없이|불가|시간은|하루.*시간|주.*시간|싫|제외/.test(text))keys.push('constraints');
 // Use the preceding actual question only when the answer itself is ambiguous.
 if(!keys.length&&/예산|얼마|비용/.test(question))keys.push('budget');
 else if(!keys.length&&/누구|고객|타깃|대상/.test(question))keys.push('audience');
 else if(!keys.length&&/이루고|목표|먼저.*확인/.test(question))keys.push('goal');
 else if(!keys.length&&/어떤.*(?:제품|사업|서비스)|무엇을.*알리/.test(question))keys.push('business');
 return [...new Set(keys)];
}
function excerpt(text,key){
 const segments=text.split(/(?<=[.!?。])\s+|\n+/).filter(Boolean);
 const patterns={business:/제품|서비스|운영|브랜드|쇼핑몰|판매|만들었|개발했|출시|필라테스/,audience:/타깃|타겟|주민|직장인|소비자|대상은|고객은/,goal:/목표|고객.*(?:모으|찾고|확보)|회원.*(?:모으|늘리)|매출|문의.*늘리|알리고 싶|홍보하고 싶/,budget:/예산|\d.*(?:원)|유료 광고 없이|돈을 쓰기 전/,channel:/인스타|네이버|유튜브|블로그|링크드인|커뮤니티|채널/,constraints:/하지 않|안 하고|없이|불가|시간|싫|제외/};
 return clean(segments.find(s=>patterns[key]?.test(s))||text,1500);
}
export function briefJournal(t,{includeProposal=true}={}){
 const events=[];let question='',hasBusiness=false;
 for(const m of t.messages||[]){
  if(m.role==='assistant'){question=m.text||'';continue;}
  if(m.role!=='user'||!m.text?.trim()||greeting(m.text))continue;
  const keys=keysFor(m.text,question,hasBusiness);if(keys.includes('business'))hasBusiness=true;
  for(const key of keys)events.push({id:`${m.id}:${key}`,key,value:excerpt(m.text,key),source:'customer',status:uncertain(excerpt(m.text,key))?'unknown':'stated',messageId:m.id,quote:clean(m.text,1500),at:m.createdAt||t.createdAt});
 }
 for(const e of t.briefEdits||[]){if(BRIEF_FIELDS[e.key]&&typeof e.value==='string')events.push({...e,source:'confirmed',status:uncertain(e.value)?'unknown':'confirmed'});}
 events.sort((a,b)=>(a.at||'').localeCompare(b.at||''));
 const values={};for(const e of events)values[e.key]=e;
 const p=includeProposal?latestPlan(t):null;
 if(p)for(const key of ['business','audience','goal','budget']){
  if(!values[key]&&!greeting(p[key]||''))values[key]={id:`proposal:${t.versions.length}:${key}`,key,value:p[key],source:'proposal',status:'proposed',quote:'',messageId:null,at:t.versions.at(-1)?.createdAt};
 }
 return {items:Object.keys(BRIEF_FIELDS).filter(k=>values[k]).map(k=>values[k]),events};
}
export function recordBrief(t,key,value){
 if(!BRIEF_FIELDS[key]||typeof value!=='string'||!value.trim()||value.length>1500)throw new Error('의뢰 노트를 1~1,500자로 적어 주세요.');
 const previous=briefJournal(t).items.find(x=>x.key===key);if(previous?.value===value.trim()&&previous.source==='confirmed')return false;
 t.briefEdits??=[];t.briefEdits.push({id:uid(),key,value:value.trim(),source:'confirmed',at:new Date().toISOString(),previousId:previous?.id||null});t.updatedAt=new Date().toISOString();return true;
}
export function captureBrief(t){
 if(!t.submittedVersion)throw new Error('먼저 검토할 전략이 필요합니다.');
 const at=new Date().toISOString();const snapshot={version:t.submittedVersion,at,messages:clone(t.messages),notes:clone(briefJournal(t,{includeProposal:false}).items)};
 t.submissionHistory??=[];t.submissionHistory.push(snapshot);t.submittedContext=snapshot;return snapshot;
}
export function reviewPacket(t){
 const p=versionPlan(t,t.submittedVersion);if(!p)throw new Error('검토할 전략을 찾지 못했어요.');
 const frozen=t.submittedContext?.version===t.submittedVersion?t.submittedContext:null;
 const at=t.versions.find(v=>v.version===t.submittedVersion)?.createdAt||'';
 const messages=(frozen?.messages||t.messages.filter(m=>!at||!m.createdAt||m.createdAt<=at)).filter(m=>['user','assistant'].includes(m.role)).map(m=>({id:m.id,role:m.role,text:m.text}));
 const notes=frozen?.notes||briefJournal({...t,messages,briefEdits:[]},{includeProposal:false}).items;
 // Hash only disambiguates versions in this local preview; it is not authorization.
 const source=JSON.stringify({version:t.submittedVersion,messages,notes});let h=2166136261;for(const c of source)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
 return {requestVersion:t.submittedVersion,contextKey:`brief-${h.toString(16)}`,messages,notes:notes.map(({key,value,status})=>({key,value,status})),plan:clone(p)};
}