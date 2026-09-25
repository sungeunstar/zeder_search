import {taskFromInput} from './work-director.js';
// Consume application-owned state, not DOM text or arbitrary model instructions.
export function workSnapshot(thread,busy=false){
 if(!thread)return {stage:'idle',threadId:'',generationId:'',responseId:'',outputId:'',task:'brief',audience:'',channel:'',offer:'',count:0};
 const t=thread,selected=t.status==='requested'?t.submittedVersion:t.status==='reviewed'?t.reviewedVersion:t.status==='preparing'?t.approvedVersion:t.versions?.at(-1)?.version;
 const v=t.versions?.find(v=>v.version===selected),p=v?.plan,version=v?.version;
 const response=[...t.messages].reverse().find(m=>m.role!=='user');
 const input=[...t.messages].reverse().find(m=>m.role==='user');
 const inputIndex=t.messages.lastIndexOf(input);
 const previousQuestion=t.messages.slice(0,inputIndex).reverse().find(m=>m.role==='assistant');
 const stopped=!!t.error||(!busy&&!!t.pendingGeneration);
 return {threadId:t.id,generationId:busy?t.pendingGeneration?.generationId||'':'',responseId:response?.id||'',outputId:p?`${t.id}:v${version}`:'',
  stage:busy?'thinking':stopped?'error':t.status==='draft'?(p?'draft':'conversation'):t.status,
  cancelled:/중지|중단/.test(t.error||'')||(!busy&&!!t.pendingGeneration),
  task:taskFromInput(input?.text,previousQuestion?.text),audience:p?.audience||'',channel:p?.paths?.map(p=>p.title).join(' · ')||'',offer:p?.goal||'',count:t.messages.length};
}
