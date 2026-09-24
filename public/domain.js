/** Shared, dependency-free domain logic. Demo generation is not an LLM. */
export const TOOLS = Object.freeze({
  research: { name: '고객 리서치', icon: 'search', description: '찾을 고객의 조건과 확인할 근거를 정리해요.', output: '리서치 브리프', ready: false },
  landing: { name: '소개 페이지', icon: 'layout', description: '고객에게 보여줄 소개 페이지 초안을 만들어요.', output: '페이지 카피', ready: true },
  outreach: { name: '제안 메시지', icon: 'send', description: '첫 연락에 사용할 짧은 제안 문구를 준비해요.', output: '메시지 초안', ready: true },
  content: { name: '소셜 콘텐츠', icon: 'pen', description: '문제와 해결 과정을 소개하는 콘텐츠를 준비해요.', output: '콘텐츠 초안', ready: true },
  interview: { name: '고객 인터뷰', icon: 'chat', description: '고객의 실제 경험을 들을 질문을 준비해요.', output: '인터뷰 질문', ready: true },
  tracker: { name: '반응 기록', icon: 'chart', description: '접촉과 응답을 기록할 항목을 정리해요.', output: '기록 양식', ready: true }
});
export const uid = () => globalThis.crypto.randomUUID();
export const clone = value => structuredClone(value);
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const clean = (value, max = 2000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const requireText = (value, key, max = 2000) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`유효하지 않은 항목: ${key}`);
  return value.trim();
};
export function validatePlan(p) {
  if (!p || typeof p !== 'object') throw new Error('전략 내용이 비어 있어요.');
  const result = {};
  for (const key of ['title','business','audience','goal','budget','summary','hypothesis']) result[key] = requireText(p[key], key, 1500);
  if (!Array.isArray(p.paths) || p.paths.length < 1 || p.paths.length > 4) throw new Error('실행 경로는 1~4개가 필요해요.');
  result.paths = p.paths.map((path, i) => {
    const item = { id: `path-${i+1}` };
    for (const key of ['title','action','reason','signal']) item[key] = requireText(path[key], key, 1200);
    if (!Array.isArray(path.tools) || !path.tools.length || path.tools.length > 4 || path.tools.some(t => !TOOLS[t])) throw new Error('지원하지 않는 도구가 포함되어 있어요.');
    item.tools = [...new Set(path.tools)];
    return item;
  });
  if (!Array.isArray(p.assumptions) || p.assumptions.length > 6) throw new Error('가정을 확인해 주세요.');
  result.assumptions = p.assumptions.map(v => requireText(v, 'assumption', 500));
  return result;
}
export function validateReply(reply) {
  if (!reply || typeof reply !== 'object') throw new Error('대화 응답 형식을 확인해 주세요.');
  return {
    reply: requireText(reply.reply, 'reply', 6000),
    quickReplies: Array.isArray(reply.quickReplies) ? reply.quickReplies.slice(0,3).map(v => requireText(v, 'quickReply', 200)) : [],
    plan: reply.plan ? validatePlan(reply.plan) : null
  };
}
export function makeThread(text) {
  return { id: uid(), title: clean(text, 36), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [], versions: [], status: 'draft', submittedVersion: null, reviewedVersion: null, approvedVersion: null, artifacts: [], events: [], error: null };
}
export function latestPlan(thread) { return thread.versions.at(-1)?.plan ?? null; }
export function versionPlan(thread, number) { return thread.versions.find(v => v.version === number)?.plan ?? null; }
export function addReply(thread, raw, mode = 'demo', metadata = {}) {
  const data = validateReply(raw); const now = new Date().toISOString();
  if (data.plan) {
    const version = thread.versions.length + 1;
    thread.versions.push({ version, plan: data.plan, source: mode, createdAt: now, metadata });
  }
  thread.messages.push({ id: uid(), role: 'assistant', text: data.reply, quickReplies: data.quickReplies, version: data.plan ? thread.versions.length : null, mode, createdAt: now });
  thread.updatedAt = now; thread.error = null;
  return thread;
}
export function submitRequest(thread) {
  const current = thread.versions.at(-1);
  if (!current) throw new Error('전략을 먼저 준비해 주세요.');
  if (thread.status === 'requested' && thread.submittedVersion === current.version) return thread;
  thread.submittedVersion = current.version; thread.reviewedVersion = null; thread.approvedVersion = null;
  thread.status = 'requested'; thread.artifacts = [];
  thread.events.push({ kind: 'requested', label: `전략 v${current.version} 검토 요청`, at: new Date().toISOString() });
  return thread;
}
export function reviewRequest(thread, plan, note, expectedVersion) {
  if (thread.status !== 'requested' || thread.submittedVersion !== expectedVersion) throw new Error('요청이 변경됐어요. 최신 요청을 다시 열어 주세요.');
  const validated = validatePlan(plan); const version = thread.versions.length + 1;
  thread.versions.push({ version, plan: validated, source: 'marketer-demo', createdAt: new Date().toISOString() });
  thread.reviewedVersion = version; thread.status = 'reviewed';
  thread.messages.push({ id: uid(), role: 'marketer', text: clean(note) || '전략을 검토했어요. 확인 후 실행 준비를 승인해 주세요.', version, quickReplies: [], createdAt: new Date().toISOString() });
  thread.events.push({ kind: 'reviewed', label: '마케터 검토본 도착', at: new Date().toISOString() });
  return thread;
}
export function approveRequest(thread) {
  if (thread.status === 'preparing') return thread;
  if (thread.status !== 'reviewed') throw new Error('마케터 검토본을 먼저 확인해 주세요.');
  thread.approvedVersion = thread.reviewedVersion; thread.status = 'preparing';
  thread.events.push({ kind: 'approved', label: '실행 준비 승인', at: new Date().toISOString() });
  return thread;
}
export function requestRevision(thread, note) {
  if (thread.status !== 'reviewed') throw new Error('검토본이 도착한 뒤 수정 요청할 수 있어요.');
  requireText(note, 'revision', 2000);
  thread.submittedVersion = thread.reviewedVersion; thread.reviewedVersion = null; thread.status = 'requested';
  thread.messages.push({ id: uid(), role: 'user', text: `수정 요청: ${note}`, createdAt: new Date().toISOString() });
  thread.events.push({ kind: 'revision', label: '전략 수정 요청', at: new Date().toISOString() });
  return thread;
}
export function demoReply(messages, priorPlan = null) {
  const users = messages.filter(m => m.role === 'user'); const text = users.map(m => m.text).join(' '); const last = users.at(-1)?.text ?? '';
  if (priorPlan) {
    if (/수정|바꿔|변경|줄여|예산|광고.*없이|다시/.test(last)) {
      const plan = clone(priorPlan); plan.budget = /무료|없이|0원/.test(last) ? '유료 광고 없이 시작 (제안)' : plan.budget;
      plan.summary = `요청하신 변경을 반영해, 먼저 작은 범위의 반응을 확인하는 방향으로 조정했어요.`;
      plan.assumptions = [`추가 요청: ${clean(last,250)}`, '예시 모드의 규칙 기반 수정안입니다. 실제 LLM 분석이 아닙니다.'];
      return { reply: '변경 요청을 반영한 예시 전략이에요. 이전 전략은 이력에 그대로 남겨 두었어요.', quickReplies: ['먼저 무엇을 확인하나요?', '메시지를 더 부담 없게 바꿔주세요'], plan };
    }
    return { reply: '먼저 고객이 문제에 공감하는지 작은 범위에서 확인하는 방향이에요. 제안 아래의 도구를 누르면 준비할 내용을 볼 수 있어요. 지금은 예시 모드라 자유로운 추가 상담은 LLM 연결 후 가능해요.', quickReplies: ['유료 광고 없이 시작하도록 수정해 주세요'], plan: null };
  }
  if (users.length === 1) return { reply: '좋아요. 복잡한 마케팅 계획부터 세우지 않아도 괜찮아요.\n\n우선 어떤 사람에게 가장 먼저 알려 보고 싶으세요? 아직 모르시면 제가 가설부터 제안할게요.', quickReplies: ['누가 고객일지 함께 찾아주세요', '작은 팀을 운영하는 사람들', '우리 제품에 관심 있는 일반 소비자'], plan: null };
  if (users.length === 2) return { reply: '첫 고객에 대한 가설부터 작게 확인해 볼게요.\n\n이번 시도에 쓸 수 있는 예산은 어느 정도인가요? 정해진 금액이 없어도 괜찮아요.', quickReplies: ['돈을 쓰기 전에 반응부터 볼래요', '10만원 안에서 시작하고 싶어요', '아직 정하지 못했어요'], plan: null };
  const commerce = /쇼핑몰|소비자|브랜드|상품|판매/.test(text);
  const local = /매장|카페|미용실|식당|지역|필라테스/.test(text);
  const creator = /크리에이터|강의|콘텐츠|구독자/.test(text);
  const audienceAnswer = users[1]?.text ?? '';
  const audience = /모르|찾아|추천/.test(audienceAnswer) ? (local ? '매장 주변에서 관련 서비스를 찾는 사람들 (가설)' : commerce ? '해당 상품의 쓰임새에 공감하는 초기 구매자 (가설)' : '문제와 관련된 일을 직접 하는 작은 팀 (가설)') : clean(audienceAnswer,200);
  const budget = /10만원|100000/.test(text) ? '최대 100,000원 · 별도 집행 승인 필요' : /돈을 쓰기 전|무료|0원/.test(text) ? '유료 광고 없이 먼저 확인' : '예산 미정 · 집행 전 확인';
  const paths = [
    { title: local ? '가까운 고객에게 알리기' : commerce ? '작은 관심부터 모으기' : '첫 고객에게 직접 제안', action: local ? '매장의 쓰임새를 설명하는 소개글과 방문 제안을 준비해요.' : '관심을 보일 만한 고객의 조건을 정리하고 짧은 제안을 준비해요.', reason: '큰 비용을 쓰기 전에 누구에게 제안이 와닿는지 확인하기 위해서예요.', signal: '관심 표현 · 답장 · 소개 페이지 확인', tools: ['research','outreach','landing'] },
    { title: creator ? '첫 콘텐츠 공개하기' : '이야기로 관심 만들기', action: '제품이 해결하는 문제와 과정을 짧은 콘텐츠로 보여줘요.', reason: '직접 판매 제안과 다른 방식의 관심을 비교해 보기 위해서예요.', signal: '관련 질문 · 저장 · 자발적인 문의', tools: ['content','landing'] },
    { title: '고객의 진짜 이유 듣기', action: '관심을 보인 사람에게 짧은 대화를 제안하고 실제 경험을 들어요.', reason: '구매하지 않는 이유와 지금 사용하는 대안을 확인하기 위해서예요.', signal: '인터뷰 수락 · 현재 대안 · 해결 의지', tools: ['interview','tracker'] }
  ];
  return { reply: '이렇게 시작해 보면 어떨까요?\n\n큰 캠페인 대신 하나의 목표를 확인하는 세 가지 작은 시도를 준비했어요. 필요한 도구도 함께 정리했으니, 직접 고르거나 설정할 필요 없어요.', quickReplies: [], plan: { title: '첫 고객을 만나는 작은 시작', business: clean(users[0].text,1000), audience, goal: '관심을 보이는 첫 고객과 대화를 시작하기', budget, summary: '누가 관심을 보이고, 어떤 제안에 반응하는지부터 확인해요.', hypothesis: '제품이 해결하는 문제를 구체적으로 제안하면, 관련 고객이 관심을 표현한다.', paths, assumptions: ['고객과 채널은 아직 검증 전인 가설이에요.', '위 전략은 화면 체험용 예시이며 시장조사 결과가 아니에요.'] } };
}
export function artifactFor(plan, toolId) {
  if (!TOOLS[toolId]) throw new Error('도구를 찾을 수 없어요.');
  const intro = `# ${TOOLS[toolId].output}\n\n> 실행 전 검토할 템플릿입니다. 실제 조사·발송·게시 결과가 아닙니다.\n\n사업: ${plan.business}\n고객 가설: ${plan.audience}\n목표: ${plan.goal}\n예산: ${plan.budget}\n\n`;
  const bodies = {
    research: '## 조사 기준\n- 위 고객 가설에 해당하는 회사/사업체를 공개된 업무 자료에서 확인\n- 회사명, 공식 URL, 적합 근거, 확인 날짜를 기록\n- 확인할 수 없는 내용은 미확인으로 표시\n- 개인정보·접근 정책을 먼저 확인\n\n외부 브라우저 Runner 연결이 필요합니다. 고객을 실제로 찾은 결과는 아닙니다.',
    landing: `## 제목\n${plan.goal}\n\n## 소개\n${plan.business}\n\n## 제안\n지금 겪는 문제를 들려주세요. 제품이 도움이 될 수 있는지 함께 확인하겠습니다.\n\n## 행동 버튼\n관심 남기기\n\n폼 연결·개인정보 안내·게시 승인이 필요합니다.`,
    outreach: `안녕하세요.\n\n${plan.business}\n\n관련 업무에서 비슷한 어려움이 있는지 여쭤보고 싶어 연락드립니다. 관심이 있으시면 짧은 소개를 전달드려도 괜찮을까요?\n\n감사합니다.\n\n[이름 / 소속 / 적법한 수신거부 안내 추가]\n\n※ 수신 자격과 채널 정책을 확인한 후 별도 승인을 받아야 합니다.`,
    content: `## 콘텐츠 방향\n${plan.hypothesis}\n\n1. 실제 겪은 문제 한 가지 소개\n2. 어떤 해결 방법을 시도했는지 설명\n3. 아직 확인하지 못한 점을 솔직히 공유\n4. 같은 경험이 있는지 질문\n\n성과나 후기 수치를 만들어 넣지 마세요.`,
    interview: '1. 이 문제가 최근에 발생했던 상황을 설명해 주실 수 있나요?\n2. 지금은 어떻게 해결하고 계신가요?\n3. 해결하는 데 얼마나 많은 시간과 비용이 드나요?\n4. 다른 방법을 고려했다면 무엇이 걸림돌이었나요?\n5. 제안한 방식에서 가장 확인하고 싶은 것은 무엇인가요?',
    tracker: 'date,source,contacted,replies,interviews,signups,paid,notes\n\n실제 관측값만 입력하세요. 미응답은 고객 부적합을 단정하는 근거가 아닙니다.'
  };
  return intro + bodies[toolId];
}
