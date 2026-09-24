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
const mark = () => '<span class="brand-mark" aria-hidden="true">z<span>✦</span></span>';
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
  return `<form class="composer ${home?'home-composer':''}" data-form="chat" data-thread="${esc(t?.id??'')}"><label class="sr-only" for="message">비즈니스와 마케팅 고민을 이야기해 주세요</label><textarea id="message" name="message" rows="${home?'3':'2'}" maxlength="4000" placeholder="${home?'어떤 일을 하고 계신가요?\n제품 소개나 마케팅 고민을 편하게 남겨주세요.':'더 이야기해 주세요. 전략은 대화로 바꿀 수 있어요.'}" ${waiting?'disabled':''}>${esc(value)}</textarea><div class="composer-bottom"><div class="composer-accessories"><button type="button" class="icon-button" data-action="attach" title="제품 설명 첨부 (.txt, .md)" aria-label="제품 설명 첨부">${icon('plus')}</button><span>${home?'링크나 제품 설명을 함께 넣어도 좋아요.':'Enter로 보내기 · Shift + Enter로 줄바꿈'}</span></div>${waiting?`<button type="button" class="send-button" data-action="stop" data-id="${id}" aria-label="응답 생성 중지">■</button>`:`<button type="submit" class="${home?'primary start-button':'send-button'}" ${!value.trim()?'disabled':''} aria-label="${home?'전략 대화 시작':'메시지 보내기'}">${home?'전략 대화 시작 ':''}${icon(home?'arrow':'up')}</button>`}</div></form>`;
}
function home() {
  return `${header()}<main id="main" class="home-page"><div class="home-orbit" aria-hidden="true">${icon('spark')}</div><div class="eyebrow"><span class="tiny-line"></span>이야기에서, 실행까지</div><h1>어떤 비즈니스를<br><span>알리고 싶으세요?</span></h1><p class="home-description">마케팅을 몰라도 괜찮아요.<br class="mobile-only"> 이야기만 해주세요. 방향과 방법은 함께 찾을게요.</p><div class="home-input-wrap">${composer(null,true)}</div><div class="starter-prompts" aria-label="대화 시작 예시"><button data-action="starter" data-value="제품은 만들었는데 첫 고객을 어디서 만나야 할지 모르겠어요.">${icon('spark')} 첫 고객을 찾고 싶어요</button><button data-action="starter" data-value="작은 브랜드를 운영해요. 적은 예산으로 우리 상품을 알리고 싶어요.">${icon('send')} 우리 브랜드를 알리고 싶어요</button><button data-action="starter" data-value="지금 하는 마케팅을 바꾸고 싶어요. 무엇부터 확인해야 할까요?"><span>↗</span> 지금 방법이 맞는지 모르겠어요</button></div><div class="how-it-works"><span><b>01</b> 대화로 요청</span><i></i><span><b>02</b> 전략 함께 확인</span><i></i><span><b>03</b> 마케터 검토 후 실행 준비</span></div><p class="home-footnote">${config.mode==='live'?'대화 내용은 응답 생성을 위해 LLM API로 전송됩니다.':'지금은 예시 대화로 흐름을 체험할 수 있어요.'} <button class="text-button" data-action="settings">${config.mode==='live'?'연결 정보':'연결 안내'}</button></p>${workspace.threads.length?`<div class="resume-row"><span>이전에 나누던 이야기가 있어요.</span><a href="#/chat/${workspace.threads[0].id}">이어서 대화하기 ${icon('arrow')}</a></div>`:''}</main><footer class="home-footer"><span>STRATEGY, MADE SIMPLE.</span><span>고객에게는 대화를, 마케터에게는 작업 공간을.</span></footer>`;
}
function toolsView(path) { return path.tools.map(id=>`<button class="tool-chip" data-action="tool" data-tool="${id}" data-path="${esc(path.title)}">${icon(TOOLS[id].icon)}${TOOLS[id].name}</button>`).join(''); }
function board(t, version, actions=true) {
  const p=versionPlan(t,version); if(!p) return '';
  const isLatest=version===t.versions.length;
  return `<section class="strategy-board" aria-label="제안된 마케팅 전략"><div class="strategy-top"><span class="eyebrow">${t.versions.find(v=>v.version===version)?.source==='marketer-demo'?'마케터가 검토한 전략':'대화를 바탕으로 제안해요'}</span><span class="version">v${version}</span></div><h2>${esc(p.title)}</h2><p class="strategy-summary">${esc(p.summary)}</p><div class="context-chips"><span>${icon('person')}${esc(p.audience)}</span><span>${icon('wallet')}${esc(p.budget)}</span></div><div class="goal-node"><span>${icon('spark')} 이번에 확인할 것</span><strong>${esc(p.hypothesis)}</strong></div><div class="paths paths-${p.paths.length}">${p.paths.map((path,i)=>`<article class="path-card"><div class="path-index"><b>${String(i+1).padStart(2,'0')}</b><span>작은 시도</span></div><h3>${esc(path.title)}</h3><p class="path-action">${esc(path.action)}</p><div class="path-tools"><span class="micro-label">함께 준비할 도구</span>${toolsView(path)}</div><div class="path-signal"><span>확인할 반응</span><p>${esc(path.signal)}</p></div></article>`).join('')}</div><details class="assumptions"><summary>왜 이 방향인가요? ${icon('down')}</summary><div>${p.paths.map(path=>`<p><strong>${esc(path.title)}</strong> ${esc(path.reason)}</p>`).join('')}${p.assumptions.map(a=>`<p class="muted">· ${esc(a)}</p>`).join('')}<p class="muted">도구는 제안 단계예요. 실제 조사·발송·광고 집행은 아직 진행되지 않았어요.</p></div></details>${actions&&isLatest?`<div class="strategy-actions"><button class="text-button" data-action="revise-chat" data-id="${t.id}">${icon('chat')} 대화로 수정하기</button>${t.status==='draft'||t.submittedVersion!==version&&t.reviewedVersion!==version?`<button class="primary" data-action="request" data-id="${t.id}">${t.status==='draft'?'이 전략으로 요청하기':'수정본으로 다시 요청'} ${icon('arrow')}</button>`:`<a class="primary" href="#/request/${t.id}">${t.status==='reviewed'?'검토본 확인하기':'진행 상황 보기'} ${icon('arrow')}</a>`}</div>`:''}</section>`;
}
function messageView(m,t) {
  if(m.role==='user') return `<div class="message user-message"><div class="user-bubble">${esc(m.text)}</div></div>`;
  const older=m.version&&m.version!==t.versions.length;
  return `<div class="message assistant-message"><div class="assistant-avatar ${m.role==='marketer'?'human':''}">${m.role==='marketer'?icon('person'):mark()}</div><div class="assistant-content"><span class="message-author">${m.role==='marketer'?'마케터 검토 · 체험':'ZEDER'}<small>${m.mode==='demo'?'예시 응답':''}</small></span><div class="message-text">${esc(m.text)}</div>${m.version?(older?`<details class="previous-plan"><summary>이전 전략 v${m.version} 보기 ${icon('down')}</summary>${board(t,m.version,false)}</details>`:board(t,m.version)):''}${m.id===t.messages.at(-1)?.id&&!busy.has(t.id)&&m.quickReplies?.length?`<div class="quick-replies">${m.quickReplies.map(q=>`<button data-action="quick" data-id="${t.id}" data-value="${esc(q)}">${esc(q)} ${icon('arrow')}</button>`).join('')}</div>`:''}</div></div>`;
}
function chatView(t) {
  return `${header()}<main id="main" class="chat-page"><div class="chat-heading"><a class="back-link" href="#/">${icon('back')} 새 대화</a><div>${badge(t)}<button class="icon-button" data-action="export" data-id="${t.id}" aria-label="대화 내보내기" title="대화 내보내기">${icon('download')}</button></div></div>${t.status!=='draft'?`<a class="request-strip" href="#/request/${t.id}">${icon('inbox')} ${t.status==='reviewed'?'마케터 검토본이 도착했어요. 확인해 주세요.':'요청한 전략과 진행 상황을 확인하세요.'}${icon('arrow')}</a>`:''}<div class="conversation" aria-live="polite" aria-relevant="additions">${t.messages.map(m=>messageView(m,t)).join('')}${busy.has(t.id)?`<div class="thinking"><span class="thinking-dots"><i></i><i></i><i></i></span>${config.mode==='live'?'이야기를 정리하고 있어요':'예시 응답을 준비하고 있어요'}</div>`:''}${t.error||t.pendingGeneration&&!busy.has(t.id)?`<div class="chat-error" role="alert">${icon('chat')}<span>${esc(t.error||'응답 생성이 중단됐어요. 저장된 대화에서 다시 이어갈 수 있어요.')}</span><button class="text-button" data-action="retry" data-id="${t.id}">다시 시도</button></div>`:''}</div><div class="sticky-composer">${composer(t)}<p class="composer-note">${config.mode==='live'?'AI의 제안은 검토가 필요해요.':'예시 모드 · 실제 LLM 분석이 아닙니다.'} 대화는 이 브라우저에 저장돼요.</p></div></main>`;
}
function requestsView() {
  return `${header()}<main id="main" class="requests-page"><div class="section-header"><div><span class="eyebrow">MY REQUESTS</span><h1>함께 시작한 이야기</h1><p>대화를 이어가거나 요청한 전략을 확인하세요.</p></div><a class="primary" href="#/">새 요청 ${icon('plus')}</a></div>${workspace.threads.length?`<div class="request-list">${workspace.threads.map(t=>`<a class="request-row" href="#/${t.status==='draft'?'chat':'request'}/${t.id}"><span class="request-icon">${icon(t.status==='draft'?'chat':'file')}</span><div><h3>${esc(latestPlan(t)?.title??t.title)}</h3><p>${esc(t.title)}</p></div><div class="request-row-end">${badge(t)}<small>${time(t.updatedAt)}</small></div>${icon('chevron')}</a>`).join('')}</div>`:`<div class="empty-state">${icon('chat')}<h2>첫 이야기를 들려주세요.</h2><p>아직 준비된 전략이 없어도 괜찮아요.</p><a class="primary" href="#/">대화 시작하기 ${icon('arrow')}</a></div>`}</main>`;
}
function progressView(t) {
  const reviewed=t.status==='reviewed', preparing=t.status==='preparing'; const v=preparing?t.approvedVersion:reviewed?t.reviewedVersion:t.submittedVersion; const p=versionPlan(t,v);
  if(!p) return chatView(t);
  const step=preparing?3:reviewed?2:1;
  const title=preparing?'좋아요. 실행할 준비를 해볼게요.':reviewed?'검토한 전략이 도착했어요.':'이야기와 전략을 함께 담았어요.';
  const desc=preparing?'승인한 전략을 기준으로 필요한 초안과 연결을 준비하는 단계예요.':reviewed?'방향을 확인하고 준비를 승인해 주세요. 바꾸고 싶은 부분은 다시 요청할 수 있어요.':'다음은 마케터가 전략을 검토할 차례예요. 추가로 떠오른 내용은 대화에 남겨주세요.';
  return `${header()}<main id="main" class="progress-page"><a class="back-link" href="#/chat/${t.id}">${icon('back')} 대화로 돌아가기</a><div class="progress-hero"><span class="progress-symbol">${icon(reviewed?'file':preparing?'spark':'check')}</span>${badge(t)}<h1>${title}</h1><p>${desc}</p></div><ol class="progress-steps">${['요청 완료','마케터 검토','내가 확인','실행 준비'].map((s,i)=>`<li class="${i<step?'done':i===step?'current':''}"><b>${i<step?icon('check'):i+1}</b><span>${s}</span></li>`).join('')}</ol><div class="demo-notice">${icon('shield')}<div><strong>지금은 같은 브라우저에서 흐름을 체험하는 버전이에요.</strong><p>실제 마케터 전달·매칭·결제는 연결되지 않았어요. 스튜디오에서 직접 검토 단계를 체험할 수 있어요.</p></div><a href="#/studio/${t.id}">스튜디오 열기 ${icon('external')}</a></div>${reviewed?`<div class="review-note"><span class="micro-label">마케터의 검토 메모 · 체험</span><p>${esc([...t.messages].reverse().find(m=>m.role==='marketer')?.text)}</p></div>`:''}${board(t,v,false)}${reviewed?`<div class="approval-bar"><button class="secondary" data-action="revision" data-id="${t.id}">수정 요청하기</button><button class="primary" data-action="approve" data-id="${t.id}">확인했어요, 실행 준비하기 ${icon('arrow')}</button></div>`:''}${preparing?`<section class="preparation"><div class="section-header"><div><span class="eyebrow">READY TO PREPARE</span><h2>필요한 도구는 준비해 둘게요.</h2><p>아래에서 초안을 만들 수 있어요. 외부 실행은 아직 하지 않아요.</p></div></div><div class="preparation-list">${[...new Set(p.paths.flatMap(x=>x.tools))].map(id=>{const a=t.artifacts.find(a=>a.toolId===id&&a.version===v);return `<article class="preparation-row"><span class="request-icon">${icon(TOOLS[id].icon)}</span><div><h3>${TOOLS[id].name}</h3><p>${TOOLS[id].description}</p></div><span class="subtle-status">${a?'초안 준비됨':TOOLS[id].ready?'준비 가능':'연결 필요'}</span><button class="secondary small" data-action="artifact" data-id="${t.id}" data-tool="${id}">${a?'초안 보기':TOOLS[id].ready?'초안 만들기':'조사 계획 보기'} ${icon('arrow')}</button></article>`;}).join('')}</div></section>`:''}<details class="event-history"><summary>진행 기록 ${icon('down')}</summary>${t.events.map(e=>`<p><span>${time(e.at)}</span>${esc(e.label)}</p>`).join('')}</details></main>`;
}
function studioShell(content, activeId='') {
  const pending=workspace.threads.filter(t=>t.status==='requested').length;
  return `<div class="studio-shell"><aside class="studio-sidebar"><a class="brand" href="#/studio">${mark()}<span>zeder<span class="brand-light"> studio</span></span></a><span class="studio-eyebrow">MARKETER WORKSPACE</span><a class="studio-nav active" href="#/studio">${icon('inbox')} 전략 요청함 <b>${pending}</b></a><p class="studio-sidebar-note">고객이 남긴 이야기를 읽고,<br>실행할 방향을 다듬어 주세요.</p><div class="sidebar-bottom"><span class="mode-dark">● 로컬 협업 체험</span><a href="#/">${icon('back')} 고객 화면으로</a></div></aside><div class="studio-main"><header class="studio-header"><span>${icon('layout')} 마케터 스튜디오</span><a class="header-link" href="#/">고객 화면 ${icon('external')}</a></header><main id="main">${content}</main></div></div>`;
}
function studioList() {
  const all=workspace.threads.filter(t=>t.status!=='draft'); const items=all.filter(t=>studioFilter==='all'||t.status===studioFilter);
  return studioShell(`<div class="studio-page-title"><div><span class="eyebrow">STRATEGY INBOX</span><h1>좋은 방향을 만드는 곳</h1><p>대화 맥락은 이미 정리됐어요. 전략과 판단에 집중하세요.</p></div><span class="studio-demo">같은 브라우저의 요청만 표시</span></div><div class="studio-stats">${[['검토할 요청','requested'],['고객 확인 중','reviewed'],['실행 준비','preparing']].map(([name,s])=>`<div><span>${name}</span><strong>${all.filter(t=>t.status===s).length}<small>건</small></strong></div>`).join('')}</div><div class="studio-inbox"><div class="inbox-head"><h2>전략 요청</h2><div class="filter-tabs">${[['all','전체'],['requested','검토 대기'],['reviewed','고객 확인']].map(([value,label])=>`<button class="${studioFilter===value?'active':''}" data-action="filter" data-value="${value}">${label}</button>`).join('')}</div></div>${items.length?items.map(t=>{const p=versionPlan(t,t.submittedVersion);return `<a class="studio-request" href="#/studio/${t.id}"><div class="studio-request-top">${badge(t)}<small>${time(t.updatedAt)}</small></div><h3>${esc(p?.title??t.title)}</h3><p>${esc(p?.business??t.title)}</p><div class="studio-request-bottom"><span>${icon('person')}${esc(p?.audience)}</span><span>${icon('wallet')}${esc(p?.budget)}</span><b>${t.status==='requested'?'전략 검토하기':'요청 확인하기'} ${icon('arrow')}</b></div></a>`;}).join(''):`<div class="empty-state">${icon('inbox')}<h2>아직 검토할 요청이 없어요.</h2><p>고객이 대화 후 전략을 요청하면 이곳에 나타나요.</p><a class="secondary" href="#/">고객 화면에서 요청 만들기 ${icon('arrow')}</a></div>`}</div>`);
}
function field(label,name,value,area=false,extra='') { return `<label class="field"><span>${label}</span>${area?`<textarea name="${name}" rows="3" maxlength="1200" required ${extra}>${esc(value)}</textarea>`:`<input name="${name}" value="${esc(value)}" maxlength="500" required ${extra}>`}</label>`; }
function studioDetail(t) {
  const base=versionPlan(t,t.submittedVersion); if(!base) return studioList();
  const writable=t.status==='requested'; const p=writable?(t.reviewDraft?.base===t.submittedVersion?t.reviewDraft.plan:base):(versionPlan(t,t.reviewedVersion??t.approvedVersion)??base);
  return studioShell(`<a class="back-link" href="#/studio">${icon('back')} 요청함으로</a><div class="studio-page-title detail-title"><div>${badge(t)}<h1>대화는 맥락으로,<br class="mobile-only"> 전략은 실행으로.</h1><p>${esc(t.title)}</p></div><a class="secondary" href="#/request/${t.id}">고객이 보는 화면 ${icon('external')}</a></div><div class="studio-detail-grid"><aside class="context-panel"><div class="panel-label">${icon('chat')} 고객이 남긴 이야기</div><div class="context-summary"><span class="micro-label">사업과 고민</span><p>${esc(base.business)}</p><span class="micro-label">목표</span><p>${esc(base.goal)}</p><span class="micro-label">예산</span><p>${esc(base.budget)}</p></div><details class="full-conversation" open><summary>대화 전문 ${icon('down')}</summary>${t.messages.filter(m=>!m.version).map(m=>`<div class="context-message ${m.role}"><b>${m.role==='user'?'고객':'ZEDER'}</b><p>${esc(m.text)}</p></div>`).join('')}</details><div class="context-warning">${icon('shield')} 입력된 URL과 고객 가설은 미검증 정보예요. 실제 조사가 완료된 것으로 취급하지 마세요.</div></aside><section class="editor-panel"><div class="panel-label">${icon('pen')} 전략 다듬기 <small>요청 v${t.submittedVersion}</small></div>${!writable?`<div class="submitted-notice">검토를 제출했어요. 다음 변경은 고객의 수정 요청 후 진행해 주세요.</div>`:''}<form data-form="review" data-id="${t.id}" data-base="${t.submittedVersion}"><fieldset ${!writable?'disabled':''}><div class="editor-fields">${field('전략 이름','title',p.title)}${field('누구에게 알릴까요?','audience',p.audience)}<div class="field-pair">${field('이번 목표','goal',p.goal)}${field('예산 범위','budget',p.budget)}</div>${field('고객에게 보여줄 한 줄 설명','summary',p.summary)}${field('확인하려는 가설','hypothesis',p.hypothesis,true)}<div class="editor-paths"><h3>실행 경로와 필요한 도구</h3>${p.paths.map((path,i)=>`<section class="editor-path"><div class="path-index"><b>${String(i+1).padStart(2,'0')}</b><span>실행 경로</span></div>${field('실행 이름',`path-${i}-title`,path.title)}${field('무엇을 할지',`path-${i}-action`,path.action,true)}${field('이 방향을 선택한 이유',`path-${i}-reason`,path.reason,true)}${field('확인할 반응',`path-${i}-signal`,path.signal)}<div class="field"><span>필요한 도구 · 최대 4개</span><div class="tool-options">${Object.entries(TOOLS).map(([id,tool])=>`<label><input type="checkbox" name="path-${i}-tools" value="${id}" ${path.tools.includes(id)?'checked':''}>${icon(tool.icon)}${tool.name}</label>`).join('')}</div></div></section>`).join('')}</div>${field('고객에게 전달할 검토 메모','review-note',t.reviewDraft?.note??'',true)}<p class="field-hint">바꾼 이유와 고객이 다음에 결정할 내용을 적어주세요. 수익이나 결과를 보장하지 마세요.</p></div></fieldset>${writable?`<div class="editor-footer"><span>제출 전에는 고객 전략이 바뀌지 않아요.</span><div><button type="button" class="secondary" data-action="save-review" data-id="${t.id}">초안 저장</button><button type="submit" class="primary">검토본 보내기 ${icon('arrow')}</button></div></div>`:''}</form></section></div>`,t.id);
}
function render() {
  if(storageError) {app.innerHTML=`${header()}<main id="main" class="empty-state"><h1>저장된 대화를 확인해 주세요.</h1><p>${esc(storageError)}</p></main>`;return;}
  const r=route(); const t=thread(r.id);
  app.innerHTML=r.view==='studio'?(t?studioDetail(t):studioList()):r.view==='requests'?requestsView():r.view==='chat'&&t?chatView(t):r.view==='request'&&t?progressView(t):home();
  if(r.view==='chat')requestAnimationFrame(()=>{const c=$('.conversation');if(c)c.scrollTop=c.scrollHeight;});
  document.title=`${r.view==='studio'?'마케터 스튜디오':r.view==='chat'?'전략 대화':r.view==='request'?'요청 진행 상황':'이야기에서 실행까지'} · ZEDER Search`;
}
function openModal(title,body,footer='') { dialog.innerHTML=`<div class="modal-head"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="닫기">${icon('close')}</button></div><div class="modal-body">${body}</div>${footer?`<div class="modal-footer">${footer}</div>`:''}`; if(!dialog.open)dialog.showModal(); }
function settings() { openModal('대화 연결 안내',`<div class="connection-status">${icon(config.mode==='live'?'check':'spark')}<div><strong>${config.mode==='live'?'서버 LLM이 연결되어 있어요.':'지금은 예시 대화 모드예요.'}</strong><p>${config.mode==='live'?'테스트 접근 코드를 입력하면 실제 LLM과 대화해요.':'예시 응답으로 UX를 체험할 수 있어요. 실제 LLM 응답으로 가장하지 않아요.'}</p></div></div>${config.mode==='live'?`<form data-form="access"><label class="field"><span>테스트 접근 코드</span><input name="access" type="password" autocomplete="off" required placeholder="운영자가 발급한 테스트 코드"></label><button class="primary" type="submit">이 브라우저에서 연결 ${icon('arrow')}</button></form>`:`<p>실제 대화를 켜려면 배포 서버의 <code>OPENAI_API_KEY</code>, <code>OPENAI_MODEL</code>, <code>ZEDER_PREVIEW_KEY</code>를 설정해야 해요. API 키는 이 화면에 입력하지 않아요.</p>`}<div class="privacy-summary"><strong>이번 버전의 범위</strong><p>대화·요청·검토는 이 브라우저에 저장돼요. 마케터 화면은 같은 기기에서 체험하며, 계정 간 협업·고객 검색·자동 발송·결제는 아직 연결되지 않았어요.</p><p>LLM 모드에서는 대화와 첨부 텍스트가 응답 생성을 위해 OpenAI API로 전달됩니다. 비밀키나 민감한 자료는 입력하지 마세요.</p></div>`, `<button class="secondary" data-action="close-modal">확인</button>`); }
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
    addReply(t,result,result.mode,result.metadata);t.pendingGeneration=null;
  } catch(e) {t.error=e.name==='AbortError'?'응답 생성을 멈췄어요. 대화는 저장되어 있어요.':e.message;t.pendingGeneration=null;}
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
    if(f.dataset.form==='access'){sessionStorage.setItem('zeder-preview-access',f.elements.access.value);dialog.close();toast('접근 코드를 저장했어요. 메시지를 보내면 연결을 확인해요.');}
    if(f.dataset.form==='review'){const t=thread(f.dataset.id),v=collectReview(f,t);if(!v.note.trim())throw new Error('검토 메모를 작성해 주세요.');reviewRequest(t,v.plan,v.note,v.base);t.reviewDraft=null;persist();render();toast('검토본을 저장했어요. 고객 화면에서 확인할 수 있어요.');}
    if(f.dataset.form==='revision'){const t=thread(f.dataset.id);requestRevision(t,f.elements.note.value);persist();dialog.close();render();toast('수정 요청을 저장했어요.');}
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
    if(action==='close-modal')dialog.close();
    if(action==='starter'){drafts.set('new',el.dataset.value);render();$('#message')?.focus();}
    if(action==='quick')await send(el.dataset.value,id);
    if(action==='retry')await runReply(t);
    if(action==='stop')busy.get(id)?.abort();
    if(action==='revise-chat'){drafts.set(id,'');go(`chat/${id}`);setTimeout(()=>{$('#message')?.focus();$('#message')?.setAttribute('placeholder','어떤 부분을 바꾸고 싶으세요? 편하게 말해주세요.');},50);}
    if(action==='tool'){const tool=TOOLS[el.dataset.tool];openModal(tool.name,`<div class="tool-detail-icon">${icon(tool.icon)}</div><p class="tool-description">${tool.description}</p>${el.dataset.path?`<p class="muted">${esc(el.dataset.path)}에 함께 준비할 도구예요.</p>`:''}<div class="tool-info-row"><span>준비할 결과물</span><strong>${tool.output}</strong></div><div class="tool-info-row"><span>현재 상태</span><strong>${tool.ready?'승인 후 템플릿 초안 준비 가능':'리서치 계획만 준비 · Runner 미연결'}</strong></div><p class="field-hint">고객이 직접 도구를 골라 추가할 필요 없어요. 전략에 맞춰 제안되며, 실제 발송·게시 전에는 다시 승인을 받아요.</p>`,`<button class="primary" data-action="close-modal">알겠어요</button>`);}
    if(action==='request'){const p=latestPlan(t);openModal('이 방향으로 요청할까요?',`<p>지금까지 나눈 이야기와 전략을 한 번에 담았어요. 마케터가 검토할 요청으로 저장합니다.</p><div class="confirmation-summary"><span>목표</span><strong>${esc(p.goal)}</strong><span>먼저 만나볼 고객</span><strong>${esc(p.audience)}</strong><span>예산 범위</span><strong>${esc(p.budget)}</strong></div><div class="mini-note">체험 요청입니다. 실제 전달·결제·광고비 집행은 발생하지 않아요.</div>`,`<button class="secondary" data-action="close-modal">더 이야기할게요</button><button class="primary" data-action="confirm-request" data-id="${id}">요청 확정 ${icon('arrow')}</button>`);}
    if(action==='confirm-request'){submitRequest(t);persist();dialog.close();go(`request/${id}`);window.scrollTo(0,0);}
    if(action==='approve'){approveRequest(t);persist();render();toast('준비를 승인했어요. 외부 발송이나 집행은 하지 않았어요.');}
    if(action==='revision'){openModal('어떤 부분을 바꿀까요?',`<form data-form="revision" data-id="${id}"><label class="field"><span>마케터에게 남길 이야기</span><textarea name="note" rows="4" maxlength="2000" required placeholder="예: 첫 시도는 콘텐츠보다 직접 대화하는 방향으로 바꾸고 싶어요."></textarea></label><button class="primary" type="submit">수정 요청 저장 ${icon('arrow')}</button></form>`);}
    if(action==='filter'){studioFilter=el.dataset.value;render();}
    if(action==='save-review'){const f=$('form[data-form=review]'),v=collectReview(f,t);t.reviewDraft=v;persist();toast('검토 초안을 저장했어요. 아직 고객에게 제출하지 않았어요.');}
    if(action==='artifact'){const toolId=el.dataset.tool;if(t.status!=='preparing')throw new Error('고객의 실행 준비 승인이 필요해요.');const p=versionPlan(t,t.approvedVersion);let a=t.artifacts.find(a=>a.toolId===toolId&&a.version===t.approvedVersion);if(!a){a={id:uid(),toolId,version:t.approvedVersion,text:artifactFor(p,toolId),createdAt:new Date().toISOString()};t.artifacts.push(a);persist();render();}openModal(TOOLS[toolId].output,`<p class="mini-note">템플릿 초안이에요. 실제 고객 조사·게시·발송은 하지 않았어요.</p><pre class="artifact-preview">${esc(a.text)}</pre>`,`<button class="secondary" data-action="close-modal">닫기</button><button class="primary" data-action="download-artifact" data-id="${id}" data-tool="${toolId}">파일로 받기 ${icon('download')}</button>`);}
    if(action==='download-artifact'){const a=t.artifacts.find(a=>a.toolId===el.dataset.tool&&a.version===t.approvedVersion);if(a)download(`zeder-${a.toolId}-v${a.version}.md`,a.text);}
    if(action==='export'){download(`zeder-conversation-${t.id.slice(0,8)}.json`,JSON.stringify(t,null,2),'application/json;charset=utf-8');}
    if(action==='attach'){const input=document.createElement('input');input.type='file';input.accept='.txt,.md';input.addEventListener('change',async()=>{try{const file=input.files?.[0];if(!file)return;if(file.size>14000||!/\.(txt|md)$/i.test(file.name))throw new Error('14KB 이하의 TXT 또는 MD 파일을 넣어주세요.');const text=await file.text();const f=$('form[data-form=chat]');if(!f)return;const field=f.elements.message;const next=`${field.value}\n\n[첨부: ${file.name}]\n${text}`.trim();if(next.length>4000)throw new Error('첨부 내용을 포함해 4,000자까지 넣을 수 있어요.');field.value=next;field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();toast('내용을 넣었어요. 보내기 전 확인해 주세요.');}catch(err){toast(err.message);}});input.click();}
  }catch(error){toast(error.message);}
});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);});
window.addEventListener('storage',e=>{if(savedEvent(e)&&!busy.size){try{workspace=load();render();}catch(err){toast(err.message);}}});
render();
fetch('/api/chat').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{if(data.mode==='live'){config=data;render();}}).catch(()=>{/* Static/offline preview remains explicitly in demo mode. */});
