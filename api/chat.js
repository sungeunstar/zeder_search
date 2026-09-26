import { timingSafeEqual, createHash } from 'node:crypto';
import { generate, parseInput } from '../lib/llm.js';
import {parseReviewInput,generateReview} from '../lib/marketer.js';
const windows = new Map();
export const configured = env => Boolean(env.OPENAI_API_KEY && env.OPENAI_MODEL && env.ZEDER_PREVIEW_KEY?.length >= 16);
const equal = (a,b) => { const x=Buffer.from(a ?? ''), y=Buffer.from(b ?? ''); return x.length===y.length && timingSafeEqual(x,y); };
function reply(res,status,data) { res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','no-store'); res.statusCode=status; res.end(JSON.stringify(data)); }
export function rateAllowed(key, now=Date.now()) {
  for (const [k,v] of windows) if (now-v.start>60000) windows.delete(k);
  const record = windows.get(key) ?? { start:now, count:0 };
  if (record.count >= 12 || (!windows.has(key) && windows.size >= 256)) return false;
  record.count++; windows.set(key,record); return true;
}
export default async function handler(req,res) {
  const env=process.env;
  if (req.method==='GET') return reply(res,200,{ mode:configured(env)?'live':'demo', storage:'browser', collaboration:false, externalExecution:false });
  if (req.method!=='POST') { res.setHeader('Allow','GET, POST'); return reply(res,405,{error:'허용되지 않은 요청입니다.'}); }
  if (!configured(env)) return reply(res,503,{error:'LLM이 아직 연결되지 않았어요. 예시 모드로 체험할 수 있습니다.'});
  if (!equal(req.headers['x-preview-key'],env.ZEDER_PREVIEW_KEY)) return reply(res,401,{error:'테스트 접근 코드를 확인해 주세요.'});
  if (req.headers.origin && req.headers.origin !== `https://${req.headers.host}` && req.headers.origin !== `http://${req.headers.host}`) return reply(res,403,{error:'다른 출처의 요청은 허용하지 않습니다.'});
  if (!String(req.headers['content-type']??'').includes('application/json')) return reply(res,415,{error:'JSON 요청이 필요합니다.'});
  const key=createHash('sha256').update(String(req.headers['x-forwarded-for']??req.socket?.remoteAddress??'preview')).digest('hex');
  if (!rateAllowed(key)) return reply(res,429,{error:'요청이 잠시 몰렸어요. 1분 뒤 다시 시도해 주세요.'});
  let body=req.body;
  try {
    if (!body) { let size=0, chunks=[]; for await(const c of req) { size+=c.length; if(size>40000) return reply(res,413,{error:'대화가 너무 길어요. 새 대화를 시작해 주세요.'}); chunks.push(c); } body=Buffer.concat(chunks).toString(); }
    if (typeof body==='string') { if(Buffer.byteLength(body)>40000) return reply(res,413,{error:'대화가 너무 길어요.'}); body=JSON.parse(body); }
    if (Buffer.byteLength(JSON.stringify(body))>40000) return reply(res,413,{error:'대화가 너무 길어요.'});
    body=body?.intent==='marketer_review'?parseReviewInput(body):parseInput(body);
  } catch (e) { return reply(res,400,{error:e instanceof SyntaxError?'잘못된 JSON입니다.':e.message}); }
  try { return reply(res,200,await (body.intent==='marketer_review'?generateReview(body,env):generate(body,env))); }
  catch(e) { return reply(res,502,{error:e.name==='TimeoutError'?'응답 시간이 초과됐어요. 다시 시도해 주세요.':e.message}); }
}