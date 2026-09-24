import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { demoReply } from '../public/domain.js';
import { SYSTEM } from '../lib/llm.js';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const user = text => ({role:'user', text});
const conversation = [user('쇼핑몰의 반복 CS를 정리하는 제품이에요.'), user('작은 쇼핑몰 운영팀'), user('10만원')];

test('UI does not ship removed slogans or tutorials', () => {
  for (const text of ['이야기에서, 실행까지','마케팅을 몰라도 괜찮아요','방향과 방법은 함께 찾을게요',
    'STRATEGY, MADE SIMPLE.','고객에게는 대화를, 마케터에게는 작업 공간을.',
    '직접 도구를 골라 추가할 필요 없어요','대화 맥락은 이미 정리됐어요',
    '전략과 판단에 집중하세요','좋은 방향을 만드는 곳','대화는 맥락으로']) {
    assert.equal(app.includes(text), false, text);
  }
});
test('demo asks one short business question without reassurance', () => {
  const first=demoReply(conversation.slice(0,1));
  const second=demoReply(conversation.slice(0,2));
  assert.equal(first.reply, '누구에게 먼저 알리고 싶으세요?');
  assert.equal(second.reply, '이번에 쓸 수 있는 예산은 어느 정도인가요?');
  assert.equal(first.plan, null);
  assert.equal(second.plan, null);
});
test('strategy payload still carries actions, reasons, assumptions and recommended tools', () => {
  const result=demoReply(conversation);
  assert.equal(result.reply, '먼저 이 세 가지를 시도해 볼까요?');
  assert.ok(result.plan.assumptions.some(text=>text.includes('예시')));
  for (const path of result.plan.paths) {
    for (const key of ['action','reason','signal']) assert.ok(path[key].length);
    assert.ok(path.tools.length);
  }
});
test('follow-up and revision omit UI tutorials but retain proposal version semantics', () => {
  const plan=demoReply(conversation).plan;
  const result=demoReply([...conversation,user('왜 이 방법인가요?')],plan);
  assert.equal(result.plan,null);
  assert.equal(result.reply.includes('도구를 누르면'),false);
  const revision=demoReply([...conversation,user('유료 광고 없이 수정해 주세요')],plan);
  assert.equal(revision.reply,'수정한 전략이에요.');
  assert.notEqual(revision.plan,plan);
  assert.ok(revision.plan.assumptions.some(text=>text.includes('예시')));
});
test('live prompt requests concise business copy without removing safety boundaries', () => {
  assert.match(SYSTEM,/Omit UI tutorials/);
  assert.match(SYSTEM,/1-2 short sentences/);
  assert.match(SYSTEM,/Preserve material uncertainty, cost, privacy, and approval disclosures/);
  assert.match(SYSTEM,/NO browser, email, ad, payment/);
});
test('client retains explicit demo, privacy and external-action notices', () => {
  for (const text of ['예시 모드','예시 응답','OpenAI API로 전송','이 브라우저에만 저장',
    '실제 마케터 전달·결제 없음','미연결 · 별도 승인 필요']) assert.ok(app.includes(text),text);
});
