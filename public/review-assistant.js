import {firstPlan} from './single-gate.js';
import {clone,validatePlan} from './domain.js';
import {BRIEF_FIELDS} from './brief.js';
const text=(s,label,max=2400)=>{if(typeof s!=='string'||!s.trim()||s.length>max)throw new Error(`${label} 형식을 확인해 주세요.`);return s.trim();};
export function validateReview(result,packet){
 if(!result||typeof result!=='object')throw new Error('검토 초안이 비어 있어요.');
 const out={};for(const k of ['customerSummary','diagnosis','reply'])out[k]=text(result[k],k);
 for(const k of ['openQuestions','priorities']){if(!Array.isArray(result[k])||result[k].length>4)throw new Error('검토 항목 형식 오류');out[k]=result[k].map(s=>text(s,k,600));}
 if(!Array.isArray(result.evidence)||result.evidence.length>8)throw new Error('원문 근거 형식 오류');
 out.evidence=result.evidence.map(e=>{const m=packet.messages.find(m=>m.id===e.messageId&&m.role==='user');const quote=text(e.quote,'고객 원문',1500);if(!m||!m.text.includes(quote))throw new Error('고객 대화에서 확인되지 않는 근거입니다. 다시 생성해 주세요.');return {messageId:m.id,quote};});
 out.plan=validatePlan(result.plan);return out;
}
export function demoReview(packet){
 const p=firstPlan(packet.plan),facts=packet.notes.filter(n=>['stated','confirmed'].includes(n.status));
 const uncertain=packet.notes.filter(n=>n.status==='unknown');
 const customerSummary=facts.length?facts.filter(n=>['business','goal','budget'].includes(n.key)).map(n=>`${BRIEF_FIELDS[n.key]}: ${n.value}`).join('\n'):'고객이 남긴 구체적인 사업과 목표를 원문에서 확인해 주세요.';
 const result={customerSummary,
 diagnosis:'고객 조건과 제안된 가설을 분리해서 읽고, 먼저 할 실행 하나를 유지하거나 교정해 주세요.',
 evidence:packet.messages.filter(m=>m.role==='user'&&!/^(안녕하세요|네|응)[.! ]*$/.test(m.text)).slice(-4).map(m=>({messageId:m.id,quote:m.text.slice(0,450)})),
 openQuestions:uncertain.slice(0,3).map(n=>`${BRIEF_FIELDS[n.key]}는 아직 미정입니다. 확인되지 않은 조건을 확정한 것처럼 다루지 않습니다.`),
 priorities:[`먼저 판단할 가설: ${p.hypothesis}`,`실행 범위: ${p.paths[0].title}`,`관찰할 반응: ${p.paths[0].signal}`],
 reply:p.paths[0].reason,plan:p};
 return validateReview(result,packet);
}
export function currentReview(t,packet){return (t.reviewAssist?.versions||[]).find(v=>v.id===t.reviewAssist?.activeId&&v.base===packet.requestVersion&&v.contextKey===packet.contextKey)||null;}