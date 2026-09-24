import { validatePlan, clean } from './domain.js';
const KEY = 'zeder-search.chat-first.v2';
export function load(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { schema: 2, threads: [] };
    const data = JSON.parse(raw);
    if (data.schema !== 2 || !Array.isArray(data.threads)) throw new Error('저장 형식이 다릅니다.');
    data.threads = data.threads.filter(t => typeof t.id === 'string' && Array.isArray(t.messages) && Array.isArray(t.versions));
    for (const t of data.threads) {
      t.title = clean(t.title,100);
      t.versions = t.versions.map(v => ({ ...v, plan: validatePlan(v.plan) }));
      t.events ??= []; t.artifacts ??= [];
    }
    return data;
  } catch {
    throw new Error('저장된 대화를 읽지 못했어요. 원본을 지우지 않았습니다. 브라우저 데이터를 백업한 후 확인해 주세요.');
  }
}
export function save(state, storage = globalThis.localStorage) {
  try { storage.setItem(KEY, JSON.stringify(state)); }
  catch { throw new Error('브라우저에 저장하지 못했어요. 대화 내보내기로 내용을 보관해 주세요.'); }
}
export function savedEvent(e) { return e.key === KEY; }
