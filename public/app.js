import { syncWorld } from './world-controller.js';
import { TOOLS, uid, clean, clone, escapeHTML as esc, makeThread, latestPlan, versionPlan, addReply, demoReply, submitRequest, reviewRequest, approveRequest, requestRevision, artifactFor, validatePlan } from './domain.js';
import { load, save, savedEvent } from './store.js';
const $ = selector => document.querySelector(selector);
const app = $('#app'); const dialog = $('#dialog');
let workspace, storageError = '', config = { mode:'demo' }, busy = new Map(), drafts = new Map(), studioFilter = 'all', toastTimer;
try { workspace = load(); } catch(e) { workspace = {schema:2,threads:[]}; storageError=e.message; }
const icons = {
  arrow:'M4 12h16m-6-6 6 6-6 6', up:'m6 12 6-6 6 6M12 6v14', plus:'M12 5v14M5 12h14', close:'m6 6 12 12M18 6 6 18', check:'m5 12 4 4L19 6',
  search:'M21 21l-5-5M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16', layout:'M3 4h18v16H3zM3 9h18M9 9v11', send:'m21 3-7 18-4-7-7-4 18-7ZM10 14 21 3',
  pen:'m4 16-1 5 5-1L20 8l-4-4L4 16Zm10-10 4 4', chat:'M21 11a9 9 0 0 1-9 9H4l-3 2 2-6a9 9 0 1 1 18-5Z', chart:'M4 3v18h17M8 16v-4m5 4V7m5 9v-7',
  link:'m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 10 4-4a4 4 0 0 0-6-6l-1 1', clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  file:'M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 13h8M8 17h6', spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z', external:'M14 3h7v7m0-7L10 14M10 4H3v17h17v-7',
  chevron:'m8 4 8 8-8 8', down:'m6 9 6 6 6-6', wallet:'M3 5h17v15H3zM16 11h6v5h-6zM3 5l13-3v3', person:'M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 22v-3a8 8 0 0 1 16 0v3',
  download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', inbox:'M4 3h16l3 12v6H1v-6L4 3Zm-3 12h6l2 3h6l2-3h6', back:'M20 12H4m6-6-6 6 6 6', shield:'m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-4 10 3 3 5-6'
};
function icon(name, cls='') { return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name] ?? icons.spark}"/></svg>`; }
const mark = () => '<span class="brand-mark" aria-hidden="true">z</span>';
function toast(text) { $('#toast').textContent=text; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4000); }
function persist() { if(storageError) return false; try{save(workspace);return true;}catch(e){toast(e.message);return false;} }
function thread(id) { return workspace.threads.find(t=>t.id===id); }
function route() { const p=location.hash.replace(/^#\/?/,'').split('/');return {view:p[0]||'home',id:p[1]||''}; }
function go(path) { const next='#/'+path;if(location.hash===next)render();else location.hash=next; }
function time(value) { return new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric'}).format(new Date(value)); }
const states = {draft:'대화 중',requested:'검토 요청',reviewed:'확인할 전략',preparing:'실행 준비'};
function badge(t) { return `<span class="status ${esc(t.status)}"><i></i>${states[t.status]??'대화 중'}</span>`; }
function modeLabel() { return config.mode==='live'?'LLM 연결':'예시 모드'; }
function header(studio=false) {
  return `<header class="site-header"><a class="brand" href="#/" aria-label="ZEDER Search 시작 화면">${mark()}<span>zeder<span class="brand-light"> search</span></span></a><nav aria-label="주 메뉴">${studio?'':`<a class="header-link" href="#/requests">${icon('inbox')}<span>내 요청</span>${workspace.threads.filter(t=>t.status!=='draft').length?`<b class="count">${workspace.threads.filter(t=>t.status!=='draft').length}</b>`:''}</a><span class="nav-divider"></span><a class="header-link studio-link" href="#/studio">마케터 스튜디오 ${icon('external')}</a>`}<button class="mode-button" data-action="settings"><i class="${config.mode==='live'?'live':''}"></i>${modeLabel()}</button></nav></header>`;
}
function composer(t, home=false) {
  const id=t?.id??'new', waiting=busy.has(id), value=drafts.get(id)??'';
  return `<form class="composer ${home?'home-composer':''}" data-form="chat" data-thread="${esc(t?.id??'')}"><label class="sr-only" for="message">비즈니스와 마케팅 고민을 이야기해 주세요</label><textarea id="message" name="message" rows="${home?'3':'2'}" maxlength="4000" placeholder="${home?'제품이나 마케팅 고민을 남겨주세요.':'메시지를 입력하세요.'}" ${waiting?'disabled':''}>${esc(value)}</textarea><div class="composer-bottom"><div class="composer-accessories"><button type="button" class="icon-button" data-action="attach" title="제품 설명 첨부 (.txt, .md)" aria-label="제품 설명 첨부">${icon('plus')}</button></div>${waiting?`<button type="button" class="send-button" data-action="stop" data-id="${id}" aria-label="응답 생성 중지">■</button>`:`<button type="submit" class="${home?'primary start-button':'send-button'}" ${!value.trim()?'disabled':''} aria-label="${home?'전략 대화 시작':'메시지 보내기'}">${home?'시작하기 ':''}${icon(home?'arrow':'up')}</button>`}</div></form>`;
}
function home() {
  return `${header()}<main id="main" class="home-page"><h1>무엇을 알리고 싶으세요?</h1><div class="home-input-wrap">${composer(null,true)}</div><div class="starter-prompts" aria-label="대화 시작 예시"><button data-action="starter" data-value="제품은 만들었는데 첫 고객을 어디서 만나야 할지 모르겠어요.">첫 고객 찾기</button><button data-action="starter" data-value="작은 브랜드를 운영해요. 적은 예산으로 우리 상품을 알리고 싶어요.">브랜드 알리기</button><button data-action="starter" data-value="지금 하는 마케팅을 바꾸고 싶어요. 무엇부터 확인해야 할까요?">마케팅 점검</button></div>${config.mode==='live'?'<p class="composer-note">대화·첨부는 OpenAI API로 전송됩니다.</p>':''}${workspace.threads.length?`<div class="resume-row"><a href="#/chat/${workspace.threads[0].id}">이어서 대화하기 ${icon('arrow')}</a></div>`:''}<div class="world-controls"><button type="button" class="world-control-explore" data-world="explore">둘러보기 ↗</button><button type="button" data-world="replay" aria-label="카메라 인트로 다시 보기">다시 보기</button><button type="button" data-world="pause" aria-pressed="false">정지</button></div><button type="button" class="world-skip" data-world="skip">건너뛰기 ↵</button><div class="world-exit"><span>방향키 이동 · 드래그 시점 · Space 점프</span><button type="button" data-world="exit">대화로 돌아가기</button></div><div id="world-status" role="status"></div></main>`;
}
function toolsView(path) { return path.tools.map(id=>`<button class="tool-chip" data-action="tool" data-tool="${id}" data-path="${esc(path.title)}">${icon(TOOLS[id].icon)}${TOOLS[id].name}</button>`).join(''); }
function board(t, version, actions=true) {
  const p=versionPlan(t,version); if(!p) return '';
  const isLatest=version===t.versions.length;
  return `<section class="strategy-board" aria-label="제안된 마케팅 전략"><div class="strategy-top"><span class="eyebrow">${t.versions.find(v=>v.version===version)?.source==='marketer-demo'?'검토본 · 체험':'전략 초안'}</span><span class="version">v${version}</span></div><h2>${esc(p.title)}</h2><p class="strategy-summary">${esc(p.summary)}</p><div class="context-chips"><span>${icon('person')}${esc(p.audience)}</span><span>${icon('wallet')}${esc(p.budget)}</span></div><div class="goal-node"><span>확인할 것</span><strong>${esc(p.hypothesis)}</strong></div><div class="paths paths-${p.paths.length}">${p.paths.map((path,i)=>`<article class="path-card"><div class="path-index"><b>${String(i+1).padStart(2,'0')}</b></div><h3>${esc(path.title)}</h3><p class="path-action">${esc(path.action)}</p><div class="path-tools" aria-label="준비할 도구">${toolsView(path)}</div><div class="path-signal"><span>확인할 것</span><p>${esc(path.signal)}</p></div></article>`).join('')}</div><details class="assumptions"><summary>선택 이유 ${icon('down')}</summary><div>${p.paths.map(path=>`<p><strong>${esc(path.title)}</strong> ${esc(path.reason)}</p>`).join('')}${p.assumptions.map(a=>`<p class="muted">· ${esc(a)}</p>`).join('')}</div></details>${actions&&isLatest?`<div class="strategy-actions"><button class="text-button" data-action="revise-chat" data-id="${t.id}">${icon('chat')} 수정하기</button>${t.status==='draft'||t.submittedVersion!==version&&t.reviewedVersion!==version?`<button class="primary" data-action="request" data-id="${t.id}">${t.status==='draft'?'전략 요청':'수정본 요청'} ${icon('arrow')}</button>`:`<a class="primary" href="#/request/${t.id}">${t.status==='reviewed'?'검토본 보기':'진행 상황'} ${icon('arrow')}</a>`}</div>`:''}</section>`;
}
function messageView(m,t) {
  if(m.role==='user') return `<div class="message user-message"><div class="user-bubble">${esc(m.text)}</div></div>`;
  const older=m.version&&m.version!==t.versions.length;
  return `<div class="message assistant-message"><div class="assistant-avatar ${m.role==='marketer'?'human':''}">${m.role==='marketer'?icon('person'):mark()}</div><div class="assistant-content"><span class="message-author">${m.role==='marketer'?'마케터 검토 · 체험':'ZEDER'}<small>${m.mode==='demo'?'예시 응답':''}</small></span><div class="message-text">${esc(m.text)}</div>${m.version?(older?`<details class="previous-plan"><summary>이전 전략 v${m.version} 보기 ${icon('down')}</summary>${board(t,m.version,false)}</details>`:board(t,m.version)):''}${m.id===t.messages.at(-1)?.id&&!busy.has(t.id)&&m.quickReplies?.length?`<div class="quick-replies">${m.quickReplies.map(q=>`<button data-action="quick" data-id="${t.id}" data-value="${esc(q)}">${esc(q)} ${icon('arrow')}</button>`).join('')}</div>`:''}</div></div>`;
}
function workActions(t){
 if(t.status==='requested')return `<div class="dock-actions"><button class="dock-result" data-action="show-result" data-id="${t.id}">${icon('file')} 의뢰서 보기 ${icon('arrow')}</button><a class="dock-review" href="#/studio/${t.id}">검토 체험 ${icon('external')}</a></div><p class="dock-disclaimer">로컬 체험 · 실제 마케터 전달·결제 없음</p>`;
 if(t.status==='reviewed')return `<div class="dock-actions"><button class="dock-result" data-action="show-result" data-id="${t.id}">${icon('file')} 검토본 확인 ${icon('arrow')}</button><button class="dock-review" data-action="revision" data-id="${t.id}">수정 요청</button><button class="dock-approve" data-action="approve" data-id="${t.id}">준비 승인</button></div><p class="dock-disclaimer">검토 체험 · 외부 실행 전</p>`;
 return latestPlan(t)?`<div class="dock-actions"><button class="dock-result" data-action="show-result" data-id="${t.id}">${icon('file')} ${t.status==='preparing'?'실행 준비 확인':'전략 초안 보기'} <span>v${t.versions.length}</span>${icon('arrow')}</button></div>`:'';
}
function chatView(t) {
 const waiting=busy.has(t.id),last=[...t.messages].reverse().find(m=>m.role!=='user'),user=[...t.messages].reverse().find(m=>m.role==='user');
 const stopped=t.error||t.pendingGeneration&&!waiting;
 const text=t.status==='requested'?'검토를 기다리고 있어요.':t.status==='reviewed'?'검토본을 확인해 주세요.':t.status==='preparing'?'승인한 전략으로 실행을 준비해요.':last?.text||'';
 return `${header()}<main id="main" class="chat-page conversation-dock"><div class="dock-top"><a href="#/" aria-label="새 의뢰">${icon('plus')}</a><span class="dock-user" title="${esc(user?.text||'')}">${esc(user?.text||'')}</span><button data-action="history" data-id="${t.id}" class="dock-history">대화 기록 ${icon('clock')}</button></div><div class="conversation" aria-live="polite" aria-relevant="additions">${waiting?`<div class="thinking"><span class="thinking-dots"><i></i><i></i><i></i></span>${config.mode==='live'?'답변 작성 중':'예시 응답 작성 중'}</div>`:stopped?`<div class="chat-error" role="alert"><span>${esc(t.error||'응답이 중단됐어요.')}</span><button data-action="retry" data-id="${t.id}" class="text-button">다시 시도</button></div>`:`<div class="dock-reply"><span class="dock-author">${last?.mode==='demo'?'예시 응답':'ZEDER'}</span><div class="message-text">${esc(text)}</div></div>${last?.quickReplies?.length&&t.status==='draft'?`<div class="quick-replies">${last.quickReplies.map(q=>`<button data-action="quick" data-id="${t.id}" data-value="${esc(q)}">${esc(q)}</button>`).join('')}</div>`:''}${workActions(t)}`}</div><div class="sticky-composer">${composer(t)}<p class="composer-note">${config.mode==='live'?'OpenAI API 전송 · ':''}이 브라우저에만 저장</p></div></main>`;
}
function showResult(t){
 if(!t||!latestPlan(t))return;
 if(t.status==='draft')openModal('전략 초안',board(t,t.versions.length),'<button class="secondary" data-action="close-modal">공방으로 돌아가기</button>');
 else openModal(t.status==='requested'?'검토 대기':t.status==='reviewed'?'검토본 확인':'실행 준비',progressDocument(t).replace(header(),'').replace('id="main"',''),'<button class="secondary" data-action="close-modal">공방으로 돌아가기</button>');
 dialog.classList.add('result-dialog');
}
function requestsView() {
  return `${header()}<main id="main" class="requests-page"><div class="section-header"><div><h1>내 요청</h1></div><a class="primary" href="#/">새 요청 ${icon('plus')}</a></div>${workspace.threads.length?`<div class="request-list">${workspace.threads.map(t=>`<a class="request-row" href="#/${t.status==='draft'?'chat':'request'}/${t.id}"><span class="request-icon">${icon(t.status==='draft'?'chat':'file')}</span><div><h3>${esc(latestPlan(t)?.title??t.title)}</h3><p>${esc(t.title)}</p></div><div class="request-row-end">${badge(t)}<small>${time(t.updatedAt)}</small></div>${icon('chevron')}</a>`).join('')}</div>`:`<div class="empty-state">${icon('chat')}<h2>아직 요청이 없어요.</h2><a class="primary" href="#/">새 요청 ${icon('arrow')}</a></div>`}</main>`;
}
function progressView(t) {return chatView(t);}
function progressDocument(t) {
  const reviewed=t.status==='reviewed', preparing=t.status==='preparing'; const v=preparing?t.approvedVersion:reviewed?t.reviewedVersion:t.submittedVersion; const p=versionPlan(t,v);
  if(!p) return chatView(t);
  const step=preparing?3:reviewed?2:1;
  const title=preparing?'실행 준비':reviewed?'검토본 확인':'검토 대기';
  return `${header()}<main id="main" class="progress-page"><a class="back-link" href="#/chat/${t.id}">${icon('back')} 대화로 돌아가기</a><div class="progress-hero">${badge(t)}<h1>${title}</h1></div><ol class="progress-steps">${['요청 완료','마케터 검토','내가 확인','실행 준비'].map((s,i)=>`<li class="${i<step?'done':i===step?'current':''}"><b>${i<step?icon('check'):i+1}</b><span>${s}</span></li>`).join('')}</ol><div class="demo-notice">${icon('shield')}<div><strong>로컬 체험 · 실제 마케터 전달·결제 없음</strong></div><a href="#/studio/${t.id}">스튜디오 열기 ${icon('external')}</a></div>${reviewed?`<div class="review-note"><span class="micro-label">검토 메모 · 체험</span><p>${esc([...t.messages].reverse().find(m=>m.role==='marketer')?.text)}</p></div>`:''}${board(t,v,false)}${reviewed?`<div class="approval-bar"><button class="secondary" data-action="revision" data-id="${t.id}">수정 요청</button><button class="primary" data-action="approve" data-id="${t.id}">준비 승인 ${icon('arrow')}</button></div>`:''}${preparing?`<section class="preparation"><div class="section-header"><div><h2>도구</h2><span class="subtle-status">외부 실행 전</span></div></div><div class="preparation-list">${[...new Set(p.paths.flatMap(x=>x.tools))].map(id=>{const a=t.artifacts.find(a=>a.toolId===id&&a.version===v);return `<article class="preparation-row"><span class="request-icon">${icon(TOOLS[id].icon)}</span><div><h3>${TOOLS[id].name}</h3><p>${TOOLS[id].output}</p></div><span class="subtle-status">${a?'초안 준비됨':TOOLS[id].ready?'준비 가능':'연결 필요'}</span><button class="secondary small" data-action="artifact" data-id="${t.id}" data-tool="${id}">${a?'초안 보기':TOOLS[id].ready?'초안 만들기':'조사 계획 보기'} ${icon('arrow')}</button></article>`;}).join('')}</div></section>`:''}<details class="event-history"><summary>진행 기록 ${icon('down')}</summary>${t.events.map(e=>`<p><span>${time(e.at)}</span>${esc(e.label)}</p>`).join('')}</details></main>`;
}
function studioShell(content, activeId='') {
  const pending=workspace.threads.filter(t=>t.status==='requested').length;
  return `<div class="studio-shell"><aside class="studio-sidebar"><a class="brand" href="#/studio">${mark()}<span>zeder<span class="brand-light"> studio</span></span></a><a class="studio-nav active" href="#/studio">${icon('inbox')} 전략 요청함 <b>${pending}</b></a><div class="sidebar-bottom"><span class="mode-dark">● 로컬 체험</span><a href="#/">${icon('back')} 고객 화면으로</a></div></aside><div class="studio-main"><header class="studio-header"><span>${icon('layout')} 마케터 스튜디오</span><a class="header-link" href="#/">고객 화면 ${icon('external')}</a></header><main id="main">${content}</main></div></div>`;
}
function studioList() {
  const all=workspace.threads.filter(t=>t.status!=='draft'); const items=all.filter(t=>studioFilter==='all'||t.status===studioFilter);
  return studioShell(`<div class="studio-page-title"><div><h1>전략 요청함</h1></div><span class="studio-demo">로컬 요청</span></div><div class="studio-stats">${[['검토할 요청','requested'],['고객 확인 중','reviewed'],['실행 준비','preparing']].map(([name,s])=>`<div><span>${name}</span><strong>${all.filter(t=>t.status===s).length}<small>건</small></strong></div>`).join('')}</div><div class="studio-inbox"><div class="inbox-head"><h2>전략 요청</h2><div class="filter-tabs">${[['all','전체'],['requested','검토 대기'],['reviewed','고객 확인']].map(([value,label])=>`<button class="${studioFilter===value?'active':''}" data-action="filter" data-value="${value}">${label}</button>`).join('')}</div></div>${items.length?items.map(t=>{const p=versionPlan(t,t.submittedVersion);return `<a class="studio-request" href="#/studio/${t.id}"><div class="studio-request-top">${badge(t)}<small>${time(t.updatedAt)}</small></div><h3>${esc(p?.title??t.title)}</h3><p>${esc(p?.business??t.title)}</p><div class="studio-request-bottom"><span>${icon('person')}${esc(p?.audience)}</span><span>${icon('wallet')}${esc(p?.budget)}</span><b>${t.status==='requested'?'전략 검토하기':'요청 확인하기'} ${icon('arrow')}</b></div></a>`;}).join(''):`<div class="empty-state">${icon('inbox')}<h2>검토할 요청이 없어요.</h2><a class="secondary" href="#/">새 요청 ${icon('arrow')}</a></div>`}</div>`);
}
function field(label,name,value,area=false,extra='') { return `<label class="field"><span>${label}</span>${area?`<textarea name="${name}" rows="3" maxlength="1200" required ${extra}>${esc(value)}</textarea>`:`<input name="${name}" value="${esc(value)}" maxlength="500" required ${extra}>`}</label>`; }
function studioDetail(t) {
  const base=versionPlan(t,t.submittedVersion); if(!base) return studioList();
  const writable=t.status==='requested'; const p=writable?(t.reviewDraft?.base===t.submittedVersion?t.reviewDraft.plan:base):(versionPlan(t,t.reviewedVersion??t.approvedVersion)??base);
  return studioShell(`<a class="back-link" href="#/studio">${icon('back')} 요청함으로</a><div class="studio-page-title detail-title"><div>${badge(t)}<h1>${esc(p.title)}</h1><p>${esc(t.title)}</p></div><a class="secondary" href="#/request/${t.id}">고객 화면 ${icon('external')}</a></div><div class="studio-detail-grid"><aside class="context-panel"><div class="panel-label">${icon('chat')} 고객 대화</div><div class="context-summary"><span class="micro-label">사업과 고민</span><p>${esc(base.business)}</p><span class="micro-label">목표</span><p>${esc(base.goal)}</p><span class="micro-label">예산</span><p>${esc(base.budget)}</p></div><details class="full-conversation" open><summary>대화 전문 ${icon('down')}</summary>${t.messages.filter(m=>!m.version).map(m=>`<div class="context-message ${m.role}"><b>${m.role==='user'?'고객':'ZEDER'}</b><p>${esc(m.text)}</p></div>`).join('')}</details><div class="context-warning">${icon('shield')} URL·고객 가설 미검증</div></aside><section class="editor-panel"><div class="panel-label">${icon('pen')} 전략 편집 <small>요청 v${t.submittedVersion}</small></div>${!writable?`<div class="submitted-notice">검토본 제출됨 · 수정 요청 대기</div>`:''}<form data-form="review" data-id="${t.id}" data-base="${t.submittedVersion}"><fieldset ${!writable?'disabled':''}><div class="editor-fields">${field('전략 이름','title',p.title)}${field('타깃','audience',p.audience)}<div class="field-pair">${field('이번 목표','goal',p.goal)}${field('예산 범위','budget',p.budget)}</div>${field('전략 요약','summary',p.summary)}${field('확인하려는 가설','hypothesis',p.hypothesis,true)}<div class="editor-paths"><h3>실행 경로와 필요한 도구</h3>${p.paths.map((path,i)=>`<section class="editor-path"><div class="path-index"><b>${String(i+1).padStart(2,'0')}</b><span>실행 경로</span></div>${field('실행 이름',`path-${i}-title`,path.title)}${field('무엇을 할지',`path-${i}-action`,path.action,true)}${field('이 방향을 선택한 이유',`path-${i}-reason`,path.reason,true)}${field('확인할 반응',`path-${i}-signal`,path.signal)}<div class="field"><span>필요한 도구 · 최대 4개</span><div class="tool-options">${Object.entries(TOOLS).map(([id,tool])=>`<label><input type="checkbox" name="path-${i}-tools" value="${id}" ${path.tools.includes(id)?'checked':''}>${icon(tool.icon)}${tool.name}</label>`).join('')}</div></div></section>`).join('')}</div>${field('검토 메모','review-note',t.reviewDraft?.note??'',true)}</div></fieldset>${writable?`<div class="editor-footer"><div><button type="button" class="secondary" data-action="save-review" data-id="${t.id}">초안 저장</button><button type="submit" class="primary">검토본 보내기 ${icon('arrow')}</button></div></div>`:''}</form></section></div>`,t.id);
}
function render() {
  if(storageError) {app.innerHTML=`${header()}<main id="main" class="empty-state"><h1>저장된 대화를 확인해 주세요.</h1><p>${esc(storageError)}</p></main>`;return;}
  const r=route(); const t=thread(r.id);
  app.innerHTML=r.view==='studio'?(t?studioDetail(t):studioList()):r.view==='requests'?requestsView():r.view==='chat'&&t?chatView(t):r.view==='request'&&t?progressView(t):home();
  syncWorld(document.querySelector('.home-page')?'home':r.view,t,busy.has(t?.id));
  if(r.view==='chat')requestAnimationFrame(()=>{const c=$('.conversation');if(c)c.scrollTop=c.scrollHeight;});
  document.title=`${r.view==='studio'?'마케터 스튜디오':r.view==='chat'?'전략 대화':r.view==='request'?'요청 진행 상황':'마케팅 대화'} · ZEDER Search`;
}
function openModal(title,body,footer='') { dialog.className='';dialog.innerHTML=`<div class="modal-head"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="닫기">${icon('close')}</button></div><div class="modal-body">${body}</div>${footer?`<div class="modal-footer">${footer}</div>`:''}`; if(!dialog.open)dialog.showModal(); }
function settings() {
  openModal('연결 정보',`<div class="connection-status">${icon(config.mode==='live'?'check':'link')}<strong>${modeLabel()}</strong></div>${config.mode==='live'?`<form data-form="access"><label class="field"><span>테스트 접근 코드</span><input name="access" type="password" autocomplete="off" required placeholder="접근 코드"></label><button class="primary" type="submit">연결 ${icon('arrow')}</button></form>`:`<details class="connection-setup"><summary>서버 설정</summary><p><code>OPENAI_API_KEY</code> · <code>OPENAI_MODEL</code> · <code>ZEDER_PREVIEW_KEY</code></p><p>API 키는 서버에만 저장합니다.</p></details>`}<div class="privacy-summary"><strong>데이터·실행 범위</strong><p>대화·요청·검토는 이 브라우저에만 저장됩니다.</p><p>계정 간 협업·실제 마케터 전달·고객 탐색·발송·결제는 미연결입니다.</p><p>LLM 연결 시 대화·첨부는 OpenAI API로 전송됩니다. 비밀키·민감정보는 입력하지 마세요.</p></div>`, '<button class="secondary" data-action="close-modal">닫기</button>');
}
function download(name,content,type='text/markdown;charset=utf-8') {const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function scrollConversation() { if(route().view==='chat') setTimeout(()=>{const c=$('.conversation');if(c)c.scrollTo({top:c.scrollHeight,behavior:'smooth'});},60); }
async function runReply(t) {
  if(busy.has(t.id))return;
  const generationId=uid(), controller=new AbortController(); busy.set(t.id,controller);
  t.pendingGeneration={generationId,createdAt:new Date().toISOString()}; t.error=null;persist();render();scrollConversation();
  try {
    let result;
    if(config.mode==='live') {
      const key=sessionStorage.getItem('zeder-preview-access')??'';
      const messages=t.messages.filter(m=>['user','assistant'].includes(m.role)).slice(-24).map(m=>({role:m.role,text:m.text}));
      const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json','x-preview-key':key},body:JSON.stringify({generationId,messages,plan:latestPlan(t)}),signal:controller.signal});
      const data=await response.json();if(!response.ok)throw new Error(data.error??'대화를 불러오지 못했어요.');result=data;
    } else {
      await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,550);controller.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));},{once:true});});
      result={...demoReply(t.messages,latestPlan(t)),mode:'demo',metadata:{generationId,model:'demo-rules',createdAt:new Date().toISOString()}};
    }
    if(controller.signal.aborted||busy.get(t.id)!==controller||t.pendingGeneration?.generationId!==generationId)throw new DOMException('Aborted','AbortError');
    addReply(t,result,result.mode,result.metadata);t.pendingGeneration=null;
  } catch(e) {t.error=e.name==='AbortError'?'응답 생성 중지 · 대화 저장됨':e.message;t.pendingGeneration=null;}
  finally {busy.delete(t.id);persist();render();scrollConversation();}
}
async function send(text,id='') {
  if(storageError||!text.trim())return;
  if(config.mode==='live'&&!sessionStorage.getItem('zeder-preview-access')){settings();return;}
  let t=thread(id);if(t&&busy.has(t.id))return;
  if(!t){t=makeThread(text);workspace.threads.unshift(t);}
  t.messages.push({id:uid(),role:'user',text:clean(text,4000),createdAt:new Date().toISOString()}); t.updatedAt=new Date().toISOString();t.error=null;
  drafts.delete(id||'new');persist();go(`chat/${t.id}`);await runReply(t);
}
function collectReview(form,t) {
  const data=new FormData(form); const p=clone(versionPlan(t,Number(form.dataset.base)));
  for(const key of ['title','audience','goal','budget','summary','hypothesis'])p[key]=String(data.get(key)??'');
  p.paths=p.paths.map((path,i)=>({...path,title:data.get(`path-${i}-title`),action:data.get(`path-${i}-action`),reason:data.get(`path-${i}-reason`),signal:data.get(`path-${i}-signal`),tools:data.getAll(`path-${i}-tools`)}));
  return {plan:validatePlan(p),note:String(data.get('review-note')??''),base:Number(form.dataset.base)};
}
document.addEventListener('submit',async e=>{
  const f=e.target;if(!f.matches('form[data-form]'))return;e.preventDefault();
  try {
    if(f.dataset.form==='chat')await send(f.elements.message.value,f.dataset.thread);
    if(f.dataset.form==='access'){sessionStorage.setItem('zeder-preview-access',f.elements.access.value);dialog.close();toast('접근 코드 저장됨');}
    if(f.dataset.form==='review'){const t=thread(f.dataset.id),v=collectReview(f,t);if(!v.note.trim())throw new Error('검토 메모를 작성해 주세요.');reviewRequest(t,v.plan,v.note,v.base);t.reviewDraft=null;persist();render();toast('검토본 제출됨');}
    if(f.dataset.form==='revision'){const t=thread(f.dataset.id);requestRevision(t,f.elements.note.value);persist();dialog.close();render();toast('수정 요청 저장됨');}
  }catch(error){toast(error.message);}
});
document.addEventListener('input',e=>{
  if(e.target.id==='message'){const f=e.target.closest('form');drafts.set(f.dataset.thread||'new',e.target.value);const btn=f.querySelector('[type=submit]');if(btn)btn.disabled=!e.target.value.trim();}
});
document.addEventListener('keydown',e=>{
  if(e.target.id==='message'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();if(e.target.value.trim())e.target.form.requestSubmit();}
});
document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-action]');if(!el)return;const action=el.dataset.action,id=el.dataset.id,t=thread(id);
  try {
    if(action==='settings')settings();
    if(action==='show-result')showResult(t);
    if(action==='history'){openModal('대화 기록',t.messages.map(m=>messageView(m,t)).join(''),`<button class="secondary" data-action="export" data-id="${t.id}">대화 내보내기</button>`);dialog.classList.add('history-dialog');}
    if(action==='close-modal')dialog.close();
    if(action==='starter'){drafts.set('new',el.dataset.value);render();$('#message')?.focus();}
    if(action==='quick')await send(el.dataset.value,id);
    if(action==='retry')await runReply(t);
    if(action==='stop')busy.get(id)?.abort();
    if(action==='revise-chat'){drafts.set(id,'');go(`chat/${id}`);setTimeout(()=>{$('#message')?.focus();$('#message')?.setAttribute('placeholder','어떤 부분을 바꿀까요?');},50);}
    if(action==='tool'){const tool=TOOLS[el.dataset.tool];openModal(tool.name,`<div class="tool-info-row"><span>결과물</span><strong>${tool.output}</strong></div><div class="tool-info-row"><span>상태</span><strong>${tool.ready?'승인 후 초안 준비':'조사 계획만 제공 · Runner 미연결'}</strong></div><div class="tool-info-row"><span>외부 실행</span><strong>미연결 · 별도 승인 필요</strong></div>`,`<button class="primary" data-action="close-modal">닫기</button>`);}
    if(action==='request'){const p=latestPlan(t);openModal('전략을 요청할까요?',`<div class="confirmation-summary"><span>목표</span><strong>${esc(p.goal)}</strong><span>타깃</span><strong>${esc(p.audience)}</strong><span>예산 범위</span><strong>${esc(p.budget)}</strong></div><div class="mini-note">체험 요청 · 실제 전달·결제·광고 집행 없음</div>`,`<button class="secondary" data-action="close-modal">취소</button><button class="primary" data-action="confirm-request" data-id="${id}">요청 확정 ${icon('arrow')}</button>`);}
    if(action==='confirm-request'){submitRequest(t);persist();dialog.close();go(`request/${id}`);window.scrollTo(0,0);}
    if(action==='approve'){approveRequest(t);persist();dialog.close();render();toast('준비 승인됨 · 외부 실행 없음');}
    if(action==='revision'){openModal('수정 요청',`<form data-form="revision" data-id="${id}"><label class="field"><span>수정할 내용</span><textarea name="note" rows="4" maxlength="2000" required placeholder="변경할 내용을 남겨주세요."></textarea></label><button class="primary" type="submit">수정 요청 저장 ${icon('arrow')}</button></form>`);}
    if(action==='filter'){studioFilter=el.dataset.value;render();}
    if(action==='save-review'){const f=$('form[data-form=review]'),v=collectReview(f,t);t.reviewDraft=v;persist();toast('초안 저장됨 · 미제출');}
    if(action==='artifact'){const toolId=el.dataset.tool;if(t.status!=='preparing')throw new Error('고객의 실행 준비 승인이 필요해요.');const p=versionPlan(t,t.approvedVersion);let a=t.artifacts.find(a=>a.toolId===toolId&&a.version===t.approvedVersion);if(!a){a={id:uid(),toolId,version:t.approvedVersion,text:artifactFor(p,toolId),createdAt:new Date().toISOString()};t.artifacts.push(a);persist();render();}openModal(TOOLS[toolId].output,`<p class="mini-note">템플릿 초안 · 조사·게시·발송 없음</p><pre class="artifact-preview">${esc(a.text)}</pre>`,`<button class="secondary" data-action="close-modal">닫기</button><button class="primary" data-action="download-artifact" data-id="${id}" data-tool="${toolId}">파일로 받기 ${icon('download')}</button>`);}
    if(action==='download-artifact'){const a=t.artifacts.find(a=>a.toolId===el.dataset.tool&&a.version===t.approvedVersion);if(a)download(`zeder-${a.toolId}-v${a.version}.md`,a.text);}
    if(action==='export'){download(`zeder-conversation-${t.id.slice(0,8)}.json`,JSON.stringify(t,null,2),'application/json;charset=utf-8');}
    if(action==='attach'){const input=document.createElement('input');input.type='file';input.accept='.txt,.md';input.addEventListener('change',async()=>{try{const file=input.files?.[0];if(!file)return;if(file.size>14000||!/\.(txt|md)$/i.test(file.name))throw new Error('14KB 이하의 TXT 또는 MD 파일을 넣어주세요.');const text=await file.text();const f=$('form[data-form=chat]');if(!f)return;const field=f.elements.message;const next=`${field.value}\n\n[첨부: ${file.name}]\n${text}`.trim();if(next.length>4000)throw new Error('첨부 내용을 포함해 4,000자까지 넣을 수 있어요.');field.value=next;field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();toast('첨부 완료 · 전송 전');}catch(err){toast(err.message);}});input.click();}
  }catch(error){toast(error.message);}
});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);});
window.addEventListener('storage',e=>{if(savedEvent(e)&&!busy.size){try{workspace=load();render();}catch(err){toast(err.message);}}});
render();
if(location.protocol!=='file:'&&location.protocol!=='about:')fetch('/api/chat').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{if(data.mode==='live'){config=data;render();}}).catch(()=>{/* Static/offline preview remains explicitly in demo mode. */});

document.addEventListener('world-artifact-open',e=>{const r=route();if(['chat','request'].includes(r.view)&&r.id===e.detail?.threadId)showResult(thread(r.id));});
