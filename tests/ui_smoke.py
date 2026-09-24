"""Offline DOM smoke tests. Browser network navigation is blocked in this runtime.
Actual source files are bundled unchanged except import/export removal. Only storage,
UUID and fetch are test adapters. Node HTTP tests separately exercise the API handler.
Requires python playwright and a Chromium executable. No browser is installed by this test.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json, os
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('QA_OUTPUT', str(ROOT/'artifacts'))); OUT.mkdir(parents=True,exist_ok=True)
html=(ROOT/'preview.html').read_text()
KEY='zeder-search.chat-first.v2'
def fixture(initial=None):
 entries=json.dumps([[KEY,json.dumps(initial,ensure_ascii=False)]],ensure_ascii=False) if initial else '[]'
 adapter='''<script>
 const testStore=new Map(ENTRIES); const testSession=new Map();
 const adapter=m=>({getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)});
 Object.defineProperty(window,'localStorage',{value:adapter(testStore)});
 Object.defineProperty(window,'sessionStorage',{value:adapter(testSession)});
 if(!crypto.randomUUID)crypto.randomUUID=()=> '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c/4).toString(16));
 window.fetch=async()=>({ok:true,json:async()=>({mode:'demo'})});
 </script>'''.replace('ENTRIES',entries)
 return html.replace('<head>','<head>'+adapter,1)
steps=[]
def ok(name): steps.append(name);print('PASS',name,flush=True)
def state(page):return page.evaluate(f"JSON.parse(localStorage.getItem('{KEY}'))")
def wait(page):page.wait_for_timeout(750)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1440,'height':1050},accept_downloads=True)
 page=ctx.new_page();page.set_default_timeout(5000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(fixture(),wait_until='load');wait(page)
 expect(page.locator('h1')).to_contain_text('어떤 비즈니스를')
 assert page.locator('input:not([type=hidden])').count()==0
 expect(page.locator('textarea')).to_have_count(1)
 expect(page.locator('.studio-stats')).to_have_count(0)
 page.screenshot(path=str(OUT/'01-home-desktop.png'),full_page=True)
 ok('Home: one composer, no forms or dashboard; explicit demo mode')
 page.locator('[data-action=starter]').first.click()
 expect(page.locator('#message')).to_have_value('제품은 만들었는데 첫 고객을 어디서 만나야 할지 모르겠어요.')
 assert state(page) is None
 ok('Starter suggestion fills the composer, not an automatic request')
 page.locator('#message').fill('작은 쇼핑몰의 CS 문의를 정리하는 서비스를 만들었어요. 첫 고객을 만나고 싶어요.')
 page.locator('[type=submit]').click();wait(page)
 expect(page.locator('.user-bubble')).to_have_count(1)
 expect(page.locator('.quick-replies button')).to_have_count(3)
 assert state(page)['threads'][0]['status']=='draft'
 ok('First request opens a conversation and asks just one question')
 page.locator('.quick-replies button').filter(has_text='작은 팀').click();wait(page)
 page.locator('.quick-replies button').filter(has_text='10만원').click();wait(page)
 expect(page.locator('.strategy-board')).to_have_count(1)
 expect(page.locator('.path-card')).to_have_count(3)
 assert page.locator('.tool-chip').count()>3
 s=state(page);t=s['threads'][0];tid=t['id'];initial_plan=t['versions'][0]['plan']
 assert '100,000' in initial_plan['budget']
 page.screenshot(path=str(OUT/'02-chat-strategy-desktop.png'),full_page=True)
 ok('Conversation produces inline goal, strategy flow and automatically selected tools')
 page.locator('.tool-chip').first.click()
 expect(page.locator('dialog')).to_be_visible()
 expect(page.locator('dialog')).to_contain_text('Runner 미연결')
 page.locator('dialog [data-action=close-modal]').first.click()
 ok('Tool chip opens a capability explanation, not a manual tool selector')
 page.locator('[data-action=request]').click()
 assert state(page)['threads'][0]['status']=='draft'
 page.locator('[data-action=confirm-request]').click();wait(page)
 expect(page.locator('h1')).to_contain_text('이야기와 전략')
 t=state(page)['threads'][0];assert t['status']=='requested' and t['submittedVersion']==1
 page.screenshot(path=str(OUT/'03-request-desktop.png'),full_page=True)
 ok('Explicit confirmation creates request; progress appears only after submission')
 page.locator('.demo-notice a').click();wait(page)
 expect(page.locator('.studio-sidebar')).to_be_visible()
 expect(page.locator('input[name=audience]')).to_be_visible()
 page.locator('input[name=title]').fill('첫 10개 쇼핑몰과 직접 대화하기')
 page.locator('textarea[name=review-note]').fill('처음부터 여러 채널을 늘리기보다, CS 문의가 많은 작은 쇼핑몰에 직접 제안해 보세요.')
 page.locator('[data-action=save-review]').click();wait(page)
 assert state(page)['threads'][0]['versions'][0]['plan']==initial_plan
 ok('Marketer-only structured editor saves draft without mutating customer proposal')
 page.screenshot(path=str(OUT/'04-marketer-studio-desktop.png'),full_page=True)
 page.locator('form[data-form=review] [type=submit]').click();wait(page)
 assert state(page)['threads'][0]['status']=='reviewed'
 page.locator('.detail-title a').click();wait(page)
 expect(page.locator('h1')).to_contain_text('검토한 전략')
 expect(page.locator('.strategy-board h2')).to_have_text('첫 10개 쇼핑몰과 직접 대화하기')
 ok('Review submission returns updated plan to customer without auto-approval')
 page.locator('[data-action=revision]').click()
 page.locator('textarea[name=note]').fill('고객 대상만 더 좁혀주세요.')
 page.locator('form[data-form=revision] [type=submit]').click();wait(page)
 assert state(page)['threads'][0]['status']=='requested'
 page.locator('.demo-notice a').click();wait(page)
 page.locator('input[name=audience]').fill('CS 인력을 따로 두지 않은 소형 쇼핑몰 운영팀')
 page.locator('textarea[name=review-note]').fill('별도 CS 인력이 없는 팀으로 좁혔어요.')
 page.locator('form[data-form=review] [type=submit]').click();wait(page)
 page.locator('.detail-title a').click();wait(page)
 ok('Customer revision loops back to the marketer and preserves prior versions')
 page.locator('[data-action=approve]').click();wait(page)
 assert state(page)['threads'][0]['status']=='preparing'
 assert state(page)['threads'][0]['artifacts']==[]
 expect(page.locator('.preparation-row')).to_have_count(6)
 page.locator('[data-action=artifact][data-tool=outreach]').click();wait(page)
 expect(page.locator('.artifact-preview')).to_contain_text('실제 조사·발송·게시 결과가 아닙니다')
 with page.expect_download() as download:
  page.locator('[data-action=download-artifact]').click()
 assert download.value.suggested_filename.endswith('.md')
 page.locator('dialog [data-action=close-modal]').first.click()
 assert len(state(page)['threads'][0]['artifacts'])==1
 ok('Approval enables honest template preparation, no external execution or fabricated results')
 page.locator('[data-action=artifact][data-tool=outreach]').click();wait(page)
 assert len(state(page)['threads'][0]['artifacts'])==1
 page.locator('dialog [data-action=close-modal]').first.click()
 ok('Artifact creation is idempotent for an approved strategy version')
 snapshot=state(page)
 page.evaluate("location.hash='#/'");wait(page)
 page.set_viewport_size({'width':390,'height':844});wait(page)
 page.screenshot(path=str(OUT/'05-home-mobile.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 page.locator('a[href="#/chat/'+tid+'"]').first.click();wait(page)
 page.screenshot(path=str(OUT/'06-chat-mobile.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 ok('390px home and chat render without horizontal overflow')
 page.evaluate("location.hash='#/studio'");wait(page)
 page.screenshot(path=str(OUT/'07-studio-mobile.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 ok('Marketer studio supports mobile while staying a distinct UI')
 fresh=ctx.new_page();fresh.set_default_timeout(5000);fresh.set_content(fixture(snapshot),wait_until='load');wait(fresh)
 fresh.locator('a[href="#/chat/'+tid+'"]').first.click();wait(fresh)
 expect(fresh.locator('.user-bubble')).to_have_count(4)
 assert state(fresh)['threads'][0]['approvedVersion']==3
 ok('Conversation and approval version restore from the storage adapter')
 page.evaluate("location.hash='#/'");wait(page)
 page.locator('#message').fill('<img src=x onerror="window.__xss=true"> 테스트 서비스')
 page.locator('[type=submit]').click();wait(page)
 assert page.evaluate('window.__xss !== true')
 expect(page.locator('.user-bubble img')).to_have_count(0)
 ok('User text is escaped, not interpreted as executable HTML')
 assert not errors,errors
 ok('No browser JavaScript errors across the end-to-end workflow')
 (OUT/'ui-results.json').write_text(json.dumps({'passed':len(steps),'checks':steps,'errors':errors,'method':'offline DOM + in-memory storage/fetch adapters; HTTP API tested separately'},ensure_ascii=False,indent=2))
 b.close()
